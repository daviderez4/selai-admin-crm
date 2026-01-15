/**
 * PII (Personally Identifiable Information) Redaction Service
 * Removes sensitive data before sending to AI models
 */

export interface PIIRedactionConfig {
  redactNames: boolean
  redactPhones: boolean
  redactEmails: boolean
  redactFinancial: boolean
  redactIds: boolean
  redactAddresses: boolean
  customPatterns?: RegExp[]
}

export interface RedactionResult {
  redactedText: string
  redactedCount: number
  redactionMap: Map<string, string>
  detectedTypes: string[]
}

// Israeli-specific patterns
const PII_PATTERNS = {
  // Israeli ID (Teudat Zehut) - 9 digits
  israeliId: /\b\d{9}\b/g,

  // Israeli phone numbers
  israeliMobile: /\b0[5][0-9][-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  israeliLandline: /\b0[2-9][-.\s]?\d{7}\b/g,

  // International phone
  internationalPhone: /\b\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g,

  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,

  // Credit card numbers (various formats)
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  creditCardShort: /\b\d{13,16}\b/g,

  // Israeli bank account (2-digit bank, 3-digit branch, 6-9 digit account)
  israeliBankAccount: /\b\d{2}[-.\s]?\d{3}[-.\s]?\d{6,9}\b/g,

  // IBAN
  iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/gi,

  // Social Security Number (US format, in case of international data)
  ssn: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,

  // Hebrew names pattern (basic)
  hebrewName: /[\u0590-\u05FF]{2,}\s+[\u0590-\u05FF]{2,}/g,

  // IP addresses
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,

  // Dates of birth (various formats)
  dateOfBirth: /\b(?:0?[1-9]|[12]\d|3[01])[\/\-.](?:0?[1-9]|1[0-2])[\/\-.]\d{2,4}\b/g,

  // Passport numbers (general pattern)
  passport: /\b[A-Z]{1,2}\d{6,9}\b/gi,

  // Israeli car license plates
  israeliLicensePlate: /\b\d{2,3}[-.\s]?\d{2,3}[-.\s]?\d{2,3}\b/g,
}

const DEFAULT_CONFIG: PIIRedactionConfig = {
  redactNames: true,
  redactPhones: true,
  redactEmails: true,
  redactFinancial: true,
  redactIds: true,
  redactAddresses: true,
}

/**
 * Main PII redaction function
 */
export const redactPII = (
  text: string,
  config: Partial<PIIRedactionConfig> = {}
): RedactionResult => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const redactionMap = new Map<string, string>()
  const detectedTypes: string[] = []
  let redactedText = text
  let counter = 0

  const addRedaction = (match: string, type: string): string => {
    counter++
    const token = `[${type}_${counter}]`
    redactionMap.set(token, match)
    if (!detectedTypes.includes(type)) {
      detectedTypes.push(type)
    }
    return token
  }

  // Redact IDs
  if (finalConfig.redactIds) {
    redactedText = redactedText.replace(PII_PATTERNS.israeliId, (match) =>
      addRedaction(match, 'ID')
    )
    redactedText = redactedText.replace(PII_PATTERNS.ssn, (match) =>
      addRedaction(match, 'SSN')
    )
    redactedText = redactedText.replace(PII_PATTERNS.passport, (match) =>
      addRedaction(match, 'PASSPORT')
    )
  }

  // Redact phone numbers
  if (finalConfig.redactPhones) {
    redactedText = redactedText.replace(PII_PATTERNS.israeliMobile, (match) =>
      addRedaction(match, 'PHONE')
    )
    redactedText = redactedText.replace(PII_PATTERNS.israeliLandline, (match) =>
      addRedaction(match, 'PHONE')
    )
    redactedText = redactedText.replace(PII_PATTERNS.internationalPhone, (match) =>
      addRedaction(match, 'PHONE')
    )
  }

  // Redact emails
  if (finalConfig.redactEmails) {
    redactedText = redactedText.replace(PII_PATTERNS.email, (match) =>
      addRedaction(match, 'EMAIL')
    )
  }

  // Redact financial information
  if (finalConfig.redactFinancial) {
    redactedText = redactedText.replace(PII_PATTERNS.creditCard, (match) =>
      addRedaction(match, 'CREDIT_CARD')
    )
    redactedText = redactedText.replace(PII_PATTERNS.israeliBankAccount, (match) =>
      addRedaction(match, 'BANK_ACCOUNT')
    )
    redactedText = redactedText.replace(PII_PATTERNS.iban, (match) =>
      addRedaction(match, 'IBAN')
    )
  }

  // Redact Hebrew names (basic)
  if (finalConfig.redactNames) {
    redactedText = redactedText.replace(PII_PATTERNS.hebrewName, (match) =>
      addRedaction(match, 'NAME')
    )
  }

  // Apply custom patterns
  if (finalConfig.customPatterns) {
    for (const pattern of finalConfig.customPatterns) {
      redactedText = redactedText.replace(pattern, (match) =>
        addRedaction(match, 'CUSTOM')
      )
    }
  }

  return {
    redactedText,
    redactedCount: counter,
    redactionMap,
    detectedTypes,
  }
}

/**
 * Restore redacted text using the redaction map
 */
export const restorePII = (
  redactedText: string,
  redactionMap: Map<string, string>
): string => {
  let restoredText = redactedText
  for (const [token, original] of redactionMap) {
    restoredText = restoredText.replace(token, original)
  }
  return restoredText
}

/**
 * Check if text contains PII
 */
export const containsPII = (text: string): boolean => {
  const result = redactPII(text)
  return result.redactedCount > 0
}

/**
 * Get PII detection summary
 */
export const analyzePII = (text: string): {
  hasPII: boolean
  types: string[]
  count: number
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical'
} => {
  const result = redactPII(text)

  let riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none'

  if (result.redactedCount === 0) {
    riskLevel = 'none'
  } else if (result.redactedCount <= 2) {
    riskLevel = 'low'
  } else if (result.redactedCount <= 5) {
    riskLevel = 'medium'
  } else if (result.redactedCount <= 10) {
    riskLevel = 'high'
  } else {
    riskLevel = 'critical'
  }

  // Elevate risk if financial data detected
  if (
    result.detectedTypes.includes('CREDIT_CARD') ||
    result.detectedTypes.includes('BANK_ACCOUNT') ||
    result.detectedTypes.includes('IBAN')
  ) {
    if (riskLevel === 'low') riskLevel = 'medium'
    else if (riskLevel === 'medium') riskLevel = 'high'
  }

  return {
    hasPII: result.redactedCount > 0,
    types: result.detectedTypes,
    count: result.redactedCount,
    riskLevel,
  }
}

/**
 * Redact PII from an object's string values
 */
export const redactObjectPII = <T extends Record<string, any>>(
  obj: T,
  config?: Partial<PIIRedactionConfig>
): { redacted: T; map: Map<string, string> } => {
  const combinedMap = new Map<string, string>()
  const redacted: Record<string, any> = { ...obj }

  for (const key of Object.keys(redacted)) {
    if (typeof redacted[key] === 'string') {
      const result = redactPII(redacted[key], config)
      redacted[key] = result.redactedText
      for (const [token, original] of result.redactionMap) {
        combinedMap.set(token, original)
      }
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      const nested = redactObjectPII(redacted[key], config)
      redacted[key] = nested.redacted
      for (const [token, original] of nested.map) {
        combinedMap.set(token, original)
      }
    }
  }

  return { redacted: redacted as T, map: combinedMap }
}
