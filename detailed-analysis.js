const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsc25ic3hteXVjbWdmemFhd3hjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkzNjc5MiwiZXhwIjoyMDcwNTEyNzkyfQ.RTMSpzNwruXADiDxsfNO-APl2cOHJmWaKLkhRD2o524';

async function fetchTable(tableName, limit = 5) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'jlsnbsxmyucmgfzaawxc.supabase.co',
      path: `/rest/v1/${tableName}?select=*&limit=${limit}`,
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
          resolve({ rows: JSON.parse(data), count });
        } catch(e) {
          resolve({ rows: [], count: '0' });
        }
      });
    }).on('error', reject);
  });
}

async function analyze() {
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('                פירוט מלא של מסד הנתונים SELAI                      ');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // 1. Users
  console.log('\n👥 משתמשים (users) - 14 רשומות');
  console.log('─'.repeat(50));
  const { rows: users } = await fetchTable('users', 14);
  users.forEach(u => {
    console.log(`  • ${u.full_name || 'ללא שם'}`);
    console.log(`    תפקיד: ${u.role}, מייל: ${u.email || '-'}`);
    if (u.agent_number) console.log(`    מספר סוכן: ${u.agent_number}`);
  });

  // 2. External Agents
  console.log('\n\n👔 סוכנים חיצוניים (external_agents) - 398 רשומות');
  console.log('─'.repeat(50));
  const { rows: agents } = await fetchTable('external_agents', 10);
  agents.forEach(a => {
    console.log(`  • ${a.full_name} | רישיון: ${a.license_number || '-'} | טלפון: ${a.mobile_phone || '-'}`);
  });

  // 3. Supervisors
  console.log('\n\n👨‍💼 מפקחים (supervisors) - 12 רשומות');
  console.log('─'.repeat(50));
  const { rows: supervisors } = await fetchTable('supervisors', 12);
  supervisors.forEach(s => {
    console.log(`  • ${s.name} | מייל: ${s.email || '-'} | פעיל: ${s.is_active ? 'כן' : 'לא'}`);
  });

  // 4. Insurance Companies
  console.log('\n\n🏢 חברות ביטוח (insurance_companies) - 7 רשומות');
  console.log('─'.repeat(50));
  const { rows: companies } = await fetchTable('insurance_companies', 7);
  companies.forEach(c => {
    console.log(`  • ${c.name} (${c.code || '-'})`);
  });

  // 5. Contacts
  console.log('\n\n📇 אנשי קשר (contacts) - 41 רשומות');
  console.log('─'.repeat(50));
  const { rows: contacts } = await fetchTable('contacts', 5);
  contacts.forEach(c => {
    const name = c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'ללא שם';
    console.log(`  • ${name} | טלפון: ${c.phone || c.mobile || '-'} | סטטוס: ${c.status || '-'}`);
  });

  // 6. Connectors
  console.log('\n\n🔌 חיבורים (connectors) - 6 רשומות');
  console.log('─'.repeat(50));
  const { rows: connectors } = await fetchTable('connectors', 6);
  connectors.forEach(c => {
    console.log(`  • ${c.display_name_he || c.name} | קטגוריה: ${c.category || '-'} | פעיל: ${c.is_active ? 'כן' : 'לא'}`);
  });

  // 7. Business Units
  console.log('\n\n🏬 יחידות עסקיות (business_units) - 2 רשומות');
  console.log('─'.repeat(50));
  const { rows: units } = await fetchTable('business_units', 5);
  units.forEach(u => {
    console.log(`  • ${u.name} | ${u.description || '-'}`);
  });

  // 8. Clients
  console.log('\n\n👤 לקוחות (clients) - 8 רשומות');
  console.log('─'.repeat(50));
  const { rows: clients } = await fetchTable('clients', 8);
  clients.forEach(c => {
    const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'ללא שם';
    console.log(`  • ${name} | טלפון: ${c.phone || '-'} | סטטוס: ${c.status || '-'}`);
  });

  // 9. Agent-Supervisor Relations
  console.log('\n\n🔗 קשרי סוכן-מפקח (agent_supervisor_relations)');
  console.log('─'.repeat(50));
  const { rows: relations, count: relCount } = await fetchTable('agent_supervisor_relations', 10);
  console.log(`  סה"כ: ${relCount ? relCount.split('/')[1] : relations.length} קשרים`);

  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('                           סיכום                                    ');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`
  📊 נתונים עיקריים במערכת:

  • משתמשים: 14 (סוכנים, מנהלים)
  • סוכנים חיצוניים: 398
  • מפקחים: 12
  • חברות ביטוח: 7
  • אנשי קשר: 41
  • לקוחות: 8
  • יחידות עסקיות: 2
  • חיבורים (APIs): 6

  📭 טבלאות ריקות (עדיין לא בשימוש):
  • leads (לידים)
  • deals (עסקאות)
  • policies (פוליסות)
  • tasks (משימות)
  • meetings (פגישות)
  • documents (מסמכים)
  • campaigns (קמפיינים)
  • messages (הודעות)
  • automation_rules (כללי אוטומציה)
  `);
}

analyze().catch(console.error);
