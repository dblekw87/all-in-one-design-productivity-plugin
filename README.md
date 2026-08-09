# AIO: Website to Editable Figma Plugin

공개 웹사이트를 분석해 편집 가능한 Figma 레이어로 변환하는 디자인 생산성 도구입니다. 단순 스크린샷 캡처가 아니라 DOM, CSS, 레이아웃, 이미지, 텍스트 정보를 수집하고 이를 중간 표현인 Design IR로 정규화한 뒤 Figma 플러그인에서 네이티브 노드로 렌더링하는 구조를 목표로 개발했습니다.

이 저장소는 프론트엔드 개발자 포트폴리오용 프로젝트입니다. 면접관이 코드와 문서를 함께 보면서 UI 개발 역량, 브라우저 런타임 이해도, 타입 기반 설계, 비동기 작업 처리, 보안 경계 설계, 테스트 전략을 확인할 수 있도록 모노레포 형태로 구성했습니다.

## 프로젝트 목적

디자이너는 웹사이트 레퍼런스를 Figma로 가져올 때 보통 스크린샷을 사용합니다. 하지만 스크린샷은 텍스트 수정, 레이어 재배치, 이미지 교체, Auto Layout 적용 같은 후속 편집이 어렵습니다.

AIO는 웹페이지를 다음과 같은 Figma 편집 단위로 변환하는 것을 목표로 합니다.

- 텍스트는 Figma `TextNode`로 변환
- 레이아웃 컨테이너는 `FrameNode`로 변환
- 이미지와 SVG는 Figma 이미지/벡터 자산으로 변환
- 신뢰도 높은 Flexbox 구조는 Auto Layout으로 매핑
- 지원하기 어려운 CSS 효과는 경고와 fallback으로 명시

핵심 목표는 완벽한 브라우저 복제가 아니라, 실무에서 수정 가능한 구조와 높은 시각적 유사성을 동시에 확보하는 것입니다.

## 핵심 기능

- Figma Plugin UI: Website Import 입력, 진행 상태, 결과 리포트, 설정 화면의 기반 구조
- Figma Plugin Main Thread: Capability Registry, 메시지 라우팅, Figma 노드 렌더러, 롤백 가능한 렌더링 런타임
- Parser Server: URL 보안 검사, Playwright 기반 페이지 렌더링, DOM/CSS/Geometry 추출, Design IR 생성
- Browser Extension: 활성 탭에서 DOM, 스타일, 지오메트리, pseudo-element, SVG, asset reference를 캡처하는 브라우저 런타임
- Shared Contracts: 앱 간 메시지, 에러, 결과, 캡처 스냅샷, Design IR을 Zod와 TypeScript로 검증
- Test Fixture Website: 파서와 렌더러 테스트를 위한 통제된 웹페이지

## 프론트엔드 개발자로서의 구현 포인트

이 프로젝트는 일반적인 CRUD 앱보다 브라우저, 디자인 툴, 렌더링 파이프라인 사이의 경계를 다루는 데 초점을 두었습니다.

- React 기반 Figma Plugin UI를 Vite로 번들링하고 Figma Main Thread와 typed message contract로 통신하도록 구성
- 사용자가 실행하는 Website Import 작업을 capability 단위로 분리해 기능 확장이 가능한 구조 설계
- Figma API에 직접 종속되지 않는 Design IR을 정의해 Parser Server와 Plugin Renderer의 책임을 분리
- Figma 노드 생성 중 오류가 발생하면 세션 단위로 생성된 노드를 rollback할 수 있는 renderer runtime 구현
- 텍스트 렌더링에서 font family parsing, weight/style normalization, Figma font fallback, font-load cache를 분리
- 레이아웃 렌더링에서 parent-relative geometry, Auto Layout mapping, clipping, shadow 등 Figma 변환 규칙을 단계적으로 구현
- 브라우저 확장에서 active tab의 DOM, computed style, geometry, pseudo-element, inline SVG, asset reference를 캡처
- Parser Server에서 SSRF 위험을 줄이기 위해 URL 정규화, DNS/IP 검사, redirect policy, request limit, unsafe protocol 차단 적용
- Vitest fake adapter를 사용해 실제 Figma 호스트 없이 renderer, font, asset, SVG, message bus 동작을 검증

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Language | TypeScript |
| UI | React 18, React DOM |
| Build | Vite, esbuild, Turbo, pnpm workspace |
| Runtime | Figma Plugin API, Chrome Extension Manifest V3, Node.js |
| Server | Fastify, Playwright Chromium, tsx |
| Validation | Zod |
| Test | Vitest, Fake Adapter 기반 단위 테스트 |
| Quality | ESLint, Prettier, TypeScript project references |
| Architecture | Monorepo, shared contracts, Design IR, capability registry, renderer adapter boundary |

## 아키텍처

```text
Figma Plugin UI
  -> Typed Message Client
  -> Figma Plugin Main Thread
    -> Capability Registry
    -> Website Import Capability
    -> Parser Server API Client
    -> Design IR Renderer
    -> Figma Node Adapter
    -> Rollback / Progress Reporter

Parser Server
  -> URL Security Gate
  -> Analyze API
  -> Playwright Browser Runtime
  -> DOM / CSS / Geometry Extractor
  -> Layout and Sizing Inference
  -> Asset Reference / Resolution Pipeline
  -> Design IR Builder

Browser Extension
  -> Popup
  -> Background Runtime
  -> Content Script Capture Runtime
  -> Universal Capture Snapshot
```

Figma Plugin과 Parser Server는 서로 직접 내부 모듈을 import하지 않습니다. 두 런타임은 `packages/` 아래의 직렬화 가능한 shared contract와 Design IR을 통해서만 연결됩니다.

## 모노레포 구조

```text
apps/
  figma-plugin/       Figma Plugin UI, main thread, renderer runtime
  parser-server/      URL 분석 API, Playwright browser runtime, Design IR 생성
  browser-extension/  Chrome extension capture runtime
  fixture-website/    테스트용 fixture page

packages/
  shared-contracts/   메시지, 결과, 에러, 캡처 공용 계약
  design-ir/          브라우저 분석 결과와 Figma 렌더러 사이의 중간 표현
  dom-snapshot/       DOM snapshot 계약과 검증
  style-snapshot/     computed style snapshot 계약과 검증
  geometry-evidence/  viewport/document geometry evidence
  page-model/         정규화된 page model
  layout-evidence/    parent/child layout facts
  layout-inference/   rule-based layout mode inference
  sizing-inference/   width/height sizing inference
  asset-reference/    asset reference 계약
  resolved-assets/    asset resolution metadata 계약
```

## 면접관이 확인하기 좋은 부분

- `apps/figma-plugin/src/ui`: React로 작성된 플러그인 UI와 메시징 클라이언트
- `apps/figma-plugin/src/main/messaging`: Plugin UI와 Main Thread 사이의 typed message routing
- `apps/figma-plugin/src/main/capabilities`: capability 기반 기능 실행 구조
- `apps/figma-plugin/src/main/renderer`: Design IR을 Figma 노드로 변환하는 renderer runtime
- `apps/figma-plugin/src/main/renderer/text`: 폰트 매칭, fallback, TextNode 생성 정책
- `apps/figma-plugin/src/main/renderer/layout`: geometry와 layout evidence를 Figma frame/Auto Layout으로 매핑
- `apps/parser-server/src/security`: URL, DNS, redirect, request 보안 검사
- `apps/parser-server/src/browser`: Playwright 기반 브라우저 런타임과 네트워크 가드
- `apps/browser-extension/src/capture`: 브라우저 active tab capture pipeline
- `packages/design-ir`: 런타임 독립적인 intermediate representation 설계
- `packages/shared-contracts`: 앱 간 통신과 결과 계약
- `docs/adr`: 주요 설계 결정을 기록한 ADR 문서

## 실행 방법

### 요구 사항

- Node.js `>=20.11.0`
- pnpm `>=9.0.0`
- Figma Desktop 또는 Figma Plugin 개발 환경
- Parser Server 실행 시 Playwright Chromium

### 설치

```bash
corepack enable
corepack pnpm install
```

### 전체 개발 실행

```bash
corepack pnpm dev
```

### Figma Plugin만 실행

```bash
corepack pnpm --filter @aio/figma-plugin dev
```

Figma Desktop에서 `apps/figma-plugin/manifest.json`을 Development Plugin으로 등록해 실행합니다.

### Parser Server 실행

```bash
corepack pnpm --filter @aio/parser-server dev
```

기본 health check:

```bash
curl http://127.0.0.1:4000/health
```

### Browser Extension 빌드

```bash
corepack pnpm --filter @aio/browser-extension build
```

Chrome의 `chrome://extensions`에서 Developer Mode를 켜고 `apps/browser-extension/dist`를 로드합니다.

## 검증 명령

```bash
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test
corepack pnpm lint
git diff --check
```

## 현재 구현 범위와 한계

이 프로젝트는 Website Import MVP를 향해 단계적으로 구현 중입니다. 핵심 런타임, 계약, 보안 경계, 브라우저 분석, 렌더러 기반 구조는 구현되어 있으며, 모든 CSS 기능을 Figma 노드로 완벽하게 변환하는 것은 목표가 아닙니다.

의도적으로 제외한 범위는 다음과 같습니다.

- 로그인, paywall, 권한이 필요한 페이지 우회
- JavaScript 인터랙션, 애니메이션, canvas, WebGL, video, iframe 복원
- 모든 CSS 효과의 1:1 editable layer 변환
- 외부 웹사이트를 Figma Plugin 안에서 직접 fetch하거나 iframe으로 검사하는 방식

## 설계 문서

- [Product Vision](docs/PRODUCT_VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Repository Structure](docs/REPOSITORY_STRUCTURE.md)
- [Development Setup](docs/DEVELOPMENT_SETUP.md)
- [Security and Compliance](docs/SECURITY_AND_COMPLIANCE.md)
- [ADR](docs/adr)

## 포트폴리오 관점 요약

이 프로젝트는 프론트엔드 개발자가 단순 화면 구현을 넘어 브라우저 런타임, 디자인 툴 플러그인, 타입 기반 계약, 비동기 렌더링, 보안 제약, 테스트 가능한 아키텍처를 어떻게 다루는지 보여주기 위해 만들었습니다.

면접에서는 다음 역량을 중심으로 설명할 수 있습니다.

- 복잡한 사용자 작업을 capability 단위로 분리하는 설계 능력
- React UI와 Figma Plugin Main Thread 사이의 런타임 제약 이해
- DOM/CSS/Geometry 데이터를 제품 기능으로 변환하는 브라우저 기반 문제 해결력
- shared contract와 Zod validation을 통한 안정적인 앱 간 통신 설계
- 실제 외부 URL을 다룰 때 필요한 보안 경계와 fallback 설계
- fake adapter 기반 테스트로 외부 런타임 의존성을 줄이는 검증 전략
