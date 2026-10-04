# Graph Report - letscoding-editor  (2026-10-04)

## Corpus Check
- Corpus is ~48,646 words - fits in a single context window. You may not need a graph.

## Summary
- 379 nodes · 758 edges · 25 communities (12 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: exact session/subagent input/output usage unavailable; displayed counters are placeholders, not a zero-cost measurement. AST extraction used no external API.

## Community Hubs (Navigation)
- Server APIs and Security
- Editor Files and Preview
- Architecture and Acceptance Decisions
- Application Runtime Dependencies
- Client Project Workflows
- TypeScript Compilation Settings
- Development and Test Dependencies
- Lounge Integration Contracts
- Lounge Deployment Adapter
- Build and Development Scripts
- Lounge Upload Database
- Error Monitoring and Redaction
- Editor Storage and Budgets
- Internal Deployment Route
- App Layout and Metadata
- Next Build Configuration
- Next Type Declarations
- PostCSS Style Configuration

## God Nodes (most connected - your core abstractions)
1. `EditorApp()` - 35 edges
2. `POST()` - 17 edges
3. `api()` - 17 edges
4. `admin()` - 17 edges
5. `구현 후 사람이 준비·검토할 항목` - 17 edges
6. `appConfig()` - 16 edges
7. `assertPath()` - 16 edges
8. `compilerOptions` - 16 edges
9. `validateFiles()` - 15 edges
10. `Project` - 14 edges

## Surprising Connections (you probably didn't know these)
- `렛츠코딩 에디터 — 체크할 사항` --conceptually_related_to--> `Lounge-owned shared migration ledger`  [AMBIGUOUS]
  docs/02-checklist.md → integration/README.md
- `createLoungeHandler()` --calls--> `verifySignature()`  [EXTRACTED]
  integration/lounge-handler.ts → src/lib/server/internal-auth.ts
- `에디터 작업 규약` --references--> `구현 후 사람이 준비·검토할 항목`  [EXTRACTED]
  AGENTS.md → docs/04-human-review.md
- `에디터 작업 규약` --references--> `Opaque-origin sandbox preview with CSP and data URLs`  [EXTRACTED]
  AGENTS.md → docs/04-human-review.md
- `에디터 작업 규약` --references--> `Explicit paid-feature activation gates`  [EXTRACTED]
  AGENTS.md → docs/04-human-review.md

## Import Cycles
- None detected.

## Communities (25 total, 6 thin omitted)

### Community 0 - "Server APIs and Security"
Cohesion: 0.09
Nodes (47): config, groups, dynamic, GET(), maxDuration, POST(), runtime, GET() (+39 more)

### Community 1 - "Editor Files and Preview"
Cohesion: 0.08
Nodes (33): Dialog(), CodeDiff, CodeEditor, fileAction(), format(), imageAttach(), move(), mutateFiles() (+25 more)

### Community 2 - "Architecture and Acceptance Decisions"
Cohesion: 0.09
Nodes (48): 에디터 작업 규약, 렛츠코딩 에디터 — 프로젝트 구현 계획, editor_file_versions, HMAC internal Lounge API, Let’s Coding Lounge, Monaco Editor + React shell, OpenRouter, strict / data_collection deny / ZDR (+40 more)

### Community 3 - "Application Runtime Dependencies"
Cohesion: 0.06
Nodes (33): ai, jszip, lucide-react, monaco-editor, @monaco-editor/react, next, @openrouter/ai-sdk-provider, dependencies (+25 more)

### Community 4 - "Client Project Workflows"
Cohesion: 0.18
Nodes (27): Callback(), EditorApp(), assign(), create(), deploySubmit(), download(), generateImage(), newThread() (+19 more)

### Community 5 - "TypeScript Compilation Settings"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, integration/lounge-package, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 6 - "Development and Test Dependencies"
Cohesion: 0.08
Nodes (25): @axe-core/playwright, @electric-sql/pglite, eslint, eslint-config-next, devDependencies, @axe-core/playwright, @electric-sql/pglite, eslint (+17 more)

### Community 7 - "Lounge Integration Contracts"
Cohesion: 0.19
Nodes (8): createLoungeHandler(), LoungeServices, requestSchema, CompleteInput, createLoungeServices(), PrepareInput, TrustedDeploy, verifySignature()

### Community 8 - "Lounge Deployment Adapter"
Cohesion: 0.16
Nodes (9): deployForm, EditorDeployForm, createLoungeHandler(), LoungeServices, requestSchema, verifySignature(), CompleteInput, PrepareInput (+1 more)

### Community 9 - "Build and Development Scripts"
Cohesion: 0.11
Nodes (17): engines, node, name, private, scripts, build, check, check:env (+9 more)

### Community 10 - "Lounge Upload Database"
Cohesion: 0.20
Nodes (8): auth, auth.users, editor, editor.editor_projects, editor.editor_lounge_nonces, editor.editor_lounge_uploads, public, public.projects

### Community 11 - "Error Monitoring and Redaction"
Cohesion: 0.43
Nodes (4): onRouterTransitionStart, onRequestError, register(), redactEvent()

## Ambiguous Edges - Review These
- `렛츠코딩 에디터 — 체크할 사항` → `Lounge-owned shared migration ledger`  [AMBIGUOUS]
  docs/02-checklist.md · relation: conceptually_related_to
- `구현 착수 — 사용자 준비와 결정` → `editor.letscoding.kr production deployment`  [AMBIGUOUS]
  docs/03-owner-preparation.md · relation: conceptually_related_to

## Knowledge Gaps
- **102 isolated node(s):** `requestSchema`, `editor.editor_lounge_nonces`, `EditorDeployForm`, `requestSchema`, `runtime` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 142 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `렛츠코딩 에디터 — 체크할 사항` and `Lounge-owned shared migration ledger`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `구현 착수 — 사용자 준비와 결정` and `editor.letscoding.kr production deployment`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `EditorApp()` connect `Client Project Workflows` to `Server APIs and Security`, `Editor Files and Preview`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Application Runtime Dependencies` to `Build and Development Scripts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Development and Test Dependencies` to `Build and Development Scripts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `requestSchema`, `editor.editor_lounge_nonces`, `EditorDeployForm` to the rest of the system?**
  _102 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Server APIs and Security` be split into smaller, more focused modules?**
  _Cohesion score 0.09398907103825137 - nodes in this community are weakly interconnected._
## Build Integrity and Scope

- Local build covers 53 code files and 19 documents; gitignored secrets, node_modules, build artifacts and generated Monaco assets were excluded.
- AST extraction reported no failed sources. macOS subprocess extraction fell back to successful sequential extraction.
- All 19 documents produced semantic nodes; no external paid extraction API was called.
- Raw extraction contains 87 dangling-endpoint edges (including external dependency references and SQL symbol references). They are not represented as edges in the final graph because endpoint nodes are absent.
- Undirected Graph representation collapsed 24 same-endpoint relations. Full raw relationships are retained in `extraction.json`; diagnostic counts and examples are in `graph-health.json`.
- This graph is a navigational index, not proof that live login/AI billing/Lounge deployment acceptance passed.
