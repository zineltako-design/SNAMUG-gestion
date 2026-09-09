import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authRequired, requireRole, currentUser } from '../middleware/auth'

const dashboard = new Hono<{ Bindings: Bindings }>()

// Vue d'ensemble nationale (Secrétaire National)
dashboard.get('/national', authRequired, requireRole('secretaire'), async (c) => {
  const annee = new Date().getFullYear()

  const globalStats = await c.env.DB.prepare(
    `SELECT
      (SELECT COUNT(*) FROM membres WHERE statut = 'actif') as total_membres,
      (SELECT COUNT(*) FROM communes WHERE actif = 1) as total_communes,
      (SELECT COALESCE(SUM(montant),0) FROM paiements WHERE statut='valide' AND periode_annee = ?) as total_recettes_annee,
      (SELECT COALESCE(SUM(montant),0) FROM depenses WHERE statut='valide' AND strftime('%Y', date_depense) = ?) as total_depenses_annee
    `
  ).bind(annee, String(annee)).first()

  const { results: parCommune } = await c.env.DB.prepare(
    `SELECT co.id, co.nom, co.code,
      (SELECT COUNT(*) FROM membres m WHERE m.commune_id = co.id AND m.statut='actif') as nb_membres,
      (SELECT COALESCE(SUM(montant),0) FROM paiements p WHERE p.commune_id = co.id AND p.statut='valide' AND p.periode_annee = ?) as recettes,
      (SELECT COALESCE(SUM(montant),0) FROM depenses d WHERE d.commune_id = co.id AND d.statut='valide' AND strftime('%Y', d.date_depense) = ?) as depenses
     FROM communes co WHERE co.actif = 1 ORDER BY co.nom ASC`
  ).bind(annee, String(annee)).all()

  const { results: dernieresOperations } = await c.env.DB.prepare(
    `SELECT 'paiement' as source, p.id, p.montant, p.type, p.created_at, co.nom as commune_nom, m.nom as membre_nom, m.prenom as membre_prenom
     FROM paiements p JOIN communes co ON co.id = p.commune_id JOIN membres m ON m.id = p.membre_id
     ORDER BY p.created_at DESC LIMIT 15`
  ).all()

  return c.json({ globalStats, parCommune, dernieresOperations, annee })
})

// Vue d'ensemble pour un comptable communal
dashboard.get('/commune', authRequired, requireRole('comptable', 'secretaire'), async (c) => {
  const user = currentUser(c)
  const communeId = user.role === 'comptable' ? user.commune_id : c.req.query('commune_id')
  if (!communeId) return c.json({ error: 'commune_id requis' }, 400)

  const annee = new Date().getFullYear()

  const stats = await c.env.DB.prepare(
    `SELECT
      (SELECT COUNT(*) FROM membres WHERE commune_id = ? AND statut='actif') as total_membres,
      (SELECT COUNT(*) FROM membres m WHERE m.commune_id = ? AND m.statut='actif'
        AND NOT EXISTS (SELECT 1 FROM paiements p WHERE p.membre_id = m.id AND p.type='cotisation' AND p.periode_annee = ? AND p.statut='valide')
      ) as membres_en_retard,
      (SELECT COALESCE(SUM(montant),0) FROM paiements WHERE commune_id = ? AND statut='valide' AND periode_annee = ?) as total_recettes_annee,
      (SELECT COALESCE(SUM(montant),0) FROM depenses WHERE commune_id = ? AND statut='valide' AND strftime('%Y', date_depense) = ?) as total_depenses_annee
    `
  ).bind(communeId, communeId, annee, communeId, annee, communeId, String(annee)).first()

  const { results: dernieresOperations } = await c.env.DB.prepare(
    `SELECT p.*, m.nom as membre_nom, m.prenom as membre_prenom
     FROM paiements p JOIN membres m ON m.id = p.membre_id
     WHERE p.commune_id = ? ORDER BY p.created_at DESC LIMIT 15`
  ).bind(communeId).all()

  return c.json({ stats, dernieresOperations, annee })
})

// Espace membre : mes infos, mon statut, mon historique
dashboard.get('/membre', authRequired, requireRole('membre'), async (c) => {
  const user = currentUser(c)
  const membre = await c.env.DB.prepare('SELECT * FROM membres WHERE user_id = ?').bind(user.sub).first<any>()
  if (!membre) return c.json({ error: 'Fiche membre introuvable' }, 404)

  const annee = new Date().getFullYear()
  const cotisationAnnee = await c.env.DB.prepare(
    `SELECT * FROM paiements WHERE membre_id = ? AND type='cotisation' AND periode_annee = ? AND statut='valide'`
  ).bind(membre.id, annee).first()

  const { results: historique } = await c.env.DB.prepare(
    'SELECT * FROM paiements WHERE membre_id = ? ORDER BY date_paiement DESC'
  ).bind(membre.id).all()

  return c.json({
    membre,
    statut_cotisation: cotisationAnnee ? 'a_jour' : 'en_retard',
    annee,
    historique
  })
})

export default dashboard
