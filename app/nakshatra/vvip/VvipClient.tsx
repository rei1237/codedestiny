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
import { usePaidResume, packPaidResumeArg, unpackPaidResumeArg } from "@/app/hooks/usePaidResume";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import styles from "../_premium/premium.module.css";
import local from "./vvip.module.css";
import { GenderPrompt, NatalBar, NeedBirth, type ReportSection } from "../_premium/PremiumParts";
import { NAKSHATRA_RESULT_STORAGE_KEY } from "../NakshatraFormClient";
import { birthFromProfileSeed, type NakshatraBirthInput } from "../nakshatra-birth";
import { useNakshatraCopy } from "../_lib/copy";

const FEATURE_KEY = "nakshatra-vvip-codex";
const COIN_PRICE = 300;
const AMOUNT_KRW = 30000;
const ENDPOINT = "/api/nakshatra-premium/vvip-codex";

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

function ChapterView({ chapter, myPlaceLabel }: { chapter: Chapter; myPlaceLabel: string }) {
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
              {row.isSelf && <span className={local.tmine}>{myPlaceLabel}</span>}
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
  const copy = useNakshatraCopy();
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
      if (status === 401) { setError(copy.loginRequiredMessage); setCanRetry(true); return; }
      if (transient) {
        setError(copy.connectionUnstableRetryMessage);
        setCanRetry(true);
        return;
      }
      setError(String(data.message || copy.vvipReportFailedMessage));
      setCanRetry(true);
    } finally {
      setLoading(false);
    }
  }, [copy]);

  const retry = useCallback(async () => {
    if (!paidRef.current || loading) return;
    await fetchCodex(paidRef.current);
  }, [fetchCodex, loading]);

  /* 결제 후 자동 재개 — 모바일 PortOne 은 상위 프레임을 리다이렉트해 run 의 await 를 죽인다.
     생년은 sessionStorage 에서 되살아나지만 결제에 쓴 requestId 는 그렇지 않다(서버가 이 값으로
     결제 기록을 찾는다) — 둘 다 서술자에 싣는다. 🔴 게이트 없는 코어(fetchCodex)를 부른다. */
  const buildResume = usePaidResume(FEATURE_KEY, (args, grant) => {
    const restored = unpackPaidResumeArg<NakshatraBirthInput>(args.birth);
    const requestId = String(args.requestId || grant?.requestId || grant?.merchantUid || "");
    if (!restored || !requestId) return false;
    paidRef.current = { birth: restored, requestId };
    void fetchCodex(paidRef.current);
    return true;
  });

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
      reason: copy.vvipReason,
      requestId,
      resume: buildResume({ birth: packPaidResumeArg(birth), requestId }),
    });
    if (!gate.ok) {
      if (gate.code === "AUTH_REQUIRED" || gate.code === "LOGIN_REQUIRED") { setError(copy.loginRequiredMessage); return; }
      if (gate.code !== "PAYMENT_CANCELLED") setError(gate.message || copy.paymentFailedMessage);
      return;
    }

    // 🔴 결제가 끝났다(₩30,000). 여기서부터는 실패해도 재결제를 요구하지 않는다.
    paidRef.current = { birth, requestId };
    await fetchCodex({ birth, requestId });
  }, [birth, buildResume, ensurePaidAccess, fetchCodex, isPaying, loading, copy]);

  const savePdf = useCallback(async () => {
    if (!report || savingPdf) return;
    setSavingPdf(true);
    setError("");
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      await exportResultPdf({
        captureTargets: ["[data-pdf-section]"],
        fileName: copy.vvipPdfFileName(report.meta.sukuyoKo, report.meta.nakshatraKo),
        backgroundColor: "#04050c",
        cover: {
          title: copy.vvipPdfCoverTitle,
          subtitle: copy.vvipPdfCoverSubtitle(report.meta.sukuyoKo, report.meta.sukuyoHan, report.meta.nakshatraKo, report.meta.lordKo),
        },
      });
    } catch {
      setError(copy.vvipPdfFailMessage);
    } finally {
      setSavingPdf(false);
    }
  }, [report, savingPdf, copy]);

  const meta = report ? copy.vvipMetaSummary(report.meta.chapterCount, report.charCount) : undefined;

  return (
    <main className={`${styles.vars} ${styles.shell}`}>
      <div className={styles.inner}>
        <Link href="/nakshatra" className={styles.back}>{copy.backToHubLink}</Link>

        <header className={styles.head}>
          <p className={styles.eyebrow}>{copy.vvipEyebrow}</p>
          <h1 className={styles.title}>{copy.vvipTitle}</h1>
          <p className={styles.lede}>{copy.vvipLede}</p>
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
            note={copy.vvipGenderNote}
          />
        )}

        {birth && !report && (
          <div className={styles.gate}>
            <p className={styles.gatePrice}>{copy.vvipGatePrice}</p>
            <p className={styles.gateNote}>{copy.vvipGateNote}</p>
            <ul className={styles.bullets}>
              {copy.vvipGateBullets.map((text) => <li key={text}>{text}</li>)}
            </ul>
            <button type="button" className={styles.cta} onClick={() => void run()} disabled={isPaying || loading}>
              {isPaying ? copy.payingButton : loading ? copy.vvipBuildingButton : copy.vvipReceiveButton}
            </button>
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
            <nav className={local.toc} aria-label={copy.vvipTocLabel}>
              <p className={local.tocTitle}>{copy.vvipTocLabel}</p>
              <ul className={local.tocList}>
                {report.toc.map((item) => (
                  <li key={item.id} className={local.tocItem}>
                    <span className={local.tocIcon} aria-hidden="true">{item.icon}</span>
                    <span>{item.title}</span>
                  </li>
                ))}
              </ul>
            </nav>

            {report.chapters.map((chapter) => <ChapterView key={chapter.id} chapter={chapter} myPlaceLabel={copy.vvipMyPlaceLabel} />)}

            <div className={local.actions}>
              <button type="button" className={local.pdfBtn} onClick={() => void savePdf()} disabled={savingPdf}>
                {savingPdf ? copy.vvipPdfSavingButton : copy.vvipPdfSaveButton}
              </button>
            </div>

            <p className={styles.disclaimer}>{copy.vvipDisclaimer}</p>
          </>
        )}
      </div>
    </main>
  );
}
