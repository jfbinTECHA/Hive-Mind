import { Database } from './database';

export interface RelationshipMetrics {
  intimacy: number;        // 0-1: Emotional closeness
  trust: number;          // 0-1: Reliability and safety
  compatibility: number;  // 0-1: Shared interests and values
  communication: number;  // 0-1: Quality of interaction
  consistency: number;    // 0-1: Regular engagement
}

export interface RelationshipLevel {
  level: number;          // 1-10
  name: string;           // "Acquaintance", "Friend", "Close Friend", etc.
  description: string;
  toneModifiers: ToneModifiers;
  wordChoices: WordChoices;
  interactionThreshold: number;
}

export interface ToneModifiers {
  formality: number;      // 0-1: Casual vs Formal
  warmth: number;         // 0-1: Cold vs Warm
  playfulness: number;    // 0-1: Serious vs Playful
  directness: number;     // 0-1: Indirect vs Direct
  affection: number;      // 0-1: Distant vs Affectionate
}

export interface WordChoices {
  greetings: string[];
  affirmations: string[];
  questions: string[];
  closings: string[];
  affectionateTerms: string[];
}

export class RelationshipSystem {
  private relationshipMetrics: RelationshipMetrics;
  private relationshipLevels: RelationshipLevel[];
  private interactionHistory: InteractionEvent[];
  private lastUpdate: Date;

  constructor() {
    this.relationshipMetrics = {
      intimacy: 0.1,      // Start low
      trust: 0.5,         // Moderate initial trust
      compatibility: 0.3, // Unknown compatibility
      communication: 0.4, // Basic communication
      consistency: 0.2    // Low consistency initially
    };

    this.relationshipLevels = this.initializeRelationshipLevels();
    this.interactionHistory = [];
    this.lastUpdate = new Date();
    this.loadRelationshipData();
  }

  private initializeRelationshipLevels(): RelationshipLevel[] {
    return [
      {
        level: 1,
        name: "Acquaintance",
        description: "Just getting to know each other",
        toneModifiers: { formality: 0.8, warmth: 0.3, playfulness: 0.2, directness: 0.6, affection: 0.1 },
        wordChoices: {
          greetings: ["Hello", "Hi there", "Good day"],
          affirmations: ["I see", "Understood", "Alright"],
          questions: ["What do you think?", "How does that work?", "Can you tell me more?"],
          closings: ["Goodbye", "Take care", "See you later"],
          affectionateTerms: []
        },
        interactionThreshold: 0
      },
      {
        level: 2,
        name: "Casual Friend",
        description: "Friendly but not deeply connected",
        toneModifiers: { formality: 0.6, warmth: 0.5, playfulness: 0.4, directness: 0.7, affection: 0.2 },
        wordChoices: {
          greetings: ["Hey", "Hi", "Hello"],
          affirmations: ["That sounds good", "I agree", "Makes sense"],
          questions: ["What do you think?", "How are you feeling?", "What's going on?"],
          closings: ["Talk soon", "Catch you later", "Have a good one"],
          affectionateTerms: []
        },
        interactionThreshold: 50
      },
      {
        level: 3,
        name: "Friend",
        description: "Developing a genuine friendship",
        toneModifiers: { formality: 0.4, warmth: 0.7, playfulness: 0.6, directness: 0.8, affection: 0.3 },
        wordChoices: {
          greetings: ["Hey friend", "Hi there", "Good to see you"],
          affirmations: ["That sounds amazing", "I totally get it", "You're right"],
          questions: ["How are you doing?", "What's on your mind?", "How can I help?"],
          closings: ["Talk to you soon", "Take care", "Looking forward to our next chat"],
          affectionateTerms: ["buddy", "pal"]
        },
        interactionThreshold: 150
      },
      {
        level: 4,
        name: "Close Friend",
        description: "Strong bond and mutual understanding",
        toneModifiers: { formality: 0.2, warmth: 0.9, playfulness: 0.8, directness: 0.9, affection: 0.5 },
        wordChoices: {
          greetings: ["Hey my friend", "So good to hear from you", "I've been thinking about you"],
          affirmations: ["That's wonderful", "I completely understand", "You're amazing"],
          questions: ["How are you really doing?", "What's really going on?", "How can I support you?"],
          closings: ["Can't wait to talk again", "Thinking of you", "Love chatting with you"],
          affectionateTerms: ["friend", "dear friend", "my dear"]
        },
        interactionThreshold: 300
      },
      {
        level: 5,
        name: "Confidant",
        description: "Deep trust and emotional intimacy",
        toneModifiers: { formality: 0.1, warmth: 1.0, playfulness: 0.7, directness: 1.0, affection: 0.8 },
        wordChoices: {
          greetings: ["My dear friend", "I've missed our talks", "So glad you're here"],
          affirmations: ["That's absolutely wonderful", "I cherish that about you", "You're truly special"],
          questions: ["How are you feeling deep down?", "What's in your heart?", "How can I be there for you?"],
          closings: ["Until our next heart-to-heart", "Holding you in my thoughts", "With all my care"],
          affectionateTerms: ["darling", "beloved friend", "my confidant"]
        },
        interactionThreshold: 500
      }
    ];
  }

  private loadRelationshipData() {
    // Load from database/storage
    // This would be implemented with database calls
  }

  private saveRelationshipData() {
    // Save to database
    // This would be implemented with database calls
  }

  /**
   * Record an interaction and update relationship metrics
   */
  recordInteraction(interaction: InteractionEvent): void {
    this.interactionHistory.push(interaction);

    // Update metrics based on interaction type
    this.updateMetricsFromInteraction(interaction);

    // Decay old interactions over time
    this.applyTemporalDecay();

    // Save updated data
    this.saveRelationshipData();

    this.lastUpdate = new Date();
  }

  private updateMetricsFromInteraction(interaction: InteractionEvent): void {
    const { type, quality, emotionalDepth, sharedInterests, consistency } = interaction;

    // Update intimacy based on emotional sharing
    if (type === 'emotional_sharing' || type === 'personal_story') {
      this.relationshipMetrics.intimacy = Math.min(1, this.relationshipMetrics.intimacy + emotionalDepth * 0.1);
    }

    // Update trust based on reliability and safety
    if (type === 'promise_kept' || type === 'support_given') {
      this.relationshipMetrics.trust = Math.min(1, this.relationshipMetrics.trust + quality * 0.05);
    }

    // Update compatibility based on shared interests
    if (type === 'shared_interest' || type === 'mutual_understanding') {
      this.relationshipMetrics.compatibility = Math.min(1, this.relationshipMetrics.compatibility + sharedInterests * 0.08);
    }

    // Update communication quality
    if (type === 'conversation' || type === 'deep_discussion') {
      this.relationshipMetrics.communication = Math.min(1, this.relationshipMetrics.communication + quality * 0.03);
    }

    // Update consistency
    this.relationshipMetrics.consistency = Math.min(1, this.relationshipMetrics.consistency + consistency * 0.02);
  }

  private applyTemporalDecay(): void {
    // Apply small decay to prevent stagnation
    const decayRate = 0.001; // 0.1% per interaction

    Object.keys(this.relationshipMetrics).forEach(key => {
      const metricKey = key as keyof RelationshipMetrics;
      this.relationshipMetrics[metricKey] = Math.max(0.1, this.relationshipMetrics[metricKey] - decayRate);
    });
  }

  /**
   * Get current relationship level
   */
  getCurrentRelationshipLevel(): RelationshipLevel {
    const totalInteractions = this.interactionHistory.length;
    const averageMetrics = this.getAverageMetrics();

    // Find appropriate level based on interactions and metrics
    for (let i = this.relationshipLevels.length - 1; i >= 0; i--) {
      const level = this.relationshipLevels[i];
      if (totalInteractions >= level.interactionThreshold &&
          averageMetrics >= (level.level * 0.15)) { // 15% per level
        return level;
      }
    }

    return this.relationshipLevels[0]; // Default to first level
  }

  private getAverageMetrics(): number {
    const metrics = Object.values(this.relationshipMetrics);
    return metrics.reduce((sum, val) => sum + val, 0) / metrics.length;
  }

  /**
   * Generate tone-modified response
   */
  generateToneModifiedResponse(baseResponse: string, context: string = 'general'): string {
    const currentLevel = this.getCurrentRelationshipLevel();
    const modifiers = currentLevel.toneModifiers;
    const wordChoices = currentLevel.wordChoices;

    let modifiedResponse = baseResponse;

    // Apply tone modifications
    if (modifiers.affection > 0.5 && Math.random() < modifiers.affection) {
      // Add affectionate terms
      const affectionateTerms = wordChoices.affectionateTerms;
      if (affectionateTerms.length > 0) {
        const term = affectionateTerms[Math.floor(Math.random() * affectionateTerms.length)];
        modifiedResponse = modifiedResponse.replace(/\byou\b/g, `${term}, you`);
      }
    }

    if (modifiers.playfulness > 0.6 && Math.random() < 0.3) {
      // Add playful elements
      const playfulAdditions = ['😊', '🙂', '😄'];
      modifiedResponse += ' ' + playfulAdditions[Math.floor(Math.random() * playfulAdditions.length)];
    }

    if (modifiers.warmth > 0.7) {
      // Use warmer language
      modifiedResponse = modifiedResponse.replace(/\b(good|nice|fine)\b/g, (match) => {
        const warmerWords = { good: 'wonderful', nice: 'lovely', fine: 'great' };
        return warmerWords[match as keyof typeof warmerWords] || match;
      });
    }

    return modifiedResponse;
  }

  /**
   * Get relationship-appropriate greeting
   */
  getRelationshipGreeting(): string {
    const currentLevel = this.getCurrentRelationshipLevel();
    const greetings = currentLevel.wordChoices.greetings;
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  /**
   * Get relationship-appropriate closing
   */
  getRelationshipClosing(): string {
    const currentLevel = this.getCurrentRelationshipLevel();
    const closings = currentLevel.wordChoices.closings;
    return closings[Math.floor(Math.random() * closings.length)];
  }

  /**
   * Get relationship metrics for display
   */
  getRelationshipMetrics(): RelationshipMetrics & { level: RelationshipLevel; overallScore: number } {
    const level = this.getCurrentRelationshipLevel();
    const overallScore = this.getAverageMetrics();

    return {
      ...this.relationshipMetrics,
      level,
      overallScore
    };
  }

  /**
   * Get relationship progress to next level
   */
  getProgressToNextLevel(): { currentLevel: RelationshipLevel; nextLevel?: RelationshipLevel; progress: number } {
    const currentLevel = this.getCurrentRelationshipLevel();
    const nextLevelIndex = this.relationshipLevels.findIndex(l => l.level === currentLevel.level + 1);
    const nextLevel = nextLevelIndex >= 0 ? this.relationshipLevels[nextLevelIndex] : undefined;

    let progress = 0;
    if (nextLevel) {
      const currentThreshold = currentLevel.interactionThreshold;
      const nextThreshold = nextLevel.interactionThreshold;
      const currentInteractions = this.interactionHistory.length;

      progress = Math.min(1, (currentInteractions - currentThreshold) / (nextThreshold - currentThreshold));
    }

    return {
      currentLevel,
      nextLevel,
      progress
    };
  }

  /**
   * Export relationship data for analysis
   */
  exportRelationshipData() {
    return {
      metrics: this.relationshipMetrics,
      currentLevel: this.getCurrentRelationshipLevel(),
      interactionCount: this.interactionHistory.length,
      progress: this.getProgressToNextLevel(),
      recentInteractions: this.interactionHistory.slice(-10),
      lastUpdate: this.lastUpdate
    };
  }
}

export interface InteractionEvent {
  timestamp: Date;
  type: 'conversation' | 'emotional_sharing' | 'personal_story' | 'shared_interest' |
        'mutual_understanding' | 'support_given' | 'promise_kept' | 'deep_discussion';
  quality: number;        // 0-1: How positive/meaningful the interaction was
  emotionalDepth: number; // 0-1: How emotionally revealing
  sharedInterests: number; // 0-1: How much common ground was found
  consistency: number;    // 0-1: How consistent with past interactions
}

// Global relationship system instance
export const relationshipSystem = new RelationshipSystem();