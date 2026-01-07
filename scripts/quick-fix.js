const fs = require("fs");
const path = "src/components/ProjectCard.tsx";
let c = fs.readFileSync(path, "utf8");
c = c.replace("ArrowLeft } from", "ArrowLeft, AlertCircle } from");
c = c.replace("lastImport: string | null;\n}", "lastImport: string | null;\n  isConfigured: boolean;\n  error?: string;\n}");
c = c.replace("const [stats, setStats] = useState<ProjectStats>({ records: null, tables: null, lastImport: null });", "const [stats, setStats] = useState<ProjectStats>({\n    records: null,\n    tables: null,\n    lastImport: null,\n    isConfigured: project.is_configured ?? false,\n  });");
c = c.replace("const urlHost = new URL(project.supabase_url).host;", "let urlHost = \x27\x27;\n  try {\n    if (project.supabase_url) urlHost = new URL(project.supabase_url).host;\n  } catch { urlHost = \x27לא מוגדר\x27; }");
fs.writeFileSync(path, c);
console.log("Done");
