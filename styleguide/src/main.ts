import { codeBlocks } from './codeBlocks';
import { fluidValueChart, fontSizeChart, lineHeightChart } from './fluidCharts';
import { scrollSpy } from './scrollSpy';
import { tabs } from './tabs';
import { schemeToggle, tokenValues } from './tokenValues';
import './styles/globals.scss';

// import logoLarge from './assets/trimscale-logo-large.svg?raw';
// SVG's
import logoSmall from './assets/trimscale-logo-small.svg?raw';

// set header logo
const headerBrand = document.querySelector('.header__brand');
if (headerBrand) headerBrand.innerHTML = logoSmall

// sidebar scroll-spy fallback
const sidebarList = document.querySelector<HTMLElement>('.sidebar__list')
if (sidebarList) scrollSpy(sidebarList)

// copy buttons on code blocks
codeBlocks()

// tabbed panels
for (const tabList of document.querySelectorAll<HTMLElement>('.tabs__list')) {
  tabs(tabList)
}

// live px values in the token tables
tokenValues()

// light/dark switch on the color swatches
const colorTokens = document.querySelector<HTMLElement>('.color-tokens')
if (colorTokens) schemeToggle(colorTokens)

// fluid function charts
const fluidValueFigure = document.querySelector<HTMLElement>('.fluid-chart--fluid-value')
if (fluidValueFigure) fluidValueChart(fluidValueFigure)

const fontSizeFigure = document.querySelector<HTMLElement>('.fluid-chart--font-size')
if (fontSizeFigure) fontSizeChart(fontSizeFigure)

const lineHeightFigure = document.querySelector<HTMLElement>('.fluid-chart--line-height')
if (lineHeightFigure) lineHeightChart(lineHeightFigure)
