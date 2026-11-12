// Marks the breakpoint row the viewport is currently in: the widest one whose
// mx.and-up() query matches. Same query the mixin writes, so the mark moves
// exactly where the page's own layout switches.
export function breakpointMarker(table: HTMLElement, rootFontSize = 16) {
  const rows = [...table.querySelectorAll<HTMLElement>('[data-breakpoint]')].map((row) => ({
    row,
    query: matchMedia(`(width >= ${Number(row.dataset.min) / rootFontSize}rem)`),
  }))
  if (rows.length === 0) return

  const update = () => {
    const current = rows.findLast(({ query }) => query.matches)
    for (const { row } of rows) {
      if (row === current?.row) row.setAttribute('aria-current', 'true')
      else row.removeAttribute('aria-current')
    }
  }

  for (const { query } of rows) query.addEventListener('change', update)
  update()
}
