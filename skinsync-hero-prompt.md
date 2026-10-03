# SkinSync: Homepage Hero Prompt (top section only)

Scope: ONLY the first screen block of the homepage (the hero). Do not build the product list, footer or other sections from this file.

Brand: **SkinSync**, written as two spans on one line: **Skin** + **Sync**.

Design system to follow: Didone editorial. Bodoni Moda (roman + italic), plaster ground `#F7F7F4`, ink `#070707`, blush `#F3D6DC`, ONE accent dusty pink `#EF6F79`. Radius 0, no shadows, no gradients (except the duotone overlay described below). Ease `cubic-bezier(.16,1,.3,1)`.

---

## 1. Image slot (exactly ONE image)

- Use a single warm, natural-light, unpeopled still life of the product (bottle, dropper or jar on a neutral surface).
- File: `hero.webp` (fallback `hero.jpg`), about 2400px wide, under 300 KB, landscape or near-square with the subject centered so it survives `object-fit: cover` on mobile and desktop.
- Place it with `object-fit: cover` filling the whole pin, and `mix-blend-mode: multiply` on the light ground.
- Reference it from one place only so it is trivial to swap:

```html
<img class="hero-img" src="/assets/hero.webp" alt="SkinSync serum bottle on a pale surface" width="2400" height="1600" fetchpriority="high">
```
- If the file is not yet available, use a flat-color placeholder block with the same aspect ratio. Never use a remote hotlinked image.

---

## 2. Master prompt (paste this to the AI)

```
Build the hero for SkinSync as a 300svh stage with a position:sticky inner pin (top:0, height:100svh, overflow:hidden). Drive everything from ONE rAF-throttled scroll handler that writes a progress value --p (0 to 1) on the stage; CSS reads it through calc(). Nothing may depend on a timer, so every effect plays in reverse when the reader scrolls up.

LAYERS (back to front):
1. The single hero image (object-fit: cover, mix-blend-mode: multiply).
2. A duotone overlay (ink to blush) whose opacity rises from 0 to about .22 across the stage.
3. The wordmark, split into two inline-block spans on ONE line: "Skin" and "Sync", Bodoni Moda 600, line-height .8, white-space: nowrap.
4. Two opaque portal panels, left and right, each 50.5vw wide, plaster #F7F7F4, meeting in the middle so the hero begins CLOSED.
5. Two small pink accent dots (10px circles) at the centre seam.
6. Furniture straps at the base (10.5px, .18em, uppercase) such as "Personalised skincare", "Dermatologically tested", "Scroll".

PHASE A, portal opens (--p from 0 to .5):
- Left panel translateX from 0 to -105% of its own width, right panel from 0 to +105%, so both clear the frame completely.
- The image settles from scale(1.12) down to scale(1).
- The duotone overlay rises from 0 to .22.
- The two dots travel outward from the centre toward opposite corners (top-left and bottom-right) while staying pink.

PHASE B, title opens (--p from .3 to 1):
- Scale the whole wordmark UP modestly, 1 to 1.12.
- SIMULTANEOUSLY tighten its letter-spacing from -.02em to -.07em. Growing and tightening together is the entire point: it reads as a title opening, not a plain zoom. Doing only one loses the effect.
- Translate "Skin" left and "Sync" right by roughly half their own width.
- Bodoni is a wide face, so keep the tightening gentle; verify that no letters collide at the starting state.

Wordmark sizing (8 characters, Bodoni averages about .60em per character):
font-size: min(clamp(3.5rem, 30vw, 18rem), calc(88vw / (8 * .60))); white-space: nowrap.
Check visually at 360px and 1440px width, because overflow:hidden on the pin hides clipping.

Use easing only for discrete changes. Scroll-linked values are written linearly from --p and eased with a small smoothing in CSS (transition: transform .15s linear is acceptable).

Accessibility: under prefers-reduced-motion, remove the panels, show the image at scale 1, show the wordmark as one readable line with normal letter-spacing, and keep the straps. Add aria-label="SkinSync" on the h1 and aria-hidden on the two decorative spans if they read awkwardly.
```

---

## 3. The two source prompts (kept as the original references)

### 3.1 Title opens
```
Split the wordmark into two spans on one line. As scroll progresses through the hero, scale the whole title UP by a modest amount while SIMULTANEOUSLY tightening its letter-spacing, and translate the first span left and the last span right by roughly half their own width. Growing and tightening at the same time is the entire point: it reads as a title opening rather than a plain zoom, and doing one without the other loses the effect. Pick the exact amounts against your own typeface; a wide geometric face needs less tightening than a condensed one. Drive it all from scroll POSITION so it plays in reverse when the reader scrolls back up.
```

### 3.2 Portal opens
```
Two opaque panels start meeting in the middle so the hero begins closed. On scroll translate them outward past their own width so they clear the frame entirely, uncovering the image behind. At the same time settle the image from a slight overscale down to 1, raise a duotone overlay from zero to a low opacity, and send two accent dots travelling out toward opposite corners of the field. Keep every value bound to scroll position, never to a timer, so the portal closes again as the reader scrolls up.
```

---

## 4. Reference skeleton

```html
<section class="stage" id="hero">
  <div class="pin">
    <img class="hero-img" src="/assets/hero.webp" alt="..." width="2400" height="1600">
    <div class="duo"></div>
    <h1 class="mark" aria-label="SkinSync"><span class="a">Skin</span><span class="b">Sync</span></h1>
    <i class="panel l"></i><i class="panel r"></i>
    <b class="dot d1"></b><b class="dot d2"></b>
    <div class="straps"><span>Personalised skincare</span><span>Dermatologically tested</span><span>Scroll</span></div>
  </div>
</section>
```
```css
.stage{height:300svh;--p:0}
.pin{position:sticky;top:0;height:100svh;overflow:hidden;background:#F7F7F4}
.hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;mix-blend-mode:multiply;
  transform:scale(calc(1.12 - min(var(--p)/.5,1)*.12))}
.duo{position:absolute;inset:0;background:#EF6F79;mix-blend-mode:color;opacity:calc(min(var(--p)/.5,1)*.22)}
.mark{position:absolute;inset:0;display:flex;justify-content:center;align-items:center;white-space:nowrap;font-weight:600;line-height:.8;
  font-size:min(clamp(3.5rem,30vw,18rem),calc(88vw/(8*.60)));
  --t:clamp(0,calc((var(--p) - .3)/.7),1);
  letter-spacing:calc(-.02em - var(--t)*.05em);
  transform:scale(calc(1 + var(--t)*.12))}
.mark .a{display:inline-block;transform:translateX(calc(var(--t)*-50%))}
.mark .b{display:inline-block;transform:translateX(calc(var(--t)*50%))}
.panel{position:absolute;top:0;bottom:0;width:50.5vw;background:#F7F7F4;--o:min(var(--p)/.5,1)}
.panel.l{left:0;transform:translateX(calc(var(--o)*-105%))}
.panel.r{right:0;transform:translateX(calc(var(--o)*105%))}
.dot{position:absolute;left:50%;top:50%;width:10px;height:10px;background:#EF6F79;border-radius:50%;--o:min(var(--p)/.5,1)}
.d1{transform:translate(calc(var(--o)*-42vw),calc(var(--o)*-38vh))}
.d2{transform:translate(calc(var(--o)*42vw),calc(var(--o)*38vh))}
```
```js
const s=document.getElementById('hero');let t=0;
addEventListener('scroll',()=>{if(t)return;t=1;requestAnimationFrame(()=>{t=0;
  const r=s.getBoundingClientRect();
  s.style.setProperty('--p',Math.min(1,Math.max(0,-r.top/(r.height-innerHeight))).toFixed(4));})},{passive:true});
```
Notes: the dots are the only place a radius is allowed (they are round by definition). If "Skin" and "Sync" overlap at the start, reduce the tightening amount or lower the base font size.

---

## 5. Checklist
- Exactly one image, loaded from one path.
- Panels begin closed and fully clear the frame by --p = .5.
- Wordmark grows and tightens at the same time, halves separate by about half their own width.
- Everything reverses on scroll-up (no timers, no one-way class toggles).
- Verified at 360px and 1440px, and with reduced motion.
