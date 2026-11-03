# Roadmap

Legend: 🟡 in progress / awaiting review · ~~done~~ (approved)

## Now

- 🟡 **Magnet / Mirror grid tool v1** — upload any SVG, repeat it across a grid, animate it with a cursor-driven or self-driven point.
  - 🟡 Magnet mode (orbit / point field, twist, reach)
  - 🟡 Mirror exploration — three candidate tabs to choose between:
    - 🟡 Mirror · Twin — the magnet has a reflected twin on the other half of the grid
    - 🟡 Mirror · Mimic — elements copy the pointer's direction of travel, spreading outward with delay
    - 🟡 Mirror · Pool — bottom half reflects the top half like water (lagged, rippling, fading)
    - (First round — Fold / Kaleido / Ripple — rejected: they read as flipping tiles rather than a mirror)
  - 🟡 Pick the winning Mirror direction (or a blend) and retire the others

## Next

- Design system page (none exists yet; tokens currently live at the top of `css/styles.css`)

## Backlog

- Export animation as video / GIF (currently PNG stills only)
- Save and share presets (all settings as JSON or URL)
- Multiple magnets / multiple mirror points
- Per-element variation (random size or rotation jitter)
