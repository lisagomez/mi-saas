'use client'

import { useEffect, useRef, useState } from 'react'

// Configura NEXT_PUBLIC_WHATSAPP_URL en .env.local y Vercel
const WA_URL = process.env.NEXT_PUBLIC_WHATSAPP_URL ?? 'https://wa.me/'

// ─── Starscape ────────────────────────────────────────────────────────────────
function Starscape() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    type Star = { x: number; y: number; r: number; o: number; s: number; d: number }
    const stars: Star[] = []
    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    function init() {
      stars.length = 0
      for (let i = 0; i < 200; i++) {
        stars.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          r: Math.random() * 1.4 + 0.3,
          o: Math.random(),
          s: Math.random() * 0.004 + 0.001,
          d: (Math.random() - 0.5) * 0.08,
        })
      }
    }
    let frame = 0
    let raf: number
    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      frame++
      for (const st of stars) {
        st.o += st.s * Math.sin(frame * st.s * 15)
        st.o = Math.max(0.05, Math.min(1, st.o))
        st.x += st.d
        if (st.x < 0) st.x = canvas!.width
        if (st.x > canvas!.width) st.x = 0
        ctx!.beginPath()
        ctx!.arc(st.x, st.y, st.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(201,168,76,${st.o * 0.55})`
        ctx!.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    resize(); init(); draw()
    window.addEventListener('resize', () => { resize(); init() }, { passive: true })
    return () => { cancelAnimationFrame(raf) }
  }, [])
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-0" />
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'flex justify-center pt-3' : 'px-6 py-5'}`}>
      <div className={`flex items-center justify-between transition-all duration-500 ${scrolled ? 'bg-black/70 backdrop-blur-xl border border-amber-900/40 rounded-full px-5 py-2.5 w-full max-w-md' : 'w-full max-w-6xl mx-auto'}`}>
        {/* REEMPLAZA esto con <Image src="/logo.png" ... /> cuando tengas el logo */}
        <span className="font-bold text-amber-400 text-lg tracking-tight flex items-center gap-2">
          <span className="text-xl">🎸</span> CancioBot
        </span>
        <a href={WA_URL} target="_blank" rel="noopener noreferrer"
          className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-bold text-sm px-5 py-2 rounded-full transition-all shadow-lg shadow-amber-900/40">
          Pedir mi corrido
        </a>
      </div>
    </nav>
  )
}

// ─── Count-up ─────────────────────────────────────────────────────────────────
function CountUp({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [n, setN] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const done = useRef(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true
        const dur = 1800, t0 = Date.now()
        const tick = () => {
          const p = Math.min((Date.now() - t0) / dur, 1)
          const ease = 1 - Math.pow(1 - p, 4)
          setN(Math.round(ease * target))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  return <span ref={ref}>{prefix}{n}{suffix}</span>
}

// ─── Scroll Progress Bar ──────────────────────────────────────────────────────
function ScrollBar() {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const h = () => {
      const el = document.documentElement
      setPct((window.scrollY / (el.scrollHeight - el.clientHeight)) * 100)
    }
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[3px] bg-transparent">
      <div className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-none"
        style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main className="relative bg-[#0d0702] text-white overflow-x-hidden" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <Starscape />
      <ScrollBar />
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16">
        {/* Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-800/10 rounded-full blur-[100px] pointer-events-none" />

        <span className="inline-block mb-6 text-xs font-semibold uppercase tracking-widest text-amber-400/80 border border-amber-700/40 bg-amber-900/20 rounded-full px-4 py-1.5">
          🎸 Corridos auténticos · Hecho para ti
        </span>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] max-w-4xl mb-6"
          style={{ textShadow: '0 0 80px rgba(201,168,76,0.2)' }}>
          Tu historia merece<br />
          <span className="text-amber-400" style={{ textShadow: '0 0 40px rgba(201,168,76,0.6)' }}>
            un corrido
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-white/70 max-w-2xl mb-10 leading-relaxed">
          Cada migrante carga una historia de sacrificio, orgullo y amor.
          La tuya merece ser cantada — con tu nombre, tu gente, tu tierra.
          <br className="hidden sm:block" />
          <span className="text-amber-400/90"> Todo por WhatsApp. Entregado en horas.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center mb-16">
          <a href={WA_URL} target="_blank" rel="noopener noreferrer"
            className="group flex items-center gap-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-bold text-lg px-8 py-4 rounded-full transition-all shadow-2xl shadow-amber-900/50 hover:shadow-amber-600/40">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Quiero mi corrido
            <span className="text-sm font-normal opacity-80">→</span>
          </a>
          <p className="text-sm text-white/40">Es gratis preguntar · Sin compromiso</p>
        </div>

        {/* Scroll hint */}
        <div className="flex flex-col items-center gap-2 text-white/30 animate-bounce">
          <span className="text-xs tracking-widest uppercase">Descubre cómo</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── COMO FUNCIONA ────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest text-center mb-3">El proceso</p>
          <h2 className="text-4xl sm:text-5xl font-black text-center mb-16">
            Así de fácil
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: '01', icon: '💬', title: 'Cuéntanos tu historia', desc: 'Por WhatsApp — en texto o audio. Tu nombre, tu gente, tu trayecto. Sin formularios complicados.' },
              { n: '02', icon: '🎵', title: 'Creamos tu corrido', desc: 'Letra única con tu historia real. Canción generada con IA auténtica al estilo norteño-banda. En horas, no días.' },
              { n: '03', icon: '🎉', title: 'Te lo mandamos', desc: 'Tu corrido llega al WhatsApp. Letra, audio y video con tus fotos. Listo para compartir con quien más quieres.' },
            ].map(step => (
              <div key={step.n} className="relative rounded-2xl border border-amber-900/30 bg-amber-900/5 backdrop-blur-sm p-7 flex flex-col gap-4"
                style={{ boxShadow: '0 0 40px rgba(201,168,76,0.04)' }}>
                <span className="text-amber-800/60 text-6xl font-black absolute top-5 right-6 select-none">{step.n}</span>
                <span className="text-4xl">{step.icon}</span>
                <h3 className="text-xl font-bold text-amber-300">{step.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUÉ INCLUYE ──────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest text-center mb-3">Lo que recibes</p>
          <h2 className="text-4xl sm:text-5xl font-black text-center mb-4">
            Un corrido completo
          </h2>
          <p className="text-white/50 text-center max-w-xl mx-auto mb-14">
            No es una canción genérica. Es tu historia, cantada con tu nombre, tu gente y tu orgullo.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: '📝', title: 'Letra personalizada', desc: 'Cada verso habla de ti. Tu sacrificio, tus logros, tus seres queridos. Escrita por IA y revisada por humanos.' },
              { icon: '🎤', title: 'Canción con banda', desc: 'Audio generado al estilo norteño-banda con voz. Auténtico. Listo para escuchar y compartir.' },
              { icon: '🎬', title: 'Video con tus fotos', desc: 'Sube tus fotos y las combinamos con tu canción en un video para compartir en redes o enviar en WhatsApp.' },
            ].map(item => (
              <div key={item.title}
                className="rounded-2xl border border-amber-800/25 bg-gradient-to-b from-amber-900/10 to-transparent p-7 flex flex-col gap-4"
                style={{ backdropFilter: 'blur(20px)' }}>
                <span className="text-5xl">{item.icon}</span>
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OCASIONES ────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest text-center mb-3">Para cada momento</p>
          <h2 className="text-4xl sm:text-5xl font-black text-center mb-4">
            ¿Cuándo es tu fecha especial?
          </h2>
          <p className="text-white/50 text-center max-w-xl mx-auto mb-14">
            No dejes pasar la ocasión. Los cupos son limitados por semana.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { emoji: '🌹', label: 'Día de las Madres' },
              { emoji: '🎂', label: 'Cumpleaños' },
              { emoji: '💕', label: 'Día del Amor' },
              { emoji: '🇲🇽', label: 'Orgullo Mexicano' },
              { emoji: '🇬🇹', label: 'Orgullo Guatemalteco' },
              { emoji: '🇭🇳', label: 'Orgullo Hondureño' },
              { emoji: '🎊', label: 'XV Años / Quinceañera' },
              { emoji: '💍', label: 'Bodas y Aniversarios' },
              { emoji: '🏔️', label: 'Historia de Migración' },
              { emoji: '🎓', label: 'Graduaciones' },
              { emoji: '⭐', label: 'Logros y Triunfos' },
              { emoji: '👨‍👩‍👧', label: 'Reencuentros Familiares' },
            ].map(oc => (
              <span key={oc.label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-amber-800/30 bg-amber-900/15 text-sm font-medium text-white/80 hover:border-amber-600/50 hover:text-amber-300 hover:bg-amber-900/25 transition-all cursor-default">
                {oc.emoji} {oc.label}
              </span>
            ))}
          </div>
          <p className="text-center text-amber-500/70 text-sm font-medium animate-pulse">
            ⚡ Cupos limitados por semana — no dejes pasar la fecha
          </p>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6 border-y border-amber-900/20">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { target: 500, suffix: '+', label: 'Corridos entregados' },
            { target: 24, suffix: 'h', label: 'Tiempo de entrega' },
            { target: 100, suffix: '%', label: 'Personalizado' },
            { target: 25, prefix: '$', suffix: ' USD', label: 'Precio por corrido' },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-4xl sm:text-5xl font-black text-amber-400 mb-2"
                style={{ textShadow: '0 0 30px rgba(201,168,76,0.4)' }}>
                <CountUp target={stat.target} suffix={stat.suffix} prefix={stat.prefix} />
              </p>
              <p className="text-white/50 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── IDENTIDAD ────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-6xl mb-6 block">🦅</span>
          <h2 className="text-4xl sm:text-5xl font-black mb-6 leading-tight">
            Siempre superando obstáculos.<br />
            <span className="text-amber-400">Orgulloso de tus raíces.</span><br />
            Triunfando en el gabacho.
          </h2>
          <p className="text-white/60 text-lg leading-relaxed max-w-2xl mx-auto">
            Saliste de tu tierra con un sueño. Cruzaste fronteras, enfrentaste lo que fuera.
            Y aquí estás — triunfando. Esa historia merece ser inmortalizada en un corrido
            que tus hijos y nietos van a escuchar con orgullo.
          </p>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-28 px-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-amber-600/8 rounded-full blur-[150px]" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4">Actúa ahora</p>
          <h2 className="text-4xl sm:text-6xl font-black mb-6 leading-tight">
            ¿Cuándo vas a contar<br />tu historia?
          </h2>
          <p className="text-white/60 text-lg mb-3 max-w-xl mx-auto">
            No dejes pasar la fecha especial. Los cupos son limitados por semana
            y se agotan rápido.
          </p>
          <p className="text-amber-400/80 text-sm font-medium mb-10 animate-pulse">
            ⚡ Cupos limitados · Entrega en 24 horas · Es gratis preguntar
          </p>
          <a href={WA_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xl px-10 py-5 rounded-full transition-all shadow-2xl shadow-amber-900/60 hover:shadow-amber-600/50">
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Pedir mi corrido ahora
          </a>
          <p className="mt-5 text-white/30 text-sm">Sin compromiso · Sin datos personales · Solo por WhatsApp</p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-amber-900/20 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-bold text-amber-400 flex items-center gap-2">
            <span>🎸</span> CancioBot
          </span>
          <p className="text-white/30 text-sm text-center">
            Corridos personalizados para latinos que triunfan en el gabacho 🦅
          </p>
          <a href={WA_URL} target="_blank" rel="noopener noreferrer"
            className="text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors">
            Contacto por WhatsApp →
          </a>
        </div>
      </footer>
    </main>
  )
}
