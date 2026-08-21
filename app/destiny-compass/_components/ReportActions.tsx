"use client";
/**
 * 리포트 저장·공유 — 전부 기존 공용 유틸을 그대로 쓴다(새 시트·새 내보내기 금지).
 *  · PDF: lib/pdf/export-result-pdf (html2canvas + jsPDF, 한글 폰트 내장)
 *  · 공유: app/components/DeferredShareWidget (IO 지연 로드)
 *
 * 🔴 캡처 중에는 [data-export="true"] 를 켠다. map.module.css 가 그 아래에서
 *    sticky·content-visibility·반투명 표면을 풀어 준다 — 안 그러면 html2canvas 가
 *    빈 섹션을 뽑거나 별밭·blur 오로라를 지저분하게 래스터화한다.
 */
import { useCallback, useRef, useState } from "react";
import DeferredShareWidget from "@/app/components/DeferredShareWidget";
import { useDestinyCompassCopy } from "../_lib/copy";
import styles from "./map.module.css";

interface ReportActionsProps {
  /** 캡처 대상 컨테이너(리포트 셸) */
  targetRef: React.RefObject<HTMLElement>;
  coordinate: string;
  question?: string;
  /** 저장본 재열람 링크에 쓰는 id. 없으면 공유는 기능 페이지로 보낸다. */
  reportId?: string;
}

export function ReportActions({ targetRef, coordinate, question, reportId }: ReportActionsProps) {
  const copy = useDestinyCompassCopy();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);

  const say = useCallback((msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000);
  }, []);

  const savePdf = useCallback(async () => {
    const root = targetRef.current;
    if (!root || busy) return;
    setBusy(true);
    root.setAttribute("data-export", "true");
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      await exportResultPdf({
        captureTargets: ["[data-pdf-section]"],
        fileName: copy.pdfFileName,
        backgroundColor: "#12102c",
        cover: { title: copy.pdfCoverTitle, subtitle: coordinate, date: new Date().toLocaleDateString("ko-KR") },
        watermarkText: copy.pdfWatermark,
      });
      say(copy.pdfSuccessNotice);
    } catch {
      say(copy.pdfFailNotice);
    } finally {
      root.removeAttribute("data-export");
      setBusy(false);
    }
  }, [targetRef, busy, coordinate, say, copy]);

  return (
    <>
      <button type="button" className={styles.resultCtaGhost} onClick={savePdf} disabled={busy}>
        {busy ? copy.pdfButtonBusy : copy.pdfButtonIdle}
      </button>
      <div className={styles.reportShare}>
        <DeferredShareWidget
          title={copy.shareTitle(coordinate)}
          description={question ? copy.shareDescriptionWithQuestion(question) : copy.shareDescriptionDefault}
          path="/destiny-compass"
          contentType="result"
          contentId={reportId || undefined}
        />
      </div>
      {notice && (
        <div className={styles.toast} role="status">{notice}</div>
      )}
    </>
  );
}
