const CANVAS_SIZE = 800
const FPS = 15
// Each photo is shown for this many frames; crossfade lasts FADE_FRAMES
const HOLD_FRAMES = 8
const FADE_FRAMES = 7

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = reject
    img.src = url
  })
}

export async function generateVideo(photos, onProgress) {
  if (photos.length === 0) throw new Error('No photos')

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_SIZE
  canvas.height = CANVAS_SIZE
  const ctx = canvas.getContext('2d')

  // Preload all images
  onProgress?.('Chargement des photos…', 0)
  const images = []
  for (let i = 0; i < photos.length; i++) {
    images.push(await loadImage(photos[i].imageBlob))
    onProgress?.('Chargement des photos…', (i + 1) / photos.length * 30)
  }

  // Determine supported mime type
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm'

  const stream = canvas.captureStream(FPS)
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 })
  const chunks = []
  recorder.ondataavailable = e => e.data.size > 0 && chunks.push(e.data)

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType })
      resolve({ blob, mimeType })
    }
    recorder.onerror = reject

    recorder.start()

    let frameIdx = 0
    const totalFrames = images.length * (HOLD_FRAMES + FADE_FRAMES) - FADE_FRAMES

    function drawFrame() {
      const photoIdx = Math.floor(frameIdx / (HOLD_FRAMES + FADE_FRAMES))
      const frameInPhoto = frameIdx % (HOLD_FRAMES + FADE_FRAMES)

      if (photoIdx >= images.length) {
        // Draw last frame clean then stop
        ctx.drawImage(images[images.length - 1], 0, 0, CANVAS_SIZE, CANVAS_SIZE)
        setTimeout(() => recorder.stop(), 200)
        return
      }

      if (frameInPhoto < HOLD_FRAMES) {
        // Hold current photo
        ctx.drawImage(images[photoIdx], 0, 0, CANVAS_SIZE, CANVAS_SIZE)
      } else {
        // Crossfade to next photo
        const nextIdx = photoIdx + 1
        if (nextIdx < images.length) {
          const alpha = (frameInPhoto - HOLD_FRAMES) / FADE_FRAMES
          ctx.drawImage(images[photoIdx], 0, 0, CANVAS_SIZE, CANVAS_SIZE)
          ctx.globalAlpha = alpha
          ctx.drawImage(images[nextIdx], 0, 0, CANVAS_SIZE, CANVAS_SIZE)
          ctx.globalAlpha = 1
        } else {
          ctx.drawImage(images[photoIdx], 0, 0, CANVAS_SIZE, CANVAS_SIZE)
        }
      }

      frameIdx++
      const pct = 30 + (frameIdx / totalFrames) * 70
      onProgress?.('Génération de la vidéo…', Math.min(99, pct))

      setTimeout(drawFrame, 1000 / FPS)
    }

    drawFrame()
  })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
