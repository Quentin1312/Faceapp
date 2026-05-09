import { useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export default function PhotoExport({ photo, dayNumber, onClose }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!photo || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const W = 900
    const H = 1090
    canvas.width = W
    canvas.height = H

    const img = new Image()
    img.onload = () => {
      // Background
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, W, H)

      // Photo params
      const pad = 42
      const photoSize = W - pad * 2
      const photoY = 42
      const radius = 20

      // Photo clipped with rounded corners
      ctx.save()
      roundedRect(ctx, pad, photoY, photoSize, photoSize, radius)
      ctx.clip()
      ctx.drawImage(img, pad, photoY, photoSize, photoSize)
      ctx.restore()

      // Subtle border over photo
      ctx.save()
      roundedRect(ctx, pad, photoY, photoSize, photoSize, radius)
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.restore()

      // Text zone
      const textCenterY = photoY + photoSize + 68
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'

      // "Jour N" — big
      ctx.fillStyle = 'rgba(255,255,255,0.90)'
      ctx.font = `bold 64px -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif`
      ctx.fillText(`Jour ${dayNumber}`, W / 2, textCenterY)

      // Date — small + muted
      ctx.fillStyle = 'rgba(255,255,255,0.20)'
      ctx.font = `19px -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif`
      const dateStr = format(new Date(photo.date), 'd MMMM yyyy', { locale: fr })
      ctx.fillText(dateStr, W / 2, textCenterY + 38)
    }
    img.src = photo.url
  }, [photo, dayNumber])

  function download() {
    const canvas = canvasRef.current
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `facedaily-jour-${String(dayNumber).padStart(3, '0')}.jpg`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/jpeg', 0.93)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in"
      style={{ paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' }}
    >
      <div className="flex items-center justify-between px-4 py-4 shrink-0">
        <button onClick={onClose} className="text-white/50 text-sm active:text-white">← Retour</button>
        <p className="text-white/50 text-sm font-medium">Exporter</p>
        <div className="w-16" />
      </div>

      <div className="flex-1 flex items-center justify-center px-5 min-h-0">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: 'auto', borderRadius: '14px' }}
        />
      </div>

      <div className="px-6 pt-4 pb-6 shrink-0">
        <button
          onClick={download}
          className="w-full py-3.5 rounded-2xl bg-white text-black font-bold text-sm active:bg-white/80 transition-colors"
        >
          ↓ Télécharger
        </button>
      </div>
    </div>
  )
}
