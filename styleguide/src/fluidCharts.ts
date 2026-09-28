// Plots fn.fluid-value, fn.fluid-font-size and fn.dynamic-line-height from
// the values Sass compiled them with, read off each figure as custom
// properties, and puts a dot on each curve measured from a real element that
// uses the function. The curve is the theory, the dot is what the browser
// computed.

const SVG_NS = 'http://www.w3.org/2000/svg'
const HEIGHT = 260
const MARGIN = { top: 28, right: 16, bottom: 40, left: 48 }

type Domain = [min: number, max: number]
type Point = [x: number, y: number]

const readNumber = (element: Element, property: string) =>
  parseFloat(getComputedStyle(element).getPropertyValue(property))

const round = (value: number, decimals: number) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

// Redraws on any resize, one frame at a time, like tokenValues
const onResize = (callback: () => void) => {
  let frame = 0
  new ResizeObserver(() => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(callback)
  }).observe(document.documentElement)
}

// The viewport a chart plots: the real one, measured, or with Simulate ticked,
// a width from the slider. A simulated width goes to a hidden container, and
// the chart measures probes there that use the same functions compiled
// against cqi instead of vwx, so the dot is still the browser's number.
function viewportSource(figure: HTMLElement, maxWidth: number, onChange: () => void) {
  const liveProbe = figure.querySelector<HTMLElement>('[data-probe="viewport"]')
  const container = figure.querySelector<HTMLElement>('[data-sim]')
  const toggle = figure.querySelector<HTMLInputElement>('input[type="checkbox"][data-simulate]')
  const slider = figure.querySelector<HTMLInputElement>('input[type="range"][data-simulate]')
  if (!liveProbe || !container || !toggle || !slider) return null

  slider.min = '320'
  slider.max = String(Math.round(maxWidth * 1.4))
  slider.disabled = true

  toggle.addEventListener('change', () => {
    slider.disabled = !toggle.checked
    onChange()
  })
  slider.addEventListener('input', onChange)

  return {
    container,
    read() {
      // Measured, not innerWidth: whether 100vw counts the scrollbar depends
      // on the root's scrollbar-gutter, which is stable here
      const live = round(liveProbe.getBoundingClientRect().width, 1)
      if (!toggle.checked) {
        slider.value = String(live)
        return { width: live, live, simulated: false }
      }
      const width = slider.valueAsNumber
      container.style.inlineSize = `${width}px`
      return { width, live, simulated: true }
    },
  }
}

// Clears the svg and sizes its viewBox to its real pixel width, so labels
// keep their CSS size instead of shrinking with a scaled viewBox on mobile.
// `logY` suits a modular scale, where an even ratio becomes an even gap, and
// `labelSpace` makes room on the right for endLabels.
function plot(
  svg: SVGSVGElement,
  xDomain: Domain,
  yDomain: Domain,
  { logY = false, labelSpace = 0 }: { logY?: boolean; labelSpace?: number } = {},
) {
  const width = svg.clientWidth
  svg.setAttribute('viewBox', `0 0 ${width} ${HEIGHT}`)
  svg.replaceChildren()

  const left = MARGIN.left
  const right = width - MARGIN.right - labelSpace
  const top = MARGIN.top
  const bottom = HEIGHT - MARGIN.bottom
  const scaleY = logY ? Math.log : (y: number) => y
  const sx = (x: number) => left + ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * (right - left)
  const sy = (y: number) =>
    bottom - ((scaleY(y) - scaleY(yDomain[0])) / (scaleY(yDomain[1]) - scaleY(yDomain[0]))) * (bottom - top)

  const add = (tag: string, attributes: Record<string, string | number>, text?: string) => {
    const element = document.createElementNS(SVG_NS, tag)
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value))
    if (text !== undefined) element.textContent = text
    svg.append(element)
    return element
  }

  // Right edge of the y-axis title, which shares the top row with the
  // marker label
  let yLabelEnd = left

  return {
    axes(xLabel: string, yLabel: string) {
      add('path', { class: 'fluid-chart__axis', d: `M${left},${top}V${bottom}H${right}` })
      add('text', { class: 'fluid-chart__axis-label', x: right, y: HEIGHT - 4, 'text-anchor': 'end' }, xLabel)
      const title = add('text', { class: 'fluid-chart__axis-label', x: left, y: top - 12, 'text-anchor': 'middle' }, yLabel)
      const box = (title as SVGTextElement).getBBox()
      yLabelEnd = box.x + box.width
    },
    guide(x: number, y: number, xText?: string, yText?: string) {
      add('path', { class: 'fluid-chart__guide', d: `M${left},${sy(y)}H${sx(x)}V${bottom}` })
      if (xText) add('text', { class: 'fluid-chart__tick', x: sx(x), y: bottom + 18, 'text-anchor': 'middle' }, xText)
      if (yText) this.yTick(y, yText)
    },
    // A full-height guide, for a breakpoint that no single curve owns
    vertical(x: number, text: string) {
      add('path', { class: 'fluid-chart__guide', d: `M${sx(x)},${top}V${bottom}` })
      add('text', { class: 'fluid-chart__tick', x: sx(x), y: bottom + 18, 'text-anchor': 'middle' }, text)
    },
    yTick(y: number, text: string) {
      add('text', { class: 'fluid-chart__tick', x: left - 8, y: sy(y), 'text-anchor': 'end', 'dominant-baseline': 'middle' }, text)
    },
    // Names each curve at the right edge, pushed apart where curves end
    // closer than a line of text: down first, then back up if that ran the
    // lowest one past the bottom of the plot
    endLabels(labels: { y: number; text: string }[]) {
      const placed = labels
        .map(({ y, text }) => ({
          y: sy(y),
          element: add('text', { class: 'fluid-chart__tick', x: right + 8, 'dominant-baseline': 'middle' }, text),
        }))
        .sort((a, b) => a.y - b.y)
      const gap = Math.max(...placed.map(({ element }) => (element as SVGTextElement).getBBox().height)) + 1

      for (let i = 1; i < placed.length; i++) placed[i].y = Math.max(placed[i].y, placed[i - 1].y + gap)
      placed[placed.length - 1].y = Math.min(placed[placed.length - 1].y, bottom)
      for (let i = placed.length - 2; i >= 0; i--) placed[i].y = Math.min(placed[i].y, placed[i + 1].y - gap)
      for (const { y, element } of placed) element.setAttribute('y', String(y))
    },
    curve(points: Point[], ...modifiers: (string | false)[]) {
      const d = `M${points.map(([x, y]) => `${sx(x)},${sy(y)}`).join('L')}`
      const classes = ['fluid-chart__curve', ...modifiers.filter(Boolean).map((m) => `fluid-chart__curve--${m}`)]
      add('path', { class: classes.join(' '), d })
    },
    // A point the config doesn't set but the curve produces, labelled on the
    // curve itself instead of on the axis next to the ones that are set
    derived(x: number, y: number, text: string) {
      add('circle', { class: 'fluid-chart__derived', cx: sx(x), cy: sy(y), r: 3.5 })
      add('text', { class: 'fluid-chart__derived-label', x: sx(x) + 8, y: sy(y) - 8 }, text)
    },
    // One measured value: a marker line with its label, and the dot
    dot(x: number, y: number, label: string) {
      this.marker(x, label)
      this.point(x, y)
    },
    point(x: number, y: number, r = 5) {
      add('circle', { class: 'fluid-chart__dot', cx: sx(x), cy: sy(y), r })
    },
    // The label sits in the top margin, on the y-axis title's row, so it stays
    // clear of a derived label near the top of the plot. It takes whichever
    // side of the marker has room, and flips if it would run into the y-axis
    // title or past the edge.
    marker(x: number, label: string) {
      add('path', { class: 'fluid-chart__marker', d: `M${sx(x)},${top - 16}V${bottom}` })
      const text = add('text', { class: 'fluid-chart__marker-label', y: top - 12 }, label) as SVGTextElement

      const place = (onRight: boolean) => {
        text.setAttribute('x', String(sx(x) + (onRight ? 6 : -6)))
        text.setAttribute('text-anchor', onRight ? 'start' : 'end')
        return text.getBBox()
      }
      const box = place(sx(x) < (left + right) / 2)
      if (box.x < yLabelEnd + 8) place(true)
      else if (box.x + box.width > width - labelSpace) place(false)
    },
  }
}

// ============================================================================
// fn.fluid-value: size against viewport width
// ============================================================================

export function fluidValueChart(figure: HTMLElement) {
  const svg = figure.querySelector('svg')
  const output = figure.querySelector('output')
  const buttons = [...figure.querySelectorAll<HTMLButtonElement>('[data-type]')]
  const codeBlocks = [...figure.querySelectorAll<HTMLElement>('[data-code]')]
  const clamp = figure.querySelector<HTMLElement>('[data-probe="clamp"]')
  const max = figure.querySelector<HTMLElement>('[data-probe="max"]')
  const clampSim = figure.querySelector<HTMLElement>('[data-probe="clamp-sim"]')
  const maxSim = figure.querySelector<HTMLElement>('[data-probe="max-sim"]')
  if (!svg || !output || !clamp || !max || !clampSim || !maxSim) return

  const minWidth = readNumber(figure, '--_min-width')
  const maxWidth = readNumber(figure, '--_max-width')
  const minSize = readNumber(figure, '--_min-size')
  const maxSize = readNumber(figure, '--_max-size')

  const source = viewportSource(figure, maxWidth, () => draw())
  if (!source) return

  const linear = (x: number) => minSize + ((maxSize - minSize) / (maxWidth - minWidth)) * (x - minWidth)
  const expected = {
    clamp: (x: number) => Math.min(Math.max(minSize, linear(x)), maxSize),
    max: (x: number) => Math.max(minSize, linear(x)),
  }
  let type: keyof typeof expected = 'clamp'

  svg.setAttribute(
    'aria-label',
    `${minSize}px up to a ${minWidth}px viewport, rising linearly to ${maxSize}px at ${maxWidth}px`,
  )

  const draw = () => {
    const { width: viewport, live, simulated } = source.read()
    // From the live width only, so dragging the slider never rescales the axis
    const xMax = Math.max(maxWidth * 1.4, live * 1.05)
    const chart = plot(svg, [0, xMax], [0, linear(xMax) * 1.1])

    chart.axes('viewport (px)', 'px')
    chart.guide(minWidth, minSize, String(minWidth), `${minSize}px`)
    chart.guide(maxWidth, maxSize, String(maxWidth), `${maxSize}px`)
    chart.curve([
      [0, minSize],
      [minWidth, minSize],
      [maxWidth, maxSize],
    ])
    if (type === 'clamp') {
      chart.curve([
        [maxWidth, maxSize],
        [xMax, maxSize],
      ])
    } else {
      chart.curve(
        [
          [maxWidth, maxSize],
          [xMax, maxSize],
        ],
        'ghost',
      )
      chart.curve(
        [
          [maxWidth, maxSize],
          [xMax, linear(xMax)],
        ],
        'uncapped',
      )
    }

    const probe = simulated ? (type === 'clamp' ? clampSim : maxSim) : type === 'clamp' ? clamp : max
    const measured = parseFloat(getComputedStyle(probe).fontSize)
    chart.dot(viewport, measured, simulated ? 'simulated' : 'your viewport')
    output.textContent = `Viewport ${Math.round(viewport)}px · formula ${expected[type](viewport).toFixed(2)}px · measured ${measured.toFixed(2)}px`
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      type = button.dataset.type === 'max' ? 'max' : 'clamp'
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === button))
      for (const block of codeBlocks) block.hidden = block.dataset.code !== type
      draw()
    })
  }

  onResize(draw)
}

// ============================================================================
// fn.fluid-font-size: every step of the type scale against viewport width
// ============================================================================

export function fontSizeChart(figure: HTMLElement) {
  const svg = figure.querySelector('svg')
  const output = figure.querySelector('output')
  if (!svg || !output) return

  const minWidth = readNumber(figure, '--_min-width')
  const maxWidth = readNumber(figure, '--_max-width')
  const source = viewportSource(figure, maxWidth, () => draw())
  if (!source) return

  const minFontSize = readNumber(figure, '--_min-font-size')
  const maxFontSize = readNumber(figure, '--_max-font-size')
  const minRatio = readNumber(figure, '--_min-type-scale')
  const maxRatio = readNumber(figure, '--_max-type-scale')

  const probe = (className: string, parent: HTMLElement) => {
    const element = document.createElement('span')
    element.className = className
    element.ariaHidden = 'true'
    element.textContent = 'x'
    parent.append(element)
    return element
  }

  // "fs-900 6 1, fs-800 5 1, ...": name, step and uncapped, one per scale step.
  // Whole steps only: a half step sits between two others and breaks the even
  // gaps the log axis is there to show.
  const steps = getComputedStyle(figure)
    .getPropertyValue('--_steps')
    .replaceAll('"', '')
    .split(',')
    .map((entry) => entry.trim().split(' '))
    .filter(([, step]) => Number.isInteger(Number(step)))
    .map(([name, step, uncapped]) => {
      // The live probe reads the page's own token, the simulated one a cqi
      // compile of the same step (see _fluid-chart.scss)
      const live = probe('fluid-chart__probe', figure)
      live.style.fontSize = `var(--${name}${uncapped === '1' ? '-uncapped' : ''})`
      const simulated = probe(`fluid-chart__probe fluid-chart__probe--sim-${name}`, source.container)
      return { name, step: Number(step), uncapped: uncapped === '1', live, simulated }
    })
  if (steps.length === 0) return

  // Same derivation as the Sass function: each end of the step is the base
  // size times that end's ratio to the power of the step
  const value = ({ step, uncapped }: (typeof steps)[number], x: number) => {
    const min = minFontSize * minRatio ** step
    const max = maxFontSize * maxRatio ** step
    const linear = min + ((max - min) / (maxWidth - minWidth)) * (x - minWidth)
    return uncapped ? Math.max(min, linear) : Math.min(Math.max(min, linear), max)
  }
  const base = steps.find(({ step }) => step === 0) ?? steps[0]
  const top = steps.reduce((a, b) => (b.step > a.step ? b : a))
  const bottom = steps.reduce((a, b) => (b.step < a.step ? b : a))

  svg.setAttribute(
    'aria-label',
    `The ${steps.length} steps of the type scale, ${round(value(bottom, 0), 1)}px to ${round(value(top, 0), 1)}px at a ${minWidth}px viewport, spreading to ${round(value(bottom, maxWidth), 1)}px to ${round(value(top, maxWidth), 1)}px at ${maxWidth}px`,
  )

  const draw = () => {
    const { width: viewport, live, simulated } = source.read()
    // From the live width only, so dragging the slider never rescales the axis
    const xMax = Math.max(maxWidth * 1.4, live * 1.05)
    const yMin = value(bottom, 0) * 0.85
    const yMax = Math.max(...steps.map((s) => value(s, xMax))) * 1.1
    const chart = plot(svg, [0, xMax], [yMin, yMax], { logY: true, labelSpace: 48 })

    chart.axes('viewport (px)', 'px')
    chart.vertical(minWidth, String(minWidth))
    chart.vertical(maxWidth, String(maxWidth))
    for (const tick of [8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256]) {
      if (tick >= yMin && tick <= yMax) chart.yTick(tick, String(tick))
    }

    for (const s of steps) {
      const points: Point[] = []
      for (let x = 0; x <= Math.min(maxWidth, xMax); x += xMax / 200) points.push([x, value(s, x)])
      points.push([maxWidth, value(s, maxWidth)])
      chart.curve(points, s === base && 'base')
      chart.curve(
        [
          [maxWidth, value(s, maxWidth)],
          [xMax, value(s, xMax)],
        ],
        s === base && 'base',
        s.uncapped && 'uncapped',
      )
    }
    chart.endLabels(steps.map((s) => ({ y: value(s, xMax), text: s.name })))

    chart.marker(viewport, simulated ? 'simulated' : 'your viewport')
    const measured = new Map(
      steps.map((s) => [s, parseFloat(getComputedStyle(simulated ? s.simulated : s.live).fontSize)]),
    )
    for (const size of measured.values()) chart.point(viewport, size, 3.5)

    const spread = (measured.get(top) ?? 0) / (measured.get(base) ?? 1)
    output.textContent = `Viewport ${Math.round(viewport)}px · ${top.name} is ${spread.toFixed(2)} × ${base.name}`
  }

  onResize(draw)
}

// ============================================================================
// fn.dynamic-line-height: ratio against font-size
// ============================================================================

export function lineHeightChart(figure: HTMLElement) {
  const svg = figure.querySelector('svg')
  const input = figure.querySelector<HTMLInputElement>('input[type="range"]')
  const output = figure.querySelector('output')
  const sample = figure.querySelector<HTMLElement>('[data-sample]')
  if (!svg || !input || !output || !sample) return

  const fsBase = readNumber(figure, '--_fs-base')
  const ratioBase = readNumber(figure, '--_ratio-base')
  const fsCeil = readNumber(figure, '--_fs-ceil')
  const ratioCeil = readNumber(figure, '--_ratio-ceil')
  const ratioCap = readNumber(figure, '--_ratio-cap')

  // Same derivation as the Sass function: line-height in px is linear in
  // font-size, so the ratio is a hyperbola, not a straight line
  const slope = (fsCeil * ratioCeil - fsBase * ratioBase) / (fsCeil - fsBase)
  const intercept = fsBase * ratioBase - fsBase * slope
  const expected = (size: number) => Math.min(Math.max(ratioCeil, slope + intercept / size), ratioCap)
  const capAt = intercept / (ratioCap - slope)

  svg.setAttribute(
    'aria-label',
    `Line-height ratio ${ratioCap} for small text, ${ratioBase} at ${fsBase}px, falling to ${ratioCeil} at ${fsCeil}px and above`,
  )

  // The slider spans the type scale's current smallest to largest size,
  // measured from the samples in the Design Tokens section
  const setRange = () => {
    const sizes = [...document.querySelectorAll('.type-scale [data-measure="font-size"]')].map((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    )
    if (sizes.length === 0) return
    input.min = String(Math.floor(Math.min(...sizes)))
    input.max = String(Math.ceil(Math.max(...sizes)))
  }

  const draw = () => {
    const size = input.valueAsNumber
    sample.style.fontSize = `${size}px`
    const measured = parseFloat(getComputedStyle(sample).lineHeight) / size

    const xMax = Math.max(fsCeil * 1.5, Number(input.max))
    const chart = plot(svg, [0, xMax], [ratioCeil - 0.1, ratioCap + 0.1])

    chart.axes('font-size (px)', 'ratio')
    chart.guide(fsBase, ratioBase, `${fsBase}px`, String(ratioBase))
    chart.guide(fsCeil, ratioCeil, `${fsCeil}px`, String(ratioCeil))
    if (capAt > 0) chart.guide(capAt, ratioCap, undefined, String(ratioCap))

    // expected(0) is ratioCap, since intercept / 0 is Infinity
    const points: Point[] = []
    for (let x = 0; x <= xMax; x += xMax / 400) points.push([x, expected(x)])
    chart.curve(points)

    if (capAt > 0) chart.derived(capAt, ratioCap, `cap ≈${round(capAt, 1)}px`)
    chart.dot(size, measured, 'sample text')
    output.textContent = `Font size ${size.toFixed(1)}px · formula ${expected(size).toFixed(3)} · measured ${measured.toFixed(3)}`
  }

  setRange()
  input.value = String(fsBase)
  input.addEventListener('input', draw)
  onResize(() => {
    setRange()
    draw()
  })
}
