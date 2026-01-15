/**
 * SELAI Insurance Integration Hub
 * Event Bus - Kafka Integration for Real-time Events
 * 
 * ניהול אירועים בזמן אמת:
 * - policy.updated
 * - claim.status.changed
 * - payment.settled
 * - commission.paid
 * - customer.data.synced
 */

import { Kafka, Consumer, Producer, EachMessagePayload, logLevel } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { logger, createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('EventBus');

// ============================================
// TYPES
// ============================================

export interface EventMessage<T = any> {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  tenant_id?: string;
  agent_id?: string;
  data: T;
  metadata?: Record<string, any>;
}

export interface EventHandler<T = any> {
  (message: EventMessage<T>): Promise<void>;
}

export interface EventBusConfig {
  brokers: string[];
  clientId: string;
  groupId?: string;
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
}

// ============================================
// EVENT TOPICS
// ============================================

export const TOPICS = {
  // Policy events
  POLICY_CREATED: 'selai.policies.created',
  POLICY_UPDATED: 'selai.policies.updated',
  POLICY_CANCELLED: 'selai.policies.cancelled',
  POLICY_RENEWED: 'selai.policies.renewed',
  POLICY_EXPIRING: 'selai.policies.expiring',

  // Claim events
  CLAIM_SUBMITTED: 'selai.claims.submitted',
  CLAIM_STATUS_CHANGED: 'selai.claims.status_changed',
  CLAIM_APPROVED: 'selai.claims.approved',
  CLAIM_REJECTED: 'selai.claims.rejected',
  CLAIM_PAID: 'selai.claims.paid',

  // Payment events
  PAYMENT_DUE: 'selai.payments.due',
  PAYMENT_SETTLED: 'selai.payments.settled',
  PAYMENT_FAILED: 'selai.payments.failed',

  // Commission events
  COMMISSION_CALCULATED: 'selai.commissions.calculated',
  COMMISSION_APPROVED: 'selai.commissions.approved',
  COMMISSION_PAID: 'selai.commissions.paid',

  // Customer events
  CUSTOMER_DATA_SYNCED: 'selai.customers.synced',
  CUSTOMER_GAPS_DETECTED: 'selai.customers.gaps_detected',
  CUSTOMER_PROFILE_UPDATED: 'selai.customers.profile_updated',

  // Pension events
  PENSION_BALANCE_UPDATED: 'selai.pension.balance_updated',
  PENSION_FEES_ALERT: 'selai.pension.fees_alert',
  PENSION_CONSENT_GRANTED: 'selai.pension.consent_granted',
  PENSION_CONSENT_REVOKED: 'selai.pension.consent_revoked',

  // Quote events
  QUOTE_REQUESTED: 'selai.quotes.requested',
  QUOTE_RECEIVED: 'selai.quotes.received',
  QUOTE_ACCEPTED: 'selai.quotes.accepted',
  QUOTE_EXPIRED: 'selai.quotes.expired',

  // Application events
  APPLICATION_SUBMITTED: 'selai.applications.submitted',
  APPLICATION_APPROVED: 'selai.applications.approved',
  APPLICATION_REJECTED: 'selai.applications.rejected',

  // Document events
  DOCUMENT_UPLOADED: 'selai.documents.uploaded',
  DOCUMENT_PROCESSED: 'selai.documents.processed',

  // Notification events
  NOTIFICATION_SENT: 'selai.notifications.sent',
  REMINDER_DUE: 'selai.reminders.due',

  // System events
  CONNECTOR_STATUS_CHANGED: 'selai.system.connector_status',
  SYNC_COMPLETED: 'selai.system.sync_completed',
  SYNC_FAILED: 'selai.system.sync_failed',

  // Dead Letter Queue
  DLQ: 'selai.dlq',
} as const;

export type TopicName = typeof TOPICS[keyof typeof TOPICS];

// ============================================
// EVENT BUS SERVICE
// ============================================

export class EventBusService {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private handlers: Map<string, EventHandler[]> = new Map();
  private config: EventBusConfig;
  private isConnected = false;
  private idempotencyCache: Set<string> = new Set();
  private readonly IDEMPOTENCY_CACHE_SIZE = 10000;

  constructor(config: EventBusConfig) {
    this.config = config;
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      ssl: config.ssl,
      sasl: config.sasl,
      logLevel: logLevel.WARN,
      retry: {
        initialRetryTime: 300,
        retries: 10,
        maxRetryTime: 30000,
      },
    });
  }

  // ============================================
  // CONNECTION
  // ============================================

  async connect(): Promise<void> {
    try {
      // Initialize producer
      this.producer = this.kafka.producer({
        allowAutoTopicCreation: true,
        transactionTimeout: 30000,
      });
      await this.producer.connect();
      log.info('Kafka producer connected');

      // Initialize consumer if groupId provided
      if (this.config.groupId) {
        this.consumer = this.kafka.consumer({
          groupId: this.config.groupId,
          sessionTimeout: 30000,
          heartbeatInterval: 3000,
        });
        await this.consumer.connect();
        log.info('Kafka consumer connected', { groupId: this.config.groupId });
      }

      this.isConnected = true;
    } catch (error) {
      log.error('Failed to connect to Kafka', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.producer) {
        await this.producer.disconnect();
      }
      if (this.consumer) {
        await this.consumer.disconnect();
      }
      this.isConnected = false;
      log.info('Kafka disconnected');
    } catch (error) {
      log.error('Error disconnecting from Kafka', { error });
    }
  }

  // ============================================
  // PUBLISHING
  // ============================================

  async publish<T>(topic: TopicName, data: T, options?: {
    tenant_id?: string;
    agent_id?: string;
    key?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    if (!this.producer || !this.isConnected) {
      throw new Error('Event bus not connected');
    }

    const eventId = uuidv4();
    const message: EventMessage<T> = {
      id: eventId,
      type: topic,
      timestamp: new Date().toISOString(),
      source: this.config.clientId,
      tenant_id: options?.tenant_id,
      agent_id: options?.agent_id,
      data,
      metadata: options?.metadata,
    };

    try {
      await this.producer.send({
        topic,
        messages: [{
          key: options?.key || eventId,
          value: JSON.stringify(message),
          headers: {
            'event-id': eventId,
            'event-type': topic,
            'timestamp': message.timestamp,
            ...(options?.tenant_id && { 'tenant-id': options.tenant_id }),
          },
        }],
      });

      log.debug('Event published', { topic, eventId });
      return eventId;
    } catch (error) {
      log.error('Failed to publish event', { error, topic, eventId });
      throw error;
    }
  }

  /**
   * פרסום אירוע עדכון פוליסה
   */
  async publishPolicyUpdated(policy: any, options?: { tenant_id?: string; agent_id?: string }): Promise<string> {
    return this.publish(TOPICS.POLICY_UPDATED, policy, {
      ...options,
      key: policy.policy_number,
    });
  }

  /**
   * פרסום אירוע שינוי סטטוס תביעה
   */
  async publishClaimStatusChanged(claim: any, options?: { tenant_id?: string; agent_id?: string }): Promise<string> {
    return this.publish(TOPICS.CLAIM_STATUS_CHANGED, claim, {
      ...options,
      key: claim.claim_number,
    });
  }

  /**
   * פרסום אירוע סנכרון נתוני לקוח
   */
  async publishCustomerDataSynced(data: {
    customer_id: string;
    policies_count: number;
    pension_accounts_count: number;
    gaps_count: number;
  }, options?: { tenant_id?: string; agent_id?: string }): Promise<string> {
    return this.publish(TOPICS.CUSTOMER_DATA_SYNCED, data, {
      ...options,
      key: data.customer_id,
    });
  }

  /**
   * פרסום אירוע זיהוי פערי כיסוי
   */
  async publishGapsDetected(data: {
    customer_id: string;
    gaps: any[];
  }, options?: { tenant_id?: string; agent_id?: string }): Promise<string> {
    return this.publish(TOPICS.CUSTOMER_GAPS_DETECTED, data, {
      ...options,
      key: data.customer_id,
    });
  }

  // ============================================
  // SUBSCRIBING
  // ============================================

  /**
   * הרשמה לטופיק
   */
  subscribe<T>(topic: TopicName, handler: EventHandler<T>): void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, []);
    }
    this.handlers.get(topic)!.push(handler as EventHandler);
    log.info('Handler subscribed', { topic });
  }

  /**
   * התחלת האזנה לאירועים
   */
  async startConsuming(): Promise<void> {
    if (!this.consumer) {
      throw new Error('Consumer not initialized. Provide groupId in config.');
    }

    const topics = Array.from(this.handlers.keys());
    if (topics.length === 0) {
      log.warn('No handlers registered, skipping consume');
      return;
    }

    await this.consumer.subscribe({ topics, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });

    log.info('Started consuming events', { topics });
  }

  /**
   * טיפול בהודעה נכנסת
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, message } = payload;

    if (!message.value) {
      log.warn('Empty message received', { topic });
      return;
    }

    let event: EventMessage;
    try {
      event = JSON.parse(message.value.toString());
    } catch (error) {
      log.error('Failed to parse message', { error, topic });
      await this.sendToDeadLetter(message.value.toString(), 'parse_error', topic);
      return;
    }

    // Idempotency check
    if (this.idempotencyCache.has(event.id)) {
      log.debug('Duplicate event ignored', { eventId: event.id });
      return;
    }

    // Add to idempotency cache (with size limit)
    this.idempotencyCache.add(event.id);
    if (this.idempotencyCache.size > this.IDEMPOTENCY_CACHE_SIZE) {
      const iterator = this.idempotencyCache.values();
      this.idempotencyCache.delete(iterator.next().value);
    }

    const handlers = this.handlers.get(topic) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
        log.debug('Event handled', { topic, eventId: event.id });
      } catch (error) {
        log.error('Handler failed', { error, topic, eventId: event.id });
        await this.sendToDeadLetter(JSON.stringify(event), 'handler_error', topic, error);
      }
    }
  }

  /**
   * שליחה ל-Dead Letter Queue
   */
  private async sendToDeadLetter(
    originalMessage: string,
    errorType: string,
    originalTopic: string,
    error?: any
  ): Promise<void> {
    if (!this.producer) return;

    try {
      await this.producer.send({
        topic: TOPICS.DLQ,
        messages: [{
          key: uuidv4(),
          value: JSON.stringify({
            original_message: originalMessage,
            original_topic: originalTopic,
            error_type: errorType,
            error_message: error?.message,
            timestamp: new Date().toISOString(),
          }),
        }],
      });
      log.warn('Message sent to DLQ', { originalTopic, errorType });
    } catch (dlqError) {
      log.error('Failed to send to DLQ', { dlqError });
    }
  }

  // ============================================
  // ADMIN OPERATIONS
  // ============================================

  /**
   * יצירת טופיקים
   */
  async createTopics(): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();

    try {
      const existingTopics = await admin.listTopics();
      const topicsToCreate = Object.values(TOPICS)
        .filter(topic => !existingTopics.includes(topic))
        .map(topic => ({
          topic,
          numPartitions: 3,
          replicationFactor: 1,
        }));

      if (topicsToCreate.length > 0) {
        await admin.createTopics({ topics: topicsToCreate });
        log.info('Topics created', { topics: topicsToCreate.map(t => t.topic) });
      }
    } finally {
      await admin.disconnect();
    }
  }

  /**
   * בדיקת תקינות
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isConnected || !this.producer) {
      return false;
    }

    try {
      const admin = this.kafka.admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

let eventBusInstance: EventBusService | null = null;

export function getEventBus(config?: EventBusConfig): EventBusService {
  if (!eventBusInstance && config) {
    eventBusInstance = new EventBusService(config);
  }
  if (!eventBusInstance) {
    throw new Error('EventBus not initialized. Provide config on first call.');
  }
  return eventBusInstance;
}

export function initEventBus(config: EventBusConfig): EventBusService {
  eventBusInstance = new EventBusService(config);
  return eventBusInstance;
}

export async function connectEventBus(config: EventBusConfig): Promise<EventBusService> {
  const bus = initEventBus(config);
  await bus.connect();
  return bus;
}
