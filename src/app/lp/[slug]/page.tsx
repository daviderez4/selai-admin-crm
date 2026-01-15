'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Check,
  Shield,
  Heart,
  Zap,
  Phone,
  MessageCircle,
  Star,
  ChevronDown,
  Loader2,
  Car,
  Home,
  Briefcase,
  Activity,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TEMPLATE_INFO } from '@/types/marketing'
import type { LandingPageContent } from '@/stores/marketingStore'

// Insurance types for the form
const insuranceTypes = [
  { value: 'car', label: 'ביטוח רכב' },
  { value: 'home', label: 'ביטוח דירה' },
  { value: 'life', label: 'ביטוח חיים' },
  { value: 'health', label: 'ביטוח בריאות' },
  { value: 'business', label: 'ביטוח עסקי' },
  { value: 'pension', label: 'פנסיה וחיסכון' },
  { value: 'other', label: 'אחר' },
]

// Page data type
interface PageData {
  id: string
  slug: string
  name: string
  template: string
  content: LandingPageContent
  meta: {
    title: string
    description: string
    og_image?: string
  }
  status: 'draft' | 'published' | 'archived'
}

// Fallback page data when API fails or page not found
const getFallbackPageData = (slug: string): PageData => {
  const templateSlug = TEMPLATE_INFO.find((t) => slug.startsWith(t.slug))?.slug || 'life-insurance'
  const template = TEMPLATE_INFO.find((t) => t.slug === templateSlug)!

  return {
    id: slug,
    slug,
    name: template.name_he,
    template: templateSlug,
    content: {
      hero: {
        title: template.description_he,
        subtitle: 'קבל את ההגנה הטובה ביותר עבורך ועבור משפחתך עם הפתרונות המתקדמים שלנו',
        image: '',
        cta_text: 'קבל הצעת מחיר',
        show_form: true,
      },
      features: [
        { icon: 'Shield', title: 'כיסוי מקיף', description: 'הגנה מלאה לכל תרחיש אפשרי' },
        { icon: 'Heart', title: 'שירות אישי', description: 'ליווי מקצועי לאורך כל הדרך' },
        { icon: 'Zap', title: 'תהליך מהיר', description: 'אישור תוך 24 שעות' },
      ],
      testimonials: [
        { name: 'דוד כהן', text: 'שירות מעולה! קיבלתי הצעה תוך שעות וחסכתי המון כסף', rating: 5 },
        { name: 'שרה לוי', text: 'צוות מקצועי שמבין את הצרכים שלך. ממליצה בחום!', rating: 5 },
        { name: 'משה אברהם', text: 'התהליך היה פשוט ומהיר. מרוצה מאוד מהשירות', rating: 5 },
      ],
      stats: [
        { value: '50,000+', label: 'לקוחות מרוצים' },
        { value: '98%', label: 'שביעות רצון' },
        { value: '24/7', label: 'תמיכה זמינה' },
      ],
      settings: {
        primary_color: template.colors.primary,
        secondary_color: template.colors.secondary,
        font: 'Geist',
        show_whatsapp_button: true,
        whatsapp_number: '972501234567',
      },
    },
    meta: {
      title: `${template.name_he} - סלע ביטוח`,
      description: template.description_he,
    },
    status: 'published',
  }
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  Heart,
  Zap,
  Check,
  Car,
  Home,
  Briefcase,
  Activity,
  TrendingUp,
}

export default function PublicLandingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string

  const [page, setPage] = useState<PageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
    insurance_type: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get UTM parameters
  const getUtmParams = () => {
    return {
      utm_source: searchParams.get('utm_source') || undefined,
      utm_medium: searchParams.get('utm_medium') || undefined,
      utm_campaign: searchParams.get('utm_campaign') || undefined,
      utm_content: searchParams.get('utm_content') || undefined,
      utm_term: searchParams.get('utm_term') || undefined,
    }
  }

  // Track page view and increment views
  const trackPageView = async (pageId: string) => {
    try {
      // Track analytics event
      await fetch('/api/marketing/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landing_page_id: pageId,
          event_type: 'impression',
          platform: searchParams.get('utm_source') || 'direct',
          source: searchParams.get('utm_medium') || 'organic',
        }),
      })

      // Increment page views count
      await fetch(`/api/marketing/landing-pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment_views: true }),
      })
    } catch (err) {
      console.error('Failed to track page view:', err)
    }
  }

  useEffect(() => {
    // Load page data from API
    const loadPage = async () => {
      setIsLoading(true)
      setNotFound(false)

      try {
        // Fetch by slug from API
        const res = await fetch(`/api/marketing/landing-pages/by-slug/${slug}`)

        if (res.ok) {
          const data = await res.json()
          const pageData = data.page

          // Check if page is published
          if (pageData.status !== 'published') {
            setNotFound(true)
            setIsLoading(false)
            return
          }

          setPage(pageData)

          // Set default insurance type based on template
          const templateSlug = pageData.template || ''
          const categoryMap: Record<string, string> = {
            'car-insurance': 'car',
            'home-insurance': 'home',
            'life-insurance': 'life',
            'health-insurance': 'health',
            'business-insurance': 'business',
            'pension-savings': 'pension',
          }
          setFormData(prev => ({ ...prev, insurance_type: categoryMap[templateSlug] || 'other' }))

          // Track page view after loading
          trackPageView(pageData.id)
        } else if (res.status === 404) {
          // Try fallback for demo purposes
          const fallbackPage = getFallbackPageData(slug)
          setPage(fallbackPage)
          trackPageView(slug)
        } else {
          setNotFound(true)
        }
      } catch (err) {
        console.error('Error loading page:', err)
        // Use fallback for demo purposes
        const fallbackPage = getFallbackPageData(slug)
        setPage(fallbackPage)
        trackPageView(slug)
      } finally {
        setIsLoading(false)
      }
    }
    loadPage()
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!page) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Submit lead to API
      const response = await fetch('/api/marketing/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landing_page_id: page.id,
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          message: formData.message || undefined,
          insurance_type: formData.insurance_type,
          source: searchParams.get('utm_source') || 'direct',
          utm_params: getUtmParams(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בשליחת הטופס')
      }

      // Track conversion in analytics
      await fetch('/api/marketing/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landing_page_id: page.id,
          event_type: 'lead',
          platform: searchParams.get('utm_source') || 'direct',
        }),
      })

      // Increment conversions count on the landing page
      await fetch(`/api/marketing/landing-pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment_conversions: true }),
      })

      setSubmitted(true)
    } catch (err) {
      console.error('Error submitting lead:', err)
      setError(err instanceof Error ? err.message : 'שגיאה בשליחת הטופס. נסה שוב.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">טוען...</p>
        </div>
      </div>
    )
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-slate-200 mx-auto mb-6 flex items-center justify-center">
            <Home className="h-10 w-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">הדף לא נמצא</h1>
          <p className="text-slate-500 mb-6">
            מצטערים, הדף שחיפשת אינו קיים או שהוסר מהמערכת
          </p>
          <Button asChild>
            <a href="/">חזרה לדף הבית</a>
          </Button>
        </div>
      </div>
    )
  }

  const { content } = page
  const primaryColor = content.settings.primary_color
  const secondaryColor = content.settings.secondary_color

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* WhatsApp Floating Button */}
      {content.settings.show_whatsapp_button && (
        <motion.a
          href={`https://wa.me/${content.settings.whatsapp_number}?text=היי, אני מעוניין לקבל הצעת מחיר ל${page.name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 left-6 z-50 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-colors"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1 }}
          whileHover={{ scale: 1.1 }}
        >
          <MessageCircle className="h-6 w-6" />
        </motion.a>
      )}

      {/* Hero Section */}
      <section
        className="relative min-h-[90vh] flex items-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        }}
      >
        {/* Animated Background Shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="text-white"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6"
              >
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm">סלע ביטוח - שירות 24/7</span>
              </motion.div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                {content.hero.title}
              </h1>
              <p className="text-xl md:text-2xl opacity-90 mb-8 leading-relaxed">
                {content.hero.subtitle}
              </p>

              {/* Hero Image */}
              {content.hero.image && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="hidden lg:block mb-8 rounded-2xl overflow-hidden shadow-2xl"
                >
                  <img
                    src={content.hero.image}
                    alt={page.name}
                    className="w-full h-48 object-cover"
                  />
                </motion.div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-white hover:bg-white/90 text-lg h-14 px-8 shadow-xl"
                  style={{ color: primaryColor }}
                  onClick={() => document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {content.hero.cta_text}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-2 border-white text-white hover:bg-white/10 text-lg h-14 px-8"
                  asChild
                >
                  <a href="tel:*2847">
                    <Phone className="h-5 w-5 ml-2" />
                    *2847
                  </a>
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center gap-6 mt-10 pt-10 border-t border-white/20">
                {content.stats.slice(0, 3).map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm opacity-80">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Form Card */}
            {content.hero.show_form && (
              <motion.div
                id="lead-form"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-white rounded-3xl shadow-2xl p-8 lg:p-10"
              >
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <div
                      className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}20` }}
                    >
                      <Check className="h-10 w-10" style={{ color: primaryColor }} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">תודה רבה!</h3>
                    <p className="text-slate-500 mb-4">קיבלנו את פרטייך ונחזור אליך בהקדם</p>
                    <p className="text-sm text-slate-400">
                      אחד מנציגינו יצור איתך קשר תוך 24 שעות
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">השאירו פרטים</h2>
                    <p className="text-slate-500 mb-6">ונחזור אליכם עם הצעה מותאמת אישית</p>

                    {error && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name" className="text-slate-700">שם מלא *</Label>
                        <Input
                          id="name"
                          placeholder="הזן את שמך המלא"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="h-12 text-lg mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone" className="text-slate-700">טלפון *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="050-1234567"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                          className="h-12 text-lg mt-1"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-slate-700">אימייל</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="example@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="h-12 text-lg mt-1"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label htmlFor="insurance_type" className="text-slate-700">סוג ביטוח</Label>
                        <Select
                          value={formData.insurance_type}
                          onValueChange={(value) => setFormData({ ...formData, insurance_type: value })}
                        >
                          <SelectTrigger className="h-12 text-lg mt-1">
                            <SelectValue placeholder="בחר סוג ביטוח" />
                          </SelectTrigger>
                          <SelectContent>
                            {insuranceTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="message" className="text-slate-700">הודעה (אופציונלי)</Label>
                        <Textarea
                          id="message"
                          placeholder="ספר לנו קצת על הצרכים שלך..."
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          rows={3}
                          className="resize-none mt-1"
                        />
                      </div>
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-14 text-lg font-semibold"
                        style={{ backgroundColor: primaryColor }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                            שולח...
                          </>
                        ) : (
                          content.hero.cta_text
                        )}
                      </Button>
                    </form>

                    <p className="text-xs text-slate-400 text-center mt-4">
                      בלחיצה על הכפתור אני מאשר/ת קבלת פניות שיווקיות
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-8 w-8" />
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              למה לבחור בנו?
            </h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">
              אנחנו מציעים את השירות הטוב ביותר עם יתרונות ייחודיים
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {content.features.map((feature, index) => {
              const Icon = iconMap[feature.icon] || Check
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow text-center group"
                >
                  <div
                    className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <span style={{ color: primaryColor }}>
                      <Icon className="h-8 w-8" />
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-500">{feature.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4" style={{ backgroundColor: primaryColor }}>
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8 text-center text-white">
            {content.stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <p className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</p>
                <p className="text-lg opacity-80">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              מה הלקוחות שלנו אומרים
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {content.testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-50 rounded-2xl p-8"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-600 mb-6 text-lg">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{testimonial.name}</p>
                    <p className="text-sm text-slate-500">לקוח מרוצה</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-slate-900">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              מוכנים להתחיל?
            </h2>
            <p className="text-xl text-slate-300 mb-8">
              השאירו פרטים עכשיו וקבלו הצעה מותאמת אישית תוך דקות
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="h-14 px-10 text-lg"
                style={{ backgroundColor: primaryColor }}
                onClick={() => document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {content.hero.cta_text}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-10 text-lg border-white text-white hover:bg-white/10"
                asChild
              >
                <a href="tel:*2847">
                  <Phone className="h-5 w-5 ml-2" />
                  התקשרו עכשיו
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-slate-950 text-center">
        <div className="container mx-auto">
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} סלע ביטוח - כל הזכויות שמורות
          </p>
          <p className="text-slate-500 text-xs mt-2">
            בכפוף לתנאי השימוש ומדיניות הפרטיות
          </p>
        </div>
      </footer>
    </div>
  )
}
