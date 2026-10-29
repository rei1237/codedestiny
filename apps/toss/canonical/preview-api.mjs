import {createHash} from 'node:crypto';
import {createTeaMock} from '../../../scripts/fixtures/mock-tea-house.mjs';

// Process-local fixtures: no database, provider, payment SDK or network fallback.
export function createPreviewApi(server,root){
 const owner='canonical-preview-user', rows=new Map(),attempts=new Map(),teaRows=new Map();
 const profiles=[{profileId:'canonical-preview-profile',name:'화면 테스트 프로필',gender:'F',birth:{year:1990,month:5,day:15,hour:12,minute:0,timeUnknown:false,calType:'solar'},location:{label:'대한민국 서울',tz:'Asia/Seoul',lat:37.5665,lng:126.978}}];
 const tea=createTeaMock();
 const loadContract=path=>server.ssrLoadModule('/@fs/'+root.replaceAll('\\','/')+'/'+path);
 return async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Code-Destiny-Mock':'1'});res.end(JSON.stringify(data));};
  if(req.headers['x-cd-preview']!=='canonical')return send(403,{ok:false});
  try{
   const url=new URL(req.url,'http://localhost'),path=url.pathname.slice('/__canonical_api'.length);
   let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>1000000)return send(413,{ok:false});}
   const input=raw?JSON.parse(raw):{};
   if(path==='/api/auth/me')return send(200,{ok:true,authenticated:true,user:{id:owner,_id:owner,name:'개발 테스트',role:'user'}});
   if(path==='/api/yeongnyangi/profiles'||path==='/api/profile'){
    if(req.method==='POST'){const profile=input.profile;if(!profile?.profileId)return send(400,{ok:false});const previous=profiles.findIndex(p=>p.profileId===profile.profileId);if(previous>=0)profiles[previous]=profile;else profiles.push(profile);return send(200,{ok:true,profile});}
    return send(200,{ok:true,profiles,currentId:profiles[0]?.profileId});
   }
   if(path==='/api/recommendations')return send(200,{enabled:false,products:[]});
   if(path==='/api/fortune-tea-house/honey-drops/balance')return send(200,{ok:true,honeyDrops:{authenticated:true,balance:0,currentHoneyDrops:0,totalHoneyDrops:0,unlocked:false,disabled:true}});
   if(path==='/api/reviews/products')return send(200,{ok:true,items:[],rewardPolicy:{amount:0,currency:'moonstone',trigger:'approved'}});
   if(path==='/api/yeongnyangi/saju/experience-check')return send(200,{check:null});
   if(path==='/api/records')return send(200,{ok:true,items:[...teaRows.values()].map(result=>({id:result.resultId,key:'tea:'+result.resultId,source:'tea',serviceId:'fortune-tea-house',serviceName:'운명의 찻집',title:result.sessionTitle,question:result.questionSummary,createdAt:result.createdAt,status:'completed',character:'yeoni',group:'chat',href:'/records/view/?source=tea&id='+encodeURIComponent(result.resultId),startHref:'/fortune-tea-house/'})),failures:[],nextCursor:null});
   const teaFollow=path.match(/^\/api\/fortune-tea-house\/results\/([^/]+)\/follow-up$/);
   if(teaFollow){
    const result=teaRows.get(teaFollow[1]);if(!result)return send(404,{ok:false});
    const previous=result.followUps.find(item=>item.clientQuestionId===input.clientQuestionId);
    if(previous&&previous.question!==input.question)return send(409,{ok:false});
    if(!previous){
     if(!result.followUpAllowance.remaining)return send(409,{ok:false,errorCode:'FOLLOW_UP_LIMIT_REACHED'});
     if(!input.clientQuestionId||String(input.question||'').replace(/\s/g,'').length<4)return send(422,{ok:false});
     result.followUps.push({clientQuestionId:input.clientQuestionId,question:input.question,createdAt:new Date().toISOString(),answer:{directAnswer:'[개발용 샘플] 추가 질문 답변입니다.',evidence:['처음 저장한 상담 근거를 유지합니다.'],guidance:'답변과 다시 보기 동작을 확인해 주세요.',caution:'실제 AI 해석이 아닙니다.',closing:'저장된 답변은 그대로 다시 읽을 수 있어요.'}});
     result.followUpAllowance={limit:1,used:1,remaining:0};
    }
    return send(200,{ok:true,followUp:previous||result.followUps[0],followUps:result.followUps,followUpAllowance:result.followUpAllowance,alreadyApplied:!!previous});
   }
   if(path.startsWith('/api/fortune-tea-house/'))return tea(req.method+' '+path,input,owner,(status,data)=>{
    if(data.result){const id=data.result.resultId;const stored=teaRows.get(id);if(stored)data.result=stored;else{data.result.followUps=[];data.result.followUpAllowance={limit:1,used:0,remaining:1};teaRows.set(id,data.result);}}
    send(status,data);
   });
   if(path==='/api/yeongnyangi/products'){
    const {products}=await loadContract('worker/yeongnyangi/payments/catalog.ts');
    return send(200,{products:products.map(product=>({...product,available:product.domain==='saju'}))});
   }
   if(path==='/api/yeongnyangi/requests'&&req.method==='POST'){
    const {products}=await loadContract('worker/yeongnyangi/payments/catalog.ts');
    const {questionManifest,questionDecision,FOLLOWUP_LIMITS}=await loadContract('worker/yeongnyangi/fortune/ask/question-policy.ts');
    const product=products.find(p=>p.id===input.productId);
    if(!product||product.domain!=='saju')return send(422,{message:'이번 테스트는 영냥이 사주 질문 상담부터 제공해요.'});
    const attempt=String(input.consultationAttemptId||'');if(!attempt)return send(400,{message:'상담 요청 식별자가 필요해요.'});
    const signature=JSON.stringify(input),old=attempts.get(attempt);
    if(old){if(old.signature!==signature)return send(409,{message:'같은 요청의 입력이 변경되었습니다.'});return send(200,{fortune:rows.get(old.id)});}
    const id=createHash('sha256').update(owner+attempt).digest('hex');
    const decision=questionDecision(input.questionDecision);
    const manifest=questionManifest('saju',product.fishId,decision,undefined,input.question);
    const chapters=manifest.map((chapter,index)=>({title:chapter.title,summary:'[개발용 샘플] '+chapter.title,analysis:['원본 결과의 문단·목차·이어서 읽기 동작을 확인하는 샘플입니다. 실제 개인 해석이 아닙니다.'],blocks:[{id:'sample-'+index,title:chapter.title,paragraphs:['질문과 계산 근거를 연결한 해설이 표시되는 자리입니다. 이 테스트에서는 유료 AI를 호출하지 않습니다.']}],advice:'확인한 사실과 아직 모르는 부분을 구분해 적어보세요.',persona:'이곳에는 영냥이의 마무리 조언이 담겨요.',...(index===0?{questionAnswers:[{questionId:'q1',answer:'[개발용 샘플] 질문에 대한 첫 답변이 표시되는 자리입니다.',reason:'실제 계산·AI 해석 결과로 판단하면 안 됩니다.',timing:'시기 해석을 표시하는 화면 샘플입니다.',action:'입력한 질문과 목차, 추가 질문의 표시를 확인하세요.',review:'다시 열었을 때 같은 결과를 읽을 수 있나요?'}]}:{})}));
    const limit=FOLLOWUP_LIMITS[product.fishId]||0;
    const row={id,productId:product.id,product,profileId:input.profileId,state:'COMPLETED',paid:true,locale:'ko',createdAt:new Date().toISOString(),manifest,chapters,charts:[],consultation:{question:input.question,questions:[{id:'q1',text:input.question}],questionDecision:decision},conversation:{limit,used:0,remaining:limit,closed:!limit,ready:true,exchanges:[]},recovery:{requestId:id,savedChapters:chapters.length,totalChapters:chapters.length,nextAction:'reread',providerNeeded:false,retryable:false,canRetryNow:false,autoResume:false}};
    rows.set(id,row);attempts.set(attempt,{id,signature});return send(200,{fortune:row});
   }
   if(path==='/api/yeongnyangi/requests')return send(200,{fortunes:[...rows.values()].map(row=>({...row,completedChapters:row.chapters.length,totalChapters:row.manifest.length})),nextCursor:null});
   const match=path.match(/^\/api\/yeongnyangi\/requests\/([a-f0-9]{64})(\/(?:generate|activate|conversation))?$/);
   if(match){const row=rows.get(match[1]);if(!row)return send(404,{message:'이 개발 서버에 저장된 샘플을 찾지 못했어요.'});
    if(match[2]==='/conversation'){
     const c=row.conversation,previous=c.exchanges.find(e=>e.id===input.id);
     if(previous&&previous.question!==input.question)return send(409,{message:'같은 요청의 질문이 달라졌어요.'});
     if(!previous){if(!c.remaining||!String(input.question||'').trim())return send(409,{message:'추가 질문을 확인해 주세요.'});c.exchanges.push({id:input.id,question:input.question,kind:'answer',text:'[개발용 샘플] 추가 질문 답변이 저장되었습니다. 실제 AI 상담 내용은 아닙니다.'});c.used++;c.remaining--;c.closed=!c.remaining;}
    }return send(200,{fortune:row});
   }
   return send(501,{ok:false,error:{code:'PREVIEW_ENDPOINT_UNAVAILABLE',message:'이 연결은 아직 테스트에 준비되지 않았어요.'},message:'이 연결은 아직 테스트에 준비되지 않았어요.'});
  }catch(error){server.config.logger.error('[canonical-preview] '+error.message);if(!res.writableEnded)send(500,{ok:false,message:'개발용 샘플 요청을 처리하지 못했어요.'});}
 };
}
