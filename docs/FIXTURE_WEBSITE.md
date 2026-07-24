# Fixture Website

## Purpose

The Fixture Website provides controlled pages for Browser Runtime, DOM snapshot, CSS normalization, layout inference, Design IR, screenshot, and renderer tests. It avoids real commercial sites while the import pipeline is still being built.

## App

The fixture is an independent workspace app:

```text
apps/fixture-website/
```

Run it locally:

```bash
corepack pnpm --filter @aio/fixture-website dev
```

Default local URL:

```text
http://127.0.0.1:4300/fixtures/basic-landing-v1
```

Vite serves the static fixture app. Step 5 tests inspect the HTML/CSS files directly and do not start a browser.

## Versioning

The first fixture is:

```text
fixture-basic-landing-v1
```

Manifest:

```text
apps/fixture-website/fixture-manifest.ts
```

Meaningful structural changes should create `basic-landing-v2` instead of silently changing v1 expectations.

## basic-landing-v1 Structure

```text
Root
├─ Header
│  ├─ Logo
│  ├─ Navigation
│  └─ CTA Button
├─ Main
│  ├─ Hero
│  │  ├─ Eyebrow
│  │  ├─ Heading
│  │  ├─ Description
│  │  ├─ Action Group
│  │  └─ Hero Image
│  ├─ Feature Section
│  │  └─ Feature Card x 3
│  └─ CTA Section
└─ Footer
```

## Included Patterns

- semantic HTML
- flex row and flex column
- basic CSS grid
- text nodes
- local PNG image
- local SVG mark
- inline SVG icons
- background color
- border, radius, shadow
- padding, gap, margin
- width, max-width, min-height
- button-like links
- hidden element
- `aria-hidden="true"` element
- pseudo-element
- absolute badge

## Excluded Patterns

- animation-dependent layout
- canvas
- WebGL
- iframe
- video
- complex mask
- backdrop-filter
- external fonts
- CDN assets
- third-party scripts
- API requests
- lazy loading
- authentication

## Asset Policy

All assets live under:

```text
apps/fixture-website/public/assets/
```

The first fixture includes a local PNG hero image and a local SVG mark. The page must not reference external asset URLs.

## Local Security Policy

The production Parser Server security policy remains HTTPS-only and public-target-only. Local fixture HTTP URLs are not added to the production allowlist in Step 5.

Until Browser integration is implemented, tests use injected target inspectors or direct file checks. When real local Browser tests are added, use local HTTPS or an explicit development-only security policy.

## Tests

Fixture tests verify:

- manifest id, version, and route
- header, main, footer
- hero section
- three feature cards
- local image reference
- inline SVG presence
- hidden and `aria-hidden` elements
- pseudo-element CSS
- no external HTTP/CDN references
- no script tags

## Adding A Fixture

1. Add a new stable route and fixture id.
2. Add local-only assets under `public/assets/`.
3. Add manifest expectations that are meaningful but not brittle.
4. Add fixture contract tests.
5. Document any new CSS or DOM pattern introduced.
