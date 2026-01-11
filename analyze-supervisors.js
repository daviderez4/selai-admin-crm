const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjc2toZ3FlcWN0aXR1YnJ5b2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNDcyMiwiZXhwIjoyMDgyNjgwNzIyfQ.33cbPPUbccn1o3UmrX9dO3btyD0O4MO1b_Yz4ZpXKSE';

const req = https.request({
  hostname: 'vcskhgqeqctitubryoet.supabase.co',
  path: '/rest/v1/master_data?select=raw_data,total_expected_accumulation,producer_new,product_type_new',
  method: 'GET',
  headers: {
    'apikey': API_KEY,
    'Authorization': `Bearer ${API_KEY}`
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const rows = JSON.parse(data);

    // Group by supervisor (index 136 in raw_data)
    const bySupervisor = {};
    const byProductAndProducer = {};

    rows.forEach(r => {
      if (!r.raw_data || !Array.isArray(r.raw_data)) return;
      const supervisor = r.raw_data[145] || 'לא מוגדר';
      const amount = r.total_expected_accumulation || 0;
      const product = r.product_type_new || 'לא מוגדר';
      const producer = r.producer_new || 'לא מוגדר';

      // By supervisor
      if (!bySupervisor[supervisor]) {
        bySupervisor[supervisor] = { total: 0, count: 0 };
      }
      bySupervisor[supervisor].total += amount;
      bySupervisor[supervisor].count++;

      // By product and producer
      const key = `${product}|${producer}`;
      if (!byProductAndProducer[key]) {
        byProductAndProducer[key] = { product, producer, total: 0, count: 0 };
      }
      byProductAndProducer[key].total += amount;
      byProductAndProducer[key].count++;
    });

    console.log('=== סיכום לפי מפקח ===\n');
    Object.entries(bySupervisor)
      .sort((a,b) => b[1].total - a[1].total)
      .slice(0,15)
      .forEach(([name, data]) => {
        console.log(`${name}: ${data.total.toLocaleString()} ש"ח (${data.count} רשומות)`);
      });

    console.log('\n\n=== סיכום לפי מוצר ויצרן (טופ 20) ===\n');
    Object.values(byProductAndProducer)
      .sort((a,b) => b.total - a.total)
      .slice(0,20)
      .forEach(data => {
        console.log(`${data.product} | ${data.producer}: ${data.total.toLocaleString()} ש"ח`);
      });
  });
});
req.end();
