const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsc25ic3hteXVjbWdmemFhd3hjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkzNjc5MiwiZXhwIjoyMDcwNTEyNzkyfQ.RTMSpzNwruXADiDxsfNO-APl2cOHJmWaKLkhRD2o524';

// Main tables to analyze (excluding backups)
const mainTables = [
  'users',
  'clients',
  'leads',
  'contacts',
  'deals',
  'policies',
  'products',
  'tasks',
  'meetings',
  'documents',
  'external_agents',
  'supervisors',
  'business_units',
  'insurance_companies',
  'campaigns',
  'messages',
  'automation_rules',
  'connectors',
  'customer_profiles',
  'customer_policies',
];

async function fetchTable(tableName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'jlsnbsxmyucmgfzaawxc.supabase.co',
      path: `/rest/v1/${tableName}?select=*&limit=3`,
      headers: {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Prefer': 'count=exact'
      }
    };

    https.get(options, (res) => {
      let data = '';
      const count = res.headers['content-range'];
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const rows = JSON.parse(data);
          resolve({ tableName, rows, count });
        } catch(e) {
          resolve({ tableName, rows: [], count: '0', error: data });
        }
      });
    }).on('error', reject);
  });
}

async function analyze() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       ניתוח מסד הנתונים של SELAI - בית סוכן                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  for (const table of mainTables) {
    try {
      const { rows, count } = await fetchTable(table);
      const totalCount = count ? count.split('/')[1] : '0';

      console.log(`\n📊 ${table}`);
      console.log(`   רשומות: ${totalCount}`);

      if (rows && rows.length > 0) {
        const columns = Object.keys(rows[0]);
        console.log(`   שדות: ${columns.slice(0, 8).join(', ')}${columns.length > 8 ? '...' : ''}`);

        // Show sample for important tables
        if (['users', 'clients', 'external_agents'].includes(table) && rows[0]) {
          console.log(`   דוגמה:`);
          const sample = rows[0];
          if (sample.full_name) console.log(`     - שם: ${sample.full_name}`);
          if (sample.email) console.log(`     - מייל: ${sample.email}`);
          if (sample.role) console.log(`     - תפקיד: ${sample.role}`);
          if (sample.status) console.log(`     - סטטוס: ${sample.status}`);
        }
      }
    } catch(e) {
      console.log(`\n❌ ${table}: שגיאה בקריאה`);
    }
  }

  console.log('\n' + '═'.repeat(70));
}

analyze();
