import {products,systemNames,packages,type Product} from '@/worker/yeongnyangi/payments/catalog';
import {depthDescriptions} from '@/worker/yeongnyangi/fortune/reading-policy';
import {consultationChapterCounts} from '@/worker/yeongnyangi/fortune/consultation-kinds';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import SampleExposure from './SampleExposure';
import styles from './yeongnyangi-guide.module.css';

// Server-rendered guide for the indexed /yeongnyangi/ landing ("사주 보는 고양이" brand query).
// 🔴 Prices and chapter counts come from the payment catalog at build time — never type them here.
//    No reviews, ratings or sales counts: there are none we can show truthfully.
const DOMAINS:DomainId[]=['saju','ziwei','sukuyo','vedic','astrology','tarot'];
const TIERS=['mackerel','salmon','flounder','tuna'] as const;
const won=(amount:number)=>`${amount.toLocaleString('ko-KR')}원`;
const single=(domain:DomainId,fish:string)=>{const p=products.find(item=>item.readingKind==='single'&&item.domain===domain&&item.fishId===fish);if(!p)throw new Error(`영냥이 상품 없음: ${domain}_${fish}`);return p;};
const chapterRange=(items:Product[])=>{const counts=items.flatMap(consultationChapterCounts);const min=Math.min(...counts),max=Math.max(...counts);return min===max?`${min}개`:`${min}~${max}개`;};
const tierRows=TIERS.map(tier=>{const items=DOMAINS.map(domain=>single(domain,tier));const prices=[...new Set(items.map(p=>p.priceKRW))];if(prices.length!==1)throw new Error(`영냥이 ${tier} 가격이 체계마다 다르다: ${prices.join(',')}`);return {tier,name:packages[tier].name,price:prices[0],chapters:chapterRange(items),depth:depthDescriptions[tier]};});
export const LOWEST_PRICE=won(tierRows[0].price);
const SYSTEMS=DOMAINS.map(domain=>systemNames[domain]).join(', ');

export const YEONGNYANGI_FAQS=[
 {question:'사주 보는 고양이 영냥이는 어떤 서비스인가요?',answer:`영냥이는 꿀꿀 운세(CODE DESTINY)가 운영하는 유료 운세 상담 캐릭터예요. ${SYSTEMS} 중 하나를 골라 한 가지 고민을 챕터로 나눠 읽어 줘요. "사주보는고양이"처럼 붙여 써서 찾아도 같은 서비스예요.`},
 {question:'가장 저렴한 상담은 얼마인가요?',answer:`고등어 상담이 ${LOWEST_PRICE}이고, 여섯 체계 모두 같은 가격이에요. 결제창에서 총액과 적용 수단을 한 번 더 확인한 뒤에 결제돼요.`},
 {question:'결제하고 나면 결과는 언제, 어디서 보나요?',answer:'결제가 확인되면 영냥이가 상담을 쓰기 시작해요. 보통 몇 분 안에 완성되고, 화면을 닫아도 같은 계정의 내 상담에서 이어서 확인하고 다시 열 수 있어요.'},
 {question:'상담이 만들어지지 않으면 어떻게 되나요?',answer:'내 상담 화면에서 진행 상태를 확인할 수 있어요. 문제가 계속되면 결제 내역과 함께 문의하기로 알려 주세요. 환불 기준은 환불 정책을 따라요.'},
 {question:'꿀꿀 운세의 무료 운세와는 무엇이 다른가요?',answer:'무료 페이지는 정해진 항목의 계산 결과와 기본 풀이를 보여 줘요. 영냥이 상담은 같은 계산을 출발점으로 삼아 내가 고른 주제와 질문을 반영한 글을 새로 쓰고, 결과를 계정에 보관해요.'},
];

export default function YeongnyangiGuide(){
 return <article className={styles.guide} aria-labelledby="yn-guide-title">
  <section>
   <p className={styles.kicker}>사주 보는 고양이 · 영냥이 안내</p>
   <h2 id="yn-guide-title">사주 보는 고양이 영냥이는 이런 곳이에요</h2>
   <p>영냥이는 꿀꿀 운세가 운영하는 달빛 점술방의 고양이예요. 생선 한 마리 값으로 {SYSTEMS} 가운데 한 체계를 골라, 지금 마음에 걸린 한 가지 고민을 천천히 읽어 줘요. 각 체계의 계산 엔진이 먼저 명식과 차트를 만들고, 그 계산을 근거로 AI가 영냥이의 말투로 해설을 써요.</p>
   <p>상담은 짧은 한 줄 운세가 아니에요. 왜 그렇게 읽었는지 근거를 먼저 보여 주고, 그 흐름이 생활에서 어떻게 드러나는지, 오늘 해볼 수 있는 행동이 무엇인지까지 챕터로 이어서 정리해요. 결과는 미래를 정해 주는 답이 아니라 선택을 돕는 참고 자료예요.</p>
  </section>

  <section id="yn-receive" aria-labelledby="yn-receive-title">
   <h2 id="yn-receive-title">결제하면 받는 것</h2>
   <ul className={styles.receive}>
    <li><strong>챕터로 나뉜 상담 글</strong> 고등어는 {tierRows[0].chapters}, 참치는 {tierRows[3].chapters} 챕터로 나뉘어요. 챕터마다 계산 근거, 해석, 실천할 행동을 담아요.</li>
    <li><strong>몇 분 안에 완성</strong> 결제가 확인되면 바로 쓰기 시작하고 보통 몇 분 안에 끝나요. 기다리는 동안 화면을 닫아도 상담은 계속 만들어져요.</li>
    <li><strong>내 상담에 보관</strong> 같은 CODE DESTINY 계정으로 로그인하면 <a href="/yeongnyangi/library/">내 상담</a>에서 언제든 다시 열 수 있어요.</li>
    <li><strong>문제가 생기면</strong> 진행 상태는 내 상담에서 확인하고, 해결되지 않으면 <a href="/contact/">문의하기</a>로 알려 주세요. 환불은 <a href="/refund-policy/">환불 정책</a>을 따라요.</li>
   </ul>
  </section>

  <section id="yn-example" aria-labelledby="yn-example-title">
   <h2 id="yn-example-title">상담 예시 한 단락</h2>
   <p className={styles.note}>아래는 가상 입력으로 만든 편집 예시예요. 실제 고객 데이터나 AI가 생성한 상담 원문이 아니에요.</p>
   <blockquote className={styles.sample}>
    <p>질문 · 선택할 때마다 오래 망설여요. 어떻게 결정하는 연습을 하면 좋을까요?</p>
    <p>영냥이 · 세부적인 차이를 살피는 태도는 네 장점이야. 다만 모든 불확실성이 사라질 때까지 기다리지는 말자. 되돌릴 수 있는 작은 선택부터 기한을 정해 두면, 결정하는 감각이 조금씩 몸에 붙을 거야.</p>
   </blockquote>
   <p><a href="/yeongnyangi/1000-won-fortune/#example">상담 예시와 체계별 목차 자세히 보기</a></p>
   <SampleExposure targetId="yn-example" itemId={single('saju','mackerel').cdFeatureKey}/>
  </section>

  <section id="yn-prices" aria-labelledby="yn-prices-title">
   <h2 id="yn-prices-title">생선별 상담 가격</h2>
   <p>여섯 체계 모두 같은 가격이고, 생선이 클수록 같은 체계를 더 많은 챕터와 분량으로 깊게 읽어요. 처음이라면 출생시간 없이도 가능한 사주 고등어 상담부터 시작해 보세요.</p>
   <div className={styles.tableWrap}><table>
    <caption>영냥이 단일 체계 상담 가격과 구성</caption>
    <thead><tr><th scope="col">생선</th><th scope="col">가격</th><th scope="col">챕터</th><th scope="col">상담 깊이</th></tr></thead>
    <tbody>{tierRows.map(row=><tr key={row.tier}><th scope="row">{row.name}</th><td>{won(row.price)}</td><td>{row.chapters}</td><td>{row.depth}</td></tr>)}</tbody>
   </table></div>
  </section>

  <section id="yn-faq" aria-labelledby="yn-faq-title">
   <h2 id="yn-faq-title">영냥이 자주 묻는 질문</h2>
   <div className={styles.faq}>{YEONGNYANGI_FAQS.map(item=><section key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></section>)}</div>
   <p className={styles.note}>함께 보기: <a href="/ggulggul/">꿀꿀 운세 홈</a> · <a href="/yeongnyangi/1000-won-fortune/">천원 운세·천원사주</a> · <a href="/yeongnyangi/library/">내 상담</a> · <a href="/privacy-policy/">개인정보 처리방침</a></p>
  </section>
 </article>;
}
