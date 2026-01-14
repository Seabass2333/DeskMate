require('dotenv').config({ path: '.env.local' });
const { inviteCodeService } = require('../src/services/InviteCodeService');

async function test() {
    console.log('[Test] InviteCodeService Verification Test');
    console.log('[Test] Environment Remote Mode:', inviteCodeService.useRemote);

    // Case 1: Random String
    const randomCode = 'RANDOM_' + Date.now();
    console.log(`\nTesting Code: "${randomCode}"`);
    const res1 = await inviteCodeService.verify(randomCode);
    console.log('Result:', res1);

    // Case 2: One of the new codes (if available)
    const validCode = 'VIP-2026-3DDMMF';
    console.log(`\nTesting Code: "${validCode}"`);
    const res2 = await inviteCodeService.verify(validCode);
    console.log('Result:', res2);
}

test();
