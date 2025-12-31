'use client';

import { useState, useEffect } from 'react';
import {
  GripVertical,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Save,
  X,
  BarChart3,
  PieChart,
  LineChart,
  Settings2,
  Palette,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { TemplateConfig, TemplateColumn, TemplateChart, TemplateFilter } from '@/types';

interface TemplateBuilderProps {
  tableName: string;
  columns: string[];
  initialConfig?: TemplateConfig;
  onSave: (name: string, description: string, config: TemplateConfig, isDefault: boolean) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  initialName?: string;
  initialDescription?: string;
  initialIsDefault?: boolean;
}

export function TemplateBuilder({
  tableName,
  columns,
  initialConfig,
  onSave,
  onCancel,
  isEditing = false,
  initialName = '',
  initialDescription = '',
  initialIsDefault = false,
}: TemplateBuilderProps) {
  const [templateName, setTemplateName] = useState(initialName);
  const [templateDescription, setTemplateDescription] = useState(initialDescription);
  const [isDefault, setIsDefault] = useState(initialIsDefault);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('columns');

  // Template config state
  const [templateColumns, setTemplateColumns] = useState<TemplateColumn[]>(() => {
    if (initialConfig?.columns) {
      return initialConfig.columns;
    }
    return columns.map((name, index) => ({
      name,
      label: name,
      visible: true,
      order: index,
      format: 'text' as const,
    }));
  });

  const [charts, setCharts] = useState<TemplateChart[]>(initialConfig?.charts || []);
  const [filters, setFilters] = useState<TemplateFilter[]>(initialConfig?.filters || []);
  const [layout, setLayout] = useState<'default' | 'compact' | 'wide'>(initialConfig?.layout || 'default');
  const [pageSize, setPageSize] = useState(initialConfig?.page_size || 50);

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Handle drag start
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newColumns = [...templateColumns];
    const draggedColumn = newColumns[draggedIndex];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedColumn);

    // Update order
    newColumns.forEach((col, i) => {
      col.order = i;
    });

    setTemplateColumns(newColumns);
    setDraggedIndex(index);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Toggle column visibility
  const toggleColumnVisibility = (index: number) => {
    const newColumns = [...templateColumns];
    newColumns[index].visible = !newColumns[index].visible;
    setTemplateColumns(newColumns);
  };

  // Update column label
  const updateColumnLabel = (index: number, label: string) => {
    const newColumns = [...templateColumns];
    newColumns[index].label = label;
    setTemplateColumns(newColumns);
  };

  // Update column format
  const updateColumnFormat = (index: number, format: TemplateColumn['format']) => {
    const newColumns = [...templateColumns];
    newColumns[index].format = format;
    setTemplateColumns(newColumns);
  };

  // Add chart
  const addChart = (type: TemplateChart['type']) => {
    const newChart: TemplateChart = {
      id: crypto.randomUUID(),
      type,
      title: type === 'pie' ? 'התפלגות' : type === 'bar' ? 'גרף עמודות' : 'גרף קו',
      column: templateColumns[0]?.name || '',
      aggregation: 'count',
    };
    setCharts([...charts, newChart]);
  };

  // Update chart
  const updateChart = (id: string, updates: Partial<TemplateChart>) => {
    setCharts(charts.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  // Remove chart
  const removeChart = (id: string) => {
    setCharts(charts.filter((c) => c.id !== id));
  };

  // Add filter
  const addFilter = () => {
    const newFilter: TemplateFilter = {
      column: templateColumns[0]?.name || '',
      operator: 'eq',
      value: '',
      active: true,
    };
    setFilters([...filters, newFilter]);
  };

  // Update filter
  const updateFilter = (index: number, updates: Partial<TemplateFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  // Remove filter
  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  // Handle save
  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('יש להזין שם לתבנית');
      return;
    }

    setIsSaving(true);

    try {
      const config: TemplateConfig = {
        table_name: tableName,
        columns: templateColumns,
        filters,
        charts,
        layout,
        page_size: pageSize,
      };

      await onSave(templateName, templateDescription, config, isDefault);
      toast.success(isEditing ? 'התבנית עודכנה' : 'התבנית נשמרה');
    } catch (error) {
      toast.error('שגיאה בשמירת התבנית');
    } finally {
      setIsSaving(false);
    }
  };

  const visibleCount = templateColumns.filter((c) => c.visible).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-white">
            {isEditing ? 'עריכת תבנית' : 'יצירת תבנית חדשה'}
          </h2>
          <p className="text-sm text-slate-400">הגדר את התצוגה, הסינונים והגרפים עבור {tableName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="border-slate-600 text-slate-300">
            <X className="h-4 w-4 ml-2" />
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-500 hover:bg-emerald-600">
            <Save className="h-4 w-4 ml-2" />
            {isSaving ? 'שומר...' : 'שמור תבנית'}
          </Button>
        </div>
      </div>

      {/* Template Info */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">שם התבנית</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="לדוגמה: דוח מכירות חודשי"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">תיאור (אופציונלי)</Label>
              <Input
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="תיאור קצר של התבנית"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isDefault"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(!!checked)}
              />
              <Label htmlFor="isDefault" className="text-slate-300 cursor-pointer">
                הגדר כתבנית ברירת מחדל
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-slate-400">פריסה:</Label>
              <Select value={layout} onValueChange={(v) => setLayout(v as typeof layout)}>
                <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="default" className="text-slate-300">
                    רגילה
                  </SelectItem>
                  <SelectItem value="compact" className="text-slate-300">
                    קומפקטית
                  </SelectItem>
                  <SelectItem value="wide" className="text-slate-300">
                    רחבה
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-slate-400">שורות בעמוד:</Label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(parseInt(v))}
              >
                <SelectTrigger className="w-20 bg-slate-800 border-slate-700 text-white h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {[25, 50, 100, 200].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-slate-300">
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger
            value="columns"
            className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
          >
            <Settings2 className="h-4 w-4 ml-2" />
            עמודות ({visibleCount}/{templateColumns.length})
          </TabsTrigger>
          <TabsTrigger
            value="charts"
            className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
          >
            <BarChart3 className="h-4 w-4 ml-2" />
            גרפים ({charts.length})
          </TabsTrigger>
          <TabsTrigger
            value="filters"
            className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
          >
            <Palette className="h-4 w-4 ml-2" />
            סינונים ({filters.length})
          </TabsTrigger>
        </TabsList>

        {/* Columns Tab */}
        <TabsContent value="columns" className="mt-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center justify-between">
                <span>הגדרת עמודות</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTemplateColumns(templateColumns.map((c) => ({ ...c, visible: true })))}
                    className="border-slate-600 text-slate-300 text-xs"
                  >
                    הצג הכל
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTemplateColumns(templateColumns.map((c) => ({ ...c, visible: false })))}
                    className="border-slate-600 text-slate-300 text-xs"
                  >
                    הסתר הכל
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm mb-4">
                גרור כדי לשנות סדר, לחץ על העין להצגה/הסתרה
              </p>
              <div className="space-y-2">
                {templateColumns.map((col, index) => (
                  <div
                    key={col.name}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-move ${
                      draggedIndex === index
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : col.visible
                        ? 'border-slate-700 bg-slate-700/30'
                        : 'border-slate-800 bg-slate-800/30 opacity-60'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-slate-500" />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleColumnVisibility(index)}
                    >
                      {col.visible ? (
                        <Eye className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-slate-500" />
                      )}
                    </Button>

                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-xs text-slate-500 block mb-1">שם מקור</span>
                        <span className="text-white text-sm font-mono">{col.name}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block mb-1">תווית</span>
                        <Input
                          value={col.label}
                          onChange={(e) => updateColumnLabel(index, e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white h-7 text-sm"
                        />
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block mb-1">פורמט</span>
                        <Select
                          value={col.format || 'text'}
                          onValueChange={(v) => updateColumnFormat(index, v as TemplateColumn['format'])}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-7 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="text" className="text-slate-300">
                              טקסט
                            </SelectItem>
                            <SelectItem value="number" className="text-slate-300">
                              מספר
                            </SelectItem>
                            <SelectItem value="date" className="text-slate-300">
                              תאריך
                            </SelectItem>
                            <SelectItem value="currency" className="text-slate-300">
                              מטבע (₪)
                            </SelectItem>
                            <SelectItem value="percent" className="text-slate-300">
                              אחוזים
                            </SelectItem>
                            <SelectItem value="boolean" className="text-slate-300">
                              בוליאני
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="mt-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center justify-between">
                <span>גרפים וויזואליזציות</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addChart('pie')}
                    className="border-slate-600 text-slate-300"
                  >
                    <PieChart className="h-4 w-4 ml-2" />
                    עוגה
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addChart('bar')}
                    className="border-slate-600 text-slate-300"
                  >
                    <BarChart3 className="h-4 w-4 ml-2" />
                    עמודות
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addChart('line')}
                    className="border-slate-600 text-slate-300"
                  >
                    <LineChart className="h-4 w-4 ml-2" />
                    קו
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {charts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>אין גרפים מוגדרים</p>
                  <p className="text-sm">לחץ על הכפתורים למעלה להוספת גרף</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {charts.map((chart) => (
                    <div
                      key={chart.id}
                      className="p-4 bg-slate-700/30 rounded-lg border border-slate-700"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          {chart.type === 'pie' && <PieChart className="h-5 w-5 text-emerald-500" />}
                          {chart.type === 'bar' && <BarChart3 className="h-5 w-5 text-blue-500" />}
                          {chart.type === 'line' && <LineChart className="h-5 w-5 text-purple-500" />}
                          <Input
                            value={chart.title}
                            onChange={(e) => updateChart(chart.id, { title: e.target.value })}
                            className="bg-slate-800 border-slate-700 text-white h-8 w-48"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeChart(chart.id)}
                          className="h-8 w-8 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label className="text-slate-400 text-xs">עמודה</Label>
                          <Select
                            value={chart.column}
                            onValueChange={(v) => updateChart(chart.id, { column: v })}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {templateColumns.map((col) => (
                                <SelectItem key={col.name} value={col.name} className="text-slate-300">
                                  {col.label || col.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-slate-400 text-xs">אגרגציה</Label>
                          <Select
                            value={chart.aggregation}
                            onValueChange={(v) =>
                              updateChart(chart.id, { aggregation: v as TemplateChart['aggregation'] })
                            }
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="count" className="text-slate-300">
                                ספירה
                              </SelectItem>
                              <SelectItem value="sum" className="text-slate-300">
                                סכום
                              </SelectItem>
                              <SelectItem value="avg" className="text-slate-300">
                                ממוצע
                              </SelectItem>
                              <SelectItem value="min" className="text-slate-300">
                                מינימום
                              </SelectItem>
                              <SelectItem value="max" className="text-slate-300">
                                מקסימום
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-slate-400 text-xs">קיבוץ לפי</Label>
                          <Select
                            value={chart.groupBy || '__none__'}
                            onValueChange={(v) =>
                              updateChart(chart.id, { groupBy: v === '__none__' ? undefined : v })
                            }
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="__none__" className="text-slate-300">
                                ללא
                              </SelectItem>
                              {templateColumns.map((col) => (
                                <SelectItem key={col.name} value={col.name} className="text-slate-300">
                                  {col.label || col.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Filters Tab */}
        <TabsContent value="filters" className="mt-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center justify-between">
                <span>סינונים קבועים</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addFilter}
                  className="border-slate-600 text-slate-300"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף סינון
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filters.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>אין סינונים מוגדרים</p>
                  <p className="text-sm">סינונים יופעלו אוטומטית בכל פתיחה של התבנית</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filters.map((filter, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg border border-slate-700"
                    >
                      <Checkbox
                        checked={filter.active}
                        onCheckedChange={(checked) => updateFilter(index, { active: !!checked })}
                      />

                      <Select
                        value={filter.column}
                        onValueChange={(v) => updateFilter(index, { column: v })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {templateColumns.map((col) => (
                            <SelectItem key={col.name} value={col.name} className="text-slate-300">
                              {col.label || col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={filter.operator}
                        onValueChange={(v) => updateFilter(index, { operator: v as TemplateFilter['operator'] })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="eq" className="text-slate-300">
                            שווה ל
                          </SelectItem>
                          <SelectItem value="neq" className="text-slate-300">
                            שונה מ
                          </SelectItem>
                          <SelectItem value="gt" className="text-slate-300">
                            גדול מ
                          </SelectItem>
                          <SelectItem value="gte" className="text-slate-300">
                            גדול/שווה ל
                          </SelectItem>
                          <SelectItem value="lt" className="text-slate-300">
                            קטן מ
                          </SelectItem>
                          <SelectItem value="lte" className="text-slate-300">
                            קטן/שווה ל
                          </SelectItem>
                          <SelectItem value="contains" className="text-slate-300">
                            מכיל
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        value={String(filter.value || '')}
                        onChange={(e) => updateFilter(index, { value: e.target.value })}
                        placeholder="ערך"
                        className="bg-slate-800 border-slate-700 text-white flex-1"
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFilter(index)}
                        className="h-8 w-8 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
