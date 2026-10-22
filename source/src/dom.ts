// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- the type is the caller's assertion about the markup
export function must<T extends Element>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector)
  if (!el) {
    throw new Error(`Missing element: ${selector}`)
  }
  return el
}

export const reducedMotion = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches
