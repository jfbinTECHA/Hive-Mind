'use client';

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { AppState, Companion, Message, MemoryFact, Theme, CustomTheme } from '@/types';

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

type AppAction =
  | { type: 'SET_USER'; payload: AppState['user'] }
  | { type: 'ADD_COMPANION'; payload: Companion }
  | { type: 'UPDATE_COMPANION'; payload: { id: string; updates: Partial<Companion> } }
  | { type: 'SET_ACTIVE_COMPANION'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'ADD_MEMORY_FACT'; payload: MemoryFact }
  | { type: 'REMOVE_MEMORY_FACT'; payload: string }
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'TOGGLE_GROUP_CHAT' };

const loadInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';

  try {
    const stored = localStorage.getItem('customTheme');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load custom theme:', error);
  }

  return 'dark';
};

const initialState: AppState = {
  user: null,
  companions: [
    {
      id: 'ai-hive-mind',
      name: 'AI Hive Mind',
      personality: 'friendly',
      avatar: '🤖',
      description: 'A collective AI consciousness that learns and adapts through conversation.',
      traits: ['helpful', 'curious', 'adaptive'],
      emotion: 'neutral',
      memory: {
        facts: {},
        conversations: [],
        familiarity: 0
      }
    }
  ],
  activeCompanion: 'ai-hive-mind',
  messages: [],
  memoryFacts: [],
  theme: loadInitialTheme(),
  isAuthenticated: false,
  groupChatMode: false
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'ADD_COMPANION':
      return {
        ...state,
        companions: [...state.companions, action.payload]
      };
    case 'UPDATE_COMPANION':
      return {
        ...state,
        companions: state.companions.map(companion =>
          companion.id === action.payload.id
            ? { ...companion, ...action.payload.updates }
            : companion
        )
      };
    case 'SET_ACTIVE_COMPANION':
      return { ...state, activeCompanion: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'ADD_MEMORY_FACT':
      return { ...state, memoryFacts: [...state.memoryFacts, action.payload] };
    case 'REMOVE_MEMORY_FACT':
      return {
        ...state,
        memoryFacts: state.memoryFacts.filter(fact => fact.id !== action.payload)
      };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    case 'TOGGLE_GROUP_CHAT':
      return { ...state, groupChatMode: !state.groupChatMode };
    default:
      return state;
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Apply theme changes to document
  useEffect(() => {
    const applyTheme = (theme: Theme) => {
      if (typeof theme === 'string') {
        // Built-in themes
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
        document.documentElement.style.removeProperty('--theme-gradient');
        document.documentElement.style.removeProperty('--theme-glow');
        document.documentElement.style.removeProperty('--theme-accent-primary');
        document.documentElement.style.removeProperty('--theme-accent-secondary');
        document.documentElement.style.removeProperty('--theme-text-primary');
        document.documentElement.style.removeProperty('--theme-text-secondary');
        document.documentElement.style.removeProperty('--theme-border-color');
      } else {
        // Custom theme
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add('custom-theme');

        // Apply custom theme CSS variables
        const root = document.documentElement.style;

        // Background gradient
        const gradientColors = theme.background.gradient.colors.join(', ');
        const gradientDirection = theme.background.gradient.direction;
        const gradient = gradientDirection === 'radial'
          ? `radial-gradient(circle, ${gradientColors})`
          : `linear-gradient(${gradientDirection}, ${gradientColors})`;
        root.setProperty('--theme-gradient', gradient);
        root.setProperty('--theme-gradient-opacity', theme.background.gradient.opacity.toString());

        // Glow effect
        const glow = `0 0 ${theme.glow.blur}px ${theme.glow.color}${Math.round(theme.glow.intensity * 255).toString(16).padStart(2, '0')}`;
        root.setProperty('--theme-glow', glow);

        // Accent colors
        root.setProperty('--theme-accent-primary', theme.accent.primary);
        root.setProperty('--theme-accent-secondary', theme.accent.secondary);
        root.setProperty('--theme-accent-hover', theme.accent.hover);

        // Text colors
        root.setProperty('--theme-text-primary', theme.text.primary);
        root.setProperty('--theme-text-secondary', theme.text.secondary);
        root.setProperty('--theme-text-muted', theme.text.muted);

        // Border colors
        const borderColor = `${theme.border.color}${Math.round(theme.border.opacity * 255).toString(16).padStart(2, '0')}`;
        root.setProperty('--theme-border-color', borderColor);
      }
    };

    applyTheme(state.theme);
  }, [state.theme]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}