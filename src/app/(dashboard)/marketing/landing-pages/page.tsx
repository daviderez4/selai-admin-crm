'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  MoreVertical,
  FileText,
  Users,
  TrendingUp,
  Calendar,
  Globe,
  Sparkles,
  Share2,
  MessageCircle,
  BarChart3,
  Check,
  QrCode,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { TEMPLATE_INFO } from '@/types/marketing'
import { useMarketingStore, type LandingPage } from '@/stores/marketingStore'
import { toast } from 'sonner'

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'טיוטה', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  published: { label: 'פורסם', color: 'text-green-600', bgColor: 'bg-green-100' },
  archived: { label: 'בארכיון', color: 'text-orange-600', bgColor: 'bg-orange-100' },
}

export default function LandingPagesPage() {
  const { landingPages, setLandingPages, deleteLandingPage, updateLandingPage } = useMarketingStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch landing pages from API on mount
  useEffect(() => {
    fetchLandingPages()
  }, [])

  const fetchLandingPages = async () => {
    try {
      const res = await fetch('/api/marketing/landing-pages')
      if (res.ok) {
        const data = await res.json()
        setLandingPages(data.pages || [])
      }
    } catch (error) {
      console.error('Error fetching landing pages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredPages = landingPages.filter((page) => {
    const matchesSearch = page.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || page.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getTemplateInfo = (slug: string) => {
    return TEMPLATE_INFO.find((t) => t.slug === slug)
  }

  const getPageUrl = (slug: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/lp/${slug}`
    }
    return `/lp/${slug}`
  }

  const copyLink = (slug: string) => {
    const url = getPageUrl(slug)
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    toast.success('הקישור הועתק!')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const shareWhatsApp = (page: LandingPage) => {
    const url = getPageUrl(page.slug)
    const text = encodeURIComponent(`${page.name}\n\n${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const shareWhatsAppWeb = (page: LandingPage) => {
    const url = getPageUrl(page.slug)
    const text = encodeURIComponent(`${page.name}\n\n${url}`)
    window.open(`https://web.whatsapp.com/send?text=${text}`, '_blank')
  }

  const openShareDialog = (page: LandingPage) => {
    setSelectedPage(page)
    setShareDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את דף הנחיתה?')) {
      try {
        const res = await fetch(`/api/marketing/landing-pages/${id}`, { method: 'DELETE' })
        if (res.ok) {
          deleteLandingPage(id)
          toast.success('דף הנחיתה נמחק בהצלחה')
        } else {
          toast.error('שגיאה במחיקת דף הנחיתה')
        }
      } catch (error) {
        console.error('Error deleting page:', error)
        toast.error('שגיאה במחיקת דף הנחיתה')
      }
    }
  }

  const handlePublish = async (page: LandingPage) => {
    try {
      const res = await fetch(`/api/marketing/landing-pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })
      if (res.ok) {
        updateLandingPage(page.id, { status: 'published' })
        toast.success('דף הנחיתה פורסם בהצלחה!')
      } else {
        toast.error('שגיאה בפרסום דף הנחיתה')
      }
    } catch (error) {
      console.error('Error publishing page:', error)
      toast.error('שגיאה בפרסום דף הנחיתה')
    }
  }

  const handleUnpublish = async (page: LandingPage) => {
    try {
      const res = await fetch(`/api/marketing/landing-pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      })
      if (res.ok) {
        updateLandingPage(page.id, { status: 'draft' })
        toast.success('דף הנחיתה הוסר מהפרסום')
      } else {
        toast.error('שגיאה בעדכון דף הנחיתה')
      }
    } catch (error) {
      console.error('Error unpublishing page:', error)
      toast.error('שגיאה בעדכון דף הנחיתה')
    }
  }

  // Calculate totals
  const totalViews = landingPages.reduce((sum, p) => sum + (p.views || 0), 0)
  const totalConversions = landingPages.reduce((sum, p) => sum + (p.conversions || 0), 0)
  const publishedCount = landingPages.filter(p => p.status === 'published').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 p-6" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1 flex items-center gap-3">
            <FileText className="h-8 w-8 text-orange-600" />
            דפי נחיתה
          </h1>
          <p className="text-slate-500">צור וניהול דפי נחיתה לקמפיינים שלך</p>
        </div>
        <Link href="/marketing/landing-pages/builder/new">
          <Button className="gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-lg shadow-orange-500/25">
            <Plus className="h-4 w-4" />
            דף נחיתה חדש
          </Button>
        </Link>
      </motion.div>

      {/* Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8"
      >
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{landingPages.length}</p>
              <p className="text-sm text-slate-500">סה״כ דפים</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{publishedCount}</p>
              <p className="text-sm text-slate-500">דפים פעילים</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalViews.toLocaleString()}</p>
              <p className="text-sm text-slate-500">סה״כ צפיות</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalConversions.toLocaleString()}</p>
              <p className="text-sm text-slate-500">סה״כ לידים</p>
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
            placeholder="חיפוש דפי נחיתה..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 bg-white/80 backdrop-blur-sm border-slate-200"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(null)}
            className={statusFilter === null ? '' : 'bg-white/80'}
          >
            הכל ({landingPages.length})
          </Button>
          {Object.entries(statusConfig).map(([status, config]) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(statusFilter === status ? null : status)}
              className={statusFilter === status ? '' : 'bg-white/80'}
            >
              {config.label} ({landingPages.filter(p => p.status === status).length})
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredPages.map((page, index) => {
            const template = getTemplateInfo(page.template)
            const status = statusConfig[page.status]
            const conversionRate = page.views > 0 ? ((page.conversions / page.views) * 100).toFixed(1) : '0'

            return (
              <motion.div
                key={page.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl bg-white/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1">
                  {/* Template Color Header with Image */}
                  <div
                    className="h-32 relative overflow-hidden"
                    style={{
                      backgroundColor: template?.colors.background || '#f1f5f9',
                      backgroundImage: page.content?.hero?.image ? `url(${page.content.hero.image})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {!page.content?.hero?.image && (
                      <div
                        className="absolute inset-0 opacity-30"
                        style={{
                          background: `linear-gradient(135deg, ${template?.colors.primary || '#3b82f6'}, ${template?.colors.secondary || '#8b5cf6'})`,
                        }}
                      />
                    )}
                    {page.content?.hero?.image && (
                      <div className="absolute inset-0 bg-black/30" />
                    )}

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg backdrop-blur-sm"
                        style={{ backgroundColor: `${template?.colors.primary || '#3b82f6'}cc` }}
                      >
                        <FileText className="h-6 w-6" />
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <Badge className={`${status.bgColor} ${status.color} border-0`}>
                        {page.status === 'published' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1.5 animate-pulse" />
                        )}
                        {status.label}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="absolute top-3 right-3 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 bg-white/80 hover:bg-white"
                        onClick={() => openShareDialog(page)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/80 hover:bg-white">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {page.status === 'published' ? (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/lp/${page.slug}`} target="_blank" className="gap-2">
                                  <ExternalLink className="h-4 w-4" />
                                  פתח בלשונית חדשה
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUnpublish(page)} className="gap-2">
                                <Globe className="h-4 w-4" />
                                הסר מפרסום
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem onClick={() => handlePublish(page)} className="gap-2 text-green-600">
                              <Globe className="h-4 w-4" />
                              פרסם עכשיו
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild>
                            <Link href={`/marketing/landing-pages/builder/${page.id}`} className="gap-2">
                              <Edit className="h-4 w-4" />
                              ערוך
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => copyLink(page.slug)}>
                            <Copy className="h-4 w-4" />
                            העתק קישור
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => openShareDialog(page)}>
                            <Share2 className="h-4 w-4" />
                            שתף
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/marketing/analytics?page=${page.id}`} className="gap-2">
                              <BarChart3 className="h-4 w-4" />
                              צפה באנליטיקס
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-red-600" onClick={() => handleDelete(page.id)}>
                            <Trash2 className="h-4 w-4" />
                            מחק
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <CardContent className="p-5">
                    {/* Title */}
                    <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-orange-600 transition-colors">
                      {page.name}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                      {template?.name_he || 'תבנית מותאמת'}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                          <Eye className="h-3 w-3" />
                        </div>
                        <p className="text-lg font-semibold text-slate-900">
                          {(page.views || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">צפיות</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                          <Users className="h-3 w-3" />
                        </div>
                        <p className="text-lg font-semibold text-slate-900">
                          {(page.conversions || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">לידים</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                          <TrendingUp className="h-3 w-3" />
                        </div>
                        <p className="text-lg font-semibold text-slate-900">{conversionRate}%</p>
                        <p className="text-xs text-slate-500">המרה</p>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1"
                        onClick={() => copyLink(page.slug)}
                      >
                        <Copy className="h-3 w-3" />
                        העתק לינק
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1 text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => shareWhatsApp(page)}
                      >
                        <MessageCircle className="h-3 w-3" />
                        וואטסאפ
                      </Button>
                    </div>

                    {/* Link */}
                    {page.status === 'published' && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Globe className="h-3 w-3" />
                          <span className="truncate">/lp/{page.slug}</span>
                        </div>
                      </div>
                    )}

                    {/* Date */}
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                      <Calendar className="h-3 w-3" />
                      עודכן {new Date(page.updated_at).toLocaleDateString('he-IL')}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Create New Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: filteredPages.length * 0.05 }}
        >
          <Link href="/marketing/landing-pages/builder/new">
            <Card className="h-full min-h-[380px] border-2 border-dashed border-slate-200 bg-white/50 hover:border-orange-300 hover:bg-orange-50/50 transition-all duration-300 cursor-pointer group">
              <CardContent className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Sparkles className="h-8 w-8 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">צור דף נחיתה חדש</h3>
                <p className="text-sm text-slate-500">בחר מתבנית מעוצבת והתחל לאסוף לידים</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Loader2 className="h-12 w-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">טוען דפי נחיתה...</p>
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && filteredPages.length === 0 && landingPages.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">אין דפי נחיתה עדיין</h3>
          <p className="text-slate-500 mb-4">צור את דף הנחיתה הראשון שלך ואסוף לידים</p>
          <Link href="/marketing/landing-pages/builder/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              צור דף נחיתה חדש
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-orange-500" />
              שתף את דף הנחיתה
            </DialogTitle>
            <DialogDescription>
              {selectedPage?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedPage && (
            <div className="space-y-4">
              {/* Link Copy */}
              <div className="flex gap-2">
                <Input
                  value={getPageUrl(selectedPage.slug)}
                  readOnly
                  className="text-sm"
                  dir="ltr"
                />
                <Button
                  variant="outline"
                  onClick={() => copyLink(selectedPage.slug)}
                  className="gap-2 shrink-0"
                >
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedLink ? 'הועתק!' : 'העתק'}
                </Button>
              </div>

              {/* Share Options */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="gap-2 h-auto py-4 flex-col bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                  onClick={() => shareWhatsApp(selectedPage)}
                >
                  <MessageCircle className="h-6 w-6" />
                  <span>וואטסאפ</span>
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 h-auto py-4 flex-col bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                  onClick={() => shareWhatsAppWeb(selectedPage)}
                >
                  <Globe className="h-6 w-6" />
                  <span>וואטסאפ ווב</span>
                </Button>
              </div>

              {/* Preview Link */}
              <div className="pt-4 border-t">
                <Link href={`/lp/${selectedPage.slug}`} target="_blank">
                  <Button variant="outline" className="w-full gap-2">
                    <ExternalLink className="h-4 w-4" />
                    צפה בדף הנחיתה
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
