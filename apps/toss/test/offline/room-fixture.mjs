// Local devtools only. No production price, receipt, calculation or generated text.
import {normalizeTeaFollowUpQuestion,teaFollowUpAllowance} from '../../../../worker/lib/fortune-tea-follow-up-contract.js';
import {neoRefinementAllowance} from '../../../../worker/lib/neo-refinement-contract.js';
const tea={service:'tea',name:'가상 찻집 사주',featureKey:'fortune-tea-house-saju-consultation',path:'/fortune-tea-house/'};
const neo={service:'neo',name:'가상 네오 전략 상담',featureKey:'neo-operation-room-consultation',path:'/neo-operation-room/result/'};
const heukwol={service:'heukwol',name:'가상 흑월 상담',featureKey:'heukwol-warning-consultation',path:'/heukwol/'};
const dream={service:'dream',name:'가상 정신분석 해몽',featureKey:'dream-psycho-analysis',path:'/dream/psycho/'};
const naming={service:'naming',name:'가상 사주 작명첩',featureKey:'premium-naming-prompt',path:'/naming-ai/result/'};
const sajuCompat={service:'saju-compat',name:'가상 사주 궁합',featureKey:'compat-saju-compatibility',path:'/saju/compatibility/'};
const codex={service:'codex',name:'가상 마스터 인연의 서 · 개인',featureKey:'master-love-codex',path:'/master-love-codex/result/'};
const compat={...codex,name:'가상 마스터 인연의 서 · 궁합',featureKey:'master-love-codex-compat'};
const palm={service:'palm',name:'가상 손금 리포트',featureKey:'palm-reading-general',path:'/palm-reading/'};
const palmIntentView=row=>({id:row.id,sku:row.sku,amountKRW:row.amountKRW,paid:row.paid,orderId:row.orderId});
const geomancy={service:'geomancy',name:'가상 지오맨시 흙점',featureKey:'geomancy',path:'/geomancy/'};
const totems=['basic','deep'].map(k=>({service:'totem-'+k,featureKey:'animal-totem-'+k,name:'가상 애니멀 토템 '+k,path:'/animal-totem/totem-'+k+'/'}));
const guardian={service:'guardian',name:'가상 사주 가디언',featureKey:'saju-guardian-unlock',path:'/saju-guardian/'};
const sibyl={service:'sibyl',name:'가상 시빌라 심층 리포트',featureKey:'premium-sibyl-dominator',path:'/saju/sibyl/'};
const rooms=[guardian,sibyl,...totems,sajuCompat,geomancy,tea,neo,heukwol,dream,naming,codex,compat,palm];
export const roomProducts=rooms.map(room=>({
  id:'native:'+room.service+':'+room.featureKey,name:room.name,featureKey:room.featureKey,
  sku:'mock-unregistered-room-'+(room===compat?'codex-compat':room.service),available:true,approvedPriceKRW:1,
}));
export const roomSdkProducts=roomProducts.map(p=>({sku:p.sku,type:'CONSUMABLE',displayName:p.name,displayAmount:'1원',iconUrl:'',description:'오프라인 가상 결제'}));
const reply=(data,status=200)=>Response.json(data,{status});
const fail=(error,status)=>reply({ok:false,error,reason:error},status);
const requestKey=input=>input?.idempotencyKey||input?.requestId;
const example='[테스트 전용] 찻집에서 저장한 결과 원문입니다.';
function teaResult(row){
  return {resultId:row.resultId,sessionTitle:example,questionSummary:row.input.question,consultationMode:'saju',consultationVersion:'tea-v2',
    teaCup:{id:row.input.cupId||'offline',name:'가상 찻잔',topic:'가상 질문',reading:example},
    saju:{available:true,title:'가상 사주',summary:example,keyPoints:[example]},
    tarot:{cardId:'',number:0,nameEn:'',nameKo:'',orientation:'upright',keywords:[],meaning:'',reading:''},
    emotionAnalysis:[],yeoniReading:{intro:example,main:example,advice:example,caution:example},
    synthesis:{title:example,summary:example,sajuTarotBridge:''},choiceSimulation:[],actionPrescription:example,luckyKeywords:[],closingLine:example};
}
export function roomPurchases(state){
  return [...state.intents.values()].filter(row=>rooms.some(room=>room.service===row.service)&&row.paid).map(row=>{
    const room=rooms.find(item=>item.service===row.service&&(!row.featureKey||item.featureKey===row.featureKey));
    return {requestId:row.id,orderId:row.orderId,sku:row.sku,serviceId:room.service,nativeService:room.service,
      productId:room.featureKey,status:'PURCHASED',state:row.result?'COMPLETED':'PENDING',createdAt:row.createdAt,
      href:room===palm||totems.includes(room)||room===sajuCompat||room===geomancy||room===dream||room===naming||room.service==='codex'?room.path+'?intentId='+row.id:room.service==='heukwol'?room.path+'?result='+row.id:room.service==='neo'?room.path+'?attemptId='+encodeURIComponent(row.result?row.resultId:'toss_'+row.id):
        room.path+'?'+(row.result?'resultId=':'recoverResultId=')+encodeURIComponent(row.resultId),
      question:room===guardian||room===sibyl?room.name:room===palm?'내 손금 리포트':room===sajuCompat?row.input.partnerName:room.service==='codex'?room.name.slice(3):room===naming?row.input.input.familyName+' 작명첩':row.input.question||row.input.dreamText,resultId:row.resultId};
  });
}
export async function roomRequest(request,url,path,state,save,now){
  const post=request.method==='POST';
  const match=/^\/native\/([a-z-]+)\/(prepare|intents\/([a-f0-9]{64}))$/.exec(path);
  let room=match&&rooms.find(item=>item.service===match[1]);
  if(room){
    if(!post&&match[3]){
      const row=state.intents.get(match[3]);
      return row?.service===room.service?reply(room===palm?palmIntentView(row):row):fail('RESULT_NOT_FOUND',404);
    }
    if(post&&match[2]==='prepare'){
      let {input,orderId}=await request.json();
      if(room===guardian||room===sibyl){
        const card=state.profiles.find(p=>p.profileId===input?.profileId);
        if(!card)return fail('PROFILE_REQUIRED',400);
        input.requestId=JSON.stringify([card.gender,card.birth]);
      }
      const key=requestKey(input);
      if(room===palm){
        const r=input?.reading;
        if(!r||!r.leftPalmImage&&!r.rightPalmImage)return fail('INVALID_PALM_IMAGE',400);
        const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(r)));
        input={requestId:key,digest:Array.from(new Uint8Array(bytes)).join('.'),dominantHand:r.dominantHand,analysisPurpose:r.analysisPurpose,uploadedHands:[...(r.leftPalmImage?['left']:[]),...(r.rightPalmImage?['right']:[])]};
      }
      if(room===codex&&input?.mode==='compat')room=compat;
      const valid=room===guardian||room===sibyl?input.profileId:room===palm?input.uploadedHands.length:totems.includes(room)?Array.isArray(input?.animalIds)&&input.animalIds.length===({one:1,three:3,five:5})[input.mode]&&(input.mode==='five')===(room===totems[1]):room===sajuCompat?input?.self?.pillars?.length===4&&input?.partner?.pillars?.length===4&&input?.facts?.score:room===geomancy?input?.question?.length>=2&&input?.counts?.length===16:room.service==='codex'?input?.reading?.birthInfo?.birthDate&&Boolean(input.reading.partnerInfo?.birthDate)===(room===compat):room===naming?input?.input?.familyName&&input.input.birthDate:room===dream?typeof input?.dreamText==='string'&&input.dreamText.trim().length>=8&&input.dreamText.length<=6000:input?.question;
      if(!key||!valid||input.featureKey&&input.featureKey!==room.featureKey)return fail('REQUEST_INPUT_MISMATCH',400);
      if(room===heukwol){const card=state.profiles.find(p=>p.profileId===input.profileId);if(!card)return fail('PROFILE_REQUIRED',400);if(card.birth?.timeUnknown!==false)return fail('BIRTH_TIME_REQUIRED',400);}
      let row=[...state.intents.values()].find(item=>item.service===room.service&&requestKey(item.input)===key);
      if(row&&room!==guardian&&room!==sibyl&&JSON.stringify(row.input)!==JSON.stringify(input))return fail('REQUEST_INPUT_MISMATCH',409);
      if(orderId&&(!row?.paid||row.orderId!==orderId))return fail('ORDER_MISMATCH',403);
      if(!row){
        const id=(++state.sequence).toString(16).padStart(64,'0');
        row={id,service:room.service,featureKey:room.featureKey,input,createdAt:now().toISOString(),resultId:'offline-'+id,paid:false,orderId:null,
          sku:roomProducts.find(p=>p.featureKey===room.featureKey).sku,amountKRW:1};
        if(room===palm){
          row.result={requestId:id,saved:true,analysisSaved:true,validation:{hasPalm:true},profile:{dominantHand:input.dominantHand,analysisPurpose:input.analysisPurpose},handContext:{uploadedHands:input.uploadedHands},mode:'partial',interpretation:{consultText:'[테스트 전용] 저장된 손금 판독 원문입니다.'}};
          row.generationCount=1;
        }
        state.intents.set(id,row);save();
      }
      return reply(room===palm?palmIntentView(row):row);
    }
  }
  if((path==='/orders/restore'||path==='/orders/grant')&&post){
    const {sku,orderId,requestId}=await request.clone().json();
    if(roomProducts.some(p=>p.sku===sku)){
      if(path==='/orders/grant'){
        const row=state.intents.get(requestId);
        if(!row||row.sku!==sku||!orderId)return fail('ORDER_MISMATCH',403);
        if(row.orderId&&row.orderId!==orderId||state.orders.has(orderId)&&state.orders.get(orderId)!==row.id)return fail('ORDER_ALREADY_ASSIGNED',409);
        if(!row.paid){
          row.paid=true;row.orderId=orderId;state.orders.set(orderId,row.id);
          if(!save()){row.paid=false;row.orderId=null;state.orders.delete(orderId);return fail('STORAGE_UNAVAILABLE',503);}
        }
        return reply({orderId,requestId:row.id,entitlement:'granted',durable:true});
      }
      const row=state.intents.get(state.orders.get(orderId));
      return row?.paid&&row.sku===sku&&row.orderId===orderId?reply({orderId,requestId:row.id,entitlement:'granted',durable:true}):fail('ORDER_MISMATCH',403);
    }
  }
  if(path==='/canonical/records'&&!post){
    const group=url.searchParams.get('group'),source=url.searchParams.get('source'),q=url.searchParams.get('q')?.trim();
    const items=roomPurchases(state).filter(r=>(!group||group==='all'||group==='report')&&(!source||source==='all'||source===r.serviceId)&&(!q||r.question.includes(q))).map(r=>({
      id:r.resultId,key:r.serviceId+':'+r.resultId,group:'report',source:r.serviceId,serviceId:r.serviceId,
      serviceName:rooms.find(room=>room.service===r.serviceId).name,title:r.question,question:r.question,
      createdAt:r.createdAt,status:r.state==='COMPLETED'?'completed':'generating',href:r.href,nativeHref:r.href,
    }));
    const letters=[...state.letters.values()].filter(r=>r.paid&&(!group||group==='all'||group==='chat')&&!source&&(!q||r.consultation.question.includes(q))).map(r=>({id:r.id,key:r.persona+':'+r.orderId,group:'chat',source:r.persona,serviceId:r.persona,serviceName:(r.persona==='neo'?'네오':'연이')+' 상담 편지',character:r.persona,title:r.consultation.question,question:r.consultation.question,createdAt:r.createdAt,status:'completed',href:'/fortune-tea-house/?counsel=letter'+(r.persona==='neo'?'&persona=neo':'')+'&consultation='+r.id}));
    return reply({ok:true,items:[...items,...letters],failures:[],nextCursor:null});
  }
  const palmResult=/^\/native\/palm\/results\/([a-f0-9]{64})$/.exec(path);
  if(palmResult){const row=state.intents.get(palmResult[1]);return !post&&row?.service==='palm'&&row.paid?reply(row.result):fail('RESULT_NOT_FOUND',404);}
  const codexResult=/^\/native\/codex\/results\/([a-f0-9]{64})$/.exec(path);
  if(codexResult){
    const row=state.intents.get(codexResult[1]);
    if(row?.service!=='codex'||!row.paid)return fail('RESULT_NOT_FOUND',404);
    const {mode,reading}=row.input;
    if(post&&!row.result){
      row.progress=(row.progress||0)+1;
      if(row.progress===2){
        const body='[테스트 전용] '+(mode==='compat'?'궁합판':'개인판')+'에 저장된 인연의 서 원문입니다.';
        row.result={sessionId:row.resultId,mode,featureKey:row.featureKey,birthInfo:reading.birthInfo,partnerInfo:reading.partnerInfo,chapters:[{id:'test',order:1,title:'모의 첫 장',body,symbol:'○'}],outline:[{id:'test',order:1,title:'모의 첫 장',symbol:'○',state:'ready'}],done:true,status:'completed',generationProgress:{completed:1,total:1},totalCharCount:body.length};row.generationCount=1;
      }save();
    }
    return row.result?reply(row.result):reply({ok:true,mode,done:false,status:'generating',retryable:true,generationProgress:{completed:0,total:1}},202);
  }
  const compatMatch=/^\/native\/saju-compat\/results\/([a-f0-9]{64})$/.exec(path);
  if(compatMatch){
    const row=state.intents.get(compatMatch[1]);
    if(row?.service!=='saju-compat'||!row.paid)return fail('RESULT_NOT_FOUND',404);
    if(post&&!row.result){
      row.parts=[...(row.parts||[]),'[테스트 전용] 두 사람의 관계를 살펴보는 궁합 해석이에요.'];
      if(row.parts.length===2){const {compatType,partnerName,self,partner,facts}=row.input;
        row.result={ok:true,saved:true,status:'completed',schemaVersion:2,type:'saju-compat-basic',promptVersion:'saju-compat-basic-p4',generatedAt:now().toISOString(),input:{compatType,partnerName,self,partner},facts,narrative:{overview:row.parts.join(' ')}};
        row.generations=(row.generations||0)+1;}save();
    }
    return reply(row.result||{ok:true,status:'partial',completedParts:row.parts||[],retryable:true});
  }
  const nameMatch=/^\/native\/naming\/results\/([a-f0-9]{64})$/.exec(path);
  if(nameMatch){
    const row=state.intents.get(nameMatch[1]);
    if(row?.service!=='naming'||!row.paid)return fail('RESULT_NOT_FOUND',404);
    if(post&&!row.result){
      row.progress=(row.progress||0)+1;
      if(row.progress===2){
        const body='[테스트 전용] 저장된 작명 상담 원문입니다.';
        row.result={id:row.id,status:'completed',saved:true,generatedResult:body,generatedPrompt:'[테스트 전용] 작명 프롬프트',inputSnapshot:row.input.input,
          nameCards:[],chapters:{1:{id:1,title:'모의 작명 해석',body}},totalChapters:1,completedChapters:['1']};
        row.generationCount=1;
      }
      save();
    }
    return row.result?reply({ok:true,result:row.result}):reply({ok:true,retryable:true,status:'generating',resumeBody:{resumeExecutionId:row.id}},202);
  }
  const totemMatch=/^\/native\/(totem-basic|totem-deep)\/results\/([a-f0-9]{64})$/.exec(path);
  if(totemMatch){
    const row=state.intents.get(totemMatch[2]);
    if(row?.service!==totemMatch[1]||!row.paid)return fail('RESULT_NOT_FOUND',404);
    if(post&&!row.result){row.result={saved:true,status:'completed',question:row.input.question,cards:row.input.animalIds.map((animalId,i)=>({animalId,slot:['mind','heart','shadow','gift','next_action'][i]})),narrative:{question_answer:'[테스트 전용] 저장한 토템 질문 답변입니다.'}};row.generationCount=1;save();}
    return reply(row.result||{saved:false,status:'generating',retryable:true});
  }
  const birthMatch=/^\/native\/(guardian|sibyl)\/results\/([a-f0-9]{64})$/.exec(path);
  if(birthMatch){
    const [,service,id]=birthMatch,row=state.intents.get(id);
    if(!row?.paid||row.service!==service)return fail('RESULT_NOT_FOUND',404);
    const year=Number(url.searchParams.get('year')||row.input.year),card=state.profiles.find(p=>p.profileId===row.input.profileId);
    if(service==='guardian'){
      if(post&&!row.result){
        const {guardianReading}=await import('../../../../app/saju-guardian/guardian-reading.ts');
        const day={ganji:'병진',stem:'병',branch:'진'};
        row.result={reading:guardianReading({day,year:day,month:day},false),prompt:{prompt:'[테스트 전용] mock guardian image prompt',negativePrompt:'[테스트 전용] negative prompt',seed:123}};
        row.generationCount=1;save();
      }
      return row.result?reply({ok:true,archive:row.result}):reply({ok:true,status:'pending'},202);
    }
    row.waves||={};row.reports||={};
    if(post&&!row.reports[year]){
      row.waves[year]=(row.waves[year]||0)+1;
      if(row.waves[year]===2){
        const {buildSibylAnnual}=await import('../../../../worker/lib/sibyl-annual.js');
        const analysis=buildSibylAnnual({date:card.birthDate||'1990-01-01',timeKnown:false,gender:card.gender},year);
        const chapters=Array.from({length:10},(_,n)=>({key:'test-'+n,title:'모의 상담 '+(n+1)+'장',content:'[테스트 전용] '+year+'년 '+(n+1)+'장 원문'}));
        row.reports[year]={year,analysis,chapters,title:analysis.title};row.result=true;
      }
      save();
    }
    return reply({ok:true,year,years:Object.keys(row.waves).map(Number),status:row.reports[year]?'completed':row.waves[year]?'generating':'unopened',archive:row.reports[year]});
  }
  const geomancyMatch=/^\/native\/geomancy\/results\/([a-f0-9]{64})$/.exec(path);
  if(geomancyMatch){
    const row=state.intents.get(geomancyMatch[1]);
    if(row?.service!=='geomancy'||!row.paid)return fail('RESULT_NOT_FOUND',404);
    if(post&&!row.result){
      row.parts=[...(row.parts||[]),'[테스트 전용] 흙점의 저장된 해석 '+((row.parts?.length||0)+1)+'입니다.'];
      if(row.parts.length===2){row.result={ok:true,saved:true,status:'completed',question:row.input.question,answer:row.parts[0],advice:row.parts[1]};row.generationCount=1;}
      save();
    }
    return reply(row.result||{ok:true,saved:false,status:'generating',completedParts:row.parts||[],totalParts:2,retryable:true});
  }
  const dreamMatch=/^\/native\/dream\/results\/([a-f0-9]{64})$/.exec(path);
  if(dreamMatch){
    const row=state.intents.get(dreamMatch[1]);
    if(row?.service!=='dream'||!row.paid)return fail('RESULT_NOT_FOUND',404);
    if(post&&!row.result){
      row.parts=[...(row.parts||[]),'[테스트 전용] 꿈의 저장된 해석 '+((row.parts?.length||0)+1)+'입니다.'];
      if(row.parts.length===2){row.result={ok:true,saved:true,status:'completed',dreamText:row.input.dreamText,record:{markdown:row.parts.join('\n\n')}};row.generationCount=1;}
      save();
    }
    return reply(row.result||{ok:true,saved:false,status:'generating',completedParts:row.parts||[],totalParts:2,retryable:true});
  }
  const chapter=/^\/native\/heukwol\/results\/([a-f0-9]{64})$/.exec(path);
  if(chapter){
    const row=state.intents.get(chapter[1]);
    if(row?.service!=='heukwol'||!row.paid)return fail('RESULT_NOT_FOUND',404);
    if(post&&!row.result){
      const text='[테스트 전용] 흑월의 저장된 상담 원문입니다.';
      const number=(row.completed||0)+1;
      const chapter={key:'test-'+number,title:'모의 결과 '+number,warning:text,interpretation:text,strategy:text,content:text,totalChars:text.length,evidenceIds:[]};
      row.checkpoints=[...(row.checkpoints||[]),chapter];
      row.completed=row.checkpoints.length;
      if(row.completed===2){
        const months=Array.from({length:12},(_,i)=>({month:i+1,start:'',end:'',saju:[],ziwei:[],domains:[{id:'test',title:'모의 근거',sajuPriority:0,ziweiCautions:[],ziweiSupports:[],action:'',sign:'',change:''}]}));
        row.result={title:'가상 흑월 상담',year:row.input.year,question:row.input.question,reportId:row.id,totalChars:row.checkpoints.reduce((sum,item)=>sum+item.totalChars,0),generatedAt:now().toISOString(),analysis:{months,method:'모의 계산',limitation:'테스트 전용',uncertainty:[]},chapters:row.checkpoints};
        row.generationCount=1;
      }
      save();
    }
    return reply({ok:true,id:row.id,year:row.input.year,status:row.result?'completed':'generating',completedChapters:row.completed||0,totalChapters:2,...(row.result?{report:row.result}:{})});
  }
  if(path==='/canonical/fortune-tea-house/consult'&&post){
    const body=await request.json(),key=requestKey(body);
    const row=[...state.intents.values()].find(r=>r.service==='tea'&&requestKey(r.input)===key);
    if(!row?.paid)return fail('PAYMENT_REQUIRED',402);
    if(row.input.question!==body.question)return fail('REQUEST_INPUT_MISMATCH',409);
    if(!row.result){row.result=teaResult(row);row.generationCount=1;save();}
    return reply({ok:true,result:row.result});
  }
  if(path.startsWith('/canonical/fortune-tea-house/results/')&&!post){
    const id=path.split('/').at(-1);
    const row=[...state.intents.values()].find(r=>r.service==='tea'&&r.resultId===id);
    return row?.paid&&row.result?reply({ok:true,result:row.result}):fail('RESULT_NOT_FOUND',404);
  }
  const follow=/^\/canonical\/fortune-tea-house\/results\/([^/]+)\/follow-up$/.exec(path);
  if(follow&&post){
    const row=[...state.intents.values()].find(r=>r.service==='tea'&&r.resultId===follow[1]);
    if(!row?.paid||!row.result)return fail('RESULT_NOT_FOUND',404);
    const {question,clientQuestionId}=await request.json();
    const checked=normalizeTeaFollowUpQuestion(question);
    if(!checked.ok||!clientQuestionId)return reply({ok:false,errorCode:checked.reason||'INVALID_REQUEST'},400);
    const result=row.result,followUps=result.followUps||[];
    const prior=followUps.find(q=>q.clientQuestionId===clientQuestionId);
    if(prior&&prior.question!==checked.question)return fail('REQUEST_INPUT_MISMATCH',409);
    if(!prior&&teaFollowUpAllowance(result).remaining===0)return reply({ok:false,errorCode:'FOLLOW_UP_LIMIT_REACHED',followUps,followUpAllowance:teaFollowUpAllowance(result)},409);
    const text='[테스트 전용] 연이의 추가 답변 원문입니다.';
    const followUp=prior||{id:'offline-follow-'+row.id,clientQuestionId,question:checked.question,createdAt:now().toISOString(),answer:{answerTitle:text,directAnswer:text,evidence:[text],guidance:text,caution:text,closing:text}};
    if(!prior){result.followUps=[...followUps,followUp];result.followUpAllowance=teaFollowUpAllowance(result);save();}
    return reply({ok:true,followUp,followUps:result.followUps,followUpAllowance:result.followUpAllowance,alreadyApplied:!!prior});
  }
  if(path==='/canonical/fortune-tea-house/pending'&&!post){
    const id=url.searchParams.get('resultId');
    const row=[...state.intents.values()].reverse().find(r=>r.service==='tea'&&r.paid&&!r.result&&(!id||r.resultId===id));
    return row?reply({ok:true,status:'partial',retryable:true,resultId:row.resultId,completedSections:[],requestPayload:row.input},202):
      fail('RESULT_NOT_FOUND',404);
  }
  if(path==='/canonical/neo-operation-room/start'&&post){
    const body=await request.json(),key=requestKey(body);
    const row=[...state.intents.values()].find(r=>r.service==='neo'&&
      (key&&requestKey(r.input)===key||body.sessionId&&[r.resultId,'toss_'+r.id].includes(body.sessionId)));
    if(!row?.paid)return fail('PAYMENT_REQUIRED',402);
    if(key&&(row.input.question!==body.question||row.input.selectedMethod!==body.selectedMethod))return fail('REQUEST_INPUT_MISMATCH',409);
    if(!row.result){
      const text='[테스트 전용] 네오가 저장한 브리핑 원문입니다.';
      row.result={ok:true,id:row.resultId,sessionId:row.resultId,status:'completed',selectedMethod:row.input.selectedMethod,
        question:row.input.question,topic:row.input.topic,intensity:row.input.intensity,
        initialBriefing:{selectedMethod:row.input.selectedMethod,operationTitle:text,neoOpening:text,coreDiagnosis:text,
          frontlineSummary:text,actionOrders:[text],methodEvidence:[],sevenDayMission:[],realityCheckQuestions:[]},
        resultUrl:neo.path+'?attemptId='+encodeURIComponent(row.resultId),createdAt:row.createdAt};
      row.generationCount=1;save();
    }
    return reply(row.result);
  }
  if(path==='/canonical/neo-operation-room/result'&&!post){
    const id=url.searchParams.get('attemptId');
    const row=[...state.intents.values()].find(r=>r.service==='neo'&&[r.resultId,'toss_'+r.id,requestKey(r.input)].includes(id));
    if(!row?.paid)return fail('RESULT_NOT_FOUND',404);
    return row.result?reply(row.result):reply({ok:true,status:'generating',sessionId:'toss_'+row.id},202);
  }
  if(path==='/canonical/neo-operation-room/refine'&&post){
    const {sessionId,selectedChecks=[],freeform=''}=await request.json();
    const row=[...state.intents.values()].find(r=>r.service==='neo'&&r.resultId===sessionId);
    if(!row?.paid||!row.result)return fail('RESULT_NOT_FOUND',404);
    const result=row.result;
    if(!Array.isArray(selectedChecks)||typeof freeform!=='string'||!selectedChecks.length&&freeform.trim().length<4)return fail('INVALID_INPUT',400);
    const realityCheck={selectedChecks,freeform:freeform.trim()},history=result.refinements||[];
    if(history.some(v=>JSON.stringify(v.realityCheck)===JSON.stringify(realityCheck)))return reply(result);
    const allowance=entries=>neoRefinementAllowance({llmMeta:{refinementHistory:entries}});
    if(!allowance(history).remaining)return fail('REFINEMENT_LIMIT_REACHED',409);
    const text='[테스트 전용] 네오의 수정 작전 원문 '+(history.length+1)+'입니다.';
    const refinedOrder={selectedMethod:row.input.selectedMethod,operationTitle:text,neoReview:text,verdict:{status:'가상 판단',statement:text},actionAlternatives:[],peopleToMeet:[],thirtyDayStrategy:[text],tsundereClosing:text};
    const refinements=[...history,{order:refinedOrder,realityCheck,createdAt:now().toISOString()}];
    Object.assign(result,{refinementStatus:'completed',refinedOrder,refinements,realityCheck,refinementAllowance:allowance(refinements)});
    save();return reply(result);
  }
  return null;
}
