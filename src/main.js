import { createNeonThistle } from './dioramas/neon-thistle.js';
import './style.css';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

// Progressive reveal: content remains visible if IntersectionObserver is unavailable.
if ('IntersectionObserver' in window && !reducedMotion) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('ok');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.sec > *').forEach(element => {
    element.classList.add('rv');
    revealObserver.observe(element);
  });
}

// Keep the handover's sticky hero composition alive for a full viewport of scroll.
const track = document.querySelector('#track');
if (track) track.style.minHeight = '190svh';
const hero = document.querySelector('.hero');
const copy = document.querySelector('.copy');
const updateHeroProgress = () => {
  if (!track || !hero) return;
  const distance = Math.max(1, track.offsetHeight - innerHeight);
  const progress = Math.max(0, Math.min(1, -track.getBoundingClientRect().top / distance));
  hero.style.setProperty('--p', progress.toFixed(3));
};
addEventListener('scroll', updateHeroProgress, { passive: true });
addEventListener('resize', updateHeroProgress);
updateHeroProgress();

// Scroll-linked approach progress.
const steps = document.querySelector('#steps');
const stepItems = steps ? [...steps.querySelectorAll('.step')] : [];
const updateSteps = () => {
  if (!steps) return;
  const rect = steps.getBoundingClientRect();
  const progress = Math.max(0, Math.min(1, (innerHeight * 0.7 - rect.top) / Math.max(1, rect.height)));
  steps.style.setProperty('--sp', progress.toFixed(3));
  stepItems.forEach((step, index) => step.classList.toggle('on', progress > index / stepItems.length + 0.02));
};
addEventListener('scroll', updateSteps, { passive: true });
addEventListener('resize', updateSteps);
updateSteps();

// Pointer and scroll-reactive 3D thistle; graceful CSS fallback on unsupported devices.
const thistle = createNeonThistle(document.querySelector('#thistle-canvas'), { reducedMotion });

const form = document.querySelector('#contact-form');
form?.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const lines = [
    `Name: ${data.get('name')}`,
    `Email: ${data.get('email')}`,
    `Need: ${data.get('need')}`,
    `Budget: ${data.get('budget')}`,
    '', 'Message:', data.get('msg') || 'Not provided'
  ];
  const status = document.querySelector('#fs');
  if (status) status.textContent = 'Opening your email app…';
  const subject = encodeURIComponent(`Website enquiry: ${data.get('need') || 'New enquiry'}`);
  const message = encodeURIComponent(lines.join('\n'));
  window.location.href = `mailto:contact@jonathanfoley.co.uk?subject=${subject}&body=${message}`;
});

addEventListener('pagehide', () => thistle?.destroy(), { once: true });
