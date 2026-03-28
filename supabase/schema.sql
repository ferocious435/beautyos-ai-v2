-- BeautyOS AI v2 - Database Schema (Reconstructed)
-- Created: 2026-03-28

-- 1. Users & Profiles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    full_name TEXT,
    first_name TEXT,
    business_name TEXT,
    role TEXT DEFAULT 'client', -- 'master', 'client', 'admin'
    subscription_tier TEXT DEFAULT 'free', -- 'free', 'essential', 'pro', 'elite'
    address TEXT,
    district TEXT,
    avatar_url TEXT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Portfolios / Creations
CREATE TABLE portfolio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    type TEXT DEFAULT 'original', -- 'original', 'ai_creation'
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Bookings & Appointments
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id UUID REFERENCES users(id),
    client_id UUID REFERENCES users(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'confirmed', -- 'pending', 'confirmed', 'cancelled', 'completed'
    notified_24h BOOLEAN DEFAULT FALSE,
    notified_3h BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bot Sessions (Telegraf Persistence)
CREATE TABLE bot_sessions (
    id BIGINT PRIMARY KEY, -- telegram_id
    session JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Market Trends (AI Generated)
CREATE TABLE market_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT, -- 'weekly_global'
    visual_anchors TEXT,
    semantic_anchors TEXT,
    hidden_deficits TEXT,
    post_template TEXT,
    media_production_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Analytics
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    master_id UUID REFERENCES users(id),
    client_id UUID REFERENCES users(id),
    district TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Functions & RPCs (Placeholders for logic)
-- get_nearby_masters(lat float, long float, radius_km integer)
-- get_available_slots(master_id uuid, date date)
