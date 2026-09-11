import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authRequired, requireRole, currentUser } from '../middleware/auth'

const projets = new Hono<{ Bindings: Bindings }>()

// --- Helpers ---

// Calcule pour chaque ligne budgétaire d'un projet : total dépensé + taux d'exécution
async function computeLignesAvecExecution(db: D1Database, projetId: number) {
  const { results: lignes } = await db
    .prepare('SELECT * FROM lignes_budgetaires WHERE projet_id = ? ORDER BY ordre ASC, code ASC')
    .bind(projetId)
    .all<any>()

  const { results: depensesParLigne } = await db
    .prepare(
      `SELECT ligne_budgetaire_id, COALESCE(SUM(montant),0) as total
       FROM depenses WHERE projet_id = ? AND statut = 'valide' AND ligne_budgetaire_id IS NOT NULL
       GROUP BY ligne_budgetaire_id`
    )
    .bind(projetId)
    .all<any>()

  const depenseMap: Record<number, number> = {}
  for (const row of depensesParLigne as any[]) depenseMap[row.ligne_budgetaire_id] = row.total

  const enrichies = (lignes as any[]).map((l) => {
    const montant_depense = depenseMap[l.id] || 0
    const taux_execution = l.montant_alloue > 0 ? Math.round((montant_depense / l.montant_alloue) * 1000) / 10 : 0
    return { ...l, montant_depense, taux_execution }
  })

  return enrichies
}

function buildArbre(lignes: any[]) {
  const parId: Record<string, any[]> = {}
  for (const l of lignes) {
    const key = String(l.parent_id ?? 'root')
    if (!parId[key]) parId[key] = []
    parId[key].push(l)
  }
  function attach(node: any): any {
    const enfants = parId[String(node.id)] || []
    return { ...node, enfants: enfants.map(attach) }
  }
  return (parId['root'] || []).map(attach)
}

// --- Routes Projets ---

// Liste des projets (secrétaire national : tout ; comptable : lecture des projets actifs pour imputation des dépenses)
projets.get('/', authRequired, async (c) => {
  const { statut } = c.req.query()
  let query = `SELECT p.*,
      (SELECT COALESCE(SUM(montant_alloue),0) FROM lignes_budgetaires WHERE projet_id = p.id) as montant_budgetise,
      (SELECT COALESCE(SUM(montant),0) FROM depenses WHERE projet_id = p.id AND statut='valide') as montant_depense
    FROM projets p WHERE 1=1`
  const binds: any[] = []
  if (statut) { query += ' AND p.statut = ?'; binds.push(statut) }
  query += ' ORDER BY p.created_at DESC'

  const { results } = await c.env.DB.prepare(query).bind(...binds).all<any>()
  const enrichis = (results as any[]).map((p) => ({
    ...p,
    taux_execution: p.montant_total > 0 ? Math.round((p.montant_depense / p.montant_total) * 1000) / 10 : 0
  }))
  return c.json({ projets: enrichis })
})

// Détail d'un projet : infos + arborescence des lignes budgétaires avec taux d'exécution
projets.get('/:id', authRequired, async (c) => {
  const id = c.req.param('id')
  const projet = await c.env.DB.prepare('SELECT * FROM projets WHERE id = ?').bind(id).first<any>()
  if (!projet) return c.json({ error: 'Projet introuvable' }, 404)

  const lignesEnrichies = await computeLignesAvecExecution(c.env.DB, Number(id))
  const arbre = buildArbre(lignesEnrichies)

  const montant_budgetise = lignesEnrichies.reduce((s, l) => s + (l.montant_alloue || 0), 0)
  const montant_depense = lignesEnrichies.reduce((s, l) => s + (l.montant_depense || 0), 0)
  const taux_execution_global = projet.montant_total > 0 ? Math.round((montant_depense / projet.montant_total) * 1000) / 10 : 0

  const { results: depenses } = await c.env.DB.prepare(
    `SELECT d.*, co.nom as commune_nom, lb.code as ligne_code, lb.libelle as ligne_libelle
     FROM depenses d
     LEFT JOIN communes co ON co.id = d.commune_id
     LEFT JOIN lignes_budgetaires lb ON lb.id = d.ligne_budgetaire_id
     WHERE d.projet_id = ? ORDER BY d.date_depense DESC LIMIT 200`
  ).bind(id).all()

  return c.json({
    projet: { ...projet, montant_budgetise, montant_depense, taux_execution_global },
    lignes_budgetaires: arbre,
    depenses
  })
})

// Créer un projet (bailleur) - Secrétaire National uniquement
projets.post('/', authRequired, requireRole('secretaire'), async (c) => {
  const user = currentUser(c)
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Requête invalide' }, 400)
  const { nom, bailleur, montant_total, devise, date_debut, date_fin, description } = body as Record<string, any>

  if (!nom || !bailleur) return c.json({ error: 'nom et bailleur requis' }, 400)

  const result = await c.env.DB.prepare(
    `INSERT INTO projets (nom, bailleur, montant_total, devise, date_debut, date_fin, description, statut, cree_par)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'actif', ?)`
  )
    .bind(nom, bailleur, montant_total || 0, devise || 'GNF', date_debut || null, date_fin || null, description || null, user.sub)
    .run()

  const projet = await c.env.DB.prepare('SELECT * FROM projets WHERE id = ?').bind(result.meta.last_row_id).first()
  return c.json({ projet }, 201)
})

// Modifier un projet (infos générales + statut) - Secrétaire National uniquement
projets.put('/:id', authRequired, requireRole('secretaire'), async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Requête invalide' }, 400)

  const existing = await c.env.DB.prepare('SELECT * FROM projets WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: 'Projet introuvable' }, 404)

  const fields = ['nom', 'bailleur', 'montant_total', 'devise', 'date_debut', 'date_fin', 'description', 'statut']
  const updates: string[] = []
  const binds: any[] = []
  for (const f of fields) {
    if (body[f] !== undefined) { updates.push(`${f} = ?`); binds.push(body[f]) }
  }
  if (updates.length === 0) return c.json({ error: 'Aucune modification fournie' }, 400)

  binds.push(id)
  await c.env.DB.prepare(`UPDATE projets SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run()
  const projet = await c.env.DB.prepare('SELECT * FROM projets WHERE id = ?').bind(id).first()
  return c.json({ projet })
})

// --- Routes Lignes budgétaires ---

// Créer une ligne budgétaire (rubrique ou sous-ligne codifiée) - Secrétaire National uniquement
projets.post('/:id/lignes', authRequired, requireRole('secretaire'), async (c) => {
  const projetId = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Requête invalide' }, 400)
  const { parent_id, code, libelle, montant_alloue, ordre } = body as Record<string, any>

  if (!code || !libelle) return c.json({ error: 'code et libelle requis' }, 400)

  const projet = await c.env.DB.prepare('SELECT id FROM projets WHERE id = ?').bind(projetId).first()
  if (!projet) return c.json({ error: 'Projet introuvable' }, 404)

  const result = await c.env.DB.prepare(
    `INSERT INTO lignes_budgetaires (projet_id, parent_id, code, libelle, montant_alloue, ordre)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(projetId, parent_id || null, code, libelle, montant_alloue || 0, ordre || 0)
    .run()

  const ligne = await c.env.DB.prepare('SELECT * FROM lignes_budgetaires WHERE id = ?').bind(result.meta.last_row_id).first()
  return c.json({ ligne }, 201)
})

// Modifier une ligne budgétaire - Secrétaire National uniquement
projets.put('/:id/lignes/:ligneId', authRequired, requireRole('secretaire'), async (c) => {
  const ligneId = c.req.param('ligneId')
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Requête invalide' }, 400)

  const existing = await c.env.DB.prepare('SELECT * FROM lignes_budgetaires WHERE id = ?').bind(ligneId).first()
  if (!existing) return c.json({ error: 'Ligne budgétaire introuvable' }, 404)

  const fields = ['code', 'libelle', 'montant_alloue', 'ordre', 'parent_id']
  const updates: string[] = []
  const binds: any[] = []
  for (const f of fields) {
    if (body[f] !== undefined) { updates.push(`${f} = ?`); binds.push(body[f]) }
  }
  if (updates.length === 0) return c.json({ error: 'Aucune modification fournie' }, 400)

  binds.push(ligneId)
  await c.env.DB.prepare(`UPDATE lignes_budgetaires SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run()
  const ligne = await c.env.DB.prepare('SELECT * FROM lignes_budgetaires WHERE id = ?').bind(ligneId).first()
  return c.json({ ligne })
})

// Supprimer une ligne budgétaire (uniquement si aucune dépense imputée et aucun enfant) - Secrétaire National
projets.delete('/:id/lignes/:ligneId', authRequired, requireRole('secretaire'), async (c) => {
  const ligneId = c.req.param('ligneId')

  const nbDepenses = await c.env.DB.prepare('SELECT COUNT(*) as n FROM depenses WHERE ligne_budgetaire_id = ?').bind(ligneId).first<any>()
  if (nbDepenses && nbDepenses.n > 0) {
    return c.json({ error: 'Impossible de supprimer : des dépenses sont déjà imputées à cette ligne' }, 400)
  }
  const nbEnfants = await c.env.DB.prepare('SELECT COUNT(*) as n FROM lignes_budgetaires WHERE parent_id = ?').bind(ligneId).first<any>()
  if (nbEnfants && nbEnfants.n > 0) {
    return c.json({ error: 'Impossible de supprimer : cette ligne possède des sous-lignes' }, 400)
  }

  await c.env.DB.prepare('DELETE FROM lignes_budgetaires WHERE id = ?').bind(ligneId).run()
  return c.json({ success: true })
})

export default projets
