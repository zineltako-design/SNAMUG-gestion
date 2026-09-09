import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authRequired, requireRole, currentUser } from '../middleware/auth'
import { hashPassword, randomSalt, genererNumeroAdhesion } from '../utils/crypto'

const membres = new Hono<{ Bindings: Bindings }>()

async function calculerStatutCotisation(db: D1Database, membreId: number, annee: number): Promise<'a_jour' | 'en_retard'> {
  const paiement = await db
    .prepare(
      `SELECT id FROM paiements WHERE membre_id = ? AND type = 'cotisation' AND periode_annee = ? AND statut = 'valide' LIMIT 1`
    )
    .bind(membreId, annee)
    .first()
  return paiement ? 'a_jour' : 'en_retard'
}

// Liste des membres (filtrée par commune si comptable, toutes si secrétaire)
membres.get('/', authRequired, async (c) => {
  const user = currentUser(c)
  const communeIdParam = c.req.query('commune_id')
  const search = c.req.query('search')

  let query = `SELECT m.*, co.nom as commune_nom, co.code as commune_code FROM membres m
    JOIN communes co ON co.id = m.commune_id WHERE 1=1`
  const binds: any[] = []

  if (user.role === 'comptable') {
    query += ' AND m.commune_id = ?'
    binds.push(user.commune_id)
  } else if (communeIdParam) {
    query += ' AND m.commune_id = ?'
    binds.push(communeIdParam)
  }

  if (search) {
    query += ' AND (m.nom LIKE ? OR m.prenom LIKE ? OR m.numero_adhesion LIKE ?)'
    binds.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }

  query += ' ORDER BY m.created_at DESC'

  const { results } = await c.env.DB.prepare(query).bind(...binds).all()

  const annee = new Date().getFullYear()
  const withStatut = await Promise.all(
    (results as any[]).map(async (m) => ({
      ...m,
      statut_cotisation: await calculerStatutCotisation(c.env.DB, m.id, annee)
    }))
  )

  return c.json({ membres: withStatut })
})

// Détail d'un membre
membres.get('/:id', authRequired, async (c) => {
  const user = currentUser(c)
  const id = c.req.param('id')
  const membre = await c.env.DB.prepare(
    `SELECT m.*, co.nom as commune_nom, co.code as commune_code FROM membres m
     JOIN communes co ON co.id = m.commune_id WHERE m.id = ?`
  )
    .bind(id)
    .first<any>()

  if (!membre) return c.json({ error: 'Membre introuvable' }, 404)
  if (user.role === 'comptable' && membre.commune_id !== user.commune_id) {
    return c.json({ error: 'Accès refusé' }, 403)
  }

  const annee = new Date().getFullYear()
  const statut_cotisation = await calculerStatutCotisation(c.env.DB, membre.id, annee)

  const { results: historique } = await c.env.DB.prepare(
    'SELECT * FROM paiements WHERE membre_id = ? ORDER BY date_paiement DESC'
  )
    .bind(id)
    .all()

  return c.json({ membre: { ...membre, statut_cotisation }, historique })
})

// Créer un membre (adhésion) - comptable communal ou secrétaire national
membres.post('/', authRequired, requireRole('comptable', 'secretaire'), async (c) => {
  const user = currentUser(c)
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Requête invalide' }, 400)

  const {
    nom, prenom, telephone, email, sexe, date_naissance,
    discipline, adresse, commune_id: communeIdInput, creer_compte
  } = body as Record<string, any>

  if (!nom || !prenom) return c.json({ error: 'Nom et prénom requis' }, 400)

  // Le comptable ne peut inscrire que dans sa propre commune
  const commune_id = user.role === 'comptable' ? user.commune_id : (communeIdInput || user.commune_id)
  if (!commune_id) return c.json({ error: 'Commune requise' }, 400)

  const commune = await c.env.DB.prepare('SELECT * FROM communes WHERE id = ?').bind(commune_id).first<any>()
  if (!commune) return c.json({ error: 'Commune invalide' }, 400)

  const dateAdhesion = new Date().toISOString().slice(0, 10)

  const result = await c.env.DB.prepare(
    `INSERT INTO membres (numero_adhesion, commune_id, nom, prenom, telephone, email, sexe, date_naissance, discipline, adresse, date_adhesion, statut, saisi_par)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'actif', ?)`
  )
    .bind(
      'TEMP', commune_id, nom, prenom, telephone || null, email || null,
      sexe || null, date_naissance || null, discipline || null, adresse || null,
      dateAdhesion, user.sub
    )
    .run()

  const membreId = result.meta.last_row_id as number
  const numeroAdhesion = genererNumeroAdhesion(commune.code, membreId)
  await c.env.DB.prepare('UPDATE membres SET numero_adhesion = ? WHERE id = ?')
    .bind(numeroAdhesion, membreId)
    .run()

  // Création optionnelle d'un compte utilisateur pour le membre (accès mobile)
  let userCreated = null
  let motDePasseGenere: string | null = null
  if (creer_compte && (telephone || email)) {
    const salt = randomSalt()
    motDePasseGenere = Math.random().toString(36).slice(-8)
    const hash = await hashPassword(motDePasseGenere, salt)
    try {
      const userResult = await c.env.DB.prepare(
        `INSERT INTO users (email, telephone, password_hash, password_salt, role, commune_id, nom, prenom, doit_changer_mdp)
         VALUES (?, ?, ?, ?, 'membre', ?, ?, ?, 1)`
      )
        .bind(email || null, telephone || null, hash, salt, commune_id, nom, prenom)
        .run()
      const newUserId = userResult.meta.last_row_id
      await c.env.DB.prepare('UPDATE membres SET user_id = ? WHERE id = ?').bind(newUserId, membreId).run()
      userCreated = { id: newUserId, telephone, email }
    } catch (e) {
      // email/téléphone déjà utilisé : on continue sans bloquer l'adhésion
    }
  }

  const membre = await c.env.DB.prepare('SELECT * FROM membres WHERE id = ?').bind(membreId).first()
  return c.json({ membre, compte_cree: userCreated, mot_de_passe_genere: motDePasseGenere }, 201)
})

// Modifier un membre
membres.put('/:id', authRequired, requireRole('comptable', 'secretaire'), async (c) => {
  const user = currentUser(c)
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Requête invalide' }, 400)

  const existing = await c.env.DB.prepare('SELECT * FROM membres WHERE id = ?').bind(id).first<any>()
  if (!existing) return c.json({ error: 'Membre introuvable' }, 404)
  if (user.role === 'comptable' && existing.commune_id !== user.commune_id) {
    return c.json({ error: 'Accès refusé' }, 403)
  }

  const fields = ['nom', 'prenom', 'telephone', 'email', 'sexe', 'date_naissance', 'discipline', 'adresse', 'statut']
  const updates: string[] = []
  const binds: any[] = []
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`)
      binds.push(body[f])
    }
  }
  if (updates.length === 0) return c.json({ error: 'Aucune modification fournie' }, 400)

  binds.push(id)
  await c.env.DB.prepare(`UPDATE membres SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run()

  const membre = await c.env.DB.prepare('SELECT * FROM membres WHERE id = ?').bind(id).first()
  return c.json({ membre })
})

export default membres
