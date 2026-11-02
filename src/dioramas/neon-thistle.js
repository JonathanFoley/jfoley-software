import { Engine, THREE, damp, clamp } from './core/engine.js';
import { Pointer } from './core/input.js';

const TAU = Math.PI * 2;

function makeLobedLeaf(material, length, width, lobes = 5) {
  const shape = new THREE.Shape();
  const upper = [];
  for (let i = 0; i <= lobes * 2; i++) {
    const t = i / (lobes * 2);
    const lobe = Math.sin(t * Math.PI * lobes) * 0.17 + 0.58;
    upper.push(new THREE.Vector2(length * t, width * lobe));
  }
  const lower = [];
  for (let i = lobes * 2; i >= 0; i--) {
    const t = i / (lobes * 2);
    const lobe = Math.sin(t * Math.PI * lobes) * 0.14 + 0.48;
    lower.push(new THREE.Vector2(length * t, -width * lobe));
  }
  shape.moveTo(0, 0);
  upper.forEach(point => shape.lineTo(point.x, point.y));
  lower.forEach(point => shape.lineTo(point.x, point.y));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.025, bevelEnabled: true, bevelSegments: 2, steps: 1,
    bevelSize: 0.012, bevelThickness: 0.012
  });
  geometry.computeVertexNormals();
  const leaf = new THREE.Mesh(geometry, material);
  leaf.castShadow = true;
  leaf.receiveShadow = true;
  const ribCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0.035),
    new THREE.Vector3(length * 0.28, 0, 0.04),
    new THREE.Vector3(length * 0.62, 0, 0.035),
    new THREE.Vector3(length, 0, 0.01)
  ]);
  leaf.add(new THREE.Mesh(new THREE.TubeGeometry(ribCurve, 24, 0.009, 5, false), material));
  return leaf;
}

function makeBractRing(index, count, radius, y, parent, materials) {
  const ring = new THREE.Group();
  ring.position.y = y;
  const height = 0.58 + (index % 4) * 0.055;
  const geometry = new THREE.ConeGeometry(0.075 + (index % 3) * 0.008, height, 5, 1);
  geometry.translate(0, height * 0.46, 0);
  const mesh = new THREE.InstancedMesh(geometry, materials[index % materials.length], count);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * TAU + index * 0.19;
    const radial = radius + Math.sin(i * 4.1 + index) * 0.035;
    position.set(Math.cos(angle) * radial, Math.sin(i * 2.7) * 0.025, Math.sin(angle) * radial);
    direction.set(Math.cos(angle) * 0.38, 0.8 + (index / 10) * 0.18, Math.sin(angle) * 0.38).normalize();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    scale.set(0.82 + Math.sin(i * 3.4) * 0.1, 0.82 + (i % 5) * 0.08, 0.82 + Math.cos(i * 2.8) * 0.1);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, new THREE.Color().setHSL(0.39 + (i % 7) * 0.003, 0.74, 0.28 + (i % 4) * 0.035));
  }
  mesh.instanceMatrix.needsUpdate = true;
  ring.add(mesh);
  parent.add(ring);
  return ring;
}

function makeFloretInstances(parent, count, radius, length, palette, seed = 0) {
  const geometry = new THREE.ConeGeometry(0.012, length, 5, 1);
  geometry.translate(0, length * 0.48, 0);
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff', roughness: 0.66, metalness: 0.02, vertexColors: true,
    emissive: '#4d1680', emissiveIntensity: 0.12
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const colours = palette.map(value => new THREE.Color(value));
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const y = 1 - 2 * t;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = i * 2.399963229728653 + seed;
    const r = radius * (0.92 + 0.08 * Math.sin(i * 1.73));
    position.set(Math.cos(angle) * ring * r, y * r * 0.72, Math.sin(angle) * ring * r);
    direction.set(position.x * 0.72, 0.62 + (i % 6) * 0.035, position.z * 0.72).normalize();
    quaternion.setFromUnitVectors(up, direction);
    const scaleValue = 0.72 + (i % 9) * 0.055;
    scale.set(scaleValue, scaleValue, scaleValue);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(i, matrix);
    const colour = colours[(i * 7 + seed) % colours.length].clone();
    colour.offsetHSL(Math.sin(i * 0.19) * 0.015, 0, Math.sin(i * 1.3) * 0.045);
    mesh.setColorAt(i, colour);
  }
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
  return mesh;
}

function createFlower() {
  const root = new THREE.Group();
  const stemMaterial = new THREE.MeshStandardMaterial({
    color: '#1c7650', roughness: 0.52, metalness: 0.04,
    emissive: '#062c20', emissiveIntensity: 0.28
  });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: '#287e57', roughness: 0.5, metalness: 0.02,
    side: THREE.DoubleSide, emissive: '#092f20', emissiveIntensity: 0.18
  });
  const leafLight = new THREE.MeshStandardMaterial({
    color: '#5af2a0', roughness: 0.55, metalness: 0.01,
    side: THREE.DoubleSide, emissive: '#0d6b43', emissiveIntensity: 0.2
  });
  const bractMaterials = [
    new THREE.MeshStandardMaterial({ color: '#17623e', roughness: 0.55, metalness: 0.03, emissive: '#0b331f', emissiveIntensity: 0.22 }),
    new THREE.MeshStandardMaterial({ color: '#27885a', roughness: 0.52, metalness: 0.02, emissive: '#0b4a2d', emissiveIntensity: 0.24 }),
    new THREE.MeshStandardMaterial({ color: '#43c981', roughness: 0.58, metalness: 0.01, emissive: '#0d5837', emissiveIntensity: 0.22 })
  ];
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.12, -4.2, 0), new THREE.Vector3(0.08, -3.15, 0.02),
    new THREE.Vector3(-0.08, -2.05, -0.03), new THREE.Vector3(0.05, -0.95, 0),
    new THREE.Vector3(0.02, 0.12, 0.02), new THREE.Vector3(0, 1.05, 0)
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 72, 0.045, 9, false), stemMaterial));

  const leafLevels = [
    { y: -3.25, angle: 0.1, length: 1.5, width: 0.34 },
    { y: -2.8, angle: 2.55, length: 1.42, width: 0.32 },
    { y: -2.25, angle: 4.65, length: 1.28, width: 0.29 },
    { y: -1.75, angle: 1.2, length: 1.18, width: 0.27 },
    { y: -1.24, angle: 3.25, length: 1.03, width: 0.24 },
    { y: -0.76, angle: 5.3, length: 0.86, width: 0.21 },
    { y: -0.28, angle: 2.0, length: 0.7, width: 0.18 }
  ];
  leafLevels.forEach((item, index) => {
    const anchor = new THREE.Group();
    anchor.position.set(item.y * -0.025, item.y, 0);
    anchor.rotation.y = item.angle;
    const leaf = makeLobedLeaf(index % 2 ? leafLight : leafMaterial, item.length, item.width, 5 + (index % 2));
    leaf.rotation.z = index % 2 ? -0.17 : 0.14;
    anchor.add(leaf);
    root.add(anchor);
  });

  const head = new THREE.Group();
  head.position.set(0, 1.18, 0);
  root.add(head);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.88, 40, 32),
    new THREE.MeshStandardMaterial({ color: '#4a1c94', roughness: 0.7, emissive: '#26094d', emissiveIntensity: 0.48 })
  );
  bulb.scale.set(1, 0.9, 0.98);
  head.add(bulb);

  // Ten staggered rings contain 260 overlapping, spiky involucral bracts.
  const ringCounts = [14, 18, 22, 24, 26, 28, 30, 32, 34, 32];
  const rings = [];
  ringCounts.forEach((count, index) => {
    rings.push(makeBractRing(index, count, 0.66 + index * 0.018, -0.5 + index * 0.085, head, bractMaterials));
  });

  // Blend-like flower head: 1,000 inner florets and 520 outer florets.
  const inner = makeFloretInstances(head, 1000, 0.78, 0.42, ['#7c35d8', '#a64cff', '#d18cff', '#f2c3ff'], 3);
  const outer = makeFloretInstances(head, 520, 0.94, 0.34, ['#6424bd', '#963be8', '#c16bff', '#f0aaff'], 11);
  head.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 24, 20),
    new THREE.MeshStandardMaterial({ color: '#e3a7ff', emissive: '#a84cff', emissiveIntensity: 1.25, roughness: 0.42 })
  ));

  const pollenCount = 130;
  const pollenPositions = new Float32Array(pollenCount * 3);
  const pollenSeeds = [];
  for (let i = 0; i < pollenCount; i++) {
    const angle = i * 2.399963;
    const radius = 1.05 + (i % 13) * 0.035;
    const y = -0.15 + ((i * 17) % 31) * 0.035;
    pollenPositions[i * 3] = Math.cos(angle) * radius;
    pollenPositions[i * 3 + 1] = y;
    pollenPositions[i * 3 + 2] = Math.sin(angle) * radius;
    pollenSeeds.push({ angle, radius, y, phase: i * 0.73, speed: 0.2 + (i % 7) * 0.035 });
  }
  const pollenGeometry = new THREE.BufferGeometry();
  pollenGeometry.setAttribute('position', new THREE.BufferAttribute(pollenPositions, 3));
  const pollen = new THREE.Points(pollenGeometry, new THREE.PointsMaterial({
    color: '#d7a2ff', size: 0.045, transparent: true, opacity: 0.82,
    sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  root.add(pollen);

  return { root, head, rings, pollen, pollenSeeds, inner, outer };
}

export function createNeonThistle(canvas, { reducedMotion = false } = {}) {
  if (!canvas || !window.WebGLRenderingContext) {
    document.documentElement.classList.add('no-webgl');
    return { destroy() {} };
  }

  let engine;
  let pointer;
  let flower;
  let frameId = 0;
  let active = false;
  let destroyed = false;
  let scrollVelocity = 0;
  let scrollTarget = 0;
  let previousScroll = window.scrollY;
  let previousTime = performance.now();

  try {
    engine = new Engine({
      canvas, fov: 32, near: 0.1, far: 60, dpr: 2,
      background: null, shadows: false, alpha: true, post: false
    });
    engine.scene.background = null;
    engine.renderer.setClearColor(0x070a14, 0);
    engine.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    engine.renderer.toneMappingExposure = 1.35;
    engine.camera.position.set(0, -0.25, 13.5);
    engine.camera.lookAt(0, -0.55, 0);

    engine.scene.add(new THREE.HemisphereLight(0x9bb0ff, 0x14281f, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(3, 5, 5);
    engine.scene.add(key);
    const violetRim = new THREE.PointLight(0xb283ff, 1.8, 22);
    violetRim.position.set(-4, 2, -3);
    engine.scene.add(violetRim);
    const greenRim = new THREE.PointLight(0x6fe0a0, 1.1, 18);
    greenRim.position.set(4, -2, -2);
    engine.scene.add(greenRim);

    flower = createFlower();
    engine.scene.add(flower.root);
    pointer = new Pointer({ lambda: 6 });

    const resizeScene = () => {
      const mobile = window.innerWidth <= 820;
      flower.root.position.set(mobile ? 0 : 3.05, mobile ? 1 : -0.15, 0);
      flower.root.scale.setScalar(mobile ? 0.77 : 0.92);
      engine.camera.position.set(0, mobile ? -0.05 : -0.2, mobile ? 15.6 : 13.5);
      engine.camera.lookAt(mobile ? 0 : 0.8, mobile ? -0.85 : -0.55, 0);
    };
    engine.onResize(resizeScene);

    const onScroll = () => {
      const now = performance.now();
      const delta = window.scrollY - previousScroll;
      const elapsed = Math.max(16, now - previousTime);
      scrollTarget = clamp((delta / elapsed) * 16, -3.5, 3.5);
      previousScroll = window.scrollY;
      previousTime = now;
      if (active && !reducedMotion) startLoop();
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const observer = new IntersectionObserver(entries => {
      const visible = entries[0]?.isIntersecting ?? false;
      if (visible && !document.hidden && !reducedMotion) startLoop();
      else stopLoop();
    }, { threshold: 0.02 });
    observer.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else if (!reducedMotion && canvas.getBoundingClientRect().bottom > 0 && canvas.getBoundingClientRect().top < innerHeight) startLoop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let bloomStarted = false;
    const draw = (time, dt) => {
      pointer.update(dt);
      scrollVelocity = damp(scrollVelocity, scrollTarget, 3.2, dt);
      scrollTarget = damp(scrollTarget, 0, 2.2, dt);
      flower.root.rotation.y = damp(
        flower.root.rotation.y,
        pointer.sx * 0.11 + scrollVelocity * 0.045 + Math.sin(time * 0.24) * 0.025,
        2.1, dt
      );
      flower.root.rotation.z = damp(flower.root.rotation.z, -pointer.sy * 0.045 + Math.sin(time * 0.38) * 0.012, 2, dt);
      flower.root.position.y = (window.innerWidth <= 820 ? 1 : -0.15) + Math.sin(time * 0.55) * 0.045;
      flower.head.rotation.y = Math.sin(time * 0.3) * 0.055 + pointer.sx * 0.055;
      flower.head.rotation.x = damp(flower.head.rotation.x, pointer.sy * 0.045, 2.2, dt);
      key.position.x = 3 + pointer.sx * 0.4;

      const positions = flower.pollen.geometry.attributes.position.array;
      flower.pollenSeeds.forEach((seed, index) => {
        const drift = time * seed.speed + seed.phase + scrollVelocity * 0.28;
        positions[index * 3] = Math.cos(seed.angle + drift * 0.15) * (seed.radius + Math.sin(drift) * 0.12);
        positions[index * 3 + 1] = seed.y + Math.sin(drift * 1.7) * 0.18 + scrollVelocity * 0.025;
        positions[index * 3 + 2] = Math.sin(seed.angle + drift * 0.15) * (seed.radius + Math.cos(drift) * 0.12);
      });
      flower.pollen.geometry.attributes.position.needsUpdate = true;
      engine.render(dt);
    };

    function startLoop() {
      if (active || destroyed || document.hidden || reducedMotion) return;
      active = true;
      let last = performance.now();
      if (!bloomStarted) {
        bloomStarted = true;
        flower.rings.forEach((ring, index) => {
          ring.scale.setScalar(0.03);
          const delay = index * 0.11;
          const start = performance.now() + delay * 1000;
          const animateRing = now => {
            if (destroyed) return;
            const progress = clamp((now - start) / 800, 0, 1);
            ring.scale.setScalar(0.03 + (1 - Math.pow(1 - progress, 3)) * 0.97);
            if (progress < 1 && active) requestAnimationFrame(animateRing);
          };
          requestAnimationFrame(animateRing);
        });
      }
      const loop = now => {
        if (!active || destroyed) return;
        const dt = Math.min((now - last) / 1000, 1 / 20);
        last = now;
        draw(now / 1000, dt);
        frameId = requestAnimationFrame(loop);
      };
      frameId = requestAnimationFrame(loop);
    }

    function stopLoop() {
      active = false;
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
    }

    if (reducedMotion) {
      flower.rings.forEach(ring => ring.scale.setScalar(1));
      draw(0, 1 / 60);
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.add('webgl-ready');
    }

    return {
      destroy() {
        destroyed = true;
        stopLoop();
        observer.disconnect();
        window.removeEventListener('scroll', onScroll);
        document.removeEventListener('visibilitychange', onVisibility);
        engine?.renderer.dispose();
      }
    };
  } catch (error) {
    console.warn('The 3D thistle could not initialise; showing the CSS fallback.', error);
    document.documentElement.classList.add('no-webgl');
    engine?.renderer.dispose();
    return { destroy() {} };
  }
}
