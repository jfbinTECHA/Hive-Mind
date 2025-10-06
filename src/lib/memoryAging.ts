import { Database } from './database';

// Integrate with existing AIMemory class
export class EnhancedAIMemory {
  private agingSystem: MemoryAgingSystem;
  private nomiInstance: string;

  constructor(nomiInstance: string = 'AI Hive Mind') {
    this.nomiInstance = nomiInstance;
    this.agingSystem = memoryAgingSystem;
  }

  /**
   * Enhanced memory retrieval with aging consideration
   */
  async getRelevantMemories(query: string, userId: string, limit: number = 5): Promise<string[]> {
    const agedMemories = await this.agingSystem.getMemorySuggestions(
      query,
      userId,
      undefined,
      limit
    );

    // Convert to response-ready strings
    return agedMemories.map(memory => {
      const decayedContent = this.agingSystem.applyFuzziness(
        memory.originalContent,
        memory.decayFactor
      );
      return this.agingSystem.createMemoryReference(
        {
          ...memory,
          fuzzyContent: decayedContent,
        },
        query
      );
    });
  }

  /**
   * Store memory with aging metadata
   */
  async storeMemory(
    userId: string,
    factText: string,
    factType: string = 'general',
    importanceScore: number = 1.0,
    tags: string[] = []
  ): Promise<void> {
    // Store in database with aging fields
    await Database.createMemoryWithAging(
      parseInt(userId),
      1, // Default character ID - would need to be passed
      factText,
      factType,
      importanceScore,
      tags
    );
  }

  /**
   * Get memory health for this AI instance
   */
  async getMemoryHealth(userId: string) {
    return await this.agingSystem.getMemoryHealthStats(userId);
  }
}

export interface MemoryDecayConfig {
  // Time-based decay parameters
  shortTermDecay: number; // Hours for short-term memory decay
  mediumTermDecay: number; // Days for medium-term memory decay
  longTermDecay: number; // Weeks for long-term memory decay

  // Decay rates (0-1, where 1 = no decay, 0 = complete decay)
  shortTermDecayRate: number; // How fast short-term memories decay
  mediumTermDecayRate: number; // How fast medium-term memories decay
  longTermDecayRate: number; // How fast long-term memories decay

  // Access-based strengthening
  accessStrengthFactor: number; // How much access strengthens memory

  // Importance thresholds
  archiveThreshold: number; // Decay factor below which memories are archived
  deleteThreshold: number; // Decay factor below which memories are deleted

  // Fuzzy memory parameters
  fuzzinessFactor: number; // How fuzzy memories become over time
  consolidationInterval: number; // Hours between memory consolidation runs
}

export interface AgedMemory {
  id: string;
  originalContent: string;
  fuzzyContent: string;
  decayFactor: number; // 0-1, where 1 = perfect recall, 0 = forgotten
  importanceScore: number; // 0-1, based on access frequency and emotional impact
  lastAccessed: Date;
  createdAt: Date;
  memoryType: 'conversation' | 'fact' | 'emotional' | 'personal';
  tags: string[];
  isArchived: boolean;
  consolidationCount: number; // How many times this memory has been consolidated
}

export class MemoryAgingSystem {
  private config: MemoryDecayConfig;
  private lastConsolidationRun: Date;

  constructor(config?: Partial<MemoryDecayConfig>) {
    this.config = {
      shortTermDecay: 24, // 24 hours
      mediumTermDecay: 7, // 7 days
      longTermDecay: 30, // 30 days
      shortTermDecayRate: 0.95, // 5% decay per hour initially
      mediumTermDecayRate: 0.98, // 2% decay per day
      longTermDecayRate: 0.995, // 0.5% decay per week
      accessStrengthFactor: 0.1, // 10% strength increase per access
      archiveThreshold: 0.3, // Archive below 30% decay
      deleteThreshold: 0.1, // Delete below 10% decay
      fuzzinessFactor: 0.1, // 10% fuzziness increase over time
      consolidationInterval: 6, // 6 hours between consolidation
      ...config,
    };
    this.lastConsolidationRun = new Date();
  }

  /**
   * Calculate decay factor based on memory age and access patterns
   */
  calculateDecayFactor(memory: AgedMemory, currentTime: Date = new Date()): number {
    const ageInHours = (currentTime.getTime() - memory.createdAt.getTime()) / (1000 * 60 * 60);
    const timeSinceAccess =
      (currentTime.getTime() - memory.lastAccessed.getTime()) / (1000 * 60 * 60);

    let baseDecay = 1.0;

    // Apply time-based decay
    if (ageInHours < this.config.shortTermDecay) {
      // Short-term decay (first 24 hours)
      const decayCycles = ageInHours;
      baseDecay = Math.pow(this.config.shortTermDecayRate, decayCycles);
    } else if (ageInHours < this.config.mediumTermDecay * 24) {
      // Medium-term decay (24 hours to 7 days)
      const shortTermDecay = Math.pow(this.config.shortTermDecayRate, this.config.shortTermDecay);
      const mediumTermHours = ageInHours - this.config.shortTermDecay;
      const mediumTermDecay = Math.pow(this.config.mediumTermDecayRate, mediumTermHours / 24);
      baseDecay = shortTermDecay * mediumTermDecay;
    } else {
      // Long-term decay (7+ days)
      const shortTermDecay = Math.pow(this.config.shortTermDecayRate, this.config.shortTermDecay);
      const mediumTermDecay = Math.pow(
        this.config.mediumTermDecayRate,
        this.config.mediumTermDecay
      );
      const longTermDays = (ageInHours - this.config.mediumTermDecay * 24) / 24;
      const longTermDecay = Math.pow(this.config.longTermDecayRate, longTermDays / 7);
      baseDecay = shortTermDecay * mediumTermDecay * longTermDecay;
    }

    // Apply access-based strengthening
    const accessStrength = Math.min(
      0.5,
      memory.consolidationCount * this.config.accessStrengthFactor
    );
    const importanceBoost = memory.importanceScore * 0.3;

    return Math.min(1.0, baseDecay + accessStrength + importanceBoost);
  }

  /**
   * Apply fuzziness to memory content based on decay
   */
  applyFuzziness(originalContent: string, decayFactor: number): string {
    if (decayFactor > 0.8) return originalContent; // Nearly perfect recall

    const fuzziness = (1 - decayFactor) * this.config.fuzzinessFactor;
    const words = originalContent.split(' ');

    // Apply different types of fuzziness based on decay level
    if (decayFactor < 0.5) {
      // Heavy fuzziness - replace words with synonyms or generic terms
      return this.applyHeavyFuzziness(words, fuzziness);
    } else if (decayFactor < 0.7) {
      // Medium fuzziness - add uncertainty markers
      return this.applyMediumFuzziness(words, fuzziness);
    } else {
      // Light fuzziness - minor alterations
      return this.applyLightFuzziness(words, fuzziness);
    }
  }

  private applyLightFuzziness(words: string[], fuzziness: number): string {
    return words
      .map(word => {
        if (Math.random() < fuzziness * 0.3) {
          // Occasionally replace with similar-sounding word or add "something like"
          return Math.random() < 0.5 ? `something like ${word}` : word;
        }
        return word;
      })
      .join(' ');
  }

  private applyMediumFuzziness(words: string[], fuzziness: number): string {
    const result = words
      .map(word => {
        if (Math.random() < fuzziness * 0.5) {
          return `...${word}...`;
        }
        return word;
      })
      .join(' ');

    // Add uncertainty phrases
    const uncertaintyPhrases = ['I think ', 'As I recall, ', 'If memory serves, ', 'I believe '];

    if (Math.random() < fuzziness) {
      const phrase = uncertaintyPhrases[Math.floor(Math.random() * uncertaintyPhrases.length)];
      return phrase + result.toLowerCase();
    }

    return result;
  }

  private applyHeavyFuzziness(words: string[], fuzziness: number): string {
    // Create very fuzzy representation
    const keyWords = words.filter(word => word.length > 3); // Keep important words
    const fuzzyWords = keyWords.map(word => {
      if (Math.random() < fuzziness * 0.8) {
        // Replace with generic terms
        const generics = ['something', 'someone', 'somewhere', 'sometime', 'somehow'];
        return generics[Math.floor(Math.random() * generics.length)];
      }
      return word;
    });

    const result = fuzzyWords.join(' ');
    return `I vaguely remember ${result}... it's all quite fuzzy now.`;
  }

  /**
   * Consolidate memories - strengthen important ones, archive old ones
   */
  async consolidateMemories(
    userId: string,
    characterId?: string
  ): Promise<{
    consolidated: number;
    archived: number;
    deleted: number;
  }> {
    const currentTime = new Date();
    const cutoffTime = new Date(
      currentTime.getTime() - this.config.consolidationInterval * 60 * 60 * 1000
    );

    // Only run consolidation if enough time has passed
    if (this.lastConsolidationRun > cutoffTime) {
      return { consolidated: 0, archived: 0, deleted: 0 };
    }

    this.lastConsolidationRun = currentTime;

    // Get memories to process
    const memories = await Database.getMemoriesForConsolidation(
      parseInt(userId),
      characterId ? parseInt(characterId) : undefined
    );

    let consolidated = 0;
    let archived = 0;
    let deleted = 0;

    for (const memory of memories) {
      const agedMemory = this.createAgedMemory(memory);
      const decayFactor = this.calculateDecayFactor(agedMemory, currentTime);

      if (decayFactor < this.config.deleteThreshold) {
        // Delete very decayed memories
        await Database.deleteMemory(memory.id);
        deleted++;
      } else if (decayFactor < this.config.archiveThreshold) {
        // Archive moderately decayed memories
        await Database.archiveMemory(memory.id);
        archived++;
      } else {
        // Consolidate/strengthen remaining memories
        const fuzzyContent = this.applyFuzziness(memory.fact_text, decayFactor);
        await Database.updateMemoryDecay(memory.id, decayFactor, fuzzyContent);
        consolidated++;
      }
    }

    return { consolidated, archived, deleted };
  }

  /**
   * Access a memory (increases its strength)
   */
  async accessMemory(memoryId: string): Promise<AgedMemory | null> {
    const memory = await Database.getMemoryById(parseInt(memoryId));
    if (!memory) return null;

    const agedMemory = this.createAgedMemory(memory);

    // Strengthen memory through access
    agedMemory.consolidationCount++;
    agedMemory.lastAccessed = new Date();

    // Update in database
    await Database.updateMemoryAccess(parseInt(memoryId), agedMemory.consolidationCount);

    return agedMemory;
  }

  /**
   * Create AgedMemory object from database memory
   */
  private createAgedMemory(dbMemory: any): AgedMemory {
    return {
      id: dbMemory.id.toString(),
      originalContent: dbMemory.fact_text,
      fuzzyContent: dbMemory.fuzzy_content || dbMemory.fact_text,
      decayFactor: dbMemory.decay_factor || 1.0,
      importanceScore: dbMemory.importance_score || 0.5,
      lastAccessed: new Date(dbMemory.last_accessed || dbMemory.updated_at),
      createdAt: new Date(dbMemory.created_at),
      memoryType: dbMemory.fact_type || 'fact',
      tags: dbMemory.tags || [],
      isArchived: dbMemory.is_archived || false,
      consolidationCount: dbMemory.consolidation_count || 0,
    };
  }

  /**
   * Get memory retrieval suggestions with decay consideration
   */
  async getMemorySuggestions(
    query: string,
    userId: string,
    characterId?: string,
    limit: number = 5
  ): Promise<AgedMemory[]> {
    const candidates = await Database.searchMemories(
      query,
      parseInt(userId),
      characterId ? parseInt(characterId) : undefined,
      limit * 2
    );

    // Apply decay and ranking
    const agedMemories = candidates.map(mem => {
      const aged = this.createAgedMemory(mem);
      aged.decayFactor = this.calculateDecayFactor(aged);
      return aged;
    });

    // Sort by relevance and decay factor
    agedMemories.sort((a, b) => {
      const scoreA = a.decayFactor * a.importanceScore;
      const scoreB = b.decayFactor * b.importanceScore;
      return scoreB - scoreA;
    });

    return agedMemories.slice(0, limit);
  }

  /**
   * Get a decayed memory for response generation
   */
  async getDecayedMemoryForResponse(memoryId: string): Promise<string | null> {
    const agedMemory = await this.accessMemory(memoryId);
    if (!agedMemory) return null;

    // Return fuzzy content if decay is significant
    if (agedMemory.decayFactor < 0.7) {
      return agedMemory.fuzzyContent || agedMemory.originalContent;
    }

    return agedMemory.originalContent;
  }

  /**
   * Create a human-like memory reference
   */
  createMemoryReference(agedMemory: AgedMemory, context: string): string {
    const decayLevel = agedMemory.decayFactor;

    if (decayLevel > 0.8) {
      // Clear memory
      return `"${agedMemory.originalContent}"`;
    } else if (decayLevel > 0.6) {
      // Slightly fuzzy
      return `I think "${agedMemory.fuzzyContent || agedMemory.originalContent}"`;
    } else if (decayLevel > 0.4) {
      // Moderately fuzzy
      return `As I recall, something about "${agedMemory.fuzzyContent || agedMemory.originalContent}"`;
    } else {
      // Very fuzzy
      return `I vaguely remember ${agedMemory.fuzzyContent || agedMemory.originalContent}`;
    }
  }

  /**
   * Calculate memory health statistics
   */
  async getMemoryHealthStats(
    userId: string,
    characterId?: string
  ): Promise<{
    totalMemories: number;
    activeMemories: number;
    archivedMemories: number;
    averageDecay: number;
    oldestMemory: Date | null;
    newestMemory: Date | null;
  }> {
    const stats = await Database.getMemoryStats(
      parseInt(userId),
      characterId ? parseInt(characterId) : undefined
    );

    return {
      totalMemories: stats.total,
      activeMemories: stats.active,
      archivedMemories: stats.archived,
      averageDecay: stats.average_decay || 1.0,
      oldestMemory: stats.oldest_memory ? new Date(stats.oldest_memory) : null,
      newestMemory: stats.newest_memory ? new Date(stats.newest_memory) : null,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MemoryDecayConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): MemoryDecayConfig {
    return { ...this.config };
  }
}

// Global memory aging system instance
export const memoryAgingSystem = new MemoryAgingSystem();

// Periodic consolidation (run every 6 hours)
setInterval(
  async () => {
    try {
      // This would need to be called for each user - in a real implementation,
      // this would be handled by a background job system
      console.log('Memory consolidation cycle started');
    } catch (error) {
      console.error('Memory consolidation error:', error);
    }
  },
  6 * 60 * 60 * 1000
); // 6 hours
