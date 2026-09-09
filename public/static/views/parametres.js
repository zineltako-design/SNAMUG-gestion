import { API, apiErrorMessage } from '../api.js'
import { store, setParametres } from '../store.js'
import { toast } from '../utils.js'

export async function renderParametres() {
  const { data } = await API.get('/parametres')
  const params = data.parametres
  setParametres(params)

  const { data: tarifData } = await API.get('/parametres/tarifs/courant')
  const tarif = tarifData.tarif
  const anneeCourante = new Date().getFullYear()

  setTimeout(() => attachHandlers(), 0)

  return `
    <div class="space-y-6 max-w-3xl">
      <h1 class="text-2xl font-bold text-gray-800">Paramètres de l'application</h1>

      <div class="card p-5">
        <h2 class="font-bold text-gray-800 mb-4"><i class="fas fa-palette mr-2 text-gray-400"></i>Identité visuelle</h2>
        <form id="form-identite" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nom de l'application</label>
            <input name="app_nom" value="${params.app_nom || ''}" class="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Logo SNAMUG</label>
            <div class="flex items-center gap-4">
              ${params.app_logo_url ? `<img src="${params.app_logo_url}" class="w-16 h-16 object-contain border rounded-lg p-1" />` : '<div class="w-16 h-16 border rounded-lg flex items-center justify-center text-gray-300"><i class="fas fa-image text-2xl"></i></div>'}
              <input type="file" id="logo-file" accept="image/*" class="flex-1 border rounded-lg px-3 py-2" />
            </div>
            <p class="text-xs text-gray-400 mt-1">Vous pourrez ajouter le logo officiel manuellement à tout moment.</p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Couleur primaire (Bleu)</label>
              <input type="color" name="couleur_primaire" value="${params.couleur_primaire || '#0A3D91'}" class="w-full h-10 border rounded-lg" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Couleur secondaire (Rouge)</label>
              <input type="color" name="couleur_secondaire" value="${params.couleur_secondaire || '#CE1126'}" class="w-full h-10 border rounded-lg" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Accent 1 (Jaune)</label>
              <input type="color" name="couleur_accent1" value="${params.couleur_accent1 || '#FCD116'}" class="w-full h-10 border rounded-lg" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Accent 2 (Vert)</label>
              <input type="color" name="couleur_accent2" value="${params.couleur_accent2 || '#009460'}" class="w-full h-10 border rounded-lg" />
            </div>
          </div>
          <div id="identite-error" class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"></div>
          <button type="submit" class="btn-primary px-5 py-2.5 rounded-lg font-semibold">Enregistrer</button>
        </form>
      </div>

      <div class="card p-5">
        <h2 class="font-bold text-gray-800 mb-4"><i class="fas fa-coins mr-2 text-gray-400"></i>Tarifs de cotisation ${anneeCourante}</h2>
        <form id="form-tarifs" class="space-y-4">
          <input type="hidden" name="annee" value="${anneeCourante}" />
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Montant Adhésion (GNF)</label>
              <input type="number" name="montant_adhesion" value="${tarif?.montant_adhesion || 0}" class="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Cotisation Annuelle (GNF)</label>
              <input type="number" name="montant_cotisation_annuelle" value="${tarif?.montant_cotisation_annuelle || 0}" class="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <button type="submit" class="btn-primary px-5 py-2.5 rounded-lg font-semibold">Mettre à jour les tarifs</button>
        </form>
      </div>
    </div>
  `
}

function attachHandlers() {
  const logoFileInput = document.getElementById('logo-file')

  document.getElementById('form-identite').addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const payload = Object.fromEntries(fd.entries())

    try {
      if (logoFileInput.files[0]) {
        const uploadFd = new FormData()
        uploadFd.append('file', logoFileInput.files[0])
        uploadFd.append('dossier', 'logo')
        const { data: uploadData } = await API.post('/upload', uploadFd, { headers: { 'Content-Type': 'multipart/form-data' } })
        payload.app_logo_url = uploadData.url
      }
      const { data } = await API.put('/parametres', payload)
      setParametres(data.parametres)
      toast('Paramètres enregistrés. Rechargement...', 'success')
      setTimeout(() => location.reload(), 800)
    } catch (err) {
      const errorBox = document.getElementById('identite-error')
      errorBox.textContent = apiErrorMessage(err)
      errorBox.classList.remove('hidden')
    }
  })

  document.getElementById('form-tarifs').addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const payload = Object.fromEntries(fd.entries())
    try {
      await API.post('/parametres/tarifs', payload)
      toast('Tarifs mis à jour', 'success')
    } catch (err) {
      toast(apiErrorMessage(err), 'error')
    }
  })
}
