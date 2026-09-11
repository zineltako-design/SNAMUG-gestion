import { API, apiErrorMessage } from '../api.js'
import { store } from '../store.js'
import { formatMoney, formatDateTime, toast, openModal, closeModal, escapeHtml } from '../utils.js'

function badgeStatutExercice(statut) {
  return statut === 'cloture'
    ? '<span class="badge-bleu px-2 py-1 rounded text-xs font-semibold"><i class="fas fa-lock mr-1"></i>Clôturé</span>'
    : '<span class="badge-vert px-2 py-1 rounded text-xs font-semibold"><i class="fas fa-lock-open mr-1"></i>Ouvert</span>'
}

export async function renderCloture() {
  const { data } = await API.get('/exercices')
  const { exercices, annee_courante } = data

  setTimeout(() => attachHandlers(), 0)

  return `
    <div class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h1 class="text-2xl font-bold text-gray-800">Clôture annuelle & Archives</h1>
      </div>
      <p class="text-sm text-gray-500">Clôturez un exercice pour figer définitivement les totaux de l'année et générer une archive complète (paiements, dépenses, statistiques) consultable à tout moment. Les exports CSV (compatibles Excel) sont disponibles à tout moment, même sans clôture.</p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${exercices.map(ex => `
          <div class="card p-4 space-y-2">
            <div class="flex items-center justify-between">
              <div class="font-bold text-lg text-gray-800">Exercice ${ex.annee} ${ex.annee === annee_courante ? '<span class="text-xs text-blue-500 font-normal">(en cours)</span>' : ''}</div>
              ${badgeStatutExercice(ex.statut)}
            </div>
            <div class="grid grid-cols-2 gap-3 text-sm pt-1">
              <div>
                <div class="text-xs text-gray-500">Recettes</div>
                <div class="font-semibold text-green-700">${formatMoney(ex.total_recettes)}</div>
              </div>
              <div>
                <div class="text-xs text-gray-500">Dépenses</div>
                <div class="font-semibold text-red-700">${formatMoney(ex.total_depenses)}</div>
              </div>
            </div>
            ${ex.statut === 'cloture' ? `<div class="text-xs text-gray-400 pt-1 border-t">Clôturé le ${formatDateTime(ex.cloture_at)}</div>` : ''}
            <div class="flex flex-wrap gap-2 pt-2">
              <button class="text-xs px-3 py-1.5 rounded-lg border text-gray-600 btn-detail-exercice" data-annee="${ex.annee}"><i class="fas fa-chart-bar mr-1"></i> Détails</button>
              <a href="/api/exercices/${ex.annee}/export.csv?type=paiements" class="text-xs px-3 py-1.5 rounded-lg border text-gray-600 no-underline" target="_blank"><i class="fas fa-file-csv mr-1"></i> Export paiements</a>
              <a href="/api/exercices/${ex.annee}/export.csv?type=depenses" class="text-xs px-3 py-1.5 rounded-lg border text-gray-600 no-underline" target="_blank"><i class="fas fa-file-csv mr-1"></i> Export dépenses</a>
              ${ex.statut === 'cloture'
                ? (ex.archive_url ? `<a href="${ex.archive_url}" class="text-xs px-3 py-1.5 rounded-lg border text-blue-600 no-underline" target="_blank"><i class="fas fa-file-archive mr-1"></i> Archive JSON</a>
                   <button class="text-xs px-3 py-1.5 rounded-lg border text-yellow-700 btn-reopen" data-annee="${ex.annee}"><i class="fas fa-unlock mr-1"></i> Réouvrir</button>` : '')
                : `<button class="btn-danger text-xs px-3 py-1.5 rounded-lg font-semibold btn-cloturer" data-annee="${ex.annee}"><i class="fas fa-lock mr-1"></i> Clôturer l'exercice</button>`}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `
}

function attachHandlers() {
  document.querySelectorAll('.btn-detail-exercice').forEach(btn => {
    btn.addEventListener('click', () => openDetailExercice(btn.dataset.annee))
  })
  document.querySelectorAll('.btn-cloturer').forEach(btn => {
    btn.addEventListener('click', () => confirmCloture(btn.dataset.annee))
  })
  document.querySelectorAll('.btn-reopen').forEach(btn => {
    btn.addEventListener('click', () => confirmReouverture(btn.dataset.annee))
  })
}

async function openDetailExercice(annee) {
  const { data } = await API.get(`/exercices/${annee}`)
  const { stats } = data

  openModal(`
    <div class="p-6 max-w-2xl">
      <h2 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-chart-bar mr-2 text-blue-600"></i>Détails de l'exercice ${annee}</h2>
      <div class="grid grid-cols-3 gap-3 mb-4">
        <div class="card p-3 text-center">
          <div class="text-xs text-gray-500">Recettes</div>
          <div class="font-bold text-green-700">${formatMoney(stats.total_recettes)}</div>
        </div>
        <div class="card p-3 text-center">
          <div class="text-xs text-gray-500">Dépenses</div>
          <div class="font-bold text-red-700">${formatMoney(stats.total_depenses)}</div>
        </div>
        <div class="card p-3 text-center">
          <div class="text-xs text-gray-500">Solde</div>
          <div class="font-bold ${stats.solde >= 0 ? 'text-blue-700' : 'text-red-700'}">${formatMoney(stats.solde)}</div>
        </div>
      </div>
      <div class="text-sm text-gray-600 mb-3">${stats.membres_a_jour} membre(s) à jour de cotisation sur ${stats.total_membres_actifs} actifs — ${stats.nb_paiements} paiement(s), ${stats.nb_depenses} dépense(s) enregistrée(s).</div>
      <div class="overflow-x-auto max-h-80">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500 border-b bg-gray-50 sticky top-0">
              <th class="py-2 px-3">Commune</th>
              <th class="py-2 px-3">Recettes</th>
              <th class="py-2 px-3">Dépenses</th>
              <th class="py-2 px-3">Solde</th>
            </tr>
          </thead>
          <tbody>
            ${stats.parCommune.map(c => `
              <tr class="border-b last:border-0">
                <td class="py-2 px-3">${escapeHtml(c.nom)}</td>
                <td class="py-2 px-3 text-green-700">${formatMoney(c.recettes)}</td>
                <td class="py-2 px-3 text-red-700">${formatMoney(c.depenses)}</td>
                <td class="py-2 px-3 font-medium ${c.solde >= 0 ? 'text-blue-700' : 'text-red-700'}">${formatMoney(c.solde)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="flex justify-end pt-4">
        <button id="btn-close-detail" class="px-4 py-2 rounded-lg border text-gray-600">Fermer</button>
      </div>
    </div>
  `)
  document.getElementById('btn-close-detail').addEventListener('click', closeModal)
}

function confirmCloture(annee) {
  openModal(`
    <div class="p-6">
      <h2 class="text-lg font-bold text-gray-800 mb-3"><i class="fas fa-exclamation-triangle mr-2 text-yellow-600"></i>Clôturer l'exercice ${annee} ?</h2>
      <p class="text-sm text-gray-600 mb-4">Cette action va figer les totaux de recettes et dépenses de l'année ${annee} et générer une archive complète (paiements, dépenses, statistiques) sur le stockage sécurisé. L'exercice pourra être réouvert par le Secrétaire National en cas de correction exceptionnelle.</p>
      <div id="cloture-error" class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3"></div>
      <div class="flex justify-end gap-2">
        <button type="button" id="btn-cancel-cloture" class="px-4 py-2 rounded-lg border text-gray-600">Annuler</button>
        <button type="button" id="btn-confirm-cloture" class="btn-danger px-4 py-2 rounded-lg font-semibold"><i class="fas fa-lock mr-1"></i> Confirmer la clôture</button>
      </div>
    </div>
  `)
  document.getElementById('btn-cancel-cloture').addEventListener('click', closeModal)
  document.getElementById('btn-confirm-cloture').addEventListener('click', async (e) => {
    const btn = e.target
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clôture en cours...'
    try {
      await API.post(`/exercices/${annee}/cloturer`)
      closeModal()
      toast(`Exercice ${annee} clôturé avec succès`, 'success')
      renderCloture().then(html => {
        document.getElementById('page-content').innerHTML = html
        attachHandlers()
      })
    } catch (err) {
      const errorBox = document.getElementById('cloture-error')
      errorBox.textContent = apiErrorMessage(err)
      errorBox.classList.remove('hidden')
      btn.disabled = false
      btn.innerHTML = '<i class="fas fa-lock mr-1"></i> Confirmer la clôture'
    }
  })
}

function confirmReouverture(annee) {
  openModal(`
    <div class="p-6">
      <h2 class="text-lg font-bold text-gray-800 mb-3"><i class="fas fa-unlock mr-2 text-yellow-600"></i>Réouvrir l'exercice ${annee} ?</h2>
      <p class="text-sm text-gray-600 mb-4">À utiliser uniquement pour une correction exceptionnelle. L'archive déjà générée reste consultable ; une nouvelle clôture régénérera une archive à jour.</p>
      <div class="flex justify-end gap-2">
        <button type="button" id="btn-cancel-reopen" class="px-4 py-2 rounded-lg border text-gray-600">Annuler</button>
        <button type="button" id="btn-confirm-reopen" class="btn-primary px-4 py-2 rounded-lg font-semibold">Confirmer la réouverture</button>
      </div>
    </div>
  `)
  document.getElementById('btn-cancel-reopen').addEventListener('click', closeModal)
  document.getElementById('btn-confirm-reopen').addEventListener('click', async () => {
    try {
      await API.post(`/exercices/${annee}/reouvrir`)
      closeModal()
      toast(`Exercice ${annee} réouvert`, 'info')
      renderCloture().then(html => {
        document.getElementById('page-content').innerHTML = html
        attachHandlers()
      })
    } catch (err) {
      toast(apiErrorMessage(err), 'error')
    }
  })
}
