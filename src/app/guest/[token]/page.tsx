'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import {
  TrendingUp,
  Users,
  Building2,
  PieChart,
  BarChart3,
  RefreshCw,
  Filter,
  Calendar,
  Wallet,
  Banknote,
  Table2,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Download,
  Search,
  Columns3,
  X,
  Shield,
  Database,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import * as XLSX from 'xlsx'

type GuestState = 'loading' | 'valid' | 'error' | 'expired' | 'revoked'
type ViewTab = 'dashboard' | 'data'

interface ProjectInfo {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
}

interface DashboardStats {
  totalRecords: number
  totalCommission: number
  totalPremium: number
  totalAccumulation: number
  uniqueAgents: number
  uniqueProviders: number
  uniqueBranches: number
}

interface AgentStats {
  name: string
  count: number
  commission: number
  premium: number
  accumulation: number
}

interface ProviderStats {
  name: string
  count: number
  commission: number
  premium: number
  accumulation: number
}

interface BranchStats {
  name: string
  count: number
  commission: number
}

interface MonthlyData {
  month: string
  commission: number
  premium: number
  accumulation: number
  count: number
}

interface RecentRecord {
  provider: string
  processing_month: string
  branch: string
  agent_name: string
  commission: number
  premium: number | null
  accumulation: number | null
}

interface FilterOptions {
  providers: string[]
  branches: string[]
  agents: string[]
  months: string[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

const HEBREW_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toFixed(2)
}

function formatNumber(value: number): string {
  return value.toLocaleString('he-IL')
}

function formatMonthDisplay(monthStr: string): string {
  if (!monthStr) return ''
  const [year, month] = monthStr.split('-')
  const monthIndex = parseInt(month, 10) - 1
  const monthName = HEBREW_MONTHS[monthIndex] || month
  return `${monthName} ${year}`
}

// Column configuration interface
interface ColumnConfig {
  key: string
  label: string
  icon: string
  type: 'text' | 'currency' | 'date' | 'status' | 'phone'
  width: string
}

// Column labels for nifraim/gemel/sales views
const COLUMN_LABELS: Record<string, { label: string; icon: string; type: 'text' | 'currency' | 'date' | 'status' | 'phone' }> = {
  // Gemel/Nifraim columns
  provider: { label: 'יצרן', icon: '🏢', type: 'text' },
  processing_month: { label: 'חודש עיבוד', icon: '📅', type: 'date' },
  branch: { label: 'ענף', icon: '📁', type: 'text' },
  agent_name: { label: 'שם סוכן', icon: '👤', type: 'text' },
  premium: { label: 'פרמיה', icon: '💵', type: 'currency' },
  comission: { label: 'עמלה', icon: '💰', type: 'currency' },
  accumulation_balance: { label: 'צבירה', icon: '💎', type: 'currency' },
  agent_number: { label: 'מספר סוכן', icon: '🔢', type: 'text' },
  supervisor: { label: 'מפקח', icon: '👨‍💼', type: 'text' },
  policy_number: { label: 'מספר פוליסה', icon: '📄', type: 'text' },
  client_name: { label: 'שם לקוח', icon: '👥', type: 'text' },
  client_id: { label: 'ת.ז.', icon: '🪪', type: 'text' },
  phone: { label: 'טלפון', icon: '📱', type: 'phone' },
  status: { label: 'סטטוס', icon: '📋', type: 'status' },
  // Sales (master_data) columns - Hebrew names
  מספר_תהליך: { label: 'מספר תהליך', icon: '🔢', type: 'text' },
  סוג_תהליך: { label: 'סוג תהליך', icon: '📋', type: 'text' },
  סטטוס: { label: 'סטטוס', icon: '📊', type: 'status' },
  מטפל: { label: 'מטפל', icon: '👤', type: 'text' },
  מפקח: { label: 'מפקח', icon: '👨‍💼', type: 'text' },
  לקוח: { label: 'לקוח', icon: '👥', type: 'text' },
  סוג_מוצר_חדש: { label: 'סוג מוצר', icon: '📦', type: 'text' },
  יצרן_חדש: { label: 'יצרן', icon: '🏢', type: 'text' },
  צבירה_צפויה: { label: 'צבירה צפויה', icon: '💎', type: 'currency' },
  הפקדה_חד_פעמית: { label: 'הפקדה חד פעמית', icon: '💵', type: 'currency' },
  פרמיה_צפויה: { label: 'פרמיה צפויה', icon: '💰', type: 'currency' },
  תאריך_פתיחה: { label: 'תאריך פתיחה', icon: '📅', type: 'date' },
  import_month: { label: 'חודש ייבוא', icon: '📅', type: 'text' },
  import_year: { label: 'שנת ייבוא', icon: '📅', type: 'text' },
}

export default function GuestPage() {
  const params = useParams()
  const token = params.token as string

  // State
  const [guestState, setGuestState] = useState<GuestState>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [dashboardType, setDashboardType] = useState<'nifraim' | 'gemel' | 'sales' | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [topAgents, setTopAgents] = useState<AgentStats[]>([])
  const [providers, setProviders] = useState<ProviderStats[]>([])
  const [branches, setBranches] = useState<BranchStats[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyData[]>([])
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([])
  const [allData, setAllData] = useState<Record<string, unknown>[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ providers: [], branches: [], agents: [], months: [] })
  const [loading, setLoading] = useState(true)

  // Active view tab
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard')

  // Filters
  const [selectedProvider, setSelectedProvider] = useState<string>('all')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [agentSearch, setAgentSearch] = useState('')
  const [showTable, setShowTable] = useState(false)

  // Data view state
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set())
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const pageSize = 100

  // Extract unique years from months for year filter
  const availableYears = useMemo(() => {
    return Array.from(
      new Set(filterOptions.months.map(m => m.substring(0, 4)))
    ).sort((a, b) => b.localeCompare(a))
  }, [filterOptions.months])

  // Filter months by selected year
  const filteredMonths = useMemo(() => {
    return selectedYear === 'all'
      ? filterOptions.months
      : filterOptions.months.filter(m => m.startsWith(selectedYear))
  }, [filterOptions.months, selectedYear])

  // Data columns for table view
  const dataColumns = useMemo(() => {
    if (allData.length === 0) return []
    const firstRow = allData[0]
    return Object.keys(firstRow).filter(key =>
      !['id', 'raw_data', 'created_at', 'updated_at', 'import_batch', 'project_id'].includes(key)
    )
  }, [allData])

  // Column config list with Hebrew labels and icons
  const columnConfigList = useMemo((): ColumnConfig[] => {
    return dataColumns.map(key => {
      const config = COLUMN_LABELS[key]
      if (config) {
        return {
          key,
          label: config.label,
          icon: config.icon,
          type: config.type,
          width: key === 'agent_name' ? '180px' : key.includes('commission') || key.includes('premium') || key.includes('accumulation') ? '130px' : '120px'
        }
      }
      // Fallback for unknown columns - auto-detect type
      const isNumeric = allData.some(row => typeof row[key] === 'number')
      return {
        key,
        label: key.replace(/_/g, ' '),
        icon: isNumeric ? '📊' : '📄',
        type: isNumeric ? 'currency' as const : 'text' as const,
        width: '120px'
      }
    })
  }, [dataColumns, allData])

  // Initialize visible columns
  useEffect(() => {
    if (columnConfigList.length > 0 && visibleColumns.size === 0) {
      setVisibleColumns(new Set(columnConfigList.map(c => c.key)))
    }
  }, [columnConfigList, visibleColumns.size])

  // Sort handler
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  // Format cell value based on column type
  const formatCellValue = (column: ColumnConfig, value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-slate-400">-</span>
    }

    switch (column.type) {
      case 'currency': {
        const num = Number(value)
        if (isNaN(num)) return <span className="text-slate-400">-</span>
        const isNegative = num < 0
        return (
          <span className={cn(
            'font-mono tabular-nums font-medium',
            isNegative ? 'text-red-600 font-semibold' : 'text-slate-800'
          )}>
            {new Intl.NumberFormat('he-IL', {
              style: 'currency',
              currency: 'ILS',
              maximumFractionDigits: 0,
            }).format(num)}
          </span>
        )
      }
      case 'date':
        try {
          const dateStr = String(value)
          // Handle YYYY-MM format
          if (dateStr.match(/^\d{4}-\d{2}$/)) {
            return <span className="text-slate-700 font-medium">{formatMonthDisplay(dateStr)}</span>
          }
          return (
            <span className="text-slate-700 font-medium">
              {new Date(dateStr).toLocaleDateString('he-IL')}
            </span>
          )
        } catch {
          return <span className="text-slate-400">-</span>
        }
      case 'status': {
        const statusColors: Record<string, string> = {
          'פעיל': 'bg-emerald-100 text-emerald-700',
          'בטיפול': 'bg-amber-100 text-amber-700',
          'הושלם': 'bg-blue-100 text-blue-700',
          'בוטל': 'bg-red-100 text-red-700',
        }
        const statusClass = statusColors[String(value)] || 'bg-slate-100 text-slate-600'
        return (
          <Badge className={cn('text-xs font-normal', statusClass)}>
            {String(value)}
          </Badge>
        )
      }
      case 'phone': {
        const phone = String(value).replace(/\D/g, '')
        const formatted = phone.startsWith('972') ? '0' + phone.slice(3) : phone
        return (
          <span className="font-mono text-slate-700 font-medium">
            {formatted.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
          </span>
        )
      }
      default: {
        const str = String(value)
        return (
          <span className="text-slate-800 font-medium" title={str.length > 30 ? str : undefined}>
            {str.length > 30 ? str.substring(0, 30) + '...' : str}
          </span>
        )
      }
    }
  }

  // Filtered data for table
  const filteredData = useMemo(() => {
    if (!allData.length) return []

    let result = allData

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(row => {
        return Object.values(row).some(val =>
          String(val || '').toLowerCase().includes(query)
        )
      })
    }

    // Apply sorting
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortKey]
        const bVal = b[sortKey]

        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1

        // Handle numbers
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
        }

        const comparison = String(aVal).localeCompare(String(bVal), 'he', { numeric: true })
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return result
  }, [allData, searchQuery, sortKey, sortDirection])

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize])

  const totalPages = Math.ceil(filteredData.length / pageSize)

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    setLoading(true)

    try {
      const searchParams = new URLSearchParams()
      if (selectedProvider !== 'all') searchParams.append('provider', selectedProvider)
      if (selectedBranch !== 'all') searchParams.append('branch', selectedBranch)
      if (selectedMonth !== 'all') searchParams.append('month', selectedMonth)
      if (selectedYear !== 'all' && selectedMonth === 'all') searchParams.append('year', selectedYear)
      if (agentSearch) searchParams.append('agent', agentSearch)

      const response = await fetch(
        `/api/guest/${token}/view-dashboard?${searchParams.toString()}`
      )

      if (!response.ok) {
        const errorData = await response.json()

        if (response.status === 401) {
          setGuestState('error')
          setErrorMessage('קישור גישה לא תקין')
          return
        }
        if (response.status === 403) {
          setGuestState('revoked')
          setErrorMessage('הגישה בוטלה')
          return
        }
        if (response.status === 410) {
          setGuestState('expired')
          setErrorMessage('הגישה פגה תוקף')
          return
        }

        throw new Error(errorData.error || 'Failed to fetch dashboard data')
      }

      const data = await response.json()

      setGuestState('valid')
      setProject(data.project)
      setDashboardType(data.dashboardType)
      setStats(data.stats)
      setTopAgents(data.topAgents || [])
      setProviders(data.providers || [])
      setBranches(data.branches || [])
      setMonthlyTrend(data.monthlyTrend || [])
      setRecentRecords(data.recentRecords || [])
      setAllData(data.allData || [])
      setFilterOptions(data.filterOptions || { providers: [], branches: [], agents: [], months: [] })
    } catch (err) {
      console.error('Dashboard error:', err)
      if (guestState === 'loading') {
        setGuestState('error')
        setErrorMessage(err instanceof Error ? err.message : 'שגיאה בטעינת הדשבורד')
      }
      toast.error('שגיאה בטעינת הנתונים')
    } finally {
      setLoading(false)
    }
  }, [token, selectedProvider, selectedBranch, selectedMonth, selectedYear, agentSearch, guestState])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // Export functions
  const exportToCSV = () => {
    if (!filteredData.length) return

    const visibleCols = Array.from(visibleColumns)
    const headers = visibleCols.join(',')
    const rows = filteredData.map(row =>
      visibleCols.map(col => {
        const val = row[col]
        const str = String(val ?? '')
        return str.includes(',') ? `"${str}"` : str
      }).join(',')
    )

    const csv = [headers, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project?.name || 'data'}_export.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('הקובץ יורד בהצלחה')
  }

  const exportToExcel = () => {
    if (!filteredData.length) return

    const visibleCols = Array.from(visibleColumns)
    const exportData = filteredData.map(row => {
      const obj: Record<string, unknown> = {}
      visibleCols.forEach(col => {
        obj[col] = row[col]
      })
      return obj
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    XLSX.writeFile(wb, `${project?.name || 'data'}_export.xlsx`)
    toast.success('הקובץ יורד בהצלחה')
  }

  // Is this a nifraim or gemel dashboard?
  const isNifraim = dashboardType === 'nifraim'
  const isGemel = dashboardType === 'gemel'
  const valueLabel = isNifraim ? 'פרמיה' : 'צבירה'

  // Clear all filters
  const clearFilters = () => {
    setSelectedProvider('all')
    setSelectedBranch('all')
    setSelectedMonth('all')
    setSelectedYear('all')
    setAgentSearch('')
  }

  const hasActiveFilters = selectedProvider !== 'all' || selectedBranch !== 'all' || selectedMonth !== 'all' || selectedYear !== 'all' || agentSearch

  // Loading state
  if (guestState === 'loading' && loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  // Error states
  if (guestState === 'error' || guestState === 'expired' || guestState === 'revoked') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
              guestState === 'expired' ? 'bg-amber-100' : 'bg-red-100'
            )}>
              {guestState === 'expired' ? (
                <Calendar className="h-8 w-8 text-amber-600" />
              ) : (
                <AlertCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">
              {guestState === 'expired' ? 'הגישה פגה תוקף' :
               guestState === 'revoked' ? 'הגישה בוטלה' : 'שגיאה'}
            </h1>
            <p className="text-slate-600">
              {errorMessage || 'לא ניתן לגשת לפרויקט זה'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">{project?.name}</h1>
              {project?.description && (
                <p className="text-sm text-slate-500">{project.description}</p>
              )}
            </div>
          </div>
          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
            <Shield className="h-3 w-3 ml-1" />
            גישת אורח
          </Badge>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-6">
        <nav className="max-w-7xl mx-auto flex items-center gap-1 -mb-px">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'dashboard'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )}
          >
            {isNifraim ? 'דשבורד נפרעים' : 'דשבורד גמל'}
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'data'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )}
          >
            תצוגת נתונים
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {activeTab === 'dashboard' ? (
            <>
              {/* Dashboard Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">
                    {isNifraim ? 'דשבורד נפרעים' : 'דשבורד גמל'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    יצרן | תאריך עיבוד | ענף | שם סוכן | עמלה | {valueLabel}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchDashboard}
                  disabled={loading}
                  className="border-slate-200 text-slate-600"
                >
                  <RefreshCw className={cn('h-4 w-4 ml-2', loading && 'animate-spin')} />
                  רענן
                </Button>
              </div>

              {/* Filters */}
              <Card className="bg-white border-slate-200">
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">סינון:</span>
                    </div>

                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                      <SelectTrigger className="w-[160px] h-9">
                        <SelectValue placeholder="יצרן" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">כל היצרנים</SelectItem>
                        {filterOptions.providers.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger className="w-[160px] h-9">
                        <SelectValue placeholder="ענף" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">כל הענפים</SelectItem>
                        {filterOptions.branches.map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedYear} onValueChange={(value) => {
                      setSelectedYear(value)
                      if (value !== selectedYear) {
                        setSelectedMonth('all')
                      }
                    }}>
                      <SelectTrigger className="w-[120px] h-9">
                        <Calendar className="h-4 w-4 ml-2 text-slate-400" />
                        <SelectValue placeholder="שנה" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">כל השנים</SelectItem>
                        {availableYears.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-[160px] h-9">
                        <Calendar className="h-4 w-4 ml-2 text-slate-400" />
                        <SelectValue placeholder="חודש" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">כל החודשים</SelectItem>
                        {filteredMonths.map((m) => (
                          <SelectItem key={m} value={m}>{formatMonthDisplay(m)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="חיפוש סוכן..."
                      value={agentSearch}
                      onChange={(e) => setAgentSearch(e.target.value)}
                      className="w-48 h-9"
                    />

                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-slate-500"
                      >
                        נקה פילטרים
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500">טוען נתונים...</p>
                  </div>
                </div>
              )}

              {/* Dashboard Content */}
              {!loading && stats && (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-medium text-blue-100 uppercase">סה״כ רשומות</p>
                            <p className="text-2xl font-bold mt-1">{formatNumber(stats.totalRecords)}</p>
                          </div>
                          <BarChart3 className="h-8 w-8 text-blue-200" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-medium text-emerald-100 uppercase">סה״כ עמלות</p>
                            <p className="text-2xl font-bold mt-1">₪{formatCurrency(stats.totalCommission)}</p>
                          </div>
                          <Banknote className="h-8 w-8 text-emerald-200" />
                        </div>
                      </CardContent>
                    </Card>

                    {isNifraim ? (
                      <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                        <CardContent className="pt-5 pb-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-medium text-amber-100 uppercase">סה״כ פרמיה</p>
                              <p className="text-2xl font-bold mt-1">₪{formatCurrency(stats.totalPremium)}</p>
                            </div>
                            <Banknote className="h-8 w-8 text-amber-200" />
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                        <CardContent className="pt-5 pb-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-medium text-purple-100 uppercase">סה״כ צבירה</p>
                              <p className="text-2xl font-bold mt-1">₪{formatCurrency(stats.totalAccumulation)}</p>
                            </div>
                            <Wallet className="h-8 w-8 text-purple-200" />
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-medium text-orange-100 uppercase">סוכנים</p>
                            <p className="text-2xl font-bold mt-1">{formatNumber(stats.uniqueAgents)}</p>
                          </div>
                          <Users className="h-8 w-8 text-orange-200" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-slate-600 to-slate-700 text-white">
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-medium text-slate-300 uppercase">יצרנים</p>
                            <p className="text-2xl font-bold mt-1">{formatNumber(stats.uniqueProviders)}</p>
                          </div>
                          <Building2 className="h-8 w-8 text-slate-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Monthly Trend */}
                    <Card className="bg-white border-slate-200">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-semibold text-slate-800">
                          מגמת עמלות חודשית
                        </CardTitle>
                        <Badge className="bg-emerald-100 text-emerald-700">
                          {monthlyTrend.length} חודשים
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={monthlyTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="month"
                              tick={{ fontSize: 11 }}
                              tickFormatter={(v) => v.substring(5)}
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`}
                            />
                            <Tooltip
                              formatter={(value) => [`₪${formatCurrency(Number(value) || 0)}`, 'עמלות']}
                              labelFormatter={(label) => `חודש: ${label}`}
                            />
                            <Area
                              type="monotone"
                              dataKey="commission"
                              name="עמלות"
                              stroke="#10b981"
                              fill="#10b981"
                              fillOpacity={0.3}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Providers Bar Chart */}
                    <Card className="bg-white border-slate-200">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-semibold text-slate-800">
                          עמלות לפי יצרן
                        </CardTitle>
                        <Badge className="bg-blue-100 text-blue-700">
                          {providers.length} יצרנים
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={providers.slice(0, 10)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(v) => `₪${formatCurrency(v)}`} />
                            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value) => [`₪${formatCurrency(Number(value) || 0)}`, 'עמלה']} />
                            <Bar dataKey="commission" name="עמלה" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tables Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Agents Table */}
                    <Card className="bg-white border-slate-200">
                      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-500" />
                          סוכנים מובילים
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {topAgents.slice(0, 15).map((agent, index) => (
                            <div
                              key={agent.name}
                              className={cn(
                                'flex items-center justify-between p-3 rounded-lg',
                                index % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                                  index < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'
                                )}>
                                  {index + 1}
                                </div>
                                <p className="text-sm font-medium text-slate-800">{agent.name}</p>
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-bold text-emerald-600">
                                  ₪{formatCurrency(agent.commission)}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {formatNumber(agent.count)} רשומות
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Branches Table */}
                    <Card className="bg-white border-slate-200">
                      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                          <PieChart className="h-5 w-5 text-purple-500" />
                          עמלות לפי ענף
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {branches.slice(0, 15).map((branch, index) => (
                            <div
                              key={branch.name}
                              className={cn(
                                'flex items-center justify-between p-3 rounded-lg',
                                index % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                              )}
                            >
                              <p className="text-sm font-medium text-slate-800">{branch.name}</p>
                              <div className="text-left">
                                <p className="text-sm font-bold text-purple-600">
                                  ₪{formatCurrency(branch.commission)}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {formatNumber(branch.count)} רשומות
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Records Table */}
                  <Card className="bg-white border-slate-200">
                    <CardHeader
                      className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 cursor-pointer"
                      onClick={() => setShowTable(!showTable)}
                    >
                      <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <Table2 className="h-5 w-5 text-slate-500" />
                        נתונים אחרונים ({recentRecords.length})
                      </CardTitle>
                      {showTable ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </CardHeader>
                    {showTable && (
                      <CardContent className="pt-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="text-right py-3 px-4 font-semibold text-slate-600">יצרן</th>
                                <th className="text-right py-3 px-4 font-semibold text-slate-600">תאריך עיבוד</th>
                                <th className="text-right py-3 px-4 font-semibold text-slate-600">ענף</th>
                                <th className="text-right py-3 px-4 font-semibold text-slate-600">שם סוכן</th>
                                <th className="text-right py-3 px-4 font-semibold text-slate-600">עמלה</th>
                                <th className="text-right py-3 px-4 font-semibold text-slate-600">{valueLabel}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recentRecords.map((record, index) => (
                                <tr key={index} className={cn(index % 2 === 0 ? 'bg-slate-50' : '')}>
                                  <td className="py-3 px-4 text-slate-800">{record.provider}</td>
                                  <td className="py-3 px-4 text-slate-600">{record.processing_month}</td>
                                  <td className="py-3 px-4 text-slate-600">{record.branch}</td>
                                  <td className="py-3 px-4 font-medium text-slate-800">{record.agent_name}</td>
                                  <td className="py-3 px-4 text-emerald-600 font-medium">
                                    ₪{formatCurrency(record.commission || 0)}
                                  </td>
                                  <td className="py-3 px-4 text-blue-600 font-medium">
                                    ₪{formatCurrency(isNifraim ? (record.premium || 0) : (record.accumulation || 0))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </>
              )}
            </>
          ) : (
            /* Data View Tab - Professional Design */
            <>
              {/* Data Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                    <Table2 className="h-5 w-5 text-blue-500" />
                    תצוגת נתונים
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {formatNumber(filteredData.length)} רשומות
                    {filteredData.length !== allData.length && ` (מסוננים מתוך ${formatNumber(allData.length)})`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchDashboard}
                    disabled={loading}
                    className="border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    <RefreshCw className={cn('h-4 w-4 ml-2', loading && 'animate-spin')} />
                    רענן
                  </Button>
                </div>
              </div>

              {/* Search and Actions Bar */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="חיפוש בכל העמודות..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          setCurrentPage(1)
                        }}
                        className="pr-9 border-slate-200"
                      />
                    </div>

                    {/* Columns Selector */}
                    <DropdownMenu open={columnsMenuOpen} onOpenChange={setColumnsMenuOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="border-slate-200 hover:bg-slate-100">
                          <Columns3 className="h-4 w-4 ml-2" />
                          עמודות ({visibleColumns.size}/{columnConfigList.length})
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
                        <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                          <div className="flex justify-between">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setVisibleColumns(new Set(columnConfigList.map(c => c.key)))}
                              className="text-xs"
                            >
                              הצג הכל
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setVisibleColumns(new Set())}
                              className="text-xs"
                            >
                              הסתר הכל
                            </Button>
                          </div>
                        </div>
                        {columnConfigList.map((col) => (
                          <DropdownMenuItem
                            key={col.key}
                            className="flex items-center gap-2"
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Checkbox
                              checked={visibleColumns.has(col.key)}
                              onCheckedChange={(checked) => {
                                const newVisible = new Set(visibleColumns)
                                if (checked) {
                                  newVisible.add(col.key)
                                } else {
                                  newVisible.delete(col.key)
                                }
                                setVisibleColumns(newVisible)
                              }}
                            />
                            <span className="text-sm opacity-70">{col.icon}</span>
                            <span className="text-sm">{col.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Export */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="border-slate-200 hover:bg-slate-100">
                          <Download className="h-4 w-4 ml-2" />
                          ייצוא
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={exportToCSV} className="gap-2">
                          <span>📄</span> ייצוא ל-CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportToExcel} className="gap-2">
                          <span>📊</span> ייצוא ל-Excel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Data Table */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                    <table className="w-full text-sm min-w-max">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                          {columnConfigList
                            .filter(col => visibleColumns.has(col.key))
                            .map((col) => (
                            <th
                              key={col.key}
                              className="text-right py-3 px-4 font-bold text-slate-700 border-b border-slate-200 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                              style={{ width: col.width, minWidth: col.width }}
                              onClick={() => handleSort(col.key)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm opacity-70">{col.icon}</span>
                                <span>{col.label}</span>
                                {sortKey === col.key && (
                                  <span className="text-blue-600">
                                    {sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </span>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={visibleColumns.size} className="text-center py-16">
                              <div className="flex items-center justify-center gap-3 text-slate-500">
                                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                                <span>טוען נתונים...</span>
                              </div>
                            </td>
                          </tr>
                        ) : paginatedData.length === 0 ? (
                          <tr>
                            <td colSpan={visibleColumns.size} className="text-center py-16 text-slate-500">
                              <div className="text-4xl mb-2">📭</div>
                              לא נמצאו תוצאות
                            </td>
                          </tr>
                        ) : (
                          paginatedData.map((row, index) => (
                            <tr
                              key={index}
                              className={cn(
                                'border-b border-slate-100 transition-colors',
                                index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                              )}
                            >
                              {columnConfigList
                                .filter(col => visibleColumns.has(col.key))
                                .map((col) => (
                                <td
                                  key={col.key}
                                  className="py-3 px-4"
                                  style={{ maxWidth: col.width }}
                                >
                                  {formatCellValue(col, row[col.key])}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Professional Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
                      <p className="text-sm text-slate-500">
                        מציג <span className="font-medium text-slate-700">{((currentPage - 1) * pageSize) + 1}</span> - <span className="font-medium text-slate-700">{Math.min(currentPage * pageSize, filteredData.length)}</span> מתוך <span className="font-medium text-slate-700">{formatNumber(filteredData.length)}</span>
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(1)}
                          className="border-slate-200 h-8 w-8 p-0 hover:bg-slate-100 disabled:opacity-50"
                        >
                          <ChevronDown className="h-4 w-4 rotate-90" />
                          <ChevronDown className="h-4 w-4 rotate-90 -ml-2" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(p => p - 1)}
                          className="border-slate-200 h-8 w-8 p-0 hover:bg-slate-100 disabled:opacity-50"
                        >
                          <ChevronDown className="h-4 w-4 rotate-90" />
                        </Button>

                        <div className="flex items-center gap-1 mx-2">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let page: number
                            if (totalPages <= 5) {
                              page = i + 1
                            } else if (currentPage <= 3) {
                              page = i + 1
                            } else if (currentPage >= totalPages - 2) {
                              page = totalPages - 4 + i
                            } else {
                              page = currentPage - 2 + i
                            }
                            return (
                              <Button
                                key={page}
                                variant={currentPage === page ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className={cn(
                                  'h-8 w-8 p-0 font-medium',
                                  currentPage === page
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                                )}
                              >
                                {page}
                              </Button>
                            )
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(p => p + 1)}
                          className="border-slate-200 h-8 w-8 p-0 hover:bg-slate-100 disabled:opacity-50"
                        >
                          <ChevronDown className="h-4 w-4 -rotate-90" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className="border-slate-200 h-8 w-8 p-0 hover:bg-slate-100 disabled:opacity-50"
                        >
                          <ChevronDown className="h-4 w-4 -rotate-90" />
                          <ChevronDown className="h-4 w-4 -rotate-90 -ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
