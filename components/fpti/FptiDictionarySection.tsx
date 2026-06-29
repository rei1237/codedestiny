"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Search, Sparkles, X } from "lucide-react";
import styles from "./FptiCosmic.module.css";
import {
  FPTI_AXIS_GUIDE,
  FPTI_DICTIONARY,
  FPTI_FILTERS,
  FPTI_UNKNOWN_CODE_MESSAGE,
  findFptiDictionaryItem,
  normalizeFptiDictionaryCode,
  type FptiDictionaryItem,
} from "@/lib/fpti/fpti-dictionary";

type Props = {
  currentCode?: string;
};

function buildSearchText(item: FptiDictionaryItem) {
  return [
    item.code,
    item.legacyCode,
    item.name,
    item.subtitle,
    item.summary,
    item.easyDescription,
    ...item.keywords,
    ...item.tags,
    ...item.elementTone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function itemMatchesFilter(item: FptiDictionaryItem, filter: string) {
  if (filter.length === 1) {
    return item.code.includes(filter) || item.legacyCode?.includes(filter);
  }

  return item.tags.includes(filter) || item.keywords.includes(filter);
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <h4 className="text-sm font-semibold text-amber-100">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FptiDictionarySection({ currentCode }: Props) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<FptiDictionaryItem | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const currentDictionaryCode = normalizeFptiDictionaryCode(currentCode);
  const currentItem = useMemo(() => findFptiDictionaryItem(currentCode), [currentCode]);
  const hasUnknownCurrentCode = Boolean(currentCode && currentDictionaryCode && !currentItem);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return FPTI_DICTIONARY.filter((item) => {
      const matchesQuery = !normalizedQuery || buildSearchText(item).includes(normalizedQuery);
      const matchesFilters = activeFilters.every((filter) => itemMatchesFilter(item, filter));
      return matchesQuery && matchesFilters;
    });
  }, [activeFilters, query]);

  const openDictionary = () => {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const findMyType = () => {
    setQuery("");
    setActiveFilters([]);
    window.setTimeout(() => {
      const target = currentDictionaryCode
        ? document.getElementById(`fpti-dictionary-card-${currentDictionaryCode}`)
        : gridRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) => (prev.includes(filter) ? prev.filter((item) => item !== filter) : [...prev, filter]));
  };

  useEffect(() => {
    if (!selectedItem) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedItem(null);
    };

    closeButtonRef.current?.focus();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedItem]);

  return (
    <section id="fpti-dictionary" className="space-y-6" aria-labelledby="fpti-dictionary-title">
      <div className={`${styles.glassPanelStrong} overflow-hidden rounded-3xl p-5 md:p-6`}>
        <div className="relative">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-purple-400/20 blur-3xl" aria-hidden />
          <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-cyan-300/10 blur-3xl" aria-hidden />

          <div className="relative grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-amber-100">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                FPTI CODEX
              </p>
              <h2 id="fpti-dictionary-title" className={`${styles.heroTitle} mt-4 text-3xl leading-tight text-slate-50 md:text-4xl`}>
                FPTI 도감
              </h2>
              <p className="mt-2 text-lg font-semibold text-purple-100">
                네 글자 성향 코드로 읽는 나의 운명 패턴
              </p>
              <div className="mt-4 max-w-3xl space-y-2 text-sm leading-7 text-slate-200">
                <p>
                  FPTI는 사주의 흐름을 바탕으로 사람의 선택 방식, 감정 반응, 관계 운영, 현실 대응 방식을 네 글자의 성향 코드로 정리한 코드 데스티니식 운명 성향 지표입니다.
                </p>
                <p>
                  예를 들어 AHFV는 밖으로 움직이는 에너지, 마음 중심 판단, 유연한 흐름, 미래 가능성을 가진 경향으로 읽습니다.
                </p>
                <p>
                  이 도감은 결과 리포트의 해석을 더 쉽게 이해하기 위한 안내서입니다. 실제 결과에서는 생년월일시에서 계산된 사주 흐름과 함께 더 구체적으로 해석됩니다.
                </p>
              </div>

              {currentItem && (
                <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200/35 bg-amber-200/10 px-4 py-3 text-sm text-amber-50 shadow-[0_0_28px_rgba(246,211,101,0.16)]">
                  <span className="font-semibold">내 FPTI: {currentCode}</span>
                  {currentCode !== currentItem.code && <span className="text-amber-100/80">도감 표기 {currentItem.code}</span>}
                  <span className="text-slate-100">{currentItem.name}</span>
                </div>
              )}

              {hasUnknownCurrentCode && (
                <div className="mt-4 rounded-2xl border border-amber-200/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
                  <p className="font-semibold">아직 도감에 등록되지 않은 성향 코드입니다.</p>
                  <p className="mt-1">{FPTI_UNKNOWN_CODE_MESSAGE}</p>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
              <div className="grid grid-cols-5 gap-2 text-center text-sm">
                {["木", "火", "土", "金", "水"].map((element) => (
                  <span key={element} className="rounded-2xl border border-white/15 bg-black/25 py-3 text-amber-100 shadow-[0_0_18px_rgba(168,85,247,0.12)]">
                    {element}
                  </span>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-cyan-200/20 bg-cyan-200/10 p-4 text-sm leading-6 text-cyan-50">
                <p className="font-semibold">FPTI가 낯설다면 먼저 도감을 열어보세요.</p>
                <p className="mt-1 text-cyan-100/85">
                  각 코드는 에너지 방향, 판단 중심, 움직임 방식, 현실 대응 방식을 조합해 만들어집니다.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openDictionary}
                  className={`${styles.ctaButton} inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold`}
                  aria-label="FPTI 도감 카드 그리드로 이동"
                >
                  <BookOpen className="h-4 w-4" aria-hidden />
                  FPTI 도감 열기
                </button>
                <button
                  type="button"
                  onClick={findMyType}
                  className={`${styles.softButton} inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold`}
                  aria-label="내 FPTI 유형 카드 찾아보기"
                >
                  <Search className="h-4 w-4" aria-hidden />
                  내 유형 찾아보기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-labelledby="fpti-axis-title">
        <h3 id="fpti-axis-title" className="sr-only">
          FPTI 4글자 코드 읽는 법
        </h3>
        {FPTI_AXIS_GUIDE.map((axis) => (
          <article key={axis.code} className={`${styles.glassPanel} rounded-3xl p-4`}>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-200">{axis.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{axis.description}</p>
            <div className="mt-3 grid gap-2">
              {axis.options.map((option) => (
                <div key={option.code} className="rounded-2xl border border-white/10 bg-[#071126]/70 p-3">
                  <p className="text-lg font-bold text-amber-100">{option.code}</p>
                  <p className="text-xs font-semibold text-purple-100">{option.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{option.description}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-indigo-100">{axis.example}</p>
            <p className="mt-2 text-xs leading-5 text-amber-100/85">{axis.sajuSense}</p>
          </article>
        ))}
      </div>

      <div ref={gridRef} className={`${styles.glassPanel} rounded-3xl p-4 md:p-5`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-cyan-200">FPTI 전체 유형 도감</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-50">16개의 별빛 좌표</h3>
          </div>
          <p className="text-sm text-slate-300">{filteredItems.length}개 유형 관측 중</p>
        </div>

        <div className="sticky top-2 z-20 mt-4 rounded-3xl border border-white/10 bg-[#071126]/90 p-3 backdrop-blur-xl md:static md:bg-white/[0.03]">
          <label className="relative block">
            <span className="sr-only">FPTI 코드, 유형 이름, 키워드 검색</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/80" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="코드, 유형 이름, 키워드로 별자리 도감 검색"
              className={`${styles.inputShell} h-12 w-full rounded-2xl px-11 text-sm`}
              type="search"
            />
          </label>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="FPTI 도감 필터">
            {FPTI_FILTERS.map((filter) => {
              const active = activeFilters.includes(filter);
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => toggleFilter(filter)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100/80 ${
                    active
                      ? "border-amber-200/70 bg-amber-200/20 text-amber-50 shadow-[0_0_16px_rgba(246,211,101,0.16)]"
                      : "border-white/15 bg-white/[0.04] text-slate-200 hover:border-purple-200/50 hover:bg-purple-200/10"
                  }`}
                  aria-pressed={active}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-amber-200/25 bg-amber-300/10 p-6 text-center text-sm leading-6 text-amber-50">
            아직 별자리 도감에서 해당 코드를 찾지 못했어요. 다른 키워드로 다시 관측해볼까요?
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {filteredItems.map((item) => {
              const isCurrent = item.code === currentDictionaryCode;
              return (
                <article
                  id={`fpti-dictionary-card-${item.code}`}
                  key={item.code}
                  className={`group flex min-h-[310px] flex-col rounded-3xl border p-4 transition hover:-translate-y-1 focus-within:-translate-y-1 ${
                    isCurrent
                      ? "border-amber-200/65 bg-amber-200/10 shadow-[0_0_34px_rgba(246,211,101,0.22)]"
                      : "border-white/10 bg-white/[0.04] shadow-[0_16px_38px_rgba(2,6,23,0.24)] hover:border-purple-200/40 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`${styles.neonTextGold} text-3xl font-bold`}>{item.code}</p>
                      {item.legacyCode && <p className="text-[11px] text-cyan-100/70">결과 코드 {item.legacyCode}</p>}
                    </div>
                    {isCurrent && (
                      <span className="rounded-full border border-amber-200/50 bg-amber-200/20 px-2.5 py-1 text-[11px] font-semibold text-amber-50">
                        현재 나의 유형
                      </span>
                    )}
                  </div>

                  <h4 className="mt-3 text-base font-semibold text-slate-50">{item.name}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.subtitle}</p>
                  <p className="mt-3 text-xs leading-5 text-indigo-100">{item.summary}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.keywords.slice(0, 3).map((keyword) => (
                      <span key={keyword} className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-2.5 py-1 text-[11px] text-cyan-50">
                        #{keyword}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.elementTone.map((element) => (
                      <span key={element} className="rounded-full border border-amber-200/20 bg-amber-200/10 px-2.5 py-1 text-[11px] text-amber-100">
                        {element}
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 text-xs leading-5 text-amber-100/90">
                    성장 방향: {item.growthAdvice}
                  </p>

                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className={`${styles.softButton} mt-auto inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/80`}
                    aria-haspopup="dialog"
                    aria-expanded={selectedItem?.code === item.code}
                    aria-label={`${item.code} ${item.name} 자세히 보기`}
                  >
                    자세히 보기
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <section className={`${styles.glassPanel} rounded-3xl p-5`} aria-labelledby="fpti-faq-title">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-cyan-200">FPTI FAQ</p>
        <h3 id="fpti-faq-title" className="mt-1 text-xl font-semibold text-slate-50">
          FPTI란?
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            ["FPTI는 MBTI와 같은 건가요?", "아닙니다. FPTI는 코드 데스티니에서 사주 흐름을 바탕으로 성향을 쉽게 이해하도록 만든 운명 성향 코드입니다."],
            ["FPTI 결과는 고정인가요?", "기본 성향은 출생 정보 기반으로 계산되지만, 실제 삶에서는 환경과 선택에 따라 표현 방식이 달라질 수 있습니다."],
            ["도감 설명과 실제 리포트는 다른가요?", "도감은 유형을 쉽게 이해하기 위한 기본 설명이고, 실제 리포트는 사용자의 사주 흐름과 함께 더 구체적으로 해석됩니다."],
          ].map(([question, answer]) => (
            <article key={question} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h4 className="text-sm font-semibold text-amber-100">{question}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-300">{answer}</p>
            </article>
          ))}
        </div>
      </section>

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedItem(null);
          }}
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="fpti-detail-title"
            className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-t-[28px] border border-white/15 bg-[#071126] p-5 shadow-[0_0_60px_rgba(168,85,247,0.28)] md:rounded-[28px] md:p-6"
          >
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="absolute inset-0 opacity-35" aria-hidden>
                <svg viewBox="0 0 420 180" className="h-full w-full">
                  <path d="M28 134 L92 68 L152 98 L230 36 L312 78 L390 28" fill="none" stroke="rgba(191,219,254,0.55)" strokeWidth="1" />
                  <g fill="rgba(253,230,138,0.75)">
                    <circle cx="28" cy="134" r="3" />
                    <circle cx="92" cy="68" r="3" />
                    <circle cx="152" cy="98" r="3" />
                    <circle cx="230" cy="36" r="3" />
                    <circle cx="312" cy="78" r="3" />
                    <circle cx="390" cy="28" r="3" />
                  </g>
                </svg>
              </div>

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.2em] text-cyan-200">CONSTELLATION TYPE DETAIL</p>
                  <h3 id="fpti-detail-title" className={`${styles.neonTextGold} mt-2 text-4xl font-bold md:text-5xl`}>
                    {selectedItem.code}
                  </h3>
                  <p className="mt-2 text-xl font-semibold text-slate-50">{selectedItem.name}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">{selectedItem.subtitle}</p>
                  {selectedItem.legacyCode && (
                    <p className="mt-2 text-xs text-cyan-100/80">
                      기존 결과 코드 {selectedItem.legacyCode}는 도감의 {selectedItem.code}와 같은 에너지 방향으로 연결됩니다.
                    </p>
                  )}
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="rounded-full border border-white/15 bg-white/10 p-2 text-slate-100 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100/80"
                  aria-label="FPTI 상세 설명 닫기"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:col-span-2">
                <h4 className="text-sm font-semibold text-amber-100">한 줄 핵심</h4>
                <p className="mt-2 text-sm leading-7 text-slate-200">{selectedItem.summary}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{selectedItem.easyDescription}</p>
              </article>

              <DetailList title="강점" items={selectedItem.strengths} />
              <DetailList title="주의할 점" items={selectedItem.cautions} />

              {[
                ["관계 스타일", selectedItem.relationshipStyle],
                ["일/사업 스타일", selectedItem.workStyle],
                ["재물 감각", selectedItem.moneyStyle],
                ["성장 조언", selectedItem.growthAdvice],
                ["어울리는 루틴", selectedItem.recommendedRoutine],
              ].map(([title, body]) => (
                <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <h4 className="text-sm font-semibold text-amber-100">{title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{body}</p>
                </article>
              ))}

              <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <h4 className="text-sm font-semibold text-amber-100">잘 맞는 코드</h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedItem.compatibleCodes.map((code) => (
                    <span key={code} className="rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1 text-xs text-cyan-50">
                      {code}
                    </span>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <h4 className="text-sm font-semibold text-amber-100">오행 감각</h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedItem.elementTone.map((element) => (
                    <span key={element} className="rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1 text-xs text-amber-100">
                      {element}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
