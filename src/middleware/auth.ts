import { Context, Next } from 'hono'
import { sign, verify } from 'hono/jwt'
import type { Bindings, JwtPayload, Role } from '../types'

const DEFAULT_SECRET = 'snamug-gestion-dev-secret-change-in-production'

export function getSecret(c: Context<{ Bindings: Bindings }>): string {
  return c.env.JWT_SECRET || DEFAULT_SECRET
}

export async function createToken(c: Context<{ Bindings: Bindings }>, payload: Omit<JwtPayload, 'exp' | 'iat'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const full: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + 60 * 60 * 24 * 30 // 30 jours (utile pour usage terrain/offline)
  }
  return await sign(full as unknown as Record<string, unknown>, getSecret(c))
}

// Middleware : exige un token valide, attache le payload à c.set('user', payload)
export async function authRequired(c: Context<{ Bindings: Bindings }>, next: Next) {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return c.json({ error: 'Authentification requise' }, 401)
  }
  try {
    const payload = (await verify(token, getSecret(c), 'HS256')) as unknown as JwtPayload
    c.set('user', payload)
    await next()
  } catch (e) {
    return c.json({ error: 'Token invalide ou expiré' }, 401)
  }
}

// Middleware : exige un ou plusieurs rôles
export function requireRole(...roles: Role[]) {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const user = c.get('user') as JwtPayload | undefined
    if (!user) return c.json({ error: 'Authentification requise' }, 401)
    if (!roles.includes(user.role)) {
      return c.json({ error: 'Accès refusé : rôle insuffisant' }, 403)
    }
    await next()
  }
}

// Helper : récupère l'utilisateur courant depuis le contexte
export function currentUser(c: Context<{ Bindings: Bindings }>): JwtPayload {
  return c.get('user') as JwtPayload
}
