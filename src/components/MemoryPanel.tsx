'use client';

import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { X, Trash2, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';

interface MemoryPanelProps {
  onClose: () => void;
}

export function MemoryPanel({ onClose }: MemoryPanelProps) {
  const { state, dispatch } = useApp();
  const [showAll, setShowAll] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemories();
  }, [state.activeCompanion]);

  const fetchMemories = async () => {
    if (!state.activeCompanion) return;

    try {
      const response = await fetch(`/api/memory/${state.activeCompanion}`);
      if (response.ok) {
        const data = await response.json();
        setMemories(data.memories || []);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
      // Fallback to local state
      setMemories(state.memoryFacts);
    } finally {
      setLoading(false);
    }
  };

  const visibleFacts = showAll ? memories : memories.slice(-10);

  const deleteFact = async (factId: string) => {
    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aiId: state.activeCompanion,
          action: 'delete',
          key: factId, // This is a simplification - in reality you'd need proper key identification
        }),
      });

      if (response.ok) {
        setMemories(memories.filter(m => m.id !== factId));
        dispatch({ type: 'REMOVE_MEMORY_FACT', payload: factId });
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
      // Fallback to local state update
      dispatch({ type: 'REMOVE_MEMORY_FACT', payload: factId });
    }
  };

  const formatDate = (date: Date) => {
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <div className="absolute right-0 top-0 h-full w-80 backdrop-blur-xl bg-black/80 border-l border-white/20 flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b border-white/20 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Memory & Logs</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">{state.memoryFacts.length} memories stored</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-white hover:bg-white/10"
          >
            {showAll ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showAll ? 'Recent' : 'All'}
          </Button>
        </div>
      </div>

      {/* Memory Facts */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {visibleFacts.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No memories stored yet.</p>
            <p className="text-sm mt-2">Start chatting to create memories!</p>
          </div>
        ) : (
          visibleFacts.map(fact => (
            <div
              key={fact.id}
              className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        fact.type === 'user'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {fact.type}
                    </span>
                    <span className="text-xs text-gray-400">{fact.companionId}</span>
                  </div>

                  <p className="text-sm text-white font-medium mb-1">{fact.key}</p>

                  <p className="text-sm text-gray-300 mb-2">
                    {typeof fact.value === 'object'
                      ? JSON.stringify(fact.value)
                      : String(fact.value)}
                  </p>

                  <p className="text-xs text-gray-500">{formatDate(fact.timestamp)}</p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteFact(fact.id)}
                  className="text-red-400 hover:bg-red-500/20 ml-2 flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/20">
        <div className="text-xs text-gray-400 text-center">
          Memories are stored locally in your browser
        </div>
      </div>
    </div>
  );
}
