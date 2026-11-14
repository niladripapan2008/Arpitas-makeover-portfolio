import crypto from 'node:crypto'
const p = process.argv[2]
if (!p) { console.log('Usage: node scripts/hash-passcode.mjs "your passcode"'); process.exit(1) }
const salt = crypto.randomBytes(16)
console.log('scrypt$' + salt.toString('hex') + '$' + crypto.scryptSync(p, salt, 32).toString('hex'))
