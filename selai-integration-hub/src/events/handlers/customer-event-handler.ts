/**
 * SELAI Insurance Integration Hub
 * Customer Event Handler - Process customer-related Kafka events
 */

import { EventMessage, TOPICS } from '../../services/event-bus.js';
import { getCacheService } from '../../services/cache-service.js';
import { logger, createModuleLogger } from '../../utils/logger.js';

const log = createModuleLogger('CustomerEventHandler');

// ============================================
// TYPES
// ============================================

export interface CustomerDataSyncedEvent {
  customer_id: string;
  id_number: string;
  policies_count: number;
  pension_accounts_count: number;
  gaps_count: number;
  sync_source: string;
  sync_timestamp: string;
}

export interface CustomerGapsDetectedEvent {
  customer_id: string;
  id_number: string;
  gaps: Array<{
    gap_type: string;
    title: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    recommended_coverage?: number;
    estimated_premium?: number;
  }>;
  analysis_timestamp: string;
}

export interface CustomerProfileUpdatedEvent {
  customer_id: string;
  updated_fields: string[];
  source: string;
}

// ============================================
// HANDLER CLASS
// ============================================

export class CustomerEventHandler {
  private cacheService = getCacheService();

  /**
   * Handle customer data synced event
   */
  async handleDataSynced(event: EventMessage<CustomerDataSyncedEvent>): Promise<void> {
    const { data } = event;
    log.info('Processing customer data synced event', {
      eventId: event.id,
      customerId: data.customer_id,
      source: data.sync_source
    });

    try {
      // Invalidate all customer-related caches
      await this.cacheService.invalidateCustomer(data.customer_id);

      // Update customer 360 cache with fresh data
      log.info('Customer cache invalidated after sync', {
        customerId: data.customer_id,
        policiesCount: data.policies_count,
        pensionCount: data.pension_accounts_count
      });

      log.info('Customer data synced event processed successfully', {
        eventId: event.id
      });
    } catch (error) {
      log.error('Failed to process customer data synced event', {
        eventId: event.id,
        error
      });
      throw error;
    }
  }

  /**
   * Handle coverage gaps detected event
   */
  async handleGapsDetected(event: EventMessage<CustomerGapsDetectedEvent>): Promise<void> {
    const { data, agent_id } = event;
    log.info('Processing customer gaps detected event', {
      eventId: event.id,
      customerId: data.customer_id,
      gapsCount: data.gaps.length
    });

    try {
      // Count critical gaps
      const criticalGaps = data.gaps.filter(g => g.priority === 'critical');

      // If there are critical gaps, trigger immediate notification
      if (criticalGaps.length > 0) {
        await this.createGapNotification(data.customer_id, criticalGaps, agent_id);
      }

      // Store gaps for agent dashboard
      await this.storeGapsForDashboard(data.customer_id, data.gaps);

      log.info('Customer gaps detected event processed successfully', {
        eventId: event.id,
        criticalGapsCount: criticalGaps.length
      });
    } catch (error) {
      log.error('Failed to process customer gaps detected event', {
        eventId: event.id,
        error
      });
      throw error;
    }
  }

  /**
   * Handle customer profile updated event
   */
  async handleProfileUpdated(event: EventMessage<CustomerProfileUpdatedEvent>): Promise<void> {
    const { data } = event;
    log.info('Processing customer profile updated event', {
      eventId: event.id,
      customerId: data.customer_id,
      updatedFields: data.updated_fields
    });

    try {
      // Invalidate customer cache
      await this.cacheService.invalidateCustomer(data.customer_id);

      // Check if updates affect coverage recommendations
      const significantUpdates = this.checkSignificantUpdates(data.updated_fields);
      if (significantUpdates) {
        log.info('Significant profile update detected, triggering re-analysis', {
          customerId: data.customer_id
        });
        // Trigger coverage re-analysis
      }

      log.info('Customer profile updated event processed successfully', {
        eventId: event.id
      });
    } catch (error) {
      log.error('Failed to process customer profile updated event', {
        eventId: event.id,
        error
      });
      throw error;
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async createGapNotification(
    customerId: string,
    criticalGaps: CustomerGapsDetectedEvent['gaps'],
    agentId?: string
  ): Promise<void> {
    log.debug('Creating gap notification', {
      customerId,
      agentId,
      criticalGapsCount: criticalGaps.length
    });
    // Would create notification via notification service
  }

  private async storeGapsForDashboard(
    customerId: string,
    gaps: CustomerGapsDetectedEvent['gaps']
  ): Promise<void> {
    log.debug('Storing gaps for dashboard', {
      customerId,
      gapsCount: gaps.length
    });
    // Would store gaps in database
  }

  private checkSignificantUpdates(updatedFields: string[]): boolean {
    const significantFields = [
      'birth_date',
      'marital_status',
      'occupation',
      'address',
      'employment_type',
      'employer'
    ];
    return updatedFields.some(field => significantFields.includes(field));
  }
}

// Export singleton
export const customerEventHandler = new CustomerEventHandler();

// ============================================
// HANDLER REGISTRATION
// ============================================

export function registerCustomerHandlers(eventBus: any): void {
  eventBus.subscribe(TOPICS.CUSTOMER_DATA_SYNCED, async (event: EventMessage<CustomerDataSyncedEvent>) => {
    await customerEventHandler.handleDataSynced(event);
  });

  eventBus.subscribe(TOPICS.CUSTOMER_GAPS_DETECTED, async (event: EventMessage<CustomerGapsDetectedEvent>) => {
    await customerEventHandler.handleGapsDetected(event);
  });

  eventBus.subscribe(TOPICS.CUSTOMER_PROFILE_UPDATED, async (event: EventMessage<CustomerProfileUpdatedEvent>) => {
    await customerEventHandler.handleProfileUpdated(event);
  });

  log.info('Customer event handlers registered');
}
