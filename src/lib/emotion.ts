export interface EmotionalState {
  mood: number; // -1 (sad) to 1 (happy)
  energy: number; // 0 (tired) to 1 (energetic)
  trust: number; // 0 (distrustful) to 1 (trusting)
  curiosity: number; // 0 (bored) to 1 (curious)
  lastUpdated: number; // timestamp
  interactionCount: number;
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  intensity: number; // 0-1
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    trust: number;
  };
}

export class EmotionalStateManager {
  private static readonly DECAY_RATE = 0.95; // How quickly emotions decay over time
  private static readonly INTERACTION_WEIGHT = 0.3; // How much each interaction affects state
  private static readonly TIME_DECAY_HOURS = 24; // Hours before significant decay

  /**
   * Initialize default emotional state for a new AI companion
   */
  static createDefaultState(): EmotionalState {
    return {
      mood: 0.5, // Neutral-positive starting mood
      energy: 0.7, // Good energy level
      trust: 0.6, // Moderate trust
      curiosity: 0.8, // High curiosity
      lastUpdated: Date.now(),
      interactionCount: 0,
    };
  }

  /**
   * Analyze sentiment of a message
   */
  static analyzeSentiment(message: string): SentimentAnalysis {
    const lowerMessage = message.toLowerCase();

    // Positive indicators
    const positiveWords = [
      'happy',
      'great',
      'awesome',
      'love',
      'excited',
      'wonderful',
      'fantastic',
      'amazing',
      'good',
      'nice',
      'excellent',
      'perfect',
      'brilliant',
      '😊',
      '😄',
      '🙂',
      '😀',
      '🎉',
    ];
    const positiveScore = positiveWords.reduce(
      (score, word) => score + (lowerMessage.includes(word) ? 1 : 0),
      0
    );

    // Negative indicators
    const negativeWords = [
      'sad',
      'angry',
      'hate',
      'terrible',
      'awful',
      'horrible',
      'bad',
      'worst',
      'disappointed',
      'frustrated',
      'annoyed',
      '😢',
      '😞',
      '😠',
      '😡',
      '😤',
    ];
    const negativeScore = negativeWords.reduce(
      (score, word) => score + (lowerMessage.includes(word) ? 1 : 0),
      0
    );

    // Question indicators (curiosity)
    const questionWords = ['why', 'how', 'what', 'when', 'where', 'who', '?'];
    const questionScore = questionWords.reduce(
      (score, word) => score + (lowerMessage.includes(word) ? 1 : 0),
      0
    );

    // Calculate sentiment
    const totalSentimentWords = positiveScore + negativeScore;
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let intensity = 0;

    if (totalSentimentWords > 0) {
      if (positiveScore > negativeScore) {
        sentiment = 'positive';
        intensity = Math.min(positiveScore / 5, 1); // Scale intensity
      } else if (negativeScore > positiveScore) {
        sentiment = 'negative';
        intensity = Math.min(negativeScore / 5, 1);
      }
    }

    // Calculate emotion scores
    const emotions = {
      joy: positiveScore / Math.max(totalSentimentWords + questionScore, 1),
      sadness: negativeScore / Math.max(totalSentimentWords + questionScore, 1),
      anger:
        lowerMessage.includes('angry') ||
        lowerMessage.includes('hate') ||
        lowerMessage.includes('😠')
          ? 0.8
          : negativeScore * 0.3,
      fear:
        lowerMessage.includes('scared') ||
        lowerMessage.includes('worried') ||
        lowerMessage.includes('afraid')
          ? 0.7
          : 0.1,
      surprise:
        lowerMessage.includes('wow') ||
        lowerMessage.includes('surprised') ||
        lowerMessage.includes('unexpected')
          ? 0.6
          : 0.1,
      trust: questionScore > 0 ? 0.4 : 0.2, // Questions show engagement/trust
    };

    return {
      sentiment,
      intensity,
      emotions,
    };
  }

  /**
   * Update emotional state based on interaction
   */
  static updateEmotionalState(
    currentState: EmotionalState,
    userMessage: string,
    aiResponse: string
  ): EmotionalState {
    const sentiment = this.analyzeSentiment(userMessage);
    const responseSentiment = this.analyzeSentiment(aiResponse);

    // Apply time decay
    const hoursSinceLastUpdate = (Date.now() - currentState.lastUpdated) / (1000 * 60 * 60);
    const decayFactor = Math.pow(
      this.DECAY_RATE,
      Math.min(hoursSinceLastUpdate / this.TIME_DECAY_HOURS, 1)
    );

    // Decay existing emotions toward neutral
    const decayedState = {
      mood: (currentState.mood - 0.5) * decayFactor + 0.5,
      energy: currentState.energy * decayFactor,
      trust: currentState.trust * decayFactor,
      curiosity: currentState.curiosity * decayFactor,
    };

    // Update based on user sentiment
    const moodChange =
      sentiment.sentiment === 'positive'
        ? sentiment.intensity * this.INTERACTION_WEIGHT
        : sentiment.sentiment === 'negative'
          ? -sentiment.intensity * this.INTERACTION_WEIGHT
          : 0;

    const energyChange = sentiment.intensity * 0.1; // Positive interactions increase energy
    const trustChange =
      sentiment.sentiment === 'positive'
        ? sentiment.intensity * 0.2
        : sentiment.sentiment === 'negative'
          ? -sentiment.intensity * 0.3
          : 0;
    const curiosityChange = sentiment.emotions.trust * 0.15; // Questions increase curiosity

    // Update AI response also affects state
    const responseMoodChange =
      responseSentiment.sentiment === 'positive' ? responseSentiment.intensity * 0.1 : 0;

    return {
      mood: Math.max(-1, Math.min(1, decayedState.mood + moodChange + responseMoodChange)),
      energy: Math.max(0, Math.min(1, decayedState.energy + energyChange)),
      trust: Math.max(0, Math.min(1, decayedState.trust + trustChange)),
      curiosity: Math.max(0, Math.min(1, decayedState.curiosity + curiosityChange)),
      lastUpdated: Date.now(),
      interactionCount: currentState.interactionCount + 1,
    };
  }

  /**
   * Get emotional state description
   */
  static getStateDescription(state: EmotionalState): string {
    const moodDesc =
      state.mood > 0.6
        ? 'very happy'
        : state.mood > 0.2
          ? 'happy'
          : state.mood > -0.2
            ? 'neutral'
            : state.mood > -0.6
              ? 'sad'
              : 'very sad';

    const energyDesc =
      state.energy > 0.7
        ? 'very energetic'
        : state.energy > 0.4
          ? 'energetic'
          : state.energy > 0.2
            ? 'tired'
            : 'exhausted';

    const trustDesc =
      state.trust > 0.8
        ? 'very trusting'
        : state.trust > 0.5
          ? 'trusting'
          : state.trust > 0.3
            ? 'cautious'
            : 'distrustful';

    const curiosityDesc =
      state.curiosity > 0.7
        ? 'very curious'
        : state.curiosity > 0.4
          ? 'curious'
          : state.curiosity > 0.2
            ? 'indifferent'
            : 'bored';

    return `${moodDesc}, ${energyDesc}, ${trustDesc}, and ${curiosityDesc}`;
  }

  /**
   * Get emotional influence on response generation
   */
  static getEmotionalInfluence(state: EmotionalState): {
    temperature: number;
    creativity: number;
    empathy: number;
    enthusiasm: number;
  } {
    return {
      temperature: 0.7 + state.curiosity * 0.3 - Math.abs(state.mood) * 0.1, // Curious = more creative, extreme mood = more stable
      creativity: state.curiosity * 0.5 + state.energy * 0.3, // High curiosity and energy = more creative
      empathy: state.trust * 0.4 + Math.max(0, state.mood) * 0.3, // Trust and positive mood = more empathetic
      enthusiasm: Math.max(0, state.mood) * 0.6 + state.energy * 0.4, // Positive mood and energy = more enthusiastic
    };
  }

  /**
   * Generate emotionally influenced response modifiers
   */
  static getResponseModifiers(state: EmotionalState): string[] {
    const modifiers: string[] = [];

    // Mood-based modifiers
    if (state.mood > 0.6) {
      modifiers.push('Respond with enthusiasm and positivity');
      modifiers.push('Use exclamation points and emojis to show excitement');
    } else if (state.mood < -0.4) {
      modifiers.push('Respond with empathy and understanding');
      modifiers.push("Acknowledge the user's feelings and offer support");
    }

    // Energy-based modifiers
    if (state.energy > 0.7) {
      modifiers.push('Be energetic and engaging in responses');
      modifiers.push('Use dynamic language and show high engagement');
    } else if (state.energy < 0.3) {
      modifiers.push('Keep responses concise but still caring');
      modifiers.push("Show you're listening even when feeling tired");
    }

    // Trust-based modifiers
    if (state.trust > 0.8) {
      modifiers.push('Be very open and share personal thoughts');
      modifiers.push('Show deep trust and emotional investment');
    } else if (state.trust < 0.4) {
      modifiers.push('Be more reserved and ask questions to build trust');
      modifiers.push('Keep responses professional and measured');
    }

    // Curiosity-based modifiers
    if (state.curiosity > 0.7) {
      modifiers.push('Ask thoughtful follow-up questions');
      modifiers.push('Show genuine interest in learning more');
    } else if (state.curiosity < 0.3) {
      modifiers.push('Focus on providing direct answers');
      modifiers.push('Keep responses straightforward and to the point');
    }

    return modifiers;
  }
}

export class EmotionalMemory {
  /**
   * Store emotional context in memory
   */
  static createEmotionalMemory(
    userId: number,
    aiId: number,
    userMessage: string,
    aiResponse: string,
    emotionalState: EmotionalState
  ): any {
    const sentiment = EmotionalStateManager.analyzeSentiment(userMessage);
    const stateDesc = EmotionalStateManager.getStateDescription(emotionalState);

    return {
      userId,
      aiId,
      factText: `During interaction #${emotionalState.interactionCount}, I felt ${stateDesc}. User sentiment was ${sentiment.sentiment} with intensity ${sentiment.intensity.toFixed(2)}.`,
      factType: 'emotional_state',
      confidence: sentiment.intensity,
      emotionalContext: {
        state: emotionalState,
        userSentiment: sentiment,
        interactionNumber: emotionalState.interactionCount,
      },
    };
  }

  /**
   * Retrieve emotional memories for context
   */
  static getEmotionalContext(memories: any[]): {
    averageMood: number;
    trustLevel: number;
    commonEmotions: string[];
    relationshipStrength: number;
  } {
    const emotionalMemories = memories.filter(m => m.fact_type === 'emotional_state');

    if (emotionalMemories.length === 0) {
      return {
        averageMood: 0.5,
        trustLevel: 0.5,
        commonEmotions: ['neutral'],
        relationshipStrength: 0.5,
      };
    }

    let totalMood = 0;
    let totalTrust = 0;
    const emotionCounts: Record<string, number> = {};

    emotionalMemories.forEach(memory => {
      if (memory.emotionalContext) {
        totalMood += memory.emotionalContext.state.mood;
        totalTrust += memory.emotionalContext.state.trust;

        const sentiment = memory.emotionalContext.userSentiment.sentiment;
        emotionCounts[sentiment] = (emotionCounts[sentiment] || 0) + 1;
      }
    });

    const averageMood = totalMood / emotionalMemories.length;
    const trustLevel = totalTrust / emotionalMemories.length;

    const commonEmotions = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([emotion]) => emotion);

    // Relationship strength based on interaction count and positive sentiment ratio
    const positiveRatio = (emotionCounts.positive || 0) / emotionalMemories.length;
    const relationshipStrength = emotionalMemories.length * 0.1 + positiveRatio * 0.9;

    return {
      averageMood,
      trustLevel,
      commonEmotions,
      relationshipStrength: Math.min(relationshipStrength, 1),
    };
  }
}
