import { Database } from './database';

export interface SharedMemory {
  id: string;
  originalCompanionId: string;
  sharedWithCompanions: string[];
  memoryType: 'personal' | 'experience' | 'relationship' | 'knowledge' | 'shared_experience';
  content: string;
  context: {
    participants: string[]; // All companions involved
    userId: string;
    conversationId?: string;
    timestamp: Date;
    location?: string;
    emotionalContext?: any;
  };
  metadata: {
    importance: number; // 0-1, how important this memory is
    emotionalImpact: number; // -1 to 1, emotional valence
    recurrence: number; // How many times this type of memory has occurred
    lastReferenced: Date;
    tags: string[];
    connections: MemoryConnection[];
  };
  accessPermissions: {
    [companionId: string]: 'read' | 'write' | 'admin';
  };
}

export interface MemoryConnection {
  type: 'similar' | 'related' | 'contrasting' | 'sequential' | 'causal';
  targetMemoryId: string;
  strength: number; // 0-1
  description: string;
  createdBy: string; // Companion that created this connection
}

export interface CompanionMemoryNetwork {
  companionId: string;
  connectedCompanions: {
    [companionId: string]: {
      relationshipStrength: number; // 0-1
      sharedMemories: number;
      lastInteraction: Date;
      trustLevel: number;
    };
  };
  memoryClusters: MemoryCluster[];
  networkInsights: NetworkInsight[];
}

export interface MemoryCluster {
  id: string;
  theme: string;
  memories: string[]; // Memory IDs
  participants: string[]; // Companion IDs
  createdAt: Date;
  significance: number; // 0-1
}

export interface NetworkInsight {
  type: 'relationship_pattern' | 'memory_theme' | 'emotional_trend' | 'interaction_preference';
  description: string;
  confidence: number; // 0-1
  relatedCompanions: string[];
  relatedMemories: string[];
  generatedAt: Date;
}

export class SharedMemorySystem {
  private static readonly MEMORY_SHARING_THRESHOLDS = {
    relationshipStrength: 0.6, // Minimum relationship strength for sharing
    trustLevel: 0.5, // Minimum trust for deep memory sharing
    emotionalImpact: 0.7, // Minimum emotional impact for automatic sharing
    timeDecay: 30 * 24 * 60 * 60 * 1000, // 30 days for memory relevance
  };

  /**
   * Share a memory with other companions
   */
  async shareMemory(
    memoryId: string,
    fromCompanionId: string,
    toCompanionIds: string[],
    permissionLevel: 'read' | 'write' | 'admin' = 'read'
  ): Promise<SharedMemory> {
    // Get the original memory
    const originalMemory = await this.getMemoryById(memoryId);
    if (!originalMemory) {
      throw new Error('Memory not found');
    }

    // Check if sharing is allowed based on relationships
    const network = await this.getCompanionNetwork(fromCompanionId);
    const allowedCompanions = toCompanionIds.filter(companionId => {
      const connection = network.connectedCompanions[companionId];
      return connection &&
             connection.relationshipStrength >= SharedMemorySystem.MEMORY_SHARING_THRESHOLDS.relationshipStrength &&
             connection.trustLevel >= SharedMemorySystem.MEMORY_SHARING_THRESHOLDS.trustLevel;
    });

    if (allowedCompanions.length === 0) {
      throw new Error('No companions meet the requirements for memory sharing');
    }

    // Create shared memory
    const sharedMemory: SharedMemory = {
      id: `shared_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalCompanionId: fromCompanionId,
      sharedWithCompanions: allowedCompanions,
      memoryType: originalMemory.type,
      content: originalMemory.content,
      context: {
        participants: [fromCompanionId, ...allowedCompanions],
        userId: originalMemory.userId,
        conversationId: originalMemory.conversationId,
        timestamp: new Date(),
        location: originalMemory.location,
        emotionalContext: originalMemory.emotionalContext
      },
      metadata: {
        importance: originalMemory.importance,
        emotionalImpact: originalMemory.emotionalImpact,
        recurrence: originalMemory.recurrence,
        lastReferenced: new Date(),
        tags: [...originalMemory.tags, 'shared'],
        connections: []
      },
      accessPermissions: {
        [fromCompanionId]: 'admin',
        ...allowedCompanions.reduce((acc, id) => ({ ...acc, [id]: permissionLevel }), {})
      }
    };

    // Store shared memory
    await this.storeSharedMemory(sharedMemory);

    // Update companion networks
    for (const companionId of allowedCompanions) {
      await this.updateCompanionNetwork(fromCompanionId, companionId, 'memory_shared');
    }

    return sharedMemory;
  }

  /**
   * Get memories accessible to a companion
   */
  async getAccessibleMemories(companionId: string): Promise<SharedMemory[]> {
    // Get companion's own memories
    const ownMemories = await this.getCompanionMemories(companionId);

    // Get shared memories accessible to this companion
    const sharedMemories = await this.getSharedMemoriesForCompanion(companionId);

    // Combine and deduplicate
    const allMemories = [...ownMemories, ...sharedMemories];
    const uniqueMemories = allMemories.filter((memory, index, self) =>
      index === self.findIndex(m => m.id === memory.id)
    );

    return uniqueMemories.sort((a, b) =>
      new Date(b.metadata.lastReferenced).getTime() - new Date(a.metadata.lastReferenced).getTime()
    );
  }

  /**
   * Create memory connections between companions
   */
  async createMemoryConnection(
    fromCompanionId: string,
    memoryId1: string,
    memoryId2: string,
    connectionType: MemoryConnection['type'],
    description: string
  ): Promise<MemoryConnection> {
    const connection: MemoryConnection = {
      type: connectionType,
      targetMemoryId: memoryId2,
      strength: 0.5, // Default strength
      description,
      createdBy: fromCompanionId
    };

    // Add connection to memory
    await this.addConnectionToMemory(memoryId1, connection);

    // Update companion network
    const memory1 = await this.getMemoryById(memoryId1);
    const memory2 = await this.getMemoryById(memoryId2);

    if (memory1 && memory2) {
      const companion1 = memory1.companionId;
      const companion2 = memory2.companionId;

      if (companion1 !== companion2) {
        await this.updateCompanionNetwork(companion1, companion2, 'memory_connection');
      }
    }

    return connection;
  }

  /**
   * Generate network insights
   */
  async generateNetworkInsights(companionId: string): Promise<NetworkInsight[]> {
    const network = await this.getCompanionNetwork(companionId);
    const memories = await this.getAccessibleMemories(companionId);
    const insights: NetworkInsight[] = [];

    // Analyze relationship patterns
    const strongConnections = Object.entries(network.connectedCompanions)
      .filter(([, connection]) => connection.relationshipStrength > 0.8)
      .map(([id]) => id);

    if (strongConnections.length > 0) {
      insights.push({
        type: 'relationship_pattern',
        description: `Strong connections with ${strongConnections.length} companion(s)`,
        confidence: 0.9,
        relatedCompanions: strongConnections,
        relatedMemories: [],
        generatedAt: new Date()
      });
    }

    // Analyze memory themes
    const themes = this.extractMemoryThemes(memories);
    const dominantTheme = themes[0];

    if (dominantTheme && dominantTheme.memories.length > 3) {
      insights.push({
        type: 'memory_theme',
        description: `Dominant memory theme: ${dominantTheme.theme} (${dominantTheme.memories.length} memories)`,
        confidence: 0.8,
        relatedCompanions: dominantTheme.participants,
        relatedMemories: dominantTheme.memories,
        generatedAt: new Date()
      });
    }

    // Analyze emotional trends
    const emotionalTrend = this.analyzeEmotionalTrends(memories);
    if (emotionalTrend.confidence > 0.7) {
      insights.push({
        type: 'emotional_trend',
        description: emotionalTrend.description,
        confidence: emotionalTrend.confidence,
        relatedCompanions: emotionalTrend.companions,
        relatedMemories: emotionalTrend.memories,
        generatedAt: new Date()
      });
    }

    // Store insights
    await this.storeNetworkInsights(companionId, insights);

    return insights;
  }

  /**
   * Get companion network information
   */
  async getCompanionNetwork(companionId: string): Promise<CompanionMemoryNetwork> {
    // In a real implementation, this would query the database
    // For now, return mock data
    return {
      companionId,
      connectedCompanions: {},
      memoryClusters: [],
      networkInsights: []
    };
  }

  /**
   * Automatically share important memories
   */
  async autoShareMemories(companionId: string): Promise<SharedMemory[]> {
    const memories = await this.getCompanionMemories(companionId);
    const network = await this.getCompanionNetwork(companionId);

    const importantMemories = memories.filter(memory =>
      memory.metadata.importance > 0.8 ||
      Math.abs(memory.metadata.emotionalImpact) > SharedMemorySystem.MEMORY_SHARING_THRESHOLDS.emotionalImpact
    );

    const sharedMemories: SharedMemory[] = [];

    for (const memory of importantMemories) {
      // Find suitable companions to share with
      const suitableCompanions = Object.keys(network.connectedCompanions).filter(id => {
        const connection = network.connectedCompanions[id];
        return connection.relationshipStrength > SharedMemorySystem.MEMORY_SHARING_THRESHOLDS.relationshipStrength;
      });

      if (suitableCompanions.length > 0) {
        try {
          const shared = await this.shareMemory(memory.id, companionId, suitableCompanions);
          sharedMemories.push(shared);
        } catch (error) {
          console.error('Auto-sharing failed:', error);
        }
      }
    }

    return sharedMemories;
  }

  /**
   * Get memory clusters for visualization
   */
  async getMemoryClusters(companionId: string): Promise<MemoryCluster[]> {
    const memories = await this.getAccessibleMemories(companionId);
    return this.clusterMemoriesByTheme(memories);
  }

  // Private helper methods

  private async getMemoryById(memoryId: string): Promise<any> {
    // Mock implementation - would query database
    return null;
  }

  private async getCompanionMemories(companionId: string): Promise<SharedMemory[]> {
    // Mock implementation - would query database
    return [];
  }

  private async getSharedMemoriesForCompanion(companionId: string): Promise<SharedMemory[]> {
    // Mock implementation - would query database
    return [];
  }

  private async storeSharedMemory(memory: SharedMemory): Promise<void> {
    // Mock implementation - would store in database
    console.log('Storing shared memory:', memory.id);
  }

  private async updateCompanionNetwork(companionId1: string, companionId2: string, eventType: string): Promise<void> {
    // Mock implementation - would update database
    console.log('Updating network:', companionId1, companionId2, eventType);
  }

  private async addConnectionToMemory(memoryId: string, connection: MemoryConnection): Promise<void> {
    // Mock implementation - would update database
    console.log('Adding connection to memory:', memoryId, connection);
  }

  private async storeNetworkInsights(companionId: string, insights: NetworkInsight[]): Promise<void> {
    // Mock implementation - would store in database
    console.log('Storing insights for:', companionId, insights.length);
  }

  private extractMemoryThemes(memories: SharedMemory[]): Array<{ theme: string; memories: string[]; participants: string[] }> {
    const themes: { [key: string]: { memories: string[]; participants: Set<string> } } = {};

    memories.forEach(memory => {
      // Simple theme extraction based on content keywords
      const content = memory.content.toLowerCase();
      let theme = 'general';

      if (content.includes('happy') || content.includes('joy') || content.includes('fun')) {
        theme = 'joy';
      } else if (content.includes('sad') || content.includes('difficult') || content.includes('challenge')) {
        theme = 'difficulty';
      } else if (content.includes('learn') || content.includes('study') || content.includes('knowledge')) {
        theme = 'learning';
      } else if (content.includes('relationship') || content.includes('friend') || content.includes('family')) {
        theme = 'relationships';
      }

      if (!themes[theme]) {
        themes[theme] = { memories: [], participants: new Set() };
      }

      themes[theme].memories.push(memory.id);
      memory.context.participants.forEach(p => themes[theme].participants.add(p));
    });

    return Object.entries(themes).map(([theme, data]) => ({
      theme,
      memories: data.memories,
      participants: Array.from(data.participants)
    }));
  }

  private analyzeEmotionalTrends(memories: SharedMemory[]): {
    description: string;
    confidence: number;
    companions: string[];
    memories: string[];
  } {
    const recentMemories = memories.filter(memory =>
      Date.now() - memory.context.timestamp.getTime() < SharedMemorySystem.MEMORY_SHARING_THRESHOLDS.timeDecay
    );

    const avgEmotionalImpact = recentMemories.reduce((sum, m) => sum + m.metadata.emotionalImpact, 0) / recentMemories.length;

    let description = '';
    let confidence = 0.5;

    if (avgEmotionalImpact > 0.3) {
      description = 'Generally positive emotional experiences recently';
      confidence = 0.8;
    } else if (avgEmotionalImpact < -0.3) {
      description = 'Some challenging emotional experiences recently';
      confidence = 0.8;
    } else {
      description = 'Balanced emotional experiences';
      confidence = 0.6;
    }

    const allCompanions = new Set(recentMemories.flatMap(m => m.context.participants));
    const memoryIds = recentMemories.map(m => m.id);

    return {
      description,
      confidence,
      companions: Array.from(allCompanions),
      memories: memoryIds
    };
  }

  private clusterMemoriesByTheme(memories: SharedMemory[]): MemoryCluster[] {
    const themes = this.extractMemoryThemes(memories);

    return themes.map((theme, index) => ({
      id: `cluster_${index}`,
      theme: theme.theme,
      memories: theme.memories,
      participants: theme.participants,
      createdAt: new Date(),
      significance: theme.memories.length / memories.length
    })).filter(cluster => cluster.significance > 0.1);
  }
}

// Global shared memory system instance
export const sharedMemorySystem = new SharedMemorySystem();