// ARIA tabs. Every panel stays visible until this runs, so the content is
// all there without scripts, just stacked instead of tabbed.
export function tabs(tabList: HTMLElement) {
  const tabButtons = [...tabList.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
  const panelFor = (tab: HTMLButtonElement) =>
    document.getElementById(tab.getAttribute('aria-controls') ?? '')

  const select = (selected: HTMLButtonElement) => {
    for (const tab of tabButtons) {
      const isSelected = tab === selected
      tab.setAttribute('aria-selected', String(isSelected))
      tab.tabIndex = isSelected ? 0 : -1
      const panel = panelFor(tab)
      if (panel) panel.hidden = !isSelected
    }
  }

  for (const tab of tabButtons) {
    tab.addEventListener('click', () => select(tab))
  }

  tabList.addEventListener('keydown', (event) => {
    const current = tabButtons.indexOf(document.activeElement as HTMLButtonElement)
    if (current === -1) return

    const last = tabButtons.length - 1
    const next = {
      ArrowRight: current === last ? 0 : current + 1,
      ArrowLeft: current === 0 ? last : current - 1,
      Home: 0,
      End: last,
    }[event.key]
    if (next === undefined) return

    event.preventDefault()
    tabButtons[next].focus()
    select(tabButtons[next])
  })

  if (tabButtons[0]) select(tabButtons[0])
}
