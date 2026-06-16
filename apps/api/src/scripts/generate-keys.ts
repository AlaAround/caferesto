import { generateKeyPairSync } from 'crypto';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../../../..');

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

console.log('Generated RSA key pair for JWT signing.\n');
console.log('Add these to your .env file:\n');
console.log(`JWT_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"`);
console.log(`JWT_PUBLIC_KEY="${publicKey.replace(/\n/g, '\\n')}"`);

writeFileSync(resolve(rootDir, 'private.pem'), privateKey);
writeFileSync(resolve(rootDir, 'public.pem'), publicKey);
console.log('\nAlso saved to private.pem and public.pem in project root.');
