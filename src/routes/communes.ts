import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authRequired, requireRole } from '../middleware/auth'

const communes = new Hono<{ Bindings: Bindings }>()

// Liste des communes (accessible à tous les rôles authentifiés)
// Tri par région puis par nom pour faciliter le regroupement côté frontend (<optgroup>)
communes.get('/', authRequired, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM communes ORDER BY (region IS NULL), region ASC, nom ASC"
  ).all()
  return c.json({ communes: results })
})

// Liste des communes regroupées par région : [{ region, communes: [...] }]
// Pratique pour construire directement des <optgroup> côté frontend
communes.get('/groupees', authRequired, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM communes WHERE actif = 1 ORDER BY (region IS NULL), region ASC, nom ASC"
  ).all()

  const groupes: { region: string; communes: any[] }[] = []
  const index: Record<string, any[]> = {}
  for (const commune of results as any[]) {
    const region = commune.region || 'Autre'
    if (!index[region]) {
      index[region] = []
      groupes.push({ region, communes: index[region] })
    }
    index[region].push(commune)
  }

  return c.json({ groupes })
})

// Liste des localités (communes/secteurs) d'une préfecture-commune
communes.get('/:id/localites', authRequired, async (c) => {
  const id = c.req.param('id')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM localites WHERE commune_id = ? ORDER BY nom ASC'
  )
    .bind(id)
    .all()
  return c.json({ localites: results })
})

// Détail d'une commune + statistiques rapides
communes.get('/:id', authRequired, async (c) => {
  const id = c.req.param('id')
  const commune = await c.env.DB.prepare('SELECT * FROM communes WHERE id = ?').bind(id).first()
  if (!commune) return c.json({ error: 'Commune introuvable' }, 404)

  const stats = await c.env.DB.prepare(
    `SELECT
      (SELECT COUNT(*) FROM membres WHERE commune_id = ? AND statut = 'actif') as membres_actifs,
      (SELECT COUNT(*) FROM users WHERE commune_id = ? AND role = 'comptable') as comptables
    `
  )
    .bind(id, id)
    .first()

  return c.json({ commune, stats })
})

// Créer une commune (Secrétaire National uniquement)
communes.post('/', authRequired, requireRole('secretaire'), async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Requête invalide' }, 400)
  const { nom, code, region } = body as { nom?: string; code?: string; region?: string }
  if (!nom || !code) return c.json({ error: 'Nom et code requis' }, 400)

  try {
    const result = await c.env.DB.prepare(
      'INSERT INTO communes (nom, code, region, actif) VALUES (?, ?, ?, 1)'
    )
      .bind(nom, code.toUpperCase(), region || null)
      .run()
    const commune = await c.env.DB.prepare('SELECT * FROM communes WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first()
    return c.json({ commune }, 201)
  } catch (e: any) {
    if (String(e.message).includes('UNIQUE')) {
      return c.json({ error: 'Ce code de commune existe déjà' }, 409)
    }
    return c.json({ error: 'Erreur lors de la création' }, 500)
  }
})

// Modifier une commune (Secrétaire National uniquement)
communes.put('/:id', authRequired, requireRole('secretaire'), async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Requête invalide' }, 400)
  const { nom, code, region, actif } = body as { nom?: string; code?: string; region?: string; actif?: boolean }

  const existing = await c.env.DB.prepare('SELECT * FROM communes WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: 'Commune introuvable' }, 404)

  await c.env.DB.prepare(
    'UPDATE communes SET nom = ?, code = ?, region = ?, actif = ? WHERE id = ?'
  )
    .bind(
      nom ?? (existing as any).nom,
      (code ?? (existing as any).code).toUpperCase(),
      region ?? (existing as any).region,
      actif === undefined ? (existing as any).actif : actif ? 1 : 0,
      id
    )
    .run()

  const commune = await c.env.DB.prepare('SELECT * FROM communes WHERE id = ?').bind(id).first()
  return c.json({ commune })
})

// Désactiver/Supprimer une commune (Secrétaire National uniquement)
communes.delete('/:id', authRequired, requireRole('secretaire'), async (c) => {
  const id = c.req.param('id')
  // On désactive plutôt que supprimer (intégrité des données historiques)
  await c.env.DB.prepare('UPDATE communes SET actif = 0 WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

export default communes
