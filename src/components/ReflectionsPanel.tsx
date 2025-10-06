'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { reflectionSystem, Reflection, DreamState } from '@/lib/reflectionSystem';
import { Brain, Moon, Sparkles, Heart, TrendingUp, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ReflectionsPanelProps {
  companionId?: string;
  onClose?: () => void;
}

export function ReflectionsPanel({ companionId, onClose }: ReflectionsPanelProps) {
  const { state } = useApp();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [dreams, setDreams] = useState<DreamState[]>([]);
  const [activeTab, setActiveTab] = useState<'reflections' | 'dreams'>('reflections');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadReflections();
    loadDreams();
  }, [companionId]);

  const loadReflections = async () => {
    if (!companionId) return;
    try {
      const data = await reflectionSystem.getReflections(companionId);
      setReflections(data);
    } catch (error) {
      console.error('Failed to load reflections:', error);
    }
  };

  const loadDreams = async () => {
    if (!companionId) return;
    try {
      const data = await reflectionSystem.getDreams(companionId);
      setDreams(data);
    } catch (error) {
      console.error('Failed to load dreams:', error);
    }
  };

  const generateReflection = async (type: 'daily' | 'weekly' | 'introspection') => {
    if (!companionId) return;

    setGenerating(true);
    try {
      // Get recent conversation history
      const recentConversations = state.messages.slice(-20); // Last 20 messages

      // Get current emotional state
      const emotionalState = { mood: 0, energy: 0.5, trust: 0.5, curiosity: 0.5 }; // Mock for now

      const reflection = await reflectionSystem.generateReflection(
        companionId,
        type,
        recentConversations,
        emotionalState
      );

      setReflections(prev => [reflection, ...prev]);
    } catch (error) {
      console.error('Failed to generate reflection:', error);
    } finally {
      setGenerating(false);
    }
  };

  const generateDream = async () => {
    if (!companionId) return;

    setGenerating(true);
    try {
      // Get user memories (mock for now)
      const userMemories: any[] = [];
      const emotionalState = { mood: 0, energy: 0.3, trust: 0.5, curiosity: 0.7 };

      const dream = await reflectionSystem.generateDream(companionId, userMemories, emotionalState);
      setDreams(prev => [dream, ...prev]);
    } catch (error) {
      console.error('Failed to generate dream:', error);
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReflectionIcon = (type: string) => {
    switch (type) {
      case 'daily': return '🌅';
      case 'weekly': return '📅';
      case 'dream': return '🌙';
      case 'introspection': return '🤔';
      default: return '💭';
    }
  };

  const getReflectionColor = (type: string) => {
    switch (type) {
      case 'daily': return 'border-blue-500/30 bg-blue-500/10';
      case 'weekly': return 'border-purple-500/30 bg-purple-500/10';
      case 'dream': return 'border-indigo-500/30 bg-indigo-500/10';
      case 'introspection': return 'border-green-500/30 bg-green-500/10';
      default: return 'border-gray-500/30 bg-gray-500/10';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <Brain className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">AI Reflections</h2>
        </div>
        {onClose && (
          <Button onClick={onClose} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            ✕
          </Button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('reflections')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'reflections'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 inline mr-2" />
          Reflections
        </button>
        <button
          onClick={() => setActiveTab('dreams')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'dreams'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Moon className="w-4 h-4 inline mr-2" />
          Dreams
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'reflections' ? (
          <div className="space-y-4">
            {/* Generate Reflection Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => generateReflection('daily')}
                disabled={generating}
                className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : '🌅'}
                Daily Reflection
              </Button>
              <Button
                onClick={() => generateReflection('weekly')}
                disabled={generating}
                className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : '📅'}
                Weekly Reflection
              </Button>
              <Button
                onClick={() => generateReflection('introspection')}
                disabled={generating}
                className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/30"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : '🤔'}
                Deep Introspection
              </Button>
              <Button
                onClick={generateDream}
                disabled={generating}
                className="bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : '🌙'}
                Dream State
              </Button>
            </div>

            {/* Reflections List */}
            <div className="space-y-3">
              {reflections.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No reflections yet</p>
                  <p className="text-sm mt-2">Generate your first reflection to see the AI's thoughts</p>
                </div>
              ) : (
                reflections.map((reflection) => (
                  <div
                    key={reflection.id}
                    className={`p-4 rounded-lg border backdrop-blur-sm ${getReflectionColor(reflection.type)}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getReflectionIcon(reflection.type)}</span>
                        <div>
                          <h3 className="font-medium text-white capitalize">
                            {reflection.type} Reflection
                          </h3>
                          <p className="text-xs text-gray-400">
                            {formatDate(reflection.timestamp)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 px-2 py-1 bg-white/10 rounded">
                        {reflection.triggerReason}
                      </span>
                    </div>

                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 text-gray-300">{children}</p>,
                          strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                          ul: ({ children }) => <ul className="mb-2 text-gray-300">{children}</ul>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                        }}
                      >
                        {reflection.content}
                      </ReactMarkdown>
                    </div>

                    {/* Insights */}
                    {reflection.insights.length > 0 && (
                      <div className="mt-3 p-3 bg-white/5 rounded border border-white/10">
                        <h4 className="text-sm font-medium text-white mb-2 flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          Key Insights
                        </h4>
                        <ul className="text-sm text-gray-300 space-y-1">
                          {reflection.insights.map((insight, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-purple-400 mr-2">•</span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Emotional Patterns */}
                    {reflection.emotionalPatterns && (
                      <div className="mt-3 p-3 bg-white/5 rounded border border-white/10">
                        <h4 className="text-sm font-medium text-white mb-2 flex items-center">
                          <Heart className="w-4 h-4 mr-1" />
                          Emotional State
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>Mood: <span className="text-gray-300">
                            {reflection.emotionalPatterns.mood > 0 ? 'Positive' :
                             reflection.emotionalPatterns.mood < 0 ? 'Contemplative' : 'Neutral'}
                          </span></div>
                          <div>Energy: <span className="text-gray-300">
                            {reflection.emotionalPatterns.energy > 0.7 ? 'High' :
                             reflection.emotionalPatterns.energy > 0.3 ? 'Moderate' : 'Low'}
                          </span></div>
                          <div>Trust: <span className="text-gray-300">
                            {Math.round(reflection.emotionalPatterns.trust * 100)}%
                          </span></div>
                          <div>Curiosity: <span className="text-gray-300">
                            {Math.round(reflection.emotionalPatterns.curiosity * 100)}%
                          </span></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Generate Dream Button */}
            <Button
              onClick={generateDream}
              disabled={generating}
              className="w-full bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30"
            >
              {generating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
              Generate Dream State
            </Button>

            {/* Dreams List */}
            <div className="space-y-3">
              {dreams.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Moon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No dreams yet</p>
                  <p className="text-sm mt-2">Dreams appear during the AI's rest cycles</p>
                </div>
              ) : (
                dreams.map((dream) => (
                  <div
                    key={dream.id}
                    className="p-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-sm"
                  >
                    <div className="flex items-center space-x-2 mb-3">
                      <Moon className="w-5 h-5 text-indigo-400" />
                      <h3 className="font-medium text-white">Dream State</h3>
                      <span className="text-xs text-gray-400">
                        {formatDate(dream.timestamp)}
                      </span>
                    </div>

                    <div className="prose prose-sm prose-invert max-w-none mb-3">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 text-gray-300">{children}</p>,
                          strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                        }}
                      >
                        {dream.dreamContent}
                      </ReactMarkdown>
                    </div>

                    {/* Symbolism */}
                    {dream.symbolism.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-white mb-2">Dream Symbols</h4>
                        <div className="flex flex-wrap gap-2">
                          {dream.symbolism.map((symbol, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs"
                            >
                              {symbol.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Memory Connections */}
                    {dream.connections.length > 0 && (
                      <div className="p-3 bg-white/5 rounded border border-white/10">
                        <h4 className="text-sm font-medium text-white mb-2">Memory Connections</h4>
                        <ul className="text-sm text-gray-300 space-y-1">
                          {dream.connections.map((connection, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-indigo-400 mr-2">•</span>
                              {connection}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}