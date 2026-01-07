const fs = require('fs');
let content = fs.readFileSync('src/components/ProjectCard.tsx', 'utf8');

// 1. Update interface if needed
if (!content.includes('isConfigured: boolean;')) {
  content = content.replace(
    'lastImport: string | null;\n}',
    'lastImport: string | null;\n  isConfigured: boolean;\n  error?: string;\n}'
  );
}

// 2. Update useEffect to handle unconfigured
const oldUseEffect = `useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(\`/api/projects/\${project.id}/master-data\`);
        if (res.ok) {
          const data = await res.json();
          setStats({
            records: data.stats?.total || 0,
            tables: 1, // master_data table
            lastImport: null, // Would need to fetch from import_history
          });
        }
      } catch (error) {
        // Ignore errors - stats are optional
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [project.id]);`;

const newUseEffect = `useEffect(() => {
    const fetchStats = async () => {
      if (!project.is_configured) {
        setStats(prev => ({ ...prev, isConfigured: false }));
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(\`/api/projects/\${project.id}/master-data\`);
        const data = await res.json();
        if (res.ok) {
          setStats({
            records: data.stats?.total || 0,
            tables: 1,
            lastImport: null,
            isConfigured: true,
          });
        } else {
          setStats(prev => ({
            ...prev,
            isConfigured: data.errorCode !== 'NOT_CONFIGURED',
            error: data.error,
          }));
        }
      } catch (error) {
        setStats(prev => ({ ...prev, error: 'Network error' }));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [project.id, project.is_configured]);`;

if (content.includes('// master_data table')) {
  content = content.replace(oldUseEffect, newUseEffect);
}

fs.writeFileSync('src/components/ProjectCard.tsx', content);
console.log('Done!');
