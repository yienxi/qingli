export function initAmbientCanvas({ enabled = true } = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!enabled || reduceMotion) return null

  const canvas = document.createElement('canvas')
  canvas.className = 'ambient-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.prepend(canvas)

  const ctx = canvas.getContext('2d')
  const particles = []
  let width = 0
  let height = 0
  let rafId = null

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    width = window.innerWidth
    height = window.innerHeight
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const targetCount = width < 640 ? 18 : 42
    particles.length = 0
    for (let i = 0; i < targetCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1 + Math.random() * 2.2,
        vx: -0.08 + Math.random() * 0.16,
        vy: 0.04 + Math.random() * 0.12,
        alpha: 0.08 + Math.random() * 0.16,
      })
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height)
    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      if (p.y > height + 12) p.y = -12
      if (p.x < -12) p.x = width + 12
      if (p.x > width + 12) p.x = -12

      ctx.beginPath()
      ctx.fillStyle = `rgba(47, 102, 208, ${p.alpha})`
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    rafId = window.requestAnimationFrame(draw)
  }

  resize()
  draw()

  let hidden = false
  function onVisibilityChange() {
    if (document.hidden) {
      hidden = true
      if (rafId) window.cancelAnimationFrame(rafId)
    } else if (hidden) {
      hidden = false
      draw()
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  window.addEventListener('resize', resize, { passive: true })

  return {
    destroy() {
      if (rafId) window.cancelAnimationFrame(rafId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('resize', resize)
      canvas.remove()
    },
  }
}

