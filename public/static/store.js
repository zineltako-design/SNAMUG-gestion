// État global simple (auth + paramètres app)

export const store = {
  token: localStorage.getItem('snamug_token') || null,
  user: JSON.parse(localStorage.getItem('snamug_user') || 'null'),
  membre: JSON.parse(localStorage.getItem('snamug_membre') || 'null'),
  commune: JSON.parse(localStorage.getItem('snamug_commune') || 'null'),
  parametres: JSON.parse(localStorage.getItem('snamug_parametres') || '{}')
}

export function setAuth({ token, user, membre, commune }) {
  store.token = token
  store.user = user
  store.membre = membre || null
  store.commune = commune || null
  localStorage.setItem('snamug_token', token)
  localStorage.setItem('snamug_user', JSON.stringify(user))
  localStorage.setItem('snamug_membre', JSON.stringify(membre || null))
  localStorage.setItem('snamug_commune', JSON.stringify(commune || null))
}

export function setParametres(params) {
  store.parametres = params
  localStorage.setItem('snamug_parametres', JSON.stringify(params))
}

export function clearAuth() {
  store.token = null
  store.user = null
  store.membre = null
  store.commune = null
  localStorage.removeItem('snamug_token')
  localStorage.removeItem('snamug_user')
  localStorage.removeItem('snamug_membre')
  localStorage.removeItem('snamug_commune')
}

export function isLoggedIn() {
  return !!store.token && !!store.user
}
