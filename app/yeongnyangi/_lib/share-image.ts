import type {Metadata} from 'next';

// 영냥이 링크 공유 카드(1200x630). 원본은 scripts/og/yeongnyangi-card.html → npm run og:render.
// 파일명은 영구 고정이고, 카드를 다시 렌더하면 ?v= 를 렌더러가 출력한 해시로 바꾼다.
export const yeongnyangiOgImage={
 url:'https://code-destiny.com/og/yeongnyangi-og.png?v=a97cb41a65',
 width:1200,
 height:630,
 alt:'사주 두루마리를 펼친 사주 보는 고양이 영냥이',
};

// /yeongnyangi/** 페이지가 루트(꿀꿀 운세) 카드를 물려받지 않도록 openGraph·twitter 를 함께 채운다.
export function yeongnyangiShareMetadata(title:string,description:string):Pick<Metadata,'openGraph'|'twitter'>{
 return {
  openGraph:{type:'website',locale:'ko_KR',title,description,images:[yeongnyangiOgImage]},
  twitter:{card:'summary_large_image',title,description,images:[yeongnyangiOgImage.url]},
 };
}
