"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Search } from "lucide-react";

import { ADMIN_CARD, ADMIN_INPUT, ADMIN_INPUT_ICON } from "../../_components/ui";

export interface BeatsEditorProps {
  /** 인덱스 → 현재 편집 중인 텍스트 */
  value: Record<string, string>;
  /** 인덱스 → 원본(현재 서비스에 나가는) 텍스트 */
  base: Record<string, string>;
  /** 인덱스 → 화자 키 (n=지문, sys=시스템, 그 외 등장인물) */
  speakers: Record<string, string>;
  maxLength: number;
  forbidden: string[];
  onChange: (next: Record<string, string>) => void;
}

const SPEAKER_LABELS: Record<string, string> = {
  n: "지문",
  sys: "시스템",
  yeon: "연이",
  neo: "네오",
  mu: "무성",
  geo: "거울 속 연이",
  moka: "모카",
  crow: "까마귀",
  luna: "루나블룸",
  ln: "루나",
  lns: "루나 언니",
  rab: "청토끼",
  baek: "백문",
  pje: "서한비",
  god: "운명의 신",
};

function describeProblem(text: string, maxLength: number, forbidden: string[]): string {
  if (!text.trim()) return "빈 대사는 저장되지 않습니다.";
  const hit = forbidden.find((token) => text.includes(token));
  if (hit) return `사용할 수 없는 문자(${hit})가 있습니다. 작중 인용은 「 」를 쓰세요.`;
  if (text.length > maxLength) return `${maxLength}자를 넘습니다. (현재 ${text.length}자)`;
  return "";
}

export default function BeatsEditor({ value, base, speakers, maxLength, forbidden, onChange }: BeatsEditorProps) {
  const [keyword, setKeyword] = useState("");
  const [changedOnly, setChangedOnly] = useState(false);

  const indexes = useMemo(
    () => Object.keys(base).map(Number).filter(Number.isInteger).sort((a, b) => a - b),
    [base],
  );

  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return indexes.filter((index) => {
      const key = String(index);
      const text = value[key] ?? base[key] ?? "";
      if (changedOnly && text === (base[key] ?? "")) return false;
      if (!needle) return true;
      return text.toLowerCase().includes(needle) || key === needle;
    });
  }, [indexes, value, base, keyword, changedOnly]);

  const changedCount = useMemo(
    () => indexes.filter((index) => (value[String(index)] ?? base[String(index)]) !== base[String(index)]).length,
    [indexes, value, base],
  );

  const update = (index: number, text: string) => {
    onChange({ ...value, [String(index)]: text });
  };

  const revert = (index: number) => {
    const next = { ...value };
    next[String(index)] = base[String(index)] ?? "";
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
            placeholder="대사 내용 또는 비트 번호로 찾기"
            aria-label="대사 검색"
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
        <span className="text-xs text-slate-400">
          전체 {indexes.length}비트 · 수정 {changedCount}건
        </span>
      </div>

      <p className="text-xs leading-5 text-slate-400">
        비트 번호는 독자의 저장된 진행 위치와 이어져 있어 추가·삭제·순서 변경이 불가능합니다. 각 칸의 문장만 바꿀 수 있습니다.
      </p>

      <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
        {visible.length === 0 ? (
          <p className={`${ADMIN_CARD} rounded-lg px-3 py-6 text-center text-sm text-slate-400`}>
            조건에 맞는 대사가 없습니다.
          </p>
        ) : (
          visible.map((index) => {
            const key = String(index);
            const original = base[key] ?? "";
            const text = value[key] ?? original;
            const dirty = text !== original;
            const problem = dirty ? describeProblem(text, maxLength, forbidden) : "";
            const speaker = SPEAKER_LABELS[speakers[key]] ?? speakers[key] ?? "";

            return (
              <div
                key={key}
                className={`rounded-lg border bg-[#12141f] px-3 py-2 ${problem ? "border-rose-700" : dirty ? "border-amber-700" : "border-slate-800"}`}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] tabular-nums text-slate-500">
                    #{index}
                    {speaker ? <span className="ml-2 text-slate-400">{speaker}</span> : null}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] tabular-nums ${text.length > maxLength ? "text-rose-300" : "text-slate-500"}`}>
                      {text.length}/{maxLength}
                    </span>
                    {dirty ? (
                      <button
                        type="button"
                        onClick={() => revert(index)}
                        aria-label={`${index}번 대사 되돌리기`}
                        title="원문으로 되돌리기"
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <textarea
                  value={text}
                  onChange={(event) => update(index, event.target.value)}
                  rows={Math.min(6, Math.max(2, Math.ceil(text.length / 46)))}
                  aria-label={`${index}번 대사`}
                  className={ADMIN_INPUT}
                />
                {problem ? <p className="mt-1 text-[11px] text-rose-300">{problem}</p> : null}
                {dirty && !problem ? (
                  <p className="mt-1 truncate text-[11px] text-slate-500" title={original}>
                    원문: {original}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
