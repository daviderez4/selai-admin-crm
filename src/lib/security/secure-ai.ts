/**
 * Secure AI Service
 * Handles AI queries with PII protection and audit logging
 */

import Anthropic from '@anthropic-ai/sdk'
import { redactPII, analyzePII, type RedactionResult } from './pii-redaction'
import { auditLog, AuditAction } from './audit-logger'

// AI Client (lazy initialization)
let anthropicClient: Anthropic | null = null

const getAnthropicClient = (): Anthropic => {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured')
    }
    anthropicClient = new Anthropic({ apiKey })
  }
  return anthropicClient
}

export interface SecureAIRequest {
  prompt: string
  systemPrompt?: string
  model?: 'claude-sonnet-4-20250514' | 'claude-3-haiku-20240307'
  maxTokens?: number
  temperature?: number
  userId: string
  context?: string
  allowPII?: boolean // Default false - will redact PII
}

export interface SecureAIResponse {
  response: string
  tokensUsed: {
    input: number
    output: number
    total: number
  }
  piiDetected: boolean
  piiTypes: string[]
  processingTimeMs: number
  requestId: string
}

/**
 * Make a secure AI query with automatic PII redaction
 */
export const secureAIQuery = async (
  request: SecureAIRequest
): Promise<SecureAIResponse> => {
  const startTime = Date.now()
  const requestId = `ai_${Date.now()}_${Math.random().toString(36).substring(7)}`

  try {
    // 1. Analyze and redact PII from the prompt
    const piiAnalysis = analyzePII(request.prompt)
    let processedPrompt = request.prompt
    let redactionResult: RedactionResult | null = null

    if (!request.allowPII && piiAnalysis.hasPII) {
      redactionResult = redactPII(request.prompt)
      processedPrompt = redactionResult.redactedText

      // Log PII detection
      await auditLog({
        action: AuditAction.AI_PII_DETECTED,
        userId: request.userId,
        resource: 'ai_query',
        resourceId: requestId,
        details: {
          piiTypes: piiAnalysis.types,
          piiCount: piiAnalysis.count,
          riskLevel: piiAnalysis.riskLevel,
          redacted: true,
        },
        severity: piiAnalysis.riskLevel === 'critical' ? 'high' : 'medium',
      })
    }

    // 2. Prepare system prompt with security guidelines
    const secureSystemPrompt = `${request.systemPrompt || 'You are a helpful assistant for insurance agents.'}

SECURITY GUIDELINES:
- Never ask for or encourage sharing of sensitive personal information
- If you detect tokens like [ID_1], [PHONE_1], etc., these are redacted PII - do not try to guess the original values
- Focus on providing helpful, accurate information
- If financial advice is needed, recommend consulting with a licensed professional`

    // 3. Make the API call
    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: request.model || 'claude-sonnet-4-20250514',
      max_tokens: request.maxTokens || 1024,
      temperature: request.temperature ?? 0.7,
      system: secureSystemPrompt,
      messages: [{ role: 'user', content: processedPrompt }],
    })

    // 4. Extract response
    const aiResponse = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    const tokensUsed = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      total: response.usage.input_tokens + response.usage.output_tokens,
    }

    // 5. Log the AI query
    await auditLog({
      action: AuditAction.AI_QUERY,
      userId: request.userId,
      resource: 'ai_query',
      resourceId: requestId,
      details: {
        model: request.model || 'claude-sonnet-4-20250514',
        tokensUsed,
        piiDetected: piiAnalysis.hasPII,
        context: request.context,
      },
      severity: 'low',
    })

    return {
      response: aiResponse,
      tokensUsed,
      piiDetected: piiAnalysis.hasPII,
      piiTypes: piiAnalysis.types,
      processingTimeMs: Date.now() - startTime,
      requestId,
    }
  } catch (error) {
    // Log the error
    await auditLog({
      action: AuditAction.AI_ERROR,
      userId: request.userId,
      resource: 'ai_query',
      resourceId: requestId,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      severity: 'high',
    })

    throw error
  }
}

/**
 * Generate insurance quote using AI (with financial data protection)
 */
export const generateInsuranceQuote = async (
  customerData: Record<string, any>,
  insuranceType: string,
  userId: string
): Promise<{
  quote: string
  recommendations: string[]
  disclaimer: string
}> => {
  // Redact all PII from customer data before processing
  const safeData: Record<string, any> = {}
  for (const [key, value] of Object.entries(customerData)) {
    if (typeof value === 'string') {
      const { redactedText } = redactPII(value)
      safeData[key] = redactedText
    } else if (typeof value === 'number') {
      // Keep numeric values but redact if they look like IDs
      if (String(value).length === 9) {
        safeData[key] = '[REDACTED_ID]'
      } else {
        safeData[key] = value
      }
    } else {
      safeData[key] = value
    }
  }

  const prompt = `Based on the following customer profile, provide insurance recommendations for ${insuranceType}:

Customer Profile:
${JSON.stringify(safeData, null, 2)}

Please provide:
1. A brief quote summary
2. 3-5 specific recommendations
3. Any important considerations

Note: Some personal details have been redacted for privacy. Focus on the available information.`

  const response = await secureAIQuery({
    prompt,
    systemPrompt: `You are an expert insurance advisor assistant. Provide helpful, accurate insurance guidance based on the information provided. Always recommend consulting with a licensed insurance agent for final decisions.`,
    userId,
    context: `insurance_quote_${insuranceType}`,
    maxTokens: 2000,
  })

  return {
    quote: response.response,
    recommendations: [], // Would parse from response
    disclaimer: 'This is AI-generated guidance. Please consult with a licensed insurance professional for official quotes and advice.',
  }
}

/**
 * Analyze document with AI (with PII protection)
 */
export const analyzeDocument = async (
  documentText: string,
  documentType: string,
  userId: string
): Promise<{
  summary: string
  keyPoints: string[]
  warnings: string[]
  piiDetected: boolean
}> => {
  const piiAnalysis = analyzePII(documentText)

  // For documents with high PII risk, use more aggressive redaction
  const { redactedText, detectedTypes } = redactPII(documentText, {
    redactNames: true,
    redactPhones: true,
    redactEmails: true,
    redactFinancial: true,
    redactIds: true,
    redactAddresses: true,
  })

  const prompt = `Analyze this ${documentType} document and provide:
1. A brief summary (2-3 sentences)
2. Key points (bullet list)
3. Any warnings or concerns

Document content:
${redactedText}

Note: Personal information has been redacted for privacy.`

  const response = await secureAIQuery({
    prompt,
    systemPrompt: 'You are a document analysis assistant specializing in insurance and financial documents. Provide clear, actionable analysis.',
    userId,
    context: `document_analysis_${documentType}`,
    maxTokens: 1500,
  })

  return {
    summary: response.response,
    keyPoints: [], // Would parse from response
    warnings: piiAnalysis.riskLevel === 'high' || piiAnalysis.riskLevel === 'critical'
      ? ['This document contains sensitive personal information. Handle with care.']
      : [],
    piiDetected: piiAnalysis.hasPII,
  }
}

/**
 * Chat with AI assistant (general purpose with PII protection)
 */
export const chatWithAssistant = async (
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  userId: string
): Promise<SecureAIResponse> => {
  // Redact PII from current message
  const { redactedText } = redactPII(message)

  // Redact PII from conversation history
  const safeHistory = conversationHistory.map(msg => ({
    role: msg.role,
    content: redactPII(msg.content).redactedText,
  }))

  // Build conversation context
  const contextPrompt = safeHistory.length > 0
    ? `Previous conversation:\n${safeHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${redactedText}`
    : redactedText

  return secureAIQuery({
    prompt: contextPrompt,
    systemPrompt: `You are a helpful assistant for insurance agents in Israel. You help with:
- Customer inquiries
- Policy questions
- Quote generation
- Document analysis
- General insurance guidance

Always be professional, accurate, and helpful. If you're unsure about something, say so.`,
    userId,
    context: 'chat_assistant',
  })
}
