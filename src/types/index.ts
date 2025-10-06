export interface Message {
  id: string;
  content: string;
  sender: 'user' | string; // string for AI companion names
  timestamp: Date;
  type: 'text' | 'system';
  metadata?: any; // For system messages like reflections
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

export interface CustomTheme {
  name: string;
  background: {
    gradient: {
      colors: string[];
      direction: 'to right' | 'to bottom' | 'to bottom right' | 'radial';
      opacity: number;
    };
    overlay: {
      color: string;
      opacity: number;
    };
  };
  glow: {
    intensity: number; // 0-1
    color: string;
    blur: number; // in pixels
  };
  accent: {
    primary: string;
    secondary: string;
    hover: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  border: {
    color: string;
    opacity: number;
  };
}

export type Theme = 'light' | 'dark' | CustomTheme;

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
