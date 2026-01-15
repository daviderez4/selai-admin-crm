/**
 * @feature MKT-STORE-001
 * @module Marketing
 * @description Marketing state management - campaigns, landing pages, leads
 * @related MKT-LP-001, MKT-CAMP-001, MKT-LEAD-001
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Types
export interface Campaign {
  id: string
  name: string
  description?: string
  type: 'social' | 'landing_page' | 'email'
  status: 'draft' | 'active' | 'paused' | 'completed'
  platforms: ('facebook' | 'instagram' | 'tiktok' | 'whatsapp')[]
  content: {
    text?: string
    image_url?: string
    video_url?: string
    cta_text?: string
    cta_link?: string
  }
  landing_page_id?: string
  scheduled_at?: string
  published_at?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface LandingPage {
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
  views: number
  conversions: number
  created_by?: string
  created_at: string
  updated_at: string
}

export interface LandingPageContent {
  hero: {
    title: string
    subtitle: string
    image?: string
    video_url?: string
    cta_text: string
    show_form: boolean
  }
  features: Array<{
    icon: string
    title: string
    description: string
  }>
  testimonials: Array<{
    name: string
    text: string
    rating: number
    image?: string
  }>
  stats: Array<{
    value: string
    label: string
  }>
  cta?: {
    title: string
    subtitle: string
    button_text: string
  }
  settings: {
    primary_color: string
    secondary_color: string
    font: string
    show_whatsapp_button?: boolean
    whatsapp_number?: string
  }
}

export interface Lead {
  id: string
  landing_page_id?: string
  campaign_id?: string
  name: string
  phone: string
  email?: string
  message?: string
  insurance_type?: string
  source: string
  utm_params?: Record<string, string>
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  notes?: string
  assigned_to?: string
  created_at: string
  updated_at: string
}

export interface MarketingAsset {
  id: string
  name: string
  type: 'image' | 'video'
  url: string
  thumbnail_url?: string
  size_bytes?: number
  dimensions?: { width: number; height: number }
  duration_seconds?: number
  mime_type?: string
  tags: string[]
  created_by?: string
  created_at: string
}

export interface Template {
  id: string
  slug: string
  name: string
  name_he: string
  description: string
  description_he: string
  category: string
  preview_image?: string
  content: LandingPageContent
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
  }
  is_active: boolean
  sort_order: number
}

export interface CampaignAnalytics {
  id: string
  campaign_id?: string
  landing_page_id?: string
  date: string
  impressions: number
  clicks: number
  leads: number
  conversions: number
  spend?: number
  platform?: string
  source?: string
  device?: string
}

// Dashboard Stats
export interface MarketingStats {
  total_campaigns: number
  active_campaigns: number
  total_leads: number
  new_leads_today: number
  total_views: number
  conversion_rate: number
  leads_by_source: Record<string, number>
  leads_trend: Array<{ date: string; count: number }>
}

// Store State
interface MarketingState {
  // Data
  campaigns: Campaign[]
  landingPages: LandingPage[]
  leads: Lead[]
  assets: MarketingAsset[]
  templates: Template[]
  analytics: CampaignAnalytics[]
  stats: MarketingStats | null

  // UI State
  selectedCampaignId: string | null
  selectedLandingPageId: string | null
  isLoading: boolean
  error: string | null

  // Campaign Wizard State
  wizardStep: number
  wizardData: Partial<Campaign> & {
    selectedTemplate?: string
    landingPageContent?: LandingPageContent
  }

  // Actions
  setCampaigns: (campaigns: Campaign[]) => void
  addCampaign: (campaign: Campaign) => void
  updateCampaign: (id: string, updates: Partial<Campaign>) => void
  deleteCampaign: (id: string) => void

  setLandingPages: (pages: LandingPage[]) => void
  addLandingPage: (page: LandingPage) => void
  updateLandingPage: (id: string, updates: Partial<LandingPage>) => void
  deleteLandingPage: (id: string) => void

  setLeads: (leads: Lead[]) => void
  addLead: (lead: Lead) => void
  updateLead: (id: string, updates: Partial<Lead>) => void

  setAssets: (assets: MarketingAsset[]) => void
  addAsset: (asset: MarketingAsset) => void
  deleteAsset: (id: string) => void

  setTemplates: (templates: Template[]) => void

  setAnalytics: (analytics: CampaignAnalytics[]) => void
  setStats: (stats: MarketingStats) => void

  // UI Actions
  setSelectedCampaign: (id: string | null) => void
  setSelectedLandingPage: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Wizard Actions
  setWizardStep: (step: number) => void
  updateWizardData: (data: Partial<MarketingState['wizardData']>) => void
  resetWizard: () => void
}

const initialWizardData = {
  name: '',
  description: '',
  type: 'social' as const,
  status: 'draft' as const,
  platforms: [] as ('facebook' | 'instagram' | 'tiktok' | 'whatsapp')[],
  content: {},
}

export const useMarketingStore = create<MarketingState>()(
  persist(
    (set, get) => ({
      // Initial State
      campaigns: [],
      landingPages: [],
      leads: [],
      assets: [],
      templates: [],
      analytics: [],
      stats: null,
      selectedCampaignId: null,
      selectedLandingPageId: null,
      isLoading: false,
      error: null,
      wizardStep: 0,
      wizardData: initialWizardData,

      // Campaign Actions
      setCampaigns: (campaigns) => set({ campaigns }),
      addCampaign: (campaign) => set((state) => ({
        campaigns: [campaign, ...state.campaigns]
      })),
      updateCampaign: (id, updates) => set((state) => ({
        campaigns: state.campaigns.map((c) =>
          c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
        )
      })),
      deleteCampaign: (id) => set((state) => ({
        campaigns: state.campaigns.filter((c) => c.id !== id)
      })),

      // Landing Page Actions
      setLandingPages: (landingPages) => set({ landingPages }),
      addLandingPage: (page) => set((state) => ({
        landingPages: [page, ...state.landingPages]
      })),
      updateLandingPage: (id, updates) => set((state) => ({
        landingPages: state.landingPages.map((p) =>
          p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
        )
      })),
      deleteLandingPage: (id) => set((state) => ({
        landingPages: state.landingPages.filter((p) => p.id !== id)
      })),

      // Lead Actions
      setLeads: (leads) => set({ leads }),
      addLead: (lead) => set((state) => ({
        leads: [lead, ...state.leads]
      })),
      updateLead: (id, updates) => set((state) => ({
        leads: state.leads.map((l) =>
          l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l
        )
      })),

      // Asset Actions
      setAssets: (assets) => set({ assets }),
      addAsset: (asset) => set((state) => ({
        assets: [asset, ...state.assets]
      })),
      deleteAsset: (id) => set((state) => ({
        assets: state.assets.filter((a) => a.id !== id)
      })),

      // Template Actions
      setTemplates: (templates) => set({ templates }),

      // Analytics Actions
      setAnalytics: (analytics) => set({ analytics }),
      setStats: (stats) => set({ stats }),

      // UI Actions
      setSelectedCampaign: (id) => set({ selectedCampaignId: id }),
      setSelectedLandingPage: (id) => set({ selectedLandingPageId: id }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Wizard Actions
      setWizardStep: (wizardStep) => set({ wizardStep }),
      updateWizardData: (data) => set((state) => ({
        wizardData: { ...state.wizardData, ...data }
      })),
      resetWizard: () => set({
        wizardStep: 0,
        wizardData: initialWizardData
      }),
    }),
    {
      name: 'selai-marketing-store',
      partialize: (state) => ({
        // Only persist wizard data (for recovery)
        wizardStep: state.wizardStep,
        wizardData: state.wizardData,
      }),
    }
  )
)

// Selectors
export const selectActiveCampaigns = (state: MarketingState) =>
  state.campaigns.filter((c) => c.status === 'active')

export const selectPublishedPages = (state: MarketingState) =>
  state.landingPages.filter((p) => p.status === 'published')

export const selectNewLeads = (state: MarketingState) =>
  state.leads.filter((l) => l.status === 'new')

export const selectLeadsBySource = (state: MarketingState) => {
  const bySource: Record<string, number> = {}
  state.leads.forEach((lead) => {
    bySource[lead.source] = (bySource[lead.source] || 0) + 1
  })
  return bySource
}
