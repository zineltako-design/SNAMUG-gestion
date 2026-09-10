import { store, isLoggedIn, setParametres } from './store.js'
import { API } from './api.js'
import { renderLayout } from './layout.js'
import { renderLogin } from './views/login.js'
import { renderChangerMdp } from './views/changer-mdp.js'
import { renderDashboardNational, renderDashboardCommune, renderDashboardMembre } from './views/dashboard.js'
import { renderMembres } from './views/membres.js'
import { renderPaiements } from './views/paiements.js'
import { renderDepenses } from './views/depenses.js'
import { renderCommunes } from './views/communes.js'
import { renderComptables } from './views/comptables.js'
import { renderParametres } from './views/parametres.js'
import { initConnectivityMonitor, mountConnectivityBar } from './offline/connectivity.js'
import { startAutoSync, onSyncEvent } from './offline/sync.js'
import { toast } from './utils.js'

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // silencieux : l'app reste utilisable sans SW, juste sans cache hors-ligne complet
    })
  }
}

const root = document.getElementById('app')

async function loadParametresPublics() {
  try {
    const { data } = await API.get('/parametres')
    setParametres(data.parametres)
    applyTheme(data.parametres)
  } catch (e) { /* silencieux */ }
}

function applyTheme(params) {
  if (!params) return
  const rootStyle = document.documentElement.style
  if (params.couleur_primaire) rootStyle.setProperty('--snamug-bleu', params.couleur_primaire)
  if (params.couleur_secondaire) rootStyle.setProperty('--snamug-rouge', params.couleur_secondaire)
  if (params.couleur_accent1) rootStyle.setProperty('--snamug-jaune', params.couleur_accent1)
  if (params.couleur_accent2) rootStyle.setProperty('--snamug-vert', params.couleur_accent2)
}

async function router() {
  const hash = location.hash || '#/'

  if (!isLoggedIn()) {
    await renderLogin(root)
    return
  }

  applyTheme(store.parametres)

  if (hash === '#/changer-mdp') {
    await renderChangerMdp(root)
    return
  }

  if (store.user.doit_changer_mdp) {
    location.hash = '#/changer-mdp'
    await renderChangerMdp(root)
    return
  }

  let contentHtml = '<div class="flex justify-center py-20"><div class="spinner"></div></div>'
  const contentEl = renderLayout(root, hash, contentHtml)

  try {
    contentHtml = await resolveView(hash)
  } catch (err) {
    console.error(err)
    contentHtml = `<div class="card p-6 text-red-600"><i class="fas fa-exclamation-triangle mr-2"></i>Erreur de chargement de la page.</div>`
  }

  const currentContentEl = document.getElementById('page-content')
  if (currentContentEl) currentContentEl.innerHTML = contentHtml
  // Re-run handlers attached during render (views attach their own listeners via setTimeout)
}

async function resolveView(hash) {
  const role = store.user.role

  if (hash === '#/' || hash === '') {
    if (role === 'secretaire') return await renderDashboardNational()
    if (role === 'comptable') return await renderDashboardCommune()
    if (role === 'membre') return await renderDashboardMembre()
  }

  if (hash === '#/membres' && (role === 'comptable' || role === 'secretaire')) return await renderMembres()
  if (hash === '#/paiements' && (role === 'comptable' || role === 'secretaire')) return await renderPaiements()
  if (hash === '#/depenses' && (role === 'comptable' || role === 'secretaire')) return await renderDepenses()
  if (hash === '#/communes' && role === 'secretaire') return await renderCommunes()
  if (hash === '#/comptables' && role === 'secretaire') return await renderComptables()
  if (hash === '#/parametres' && role === 'secretaire') return await renderParametres()
  if (hash === '#/mes-paiements' && role === 'membre') return await renderDashboardMembre()

  return `<div class="card p-6 text-center text-gray-400"><i class="fas fa-map-signs text-3xl mb-2"></i><br/>Page introuvable</div>`
}

window.addEventListener('hashchange', router)
window.addEventListener('DOMContentLoaded', async () => {
  registerServiceWorker()
  initConnectivityMonitor()
  mountConnectivityBar()
  startAutoSync()

  let lastSyncSuccess = 0
  onSyncEvent((event) => {
    if (event.phase === 'end' && event.success > 0) {
      toast(`${event.success} opération(s) synchronisée(s) avec succès`, 'success')
      // Rafraîchit la vue courante pour remplacer les données provisoires par les définitives
      if (['#/membres', '#/paiements', '#/depenses', '#/'].includes(location.hash || '#/')) {
        router()
      }
    }
    if (event.phase === 'item-error') {
      toast(`Erreur de synchronisation : ${event.error}`, 'error')
    }
  })

  await loadParametresPublics()
  router()
})
