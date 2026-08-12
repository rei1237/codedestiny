"use client";

// VVIP 결정판 통합서 — 회당 결제(₩30,000).
//
// 흩어져 있던 것을 한 권으로 묶는 소장본이다. LLM 을 쓰지 않으므로 같은 명식이면 언제나 같은 책이 나온다.
// 🔴 결제 계약은 택일과 같다 — 공용 게이트(useCoinGate, pass-first, forceDeduct 없음)에만 맡기고
//    여기서 paymentMode 를 지정하거나 pass 를 재판정하지 않는다.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { postPaidBody } from "../nakshatra-fetch";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import styles from "../_premium/premium.module.css";
import local from "./vvip.module.css";
import { GenderPrompt, NatalBar, NeedBirth, type ReportSection } from "../_premium/PremiumParts";
import { NAKSHATRA_RESULT_STORAGE_KEY } from "../NakshatraFormClient";
import { birthFromProfileSeed, type NakshatraBirthInput } from "../nakshatra-birth";

const FEATURE_KEY = "nakshatra-vvip-codex";
const COIN_PRICE = 300;
const AMOUNT_KRW = 30000;
const REASON = "나크샤트라 결정판 VVIP 통합서";
const ENDPOINT = "/api/nakshatra-premium/vvip-codex";

const GATE_BULLETS = [
  "제1장 명식 총람 — 숙요·나크샤트라·지배성·파다·기질 삼축을 한 면에",
  "제2장 세 대가의 목소리 — 숙요 대가 · 베다 대가 · 두 전통을 잇는 통합 해석",
  "제3장 27수 전체 지형 — 스물일곱 자리 전부와 나의 격각 관계(사람·날짜에 평생 쓰는 지도)",
  "제4장 지배성 심화 리포트 전문 (단품 10,000원)",
  "제5장 다샤 인생지도 전문 — 마하 전 구간 + 안타르다샤 90구간 (단품 10,000원)",
  "PDF 소장본 저장",
];

interface TerrainRow {
  index: number;
  nameKo: string;
  nameHan: string;
  isSelf: boolean;
  relationTypeHan: string;
  role: string;
  roleHan: string;
  gist: string;
}
interface Chapter {
  id: string;
  title: string;
  icon: string;
  keyInsight: string;
  paragraphs?: string[];
  sections?: ReportSection[];
  terrain?: TerrainRow[];
}
interface VvipCodex {
  meta: {
    sukuyoKo: string; sukuyoHan: string; nakshatraKo: string; nakshatraEn: string;
    lordKo: string; fusionTitle: string; chapterCount: number;
  };
  toc: { id: string; title: string; icon: string }[];
  chapters: Chapter[];
  charCount: number;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function ChapterView({ chapter }: { chapter: Chapter }) {
  return (
    <section className={local.chapter} data-pdf-section aria-labelledby={`ch-${chapter.id}`}>
      <header className={local.chapterHead}>
        <h2 id={`ch-${chapter.id}`} className={local.chapterTitle}>
          <span aria-hidden="true">{chapter.icon} </span>{chapter.title}
        </h2>
        {chapter.keyInsight && <p className={local.chapterKey}>{chapter.keyInsight}</p>}
      </header>

      {(chapter.paragraphs || []).map((paragraph, index) => (
        <p key={`${chapter.id}-p${index}`} className={local.para}>{paragraph}</p>
      ))}

      {chapter.terrain && (
        <ul className={local.terrain}>
          {chapter.terrain.map((row) => (
            <li key={row.index} className={`${local.trow} ${row.isSelf ? local.tself : ""}`}>
              <span className={local.tname}>{row.nameKo}({row.nameHan})</span>
              <span className={local.trole}>{row.role}({row.roleHan})</span>
              {row.isSelf && <span className={local.tmine}>내 자리</span>}
              <span className={local.tgist}>{row.gist}</span>
            </li>
          ))}
        </ul>
      )}

      {(chapter.sections || []).map((section) => (
        <div key={`${chapter.id}-${section.id}`}>
          <p className={local.chapterKey}>
            <span aria-hidden="true">{section.icon} </span>
            <strong>{section.title}</strong>
            {section.keyInsight ? ` — ${section.keyInsight}` : ""}
          </p>
          {(section.paragraphs || []).map((paragraph, index) => (
            <p key={`${section.id}-p${index}`} className={local.para}>{paragraph}</p>
          ))}
          {(section.bullets || []).map((bullet) => (
            <p key={`${section.id}-${bullet.label}`} className={local.para}>
              <strong>{bullet.label}</strong> — {bullet.text}
            </p>
          ))}
        </div>
      ))}
    </section>
  );
}

export default function VvipClient() {
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const { seed: profileSeed } = useAiProfileSeed();

  const [birth, setBirth] = useState<NakshatraBirthInput | null>(null);
  const [natal, setNatal] = useState<{ sukuyoKo: string; sukuyoHan: string; nakshatraKo: string; nakshatraEn: string } | null>(null);
  const [report, setReport] = useState<VvipCodex | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  // 결제는 끝났는데 본문만 못 받은 상태 — 재결제 없이 다시 받을 수 있게 입력을 붙들어 둔다.
  const [canRetry, setCanRetry] = useState(false);
  const paidRef = useRef<{ birth: NakshatraBirthInput; requestId: string } | null>(null);

  // 성별은 제5장 동양 대운에만 쓰인다 — 고르면 birth 에 덧대기만 하고 다른 필드는 건드리지 않는다.
  const setGender = useCallback((gender: "male" | "female") => {
    setBirth((prev) => (prev ? { ...prev, gender } : prev));
  }, []);

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
      // sessionStorage 불가 — 프로필 시드로 폴백한다.
    }
  }, []);

  // 성별은 제5장(동양 대운)에만 쓰인다 — 없으면 그 축만 빠지고 나머지는 온전하다.
  useEffect(() => {
    const derived = birthFromProfileSeed(profileSeed);
    if (!derived) return;
    setBirth((prev) => {
      if (!prev) return derived;
      if (prev.gender || !derived.gender) return prev;
      return { ...prev, gender: derived.gender };
    });
  }, [profileSeed]);

  // 결제 뒤의 본문 요청만 담당한다. 결제는 다시 하지 않는다.
  const fetchCodex = useCallback(async (paid: { birth: NakshatraBirthInput; requestId: string }) => {
    setLoading(true);
    setError("");
    try {
      const { data, status, transient } = await postPaidBody(ENDPOINT, { ...paid.birth, requestId: paid.requestId });
      if (data.ok && data.report) { setReport(data.report as VvipCodex); setCanRetry(false); return; }
      if (status === 401) { setError("로그인이 필요해요. 로그인 후 다시 시도해 주세요."); setCanRetry(true); return; }
      if (transient) {
        setError("연결이 잠시 불안정해요. 결제는 그대로 남아 있으니 아래 버튼으로 다시 받아보세요.");
        setCanRetry(true);
        return;
      }
      setError(String(data.message || "통합서를 만들지 못했어요. 잠시 후 다시 시도해 주세요."));
      setCanRetry(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const retry = useCallback(async () => {
    if (!paidRef.current || loading) return;
    await fetchCodex(paidRef.current);
  }, [fetchCodex, loading]);

  const run = useCallback(async () => {
    if (!birth || isPaying || loading) return;
    setError("");
    // 결제에 쓴 requestId 를 그대로 들고 간다 — 서버가 이 값으로 차감·결제 기록을 되찾는다.
    const requestId = `${FEATURE_KEY}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

    // 🔴 결제가 끝났다(₩30,000). 여기서부터는 실패해도 재결제를 요구하지 않는다.
    paidRef.current = { birth, requestId };
    await fetchCodex({ birth, requestId });
  }, [birth, ensurePaidAccess, fetchCodex, isPaying, loading]);

  const savePdf = useCallback(async () => {
    if (!report || savingPdf) return;
    setSavingPdf(true);
    setError("");
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      await exportResultPdf({
        captureTargets: ["[data-pdf-section]"],
        fileName: `나크샤트라-결정판-통합서-${report.meta.sukuyoKo}-${report.meta.nakshatraKo}.pdf`,
        backgroundColor: "#04050c",
        cover: {
          title: "나크샤트라 결정판 통합서",
          subtitle: `${report.meta.sukuyoKo}(${report.meta.sukuyoHan}) · ${report.meta.nakshatraKo} · 지배성 ${report.meta.lordKo}`,
        },
      });
    } catch {
      setError("PDF 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSavingPdf(false);
    }
  }, [report, savingPdf]);

  const meta = report ? `${report.meta.chapterCount}장 · ${report.charCount.toLocaleString()}자` : undefined;

  return (
    <main className={`${styles.vars} ${styles.shell}`}>
      <div className={styles.inner}>
        <Link href="/nakshatra" className={styles.back}>← 나크샤트라 결정판</Link>

        <header className={styles.head}>
          <p className={styles.eyebrow}>Nakshatra Codex · VVIP</p>
          <h1 className={styles.title}>결정판 통합서</h1>
          <p className={styles.lede}>
            흩어져 있던 것을 한 권으로 묶습니다. 명식 총람부터 27수 전체 지형, 지배성 심화와
            120년 다샤 지도까지 — PDF로 소장할 수 있는 한 권입니다.
          </p>
        </header>

        <NatalBar natal={natal} meta={meta} />

        {!birth && <NeedBirth />}

        {/* 🔴 성별은 제5장(동양 대운)에만 쓰이는데, 없으면 그 축이 통째로 빠진다.
            VVIP 는 회당 결제라 다시 받으려면 또 30,000원이므로 반드시 **결제 전에** 묻는다.
            (영구 해금인 다샤 인생지도는 결제 뒤에 물어도 재열람이 무료라 사정이 달랐다.) */}
        {birth && !report && !birth.gender && (
          <GenderPrompt
            onPick={setGender}
            busy={isPaying || loading}
            note="대운은 절기까지의 거리와 성별로 순행·역행이 정해집니다. 근거 없이 한쪽을 고르면 열 개 구간이 통째로 어긋나므로 추측하지 않아요. 지금 골라 두시면 제5장에 동양 대운이 함께 실립니다 — 고르지 않아도 나머지 네 장과 인도 축(비쇼타리)은 그대로 나옵니다."
          />
        )}

        {birth && !report && (
          <div className={styles.gate}>
            <p className={styles.gatePrice}>30,000원</p>
            <p className={styles.gateNote}>
              단품 지배성 리포트(10,000원)와 다샤 인생지도(10,000원)를 통째로 담고,
              27수 전체 지형과 세 대가의 해설을 더한 소장본입니다.
            </p>
            <ul className={styles.bullets}>
              {GATE_BULLETS.map((text) => <li key={text}>{text}</li>)}
            </ul>
            <button type="button" className={styles.cta} onClick={() => void run()} disabled={isPaying || loading}>
              {isPaying ? "결제 진행 중…" : loading ? "한 권으로 엮는 중…" : "통합서 받기"}
            </button>
          </div>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        {canRetry && paidRef.current && !report && (
          <button type="button" className={styles.cta} onClick={() => void retry()} disabled={loading}>
            {loading ? "다시 받는 중…" : "결제 없이 다시 받기"}
          </button>
        )}

        {report && (
          <>
            <nav className={local.toc} aria-label="목차">
              <p className={local.tocTitle}>목차</p>
              <ul className={local.tocList}>
                {report.toc.map((item) => (
                  <li key={item.id} className={local.tocItem}>
                    <span className={local.tocIcon} aria-hidden="true">{item.icon}</span>
                    <span>{item.title}</span>
                  </li>
                ))}
              </ul>
            </nav>

            {report.chapters.map((chapter) => <ChapterView key={chapter.id} chapter={chapter} />)}

            <div className={local.actions}>
              <button type="button" className={local.pdfBtn} onClick={() => void savePdf()} disabled={savingPdf}>
                {savingPdf ? "PDF 만드는 중…" : "PDF로 소장하기"}
              </button>
            </div>

            <p className={styles.disclaimer}>
              시데리얼(라히리) 기준 달의 위치와 27수 전통 속성으로 산출한 해석 자료입니다.
              출생 시각이 부정확하면 파다와 다샤 경계가 밀릴 수 있습니다. 의료·법률·투자 판단의 근거로 쓰지 마세요.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
