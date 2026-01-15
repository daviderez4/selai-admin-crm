/**
 * SELAI Insurance Integration Hub
 * Monitoring Index - Export all monitoring utilities
 */

// Metrics
export {
  MetricsCollector,
  metrics,
  metricsPlugin,
  METRIC_NAMES,
  type MetricLabels,
  type CounterMetric,
  type GaugeMetric,
  type HistogramMetric
} from './metrics.js';

// Health Checks
export {
  HealthCheckRegistry,
  healthRegistry,
  healthPlugin,
  createDatabaseCheck,
  createCacheCheck,
  createEventBusCheck,
  createConnectorCheck,
  createMemoryCheck,
  createDiskCheck,
  type HealthStatus,
  type ComponentHealth,
  type SystemHealth,
  type HealthCheckFunction
} from './health-checks.js';
