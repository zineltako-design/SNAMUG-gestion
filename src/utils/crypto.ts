// Utilitaires cryptographiques compatibles Cloudflare Workers (Web Crypto API)

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

export function randomSalt(len = 16): string {
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return bufToHex(arr.buffer)
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBuf(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  )
  return bufToHex(derived)
}

export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password, salt)
  // Comparaison à temps constant simplifiée
  if (computed.length !== hash.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i)
  }
  return diff === 0
}

export function genererNumeroAdhesion(communeCode: string, id: number): string {
  const annee = new Date().getFullYear()
  return `SNAMUG-${communeCode}-${annee}-${String(id).padStart(4, '0')}`
}

export function genererNumeroRecu(type: string, id: number): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = type === 'adhesion' ? 'ADH' : type === 'cotisation' ? 'COT' : 'DON'
  return `${prefix}-${y}${m}-${String(id).padStart(5, '0')}`
}
