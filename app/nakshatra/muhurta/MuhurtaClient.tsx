"use client";

// 택일(무후르타) — 회당 결제(₩5,000).
//
// 앞의 두 리포트(영구 해금)와 달리 매번 결제하는 기능이라 해금 상태를 읽지 않는다.
// 🔴 결제는 공용 게이트(useCoinGate.ensurePaidAccess, pass-first)에만 맡긴다 — forceDeduct 없음.
//    이용권 선검사 → 미커버 시 단건/월정석 동등 노출은 그쪽이 서버 결정으로 수행하므로
//    여기서 paymentMode 를 지정하거나 pass 를 재판정하지 않는다.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { postPaidBody } from "../nakshatra-fetch";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import { usePaidResume, packPaidResumeArg, unpackPaidResumeArg } from "@/app/hooks/usePaidResume";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import styles from "../_premium/premium.module.css";
import local from "./muhurta.module.css";
import { NatalBar, NeedBirth, SectionCards, type ReportSection } from "../_premium/PremiumParts";
import { NAKSHATRA_RESULT_STORAGE_KEY } from "../NakshatraFormClient";
import { birthFromProfileSeed, type NakshatraBirthInput } from "../nakshatra-birth";
import { useNakshatraCopy, type MuhurtaPurposeKey } from "../_lib/copy";

const FEATURE_KEY = "nakshatra-muhurta";
const COIN_PRICE = 50;
const AMOUNT_KRW = 5000;
const ENDPOINT = "/api/nakshatra-premium/muhurta";

const PURPOSE_KEYS: MuhurtaPurposeKey[] = ["marriage", "business", "contract", "moving", "newStart", "healing"];

const GRADE_CLASS: Record<string, string> = {
  best: local.gradeBest,
  good: local.gradeGood,
  fair: local.gradeFair,
  poor: local.gradePoor,
  avoid: local.gradeAvoid,
};

interface MuhurtaDay {
  date: string;
  weekdayKo: string;
  sukuyoKo: string;
  sukuyoHan: string;
  nakshatraKo: string;
  activityKo: string;
  easternLabel: string;
  taraKo: string;
  agreement: "both-good" | "both-bad" | "split";
  score: number;
  grade: string;
  gradeKo: string;
  gradeMark: string;
  reason: string;
}
interface MuhurtaReport {
  meta: {
    purposeKo: string;
    purposeFocus: string;
    myMansionKo: string;
    myMansionHan: string;
    myNakshatraKo: string;
    rangeStart: string;
    rangeEnd: string;
    dayCount: number;
    bothGoodCount: number;
  };
  best: MuhurtaDay[];
  avoid: MuhurtaDay[];
  days: MuhurtaDay[];
  sections: ReportSection[];
  charCount: number;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
function todayKst() {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}

function PickCard({ day, copy }: { day: MuhurtaDay; copy: ReturnType<typeof useNakshatraCopy> }) {
  const tone = day.agreement === "both-good" ? local.bothGood : day.agreement === "both-bad" ? local.bothBad : "";
  return (
    <li className={`${local.pick} ${tone}`}>
      <div className={local.pickTop}>
        <span className={`${local.mark} ${GRADE_CLASS[day.grade] || ""}`} aria-hidden="true">{day.gradeMark}</span>
        <span className={local.pickDate}>{day.date}({day.weekdayKo})</span>
        <span className={local.pickGrade}>{day.gradeKo}</span>
        {day.agreement !== "split" && (
          <span className={`${local.agree} ${day.agreement === "both-bad" ? local.agreeBad : ""}`}>
            {day.agreement === "both-good" ? copy.muhurtaBothMatchLabel : copy.muhurtaBothAvoidLabel}
          </span>
        )}
        <span className={local.pickScore}>{day.score}</span>
      </div>
      <div className={local.pickMeta}>
        <span className={local.metaEast}>☯ {day.sukuyoKo}({day.sukuyoHan}) · {day.easternLabel}</span>
        <span className={local.metaIndia}>🕉 {day.nakshatraKo} · {day.activityKo} · {day.taraKo}</span>
      </div>
      <p className={local.pickReason}>{day.reason}</p>
    </li>
  );
}

export default function MuhurtaClient() {
  const copy = useNakshatraCopy();
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const { seed: profileSeed } = useAiProfileSeed();

  const [birth, setBirth] = useState<NakshatraBirthInput | null>(null);
  const [natal, setNatal] = useState<{ sukuyoKo: string; sukuyoHan: string; nakshatraKo: string; nakshatraEn: string } | null>(null);
  const [purpose, setPurpose] = useState<string>("marriage");
  const [startDate, setStartDate] = useState<string>(todayKst());
  const [report, setReport] = useState<MuhurtaReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // 결제는 끝났는데 본문만 못 받은 상태 — 재결제 없이 다시 받을 수 있게 입력을 붙들어 둔다.
  const [canRetry, setCanRetry] = useState(false);
  const paidRef = useRef<{ birth: NakshatraBirthInput; purpose: string; startDate: string; requestId: string } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(NAKSHATRA_RESULT_STORAGE_KEY);
      if (!raw) return;
      const parsed = asRecord(JSON.parse(raw));
      const input = asRecord(parsed.input);
      if (!Number(input.year)) return;
      setBirth({
        year: Number(input.year), month: Number(input.month), day: Number(input.day),
        hour: Number(input.hour ?? 12), minute: Number(input.minute ?? 0),
        timezone: Number(input.timezone ?? 9), lat: Number(input.lat ?? 37.5665), lon: Number(input.lon ?? 126.978),
        timeUnknown: Boolean(input.timeUnknown), gender: "",
      });
      const dongyang = asRecord(parsed.dongyang);
      const india = asRecord(parsed.india);
      setNatal({
        sukuyoKo: String(dongyang.nameKo || ""), sukuyoHan: String(dongyang.nameHan || ""),
        nakshatraKo: String(india.nameKo || ""), nakshatraEn: String(india.nameEn || ""),
      });
    } catch {
      // sessionStorage 불가 — 아래 프로필 시드로 폴백한다.
    }
  }, []);

  useEffect(() => {
    if (birth) return;
    const derived = birthFromProfileSeed(profileSeed);
    if (derived) setBirth(derived);
  }, [birth, profileSeed]);

  const purposeFocus = copy.muhurtaPurposeFocus[purpose as MuhurtaPurposeKey];

  // 결제 뒤의 본문 요청만 담당한다. 결제는 다시 하지 않는다.
  const fetchReport = useCallback(async (paid: { birth: NakshatraBirthInput; purpose: string; startDate: string; requestId: string }) => {
    setLoading(true);
    setError("");
    try {
      const { data, status, transient } = await postPaidBody(ENDPOINT, {
        ...paid.birth, purpose: paid.purpose, startDate: paid.startDate, requestId: paid.requestId,
      });
      if (data.ok && data.report) { setReport(data.report as MuhurtaReport); setCanRetry(false); return; }
      if (status === 401) { setError(copy.loginRequiredMessage); setCanRetry(true); return; }
      if (transient) {
        setError(copy.connectionUnstableRetryMessage);
        setCanRetry(true);
        return;
      }
      setError(String(data.message || copy.muhurtaFailedMessage));
      setCanRetry(true);
    } finally {
      setLoading(false);
    }
  }, [copy]);

  const retry = useCallback(async () => {
    if (!paidRef.current || loading) return;
    await fetchReport(paidRef.current);
  }, [fetchReport, loading]);

  /* 결제 후 자동 재개 — 모바일 PortOne 리다이렉트로 run 의 await 가 죽은 뒤의 복귀 경로.
     목적·시작일은 화면 state 이고 requestId 는 결제 증빙 열쇠라 새 문서에서 재현할 수 없다 —
     결제 직전에 서술자로 굳혀 둔다. 🔴 게이트 없는 코어(fetchReport)를 부른다. */
  const buildResume = usePaidResume(FEATURE_KEY, (args, grant) => {
    const restored = unpackPaidResumeArg<NakshatraBirthInput>(args.birth);
    const requestId = String(args.requestId || grant?.requestId || grant?.merchantUid || "");
    if (!restored || !requestId) return false;
    paidRef.current = {
      birth: restored,
      purpose: String(args.purpose || "marriage"),
      startDate: String(args.startDate || todayKst()),
      requestId,
    };
    void fetchReport(paidRef.current);
    return true;
  });

  const run = useCallback(async () => {
    if (!birth || isPaying || loading) return;
    setError("");
    // 결제에 쓴 requestId 를 그대로 들고 간다 — 서버가 이 값으로 차감·결제 기록을 되찾아
    // 결제가 실제로 일어났는지 확인한다(worker/lib/nakshatra-paid-access.js).
    const requestId = `${FEATURE_KEY}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    // 회당 결제 — 매번 결제하므로 forceDeduct 를 주지 않는다.
    const gate = await ensurePaidAccess({
      featureKey: FEATURE_KEY,
      coinPrice: COIN_PRICE,
      cost: COIN_PRICE,
      amountKRW: AMOUNT_KRW,
      reason: copy.muhurtaReason,
      requestId,
      resume: buildResume({ birth: packPaidResumeArg(birth), purpose, startDate, requestId }),
    });
    if (!gate.ok) {
      if (gate.code === "AUTH_REQUIRED" || gate.code === "LOGIN_REQUIRED") { setError(copy.loginRequiredMessage); return; }
      if (gate.code !== "PAYMENT_CANCELLED") setError(gate.message || copy.paymentFailedMessage);
      return;
    }

    // 🔴 결제가 끝났다. 여기서부터는 실패해도 재결제를 요구하지 않는다 —
    //    일시 장애는 자동 재시도하고, 그래도 안 되면 '다시 시도' 버튼으로 같은 결제를 재사용한다.
    paidRef.current = { birth, purpose, startDate, requestId };
    await fetchReport({ birth, purpose, startDate, requestId });
  }, [birth, buildResume, copy, ensurePaidAccess, fetchReport, isPaying, loading, purpose, startDate]);

  const meta = report ? copy.muhurtaMetaSummary(report.meta.dayCount, report.meta.bothGoodCount) : undefined;

  return (
    <main className={`${styles.vars} ${styles.shell}`}>
      <div className={styles.inner}>
        <Link href="/nakshatra" className={styles.back}>{copy.backToHubLink}</Link>

        <header className={styles.head}>
          <p className={styles.eyebrow}>{copy.muhurtaEyebrow}</p>
          <h1 className={styles.title}>{copy.muhurtaTitle}</h1>
          <p className={styles.lede} dangerouslySetInnerHTML={{ __html: copy.muhurtaLede }} />
        </header>

        <NatalBar natal={natal} meta={meta} />

        {!birth && <NeedBirth />}

        {birth && (
          <div className={local.form}>
            <span className={local.label}>{copy.muhurtaPurposeQuestionLabel}</span>
            <div className={local.purposeGrid}>
              {PURPOSE_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`${local.purposeBtn} ${purpose === key ? local.purposeOn : ""}`}
                  onClick={() => setPurpose(key)}
                  aria-pressed={purpose === key}
                >
                  {copy.muhurtaPurposeLabel[key]}
                </button>
              ))}
            </div>
            <p className={local.purposeFocus}>{purposeFocus}</p>

            <label className={local.label} htmlFor="muhurta-start">{copy.muhurtaStartDateLabel}</label>
            <div className={local.dateRow}>
              <input
                id="muhurta-start"
                type="date"
                className={local.dateInput}
                value={startDate}
                min={todayKst()}
                onChange={(event) => setStartDate(event.target.value)}
              />
              <button type="button" className={styles.cta} onClick={() => void run()} disabled={isPaying || loading}>
                {isPaying ? copy.payingButton : loading ? copy.muhurtaSearchingButton : copy.muhurtaFindButton(copy.muhurtaPriceLabel)}
              </button>
            </div>
          </div>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        {canRetry && paidRef.current && !report && (
          <button type="button" className={styles.cta} onClick={() => void retry()} disabled={loading}>
            {loading ? copy.retryingButton : copy.retryWithoutPaymentButton}
          </button>
        )}

        {report && (
          <>
            <p className={styles.headline}>
              {copy.muhurtaHeadline(report.meta.purposeKo, report.meta.rangeStart, report.meta.rangeEnd, report.meta.bothGoodCount)}
            </p>

            <h2 className={local.allTitle}>{copy.muhurtaBestTitle}</h2>
            <p className={local.allNote}>{copy.muhurtaBestNote}</p>
            <ul className={local.pickList}>
              {report.best.map((day) => <PickCard key={day.date} day={day} copy={copy} />)}
            </ul>

            {report.avoid.length > 0 && (
              <>
                <h2 className={local.allTitle}>{copy.muhurtaAvoidTitle}</h2>
                <p className={local.allNote}>{copy.muhurtaAvoidNote}</p>
                <ul className={local.pickList}>
                  {report.avoid.map((day) => <PickCard key={day.date} day={day} copy={copy} />)}
                </ul>
              </>
            )}

            <SectionCards sections={report.sections} />

            <h2 className={local.allTitle}>{copy.muhurtaAllTitle(report.meta.dayCount)}</h2>
            <p className={local.allNote}>
              {copy.muhurtaAllNote(report.meta.myMansionKo, report.meta.myMansionHan, report.meta.myNakshatraKo)}
            </p>
            <ul className={local.rows}>
              {report.days.map((day) => (
                <li key={day.date} className={local.row}>
                  <span className={local.rowDate}>{day.date}({day.weekdayKo})</span>
                  <span className={`${local.rowMark} ${GRADE_CLASS[day.grade] || ""}`}>{day.gradeMark}</span>
                  <span className={local.rowBody}>{day.sukuyoKo} · {day.nakshatraKo} · {day.taraKo}</span>
                  <span className={local.rowScore}>{day.score}</span>
                </li>
              ))}
            </ul>

            <p className={styles.disclaimer}>{copy.muhurtaDisclaimer}</p>
          </>
        )}
      </div>
    </main>
  );
}
