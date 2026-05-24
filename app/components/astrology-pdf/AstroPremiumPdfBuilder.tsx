import type { AstroPremiumReportData } from "@/types/astro-premium-report";
import Chapter1_Intro from "./Chapter1_Intro";
import Chapter2_BigThree from "./Chapter2_BigThree";

type Props = {
  report: AstroPremiumReportData | null | undefined;
};

export default function AstroPremiumPdfBuilder({ report }: Props) {
  if (!report) {
    return <div>리포트 데이터가 없어 PDF 챕터를 렌더링할 수 없습니다.</div>;
  }

  return (
    <article>
      <Chapter1_Intro chapter={report.chapters.I} />
      <Chapter2_BigThree chapter={report.chapters.II} />
      <section>
        <h2>III~XII 챕터</h2>
        <p>샘플 마이그레이션 단계로 Chapter 1~2만 컴포넌트 분리가 적용되었습니다.</p>
      </section>
    </article>
  );
}
