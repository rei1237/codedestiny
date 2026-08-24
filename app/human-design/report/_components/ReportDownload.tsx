"use client";

// PDF 내려받기.
//
// 🔴 **AI 를 다시 부르지 않는다**(요구 32). PDF 는 이미 저장된 리포트에서 만든 플랜을 조판할
//    뿐이라 몇 번을 눌러도 서버에 생성 요청이 가지 않는다. 도표만 그때그때 다시 캡처한다.
// 🔴 폰트 실패에는 캡처 폴백을 만들지 않는다. 본문이 content-visibility 로 접혀 있어 화면을
//    찍으면 빈 페이지가 되고, 읽을 수 없는 문서를 주느니 못 만든다고 말하는 편이 낫다.
//    **웹 리포트는 그대로 남으므로 결과 유실이 아니다.**

import type { Locale as ViewerLocale } from "@/app/human-design/_copy";
import { useCallback, useState } from "react";

import { say } from "../_lib/copy";
import type { HdChart } from "../../_lib/types";
import type { ReportPlan } from "../_lib/types";
import styles from "../report.module.css";

type Props = {
  plan: ReportPlan;
  chart: HdChart;
  /** 🔴 화면 크롬의 언어(다섯). 본문 언어와 다른 축이다 — 본문은 bodyLocale/ReportLocale 을 받는다. */
  locale: ViewerLocale;
};

export default function ReportDownload({ plan, chart, locale }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");

  const download = useCallback(() => {
    if (busy) return;
    setBusy(true);
    setError("");
    setProgress({ done: 0, total: plan.chartSlots.length });

    void (async () => {
      try {
        const [{ captureChartSlots }, { exportHumanDesignReportPdf, HumanDesignPdfFontError }] = await Promise.all([
          import("../_lib/capture-chart-slots"),
          import("@/lib/pdf/export-human-design-report-pdf"),
        ]);

        const images = await captureChartSlots(
          chart,
          plan.chartSlots,
          plan.locale,
          (done, total) => setProgress({ done, total }),
        );

        try {
          await exportHumanDesignReportPdf({
            plan,
            images,
            // 🔴 파일명에 생년월일·이름을 넣지 않는다 — 표지와 같은 경계다.
            fileName: `human-design-report-${plan.locale}-${new Date().toISOString().slice(0, 10)}.pdf`,
            date: new Date().toLocaleDateString(plan.locale === "en" ? "en-US" : "ko-KR"),
          });
        } catch (cause) {
          if (cause instanceof HumanDesignPdfFontError) {
            setError(say("pdfFontFailed", locale));
            return;
          }
          throw cause;
        }
      } catch {
        setError(say("pdfFailed", locale));
      } finally {
        setBusy(false);
      }
    })();
  }, [busy, chart, locale, plan]);

  return (
    <div className={styles.download}>
      <button type="button" className={styles.downloadButton} onClick={download} disabled={busy}>
        {busy ? say("pdfBuilding", locale) : say("pdfDownload", locale)}
      </button>
      {busy && progress.total > 0 && (
        <p className={styles.downloadNote} aria-live="polite">
          {say("pdfCharts", locale)} {progress.done} / {progress.total}
        </p>
      )}
      {!busy && !error && <p className={styles.downloadNote}>{say("pdfNote", locale)}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
