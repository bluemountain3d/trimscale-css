// Shows the current px value of each fluid token next to it, measured from
// the element that uses the token, and keeps it current on resize.
export function tokenValues(root: ParentNode = document) {
  const measured = [...root.querySelectorAll<HTMLElement>('[data-measure]')].flatMap((element) => {
    const output = element.closest('[data-token]')?.querySelector<HTMLElement>('[data-token-value]')
    return output ? [{ element, output }] : []
  })
  if (measured.length === 0) return

  const format = (px: number) => `${Math.round(px * 10) / 10}px`

  const update = () => {
    for (const { element, output } of measured) {
      output.textContent = format(
        element.dataset.measure === 'font-size'
          ? parseFloat(getComputedStyle(element).fontSize)
          : element.getBoundingClientRect().width,
      )
    }
  }

  let frame = 0
  new ResizeObserver(() => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(update)
  }).observe(document.documentElement)
}

// Switches a theme container between the system scheme and forced light or
// dark, via trimscale's own .theme-light/.theme-dark classes.
export function schemeToggle(container: HTMLElement) {
  const buttons = [...container.querySelectorAll<HTMLButtonElement>('[data-scheme]')]

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const scheme = button.dataset.scheme
      container.classList.toggle('theme-light', scheme === 'light')
      container.classList.toggle('theme-dark', scheme === 'dark')
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === button))
    })
  }
}
