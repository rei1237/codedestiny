// Same adapter in the release bundle and injected-network tests. No fixtures or
// fallback to web authentication/payment endpoints are imported here.
export function createServiceFetch({nativeFetch,send,origin}) {
  return async(input,init)=>{
    const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,origin);
    const request=new Request(input instanceof Request?input:url.href,init);
    // platform.ts alone constructs these calls with the Toss token. Keep its
    // injected fetch boundary intact for the existing purchase/recovery tests.
    if(url.origin==='https://code-destiny.com'&&url.pathname.startsWith('/api/toss/'))return nativeFetch(request);
    if(url.pathname.startsWith('/api/')&&(url.origin===origin||url.origin==='https://code-destiny.com')){
      try{
        const response=await send('/canonical'+url.pathname.slice('/api'.length)+url.search,request);
        if(response.ok)return response;
        const payload=await response.clone().json().catch(()=>null);
        if(typeof payload?.error==='string'||[401,403].includes(response.status)&&payload&&typeof payload==='object'){
          const headers=new Headers(response.headers);headers.delete('content-length');
          return Response.json({...payload,...(typeof payload.error==='string'?{code:payload.error,error:{code:payload.error}}:{}),...(response.status===403?{message:'구매 내역에 접근할 권한을 확인할 수 없어요. 구매한 계정과 주문 내역을 확인해 주세요.'}:response.status===401?{message:'기록과 구매를 확인하려면 토스 로그인이 필요해요.'}:{})},{status:response.status,headers});
        }
        return response;
      }
      catch(error){return Response.json({error:{code:error.code||'REQUEST_FAILED'},code:error.code||'REQUEST_FAILED',message:error.status===403?'구매 내역에 접근할 권한을 확인할 수 없어요. 구매한 계정과 주문 내역을 확인해 주세요.':error.status===401?'기록과 구매를 확인하려면 토스 로그인이 필요해요.':error.code==='TOSS_RELEASE_PENDING'?'출시 준비 중이에요. 상품 등록과 검수가 완료되면 상담을 시작할 수 있어요.':'상담에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'},{status:error.status||503});}
    }
    if(url.origin!==origin)throw new TypeError('Unsupported service endpoint');
    return nativeFetch(input,init);
  };
}
