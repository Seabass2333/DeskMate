/**
 * Invite Code Routes
 * Replaces: verify_invite_code, get_user_status, debug_reset_user
 */

import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

const app = new Hono();

/**
 * POST /api/invite/verify
 * Verify an invite code and activate VIP
 */
app.post('/verify', async (c) => {
    try {
        const { code, deviceId } = await c.req.json();

        if (!code || !deviceId) {
            return c.json({ valid: false, message: 'Missing code or deviceId' });
        }

        const upperCode = code.trim().toUpperCase();

        // Check if device already has VIP
        const existingDevice = await db.query.devices.findFirst({
            where: eq(schema.devices.deviceId, deviceId)
        });

        if (existingDevice?.vipTier && existingDevice.vipTier !== 'free') {
            return c.json({
                valid: true,
                message: 'Already activated',
                tier: existingDevice.vipTier,
                already_activated: true
            });
        }

        // Find invite code
        const inviteCode = await db.query.inviteCodes.findFirst({
            where: and(
                eq(schema.inviteCodes.code, upperCode),
                eq(schema.inviteCodes.isActive, true)
            )
        });

        if (!inviteCode) {
            return c.json({ valid: false, message: 'Invalid code' });
        }

        // Check usage limit
        if (inviteCode.maxUses && inviteCode.usedCount! >= inviteCode.maxUses) {
            return c.json({ valid: false, message: 'Code has reached maximum uses' });
        }

        // Activate VIP for device
        if (existingDevice) {
            await db.update(schema.devices)
                .set({
                    vipTier: inviteCode.tier,
                    activatedAt: new Date(),
                    updatedAt: new Date()
                })
                .where(eq(schema.devices.deviceId, deviceId));
        } else {
            await db.insert(schema.devices).values({
                deviceId,
                vipTier: inviteCode.tier,
                activatedAt: new Date()
            });
        }

        // Increment usage count
        await db.update(schema.inviteCodes)
            .set({ usedCount: (inviteCode.usedCount || 0) + 1 })
            .where(eq(schema.inviteCodes.id, inviteCode.id));

        return c.json({
            valid: true,
            message: 'VIP Activated!',
            tier: inviteCode.tier
        });

    } catch (error) {
        console.error('[Invite] Verify error:', error);
        return c.json({ valid: false, message: 'Server error' }, 500);
    }
});

/**
 * POST /api/invite/status
 * Get user VIP status
 */
app.post('/status', async (c) => {
    try {
        const { deviceId } = await c.req.json();

        if (!deviceId) {
            return c.json({ vip_tier: 'free', activated_at: null });
        }

        const device = await db.query.devices.findFirst({
            where: eq(schema.devices.deviceId, deviceId)
        });

        return c.json({
            vip_tier: device?.vipTier || 'free',
            activated_at: device?.activatedAt || null,
            email: device?.email || null
        });

    } catch (error) {
        console.error('[Invite] Status error:', error);
        return c.json({ vip_tier: 'free', activated_at: null });
    }
});

/**
 * POST /api/invite/debug-reset
 * Reset user status (debug only)
 */
app.post('/debug-reset', async (c) => {
    try {
        const { deviceId } = await c.req.json();

        if (!deviceId) {
            return c.json({ success: false, error: 'Missing deviceId' });
        }

        await db.update(schema.devices)
            .set({
                vipTier: 'free',
                activatedAt: null,
                updatedAt: new Date()
            })
            .where(eq(schema.devices.deviceId, deviceId));

        return c.json({ success: true });

    } catch (error) {
        console.error('[Invite] Reset error:', error);
        return c.json({ success: false }, 500);
    }
});

export default app;
