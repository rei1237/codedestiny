"use client";

/**
 * 결과 본문 — 스트림으로 막 받은 결과와 보관본에서 다시 연 결과가 같은 경로로 렌더된다.
 * 그래서 재열람 화면에도 PDF·시각화·교차 판정이 자동으로 따라온다.
 *
 * PDF 캡처 계약: 각 조각의 바깥 `<li>` 에 `data-fusion-pdf-section` 을 달고,
 * `exporting` 중에는 접힌 섹션을 모두 펼치고 진입 애니메이션·content-visibility 를 끈다
 * (둘 다 html2canvas 클론에서 빈 페이지를 만든다).
 */

import { FUSION_ORB_BY_KEY } from "./fusionOrbs";
import { FusionVisualization } from "./FusionVisualization";
import {
  SECTION_KEYS,
  SECTION_SYSTEM_KEYS,
  STANCE_CLASS,
  STANCE_LABEL,
  ThreadBubble,
  ThreadRow,
  ThreadSpeaker,
  tintVars,
  type Result,
} from "./fusion-thread";

export function FusionResultThread({ result, openSection, onToggleSection, exporting }: {
  result: Result;
  openSection: string;
  onToggleSection: (key: string) => void;
  exporting: boolean;
}) {
  // 캡처 중에는 "무엇을 펼쳐 뒀는지"와 무관하게 전부 보여야 한다 — 접힌 섹션은
  // display:none 이 아니라 아예 렌더되지 않으므로 캡처에서 통째로 빠진다.
  const isOpen = (key: string, fallbackOpen = false) => exporting || openSection === key || (!openSection && fallbackOpen);

  return <>
    <ThreadRow systemKey="fusion" index={0} exporting={exporting} pdfSection>
      <ThreadBubble systemKey="fusion" exporting={exporting}>
        <ThreadSpeaker label="Fusion Core" note={<span className="rounded-full bg-[var(--tint-veil)] px-2.5 py-0.5 text-[0.7rem] text-white/80">여섯 체계 분석 완료</span>} />
        <p className="m-0 max-w-[72ch] whitespace-pre-wrap font-body text-[1rem] leading-[1.9] text-[#eee6f8] [text-wrap:pretty]">{result.openingMessage}</p>
      </ThreadBubble>
    </ThreadRow>

    <ThreadRow systemKey="fusion" index={1} exporting={exporting} pdfSection>
      <ThreadBubble systemKey="fusion" tone="gold" exporting={exporting}>
        <ThreadSpeaker label="먼저, 한 문단으로" />
        <p className="m-0 max-w-[72ch] whitespace-pre-wrap font-body text-[1rem] leading-[1.92] text-[#f4eefb] [text-wrap:pretty]">{result.executiveSummary}</p>
      </ThreadBubble>
    </ThreadRow>

    {result.visualization && <ThreadRow systemKey="fusion" index={2} exporting={exporting} pdfSection>
      <ThreadBubble systemKey="fusion" exporting={exporting} className="px-3 sm:px-5">
        <ThreadSpeaker label="여섯 체계가 가리키는 방향" />
        <FusionVisualization data={result.visualization} />
      </ThreadBubble>
    </ThreadRow>}

    {SECTION_KEYS.map((key, index) => {
      const expanded = isOpen(key, index === 0);
      const systemKey = SECTION_SYSTEM_KEYS[index];
      return <ThreadRow key={key} systemKey={systemKey} index={index + 3} exporting={exporting} pdfSection>
        <ThreadBubble systemKey={systemKey} deferRender exporting={exporting}>
          <ThreadSpeaker label={systemKey === "fusion" ? "Fusion Core" : FUSION_ORB_BY_KEY[systemKey].label} />
          <h3 className="m-0">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={`fusion-section-${key}`}
              onClick={() => onToggleSection(key)}
              className="flex min-h-11 w-full items-center justify-between gap-3 text-left font-display text-[1.02rem] leading-snug text-[#f7f1ff] transition-colors hover:text-[color:var(--tint)] motion-reduce:transition-none"
            >
              <span className="min-w-0">{result[key].title}</span>
              <b className="shrink-0 rounded-full border border-white/[0.16] px-3 py-1 text-[0.74rem] font-normal text-white/75">{expanded ? "접기" : "근거 보기"}</b>
            </button>
          </h3>
          {expanded && <div id={`fusion-section-${key}`} className="mt-3 border-t border-white/[0.07] pt-4">
            <p className="m-0 max-w-[72ch] whitespace-pre-wrap font-body text-[1rem] leading-[1.92] text-[#e7dff4] [text-wrap:pretty]">{result[key].content}</p>
            <ul className="mt-4 grid max-w-[72ch] list-none gap-2.5 p-0">
              {result[key].keyPoints.map((point) => <li key={point} className="grid grid-cols-[0.375rem_minmax(0,1fr)] items-start gap-3 text-[0.94rem] leading-[1.8] text-[#d8cee9]">
                <i aria-hidden className="mt-[0.62em] size-1.5 rounded-full bg-[color:var(--tint)]" /><span>{point}</span>
              </li>)}
            </ul>
          </div>}
        </ThreadBubble>
      </ThreadRow>;
    })}

    {(() => {
      const expanded = isOpen("timing");
      return <ThreadRow systemKey="fusion" index={10} exporting={exporting} pdfSection>
        <ThreadBubble systemKey="fusion" deferRender exporting={exporting}>
          <ThreadSpeaker label="언제, 무엇을" />
          <h3 className="m-0">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls="fusion-section-timing"
              onClick={() => onToggleSection("timing")}
              className="flex min-h-11 w-full items-center justify-between gap-3 text-left font-display text-[1.02rem] leading-snug text-[#f7f1ff] transition-colors hover:text-[color:var(--tint)] motion-reduce:transition-none"
            >
              <span className="min-w-0">{result.timingAndAction.title}</span>
              <b className="shrink-0 rounded-full border border-white/[0.16] px-3 py-1 text-[0.74rem] font-normal text-white/75">{expanded ? "접기" : "행동 보기"}</b>
            </button>
          </h3>
          {expanded && <div id="fusion-section-timing" className="mt-3 border-t border-white/[0.07] pt-4">
            <p className="m-0 max-w-[72ch] whitespace-pre-wrap font-body text-[1rem] leading-[1.92] text-[#e7dff4] [text-wrap:pretty]">{result.timingAndAction.content}</p>
            {([["이번 흐름에서 해볼 일", result.timingAndAction.luckyActions], ["주의해서 볼 반복 패턴", result.timingAndAction.cautionPatterns]] as const).map(([heading, items]) => (
              <div key={heading} className="mt-5">
                <h4 className="m-0 font-display text-[0.92rem] text-[#f0dda8]">{heading}</h4>
                <ul className="mt-2.5 grid max-w-[72ch] list-none gap-2.5 p-0">
                  {items.map((item) => <li key={item} className="grid grid-cols-[0.375rem_minmax(0,1fr)] items-start gap-3 text-[0.94rem] leading-[1.8] text-[#d8cee9]">
                    <i aria-hidden className="mt-[0.62em] size-1.5 rounded-full bg-[color:var(--tint)]" /><span>{item}</span>
                  </li>)}
                </ul>
              </div>
            ))}
          </div>}
        </ThreadBubble>
      </ThreadRow>;
    })()}

    {/* 이 상품이 파는 것은 여섯 해석이 아니라 그들이 만나 남긴 답 하나다 — 대화의 폭을 다 쓴다. */}
    {result.finalVerdict && <li
      data-fusion-pdf-section="true"
      className={exporting ? "" : "animate-fade-in-up opacity-0 motion-reduce:animate-none motion-reduce:opacity-100"}
      style={exporting ? undefined : { animationDelay: "660ms" }}
    >
      <section aria-labelledby="fusion-final-verdict-heading" className="relative overflow-hidden rounded-[1.5rem] border border-[rgba(232,213,163,0.34)] bg-[linear-gradient(160deg,rgba(48,34,80,0.86),rgba(16,12,32,0.95))] px-5 py-6 sm:px-8 sm:py-8">
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#e8d5a3,transparent)]" />
        <p className="m-0 font-display text-[0.72rem] uppercase tracking-[0.3em] text-[#e8d5a3]">여섯 체계의 최종 교차 판정</p>
        <h3 id="fusion-final-verdict-heading" className="m-0 mt-3.5 max-w-[28ch] font-display text-[clamp(1.35rem,4vw,2rem)] leading-[1.35] text-[#fbf5ff]">{result.finalVerdict.headline}</h3>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <span className="text-[0.85rem] text-[#c9bcdd]">체계 간 합의</span>
          <span aria-hidden className="h-1.5 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-white/[0.09]">
            <em className="block h-full origin-left rounded-full bg-[linear-gradient(90deg,#a05cd6,#e8d5a3)] transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${Math.min(1, Math.max(0, result.finalVerdict.confidence / 100))})` }} />
          </span>
          <b className="font-display text-[1.05rem] text-[#f0dda8]">{result.finalVerdict.confidence}%</b>
        </div>
        <ul className="mt-6 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {result.finalVerdict.systemVerdicts.map((item) => (
            <li key={item.key} data-stance={item.stance} style={tintVars(item.key)} className="relative overflow-hidden rounded-xl border border-white/[0.1] bg-black/25 p-4">
              <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--tint),transparent)]" />
              <div className="flex items-center justify-between gap-2">
                <strong className="font-display text-[0.95rem] text-[#f7f1ff]">{item.label}</strong>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.72rem] ${STANCE_CLASS[item.stance]}`}>{STANCE_LABEL[item.stance]}</span>
              </div>
              <p className="m-0 mt-2.5 text-[0.88rem] leading-[1.75] text-[#cfc4e2]">{item.note}</p>
            </li>
          ))}
        </ul>
        <p className="m-0 mt-6 max-w-[72ch] whitespace-pre-wrap font-body text-[0.98rem] leading-[1.9] text-[#e4dbf2] [text-wrap:pretty]">{result.finalVerdict.rationale}</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {([["지금 할 일", result.finalVerdict.doNow, "text-[#a8e8cb]"], ["지금은 피할 일", result.finalVerdict.avoid, "text-[#f6cadb]"]] as const).map(([heading, items, tone]) => (
            <div key={heading}>
              <h4 className={`m-0 font-display text-[0.92rem] ${tone}`}>{heading}</h4>
              <ul className="mt-3 grid list-none gap-2.5 p-0">
                {items.map((item) => <li key={item} className="rounded-lg border border-white/[0.09] bg-white/[0.03] px-3.5 py-3 text-[0.92rem] leading-[1.75] text-[#ded3ea]">{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </li>}

    <ThreadRow systemKey="fusion" index={12} exporting={exporting} pdfSection>
      <ThreadBubble systemKey="fusion" exporting={exporting}>
        <ThreadSpeaker label="Fusion Core" />
        <p id="fusion-closing-message" className="m-0 max-w-[72ch] whitespace-pre-wrap font-body text-[1rem] leading-[1.9] text-[#e9e1f5] [text-wrap:pretty]">{result.closingMessage}</p>
      </ThreadBubble>
    </ThreadRow>
  </>;
}
