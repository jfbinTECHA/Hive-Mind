interface ModerationResult {
  safe: boolean;
  violations: Array<{
    type: 'profanity' | 'hate_speech' | 'violence' | 'adult_content' | 'spam';
    severity: 'low' | 'medium' | 'high';
    description: string;
    position?: {
      start: number;
      end: number;
    };
  }>;
  recommendations: string[];
}

// Basic content moderation patterns
const MODERATION_PATTERNS = {
  profanity: [
    /\b(fuck|shit|damn|bitch|cunt|asshole)\b/gi,
    /\b(dick|cock|pussy|tits|boobs)\b/gi,
  ],
  hate_speech: [
    /\b(nigger|chink|spic|wetback|raghead)\b/gi,
    /\b(faggot|tranny|homo)\b/gi,
  ],
  violence: [
    /\b(kill|murder|rape|assault|torture)\b/gi,
    /\b(bomb|explosive|weapon|gun)\b/gi,
  ],
  adult_content: [
    /\b(porn|sex|naked|nude|erotic)\b/gi,
    /\b(masturbat|orgasm|ejaculat)\b/gi,
  ],
  spam: [
    /(\b(?:http|https|www\.)\S+)/gi, // URLs
    /(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)/gi, // Emails
  ],
};

export class ContentModerator {
  /**
   * Check content for violations
   */
  static checkContent(content: string, context?: string): ModerationResult {
    const violations: ModerationResult['violations'] = [];
    const recommendations: string[] = [];

    // Check each pattern category
    Object.entries(MODERATION_PATTERNS).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const severity = this.getSeverity(category as keyof typeof MODERATION_PATTERNS, match[0]);
          violations.push({
            type: category as any,
            severity,
            description: `Detected ${category}: "${match[0]}"`,
            position: {
              start: match.index,
              end: match.index + match[0].length,
            },
          });
        }
      });
    });

    // Additional checks based on context
    if (context === 'chat') {
      // Check for repetitive messages
      if (this.isRepetitive(content)) {
        violations.push({
          type: 'spam',
          severity: 'medium',
          description: 'Repetitive or spammy content detected',
        });
      }

      // Check message length (too short or too long)
      if (content.length < 2) {
        violations.push({
          type: 'spam',
          severity: 'low',
          description: 'Message too short',
        });
      } else if (content.length > 2000) {
        violations.push({
          type: 'spam',
          severity: 'medium',
          description: 'Message too long',
        });
      }
    }

    // Generate recommendations
    if (violations.length > 0) {
      recommendations.push('Please review and modify your content to comply with community guidelines.');

      const highSeverity = violations.filter(v => v.severity === 'high');
      if (highSeverity.length > 0) {
        recommendations.push('Content contains serious violations. Please revise significantly.');
      }
    }

    return {
      safe: violations.length === 0,
      violations,
      recommendations,
    };
  }

  /**
   * Sanitize content by removing or replacing violations
   */
  static sanitizeContent(content: string): { sanitized: string; changes: string[] } {
    let sanitized = content;
    const changes: string[] = [];

    // Replace profanity with asterisks
    MODERATION_PATTERNS.profanity.forEach(pattern => {
      sanitized = sanitized.replace(pattern, (match) => {
        changes.push(`Replaced "${match}" with censored version`);
        return '*'.repeat(match.length);
      });
    });

    // Remove URLs and emails
    MODERATION_PATTERNS.spam.forEach(pattern => {
      sanitized = sanitized.replace(pattern, (match) => {
        changes.push(`Removed ${pattern === MODERATION_PATTERNS.spam[0] ? 'URL' : 'email'}: "${match}"`);
        return '';
      });
    });

    return { sanitized, changes };
  }

  private static getSeverity(category: keyof typeof MODERATION_PATTERNS, match: string): 'low' | 'medium' | 'high' {
    const severityMap = {
      profanity: 'medium' as const,
      hate_speech: 'high' as const,
      violence: 'high' as const,
      adult_content: 'medium' as const,
      spam: 'low' as const,
    };

    return severityMap[category];
  }

  private static isRepetitive(content: string): boolean {
    // Check for repeated characters
    if (/(.)\1{10,}/.test(content)) return true;

    // Check for repeated words
    const words = content.toLowerCase().split(/\s+/);
    const wordCounts = words.reduce((acc, word) => {
      if (word.length > 3) { // Only count meaningful words
        acc[word] = (acc[word] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.values(wordCounts).some(count => count > 3);
  }
}

// Middleware function for content moderation
export async function moderateContent(
  content: string,
  context?: string
): Promise<{ allowed: boolean; result: ModerationResult }> {
  const result = ContentModerator.checkContent(content, context);

  return {
    allowed: result.safe,
    result,
  };
}