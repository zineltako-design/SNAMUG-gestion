import { API, apiErrorMessage } from '../api.js'
import { store } from '../store.js'
import { formatDate, toast, openModal, closeModal, badgeStatutCotisation, escapeHtml } from '../utils.js'

let communesCache = null

async function getCommunes() {
  if (!communesCache) {
    const { data } = await API.get('/communes')
    communesCache = data.communes
  }
  return communesCache
}

export async function renderMembres() {
  const { data } = await API.get('/membres')
  const membres = data.membres
  const isNational = store.user.role === 'secretaire'

  setTimeout(() => attachHandlers(), 0)

  return `
    <div class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h1 class="text-2xl font-bold text-gray-800">Membres syndiqués</h1>
        <button id="btn-new-membre" class="btn-primary rounded-lg px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
          <i class="fas fa-user-plus"></i> Nouvelle adhésion
        </button>
      </div>

      <div class="card p-3">
        <input type="text" id="search-membre" placeholder="Rechercher par nom, prénom ou numéro d'adhésion..."
          class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
      </div>

      <div class="card overflow-x-auto">
        <table class="w-full text-sm" id="membres-table">
          <thead>
            <tr class="text-left text-gray-500 border-b bg-gray-50">
              <th class="py-3 px-4">N° Adhésion</th>
              <th class="py-3 px-4">Nom & Prénom</th>
              ${isNational ? '<th class="py-3 px-4">Commune</th>' : ''}
              <th class="py-3 px-4">Téléphone</th>
              <th class="py-3 px-4">Discipline</th>
              <th class="py-3 px-4">Adhésion</th>
              <th class="py-3 px-4">Statut cotisation</th>
              <th class="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            ${membres.map(m => rowHtml(m, isNational)).join('') || `<tr><td colspan="8" class="py-6 text-center text-gray-400">Aucun membre inscrit</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `
}

function rowHtml(m, isNational) {
  return `
    <tr class="border-b last:border-0 hover:bg-gray-50 membre-row" data-nom="${escapeHtml((m.nom + ' ' + m.prenom + ' ' + m.numero_adhesion).toLowerCase())}">
      <td class="py-2 px-4 font-mono text-xs text-blue-700">${m.numero_adhesion}</td>
      <td class="py-2 px-4 font-medium">${escapeHtml(m.prenom)} ${escapeHtml(m.nom)}</td>
      ${isNational ? `<td class="py-2 px-4">${escapeHtml(m.commune_nom)}</td>` : ''}
      <td class="py-2 px-4">${escapeHtml(m.telephone) || '-'}</td>
      <td class="py-2 px-4">${escapeHtml(m.discipline) || '-'}</td>
      <td class="py-2 px-4">${formatDate(m.date_adhesion)}</td>
      <td class="py-2 px-4">${badgeStatutCotisation(m.statut_cotisation)}</td>
      <td class="py-2 px-4">
        <button class="text-blue-600 hover:underline text-xs btn-view-membre" data-id="${m.id}">Voir <i class="fas fa-chevron-right"></i></button>
      </td>
    </tr>
  `
}

function attachHandlers() {
  const searchInput = document.getElementById('search-membre')
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase()
      document.querySelectorAll('.membre-row').forEach(row => {
        row.style.display = row.dataset.nom.includes(q) ? '' : 'none'
      })
    })
  }

  document.getElementById('btn-new-membre')?.addEventListener('click', openNewMembreModal)

  document.querySelectorAll('.btn-view-membre').forEach(btn => {
    btn.addEventListener('click', () => openMembreDetail(btn.dataset.id))
  })
}

async function openNewMembreModal() {
  const isNational = store.user.role === 'secretaire'
  let communesOptions = ''
  if (isNational) {
    const communes = await getCommunes()
    communesOptions = communes.filter(c => c.actif).map(c => `<option value="${c.id}">${c.nom}</option>`).join('')
  }

  const overlay = openModal(`
    <div class="p-6">
      <h2 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-user-plus mr-2 text-blue-600"></i>Nouvelle adhésion</h2>
      <form id="form-new-membre" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
            <input required name="prenom" class="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input required name="nom" class="w-full border rounded-lg px-3 py-2" />
          </div>
        </div>
        ${isNational ? `
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Commune *</label>
          <select required name="commune_id" class="w-full border rounded-lg px-3 py-2">
            <option value="">-- Choisir --</option>
            ${communesOptions}
          </select>
        </div>` : ''}
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input name="telephone" class="w-full border rounded-lg px-3 py-2" placeholder="620000000" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" class="w-full border rounded-lg px-3 py-2" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
            <select name="sexe" class="w-full border rounded-lg px-3 py-2">
              <option value="">-</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
            <input type="date" name="date_naissance" class="w-full border rounded-lg px-3 py-2" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Discipline artistique</label>
          <input name="discipline" class="w-full border rounded-lg px-3 py-2" placeholder="ex: Musicien, Chanteur, DJ, Comédien..." />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
          <input name="adresse" class="w-full border rounded-lg px-3 py-2" />
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="creer_compte" checked class="rounded" />
          Créer un compte d'accès mobile pour ce membre (nécessite téléphone ou email)
        </label>
        <div id="new-membre-error" class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"></div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" id="btn-cancel-membre" class="px-4 py-2 rounded-lg border text-gray-600">Annuler</button>
          <button type="submit" class="btn-primary px-4 py-2 rounded-lg font-semibold">Enregistrer l'adhésion</button>
        </div>
      </form>
    </div>
  `)

  document.getElementById('btn-cancel-membre').addEventListener('click', closeModal)
  document.getElementById('form-new-membre').addEventListener('submit', async (e) => {
    e.preventDefault()
    const form = e.target
    const fd = new FormData(form)
    const payload = Object.fromEntries(fd.entries())
    payload.creer_compte = fd.get('creer_compte') === 'on'

    try {
      const { data } = await API.post('/membres', payload)
      closeModal()
      toast(`Membre inscrit : ${data.membre.numero_adhesion}`, 'success')
      if (data.mot_de_passe_genere) {
        toast(`Mot de passe généré pour l'accès mobile : ${data.mot_de_passe_genere}`, 'info')
      }
      renderMembres().then(html => {
        document.getElementById('page-content').innerHTML = html
        attachHandlers()
      })
    } catch (err) {
      const errorBox = document.getElementById('new-membre-error')
      errorBox.textContent = apiErrorMessage(err)
      errorBox.classList.remove('hidden')
    }
  })
}

async function openMembreDetail(id) {
  const { data } = await API.get(`/membres/${id}`)
  const m = data.membre
  const historique = data.historique

  openModal(`
    <div class="p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-gray-800">${escapeHtml(m.prenom)} ${escapeHtml(m.nom)}</h2>
        ${badgeStatutCotisation(m.statut_cotisation)}
      </div>
      <div class="grid grid-cols-2 gap-2 text-sm mb-4">
        <div><span class="text-gray-500">N° Adhésion :</span> <span class="font-mono">${m.numero_adhesion}</span></div>
        <div><span class="text-gray-500">Commune :</span> ${escapeHtml(m.commune_nom)}</div>
        <div><span class="text-gray-500">Téléphone :</span> ${escapeHtml(m.telephone) || '-'}</div>
        <div><span class="text-gray-500">Email :</span> ${escapeHtml(m.email) || '-'}</div>
        <div><span class="text-gray-500">Discipline :</span> ${escapeHtml(m.discipline) || '-'}</div>
        <div><span class="text-gray-500">Adhésion :</span> ${formatDate(m.date_adhesion)}</div>
      </div>
      <h3 class="font-semibold text-gray-700 mb-2 text-sm">Historique des paiements</h3>
      <div class="max-h-60 overflow-y-auto border rounded-lg">
        <table class="w-full text-xs">
          <tbody>
            ${historique.map(p => `
              <tr class="border-b last:border-0">
                <td class="py-2 px-3">${p.date_paiement}</td>
                <td class="py-2 px-3">${p.type}</td>
                <td class="py-2 px-3 font-medium">${Number(p.montant).toLocaleString('fr-FR')} GNF</td>
                <td class="py-2 px-3 font-mono text-blue-600">${p.numero_recu}</td>
              </tr>
            `).join('') || '<tr><td class="py-3 px-3 text-center text-gray-400">Aucun paiement</td></tr>'}
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
