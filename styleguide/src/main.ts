import { scrollSpy } from './scrollSpy';
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
