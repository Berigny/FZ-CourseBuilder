import { AIServiceConfig } from './types';

interface MetricPoint {
  timestamp: number;
  value: number;
}

class AIMonitoring {
  private static instance: AIMonitoring;
  private metrics: Map<string, MetricPoint[]> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private lastAlert: number = 0;
  private readonly alertThreshold = 5 * 60 * 1000; // 5 minutes
  private readonly latencyThreshold = 45000; // 45 seconds for AI model requests
  private readonly errorThreshold = 3; // Number of errors before alerting

  private constructor() {
    // Initialize metric tracking
    this.metrics.set('requestLatency', []);
    this.metrics.set('tokenUsage', []);
    this.metrics.set('errorRate', []);
    
    // Start periodic cleanup
    setInterval(() => this.cleanupOldMetrics(), 60 * 60 * 1000); // Every hour
  }

  static getInstance(): AIMonitoring {
    if (!AIMonitoring.instance) {
      AIMonitoring.instance = new AIMonitoring();
    }
    return AIMonitoring.instance;
  }

  recordLatency(provider: string, latencyMs: number) {
    const key = `${provider}_latency`;
    const points = this.metrics.get(key) || [];
    points.push({ timestamp: Date.now(), value: latencyMs });
    this.metrics.set(key, points);
    
    // Only alert on extremely high latency
    if (latencyMs > this.latencyThreshold) {
      this.checkAndAlert('High Latency', `${provider} request took ${(latencyMs / 1000).toFixed(1)}s`);
    }
  }

  recordTokenUsage(provider: string, tokens: number) {
    const key = `${provider}_tokens`;
    const points = this.metrics.get(key) || [];
    points.push({ timestamp: Date.now(), value: tokens });
    this.metrics.set(key, points);
  }

  recordError(provider: string, errorCode: string) {
    const key = `${provider}_${errorCode}`;
    const currentCount = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, currentCount + 1);

    // Alert on error threshold
    if (currentCount + 1 >= this.errorThreshold) {
      this.checkAndAlert('Error Threshold', `${provider} encountered ${currentCount + 1} ${errorCode} errors`);
      // Reset counter after alerting
      this.errorCounts.set(key, 0);
    }
  }

  getMetrics(provider: string, metricType: string, timeRange: number): MetricPoint[] {
    const key = `${provider}_${metricType}`;
    const points = this.metrics.get(key) || [];
    const cutoff = Date.now() - timeRange;
    return points.filter(point => point.timestamp >= cutoff);
  }

  getAverageLatency(provider: string, timeRange: number = 5 * 60 * 1000): number {
    const latencies = this.getMetrics(provider, 'latency', timeRange);
    if (latencies.length === 0) return 0;
    
    const sum = latencies.reduce((acc, point) => acc + point.value, 0);
    return sum / latencies.length;
  }

  private cleanupOldMetrics() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    for (const [key, points] of this.metrics.entries()) {
      this.metrics.set(key, points.filter(point => point.timestamp >= cutoff));
    }
    this.errorCounts.clear();
  }

  private checkAndAlert(title: string, message: string) {
    const now = Date.now();
    if (now - this.lastAlert >= this.alertThreshold) {
      console.warn(`[AI Monitoring] ${title}: ${message}`);
      this.lastAlert = now;
    }
  }
}

export const aiMonitoring = AIMonitoring.getInstance();