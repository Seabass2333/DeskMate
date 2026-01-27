/**
 * Analytics Routes
 * Replaces: track_event
 */

import { Hono } from 'hono';
import { db, schema } from '../db/index.js';

const app = new Hono();

/**
 * POST /api/analytics/track
 * Track an analytics event
 */
app.post('/track', async (c) => {
    try {
        const { deviceId, eventType, eventData } = await c.req.json();

        if (!deviceId || !eventType) {
            return c.json({ success: false, error: 'Missing deviceId or eventType' });
        }

        await db.insert(schema.analyticsEvents).values({
            deviceId,
            eventType,
            eventData: eventData || {}
        });

        return c.json({ success: true });

    } catch (error) {
        console.error('[Analytics] Track error:', error);
        // Analytics should fail silently
        return c.json({ success: true });
    }
});

export default app;
