import type { EncryptedPayload } from '@/types'

const PBKDF2_ITERATIONS = 100_000
const SALT_LENGTH = 16
const IV_LENGTH = 12

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function deriveKey(password: string, salt: BufferSource): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptMessage(
  plaintext: string,
  password: string,
): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(password, salt)
  const encoder = new TextEncoder()

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext),
  )

  return {
    ciphertext: toBase64(ciphertextBuffer),
    iv: toBase64(iv.buffer),
    salt: toBase64(salt.buffer),
  }
}

export async function decryptMessage(
  payload: EncryptedPayload,
  password: string,
): Promise<string> {
  const salt = fromBase64(payload.salt)
  const iv = fromBase64(payload.iv)
  const ciphertext = fromBase64(payload.ciphertext)
  const key = await deriveKey(password, salt as BufferSource)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  )

  return new TextDecoder().decode(decrypted)
}

export function serializeEncryptedPayload(payload: EncryptedPayload): string {
  return JSON.stringify(payload)
}

export function parseEncryptedPayload(content: string): EncryptedPayload | null {
  try {
    const parsed = JSON.parse(content) as EncryptedPayload
    if (parsed.ciphertext && parsed.iv && parsed.salt) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function generateSaltHint(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  return toBase64(salt.buffer)
}
