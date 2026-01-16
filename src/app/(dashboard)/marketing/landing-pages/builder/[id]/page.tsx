'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowRight,
  Save,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  Settings,
  Palette,
  Type,
  Image as ImageIcon,
  Layout,
  Check,
  ExternalLink,
  Copy,
  Sparkles,
  X,
  Car,
  Home,
  Heart,
  Activity,
  Briefcase,
  PiggyBank,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { TEMPLATE_INFO } from '@/types/marketing'
import { useMarketingStore, type LandingPageContent, type LandingPage } from '@/stores/marketingStore'
import { MARKETING_IMAGES, categoryLabels, type MarketingImage } from '@/lib/marketing-images'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

// Category icons for the image picker
const categoryIcons: Record<string, React.ReactNode> = {
  car: <Car className="h-4 w-4" />,
  home: <Home className="h-4 w-4" />,
  life: <Heart className="h-4 w-4" />,
  health: <Activity className="h-4 w-4" />,
  business: <Briefcase className="h-4 w-4" />,
  pension: <PiggyBank className="h-4 w-4" />,
  general: <Sparkles className="h-4 w-4" />,
}

// Device preview sizes
const deviceSizes = {
  mobile: { width: 375, label: 'מובייל', icon: Smartphone },
  tablet: { width: 768, label: 'טאבלט', icon: Tablet },
  desktop: { width: 1200, label: 'דסקטופ', icon: Monitor },
}

// Default content structure
const getDefaultContent = (templateSlug: string): LandingPageContent => {
  const template = TEMPLATE_INFO.find((t) => t.slug === templateSlug)
  return {
    hero: {
      title: template?.description_he || 'כותרת ראשית',
      subtitle: 'תת כותרת שמסבירה את הערך שלך',
      image: '',
      cta_text: 'קבל הצעת מחיר',
      show_form: true,
    },
    features: [
      { icon: 'Shield', title: 'תכונה 1', description: 'תיאור התכונה הראשונה' },
      { icon: 'Heart', title: 'תכונה 2', description: 'תיאור התכונה השנייה' },
      { icon: 'Zap', title: 'תכונה 3', description: 'תיאור התכונה השלישית' },
    ],
    testimonials: [
      { name: 'ישראל ישראלי', text: 'שירות מעולה ומקצועי מאוד', rating: 5 },
    ],
    stats: [
      { value: '50,000+', label: 'לקוחות מרוצים' },
      { value: '98%', label: 'שביעות רצון' },
      { value: '24/7', label: 'תמיכה זמינה' },
    ],
    settings: {
      primary_color: template?.colors.primary || '#3b82f6',
      secondary_color: template?.colors.secondary || '#8b5cf6',
      font: 'Geist',
      show_whatsapp_button: true,
      whatsapp_number: '972501234567',
    },
  }
}

export default function LandingPageBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const isNew = params.id === 'new'

  // Get URL search params for template pre-selection
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const urlTemplate = searchParams?.get('template')
  const campaignId = searchParams?.get('campaign')

  // Store
  const { addLandingPage, updateLandingPage, landingPages } = useMarketingStore()

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(urlTemplate || null)
  const [pageName, setPageName] = useState('')
  const [pageSlug, setPageSlug] = useState('')
  const [content, setContent] = useState<LandingPageContent | null>(null)
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const [activeTab, setActiveTab] = useState('content')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false)
  const [imageCategory, setImageCategory] = useState<string>('all')
  const [existingPageId, setExistingPageId] = useState<string | null>(null)
  const [pageStatus, setPageStatus] = useState<'draft' | 'published'>('draft')

  // Auto-select template from URL and initialize content
  useEffect(() => {
    if (isNew && urlTemplate && !content) {
      const template = TEMPLATE_INFO.find(t => t.slug === urlTemplate)
      if (template) {
        setSelectedTemplate(urlTemplate)
        setPageName(template.name_he)
        setPageSlug(`${urlTemplate}-${Date.now().toString(36)}`)
        setContent(getDefaultContent(urlTemplate))
      }
    }
  }, [isNew, urlTemplate])

  // Load existing page for editing
  useEffect(() => {
    if (!isNew && params.id) {
      loadExistingPage(params.id as string)
    }
  }, [isNew, params.id])

  const loadExistingPage = async (id: string) => {
    setIsLoading(true)
    try {
      // First check the store
      const storePages = useMarketingStore.getState().landingPages
      const existingInStore = storePages.find(p => p.id === id)

      if (existingInStore) {
        setExistingPageId(existingInStore.id)
        setPageName(existingInStore.name)
        setPageSlug(existingInStore.slug)
        setSelectedTemplate(existingInStore.template)
        setContent(existingInStore.content)
        setPageStatus(existingInStore.status as 'draft' | 'published')
        setIsLoading(false)
        return
      }

      // Otherwise fetch from API
      const res = await fetch(`/api/marketing/landing-pages/${id}`)
      if (!res.ok) {
        throw new Error('Failed to load landing page')
      }
      const { page } = await res.json()

      setExistingPageId(page.id)
      setPageName(page.name)
      setPageSlug(page.slug)
      setSelectedTemplate(page.template)
      setContent(page.content)
      setPageStatus(page.status)
    } catch (error) {
      console.error('Error loading page:', error)
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לטעון את הדף',
        variant: 'destructive',
      })
      router.push('/marketing/landing-pages')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter images by category
  const filteredImages = imageCategory === 'all'
    ? MARKETING_IMAGES
    : MARKETING_IMAGES.filter(img => img.category === imageCategory)

  // Select image from library
  const handleSelectImage = (img: MarketingImage) => {
    if (!content) return
    updateContent('hero', { ...content.hero, image: img.url })
    setIsImagePickerOpen(false)
  }

  // Template selection step for new pages
  if (isNew && !selectedTemplate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 p-6" dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/marketing/landing-pages">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">בחר תבנית</h1>
              <p className="text-slate-500">בחר תבנית מעוצבת להתחלה מהירה</p>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEMPLATE_INFO.map((template, index) => (
              <motion.div
                key={template.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className="cursor-pointer overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => {
                    setSelectedTemplate(template.slug)
                    setContent(getDefaultContent(template.slug))
                    setPageName(`דף ${template.name_he}`)
                    setPageSlug(template.slug + '-' + Date.now().toString(36))
                  }}
                >
                  <div
                    className="h-32 relative overflow-hidden"
                    style={{ backgroundColor: template.colors.background }}
                  >
                    <div
                      className="absolute inset-0 opacity-40"
                      style={{
                        background: `linear-gradient(135deg, ${template.colors.primary}, ${template.colors.secondary})`,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl"
                        style={{ backgroundColor: template.colors.primary }}
                      >
                        <Layout className="h-8 w-8" />
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{template.name_he}</h3>
                    <p className="text-sm text-slate-500">{template.description_he}</p>
                    <div className="flex gap-2 mt-3">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow"
                        style={{ backgroundColor: template.colors.primary }}
                      />
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow"
                        style={{ backgroundColor: template.colors.secondary }}
                      />
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow"
                        style={{ backgroundColor: template.colors.accent }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    )
  }

  const updateContent = (section: keyof LandingPageContent, value: any) => {
    if (!content) return
    setContent({ ...content, [section]: value })
  }

  const handleSave = async (publish: boolean = true) => {
    if (!content || !pageName || !pageSlug) {
      toast({
        title: 'שגיאה',
        description: 'נא למלא את כל השדות הנדרשים',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    const newStatus = publish ? 'published' : 'draft'

    try {
      if (existingPageId) {
        // Update existing page
        const res = await fetch(`/api/marketing/landing-pages/${existingPageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: pageName,
            slug: pageSlug,
            template: selectedTemplate,
            content,
            status: newStatus,
            meta: {
              title: pageName,
              description: content.hero.subtitle,
            },
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update')
        }

        const { page } = await res.json()

        // Update store
        updateLandingPage(existingPageId, {
          name: page.name,
          slug: page.slug,
          template: page.template,
          content: page.content,
          status: page.status,
          meta: page.meta,
        })

        toast({
          title: 'הדף עודכן בהצלחה',
          description: publish ? 'הדף פורסם ומוכן לשימוש' : 'הדף נשמר כטיוטה',
        })
      } else {
        // Create new page
        const res = await fetch('/api/marketing/landing-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: pageName,
            slug: pageSlug,
            template: selectedTemplate,
            content,
            meta: {
              title: pageName,
              description: content.hero.subtitle,
            },
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to create')
        }

        const { page } = await res.json()

        // Add to store
        const newPage: LandingPage = {
          id: page.id,
          slug: page.slug,
          name: page.name,
          template: page.template,
          content: page.content,
          meta: page.meta,
          status: page.status,
          views: 0,
          conversions: 0,
          created_at: page.created_at,
          updated_at: page.updated_at,
        }
        addLandingPage(newPage)

        // If publish requested, update status
        if (publish && page.status !== 'published') {
          await fetch(`/api/marketing/landing-pages/${page.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'published' }),
          })
          updateLandingPage(page.id, { status: 'published' })
        }

        toast({
          title: 'הדף נוצר בהצלחה',
          description: publish ? 'הדף פורסם ומוכן לשימוש' : 'הדף נשמר כטיוטה',
        })
      }

      router.push('/marketing/landing-pages')
    } catch (error: any) {
      console.error('Error saving page:', error)
      toast({
        title: 'שגיאה בשמירה',
        description: error.message || 'לא ניתן לשמור את הדף',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const copyLink = () => {
    const url = `${window.location.origin}/lp/${pageSlug}`
    navigator.clipboard.writeText(url)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">טוען את הדף...</p>
        </div>
      </div>
    )
  }

  if (!content) return null

  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-4">
            <Link href="/marketing/landing-pages">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <Input
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                className="h-8 text-lg font-semibold border-0 bg-transparent px-0 focus-visible:ring-0"
                placeholder="שם הדף"
              />
            </div>
            <Badge
              variant="secondary"
              className={pageStatus === 'published' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}
            >
              {pageStatus === 'published' ? 'מפורסם' : 'טיוטה'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Device Preview Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              {Object.entries(deviceSizes).map(([key, { label, icon: Icon }]) => (
                <Button
                  key={key}
                  variant={device === key ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-8 px-3 ${device === key ? '' : 'hover:bg-slate-200'}`}
                  onClick={() => setDevice(key as any)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>

            <Button variant="outline" size="sm" className="gap-2" onClick={copyLink}>
              <Copy className="h-4 w-4" />
              העתק לינק
            </Button>

            <Link href={`/lp/${pageSlug}`} target="_blank">
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                תצוגה מקדימה
              </Button>
            </Link>

            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="gap-2"
            >
              שמור טיוטה
            </Button>

            <Button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              שמור ופרסם
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Editor */}
        <div className="w-96 bg-white border-l border-slate-200 h-[calc(100vh-56px)] overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 p-1 bg-slate-100 rounded-none">
              <TabsTrigger value="content" className="gap-2">
                <Type className="h-4 w-4" />
                תוכן
              </TabsTrigger>
              <TabsTrigger value="design" className="gap-2">
                <Palette className="h-4 w-4" />
                עיצוב
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                הגדרות
              </TabsTrigger>
            </TabsList>

            {/* Content Tab */}
            <TabsContent value="content" className="p-4 space-y-6">
              {/* Hero Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-500" />
                    כותרת ראשית (Hero)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>כותרת</Label>
                    <Input
                      value={content.hero.title}
                      onChange={(e) =>
                        updateContent('hero', { ...content.hero, title: e.target.value })
                      }
                      placeholder="כותרת ראשית"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>תת כותרת</Label>
                    <Textarea
                      value={content.hero.subtitle}
                      onChange={(e) =>
                        updateContent('hero', { ...content.hero, subtitle: e.target.value })
                      }
                      placeholder="תת כותרת"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>טקסט כפתור CTA</Label>
                    <Input
                      value={content.hero.cta_text}
                      onChange={(e) =>
                        updateContent('hero', { ...content.hero, cta_text: e.target.value })
                      }
                      placeholder="קבל הצעת מחיר"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>תמונת רקע</Label>
                    {content.hero.image ? (
                      <div className="relative rounded-xl overflow-hidden group">
                        <img
                          src={content.hero.image}
                          alt="Hero background"
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setIsImagePickerOpen(true)}
                          >
                            החלף
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => updateContent('hero', { ...content.hero, image: '' })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-orange-300 transition-colors cursor-pointer"
                        onClick={() => setIsImagePickerOpen(true)}
                      >
                        <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">בחר תמונה מהספרייה</p>
                        <p className="text-xs text-orange-500 mt-1">36 תמונות מקצועיות זמינות</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Features Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">תכונות</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {content.features.map((feature, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded-lg space-y-2">
                      <Input
                        value={feature.title}
                        onChange={(e) => {
                          const newFeatures = [...content.features]
                          newFeatures[index] = { ...feature, title: e.target.value }
                          updateContent('features', newFeatures)
                        }}
                        placeholder={`תכונה ${index + 1}`}
                        className="bg-white"
                      />
                      <Input
                        value={feature.description}
                        onChange={(e) => {
                          const newFeatures = [...content.features]
                          newFeatures[index] = { ...feature, description: e.target.value }
                          updateContent('features', newFeatures)
                        }}
                        placeholder="תיאור"
                        className="bg-white text-sm"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Stats Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">נתונים סטטיסטיים</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {content.stats.map((stat, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={stat.value}
                        onChange={(e) => {
                          const newStats = [...content.stats]
                          newStats[index] = { ...stat, value: e.target.value }
                          updateContent('stats', newStats)
                        }}
                        placeholder="ערך"
                        className="w-24"
                      />
                      <Input
                        value={stat.label}
                        onChange={(e) => {
                          const newStats = [...content.stats]
                          newStats[index] = { ...stat, label: e.target.value }
                          updateContent('stats', newStats)
                        }}
                        placeholder="תווית"
                        className="flex-1"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Design Tab */}
            <TabsContent value="design" className="p-4 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">צבעים</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>צבע ראשי</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={content.settings.primary_color}
                        onChange={(e) =>
                          updateContent('settings', {
                            ...content.settings,
                            primary_color: e.target.value,
                          })
                        }
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={content.settings.primary_color}
                        onChange={(e) =>
                          updateContent('settings', {
                            ...content.settings,
                            primary_color: e.target.value,
                          })
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>צבע משני</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={content.settings.secondary_color}
                        onChange={(e) =>
                          updateContent('settings', {
                            ...content.settings,
                            secondary_color: e.target.value,
                          })
                        }
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={content.settings.secondary_color}
                        onChange={(e) =>
                          updateContent('settings', {
                            ...content.settings,
                            secondary_color: e.target.value,
                          })
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="p-4 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">הגדרות דף</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>כתובת URL</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">/lp/</span>
                      <Input
                        value={pageSlug}
                        onChange={(e) => setPageSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                        placeholder="my-landing-page"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>מספר וואטסאפ</Label>
                    <Input
                      value={content.settings.whatsapp_number || ''}
                      onChange={(e) =>
                        updateContent('settings', {
                          ...content.settings,
                          whatsapp_number: e.target.value,
                        })
                      }
                      placeholder="972501234567"
                      dir="ltr"
                    />
                    <p className="text-xs text-slate-500">הכנס מספר עם קידומת מדינה ללא +</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Area */}
        <div className="flex-1 p-6 overflow-auto h-[calc(100vh-56px)] bg-slate-100">
          <div className="flex justify-center">
            <motion.div
              animate={{ width: deviceSizes[device].width }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-2xl overflow-hidden"
              style={{ maxWidth: '100%' }}
            >
              {/* Preview Content */}
              <div className="overflow-y-auto max-h-[80vh]">
                {/* Hero Section Preview */}
                <div
                  className="relative min-h-[400px] flex items-center justify-center p-8"
                  style={{
                    background: content.hero.image
                      ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${content.hero.image}) center/cover`
                      : `linear-gradient(135deg, ${content.settings.primary_color}, ${content.settings.secondary_color})`,
                  }}
                >
                  <div className="text-center text-white max-w-xl">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">{content.hero.title}</h1>
                    <p className="text-lg opacity-90 mb-6">{content.hero.subtitle}</p>
                    <button
                      className="px-8 py-3 bg-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
                      style={{ color: content.settings.primary_color }}
                    >
                      {content.hero.cta_text}
                    </button>
                  </div>
                </div>

                {/* Features Preview */}
                <div className="py-12 px-6 bg-white">
                  <div className={`grid gap-6 ${device === 'mobile' ? 'grid-cols-1' : 'grid-cols-3'}`}>
                    {content.features.map((feature, index) => (
                      <div key={index} className="text-center p-4">
                        <div
                          className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
                          style={{ backgroundColor: `${content.settings.primary_color}20` }}
                        >
                          <Check className="h-6 w-6" style={{ color: content.settings.primary_color }} />
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-1">{feature.title}</h3>
                        <p className="text-sm text-slate-500">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats Preview */}
                <div
                  className="py-12 px-6"
                  style={{ backgroundColor: content.settings.primary_color }}
                >
                  <div className={`grid gap-6 ${device === 'mobile' ? 'grid-cols-1' : 'grid-cols-3'}`}>
                    {content.stats.map((stat, index) => (
                      <div key={index} className="text-center text-white">
                        <p className="text-3xl font-bold mb-1">{stat.value}</p>
                        <p className="text-sm opacity-80">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Preview */}
                {content.hero.show_form && (
                  <div className="py-12 px-6 bg-slate-50">
                    <div className="max-w-md mx-auto">
                      <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">
                        השאר פרטים ונחזור אליך
                      </h2>
                      <div className="space-y-4">
                        <input
                          type="text"
                          placeholder="שם מלא"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2"
                          style={{ '--tw-ring-color': content.settings.primary_color } as any}
                        />
                        <input
                          type="tel"
                          placeholder="טלפון"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2"
                        />
                        <button
                          className="w-full py-3 rounded-xl text-white font-semibold"
                          style={{ backgroundColor: content.settings.primary_color }}
                        >
                          {content.hero.cta_text}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Image Picker Dialog */}
      <Dialog open={isImagePickerOpen} onOpenChange={setIsImagePickerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              בחר תמונת רקע
            </DialogTitle>
            <DialogDescription>
              תמונות מקצועיות חינמיות מ-Unsplash לשימוש בדף הנחיתה שלך
            </DialogDescription>
          </DialogHeader>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              size="sm"
              variant={imageCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setImageCategory('all')}
              className="gap-1"
            >
              <Palette className="h-4 w-4" />
              הכל
            </Button>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={imageCategory === key ? 'default' : 'outline'}
                onClick={() => setImageCategory(key)}
                className="gap-1"
              >
                {categoryIcons[key]}
                {label}
              </Button>
            ))}
          </div>

          {/* Images Grid */}
          <div className="overflow-y-auto max-h-[50vh] pr-2">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((img) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative cursor-pointer"
                  onClick={() => handleSelectImage(img)}
                >
                  <div className="aspect-video rounded-xl overflow-hidden border-2 border-transparent hover:border-orange-500 transition-all">
                    <img
                      src={img.thumbnail}
                      alt={img.name_he}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" className="gap-1 bg-orange-500 hover:bg-orange-600">
                        <Check className="h-4 w-4" />
                        בחר
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 truncate text-center">{img.name_he}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
