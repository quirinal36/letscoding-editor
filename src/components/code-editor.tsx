"use client";
import Editor, { loader } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import type { editor } from "monaco-editor";
loader.config({ paths: { vs: "/monaco/vs" } });
export function CodeEditor({
  path,
  content,
  theme,
  onChange,
  onSelection,
  onCursor,
  readOnly,
  line,
}: {
  path: string;
  content: string;
  theme: string;
  onChange: (content: string) => void;
  onSelection: (code: string) => void;
  onCursor: (line: number, column: number) => void;
  readOnly?: boolean;
  line?: number;
}) {
  const ref = useRef<editor.IStandaloneCodeEditor | null>(null);
  useEffect(() => {
    if (line && ref.current) {
      ref.current.revealLineInCenter(line);
      ref.current.setPosition({ lineNumber: line, column: 1 });
      ref.current.focus();
    }
  }, [line]);
  return (
    <Editor
      path={path}
      value={content}
      theme={theme === "dark" ? "vs-dark" : "light"}
      onChange={(value) => onChange(value ?? "")}
      loading={<div className="empty-state">편집기를 준비하고 있어요…</div>}
      options={{
        fontSize: 14,
        fontFamily: '"SFMono-Regular", Consolas, monospace',
        minimap: { enabled: false },
        padding: { top: 20 },
        wordWrap: "on",
        readOnly,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        tabSize: 2,
        ariaLabel: `${path} 코드 편집기`,
      }}
      onMount={(instance) => {
        ref.current = instance;
        instance.onDidChangeCursorPosition((e) =>
          onCursor(e.position.lineNumber, e.position.column),
        );
        instance.onDidChangeCursorSelection(() => {
          const selection = instance.getSelection();
          onSelection(
            selection
              ? (instance.getModel()?.getValueInRange(selection) ?? "")
              : "",
          );
        });
      }}
    />
  );
}
export function CodeDiff({
  before,
  after,
  theme,
}: {
  before: string;
  after: string;
  theme: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false,
      instance: editor.IStandaloneDiffEditor | undefined,
      original: editor.ITextModel | undefined,
      modified: editor.ITextModel | undefined;
    void loader.init().then((monaco) => {
      if (disposed || !element.current) return;
      original = monaco.editor.createModel(before);
      modified = monaco.editor.createModel(after);
      instance = monaco.editor.createDiffEditor(element.current, {
        theme: theme === "dark" ? "vs-dark" : "vs",
        readOnly: true,
        automaticLayout: true,
        minimap: { enabled: false },
        ariaLabel: "AI 파일 변경 비교",
      });
      instance!.setModel({ original: original!, modified: modified! });
    });
    return () => {
      disposed = true;
      instance?.setModel(null);
      instance?.dispose();
      original?.dispose();
      modified?.dispose();
    };
  }, [before, after, theme]);
  return (
    <div ref={element} style={{ height: 280 }} aria-label="AI 파일 변경 비교" />
  );
}
