# Magnet / Mirror

A browser tool for animated diagram compositions of physical concepts, built from your own SVG shapes. Flat colour, print grain, seamless loops.

- **Magnet** — a bar magnet and its real field, traced from pole to pole. Your module flows along the field loops; the outer loop is a solid field shape; a few flaring hairlines run beyond it.
- **Mirror** — a plane mirror. Your object sits in front and its image the same distance behind, reversed. Rays bounce off at equal angles carrying your module; dashed hairlines trace them back to the image. Echoes of the object fold toward the mirror and back.

## Run

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Use

- **Shapes:** add one or more `.svg` files (or drag them onto the canvas). Pick which shape is the **module** (the repeated element) and which is the **object** (what faces the mirror). Uploads are used as silhouettes and coloured by the palette.
- **Motion:** by default the magnet / object follows your cursor and settles back to its home spot after 3 s idle, where it loops. *Loop in place* holds it there.
- **Record loop** saves exactly one loop length as a video (MP4 or WebM, depending on the browser) starting at the top of the loop, so it repeats seamlessly. **Save PNG** saves the current frame. Both need the tool running locally; the hosted preview cannot download files.
- **Canvas format:** fill the window, or fix it to 16:9, 1:1, 4:5 or 9:16.

## Adding a concept

Each concept is one file in `js/concepts/` exposing `{ id, label, blurb, params, createState, home(w, h, params), draw(ctx, env, params, state, library, colours) }`. Register it in the `concepts` list at the top of `js/app.js` and add its script tag to `index.html`.
