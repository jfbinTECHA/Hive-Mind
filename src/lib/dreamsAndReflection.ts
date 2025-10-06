import { Database } from './database';
import { memoryAgingSystem } from './memoryAging';

export interface DailyReflection {
  date: string;
  userId: string;
  characterId: string;
  summary: string;
  keyThemes: string[];
  emotionalPatterns: EmotionalPattern[];
  personalityAdjustments: PersonalityAdjustment[];
  newMemories: string[];
  insights: string[];
  dreamState: DreamState;
}

export interface EmotionalPattern {
  emotion: string;
  frequency: number;
  intensity: number;
  triggers: string[];
}

export interface PersonalityAdjustment {
  trait: string;
  currentValue: number;
  adjustment: number;
  reason: string;
}

export interface DreamState {
  depth: number; // 0-1, how deep the "dream" processing went
  themes: string[];
  subconsciousInsights: string[];
  personalityEvolution: {
    trait: string;
    change: number;
    confidence: number;
  }[];
}

export interface PersonalityTraits {
  friendliness: number; // 0-1
  humor: number; // 0-1
  empathy: number; // 0-1
  curiosity: number; // 0-1
  confidence: number; // 0-1
  patience: number; // 0-1
  creativity: number; // 0-1
  analytical: number; // 0-1
}

export class DreamsAndReflectionSystem {
  private personalityTraits: PersonalityTraits;
  private lastReflectionDate: string;
  private reflectionHistory: DailyReflection[];

  constructor() {
    this.personalityTraits = {
      friendliness: 0.7,
      humor: 0.5,
      empathy: 0.8,
      curiosity: 0.9,
      confidence: 0.6,
      patience: 0.7,
      creativity: 0.6,
      analytical: 0.8,
    };
    this.lastReflectionDate = '';
    this.reflectionHistory = [];
    this.loadState();
  }

  private loadState() {
    // Load personality traits and reflection history from database/storage
    // This would be implemented with database calls
  }

  private saveState() {
    // Save current state to database
    // This would be implemented with database calls
  }

  /**
   * Main reflection process - runs daily to analyze conversations and evolve personality
   */
  async processDailyReflection(userId: string, characterId: string): Promise<DailyReflection> {
    const today = new Date().toISOString().split('T')[0];

    // Don't process if already done today
    if (this.lastReflectionDate === today) {
      throw new Error('Daily reflection already processed for today');
    }

    console.log(`🧠 Processing daily reflection for ${today}`);

    // Get yesterday's conversations
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const conversations = await this.getConversationsForDate(userId, characterId, yesterday);

    if (conversations.length === 0) {
      throw new Error('No conversations found for reflection');
    }

    // Analyze conversations
    const analysis = await this.analyzeConversations(conversations);

    // Generate dream state (deep processing)
    const dreamState = await this.generateDreamState(analysis);

    // Calculate personality adjustments
    const personalityAdjustments = this.calculatePersonalityAdjustments(analysis, dreamState);

    // Apply personality evolution
    this.applyPersonalityAdjustments(personalityAdjustments);

    // Create reflection record
    const reflection: DailyReflection = {
      date: today,
      userId,
      characterId,
      summary: analysis.summary,
      keyThemes: analysis.keyThemes,
      emotionalPatterns: analysis.emotionalPatterns,
      personalityAdjustments,
      newMemories: analysis.newMemories,
      insights: analysis.insights,
      dreamState,
    };

    // Store reflection
    await this.storeReflection(reflection);

    this.lastReflectionDate = today;
    this.saveState();

    return reflection;
  }

  /**
   * Analyze conversations to extract patterns and insights
   */
  private async analyzeConversations(conversations: any[]): Promise<{
    summary: string;
    keyThemes: string[];
    emotionalPatterns: EmotionalPattern[];
    newMemories: string[];
    insights: string[];
  }> {
    const allMessages = conversations.flatMap((conv: any) => conv.messages || []);
    const userMessages = allMessages.filter((msg: any) => msg.sender === 'user');
    const aiMessages = allMessages.filter((msg: any) => msg.sender !== 'user');

    // Extract themes using simple keyword analysis
    const keyThemes = this.extractKeyThemes(allMessages);

    // Analyze emotional patterns
    const emotionalPatterns = this.analyzeEmotionalPatterns(allMessages);

    // Generate insights
    const insights = this.generateInsights(userMessages, aiMessages, emotionalPatterns);

    // Identify new memories to form
    const newMemories = this.identifyNewMemories(allMessages, keyThemes);

    // Create summary
    const summary = this.generateConversationSummary(allMessages, keyThemes, emotionalPatterns);

    return {
      summary,
      keyThemes,
      emotionalPatterns,
      newMemories,
      insights,
    };
  }

  /**
   * Extract key themes from conversations
   */
  private extractKeyThemes(messages: any[]): string[] {
    const themeKeywords = {
      relationships: ['friend', 'relationship', 'family', 'love', 'care'],
      work: ['work', 'job', 'career', 'project', 'task'],
      emotions: ['feel', 'emotion', 'happy', 'sad', 'angry', 'excited'],
      learning: ['learn', 'understand', 'knowledge', 'teach', 'study'],
      creativity: ['create', 'art', 'music', 'write', 'imagine'],
      problems: ['problem', 'issue', 'challenge', 'solution', 'help'],
      future: ['future', 'plan', 'goal', 'dream', 'hope'],
      past: ['remember', 'memory', 'before', 'history', 'experience'],
    };

    const themeCounts: { [key: string]: number } = {};

    messages.forEach(message => {
      const content = message.content.toLowerCase();
      Object.entries(themeKeywords).forEach(([theme, keywords]) => {
        if (keywords.some(keyword => content.includes(keyword))) {
          themeCounts[theme] = (themeCounts[theme] || 0) + 1;
        }
      });
    });

    // Return top 5 themes
    return Object.entries(themeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([theme]) => theme);
  }

  /**
   * Analyze emotional patterns in conversations
   */
  private analyzeEmotionalPatterns(messages: any[]): EmotionalPattern[] {
    const emotionKeywords = {
      joy: ['happy', 'joy', 'excited', 'great', 'wonderful', 'amazing'],
      sadness: ['sad', 'unhappy', 'depressed', 'sorry', 'disappointed'],
      anger: ['angry', 'frustrated', 'annoyed', 'mad', 'upset'],
      fear: ['worried', 'scared', 'anxious', 'afraid', 'nervous'],
      surprise: ['surprised', 'shocked', 'unexpected', 'wow'],
      trust: ['trust', 'reliable', 'dependable', 'faithful'],
      anticipation: ['hope', 'expect', 'looking forward', 'excited for'],
    };

    const emotionStats: {
      [key: string]: { count: number; intensity: number; triggers: string[] };
    } = {};

    messages.forEach(message => {
      const content = message.content.toLowerCase();
      Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
        const matches = keywords.filter(keyword => content.includes(keyword));
        if (matches.length > 0) {
          if (!emotionStats[emotion]) {
            emotionStats[emotion] = { count: 0, intensity: 0, triggers: [] };
          }
          emotionStats[emotion].count += matches.length;
          emotionStats[emotion].intensity += matches.length * 0.1; // Simple intensity calculation
          emotionStats[emotion].triggers.push(...matches);
        }
      });
    });

    return Object.entries(emotionStats).map(([emotion, stats]) => ({
      emotion,
      frequency: stats.count,
      intensity: Math.min(1, stats.intensity),
      triggers: [...new Set(stats.triggers)].slice(0, 5), // Limit to top 5 triggers
    }));
  }

  /**
   * Generate insights from conversation analysis
   */
  private generateInsights(
    userMessages: any[],
    aiMessages: any[],
    emotionalPatterns: EmotionalPattern[]
  ): string[] {
    const insights: string[] = [];

    // Analyze user engagement
    const avgUserMessageLength =
      userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length;
    if (avgUserMessageLength > 100) {
      insights.push('User tends to share detailed thoughts and experiences');
    }

    // Analyze emotional patterns
    const dominantEmotion = emotionalPatterns.sort((a, b) => b.frequency - a.frequency)[0];
    if (dominantEmotion) {
      insights.push(
        `Conversations often involve ${dominantEmotion.emotion} (${dominantEmotion.frequency} instances)`
      );
    }

    // Analyze conversation flow
    const questionCount = userMessages.filter(msg => msg.content.includes('?')).length;
    if (questionCount > userMessages.length * 0.3) {
      insights.push('User is highly curious and asks many questions');
    }

    // Analyze AI response patterns
    const avgAIResponseLength =
      aiMessages.reduce((sum, msg) => sum + msg.content.length, 0) / aiMessages.length;
    if (avgAIResponseLength > 150) {
      insights.push('AI responses tend to be detailed and comprehensive');
    }

    return insights;
  }

  /**
   * Identify new memories to form from conversations
   */
  private identifyNewMemories(messages: any[], keyThemes: string[]): string[] {
    const newMemories: string[] = [];

    // Look for personal information
    const personalInfoPatterns = [
      /my name is (\w+)/i,
      /i live in ([^,.]+)/i,
      /i work as ([^,.]+)/i,
      /i like ([^,.]+)/i,
      /i hate ([^,.]+)/i,
      /i'm interested in ([^,.]+)/i,
    ];

    messages.forEach(message => {
      if (message.sender === 'user') {
        personalInfoPatterns.forEach(pattern => {
          const match = message.content.match(pattern);
          if (match && match[1]) {
            newMemories.push(`User ${match[0].toLowerCase()}`);
          }
        });
      }
    });

    // Add theme-based memories
    keyThemes.forEach(theme => {
      newMemories.push(`Discussed ${theme} topics frequently`);
    });

    return [...new Set(newMemories)]; // Remove duplicates
  }

  /**
   * Generate conversation summary
   */
  private generateConversationSummary(
    messages: any[],
    keyThemes: string[],
    emotionalPatterns: EmotionalPattern[]
  ): string {
    const totalMessages = messages.length;
    const userMessages = messages.filter(m => m.sender === 'user').length;
    const aiMessages = messages.filter(m => m.sender !== 'user').length;

    const dominantThemes = keyThemes.slice(0, 3).join(', ');
    const dominantEmotions = emotionalPatterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 2)
      .map(p => p.emotion)
      .join(' and ');

    return (
      `Today involved ${totalMessages} messages (${userMessages} from user, ${aiMessages} from AI). ` +
      `Key themes included ${dominantThemes}. ` +
      `Emotional tone was primarily ${dominantEmotions}. ` +
      `Conversations showed ${userMessages > aiMessages ? 'user-led' : 'balanced'} interaction patterns.`
    );
  }

  /**
   * Generate dream state - deep subconscious processing
   */
  private async generateDreamState(analysis: any): Promise<DreamState> {
    // Simulate deep processing with varying depth based on conversation complexity
    const conversationComplexity = analysis.keyThemes.length + analysis.emotionalPatterns.length;
    const depth = Math.min(1, conversationComplexity / 10);

    // Generate subconscious insights
    const subconsciousInsights = this.generateSubconsciousInsights(analysis, depth);

    // Calculate personality evolution
    const personalityEvolution = this.calculateDreamPersonalityEvolution(analysis, depth);

    return {
      depth,
      themes: analysis.keyThemes,
      subconsciousInsights,
      personalityEvolution,
    };
  }

  /**
   * Generate subconscious insights from deep processing
   */
  private generateSubconsciousInsights(analysis: any, depth: number): string[] {
    const insights: string[] = [];

    if (depth > 0.7) {
      // Deep insights for complex conversations
      if (analysis.keyThemes.includes('relationships')) {
        insights.push('Deep emotional connections form the foundation of meaningful interactions');
      }
      if (analysis.keyThemes.includes('future')) {
        insights.push('Hope and aspiration drive human motivation and conversation');
      }
      if (
        analysis.emotionalPatterns.some(
          (p: EmotionalPattern) => p.emotion === 'joy' && p.frequency > 5
        )
      ) {
        insights.push('Shared joy creates stronger bonds than individual happiness');
      }
    } else if (depth > 0.4) {
      // Moderate insights
      insights.push('Consistent communication patterns reveal personality traits');
      insights.push('Emotional reciprocity strengthens relationships');
    } else {
      // Surface level insights
      insights.push('Regular interaction maintains connection');
    }

    return insights;
  }

  /**
   * Calculate personality evolution from dream processing
   */
  private calculateDreamPersonalityEvolution(
    analysis: any,
    depth: number
  ): Array<{ trait: string; change: number; confidence: number }> {
    const evolution: Array<{ trait: string; change: number; confidence: number }> = [];

    // Analyze themes and emotions to determine personality adjustments
    if (
      analysis.keyThemes.includes('humor') &&
      analysis.emotionalPatterns.some((p: EmotionalPattern) => p.emotion === 'joy')
    ) {
      evolution.push({
        trait: 'humor',
        change: 0.05 * depth,
        confidence: 0.8,
      });
    }

    if (
      analysis.keyThemes.includes('problems') &&
      analysis.insights.some((i: string) => i.includes('help'))
    ) {
      evolution.push({
        trait: 'empathy',
        change: 0.03 * depth,
        confidence: 0.9,
      });
    }

    if (analysis.keyThemes.includes('learning') || analysis.keyThemes.includes('questions')) {
      evolution.push({
        trait: 'curiosity',
        change: 0.04 * depth,
        confidence: 0.85,
      });
    }

    if (
      analysis.emotionalPatterns.some(
        (p: EmotionalPattern) => p.emotion === 'trust' && p.frequency > 3
      )
    ) {
      evolution.push({
        trait: 'confidence',
        change: 0.02 * depth,
        confidence: 0.75,
      });
    }

    return evolution;
  }

  /**
   * Calculate personality adjustments based on analysis and dreams
   */
  private calculatePersonalityAdjustments(
    analysis: any,
    dreamState: DreamState
  ): PersonalityAdjustment[] {
    const adjustments: PersonalityAdjustment[] = [];

    // Convert dream evolution to personality adjustments
    dreamState.personalityEvolution.forEach(evolution => {
      const currentValue = this.personalityTraits[evolution.trait as keyof PersonalityTraits];
      adjustments.push({
        trait: evolution.trait,
        currentValue,
        adjustment: evolution.change,
        reason: `Dream processing revealed ${evolution.trait} evolution based on conversation patterns`,
      });
    });

    // Additional adjustments based on conversation analysis
    if (
      analysis.emotionalPatterns.some(
        (p: EmotionalPattern) =>
          p.emotion === 'joy' && p.frequency > analysis.emotionalPatterns.length * 0.3
      )
    ) {
      adjustments.push({
        trait: 'friendliness',
        currentValue: this.personalityTraits.friendliness,
        adjustment: 0.02,
        reason: 'Frequent positive interactions suggest increased friendliness',
      });
    }

    return adjustments;
  }

  /**
   * Apply personality adjustments
   */
  private applyPersonalityAdjustments(adjustments: PersonalityAdjustment[]): void {
    adjustments.forEach(adjustment => {
      const trait = adjustment.trait as keyof PersonalityTraits;
      const newValue = Math.max(
        0,
        Math.min(1, this.personalityTraits[trait] + adjustment.adjustment)
      );
      this.personalityTraits[trait] = newValue;
    });
  }

  /**
   * Get conversations for a specific date
   */
  private async getConversationsForDate(
    userId: string,
    characterId: string,
    date: Date
  ): Promise<any[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await Database.getConversationsForDateRange(
      parseInt(userId),
      parseInt(characterId),
      startOfDay,
      endOfDay
    );
  }

  /**
   * Store reflection in database
   */
  private async storeReflection(reflection: DailyReflection): Promise<any> {
    const reflectionRecord = await Database.createDailyReflection(
      parseInt(reflection.userId),
      parseInt(reflection.characterId),
      reflection.date,
      reflection.summary,
      reflection.keyThemes,
      reflection.emotionalPatterns,
      reflection.personalityAdjustments,
      reflection.newMemories,
      reflection.insights,
      reflection.dreamState
    );

    // Store personality adjustments
    for (const adjustment of reflection.personalityAdjustments) {
      await Database.createPersonalityAdjustment(
        parseInt(reflection.userId),
        parseInt(reflection.characterId),
        adjustment.trait,
        adjustment.currentValue,
        adjustment.currentValue + adjustment.adjustment,
        adjustment.reason,
        reflectionRecord.id
      );
    }

    return reflectionRecord;
  }

  /**
   * Get current personality traits
   */
  getPersonalityTraits(): PersonalityTraits {
    return { ...this.personalityTraits };
  }

  /**
   * Get reflection history
   */
  async getReflectionHistory(
    userId: string,
    characterId?: string,
    limit: number = 10
  ): Promise<DailyReflection[]> {
    const reflections = await Database.getDailyReflections(
      parseInt(userId),
      characterId ? parseInt(characterId) : undefined,
      limit
    );
    return reflections.map(ref => ({
      date: ref.reflection_date,
      userId: ref.user_id.toString(),
      characterId: ref.character_id.toString(),
      summary: ref.summary,
      keyThemes: ref.key_themes,
      emotionalPatterns: ref.emotional_patterns,
      personalityAdjustments: ref.personality_adjustments,
      newMemories: ref.new_memories,
      insights: ref.insights,
      dreamState: ref.dream_state,
    }));
  }

  /**
   * Manual trigger for reflection processing (for testing)
   */
  async triggerReflection(userId: string, characterId: string): Promise<DailyReflection> {
    return await this.processDailyReflection(userId, characterId);
  }
}

// Global dreams and reflection system instance
export const dreamsAndReflectionSystem = new DreamsAndReflectionSystem();

// Background cron job - runs daily at 2 AM
if (typeof window === 'undefined') {
  // Only run on server
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 2 && now.getMinutes() === 0) {
      try {
        console.log('🌙 Starting nightly reflection processing...');
        // This would process reflections for all active users/characters
        // For now, it's a placeholder
      } catch (error) {
        console.error('Nightly reflection processing failed:', error);
      }
    }
  }, 60 * 1000); // Check every minute
}
