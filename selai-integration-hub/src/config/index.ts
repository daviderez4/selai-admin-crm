/**
 * SELAI Insurance Integration Hub
 * Central Configuration - קונפיגורציה מרכזית
 *
 * Centralized configuration management with:
 * - Environment variable loading
 * - Validation using Zod
 * - Type-safe access
 * - Default values
 */

import { z } from 'zod';
import { databaseConfig, DatabaseConfig } from './database.js';
import { kafkaConfig, KafkaConfig } from './kafka.js';
import { redisConfig, RedisConfig } from './redis.js';
import { connectorsConfig, ConnectorsConfig } from './connectors.js';

// ============================================
// ENVIRONMENT SCHEMA
// ============================================

const EnvironmentSchema = z.enum(['development', 'staging', 'production', 'test']);
type Environment = z.infer<typeof EnvironmentSchema>;

// ============================================
// SERVER CONFIG SCHEMA
// ============================================

const ServerConfigSchema = z.object({
  port: z.number().min(1).max(65535).default(3000),
  host: z.string().default('0.0.0.0'),
  env: EnvironmentSchema.default('development'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  corsOrigins: z.array(z.string()).default(['http://localhost:3000']),
  rateLimit: z.object({
    max: z.number().default(100),
    windowMs: z.number().default(60000) // 1 minute
  }).default({}),
  useMocks: z.boolean().default(false),
  apiPrefix: z.string().default('/api/v1')
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

// ============================================
// SECURITY CONFIG SCHEMA
// ============================================

const SecurityConfigSchema = z.object({
  jwtSecret: z.string().optional(),
  jwtExpiry: z.string().default('1h'),
  jwtRefreshExpiry: z.string().default('7d'),
  encryptionKey: z.string().optional(),
  apiKeyHeader: z.string().default('X-API-Key'),
  enableHelmet: z.boolean().default(true),
  enableCors: z.boolean().default(true)
});

export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

// ============================================
// EXTERNAL SERVICES CONFIG SCHEMA
// ============================================

const ExternalServicesSchema = z.object({
  // n8n Workflow
  n8n: z.object({
    webhookUrl: z.string().url().optional(),
    apiKey: z.string().optional(),
    enabled: z.boolean().default(false)
  }).default({}),

  // OpenAI for AI features
  openai: z.object({
    apiKey: z.string().optional(),
    model: z.string().default('gpt-4-turbo-preview'),
    enabled: z.boolean().default(false)
  }).default({}),

  // Pinecone for vector search
  pinecone: z.object({
    apiKey: z.string().optional(),
    environment: z.string().optional(),
    indexName: z.string().optional(),
    enabled: z.boolean().default(false)
  }).default({})
});

export type ExternalServicesConfig = z.infer<typeof ExternalServicesSchema>;

// ============================================
// FULL CONFIG SCHEMA
// ============================================

const AppConfigSchema = z.object({
  server: ServerConfigSchema,
  security: SecurityConfigSchema,
  database: z.any(), // Validated separately
  kafka: z.any(),    // Validated separately
  redis: z.any(),    // Validated separately
  connectors: z.any(), // Validated separately
  external: ExternalServicesSchema,
  tenantId: z.string().uuid().optional()
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

// ============================================
// CONFIGURATION LOADER
// ============================================

/**
 * Load and validate configuration from environment variables
 */
function loadConfig(): AppConfig {
  // Parse server config
  const server: ServerConfig = ServerConfigSchema.parse({
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    corsOrigins: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || ['http://localhost:3000'],
    rateLimit: {
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10)
    },
    useMocks: process.env.USE_MOCKS === 'true',
    apiPrefix: process.env.API_PREFIX || '/api/v1'
  });

  // Parse security config
  const security: SecurityConfig = SecurityConfigSchema.parse({
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY || '1h',
    jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    encryptionKey: process.env.ENCRYPTION_KEY,
    apiKeyHeader: process.env.API_KEY_HEADER || 'X-API-Key',
    enableHelmet: process.env.ENABLE_HELMET !== 'false',
    enableCors: process.env.ENABLE_CORS !== 'false'
  });

  // Parse external services config
  const external: ExternalServicesConfig = ExternalServicesSchema.parse({
    n8n: {
      webhookUrl: process.env.N8N_WEBHOOK_URL,
      apiKey: process.env.N8N_API_KEY,
      enabled: !!process.env.N8N_WEBHOOK_URL
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      enabled: !!process.env.OPENAI_API_KEY
    },
    pinecone: {
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT,
      indexName: process.env.PINECONE_INDEX,
      enabled: !!process.env.PINECONE_API_KEY
    }
  });

  return {
    server,
    security,
    database: databaseConfig,
    kafka: kafkaConfig,
    redis: redisConfig,
    connectors: connectorsConfig,
    external,
    tenantId: process.env.TENANT_ID
  };
}

// ============================================
// SINGLETON CONFIG INSTANCE
// ============================================

let _config: AppConfig | null = null;

/**
 * Get the application configuration
 */
export function getConfig(): AppConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

/**
 * Reload configuration (useful for testing)
 */
export function reloadConfig(): AppConfig {
  _config = loadConfig();
  return _config;
}

/**
 * Override configuration (useful for testing)
 */
export function setConfig(config: Partial<AppConfig>): void {
  _config = {
    ...getConfig(),
    ...config
  };
}

// ============================================
// CONVENIENCE ACCESSORS
// ============================================

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getConfig().server.env === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getConfig().server.env === 'development';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return getConfig().server.env === 'test';
}

/**
 * Check if mocks are enabled
 */
export function useMocks(): boolean {
  return getConfig().server.useMocks;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate that required environment variables are set
 */
export function validateRequiredEnvVars(vars: string[]): void {
  const missing = vars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Validate production configuration
 */
export function validateProductionConfig(): void {
  const config = getConfig();

  if (!isProduction()) {
    return;
  }

  const errors: string[] = [];

  // Check required production settings
  if (!config.security.jwtSecret) {
    errors.push('JWT_SECRET is required in production');
  }

  if (!config.security.encryptionKey) {
    errors.push('ENCRYPTION_KEY is required in production');
  }

  if (config.server.useMocks) {
    errors.push('USE_MOCKS must be false in production');
  }

  if (!config.database.supabaseKey) {
    errors.push('SUPABASE_KEY is required in production');
  }

  if (errors.length > 0) {
    throw new Error(
      `Production configuration errors:\n${errors.map(e => `  - ${e}`).join('\n')}`
    );
  }
}

// ============================================
// RE-EXPORTS
// ============================================

export { databaseConfig, type DatabaseConfig } from './database.js';
export { kafkaConfig, type KafkaConfig } from './kafka.js';
export { redisConfig, type RedisConfig } from './redis.js';
export { connectorsConfig, type ConnectorsConfig } from './connectors.js';
