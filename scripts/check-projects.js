const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vcskhgqeqctitubryoet.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjc2toZ3FlcWN0aXR1YnJ5b2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNDcyMiwiZXhwIjoyMDgyNjgwNzIyfQ.33cbPPUbccn1o3UmrX9dO3btyD0O4MO1b_Yz4ZpXKSE'
);

async function main() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, supabase_url, table_name, supabase_service_key, supabase_anon_key');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== All Projects ===\n');
  data.forEach(p => {
    console.log(`Name: ${p.name}`);
    console.log(`ID: ${p.id}`);
    console.log(`URL: ${p.supabase_url}`);
    console.log(`Table: ${p.table_name}`);
    console.log(`Service Key: ${p.supabase_service_key ? '[ENCRYPTED - ' + p.supabase_service_key.substring(0, 20) + '...]' : '[MISSING]'}`);
    console.log(`Anon Key: ${p.supabase_anon_key ? '[SET]' : '[MISSING]'}`);
    console.log('---');
  });
}

main();
