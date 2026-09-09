import { API, apiErrorMessage } from '../api.js'
import { formatDateTime, toast, openModal, closeModal, escapeHtml } from '../utils.js'

export async function renderComptables() {
  const { data } = await API.get('/users')
  const { data: communesData } = await API.get('/communes')
  const users = data.users
  const communes = communesData.communes

  setTimeout(() => attachHandlers(communes), 0)

  return `
    <div class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h1 class="text-2xl font-bold text-gray-800">Comptables & Secrétaires</h1>
        <button id="btn-new-user" class="btn-primary rounded-lg px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
          <i class="fas fa-user-plus"></i> Créer un compte
        </button>
      </div>

      <div class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500 border-b bg-gray-50">
              <th class="py-3 px-4">Nom</th>
              <th class="py-3 px-4">Rôle</th>
              <th class="py-3 px-4">Commune</th>
              <th class="py-3 px-4">Contact</th>
              <th class="py-3 px-4">Dernière connexion</th>
              <th class="py-3 px-4">Statut</th>
              <th class="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr class="border-b last:border-0 hover:bg-gray-50">
                <td class="py-2 px-4 font-medium">${escapeHtml(u.prenom)} ${escapeHtml(u.nom)}</td>
                <td class="py-2 px-4">${u.role === 'secretaire' ? '<span class="badge-bleu px-2 py-0.5 rounded text-xs">Secrétaire National</span>' : '<span class="badge-jaune px-2 py-0.5 rounded text-xs">Comptable</span>'}</td>
                <td class="py-2 px-4">${escapeHtml(u.commune_nom) || '-'}</td>
                <td class="py-2 px-4">${escapeHtml(u.telephone) || escapeHtml(u.email) || '-'}</td>
                <td class="py-2 px-4 text-gray-500">${u.derniere_connexion ? formatDateTime(u.derniere_connexion) : 'Jamais connecté'}</td>
                <td class="py-2 px-4">${u.actif ? '<span class="badge-vert px-2 py-0.5 rounded text-xs">Actif</span>' : '<span class="badge-rouge px-2 py-0.5 rounded text-xs">Désactivé</span>'}</td>
                <td class="py-2 px-4 flex gap-2">
                  <button class="text-orange-600 text-xs btn-reset-pwd" data-id="${u.id}" title="Réinitialiser mot de passe"><i class="fas fa-key"></i></button>
                  <button class="text-red-600 text-xs btn-toggle-actif" data-id="${u.id}" data-actif="${u.actif}" title="Activer/Désactiver"><i class="fas fa-power-off"></i></button>
                </td>
              </tr>
            `).join('') || `<tr><td colspan="7" class="py-6 text-center text-gray-400">Aucun compte</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `
}

function attachHandlers(communes) {
  document.getElementById('btn-new-user')?.addEventListener('click', () => openUserModal(communes))

  document.querySelectorAll('.btn-toggle-actif').forEach(btn => {
    btn.addEventListener('click', async () => {
      const actif = btn.dataset.actif === '1'
      await API.put(`/users/${btn.dataset.id}/statut`, { actif: !actif })
      toast(!actif ? 'Compte activé' : 'Compte désactivé', 'success')
      renderComptables().then(html => {
        document.getElementById('page-content').innerHTML = html
      })
    })
  })

  document.querySelectorAll('.btn-reset-pwd').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Réinitialiser le mot de passe de ce compte ?')) return
      const { data } = await API.post(`/users/${btn.dataset.id}/reset-password`)
      toast(`Nouveau mot de passe : ${data.mot_de_passe_genere}`, 'success')
    })
  })
}

function openUserModal(communes) {
  const communesOptions = communes.filter(c => c.actif).map(c => `<option value="${c.id}">${c.nom}</option>`).join('')

  openModal(`
    <div class="p-6">
      <h2 class="text-lg font-bold text-gray-800 mb-4"><i class="fas fa-user-plus mr-2 text-blue-600"></i>Créer un compte</h2>
      <form id="form-new-user" class="space-y-3">
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
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
          <select required name="role" id="user-role-select" class="w-full border rounded-lg px-3 py-2">
            <option value="comptable">Comptable Communal</option>
            <option value="secretaire">Secrétaire Comptable National</option>
          </select>
        </div>
        <div id="commune-field">
          <label class="block text-sm font-medium text-gray-700 mb-1">Commune *</label>
          <select name="commune_id" class="w-full border rounded-lg px-3 py-2">
            <option value="">-- Choisir --</option>
            ${communesOptions}
          </select>
        </div>
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
        <div id="new-user-error" class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"></div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" id="btn-cancel-user" class="px-4 py-2 rounded-lg border text-gray-600">Annuler</button>
          <button type="submit" class="btn-primary px-4 py-2 rounded-lg font-semibold">Créer le compte</button>
        </div>
      </form>
    </div>
  `)

  const roleSelect = document.getElementById('user-role-select')
  const communeField = document.getElementById('commune-field')
  roleSelect.addEventListener('change', () => {
    communeField.classList.toggle('hidden', roleSelect.value === 'secretaire')
  })

  document.getElementById('btn-cancel-user').addEventListener('click', closeModal)
  document.getElementById('form-new-user').addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const payload = Object.fromEntries(fd.entries())

    try {
      const { data } = await API.post('/users', payload)
      closeModal()
      toast(`Compte créé. Mot de passe temporaire : ${data.mot_de_passe_genere}`, 'success')
      renderComptables().then(html => {
        document.getElementById('page-content').innerHTML = html
      })
    } catch (err) {
      const errorBox = document.getElementById('new-user-error')
      errorBox.textContent = apiErrorMessage(err)
      errorBox.classList.remove('hidden')
    }
  })
}
