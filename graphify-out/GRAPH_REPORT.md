# Graph Report - letscoding-editor  (2026-10-04)

## Corpus Check
- 85 files · ~58,291 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 506 nodes · 1014 edges · 45 communities (28 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.9)
- Token cost: 224,534 input · 31,640 output

## Community Hubs (Navigation)
- Editor Components
- Student GitHub Integration
- Server APIs and Security
- Development Dependencies
- Client Project Workflows
- Runtime Dependencies
- TypeScript Configuration
- Lounge Adapter
- Lounge Package Contracts
- Agent Rules and Architecture
- Lounge Database
- Requirements Traceability
- Epic Planning
- Monitoring and Redaction
- Editor Storage and Budgets
- Continuous Integration
- Project Implementation Plan
- Release Checklist
- Owner Preparation
- Human Review
- Milestone Implementation Status
- Teacher Guide
- Live Verification
- GitHub Integration Design
- Issue Planning
- Milestone Planning
- GitHub Registration
- GitHub Status Synchronization
- GitHub Database
- Internal Lounge Route
- App Layout
- Next Configuration
- Next Type Declarations
- PostCSS Configuration
- Agent Alignment
- Governance Model
- Project Plan Reference
- Review State

## God Nodes (most connected - your core abstractions)
1. `EditorApp()` - 35 edges
2. `githubAction()` - 22 edges
3. `admin()` - 22 edges
4. `GitHubError` - 21 edges
5. `POST()` - 19 edges
6. `assertPath()` - 18 edges
7. `api()` - 17 edges
8. `Project` - 17 edges
9. `appConfig()` - 16 edges
10. `textFile()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `라운지 내부 API 호출` --semantically_similar_to--> `내부 HMAC 호출`  [INFERRED] [semantically similar]
  docs/github-planning/traceability.md → integration/README.md
- `createLoungeHandler()` --calls--> `verifySignature()`  [EXTRACTED]
  integration/lounge-handler.ts → src/lib/server/internal-auth.ts
- `Claude Configuration` --references--> `Editor Agent Rules`  [EXTRACTED]
  CLAUDE.md → AGENTS.md
- `Project README` --references--> `Editor Agent Rules`  [EXTRACTED]
  README.md → AGENTS.md
- `GET()` --calls--> `appConfig()`  [EXTRACTED]
  src/app/api/config/route.ts → src/lib/server/config.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agent Governance Framework** — agents_md, claude_md, readme_md [INFERRED 0.85]
- **Deployment Integration Flow** — docs_01_project_plan_concept_lounge_deployment, docs_02_checklist_concept_hmac_security, docs_02_checklist_concept_deployment_validation [INFERRED 0.85]
- **기획 문서 체계** — docs_readme, docs_github_planning_readme, docs_github_planning_epics [INFERRED 0.85]
- **Lounge Deployment and Contract Flow** — docs_github_planning_milestones_concept_lounge_integration, docs_github_planning_registered_concept_lounge_contract_issues, docs_github_planning_milestones [INFERRED 0.85]

## Communities (45 total, 10 thin omitted)

### Community 0 - "Editor Components"
Cohesion: 0.07
Nodes (43): Dialog(), CodeDiff, CodeEditor, fileAction(), format(), imageAttach(), move(), mutateFiles() (+35 more)

### Community 1 - "Student GitHub Integration"
Cohesion: 0.11
Nodes (54): GET(), runtime, json(), maxDuration, POST(), runtime, GitHubChange, GitHubLink (+46 more)

### Community 2 - "Server APIs and Security"
Cohesion: 0.11
Nodes (39): config, groups, dynamic, GET(), maxDuration, POST(), runtime, GET() (+31 more)

### Community 3 - "Development Dependencies"
Cohesion: 0.05
Nodes (42): @axe-core/playwright, @electric-sql/pglite, eslint, eslint-config-next, devDependencies, @axe-core/playwright, @electric-sql/pglite, eslint (+34 more)

### Community 4 - "Client Project Workflows"
Cohesion: 0.15
Nodes (30): Callback(), EditorApp(), assign(), create(), deploySubmit(), download(), generateImage(), newThread() (+22 more)

### Community 5 - "Runtime Dependencies"
Cohesion: 0.06
Nodes (33): ai, jszip, lucide-react, monaco-editor, @monaco-editor/react, next, @openrouter/ai-sdk-provider, dependencies (+25 more)

### Community 6 - "TypeScript Configuration"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, integration/lounge-package, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 7 - "Lounge Adapter"
Cohesion: 0.18
Nodes (9): createLoungeHandler(), LoungeServices, requestSchema, CompleteInput, createLoungeServices(), PrepareInput, TrustedDeploy, deployForm (+1 more)

### Community 8 - "Lounge Package Contracts"
Cohesion: 0.16
Nodes (9): deployForm, EditorDeployForm, createLoungeHandler(), LoungeServices, requestSchema, verifySignature(), CompleteInput, PrepareInput (+1 more)

### Community 9 - "Agent Rules and Architecture"
Cohesion: 0.15
Nodes (13): Editor Agent Rules, AI Budgeting and Activation, Next.js Custom Rules, Sandbox Execution Policy, Security and Secret Policy, Claude Configuration, Compliance Linkage, Operational Standard (+5 more)

### Community 10 - "Lounge Database"
Cohesion: 0.20
Nodes (8): auth, editor, editor.editor_lounge_nonces, editor.editor_lounge_uploads, auth.users, editor.editor_projects, public, public.projects

### Community 11 - "Requirements Traceability"
Cohesion: 0.22
Nodes (9): 기능명세 추적표, RLS, 스트리밍 대화, 라운지 내부 API 호출, 3열 레이아웃, 라운지 연동 검토본, editor 스키마, 내부 HMAC 호출 (+1 more)

### Community 12 - "Epic Planning"
Cohesion: 0.25
Nodes (8): 에픽 초안, 라운지 배포 연동, GitHub 작업 등록 준비, AI 예산 및 사용량 통제, 인증 및 데이터 소유권 전략, MVP 범위 정의, 열린 결정 사항, 렛츠코딩 에디터 문서

### Community 13 - "Monitoring and Redaction"
Cohesion: 0.43
Nodes (4): onRouterTransitionStart, onRequestError, register(), redactEvent()

### Community 15 - "Continuous Integration"
Cohesion: 0.40
Nodes (5): GitHub Actions Workflow, Artifact Handling, CI Pipeline Definition, E2E Testing Strategy, Node Environment Setup

### Community 16 - "Project Implementation Plan"
Cohesion: 0.40
Nodes (5): 렛츠코딩 에디터 프로젝트 구현 계획, AI 채팅 및 도구 호출, 라운지 배포 파이프라인, Monaco Editor 셸, 가상 파일 시스템 (VFS)

### Community 17 - "Release Checklist"
Cohesion: 0.40
Nodes (5): 렛츠코딩 에디터 체크리스트, 미성년자 데이터 보호, 배포 검증 규칙, HMAC 내부 API 보안, 기술 검증 실험

### Community 18 - "Owner Preparation"
Cohesion: 0.40
Nodes (5): Owner Preparation Document, AI Budget Control, DNS Management, HMAC Security Implementation, Vercel Team Configuration

### Community 19 - "Human Review"
Cohesion: 0.40
Nodes (5): Human Review Document, Production Deployment Status, GitHub App Integration, IndexedDB Demo Storage, Supabase Auth Redirect Configuration

### Community 20 - "Milestone Implementation Status"
Cohesion: 0.40
Nodes (5): M0-M5 Implementation Status, AI Usage Budgeting, Lounge HMAC Deployment, Monaco Editor Loader, Postgres RLS Security

### Community 21 - "Teacher Guide"
Cohesion: 0.40
Nodes (5): Teacher Guide, Deployment Troubleshooting, Privacy and Consent, Session Management, Student Login Flow

### Community 22 - "Live Verification"
Cohesion: 0.40
Nodes (5): Live Verification Report, AI Cost Estimation, Nonce Idempotency, Storage Signed URLs, ZDR Validation

### Community 23 - "GitHub Integration Design"
Cohesion: 0.40
Nodes (5): GitHub Integration, GitHub App Security, GitHub OAuth PKCE, GitHub Scope Limits, GitHub Sync Logic

### Community 24 - "Issue Planning"
Cohesion: 0.40
Nodes (5): GitHub Planning Issues Document, AI Budget and Usage Control, Authentication and RLS Policy, Deployment ZIP Policy, Lounge Integration Contract

### Community 25 - "Milestone Planning"
Cohesion: 0.40
Nodes (5): Milestones Planning Document, AI Budget and Usage Control, Lounge Deployment Integration, Release Gates and Dependencies, Pilot and Stabilization Strategy

### Community 26 - "GitHub Registration"
Cohesion: 0.40
Nodes (5): GitHub Registration Results, GitHub Issue Tracking Structure, Lounge Contractual Issues, Implementation Status Synchronization, Registration Verification Rationale

### Community 27 - "GitHub Status Synchronization"
Cohesion: 0.40
Nodes (5): GitHub 구현 상태 동기화 2026-10-04, AI Production 예산 및 정책, 인증 및 PKCE 흐름, 라운지 DB 마이그레이션, Storage 보안 및 서명 정책

### Community 28 - "GitHub Database"
Cohesion: 0.40
Nodes (3): editor.editor_github_links, auth.users, editor.editor_projects

## Knowledge Gaps
- **184 isolated node(s):** `requestSchema`, `editor.editor_lounge_nonces`, `EditorDeployForm`, `requestSchema`, `runtime` (+179 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 232 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `EditorApp()` connect `Client Project Workflows` to `Editor Components`, `Server APIs and Security`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Development Dependencies`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `Project` connect `Editor Components` to `Student GitHub Integration`, `Server APIs and Security`, `Client Project Workflows`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `requestSchema`, `editor.editor_lounge_nonces`, `EditorDeployForm` to the rest of the system?**
  _184 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Editor Components` be split into smaller, more focused modules?**
  _Cohesion score 0.07236544549977386 - nodes in this community are weakly interconnected._
- **Should `Student GitHub Integration` be split into smaller, more focused modules?**
  _Cohesion score 0.10547875064004096 - nodes in this community are weakly interconnected._
- **Should `Server APIs and Security` be split into smaller, more focused modules?**
  _Cohesion score 0.11294117647058824 - nodes in this community are weakly interconnected._
## OpenRouter full reanalysis — 2026-10-04

- Re-extracted all 64 code files with AST and all 21 documents with OpenRouter Gemini 3.1 Flash Lite. Previous semantic results were replaced, not reused. ZDR and no data collection were requested.
- Result: 506 nodes, 1,014 edges, 45 communities. Document extraction produced 99 nodes and 79 relationships. This bounded semantic pass is a navigation summary, not exhaustive requirements coverage.
- Provider-reported usage, including discarded initial attempts: 224,534 input tokens, 31,640 output tokens, $0.1035935. One rejected schema request has no returned usage: $0.0124155 remains reserved as an uncertainty allowance, not a billed charge. Total conservative accounting: $0.116009, below the $0.25 job cap. A temporary provider 429 was retried successfully.
- Qualified 59 semantic node IDs by source path to prevent collisions. Corrected the AST Snapshot type / snapshot function ID collision. No application code was changed.
- Raw extraction retains 100 dangling-endpoint relationships; the graph omits them. There are 0 missing endpoint fields and 0 self-loops. Undirected serialization collapses 26 same-endpoint relationships. See graph-health.json and extraction.json for audit details.
- More communities than the previous build reflects sparse document-to-code links in this extraction; it does not establish architectural isolation. Real student GitHub consent and a repository round trip remain unverified.
- The application AI enable flag and environment values were not changed. The explicit user request activated this bounded analysis job only.

- Graphify benchmark estimate: ~33,733 naive tokens versus ~5,427 per graph query (6.2× reduction). Its sampled corpus count differs from full discovery; these are heuristic retrieval estimates, not measured API savings.
