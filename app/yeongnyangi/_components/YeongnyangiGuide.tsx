import PublicRecordLink from '@/app/components/PublicRecordLink';
import {products,packages} from '@/worker/yeongnyangi/payments/catalog';
import {questionManifest,QUESTION_POLICY_VERSION} from '@/worker/yeongnyangi/fortune/ask/question-policy';
import {won,single,tierRows,LOWEST_PRICE,YEONGNYANGI_FAQS} from '@/worker/yeongnyangi/support-knowledge';
import styles from './yeongnyangi-guide.module.css';
import CraftedProductDetail from '@/app/components/CraftedProductDetail';
import craftedOverview from '@/content/product-details/yeongnyangi-overview/manifest.json';
import {FUSION_BOOK_CHAPTERS,FUSION_BOOK_TARGETS} from '@/worker/yeongnyangi/fortune/fusion-book';
import {consultationBudget} from '@/worker/yeongnyangi/fortune/consultation-budget';
import {EXPANDED_CHAPTERS} from '@/worker/yeongnyangi/fortune/consultation-expansion';
import ReviewProof from '@/app/components/ReviewProof';
import YeongnyangiFaqToon from './YeongnyangiFaqToon';
import YeongnyangiSampleMenu from './YeongnyangiSampleMenu';
import {readingSamples} from './yeongnyangi-examples';

// Server-rendered guide for the indexed /yeongnyangi/ landing ("사주 보는 고양이" brand query).
// 🔴 Prices, the FAQ and the price rows come from worker/yeongnyangi/support-knowledge (payment catalog + question policy),
//    shared with the S9 support desk — never type them here.
//    No typed reviews, ratings or sales counts. ReviewProof shows only purchase-verified reviews fetched on the client
//    (no structured data), and verified facts when there are none.
export {LOWEST_PRICE,YEONGNYANGI_FAQS};
const EXAMPLE_QUESTION='헤어진 뒤 연락이 없어요. 제가 먼저 연락해도 될까요?';
const mackerelChapters=questionManifest('saju','mackerel',{version:QUESTION_POLICY_VERSION,category:'love',target:'self',horizon:'current',period:'',situation:'헤어진 뒤 연락이 끊겼어요',options:'',constraints:'',confirmed:true},undefined,EXAMPLE_QUESTION);
if(mackerelChapters.length!==EXPANDED_CHAPTERS.mackerel)throw new Error(`영냥이 고등어 장 구성이 ${mackerelChapters.length}개다.`);

const fishRows=[...tierRows.map(row=>({...row,href:'/yeongnyangi/fortune/?flow=question&domain=saju&fish='+row.tier})),...(['assorted','omakase'] as const).map(tier=>{const product=products.find(p=>p.fishId===tier)!;return {tier,name:packages[tier].name,price:product.priceKRW,followups:consultationBudget(tier).followups,depth:tier==='assorted'?'두 체계의 해석과 생활 분야를 엮은 상세 상담서':'여섯 체계의 해석과 삶의 흐름을 담은 초융합 상담서',href:tier==='omakase'?'/yeongnyangi/fortune/?product=fusion_all':'/yeongnyangi/fortune/?domain=fusion'};})];

// 2026-10-28 단순화: 가격은 한 줄 행, 예시·깊은 구성·FAQ는 "결제 전에 알아두기" 한 묶음으로 접어 둔다. 접힌 본문도 서버 HTML에 남아 색인된다.
export default function YeongnyangiGuide(){
 return <article className={styles.guide} aria-labelledby="yn-prices-title">
  <section id="yn-prices" aria-labelledby="yn-prices-title">
   <h2 id="yn-prices-title">상담 가격</h2>
   <p>모든 생선에서 답과 근거, 생활 속 예시와 행동 조언을 담아요. 생선마다 다루는 범위와 추가 질문 횟수가 달라요.</p>
   <ul className={styles.fishList}>{fishRows.map(row=><li key={row.tier}><a className={styles.fishRow} href={row.href}>
    <img src={'/assets/yeongnyangi/fish/reaction-'+row.tier+'.webp'} width={128} height={128} alt="" loading="lazy"/>
    <span className={styles.fishText}><strong>{row.name}</strong><span className={styles.fishMeta}>{EXPANDED_CHAPTERS[row.tier]+'챕터 · '}{row.followups?'추가 질문 '+row.followups+'회':'추가 질문 없음'}{['tuna','assorted','omakase'].includes(row.tier)?' · PDF':''}</span></span>
    <span className={styles.fishPrice}>{won(row.price)}</span>
   </a></li>)}</ul>
   <details className={styles.panel}><summary>생선별로 살펴보는 범위</summary><dl className={styles.fishDepth}>{fishRows.map(row=><div key={row.tier}><dt>{row.name}</dt><dd>{row.tier==='mackerel'?'한 가지 고민도 답과 근거, 생활 속 해석과 지금 해볼 행동까지 챕터별로 충분히 살펴봐요.':row.depth}</dd></div>)}</dl></details>
   <p className={styles.note}>챕터 수는 신규 한국어 질문 상담 기준이며 상담 종류와 기존 구매에 따라 달라질 수 있어요. 추가 질문은 저장된 상담 근거로 답할 수 있는 범위에서 이용해요. PDF는 한국어 상담 완료 후 저장할 수 있어요.</p>
   <ReviewProof brand="yeongnyangi" productId="yeongnyangi" sampleHref="#yn-example" headingLevel={3}/>
  </section>

  <section id="yn-example" aria-labelledby="yn-example-title">
   <h2 id="yn-example-title">이런 상담을 받아요 · 미리 보기</h2>
   <YeongnyangiSampleMenu samples={readingSamples} tarotFeature={single('tarot','salmon').cdFeatureKey}/>
  </section>

  <section id="yn-faq-teaser" className={styles.teaser} aria-labelledby="yn-faq-teaser-title">
   <img src="/assets/yeongnyangi/expressions/curious.webp" width={128} height={128} alt="" loading="lazy" decoding="async"/>
   <div>
    <h2 id="yn-faq-teaser-title">결제 전에 궁금한 거 있냥?</h2>
    <p className={styles.teaserBubble}>가격, 상담 구성, 결과 보는 곳까지 영냥이가 컷으로 설명해 줄게냥.</p>
    <p><a className={styles.teaserLink} href="/yeongnyangi/faq/">영냥이에게 물어보기</a></p>
    <p className={styles.note}>영냥이 이야기가 궁금하면 <a href="/yeongnyangi/season-1/">영냥이 웹툰 시즌 1</a>부터 읽어 보라냥.</p>
   </div>
  </section>
 </article>;
}

// /yeongnyangi/faq/ 가 쓰는 "결제 전에 알아두기" + 웹툰풍 FAQ. 홈에서는 접힌 안내 대신 위 teaser 한 컷만 둔다.
export function YeongnyangiBeforeGuide(){
 return <article className={styles.guide} aria-labelledby="yn-faq-title">
  <section id="yn-faq-hero" aria-labelledby="yn-faq-title" className={styles.faqHero}>
   <img src="/assets/yeongnyangi/expressions/welcome.webp" width={128} height={128} alt="" decoding="async"/>
   <div><h1 id="yn-faq-title">운세보는 영냥이 자주 묻는 질문</h1><p className={styles.teaserBubble}>궁금한 건 여기 다 모아뒀다냥! 질문을 눌러 보라냥.</p></div>
  </section>
  <section id="yn-before" aria-labelledby="yn-guide-title">
   <h2 id="yn-guide-title">결제 전에 알아두기</h2>
   <details id="yn-mackerel" className={styles.panel}><summary>{LOWEST_PRICE} 고등어 상담의 {EXPANDED_CHAPTERS.mackerel}챕터 구성</summary>
    <p>사주 고등어 상담에 아래 질문을 남겼을 때의 장 제목이에요.</p>
    <p className={styles.note}>가상 질문 · 질문과 체계에 따라 제목이 달라져요. 질문: “{EXAMPLE_QUESTION}”</p>
    <ol className={styles.chapters}>{mackerelChapters.map(row=><li key={row.key}>{row.title}</li>)}</ol>
    <p><a href={fishRows[0].href}>사주 고등어 상담 시작하기</a></p>
   </details>
   <details id="yn-receive" className={styles.panel}><summary>한 가지 질문에서, 차분히 읽는 한 권까지</summary>
    <p>궁금한 점의 답부터 읽고, 그 판단의 근거와 반복되는 패턴, 지금 해볼 행동을 챕터별로 살펴보세요. 사주·자미두수·숙요점·베다점·점성술·타로 가운데 원하는 방식으로 시작할 수 있어요.</p>
    <p>여러 관점으로 깊이 읽고 싶다면 <a href="/yeongnyangi/fortune/?product=fusion_all">생선 오마카세 상담</a>에서 여섯 체계의 독립 해석과 인생 전반, 실행·점검 계획을 이어 읽어요.</p>
    <p className={styles.volume}><strong>{FUSION_BOOK_CHAPTERS.omakase}개 챕터</strong><span>오마카세 본문 {(FUSION_BOOK_TARGETS.omakase[1]/10000).toFixed(1)}만 자까지 목표로 구성</span></p>
    <p className={styles.note}>오마카세 기준이며 모든 상담에 같은 분량이 적용되지는 않아요. 실제 글 길이는 질문과 생성 결과에 따라, PDF 페이지 수는 편집에 따라 달라져요. 선택한 상담의 구성과 가격은 결제 전에 확인해요.</p>
   </details>
   <div id="yn-faq" className={styles.faqBlock}>
    <h2>자주 묻는 질문</h2>
    <YeongnyangiFaqToon items={YEONGNYANGI_FAQS}/>
    <details className={styles.craftedOverview}><summary>상담 방식과 전체 구성 자세히 보기</summary><CraftedProductDetail detail={craftedOverview}/><PublicRecordLink/></details>
    <p className={styles.note}>함께 보기: <a href="/ggulggul/">꿀꿀운세 홈</a> · <a href="/yeongnyangi/1000-won-fortune/">천원 사주 리포트</a> · <a href="/yeongnyangi/season-1/">영냥이 웹툰 시즌 1</a> · <a href="/yeongnyangi/library/">내 상담</a> · <a href="/privacy/">개인정보 처리방침</a></p>
   </div>
  </section>
 </article>;
}
