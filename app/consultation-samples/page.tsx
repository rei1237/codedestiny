import type {Metadata} from 'next';
import ResultSamples from '@/app/components/ResultSamples';
import SampleSurface from '@/app/components/SampleSurface';
import samples from '@/lib/marketing/result-samples.json';
import {MOONSTONE_MIN_PRODUCT_KRW} from '@/worker/lib/paid-feature-registry.js';
import {NEO_POLICY} from '@/lib/neo-consultation/policy';
import './samples-landing.css';

export const metadata: Metadata = {
  title: '사주·운세 상담 비교 | 인연의 서·마스터·네오 이메일 상담',
  description: '연애 패턴과 두 사람의 관계에 맞는 상담을 찾아보세요. 인연의 서 개인·궁합판, 마스터별 AI 상담과 네오 이메일 상담의 차이·결과 예시·이용 조건을 비교합니다.',
  alternates: {canonical: 'https://code-destiny.com/consultation-samples/'},
};

export default function ConsultationSamplesPage() {
  return <main className="samples-landing" lang="ko">
    <nav className="samples-landing__nav" aria-label="상담 예시 탐색">
      <a href="/ggulggul/">꿀꿀 운세</a><a href="#compare-readings">상담 비교하기</a><a href="#neo-email">네오 이메일 상담</a><a href="/yeongnyangi/room/#sorting-hat">영냥이 만나기</a>
    </nav>
    <header className="samples-landing__hero">
      <div><h1>사주·운세 상담,<br/>내 고민에 맞게 골라요.</h1>
        <p>비슷하게 끝나는 연애, 자꾸 엇갈리는 두 사람, 결정하기 어려운 일.<br/>지금 풀고 싶은 질문부터 고르고, 결제 전에 결과 예시와 상담 방식을 확인해 보세요.</p>
        <a className="samples-landing__button" href="#compare-readings">일곱 가지 상담 비교하기 <span aria-hidden="true">↓</span></a>
      </div>
      <SampleSurface><figure className="samples-landing__portrait"><img src="/images/home/yeoni-tea-together-v1-1200.webp" width="1200" height="800" alt="따뜻한 찻집에서 이야기를 기다리는 연이" fetchPriority="high"/><figcaption>마음이 향하는 이야기부터, 천천히 골라 보세요.</figcaption></figure></SampleSurface>
    </header>
    <nav className="samples-landing__choices" aria-label="일곱 가지 대표 상담 바로가기">
      {samples.filter(item => item.group === '대표 상담').map(item => <a key={item.id} href={'#landing-sample-' + item.id}>{item.title}</a>)}
    </nav>
    <div id="compare-readings"><ResultSamples prefix="landing-sample" mode="comparison"/></div>
    <section className="samples-landing__email" id="neo-email" aria-labelledby="neo-email-title">
      <div><h2 id="neo-email-title">내 사정까지 읽어 줬으면 한다면,<br/>네오 작전 결정서.</h2>
        <p>운세를 읽고도 결정이 서지 않을 때가 있어요. 지금 처한 상황과 고민을 적어 보내면, 네오가 접수 내용을 직접 읽고 답변을 검수해요.</p>
        <a className="samples-landing__button" href="/neo-consultation/">이메일 상담 조건 확인하기 →</a>
      </div>
      <div className="samples-landing__email-info">
        <h3>답변을 받는 방식</h3><p>{NEO_POLICY.service}</p>
        <h3>전달 시간과 접수 한도</h3><p>{NEO_POLICY.delivery}</p><p>{NEO_POLICY.capacity}</p>
        <p>질문별 풀이 방식과 금액은 접수 화면에서 확인할 수 있어요. 판단과 행동을 AI 상담으로 정리하고 싶다면 <a href="/neo-operation-room/">네오의 팩폭 작전실</a>을 살펴보세요.</p>
      </div>
    </section>
    <section className="samples-landing__questions" aria-labelledby="consultation-questions-title">
      <h2 id="consultation-questions-title">상담을 고르기 전에 궁금한 것</h2>
      <details><summary>인연의 서 개인판과 궁합판, 무엇이 다른가요?</summary><p>개인판은 내가 끌리는 사람과 감정 표현·갈등의 반복 패턴을 읽어요. 궁합판은 두 사람의 정보를 함께 놓고 차이와 조율할 지점을 살펴봐요. 상대 정보 없이 상대의 성향까지 해석하는 상품은 아니에요. <a href="/master-love-codex/">인연의 서 구성과 예시 보기</a></p></details>
      <details><summary>마스터 상담과 네오 이메일 상담은 어떻게 고르나요?</summary><p>마스터 상담은 선택한 분야와 해석 체계에 따라 AI가 상담문을 작성해요. 각 상세페이지에서 담당 마스터와 결과 예시를 확인해 보세요. 네오 작전 결정서는 접수 내용을 네오가 직접 읽고 답변을 작성·검수해 이메일로 보내는 별도 서비스예요. 실시간 대화 상담은 아니에요.</p></details>
      <details><summary>가격과 이용권·월정석 조건은 어디에서 확인하나요?</summary><p>상담별 상세페이지와 결제 화면에서 해당 상품의 가격과 적용 가능한 이용권·월정석·단건 결제 조건을 확인해 주세요. 모든 상담에 같은 이용권이나 월정석 조건이 적용되는 것은 아니에요. 결과 예시를 먼저 읽고 필요한 범위의 상담을 선택해 보세요.</p></details>
    </section>
    <section className="samples-landing__benefit" aria-labelledby="sample-benefit-title">
      <img src="/assets/mascot/yeoni-moonstone-reward-v1-320.webp" width="320" height="320" loading="lazy" alt="월정석을 소개하는 연이"/>
      <div><h2 id="sample-benefit-title">마음에 맞는 상담을 골랐다면,<br/>월정석 사용 조건도 확인해 보세요.</h2>
        <p>월정석은 <strong>{MOONSTONE_MIN_PRODUCT_KRW.toLocaleString('ko-KR')}원 이상 대상 상품</strong>에 사용할 수 있어요. 부분 할인을 지원하는 상담에서는 보유 월정석을 적용해 실제 결제 금액을 줄일 수 있어요.</p>
        <p>상품별 사용 조건과 잔액·만료일을 확인해 주세요. 프로필 활동에 따른 레벨 보상, 공개 승인된 후기, 확인·승인된 버그 제보로도 월정석을 받을 수 있어요.</p>
        <a href="/points/">내 월정석과 사용 조건 확인하기 →</a>
      </div>
    </section>
    <section className="samples-landing__finish"><h2>아직 어떤 상담이 맞을지 고민된다면</h2><p>영냥이의 모자와 함께 지금 마음에 걸리는 질문부터 찾아보세요.</p><a className="samples-landing__button" href="/yeongnyangi/room/#sorting-hat">영냥이의 모자 써보기 →</a><a href="/ggulggul/#cdhMore">전체 운세 둘러보기 →</a></section>
  </main>;
}
