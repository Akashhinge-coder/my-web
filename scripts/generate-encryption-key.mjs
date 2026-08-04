import crypto from 'crypto';

const key = crypto.randomBytes(32).toString('hex');
console.log('\n--- 🔐 Generate APP_ENCRYPTION_KEY ---\n');
console.log('Your new AES-256-GCM encryption key is:');
console.log(`\n${key}\n`);
console.log('Copy this value and add it to your .env.local file:');
console.log(`APP_ENCRYPTION_KEY="${key}"\n`);
console.log('⚠️  WARNING: Keep this safe! If you lose it, you will not be able to decrypt the restaurant payment integrations!');
