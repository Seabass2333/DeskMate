/**
 * 1v1 Co-Pet (双人共养) Routes
 * Strictly 1-on-1 shared pet relationship and lightweight ambient interactions
 */

import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { eq, and, or, ne, desc } from 'drizzle-orm';

const app = new Hono();

/**
 * Helper to generate a clean 6-character pairing code (e.g. CAT-829)
 */
function generateCode(): string {
    const prefixes = ['CAT', 'PAW', 'MEW', 'LUV', 'PET'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const digits = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${digits}`;
}

/**
 * POST /api/copet/create-code
 * Generate or retrieve a pending 1v1 pairing code for the host device
 */
app.post('/create-code', async (c) => {
    try {
        const { deviceId, nickname } = await c.req.json();
        if (!deviceId) {
            return c.json({ success: false, message: 'Missing deviceId' }, 400);
        }

        // Enforce strict 1v1: Check if device is already in an active pair
        const activePair = await db.query.petPairs.findFirst({
            where: and(
                eq(schema.petPairs.status, 'active'),
                or(
                    eq(schema.petPairs.hostDeviceId, deviceId),
                    eq(schema.petPairs.guestDeviceId, deviceId)
                )
            )
        });

        if (activePair) {
            return c.json({
                success: false,
                message: 'Already in an active 1v1 co-pet pair. Unpair first.'
            });
        }

        // Reuse existing pending code if available
        const existingPending = await db.query.petPairs.findFirst({
            where: and(
                eq(schema.petPairs.hostDeviceId, deviceId),
                eq(schema.petPairs.status, 'pending')
            )
        });

        if (existingPending) {
            return c.json({
                success: true,
                pairCode: existingPending.pairCode,
                pairId: existingPending.id
            });
        }

        const pairCode = generateCode();
        const [created] = await db.insert(schema.petPairs).values({
            pairCode,
            hostDeviceId: deviceId,
            hostNickname: nickname || '远方的 TA',
            status: 'pending'
        }).returning();

        return c.json({
            success: true,
            pairCode: created.pairCode,
            pairId: created.id
        });
    } catch (error) {
        console.error('[CoPet] create-code error:', error);
        return c.json({ success: false, message: 'Server error' }, 500);
    }
});

/**
 * POST /api/copet/join
 * Join an existing pending pair code to establish a 1v1 bond
 */
app.post('/join', async (c) => {
    try {
        const { deviceId, pairCode, nickname } = await c.req.json();
        if (!deviceId || !pairCode) {
            return c.json({ success: false, message: 'Missing deviceId or pairCode' }, 400);
        }

        const normalizedCode = pairCode.trim().toUpperCase();

        const targetPair = await db.query.petPairs.findFirst({
            where: and(
                eq(schema.petPairs.pairCode, normalizedCode),
                eq(schema.petPairs.status, 'pending')
            )
        });

        if (!targetPair) {
            return c.json({ success: false, message: '配对码无效或已被使用' });
        }

        if (targetPair.hostDeviceId === deviceId) {
            return c.json({ success: false, message: '不能绑定自己的配对码哦' });
        }

        const now = new Date();
        const [updated] = await db.update(schema.petPairs)
            .set({
                guestDeviceId: deviceId,
                guestNickname: nickname || '远方的 TA',
                status: 'active',
                pairedAt: now,
                updatedAt: now
            })
            .where(eq(schema.petPairs.id, targetPair.id))
            .returning();

        return c.json({
            success: true,
            paired: true,
            pairId: updated.id,
            partnerNickname: updated.hostNickname || '远方的 TA',
            pairedAt: updated.pairedAt?.toISOString() || now.toISOString()
        });
    } catch (error) {
        console.error('[CoPet] join error:', error);
        return c.json({ success: false, message: 'Server error' }, 500);
    }
});

/**
 * POST /api/copet/status
 * Poll current 1v1 pairing state and unread partner interaction events
 */
app.post('/status', async (c) => {
    try {
        const { deviceId } = await c.req.json();
        if (!deviceId) {
            return c.json({ paired: false });
        }

        const activePair = await db.query.petPairs.findFirst({
            where: and(
                eq(schema.petPairs.status, 'active'),
                or(
                    eq(schema.petPairs.hostDeviceId, deviceId),
                    eq(schema.petPairs.guestDeviceId, deviceId)
                )
            )
        });

        if (!activePair) {
            return c.json({ paired: false });
        }

        const isHost = activePair.hostDeviceId === deviceId;
        const partnerNickname = isHost
            ? (activePair.guestNickname || '远方的 TA')
            : (activePair.hostNickname || '远方的 TA');

        // Fetch latest event sent by the partner
        const latestEvents = await db.query.coPetEvents.findMany({
            where: and(
                eq(schema.coPetEvents.pairId, activePair.id),
                ne(schema.coPetEvents.senderDeviceId, deviceId)
            ),
            orderBy: [desc(schema.coPetEvents.createdAt)],
            limit: 5
        });

        return c.json({
            paired: true,
            pairId: activePair.id,
            pairCode: activePair.pairCode,
            partnerNickname,
            pairedAt: activePair.pairedAt?.toISOString(),
            sharedEnergy: activePair.sharedEnergy,
            events: latestEvents
        });
    } catch (error) {
        console.error('[CoPet] status error:', error);
        return c.json({ paired: false }, 500);
    }
});

/**
 * POST /api/copet/send-action
 * Send a lightweight ambient action ('touch' | 'feed' | 'water_nudge' | 'pomodoro_cheer')
 */
app.post('/send-action', async (c) => {
    try {
        const { deviceId, pairId, actionType, payload } = await c.req.json();
        if (!deviceId || !pairId || !actionType) {
            return c.json({ success: false, message: 'Missing required fields' }, 400);
        }

        const [event] = await db.insert(schema.coPetEvents).values({
            pairId,
            senderDeviceId: deviceId,
            actionType,
            payload: payload || {}
        }).returning();

        return c.json({
            success: true,
            eventId: event.id,
            createdAt: event.createdAt?.toISOString()
        });
    } catch (error) {
        console.error('[CoPet] send-action error:', error);
        return c.json({ success: false, message: 'Server error' }, 500);
    }
});

/**
 * POST /api/copet/unpair
 * Dissolve the active 1v1 co-pet relationship
 */
app.post('/unpair', async (c) => {
    try {
        const { deviceId, pairId } = await c.req.json();
        if (!deviceId) {
            return c.json({ success: false, message: 'Missing deviceId' }, 400);
        }

        if (pairId) {
            await db.update(schema.petPairs)
                .set({ status: 'unpaired', updatedAt: new Date() })
                .where(eq(schema.petPairs.id, pairId));
        }

        return c.json({ success: true });
    } catch (error) {
        console.error('[CoPet] unpair error:', error);
        return c.json({ success: false, message: 'Server error' }, 500);
    }
});

export default app;
