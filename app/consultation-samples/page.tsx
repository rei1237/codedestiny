import type {Metadata} from 'next';
import ResultSamples from '@/app/components/ResultSamples';
import SampleSurface from '@/app/components/SampleSurface';
import samples from '@/lib/marketing/result-samples.json';
import {MOONSTONE_MIN_PRODUCT_KRW} from '@/worker/lib/paid-feature-registry.js';
import './samples-landing.css';

export const metadata: Metadata = {
  title: '상담별 구성과 예시 | 꿀꿀 운세',
  description: '초융합·인연의 서·연애 비책·신년운세·네오·연이·인생의 책. 나의 고민에 맞는 상담을 비교하고 상세 구성과 결과 예시를 읽어 보세요.',
  alternates: {canonical: 'https://code-destiny.com/consultation-samples/'},
};

export default function ConsultationSamplesPage() {
  return <main className="samples-landing" lang="ko">
    <nav className="samples-landing__nav" aria-label="상담 예시 탐색">
      <a href="/ggulggul/">꿀꿀 운세</a><a href="#compare-readings">상담 비교하기</a><a href="/yeongnyangi/room/#sorting-hat">영냥이 만나기</a>
    </nav>
    <header className="samples-landing__hero">
      <div><p className="samples-landing__eyebrow">나의 고민에서 시작하는 상담</p>
        <h1>지금 내 이야기,<br/>누구와 나눌까요?</h1>
        <p>마음을 다독이는 편지부터 선택을 돕는 전략까지.<br/>상담마다 다른 시선과 받게 될 내용을 살펴보세요.</p>
        <a className="samples-landing__button" href="#compare-readings">일곱 가지 상담 비교하기 <span aria-hidden="true">↓</span></a>
      </div>
      <SampleSurface><figure className="samples-landing__portrait"><img src="/images/home/yeoni-tea-together-v1-1200.webp" width="1200" height="800" alt="따뜻한 찻집에서 이야기를 기다리는 연이" fetchPriority="high"/><figcaption>마음이 향하는 이야기부터, 천천히 골라 보세요.</figcaption></figure></SampleSurface>
    </header>
    <nav className="samples-landing__choices" aria-label="일곱 가지 대표 상담 바로가기">
      {samples.filter(item => item.group === '대표 상담').map(item => <a key={item.id} href={'#landing-sample-' + item.id}>{item.title}</a>)}
    </nav>
    <div id="compare-readings"><ResultSamples prefix="landing-sample" mode="comparison"/></div>
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
