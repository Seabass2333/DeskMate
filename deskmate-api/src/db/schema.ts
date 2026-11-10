/**
 * Database Schema - Drizzle ORM
 * Replaces Supabase tables
 */

import { pgTable, text, timestamp, integer, jsonb, boolean, uuid } from 'drizzle-orm/pg-core';

// Devices table (replaces users + devices)
export const devices = pgTable('devices', {
    id: uuid('id').primaryKey().defaultRandom(),
    deviceId: text('device_id').notNull().unique(),
    email: text('email'),
    vipTier: text('vip_tier').default('free'),
    activatedAt: timestamp('activated_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
});

// Invite codes table
export const inviteCodes = pgTable('invite_codes', {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    tier: text('tier').notNull().default('pro'),
    maxUses: integer('max_uses').default(1),
    usedCount: integer('used_count').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow()
});

// User settings table
export const userSettings = pgTable('user_settings', {
    id: uuid('id').primaryKey().defaultRandom(),
    deviceId: text('device_id').notNull(),
    key: text('key').notNull(),
    value: text('value'),
    updatedAt: timestamp('updated_at').defaultNow()
});

// Analytics events table
export const analyticsEvents = pgTable('analytics_events', {
    id: uuid('id').primaryKey().defaultRandom(),
    deviceId: text('device_id').notNull(),
    eventType: text('event_type').notNull(),
    eventData: jsonb('event_data'),
    createdAt: timestamp('created_at').defaultNow()
});

// Announcements table
export const announcements = pgTable('announcements', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    type: text('type').default('info'), // info, warning, update
    minVersion: text('min_version'),
    maxVersion: text('max_version'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    expiresAt: timestamp('expires_at')
});

// Feedback table
export const feedback = pgTable('feedback', {
    id: uuid('id').primaryKey().defaultRandom(),
    deviceId: text('device_id').notNull(),
    category: text('category').notNull(),
    content: text('content').notNull(),
    email: text('email'),
    appVersion: text('app_version'),
    status: text('status').default('pending'),
    createdAt: timestamp('created_at').defaultNow()
});

// OTP codes table (for email verification)
export const otpCodes = pgTable('otp_codes', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    code: text('code').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    used: boolean('used').default(false),
    createdAt: timestamp('created_at').defaultNow()
});

// 1v1 Co-Pet Pairing table (Strictly 1-on-1 shared pet relationship)
export const petPairs = pgTable('pet_pairs', {
    id: uuid('id').primaryKey().defaultRandom(),
    pairCode: text('pair_code').notNull().unique(),
    hostDeviceId: text('host_device_id').notNull(),
    guestDeviceId: text('guest_device_id'),
    hostNickname: text('host_nickname').default('铲屎官 A'),
    guestNickname: text('guest_nickname').default('铲屎官 B'),
    status: text('status').default('pending'), // 'pending' | 'active' | 'unpaired'
    sharedSkin: text('shared_skin').default('mochi-v1'),
    sharedEnergy: integer('shared_energy').default(75),
    pairedAt: timestamp('paired_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
});

// 1v1 Co-Pet Interaction Events table (Lightweight ambient signals)
export const coPetEvents = pgTable('copet_events', {
    id: uuid('id').primaryKey().defaultRandom(),
    pairId: uuid('pair_id').notNull(),
    senderDeviceId: text('sender_device_id').notNull(),
    actionType: text('action_type').notNull(), // 'touch' | 'feed' | 'water_nudge' | 'pomodoro_cheer'
    payload: jsonb('payload'),
    createdAt: timestamp('created_at').defaultNow()
});
