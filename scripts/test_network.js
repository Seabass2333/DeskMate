/**
 * Network Resilience Test Script
 * Run: node scripts/test_network.js
 */

require('dotenv').config({ path: '.env.local' });

const { rpc, getUserFriendlyError, classifyError } = require('../src/services/SupabaseClient');

async function testNormalRequest() {
    console.log('\n=== Test 1: Normal Request ===');
    try {
        const result = await rpc('get_user_status', { p_device_id: 'test-device-123' });
        console.log('✅ Success:', result);
    } catch (e) {
        console.log('❌ Error:', e.message);
        console.log('   Friendly:', getUserFriendlyError(e));
    }
}

async function testTimeout() {
    console.log('\n=== Test 2: Timeout Simulation ===');
    console.log('(Using very short timeout to force failure)');
    try {
        // Override timeout to 1ms to force timeout
        const result = await rpc('get_user_status', { p_device_id: 'test-device-123' }, {
            timeoutMs: 1,    // Extremely short
            maxRetries: 2
        });
        console.log('Result:', result);
    } catch (e) {
        console.log('❌ Expected timeout error:', e.message);
        console.log('   Type:', classifyError(e));
        console.log('   Friendly:', getUserFriendlyError(e));
    }
}

async function testErrorClassification() {
    console.log('\n=== Test 3: Error Classification ===');
    const testCases = [
        { message: 'timeout exceeded' },
        { message: 'ETIMEDOUT' },
        { message: 'network error' },
        { message: 'ENOTFOUND' },
        { code: 'PGRST', message: 'database error' },
        { message: 'unknown thing happened' }
    ];

    testCases.forEach(err => {
        console.log(`  "${err.message || err.code}" => ${classifyError(err)} => "${getUserFriendlyError(err)}"`);
    });
}

async function main() {
    console.log('===========================================');
    console.log('  DeskMate Network Resilience Test Suite  ');
    console.log('===========================================');

    await testErrorClassification();
    await testNormalRequest();
    await testTimeout();

    console.log('\n✅ All tests completed!');
}

main();
