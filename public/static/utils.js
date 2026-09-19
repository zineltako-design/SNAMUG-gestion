// Utilitaires UI partagés

export function formatMoney(v) {
  const n = Number(v || 0)
  return n.toLocaleString('fr-FR') + ' GNF'
}

export function formatDate(d) {
  if (!d) return '-'
  return dayjs(d).format('DD/MM/YYYY')
}

export function formatDateTime(d) {
  if (!d) return '-'
  return dayjs(d).format('DD/MM/YYYY à HH:mm')
}

export function toast(message, type = 'info') {
  const colors = { info: '#0A3D91', success: '#009460', error: '#CE1126', warning: '#8a6d00' }
  const el = document.createElement('div')
  el.className = 'toast'
  el.style.background = colors[type] || colors.info
  el.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i>${message}`
  document.body.appendChild(el)
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s'
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 300)
  }, 3000)
}

export function openModal(html) {
  closeModal()
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.id = 'active-modal-overlay'
  overlay.innerHTML = `<div class="modal-box">${html}</div>`
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal()
  })
  document.body.appendChild(overlay)
  return overlay
}

export function closeModal() {
  const existing = document.getElementById('active-modal-overlay')
  if (existing) existing.remove()
}

export function badgeStatutCotisation(statut) {
  if (statut === 'a_jour') {
    return `<span class="badge-vert px-2 py-1 rounded text-xs font-semibold"><i class="fas fa-check-circle mr-1"></i>À jour</span>`
  }
  return `<span class="badge-rouge px-2 py-1 rounded text-xs font-semibold"><i class="fas fa-exclamation-triangle mr-1"></i>En retard</span>`
}

export function badgeStatutPaiement(statut) {
  const map = {
    valide: '<span class="badge-vert px-2 py-1 rounded text-xs font-semibold">Validé</span>',
    en_attente: '<span class="badge-jaune px-2 py-1 rounded text-xs font-semibold">En attente</span>',
    rejete: '<span class="badge-rouge px-2 py-1 rounded text-xs font-semibold">Rejeté</span>'
  }
  return map[statut] || statut
}

export function typeLabel(type) {
  return { adhesion: 'Adhésion', cotisation: 'Cotisation', don: 'Don' }[type] || type
}

export function modeLabel(mode) {
  return { especes: 'Espèces', orange_money: 'Orange Money' }[mode] || mode
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function initialsAvatar(nom, prenom) {
  const i1 = (prenom || '').charAt(0).toUpperCase()
  const i2 = (nom || '').charAt(0).toUpperCase()
  return i1 + i2
}

// Construit les <option>/<optgroup> d'un <select> de communes, regroupées par région.
// communes : tableau plat [{id, nom, code, region, actif, ...}, ...]
// selectedId : valeur pré-sélectionnée (optionnel)
export function communesOptgroupsHtml(communes, selectedId = '') {
  const actives = (communes || []).filter(c => c.actif)
  const parRegion = new Map()
  for (const c of actives) {
    const region = (c.region || 'Autre').trim() || 'Autre'
    if (!parRegion.has(region)) parRegion.set(region, [])
    parRegion.get(region).push(c)
  }
  const regions = Array.from(parRegion.keys()).sort((a, b) => a.localeCompare(b, 'fr'))

  const optionHtml = (c) => {
    const sel = String(c.id) === String(selectedId) ? 'selected' : ''
    return `<option value="${c.id}" ${sel}>${escapeHtml(c.nom)}${c.code ? ' (' + escapeHtml(c.code) + ')' : ''}</option>`
  }

  // Une seule région (ex: uniquement Conakry) : pas besoin de regrouper visuellement
  if (regions.length <= 1) {
    return actives
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
      .map(optionHtml)
      .join('')
  }

  return regions
    .map(region => {
      const communesRegion = parRegion.get(region).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
      return `<optgroup label="${escapeHtml(region)}">${communesRegion.map(optionHtml).join('')}</optgroup>`
    })
    .join('')
}
