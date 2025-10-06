import { localAIService } from './ollama';
import { Database } from './database';

export interface ExtractedMemory {
  fact: string;
  type: 'personal' | 'preference' | 'experience' | 'knowledge' | 'relationship';
  confidence: number;
  context?: string;
}

export class MemoryExtractor {
  /**
   * Extract facts and memories from conversation messages
   */
  static async extractFromConversation(
    userMessage: string,
    aiResponse: string,
    userId: number,
    aiId: number
  ): Promise<ExtractedMemory[]> {
    const memories: ExtractedMemory[] = [];

    // Extract from user message
    const userMemories = this.extractFromMessage(userMessage, 'user');
    memories.push(...userMemories);

    // Extract from AI response (less common but possible)
    const aiMemories = this.extractFromMessage(aiResponse, 'ai');
    memories.push(...aiMemories);

    // Generate conversation summary if significant
    const summary = await this.generateConversationSummary(userMessage, aiResponse);
    if (summary) {
      memories.push({
        fact: summary,
        type: 'experience',
        confidence: 0.8,
        context: `Conversation between user and AI about: ${userMessage.substring(0, 50)}...`,
      });
    }

    return memories;
  }

  private static extractFromMessage(message: string, sender: 'user' | 'ai'): ExtractedMemory[] {
    const memories: ExtractedMemory[] = [];
    const lowerMessage = message.toLowerCase();

    // Name extraction
    if (
      lowerMessage.includes('my name is') ||
      lowerMessage.includes("i'm") ||
      lowerMessage.includes('i am')
    ) {
      const nameMatch = message.match(/(?:my name is|i'm|i am)\s+([a-zA-Z\s]+)/i);
      if (nameMatch && nameMatch[1]) {
        memories.push({
          fact: `User's name is ${nameMatch[1].trim()}`,
          type: 'personal',
          confidence: 0.95,
        });
      }
    }

    // Location extraction
    if (
      lowerMessage.includes('i live') ||
      lowerMessage.includes("i'm from") ||
      lowerMessage.includes('in ')
    ) {
      const locationMatch = message.match(/(?:i live|i'm from|in)\s+([a-zA-Z\s,]+)/i);
      if (locationMatch && locationMatch[1]) {
        memories.push({
          fact: `User lives in ${locationMatch[1].trim()}`,
          type: 'personal',
          confidence: 0.9,
        });
      }
    }

    // Interests and preferences
    if (
      lowerMessage.includes('i like') ||
      lowerMessage.includes('i love') ||
      lowerMessage.includes('i enjoy')
    ) {
      const interestMatch = message.match(/(?:i like|i love|i enjoy)\s+(.+?)(?:\.|!|\?|$)/i);
      if (interestMatch && interestMatch[1]) {
        const interest = interestMatch[1].trim();
        memories.push({
          fact: `User likes ${interest}`,
          type: 'preference',
          confidence: 0.85,
        });
      }
    }

    if (
      lowerMessage.includes("i don't like") ||
      lowerMessage.includes('i hate') ||
      lowerMessage.includes('i dislike')
    ) {
      const dislikeMatch = message.match(/(?:i don't like|i hate|i dislike)\s+(.+?)(?:\.|!|\?|$)/i);
      if (dislikeMatch && dislikeMatch[1]) {
        const dislike = dislikeMatch[1].trim();
        memories.push({
          fact: `User dislikes ${dislike}`,
          type: 'preference',
          confidence: 0.85,
        });
      }
    }

    // Experiences and events
    if (
      lowerMessage.includes('i went') ||
      lowerMessage.includes('i visited') ||
      lowerMessage.includes('i did')
    ) {
      const experienceMatch = message.match(/(?:i went|i visited|i did)\s+(.+?)(?:\.|!|\?|$)/i);
      if (experienceMatch && experienceMatch[1]) {
        const experience = experienceMatch[1].trim();
        memories.push({
          fact: `User experienced: ${experience}`,
          type: 'experience',
          confidence: 0.8,
        });
      }
    }

    // Work/occupation
    if (
      lowerMessage.includes('i work') ||
      lowerMessage.includes("i'm a") ||
      lowerMessage.includes('my job')
    ) {
      const workMatch = message.match(/(?:i work as|i'm a|my job is)\s+(.+?)(?:\.|!|\?|$)/i);
      if (workMatch && workMatch[1]) {
        const job = workMatch[1].trim();
        memories.push({
          fact: `User's occupation: ${job}`,
          type: 'personal',
          confidence: 0.9,
        });
      }
    }

    // Family relationships
    if (
      lowerMessage.includes('my ') &&
      (lowerMessage.includes('brother') ||
        lowerMessage.includes('sister') ||
        lowerMessage.includes('mother') ||
        lowerMessage.includes('father') ||
        lowerMessage.includes('parent'))
    ) {
      const familyMatch = message.match(/my\s+(.+?)(?:\s+is|\s+has|\s+and|\.|\!|\?|$)/i);
      if (familyMatch && familyMatch[1]) {
        const familyInfo = familyMatch[1].trim();
        memories.push({
          fact: `User's family: ${familyInfo}`,
          type: 'relationship',
          confidence: 0.8,
        });
      }
    }

    // Goals and aspirations
    if (
      lowerMessage.includes('i want') ||
      lowerMessage.includes('i hope') ||
      lowerMessage.includes('my goal')
    ) {
      const goalMatch = message.match(/(?:i want|i hope|my goal is)\s+(.+?)(?:\.|!|\?|$)/i);
      if (goalMatch && goalMatch[1]) {
        const goal = goalMatch[1].trim();
        memories.push({
          fact: `User's goal/aspiration: ${goal}`,
          type: 'personal',
          confidence: 0.75,
        });
      }
    }

    return memories;
  }

  private static async generateConversationSummary(
    userMessage: string,
    aiResponse: string
  ): Promise<string | null> {
    // Only generate summaries for substantial conversations
    const totalLength = userMessage.length + aiResponse.length;
    if (totalLength < 100) return null;

    // Simple heuristic-based summarization
    const userTopics = this.extractTopics(userMessage);
    const aiTopics = this.extractTopics(aiResponse);

    if (userTopics.length > 0) {
      return `Conversation about: ${userTopics.slice(0, 3).join(', ')}`;
    }

    return null;
  }

  private static extractTopics(text: string): string[] {
    const topics: string[] = [];
    const lowerText = text.toLowerCase();

    // Common topic keywords
    const topicKeywords = {
      work: ['work', 'job', 'career', 'office', 'business'],
      family: ['family', 'parent', 'child', 'brother', 'sister', 'mother', 'father'],
      hobbies: ['hobby', 'sport', 'music', 'book', 'movie', 'game', 'art'],
      health: ['health', 'doctor', 'medicine', 'exercise', 'diet'],
      travel: ['travel', 'trip', 'vacation', 'visit', 'place'],
      technology: ['computer', 'phone', 'internet', 'software', 'app'],
      emotions: ['happy', 'sad', 'angry', 'excited', 'worried', 'stressed'],
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        topics.push(topic);
      }
    }

    return [...new Set(topics)]; // Remove duplicates
  }
}

export class MemoryEmbedder {
  private static readonly BATCH_SIZE = 10; // Process memories in batches
  private static readonly EPHEMERAL_TTL = 24 * 60 * 60 * 1000; // 24 hours for ephemeral memories

  /**
   * Generate embeddings for memories and store them (with batch processing)
   */
  static async embedAndStoreMemories(
    memories: ExtractedMemory[],
    userId: number,
    aiId: number
  ): Promise<void> {
    if (memories.length === 0) return;

    // Process memories in batches for better performance
    for (let i = 0; i < memories.length; i += this.BATCH_SIZE) {
      const batch = memories.slice(i, i + this.BATCH_SIZE);
      await this.processBatch(batch, userId, aiId);
    }
  }

  /**
   * Process a batch of memories
   */
  private static async processBatch(
    memories: ExtractedMemory[],
    userId: number,
    aiId: number
  ): Promise<void> {
    const promises = memories.map(async (memory) => {
      try {
        // Generate embedding for the fact
        const embedding = await localAIService.generateEmbeddings(memory.fact);

        if (embedding && embedding.length > 0) {
          // Determine TTL based on memory type and confidence
          const ttl = this.calculateTTL(memory);

          // Store in database with embedding
          await Database.createMemory(userId, aiId, memory.fact, memory.type, embedding);
        }
      } catch (error) {
        console.error('Failed to embed and store memory:', error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Calculate TTL for memory based on type and confidence
   */
  private static calculateTTL(memory: ExtractedMemory): number | null {
    // Ephemeral memories (short-term, low confidence)
    if (memory.confidence < 0.7) {
      return this.EPHEMERAL_TTL; // 24 hours
    }

    // Personal and relationship memories are long-term
    if (memory.type === 'personal' || memory.type === 'relationship') {
      return null; // No expiration
    }

    // Preferences and experiences expire after 7 days
    if (memory.type === 'preference' || memory.type === 'experience') {
      return 7 * 24 * 60 * 60 * 1000; // 7 days
    }

    // Knowledge memories expire after 30 days
    return 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  /**
   * Clean up expired ephemeral memories
   * TODO: Implement when database supports TTL
   */
  static async cleanupExpiredMemories(): Promise<number> {
    // Placeholder for future TTL-based memory cleanup
    console.log('Memory cleanup not yet implemented');
    return 0;
  }

  /**
   * Retrieve top-N similar memories for a query
   */
  static async retrieveRelevantMemories(
    query: string,
    userId: number,
    aiId: number,
    limit: number = 5
  ): Promise<any[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await localAIService.generateEmbeddings(query);

      if (!queryEmbedding || queryEmbedding.length === 0) {
        return [];
      }

      // Find similar memories
      const similarMemories = await Database.findSimilarMemories(
        userId,
        aiId,
        queryEmbedding,
        limit
      );

      return similarMemories;
    } catch (error) {
      console.error('Failed to retrieve relevant memories:', error);
      return [];
    }
  }

  /**
   * Retrieve memories across all AI companions
   */
  static async retrieveCrossAIMemories(
    query: string,
    userId: number,
    limit: number = 5
  ): Promise<any[]> {
    try {
      const queryEmbedding = await localAIService.generateEmbeddings(query);

      if (!queryEmbedding || queryEmbedding.length === 0) {
        return [];
      }

      const similarMemories = await Database.findSimilarMemoriesAcrossAIs(
        userId,
        queryEmbedding,
        limit
      );

      return similarMemories;
    } catch (error) {
      console.error('Failed to retrieve cross-AI memories:', error);
      return [];
    }
  }
}

export class MemoryManager {
  /**
   * Process a conversation and extract/store memories
   */
  static async processConversation(
    userMessage: string,
    aiResponse: string,
    userId: number,
    aiId: number
  ): Promise<void> {
    try {
      // Extract memories from the conversation
      const extractedMemories = await MemoryExtractor.extractFromConversation(
        userMessage,
        aiResponse,
        userId,
        aiId
      );

      // Embed and store the memories
      if (extractedMemories.length > 0) {
        await MemoryEmbedder.embedAndStoreMemories(extractedMemories, userId, aiId);
      }
    } catch (error) {
      console.error('Failed to process conversation for memories:', error);
    }
  }

  /**
   * Get relevant context memories for a chat
   */
  static async getChatContext(
    currentMessage: string,
    userId: number,
    aiId: number,
    includeCrossAI: boolean = false,
    limit: number = 5
  ): Promise<string[]> {
    try {
      const relevantMemories: any[] = [];

      // Get memories specific to this AI
      const aiMemories = await MemoryEmbedder.retrieveRelevantMemories(
        currentMessage,
        userId,
        aiId,
        Math.floor(limit / 2)
      );

      relevantMemories.push(...aiMemories);

      // Optionally include cross-AI memories
      if (includeCrossAI) {
        const crossAIMemories = await MemoryEmbedder.retrieveCrossAIMemories(
          currentMessage,
          userId,
          Math.floor(limit / 2)
        );
        relevantMemories.push(...crossAIMemories);
      }

      // Format memories for context injection
      return relevantMemories
        .filter(memory => memory.similarity > 0.7) // Only highly relevant memories
        .sort((a, b) => b.similarity - a.similarity) // Sort by similarity
        .slice(0, limit)
        .map(memory => {
          const aiName = memory.ai_name ? ` (${memory.ai_name})` : '';
          return `Relevant memory${aiName}: ${memory.fact_text}`;
        });
    } catch (error) {
      console.error('Failed to get chat context memories:', error);
      return [];
    }
  }
}
