const https = require('https');

const options = {
  hostname: 'jlsnbsxmyucmgfzaawxc.supabase.co',
  path: '/rest/v1/',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsc25ic3hteXVjbWdmemFhd3hjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkzNjc5MiwiZXhwIjoyMDcwNTEyNzkyfQ.RTMSpzNwruXADiDxsfNO-APl2cOHJmWaKLkhRD2o524',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsc25ic3hteXVjbWdmemFhd3hjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkzNjc5MiwiZXhwIjoyMDcwNTEyNzkyfQ.RTMSpzNwruXADiDxsfNO-APl2cOHJmWaKLkhRD2o524'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    const tables = Object.keys(result.paths || {})
      .filter(p => p !== '/' && !p.includes('rpc/'))
      .map(p => p.replace('/', ''))
      .sort();
    console.log('=== כל הטבלאות במסד הנתונים של SELAI ===');
    console.log('סה"כ:', tables.length, 'טבלאות\n');
    tables.forEach(t => console.log('-', t));
  });
}).on('error', e => console.error(e));
