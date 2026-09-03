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
import { resolveHumanDesignLocale, type Locale as ViewerLocale } from "../_copy";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";
import { PipelineField } from "../_components/PipelineScene";
import { BIRTH_STORAGE_KEY, readChartHandoff } from "../_lib/chart-handoff";
import ReportCover from "./_components/ReportCover";
import ReportDownload from "./_components/ReportDownload";
import GenerationProgress from "./_components/GenerationProgress";
import ReportChapter from "./_components/ReportChapter";
import ReportLockedPanel from "./_components/ReportLockedPanel";
import ReportRail from "./_components/ReportRail";
import { say } from "./_lib/copy";
import type { ReportLocale, ReportPlan } from "./_lib/types";
import { useActiveChapter, useReadingProgress } from "./_lib/useActiveChapter";
import { useReportGeneration } from "./_lib/useReportGeneration";
import scene from "./_components/generation-scene.module.css";
import styles from "./report.module.css";

/**
 * 차트 화면이 남긴 출생 입력. 리포트는 이 값으로 같은 차트를 얻는다.
 * 🔴 키와 인계 규격은 ../_lib/chart-handoff.ts 한 곳에만 둔다 — 두 화면이 각자 문자열을
 *    적어 두면 한쪽만 바뀌어도 아무도 실패하지 않고 조용히 어긋난다.
 */
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

/**
 * 🔴 화면 크롬의 언어는 런타임에서 읽는다. 2026-08-25 까지 page.tsx 가 locale="ko" 를 넘겨서
 *    이 화면의 영어 카피 41항목이 한 번도 렌더된 적이 없었다.
 *    본문 언어(bodyLocale)는 **저장된 report.locale** 이라 이것과 무관하다 — 아래에서 따로 구한다.
 */
function useReportViewerLocale(override?: ViewerLocale): ViewerLocale {
  const [locale, setLocale] = useState<ViewerLocale>(override || "ko");
  useEffect(() => {
    if (override) return;
    const sync = () => setLocale(resolveHumanDesignLocale(getCurrentLoadingLocale()));
    sync();
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, [override]);
  return locale;
}

export default function HumanDesignReportClient({ locale: localeOverride }: { locale?: ViewerLocale } = {}) {
  const locale = useReportViewerLocale(localeOverride);
  const [birth, setBirth] = useState<BirthInput | null>(null);
  const [chart, setChart] = useState<HdChart | null>(null);
  const [inputHash, setInputHash] = useState("");
  // 🔴 에러를 **번역된 문장**으로 들고 있지 않는다. 그러면 아래 이펙트가 locale 에 의존하게
  //    되고, locale 은 마운트 뒤에 이펙트로 재확정되므로(useReportViewerLocale) ko 가 아닌
  //    사용자는 차트 POST 가 **두 번** 나갔다. 키로 들고 있다가 렌더에서 번역한다.
  const [chartError, setChartError] = useState<{ key: "needChart" | "serverError" } | { text: string } | null>(null);
  const articleRef = useRef<HTMLDivElement | null>(null);

  // ① 무료 차트를 먼저 확보한다. 리포트의 표·도표·근거가 전부 이 계산에서 나오고,
  //    아카이브 히트면 재계산 없이 즉시 돌아온다.
  // 🔴 deps 가 비어 있는 것은 의도다. 여기 있는 값 중 리액티브한 것이 하나도 없어야
  //    "언어가 확정되면서 차트를 한 번 더 부르는" 이중 발화가 원리상 생기지 않는다.
  useEffect(() => {
    const stored = readBirth();
    if (!stored) {
      setChartError({ key: "needChart" });
      return;
    }
    setBirth(stored);

    // 같은 탭에서 차트 화면이 방금 받아 놓고 간 것이 있으면 서버에 다시 묻지 않는다.
    // 아카이브 히트여도 인증 + Mongo 왕복 한 벌은 그대로 들고, 그동안 화면은 비어 있었다.
    const handed = readChartHandoff(stored);
    if (handed) {
      setChart(handed.chart);
      setInputHash(handed.inputHash);
      return;
    }

    let cancelled = false;
    void (async () => {
      // 차트 화면과 **같은 본문 모양**으로 보낸다. 서버가 같은 inputHash 를 유도해야 이미
      // 계산된 차트에 그대로 붙고, 리포트도 그 해시로 자기 차트를 찾는다.
      const { data } = await postPaidBody("/api/human-design/chart", { birth: stored });
      if (cancelled) return;
      if (!data?.ok || !data.chart) {
        setChartError(
          typeof data?.message === "string" && data.message ? { text: data.message } : { key: "serverError" },
        );
        return;
      }
      setChart(data.chart as HdChart);
      setInputHash(String(data.inputHash || ""));
    })();
    return () => { cancelled = true; };
  }, []);

  const chartErrorText = chartError
    ? ("text" in chartError ? chartError.text : say(chartError.key, locale))
    : "";

  // 🔴 본문 언어는 뷰어 언어를 따르지 않는다. 서버 생성 계약이 ko|en 이고, 무엇보다
  //    이 값이 stableRequestId 에 들어가 **결제 요청 식별자**가 된다 — 바꾸면 지금까지
  //    ":ko" 로 만들던 사용자가 새 id 를 받아 재청구 위험이 생긴다. 본문 언어를 뷰어에
  //    맞추는 것은 서버 계약과 결제 검토가 함께 필요한 별도 작업이다.
  const bodyRequestLocale: ReportLocale = "ko";

  const generation = useReportGeneration({
    inputHash,
    locale: bodyRequestLocale,
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

      {chartErrorText && (
        <section className={styles.notice}>
          <p className={styles.error} role="alert">{chartErrorText}</p>
          <Link className={styles.buyButton} href="/human-design">{say("goBuildChart", locale)}</Link>
        </section>
      )}

      {/* 🔴 여기도 생성 화면과 **같은 씬**을 쓴다. 예전에는 맨 텍스트 한 줄이라 차트가 늦게
          오면 화면이 죽은 것처럼 보였다. 세 점은 진행률이 아니라 살아 있다는 표시다. */}
      {!chartErrorText && !chart && (
        <section className={`${scene.loading} ${scene.scene}`} aria-busy="true" aria-live="polite">
          <PipelineField />
          <p className={scene.loadingLine}>{say("loading", locale)}</p>
          <p className={scene.loadingDots} aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className={scene.loadingDot} style={{ ["--hd-gen-i" as string]: i }} />
            ))}
          </p>
        </section>
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

          {/* 🔴 생성이 끝난 뒤에만 내보낸다. 진행 중에 만들면 아직 안 쓰인 장이 빠진 PDF 가
              사용자 손에 남고, 그게 완성본인 줄 알게 된다. */}
          {phase === "reading" && <ReportDownload plan={plan} chart={chart} locale={locale} />}

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
