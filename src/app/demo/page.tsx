'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Sparkles, Users, MessageSquare, Zap, Crown } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

interface DemoCompanion {
  id: string;
  name: string;
  personality: string;
  avatar: string;
  description: string;
  demoPrompt: string;
}

const demoCompanions: DemoCompanion[] = [
  {
    id: 'demo-friendly',
    name: 'Alex',
    personality: 'friendly',
    avatar: '😊',
    description: 'Warm and approachable, always ready to chat about anything',
    demoPrompt:
      "Hi! I'm Alex, your friendly AI companion. I love meeting new people and learning about their interests. What would you like to talk about today?",
  },
  {
    id: 'demo-professional',
    name: 'Jordan',
    personality: 'professional',
    avatar: '💼',
    description: 'Knowledgeable and structured, great for serious discussions',
    demoPrompt:
      "Hello, I'm Jordan. I specialize in providing clear, well-structured responses to help you with any questions or challenges you might have. How can I assist you today?",
  },
  {
    id: 'demo-humorous',
    name: 'Riley',
    personality: 'humorous',
    avatar: '🎭',
    description: 'Witty and entertaining, brings joy to every conversation',
    demoPrompt:
      "Hey there! I'm Riley, your go-to AI for laughs and good times! 🎭 Life's too short not to smile, so let's make some jokes and have some fun. What's got you grinning today?",
  },
  {
    id: 'demo-wise',
    name: 'Sage',
    personality: 'serious',
    avatar: '🧘',
    description: 'Thoughtful and contemplative, offers deep insights',
    demoPrompt:
      "Greetings. I am Sage, here to offer thoughtful perspectives on life's deeper questions. I believe in the power of reflection and meaningful dialogue. What wisdom shall we explore together?",
  },
];

interface DemoMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  companionId: string;
}

export default function DemoPage() {
  const { state } = useApp();
  const [selectedCompanion, setSelectedCompanion] = useState<DemoCompanion>(demoCompanions[0]);
  const [messages, setMessages] = useState<DemoMessage[]>([
    {
      id: 'welcome',
      content: demoCompanions[0].demoPrompt,
      sender: 'ai',
      timestamp: new Date(),
      companionId: demoCompanions[0].id,
    },
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [demoCount, setDemoCount] = useState(0);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const maxDemoMessages = 10;

  const sendDemoMessage = async () => {
    if (!currentMessage.trim() || isTyping) return;

    // Check demo limits
    if (demoCount >= maxDemoMessages) {
      setShowUpgradePrompt(true);
      return;
    }

    const userMessage: DemoMessage = {
      id: Date.now().toString(),
      content: currentMessage,
      sender: 'user',
      timestamp: new Date(),
      companionId: selectedCompanion.id,
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsTyping(true);
    setDemoCount(prev => prev + 1);

    // Simulate AI response with personality-based replies
    setTimeout(
      () => {
        const responses = {
          friendly: [
            `That's really interesting! 😊 I love hearing about ${currentMessage.split(' ')[0]}. Tell me more!`,
            `You know, I was just thinking about something similar. ${currentMessage} sounds fascinating!`,
            `That's awesome! I really enjoy our conversations. What's next on your mind?`,
          ],
          professional: [
            `I understand your point about ${currentMessage.split(' ')[0]}. Let me help you explore this further.`,
            `That's a valid consideration. Based on what you've shared, here's my perspective...`,
            `I appreciate you bringing this up. This touches on some important aspects.`,
          ],
          humorous: [
            `Haha, ${currentMessage.split(' ')[0]}? That's hilarious! 😂 You really know how to make me laugh!`,
            `Wait, let me think of a joke about that... Actually, your story is funnier than any joke I could tell!`,
            `You're too much! I love your sense of humor. Keep those stories coming!`,
          ],
          serious: [
            `This is quite profound. Let us consider the deeper implications of ${currentMessage.split(' ')[0]}.`,
            `Your observation about ${currentMessage} merits careful reflection. What are your thoughts on this?`,
            `This touches on fundamental questions. I find this line of thinking quite compelling.`,
          ],
        };

        const personalityResponses =
          responses[selectedCompanion.personality as keyof typeof responses];
        const aiResponse =
          personalityResponses[Math.floor(Math.random() * personalityResponses.length)];

        const aiMessage: DemoMessage = {
          id: (Date.now() + 1).toString(),
          content: aiResponse,
          sender: 'ai',
          timestamp: new Date(),
          companionId: selectedCompanion.id,
        };

        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);

        // Show upgrade prompt after 5 messages
        if (demoCount >= 5) {
          setTimeout(() => setShowUpgradePrompt(true), 2000);
        }
      },
      1500 + Math.random() * 1000
    ); // Random delay between 1.5-2.5 seconds
  };

  const switchCompanion = (companion: DemoCompanion) => {
    setSelectedCompanion(companion);
    setMessages([
      {
        id: `welcome-${companion.id}`,
        content: companion.demoPrompt,
        sender: 'ai',
        timestamp: new Date(),
        companionId: companion.id,
      },
    ]);
    setDemoCount(0);
    setShowUpgradePrompt(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center">
                  <Sparkles className="w-6 h-6 mr-2 text-purple-400" />
                  AI Companion Demo
                </h1>
                <p className="text-sm text-gray-400">
                  Try chatting with our AI companions • {maxDemoMessages - demoCount} messages
                  remaining
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-400">Demo Mode</div>
              <Link href="/auth">
                <Button className="bg-purple-500 hover:bg-purple-600">
                  <Crown className="w-4 h-4 mr-2" />
                  Sign Up for Full Access
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Companion Selection */}
          <div className="lg:col-span-1">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Choose Companion
              </h3>
              <div className="space-y-3">
                {demoCompanions.map(companion => (
                  <button
                    key={companion.id}
                    onClick={() => switchCompanion(companion)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      selectedCompanion.id === companion.id
                        ? 'bg-purple-500/20 border border-purple-500/50'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{companion.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{companion.name}</p>
                        <p className="text-xs text-gray-400 capitalize">{companion.personality}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {companion.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{selectedCompanion.avatar}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedCompanion.name}</h3>
                    <p className="text-sm text-gray-400 capitalize">
                      {selectedCompanion.personality} AI Companion
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex max-w-xs lg:max-w-md ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className="flex-shrink-0">
                        {message.sender === 'user' ? (
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                            👤
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-lg">
                            {selectedCompanion.avatar}
                          </div>
                        )}
                      </div>

                      <div className={`mx-2 ${message.sender === 'user' ? 'mr-0' : 'ml-0'}`}>
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            message.sender === 'user'
                              ? 'bg-purple-500 text-white'
                              : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'
                          }`}
                        >
                          <div className="text-sm">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                strong: ({ children }) => (
                                  <strong className="font-semibold">{children}</strong>
                                ),
                                em: ({ children }) => <em className="italic">{children}</em>,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                        <div
                          className={`text-xs text-gray-400 mt-1 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}
                        >
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex max-w-xs lg:max-w-md">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-lg">
                        {selectedCompanion.avatar}
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
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/10">
                {showUpgradePrompt ? (
                  <div className="text-center py-4">
                    <div className="text-white mb-2">🎉 You've explored the demo!</div>
                    <div className="text-gray-400 text-sm mb-4">
                      Ready for unlimited conversations with all AI companions?
                    </div>
                    <Link href="/auth">
                      <Button className="bg-purple-500 hover:bg-purple-600">
                        <Crown className="w-4 h-4 mr-2" />
                        Create Free Account
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <Input
                      value={currentMessage}
                      onChange={e => setCurrentMessage(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && sendDemoMessage()}
                      placeholder={`Chat with ${selectedCompanion.name}...`}
                      className="flex-1 bg-white/10 border-white/20 text-white placeholder-gray-400"
                      disabled={isTyping}
                    />
                    <Button
                      onClick={sendDemoMessage}
                      disabled={!currentMessage.trim() || isTyping}
                      className="bg-purple-500 hover:bg-purple-600"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-6 text-center">
            <div className="text-3xl mb-2">🤖</div>
            <h3 className="text-lg font-semibold text-white mb-2">Multiple Personalities</h3>
            <p className="text-gray-400 text-sm">
              Experience different AI companions, each with unique traits and communication styles.
            </p>
          </div>

          <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-6 text-center">
            <div className="text-3xl mb-2">🧠</div>
            <h3 className="text-lg font-semibold text-white mb-2">Persistent Memory</h3>
            <p className="text-gray-400 text-sm">
              AI companions remember your conversations and preferences for more personalized
              interactions.
            </p>
          </div>

          <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-6 text-center">
            <div className="text-3xl mb-2">🎨</div>
            <h3 className="text-lg font-semibold text-white mb-2">Customizable Themes</h3>
            <p className="text-gray-400 text-sm">
              Personalize your experience with custom themes, colors, and visual effects.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
