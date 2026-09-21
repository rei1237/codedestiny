export type SocialProvider='google'|'naver'|'kakao';
function returnPath(value:string){return value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')?value:'/yeongnyangi/';}
export function loginHref(returnTo:string){const next=returnPath(returnTo);return '/login/?'+new URLSearchParams({returnTo:next,next,redirect:next});}
export function socialLoginHref(provider:SocialProvider,returnTo:string,flow:'login'|'signup'='login'){
 return `/api/auth/oauth/${provider}/start?${new URLSearchParams({flow,next:returnPath(returnTo)})}`;
}
export function ggulggulFortuneHref(_path='/'){return '/ggulggul/';}
export const mainServiceLinks=[{label:'오늘의 무료 운세',href:'/today/'},{label:'내 결과',href:'/yeongnyangi/library/'},{label:'영냥이 홈',href:'/'},{label:'운세 보기',href:'/yeongnyangi/fortune/'},{label:'영냥이의 방',href:'/yeongnyangi/room/'},{label:'꽃돼지 운세',href:'/ggulggul/'}];
export const legalLinks=[{label:'이용약관',href:'/terms/'},{label:'개인정보처리방침',href:'/privacy-policy/'},{label:'환불·취소',href:'/refund-policy/'},{label:'고객센터',href:'/contact/'},{label:'서비스 소개',href:'/about/'},{label:'자주 묻는 질문',href:'/faq/'},{label:'면책 안내',href:'/disclaimer/'},{label:'콘텐츠 편집 원칙',href:'/editorial-policy/'},{label:'광고 정책',href:'/advertising-policy/'}];
