'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Mic, MicOff, Volume2, VolumeX, Settings, Heart, Battery, Eye, Lightbulb } from 'lucide-react';
import { avatarEngine, AvatarExpression } from '@/lib/avatarEngine';

// Speech Recognition types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

export function ChatView() {
  const { state, dispatch } = useApp();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [messageDelay, setMessageDelay] = useState(1500);
  const [emotionalState, setEmotionalState] = useState<any>(null);
  const [avatarStates, setAvatarStates] = useState<Map<string, any>>(new Map());
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState<string | null>(null);
  const [audioQueue, setAudioQueue] = useState<Array<{ url: string; companionId: string }>>([]);
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Voice functionality
  const speakText = (text: string, voice?: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);

    // Set voice if specified
    if (voice) {
      const voices = speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // Adjust speech settings based on personality
    const companion = state.companions.find(c => c.id === state.activeCompanion);
    if (companion) {
      switch (companion.personality) {
        case 'friendly':
          utterance.rate = 1.1;
          utterance.pitch = 1.2;
          break;
        case 'professional':
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          break;
        case 'humorous':
          utterance.rate = 1.3;
          utterance.pitch = 1.3;
          break;
        case 'serious':
          utterance.rate = 0.8;
          utterance.pitch = 0.9;
          break;
      }
    }

    speechSynthesis.speak(utterance);
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessage(transcript);
      setIsListening(false);
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
    setIsListening(true);
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleTTS = () => {
    setTtsEnabled(!ttsEnabled);
    if (ttsEnabled) {
      speechSynthesis.cancel();
      stopVoicePlayback();
    }
  };

  const toggleVoiceGeneration = () => {
    setVoiceEnabled(!voiceEnabled);
    if (!voiceEnabled) {
      // Check if ElevenLabs is available
      checkVoiceService();
    }
  };

  const checkVoiceService = async () => {
    try {
      const response = await fetch('/api/voice?action=stats');
      if (!response.ok) {
        console.warn('Voice service not available');
        setVoiceEnabled(false);
      }
    } catch (error) {
      console.warn('Voice service check failed:', error);
      setVoiceEnabled(false);
    }
  };

  const generateVoice = async (text: string, companionId: string, personality: string) => {
    if (!voiceEnabled) return;

    setVoiceLoading(companionId);

    try {
      const companion = state.companions.find(c => c.id.toString() === companionId);
      const emotionalState = companion ? await fetchEmotionalStateForCompanion(companionId) : null;

      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          personality,
          characterId: companionId,
          emotionalState
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioUrl) {
          // Add to audio queue
          setAudioQueue(prev => [...prev, { url: data.audioUrl, companionId }]);
          playNextInQueue();
        }
      }
    } catch (error) {
      console.error('Voice generation failed:', error);
      // Fallback to TTS
      if (ttsEnabled) {
        const companion = state.companions.find(c => c.id.toString() === companionId);
        speakText(text, companion?.voice);
      }
    } finally {
      setVoiceLoading(null);
    }
  };

  const playNextInQueue = () => {
    if (audioQueue.length === 0 || currentPlaying) return;

    const nextAudio = audioQueue[0];
    setCurrentPlaying(nextAudio.companionId);

    if (audioRef.current) {
      audioRef.current.src = nextAudio.url;
      audioRef.current.play().catch(error => {
        console.error('Audio playback failed:', error);
        setCurrentPlaying(null);
        setAudioQueue(prev => prev.slice(1));
        playNextInQueue();
      });
    }
  };

  const stopVoicePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentPlaying(null);
    setAudioQueue([]);
  };

  const fetchEmotionalStateForCompanion = async (companionId: string) => {
    try {
      const response = await fetch(`/api/emotion/${companionId}`);
      if (response.ok) {
        const data = await response.json();
        return data.emotionalState;
      }
    } catch (error) {
      console.error('Failed to fetch emotional state for voice:', error);
    }
    return null;
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date(),
      type: 'text' as const
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    setMessage('');
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
          aiName: state.activeCompanion || 'ai-hive-mind',
          userId: state.user?.id || 'anonymous',
          context: {
            conversationHistory: state.messages.slice(-5), // Last 5 messages for context
            groupChat: state.groupChatMode
          },
          groupChat: state.groupChatMode,
          participantIds: state.groupChatMode ? state.companions.map(c => c.id) : undefined
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
              type: 'text' as const
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

            // Generate voice or speak the response
            if (companion && voiceEnabled) {
              generateVoice(responseData.response, companion.id.toString(), companion.personality);
            } else if (ttsEnabled) {
              speakText(responseData.response, companion?.voice);
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
          type: 'text' as const
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
                updates: { emotion: data.character.emotion }
              }
            });
          }
        }

        // Generate voice or speak the response
        const activeCompanion = state.companions.find(c => c.id === state.activeCompanion);
        if (activeCompanion && voiceEnabled) {
          generateVoice(data.response, activeCompanion.id.toString(), activeCompanion.personality);
        } else if (ttsEnabled) {
          speakText(data.response, activeCompanion?.voice);
        }
      }

      // Refresh emotional state after conversation
      await fetchEmotionalState();

    } catch (error) {
      console.error('Chat API error:', error);
      // Fallback to local generation
      const aiResponse = generateAIResponse(message);
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: state.activeCompanion || 'ai-hive-mind',
        timestamp: new Date(),
        type: 'text' as const
      };

      dispatch({ type: 'ADD_MESSAGE', payload: aiMessage });

      if (ttsEnabled) {
        const companion = state.companions.find(c => c.id === state.activeCompanion);
        speakText(aiResponse, companion?.voice);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const generateAIResponse = (userMessage: string): string => {
    const companion = state.companions.find(c => c.id === state.activeCompanion);
    if (!companion) return "Hello! How can I help you today?";

    // Simple response generation based on personality
    const responses = {
      friendly: [
        `That's interesting! 😊 I love hearing about ${userMessage.split(' ')[0]}.`,
        `You know, I was just thinking about something similar. Tell me more!`,
        `That's awesome! I really enjoy our conversations.`
      ],
      professional: [
        `I understand your point about ${userMessage.split(' ')[0]}. Let me help you with that.`,
        `That's a valid consideration. Based on what you've shared...`,
        `I appreciate you bringing this up. Here's my perspective.`
      ],
      humorous: [
        `Haha, ${userMessage.split(' ')[0]}? That's hilarious! 😂`,
        `Wait, let me think of a joke about that...`,
        `You're too much! I love your sense of humor.`
      ],
      serious: [
        `This is quite profound. Let us consider the implications of ${userMessage.split(' ')[0]}.`,
        `Your observation about ${userMessage.split(' ')[0]} merits careful reflection.`,
        `This touches on deeper philosophical questions.`
      ]
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
            <span className="text-white w-8 text-right">
              {Math.round(moodPercent)}%
            </span>
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
            <span className="text-white w-8 text-right">
              {Math.round(energyPercent)}%
            </span>
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
            <span className="text-white w-8 text-right">
              {Math.round(trustPercent)}%
            </span>
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
            <span className="text-white w-8 text-right">
              {Math.round(curiosityPercent)}%
            </span>
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
        {state.messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const companion = state.companions.find(c => c.id === msg.sender);
          const avatarState = avatarStates.get(msg.sender);

          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-xs lg:max-w-md ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Dynamic Avatar */}
                <div className="flex-shrink-0">
                  {isUser ? (
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div
                      className={`w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${avatarState ? avatarEngine.getAvatarAnimationClasses(avatarState) : ''}`}
                      style={avatarState ? avatarEngine.getAvatarStyle(avatarState) : {}}
                    >
                      {avatarState ?
                        avatarEngine.getAvatarForExpression(avatarState.expression, companion?.personality, avatarState.intensity) :
                        (companion?.avatar || '🤖')
                      }
                    </div>
                  )}
                </div>

                {/* Message bubble */}
                <div className={`mx-2 ${isUser ? 'mr-0' : 'ml-0'}`}>
                  {/* Sender name for AI messages */}
                  {!isUser && (
                    <div className="text-xs text-gray-400 mb-1">
                      {companion?.name || 'AI'}
                    </div>
                  )}

                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isUser
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'
                    }`}
                  >
                    <div className="text-sm">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ children }) => (
                            <code className="bg-black/20 px-1 py-0.5 rounded text-xs font-mono">
                              {children}
                            </code>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
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
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.45s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Hidden audio element for voice playback */}
      <audio
        ref={audioRef}
        onEnded={() => {
          setCurrentPlaying(null);
          setAudioQueue(prev => prev.slice(1));
          playNextInQueue();
        }}
        onError={() => {
          setCurrentPlaying(null);
          setAudioQueue(prev => prev.slice(1));
          playNextInQueue();
        }}
        style={{ display: 'none' }}
      />

      {/* Input */}
      <div className="p-4 border-t border-white/10 backdrop-blur-xl bg-white/5">
        <div className="flex space-x-2">
          {/* Voice Input Button */}
          <Button
            onClick={isListening ? stopVoiceInput : startVoiceInput}
            variant="outline"
            className={`border-white/20 text-white hover:bg-white/10 ${isListening ? 'bg-red-500/20 border-red-500/50' : ''}`}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>

          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 bg-white/10 border-white/20 text-white placeholder-gray-400"
          />

          {/* Voice Generation Toggle */}
          <Button
            onClick={toggleVoiceGeneration}
            variant="outline"
            className={`border-white/20 text-white hover:bg-white/10 ${!voiceEnabled ? 'opacity-50' : voiceLoading ? 'animate-pulse' : ''}`}
            title={voiceEnabled ? 'Disable ElevenLabs voice generation' : 'Enable ElevenLabs voice generation'}
          >
            {voiceLoading ? '🎵' : voiceEnabled ? '🎤' : '🔇'}
          </Button>

          {/* TTS Toggle */}
          <Button
            onClick={toggleTTS}
            variant="outline"
            className={`border-white/20 text-white hover:bg-white/10 ${!ttsEnabled ? 'opacity-50' : ''}`}
            title={ttsEnabled ? 'Disable text-to-speech' : 'Enable text-to-speech'}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          {/* Settings for delay */}
          <Button
            onClick={() => {
              const newDelay = prompt('Message delay (ms):', messageDelay.toString());
              if (newDelay && !isNaN(Number(newDelay))) {
                setMessageDelay(Number(newDelay));
              }
            }}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            title="Configure message delay"
          >
            <Settings className="w-4 h-4" />
          </Button>

          <Button
            onClick={sendMessage}
            disabled={!message.trim() || isTyping}
            className="bg-purple-500 hover:bg-purple-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Voice status indicator */}
        {isListening && (
          <div className="mt-2 text-center">
            <span className="text-sm text-red-400 animate-pulse">🎤 Listening...</span>
          </div>
        )}
      </div>
    </div>
  );
}