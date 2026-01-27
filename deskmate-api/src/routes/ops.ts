/**
 * Ops Routes
 * Replaces: get_announcements, submit_feedback
 */

import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { eq, and, gte, lte, or, isNull } from 'drizzle-orm';

const app = new Hono();

/**
 * POST /api/ops/announcements
 * Get active announcements
 */
app.post('/announcements', async (c) => {
    try {
        const { version } = await c.req.json();
        const now = new Date();

        const announcements = await db.query.announcements.findMany({
            where: and(
                eq(schema.announcements.isActive, true),
                or(
                    isNull(schema.announcements.expiresAt),
                    gte(schema.announcements.expiresAt, now)
                )
            ),
            orderBy: (announcements, { desc }) => [desc(announcements.createdAt)]
        });

        // Filter by version if needed
        const filtered = announcements.filter(a => {
            if (!version) return true;
            if (a.minVersion && version < a.minVersion) return false;
            if (a.maxVersion && version > a.maxVersion) return false;
            return true;
        });

        return c.json({
            success: true,
            announcements: filtered.map(a => ({
                id: a.id,
                title: a.title,
                content: a.content,
                type: a.type,
                createdAt: a.createdAt
            }))
        });

    } catch (error) {
        console.error('[Ops] Announcements error:', error);
        return c.json({ success: false, announcements: [] });
    }
});

/**
 * POST /api/ops/feedback
 * Submit user feedback
 */
app.post('/feedback', async (c) => {
    try {
        const { deviceId, category, content, email, appVersion } = await c.req.json();

        if (!deviceId || !category || !content) {
            return c.json({ success: false, error: 'Missing required fields' });
        }

        if (content.length < 10) {
            return c.json({ success: false, error: 'Feedback too short (min 10 characters)' });
        }

        if (content.length > 2000) {
            return c.json({ success: false, error: 'Feedback too long (max 2000 characters)' });
        }

        const validCategories = ['bug', 'feature', 'question', 'other'];
        if (!validCategories.includes(category)) {
            return c.json({ success: false, error: 'Invalid category' });
        }

        await db.insert(schema.feedback).values({
            deviceId,
            category,
            content,
            email: email || null,
            appVersion: appVersion || null
        });

        return c.json({ success: true });

    } catch (error) {
        console.error('[Ops] Feedback error:', error);
        return c.json({ success: false, error: 'Server error' }, 500);
    }
});

export default app;
