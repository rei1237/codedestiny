import {products,systemNames,packages} from './payments/catalog';
import {questionScopes,FOLLOWUP_LIMITS} from './fortune/ask/question-policy';
import type {DomainId} from './fortune/shared/contracts';
import {EXPANDED_CHAPTERS} from './fortune/consultation-expansion';
import {consultationBudget} from './fortune/consultation-budget';
import {BRAND_FACTS} from '../../lib/brand/brand-facts.mjs';

// One source for the yeongnyangi FAQ, prices and brand facts. The /yeongnyangi/faq/ page (and its FAQPage JSON-LD)
// and the S9 support desk both read from here, so the support answers never drift from what the page shows.
// 🔴 Prices come from the payment catalog (paid-feature-registry); scope and followups from the question policy.
const DOMAINS:DomainId[]=['saju','ziwei','sukuyo','vedic','astrology','tarot'];
const TIERS=['mackerel','salmon','flounder','tuna'] as const;
export const won=(amount:number)=>`${amount.toLocaleString('ko-KR')}원`;
export const single=(domain:DomainId,fish:string)=>{const p=products.find(item=>item.readingKind==='single'&&item.domain===domain&&item.fishId===fish);if(!p)throw new Error(`영냥이 상품 없음: ${domain}_${fish}`);return p;};
export const tierRows=TIERS.map(tier=>{const items=DOMAINS.map(domain=>single(domain,tier));const prices=[...new Set(items.map(p=>p.priceKRW))];if(prices.length!==1)throw new Error(`영냥이 ${tier} 가격이 체계마다 다르다: ${prices.join(',')}`);return {tier,name:packages[tier].name,price:prices[0],depth:questionScopes[tier],followups:FOLLOWUP_LIMITS[tier]};});
export const LOWEST_PRICE=won(tierRows[0].price);
const SYSTEMS=DOMAINS.map(domain=>systemNames[domain]).join(', ');

export const YEONGNYANGI_FAQS=[
 {question:'사주 보는 고양이 영냥이는 어떤 서비스인가요?',answer:`영냥이는 꿀꿀운세(CODE DESTINY)가 운영하는 유료 운세 상담 캐릭터예요. ${SYSTEMS} 중 하나를 골라 고민의 답과 근거, 생활 속 선택과 실천을 챕터로 나눠 살펴봐요. "사주보는고양이"처럼 붙여 써서 찾아도 같은 서비스예요.`},
 {question:'운세보는 영냥이와 꿀꿀 운세는 어떤 관계인가요?',answer:'운세보는 영냥이는 꿀꿀 운세 안의 사주보는 고양이 상담 서비스예요. 운영자는 CODE DESTINY(코드 데스티니)로 같고, 공식 홈페이지는 https://code-destiny.com/, 영냥이 상담 입구는 https://code-destiny.com/yeongnyangi/예요.'},
 {question:'가장 저렴한 상담은 얼마인가요?',answer:`고등어 상담이 ${LOWEST_PRICE}이고, 여섯 체계 모두 같은 가격이에요. 결제창에서 총액과 적용 수단을 한 번 더 확인한 뒤에 결제돼요.`},
 {question:`${LOWEST_PRICE} 고등어 상담은 무엇을 다루나요?`,answer:`${SYSTEMS} 중 한 체계를 골라 한 가지 고민을 묻는 질문형 상담이에요. 신규 한국어 질문 기준 ${EXPANDED_CHAPTERS.mackerel}챕터로 ${questionScopes.mackerel}을 담아요.`},
 {question:'추가 질문은 몇 번 할 수 있나요?',answer:`${tierRows.map(row=>row.name+(row.followups?` ${row.followups}회`:' 없음')).join(', ')}예요. 저장된 상담 근거로 답할 수 있는 범위에서 이용해요.`},
 {question:'결제하고 나면 결과는 언제, 어디서 보나요?',answer:'결제가 확인되면 영냥이가 상담을 쓰기 시작해요. 보통 몇 분 안에 완성되고, 화면을 닫아도 같은 계정의 내 상담에서 이어서 확인하고 다시 열 수 있어요.'},
 {question:'상담이 만들어지지 않으면 어떻게 되나요?',answer:'내 상담 화면에서 진행 상태를 확인할 수 있어요. 문제가 계속되면 결제 내역과 함께 문의하기로 알려 주세요. 환불 기준은 환불 정책을 따라요.'},
 {question:'꿀꿀운세의 무료 운세와는 무엇이 다른가요?',answer:'무료 페이지는 정해진 항목의 계산 결과와 기본 풀이를 보여 줘요. 영냥이 상담은 같은 계산을 출발점으로 삼아 내가 고른 주제와 질문을 반영한 글을 새로 쓰고, 결과를 계정에 보관해요.'},
];

export const SUPPORT_CONTACT_PATH='/contact/';
export const SUPPORT_LIBRARY_PATH='/yeongnyangi/library/';

// Keyword rules, checked in order, on the question with whitespace removed. A hit answers from the FAQ without an LLM call.
// "결과가 안 나와요" comes before "결과는 언제" so a stuck order never gets the happy-path answer.
const FAQ_RULES:[string[],number][]=[
 [['안나와','안나오','안만들','안보여','안보이','없어요','없습니다','실패','오류','멈춰','멈췄','환불'],6],
 [['추가질문','몇번','몇회'],4],
 [['고등어'],3],
 [['가격','얼마','저렴','비용','요금'],2],
 [['언제','어디서'],5],
 [['무료'],7],
 [['관계','운영자','운영하'],1],
 [['어떤서비스','뭐야','무엇인가','뭔가요'],0],
];
const squash=(value:string)=>value.normalize('NFC').replace(/[\s?!.,~·'"]+/g,'');
export function matchFaq(question:string){
 const text=squash(String(question||''));
 if(!text)return null;
 for(const [words,index] of FAQ_RULES)if(words.some(word=>text.includes(word)))return YEONGNYANGI_FAQS[index];
 return null;
}

export function supportKnowledge(){
 const yeongnyangi=BRAND_FACTS.characters.find(row=>row.key==='yeongnyangi');
 const packageRows=(['assorted','omakase'] as const).map(tier=>{const product=products.find(p=>p.fishId===tier)!;return {name:packages[tier].name,price:won(product.priceKRW),followups:consultationBudget(tier).followups};});
 return {
  service:{name:BRAND_FACTS.service.name,operator:BRAND_FACTS.operator.name,homeUrl:BRAND_FACTS.service.homeUrl,consultation:yeongnyangi?.serviceName,path:yeongnyangi?.path},
  systems:SYSTEMS,
  prices:[...tierRows.map(row=>({name:row.name,price:won(row.price),followups:row.followups,scope:row.depth})),...packageRows],
  faqs:YEONGNYANGI_FAQS,
  paths:{library:SUPPORT_LIBRARY_PATH,contact:SUPPORT_CONTACT_PATH},
 };
}
