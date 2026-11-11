import {brandCopy} from '@/lib/seo/brand-copy.mjs';
import {serializeJsonLd} from '@/lib/seo/json-ld.mjs';
import type {Metadata} from 'next';
import {siteSeo} from '@/lib/seo/siteSeo';
import {BRAND_FACTS} from '@/lib/brand/brand-facts.mjs';
import {yeongnyangiOgImage} from './_lib/share-image';
import {buildBreadcrumbJsonLd,buildFaqPageJsonLd,buildServiceJsonLd,buildWebPageJsonLd} from '@/lib/structured-data';
import {buildKrwOffer} from '@/lib/seo/paid-offer';
import {EXPANDED_CHAPTERS} from '@/worker/yeongnyangi/fortune/consultation-expansion';
import {FOLLOWUP_LIMITS} from '@/worker/yeongnyangi/fortune/ask/question-policy';
import Home from './_components/Home';
import ServiceEntryScene from './_components/ServiceEntryScene';
import KoreanOnly from './_components/KoreanOnly';
import YeongnyangiGuide,{YEONGNYANGI_FAQS} from './_components/YeongnyangiGuide';
import {getAlternatesByRouteKey} from '@/lib/i18n/routes';
import {alternatesFor,toNextLanguages} from '@/lib/seo/hreflang.mjs';
// 색인 대상(2026-10-02): "운세보는 영냥이"(2026-10-16 대표 이름)·"사주 보는 고양이"·"영냥이" 브랜드 검색의 대표 URL 이다. 문장급 본문은
// YeongnyangiGuide 가 서버 HTML 로 싣는다(이전 286단위 → noindex 였다). 천원 의도 검색은 /yeongnyangi/1000-won-fortune/ 몫.
// Offer 는 고등어 하나다. 가격은 서버 가격표에서 읽고, 여섯 체계가 같은 가격임은 yeongnyangi-sample-funnel 테스트가 지킨다.
const PATH='/yeongnyangi/';
if(FOLLOWUP_LIMITS.mackerel!==0)throw new Error('영냥이 Offer 설명: 고등어 추가 질문이 0회가 아니다.');
const mackerelOffer=buildKrwOffer("yeongnyangi-saju-mackerel",PATH);
const TITLE=brandCopy('yeongnyangiTitle');
const DESCRIPTION=brandCopy('yeongnyangiDescription');
const URL_=`https://code-destiny.com${PATH}`;
const YEONGNYANGI=BRAND_FACTS.characters.find(character=>character.key==='yeongnyangi')!;
export const metadata:Metadata={title:{absolute:TITLE},description:DESCRIPTION,
 keywords:['운세보는 영냥이','운세 보는 영냥이','사주 보는 고양이','사주보는고양이','사주보는 고양이','영냥이','꿀꿀 운세','꿀꿀운세','코드데스티니'],
 alternates:{canonical:URL_,languages:toNextLanguages(alternatesFor(getAlternatesByRouteKey('yeongnyangi')))},robots:{index:true,follow:true},
 openGraph:{type:'website',locale:'ko_KR',url:URL_,siteName:siteSeo.brandName,title:TITLE,description:DESCRIPTION,images:[yeongnyangiOgImage]},
 twitter:{card:'summary_large_image',title:TITLE,description:DESCRIPTION,images:[yeongnyangiOgImage.url]}};
const jsonLd=[
 buildWebPageJsonLd({title:TITLE,description:DESCRIPTION,path:PATH}),
 buildBreadcrumbJsonLd([{name:BRAND_FACTS.service.name,path:'/'},{name:YEONGNYANGI.serviceName,path:PATH}]),
 buildServiceJsonLd({name:YEONGNYANGI.serviceName,alternateName:[...YEONGNYANGI.alternateNames],description:'사주·자미두수·숙요점·베다점·서양 점성술·타로 중 한 체계의 계산을 바탕으로 AI가 고민을 챕터별로 해설하는 유료 운세 상담',path:PATH,offer:mackerelOffer&&{...mackerelOffer,name:'고등어 질문 상담',description:`한 체계, 신규 한국어 질문 기준 ${EXPANDED_CHAPTERS.mackerel}챕터, 추가 질문 없음`}}),
 buildFaqPageJsonLd(YEONGNYANGI_FAQS),
];
export default function Page(){return <>
 <ServiceEntryScene/>
 <Home guide={<KoreanOnly><YeongnyangiGuide/></KoreanOnly>}/>
 {jsonLd.map((item,index)=><script key={index} type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(item)}}/>)}
</>;}
