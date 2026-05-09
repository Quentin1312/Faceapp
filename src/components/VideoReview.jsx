import { useState } from 'react'
import { getPhotosForMonth, getPhotosForYear } from '../lib/db'
import { generateVideo, downloadBlob } from '../lib/videoGenerator'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Wrapped from './Wrapped'

export default function VideoReview() {
  const [mode, setMode] = useState(null) // null | 'month' | 'year'
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [status, setStatus] = useState(null) // null | { label, pct } | 'done' | 'error'
  const [videoUrl, setVideoUrl] = useState(null)
  const [photoCount, setPhotoCount] = useState(0)

  // Wrapped bilan state
  const [wrappedScope, setWrappedScope] = useState('month') // 'month' | 'year'
  const [wrappedYear, setWrappedYear] = useState(new Date().getFullYear())
  const [wrappedMonth, setWrappedMonth] = useState(new Date().getMonth())
  const [wrappedOpen, setWrappedOpen] = useState(false)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const months = Array.from({ length: 12 }, (_, i) => i)

  async function generate() {
    setStatus({ label: 'Récupération des photos…', pct: 0 })
    setVideoUrl(null)
    try {
      const photos = mode === 'month'
        ? await getPhotosForMonth(year, month)
        : await getPhotosForYear(year)

      if (photos.length < 2) {
        setStatus('error')
        return
      }
      setPhotoCount(photos.length)

      const { blob } = await generateVideo(photos, (label, pct) => {
        setStatus({ label, pct })
      })

      const url = URL.createObjectURL(blob)
      setVideoUrl(url)
      setStatus('done')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  function download() {
    if (!videoUrl) return
    const label = mode === 'month'
      ? `facedaily-${year}-${String(month + 1).padStart(2, '0')}`
      : `facedaily-${year}`
    fetch(videoUrl).then(r => r.blob()).then(b => downloadBlob(b, `${label}.webm`))
  }

  return (
    <div className="px-6 pt-8 pb-6 flex flex-col gap-6">
      {wrappedOpen && (
        <Wrapped
          mode={wrappedScope}
          year={wrappedYear}
          month={wrappedMonth}
          onClose={() => setWrappedOpen(false)}
        />
      )}

      <div>
        <h2 className="text-white font-semibold text-lg">Reviews vidéo</h2>
        <p className="text-white/40 text-xs mt-1">Génère un timelapse de tes photos</p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        {['month', 'year'].map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setStatus(null); setVideoUrl(null) }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors
              ${mode === m ? 'bg-white text-black' : 'bg-surface text-white/60 border border-border'}`}
          >
            {m === 'month' ? 'Mensuelle' : 'Annuelle'}
          </button>
        ))}
      </div>

      {/* Config */}
      {mode && (
        <div className="flex flex-col gap-3 animate-fade-in">
          <div className="flex gap-3">
            <select
              value={year}
              onChange={e => setYear(+e.target.value)}
              className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-white text-sm appearance-none"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {mode === 'month' && (
              <select
                value={month}
                onChange={e => setMonth(+e.target.value)}
                className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-white text-sm appearance-none capitalize"
              >
                {months.map(m => (
                  <option key={m} value={m} className="capitalize">
                    {format(new Date(2024, m, 1), 'MMMM', { locale: fr })}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={generate}
            disabled={!!status && status !== 'done' && status !== 'error'}
            className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-sm active:bg-white/80 disabled:opacity-40 transition-opacity"
          >
            Générer
          </button>
        </div>
      )}

      {/* Progress */}
      {status && status !== 'done' && status !== 'error' && (
        <div className="flex flex-col gap-2 animate-fade-in">
          <div className="flex justify-between text-xs text-white/50">
            <span>{status.label}</span>
            <span>{Math.round(status.pct)}%</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${status.pct}%` }} />
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <p className="text-red-400 text-sm text-center animate-fade-in">
          Pas assez de photos pour générer une vidéo (minimum 2).
        </p>
      )}

      {/* Done: video preview + download */}
      {status === 'done' && videoUrl && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="rounded-2xl overflow-hidden bg-surface aspect-square">
            <video src={videoUrl} controls loop className="w-full h-full object-contain" />
          </div>
          <p className="text-white/40 text-xs text-center">{photoCount} photos · WebM</p>
          <button
            onClick={download}
            className="w-full py-3.5 rounded-xl border border-white/20 text-white font-medium text-sm active:bg-white/10 transition-colors"
          >
            ↓ Télécharger
          </button>
        </div>
      )}

      {/* Separator */}
      <div className="h-px bg-white/8" />

      {/* Bilan Wrapped */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-white font-semibold text-lg">Bilan</h2>
          <p className="text-white/40 text-xs mt-1">Ton résumé photo à la Wrapped</p>
        </div>

        {/* Scope toggle */}
        <div className="flex gap-2">
          {['month', 'year'].map(s => (
            <button
              key={s}
              onClick={() => setWrappedScope(s)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors
                ${wrappedScope === s ? 'bg-white text-black' : 'bg-surface text-white/60 border border-border'}`}
            >
              {s === 'month' ? 'Mensuel' : 'Annuel'}
            </button>
          ))}
        </div>

        {/* Selectors */}
        <div className="flex gap-3">
          <select
            value={wrappedYear}
            onChange={e => setWrappedYear(+e.target.value)}
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-white text-sm appearance-none"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {wrappedScope === 'month' && (
            <select
              value={wrappedMonth}
              onChange={e => setWrappedMonth(+e.target.value)}
              className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-white text-sm appearance-none capitalize"
            >
              {Array.from({ length: 12 }, (_, i) => i).map(m => (
                <option key={m} value={m} className="capitalize">
                  {format(new Date(2024, m, 1), 'MMMM', { locale: fr })}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          onClick={() => setWrappedOpen(true)}
          className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-sm active:bg-white/80 transition-opacity"
        >
          Voir le bilan ✦
        </button>
      </div>
    </div>
  )
}
