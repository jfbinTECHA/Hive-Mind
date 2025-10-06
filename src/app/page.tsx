'use client';

import { useApp } from '@/context/AppContext';
import { AuthScreen } from '@/components/AuthScreen';
import { ChatLayout } from '@/components/ChatLayout';

export default function Home() {
  const { state } = useApp();

  if (!state.isAuthenticated) {
    return <AuthScreen />;
  }

  return <ChatLayout />;
}
