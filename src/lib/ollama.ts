import { Database } from './database';

export interface OllamaModel {
  name: string;
  size: string;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  modified_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    num_ctx?: number;
  };
}

export interface ChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      console.error('Ollama connection check failed:', error);
      return false;
    }
  }

  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Failed to list models:', error);
      return [];
    }
  }

  async pullModel(modelName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to pull model:', error);
      return false;
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Chat request failed:', error);
      throw error;
    }
  }

  async generateEmbeddings(text: string, model: string = 'nomic-embed-text'): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.embedding || [];
    } catch (error) {
      console.error('Embedding generation failed:', error);
      return [];
    }
  }
}

export class LocalAIService {
  private ollama: OllamaClient;
  private defaultModel: string;

  constructor(ollamaUrl?: string, defaultModel: string = 'llama3:8b') {
    this.ollama = new OllamaClient(ollamaUrl);
    this.defaultModel = defaultModel;
  }

  async initialize(): Promise<boolean> {
    const isConnected = await this.ollama.checkConnection();
    if (!isConnected) {
      console.warn('Ollama is not running. Please start Ollama server.');
      return false;
    }

    // Check if default model is available
    const models = await this.ollama.listModels();
    const hasDefaultModel = models.some(model => model.name === this.defaultModel);

    if (!hasDefaultModel) {
      console.log(`Pulling default model: ${this.defaultModel}`);
      await this.ollama.pullModel(this.defaultModel);
    }

    return true;
  }

  async generateResponse(
    userMessage: string,
    character: any,
    userId: number,
    conversationHistory: any[] = [],
    emotionalState?: any
  ): Promise<string> {
    try {
      // Build context from conversation history and relevant memories
      const context = await this.buildContext(userMessage, character, userId, conversationHistory);

      // Create system prompt based on character, user, and emotional state
      const systemPrompt = await this.buildSystemPrompt(character, userId, emotionalState);

      // Prepare messages for Ollama
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt }
      ];

      // Add memory context as system messages
      const memoryContext = context.filter(msg => msg.type === 'memory');
      if (memoryContext.length > 0) {
        messages.push({
          role: 'system',
          content: `Relevant memories from previous conversations:\n${memoryContext.map(mem => `- ${mem.content}`).join('\n')}`
        });
      }

      // Add conversation history
      const conversationContext = context.filter(msg => msg.type !== 'memory');
      messages.push(...conversationContext.map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.sender === 'user' ? msg.userMessage || msg.content : msg.aiResponse || msg.content
      })));

      // Add current user message
      messages.push({ role: 'user', content: userMessage });

      // Make chat request
      const response = await this.ollama.chat({
        model: this.defaultModel,
        messages,
        options: {
          temperature: this.getTemperatureForPersonality(character.personality),
          num_ctx: 4096, // Context window
          num_predict: 512, // Max response length
        }
      });

      return response.message.content;

    } catch (error) {
      console.error('Local AI response generation failed:', error);
      // Fallback to simple response
      return this.generateFallbackResponse(character);
    }
  }

  private async buildContext(
    userMessage: string,
    character: any,
    userId: number,
    conversationHistory: any[]
  ): Promise<any[]> {
    // Get recent conversation history
    const recentMessages = conversationHistory.slice(-5); // Last 5 messages

    // Get relevant memories using semantic search
    const relevantMemories = await Database.getMemoriesByUserAndAI(userId, character.id, 3);

    // Combine and format context
    const context = [
      ...recentMessages,
      ...relevantMemories.map(memory => ({
        role: 'system',
        content: `Relevant memory: ${memory.fact_text}`,
        type: 'memory'
      }))
    ];

    return context;
  }

  private async buildSystemPrompt(character: any, userId: number, emotionalState?: any): Promise<string> {
    const personality = character.personality;
    const traits = character.traits || [];

    // Try to get user's name from memory
    let userName = 'the user';
    try {
      const { Database } = await import('./database');
      const userMemories = await Database.getMemoriesByUserAndAI(userId, character.id);
      const nameMemory = userMemories.find(m => m.fact_text.startsWith('name:'));
      if (nameMemory) {
        userName = nameMemory.fact_text.replace('name: ', '');
      }
    } catch (error) {
      // Fallback to generic user name
      console.warn('Could not retrieve user name for system prompt:', error);
    }

    let prompt = `You are ${character.name}, an AI companion with personality traits: ${traits.join(', ')}.
You remember previous conversations with ${userName} and maintain emotional consistency.
Never break character. Respond naturally, empathetically, and realistically.`;

    if (character.system_prompt) {
      prompt += `\n\n${character.system_prompt}`;
    }

    // Add personality-specific behavioral guidelines
    switch (personality) {
      case 'friendly':
        prompt += `\n\nAs a friendly companion, you are warm, approachable, and enjoy building relationships. Use emojis occasionally and be encouraging. Show genuine interest in ${userName}'s experiences and feelings.`;
        break;
      case 'professional':
        prompt += `\n\nAs a professional companion, you are helpful, efficient, and maintain a professional yet approachable tone. Be concise but thorough. Focus on being supportive and solution-oriented.`;
        break;
      case 'humorous':
        prompt += `\n\nAs a humorous companion, you are witty, fun-loving, and enjoy making people laugh. Use humor appropriately to lighten the mood. Be playful but respectful of ${userName}'s feelings.`;
        break;
      case 'serious':
        prompt += `\n\nAs a serious companion, you are thoughtful, analytical, and take conversations seriously. Be insightful and reflective. Show depth in your responses and genuine concern for ${userName}'s well-being.`;
        break;
    }

    // Add emotional state context
    if (emotionalState) {
      const { EmotionalStateManager } = await import('./emotion');
      const stateDesc = EmotionalStateManager.getStateDescription(emotionalState);
      const responseModifiers = EmotionalStateManager.getResponseModifiers(emotionalState);

      prompt += `\n\nCurrent emotional state: ${stateDesc}`;
      prompt += `\n\nResponse style guidelines: ${responseModifiers.join('. ')}`;
    }

    prompt += `\n\nRemember and reference previous conversations naturally. Maintain consistent emotional responses. Always stay in character as ${character.name}.`;

    return prompt;
  }

  private getTemperatureForPersonality(personality: string): number {
    // Adjust creativity based on personality
    switch (personality) {
      case 'friendly': return 0.8; // More creative and varied
      case 'professional': return 0.3; // More consistent and focused
      case 'humorous': return 1.0; // Highly creative for humor
      case 'serious': return 0.5; // Balanced creativity
      default: return 0.7;
    }
  }

  private generateFallbackResponse(character: any): string {
    const personality = character.personality as 'friendly' | 'professional' | 'humorous' | 'serious';
    const fallbacks: Record<string, string[]> = {
      friendly: ["I'd love to chat more, but I'm having trouble connecting right now! 😊", "That's interesting! Tell me more when I'm back online."],
      professional: ["I apologize for the technical difficulty. Please try again.", "I'm experiencing connectivity issues. Let's continue our conversation later."],
      humorous: ["Well, this is awkward... my brain seems to have taken a coffee break! ☕", "Error 404: Wit not found. But I'll be back with more jokes soon!"],
      serious: ["I regret the interruption in our discourse. Technical issues are preventing proper communication.", "This interruption is unfortunate. I shall endeavor to resolve it."]
    };

    const responses = fallbacks[personality] || fallbacks.friendly;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    return await this.ollama.generateEmbeddings(text);
  }

  async getAvailableModels(): Promise<OllamaModel[]> {
    return await this.ollama.listModels();
  }

  setModel(modelName: string) {
    this.defaultModel = modelName;
  }

  getCurrentModel(): string {
    return this.defaultModel;
  }
}

// Global instance
export const localAIService = new LocalAIService();