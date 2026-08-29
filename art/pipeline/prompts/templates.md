# Prompt-template library (Stage 1)

The art director (Claude) builds every generation prompt from these templates.
The rule that keeps a *set* coherent: **the style-bible preamble is prepended to
every prompt**, and per-asset text only fills the subject/format slots.

## Universal preamble (built from `style-bible.json`)

```
{one_line}
View: {camera}.
Style: {style_words joined}.
Mood: {mood}.
Palette: background {background}; accents {relevant palette hexes}. Keep the
background dark and low-contrast so gameplay elements read on top.
Do NOT include: {negatives joined}.
```

Then the class template appends the subject + format + class-specific negatives.

## By asset class

### background
```
SUBJECT: {intent}.
Format: {width}x{height}px. {"Seamless tiling, edges must wrap." if tiling}
Even ambient lighting, gentle vignette. No characters, no text, no bright
focal points.
```

### tileset
```
SUBJECT: {intent}, designed as a repeating tile.
Format: {width}x{height}px, SEAMLESS — top edge matches bottom, left matches
right. Uniform lighting, no directional shadow, no single focal element.
```

### sprite  (actors, fx, tokens)
```
SUBJECT: {intent}, centered, on a plain flat background for easy cutout.
Format: {width}x{height}px, subject fills ~80% of frame, generous margin.
Clean readable silhouette. {"Snap to palette: "+hexes if palette_snap}
No ground shadow, no scene, no text.
```

### icon
```
SUBJECT: {intent}, single clear symbol, centered, flat background.
Format: {width}x{height}px, high contrast, readable at small size, no text.
```

### ui
```
SUBJECT: {intent} as a game UI element.
Format: {width}x{height}px. Flat, clean edges, consistent with the palette.
{"9-slice friendly: uniform borders, plain center." if applicable}
```

### keyart
```
SUBJECT: {intent}.
Format: {width}x{height}px, cinematic composition, strong negative space{,
room reserved for a title if noted}. On-style with the palette. No text/logos.
```

## Notes for the director

- **Oversample**: request at `oversample`× the target size (see manifest), never
  at final size — stage 3 downscales for crispness.
- **Families**: assets sharing a `family` reuse a base seed and, where the model
  supports it, a reference image, so (e.g.) all five enemies match.
- **Revision on `regenerate`**: when stage 4 routes back, adjust the *subject*
  and constraints (not the preamble) — e.g. "simpler silhouette", "less
  detail", "stronger single colour" — then re-issue.
