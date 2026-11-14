import crypto from 'node:crypto'
const sign = (exp) => crypto.createHmac('sha256', process.env.SESSION_SECRET || '').update(String(exp)).digest('hex')
export const makeToken = () => { const exp = Date.now() + 12 * 3600e3; return `${exp}.${sign(exp)}` }
export const isOwner = (req) => {
  const t = (req.headers.authorization || '').replace('Bearer ', '')
  const [exp, sig] = t.split('.')
  if (!exp || !sig || !process.env.SESSION_SECRET || Number(exp) < Date.now()) return false
  const good = sign(exp)
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))
}
export const same = (a, b) => {
  const h = (x) => crypto.createHash('sha256').update(String(x)).digest()
  return crypto.timingSafeEqual(h(a), h(b))
}
