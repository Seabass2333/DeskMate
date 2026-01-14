/**
 * Supabase Client - v1.2 Backend Connection
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://isgmlrcfgunisziinhfb.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Validate configuration
if (!SUPABASE_ANON_KEY) {
    console.warn('[SupabaseClient] SUPABASE_ANON_KEY not configured. Remote features disabled.');
}

// Create Supabase client
const supabase = SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

/**
 * Check if Supabase is configured and available
 */
function isConfigured() {
    return !!supabase;
}

/**
 * Call a Supabase RPC function
 */
async function rpc(functionName, params) {
    if (!supabase) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase.rpc(functionName, params);

    if (error) {
        console.error(`[Supabase RPC] ${functionName} error:`, error);
        throw error;
    }

    return data;
}

module.exports = {
    supabase,
    isConfigured,
    rpc
};
