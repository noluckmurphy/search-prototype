# Theme Customization Guide

The prototype centralizes all visual design tokens in `src/tokens.css`. Update values there to change colors, typography, spacing, radii, and shadows across every screen.

## Editing tokens

1. Open `src/tokens.css` and locate the `:root` custom properties.
2. Adjust individual variables to suit your brand. Examples:
   - Swap the accent color: change `--color-accent` and `--color-accent-soft`.
   - Update base typography: edit `--font-family-base` and the `--font-size-*` scale.
   - Tune spacing rhythm: modify the `--space-*` values.
   - Refresh elevations: tweak `--shadow-soft` and `--shadow-popover`.
3. Save the file and rebuild (`npm run build`) to see the updates cascade across the UI.

## Adding new tokens

- Introduce additional variables in `src/tokens.css` under logical sections (e.g., new semantic colors or spacing sizes).
- Reference the new tokens inside component styles (`src/styles.css`) using `var(--your-token)`.
- Keep naming consistent (`--color-*`, `--space-*`, `--radius-*`) for readability.

## Runtime overrides (optional)

If you want to prototype theme switching, set CSS variables at runtime after loading settings. Example:

```ts
const root = document.documentElement;
root.style.setProperty('--color-accent', '#ff7043');
root.style.setProperty('--font-family-base', '"IBM Plex Sans", sans-serif');
```

Persist overrides in `localStorage` via the settings store if you expand the configuration surface area.

## Icon sizing

The project defines icon size tokens (`--icon-size-sm`, `--icon-size-md`, `--icon-size-lg`). When you add iconography, size SVGs or icon fonts with `width: var(--icon-size-md)` to remain aligned with text scale.

## Responsive considerations

Spacing and typography tokens are referenced inside responsive blocks in `src/styles.css`. Update the breakpoints or token usage there if your layouts need different responsive thresholds.
