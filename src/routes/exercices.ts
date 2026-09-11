import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authRequired, requireRole } from '../middleware/auth'

const exercices = new Hono<{ Bindings: Bindings }>()

// --- Helpers ---

function csvEscape(v: any): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

function toCsv(rows: any[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => csvEscape(c.label)).join(';')
  const lines = rows.map((r) => columns.map((c) => csvEscape(r[c.key])).join(';'))
  return [header, ...lines].join('\r\n')
}

async function computeStatsAnnee(db: D1Database, annee: number) {
  const global = await db
    .prepare(
      `SELECT
        (SELECT COALESCE(SUM(montant),0) FROM paiements WHERE statut='valide' AND periode_annee = ?) as total_recettes,
        (SELECT COALESCE(SUM(montant),0) FROM depenses WHERE statut='valide' AND strftime('%Y', date_depense) = ?) as total_depenses,
        (SELECT COUNT(*) FROM paiements WHERE statut='valide' AND periode_annee = ?) as nb_paiements,
        (SELECT COUNT(*) FROM depenses WHERE statut='valide' AND strftime('%Y', date_depense) = ?) as nb_depenses,
        (SELECT COUNT(DISTINCT m.id) FROM membres m JOIN paiements p ON p.membre_id = m.id WHERE p.type='cotisation' AND p.periode_annee = ? AND p.statut='valide') as membres_a_jour,
        (SELECT COUNT(*) FROM membres WHERE statut='actif') as total_membres_actifs
      `
    )
    .bind(annee, String(annee), annee, String(annee), annee)
    .first<any>()

  const { results: parCommune } = await db
    .prepare(
      `SELECT co.id, co.nom, co.code,
        (SELECT COALESCE(SUM(montant),0) FROM paiements p WHERE p.commune_id = co.id AND p.statut='valide' AND p.periode_annee = ?) as recettes,
        (SELECT COALESCE(SUM(montant),0) FROM depenses d WHERE d.commune_id = co.id AND d.statut='valide' AND strftime('%Y', d.date_depense) = ?) as depenses
       FROM communes co ORDER BY co.nom ASC`
    )
    .bind(annee, String(annee))
    .all<any>()

  const parCommuneAvecSolde = (parCommune as any[]).map((c) => ({ ...c, solde: c.recettes - c.depenses }))

  return {
    ...global,
    solde: (global?.total_recettes || 0) - (global?.total_depenses || 0),
    parCommune: parCommuneAvecSolde
  }
}

// --- Routes ---

// Liste des exercices (crée automatiquement l'exercice courant s'il n'existe pas encore)
exercices.get('/', authRequired, requireRole('secretaire'), async (c) => {
  const anneeCourante = new Date().getFullYear()
  await c.env.DB.prepare('INSERT OR IGNORE INTO exercices (annee, statut) VALUES (?, ?)').bind(anneeCourante, 'ouvert').run()

  const { results } = await c.env.DB.prepare('SELECT * FROM exercices ORDER BY annee DESC').all<any>()

  const enrichis = await Promise.all(
    (results as any[]).map(async (ex) => {
      if (ex.statut === 'cloture') return ex
      const stats = await computeStatsAnnee(c.env.DB, ex.annee)
      return { ...ex, total_recettes: stats.total_recettes, total_depenses: stats.total_depenses }
    })
  )

  return c.json({ exercices: enrichis, annee_courante: anneeCourante })
})

// Détail d'un exercice : ventilation par commune, totaux, statut
exercices.get('/:annee', authRequired, requireRole('secretaire'), async (c) => {
  const annee = Number(c.req.param('annee'))
  const exercice = await c.env.DB.prepare('SELECT * FROM exercices WHERE annee = ?').bind(annee).first<any>()
  const stats = await computeStatsAnnee(c.env.DB, annee)

  return c.json({
    exercice: exercice || { annee, statut: 'ouvert' },
    stats
  })
})

// Export CSV des paiements ou dépenses de l'année (compatible Excel)
exercices.get('/:annee/export.csv', authRequired, requireRole('secretaire'), async (c) => {
  const annee = Number(c.req.param('annee'))
  const type = c.req.query('type') || 'paiements'

  if (type === 'depenses') {
    const { results } = await c.env.DB.prepare(
      `SELECT d.date_depense, d.libelle, d.categorie, d.montant, co.nom as commune_nom,
              p.nom as projet_nom, lb.code as ligne_code, lb.libelle as ligne_libelle, d.statut
       FROM depenses d
       LEFT JOIN communes co ON co.id = d.commune_id
       LEFT JOIN projets p ON p.id = d.projet_id
       LEFT JOIN lignes_budgetaires lb ON lb.id = d.ligne_budgetaire_id
       WHERE strftime('%Y', d.date_depense) = ?
       ORDER BY d.date_depense ASC`
    ).bind(String(annee)).all<any>()

    const csv = toCsv(results as any[], [
      { key: 'date_depense', label: 'Date' },
      { key: 'libelle', label: 'Libellé' },
      { key: 'categorie', label: 'Catégorie' },
      { key: 'commune_nom', label: 'Commune' },
      { key: 'projet_nom', label: 'Projet' },
      { key: 'ligne_code', label: 'Code ligne budgétaire' },
      { key: 'ligne_libelle', label: 'Libellé ligne' },
      { key: 'montant', label: 'Montant (GNF)' },
      { key: 'statut', label: 'Statut' }
    ])
    return new Response('\uFEFF' + csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="depenses-${annee}.csv"` }
    })
  }

  const { results } = await c.env.DB.prepare(
    `SELECT p.numero_recu, p.date_paiement, m.nom as membre_nom, m.prenom as membre_prenom, m.numero_adhesion,
            co.nom as commune_nom, p.type, p.mode_paiement, p.reference_paiement, p.montant, p.statut
     FROM paiements p
     JOIN membres m ON m.id = p.membre_id
     JOIN communes co ON co.id = p.commune_id
     WHERE p.periode_annee = ?
     ORDER BY p.date_paiement ASC`
  ).bind(annee).all<any>()

  const csv = toCsv(results as any[], [
    { key: 'numero_recu', label: 'N° Reçu' },
    { key: 'date_paiement', label: 'Date' },
    { key: 'membre_prenom', label: 'Prénom' },
    { key: 'membre_nom', label: 'Nom' },
    { key: 'numero_adhesion', label: 'N° Adhésion' },
    { key: 'commune_nom', label: 'Commune' },
    { key: 'type', label: 'Type' },
    { key: 'mode_paiement', label: 'Mode' },
    { key: 'reference_paiement', label: 'Référence' },
    { key: 'montant', label: 'Montant (GNF)' },
    { key: 'statut', label: 'Statut' }
  ])
  return new Response('\uFEFF' + csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="paiements-${annee}.csv"` }
  })
})

// Clôturer l'exercice : fige les totaux et archive un instantané complet (JSON) sur R2
exercices.post('/:annee/cloturer', authRequired, requireRole('secretaire'), async (c) => {
  const annee = Number(c.req.param('annee'))
  const user = c.get('user') as any

  const existing = await c.env.DB.prepare('SELECT * FROM exercices WHERE annee = ?').bind(annee).first<any>()
  if (existing?.statut === 'cloture') {
    return c.json({ error: 'Cet exercice est déjà clôturé' }, 400)
  }

  const stats = await computeStatsAnnee(c.env.DB, annee)

  const { results: paiements } = await c.env.DB.prepare(
    `SELECT p.*, m.nom as membre_nom, m.prenom as membre_prenom, co.nom as commune_nom
     FROM paiements p JOIN membres m ON m.id = p.membre_id JOIN communes co ON co.id = p.commune_id
     WHERE p.periode_annee = ? ORDER BY p.date_paiement ASC`
  ).bind(annee).all()

  const { results: depenses } = await c.env.DB.prepare(
    `SELECT d.*, co.nom as commune_nom FROM depenses d LEFT JOIN communes co ON co.id = d.commune_id
     WHERE strftime('%Y', d.date_depense) = ? ORDER BY d.date_depense ASC`
  ).bind(String(annee)).all()

  const archive = {
    annee,
    genere_le: new Date().toISOString(),
    cloture_par: { id: user.sub, nom: user.nom, prenom: user.prenom },
    stats,
    paiements,
    depenses
  }

  const archiveKey = `archives/exercice-${annee}-${Date.now()}.json`
  await c.env.R2.put(archiveKey, JSON.stringify(archive, null, 2), {
    httpMetadata: { contentType: 'application/json' }
  })
  const archiveUrl = `/api/files/${archiveKey}`

  await c.env.DB.prepare(
    `INSERT INTO exercices (annee, statut, total_recettes, total_depenses, archive_url, cloture_par, cloture_at)
     VALUES (?, 'cloture', ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(annee) DO UPDATE SET
       statut = 'cloture', total_recettes = ?, total_depenses = ?, archive_url = ?, cloture_par = ?, cloture_at = CURRENT_TIMESTAMP`
  )
    .bind(annee, stats.total_recettes, stats.total_depenses, archiveUrl, user.sub, stats.total_recettes, stats.total_depenses, archiveUrl, user.sub)
    .run()

  const exercice = await c.env.DB.prepare('SELECT * FROM exercices WHERE annee = ?').bind(annee).first()
  return c.json({ exercice, archive_url: archiveUrl })
})

// Réouvrir un exercice clôturé (correction exceptionnelle) - Secrétaire National uniquement
exercices.post('/:annee/reouvrir', authRequired, requireRole('secretaire'), async (c) => {
  const annee = Number(c.req.param('annee'))
  await c.env.DB.prepare('UPDATE exercices SET statut = ? WHERE annee = ?').bind('ouvert', annee).run()
  const exercice = await c.env.DB.prepare('SELECT * FROM exercices WHERE annee = ?').bind(annee).first()
  return c.json({ exercice })
})

export default exercices
