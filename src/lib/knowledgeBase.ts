import { multiModalProcessor } from './multiModal';

export interface KnowledgeDocument {
  id: string;
  userId: number;
  characterId: number;
  title: string;
  content: string;
  type: 'document' | 'url' | 'video' | 'audio';
  sourceUrl?: string;
  metadata: {
    author?: string;
    publishDate?: Date;
    wordCount: number;
    language: string;
    topics: string[];
    entities: KnowledgeEntity[];
    summary: string;
    keyPoints: string[];
  };
  processedAt: Date;
  lastAccessed: Date;
  accessCount: number;
  relevanceScore: number;
}

export interface KnowledgeEntity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'concept' | 'event' | 'other';
  confidence: number;
  mentions: number;
  context: string[];
}

export interface KnowledgeQuery {
  query: string;
  userId: number;
  characterId: number;
  context?: string;
  maxResults?: number;
  relevanceThreshold?: number;
}

export interface KnowledgeResult {
  document: KnowledgeDocument;
  relevanceScore: number;
  matchedEntities: KnowledgeEntity[];
  excerpt: string;
  reasoning: string;
}

export class KnowledgeBaseManager {
  private documents: Map<string, KnowledgeDocument> = new Map();
  private entityIndex: Map<string, KnowledgeEntity[]> = new Map();
  private topicIndex: Map<string, string[]> = new Map(); // topic -> documentIds

  constructor() {
    this.loadKnowledgeBase();
  }

  private async loadKnowledgeBase() {
    // Load from database/storage
    // This would be implemented with database calls
  }

  private async saveKnowledgeBase() {
    // Save to database
    // This would be implemented with database calls
  }

  // Document Processing
  async processDocument(
    file: File,
    userId: number,
    characterId: number
  ): Promise<KnowledgeDocument> {
    try {
      const content = await this.extractTextFromFile(file);
      const metadata = await this.analyzeContent(content, file.name);

      const document: KnowledgeDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        characterId,
        title: file.name,
        content,
        type: 'document',
        metadata,
        processedAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        relevanceScore: 1.0,
      };

      await this.storeDocument(document);
      await this.indexDocument(document);

      return document;
    } catch (error) {
      console.error('Document processing error:', error);
      throw new Error('Failed to process document');
    }
  }

  // URL Processing
  async processUrl(url: string, userId: number, characterId: number): Promise<KnowledgeDocument> {
    try {
      const content = await this.fetchUrlContent(url);
      const title = await this.extractTitleFromUrl(url);
      const metadata = await this.analyzeContent(content, title);

      const document: KnowledgeDocument = {
        id: `url_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        characterId,
        title,
        content,
        type: 'url',
        sourceUrl: url,
        metadata,
        processedAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        relevanceScore: 1.0,
      };

      await this.storeDocument(document);
      await this.indexDocument(document);

      return document;
    } catch (error) {
      console.error('URL processing error:', error);
      throw new Error('Failed to process URL');
    }
  }

  // Video Processing
  async processVideo(
    videoUrl: string,
    userId: number,
    characterId: number
  ): Promise<KnowledgeDocument> {
    try {
      // Extract video metadata and transcript
      const { transcript, metadata } = await this.extractVideoContent(videoUrl);
      const title = metadata.title || 'Video Content';

      const document: KnowledgeDocument = {
        id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        characterId,
        title,
        content: transcript,
        type: 'video',
        sourceUrl: videoUrl,
        metadata: {
          ...metadata,
          wordCount: transcript.split(' ').length,
          language: 'en', // Assume English for now
          topics: await this.extractTopics(transcript),
          entities: await this.extractEntities(transcript),
          summary: await this.generateSummary(transcript),
          keyPoints: await this.extractKeyPoints(transcript),
        },
        processedAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        relevanceScore: 1.0,
      };

      await this.storeDocument(document);
      await this.indexDocument(document);

      return document;
    } catch (error) {
      console.error('Video processing error:', error);
      throw new Error('Failed to process video');
    }
  }

  // Content Analysis
  private async analyzeContent(
    content: string,
    title: string
  ): Promise<KnowledgeDocument['metadata']> {
    return {
      wordCount: content.split(' ').length,
      language: await this.detectLanguage(content),
      topics: await this.extractTopics(content),
      entities: await this.extractEntities(content),
      summary: await this.generateSummary(content),
      keyPoints: await this.extractKeyPoints(content),
    };
  }

  private async extractTextFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async event => {
        const result = event.target?.result as string;

        if (file.type === 'text/plain') {
          resolve(result);
        } else if (file.type === 'application/pdf') {
          // PDF processing would require pdf.js or similar
          resolve(result); // Placeholder
        } else if (file.type.includes('word') || file.type.includes('document')) {
          // DOCX processing would require mammoth.js or similar
          resolve(result); // Placeholder
        } else {
          resolve(result);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private async fetchUrlContent(url: string): Promise<string> {
    // In a real implementation, this would use a proxy server to avoid CORS
    // For now, we'll simulate content extraction
    try {
      const response = await fetch(`/api/knowledge/extract?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      return data.content || 'Content extraction failed';
    } catch (error) {
      // Fallback: return a placeholder
      return `Content from ${url} - This would be extracted from the actual webpage in a full implementation.`;
    }
  }

  private async extractTitleFromUrl(url: string): Promise<string> {
    try {
      const response = await fetch(`/api/knowledge/title?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      return data.title || url;
    } catch (error) {
      return url;
    }
  }

  private async extractVideoContent(
    videoUrl: string
  ): Promise<{ transcript: string; metadata: any }> {
    // This would integrate with YouTube API, video transcription services, etc.
    // For now, return simulated content
    const transcript = `This is a simulated transcript of the video content from ${videoUrl}. In a full implementation, this would use speech-to-text APIs to transcribe the video audio.`;

    const metadata = {
      duration: 300, // 5 minutes
      views: 1000,
      uploadDate: new Date(),
      channel: 'Unknown Channel',
      title: 'Video Title',
    };

    return { transcript, metadata };
  }

  // NLP Processing (simplified implementations)
  private async detectLanguage(text: string): Promise<string> {
    // Simple language detection - in reality, use a proper NLP library
    if (text.includes('the ') && text.includes(' and ')) return 'en';
    if (text.includes('el ') && text.includes(' y ')) return 'es';
    if (text.includes('le ') && text.includes(' et ')) return 'fr';
    return 'en'; // Default to English
  }

  private async extractTopics(text: string): Promise<string[]> {
    // Simple topic extraction - in reality, use NLP APIs
    const commonTopics = [
      'technology',
      'science',
      'business',
      'health',
      'education',
      'entertainment',
    ];
    const foundTopics: string[] = [];

    const lowerText = text.toLowerCase();
    commonTopics.forEach(topic => {
      if (lowerText.includes(topic)) {
        foundTopics.push(topic);
      }
    });

    return foundTopics.length > 0 ? foundTopics : ['general'];
  }

  private async extractEntities(text: string): Promise<KnowledgeEntity[]> {
    // Simple entity extraction - in reality, use NLP APIs like Google Cloud NLP
    const entities: KnowledgeEntity[] = [];
    const words = text.split(' ');

    // Look for capitalized words (potential proper nouns)
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (
        word.length > 1 &&
        word[0] === word[0].toUpperCase() &&
        word !== 'The' &&
        word !== 'A' &&
        word !== 'An'
      ) {
        // Check if it's already in entities
        const existing = entities.find(e => e.name === word);
        if (existing) {
          existing.mentions++;
          existing.context.push(this.getContext(text, i));
        } else {
          entities.push({
            name: word,
            type: this.guessEntityType(word),
            confidence: 0.7,
            mentions: 1,
            context: [this.getContext(text, i)],
          });
        }
      }
    }

    return entities;
  }

  private guessEntityType(name: string): KnowledgeEntity['type'] {
    // Simple heuristics for entity type detection
    const locations = ['London', 'Paris', 'New York', 'Tokyo'];
    const organizations = ['Google', 'Microsoft', 'Apple', 'Amazon'];

    if (locations.includes(name)) return 'location';
    if (organizations.includes(name)) return 'organization';
    if (name.includes(' ')) return 'person'; // Names often have spaces
    return 'other';
  }

  private getContext(text: string, wordIndex: number): string {
    const words = text.split(' ');
    const start = Math.max(0, wordIndex - 3);
    const end = Math.min(words.length, wordIndex + 4);
    return words.slice(start, end).join(' ');
  }

  private async generateSummary(text: string): Promise<string> {
    // Simple extractive summarization
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length === 0) return text.substring(0, 200) + '...';

    // Return first and last sentences as a simple summary
    const firstSentence = sentences[0].trim();
    const lastSentence = sentences[sentences.length - 1].trim();

    if (firstSentence === lastSentence) {
      return firstSentence;
    }

    return `${firstSentence} ${lastSentence}`;
  }

  private async extractKeyPoints(text: string): Promise<string[]> {
    // Simple key point extraction
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15);
    const keyPoints: string[] = [];

    // Look for sentences with important keywords
    const importantWords = ['important', 'key', 'main', 'primary', 'essential', 'crucial'];

    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      if (importantWords.some(word => lowerSentence.includes(word))) {
        keyPoints.push(sentence.trim());
      }
    });

    // If no important sentences found, return first few sentences
    if (keyPoints.length === 0) {
      return sentences.slice(0, 3).map(s => s.trim());
    }

    return keyPoints.slice(0, 5);
  }

  // Storage and Indexing
  private async storeDocument(document: KnowledgeDocument): Promise<void> {
    this.documents.set(document.id, document);
    await this.saveKnowledgeBase();
  }

  private async indexDocument(document: KnowledgeDocument): Promise<void> {
    // Index entities
    document.metadata.entities.forEach(entity => {
      if (!this.entityIndex.has(entity.name)) {
        this.entityIndex.set(entity.name, []);
      }
      this.entityIndex.get(entity.name)!.push(entity);
    });

    // Index topics
    document.metadata.topics.forEach(topic => {
      if (!this.topicIndex.has(topic)) {
        this.topicIndex.set(topic, []);
      }
      this.topicIndex.get(topic)!.push(document.id);
    });
  }

  // Knowledge Querying
  async queryKnowledge(query: KnowledgeQuery): Promise<KnowledgeResult[]> {
    const results: KnowledgeResult[] = [];
    const queryLower = query.query.toLowerCase();

    // Search through all documents
    for (const [docId, document] of this.documents) {
      if (document.userId !== query.userId || document.characterId !== query.characterId) {
        continue;
      }

      let relevanceScore = 0;
      const matchedEntities: KnowledgeEntity[] = [];
      let excerpt = '';

      // Title matching
      if (document.title.toLowerCase().includes(queryLower)) {
        relevanceScore += 0.3;
      }

      // Content matching
      const contentLower = document.content.toLowerCase();
      if (contentLower.includes(queryLower)) {
        relevanceScore += 0.4;
        // Extract excerpt
        const queryIndex = contentLower.indexOf(queryLower);
        const start = Math.max(0, queryIndex - 50);
        const end = Math.min(document.content.length, queryIndex + queryLower.length + 50);
        excerpt = document.content.substring(start, end);
      }

      // Entity matching
      document.metadata.entities.forEach(entity => {
        if (entity.name.toLowerCase().includes(queryLower)) {
          relevanceScore += 0.2;
          matchedEntities.push(entity);
        }
      });

      // Topic matching
      document.metadata.topics.forEach(topic => {
        if (topic.toLowerCase().includes(queryLower)) {
          relevanceScore += 0.1;
        }
      });

      // Apply relevance threshold
      const threshold = query.relevanceThreshold || 0.1;
      if (relevanceScore >= threshold) {
        // Update access statistics
        document.lastAccessed = new Date();
        document.accessCount++;
        document.relevanceScore = relevanceScore;

        results.push({
          document,
          relevanceScore,
          matchedEntities,
          excerpt: excerpt || document.metadata.summary,
          reasoning: this.generateReasoning(relevanceScore, matchedEntities.length, excerpt),
        });
      }
    }

    // Sort by relevance and limit results
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const maxResults = query.maxResults || 5;
    return results.slice(0, maxResults);
  }

  private generateReasoning(
    relevanceScore: number,
    entityMatches: number,
    excerpt: string
  ): string {
    let reasoning = '';

    if (relevanceScore > 0.5) {
      reasoning = 'High relevance match found';
    } else if (relevanceScore > 0.3) {
      reasoning = 'Moderate relevance match';
    } else {
      reasoning = 'Low relevance match';
    }

    if (entityMatches > 0) {
      reasoning += ` with ${entityMatches} entity match(es)`;
    }

    if (excerpt) {
      reasoning += ' - content excerpt available';
    }

    return reasoning;
  }

  // Knowledge Management
  async getDocuments(userId: number, characterId: number): Promise<KnowledgeDocument[]> {
    return Array.from(this.documents.values())
      .filter(doc => doc.userId === userId && doc.characterId === characterId)
      .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
  }

  async deleteDocument(documentId: string, userId: number): Promise<boolean> {
    const document = this.documents.get(documentId);
    if (!document || document.userId !== userId) {
      return false;
    }

    // Remove from indexes
    document.metadata.entities.forEach(entity => {
      const entityList = this.entityIndex.get(entity.name);
      if (entityList) {
        const index = entityList.findIndex(e => e.name === entity.name);
        if (index > -1) {
          entityList.splice(index, 1);
        }
      }
    });

    document.metadata.topics.forEach(topic => {
      const docList = this.topicIndex.get(topic);
      if (docList) {
        const index = docList.indexOf(documentId);
        if (index > -1) {
          docList.splice(index, 1);
        }
      }
    });

    this.documents.delete(documentId);
    await this.saveKnowledgeBase();
    return true;
  }

  // Statistics
  getKnowledgeStats(
    userId: number,
    characterId: number
  ): {
    totalDocuments: number;
    totalWords: number;
    topTopics: string[];
    topEntities: KnowledgeEntity[];
    averageRelevance: number;
  } {
    const userDocs = Array.from(this.documents.values()).filter(
      doc => doc.userId === userId && doc.characterId === characterId
    );

    const totalWords = userDocs.reduce((sum, doc) => sum + doc.metadata.wordCount, 0);

    const topicCount: { [key: string]: number } = {};
    const entityCount: { [key: string]: KnowledgeEntity } = {};

    userDocs.forEach(doc => {
      doc.metadata.topics.forEach(topic => {
        topicCount[topic] = (topicCount[topic] || 0) + 1;
      });

      doc.metadata.entities.forEach(entity => {
        if (!entityCount[entity.name]) {
          entityCount[entity.name] = { ...entity };
        } else {
          entityCount[entity.name].mentions += entity.mentions;
        }
      });
    });

    const topTopics = Object.entries(topicCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);

    const topEntities = Object.values(entityCount)
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5);

    const averageRelevance =
      userDocs.length > 0
        ? userDocs.reduce((sum, doc) => sum + doc.relevanceScore, 0) / userDocs.length
        : 0;

    return {
      totalDocuments: userDocs.length,
      totalWords,
      topTopics,
      topEntities,
      averageRelevance,
    };
  }
}

// Global knowledge base manager instance
export const knowledgeBaseManager = new KnowledgeBaseManager();
