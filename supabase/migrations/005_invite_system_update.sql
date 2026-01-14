-- ============================================
-- Migration: Invite Code System Enhancements
-- Adds support for Referral Codes and Manual Admin Generation
-- ============================================

-- 1. Add new columns to invite_codes
ALTER TABLE invite_codes 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'trial',  -- 'trial', 'permanent', 'referral'
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id), -- For referral codes linked to a VIP
ADD COLUMN IF NOT EXISTS duration_days INT DEFAULT 7;        -- Duration of VIP access granted

-- 2. Function to generate a batch of random codes (For Admin usage)
-- Usage: SELECT generate_invite_codes('VIP', '2025', 10, 7, 1); -- Generates 10 codes
CREATE OR REPLACE FUNCTION generate_invite_codes(
    p_prefix TEXT,
    p_batch TEXT,
    p_count INT,
    p_duration INT DEFAULT 7,
    p_max_uses INT DEFAULT 1,
    p_type TEXT DEFAULT 'trial'
)
RETURNS TABLE (new_code TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    i INT;
    v_random TEXT;
    v_code TEXT;
    v_chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    v_exists BOOLEAN;
BEGIN
    FOR i IN 1..p_count LOOP
        LOOP
            -- Generate 6-char random alphanumeric string
            SELECT string_agg(substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1), '')
            INTO v_random
            FROM generate_series(1, 6);

            v_code := p_prefix || '-' || p_batch || '-' || v_random;

            -- Check for collision
            SELECT EXISTS(SELECT 1 FROM invite_codes WHERE code = v_code) INTO v_exists;
            
            IF NOT v_exists THEN
                EXIT; -- Unique code found
            END IF;
        END LOOP;

        -- Insert code
        INSERT INTO invite_codes (code, tier, duration_days, max_uses, current_uses, type)
        VALUES (v_code, 'pro', p_duration, p_max_uses, 0, p_type);

        new_code := v_code;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- 3. Function to create referral codes for a user (Triggered after payment)
CREATE OR REPLACE FUNCTION create_user_referral_codes(
    p_user_id UUID,
    p_count INT DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_batch TEXT;
    v_random TEXT;
    v_code TEXT;
    v_chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    v_codes TEXT[] := ARRAY[]::TEXT[];
    i INT;
    v_exists BOOLEAN;
BEGIN
    v_batch := to_char(NOW(), 'YYYY');

    FOR i IN 1..p_count LOOP
        LOOP
            -- Generate 6-char random string
            SELECT string_agg(substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1), '')
            INTO v_random
            FROM generate_series(1, 6);

            v_code := 'SUB-' || v_batch || '-' || v_random;

            -- Check collision
            SELECT EXISTS(SELECT 1 FROM invite_codes WHERE code = v_code) INTO v_exists;
            
            IF NOT v_exists THEN
                EXIT;
            END IF;
        END LOOP;

        INSERT INTO invite_codes (code, tier, duration_days, max_uses, type, owner_id)
        VALUES (v_code, 'pro', 7, 1, 'referral', p_user_id);
    
        v_codes := array_append(v_codes, v_code);
    END LOOP;

    RETURN jsonb_build_object('success', true, 'codes', v_codes);
END;
$$;
