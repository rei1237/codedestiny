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
        return typeof payload?.error==='string'?Response.json({...payload,code:payload.error,error:{code:payload.error}},{status:response.status,headers:response.headers}):response;
      }
      catch(error){return Response.json({error:{code:error.code||'REQUEST_FAILED'},code:error.code||'REQUEST_FAILED',message:error.code==='TOSS_RELEASE_PENDING'?'출시 준비 중이에요. 상품 등록과 검수가 완료되면 상담을 시작할 수 있어요.':'상담에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'},{status:error.status||503});}
    }
    if(url.origin!==origin)throw new TypeError('Unsupported service endpoint');
    return nativeFetch(input,init);
  };
}
