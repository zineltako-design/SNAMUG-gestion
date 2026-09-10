// Couche IndexedDB pour le mode hors-ligne SNAMUG GESTION
// Stocke : cache des listes (membres/paiements/depenses/communes/parametres),
// la file de synchronisation (queue), et les fichiers en attente d'upload (blobs).

const DB_NAME = 'snamug_offline_db'
const DB_VERSION = 1

const STORES = {
  MEMBRES: 'membres_cache',
  PAIEMENTS: 'paiements_cache',
  DEPENSES: 'depenses_cache',
  QUEUE: 'sync_queue',
  FILES: 'pending_files',
  META: 'meta'
}

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORES.MEMBRES)) {
        db.createObjectStore(STORES.MEMBRES, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.PAIEMENTS)) {
        db.createObjectStore(STORES.PAIEMENTS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.DEPENSES)) {
        db.createObjectStore(STORES.DEPENSES, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORES.QUEUE)) {
        const queueStore = db.createObjectStore(STORES.QUEUE, { keyPath: 'localId', autoIncrement: true })
        queueStore.createIndex('statut', 'statut')
      }
      if (!db.objectStoreNames.contains(STORES.FILES)) {
        db.createObjectStore(STORES.FILES, { keyPath: 'localId', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'cle' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx(storeName, mode = 'readonly') {
  return openDb().then((db) => db.transaction(storeName, mode).objectStore(storeName))
}

function promisifyRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// --- Cache générique de listes (membres / paiements / depenses) ---

export async function cacheSetAll(storeName, items) {
  const db = await openDb()
  const store = db.transaction(storeName, 'readwrite').objectStore(storeName)
  await Promise.all(items.map((item) => promisifyRequest(store.put(item))))
}

export async function cachePut(storeName, item) {
  const store = await tx(storeName, 'readwrite')
  return promisifyRequest(store.put(item))
}

export async function cacheGetAll(storeName) {
  const store = await tx(storeName)
  return promisifyRequest(store.getAll())
}

export async function cacheGet(storeName, id) {
  const store = await tx(storeName)
  return promisifyRequest(store.get(id))
}

export async function cacheDelete(storeName, id) {
  const store = await tx(storeName, 'readwrite')
  return promisifyRequest(store.delete(id))
}

// --- File de synchronisation (opérations créées hors-ligne) ---
// Chaque item : { localId, type: 'membre'|'paiement'|'depense', payload, tempId, statut: 'attente'|'erreur', erreur, created_at, fichierLocalId? }

export async function queueAdd(item) {
  const store = await tx(STORES.QUEUE, 'readwrite')
  return promisifyRequest(store.add({ ...item, statut: 'attente', created_at: new Date().toISOString() }))
}

export async function queueGetAll() {
  const store = await tx(STORES.QUEUE)
  const all = await promisifyRequest(store.getAll())
  return all.sort((a, b) => a.localId - b.localId)
}

export async function queueUpdate(localId, changes) {
  const store = await tx(STORES.QUEUE, 'readwrite')
  const item = await promisifyRequest(store.get(localId))
  if (!item) return
  await promisifyRequest(store.put({ ...item, ...changes }))
}

export async function queueRemove(localId) {
  const store = await tx(STORES.QUEUE, 'readwrite')
  return promisifyRequest(store.delete(localId))
}

export async function queueCount() {
  const all = await queueGetAll()
  return all.filter((i) => i.statut !== 'synchronise').length
}

// --- Fichiers en attente (photos justificatifs / membres) stockés en Blob ---

export async function fileAdd(blob, meta = {}) {
  const store = await tx(STORES.FILES, 'readwrite')
  return promisifyRequest(store.add({ blob, ...meta }))
}

export async function fileGet(localId) {
  const store = await tx(STORES.FILES)
  return promisifyRequest(store.get(localId))
}

export async function fileDelete(localId) {
  const store = await tx(STORES.FILES, 'readwrite')
  return promisifyRequest(store.delete(localId))
}

// --- Métadonnées diverses (ex: dernière sync) ---

export async function metaSet(cle, valeur) {
  const store = await tx(STORES.META, 'readwrite')
  return promisifyRequest(store.put({ cle, valeur }))
}

export async function metaGet(cle) {
  const store = await tx(STORES.META)
  const row = await promisifyRequest(store.get(cle))
  return row ? row.valeur : null
}

export { STORES }
