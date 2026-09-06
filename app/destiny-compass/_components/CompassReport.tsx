"use client";
/**
 * 운명의 나침반 결과 — ①~⑨ 프리미엄 리포트(다크 코스믹).
 *
 * 무료: ① 좌표 ② 흐름 ⑧ 종합 조언(단문) ⑨ 나침반 + 레이더·행운
 * 유료(destiny-compass-deep-report, 회당 10,000원): ③ 원인(체계별) ④ 변화 ⑤ 기회 ⑥ 피할 선택 ⑦ 행동
 *
 * 도착 즉시 렌더 — 웨이브 A(체계별 5섹션)가 먼저 도착해 ③이 채워지고, 그 뒤 B가 ④~⑦·⑧장문을 채운다.
 * 섹션 하나가 실패해도 리포트 전체를 막지 않는다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AiResultProse from "@/components/fortune/AiResultProse";
import { ReportActions } from "./ReportActions";
import { CompassHero, ConfidenceMeta, coordinateLine } from "./CompassHero";
import { CompassInsightCards } from "./CompassInsightCards";
import { DestinyRadar } from "./DestinyRadar";
import { PigFace } from "./PigFace";
import { Starfield } from "./Starfield";
import { EvidenceList } from "./EvidenceCard";
import { ReportSection, type SectionState } from "./ReportSection";
import { getReportSection, type ReportSectionId, type ServerSectionKey } from "./reportSections";
import { DIRECTION_TO_REGION, regionByKey } from "./mapRegions";
import { useFxTier } from "../_hooks/useFxTier";
import { useCompassReport, type CompassReportResumeWiring } from "../_hooks/useCompassReport";
import styles from "./map.module.css";
import type { CompassInput, DirectionField, SystemKey } from "../_engine/types";
import { useDestinyCompassCopy } from "../_lib/copy";
import { AI_LOCALE_HEADER, toAiLocale } from "@/lib/i18n/ai-locale";
import { detectLocale } from "@/lib/i18n/dictionary";
import { pigExpression } from "../_stage/expressionMap";
import {
  NARRATION_RISKY,
  buildNarrationInput,
  evidenceTerm,
  hashStr,
  pigCommentary,
  topContributions,
} from "../_stage/narration";
import { collectItem } from "../_lib/rpg-bridge";
import { formatKrwFromCoins } from "@/lib/payment/coin-pricing";

interface CompassReportProps {
  input: CompassInput;
  field: DirectionField;
  situation?: string;
  onNext: () => void;
  onRestart: () => void;
  onCrossroad: () => void;
  onFutureSim: () => void;
  onVoyage: () => void;
  /** 결제 복귀 재개 배선 — 서술자 생성기와 복귀 증빙은 CompassApp 이 소유한다. */
  resumeWiring?: CompassReportResumeWiring;
}

/** 나침반이 실제로 참여하는 체계의 순서(어댑터가 없는 서양 점성술은 없다). */
const SYSTEM_ORDER: SystemKey[] = ["saju", "ziwei", "sukuyo", "tarot", "vedic"];

/** ③에서 체계별 LLM 섹션을 찾는 매핑. */
const SYSTEM_SECTION_KEY: Partial<Record<SystemKey, ServerSectionKey>> = {
  saju: "saju_reading",
  ziwei: "ziwei_reading",
  sukuyo: "sukuyo_reading",
  tarot: "tarot_vara_reading",
};

const TREND_ICON = { up: "↑", down: "↓", flat: "→" } as const;

function trendOf(score: number): keyof typeof TREND_ICON {
  return score >= 66 ? "up" : score <= 40 ? "down" : "flat";
}

export function CompassReport({
  input, field, situation, onNext, onRestart, onCrossroad, onFutureSim, onVoyage, resumeWiring,
}: CompassReportProps) {
  const copy = useDestinyCompassCopy();
  const SYSTEM_LABEL: Record<SystemKey, string> = copy.systemLabel;
  const TIMELINE_LABEL: Record<string, string> = copy.timelineLabel;
  const WEATHER_LABEL: Record<string, string> = copy.weatherLabel;
  const short = useCallback((k: keyof typeof copy.directionShortLabel) => copy.directionShortLabel[k], [copy]);
  const fxTier = useFxTier();
  const question = situation || "";
  const report = useCompassReport(input, field, question, resumeWiring);
  const causeTitleRef = useRef<HTMLHeadingElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const unlockedRef = useRef(false);
  const coordinate = coordinateLine(field.primary.band, field.primary.key, copy);

  const dest = regionByKey(DIRECTION_TO_REGION[field.primary.key]);
  const destLabel = dest ? copy.regionLabel[dest.key as keyof typeof copy.regionLabel] : undefined;
  const activeSystems = useMemo(() => new Set<SystemKey>(field.sources), [field.sources]);
  const priceLabel = formatKrwFromCoins(100, detectLocale());

  // 세션 캐시 복원(같은 탭에서 결과를 오가도 재결제하지 않는다)
  useEffect(() => {
    report.restore();
    // restore 는 field/question 에만 의존하는 안정 콜백이다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.seed]);

  // 오늘의 타로 카드를 운명 도감에 수집(멱등·계정 단위)
  useEffect(() => {
    const term = field.raw?.tarot?.evidence?.[0]?.term;
    if (term) void collectItem(`tarot:${term.split("(")[0]}`);
  }, [field]);

  // 결제 해금 직후에만 포커스를 ③으로 옮긴다 — 방금 산 것이 어디 있는지 보여준다.
  useEffect(() => {
    if (report.phase === "waveA" && !unlockedRef.current) {
      unlockedRef.current = true;
      causeTitleRef.current?.focus();
    }
  }, [report.phase]);

  // ⑧ 무료 단문 — 규칙 템플릿을 먼저 띄우고, 문장화가 성공하면 교체(실패 시 템플릿 유지)
  const baseText = useMemo(() => pigCommentary(field, copy), [field, copy]);
  const [freeAdvice, setFreeAdvice] = useState(baseText);
  useEffect(() => {
    setFreeAdvice(baseText);
    let cancelled = false;
    const key = `cd-narrate:${field.seed}:${hashStr(question)}`;
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        setFreeAdvice(cached);
        return;
      }
    } catch {
      /* storage 불가 → 네트워크로 */
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 32000);
    const aiLocale = toAiLocale(detectLocale());
    fetch("/api/destiny-compass/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json", [AI_LOCALE_HEADER]: aiLocale },
      body: JSON.stringify({ narration: buildNarrationInput(field, question, copy), baseText }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const t = typeof d?.pigCommentary === "string" ? d.pigCommentary.trim() : "";
        // 🔴 라벨·위험소재 검사는 한국어에만 성립한다(서버 isFaithful 과 같은 기준).
        const koGuard = aiLocale === "ko";
        const mentionsLabel = !koGuard || t.includes(short(field.primary.key)) || t.includes(short(field.strongArea.key));
        const risky = koGuard && NARRATION_RISKY.test(t);
        if (d?.ok && t.length >= 12 && mentionsLabel && !risky) {
          setFreeAdvice(t);
          try {
            sessionStorage.setItem(key, t);
          } catch {
            /* 무시 */
          }
        }
      })
      .catch(() => {
        /* 실패 → 템플릿 유지 */
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      cancelled = true;
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [field, question, baseText, copy, short]);

  /** 유료 섹션의 현재 상태. 결제 전=locked, 생성 중=pending, 도착=arrived, 실패=failed. */
  const paidState = (id: ReportSectionId): SectionState => {
    const spec = getReportSection(id, copy);
    const arrived = spec.serverKeys.some((k) => report.sections[k]?.body);
    if (arrived) return "arrived";
    if (report.phase === "locked") return "locked";
    if (report.phase === "failed") return "failed";
    if (report.phase === "paying" || report.phase === "waveA" || report.phase === "waveB") return "pending";
    return "failed";
  };

  const sectionBody = (key: ServerSectionKey) => report.sections[key];
  const starsBySystem = useMemo(
    () => new Map(report.systemConfidence.map((r) => [r.system, r.stars])),
    [report.systemConfidence],
  );

  const unlockProps = {
    onUnlock: report.unlock,
    unlockLabel: `${priceLabel}${copy.unlockLabelSuffix}`,
    unlockBusy: report.isPaying || report.phase === "paying" || report.phase === "waveA",
  };

  return (
    <div className={`${styles.resultStage} ${styles.nightStage}`} data-fx={fxTier}>
      <Starfield />

      <div className={styles.reportShell} ref={shellRef}>
        {/* ① 오늘의 운명 좌표 — 거대한 나침반이 먼저, 그 아래 좌표 한 문장이 이 화면의 h1 이다. */}
        <ReportSection
          spec={getReportSection("coordinate", copy)}
          state="arrived"
          headingLevel={1}
          eyebrow={copy.reportEyebrow}
          titleOverride={coordinate}
          media={
            <CompassHero
              directions={field.directions}
              primary={field.primary.key}
              band={field.primary.band}
              confidence={field.confidence}
              state="settling"
            />
          }
        >
          <ConfidenceMeta confidence={field.confidence} />
          {question && <p className={styles.resultQuestion}>&ldquo;{question}&rdquo;</p>}
          {sectionBody("opening") && <AiResultProse value={sectionBody("opening")?.body} />}
          <div className={styles.sysHint} aria-label={copy.sysHintAriaLabel}>
            {SYSTEM_ORDER.map((sys) => (
              <span key={sys} className={`${styles.sysChip} ${activeSystems.has(sys) ? styles.sysChipOn : ""}`}>
                {SYSTEM_LABEL[sys]}
              </span>
            ))}
          </div>
        </ReportSection>

        <CompassInsightCards field={field} />

        {/* ② 현재의 흐름 */}
        <ReportSection spec={getReportSection("flow", copy)} state="arrived">
          <div className={styles.flowCards}>
            {field.directions.slice(0, 6).map((d) => {
              const t = trendOf(d.score);
              return (
                <div key={d.key} className={styles.flowCard} data-trend={t}>
                  <span className={styles.flowName}>{short(d.key)}</span>
                  <span className={styles.flowVal}>
                    {d.score}
                    <i className={styles.flowTrend} aria-hidden="true">{TREND_ICON[t]}</i>
                  </span>
                  <span className={styles.flowBar}>
                    <i className={styles.flowBarFill} style={{ transform: `scaleX(${d.score / 100})` }} />
                  </span>
                </div>
              );
            })}
          </div>
          <p className={styles.reportProse}>{copy.flowProse(short(field.strongArea.key), short(field.blockedArea.key))}</p>
        </ReportSection>

        {/* ③ 운명의 원인 — 체계별 독립 해석 */}
        <ReportSection
          spec={getReportSection("cause", copy)}
          state={paidState("cause")}
          ref={causeTitleRef}
          ghostLines={8}
          {...unlockProps}
        >
          <div className={styles.causeGrid}>
            {SYSTEM_ORDER.filter((sys) => activeSystems.has(sys)).map((sys) => {
              const key = SYSTEM_SECTION_KEY[sys];
              const section = key ? sectionBody(key) : undefined;
              const term = evidenceTerm(field, sys);
              const contribs = topContributions(field, sys);
              const stars = starsBySystem.get(sys);
              return (
                <div key={sys} className={styles.causeBlock}>
                  <div className={styles.causeHead}>
                    <span className={styles.causeName}>{SYSTEM_LABEL[sys]}</span>
                    {typeof stars === "number" && (
                      <span
                        className={styles.evidenceStars}
                        role="img"
                        aria-label={copy.evidenceStarsAriaLabel(SYSTEM_LABEL[sys], stars)}
                      >
                        <span aria-hidden="true">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
                      </span>
                    )}
                    {term && <span className={styles.sysCardTerm}>{term}</span>}
                  </div>
                  {contribs.length > 0 && (
                    <p className={styles.evidenceText}>
                      {copy.contributionsPrefix}{contribs.map((k) => short(k)).join(" · ")}
                    </p>
                  )}
                  {section?.body ? (
                    <>
                      <AiResultProse value={section.body} />
                      <EvidenceList grounds={section.grounds || []} />
                    </>
                  ) : (
                    // 베다는 LLM 섹션이 따로 없다(타로 섹션이 함께 다룬다) — 근거만 보여준다.
                    <p className={styles.evidenceText}>
                      {sys === "vedic" ? copy.vedicOnlyNote : copy.sectionLoadingNote}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </ReportSection>

        {/* ④ 앞으로 다가오는 변화 */}
        <ReportSection spec={getReportSection("change", copy)} state={paidState("change")} {...unlockProps}>
          <div className={styles.timelineStack}>
            {(["d30", "d90", "y1", "y3"] as const).map((k) => {
              const phase = field.timeline[k];
              if (!phase) return null;
              return (
                <div key={k} className={styles.timelineCard}>
                  <span className={styles.timelinePeriod}>{TIMELINE_LABEL[k]}</span>
                  <span className={styles.timelineWeather}>{WEATHER_LABEL[phase.weather] || phase.weather}</span>
                  <span className={styles.timelineMomentum}>{copy.momentumPrefix}{phase.momentum}</span>
                </div>
              );
            })}
          </div>
          <AiResultProse value={sectionBody("timeline_reading")?.body} />
          <EvidenceList grounds={sectionBody("timeline_reading")?.grounds || []} />
        </ReportSection>

        {/* ⑤ 반드시 잡아야 하는 기회 */}
        <ReportSection spec={getReportSection("opportunity", copy)} state={paidState("opportunity")} {...unlockProps}>
          <AiResultProse value={sectionBody("opportunity_reading")?.body} />
          <EvidenceList grounds={sectionBody("opportunity_reading")?.grounds || []} />
        </ReportSection>

        {/* ⑥ 피해야 하는 선택 */}
        <ReportSection spec={getReportSection("avoid", copy)} state={paidState("avoid")} {...unlockProps}>
          <AiResultProse value={sectionBody("blocked_and_care")?.body} />
          <EvidenceList grounds={sectionBody("blocked_and_care")?.grounds || []} />
        </ReportSection>

        {/* ⑦ 행동 가이드 */}
        <ReportSection spec={getReportSection("action", copy)} state={paidState("action")} {...unlockProps}>
          <AiResultProse value={sectionBody("action_plan")?.body} />
          <EvidenceList grounds={sectionBody("action_plan")?.grounds || []} />
        </ReportSection>

        {/* ⑧ 종합 조언 — 무료는 단문(꽃돼지), 결제하면 다섯 체계 교차 검증 장문 */}
        <ReportSection spec={getReportSection("advice", copy)} state="arrived">
          <div className={styles.resultSpeak}>
            <PigFace expression={pigExpression(field.primary.band, "hopeful")} height={78} className={styles.speakPigDark} />
            <div className={styles.resultBubble}>
              <div className={styles.resultWho}>{copy.pigSpeakerName}</div>
              <p>{freeAdvice}</p>
            </div>
          </div>
          {sectionBody("cross_synthesis") && (
            <>
              <AiResultProse value={sectionBody("cross_synthesis")?.body} />
              <EvidenceList grounds={sectionBody("cross_synthesis")?.grounds || []} />
            </>
          )}
          {report.canRetryWaveB && (
            <div className={styles.reportFailed} role="status">
              <p>{copy.retrySynthesisNotice}</p>
              <button type="button" className={styles.resultCtaGhost} onClick={report.retryWaveB}>
                {copy.retrySynthesisButton}
              </button>
            </div>
          )}
        </ReportSection>

        {/* ⑨ 운명의 나침반 — 지금 / 가야 할 방향 */}
        <ReportSection spec={getReportSection("compass", copy)} state="arrived">
          <p className={styles.reportProse}>
            {copy.compassProse(short(field.blockedArea.key), destLabel ?? short(field.primary.key))}
          </p>
          <div className={styles.radarBlock}>
            <div className={styles.radarSweepWrap}>
              <DestinyRadar directions={field.directions} />
              <span className={styles.radarSweep} aria-hidden="true" />
            </div>
            <div className={styles.luckyGrid} aria-label={copy.luckyGridAriaLabel}>
              <span className={styles.luckyPill}>{copy.luckyPlaceLabel} <b>{copy.luckyPlace[field.lucky.luckyPlaceKey as keyof typeof copy.luckyPlace]}</b></span>
              <span className={styles.luckyPill}>{copy.luckyTimeLabel} <b>{copy.luckyTime[field.lucky.luckyTimeKey as keyof typeof copy.luckyTime]}</b></span>
              <span className={styles.luckyPill}>{copy.luckyColorLabel} <b>{copy.luckyColor[field.lucky.luckyColorKey as keyof typeof copy.luckyColor]}</b></span>
              <span className={styles.luckyPill}>{copy.luckyPersonLabel} <b>{copy.luckyPerson[field.lucky.luckyPersonKey as keyof typeof copy.luckyPerson]}</b></span>
            </div>
          </div>
        </ReportSection>

        {/* 심화 3종(별도 상품) — 기존 자리 그대로 */}
        <div className={styles.flowSection}>
          <span className={styles.flowLabel}>{copy.deeperLabel}</span>
          <div className={styles.previewGrid}>
            <button type="button" className={styles.previewCard} onClick={onFutureSim}>
              <span className={styles.previewPrice}>{priceLabel}</span>
              <span className={styles.previewIcon} aria-hidden="true">🧭</span>
              <span className={styles.previewName}>{copy.previewCards.futureSim.name}</span>
              <span className={styles.previewDesc}>{copy.previewCards.futureSim.desc}</span>
              <span className={styles.previewGo}>{copy.previewGoText}</span>
            </button>
            <button type="button" className={styles.previewCard} onClick={onCrossroad}>
              <span className={styles.previewPrice}>{priceLabel}</span>
              <span className={styles.previewIcon} aria-hidden="true">⚖️</span>
              <span className={styles.previewName}>{copy.previewCards.crossroad.name}</span>
              <span className={styles.previewDesc}>{copy.previewCards.crossroad.desc}</span>
              <span className={styles.previewGo}>{copy.previewGoText}</span>
            </button>
            <button type="button" className={styles.previewCard} onClick={onVoyage}>
              <span className={styles.previewPrice}>{priceLabel}</span>
              <span className={styles.previewIcon} aria-hidden="true">⛵</span>
              <span className={styles.previewName}>{copy.previewCards.voyage.name}</span>
              <span className={styles.previewDesc}>{copy.previewCards.voyage.desc}</span>
              <span className={styles.previewGo}>{copy.previewGoText}</span>
            </button>
          </div>
        </div>

        {report.error && (
          <p className={styles.reportFailed} role="alert">{report.error}</p>
        )}

        {/* 하단 sticky 액션바 — 주 CTA 는 엄지 호 안, 이탈 액션은 텍스트 버튼 */}
        <div className={styles.reportActions}>
          <button type="button" className={styles.resultCta} onClick={onNext}>
            {copy.bottomCtaButton}
          </button>
          <ReportActions
            targetRef={shellRef}
            coordinate={coordinate}
            question={question}
            reportId={report.reportId}
          />
          <button type="button" className={styles.resultCtaGhost} onClick={onRestart}>
            {copy.restartButton}
          </button>
        </div>
      </div>
    </div>
  );
}
