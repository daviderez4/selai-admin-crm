'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Copy,
  Pause,
  Play,
  Facebook,
  Instagram,
  MessageCircle,
  Music2,
  Calendar,
  Users,
  Target,
  BarChart3,
  ExternalLink,
  CheckCircle,
  XCircle,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useMarketingStore, type Campaign } from '@/stores/marketingStore'
import { toast } from 'sonner'
import { getRandomImageForCategory, MARKETING_IMAGES } from '@/lib/marketing-images'

// Mock campaigns data with generated images
const generateMockCampaigns = (): Campaign[] => {
  const carImg = MARKETING_IMAGES.find(i => i.id === 'car-1')
  const homeImg = MARKETING_IMAGES.find(i => i.id === 'home-1')
  const businessImg = MARKETING_IMAGES.find(i => i.id === 'business-1')
  const lifeImg = MARKETING_IMAGES.find(i => i.id === 'life-1')

  return [
    {
      id: '1',
      name: 'קמפיין ביטוח רכב Q1',
      description: 'קמפיין לביטוח רכב חדש עם הנחות מיוחדות',
      type: 'social',
      status: 'active',
      platforms: ['facebook', 'instagram'],
      content: {
        text: 'ביטוח רכב מקיף במחיר מפתיע! 🚗',
        image_url: carImg?.url,
        cta_text: 'קבל הצעה',
      },
      landing_page_id: '1',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-20T15:30:00Z',
    },
    {
      id: '2',
      name: 'קמפיין ביטוח דירה',
      description: 'הגנה מקיפה לבית שלך',
      type: 'social',
      status: 'active',
      platforms: ['whatsapp', 'facebook'],
      content: {
        text: 'הדירה שלך מוגנת? 🏠',
        image_url: homeImg?.url,
        cta_text: 'בדוק עכשיו',
      },
      created_at: '2024-01-10T09:00:00Z',
      updated_at: '2024-01-18T14:00:00Z',
    },
    {
      id: '3',
      name: 'קמפיין ביטוח עסקי',
      description: 'פתרונות ביטוח לעסקים קטנים ובינוניים',
      type: 'social',
      status: 'draft',
      platforms: ['tiktok', 'instagram'],
      content: {
        text: 'העסק שלך צריך הגנה! 💼',
        image_url: businessImg?.url,
        cta_text: 'ייעוץ חינם',
      },
      created_at: '2024-01-05T11:00:00Z',
      updated_at: '2024-01-05T11:00:00Z',
    },
    {
      id: '4',
      name: 'קמפיין ביטוח חיים',
      description: 'הבטחת עתיד למשפחה',
      type: 'social',
      status: 'paused',
      platforms: ['facebook'],
      content: {
        text: 'דאג לעתיד המשפחה שלך ❤️',
        image_url: lifeImg?.url,
        cta_text: 'למידע נוסף',
      },
      created_at: '2024-01-01T08:00:00Z',
      updated_at: '2024-01-12T10:00:00Z',
    },
  ]
}

const platformIcons: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
  tiktok: <Music2 className="h-4 w-4" />,
}

const platformColors: Record<string, string> = {
  facebook: 'bg-blue-500',
  instagram: 'bg-gradient-to-r from-pink-500 to-purple-500',
  whatsapp: 'bg-green-500',
  tiktok: 'bg-slate-800',
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'טיוטה', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  active: { label: 'פעיל', color: 'text-green-600', bgColor: 'bg-green-100' },
  paused: { label: 'מושהה', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  completed: { label: 'הושלם', color: 'text-blue-600', bgColor: 'bg-blue-100' },
}

// Mock stats per campaign
const campaignStats: Record<string, { leads: number; views: number; conversion: number }> = {
  '1': { leads: 847, views: 12450, conversion: 6.8 },
  '2': { leads: 234, views: 5680, conversion: 4.1 },
  '3': { leads: 0, views: 0, conversion: 0 },
  '4': { leads: 512, views: 8920, conversion: 5.7 },
}

export default function CampaignsPage() {
  const router = useRouter()
  const { campaigns, setCampaigns, updateCampaign, deleteCampaign, addCampaign } = useMarketingStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Initialize with mock data if empty
  useEffect(() => {
    if (campaigns.length === 0) {
      setCampaigns(generateMockCampaigns())
    }
  }, [campaigns.length, setCampaigns])

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || campaign.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Toggle campaign status (pause/play)
  const handleToggleStatus = async (campaign: Campaign) => {
    setIsLoading(true)
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))

    updateCampaign(campaign.id, { status: newStatus })
    toast.success(newStatus === 'active' ? 'הקמפיין הופעל!' : 'הקמפיין הושהה')
    setIsLoading(false)
  }

  // Duplicate campaign
  const handleDuplicate = async (campaign: Campaign) => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 300))

    const newCampaign: Campaign = {
      ...campaign,
      id: Date.now().toString(),
      name: `${campaign.name} (העתק)`,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    addCampaign(newCampaign)
    toast.success('הקמפיין שוכפל בהצלחה!')
    setIsLoading(false)
  }

  // Delete campaign
  const handleDelete = async () => {
    if (!campaignToDelete) return

    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 500))

    deleteCampaign(campaignToDelete.id)
    toast.success('הקמפיין נמחק בהצלחה')
    setDeleteDialogOpen(false)
    setCampaignToDelete(null)
    setIsLoading(false)
  }

  // View campaign preview
  const handlePreview = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setPreviewDialogOpen(true)
  }

  // Navigate to analytics
  const handleViewAnalytics = (campaignId: string) => {
    router.push(`/marketing/analytics?campaign=${campaignId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 p-6" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">קמפיינים</h1>
          <p className="text-slate-500">נהל את כל הקמפיינים השיווקיים שלך</p>
        </div>
        <Link href="/marketing/create">
          <Button className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25">
            <Plus className="h-4 w-4" />
            קמפיין חדש
          </Button>
        </Link>
      </motion.div>

      {/* Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8"
      >
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{campaigns.length}</p>
              <p className="text-sm text-slate-500">סה״כ קמפיינים</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white">
              <Play className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {campaigns.filter(c => c.status === 'active').length}
              </p>
              <p className="text-sm text-slate-500">קמפיינים פעילים</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {Object.values(campaignStats).reduce((sum, s) => sum + s.leads, 0).toLocaleString()}
              </p>
              <p className="text-sm text-slate-500">סה״כ לידים</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {Object.values(campaignStats).reduce((sum, s) => sum + s.views, 0).toLocaleString()}
              </p>
              <p className="text-sm text-slate-500">סה״כ צפיות</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4 mb-6"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="חיפוש קמפיינים..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 bg-white/80 backdrop-blur-sm border-slate-200"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(null)}
            className={statusFilter === null ? '' : 'bg-white/80'}
          >
            הכל
          </Button>
          {Object.entries(statusConfig).map(([status, config]) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(statusFilter === status ? null : status)}
              className={statusFilter === status ? '' : 'bg-white/80'}
            >
              {config.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredCampaigns.map((campaign, index) => {
            const stats = campaignStats[campaign.id] || { leads: 0, views: 0, conversion: 0 }
            const status = statusConfig[campaign.status]

            return (
              <motion.div
                key={campaign.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl bg-white/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1">
                  {/* Campaign Image Preview */}
                  {campaign.content.image_url && (
                    <div className="h-32 overflow-hidden relative">
                      <img
                        src={campaign.content.image_url}
                        alt={campaign.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                  )}

                  {/* Status Indicator */}
                  {campaign.status === 'active' && (
                    <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  )}

                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-purple-600 transition-colors">
                          {campaign.name}
                        </h3>
                        <p className="text-sm text-slate-500 line-clamp-2">
                          {campaign.description}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => handlePreview(campaign)}
                          >
                            <Eye className="h-4 w-4" />
                            צפה בקמפיין
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => handleViewAnalytics(campaign.id)}
                          >
                            <BarChart3 className="h-4 w-4" />
                            אנליטיקה
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/marketing/create?edit=${campaign.id}`} className="gap-2">
                              <Edit className="h-4 w-4" />
                              ערוך
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => handleDuplicate(campaign)}
                          >
                            <Copy className="h-4 w-4" />
                            שכפל
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {campaign.status === 'active' ? (
                            <DropdownMenuItem
                              className="gap-2 text-yellow-600"
                              onClick={() => handleToggleStatus(campaign)}
                            >
                              <Pause className="h-4 w-4" />
                              השהה
                            </DropdownMenuItem>
                          ) : campaign.status !== 'completed' ? (
                            <DropdownMenuItem
                              className="gap-2 text-green-600"
                              onClick={() => handleToggleStatus(campaign)}
                            >
                              <Play className="h-4 w-4" />
                              הפעל
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            className="gap-2 text-red-600"
                            onClick={() => {
                              setCampaignToDelete(campaign)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            מחק
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Platforms */}
                    <div className="flex items-center gap-2 mb-4">
                      {campaign.platforms.map((platform) => (
                        <div
                          key={platform}
                          className={`p-1.5 rounded-lg ${platformColors[platform]} text-white`}
                        >
                          {platformIcons[platform]}
                        </div>
                      ))}
                      <Badge className={`mr-auto ${status.bgColor} ${status.color} border-0`}>
                        {status.label}
                      </Badge>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                          <Users className="h-3 w-3" />
                        </div>
                        <p className="text-lg font-semibold text-slate-900">
                          {stats.leads.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">לידים</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                          <Eye className="h-3 w-3" />
                        </div>
                        <p className="text-lg font-semibold text-slate-900">
                          {stats.views.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">צפיות</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                          <Target className="h-3 w-3" />
                        </div>
                        <p className="text-lg font-semibold text-slate-900">
                          {stats.conversion}%
                        </p>
                        <p className="text-xs text-slate-500">המרה</p>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
                      <Calendar className="h-3 w-3" />
                      עודכן {new Date(campaign.updated_at).toLocaleDateString('he-IL')}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredCampaigns.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <Target className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">לא נמצאו קמפיינים</h3>
          <p className="text-slate-500 mb-4">נסה לשנות את החיפוש או הפילטרים</p>
          <Link href="/marketing/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              צור קמפיין חדש
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הקמפיין "{campaignToDelete?.name}" לצמיתות.
              לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel disabled={isLoading}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Trash2 className="h-4 w-4 ml-2" />
              )}
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Campaign Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{selectedCampaign?.name}</DialogTitle>
            <DialogDescription>{selectedCampaign?.description}</DialogDescription>
          </DialogHeader>

          {selectedCampaign && (
            <div className="space-y-6">
              {/* Preview Image */}
              {selectedCampaign.content.image_url && (
                <div className="rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={selectedCampaign.content.image_url}
                    alt={selectedCampaign.name}
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-lg mb-4">{selectedCampaign.content.text}</p>
                {selectedCampaign.content.cta_text && (
                  <Button className="w-full">
                    {selectedCampaign.content.cta_text}
                  </Button>
                )}
              </div>

              {/* Platforms */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">פלטפורמות</h4>
                <div className="flex gap-2">
                  {selectedCampaign.platforms.map(platform => (
                    <div
                      key={platform}
                      className={`px-3 py-2 rounded-lg ${platformColors[platform]} text-white flex items-center gap-2`}
                    >
                      {platformIcons[platform]}
                      <span className="text-sm capitalize">{platform}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(campaignStats[selectedCampaign.id] || { leads: 0, views: 0, conversion: 0 }).map(([key, value]) => (
                  <div key={key} className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-2xl font-bold text-slate-900">
                      {typeof value === 'number' && key !== 'conversion' ? value.toLocaleString() : `${value}%`}
                    </p>
                    <p className="text-sm text-slate-500">
                      {key === 'leads' ? 'לידים' : key === 'views' ? 'צפיות' : 'המרה'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              סגור
            </Button>
            <Button onClick={() => selectedCampaign && handleViewAnalytics(selectedCampaign.id)}>
              <BarChart3 className="h-4 w-4 ml-2" />
              צפה באנליטיקה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
