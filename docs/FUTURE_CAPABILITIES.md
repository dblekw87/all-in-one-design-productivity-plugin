# Future Capabilities

Future capabilities are not implemented in MVP. This document records architecture requirements only.

## Font Replacer

- Problem: replace fonts across selected layers or frames.
- Flow: select nodes, analyze fonts, configure mapping, preview, execute, result, restore.
- Core needed: Selection Engine, Node Scanner, Font Loader, Mutation Engine, History, Settings.
- Website Import link: can fix substituted imported fonts.
- Independence: yes.
- Risks: mixed fonts, unavailable target fonts, large selections.
- Priority: high.
- Runtime note: implement as an executable capability with its own input schema and domain validation; do not add shell-specific execution code.

## Text Replacer

- Problem: bulk replace copy in selected text nodes.
- Flow: select text, define find/replace rules, preview matches, execute, restore.
- Core needed: Selection Engine, Node Scanner, Mutation Engine, History.
- Website Import link: edit imported website copy.
- Independence: yes.
- Risks: rich text preservation and partial range changes.
- Priority: high.

## UX Writing

- Problem: improve selected UI copy with tone and context.
- Flow: select text, analyze context, choose tone, generate suggestions, preview, apply, restore.
- Core needed: Selection Engine, Node Scanner, Mutation Engine, History, Settings, future AI proxy.
- Website Import link: rewrite imported website sections.
- Independence: yes.
- Risks: privacy, AI quality, context selection, provider security.
- Priority: medium.

## Color Replacer

- Problem: replace colors across selected layers or imported pages.
- Flow: select scope, detect colors, map replacements, preview, execute, restore.
- Core needed: Selection Engine, Node Scanner, Mutation Engine, History.
- Website Import link: adapt imported page to brand palette.
- Independence: yes.
- Risks: gradients, styles, components, hidden overrides.
- Priority: medium.

## Image Replacer

- Problem: replace images in selected frames.
- Flow: select images, choose replacements, preview fit, execute, restore.
- Core needed: Selection Engine, Node Scanner, Asset Pipeline, Mutation Engine, History.
- Website Import link: swap imported website imagery.
- Independence: yes.
- Risks: crop/fill preservation and asset size.
- Priority: medium.

## Layer Organizer

- Problem: clean layer names, grouping, and hierarchy.
- Flow: select scope, analyze structure, preview renames/reorders, execute, restore.
- Core needed: Selection Engine, Node Scanner, Mutation Engine, History.
- Website Import link: refine imported hierarchy.
- Independence: yes.
- Risks: unexpected reparenting and designer intent loss.
- Priority: medium.

## Auto Layout Fixer

- Problem: convert or repair frame layout behavior.
- Flow: select frames, infer layout, preview changes, execute, restore.
- Core needed: Selection Engine, Node Scanner, layout inference, Mutation Engine, History.
- Website Import link: improves imported layout after conversion.
- Independence: yes.
- Risks: incorrect inference can damage layouts.
- Priority: high after Font/Text Replacer.

## Design System QA

- Problem: detect inconsistencies against defined design system rules.
- Flow: select scope, run checks, show findings, optionally fix, report.
- Core needed: Selection Engine, Node Scanner, Settings, Result Reporter.
- Website Import link: compare imported website to design system.
- Independence: yes.
- Risks: rule configuration complexity.
- Priority: low-medium.

## Accessibility Checker

- Problem: detect contrast, text size, naming, and structure issues.
- Flow: select scope, scan, show issues, suggest fixes.
- Core needed: Selection Engine, Node Scanner, Result Reporter.
- Website Import link: audit imported website design.
- Independence: yes.
- Risks: Figma lacks full semantic/runtime context.
- Priority: medium.

## Component Detector

- Problem: find repeated structures that could become components.
- Flow: select scope, analyze repetition, show candidates, optional component creation.
- Core needed: Node Scanner, component candidate analysis, Result Reporter.
- Website Import link: uses Website Import candidate metadata.
- Independence: yes.
- Risks: false positives and unsafe component creation.
- Priority: low-medium.

## Mock Content Generator

- Problem: generate realistic placeholder content.
- Flow: choose content type and scope, preview, insert or replace, restore.
- Core needed: Selection Engine, Mutation Engine, History, Settings.
- Website Import link: replace imported real content with mock content.
- Independence: yes.
- Risks: tone, locale, and privacy if AI-backed.
- Priority: low.

## Localization Helper

- Problem: adapt text to other locales and detect overflow risk.
- Flow: select text, choose locale, generate/enter translations, preview overflow, apply.
- Core needed: Selection Engine, Node Scanner, Font Loader, Mutation Engine, History, future AI/proxy optional.
- Website Import link: localize imported website references.
- Independence: yes.
- Risks: translation quality, text expansion, font support.
- Priority: low-medium.
