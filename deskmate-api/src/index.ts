/**
 * DeskMate API - Main Entry Point
 * Replaces Supabase RPC functions
 */

import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';

// Routes
import authRoutes from './routes/auth.js';
import inviteRoutes from './routes/invite.js';
import settingsRoutes from './routes/settings.js';
import analyticsRoutes from './routes/analytics.js';
import opsRoutes from './routes/ops.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
    origin: '*', // In production, restrict to your app
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Device-Id']
}));

// Health check
app.get('/', (c) => c.json({
    status: 'ok',
    service: 'DeskMate API',
    version: '1.0.0'
}));

app.get('/health', (c) => c.json({ status: 'healthy' }));

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/invite', inviteRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/ops', opsRoutes);

// Error handling
app.onError((err, c) => {
    console.error('[API Error]', err);
    return c.json({
        success: false,
        error: err.message || 'Internal server error'
    }, 500);
});

// 404 handler
app.notFound((c) => {
    return c.json({ success: false, error: 'Not found' }, 404);
});

// Start server
const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 DeskMate API starting on port ${port}...`);

serve({
    fetch: app.fetch,
    port
}, (info) => {
    console.log(`✅ Server running at http://localhost:${info.port}`);
});

export default app;
