// Moteur de synchronisation SNAMUG GESTION
// Rejoue la file d'attente (queue) créée hors-ligne vers l'API dès que le réseau est disponible.
// Gère la résolution des identifiants temporaires (ex: un paiement créé hors-ligne pour un membre
// lui-même créé hors-ligne doit être rattaché au VRAI id du membre une fois celui-ci synchronisé).

import { API } from '../api.js'
import { queueGetAll, queueUpdate, queueRemove, fileGet, fileDelete, cachePut, metaSet } from './db.js'
import { isOnline } from './connectivity.js'

let syncing = false
const listeners = new Set()

export function onSyncEvent(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function emit(event) {
  listeners.forEach((cb) => {
    try { cb(event) } catch (e) { /* silencieux */ }
  })
}

// Remplace récursivement les références à un tempId par le vrai id dans un payload
function resolveTempRefs(payload, tempIdMap) {
  const resolved = { ...payload }
  for (const key of Object.keys(resolved)) {
    const val = resolved[key]
    if (typeof val === 'string' && val.startsWith('tmp_') && tempIdMap.has(val)) {
      resolved[key] = tempIdMap.get(val)
    }
  }
  return resolved
}

async function uploadPendingFile(fichierLocalId, dossier) {
  const fileEntry = await fileGet(fichierLocalId)
  if (!fileEntry) return null
  const fd = new FormData()
  fd.append('file', fileEntry.blob, fileEntry.nom || 'photo.jpg')
  fd.append('dossier', dossier || 'divers')
  const { data } = await API.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  await fileDelete(fichierLocalId)
  return data.url
}

async function processItem(item, tempIdMap) {
  let payload = resolveTempRefs(item.payload, tempIdMap)

  // Upload du fichier joint (justificatif dépense / photo membre) s'il existe
  if (item.fichierLocalId) {
    try {
      const url = await uploadPendingFile(item.fichierLocalId, item.dossierFichier)
      if (item.type === 'depense') payload.justificatif_url = url
      if (item.type === 'membre') payload.photo_url = url
    } catch (e) {
      throw new Error("Échec de l'envoi de la pièce jointe : " + (e?.response?.data?.error || e.message))
    }
  }

  let endpoint
  if (item.type === 'membre') endpoint = '/membres'
  else if (item.type === 'paiement') endpoint = '/paiements'
  else if (item.type === 'depense') endpoint = '/depenses'
  else throw new Error('Type d\'opération inconnu : ' + item.type)

  const { data } = await API.post(endpoint, payload)

  // Si un membre a été créé, on mémorise la correspondance tempId -> vrai id
  if (item.type === 'membre' && item.tempId && data.membre) {
    tempIdMap.set(item.tempId, data.membre.id)
    await cachePut('membres_cache', { ...data.membre, statut_cotisation: 'en_retard', _sync: 'ok' })
  }
  if (item.type === 'paiement' && data.paiement) {
    await cachePut('paiements_cache', { ...data.paiement, _sync: 'ok' })
  }
  if (item.type === 'depense' && data.depense) {
    await cachePut('depenses_cache', { ...data.depense, _sync: 'ok' })
  }

  return data
}

export async function syncNow() {
  if (syncing) return { skipped: true }
  if (!isOnline()) return { skipped: true, reason: 'offline' }

  syncing = true
  emit({ phase: 'start' })

  const tempIdMap = new Map()
  const all = await queueGetAll()
  const pending = all.filter((i) => i.statut === 'attente' || i.statut === 'erreur')

  let success = 0
  let failed = 0

  for (const item of pending) {
    try {
      await processItem(item, tempIdMap)
      await queueRemove(item.localId)
      success++
      emit({ phase: 'item-success', item })
    } catch (err) {
      failed++
      const message = err?.response?.data?.error || err.message || 'Erreur de synchronisation'
      await queueUpdate(item.localId, { statut: 'erreur', erreur: message })
      emit({ phase: 'item-error', item, error: message })
      // On continue avec les autres éléments (ne bloque pas toute la file)
    }
  }

  await metaSet('derniere_sync', new Date().toISOString())
  syncing = false
  emit({ phase: 'end', success, failed })
  return { success, failed }
}

export function isSyncing() {
  return syncing
}

// Déclenche une synchronisation automatique au retour du réseau + toutes les 30s si en attente
export function startAutoSync() {
  window.addEventListener('online', () => {
    setTimeout(() => syncNow(), 800)
  })

  setInterval(async () => {
    if (isOnline() && !syncing) {
      const all = await queueGetAll()
      const pending = all.filter((i) => i.statut === 'attente' || i.statut === 'erreur')
      if (pending.length > 0) syncNow()
    }
  }, 20000)

  // Tentative initiale au chargement
  if (isOnline()) setTimeout(() => syncNow(), 1000)
}
