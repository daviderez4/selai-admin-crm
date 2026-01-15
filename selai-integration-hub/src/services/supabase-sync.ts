/**
 * SELAI Insurance Integration Hub
 * Supabase Sync Service - סנכרון עם מסד הנתונים של SELAI
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { logger, createModuleLogger } from '../utils/logger.js';
import type { Policy, PensionAccount, Claim, Customer, Commission } from '../models/canonical.js';

const log = createModuleLogger('SupabaseSync');

// ============================================
// TYPES
// ============================================

export interface SupabaseSyncConfig {
  supabaseUrl: string;
  supabaseKey: string;
  tenantId?: string;
}

export interface SyncResult {
  success: boolean;
  inserted: number;
  updated: number;
  errors: string[];
}

// ============================================
// SUPABASE SYNC SERVICE
// ============================================

export class SupabaseSyncService {
  private client: SupabaseClient;
  private tenantId?: string;

  constructor(config: SupabaseSyncConfig) {
    this.client = createClient(config.supabaseUrl, config.supabaseKey);
    this.tenantId = config.tenantId;
    log.info('SupabaseSyncService initialized');
  }

  // ============================================
  // POLICIES SYNC
  // ============================================

  /**
   * סנכרון פוליסות
   */
  async syncPolicies(policies: Policy[], agentId?: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      inserted: 0,
      updated: 0,
      errors: []
    };

    for (const policy of policies) {
      try {
        // Check if policy exists
        const { data: existing } = await this.client
          .from('policies')
          .select('id')
          .eq('policy_number', policy.policy_number)
          .eq('insurance_company', policy.insurance_company)
          .single();

        const record = this.mapPolicyToRecord(policy, agentId);

        if (existing) {
          // Update
          const { error } = await this.client
            .from('policies')
            .update(record)
            .eq('id', existing.id);

          if (error) throw error;
          result.updated++;
        } else {
          // Insert
          const { error } = await this.client
            .from('policies')
            .insert(record);

          if (error) throw error;
          result.inserted++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Policy ${policy.policy_number}: ${errorMsg}`);
        result.success = false;
        log.error('Failed to sync policy', { error, policyNumber: policy.policy_number });
      }
    }

    log.info('Policies sync completed', result);
    return result;
  }

  /**
   * מיפוי פוליסה לרשומה ב-DB
   */
  private mapPolicyToRecord(policy: Policy, agentId?: string) {
    return {
      id: policy.id,
      policy_number: policy.policy_number,
      external_id: policy.external_id,
      contact_id: policy.customer_id, // Map to SELAI contacts table
      agent_id: agentId || policy.agent_id,
      insurance_type: policy.insurance_type,
      insurance_company: policy.insurance_company,
      insurance_company_code: policy.insurance_company_code,
      start_date: policy.start_date,
      end_date: policy.end_date,
      status: policy.status,
      coverage_amount: policy.coverage?.primary_coverage,
      premium_amount: policy.premium.amount,
      premium_frequency: policy.premium.frequency,
      premium_currency: policy.premium.currency,
      coverage_details: policy.coverage,
      type_specific_data: policy.type_specific_data,
      beneficiaries: policy.beneficiaries,
      source_system: policy.source_system,
      raw_data: policy.raw_data,
      created_at: policy.created_at,
      updated_at: new Date().toISOString()
    };
  }

  // ============================================
  // PENSION ACCOUNTS SYNC
  // ============================================

  /**
   * סנכרון חשבונות פנסיוניים
   */
  async syncPensionAccounts(accounts: PensionAccount[], agentId?: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      inserted: 0,
      updated: 0,
      errors: []
    };

    for (const account of accounts) {
      try {
        // Check if account exists
        const { data: existing } = await this.client
          .from('pension_accounts')
          .select('id')
          .eq('account_number', account.account_number)
          .single();

        const record = this.mapPensionAccountToRecord(account, agentId);

        if (existing) {
          const { error } = await this.client
            .from('pension_accounts')
            .update(record)
            .eq('id', existing.id);

          if (error) throw error;
          result.updated++;
        } else {
          const { error } = await this.client
            .from('pension_accounts')
            .insert(record);

          if (error) throw error;
          result.inserted++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Pension ${account.account_number}: ${errorMsg}`);
        result.success = false;
        log.error('Failed to sync pension account', { error, accountNumber: account.account_number });
      }
    }

    log.info('Pension accounts sync completed', result);
    return result;
  }

  /**
   * מיפוי חשבון פנסיוני לרשומה
   */
  private mapPensionAccountToRecord(account: PensionAccount, agentId?: string) {
    return {
      id: account.id,
      account_number: account.account_number,
      contact_id: account.customer_id,
      agent_id: agentId,
      account_type: account.account_type,
      managing_company: account.managing_company,
      managing_company_code: account.managing_company_code,
      fund_name: account.fund_name,
      fund_number: account.fund_number,
      status: account.status,
      balance_total: account.balance.total,
      balance_severance: account.balance.severance,
      balance_employer: account.balance.employer_contributions,
      balance_employee: account.balance.employee_contributions,
      balance_returns: account.balance.returns,
      balance_date: account.balance.as_of_date,
      monthly_salary: account.contributions?.monthly_salary,
      employee_contribution_rate: account.contributions?.employee_rate,
      employer_contribution_rate: account.contributions?.employer_rate,
      severance_rate: account.contributions?.severance_rate,
      savings_management_fee: account.management_fees?.savings_fee_percent,
      contributions_management_fee: account.management_fees?.contributions_fee_percent,
      disability_coverage: account.insurance_coverage?.disability?.coverage_amount,
      death_coverage: account.insurance_coverage?.death?.coverage_amount,
      source_system: account.source_system,
      raw_data: account.raw_data,
      created_at: account.created_at,
      updated_at: new Date().toISOString()
    };
  }

  // ============================================
  // COVERAGE GAPS SYNC
  // ============================================

  /**
   * סנכרון פערי כיסוי
   */
  async syncCoverageGaps(
    contactId: string, 
    gaps: Array<{ type: string; description: string; priority: string; recommended_coverage?: number; estimated_premium?: number }>,
    agentId?: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      inserted: 0,
      updated: 0,
      errors: []
    };

    try {
      // First, mark existing gaps as resolved
      await this.client
        .from('coverage_gaps')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('contact_id', contactId)
        .eq('status', 'active');

      // Insert new gaps
      for (const gap of gaps) {
        const record = {
          id: uuidv4(),
          contact_id: contactId,
          agent_id: agentId,
          gap_type: gap.type,
          description: gap.description,
          priority: gap.priority,
          recommended_coverage: gap.recommended_coverage,
          estimated_premium: gap.estimated_premium,
          status: 'active',
          detected_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };

        const { error } = await this.client
          .from('coverage_gaps')
          .insert(record);

        if (error) throw error;
        result.inserted++;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      result.success = false;
      log.error('Failed to sync coverage gaps', { error, contactId });
    }

    return result;
  }

  // ============================================
  // CUSTOMER PROFILE UPDATE
  // ============================================

  /**
   * עדכון פרופיל לקוח עם נתונים מאוחדים
   */
  async updateCustomerProfile(
    contactId: string,
    profileData: {
      total_coverage?: number;
      total_premium_annual?: number;
      total_pension_balance?: number;
      risk_score?: number;
      gaps_count?: number;
      last_sync_at?: string;
    }
  ): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('customer_profiles')
        .upsert({
          contact_id: contactId,
          ...profileData,
          updated_at: new Date().toISOString()
        }, { onConflict: 'contact_id' });

      if (error) throw error;
      
      log.info('Customer profile updated', { contactId });
      return true;
    } catch (error) {
      log.error('Failed to update customer profile', { error, contactId });
      return false;
    }
  }

  // ============================================
  // AUDIT LOG
  // ============================================

  /**
   * רישום פעולה ב-audit log
   */
  async logAuditEvent(
    action: string,
    details: Record<string, any>,
    userId?: string,
    agentId?: string
  ): Promise<void> {
    try {
      await this.client
        .from('audit_logs')
        .insert({
          id: uuidv4(),
          action,
          details,
          user_id: userId,
          agent_id: agentId,
          ip_address: null, // Should be passed from request
          created_at: new Date().toISOString()
        });
    } catch (error) {
      log.error('Failed to log audit event', { error, action });
    }
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * סנכרון מלא של נתוני לקוח
   */
  async fullCustomerSync(
    contactId: string,
    data: {
      policies: Policy[];
      pensionAccounts: PensionAccount[];
      gaps: Array<{ type: string; description: string; priority: string; recommended_coverage?: number; estimated_premium?: number }>;
      totals: {
        total_coverage: number;
        total_premium_annual: number;
        total_pension_balance: number;
        risk_score?: number;
      };
    },
    agentId?: string
  ): Promise<{
    policies: SyncResult;
    pension: SyncResult;
    gaps: SyncResult;
    profileUpdated: boolean;
  }> {
    // Sync policies
    const policiesResult = await this.syncPolicies(data.policies, agentId);

    // Sync pension accounts
    const pensionResult = await this.syncPensionAccounts(data.pensionAccounts, agentId);

    // Sync coverage gaps
    const gapsResult = await this.syncCoverageGaps(contactId, data.gaps, agentId);

    // Update customer profile
    const profileUpdated = await this.updateCustomerProfile(contactId, {
      ...data.totals,
      gaps_count: data.gaps.length,
      last_sync_at: new Date().toISOString()
    });

    // Log audit event
    await this.logAuditEvent('customer_full_sync', {
      contact_id: contactId,
      policies_count: data.policies.length,
      pension_accounts_count: data.pensionAccounts.length,
      gaps_count: data.gaps.length
    }, undefined, agentId);

    return {
      policies: policiesResult,
      pension: pensionResult,
      gaps: gapsResult,
      profileUpdated
    };
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

let syncServiceInstance: SupabaseSyncService | null = null;

export function getSupabaseSyncService(config?: SupabaseSyncConfig): SupabaseSyncService {
  if (!syncServiceInstance && config) {
    syncServiceInstance = new SupabaseSyncService(config);
  }
  if (!syncServiceInstance) {
    throw new Error('SupabaseSyncService not initialized. Provide config on first call.');
  }
  return syncServiceInstance;
}

export function initSupabaseSyncService(config: SupabaseSyncConfig): SupabaseSyncService {
  syncServiceInstance = new SupabaseSyncService(config);
  return syncServiceInstance;
}
