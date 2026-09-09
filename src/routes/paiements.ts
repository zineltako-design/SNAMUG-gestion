import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authRequired, requireRole, currentUser } from '../middleware/auth'
import { genererNumeroRecu } from '../utils/crypto'

const paiements = new Hono<{ Bindings: Bindings }>()

// Liste des paiements (filtrée par commune si comptable, par membre_id/type/periode en query)
paiements.get('/', authRequired, async (c) => {
  const user = currentUser(c)
  const { membre_id, type, commune_id, statut, periode_annee } = c.req.query()

  let query = `SELECT p.*, m.nom as membre_nom, m.prenom as membre_prenom, co.nom as commune_nom
    FROM paiements p
    JOIN membres m ON m.id = p.membre_id
    JOIN communes co ON co.id = p.commune_id
    WHERE 1=1`
  const binds: any[] = []

  if (user.role === 'comptable') {
    query += ' AND p.commune_id = ?'
    binds.push(user.commune_id)
  } else if (commune_id) {
    query += ' AND p.commune_id = ?'
    binds.push(commune_id)
  }

  if (membre_id) { query += ' AND p.membre_id = ?'; binds.push(membre_id) }
  if (type) { query += ' AND p.type = ?'; binds.push(type) }
  if (statut) { query += ' AND p.statut = ?'; binds.push(statut) }
  if (periode_annee) { query += ' AND p.periode_annee = ?'; binds.push(periode_annee) }

  query += ' ORDER BY p.created_at DESC LIMIT 500'

  const { results } = await c.env.DB.prepare(query).bind(...binds).all()
  return c.json({ paiements: results })
})

// Détail d'un paiement (pour affichage/impression du reçu)
paiements.get('/:id', authRequired, async (c) => {
  const id = c.req.param('id')
  const paiement = await c.env.DB.prepare(
    `SELECT p.*, m.nom as membre_nom, m.prenom as membre_prenom, m.numero_adhesion,
            co.nom as commune_nom, co.code as commune_code
     FROM paiements p
     JOIN membres m ON m.id = p.membre_id
     JOIN communes co ON co.id = p.commune_id
     WHERE p.id = ?`
  ).bind(id).first()

  if (!paiement) return c.json({ error: 'Paiement introuvable' }, 404)
  return c.json({ paiement })
})

// Enregistrer un paiement (adhésion / cotisation / don)
paiements.post('/', authRequired, requireRole('comptable', 'secretaire'), async (c) => {
  const user = currentUser(c)
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Requête invalide' }, 400)

  const {
    membre_id, type, montant, mode_paiement, reference_paiement,
    periode_annee, periode_mois, date_paiement, commentaire
  } = body as Record<string, any>

  if (!membre_id || !type || !montant || !mode_paiement) {
    return c.json({ error: 'membre_id, type, montant et mode_paiement sont requis' }, 400)
  }
  if (!['adhesion', 'cotisation', 'don'].includes(type)) {
    return c.json({ error: 'Type de paiement invalide' }, 400)
  }
  if (!['especes', 'orange_money'].includes(mode_paiement)) {
    return c.json({ error: 'Mode de paiement invalide' }, 400)
  }
  if (mode_paiement === 'orange_money' && !reference_paiement) {
    return c.json({ error: 'Référence de transaction Orange Money requise' }, 400)
  }

  const membre = await c.env.DB.prepare('SELECT * FROM membres WHERE id = ?').bind(membre_id).first<any>()
  if (!membre) return c.json({ error: 'Membre introuvable' }, 404)
  if (user.role === 'comptable' && membre.commune_id !== user.commune_id) {
    return c.json({ error: 'Accès refusé : ce membre appartient à une autre commune' }, 403)
  }

  const annee = periode_annee || new Date().getFullYear()
  const datePaie = date_paiement || new Date().toISOString().slice(0, 10)

  const result = await c.env.DB.prepare(
    `INSERT INTO paiements
      (numero_recu, membre_id, commune_id, type, montant, mode_paiement, reference_paiement,
       periode_annee, periode_mois, date_paiement, commentaire, statut, saisi_par)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'valide', ?)`
  )
    .bind(
      'TEMP', membre_id, membre.commune_id, type, montant, mode_paiement,
      reference_paiement || null, annee, periode_mois || null, datePaie,
      commentaire || null, user.sub
    )
    .run()

  const paiementId = result.meta.last_row_id as number
  const numeroRecu = genererNumeroRecu(type, paiementId)
  await c.env.DB.prepare('UPDATE paiements SET numero_recu = ?, valide_par = ?, valide_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(numeroRecu, user.sub, paiementId)
    .run()

  const paiement = await c.env.DB.prepare('SELECT * FROM paiements WHERE id = ?').bind(paiementId).first()
  return c.json({ paiement }, 201)
})

// Rejeter/annuler un paiement (correction à distance par le Secrétaire National)
paiements.put('/:id/statut', authRequired, requireRole('secretaire'), async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  const { statut } = (body || {}) as { statut?: string }
  if (!statut || !['en_attente', 'valide', 'rejete'].includes(statut)) {
    return c.json({ error: 'Statut invalide' }, 400)
  }
  const user = currentUser(c)
  await c.env.DB.prepare('UPDATE paiements SET statut = ?, valide_par = ?, valide_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(statut, user.sub, id)
    .run()
  const paiement = await c.env.DB.prepare('SELECT * FROM paiements WHERE id = ?').bind(id).first()
  return c.json({ paiement })
})

export default paiements
