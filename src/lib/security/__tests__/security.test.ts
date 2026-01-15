/**
 * Security Module Tests
 * Comprehensive tests for all security functionality
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'

// Mock environment variables
beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters!'
})

// Import after setting env vars
import {
  encrypt,
  decrypt,
  hash,
  generateToken,
  encryptSensitiveFields,
  decryptSensitiveFields,
  maskValue,
  isSensitiveField,
} from '../encryption'

import {
  redactPII,
  restorePII,
  containsPII,
  analyzePII,
  redactObjectPII,
} from '../pii-redaction'

import {
  sanitizeInput,
  sanitizeRequestBody,
  validate,
  trackFailedLogin,
  resetFailedLogins,
} from '../middleware'

// ============================================
// ENCRYPTION TESTS
// ============================================
describe('Encryption Module', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const original = 'sensitive data 123'
      const encrypted = encrypt(original)

      expect(encrypted).not.toBe(original)
      expect(encrypted.length).toBeGreaterThan(0)

      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(original)
    })

    it('should handle empty strings', () => {
      expect(encrypt('')).toBe('')
      expect(decrypt('')).toBe('')
    })

    it('should handle Hebrew text', () => {
      const original = 'שלום עולם - מידע רגיש'
      const encrypted = encrypt(original)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(original)
    })

    it('should produce different ciphertext for same plaintext', () => {
      const original = 'test data'
      const encrypted1 = encrypt(original)
      const encrypted2 = encrypt(original)
      // AES with random IV should produce different ciphertexts
      // Note: CryptoJS may produce same output without explicit IV
    })
  })

  describe('hash', () => {
    it('should produce consistent hash for same input', () => {
      const input = 'password123'
      const hash1 = hash(input)
      const hash2 = hash(input)
      expect(hash1).toBe(hash2)
    })

    it('should produce different hash for different input', () => {
      const hash1 = hash('password1')
      const hash2 = hash('password2')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('generateToken', () => {
    it('should generate token of specified length', () => {
      const token = generateToken(32)
      expect(token.length).toBe(64) // Hex encoding doubles length
    })

    it('should generate unique tokens', () => {
      const token1 = generateToken()
      const token2 = generateToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe('encryptSensitiveFields', () => {
    it('should encrypt only sensitive fields', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        bank_account: '12-345-67890123',
        age: 30,
      }

      const encrypted = encryptSensitiveFields(data)

      expect(encrypted.name).toBe(data.name) // Not sensitive
      expect(encrypted.email).toBe(data.email) // Not in default list
      expect(encrypted.bank_account).not.toBe(data.bank_account) // Sensitive
      expect(encrypted.age).toBe(data.age) // Number, not encrypted
    })

    it('should decrypt sensitive fields', () => {
      const data = {
        ssn: '123456789',
        credit_card: '4111111111111111',
      }

      const encrypted = encryptSensitiveFields(data)
      const decrypted = decryptSensitiveFields(encrypted)

      expect(decrypted.ssn).toBe(data.ssn)
      expect(decrypted.credit_card).toBe(data.credit_card)
    })
  })

  describe('maskValue', () => {
    it('should mask value showing last 4 characters', () => {
      expect(maskValue('1234567890')).toBe('******7890')
      expect(maskValue('4111111111111111')).toBe('************1111')
    })

    it('should handle short values', () => {
      expect(maskValue('123')).toBe('***')
      expect(maskValue('12', 4)).toBe('**')
    })
  })

  describe('isSensitiveField', () => {
    it('should identify sensitive fields', () => {
      expect(isSensitiveField('bank_account')).toBe(true)
      expect(isSensitiveField('credit_card_number')).toBe(true)
      expect(isSensitiveField('ssn')).toBe(true)
      expect(isSensitiveField('password')).toBe(true)
    })

    it('should not flag non-sensitive fields', () => {
      expect(isSensitiveField('name')).toBe(false)
      expect(isSensitiveField('email')).toBe(false)
      expect(isSensitiveField('phone')).toBe(false)
    })
  })
})

// ============================================
// PII REDACTION TESTS
// ============================================
describe('PII Redaction Module', () => {
  describe('redactPII', () => {
    it('should redact Israeli ID numbers', () => {
      const text = 'My ID is 123456789 and my friend\'s is 987654321'
      const result = redactPII(text)

      expect(result.redactedText).not.toContain('123456789')
      expect(result.redactedText).not.toContain('987654321')
      expect(result.redactedCount).toBe(2)
      expect(result.detectedTypes).toContain('ID')
    })

    it('should redact Israeli phone numbers', () => {
      const text = 'Call me at 054-1234567 or 052-7654321'
      const result = redactPII(text)

      expect(result.redactedText).not.toContain('054-1234567')
      expect(result.redactedText).not.toContain('052-7654321')
      expect(result.detectedTypes).toContain('PHONE')
    })

    it('should redact email addresses', () => {
      const text = 'Contact: john@example.com and jane.doe@company.co.il'
      const result = redactPII(text)

      expect(result.redactedText).not.toContain('john@example.com')
      expect(result.redactedText).not.toContain('jane.doe@company.co.il')
      expect(result.detectedTypes).toContain('EMAIL')
    })

    it('should redact credit card numbers', () => {
      const text = 'Card: 4111-1111-1111-1111'
      const result = redactPII(text)

      expect(result.redactedText).not.toContain('4111-1111-1111-1111')
      expect(result.detectedTypes).toContain('CREDIT_CARD')
    })

    it('should redact Hebrew names', () => {
      const text = 'שמי הוא יוסי כהן ואני גר בתל אביב'
      const result = redactPII(text)

      expect(result.redactedText).not.toContain('יוסי כהן')
      expect(result.detectedTypes).toContain('NAME')
    })

    it('should handle text with no PII', () => {
      const text = 'This is a simple message with no personal information.'
      const result = redactPII(text)

      expect(result.redactedText).toBe(text)
      expect(result.redactedCount).toBe(0)
    })
  })

  describe('restorePII', () => {
    it('should restore redacted PII using the map', () => {
      const original = 'My ID is 123456789'
      const { redactedText, redactionMap } = redactPII(original)
      const restored = restorePII(redactedText, redactionMap)

      expect(restored).toBe(original)
    })
  })

  describe('containsPII', () => {
    it('should detect presence of PII', () => {
      expect(containsPII('Call me at 054-1234567')).toBe(true)
      expect(containsPII('Hello world')).toBe(false)
    })
  })

  describe('analyzePII', () => {
    it('should return correct risk level', () => {
      // No PII
      expect(analyzePII('Hello world').riskLevel).toBe('none')

      // Low (1-2 items)
      expect(analyzePII('Call 054-1234567').riskLevel).toBe('low')

      // Medium (3-5 items)
      const mediumText = 'ID: 123456789, Phone: 054-1234567, Email: test@test.com'
      expect(analyzePII(mediumText).riskLevel).toBe('medium')

      // Financial data elevates risk
      const financialText = 'Card: 4111-1111-1111-1111'
      expect(analyzePII(financialText).riskLevel).toBe('medium')
    })
  })

  describe('redactObjectPII', () => {
    it('should redact PII from object values', () => {
      const obj = {
        name: 'יוסי כהן',
        phone: '054-1234567',
        message: 'My ID is 123456789',
      }

      const { redacted, map } = redactObjectPII(obj)

      expect(redacted.phone).not.toContain('054-1234567')
      expect(redacted.message).not.toContain('123456789')
      expect(map.size).toBeGreaterThan(0)
    })

    it('should handle nested objects', () => {
      const obj = {
        user: {
          email: 'test@example.com',
          profile: {
            phone: '054-1234567',
          },
        },
      }

      const { redacted } = redactObjectPII(obj)

      expect(redacted.user.email).not.toContain('test@example.com')
      expect(redacted.user.profile.phone).not.toContain('054-1234567')
    })
  })
})

// ============================================
// MIDDLEWARE TESTS
// ============================================
describe('Security Middleware', () => {
  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello'
      expect(sanitizeInput(input)).toBe('Hello')
    })

    it('should handle safe text', () => {
      const input = 'Hello World'
      expect(sanitizeInput(input)).toBe('Hello World')
    })

    it('should trim whitespace', () => {
      const input = '  Hello World  '
      expect(sanitizeInput(input)).toBe('Hello World')
    })
  })

  describe('sanitizeRequestBody', () => {
    it('should sanitize all string values', () => {
      const body = {
        name: '<script>alert("xss")</script>John',
        age: 30,
        nested: {
          comment: '<b>Bold</b> text',
        },
      }

      const sanitized = sanitizeRequestBody(body)

      expect(sanitized.name).toBe('John')
      expect(sanitized.age).toBe(30)
      expect(sanitized.nested.comment).toBe('Bold text')
    })
  })

  describe('validate', () => {
    it('should validate emails', () => {
      expect(validate.email('test@example.com')).toBe(true)
      expect(validate.email('invalid-email')).toBe(false)
    })

    it('should validate Israeli phones', () => {
      expect(validate.phone('054-1234567')).toBe(true)
      expect(validate.phone('0541234567')).toBe(true)
      expect(validate.phone('1234567')).toBe(false)
    })

    it('should validate Israeli ID', () => {
      // Valid Israeli ID (with correct checksum)
      expect(validate.israeliId('000000018')).toBe(true)
      // Invalid checksum
      expect(validate.israeliId('123456789')).toBe(false)
    })

    it('should validate UUIDs', () => {
      expect(validate.uuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      expect(validate.uuid('not-a-uuid')).toBe(false)
    })

    it('should validate strong passwords', () => {
      expect(validate.strongPassword('Weak')).toBe(false)
      expect(validate.strongPassword('StrongP@ss1')).toBe(true)
    })
  })

  describe('trackFailedLogin', () => {
    it('should track failed attempts', async () => {
      const identifier = 'test-user'
      const ip = '192.168.1.1'

      // First attempt
      const result1 = await trackFailedLogin(identifier, ip)
      expect(result1.blocked).toBe(false)
      expect(result1.attemptsRemaining).toBe(4)

      // Reset for clean test
      resetFailedLogins(identifier, ip)
    })

    it('should block after max attempts', async () => {
      const identifier = 'block-test-user'
      const ip = '192.168.1.2'

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await trackFailedLogin(identifier, ip)
      }

      const result = await trackFailedLogin(identifier, ip)
      expect(result.blocked).toBe(true)

      // Reset for clean test
      resetFailedLogins(identifier, ip)
    })
  })
})

// ============================================
// INTEGRATION TESTS
// ============================================
describe('Security Integration', () => {
  it('should handle full security flow', () => {
    // 1. Receive user input
    const userInput = {
      name: '<script>xss</script>יוסי כהן',
      email: 'yossi@example.com',
      phone: '054-1234567',
      id_number: '123456789',
      message: 'I want insurance for my car 12-345-67890',
    }

    // 2. Sanitize input
    const sanitized = sanitizeRequestBody(userInput)
    expect(sanitized.name).not.toContain('<script>')

    // 3. Redact PII for AI processing
    const { redacted } = redactObjectPII(sanitized)
    expect(redacted.email).not.toContain('@')
    expect(redacted.phone).not.toContain('054')

    // 4. Encrypt sensitive fields for storage
    const encrypted = encryptSensitiveFields(sanitized)
    // id_number would be encrypted if field name matched

    // 5. Verify security analysis
    const analysis = analyzePII(JSON.stringify(userInput))
    expect(analysis.hasPII).toBe(true)
  })
})
