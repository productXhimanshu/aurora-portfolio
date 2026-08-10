import { initHero } from './sections/hero.js';
import { initShip } from './sections/ship.js';
import { initAbout } from './sections/about.js';

document.addEventListener('DOMContentLoaded', () => {
  initHero();
  initShip();
  initAbout();
});
