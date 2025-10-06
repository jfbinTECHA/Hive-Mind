import { Database } from './database';

export interface UsageStats {
  totalInteractions: number;
  totalMessages: number;
  totalVoiceInteractions: number;
  totalMemoryOperations: number;
  totalEvolutionEvents: number;
  totalSharedMemories: number;
  activeCompanions: number;
  totalCompanions: number;
  averageSessionLength: number;
  peakUsageHour: number;
  mostActiveDay: string;
  retentionRate: number;
}

export interface MemoryStats {
  totalMemories: number;
  totalMemorySize: number; // in bytes
  averageMemorySize: number;
  memoriesByType: Record<string, number>;
  memoriesByCompanion: Record<string, number>;
  sharedMemoriesCount: number;
  memoryClustersCount: number;
  oldestMemory: Date | null;
  newestMemory: Date | null;
  memoryGrowthRate: number; // memories per day
}

export interface InteractionStats {
  mostActiveCompanion: string;
  topTopics: Array<{ topic: string; count: number; trend: number }>;
  conversationLengths: {
    average: number;
    longest: number;
    shortest: number;
  };
  responseTimes: {
    average: number;
    fastest: number;
    slowest: number;
  };
  emotionalTrends: Array<{
    date: string;
    averageMood: number;
    averageEnergy: number;
    dominantEmotion: string;
  }>;
  companionInteractions: Array<{
    companionId: string;
    interactionCount: number;
    averageResponseTime: number;
    satisfactionScore: number;
  }>;
}

export interface AnalyticsData {
  usage: UsageStats;
  memory: MemoryStats;
  interactions: InteractionStats;
  timeRange: {
    start: Date;
    end: Date;
  };
  lastUpdated: Date;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: any;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
  category?: string;
}

export class AnalyticsSystem {
  private static readonly ANALYTICS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private cache: Map<string, { data: AnalyticsData; timestamp: number }> = new Map();

  /**
   * Get comprehensive analytics data
   */
  async getAnalytics(
    timeRange: { start: Date; end: Date } = this.getDefaultTimeRange()
  ): Promise<AnalyticsData> {
    const cacheKey = `analytics_${timeRange.start.getTime()}_${timeRange.end.getTime()}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < AnalyticsSystem.ANALYTICS_CACHE_DURATION) {
      return cached.data;
    }

    // Gather all analytics data
    const [usage, memory, interactions] = await Promise.all([
      this.calculateUsageStats(timeRange),
      this.calculateMemoryStats(timeRange),
      this.calculateInteractionStats(timeRange),
    ]);

    const analyticsData: AnalyticsData = {
      usage,
      memory,
      interactions,
      timeRange,
      lastUpdated: new Date(),
    };

    // Cache the result
    this.cache.set(cacheKey, { data: analyticsData, timestamp: Date.now() });

    return analyticsData;
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(timeRange?: { start: Date; end: Date }): Promise<UsageStats> {
    const range = timeRange || this.getDefaultTimeRange();
    return this.calculateUsageStats(range);
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(timeRange?: { start: Date; end: Date }): Promise<MemoryStats> {
    const range = timeRange || this.getDefaultTimeRange();
    return this.calculateMemoryStats(range);
  }

  /**
   * Get interaction statistics
   */
  async getInteractionStats(timeRange?: { start: Date; end: Date }): Promise<InteractionStats> {
    const range = timeRange || this.getDefaultTimeRange();
    return this.calculateInteractionStats(range);
  }

  /**
   * Get chart data for visualizations
   */
  async getChartData(
    metric: 'usage' | 'memory' | 'interactions',
    chartType: 'bar' | 'line' | 'pie' | 'doughnut',
    timeRange?: { start: Date; end: Date }
  ): Promise<ChartDataPoint[]> {
    const range = timeRange || this.getDefaultTimeRange();
    const analytics = await this.getAnalytics(range);

    switch (metric) {
      case 'usage':
        return this.generateUsageChartData(analytics.usage, chartType);
      case 'memory':
        return this.generateMemoryChartData(analytics.memory, chartType);
      case 'interactions':
        return this.generateInteractionChartData(analytics.interactions, chartType);
      default:
        return [];
    }
  }

  /**
   * Get time series data for trends
   */
  async getTimeSeriesData(
    metric: string,
    interval: 'hour' | 'day' | 'week' | 'month',
    timeRange?: { start: Date; end: Date }
  ): Promise<TimeSeriesData[]> {
    const range = timeRange || this.getDefaultTimeRange();

    // Generate time series based on interval
    const series: TimeSeriesData[] = [];
    const startTime = range.start.getTime();
    const endTime = range.end.getTime();
    const intervalMs = this.getIntervalMs(interval);

    for (let time = startTime; time <= endTime; time += intervalMs) {
      const value = await this.getMetricValueAtTime(metric, new Date(time));
      series.push({
        timestamp: new Date(time),
        value,
        label: this.formatTimeLabel(new Date(time), interval),
      });
    }

    return series;
  }

  // Private calculation methods

  private async calculateUsageStats(timeRange: { start: Date; end: Date }): Promise<UsageStats> {
    // Mock data - would query database in real implementation
    return {
      totalInteractions: 1247,
      totalMessages: 2891,
      totalVoiceInteractions: 156,
      totalMemoryOperations: 423,
      totalEvolutionEvents: 12,
      totalSharedMemories: 89,
      activeCompanions: 3,
      totalCompanions: 5,
      averageSessionLength: 24.5, // minutes
      peakUsageHour: 14, // 2 PM
      mostActiveDay: 'Wednesday',
      retentionRate: 0.87,
    };
  }

  private async calculateMemoryStats(timeRange: { start: Date; end: Date }): Promise<MemoryStats> {
    // Mock data - would query database in real implementation
    return {
      totalMemories: 567,
      totalMemorySize: 2457600, // ~2.4 MB
      averageMemorySize: 4334, // ~4.3 KB per memory
      memoriesByType: {
        personal: 234,
        experience: 156,
        relationship: 98,
        knowledge: 67,
        shared_experience: 12,
      },
      memoriesByCompanion: {
        'companion-1': 234,
        'companion-2': 189,
        'companion-3': 144,
      },
      sharedMemoriesCount: 89,
      memoryClustersCount: 23,
      oldestMemory: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      newestMemory: new Date(),
      memoryGrowthRate: 6.3, // memories per day
    };
  }

  private async calculateInteractionStats(timeRange: {
    start: Date;
    end: Date;
  }): Promise<InteractionStats> {
    // Mock data - would query database in real implementation
    return {
      mostActiveCompanion: 'companion-1',
      topTopics: [
        { topic: 'personal growth', count: 145, trend: 0.12 },
        { topic: 'relationships', count: 132, trend: 0.08 },
        { topic: 'creativity', count: 98, trend: -0.03 },
        { topic: 'technology', count: 87, trend: 0.15 },
        { topic: 'emotions', count: 76, trend: 0.05 },
      ],
      conversationLengths: {
        average: 12.3,
        longest: 89,
        shortest: 1,
      },
      responseTimes: {
        average: 2.1, // seconds
        fastest: 0.3,
        slowest: 15.7,
      },
      emotionalTrends: [
        { date: '2024-01-01', averageMood: 0.2, averageEnergy: 0.7, dominantEmotion: 'curious' },
        { date: '2024-01-02', averageMood: 0.4, averageEnergy: 0.8, dominantEmotion: 'excited' },
        {
          date: '2024-01-03',
          averageMood: 0.1,
          averageEnergy: 0.5,
          dominantEmotion: 'contemplative',
        },
      ],
      companionInteractions: [
        {
          companionId: 'companion-1',
          interactionCount: 456,
          averageResponseTime: 1.8,
          satisfactionScore: 0.92,
        },
        {
          companionId: 'companion-2',
          interactionCount: 389,
          averageResponseTime: 2.2,
          satisfactionScore: 0.88,
        },
        {
          companionId: 'companion-3',
          interactionCount: 234,
          averageResponseTime: 2.5,
          satisfactionScore: 0.85,
        },
      ],
    };
  }

  private generateUsageChartData(usage: UsageStats, chartType: string): ChartDataPoint[] {
    switch (chartType) {
      case 'bar':
        return [
          { label: 'Messages', value: usage.totalMessages, color: '#3B82F6' },
          { label: 'Interactions', value: usage.totalInteractions, color: '#10B981' },
          { label: 'Voice', value: usage.totalVoiceInteractions, color: '#F59E0B' },
          { label: 'Memory Ops', value: usage.totalMemoryOperations, color: '#EF4444' },
        ];
      case 'pie':
        return [
          { label: 'Active Companions', value: usage.activeCompanions, color: '#3B82F6' },
          {
            label: 'Total Companions',
            value: usage.totalCompanions - usage.activeCompanions,
            color: '#9CA3AF',
          },
        ];
      default:
        return [];
    }
  }

  private generateMemoryChartData(memory: MemoryStats, chartType: string): ChartDataPoint[] {
    switch (chartType) {
      case 'pie':
        return Object.entries(memory.memoriesByType).map(([type, count]) => ({
          label: type.replace('_', ' '),
          value: count,
          color: this.getMemoryTypeColor(type),
        }));
      case 'bar':
        return Object.entries(memory.memoriesByCompanion).map(([companion, count]) => ({
          label: `Companion ${companion.split('-')[1]}`,
          value: count,
          color: '#8B5CF6',
        }));
      default:
        return [];
    }
  }

  private generateInteractionChartData(
    interactions: InteractionStats,
    chartType: string
  ): ChartDataPoint[] {
    switch (chartType) {
      case 'bar':
        return interactions.topTopics.slice(0, 5).map(topic => ({
          label: topic.topic,
          value: topic.count,
          color: '#06B6D4',
        }));
      case 'line':
        return interactions.emotionalTrends.map(trend => ({
          label: trend.date,
          value: trend.averageMood * 100,
          color: '#EC4899',
        }));
      default:
        return [];
    }
  }

  private async getMetricValueAtTime(metric: string, timestamp: Date): Promise<number> {
    // Mock implementation - would query historical data
    return Math.floor(Math.random() * 100) + 50;
  }

  private getDefaultTimeRange(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    return { start, end };
  }

  private getIntervalMs(interval: 'hour' | 'day' | 'week' | 'month'): number {
    switch (interval) {
      case 'hour':
        return 60 * 60 * 1000;
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  private formatTimeLabel(date: Date, interval: 'hour' | 'day' | 'week' | 'month'): string {
    switch (interval) {
      case 'hour':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'day':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      case 'week':
        return `Week of ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
      case 'month':
        return date.toLocaleDateString([], { year: 'numeric', month: 'long' });
      default:
        return date.toLocaleDateString();
    }
  }

  private getMemoryTypeColor(type: string): string {
    const colors: Record<string, string> = {
      personal: '#3B82F6',
      experience: '#10B981',
      relationship: '#F59E0B',
      knowledge: '#8B5CF6',
      shared_experience: '#EC4899',
    };
    return colors[type] || '#6B7280';
  }

  /**
   * Clear analytics cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; totalEntries: number } {
    return {
      size: this.cache.size,
      totalEntries: this.cache.size,
    };
  }
}

// Global analytics system instance
export const analyticsSystem = new AnalyticsSystem();
