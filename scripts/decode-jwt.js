const { createClient } = require('@supabase/supabase-js');

async function main() {
  const central = createClient(
    'https://vcskhgqeqctitubryoet.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjc2toZ3FlcWN0aXR1YnJ5b2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNDcyMiwiZXhwIjoyMDgyNjgwNzIyfQ.33cbPPUbccn1o3UmrX9dO3btyD0O4MO1b_Yz4ZpXKSE'
  );

  const { data: project } = await central
    .from('projects')
    .select('supabase_anon_key, supabase_service_key')
    .eq('id', 'dc55b826-e9da-4606-a659-7a4c6c3847f7')
    .single();

  if (project.supabase_anon_key) {
    // Decode JWT payload (base64)
    const parts = project.supabase_anon_key.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('\n=== Anon Key JWT Payload ===');
      console.log('Project Ref:', payload.ref);
      console.log('Role:', payload.role);
      console.log('Issuer:', payload.iss);
    }
  }

  console.log('\n=== Expected vs Stored ===');
  console.log('Expected project ref: vgrs1fmumrwzwrj1wonx');
  console.log('Check if anon key matches this project ref');
}

main().catch(console.error);
