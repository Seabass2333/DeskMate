-- ============================================
-- 邀请码验证函数
-- Run this in Supabase SQL Editor
-- ============================================

CREATE OR REPLACE FUNCTION verify_invite_code(p_code TEXT, p_device_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code RECORD;
    v_user RECORD;
BEGIN
    -- 查找或创建用户
    SELECT * INTO v_user FROM users WHERE device_id = p_device_id;
    IF NOT FOUND THEN
        INSERT INTO users (device_id) VALUES (p_device_id) RETURNING * INTO v_user;
    END IF;
    
    -- 已激活
    IF v_user.vip_tier != 'free' THEN
        RETURN jsonb_build_object(
            'valid', true, 
            'tier', v_user.vip_tier, 
            'message', 'Already activated',
            'already_activated', true
        );
    END IF;

    -- 验证邀请码
    SELECT * INTO v_code FROM invite_codes 
    WHERE UPPER(code) = UPPER(TRIM(p_code))
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Invalid or expired code');
    END IF;

    -- 激活
    UPDATE users 
    SET vip_tier = v_code.tier, 
        code_id = v_code.id, 
        activated_at = NOW() 
    WHERE id = v_user.id;
    
    UPDATE invite_codes 
    SET current_uses = current_uses + 1 
    WHERE id = v_code.id;

    RETURN jsonb_build_object(
        'valid', true, 
        'tier', v_code.tier, 
        'message', 'VIP Activated!'
    );
END;
$$;

-- ============================================
-- 获取用户状态函数
-- ============================================

CREATE OR REPLACE FUNCTION get_user_status(p_device_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
BEGIN
    SELECT * INTO v_user FROM users WHERE device_id = p_device_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('vip_tier', 'free', 'activated_at', NULL);
    END IF;
    
    RETURN jsonb_build_object(
        'vip_tier', v_user.vip_tier,
        'activated_at', v_user.activated_at,
        'email', v_user.email
    );
END;
$$;

-- ============================================
-- 统计事件记录函数
-- ============================================

CREATE OR REPLACE FUNCTION track_event(
    p_device_id TEXT,
    p_event_type TEXT,
    p_event_data JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM users WHERE device_id = p_device_id;
    
    INSERT INTO analytics (user_id, device_id, event_type, event_data)
    VALUES (v_user_id, p_device_id, p_event_type, p_event_data);
END;
$$;
