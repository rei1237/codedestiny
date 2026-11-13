import {tarotResultPath} from '../../../lib/tarot/toss-library-links.mjs';

export const reviewServices = Object.freeze([
  {id:'today-hub', title:'오늘의 운세', description:'오늘의 흐름과 마음에 담을 한마디', href:'/daily', group:'오늘'},
  {id:'saju', title:'기본 사주', description:'네 기둥과 오행으로 보는 나의 명식', href:'/saju/basic/play', group:'사주'},
  {id:'manse', title:'만세력', description:'태어난 날의 명식과 대운 살펴보기', href:'/manse', group:'사주'},
  {id:'animal-destiny', title:'십이운성 동물점', description:'내 운성을 상징하는 동물 찾기', href:'/saju/animal-destiny', group:'사주'},
  {id:'famous-saju', title:'유명인 사주', description:'공개 이력과 명식으로 읽는 인물 이야기', href:'/insights/famous-saju', group:'사주'},
  {id:'fortune-chat', title:'연이의 상담 편지', description:'마음에 남은 고민을 편지로 나누기', href:'/fortune-tea-house/?counsel=letter', group:'상담'},
  {id:'yeongnyangi', title:'영냥이 사주 상담', description:'내 사주와 질문에 맞춰 상담 시작하기', href:'/yeongnyangi/fortune/?domain=saju&flow=question', group:'상담'},
]);

const normalizePath = path => path.replace(/\/$/, '') || '/';
const publicPaths = new Set([
  ...reviewServices.filter(row=>row.id!=='fortune-chat').map(row=>normalizePath(row.href.split('?')[0])),
  '/library','/records','/recovery','/login','/checkout','/settings','/support','/contact',
  '/withdraw','/terms','/privacy-policy','/refund-policy','/result','/yeongnyangi/result','/yeongnyangi/library',
]);
const receiptKeys = new Set(['orderId','id','resultId','recoverResultId','sessionId','attemptId','cid','intentId','consultation']);

export const reviewYeongnyangiHref=reviewServices.find(row=>row.id==='yeongnyangi').href;

export function resolveReviewEntry(pathname, search, serviceShell) {
  const path=normalizePath(pathname);
  if (path==='/yeongnyangi/fortune' && pathname+search!==reviewYeongnyangiHref)
    return {redirect:reviewYeongnyangiHref};
  const route=reviewRoute(pathname,search);
  if (route==='excluded' || (route==='receipt' && !serviceShell && path!=='/tarot-library'))
    return {redirect:'/'};
  return {receipt:route==='receipt'};
}

export function reviewRoute(pathname,search='') {
  const path=normalizePath(pathname), query=new URLSearchParams(search);
  if (path==='/' || path==='/index.html' || path==='/home') {
    const action=query.get('action');
    return !action || action==='cdOneStepFreeSajuEntry' ? 'public' : 'excluded';
  }
  if (publicPaths.has(path)) return 'public';
  if (path==='/fortune-tea-house' && query.get('counsel')==='letter' &&
      !query.get('session') && !query.get('resultId')) return 'public';
  // A query is only a candidate. The authenticated library must confirm its exact URL.
  if ([...query].some(([key,value])=>receiptKeys.has(key)&&value)) return 'receipt';
  return 'excluded';
}

// These original result screens validate the authenticated order in their own API.
// Native report recovery links must also match an exact URL from the purchase library.
export function requiresOwnedReceipt(pathname,search) {
  const path=normalizePath(pathname), query=new URLSearchParams(search);
  if (path==='/heukwol' && query.get('result')) return true;
  if (['/result','/yeongnyangi/result','/checkout','/login'].includes(path)) return false;
  if (path==='/fortune-tea-house' && query.get('counsel')==='letter' && !query.get('session') && !query.get('resultId')) return false;
  return [...query].some(([key,value])=>value && (receiptKeys.has(key) || key==='session'));
}

export async function ownsReviewReceipt(href,readPage) {
  const cursors=new Set();
  let cursor=null;
  do {
    const page=await readPage(cursor);
    if (!Array.isArray(page?.purchases)) return false;
    if (page.purchases.some(row=>{
      if (!['PAYMENT_COMPLETED','PURCHASED'].includes(row.status) || ['REFUNDED','ACCESS_REVIEW','READ_FAILED'].includes(row.state)) return false;
      const link=row.href || (row.serviceId==='tarot-library' ? tarotResultPath(row.orderId) : '');
      return Boolean(link && (link===href || (row.nativeService==='life-book' && row.entryHref===href)));
    })) return true;
    cursor=page.nextCursor;
    if (cursors.has(cursor)) return false;
    cursors.add(cursor);
  } while (cursor);
  return false;
}
