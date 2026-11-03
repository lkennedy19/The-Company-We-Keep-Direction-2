# Magnet / Mirror

A small browser tool that turns any SVG into a repeating grid and animates it around a moving point.

- **Magnet** — every element turns toward the magnet (orbit or point field).
- **Mirror** — the point carries an invisible mirror; one side of the grid is reflected onto the other.

The point follows your cursor, wanders on its own, or both (cursor, then wandering after 3 s idle).

## Run

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Use

- Pick a preset shape, type a word, or add / drag in one or more `.svg` files. Several shapes are scattered randomly; **Shuffle** re-deals them.
- Uploaded SVGs are flattened to the Shape colour unless **Keep SVG colours** is on.
- **Save PNG** downloads the current frame.
