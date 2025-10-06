'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { analyticsSystem, AnalyticsData, ChartDataPoint, TimeSeriesData } from '@/lib/analyticsSystem';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  Brain,
  MessageSquare,
  Users,
  Clock,
  HardDrive,
  Zap,
  Heart,
  Target,
  Calendar,
  RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AnalyticsDashboardProps {
  onClose?: () => void;
}

export function AnalyticsDashboard({ onClose }: AnalyticsDashboardProps) {
  const { state } = useApp();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'memory' | 'interactions'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const range = getTimeRangeFromPreset(timeRange);
      const data = await analyticsSystem.getAnalytics(range);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeFromPreset = (preset: string) => {
    const now = new Date();
    const start = new Date();

    switch (preset) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setDate(now.getDate() - 30);
    }

    return { start, end: now };
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else if (seconds < 3600) {
      return `${(seconds / 60).toFixed(1)}m`;
    } else {
      return `${(seconds / 3600).toFixed(1)}h`;
    }
  };

  const getSentimentColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-blue-400';
    if (score >= 0.4) return 'text-yellow-400';
    return 'text-red-400';
  };

  const renderChart = (data: ChartDataPoint[], type: 'bar' | 'pie' | 'line' = 'bar') => {
    if (type === 'bar') {
      const maxValue = Math.max(...data.map(d => d.value));
      return (
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-32 text-sm text-gray-300 truncate">{item.label}</div>
              <div className="flex-1">
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: item.color || '#3B82F6'
                    }}
                  ></div>
                </div>
              </div>
              <div className="w-16 text-right text-sm text-white font-medium">
                {formatNumber(item.value)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (type === 'pie') {
      const total = data.reduce((sum, item) => sum + item.value, 0);
      let currentAngle = 0;

      return (
        <div className="flex items-center space-x-6">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {data.map((item, index) => {
                const percentage = (item.value / total) * 100;
                const angle = (percentage / 100) * 360;
                const startAngle = currentAngle;
                currentAngle += angle;

                const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180);
                const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180);

                const largeArcFlag = angle > 180 ? 1 : 0;

                return (
                  <path
                    key={index}
                    d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                    fill={item.color || '#3B82F6'}
                  />
                );
              })}
            </svg>
          </div>
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color || '#3B82F6' }}
                ></div>
                <span className="text-sm text-gray-300">{item.label}</span>
                <span className="text-sm text-white font-medium">
                  {formatNumber(item.value)} ({((item.value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-white">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg">
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Failed to load analytics data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Analytics Dashboard</h2>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'usage'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          Usage
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'memory'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Brain className="w-4 h-4 inline mr-2" />
          Memory
        </button>
        <button
          onClick={() => setActiveTab('interactions')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'interactions'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Interactions
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-gray-400">Total Messages</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(analytics.usage.totalMessages)}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-gray-400">Active Companions</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {analytics.usage.activeCompanions}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-center space-x-2 mb-2">
                  <HardDrive className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-gray-400">Memory Size</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatBytes(analytics.memory.totalMemorySize)}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-5 h-5 text-orange-400" />
                  <span className="text-sm text-gray-400">Avg Session</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {analytics.usage.averageSessionLength.toFixed(1)}m
                </div>
              </div>
            </div>

            {/* Charts Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Usage Breakdown */}
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h3 className="text-lg font-semibold text-white mb-4">Usage Breakdown</h3>
                {renderChart([
                  { label: 'Messages', value: analytics.usage.totalMessages, color: '#3B82F6' },
                  { label: 'Interactions', value: analytics.usage.totalInteractions, color: '#10B981' },
                  { label: 'Voice', value: analytics.usage.totalVoiceInteractions, color: '#F59E0B' },
                  { label: 'Memory Ops', value: analytics.usage.totalMemoryOperations, color: '#EF4444' }
                ], 'bar')}
              </div>

              {/* Memory Types */}
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h3 className="text-lg font-semibold text-white mb-4">Memory Types</h3>
                {renderChart(
                  Object.entries(analytics.memory.memoriesByType).map(([type, count]) => ({
                    label: type.replace('_', ' '),
                    value: count,
                    color: type === 'personal' ? '#3B82F6' :
                           type === 'experience' ? '#10B981' :
                           type === 'relationship' ? '#F59E0B' :
                           type === 'knowledge' ? '#8B5CF6' : '#EC4899'
                  })),
                  'pie'
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="p-4 rounded-lg border border-white/10 bg-white/5">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Insights</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded border border-blue-500/20">
                  <div className="flex items-center space-x-3">
                    <Target className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-white font-medium">Most Active Companion</p>
                      <p className="text-sm text-gray-400">Companion {analytics.interactions.mostActiveCompanion.split('-')[1]}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{analytics.interactions.companionInteractions[0]?.interactionCount || 0}</p>
                    <p className="text-xs text-gray-400">interactions</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded border border-green-500/20">
                  <div className="flex items-center space-x-3">
                    <Zap className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-white font-medium">Top Topic</p>
                      <p className="text-sm text-gray-400">{analytics.interactions.topTopics[0]?.topic}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{analytics.interactions.topTopics[0]?.count}</p>
                    <p className="text-xs text-gray-400">discussions</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded border border-purple-500/20">
                  <div className="flex items-center space-x-3">
                    <Heart className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-white font-medium">Memory Growth</p>
                      <p className="text-sm text-gray-400">Daily average</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">+{analytics.memory.memoryGrowthRate.toFixed(1)}</p>
                    <p className="text-xs text-gray-400">per day</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'usage' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium text-white mb-2">Total Interactions</h4>
                <div className="text-3xl font-bold text-blue-400">{formatNumber(analytics.usage.totalInteractions)}</div>
              </div>
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium text-white mb-2">Voice Interactions</h4>
                <div className="text-3xl font-bold text-orange-400">{formatNumber(analytics.usage.totalVoiceInteractions)}</div>
              </div>
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium text-white mb-2">Evolution Events</h4>
                <div className="text-3xl font-bold text-purple-400">{analytics.usage.totalEvolutionEvents}</div>
              </div>
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium text-white mb-2">Active Companions</h4>
                <div className="text-3xl font-bold text-green-400">{analytics.usage.activeCompanions}</div>
              </div>
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium text-white mb-2">Retention Rate</h4>
                <div className="text-3xl font-bold text-cyan-400">{(analytics.usage.retentionRate * 100).toFixed(1)}%</div>
              </div>
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium text-white mb-2">Peak Usage Hour</h4>
                <div className="text-3xl font-bold text-pink-400">{analytics.usage.peakUsageHour}:00</div>
              </div>
            </div>
          </div>
        ) : activeTab === 'memory' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium text-white mb-2">Total Memories</h4>
                <div className="text-3xl font-bold text-blue-400">{formatNumber(analytics.memory.totalMemories)}</div>
              </div>
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium text-white mb-2">Memory Size</h4>
                <div className="text-3xl font-bold text-purple-400">{formatBytes(analytics.memory.totalMemorySize)}</div>
              </div>
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium text-white mb-2">Shared Memories</h4>
                <div className="text-3xl font-bold text-green-400">{analytics.memory.sharedMemoriesCount}</div>
              </div>
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium text-white mb-2">Growth Rate</h4>
                <div className="text-3xl font-bold text-orange-400">+{analytics.memory.memoryGrowthRate.toFixed(1)}/day</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h3 className="text-lg font-semibold text-white mb-4">Memories by Type</h3>
                {renderChart(
                  Object.entries(analytics.memory.memoriesByType).map(([type, count]) => ({
                    label: type.replace('_', ' '),
                    value: count,
                    color: type === 'personal' ? '#3B82F6' :
                           type === 'experience' ? '#10B981' :
                           type === 'relationship' ? '#F59E0B' :
                           type === 'knowledge' ? '#8B5CF6' : '#EC4899'
                  })),
                  'pie'
                )}
              </div>

              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h3 className="text-lg font-semibold text-white mb-4">Memories by Companion</h3>
                {renderChart(
                  Object.entries(analytics.memory.memoriesByCompanion).map(([companion, count]) => ({
                    label: `Companion ${companion.split('-')[1]}`,
                    value: count,
                    color: '#8B5CF6'
                  })),
                  'bar'
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium text-white mb-2">Avg Conversation Length</h4>
                <div className="text-3xl font-bold text-blue-400">{analytics.interactions.conversationLengths.average.toFixed(1)}</div>
                <p className="text-xs text-gray-400">messages</p>
              </div>
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium text-white mb-2">Avg Response Time</h4>
                <div className="text-3xl font-bold text-green-400">{formatDuration(analytics.interactions.responseTimes.average)}</div>
              </div>
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="font-medium text-white mb-2">Top Topic</h4>
                <div className="text-lg font-bold text-purple-400">{analytics.interactions.topTopics[0]?.topic}</div>
                <p className="text-xs text-gray-400">{analytics.interactions.topTopics[0]?.count} discussions</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h3 className="text-lg font-semibold text-white mb-4">Top Topics</h3>
                {renderChart(
                  analytics.interactions.topTopics.slice(0, 5).map(topic => ({
                    label: topic.topic,
                    value: topic.count,
                    color: '#06B6D4'
                  })),
                  'bar'
                )}
              </div>

              <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                <h3 className="text-lg font-semibold text-white mb-4">Companion Performance</h3>
                <div className="space-y-3">
                  {analytics.interactions.companionInteractions.map((companion, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded">
                      <div>
                        <p className="text-white font-medium">Companion {companion.companionId.split('-')[1]}</p>
                        <p className="text-xs text-gray-400">{companion.interactionCount} interactions</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${getSentimentColor(companion.satisfactionScore)}`}>
                          {(companion.satisfactionScore * 100).toFixed(0)}% satisfaction
                        </p>
                        <p className="text-xs text-gray-400">{formatDuration(companion.averageResponseTime)} avg response</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}