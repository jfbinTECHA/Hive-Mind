export type AvatarExpression =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'flirty'
  | 'thinking'
  | 'excited'
  | 'angry'
  | 'surprised'
  | 'bored'
  | 'confused';

export interface AvatarState {
  expression: AvatarExpression;
  intensity: number; // 0-1, how strong the expression is
  transitionDuration: number; // milliseconds for animation
  lastChanged: number;
}

export interface AvatarConfig {
  baseUrl: string;
  expressions: Record<AvatarExpression, string>;
  personalityOverrides?: Record<string, Partial<Record<AvatarExpression, string>>>;
}

export class AvatarEngine {
  private static readonly DEFAULT_CONFIG: AvatarConfig = {
    baseUrl: '/avatars',
    expressions: {
      neutral: '😐',
      happy: '😊',
      sad: '😢',
      flirty: '😘',
      thinking: '🤔',
      excited: '🤩',
      angry: '😠',
      surprised: '😮',
      bored: '😴',
      confused: '😕',
    },
    personalityOverrides: {
      friendly: {
        neutral: '🙂',
        happy: '😄',
        sad: '😔',
        flirty: '😘',
        thinking: '🤨',
        excited: '🤗',
        angry: '😤',
        surprised: '😲',
        bored: '😌',
        confused: '😅',
      },
      professional: {
        neutral: '😐',
        happy: '🙂',
        sad: '😔',
        flirty: '😏',
        thinking: '🤔',
        excited: '👍',
        angry: '😠',
        surprised: '😯',
        bored: '😑',
        confused: '🤨',
      },
      humorous: {
        neutral: '😏',
        happy: '😂',
        sad: '😢',
        flirty: '😜',
        thinking: '🤪',
        excited: '🤣',
        angry: '😡',
        surprised: '😵',
        bored: '😴',
        confused: '🤯',
      },
      serious: {
        neutral: '😐',
        happy: '🙂',
        sad: '😢',
        flirty: '😏',
        thinking: '🤔',
        excited: '🤩',
        angry: '😠',
        surprised: '😮',
        bored: '😑',
        confused: '🤨',
      },
    },
  };

  private config: AvatarConfig;
  private currentStates: Map<string, AvatarState> = new Map();

  constructor(config?: Partial<AvatarConfig>) {
    this.config = { ...AvatarEngine.DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze sentiment and determine appropriate avatar expression
   */
  static analyzeExpressionFromSentiment(sentiment: any, emotionalState?: any): AvatarExpression {
    // Primary sentiment-based mapping
    switch (sentiment.sentiment) {
      case 'positive':
        if (sentiment.intensity > 0.7) return 'excited';
        if (emotionalState && emotionalState.flirtiness > 0.6) return 'flirty';
        return 'happy';

      case 'negative':
        if (sentiment.intensity > 0.7) return 'angry';
        return 'sad';

      default:
        // Check for specific emotions
        if (sentiment.emotions) {
          const { joy, sadness, anger, surprise, trust } = sentiment.emotions;

          if (surprise > 0.6) return 'surprised';
          if (anger > 0.6) return 'angry';
          if (joy > 0.6) return 'happy';
          if (sadness > 0.6) return 'sad';
        }

        // Check emotional state for thinking/bored states
        if (emotionalState) {
          if (emotionalState.curiosity > 0.7) return 'thinking';
          if (emotionalState.energy < 0.3) return 'bored';
        }

        return 'neutral';
    }
  }

  /**
   * Get avatar image/emoji for specific expression and personality
   */
  getAvatarForExpression(
    expression: AvatarExpression,
    personality?: string,
    intensity: number = 1
  ): string {
    // Check for personality-specific overrides
    if (personality && this.config.personalityOverrides?.[personality]?.[expression]) {
      return this.config.personalityOverrides[personality][expression]!;
    }

    // Return base expression
    return this.config.expressions[expression];
  }

  /**
   * Update avatar state for a specific AI companion
   */
  updateAvatarState(
    companionId: string,
    expression: AvatarExpression,
    intensity: number = 1,
    transitionDuration: number = 500
  ): AvatarState {
    const newState: AvatarState = {
      expression,
      intensity: Math.max(0, Math.min(1, intensity)),
      transitionDuration,
      lastChanged: Date.now(),
    };

    this.currentStates.set(companionId, newState);
    return newState;
  }

  /**
   * Get current avatar state for a companion
   */
  getAvatarState(companionId: string): AvatarState | null {
    return this.currentStates.get(companionId) || null;
  }

  /**
   * Automatically update avatar based on message content and emotional state
   */
  async updateAvatarFromMessage(
    companionId: string,
    message: string,
    emotionalState?: any,
    personality?: string
  ): Promise<AvatarState> {
    // Import sentiment analysis dynamically to avoid circular dependencies
    const { EmotionalStateManager } = await import('./emotion');

    const sentiment = EmotionalStateManager.analyzeSentiment(message);
    const expression = AvatarEngine.analyzeExpressionFromSentiment(sentiment, emotionalState);

    // Calculate intensity based on sentiment strength and emotional state
    let intensity = sentiment.intensity;

    if (emotionalState) {
      // Amplify intensity based on emotional state
      intensity *= emotionalState.energy * 0.5 + emotionalState.mood * 0.3 + 0.2;
    }

    return this.updateAvatarState(companionId, expression, intensity);
  }

  /**
   * Get CSS classes for avatar animation based on state
   */
  getAvatarAnimationClasses(state: AvatarState): string {
    const classes = ['avatar-transition'];

    // Expression-based animations
    switch (state.expression) {
      case 'happy':
        classes.push('avatar-happy-bounce');
        break;
      case 'excited':
        classes.push('avatar-excited-shake');
        break;
      case 'sad':
        classes.push('avatar-sad-fade');
        break;
      case 'thinking':
        classes.push('avatar-thinking-pulse');
        break;
      case 'flirty':
        classes.push('avatar-flirty-glow');
        break;
      case 'surprised':
        classes.push('avatar-surprised-scale');
        break;
      case 'angry':
        classes.push('avatar-angry-shake');
        break;
    }

    // Intensity-based modifiers
    if (state.intensity > 0.7) {
      classes.push('avatar-high-intensity');
    } else if (state.intensity < 0.3) {
      classes.push('avatar-low-intensity');
    }

    return classes.join(' ');
  }

  /**
   * Generate avatar style object for dynamic styling
   */
  getAvatarStyle(state: AvatarState): React.CSSProperties {
    const baseStyle: React.CSSProperties = {
      transition: `all ${state.transitionDuration}ms ease-in-out`,
    };

    // Expression-specific styles
    switch (state.expression) {
      case 'happy':
        return {
          ...baseStyle,
          filter: `brightness(${1 + state.intensity * 0.2})`,
          transform: `scale(${1 + state.intensity * 0.1})`,
        };

      case 'excited':
        return {
          ...baseStyle,
          filter: `contrast(${1 + state.intensity * 0.3}) brightness(${1 + state.intensity * 0.2})`,
        };

      case 'sad':
        return {
          ...baseStyle,
          filter: `brightness(${1 - state.intensity * 0.3}) saturate(${1 - state.intensity * 0.2})`,
        };

      case 'flirty':
        return {
          ...baseStyle,
          filter: `hue-rotate(${state.intensity * 20}deg) brightness(${1 + state.intensity * 0.1})`,
        };

      case 'thinking':
        return {
          ...baseStyle,
          filter: `blur(${state.intensity * 0.5}px)`,
        };

      default:
        return baseStyle;
    }
  }

  /**
   * Preload avatar images for smooth transitions
   */
  preloadAvatars(): void {
    Object.values(this.config.expressions).forEach(avatar => {
      if (avatar.startsWith('http') || avatar.startsWith('/')) {
        const img = new Image();
        img.src = avatar;
      }
    });
  }

  /**
   * Create generative avatar prompt for AI image generation
   */
  static createGenerativePrompt(
    personality: string,
    expression: AvatarExpression,
    intensity: number,
    description?: string
  ): string {
    const basePrompts = {
      friendly: 'A friendly, warm character with soft features',
      professional: 'A professional, composed character with neat appearance',
      humorous: 'A fun, expressive character with playful features',
      serious: 'A thoughtful, serious character with intense eyes',
    };

    const expressionPrompts = {
      neutral: 'with a calm, neutral expression',
      happy: 'smiling warmly with bright, happy eyes',
      sad: 'with a gentle, sad expression and downcast eyes',
      flirty: 'with a playful, flirty smile and sparkling eyes',
      thinking: 'with a thoughtful, contemplative expression, looking upward',
      excited: 'with wide eyes and an excited, joyful expression',
      angry: 'with furrowed brows and an intense, serious expression',
      surprised: 'with wide eyes and an open-mouthed surprised expression',
      bored: 'with half-lidded eyes and a disinterested expression',
      confused: 'with a puzzled expression and tilted head',
    };

    const intensityModifier = intensity > 0.7 ? 'very ' : intensity > 0.4 ? '' : 'slightly ';

    const basePrompt = basePrompts[personality as keyof typeof basePrompts] || basePrompts.friendly;
    const expressionPrompt = expressionPrompts[expression];

    return `${basePrompt} ${intensityModifier}${expressionPrompt}. ${description || ''} High quality, detailed digital art, character portrait, professional lighting.`;
  }
}

// Global avatar engine instance
export const avatarEngine = new AvatarEngine();
