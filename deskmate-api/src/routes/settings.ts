/**
 * Settings Routes
 * Replaces: save_user_setting, get_user_settings
 */

import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

const app = new Hono();

/**
 * POST /api/settings/save
 * Save a user setting
 */
app.post('/save', async (c) => {
    try {
        const { deviceId, key, value } = await c.req.json();

        if (!deviceId || !key) {
            return c.json({ success: false, error: 'Missing deviceId or key' });
        }

        // Check if setting exists
        const existing = await db.query.userSettings.findFirst({
            where: and(
                eq(schema.userSettings.deviceId, deviceId),
                eq(schema.userSettings.key, key)
            )
        });

        if (existing) {
            await db.update(schema.userSettings)
                .set({
                    value: typeof value === 'string' ? value : JSON.stringify(value),
                    updatedAt: new Date()
                })
                .where(eq(schema.userSettings.id, existing.id));
        } else {
            await db.insert(schema.userSettings).values({
                deviceId,
                key,
                value: typeof value === 'string' ? value : JSON.stringify(value)
            });
        }

        return c.json({ success: true });

    } catch (error) {
        console.error('[Settings] Save error:', error);
        return c.json({ success: false, error: 'Server error' }, 500);
    }
});

/**
 * POST /api/settings/get
 * Get all user settings
 */
app.post('/get', async (c) => {
    try {
        const { deviceId } = await c.req.json();

        if (!deviceId) {
            return c.json({ success: false, settings: {} });
        }

        const settings = await db.query.userSettings.findMany({
            where: eq(schema.userSettings.deviceId, deviceId)
        });

        // Convert to key-value object
        const result: Record<string, any> = {};
        for (const setting of settings) {
            try {
                result[setting.key] = JSON.parse(setting.value || '');
            } catch {
                result[setting.key] = setting.value;
            }
        }

        return c.json({ success: true, settings: result });

    } catch (error) {
        console.error('[Settings] Get error:', error);
        return c.json({ success: false, settings: {} });
    }
});

export default app;
