import crypto from 'node:crypto'
import { Redis } from '@upstash/redis'
import { makeToken } from './_auth.js'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
})
const check = (pass, stored) => {
  const [alg, salt, hash] = (stored || '').split('$')
  if (alg !== 'scrypt' || !salt || !hash) return false
  const got = crypto.scryptSync(String(pass), Buffer.from(salt, 'hex'), 32)
  const want = Buffer.from(hash, 'hex')
  return got.length === want.length && crypto.timingSafeEqual(got, want)
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!process.env.OWNER_PASSCODE_HASH || !process.env.SESSION_SECRET) return res.status(500).json({ error: 'Set OWNER_PASSCODE_HASH and SESSION_SECRET in Vercel.' })
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  const key = 'login:' + ip
  const tries = await redis.incr(key)
  if (tries === 1) await redis.expire(key, 900)
  if (tries > 5) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' })
  if (!check(req.body?.pass ?? '', process.env.OWNER_PASSCODE_HASH)) return res.status(401).json({ error: 'Wrong passcode.' })
  await redis.del(key)
  res.json({ token: makeToken() })
}
