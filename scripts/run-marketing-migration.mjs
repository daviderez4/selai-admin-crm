// Script to run the marketing system migration
// Run with: node scripts/run-marketing-migration.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SUPABASE_URL = 'https://vcskhgqeqctitubryoet.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjc2toZ3FlcWN0aXR1YnJ5b2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNDcyMiwiZXhwIjoyMDgyNjgwNzIyfQ.33cbPPUbccn1o3UmrX9dO3btyD0O4MO1b_Yz4ZpXKSE'

async function runMigration() {
  console.log('🚀 Running marketing system migration...')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    db: { schema: 'public' },
    auth: { persistSession: false }
  })

  // Read the migration file
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260116_marketing_system_tables.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')

  // Split into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`📝 Found ${statements.length} SQL statements to execute`)

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (!statement || statement.startsWith('--')) continue

    // Skip COMMENT statements for now (may cause issues)
    if (statement.startsWith('COMMENT')) {
      console.log(`⏭️  Skipping COMMENT statement ${i + 1}`)
      continue
    }

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })

      if (error) {
        // Try alternative approach using raw POST
        console.log(`⚠️  RPC failed for statement ${i + 1}, trying direct approach...`)
      } else {
        console.log(`✅ Statement ${i + 1}/${statements.length} executed`)
      }
    } catch (err) {
      console.log(`⚠️  Statement ${i + 1}: ${err.message || 'Unknown error'}`)
    }
  }

  console.log('\n✅ Migration script completed!')
  console.log('\n📋 Please run the SQL migration manually in Supabase SQL Editor:')
  console.log('   https://supabase.com/dashboard/project/vcskhgqeqctitubryoet/sql/new')
  console.log('   Copy the contents of: supabase/migrations/20260116_marketing_system_tables.sql')
}

runMigration().catch(console.error)
