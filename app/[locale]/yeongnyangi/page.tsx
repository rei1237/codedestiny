import type {Metadata} from 'next';
import {PUBLIC_LOCALES,localeUrlSegment} from '@/lib/i18n/locales';
import {createI18nMetadata} from '@/lib/seo/createI18nMetadata';
import {getAlternatesByRouteKey} from '@/lib/i18n/routes';
import {resolveLocale} from '../_lib';
import Home from '@/app/yeongnyangi/_components/Home';
import KoreanOnly from '@/app/yeongnyangi/_components/KoreanOnly';
import YeongnyangiGuide from '@/app/yeongnyangi/_components/YeongnyangiGuide';
import {yeongnyangiOgImage} from '@/app/yeongnyangi/_lib/share-image';

const SEO_COPY={
 ja:{title:'四柱推命を見る猫・ヨンニャンイ | 運勢相談',description:'四柱推命・紫微斗数・宿曜・ヴェーダ占星術・西洋占星術・タロットから一つを選び、今の悩みを章立てで読み解きます。',keywords:['四柱推命','運勢相談','タロット','紫微斗数']},
 zh:{title:'看四柱的猫咪英囊 | 运势咨询',description:'从四柱、紫微斗数、宿曜、吠陀占星、西方占星与塔罗中选择一种体系，分章节梳理你当下的烦恼。',keywords:['四柱','运势咨询','塔罗','紫微斗数']},
 'zh-TW':{title:'看四柱的貓咪英囊 | 運勢諮詢',description:'從四柱、紫微斗數、宿曜、吠陀占星、西方占星與塔羅中選擇一種體系，分章整理你當下的煩惱。',keywords:['四柱','運勢諮詢','塔羅','紫微斗數']},
 en:{title:'Yeongnyangi, the Fortune-Telling Cat | Fortune Readings',description:'Choose Saju, Zi Wei Dou Shu, Sukuyo, Vedic or Western astrology, or tarot. Yeongnyangi reads your current concern in clear, focused chapters.',keywords:['Saju','fortune reading','tarot','Zi Wei Dou Shu']},
} as const;

export function generateStaticParams(){
 return PUBLIC_LOCALES.map(locale=>({locale:localeUrlSegment(locale)}));
}

export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
 const locale=resolveLocale((await params).locale);
 const copy=SEO_COPY[locale as keyof typeof SEO_COPY];
 return createI18nMetadata({
  locale,
  routeByLocale:getAlternatesByRouteKey('yeongnyangi'),
  title:copy.title,
  description:copy.description,
  keywords:[...copy.keywords],
  image:yeongnyangiOgImage.url,
 });
}

export default function LocalizedYeongnyangiPage(){
 return <Home guide={<KoreanOnly><YeongnyangiGuide/></KoreanOnly>}/>;
}
