import { put } from '@vercel/blob'
import { isOwner } from './_auth.js'

// Finds the Blob token even when the store was created with a custom name prefix
const blobToken = () =>
  process.env.BLOB_READ_WRITE_TOKEN ||
  Object.entries(process.env).find(([k]) => k.endsWith('READ_WRITE_TOKEN'))?.[1]

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
    if (!isOwner(req)) return res.status(401).json({ error: 'Owner login expired. Unlock owner mode again.' })
    const token = blobToken()
    if (!token) return res.status(500).json({ error: 'Blob token not found. Reconnect the Blob store to this project and redeploy.' })
    const body = Buffer.isBuffer(req.body) ? req.body : null
    if (!body || !body.length) return res.status(400).json({ error: 'The image data did not arrive at the server.' })
    const blob = await put('works/img.jpg', body, { access: 'public', addRandomSuffix: true, contentType: 'image/jpeg', token })
    res.json({ url: blob.url })
  } catch (e) {
    res.status(500).json({ error: 'Upload failed: ' + e.message })
  }
}
