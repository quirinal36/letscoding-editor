# Graph Report - letscoding-editor  (2026-10-04)

## Corpus Check
- 85 files · ~58,259 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 475 nodes · 1010 edges · 26 communities (13 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.83)
- Token cost: exact session/subagent input/output usage unavailable; zero counters are placeholders. No external paid extraction API was called.

## Community Hubs (Navigation)
- Editor Components and Files
- Student GitHub Integration
- Server APIs and Security
- Development and Test Dependencies
- Live Verification and Operations
- Application Runtime Dependencies
- Client Project Workflows
- Architecture and Milestone Plans
- TypeScript Compilation Settings
- Lounge Package Contracts
- Lounge Deployment Adapter
- GitHub and Lounge Database
- Error Monitoring and Redaction
- Editor Storage and Budgets
- Internal Deployment Route
- App Layout and Metadata
- Next Build Configuration
- Next Type Declarations
- PostCSS Style Configuration

## God Nodes (most connected - your core abstractions)
1. `EditorApp()` - 30 edges
2. `admin()` - 22 edges
3. `GitHubError` - 21 edges
4. `githubAction()` - 21 edges
5. `api()` - 17 edges
6. `Project` - 17 edges
7. `compilerOptions` - 16 edges
8. `appConfig()` - 16 edges
9. `github()` - 15 edges
10. `Student GitHub integration: implemented and configured; real student OAuth and repository round trip pending` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Uncertain deployment requires administrator receipt, lease and Storage inspection before retry` --semantically_similar_to--> `editor_lounge_uploads tracks SHA, idempotency, ownership, expiry, atomic pending-to-processing and completed receipt; uncertain outcomes remain needs_review`  [INFERRED] [semantically similar]
  docs/06-teacher-guide.md → integration/README.md
- `letscoding-editor` --references--> `M0–M5 코드 구현 결과`  [EXTRACTED]
  README.md → docs/05-implementation-status.md
- `createLoungeHandler()` --calls--> `verifySignature()`  [EXTRACTED]
  integration/lounge-handler.ts → src/lib/server/internal-auth.ts
- `에디터 작업 규약` --references--> `Preview runs in opaque-origin sandbox with CSP and data URL assets; external resources/fetch blocked with documented navigation and module limitations`  [EXTRACTED]
  AGENTS.md → docs/04-human-review.md
- `에디터 작업 규약` --references--> `AI requires explicit enablement, key, allowed model and positive daily/monthly/per-turn budgets; image generation requires separate reserves and enablement`  [EXTRACTED]
  AGENTS.md → docs/04-human-review.md

## Import Cycles
- None detected.

## Communities (26 total, 6 thin omitted)

### Community 0 - "Editor Components and Files"
Cohesion: 0.07
Nodes (42): Dialog(), CodeDiff, CodeEditor, upload(), Modal, GitHubPanel(), refresh(), ConsoleEntry (+34 more)

### Community 1 - "Student GitHub Integration"
Cohesion: 0.11
Nodes (53): GET(), runtime, json(), maxDuration, POST(), runtime, GitHubChange, GitHubLink (+45 more)

### Community 2 - "Server APIs and Security"
Cohesion: 0.11
Nodes (41): config, groups, dynamic, GET(), maxDuration, POST(), runtime, GET() (+33 more)

### Community 3 - "Development and Test Dependencies"
Cohesion: 0.05
Nodes (42): @axe-core/playwright, @electric-sql/pglite, eslint, eslint-config-next, devDependencies, @axe-core/playwright, @electric-sql/pglite, eslint (+34 more)

### Community 4 - "Live Verification and Operations"
Cohesion: 0.08
Nodes (37): 에디터 작업 규약, Human review and account setup: historical notes superseded by later live verification and GitHub setup records, Preview runs in opaque-origin sandbox with CSP and data URL assets; external resources/fetch blocked with documented navigation and module limitations, AI requires explicit enablement, key, allowed model and positive daily/monthly/per-turn budgets; image generation requires separate reserves and enablement, Staging, teacher/admin/inactive accounts, session expiry, billing reconciliation, deletion races, response-loss recovery, Sentry, cleanup cron and pilot remain, Login uses existing active Lounge account via password, email link or Kakao, Public issue reports exclude student code, chats, images and secrets; student AI use follows privacy/guardian-consent review, Teacher guide: saving, conflicts, preview, AI approval and deployment troubleshooting (+29 more)

### Community 5 - "Application Runtime Dependencies"
Cohesion: 0.06
Nodes (33): ai, jszip, lucide-react, monaco-editor, @monaco-editor/react, next, @openrouter/ai-sdk-provider, dependencies (+25 more)

### Community 6 - "Client Project Workflows"
Cohesion: 0.16
Nodes (30): Callback(), EditorApp(), assign(), create(), deploySubmit(), download(), fileAction(), format() (+22 more)

### Community 7 - "Architecture and Milestone Plans"
Cohesion: 0.10
Nodes (31): 렛츠코딩 에디터 — 프로젝트 구현 계획, editor_file_versions, HMAC internal Lounge API, Let’s Coding Lounge, Monaco Editor + React shell, OpenRouter, strict / data_collection deny / ZDR, Static ZIP deployment policy (+23 more)

### Community 8 - "TypeScript Compilation Settings"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, integration/lounge-package, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 9 - "Lounge Package Contracts"
Cohesion: 0.16
Nodes (9): deployForm, EditorDeployForm, createLoungeHandler(), LoungeServices, requestSchema, verifySignature(), CompleteInput, PrepareInput (+1 more)

### Community 10 - "Lounge Deployment Adapter"
Cohesion: 0.20
Nodes (8): createLoungeHandler(), LoungeServices, requestSchema, CompleteInput, createLoungeServices(), PrepareInput, TrustedDeploy, verifySignature()

### Community 11 - "GitHub and Lounge Database"
Cohesion: 0.17
Nodes (9): auth, auth.users, editor, editor.editor_projects, editor.editor_github_links, editor.editor_lounge_nonces, editor.editor_lounge_uploads, public (+1 more)

### Community 12 - "Error Monitoring and Redaction"
Cohesion: 0.36
Nodes (5): onRouterTransitionStart, onRequestError, register(), logAction(), redactEvent()

## Knowledge Gaps
- **113 isolated node(s):** `requestSchema`, `editor.editor_lounge_nonces`, `EditorDeployForm`, `requestSchema`, `runtime` (+108 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 165 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `EditorApp()` connect `Client Project Workflows` to `Editor Components and Files`, `Server APIs and Security`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `Project` connect `Editor Components and Files` to `Student GitHub Integration`, `Server APIs and Security`, `Client Project Workflows`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Application Runtime Dependencies` to `Development and Test Dependencies`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `requestSchema`, `editor.editor_lounge_nonces`, `EditorDeployForm` to the rest of the system?**
  _113 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Editor Components and Files` be split into smaller, more focused modules?**
  _Cohesion score 0.06734867860187553 - nodes in this community are weakly interconnected._
- **Should `Student GitHub Integration` be split into smaller, more focused modules?**
  _Cohesion score 0.10787942887361185 - nodes in this community are weakly interconnected._
- **Should `Server APIs and Security` be split into smaller, more focused modules?**
  _Cohesion score 0.10740203193033382 - nodes in this community are weakly interconnected._
## Incremental Update — 2026-10-04

- Corpus: 64 code files and 21 documents. Updated 27 code files and 6 documents; no deleted sources. Gitignored secrets, dependencies and generated build assets are excluded.
- Previous graph: 379 nodes / 758 edges. Current graph: 475 nodes / 1,010 edges / 26 communities.
- Changes: 109 new nodes, 333 new edges, 13 superseded nodes removed, 81 old edges removed. Changed sources replace their earlier extraction.
- Added password login, live student/AI/Lounge verification, GitHub UI/OAuth/PKCE/user-bound encrypted cookies, Git operations, revision checks, and GitHub SQL baseline synchronization. App registration/configuration is complete; real student GitHub consent and repository round trip remain unverified.
- AST covered all 27 changed code files. macOS process extraction fell back successfully to sequential extraction. All six changed documents were semantically extracted.
- Corrected one extractor ID collision: TypeScript `Snapshot` type (git.ts:L78) and `snapshot()` function (L85) had the same lowercased ID. The type is indexed as `src_lib_server_github_git_snapshot_type`; its declaration and verified type import in tests point to that node. Runtime calls retain the function node. No application source changed.

## Integrity Limits

- Raw extraction: 116 dangling-endpoint edges, 0 missing endpoints, 0 self-loops. The graph omits relationships whose endpoint has no extracted node; these are retained in `extraction.json` for audit.
- Undirected graph serialization collapses 28 same-endpoint relationships. The raw extraction preserves them; `graph-health.json` includes counts and examples. Existing unresolved/collapsed relations are not silently removed from the audit copy.
- This is a navigation index, not proof of runtime correctness or completed student GitHub authorization.
