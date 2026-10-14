import type {Metadata} from 'next';
import ResultSamples from '@/app/components/ResultSamples';
import {MOONSTONE_MIN_PRODUCT_KRW} from '@/worker/lib/paid-feature-registry.js';
import './samples-landing.css';

export const metadata:Metadata={title:'상담 결과 미리보기 | 꿀꿀 운세',description:'연애 비책, 신년운세, 초융합 운세와 영냥이 상담의 답변·도식을 비교해 보세요. 결제 전에 나에게 맞는 상담을 고를 수 있어요.',alternates:{canonical:'https://code-destiny.com/consultation-samples/'}};
export default function ConsultationSamplesPage(){return <main className="samples-landing" lang="ko">
  <nav className="samples-landing__nav" aria-label="상담 예시 탐색"><a href="/ggulggul/">꿀꿀 운세</a><a href="#compare-readings">상담 비교하기</a><a href="/yeongnyangi/room/#sorting-hat">무료로 시작하기</a></nav>
  <header className="samples-landing__hero"><div><h1>좋은 상담은,<br/>내 질문에 답하는 것부터.</h1><p>“고백해도 될까?” “이직할까, 남을까?”<br/>막연한 운세가 내 상황을 짚는 이야기로 바뀌는 순간을 만나보세요.</p><p className="samples-landing__lead">결론만 듣고 끝내지 않도록.<br/>답변의 이유와 오늘 해볼 행동까지, 먼저 읽고 선택하세요.</p><a className="samples-landing__button" href="#compare-readings">내 고민에 맞는 결과 살펴보기 <span aria-hidden="true">↓</span></a></div><img src="/assets/yeongnyangi/reading-art/insight.webp" width="720" height="480" alt="수정구 앞에서 고민을 듣는 영냥이" fetchPriority="high"/></header>
  <section className="samples-landing__benefit" aria-labelledby="sample-benefit-title"><img src="/assets/mascot/yeoni-moonstone-reward-v1-320.webp" width="320" height="320" loading="lazy" alt="월정석을 소개하는 연이"/><div><h2 id="sample-benefit-title">보유 월정석으로,<br/>상담 결제 부담은 조금 가볍게.</h2><p>월정석은 <strong>{MOONSTONE_MIN_PRODUCT_KRW.toLocaleString('ko-KR')}원 이상 대상 상품</strong>에 사용할 수 있어요. 부분 할인을 지원하는 상담에서는 보유 월정석을 적용해 실제 결제 금액을 줄일 수 있어요.</p><p>상품별 사용 조건과 잔액·만료일을 확인해 주세요. 프로필 활동에 따른 레벨 보상, 공개 승인된 후기, 확인·승인된 버그 제보로도 월정석을 받을 수 있어요.</p><a href="/points/">내 월정석과 사용 조건 확인하기 →</a></div></section>
  <div id="compare-readings"><ResultSamples prefix="landing-sample"/></div>
  <section className="samples-landing__finish"><h2>오늘 마음에 걸리는 질문,<br/>하나부터 시작해 보세요.</h2><p>아직 상담을 고르기 어렵다면 영냥이의 모자와 무료 운세를 먼저 만나보세요.</p><a className="samples-landing__button" href="/yeongnyangi/room/#sorting-hat">영냥이의 모자 써보기 →</a><a href="/ggulggul/#cdhMore">전체 운세 둘러보기 →</a></section>
</main>;}
