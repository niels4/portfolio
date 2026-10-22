import { must } from "./dom.ts"

/** The poster (a 1080p frame of the video, in images/) loads at once; the YouTube player only after a click, so the first load stays light. */
export function initVideo(): void {
  const facade = must<HTMLElement>(".video-facade")
  const button = must<HTMLButtonElement>(".video-play", facade)
  button.addEventListener("click", () => {
    const id = facade.dataset["videoId"] ?? ""
    const frame = document.createElement("iframe")
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&rel=0`
    frame.title = "ProtectWise interface video"
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"
    frame.referrerPolicy = "strict-origin-when-cross-origin"
    frame.allowFullscreen = true
    button.replaceWith(frame)
    frame.focus()
  })
}

const VIEWER_URL = "https://niels4.github.io/math-viz/#function-viewer"

/**
 * Wide screens get the live Function Viewer in a lazy iframe; phones keep the screenshot. A shield covers the
 * frame so the wheel scrolls the page; a click lifts it, and it returns when the pointer leaves the frame.
 */
export function initViewer(): void {
  const slot = must<HTMLElement>("#viewer-frame")
  const wide = matchMedia("(min-width: 900px)")
  const mount = (): void => {
    if (!wide.matches || slot.querySelector("iframe")) {
      return
    }
    const frame = document.createElement("iframe")
    frame.src = VIEWER_URL
    frame.loading = "lazy"
    frame.title = "math-viz Function Viewer, live: drag a curve or its handles"
    frame.referrerPolicy = "strict-origin-when-cross-origin"

    const shield = document.createElement("button")
    shield.type = "button"
    shield.className = "viewer-shield"
    shield.setAttribute("aria-label", "Use the Function Viewer")
    const hint = document.createElement("span")
    hint.setAttribute("aria-hidden", "true")
    hint.textContent = "Click to use the viewer"
    shield.append(hint)
    shield.addEventListener("click", () => {
      slot.classList.add("viewer-active")
      frame.focus()
    })
    slot.addEventListener("mouseleave", () => slot.classList.remove("viewer-active"))

    slot.append(frame, shield)
  }
  mount()
  wide.addEventListener("change", mount)
}
