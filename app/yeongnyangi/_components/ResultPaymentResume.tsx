'use client';
import {usePaidResume} from '@/app/hooks/usePaidResume';
import {openYeongnyangiResultFromResume,YEONGNYANGI_RESULT_RESUME_KIND} from '../_lib/result-resume';

/**
 * 채팅 안 결제창에서 모바일 PG 가 상위 프레임을 되돌리면 새 문서에는 결제 시트(YeongnyangiCheckout)가
 * 마운트되지 않아(복귀 URL 에 PG 쿼리가 붙어 대화 초안이 복원되지 않는다) 재개 핸들러가 없었다 —
 * 결제는 됐는데 결과(생성 중) 화면으로 못 가고 대화 첫 화면에 멈췄다. 복귀 문서에서만 이 핸들러를 건다.
 */
export default function ResultPaymentResume(){
 usePaidResume(YEONGNYANGI_RESULT_RESUME_KIND,args=>openYeongnyangiResultFromResume(args));
 return null;
}
