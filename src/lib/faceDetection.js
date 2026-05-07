const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'

let detector = null
let initPromise = null

export async function initFaceDetector() {
  if (detector) return detector
  if (initPromise) return initPromise

  initPromise = (async () => {
    const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
    detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      minDetectionConfidence: 0.5,
    })
    return detector
  })()

  return initPromise
}

export function detectForVideo(videoEl, timestampMs) {
  if (!detector) return null
  try {
    return detector.detectForVideo(videoEl, timestampMs)
  } catch {
    return null
  }
}

// Returns { ok, score, bbox } where score is 0-1 centering quality
export function analyzeFace(result, videoW, videoH) {
  if (!result?.detections?.length) return { ok: false, score: 0, bbox: null }

  const face = result.detections.reduce((best, d) => {
    const area = d.boundingBox.width * d.boundingBox.height
    return !best || area > best.boundingBox.width * best.boundingBox.height ? d : best
  }, null)

  const { originX, originY, width, height } = face.boundingBox
  const cx = originX + width / 2
  const cy = originY + height / 2

  const dx = Math.abs(cx - videoW / 2) / (videoW / 2)   // 0 = perfect center
  const dy = Math.abs(cy - videoH * 0.45) / (videoH / 2)

  const minDim = Math.min(videoW, videoH)
  const sizePct = Math.min(width, height) / minDim       // relative face size

  const centered = dx < 0.22 && dy < 0.28 && sizePct > 0.18
  const score = Math.max(0, 1 - (dx + dy) / 2)

  return {
    ok: centered,
    score,
    bbox: { x: originX, y: originY, w: width, h: height },
  }
}
