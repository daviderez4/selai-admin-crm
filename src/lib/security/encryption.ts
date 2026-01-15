/**
 * Encryption Library for SELAI Admin Hub
 * Provides field-level encryption for sensitive financial data
 */

import CryptoJS from 'crypto-js'

// Environment key - must be 32 characters for AES-256
const getEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters')
  }
  return key
}

/**
 * Encrypt a string value using AES-256
 */
export const encrypt = (plainText: string): string => {
  if (!plainText) return ''
  const key = getEncryptionKey()
  const encrypted = CryptoJS.AES.encrypt(plainText, key).toString()
  return encrypted
}

/**
 * Decrypt an encrypted string
 */
export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return ''
  const key = getEncryptionKey()
  const bytes = CryptoJS.AES.decrypt(encryptedText, key)
  const decrypted = bytes.toString(CryptoJS.enc.Utf8)
  return decrypted
}

/**
 * Hash a value (one-way, for comparisons)
 */
export const hash = (value: string): string => {
  return CryptoJS.SHA256(value).toString()
}

/**
 * Generate a secure random token
 */
export const generateToken = (length: number = 32): string => {
  return CryptoJS.lib.WordArray.random(length).toString()
}

/**
 * Sensitive fields that should be encrypted in financial data
 */
export const SENSITIVE_FIELDS = [
  'ssn',
  'social_security',
  'teudat_zehut',      // Israeli ID
  'bank_account',
  'bank_account_number',
  'credit_card',
  'credit_card_number',
  'cvv',
  'pin',
  'salary',
  'income',
  'commission',
  'password',
  'secret',
  'api_key',
  'token',
] as const

/**
 * Check if a field name is sensitive
 */
export const isSensitiveField = (fieldName: string): boolean => {
  const lowerField = fieldName.toLowerCase()
  return SENSITIVE_FIELDS.some(sensitive =>
    lowerField.includes(sensitive.toLowerCase())
  )
}

/**
 * Encrypt all sensitive fields in an object
 */
export const encryptSensitiveFields = <T extends Record<string, any>>(
  data: T,
  additionalFields: string[] = []
): T => {
  const result: Record<string, any> = { ...data }
  const fieldsToEncrypt = [...SENSITIVE_FIELDS, ...additionalFields]

  for (const key of Object.keys(result)) {
    const lowerKey = key.toLowerCase()
    const shouldEncrypt = fieldsToEncrypt.some(field =>
      lowerKey.includes(field.toLowerCase())
    )

    if (shouldEncrypt && typeof result[key] === 'string' && result[key]) {
      result[key] = encrypt(result[key])
    }
  }

  return result as T
}

/**
 * Decrypt all sensitive fields in an object
 */
export const decryptSensitiveFields = <T extends Record<string, any>>(
  data: T,
  additionalFields: string[] = []
): T => {
  const result: Record<string, any> = { ...data }
  const fieldsToDecrypt = [...SENSITIVE_FIELDS, ...additionalFields]

  for (const key of Object.keys(result)) {
    const lowerKey = key.toLowerCase()
    const shouldDecrypt = fieldsToDecrypt.some(field =>
      lowerKey.includes(field.toLowerCase())
    )

    if (shouldDecrypt && typeof result[key] === 'string' && result[key]) {
      try {
        result[key] = decrypt(result[key])
      } catch {
        // If decryption fails, value might not be encrypted
        // Keep original value
      }
    }
  }

  return result as T
}

/**
 * Mask a sensitive value for display (e.g., ****1234)
 */
export const maskValue = (value: string, visibleChars: number = 4): string => {
  if (!value || value.length <= visibleChars) {
    return '*'.repeat(value?.length || 4)
  }
  const masked = '*'.repeat(value.length - visibleChars)
  const visible = value.slice(-visibleChars)
  return masked + visible
}

/**
 * Encrypt for storage in database
 */
export const encryptForStorage = (data: any): string => {
  const jsonString = JSON.stringify(data)
  return encrypt(jsonString)
}

/**
 * Decrypt from database storage
 */
export const decryptFromStorage = <T = any>(encryptedData: string): T => {
  const jsonString = decrypt(encryptedData)
  return JSON.parse(jsonString) as T
}
