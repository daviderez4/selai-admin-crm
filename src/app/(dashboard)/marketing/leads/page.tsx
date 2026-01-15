'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  ExternalLink,
  UserPlus,
  Check,
  X,
  ChevronDown,
  Loader2,
  Eye,
  Trash2,
  RefreshCw,
  Facebook,
  Instagram,
  MessageCircle,
  Music2,
  Globe,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

// Lead status configuration
const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  new: { label: 'חדש', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  contacted: { label: 'נוצר קשר', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  qualified: { label: 'מתאים', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  converted: { label: 'הומר ללקוח', color: 'text-green-600', bgColor: 'bg-green-100' },
  lost: { label: 'אבד', color: 'text-red-600', bgColor: 'bg-red-100' },
}

const sourceIcons: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
  tiktok: <Music2 className="h-4 w-4" />,
  direct: <Globe className="h-4 w-4" />,
}

const sourceColors: Record<string, string> = {
  facebook: 'bg-blue-500',
  instagram: 'bg-gradient-to-r from-pink-500 to-purple-500',
  whatsapp: 'bg-green-500',
  tiktok: 'bg-slate-800',
  direct: 'bg-slate-500',
}

interface MarketingLead {
  id: string
  name: string
  phone: string
  email?: string
  message?: string
  insurance_type?: string
  source: string
  status: string
  landing_page_id?: string
  campaign_id?: string
  utm_params?: Record<string, string>
  created_at: string
  updated_at?: string
  landing_pages?: { name: string; slug: string }
  marketing_campaigns?: { name: string }
}

// Mock leads data
const mockLeads: MarketingLead[] = [
  {
    id: '1',
    name: 'יוסי כהן',
    phone: '050-1234567',
    email: 'yossi@example.com',
    insurance_type: 'car',
    source: 'facebook',
    status: 'new',
    landing_page_id: 'car-insurance',
    created_at: new Date().toISOString(),
    landing_pages: { name: 'ביטוח רכב', slug: 'car-insurance' },
  },
  {
    id: '2',
    name: 'שרה לוי',
    phone: '052-9876543',
    email: 'sara@example.com',
    message: 'מעוניינת בביטוח חיים למשפחה',
    insurance_type: 'life',
    source: 'instagram',
    status: 'contacted',
    landing_page_id: 'life-insurance',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    landing_pages: { name: 'ביטוח חיים', slug: 'life-insurance' },
  },
  {
    id: '3',
    name: 'דוד אברהם',
    phone: '054-5551234',
    insurance_type: 'home',
    source: 'direct',
    status: 'qualified',
    landing_page_id: 'home-insurance',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    landing_pages: { name: 'ביטוח דירה', slug: 'home-insurance' },
  },
  {
    id: '4',
    name: 'מרים גולן',
    phone: '058-7778889',
    email: 'miriam@example.com',
    insurance_type: 'health',
    source: 'whatsapp',
    status: 'converted',
    landing_page_id: 'health-insurance',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    landing_pages: { name: 'ביטוח בריאות', slug: 'health-insurance' },
  },
  {
    id: '5',
    name: 'משה פרץ',
    phone: '053-4445556',
    insurance_type: 'business',
    source: 'facebook',
    status: 'new',
    landing_page_id: 'business-insurance',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    landing_pages: { name: 'ביטוח עסקי', slug: 'business-insurance' },
  },
]

const insuranceTypeLabels: Record<string, string> = {
  car: 'ביטוח רכב',
  home: 'ביטוח דירה',
  life: 'ביטוח חיים',
  health: 'ביטוח בריאות',
  business: 'ביטוח עסקי',
  pension: 'פנסיה וחיסכון',
  other: 'אחר',
}

export default function MarketingLeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<MarketingLead[]>(mockLeads)
  const [filteredLeads, setFilteredLeads] = useState<MarketingLead[]>(mockLeads)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [selectedLead, setSelectedLead] = useState<MarketingLead | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Filter leads based on search and filters
  useEffect(() => {
    let filtered = [...leads]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (lead) =>
          lead.name.toLowerCase().includes(query) ||
          lead.phone.includes(query) ||
          lead.email?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((lead) => lead.status === statusFilter)
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter((lead) => lead.source === sourceFilter)
    }

    setFilteredLeads(filtered)
  }, [leads, searchQuery, statusFilter, sourceFilter])

  // Update lead status
  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, status: newStatus, updated_at: new Date().toISOString() } : lead
      )
    )
    toast.success(`סטטוס הליד עודכן ל${statusConfig[newStatus].label}`)
    setIsLoading(false)
  }

  // Convert lead to contact
  const convertToContact = async (lead: MarketingLead) => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Update lead status to converted
    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id ? { ...l, status: 'converted', updated_at: new Date().toISOString() } : l
      )
    )

    toast.success('הליד הומר לאיש קשר בהצלחה!')
    setIsConvertDialogOpen(false)
    setSelectedLead(null)
    setIsLoading(false)

    // In production, this would actually create a contact in the CRM
    // router.push(`/projects/default/crm/contacts/new?lead_id=${lead.id}`)
  }

  // Delete lead
  const deleteLead = async (leadId: string) => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setLeads((prev) => prev.filter((lead) => lead.id !== leadId))
    toast.success('הליד נמחק בהצלחה')
    setIsLoading(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'לפני פחות משעה'
    if (diffHours < 24) return `לפני ${diffHours} שעות`
    if (diffDays === 1) return 'אתמול'
    if (diffDays < 7) return `לפני ${diffDays} ימים`
    return date.toLocaleDateString('he-IL')
  }

  // Stats calculation
  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    converted: leads.filter((l) => l.status === 'converted').length,
    conversionRate: leads.length > 0
      ? ((leads.filter((l) => l.status === 'converted').length / leads.length) * 100).toFixed(1)
      : '0',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-6" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            לידים מקמפיינים
          </h1>
          <p className="text-slate-500">נהל לידים שהגיעו מדפי נחיתה וקמפיינים</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            setLeads([...mockLeads])
            toast.success('הנתונים רועננו')
          }}
        >
          <RefreshCw className="h-4 w-4" />
          רענן
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-8"
      >
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-sm text-slate-500">סה"כ לידים</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.new}</p>
              <p className="text-sm text-slate-500">לידים חדשים</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.contacted}</p>
              <p className="text-sm text-slate-500">נוצר קשר</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.converted}</p>
              <p className="text-sm text-slate-500">הומרו ללקוחות</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.conversionRate}%</p>
              <p className="text-sm text-slate-500">יחס המרה</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4 mb-6"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="חיפוש לפי שם, טלפון או אימייל..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 bg-white/80 backdrop-blur-sm border-slate-200"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white/80">
            <SelectValue placeholder="סטטוס" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-40 bg-white/80">
            <SelectValue placeholder="מקור" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המקורות</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="direct">ישיר</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Leads List */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-right p-4 text-sm font-semibold text-slate-600">שם</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-600">פרטי קשר</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-600">סוג ביטוח</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-600">מקור</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-600">סטטוס</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-600">תאריך</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-600">פעולות</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredLeads.map((lead, index) => (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{lead.name}</p>
                            {lead.landing_pages && (
                              <p className="text-xs text-slate-500">{lead.landing_pages.name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="h-3 w-3" />
                            <span dir="ltr">{lead.phone}</span>
                          </div>
                          {lead.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Mail className="h-3 w-3" />
                              <span dir="ltr">{lead.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary">
                          {lead.insurance_type ? insuranceTypeLabels[lead.insurance_type] : 'לא צוין'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-white text-xs ${sourceColors[lead.source] || 'bg-slate-500'}`}>
                          {sourceIcons[lead.source]}
                          <span className="capitalize">{lead.source}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Select
                          value={lead.status}
                          onValueChange={(value) => updateLeadStatus(lead.id, value)}
                        >
                          <SelectTrigger className={`w-32 h-8 text-xs ${statusConfig[lead.status]?.bgColor} ${statusConfig[lead.status]?.color} border-0`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Calendar className="h-3 w-3" />
                          {formatDate(lead.created_at)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedLead(lead)
                              setIsDetailOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => {
                              setSelectedLead(lead)
                              setIsConvertDialogOpen(true)
                            }}
                            disabled={lead.status === 'converted'}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => window.open(`tel:${lead.phone}`)}>
                                <Phone className="h-4 w-4 ml-2" />
                                התקשר
                              </DropdownMenuItem>
                              {lead.email && (
                                <DropdownMenuItem onClick={() => window.open(`mailto:${lead.email}`)}>
                                  <Mail className="h-4 w-4 ml-2" />
                                  שלח אימייל
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`)
                                }
                              >
                                <MessageCircle className="h-4 w-4 ml-2" />
                                WhatsApp
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => deleteLead(lead.id)}
                              >
                                <Trash2 className="h-4 w-4 ml-2" />
                                מחק
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredLeads.length === 0 && (
            <div className="text-center py-16">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">לא נמצאו לידים</h3>
              <p className="text-slate-500">נסה לשנות את הפילטרים או החיפוש</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>פרטי ליד</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                  {selectedLead.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedLead.name}</h3>
                  <Badge className={`${statusConfig[selectedLead.status]?.bgColor} ${statusConfig[selectedLead.status]?.color} border-0`}>
                    {statusConfig[selectedLead.status]?.label}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">טלפון</p>
                  <p className="font-semibold" dir="ltr">{selectedLead.phone}</p>
                </div>
                {selectedLead.email && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">אימייל</p>
                    <p className="font-semibold text-sm" dir="ltr">{selectedLead.email}</p>
                  </div>
                )}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">מקור</p>
                  <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-white text-xs ${sourceColors[selectedLead.source]}`}>
                    {sourceIcons[selectedLead.source]}
                    <span className="capitalize">{selectedLead.source}</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">סוג ביטוח</p>
                  <p className="font-semibold">
                    {selectedLead.insurance_type ? insuranceTypeLabels[selectedLead.insurance_type] : 'לא צוין'}
                  </p>
                </div>
              </div>

              {selectedLead.message && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-2">הודעה</p>
                  <p className="text-slate-700">{selectedLead.message}</p>
                </div>
              )}

              {selectedLead.landing_pages && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1">דף נחיתה</p>
                  <p className="font-semibold text-blue-800">{selectedLead.landing_pages.name}</p>
                </div>
              )}

              <div className="text-sm text-slate-500">
                נוצר: {new Date(selectedLead.created_at).toLocaleString('he-IL')}
              </div>
            </div>
          )}
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              סגור
            </Button>
            <Button
              onClick={() => {
                setIsDetailOpen(false)
                setIsConvertDialogOpen(true)
              }}
              disabled={selectedLead?.status === 'converted'}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              המר לאיש קשר
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Contact Dialog */}
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>המרה לאיש קשר</DialogTitle>
            <DialogDescription>
              האם להמיר את הליד "{selectedLead?.name}" לאיש קשר במערכת?
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="py-4">
              <div className="p-4 bg-green-50 rounded-xl text-center">
                <UserPlus className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-green-800 mb-1">{selectedLead.name}</p>
                <p className="text-sm text-green-600">{selectedLead.phone}</p>
              </div>
              <p className="text-sm text-slate-500 mt-4 text-center">
                איש הקשר יווצר באזור אנשי הקשר במערכת ויהיה זמין להמרה ללקוח
              </p>
            </div>
          )}
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setIsConvertDialogOpen(false)} disabled={isLoading}>
              ביטול
            </Button>
            <Button
              onClick={() => selectedLead && convertToContact(selectedLead)}
              disabled={isLoading}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              המר לאיש קשר
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
