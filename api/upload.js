import { put } from '@vercel/blob'
import { isOwner } from './_auth.js'
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!isOwner(req)) return res.status(401).json({ error: 'Owner login expired. Unlock owner mode again.' })
  const blob = await put('works/img.jpg', req.body, { access: 'public', addRandomSuffix: true, contentType: 'image/jpeg' })
  res.json({ url: blob.url })
}
