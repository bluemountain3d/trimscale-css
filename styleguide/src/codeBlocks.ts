// Adds a copy button to every code block. Added from JS so a page without
// scripts, or without clipboard access, gets no button that can't work.
export function codeBlocks(root: ParentNode = document) {
  if (!navigator.clipboard) return

  for (const block of root.querySelectorAll<HTMLElement>('.code-block')) {
    const code = block.querySelector('code')
    if (!code) continue

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'code-block__copy'
    button.textContent = 'Copy'

    let reset: number | undefined
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent ?? '')
        button.textContent = 'Copied'
      } catch {
        button.textContent = 'Failed'
      }
      button.dataset.copied = ''
      clearTimeout(reset)
      reset = window.setTimeout(() => {
        button.textContent = 'Copy'
        delete button.dataset.copied
      }, 2000)
    })

    block.append(button)
  }
}
