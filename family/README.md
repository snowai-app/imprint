# The Snow AI family kit

The one design source for every app in both families (T-2126, approved by the
operator on 4 October 2026: "Go with your recommendations, palette C"). The
master copy lives here, in `snowai/family/`. Every app copies this folder
**byte for byte**; nobody edits a copy. Change it here, merge it, then copy it
out again.

The rules it carries are in `docs/design/family-standard.md` (measures,
components, naming) and `docs/design/family-colours.md` (the palette), both
in snowai.

## What is in it

| File | What it is |
|---|---|
| `palette.json` | The final palette, palette C "Earth and ink", mid-tone retune: 34 apps, each with `accent` (tile and brand, a mid tone), `strong` (links, small text, buttons), `soft`, `ground`, `dark`, `darkGround`, `darkSurface`, `group`, and its checked contrast. Never edited by hand except by a palette decision. |
| `tokens.css` | The standard's tokens on `:root`: type scale, spacing, radius, elevation, motion, control sizes, and the shared neutrals; dark under `:root[data-theme="dark"]`. |
| `app-colours.css` | **Generated.** For every app, `:root[data-app="<id>"]` (light) and `:root[data-app="<id>"][data-theme="dark"]`, plus `[data-tile="<id>"]` so any page can draw any app's tile. |
| `generate-app-colours.mjs` | Writes `app-colours.css` from `palette.json`; `--check` fails when they differ. |
| `components.css` | The kit's components, every class prefixed `fam-`: tile, launcher, status chip, theme switch, not-found page, and the standard's buttons (`fam-btn`), inputs (`fam-input`) and cards (`fam-card`). |
| `apps.ts` | Every app: id, full and short name, one line, job group, Lucide glyph, the environment variable for its address, status, operator-only, brand. Pure data; no hostnames. |
| `glyphs.tsx` | Glyph name to Lucide component, imported one by one. |
| `components/AppTile.tsx` | The tile: a rounded square at 25%, the app's colour, a white glyph at 55%, no border. Sizes 24, 32, 40, 56. |
| `components/AppLauncher.tsx` | The nine-dot button at the far left of the header and its panel: "Your apps", then "More from Snow AI" grouped by job with statuses, then the full shelf. Keyboard (arrows, Home, End, Escape with focus return), click-outside, and a bottom sheet on phones. |
| `components/ThemeSwitch.tsx` | The one Light/Dark switch. Takes the app's own cookie name; `shared` puts it on a registrable domain (snowai.app does). |
| `components/NotFound.tsx` | The family 404: the app's tile and name, "This page isn't here", links home. Light unless dark was chosen. |
| `templates/not-found.tsx` | The `app/not-found.tsx` to copy. |
| `family.test.mts` | The kit's tests: app-colours.css in sync with palette.json; every app has a palette entry, a glyph and a group; contrast present and at least 4.5 for text and buttons (3 for the tile's glyph); the launcher filters operator surfaces. |

## How an app adopts it

1. Copy `family/` from snowai into the app's root, unchanged. `lucide-react` must
   be a dependency (snowai uses `^1.31.0`).
2. In `app/layout.tsx`, after `google-sans.css`, import
   `@/family/tokens.css`, `@/family/app-colours.css` and
   `@/family/components.css`, and set `data-app="<id>"` on `<html>` beside
   `data-theme` (light unless the cookie says dark).
3. Map the app's own variables to the family names (`--accent`,
   `--accent-strong`, `--accent-soft`, `--accent-ink`, `--ground`, `--surface`,
   `--surface-2`, `--ink`, `--ink-2`, `--ink-3`, `--line`, `--line-strong`,
   `--font-sans`, `--font-mono`…), then delete its own values.
4. Put `<AppLauncher>` at the far left of the signed-in header. Build its
   list on the server with `launcherApps(hrefs, { operator })`, where `hrefs`
   comes from the app's `lib/links.ts` (each app's `env` variable, with the
   real address as the default there, never in a component).
5. Replace the app's theme switch with `<ThemeSwitch cookie="<app>-theme" />`,
   copy `templates/not-found.tsx` to `app/not-found.tsx` with the app's id,
   and add `family/**/*.test.mts` to the test script.

Titles follow `familyTitle(id, page)`: `Page · Snow AI Invoice`, and the app's
own name for its home.

**Reference-rebuilt products** (Invoice, Sign, Tax) keep their reference's look
inside the work area; the family wins where the product meets the family:
header edge, launcher, sign-in, tile, emails. **GetCovered** stands alone: its
own brand, colour and app list (`launcherApps(…, { brand: 'getcovered' })`),
and its pages do not claim the Snow AI family. **Byline, Imprint and
Playbook** keep the paper ground `#fff1e5` (already in the palette) with the
family measures.

## Colours

`--accent` is a mid tone for the tile and brand graphics only; text and filled
buttons use `--accent-strong` with `--accent-ink` on it. In dark both become
the lifted `dark` value and `--accent-ink` the dark ground. Tiles keep the
light accent in both themes.

To change a colour: edit `palette.json`, run
`node family/generate-app-colours.mjs`, run the tests. A new app picks a free
hue in its group's arc as `docs/design/family-colours.md` section 8 sets out,
and gets a row in `palette.json`, an entry in `apps.ts` and its glyph in
`glyphs.tsx`.

## Glyphs

| App | Glyph | | App | Glyph |
|---|---|---|---|---|
| Snow AI | `snowflake` | | Webinar | `presentation` |
| Documents | `files` | | Video | `clapperboard` |
| Sign | `pen-line` | | Pitch | `target` |
| Invoice | `receipt` | | Ask | `message-circle-question-mark` |
| Compliance | `shield-check` | | Atlas | `compass` |
| Extract | `scan-text` | | Story | `quote` |
| Render | `file-output` | | Rewards | `gift` |
| Tax | `landmark` | | Playbook | `newspaper` |
| Model | `sliders-horizontal` | | Byline | `feather` |
| Forms | `clipboard-list` | | Imprint | `book-open` |
| CRM | `contact` | | Foundry | `graduation-cap` |
| Portal | `door-open` | | Metis | `sprout` |
| Recovery | `hand-coins` | | GetCovered | `heart-pulse` |
| Network | `users` | | HQ | `building-2` |
| Memo | `mic` | | Studio | `layout-dashboard` |
| Transcribe | `audio-lines` | | Workbench | `flask-conical` |
| Campaigns | `send` | | Data | `database` |

Icons inside apps are Lucide too, at a 1.75 stroke (`STROKE` in `glyphs.tsx`).
