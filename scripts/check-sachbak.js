const { createClient } = require('@supabase/supabase-js');

// Sachbak Supabase - need anon key to connect
const SACHBAK_URL = 'https://vgrs1fmumrwzwrj1wonx.supabase.co';

// Try to list tables using the information_schema
async function main() {
  // We need the anon key or service key from the project record
  // Let's first get it from our central database

  const central = createClient(
    'https://vcskhgqeqctitubryoet.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjc2toZ3FlcWN0aXR1YnJ5b2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNDcyMiwiZXhwIjoyMDgyNjgwNzIyfQ.33cbPPUbccn1o3UmrX9dO3btyD0O4MO1b_Yz4ZpXKSE'
  );

  // Get the Sachbak project credentials
  const { data: project } = await central
    .from('projects')
    .select('*')
    .eq('id', 'dc55b826-e9da-4606-a659-7a4c6c3847f7')
    .single();

  console.log('\n=== Sachbak Project Record ===');
  console.log('Name:', project.name);
  console.log('URL:', project.supabase_url);
  console.log('Table Name:', project.table_name);
  console.log('Anon Key:', project.supabase_anon_key ? project.supabase_anon_key.substring(0, 50) + '...' : '[MISSING]');
  console.log('Service Key (encrypted):', project.supabase_service_key ? project.supabase_service_key.substring(0, 30) + '...' : '[MISSING]');

  // Try to connect to Sachbak with the anon key
  if (project.supabase_anon_key) {
    console.log('\n=== Trying to connect to Sachbak ===');
    const sachbak = createClient(SACHBAK_URL, project.supabase_anon_key);

    // Try to query some common table names
    const tableNames = ['master_data', 'insurance_data', 'data', 'records', 'processes'];

    for (const tableName of tableNames) {
      const { data, error, count } = await sachbak
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`✓ Table "${tableName}" exists - ${count} records`);
      } else if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        console.log(`✗ Table "${tableName}" does not exist`);
      } else {
        console.log(`? Table "${tableName}" - Error: ${error.message}`);
      }
    }
  }
}

main().catch(console.error);
