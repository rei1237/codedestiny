import type {PaidResumeArgs} from '@/app/hooks/usePaidResume';

/** 상담 결제(채팅 안 결제창·/checkout/ 양쪽)가 서술자에 싣는 재개 종류. */
export const YEONGNYANGI_RESULT_RESUME_KIND='yeongnyangi-checkout';

const RESULT_TARGET=/^\/yeongnyangi\/result\/\?id=[a-f0-9]{64}(?:&lang=[a-z-]+)?$/;

/** 결제 전에 굳혀 둔 결과 주소로만 이동한다. 형식이 다르면 false — 런타임이 '지금 열기' 카드로 떨어뜨린다. */
export function openYeongnyangiResultFromResume(args:PaidResumeArgs,navigate:(target:string)=>void=target=>window.location.replace(target)):boolean{
 const target=typeof args.returnTo==='string'?args.returnTo:'';
 if(!RESULT_TARGET.test(target))return false;
 navigate(target);return true;
}
