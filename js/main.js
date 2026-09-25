import { initHero } from './sections/hero.js';
import { initShip } from './sections/ship.js';
import { initAbout } from './sections/about.js';
import { initProof } from './sections/proof-of-work.js';
import { initStory } from './sections/story.js';
import { initTestimonials } from './sections/testimonials.js';
import { initConnect } from './sections/connect.js';

document.addEventListener('DOMContentLoaded', () => {
  initHero();
  initShip();
  initAbout();
  initProof();
  initStory();
  initTestimonials();
  initConnect();
});
