import { useEffect, useState } from 'react'
import { getPhotosForMonth } from '../lib/db'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export default function Calendar({ refreshKey }) {
  const [viewDate, setViewDate] = useState(new Date())
  const [photos, setPhotos] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const ps = await getPhotosForMonth(viewDate.getFullYear(), viewDate.getMonth())
      setPhotos(ps.map(p => ({ ...p, url: URL.createObjectURL(p.imageBlob) })))
      setLoading(false)
    }
    load()
  }, [viewDate, refreshKey])

  function prevMonth() {
    setSelected(null)
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function nextMonth() {
    setSelected(null)
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
    if (next > new Date()) return
    setViewDate(next)
  }

  const days = eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) })
  // Monday-first offset
  const startOffset = (getDay(startOfMonth(viewDate)) + 6) % 7

  function photoForDay(day) {
    return photos.find(p => isSameDay(new Date(p.date), day))
  }

  const isCurrentMonth = viewDate.getMonth() === new Date().getMonth() && viewDate.getFullYear() === new Date().getFullYear()

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center text-white/60 active:text-white">‹</button>
        <h2 className="text-white font-semibold capitalize">
          {format(viewDate, 'MMMM yyyy', { locale: fr })}
        </h2>
        <button onClick={nextMonth} className={`w-8 h-8 flex items-center justify-center ${isCurrentMonth ? 'text-white/20' : 'text-white/60 active:text-white'}`}
          disabled={isCurrentMonth}>›</button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-0.5">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-white/30 text-xs py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
          {days.map(day => {
            const photo = photoForDay(day)
            const isToday = isSameDay(day, new Date())
            const isFuture = day > new Date()
            const isSelected = selected && isSameDay(new Date(selected.date), day)

            return (
              <button
                key={day.toISOString()}
                disabled={!photo || isFuture}
                onClick={() => setSelected(photo || null)}
                className={`aspect-square rounded-lg overflow-hidden relative flex items-center justify-center transition-all
                  ${photo ? 'cursor-pointer active:opacity-70' : ''}
                  ${isSelected ? 'ring-2 ring-white' : ''}
                  ${isToday && !photo ? 'ring-1 ring-white/30' : ''}
                `}
              >
                {photo ? (
                  <img src={photo.url} alt={format(day, 'd')} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className={`text-xs ${isFuture ? 'text-white/10' : isToday ? 'text-white/60' : 'text-white/25'}`}>
                    {format(day, 'd')}
                  </span>
                )}
                {isToday && (
                  <div className="absolute bottom-0.5 inset-x-0 flex justify-center">
                    <div className="w-1 h-1 rounded-full bg-white" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Selected photo preview */}
      {selected && (
        <div className="mt-2 flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-full aspect-square rounded-2xl overflow-hidden max-w-xs mx-auto">
            <img src={selected.url} alt="selected" className="w-full h-full object-cover" />
          </div>
          <p className="text-white/50 text-xs capitalize">
            {format(new Date(selected.date), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>
      )}

      {/* Monthly stats */}
      <div className="mt-2 flex gap-4 justify-center">
        <div className="text-center">
          <p className="text-white font-bold text-xl">{photos.length}</p>
          <p className="text-white/40 text-xs">captures</p>
        </div>
        <div className="w-px bg-white/10" />
        <div className="text-center">
          <p className="text-white font-bold text-xl">{days.length}</p>
          <p className="text-white/40 text-xs">jours</p>
        </div>
        <div className="w-px bg-white/10" />
        <div className="text-center">
          <p className="text-white font-bold text-xl">{Math.round(photos.length / days.length * 100)}%</p>
          <p className="text-white/40 text-xs">complétion</p>
        </div>
      </div>
    </div>
  )
}
