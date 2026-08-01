"use client";

// 택일(무후르타) — 회당 결제(₩5,000).
//
// 앞의 두 리포트(영구 해금)와 달리 매번 결제하는 기능이라 해금 상태를 읽지 않는다.
// 🔴 결제는 공용 게이트(useCoinGate.ensurePaidAccess, pass-first)에만 맡긴다 — forceDeduct 없음.
//    이용권 선검사 → 미커버 시 단건/월정석 동등 노출은 그쪽이 서버 결정으로 수행하므로
//    여기서 paymentMode 를 지정하거나 pass 를 재판정하지 않는다.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/app/_lib/auth-client";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import styles from "../_premium/premium.module.css";
import local from "./muhurta.module.css";
import { NatalBar, NeedBirth, SectionCards, type ReportSection } from "../_premium/PremiumParts";
import { NAKSHATRA_RESULT_STORAGE_KEY } from "../NakshatraFormClient";
import { birthFromProfileSeed, type NakshatraBirthInput } from "../nakshatra-birth";

const FEATURE_KEY = "nakshatra-muhurta";
const COIN_PRICE = 50;
const AMOUNT_KRW = 5000;
const REASON = "나크샤트라 택일(무후르타)";
const ENDPOINT = "/api/nakshatra-premium/muhurta";

const PURPOSES = [
  { key: "marriage", ko: "결혼·약속", focus: "혼례, 약혼, 상견례, 평생을 걸 약속" },
  { key: "business", ko: "개업·창업", focus: "개업, 창업, 사업자 등록, 첫 영업일" },
  { key: "contract", ko: "계약·거래", focus: "계약 체결, 매매, 투자 집행, 중요한 협상" },
  { key: "moving", ko: "이사·이동", focus: "이사, 이주, 유학·파견 출발, 사무실 이전" },
  { key: "newStart", ko: "시작·착수", focus: "새 일의 착수, 학업·수련 시작, 프로젝트 킥오프" },
  { key: "healing", ko: "치유·회복", focus: "치료 시작, 수술, 요양, 습관 고치기" },
] as const;

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

function PickCard({ day }: { day: MuhurtaDay }) {
  const tone = day.agreement === "both-good" ? local.bothGood : day.agreement === "both-bad" ? local.bothBad : "";
  return (
    <li className={`${local.pick} ${tone}`}>
      <div className={local.pickTop}>
        <span className={`${local.mark} ${GRADE_CLASS[day.grade] || ""}`} aria-hidden="true">{day.gradeMark}</span>
        <span className={local.pickDate}>{day.date}({day.weekdayKo})</span>
        <span className={local.pickGrade}>{day.gradeKo}</span>
        {day.agreement !== "split" && (
          <span className={`${local.agree} ${day.agreement === "both-bad" ? local.agreeBad : ""}`}>
            {day.agreement === "both-good" ? "두 체계 일치" : "두 체계가 함께 꺼림"}
          </span>
        )}
        <span className={local.pickScore}>{day.score}점</span>
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
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const { seed: profileSeed } = useAiProfileSeed();

  const [birth, setBirth] = useState<NakshatraBirthInput | null>(null);
  const [natal, setNatal] = useState<{ sukuyoKo: string; sukuyoHan: string; nakshatraKo: string; nakshatraEn: string } | null>(null);
  const [purpose, setPurpose] = useState<string>("marriage");
  const [startDate, setStartDate] = useState<string>(todayKst());
  const [report, setReport] = useState<MuhurtaReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const selected = useMemo(() => PURPOSES.find((item) => item.key === purpose) || PURPOSES[0], [purpose]);

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
      reason: REASON,
      requestId,
    });
    if (!gate.ok) {
      if (gate.code === "AUTH_REQUIRED" || gate.code === "LOGIN_REQUIRED") { setError("로그인이 필요해요. 로그인 후 다시 시도해 주세요."); return; }
      if (gate.code !== "PAYMENT_CANCELLED") setError(gate.message || "결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...birth, purpose, startDate, requestId }),
      });
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (data.ok && data.report) { setReport(data.report as MuhurtaReport); return; }
      if (response.status === 401) { setError("로그인이 필요해요. 로그인 후 다시 시도해 주세요."); return; }
      if (response.status === 503) { setError("연결이 잠시 불안정해요. 잠시 후 다시 시도해 주세요."); return; }
      setError(String(data.message || "길일을 찾지 못했어요. 잠시 후 다시 시도해 주세요."));
    } catch {
      setError("길일을 찾지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [birth, ensurePaidAccess, isPaying, loading, purpose, startDate]);

  const meta = report ? `${report.meta.dayCount}일 · 일치 ${report.meta.bothGoodCount}일` : undefined;

  return (
    <main className={`${styles.vars} ${styles.shell}`}>
      <div className={styles.inner}>
        <Link href="/nakshatra" className={styles.back}>← 나크샤트라 결정판</Link>

        <header className={styles.head}>
          <p className={styles.eyebrow}>Nakshatra Codex · Muhurta</p>
          <h1 className={styles.title}>택일 — 무후르타</h1>
          <p className={styles.lede}>
            인도 무후르타와 동양 숙요 격각이 <strong>함께</strong> 좋게 보는 날을 찾습니다.
            서로 다른 천문에서 나온 두 근거가 겹치는 날이 진짜 길일입니다.
          </p>
        </header>

        <NatalBar natal={natal} meta={meta} />

        {!birth && <NeedBirth />}

        {birth && (
          <div className={local.form}>
            <span className={local.label}>무엇을 위한 날인가요</span>
            <div className={local.purposeGrid}>
              {PURPOSES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`${local.purposeBtn} ${purpose === item.key ? local.purposeOn : ""}`}
                  onClick={() => setPurpose(item.key)}
                  aria-pressed={purpose === item.key}
                >
                  {item.ko}
                </button>
              ))}
            </div>
            <p className={local.purposeFocus}>{selected.focus}</p>

            <label className={local.label} htmlFor="muhurta-start">언제부터 볼까요 (60일 치)</label>
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
                {isPaying ? "결제 진행 중…" : loading ? "길일을 고르는 중…" : `길일 찾기 · ${AMOUNT_KRW.toLocaleString()}원`}
              </button>
            </div>
          </div>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        {report && (
          <>
            <p className={styles.headline}>
              {report.meta.purposeKo} — {report.meta.rangeStart} ~ {report.meta.rangeEnd} 중
              두 체계가 함께 좋게 본 날이 {report.meta.bothGoodCount}일입니다.
            </p>

            <h2 className={local.allTitle}>가장 좋은 날</h2>
            <p className={local.allNote}>점수 순입니다. &ldquo;두 체계 일치&rdquo; 표시가 붙은 날을 먼저 보세요.</p>
            <ul className={local.pickList}>
              {report.best.map((day) => <PickCard key={day.date} day={day} />)}
            </ul>

            {report.avoid.length > 0 && (
              <>
                <h2 className={local.allTitle}>옮길 수 있으면 피할 날</h2>
                <p className={local.allNote}>금지가 아니라, 대안이 있으면 옮기는 편이 낫다는 뜻입니다.</p>
                <ul className={local.pickList}>
                  {report.avoid.map((day) => <PickCard key={day.date} day={day} />)}
                </ul>
              </>
            )}

            <SectionCards sections={report.sections} />

            <h2 className={local.allTitle}>전체 {report.meta.dayCount}일</h2>
            <p className={local.allNote}>
              본명수 {report.meta.myMansionKo}({report.meta.myMansionHan}) · 본명 나크샤트라 {report.meta.myNakshatraKo} 기준입니다.
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

            <p className={styles.disclaimer}>
              택일은 준비가 끝난 일을 언제 꺼낼지 정하는 도구입니다. 시각까지 정하는 전통 무후르타는
              라그나·호라를 함께 보며, 이 리포트는 날짜 단위입니다. 의료·법률·투자 판단의 근거로 쓰지 마세요.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
