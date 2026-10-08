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
| `components.css` | The kit's components, every class prefixed `fam-`: tile, launcher, status chip, theme switch, not-found page, cookie bar and its footer button, and the standard's buttons (`fam-btn`), inputs (`fam-input`) and cards (`fam-card`). |
| `consent.ts` | The family's one cookie choice (T-2143): the `snowai-consent` cookie (`v1.all` or `v1.essential`, twelve months, shared across `.snowai.app` when the page is on it, host-only elsewhere), `parseConsent` for the server, and `hasConsent()`, `onConsentChange()`, `setConsent()` and `openCookieChoices()` for the browser. No imports. |
| `apps.ts` | Every app: id, full and short name, one line, job group, Lucide glyph, the environment variable for its address, status, operator-only, brand, `live: false` while its address does not answer yet (the launcher then shows it, with its status, without a link), and `listed: false` for an app that only forwards elsewhere now (the Workbench, T-2174: in no launcher and on no shelf). Pure data; no hostnames. |
| `glyphs.tsx` | Glyph name to Lucide component, imported one by one. |
| `components/AppTile.tsx` | The tile: a rounded square at 25%, the app's colour, a white glyph at 55%, no border. Sizes 24, 32, 40, 56. |
| `components/AppLauncher.tsx` | The nine-dot button at the far left of the header and its panel: "Your apps", then "More from Snow AI" grouped by job with statuses, then the full shelf when `shelfHref` is given (left out, the "All Snow AI apps" link is not drawn at all). Keyboard (arrows, Home, End, Escape with focus return), click-outside, and a bottom sheet on phones. |
| `components/ThemeSwitch.tsx` | The one Light/Dark switch. Takes the app's own cookie name; `shared` puts it on a registrable domain (snowai.app does); `label={{ toDark, toLight }}` gives a translated app its own words. |
| `components/CookieBar.tsx` | The family cookie bar (T-2143), after getcovered.cloud's: the sentence and "Privacy and cookies" on the left, Accept (the app's strong shade) and Deny non-essential as pills on the right, under the sentence on a phone. A named region; labels and the privacy link are props with English defaults. |
| `components/CookieChoices.tsx` | The footer's "Cookie choices" pill, which reopens the bar. |
| `ask-snow.ts` | Ask Snow's parts with no screen (T-2168): the words in English (`ASK_SNOW_EN`, one object a translated app replaces), protected mode (`maskText` hides Social Security numbers, dates of birth and health words before anything is sent), the greeting rule (`greetNow`: once per visit, after 10 seconds or half a scroll, never on a phone, never again once closed), and the shapes the Ask service answers in. No imports. |
| `components/AskSnow.tsx` | Ask Snow on a public page: the "Ask Snow" button in the corner, the greeting with the page's quick choices (the operator's presets, most specific URL rule first) and the conversation. Never opens the conversation by itself, never covers the page, nothing on a phone until tapped (then a bottom sheet). Props: `site` (the app's id), `endpoint` (Ask's address from `lib/links.ts`), `greet`, `labels`, `lang`. |
| `components/AskSnowButton.tsx` | Ask Snow signed in: the Ask button for a product's header and the side panel under it, answering from the product and the family's pages, with questions pooled across the account. Props: `site`, `endpoint`, `suggestions`, `labels`, `top`. Marks `<html data-ask-docked>` while open, so a work area marked `data-ask-dock` makes room on a wide screen. |
| `components/AskSnowPanel.tsx` | The conversation both share: answers stream in and end with a button; "Talk to a person" goes through Live help (in the box when signed in, by email after "Yes, contact me" when not); a protected conversation is never handed over. |
| `entitlements.ts` | What the signed-in account may use (T-2173): `fetchEntitlements(endpoint, { cookie })` asks `GET https://snowai.app/api/entitlements` (pass `${FAMILY_LINKS.snowai}/api/entitlements` from the app's `lib/links.ts`; in the browser the `.snowai.app` cookie goes by itself, on a server pass the request's Cookie header). The answer, by app id: `state` (`trial`, `active`, `ended`, `cancelled`, or `included` with `via`, the held product a capability comes with), `usable`, `trialEndsAt`, `daysLeft`; plus `discountPercent` and `pricing`. `mayUse(answer, id)` and `entitlementLabel(e)` read it. Never throws: a failure is `{ error: 'unavailable' }`, and an app fails open. Phase 1 apps may show it; nothing enforces it yet. No imports. |
| `atlas.ts` | Atlas sync (T-2193): every app's public articles, help pages, forms, terms and the app itself reach Atlas the moment they change. `publishToAtlas(FAMILY_LINKS.atlas, key, '<app id>', entries)` adds or updates (batches of 200), `removeFromAtlas(FAMILY_LINKS.atlas, key, '<app id>', id)` hides one at once; both run on the app's server with the shared capability key and never throw. `atlasManifest(source, entries)` is what the app serves at `/atlas.json`, which Atlas sweeps every 15 minutes (an app with none, or one that does not answer, keeps its entries). `AtlasEntry`: `id`, `kind`, `title`, `lead`, `url`, `updated_at`, optional `body`, `keywords`, `lang` (`es`, `hi`) and `slug` (`atlasSlug(source, id)` when left out). Public entries only: Atlas refuses an email address, phone number or Social Security number. No imports. |
| `embed.ts` | The integrated workspace (T-2223): `FRAME_ANCESTORS` (`frame-ancestors 'self' https://snowai.app https://*.snowai.app`, every app's header, `familyFrameHeaders()` for next.config.ts), `workspaceTarget` (the one rule for a click: held, framed beneath the bar; not held, its snowai.app/try page in a new tab; unknown, a new tab; Get Covered, Portal and the front door, always a new tab, `NEVER_FRAMED`), `embedHref`, `withOpen`/`openFromSearch` (the host's `?open=<id>`), `readEmbedMessage`, `SIGN_IN_PATH`, and `EMBED_SCRIPT`, the guest's half. No imports; the family's domain is named here as a security boundary, never as a link. |
| `components/EmbedScript.tsx` | The guest's half, first in the root layout's `<head>`: in a frame in embed mode it marks `<html data-embed>` before the first paint (components.css then hides the app's top bar, launcher, Ask Snow and cookie bar), keeps the mode in the frame's name across every page, opens links that leave the family in a new tab, and sends a sign-in page to the whole window. Does nothing outside a frame. Takes `nonce` for an app with a script-src. |
| `components/FamilyWorkspace.tsx` | The host's half: one store per page, shared by every launcher and bar. Reads `/api/entitlements` once, opens a held product in a frame under the bar that holds the launcher (the host page stays mounted underneath, `?open=<id>` in the address bar, the last four frames kept), shows a plain sentence and a new-tab link when a frame refuses to load, and loads a framed sign-in page in the whole window. `useFamilyWorkspace` for a launcher; `WorkspaceLink` for one link in a product's own family bar (Sign's). |
| `components/NotFound.tsx` | The family 404: the app's tile and name, "This page isn't here", links home. Light unless dark was chosen. |
| `templates/not-found.tsx` | The `app/not-found.tsx` to copy. |
| `family.test.mts` | The kit's tests: Ask Snow's masking, greeting rule, words, no address in its components and token-only colours; app-colours.css in sync with palette.json; every app has a palette entry, a glyph and a group; contrast present and at least 4.5 for text and buttons (3 for the tile's glyph); the launcher filters operator surfaces, draws an app that is not live yet without a link, leaves out an app that only forwards, and draws the shelf link only when given one; the consent cookie's value, domain and lifetime; the cookie bar's name, wording and token-only colours; Atlas's slugs, manifest, push and removal. |

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

6. Mount the cookie bar once, in `app/layout.tsx`, last inside `<body>`:
   read the choice on the server beside the theme cookie, so a visitor who
   has chosen never sees it flash.

   ```tsx
   import CookieBar from '@/family/components/CookieBar';
   import { CONSENT_COOKIE, framedRequest, parseConsent } from '@/family/consent';
   const consent = parseConsent((await cookies()).get(CONSENT_COOKIE)?.value);
   const framed = framedRequest((await headers()).get('sec-fetch-dest'));
   <CookieBar initial={consent} framed={framed} privacyHref={privacyUrl} />
   ```

   A page inside a frame (HQ's visitor view, Studio's app box, a form
   embedded on someone else's site) never shows the bar: its parent does.

   `privacyHref` comes from the app's `lib/links.ts` (the family page,
   `${snowai}/privacy`, read from the environment); left out it is the
   family's. A translated app passes `labels={{ region, text, link, accept,
   deny }}` in the visitor's language.
7. Put `<CookieChoices />` in the footer beside the legal links (a
   translated app passes `label`). Where a page has no footer, put it where
   its legal links are. It brings the family's compliance line with it,
   "HIPAA compliant" (T-2535), the one wording across the suite; a translated
   app passes `hipaa` in its language.
8. Gate anything non-essential on the choice. Essential is sign-in and the
   session, security, the theme and language cookies, display settings the
   person chose, and the consent cookie itself; none of that asks. Anything
   that counts visits, any third-party script, anything else asks first and
   stops when the choice changes:

   ```tsx
   import { hasConsent, onConsentChange } from '@/family/consent';
   useEffect(() => {
     if (hasConsent()) start();
     return onConsentChange((c) => (c === 'all' ? start() : stop()));
   }, []);
   ```

   On the server, `parseConsent(cookie)` with `allows()` says the same. Optional
   storage is on until the visitor turns it off (as on GetCovered, T-1549);
   "Deny non-essential" turns it off across the family at once.

9. Mount Ask Snow, the family's one assistant (T-2168). On the public pages,
   once, last inside `<body>` before the cookie bar (outside any wrapper whose
   styles would reach it):

   ```tsx
   import AskSnow from '@/family/components/AskSnow';
   import { FAMILY_LINKS } from '@/lib/links';
   <AskSnow site="<id>" endpoint={FAMILY_LINKS.ask} hideOn={['/dashboard', '/login']} />
   ```

   `hideOn` lists the app's signed-in and sign-in paths (each covers what is
   under it), where the guide is not drawn.

   In the signed-in header, beside the account menu:

   ```tsx
   import AskSnowButton from '@/family/components/AskSnowButton';
   <AskSnowButton site="<id>" endpoint={askEndpointOf(launcher.apps)} suggestions={[…]} />
   ```

   `askEndpointOf` (ask-snow.ts) reads Ask's address from the launcher list
   the server already built from `lib/links.ts`, so a client header needs no
   new prop. With no endpoint the button draws nothing.

   The Ask service decides what it says: the operator's library at
   `ask.snowai.app/admin/answers` word for word, then that site's own pages,
   then a person. Every Snow AI app carries it (operator, 4 October 2026:
   "across the board"); Get Covered's own copy is phase 2. An app with a
   Content-Security-Policy adds Ask's address to `connect-src`.

10. Join the integrated workspace (T-2223).

    - In `app/layout.tsx`, first inside `<head>` (give `<html>`
      `suppressHydrationWarning`):

      ```tsx
      import EmbedScript from '@/family/components/EmbedScript';
      <EmbedScript />
      ```

    - Send the family's frame-ancestors on every page, in next.config.ts
      (`headers()` with `familyFrameHeaders()`, or `FRAME_ANCESTORS` where the
      app already builds its own policy), and no `X-Frame-Options`.
    - Give the launcher the front door's address:
      `<AppLauncher … snowai={FAMILY_LINKS.snowai} />`. A product with its own
      family bar draws each link as
      `<WorkspaceLink app="tax" href={…} current="<id>" snowai={…}>`.
    - The `header` that holds the launcher is hidden in embed mode by
      components.css; a bar of another element that is family chrome rather
      than the product's own work takes `data-fam-chrome` (Sign's family bar).
      A rail holding the launcher beside the product's folders or rooms stays,
      without the launcher.
    - Sign-in pages are known by their path (`SIGN_IN_PATH`: `/login`,
      `/sign-in`, `/signup`…) and leave the frame by themselves; an app whose
      sign-in lives at another path adds it there, here in snowai.

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
