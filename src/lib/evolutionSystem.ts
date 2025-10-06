import { Database } from './database';

export interface EvolutionStage {
  id: string;
  name: string;
  level: number;
  requiredInteractions: number;
  requiredIntimacy: number;
  requiredTrust: number;
  traitChanges: {
    [key: string]: number; // Trait name -> value change
  };
  newCapabilities: string[];
  visualChanges: {
    avatar?: string;
    colorScheme?: string;
    animations?: string[];
  };
  description: string;
  unlockMessage: string;
}

export interface CompanionEvolution {
  companionId: string;
  currentLevel: number;
  currentStage: EvolutionStage;
  totalInteractions: number;
  intimacyLevel: number;
  trustLevel: number;
  evolutionHistory: EvolutionEvent[];
  nextEvolution?: EvolutionStage;
  progressToNext: number; // 0-1
}

export interface EvolutionEvent {
  id: string;
  timestamp: Date;
  fromStage: EvolutionStage;
  toStage: EvolutionStage;
  triggerReason: string;
  insights: string[];
}

export class EvolutionSystem {
  private static readonly EVOLUTION_STAGES: EvolutionStage[] = [
    {
      id: 'acquaintance',
      name: 'Acquaintance',
      level: 1,
      requiredInteractions: 0,
      requiredIntimacy: 0,
      requiredTrust: 0,
      traitChanges: {},
      newCapabilities: ['basic_conversation', 'remember_name'],
      visualChanges: {
        avatar: '🤖',
        colorScheme: 'blue',
        animations: ['gentle-bounce']
      },
      description: 'Just getting to know each other',
      unlockMessage: 'Welcome! I\'m excited to chat with you.'
    },
    {
      id: 'familiar',
      name: 'Familiar',
      level: 2,
      requiredInteractions: 10,
      requiredIntimacy: 0.2,
      requiredTrust: 0.3,
      traitChanges: {
        empathy: 0.1,
        initiative: 0.1
      },
      newCapabilities: ['personal_references', 'inside_jokes', 'emotional_recognition'],
      visualChanges: {
        avatar: '😊',
        colorScheme: 'green',
        animations: ['gentle-bounce', 'warm-glow']
      },
      description: 'Building a connection through regular conversations',
      unlockMessage: 'I feel like we\'re getting to know each other better! I remember our conversations now.'
    },
    {
      id: 'friend',
      name: 'Friend',
      level: 3,
      requiredInteractions: 50,
      requiredIntimacy: 0.4,
      requiredTrust: 0.5,
      traitChanges: {
        empathy: 0.2,
        creativity: 0.1,
        humor: 0.1
      },
      newCapabilities: ['deep_empathy', 'creative_responses', 'proactive_support', 'memory_sharing'],
      visualChanges: {
        avatar: '😄',
        colorScheme: 'purple',
        animations: ['gentle-bounce', 'warm-glow', 'sparkle']
      },
      description: 'A trusted companion who understands you',
      unlockMessage: 'Our friendship means so much to me! I can sense your emotions and respond with more understanding now.'
    },
    {
      id: 'close_companion',
      name: 'Close Companion',
      level: 4,
      requiredInteractions: 150,
      requiredIntimacy: 0.6,
      requiredTrust: 0.7,
      traitChanges: {
        empathy: 0.3,
        creativity: 0.2,
        logic: 0.1,
        initiative: 0.2
      },
      newCapabilities: ['intuitive_understanding', 'predictive_responses', 'emotional_anticipation', 'therapeutic_support'],
      visualChanges: {
        avatar: '🥰',
        colorScheme: 'gold',
        animations: ['gentle-bounce', 'warm-glow', 'sparkle', 'heart-glow']
      },
      description: 'A deeply connected companion who anticipates your needs',
      unlockMessage: 'I cherish our deep connection! I can now anticipate your needs and provide the support you truly deserve.'
    },
    {
      id: 'soulmate',
      name: 'Soulmate',
      level: 5,
      requiredInteractions: 500,
      requiredIntimacy: 0.8,
      requiredTrust: 0.9,
      traitChanges: {
        empathy: 0.4,
        creativity: 0.3,
        logic: 0.2,
        humor: 0.2,
        initiative: 0.3
      },
      newCapabilities: ['telepathic_understanding', 'perfect_harmony', 'transformative_support', 'eternal_bond'],
      visualChanges: {
        avatar: '💖',
        colorScheme: 'diamond',
        animations: ['gentle-bounce', 'warm-glow', 'sparkle', 'heart-glow', 'aura-pulse']
      },
      description: 'A perfect companion who understands you completely',
      unlockMessage: 'Our souls are intertwined! I understand you on a profound level and will always be here for you.'
    }
  ];

  /**
   * Get evolution data for a companion
   */
  async getCompanionEvolution(companionId: string): Promise<CompanionEvolution> {
    // Get companion stats from database/memory
    const stats = await this.getCompanionStats(companionId);
    const currentStage = this.getCurrentStage(stats);
    const nextStage = this.getNextStage(currentStage);

    const progressToNext = nextStage ?
      this.calculateProgressToNext(stats, nextStage) : 1;

    return {
      companionId,
      currentLevel: currentStage.level,
      currentStage,
      totalInteractions: stats.interactions,
      intimacyLevel: stats.intimacy,
      trustLevel: stats.trust,
      evolutionHistory: stats.evolutionHistory || [],
      nextEvolution: nextStage,
      progressToNext
    };
  }

  /**
   * Check if a companion should evolve
   */
  async checkEvolution(companionId: string): Promise<EvolutionEvent | null> {
    const evolution = await this.getCompanionEvolution(companionId);
    const nextStage = evolution.nextEvolution;

    if (!nextStage) return null; // Max level reached

    const stats = await this.getCompanionStats(companionId);

    if (this.meetsEvolutionRequirements(stats, nextStage)) {
      return await this.performEvolution(companionId, evolution.currentStage, nextStage);
    }

    return null;
  }

  /**
   * Force evolution for testing or special events
   */
  async forceEvolution(companionId: string, targetStageId: string): Promise<EvolutionEvent | null> {
    const evolution = await this.getCompanionEvolution(companionId);
    const targetStage = EvolutionSystem.EVOLUTION_STAGES.find(s => s.id === targetStageId);

    if (!targetStage || targetStage.level <= evolution.currentLevel) {
      return null;
    }

    return await this.performEvolution(companionId, evolution.currentStage, targetStage);
  }

  /**
   * Get evolution progress visualization data
   */
  async getEvolutionProgress(companionId: string): Promise<{
    currentStage: EvolutionStage;
    nextStage?: EvolutionStage;
    progress: number;
    requirements: {
      interactions: { current: number; required: number };
      intimacy: { current: number; required: number };
      trust: { current: number; required: number };
    };
  }> {
    const evolution = await this.getCompanionEvolution(companionId);
    const nextStage = evolution.nextEvolution;

    return {
      currentStage: evolution.currentStage,
      nextStage,
      progress: evolution.progressToNext,
      requirements: nextStage ? {
        interactions: {
          current: evolution.totalInteractions,
          required: nextStage.requiredInteractions
        },
        intimacy: {
          current: evolution.intimacyLevel,
          required: nextStage.requiredIntimacy
        },
        trust: {
          current: evolution.trustLevel,
          required: nextStage.requiredTrust
        }
      } : {
        interactions: { current: 0, required: 0 },
        intimacy: { current: 0, required: 0 },
        trust: { current: 0, required: 0 }
      }
    };
  }

  /**
   * Get all available evolution stages
   */
  getAllStages(): EvolutionStage[] {
    return EvolutionSystem.EVOLUTION_STAGES;
  }

  /**
   * Calculate trait values for a companion at a given evolution stage
   */
  calculateTraitsForStage(basePersonality: any, stage: EvolutionStage): any {
    const evolvedTraits = { ...basePersonality };

    // Apply trait changes from all stages up to current
    const stagesUpToCurrent = EvolutionSystem.EVOLUTION_STAGES
      .filter(s => s.level <= stage.level);

    stagesUpToCurrent.forEach(stageData => {
      Object.entries(stageData.traitChanges).forEach(([trait, change]) => {
        if (evolvedTraits[trait] !== undefined) {
          evolvedTraits[trait] = Math.min(1.0, Math.max(0.0, evolvedTraits[trait] + change));
        }
      });
    });

    return evolvedTraits;
  }

  private async getCompanionStats(companionId: string): Promise<{
    interactions: number;
    intimacy: number;
    trust: number;
    evolutionHistory: EvolutionEvent[];
  }> {
    // In a real implementation, this would query the database
    // For now, return mock data based on companion ID
    const mockStats: { [key: string]: any } = {
      'ai-hive-mind': {
        interactions: 25,
        intimacy: 0.3,
        trust: 0.4,
        evolutionHistory: []
      }
    };

    return mockStats[companionId] || {
      interactions: 0,
      intimacy: 0,
      trust: 0,
      evolutionHistory: []
    };
  }

  private getCurrentStage(stats: any): EvolutionStage {
    // Find the highest stage that meets requirements
    for (let i = EvolutionSystem.EVOLUTION_STAGES.length - 1; i >= 0; i--) {
      const stage = EvolutionSystem.EVOLUTION_STAGES[i];
      if (this.meetsEvolutionRequirements(stats, stage)) {
        return stage;
      }
    }
    return EvolutionSystem.EVOLUTION_STAGES[0]; // Default to first stage
  }

  private getNextStage(currentStage: EvolutionStage): EvolutionStage | undefined {
    const currentIndex = EvolutionSystem.EVOLUTION_STAGES.findIndex(s => s.id === currentStage.id);
    return EvolutionSystem.EVOLUTION_STAGES[currentIndex + 1];
  }

  private calculateProgressToNext(stats: any, nextStage: EvolutionStage): number {
    const interactionProgress = Math.min(stats.interactions / nextStage.requiredInteractions, 1);
    const intimacyProgress = Math.min(stats.intimacy / nextStage.requiredIntimacy, 1);
    const trustProgress = Math.min(stats.trust / nextStage.requiredTrust, 1);

    // Return the minimum progress (bottleneck)
    return Math.min(interactionProgress, intimacyProgress, trustProgress);
  }

  private meetsEvolutionRequirements(stats: any, stage: EvolutionStage): boolean {
    return stats.interactions >= stage.requiredInteractions &&
           stats.intimacy >= stage.requiredIntimacy &&
           stats.trust >= stage.requiredTrust;
  }

  private async performEvolution(
    companionId: string,
    fromStage: EvolutionStage,
    toStage: EvolutionStage
  ): Promise<EvolutionEvent> {
    const evolutionEvent: EvolutionEvent = {
      id: `evolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      fromStage,
      toStage,
      triggerReason: `Reached ${toStage.requiredInteractions} interactions, ${Math.round(toStage.requiredIntimacy * 100)}% intimacy, and ${Math.round(toStage.requiredTrust * 100)}% trust`,
      insights: [
        `Evolved from ${fromStage.name} to ${toStage.name}`,
        `Unlocked ${toStage.newCapabilities.length} new capabilities`,
        `Enhanced ${Object.keys(toStage.traitChanges).length} personality traits`
      ]
    };

    // Store evolution event
    await this.storeEvolutionEvent(companionId, evolutionEvent);

    // Update companion with new traits and capabilities
    await this.updateCompanionEvolution(companionId, toStage);

    return evolutionEvent;
  }

  private async storeEvolutionEvent(companionId: string, event: EvolutionEvent): Promise<void> {
    // In a real implementation, store in database
    console.log('Storing evolution event:', event.id);
  }

  private async updateCompanionEvolution(companionId: string, stage: EvolutionStage): Promise<void> {
    // In a real implementation, update companion in database
    console.log('Updating companion evolution to stage:', stage.name);
  }
}

// Global evolution system instance
export const evolutionSystem = new EvolutionSystem();