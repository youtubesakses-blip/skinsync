# Design Reference: Aurelle (Natural Skincare Landing Page)
 
Purpose: learning material for an AI that will redesign a skincare sales website. Read it as a set of design decisions and the reasons behind them, then apply the decisions to the new site. Do not copy the brand name, copy text or prices. The companion file `aurelle-skincare.html` is the working implementation of everything below.
 
## 1. Summary
 
A scroll-choreographed landing page for a boutique skincare house. Didone editorial register: plaster off-white ground, tinted blush and paper bands, near-black ink, sage secondary, and ONE dusty pink accent. A single serif family (Bodoni Moda, roman and italic) does every job, from 10.5px tracked small-caps furniture to a poster wordmark. A script face (Caveat Brush) appears exactly three times, always pink, always rotated 1 to 2 degrees.
 
Three pinned (sticky) stages carry the story: a hero where the photograph is multiplied into the page with the wordmark on top, a bottom-up clip-path image reveal with a difference-blended headline, and a ritual stage where four steps light up cumulatively beside a scaling product still. Between them sit a blush statement band, a ruled price table and an FAQ.
 
## 2. Why this does NOT look like a typical AI-generated site
 
Use these as rules when redesigning. The usual AI look comes from the opposites.
 
| Typical AI-generated look | This system instead |
|---|---|
| Purple/blue gradients, glow, glassmorphism | Zero gradients, zero shadows, flat color bands |
| Rounded cards with soft shadows everywhere | Radius 0, hairline 1px rules, no cards |
| Inter/system sans for everything | One high-contrast Didone serif, used at extreme size contrast |
| Centered hero with headline, subtitle, two buttons | Poster wordmark printed THROUGH the photograph |
| Stock icons in a three-column feature grid | Ruled text rows with numbered index and italic descriptions |
| Emoji and decorative icons | No icons at all, typography is the ornament |
| Many accent colors | One accent (pink), rationed to specific jobs |
| Everything fades up identically | Per-word stagger plus per-element delays, scroll-scrubbed stages |
| Generic copy ("Elevate your skin") | Specific, quiet copy: ingredient percentages, durations, batch sizes |
 
Core principle: restraint plus one or two bold, unusual moves (multiply-blended photography, poster type). Everything else is quiet.
 
## 3. Style and tokens
 
Palette
- Ground (plaster): `#F7F7F4`
- Papers: `#F1F1ED`, `#E4E5E0`, `#E7E7E4`
- Blush bands: `#F3D6DC`, `#F5D9DF` (used as FULL bands, never as a tint on components)
- Ink: `#070707`
- Sage: `#B7BAA9`, `#AEB1A0`
- Grey furniture: `#999999` (use a darker `#3b3b38` where text crosses a bright photo)
- Accent (dominant): dusty pink `#EF6F79`
Pink is rationed to: the three script moments, index numerals, prices, the progress rail, one button, one label pill. Nowhere else.
 
Typography
- Bodoni Moda variable, weights 400/500/600, roman AND italic, for absolutely everything.
- Furniture (labels, nav, straps): 10.5px, `letter-spacing: .18em`, uppercase, weight 500.
- Display: tracking `-.03em` to `-.05em`, tight line-height (`.8` for wordmark, `.92 to 1` for headlines).
- Italic is used inside headlines for one emphasized clause, e.g. "Tiga langkah, *tanpa* drama."
- Caveat Brush: pink, rotated, at most three moments on the whole page.
Shape and depth: radius 0, no shadows, no gradients, hairline rules (1px ink) as the only structure.
 
Easing: `cubic-bezier(.16,1,.3,1)` everywhere.
 
Photography direction: warm, natural light, unpeopled still life of products (bottles, droppers, jars) on a neutral surface, in beige, sage and blush tones. Placed with `mix-blend-mode: multiply` on light grounds so the ink of the type passes through the picture. (The demo file uses an inline SVG placeholder; replace with real photos, embedded or hosted.)
 
## 4. Layout and structure
 
Three tall pinned stages (300 to 360svh), each a `position: sticky; top: 0; height: 100svh; overflow: hidden` inner, interleaved with normal bands on alternating tinted grounds.
 
Order: nav (fixed, difference-blended) → Hero stage → Reveal stage → Blush statement band (3 columns) → Ritual stage (near-black) → Paper band (price table + button + script note) → Blush FAQ → near-black footer.
 
All animated quantities are CSS custom properties written by ONE rAF-throttled scroll handler:
 
```js
// per .stage: p = progress 0..1 through its scroll distance
p = clamp(-rect.top / (rect.height - innerHeight), 0, 1);
stage.style.setProperty('--p', p.toFixed(4));
```
 
CSS then reads `var(--p)` inside `calc()`/`clamp()`. No animation libraries.
 
### 4.1 Multiply-blended photographic hero (300svh)
- Photo fills the pin, `mix-blend-mode: multiply`, `transform: translateY(calc(var(--p)*-3%)) scale(calc(1.04 + var(--p)*.07))`.
- Type block sits ABOVE the photo and is NOT blended, so letterforms read as printed into the still life. It lifts up to 46px and fades: `opacity: calc(1 - var(--p)*1.9)`.
- Content: pink script overline (rotated -2deg), then wordmark at weight 600, line-height `.8`, letter-spacing `-.05em`, `white-space: nowrap`.
- Size the wordmark from its character count, because Bodoni averages about `.60em` per character and a bare `vw` will clip longer names:
```css
font-size: min(clamp(3.5rem, 34vw, 20rem), calc(88vw / (CHARS * .60)));
```
  (Aurelle = 7 characters. `overflow:hidden` on the pin hides clipping from page-level checks, so verify visually.)
- Three furniture straps pinned across the base in the darker grey.
### 4.2 Bottom-up image reveal (320svh)
- Photo fills the pin with `clip-path: inset(0 0 calc(100% - var(--p)*100%) 0)`, so it wipes upward from the bottom edge.
- Headline absolutely centered, `color:#fff; mix-blend-mode: difference`, so it inverts against both pale ground and photo. It fades out as the reveal completes: `opacity: clamp(0, calc(1 - (var(--p) - .7)*3.4), 1)`.
- Caption bottom-left fades IN only after 45 percent: `opacity: clamp(0, calc((var(--p) - .45)*4), 1)`.
- Reduced motion: remove the clip-path AND return the headline to normal blending with ink color, otherwise it disappears.
### 4.3 Ritual rows on near-black (360svh)
- Two columns (stack on mobile). Left: headline with an italic clause, then four ruled rows at `.28` opacity: pink index numeral, bold name, right-aligned italic duration.
- Rows light cumulatively as `i = min(3, floor(p*4))`. Only touch the DOM when `i` changes (cache the last index).
- Right: product still in a 4/5 frame scaling `calc(1.08 - var(--p)*.08)`, with a solid pink pill label pinned to the lower-left corner.
- Skincare mapping: rows are the daily routine steps (Cleanse, Serum, Moisturise, Sunscreen) with time per step.
### 4.4 Bands
- Blush statement band: one large statement with an italic clause, a rotated pink script phrase, then three columns of bold small-caps label + short paragraph (Bersihkan / Perbaiki / Lindungi).
- Paper band: price table of ruled rows (bold name, italic description, pink price), collapsing to two columns under 700px; one pink button; one rotated script note.
- Blush FAQ: native `<details>` rows, CSS-only plus/minus via `summary::after`.
### 4.5 Per-atom motion
- Every headline, lede, statement and caption is split into per-word `inline-block` spans that rise `.4em` with `transition-delay: calc(var(--i) * 38ms)`.
- Every column, table row, composition row, FAQ summary, strap, button, nav link and footer line gets `data-rev` with `--d` of 40 to 90ms times its index.
- One `IntersectionObserver`, threshold `.12`, adds `.in`.
- Roughly 170 elements move independently. That density of small, staggered motion is part of the premium feel.
## 5. Special components (the signature moves)
 
1. Photograph in `multiply` beneath poster Didone type, so letterforms print through the picture.
2. Bottom-up clip-path reveal with a difference-blended headline crossing it.
3. Pink rotated script accents, rationed to three moments against an otherwise strict Didone.
4. Ritual rows advancing on a scroll-derived index beside a scaling product still.
## 6. Adapting this to a skincare store
 
Keep: the typography system, color rationing, hairline structure, multiply photography, scroll-scrubbed stages, per-word motion.
 
Replace with the client's reality:
- Real product photography (warm light, no people, simple surfaces) and real names, prices, ingredient percentages.
- Copy that is specific and calm. Prefer "Niasinamida 5%, 30 ml" over "Glow like never before".
- Add commerce pieces in the same language: price rows with a quiet add-to-cart link, a skin-type selector as ruled text rows (not rounded chips), testimonials as italic pull quotes with a hairline above. Avoid star-rating widgets and badge clutter.
- Keep ONE pink button per view.
## 7. Accessibility and robustness checklist
- `prefers-reduced-motion`: show all words/rows, remove transforms, remove clip-path, set the difference headline to normal ink color.
- Verify wordmark fit at 360px width and at 1440px.
- Furniture text over photos needs the darker grey for contrast.
- Respect safe-area insets on fixed elements; use `100svh` for pinned stages.
- Layout must not scroll horizontally; wide content scrolls inside its own container.
## 8. Anti-patterns to refuse when redesigning
Gradients, drop shadows, rounded cards, icon grids, emoji, glassmorphism, more than one accent color, sans-serif body text mixed in, centered "headline + subtitle + two buttons" heroes, stock-style generic copy, uniform fade-up on everything.