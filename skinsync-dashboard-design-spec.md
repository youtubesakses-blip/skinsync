# Design Reference: SkinSync Dashboard (adapted from the Aurelle landing system)

Purpose: learning material for an AI that will build the seller/admin DASHBOARD for a skincare store. The Aurelle landing page was a marketing piece (scroll theatre, poster type, pinned stages). A dashboard is a working tool (dense, repeated, fast). Keep the identity, drop the theatre. Do not copy brand copy or prices.

## 1. What carries over and what does not

| Landing page (Aurelle) | Dashboard (SkinSync) |
|---|---|
| Three pinned scroll stages | None. Normal scrolling, fixed shell |
| Poster wordmark through the photo | Small wordmark in the sidebar, one large numeral per screen at most |
| Per-word stagger on everything (~170 elements) | Short stagger on first load only, capped at 12 elements, then static |
| Pink script (Caveat Brush) x3 | At most ONE script moment: empty state or greeting. Optional |
| Multiply photography full-bleed | Multiply only on product thumbnails and one header still |
| Blush full bands | Blush used as a full-width highlight band for selected/active context (e.g. selected row group, alert band) |
| Price table of ruled rows | The core pattern: ALL data lives in ruled rows |

Keep: one Didone serif identity, radius 0, no shadows, hairline 1px rules, flat color bands, ONE accent, specific calm copy, cubic-bezier(.16,1,.3,1).

## 2. Why it will not look like a generic AI dashboard

| Generic AI dashboard | This system |
|---|---|
| Rounded cards with shadows in a grid | No cards. Ruled sections separated by hairlines |
| Gradient KPI tiles, glowing charts | Flat numerals in Bodoni, flat charts, zero gradients |
| Icon + label sidebar, icon on every stat | Text-only navigation, numbered index (01, 02...) |
| Rainbow status chips | Ink states plus one sage and one pink role (see section 5) |
| Inter everywhere | Bodoni Moda for headings, labels and figures |
| Emoji, illustrations, mascots | None. Typography is the ornament |

## 3. Tokens

Light (default)
- Ground `#F7F7F4`, paper `#E4E5E0`, paper-2 `#F1F1ED`, blush `#F3D6DC`, ink `#070707`, sage `#B7BAA9`
- Accent pink `#EF6F79` (non-text and large figures only, see accessibility)
- Furniture grey for dashboards: `#6B6B66` (the landing grey `#999999` is too faint for small UI text)
- Rule: `1px solid #070707`; soft rule `1px solid rgba(7,7,7,.18)`

Dark (provide it, dashboards get used at night)
- Ground `#070707`, paper `#141414`, text `#F7F7F4`, furniture `#A9A9A3`, rule `rgba(247,247,244,.3)`, accent pink unchanged, sage `#B7BAA9`
- Replace `mix-blend-mode: multiply` with normal blending (multiply on dark turns photos black). Put thumbnails on a `#E9D3C0` plate instead.

Define all as CSS custom properties on `:root`, redefine under `@media (prefers-color-scheme: dark)` guarded as `:root:not([data-theme="light"])`, and again under `:root[data-theme="dark"]`. Give `body` an explicit background.

Type scale (Bodoni Moda variable, opsz axis 6..96)
- Page title: 40 to 56px, weight 500, tracking `-.03em`, one italic clause allowed
- Section title: 24 to 28px, weight 500, tracking `-.02em`
- KPI figure: 56 to 88px, weight 500, tracking `-.04em`, optical size HIGH (opsz 96)
- Body and table text: 14 to 15px, weight 400 to 500, optical size LOW (opsz 6 to 14) so the hairlines do not break at small size
- Furniture (labels, column headers, nav): 10.5 to 11px, uppercase, `.18em`, weight 500
- Never use Bodoni below 12px for reading text

Numerals: use `font-variant-numeric: tabular-nums lining-nums` and right-align numeric columns. If Bodoni's figures do not align well, the SINGLE permitted exception is a neutral monospace used only inside dense numeric cells. State this exception in the code so it is not mistaken for a second brand font.

## 4. Shell layout

```
┌──────────┬───────────────────────────────────────────┐
│ SkinSync │  Page title            [search] [period]  │
│          ├───────────────────────────────────────────┤
│ 01 Ringkasan                                           │
│ 02 Pesanan      KPI strip (4 figures, hairlines)       │
│ 03 Produk       Chart band                             │
│ 04 Pelanggan    Ruled table                            │
│ 05 Laporan                                             │
└──────────┴───────────────────────────────────────────┘
```
- Left rail 232px, fixed, ground color, hairline on its right edge. Items are text with a pink index numeral (`01`). Active item: italic + 1px ink underline. No icons, no filled pill.
- Top bar: page title left, controls right, hairline below. Sticky with `top: env(safe-area-inset-top, 0px)`.
- Content max-width 1280px, side padding 32px (16px mobile). Sections separated by a 1px rule and 56px of space.
- Under 900px: the rail becomes a top row of text links that scrolls horizontally inside its own container; the page body never scrolls sideways.

## 5. Components

### KPI strip
Four figures in one row divided by vertical hairlines (not boxes): furniture label, huge numeral, italic delta line ("naik 12% dari minggu lalu"). Only the primary KPI numeral may be pink. Deltas are ink; never green/red arrows.

### Chart
- Flat, hairline gridlines at `rgba(7,7,7,.12)`, no fills, no gradient areas, no rounded bars, no shadows.
- Primary series ink; comparison series sage; ONE highlighted series or point in pink. Direct-label lines at their ends instead of a legend when possible.
- Axis labels in furniture style. Tooltip: ground plate with 1px ink border, radius 0.

### Ruled table (the core component)
- No zebra stripes, no cell borders: only a 1px rule between rows and a heavier 1px ink rule under the header.
- Header: furniture style. Row height 56px (44px dense mode toggle). Hover: row background `blush` at 40% opacity or just italicise the primary cell. Selected row: full-width blush band.
- Columns: index (pink), primary name (bold), italic secondary, status, numeric (right-aligned), action.
- Under 700px: each row collapses to two columns (name + figure), description on its own line.

### Status (no rainbow chips)
Express status with text + one typographic treatment:
- Selesai: normal weight, sage 1px dot or sage underline
- Diproses: italic
- Menunggu: furniture-grey text
- Dibatalkan: strikethrough
- Perlu tindakan: pink small caps plus a pink 1px underline (the only pink status)
Always include the word, never colour alone.

### Product manager rows
Thumbnail 64x80 (4/5) on a `#E9D3C0` plate with multiply, then name (bold), italic note (size, ingredient), stock figure, price (pink), toggle. Inline editing: the cell becomes an underline input (below).

### Forms
- Inputs: no box, only a 1px ink bottom rule, furniture label above, 44px min height. Focus: rule thickens to 2px; add a 1px ink outline offset 4px for keyboard focus.
- Select, date, search follow the same underline style.
- Validation: message in italic below the field, with an ink `Perlu diperbaiki` prefix; use the single destructive red `#B3261E` for error text only.
- Toggle: a 36x16 rectangular track (radius 0), knob a square, pink when on.

### Buttons
- Primary: solid pink `#EF6F79`, ink text, furniture type, radius 0. ONE per view.
- Secondary: 1px ink border, transparent. Tertiary: underlined italic text.
- Destructive: secondary style with `#B3261E` text; confirm in a dialog.

### Dialog, drawer, toast, empty state, loading
- Dialog/drawer: ground plate, 1px ink border, no shadow, dimmer `rgba(7,7,7,.5)`. Drawer from the right for order detail (width 520px).
- Toast: bottom-left plate with ink border, one line, auto-dismiss 5s, `role="status"`.
- Empty state: large italic sentence ("Belum ada pesanan hari ini.") and one pink Caveat Brush phrase at -2deg (this is the single allowed script moment).
- Loading: paper-colored static blocks that fade opacity 1 to .6 and back. No shimmer gradients.

## 6. Motion budget

- First load only: header and first 12 elements rise 12px with `--d` of 40 to 70ms steps and the shared ease. After that, no entrance animation on data refresh (it makes numbers feel unstable).
- KPI numerals may count up once over 900ms; skip when the value is unchanged.
- Hover/active transitions 200 to 300ms, only `opacity`, `transform`, `color`.
- Table sort/filter: crossfade rows over 200ms; never reorder with large movement.
- Sticky header, rail and drawers are the only elements allowed to stay in motion contexts. No parallax, no pinned stages, no clip-path reveals.
- `prefers-reduced-motion`: disable all of the above except instant state changes.

## 7. Accessibility and robustness (stricter than the landing page)

- Pink `#EF6F79` on plaster is about 2.7:1, which fails AA for small text. Use pink only for large figures (24px+), underlines, dots, indices at 11px WITH an ink label nearby, and button backgrounds (ink text on pink passes). For small pink text use `#C94B56`.
- Furniture grey `#6B6B66` on plaster passes AA; `#999999` does not.
- All interactive elements reachable by keyboard, visible focus, 44px minimum touch target.
- Tables use real `<table>`/`<th scope>`; collapsed mobile rows keep semantics via CSS, not by swapping markup.
- Charts need an adjacent text summary or data table for screen readers.
- Never rely on colour alone for status. Respect safe-area insets on fixed bars.

## 8. Master prompt (paste into the AI)

```
Build the SkinSync seller dashboard in the Aurelle Didone system, adapted for data work. 
Shell: 232px fixed left rail with text-only navigation (pink index numerals 01 to 05, active item italic with a 1px underline), sticky top bar with page title and controls, content max-width 1280px.
Style: Bodoni Moda only (opsz low for small text, high for large figures), plaster #F7F7F4 ground, ink #070707, blush #F3D6DC for selected bands, sage #B7BAA9 secondary, ONE accent pink #EF6F79. Radius 0, no shadows, no gradients, hairline 1px rules instead of cards, no icons, no emoji.
Screens: Ringkasan (4-figure KPI strip divided by hairlines, flat line chart with the primary series in ink and one highlight in pink, recent orders as a ruled table), Pesanan (ruled table with status as typography, not chips; right-side drawer for detail), Produk (rows with 4/5 thumbnails multiplied on a #E9D3C0 plate, name, italic note, stock, pink price, toggle, inline underline editing), Pelanggan, Laporan.
Behavior: motion only on first load (max 12 staggered elements, 40 to 70ms steps, cubic-bezier(.16,1,.3,1)); no pinned stages or parallax; KPI count-up once; reduced-motion respected. One pink primary button per view. Tabular, right-aligned numerals.
Provide light and dark themes via CSS custom properties (dark: #070707 ground, normal blending instead of multiply). Meet AA contrast: use #6B6B66 for furniture text and #C94B56 for small pink text. Under 900px the rail becomes a horizontally scrolling text row, tables collapse to two-column rows.
Refuse: card grids with shadows, gradient KPI tiles, rainbow status chips, icon sidebars, sans-serif body text, generic copy. Use specific Indonesian copy and real figures.
```

## 9. Checklist
- No cards, shadows, gradients, icons or emoji anywhere.
- Exactly one pink primary button per view; pink never carries meaning alone.
- Every status has a word and a typographic treatment.
- Tables are real tables, tabular numerals, right-aligned figures.
- Light and dark themes both work; photos adapt (multiply vs plate).
- Verified at 360px, 768px and 1440px, keyboard-only, and with reduced motion.
