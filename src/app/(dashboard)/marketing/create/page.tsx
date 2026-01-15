'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useMarketingStore } from '@/stores/marketingStore'
import { TEMPLATE_INFO } from '@/types/marketing'

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
  const { wizardStep, wizardData, setWizardStep, updateWizardData, resetWizard } = useMarketingStore()

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(wizardData.platforms || [])
  const [campaignName, setCampaignName] = useState(wizardData.name || '')
  const [contentText, setContentText] = useState(wizardData.content?.text || '')
  const [ctaText, setCtaText] = useState(wizardData.content?.cta_text || 'קבל הצעת מחיר')
  const [selectedTemplate, setSelectedTemplate] = useState(wizardData.selectedTemplate || '')
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now')

  const currentStep = wizardStep

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

  const handlePublish = () => {
    // TODO: Implement actual publish logic
    console.log('Publishing campaign:', {
      name: campaignName,
      platforms: selectedPlatforms,
      content: { text: contentText, cta_text: ctaText },
      template: selectedTemplate,
      publishMode,
    })
    resetWizard()
    router.push('/marketing/campaigns')
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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-purple-300 transition-colors cursor-pointer group">
                          <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-2 group-hover:text-purple-500 transition-colors" />
                          <p className="text-sm text-slate-500">העלה תמונה</p>
                          <p className="text-xs text-slate-400">PNG, JPG עד 5MB</p>
                        </div>
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-purple-300 transition-colors cursor-pointer group">
                          <Video className="h-8 w-8 text-slate-300 mx-auto mb-2 group-hover:text-purple-500 transition-colors" />
                          <p className="text-sm text-slate-500">העלה סרטון</p>
                          <p className="text-xs text-slate-400">MP4 עד 100MB</p>
                        </div>
                      </div>
                    </div>

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
                  <p className="text-slate-500">בחר תבנית או צור דף נחיתה חדש</p>
                </div>

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
                            className="h-24 flex items-center justify-center"
                            style={{ backgroundColor: template.colors.background }}
                          >
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: template.colors.primary }}
                            >
                              <FileText className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-slate-900">{template.name_he}</h3>
                            <p className="text-sm text-slate-500">{template.description_he}</p>
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
                        <Input type="datetime-local" className="bg-white" />
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
              className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25"
            >
              <Rocket className="h-4 w-4" />
              {publishMode === 'now' ? 'פרסם עכשיו' : 'תזמן פרסום'}
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
