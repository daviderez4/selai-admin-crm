import React, { useState } from 'react';
import {
  Shield, Users, Eye, Edit, Trash2, Lock, Unlock,
  ChevronDown, ChevronRight, Database, User, UserCheck,
  Building, Briefcase, CheckCircle, XCircle, AlertCircle,
  FileText, Calendar, MessageSquare, FolderOpen, Target
} from 'lucide-react';

// Role definitions with colors
const roles = {
  admin: {
    label: 'מנהל',
    color: 'red',
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/30',
    icon: Shield
  },
  manager: {
    label: 'מנהל אזור',
    color: 'orange',
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/30',
    icon: Building
  },
  supervisor: {
    label: 'מפקח',
    color: 'yellow',
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-500/30',
    icon: UserCheck
  },
  agent: {
    label: 'סוכן',
    color: 'blue',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    icon: User
  },
  client: {
    label: 'לקוח',
    color: 'green',
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-400',
    borderColor: 'border-green-500/30',
    icon: Users
  }
};

// Table definitions with access matrix
const tables = [
  {
    name: 'user_profiles',
    label: 'משתמשים',
    icon: Users,
    access: {
      admin: { read: 'all', write: 'all', delete: 'all' },
      manager: { read: 'assigned', write: 'none', delete: 'none' },
      supervisor: { read: 'team', write: 'self', delete: 'none' },
      agent: { read: 'self', write: 'self', delete: 'none' },
      client: { read: 'self', write: 'self', delete: 'none' }
    }
  },
  {
    name: 'contacts',
    label: 'אנשי קשר',
    icon: User,
    access: {
      admin: { read: 'all', write: 'all', delete: 'all' },
      manager: { read: 'assigned', write: 'assigned', delete: 'assigned' },
      supervisor: { read: 'team', write: 'team', delete: 'team' },
      agent: { read: 'own', write: 'own', delete: 'own' },
      client: { read: 'none', write: 'none', delete: 'none' }
    }
  },
  {
    name: 'leads',
    label: 'לידים',
    icon: Target,
    access: {
      admin: { read: 'all', write: 'all', delete: 'all' },
      manager: { read: 'assigned', write: 'assigned', delete: 'assigned' },
      supervisor: { read: 'team', write: 'team', delete: 'team' },
      agent: { read: 'own', write: 'own', delete: 'own' },
      client: { read: 'none', write: 'none', delete: 'none' }
    }
  },
  {
    name: 'clients',
    label: 'לקוחות',
    icon: Briefcase,
    access: {
      admin: { read: 'all', write: 'all', delete: 'all' },
      manager: { read: 'assigned', write: 'assigned', delete: 'none' },
      supervisor: { read: 'team', write: 'team', delete: 'none' },
      agent: { read: 'own', write: 'own', delete: 'none' },
      client: { read: 'self', write: 'none', delete: 'none' }
    }
  },
  {
    name: 'policies',
    label: 'פוליסות',
    icon: FileText,
    access: {
      admin: { read: 'all', write: 'all', delete: 'all' },
      manager: { read: 'assigned', write: 'assigned', delete: 'none' },
      supervisor: { read: 'team', write: 'team', delete: 'none' },
      agent: { read: 'own', write: 'own', delete: 'none' },
      client: { read: 'own', write: 'none', delete: 'none' }
    }
  },
  {
    name: 'tasks',
    label: 'משימות',
    icon: CheckCircle,
    access: {
      admin: { read: 'all', write: 'all', delete: 'all' },
      manager: { read: 'assigned', write: 'assigned', delete: 'assigned' },
      supervisor: { read: 'team', write: 'team', delete: 'team' },
      agent: { read: 'own', write: 'own', delete: 'own' },
      client: { read: 'none', write: 'none', delete: 'none' }
    }
  },
  {
    name: 'meetings',
    label: 'פגישות',
    icon: Calendar,
    access: {
      admin: { read: 'all', write: 'all', delete: 'all' },
      manager: { read: 'assigned', write: 'assigned', delete: 'assigned' },
      supervisor: { read: 'team', write: 'team', delete: 'team' },
      agent: { read: 'own', write: 'own', delete: 'own' },
      client: { read: 'own', write: 'none', delete: 'none' }
    }
  },
  {
    name: 'documents',
    label: 'מסמכים',
    icon: FolderOpen,
    access: {
      admin: { read: 'all', write: 'all', delete: 'all' },
      manager: { read: 'assigned', write: 'assigned', delete: 'none' },
      supervisor: { read: 'team', write: 'team', delete: 'none' },
      agent: { read: 'own', write: 'own', delete: 'own' },
      client: { read: 'shared', write: 'none', delete: 'none' }
    }
  },
  {
    name: 'messages',
    label: 'הודעות',
    icon: MessageSquare,
    access: {
      admin: { read: 'all', write: 'all', delete: 'all' },
      manager: { read: 'own', write: 'own', delete: 'none' },
      supervisor: { read: 'own', write: 'own', delete: 'none' },
      agent: { read: 'own', write: 'own', delete: 'none' },
      client: { read: 'own', write: 'own', delete: 'none' }
    }
  },
  {
    name: 'audit_logs',
    label: 'יומן ביקורת',
    icon: Database,
    access: {
      admin: { read: 'all', write: 'system', delete: 'none' },
      manager: { read: 'assigned', write: 'none', delete: 'none' },
      supervisor: { read: 'team', write: 'none', delete: 'none' },
      agent: { read: 'own', write: 'none', delete: 'none' },
      client: { read: 'none', write: 'none', delete: 'none' }
    }
  }
];

// Access level descriptions
const accessLevels = {
  all: { label: 'הכל', color: 'text-green-400', icon: Unlock },
  assigned: { label: 'מוקצה', color: 'text-blue-400', icon: Eye },
  team: { label: 'צוות', color: 'text-cyan-400', icon: Users },
  own: { label: 'אישי', color: 'text-yellow-400', icon: User },
  self: { label: 'עצמי', color: 'text-yellow-400', icon: User },
  shared: { label: 'משותף', color: 'text-purple-400', icon: Eye },
  system: { label: 'מערכת', color: 'text-gray-400', icon: Lock },
  none: { label: 'חסום', color: 'text-red-400', icon: Lock }
};

// Helper functions
const HelperFunction = ({ name, description, params, returns }: {
  name: string;
  description: string;
  params?: string;
  returns: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <code className="text-cyan-400 font-mono text-sm">{name}()</code>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-white/60" /> : <ChevronRight className="w-4 h-4 text-white/60" />}
      </button>
      {isOpen && (
        <div className="p-4 pt-0 border-t border-white/10 space-y-2">
          <p className="text-white/70 text-sm">{description}</p>
          {params && (
            <div className="text-sm">
              <span className="text-white/50">פרמטרים: </span>
              <code className="text-purple-400">{params}</code>
            </div>
          )}
          <div className="text-sm">
            <span className="text-white/50">מחזיר: </span>
            <code className="text-green-400">{returns}</code>
          </div>
        </div>
      )}
    </div>
  );
};

// Access Cell Component
const AccessCell = ({ access, type }: { access: string; type: 'read' | 'write' | 'delete' }) => {
  const level = accessLevels[access as keyof typeof accessLevels] || accessLevels.none;

  const typeIcons = {
    read: Eye,
    write: Edit,
    delete: Trash2
  };
  const TypeIcon = typeIcons[type];

  return (
    <div className={`flex items-center gap-1 ${level.color}`}>
      <TypeIcon className="w-3 h-3" />
      <span className="text-xs">{level.label}</span>
    </div>
  );
};

// Role Card Component
const RoleCard = ({ role, data }: { role: string; data: typeof roles[keyof typeof roles] }) => {
  const Icon = data.icon;

  return (
    <div className={`${data.bgColor} rounded-xl p-4 border ${data.borderColor}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg ${data.bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${data.textColor}`} />
        </div>
        <div>
          <div className={`font-semibold ${data.textColor}`}>{data.label}</div>
          <div className="text-xs text-white/50">{role}</div>
        </div>
      </div>
    </div>
  );
};

export default function RLSDocumentation() {
  const [activeTab, setActiveTab] = useState('hierarchy');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">SELAI - מערכת הרשאות RLS</h1>
          </div>
          <p className="text-white/60">Row Level Security - בידוד נתונים מלא לפי תפקיד</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-6 justify-center">
          {[
            { id: 'hierarchy', label: 'היררכיה' },
            { id: 'matrix', label: 'מטריצת הרשאות' },
            { id: 'functions', label: 'פונקציות עזר' },
            { id: 'examples', label: 'דוגמאות' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Hierarchy Tab */}
        {activeTab === 'hierarchy' && (
          <div className="space-y-6">
            {/* Role Cards */}
            <div className="grid grid-cols-5 gap-4">
              {Object.entries(roles).map(([key, data]) => (
                <RoleCard key={key} role={key} data={data} />
              ))}
            </div>

            {/* Hierarchy Diagram */}
            <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-6 text-center">היררכיית הרשאות</h2>

              <div className="flex flex-col items-center gap-4">
                {/* Admin Level */}
                <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 w-64 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 font-semibold">מנהל מערכת</span>
                  </div>
                  <div className="text-xs text-white/50 mt-1">גישה מלאה לכל הנתונים</div>
                </div>

                <div className="w-0.5 h-8 bg-white/20" />

                {/* Manager Level */}
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4 w-72 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Building className="w-5 h-5 text-orange-400" />
                    <span className="text-orange-400 font-semibold">מנהל אזור</span>
                  </div>
                  <div className="text-xs text-white/50 mt-1">רואה מפקחים + סוכנים מוקצים</div>
                </div>

                <div className="w-0.5 h-8 bg-white/20" />

                {/* Supervisor Level */}
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 w-80 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <UserCheck className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400 font-semibold">מפקח</span>
                  </div>
                  <div className="text-xs text-white/50 mt-1">רואה סוכנים תחתיו + נתונים שלהם</div>
                </div>

                <div className="w-0.5 h-8 bg-white/20" />

                {/* Agent & Client Level */}
                <div className="flex gap-8">
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 w-48 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <User className="w-5 h-5 text-blue-400" />
                      <span className="text-blue-400 font-semibold">סוכן</span>
                    </div>
                    <div className="text-xs text-white/50 mt-1">נתונים אישיים בלבד</div>
                  </div>

                  <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 w-48 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Users className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-semibold">לקוח</span>
                    </div>
                    <div className="text-xs text-white/50 mt-1">פוליסות ומסמכים משלו</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Relationships */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <h3 className="font-semibold text-white mb-3">🔗 טבלת קשרים: agent_supervisor_relations</h3>
                <ul className="text-sm text-white/70 space-y-1">
                  <li>• מקשרת סוכנים למפקחים</li>
                  <li>• כוללת agent_id, supervisor_id</li>
                  <li>• מתעדכנת אוטומטית עם טריגרים</li>
                  <li>• בסיס ל-RLS של מפקחים</li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <h3 className="font-semibold text-white mb-3">🔗 טבלת קשרים: manager_supervisor_access</h3>
                <ul className="text-sm text-white/70 space-y-1">
                  <li>• מקשרת מנהלים למפקחים</li>
                  <li>• כוללת manager_id, supervisor_id</li>
                  <li>• מאפשרת הקצאה גמישה</li>
                  <li>• בסיס ל-RLS של מנהלים</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Matrix Tab */}
        {activeTab === 'matrix' && (
          <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/10">
                    <th className="p-4 text-right text-white font-semibold">טבלה</th>
                    {Object.entries(roles).map(([key, data]) => (
                      <th key={key} className="p-4 text-center">
                        <div className={`${data.textColor} font-semibold`}>{data.label}</div>
                        <div className="text-xs text-white/40 mt-1">
                          <span className="mx-1">R</span>
                          <span className="mx-1">W</span>
                          <span className="mx-1">D</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tables.map((table, i) => {
                    const Icon = table.icon;
                    return (
                      <tr key={table.name} className={i % 2 === 0 ? 'bg-white/5' : ''}>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-cyan-400" />
                            <span className="text-white">{table.label}</span>
                          </div>
                          <code className="text-xs text-white/40 font-mono">{table.name}</code>
                        </td>
                        {Object.keys(roles).map(role => (
                          <td key={role} className="p-4">
                            <div className="flex flex-col items-center gap-1">
                              <AccessCell access={table.access[role as keyof typeof table.access].read} type="read" />
                              <AccessCell access={table.access[role as keyof typeof table.access].write} type="write" />
                              <AccessCell access={table.access[role as keyof typeof table.access].delete} type="delete" />
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="p-4 border-t border-white/10">
              <h3 className="text-sm font-semibold text-white mb-2">מקרא:</h3>
              <div className="flex flex-wrap gap-4">
                {Object.entries(accessLevels).map(([key, data]) => {
                  const Icon = data.icon;
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${data.color}`} />
                      <span className={`text-sm ${data.color}`}>{data.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Functions Tab */}
        {activeTab === 'functions' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">פונקציות עזר ב-PostgreSQL</h2>

            <HelperFunction
              name="get_user_role"
              description="מחזירה את התפקיד של המשתמש המחובר"
              returns="TEXT (admin/manager/supervisor/agent/client)"
            />

            <HelperFunction
              name="is_admin"
              description="בודקת אם המשתמש הנוכחי הוא מנהל"
              returns="BOOLEAN"
            />

            <HelperFunction
              name="is_supervisor_or_higher"
              description="בודקת אם המשתמש הוא מפקח, מנהל או אדמין"
              returns="BOOLEAN"
            />

            <HelperFunction
              name="get_supervised_agents"
              description="מחזירה רשימת סוכנים תחת מפקח מסוים"
              params="supervisor_uuid TEXT"
              returns="TEXT[] (מערך של IDs)"
            />

            <HelperFunction
              name="get_manager_supervisors"
              description="מחזירה רשימת מפקחים שהוקצו למנהל"
              params="manager_uuid TEXT"
              returns="TEXT[] (מערך של IDs)"
            />

            <HelperFunction
              name="get_manager_agents"
              description="מחזירה כל הסוכנים הנגישים למנהל (דרך המפקחים)"
              params="manager_uuid TEXT"
              returns="TEXT[] (מערך של IDs)"
            />

            <HelperFunction
              name="get_accessible_user_ids"
              description="מחזירה את כל ה-IDs של משתמשים שהמשתמש הנוכחי יכול לצפות בהם"
              returns="TEXT[] (מערך של IDs)"
            />

            <HelperFunction
              name="can_access_agent_data"
              description="בודקת אם המשתמש הנוכחי יכול לגשת לנתונים של סוכן ספציפי"
              params="target_agent_id TEXT"
              returns="BOOLEAN"
            />
          </div>
        )}

        {/* Examples Tab */}
        {activeTab === 'examples' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">דוגמאות לשימוש</h2>

            {/* Example 1: Supervisor Query */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="font-semibold text-yellow-400 mb-3">📋 מפקח - צפייה באנשי קשר של הצוות</h3>
              <pre className="bg-black/30 rounded-lg p-4 text-sm font-mono text-green-400 overflow-x-auto">
{`-- Policy: supervisor_access_contacts
SELECT * FROM contacts
WHERE agent_id = auth.user_id()  -- אנשי קשר שלו
   OR agent_id = ANY(get_supervised_agents(auth.user_id()));  -- של הצוות`}
              </pre>
              <p className="text-white/60 text-sm mt-3">
                המפקח יראה את כל אנשי הקשר של עצמו ושל כל הסוכנים תחתיו.
              </p>
            </div>

            {/* Example 2: Manager Query */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="font-semibold text-orange-400 mb-3">📋 מנהל - צפייה בלידים של האזור</h3>
              <pre className="bg-black/30 rounded-lg p-4 text-sm font-mono text-green-400 overflow-x-auto">
{`-- Policy: manager_access_leads
SELECT * FROM leads
WHERE agent_id = auth.user_id()  -- לידים שלו
   OR agent_id = ANY(get_manager_agents(auth.user_id()));  -- של כל האזור

-- get_manager_agents עובר דרך:
-- 1. manager_supervisor_access → מפקחים מוקצים
-- 2. agent_supervisor_relations → סוכנים של כל מפקח`}
              </pre>
              <p className="text-white/60 text-sm mt-3">
                המנהל יראה לידים של כל הסוכנים תחת המפקחים שהוקצו לו.
              </p>
            </div>

            {/* Example 3: Client Query */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="font-semibold text-green-400 mb-3">📋 לקוח - צפייה בפוליסות שלו</h3>
              <pre className="bg-black/30 rounded-lg p-4 text-sm font-mono text-green-400 overflow-x-auto">
{`-- Policy: client_read_own_policies
SELECT * FROM policies
WHERE client_id = auth.user_id();

-- הלקוח רואה רק פוליסות שה-client_id שלהן מתאים ל-ID שלו
-- אין גישה לנתונים של לקוחות אחרים או סוכנים`}
              </pre>
              <p className="text-white/60 text-sm mt-3">
                הלקוח רואה אך ורק את הפוליסות שלו - בידוד מלא.
              </p>
            </div>

            {/* Security Note */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
              <h3 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                הערת אבטחה
              </h3>
              <ul className="text-white/70 text-sm space-y-2">
                <li>• כל ה-policies מוגדרים כ-SECURITY DEFINER להבטחת הרצה עקבית</li>
                <li>• פונקציות העזר משתמשות ב-STABLE כדי לאפשר אופטימיזציה</li>
                <li>• אינדקסים נוצרו על כל העמודות בהן משתמשים ב-RLS</li>
                <li>• ה-policies כוללים גם USING (קריאה) וגם WITH CHECK (כתיבה)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-white/40 text-sm">
          SELAI RLS Documentation | v2.0 | January 2026
        </div>
      </div>
    </div>
  );
}
