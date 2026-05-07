import { useEffect, useState, useCallback } from 'react'
import { getAllPhotos, deletePhoto } from '../lib/db'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import ComparisonSlider from './ComparisonSlider'

export default function Timeline({ refreshKey }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const all = await getAllPhotos()
    const withUrls = all.map(p => ({ ...p, url: URL.createObjectURL(p.imageBlob) }))
    setPhotos(withUrls)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  if (photos.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <span className="text-4xl">📷</span>
      <p className="text-white/50 text-sm">Aucune photo pour l'instant.<br />Capture ta première photo !</p>
    </div>
  )

  return (
    <>
      <div className="px-4 pt-6 pb-4">
        <h2 className="text-white font-semibold text-lg">Historique</h2>
        <p className="text-white/40 text-xs mt-0.5">{photos.length} photo{photos.length > 1 ? 's' : ''}</p>
      </div>

      <div className="grid grid-cols-3 gap-0.5 px-0.5">
        {photos.map(p => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            className="aspect-square relative overflow-hidden bg-surface active:opacity-70 transition-opacity"
          >
            <img src={p.url} alt={p.id} className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1">
              <p className="text-white text-[9px] text-center">
                {format(new Date(p.date), 'd MMM', { locale: fr })}
              </p>
            </div>
            {p.mood && (
              <div className="absolute top-1 right-1 text-base leading-none">
                {p.mood}
              </div>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <PhotoModal
          photo={selected}
          allPhotos={photos}
          onClose={() => setSelected(null)}
          onDelete={async () => {
            await deletePhoto(selected.id)
            setSelected(null)
            load()
          }}
        />
      )}
    </>
  )
}

function PhotoModal({ photo, allPhotos, onClose, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [comparing, setComparing] = useState(false)

  if (comparing) {
    return <ComparisonSlider basePhoto={photo} onClose={() => setComparing(false)} />
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in"
      style={{ paddingTop: 'var(--sat)' }}>
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={onClose} className="text-white/60 text-sm">← Retour</button>
        <p className="text-white/70 text-sm">
          {format(new Date(photo.date), 'EEEE d MMMM yyyy', { locale: fr })}
        </p>
        <button onClick={() => setConfirmDelete(true)} className="text-red-500/70 text-sm">Suppr.</button>
      </div>

      <div className="flex-1 relative flex items-center justify-center p-4 min-h-0">
        <img src={photo.url} alt={photo.id} className="max-w-full max-h-full rounded-2xl object-contain" />
        {photo.mood && (
          <div className="absolute top-6 right-6 text-3xl">{photo.mood}</div>
        )}
      </div>

      {(photo.note || photo.mood) && (
        <div className="px-6 pb-4 shrink-0">
          {photo.mood && !photo.note && (
            <p className="text-white/40 text-sm text-center">{photo.mood}</p>
          )}
          {photo.note && (
            <p className="text-white/70 text-sm text-center italic">"{photo.note}"</p>
          )}
        </div>
      )}

      {allPhotos.length > 1 && (
        <div className="px-6 pb-4 shrink-0">
          <button
            onClick={() => setComparing(true)}
            className="w-full py-3 rounded-2xl border border-white/15 text-white/70 text-sm active:bg-white/5"
          >
            Comparer avec le passé
          </button>
        </div>
      )}

      {confirmDelete && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 px-8">
          <p className="text-white text-center">Supprimer cette photo ?<br /><span className="text-white/50 text-sm">Cette action est irréversible.</span></p>
          <div className="flex gap-4">
            <button onClick={() => setConfirmDelete(false)} className="px-6 py-2 rounded-full border border-white/20 text-white text-sm">Annuler</button>
            <button onClick={onDelete} className="px-6 py-2 rounded-full bg-red-600 text-white text-sm">Supprimer</button>
          </div>
        </div>
      )}
    </div>
  )
}
