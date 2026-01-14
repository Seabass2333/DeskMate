/**
 * DeskMate Invite Code Generator
 * 
 * Usage:
 *   node scripts/generate_codes.js --prefix=VIP --batch=2025 --count=10
 *   node scripts/generate_codes.js --permanent --code=VIP-LIFETIME-ADMIN
 */

const crypto = require('crypto');
const fs = require('fs');

const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, value] = arg.split('=');
    acc[key.replace('--', '')] = value || true;
    return acc;
}, {});

function generateRandomSuffix(length = 6) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // No I, L, O, 0
    let result = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
    }
    return result;
}

function main() {
    console.log('--- DeskMate Invite Code Generator ---');

    // Mode 1: Permanent Code
    if (args.permanent) {
        const code = args.code || 'VIP-LIFETIME-ADMIN';
        const sql = `
INSERT INTO invite_codes (code, tier, max_uses, expires_at, type, duration_days)
VALUES ('${code}', 'pro', NULL, NULL, 'permanent', 36500)
ON CONFLICT (code) DO NOTHING;
        `;
        console.log('\n[Permanent Code SQL]');
        console.log(sql.trim());
        return;
    }

    // Mode 2: Batch Generation
    const prefix = args.prefix || 'VIP';
    const batch = args.batch || new Date().getFullYear().toString();
    const count = parseInt(args.count) || 5;
    const duration = parseInt(args.duration) || 7;
    const maxUses = parseInt(args.max_uses) || 1;

    console.log(`\nGenerating ${count} codes for batch ${prefix}-${batch}...`);

    const codes = [];
    const sqlValues = [];

    for (let i = 0; i < count; i++) {
        const suffix = generateRandomSuffix();
        const code = `${prefix}-${batch}-${suffix}`;
        codes.push(code);

        // SQL Value: (code, tier, max_uses, expires_at, type, duration_days)
        sqlValues.push(`('${code}', 'pro', ${maxUses}, NULL, 'trial', ${duration})`);
    }

    const sql = `
INSERT INTO invite_codes (code, tier, max_uses, expires_at, type, duration_days)
VALUES 
${sqlValues.join(',\n')}
ON CONFLICT (code) DO NOTHING;
    `;

    console.log('\n[Generated Codes]');
    codes.forEach(c => console.log(`- ${c}`));

    console.log('\n[SQL to Execute]');
    console.log(sql.trim());

    // Optional: write to file
    if (args.out) {
        fs.writeFileSync(args.out, sql);
        console.log(`\nSaved SQL to ${args.out}`);
    }
}

main();
