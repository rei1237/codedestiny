// Explicitly synthetic, local-only fixture for the official SDK devtools.
export function createOfflineFixtureApi(storage){
 let saved;try{saved=JSON.parse(storage?.getItem('toss-offline-fixture')||'null');}catch{saved=null;}
 const state={loggedIn:saved?.loggedIn===true,intents:new Map(saved?.intents||[]),letters:new Map(saved?.letters||[]),orders:new Map(saved?.orders||[]),sequence:Number.isSafeInteger(saved?.sequence)?saved.sequence:0};
 const save=()=>{try{storage?.setItem('toss-offline-fixture',JSON.stringify({loggedIn:state.loggedIn,intents:[...state.intents],letters:[...state.letters],orders:[...state.orders],sequence:state.sequence}));}catch{/* The test remains in memory when storage is unavailable. */}};
 const letterProduct={id:'yeoni:chat_saju',name:'테스트 연이 상담',sku:'mock-yeoni',approvedPriceKRW:1,available:true,chapters:1};
 const product={id:'native:maya:maya-prompt-generator',name:'테스트 상품',sku:'mock-maya',featureKey:'maya-prompt-generator',approvedPriceKRW:1,available:true};
 const respond=(value,status=200)=>Response.json(value,{status});
 const denied=()=>respond({error:'LOGIN_REQUIRED'},401);
 async function handle(request){
  const url=new URL(request.url),path=url.pathname.slice('/api/toss'.length),method=request.method;
  if(path==='/login'&&method==='POST'){state.loggedIn=true;save();return respond({token:'local-mock-token'});}
  if(!state.loggedIn||request.headers.get('Authorization')!=='Bearer local-mock-token')return denied();
  if(path==='/session'&&method==='GET')return respond({authenticated:true,environment:'SANDBOX'});
  if(path==='/canonical/auth/me'&&method==='GET')return respond({ok:true,authenticated:true,user:{id:'offline-test-user',name:'테스트 사용자',role:'user'}});
  if(path==='/native/catalog'&&method==='GET')return respond({products:[product]});
  if(path==='/catalog'&&method==='GET')return respond({products:[letterProduct]});
  if(path==='/canonical/yeongnyangi/profiles'&&method==='GET')return respond({ok:true,profiles:[{id:'mock-profile',profileId:'mock-profile',name:'테스트 프로필',gender:'F',birthDate:'1990-01-01',timeUnknown:true,calendarType:'solar',birth:{year:1990,month:1,day:1,timeUnknown:true,calType:'solar'}}],currentId:'mock-profile'});
  if(path==='/canonical/fortune-chat/consultations'&&method==='GET')return respond({ok:true,consultations:[...state.letters.values()].filter(row=>row.paid).map(row=>({id:row.id,persona:row.persona,state:row.state,paid:true,domain:'saju',completedChapters:1,totalChapters:1,question:row.consultation.question,createdAt:row.createdAt})),nextCursor:null});
  if(path==='/canonical/fortune-chat/consultations'&&method==='POST'){const body=await request.json(),id=(++state.sequence).toString(16).padStart(64,'0'),row={id,persona:'yeoni',productId:'chat_saju',state:'CREATED',paid:false,chapters:[],manifest:[{id:'test',title:'테스트 상담'}],consultation:{question:String(body.question||'테스트 질문')},createdAt:new Date().toISOString(),recovery:{canRetryNow:false,savedChapters:0,totalChapters:1}};state.letters.set(id,row);save();return respond({ok:true,consultation:row});}
  const letter=/^\/canonical\/fortune-chat\/consultations\/([a-f0-9]{64})(?:\/(generate))?$/.exec(path);
  if(letter){const row=state.letters.get(letter[1]);if(!row)return respond({error:'RESULT_NOT_FOUND'},404);if(letter[2]&&method==='POST'&&!row.paid)return respond({error:'PAYMENT_REQUIRED'},402);return respond({ok:true,consultation:row});}
  if(path==='/events'&&method==='POST')return respond({ok:true});
  if(path==='/native/maya/prepare'&&method==='POST'){
   const body=await request.json();if(!body.input||body.orderId)return respond({error:'MOCK_UNSUPPORTED'},400);
   const id=(++state.sequence).toString(16).padStart(64,'0');const intent={id,sku:product.sku,amountKRW:product.approvedPriceKRW,paid:false,orderId:null,input:body.input};state.intents.set(id,intent);save();return respond(intent);
  }
  if(path==='/orders/grant'&&method==='POST'){
   const body=await request.json(),letter=body.sku===letterProduct.sku?state.letters.get(body.requestId):null,intent=body.sku===product.sku?state.intents.get(body.requestId):letter;if(!intent||typeof body.orderId!=='string')return respond({error:'ORDER_MISMATCH'},403);
   const prior=state.orders.get(body.orderId);if(prior&&prior!==intent.id||intent.orderId&&intent.orderId!==body.orderId)return respond({error:'ORDER_ALREADY_ASSIGNED'},409);
   state.orders.set(body.orderId,intent.id);intent.orderId=body.orderId;intent.paid=true;if(letter){letter.state='COMPLETED';letter.chapters=[{id:'test',title:'테스트 상담',summary:'[테스트 전용 예시] 실제 상담 결과가 아닙니다.',analysis:[],questionAnswers:[]}];letter.recovery={canRetryNow:false,savedChapters:1,totalChapters:1};}save();return respond({orderId:body.orderId,requestId:intent.id,entitlement:'granted',durable:true});
  }
  const match=/^\/native\/maya\/(intents|results)\/([a-f0-9]{64})$/.exec(path);
  if(match){const intent=state.intents.get(match[2]);if(!intent)return respond({error:'RESULT_NOT_FOUND'},404);if(match[1]==='intents'&&method==='GET')return respond(intent);if(!intent.paid)return respond({error:'PAYMENT_REQUIRED'},402);if(method==='POST'){intent.result='[테스트 전용 예시] 이 내용은 실제 운세나 상담 결과가 아닙니다.';save();}return respond({id:intent.id,state:intent.result?'COMPLETED':'PENDING',...(intent.result?{prompt:intent.result}:{})});}
  return respond({error:'OFFLINE_FIXTURE_NOT_IMPLEMENTED'},501);
 }
 return {handle,state,product,letterProduct};
}
