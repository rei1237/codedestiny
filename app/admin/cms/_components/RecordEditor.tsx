"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Search } from "lucide-react";

import { ADMIN_CARD, ADMIN_INPUT, ADMIN_INPUT_ICON } from "../../_components/ui";

type Row = Record<string, string>;
type Table = Record<string, Row>;

export interface RecordEditorProps {
  /** 편집 중인 표 */
  value: Table;
  /** 코드에 들어 있는 기본 표 — 되돌리기 기준이자 편집 가능한 키·필드의 정의 */
  base: Table;
  /** 키별 표시 이름 (없으면 키를 그대로 보여준다) */
  labels?: Record<string, string>;
  /** 필드별 표시 이름 */
  fieldLabels?: Record<string, string>;
  onChange: (next: Table) => void;
}

function rowOf(table: Table, key: string): Row {
  const row = table?.[key];
  return row && typeof row === "object" ? row : {};
}

export default function RecordEditor({ value, base, labels, fieldLabels, onChange }: RecordEditorProps) {
  const [keyword, setKeyword] = useState("");
  const [changedOnly, setChangedOnly] = useState(false);
  const [openKey, setOpenKey] = useState<string>("");

  const keys = useMemo(() => Object.keys(base || {}), [base]);

  const isRowChanged = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const key of keys) {
      const baseRow = rowOf(base, key);
      const current = rowOf(value, key);
      map[key] = Object.keys(baseRow).some((field) => (current[field] ?? baseRow[field]) !== baseRow[field]);
    }
    return map;
  }, [keys, base, value]);

  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return keys.filter((key) => {
      if (changedOnly && !isRowChanged[key]) return false;
      if (!needle) return true;
      const label = labels?.[key] || key;
      const merged = { ...rowOf(base, key), ...rowOf(value, key) };
      return `${key} ${label} ${Object.values(merged).join(" ")}`.toLowerCase().includes(needle);
    });
  }, [keys, keyword, changedOnly, isRowChanged, labels, base, value]);

  const changedCount = keys.filter((key) => isRowChanged[key]).length;

  const update = (key: string, field: string, text: string) => {
    onChange({ ...value, [key]: { ...rowOf(value, key), [field]: text } });
  };

  const revertRow = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className={`${ADMIN_CARD} flex flex-wrap items-center gap-2 rounded-lg px-3 py-2`}>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-slate-500" aria-hidden="true" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="항목 이름이나 내용으로 찾기"
            aria-label="해설 검색"
            className={ADMIN_INPUT_ICON}
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={changedOnly}
            onChange={(event) => setChangedOnly(event.target.checked)}
            className="h-3.5 w-3.5 accent-violet-500"
          />
          수정한 것만
        </label>
        <span className="text-xs text-slate-400">전체 {keys.length}항목 · 수정 {changedCount}</span>
      </div>

      <p className="text-xs leading-5 text-slate-400">
        항목과 칸은 계산 엔진이 정한 것이라 추가하거나 지울 수 없습니다. 각 칸의 문장만 바꿀 수 있고, 비워 두면 기본 문장이 쓰입니다.
      </p>

      <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
        {visible.length === 0 ? (
          <p className={`${ADMIN_CARD} rounded-lg px-3 py-6 text-center text-sm text-slate-400`}>
            조건에 맞는 항목이 없습니다.
          </p>
        ) : (
          visible.map((key) => {
            const baseRow = rowOf(base, key);
            const currentRow = rowOf(value, key);
            const dirty = isRowChanged[key];
            const open = openKey === key;

            return (
              <div key={key} className={`rounded-lg border bg-[#12141f] ${dirty ? "border-amber-700" : "border-slate-800"}`}>
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setOpenKey(open ? "" : key)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    aria-expanded={open}
                  >
                    <span className="truncate text-sm text-slate-100">{labels?.[key] || key}</span>
                    <span className="shrink-0 font-mono text-[11px] text-slate-500">{key}</span>
                    {dirty ? <span className="shrink-0 text-[11px] text-amber-300">수정됨</span> : null}
                  </button>
                  {dirty ? (
                    <button
                      type="button"
                      onClick={() => revertRow(key)}
                      aria-label={`${labels?.[key] || key} 기본값으로 되돌리기`}
                      title="기본값으로 되돌리기"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                {open ? (
                  <div className="space-y-3 border-t border-slate-800 px-3 py-3">
                    {Object.keys(baseRow).map((field) => {
                      const fallback = baseRow[field] ?? "";
                      const text = currentRow[field] ?? fallback;
                      const fieldDirty = text !== fallback;
                      const inputId = `record-${key}-${field}`;

                      return (
                        <div key={field} className="space-y-1">
                          <label className="flex items-center justify-between text-xs font-medium text-slate-300" htmlFor={inputId}>
                            <span>{fieldLabels?.[field] || field}</span>
                            <span className="tabular-nums text-[11px] font-normal text-slate-500">{text.length}자</span>
                          </label>
                          <textarea
                            id={inputId}
                            value={text}
                            onChange={(event) => update(key, field, event.target.value)}
                            rows={Math.min(8, Math.max(2, Math.ceil(text.length / 52)))}
                            className={ADMIN_INPUT}
                          />
                          {fieldDirty ? (
                            <p className="truncate text-[11px] text-slate-500" title={fallback}>기본값: {fallback}</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
