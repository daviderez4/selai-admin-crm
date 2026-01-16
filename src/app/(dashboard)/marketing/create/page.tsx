'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Facebook,
  Instagram,
  MessageCircle,
  Music2,
  Image as ImageIcon,
  Video,
  Type,
  FileText,
  Eye,
  Sparkles,
  Rocket,
  Calendar,
  Send,
  Clock,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useMarketingStore, type Campaign } from '@/stores/marketingStore'
import { TEMPLATE_INFO } from '@/types/marketing'
import { toast } from 'sonner'
import { MARKETING_IMAGES } from '@/lib/marketing-images'

// Steps configuration
const steps = [
  { id: 'platforms', title: 'בחירת פלטפורמות', icon: Sparkles },
  { id: 'content', title: 'יצירת תוכן', icon: Type },
  { id: 'landing', title: 'דף נחיתה', icon: FileText },
  { id: 'publish', title: 'פרסום', icon: Rocket },
]

// Platform configuration
const platforms = [
  {
    id: 'facebook' as const,
    name: 'Facebook',
    name_he: 'פייסבוק',
    icon: Facebook,
    color: '#1877F2',
    gradient: 'from-blue-500 to-blue-600',
    description: 'פרסם לקהל הרחב ביותר',
  },
  {
    id: 'instagram' as const,
    name: 'Instagram',
    name_he: 'אינסטגרם',
    icon: Instagram,
    color: '#E4405F',
    gradient: 'from-pink-500 via-red-500 to-yellow-500',
    description: 'תוכן ויזואלי מעורר השראה',
  },
  {
    id: 'tiktok' as const,
    name: 'TikTok',
    name_he: 'טיקטוק',
    icon: Music2,
    color: '#000000',
    gradient: 'from-slate-800 to-slate-900',
    description: 'סרטונים קצרים ויראליים',
  },
  {
    id: 'whatsapp' as const,
    name: 'WhatsApp',
    name_he: 'וואטסאפ',
    icon: MessageCircle,
    color: '#25D366',
    gradient: 'from-green-500 to-emerald-600',
    description: 'תקשורת ישירה ואישית',
  },
]

export default function CreateCampaignPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const { wizardStep, wizardData, setWizardStep, updateWizardData, resetWizard, addCampaign, updateCampaign, campaigns } = useMarketingStore()

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(wizardData.platforms || [])
  const [campaignName, setCampaignName] = useState(wizardData.name || '')
  const [contentText, setContentText] = useState(wizardData.content?.text || '')
  const [ctaText, setCtaText] = useState(wizardData.content?.cta_text || 'קבל הצעת מחיר')
  const [selectedTemplate, setSelectedTemplate] = useState(wizardData.selectedTemplate || '')
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now')
  const [scheduledDate, setScheduledDate] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string>(wizardData.content?.image_url || '')
  const [selectedVideo, setSelectedVideo] = useState<string>(wizardData.content?.video_url || '')
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [existingCampaign, setExistingCampaign] = useState<Campaign | null>(null)

  const currentStep = wizardStep

  // Load existing campaign for editing
  useEffect(() => {
    if (editId) {
      // Check local store first
      const campaign = campaigns.find(c => c.id === editId)
      if (campaign) {
        setExistingCampaign(campaign)
        setCampaignName(campaign.name)
        setContentText(campaign.content.text || '')
        setCtaText(campaign.content.cta_text || 'קבל הצעת מחיר')
        setSelectedPlatforms(campaign.platforms || [])
        setSelectedImage(campaign.content.image_url || '')
        // If there's a landing page, set the template
        if (campaign.landing_page_id) {
          // TODO: Could fetch the landing page template
        }
      } else {
        // Try to fetch from API
        fetchCampaign(editId)
      }
    }
  }, [editId, campaigns])

  const fetchCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/marketing/campaigns/${id}`)
      if (res.ok) {
        const { campaign } = await res.json()
        setExistingCampaign(campaign)
        setCampaignName(campaign.name)
        setContentText(campaign.content?.text || '')
        setCtaText(campaign.content?.cta_text || 'קבל הצעת מחיר')
        setSelectedPlatforms(campaign.platforms || [])
        setSelectedImage(campaign.content?.image_url || '')
        setSelectedVideo(campaign.content?.video_url || '')
      }
    } catch (error) {
      console.error('Error fetching campaign:', error)
      toast.error('שגיאה בטעינת הקמפיין')
    }
  }

  // Handle file upload (image or video)
  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    if (!file) return

    // Validate file
    const maxSize = type === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024 // 10MB for images, 100MB for videos
    if (file.size > maxSize) {
      toast.error(`הקובץ גדול מדי. מקסימום ${type === 'image' ? '10MB' : '100MB'}`)
      return
    }

    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime']

    if (type === 'image' && !validImageTypes.includes(file.type)) {
      toast.error('סוג קובץ לא נתמך. השתמש ב-JPG, PNG, GIF או WebP')
      return
    }

    if (type === 'video' && !validVideoTypes.includes(file.type)) {
      toast.error('סוג קובץ לא נתמך. השתמש ב-MP4, WebM או MOV')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Create FormData for upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      // Simulate progress for now (real upload would use XMLHttpRequest or fetch with progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const res = await fetch('/api/marketing/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to upload file')
      }

      const { url } = await res.json()

      if (type === 'image') {
        setSelectedImage(url)
        toast.success('התמונה הועלתה בהצלחה!')
      } else {
        setSelectedVideo(url)
        toast.success('הסרטון הועלה בהצלחה!')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'שגיאה בהעלאת הקובץ')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Handle file input change
  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, 'image')
    }
  }

  const handleVideoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, 'video')
    }
  }

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    )
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      // Save data to store
      updateWizardData({
        name: campaignName,
        platforms: selectedPlatforms as any,
        content: { text: contentText, cta_text: ctaText },
        selectedTemplate,
      })
      setWizardStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setWizardStep(currentStep - 1)
    }
  }

  const handlePublish = async () => {
    setIsPublishing(true)

    try {
      const campaignData = {
        name: campaignName,
        description: contentText.substring(0, 100) + (contentText.length > 100 ? '...' : ''),
        type: 'social',
        platforms: selectedPlatforms,
        content: {
          text: contentText,
          cta_text: ctaText,
          image_url: selectedImage,
          video_url: selectedVideo,
        },
        scheduled_at: publishMode === 'schedule' ? scheduledDate : null,
        status: publishMode === 'now' ? 'active' : 'draft',
      }

      if (existingCampaign) {
        // Update existing campaign
        const res = await fetch(`/api/marketing/campaigns/${existingCampaign.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campaignData),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update campaign')
        }

        const { campaign } = await res.json()
        updateCampaign(existingCampaign.id, campaign)
        toast.success('הקמפיין עודכן בהצלחה!')
      } else {
        // Create new campaign via API
        const res = await fetch('/api/marketing/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campaignData),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to create campaign')
        }

        const { campaign } = await res.json()

        // Add to local store
        const newCampaign: Campaign = {
          id: campaign.id || Date.now().toString(),
          name: campaignName,
          description: campaignData.description,
          type: 'social',
          status: publishMode === 'now' ? 'active' : 'draft',
          platforms: selectedPlatforms as any[],
          content: {
            text: contentText,
            cta_text: ctaText,
            image_url: selectedImage,
            video_url: selectedVideo,
          },
          landing_page_id: selectedTemplate ? undefined : undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        addCampaign(newCampaign)
        toast.success(publishMode === 'now' ? 'הקמפיין פורסם בהצלחה!' : 'הקמפיין נשמר ותזומן לפרסום')
      }

      resetWizard()
      router.push('/marketing/campaigns')
    } catch (error) {
      console.error('Error publishing campaign:', error)
      toast.error(error instanceof Error ? error.message : 'שגיאה בפרסום הקמפיין')
    } finally {
      setIsPublishing(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return selectedPlatforms.length > 0
      case 1:
        return campaignName.trim() !== '' && contentText.trim() !== ''
      case 2:
        return true // Template is optional
      case 3:
        return true
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30" dir="rtl">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute top-40 -right-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-6 pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            יצירת קמפיין חדש
          </h1>
          <p className="text-slate-500">צור קמפיין מרשים ב-4 צעדים פשוטים</p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-2 mb-10"
        >
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
                    ${isActive ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30' : ''}
                    ${isCompleted ? 'bg-green-100 text-green-700' : ''}
                    ${!isActive && !isCompleted ? 'bg-slate-100 text-slate-400' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 transition-colors ${
                      index < currentStep ? 'bg-green-400' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </motion.div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step 1: Platform Selection */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">בחר פלטפורמות לפרסום</h2>
                  <p className="text-slate-500">בחר אחת או יותר פלטפורמות לקמפיין שלך</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {platforms.map((platform) => {
                    const isSelected = selectedPlatforms.includes(platform.id)
                    const Icon = platform.icon

                    return (
                      <motion.div
                        key={platform.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card
                          className={`cursor-pointer transition-all duration-300 overflow-hidden ${
                            isSelected
                              ? 'ring-2 ring-offset-2 shadow-xl'
                              : 'hover:shadow-lg'
                          }`}
                          style={isSelected ? { '--tw-ring-color': platform.color } as any : {}}
                          onClick={() => togglePlatform(platform.id)}
                        >
                          <CardContent className="p-6 relative">
                            {/* Background gradient */}
                            <div
                              className={`absolute inset-0 bg-gradient-to-br ${platform.gradient} transition-opacity ${
                                isSelected ? 'opacity-10' : 'opacity-0'
                              }`}
                            />

                            <div className="relative flex items-center gap-4">
                              <div
                                className={`p-3 rounded-xl bg-gradient-to-br ${platform.gradient} text-white shadow-lg`}
                              >
                                <Icon className="h-6 w-6" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-slate-900">{platform.name_he}</h3>
                                <p className="text-sm text-slate-500">{platform.description}</p>
                              </div>
                              <div
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'border-green-500 bg-green-500'
                                    : 'border-slate-300'
                                }`}
                              >
                                {isSelected && <Check className="h-4 w-4 text-white" />}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Content Creation */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">צור את התוכן</h2>
                  <p className="text-slate-500">הוסף טקסט, תמונות או סרטונים</p>
                </div>

                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6 space-y-6">
                    {/* Campaign Name */}
                    <div className="space-y-2">
                      <Label>שם הקמפיין</Label>
                      <Input
                        placeholder="לדוגמה: קמפיין ביטוח רכב Q1"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        className="bg-white"
                      />
                    </div>

                    {/* Content Text */}
                    <div className="space-y-2">
                      <Label>טקסט הפוסט</Label>
                      <Textarea
                        placeholder="כתוב את הטקסט שיופיע בפוסט..."
                        value={contentText}
                        onChange={(e) => setContentText(e.target.value)}
                        rows={4}
                        className="bg-white resize-none"
                      />
                      <p className="text-xs text-slate-400">{contentText.length} / 2,200 תווים</p>
                    </div>

                    {/* Media Upload */}
                    <div className="space-y-2">
                      <Label>מדיה</Label>

                      {/* Upload Progress */}
                      {isUploading && (
                        <div className="bg-purple-50 rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
                            <span className="text-sm text-purple-700">מעלה קובץ...</span>
                          </div>
                          <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-600 transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Selected Image Preview */}
                      {selectedImage && !isUploading && (
                        <div className="relative rounded-xl overflow-hidden group">
                          <img
                            src={selectedImage}
                            alt="Campaign image"
                            className="w-full h-40 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setIsImagePickerOpen(true)}
                            >
                              החלף מספריה
                            </Button>
                            <label className="cursor-pointer">
                              <Button type="button" size="sm" variant="secondary" asChild>
                                <span>העלה חדשה</span>
                              </Button>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleImageInputChange}
                                className="hidden"
                              />
                            </label>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedImage('')}
                            >
                              הסר
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Selected Video Preview */}
                      {selectedVideo && !isUploading && (
                        <div className="relative rounded-xl overflow-hidden group mt-4">
                          <video
                            src={selectedVideo}
                            className="w-full h-40 object-cover"
                            controls
                          />
                          <div className="absolute top-2 right-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedVideo('')}
                            >
                              הסר סרטון
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Upload Options */}
                      {!selectedImage && !selectedVideo && !isUploading && (
                        <div className="grid grid-cols-2 gap-4">
                          {/* Image Options */}
                          <div className="space-y-2">
                            <div
                              className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-purple-300 transition-colors cursor-pointer group"
                              onClick={() => setIsImagePickerOpen(true)}
                            >
                              <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-2 group-hover:text-purple-500 transition-colors" />
                              <p className="text-sm text-slate-500">בחר מספריה</p>
                              <p className="text-xs text-purple-400">36 תמונות מקצועיות</p>
                            </div>
                            <label className="block cursor-pointer">
                              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-green-300 transition-colors group">
                                <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-2 group-hover:text-green-500 transition-colors" />
                                <p className="text-sm text-slate-500">העלה תמונה</p>
                                <p className="text-xs text-slate-400">JPG, PNG עד 10MB</p>
                              </div>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleImageInputChange}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {/* Video Option */}
                          <label className="block cursor-pointer h-full">
                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-300 transition-colors cursor-pointer group h-full flex flex-col items-center justify-center">
                              <Video className="h-8 w-8 text-slate-300 mx-auto mb-2 group-hover:text-blue-500 transition-colors" />
                              <p className="text-sm text-slate-500">העלה סרטון</p>
                              <p className="text-xs text-slate-400">MP4, WebM עד 100MB</p>
                            </div>
                            <input
                              type="file"
                              accept="video/mp4,video/webm,video/quicktime"
                              onChange={handleVideoInputChange}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}

                      {/* Show upload button if already has image but no video */}
                      {selectedImage && !selectedVideo && !isUploading && (
                        <label className="block cursor-pointer mt-4">
                          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors group">
                            <div className="flex items-center justify-center gap-2">
                              <Video className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                              <span className="text-sm text-slate-500">הוסף סרטון</span>
                            </div>
                          </div>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            onChange={handleVideoInputChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* Image Picker Dialog */}
                    {isImagePickerOpen && (
                      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setIsImagePickerOpen(false)}>
                        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                          <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-semibold text-lg">בחר תמונה לקמפיין</h3>
                            <Button variant="ghost" size="sm" onClick={() => setIsImagePickerOpen(false)}>✕</Button>
                          </div>
                          <div className="p-4 overflow-y-auto max-h-[60vh]">
                            <div className="grid grid-cols-3 gap-4">
                              {MARKETING_IMAGES.map((img) => (
                                <div
                                  key={img.id}
                                  className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                                    selectedImage === img.url ? 'border-purple-500 ring-2 ring-purple-200' : 'border-transparent hover:border-slate-300'
                                  }`}
                                  onClick={() => {
                                    setSelectedImage(img.url)
                                    setIsImagePickerOpen(false)
                                  }}
                                >
                                  <img
                                    src={img.thumbnail}
                                    alt={img.name_he}
                                    className="w-full h-24 object-cover"
                                  />
                                  <p className="text-xs text-center p-1 truncate">{img.name_he}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CTA Button */}
                    <div className="space-y-2">
                      <Label>טקסט כפתור CTA</Label>
                      <Input
                        placeholder="קבל הצעת מחיר"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Landing Page */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">בחר דף נחיתה</h2>
                  <p className="text-slate-500">בחר תבנית מוכנה ועבור לעורך דפי הנחיתה</p>
                </div>

                {/* Quick Create Landing Page Button */}
                <Card className="border-2 border-dashed border-purple-300 bg-purple-50/50 mb-6">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                          <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">צור דף נחיתה מותאם אישית</h3>
                          <p className="text-sm text-slate-500">עבור לעורך דפי הנחיתה המתקדם</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          // Save current campaign data before navigating
                          updateWizardData({
                            name: campaignName,
                            platforms: selectedPlatforms as any,
                            content: { text: contentText, cta_text: ctaText, image_url: selectedImage },
                          })
                          router.push('/marketing/landing-pages/builder/new')
                        }}
                        className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600"
                      >
                        <FileText className="h-4 w-4" />
                        פתח עורך
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {TEMPLATE_INFO.map((template) => {
                    const isSelected = selectedTemplate === template.slug

                    return (
                      <motion.div
                        key={template.slug}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card
                          className={`cursor-pointer transition-all duration-300 overflow-hidden ${
                            isSelected
                              ? 'ring-2 ring-offset-2 shadow-xl'
                              : 'hover:shadow-lg'
                          }`}
                          style={isSelected ? { '--tw-ring-color': template.colors.primary } as any : {}}
                          onClick={() => setSelectedTemplate(template.slug)}
                        >
                          <div
                            className="h-24 flex items-center justify-center relative"
                            style={{ backgroundColor: template.colors.background }}
                          >
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: template.colors.primary }}
                            >
                              <FileText className="h-6 w-6 text-white" />
                            </div>
                            {isSelected && (
                              <div className="absolute top-2 left-2">
                                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                  <Check className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-slate-900">{template.name_he}</h3>
                            <p className="text-sm text-slate-500">{template.description_he}</p>
                            {isSelected && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full mt-3 gap-1"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/marketing/landing-pages/builder/new?template=${template.slug}`)
                                }}
                              >
                                <Eye className="h-3 w-3" />
                                ערוך תבנית זו
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}

                  {/* Skip Option */}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Card
                      className={`cursor-pointer transition-all duration-300 h-full ${
                        selectedTemplate === ''
                          ? 'ring-2 ring-slate-300 ring-offset-2'
                          : 'hover:shadow-lg'
                      }`}
                      onClick={() => setSelectedTemplate('')}
                    >
                      <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                          <ArrowRight className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="font-semibold text-slate-900">דלג</h3>
                        <p className="text-sm text-slate-500">ללא דף נחיתה</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Step 4: Publish */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">פרסם את הקמפיין</h2>
                  <p className="text-slate-500">בחר מתי לפרסם ובדוק את הפרטים</p>
                </div>

                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6 space-y-6">
                    {/* Summary */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                      <h3 className="font-semibold text-slate-900">סיכום הקמפיין</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">שם:</p>
                          <p className="font-medium">{campaignName || 'לא הוזן'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">פלטפורמות:</p>
                          <div className="flex gap-1 mt-1">
                            {selectedPlatforms.map((p) => {
                              const platform = platforms.find((pl) => pl.id === p)
                              return platform ? (
                                <Badge key={p} variant="secondary" className="text-xs">
                                  {platform.name_he}
                                </Badge>
                              ) : null
                            })}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <p className="text-slate-500">תוכן:</p>
                          <p className="font-medium line-clamp-2">{contentText || 'לא הוזן'}</p>
                        </div>
                        {selectedTemplate && (
                          <div>
                            <p className="text-slate-500">דף נחיתה:</p>
                            <p className="font-medium">
                              {TEMPLATE_INFO.find((t) => t.slug === selectedTemplate)?.name_he}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Publish Mode */}
                    <div className="space-y-3">
                      <Label>מתי לפרסם?</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            publishMode === 'now'
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => setPublishMode('now')}
                        >
                          <div className="flex items-center gap-3">
                            <Send className="h-5 w-5 text-purple-600" />
                            <div>
                              <p className="font-medium text-slate-900">פרסם עכשיו</p>
                              <p className="text-sm text-slate-500">פרסום מיידי</p>
                            </div>
                          </div>
                        </div>
                        <div
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            publishMode === 'schedule'
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => setPublishMode('schedule')}
                        >
                          <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-purple-600" />
                            <div>
                              <p className="font-medium text-slate-900">תזמן לפרסום</p>
                              <p className="text-sm text-slate-500">בחר תאריך ושעה</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {publishMode === 'schedule' && (
                      <div className="space-y-2">
                        <Label>תאריך ושעה</Label>
                        <Input
                          type="datetime-local"
                          className="bg-white"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between mt-8"
        >
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            הקודם
          </Button>

          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  מפרסם...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  {existingCampaign ? 'עדכן קמפיין' : publishMode === 'now' ? 'פרסם עכשיו' : 'תזמן פרסום'}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25"
            >
              הבא
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  )
}
