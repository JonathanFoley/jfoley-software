import { Engine, THREE, damp, clamp, lerp } from './dioramas/core/engine.js';
import { smoothScroll, gsap, ScrollTrigger } from './dioramas/core/scroll.js';
import { Pointer } from './dioramas/core/input.js';
import './style.css';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelector('#year').textContent = new Date().getFullYear();

const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  mobileNav.hidden = !open;
  document.body.classList.toggle('menu-open', open);
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
  mobileNav.hidden = true;
  document.body.classList.remove('menu-open');
}));

if (!reducedMotion) {
  try { smoothScroll({ lerp: 0.09, wheelMultiplier: 0.9 }); } catch (error) { console.warn('Smooth scrolling unavailable; native scrolling remains enabled.', error); }
}

const canvas = document.querySelector('#thistle-canvas');
let engine;
let pointer;
let flower;
let animationFrame = 0;

function makeLeaf(material, length, width) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(length * 0.3, width * 0.82, length * 0.74, width * 0.44);
  shape.lineTo(length, 0);
  shape.lineTo(length * 0.73, -width * 0.32);
  shape.quadraticCurveTo(length * 0.3, -width * 0.5, 0, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.012, bevelThickness: 0.01 });
  geometry.computeVertexNormals();
  const leaf = new THREE.Mesh(geometry, material);
  leaf.castShadow = true;
  leaf.receiveShadow = true;
  return leaf;
}

function buildThistle() {
  const root = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: '#4d876e', roughness: 0.55, metalness: 0.04 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#5c9a7b', roughness: 0.42, metalness: 0.02, side: THREE.DoubleSide });
  const leafLightMat = new THREE.MeshStandardMaterial({ color: '#83b696', roughness: 0.48, metalness: 0.02, side: THREE.DoubleSide });
  const petalMat = new THREE.MeshStandardMaterial({ color: '#9c73dc', roughness: 0.35, metalness: 0.03 });
  const petalLightMat = new THREE.MeshStandardMaterial({ color: '#c2a0f3', roughness: 0.34, metalness: 0.02 });
  const bractMat = new THREE.MeshStandardMaterial({ color: '#67977c', roughness: 0.5 });
  const coreMat = new THREE.MeshStandardMaterial({ color: '#d4a96c', roughness: 0.48 });

  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -2.25, 0),
    new THREE.Vector3(-0.03, -1.35, 0),
    new THREE.Vector3(0.08, -0.45, 0.02),
    new THREE.Vector3(0.02, 0.42, 0),
    new THREE.Vector3(0.11, 1.2, 0.02),
    new THREE.Vector3(0.04, 1.72, 0.03)
  ]);
  const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 56, 0.035, 8, false), stemMat);
  stem.castShadow = true;
  root.add(stem);

  const leafLevels = [
    { y: -1.68, angle: 0.2, length: 1.08, width: 0.23 },
    { y: -1.28, angle: 2.5, length: 1.0, width: 0.22 },
    { y: -0.88, angle: 4.55, length: 0.92, width: 0.21 },
    { y: -0.46, angle: 1.2, length: 0.84, width: 0.19 },
    { y: -0.08, angle: 3.3, length: 0.72, width: 0.17 },
    { y: 0.3, angle: 5.45, length: 0.61, width: 0.15 },
    { y: 0.64, angle: 2.05, length: 0.5, width: 0.13 }
  ];
  for (const [index, item] of leafLevels.entries()) {
    const anchor = new THREE.Group();
    anchor.position.set(0.04 + item.y * 0.035, item.y, 0);
    anchor.rotation.y = item.angle;
    const leaf = makeLeaf(index % 2 ? leafLightMat : leafMat, item.length, item.width);
    leaf.rotation.z = index % 2 ? -0.13 : 0.12;
    anchor.add(leaf);
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.012, item.length * 0.86, 5), leafLightMat);
    rib.position.set(item.length * 0.43, 0, 0.028);
    rib.rotation.z = Math.PI / 2;
    anchor.add(rib);
    root.add(anchor);
  }

  const head = new THREE.Group();
  head.position.set(0.04, 1.72, 0.03);
  root.add(head);
  const headCore = new THREE.Mesh(new THREE.SphereGeometry(0.43, 32, 24), new THREE.MeshStandardMaterial({ color: '#8f68c6', roughness: 0.6 }));
  headCore.scale.set(1, 0.91, 0.98);
  head.add(headCore);

  // Layered, individually modelled florets create the thistle's characteristic crown.
  for (let i = 0; i < 132; i++) {
    const t = (i + 0.5) / 132;
    const y = 1 - 2 * t;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * 2.399963229728653;
    const direction = new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius).normalize();
    const petalLength = 0.23 + 0.12 * (1 - Math.abs(y));
    const petal = new THREE.Mesh(
      new THREE.ConeGeometry(0.026 + (1 - Math.abs(y)) * 0.009, petalLength, 5),
      i % 4 === 0 ? petalLightMat : petalMat
    );
    petal.position.copy(direction.clone().multiplyScalar(0.37));
    petal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    petal.rotateY((i % 3) * 0.14);
    petal.castShadow = true;
    head.add(petal);
  }

  // Pointed green bracts around the base of the flower.
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2;
    const bract = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.35, 5), bractMat);
    bract.position.set(Math.cos(angle) * 0.35, -0.28, Math.sin(angle) * 0.35);
    bract.rotation.z = Math.cos(angle) * 0.62;
    bract.rotation.x = Math.sin(angle) * 0.62;
    bract.rotation.y = -angle;
    bract.castShadow = true;
    head.add(bract);
  }
  const centre = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), coreMat);
  centre.position.y = 0.05;
  head.add(centre);

  // Tiny seed-like details catch the key light without relying on an external model.
  const seedMat = new THREE.MeshStandardMaterial({ color: '#e4c18b', roughness: 0.55 });
  for (let i = 0; i < 24; i++) {
    const a = i * 2.39996;
    const r = 0.08 + (i % 5) * 0.012;
    const seed = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), seedMat);
    seed.position.set(Math.cos(a) * r, 0.07 + (i % 4) * 0.018, Math.sin(a) * r);
    head.add(seed);
  }
  return { root, head };
}

function initScene() {
  if (!window.WebGLRenderingContext) {
    document.documentElement.classList.add('no-webgl');
    return;
  }
  try {
    engine = new Engine({
      canvas, fov: 34, near: 0.1, far: 80, dpr: 1.5, background: '#101525',
      shadows: true, post: { ao: false, bloom: { intensity: 0.34, luminanceThreshold: 0.88 }, vignette: { offset: 0.25, darkness: 0.34 }, noise: false, smaa: false }
    });
    engine.scene.background = new THREE.Color('#101525');
    engine.scene.fog = new THREE.FogExp2('#101525', 0.055);
    engine.camera.position.set(0, 0.1, 7.7);
    const targetX = window.innerWidth <= 640 ? -0.62 : -1.18;
    engine.camera.lookAt(targetX, 0, 0);
    window.addEventListener('resize', () => engine.camera.lookAt(window.innerWidth <= 640 ? -0.62 : -1.18, 0, 0), { passive: true });

    const ambient = new THREE.HemisphereLight('#c4d2ff', '#18251f', 1.6);
    engine.scene.add(ambient);
    const key = new THREE.DirectionalLight('#f2e9ff', 4.1);
    key.position.set(-3.4, 5, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    engine.scene.add(key);
    const rim = new THREE.DirectionalLight('#8d6be3', 3.2);
    rim.position.set(4, 1.5, -3);
    engine.scene.add(rim);
    const greenFill = new THREE.PointLight('#74d4a1', 2.1, 10);
    greenFill.position.set(-2, -1.2, 2);
    engine.scene.add(greenFill);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.9, 0.18, 64),
      new THREE.MeshStandardMaterial({ color: '#222d3b', roughness: 0.28, metalness: 0.48 })
    );
    pedestal.position.set(0, -2.34, 0);
    pedestal.receiveShadow = true;
    engine.scene.add(pedestal);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.73, 0.012, 8, 80),
      new THREE.MeshStandardMaterial({ color: '#87bfa0', emissive: '#244f3c', emissiveIntensity: 0.5, metalness: 0.45, roughness: 0.25 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -2.24;
    engine.scene.add(ring);

    flower = buildThistle();
    engine.scene.add(flower.root);
    pointer = new Pointer({ lambda: 4.5 });
    engine.onTick((dt, time) => {
      pointer.update(dt);
      const targetY = pointer.sx * 0.16;
      flower.root.rotation.y = damp(flower.root.rotation.y, targetY + scrollRotation, 2.8, dt);
      flower.root.rotation.z = damp(flower.root.rotation.z, -pointer.sy * 0.075 + scrollTilt, 2.5, dt);
      flower.root.position.y = Math.sin(time * 0.65) * 0.035 + scrollLift;
      flower.head.rotation.y = Math.sin(time * 0.4) * 0.06 + pointer.sx * 0.08;
      flower.head.rotation.x = damp(flower.head.rotation.x, pointer.sy * 0.055, 2.4, dt);
      key.position.x = -3.4 + pointer.sx * 0.5;
    });
    engine.start();
    document.documentElement.classList.add('webgl-ready');
  } catch (error) {
    console.warn('3D scene could not initialise; showing the CSS artwork instead.', error);
    document.documentElement.classList.add('no-webgl');
  }
}

let scrollRotation = 0;
let scrollTilt = 0;
let scrollLift = 0;

function initScrollStory() {
  if (reducedMotion) {
    document.documentElement.classList.add('reduced-motion');
    return;
  }
  gsap.utils.toArray('.section-kicker, .service-row, .approach-card, .work-card, .contact-main > *').forEach((element) => {
    gsap.from(element, {
      y: 28, opacity: 0, duration: 0.85, ease: 'power3.out',
      scrollTrigger: { trigger: element, start: 'top 88%', once: true }
    });
  });
  gsap.to('.hero-copy', { y: -90, opacity: 0.35, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-art', { y: 110, scale: 0.84, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  ScrollTrigger.create({
    trigger: '.intro-band', start: 'top bottom', end: 'bottom top', scrub: true,
    onUpdate: self => { scrollRotation = lerp(0, Math.PI * 0.72, self.progress); scrollTilt = lerp(0, -0.1, self.progress); }
  });
  ScrollTrigger.create({
    trigger: '.approach', start: 'top bottom', end: 'bottom top', scrub: true,
    onUpdate: self => { scrollRotation = lerp(Math.PI * 0.72, Math.PI * 1.5, self.progress); scrollLift = Math.sin(self.progress * Math.PI) * 0.18; }
  });
  ScrollTrigger.create({
    trigger: '.work', start: 'top bottom', end: 'bottom top', scrub: true,
    onUpdate: self => { scrollRotation = lerp(Math.PI * 1.5, Math.PI * 2.3, self.progress); scrollTilt = lerp(-0.1, 0.08, self.progress); }
  });
}

function initMagneticButtons() {
  if (reducedMotion || matchMedia('(pointer: coarse)').matches) return;
  document.querySelectorAll('[data-magnetic]').forEach(el => {
    el.addEventListener('pointermove', event => {
      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      gsap.to(el, { x: x * 0.08, y: y * 0.12, duration: 0.35, ease: 'power3.out' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.65, ease: 'elastic.out(1, 0.45)' }));
  });
}

function boot() {
  initScene();
  initScrollStory();
  initMagneticButtons();
  if (!reducedMotion) gsap.from('.hero-copy > *', { y: 22, opacity: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out', delay: 0.12 });
}
boot();

window.addEventListener('beforeunload', () => {
  if (engine) {
    engine.running = false;
    engine.renderer.dispose();
  }
});
