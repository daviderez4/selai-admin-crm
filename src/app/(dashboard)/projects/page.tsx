'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database,
  Plus,
  FolderKanban,
  Search,
  Grid3X3,
  List,
  Filter,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { ProjectCard } from '@/components/ProjectCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useProjectsStore } from '@/lib/stores/projectsStore';
import { useUserPreferencesStore } from '@/lib/stores/userPreferencesStore';
import { NewProjectModal } from '@/components/projects/NewProjectModal';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, isLoadingProjects, connectToProject, deleteProject, fetchProjects } =
    useProjectsStore();
  const { setDefaultProject } = useUserPreferencesStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
