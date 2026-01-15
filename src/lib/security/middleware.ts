/**
 * Security Middleware
 * Rate limiting, request validation, and security headers
 */

import { NextRequest, NextResponse } from 'next/server'
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible'
import sanitizeHtml from 'sanitize-html'
import validator from 'validator'
import { logSecurityEvent } from './audit-logger'

// Rate limiters for different endpoints
const rateLimiters = {
  // General API - 100 requests per minute
  api: new RateLimiterMemory({
    points: 100,
    duration: 60,
  }),

  // Auth endpoints - 10 requests per minute
  auth: new RateLimiterMemory({
    points: 10,
    duration: 60,
  }),

  // AI endpoints - 20 requests per minute
  ai: new RateLimiterMemory({
    points: 20,
    duration: 60,
  }),

  // Sensitive data - 30 requests per minute
  sensitive: new RateLimiterMemory({
    points: 30,
    duration: 60,
  }),
}

// IP blacklist (in production, use Redis or database)
const ipBlacklist = new Set<string>()

// Failed login attempts tracking
const failedLogins = new Map<string, { count: number; lastAttempt: Date }>()

/**
 * Get client IP address
 */
export const getClientIP = (request: NextRequest): string => {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  return 'unknown'
}

/**
 * Check if IP is blacklisted
 */
export const isIPBlacklisted = (ip: string): boolean => {
  return ipBlacklist.has(ip)
}

/**
 * Add IP to blacklist
 */
export const blacklistIP = async (ip: string, reason: string): Promise<void> => {
  ipBlacklist.add(ip)
  await logSecurityEvent('ip_blocked', { reason }, ip)
}

/**
 * Rate limit check
 */
export const checkRateLimit = async (
  ip: string,
  endpoint: 'api' | 'auth' | 'ai' | 'sensitive'
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> => {
  try {
    const result = await rateLimiters[endpoint].consume(ip)
    return {
      allowed: true,
      remaining: result.remainingPoints,
      resetMs: result.msBeforeNext,
    }
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      await logSecurityEvent('rate_limit', {
        endpoint,
        attemptedAt: new Date().toISOString(),
      }, ip)

      return {
        allowed: false,
        remaining: 0,
        resetMs: error.msBeforeNext,
      }
    }
    throw error
  }
}

/**
 * Track failed login attempts
 */
export const trackFailedLogin = async (
  identifier: string,
  ip: string
): Promise<{ blocked: boolean; attemptsRemaining: number }> => {
  const key = `${identifier}_${ip}`
  const current = failedLogins.get(key) || { count: 0, lastAttempt: new Date() }

  // Reset if last attempt was more than 15 minutes ago
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
  if (current.lastAttempt < fifteenMinutesAgo) {
    current.count = 0
  }

  current.count++
  current.lastAttempt = new Date()
  failedLogins.set(key, current)

  const maxAttempts = 5
  const blocked = current.count >= maxAttempts

  if (blocked) {
    await logSecurityEvent('suspicious', {
      reason: 'Too many failed login attempts',
      attempts: current.count,
      identifier,
    }, ip)
  }

  return {
    blocked,
    attemptsRemaining: Math.max(0, maxAttempts - current.count),
  }
}

/**
 * Reset failed login tracking on successful login
 */
export const resetFailedLogins = (identifier: string, ip: string): void => {
  const key = `${identifier}_${ip}`
  failedLogins.delete(key)
}

/**
 * Sanitize user input
 */
export const sanitizeInput = (input: string): string => {
  // Remove HTML tags
  let sanitized = sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  })

  // Trim whitespace
  sanitized = sanitized.trim()

  return sanitized
}

/**
 * Validate and sanitize request body
 */
export const sanitizeRequestBody = <T extends Record<string, any>>(
  body: T
): T => {
  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeRequestBody(value)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeInput(item) : item
      )
    } else {
      sanitized[key] = value
    }
  }

  return sanitized as T
}

/**
 * Validation rules
 */
export const validate = {
  email: (value: string): boolean => validator.isEmail(value),
  phone: (value: string): boolean => {
    // Israeli phone format
    return /^0[2-9]\d{7,8}$/.test(value.replace(/[-\s]/g, ''))
  },
  israeliId: (value: string): boolean => {
    // Validate Israeli ID checksum
    const id = value.padStart(9, '0')
    if (!/^\d{9}$/.test(id)) return false

    let sum = 0
    for (let i = 0; i < 9; i++) {
      let digit = parseInt(id[i]) * ((i % 2) + 1)
      if (digit > 9) digit -= 9
      sum += digit
    }
    return sum % 10 === 0
  },
  uuid: (value: string): boolean => validator.isUUID(value),
  url: (value: string): boolean => validator.isURL(value),
  alphanumeric: (value: string): boolean => validator.isAlphanumeric(value),
  length: (value: string, min: number, max: number): boolean =>
    validator.isLength(value, { min, max }),
  strongPassword: (value: string): boolean =>
    validator.isStrongPassword(value, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    }),
}

/**
 * Security headers
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

/**
 * Add security headers to response
 */
export const addSecurityHeaders = (response: NextResponse): NextResponse => {
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value)
  }
  return response
}

/**
 * Create rate-limited response
 */
export const rateLimitedResponse = (resetMs: number): NextResponse => {
  return new NextResponse(
    JSON.stringify({
      error: 'Too many requests',
      retryAfter: Math.ceil(resetMs / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(resetMs / 1000)),
        ...securityHeaders,
      },
    }
  )
}

/**
 * CSRF token generation and validation
 */
const csrfTokens = new Map<string, { token: string; expires: Date }>()

export const generateCSRFToken = (sessionId: string): string => {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  csrfTokens.set(sessionId, {
    token,
    expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  })

  return token
}

export const validateCSRFToken = (sessionId: string, token: string): boolean => {
  const stored = csrfTokens.get(sessionId)
  if (!stored) return false
  if (stored.expires < new Date()) {
    csrfTokens.delete(sessionId)
    return false
  }
  return stored.token === token
}

/**
 * Request validation middleware helper
 */
export const validateRequest = async (
  request: NextRequest,
  options: {
    requireAuth?: boolean
    rateLimit?: 'api' | 'auth' | 'ai' | 'sensitive'
    validateCSRF?: boolean
  } = {}
): Promise<{ valid: boolean; error?: NextResponse; ip: string }> => {
  const ip = getClientIP(request)

  // Check IP blacklist
  if (isIPBlacklisted(ip)) {
    return {
      valid: false,
      error: new NextResponse(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403 }
      ),
      ip,
    }
  }

  // Check rate limit
  if (options.rateLimit) {
    const rateCheck = await checkRateLimit(ip, options.rateLimit)
    if (!rateCheck.allowed) {
      return {
        valid: false,
        error: rateLimitedResponse(rateCheck.resetMs),
        ip,
      }
    }
  }

  return { valid: true, ip }
}
