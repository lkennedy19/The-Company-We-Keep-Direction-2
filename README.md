# Magnet / Mirror

A browser tool for diagram compositions of physical concepts, built from your own SVG shapes, in flat colour with print grain. Each composition is one simple, scientifically grounded idea. Nothing moves on its own: you make the motion by working the controls, and changes ease smoothly so they can be recorded.

## Compositions

**Magnet** — a uniformly magnetised bar, modelled as its two end faces carrying opposite, evenly spread magnetic charge; the field is summed in 3D and drawn in the plane through the bar's axis.
- **Field lines** — field lines spaced so each band between neighbours carries the same flux: bands are thin where the field is strong. Styles: alternating bands, solid with the lines cut out, or plain lines.
- **Compasses** — a staggered grid of compass needles (rows of your module), each lying along the field, its tinted north end pointing the way the field points.

**Mirror** — plane mirrors; images are exact reflections across the mirror surface.
- **Reflection** — object and image: same size, same distance, reversed.
- **Mirror pair** — an object between two parallel mirrors; images repeat both ways, every second one reversed, same-facing images every 2 × the gap.
- **Rays** — rays (rows of your module) hit the mirror and leave at the angle they arrived; dashed lines trace them back to the image.

## Run

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Use

- **Shapes:** add `.svg` files (or drag them onto the canvas). Each composition keeps its own module / object choice. Uploads are silhouettes coloured by the palette.
- **Transition smoothing** (Canvas section) sets how quickly the drawing eases to new control values; 0% is instant.
- **Start recording** captures the canvas while you work the controls; press again to stop and save a video (MP4 or WebM, depending on the browser). **Save PNG** saves a still. Both need the tool running locally; the hosted preview cannot download files.

## Adding a composition

Add a file in `js/concepts/` that pushes `{ id, group, label, blurb, params, draw(ctx, env, params, library, colours) }` onto `MM.compositions` (shared physics lives in `magnet-physics.js` and `mirror-optics.js`). Add its script tag to `index.html`; add a new group to `GROUPS` in `js/app.js` for a new concept. Params of `type: 'shape'` become shape pickers; `snap: true` skips easing for counts.
