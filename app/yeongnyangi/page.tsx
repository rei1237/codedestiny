import type {Metadata} from 'next';
import {siteSeo} from '@/lib/seo/siteSeo';
import {yeongnyangiOgImage} from './_lib/share-image';
import {buildBreadcrumbJsonLd,buildFaqPageJsonLd,buildServiceJsonLd,buildWebPageJsonLd} from '@/lib/structured-data';
import Home from './_components/Home';
import KoreanOnly from './_components/KoreanOnly';
import YeongnyangiGuide,{LOWEST_PRICE,YEONGNYANGI_FAQS} from './_components/YeongnyangiGuide';
// 색인 대상(2026-10-02): "사주 보는 고양이"·"영냥이" 브랜드 검색의 대표 URL 이다. 문장급 본문은
// YeongnyangiGuide 가 서버 HTML 로 싣는다(이전 286단위 → noindex 였다). 천원 의도 검색은 /yeongnyangi/1000-won-fortune/ 몫.
// Service 에 Offer 를 붙이지 않는다 — 가격은 본문 표가 결제 카탈로그에서 읽는다(verify:paid-service-offer).
const PATH='/yeongnyangi/';
const TITLE=`사주 보는 고양이 영냥이 | ${LOWEST_PRICE}부터 운세 상담 · ${siteSeo.brandName}`;
const DESCRIPTION=`사주 보는 고양이 영냥이가 사주·자미두수·숙요·베다·점성술·타로 중 한 체계로 내 고민을 챕터별로 읽어 드려요. 고등어 상담 ${LOWEST_PRICE}부터, 결과는 내 상담에 보관돼요.`;
const URL_=`https://code-destiny.com${PATH}`;
export const metadata:Metadata={title:{absolute:TITLE},description:DESCRIPTION,
 keywords:['사주 보는 고양이','사주보는고양이','사주보는 고양이','영냥이','꿀꿀 운세','천원 운세'],
 alternates:{canonical:URL_},robots:{index:true,follow:true},
 openGraph:{type:'website',locale:'ko_KR',url:URL_,siteName:siteSeo.brandName,title:TITLE,description:DESCRIPTION,images:[yeongnyangiOgImage]},
 twitter:{card:'summary_large_image',title:TITLE,description:DESCRIPTION,images:[yeongnyangiOgImage.url]}};
const jsonLd=[
 buildWebPageJsonLd({title:TITLE,description:DESCRIPTION,path:PATH}),
 buildBreadcrumbJsonLd([{name:siteSeo.brandName,path:'/ggulggul/'},{name:'사주 보는 고양이 영냥이',path:PATH}]),
 buildServiceJsonLd({name:'사주 보는 고양이 영냥이 운세 상담',description:'사주·자미두수·숙요점·베다점·서양 점성술·타로 중 한 체계의 계산을 바탕으로 AI가 고민을 챕터별로 해설하는 유료 운세 상담',path:PATH}),
 buildFaqPageJsonLd(YEONGNYANGI_FAQS),
];
const serialize=(value:unknown)=>JSON.stringify(value).replace(/</g,'\u003c');
export default function Page(){return <>
 <Home guide={<KoreanOnly><YeongnyangiGuide/></KoreanOnly>}/>
 {jsonLd.map((item,index)=><script key={index} type="application/ld+json" dangerouslySetInnerHTML={{__html:serialize(item)}}/>)}
</>;}
