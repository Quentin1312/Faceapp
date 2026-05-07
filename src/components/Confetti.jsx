import { useEffect, useRef } from 'react'

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#eab308', '#ec4899', '#ffffff']

export default function Confetti({ active }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')

    const particles = Array.from({ length: 90 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 60,
      y: canvas.height * 0.38,
      vx: (Math.random() - 0.5) * 16,
      vy: Math.random() * -18 - 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      w: Math.random() * 10 + 4,
      h: Math.random() * 5 + 3,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 12,
      gravity: 0.45,
      alpha: 1,
    }))

    let raf
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += p.gravity
        p.vx *= 0.99
        p.rot += p.rotV
        p.alpha -= 0.012
        if (p.alpha <= 0) return
        alive = true
        ctx.save()
        ctx.globalAlpha = Math.max(p.alpha, 0)
        ctx.fillStyle = p.color
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })
      if (alive) raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [active])

  if (!active) return null
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-40 pointer-events-none"
    />
  )
}
