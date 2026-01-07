/**
 * Project Database Utility
 *
 * Handles all project-specific database connections with STRICT isolation.
 * NO FALLBACK to Central database - each project MUST have its own credentials.
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

// ============================================================================
// Types
// ============================================================================

export interface ProjectCredentials {
  supabase_url: string;
  supabase_anon_key?: string;
  supabase_service_key: string;
  table_name: string;
  is_configured?: boolean;
}

export type ProjectClientErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_URL'
  | 'MISSING_SERVICE_KEY'
  | 'DECRYPT_ERROR'
  | 'CONNECTION_ERROR';

export interface ProjectClientResult {
  success: boolean;
  client?: SupabaseClient;
  error?: string;
  errorCode?: ProjectClientErrorCode;
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  tableExists?: boolean;
  rowCount?: number;
}

// ============================================================================
// Encryption Functions
// ============================================================================

/**
 * Encrypts text using AES-256-CBC.
 * Returns format: "iv:encryptedHex"
 */
export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts text encrypted with encrypt().
 * Expects format: "iv:encryptedHex"
 */
export function decrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  if (!text || !text.includes(':')) {
    throw new Error('Invalid encrypted text format');
  }

  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = textParts.join(':');
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ============================================================================
// URL Normalization
// ============================================================================

/**
 * Normalizes Supabase URL to API format.
 * Converts dashboard URLs (https://supabase.com/dashboard/project/xxx)
 * to API URLs (https://xxx.supabase.co)
 */
export function normalizeSupabaseUrl(url: string): string {
  if (!url) return '';

  // Handle dashboard URLs
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dashboardMatch) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Already in correct format
  return url.trim();
}

/**
 * Validates that a URL is a valid Supabase API URL.
 */
export function isValidSupabaseUrl(url: string): boolean {
  if (!url) return false;
  const normalized = normalizeSupabaseUrl(url);
  return /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(normalized);
}

// ============================================================================
// Project Client Creation
// ============================================================================

/**
 * Creates a Supabase client for a specific project.
 *
 * STRICT ISOLATION: This function NEVER falls back to Central database.
 * If the project doesn't have valid credentials, it returns an error.
 *
 * @param project - Project credentials object
 * @returns ProjectClientResult with either a client or error details
 */
export function createProjectClient(project: ProjectCredentials): ProjectClientResult {
  // Check if project is marked as configured
  if (project.is_configured === false) {
    return {
      success: false,
      error: 'Project database is not configured. Please set up database credentials in project settings.',
      errorCode: 'NOT_CONFIGURED',
    };
  }

  // Validate URL
  const normalizedUrl = normalizeSupabaseUrl(project.supabase_url);
  if (!isValidSupabaseUrl(normalizedUrl)) {
    return {
      success: false,
      error: `Invalid Supabase URL: ${project.supabase_url}. Expected format: https://xxxxx.supabase.co`,
      errorCode: 'INVALID_URL',
    };
  }

  // Check service key exists
  if (!project.supabase_service_key) {
    return {
      success: false,
      error: 'Missing service key. Please configure database credentials.',
      errorCode: 'MISSING_SERVICE_KEY',
    };
  }

  // Decrypt service key
  let serviceKey: string;
  try {
    serviceKey = decrypt(project.supabase_service_key);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown decryption error';
    return {
      success: false,
      error: `Failed to decrypt service key: ${errorMessage}`,
      errorCode: 'DECRYPT_ERROR',
    };
  }

  // Create client
  try {
    const client = createSupabaseClient(normalizedUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
    });

    return { success: true, client };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create Supabase client: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'CONNECTION_ERROR',
    };
  }
}

// ============================================================================
// Connection Testing
// ============================================================================

/**
 * Tests if the provided credentials can connect to the Supabase instance
 * and verifies that the specified table exists.
 *
 * @param url - Supabase URL
 * @param anonKey - Anon key (for reference)
 * @param serviceKey - Service key (plain text, not encrypted)
 * @param tableName - Table name to verify
 * @returns ConnectionTestResult with success status and details
 */
export async function testProjectConnection(
  url: string,
  anonKey: string,
  serviceKey: string,
  tableName: string
): Promise<ConnectionTestResult> {
  // Validate URL format
  const normalizedUrl = normalizeSupabaseUrl(url);
  if (!isValidSupabaseUrl(normalizedUrl)) {
    return {
      success: false,
      error: `Invalid Supabase URL format. Expected: https://xxxxx.supabase.co, got: ${url}`
    };
  }

  // Validate keys are present
  if (!serviceKey?.trim()) {
    return {
      success: false,
      error: 'Service key is required'
    };
  }

  if (!tableName?.trim()) {
    return {
      success: false,
      error: 'Table name is required'
    };
  }

  try {
    const client = createSupabaseClient(normalizedUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Test connection by querying a non-existent table
    // If we get specific error codes, connection works but table doesn't exist
    const { error: connError } = await client
      .from('_connection_test_nonexistent_')
      .select('id')
      .limit(1);

    // Check if this is an auth error vs table not found
    if (connError) {
      // HTML response usually means invalid credentials
      if (connError.message?.includes('<!DOCTYPE') || connError.message?.includes('<html')) {
        return {
          success: false,
          error: 'Authentication failed - invalid credentials'
        };
      }

      // These error codes indicate connection works, table just doesn't exist (expected)
      const expectedErrors = ['42P01', 'PGRST116', 'PGRST204'];
      if (!expectedErrors.includes(connError.code || '')) {
        // Other errors might indicate real problems
        if (connError.message?.includes('JWT') || connError.message?.includes('token')) {
          return {
            success: false,
            error: 'Invalid JWT token - check your service key'
          };
        }
      }
    }

    // Connection works! Now check if target table exists
    const { data, error: tableError, count } = await client
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (tableError) {
      // Table doesn't exist
      if (tableError.code === '42P01' || tableError.message?.includes('schema cache')) {
        return {
          success: true,
          tableExists: false,
          error: `Table '${tableName}' does not exist in this database`
        };
      }

      return {
        success: false,
        error: `Error checking table: ${tableError.message}`
      };
    }

    // Success - table exists
    return {
      success: true,
      tableExists: true,
      rowCount: count || 0
    };

  } catch (error) {
    return {
      success: false,
      error: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Tests connection using encrypted credentials from a project record.
 *
 * @param project - Project credentials object with encrypted service key
 * @returns ConnectionTestResult
 */
export async function testProjectConnectionFromCredentials(
  project: ProjectCredentials
): Promise<ConnectionTestResult> {
  const normalizedUrl = normalizeSupabaseUrl(project.supabase_url);

  if (!isValidSupabaseUrl(normalizedUrl)) {
    return {
      success: false,
      error: `Invalid Supabase URL: ${project.supabase_url}`
    };
  }

  if (!project.supabase_service_key) {
    return {
      success: false,
      error: 'Missing service key'
    };
  }

  let serviceKey: string;
  try {
    serviceKey = decrypt(project.supabase_service_key);
  } catch (error) {
    return {
      success: false,
      error: `Failed to decrypt service key: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }

  return testProjectConnection(
    normalizedUrl,
    project.supabase_anon_key || '',
    serviceKey,
    project.table_name
  );
}
