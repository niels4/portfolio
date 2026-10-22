import { gsap } from "gsap"
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "gsap/SplitText"

import { setHeroIntro } from "./hero.ts"

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin)

const IDS = ["top", "protectwise", "math-viz", "text-relay", "contact"]

/** Keep the nav and the address in step with the view the reader is in. The address never gains a history entry. */
function trackViews(): { ready: () => void } {
  let current = ""
  let isReady = false
  const links = new Map<string, HTMLAnchorElement>()
  for (const a of document.querySelectorAll<HTMLAnchorElement>(".site-nav a")) {
    links.set(a.getAttribute("href")?.slice(1) ?? "", a)
  }
  const mark = (id: string): void => {
    for (const [key, a] of links) {
      if (key === id) {
        a.setAttribute("aria-current", "true")
      } else {
        a.removeAttribute("aria-current")
      }
    }
    current = id
    if (isReady && location.hash !== `#${id}`) {
      history.replaceState(null, "", `#${id}`)
    }
  }
  for (const id of IDS) {
    ScrollTrigger.create({
      trigger: `#${id}`,
      start: "top 50%",
      end: "bottom 50%",
      onToggle: (self) => {
        if (self.isActive) {
          mark(id)
        }
      },
    })
  }
  return {
    ready: () => {
      isReady = true
      if (current) {
        mark(current)
      }
    },
  }
}

/**
 * The hero's reveal, which plays on load: the headline rises word by word, the plot draws in and the rest
 * fades up. It reverses when the hero leaves and replays on the way back.
 */
function revealHero(): void {
  const view = document.getElementById("top")
  if (!view) {
    return
  }
  const items = view.querySelectorAll("[data-reveal]")
  const tl = gsap.timeline({ paused: true })
  // CSS hides [data-reveal] before this runs; from() needs the visible state as its end value.
  gsap.set(items, { opacity: 1 })

  const title = view.querySelector<HTMLElement>(".hero-title")
  if (title) {
    gsap.set(title, { opacity: 1 })
    const split = SplitText.create(title, { type: "words", mask: "words" })
    // Each mask clips at the line box, which the tight line height puts above descenders (the g in
    // "glance"). Extend the clip below the line without moving the layout.
    gsap.set(split.masks, { paddingBottom: "0.25em", marginBottom: "-0.25em" })
    tl.from(split.words, { yPercent: 135, duration: 0.8, ease: "power3.out", stagger: 0.08 })
  }
  // The plot draws itself in alongside the headline (hero.ts splits the progress into stages).
  const plot = { p: 0 }
  setHeroIntro(0) // start undrawn: fromTo's first render runs no onUpdate
  tl.fromTo(plot, { p: 0 }, { p: 1, duration: 2.4, ease: "none", onUpdate: () => setHeroIntro(plot.p) }, 0)
  tl.from(items, { opacity: 0, y: 24, duration: 0.6, ease: "power2.out", stagger: 0.1 }, 0.3)

  ScrollTrigger.create({
    trigger: view,
    start: "top 70%",
    end: "bottom 30%",
    // The first play waits for the fonts, so the headline never animates in a fallback face.
    onEnter: () => void document.fonts.ready.then(() => tl.play()),
    onEnterBack: () => tl.play(),
    onLeave: () => tl.reverse(),
    onLeaveBack: () => tl.reverse(),
  })
}

/**
 * Everything below the hero fades up as it comes into view and out as it leaves, each piece by its own
 * position, so the reader sees it play. A whole view's trigger fired while its centered content was still
 * below the screen. Pieces that enter together are staggered.
 */
function revealContent(): void {
  const items = gsap.utils.toArray<HTMLElement>("main section:not(#top) [data-reveal]")
  gsap.set(items, { opacity: 0, y: 24 })
  const show = (batch: Element[]): void => {
    gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.1, overwrite: true })
  }
  const hide =
    (y: number) =>
    (batch: Element[]): void => {
      gsap.to(batch, { opacity: 0, y, duration: 0.4, ease: "power2.in", overwrite: true })
    }
  ScrollTrigger.batch(items, {
    start: "top 90%",
    end: "bottom 10%",
    onEnter: show,
    onEnterBack: show,
    onLeave: hide(-24),
    onLeaveBack: hide(24),
  })

  // The line through the math-viz build steps draws in as the steps arrive.
  const draw = document.querySelector(".steps-line path")
  if (draw) {
    gsap.from(draw, {
      drawSVG: "0%",
      duration: 1.1,
      ease: "power2.inOut",
      scrollTrigger: {
        trigger: draw.closest("svg") ?? draw,
        start: "top 90%",
        end: "bottom 10%",
        toggleActions: "play reverse play reverse",
      },
    })
  }
}

export function initMotion(): void {
  const mm = gsap.matchMedia()
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    document.documentElement.classList.add("motion")
    revealHero()
    revealContent()
    return () => document.documentElement.classList.remove("motion")
  })
  // Tracking the current view needs no motion, so it runs in both modes.
  const tracker = trackViews()

  // The first scroll position is only known once fonts and images have settled the layout. Until then
  // the address is left alone, so a direct link is not overwritten by the hero at scroll position 0.
  const start = async (): Promise<void> => {
    await document.fonts.ready
    if (document.readyState !== "complete") {
      await new Promise((resolve) => window.addEventListener("load", resolve, { once: true }))
    }
    const target = document.getElementById(location.hash.slice(1))
    if (target && IDS.includes(target.id)) {
      target.scrollIntoView({ behavior: "instant" })
    }
    ScrollTrigger.refresh()
    tracker.ready()
    document.documentElement.classList.add("settled")
  }
  void start()
}
