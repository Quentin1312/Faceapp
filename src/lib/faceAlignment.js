const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

// Target eye positions in the 800x800 output canvas
const TARGET_LEFT_EYE  = { x: 280, y: 300 }
const TARGET_RIGHT_EYE = { x: 520, y: 300 }

let landmarker = null
let initPromise = null

async function getLandmarker() {
  if (landmarker) return landmarker
  if (initPromise) return initPromise
  initPromise = (async () => {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
    landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'IMAGE',
      numFaces: 1,
    })
    return landmarker
  })()
  return initPromise
}

// Detect eye positions from an ImageBitmap or HTMLImageElement
async function detectEyes(imageEl) {
  const lm = await getLandmarker()
  const result = lm.detect(imageEl)
  if (!result?.faceLandmarks?.length) return null

  const pts = result.faceLandmarks[0]
  // Left eye corners: 33 (outer), 133 (inner) — in normalised coords [0,1]
  // Right eye corners: 362 (inner), 263 (outer)
  const leftEye  = avg(pts[33],  pts[133])
  const rightEye = avg(pts[362], pts[263])
  return { leftEye, rightEye }
}

function avg(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

// Align a Blob so that both eyes land on the fixed target positions.
// Returns a new Blob (JPEG) + the eye positions used.
export async function alignFace(blob) {
  try {
    const bitmap = await createImageBitmap(blob)

    // Normalised → pixel coords in original image
    const eyes = await detectEyes(bitmap)
    bitmap.close()

    if (!eyes) return { blob, eyePositions: null }

    const W = 800, H = 800
    const srcW = bitmap.width  || W
    const srcH = bitmap.height || H

    const lx = eyes.leftEye.x  * srcW
    const ly = eyes.leftEye.y  * srcH
    const rx = eyes.rightEye.x * srcW
    const ry = eyes.rightEye.y * srcH

    // Angle between the two eyes
    const angle = Math.atan2(ry - ly, rx - lx)

    // Current inter-eye distance → target distance
    const srcDist = Math.hypot(rx - lx, ry - ly)
    const tgtDist = Math.hypot(
      TARGET_RIGHT_EYE.x - TARGET_LEFT_EYE.x,
      TARGET_RIGHT_EYE.y - TARGET_LEFT_EYE.y,
    )
    const scale = tgtDist / srcDist

    // Mid-point of eyes in source
    const srcMidX = (lx + rx) / 2
    const srcMidY = (ly + ry) / 2
    const tgtMidX = (TARGET_LEFT_EYE.x + TARGET_RIGHT_EYE.x) / 2
    const tgtMidY = (TARGET_LEFT_EYE.y + TARGET_RIGHT_EYE.y) / 2

    // Draw aligned image
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)

    // Re-create bitmap (closed above)
    const bmp2 = await createImageBitmap(blob)
    ctx.save()
    ctx.translate(tgtMidX, tgtMidY)
    ctx.rotate(-angle)
    ctx.scale(scale, scale)
    ctx.translate(-srcMidX, -srcMidY)
    ctx.drawImage(bmp2, 0, 0)
    ctx.restore()
    bmp2.close()

    const alignedBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.88))
    return {
      blob: alignedBlob,
      eyePositions: { leftEye: eyes.leftEye, rightEye: eyes.rightEye },
    }
  } catch (err) {
    console.warn('Alignment failed, using original:', err)
    return { blob, eyePositions: null }
  }
}
