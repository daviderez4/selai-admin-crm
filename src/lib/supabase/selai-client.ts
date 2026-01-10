import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// SELAI Main Supabase - Source of Truth for agents, supervisors, clients
const SELAI_SUPABASE_URL = process.env.SELAI_SUPABASE_URL || 'https://jlsnbsxmyucmgfzaawxc.supabase.co';

// Server-side client with service role for admin operations
export function createSelaiServerClient() {
  const serviceKey = process.env.SELAI_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SELAI_SERVICE_ROLE_KEY is not configured');
  }
  return createSupabaseClient(SELAI_SUPABASE_URL, serviceKey);
}
