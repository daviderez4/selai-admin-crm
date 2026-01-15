'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Layers,
  Database,
  Users,
  Settings,
  Shield,
  UserPlus,
  Cog,
  Network,
} from 'lucide-react';
import DataHealthDashboard from '@/components/admin/health/DataHealthDashboard';
import SchemaRegistryManager from '@/components/admin/health/SchemaRegistryManager';
import ExcelUploader from '@/components/admin/ExcelUploader';

// Lazy imports for other admin sections
import dynamic from 'next/dynamic';

const AdminProjectsContent = dynamic(
  () => import('@/components/admin/AdminProjectsContent'),
  { loading: () => <div className="flex items-center justify-center h-96"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div> }
);

const AdminUsersContent = dynamic(
  () => import('@/components/admin/AdminUsersContent'),
  { loading: () => <div className="flex items-center justify-center h-96"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div> }
);

const AdminRegistrationsContent = dynamic(
  () => import('@/components/admin/AdminRegistrationsContent'),
  { loading: () => <div className="flex items-center justify-center h-96"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div> }
);

const AdminSettingsContent = dynamic(
  () => import('@/components/admin/AdminSettingsContent'),
  { loading: () => <div className="flex items-center justify-center h-96"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div> }
);

const IntegrationsContent = dynamic(
  () => import('@/components/admin/IntegrationsContent'),
  { loading: () => <div className="flex items-center justify-center h-96"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div> }
);

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('data-health');

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Shield className="text-purple-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">פאנל ניהול</h1>
            <p className="text-slate-500">ניהול נתונים, סכמות, פרויקטים ומשתמשים</p>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-white border-b border-slate-200 px-6">
          <TabsList className="h-14 bg-transparent gap-2">
            <TabsTrigger
              value="data-health"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-4 py-2 rounded-lg"
            >
              <Activity className="h-4 w-4 ml-2" />
              בריאות נתונים
            </TabsTrigger>
            <TabsTrigger
              value="schema-registry"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-4 py-2 rounded-lg"
            >
              <Layers className="h-4 w-4 ml-2" />
              רישום סכמות
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-4 py-2 rounded-lg"
            >
              <Database className="h-4 w-4 ml-2" />
              פרויקטים
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-4 py-2 rounded-lg"
            >
              <Users className="h-4 w-4 ml-2" />
              משתמשים
            </TabsTrigger>
            <TabsTrigger
              value="registrations"
              className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 px-4 py-2 rounded-lg"
            >
              <UserPlus className="h-4 w-4 ml-2" />
              בקשות הרשמה
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 px-4 py-2 rounded-lg"
            >
              <Cog className="h-4 w-4 ml-2" />
              הגדרות מערכת
            </TabsTrigger>
            <TabsTrigger
              value="integrations"
              className="data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-700 px-4 py-2 rounded-lg"
            >
              <Network className="h-4 w-4 ml-2" />
              אינטגרציות
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="data-health" className="m-0">
          <DataHealthDashboard />
          <div className="p-6 pt-0">
            <ExcelUploader />
          </div>
        </TabsContent>

        <TabsContent value="schema-registry" className="m-0">
          <SchemaRegistryManager />
        </TabsContent>

        <TabsContent value="projects" className="m-0">
          <AdminProjectsContent />
        </TabsContent>

        <TabsContent value="users" className="m-0">
          <AdminUsersContent />
        </TabsContent>

        <TabsContent value="registrations" className="m-0">
          <AdminRegistrationsContent />
        </TabsContent>

        <TabsContent value="settings" className="m-0">
          <AdminSettingsContent />
        </TabsContent>

        <TabsContent value="integrations" className="m-0">
          <IntegrationsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
