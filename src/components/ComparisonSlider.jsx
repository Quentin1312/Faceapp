import { useState, useRef, useCallback, useEffect } from 'react'
import { getAllPhotos } from '../lib/db'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ComparisonSlider({ basePhoto, onClose }) {
  const [photos, setPhotos] = useState([])
  const [comparePhoto, setComparePhoto] = useState(null)
  const [position, setPosition] = useState(50)
  const [picking, setPicking] = useState(true)
  const containerRef = useRef(null)
  const dragging = useRef(false)

  const baseUrl = basePhoto ? URL.createObjectURL(basePhoto.imageBlob) : null

  useEffect(() => {
    getAllPhotos().then(all => {
      const others = all
        .filter(p => p.id !== basePhoto?.id)
        .map(p => ({ ...p, url: URL.createObjectURL(p.imageBlob) }))
      setPhotos(others)
    })
  }, [])

  function selectPhoto(p) {
    setComparePhoto(p)
    setPicking(false)
    setPosition(50)
  }

  // ── Drag handling ────────────────────────────────────────────────────────────
  const getX = (e) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return 50
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    return Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 2), 98)
  }

  const onStart = useCallback(e => {
    dragging.current = true
    setPosition(getX(e))
  }, [])

  const onMove = useCallback(e => {
    if (!dragging.current) return
    e.preventDefault()
    setPosition(getX(e))
  }, [])

  const onEnd = useCallback(() => { dragging.current = false }, [])

  // ── Picker view ──────────────────────────────────────────────────────────────
  if (picking || !comparePhoto) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in"
        style={{ paddingTop: 'var(--sat)' }}>
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={onClose} className="text-white/50 text-sm active:text-white">✕</button>
          <p className="text-white/60 text-xs tracking-widest uppercase">Choisir une date</p>
          <div className="w-8" />
        </div>

        {photos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/30 text-sm">Pas encore d'autres photos</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overscroll-none px-4 pb-6">
            <p className="text-white/30 text-xs mb-3">
              Comparer avec{' '}
              <span className="text-white/60">
                {basePhoto ? format(new Date(basePhoto.date), 'd MMMM yyyy', { locale: fr }) : 'aujourd\'hui'}
              </span>
            </p>
            <div className="grid grid-cols-3 gap-1">
              {photos.map(p => (
                <button key={p.id} onClick={() => selectPhoto(p)}
                  className="aspect-square rounded-xl overflow-hidden relative active:opacity-70">
                  <img src={p.url} alt={p.id} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="text-white text-[9px] text-center">
                      {format(new Date(p.date), 'd MMM yy', { locale: fr })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Slider view ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in"
      style={{ paddingTop: 'var(--sat)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0">
        <button onClick={onClose} className="text-white/50 text-sm active:text-white">✕</button>
        <button onClick={() => setPicking(true)}
          className="text-white/50 text-xs active:text-white/80">
          Changer la date
        </button>
      </div>

      {/* Date labels */}
      <div className="flex justify-between px-5 pb-2 shrink-0">
        <p className="text-white/60 text-xs">
          {format(new Date(basePhoto.date), 'd MMM yyyy', { locale: fr })}
        </p>
        <p className="text-white/60 text-xs">
          {format(new Date(comparePhoto.date), 'd MMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Slider */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none"
        onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
        onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        style={{ touchAction: 'none' }}
      >
        {/* Right photo (compare) — full width behind */}
        <img
          src={comparePhoto.url}
          alt="compare"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Left photo (base) — clipped */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${position}%` }}
        >
          <img
            src={baseUrl}
            alt="base"
            className="absolute inset-0 h-full object-cover"
            style={{ width: `${(100 / position) * 100}%`, maxWidth: 'none' }}
            draggable={false}
          />
        </div>

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-px bg-white/80 pointer-events-none"
          style={{ left: `${position}%` }}
        />

        {/* Handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full
            bg-white flex items-center justify-center shadow-lg pointer-events-none"
          style={{ left: `${position}%` }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round">
            <path d="M8 4l-4 8 4 8M16 4l4 8-4 8" />
          </svg>
        </div>
      </div>
    </div>
  )
}
