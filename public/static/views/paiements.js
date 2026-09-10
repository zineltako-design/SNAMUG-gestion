import { API, apiErrorMessage } from '../api.js'
import { store } from '../store.js'
import { formatMoney, formatDateTime, toast, openModal, closeModal, badgeStatutPaiement, typeLabel, modeLabel, escapeHtml } from '../utils.js'
import { listPaiements, createPaiement, listMembres } from '../offline/offline-api.js'
import { isOnline } from '../offline/connectivity.js'

export async function renderPaiements() {
  const { paiements, source } = await listPaiements()

  setTimeout(() => attachHandlers(), 0)

  return `
    <div class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h1 class="text-2xl font-bold text-gray-800">Paiements & Cotisations</h1>
        <button id="btn-new-paiement" class="btn-success rounded-lg px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
          <i class="fas fa-cash-register"></i> Enregistrer un paiement
        </button>
      </div>

      ${source === 'cache' ? `<div class="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2"><i class="fas fa-database mr-1"></i>Données locales (hors-ligne) — la liste sera actualisée au retour du réseau.</div>` : ''}

      <div class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500 border-b bg-gray-50">
              <th class="py-3 px-4">Reçu</th>
              <th class="py-3 px-4">Date</th>
              <th class="py-3 px-4">Membre</th>
              <th class="py-3 px-4">Type</th>
              <th class="py-3 px-4">Mode</th>
              <th class="py-3 px-4">Montant</th>
              <th class="py-3 px-4">Statut</th>
              <th class="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            ${paiements.map(p => rowHtml(p)).join('') || `<tr><td colspan="8" class="py-6 text-center text-gray-400">Aucun paiement enregistré</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `
}

function rowHtml(p) {
  const isPending = !!p._pending
  return `
    <tr class="border-b last:border-0 hover:bg-gray-50 ${isPending ? 'row-pending' : ''}">
      <td class="py-2 px-4 font-mono text-xs ${isPending ? 'text-yellow-700' : 'text-blue-700'}">${escapeHtml(p.numero_recu)} ${isPending ? '<i class="fas fa-clock ml-1" title="En attente de synchronisation"></i>' : ''}</td>
      <td class="py-2 px-4 text-gray-500">${formatDateTime(p.created_at)}</td>
      <td class="py-2 px-4">${escapeHtml(p.membre_prenom)} ${escapeHtml(p.membre_nom)}</td>
      <td class="py-2 px-4">${typeLabel(p.type)}</td>
      <td class="py-2 px-4">${modeLabel(p.mode_paiement)}</td>
      <td class="py-2 px-4 font-medium">${formatMoney(p.montant)}</td>
      <td class="py-2 px-4">${isPending ? '<span class="badge-attente px-2 py-1 rounded text-xs font-semibold">En attente sync.</span>' : badgeStatutPaiement(p.statut)}</td>
      <td class="py-2 px-4">${isPending
        ? '<span class="text-gray-400 text-xs">-</span>'
        : `<button class="text-blue-600 hover:underline text-xs btn-recu" data-id="${p.id}">Reçu <i class="fas fa-print"></i></button>`}</td>
    </tr>
  `
}

function attachHandlers() {
  document.getElementById('btn-new-paiement')?.addEventListener('click', openNewPaiementModal)
  document.querySelectorAll('.btn-recu').forEach(btn => {
    btn.addEventListener('click', () => imprimerRecu(btn.dataset.id))
  })
}

async function chercherMembres(query) {
  if (!query || query.length < 2) return []
  const { membres } = await listMembres({ search: query })
  return membres
}

async function openNewPaiementModal() {
  let tarif = null
  if (isOnline()) {
    try {
      const { data } = await API.get('/parametres/tarifs/courant')
      tarif = data.tarif
    } catch (e) { /* pas de tarif suggéré si indisponible */ }
  }

  const offlineNotice = !isOnline()
    ? `<div class="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3"><i class="fas fa-exclamation-triangle mr-1"></i>Mode hors-ligne : le paiement sera enregistré localement (reçu provisoire) et synchronisé automatiquement dès le retour du réseau.</div>`
    : ''

  openModal(`
    <div class="p-6">
      <h2 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-cash-register mr-2 text-green-600"></i>Enregistrer un paiement</h2>
      ${offlineNotice}
      <form id="form-new-paiement" class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Membre *</label>
          <input type="text" id="membre-search" placeholder="Rechercher un membre par nom..." class="w-full border rounded-lg px-3 py-2" autocomplete="off" />
          <div id="membre-results" class="border rounded-lg mt-1 max-h-40 overflow-y-auto hidden bg-white shadow"></div>
          <input type="hidden" name="membre_id" required />
          <input type="hidden" name="membre_nom" />
          <input type="hidden" name="membre_prenom" />
          <div id="membre-selected" class="mt-1 text-sm text-blue-700 font-medium"></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Type de paiement *</label>
            <select required name="type" id="paiement-type" class="w-full border rounded-lg px-3 py-2">
              <option value="cotisation">Cotisation annuelle</option>
              <option value="adhesion">Adhésion</option>
              <option value="don">Don</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Montant (GNF) *</label>
            <input required type="number" name="montant" id="paiement-montant" min="0" step="1000" class="w-full border rounded-lg px-3 py-2" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mode de paiement *</label>
            <select required name="mode_paiement" id="paiement-mode" class="w-full border rounded-lg px-3 py-2">
              <option value="especes">Espèces</option>
              <option value="orange_money">Orange Money</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date du paiement</label>
            <input type="date" name="date_paiement" value="${new Date().toISOString().slice(0, 10)}" class="w-full border rounded-lg px-3 py-2" />
          </div>
        </div>
        <div id="ref-om-field" class="hidden">
          <label class="block text-sm font-medium text-gray-700 mb-1">N° de transaction Orange Money *</label>
          <input name="reference_paiement" class="w-full border rounded-lg px-3 py-2" placeholder="ex: MP240915.1234.A56789" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
          <textarea name="commentaire" class="w-full border rounded-lg px-3 py-2" rows="2"></textarea>
        </div>
        <div id="new-paiement-error" class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"></div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" id="btn-cancel-paiement" class="px-4 py-2 rounded-lg border text-gray-600">Annuler</button>
          <button type="submit" class="btn-success px-4 py-2 rounded-lg font-semibold">Enregistrer & Générer le reçu</button>
        </div>
      </form>
    </div>
  `)

  const searchInput = document.getElementById('membre-search')
  const resultsBox = document.getElementById('membre-results')
  const hiddenMembreId = document.querySelector('input[name="membre_id"]')
  const hiddenMembreNom = document.querySelector('input[name="membre_nom"]')
  const hiddenMembrePrenom = document.querySelector('input[name="membre_prenom"]')
  const selectedBox = document.getElementById('membre-selected')

  let searchTimeout
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(async () => {
      const results = await chercherMembres(searchInput.value)
      if (results.length === 0) {
        resultsBox.classList.add('hidden')
        return
      }
      resultsBox.innerHTML = results.map(m => `
        <div class="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm membre-option" data-id="${m.id}" data-nom="${escapeHtml(m.prenom)} ${escapeHtml(m.nom)}" data-nomonly="${escapeHtml(m.nom)}" data-prenomonly="${escapeHtml(m.prenom)}">
          <div class="font-medium">${escapeHtml(m.prenom)} ${escapeHtml(m.nom)} ${m._pending ? '<span class="text-yellow-600 text-xs">(en attente sync.)</span>' : ''}</div>
          <div class="text-xs text-gray-500">${escapeHtml(m.numero_adhesion)}</div>
        </div>
      `).join('')
      resultsBox.classList.remove('hidden')
      resultsBox.querySelectorAll('.membre-option').forEach(opt => {
        opt.addEventListener('click', () => {
          hiddenMembreId.value = opt.dataset.id
          hiddenMembreNom.value = opt.dataset.nomonly
          hiddenMembrePrenom.value = opt.dataset.prenomonly
          selectedBox.textContent = `Sélectionné : ${opt.dataset.nom}`
          searchInput.value = opt.dataset.nom
          resultsBox.classList.add('hidden')
        })
      })
    }, 250)
  })

  const modeSelect = document.getElementById('paiement-mode')
  const refField = document.getElementById('ref-om-field')
  modeSelect.addEventListener('change', () => {
    refField.classList.toggle('hidden', modeSelect.value !== 'orange_money')
  })

  const typeSelect = document.getElementById('paiement-type')
  const montantInput = document.getElementById('paiement-montant')
  function updateMontantSuggestion() {
    if (!tarif) return
    if (typeSelect.value === 'cotisation') montantInput.value = tarif.montant_cotisation_annuelle
    else if (typeSelect.value === 'adhesion') montantInput.value = tarif.montant_adhesion
    else montantInput.value = ''
  }
  typeSelect.addEventListener('change', updateMontantSuggestion)
  updateMontantSuggestion()

  document.getElementById('btn-cancel-paiement').addEventListener('click', closeModal)
  document.getElementById('form-new-paiement').addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!hiddenMembreId.value) {
      const errorBox = document.getElementById('new-paiement-error')
      errorBox.textContent = 'Veuillez sélectionner un membre dans la liste.'
      errorBox.classList.remove('hidden')
      return
    }
    const fd = new FormData(e.target)
    const payload = Object.fromEntries(fd.entries())
    payload.periode_annee = new Date().getFullYear()

    try {
      const result = await createPaiement(payload)
      closeModal()
      if (result.offline) {
        toast(`Paiement enregistré localement (hors-ligne). Reçu définitif après synchronisation.`, 'info')
      } else {
        toast(`Paiement enregistré : ${result.paiement.numero_recu}`, 'success')
      }
      renderPaiements().then(html => {
        document.getElementById('page-content').innerHTML = html
        attachHandlers()
      })
      if (!result.offline) setTimeout(() => imprimerRecu(result.paiement.id), 300)
    } catch (err) {
      const errorBox = document.getElementById('new-paiement-error')
      errorBox.textContent = apiErrorMessage(err)
      errorBox.classList.remove('hidden')
    }
  })
}

async function imprimerRecu(id) {
  if (!isOnline() || String(id).startsWith('tmp_')) {
    toast('Le reçu définitif sera disponible après synchronisation.', 'warning')
    return
  }
  const { data } = await API.get(`/paiements/${id}`)
  const p = data.paiement
  const params = store.parametres || {}

  const win = window.open('', '_blank', 'width=500,height=700')
  win.document.write(`
    <html>
    <head>
      <title>Reçu ${p.numero_recu}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #1a1a1a; }
        .header { text-align: center; border-bottom: 3px solid #0A3D91; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { color: #0A3D91; font-size: 20px; margin: 0; }
        .bar { height: 4px; background: linear-gradient(90deg, #0A3D91 25%, #CE1126 25% 50%, #FCD116 50% 75%, #009460 75%); margin: 10px 0 20px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ddd; }
        .label { color: #666; }
        .value { font-weight: bold; }
        .montant { font-size: 24px; text-align: center; color: #009460; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #888; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${params.app_nom || 'SNAMUG GESTION'}</h1>
        <div>Reçu de paiement officiel</div>
      </div>
      <div class="bar"></div>
      <div class="row"><span class="label">N° Reçu</span><span class="value">${p.numero_recu}</span></div>
      <div class="row"><span class="label">Membre</span><span class="value">${p.membre_prenom} ${p.membre_nom}</span></div>
      <div class="row"><span class="label">N° Adhésion</span><span class="value">${p.numero_adhesion}</span></div>
      <div class="row"><span class="label">Commune</span><span class="value">${p.commune_nom}</span></div>
      <div class="row"><span class="label">Type</span><span class="value">${typeLabel(p.type)}</span></div>
      <div class="row"><span class="label">Mode de paiement</span><span class="value">${modeLabel(p.mode_paiement)}</span></div>
      ${p.reference_paiement ? `<div class="row"><span class="label">Référence</span><span class="value">${p.reference_paiement}</span></div>` : ''}
      <div class="row"><span class="label">Date</span><span class="value">${p.date_paiement}</span></div>
      <div class="montant">${Number(p.montant).toLocaleString('fr-FR')} GNF</div>
      <div class="footer">Document généré électroniquement — ${params.app_nom || 'SNAMUG GESTION'}<br/>Ce reçu fait foi de paiement.</div>
      <script>window.print();</script>
    </body>
    </html>
  `)
  win.document.close()
}
