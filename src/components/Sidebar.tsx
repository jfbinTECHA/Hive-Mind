'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { ModelManager } from '@/components/ModelManager';
import { CompanionMap } from '@/components/CompanionMap';
import { ThemeCustomizer } from '@/components/ThemeCustomizer';
import { ReflectionsPanel } from '@/components/ReflectionsPanel';
import { EvolutionPanel } from '@/components/EvolutionPanel';
import { SharedMemoryPanel } from '@/components/SharedMemoryPanel';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { PluginManager } from '@/components/PluginManager';
import { Users, Plus, Brain, Settings, MessageSquare, Cpu, Database, Palette, Sparkles, Star, Share2, BarChart3, Puzzle } from 'lucide-react';
import Link from 'next/link';

interface SidebarProps {
  onProfileClick: () => void;
  onMemoryClick: () => void;
}

export function Sidebar({ onProfileClick, onMemoryClick }: SidebarProps) {
  const { state, dispatch } = useApp();
  const [showModelManager, setShowModelManager] = useState(false);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [showReflectionsPanel, setShowReflectionsPanel] = useState(false);
  const [showEvolutionPanel, setShowEvolutionPanel] = useState(false);
  const [showSharedMemoryPanel, setShowSharedMemoryPanel] = useState(false);
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false);
  const [showPluginManager, setShowPluginManager] = useState(false);

  const addCompanion = async () => {
    const name = prompt('Enter companion name:');
    const personality = prompt('Choose personality (friendly, professional, humorous, serious):', 'friendly');

    if (name && personality) {
      try {
        const response = await fetch('/api/character', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            personality,
            avatar: '🤖',
            description: `A ${personality} AI companion`,
            traits: [personality]
          }),
        });

        if (response.ok) {
          const data = await response.json();
          dispatch({ type: 'ADD_COMPANION', payload: data.character });
        } else {
          console.error('Failed to create companion');
        }
      } catch (error) {
        console.error('Error creating companion:', error);
        // Fallback to local creation
        const newCompanion = {
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          personality: personality as any,
          avatar: '🤖',
          description: `A ${personality} AI companion`,
          traits: [personality],
          emotion: 'neutral' as const,
          memory: {
            facts: {},
            conversations: [],
            familiarity: 0
          }
        };
        dispatch({ type: 'ADD_COMPANION', payload: newCompanion });
      }
    }
  };

  const toggleGroupChat = () => {
    dispatch({ type: 'TOGGLE_GROUP_CHAT' });
  };

  return (
    <div className="w-64 backdrop-blur-xl bg-white/5 border-r border-white/10 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white flex items-center mb-3">
          <Brain className="w-5 h-5 mr-2" />
          AI Companions
        </h2>
        <div className="flex justify-center">
          <CompanionMap />
        </div>
      </div>

      {/* Companion List */}
      <div className="flex-1 p-4 space-y-2">
        {state.companions.map((companion) => (
          <div
            key={companion.id}
            onClick={() => dispatch({ type: 'SET_ACTIVE_COMPANION', payload: companion.id })}
            className={`p-3 rounded-lg cursor-pointer transition-all ${
              state.activeCompanion === companion.id && !state.groupChatMode
                ? 'bg-purple-500/20 border border-purple-500/50'
                : 'hover:bg-white/5'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{companion.avatar}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {companion.name}
                </p>
                <p className="text-xs text-gray-400 capitalize">
                  {companion.personality}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <Button
          onClick={addCompanion}
          className="w-full justify-start bg-white/10 hover:bg-white/20 text-white"
          variant="ghost"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Companion
        </Button>

        <Button
          onClick={toggleGroupChat}
          className={`w-full justify-start ${
            state.groupChatMode
              ? 'bg-purple-500/20 border border-purple-500/50'
              : 'bg-white/10 hover:bg-white/20'
          } text-white`}
          variant="ghost"
        >
          <Users className="w-4 h-4 mr-2" />
          {state.groupChatMode ? 'Group Chat' : 'Single Chat'}
        </Button>

        <Link href="/memory" className="w-full">
          <Button
            className="w-full justify-start bg-white/10 hover:bg-white/20 text-white"
            variant="ghost"
          >
            <Database className="w-4 h-4 mr-2" />
            Memory Inspector
          </Button>
        </Link>

        <Button
          onClick={() => setShowReflectionsPanel(true)}
          className="w-full justify-start bg-white/10 hover:bg-white/20 text-white"
          variant="ghost"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          AI Reflections
        </Button>

        <Button
          onClick={() => setShowEvolutionPanel(true)}
          className="w-full justify-start bg-white/10 hover:bg-white/20 text-white"
          variant="ghost"
        >
          <Star className="w-4 h-4 mr-2" />
          Companion Evolution
        </Button>

        <Button
          onClick={() => setShowSharedMemoryPanel(true)}
          className="w-full justify-start bg-white/10 hover:bg-white/20 text-white"
          variant="ghost"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Shared Memories
        </Button>

        <Button
          onClick={() => setShowAnalyticsDashboard(true)}
          className="w-full justify-start bg-white/10 hover:bg-white/20 text-white"
          variant="ghost"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Analytics
        </Button>

        <Button
          onClick={() => setShowPluginManager(true)}
          className="w-full justify-start bg-white/10 hover:bg-white/20 text-white"
          variant="ghost"
        >
          <Puzzle className="w-4 h-4 mr-2" />
          Plugins
        </Button>

        <Button
          onClick={() => setShowModelManager(true)}
          className="w-full justify-start bg-white/10 hover:bg-white/20 text-white"
          variant="ghost"
        >
          <Cpu className="w-4 h-4 mr-2" />
          AI Models
        </Button>

        <Button
          onClick={() => setShowThemeCustomizer(true)}
          className="w-full justify-start bg-white/10 hover:bg-white/20 text-white"
          variant="ghost"
        >
          <Palette className="w-4 h-4 mr-2" />
          Theme Customizer
        </Button>

        <Button
          onClick={onProfileClick}
          className="w-full justify-start bg-white/10 hover:bg-white/20 text-white"
          variant="ghost"
        >
          <Settings className="w-4 h-4 mr-2" />
          Profile Settings
        </Button>
      </div>

      {/* Model Manager Modal */}
      {showModelManager && (
        <ModelManager onClose={() => setShowModelManager(false)} />
      )}

      {/* Theme Customizer Panel */}
      {showThemeCustomizer && (
        <ThemeCustomizer onClose={() => setShowThemeCustomizer(false)} />
      )}

      {/* Reflections Panel */}
      {showReflectionsPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl h-3/4">
            <ReflectionsPanel
              companionId={state.activeCompanion || undefined}
              onClose={() => setShowReflectionsPanel(false)}
            />
          </div>
        </div>
      )}

      {/* Evolution Panel */}
      {showEvolutionPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl h-3/4">
            <EvolutionPanel
              companionId={state.activeCompanion || undefined}
              onClose={() => setShowEvolutionPanel(false)}
            />
          </div>
        </div>
      )}

      {/* Shared Memory Panel */}
      {showSharedMemoryPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl h-3/4">
            <SharedMemoryPanel
              companionId={state.activeCompanion || undefined}
              onClose={() => setShowSharedMemoryPanel(false)}
            />
          </div>
        </div>
      )}

      {/* Analytics Dashboard */}
      {showAnalyticsDashboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-6xl h-5/6">
            <AnalyticsDashboard
              onClose={() => setShowAnalyticsDashboard(false)}
            />
          </div>
        </div>
      )}

      {/* Plugin Manager */}
      {showPluginManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-7xl h-5/6">
            <PluginManager
              onClose={() => setShowPluginManager(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}