import { Hono } from 'hono'
import type { Bindings, User } from '../types'
import { hashPassword, verifyPassword, randomSalt } from '../utils/crypto'
import { createToken, authRequired, currentUser } from '../middleware/auth'

const auth = new Hono<{ Bindings: Bindings }>()

// Connexion (email OU téléphone + mot de passe)
auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Requête invalide' }, 400)
  const { identifiant, password } = body as { identifiant?: string; password?: string }
  if (!identifiant || !password) {
    return c.json({ error: 'Identifiant et mot de passe requis' }, 400)
  }

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE (email = ? OR telephone = ?) AND actif = 1'
  )
    .bind(identifiant, identifiant)
    .first<User>()

  if (!user) {
    return c.json({ error: "Identifiant ou mot de passe incorrect" }, 401)
  }

  const valid = await verifyPassword(password, user.password_salt, user.password_hash)
  if (!valid) {
    return c.json({ error: "Identifiant ou mot de passe incorrect" }, 401)
  }

  await c.env.DB.prepare('UPDATE users SET derniere_connexion = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(user.id)
    .run()

  const token = await createToken(c, {
    sub: user.id,
    role: user.role,
    commune_id: user.commune_id,
    nom: user.nom,
    prenom: user.prenom
  })

  // Si membre, récupérer aussi la fiche membre
  let membre = null
  if (user.role === 'membre') {
    membre = await c.env.DB.prepare('SELECT * FROM membres WHERE user_id = ?').bind(user.id).first()
  }

  let commune = null
  if (user.commune_id) {
    commune = await c.env.DB.prepare('SELECT * FROM communes WHERE id = ?').bind(user.commune_id).first()
  }

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      telephone: user.telephone,
      role: user.role,
      commune_id: user.commune_id,
      nom: user.nom,
      prenom: user.prenom,
      doit_changer_mdp: !!user.doit_changer_mdp
    },
    membre,
    commune
  })
})

// Récupérer le profil courant
auth.get('/me', authRequired, async (c) => {
  const jwtUser = currentUser(c)
  const user = await c.env.DB.prepare('SELECT id, email, telephone, role, commune_id, nom, prenom, doit_changer_mdp FROM users WHERE id = ?')
    .bind(jwtUser.sub)
    .first()
  if (!user) return c.json({ error: 'Utilisateur introuvable' }, 404)

  let membre = null
  if (jwtUser.role === 'membre') {
    membre = await c.env.DB.prepare('SELECT * FROM membres WHERE user_id = ?').bind(jwtUser.sub).first()
  }
  let commune = null
  if (jwtUser.commune_id) {
    commune = await c.env.DB.prepare('SELECT * FROM communes WHERE id = ?').bind(jwtUser.commune_id).first()
  }

  return c.json({ user, membre, commune })
})

// Changer son mot de passe
auth.post('/change-password', authRequired, async (c) => {
  const jwtUser = currentUser(c)
  const body = await c.req.json().catch(() => null)
  const { ancien_password, nouveau_password } = (body || {}) as { ancien_password?: string; nouveau_password?: string }
  if (!nouveau_password || nouveau_password.length < 6) {
    return c.json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' }, 400)
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(jwtUser.sub).first<User>()
  if (!user) return c.json({ error: 'Utilisateur introuvable' }, 404)

  if (!user.doit_changer_mdp) {
    if (!ancien_password) return c.json({ error: 'Ancien mot de passe requis' }, 400)
    const valid = await verifyPassword(ancien_password, user.password_salt, user.password_hash)
    if (!valid) return c.json({ error: 'Ancien mot de passe incorrect' }, 401)
  }

  const salt = randomSalt()
  const hash = await hashPassword(nouveau_password, salt)
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ?, doit_changer_mdp = 0 WHERE id = ?')
    .bind(hash, salt, user.id)
    .run()

  return c.json({ success: true })
})

export default auth
