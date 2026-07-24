# Information Architecture

## Initial Navigation

MVP exposes only:

- Import
- History
- Settings

Future capabilities are not shown as empty tabs.

## Long-Term Navigation

- Import
- Replace
- Writing
- Inspect
- Generate
- History
- Settings

Navigation should be derived from enabled capability metadata plus fixed shared sections such as History and Settings.

## Capability Metadata

Each capability declares:

- `id`
- `category`
- `label`
- `description`
- `icon`
- `order`
- `enabled`
- `experimental`

The Plugin UI groups visible capabilities by category. Disabled or unavailable features are omitted unless there is a deliberate onboarding or beta access flow.

## Website Import User Flow

1. User opens Import.
2. User enters a public URL.
3. User chooses viewport and basic options.
4. UI validates locally and sends preview request.
5. Parser Server analyzes page and returns preview summary.
6. User executes import.
7. Plugin shows progress events.
8. Main Thread creates root frame and child nodes.
9. Result report is shown.
10. Created root frame is selected.
11. User may remove or restore generated result from History.

## Preview

Preview should summarize:

- URL and final resolved URL.
- Viewport.
- Estimated node count.
- Major layout types detected.
- Asset count.
- Font families detected.
- Unsupported CSS warnings.
- Security or access warnings.

Preview must not create Figma nodes.

## Progress

Progress events use shared contracts:

- `VALIDATING`
- `PARSING`
- `NORMALIZING`
- `LOADING_FONTS`
- `CREATING_NODES`
- `APPLYING_ASSETS`
- `RECORDING_HISTORY`
- `COMPLETE`

Events should be throttled in UI to avoid rendering overhead.

Progress is delivered through `CAPABILITY_PROGRESS_EVENT` with `progress` normalized from `0` to `1`.

## Result

Result uses the common `CapabilityResult` shape and Website Import-specific details:

- Created root frame ID.
- Created node count.
- Font substitutions.
- Asset failures.
- Unsupported style count.
- Raster fallback count.
- Component candidates.

## History And Restore

History displays operation records by capability. For Website Import, restore means removing the generated import root and related generated nodes. Full reconstruction of previous canvas state is not needed for import-created nodes, but the shared History Manager should support richer before/after state for replace capabilities.

## Settings

MVP settings:

- Parser Server URL.
- Default viewport.
- Default max import height.
- Font mapping table.
- Import safety options.

Future settings should be versioned and namespaced by capability.

## Navigation Expansion Principles

New capabilities appear only when registered, enabled, and supported by UI metadata. Adding a capability should not require editing the shell navigation beyond registering metadata and route/view composition.
