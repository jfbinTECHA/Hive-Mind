export interface Message {
  id: string;
  content: string;
  sender: 'user' | string; // string for AI companion names
  timestamp: Date;
  type: 'text' | 'system';
}

export interface Companion {
  id: string;
  name: string;
  personality: 'friendly' | 'professional' | 'humorous' | 'serious';
  avatar: string;
  description: string;
  traits: string[];
  voice?: string;
  emotion: 'happy' | 'sad' | 'excited' | 'thinking' | 'neutral';
  memory: {
    facts: { [key: string]: any };
    conversations: Message[];
    familiarity: number;
  };
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface MemoryFact {
  id: string;
  type: 'user' | 'self';
  key: string;
  value: any;
  timestamp: Date;
  companionId: string;
}

export type Theme = 'light' | 'dark';

export interface AppState {
  user: User | null;
  companions: Companion[];
  activeCompanion: string | null;
  messages: Message[];
  memoryFacts: MemoryFact[];
  theme: Theme;
  isAuthenticated: boolean;
  groupChatMode: boolean;
}