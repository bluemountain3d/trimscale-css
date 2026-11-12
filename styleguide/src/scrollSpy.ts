/**
 * Fallback for `scroll-target-group: auto`: marks the sidebar link whose
 * section is currently in view with `aria-current="location"`.
 */
export function scrollSpy(list: HTMLElement): void {
  if (CSS.supports('scroll-target-group', 'auto')) return

  const pairs = [...list.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].flatMap((link) => {
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)))
    return target ? [{ link, target }] : []
  })
  if (!pairs.length) return

  let current: HTMLAnchorElement | undefined
  let queued = false

  const update = () => {
    queued = false
    const root = document.documentElement
    const atBottom = root.scrollHeight > innerHeight && scrollY + innerHeight >= root.scrollHeight - 1

    let next: HTMLAnchorElement | undefined
    if (atBottom) {
      next = pairs.at(-1)?.link
    } else {
      const line = innerHeight / 2
      for (const { link, target } of pairs) {
        if (target.getBoundingClientRect().top > line) break
        next = link
      }
    }

    if (next === current) return
    current?.removeAttribute('aria-current')
    next?.setAttribute('aria-current', 'location')
    current = next
  }

  const queue = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(update)
  }

  addEventListener('scroll', queue, { passive: true })
  addEventListener('resize', queue)
  update()
}