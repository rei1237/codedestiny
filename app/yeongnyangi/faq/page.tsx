import type {Metadata} from 'next';
import {serializeJsonLd} from '@/lib/seo/json-ld.mjs';
import {siteSeo} from '@/lib/seo/siteSeo';
import {BRAND_FACTS} from '@/lib/brand/brand-facts.mjs';
import {ROBOTS_META} from '../../../lib/seo/index-policy.mjs';
import {buildBreadcrumbJsonLd,buildFaqPageJsonLd,buildWebPageJsonLd} from '@/lib/structured-data';
import {yeongnyangiOgImage} from '../_lib/share-image';
import {YeongnyangiBeforeGuide,YEONGNYANGI_FAQS} from '../_components/YeongnyangiGuide';
import KoreanOnly from '../_components/KoreanOnly';
import ServiceNavigation from '../_home/ServiceNavigation';

// 영냥이 결제 전 안내·자주 묻는 질문 전용 페이지(2026-11-21). 홈에서 접힌 안내를 걷어 내고 이곳으로 옮겼다.
// FAQPage JSON-LD 는 화면에 보이는 YEONGNYANGI_FAQS 와 같은 배열에서 만든다. 가격·챕터는 YeongnyangiGuide 가 카탈로그에서 읽는다.
const PATH='/yeongnyangi/faq/';
const URL_=`https://code-destiny.com${PATH}`;
const TITLE=`운세보는 영냥이 자주 묻는 질문 | ${BRAND_FACTS.service.name}`;
const DESCRIPTION='사주 보는 고양이 영냥이 상담의 가격, 상담 구성, 추가 질문, 결과 확인 방법과 환불·문의 안내를 영냥이가 컷으로 설명해 드려요.';
const YEONGNYANGI=BRAND_FACTS.characters.find(character=>character.key==='yeongnyangi')!;
export const metadata:Metadata={title:{absolute:TITLE},description:DESCRIPTION,
 alternates:{canonical:URL_},robots:ROBOTS_META.INDEX,
 openGraph:{type:'website',locale:'ko_KR',url:URL_,siteName:siteSeo.brandName,title:TITLE,description:DESCRIPTION,images:[yeongnyangiOgImage]},
 twitter:{card:'summary_large_image',title:TITLE,description:DESCRIPTION,images:[yeongnyangiOgImage.url]}};
const jsonLd=[
 buildWebPageJsonLd({title:TITLE,description:DESCRIPTION,path:PATH}),
 buildBreadcrumbJsonLd([{name:BRAND_FACTS.service.name,path:'/'},{name:YEONGNYANGI.serviceName,path:'/yeongnyangi/'},{name:'자주 묻는 질문',path:PATH}]),
 buildFaqPageJsonLd(YEONGNYANGI_FAQS),
];
export default function Page(){return <>
 <div className="ynOriginal"><main><KoreanOnly><YeongnyangiBeforeGuide/></KoreanOnly></main><ServiceNavigation/></div>
 {jsonLd.map((item,index)=><script key={index} type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(item)}}/>)}
</>;}
