import { reducedMotion } from "./dom.ts"
import { type Palette, canvasById, fit, readPalette } from "./plot.ts"

const canvas = canvasById("hero-canvas")

type Params = { px: number; py: number }
const rest: Params = { px: 0, py: 0 }
const now: Params = { ...rest }
const target: Params = { ...rest }

let palette: Palette | undefined
// The pointer in the canvas's CSS pixels, while a mouse is over the hero; the lens sits exactly under it.
let pointer: { x: number; y: number } | undefined
// The wave handle's x in plot units: under the pointer while there is one, else easing back to its drift.
let handleX = 1.5
const handleRest = (): number => 1.5 + now.px * 3.2
let raf = 0
let visible = true
let loopTime = 0

// How far the plot has drawn in, 0 to 1. Motion animates it with the hero's reveal; without motion it stays drawn.
let intro = 1

const UNITS_Y = 13 // math units from the top to the bottom edge

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
const easeOut = (t: number): number => 1 - (1 - t) ** 3
const easeInOut = (t: number): number => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
/** The part of the intro between `start` and `start + length`, as 0 to 1. */
const stage = (start: number, length: number): number => clamp01((intro - start) / length)

/** Set how far the plot has drawn in and redraw. */
export function setHeroIntro(value: number): void {
  intro = value
  draw()
}

function draw(): void {
  const { ctx, w, h, dpr } = fit(canvas)
  palette ??= readPalette()
  const p = palette
  // The plot sits behind the words in any window: a tall one's hero is only as tall as its words (style.css).
  const s = h / UNITS_Y // pixels per unit
  const ox = w * 0.64
  const oy = h * 0.54
  const toX = (x: number): number => ox + x * s
  const toY = (y: number): number => oy - y * s

  ctx.clearRect(0, 0, w, h)

  // Grid: minor lines every unit, major every five.
  const x0 = Math.floor(-ox / s)
  const x1 = Math.ceil((w - ox) / s)
  const y0 = Math.floor(-(h - oy) / s)
  const y1 = Math.ceil(oy / s)
  const gridLines = (color: string, alpha: number): void => {
    ctx.strokeStyle = color
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = x0; x <= x1; x++) {
      const px = Math.round(toX(x)) + 0.5
      ctx.moveTo(px, 0)
      ctx.lineTo(px, h)
    }
    for (let y = y0; y <= y1; y++) {
      const py = Math.round(toY(y)) + 0.5
      ctx.moveTo(0, py)
      ctx.lineTo(w, py)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  // The intro: the grid fades in, the axes grow out from the origin, the curves draw left to right one
  // after another, and the handle appears last.
  gridLines(p.grid, 0.55 * easeOut(stage(0, 0.35)))

  // Pointer lens: the grid brightens under the pointer.
  if (pointer) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(pointer.x, pointer.y, 150, 0, Math.PI * 2)
    ctx.clip()
    gridLines(p.gridMajor, 0.9)
    ctx.restore()
  }

  // Axes and ticks, out to how far the axes have grown.
  const grow = easeOut(stage(0.05, 0.4))
  const left = ox - ox * grow
  const right = ox + (w - ox) * grow
  const top = oy - oy * grow
  const bottom = oy + (h - oy) * grow
  ctx.strokeStyle = p.axis
  ctx.lineWidth = 1.25
  ctx.globalAlpha = 0.8
  ctx.beginPath()
  ctx.moveTo(left, Math.round(oy) + 0.5)
  ctx.lineTo(right, Math.round(oy) + 0.5)
  ctx.moveTo(Math.round(ox) + 0.5, top)
  ctx.lineTo(Math.round(ox) + 0.5, bottom)
  for (let x = x0; x <= x1; x++) {
    const px = Math.round(toX(x)) + 0.5
    if (px >= left && px <= right) {
      ctx.moveTo(px, oy - 4)
      ctx.lineTo(px, oy + 4)
    }
  }
  for (let y = y0; y <= y1; y++) {
    const py = Math.round(toY(y)) + 0.5
    if (py >= top && py <= bottom) {
      ctx.moveTo(ox - 4, py)
      ctx.lineTo(ox + 4, py)
    }
  }
  ctx.stroke()
  ctx.globalAlpha = 1

  const amp = 2.4 + now.py * 0.9
  const k = 0.85 + now.px * 0.22
  const wave = (x: number): number => amp * Math.sin(k * x)
  const waveRest = (x: number): number => 2.4 * Math.sin(0.85 * x)
  const parab = (x: number): number => (0.1 + now.py * 0.03) * (x - now.px * 2) ** 2 - 4.2
  const parabRest = (x: number): number => 0.1 * x * x - 4.2
  const cubic = (x: number): number => (0.035 + now.px * 0.008) * x ** 3 - 0.35 * x

  /** Stroke a curve from the left edge across `drawn` (0 to 1) of the width. */
  const trace = (fn: (x: number) => number, drawn = 1): void => {
    if (drawn <= 0) {
      return
    }
    const end = -2 + (w + 4) * drawn
    ctx.beginPath()
    for (let px = -2; px <= end; px += 2) {
      const x = (px - ox) / s
      const y = toY(fn(x))
      if (px === -2) {
        ctx.moveTo(px, y)
      } else {
        ctx.lineTo(px, y)
      }
    }
    ctx.stroke()
  }

  // Dashed originals, as in the app: the curves stretch over them.
  ctx.setLineDash([5, 6])
  ctx.lineWidth = 1.25
  ctx.globalAlpha = 0.45
  const waveDrawn = easeInOut(stage(0.2, 0.5))
  const parabDrawn = easeInOut(stage(0.32, 0.5))
  const cubicDrawn = easeInOut(stage(0.44, 0.5))
  ctx.strokeStyle = p.line
  trace(waveRest, waveDrawn)
  ctx.strokeStyle = p.accent
  trace(parabRest, parabDrawn)
  ctx.setLineDash([])
  ctx.globalAlpha = 1

  ctx.lineJoin = "round"
  ctx.shadowColor = p.glow
  ctx.shadowBlur = 14
  ctx.lineWidth = 2.5
  ctx.strokeStyle = p.line
  trace(wave, waveDrawn)
  ctx.lineWidth = 2
  ctx.strokeStyle = p.accent
  trace(parab, parabDrawn)
  ctx.strokeStyle = p.accent2
  ctx.globalAlpha = 0.85
  trace(cubic, cubicDrawn)
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0

  // A handle riding the wave under the pointer, with a guide to the axis.
  if (pointer) {
    handleX = (pointer.x - ox) / s
  }
  const hx = handleX
  const hy = wave(hx)
  const shown = easeOut(stage(0.85, 0.15))
  if (shown <= 0) {
    return
  }
  const cx = toX(hx)
  const cy = toY(hy)
  // The guide drops from the point to the axis in light pink dashes with a pink glow, the pattern starting at the point.
  // Canvas shadows ignore the transform, so their blur is scaled to the device pixels here and below.
  ctx.globalAlpha = shown
  ctx.strokeStyle = p.pointGuide
  ctx.lineWidth = 1.25
  ctx.shadowColor = p.point
  ctx.shadowBlur = 5 * dpr
  ctx.setLineDash([6, 3])
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx, oy)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.shadowBlur = 0
  // A neon point: a pink glow (a wide halo under a tight one), the dot, then a pale rim.
  const halo = (radius: number, alpha: number): void => {
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    glow.addColorStop(0, p.point)
    glow.addColorStop(1, p.pointFade)
    ctx.globalAlpha = shown * alpha
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  halo(46, 0.45)
  halo(20, 0.7)
  ctx.globalAlpha = shown
  ctx.beginPath()
  ctx.arc(cx, cy, 7, 0, Math.PI * 2)
  ctx.fillStyle = p.point
  ctx.shadowColor = p.point
  ctx.shadowBlur = 8 * dpr
  ctx.fill()
  ctx.strokeStyle = p.pointRim
  ctx.lineWidth = 1.25
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
}

function frame(): void {
  raf = 0
  if (!visible) {
    return
  }
  const coarse = matchMedia("(pointer: coarse)").matches
  if (coarse) {
    loopTime += 1 / 60
    target.px = Math.sin(loopTime * 0.35) * 0.8
    target.py = Math.cos(loopTime * 0.27) * 0.6
  }
  now.px += (target.px - now.px) * 0.08
  now.py += (target.py - now.py) * 0.08
  if (!pointer) {
    handleX += (handleRest() - handleX) * 0.08
  }
  draw()
  const settled =
    Math.abs(target.px - now.px) < 0.002 &&
    Math.abs(target.py - now.py) < 0.002 &&
    (pointer !== undefined || Math.abs(handleRest() - handleX) < 0.002)
  if (settled && !coarse) {
    now.px = target.px
    now.py = target.py
    if (!pointer) {
      handleX = handleRest()
    }
    draw()
  }
  if (coarse || !settled) {
    raf = requestAnimationFrame(frame)
  }
}

function kick(): void {
  if (!raf) {
    raf = requestAnimationFrame(frame)
  }
}

export function initHero(): void {
  const section = canvas.closest("section")
  if (!section) {
    return
  }
  const still = reducedMotion()
  draw()

  new ResizeObserver(() => draw()).observe(canvas)

  if (still) {
    return
  }

  section.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") {
      return
    }
    const rect = canvas.getBoundingClientRect()
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    target.px = ((event.clientX - rect.left) / rect.width) * 2 - 1
    target.py = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    kick()
  })
  section.addEventListener("pointerleave", () => {
    pointer = undefined
    kick()
    if (!matchMedia("(pointer: coarse)").matches) {
      target.px = rest.px
      target.py = rest.py
      kick()
    }
  })
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting)
    if (visible && matchMedia("(pointer: coarse)").matches) {
      kick()
    }
  }).observe(canvas)
  if (matchMedia("(pointer: coarse)").matches) {
    kick()
  }
}
