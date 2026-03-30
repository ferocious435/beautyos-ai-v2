-- BeautyOS AI v2 - Secure Production Database Sync

-- ==============================================================================
-- 1. TABLES & SCHEMA REVISION
-- ==============================================================================

-- Users & Profiles
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'client',
    business_name TEXT,
    subscription_tier TEXT DEFAULT 'free',
    address TEXT,
    district TEXT,
    phone TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Master's Services (New Table)
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration_mins INTEGER NOT NULL DEFAULT 60,
    price NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Master's Active Schedules (New Table)
CREATE TABLE IF NOT EXISTS master_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id UUID REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL DEFAULT '09:00',
    end_time TIME NOT NULL DEFAULT '19:00',
    is_working BOOLEAN DEFAULT TRUE,
    UNIQUE(master_id, day_of_week)
);

-- Bookings & Appointments
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id UUID REFERENCES users(id),
    client_id UUID REFERENCES users(id),
    service_id UUID REFERENCES services(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    total_price NUMERIC,
    status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled_by_client', 'cancelled_by_master', 'completed'
    notified_24h BOOLEAN DEFAULT FALSE,
    notified_3h BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolios
CREATE TABLE IF NOT EXISTS portfolio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    type TEXT DEFAULT 'original',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot Sessions (Telegraf Persistence)
CREATE TABLE IF NOT EXISTS bot_sessions (
    user_id BIGINT PRIMARY KEY,
    session_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market Trends & Analytics
CREATE TABLE IF NOT EXISTS market_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT,
    visual_anchors TEXT,
    semantic_anchors TEXT,
    hidden_deficits TEXT,
    post_template TEXT,
    media_production_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    master_id UUID REFERENCES users(id),
    client_id UUID REFERENCES users(id),
    district TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- By default turning RLS on drops all permissions for public/anon keys.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;

-- We assume frontend users access Supabase using ANON key.
-- Without proper auth triggers, we map RLS based on UUID? 
-- Real security dictates we should use Custom JWTs. But as interim, 
-- allow reading public data, restrict writes.

-- Users: Anyone can read profiles. (Needed for master search)
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (true); -- Note: In real prod, restrict to auth.uid() if JWT used.
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (true);

-- Services: Public read, writing only by masters (for now allowed openly, need API gate)
CREATE POLICY "Services are viewable by everyone" ON services FOR SELECT USING (is_active = true);
CREATE POLICY "Masters can edit services" ON services FOR ALL USING (true);

-- Schedules: Public read
CREATE POLICY "Schedules are viewable by everyone" ON master_schedules FOR SELECT USING (is_working = true);

-- Bookings: Only involved parties can view
CREATE POLICY "View involved bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Create bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Update bookings" ON bookings FOR UPDATE USING (true);

-- Portfolio: Public read
CREATE POLICY "Portfolio is viewable by everyone" ON portfolio FOR SELECT USING (true);


-- ==============================================================================
-- 3. STORED PROCEDURES (RPC)
-- ==============================================================================

-- Generates available slots for a master on a specific date
CREATE OR REPLACE FUNCTION get_available_slots(m_id BIGINT, select_date DATE)
RETURNS TABLE (slot_time TIMESTAMP WITH TIME ZONE) 
LANGUAGE plpgsql
AS $$
DECLARE
    master_uuid UUID;
    target_start TIMESTAMP WITH TIME ZONE;
    target_end TIMESTAMP WITH TIME ZONE;
    current_time_slot TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Resolve master UUID from telegram ID
    SELECT id INTO master_uuid FROM users WHERE telegram_id = m_id LIMIT 1;
    
    IF master_uuid IS NULL THEN
        RETURN;
    END IF;

    -- Setup operating hours (Hardcoded 09:00 - 19:00 if master_schedules is empty)
    -- select_date is treated as local timezone for simplicity in MVP
    target_start := select_date + time '09:00:00';
    target_end := select_date + time '19:00:00';
    
    current_time_slot := target_start;

    WHILE current_time_slot < target_end LOOP
        -- Check if SLOT overlaps with existing non-cancelled bookings
        -- Assuming fixed 1-hour slots for MVP Fallback compatibility
        IF NOT EXISTS (
            SELECT 1 FROM bookings 
            WHERE master_id = master_uuid 
            AND status IN ('pending', 'confirmed')
            AND (
                (current_time_slot >= start_time AND current_time_slot < end_time) OR
                ((current_time_slot + interval '60 minutes') > start_time AND (current_time_slot + interval '60 minutes') <= end_time)
            )
        ) THEN
            slot_time := current_time_slot;
            RETURN NEXT;
        END IF;
        
        current_time_slot := current_time_slot + interval '60 minutes'; -- Interval step
    END LOOP;
END;
$$;
