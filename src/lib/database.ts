import { Pool } from 'pg';
import { createClient } from 'redis';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_hive_mind',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Redis connection
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => console.error('Redis Client Error', err));

// Initialize connections
export async function initDatabase() {
  try {
    await pool.connect();
    console.log('PostgreSQL connected');

    await redis.connect();
    console.log('Redis connected');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

// Database schemas
export const schemas = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE,
      auth_provider VARCHAR(50),
      auth_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,

  characters: `
    CREATE TABLE IF NOT EXISTS characters (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      system_prompt TEXT,
      avatar_url VARCHAR(500),
      traits TEXT[], -- Array of trait strings
      personality VARCHAR(50) DEFAULT 'friendly',
      voice VARCHAR(100) DEFAULT 'default',
      familiarity INTEGER DEFAULT 0,
      emotional_state JSONB, -- Emotional state storage
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,

  memory: `
    CREATE TABLE IF NOT EXISTS memory (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      ai_id INTEGER REFERENCES characters(id),
      fact_text TEXT NOT NULL,
      vector_embedding VECTOR(1536), -- OpenAI ada-002 embedding dimension
      fact_type VARCHAR(50) DEFAULT 'general',
      confidence FLOAT DEFAULT 1.0,
      last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,

  messages: `
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      ai_id INTEGER REFERENCES characters(id),
      user_message TEXT,
      ai_response TEXT,
      conversation_id VARCHAR(255),
      emotion VARCHAR(50) DEFAULT 'neutral',
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,

  sessions: `
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      session_token VARCHAR(255) UNIQUE,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `
};

// Database operations
export class Database {
  // Users
  static async createUser(name: string, email?: string, authProvider?: string, authId?: string) {
    const query = `
      INSERT INTO users (name, email, auth_provider, auth_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [name, email, authProvider, authId]);
    return result.rows[0];
  }

  static async getUserById(id: number) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getUserByEmail(email: string) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  // Characters
  static async createCharacter(name: string, systemPrompt?: string, avatarUrl?: string, traits?: string[], personality?: string) {
    const query = `
      INSERT INTO characters (name, system_prompt, avatar_url, traits, personality)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [name, systemPrompt, avatarUrl, traits || [], personality || 'friendly']);
    return result.rows[0];
  }

  static async getAllCharacters() {
    const query = 'SELECT * FROM characters ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async getCharacterById(id: number) {
    const query = 'SELECT * FROM characters WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getCharacterByName(name: string) {
    const query = 'SELECT * FROM characters WHERE name = $1';
    const result = await pool.query(query, [name]);
    return result.rows[0];
  }

  static async updateCharacterFamiliarity(id: number, familiarity: number) {
    const query = 'UPDATE characters SET familiarity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [familiarity, id]);
    return result.rows[0];
  }

  static async updateCharacterEmotionalState(id: number, emotionalState: any) {
    const query = 'UPDATE characters SET emotional_state = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [JSON.stringify(emotionalState), id]);
    return result.rows[0];
  }

  static async getCharacterEmotionalState(id: number) {
    const character = await this.getCharacterById(id);
    return character?.emotional_state || null;
  }

  // Memory
  static async createMemory(userId: number, aiId: number, factText: string, factType: string = 'general', vectorEmbedding?: number[]) {
    const query = `
      INSERT INTO memory (user_id, ai_id, fact_text, fact_type, vector_embedding)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, aiId, factText, factType, vectorEmbedding]);
    return result.rows[0];
  }

  static async getMemoriesByAI(aiId: number, limit: number = 50) {
    const query = 'SELECT * FROM memory WHERE ai_id = $1 ORDER BY last_used DESC LIMIT $2';
    const result = await pool.query(query, [aiId, limit]);
    return result.rows;
  }

  static async getMemoriesByUserAndAI(userId: number, aiId: number, limit: number = 50) {
    const query = 'SELECT * FROM memory WHERE user_id = $1 AND ai_id = $2 ORDER BY last_used DESC LIMIT $3';
    const result = await pool.query(query, [userId, aiId, limit]);
    return result.rows;
  }

  static async updateMemoryLastUsed(id: number) {
    const query = 'UPDATE memory SET last_used = CURRENT_TIMESTAMP WHERE id = $1';
    await pool.query(query, [id]);
  }

  static async deleteMemory(id: number) {
    const query = 'DELETE FROM memories WHERE id = $1';
    await pool.query(query, [id]);
  }

  // Memory Aging System Methods
  static async getMemoriesForConsolidation(userId: number, characterId?: number) {
    let query = `
      SELECT * FROM memories
      WHERE user_id = $1 AND is_archived = false
      ORDER BY last_accessed ASC
    `;
    const params = [userId];

    if (characterId) {
      query += ' AND character_id = $2';
      params.push(characterId);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async archiveMemory(id: number) {
    const query = 'UPDATE memories SET is_archived = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    await pool.query(query, [id]);
  }

  static async updateMemoryDecay(id: number, decayFactor: number, fuzzyContent: string) {
    const query = `
      UPDATE memories
      SET decay_factor = $1, fuzzy_content = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    await pool.query(query, [decayFactor, fuzzyContent, id]);
  }

  static async getMemoryById(id: number) {
    const query = 'SELECT * FROM memories WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateMemoryAccess(id: number, consolidationCount: number) {
    const query = `
      UPDATE memories
      SET consolidation_count = $1, last_accessed = CURRENT_TIMESTAMP, access_count = access_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await pool.query(query, [consolidationCount, id]);
  }

  static async searchMemories(query: string, userId: number, characterId?: number, limit: number = 10) {
    let sqlQuery = `
      SELECT * FROM memories
      WHERE user_id = $1 AND is_archived = false
    `;
    const params: (string | number)[] = [userId];
    let paramIndex = 2;

    if (characterId) {
      sqlQuery += ` AND character_id = $${paramIndex}`;
      params.push(characterId);
      paramIndex++;
    }

    // Simple text search (can be enhanced with full-text search)
    sqlQuery += ` AND (fact_text ILIKE $${paramIndex} OR fuzzy_content ILIKE $${paramIndex})`;
    params.push(`%${query}%`);
    paramIndex++;

    sqlQuery += ` ORDER BY decay_factor DESC, importance_score DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(sqlQuery, params);
    return result.rows;
  }

  static async getMemoryStats(userId: number, characterId?: number) {
    let query = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN is_archived = false THEN 1 END) as active,
        COUNT(CASE WHEN is_archived = true THEN 1 END) as archived,
        AVG(decay_factor) as average_decay,
        MIN(created_at) as oldest_memory,
        MAX(created_at) as newest_memory
      FROM memories
      WHERE user_id = $1
    `;
    const params = [userId];

    if (characterId) {
      query += ' AND character_id = $2';
      params.push(characterId);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  // Memory Aging System Methods
  static async createMemoryWithAging(
    userId: number,
    characterId: number,
    factText: string,
    factType: string,
    importanceScore: number,
    tags: string[]
  ) {
    const query = `
      INSERT INTO memories (
        user_id, character_id, fact_text, fact_type, importance_score,
        tags, created_at, updated_at, last_accessed
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, characterId, factText, factType, importanceScore, tags]);
    return result.rows[0];
  }

  // Dreams & Reflection System Methods
  static async createDailyReflection(
    userId: number,
    characterId: number,
    reflectionDate: string,
    summary: string,
    keyThemes: string[],
    emotionalPatterns: any[],
    personalityAdjustments: any[],
    newMemories: string[],
    insights: string[],
    dreamState: any
  ) {
    const query = `
      INSERT INTO daily_reflections (
        user_id, character_id, reflection_date, summary, key_themes,
        emotional_patterns, personality_adjustments, new_memories, insights, dream_state
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id, character_id, reflection_date)
      DO UPDATE SET
        summary = EXCLUDED.summary,
        key_themes = EXCLUDED.key_themes,
        emotional_patterns = EXCLUDED.emotional_patterns,
        personality_adjustments = EXCLUDED.personality_adjustments,
        new_memories = EXCLUDED.new_memories,
        insights = EXCLUDED.insights,
        dream_state = EXCLUDED.dream_state
      RETURNING *
    `;
    const result = await pool.query(query, [
      userId, characterId, reflectionDate, summary, keyThemes,
      JSON.stringify(emotionalPatterns), JSON.stringify(personalityAdjustments),
      newMemories, insights, JSON.stringify(dreamState)
    ]);
    return result.rows[0];
  }

  static async createPersonalityAdjustment(
    userId: number,
    characterId: number,
    traitName: string,
    previousValue: number,
    newValue: number,
    adjustmentReason: string,
    reflectionId?: number
  ) {
    const query = `
      INSERT INTO personality_evolution (
        user_id, character_id, trait_name, previous_value, new_value, adjustment_reason, reflection_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [
      userId, characterId, traitName, previousValue, newValue, adjustmentReason, reflectionId
    ]);
    return result.rows[0];
  }

  static async getConversationsForDateRange(
    userId: number,
    characterId: number,
    startDate: Date,
    endDate: Date
  ) {
    const query = `
      SELECT m.*,
             CASE WHEN m.user_id = $1 THEN 'user' ELSE 'ai' END as sender
      FROM messages m
      WHERE m.user_id = $1
        AND (m.ai_id = $2 OR m.ai_id IS NULL)
        AND m.timestamp >= $3
        AND m.timestamp < $4
      ORDER BY m.timestamp ASC
    `;
    const result = await pool.query(query, [userId, characterId, startDate, endDate]);
    return result.rows;
  }

  static async getDailyReflections(userId: number, characterId?: number, limit: number = 10) {
    let query = `
      SELECT * FROM daily_reflections
      WHERE user_id = $1
    `;
    const params: (string | number)[] = [userId];
    let paramIndex = 2;

    if (characterId) {
      query += ` AND character_id = $${paramIndex}`;
      params.push(characterId);
      paramIndex++;
    }

    query += ` ORDER BY reflection_date DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getPersonalityEvolution(userId: number, characterId?: number, limit: number = 50) {
    let query = `
      SELECT * FROM personality_evolution
      WHERE user_id = $1
    `;
    const params: (string | number)[] = [userId];
    let paramIndex = 2;

    if (characterId) {
      query += ` AND character_id = $${paramIndex}`;
      params.push(characterId);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Vector similarity search
  static async findSimilarMemories(userId: number, aiId: number, queryEmbedding: number[], limit: number = 5) {
    const query = `
      SELECT *,
             1 - (vector_embedding <=> $3) as similarity
      FROM memory
      WHERE user_id = $1 AND ai_id = $2
      ORDER BY vector_embedding <=> $3
      LIMIT $4
    `;
    const result = await pool.query(query, [userId, aiId, `[${queryEmbedding.join(',')}]`, limit]);
    return result.rows;
  }

  static async findSimilarMemoriesAcrossAIs(userId: number, queryEmbedding: number[], limit: number = 5) {
    const query = `
      SELECT m.*,
             c.name as ai_name,
             1 - (m.vector_embedding <=> $2) as similarity
      FROM memory m
      JOIN characters c ON m.ai_id = c.id
      WHERE m.user_id = $1 AND m.vector_embedding IS NOT NULL
      ORDER BY m.vector_embedding <=> $2
      LIMIT $3
    `;
    const result = await pool.query(query, [userId, `[${queryEmbedding.join(',')}]`, limit]);
    return result.rows;
  }

  // Messages
  static async createMessage(userId: number, aiId: number, userMessage: string, aiResponse: string, conversationId?: string, emotion?: string) {
    const query = `
      INSERT INTO messages (user_id, ai_id, user_message, ai_response, conversation_id, emotion)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, aiId, userMessage, aiResponse, conversationId, emotion || 'neutral']);
    return result.rows[0];
  }

  static async getConversationHistory(userId: number, aiId: number, limit: number = 20) {
    const query = 'SELECT * FROM messages WHERE user_id = $1 AND ai_id = $2 ORDER BY timestamp DESC LIMIT $3';
    const result = await pool.query(query, [userId, aiId, limit]);
    return result.rows.reverse(); // Return in chronological order
  }

  // Sessions
  static async createSession(userId: number, sessionToken: string, expiresAt: Date) {
    const query = `
      INSERT INTO sessions (user_id, session_token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, sessionToken, expiresAt]);
    return result.rows[0];
  }

  static async getSessionByToken(sessionToken: string) {
    const query = 'SELECT * FROM sessions WHERE session_token = $1 AND expires_at > CURRENT_TIMESTAMP';
    const result = await pool.query(query, [sessionToken]);
    return result.rows[0];
  }

  static async deleteSession(sessionToken: string) {
    const query = 'DELETE FROM sessions WHERE session_token = $1';
    await pool.query(query, [sessionToken]);
  }
}

// Redis operations
export class Cache {
  static async set(key: string, value: any, ttl?: number) {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await redis.setEx(key, ttl, serializedValue);
    } else {
      await redis.set(key, serializedValue);
    }
  }

  static async get(key: string) {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  static async del(key: string) {
    await redis.del(key);
  }

  static async exists(key: string) {
    const result = await redis.exists(key);
    return result === 1;
  }
}

// Initialize database tables
export async function initializeTables() {
  try {
    for (const [tableName, schema] of Object.entries(schemas)) {
      await pool.query(schema);
      console.log(`Table ${tableName} initialized`);
    }
  } catch (error) {
    console.error('Error initializing tables:', error);
    throw error;
  }
}

export { pool, redis };