import LifeBookAiRouteClient from "./LifeBookAiRouteClient";
import ServiceIntroSection from "../components/ServiceIntroSection";
import ImmersiveRelatedLinks from "../components/ImmersiveRelatedLinks";

export const metadata = {
  title: "인생 총운 | 사주로 보는 평생 운세 리포트 — 인생의 책",
  description: "생년월일로 세운 사주 명식의 흐름을 따라 인생 전체의 큰 결을 읽는 평생 운세 리포트입니다. 삶과 일, 관계와 재물의 방향과 시기를 정리해 드립니다.",
  alternates: {
    canonical: "https://code-destiny.com/life-book-ai/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function LifeBookAiPage() {
  return (
    <>
      <LifeBookAiRouteClient />
      <ServiceIntroSection label="인생의 책 전문가 상담 안내">
        <h1>인생 총운 — 사주로 보는 평생 운세 리포트</h1>
        <p>
          인생의 책은 한 사람의 명식에 오래 흐르는 계절과 기질을 따라 삶의 큰 장면을 천천히 펼쳐 봅니다.
          어린 시절부터 지금까지 반복된 선택의 결, 관계 안에서 마음이 움직이는 방식, 일과 재물의 흐름이 머무는 자리,
          앞으로 더 밝게 열어야 할 방향을 긴 호흡의 상담 문장으로 엮습니다.
        </p>
        <p>
          사주는 삶을 단정하기 위한 도구가 아니라 지금의 나를 더 깊게 이해하기 위한 거울입니다.
          이 상담은 사용자가 입력한 생년월일과 시간의 흐름을 바탕으로, 강하게 타고난 힘과 조심스럽게 다루어야 할 습관을 함께 비춥니다.
          당신의 시간이 충분히 정리되면, 삶의 큰 장면은 한 장씩 조용히 펼쳐지고 오래 묻어 둔 질문에도 새로운 문장이 머물기 시작합니다.
        </p>
      </ServiceIntroSection>
      <ImmersiveRelatedLinks fromPath="/life-book-ai" />
    </>
  );
}
