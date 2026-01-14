-- ============================================
-- Row Level Security (RLS) 策略
-- Run this in Supabase SQL Editor
-- ============================================

-- 启用 RLS
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- invite_codes: 只读，通过函数访问
CREATE POLICY "invite_codes_read" ON invite_codes
    FOR SELECT USING (true);

-- users: 通过函数访问，不直接暴露
CREATE POLICY "users_insert" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (true);

CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (true);

-- analytics: 只能插入，不能读取（保护隐私）
CREATE POLICY "analytics_insert" ON analytics
    FOR INSERT WITH CHECK (true);

-- 注意：生产环境应限制更严格的策略
-- 这里使用宽松策略便于开发测试
