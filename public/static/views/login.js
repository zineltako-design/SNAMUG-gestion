import { API, apiErrorMessage } from '../api.js'
import { store, setAuth, setParametres } from '../store.js'
import { toast } from '../utils.js'

export async function renderLogin(root) {
  // Charger les paramètres visuels (logo, couleurs, nom appli)
  let params = store.parametres
  try {
    const { data } = await API.get('/parametres')
    params = data.parametres
    setParametres(params)
  } catch (e) { /* silencieux : fallback sur défauts */ }

  const logoHtml = params.app_logo_url
    ? `<img src="${params.app_logo_url}" alt="Logo SNAMUG" class="w-20 h-20 object-contain mx-auto mb-3 rounded-full bg-white p-1 shadow" />`
    : `<div class="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-3xl font-bold shadow" style="background: var(--snamug-bleu);"><i class="fas fa-music"></i></div>`

  root.innerHTML = `
    <div class="min-h-screen snamug-gradient flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="card p-8">
          <div class="text-center mb-6">
            ${logoHtml}
            <h1 class="text-2xl font-bold text-gray-800">${params.app_nom || 'SNAMUG GESTION'}</h1>
            <p class="text-sm text-gray-500 mt-1">Syndicat National des Artistes et Musiciens de Guinée</p>
          </div>
          <div class="snamug-accent-bar rounded mb-6"></div>

          <form id="login-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email ou téléphone</label>
              <input type="text" id="login-identifiant" required
                class="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="ex: 620000000 ou email@exemple.com" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input type="password" id="login-password" required
                class="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="••••••••" />
            </div>
            <div id="login-error" class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"></div>
            <button type="submit" id="login-submit"
              class="w-full btn-primary rounded-lg py-2.5 font-semibold flex items-center justify-center gap-2">
              <i class="fas fa-sign-in-alt"></i> Se connecter
            </button>
          </form>

          <p class="text-xs text-gray-400 text-center mt-6">
            © ${new Date().getFullYear()} SNAMUG GESTION — Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  `

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const identifiant = document.getElementById('login-identifiant').value.trim()
    const password = document.getElementById('login-password').value
    const errorBox = document.getElementById('login-error')
    const submitBtn = document.getElementById('login-submit')
    errorBox.classList.add('hidden')
    submitBtn.disabled = true
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...'

    try {
      const { data } = await API.post('/auth/login', { identifiant, password })
      setAuth(data)
      toast(`Bienvenue, ${data.user.prenom} !`, 'success')
      location.hash = data.user.doit_changer_mdp ? '#/changer-mdp' : '#/'
      location.reload()
    } catch (err) {
      errorBox.textContent = apiErrorMessage(err)
      errorBox.classList.remove('hidden')
      submitBtn.disabled = false
      submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter'
    }
  })
}
