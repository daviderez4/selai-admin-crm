/**
 * SELAI Insurance Integration Hub
 * Policy Event Handler - Process policy-related Kafka events
 */

import { EventMessage, TOPICS } from '../../services/event-bus.js';
import { getCacheService } from '../../services/cache-service.js';
import { logger, createModuleLogger } from '../../utils/logger.js';
import { dataEnricher } from '../../transformers/index.js';

const log = createModuleLogger('PolicyEventHandler');

// ============================================
// TYPES
// ============================================

export interface PolicyCreatedEvent {
  policy_id: string;
  policy_number: string;
  customer_id: string;
  insurance_type: string;
  carrier_code: string;
  premium_amount: number;
  coverage_amount: number;
  start_date: string;
  end_date: string;
}

export interface PolicyUpdatedEvent {
  policy_id: string;
  policy_number: string;
  customer_id: string;
  changes: Record<string, { old: any; new: any }>;
}

export interface PolicyCancelledEvent {
  policy_id: string;
  policy_number: string;
  customer_id: string;
  cancellation_reason: string;
  effective_date: string;
}

export interface PolicyExpiringEvent {
  policy_id: string;
  policy_number: string;
  customer_id: string;
  insurance_type: string;
  end_date: string;
  days_until_expiry: number;
}

// ============================================
// HANDLER CLASS
// ============================================

export class PolicyEventHandler {
  private cacheService = getCacheService();

  /**
   * Handle policy created event
   */
  async handlePolicyCreated(event: EventMessage<PolicyCreatedEvent>): Promise<void> {
    const { data, tenant_id, agent_id } = event;
    log.info('Processing policy created event', {
      eventId: event.id,
      policyId: data.policy_id,
      customerId: data.customer_id
    });

    try {
      // Invalidate customer cache
      await this.cacheService.invalidateCustomer(data.customer_id);

      // Update agent metrics if agent is known
      if (agent_id) {
        await this.updateAgentNewPolicy(agent_id, data);
      }

      // Check if customer needs coverage analysis update
      await this.triggerCoverageAnalysis(data.customer_id, tenant_id);

      log.info('Policy created event processed successfully', {
        eventId: event.id
      });
    } catch (error) {
      log.error('Failed to process policy created event', {
        eventId: event.id,
        error
      });
      throw error;
    }
  }

  /**
   * Handle policy updated event
   */
  async handlePolicyUpdated(event: EventMessage<PolicyUpdatedEvent>): Promise<void> {
    const { data } = event;
    log.info('Processing policy updated event', {
      eventId: event.id,
      policyId: data.policy_id,
      changedFields: Object.keys(data.changes)
    });

    try {
      // Invalidate customer cache
      await this.cacheService.invalidateCustomer(data.customer_id);

      // Check for significant changes that need attention
      const significantChanges = this.detectSignificantChanges(data.changes);
      if (significantChanges.length > 0) {
        log.info('Significant policy changes detected', {
          policyId: data.policy_id,
          changes: significantChanges
        });
      }

      log.info('Policy updated event processed successfully', {
        eventId: event.id
      });
    } catch (error) {
      log.error('Failed to process policy updated event', {
        eventId: event.id,
        error
      });
      throw error;
    }
  }

  /**
   * Handle policy cancelled event
   */
  async handlePolicyCancelled(event: EventMessage<PolicyCancelledEvent>): Promise<void> {
    const { data, tenant_id } = event;
    log.info('Processing policy cancelled event', {
      eventId: event.id,
      policyId: data.policy_id,
      reason: data.cancellation_reason
    });

    try {
      // Invalidate customer cache
      await this.cacheService.invalidateCustomer(data.customer_id);

      // Trigger coverage gap analysis since coverage changed
      await this.triggerCoverageAnalysis(data.customer_id, tenant_id);

      // Record churn event for analytics
      await this.recordChurnEvent(data);

      log.info('Policy cancelled event processed successfully', {
        eventId: event.id
      });
    } catch (error) {
      log.error('Failed to process policy cancelled event', {
        eventId: event.id,
        error
      });
      throw error;
    }
  }

  /**
   * Handle policy expiring event
   */
  async handlePolicyExpiring(event: EventMessage<PolicyExpiringEvent>): Promise<void> {
    const { data, tenant_id, agent_id } = event;
    log.info('Processing policy expiring event', {
      eventId: event.id,
      policyId: data.policy_id,
      daysUntilExpiry: data.days_until_expiry
    });

    try {
      // Create renewal reminder based on urgency
      const priority = data.days_until_expiry <= 7 ? 'high' :
                       data.days_until_expiry <= 14 ? 'normal' : 'low';

      await this.createRenewalReminder(data, agent_id, priority);

      log.info('Policy expiring event processed successfully', {
        eventId: event.id
      });
    } catch (error) {
      log.error('Failed to process policy expiring event', {
        eventId: event.id,
        error
      });
      throw error;
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async updateAgentNewPolicy(
    agentId: string,
    policyData: PolicyCreatedEvent
  ): Promise<void> {
    // This would update agent metrics in the database
    log.debug('Updating agent metrics for new policy', {
      agentId,
      policyId: policyData.policy_id
    });
  }

  private async triggerCoverageAnalysis(
    customerId: string,
    tenantId?: string
  ): Promise<void> {
    // This would trigger a coverage analysis job
    log.debug('Triggering coverage analysis', { customerId, tenantId });
  }

  private detectSignificantChanges(
    changes: Record<string, { old: any; new: any }>
  ): string[] {
    const significant: string[] = [];

    // Premium changes > 10%
    if (changes.premium_amount) {
      const oldPremium = changes.premium_amount.old;
      const newPremium = changes.premium_amount.new;
      if (Math.abs(newPremium - oldPremium) / oldPremium > 0.1) {
        significant.push('premium_change');
      }
    }

    // Coverage changes
    if (changes.coverage_amount) {
      significant.push('coverage_change');
    }

    // Status changes
    if (changes.status) {
      significant.push('status_change');
    }

    // Beneficiary changes
    if (changes.beneficiaries) {
      significant.push('beneficiary_change');
    }

    return significant;
  }

  private async recordChurnEvent(data: PolicyCancelledEvent): Promise<void> {
    log.debug('Recording churn event', {
      policyId: data.policy_id,
      customerId: data.customer_id,
      reason: data.cancellation_reason
    });
  }

  private async createRenewalReminder(
    data: PolicyExpiringEvent,
    agentId?: string,
    priority: string = 'normal'
  ): Promise<void> {
    log.debug('Creating renewal reminder', {
      policyId: data.policy_id,
      agentId,
      priority
    });
  }
}

// Export singleton
export const policyEventHandler = new PolicyEventHandler();

// ============================================
// HANDLER REGISTRATION
// ============================================

export function registerPolicyHandlers(eventBus: any): void {
  eventBus.subscribe(TOPICS.POLICY_CREATED, async (event: EventMessage<PolicyCreatedEvent>) => {
    await policyEventHandler.handlePolicyCreated(event);
  });

  eventBus.subscribe(TOPICS.POLICY_UPDATED, async (event: EventMessage<PolicyUpdatedEvent>) => {
    await policyEventHandler.handlePolicyUpdated(event);
  });

  eventBus.subscribe(TOPICS.POLICY_CANCELLED, async (event: EventMessage<PolicyCancelledEvent>) => {
    await policyEventHandler.handlePolicyCancelled(event);
  });

  eventBus.subscribe(TOPICS.POLICY_EXPIRING, async (event: EventMessage<PolicyExpiringEvent>) => {
    await policyEventHandler.handlePolicyExpiring(event);
  });

  log.info('Policy event handlers registered');
}
