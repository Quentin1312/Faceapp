import { useState, useEffect } from 'react'
import { getPhotosForMonth, getPhotosForYear } from '../lib/db'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useCountUp } from '../lib/hooks'
import { annualVerdict } from '../lib/beauf'

const MOODS_LABEL = {
  '😐': 'plutôt bof', '🙂': 'plutôt bien', '😄': 'au top',
  '😴': 'crevé', '😤': 'un peu chaud', '😢': 'pas au top',
  '🤒': 'malade', '🥃': 'sous Ricard',
}

function getBestStreak(photos) {
  if (!photos.length) return 0
  const sorted = [...photos].sort((a, b) => a.date - b.date)
  let best = 1, cur = 1
  for (let i = 1; i < sorted.length; i++) {
    const d1 = new Date(sorted[i - 1].date); d1.setHours(0, 0, 0, 0)
    const d2 = new Date(sorted[i].date); d2.setHours(0, 0, 0, 0)
    if ((d2 - d1) === 86400000) { cur++; best = Math.max(best, cur) }
    else cur = 1
  }
  return best
}

function getDominantMood(photos) {
  const counts = {}
  for (const p of photos) if (p.mood) counts[p.mood] = (counts[p.mood] || 0) + 1
  const entries = Object.entries(counts)
  if (!entries.length) return null
  return entries.sort((a, b) => b[1] - a[1])[0][0]
}

function getDaysInPeriod(mode, year, month) {
  if (mode === 'month') return new Date(year, month + 1, 0).getDate()
  return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365
}

function getBestMonth(photos) {
  const counts = {}
  for (const p of photos) {
    const m = new Date(p.date).getMonth()
    counts[m] = (counts[m] || 0) + 1
  }
  const entries = Object.entries(counts)
  if (!entries.length) return null
  const best = entries.sort((a, b) => b[1] - a[1])[0]
  return { month: +best[0], count: +best[1] }
}

function Slide({ children }) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center text-center px-10 h-full gap-5">
      {children}
    </div>
  )
}

function SlideIntro({ label }) {
  return (
    <Slide>
      <div className="text-white/25 text-xs tracking-[0.35em] uppercase">Face Daily</div>
      <div>
        <div className="text-white font-black leading-tight" style={{ fontSize: 'clamp(56px, 18vw, 80px)' }}>
          Ton<br />bilan
        </div>
        <div className="text-white/50 text-xl capitalize mt-3">{label}</div>
      </div>
      <div className="mt-8 text-white/20 text-sm">Appuie pour continuer</div>
    </Slide>
  )
}

function SlideCount({ count, period }) {
  const displayed = useCountUp(count, 1000)
  return (
    <Slide>
      <div className="text-white/35 text-xs tracking-widest uppercase">Photos capturées</div>
      <div className="text-white font-black leading-none" style={{ fontSize: 'clamp(96px, 32vw, 150px)' }}>
        {displayed}
      </div>
      <div className="text-white/40 text-lg capitalize">{period}</div>
    </Slide>
  )
}

function SlideCompletion({ pct, totalDays, photoCount }) {
  const [barWidth, setBarWidth] = useState(0)
  const capped = Math.min(pct, 100)
  const displayPct = useCountUp(Math.round(capped), 1200)

  useEffect(() => {
    const t = setTimeout(() => setBarWidth(capped), 100)
    return () => clearTimeout(t)
  }, [capped])

  const barColor = capped >= 80
    ? 'linear-gradient(90deg, #f97316, #ef4444)'
    : capped >= 50
    ? 'linear-gradient(90deg, #8b5cf6, #6366f1)'
    : 'linear-gradient(90deg, #3b82f6, #8b5cf6)'

  return (
    <Slide>
      <div className="text-white/35 text-xs tracking-widest uppercase">Taux de capture</div>
      <div className="flex items-end gap-2 justify-center">
        <div className="text-white font-black leading-none" style={{ fontSize: 'clamp(80px, 26vw, 128px)' }}>
          {displayPct}
        </div>
        <div className="text-white/50 font-bold text-4xl mb-3">%</div>
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-[1200ms]"
          style={{ width: `${barWidth}%`, background: barColor }}
        />
      </div>
      <div className="text-white/25 text-sm">{photoCount} photos · {totalDays} jours</div>
    </Slide>
  )
}

function SlideStreak({ streak }) {
  const displayed = useCountUp(streak, 1000)
  return (
    <Slide>
      <div className="text-white/35 text-xs tracking-widest uppercase">Meilleur streak</div>
      <div className="text-7xl">🔥</div>
      <div className="flex items-end gap-3 justify-center">
        <div className="text-white font-black leading-none" style={{ fontSize: 'clamp(80px, 26vw, 128px)' }}>
          {displayed}
        </div>
        <div className="text-white/50 font-bold text-3xl mb-3">jours</div>
      </div>
      <div className="text-white/25 text-sm">d'affilée</div>
    </Slide>
  )
}

function SlideMood({ mood, count, total }) {
  const label = MOODS_LABEL[mood] || mood
  const pct = Math.round((count / total) * 100)
  return (
    <Slide>
      <div className="text-white/35 text-xs tracking-widest uppercase">Humeur dominante</div>
      <div style={{ fontSize: '96px', lineHeight: 1 }}>{mood}</div>
      <div>
        <div className="text-white font-bold text-3xl">Tu étais</div>
        <div className="text-white/65 text-2xl mt-1">{label}</div>
      </div>
      <div className="text-white/25 text-sm">{count} fois · {pct}% des jours</div>
    </Slide>
  )
}

function SlideBestMonth({ month, count }) {
  const monthName = format(new Date(2024, month, 1), 'MMMM', { locale: fr })
  return (
    <Slide>
      <div className="text-white/35 text-xs tracking-widest uppercase">Meilleur mois</div>
      <div className="text-7xl">📅</div>
      <div className="text-white font-black capitalize" style={{ fontSize: 'clamp(40px, 13vw, 68px)' }}>
        {monthName}
      </div>
      <div className="text-white/50 text-xl">{count} photos</div>
    </Slide>
  )
}

function SlideVerdict({ verdict, onClose }) {
  return (
    <Slide>
      <div className="text-white/35 text-xs tracking-widest uppercase">Le verdict</div>
      <div className="text-white font-bold text-2xl leading-snug max-w-xs mx-auto">{verdict}</div>
      <button
        onClick={e => { e.stopPropagation(); onClose() }}
        className="mt-4 px-10 py-4 rounded-2xl bg-white text-black font-bold text-sm active:bg-white/80 transition-colors"
      >
        Fermer le bilan
      </button>
    </Slide>
  )
}

export default function Wrapped({ mode, year, month, onClose }) {
  const [photos, setPhotos] = useState(null)
  const [stats, setStats] = useState(null)
  const [slideIndex, setSlideIndex] = useState(0)

  useEffect(() => {
    async function load() {
      const data = mode === 'month'
        ? await getPhotosForMonth(year, month)
        : await getPhotosForYear(year)

      const totalDays = getDaysInPeriod(mode, year, month)
      const pct = (data.length / totalDays) * 100
      const dominantMood = getDominantMood(data)

      setStats({
        totalDays,
        pct,
        bestStreak: getBestStreak(data),
        dominantMood,
        moodCount: dominantMood ? data.filter(p => p.mood === dominantMood).length : 0,
        bestMonth: mode === 'year' ? getBestMonth(data) : null,
        count: data.length,
      })
      setPhotos(data)
    }
    load()
  }, [mode, year, month])

  if (!photos || !stats) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" style={{ paddingTop: 'var(--sat)' }}>
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4 px-10 text-center" style={{ paddingTop: 'var(--sat)' }}>
        <div className="text-5xl">📭</div>
        <p className="text-white/50 text-lg">Aucune photo pour cette période.</p>
        <button onClick={onClose} className="mt-4 px-8 py-3 rounded-2xl border border-white/20 text-white text-sm active:bg-white/5">
          Retour
        </button>
      </div>
    )
  }

  const periodLabel = mode === 'month'
    ? format(new Date(year, month, 1), 'MMMM yyyy', { locale: fr })
    : String(year)

  const slideIds = [
    'intro',
    'count',
    'completion',
    stats.bestStreak > 1 ? 'streak' : null,
    stats.dominantMood ? 'mood' : null,
    mode === 'year' && stats.bestMonth ? 'best_month' : null,
    'verdict',
  ].filter(Boolean)

  const totalSlides = slideIds.length
  const currentId = slideIds[Math.min(slideIndex, totalSlides - 1)]
  const isLast = slideIndex >= totalSlides - 1

  function advance() {
    if (!isLast) setSlideIndex(i => i + 1)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      style={{ paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' }}
    >
      <button
        onClick={onClose}
        className="absolute right-4 text-white/25 text-sm z-10 active:text-white/60"
        style={{ top: 'calc(var(--sat) + 16px)' }}
      >
        ✕
      </button>

      <div
        key={slideIndex}
        className="flex-1 flex items-center justify-center cursor-pointer"
        onClick={!isLast ? advance : undefined}
      >
        {currentId === 'intro' && <SlideIntro label={periodLabel} />}
        {currentId === 'count' && <SlideCount count={stats.count} period={periodLabel} />}
        {currentId === 'completion' && (
          <SlideCompletion pct={stats.pct} totalDays={stats.totalDays} photoCount={stats.count} />
        )}
        {currentId === 'streak' && <SlideStreak streak={stats.bestStreak} />}
        {currentId === 'mood' && (
          <SlideMood mood={stats.dominantMood} count={stats.moodCount} total={stats.count} />
        )}
        {currentId === 'best_month' && stats.bestMonth && (
          <SlideBestMonth month={stats.bestMonth.month} count={stats.bestMonth.count} />
        )}
        {currentId === 'verdict' && (
          <SlideVerdict verdict={annualVerdict(stats.pct)} onClose={onClose} />
        )}
      </div>

      <div className="flex justify-center items-center gap-1.5 pb-8 shrink-0">
        {slideIds.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === slideIndex ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
