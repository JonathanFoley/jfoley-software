import { createNeonThistle } from './dioramas/neon-thistle.js';
import { smoothScroll, gsap, ScrollTrigger } from './dioramas/core/scroll.js';
import './style.css';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelector('#year').textContent = new Date().getFullYear();

const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
const closeMenu = () => {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
  mobileNav.hidden = true;
  document.body.classList.remove('menu-open');
};
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  mobileNav.hidden = !open;
  document.body.classList.toggle('menu-open', open);
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
window.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

if (!reducedMotion) {
  try { smoothScroll({ lerp: 0.085, wheelMultiplier: 0.9 }); }
  catch (error) { console.warn('Smooth scrolling unavailable; native scrolling remains enabled.', error); }
}

const thistle = createNeonThistle(document.querySelector('#thistle-canvas'), { reducedMotion });

if (!reducedMotion) {
  gsap.utils.toArray('.section-kicker, .service-row, .step, .work-card, .stats > div, .contact-form > *').forEach(element => {
    gsap.fromTo(element, { y: 24, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: element, start: 'top 88%', once: true }
    });
  });

  ScrollTrigger.create({
    trigger: '.steps', start: 'top 70%', end: 'bottom 65%', scrub: true,
    onUpdate: self => {
      document.querySelector('.steps-progress').style.transform = `scaleY(${self.progress})`;
      document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.toggle('is-active', self.progress >= index / 3 + 0.04);
      });
    }
  });

  gsap.from('.hero-copy > *', {
    y: 22, opacity: 0, duration: 0.85, stagger: 0.1,
    ease: 'power3.out', delay: 0.12
  });
}

// A native mailto fallback is intentional: no form provider or third-party endpoint is used.
document.querySelector('#contact-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const lines = [
    `Name: ${data.get('name')}`,
    `Email: ${data.get('email')}`,
    `What they need: ${data.get('need')}`,
    `Rough budget: ${data.get('budget')}`,
    '',
    'Project details:',
    data.get('message') || 'Not provided'
  ];
  const subject = encodeURIComponent(`Website enquiry from ${data.get('name')}`);
  const body = encodeURIComponent(lines.join('\n'));
  document.querySelector('#form-note').textContent =
    'Opening your email app. If nothing happens, email contact@jonathanfoley.co.uk directly.';
  window.location.href = `mailto:contact@jonathanfoley.co.uk?subject=${subject}&body=${body}`;
});

window.addEventListener('beforeunload', () => thistle?.destroy());
