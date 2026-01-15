/**
 * SELAI Insurance Integration Hub
 * Database Configuration - הגדרות בסיס נתונים
 *
 * Configuration for Supabase PostgreSQL connection
 */

import { z } from 'zod';

// ============================================
// DATABASE CONFIG SCHEMA
// ============================================

const DatabaseConfigSchema = z.object({
  // Supabase connection
  supabaseUrl: z.string().url().optional(),
  supabaseKey: z.string().optional(),
  supabaseServiceKey: z.string().optional(),

  // Connection pool settings
  pool: z.object({
    min: z.number().default(2),
    max: z.number().default(10),
    idleTimeoutMs: z.number().default(30000),
    connectionTimeoutMs: z.number().default(10000)
  }).default({}),

  // Query settings
  query: z.object({
    timeout: z.number().default(30000), // 30 seconds
    maxRetries: z.number().default(3)
  }).default({}),

  // Schema settings
  schema: z.string().default('public'),

  // SSL settings
  ssl: z.object({
    enabled: z.boolean().default(true),
    rejectUnauthorized: z.boolean().default(true)
  }).default({})
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

// ============================================
// LOAD DATABASE CONFIG
// ============================================

function loadDatabaseConfig(): DatabaseConfig {
  return DatabaseConfigSchema.parse({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,

    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10)
    },

    query: {
      timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000', 10),
      maxRetries: parseInt(process.env.DB_MAX_RETRIES || '3', 10)
    },

    schema: process.env.DB_SCHEMA || 'public',

    ssl: {
      enabled: process.env.DB_SSL !== 'false',
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    }
  });
}

// ============================================
// EXPORT
// ============================================

export const databaseConfig = loadDatabaseConfig();

/**
 * Validate that database is configured
 */
export function isDatabaseConfigured(): boolean {
  return !!(databaseConfig.supabaseUrl && databaseConfig.supabaseKey);
}

/**
 * Get connection string for direct PostgreSQL connection (if needed)
 */
export function getConnectionString(): string | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return url;
}
