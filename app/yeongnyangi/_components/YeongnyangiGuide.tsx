import PublicRecordLink from '@/app/components/PublicRecordLink';
import {products,systemNames,packages,type Product} from '@/worker/yeongnyangi/payments/catalog';
import {questionScopes,FOLLOWUP_LIMITS} from '@/worker/yeongnyangi/fortune/ask/question-policy';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import SampleExposure from './SampleExposure';
import styles from './yeongnyangi-guide.module.css';
import CraftedProductDetail from '@/app/components/CraftedProductDetail';
import craftedOverview from '@/content/product-details/yeongnyangi-overview/manifest.json';
import resultSamples from '@/lib/marketing/result-samples.json';
import {FUSION_BOOK_CHAPTERS,FUSION_BOOK_TARGETS} from '@/worker/yeongnyangi/fortune/fusion-book';

// Server-rendered guide for the indexed /yeongnyangi/ landing ("사주 보는 고양이" brand query).
// 🔴 Prices come from the payment catalog; scope and followups from the question policy — never type them here.
//    No reviews, ratings or sales counts: there are none we can show truthfully.
const DOMAINS:DomainId[]=['saju','ziwei','sukuyo','vedic','astrology','tarot'];
const TIERS=['mackerel','salmon','flounder','tuna'] as const;
const won=(amount:number)=>`${amount.toLocaleString('ko-KR')}원`;
const single=(domain:DomainId,fish:string)=>{const p=products.find(item=>item.readingKind==='single'&&item.domain===domain&&item.fishId===fish);if(!p)throw new Error(`영냥이 상품 없음: ${domain}_${fish}`);return p;};
const tierRows=TIERS.map(tier=>{const items=DOMAINS.map(domain=>single(domain,tier));const prices=[...new Set(items.map(p=>p.priceKRW))];if(prices.length!==1)throw new Error(`영냥이 ${tier} 가격이 체계마다 다르다: ${prices.join(',')}`);return {tier,name:packages[tier].name,price:prices[0],depth:questionScopes[tier],followups:FOLLOWUP_LIMITS[tier]};});
export const LOWEST_PRICE=won(tierRows[0].price);
const SYSTEMS=DOMAINS.map(domain=>systemNames[domain]).join(', ');
const tarotExcerpts=(()=>{
 const excerpts=resultSamples.find(sample=>sample.id==='yn-tarot')?.excerpts;
 if(!excerpts||excerpts.length<4)throw new Error('Yeongnyangi tarot sample requires four source excerpts.');
 return excerpts;
})();

export const YEONGNYANGI_FAQS=[
 {question:'사주 보는 고양이 영냥이는 어떤 서비스인가요?',answer:`영냥이는 꿀꿀운세(CODE DESTINY)가 운영하는 유료 운세 상담 캐릭터예요. ${SYSTEMS} 중 하나를 골라 한 가지 고민을 챕터로 나눠 읽어 줘요. "사주보는고양이"처럼 붙여 써서 찾아도 같은 서비스예요.`},
 {question:'운세보는 영냥이와 꿀꿀 운세는 어떤 관계인가요?',answer:'운세보는 영냥이는 꿀꿀 운세 안의 사주보는 고양이 상담 서비스예요. 운영자는 CODE DESTINY(코드 데스티니)로 같고, 공식 홈페이지는 https://code-destiny.com/, 영냥이 상담 입구는 https://code-destiny.com/yeongnyangi/예요.'},
 {question:'가장 저렴한 상담은 얼마인가요?',answer:`고등어 상담이 ${LOWEST_PRICE}이고, 여섯 체계 모두 같은 가격이에요. 결제창에서 총액과 적용 수단을 한 번 더 확인한 뒤에 결제돼요.`},
 {question:'결제하고 나면 결과는 언제, 어디서 보나요?',answer:'결제가 확인되면 영냥이가 상담을 쓰기 시작해요. 보통 몇 분 안에 완성되고, 화면을 닫아도 같은 계정의 내 상담에서 이어서 확인하고 다시 열 수 있어요.'},
 {question:'상담이 만들어지지 않으면 어떻게 되나요?',answer:'내 상담 화면에서 진행 상태를 확인할 수 있어요. 문제가 계속되면 결제 내역과 함께 문의하기로 알려 주세요. 환불 기준은 환불 정책을 따라요.'},
 {question:'꿀꿀운세의 무료 운세와는 무엇이 다른가요?',answer:'무료 페이지는 정해진 항목의 계산 결과와 기본 풀이를 보여 줘요. 영냥이 상담은 같은 계산을 출발점으로 삼아 내가 고른 주제와 질문을 반영한 글을 새로 쓰고, 결과를 계정에 보관해요.'},
];

export default function YeongnyangiGuide(){
 return <article className={styles.guide} aria-labelledby="yn-guide-title">
  <section id="yn-receive">
   <h2 id="yn-guide-title">한 가지 질문에서, 차분히 읽는 한 권까지</h2>
   <p>궁금한 점의 답부터 읽고, 그 판단의 근거와 반복되는 패턴, 지금 해볼 행동을 챕터별로 살펴보세요. 사주·자미두수·숙요점·베다점·점성술·타로 가운데 원하는 방식으로 시작할 수 있어요.</p>
   <details><summary>더 깊이 읽는 상담 구성</summary><p>여러 관점으로 깊이 읽고 싶다면 <a href="/yeongnyangi/fortune/?product=fusion_all">오마카세 전체 리포트</a>에서 여섯 체계의 독립 해석과 인생 전반, 실행·점검 계획을 이어 읽어요.</p>
   <p className={styles.volume}><strong>{FUSION_BOOK_CHAPTERS.omakase}개 챕터</strong><span>오마카세 본문 {(FUSION_BOOK_TARGETS.omakase[1]/10000).toFixed(1)}만 자까지 목표로 구성</span></p>
   <p className={styles.note}>오마카세 기준이며 모든 상담에 같은 분량이 적용되지는 않아요. 실제 글 길이는 질문과 생성 결과에 따라, PDF 페이지 수는 편집에 따라 달라져요. 선택한 상담의 구성과 가격은 결제 전에 확인해요.</p></details>
  </section>
  <section id="yn-example" aria-labelledby="yn-example-title">
   <h2 id="yn-example-title">실제 상담은 이렇게 이어져요</h2>
   <p>“지금 회사에 남을까, 다른 길로 옮길까?”</p>
   <p className={styles.note}>가상 프로필로 생성한 영냥이 타로·연어 샘플에서 발췌했어요. 전체 샘플은 약 3.5만 자이며 아래는 그 일부예요. 실제 고객 후기가 아니며 현재 상품의 보장 분량을 뜻하지 않아요.</p>
   <blockquote className={styles.sample}>
    <h3>카드가 보여주는 마음의 흐름</h3>
    <p>{tarotExcerpts[0]}</p>
    <h3>현실의 조건과 다음 행동</h3><p>{tarotExcerpts[2]}</p>
    <details><summary>영냥이의 해석 더 읽기</summary><p>{tarotExcerpts[1]}</p><p>{tarotExcerpts[3]}</p><a href="https://claude.ai/artifact/PtPUfhaiHM37ebpxtr4nQV" target="_blank" rel="noopener noreferrer">가상 프로필 상담 원문 모음 읽기 (새 창)</a></details>
   </blockquote>
   <p><a href="/yeongnyangi/fortune/?domain=tarot">타로 상담 구성 보기</a> · <a href="/consultation-samples/">다른 상담 결과 예시 보기</a></p>
   <SampleExposure targetId="yn-example" itemId={single('tarot','salmon').cdFeatureKey}/>
  </section>

  <section id="yn-prices" aria-labelledby="yn-prices-title">
   <h2 id="yn-prices-title">상담 가격</h2>
   <p>생선별로 다루는 범위와 추가 질문 횟수가 달라요. 모든 생선에서 답과 근거, 생활 속 예시와 행동 조언을 담아요.</p>
   <div className={styles.tableWrap}><table>
    <caption>영냥이 단일 체계 상담 가격과 구성</caption>
    <thead><tr><th scope="col">가격</th><th scope="col">추가 질문</th><th scope="col">질문 상담 범위</th></tr></thead>
    <tbody>{tierRows.map(row=><tr key={row.tier}><th scope="row">{won(row.price)}<span className={styles.tierName}>{row.name}</span></th><td>{row.followups}회</td><td>{row.depth}</td></tr>)}</tbody>
   </table></div>
  </section>

  <section id="yn-faq" aria-labelledby="yn-faq-title">
   <h2 id="yn-faq-title">영냥이 자주 묻는 질문</h2>
   <div className={styles.faq}>{YEONGNYANGI_FAQS.map(item=><details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
   <details className={styles.craftedOverview}><summary>상담 방식과 전체 구성 자세히 보기</summary><CraftedProductDetail detail={craftedOverview}/><PublicRecordLink/></details>
   <p className={styles.note}>함께 보기: <a href="/ggulggul/">꿀꿀운세 홈</a> · <a href="/yeongnyangi/1000-won-fortune/">천원 사주 리포트</a> · <a href="/yeongnyangi/library/">내 상담</a> · <a href="/privacy/">개인정보 처리방침</a></p>
  </section>
 </article>;
}
