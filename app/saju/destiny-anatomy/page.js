import Link from "next/link";
import GuideCta from "../../components/GuideCta";
import { GUIDE_CTA_TARGETS } from "../../components/guide-cta-targets";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

export function generateMetadata() {
  return generatePageMetadata({path: "/saju/destiny-anatomy", title: "사주 뇌구조와 운명 구조도 | 꿀꿀 운세",
    description: "내 머릿속에는 어떤 생각이 가장 클까요? 사주 십성으로 읽는 뇌구조와 오행, 휴먼 디자인, 베다점의 차이를 알아보고 생활 리듬을 돌아보는 방법을 살펴보세요.",
    keywords: ["사주 뇌구조", "운명 구조도", "오행", "휴먼 디자인", "베다점", "꿀꿀 운세"]});
}

export default function DestinyAnatomyGuide() {
  return <main className="cd-main-shell cd-guide">
    <header className="cd-main-header">
      <h1>내 머릿속, 어떤 생각이 제일 클까요?</h1>
      <p>계획부터 세우는 나, 일단 해보고 싶은 나, 생각이 많아 시작이 늦어지는 나. 운명 구조도는 사주를 바탕으로 이런 차이를 뇌구조와 짧은 속마음으로 풀어내는 자기 이해 콘텐츠예요.</p>
      <p>사주 결과의 만세력 아래에서 ‘나의 뇌, 신체 구조는?’을 열어 보세요. 생각과 성향, 결정과 관계, 몸과 회복 루틴을 차례로 살펴볼 수 있어요.</p>
    </header>
    <section className="cd-card"><h2>재미있는 별명 뒤에는 계산 근거가 있어요</h2>
      <p>사주의 십성은 일간을 기준으로 다른 글자와의 관계를 읽는 방식이에요. 비겁·식상·재성·관성·인성의 다섯 묶음을 자기 주도, 표현, 현실 감각, 질서, 성찰의 주제로 정리해요. 뇌구조의 면적은 이 해석 비중을 표현하며 실제 뇌 활동이나 성격 검사의 측정값은 아니에요.</p>
      <p>예를 들어 성찰의 주제가 두드러지면 “생각 탭 여러 개 켜짐”으로 표현할 수 있어요. 깊이 살피는 장점과 시작이 늦어질 수 있는 패턴을 함께 읽고, 오늘 할 작은 행동으로 연결해요.</p>
    </section>
    <section className="cd-card"><h2>다른 체계를 하나로 뭉뚱그리지 않아요</h2>
      <dl><dt>사주와 오행</dt><dd>생년월일시의 명식으로 생각과 선택의 반복 패턴을 돌아봐요.</dd>
      <dt>휴먼 디자인</dt><dd>별도의 차트에서 타입·권위·센터를 읽어 결정 방식과 관계의 간격을 살펴봐요.</dd>
      <dt>베다점</dt><dd>달의 별자리, 라그나와 6하우스 등 실제로 계산된 항목을 근거로 전통적 해석을 설명해요.</dd>
      <dt>차크라</dt><dd>이 콘텐츠에서는 사주 십성·오행을 상징 지도에 옮겨 보여줘요. 베다점의 행성 계산이나 몸의 상태를 측정한 값은 아니에요.</dd></dl>
    </section>
    <section className="cd-card"><h2>몸 이야기는 생활을 점검하는 질문으로</h2>
      <p>오행이 강하거나 약하다는 이유로 특정 장기가 좋거나 나쁘다고 판단하지 않아요. 해석 근거를 확인하고 “쉴 틈 없이 다음 일을 붙이고 있나요?” 같은 질문으로 일상을 돌아본 뒤, 쉬는 간격이나 잠들기 전 정리처럼 작은 실천을 골라요.</p>
      <p>출생정보만으로 건강 상태를 알 수는 없어요. 불편함이 지속되면 의료 전문가에게 상담하세요. 생활 습관에 관한 일반 안내는 <a href="https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/how-to-fall-asleep-faster-and-sleep-better/" target="_blank" rel="noopener noreferrer">NHS 수면 안내</a>에서도 확인할 수 있어요. 이 자료는 운세 해석을 뒷받침하는 근거가 아니에요.</p>
    </section>
    <section className="cd-card"><h2>공유할 때는 재미있는 요약만</h2>
      <p>공유 카드에는 별명과 뇌구조 비중, 짧은 속마음을 담아요. 이름·생년월일·출생 시각·지역·건강 상세는 담지 않아요. 공유 링크는 다른 사람의 개인 결과가 아닌 이 안내 페이지로 연결돼요.</p>
    </section>
    <section className="cd-card"><h2>출생시간을 모르거나 로그인을 하지 않았다면?</h2>
      <p>기본 사주는 가능한 정보만으로 읽고, 출생시간이 필요한 휴먼 디자인과 베다점 설명은 만들어 넣지 않아요. 사주 결과 진입과 추가 차트 조회에는 기존 로그인 정책이 적용되며, 조회되지 않은 항목은 안내와 함께 구분해요.</p>
    </section>
    <GuideCta target={GUIDE_CTA_TARGETS["/saju/destiny-anatomy"]} />
    <nav className="cd-chip-wrap" aria-label="운명 구조도 관련 안내">
      <Link href="/saju/ten-gods" className="cd-chip">십성 해석</Link>
      <Link href="/saju/five-elements" className="cd-chip">오행 해석</Link>
      <Link href="/human-design/guide" className="cd-chip">휴먼 디자인 안내</Link>
      <Link href="/health-report/guide" className="cd-chip">명리 헬스 리포트 안내</Link>
    </nav>
  </main>;
}
