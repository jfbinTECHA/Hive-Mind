import { multiModalProcessor } from './multiModal';

export interface CachedMessage {
  id: string;
  userId: number;
  characterId: number;
  message: string;
  timestamp: Date;
  response?: string;
  aiResponse?: string;
  synced: boolean;
  retryCount: number;
  multimodalData?: any;
}

export interface CachedMemory {
  id: string;
  userId: number;
  characterId: number;
  type: 'conversation' | 'knowledge' | 'relationship' | 'multimodal';
  data: any;
  timestamp: Date;
  synced: boolean;
}

export interface OfflineQueueItem {
  id: string;
  type: 'message' | 'memory' | 'multimodal' | 'sync';
  data: any;
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
  retryCount: number;
  maxRetries: number;
}

export class OfflineCacheManager {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private dbVersion: number = 1;

  constructor() {
    this.initIndexedDB();
    this.setupNetworkListeners();
  }

  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AIHiveMind_Offline', this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };
    });
  }

  private createObjectStores(db: IDBDatabase): void {
    // Messages store
    if (!db.objectStoreNames.contains('messages')) {
      const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
      messagesStore.createIndex('userId', 'userId', { unique: false });
      messagesStore.createIndex('synced', 'synced', { unique: false });
      messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
    }

    // Memory store
    if (!db.objectStoreNames.contains('memory')) {
      const memoryStore = db.createObjectStore('memory', { keyPath: 'id' });
      memoryStore.createIndex('userId', 'userId', { unique: false });
      memoryStore.createIndex('type', 'type', { unique: false });
      memoryStore.createIndex('synced', 'synced', { unique: false });
      memoryStore.createIndex('timestamp', 'timestamp', { unique: false });
    }

    // Offline queue store
    if (!db.objectStoreNames.contains('offlineQueue')) {
      const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id' });
      queueStore.createIndex('type', 'type', { unique: false });
      queueStore.createIndex('priority', 'priority', { unique: false });
      queueStore.createIndex('timestamp', 'timestamp', { unique: false });
    }

    // Cache metadata store
    if (!db.objectStoreNames.contains('cacheMetadata')) {
      db.createObjectStore('cacheMetadata', { keyPath: 'key' });
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('Back online - starting sync');
      this.isOnline = true;
      this.showOnlineStatus();
      this.startSync();
    });

    window.addEventListener('offline', () => {
      console.log('Gone offline');
      this.isOnline = false;
      this.showOfflineStatus();
    });
  }

  private showOnlineStatus(): void {
    this.showStatusNotification('🟢 Back online - syncing data...', 'success');
  }

  private showOfflineStatus(): void {
    this.showStatusNotification('🟡 You are offline - responses may be limited', 'warning');
  }

  private showStatusNotification(message: string, type: 'success' | 'warning' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `status-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: bold;
      z-index: 1000;
      max-width: 300px;
      ${type === 'success' ? 'background-color: #4caf50;' :
        type === 'warning' ? 'background-color: #ff9800;' :
        'background-color: #f44336;'}
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 4000);
  }

  // Message caching
  async cacheMessage(messageData: Omit<CachedMessage, 'id' | 'synced' | 'retryCount'>): Promise<void> {
    if (!this.db) await this.initIndexedDB();

    const cachedMessage: CachedMessage = {
      ...messageData,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      synced: this.isOnline,
      retryCount: 0
    };

    const transaction = this.db!.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    await this.promisifyRequest(store.add(cachedMessage));

    if (!this.isOnline) {
      await this.addToOfflineQueue({
        id: `queue_${cachedMessage.id}`,
        type: 'message',
        data: cachedMessage,
        timestamp: new Date(),
        priority: 'high',
        retryCount: 0,
        maxRetries: 3
      });
    }
  }

  // Memory caching
  async cacheMemory(memoryData: Omit<CachedMemory, 'id' | 'synced'>): Promise<void> {
    if (!this.db) await this.initIndexedDB();

    const cachedMemory: CachedMemory = {
      ...memoryData,
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      synced: this.isOnline
    };

    const transaction = this.db!.transaction(['memory'], 'readwrite');
    const store = transaction.objectStore('memory');
    await this.promisifyRequest(store.add(cachedMemory));

    if (!this.isOnline) {
      await this.addToOfflineQueue({
        id: `queue_${cachedMemory.id}`,
        type: 'memory',
        data: cachedMemory,
        timestamp: new Date(),
        priority: 'medium',
        retryCount: 0,
        maxRetries: 3
      });
    }
  }

  // Offline queue management
  private async addToOfflineQueue(item: OfflineQueueItem): Promise<void> {
    if (!this.db) await this.initIndexedDB();

    const transaction = this.db!.transaction(['offlineQueue'], 'readwrite');
    const store = transaction.objectStore('offlineQueue');
    await this.promisifyRequest(store.add(item));
  }

  // Generate offline responses
  async generateOfflineResponse(userMessage: string, userId: number, characterId: number): Promise<string> {
    // Get recent conversation history from cache
    const recentMessages = await this.getRecentMessages(userId, characterId, 10);

    // Get relevant memories from cache
    const relevantMemories = await this.getRelevantMemories(userId, characterId, userMessage);

    // Get relationship data
    const relationshipData = await this.getCachedRelationshipData(userId, characterId);

    // Generate response using cached context
    return this.generateContextualResponse(userMessage, recentMessages, relevantMemories, relationshipData);
  }

  private async getRecentMessages(userId: number, characterId: number, limit: number = 10): Promise<CachedMessage[]> {
    if (!this.db) await this.initIndexedDB();

    const transaction = this.db!.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const index = store.index('userId');

    return new Promise((resolve) => {
      const request = index.openCursor(IDBKeyRange.only(userId));
      const results: CachedMessage[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && results.length < limit) {
          const message = cursor.value as CachedMessage;
          if (message.characterId === characterId) {
            results.push(message);
          }
          cursor.continue();
        } else {
          // Sort by timestamp (most recent first)
          results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          resolve(results);
        }
      };

      request.onerror = () => resolve([]);
    });
  }

  private async getRelevantMemories(userId: number, characterId: number, query: string): Promise<CachedMemory[]> {
    if (!this.db) await this.initIndexedDB();

    const transaction = this.db!.transaction(['memory'], 'readonly');
    const store = transaction.objectStore('memory');
    const index = store.index('userId');

    return new Promise((resolve) => {
      const request = index.openCursor(IDBKeyRange.only(userId));
      const results: CachedMemory[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const memory = cursor.value as CachedMemory;
          if (memory.characterId === characterId && this.isMemoryRelevant(memory, query)) {
            results.push(memory);
          }
          cursor.continue();
        } else {
          resolve(results.slice(0, 5)); // Return top 5 relevant memories
        }
      };

      request.onerror = () => resolve([]);
    });
  }

  private isMemoryRelevant(memory: CachedMemory, query: string): boolean {
    const queryLower = query.toLowerCase();
    const memoryText = JSON.stringify(memory.data).toLowerCase();

    // Simple keyword matching - could be enhanced with better NLP
    const keywords = queryLower.split(' ').filter(word => word.length > 2);
    return keywords.some(keyword => memoryText.includes(keyword));
  }

  private async getCachedRelationshipData(userId: number, characterId: number): Promise<any> {
    // Get relationship data from localStorage (could be moved to IndexedDB)
    const stored = localStorage.getItem('relationshipData');
    return stored ? JSON.parse(stored) : { interactions: [] };
  }

  private generateContextualResponse(
    userMessage: string,
    recentMessages: CachedMessage[],
    relevantMemories: CachedMemory[],
    relationshipData: any
  ): string {
    const relationshipLevel = this.getRelationshipLevelFromData(relationshipData);

    // Analyze user message
    const messageType = this.analyzeMessageType(userMessage);
    const emotionalTone = this.analyzeEmotionalTone(userMessage);

    // Generate response based on context
    let response = '';

    // Use recent conversation context
    if (recentMessages.length > 0) {
      const lastExchange = recentMessages[0];
      if (lastExchange.aiResponse) {
        response = this.continueConversation(userMessage, lastExchange.aiResponse, relationshipLevel);
      }
    }

    // Incorporate relevant memories
    if (relevantMemories.length > 0 && Math.random() < 0.3) {
      const memory = relevantMemories[0];
      response += this.incorporateMemory(memory, relationshipLevel);
    }

    // Fallback responses based on message type and relationship
    if (!response) {
      response = this.generateFallbackResponse(messageType, emotionalTone, relationshipLevel);
    }

    // Add offline indicator
    response += '\n\n*[Offline mode - limited responses available]*';

    return response;
  }

  private getRelationshipLevelFromData(relationshipData: any): number {
    const interactionCount = relationshipData.interactions?.length || 0;
    if (interactionCount >= 500) return 5; // Confidant
    if (interactionCount >= 300) return 4; // Close Friend
    if (interactionCount >= 150) return 3; // Friend
    if (interactionCount >= 50) return 2;  // Casual Friend
    return 1; // Acquaintance
  }

  private analyzeMessageType(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('hello') || lower.includes('hi')) return 'greeting';
    if (lower.includes('how are you') || lower.includes('what\'s up')) return 'inquiry';
    if (lower.includes('thank')) return 'gratitude';
    if (lower.includes('sorry') || lower.includes('apologize')) return 'apology';
    if (lower.includes('?')) return 'question';
    return 'statement';
  }

  private analyzeEmotionalTone(message: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'awesome', 'happy', 'love', 'excited', '😊', '😄', '❤️'];
    const negativeWords = ['bad', 'sad', 'upset', 'angry', 'hate', 'worried', '😢', '😞', '😠'];

    const lower = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => lower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lower.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private continueConversation(userMessage: string, lastAIResponse: string, relationshipLevel: number): string {
    // Simple conversation continuation logic
    const responses = {
      1: ["I understand.", "That's interesting.", "Tell me more."],
      2: ["That sounds good.", "I agree.", "How do you feel about that?"],
      3: ["That sounds amazing!", "I totally get it.", "What's your take on this?"],
      4: ["That's wonderful to hear.", "I completely understand.", "How can I support you?"],
      5: ["That's absolutely wonderful.", "I cherish hearing about this.", "I'm here for you."]
    };

    const levelResponses = responses[relationshipLevel as keyof typeof responses] || responses[1];
    return levelResponses[Math.floor(Math.random() * levelResponses.length)];
  }

  private incorporateMemory(memory: CachedMemory, relationshipLevel: number): string {
    if (relationshipLevel >= 3) {
      return " I remember something similar from before.";
    }
    return " That's interesting.";
  }

  private generateFallbackResponse(
    messageType: string,
    emotionalTone: string,
    relationshipLevel: number
  ): string {
    const responses: { [key: string]: { [key: string]: string[] } } = {
      greeting: {
        positive: ["Hello! Great to hear from you!", "Hi there! How are you doing?"],
        neutral: ["Hello!", "Hi!"],
        negative: ["Hello. Is everything okay?", "Hi. What's on your mind?"]
      },
      inquiry: {
        positive: ["I'm doing well, thank you! How about you?", "Things are going great! What's new with you?"],
        neutral: ["I'm doing fine. How are you?", "Not too bad. How are you?"],
        negative: ["I've been better. How are you doing?", "It's been a rough day. How about you?"]
      },
      gratitude: {
        positive: ["You're very welcome!", "Happy to help!", "Anytime!"],
        neutral: ["You're welcome.", "No problem.", "Glad I could help."],
        negative: ["You're welcome.", "It's nothing.", "Don't mention it."]
      },
      question: {
        positive: ["That's a great question!", "I'd love to help with that.", "Let me think about that."],
        neutral: ["That's interesting.", "I see.", "Let me consider that."],
        negative: ["That's a tough one.", "I'm not sure.", "That's complicated."]
      },
      statement: {
        positive: ["That sounds wonderful!", "I'm glad to hear that!", "That's fantastic!"],
        neutral: ["I see.", "Interesting.", "Noted."],
        negative: ["I'm sorry to hear that.", "That sounds difficult.", "I understand."]
      }
    };

    const typeResponses = responses[messageType] || responses.statement;
    const toneResponses = typeResponses[emotionalTone] || typeResponses.neutral;
    return toneResponses[Math.floor(Math.random() * toneResponses.length)];
  }

  // Sync mechanism
  async startSync(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    console.log('Starting offline data sync...');

    try {
      // Get offline queue items
      const queueItems = await this.getOfflineQueueItems();

      // Sort by priority and timestamp
      queueItems.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });

      // Process queue items
      for (const item of queueItems) {
        try {
          await this.processQueueItem(item);
          await this.removeFromOfflineQueue(item.id);
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          item.retryCount++;

          if (item.retryCount >= item.maxRetries) {
            await this.removeFromOfflineQueue(item.id);
            console.log(`Giving up on item ${item.id} after ${item.maxRetries} retries`);
          } else {
            await this.updateQueueItem(item);
          }
        }
      }

      console.log('Offline sync completed');
      this.showStatusNotification('✅ Sync completed successfully', 'success');

    } catch (error) {
      console.error('Sync failed:', error);
      this.showStatusNotification('❌ Sync failed - will retry later', 'error');
    } finally {
      this.syncInProgress = false;
    }
  }

  private async getOfflineQueueItems(): Promise<OfflineQueueItem[]> {
    if (!this.db) await this.initIndexedDB();

    const transaction = this.db!.transaction(['offlineQueue'], 'readonly');
    const store = transaction.objectStore('offlineQueue');

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  private async processQueueItem(item: OfflineQueueItem): Promise<void> {
    switch (item.type) {
      case 'message':
        await this.syncMessage(item.data);
        break;
      case 'memory':
        await this.syncMemory(item.data);
        break;
      case 'multimodal':
        await this.syncMultimodalData(item.data);
        break;
    }
  }

  private async syncMessage(messageData: CachedMessage): Promise<void> {
    // Sync message to server
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData)
    });

    if (!response.ok) {
      throw new Error(`Failed to sync message: ${response.statusText}`);
    }

    // Mark as synced locally
    await this.markMessageSynced(messageData.id);
  }

  private async syncMemory(memoryData: CachedMemory): Promise<void> {
    // Sync memory to server
    const response = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memoryData)
    });

    if (!response.ok) {
      throw new Error(`Failed to sync memory: ${response.statusText}`);
    }

    // Mark as synced locally
    await this.markMemorySynced(memoryData.id);
  }

  private async syncMultimodalData(multimodalData: any): Promise<void> {
    // Sync multimodal data to server
    const response = await fetch('/api/multimodal', {
      method: 'POST',
      body: multimodalData // FormData or JSON
    });

    if (!response.ok) {
      throw new Error(`Failed to sync multimodal data: ${response.statusText}`);
    }
  }

  private async markMessageSynced(messageId: string): Promise<void> {
    if (!this.db) await this.initIndexedDB();

    const transaction = this.db!.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');

    const message = await this.promisifyRequest(store.get(messageId));
    if (message) {
      message.synced = true;
      await this.promisifyRequest(store.put(message));
    }
  }

  private async markMemorySynced(memoryId: string): Promise<void> {
    if (!this.db) await this.initIndexedDB();

    const transaction = this.db!.transaction(['memory'], 'readwrite');
    const store = transaction.objectStore('memory');

    const memory = await this.promisifyRequest(store.get(memoryId));
    if (memory) {
      memory.synced = true;
      await this.promisifyRequest(store.put(memory));
    }
  }

  private async removeFromOfflineQueue(itemId: string): Promise<void> {
    if (!this.db) await this.initIndexedDB();

    const transaction = this.db!.transaction(['offlineQueue'], 'readwrite');
    const store = transaction.objectStore('offlineQueue');
    await this.promisifyRequest(store.delete(itemId));
  }

  private async updateQueueItem(item: OfflineQueueItem): Promise<void> {
    if (!this.db) await this.initIndexedDB();

    const transaction = this.db!.transaction(['offlineQueue'], 'readwrite');
    const store = transaction.objectStore('offlineQueue');
    await this.promisifyRequest(store.put(item));
  }

  // Cache management
  async cleanupOldCache(maxAgeDays: number = 30): Promise<void> {
    if (!this.db) await this.initIndexedDB();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    // Clean old messages
    const messageTransaction = this.db!.transaction(['messages'], 'readwrite');
    const messageStore = messageTransaction.objectStore('messages');
    const messageIndex = messageStore.index('timestamp');

    const messageCursorRequest = messageIndex.openCursor(IDBKeyRange.upperBound(cutoffDate));
    messageCursorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        // Only delete if synced
        if (cursor.value.synced) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    // Clean old memories
    const memoryTransaction = this.db!.transaction(['memory'], 'readwrite');
    const memoryStore = memoryTransaction.objectStore('memory');
    const memoryIndex = memoryStore.index('timestamp');

    const memoryCursorRequest = memoryIndex.openCursor(IDBKeyRange.upperBound(cutoffDate));
    memoryCursorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        // Only delete if synced
        if (cursor.value.synced) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  }

  // Utility methods
  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Public API
  get isOnlineStatus(): boolean {
    return this.isOnline;
  }

  async getCacheStats(): Promise<{
    messages: number;
    memories: number;
    queueItems: number;
    storageUsed: number;
  }> {
    if (!this.db) await this.initIndexedDB();

    const [messageCount, memoryCount, queueCount] = await Promise.all([
      this.getStoreCount('messages'),
      this.getStoreCount('memory'),
      this.getStoreCount('offlineQueue')
    ]);

    // Estimate storage usage (rough calculation)
    const estimatedUsage = (messageCount + memoryCount + queueCount) * 1024; // ~1KB per item

    return {
      messages: messageCount,
      memories: memoryCount,
      queueItems: queueCount,
      storageUsed: estimatedUsage
    };
  }

  private async getStoreCount(storeName: string): Promise<number> {
    if (!this.db) return 0;

    const transaction = this.db!.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  }
}

// Global offline cache manager instance
export const offlineCacheManager = new OfflineCacheManager();