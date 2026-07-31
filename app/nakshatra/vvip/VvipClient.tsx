"use client";

// VVIP 결정판 통합서 — 회당 결제(₩50,000).
//
// 흩어져 있던 것을 한 권으로 묶는 소장본이다. LLM 을 쓰지 않으므로 같은 명식이면 언제나 같은 책이 나온다.
// 🔴 결제 계약은 택일과 같다 — 공용 게이트(useCoinGate, pass-first, forceDeduct 없음)에만 맡기고
//    여기서 paymentMode 를 지정하거나 pass 를 재판정하지 않는다.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/app/_lib/auth-client";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import styles from "../_premium/premium.module.css";
import local from "./vvip.module.css";
import { NatalBar, NeedBirth, type ReportSection } from "../_premium/PremiumParts";
import { NAKSHATRA_RESULT_STORAGE_KEY } from "../NakshatraFormClient";
import { birthFromProfileSeed, type NakshatraBirthInput } from "../nakshatra-birth";

const FEATURE_KEY = "nakshatra-vvip-codex";
const COIN_PRICE = 500;
const AMOUNT_KRW = 50000;
const REASON = "나크샤트라 결정판 VVIP 통합서";
const ENDPOINT = "/api/nakshatra-premium/vvip-codex";

const GATE_BULLETS = [
  "제1장 명식 총람 — 숙요·나크샤트라·지배성·파다·기질 삼축을 한 면에",
  "제2장 세 대가의 목소리 — 숙요 대가 · 베다 대가 · 두 전통을 잇는 통합 해석",
  "제3장 27수 전체 지형 — 스물일곱 자리 전부와 나의 격각 관계(사람·날짜에 평생 쓰는 지도)",
  "제4장 지배성 심화 리포트 전문 (단품 10,000원)",
  "제5장 다샤 인생지도 전문 — 마하 전 구간 + 안타르다샤 90구간 (단품 15,000원)",
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

  const run = useCallback(async () => {
    if (!birth || isPaying || loading) return;
    setError("");
    const gate = await ensurePaidAccess({
      featureKey: FEATURE_KEY,
      coinPrice: COIN_PRICE,
      cost: COIN_PRICE,
      amountKRW: AMOUNT_KRW,
      reason: REASON,
      requestId: `${FEATURE_KEY}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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
        body: JSON.stringify(birth),
      });
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (data.ok && data.report) { setReport(data.report as VvipCodex); return; }
      if (response.status === 401) { setError("로그인이 필요해요. 로그인 후 다시 시도해 주세요."); return; }
      if (response.status === 503) { setError("연결이 잠시 불안정해요. 잠시 후 다시 시도해 주세요."); return; }
      setError(String(data.message || "통합서를 만들지 못했어요. 잠시 후 다시 시도해 주세요."));
    } catch {
      setError("통합서를 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [birth, ensurePaidAccess, isPaying, loading]);

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

        {birth && !report && (
          <div className={styles.gate}>
            <p className={styles.gatePrice}>50,000원</p>
            <p className={styles.gateNote}>
              단품 지배성 리포트(10,000원)와 다샤 인생지도(15,000원)를 통째로 담고,
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
