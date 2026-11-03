# Magnet / Mirror

A browser tool that turns SVG shapes into organic particle compositions.

- **Magnet** — particles flow into rings (or a spiral) around a moving pole, like iron filings.
- **Mirror** — a slow liquid folded down an invisible centre line, like an inkblot; the pointer presses into it on both sides.

Both share one look: particles can stay crisp or melt together (Goo), with optional Relief shading, print Grain and two-colour palettes. The pole follows your cursor, wanders on its own, or both (cursor, then wandering after 3 s idle).

## Run

No build step. Open `index.html` in a browser that supports WebGL 2, or serve the folder:

```bash
python3 -m http.server 8000
```

## Use

- Pick a preset shape, type a word, or add / drag in one or more `.svg` files. Several shapes are scattered randomly; **Shuffle** re-deals them.
- Uploaded SVGs are used as silhouettes and drawn in the palette's ink colour.
- **Save PNG** downloads the current frame.
