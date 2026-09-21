import type {Metadata} from 'next';
import {siteSeo} from '@/lib/seo/siteSeo';
import Home from './_components/Home';
// 🔴 noindex 유지: 서버 HTML 의 문장급 본문이 286단위라 verify:indexable-prose-depth(900) 를 넘지 못한다(2026-09-16 실측).
//    검색 착륙은 /yeongnyangi/1000-won-fortune/ 이 맡는다. 공유 카드만 루트("무료 사주·타로·궁합") 상속을 끊는다.
const TITLE='사주보는 고양이 영냥이 | CODE DESTINY';
const DESCRIPTION='기존 CODE DESTINY 계정으로 영냥이의 사주, 자미두수, 숙요, 베다, 점성술, 타로 상담을 만나보세요.';
const URL_='https://code-destiny.com/yeongnyangi/';
const OG_IMAGE='https://code-destiny.com/assets/yeongnyangi/original/kakao-profile.png';
export const metadata:Metadata={title:TITLE,description:DESCRIPTION,alternates:{canonical:URL_},robots:{index:false,follow:true},
 openGraph:{type:'website',locale:'ko_KR',url:URL_,siteName:siteSeo.brandName,title:TITLE,description:DESCRIPTION,images:[{url:OG_IMAGE,width:800,height:800,alt:siteSeo.brandName}]},
 twitter:{card:'summary_large_image',title:TITLE,description:DESCRIPTION,images:[OG_IMAGE]}};
export default function Page(){return <Home/>;}
