import { useRef, useEffect, useState, useCallback } from 'react'
import { initFaceDetector, detectForVideo, analyzeFace } from '../lib/faceDetection'
import { savePhoto, getTodayPhoto, getPhotoByDate, getStreak } from '../lib/db'

const COUNTDOWN_SEC = 3

export default function Camera({ onCaptureDone }) {
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const captureCanvasRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const rafRef = useRef(null)
  const countdownTimerRef = useRef(null)

  // phase: init | loading | ready | centered | countdown | captured | already | error
  const [phase, setPhase] = useState('init')
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC)
  const [streak, setStreak] = useState(0)
  const [todayPhoto, setTodayPhoto] = useState(null)
  const [capturedUrl, setCapturedUrl] = useState(null)
  const [yearAgoUrl, setYearAgoUrl] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [faceScore, setFaceScore] = useState(0)

  // On mount: check if photo taken today
  useEffect(() => {
    async function boot() {
      const [today, s] = await Promise.all([getTodayPhoto(), getStreak()])
      setStreak(s)
      if (today) {
        setTodayPhoto(today)
        setCapturedUrl(URL.createObjectURL(today.imageBlob))
        loadYearAgo()
        setPhase('already')
      } else {
        setPhase('loading')
        await startCamera()
      }
    }
    boot()
    return () => cleanup()
  }, [])

  async function loadYearAgo() {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)
    const p = await getPhotoByDate(d)
    if (p) setYearAgoUrl(URL.createObjectURL(p.imageBlob))
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      const det = await initFaceDetector()
      detectorRef.current = det
      setPhase('ready')
      startDetectionLoop()
    } catch (err) {
      setErrorMsg(err.name === 'NotAllowedError' ? 'Accès à la caméra refusé.' : `Erreur caméra : ${err.message}`)
      setPhase('error')
    }
  }

  function cleanup() {
    cancelAnimationFrame(rafRef.current)
    clearTimeout(countdownTimerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  function startDetectionLoop() {
    function loop() {
      const video = videoRef.current
      if (!video || video.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return }

      const result = detectForVideo(video, performance.now())
      const { ok, score, bbox } = analyzeFace(result, video.videoWidth, video.videoHeight)
      setFaceScore(score)
      drawOverlay(ok, bbox, video)

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  // Use ref to access current phase inside rAF without stale closure
  const phaseRef = useRef('ready')
  useEffect(() => { phaseRef.current = phase }, [phase])

  function drawOverlay(faceOk, bbox, video) {
    const canvas = overlayRef.current
    if (!canvas) return
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H }
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    const cx = W / 2
    const cy = H * 0.44
    const r = Math.min(W, H) * 0.36

    // Outer dim
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, 0, W, H)
    // Cut circle hole
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    ctx.globalCompositeOperation = 'source-over'

    // Circle border
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = faceOk ? '#22c55e' : 'rgba(255,255,255,0.5)'
    ctx.lineWidth = faceOk ? 3 : 1.5
    ctx.stroke()

    // Hint text
    if (phaseRef.current === 'ready' || phaseRef.current === 'centered') {
      ctx.fillStyle = faceOk ? '#22c55e' : 'rgba(255,255,255,0.6)'
      ctx.font = `${Math.round(W * 0.038)}px system-ui`
      ctx.textAlign = 'center'
      const msg = faceOk ? 'Maintien…' : 'Centre ton visage'
      ctx.fillText(msg, cx, cy + r + Math.round(W * 0.07))
    }
  }

  // Trigger countdown when face OK
  useEffect(() => {
    if (phase === 'ready' && faceScore > 0) {
      // face appeared
    }
    if (phase !== 'ready' && phase !== 'centered' && phase !== 'countdown') return

    cancelAnimationFrame(rafRef.current)

    if (faceScore > 0.6 && (phase === 'ready' || phase === 'centered')) {
      setPhase('centered')
    }
  }, [faceScore])

  // Separate effect to manage countdown when centered
  useEffect(() => {
    if (phase !== 'centered') {
      clearTimeout(countdownTimerRef.current)
      setCountdown(COUNTDOWN_SEC)
      return
    }
    // Start countdown
    let remaining = COUNTDOWN_SEC
    setCountdown(remaining)
    const tick = () => {
      remaining--
      setCountdown(remaining)
      if (remaining <= 0) {
        doCapture()
      } else {
        countdownTimerRef.current = setTimeout(tick, 1000)
      }
    }
    countdownTimerRef.current = setTimeout(tick, 1000)
    return () => clearTimeout(countdownTimerRef.current)
  }, [phase])

  const doCapture = useCallback(async () => {
    setPhase('captured')
    cancelAnimationFrame(rafRef.current)

    const video = videoRef.current
    const canvas = captureCanvasRef.current
    if (!video || !canvas) return

    canvas.width = 800
    canvas.height = 800
    const ctx = canvas.getContext('2d')
    const size = Math.min(video.videoWidth, video.videoHeight)
    const sx = (video.videoWidth - size) / 2
    const sy = (video.videoHeight - size) / 2

    // Flip horizontally (selfie → normal)
    ctx.save()
    ctx.translate(800, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 800, 800)
    ctx.restore()

    canvas.toBlob(async (blob) => {
      const record = await savePhoto(blob, null)
      const newStreak = await getStreak()
      setStreak(newStreak)
      setCapturedUrl(URL.createObjectURL(blob))
      await loadYearAgo()
      cleanup()
      setPhase('done')
      onCaptureDone?.()
    }, 'image/jpeg', 0.88)
  }, [onCaptureDone])

  const retake = () => {
    setCapturedUrl(null)
    setFaceScore(0)
    setPhase('loading')
    startCamera()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase === 'already' || phase === 'done') {
    return <AlreadyCaptured capturedUrl={capturedUrl} yearAgoUrl={yearAgoUrl} streak={streak} />
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
        <div className="text-4xl">📵</div>
        <p className="text-white/70 text-sm">{errorMsg}</p>
        <button onClick={() => { setPhase('loading'); startCamera() }}
          className="px-6 py-2 rounded-full border border-white/20 text-white text-sm">
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Live video (mirrored for selfie UX) */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Overlay canvas */}
      <canvas ref={overlayRef} className="absolute inset-0 w-full h-full" />

      {/* Hidden capture canvas */}
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* Loading spinner */}
      {(phase === 'init' || phase === 'loading') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/50 text-xs">Initialisation…</p>
        </div>
      )}

      {/* Countdown */}
      {phase === 'centered' && countdown < COUNTDOWN_SEC && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ paddingTop: '10%' }}>
          <span className="text-white font-bold text-8xl opacity-80 animate-pulse-slow">
            {countdown}
          </span>
        </div>
      )}

      {/* Streak badge */}
      {streak > 0 && (phase === 'ready' || phase === 'centered') && (
        <div className="absolute top-safe top-4 right-4 flex items-center gap-1 bg-black/50 rounded-full px-3 py-1">
          <span className="text-orange-400">🔥</span>
          <span className="text-white text-sm font-medium">{streak}</span>
        </div>
      )}

      {/* Manual capture button (fallback) */}
      {(phase === 'ready' || phase === 'centered') && (
        <div className="absolute bottom-8 inset-x-0 flex justify-center">
          <button
            onClick={doCapture}
            className="w-16 h-16 rounded-full border-4 border-white bg-white/10 active:bg-white/30 transition-colors"
            aria-label="Capturer"
          />
        </div>
      )}
    </div>
  )
}

function AlreadyCaptured({ capturedUrl, yearAgoUrl, streak }) {
  return (
    <div className="flex flex-col items-center gap-6 px-6 py-10 h-full overflow-y-auto">
      {/* Streak */}
      <div className="flex items-center gap-2">
        <span className="text-orange-400 text-2xl">🔥</span>
        <span className="text-white text-2xl font-bold">{streak}</span>
        <span className="text-white/50 text-sm">jour{streak > 1 ? 's' : ''}</span>
      </div>

      {/* Today's photo */}
      <div className="w-full max-w-xs aspect-square rounded-2xl overflow-hidden">
        {capturedUrl && <img src={capturedUrl} alt="Aujourd'hui" className="w-full h-full object-cover animate-fade-in" />}
      </div>
      <p className="text-white/40 text-xs uppercase tracking-widest">Aujourd'hui</p>

      {/* Year ago comparison */}
      {yearAgoUrl && (
        <>
          <div className="w-full max-w-xs h-px bg-white/10" />
          <div className="w-full max-w-xs aspect-square rounded-2xl overflow-hidden">
            <img src={yearAgoUrl} alt="Il y a 1 an" className="w-full h-full object-cover" />
          </div>
          <p className="text-white/40 text-xs uppercase tracking-widest">Il y a 1 an</p>
        </>
      )}
    </div>
  )
}
