"use client";
import { useEffect, useRef, useState } from "react";
import { buildPreview } from "@/lib/preview";
import type { Project } from "@/lib/types";
import {
  ExternalLink,
  RefreshCw,
  Smartphone,
  Tablet,
  Monitor,
  Terminal,
} from "lucide-react";
export type ConsoleEntry = {
  level: string;
  text: string;
  path: string;
  line: number;
};
export function Preview({
  files,
  onConsole,
  onNavigate,
}: {
  files: Project["files"];
  onConsole: (logs: ConsoleEntry[]) => void;
  onNavigate: (path: string, line: number) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null),
    channel = useRef(crypto.randomUUID()),
    document = useRef<ReturnType<typeof buildPreview> | null>(null);
  const [html, setHtml] = useState(""),
    [width, setWidth] = useState("100%"),
    [key, setKey] = useState(0),
    [logs, setLogs] = useState<ConsoleEntry[]>([]),
    [showConsole, setShowConsole] = useState(false);
  useEffect(() => {
    let preview;
    try {
      preview = buildPreview(files, channel.current);
    } catch (error) {
      preview = {
        html: `<!doctype html><html lang="ko"><body><p>${String(error).replace(/[<>&]/g, "")}</p></body></html>`,
        dispose: () => {},
      };
    }
    document.current = preview;
    setHtml(preview.html);
    setLogs([]);
    return () => preview.dispose();
  }, [files, key]);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.data?.channel !== channel.current ||
        !["log", "warn", "error"].includes(event.data.level) ||
        typeof event.data.text !== "string"
      )
        return;
      const entry = {
        level: event.data.level,
        text: event.data.text.slice(0, 3000),
        path:
          typeof event.data.path === "string" ? event.data.path : "index.html",
        line: Number.isSafeInteger(event.data.line)
          ? Math.max(0, event.data.line)
          : 0,
      };
      setLogs((prev) => [...prev.slice(-99), entry]);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);
  useEffect(() => onConsole(logs), [logs, onConsole]);
  function popout() {
    const wrapper = `<!doctype html><html lang="ko"><title>작품 미리보기</title><body style="margin:0"><iframe title="작품 미리보기" sandbox="allow-scripts" style="border:0;width:100%;height:100vh" srcdoc="${html.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"></iframe></body></html>`;
    const url = URL.createObjectURL(new Blob([wrapper], { type: "text/html" }));
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  return (
    <div className="preview-pane">
      <div className="preview-toolbar">
        <span className="preview-address">
          <span className="dot" /> index.html
        </span>
        <div className="toolbar-actions">
          <button aria-label="모바일 폭" onClick={() => setWidth("375px")}>
            <Smartphone size={15} />
          </button>
          <button aria-label="태블릿 폭" onClick={() => setWidth("768px")}>
            <Tablet size={15} />
          </button>
          <button aria-label="데스크톱 폭" onClick={() => setWidth("100%")}>
            <Monitor size={15} />
          </button>
          <span className="divider" />
          <button
            aria-label="미리보기 새로고침"
            onClick={() => setKey((k) => k + 1)}
          >
            <RefreshCw size={15} />
          </button>
          <button aria-label="미리보기 새 창" onClick={popout}>
            <ExternalLink size={15} />
          </button>
        </div>
      </div>
      <div className="preview-stage">
        <iframe
          ref={frame}
          key={key}
          title="작품 미리보기"
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          srcDoc={html}
          style={{ width, maxWidth: "100%" }}
        />
      </div>
      <button
        className="console-toggle"
        onClick={() => setShowConsole((s) => !s)}
        aria-expanded={showConsole}
      >
        <Terminal size={14} /> 콘솔{" "}
        <span>{logs.filter((l) => l.level === "error").length} 오류</span>
      </button>
      {showConsole && (
        <div className="console-output" aria-label="콘솔 출력">
          {logs.length ? (
            logs.map((l, i) => (
              <button
                key={i}
                className={l.level}
                onClick={() => onNavigate(l.path, l.line)}
              >
                {l.text}
                <span>
                  {l.path}:{l.line}
                </span>
              </button>
            ))
          ) : (
            <p>콘솔 오류가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
