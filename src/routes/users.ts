import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authRequired, requireRole } from '../middleware/auth'
import { hashPassword, randomSalt } from '../utils/crypto'

const users = new Hono<{ Bindings: Bindings }>()

// Liste des utilisateurs (comptables + secrétaires) - Secrétaire National uniquement
users.get('/', authRequired, requireRole('secretaire'), async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.telephone, u.role, u.commune_id, u.nom, u.prenom, u.actif, u.derniere_connexion, u.created_at,
            co.nom as commune_nom
     FROM users u LEFT JOIN communes co ON co.id = u.commune_id
     WHERE u.role IN ('comptable','secretaire')
     ORDER BY u.created_at DESC`
  ).all()
  return c.json({ users: results })
})

// Créer un compte Comptable Communal ou Secrétaire National
users.post('/', authRequired, requireRole('secretaire'), async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Requête invalide' }, 400)
  const { nom, prenom, email, telephone, role, commune_id, password } = body as Record<string, any>

  if (!nom || !prenom || !role) return c.json({ error: 'nom, prenom et role requis' }, 400)
  if (!['comptable', 'secretaire'].includes(role)) return c.json({ error: 'Rôle invalide' }, 400)
  if (role === 'comptable' && !commune_id) return c.json({ error: 'commune_id requis pour un comptable' }, 400)
  if (!email && !telephone) return c.json({ error: 'email ou telephone requis' }, 400)

  const salt = randomSalt()
  const motDePasse = password || Math.random().toString(36).slice(-8)
  const hash = await hashPassword(motDePasse, salt)

  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO users (email, telephone, password_hash, password_salt, role, commune_id, nom, prenom, doit_changer_mdp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    )
      .bind(email || null, telephone || null, hash, salt, role, role === 'comptable' ? commune_id : null, nom, prenom)
      .run()

    const user = await c.env.DB.prepare('SELECT id, email, telephone, role, commune_id, nom, prenom FROM users WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first()

    return c.json({ user, mot_de_passe_genere: motDePasse }, 201)
  } catch (e: any) {
    if (String(e.message).includes('UNIQUE')) {
      return c.json({ error: 'Cet email ou téléphone est déjà utilisé' }, 409)
    }
    return c.json({ error: 'Erreur lors de la création du compte' }, 500)
  }
})

// Activer/désactiver un compte
users.put('/:id/statut', authRequired, requireRole('secretaire'), async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  const { actif } = (body || {}) as { actif?: boolean }
  await c.env.DB.prepare('UPDATE users SET actif = ? WHERE id = ?').bind(actif ? 1 : 0, id).run()
  const user = await c.env.DB.prepare('SELECT id, email, telephone, role, commune_id, nom, prenom, actif FROM users WHERE id = ?').bind(id).first()
  return c.json({ user })
})

// Réinitialiser le mot de passe d'un utilisateur
users.post('/:id/reset-password', authRequired, requireRole('secretaire'), async (c) => {
  const id = c.req.param('id')
  const salt = randomSalt()
  const motDePasse = Math.random().toString(36).slice(-8)
  const hash = await hashPassword(motDePasse, salt)
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ?, doit_changer_mdp = 1 WHERE id = ?')
    .bind(hash, salt, id)
    .run()
  return c.json({ mot_de_passe_genere: motDePasse })
})

export default users
