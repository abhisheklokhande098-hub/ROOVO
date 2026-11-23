# ROOVO brand and theme
Theme: near-black canvas with the logo's orange-to-pink gradient. Colours live as CSS variables at the top of `src/app/globals.css` (--canvas, --surface, --ink, --brand-600, --g for the gradient). Change them there and the whole site follows.
Fonts: Sora (headings) and Figtree (body), loaded in `src/app/layout.tsx`.

## Logo files
- `public/logo.png`: header and sign-in logo (transparent). Replace this file to change the logo.
- `src/app/icon.png`, `src/app/apple-icon.png`, `public/icon-192.png`, `public/icon-512.png`: browser tab and phone home-screen icons (the swoosh above an R).
- `src/app/opengraph-image.png`: the picture shown when the link is shared on WhatsApp, Instagram and others.
- `src/lib/swoosh.ts`: vector version of the swoosh used for the animated line on the home page.
- `docs/brand/roovoo_square_logo.jpg`: your original artwork.

## Spelling note
The original artwork spells the name ROOVOO (two O's at the end). The site, domain and legal pages say ROOVO. The logo files above were rebuilt from your own letters as R-O-O-V-O so they match. If you decide the name should be ROOVOO, ask for the logo to be rebuilt and for the name to be changed on the site.

## Motion
Page entrance: `src/app/template.tsx` + `.page-enter` in globals.css. Top loading bar: `src/components/RouteProgress.tsx`. Scroll reveal: `src/components/Reveal.tsx`. Staggered grids: class `stagger`. All animation is switched off automatically for visitors who prefer reduced motion.
