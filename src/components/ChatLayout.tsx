'use client';

import { useApp } from '@/context/AppContext';
import { Sidebar } from '@/components/Sidebar';
import { ChatView } from '@/components/ChatView';
import { AvatarPane } from '@/components/AvatarPane';
import { MemoryPanel } from '@/components/MemoryPanel';
import { ProfileModal } from '@/components/ProfileModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useState } from 'react';

export function ChatLayout() {
  const { state } = useApp();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
      {/* Sidebar */}
      <Sidebar
        onProfileClick={() => setShowProfileModal(true)}
        onMemoryClick={() => setShowMemoryPanel(true)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="backdrop-blur-xl bg-white/5 border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-white">
                {state.groupChatMode ? 'Group Chat' : 'AI Companion'}
              </h1>
              {state.activeCompanion && (
                <span className="text-sm text-gray-400">
                  with {state.companions.find(c => c.id === state.activeCompanion)?.name}
                </span>
              )}
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Chat Content */}
        <div className="flex-1 flex">
          {/* Avatar Pane */}
          <AvatarPane />

          {/* Chat View */}
          <div className="flex-1 flex flex-col">
            <ChatView />
          </div>

          {/* Memory Panel (overlay) */}
          {showMemoryPanel && <MemoryPanel onClose={() => setShowMemoryPanel(false)} />}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
    </div>
  );
}
