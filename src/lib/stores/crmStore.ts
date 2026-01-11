import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type {
  Contact,
  ContactInsert,
  ContactUpdate,
  Lead,
  LeadInsert,
  LeadUpdate,
  LeadStatus,
  Deal,
  DealInsert,
  DealUpdate,
  DealStatus,
  Task,
  TaskInsert,
  TaskUpdate,
  Meeting,
  MeetingInsert,
  MeetingUpdate,
  Message,
  MessageInsert,
  Campaign,
  CampaignInsert,
  CampaignUpdate,
  Policy,
  PolicyInsert,
  PolicyUpdate,
  CoverageGap,
  CRMFilters,
  CRMDashboardStats,
  LeadKanbanBoard,
  DealKanbanBoard,
} from '@/types/crm';

// =====================================================
// STATE INTERFACE
// =====================================================

interface CRMState {
  // Contacts
  contacts: Contact[];
  selectedContact: Contact | null;
  contactsTotal: number;
  contactsPage: number;
  contactsPageSize: number;
  contactsFilters: CRMFilters;
  isLoadingContacts: boolean;

  // Leads
  leads: Lead[];
  leadsByStatus: LeadKanbanBoard;
  selectedLead: Lead | null;
  leadsTotal: number;
  isLoadingLeads: boolean;

  // Deals
  deals: Deal[];
  dealsByStatus: DealKanbanBoard;
  selectedDeal: Deal | null;
  dealsTotal: number;
  isLoadingDeals: boolean;

  // Tasks
  tasks: Task[];
  todaysTasks: Task[];
  overdueTasks: Task[];
  selectedTask: Task | null;
  tasksTotal: number;
  isLoadingTasks: boolean;

  // Meetings
  meetings: Meeting[];
  upcomingMeetings: Meeting[];
  selectedMeeting: Meeting | null;
  meetingsTotal: number;
  isLoadingMeetings: boolean;

  // Messages
  messages: Message[];
  selectedConversation: Message[];
  selectedMessage: Message | null;
  messagesTotal: number;
  isLoadingMessages: boolean;

  // Campaigns
  campaigns: Campaign[];
  selectedCampaign: Campaign | null;
  campaignsTotal: number;
  isLoadingCampaigns: boolean;

  // Policies
  policies: Policy[];
  selectedPolicy: Policy | null;
  policiesTotal: number;
  isLoadingPolicies: boolean;

  // Coverage Gaps
  coverageGaps: CoverageGap[];
  isLoadingGaps: boolean;

  // Dashboard
  dashboardStats: CRMDashboardStats | null;
  isLoadingStats: boolean;

  // Global
  error: string | null;

  // =====================================================
  // CONTACTS ACTIONS
  // =====================================================

  fetchContacts: (filters?: CRMFilters) => Promise<void>;
  fetchContact: (id: string) => Promise<Contact | null>;
  createContact: (contact: ContactInsert) => Promise<Contact | null>;
  updateContact: (id: string, updates: ContactUpdate) => Promise<Contact | null>;
  deleteContact: (id: string) => Promise<boolean>;
  setSelectedContact: (contact: Contact | null) => void;
  setContactsFilters: (filters: CRMFilters) => void;
  convertContactToLead: (contactId: string, leadData?: Partial<LeadInsert>) => Promise<Lead | null>;

  // =====================================================
  // LEADS ACTIONS
  // =====================================================

  fetchLeads: (filters?: CRMFilters) => Promise<void>;
  fetchLeadsByStatus: () => Promise<void>;
  fetchLead: (id: string) => Promise<Lead | null>;
  createLead: (lead: LeadInsert) => Promise<Lead | null>;
  updateLead: (id: string, updates: LeadUpdate) => Promise<Lead | null>;
  updateLeadStatus: (id: string, status: LeadStatus) => Promise<Lead | null>;
  deleteLead: (id: string) => Promise<boolean>;
  setSelectedLead: (lead: Lead | null) => void;
  convertLeadToDeal: (leadId: string, dealData?: Partial<DealInsert>) => Promise<Deal | null>;

  // =====================================================
  // DEALS ACTIONS
  // =====================================================

  fetchDeals: (filters?: CRMFilters) => Promise<void>;
  fetchDealsByStatus: () => Promise<void>;
  fetchDeal: (id: string) => Promise<Deal | null>;
  createDeal: (deal: DealInsert) => Promise<Deal | null>;
  updateDeal: (id: string, updates: DealUpdate) => Promise<Deal | null>;
  updateDealStatus: (id: string, status: DealStatus) => Promise<Deal | null>;
  deleteDeal: (id: string) => Promise<boolean>;
  setSelectedDeal: (deal: Deal | null) => void;

  // =====================================================
  // TASKS ACTIONS
  // =====================================================

  fetchTasks: (filters?: CRMFilters) => Promise<void>;
  fetchTodaysTasks: () => Promise<void>;
  fetchTask: (id: string) => Promise<Task | null>;
  createTask: (task: TaskInsert) => Promise<Task | null>;
  updateTask: (id: string, updates: TaskUpdate) => Promise<Task | null>;
  completeTask: (id: string) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  setSelectedTask: (task: Task | null) => void;

  // =====================================================
  // MEETINGS ACTIONS
  // =====================================================

  fetchMeetings: (filters?: CRMFilters) => Promise<void>;
  fetchUpcomingMeetings: () => Promise<void>;
  fetchMeeting: (id: string) => Promise<Meeting | null>;
  createMeeting: (meeting: MeetingInsert) => Promise<Meeting | null>;
  updateMeeting: (id: string, updates: MeetingUpdate) => Promise<Meeting | null>;
  deleteMeeting: (id: string) => Promise<boolean>;
  setSelectedMeeting: (meeting: Meeting | null) => void;

  // =====================================================
  // MESSAGES ACTIONS
  // =====================================================

  fetchMessages: (filters?: CRMFilters) => Promise<void>;
  fetchConversation: (contactId: string) => Promise<void>;
  sendMessage: (message: MessageInsert) => Promise<Message | null>;
  setSelectedMessage: (message: Message | null) => void;

  // =====================================================
  // CAMPAIGNS ACTIONS
  // =====================================================

  fetchCampaigns: (filters?: CRMFilters) => Promise<void>;
  fetchCampaign: (id: string) => Promise<Campaign | null>;
  createCampaign: (campaign: CampaignInsert) => Promise<Campaign | null>;
  updateCampaign: (id: string, updates: CampaignUpdate) => Promise<Campaign | null>;
  deleteCampaign: (id: string) => Promise<boolean>;
  setSelectedCampaign: (campaign: Campaign | null) => void;

  // =====================================================
  // POLICIES ACTIONS
  // =====================================================

  fetchPolicies: (filters?: CRMFilters) => Promise<void>;
  fetchContactPolicies: (contactId: string) => Promise<void>;
  fetchPolicy: (id: string) => Promise<Policy | null>;
  createPolicy: (policy: PolicyInsert) => Promise<Policy | null>;
  updatePolicy: (id: string, updates: PolicyUpdate) => Promise<Policy | null>;
  deletePolicy: (id: string) => Promise<boolean>;
  setSelectedPolicy: (policy: Policy | null) => void;

  // =====================================================
  // COVERAGE GAPS ACTIONS
  // =====================================================

  fetchCoverageGaps: (contactId: string) => Promise<void>;
  analyzeGaps: (contactId: string) => Promise<void>;

  // =====================================================
  // DASHBOARD ACTIONS
  // =====================================================

  fetchDashboardStats: () => Promise<void>;

  // =====================================================
  // UTILITY ACTIONS
  // =====================================================

  clearError: () => void;
  resetStore: () => void;
}

// =====================================================
// INITIAL STATE
// =====================================================

const initialState = {
  // Contacts
  contacts: [],
  selectedContact: null,
  contactsTotal: 0,
  contactsPage: 1,
  contactsPageSize: 20,
  contactsFilters: {},
  isLoadingContacts: false,

  // Leads
  leads: [],
  leadsByStatus: {} as LeadKanbanBoard,
  selectedLead: null,
  leadsTotal: 0,
  isLoadingLeads: false,

  // Deals
  deals: [],
  dealsByStatus: {} as DealKanbanBoard,
  selectedDeal: null,
  dealsTotal: 0,
  isLoadingDeals: false,

  // Tasks
  tasks: [],
  todaysTasks: [],
  overdueTasks: [],
  selectedTask: null,
  tasksTotal: 0,
  isLoadingTasks: false,

  // Meetings
  meetings: [],
  upcomingMeetings: [],
  selectedMeeting: null,
  meetingsTotal: 0,
  isLoadingMeetings: false,

  // Messages
  messages: [],
  selectedConversation: [],
  selectedMessage: null,
  messagesTotal: 0,
  isLoadingMessages: false,

  // Campaigns
  campaigns: [],
  selectedCampaign: null,
  campaignsTotal: 0,
  isLoadingCampaigns: false,

  // Policies
  policies: [],
  selectedPolicy: null,
  policiesTotal: 0,
  isLoadingPolicies: false,

  // Coverage Gaps
  coverageGaps: [],
  isLoadingGaps: false,

  // Dashboard
  dashboardStats: null,
  isLoadingStats: false,

  // Global
  error: null,
};

// =====================================================
// STORE IMPLEMENTATION
// =====================================================

export const useCRMStore = create<CRMState>((set, get) => ({
  ...initialState,

  // =====================================================
  // CONTACTS ACTIONS
  // =====================================================

  fetchContacts: async (filters?: CRMFilters) => {
    set({ isLoadingContacts: true, error: null });
    try {
      const supabase = createClient();
      const { search, status, source, tags, page = 1, pageSize = 20 } = filters || get().contactsFilters;

      let query = supabase
        .from('crm_contacts')
        .select('*, crm_contact_scores(*)', { count: 'exact' });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      }
      if (status) query = query.eq('status', status);
      if (source) query = query.eq('source', source);
      if (tags && tags.length > 0) query = query.overlaps('tags', tags);

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      set({
        contacts: data || [],
        contactsTotal: count || 0,
        contactsPage: page,
        contactsPageSize: pageSize,
        contactsFilters: filters || get().contactsFilters,
        isLoadingContacts: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch contacts';
      set({ error: message, isLoadingContacts: false });
    }
  },

  fetchContact: async (id: string) => {
    set({ isLoadingContacts: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_contacts')
        .select(`
          *,
          crm_contact_family(*),
          crm_contact_assets(*),
          crm_contact_scores(*),
          crm_policies(*),
          crm_leads(*),
          crm_deals(*),
          crm_tasks(*),
          crm_meetings(*),
          crm_coverage_gaps(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      set({ selectedContact: data, isLoadingContacts: false });
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch contact';
      set({ error: message, isLoadingContacts: false });
      return null;
    }
  },

  createContact: async (contact: ContactInsert) => {
    set({ isLoadingContacts: true, error: null });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('crm_contacts')
        .insert({ ...contact, agent_id: user?.id })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        contacts: [data, ...state.contacts],
        contactsTotal: state.contactsTotal + 1,
        isLoadingContacts: false,
      }));
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create contact';
      set({ error: message, isLoadingContacts: false });
      return null;
    }
  },

  updateContact: async (id: string, updates: ContactUpdate) => {
    set({ isLoadingContacts: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        contacts: state.contacts.map((c) => (c.id === id ? data : c)),
        selectedContact: state.selectedContact?.id === id ? data : state.selectedContact,
        isLoadingContacts: false,
      }));
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update contact';
      set({ error: message, isLoadingContacts: false });
      return null;
    }
  },

  deleteContact: async (id: string) => {
    set({ isLoadingContacts: true, error: null });
    try {
      const supabase = createClient();
      const { error } = await supabase.from('crm_contacts').delete().eq('id', id);

      if (error) throw error;

      set((state) => ({
        contacts: state.contacts.filter((c) => c.id !== id),
        contactsTotal: state.contactsTotal - 1,
        selectedContact: state.selectedContact?.id === id ? null : state.selectedContact,
        isLoadingContacts: false,
      }));
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete contact';
      set({ error: message, isLoadingContacts: false });
      return false;
    }
  },

  setSelectedContact: (contact) => set({ selectedContact: contact }),

  setContactsFilters: (filters) => set({ contactsFilters: filters }),

  convertContactToLead: async (contactId: string, leadData?: Partial<LeadInsert>) => {
    set({ isLoadingContacts: true, error: null });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Get contact data
      const { data: contact, error: contactError } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (contactError) throw contactError;

      // Create lead
      const { data: lead, error: leadError } = await supabase
        .from('crm_leads')
        .insert({
          contact_id: contactId,
          agent_id: user?.id,
          name: contact.full_name,
          phone: contact.phone || contact.mobile,
          email: contact.email,
          source: 'contact_conversion',
          ...leadData,
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Update contact
      await supabase
        .from('crm_contacts')
        .update({ converted_to_lead: true, lead_id: lead.id })
        .eq('id', contactId);

      set({ isLoadingContacts: false });
      return lead;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to convert contact to lead';
      set({ error: message, isLoadingContacts: false });
      return null;
    }
  },

  // =====================================================
  // LEADS ACTIONS
  // =====================================================

  fetchLeads: async (filters?: CRMFilters) => {
    set({ isLoadingLeads: true, error: null });
    try {
      const supabase = createClient();
      const { search, status, priority, page = 1, pageSize = 20 } = filters || {};

      let query = supabase
        .from('crm_leads')
        .select('*, contact:crm_contacts(full_name, phone, email)', { count: 'exact' });

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      }
      if (status) query = query.eq('status', status);
      if (priority) query = query.eq('priority', priority);

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      set({
        leads: data || [],
        leadsTotal: count || 0,
        isLoadingLeads: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch leads';
      set({ error: message, isLoadingLeads: false });
    }
  },

  fetchLeadsByStatus: async () => {
    set({ isLoadingLeads: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*, contact:crm_contacts(full_name, phone)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by status
      const grouped = (data || []).reduce((acc, lead) => {
        const status = lead.status as LeadStatus;
        if (!acc[status]) acc[status] = [];
        acc[status].push(lead);
        return acc;
      }, {} as LeadKanbanBoard);

      set({ leadsByStatus: grouped, isLoadingLeads: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch leads by status';
      set({ error: message, isLoadingLeads: false });
    }
  },

  fetchLead: async (id: string) => {
    set({ isLoadingLeads: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_leads')
        .select(`
          *,
          contact:crm_contacts(*),
          crm_lead_activities(*, user:users(full_name)),
          crm_deals(*),
          crm_tasks(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      set({ selectedLead: data, isLoadingLeads: false });
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch lead';
      set({ error: message, isLoadingLeads: false });
      return null;
    }
  },

  createLead: async (lead: LeadInsert) => {
    set({ isLoadingLeads: true, error: null });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('crm_leads')
        .insert({ ...lead, agent_id: user?.id })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        leads: [data, ...state.leads],
        leadsTotal: state.leadsTotal + 1,
        isLoadingLeads: false,
      }));
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create lead';
      set({ error: message, isLoadingLeads: false });
      return null;
    }
  },

  updateLead: async (id: string, updates: LeadUpdate) => {
    set({ isLoadingLeads: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        leads: state.leads.map((l) => (l.id === id ? data : l)),
        selectedLead: state.selectedLead?.id === id ? data : state.selectedLead,
        isLoadingLeads: false,
      }));
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update lead';
      set({ error: message, isLoadingLeads: false });
      return null;
    }
  },

  updateLeadStatus: async (id: string, status: LeadStatus) => {
    return get().updateLead(id, { status });
  },

  deleteLead: async (id: string) => {
    set({ isLoadingLeads: true, error: null });
    try {
      const supabase = createClient();
      const { error } = await supabase.from('crm_leads').delete().eq('id', id);

      if (error) throw error;

      set((state) => ({
        leads: state.leads.filter((l) => l.id !== id),
        leadsTotal: state.leadsTotal - 1,
        selectedLead: state.selectedLead?.id === id ? null : state.selectedLead,
        isLoadingLeads: false,
      }));
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete lead';
      set({ error: message, isLoadingLeads: false });
      return false;
    }
  },

  setSelectedLead: (lead) => set({ selectedLead: lead }),

  convertLeadToDeal: async (leadId: string, dealData?: Partial<DealInsert>) => {
    set({ isLoadingLeads: true, error: null });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Get lead data
      const { data: lead, error: leadError } = await supabase
        .from('crm_leads')
        .select('*, contact:crm_contacts(*)')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;

      // Create deal
      const { data: deal, error: dealError } = await supabase
        .from('crm_deals')
        .insert({
          lead_id: leadId,
          contact_id: lead.contact_id,
          agent_id: user?.id,
          title: dealData?.title || `עסקה - ${lead.name}`,
          amount: dealData?.amount || lead.estimated_value || 0,
          ...dealData,
        })
        .select()
        .single();

      if (dealError) throw dealError;

      // Update lead status
      await get().updateLead(leadId, {
        status: 'converted',
        converted_at: new Date().toISOString(),
      });

      set({ isLoadingLeads: false });
      return deal;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to convert lead to deal';
      set({ error: message, isLoadingLeads: false });
      return null;
    }
  },

  // =====================================================
  // DEALS ACTIONS
  // =====================================================

  fetchDeals: async (filters?: CRMFilters) => {
    set({ isLoadingDeals: true, error: null });
    try {
      const supabase = createClient();
      const { status, page = 1, pageSize = 20 } = filters || {};

      let query = supabase
        .from('crm_deals')
        .select('*, contact:crm_contacts(full_name, phone)', { count: 'exact' });

      if (status) query = query.eq('status', status);

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      set({
        deals: data || [],
        dealsTotal: count || 0,
        isLoadingDeals: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch deals';
      set({ error: message, isLoadingDeals: false });
    }
  },

  fetchDealsByStatus: async () => {
    set({ isLoadingDeals: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_deals')
        .select('*, contact:crm_contacts(full_name, phone)')
        .not('status', 'in', '("won","lost")')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by status
      const grouped = (data || []).reduce((acc, deal) => {
        const status = deal.status as DealStatus;
        if (!acc[status]) acc[status] = [];
        acc[status].push(deal);
        return acc;
      }, {} as DealKanbanBoard);

      set({ dealsByStatus: grouped, isLoadingDeals: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch deals by status';
      set({ error: message, isLoadingDeals: false });
    }
  },

  fetchDeal: async (id: string) => {
    set({ isLoadingDeals: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_deals')
        .select(`
          *,
          contact:crm_contacts(*),
          lead:crm_leads(*),
          crm_deal_activities(*, user:users(full_name)),
          insurance_company:crm_insurance_companies(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      set({ selectedDeal: data, isLoadingDeals: false });
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch deal';
      set({ error: message, isLoadingDeals: false });
      return null;
    }
  },

  createDeal: async (deal: DealInsert) => {
    set({ isLoadingDeals: true, error: null });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('crm_deals')
        .insert({ ...deal, agent_id: user?.id })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        deals: [data, ...state.deals],
        dealsTotal: state.dealsTotal + 1,
        isLoadingDeals: false,
      }));
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create deal';
      set({ error: message, isLoadingDeals: false });
      return null;
    }
  },

  updateDeal: async (id: string, updates: DealUpdate) => {
    set({ isLoadingDeals: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_deals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        deals: state.deals.map((d) => (d.id === id ? data : d)),
        selectedDeal: state.selectedDeal?.id === id ? data : state.selectedDeal,
        isLoadingDeals: false,
      }));
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update deal';
      set({ error: message, isLoadingDeals: false });
      return null;
    }
  },

  updateDealStatus: async (id: string, status: DealStatus) => {
    return get().updateDeal(id, { status });
  },

  deleteDeal: async (id: string) => {
    set({ isLoadingDeals: true, error: null });
    try {
      const supabase = createClient();
      const { error } = await supabase.from('crm_deals').delete().eq('id', id);

      if (error) throw error;

      set((state) => ({
        deals: state.deals.filter((d) => d.id !== id),
        dealsTotal: state.dealsTotal - 1,
        selectedDeal: state.selectedDeal?.id === id ? null : state.selectedDeal,
        isLoadingDeals: false,
      }));
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete deal';
      set({ error: message, isLoadingDeals: false });
      return false;
    }
  },

  setSelectedDeal: (deal) => set({ selectedDeal: deal }),

  // =====================================================
  // TASKS ACTIONS
  // =====================================================

  fetchTasks: async (filters?: CRMFilters) => {
    set({ isLoadingTasks: true, error: null });
    try {
      const supabase = createClient();
      const { status, priority, page = 1, pageSize = 20 } = filters || {};

      let query = supabase
        .from('crm_tasks')
        .select('*, contact:crm_contacts(full_name)', { count: 'exact' });

      if (status) query = query.eq('status', status);
      if (priority) query = query.eq('priority', priority);

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1).order('due_date', { ascending: true });

      const { data, error, count } = await query;

      if (error) throw error;

      set({
        tasks: data || [],
        tasksTotal: count || 0,
        isLoadingTasks: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch tasks';
      set({ error: message, isLoadingTasks: false });
    }
  },

  fetchTodaysTasks: async () => {
    set({ isLoadingTasks: true, error: null });
    try {
      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('crm_tasks')
        .select('*, contact:crm_contacts(full_name)')
        .eq('status', 'pending')
        .lte('due_date', today)
        .order('priority', { ascending: false });

      if (error) throw error;

      const todaysTasks = (data || []).filter((t) => t.due_date === today);
      const overdueTasks = (data || []).filter((t) => t.due_date && t.due_date < today);

      set({ todaysTasks, overdueTasks, isLoadingTasks: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch today\'s tasks';
      set({ error: message, isLoadingTasks: false });
    }
  },

  fetchTask: async (id: string) => {
    set({ isLoadingTasks: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_tasks')
        .select('*, contact:crm_contacts(*), lead:crm_leads(*), deal:crm_deals(*)')
        .eq('id', id)
        .single();

      if (error) throw error;

      set({ selectedTask: data, isLoadingTasks: false });
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch task';
      set({ error: message, isLoadingTasks: false });
      return null;
    }
  },

  createTask: async (task: TaskInsert) => {
    set({ isLoadingTasks: true, error: null });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('crm_tasks')
        .insert({ ...task, agent_id: user?.id })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        tasks: [data, ...state.tasks],
        tasksTotal: state.tasksTotal + 1,
        isLoadingTasks: false,
      }));
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create task';
      set({ error: message, isLoadingTasks: false });
      return null;
    }
  },

  updateTask: async (id: string, updates: TaskUpdate) => {
    set({ isLoadingTasks: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? data : t)),
        selectedTask: state.selectedTask?.id === id ? data : state.selectedTask,
        isLoadingTasks: false,
      }));
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update task';
      set({ error: message, isLoadingTasks: false });
      return null;
    }
  },

  completeTask: async (id: string) => {
    return get().updateTask(id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  },

  deleteTask: async (id: string) => {
    set({ isLoadingTasks: true, error: null });
    try {
      const supabase = createClient();
      const { error } = await supabase.from('crm_tasks').delete().eq('id', id);

      if (error) throw error;

      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        tasksTotal: state.tasksTotal - 1,
        selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
        isLoadingTasks: false,
      }));
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete task';
      set({ error: message, isLoadingTasks: false });
      return false;
    }
  },

  setSelectedTask: (task) => set({ selectedTask: task }),

  // =====================================================
  // MEETINGS ACTIONS
  // =====================================================

  fetchMeetings: async (filters?: CRMFilters) => {
    set({ isLoadingMeetings: true, error: null });
    try {
      const supabase = createClient();
      const { status, page = 1, pageSize = 20 } = filters || {};

      let query = supabase
        .from('crm_meetings')
        .select('*, contact:crm_contacts(full_name, phone)', { count: 'exact' });

      if (status) query = query.eq('status', status);

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1).order('start_time', { ascending: true });

      const { data, error, count } = await query;

      if (error) throw error;

      set({
        meetings: data || [],
        meetingsTotal: count || 0,
        isLoadingMeetings: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch meetings';
      set({ error: message, isLoadingMeetings: false });
    }
  },

  fetchUpcomingMeetings: async () => {
    set({ isLoadingMeetings: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_meetings')
        .select('*, contact:crm_contacts(full_name, phone)')
        .gte('start_time', new Date().toISOString())
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true })
        .limit(10);

      if (error) throw error;

      set({ upcomingMeetings: data || [], isLoadingMeetings: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch upcoming meetings';
      set({ error: message, isLoadingMeetings: false });
    }
  },

  fetchMeeting: async (id: string) => {
    set({ isLoadingMeetings: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_meetings')
        .select('*, contact:crm_contacts(*)')
        .eq('id', id)
        .single();

      if (error) throw error;

      set({ selectedMeeting: data, isLoadingMeetings: false });
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch meeting';
      set({ error: message, isLoadingMeetings: false });
      return null;
    }
  },

  createMeeting: async (meeting: MeetingInsert) => {
    set({ isLoadingMeetings: true, error: null });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('crm_meetings')
        .insert({ ...meeting, agent_id: user?.id })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        meetings: [data, ...state.meetings],
        meetingsTotal: state.meetingsTotal + 1,
        isLoadingMeetings: false,
      }));
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create meeting';
      set({ error: message, isLoadingMeetings: false });
      return null;
    }
  },

  updateMeeting: async (id: string, updates: MeetingUpdate) => {
    set({ isLoadingMeetings: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_meetings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        meetings: state.meetings.map((m) => (m.id === id ? data : m)),
        selectedMeeting: state.selectedMeeting?.id === id ? data : state.selectedMeeting,
        isLoadingMeetings: false,
      }));
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update meeting';
      set({ error: message, isLoadingMeetings: false });
      return null;
    }
  },

  deleteMeeting: async (id: string) => {
    set({ isLoadingMeetings: true, error: null });
    try {
      const supabase = createClient();
      const { error } = await supabase.from('crm_meetings').delete().eq('id', id);

      if (error) throw error;

      set((state) => ({
        meetings: state.meetings.filter((m) => m.id !== id),
        meetingsTotal: state.meetingsTotal - 1,
        selectedMeeting: state.selectedMeeting?.id === id ? null : state.selectedMeeting,
        isLoadingMeetings: false,
      }));
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete meeting';
      set({ error: message, isLoadingMeetings: false });
      return false;
    }
  },

  setSelectedMeeting: (meeting) => set({ selectedMeeting: meeting }),

  // =====================================================
  // MESSAGES ACTIONS
  // =====================================================

  fetchMessages: async (filters?: CRMFilters) => {
    set({ isLoadingMessages: true, error: null });
    try {
      const supabase = createClient();
      const { page = 1, pageSize = 50 } = filters || {};

      const from = (page - 1) * pageSize;
      const { data, error, count } = await supabase
        .from('crm_messages')
        .select('*, contact:crm_contacts(full_name, phone)', { count: 'exact' })
        .range(from, from + pageSize - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({
        messages: data || [],
        messagesTotal: count || 0,
        isLoadingMessages: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch messages';
      set({ error: message, isLoadingMessages: false });
    }
  },

  fetchConversation: async (contactId: string) => {
    set({ isLoadingMessages: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_messages')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      set({ selectedConversation: data || [], isLoadingMessages: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch conversation';
      set({ error: message, isLoadingMessages: false });
    }
  },

  sendMessage: async (message: MessageInsert) => {
    set({ isLoadingMessages: true, error: null });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('crm_messages')
        .insert({
          ...message,
          agent_id: user?.id,
          direction: 'outbound',
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        messages: [data, ...state.messages],
        selectedConversation: [...state.selectedConversation, data],
        isLoadingMessages: false,
      }));
      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      set({ error: errorMessage, isLoadingMessages: false });
      return null;
    }
  },

  setSelectedMessage: (message) => set({ selectedMessage: message }),

  // =====================================================
  // CAMPAIGNS ACTIONS
  // =====================================================

  fetchCampaigns: async (filters?: CRMFilters) => {
    set({ isLoadingCampaigns: true, error: null });
    try {
      const supabase = createClient();
      const { status, page = 1, pageSize = 20 } = filters || {};

      let query = supabase
        .from('crm_campaigns')
        .select('*', { count: 'exact' });

      if (status) query = query.eq('status', status);

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      set({
        campaigns: data || [],
        campaignsTotal: count || 0,
        isLoadingCampaigns: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch campaigns';
      set({ error: message, isLoadingCampaigns: false });
    }
  },

  fetchCampaign: async (id: string) => {
    set({ isLoadingCampaigns: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_campaigns')
        .select('*, crm_campaign_recipients(*, contact:crm_contacts(full_name, phone))')
        .eq('id', id)
        .single();

      if (error) throw error;

      set({ selectedCampaign: data, isLoadingCampaigns: false });
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch campaign';
      set({ error: message, isLoadingCampaigns: false });
      return null;
    }
  },

  createCampaign: async (campaign: CampaignInsert) => {
    set({ isLoadingCampaigns: true, error: null });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('crm_campaigns')
        .insert({ ...campaign, agent_id: user?.id })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        campaigns: [data, ...state.campaigns],
        campaignsTotal: state.campaignsTotal + 1,
        isLoadingCampaigns: false,
      }));
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create campaign';
      set({ error: message, isLoadingCampaigns: false });
      return null;
    }
  },

  updateCampaign: async (id: string, updates: CampaignUpdate) => {
    set({ isLoadingCampaigns: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        campaigns: state.campaigns.map((c) => (c.id === id ? data : c)),
        selectedCampaign: state.selectedCampaign?.id === id ? data : state.selectedCampaign,
        isLoadingCampaigns: false,
      }));
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update campaign';
      set({ error: message, isLoadingCampaigns: false });
      return null;
    }
  },

  deleteCampaign: async (id: string) => {
    set({ isLoadingCampaigns: true, error: null });
    try {
      const supabase = createClient();
      const { error } = await supabase.from('crm_campaigns').delete().eq('id', id);

      if (error) throw error;

      set((state) => ({
        campaigns: state.campaigns.filter((c) => c.id !== id),
        campaignsTotal: state.campaignsTotal - 1,
        selectedCampaign: state.selectedCampaign?.id === id ? null : state.selectedCampaign,
        isLoadingCampaigns: false,
      }));
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete campaign';
      set({ error: message, isLoadingCampaigns: false });
      return false;
    }
  },

  setSelectedCampaign: (campaign) => set({ selectedCampaign: campaign }),

  // =====================================================
  // POLICIES ACTIONS
  // =====================================================

  fetchPolicies: async (filters?: CRMFilters) => {
    set({ isLoadingPolicies: true, error: null });
    try {
      const supabase = createClient();
      const { status, page = 1, pageSize = 20 } = filters || {};

      let query = supabase
        .from('crm_policies')
        .select('*, contact:crm_contacts(full_name), insurance_company:crm_insurance_companies(name)', { count: 'exact' });

      if (status) query = query.eq('status', status);

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      set({
        policies: data || [],
        policiesTotal: count || 0,
        isLoadingPolicies: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch policies';
      set({ error: message, isLoadingPolicies: false });
    }
  },

  fetchContactPolicies: async (contactId: string) => {
    set({ isLoadingPolicies: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_policies')
        .select('*, insurance_company:crm_insurance_companies(name, logo_url)')
        .eq('contact_id', contactId)
        .order('renewal_date', { ascending: true });

      if (error) throw error;

      set({ policies: data || [], isLoadingPolicies: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch contact policies';
      set({ error: message, isLoadingPolicies: false });
    }
  },

  fetchPolicy: async (id: string) => {
    set({ isLoadingPolicies: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_policies')
        .select('*, contact:crm_contacts(*), deal:crm_deals(*), insurance_company:crm_insurance_companies(*)')
        .eq('id', id)
        .single();

      if (error) throw error;

      set({ selectedPolicy: data, isLoadingPolicies: false });
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch policy';
      set({ error: message, isLoadingPolicies: false });
      return null;
    }
  },

  createPolicy: async (policy: PolicyInsert) => {
    set({ isLoadingPolicies: true, error: null });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('crm_policies')
        .insert({ ...policy, agent_id: user?.id })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        policies: [data, ...state.policies],
        policiesTotal: state.policiesTotal + 1,
        isLoadingPolicies: false,
      }));
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create policy';
      set({ error: message, isLoadingPolicies: false });
      return null;
    }
  },

  updatePolicy: async (id: string, updates: PolicyUpdate) => {
    set({ isLoadingPolicies: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_policies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        policies: state.policies.map((p) => (p.id === id ? data : p)),
        selectedPolicy: state.selectedPolicy?.id === id ? data : state.selectedPolicy,
        isLoadingPolicies: false,
      }));
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update policy';
      set({ error: message, isLoadingPolicies: false });
      return null;
    }
  },

  deletePolicy: async (id: string) => {
    set({ isLoadingPolicies: true, error: null });
    try {
      const supabase = createClient();
      const { error } = await supabase.from('crm_policies').delete().eq('id', id);

      if (error) throw error;

      set((state) => ({
        policies: state.policies.filter((p) => p.id !== id),
        policiesTotal: state.policiesTotal - 1,
        selectedPolicy: state.selectedPolicy?.id === id ? null : state.selectedPolicy,
        isLoadingPolicies: false,
      }));
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete policy';
      set({ error: message, isLoadingPolicies: false });
      return false;
    }
  },

  setSelectedPolicy: (policy) => set({ selectedPolicy: policy }),

  // =====================================================
  // COVERAGE GAPS ACTIONS
  // =====================================================

  fetchCoverageGaps: async (contactId: string) => {
    set({ isLoadingGaps: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_coverage_gaps')
        .select('*')
        .eq('contact_id', contactId)
        .order('priority', { ascending: false });

      if (error) throw error;

      set({ coverageGaps: data || [], isLoadingGaps: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch coverage gaps';
      set({ error: message, isLoadingGaps: false });
    }
  },

  analyzeGaps: async (contactId: string) => {
    set({ isLoadingGaps: true, error: null });
    try {
      // This would call the AI API to analyze gaps
      // For now, just fetch existing gaps
      await get().fetchCoverageGaps(contactId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to analyze gaps';
      set({ error: message, isLoadingGaps: false });
    }
  },

  // =====================================================
  // DASHBOARD ACTIONS
  // =====================================================

  fetchDashboardStats: async () => {
    set({ isLoadingStats: true, error: null });
    try {
      const supabase = createClient();

      // Fetch all stats in parallel
      const [
        contactsRes,
        leadsRes,
        dealsRes,
        tasksRes,
        meetingsRes,
        policiesRes,
      ] = await Promise.all([
        supabase.from('crm_contacts').select('status', { count: 'exact' }),
        supabase.from('crm_leads').select('status', { count: 'exact' }),
        supabase.from('crm_deals').select('status, amount', { count: 'exact' }),
        supabase.from('crm_tasks').select('status, due_date', { count: 'exact' }),
        supabase.from('crm_meetings').select('status, start_time', { count: 'exact' }),
        supabase.from('crm_policies').select('status, premium_monthly, renewal_date', { count: 'exact' }),
      ]);

      const today = new Date().toISOString().split('T')[0];
      const thisWeekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const thisMonthEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const contacts = contactsRes.data || [];
      const leads = leadsRes.data || [];
      const deals = dealsRes.data || [];
      const tasks = tasksRes.data || [];
      const meetings = meetingsRes.data || [];
      const policies = policiesRes.data || [];

      const stats: CRMDashboardStats = {
        contacts: {
          total: contacts.length,
          active: contacts.filter((c) => c.status === 'active').length,
          newThisMonth: 0, // Would need date filter
          changePercent: 0,
        },
        leads: {
          total: leads.length,
          new: leads.filter((l) => l.status === 'new').length,
          qualified: leads.filter((l) => l.status === 'qualified').length,
          converted: leads.filter((l) => l.status === 'converted').length,
          conversionRate: leads.length > 0
            ? (leads.filter((l) => l.status === 'converted').length / leads.length) * 100
            : 0,
        },
        deals: {
          total: deals.length,
          open: deals.filter((d) => !['won', 'lost'].includes(d.status)).length,
          won: deals.filter((d) => d.status === 'won').length,
          totalValue: deals.reduce((sum, d) => sum + (d.amount || 0), 0),
          averageValue: deals.length > 0
            ? deals.reduce((sum, d) => sum + (d.amount || 0), 0) / deals.length
            : 0,
        },
        tasks: {
          total: tasks.length,
          pending: tasks.filter((t) => t.status === 'pending').length,
          overdue: tasks.filter((t) => t.status === 'pending' && t.due_date && t.due_date < today).length,
          dueToday: tasks.filter((t) => t.due_date === today).length,
        },
        meetings: {
          upcoming: meetings.filter((m) => m.start_time > new Date().toISOString()).length,
          thisWeek: meetings.filter((m) => m.start_time >= today && m.start_time <= thisWeekEnd).length,
          completed: meetings.filter((m) => m.status === 'completed').length,
        },
        policies: {
          total: policies.length,
          active: policies.filter((p) => p.status === 'active').length,
          expiringThisMonth: policies.filter((p) => p.renewal_date && p.renewal_date <= thisMonthEnd).length,
          totalPremium: policies.reduce((sum, p) => sum + (p.premium_monthly || 0), 0),
        },
      };

      set({ dashboardStats: stats, isLoadingStats: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch dashboard stats';
      set({ error: message, isLoadingStats: false });
    }
  },

  // =====================================================
  // UTILITY ACTIONS
  // =====================================================

  clearError: () => set({ error: null }),

  resetStore: () => set(initialState),
}));
