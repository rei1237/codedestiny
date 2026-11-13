// Test harness only. Callers must provide a fake API; remote requests fail closed.
export function createOfflineFetch({origin,nativeFetch,fakeApi}){
 const local=new URL(origin).origin;
 return async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,local);
  const request=new Request(input instanceof Request?input:url.href,init);
  if(url.origin==='https://code-destiny.com'&&url.pathname.startsWith('/api/toss/'))return fakeApi(request);
  if(url.origin===local&&request.method==='POST'&&/^\/__offline_question_sky\/(horary|prashna)$/.test(url.pathname))return nativeFetch(request);
  if(url.origin===local&&request.method==='GET'&&!url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/__canonical_api/'))return nativeFetch(request);
  throw new TypeError('Offline test mode blocks unexpected network requests');
 };
}
