"use client";

/**
 * 결과 본문 — 스트림으로 막 받은 결과와 보관본에서 다시 연 결과가 같은 경로로 렌더된다.
 * 그래서 재열람 화면에도 PDF·시각화·교차 판정이 자동으로 따라온다.
 *
 * PDF 캡처 계약: 각 조각의 바깥 `<li>` 에 `data-fusion-pdf-section` 을 달고,
 * `exporting` 중에는 접힌 섹션을 모두 펼치고 진입 애니메이션·content-visibility 를 끈다
 * (둘 다 html2canvas 클론에서 빈 페이지를 만든다).
 */

import { FusionVisualization } from "./FusionVisualization";
import {
  SECTION_KEYS,
  SECTION_SYSTEM_KEYS,
  STANCE_CLASS,
  ThreadBubble,
  ThreadRow,
  ThreadSpeaker,
  TypingDots,
  tintVars,
  type Result,
} from "./fusion-thread";
import { useFusionSharedCopy } from "./_lib/copy";
import { countSectionChars, countTimingChars, readingMinutes } from "./_lib/reading";
import styles from "./fusion-fortune.module.css";

export function FusionResultThread({ result, openSection, onToggleSection, exporting, stageTwoGenerating = false }: {
  result: Result;
  openSection: string;
  onToggleSection: (key: string) => void;
  exporting: boolean;
  /** 1단계만 도착했고 2단계 스트림이 도는 중 — 요약·시기·판정 자리에 대기 말풍선을 둔다. */
  stageTwoGenerating?: boolean;
}) {
  const copy = useFusionSharedCopy();
  const sectionMeta = (chars: number) => `${copy.charsCount(chars.toLocaleString())} · ${copy.minutesAbout(readingMinutes(chars, copy.readingCharsPerMinute))}`;
  // 캡처 중에는 "무엇을 펼쳐 뒀는지"와 무관하게 전부 보여야 한다 — 접힌 섹션은
  // display:none 이 아니라 아예 렌더되지 않으므로 캡처에서 통째로 빠진다.
  const isOpen = (key: string, fallbackOpen = false) => exporting || openSection === key || (!openSection && fallbackOpen);

  return <>
    <ThreadRow systemKey="fusion" index={0} exporting={exporting} pdfSection tocKey="opening">
      <ThreadBubble systemKey="fusion" exporting={exporting}>
        <ThreadSpeaker label="Fusion Core" note={<span className="rounded-full bg-[var(--tint-veil)] px-2.5 py-0.5 text-[0.7rem] text-white/80">{copy.analysisCompleteBadge}</span>} />
        <p className={`m-0 max-w-[72ch] whitespace-pre-wrap ${styles.reading} text-[var(--fx-ink-2)] [text-wrap:pretty]`}>{result.openingMessage}</p>
      </ThreadBubble>
    </ThreadRow>

    {/* 2단계 생성의 1단계 결과에는 요약·종합·시기·총평이 아직 없다 — 있는 것만 그린다. */}
    {result.executiveSummary && <ThreadRow systemKey="fusion" index={1} exporting={exporting} pdfSection tocKey="summary">
      <ThreadBubble systemKey="fusion" tone="gold" exporting={exporting}>
        <ThreadSpeaker label={copy.firstParagraphSpeaker} meta={sectionMeta(result.executiveSummary.length)} />
        <p className={`m-0 max-w-[72ch] whitespace-pre-wrap ${styles.reading} text-[var(--fx-ink-1)] [text-wrap:pretty]`}>{result.executiveSummary}</p>
      </ThreadBubble>
    </ThreadRow>}

    {result.visualization && <ThreadRow systemKey="fusion" index={2} exporting={exporting} pdfSection tocKey="visual">
      <ThreadBubble systemKey="fusion" exporting={exporting}>
        <ThreadSpeaker label={copy.sixSystemsDirectionSpeaker} />
        {/* 텍스트 PDF 는 본문을 직접 조판하지만 이 도표만은 그림이라 여기만 캡처한다. */}
        <div data-fusion-visual="true"><FusionVisualization data={result.visualization} /></div>
      </ThreadBubble>
    </ThreadRow>}

    {SECTION_KEYS.filter((key) => result[key]?.content).map((key, index) => {
      const expanded = isOpen(key, index === 0);
      const systemKey = SECTION_SYSTEM_KEYS[index];
      // 첫 근거를 "핵심 한 문장"으로 올린다 — 접힌 상태에서도 이 섹션이 무엇을 말하는지 한 줄로 안다.
      // 근거 목록에서는 뺀다(같은 문장을 두 번 보이지 않게). PDF 조판은 결과 JSON 을 직접 읽으므로 무관하다.
      const [keySentence, ...restPoints] = result[key].keyPoints || [];
      return <ThreadRow key={key} systemKey={systemKey} index={index + 3} exporting={exporting} pdfSection tocKey={key}>
        <ThreadBubble systemKey={systemKey} deferRender exporting={exporting}>
          <ThreadSpeaker label={systemKey === "fusion" ? "Fusion Core" : copy.systemLabels[systemKey]} meta={sectionMeta(countSectionChars(result[key]))} />
          <h3 className="m-0">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={`fusion-section-${key}`}
              onClick={() => onToggleSection(key)}
              className={`flex min-h-11 w-full items-center justify-between gap-3 text-left ${styles.readingTitle} ${styles.readingSectionTitle} text-[var(--fx-ink-1)] transition-colors hover:text-[color:var(--tint-label)] motion-reduce:transition-none`}
            >
              <span className="min-w-0">{result[key].title}</span>
              <b className="shrink-0 rounded-full border border-white/[0.16] px-3 py-1 text-[0.74rem] font-normal text-white/75">{expanded ? copy.collapseButton : copy.viewEvidenceButton}</b>
            </button>
          </h3>
          {keySentence && <p className="m-0 mt-3.5 grid max-w-[72ch] grid-cols-[auto_minmax(0,1fr)] items-baseline gap-3.5 rounded-xl bg-black/25 px-4 py-3.5">
            <span className="text-[0.7rem] uppercase tracking-[0.2em] text-[color:var(--tint-label)]">{copy.keySentenceLabel}</span>
            <q className={`[quotes:none] ${styles.readingTitle} text-[1.05rem] leading-[1.8] text-[var(--fx-ink-1)] [text-wrap:pretty]`}>{keySentence}</q>
          </p>}
          {expanded && <div id={`fusion-section-${key}`} className="mt-3 border-t border-white/[0.07] pt-4">
            <p className={`m-0 max-w-[72ch] whitespace-pre-wrap ${styles.reading} text-[var(--fx-ink-2)] [text-wrap:pretty]`}>{result[key].content}</p>
            <ul className="mt-4 grid max-w-[72ch] list-none gap-2.5 p-0">
              {restPoints.map((point) => <li key={point} className={`grid grid-cols-[0.375rem_minmax(0,1fr)] items-start gap-3 ${styles.readingBullet} text-[var(--fx-ink-3)]`}>
                <i aria-hidden className="mt-[0.62em] size-1.5 rounded-full bg-[color:var(--tint)]" /><span>{point}</span>
              </li>)}
            </ul>
          </div>}
        </ThreadBubble>
      </ThreadRow>;
    })}

    {result.timingAndAction?.content && (() => {
      const expanded = isOpen("timing");
      return <ThreadRow systemKey="fusion" index={10} exporting={exporting} pdfSection tocKey="timing">
        <ThreadBubble systemKey="fusion" deferRender exporting={exporting}>
          <ThreadSpeaker label={copy.whenWhatSpeaker} meta={sectionMeta(countTimingChars(result.timingAndAction))} />
          <h3 className="m-0">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls="fusion-section-timing"
              onClick={() => onToggleSection("timing")}
              className={`flex min-h-11 w-full items-center justify-between gap-3 text-left ${styles.readingTitle} ${styles.readingSectionTitle} text-[var(--fx-ink-1)] transition-colors hover:text-[color:var(--tint-label)] motion-reduce:transition-none`}
            >
              <span className="min-w-0">{result.timingAndAction.title}</span>
              <b className="shrink-0 rounded-full border border-white/[0.16] px-3 py-1 text-[0.74rem] font-normal text-white/75">{expanded ? copy.collapseButton : copy.viewActionButton}</b>
            </button>
          </h3>
          {expanded && <div id="fusion-section-timing" className="mt-3 border-t border-white/[0.07] pt-4">
            <p className={`m-0 max-w-[72ch] whitespace-pre-wrap ${styles.reading} text-[var(--fx-ink-2)] [text-wrap:pretty]`}>{result.timingAndAction.content}</p>
            {([[copy.thingsToDoHeading, result.timingAndAction.luckyActions || []], [copy.patternsToWatchHeading, result.timingAndAction.cautionPatterns || []]] as const).map(([heading, items]) => (
              <div key={heading} className="mt-5">
                <h4 className="m-0 font-display text-[0.92rem] text-[var(--fx-gold)]">{heading}</h4>
                <ul className="mt-2.5 grid max-w-[72ch] list-none gap-2.5 p-0">
                  {items.map((item) => <li key={item} className={`grid grid-cols-[0.375rem_minmax(0,1fr)] items-start gap-3 ${styles.readingBullet} text-[var(--fx-ink-3)]`}>
                    <i aria-hidden className="mt-[0.62em] size-1.5 rounded-full bg-[color:var(--tint)]" /><span>{item}</span>
                  </li>)}
                </ul>
              </div>
            ))}
          </div>}
        </ThreadBubble>
      </ThreadRow>;
    })()}

    {/* 2단계 대기. 1단계만 온 화면은 결과가 끝난 것처럼 보이므로, 이어질 자리를 점선 말풍선으로 미리 둔다.
        실패는 여기가 아니라 클라이언트의 stageTwoFailed 카드(이어서 생성 버튼)가 맡는다 — 같은 장치를 둘 두지 않는다.
        캡처 대상이 아니다: data-fusion-pdf-section 없음, exporting 중에는 아예 그리지 않는다. */}
    {stageTwoGenerating && !exporting && !result.finalVerdict && <ThreadRow systemKey="fusion" dimmed index={11}>
      <ThreadBubble systemKey="fusion" className="border-dashed border-white/[0.16] bg-transparent">
        <ThreadSpeaker
          label="Fusion Core"
          note={<span role="status" className="inline-flex items-center gap-2 rounded-full bg-[var(--tint-veil)] px-2.5 py-0.5 text-[0.7rem] text-white/80"><TypingDots />{copy.stageTwoPendingBadge}</span>}
        />
        <p className={`m-0 max-w-[72ch] ${styles.reading} text-[1rem] text-[var(--fx-ink-3)] [text-wrap:pretty]`}>{copy.stageTwoPendingMessage}</p>
        <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
          {[!result.executiveSummary && copy.summaryShortLabel, !result.timingAndAction?.content && copy.whenWhatSpeaker, copy.verdictShortLabel].filter(Boolean).map((label) => (
            <li key={label as string} className="rounded-full border border-dashed border-white/[0.16] px-2.5 py-1 text-[0.78rem] text-[var(--fx-ink-4)]">{label}</li>
          ))}
        </ul>
      </ThreadBubble>
    </ThreadRow>}

    {/* 이 상품이 파는 것은 여섯 해석이 아니라 그들이 만나 남긴 답 하나다 — 대화의 폭을 다 쓴다. */}
    {result.finalVerdict && <li
      id="fusion-toc-verdict"
      data-fusion-toc="verdict"
      data-fusion-pdf-section="true"
      className={exporting ? "" : "animate-fade-in-up opacity-0 motion-reduce:animate-none motion-reduce:opacity-100"}
      style={exporting ? undefined : { animationDelay: "660ms" }}
    >
      <section aria-labelledby="fusion-final-verdict-heading" className="relative overflow-hidden rounded-[1.5rem] border border-[rgba(232,213,163,0.34)] bg-[linear-gradient(160deg,rgba(48,34,80,0.86),rgba(16,12,32,0.95))] px-5 py-6 sm:px-8 sm:py-8">
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--fx-gold-2),transparent)]" />
        <p className="m-0 font-display text-[0.72rem] uppercase tracking-[0.3em] text-[var(--fx-gold-2)]">{copy.finalVerdictEyebrow}</p>
        <h3 id="fusion-final-verdict-heading" className={`m-0 mt-3.5 max-w-[28ch] ${styles.readingTitle} text-[clamp(1.5rem,4.4vw,2.25rem)] leading-[1.3] text-[var(--fx-ink-1)]`}>{result.finalVerdict.headline}</h3>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <span className="text-[0.85rem] text-[var(--fx-ink-3)]">{copy.crossCheckGaugeCaption}</span>
          <span aria-hidden className="h-1.5 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-white/[0.09]">
            <em className="block h-full origin-left rounded-full bg-[linear-gradient(90deg,var(--fx-violet),var(--fx-gold-2))] transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${Math.min(1, Math.max(0, result.finalVerdict.confidence / 100))})` }} />
          </span>
          <b className="font-display text-[1.05rem] text-[var(--fx-gold)]">{result.finalVerdict.confidence}%</b>
        </div>
        <ul className="mt-6 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {result.finalVerdict.systemVerdicts.map((item) => (
            <li key={item.key} data-stance={item.stance} style={tintVars(item.key)} className="relative overflow-hidden rounded-xl border border-white/[0.1] bg-black/25 p-4">
              <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--tint),transparent)]" />
              <div className="flex items-center justify-between gap-2">
                <strong className="font-display text-[0.95rem] text-[var(--fx-ink-1)]">{item.label}</strong>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.72rem] ${STANCE_CLASS[item.stance]}`}>{copy.stanceLabels[item.stance]}</span>
              </div>
              <p className="m-0 mt-2.5 text-[0.88rem] leading-[1.75] text-[var(--fx-ink-3)]">{item.note}</p>
            </li>
          ))}
        </ul>
        <p className={`m-0 mt-6 max-w-[72ch] whitespace-pre-wrap ${styles.reading} text-[var(--fx-ink-2)] [text-wrap:pretty]`}>{result.finalVerdict.rationale}</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {([[copy.doNowHeading, result.finalVerdict.doNow, "text-[var(--fx-mint)]"], [copy.avoidNowHeading, result.finalVerdict.avoid, "text-[var(--fx-rose)]"]] as const).map(([heading, items, tone]) => (
            <div key={heading}>
              <h4 className={`m-0 font-display text-[0.92rem] ${tone}`}>{heading}</h4>
              <ul className="mt-3 grid list-none gap-2.5 p-0">
                {items.map((item) => <li key={item} className="rounded-lg border border-white/[0.09] bg-white/[0.03] px-3.5 py-3 text-[0.92rem] leading-[1.75] text-[var(--fx-ink-3)]">{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </li>}

    {result.closingMessage && <ThreadRow systemKey="fusion" index={12} exporting={exporting} pdfSection tocKey="closing">
      <ThreadBubble systemKey="fusion" exporting={exporting}>
        <ThreadSpeaker label="Fusion Core" />
        <p id="fusion-closing-message" className={`m-0 max-w-[72ch] whitespace-pre-wrap ${styles.reading} text-[var(--fx-ink-2)] [text-wrap:pretty]`}>{result.closingMessage}</p>
      </ThreadBubble>
    </ThreadRow>}
  </>;
}
