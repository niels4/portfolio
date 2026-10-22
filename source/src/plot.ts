import { must } from "./dom.ts"

export type Palette = {
  background: string
  grid: string
  gridMajor: string
  axis: string
  line: string
  accent: string
  accent2: string
  glow: string
  point: string
  pointRim: string
  pointFade: string
  pointGuide: string
}

let probe: HTMLElement | undefined

/** Resolve a custom property to a color string a canvas understands, whatever notation the palette uses. */
function resolve(name: string): string {
  if (!probe) {
    probe = document.createElement("span")
    probe.setAttribute("aria-hidden", "true")
    probe.style.display = "none"
    document.body.append(probe)
  }
  probe.style.color = `var(${name})`
  return getComputedStyle(probe).color
}

export function readPalette(): Palette {
  return {
    background: resolve("--background-muted"),
    grid: resolve("--chart-grid"),
    gridMajor: resolve("--chart-grid-major"),
    axis: resolve("--chart-axis"),
    line: resolve("--chart-line"),
    accent: resolve("--chart-accent"),
    accent2: resolve("--chart-accent-2"),
    glow: resolve("--chart-glow"),
    point: resolve("--chart-point"),
    pointRim: resolve("--chart-point-rim"),
    pointFade: resolve("--chart-point-fade"),
    pointGuide: resolve("--chart-point-guide"),
  }
}

export type Surface = { ctx: CanvasRenderingContext2D; w: number; h: number; dpr: number }

/** Size the canvas backing store to its CSS box at the device pixel ratio and return a CSS-pixel context. */
export function fit(canvas: HTMLCanvasElement): Surface {
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.max(1, Math.round(rect.width))
  const h = Math.max(1, Math.round(rect.height))
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Canvas 2D is unavailable")
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, w, h, dpr }
}

export const canvasById = (id: string): HTMLCanvasElement => must<HTMLCanvasElement>(`#${id}`)
