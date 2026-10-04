"use client";
/* eslint-disable @next/next/no-img-element -- User VFS images are private data/blob URLs and cannot use remote optimization. */
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Download,
  FileCode2,
  FilePlus2,
  Folder,
  FolderOpen,
  FolderPlus,
  ImagePlus,
  LoaderCircle,
  Menu,
  MessageSquare,
  Moon,
  MoreHorizontal,
  Paperclip,
  Play,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Upload,
  X,
  Rocket,
  CheckCheck,
  PanelRightClose,
  PanelLeftClose,
  Palette,
} from "lucide-react";
import { Dialog } from "./dialog";
import { Preview, type ConsoleEntry } from "./preview";
import {
  api,
  browserSupabase,
  hydrateProject,
  listProjects,
  saveProject,
  uploadAttachments,
} from "@/lib/client";
import { createProject, TEMPLATES } from "@/lib/templates";
import {
  applyProposal,
  assertPath,
  language,
  LIMITS,
  moveFile,
  textFile,
  validateFiles,
} from "@/lib/vfs";
import { createArtifact, importArtifact, mimeFor } from "@/lib/artifact";
import { demoAnswer } from "@/lib/demo-ai";
import type {
  AppConfig,
  ChatMessage,
  Project,
  Proposal,
  SessionUser,
  Usage,
} from "@/lib/types";
const CodeEditor = dynamic(
  () => import("./code-editor").then((m) => m.CodeEditor),
  { ssr: false },
);
const CodeDiff = dynamic(
  () => import("./code-editor").then((m) => m.CodeDiff),
  { ssr: false },
);
type Modal =
  | "projects"
  | "new-file"
  | "new-folder"
  | "rename"
  | "delete"
  | "quick-open"
  | "commands"
  | "deploy"
  | "usage"
  | null;
const fileReader = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
export function EditorApp({ config }: { config: AppConfig }) {
  const [user, setUser] = useState<SessionUser | null>(
      config.demo ? { id: "demo", role: "student" } : null,
    ),
    [project, setProject] = useState<Project | null>(null),
    [projects, setProjects] = useState<Project[]>([]),
    [ready, setReady] = useState(false),
    [email, setEmail] = useState("");
  const [password, setPassword] = useState(""),
    [loginMode, setLoginMode] = useState<"password" | "link">("password"),
    [loginPending, setLoginPending] = useState(false);
  const [theme, setTheme] = useState("dark"),
    [explorer, setExplorer] = useState(true),
    [chatVisible, setChatVisible] = useState(true),
    [tabs, setTabs] = useState<string[]>(["index.html", "style.css"]),
    [active, setActive] = useState("index.html"),
    [pane, setPane] = useState<"code" | "preview">("code"),
    [split, setSplit] = useState(false),
    [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [status, setStatus] = useState<"saved" | "saving" | "dirty" | "error">(
      "saved",
    ),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [modal, setModal] = useState<Modal>(null),
    [name, setName] = useState(""),
    [target, setTarget] = useState(""),
    [formError, setFormError] = useState(""),
    [template, setTemplate] = useState("game"),
    [search, setSearch] = useState(""),
    [expanded, setExpanded] = useState<Set<string>>(new Set()),
    [selected, setSelected] = useState("index.html"),
    [changed, setChanged] = useState<Set<string>>(new Set()),
    [unsaved, setUnsaved] = useState<Set<string>>(new Set());
  const [threadId, setThreadId] = useState(""),
    [prompt, setPrompt] = useState(""),
    [busy, setBusy] = useState(false),
    [streamText, setStreamText] = useState(""),
    [model, setModel] = useState(config.models.find((m) => !m.image)?.id ?? ""),
    [selection, setSelection] = useState(""),
    [attachSelection, setAttachSelection] = useState(false),
    [attachments, setAttachments] = useState<string[]>([]),
    [logs, setLogs] = useState<ConsoleEntry[]>([]),
    [diff, setDiff] = useState<Proposal | null>(null),
    [jump, setJump] = useState(0),
    [usage, setUsage] = useState<Usage | null>(null),
    [usageDays, setUsageDays] = useState<
      {
        date: string;
        cost_usd: number;
        prompt_tokens: number;
        completion_tokens: number;
      }[]
    >([]),
    [uploadProgress, setUploadProgress] = useState(""),
    [usageClock] = useState(() => Date.now()),
    [prices, setPrices] = useState<
      { id: string; inputPrice: number | null; outputPrice: number | null }[]
    >([]);
  const [deployFields, setDeployFields] = useState({
    title: "",
    description: "",
    category: "web_game",
    slug: "",
    isPublished: true,
    isListed: true,
    thumbnailPath: "",
  });
  const current = useRef<Project | null>(null),
    persistedRevision = useRef(0),
    dirty = useRef(false),
    saveQueue = useRef<Promise<unknown>>(Promise.resolve()),
    abort = useRef<AbortController | null>(null),
    fileInput = useRef<HTMLInputElement>(null),
    imageInput = useRef<HTMLInputElement>(null),
    chatBottom = useRef<HTMLDivElement>(null),
    dragPath = useRef(""),
    tabDrag = useRef(""),
    pendingCode = useRef("");
  const thread =
    project?.threads.find((t) => t.id === threadId) ?? project?.threads[0];
  const fail = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : String(e));
  }, []);
  function assign(next: Project) {
    current.current = next;
    setProject(next);
  }
  async function refreshUsage() {
    if (config.demo) return;
    try {
      const result = await (await api("usage")).json();
      setUsage(result);
      setUsageDays(result.days ?? []);
    } catch {
      /* Usage absence must not disable editing. */
    }
  }
  const flush = useCallback(
    async (advance = true) => {
      const run = async () => {
        const snapshot = current.current;
        if (!snapshot) return;
        setStatus("saving");
        try {
          const saved = await saveProject(
            snapshot,
            persistedRevision.current,
            config.demo,
            advance,
          );
          persistedRevision.current = saved.revision;
          if (current.current === snapshot) {
            current.current = saved;
            setProject(saved);
            dirty.current = false;
            setUnsaved(new Set());
            setStatus("saved");
          } else if (current.current) {
            const merged = { ...current.current, revision: saved.revision };
            current.current = merged;
            setProject(merged);
            dirty.current = true;
            setUnsaved(
              new Set(
                Object.keys(merged.files).filter(
                  (path) =>
                    merged.files[path].content !== saved.files[path]?.content ||
                    merged.files[path].kind !== saved.files[path]?.kind,
                ),
              ),
            );
            setStatus("dirty");
          }
        } catch (e) {
          setStatus("error");
          dirty.current = true;
          fail(e);
          throw e;
        }
      };
      const promise = saveQueue.current.catch(() => {}).then(run);
      saveQueue.current = promise;
      return promise;
    },
    [config.demo, fail],
  );
  async function openProject(next: Project) {
    if (busy) return;
    if (dirty.current) await flush();
    const hydrated = config.demo
      ? next
      : await hydrateProject(
          await (await api("get", { projectId: next.id })).json(),
        );
    persistedRevision.current = hydrated.revision;
    dirty.current = false;
    assign(hydrated);
    setThreadId(hydrated.threads[0]?.id ?? "");
    const first = hydrated.files["index.html"]
      ? "index.html"
      : (Object.keys(hydrated.files).find(
          (p) => hydrated.files[p].kind !== "directory",
        ) ?? "");
    setTabs(first ? [first] : []);
    setActive(first);
    setSelected(first);
    setStatus("saved");
    setUnsaved(new Set());
    setModal(null);
    setDiff(null);
    setExpanded(
      new Set(
        Object.keys(hydrated.files).filter(
          (p) => hydrated.files[p].kind === "directory",
        ),
      ),
    );
  }
  useEffect(() => {
    const init = async () => {
      try {
        setTheme(localStorage.getItem("editor-theme") ?? "dark");
        setExplorer(localStorage.getItem("editor-explorer") !== "false");
        setChatVisible(localStorage.getItem("editor-chat") !== "false");
        if (!config.demo) {
          if (!config.cloud) {
            setReady(true);
            return;
          }
          const session = await browserSupabase().auth.getSession();
          if (!session.data.session) {
            setReady(true);
            return;
          }
          const account = await (await api("session")).json();
          setUser(account);
        }
        let available = await listProjects(config.demo);
        if (config.demo && !available.length) {
          const sample = createProject("game", "나의 첫 클릭 게임");
          await saveProject(sample, -1, true);
          available = await listProjects(true);
        }
        setProjects(available);
        const first = available[0];
        if (first) {
          const hydrated = config.demo
            ? first
            : await hydrateProject(
                await (await api("get", { projectId: first.id })).json(),
              );
          current.current = hydrated;
          persistedRevision.current = hydrated.revision;
          setProject(hydrated);
          setThreadId(hydrated.threads[0]?.id ?? "");
        } else setModal("projects");
      } catch (e) {
        fail(e);
      } finally {
        setReady(true);
      }
    };
    void init();
  }, [config.demo, config.cloud, fail]);
  useEffect(() => {
    if (!config.demo)
      void fetch("/api/models")
        .then((r) => r.json())
        .then(setPrices)
        .catch(() => {});
  }, [config.demo]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (ready) localStorage.setItem("editor-theme", theme);
  }, [theme, ready]);
  useEffect(() => {
    if (ready) {
      localStorage.setItem("editor-explorer", String(explorer));
      localStorage.setItem("editor-chat", String(chatVisible));
    }
  }, [explorer, chatVisible, ready]);
  useEffect(() => {
    if (!project || !dirty.current) return;
    const timer = setTimeout(() => void flush().catch(() => {}), 1000);
    return () => clearTimeout(timer);
  }, [project, flush]);
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);
  const projectId = project?.id;
  useEffect(() => {
    if (!projectId) return;
    const channel = new BroadcastChannel("letscoding-editor-tabs"),
      id = crypto.randomUUID();
    channel.postMessage({ type: "opened", projectId, id });
    channel.onmessage = (e) => {
      if (e.data.projectId !== projectId || e.data.id === id) return;
      if (e.data.type === "opened") {
        setNotice(
          "다른 탭에서도 이 프로젝트를 열었습니다. 한 탭에서만 편집하세요.",
        );
        channel.postMessage({ type: "present", projectId, id });
      } else if (e.data.type === "present")
        setNotice(
          "다른 탭에서도 이 프로젝트를 열었습니다. 한 탭에서만 편집하세요.",
        );
    };
    return () => channel.close();
  }, [projectId]);
  useEffect(() => {
    chatBottom.current?.scrollIntoView({ block: "nearest" });
  }, [thread?.messages.length, streamText]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(timeout);
  }, [notice]);
  const keyHandler = useEffectEvent((e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key.toLowerCase() === "s") {
      e.preventDefault();
      void flush().catch(() => {});
    }
    if (e.key.toLowerCase() === "b") {
      e.preventDefault();
      setExplorer((v) => !v);
    }
    if (e.key.toLowerCase() === "p") {
      e.preventDefault();
      setSearch("");
      setModal(e.shiftKey ? "commands" : "quick-open");
    }
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandler(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  function mutateFiles(files: Project["files"]) {
    try {
      validateFiles(files);
      const prev = current.current;
      if (!prev) return;
      setUnsaved(
        (before) =>
          new Set([
            ...before,
            ...Object.keys(files).filter(
              (path) =>
                files[path].content !== prev.files[path]?.content ||
                files[path].kind !== prev.files[path]?.kind,
            ),
          ]),
      );
      assign({ ...prev, files });
      dirty.current = true;
      setStatus("dirty");
    } catch (e) {
      fail(e);
    }
  }
  function openFile(path: string) {
    setActive(path);
    setSelected(path);
    setTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setPane("code");
    setDiff(null);
    setChanged((prev) => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  }
  function showModal(type: Modal, path = selected) {
    pendingCode.current = "";
    setModal(type);
    setTarget(path);
    setName(type === "rename" ? path : "");
    setFormError("");
    setSearch("");
  }
  async function fileAction(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;
    try {
      if (modal === "delete") {
        const files = { ...project.files };
        for (const p of Object.keys(files))
          if (p === target || p.startsWith(target + "/")) delete files[p];
        mutateFiles(files);
        setTabs((t) =>
          t.filter((p) => p !== target && !p.startsWith(target + "/")),
        );
        if (active === target || active.startsWith(target + "/")) setActive("");
      } else {
        assertPath(name);
        if (modal === "rename") {
          const files = moveFile(project.files, target, name);
          mutateFiles(files);
          setTabs((t) =>
            t.map((p) =>
              p === target || p.startsWith(target + "/")
                ? name + p.slice(target.length)
                : p,
            ),
          );
          if (active === target || active.startsWith(target + "/"))
            setActive(name + active.slice(target.length));
          setNotice(
            "이름을 변경했습니다. import와 상대 경로 참조는 함께 확인해주세요.",
          );
        } else {
          if (project.files[name])
            throw new Error("같은 이름이 이미 있습니다.");
          const file =
            modal === "new-folder"
              ? { kind: "directory" as const, content: "", mime: "", size: 0 }
              : textFile(pendingCode.current);
          pendingCode.current = "";
          mutateFiles({ ...project.files, [name]: file });
          if (modal === "new-folder")
            setExpanded((prev) => new Set([...prev, name]));
          else openFile(name);
        }
      }
      setModal(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      const title =
        name.trim() || TEMPLATES.find((t) => t.id === template)!.title;
      const next = config.demo
        ? await saveProject(createProject(template, title), -1, true)
        : await (await api("create", { template, title })).json();
      setProjects(await listProjects(config.demo));
      await openProject(next);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  }
  async function projectAction(
    action: "delete" | "duplicate" | "rename",
    item: Project,
  ) {
    try {
      if (action === "delete") {
        setTarget(item.id);
        setModal("projects");
        if (
          !window.confirm(
            `${item.title} 프로젝트를 삭제할까요? 30일간 보관됩니다.`,
          )
        )
          return;
        if (config.demo)
          await saveProject(
            { ...item, deletedAt: new Date().toISOString() },
            item.revision,
            true,
          );
        else await api("delete", { projectId: item.id });
        setProjects(await listProjects(config.demo));
        if (project?.id === item.id) {
          current.current = null;
          setProject(null);
        }
      } else if (action === "duplicate") {
        const next = config.demo
          ? await saveProject(
              {
                ...structuredClone(item),
                id: crypto.randomUUID(),
                title: item.title + " 복사본",
                loungeId: undefined,
                revision: 0,
                threads: [
                  {
                    id: crypto.randomUUID(),
                    title: "새 대화",
                    autoApply: false,
                    messages: [],
                  },
                ],
                deployments: [],
              },
              -1,
              true,
            )
          : await (await api("duplicate", { projectId: item.id })).json();
        setProjects(await listProjects(config.demo));
        await openProject(next);
      } else {
        const title = window.prompt("프로젝트 이름", item.title)?.trim();
        if (!title) return;
        const next = config.demo
          ? await saveProject({ ...item, title }, item.revision, true)
          : await (
              await api("rename-project", { projectId: item.id, title })
            ).json();
        setProjects(await listProjects(config.demo));
        if (project?.id === item.id) await openProject(next);
      }
    } catch (e) {
      fail(e);
    }
  }
  async function upload(files: FileList | File[] | null) {
    if (!files || !project) return;
    try {
      let next = { ...current.current!.files },
        index = 0;
      for (const file of Array.from(files)) {
        setUploadProgress(`${++index}/${files.length} ${file.name}`);
        if (file.name.toLowerCase().endsWith(".zip")) {
          const imported = await importArtifact(await file.arrayBuffer());
          if (
            Object.keys(imported).some((p) => next[p]) &&
            !window.confirm("같은 이름의 파일을 덮어쓸까요?")
          )
            continue;
          next = { ...next, ...imported };
        } else {
          assertPath(file.name);
          if (file.size > LIMITS.upload)
            throw new Error(`${file.name}: 파일당 5MB 이하만 가능합니다.`);
          if (next[file.name] && !window.confirm(`${file.name}을 덮어쓸까요?`))
            continue;
          next[file.name] = /\.(html?|css|m?js|ts|json|md|txt|svg)$/i.test(
            file.name,
          )
            ? textFile(await file.text(), file.type || "text/plain")
            : {
                kind: "binary",
                content: await fileReader(file),
                mime: file.type || mimeFor(file.name),
                size: file.size,
              };
        }
      }
      mutateFiles(next);
      setNotice("파일을 가져왔습니다.");
    } catch (e) {
      fail(e);
    } finally {
      setUploadProgress("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  function move(from: string, toFolder: string) {
    if (!project || !from) return;
    const to = toFolder
      ? `${toFolder}/${from.split("/").at(-1)}`
      : from.split("/").at(-1)!;
    try {
      let files;
      try {
        files = moveFile(project.files, from, to);
      } catch (e) {
        if (
          !String(e).includes("덮어쓰기") ||
          !window.confirm(`${to} 경로를 덮어쓸까요?`)
        )
          throw e;
        files = moveFile(project.files, from, to, true);
      }
      mutateFiles(files);
      setTabs((t) =>
        t.map((p) =>
          p === from || p.startsWith(from + "/")
            ? to + p.slice(from.length)
            : p,
        ),
      );
      if (active === from || active.startsWith(from + "/"))
        setActive(to + active.slice(from.length));
    } catch (e) {
      fail(e);
    }
  }
  async function newThread() {
    if (!project || busy) return;
    try {
      if (config.demo) {
        const next = {
          ...project,
          threads: [
            ...project.threads,
            {
              id: crypto.randomUUID(),
              title: "새 대화",
              autoApply: false,
              messages: [],
            },
          ],
        };
        assign(next);
        await flush(false);
        setThreadId(next.threads.at(-1)!.id);
      } else {
        const next = await (
          await api("thread", { projectId: project.id })
        ).json();
        assign(await hydrateProject(next));
        setThreadId(next.threads.at(-1)!.id);
      }
    } catch (e) {
      fail(e);
    }
  }
  async function toggleAuto() {
    if (!project || !thread || busy) return;
    try {
      if (config.demo) {
        assign({
          ...project,
          threads: project.threads.map((t) =>
            t.id === thread.id ? { ...t, autoApply: !t.autoApply } : t,
          ),
        });
        await flush(false);
      } else {
        const next = await (
          await api("thread", {
            projectId: project.id,
            threadId: thread.id,
            autoApply: !thread.autoApply,
          })
        ).json();
        assign(await hydrateProject(next));
      }
    } catch (e) {
      fail(e);
    }
  }
  async function review(proposal: Proposal, apply: boolean) {
    if (!project) return;
    try {
      if (dirty.current) await flush();
      const base = current.current!;
      let next: Project;
      if (config.demo) {
        const stored = base.threads
          .flatMap((t) => t.messages)
          .flatMap((m) => m.proposals)
          .find((p) => p.id === proposal.id);
        if (!stored) throw new Error("변경안을 찾을 수 없습니다.");
        next = apply ? applyProposal(base, stored) : base;
        stored.status = apply ? "applied" : "rejected";
        assign({ ...next, threads: [...next.threads] });
        await flush(apply);
      } else {
        next = await (
          await api(apply ? "approve" : "reject", {
            projectId: base.id,
            proposalId: proposal.id,
          })
        ).json();
        persistedRevision.current = next.revision;
        assign(await hydrateProject(next));
      }
      if (apply) {
        setChanged(
          (prev) => new Set([...prev, proposal.target ?? proposal.path]),
        );
        if (proposal.operation === "rename") {
          setTabs((t) =>
            t.map((p) => (p === proposal.path ? proposal.target! : p)),
          );
          if (active === proposal.path) setActive(proposal.target!);
        }
        if (proposal.operation === "delete") {
          setTabs((t) => t.filter((p) => p !== proposal.path));
          if (active === proposal.path) setActive("");
        }
        setNotice("AI 변경을 적용했습니다.");
      }
      setDiff(null);
    } catch (e) {
      fail(e);
    }
  }
  async function send(e?: React.FormEvent, textOverride?: string) {
    e?.preventDefault();
    const text = textOverride ?? prompt;
    if (!text.trim() || !project || !thread || busy) return;
    setError("");
    setBusy(true);
    setPrompt("");
    setStreamText("");
    const controller = new AbortController();
    abort.current = controller;
    try {
      if (dirty.current) await flush();
      const base = current.current!,
        threadNow = base.threads.find((t) => t.id === thread.id)!;
      if (config.demo) {
        const message: ChatMessage = {
          id: crypto.randomUUID(),
          role: "user",
          text,
          proposals: [],
          status: "complete",
          images: [...attachments],
          selection: attachSelection ? selection : undefined,
        };
        threadNow.messages.push(message);
        if (threadNow.title === "새 대화") threadNow.title = text.slice(0, 30);
        assign({ ...base, threads: [...base.threads] });
        await flush(false);
        const answer = demoAnswer(current.current!, text);
        let partial = "";
        for (const token of answer.text) {
          if (controller.signal.aborted) break;
          partial += token;
          setStreamText(partial);
          await new Promise((r) => setTimeout(r, 8));
        }
        answer.text = partial;
        answer.status = controller.signal.aborted ? "interrupted" : "complete";
        if (controller.signal.aborted) answer.proposals = [];
        threadNow.messages.push(answer);
        assign({ ...current.current!, threads: [...base.threads] });
        await flush(false);
        setStreamText("");
        if (threadNow.autoApply && !controller.signal.aborted)
          for (const proposal of answer.proposals)
            if (["create", "write"].includes(proposal.operation))
              await review(proposal, true);
      } else {
        if (!config.ai)
          throw new Error("실제 AI는 키·모델·예산 설정 후 사용할 수 있습니다.");
        const response = await api(
          "chat",
          {
            projectId: base.id,
            threadId: thread.id,
            text,
            model,
            activeFile: active,
            selection: attachSelection ? selection : undefined,
            images: await uploadAttachments(attachments, project.id, thread.id),
            previewErrors: logs
              .filter((l) => l.level === "error")
              .map(({ text, path, line }) => ({ text, path, line })),
          },
          controller.signal,
        );
        const reader = response.body!.getReader(),
          decoder = new TextDecoder();
        let buffer = "",
          partial = "";
        let message: ChatMessage | undefined;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop()!;
          for (const line of lines) {
            if (!line) continue;
            const event = JSON.parse(line);
            if (event.type === "delta") {
              partial += event.text;
              setStreamText(partial);
            }
            if (event.type === "error") setError(event.error);
            if (event.type === "done") message = event.message;
          }
        }
        if (dirty.current) await flush();
        const latest = await (await api("get", { projectId: base.id })).json();
        persistedRevision.current = latest.revision;
        assign(await hydrateProject(latest));
        setStreamText("");
        if (threadNow.autoApply && message)
          for (const proposal of message.proposals)
            if (["write", "create"].includes(proposal.operation))
              await review(proposal, true);
        await refreshUsage();
      }
      setAttachments([]);
      setAttachSelection(false);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) fail(e);
      else setNotice("응답을 중단했습니다. 부분 응답은 대화에 보관됩니다.");
    } finally {
      setBusy(false);
      setStreamText("");
      abort.current = null;
    }
  }
  async function imageAttach(files: FileList | null) {
    if (!files) return;
    try {
      if (attachments.length + files.length > 3)
        throw new Error("이미지는 최대 3장까지 첨부할 수 있습니다.");
      const values: string[] = [];
      for (const file of Array.from(files)) {
        if (
          !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
          file.size > LIMITS.upload
        )
          throw new Error("PNG/JPG/WebP, 각 5MB 이하만 첨부할 수 있습니다.");
        values.push(await fileReader(file));
      }
      setAttachments((prev) => [...prev, ...values]);
    } catch (e) {
      fail(e);
    } finally {
      if (imageInput.current) imageInput.current.value = "";
    }
  }
  async function generateImage() {
    if (!project || !prompt.trim() || busy) return;
    try {
      if (config.demo)
        throw new Error(
          "이미지 생성은 외부 모델 설정과 과금 검증이 필요합니다. 이미지 파일 업로드는 사용할 수 있습니다.",
        );
      if (dirty.current) await flush();
      setBusy(true);
      const next = await (
        await api("image", { projectId: project.id, prompt })
      ).json();
      persistedRevision.current = next.revision;
      assign(await hydrateProject(next));
      setPrompt("");
      setNotice("생성 이미지를 images/ 폴더에 저장했습니다.");
      await refreshUsage();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    if (!project) return;
    try {
      if (dirty.current) await flush();
      const artifact = await createArtifact(current.current!.files);
      const url = URL.createObjectURL(
          new Blob([new Uint8Array(artifact.bytes)], {
            type: "application/zip",
          }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = `${current.current!.title.replace(/[^\p{L}\p{N}_-]/gu, "_")}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("라운지 정책으로 검증한 ZIP을 내려받았습니다.");
    } catch (e) {
      fail(e);
    }
  }
  function openDeploy() {
    if (!project) return;
    const previous = project.deployments
      .slice()
      .reverse()
      .find((d) => d.form)?.form;
    setDeployFields({
      title: previous?.title ?? project.title,
      description: previous?.description ?? "",
      category: previous?.category ?? "web_game",
      slug: previous?.slug ?? `project-${project.id.slice(0, 8)}`,
      isPublished: previous?.isPublished ?? true,
      isListed: previous?.isListed ?? true,
      thumbnailPath: previous?.thumbnailPath ?? "",
    });
    setFormError("");
    setModal("deploy");
  }
  async function deploySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;
    setBusy(true);
    setFormError("");
    try {
      if (dirty.current) await flush();
      if (config.demo) {
        const artifact = await createArtifact(current.current!.files);
        const next = {
          ...current.current!,
          deployments: [
            ...current.current!.deployments,
            {
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              status: "validated" as const,
              form: { ...deployFields },
              sha256: artifact.sha256,
              policyVersion: artifact.policyVersion,
            },
          ],
        };
        assign(next);
        await flush(false);
        setNotice(
          "ZIP 검증을 완료했습니다. 실제 라운지 배포는 연결 후 사용할 수 있어요.",
        );
      } else {
        const next = await (
          await api("deploy", { projectId: project.id, form: deployFields })
        ).json();
        if (dirty.current) await flush();
        const latest = await (await api("get", { projectId: next.id })).json();
        persistedRevision.current = latest.revision;
        assign(await hydrateProject(latest));
        setNotice("작품을 라운지에 배포했습니다.");
      }
      setModal(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function format() {
    if (!project || project.files[active]?.kind !== "text") return;
    try {
      const prettier = await import("prettier/standalone"),
        html = await import("prettier/plugins/html"),
        babel = await import("prettier/plugins/babel"),
        estree = await import("prettier/plugins/estree"),
        postcss = await import("prettier/plugins/postcss");
      const parser = (
        {
          html: "html",
          css: "css",
          javascript: "babel",
          typescript: "babel-ts",
          json: "json",
          markdown: "markdown",
        } as Record<string, string>
      )[language(active)];
      if (!parser || parser === "markdown")
        throw new Error("HTML·CSS·JS·TS·JSON 파일을 선택해주세요.");
      const content = await prettier.format(project.files[active].content, {
        parser,
        plugins: [html, babel, estree, postcss],
      });
      mutateFiles({
        ...project.files,
        [active]: textFile(content, project.files[active].mime),
      });
    } catch (e) {
      fail(e);
    }
  }
  const commands = [
    "새 파일",
    "새 폴더",
    "파일 저장",
    "라운지 배포",
    "ZIP 다운로드",
    "테마 전환",
    "탐색기 접기/펼치기",
    "AI 패널 접기/펼치기",
    "미리보기 열기",
    "코드 정리",
    "코드와 미리보기 분할",
  ];
  function runCommand(title: string) {
    switch (title) {
      case "코드와 미리보기 분할":
        setSplit((v) => !v);
        break;
      case "새 파일":
        showModal("new-file");
        break;
      case "새 폴더":
        showModal("new-folder");
        break;
      case "파일 저장":
        void flush().catch(() => {});
        break;
      case "라운지 배포":
        openDeploy();
        break;
      case "ZIP 다운로드":
        void download();
        break;
      case "테마 전환":
        setTheme((t) => (t === "dark" ? "light" : "dark"));
        break;
      case "탐색기 접기/펼치기":
        setExplorer((v) => !v);
        break;
      case "AI 패널 접기/펼치기":
        setChatVisible((v) => !v);
        break;
      case "미리보기 열기":
        setPane("preview");
        break;
      case "코드 정리":
        void format();
        break;
    }
  }
  function treeRows() {
    if (!project) return [];
    const paths = new Set(Object.keys(project.files));
    for (const path of [...paths]) {
      const parts = path.split("/");
      while (parts.pop() && parts.length) paths.add(parts.join("/"));
    }
    return [...paths]
      .sort((a, b) => a.localeCompare(b))
      .filter((path) =>
        path
          .split("/")
          .slice(0, -1)
          .every((_, i) =>
            expanded.has(
              path
                .split("/")
                .slice(0, i + 1)
                .join("/"),
            ),
          ),
      );
  }
  const rows = treeRows(),
    stats = project ? validateFiles(project.files) : { count: 0, total: 0 };
  if (!ready)
    return (
      <main className="loading-screen">
        <Code2 size={32} />
        <p>작업 공간을 준비하고 있어요…</p>
      </main>
    );
  if (!user)
    return (
      <main className="login-screen">
        <div className="login-card">
          <div className="brand">
            <Code2 size={23} />
            <strong>
              렛츠코딩 <span>EDITOR</span>
            </strong>
          </div>
          <p className="eyebrow">IDEAS BECOME REAL</p>
          <h1>
            나의 아이디어를
            <br />
            작품으로 만드는 공간.
          </h1>
          <p>
            라운지 계정으로 로그인하고
            <br />
            어디서든 이어서 만들어보세요.
          </p>
          {config.cloud ? (
            <>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (loginPending) return;
                  setLoginPending(true);
                  setError("");
                  setNotice("");
                  try {
                    if (loginMode === "password") {
                      const { error } =
                        await browserSupabase().auth.signInWithPassword({
                          email: email.trim(),
                          password,
                        });
                      if (error) {
                        setError(
                          error.code === "email_not_confirmed"
                            ? "이메일 인증을 완료한 뒤 다시 로그인해주세요."
                            : error.status === 429
                              ? "로그인 시도가 많습니다. 잠시 후 다시 시도해주세요."
                              : "로그인하지 못했습니다. 이메일과 비밀번호를 확인해주세요.",
                        );
                        return;
                      }
                      // Reload through the existing server-authorized session flow.
                      window.location.reload();
                    } else {
                      const { error } =
                        await browserSupabase().auth.signInWithOtp({
                          email: email.trim(),
                          options: {
                            emailRedirectTo: `${location.origin}/auth/callback`,
                            shouldCreateUser: false,
                          },
                        });
                      if (error) {
                        setError(
                          "로그인 링크를 보내지 못했습니다. 이메일을 확인하고 잠시 후 다시 시도해주세요.",
                        );
                        return;
                      }
                      setNotice("이메일로 로그인 링크를 보냈습니다.");
                    }
                  } catch {
                    setError(
                      "로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.",
                    );
                  } finally {
                    setPassword("");
                    setLoginPending(false);
                  }
                }}
              >
                <label htmlFor="email">이메일</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="username"
                  disabled={loginPending}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="라운지 가입 이메일"
                />
                {loginMode === "password" && (
                  <>
                    <label htmlFor="password">비밀번호</label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loginPending}
                      required
                    />
                  </>
                )}
                <button
                  type="submit"
                  className="primary"
                  disabled={loginPending}
                >
                  {loginPending
                    ? loginMode === "password"
                      ? "로그인 중…"
                      : "로그인 링크 보내는 중…"
                    : loginMode === "password"
                      ? "이메일로 로그인"
                      : "로그인 링크 받기"}
                </button>
              </form>
              <p className="login-help">
                라운지에서 사용하던 이메일과 비밀번호로 로그인하세요. 비밀번호가
                없거나 기억나지 않으면 이메일 로그인 링크 또는 카카오 로그인을
                이용하세요.
              </p>
              <button
                type="button"
                className="wide"
                disabled={loginPending}
                onClick={() => {
                  setLoginMode(loginMode === "password" ? "link" : "password");
                  setPassword("");
                  setError("");
                  setNotice("");
                }}
              >
                {loginMode === "password"
                  ? "이메일 로그인 링크 이용하기"
                  : "비밀번호로 로그인하기"}
              </button>
              <button
                type="button"
                className="wide"
                disabled={loginPending}
                onClick={() =>
                  void browserSupabase()
                    .auth.signInWithOAuth({
                      provider: "kakao",
                      options: {
                        redirectTo: `${location.origin}/auth/callback`,
                      },
                    })
                    .then(({ error }) => {
                      if (error) fail(error);
                    })
                }
              >
                카카오로 로그인
              </button>
            </>
          ) : (
            <p className="callout">
              운영 연결 준비 중입니다. Supabase 설정을 입력하거나 개발 서버에서
              로컬 데모를 실행해주세요.
            </p>
          )}
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
        </div>
      </main>
    );
  const activeFile = project?.files[active],
    isMarkdown = active.endsWith(".md");
  return (
    <div className="editor-app">
      <a className="skip-link" href="#workspace">
        편집기로 건너뛰기
      </a>
      <header className="topbar">
        <div className="brand">
          <Code2 size={21} />
          <strong>
            렛츠코딩 <span>EDITOR</span>
          </strong>
        </div>
        <span className="topbar-divider" />
        <button
          className="project-picker"
          onClick={() => {
            setName("");
            void listProjects(config.demo).then(setProjects).catch(fail);
            setModal("projects");
          }}
          disabled={busy}
        >
          <span>{project?.title ?? "프로젝트 선택"}</span>
          <ChevronDown size={14} />
        </button>
        <span className={`save-state ${status}`} role="status">
          {status === "saving" ? (
            <LoaderCircle size={13} className="spin" />
          ) : status === "saved" ? (
            <CheckCheck size={14} />
          ) : (
            <span className="dot" />
          )}
          {
            {
              saved: config.demo ? "이 기기에 저장됨" : "서버에 저장됨",
              saving: "저장 중…",
              dirty: "저장 대기",
              error: "저장 실패 · 다시 시도",
            }[status]
          }
        </span>
        <div className="topbar-spacer" />
        <span className="mode-badge">
          {config.demo ? "로컬 데모" : "라운지 연결"}
        </span>
        <button
          className="icon-button"
          aria-label="테마 전환"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button
          className="deploy-button"
          onClick={openDeploy}
          disabled={!project || busy}
        >
          <Rocket size={15} />
          {project?.loungeId ? "재배포" : "배포하기"}
        </button>
        <button
          className="avatar"
          aria-label={config.demo ? "데모 사용자" : "로그아웃"}
          title={user.email ?? "데모 사용자"}
          onClick={() => {
            if (config.demo)
              setNotice("외부 계정 없이 사용하는 개발 데모입니다.");
            else
              void browserSupabase()
                .auth.signOut()
                .then(() => location.reload());
          }}
        >
          LC
        </button>
      </header>
      {config.demo && (
        <div className="demo-banner">
          <span>
            <span className="dot" /> 외부 계정 없이 개발 흐름을 체험하는 로컬
            데모입니다. AI는 예시 응답이며 실제 배포는 하지 않습니다.
          </span>
          <button onClick={() => void download()}>
            <Download size={13} /> 작업 ZIP 보관
          </button>
        </div>
      )}
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button
            onClick={() => {
              setError("");
              if (status === "error") void flush().catch(() => {});
            }}
            aria-label="오류 닫기 또는 저장 재시도"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="workbench">
        <aside className="activity-bar" aria-label="작업 공간 도구">
          <button
            aria-label="탐색기 접기/펼치기"
            className={explorer ? "active" : ""}
            onClick={() => setExplorer((v) => !v)}
          >
            <FolderOpen size={22} />
          </button>
          <button
            aria-label="파일 검색"
            onClick={() => showModal("quick-open")}
          >
            <Search size={22} />
          </button>
          <button
            aria-label="AI 채팅 접기/펼치기"
            className={chatVisible ? "active" : ""}
            onClick={() => setChatVisible((v) => !v)}
          >
            <MessageSquare size={22} />
          </button>
          <div className="grow" />
          <button
            aria-label="사용량 보기"
            onClick={() => {
              void refreshUsage();
              setModal("usage");
            }}
          >
            <Settings2 size={21} />
          </button>
        </aside>
        <Group orientation="horizontal" className="panels" id="workbench">
          {explorer && (
            <>
              <Panel
                id="explorer"
                defaultSize="18%"
                minSize="160px"
                maxSize="40%"
              >
                <section className="explorer-pane" aria-label="파일 탐색기">
                  <div className="pane-heading">
                    <span>탐색기</span>
                    <button
                      aria-label="탐색기 접기"
                      onClick={() => setExplorer(false)}
                    >
                      <PanelLeftClose size={15} />
                    </button>
                  </div>
                  <div className="tree-heading">
                    <button
                      className="tree-root"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        move(dragPath.current, "");
                      }}
                    >
                      <ChevronDown size={14} />
                      <span>{project?.title ?? "프로젝트"}</span>
                    </button>
                    <div className="tree-actions">
                      <button
                        aria-label="새 파일"
                        onClick={() => showModal("new-file")}
                      >
                        <FilePlus2 size={15} />
                      </button>
                      <button
                        aria-label="새 폴더"
                        onClick={() => showModal("new-folder")}
                      >
                        <FolderPlus size={15} />
                      </button>
                      <button
                        aria-label="파일 업로드"
                        onClick={() => fileInput.current?.click()}
                      >
                        <Upload size={15} />
                      </button>
                    </div>
                  </div>
                  <div
                    className="file-tree"
                    role="tree"
                    aria-label="프로젝트 파일"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      if (e.dataTransfer.files.length) {
                        e.preventDefault();
                        void upload(e.dataTransfer.files);
                      }
                    }}
                  >
                    {rows.map((path) => {
                      const folder =
                        project?.files[path]?.kind === "directory" ||
                        !project?.files[path];
                      return (
                        <div
                          className="tree-entry"
                          role="treeitem"
                          aria-label={path}
                          aria-level={path.split("/").length}
                          aria-selected={selected === path}
                          aria-expanded={
                            folder ? expanded.has(path) : undefined
                          }
                          key={path}
                          style={{
                            paddingLeft: 8 + (path.split("/").length - 1) * 16,
                          }}
                        >
                          <button
                            className={`tree-file ${active === path ? "selected" : ""}`}
                            onClick={() => {
                              setSelected(path);
                              if (folder)
                                setExpanded((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(path)) next.delete(path);
                                  else next.add(path);
                                  return next;
                                });
                              else openFile(path);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "F2") {
                                e.preventDefault();
                                showModal("rename", path);
                              }
                              if (e.key === "Delete") {
                                e.preventDefault();
                                showModal("delete", path);
                              }
                            }}
                            draggable
                            onDragStart={() => {
                              dragPath.current = path;
                            }}
                            onDragOver={(e) => {
                              if (folder) e.preventDefault();
                            }}
                            onDrop={(e) => {
                              if (folder && !e.dataTransfer.files.length) {
                                e.preventDefault();
                                e.stopPropagation();
                                move(dragPath.current, path);
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setSelected(path);
                              setTarget(path);
                              setName(path);
                              setModal("rename");
                            }}
                          >
                            {folder ? (
                              expanded.has(path) ? (
                                <ChevronDown size={12} />
                              ) : (
                                <ChevronRight size={12} />
                              )
                            ) : (
                              <span className="tree-indent" />
                            )}
                            {folder ? (
                              <Folder size={15} className="folder-icon" />
                            ) : (
                              <FileCode2
                                size={15}
                                className={`file-icon ${language(path)}`}
                              />
                            )}
                            <span>{path.split("/").at(-1)}</span>
                            {changed.has(path) && (
                              <span className="ai-dot" title="AI 변경" />
                            )}
                          </button>
                          <button
                            className="tree-menu"
                            aria-label={`${path} 삭제`}
                            onClick={() => showModal("delete", path)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="explorer-footer">
                    <button onClick={() => fileInput.current?.click()}>
                      <Upload size={14} />
                      {uploadProgress || "파일 또는 ZIP 가져오기"}
                    </button>
                    <div
                      className={`capacity ${stats.total > LIMITS.total * 0.9 ? "warning" : ""}`}
                    >
                      <span>{stats.count}/500 파일</span>
                      <span>{(stats.total / 1024).toFixed(1)} KB / 100 MB</span>
                    </div>
                    <div className="capacity-track">
                      <span
                        style={{
                          width: `${Math.min(100, (stats.total / LIMITS.total) * 100)}%`,
                        }}
                      />
                    </div>
                    <a
                      href="https://github.com/yudanah/letscoding_lounge/blob/main/docs/14-vercel-operations-and-student-framework-guide.md"
                      target="_blank"
                      rel="noreferrer"
                    >
                      라운지 파일 규칙
                    </a>
                  </div>
                </section>
              </Panel>
              <Separator
                className="resize-handle"
                aria-label="탐색기 폭 조절"
              />
            </>
          )}
          <Panel id="editor" defaultSize="55%" minSize="25%">
            <main className="main-pane" id="workspace" tabIndex={-1}>
              <div
                className="editor-tabs"
                role="tablist"
                aria-label="열린 파일"
              >
                {tabs
                  .filter((path) => project?.files[path])
                  .map((path) => (
                    <div
                      key={path}
                      role="presentation"
                      className={`tab ${active === path && pane === "code" ? "active" : ""}`}
                      draggable
                      onDragStart={() => {
                        tabDrag.current = path;
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        setTabs((prev) => {
                          const next = prev.filter(
                            (p) => p !== tabDrag.current,
                          );
                          next.splice(next.indexOf(path), 0, tabDrag.current);
                          return next;
                        });
                      }}
                    >
                      <button
                        role="tab"
                        aria-selected={active === path && pane === "code"}
                        onKeyDown={(e) => {
                          if (e.key === "Delete") {
                            setTabs((prev) => prev.filter((p) => p !== path));
                            if (active === path)
                              setActive(tabs.find((p) => p !== path) ?? "");
                          }
                        }}
                        onClick={() => openFile(path)}
                      >
                        <FileCode2 size={13} />
                        {path.split("/").at(-1)}
                        {unsaved.has(path) && <span className="dot" />}
                      </button>
                      <button
                        aria-hidden="true"
                        tabIndex={-1}
                        title={`${path} 탭 닫기`}
                        onClick={() => {
                          setTabs((prev) => prev.filter((p) => p !== path));
                          if (active === path)
                            setActive(tabs.find((p) => p !== path) ?? "");
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                <button
                  role="tab"
                  aria-selected={pane === "preview"}
                  className={`preview-tab ${pane === "preview" ? "active" : ""}`}
                  onClick={() => {
                    setPane("preview");
                    setDiff(null);
                  }}
                >
                  <Play size={13} /> 미리보기
                </button>
                <div className="grow" />
                <button
                  className="icon-button"
                  aria-hidden="true"
                  tabIndex={-1}
                  title="코드와 미리보기 분할"
                  onClick={() => setSplit((v) => !v)}
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
              <div className="breadcrumb">
                <span>{project?.title}</span>
                <ChevronRight size={12} />
                <span>
                  {pane === "preview" ? "미리보기" : active || "파일 선택"}
                </span>
                <div className="grow" />
                {pane === "code" && activeFile?.kind === "text" && (
                  <button onClick={() => void format()}>
                    <Palette size={13} /> 코드 정리
                  </button>
                )}
              </div>
              <div className={`editor-content ${split ? "split" : ""}`}>
                {(pane === "preview" || split) && project && (
                  <Preview
                    files={project.files}
                    onConsole={setLogs}
                    onNavigate={(path, line) => {
                      openFile(path);
                      setJump(line);
                    }}
                  />
                )}
                {(pane === "code" || split) && (
                  <div className="code-pane">
                    {diff ? (
                      <>
                        <div className="diff-heading">
                          {diff.path} 변경 비교
                          <button
                            onClick={() => setDiff(null)}
                            aria-label="변경 비교 닫기"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <CodeDiff
                          before={project?.files[diff.path]?.content ?? ""}
                          after={diff.content ?? ""}
                          theme={theme}
                        />
                        <div className="diff-actions">
                          <button
                            className="primary"
                            onClick={() => void review(diff, true)}
                          >
                            변경 적용
                          </button>
                          <button onClick={() => void review(diff, false)}>
                            무시
                          </button>
                        </div>
                      </>
                    ) : activeFile?.kind === "text" ? (
                      <>
                        {activeFile.size > LIMITS.text && (
                          <div className="callout">
                            256KB 초과 파일은 읽기 전용입니다.
                          </div>
                        )}
                        <CodeEditor
                          path={`${project?.id}/${active}`}
                          content={activeFile.content}
                          theme={theme}
                          readOnly={activeFile.size > LIMITS.text}
                          line={jump}
                          onChange={(value) => {
                            if (
                              value !== current.current?.files[active]?.content
                            )
                              mutateFiles({
                                ...current.current!.files,
                                [active]: textFile(value, activeFile.mime),
                              });
                          }}
                          onSelection={setSelection}
                          onCursor={(line, column) =>
                            setCursor({ line, column })
                          }
                        />
                        {active.endsWith(".svg") && (
                          <div className="svg-preview">
                            <img
                              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(activeFile.content)}`}
                              alt={active}
                              onLoad={(e) =>
                                setNotice(
                                  `${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight} · ${(activeFile.size / 1024).toFixed(1)} KB`,
                                )
                              }
                            />
                          </div>
                        )}
                        {isMarkdown && (
                          <Markdown content={activeFile.content} />
                        )}
                      </>
                    ) : activeFile?.kind === "binary" ? (
                      <div className="image-viewer">
                        <img
                          src={activeFile.content}
                          alt={active}
                          onLoad={(e) =>
                            setNotice(
                              `${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight} · ${(activeFile.size / 1024).toFixed(1)} KB`,
                            )
                          }
                        />
                        <p>
                          {active} · {(activeFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <Code2 size={38} />
                        <h2>무엇을 만들어볼까요?</h2>
                        <p>파일을 열거나 새 프로젝트를 시작하세요.</p>
                        <button
                          className="primary"
                          onClick={() => showModal("new-file")}
                        >
                          새 파일 만들기
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </main>
          </Panel>
          {chatVisible && (
            <>
              <Separator
                className="resize-handle"
                aria-label="AI 채팅 폭 조절"
              />
              <Panel id="chat" defaultSize="27%" minSize="260px" maxSize="55%">
                <section className="chat-pane" aria-label="AI 채팅">
                  <div className="pane-heading">
                    <span>
                      <Sparkles size={15} /> 코딩 도우미
                    </span>
                    <div>
                      <button
                        aria-label="새 대화"
                        onClick={() => void newThread()}
                        disabled={busy}
                      >
                        <Plus size={16} />
                      </button>
                      <button
                        aria-label="AI 패널 접기"
                        onClick={() => setChatVisible(false)}
                      >
                        <PanelRightClose size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="thread-bar">
                    <select
                      aria-label="대화 선택"
                      value={thread?.id ?? ""}
                      disabled={busy}
                      onChange={(e) => setThreadId(e.target.value)}
                    >
                      {project?.threads.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                    <label className="auto-apply">
                      <input
                        type="checkbox"
                        checked={thread?.autoApply ?? false}
                        disabled={busy}
                        onChange={() => void toggleAuto()}
                      />
                      자동 적용
                    </label>
                  </div>
                  <div className="chat-messages" aria-live="polite">
                    {!thread?.messages.length && (
                      <div className="chat-welcome">
                        <div className="assistant-symbol">
                          <Sparkles size={24} />
                        </div>
                        <p className="eyebrow">YOUR CODING COMPANION</p>
                        <h1>함께 만들어볼까요?</h1>
                        <p>
                          아이디어를 이야기해주세요.
                          <br />
                          코드를 읽고, 만들고, 고치는 걸 도와드려요.
                        </p>
                        <button
                          className="suggestion"
                          onClick={() =>
                            void send(undefined, "버튼 색을 파랗게 바꿔줘")
                          }
                        >
                          <span>버튼 색을 파랗게 바꿔줘</span>
                          <ArrowUp size={14} />
                        </button>
                        <div className="chat-tip">
                          <Check size={13} /> 변경은 확인하고 적용할 수 있어요.
                        </div>
                      </div>
                    )}
                    {thread?.messages.map((message) => (
                      <article
                        key={message.id}
                        className={`message ${message.role}`}
                      >
                        <div className="message-heading">
                          {message.role === "assistant" ? (
                            <>
                              <Bot size={15} /> 코딩 도우미
                            </>
                          ) : (
                            <>
                              나{" "}
                              <span>
                                {message.selection ? "선택 코드 첨부" : ""}
                              </span>
                            </>
                          )}
                        </div>
                        <MessageBody
                          text={message.text}
                          onSave={(code) => {
                            setName("");
                            setModal("new-file");
                            pendingCode.current = code;
                            setNotice(
                              "파일 경로를 입력하면 코드가 저장됩니다.",
                            );
                            navigator.clipboard
                              ?.writeText(code)
                              .catch(() => {});
                          }}
                        />
                        {message.status === "interrupted" && (
                          <small>중단된 응답</small>
                        )}
                        {message.selection && (
                          <details>
                            <summary>첨부한 선택 코드</summary>
                            <pre>{message.selection}</pre>
                          </details>
                        )}
                        {message.tools?.map((tool, i) => (
                          <details className="tool-call" key={i}>
                            <summary>
                              <Code2 size={12} />
                              {tool.name}
                            </summary>
                            <pre>
                              {JSON.stringify(
                                { input: tool.input, output: tool.output },
                                null,
                                2,
                              )}
                            </pre>
                          </details>
                        ))}
                        {message.proposals.map((proposal) => (
                          <div className="proposal" key={proposal.id}>
                            <div>
                              <FileCode2 size={14} />
                              <strong>{proposal.path}</strong>
                              <span>
                                {
                                  {
                                    write: "수정",
                                    create: "생성",
                                    rename: "이름 변경",
                                    delete: "삭제",
                                  }[proposal.operation]
                                }
                              </span>
                            </div>
                            {proposal.target && <p>→ {proposal.target}</p>}
                            {proposal.status === "pending" ? (
                              <>
                                <p>승인하기 전에는 파일이 바뀌지 않습니다.</p>
                                <div className="proposal-actions">
                                  {["create", "write"].includes(
                                    proposal.operation,
                                  ) &&
                                    !proposal.file && (
                                      <button
                                        onClick={() => {
                                          setDiff(proposal);
                                          setPane("code");
                                        }}
                                      >
                                        비교
                                      </button>
                                    )}
                                  <button
                                    className="primary"
                                    onClick={() => void review(proposal, true)}
                                  >
                                    적용
                                  </button>
                                  <button
                                    onClick={() => void review(proposal, false)}
                                  >
                                    무시
                                  </button>
                                </div>
                              </>
                            ) : (
                              <p className="proposal-status">
                                <Check size={12} />
                                {proposal.status === "applied"
                                  ? "적용됨"
                                  : "무시됨"}
                              </p>
                            )}
                          </div>
                        ))}
                      </article>
                    ))}
                    {busy && (
                      <article className="message assistant">
                        <div className="message-heading">
                          <LoaderCircle size={14} className="spin" /> 응답 중…
                        </div>
                        <p className="message-text">
                          {streamText || "파일과 요청을 확인하고 있어요."}
                        </p>
                      </article>
                    )}
                    <div ref={chatBottom} />
                  </div>
                  <form className="chat-composer" onSubmit={send}>
                    {attachments.length > 0 && (
                      <div className="attachments">
                        {attachments.map((src, i) => (
                          <div key={i}>
                            <img src={src} alt={`첨부 이미지 ${i + 1}`} />
                            <button
                              aria-label={`첨부 이미지 ${i + 1} 제거`}
                              type="button"
                              onClick={() =>
                                setAttachments((a) =>
                                  a.filter((_, n) => n !== i),
                                )
                              }
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {attachSelection && (
                      <div className="selection-chip">
                        선택 코드 첨부됨
                        <button
                          type="button"
                          onClick={() => setAttachSelection(false)}
                          aria-label="선택 코드 제거"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <label className="sr-only" htmlFor="chat-input">
                      AI에게 보낼 메시지
                    </label>
                    <textarea
                      id="chat-input"
                      placeholder="무엇을 만들고 싶나요?"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                      disabled={busy}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          !e.nativeEvent.isComposing
                        ) {
                          e.preventDefault();
                          void send();
                        }
                      }}
                    />
                    <div className="composer-toolbar">
                      <button
                        type="button"
                        aria-label="이미지 첨부"
                        onClick={() => imageInput.current?.click()}
                        disabled={busy}
                      >
                        <Paperclip size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label="선택 코드 첨부"
                        onClick={() => setAttachSelection(true)}
                        disabled={!selection || busy}
                      >
                        <Code2 size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label="이미지 생성"
                        onClick={() => void generateImage()}
                        disabled={busy}
                      >
                        <ImagePlus size={16} />
                      </button>
                      <div className="grow" />
                      <select
                        aria-label="AI 모델 선택"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        disabled={config.demo || busy}
                      >
                        {config.demo ? (
                          <option value="">데모 AI</option>
                        ) : (
                          config.models
                            .filter((m) => !m.image)
                            .map((m) => (
                              <option value={m.id} key={m.label}>
                                {m.label}{" "}
                                {prices.find((p) => p.id === m.id)
                                  ?.inputPrice != null
                                  ? `· 입력 $${prices.find((p) => p.id === m.id)!.inputPrice}/M`
                                  : ""}
                              </option>
                            ))
                        )}
                      </select>
                      {busy ? (
                        <button
                          type="button"
                          aria-label="AI 응답 중단"
                          className="send-button"
                          onClick={() => abort.current?.abort()}
                        >
                          <Square size={13} />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          aria-label="메시지 보내기"
                          className="send-button"
                          disabled={!prompt.trim() || !project}
                        >
                          <ArrowUp size={17} />
                        </button>
                      )}
                    </div>
                    <p className="composer-note">
                      {config.demo
                        ? "예시 응답 · 외부 API 호출 없음"
                        : "AI 변경안을 적용하기 전에 확인하세요."}
                    </p>
                  </form>
                </section>
              </Panel>
            </>
          )}
        </Group>
      </div>
      <footer className="statusbar">
        <span>
          <span className="dot" />{" "}
          {config.demo ? "로컬 작업 공간" : "서버 연결"}
        </span>
        <button onClick={() => void flush().catch(() => {})}>
          {status === "error" ? "저장 다시 시도" : "모든 변경 저장"}
        </button>
        <div className="grow" />
        <button
          className={
            usage &&
            usage.dailyLimitUsd &&
            usage.costUsd / usage.dailyLimitUsd >= 0.8
              ? "usage-warning"
              : ""
          }
          onClick={() => {
            void refreshUsage();
            setModal("usage");
          }}
        >
          {config.demo
            ? "AI 데모"
            : usage
              ? `AI $${usage.costUsd.toFixed(3)} / $${usage.dailyLimitUsd.toFixed(2)}`
              : "AI 예산 미설정"}
        </button>
        <span>
          줄 {cursor.line}, 열 {cursor.column}
        </span>
        <span>UTF-8</span>
        <span>{language(active)}</span>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
      <input
        ref={fileInput}
        className="sr-only"
        tabIndex={-1}
        type="file"
        multiple
        aria-label="업로드할 파일"
        onChange={(e) => void upload(e.target.files)}
      />
      <input
        ref={imageInput}
        className="sr-only"
        tabIndex={-1}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        aria-label="첨부할 이미지"
        onChange={(e) => void imageAttach(e.target.files)}
      />
      {modal && (
        <Dialog
          title={
            {
              projects: "나의 프로젝트",
              "new-file": "새 파일",
              "new-folder": "새 폴더",
              rename: "이름 변경",
              delete: "삭제 확인",
              "quick-open": "파일 빠르게 열기",
              commands: "명령 팔레트",
              deploy: "작품 배포",
              usage: "AI 사용량",
            }[modal]
          }
          onClose={() => setModal(null)}
        >
          {["new-file", "new-folder", "rename", "delete"].includes(modal) && (
            <form onSubmit={fileAction}>
              {modal === "delete" ? (
                <p>
                  <strong>{target}</strong>을 삭제할까요? 하위 파일{" "}
                  {
                    Object.keys(project?.files ?? {}).filter((p) =>
                      p.startsWith(target + "/"),
                    ).length
                  }
                  개도 삭제됩니다.
                </p>
              ) : (
                <>
                  <label htmlFor="file-name">
                    {modal === "new-folder" ? "폴더 경로" : "파일 경로"}
                  </label>
                  <input
                    id="file-name"
                    autoFocus
                    value={name}
                    placeholder={
                      modal === "new-folder" ? "images" : "images/logo.svg"
                    }
                    onChange={(e) => {
                      setName(e.target.value);
                      try {
                        assertPath(e.target.value);
                        if (
                          modal !== "rename" &&
                          project?.files[e.target.value]
                        )
                          throw new Error("같은 이름이 이미 있습니다.");
                        setFormError("");
                      } catch (error) {
                        setFormError(
                          error instanceof Error
                            ? error.message
                            : String(error),
                        );
                      }
                    }}
                  />
                  <p className="helper">
                    프로젝트 루트부터의 상대 경로를 입력해주세요.
                  </p>
                </>
              )}
              {formError && (
                <p className="error-text" role="alert">
                  {formError}
                </p>
              )}
              <div className="dialog-actions">
                <button type="button" onClick={() => setModal(null)}>
                  취소
                </button>
                <button
                  className={modal === "delete" ? "danger" : "primary"}
                  type="submit"
                  disabled={modal !== "delete" && (!name || !!formError)}
                >
                  {modal === "delete" ? "삭제" : "확인"}
                </button>
              </div>
            </form>
          )}
          {modal === "projects" && (
            <>
              <div className="project-list">
                {projects.map((item) => (
                  <div key={item.id}>
                    <button onClick={() => void openProject(item).catch(fail)}>
                      <FolderOpen size={19} />
                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {new Date(item.updatedAt).toLocaleString("ko-KR")}
                        </small>
                      </span>
                    </button>
                    <button
                      aria-label={`${item.title} 이름 변경`}
                      onClick={() => void projectAction("rename", item)}
                    >
                      <Menu size={15} />
                    </button>
                    <button
                      aria-label={`${item.title} 복제`}
                      onClick={() => void projectAction("duplicate", item)}
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      aria-label={`${item.title} 프로젝트 삭제`}
                      onClick={() => void projectAction("delete", item)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={create}>
                <h3>새 프로젝트</h3>
                <label htmlFor="project-title">프로젝트 이름</label>
                <input
                  id="project-title"
                  placeholder="나의 새로운 아이디어"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
                <div className="template-grid">
                  {TEMPLATES.map((t) => (
                    <button
                      type="button"
                      className={template === t.id ? "selected" : ""}
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                    >
                      <Code2 size={20} />
                      <strong>{t.title}</strong>
                      <small>{t.description}</small>
                    </button>
                  ))}
                </div>
                {formError && (
                  <p role="alert" className="error-text">
                    {formError}
                  </p>
                )}
                <button className="primary wide">프로젝트 만들기</button>
              </form>
            </>
          )}
          {(modal === "quick-open" || modal === "commands") && (
            <>
              <label className="sr-only" htmlFor="quick-search">
                {modal === "commands" ? "명령 검색" : "파일 이름 검색"}
              </label>
              <input
                id="quick-search"
                autoFocus
                placeholder={
                  modal === "commands" ? "> 명령 검색" : "파일 이름으로 검색"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="quick-results">
                {modal === "quick-open"
                  ? Object.keys(project?.files ?? {})
                      .filter(
                        (p) =>
                          project?.files[p].kind !== "directory" &&
                          p.toLowerCase().includes(search.toLowerCase()),
                      )
                      .slice(0, 10)
                      .map((path) => (
                        <button
                          key={path}
                          onClick={() => {
                            openFile(path);
                            setModal(null);
                          }}
                        >
                          <FileCode2 size={15} />
                          {path}
                        </button>
                      ))
                  : commands
                      .filter((title) => title.includes(search))
                      .map((title) => (
                        <button
                          key={title}
                          onClick={() => {
                            setModal(null);
                            // eslint-disable-next-line react-hooks/refs -- Invoked only by this click handler; no ref is read during render.
                            runCommand(title);
                          }}
                        >
                          {title}
                        </button>
                      ))}
              </div>
            </>
          )}
          {modal === "deploy" && (
            <form onSubmit={deploySubmit}>
              {config.demo && (
                <p className="callout">
                  데모에서는 ZIP 정책만 검증합니다. 실제 라운지 작품과 링크는
                  생성하지 않습니다.
                </p>
              )}
              {!config.demo && !config.deploy && (
                <p className="callout">
                  라운지 내부 API 연결 후 실제 배포가 활성화됩니다.
                </p>
              )}
              <div className="deploy-form-grid">
                {(["title", "description", "category", "slug"] as const).map(
                  (key) => (
                    <label key={key}>
                      {
                        {
                          title: "제목",
                          description: "설명",
                          category: "카테고리",
                          slug: "주소 이름",
                        }[key]
                      }
                      {key === "description" ? (
                        <textarea
                          value={deployFields[key]}
                          onChange={(e) =>
                            setDeployFields((f) => ({
                              ...f,
                              [key]: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        <input
                          required
                          value={deployFields[key]}
                          onChange={(e) =>
                            setDeployFields((f) => ({
                              ...f,
                              [key]: e.target.value,
                            }))
                          }
                        />
                      )}
                    </label>
                  ),
                )}
              </div>
              <label>
                썸네일 이미지
                <select
                  value={deployFields.thumbnailPath}
                  onChange={(e) =>
                    setDeployFields((f) => ({
                      ...f,
                      thumbnailPath: e.target.value,
                    }))
                  }
                >
                  <option value="">선택 안 함</option>
                  {Object.keys(project?.files ?? {})
                    .filter((p) => /\.(png|jpe?g|webp)$/i.test(p))
                    .map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                </select>
              </label>
              <div className="check-row">
                <label>
                  <input
                    type="checkbox"
                    checked={deployFields.isPublished}
                    onChange={(e) =>
                      setDeployFields((f) => ({
                        ...f,
                        isPublished: e.target.checked,
                      }))
                    }
                  />{" "}
                  공개
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={deployFields.isListed}
                    onChange={(e) =>
                      setDeployFields((f) => ({
                        ...f,
                        isListed: e.target.checked,
                      }))
                    }
                  />{" "}
                  목록에 표시
                </label>
              </div>
              {formError && (
                <p className="error-text" role="alert">
                  {formError}
                </p>
              )}
              <div className="dialog-actions">
                <button type="button" onClick={() => void download()}>
                  <Download size={14} /> ZIP 다운로드
                </button>
                <button
                  className="primary"
                  disabled={busy || (!config.demo && !config.deploy)}
                >
                  {busy
                    ? "처리 중…"
                    : config.demo
                      ? "배포 ZIP 검증"
                      : "라운지에 배포"}
                </button>
              </div>
              {project?.loungeId && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "연결을 해제하고 다음 배포에서 새 작품을 만들까요?",
                      )
                    )
                      void api("unlink", { projectId: project.id })
                        .then((r) => r.json())
                        .then(assign)
                        .catch(fail);
                  }}
                >
                  삭제된 작품 연결 해제
                </button>
              )}
              <div className="deployment-history">
                <h3>배포 이력</h3>
                {project?.deployments
                  .slice()
                  .reverse()
                  .map((d) => (
                    <div key={d.id}>
                      <strong>
                        {d.status === "validated"
                          ? "ZIP 검증 완료"
                          : d.status === "success"
                            ? "배포 성공"
                            : "배포 실패"}
                      </strong>
                      <small>
                        {new Date(d.createdAt).toLocaleString("ko-KR")} ·{" "}
                        {d.policyVersion}
                      </small>
                      <code>{d.sha256.slice(0, 20)}</code>
                      {d.url && (
                        <button
                          type="button"
                          onClick={async () => {
                            const popup = window.open("about:blank", "_blank");
                            if (!popup) {
                              fail(
                                new Error("작품을 열려면 팝업을 허용해주세요."),
                              );
                              return;
                            }
                            popup.opener = null;
                            popup.document.title = "작품 여는 중";
                            popup.document.body.textContent =
                              "작품을 여는 중입니다…";
                            try {
                              const result = await (
                                await api("launch", { projectId: project!.id })
                              ).json();
                              popup.location.replace(result.url);
                            } catch (error) {
                              popup.close();
                              fail(error);
                            }
                          }}
                        >
                          작품 열기 ↗
                        </button>
                      )}
                      {d.error && <p>{d.error}</p>}
                    </div>
                  ))}
              </div>
            </form>
          )}
          {modal === "usage" && (
            <div className="usage-panel">
              <p>
                {config.demo
                  ? "데모는 외부 모델을 호출하지 않으며 비용이 발생하지 않습니다."
                  : usage
                    ? `오늘 사용 $${usage.costUsd.toFixed(4)} · 이번 달 $${(usage.monthCostUsd ?? 0).toFixed(4)} · 예약 $${usage.reservedUsd.toFixed(4)} · 일일 한도 $${usage.dailyLimitUsd}`
                    : "예산은 개발 이후 결정합니다. 설정 전 실제 AI 호출은 비활성입니다."}
              </p>
              {usage && (
                <p>
                  입력 {usage.promptTokens} · 출력 {usage.completionTokens} 토큰
                </p>
              )}
              <p>
                최근 7일 $
                {usageDays
                  .filter(
                    (d) => Date.parse(d.date) >= usageClock - 7 * 86400000,
                  )
                  .reduce((sum, d) => sum + Number(d.cost_usd), 0)
                  .toFixed(4)}{" "}
                · 최근 31일 $
                {usageDays
                  .reduce((sum, d) => sum + Number(d.cost_usd), 0)
                  .toFixed(4)}
              </p>
              {prices.map((p) => (
                <p key={p.id}>
                  {p.id}: 입력{" "}
                  {p.inputPrice === null
                    ? "확인 불가"
                    : `$${p.inputPrice.toFixed(3)}`}{" "}
                  / 출력{" "}
                  {p.outputPrice === null
                    ? "확인 불가"
                    : `$${p.outputPrice.toFixed(3)}`}{" "}
                  (100만 토큰 기준)
                </p>
              ))}
              <h3>최근 31일</h3>
              {usageDays.map((day) => (
                <div key={day.date} className="usage-day">
                  <span>{day.date}</span>
                  <meter
                    min="0"
                    max={Math.max(
                      1,
                      ...usageDays.map((d) => Number(d.cost_usd)),
                    )}
                    value={Number(day.cost_usd)}
                  />
                  <span>${Number(day.cost_usd).toFixed(4)}</span>
                </div>
              ))}
              <p className="helper">
                실제 청구 대사는 운영 계정과 모델 검증 이후 진행합니다.
              </p>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
function Markdown({ content }: { content: string }) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    let live = true;
    void Promise.all([import("marked"), import("dompurify")]).then(
      async ([{ marked }, { default: purify }]) => {
        const rendered = await marked.parse(content);
        if (live)
          setHtml(
            purify.sanitize(rendered, {
              FORBID_TAGS: ["img", "iframe", "form", "style"],
              FORBID_ATTR: ["style"],
            }),
          );
      },
    );
    return () => {
      live = false;
    };
  }, [content]);
  return (
    <section
      className="markdown-preview"
      aria-label="마크다운 미리보기"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
function MessageBody({
  text,
  onSave,
}: {
  text: string;
  onSave: (code: string) => void;
}) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="message-text">
      {parts.map((part, i) =>
        part.startsWith("```") ? (
          <div className="code-block" key={i}>
            <pre>{part.replace(/^```[^\n]*\n?/, "").replace(/```$/, "")}</pre>
            <button
              onClick={() =>
                onSave(part.replace(/^```[^\n]*\n?/, "").replace(/```$/, ""))
              }
            >
              코드 복사 · 파일 만들기
            </button>
          </div>
        ) : (
          <p key={i}>{part}</p>
        ),
      )}
    </div>
  );
}
