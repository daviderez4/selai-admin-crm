// Marketing Module Types

export type Platform = 'facebook' | 'instagram' | 'tiktok' | 'whatsapp'

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed'

export type CampaignType = 'social' | 'landing_page' | 'email'

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'

export type PageStatus = 'draft' | 'published' | 'archived'

export type AssetType = 'image' | 'video'

export type TemplateCategory = 'life' | 'car' | 'health' | 'business' | 'pension' | 'home'

// Campaign content for social posts
export interface CampaignContent {
  text?: string
  image_url?: string
  video_url?: string
  cta_text?: string
  cta_link?: string
  hashtags?: string[]
}

// Landing page block types
export type BlockType =
  | 'hero'
  | 'features'
  | 'testimonials'
  | 'stats'
  | 'gallery'
  | 'contact_form'
  | 'cta'
  | 'video'
  | 'faq'

export interface HeroBlock {
  type: 'hero'
  title: string
  subtitle: string
  image?: string
  video_url?: string
  cta_text: string
  show_form: boolean
  form_fields?: FormField[]
}

export interface FeaturesBlock {
  type: 'features'
  title?: string
  items: Array<{
    icon: string
    title: string
    description: string
  }>
  columns?: 2 | 3 | 4
}

export interface TestimonialsBlock {
  type: 'testimonials'
  title?: string
  items: Array<{
    name: string
    text: string
    rating: number
    image?: string
    role?: string
  }>
}

export interface StatsBlock {
  type: 'stats'
  items: Array<{
    value: string
    label: string
    icon?: string
  }>
  background?: 'light' | 'dark' | 'gradient'
}

export interface GalleryBlock {
  type: 'gallery'
  title?: string
  items: Array<{
    image: string
    caption?: string
  }>
  layout?: 'grid' | 'carousel'
}

export interface ContactFormBlock {
  type: 'contact_form'
  title?: string
  subtitle?: string
  fields: FormField[]
  submit_text: string
  success_message: string
}

export interface CTABlock {
  type: 'cta'
  title: string
  subtitle?: string
  button_text: string
  button_link?: string
  background?: 'gradient' | 'solid' | 'image'
  background_image?: string
}

export interface VideoBlock {
  type: 'video'
  title?: string
  video_url: string
  thumbnail?: string
  autoplay?: boolean
}

export interface FAQBlock {
  type: 'faq'
  title?: string
  items: Array<{
    question: string
    answer: string
  }>
}

export type LandingPageBlock =
  | HeroBlock
  | FeaturesBlock
  | TestimonialsBlock
  | StatsBlock
  | GalleryBlock
  | ContactFormBlock
  | CTABlock
  | VideoBlock
  | FAQBlock

// Form field configuration
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox'
  placeholder?: string
  required?: boolean
  options?: string[] // For select fields
}

// Page settings
export interface PageSettings {
  primary_color: string
  secondary_color: string
  accent_color?: string
  background_color?: string
  font: string
  show_whatsapp_button?: boolean
  whatsapp_number?: string
  show_phone_button?: boolean
  phone_number?: string
  custom_css?: string
}

// Meta information for SEO
export interface PageMeta {
  title: string
  description: string
  og_image?: string
  og_title?: string
  og_description?: string
  keywords?: string[]
  no_index?: boolean
}

// UTM Parameters
export interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

// Analytics event types
export type AnalyticsEvent =
  | 'page_view'
  | 'form_start'
  | 'form_submit'
  | 'form_error'
  | 'cta_click'
  | 'phone_click'
  | 'whatsapp_click'
  | 'video_play'
  | 'scroll_depth'

// Platform-specific content requirements
export interface PlatformRequirements {
  facebook: {
    image_ratio: '1.91:1' | '1:1' | '4:5'
    image_size: { width: number; height: number }
    video_max_duration: number // seconds
    text_max_length: number
  }
  instagram: {
    image_ratio: '1:1' | '4:5' | '9:16'
    image_size: { width: number; height: number }
    video_max_duration: number
    text_max_length: number
  }
  tiktok: {
    video_ratio: '9:16'
    video_size: { width: number; height: number }
    video_max_duration: number
    text_max_length: number
  }
  whatsapp: {
    image_max_size: number // bytes
    video_max_size: number
    text_max_length: number
  }
}

export const PLATFORM_REQUIREMENTS: PlatformRequirements = {
  facebook: {
    image_ratio: '1.91:1',
    image_size: { width: 1200, height: 630 },
    video_max_duration: 240 * 60, // 4 hours
    text_max_length: 63206,
  },
  instagram: {
    image_ratio: '1:1',
    image_size: { width: 1080, height: 1080 },
    video_max_duration: 60, // 60 seconds for reels
    text_max_length: 2200,
  },
  tiktok: {
    video_ratio: '9:16',
    video_size: { width: 1080, height: 1920 },
    video_max_duration: 180, // 3 minutes
    text_max_length: 2200,
  },
  whatsapp: {
    image_max_size: 16 * 1024 * 1024, // 16MB
    video_max_size: 16 * 1024 * 1024,
    text_max_length: 65536,
  },
}

// Social platform info
export interface PlatformInfo {
  id: Platform
  name: string
  name_he: string
  color: string
  gradient?: string
  icon: string
}

export const PLATFORMS: PlatformInfo[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    name_he: 'פייסבוק',
    color: '#1877F2',
    icon: 'Facebook',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    name_he: 'אינסטגרם',
    color: '#E4405F',
    gradient: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
    icon: 'Instagram',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    name_he: 'טיקטוק',
    color: '#000000',
    icon: 'Music2',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    name_he: 'וואטסאפ',
    color: '#25D366',
    icon: 'MessageCircle',
  },
]

// Template info
export interface TemplateInfo {
  slug: string
  name: string
  name_he: string
  description_he: string
  category: TemplateCategory
  icon: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
  }
}

export const TEMPLATE_INFO: TemplateInfo[] = [
  {
    slug: 'life-insurance',
    name: 'Life Insurance',
    name_he: 'ביטוח חיים',
    description_he: 'הגנה על המשפחה שלך',
    category: 'life',
    icon: 'Heart',
    colors: {
      primary: '#3b82f6',
      secondary: '#1e40af',
      accent: '#60a5fa',
      background: '#eff6ff',
    },
  },
  {
    slug: 'car-insurance',
    name: 'Car Insurance',
    name_he: 'ביטוח רכב',
    description_he: 'הגנה מלאה לרכב שלך',
    category: 'car',
    icon: 'Car',
    colors: {
      primary: '#f97316',
      secondary: '#ea580c',
      accent: '#fb923c',
      background: '#fff7ed',
    },
  },
  {
    slug: 'health-insurance',
    name: 'Health Insurance',
    name_he: 'ביטוח בריאות',
    description_he: 'הבריאות שלך בראש סדר העדיפויות',
    category: 'health',
    icon: 'Stethoscope',
    colors: {
      primary: '#10b981',
      secondary: '#059669',
      accent: '#34d399',
      background: '#ecfdf5',
    },
  },
  {
    slug: 'business-insurance',
    name: 'Business Insurance',
    name_he: 'ביטוח עסקי',
    description_he: 'הגנה מקיפה לעסק שלך',
    category: 'business',
    icon: 'Briefcase',
    colors: {
      primary: '#8b5cf6',
      secondary: '#7c3aed',
      accent: '#a78bfa',
      background: '#f5f3ff',
    },
  },
  {
    slug: 'pension-savings',
    name: 'Pension & Savings',
    name_he: 'פנסיה וחיסכון',
    description_he: 'בנה את העתיד הפיננסי שלך',
    category: 'pension',
    icon: 'TrendingUp',
    colors: {
      primary: '#eab308',
      secondary: '#ca8a04',
      accent: '#fde047',
      background: '#fefce8',
    },
  },
  {
    slug: 'home-insurance',
    name: 'Home Insurance',
    name_he: 'ביטוח דירה',
    description_he: 'הבית שלך מוגן',
    category: 'home',
    icon: 'Home',
    colors: {
      primary: '#06b6d4',
      secondary: '#0891b2',
      accent: '#22d3ee',
      background: '#ecfeff',
    },
  },
]
