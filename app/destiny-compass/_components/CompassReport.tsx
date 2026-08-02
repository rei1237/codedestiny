"use client";
/**
 * 운명의 지도 결과 — ①~⑨ 프리미엄 리포트(다크 코스믹).
 *
 * 무료: ① 좌표 ② 흐름 ⑧ 종합 조언(단문) ⑨ 나침반 + 레이더·행운
 * 유료(destiny-compass-deep-report, 회당 10,000원): ③ 원인(체계별) ④ 변화 ⑤ 기회 ⑥ 피할 선택 ⑦ 행동
 *
 * 도착 즉시 렌더 — 웨이브 A(체계별 5섹션)가 먼저 도착해 ③이 채워지고, 그 뒤 B가 ④~⑦·⑧장문을 채운다.
 * 섹션 하나가 실패해도 리포트 전체를 막지 않는다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import AiResultProse from "@/components/fortune/AiResultProse";
import { ReportActions } from "./ReportActions";
import { CompassHero, ConfidenceMeta, coordinateLine } from "./CompassHero";
import { DestinyRadar } from "./DestinyRadar";
import { PigFace } from "./PigFace";
import { Starfield } from "./Starfield";
import { EvidenceList } from "./EvidenceCard";
import { ReportSection, type SectionState } from "./ReportSection";
import { getReportSection, type ReportSectionId, type ServerSectionKey } from "./reportSections";
import { DIRECTION_TO_REGION, regionByKey } from "./mapRegions";
import { useFxTier } from "../_hooks/useFxTier";
import { useCompassReport } from "../_hooks/useCompassReport";
import styles from "./map.module.css";
import type { CompassInput, DirectionField, DirectionKey, SystemKey } from "../_engine/types";
import { DIRECTION_LABEL_KO } from "../_engine/constants";
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
}

/**
 * 🔴 점성술은 여기 없다. 어댑터가 없어 계산에 참여하지 않는데 "곧 합류"로 노출하면
 *    있지도 않은 근거를 약속하는 셈이다. 베다는 실제 산출 범위(요일 지배성)까지 이름에 적는다.
 */
const SYSTEM_LABEL: Record<SystemKey, string> = {
  saju: "사주",
  ziwei: "자미두수",
  sukuyo: "숙요",
  tarot: "타로",
  vedic: "베다 · 요일 지배성",
};
const SYSTEM_ORDER: SystemKey[] = ["saju", "ziwei", "sukuyo", "tarot", "vedic"];

/** ③에서 체계별 LLM 섹션을 찾는 매핑. */
const SYSTEM_SECTION_KEY: Partial<Record<SystemKey, ServerSectionKey>> = {
  saju: "saju_reading",
  ziwei: "ziwei_reading",
  sukuyo: "sukuyo_reading",
  tarot: "tarot_vara_reading",
};

const TIMELINE_LABEL: Record<string, string> = { d30: "30일", d90: "90일", y1: "1년", y3: "3년" };
const WEATHER_LABEL: Record<string, string> = { clear: "맑음", breeze: "순풍", fog: "안개", storm: "폭풍" };
const TREND_ICON = { up: "↑", down: "↓", flat: "→" } as const;

const short = (k: DirectionKey) => DIRECTION_LABEL_KO[k].split("·")[0];
function trendOf(score: number): keyof typeof TREND_ICON {
  return score >= 66 ? "up" : score <= 40 ? "down" : "flat";
}

export function CompassReport({
  input, field, situation, onNext, onRestart, onCrossroad, onFutureSim, onVoyage,
}: CompassReportProps) {
  const fxTier = useFxTier();
  const question = situation || "";
  const report = useCompassReport(input, field, question);
  const causeTitleRef = useRef<HTMLHeadingElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const unlockedRef = useRef(false);
  const coordinate = coordinateLine(field.primary.band, field.primary.key);

  const dest = regionByKey(DIRECTION_TO_REGION[field.primary.key]);
  const activeSystems = useMemo(() => new Set<SystemKey>(field.sources), [field.sources]);
  const priceLabel = formatKrwFromCoins(100);

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
  const baseText = useMemo(() => pigCommentary(field), [field]);
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
      body: JSON.stringify({ narration: buildNarrationInput(field, question), baseText }),
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
  }, [field, question, baseText]);

  /** 유료 섹션의 현재 상태. 결제 전=locked, 생성 중=pending, 도착=arrived, 실패=failed. */
  const paidState = (id: ReportSectionId): SectionState => {
    const spec = getReportSection(id);
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
    unlockLabel: `${priceLabel} · 심층 리포트 열기`,
    unlockBusy: report.isPaying || report.phase === "paying" || report.phase === "waveA",
  };

  return (
    <div className={`${styles.resultStage} ${styles.nightStage}`} data-fx={fxTier}>
      <Starfield />

      <div className={styles.reportShell} ref={shellRef}>
        {/* ① 오늘의 운명 좌표 — 거대한 나침반이 먼저, 그 아래 좌표 한 문장이 이 화면의 h1 이다. */}
        <ReportSection
          spec={getReportSection("coordinate")}
          state="arrived"
          headingLevel={1}
          eyebrow="당신은 지금"
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
          <div className={styles.sysHint} aria-label="종합에 참여한 운세 체계">
            {SYSTEM_ORDER.map((sys) => (
              <span key={sys} className={`${styles.sysChip} ${activeSystems.has(sys) ? styles.sysChipOn : ""}`}>
                {SYSTEM_LABEL[sys]}
              </span>
            ))}
          </div>
        </ReportSection>

        {/* ② 현재의 흐름 */}
        <ReportSection spec={getReportSection("flow")} state="arrived">
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
          <p className={styles.reportProse}>
            지금 가장 크게 열린 쪽은 <b>{short(field.strongArea.key)}</b>, 잠시 쉬어갈 쪽은{" "}
            <b>{short(field.blockedArea.key)}</b>예요.
          </p>
        </ReportSection>

        {/* ③ 운명의 원인 — 체계별 독립 해석 */}
        <ReportSection
          spec={getReportSection("cause")}
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
                        aria-label={`${SYSTEM_LABEL[sys]} 근거 강도 5점 만점에 ${stars}점`}
                      >
                        <span aria-hidden="true">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
                      </span>
                    )}
                    {term && <span className={styles.sysCardTerm}>{term}</span>}
                  </div>
                  {contribs.length > 0 && (
                    <p className={styles.evidenceText}>
                      기여 방향 {contribs.map((k) => short(k)).join(" · ")}
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
                      {sys === "vedic"
                        ? "판차앙가 5요소 중 바라(요일 지배성)만 계산합니다. 타로와 함께 '오늘의 결'로 읽습니다."
                        : "해석을 불러오는 중이에요."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </ReportSection>

        {/* ④ 앞으로 다가오는 변화 */}
        <ReportSection spec={getReportSection("change")} state={paidState("change")} {...unlockProps}>
          <div className={styles.timelineStack}>
            {(["d30", "d90", "y1", "y3"] as const).map((k) => {
              const phase = field.timeline[k];
              if (!phase) return null;
              return (
                <div key={k} className={styles.timelineCard}>
                  <span className={styles.timelinePeriod}>{TIMELINE_LABEL[k]}</span>
                  <span className={styles.timelineWeather}>{WEATHER_LABEL[phase.weather] || phase.weather}</span>
                  <span className={styles.timelineMomentum}>기세 {phase.momentum}</span>
                </div>
              );
            })}
          </div>
          <AiResultProse value={sectionBody("timeline_reading")?.body} />
          <EvidenceList grounds={sectionBody("timeline_reading")?.grounds || []} />
        </ReportSection>

        {/* ⑤ 반드시 잡아야 하는 기회 */}
        <ReportSection spec={getReportSection("opportunity")} state={paidState("opportunity")} {...unlockProps}>
          <AiResultProse value={sectionBody("opportunity_reading")?.body} />
          <EvidenceList grounds={sectionBody("opportunity_reading")?.grounds || []} />
        </ReportSection>

        {/* ⑥ 피해야 하는 선택 */}
        <ReportSection spec={getReportSection("avoid")} state={paidState("avoid")} {...unlockProps}>
          <AiResultProse value={sectionBody("blocked_and_care")?.body} />
          <EvidenceList grounds={sectionBody("blocked_and_care")?.grounds || []} />
        </ReportSection>

        {/* ⑦ 행동 가이드 */}
        <ReportSection spec={getReportSection("action")} state={paidState("action")} {...unlockProps}>
          <AiResultProse value={sectionBody("action_plan")?.body} />
          <EvidenceList grounds={sectionBody("action_plan")?.grounds || []} />
        </ReportSection>

        {/* ⑧ 종합 조언 — 무료는 단문(꽃돼지), 결제하면 다섯 체계 교차 검증 장문 */}
        <ReportSection spec={getReportSection("advice")} state="arrived">
          <div className={styles.resultSpeak}>
            <PigFace expression={pigExpression(field.primary.band, "hopeful")} height={78} className={styles.speakPigDark} />
            <div className={styles.resultBubble}>
              <div className={styles.resultWho}>꽃돼지</div>
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
              <p>종합 해석을 아직 불러오지 못했어요.</p>
              <button type="button" className={styles.resultCtaGhost} onClick={report.retryWaveB}>
                이어서 받기
              </button>
            </div>
          )}
        </ReportSection>

        {/* ⑨ 운명의 나침반 — 지금 / 가야 할 방향 */}
        <ReportSection spec={getReportSection("compass")} state="arrived">
          <p className={styles.reportProse}>
            지금 여기는 <b>{short(field.blockedArea.key)}</b>의 안개 곁, 가야 할 곳은{" "}
            <b>{dest?.label ?? short(field.primary.key)}</b>예요.
          </p>
          <div className={styles.radarBlock}>
            <div className={styles.radarSweepWrap}>
              <DestinyRadar directions={field.directions} />
              <span className={styles.radarSweep} aria-hidden="true" />
            </div>
            <div className={styles.luckyGrid} aria-label="오늘의 행운">
              <span className={styles.luckyPill}>행운의 장소 <b>{field.lucky.luckyPlaceKey}</b></span>
              <span className={styles.luckyPill}>행운의 시간 <b>{field.lucky.luckyTimeKey}</b></span>
              <span className={styles.luckyPill}>행운의 색 <b>{field.lucky.luckyColorKey}</b></span>
              <span className={styles.luckyPill}>행운의 사람 <b>{field.lucky.luckyPersonKey}</b></span>
            </div>
          </div>
        </ReportSection>

        {/* 심화 3종(별도 상품) — 기존 자리 그대로 */}
        <div className={styles.flowSection}>
          <span className={styles.flowLabel}>더 깊이 보기 · 회당 결제</span>
          <div className={styles.previewGrid}>
            <button type="button" className={styles.previewCard} onClick={onFutureSim}>
              <span className={styles.previewPrice}>{priceLabel}</span>
              <span className={styles.previewIcon} aria-hidden="true">🧭</span>
              <span className={styles.previewName}>미래 시뮬레이션</span>
              <span className={styles.previewDesc}>지도 위 30일·90일·1년, 시점을 눌러 이야기 보기</span>
              <span className={styles.previewGo}>열어보기 →</span>
            </button>
            <button type="button" className={styles.previewCard} onClick={onCrossroad}>
              <span className={styles.previewPrice}>{priceLabel}</span>
              <span className={styles.previewIcon} aria-hidden="true">⚖️</span>
              <span className={styles.previewName}>운명의 갈림길</span>
              <span className={styles.previewDesc}>두 선택의 기운을 나란히 견주기</span>
              <span className={styles.previewGo}>열어보기 →</span>
            </button>
            <button type="button" className={styles.previewCard} onClick={onVoyage}>
              <span className={styles.previewPrice}>{priceLabel}</span>
              <span className={styles.previewIcon} aria-hidden="true">⛵</span>
              <span className={styles.previewName}>삶의 항로</span>
              <span className={styles.previewDesc}>날씨로 읽는 앞으로의 항해 지도</span>
              <span className={styles.previewGo}>열어보기 →</span>
            </button>
          </div>
        </div>

        {report.error && (
          <p className={styles.reportFailed} role="alert">{report.error}</p>
        )}

        {/* 하단 sticky 액션바 — 주 CTA 는 엄지 호 안, 이탈 액션은 텍스트 버튼 */}
        <div className={styles.reportActions}>
          <button type="button" className={styles.resultCta} onClick={onNext}>
            오늘의 한 걸음 →
          </button>
          <ReportActions
            targetRef={shellRef}
            coordinate={coordinate}
            question={question}
            reportId={report.reportId}
          />
          <button type="button" className={styles.resultCtaGhost} onClick={onRestart}>
            지도로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
