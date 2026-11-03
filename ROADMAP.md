# Roadmap

Legend: 🟡 in progress / awaiting review · ~~done~~ (approved)

## Now

- 🟡 **Magnet / Mirror v2 — organic particle direction** (after print references: Mixtur, Clamart, Raya × Nachtkantoor)
  - 🟡 Shared engine: SVGs become particles that gather on the contours of a field; WebGL goo (blur + threshold), relief, grain, two-colour palettes
  - 🟡 Magnet: particles flow into wobbly rings / a spiral around a moving pole
  - 🟡 Mirror: liquid noise field folded across an invisible centre line (inkblot); pointer presses into it on both sides. Lines or Blots form; left/right or top/bottom fold
  - 🟡 Multiple SVG uploads scattered across the particles, with Shuffle
  - Explored and rejected: v1 rigid grid (Magnet + Fold / Kaleido / Ripple, then Twin / Mimic / Pool, then grid Mirror) — too rigid, and Mirror read too close to Magnet

## Next

- Design system page (none exists yet; tokens currently live at the top of `css/styles.css`)

## Backlog

- Export animation as video / GIF (currently PNG stills only)
- Save and share presets (all settings as JSON or URL)
- Multiple magnets
- Keep uploaded SVG colours (the goo pipeline is currently single-ink)
- Save and load compositions; export at print size
