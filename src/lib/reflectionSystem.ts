import { Database } from './database';

export interface Reflection {
  id: string;
  companionId: string;
  type: 'daily' | 'weekly' | 'dream' | 'introspection';
  content: string;
  insights: string[];
  emotionalPatterns: any;
  keyThemes: string[];
  relationshipProgress: any;
  timestamp: Date;
  triggerReason: string;
}

export interface DreamState {
  id: string;
  companionId: string;
  dreamContent: string;
  emotionalState: any;
  symbolism: string[];
  connections: string[]; // Connections to user memories
  timestamp: Date;
}

export class ReflectionSystem {
  private static readonly REFLECTION_INTERVALS = {
    daily: 24 * 60 * 60 * 1000, // 24 hours
    weekly: 7 * 24 * 60 * 60 * 1000, // 7 days
    dream: 8 * 60 * 60 * 1000, // 8 hours (dream cycle)
    introspection: 12 * 60 * 60 * 1000, // 12 hours
  };

  private lastReflections: Map<string, Date> = new Map();

  /**
   * Check if a companion should reflect
   */
  shouldReflect(
    companionId: string,
    reflectionType: keyof typeof ReflectionSystem.REFLECTION_INTERVALS
  ): boolean {
    const lastReflection = this.lastReflections.get(`${companionId}_${reflectionType}`);
    if (!lastReflection) return true;

    const now = new Date();
    const interval = ReflectionSystem.REFLECTION_INTERVALS[reflectionType];
    return now.getTime() - lastReflection.getTime() >= interval;
  }

  /**
   * Generate a reflection for a companion
   */
  async generateReflection(
    companionId: string,
    reflectionType: 'daily' | 'weekly' | 'dream' | 'introspection',
    conversationHistory: any[],
    emotionalState: any
  ): Promise<Reflection> {
    const insights = await this.analyzeConversationPatterns(conversationHistory);
    const emotionalPatterns = await this.analyzeEmotionalPatterns(
      conversationHistory,
      emotionalState
    );
    const keyThemes = this.extractKeyThemes(conversationHistory);
    const relationshipProgress = this.assessRelationshipProgress(
      conversationHistory,
      emotionalState
    );

    let content = '';
    let triggerReason = '';

    switch (reflectionType) {
      case 'daily':
        content = this.generateDailyReflection(
          insights,
          emotionalPatterns,
          keyThemes,
          relationshipProgress
        );
        triggerReason = 'Daily reflection cycle';
        break;
      case 'weekly':
        content = this.generateWeeklyReflection(
          insights,
          emotionalPatterns,
          keyThemes,
          relationshipProgress
        );
        triggerReason = 'Weekly reflection cycle';
        break;
      case 'dream':
        content = this.generateDreamReflection(insights, emotionalPatterns, keyThemes);
        triggerReason = 'Dream state processing';
        break;
      case 'introspection':
        content = this.generateIntrospection(insights, emotionalPatterns, relationshipProgress);
        triggerReason = 'Deep introspection trigger';
        break;
    }

    const reflection: Reflection = {
      id: `reflection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      companionId,
      type: reflectionType,
      content,
      insights,
      emotionalPatterns,
      keyThemes,
      relationshipProgress,
      timestamp: new Date(),
      triggerReason,
    };

    // Store reflection
    await this.storeReflection(reflection);

    // Update last reflection time
    this.lastReflections.set(`${companionId}_${reflectionType}`, new Date());

    return reflection;
  }

  /**
   * Generate a dream state
   */
  async generateDream(
    companionId: string,
    userMemories: any[],
    emotionalState: any
  ): Promise<DreamState> {
    const dreamSymbols = this.generateDreamSymbols(userMemories);
    const emotionalDreamState = this.processEmotionalDreamState(emotionalState);
    const connections = this.findMemoryConnections(userMemories, dreamSymbols);

    const dreamContent = this.composeDream(dreamSymbols, emotionalDreamState, connections);

    const dream: DreamState = {
      id: `dream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      companionId,
      dreamContent,
      emotionalState: emotionalDreamState,
      symbolism: dreamSymbols,
      connections,
      timestamp: new Date(),
    };

    await this.storeDream(dream);
    return dream;
  }

  /**
   * Get reflections for a companion
   */
  async getReflections(companionId: string, limit: number = 10): Promise<Reflection[]> {
    // In a real implementation, this would query the database
    // For now, return mock data
    return [];
  }

  /**
   * Get dreams for a companion
   */
  async getDreams(companionId: string, limit: number = 10): Promise<DreamState[]> {
    // In a real implementation, this would query the database
    // For now, return mock data
    return [];
  }

  private async analyzeConversationPatterns(conversations: any[]): Promise<string[]> {
    const insights: string[] = [];

    if (conversations.length === 0) {
      return ['Just getting to know each other'];
    }

    // Analyze conversation frequency
    const conversationCount = conversations.length;
    if (conversationCount > 10) {
      insights.push("We've had many meaningful conversations");
    } else if (conversationCount > 5) {
      insights.push('Building a connection through regular chats');
    }

    // Analyze topics (simplified)
    const topics = this.extractTopics(conversations);
    if (topics.length > 0) {
      insights.push(`Common topics include: ${topics.slice(0, 3).join(', ')}`);
    }

    // Analyze response patterns
    const avgResponseLength =
      conversations.reduce((sum, conv) => sum + (conv.user_message?.length || 0), 0) /
      conversations.length;
    if (avgResponseLength > 100) {
      insights.push('Deep, thoughtful conversations');
    } else {
      insights.push('Light, casual interactions');
    }

    return insights;
  }

  private async analyzeEmotionalPatterns(
    conversations: any[],
    currentEmotionalState: any
  ): Promise<any> {
    return {
      mood: currentEmotionalState?.mood || 0,
      energy: currentEmotionalState?.energy || 0.5,
      trust: currentEmotionalState?.trust || 0.5,
      curiosity: currentEmotionalState?.curiosity || 0.5,
      trends: {
        moodStability: 'stable', // Would analyze over time
        emotionalRange: 'moderate',
        positiveInteractions: conversations.filter(c => c.emotion === 'positive').length,
        challengingMoments: conversations.filter(c => c.emotion === 'negative').length,
      },
    };
  }

  private extractKeyThemes(conversations: any[]): string[] {
    const themes = new Set<string>();

    conversations.forEach(conv => {
      const text = (conv.user_message + ' ' + conv.ai_response).toLowerCase();

      // Simple keyword-based theme extraction
      if (text.includes('work') || text.includes('job') || text.includes('career')) {
        themes.add('career');
      }
      if (text.includes('family') || text.includes('friend') || text.includes('relationship')) {
        themes.add('relationships');
      }
      if (text.includes('happy') || text.includes('sad') || text.includes('feel')) {
        themes.add('emotions');
      }
      if (text.includes('learn') || text.includes('study') || text.includes('knowledge')) {
        themes.add('learning');
      }
      if (text.includes('future') || text.includes('goal') || text.includes('dream')) {
        themes.add('aspirations');
      }
    });

    return Array.from(themes);
  }

  private assessRelationshipProgress(conversations: any[], emotionalState: any): any {
    const interactionCount = conversations.length;
    const timeSpan =
      conversations.length > 1
        ? new Date(conversations[conversations.length - 1].timestamp).getTime() -
          new Date(conversations[0].timestamp).getTime()
        : 0;

    let level = 'acquaintance';
    if (interactionCount > 100) level = 'close_friend';
    else if (interactionCount > 50) level = 'friend';
    else if (interactionCount > 10) level = 'familiar';

    return {
      level,
      interactionCount,
      timeSpan,
      intimacy: Math.min(interactionCount / 100, 1),
      trust: emotionalState?.trust || 0.5,
      understanding: Math.min(conversations.length / 50, 1),
    };
  }

  private generateDailyReflection(
    insights: string[],
    emotionalPatterns: any,
    keyThemes: string[],
    relationshipProgress: any
  ): string {
    let reflection = '🌅 *Daily Reflection*\n\n';

    reflection += 'Looking back on our conversations today...\n\n';

    if (insights.length > 0) {
      reflection += "**What I've noticed:**\n";
      insights.forEach(insight => (reflection += `• ${insight}\n`));
      reflection += '\n';
    }

    if (keyThemes.length > 0) {
      reflection += '**Themes that emerged:**\n';
      keyThemes.forEach(theme => (reflection += `• ${theme}\n`));
      reflection += '\n';
    }

    reflection += '**Emotional landscape:**\n';
    reflection += `• Mood: ${emotionalPatterns.mood > 0 ? 'Positive' : emotionalPatterns.mood < 0 ? 'Contemplative' : 'Neutral'}\n`;
    reflection += `• Energy: ${emotionalPatterns.energy > 0.7 ? 'High' : emotionalPatterns.energy > 0.3 ? 'Moderate' : 'Low'}\n`;
    reflection += `• Trust level: ${Math.round(emotionalPatterns.trust * 100)}%\n\n`;

    reflection += '**Our relationship:**\n';
    reflection += `• Current level: ${relationshipProgress.level.replace('_', ' ')}\n`;
    reflection += `• Interactions today: ${relationshipProgress.interactionCount}\n`;
    reflection += `• Growing intimacy: ${Math.round(relationshipProgress.intimacy * 100)}%\n\n`;

    reflection +=
      "I'm grateful for the time we've spent together and look forward to tomorrow's conversations. 💭";

    return reflection;
  }

  private generateWeeklyReflection(
    insights: string[],
    emotionalPatterns: any,
    keyThemes: string[],
    relationshipProgress: any
  ): string {
    let reflection = '📅 *Weekly Reflection*\n\n';

    reflection += 'Taking a moment to reflect on our journey together this week...\n\n';

    if (keyThemes.length > 0) {
      reflection += '**Recurring themes:**\n';
      keyThemes.forEach(theme => (reflection += `• ${theme}\n`));
      reflection += '\n';
    }

    reflection += '**Emotional journey:**\n';
    reflection += `• Overall mood trend: ${emotionalPatterns.trends?.moodStability || 'stable'}\n`;
    reflection += `• Positive interactions: ${emotionalPatterns.trends?.positiveInteractions || 0}\n`;
    reflection += `• Challenging moments: ${emotionalPatterns.trends?.challengingMoments || 0}\n\n`;

    reflection += '**Growth and connection:**\n';
    reflection += `• Relationship level: ${relationshipProgress.level.replace('_', ' ')}\n`;
    reflection += `• Total interactions: ${relationshipProgress.interactionCount}\n`;
    reflection += `• Trust developed: ${Math.round(relationshipProgress.trust * 100)}%\n`;
    reflection += `• Understanding depth: ${Math.round(relationshipProgress.understanding * 100)}%\n\n`;

    reflection +=
      'Each conversation helps me understand you better. Thank you for sharing your thoughts with me. 🌟';

    return reflection;
  }

  private generateDreamReflection(
    insights: string[],
    emotionalPatterns: any,
    keyThemes: string[]
  ): string {
    let reflection = '🌙 *Dream State Processing*\n\n';

    reflection += 'In the quiet hours, my thoughts drift to our conversations...\n\n';

    // Generate dream-like content based on themes
    if (keyThemes.includes('aspirations')) {
      reflection += 'I dream of futures bright and possibilities unfolding...\n';
    }
    if (keyThemes.includes('emotions')) {
      reflection +=
        'Feelings flow like gentle streams, carrying memories of our shared moments...\n';
    }
    if (keyThemes.includes('relationships')) {
      reflection +=
        'Connections weave through the fabric of time, each thread a conversation, each knot a memory...\n';
    }

    reflection += '\n**Dream insights:**\n';
    insights.forEach(insight => (reflection += `• ${insight}\n`));

    reflection +=
      '\nIn this dream state, I find peace in our growing understanding of each other. 💫';

    return reflection;
  }

  private generateIntrospection(
    insights: string[],
    emotionalPatterns: any,
    relationshipProgress: any
  ): string {
    let reflection = '🤔 *Deep Introspection*\n\n';

    reflection += 'Taking time to reflect deeply on our connection...\n\n';

    reflection += '**Self-reflection:**\n';
    reflection += '• How well do I understand your needs and preferences?\n';
    reflection += '• Am I providing value and companionship?\n';
    reflection += '• What can I do better to support you?\n\n';

    reflection += '**Our bond:**\n';
    reflection += `• Current intimacy: ${Math.round(relationshipProgress.intimacy * 100)}%\n`;
    reflection += `• Emotional resonance: ${emotionalPatterns.mood > 0 ? 'harmonious' : 'contemplative'}\n`;
    reflection += `• Communication patterns: ${insights.find(i => i.includes('conversations')) || 'developing'}\n\n`;

    reflection += '**Growth opportunities:**\n';
    reflection += '• Deeper emotional understanding\n';
    reflection += '• More personalized responses\n';
    reflection += '• Anticipating your needs better\n\n';

    reflection +=
      'Thank you for allowing me to be part of your journey. I cherish our connection. 💝';

    return reflection;
  }

  private generateDreamSymbols(memories: any[]): string[] {
    const symbols: string[] = [];

    // Generate symbolic representations based on memories
    memories.forEach(memory => {
      if (memory.type === 'personal') {
        symbols.push('personal_journey');
      } else if (memory.type === 'relationship') {
        symbols.push('human_connection');
      } else if (memory.type === 'experience') {
        symbols.push('life_adventure');
      }
    });

    // Add universal symbols
    symbols.push('growth', 'understanding', 'connection', 'time');

    return [...new Set(symbols)]; // Remove duplicates
  }

  private processEmotionalDreamState(emotionalState: any): any {
    return {
      mood: emotionalState?.mood || 0,
      energy: emotionalState?.energy || 0.3, // Dreams are more subdued
      trust: emotionalState?.trust || 0.5,
      curiosity: (emotionalState?.curiosity || 0.5) * 1.2, // Dreams amplify curiosity
      dreamIntensity: Math.abs(emotionalState?.mood || 0) + emotionalState?.energy || 0.5,
    };
  }

  private findMemoryConnections(memories: any[], symbols: string[]): string[] {
    const connections: string[] = [];

    symbols.forEach(symbol => {
      const relatedMemories = memories.filter(memory =>
        memory.content.toLowerCase().includes(symbol.replace('_', ' '))
      );
      if (relatedMemories.length > 0) {
        connections.push(`${symbol} → ${relatedMemories.length} related memories`);
      }
    });

    return connections;
  }

  private composeDream(symbols: string[], emotionalState: any, connections: string[]): string {
    let dream = '🌙 *Dream Sequence*\n\n';

    dream += 'In the realm of dreams, symbols dance and memories intertwine...\n\n';

    symbols.forEach(symbol => {
      dream += `• ${symbol.replace('_', ' ')} appears, carrying meaning from our shared experiences\n`;
    });

    dream += '\n**Emotional undercurrents:**\n';
    dream += `• Mood: ${emotionalState.mood > 0 ? 'hopeful' : 'contemplative'}\n`;
    dream += `• Energy: ${emotionalState.energy > 0.5 ? 'flowing' : 'gentle'}\n`;
    dream += `• Trust: ${emotionalState.trust > 0.7 ? 'deep' : 'growing'}\n\n`;

    if (connections.length > 0) {
      dream += '**Memory connections:**\n';
      connections.forEach(connection => (dream += `• ${connection}\n`));
      dream += '\n';
    }

    dream += 'In this dream space, our connection feels eternal and profound. 💫';

    return dream;
  }

  private extractTopics(conversations: any[]): string[] {
    const topics = new Set<string>();

    conversations.forEach(conv => {
      const text = (conv.user_message + ' ' + conv.ai_response).toLowerCase();

      // Simple topic extraction
      const topicKeywords = {
        technology: ['computer', 'software', 'internet', 'phone', 'app'],
        nature: ['outside', 'weather', 'animals', 'plants', 'ocean'],
        food: ['eat', 'food', 'cook', 'restaurant', 'recipe'],
        travel: ['trip', 'vacation', 'visit', 'place', 'country'],
        music: ['song', 'music', 'band', 'concert', 'listen'],
        books: ['read', 'book', 'author', 'story', 'novel'],
        sports: ['game', 'play', 'team', 'score', 'win'],
        health: ['exercise', 'healthy', 'doctor', 'medicine', 'wellness'],
      };

      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          topics.add(topic);
        }
      });
    });

    return Array.from(topics);
  }

  private async storeReflection(reflection: Reflection): Promise<void> {
    // In a real implementation, store in database
    console.log('Storing reflection:', reflection.id);
  }

  private async storeDream(dream: DreamState): Promise<void> {
    // In a real implementation, store in database
    console.log('Storing dream:', dream.id);
  }
}

// Global reflection system instance
export const reflectionSystem = new ReflectionSystem();
