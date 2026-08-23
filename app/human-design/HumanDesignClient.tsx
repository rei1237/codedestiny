"use client";

// 휴먼 디자인 — 몰입형 **무료** 차트 화면 (2026-09 무료화).
//
// 🔴 이 화면은 결제를 걸지 않는다. 과금 지점은 프리미엄 리포트로 옮겼고 그 화면은 따로 있다.
//    여기에 useCoinGate·ensurePaidAccess 를 되살리지 말 것 — 무료 계약은
//    scripts/verify-human-design.mjs 가 강제한다.
//
// 🔴 서버로 requestId·idempotencyKey 를 보내지 않는다. 아카이브 upsert 필터가
//    (userId, idempotencyKey) 라서 클릭마다 새 키를 보내면 같은 출생 데이터에 문서가 계속
//    쌓인다. 서버는 키가 없으면 출생 데이터에서 유도한 결정적 키를 쓰므로 재열람이 성립한다.
//
// 🔴 전역 헤더·푸터를 쓰지 않는다. 이 화면은 하나의 독립된 리딩 경험이고, 이탈 수단은
//    상단바의 [홈으로] 하나다. 크롬 제거의 실제 스위치는 여기가 아니라
//    app/components/AppChrome.tsx 의 CHROMELESS_ROUTES 이므로 둘을 함께 본다.
//
// 🔴 결제 전 화면에도 바디그래프를 그린다 — 단, 데이터 없는 **고스트**다. 유료 화면이라
//    진입 시점에 보여 줄 실제 차트가 없고, 남의 샘플 차트를 채워 넣으면 결제 전 화면이
//    AdSense 렌더 텍스트 게이트 대상이 되면서 "남의 결과"를 내 결과처럼 보이게 한다.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
// 🔴 일시 503(Mongo 블립)을 실패로 굳히지 않는 공용 재시도·백오프 배관. 이름은 "paid" 지만
//    실제로는 인증 POST + 백오프라 무료 요청에도 그대로 맞다. 두 번째 재시도 계층을 새로
//    만들지 않는다(코딩 원칙 6).
import { postPaidBody } from "@/app/nakshatra/nakshatra-fetch";
import { CENTER_GATES } from "@/lib/human-design/centers";

import BodyGraph from "./_components/BodyGraph";
import DetailSheet from "./_components/DetailSheet";
import {
  AUTHORITY_COPY,
  CENTER_COPY,
  CROSS_ANGLE_COPY,
  DEFINITION_COPY,
  NOT_SELF_COPY,
  PLANET_COPY,
  SIGNATURE_COPY,
  STRATEGY_COPY,
  TYPE_COPY,
  UI_TEXT,
  pick,
  type Locale,
} from "./_copy";
import type { HdChart, HdInterpretation, HdPipelineStage, HdSelection } from "./_lib/types";
import styles from "./human-design.module.css";

/** 실제 계산 순서. 로딩 화면이 보여 주는 것은 이 순서이고, 진행률 숫자는 만들지 않는다. */
const PIPELINE_STEPS: Array<{ key: string; ko: string; en: string }> = [
  { key: "BIRTH_DATA", ko: "출생 정보", en: "Birth data" },
  { key: "TIMEZONE", ko: "타임존 · UTC 변환", en: "Timezone → UTC" },
  { key: "PERSONALITY", ko: "퍼스낼리티 13천체", en: "Personality bodies" },
  { key: "DESIGN_MOMENT", ko: "88° 태양호 역탐색", en: "88° solar arc search" },
  { key: "DESIGN", ko: "디자인 13천체", en: "Design bodies" },
  { key: "GATES", ko: "26 활성 → 64 게이트", en: "26 activations → 64 gates" },
  { key: "CHANNELS", ko: "36 채널 완성 판정", en: "36 channels" },
  { key: "CENTERS", ko: "9 센터 정의", en: "9 centers" },
];

const TIMEZONE_PRESETS = [
  "Asia/Seoul", "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata", "Asia/Kabul",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "America/New_York", "America/Chicago", "America/Los_Angeles", "America/Havana", "America/Sao_Paulo",
  "Australia/Sydney", "Pacific/Auckland", "Pacific/Honolulu", "Africa/Dakar", "UTC",
];

/**
 * 요구사항 6의 단계 순서. 첫 화면(마이 디자인)은 차트 자체이므로 이동 칩에서 뺀다.
 * 🔴 순서를 바꾸면 화면의 <section id> 순서도 같이 바꿔야 한다 — 칩은 위치를 만들지 않고
 *    이미 있는 앵커로 보내기만 한다.
 */
const SECTION_ORDER = [
  { id: "hd-type", label: "sectionType" },
  { id: "hd-strategy", label: "sectionStrategy" },
  { id: "hd-authority", label: "sectionAuthority" },
  { id: "hd-profile", label: "sectionProfile" },
  { id: "hd-centers", label: "sectionCenters" },
  { id: "hd-channels", label: "sectionChannels" },
  { id: "hd-gates", label: "sectionGates" },
  { id: "hd-planets", label: "sectionPlanets" },
  { id: "hd-reading", label: "sectionReading" },
] as const;

type CalendarValue = "solar" | "lunar" | "lunar-leap";

function normalizeTimeInput(value: string): string {
  const digits = value.replace(/[^\d]/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export default function HumanDesignClient({ locale = "ko" }: { locale?: Locale }) {
  const { seed } = useAiProfileSeed();

  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timezone, setTimezone] = useState("Asia/Seoul");
  const [calendar, setCalendar] = useState<CalendarValue>("solar");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chart, setChart] = useState<HdChart | null>(null);
  const [pipeline, setPipeline] = useState<HdPipelineStage[]>([]);
  const [reused, setReused] = useState(false);
  const [selection, setSelection] = useState<HdSelection>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // AI 해석 — 차트와 같은 1회 결제로 열린다(별도 결제 키 없음).
  const [interpretation, setInterpretation] = useState<HdInterpretation | null>(null);

  // 프로필 카드 자동 프리필 — 사용자가 이미 넣은 값은 덮지 않는다(빈 값만 채운다).
  useEffect(() => {
    if (!seed) return;
    setBirthDate((current) => current || seed.birthDate || "");
    setBirthTime((current) => current || seed.birthTime || "");
    setTimezone((current) => (current && current !== "Asia/Seoul" ? current : (seed.timezone || current || "Asia/Seoul")));
    setCalendar((current) => (current !== "solar" ? current : (seed.calendarType === "lunar" ? "lunar" : "solar")));
  }, [seed]);

  // 로딩 중 경과 시간은 **실제로 흐른 시간**이다. 가짜 퍼센트를 만들지 않는다.
  useEffect(() => {
    if (!loading) return undefined;
    const startedAt = Date.now();
    setElapsedMs(0);
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 200);
    return () => window.clearInterval(timer);
  }, [loading]);

  const canSubmit = useMemo(
    () => /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && /^\d{1,2}:\d{2}$/.test(birthTime) && timezone.trim().length > 0,
    [birthDate, birthTime, timezone],
  );

  const requestChart = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // 🔴 requestId·idempotencyKey 를 보내지 않는다. 서버가 출생 데이터에서 결정적 키를
      //    만들어 upsert 하므로 같은 차트를 여러 번 눌러도 아카이브 문서가 하나로 수렴한다.
      const result = await postPaidBody("/api/human-design/chart", {
        birth: { birthDate, birthTime, timezone: timezone.trim(), calendar },
      });
      const data = result.data as { ok?: boolean; chart?: HdChart; pipeline?: HdPipelineStage[]; reused?: boolean; message?: string };
      if (!result.response.ok || !data?.ok || !data.chart) {
        setError(data?.message || (locale === "ko"
          ? "차트를 만들지 못했습니다. 잠시 후 '다시 시도'를 눌러 주세요."
          : "Could not build the chart. Please retry in a moment."));
        return;
      }
      setChart(data.chart);
      setPipeline(Array.isArray(data.pipeline) ? data.pipeline : []);
      setReused(Boolean(data.reused));
      // 프리미엄 리포트 화면이 같은 차트를 다시 불러오는 데 쓴다. 🔴 결제 정보가 아니라
      //    입력값이므로 세션 저장소로 충분하다 — 결제 뒤에 지켜야 하는 reportId 는 리포트
      //    화면이 localStorage 에 따로 적는다.
      try {
        window.sessionStorage.setItem(
          "cd_hd_birth_v1",
          JSON.stringify({ birthDate, birthTime, timezone: timezone.trim(), calendar }),
        );
      } catch {
        /* 프라이빗 모드에서 막혀도 차트 자체는 이미 나왔다. */
      }
    } finally {
      setLoading(false);
    }
  }, [birthDate, birthTime, calendar, locale, timezone]);

  const run = useCallback(async () => {
    if (loading || !canSubmit) return;
    setError("");
    setSelection(null);
    await requestChart();
  }, [canSubmit, loading, requestChart]);

  const retry = useCallback(async () => {
    await requestChart();
  }, [requestChart]);

  // 🔴 옛 AI 해석의 **읽기 전용** 복원. 생성은 은퇴했고(서버가 410) 새 분석은 프리미엄
  //    리포트가 맡는다. 여기서 하는 일은 "예전에 결제해 저장된 해석이 있으면 되살리는 것"
  //    뿐이라 버튼이 없고 차트가 열릴 때 조용히 한 번만 시도한다. 410 은 오류가 아니다.
  useEffect(() => {
    if (!chart) return undefined;
    let cancelled = false;
    void (async () => {
      try {
        const result = await postPaidBody("/api/human-design/interpretation", {
          birth: { birthDate, birthTime, timezone: timezone.trim(), calendar },
        });
        if (cancelled) return;
        const data = result.data as { ok?: boolean; interpretation?: HdInterpretation };
        if (result.response.ok && data?.ok && data.interpretation) setInterpretation(data.interpretation);
      } catch {
        /* 옛 해석 복원 실패는 화면을 막지 않는다 — 차트는 이미 열려 있다. */
      }
    })();
    return () => { cancelled = true; };
  }, [birthDate, birthTime, calendar, chart, timezone]);

  /** 다른 출생 정보로 다시 — 무료라 되돌릴 결제 상태가 없다. 화면 상태만 초기화한다. */
  const restart = useCallback(() => {
    setChart(null);
    setInterpretation(null);
    setSelection(null);
    setPipeline([]);
    setReused(false);
    setError("");
  }, []);

  const typeCopy = chart ? TYPE_COPY[chart.type as keyof typeof TYPE_COPY] : null;
  const authorityCopy = chart ? AUTHORITY_COPY[chart.authority as keyof typeof AUTHORITY_COPY] : null;
  const activeGateSet = useMemo(() => new Set(chart ? chart.activeGates : []), [chart]);

  /** 센터별 활성/전체 게이트 수 — 센터 섹션이 차트와 같은 사실을 말하게 하는 근거. */
  const centerRows = useMemo(() => {
    if (!chart) return [];
    const defined = new Set(chart.definedCenters);
    return Object.entries(CENTER_GATES).map(([center, gates]) => ({
      center,
      defined: defined.has(center),
      active: gates.filter((gate) => activeGateSet.has(gate)).length,
      total: gates.length,
    }));
  }, [activeGateSet, chart]);

  const birthForm = (
    <div className={styles.formFields}>
      <label className={styles.label} htmlFor="hd-birth-date">{pick(UI_TEXT.birthDate, locale)}</label>
      <input id="hd-birth-date" className={styles.input} {...birthDateTextInputProps(birthDate, setBirthDate)} />

      <label className={styles.label} htmlFor="hd-birth-time">{pick(UI_TEXT.birthTime, locale)}</label>
      <input
        id="hd-birth-time"
        className={styles.input}
        type="text"
        inputMode="numeric"
        maxLength={5}
        placeholder="HH:MM"
        value={birthTime}
        onChange={(event) => setBirthTime(normalizeTimeInput(event.target.value))}
      />
      <p className={styles.help}>{pick(UI_TEXT.timeHelp, locale)}</p>

      <label className={styles.label} htmlFor="hd-timezone">{pick(UI_TEXT.timezone, locale)}</label>
      <input
        id="hd-timezone"
        className={styles.input}
        list="hd-timezone-options"
        value={timezone}
        onChange={(event) => setTimezone(event.target.value)}
        autoComplete="off"
      />
      <datalist id="hd-timezone-options">
        {TIMEZONE_PRESETS.map((zone) => <option key={zone} value={zone} />)}
      </datalist>
      <p className={styles.help}>{pick(UI_TEXT.timezoneHelp, locale)}</p>

      <span className={styles.label}>{pick(UI_TEXT.calendar, locale)}</span>
      <div className={styles.choiceRow}>
        {([
          ["solar", pick(UI_TEXT.solar, locale)],
          ["lunar", pick(UI_TEXT.lunar, locale)],
          ["lunar-leap", pick(UI_TEXT.lunarLeap, locale)],
        ] as Array<[CalendarValue, string]>).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`${styles.choice} ${calendar === value ? styles.choiceOn : ""}`}
            aria-pressed={calendar === value}
            onClick={() => setCalendar(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={styles.cta}
        onClick={() => void run()}
        disabled={!canSubmit || loading}
      >
        {loading ? pick(UI_TEXT.submitting, locale) : pick(UI_TEXT.submit, locale)}
      </button>
      <p className={styles.price}>
        {pick(UI_TEXT.freeNote, locale)}
      </p>
    </div>
  );

  return (
    <main className={styles.shell}>
      {/* 깊이감 — 클릭을 받지 않는 순수 장식 레이어. */}
      <div className={styles.aurora} aria-hidden="true" />

      <div className={styles.topbar}>
        <Link href="/" className={styles.exit}>
          <span aria-hidden="true">←</span> {pick(UI_TEXT.exit, locale)}
        </Link>
        {chart && (
          <button type="button" className={styles.restart} onClick={restart}>
            {pick(UI_TEXT.restart, locale)}
          </button>
        )}
      </div>

      <div className={styles.inner}>
        {!chart && !loading && (
          <section className={styles.hero} aria-labelledby="hd-hero-heading">
            <div className={styles.heroGraph}>
              <BodyGraph chart={null} locale={locale} selection={null} onSelect={() => {}} />
              <p className={styles.heroGhostNote}>{pick(UI_TEXT.ghostCaption, locale)}</p>
            </div>

            <div className={styles.heroPanel}>
              <p className={styles.eyebrow}>HUMAN DESIGN</p>
              <h1 id="hd-hero-heading" className={styles.title}>{pick(UI_TEXT.tagline, locale)}</h1>
              <p className={styles.lede}>{pick(UI_TEXT.subtitle, locale)}</p>
              {birthForm}
            </div>
          </section>
        )}

        {loading && (
          <section className={styles.pipeline} aria-live="polite">
            <h2 className={styles.pipelineHeading}>{locale === "ko" ? "계산 중" : "Calculating"}</h2>
            <ol className={styles.pipelineList}>
              {PIPELINE_STEPS.map((step) => (
                <li className={styles.pipelineStep} key={step.key}>
                  {locale === "ko" ? step.ko : step.en}
                </li>
              ))}
            </ol>
            {/* 🔴 진행률을 지어내지 않는다. 여기 보이는 것은 실제로 흐른 시간뿐이다. */}
            <p className={styles.pipelineElapsed}>{(elapsedMs / 1000).toFixed(1)}s</p>
          </section>
        )}

        {error && (
          <div className={styles.error} role="alert">
            <p>{error}</p>
            <button type="button" className={styles.retry} onClick={() => void retry()} disabled={loading}>
              {locale === "ko" ? "다시 시도" : "Retry"}
            </button>
          </div>
        )}

        {chart && (
          <>
            {reused && <p className={styles.reused}>{pick(UI_TEXT.reusedNotice, locale)}</p>}

            {/* 🔴 차트는 섹션 안이 아니라 **바깥 열**에 둔다. 넓은 화면에서 sticky 로 붙여 두면
                아래 단계들을 읽는 내내 차트가 화면에 남아, 목록에서 누른 것이 차트 어디인지
                바로 보인다. 섹션 안에 넣으면 그 섹션을 지나는 순간 차트가 사라진다. */}
            <div className={styles.result}>
              <div className={styles.resultGraph}>
                <BodyGraph chart={chart} locale={locale} selection={selection} onSelect={setSelection} />
              </div>

              <div className={styles.resultFlow}>
              {/* ① 마이 디자인 — 진입 즉시 정체 핵심만. 설명은 아래 단계로 미룬다. */}
              <section className={styles.core} id="hd-my-design" aria-labelledby="hd-core-heading">
                <p className={styles.eyebrow}>{pick(UI_TEXT.sectionMyDesign, locale)}</p>
                <h1 id="hd-core-heading" className={styles.coreType}>{pick(typeCopy?.name, locale)}</h1>
                <dl className={styles.coreGrid}>
                  <div className={styles.coreCell}>
                    <dt className={styles.coreLabel}>{pick(UI_TEXT.sectionStrategy, locale)}</dt>
                    <dd className={styles.coreValue}>
                      {pick(STRATEGY_COPY[chart.strategy as keyof typeof STRATEGY_COPY], locale)}
                    </dd>
                  </div>
                  <div className={styles.coreCell}>
                    <dt className={styles.coreLabel}>{pick(UI_TEXT.sectionAuthority, locale)}</dt>
                    <dd className={styles.coreValue}>{pick(authorityCopy?.name, locale)}</dd>
                  </div>
                  <div className={styles.coreCell}>
                    <dt className={styles.coreLabel}>{pick(UI_TEXT.sectionProfile, locale)}</dt>
                    <dd className={`${styles.coreValue} ${styles.coreNumeral}`}>{chart.profile}</dd>
                  </div>
                  <div className={styles.coreCell}>
                    <dt className={styles.coreLabel}>{pick(UI_TEXT.definition, locale)}</dt>
                    <dd className={styles.coreValue}>
                      {pick(DEFINITION_COPY[chart.definition as keyof typeof DEFINITION_COPY], locale)}
                    </dd>
                  </div>
                </dl>

                <ul className={styles.tally}>
                  <li><strong>{chart.definedCenters.length}</strong><span>/9 {pick(UI_TEXT.definedCenters, locale)}</span></li>
                  <li><strong>{chart.channels.length}</strong><span>/36 {pick(UI_TEXT.activeChannels, locale)}</span></li>
                  <li><strong>{chart.activeGates.length}</strong><span>/64 {pick(UI_TEXT.activeGates, locale)}</span></li>
                </ul>

                <div className={styles.legend}>
                  <span className={styles.legendItem}>
                    <i className={`${styles.swatch} ${styles.swatchPersonality}`} aria-hidden="true" />
                    {pick(UI_TEXT.personality, locale)}
                  </span>
                  <span className={styles.legendItem}>
                    <i className={`${styles.swatch} ${styles.swatchDesign}`} aria-hidden="true" />
                    {pick(UI_TEXT.design, locale)}
                  </span>
                  <span className={styles.legendItem}>
                    <i className={`${styles.swatch} ${styles.swatchMixed}`} aria-hidden="true" />
                    {locale === "ko" ? "두 계층이 함께" : "Both layers"}
                  </span>
                </div>
              </section>

            <nav className={styles.jump} aria-label={pick(UI_TEXT.sectionNav, locale)}>
              {SECTION_ORDER.filter((section) => section.id !== "hd-reading" || interpretation).map((section) => (
                <a key={section.id} className={styles.jumpChip} href={`#${section.id}`}>
                  {pick(UI_TEXT[section.label], locale)}
                </a>
              ))}
            </nav>

            {/* ② 타입 */}
            <section className={styles.block} id="hd-type">
              <h2 className={styles.blockHeading}>{pick(UI_TEXT.sectionType, locale)}</h2>
              <p className={styles.blockLead}>{pick(typeCopy?.name, locale)}</p>
              <p className={styles.blockBody}>{pick(typeCopy?.summary, locale)}</p>
              <dl className={styles.pairs}>
                <div>
                  <dt>{pick(UI_TEXT.signature, locale)}</dt>
                  <dd>{pick(SIGNATURE_COPY[chart.signature as keyof typeof SIGNATURE_COPY], locale)}</dd>
                </div>
                <div>
                  <dt>{pick(UI_TEXT.notSelf, locale)}</dt>
                  <dd>{pick(NOT_SELF_COPY[chart.notSelfTheme as keyof typeof NOT_SELF_COPY], locale)}</dd>
                </div>
              </dl>
            </section>

            {/* ③ 전략 */}
            <section className={styles.block} id="hd-strategy">
              <h2 className={styles.blockHeading}>{pick(UI_TEXT.sectionStrategy, locale)}</h2>
              <p className={styles.blockLead}>
                {pick(STRATEGY_COPY[chart.strategy as keyof typeof STRATEGY_COPY], locale)}
              </p>
              <p className={styles.blockBody}>{pick(typeCopy?.summary, locale)}</p>
            </section>

            {/* ④ 내적 권위 */}
            <section className={styles.block} id="hd-authority">
              <h2 className={styles.blockHeading}>{pick(UI_TEXT.sectionAuthority, locale)}</h2>
              <p className={styles.blockLead}>{pick(authorityCopy?.name, locale)}</p>
              <p className={styles.blockBody}>{pick(authorityCopy?.summary, locale)}</p>
            </section>

            {/* ⑤ 프로파일 */}
            <section className={styles.block} id="hd-profile">
              <h2 className={styles.blockHeading}>{pick(UI_TEXT.sectionProfile, locale)}</h2>
              <p className={`${styles.blockLead} ${styles.coreNumeral}`}>{chart.profile}</p>
              <p className={styles.blockBody}>
                {pick(UI_TEXT.profileLines, locale)} — {chart.profileLines.personality} / {chart.profileLines.design}
              </p>
              <dl className={styles.pairs}>
                <div>
                  <dt>{pick(UI_TEXT.incarnationCross, locale)}</dt>
                  <dd>
                    {pick(CROSS_ANGLE_COPY[chart.incarnationCross.angle as keyof typeof CROSS_ANGLE_COPY], locale)}
                    <span className={styles.pairNote}>{chart.incarnationCross.notation}</span>
                  </dd>
                </div>
              </dl>
            </section>

            {/* ⑥ 센터 — 누르면 차트에서 같은 센터가 선택된다. */}
            <section className={styles.block} id="hd-centers">
              <h2 className={styles.blockHeading}>{pick(UI_TEXT.sectionCenters, locale)}</h2>
              <p className={styles.blockBody}>{pick(UI_TEXT.centersDefinedHint, locale)}</p>
              <ul className={styles.rowList}>
                {centerRows.map((row) => (
                  <li key={row.center}>
                    <button
                      type="button"
                      className={styles.row}
                      data-active={selection?.kind === "center" && selection.center === row.center ? "true" : undefined}
                      onClick={() => setSelection({ kind: "center", center: row.center })}
                    >
                      <span className={`${styles.rowDot} ${row.defined ? styles.rowDotOn : ""}`} aria-hidden="true" />
                      <span className={styles.rowName}>
                        {pick(CENTER_COPY[row.center as keyof typeof CENTER_COPY]?.name, locale)}
                      </span>
                      <span className={styles.rowState}>
                        {row.defined ? pick(UI_TEXT.defined, locale) : pick(UI_TEXT.undefined, locale)}
                      </span>
                      <span className={styles.rowCount}>{row.active}/{row.total}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* ⑦ 채널 */}
            <section className={styles.block} id="hd-channels">
              <h2 className={styles.blockHeading}>{pick(UI_TEXT.sectionChannels, locale)}</h2>
              <p className={styles.blockBody}>{pick(UI_TEXT.channelsHint, locale)}</p>
              {chart.channels.length === 0 ? (
                <p className={styles.blockEmpty}>{pick(UI_TEXT.noneYet, locale)}</p>
              ) : (
                <ul className={styles.rowList}>
                  {chart.channels.map((channel) => (
                    <li key={channel.channelId}>
                      <button
                        type="button"
                        className={styles.row}
                        data-active={selection?.kind === "channel" && selection.channelId === channel.channelId ? "true" : undefined}
                        onClick={() => setSelection({ kind: "channel", channelId: channel.channelId })}
                      >
                        <span className={`${styles.rowDot} ${styles.rowDotOn}`} aria-hidden="true" />
                        <span className={`${styles.rowName} ${styles.coreNumeral}`}>{channel.channelId}</span>
                        <span className={styles.rowState}>
                          {pick(CENTER_COPY[channel.centerA as keyof typeof CENTER_COPY]?.name, locale)}
                          {" ↔ "}
                          {pick(CENTER_COPY[channel.centerB as keyof typeof CENTER_COPY]?.name, locale)}
                        </span>
                        <span className={styles.rowCount}>
                          {channel.composition === "MIXED"
                            ? "P+D"
                            : (channel.composition === "PERSONALITY_ONLY" ? "P" : "D")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ⑧ 게이트 */}
            <section className={styles.block} id="hd-gates">
              <h2 className={styles.blockHeading}>{pick(UI_TEXT.sectionGates, locale)}</h2>
              <p className={styles.blockBody}>{pick(UI_TEXT.gatesHint, locale)}</p>
              <div className={styles.gateGrid}>
                {[...chart.activeGates].sort((a, b) => a - b).map((gate) => (
                  <button
                    key={gate}
                    type="button"
                    className={styles.gateChip}
                    data-active={selection?.kind === "gate" && selection.gate === gate ? "true" : undefined}
                    onClick={() => setSelection({ kind: "gate", gate })}
                  >
                    {gate}
                  </button>
                ))}
              </div>
            </section>

            {/* ⑨ 행성 활성 */}
            <section className={styles.block} id="hd-planets">
              <h2 className={styles.blockHeading}>{pick(UI_TEXT.sectionPlanets, locale)}</h2>
              <div className={styles.tables}>
                {(["personality", "design"] as const).map((layer) => (
                  <div className={styles.table} key={layer}>
                    <h3 className={styles.tableHeading}>
                      <i className={`${styles.swatch} ${layer === "personality" ? styles.swatchPersonality : styles.swatchDesign}`} aria-hidden="true" />
                      {layer === "personality" ? pick(UI_TEXT.personality, locale) : pick(UI_TEXT.design, locale)}
                    </h3>
                    <ul className={styles.activationList}>
                      {chart.layers[layer].map((activation) => (
                        <li key={`${layer}-${activation.planet}`}>
                          <button
                            type="button"
                            className={styles.activationRow}
                            data-active={selection?.kind === "planet" && selection.planet === activation.planet && selection.layer === layer ? "true" : undefined}
                            onClick={() => setSelection({ kind: "planet", planet: activation.planet, layer })}
                          >
                            <span className={styles.activationGlyph} aria-hidden="true">
                              {PLANET_COPY[activation.planet as keyof typeof PLANET_COPY]?.glyph || "•"}
                            </span>
                            <span className={styles.activationName}>
                              {locale === "ko"
                                ? PLANET_COPY[activation.planet as keyof typeof PLANET_COPY]?.ko
                                : PLANET_COPY[activation.planet as keyof typeof PLANET_COPY]?.en}
                            </span>
                            <span className={styles.activationCell}>{activation.gate}.{activation.line}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* ⑩ 더 깊은 해석 — 예전에 구매한 해석이 있을 때만 보인다(생성은 은퇴). */}
            {interpretation && (
            <section className={styles.block} id="hd-reading" aria-labelledby="hd-reading-heading">
              <h2 id="hd-reading-heading" className={styles.blockHeading}>
                {pick(UI_TEXT.sectionReading, locale)}
              </h2>
              <p className={styles.blockBody}>{pick(UI_TEXT.legacyReadingNote, locale)}</p>

              {(
                <div className={styles.readingBody}>
                  {interpretation.summary && (
                    <div className={styles.readingSummary}>
                      <span className={styles.coreLabel}>{pick(UI_TEXT.interpretationSummary, locale)}</span>
                      <p>{interpretation.summary}</p>
                    </div>
                  )}
                  {interpretation.sections.map((section) => (
                    <article className={styles.readingSection} key={section.key}>
                      <h3 className={styles.readingSectionTitle}>{section.title}</h3>
                      {section.body.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
                        <p className={styles.readingParagraph} key={`${section.key}-${index}`}>{paragraph}</p>
                      ))}
                    </article>
                  ))}
                </div>
              )}
            </section>
            )}

            {/* 프리미엄 리포트 진입 — 차트는 계속 무료이고, 과금 지점은 이 링크 너머 하나뿐이다.
                🔴 여기서 결제를 열지 않는다. 결제창은 리포트 화면의 잠금 패널 하나가 소유한다
                   (게이트가 두 곳이 되면 어느 쪽이 진실인지 알 수 없어진다). */}
            <section className={styles.reportCta} id="hd-report">
              <p className={styles.reportCtaTitle}>{pick(UI_TEXT.reportCtaTitle, locale)}</p>
              <p className={styles.reportCtaBody}>{pick(UI_TEXT.reportCtaBody, locale)}</p>
              <Link className={styles.reportCtaButton} href="/human-design/report">
                {pick(UI_TEXT.reportCtaButton, locale)}
              </Link>
            </section>

            <section className={styles.meta}>
              <p>{pick(UI_TEXT.birthMoment, locale)}: {chart.moments?.birthUtc || "—"}</p>
              <p>{pick(UI_TEXT.designMoment, locale)}: {chart.moments?.designUtc || "—"}</p>
              <p className={styles.metaNote}>{pick(UI_TEXT.solarArcNote, locale)}</p>
              {pipeline.length > 0 && (
                <p className={styles.metaNote}>
                  {pipeline.map((stage) => `${stage.stage} ${stage.ms}ms`).join(" · ")}
                </p>
              )}
              <p className={styles.metaVersion}>
                {chart.calculationVersion} · {chart.ephemerisVersion} · {chart.mappingVersion}
              </p>
            </section>
              </div>
            </div>
          </>
        )}
      </div>

      {chart && selection && (
        <DetailSheet chart={chart} locale={locale} selection={selection} onClose={() => setSelection(null)} />
      )}
    </main>
  );
}
