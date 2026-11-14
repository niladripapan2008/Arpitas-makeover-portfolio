import { useState, useEffect, useRef, useLayoutEffect } from 'react'
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
const MAX = 7
const PAGES = [['home', 'Home'], ['about', 'About me'], ['works', 'Works'], ['contact', 'Contact me']]
const valid = (p, d) => PAGES.some(([k]) => k === p) || (p.startsWith('g-') && d.sections.some((s) => 'g-' + s.id === p))
const uid = () => Math.random().toString(36).slice(2, 9)
const mk = (i, dir, first) => ({ k: Math.random(), i, first, t: Math.random() * 10 - 5, fx: (dir >= 0 ? 1 : -1) * (22 + Math.random() * 32), fr: (dir >= 0 ? 1 : -1) * (16 + Math.random() * 26) })
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

const glide = (to, ms) => {
  const from = scrollY, t0 = performance.now(); let on = true
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  const stop = () => { on = false }
  ;['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((e) => addEventListener(e, stop, { once: true, passive: true }))
  const f = (now) => { if (!on) return; const p = Math.min(1, (now - t0) / ms); scrollTo(0, from + (to - from) * ease(p)); if (p < 1) requestAnimationFrame(f) }
  requestAnimationFrame(f)
  return stop
}
const Prod = ({ l, t, r, w, rot, d, dl, cls = '', children }) => (
  <div className={'prod ' + cls} style={{ left: l, top: t, right: r, width: w, '--d': d }}>
    <div className="pi" style={{ '--r': rot + 'deg', '--dl': dl + 's' }}>{children}</div>
  </div>
)
const Leaf = () => (<svg viewBox="0 0 160 260"><path d="M80 6C150 70 150 190 80 254C10 190 10 70 80 6Z" fill="url(#gLeaf)" /><path d="M80 14V250M80 70L116 40M80 110L124 76M80 150L120 116M80 70L44 40M80 110L36 76M80 150L40 116" stroke="rgba(255,255,255,.35)" strokeWidth="2" fill="none" /></svg>)
const Lipstick = ({ tip }) => (<svg viewBox="0 0 220 56"><rect x="4" y="10" width="124" height="32" rx="7" fill="url(#gWood)" /><rect x="124" y="14" width="10" height="24" fill="url(#gSilver)" /><rect x="134" y="16" width="44" height="20" rx="3" fill="url(#gGold)" /><path d="M178 17L212 22Q216 26 212 30L178 35Z" fill={'url(#' + tip + ')'} /></svg>)
const Foundation = () => (<svg viewBox="0 0 70 180"><rect x="18" y="4" width="34" height="34" rx="4" fill="url(#gWood)" /><rect x="14" y="36" width="42" height="10" rx="3" fill="url(#gGold)" /><rect x="6" y="46" width="58" height="124" rx="12" fill="url(#gGlass)" stroke="#e8cdb6" /><rect x="12" y="92" width="46" height="72" rx="8" fill="#f1d3b8" opacity=".9" /><rect x="12" y="56" width="6" height="100" rx="3" fill="#fff" opacity=".55" /></svg>)
const Brush = () => (<svg viewBox="0 0 280 44"><ellipse cx="30" cy="22" rx="30" ry="17" fill="#a99484" /><ellipse cx="22" cy="20" rx="16" ry="10" fill="#cdbdad" /><rect x="52" y="10" width="46" height="24" rx="3" fill="url(#gSilver)" /><rect x="96" y="12" width="176" height="20" rx="10" fill="url(#gWood)" /></svg>)
const Palette = () => (<svg viewBox="0 0 220 160"><rect x="6" y="8" width="208" height="144" rx="10" fill="url(#gWood)" /><rect x="16" y="18" width="188" height="124" rx="6" fill="#f2e6d6" />{['#e9c9a6', '#cf9d78', '#b97c5b', '#d7a79f', '#a7655a', '#7c4a45'].map((c, i) => <rect key={i} x={26 + (i % 3) * 60} y={28 + Math.floor(i / 3) * 56} width="52" height="46" rx="7" fill={c} />)}</svg>)
const Blush = () => (<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="url(#gSilver)" /><circle cx="60" cy="60" r="46" fill="#f6ece3" /><circle cx="60" cy="60" r="40" fill="url(#gRose)" /><ellipse cx="46" cy="44" rx="16" ry="9" fill="#fff" opacity=".28" /></svg>)
const Jar = () => (<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="url(#gWood)" /><circle cx="60" cy="60" r="42" fill="#f4e4cf" />{[[44, 50], [70, 44], [58, 72], [78, 68], [48, 74]].map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#e2c9a8" />)}</svg>)
const Gloss = () => (<svg viewBox="0 0 260 40"><rect x="6" y="8" width="150" height="24" rx="12" fill="url(#gGold)" /><rect x="150" y="10" width="100" height="20" rx="10" fill="#f0b9bf" /><rect x="156" y="13" width="88" height="5" rx="2.5" fill="#fff" opacity=".6" /></svg>)
const Pearls = () => (<svg viewBox="0 0 400 110">{Array.from({ length: 17 }, (_, i) => <circle key={i} cx={12 + i * 23.4} cy={96 - 78 * Math.sin((Math.PI * i) / 16)} r="10" fill="url(#gPearl)" />)}</svg>)

function Intro({ d, onDone }) {
  const root = useRef(null), go = useRef(null)
  useEffect(() => {
    const el = root.current; let raf = 0, timer = 0, done = false, stop = null
    const finish = () => { if (!done) { done = true; onDone() } }
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { el.style.setProperty('--sy', scrollY); if (scrollY >= el.offsetHeight - 2) finish() }) }
    go.current = () => { clearTimeout(timer); if (stop) stop(); stop = glide(el.offsetHeight, 1600) }
    const touch = () => clearTimeout(timer)
    const evs = ['wheel', 'touchstart', 'keydown']
    addEventListener('scroll', onScroll, { passive: true })
    evs.forEach((e) => addEventListener(e, touch, { passive: true, once: true }))
    timer = setTimeout(() => go.current(), 4300)
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); if (stop) stop(); removeEventListener('scroll', onScroll); evs.forEach((e) => removeEventListener(e, touch)) }
  }, [])
  let k = 0
  const words = d.brand.split(' ').map((w, wi) => (
    <span className="wd" key={wi}>{[...w].map((ch, ci) => { const i = k++; return <span className="ltr" key={ci} style={{ '--i': i }}>{ch}</span> })}{' '}</span>
  ))
  return (
    <section className="intro" ref={root} aria-label="Welcome">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true"><defs>
        <linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3dca0" /><stop offset=".5" stopColor="#c9a24f" /><stop offset="1" stopColor="#8f6a2a" /></linearGradient>
        <linearGradient id="gWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e6bb78" /><stop offset=".55" stopColor="#c58f45" /><stop offset="1" stopColor="#9a6a2c" /></linearGradient>
        <linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c9525a" /><stop offset="1" stopColor="#8d2230" /></linearGradient>
        <linearGradient id="gRoseTip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dd9a9c" /><stop offset="1" stopColor="#b9626c" /></linearGradient>
        <linearGradient id="gGlass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff2e7" /><stop offset="1" stopColor="#f0d2bb" /></linearGradient>
        <linearGradient id="gLeaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#86ba60" /><stop offset="1" stopColor="#3b7a39" /></linearGradient>
        <linearGradient id="gSilver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f7f7f7" /><stop offset="1" stopColor="#b3b3b9" /></linearGradient>
        <linearGradient id="gRose" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#efb1b0" /><stop offset="1" stopColor="#d4767d" /></linearGradient>
        <radialGradient id="gPearl" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#fff" /><stop offset=".6" stopColor="#f5ece4" /><stop offset="1" stopColor="#d6c4b3" /></radialGradient>
      </defs></svg>
      <Prod l="-3%" t="-6%" w="clamp(110px,14vw,200px)" rot={25} d={0.15} dl={0.05}><Leaf /></Prod>
      <Prod r="-2%" t="60%" w="clamp(120px,15vw,210px)" rot={-35} d={0.2} dl={0.15}><Leaf /></Prod>
      <Prod l="1%" t="72%" w="clamp(100px,12vw,170px)" rot={62} d={0.12} dl={0.25} cls="hs"><Leaf /></Prod>
      <Prod l="19%" t="6%" w="clamp(44px,5.6vw,80px)" rot={-8} d={0.4} dl={0.3}><Foundation /></Prod>
      <Prod r="7%" t="13%" w="clamp(130px,17vw,240px)" rot={18} d={0.5} dl={0.4}><Lipstick tip="gRed" /></Prod>
      <Prod r="12%" t="26%" w="clamp(110px,14vw,200px)" rot={6} d={0.45} dl={0.55} cls="hs"><Lipstick tip="gRoseTip" /></Prod>
      <Prod l="4%" t="33%" w="clamp(110px,15vw,210px)" rot={-10} d={0.3} dl={0.5}><Palette /></Prod>
      <Prod l="17%" t="77%" w="clamp(150px,22vw,300px)" rot={-6} d={0.55} dl={0.6}><Brush /></Prod>
      <Prod r="24%" t="70%" w="clamp(58px,8vw,108px)" rot={0} d={0.35} dl={0.7}><Blush /></Prod>
      <Prod l="9%" t="58%" w="clamp(58px,8vw,110px)" rot={0} d={0.25} dl={0.8} cls="hs"><Jar /></Prod>
      <Prod r="4%" t="47%" w="clamp(130px,17vw,240px)" rot={-22} d={0.4} dl={0.9}><Gloss /></Prod>
      <Prod l="31%" t="88%" w="clamp(200px,30vw,420px)" rot={0} d={0.25} dl={1} cls="hs"><Pearls /></Prod>
      <div className="tx">
        <p className="kick fade" style={{ '--dl': '1.9s' }}>{d.tag}</p>
        <p className="brandline" aria-label={d.brand}>{words}</p>
        <p className="nm fade" style={{ '--dl': '2.3s' }}>{d.name}</p>
      </div>
      <div className="cuew fade" style={{ '--dl': '2.8s' }}>
        <button className="pill" onClick={() => go.current && go.current()}>Scroll down
          <svg className="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
      </div>
    </section>
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
  const [intro, setIntro] = useState(() => {
    const h = location.hash.slice(1); let seen = false
    try { seen = !!sessionStorage.getItem('intro-done') } catch (e) {}
    return h === 'intro' || ((h === '' || h === 'home') && !seen && !matchMedia('(prefers-reduced-motion: reduce)').matches)
  })
  const hadIntro = useRef(intro)
  useLayoutEffect(() => { if (!intro && hadIntro.current) { hadIntro.current = false; scrollTo(0, 0) } }, [intro])
  useEffect(() => { if (location.hash.slice(1) === 'intro') history.replaceState(null, '', location.pathname + location.search) }, [])
  useEffect(() => { if (page !== 'home') setIntro(false) }, [page])
  useEffect(() => { document.documentElement.classList.toggle('intro-on', intro && page === 'home') }, [intro, page])
  const [dx, setDx] = useState(0)
  const drag = useRef(null)
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
    const h = () => { const p = location.hash.slice(1) || 'home'; if (p === 'owner') { history.replaceState(null, '', location.pathname + location.search); openOwner() } else if (p === 'intro') { try { sessionStorage.removeItem('intro-done') } catch (e) {} history.replaceState(null, '', location.pathname + location.search); hadIntro.current = true; setPage('home'); setIntro(true); scrollTo(0, 0) } else if (valid(p, d)) { if (p === 'home') pushed.current = false; setPage(p); scrollTo(0, 0) } }
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
  const step = (n) => {
    if (!lb || lb.list.length < 2) return
    const ni = (lb.i + n + lb.list.length) % lb.list.length
    setLb({ ...lb, i: ni, pile: [...lb.pile.slice(-2), mk(ni, n)] })
  }
  const show = (list, i) => { if (!list[i]) return; history.pushState({ lb: 1 }, ''); setLb({ list, i, pile: [mk(i, 0, true)] }) }
  const closeLb = () => (history.state && history.state.lb ? history.back() : setLb(null))
  const pd = (e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, moved: false } }
  const pm = (e) => { const d = drag.current; if (!d) return; const v = e.clientX - d.x; if (Math.abs(v) > 6) d.moved = true; setDx(v) }
  const pu = () => { const d = drag.current; drag.current = null; if (!d) return; const v = dx; setDx(0); if (!d.moved) step(1); else if (Math.abs(v) > 80) step(v < 0 ? 1 : -1) }

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
  const pick = (label, onUrl, multiple, cls = 'pill', room, sid) => (
    <label className={cls}>{label}<input type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => {
      const all = [...e.target.files], take = room == null ? all : all.slice(0, Math.max(room, 0))
      if (take.length < all.length) setMsg('Only ' + take.length + ' more photo(s) fit. Each category holds up to ' + MAX + ' photos.')
      setQueue((q) => [...q, ...take.map((file) => ({ file, done: onUrl, sid }))]); e.target.value = ''
    }} /></label>
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
  const room = sec ? MAX - sec.images.length - queue.filter((q) => q.sid === sec.id).length : 0

  return (<>
    {intro && page === 'home' && <Intro d={d} onDone={() => { try { sessionStorage.setItem('intro-done', '1') } catch (e) {} setIntro(false) }} />}
    <header><div className="wrap">
      <div className="logo">{owner ? <Ed owner v={d.brand} on={(v) => up('brand', v)} /> : d.brand}</div>
      <nav aria-label="Main">{PAGES.map(([k, l]) => <a key={k} href={'#' + k} className={(page === k || (k === 'works' && sec)) ? 'on' : ''} onClick={(e) => { e.preventDefault(); go(k) }}>{l}</a>)}</nav>
      <button className="pill theme" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title={dark ? 'Light theme' : 'Dark theme'}>
        <svg className="ic sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3L7 7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7" /></svg>
        <svg className="ic moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" /></svg>
      </button>
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
          {sec.banner && <button className="pill" onClick={() => upS(sec.id, (x) => ({ ...x, banner: '' }))}>Remove banner</button>}<span style={{ color: 'var(--mut)' }}>{sec.images.length} of {MAX} photos</span></div>}
        <div className="grid">
          {sec.images.map((im, i) => <div className="tile raised" key={im + i}>
            <button className="imgbtn" aria-label="View photo" onClick={() => show(sec.images, i)}><Img src={im} alt={sec.title} /></button>
            {owner && <button className="x" aria-label="Remove image" onClick={() => upS(sec.id, (x) => ({ ...x, images: x.images.filter((_, j) => j !== i) }))}>×</button>}</div>)}
          {owner && room > 0 && pick('+ Add images (' + room + ' left)', (u) => upS(sec.id, (x) => (x.images.length >= MAX ? x : { ...x, images: [...x.images, u] })), true, 'tile add inset', room, sec.id)}
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
      <div className="deck" onClick={(e) => e.stopPropagation()}>
        {lb.pile.map((c, idx) => {
          const top = idx === lb.pile.length - 1
          return (
            <figure key={c.k} className={'card raised ' + (top ? 'cur' + (c.first ? '' : ' uno') : 'under')}
              style={{ '--t': c.t + 'deg', '--fx': c.fx + 'vw', '--fr': c.fr + 'deg', zIndex: idx + 1, ...(top && dx ? { transform: `translateX(${dx}px) rotate(${c.t + dx / 25}deg)`, transition: 'none' } : {}) }}
              {...(top ? { onPointerDown: pd, onPointerMove: pm, onPointerUp: pu, onPointerCancel: () => { drag.current = null; setDx(0) } } : {})}>
              <img src={lb.list[c.i]} alt={top ? 'Makeup work' : ''} draggable={false} />
            </figure>
          )
        })}
      </div>
      <button className="pill" style={{ top: 'calc(14px + env(safe-area-inset-top,0px))', right: 16 }} onClick={closeLb}>Close</button>
      {lb.list.length > 1 && <span className="pill cnt">{lb.i + 1} / {lb.list.length}</span>}
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
