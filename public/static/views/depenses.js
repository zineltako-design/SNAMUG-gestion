import { apiErrorMessage } from '../api.js'
import { formatMoney, formatDate, toast, openModal, closeModal, badgeStatutPaiement, escapeHtml } from '../utils.js'
import { listDepenses, createDepense } from '../offline/offline-api.js'
import { isOnline } from '../offline/connectivity.js'

export async function renderDepenses() {
  const { depenses, source } = await listDepenses()

  setTimeout(() => attachHandlers(), 0)

  return `
    <div class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h1 class="text-2xl font-bold text-gray-800">Dépenses locales</h1>
        <button id="btn-new-depense" class="btn-danger rounded-lg px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
          <i class="fas fa-plus"></i> Nouvelle dépense
        </button>
      </div>

      ${source === 'cache' ? `<div class="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2"><i class="fas fa-database mr-1"></i>Données locales (hors-ligne) — la liste sera actualisée au retour du réseau.</div>` : ''}

      <div class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500 border-b bg-gray-50">
              <th class="py-3 px-4">Date</th>
              <th class="py-3 px-4">Libellé</th>
              <th class="py-3 px-4">Catégorie</th>
              <th class="py-3 px-4">Montant</th>
              <th class="py-3 px-4">Justificatif</th>
              <th class="py-3 px-4">Statut</th>
            </tr>
          </thead>
          <tbody>
            ${depenses.map(d => rowHtml(d)).join('') || `<tr><td colspan="6" class="py-6 text-center text-gray-400">Aucune dépense enregistrée</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `
}

function rowHtml(d) {
  const isPending = !!d._pending
  return `
    <tr class="border-b last:border-0 hover:bg-gray-50 ${isPending ? 'row-pending' : ''}">
      <td class="py-2 px-4">${formatDate(d.date_depense)}</td>
      <td class="py-2 px-4 font-medium">${escapeHtml(d.libelle)} ${isPending ? '<i class="fas fa-clock ml-1 text-yellow-600" title="En attente de synchronisation"></i>' : ''}</td>
      <td class="py-2 px-4">${escapeHtml(d.categorie) || '-'}</td>
      <td class="py-2 px-4 font-medium text-red-700">${formatMoney(d.montant)}</td>
      <td class="py-2 px-4">${d.justificatif_url ? `<a href="${d.justificatif_url}" target="_blank" class="text-blue-600 hover:underline"><i class="fas fa-image"></i> Voir</a>` : '-'}</td>
      <td class="py-2 px-4">${isPending ? '<span class="badge-attente px-2 py-1 rounded text-xs font-semibold">En attente sync.</span>' : badgeStatutPaiement(d.statut)}</td>
    </tr>
  `
}

function attachHandlers() {
  document.getElementById('btn-new-depense')?.addEventListener('click', openNewDepenseModal)
}

function openNewDepenseModal() {
  const offlineNotice = !isOnline()
    ? `<div class="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3"><i class="fas fa-exclamation-triangle mr-1"></i>Mode hors-ligne : la dépense (et sa photo) sera enregistrée localement puis synchronisée automatiquement dès le retour du réseau.</div>`
    : ''

  openModal(`
    <div class="p-6">
      <h2 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-receipt mr-2 text-red-600"></i>Nouvelle dépense</h2>
      ${offlineNotice}
      <form id="form-new-depense" class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Libellé *</label>
          <input required name="libelle" class="w-full border rounded-lg px-3 py-2" placeholder="ex: Achat fournitures bureau" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select name="categorie" class="w-full border rounded-lg px-3 py-2">
              <option value="Fournitures">Fournitures</option>
              <option value="Transport">Transport</option>
              <option value="Communication">Communication</option>
              <option value="Restauration">Restauration</option>
              <option value="Logistique">Logistique</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Montant (GNF) *</label>
            <input required type="number" name="montant" min="0" step="500" class="w-full border rounded-lg px-3 py-2" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Date de la dépense</label>
          <input type="date" name="date_depense" value="${new Date().toISOString().slice(0, 10)}" class="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Pièce justificative (photo)</label>
          <input type="file" id="justificatif-file" accept="image/*" class="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
          <textarea name="commentaire" class="w-full border rounded-lg px-3 py-2" rows="2"></textarea>
        </div>
        <div id="new-depense-error" class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"></div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" id="btn-cancel-depense" class="px-4 py-2 rounded-lg border text-gray-600">Annuler</button>
          <button type="submit" id="btn-submit-depense" class="btn-danger px-4 py-2 rounded-lg font-semibold">Enregistrer la dépense</button>
        </div>
      </form>
    </div>
  `)

  document.getElementById('btn-cancel-depense').addEventListener('click', closeModal)
  document.getElementById('form-new-depense').addEventListener('submit', async (e) => {
    e.preventDefault()
    const form = e.target
    const submitBtn = document.getElementById('btn-submit-depense')
    submitBtn.disabled = true
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...'

    try {
      const fileInput = document.getElementById('justificatif-file')
      const fileBlob = fileInput.files[0] || null

      const fd2 = new FormData(form)
      const payload = Object.fromEntries(fd2.entries())
      delete payload.justificatif_url

      const result = await createDepense(payload, fileBlob)
      closeModal()
      if (result.offline) {
        toast('Dépense enregistrée localement (hors-ligne). Elle sera synchronisée automatiquement.', 'info')
      } else {
        toast('Dépense enregistrée avec succès', 'success')
      }
      renderDepenses().then(html => {
        document.getElementById('page-content').innerHTML = html
        attachHandlers()
      })
    } catch (err) {
      const errorBox = document.getElementById('new-depense-error')
      errorBox.textContent = apiErrorMessage(err)
      errorBox.classList.remove('hidden')
      submitBtn.disabled = false
      submitBtn.innerHTML = 'Enregistrer la dépense'
    }
  })
}
