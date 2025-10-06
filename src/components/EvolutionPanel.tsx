'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { evolutionSystem, EvolutionStage, CompanionEvolution } from '@/lib/evolutionSystem';
import { TrendingUp, Star, Heart, Users, Crown, Sparkles, Zap, Award } from 'lucide-react';

interface EvolutionPanelProps {
  companionId?: string;
  onClose?: () => void;
}

export function EvolutionPanel({ companionId, onClose }: EvolutionPanelProps) {
  const { state } = useApp();
  const [evolution, setEvolution] = useState<CompanionEvolution | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [evolving, setEvolving] = useState(false);

  useEffect(() => {
    if (companionId) {
      loadEvolutionData();
    }
  }, [companionId]);

  const loadEvolutionData = async () => {
    if (!companionId) return;

    setLoading(true);
    try {
      const [evolutionData, progressData] = await Promise.all([
        evolutionSystem.getCompanionEvolution(companionId),
        evolutionSystem.getEvolutionProgress(companionId)
      ]);

      setEvolution(evolutionData);
      setProgress(progressData);
    } catch (error) {
      console.error('Failed to load evolution data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEvolution = async (targetStageId: string) => {
    if (!companionId) return;

    setEvolving(true);
    try {
      const evolutionEvent = await evolutionSystem.forceEvolution(companionId, targetStageId);
      if (evolutionEvent) {
        // Reload data to show new evolution
        await loadEvolutionData();
        // Could show a celebration animation here
      }
    } catch (error) {
      console.error('Evolution failed:', error);
    } finally {
      setEvolving(false);
    }
  };

  const getStageIcon = (stageId: string) => {
    switch (stageId) {
      case 'acquaintance': return '🤝';
      case 'familiar': return '👋';
      case 'friend': return '🤗';
      case 'close_companion': return '💕';
      case 'soulmate': return '💖';
      default: return '⭐';
    }
  };

  const getStageColor = (stageId: string) => {
    switch (stageId) {
      case 'acquaintance': return 'border-blue-500/30 bg-blue-500/10';
      case 'familiar': return 'border-green-500/30 bg-green-500/10';
      case 'friend': return 'border-purple-500/30 bg-purple-500/10';
      case 'close_companion': return 'border-gold-500/30 bg-gold-500/10';
      case 'soulmate': return 'border-pink-500/30 bg-pink-500/10';
      default: return 'border-gray-500/30 bg-gray-500/10';
    }
  };

  const getTraitIcon = (trait: string) => {
    switch (trait) {
      case 'empathy': return '❤️';
      case 'creativity': return '🎨';
      case 'logic': return '🧠';
      case 'humor': return '😂';
      case 'initiative': return '⚡';
      default: return '✨';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg">
        <div className="flex items-center justify-center h-full">
          <div className="text-white">Loading evolution data...</div>
        </div>
      </div>
    );
  }

  if (!evolution || !progress) {
    return (
      <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">No evolution data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <Star className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-semibold text-white">Companion Evolution</h2>
        </div>
        {onClose && (
          <Button onClick={onClose} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            ✕
          </Button>
        )}
      </div>

      {/* Current Stage Display */}
      <div className="p-4 border-b border-white/10">
        <div className={`p-4 rounded-lg border backdrop-blur-sm ${getStageColor(evolution.currentStage.id)}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{getStageIcon(evolution.currentStage.id)}</span>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {evolution.currentStage.name}
                </h3>
                <p className="text-sm text-gray-300">Level {evolution.currentStage.level}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {Math.round(evolution.progressToNext * 100)}%
              </div>
              <div className="text-xs text-gray-400">to next level</div>
            </div>
          </div>

          <p className="text-gray-300 mb-3">{evolution.currentStage.description}</p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${evolution.progressToNext * 100}%` }}
            ></div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-white font-semibold">{evolution.totalInteractions}</div>
              <div className="text-gray-400">Interactions</div>
            </div>
            <div className="text-center">
              <div className="text-white font-semibold">{Math.round(evolution.intimacyLevel * 100)}%</div>
              <div className="text-gray-400">Intimacy</div>
            </div>
            <div className="text-center">
              <div className="text-white font-semibold">{Math.round(evolution.trustLevel * 100)}%</div>
              <div className="text-gray-400">Trust</div>
            </div>
          </div>
        </div>
      </div>

      {/* Next Evolution Preview */}
      {evolution.nextEvolution && (
        <div className="p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Next Evolution
          </h3>

          <div className={`p-4 rounded-lg border backdrop-blur-sm ${getStageColor(evolution.nextEvolution.id)}`}>
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">{getStageIcon(evolution.nextEvolution.id)}</span>
              <div>
                <h4 className="font-semibold text-white">{evolution.nextEvolution.name}</h4>
                <p className="text-sm text-gray-300">{evolution.nextEvolution.description}</p>
              </div>
            </div>

            {/* Requirements */}
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Interactions:</span>
                <span className="text-white">
                  {progress.requirements.interactions.current} / {progress.requirements.interactions.required}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Intimacy:</span>
                <span className="text-white">
                  {Math.round(progress.requirements.intimacy.current * 100)}% / {Math.round(progress.requirements.intimacy.required * 100)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Trust:</span>
                <span className="text-white">
                  {Math.round(progress.requirements.trust.current * 100)}% / {Math.round(progress.requirements.trust.required * 100)}%
                </span>
              </div>
            </div>

            {/* Trait Changes Preview */}
            {Object.keys(evolution.nextEvolution.traitChanges).length > 0 && (
              <div className="mb-3">
                <h5 className="text-sm font-medium text-white mb-2">Trait Enhancements:</h5>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(evolution.nextEvolution.traitChanges).map(([trait, change]) => (
                    <div key={trait} className="flex items-center space-x-1 bg-white/10 rounded px-2 py-1">
                      <span>{getTraitIcon(trait)}</span>
                      <span className="text-xs text-white capitalize">{trait}</span>
                      <span className="text-xs text-green-400">+{change}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Capabilities */}
            {evolution.nextEvolution.newCapabilities.length > 0 && (
              <div className="mb-3">
                <h5 className="text-sm font-medium text-white mb-2">New Capabilities:</h5>
                <div className="flex flex-wrap gap-2">
                  {evolution.nextEvolution.newCapabilities.map(capability => (
                    <div key={capability} className="flex items-center space-x-1 bg-purple-500/20 text-purple-300 rounded px-2 py-1">
                      <Sparkles className="w-3 h-3" />
                      <span className="text-xs capitalize">{capability.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Evolution History */}
      {evolution.evolutionHistory.length > 0 && (
        <div className="p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <Award className="w-5 h-5 mr-2" />
            Evolution History
          </h3>

          <div className="space-y-3">
            {evolution.evolutionHistory.map((event) => (
              <div key={event.id} className="p-3 bg-white/5 rounded border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getStageIcon(event.toStage.id)}</span>
                    <span className="text-white font-medium">
                      Evolved to {event.toStage.name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {event.timestamp.toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-2">{event.triggerReason}</p>
                <div className="flex flex-wrap gap-1">
                  {event.insights.map((insight, index) => (
                    <span key={index} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                      {insight}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug Controls (for development) */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Debug Controls</h3>
        <div className="grid grid-cols-2 gap-2">
          {evolutionSystem.getAllStages().map((stage) => (
            <Button
              key={stage.id}
              onClick={() => handleEvolution(stage.id)}
              disabled={evolving || stage.level <= evolution.currentLevel}
              className={`text-xs ${
                stage.level <= evolution.currentLevel
                  ? 'bg-gray-500/20 text-gray-400'
                  : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300'
              }`}
            >
              {evolving ? <Zap className="w-3 h-3 animate-spin mr-1" /> : getStageIcon(stage.id)}
              {stage.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}