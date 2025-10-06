'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Heart, Battery, Eye, Lightbulb, Sparkles, Star, Share2 } from 'lucide-react';
import { avatarEngine, AvatarExpression } from '@/lib/avatarEngine';
import { ChatInput } from './ChatInput';
import { reflectionSystem } from '@/lib/reflectionSystem';
import { evolutionSystem } from '@/lib/evolutionSystem';
import { sharedMemorySystem } from '@/lib/sharedMemorySystem';

export function ChatView() {
  const { state, dispatch } = useApp();
  const [isTyping, setIsTyping] = useState(false);
  const [emotionalState, setEmotionalState] = useState<any>(null);
  const [avatarStates, setAvatarStates] = useState<Map<string, any>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    // Preload avatar images for smooth transitions
    avatarEngine.preloadAvatars();
  }, [state.messages]);

  // Fetch emotional state when active companion changes
  useEffect(() => {
    if (state.activeCompanion) {
      fetchEmotionalState();
    }
  }, [state.activeCompanion]);

  const fetchEmotionalState = async () => {
    try {
      const response = await fetch(`/api/emotion/${state.activeCompanion}`);
      if (response.ok) {
        const data = await response.json();
        setEmotionalState(data.emotionalState);
      }
    } catch (error) {
      console.error('Failed to fetch emotional state:', error);
    }
  };

  const sendMessage = async (
    message: string,
    attachments?: { type: string; data: any; metadata?: any }[]
  ) => {
    if (!message.trim() && (!attachments || attachments.length === 0)) return;

    const userMessage = {
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date(),
      type: 'text' as const,
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    setIsTyping(true);

    try {
      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          attachments,
          aiName: state.activeCompanion || 'ai-hive-mind',
          userId: state.user?.id || 'anonymous',
          context: {
            conversationHistory: state.messages.slice(-5), // Last 5 messages for context
            groupChat: state.groupChatMode,
          },
          groupChat: state.groupChatMode,
          participantIds: state.groupChatMode ? state.companions.map(c => c.id) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      if (data.groupChat && data.responses) {
        // Handle group chat responses
        data.responses.forEach(async (responseData: any, index: number) => {
          setTimeout(async () => {
            const aiMessage = {
              id: `${Date.now()}_${index}`,
              content: responseData.response,
              sender: responseData.character.name,
              timestamp: new Date(),
              type: 'text' as const,
            };

            dispatch({ type: 'ADD_MESSAGE', payload: aiMessage });

            // Update avatar expression based on response
            const companion = state.companions.find(c => c.name === responseData.character.name);
            if (companion) {
              const avatarState = await avatarEngine.updateAvatarFromMessage(
                companion.id.toString(),
                responseData.response,
                undefined, // Could pass emotional state here
                companion.personality
              );

              setAvatarStates(prev => new Map(prev.set(companion.id.toString(), avatarState)));
            }
          }, index * 1500); // Stagger responses
        });
      } else {
        // Handle single AI response
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          sender: data.character.name,
          timestamp: new Date(),
          type: 'text' as const,
        };

        dispatch({ type: 'ADD_MESSAGE', payload: aiMessage });

        // Update avatar expression based on response
        const companion = state.companions.find(c => c.id === state.activeCompanion);
        if (companion) {
          const avatarState = await avatarEngine.updateAvatarFromMessage(
            companion.id.toString(),
            data.response,
            undefined, // Could pass emotional state here
            companion.personality
          );

          setAvatarStates(prev => new Map(prev.set(companion.id.toString(), avatarState)));
        }

        // Update companion emotion if provided
        if (data.character.emotion) {
          const companionIndex = state.companions.findIndex(c => c.id === state.activeCompanion);
          if (companionIndex >= 0) {
            dispatch({
              type: 'UPDATE_COMPANION',
              payload: {
                id: state.activeCompanion!,
                updates: { emotion: data.character.emotion },
              },
            });
          }
        }
      }

      // Refresh emotional state after conversation
      await fetchEmotionalState();

      // Check if we should generate a reflection
      await checkAndGenerateReflection();

      // Check if companion should evolve
      await checkAndTriggerEvolution();

      // Check for shared memory references
      await checkSharedMemoryReferences(message, data.response);
    } catch (error) {
      console.error('Chat API error:', error);
      // Fallback to local generation
      const aiResponse = generateAIResponse(message);
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: state.activeCompanion || 'ai-hive-mind',
        timestamp: new Date(),
        type: 'text' as const,
      };

      dispatch({ type: 'ADD_MESSAGE', payload: aiMessage });
    } finally {
      setIsTyping(false);
    }
  };

  const checkAndGenerateReflection = async () => {
    if (!state.activeCompanion) return;

    const companion = state.companions.find(c => c.id === state.activeCompanion);
    if (!companion) return;

    // Check different reflection types
    const reflectionTypes: ('daily' | 'weekly' | 'dream' | 'introspection')[] = [
      'daily',
      'weekly',
      'dream',
      'introspection',
    ];

    for (const type of reflectionTypes) {
      if (reflectionSystem.shouldReflect(state.activeCompanion, type)) {
        try {
          // Get recent conversation history
          const recentConversations = state.messages.slice(-20);

          // Get current emotional state
          const currentEmotionalState = emotionalState || {
            mood: 0,
            energy: 0.5,
            trust: 0.5,
            curiosity: 0.5,
          };

          const reflection = await reflectionSystem.generateReflection(
            state.activeCompanion,
            type,
            recentConversations,
            emotionalState
          );

          // Add reflection as a special system message
          const reflectionMessage = {
            id: `reflection_${reflection.id}`,
            content: reflection.content,
            sender: companion.id,
            timestamp: reflection.timestamp,
            type: 'system' as const,
            metadata: {
              isReflection: true,
              reflectionType: reflection.type,
              insights: reflection.insights,
              emotionalPatterns: reflection.emotionalPatterns,
            },
          };

          dispatch({ type: 'ADD_MESSAGE', payload: reflectionMessage });

          // Only generate one type of reflection per conversation
          break;
        } catch (error) {
          console.error('Failed to generate reflection:', error);
        }
      }
    }
  };

  const checkAndTriggerEvolution = async () => {
    if (!state.activeCompanion) return;

    try {
      const evolutionEvent = await evolutionSystem.checkEvolution(state.activeCompanion);
      if (evolutionEvent) {
        // Add evolution notification as a special system message
        const evolutionMessage = {
          id: `evolution_${evolutionEvent.id}`,
          content: `🎉 **Evolution Complete!** ${evolutionEvent.toStage.unlockMessage}`,
          sender: state.activeCompanion,
          timestamp: evolutionEvent.timestamp,
          type: 'system' as const,
          metadata: {
            isEvolution: true,
            evolutionEvent,
            fromStage: evolutionEvent.fromStage.name,
            toStage: evolutionEvent.toStage.name,
          },
        };

        dispatch({ type: 'ADD_MESSAGE', payload: evolutionMessage });

        // Could trigger celebration animation or sound here
        console.log('Companion evolved!', evolutionEvent);
      }
    } catch (error) {
      console.error('Evolution check failed:', error);
    }
  };

  const checkSharedMemoryReferences = async (userMessage: string, aiResponse: string) => {
    if (!state.activeCompanion) return;

    try {
      // Get accessible memories for this companion
      const accessibleMemories = await sharedMemorySystem.getAccessibleMemories(
        state.activeCompanion
      );

      // Check if user message or AI response references shared concepts
      const relevantMemories = accessibleMemories.filter(memory => {
        const memoryText = memory.content.toLowerCase();
        const userText = userMessage.toLowerCase();
        const aiText = aiResponse.toLowerCase();

        // Simple relevance check - can be made more sophisticated
        return (
          memoryText.split(' ').some(word => userText.includes(word) || aiText.includes(word)) &&
          memory.originalCompanionId !== state.activeCompanion
        ); // Don't reference own memories
      });

      // If relevant shared memories found, occasionally add a reference
      if (relevantMemories.length > 0 && Math.random() < 0.3) {
        // 30% chance
        const randomMemory = relevantMemories[Math.floor(Math.random() * relevantMemories.length)];

        // Add a shared memory reference message
        const memoryReferenceMessage = {
          id: `memory_ref_${Date.now()}`,
          content: `💭 *Recalling a shared memory...*\n\n"${randomMemory.content}"\n\n*This reminds me of an experience I shared with ${state.companions.find(c => c.id === randomMemory.originalCompanionId)?.name || 'another companion'}.*`,
          sender: state.activeCompanion,
          timestamp: new Date(),
          type: 'system' as const,
          metadata: {
            isMemoryReference: true,
            referencedMemoryId: randomMemory.id,
            sharedFrom: randomMemory.originalCompanionId,
          },
        };

        setTimeout(() => {
          dispatch({ type: 'ADD_MESSAGE', payload: memoryReferenceMessage });
        }, 2000); // Add after a short delay for natural conversation flow
      }
    } catch (error) {
      console.error('Shared memory reference check failed:', error);
    }
  };

  const generateAIResponse = (userMessage: string): string => {
    const companion = state.companions.find(c => c.id === state.activeCompanion);
    if (!companion) return 'Hello! How can I help you today?';

    // Simple response generation based on personality
    const responses = {
      friendly: [
        `That's interesting! 😊 I love hearing about ${userMessage.split(' ')[0]}.`,
        `You know, I was just thinking about something similar. Tell me more!`,
        `That's awesome! I really enjoy our conversations.`,
      ],
      professional: [
        `I understand your point about ${userMessage.split(' ')[0]}. Let me help you with that.`,
        `That's a valid consideration. Based on what you've shared...`,
        `I appreciate you bringing this up. Here's my perspective.`,
      ],
      humorous: [
        `Haha, ${userMessage.split(' ')[0]}? That's hilarious! 😂`,
        `Wait, let me think of a joke about that...`,
        `You're too much! I love your sense of humor.`,
      ],
      serious: [
        `This is quite profound. Let us consider the implications of ${userMessage.split(' ')[0]}.`,
        `Your observation about ${userMessage.split(' ')[0]} merits careful reflection.`,
        `This touches on deeper philosophical questions.`,
      ],
    };

    const personalityResponses = responses[companion.personality];
    return personalityResponses[Math.floor(Math.random() * personalityResponses.length)];
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderEmotionalState = () => {
    if (!emotionalState) return null;

    const moodPercent = ((emotionalState.mood + 1) / 2) * 100;
    const energyPercent = emotionalState.energy * 100;
    const trustPercent = emotionalState.trust * 100;
    const curiosityPercent = emotionalState.curiosity * 100;

    return (
      <div className="mb-4 p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-white flex items-center">
            <Heart className="w-4 h-4 mr-1" />
            Emotional State
          </h4>
          <span className="text-xs text-gray-400">
            Interaction #{emotionalState.interactionCount}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center">
            <span className="text-gray-400 mr-2">Mood:</span>
            <div className="flex-1 bg-gray-700 rounded-full h-2 mr-2">
              <div
                className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${moodPercent}%` }}
              ></div>
            </div>
            <span className="text-white w-8 text-right">{Math.round(moodPercent)}%</span>
          </div>

          <div className="flex items-center">
            <Battery className="w-3 h-3 text-gray-400 mr-1" />
            <span className="text-gray-400 mr-2">Energy:</span>
            <div className="flex-1 bg-gray-700 rounded-full h-2 mr-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${energyPercent}%` }}
              ></div>
            </div>
            <span className="text-white w-8 text-right">{Math.round(energyPercent)}%</span>
          </div>

          <div className="flex items-center">
            <Eye className="w-3 h-3 text-gray-400 mr-1" />
            <span className="text-gray-400 mr-2">Trust:</span>
            <div className="flex-1 bg-gray-700 rounded-full h-2 mr-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${trustPercent}%` }}
              ></div>
            </div>
            <span className="text-white w-8 text-right">{Math.round(trustPercent)}%</span>
          </div>

          <div className="flex items-center">
            <Lightbulb className="w-3 h-3 text-gray-400 mr-1" />
            <span className="text-gray-400 mr-2">Curiosity:</span>
            <div className="flex-1 bg-gray-700 rounded-full h-2 mr-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${curiosityPercent}%` }}
              ></div>
            </div>
            <span className="text-white w-8 text-right">{Math.round(curiosityPercent)}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Group Chat Indicator */}
      {state.groupChatMode && (
        <div className="mx-4 mt-4 p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center text-blue-300 text-sm">
            <span className="mr-2">👥</span>
            Group Chat Active - {state.companions.length} AIs participating
          </div>
        </div>
      )}

      {/* Emotional State Display */}
      {renderEmotionalState()}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {state.messages.map(msg => {
          const isUser = msg.sender === 'user';
          const companion = state.companions.find(c => c.id === msg.sender);
          const avatarState = avatarStates.get(msg.sender);
          const isReflection = msg.type === 'system' && msg.metadata?.isReflection;
          const isEvolution = msg.type === 'system' && msg.metadata?.isEvolution;
          const isMemoryReference = msg.type === 'system' && msg.metadata?.isMemoryReference;

          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`flex max-w-xs lg:max-w-md xl:max-w-lg ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Dynamic Avatar */}
                <div className="flex-shrink-0">
                  {isUser ? (
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  ) : isReflection ? (
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-lg shadow-lg">
                      💭
                    </div>
                  ) : isEvolution ? (
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-lg shadow-lg animate-pulse">
                      ⭐
                    </div>
                  ) : isMemoryReference ? (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-lg shadow-lg">
                      🧠
                    </div>
                  ) : (
                    <div
                      className={`w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${avatarState ? avatarEngine.getAvatarAnimationClasses(avatarState) : ''}`}
                      style={avatarState ? avatarEngine.getAvatarStyle(avatarState) : {}}
                    >
                      {avatarState
                        ? avatarEngine.getAvatarForExpression(
                            avatarState.expression,
                            companion?.personality,
                            avatarState.intensity
                          )
                        : companion?.avatar || '🤖'}
                    </div>
                  )}
                </div>

                {/* Message bubble */}
                <div className={`mx-2 ${isUser ? 'mr-0' : 'ml-0'}`}>
                  {/* Sender name for AI messages */}
                  {!isUser && (
                    <div className="text-xs text-gray-400 mb-1 flex items-center">
                      {isReflection ? (
                        <>
                          <Sparkles className="w-3 h-3 mr-1 text-purple-400" />
                          {companion?.name || 'AI'} Reflection
                          <span className="ml-2 px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs capitalize">
                            {msg.metadata?.reflectionType}
                          </span>
                        </>
                      ) : isEvolution ? (
                        <>
                          <Star className="w-3 h-3 mr-1 text-yellow-400" />
                          {companion?.name || 'AI'} Evolution
                          <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded text-xs">
                            {msg.metadata?.fromStage} → {msg.metadata?.toStage}
                          </span>
                        </>
                      ) : isMemoryReference ? (
                        <>
                          <Share2 className="w-3 h-3 mr-1 text-blue-400" />
                          {companion?.name || 'AI'} Memory
                          <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                            Shared from{' '}
                            {state.companions.find(c => c.id === msg.metadata?.sharedFrom)?.name ||
                              'another companion'}
                          </span>
                        </>
                      ) : (
                        companion?.name || 'AI'
                      )}
                    </div>
                  )}

                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isUser
                        ? 'bg-purple-500 text-white'
                        : isReflection
                          ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 backdrop-blur-sm text-white border border-purple-500/30 shadow-lg'
                          : isEvolution
                            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm text-white border border-yellow-500/30 shadow-lg animate-pulse'
                            : isMemoryReference
                              ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm text-white border border-blue-500/30 shadow-lg'
                              : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'
                    }`}
                  >
                    <div className="text-sm">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => (
                            <strong className="text-white font-semibold">{children}</strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic text-purple-200">{children}</em>
                          ),
                          code: ({ children }) => (
                            <code className="bg-black/20 px-1 py-0.5 rounded text-xs font-mono">
                              {children}
                            </code>
                          ),
                          ul: ({ children }) => <ul className="mb-2 text-gray-200">{children}</ul>,
                          li: ({ children }) => (
                            <li className="mb-1 flex items-start">
                              <span className="text-purple-400 mr-2">•</span>
                              {children}
                            </li>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Reflection insights */}
                    {isReflection && msg.metadata?.insights && msg.metadata.insights.length > 0 && (
                      <div className="mt-3 p-3 bg-white/5 rounded border border-white/10">
                        <h4 className="text-xs font-medium text-purple-300 mb-2 flex items-center">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Key Insights
                        </h4>
                        <ul className="text-xs text-gray-300 space-y-1">
                          {msg.metadata.insights
                            .slice(0, 3)
                            .map((insight: string, index: number) => (
                              <li key={index} className="flex items-start">
                                <span className="text-purple-400 mr-2">•</span>
                                {insight}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div
                    className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}
                  >
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Enhanced Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex max-w-xs lg:max-w-md">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-lg animate-pulse">
                🤖
              </div>
              <div className="mx-2">
                <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-sm text-white border border-white/20">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.15s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.3s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.45s' }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <ChatInput
        onSendMessage={sendMessage}
        disabled={isTyping}
        placeholder="Type your message..."
        companionId={state.activeCompanion || undefined}
        personality={state.companions.find(c => c.id === state.activeCompanion)?.personality}
      />
    </div>
  );
}
