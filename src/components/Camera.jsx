import { useRef, useEffect, useState, useCallback } from 'react'
import { initFaceDetector, detectForVideo, analyzeFace } from '../lib/faceDetection'
import { alignFace } from '../lib/faceAlignment'
import { savePhoto, getTodayPhoto, getPhotoByDate, getStreak, updatePhoto, getAllPhotos, getPhotosForYear, toDateId } from '../lib/db'
import ComparisonSlider from './ComparisonSlider'
import Confetti from './Confetti'
import { pick, FACE_DETECTED, CAPTURE_BTN, VERDICTS, ALIGNING, streakLabel, ricardScore, annualVerdict } from '../lib/beauf'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useCountUp, useTypewriter } from '../lib/hooks'

export default function Camera({ onCaptureDone }) {
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const captureCanvasRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const rafRef = useRef(null)
  const scanYRef = useRef(0)
  const faceOkRef = useRef(false)
  const brightnessCanvasRef = useRef(null)
  const frameCountRef = useRef(0)
  const flashEnabledRef = useRef(false)
  const torchSupportedRef = useRef(false)

  // phase: init | loading | ready | capturing | aligning | note | done | already | error
  const [phase, setPhase] = useState('init')
  const [faceOk, setFaceOk] = useState(false)
  const [streak, setStreak] = useState(0)
  const [todayRecord, setTodayRecord] = useState(null)
  const [capturedUrl, setCapturedUrl] = useState(null)
  const [yearAgoUrl, setYearAgoUrl] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showComparison, setShowComparison] = useState(false)
  const [justCaptured, setJustCaptured] = useState(false)
  const [flash, setFlash] = useState(false)
  const [screenFlash, setScreenFlash] = useState(false)
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [isDark, setIsDark] = useState(false)
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
      const track = stream.getVideoTracks()[0]
      const caps = track?.getCapabilities?.()
      const hasTorch = !!caps?.torch
      torchSupportedRef.current = hasTorch
      setTorchSupported(hasTorch)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      brightnessCanvasRef.current = document.createElement('canvas')
      brightnessCanvasRef.current.width = 32
      brightnessCanvasRef.current.height = 32
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
      frameCountRef.current++
      if (frameCountRef.current % 45 === 0 && brightnessCanvasRef.current) {
        const bc = brightnessCanvasRef.current
        const bctx = bc.getContext('2d')
        bctx.drawImage(video, 0, 0, 32, 32)
        const d = bctx.getImageData(0, 0, 32, 32).data
        let s = 0
        for (let i = 0; i < d.length; i += 4) s += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
        setIsDark((s / (d.length / 4)) < 55)
      }
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
    const fx = (W - fw) / 2, fy = (H - fh) / 2

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

  async function toggleFlash() {
    const next = !flashEnabledRef.current
    flashEnabledRef.current = next
    setFlashEnabled(next)
    if (torchSupportedRef.current) {
      const track = streamRef.current?.getVideoTracks()[0]
      try { await track?.applyConstraints({ advanced: [{ torch: next }] }) } catch (_) {}
    }
  }

  const doCapture = useCallback(async () => {
    if (!faceOkRef.current) return
    setPhase('capturing')
    cancelAnimationFrame(rafRef.current)

    // Screen flash : illumine la scène si torch non supporté
    if (flashEnabledRef.current && !torchSupportedRef.current) {
      setScreenFlash(true)
      await new Promise(r => setTimeout(r, 250))
    }

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
      setScreenFlash(false)
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
      setJustCaptured(true)
      setTimeout(() => setJustCaptured(false), 3500)
      setPhase('done')
      onCaptureDone?.()
    }, 'image/jpeg', 0.88)
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────────

  if (phase === 'already' || phase === 'done') {
    return (
      <>
        <Confetti active={justCaptured} />
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

      {/* Screen flash : illumine avant capture (quand torch non dispo) */}
      {screenFlash && (
        <div className="absolute inset-0 bg-white z-20 pointer-events-none" />
      )}

      {/* Flash blanc post-capture */}
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
          {/* Bouton flash */}
          <button
            onClick={toggleFlash}
            className={`absolute top-5 right-5 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all
              ${flashEnabled
                ? 'bg-yellow-400 text-black shadow-[0_0_16px_rgba(250,204,21,0.6)]'
                : isDark
                  ? 'bg-white/15 text-yellow-300 animate-pulse'
                  : 'bg-white/8 text-white/40'
              }`}
          >
            <FlashIcon />
          </button>

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
              {faceOk && <>
                <span className="absolute inset-0 rounded-full border-2 border-green-400/40 animate-ping" style={{ animationDuration: '1.2s' }} />
                <span className="absolute inset-[-12px] rounded-full border border-green-400/20 animate-ping" style={{ animationDuration: '1.8s', animationDelay: '0.3s' }} />
              </>}
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

function FlashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L4.09 12.96A1 1 0 0 0 5 14.5h5.5L11 22l8.91-10.96A1 1 0 0 0 19 9.5H13.5L13 2z" />
    </svg>
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
  const [yearCount, setYearCount] = useState(0)
  const [last7, setLast7] = useState([])
  const ricard = ricardScore(streak)
  const now = new Date()
  const totalDays = (now.getFullYear() % 4 === 0) ? 366 : 365
  const pct = yearCount ? Math.round((yearCount / totalDays) * 100) : 0

  const animStreak = useCountUp(streak)
  const animYear = useCountUp(yearCount)
  const animVerdict = useTypewriter(verdict, 32)
  const verdictDone = animVerdict.length === verdict.length

  useEffect(() => {
    const year = now.getFullYear()
    getPhotosForYear(year).then(p => setYearCount(p.length))
    getAllPhotos().then(photos => {
      const ids = new Set(photos.map(p => p.id))
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        days.push({ d, ok: ids.has(toDateId(d)), isToday: i === 0 })
      }
      setLast7(days)
    })
  }, [])

  const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

  return (
    <div className="flex flex-col h-full overflow-y-auto overscroll-none pb-8">

      {/* Date header */}
      <div className="px-5 pt-5 pb-3">
        <p className="text-white/25 text-xs uppercase tracking-widest">
          {format(now, 'EEEE d MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Photo + verdict */}
      <div className="px-5">
        <div className="relative rounded-3xl overflow-hidden aspect-square w-full">
          {capturedUrl && (
            <img src={capturedUrl} alt="Aujourd'hui" className="w-full h-full object-cover animate-fade-in" />
          )}
          {photo?.mood && (
            <div className="absolute top-3 right-3 text-2xl bg-black/50 backdrop-blur rounded-full w-10 h-10 flex items-center justify-center">
              {photo.mood}
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-4 pt-8 pb-4">
            <p className="text-white/90 text-sm italic text-center min-h-[1.25rem]">
              {animVerdict}
              {!verdictDone && <span className="animate-pulse opacity-70">▌</span>}
            </p>
            {photo?.note && (
              <p className="text-white/50 text-xs text-center mt-1">"{photo.note}"</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-5 pt-4 grid grid-cols-2 gap-3">
        {/* Streak card */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/8">
          <div className="flex items-baseline gap-1.5">
            <span className="text-orange-400 text-xl">🔥</span>
            <span className="text-white text-3xl font-bold tabular-nums">{animStreak}</span>
          </div>
          <p className="text-white/40 text-xs mt-1">jours de suite</p>
          <p className="text-white/25 text-[10px] mt-0.5">{streakLabel(streak)}</p>
          {ricard && <p className="text-amber-400/60 text-[9px] mt-1">🥃 ×{ricard}</p>}
        </div>

        {/* Annual card */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/8">
          <div className="flex items-baseline gap-1.5">
            <span className="text-blue-400 text-xl">📅</span>
            <span className="text-white text-3xl font-bold tabular-nums">{animYear}</span>
          </div>
          <p className="text-white/40 text-xs mt-1">cette année</p>
          <p className="text-white/25 text-[10px] mt-0.5">{pct}% des jours</p>
        </div>
      </div>

      {/* Annual progress bar */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/30 text-[10px] uppercase tracking-widest">Progression {now.getFullYear()}</p>
          <p className="text-white/30 text-[10px]">{yearCount}/{totalDays}</p>
        </div>
        <div className="h-2 bg-white/8 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: pct >= 80 ? 'linear-gradient(90deg,#f97316,#ef4444)'
                        : pct >= 50 ? 'linear-gradient(90deg,#3b82f6,#8b5cf6)'
                        : 'linear-gradient(90deg,#6b7280,#9ca3af)'
            }}
          />
        </div>
        <p className="text-white/40 text-[11px] mt-2 text-right italic">{annualVerdict(pct)}</p>
      </div>

      {/* Last 7 days */}
      {last7.length > 0 && (
        <div className="px-5 pt-5">
          <p className="text-white/25 text-[10px] uppercase tracking-widest mb-3">7 derniers jours</p>
          <div className="flex gap-2 justify-between">
            {last7.map(({ d, ok, isToday }, i) => (
              <div
                key={d.toISOString()}
                className="flex flex-col items-center gap-1.5 flex-1 animate-fade-in"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both', opacity: 0 }}
              >
                <p className="text-white/30 text-[9px] uppercase">{DAY_LABELS[d.getDay()]}</p>
                <div className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all
                  ${isToday ? 'ring-1 ring-white/40' : ''}
                  ${ok ? 'bg-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'bg-white/5'}`}>
                  <span className={`text-sm ${ok ? 'text-green-400' : 'text-white/15'}`}>{ok ? '✓' : '·'}</span>
                </div>
                <p className={`text-[9px] ${isToday ? 'text-white/60' : 'text-white/20'}`}>{d.getDate()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compare button */}
      <div className="px-5 pt-5">
        <button
          onClick={onCompare}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-white/12 text-white/60 text-sm active:bg-white/8 transition-colors"
        >
          ⇄ Comparer avec le passé
        </button>
      </div>

      {/* Year ago */}
      {yearAgoUrl && (
        <div className="px-5 pt-5">
          <p className="text-white/25 text-[10px] uppercase tracking-widest mb-3">Toi il y a 1 an 👀</p>
          <div className="rounded-3xl overflow-hidden aspect-square w-full">
            <img src={yearAgoUrl} alt="Il y a 1 an" className="w-full h-full object-cover" />
          </div>
        </div>
      )}
    </div>
  )
}
