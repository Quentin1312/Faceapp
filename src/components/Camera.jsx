import { useRef, useEffect, useState, useCallback } from 'react'
import { initFaceDetector, detectForVideo, analyzeFace } from '../lib/faceDetection'
import { alignFace } from '../lib/faceAlignment'
import { savePhoto, getTodayPhoto, getPhotoByDate, getStreak, updatePhoto, toDateId } from '../lib/db'
import NoteModal from './NoteModal'
import ComparisonSlider from './ComparisonSlider'
import { pick, FACE_DETECTED, CAPTURE_BTN, VERDICTS, ALIGNING, streakLabel, ricardScore } from '../lib/beauf'

export default function Camera({ onCaptureDone }) {
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const captureCanvasRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const rafRef = useRef(null)
  const scanYRef = useRef(0)
  const faceOkRef = useRef(false)

  // phase: init | loading | ready | capturing | aligning | note | done | already | error
  const [phase, setPhase] = useState('init')
  const [faceOk, setFaceOk] = useState(false)
  const [streak, setStreak] = useState(0)
  const [todayRecord, setTodayRecord] = useState(null)
  const [capturedUrl, setCapturedUrl] = useState(null)
  const [yearAgoUrl, setYearAgoUrl] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showComparison, setShowComparison] = useState(false)
  const [flash, setFlash] = useState(false)
  const [faceMsg] = useState(() => pick(FACE_DETECTED))
  const [captureMsg] = useState(() => pick(CAPTURE_BTN))
  const [alignMsg] = useState(() => pick(ALIGNING))
  const [verdict] = useState(() => pick(VERDICTS))

  useEffect(() => {
    async function boot() {
      const [today, s] = await Promise.all([getTodayPhoto(), getStreak()])
      setStreak(s)
      if (today) {
        setTodayRecord(today)
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
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  function startDetectionLoop() {
    function loop() {
      const video = videoRef.current
      if (!video || video.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return }
      const result = detectForVideo(video, performance.now())
      const { ok } = analyzeFace(result, video.videoWidth, video.videoHeight)
      if (ok !== faceOkRef.current) { faceOkRef.current = ok; setFaceOk(ok); if (!ok) scanYRef.current = 0 }
      drawOverlay(ok)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  function drawOverlay(isOk) {
    const canvas = overlayRef.current
    if (!canvas) return
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H }
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    const fw = Math.min(W, H) * 0.74, fh = fw * 1.18
    const fx = (W - fw) / 2, fy = H * 0.09

    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath(); roundedRect(ctx, fx, fy, fw, fh, 16); ctx.fill()
    ctx.globalCompositeOperation = 'source-over'

    const color = isOk ? '#22c55e' : 'rgba(255,255,255,0.65)'
    const bLen = fw * 0.13
    ctx.strokeStyle = color; ctx.lineWidth = isOk ? 2.5 : 1.8; ctx.lineCap = 'round'
    drawBracket(ctx, fx, fy, bLen, 'tl'); drawBracket(ctx, fx + fw, fy, bLen, 'tr')
    drawBracket(ctx, fx, fy + fh, bLen, 'bl'); drawBracket(ctx, fx + fw, fy + fh, bLen, 'br')

    const cxF = fx + fw / 2, cyF = fy + fh / 2
    ctx.strokeStyle = isOk ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cxF - 10, cyF); ctx.lineTo(cxF + 10, cyF)
    ctx.moveTo(cxF, cyF - 10); ctx.lineTo(cxF, cyF + 10)
    ctx.stroke()

    if (isOk) {
      scanYRef.current += 2.5
      if (scanYRef.current > fh + 40) scanYRef.current = -40
      const sy = fy + scanYRef.current
      const grad = ctx.createLinearGradient(0, sy - 30, 0, sy + 30)
      grad.addColorStop(0, 'rgba(34,197,94,0)'); grad.addColorStop(0.5, 'rgba(34,197,94,0.55)'); grad.addColorStop(1, 'rgba(34,197,94,0)')
      ctx.save(); ctx.beginPath(); roundedRect(ctx, fx, fy, fw, fh, 16); ctx.clip()
      ctx.fillStyle = grad; ctx.fillRect(fx, sy - 30, fw, 60); ctx.restore()
      ctx.fillStyle = 'rgba(34,197,94,0.07)'
      for (let gx = fx + 4; gx < fx + fw; gx += 22)
        for (let gy = fy + 4; gy < fy + fh; gy += 22)
          { ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI * 2); ctx.fill() }
    }
    ctx.strokeStyle = isOk ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1
    ctx.beginPath(); roundedRect(ctx, fx, fy, fw, fh, 16); ctx.stroke()
  }

  function drawBracket(ctx, x, y, len, corner) {
    const r = 5; ctx.beginPath()
    if (corner === 'tl') { ctx.moveTo(x + len, y); ctx.lineTo(x + r, y); ctx.arcTo(x, y, x, y + r, r); ctx.lineTo(x, y + len) }
    else if (corner === 'tr') { ctx.moveTo(x - len, y); ctx.lineTo(x - r, y); ctx.arcTo(x, y, x, y + r, r); ctx.lineTo(x, y + len) }
    else if (corner === 'bl') { ctx.moveTo(x, y - len); ctx.lineTo(x, y - r); ctx.arcTo(x, y, x + r, y, r); ctx.lineTo(x + len, y) }
    else { ctx.moveTo(x, y - len); ctx.lineTo(x, y - r); ctx.arcTo(x, y, x - r, y, r); ctx.lineTo(x - len, y) }
    ctx.stroke()
  }

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
  }

  const doCapture = useCallback(async () => {
    if (!faceOkRef.current) return
    setPhase('capturing')
    cancelAnimationFrame(rafRef.current)

    const video = videoRef.current
    const canvas = captureCanvasRef.current
    if (!video || !canvas) return

    canvas.width = 800; canvas.height = 800
    const ctx = canvas.getContext('2d')
    const size = Math.min(video.videoWidth, video.videoHeight)
    const sx = (video.videoWidth - size) / 2, sy = (video.videoHeight - size) / 2
    ctx.save(); ctx.translate(800, 0); ctx.scale(-1, 1)
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 800, 800); ctx.restore()

    canvas.toBlob(async (rawBlob) => {
      setFlash(true)
      setTimeout(() => setFlash(false), 350)
      setPhase('aligning')
      const { blob, eyePositions } = await alignFace(rawBlob)
      const record = await savePhoto(blob, null)
      if (eyePositions) await updatePhoto(record.id, { eyePositions })
      const newStreak = await getStreak()
      setStreak(newStreak)
      setTodayRecord({ ...record, eyePositions })
      setCapturedUrl(URL.createObjectURL(blob))
      await loadYearAgo()
      cleanup()
      setPhase('note')
    }, 'image/jpeg', 0.88)
  }, [])

  async function handleNoteSave({ mood, note }) {
    if (todayRecord && (mood || note)) {
      await updatePhoto(toDateId(new Date()), { mood, note })
      setTodayRecord(r => ({ ...r, mood, note }))
    }
    setPhase('done')
    onCaptureDone?.()
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (phase === 'note') {
    return <NoteModal onSave={handleNoteSave} onSkip={() => { setPhase('done'); onCaptureDone?.() }} />
  }

  if (phase === 'already' || phase === 'done') {
    return (
      <>
        <AlreadyCaptured
          photo={todayRecord}
          capturedUrl={capturedUrl}
          yearAgoUrl={yearAgoUrl}
          streak={streak}
          verdict={verdict}
          onCompare={() => setShowComparison(true)}
        />
        {showComparison && todayRecord && (
          <ComparisonSlider basePhoto={todayRecord} onClose={() => setShowComparison(false)} />
        )}
      </>
    )
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
      <video ref={videoRef} playsInline muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
      <canvas ref={overlayRef} className="absolute inset-0 w-full h-full" />
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* Flash blanc à la capture */}
      {flash && (
        <div className="absolute inset-0 bg-white z-10 animate-fade-out pointer-events-none" />
      )}

      {(phase === 'init' || phase === 'loading') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black">
          <div className="w-8 h-8 border border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/40 text-xs tracking-widest uppercase">Initialisation</p>
          <p className="text-white/20 text-[10px]">Le beau gosse se prépare...</p>
        </div>
      )}

      {(phase === 'capturing' || phase === 'aligning') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
          <div className="w-8 h-8 border border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/50 text-xs tracking-widest uppercase">
            {phase === 'aligning' ? alignMsg : 'Capture…'}
          </p>
        </div>
      )}

      {phase === 'ready' && (
        <>
          <div className="absolute top-6 inset-x-0 flex flex-col items-center gap-2 pointer-events-none">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${faceOk ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`} />
              <p className={`text-[11px] tracking-[0.25em] uppercase font-light transition-colors duration-300 ${faceOk ? 'text-green-400' : 'text-white/50'}`}>
                {faceOk ? faceMsg : 'Scan facial'}
              </p>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur rounded-full px-3 py-1">
                <span className="text-orange-400 text-xs">🔥</span>
                <span className="text-white/80 text-xs">{streak} jour{streak > 1 ? 's' : ''} — {streakLabel(streak)}</span>
              </div>
            )}
          </div>

          <div className="absolute bottom-10 inset-x-0 flex flex-col items-center gap-4">
            <button onClick={doCapture} disabled={!faceOk} className="relative w-24 h-24 flex items-center justify-center">
              <svg className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${faceOk ? 'opacity-100 animate-spin' : 'opacity-0'}`}
                style={{ animationDuration: '5s' }} viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="46" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="10 7" strokeLinecap="round" />
              </svg>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="38" fill="none"
                  stroke={faceOk ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.12)'} strokeWidth="1"
                  style={{ transition: 'stroke 0.3s' }} />
              </svg>
              <div className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300
                ${faceOk ? 'bg-white shadow-[0_0_24px_rgba(34,197,94,0.5)]' : 'bg-white/8 border border-white/15'}`}>
                <FaceIcon active={faceOk} />
              </div>
            </button>
            <p className={`text-[11px] tracking-[0.2em] uppercase transition-colors duration-300 ${faceOk ? 'text-green-400' : 'text-white/30'}`}>
              {faceOk ? captureMsg : 'Centre ton visage'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function FaceIcon({ active }) {
  const c = active ? '#000000' : 'rgba(255,255,255,0.35)'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7c0-2.2 1.8-4 4-4h10c2.2 0 4 1.8 4 4v10c0 2.2-1.8 4-4 4H7c-2.2 0-4-1.8-4-4V7z" />
      <circle cx="9" cy="10" r="1" fill={c} stroke="none" />
      <circle cx="15" cy="10" r="1" fill={c} stroke="none" />
      <path d="M9 15.5q3 2 6 0" />
    </svg>
  )
}

function AlreadyCaptured({ photo, capturedUrl, yearAgoUrl, streak, verdict, onCompare }) {
  const ricard = ricardScore(streak)

  return (
    <div className="flex flex-col items-center gap-5 px-6 py-8 h-full overflow-y-auto overscroll-none">
      {/* Streak */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <span className="text-orange-400 text-2xl">🔥</span>
          <span className="text-white text-2xl font-bold">{streak}</span>
          <span className="text-white/50 text-sm">jour{streak > 1 ? 's' : ''}</span>
        </div>
        <p className="text-white/30 text-xs">{streakLabel(streak)}</p>
        {ricard && (
          <p className="text-amber-400/70 text-[10px] mt-0.5">🥃 {ricard} Ricard{ricard > 1 ? 's' : ''} de beauté</p>
        )}
      </div>

      {/* Today's photo */}
      <div className="w-full max-w-xs aspect-square rounded-2xl overflow-hidden relative">
        {capturedUrl && <img src={capturedUrl} alt="Aujourd'hui" className="w-full h-full object-cover animate-fade-in" />}
        {photo?.mood && (
          <div className="absolute top-2 right-2 text-2xl bg-black/40 rounded-full w-10 h-10 flex items-center justify-center">
            {photo.mood}
          </div>
        )}
        {/* Verdict badge */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
          <p className="text-white/80 text-xs text-center italic">{verdict}</p>
        </div>
      </div>

      <p className="text-white/30 text-[10px] uppercase tracking-widest">Aujourd'hui · Photo enregistrée</p>

      {/* Note */}
      {photo?.note && (
        <p className="text-white/50 text-sm text-center max-w-xs italic">"{photo.note}"</p>
      )}

      {/* Compare button */}
      <button
        onClick={onCompare}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/15 text-white/60 text-sm active:bg-white/10 transition-colors"
      >
        <span>⇄</span> Comparer avec le passé
      </button>

      {/* Year ago */}
      {yearAgoUrl && (
        <>
          <div className="w-full max-w-xs h-px bg-white/10" />
          <p className="text-white/25 text-[10px] uppercase tracking-widest">Toi il y a 1 an 👀</p>
          <div className="w-full max-w-xs aspect-square rounded-2xl overflow-hidden">
            <img src={yearAgoUrl} alt="Il y a 1 an" className="w-full h-full object-cover" />
          </div>
        </>
      )}
    </div>
  )
}
