import { API, apiErrorMessage } from '../api.js'
import { toast, openModal, closeModal, escapeHtml } from '../utils.js'

export async function renderCommunes() {
  const { data } = await API.get('/communes')
  const communes = data.communes

  setTimeout(() => attachHandlers(), 0)

  // Regroupement par région pour lisibilité (Régions administratives de Guinée + Conakry)
  const parRegion = new Map()
  for (const c of communes) {
    const region = (c.region || 'Autre').trim() || 'Autre'
    if (!parRegion.has(region)) parRegion.set(region, [])
    parRegion.get(region).push(c)
  }
  const regions = Array.from(parRegion.keys()).sort((a, b) => a.localeCompare(b, 'fr'))

  const carteCommune = (c) => `
    <div class="card p-4 flex items-center justify-between">
      <div>
        <div class="font-bold text-gray-800">${escapeHtml(c.nom)}</div>
        <div class="text-xs text-gray-500">Code : ${escapeHtml(c.code)}</div>
        <span class="inline-block mt-1 text-xs px-2 py-0.5 rounded ${c.actif ? 'badge-vert' : 'badge-rouge'}">${c.actif ? 'Active' : 'Inactive'}</span>
      </div>
      <div class="flex gap-2">
        <button class="text-blue-600 btn-edit-commune" data-id="${c.id}" data-nom="${escapeHtml(c.nom)}" data-code="${escapeHtml(c.code)}" data-region="${escapeHtml(c.region || '')}" data-actif="${c.actif}">
          <i class="fas fa-edit"></i>
        </button>
      </div>
    </div>
  `

  return `
    <div class="space-y-4">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <h1 class="text-2xl font-bold text-gray-800">Gestion des communes</h1>
        <button id="btn-new-commune" class="btn-primary rounded-lg px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
          <i class="fas fa-plus"></i> Ajouter une commune
        </button>
      </div>
      <p class="text-sm text-gray-500">
        Configurez librement les communes (unités comptables) gérées par le SNAMUG — le découpage administratif
        complet de la Guinée (7 régions, ${communes.length} préfectures/communes) est préchargé, et vous pouvez en ajouter d'autres.
      </p>

      ${regions.map(region => `
        <section class="space-y-2">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <i class="fas fa-map-marked-alt text-blue-600"></i> Région ${escapeHtml(region)}
            <span class="text-xs font-normal text-gray-400">(${parRegion.get(region).length} commune${parRegion.get(region).length > 1 ? 's' : ''})</span>
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${parRegion.get(region).map(carteCommune).join('')}
          </div>
        </section>
      `).join('') || '<div class="text-gray-400 text-center py-6">Aucune commune configurée</div>'}
    </div>
  `
}

function attachHandlers() {
  document.getElementById('btn-new-commune')?.addEventListener('click', () => openCommuneModal())
  document.querySelectorAll('.btn-edit-commune').forEach(btn => {
    btn.addEventListener('click', () => openCommuneModal({
      id: btn.dataset.id, nom: btn.dataset.nom, code: btn.dataset.code, region: btn.dataset.region, actif: btn.dataset.actif === '1'
    }))
  })
}

function openCommuneModal(commune = null) {
  const isEdit = !!commune
  openModal(`
    <div class="p-6">
      <h2 class="text-lg font-bold text-gray-800 mb-4">${isEdit ? 'Modifier la commune' : 'Nouvelle commune'}</h2>
      <form id="form-commune" class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nom de la commune *</label>
          <input required name="nom" value="${commune?.nom || ''}" class="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Code (3 lettres) *</label>
          <input required name="code" maxlength="10" value="${commune?.code || ''}" class="w-full border rounded-lg px-3 py-2 uppercase" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Région</label>
          <input name="region" list="regions-guinee" value="${commune?.region || ''}" class="w-full border rounded-lg px-3 py-2" placeholder="ex: Kindia, Boké, Conakry..." />
          <datalist id="regions-guinee">
            <option value="Conakry"></option>
            <option value="Kindia"></option>
            <option value="Boké"></option>
            <option value="Mamou"></option>
            <option value="Labé"></option>
            <option value="Faranah"></option>
            <option value="Kankan"></option>
            <option value="N'Zérékoré"></option>
          </datalist>
        </div>
        ${isEdit ? `
        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="actif" ${commune.actif ? 'checked' : ''} class="rounded" /> Commune active
        </label>` : ''}
        <div id="commune-error" class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"></div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" id="btn-cancel-commune" class="px-4 py-2 rounded-lg border text-gray-600">Annuler</button>
          <button type="submit" class="btn-primary px-4 py-2 rounded-lg font-semibold">${isEdit ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </form>
    </div>
  `)

  document.getElementById('btn-cancel-commune').addEventListener('click', closeModal)
  document.getElementById('form-commune').addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const payload = Object.fromEntries(fd.entries())
    payload.actif = fd.get('actif') === 'on'

    try {
      if (isEdit) {
        await API.put(`/communes/${commune.id}`, payload)
      } else {
        await API.post('/communes', payload)
      }
      closeModal()
      toast(isEdit ? 'Commune mise à jour' : 'Commune créée', 'success')
      renderCommunes().then(html => {
        document.getElementById('page-content').innerHTML = html
        attachHandlers()
      })
    } catch (err) {
      const errorBox = document.getElementById('commune-error')
      errorBox.textContent = apiErrorMessage(err)
      errorBox.classList.remove('hidden')
    }
  })
}
