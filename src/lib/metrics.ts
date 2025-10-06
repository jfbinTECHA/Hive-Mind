import { register, collectDefaultMetrics, Gauge, Histogram, Counter } from 'prom-client';

// Enable default metrics collection (CPU, memory, etc.)
collectDefaultMetrics();

// Custom metrics for AI Hive Mind
export const metrics = {
  // Request metrics
  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  }),

  httpRequestsTotal: new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  }),

  // AI interaction metrics
  aiResponseTime: new Histogram({
    name: 'ai_response_time_seconds',
    help: 'Time taken for AI to generate responses',
    labelNames: ['companion_id', 'model'],
    buckets: [0.5, 1, 2, 5, 10, 30],
  }),

  aiRequestsTotal: new Counter({
    name: 'ai_requests_total',
    help: 'Total number of AI requests',
    labelNames: ['companion_id', 'model', 'status'],
  }),

  // Memory operation metrics
  memoryOperationDuration: new Histogram({
    name: 'memory_operation_duration_seconds',
    help: 'Duration of memory operations',
    labelNames: ['operation', 'type'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  }),

  memoryOperationsTotal: new Counter({
    name: 'memory_operations_total',
    help: 'Total number of memory operations',
    labelNames: ['operation', 'type', 'status'],
  }),

  // Vector database metrics
  vectorSearchDuration: new Histogram({
    name: 'vector_search_duration_seconds',
    help: 'Duration of vector similarity searches',
    labelNames: ['index_type'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1],
  }),

  vectorEmbeddingsGenerated: new Counter({
    name: 'vector_embeddings_generated_total',
    help: 'Total number of vector embeddings generated',
    labelNames: ['model', 'content_type'],
  }),

  // Cache metrics
  cacheHits: new Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type'],
  }),

  cacheMisses: new Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type'],
  }),

  // User engagement metrics
  activeUsers: new Gauge({
    name: 'active_users',
    help: 'Number of currently active users',
  }),

  totalConversations: new Counter({
    name: 'conversations_total',
    help: 'Total number of conversations created',
    labelNames: ['type'], // 'single', 'group'
  }),

  // System health metrics
  databaseConnections: new Gauge({
    name: 'database_connections_active',
    help: 'Number of active database connections',
  }),

  redisConnections: new Gauge({
    name: 'redis_connections_active',
    help: 'Number of active Redis connections',
  }),

  // Error metrics
  errorsTotal: new Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'component'],
  }),

  // Rate limiting metrics
  rateLimitHits: new Counter({
    name: 'rate_limit_hits_total',
    help: 'Total number of rate limit hits',
    labelNames: ['endpoint'],
  }),
};

// Helper functions for recording metrics
export const recordHttpRequest = (method: string, route: string, statusCode: number, duration: number) => {
  metrics.httpRequestDuration
    .labels(method, route, statusCode.toString())
    .observe(duration / 1000); // Convert to seconds

  metrics.httpRequestsTotal
    .labels(method, route, statusCode.toString())
    .inc();
};

export const recordAIInteraction = (companionId: string, model: string, responseTime: number, success: boolean) => {
  metrics.aiResponseTime
    .labels(companionId, model)
    .observe(responseTime / 1000); // Convert to seconds

  metrics.aiRequestsTotal
    .labels(companionId, model, success ? 'success' : 'error')
    .inc();
};

export const recordMemoryOperation = (operation: string, type: string, duration: number, success: boolean) => {
  metrics.memoryOperationDuration
    .labels(operation, type)
    .observe(duration / 1000); // Convert to seconds

  metrics.memoryOperationsTotal
    .labels(operation, type, success ? 'success' : 'error')
    .inc();
};

export const recordVectorSearch = (indexType: string, duration: number) => {
  metrics.vectorSearchDuration
    .labels(indexType)
    .observe(duration / 1000); // Convert to seconds
};

export const recordEmbeddingGeneration = (model: string, contentType: string) => {
  metrics.vectorEmbeddingsGenerated
    .labels(model, contentType)
    .inc();
};

export const recordCacheAccess = (cacheType: string, hit: boolean) => {
  if (hit) {
    metrics.cacheHits.labels(cacheType).inc();
  } else {
    metrics.cacheMisses.labels(cacheType).inc();
  }
};

export const recordConversation = (type: 'single' | 'group') => {
  metrics.totalConversations.labels(type).inc();
};

export const recordError = (type: string, component: string) => {
  metrics.errorsTotal.labels(type, component).inc();
};

export const recordRateLimitHit = (endpoint: string) => {
  metrics.rateLimitHits.labels(endpoint).inc();
};

// Metrics endpoint handler for Prometheus scraping
export const getMetrics = async () => {
  return register.metrics();
};

// Reset metrics (useful for testing)
export const resetMetrics = () => {
  register.resetMetrics();
  collectDefaultMetrics();
};

export default metrics;