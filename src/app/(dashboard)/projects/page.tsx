'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Database,
  Plus,
  FolderKanban,
  Search,
  Grid3X3,
  List,
  Filter,
  Users,
  Megaphone,
  FileText,
  Upload,
  BarChart3,
  Target,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { ProjectCard } from '@/components/ProjectCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useProjectsStore } from '@/lib/stores/projectsStore';
import { useUserPreferencesStore } from '@/lib/stores/userPreferencesStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { NewProjectModal } from '@/components/projects/NewProjectModal';
import { toast } from 'sonner';

// Workspace card component for agents/supervisors
function WorkspaceCard({
  href,
  icon: Icon,
  title,
  description,
  count,
  color = 'blue'
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  count?: number;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 group-hover:bg-green-100',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
  };

  return (
    <Link href={href} className="group">
      <Card className="h-full hover:shadow-md transition-all duration-200 border-slate-200 hover:border-slate-300">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${colorClasses[color]} transition-colors`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 group-hover:text-slate-900">{title}</h3>
                {count !== undefined && (
                  <span className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">{description}</p>
            </div>
            <ArrowLeft className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, isLoadingProjects, connectToProject, deleteProject, fetchProjects } =
    useProjectsStore();
  const { setDefaultProject } = useUserPreferencesStore();
  const { userRecord, canAccessProjects } = useAuthStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Check if user has project access
  const hasAccess = canAccessProjects();

  // Show workspace for agents/supervisors instead of projects
  if (!isLoadingProjects && !hasAccess && userRecord) {
    return (
      <div className="flex flex-col h-full">
        <Header title="אזור עבודה" />
        <div className="flex-1 p-6 overflow-auto" dir="rtl">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Welcome Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  שלום, {userRecord.full_name}
                </h1>
                <p className="text-slate-500">
                  {userRecord.user_type === 'supervisor' ? 'מפקח' : 'סוכן'} | אזור עבודה
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <WorkspaceCard
                href="/workspace/contacts"
                icon={Users}
                title="אנשי קשר"
                description="ניהול לקוחות ואנשי קשר"
                color="blue"
              />
              <WorkspaceCard
                href="/workspace/campaigns"
                icon={Megaphone}
                title="קמפיינים"
                description="הודעות המוניות וקמפיינים"
                color="green"
              />
              <WorkspaceCard
                href="/workspace/documents"
                icon={FileText}
                title="מסמכים"
                description="ניהול מסמכים וקבצים"
                color="purple"
              />
              <WorkspaceCard
                href="/workspace/import"
                icon={Upload}
                title="ייבוא נתונים"
                description="ייבוא מאקסל וקבצים"
                color="orange"
              />
            </div>

            {/* Main Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contacts Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    אנשי קשר ולקוחות
                  </CardTitle>
                  <CardDescription>
                    ניהול רשימת אנשי קשר, ייבוא מאקסל ועדכון פרטים
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push('/workspace/contacts')}
                  >
                    <Users className="h-4 w-4 ml-2" />
                    צפה בכל אנשי הקשר
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push('/workspace/contacts/import')}
                  >
                    <Upload className="h-4 w-4 ml-2" />
                    ייבא אנשי קשר מאקסל
                  </Button>
                  <Button
                    className="w-full justify-start"
                    onClick={() => router.push('/workspace/contacts/new')}
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף איש קשר חדש
                  </Button>
                </CardContent>
              </Card>

              {/* Campaigns Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-green-600" />
                    קמפיינים והודעות
                  </CardTitle>
                  <CardDescription>
                    יצירת קמפיינים ושליחת הודעות המוניות
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push('/workspace/campaigns')}
                  >
                    <Megaphone className="h-4 w-4 ml-2" />
                    צפה בכל הקמפיינים
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push('/workspace/campaigns/templates')}
                  >
                    <MessageSquare className="h-4 w-4 ml-2" />
                    תבניות הודעות
                  </Button>
                  <Button
                    className="w-full justify-start"
                    onClick={() => router.push('/workspace/campaigns/new')}
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    צור קמפיין חדש
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Additional Tools */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-50 border-dashed">
                <CardContent className="pt-6 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  <h4 className="font-medium text-slate-600">דוחות</h4>
                  <p className="text-xs text-slate-400 mt-1">בקרוב...</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 border-dashed">
                <CardContent className="pt-6 text-center">
                  <Target className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  <h4 className="font-medium text-slate-600">לידים</h4>
                  <p className="text-xs text-slate-400 mt-1">בקרוב...</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 border-dashed">
                <CardContent className="pt-6 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  <h4 className="font-medium text-slate-600">מסמכים</h4>
                  <p className="text-xs text-slate-400 mt-1">בקרוב...</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter projects by search query
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConnect = async (project: typeof projects[0]) => {
    await connectToProject(project);
    await setDefaultProject(project.id);
    router.push(`/projects/${project.id}`);
  };

  const handleDelete = async (projectId: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את הפרויקט?')) {
      const success = await deleteProject(projectId);
      if (success) {
        toast.success('הפרויקט נמחק בהצלחה');
      } else {
        toast.error('שגיאה במחיקת הפרויקט');
      }
    }
  };

  const handleSettings = (project: typeof projects[0]) => {
    router.push(`/projects/${project.id}?tab=settings`);
  };

  const handleProjectCreated = async (project: { id: string; name: string }) => {
    await fetchProjects();
    toast.success(`הפרויקט "${project.name}" נוצר בהצלחה`);
    router.push(`/projects/${project.id}`);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="פרויקטים" />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Header with actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <FolderKanban className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">כל הפרויקטים</h1>
              <p className="text-sm text-slate-500">
                {projects.length} פרויקטים
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="חיפוש פרויקטים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 w-64"
              />
            </div>

            {/* View toggle */}
            <div className="flex items-center border rounded-lg p-1 bg-white">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Create button */}
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 ml-2" />
              פרויקט חדש
            </Button>
          </div>
        </div>

        {/* Projects grid/list */}
        {isLoadingProjects ? (
          <div className={viewMode === 'grid'
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-3"
          }>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="bg-white">
                <CardContent className="pt-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className={viewMode === 'grid'
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-3"
          }>
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onConnect={handleConnect}
                onDelete={handleDelete}
                onSettings={handleSettings}
              />
            ))}
          </div>
        ) : searchQuery ? (
          <Card className="bg-white border-dashed">
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">
                לא נמצאו פרויקטים
              </h3>
              <p className="text-slate-500 mb-4">
                לא נמצאו פרויקטים התואמים לחיפוש "{searchQuery}"
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                נקה חיפוש
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border-dashed">
            <CardContent className="py-12 text-center">
              <Database className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">
                אין פרויקטים עדיין
              </h3>
              <p className="text-slate-500 mb-4">
                צור פרויקט חדש כדי להתחיל לעבוד עם הנתונים שלך
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 ml-2" />
                צור פרויקט ראשון
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* New Project Modal */}
      <NewProjectModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}
