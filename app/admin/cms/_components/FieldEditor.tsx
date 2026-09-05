"use client";

import dynamic from "next/dynamic";
import { Plus, Trash2 } from "lucide-react";

import { ADMIN_CARD, ADMIN_INPUT } from "../../_components/ui";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), { ssr: false });

export interface CmsFieldDef {
  name: string;
  label: string;
  kind: string;
  rows?: number;
  max?: number;
  min?: number;
  step?: number;
  options?: string[];
  optional?: boolean;
}

interface QaItem {
  question: string;
  answer: string;
}

interface FieldEditorProps {
  def: CmsFieldDef;
  value: unknown;
  baseValue: unknown;
  monospace?: boolean;
  onChange: (next: unknown) => void;
}

// resize-y·leading-6 은 styles/admin-yehwa.css 의 textarea.cd-adm-input 이 맡는다.
const INPUT_CLASS = ADMIN_INPUT;
const TEXTAREA_CLASS = `${INPUT_CLASS} whitespace-pre-wrap`;

function toLinesText(value: unknown, fallback: unknown): string {
  const source = Array.isArray(value) ? value : Array.isArray(fallback) ? fallback : [];
  return source.map((item) => String(item ?? "")).join("\n");
}

function toQaItems(value: unknown, fallback: unknown): QaItem[] {
  const source = Array.isArray(value) ? value : Array.isArray(fallback) ? fallback : [];
  return source.map((item) => ({
    question: String((item as QaItem)?.question ?? ""),
    answer: String((item as QaItem)?.answer ?? ""),
  }));
}

export default function FieldEditor({ def, value, baseValue, monospace, onChange }: FieldEditorProps) {
  const fieldId = `cms-field-${def.name}`;

  if (def.kind === "richtext") {
    return (
      <div className="space-y-1.5">
        <span className="block text-xs font-medium text-slate-300">{def.label}</span>
        <RichTextEditor
          value={String(value ?? baseValue ?? "")}
          onChange={(html) => onChange(html)}
          ariaLabel={def.label}
        />
      </div>
    );
  }

  if (def.kind === "lines") {
    const text = toLinesText(value, baseValue);
    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-300" htmlFor={fieldId}>
          {def.label}
          <span className="ml-2 font-normal text-slate-500">{text ? `${text.split("\n").filter(Boolean).length}개` : "비어 있음"}</span>
        </label>
        <textarea
          id={fieldId}
          value={text}
          rows={def.rows || 12}
          onChange={(event) => onChange(event.target.value.split("\n"))}
          className={`${TEXTAREA_CLASS} ${monospace ? "font-mono text-[13px]" : ""}`}
        />
      </div>
    );
  }

  if (def.kind === "qa-list") {
    const items = toQaItems(value, baseValue);
    const replace = (index: number, patch: Partial<QaItem>) => {
      const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
      onChange(next);
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">{def.label}</span>
          <button
            type="button"
            onClick={() => onChange([...items, { question: "", answer: "" }])}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-slate-500"
          >
            <Plus className="h-3.5 w-3.5" />
            문항 추가
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, index) => (
            // eslint-disable-next-line react/no-array-index-key -- 순서 자체가 항목의 정체성이라 안정적인 다른 키가 없다
            <div key={index} className={`${ADMIN_CARD} space-y-1.5 rounded-lg p-3`}>
              <div className="flex items-start gap-2">
                <input
                  value={item.question}
                  onChange={(event) => replace(index, { question: event.target.value })}
                  placeholder="질문"
                  aria-label={`${index + 1}번 질문`}
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                  aria-label={`${index + 1}번 문항 삭제`}
                  className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={item.answer}
                onChange={(event) => replace(index, { answer: event.target.value })}
                rows={4}
                placeholder="답변"
                aria-label={`${index + 1}번 답변`}
                className={TEXTAREA_CLASS}
              />
            </div>
          ))}
          {items.length === 0 ? (
            <p className={`${ADMIN_CARD} rounded-lg px-3 py-6 text-center text-sm text-slate-400`}>
              등록된 문항이 없습니다.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (def.kind === "number") {
    const current = value === undefined || value === null || value === "" ? "" : String(value);
    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-300" htmlFor={fieldId}>
          {def.label}
          {def.optional ? <span className="ml-2 font-normal text-slate-500">비우면 기본값 사용</span> : null}
        </label>
        <input
          id={fieldId}
          type="number"
          value={current}
          min={def.min}
          max={def.max}
          step={def.step}
          onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
          className={`${INPUT_CLASS} max-w-[200px]`}
        />
      </div>
    );
  }

  if (def.kind === "select") {
    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-300" htmlFor={fieldId}>{def.label}</label>
        <select
          id={fieldId}
          value={String(value ?? baseValue ?? def.options?.[0] ?? "")}
          onChange={(event) => onChange(event.target.value)}
          className={`${INPUT_CLASS} max-w-[240px]`}
        >
          {(def.options || []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
    );
  }

  if (def.kind === "textarea") {
    const text = String(value ?? baseValue ?? "");
    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-300" htmlFor={fieldId}>
          {def.label}
          {def.max ? <span className="ml-2 font-normal text-slate-500">{text.length.toLocaleString()}자</span> : null}
        </label>
        <textarea
          id={fieldId}
          value={text}
          rows={def.rows || 6}
          onChange={(event) => onChange(event.target.value)}
          className={`${TEXTAREA_CLASS} ${monospace ? "font-mono text-[13px]" : ""}`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-300" htmlFor={fieldId}>{def.label}</label>
      <input
        id={fieldId}
        value={String(value ?? baseValue ?? "")}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASS}
      />
    </div>
  );
}
