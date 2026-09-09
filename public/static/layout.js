import { store, clearAuth } from './store.js'
import { initialsAvatar } from './utils.js'

const MENUS = {
  secretaire: [
    { hash: '#/', icon: 'fa-chart-pie', label: 'Vue d\'ensemble' },
    { hash: '#/communes', icon: 'fa-map-marker-alt', label: 'Communes' },
    { hash: '#/membres', icon: 'fa-users', label: 'Membres' },
    { hash: '#/paiements', icon: 'fa-money-bill-wave', label: 'Paiements' },
    { hash: '#/depenses', icon: 'fa-receipt', label: 'Dépenses' },
    { hash: '#/comptables', icon: 'fa-user-tie', label: 'Comptables' },
    { hash: '#/parametres', icon: 'fa-cog', label: 'Paramètres' },
  ],
  comptable: [
    { hash: '#/', icon: 'fa-chart-pie', label: 'Vue d\'ensemble' },
    { hash: '#/membres', icon: 'fa-users', label: 'Membres' },
    { hash: '#/paiements', icon: 'fa-money-bill-wave', label: 'Paiements' },
    { hash: '#/depenses', icon: 'fa-receipt', label: 'Dépenses locales' },
  ],
  membre: [
    { hash: '#/', icon: 'fa-user-circle', label: 'Mon espace' },
    { hash: '#/mes-paiements', icon: 'fa-history', label: 'Mes paiements' },
  ]
}

const ROLE_LABEL = { secretaire: 'Secrétaire Comptable National', comptable: 'Comptable Communal', membre: 'Membre' }

export function renderLayout(root, currentHash, contentHtml) {
  const role = store.user?.role
  const menu = MENUS[role] || []
  const params = store.parametres || {}

  const logoHtml = params.app_logo_url
    ? `<img src="${params.app_logo_url}" class="w-9 h-9 rounded-full object-cover bg-white" />`
    : `<div class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold" style="background:var(--snamug-jaune); color:var(--snamug-bleu);"><i class="fas fa-music"></i></div>`

  root.innerHTML = `
    <div class="min-h-screen flex bg-gray-50">
      <!-- Sidebar -->
      <aside id="sidebar" class="fixed lg:static inset-y-0 left-0 w-64 snamug-gradient text-white flex flex-col z-40 transform -translate-x-full lg:translate-x-0 transition-transform">
        <div class="p-5 flex items-center gap-3 border-b border-white/10">
          ${logoHtml}
          <div>
            <div class="font-bold leading-tight">${params.app_nom || 'SNAMUG GESTION'}</div>
            <div class="text-xs text-white/60">${ROLE_LABEL[role] || ''}</div>
          </div>
        </div>
        <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
          ${menu.map(m => `
            <a href="${m.hash}" class="sidebar-link ${currentHash === m.hash || (currentHash === '' && m.hash === '#/') ? 'active' : ''}">
              <i class="fas ${m.icon} w-5"></i> <span>${m.label}</span>
            </a>
          `).join('')}
        </nav>
        <div class="p-3 border-t border-white/10">
          <div class="flex items-center gap-3 px-2 py-2">
            <div class="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold">
              ${initialsAvatar(store.user?.nom, store.user?.prenom)}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">${store.user?.prenom} ${store.user?.nom}</div>
              <div class="text-xs text-white/60 truncate">${store.commune?.nom || 'National'}</div>
            </div>
          </div>
          <button id="btn-logout" class="sidebar-link w-full mt-1 text-left">
            <i class="fas fa-sign-out-alt w-5"></i> Déconnexion
          </button>
        </div>
      </aside>
      <div id="sidebar-overlay" class="hidden lg:hidden fixed inset-0 bg-black/40 z-30"></div>

      <!-- Main -->
      <div class="flex-1 flex flex-col min-w-0">
        <header class="bg-white border-b px-4 py-3 flex items-center justify-between lg:hidden">
          <button id="btn-open-sidebar" class="text-gray-600"><i class="fas fa-bars text-xl"></i></button>
          <div class="font-bold text-gray-800">${params.app_nom || 'SNAMUG GESTION'}</div>
          <div class="w-6"></div>
        </header>
        <main class="flex-1 p-4 lg:p-6 overflow-y-auto">
          <div id="page-content">${contentHtml}</div>
        </main>
      </div>
    </div>
  `

  document.getElementById('btn-logout').addEventListener('click', () => {
    clearAuth()
    location.hash = '#/login'
    location.reload()
  })

  const sidebar = document.getElementById('sidebar')
  const overlay = document.getElementById('sidebar-overlay')
  const openBtn = document.getElementById('btn-open-sidebar')
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      sidebar.classList.remove('-translate-x-full')
      overlay.classList.remove('hidden')
    })
    overlay.addEventListener('click', () => {
      sidebar.classList.add('-translate-x-full')
      overlay.classList.add('hidden')
    })
  }

  return document.getElementById('page-content')
}
