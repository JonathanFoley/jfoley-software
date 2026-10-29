# JFoley Software

**Braw websites for wee businesses.**

A Scottish-inspired one-page website for an independent web studio. The design pairs a deep navy base with thistle green and heather purple, and uses a procedural 3D thistle as the centrepiece of a scroll-led story.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Create a production build with `npm run build`, then preview it with `npm run preview`.

## What's included

- Procedural Three.js thistle with individually modelled petals, bracts, stem and leaves — no downloaded 3D model required.
- Dioramas `Engine` render loop and GSAP/Lenis smooth-scroll helpers.
- Scroll-led hero, services, approach, selected-work and contact sections.
- Responsive mobile navigation, keyboard focus states, reduced-motion support and a CSS fallback if WebGL is unavailable.
- Responsive styling and SEO/social metadata.

## Framework credit and licence

The rendering, scroll and pointer foundations in `src/dioramas/core/` are adapted from [Dioramas](https://github.com/blendi-remade/dioramas), © 2026 Blendi, under the MIT License. The original licence is included at [src/dioramas/LICENSE](src/dioramas/LICENSE). The JFoley Software site content, layout, procedural thistle and styling are original to this project.

## Before launch

- Confirm the contact email used in `index.html` and `src/main.js` is the address you want published.
- Replace the two clearly labelled concept projects with real client work or remove them.
- Add a favicon and final social links if you want them.
- Run `npm run build` locally before deploying.
