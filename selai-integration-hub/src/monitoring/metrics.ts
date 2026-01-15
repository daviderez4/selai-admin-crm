/**
 * SELAI Insurance Integration Hub
 * Metrics - Prometheus-compatible metrics collection
 */

import { FastifyInstance, FastifyRequest } from 'fastify';

// ============================================
// TYPES
// ============================================

export interface MetricLabels {
  [key: string]: string;
}

export interface CounterMetric {
  name: string;
  help: string;
  labels: string[];
  values: Map<string, number>;
}

export interface GaugeMetric {
  name: string;
  help: string;
  labels: string[];
  values: Map<string, number>;
}

export interface HistogramMetric {
  name: string;
  help: string;
  labels: string[];
  buckets: number[];
  values: Map<string, { count: number; sum: number; buckets: number[] }>;
}

// ============================================
// METRIC NAMES
// ============================================

export const METRIC_NAMES = {
  // HTTP metrics
  HTTP_REQUEST_DURATION: 'http_request_duration_seconds',
  HTTP_REQUESTS_TOTAL: 'http_requests_total',
  HTTP_REQUEST_SIZE: 'http_request_size_bytes',
  HTTP_RESPONSE_SIZE: 'http_response_size_bytes',

  // Business metrics
  POLICIES_SYNCED: 'policies_synced_total',
  QUOTES_REQUESTED: 'quotes_requested_total',
  QUOTES_ACCEPTED: 'quotes_accepted_total',
  COVERAGE_GAPS_DETECTED: 'coverage_gaps_detected_total',
  CUSTOMERS_SYNCED: 'customers_synced_total',

  // Connector metrics
  CONNECTOR_REQUESTS: 'connector_requests_total',
  CONNECTOR_ERRORS: 'connector_errors_total',
  CONNECTOR_LATENCY: 'connector_latency_seconds',

  // Cache metrics
  CACHE_HITS: 'cache_hits_total',
  CACHE_MISSES: 'cache_misses_total',

  // Event metrics
  EVENTS_PUBLISHED: 'events_published_total',
  EVENTS_CONSUMED: 'events_consumed_total',
  EVENTS_FAILED: 'events_failed_total',

  // System metrics
  ACTIVE_CONNECTIONS: 'active_connections',
  MEMORY_USAGE: 'memory_usage_bytes',
  CPU_USAGE: 'cpu_usage_percent'
};

// ============================================
// METRICS COLLECTOR
// ============================================

export class MetricsCollector {
  private counters: Map<string, CounterMetric> = new Map();
  private gauges: Map<string, GaugeMetric> = new Map();
  private histograms: Map<string, HistogramMetric> = new Map();

  constructor() {
    this.initializeMetrics();
  }

  /**
   * Initialize all metrics
   */
  private initializeMetrics(): void {
    // HTTP metrics
    this.registerCounter(METRIC_NAMES.HTTP_REQUESTS_TOTAL, 'Total HTTP requests', ['method', 'route', 'status']);
    this.registerHistogram(METRIC_NAMES.HTTP_REQUEST_DURATION, 'HTTP request duration', ['method', 'route'], [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]);

    // Business metrics
    this.registerCounter(METRIC_NAMES.POLICIES_SYNCED, 'Total policies synced', ['carrier', 'type']);
    this.registerCounter(METRIC_NAMES.QUOTES_REQUESTED, 'Total quotes requested', ['insurance_type']);
    this.registerCounter(METRIC_NAMES.QUOTES_ACCEPTED, 'Total quotes accepted', ['carrier', 'insurance_type']);
    this.registerCounter(METRIC_NAMES.COVERAGE_GAPS_DETECTED, 'Total coverage gaps detected', ['gap_type', 'priority']);
    this.registerCounter(METRIC_NAMES.CUSTOMERS_SYNCED, 'Total customers synced', ['source']);

    // Connector metrics
    this.registerCounter(METRIC_NAMES.CONNECTOR_REQUESTS, 'Total connector requests', ['connector', 'operation']);
    this.registerCounter(METRIC_NAMES.CONNECTOR_ERRORS, 'Total connector errors', ['connector', 'error_type']);
    this.registerHistogram(METRIC_NAMES.CONNECTOR_LATENCY, 'Connector request latency', ['connector', 'operation'], [0.1, 0.5, 1, 2, 5, 10, 30]);

    // Cache metrics
    this.registerCounter(METRIC_NAMES.CACHE_HITS, 'Cache hits', ['cache_type']);
    this.registerCounter(METRIC_NAMES.CACHE_MISSES, 'Cache misses', ['cache_type']);

    // Event metrics
    this.registerCounter(METRIC_NAMES.EVENTS_PUBLISHED, 'Events published', ['topic']);
    this.registerCounter(METRIC_NAMES.EVENTS_CONSUMED, 'Events consumed', ['topic']);
    this.registerCounter(METRIC_NAMES.EVENTS_FAILED, 'Events failed', ['topic', 'error_type']);

    // System gauges
    this.registerGauge(METRIC_NAMES.ACTIVE_CONNECTIONS, 'Active connections', ['type']);
    this.registerGauge(METRIC_NAMES.MEMORY_USAGE, 'Memory usage in bytes', ['type']);
    this.registerGauge(METRIC_NAMES.CPU_USAGE, 'CPU usage percent', []);
  }

  // ============================================
  // REGISTRATION
  // ============================================

  registerCounter(name: string, help: string, labels: string[]): void {
    this.counters.set(name, { name, help, labels, values: new Map() });
  }

  registerGauge(name: string, help: string, labels: string[]): void {
    this.gauges.set(name, { name, help, labels, values: new Map() });
  }

  registerHistogram(name: string, help: string, labels: string[], buckets: number[]): void {
    this.histograms.set(name, { name, help, labels, buckets, values: new Map() });
  }

  // ============================================
  // COUNTER OPERATIONS
  // ============================================

  incrementCounter(name: string, labels: MetricLabels = {}, value: number = 1): void {
    const metric = this.counters.get(name);
    if (!metric) return;

    const key = this.labelsToKey(labels);
    const current = metric.values.get(key) || 0;
    metric.values.set(key, current + value);
  }

  // ============================================
  // GAUGE OPERATIONS
  // ============================================

  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const metric = this.gauges.get(name);
    if (!metric) return;

    const key = this.labelsToKey(labels);
    metric.values.set(key, value);
  }

  incrementGauge(name: string, labels: MetricLabels = {}, value: number = 1): void {
    const metric = this.gauges.get(name);
    if (!metric) return;

    const key = this.labelsToKey(labels);
    const current = metric.values.get(key) || 0;
    metric.values.set(key, current + value);
  }

  decrementGauge(name: string, labels: MetricLabels = {}, value: number = 1): void {
    this.incrementGauge(name, labels, -value);
  }

  // ============================================
  // HISTOGRAM OPERATIONS
  // ============================================

  observeHistogram(name: string, value: number, labels: MetricLabels = {}): void {
    const metric = this.histograms.get(name);
    if (!metric) return;

    const key = this.labelsToKey(labels);
    let data = metric.values.get(key);

    if (!data) {
      data = {
        count: 0,
        sum: 0,
        buckets: metric.buckets.map(() => 0)
      };
      metric.values.set(key, data);
    }

    data.count++;
    data.sum += value;

    for (let i = 0; i < metric.buckets.length; i++) {
      if (value <= metric.buckets[i]) {
        data.buckets[i]++;
      }
    }
  }

  // ============================================
  // TIMER HELPER
  // ============================================

  startTimer(): () => number {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1e9; // Convert to seconds
    };
  }

  // ============================================
  // OUTPUT
  // ============================================

  /**
   * Generate Prometheus-format metrics output
   */
  getMetrics(): string {
    const lines: string[] = [];

    // Counters
    for (const [name, metric] of this.counters) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} counter`);
      for (const [key, value] of metric.values) {
        const labelStr = key ? `{${key}}` : '';
        lines.push(`${name}${labelStr} ${value}`);
      }
    }

    // Gauges
    for (const [name, metric] of this.gauges) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} gauge`);
      for (const [key, value] of metric.values) {
        const labelStr = key ? `{${key}}` : '';
        lines.push(`${name}${labelStr} ${value}`);
      }
    }

    // Histograms
    for (const [name, metric] of this.histograms) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} histogram`);
      for (const [key, data] of metric.values) {
        const labelStr = key ? `${key},` : '';
        for (let i = 0; i < metric.buckets.length; i++) {
          lines.push(`${name}_bucket{${labelStr}le="${metric.buckets[i]}"} ${data.buckets[i]}`);
        }
        lines.push(`${name}_bucket{${labelStr}le="+Inf"} ${data.count}`);
        lines.push(`${name}_sum{${key || ''}} ${data.sum}`);
        lines.push(`${name}_count{${key || ''}} ${data.count}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get metrics as JSON
   */
  getMetricsJSON(): Record<string, any> {
    return {
      counters: Object.fromEntries(
        Array.from(this.counters.entries()).map(([name, metric]) => [
          name,
          Object.fromEntries(metric.values)
        ])
      ),
      gauges: Object.fromEntries(
        Array.from(this.gauges.entries()).map(([name, metric]) => [
          name,
          Object.fromEntries(metric.values)
        ])
      ),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([name, metric]) => [
          name,
          Object.fromEntries(metric.values)
        ])
      )
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private labelsToKey(labels: MetricLabels): string {
    const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([k, v]) => `${k}="${v}"`).join(',');
  }
}

// ============================================
// SINGLETON & FASTIFY PLUGIN
// ============================================

export const metrics = new MetricsCollector();

/**
 * Fastify plugin for automatic HTTP metrics
 */
export async function metricsPlugin(fastify: FastifyInstance): Promise<void> {
  // Request timing
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    (request as any).startTime = process.hrtime.bigint();
  });

  // Record metrics on response
  fastify.addHook('onResponse', async (request, reply) => {
    const startTime = (request as any).startTime;
    if (startTime) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
      const route = request.routeOptions?.url || request.url;

      metrics.observeHistogram(METRIC_NAMES.HTTP_REQUEST_DURATION, duration, {
        method: request.method,
        route
      });

      metrics.incrementCounter(METRIC_NAMES.HTTP_REQUESTS_TOTAL, {
        method: request.method,
        route,
        status: String(reply.statusCode)
      });
    }
  });

  // Metrics endpoint
  fastify.get('/metrics', async () => {
    // Update system metrics
    const memUsage = process.memoryUsage();
    metrics.setGauge(METRIC_NAMES.MEMORY_USAGE, memUsage.heapUsed, { type: 'heap' });
    metrics.setGauge(METRIC_NAMES.MEMORY_USAGE, memUsage.rss, { type: 'rss' });

    return metrics.getMetrics();
  });

  // JSON metrics endpoint
  fastify.get('/metrics/json', async () => {
    return metrics.getMetricsJSON();
  });
}
