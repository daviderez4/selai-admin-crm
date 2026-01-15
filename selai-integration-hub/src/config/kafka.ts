/**
 * SELAI Insurance Integration Hub
 * Kafka Configuration - הגדרות Kafka
 *
 * Configuration for Kafka event streaming
 */

import { z } from 'zod';

// ============================================
// KAFKA CONFIG SCHEMA
// ============================================

const KafkaConfigSchema = z.object({
  // Connection
  brokers: z.array(z.string()).default(['localhost:9092']),
  clientId: z.string().default('selai-integration-hub'),
  groupId: z.string().default('selai-consumers'),

  // SSL/TLS
  ssl: z.object({
    enabled: z.boolean().default(false),
    rejectUnauthorized: z.boolean().default(true),
    ca: z.string().optional(),
    cert: z.string().optional(),
    key: z.string().optional()
  }).default({}),

  // SASL Authentication
  sasl: z.object({
    mechanism: z.enum(['plain', 'scram-sha-256', 'scram-sha-512', 'aws']).optional(),
    username: z.string().optional(),
    password: z.string().optional()
  }).optional(),

  // Producer settings
  producer: z.object({
    acks: z.enum(['-1', '0', '1', 'all']).default('all'),
    timeout: z.number().default(30000),
    compression: z.enum(['none', 'gzip', 'snappy', 'lz4', 'zstd']).default('gzip'),
    maxRetries: z.number().default(5),
    retryBackoff: z.number().default(100),
    idempotent: z.boolean().default(true)
  }).default({}),

  // Consumer settings
  consumer: z.object({
    sessionTimeout: z.number().default(30000),
    heartbeatInterval: z.number().default(3000),
    maxBytesPerPartition: z.number().default(1048576), // 1MB
    maxWaitTimeInMs: z.number().default(5000),
    autoCommit: z.boolean().default(true),
    autoCommitInterval: z.number().default(5000),
    fromBeginning: z.boolean().default(false)
  }).default({}),

  // Topics configuration
  topics: z.object({
    prefix: z.string().default('selai'),
    partitions: z.number().default(3),
    replicationFactor: z.number().default(1)
  }).default({})
});

export type KafkaConfig = z.infer<typeof KafkaConfigSchema>;

// ============================================
// TOPIC DEFINITIONS
// ============================================

/**
 * All Kafka topics used by the system
 */
export const KafkaTopics = {
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

  // System events
  CONNECTOR_STATUS_CHANGED: 'selai.system.connector_status',
  SYNC_COMPLETED: 'selai.system.sync_completed',
  SYNC_FAILED: 'selai.system.sync_failed',

  // Dead letter queue
  DLQ: 'selai.dlq'
} as const;

export type KafkaTopic = typeof KafkaTopics[keyof typeof KafkaTopics];

// ============================================
// LOAD KAFKA CONFIG
// ============================================

function loadKafkaConfig(): KafkaConfig {
  // Parse SASL config
  let sasl: KafkaConfig['sasl'];
  if (process.env.KAFKA_SASL_MECHANISM) {
    sasl = {
      mechanism: process.env.KAFKA_SASL_MECHANISM as any,
      username: process.env.KAFKA_SASL_USERNAME,
      password: process.env.KAFKA_SASL_PASSWORD
    };
  }

  return KafkaConfigSchema.parse({
    brokers: process.env.KAFKA_BROKERS?.split(',').map(s => s.trim()) || ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'selai-integration-hub',
    groupId: process.env.KAFKA_GROUP_ID || 'selai-consumers',

    ssl: {
      enabled: process.env.KAFKA_SSL === 'true',
      rejectUnauthorized: process.env.KAFKA_SSL_REJECT_UNAUTHORIZED !== 'false',
      ca: process.env.KAFKA_SSL_CA,
      cert: process.env.KAFKA_SSL_CERT,
      key: process.env.KAFKA_SSL_KEY
    },

    sasl,

    producer: {
      acks: (process.env.KAFKA_PRODUCER_ACKS || 'all') as any,
      timeout: parseInt(process.env.KAFKA_PRODUCER_TIMEOUT || '30000', 10),
      compression: (process.env.KAFKA_PRODUCER_COMPRESSION || 'gzip') as any,
      maxRetries: parseInt(process.env.KAFKA_PRODUCER_RETRIES || '5', 10),
      retryBackoff: parseInt(process.env.KAFKA_PRODUCER_RETRY_BACKOFF || '100', 10),
      idempotent: process.env.KAFKA_PRODUCER_IDEMPOTENT !== 'false'
    },

    consumer: {
      sessionTimeout: parseInt(process.env.KAFKA_CONSUMER_SESSION_TIMEOUT || '30000', 10),
      heartbeatInterval: parseInt(process.env.KAFKA_CONSUMER_HEARTBEAT || '3000', 10),
      maxBytesPerPartition: parseInt(process.env.KAFKA_CONSUMER_MAX_BYTES || '1048576', 10),
      maxWaitTimeInMs: parseInt(process.env.KAFKA_CONSUMER_MAX_WAIT || '5000', 10),
      autoCommit: process.env.KAFKA_CONSUMER_AUTO_COMMIT !== 'false',
      autoCommitInterval: parseInt(process.env.KAFKA_CONSUMER_COMMIT_INTERVAL || '5000', 10),
      fromBeginning: process.env.KAFKA_CONSUMER_FROM_BEGINNING === 'true'
    },

    topics: {
      prefix: process.env.KAFKA_TOPIC_PREFIX || 'selai',
      partitions: parseInt(process.env.KAFKA_TOPIC_PARTITIONS || '3', 10),
      replicationFactor: parseInt(process.env.KAFKA_TOPIC_REPLICATION || '1', 10)
    }
  });
}

// ============================================
// EXPORT
// ============================================

export const kafkaConfig = loadKafkaConfig();

/**
 * Check if Kafka is configured
 */
export function isKafkaConfigured(): boolean {
  return kafkaConfig.brokers.length > 0 && kafkaConfig.brokers[0] !== 'localhost:9092';
}

/**
 * Get all topic names
 */
export function getAllTopics(): string[] {
  return Object.values(KafkaTopics);
}
