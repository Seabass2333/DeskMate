/**
 * Auth Routes
 * Replaces: Supabase Auth OTP flow, bind_device_to_user
 */

import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { eq, and, gte } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import nodemailer from 'nodemailer';

const app = new Hono();

// Email transporter (configure in production)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * POST /api/auth/send-otp
 * Send OTP to email
 */
app.post('/send-otp', async (c) => {
    try {
        const { email } = await c.req.json();

        if (!email || !email.includes('@')) {
            return c.json({ success: false, error: '请输入有效的邮箱地址' });
        }

        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save OTP to database
        await db.insert(schema.otpCodes).values({
            email: email.toLowerCase(),
            code,
            expiresAt
        });

        // Send email
        try {
            await transporter.sendMail({
                from: process.env.SMTP_FROM || 'DeskMate <noreply@example.com>',
                to: email,
                subject: 'DeskMate 验证码',
                html: `
                    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
                        <h2>🐱 DeskMate 验证码</h2>
                        <p>您的验证码是：</p>
                        <div style="font-size: 32px; font-weight: bold; color: #4F46E5; letter-spacing: 4px; margin: 20px 0;">
                            ${code}
                        </div>
                        <p style="color: #666;">验证码10分钟内有效，请勿泄露给他人。</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('[Auth] Email send error:', emailError);
            // In development, log the code
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[Auth] DEV MODE - OTP for ${email}: ${code}`);
            }
        }

        return c.json({ success: true });

    } catch (error) {
        console.error('[Auth] Send OTP error:', error);
        return c.json({ success: false, error: '发送失败，请稍后重试' }, 500);
    }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP and return JWT
 */
app.post('/verify-otp', async (c) => {
    try {
        const { email, code, deviceId } = await c.req.json();

        if (!email || !code) {
            return c.json({ success: false, error: '请输入验证码' });
        }

        // Find valid OTP
        const otpRecord = await db.query.otpCodes.findFirst({
            where: and(
                eq(schema.otpCodes.email, email.toLowerCase()),
                eq(schema.otpCodes.code, code),
                eq(schema.otpCodes.used, false),
                gte(schema.otpCodes.expiresAt, new Date())
            )
        });

        if (!otpRecord) {
            return c.json({ success: false, error: '验证码错误或已过期' });
        }

        // Mark OTP as used
        await db.update(schema.otpCodes)
            .set({ used: true })
            .where(eq(schema.otpCodes.id, otpRecord.id));

        // Bind device to email if deviceId provided
        if (deviceId) {
            const existingDevice = await db.query.devices.findFirst({
                where: eq(schema.devices.deviceId, deviceId)
            });

            if (existingDevice) {
                await db.update(schema.devices)
                    .set({ email: email.toLowerCase(), updatedAt: new Date() })
                    .where(eq(schema.devices.deviceId, deviceId));
            } else {
                await db.insert(schema.devices).values({
                    deviceId,
                    email: email.toLowerCase()
                });
            }
        }

        // Generate JWT
        const token = jwt.sign(
            { email: email.toLowerCase(), deviceId },
            process.env.JWT_SECRET || 'dev-secret',
            { expiresIn: '30d' }
        );

        return c.json({
            success: true,
            token,
            user: { email: email.toLowerCase() }
        });

    } catch (error) {
        console.error('[Auth] Verify OTP error:', error);
        return c.json({ success: false, error: '验证失败' }, 500);
    }
});

/**
 * POST /api/auth/bind-device
 * Bind device to user (called after successful auth)
 */
app.post('/bind-device', async (c) => {
    try {
        const { deviceId, email } = await c.req.json();

        if (!deviceId) {
            return c.json({ success: false, error: 'Missing deviceId' });
        }

        const existingDevice = await db.query.devices.findFirst({
            where: eq(schema.devices.deviceId, deviceId)
        });

        if (existingDevice) {
            await db.update(schema.devices)
                .set({
                    email: email?.toLowerCase() || existingDevice.email,
                    updatedAt: new Date()
                })
                .where(eq(schema.devices.deviceId, deviceId));
        } else {
            await db.insert(schema.devices).values({
                deviceId,
                email: email?.toLowerCase()
            });
        }

        return c.json({ success: true });

    } catch (error) {
        console.error('[Auth] Bind device error:', error);
        return c.json({ success: false }, 500);
    }
});

export default app;
