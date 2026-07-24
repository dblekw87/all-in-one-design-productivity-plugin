# Product Vision

## Long-Term Product Goal

This project is an extensible Figma plugin for design productivity tasks that designers repeatedly perform inside Figma. The first capability is Website Import: converting a public website URL into editable Figma layers.

The long-term product is not a single-purpose website importer. Website Import is the first proof that the plugin core, capability registry, messaging, history, settings, mutation, and reporting model can support multiple independent capabilities.

## Core Users

- Product designers who need editable references from public websites.
- Design system designers who compare live web implementations with Figma components.
- UX writers and content designers who later need text-aware operations on selected layers.
- Design QA users who need inspection, replacement, and cleanup workflows over existing Figma files.

## Problem Solved By Website Import

Designers often use screenshots as references, but screenshots are not editable. Website Import should convert a rendered web page into Figma-native nodes:

- Text becomes `TextNode`.
- Layout containers become `FrameNode`.
- Images become Figma image paints.
- Flexbox becomes Auto Layout where confidence is high.
- Unsupported visual details are reported and selectively approximated or rasterized.

The goal is practical editability with high visual similarity, not perfect browser emulation.

## Capability Categories

- `IMPORT`: bring external or structured sources into Figma.
- `REPLACE`: replace existing content, styles, or assets.
- `WRITING`: generate or improve text based on selected context.
- `INSPECT`: scan, diagnose, organize, or validate existing designs.
- `GENERATE`: create new design content or mock content.
- `SETTINGS`: configure shared services, mappings, and defaults.

## MVP Scope

MVP implements only Website Import:

- One public URL.
- Desktop viewport first.
- First viewport or configured capture height.
- Controlled fixture page before public sites.
- Basic text, image, background, border, radius, shadow, flexbox, block, simple grid.
- Root frame generation, result report, selection of result, history, and restore/remove.

## Long-Term Scope

Future capabilities may include Font Replacer, Text Replacer, UX Writing, Color Replacer, Image Replacer, Layer Organizer, Auto Layout Fixer, Design System QA, Accessibility Checker, Component Detector, Mock Content Generator, and Localization Helper.

These are not implemented in the MVP. They influence core boundaries only where reuse is clear: selection scanning, font loading, mutation, history, results, settings, messaging, and capability registration.

## Non-Goals

- Bypassing login, paywalls, authorization, CORS protections, or service terms.
- Restoring JavaScript behavior, interactions, animations, canvas, WebGL, videos, or iframes in MVP.
- Pixel-perfect reproduction of every CSS feature as editable Figma nodes.
- Exposing placeholder UI tabs for future capabilities.
- Building a generic workflow engine, custom dependency injection framework, or broad AI provider layer during MVP.

## Differentiation

The plugin should compete on editable structure and repeatable workflows, not just screenshot capture. Its direction is:

- Capability-based architecture rather than a single import command.
- Explicit fallback and warning model.
- Shared history and restore across all mutation capabilities.
- IR-based browser-to-Figma conversion that can later support inspection and QA.
- Conservative component candidate detection instead of unsafe automatic component creation.

## Feature Addition Principles

Add a new feature only when it can be registered as an independent capability, has its own validation/preview/execute/result flow, uses shared core services through explicit contracts, and does not require Plugin Shell or Message Bus rewrites beyond typed payload registration.
