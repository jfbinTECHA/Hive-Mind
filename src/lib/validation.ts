import { z } from 'zod';

// Chat API schema
export const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  context: z.array(z.object({
    content: z.string(),
    type: z.string()
  })).optional().default([]),
  aiName: z.string().optional(),
  userId: z.union([z.string(), z.number()]).optional(),
  groupChat: z.boolean().optional().default(false),
  participantIds: z.array(z.number()).optional(),
}).refine((data) => {
  if (!data.groupChat && !data.aiName) {
    return false;
  }
  if (data.groupChat && (!data.participantIds || data.participantIds.length < 2)) {
    return false;
  }
  return true;
}, {
  message: 'Either aiName for single chat or groupChat with at least 2 participantIds required',
  path: ['aiName']
});

// Memory API POST schema
export const memoryPostSchema = z.object({
  aiId: z.union([z.string(), z.number()]),
  userId: z.union([z.string(), z.number()]).optional(),
  type: z.string().min(1, 'Type is required'),
  key: z.string().min(1, 'Key is required'),
  value: z.string().optional(),
  action: z.enum(['add', 'update', 'delete']).default('add'),
}).refine((data) => {
  if ((data.action === 'add' || data.action === 'update') && !data.value) {
    return false;
  }
  return true;
}, {
  message: 'Value is required for add/update actions',
  path: ['value']
});

// Memory API GET query schema
export const memoryGetQuerySchema = z.object({
  aiId: z.union([z.string(), z.number()]).optional(),
  userId: z.union([z.string(), z.number()]).optional(),
  type: z.string().optional(),
});

// Multimodal JSON request schema
export const multimodalJsonSchema = z.object({
  type: z.literal('url'),
  sourceUrl: z.string().url('Invalid URL'),
  companionId: z.string().optional(),
});

// Multimodal form data schema (validated separately)
export const multimodalFormSchema = z.object({
  type: z.enum(['image', 'document']),
  companionId: z.string().optional(),
  // File validation done separately
});

// Helper function to validate and return parsed data or error
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ') };
    }
    return { success: false, error: 'Validation failed' };
  }
}