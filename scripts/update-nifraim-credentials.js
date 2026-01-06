/**
 * Script to update "נפרעים" project credentials
 *
 * Usage:
 * 1. Open http://localhost:3000 and login
 * 2. Open browser DevTools (F12) → Console
 * 3. Paste this entire script and press Enter
 * 4. Enter the anon_key and service_key when prompted
 */

(async function updateNifraimCredentials() {
  const SUPABASE_URL = 'https://vgrs1fmumrwzwrj1wonx.supabase.co';

  // First, find the נפרעים project
  console.log('🔍 Searching for נפרעים project...');

  // Get all projects from the page (they should be loaded)
  const projectCards = document.querySelectorAll('[data-project-id]');
  let nifraimId = null;

  projectCards.forEach(card => {
    const name = card.querySelector('[data-project-name]')?.textContent;
    if (name && name.includes('נפרעים')) {
      nifraimId = card.getAttribute('data-project-id');
    }
  });

  // If not found via DOM, prompt for ID
  if (!nifraimId) {
    nifraimId = prompt('Enter the project ID for נפרעים (check URL when clicking the project):');
    if (!nifraimId) {
      console.log('❌ Cancelled');
      return;
    }
  }

  console.log('📋 Project ID:', nifraimId);

  // Get credentials from user
  const anonKey = prompt('Enter Supabase ANON KEY for סחבק:');
  if (!anonKey) {
    console.log('❌ Cancelled - anon key required');
    return;
  }

  const serviceKey = prompt('Enter Supabase SERVICE KEY for סחבק (recommended):');

  console.log('🔄 Updating credentials...');

  try {
    const response = await fetch(`/api/projects/${nifraimId}/update-credentials`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supabase_url: SUPABASE_URL,
        supabase_anon_key: anonKey,
        supabase_service_key: serviceKey || undefined,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Success!', result.message);
      console.log('🔄 Refreshing page in 2 seconds...');
      setTimeout(() => location.reload(), 2000);
    } else {
      console.error('❌ Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
})();
