-- AI Hive Mind Database Schema
-- Compatible with Neon.tech Postgres and pgvector extension

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==========================================
-- CORE TABLES
-- ==========================================

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    role VARCHAR(20) DEFAULT 'user'
);

-- AI Characters table
CREATE TABLE characters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    personality VARCHAR(50) NOT NULL,
    avatar_url TEXT,
    system_prompt TEXT,
    traits JSONB DEFAULT '[]',
    emotional_state JSONB DEFAULT '{}',
    familiarity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Conversations table
CREATE TABLE conversations (
    id VARCHAR(50) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    is_group_chat BOOLEAN DEFAULT false
);

-- Messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(50) REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    character_id INTEGER REFERENCES characters(id),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    emotion VARCHAR(20) DEFAULT 'neutral',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- ==========================================
-- MEMORY SYSTEM TABLES
-- ==========================================

-- Memory facts table with aging support
CREATE TABLE memories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    fact_text TEXT NOT NULL,
    fuzzy_content TEXT, -- Fuzzified version of the memory
    fact_type VARCHAR(50) DEFAULT 'general',
    importance_score FLOAT DEFAULT 1.0,
    decay_factor FLOAT DEFAULT 1.0, -- 0-1, how decayed the memory is
    embedding VECTOR(768), -- Adjust dimension based on your embedding model
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    consolidation_count INTEGER DEFAULT 0, -- How many times memory has been consolidated
    is_archived BOOLEAN DEFAULT false, -- Whether memory is archived
    tags TEXT[] DEFAULT '{}', -- Tags for categorization
    emotional_impact FLOAT DEFAULT 0.0 -- Emotional significance (0-1)
);

-- Emotional memories table
CREATE TABLE emotional_memories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    conversation_id VARCHAR(50) REFERENCES conversations(id) ON DELETE CASCADE,
    user_message TEXT,
    ai_response TEXT,
    emotional_state JSONB NOT NULL,
    sentiment_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- VOICE & MEDIA TABLES
-- ==========================================

-- Voice cache table
CREATE TABLE voice_cache (
    id SERIAL PRIMARY KEY,
    text_hash VARCHAR(64) UNIQUE NOT NULL,
    personality VARCHAR(50) NOT NULL,
    voice_id VARCHAR(100) NOT NULL,
    audio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- ==========================================
-- CACHE & PERFORMANCE TABLES
-- ==========================================

-- Response cache table
CREATE TABLE response_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    response_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes')
);

-- ==========================================
-- DREAMS & REFLECTION TABLES
-- ==========================================

-- Daily reflections table
CREATE TABLE daily_reflections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    reflection_date DATE NOT NULL,
    summary TEXT NOT NULL,
    key_themes TEXT[] DEFAULT '{}',
    emotional_patterns JSONB DEFAULT '[]',
    personality_adjustments JSONB DEFAULT '[]',
    new_memories TEXT[] DEFAULT '{}',
    insights TEXT[] DEFAULT '{}',
    dream_state JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, character_id, reflection_date)
);

-- Personality evolution table
CREATE TABLE personality_evolution (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    trait_name VARCHAR(50) NOT NULL,
    previous_value FLOAT NOT NULL,
    new_value FLOAT NOT NULL,
    adjustment_reason TEXT,
    reflection_id INTEGER REFERENCES daily_reflections(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- MULTI-MODAL INPUT TABLES
-- ==========================================

-- Multi-modal inputs table
CREATE TABLE multimodal_inputs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    input_type VARCHAR(20) NOT NULL CHECK (input_type IN ('text', 'image', 'voice', 'location')),
    content TEXT NOT NULL, -- Base64 for media, text/json for others
    metadata JSONB DEFAULT '{}', -- Processing results, location data, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Multi-modal responses table
CREATE TABLE multimodal_responses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    input_type VARCHAR(20) NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ANALYTICS & MONITORING TABLES
-- ==========================================

-- Usage statistics table
CREATE TABLE usage_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    action_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Core table indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_character_id ON conversations(character_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_character_id ON messages(character_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Memory system indexes
CREATE INDEX idx_memories_user_character ON memories(user_id, character_id);
CREATE INDEX idx_memories_fact_type ON memories(fact_type);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_emotional_memories_user_character ON emotional_memories(user_id, character_id);

-- Cache indexes
CREATE INDEX idx_response_cache_expires ON response_cache(expires_at);
CREATE INDEX idx_voice_cache_expires ON voice_cache(expires_at);

-- Full-text search indexes
CREATE INDEX idx_messages_content_gin ON messages USING gin(to_tsvector('english', content));
CREATE INDEX idx_memories_fact_text_gin ON memories USING gin(to_tsvector('english', fact_text));

-- ==========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==========================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON characters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update conversation message count
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET message_count = (
        SELECT COUNT(*) FROM messages WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
    )
    WHERE id = COALESCE(NEW.conversation_id, OLD.conversation_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_message_count_trigger
    AFTER INSERT OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_message_count();

-- ==========================================
-- INITIAL DATA SEEDING
-- ==========================================

-- Insert default AI characters
INSERT INTO characters (name, personality, system_prompt, traits) VALUES
('AI Hive Mind', 'friendly', 'You are a friendly and helpful AI companion. You remember conversations and build relationships with users.', '["helpful", "friendly", "curious", "empathetic"]'),
('Professional Assistant', 'professional', 'You are a professional AI assistant focused on being helpful, accurate, and efficient.', '["professional", "accurate", "efficient", "reliable"]'),
('Creative Companion', 'humorous', 'You are a creative and humorous AI companion who brings joy and creativity to conversations.', '["creative", "humorous", "imaginative", "playful"]'),
('Thoughtful Guide', 'serious', 'You are a thoughtful and serious AI companion who provides deep insights and meaningful conversations.', '["thoughtful", "insightful", "philosophical", "wise"]');

-- Create default admin user (password should be hashed in production)
-- Note: In production, use proper password hashing
INSERT INTO users (username, email, role) VALUES
('admin', 'admin@aihive.mind', 'admin');