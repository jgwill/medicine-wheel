import { execSync } from 'child_process';
import { readdirSync, existsSync } from 'fs';

console.log('[v0] __dirname:', import.meta.dirname);
console.log('[v0] cwd:', process.cwd());
console.log('[v0] ls /vercel/share/v0-project:', readdirSync('/vercel/share/v0-project').join(', '));
