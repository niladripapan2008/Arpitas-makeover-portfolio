const j = async (u, o) => {
  const r = await fetch(u, o)
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || 'Request failed (' + r.status + ')')
  return d
}
const auth = (t) => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + t })
export const loadContent = () => j('/api/content').then((r) => r.content)
export const login = (pass) => j('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pass }) }).then((r) => r.token)
export const saveContent = (d, t) => j('/api/content', { method: 'PUT', headers: auth(t), body: JSON.stringify(d) })
export const uploadFile = (b, t) => j('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', Authorization: 'Bearer ' + t }, body: b }).then((r) => r.url)
