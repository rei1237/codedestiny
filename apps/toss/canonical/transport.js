const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
export function installPreviewTransport(){
  if(!import.meta.env.DEV)throw new Error('Development preview only');
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);
    const request=new Request(input instanceof Request?input:url.href,init);
    const body=['GET','HEAD'].includes(request.method)?undefined:await request.clone().text();
    if(url.pathname.startsWith('/api/neo-operation-room/')){
      const {neoFixture}=await import('./neo-fixture.js');
      const data=await neoFixture(url,body?JSON.parse(body):{},request.headers.get('Idempotency-Key'));
      return json(data||{ok:false,message:'준비되지 않은 개발용 연결입니다.'},data?(data.ok===false?404:200):501);
    }
    if(url.pathname.startsWith('/api/')){
      const headers=new Headers(request.headers);headers.delete('Authorization');headers.set('X-CD-Preview','canonical');
      const response=await nativeFetch('/__canonical_api'+url.pathname+url.search,{method:request.method,body,signal:request.signal,credentials:'omit',headers});
      if(url.pathname==='/api/records'&&response.ok){
        const {neoPreviewRecord,readNeoPreview}=await import('./neo-fixture.js');
        const data=await response.json(),neo=readNeoPreview();if(neo)data.items.push(neoPreviewRecord(neo));
        const source=url.searchParams.get('source'),group=url.searchParams.get('group'),query=url.searchParams.get('q')||'';
        data.items=data.items.filter(item=>(!source||item.source===source)&&(!group||group==='all'||item.group===group)&&(!query||(item.title+' '+item.question).includes(query)));
        return json(data);
      }
      if(!response.ok)console.warn('[canonical-preview]',url.pathname,response.status);
      return response;
    }
    if(url.origin!==location.origin)throw new TypeError('Preview network is local only');
    return nativeFetch(input,init);
  };
}
