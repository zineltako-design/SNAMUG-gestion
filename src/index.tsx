import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Bindings } from './types'

import authRoutes from './routes/auth'
import communesRoutes from './routes/communes'
import membresRoutes from './routes/membres'
import paiementsRoutes from './routes/paiements'
import depensesRoutes from './routes/depenses'
import parametresRoutes from './routes/parametres'
import dashboardRoutes from './routes/dashboard'
import uploadsRoutes from './routes/uploads'
import usersRoutes from './routes/users'
import projetsRoutes from './routes/projets'
import exercicesRoutes from './routes/exercices'
import { SERVICE_WORKER_SOURCE } from './sw-source'

const app = new Hono<{ Bindings: Bindings }>()

// Fichiers statiques (JS/CSS de l'app)
app.use('/static/*', serveStatic({ root: './public' }))

// API
app.route('/api/auth', authRoutes)
app.route('/api/communes', communesRoutes)
app.route('/api/membres', membresRoutes)
app.route('/api/paiements', paiementsRoutes)
app.route('/api/depenses', depensesRoutes)
app.route('/api/parametres', parametresRoutes)
app.route('/api/dashboard', dashboardRoutes)
app.route('/api/upload', uploadsRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/projets', projetsRoutes)
app.route('/api/exercices', exercicesRoutes)

// Service Worker servi à la racine (scope complet) pour le mode hors-ligne
app.get('/sw.js', (c) => {
  return new Response(SERVICE_WORKER_SOURCE, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-cache'
    }
  })
})

// Lecture des fichiers stockés sur R2 (photos, justificatifs, logo)
app.get('/api/files/*', async (c) => {
  const key = c.req.path.replace('/api/files/', '')
  const object = await c.env.R2.get(key)
  if (!object) return c.notFound()
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000'
    }
  })
})

// Application (SPA) - une seule page HTML, logique en JS
app.get('*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <title>SNAMUG GESTION</title>
  <meta name="theme-color" content="#0A3D91" />
  <link rel="manifest" href="/static/manifest.json" />
  <!-- PWA iOS -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="SNAMUG" />
  <link rel="apple-touch-icon" href="/static/icon-192.png" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
  <link href="/static/style.css" rel="stylesheet" />
</head>
<body class="bg-gray-50">
  <div id="app"></div>
  <script type="module" src="/static/app.js"></script>
</body>
</html>`)
})

export default app
