import { useState, useEffect, useRef } from 'react'
import { loadContent, login as apiLogin, saveContent, uploadFile } from './api.js'

const DEF = {
  brand: 'Arpita’s Makeover', name: 'Arpita Das', tag: 'Professional makeup artist',
  intro: 'Bridal, party and editorial makeup that keeps your own face at the centre. Soft skin, clean lines and colours chosen around you.',
  photo: '', aboutPhoto: '',
  about: 'I am a professional makeup artist with years of experience in bridal, party and photoshoot looks. I use skin-friendly products and finish every look so it lasts through the whole event.',
  sections: [
    { id: 's1', title: 'Bridal makeup', banner: '', images: [] },
    { id: 's2', title: 'Party makeup', banner: '', images: [] },
    { id: 's3', title: 'Editorial and shoots', banner: '', images: [] },
  ],
  contact: { phone: '+91 00000 00000', place: 'Kolkata, West Bengal' },
  social: [{ n: 'Instagram', u: 'https://instagram.com' }, { n: 'Facebook', u: 'https://facebook.com' }, { n: 'YouTube', u: 'https://youtube.com' }, { n: 'WhatsApp', u: 'https://wa.me/' }],
}
const PAGES = [['home', 'Home'], ['about', 'About me'], ['works', 'Works'], ['contact', 'Contact me']]
const valid = (p, d) => PAGES.some(([k]) => k === p) || (p.startsWith('g-') && d.sections.some((s) => 'g-' + s.id === p))
const uid = () => Math.random().toString(36).slice(2, 9)
const shrink = (f, max = 1400) => new Promise((res) => {
  const i = new Image()
  i.onload = () => {
    const k = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement('canvas')
    c.width = i.width * k; c.height = i.height * k
    c.getContext('2d').drawImage(i, 0, 0, c.width, c.height)
    c.toBlob(res, 'image/jpeg', 0.82)
  }
  i.src = URL.createObjectURL(f)
})
const Img = ({ src, alt }) => <img className="ph" src={src || undefined} alt={alt || ''} loading="lazy" />
const Ed = ({ v, on, owner, multi }) => !owner ? <>{v}</> : multi
  ? <textarea className="ed" value={v} onChange={(e) => on(e.target.value)} />
  : <input className="ed" value={v} onChange={(e) => on(e.target.value)} />

const RATIOS = [['Free', 0], ['Original', -1], ['1:1', 1], ['4:5', 4 / 5], ['3:4', 3 / 4], ['2:3', 2 / 3], ['4:3', 4 / 3], ['3:2', 3 / 2], ['16:9', 16 / 9], ['9:16', 9 / 16], ['3:1', 3]]
const fit = (r, W, H) => { if (!r) return { x: 0, y: 0, w: W, h: H }; const w = Math.min(W, H * r), h = w / r; return { x: (W - w) / 2, y: (H - h) / 2, w, h } }
const clamp = (v, a, z) => Math.min(Math.max(v, a), z)

function Cropper({ file, onDone, onCancel }) {
  const cv = useRef(null), drag = useRef(null)
  const [url, setUrl] = useState('')
  const [ratio, setRatio] = useState(0)
  const [dim, setDim] = useState({ W: 0, H: 0 })
  const [b, setB] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const rv = (r) => (r === -1 && cv.current ? cv.current.width / cv.current.height : r)
  const commit = () => cv.current.toBlob((bl) => setUrl(URL.createObjectURL(bl)), 'image/jpeg', 0.95)

  useEffect(() => {
    const i = new Image()
    i.onload = () => {
      const k = Math.min(1, 2400 / Math.max(i.width, i.height)), c = document.createElement('canvas')
      c.width = Math.round(i.width * k); c.height = Math.round(i.height * k)
      c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); cv.current = c; commit()
    }
    i.src = URL.createObjectURL(file)
  }, [])

  const onLoad = (e) => { const W = e.target.clientWidth, H = e.target.clientHeight; setDim({ W, H }); setB(fit(rv(ratio), W, H)) }
  const chooseRatio = (r) => { setRatio(r); setB(fit(rv(r), dim.W, dim.H)) }
  const turn = (dir) => {
    const s = cv.current, c = document.createElement('canvas'); c.width = s.height; c.height = s.width
    const x = c.getContext('2d'); x.translate(dir > 0 ? c.width : 0, dir > 0 ? 0 : c.height); x.rotate((dir * Math.PI) / 2); x.drawImage(s, 0, 0)
    cv.current = c; commit()
  }
  const flip = () => {
    const s = cv.current, c = document.createElement('canvas'); c.width = s.width; c.height = s.height
    const x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(s, 0, 0); cv.current = c; commit()
  }
  const down = (mode) => (e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { mode, sx: e.clientX, sy: e.clientY, b: { ...b } } }
  const end = () => { drag.current = null }
  const move = (e) => {
    const d = drag.current; if (!d) return
    const { W, H } = dim, o = d.b, r = rv(ratio), ddx = e.clientX - d.sx, ddy = e.clientY - d.sy
    if (d.mode === 'move') return setB({ ...o, x: clamp(o.x + ddx, 0, W - o.w), y: clamp(o.y + ddy, 0, H - o.h) })
    const l = d.mode.includes('l'), t = d.mode.includes('t'), dx = l ? -1 : 1, dy = t ? -1 : 1
    const ax = l ? o.x + o.w : o.x, ay = t ? o.y + o.h : o.y
    const px = clamp((l ? o.x : o.x + o.w) + ddx, 0, W), py = clamp((t ? o.y : o.y + o.h) + ddy, 0, H)
    const maxw = dx > 0 ? W - ax : ax, maxh = dy > 0 ? H - ay : ay
    let w = Math.min(Math.max((px - ax) * dx, 30), maxw), h = Math.min(Math.max((py - ay) * dy, 30), maxh)
    if (r) { const h2 = w / r; if (h2 > maxh) { h = maxh; w = h * r } else h = h2 }
    setB({ x: dx > 0 ? ax : ax - w, y: dy > 0 ? ay : ay - h, w, h })
  }
  const out = (full) => {
    const k = cv.current.width / dim.W, c = document.createElement('canvas')
    const sx = full ? 0 : b.x * k, sy = full ? 0 : b.y * k, sw = full ? cv.current.width : b.w * k, sh = full ? cv.current.height : b.h * k
    const s = Math.min(1, 1600 / Math.max(sw, sh)); c.width = Math.round(sw * s); c.height = Math.round(sh * s)
    c.getContext('2d').drawImage(cv.current, sx, sy, sw, sh, 0, 0, c.width, c.height)
    c.toBlob(onDone, 'image/jpeg', 0.85)
  }
  return (
    <div className="crop"><div className="box raised">
      <h3 style={{ fontSize: '1.7rem', marginBottom: 14 }}>Crop and edit photo</h3>
      <div className="chips">{RATIOS.map(([l, r]) => <button key={l} className={'pill' + (ratio === r ? ' on' : '')} onClick={() => chooseRatio(r)}>{l}</button>)}</div>
      <div className="cwrap">
        {url && <img src={url} alt="" onLoad={onLoad} />}
        {b.w > 0 && <div className="sel" style={{ left: b.x, top: b.y, width: b.w, height: b.h }} onPointerDown={down('move')} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
          {['tl', 'tr', 'bl', 'br'].map((m) => <span key={m} className={'h ' + m} onPointerDown={down(m)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />)}
        </div>}
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        <button className="pill" onClick={() => turn(-1)}>Rotate left</button>
        <button className="pill" onClick={() => turn(1)}>Rotate right</button>
        <button className="pill" onClick={flip}>Flip</button>
      </div>
      <div className="row">
        <button className="pill main" disabled={!b.w} onClick={() => out(false)}>Save photo</button>
        <button className="pill" disabled={!b.w} onClick={() => out(true)}>Use full photo</button>
        <button className="pill" onClick={onCancel}>Skip this photo</button>
      </div>
    </div></div>
  )
}

export default function App() {
  const [d, setD] = useState(DEF)
  const [page, setPage] = useState('home')
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [tok, setTok] = useState(() => sessionStorage.getItem('tok') || '')
  const [owner, setOwner] = useState(false)
  const [ask, setAsk] = useState(false)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [dirty, setDirty] = useState(false)
  const [lb, setLb] = useState(null)
  const [sent, setSent] = useState('')
  const [queue, setQueue] = useState([])
  const pushed = useRef(false)
  useEffect(() => { document.body.style.overflow = lb || queue.length ? 'hidden' : '' }, [lb, queue])
  useEffect(() => { if (location.hash.slice(1) === 'owner') { history.replaceState(null, '', location.pathname + location.search); openOwner() } }, [])

  useEffect(() => {
    loadContent().then((c) => {
      const m = c ? { ...DEF, ...c, contact: { ...DEF.contact, ...c.contact } } : DEF
      setD(m)
      const p = location.hash.slice(1); if (p !== 'home' && valid(p, m)) { setPage(p); history.replaceState(null, '', '#home'); history.pushState(null, '', '#' + p); pushed.current = true }
    }).catch(() => {})
    document.addEventListener('touchstart', () => {}, { passive: true })
  }, [])
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('theme', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => {
    const h = () => { const p = location.hash.slice(1) || 'home'; if (p === 'owner') { history.replaceState(null, '', location.pathname + location.search); openOwner() } else if (valid(p, d)) { if (p === 'home') pushed.current = false; setPage(p); scrollTo(0, 0) } }
    const pp = () => setLb(null)
    const k = (e) => {
      if (lb) { if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1) }
    }
    addEventListener('hashchange', h); addEventListener('keydown', k); addEventListener('popstate', pp)
    return () => { removeEventListener('hashchange', h); removeEventListener('keydown', k); removeEventListener('popstate', pp) }
  })

  const openOwner = () => (tok ? setOwner(true) : setAsk(true))
  const go = (p) => {
    if (p === page) return scrollTo(0, 0)
    if (p === 'home' && pushed.current) { history.back(); scrollTo(0, 0); return }
    if (page === 'home') { history.pushState(null, '', '#' + p); pushed.current = true } else history.replaceState(null, '', '#' + p)
    if (p === 'home') pushed.current = false
    setPage(p); scrollTo(0, 0)
  }
  const edit = (fn) => { setD(fn); setDirty(true) }
  const up = (k, v) => edit((o) => ({ ...o, [k]: v }))
  const upS = (id, fn) => edit((o) => ({ ...o, sections: o.sections.map((s) => (s.id === id ? fn(s) : s)) }))
  const step = (n) => setLb((l) => l && { ...l, i: (l.i + n + l.list.length) % l.list.length })
  const show = (list, i) => { if (!list[i]) return; history.pushState({ lb: 1 }, ''); setLb({ list, i }) }
  const closeLb = () => (history.state && history.state.lb ? history.back() : setLb(null))

  const login = async (e) => {
    e.preventDefault(); setErr('')
    try { const t = await apiLogin(pw); sessionStorage.setItem('tok', t); setTok(t); setOwner(true); setAsk(false); setPw('') }
    catch (x) { setErr(x.message) }
  }
  const publish = async () => {
    setMsg('Publishing…')
    try { await saveContent(d, tok); setDirty(false); setMsg('Live now.') }
    catch (x) { setMsg(x.message); if (/expired/.test(x.message)) { sessionStorage.removeItem('tok'); setTok(''); setOwner(false) } }
  }
  const sendBlob = async (b, done) => {
    setMsg('Uploading…')
    try { done(await uploadFile(b, tok)); setMsg('Uploaded. Press Publish changes to make it live.') }
    catch (x) { setMsg(x.message) }
  }
  const pick = (label, onUrl, multiple, cls = 'pill') => (
    <label className={cls}>{label}<input type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => { const fs = [...e.target.files].map((file) => ({ file, done: onUrl })); setQueue((q) => [...q, ...fs]); e.target.value = '' }} /></label>
  )
  const enquire = (e) => {
    e.preventDefault()
    const f = new FormData(e.target), num = d.contact.phone.replace(/\D/g, '')
    const text = `Hello Arpita, I am ${f.get('n')}. My phone number is ${f.get('p')}.\n${f.get('m')}`
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    setSent('WhatsApp is opening with your details. Arpita will call you back on the number you entered.')
  }

  const all = d.sections.flatMap((s) => s.images)
  const feat = all.slice(0, 6)
  const tiles = feat.length ? feat.map((src) => ({ src })) : Array.from({ length: 6 }, () => ({ src: '' }))
  const sec = page.startsWith('g-') ? d.sections.find((s) => 'g-' + s.id === page) : null

  return (<>
    <header><div className="wrap">
      <div className="logo">{owner ? <Ed owner v={d.brand} on={(v) => up('brand', v)} /> : d.brand}</div>
      <nav aria-label="Main">{PAGES.map(([k, l]) => <a key={k} href={'#' + k} className={(page === k || (k === 'works' && sec)) ? 'on' : ''} onClick={(e) => { e.preventDefault(); go(k) }}>{l}</a>)}</nav>
      <button className="pill" onClick={() => setDark(!dark)}>{dark ? 'Light theme' : 'Dark theme'}</button>
    </div></header>

    <main key={page} className="wrap page" style={{ paddingBottom: owner ? 100 : 0 }}>
      {page !== 'home' && <button className="pill back" onClick={() => go(sec ? 'works' : 'home')}>{sec ? '← Back to works' : '← Back to home'}</button>}
      {page === 'home' && <>
        <div className="hero">
          <div>
            <h1><Ed owner={owner} v={d.name} on={(v) => up('name', v)} /></h1>
            <p className="sub"><Ed owner={owner} v={d.tag} on={(v) => up('tag', v)} /></p>
            <p className="in">{owner ? <Ed owner multi v={d.intro} on={(v) => up('intro', v)} /> : d.intro}</p>
            <div className="row">
              <a className="pill main" href="#contact" onClick={(e) => { e.preventDefault(); go('contact') }}>Book a look</a>
              <a className="pill" href="#works" onClick={(e) => { e.preventDefault(); go('works') }}>See my works</a>
              {owner && pick('Change photo', (u) => up('photo', u))}
            </div>
          </div>
          <div className="stage"><div className="blend"><Img src={d.photo} alt={d.name} /></div></div>
        </div>
        <section className="s"><h2>Some of my works</h2>
          <div className="grid">{tiles.map((t, i) => <div className="tile raised" key={i}><button className="imgbtn" aria-label="View photo" onClick={() => show(feat, i)}><Img src={t.src} alt="Makeup work" /></button></div>)}</div></section>
        <section className="s"><h2>Explore</h2><div className="links">
          {[['about', 'About me', 'Who I am and how I work'], ['works', 'Works', 'Bridal, party and shoot galleries'], ['contact', 'Contact me', 'Book a date or ask a question']].map(([k, a, b]) =>
            <a key={k} className="lk raised" href={'#' + k} onClick={(e) => { e.preventDefault(); go(k) }}><b>{a}</b><span>{b}</span></a>)}
        </div></section>
      </>}

      {page === 'about' && <section className="s two">
        <div><div className="about-img raised"><Img src={d.aboutPhoto} alt="About" /></div>{owner && <div style={{ marginTop: 18 }}>{pick('Change photo', (u) => up('aboutPhoto', u))}</div>}</div>
        <div><h2>About me</h2>{owner ? <Ed owner multi v={d.about} on={(v) => up('about', v)} /> : <p style={{ color: 'var(--mut)' }}>{d.about}</p>}</div>
      </section>}

      {page === 'works' && <section className="s">
        <h2>Works</h2>
        <div className="panel"><div className="cats">
          {d.sections.map((s) => owner
            ? <div key={s.id} className="cat raised">
                <input className="ed" value={s.title} onChange={(e) => upS(s.id, (x) => ({ ...x, title: e.target.value }))} aria-label="Section name" />
                <div className="row"><a className="pill main" href={'#g-' + s.id} onClick={(e) => { e.preventDefault(); go('g-' + s.id) }}>Open and edit</a>
                  <button className="pill" onClick={() => confirm('Delete this section and its images?') && edit((o) => ({ ...o, sections: o.sections.filter((x) => x.id !== s.id) }))}>Delete</button></div>
              </div>
            : <a key={s.id} className="cat raised" href={'#g-' + s.id} onClick={(e) => { e.preventDefault(); go('g-' + s.id) }}>
                <h3>{s.title}</h3><small>{s.images.length ? s.images.length + (s.images.length === 1 ? ' photo' : ' photos') : 'Coming soon'}</small><i />
              </a>)}
        </div>
        {owner && <div style={{ marginTop: 26 }}><button className="pill main" onClick={() => edit((o) => ({ ...o, sections: [...o.sections, { id: uid(), title: 'New section', banner: '', images: [] }] }))}>+ Add section</button></div>}
        </div>
      </section>}

      {sec && <section className="s">
        <h2>{owner ? <Ed owner v={sec.title} on={(v) => upS(sec.id, (x) => ({ ...x, title: v }))} /> : sec.title}</h2>
        {(sec.banner || owner) && <div className="banner raised"><Img src={sec.banner} alt="" /></div>}
        {owner && <div className="row" style={{ marginBottom: 24 }}>{pick('Set banner', (u) => upS(sec.id, (x) => ({ ...x, banner: u })))}
          {sec.banner && <button className="pill" onClick={() => upS(sec.id, (x) => ({ ...x, banner: '' }))}>Remove banner</button>}</div>}
        <div className="grid">
          {sec.images.map((im, i) => <div className="tile raised" key={im + i}>
            <button className="imgbtn" aria-label="View photo" onClick={() => show(sec.images, i)}><Img src={im} alt={sec.title} /></button>
            {owner && <button className="x" aria-label="Remove image" onClick={() => upS(sec.id, (x) => ({ ...x, images: x.images.filter((_, j) => j !== i) }))}>×</button>}</div>)}
          {owner && pick('+ Add images (select many)', (u) => upS(sec.id, (x) => ({ ...x, images: [...x.images, u] })), true, 'tile add inset')}
        </div>
        {!owner && !sec.images.length && <p style={{ color: 'var(--mut)' }}>Photos for this section are coming soon.</p>}
      </section>}

      {page === 'contact' && <section className="s two" style={{ alignItems: 'start' }}>
        <div><h2>Contact me</h2>
          {['phone', 'place'].map((k) => <p key={k} style={{ margin: '8px 0' }}>{owner ? <Ed owner v={d.contact[k]} on={(v) => edit((o) => ({ ...o, contact: { ...o.contact, [k]: v } }))} /> : d.contact[k]}</p>)}
          {owner && <p style={{ color: 'var(--mut)', fontSize: '.9rem' }}>Include the country code in the phone number (for example +91…). Customer messages open in WhatsApp on this number.</p>}
        </div>
        <form className="raised" style={{ padding: 24 }} onSubmit={enquire}>
          <input name="n" placeholder="Your name" required autoComplete="name" aria-label="Your name" />
          <input name="p" type="tel" inputMode="tel" placeholder="Your phone number" required autoComplete="tel" aria-label="Your phone number" />
          <textarea name="m" placeholder="Tell me about the occasion and date" required aria-label="Message" />
          <button className="pill main">Send on WhatsApp</button>
          {sent && <p style={{ color: 'var(--mut)', marginBottom: 0 }}>{sent}</p>}
        </form>
      </section>}
    </main>

    <footer className="raised"><div className="wrap">
      <div><div className="logo">{d.brand}</div><span style={{ color: 'var(--mut)' }}>© {new Date().getFullYear()} {d.name}</span></div>
      <div className="soc">{d.social.map((s, i) => owner
        ? <span key={i} className="row" style={{ gap: 8 }}>
            <input className="ed" style={{ width: 110, margin: 0 }} value={s.n} onChange={(e) => edit((o) => ({ ...o, social: o.social.map((x, j) => (j === i ? { ...x, n: e.target.value } : x)) }))} />
            <input className="ed" style={{ width: 190, margin: 0 }} value={s.u} onChange={(e) => edit((o) => ({ ...o, social: o.social.map((x, j) => (j === i ? { ...x, u: e.target.value } : x)) }))} />
            <button className="pill" aria-label="Remove link" onClick={() => edit((o) => ({ ...o, social: o.social.filter((_, j) => j !== i) }))}>×</button>
          </span>
        : <a key={i} href={s.u} target="_blank" rel="noopener noreferrer">{s.n}</a>)}
        {owner && <button className="pill" onClick={() => edit((o) => ({ ...o, social: [...o.social, { n: 'New link', u: 'https://' }] }))}>+ Add link</button>}
      </div>
    </div></footer>

    {lb && <div className="lb" onClick={closeLb} role="dialog" aria-label="Photo viewer">
      <figure className="raised" onClick={(e) => e.stopPropagation()}><img src={lb.list[lb.i]} alt="Makeup work" /></figure>
      <button className="pill" style={{ top: 'calc(14px + env(safe-area-inset-top,0px))', right: 16 }} onClick={closeLb}>Close</button>
      {lb.list.length > 1 && <>
        <button className="pill" style={{ left: 12, top: '50%' }} aria-label="Previous" onClick={(e) => { e.stopPropagation(); step(-1) }}>‹</button>
        <button className="pill" style={{ right: 12, top: '50%' }} aria-label="Next" onClick={(e) => { e.stopPropagation(); step(1) }}>›</button></>}
    </div>}

    {queue[0] && <Cropper key={queue.length + queue[0].file.name} file={queue[0].file} onCancel={() => setQueue((q) => q.slice(1))}
      onDone={(b) => { const it = queue[0]; setQueue((q) => q.slice(1)); sendBlob(b, it.done) }} />}

    {ask && <div className="modal" onClick={() => setAsk(false)}><form className="raised" onClick={(e) => e.stopPropagation()} onSubmit={login}>
      <h3 style={{ fontSize: '1.7rem', marginBottom: 16 }}>Enter passcode</h3>
      <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Passcode" />
      {err && <p className="err">{err}</p>}
      <button className="pill main">Unlock</button>
    </form></div>}

    {owner && <div className="own raised">
      <b>Owner mode</b>
      <button className="pill main" disabled={!dirty} onClick={publish}>Publish changes</button>
      <span style={{ color: 'var(--mut)' }}>{msg || (dirty ? 'You have unpublished changes.' : 'Everything is live.')}</span>
      <button className="pill" style={{ marginLeft: 'auto' }} onClick={() => { setOwner(false); sessionStorage.removeItem('tok'); setTok('') }}>Exit owner mode</button>
    </div>}
  </>)
}
