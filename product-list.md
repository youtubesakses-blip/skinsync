# Product Listing Reference: Framer-style Scroll (Aurelle Didone System)

Purpose: learning material for an AI that will build ONLY the product listing section of a skincare store. Scope is the product display. Do not redesign the rest of the page from this file. Apply the principles and code patterns, not the brand name, copy or prices.

## 1. What "Framer-style scroll" means here

Motion is driven by scroll position, not by timers. The user's scroll is the playhead. Four traits define the feel:

1. **Pinned stage + scrubbed progress.** A tall section holds a `position: sticky` viewport; scroll distance becomes a 0..1 value `--p`.
2. **Layers move at different speeds** (parallax): image, label and text each respond to `--p` with different multipliers.
3. **Smooth, eased, never abrupt.** Scroll-linked values are written continuously; discrete changes (active item) use `cubic-bezier(.16,1,.3,1)` transitions.
4. **Staggered entrances.** Anything entering the viewport rises in with per-element delays (40 to 90ms steps, 38ms per word for text).

No animation library is required. One rAF-throttled scroll handler writes CSS custom properties; CSS does the rest.

## 2. Visual rules for the product section (keep from the design system)

- Palette: ground `#F7F7F4`, paper `#E4E5E0`, blush `#F3D6DC`, ink `#070707`, sage `#B7BAA9`, accent pink `#EF6F79` (prices, index numbers, ONE add-to-cart button only).
- Font: Bodoni Moda only (roman + italic). Furniture: 10.5px, `.18em`, uppercase, weight 500.
- Radius 0, no shadows, no gradients, no icons, no badges, hairline 1px ink rules.
- Product photos: warm, natural light, unpeopled still life, placed with `mix-blend-mode: multiply` on light grounds. Use a consistent aspect ratio (4/5) for every product.
- Ease: `cubic-bezier(.16,1,.3,1)`.

## 3. Product data (single source of truth)

```js
const products = [
  { id: 'cleanser', index: '01', name: 'Gentle Cleanser', note: 'Oat & chamomile, 100 ml', price: 'Rp 129.000', img: '...', tag: 'Pagi & malam' },
  { id: 'serum',    index: '02', name: 'Serum Cahaya',    note: 'Niacinamide 5% & hyaluronic, 30 ml', price: 'Rp 219.000', img: '...', tag: 'Pagi & malam' },
  { id: 'cream',    index: '03', name: 'Krim Embun',      note: 'Lightweight moisturiser, 50 ml', price: 'Rp 189.000', img: '...', tag: 'Malam' },
  { id: 'sun',      index: '04', name: 'Mineral Sun SPF 50', note: 'No white cast, 40 ml', price: 'Rp 169.000', img: '...', tag: 'Pagi' },
];
```
Render from this array so a real catalog can replace it. Every product shows: index numeral (pink), name (bold), italic note, tag (furniture), price (pink).

## 4. Pattern A (recommended): Pinned horizontal product rail

Vertical scroll moves the products sideways while the section stays pinned. This is the closest match to the Framer look.

### Markup
```html
<section class="rail-stage" id="produk">
  <div class="rail-pin">
    <header class="rail-head">
      <h2 data-split>Koleksi <em>harian</em></h2>
      <span class="fur" id="counter">01 / 04</span>
    </header>
    <div class="track" id="track">
      <article class="card" data-i="0">
        <div class="shot"><img src="..." alt="Gentle Cleanser"></div>
        <div class="meta">
          <i>01</i><b>Gentle Cleanser</b>
          <em>Oat &amp; chamomile, 100 ml</em>
          <span class="fur">Pagi &amp; malam</span>
          <s>Rp 129.000</s>
          <a class="add" href="#">Tambah ke keranjang</a>
        </div>
      </article>
      <!-- repeat -->
    </div>
    <div class="bar"><i></i></div>
  </div>
</section>
```

### CSS
```css
.rail-stage{position:relative;height:var(--h,400svh)}            /* height set by JS */
.rail-pin{position:sticky;top:0;height:100svh;overflow:hidden;display:flex;flex-direction:column;justify-content:center;background:#F7F7F4}
.rail-head{display:flex;justify-content:space-between;align-items:baseline;padding:0 5vw 4vh}
.track{display:flex;gap:4vw;padding:0 5vw;width:max-content;
  transform:translate3d(calc(var(--p,0) * var(--max,0) * -1px),0,0);will-change:transform}
.card{width:min(38vw,520px);flex:none;opacity:.35;transition:opacity .6s cubic-bezier(.16,1,.3,1)}
.card.on{opacity:1}
.shot{aspect-ratio:4/5;overflow:hidden;background:#E9D3C0}
.shot img{width:100%;height:100%;object-fit:cover;mix-blend-mode:multiply;
  transform:scale(1.15) translateX(calc((var(--p,0) - var(--cp,0)) * -40px))}  /* inner parallax */
.meta{display:grid;grid-template-columns:40px 1fr auto;gap:6px 12px;align-items:baseline;border-top:1px solid #070707;padding-top:14px;margin-top:14px}
.meta i{color:#EF6F79;font-style:normal;font-size:11px;letter-spacing:.18em}
.meta b{font-weight:600;font-size:1.3rem}
.meta s{text-decoration:none;color:#EF6F79;font-weight:600;font-size:1.3rem}
.meta em{grid-column:2/-1}
.add{grid-column:2/-1;justify-self:start;margin-top:10px;background:#EF6F79;color:#070707;padding:14px 26px;
  font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;font-weight:600;text-decoration:none}
.bar{position:absolute;left:5vw;right:5vw;bottom:5vh;height:1px;background:rgba(7,7,7,.2)}
.bar i{display:block;height:1px;background:#EF6F79;transform-origin:0 50%;transform:scaleX(var(--p,0))}
@media(max-width:700px){.card{width:78vw}}
```

### JS (one rAF scroll handler)
```js
const stage = document.querySelector('.rail-stage');
const track = document.getElementById('track');
const cards = [...track.children];
const counter = document.getElementById('counter');
let last = -1, tick = false;

function measure(){
  const max = track.scrollWidth - innerWidth;           // horizontal distance to travel
  stage.style.setProperty('--max', max);
  stage.style.setProperty('--h', (max + innerHeight * 1.2) + 'px'); // vertical scroll budget
}
function update(){
  tick = false;
  const r = stage.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
  stage.style.setProperty('--p', p.toFixed(4));
  const i = Math.min(cards.length - 1, Math.round(p * (cards.length - 1)));
  if (i !== last){                                       // only touch DOM when active item changes
    last = i;
    cards.forEach((c, k) => c.classList.toggle('on', k === i));
    counter.textContent = String(i + 1).padStart(2,'0') + ' / ' + String(cards.length).padStart(2,'0');
  }
}
addEventListener('scroll', () => { if(!tick){ tick = true; requestAnimationFrame(update) } }, {passive:true});
addEventListener('resize', () => { measure(); update() });
measure(); update();
```
Important: measure after images load (or give `.shot` a fixed aspect ratio so widths are stable) so `--max` is correct.

## 5. Pattern B: Stacked sticky cards (alternative)

Each product is a full-width card that sticks and is covered by the next one, with the covered card scaling slightly down.

```css
.stack{position:relative}
.sc{position:sticky;top:calc(8svh + var(--k) * 14px);height:84svh;display:grid;grid-template-columns:1fr 1fr;
  background:var(--bg);border-top:1px solid #070707}
.sc:nth-child(odd){--bg:#F3D6DC}.sc:nth-child(even){--bg:#E4E5E0}
.sc .shot{height:100%;aspect-ratio:auto}
.sc{transform:scale(calc(1 - var(--depth,0) * .04));transform-origin:50% 0}
```
```js
// --depth for card k = how far the next card has covered it (0..1)
cards.forEach((c,k)=>{ const n = cards[k+1]; if(!n) return;
  const d = Math.min(1, Math.max(0, 1 - n.getBoundingClientRect().top / innerHeight));
  c.style.setProperty('--depth', d.toFixed(3)) });
```
Set `style="--k:0"`, `--k:1`, ... on each card. Use this when there are 3 to 6 hero products.

## 6. Pattern C: Ruled index list with image preview (for the full catalog)

For larger catalogs: ruled text rows (index, name, italic note, price) with a floating multiplied image that follows the active row.

```css
.list .row{display:grid;grid-template-columns:48px 1.2fr 2fr auto;gap:24px;align-items:baseline;padding:22px 0;border-top:1px solid #070707}
.list .row:hover b{font-style:italic}
.preview{position:fixed;width:260px;aspect-ratio:4/5;pointer-events:none;mix-blend-mode:multiply;
  opacity:0;transition:opacity .4s cubic-bezier(.16,1,.3,1)}
.list:hover .preview{opacity:1}
```
Move the preview with `transform: translate3d(x,y,0)` from `mousemove` (rAF-throttled). On touch devices hide the preview and show each row's image inline.

## 7. Entrance motion (all patterns)

- Split headings into per-word `inline-block` spans, rise `.4em`, `transition-delay: calc(var(--i) * 38ms)`.
- Give every card/row `data-rev` with `--d: calc(70ms * index)`; one `IntersectionObserver` (threshold `.12`) adds `.in`.
- Opacity + `translateY(18px)` only. No scale bounces, no rotation, no blur.

## 8. Hover and focus

- Card hover: image scale `1.15 → 1.2` over 900ms with the shared ease; name turns italic. No shadow, no lift.
- Add-to-cart: the only pink button in view; on hover shift background to ink and text to plaster.
- Keyboard: cards are focusable; focus ring is a 1px ink outline offset 4px.

## 9. Accessibility and performance

- `prefers-reduced-motion`: remove the pinned stage, show products as a normal horizontally scrollable row (`overflow-x:auto; scroll-snap-type:x mandatory`) or a vertical grid; remove parallax; show all cards at full opacity.
- Mobile: horizontal pin works, but cap card width at 78vw and shorten the vertical budget. If it feels sticky or janky, fall back to the `overflow-x:auto` snap row.
- Animate only `transform` and `opacity`; use `will-change: transform` on the track only.
- Always give images `width/height` or an aspect-ratio box to avoid layout shift that breaks `--max`.
- Never put the rail inside a parent with `overflow:hidden`, which breaks `position:sticky`.

## 10. Anti-patterns (this is what makes a store look AI-generated)

Rounded product cards with shadows, star-rating widgets, "Best seller" badges, gradient overlays on photos, icon rows, hover zoom with bounce, identical fade-up on every element, carousel arrows and dots, and generic copy. Replace with hairline rules, multiplied photography, italic specifics and scroll-scrubbed motion.
