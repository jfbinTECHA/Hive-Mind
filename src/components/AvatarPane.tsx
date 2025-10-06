'use client';

import { useApp } from '@/context/AppContext';

const emotionEmojis = {
  happy: '😊',
  sad: '😢',
  excited: '🤩',
  thinking: '🤔',
  neutral: '😐'
};

const emotionColors = {
  happy: 'ring-green-400',
  sad: 'ring-red-400',
  excited: 'ring-yellow-400',
  thinking: 'ring-blue-400',
  neutral: 'ring-gray-400'
};

export function AvatarPane() {
  const { state } = useApp();

  const activeCompanions = state.groupChatMode
    ? state.companions
    : state.companions.filter(c => c.id === state.activeCompanion);

  return (
    <div className="w-20 backdrop-blur-xl bg-white/5 border-r border-white/10 flex flex-col items-center py-4 space-y-4">
      {activeCompanions.map((companion) => (
        <div key={companion.id} className="relative group">
          {/* Avatar */}
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ring-2 ${emotionColors[companion.emotion]} ${
              companion.emotion === 'excited' ? 'animate-bounce' : ''
            } ${
              companion.emotion === 'thinking' ? 'animate-pulse' : ''
            } hover:scale-110 cursor-pointer`}
          >
            {companion.avatar}
          </div>

          {/* Emotion indicator */}
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-sm">
            {emotionEmojis[companion.emotion]}
          </div>

          {/* Tooltip */}
          <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            <div className="bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {companion.name}
              <br />
              <span className="capitalize text-gray-300">{companion.emotion}</span>
            </div>
          </div>
        </div>
      ))}

      {/* Group indicator */}
      {state.groupChatMode && (
        <div className="text-xs text-gray-400 text-center mt-4">
          Group
          <br />
          Chat
        </div>
      )}
    </div>
  );
}