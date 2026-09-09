// Client API SNAMUG GESTION
const API = axios.create({ baseURL: '/api' })

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('snamug_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('snamug_token')
      localStorage.removeItem('snamug_user')
      if (!location.hash.includes('login')) {
        location.hash = '#/login'
        location.reload()
      }
    }
    return Promise.reject(err)
  }
)

function apiErrorMessage(err) {
  return err?.response?.data?.error || 'Une erreur est survenue. Veuillez réessayer.'
}

export { API, apiErrorMessage }
