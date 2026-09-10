// Couche d'accès aux données "offline-first" pour Membres / Paiements / Dépenses.
// Stratégie : Network-first pour la lecture (avec mise en cache), Queue-first pour l'écriture
// quand hors-ligne (l'opération est stockée localement puis rejouée par sync.js).

import { API } from '../api.js'
import { store } from '../store.js'
import { isOnline } from './connectivity.js'
import {
  cacheGetAll, cacheSetAll, cachePut, queueAdd, fileAdd, STORES
} from './db.js'
import { syncNow } from './sync.js'

function tempId() {
  return 'tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

function notifyQueueChanged() {
  window.dispatchEvent(new Event('snamug-queue-changed'))
}

// ---------- MEMBRES ----------

export async function listMembres(params = {}) {
  if (isOnline()) {
    try {
      const { data } = await API.get('/membres', { params })
      // On ne met en cache que la liste complète (sans filtre) pour garder un cache cohérent
      if (!params.search) await cacheSetAll(STORES.MEMBRES, data.membres)
      return { membres: data.membres, source: 'network' }
    } catch (e) {
      // fallback cache si erreur réseau ponctuelle
    }
  }
  const cached = await cacheGetAll(STORES.MEMBRES)
  const filtered = params.search
    ? cached.filter((m) => (m.nom + ' ' + m.prenom + ' ' + m.numero_adhesion).toLowerCase().includes(params.search.toLowerCase()))
    : cached
  return { membres: filtered, source: 'cache' }
}

export async function createMembre(payload) {
  if (isOnline()) {
    try {
      const { data } = await API.post('/membres', payload)
      await cachePut(STORES.MEMBRES, { ...data.membre, statut_cotisation: 'en_retard' })
      return { ...data, offline: false }
    } catch (e) {
      if (e?.response) throw e // erreur métier (ex: validation) -> ne pas mettre en queue
      // erreur réseau (timeout/CORS) -> bascule offline
    }
  }

  // Mode hors-ligne : on stocke un membre "provisoire" dans le cache local + une entrée en file
  const tmp = tempId()
  const communeId = store.user.role === 'comptable' ? store.user.commune_id : payload.commune_id
  const communeNom = store.commune?.nom || ''
  const communeCode = store.commune?.code || 'TMP'
  const numeroProvisoire = `EN ATTENTE-${communeCode}-${tmp.slice(-4)}`

  const membreLocal = {
    id: tmp,
    numero_adhesion: numeroProvisoire,
    commune_id: communeId,
    commune_nom: communeNom,
    nom: payload.nom,
    prenom: payload.prenom,
    telephone: payload.telephone || null,
    email: payload.email || null,
    discipline: payload.discipline || null,
    date_adhesion: new Date().toISOString().slice(0, 10),
    statut: 'actif',
    statut_cotisation: 'en_retard',
    _pending: true
  }
  await cachePut(STORES.MEMBRES, membreLocal)

  await queueAdd({ type: 'membre', payload, tempId: tmp })
  notifyQueueChanged()

  return { membre: membreLocal, offline: true }
}

// ---------- PAIEMENTS ----------

export async function listPaiements(params = {}) {
  if (isOnline()) {
    try {
      const { data } = await API.get('/paiements', { params })
      if (Object.keys(params).length === 0) await cacheSetAll(STORES.PAIEMENTS, data.paiements)
      return { paiements: data.paiements, source: 'network' }
    } catch (e) { /* fallback */ }
  }
  const cached = await cacheGetAll(STORES.PAIEMENTS)
  return { paiements: cached, source: 'cache' }
}

export async function createPaiement(payload) {
  const isTempMembre = String(payload.membre_id).startsWith('tmp_')

  // Si le membre référencé est lui-même encore en attente de synchronisation,
  // on ne peut pas l'envoyer au serveur : on met le paiement en file, il sera
  // rejoué après résolution du vrai id du membre (voir sync.js / resolveTempRefs).
  if (isOnline() && !isTempMembre) {
    try {
      const { data } = await API.post('/paiements', payload)
      await cachePut(STORES.PAIEMENTS, data.paiement)
      return { ...data, offline: false }
    } catch (e) {
      if (e?.response) throw e
    }
  }

  const tmp = tempId()
  const paiementLocal = {
    id: tmp,
    numero_recu: 'EN ATTENTE-' + tmp.slice(-6),
    membre_id: payload.membre_id,
    membre_nom: payload.membre_nom || '',
    membre_prenom: payload.membre_prenom || '',
    type: payload.type,
    montant: Number(payload.montant),
    mode_paiement: payload.mode_paiement,
    reference_paiement: payload.reference_paiement || null,
    periode_annee: payload.periode_annee,
    date_paiement: payload.date_paiement || new Date().toISOString().slice(0, 10),
    statut: 'valide',
    created_at: new Date().toISOString(),
    _pending: true
  }
  await cachePut(STORES.PAIEMENTS, paiementLocal)

  await queueAdd({ type: 'paiement', payload, tempId: tmp })
  notifyQueueChanged()

  return { paiement: paiementLocal, offline: true, membreProvisoire: isTempMembre }
}

// ---------- DEPENSES ----------

export async function listDepenses(params = {}) {
  if (isOnline()) {
    try {
      const { data } = await API.get('/depenses', { params })
      if (Object.keys(params).length === 0) await cacheSetAll(STORES.DEPENSES, data.depenses)
      return { depenses: data.depenses, source: 'network' }
    } catch (e) { /* fallback */ }
  }
  const cached = await cacheGetAll(STORES.DEPENSES)
  return { depenses: cached, source: 'cache' }
}

// fileBlob : File/Blob optionnel (photo justificative), uploadé immédiatement en ligne,
// ou stocké en local (IndexedDB) puis uploadé lors de la synchronisation.
export async function createDepense(payload, fileBlob) {
  if (isOnline()) {
    try {
      let justificatif_url = null
      if (fileBlob) {
        const fd = new FormData()
        fd.append('file', fileBlob, fileBlob.name || 'justificatif.jpg')
        fd.append('dossier', 'justificatifs')
        const { data: uploadData } = await API.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        justificatif_url = uploadData.url
      }
      const { data } = await API.post('/depenses', { ...payload, justificatif_url })
      await cachePut(STORES.DEPENSES, data.depense)
      return { ...data, offline: false }
    } catch (e) {
      if (e?.response) throw e
    }
  }

  const tmp = tempId()
  let fichierLocalId = null
  let previewUrl = null
  if (fileBlob) {
    fichierLocalId = await fileAdd(fileBlob, { nom: fileBlob.name })
    previewUrl = URL.createObjectURL(fileBlob)
  }

  const depenseLocal = {
    id: tmp,
    libelle: payload.libelle,
    categorie: payload.categorie || null,
    montant: Number(payload.montant),
    date_depense: payload.date_depense || new Date().toISOString().slice(0, 10),
    justificatif_url: previewUrl,
    statut: 'valide',
    created_at: new Date().toISOString(),
    _pending: true
  }
  await cachePut(STORES.DEPENSES, depenseLocal)

  await queueAdd({ type: 'depense', payload, tempId: tmp, fichierLocalId, dossierFichier: 'justificatifs' })
  notifyQueueChanged()

  return { depense: depenseLocal, offline: true }
}

export { syncNow }
