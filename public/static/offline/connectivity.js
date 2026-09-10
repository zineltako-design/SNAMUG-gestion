// Détection de connectivité fiable + barre d'état visuelle

let online = navigator.onLine
const listeners = new Set()

export function isOnline() {
  return online
}

export function onConnectivityChange(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function setOnline(value) {
  if (online === value) return
  online = value
  listeners.forEach((cb) => {
    try { cb(online) } catch (e) { /* silencieux */ }
  })
}

// Vérification active : un ping léger sur /api/parametres (toujours accessible)
// car navigator.onLine peut rester "true" même sans accès réel à notre serveur.
async function checkRealConnectivity() {
  if (!navigator.onLine) {
    setOnline(false)
    return
  }
  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch('/api/parametres', { method: 'GET', signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(timeout)
    setOnline(res.ok)
  } catch (e) {
    setOnline(false)
  }
}

export function initConnectivityMonitor() {
  window.addEventListener('online', checkRealConnectivity)
  window.addEventListener('offline', () => setOnline(false))
  checkRealConnectivity()
  setInterval(checkRealConnectivity, 15000)
}

// --- Barre d'état visuelle (bandeau en haut de l'écran) ---

export function mountConnectivityBar() {
  const bar = document.createElement('div')
  bar.id = 'connectivity-bar'
  bar.className = 'connectivity-bar hidden'
  document.body.appendChild(bar)

  function render(pendingCount) {
    if (isOnline() && pendingCount === 0) {
      bar.classList.add('hidden')
      return
    }
    bar.classList.remove('hidden')
    if (!isOnline()) {
      bar.className = 'connectivity-bar bar-offline'
      bar.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i>Mode hors-ligne — vos saisies sont enregistrées localement${pendingCount > 0 ? ` (${pendingCount} en attente)` : ''}`
    } else if (pendingCount > 0) {
      bar.className = 'connectivity-bar bar-syncing'
      bar.innerHTML = `<i class="fas fa-sync-alt fa-spin mr-2"></i>Synchronisation en cours... (${pendingCount} en attente)`
    }
  }

  onConnectivityChange(() => refreshBar())
  window.addEventListener('snamug-queue-changed', () => refreshBar())

  async function refreshBar() {
    const { queueCount } = await import('./db.js')
    const count = await queueCount()
    render(count)
  }

  refreshBar()
  return { refresh: refreshBar }
}
