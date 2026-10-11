"use client";
import { useEffect, useState } from "react";
import type { AppConfig } from "@/lib/types";
export type ModelSelection = { userId: string; id: string; vision: boolean };
export function ModelSelect({
  userId,
  demo,
  busy,
  onSelect,
}: {
  userId: string;
  demo: boolean;
  busy: boolean;
  onSelect: (value: ModelSelection) => void;
}) {
  const [models, setModels] = useState<AppConfig["models"]>([]);
  const [selected, setSelected] = useState("");
  const [notice, setNotice] = useState("모델 확인 중…");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const key = `editor-model:${userId}`;
    onSelect({ userId, id: "", vision: false });
    async function load() {
      try {
        const response = demo
          ? null
          : await fetch("/api/models", {
              signal: controller.signal,
              cache: "no-store",
            });
        if (response && !response.ok) throw new Error();
        const list: AppConfig["models"] = demo
          ? [
              {
                id: "demo",
                label: "개발 데모",
                vision: false,
                image: false,
                available: true,
              },
            ]
          : await response!.json();
        if (controller.signal.aborted) return;
        let stored = "";
        try {
          stored = localStorage.getItem(key) ?? "";
        } catch {}
        const model =
          list.find((m) => m.id === stored && m.available) ??
          list.find((m) => m.available);
        setModels(list);
        setSelected(model?.id ?? "");
        onSelect({
          userId,
          id: model?.id ?? "",
          vision: model?.vision ?? false,
        });
        setNotice(
          !model
            ? "사용 가능한 모델이 없습니다. 설정을 확인하고 새로고침해주세요."
            : stored && stored !== model.id
              ? "이전에 선택한 모델을 사용할 수 없어 선택을 초기화했습니다."
              : "",
        );
        try {
          if (model) localStorage.setItem(key, model.id);
          else localStorage.removeItem(key);
        } catch {}
      } catch {
        if (!controller.signal.aborted) {
          setModels([]);
          setSelected("");
          setNotice("모델 목록을 불러오지 못했습니다.");
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [userId, demo, reload, onSelect]);
  return (
    <div className="model-select">
      <label htmlFor="ai-model">AI 모델</label>
      <select
        id="ai-model"
        value={selected}
        disabled={busy || !models.some((m) => m.available)}
        onChange={(event) => {
          const model = models.find(
            (m) => m.id === event.target.value && m.available,
          );
          if (!model) return;
          setSelected(model.id);
          setNotice("");
          onSelect({ userId, id: model.id, vision: model.vision });
          try {
            localStorage.setItem(`editor-model:${userId}`, model.id);
          } catch {}
        }}
      >
        {!selected && <option value="">모델을 선택할 수 없습니다</option>}
        {[...new Set(models.map((m) => m.provider ?? m.id.split("/")[0]))].map(
          (provider) => (
            <optgroup key={provider} label={provider}>
              {models
                .filter((m) => (m.provider ?? m.id.split("/")[0]) === provider)
                .map((m) => (
                  <option key={m.id} value={m.id} disabled={!m.available}>
                    {m.label}
                    {m.vision ? " · 이미지 이해" : ""}
                    {m.outputPrice != null
                      ? ` · 출력 $${m.outputPrice}/백만 토큰`
                      : ""}
                    {!m.available ? ` · ${m.reason}` : ""}
                  </option>
                ))}
            </optgroup>
          ),
        )}
      </select>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setSelected("");
          setModels([]);
          setNotice("모델 확인 중…");
          onSelect({ userId, id: "", vision: false });
          setReload((n) => n + 1);
        }}
        aria-label="모델 목록 새로고침"
      >
        ↻
      </button>
      {notice && <small role="status">{notice}</small>}
    </div>
  );
}
