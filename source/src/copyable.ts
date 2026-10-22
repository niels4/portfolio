/** A click that ends a text selection inside a copyable link (the email) keeps the selection instead of following the link. */
export function initCopyableLinks(): void {
  for (const link of document.querySelectorAll<HTMLAnchorElement>("a[data-copyable]")) {
    link.addEventListener("click", (event) => {
      const selection = window.getSelection()
      if (selection && !selection.isCollapsed && link.contains(selection.anchorNode)) {
        event.preventDefault()
      }
    })
  }
}
