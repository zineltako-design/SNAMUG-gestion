import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authRequired, requireRole } from '../middleware/auth'

const parametres = new Hono<{ Bindings: Bindings }>()

// Paramètres généraux (nom app, logo, couleurs) - lecture publique (nécessaire pour la page de login)
parametres.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM parametres').all()
  const map: Record<string, string> = {}
  for (const row of results as any[]) map[row.cle] = row.valeur
  return c.json({ parametres: map })
})

// Modifier les paramètres (Secrétaire National uniquement)
parametres.put('/', authRequired, requireRole('secretaire'), async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body || typeof body !== 'object') return c.json({ error: 'Requête invalide' }, 400)

  for (const [cle, valeur] of Object.entries(body)) {
    await c.env.DB.prepare('INSERT INTO parametres (cle, valeur) VALUES (?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = ?')
      .bind(cle, String(valeur), String(valeur))
      .run()
  }

  const { results } = await c.env.DB.prepare('SELECT * FROM parametres').all()
  const map: Record<string, string> = {}
  for (const row of results as any[]) map[row.cle] = row.valeur
  return c.json({ parametres: map })
})

// Tarifs de cotisation
parametres.get('/tarifs', authRequired, async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM tarifs_cotisation ORDER BY annee DESC').all()
  return c.json({ tarifs: results })
})

parametres.get('/tarifs/courant', authRequired, async (c) => {
  const annee = new Date().getFullYear()
  const tarif = await c.env.DB.prepare('SELECT * FROM tarifs_cotisation WHERE annee = ?').bind(annee).first()
  return c.json({ tarif })
})

parametres.post('/tarifs', authRequired, requireRole('secretaire'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const { annee, montant_adhesion, montant_cotisation_annuelle } = (body || {}) as Record<string, any>
  if (!annee || montant_adhesion === undefined || montant_cotisation_annuelle === undefined) {
    return c.json({ error: 'annee, montant_adhesion et montant_cotisation_annuelle requis' }, 400)
  }
  await c.env.DB.prepare(
    `INSERT INTO tarifs_cotisation (annee, montant_adhesion, montant_cotisation_annuelle) VALUES (?, ?, ?)
     ON CONFLICT(annee) DO UPDATE SET montant_adhesion = ?, montant_cotisation_annuelle = ?`
  )
    .bind(annee, montant_adhesion, montant_cotisation_annuelle, montant_adhesion, montant_cotisation_annuelle)
    .run()
  const tarif = await c.env.DB.prepare('SELECT * FROM tarifs_cotisation WHERE annee = ?').bind(annee).first()
  return c.json({ tarif })
})

export default parametres
