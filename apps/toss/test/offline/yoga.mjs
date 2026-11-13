
export const syntheticYoga={id:'native:yoga:yoga-guru-per-use',name:'테스트 디비야 요가',sku:'mock-divya-yoga',featureKey:'yoga-guru-per-use',approvedPriceKRW:1,available:true};
export function mockYogaLibrary(state){
  return [...state.intents.values()].filter(row=>row.service==='yoga'&&row.paid).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(row=>({
    serviceId:'yeoni',nativeService:'yoga',featureKey:syntheticYoga.featureKey,requestId:row.id,orderId:row.orderId,productId:syntheticYoga.id,
    status:'PURCHASED',state:row.result?'COMPLETED':'PENDING',href:'/yoga-guru?resultId='+row.id,createdAt:row.createdAt,
    completedSections:row.completed||0,totalSections:row.total,
  }));
}
export async function mockYogaRequest(path,request,state,save,now,delay){
  const reply=(data,status=200)=>Response.json(data,{status});
  if(path==='/native/yoga/prepare'&&request.method==='POST'){
    const {input,orderId}=await request.json();
    if(!input?.requestId||(!input.mood||![30,60].includes(input.duration))||orderId)return reply({error:'INVALID_INPUT'},400);
    const previous=[...state.intents.values()].find(row=>row.service==='yoga'&&row.input.requestId===input.requestId);
    if(previous&&JSON.stringify(input)!==JSON.stringify(previous.input))return reply({error:'REQUEST_INPUT_MISMATCH'},409);
    const id=previous?.id||(++state.sequence).toString(16).padStart(64,'0');
    const row=previous||{id,service:'yoga',sku:syntheticYoga.sku,amountKRW:1,paid:false,orderId:null,input,createdAt:now().toISOString(),completed:0,total:1};
    state.intents.set(id,row);save();return reply(row);
  }
  const match=/^\/native\/yoga\/(intents|results)\/([a-f0-9]{64})$/.exec(path);
  if(!match)return reply({error:'NOT_FOUND'},404);
  const row=state.intents.get(match[2]);
  if(!row||row.service!=='yoga'||!row.paid||state.orders.get(row.orderId)!==row.id)return reply({error:'RESULT_NOT_FOUND'},404);
  if(match[1]==='intents'&&request.method==='GET')return reply(row);
  if(row.result)return reply(row.result);
  if(request.method==='POST'){
    if(delay)await new Promise(resolve=>setTimeout(resolve,Math.min(delay,2000)));
    if(row.result)return reply(row.result);
    row.completed=1;
    const duration=row.input.duration;
    row.result={status:'completed',saved:true,course_metadata:{title:'테스트 전용 '+duration+'분 수련',duration_min:duration,deity_theme:'모의 신화 테마',intensity:'Beginner',focus_area:'모의 균형 연습',chakra_focus:'모의 집중 영역'},
      sequence:['Warmup','Asana','Pranayama','Relaxation'].map((type,i)=>({step_number:i+1,type,sanskrit_name:'테스트 산스크리트 '+i,english_name:'Mock Step '+(i+1)+' (모의 수련)',duration_seconds:duration*15,
        instructions:['모의 단계 안내 '+(i+1),'모의 마무리'],breathing_guide:'모의 호흡 안내',benefits_physical:'모의 몸 상태',benefits_spiritual:'모의 상징 해설',caution:'모의 주의 사항',visual_cue_ui:'모의 시각 안내'})),closing_mantra:'테스트 저장 만트라'};
    save();
  }
  return reply(row.result||{status:'generating',retryable:true});
}
