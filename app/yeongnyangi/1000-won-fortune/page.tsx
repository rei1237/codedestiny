import type {Metadata} from 'next';
import {products,systemNames,packages,type Product} from '@/worker/yeongnyangi/payments/catalog';
import {policyForReading,depthDescriptions} from '@/worker/yeongnyangi/fortune/reading-policy';
import {readingManifest} from '@/worker/yeongnyangi/fortune/reading-manifest';
import {topicCatalog} from '@/worker/yeongnyangi/fortune/topics';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import {siteSeo} from '@/lib/seo/siteSeo';
import {buildBreadcrumbJsonLd,buildFaqPageJsonLd,buildServiceJsonLd,buildWebPageJsonLd} from '@/lib/structured-data';
import styles from './page.module.css';
import {SEO_READING_EXAMPLES} from '@/lib/seo-reading-examples';
import FounderTrust from '@/app/components/FounderTrust';
import {founder} from '@/lib/brand/founder';
import SampleExposure from '../_components/SampleExposure';

// 천원사주 허브. 영냥이 고등어 상담의 검색 착륙 페이지다(docs/seo/YEONGNYANGI_SEARCH_STRATEGY.md).
// 🔴 가격·챕터·분량·입력 조건을 여기 숫자로 적지 말 것 — 결제 가격표와 상담 매니페스트에서 빌드 때 읽는다.
//    "천원"이라는 이름 자체가 가격 주장이므로 고등어 가격이 1,000원이 아니면 빌드를 멈춘다.
// Service 에 Offer 를 붙이지 않는다 — buildKrwOffer 는 verify:paid-service-offer 가 결제 CI 트리거·결제 상수 대조 등록을 요구한다. 가격은 본문 표가 정본 가격표에서 읽는다.
// 🔴 무료 키워드는 꿀꿀 운세 랜딩(/saju/ 등)의 몫이다. 제목·H1·설명에 "무료"를 넣지 않는다.
const PATH='/yeongnyangi/1000-won-fortune/';
const PAGE_URL=`https://code-destiny.com${PATH}`;
// Use the existing Yeongnyangi portrait, matching the home social preview.
const OG_IMAGE='https://code-destiny.com/assets/yeongnyangi/original/kakao-profile.png';
const DOMAINS:DomainId[]=['saju','ziwei','sukuyo','vedic','astrology','tarot'];
const TIERS=['mackerel','salmon','flounder','tuna'] as const;
const won=(amount:number)=>`${amount.toLocaleString('ko-KR')}원`;
const single=(domain:DomainId,fish:string)=>{const p=products.find(item=>item.readingKind==='single'&&item.domain===domain&&item.fishId===fish);if(!p)throw new Error(`영냥이 상품 없음: ${domain}_${fish}`);return p;};
const mackerels=DOMAINS.map(domain=>single(domain,'mackerel'));
for(const p of mackerels)if(p.priceKRW!==1000)throw new Error(`천원사주 허브: ${p.id} 가격이 ${p.priceKRW}원이다. 페이지 이름과 문안을 먼저 고칠 것.`);
const PRICE=won(mackerels[0].priceKRW);
const QUESTION_HREF='/yeongnyangi/fortune/?domain=saju&fish=mackerel&consultationKind=ask';
const fusions=products.filter(p=>p.readingKind!=='single');
const chapterRange=(items:Product[])=>{const counts=items.map(p=>p.chapterCount);const min=Math.min(...counts),max=Math.max(...counts);return min===max?`${min}개`:`${min}~${max}개`;};
const mackerelPolicy=policyForReading('mackerel',mackerels[0].manifestVersion);

// 필수 입력은 worker/yeongnyangi/fortune/shared/input.ts 의 서버 검증을 옮긴 요약이다(화면 설명용).
const SYSTEMS:Record<DomainId,{name:string;lede:string;input:string;freeHref:string;freeLabel:string}>={
 saju:{name:'천원 사주',lede:'태어난 연·월·일·시의 네 기둥으로 오행의 균형과 십성을 계산하고, 기질과 일하는 방식, 사랑할 때의 모습, 돈의 흐름을 챕터로 나눠 풀어요.',input:'생년월일과 성별이 필요해요. 출생시간은 알면 넣고, 몰라도 상담할 수 있어요.',freeHref:'/saju/',freeLabel:'사주 풀이 먼저 보기'},
 ziwei:{name:'천원 자미두수',lede:'자미두수 명반의 명궁·신궁과 궁에 놓인 별을 바탕으로 나를 이루는 성향, 일에서 드러나는 강점, 가까운 관계의 방식을 읽어요.',input:'생년월일, 출생시간, 성별이 필요해요. 자미두수는 시간이 명반을 바꾸므로 출생시간 없이는 상담하지 않아요.',freeHref:'/ziwei/',freeLabel:'자미두수 명반 먼저 보기'},
 sukuyo:{name:'천원 숙요점',lede:'태어난 날 달이 머문 27수로 본명숙을 정하고, 감정이 움직이는 방식과 관계를 대하는 기본 태도를 살펴요. 궁합 상대 프로필을 함께 고르면 두 사람의 관계를 읽어요.',input:'생년월일, 출생시간, 출생지역이 필요해요. 궁합으로 볼 때는 상대의 같은 정보가 담긴 프로필도 필요해요.',freeHref:'/sukuyo/',freeLabel:'본명숙 먼저 보기'},
 vedic:{name:'천원 베다점',lede:'인도 점성술(조티쉬)의 라그나와 달, 행성 배치를 계산해 삶을 마주하는 태도와 마음이 편안해지는 조건, 타고난 재능을 읽어요.',input:'생년월일, 출생시간, 출생지역이 필요해요. 지역은 시간대와 상승궁 계산에 쓰여요.',freeHref:'/vedic/',freeLabel:'베다 점성술 먼저 보기'},
 astrology:{name:'천원 점성술',lede:'서양 점성술 출생 차트의 태양·달·상승점과 행성 사이의 각을 바탕으로 감정의 안정감과 재능, 표현 방식을 살펴요. 실시간 트랜짓은 포함하지 않아요.',input:'생년월일, 출생시간, 출생지역이 필요해요.',freeHref:'/astrology/',freeLabel:'별자리 차트 먼저 보기'},
 tarot:{name:'천원 타로',lede:'출생정보 없이 지금의 질문과 뽑힌 카드의 상징으로 현재 상황의 핵심, 카드가 이어지는 흐름, 선택할 때 주의할 점을 읽어요.',input:'출생정보는 필요하지 않아요. 궁금한 질문을 남기면 돼요.',freeHref:'/tarot/',freeLabel:'타로 카드 먼저 뽑아보기'},
};
const TOPICS=Object.values(topicCatalog).map(topic=>topic.label).join(', ');
const sukuyoPair=readingManifest(single('sukuyo','mackerel'),'general','compatibility');

const FAQS=[
 {question:'천원사주는 정말 1,000원인가요?',answer:`네. 영냥이의 고등어 상담은 사주, 자미두수, 숙요점, 베다점, 점성술, 타로 여섯 가지 모두 ${PRICE}이에요. Family 이용권 한도 또는 단건 결제로 이용하며, 결제창에서 금액과 적용 수단을 한 번 더 확인해요.`},
 {question:'이용권이나 월정석으로도 볼 수 있나요?',answer:'Family 이용권은 적용됩니다. 다른 이용권 등급과 월정석은 적용되지 않으며, Family가 없다면 카드·카카오페이 등의 단건 결제로 이용할 수 있어요.'},
 {question:'출생시간을 모르면 상담할 수 없나요?',answer:'천원 사주는 출생시간 없이도 상담할 수 있어요. 자미두수, 숙요점, 베다점, 점성술은 출생시간으로 계산이 달라지므로 시간이 필요하고, 타로는 출생정보 없이 질문만으로 상담해요.'},
 {question:'천원으로 궁합도 볼 수 있나요?',answer:`숙요점 고등어 상담에서 궁합 상대 프로필을 함께 고르면 두 사람의 관계를 ${sukuyoPair.length}개 챕터로 읽어요. 다른 운세의 궁합 지원 여부와 필요한 정보는 상담 종류에서 확인할 수 있어요. 꿀꿀 운세 궁합 페이지도 함께 둘러볼 수 있어요.`},
 {question:'결제한 상담은 다시 볼 수 있나요?',answer:'네. 같은 CODE DESTINY 계정으로 로그인하면 영냥이의 내 상담 기록에서 결제한 상담을 다시 열 수 있어요.'},
 {question:'상담 결과는 누가 쓰나요?',answer:'운세 계산은 각 체계의 계산 엔진이 하고, 그 계산 결과를 바탕으로 AI가 영냥이의 말투로 해설을 써요. 결과는 선택을 돕는 참고 자료이며 미래를 확정하지 않아요.'},
 {question:'환불은 어떻게 하나요?',answer:'결제와 환불 기준은 CODE DESTINY 환불 정책을 따라요. 문제가 있으면 문의하기로 결제 내역과 함께 알려 주세요.'},
 {question:'입력한 생년월일과 질문은 어떻게 쓰이나요?',answer:'입력한 출생정보와 질문은 상담을 계산하고 결과를 기록해 다시 보여 주는 데 쓰여요. 보관과 처리 방식은 개인정보 처리방침에서 확인할 수 있어요.'},
];

const TITLE='천원사주 · 천원 사주풀이 | 사주보는 고양이 영냥이';
const DESCRIPTION=`${founder.credential}. 영냥이 천원사주·타로 ${PRICE} 단건 상담. 공개 분석 기록, 상담 예시와 가격을 확인하고 시작하세요.`;
const OG_TITLE='천원사주 · 천원운세 | 사주보는 고양이 영냥이';

export const metadata:Metadata={
 metadataBase:new URL('https://code-destiny.com'),
 title:{absolute:TITLE},
 description:DESCRIPTION,
 keywords:['천원사주','천원 사주풀이','천원운세','1000원 사주','사주보는 고양이','영냥이'],
 alternates:{canonical:PAGE_URL},
 robots:{index:true,follow:true,googleBot:{index:true,follow:true,'max-image-preview':'large','max-snippet':-1,'max-video-preview':-1}},
 openGraph:{type:'website',locale:'ko_KR',url:PAGE_URL,siteName:siteSeo.brandName,title:OG_TITLE,description:DESCRIPTION,images:[{url:OG_IMAGE,width:800,height:800,alt:'사주보는 고양이 영냥이'}]},
 twitter:{card:'summary_large_image',title:OG_TITLE,description:DESCRIPTION,images:[OG_IMAGE]},
};

const jsonLd=[
 buildWebPageJsonLd({title:TITLE,description:DESCRIPTION,path:PATH}),
 buildBreadcrumbJsonLd([{name:siteSeo.brandName,path:'/'},{name:'사주보는 고양이 영냥이',path:'/yeongnyangi/'},{name:'천원사주',path:PATH}]),
 buildServiceJsonLd({name:'영냥이 천원 사주 상담',description:`사주팔자 계산을 바탕으로 AI가 ${mackerels[0].chapterCount}개 챕터로 해설하는 고등어 상담`,path:PATH}),
 buildFaqPageJsonLd(FAQS),
];
const serialize=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c');

export default function Page(){
 return <article className={styles.hub}>
  <nav className={styles.crumbs} aria-label="현재 위치"><a href="/">{siteSeo.brandName}</a><span aria-hidden="true">›</span><a href="/yeongnyangi/">사주보는 고양이 영냥이</a><span aria-hidden="true">›</span><span aria-current="page">천원사주</span></nav>

  <section className={styles.intro}>
   <div>
    <p className={styles.kicker}>사주보는 고양이 영냥이 · 고등어 상담</p>
    <h1><span className={styles.h1Line}>천원사주 · 천원운세,</span> <span className={styles.h1Line}>영냥이 고등어 상담 {PRICE}</span></h1>
    <p>왜 선택 앞에서 자꾸 망설이게 될까요? 지금의 고민을 남기면, 사주 계산을 바탕으로 내 질문에 대한 답과 근거, 생활 속에서 해볼 행동을 함께 읽어요.</p>
    <p>처음이라면 사주 고등어 상담부터 시작해 보세요. {PRICE}에 {mackerels[0].chapterCount}개 챕터의 상담 글을 받고, 같은 계정의 내 상담 기록에서 다시 볼 수 있어요. 계산은 사주 엔진이, 해설은 AI가 맡아요.</p>
    <p className={styles.actions}><a className={styles.primary} href={QUESTION_HREF}>{PRICE} 사주에 내 질문 남기기</a><a href="#example">받게 될 답의 형태 보기</a></p>
    <p className={styles.policy}>Family 이용권이 없어도 단건 결제로 이용할 수 있어요. 상품과 가격은 다음 화면에서 바꿀 수 있으며, 로그인 후 결제창에서 총액과 적용 수단을 확인해요.</p>
   </div>
   <img src="/assets/yeongnyangi/hero.webp" width={480} height={480} alt="생선을 기다리며 사주를 봐 주는 고양이 영냥이" fetchPriority="high"/>
  </section>

  <section id="example" className={styles.sample} aria-labelledby="example-title">
   <h2 id="example-title">내 질문에는 어떤 답이 올까요?</h2>
   <p>가상 입력으로 만든 짧은 편집 예시예요. 실제 고객 데이터나 AI가 생성한 상담 원문이 아니며, 전체 {mackerels[0].chapterCount}개 챕터 중 답변의 형태를 보여드려요.</p>
   <dl className={styles.sampleReading}>
    <dt>질문 예시</dt><dd>선택할 때마다 오래 망설여요. 어떻게 결정하는 연습을 하면 좋을까요?</dd>
    <dt>답변 예시</dt><dd>세부적인 차이를 살피는 태도를 장점으로 쓰되, 모든 불확실성이 사라질 때까지 기다리지는 않는 연습을 해보세요. 되돌릴 수 있는 작은 선택부터 기한을 정하면 도움이 될 수 있어요.</dd>
    <dt>계산 근거와 해석의 한계</dt><dd>{SEO_READING_EXAMPLES['/saju'].fact} {SEO_READING_EXAMPLES['/saju'].interpretation}</dd>
    <dt>오늘 해볼 행동</dt><dd>{SEO_READING_EXAMPLES['/saju'].action} 확인할 항목 하나와 결정할 기한을 정해 보세요.</dd>
   </dl>
   <details><summary>가상 입력과 계산 기준 보기</summary><p>{SEO_READING_EXAMPLES['/saju'].input}</p><a href="/methodology/">계산과 해석 기준</a></details>
   <p className={styles.actions}><a className={styles.primary} href={QUESTION_HREF}>내 질문으로 {PRICE} 상담 준비하기</a><a href="#systems">다른 운세와 필요한 정보 보기</a></p>
   <SampleExposure targetId="example" itemId={mackerels[0].cdFeatureKey}/>
  </section>

  <FounderTrust/>
  <section aria-labelledby="what">
   <h2 id="what">천원사주·천원운세란</h2>
   <p>천원 사주, 1,000원 사주, 천원운세로 찾는 상담은 영냥이에서 모두 고등어 상담 하나를 가리켜요. Family 이용권 한도 또는 단건 결제로 한 번의 상담 결과를 받으며, 자동 결제는 아니에요.</p>
   <p>고등어 상담은 천원 사주가 {mackerels[0].chapterCount}개, 다른 체계가 {chapterRange(mackerels.slice(1))} 챕터로 구성돼요. 상담 전체 분량 기준은 {mackerelPolicy.minimum.toLocaleString('ko-KR')}자 이상이고, 챕터마다 {mackerelPolicy.depth.join(' → ')} 순서로 내용을 담아요. 짧은 운세 문장 한 줄이 아니라, 왜 그렇게 읽었는지와 오늘 해볼 수 있는 첫 행동까지 함께 받는 구성이에요.</p>
   <p>운세마다 해석·궁합 등 제공하는 상담 종류를 먼저 골라요. 무엇이든 물어보기에서는 {TOPICS} 등의 주제를 고르고 궁금한 질문을 1,000자까지 남겨요. 타로는 카드에 물어볼 질문을 따로 적어요.</p>
  </section>

  <section aria-labelledby="systems">
   <h2 id="systems">체계별 천원 상담</h2>
   <p>여섯 가지 고등어 상담은 가격이 같고, 계산에 쓰는 정보와 챕터 구성이 달라요. 아래 챕터 제목은 실제 상담이 만들어지는 순서 그대로예요.</p>
   <div className={styles.systems}>
    {mackerels.map(p=>{const info=SYSTEMS[p.domain];const chapters=readingManifest(p);return <section key={p.id} id={p.domain} className={styles.system} aria-labelledby={`${p.domain}-title`}>
     <h3 id={`${p.domain}-title`}>{info.name} <small>{systemNames[p.domain]} · {won(p.priceKRW)} · {p.chapterCount}개 챕터</small></h3>
     <p>{info.lede}</p>
     <p><strong>필요한 정보</strong> {info.input}</p>
     <ol className={styles.chapters}>{chapters.map(chapter=><li key={chapter.id}>{chapter.title}</li>)}</ol>
     {p.domain==='sukuyo'&&<p><strong>천원 숙요 궁합</strong> 상대 프로필을 고르면 {sukuyoPair.map(chapter=>chapter.title).join(', ')} 순서로 두 사람의 관계를 읽어요.</p>}
     <p className={styles.links}><a className={styles.primary} href={`/yeongnyangi/fortune/?domain=${p.domain}&fish=mackerel`}>{info.name} 상담 알아보기</a><a href={info.freeHref}>{info.freeLabel}</a></p>
    </section>;})}
   </div>
  </section>

  <section aria-labelledby="difference">
   <h2 id="difference">무료 운세와 천원 상담의 차이</h2>
   <p>꿀꿀 운세에는 로그인 없이 볼 수 있는 운세 페이지가 있어요. <a href="/today/">오늘의 운세</a>, <a href="/saju/">사주 풀이</a>, <a href="/ziwei/">자미두수 명반</a>, <a href="/sukuyo/">숙요점 본명숙</a>, <a href="/vedic/">베다 점성술</a>, <a href="/astrology/">점성술 차트</a>, <a href="/tarot/">타로</a>에서 계산 결과와 기본 풀이를 먼저 확인할 수 있어요.</p>
   <p>천원 상담은 같은 계산을 출발점으로 삼되, 내가 고른 주제와 질문을 반영해 챕터별로 이어지는 글을 새로 써요. 결과는 내 계정의 상담 기록에 남아 나중에 다시 열 수 있어요. 기본 성향만 알고 싶다면 무료 페이지로 충분하고, 한 가지 고민을 근거와 함께 길게 읽고 싶을 때 천원 상담이 맞아요.</p>
   <div className={styles.tableWrap}><table>
    <caption>무료 운세 페이지와 영냥이 고등어 상담 비교</caption>
    <thead><tr><th scope="col">구분</th><th scope="col">꿀꿀 운세 무료 페이지</th><th scope="col">영냥이 고등어 상담</th></tr></thead>
    <tbody>
     <tr><th scope="row">비용</th><td>무료</td><td>{PRICE} · Family 이용권 또는 단건 결제</td></tr>
     <tr><th scope="row">결과 형태</th><td>계산 결과와 기본 풀이</td><td>{chapterRange(mackerels)} 챕터로 나눈 상담 글</td></tr>
     <tr><th scope="row">주제·질문 반영</th><td>페이지마다 정해진 항목</td><td>운세별 전용 상담 또는 무엇이든 물어보기</td></tr>
     <tr><th scope="row">로그인</th><td>필요 없음</td><td>CODE DESTINY 계정 필요</td></tr>
     <tr><th scope="row">다시 보기</th><td>입력 정보로 다시 계산</td><td>내 상담 기록에서 다시 열기</td></tr>
    </tbody>
   </table></div>
  </section>

  <section aria-labelledby="how">
   <h2 id="how">천원 상담 이용 방법</h2>
   <ol className={styles.steps}>
    <li><strong>운세 체계 고르기</strong> 사주, 자미두수, 숙요점, 베다점, 점성술, 타로 중 하나를 고르고 고등어를 선택해요.</li>
    <li><strong>프로필 고르기</strong> CODE DESTINY 계정으로 로그인한 뒤 생년월일이 담긴 프로필을 골라요. 타로는 이 단계가 없어요.</li>
    <li><strong>상담 종류 확인하기</strong> 선택한 상담의 목차를 확인해요. 무엇이든 물어보기와 타로에서는 궁금한 질문을 남겨요.</li>
    <li><strong>이용 내용 확인</strong> 결제창에서 Family 적용 여부와 {PRICE} 금액을 확인한 뒤, Family 이용권 또는 카드·카카오페이 등의 단건 결제를 선택해요.</li>
    <li><strong>상담 읽기</strong> 결제가 끝나면 상담 결과 화면으로 돌아와요. 이후에는 <a href="/yeongnyangi/library/">내 상담</a>에서 다시 열 수 있어요.</li>
   </ol>
  </section>

  <section aria-labelledby="prices">
   <h2 id="prices">생선별 가격과 상담 깊이</h2>
   <p>고등어가 부담 없이 시작하는 천원 상담이라면, 연어부터는 같은 체계를 더 많은 챕터와 분량으로 깊게 읽어요. 타로를 제외한 광어와 참치 상담은 출생시간, 출생지역, 성별이 모두 있어야 해요. 가격은 여섯 체계가 같아요.</p>
   <div className={styles.tableWrap}><table>
    <caption>영냥이 생선별 상담 가격과 구성</caption>
    <thead><tr><th scope="col">생선</th><th scope="col">가격</th><th scope="col">챕터</th><th scope="col">분량 기준</th><th scope="col">상담 깊이</th></tr></thead>
    <tbody>
     {TIERS.map(tier=>{const items=DOMAINS.map(domain=>single(domain,tier));const prices=[...new Set(items.map(p=>p.priceKRW))];if(prices.length!==1)throw new Error(`영냥이 ${tier} 가격이 체계마다 다르다: ${prices.join(',')}`);return <tr key={tier}><th scope="row">{packages[tier].name}</th><td>{won(prices[0])}</td><td>{chapterRange(items)}</td><td>{policyForReading(tier,items[0].manifestVersion).minimum.toLocaleString('ko-KR')}자 이상</td><td>{depthDescriptions[tier]}</td></tr>;})}
     {(['assorted','omakase'] as const).map(fish=>{const items=fusions.filter(p=>p.fishId===fish);if(new Set(items.map(p=>p.priceKRW)).size!==1)throw new Error(`영냥이 ${fish} 가격이 상품마다 다르다`);return <tr key={fish}><th scope="row">{packages[fish].name}</th><td>{won(items[0].priceKRW)}</td><td>{chapterRange(items)}</td><td>{policyForReading(fish,items[0].manifestVersion).minimum.toLocaleString('ko-KR')}자 이상</td><td>{depthDescriptions[fish]} ({items.map(p=>p.name).join(' / ')})</td></tr>;})}
    </tbody>
   </table></div>
  </section>

  <section aria-labelledby="faq">
   <h2 id="faq">천원사주 자주 묻는 질문</h2>
   <div className={styles.faq}>{FAQS.map(item=><section key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></section>)}</div>
   <p className={styles.policy}>함께 보기: <a href="/compatibility/">꿀꿀 운세 궁합</a> · <a href="/refund-policy/">환불 정책</a> · <a href="/privacy-policy/">개인정보 처리방침</a> · <a href="/contact/">문의하기</a></p>
  </section>

  <section className={styles.closing} aria-labelledby="start">
   <h2 id="start">영냥이에게 첫 이야기를 들려줘</h2>
   <p>어떤 체계로 볼지 고민된다면 출생시간 없이도 가능한 천원 사주부터, 지금 당장 답이 궁금한 질문이 있다면 천원 타로부터 시작해 보세요.</p>
   <p className={styles.actions}><a className={styles.primary} href={QUESTION_HREF}>내 질문으로 {PRICE} 상담 준비하기</a><a href="/yeongnyangi/fortune/?domain=tarot&fish=mackerel">천원 타로 상담 알아보기</a><a href="/yeongnyangi/">영냥이의 방 둘러보기</a></p>
  </section>

  {jsonLd.map((item,index)=><script key={index} type="application/ld+json" dangerouslySetInnerHTML={{__html:serialize(item)}}/>)}
 </article>;
}
