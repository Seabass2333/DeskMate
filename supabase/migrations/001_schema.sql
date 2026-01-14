-- ============================================
-- DeskMate v1.2 Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. 邀请码表
CREATE TABLE IF NOT EXISTS invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    tier TEXT NOT NULL DEFAULT 'standard',  -- early/beta/standard/pro
    max_uses INT,
    current_uses INT DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 用户/设备表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT UNIQUE,
    email TEXT UNIQUE,
    auth_id UUID,
    vip_tier TEXT DEFAULT 'free',
    code_id UUID REFERENCES invite_codes(id),
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 使用统计表
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    device_id TEXT,
    event_type TEXT NOT NULL,
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at);

-- 初始邀请码
INSERT INTO invite_codes (code, tier, max_uses) VALUES
    ('VIP-2024-CAT', 'pro', 100),
    ('MOCHI-LOVE', 'pro', 100),
    ('DESKMATE-PRO', 'pro', NULL),
    ('POCHI-POWER', 'pro', 100)
ON CONFLICT (code) DO NOTHING;
