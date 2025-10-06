'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, Companion, Message, MemoryFact, Theme } from '@/types';

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
  theme: 'dark',
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