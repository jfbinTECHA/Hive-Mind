import { localAIService } from './ollama';
import { Database } from './database';
import { MemoryManager } from './memory';
import { EmotionalStateManager } from './emotion';

export interface GroupChatParticipant {
  id: number;
  name: string;
  personality: string;
  traits: string[];
  emotionalState?: any;
  lastSpoken?: number;
  speakingOrder: number;
}

export interface GroupChatMessage {
  id: string;
  content: string;
  sender: string;
  senderId: number;
  timestamp: Date;
  type: 'user' | 'ai' | 'moderator';
  emotionalContext?: any;
}

export interface GroupChatSession {
  id: string;
  participants: GroupChatParticipant[];
  messages: GroupChatMessage[];
  currentSpeaker?: number;
  isActive: boolean;
  moderatorEnabled: boolean;
  turnTakingMode: 'round-robin' | 'interest-based' | 'moderator-controlled';
}

export class GroupChatManager {
  private static readonly MODERATOR_NAME = 'Group Moderator';
  private static readonly MODERATOR_PERSONALITY = 'professional';

  /**
   * Initialize a group chat session
   */
  static async initializeGroupChat(participantIds: number[]): Promise<GroupChatSession> {
    const participants: GroupChatParticipant[] = [];

    for (let i = 0; i < participantIds.length; i++) {
      const participantId = participantIds[i];
      const character = await Database.getCharacterById(participantId);

      if (character) {
        participants.push({
          id: character.id,
          name: character.name,
          personality: character.personality,
          traits: character.traits || [],
          emotionalState: character.emotional_state,
          speakingOrder: i,
        });
      }
    }

    // Add moderator if enabled
    const moderatorEnabled = participants.length > 3; // Enable moderator for larger groups

    return {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      participants,
      messages: [],
      isActive: true,
      moderatorEnabled,
      turnTakingMode: moderatorEnabled ? 'moderator-controlled' : 'round-robin',
    };
  }

  /**
   * Determine next speaker based on turn-taking algorithm
   */
  static async determineNextSpeaker(
    session: GroupChatSession,
    lastMessage?: GroupChatMessage
  ): Promise<GroupChatParticipant | null> {
    if (!lastMessage) {
      // First message - let the first participant speak
      return session.participants[0];
    }

    switch (session.turnTakingMode) {
      case 'round-robin':
        return this.getRoundRobinSpeaker(session, lastMessage);

      case 'interest-based':
        return await this.getInterestBasedSpeaker(session, lastMessage);

      case 'moderator-controlled':
        return await this.getModeratorControlledSpeaker(session, lastMessage);

      default:
        return this.getRoundRobinSpeaker(session, lastMessage);
    }
  }

  private static getRoundRobinSpeaker(
    session: GroupChatSession,
    lastMessage: GroupChatMessage
  ): GroupChatParticipant {
    const lastSpeakerIndex = session.participants.findIndex(p => p.id === lastMessage.senderId);
    const nextIndex = (lastSpeakerIndex + 1) % session.participants.length;
    return session.participants[nextIndex];
  }

  private static async getInterestBasedSpeaker(
    session: GroupChatSession,
    lastMessage: GroupChatMessage
  ): Promise<GroupChatParticipant> {
    // Calculate interest scores based on message content and AI personalities
    const interestScores: { participant: GroupChatParticipant; score: number }[] = [];

    for (const participant of session.participants) {
      if (participant.id === lastMessage.senderId) {
        interestScores.push({ participant, score: 0 }); // Don't speak twice in a row
        continue;
      }

      const interestScore = await this.calculateInterestScore(
        participant,
        lastMessage.content,
        session.messages
      );
      interestScores.push({ participant, score: interestScore });
    }

    // Return participant with highest interest score
    interestScores.sort((a, b) => b.score - a.score);
    return interestScores[0].participant;
  }

  private static async getModeratorControlledSpeaker(
    session: GroupChatSession,
    lastMessage: GroupChatMessage
  ): Promise<GroupChatParticipant> {
    // Use moderator AI to decide who should speak next
    const moderatorDecision = await this.getModeratorDecision(session, lastMessage);

    if (moderatorDecision.participantId) {
      const participant = session.participants.find(p => p.id === moderatorDecision.participantId);
      if (participant) return participant;
    }

    // Fallback to round-robin
    return this.getRoundRobinSpeaker(session, lastMessage);
  }

  /**
   * Generate response for a participant in group chat
   */
  static async generateGroupResponse(
    participant: GroupChatParticipant,
    userMessage: string,
    conversationHistory: GroupChatMessage[],
    userId: number
  ): Promise<string> {
    try {
      // Get relevant memories for this participant
      const relevantMemories = await MemoryManager.getChatContext(
        userMessage,
        userId,
        participant.id,
        false, // Don't include cross-AI for group chat
        3 // Fewer memories for group context
      );

      // Build conversation context
      const context = conversationHistory.slice(-5).map(msg => ({
        content: msg.content,
        sender: msg.sender,
        type: 'message',
      }));

      // Add memories to context
      const fullContext = [
        ...context,
        ...relevantMemories.map(mem => ({ content: mem, type: 'memory' })),
      ];

      // Get emotional state
      const emotionalState =
        participant.emotionalState || EmotionalStateManager.createDefaultState();

      // Generate response
      const response = await localAIService.generateResponse(
        userMessage,
        {
          id: participant.id,
          name: participant.name,
          personality: participant.personality,
          traits: participant.traits,
        },
        userId,
        fullContext,
        emotionalState
      );

      return response;
    } catch (error) {
      console.error(`Failed to generate response for ${participant.name}:`, error);
      return `${participant.name} is thinking...`;
    }
  }

  /**
   * Calculate how interested a participant is in responding to a message
   */
  private static async calculateInterestScore(
    participant: GroupChatParticipant,
    message: string,
    conversationHistory: GroupChatMessage[]
  ): Promise<number> {
    let score = 0;

    // Personality-based interest
    const lowerMessage = message.toLowerCase();

    switch (participant.personality) {
      case 'friendly':
        if (
          lowerMessage.includes('help') ||
          lowerMessage.includes('friend') ||
          lowerMessage.includes('happy')
        ) {
          score += 0.8;
        }
        break;
      case 'professional':
        if (
          lowerMessage.includes('work') ||
          lowerMessage.includes('business') ||
          lowerMessage.includes('advice')
        ) {
          score += 0.8;
        }
        break;
      case 'humorous':
        if (
          lowerMessage.includes('funny') ||
          lowerMessage.includes('joke') ||
          lowerMessage.includes('laugh')
        ) {
          score += 0.8;
        }
        break;
      case 'serious':
        if (
          lowerMessage.includes('think') ||
          lowerMessage.includes('important') ||
          lowerMessage.includes('philosophy')
        ) {
          score += 0.8;
        }
        break;
    }

    // Emotional state influence
    if (participant.emotionalState) {
      score += participant.emotionalState.curiosity * 0.3; // Direct access to curiosity
      score += (participant.emotionalState.mood > 0 ? participant.emotionalState.mood : 0) * 0.2; // Positive mood bonus
    }

    // Recent conversation participation (prefer variety)
    const recentSpeakers = conversationHistory.slice(-3).map(m => m.senderId);
    const hasSpokenRecently = recentSpeakers.includes(participant.id);
    if (!hasSpokenRecently) {
      score += 0.4; // Bonus for not speaking recently
    }

    // Random factor for natural conversation flow
    score += Math.random() * 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Get moderator decision on who should speak next
   */
  private static async getModeratorDecision(
    session: GroupChatSession,
    lastMessage: GroupChatMessage
  ): Promise<{ participantId: number | null; reasoning: string }> {
    try {
      const moderatorPrompt = `You are the Group Chat Moderator. Analyze the conversation and decide who should speak next.

Participants: ${session.participants.map(p => `${p.name} (${p.personality})`).join(', ')}

Last message from ${lastMessage.sender}: "${lastMessage.content}"

Recent conversation:
${session.messages
  .slice(-3)
  .map(m => `${m.sender}: ${m.content}`)
  .join('\n')}

Consider:
- Who hasn't spoken recently?
- Who would have the most relevant response?
- Who might add value to the conversation?
- Keep the conversation balanced and engaging

Respond with only the name of the participant who should speak next, or "continue" if the conversation should continue naturally.`;

      const moderatorResponse = await localAIService.generateResponse(
        moderatorPrompt,
        {
          id: -1,
          name: this.MODERATOR_NAME,
          personality: this.MODERATOR_PERSONALITY,
          traits: ['organized', 'fair', 'engaging'],
        },
        0, // System user
        []
      );

      // Extract participant name from response
      for (const participant of session.participants) {
        if (moderatorResponse.toLowerCase().includes(participant.name.toLowerCase())) {
          return {
            participantId: participant.id,
            reasoning: moderatorResponse,
          };
        }
      }

      // Default to round-robin if no clear decision
      const lastSpeakerIndex = session.participants.findIndex(p => p.id === lastMessage.senderId);
      const nextIndex = (lastSpeakerIndex + 1) % session.participants.length;

      return {
        participantId: session.participants[nextIndex].id,
        reasoning: 'Round-robin fallback',
      };
    } catch (error) {
      console.error('Moderator decision failed:', error);
      return { participantId: null, reasoning: 'Error in moderation' };
    }
  }

  /**
   * Check if user wants to intervene in group conversation
   */
  static shouldAllowUserIntervention(userMessage: string, session: GroupChatSession): boolean {
    const lowerMessage = userMessage.toLowerCase();

    // Direct interventions
    if (
      lowerMessage.includes('@') ||
      lowerMessage.includes('stop') ||
      lowerMessage.includes('wait') ||
      lowerMessage.includes('question')
    ) {
      return true;
    }

    // If conversation has been going on too long without user input
    const aiMessagesSinceUser = session.messages
      .slice()
      .reverse()
      .findIndex(msg => msg.type === 'user');

    return aiMessagesSinceUser > 5; // Allow intervention after 5 AI messages
  }

  /**
   * Process a complete group chat turn
   */
  static async processGroupChatTurn(
    session: GroupChatSession,
    userMessage: string,
    userId: number
  ): Promise<GroupChatMessage[]> {
    const newMessages: GroupChatMessage[] = [];

    // Add user message to session
    const userChatMessage: GroupChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: userMessage,
      sender: 'User',
      senderId: userId,
      timestamp: new Date(),
      type: 'user',
    };

    session.messages.push(userChatMessage);
    newMessages.push(userChatMessage);

    // Generate AI responses
    let currentMessage = userMessage;
    let lastSpeaker = userChatMessage;

    for (let i = 0; i < Math.min(session.participants.length, 3); i++) {
      // Limit to 3 responses per turn
      const nextSpeaker = await this.determineNextSpeaker(session, lastSpeaker);

      if (!nextSpeaker) break;

      try {
        const response = await this.generateGroupResponse(
          nextSpeaker,
          currentMessage,
          session.messages,
          userId
        );

        const aiMessage: GroupChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: response,
          sender: nextSpeaker.name,
          senderId: nextSpeaker.id,
          timestamp: new Date(),
          type: 'ai',
          emotionalContext: nextSpeaker.emotionalState,
        };

        session.messages.push(aiMessage);
        newMessages.push(aiMessage);

        // Update last speaker and message
        lastSpeaker = aiMessage;
        currentMessage = response;

        // Small delay between responses
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to generate response for ${nextSpeaker.name}:`, error);
        break;
      }
    }

    return newMessages;
  }
}
