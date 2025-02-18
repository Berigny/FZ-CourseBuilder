import { rateLimitConfig } from '../../config/ai';

class RateLimiter {
  private requestCount: number = 0;
  private tokenCount: number = 0;
  private lastResetTime: number = Date.now();
  private activeRequests: number = 0;
  private queue: Array<() => Promise<any>> = [];

  private resetCounters() {
    const now = Date.now();
    if (now - this.lastResetTime >= 60000) { // 1 minute
      this.requestCount = 0;
      this.tokenCount = 0;
      this.lastResetTime = now;
    }
  }

  async acquirePermit(tokenCount: number): Promise<boolean> {
    this.resetCounters();

    if (
      this.requestCount >= rateLimitConfig.maxRequestsPerMinute ||
      this.tokenCount + tokenCount >= rateLimitConfig.maxTokensPerMinute ||
      this.activeRequests >= rateLimitConfig.maxConcurrentRequests
    ) {
      return false;
    }

    this.requestCount++;
    this.tokenCount += tokenCount;
    this.activeRequests++;
    return true;
  }

  releasePermit(tokenCount: number) {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this.processQueue();
  }

  private async processQueue() {
    if (this.queue.length === 0 || this.activeRequests >= rateLimitConfig.maxConcurrentRequests) {
      return;
    }

    const nextRequest = this.queue.shift();
    if (nextRequest) {
      try {
        this.activeRequests++;
        await nextRequest();
      } catch (error) {
        console.error('Error processing queued request:', error);
      } finally {
        this.activeRequests = Math.max(0, this.activeRequests - 1);
        this.processQueue();
      }
    }
  }

  async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const wrappedOperation = async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };

      this.queue.push(wrappedOperation);
      
      if (this.activeRequests < rateLimitConfig.maxConcurrentRequests) {
        this.processQueue();
      }
    });
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getActiveRequests(): number {
    return this.activeRequests;
  }

  clearQueue() {
    this.queue = [];
  }
}

export const rateLimiter = new RateLimiter();