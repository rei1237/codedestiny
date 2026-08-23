"use client";

// 휴먼 디자인 프리미엄 리포트 — 읽기 화면.
//
// 🔴 /human-design 안에 따로 라우트를 둔 이유:
//    ① AppChrome 이 접두사로 매칭하므로 등록 없이 크롬리스 + 자체 나브를 그대로 물려받는다.
//    ② HumanDesignClient 는 이미 720줄이라 18장 리더를 얹으면 스크롤 옵저버 틱마다 출생 폼까지
//       리렌더된다.
//    ③ 재열람이 URL(`?reportId=`)로 성립해야 요구 31·32 가 지켜진다.
//
// 🔴 본문 언어는 저장된 report.locale 이다. 뷰어 언어가 아니다 — 그래야 ko 리포트를 en
//    브라우저에서 열어도 웹과 PDF 가 같은 것을 낸다(요구 3). 뷰어 언어는 크롬에만 쓴다.
//
// 🔴 화면이 리포트 문장을 만들지 않는다. 모든 본문은 lib/human-design/report-plan.js 가 만든
//    블록에서 오고, PDF 는 같은 함수의 같은 배열을 조판한다.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { postPaidBody } from "@/app/nakshatra/nakshatra-fetch";
import { buildHumanDesignReportPlan, buildReportCoverFacts } from "@/lib/human-design/report-plan";
import { reportContents } from "@/lib/human-design/report-sections";

import type { HdChart } from "../_lib/types";
import ReportCover from "./_components/ReportCover";
import GenerationProgress from "./_components/GenerationProgress";
import ReportChapter from "./_components/ReportChapter";
import ReportLockedPanel from "./_components/ReportLockedPanel";
import ReportRail from "./_components/ReportRail";
import { say } from "./_lib/copy";
import type { ReportLocale, ReportPlan } from "./_lib/types";
import { useActiveChapter, useReadingProgress } from "./_lib/useActiveChapter";
import { useReportGeneration } from "./_lib/useReportGeneration";
import styles from "./report.module.css";

/** 차트 화면이 남긴 출생 입력. 리포트는 이 값으로 같은 차트를 다시 불러온다. */
const BIRTH_STORAGE_KEY = "cd_hd_birth_v1";

type BirthInput = {
  birthDate: string;
  birthTime: string;
  timezone: string;
  calendar: string;
};

function readBirth(): BirthInput | null {
  try {
    const raw = window.sessionStorage.getItem(BIRTH_STORAGE_KEY) || window.localStorage.getItem(BIRTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BirthInput>;
    if (!parsed.birthDate || !parsed.birthTime || !parsed.timezone) return null;
    return {
      birthDate: String(parsed.birthDate),
      birthTime: String(parsed.birthTime),
      timezone: String(parsed.timezone),
      calendar: String(parsed.calendar || "solar"),
    };
  } catch {
    return null;
  }
}

export default function HumanDesignReportClient({ locale = "ko" }: { locale?: ReportLocale }) {
  const [birth, setBirth] = useState<BirthInput | null>(null);
  const [chart, setChart] = useState<HdChart | null>(null);
  const [inputHash, setInputHash] = useState("");
  const [chartError, setChartError] = useState("");
  const articleRef = useRef<HTMLDivElement | null>(null);

  // ① 무료 차트를 먼저 확보한다. 리포트의 표·도표·근거가 전부 이 계산에서 나오고,
  //    아카이브 히트면 재계산 없이 즉시 돌아온다.
  useEffect(() => {
    const stored = readBirth();
    if (!stored) {
      setChartError(say("needChart", locale));
      return;
    }
    setBirth(stored);
    let cancelled = false;
    void (async () => {
      // 차트 화면과 **같은 본문 모양**으로 보낸다. 서버가 같은 inputHash 를 유도해야 이미
      // 계산된 차트에 그대로 붙고, 리포트도 그 해시로 자기 차트를 찾는다.
      const { data } = await postPaidBody("/api/human-design/chart", { birth: stored });
      if (cancelled) return;
      if (!data?.ok || !data.chart) {
        setChartError(typeof data?.message === "string" && data.message ? data.message : say("serverError", locale));
        return;
      }
      setChart(data.chart as HdChart);
      setInputHash(String(data.inputHash || ""));
    })();
    return () => { cancelled = true; };
  }, [locale]);

  const generation = useReportGeneration({
    inputHash,
    locale,
    birth: birth as unknown as Record<string, unknown> | null,
    uiLocale: locale,
  });

  const { doc, phase } = generation;

  // ② 저장된 리포트 + 차트 → 웹/PDF 공용 플랜.
  const plan = useMemo<ReportPlan | null>(() => {
    if (!chart || !doc || !doc.sections?.length) return null;
    return buildHumanDesignReportPlan(doc, chart) as ReportPlan;
  }, [chart, doc]);

  const chapterKeys = useMemo(() => (plan?.chapters || []).map((chapter) => chapter.key), [plan]);
  const activeKey = useActiveChapter(chapterKeys, phase === "reading" || phase === "generating");
  useReadingProgress(articleRef, phase === "reading");

  const contents = useMemo(() => reportContents(locale), [locale]);
  const planEntries = generation.planEntries.length ? generation.planEntries : contents;

  // 결제 전에도 보여 줄 수 있는 것은 무료 차트에서 나온 확정값뿐이다. 표지와 **같은 함수**를
  // 쓰므로 결제 전후로 값이 달라 보이는 일이 없다.
  const lockedFacts = useMemo(() => (chart ? buildReportCoverFacts(chart, locale) : []), [chart, locale]);

  const bodyLocale: ReportLocale = doc?.locale === "en" ? "en" : "ko";

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <Link className={styles.exit} href="/human-design">{say("back", locale)}</Link>
        <span className={styles.topTitle}>{say("pageTitle", locale)}</span>
        <Link className={styles.exit} href="/">{say("home", locale)}</Link>
      </div>

      {chartError && (
        <section className={styles.notice}>
          <p className={styles.error} role="alert">{chartError}</p>
          <Link className={styles.buyButton} href="/human-design">{say("goBuildChart", locale)}</Link>
        </section>
      )}

      {!chartError && !chart && (
        <p className={styles.notice} aria-busy="true">{say("loading", locale)}</p>
      )}

      {chart && phase === "locked" && (
        <ReportLockedPanel
          locale={locale}
          facts={lockedFacts}
          contents={contents}
          busy={generation.busy}
          error={generation.error}
          onPurchase={generation.purchase}
        />
      )}

      {chart && phase === "error" && (
        <section className={styles.notice}>
          <p className={styles.error} role="alert">{generation.error}</p>
          <button type="button" className={styles.buyButton} onClick={generation.resume}>
            {say("resume", locale)}
          </button>
        </section>
      )}

      {chart && phase === "generating" && (
        <GenerationProgress
          entries={planEntries}
          completedKeys={generation.completedKeys}
          total={doc?.progress?.total || contents.length}
          elapsedMs={generation.elapsedMs}
          locale={locale}
        />
      )}

      {chart && plan && (phase === "reading" || phase === "generating") && (
        <div className={styles.reader} ref={articleRef}>
          <ReportCover cover={plan.cover} stats={plan.stats} locale={locale} bodyLocale={bodyLocale} />

          {doc?.degraded && <p className={styles.degraded} role="status">{say("degradedNotice", locale)}</p>}

          <div className={styles.readerBody}>
            <ReportRail
              chapters={plan.chapters}
              activeKey={activeKey}
              label={say("contents", locale)}
            />
            <article className={styles.article} lang={bodyLocale}>
              {plan.chapters.map((chapter) => (
                <ReportChapter key={chapter.key} chapter={chapter} chart={chart} locale={bodyLocale} />
              ))}
            </article>
          </div>
        </div>
      )}
    </main>
  );
}
