// /moonlit-lotus/ 의 화면 선택. 기존 공간 딥링크(?scene·activity·view)와 "둘러보기"(?stay=1)는 기존 Space 로 간다.
export type MoonlitMode='space'|'ritual';
export const SPACE_PARAMS=['scene','activity','view'] as const;
export function moonlitMode(search:string):MoonlitMode{
 const params=new URLSearchParams(search);
 if(params.get('stay')==='1')return 'space';
 return SPACE_PARAMS.some(name=>params.has(name))?'space':'ritual';
}
/** 둘러보기로 넘어갈 때의 주소. 다른 파라미터(lang 등)는 그대로 둔다. */
export function stayUrl(search:string){
 const params=new URLSearchParams(search);params.set('stay','1');
 return '?'+params.toString();
}
