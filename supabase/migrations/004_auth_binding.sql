-- ============================================
-- 设备绑定函数 (Phase 3)
-- Run this in Supabase SQL Editor
-- ============================================

CREATE OR REPLACE FUNCTION bind_device_to_user(p_device_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auth_id UUID;
    v_user_record RECORD;
BEGIN
    -- 获取当前认证用户的 ID
    v_auth_id := auth.uid();
    IF v_auth_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 检查设备记录是否存在
    SELECT * INTO v_user_record FROM users WHERE device_id = p_device_id;
    
    IF NOT FOUND THEN
        -- 如果设备记录不存在，创建一个新的并关联 auth_id
        INSERT INTO users (device_id, auth_id, email, activated_at)
        VALUES (
            p_device_id, 
            v_auth_id, 
            auth.email(), -- 获取当前用户的邮箱
            NOW()
        );
    ELSE
        -- 如果存在，更新关联
        -- 如果该设备之前是匿名的 (auth_id IS NULL)，现在绑定到此账号
        -- 如果已经绑定了其他账号，这里选择覆盖（或者可以抛出错误）
        UPDATE users 
        SET auth_id = v_auth_id,
            email = auth.email(),
            -- 如果用户之前在其他设备有 VIP，这里可能需要同步逻辑
            -- 暂时保持设备当前的 VIP 状态，或者取两者中高的
            updated_at = NOW()
        WHERE id = v_user_record.id;
    END IF;
END;
$$;
