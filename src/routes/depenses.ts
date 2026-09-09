import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authRequired, requireRole, currentUser } from '../middleware/auth'

const depenses = new Hono<{ Bindings: Bindings }>()

depenses.get('/', authRequired, async (c) => {
  const user = currentUser(c)
  const { commune_id, statut } = c.req.query()

  let query = `SELECT d.*, co.nom as commune_nom FROM depenses d
    LEFT JOIN communes co ON co.id = d.commune_id WHERE 1=1`
  const binds: any[] = []

  if (user.role === 'comptable') {
    query += ' AND d.commune_id = ?'
    binds.push(user.commune_id)
  } else if (commune_id) {
    query += ' AND d.commune_id = ?'
    binds.push(commune_id)
  }
  if (statut) { query += ' AND d.statut = ?'; binds.push(statut) }

  query += ' ORDER BY d.created_at DESC LIMIT 500'
  const { results } = await c.env.DB.prepare(query).bind(...binds).all()
  return c.json({ depenses: results })
})

depenses.post('/', authRequired, requireRole('comptable', 'secretaire'), async (c) => {
  const user = currentUser(c)
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Requête invalide' }, 400)
  const { libelle, categorie, montant, justificatif_url, date_depense, commentaire } = body as Record<string, any>

  if (!libelle || !montant) return c.json({ error: 'libelle et montant requis' }, 400)

  const commune_id = user.role === 'comptable' ? user.commune_id : (body.commune_id ?? null)
  const dateDep = date_depense || new Date().toISOString().slice(0, 10)

  const result = await c.env.DB.prepare(
    `INSERT INTO depenses (commune_id, libelle, categorie, montant, justificatif_url, date_depense, commentaire, statut, saisi_par)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'valide', ?)`
  )
    .bind(commune_id, libelle, categorie || null, montant, justificatif_url || null, dateDep, commentaire || null, user.sub)
    .run()

  const depense = await c.env.DB.prepare('SELECT * FROM depenses WHERE id = ?').bind(result.meta.last_row_id).first()
  return c.json({ depense }, 201)
})

export default depenses
