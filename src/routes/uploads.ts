import { Hono } from 'hono'
import type { Bindings } from '../types'
import { authRequired } from '../middleware/auth'

const uploads = new Hono<{ Bindings: Bindings }>()

// Upload générique vers R2 (photos membres, justificatifs de dépenses, logo)
// multipart/form-data avec champ "file" et champ "dossier" (photos_membres | justificatifs | logo)
uploads.post('/', authRequired, async (c) => {
  const form = await c.req.formData().catch(() => null)
  if (!form) return c.json({ error: 'Requête invalide (multipart/form-data attendu)' }, 400)

  const file = form.get('file') as File | null
  const dossier = (form.get('dossier') as string) || 'divers'

  if (!file) return c.json({ error: 'Fichier requis (champ "file")' }, 400)

  const allowedFolders = ['photos_membres', 'justificatifs', 'logo']
  const safeFolder = allowedFolders.includes(dossier) ? dossier : 'divers'

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const key = `${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const buffer = await file.arrayBuffer()
  await c.env.R2.put(key, buffer, {
    httpMetadata: { contentType: file.type || 'application/octet-stream' }
  })

  const url = `/api/files/${key}`
  return c.json({ url, key })
})

export default uploads
