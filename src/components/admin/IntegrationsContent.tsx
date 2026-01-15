'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Network,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  Settings,
  Activity,
  Database,
  Clock,
  Zap,
  Shield,
  TrendingUp,
  Server,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Building2,
  Wallet,
  Car,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

// Connector definitions matching the backend
const CONNECTORS = [
  {
    code: 'harel',
    name: 'הראל ביטוח',
    nameEn: 'Harel Insurance',
    category: 'insurance',
    icon: Building2,
    description: 'חיבור לממשק ביטוח הראל',
    features: ['פוליסות', 'תביעות', 'הצעות מחיר'],
  },
  {
    code: 'migdal',
    name: 'מגדל ביטוח',
    nameEn: 'Migdal Insurance',
    category: 'insurance',
    icon: Building2,
    description: 'חיבור לממשק ביטוח מגדל',
    features: ['פוליסות', 'תביעות', 'פנסיה'],
  },
  {
    code: 'clal',
    name: 'כלל ביטוח',
    nameEn: 'Clal Insurance',
    category: 'insurance',
    icon: Building2,
    description: 'חיבור לממשק ביטוח כלל',
    features: ['פוליסות', 'תביעות', 'השקעות'],
  },
  {
    code: 'phoenix',
    name: 'הפניקס',
    nameEn: 'Phoenix Insurance',
    category: 'insurance',
    icon: Building2,
    description: 'חיבור לממשק ביטוח הפניקס',
    features: ['פוליסות', 'תביעות'],
  },
  {
    code: 'menora',
    name: 'מנורה מבטחים',
    nameEn: 'Menora Mivtachim',
    category: 'insurance',
    icon: Building2,
    description: 'חיבור לממשק מנורה מבטחים',
    features: ['פוליסות', 'פנסיה'],
  },
  {
    code: 'aig',
    name: 'AIG',
    nameEn: 'AIG Israel',
    category: 'insurance',
    icon: Building2,
    description: 'חיבור לממשק AIG ישראל',
    features: ['פוליסות', 'תביעות'],
  },
  {
    code: 'shlomo',
    name: 'שלמה ביטוח',
    nameEn: 'Shlomo Insurance',
    category: 'insurance',
    icon: Building2,
    description: 'חיבור לממשק שלמה ביטוח',
    features: ['רכב', 'נסיעות'],
  },
  {
    code: 'ayalon',
    name: 'איילון ביטוח',
    nameEn: 'Ayalon Insurance',
    category: 'insurance',
    icon: Building2,
    description: 'חיבור לממשק איילון ביטוח',
    features: ['פוליסות', 'תביעות'],
  },
  {
    code: 'har_habitoach',
    name: 'הר הביטוח',
    nameEn: 'Har HaBitouach',
    category: 'aggregator',
    icon: Network,
    description: 'אגרגטור הצעות מחיר',
    features: ['השוואת מחירים', 'הצעות מחיר'],
  },
  {
    code: 'mislaka',
    name: 'מסלקה פנסיונית',
    nameEn: 'Pension Clearinghouse',
    category: 'pension',
    icon: Wallet,
    description: 'מידע פנסיוני מהמסלקה',
    features: ['קרנות פנסיה', 'גמל', 'השתלמות'],
  },
  {
    code: 'misrad_harishui',
    name: 'משרד הרישוי',
    nameEn: 'Vehicle Licensing',
    category: 'government',
    icon: Car,
    description: 'נתוני רכב ממשרד הרישוי',
    features: ['פרטי רכב', 'היסטוריה'],
  },
];

interface ConnectorStatus {
  code: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  lastSync?: string;
  lastError?: string;
  recordsCount?: number;
  syncProgress?: number;
}

interface SyncLog {
  id: string;
  connector: string;
  action: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  timestamp: string;
  duration?: number;
  recordsAffected?: number;
}

export default function IntegrationsContent() {
  const [connectorStatuses, setConnectorStatuses] = useState<Map<string, ConnectorStatus>>(new Map());
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingConnector, setTestingConnector] = useState<string | null>(null);
  const [syncingConnector, setSyncingConnector] = useState<string | null>(null);
  const [expandedConnector, setExpandedConnector] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Simulate loading data - in production this would call the API
      await new Promise(resolve => setTimeout(resolve, 800));

      // Set initial connector statuses
      const statuses = new Map<string, ConnectorStatus>();
      CONNECTORS.forEach(connector => {
        statuses.set(connector.code, {
          code: connector.code,
          status: Math.random() > 0.3 ? 'connected' : Math.random() > 0.5 ? 'disconnected' : 'error',
          lastSync: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
          recordsCount: Math.floor(Math.random() * 10000),
          syncProgress: 100,
        });
      });
      setConnectorStatuses(statuses);

      // Generate sample logs
      const logs: SyncLog[] = CONNECTORS.slice(0, 5).map((connector, i) => ({
        id: `log-${i}`,
        connector: connector.code,
        action: ['sync', 'test', 'refresh'][Math.floor(Math.random() * 3)],
        status: Math.random() > 0.2 ? 'success' : Math.random() > 0.5 ? 'warning' : 'error',
        message: `סנכרון ${connector.name} הושלם בהצלחה`,
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        duration: Math.floor(Math.random() * 5000),
        recordsAffected: Math.floor(Math.random() * 500),
      }));
      setSyncLogs(logs);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (connectorCode: string) => {
    setTestingConnector(connectorCode);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newStatuses = new Map(connectorStatuses);
      newStatuses.set(connectorCode, {
        ...newStatuses.get(connectorCode)!,
        status: 'connected',
        lastSync: new Date().toISOString(),
      });
      setConnectorStatuses(newStatuses);

      toast.success(`החיבור ל-${CONNECTORS.find(c => c.code === connectorCode)?.name} תקין`);
    } catch (error) {
      toast.error('בדיקת החיבור נכשלה');
    } finally {
      setTestingConnector(null);
    }
  };

  const triggerSync = async (connectorCode: string) => {
    setSyncingConnector(connectorCode);
    const connector = CONNECTORS.find(c => c.code === connectorCode);

    try {
      // Simulate sync progress
      const newStatuses = new Map(connectorStatuses);
      for (let progress = 0; progress <= 100; progress += 10) {
        newStatuses.set(connectorCode, {
          ...newStatuses.get(connectorCode)!,
          syncProgress: progress,
        });
        setConnectorStatuses(new Map(newStatuses));
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      newStatuses.set(connectorCode, {
        ...newStatuses.get(connectorCode)!,
        status: 'connected',
        lastSync: new Date().toISOString(),
        syncProgress: 100,
        recordsCount: (newStatuses.get(connectorCode)?.recordsCount || 0) + Math.floor(Math.random() * 100),
      });
      setConnectorStatuses(newStatuses);

      // Add to logs
      const newLog: SyncLog = {
        id: `log-${Date.now()}`,
        connector: connectorCode,
        action: 'sync',
        status: 'success',
        message: `סנכרון ${connector?.name} הושלם`,
        timestamp: new Date().toISOString(),
        duration: 2000,
        recordsAffected: Math.floor(Math.random() * 100),
      };
      setSyncLogs([newLog, ...syncLogs]);

      toast.success(`סנכרון ${connector?.name} הושלם בהצלחה`);
    } catch (error) {
      toast.error('הסנכרון נכשל');
    } finally {
      setSyncingConnector(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-slate-400';
      case 'error': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-slate-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 ml-1" />מחובר</Badge>;
      case 'disconnected':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 ml-1" />מנותק</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 ml-1" />שגיאה</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100"><Clock className="h-3 w-3 ml-1" />ממתין</Badge>;
      default:
        return <Badge variant="secondary">לא ידוע</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'insurance': return <Building2 className="h-4 w-4" />;
      case 'aggregator': return <Network className="h-4 w-4" />;
      case 'pension': return <Wallet className="h-4 w-4" />;
      case 'government': return <FileText className="h-4 w-4" />;
      default: return <Server className="h-4 w-4" />;
    }
  };

  // Statistics
  const connectedCount = Array.from(connectorStatuses.values()).filter(s => s.status === 'connected').length;
  const errorCount = Array.from(connectorStatuses.values()).filter(s => s.status === 'error').length;
  const totalRecords = Array.from(connectorStatuses.values()).reduce((sum, s) => sum + (s.recordsCount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-500">טוען נתוני אינטגרציות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Network className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{CONNECTORS.length}</p>
                <p className="text-sm text-slate-500">סה״כ מחברים</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{connectedCount}</p>
                <p className="text-sm text-slate-500">מחוברים</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{errorCount}</p>
                <p className="text-sm text-slate-500">שגיאות</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Database className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRecords.toLocaleString()}</p>
                <p className="text-sm text-slate-500">רשומות מסונכרנות</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4 ml-2" />
            סקירה כללית
          </TabsTrigger>
          <TabsTrigger value="connectors">
            <Network className="h-4 w-4 ml-2" />
            מחברים
          </TabsTrigger>
          <TabsTrigger value="logs">
            <FileText className="h-4 w-4 ml-2" />
            לוגים
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">פעולות מהירות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => loadDashboardData()}>
                  <RefreshCw className="h-4 w-4 ml-2" />
                  רענן נתונים
                </Button>
                <Button variant="outline" onClick={() => {
                  CONNECTORS.forEach(c => testConnection(c.code));
                }}>
                  <Zap className="h-4 w-4 ml-2" />
                  בדוק כל החיבורים
                </Button>
                <Button variant="outline">
                  <Settings className="h-4 w-4 ml-2" />
                  הגדרות סנכרון
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Connectors by Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['insurance', 'aggregator', 'pension', 'government'].map(category => {
              const categoryConnectors = CONNECTORS.filter(c => c.category === category);
              const categoryName = {
                insurance: 'חברות ביטוח',
                aggregator: 'אגרגטורים',
                pension: 'פנסיה',
                government: 'ממשלתי',
              }[category];

              return (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category)}
                      <CardTitle className="text-base">{categoryName}</CardTitle>
                      <Badge variant="secondary" className="mr-auto">
                        {categoryConnectors.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {categoryConnectors.map(connector => {
                        const status = connectorStatuses.get(connector.code);
                        return (
                          <div
                            key={connector.code}
                            className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(status?.status || 'disconnected')}`} />
                              <span className="text-sm font-medium">{connector.name}</span>
                            </div>
                            {getStatusBadge(status?.status || 'disconnected')}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Connectors Tab */}
        <TabsContent value="connectors" className="space-y-4">
          {CONNECTORS.map(connector => {
            const status = connectorStatuses.get(connector.code);
            const isExpanded = expandedConnector === connector.code;
            const Icon = connector.icon;

            return (
              <Card key={connector.code}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${
                        status?.status === 'connected' ? 'bg-green-100' :
                        status?.status === 'error' ? 'bg-red-100' : 'bg-slate-100'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          status?.status === 'connected' ? 'text-green-600' :
                          status?.status === 'error' ? 'text-red-600' : 'text-slate-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{connector.name}</h3>
                          {getStatusBadge(status?.status || 'disconnected')}
                        </div>
                        <p className="text-sm text-slate-500">{connector.description}</p>
                        {status?.lastSync && (
                          <p className="text-xs text-slate-400 mt-1">
                            סנכרון אחרון: {new Date(status.lastSync).toLocaleString('he-IL')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnection(connector.code)}
                        disabled={testingConnector === connector.code}
                      >
                        {testingConnector === connector.code ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => triggerSync(connector.code)}
                        disabled={syncingConnector === connector.code}
                      >
                        {syncingConnector === connector.code ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedConnector(isExpanded ? null : connector.code)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Sync Progress */}
                  {syncingConnector === connector.code && status?.syncProgress !== undefined && (
                    <div className="mt-4">
                      <Progress value={status.syncProgress} className="h-2" />
                      <p className="text-xs text-slate-500 mt-1">מסנכרן... {status.syncProgress}%</p>
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-xs text-slate-500">רשומות</p>
                          <p className="text-lg font-semibold">{status?.recordsCount?.toLocaleString() || 0}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-xs text-slate-500">סטטוס</p>
                          <p className="text-lg font-semibold capitalize">{status?.status || 'לא ידוע'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-xs text-slate-500">קטגוריה</p>
                          <p className="text-lg font-semibold">{connector.category}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-xs text-slate-500">יכולות</p>
                          <p className="text-sm">{connector.features.join(', ')}</p>
                        </div>
                      </div>

                      {status?.lastError && (
                        <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">שגיאה אחרונה:</span>
                          </div>
                          <p className="text-sm text-red-600 mt-1">{status.lastError}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>לוג פעילות</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setSyncLogs([])}>
                  נקה לוג
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {syncLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>אין רשומות בלוג</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {syncLogs.map(log => {
                    const connector = CONNECTORS.find(c => c.code === log.connector);
                    return (
                      <div
                        key={log.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          log.status === 'success' ? 'bg-green-50 border-green-200' :
                          log.status === 'error' ? 'bg-red-50 border-red-200' :
                          'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {log.status === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : log.status === 'error' ? (
                            <XCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          )}
                          <div>
                            <p className="font-medium">{connector?.name} - {log.action}</p>
                            <p className="text-sm text-slate-600">{log.message}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-xs text-slate-500">
                            {new Date(log.timestamp).toLocaleString('he-IL')}
                          </p>
                          {log.duration && (
                            <p className="text-xs text-slate-400">{log.duration}ms</p>
                          )}
                          {log.recordsAffected !== undefined && (
                            <p className="text-xs text-slate-400">{log.recordsAffected} רשומות</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
