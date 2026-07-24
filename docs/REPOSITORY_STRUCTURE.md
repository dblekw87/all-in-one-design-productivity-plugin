# Repository Structure

## Actual Structure

The Git repository root is the project root:

```text
<project-root>/
```

Do not initialize or use a Git repository from a parent user directory for this project.

```text
apps/
  figma-plugin/
    src/
      main/
        bootstrap/
        capabilities/
          website-import/
        messaging/
        selection/
      ui/
        messaging/
    test/
    manifest.json
    package.json
    tsconfig.json
    vite.config.ts

  fixture-website/
    index.html
    fixture-manifest.ts
    public/
      assets/
      styles/
    test/
    package.json
    tsconfig.json

  parser-server/
    src/
      app.ts
      config.ts
      server.ts
      routes/
      security/
    test/
    package.json
    tsconfig.json

packages/
  shared-contracts/
    src/
      capability.ts
      error.ts
      messaging.ts
      result.ts
      index.ts
    test/

  design-ir/
    src/
      schema.ts
      validation.ts
      version.ts
      index.ts
    test/

  dom-snapshot/
    src/
      contract.ts
      schema.ts
      validation.ts
      version.ts
      index.ts
    test/

  style-snapshot/
    src/
      contract.ts
      properties.ts
      schema.ts
      validation.ts
      version.ts
      index.ts
    test/

  geometry-evidence/
    src/
      contract.ts
      schema.ts
      validation.ts
      version.ts
      index.ts
    test/

  page-model/
    src/
      contract.ts
      schema.ts
      validation.ts
      version.ts
      index.ts
    test/

  layout-evidence/
    src/
      contract.ts
      schema.ts
      validation.ts
      version.ts
      index.ts
    test/

  layout-inference/
    src/
      contract.ts
      schema.ts
      thresholds.ts
      validation.ts
      version.ts
      index.ts
    test/

  sizing-inference/
    src/
      contract.ts
      schema.ts
      thresholds.ts
      validation.ts
      version.ts
      index.ts
    test/

  asset-reference/
    src/
      contract.ts
      schema.ts
      validation.ts
      version.ts
      index.ts
    test/

  resolved-assets/
    src/
      contract.ts
      schema.ts
      validation.ts
      version.ts
      index.ts
    test/

config/
  typescript/
docs/
```

## App Responsibilities

`apps/figma-plugin` owns the Figma Plugin runtime. The UI sends typed messages and shows the minimum Website Import ready state. The main thread registers Website Import metadata and handles initialization messages. It does not parse websites or create import nodes in this scaffold.

`apps/fixture-website` owns controlled static pages used by parser and renderer tests. It is a separate app so future Browser Runtime tests can navigate real local pages without depending on commercial websites.

`apps/parser-server` owns the required Website Import server runtime. The current scaffold includes Fastify app creation, config schema, graceful shutdown, `GET /health`, the Step 4 URL security inspection boundary, the Step 5 Analyze API contract, and the Step 6 Playwright Chromium Browser Runtime foundation. It is intentionally separate from the plugin app because it runs as its own process.

## Package Responsibilities

`packages/shared-contracts` contains serializable contracts shared by Plugin UI, Plugin Main Thread, and Parser Server. It does not import Figma runtime types.

`packages/design-ir` contains the versioned browser-to-Figma intermediate representation and Zod validation helpers. It does not import Figma runtime types.

`packages/dom-snapshot` contains the versioned browser DOM Snapshot contract and tree validation helpers. It remains independent from Figma API and Design IR.

`packages/style-snapshot` contains the allowlisted Computed Style Snapshot contract and DOM cross-reference validation. It remains independent from Figma API and Design IR.

`packages/geometry-evidence` contains viewport/document geometry contracts and cross-validation against DOM and Style Snapshots.

`packages/page-model` contains the versioned normalized page contract and semantic validation. Parser Server owns the join and CSS normalization implementation; this package does not perform layout inference or Figma conversion.

`packages/layout-evidence` contains serializable parent/child layout facts and validation. It does not classify layout modes or create Design IR.

`packages/layout-inference` contains rule-based layout mode candidates, confidence, reasons, conflicts, and fallback metadata. It does not use Figma API types.

`packages/sizing-inference` contains independent width/height sizing candidates and constraints. It distinguishes CSS computed size from measured geometry and does not map to Figma sizing properties.

`packages/asset-reference` contains serializable asset definitions and usage references. It does not download binary data or depend on Figma APIs.

`packages/resolved-assets` contains serializable resolution metadata and status contracts. Runtime byte buffers remain in Parser Server and are never exposed through Shared Contracts.

`packages/design-ir` contains the platform-independent Design IR contract, Zod schema, and semantic validation. Parser-side IR construction lives under `apps/parser-server/src/design-ir`.

## Dependency Rule

```text
figma-plugin -> shared-contracts
figma-plugin -> design-ir

parser-server -> shared-contracts
parser-server -> design-ir
parser-server -> dom-snapshot
parser-server -> style-snapshot
parser-server -> geometry-evidence
parser-server -> page-model
parser-server -> layout-evidence
parser-server -> layout-inference
parser-server -> sizing-inference
parser-server -> asset-reference

shared-contracts -> no app dependency
design-ir -> no app dependency
dom-snapshot -> no app dependency
style-snapshot -> dom-snapshot
geometry-evidence -> dom-snapshot
geometry-evidence -> style-snapshot
shared-contracts <-> design-ir no circular dependency
```

Plugin and Parser Server do not import each other.

## Package Promotion Criteria

Keep implementation inside an app until another runtime needs it. Promote a module into `packages/` only when at least two runtimes share it or it defines a stable contract boundary.

## Currently Not Created

These planned packages are intentionally not scaffolded yet:

- `plugin-core`
- `website-import`
- `dom-parser`
- `node-renderer`
- `asset-pipeline`
- `font-loader`
- `mutation-engine`
- `history-manager`
- `test-fixtures`

They will be added when the MVP vertical slice reaches those responsibilities.
`apps/parser-server/src/import-session`은 Import Session Contract Adapter, In-Memory Store, TTL Cleanup, Asset Download/Delete Route를 소유한다. Shared Contract에는 Session/Manifest Metadata만 둔다.
# Renderer Runtime Structure

`apps/figma-plugin/src/main/renderer` contains renderer contracts, runtime state, the Figma adapter boundary, registry, factories, and rollback support. Parser-side asset resolution is not imported into this tree.

`apps/figma-plugin/src/main/assets` contains the Plugin-side transfer context, manifest index, HTTP client, binary verification, request cache, and bounded download pool. It does not contain persistent storage or Parser Server code.
Step 21 SVG client code is under `apps/figma-plugin/src/main/assets/svg/`; the production SVG adapter and VECTOR factory remain in the Plugin renderer. Shared contracts do not import Figma types or contain SVG binary.
