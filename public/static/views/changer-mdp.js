import { API, apiErrorMessage } from '../api.js'
import { store } from '../store.js'
import { toast } from '../utils.js'

export async function renderChangerMdp(root) {
  const params = store.parametres || {}

  root.innerHTML = `
    <div class="min-h-screen snamug-gradient flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="card p-8">
          <h1 class="text-xl font-bold text-gray-800 mb-2 text-center"><i class="fas fa-key text-blue-600 mr-2"></i>Changement de mot de passe</h1>
          <p class="text-sm text-gray-500 text-center mb-6">Pour votre sécurité, veuillez définir un nouveau mot de passe.</p>
          <form id="form-changer-mdp" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
              <input type="password" name="nouveau_password" required minlength="6" class="w-full border rounded-lg px-4 py-2.5" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
              <input type="password" id="confirm-password" required minlength="6" class="w-full border rounded-lg px-4 py-2.5" />
            </div>
            <div id="changer-mdp-error" class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"></div>
            <button type="submit" class="w-full btn-primary rounded-lg py-2.5 font-semibold">Valider</button>
          </form>
        </div>
      </div>
    </div>
  `

  document.getElementById('form-changer-mdp').addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const nouveau = fd.get('nouveau_password')
    const confirm = document.getElementById('confirm-password').value
    const errorBox = document.getElementById('changer-mdp-error')

    if (nouveau !== confirm) {
      errorBox.textContent = 'Les mots de passe ne correspondent pas.'
      errorBox.classList.remove('hidden')
      return
    }

    try {
      await API.post('/auth/change-password', { nouveau_password: nouveau })
      toast('Mot de passe modifié avec succès', 'success')
      location.hash = '#/'
      location.reload()
    } catch (err) {
      errorBox.textContent = apiErrorMessage(err)
      errorBox.classList.remove('hidden')
    }
  })
}
