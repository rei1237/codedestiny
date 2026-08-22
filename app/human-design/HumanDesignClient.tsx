"use client";

// 휴먼 디자인 — 몰입형 유료 화면(회당 결제 ₩10,000).
//
// 🔴 결제는 공용 게이트(useCoinGate.ensurePaidAccess, pass-first)에만 맡긴다. 이용권 선검사 →
//    미커버 시 [이용권으로 구매]·단건결제·월정석 3옵션 노출은 그쪽이 서버 결정으로 수행하므로
//    여기서 paymentMode 를 지정하거나 pass 를 재판정하지 않는다. forceDeduct 도 주지 않는다
//    (회당 결제라 영구 해금이 아니다).
//
// 🔴 requestId 는 sessionStorage 에 남긴다. useRef 에만 두면 결제 후 새로고침이 곧 이중 결제다 —
//    서버는 이 값으로 차감·결제 기록을 되찾아 결제가 실제로 일어났는지 확인한다.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useCoinGate } from "@/app/hooks/useCoinGate";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
// 🔴 결제 뒤 본문 요청의 재시도·백오프 배관. 회당 결제에서 일시 503 을 실패로 굳히면
//    돈만 나가고 결과가 없다. 이미 있는 공용 배관을 새로 만들지 않고 그대로 쓴다.
import { postPaidBody } from "@/app/nakshatra/nakshatra-fetch";

import BodyGraph from "./_components/BodyGraph";
import DetailSheet from "./_components/DetailSheet";
import {
  AUTHORITY_COPY,
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
import type { HdChart, HdPipelineStage, HdSelection } from "./_lib/types";
import styles from "./human-design.module.css";

const FEATURE_KEY = "human-design-chart";
const COIN_PRICE = 100;
const AMOUNT_KRW = 10000;
const REQUEST_ID_STORAGE_KEY = "cd_human_design_request_id_v1";

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

type CalendarValue = "solar" | "lunar" | "lunar-leap";

function readStoredRequestId(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(REQUEST_ID_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function writeStoredRequestId(value: string) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.sessionStorage.setItem(REQUEST_ID_STORAGE_KEY, value);
    else window.sessionStorage.removeItem(REQUEST_ID_STORAGE_KEY);
  } catch {
    /* 저장소가 막힌 브라우저에서도 흐름은 계속된다 */
  }
}

function normalizeTimeInput(value: string): string {
  const digits = value.replace(/[^\d]/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export default function HumanDesignClient({ locale = "ko" }: { locale?: Locale }) {
  const { ensurePaidAccess, isPaying } = useCoinGate();
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

  const requestChart = useCallback(async (requestId: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await postPaidBody("/api/human-design/chart", {
        birth: { birthDate, birthTime, timezone: timezone.trim(), calendar },
        requestId,
        idempotencyKey: requestId,
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
      // 결과를 받았으면 결제 재사용 키를 비운다 — 다음 요청은 새 결제다.
      writeStoredRequestId("");
    } finally {
      setLoading(false);
    }
  }, [birthDate, birthTime, calendar, locale, timezone]);

  const run = useCallback(async () => {
    if (loading || isPaying || !canSubmit) return;
    setError("");
    setSelection(null);

    // 새로고침을 견디는 결제 키. 이미 결제한 뒤 결과만 못 받은 상태면 그 키를 재사용한다.
    const stored = readStoredRequestId();
    if (stored) {
      await requestChart(stored);
      return;
    }

    const requestId = `${FEATURE_KEY}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    writeStoredRequestId(requestId);

    const gate = await ensurePaidAccess({
      featureKey: FEATURE_KEY,
      coinPrice: COIN_PRICE,
      cost: COIN_PRICE,
      amountKRW: AMOUNT_KRW,
      reason: locale === "ko" ? "휴먼 디자인 바디그래프" : "Human Design BodyGraph",
      requestId,
    });
    if (!gate.ok) {
      writeStoredRequestId("");
      if (gate.code === "AUTH_REQUIRED" || gate.code === "LOGIN_REQUIRED") {
        setError(locale === "ko" ? "로그인이 필요합니다." : "Please sign in.");
        return;
      }
      if (gate.code !== "PAYMENT_CANCELLED") {
        setError(gate.message || (locale === "ko" ? "결제를 완료하지 못했습니다." : "Payment did not complete."));
      }
      return;
    }

    // 🔴 결제가 끝났다. 여기서부터 실패해도 재결제를 요구하지 않는다 — 저장된 requestId 로
    //    '다시 시도'가 같은 결제를 재사용한다.
    await requestChart(requestId);
  }, [canSubmit, ensurePaidAccess, isPaying, loading, locale, requestChart]);

  const retry = useCallback(async () => {
    const stored = readStoredRequestId();
    if (!stored) {
      await run();
      return;
    }
    await requestChart(stored);
  }, [requestChart, run]);

  const typeCopy = chart ? TYPE_COPY[chart.type as keyof typeof TYPE_COPY] : null;
  const authorityCopy = chart ? AUTHORITY_COPY[chart.authority as keyof typeof AUTHORITY_COPY] : null;

  const summaryCards = chart ? [
    { key: "TYPE", label: "TYPE", value: pick(typeCopy?.name, locale) },
    { key: "STRATEGY", label: "STRATEGY", value: pick(STRATEGY_COPY[chart.strategy as keyof typeof STRATEGY_COPY], locale) },
    { key: "AUTHORITY", label: "AUTHORITY", value: pick(authorityCopy?.name, locale) },
    { key: "PROFILE", label: "PROFILE", value: chart.profile },
    { key: "DEFINITION", label: "DEFINITION", value: pick(DEFINITION_COPY[chart.definition as keyof typeof DEFINITION_COPY], locale) },
    { key: "SIGNATURE", label: "SIGNATURE", value: pick(SIGNATURE_COPY[chart.signature as keyof typeof SIGNATURE_COPY], locale) },
    { key: "NOT_SELF", label: "NOT-SELF THEME", value: pick(NOT_SELF_COPY[chart.notSelfTheme as keyof typeof NOT_SELF_COPY], locale) },
  ] : [];

  return (
    <main className={styles.shell}>
      <div className={styles.inner}>
        <Link href="/" className={styles.back}>{locale === "ko" ? "← 홈으로" : "← Home"}</Link>

        <header className={styles.head}>
          <p className={styles.eyebrow}>HUMAN DESIGN</p>
          <h1 className={styles.title}>{pick(UI_TEXT.tagline, locale)}</h1>
          <p className={styles.lede}>{pick(UI_TEXT.subtitle, locale)}</p>
        </header>

        {!chart && (
          <section className={styles.formCard} aria-labelledby="hd-form-heading">
            <h2 id="hd-form-heading" className={styles.formHeading}>{pick(UI_TEXT.formHeading, locale)}</h2>

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
              disabled={!canSubmit || loading || isPaying}
            >
              {loading || isPaying ? pick(UI_TEXT.submitting, locale) : pick(UI_TEXT.submit, locale)}
            </button>
            <p className={styles.price}>
              {locale === "ko" ? "1회 10,000원 · 이용권 보유 시 무료 처리" : "₩10,000 per reading · covered by an active pass"}
            </p>
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

            <section className={styles.summary}>
              {summaryCards.map((card) => (
                <div className={styles.summaryCard} key={card.key}>
                  <span className={styles.summaryLabel}>{card.label}</span>
                  <strong className={styles.summaryValue}>{card.value}</strong>
                </div>
              ))}
              <div className={`${styles.summaryCard} ${styles.summaryWide}`}>
                <span className={styles.summaryLabel}>INCARNATION CROSS</span>
                <strong className={styles.summaryValue}>
                  {pick(CROSS_ANGLE_COPY[chart.incarnationCross.angle as keyof typeof CROSS_ANGLE_COPY], locale)}
                </strong>
                <span className={styles.summaryNote}>{chart.incarnationCross.notation}</span>
              </div>
            </section>

            <div className={styles.graphRow}>
              <BodyGraph chart={chart} locale={locale} selection={selection} onSelect={setSelection} />
              <div className={styles.side}>
                {selection
                  ? <DetailSheet chart={chart} locale={locale} selection={selection} onClose={() => setSelection(null)} />
                  : (
                    <div className={styles.legend}>
                      <p className={styles.legendRow}>
                        <span className={`${styles.swatch} ${styles.swatchPersonality}`} aria-hidden="true" />
                        {pick(UI_TEXT.personality, locale)}
                      </p>
                      <p className={styles.legendRow}>
                        <span className={`${styles.swatch} ${styles.swatchDesign}`} aria-hidden="true" />
                        {pick(UI_TEXT.design, locale)}
                      </p>
                      <p className={styles.legendRow}>
                        <span className={`${styles.swatch} ${styles.swatchMixed}`} aria-hidden="true" />
                        {locale === "ko" ? "두 계층이 함께" : "Both layers"}
                      </p>
                      <p className={styles.legendCount}>
                        {pick(UI_TEXT.activeGates, locale)} {chart.activeGates.length}/64 ·{" "}
                        {pick(UI_TEXT.activeChannels, locale)} {chart.channels.length}/36 ·{" "}
                        {pick(UI_TEXT.definedCenters, locale)} {chart.definedCenters.length}/9
                      </p>
                    </div>
                  )}
              </div>
            </div>

            <section className={styles.tables}>
              {(["personality", "design"] as const).map((layer) => (
                <div className={styles.table} key={layer}>
                  <h3 className={styles.tableHeading}>
                    {layer === "personality" ? pick(UI_TEXT.personality, locale) : pick(UI_TEXT.design, locale)}
                  </h3>
                  <ul className={styles.activationList}>
                    {chart.layers[layer].map((activation) => (
                      <li key={`${layer}-${activation.planet}`}>
                        <button
                          type="button"
                          className={styles.activationRow}
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
            </section>

            <section className={styles.meta}>
              <p>
                {pick(UI_TEXT.birthMoment, locale)}: {chart.moments?.birthUtc || "—"}
              </p>
              <p>
                {pick(UI_TEXT.designMoment, locale)}: {chart.moments?.designUtc || "—"}
              </p>
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
          </>
        )}
      </div>
    </main>
  );
}
