# Figma Layout Reconciliation

Step 24 tunes the existing Frame renderer without changing the TEXT, IMAGE, VECTOR, root-scale, or rollback contracts.

## Coordinate and Flow Policy

Browser geometry remains 1:1 with Figma geometry. A child in a Figma Auto Layout parent receives no direct flow `x/y`; Figma computes its position from order, padding, gap, and alignment. Absolute children retain parent-relative geometry and are positioned explicitly.

## Measurements

Each rendered Frame can record a compact `layoutMeasurements` entry containing before/after parent bounds, flow content bounds, the effective Auto Layout gap, divergence, fixed-height oversize, and direct child width ratios. It contains IR IDs and numeric geometry only; it does not contain URLs, CSS dumps, or text.

## Corrections

High-confidence horizontal Frame rows use measured child Frame widths to preserve the original main/right-rail and card-column ratios. High-confidence vertical Frames whose fixed height exceeds their measured flow content are resized to the measured content height and switched to a hug-like primary sizing mode. Corrections are warning-visible and are not an iterative layout solver.

## Reconstruction Pass

After preorder creation and parent append, the renderer performs one postorder reconstruction pass. It resolves the parent width first, distributes horizontal flow widths by the IR geometry ratio, applies available widths to text and visual children, reads the resulting text height, and then reconciles vertical parent content height. Freeform and low-confidence containers retain parent-relative Geometry placement. Normal flow children do not receive browser `x/y` a second time; absolute children retain their explicit parent-relative position.

## Scope

Grid, responsive breakpoints, transforms, complex shadows, and full CSS layout reproduction remain out of scope. Validation in Figma Desktop is still required for real Auto Layout behavior.

## Visual Evidence Recovery

Computed `background-color` is emitted as a solid IR paint before image layers, so card backgrounds are not dependent on CSS variable names. Grid containers remain freeform and reuse measured parent-relative child bounds, including width and height. Inline SVG elements are captured with a bounded `outerHTML`, converted to a data URL, passed through the existing SVG inspection/sanitization path, deduplicated by the existing asset flow, and rendered by the existing VECTOR factory. Pseudo-element background URLs reuse the existing asset usage path; icon fonts and arbitrary pseudo-element shapes remain warnings or unsupported fallbacks.
