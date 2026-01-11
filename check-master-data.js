const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsc25ic3hteXVjbWdmemFhd3hjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkzNjc5MiwiZXhwIjoyMDcwNTEyNzkyfQ.RTMSpzNwruXADiDxsfNO-APl2cOHJmWaKLkhRD2o524';

const req = https.request({
  hostname: 'jlsnbsxmyucmgfzaawxc.supabase.co',
  path: '/rest/v1/master_data?select=*&limit=2',
  method: 'GET',
  headers: {
    'apikey': API_KEY,
    'Authorization': `Bearer ${API_KEY}`
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const rows = JSON.parse(data);
      if (rows.length > 0) {
        console.log('=== COLUMNS IN master_data ===\n');
        const cols = Object.keys(rows[0]);
        cols.forEach((col, i) => console.log(`${i+1}. ${col}`));
        console.log('\n=== SAMPLE VALUES ===\n');
        console.log(JSON.stringify(rows[0], null, 2));
      } else {
        console.log('No data in master_data');
        console.log('Response:', data);
      }
    } catch(e) {
      console.log('Parse error:', e.message);
      console.log('Raw response:', data);
    }
  });
});
req.on('error', e => console.error('Request error:', e));
req.end();
