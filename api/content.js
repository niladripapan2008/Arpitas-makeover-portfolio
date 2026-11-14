import { Redis } from '@upstash/redis'
import { isOwner } from './_auth.js'
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
})
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'GET') return res.json({ content: (await redis.get('site:content')) ?? null })
  if (req.method === 'PUT') {
    if (!isOwner(req)) return res.status(401).json({ error: 'Owner login expired. Unlock owner mode again.' })
    await redis.set('site:content', req.body)
    return res.json({ ok: true })
  }
  res.status(405).json({ error: 'Not allowed' })
}
