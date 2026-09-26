import { connectDb, withMongoRetry } from './db.js';
import { ServiceExecutionTransaction } from './models.js';

export function stalledNarrativeFilter(now) {
  return {status:'pending',timeoutAt:{$lte:now},'metadata.paidNarrative':{$exists:true},
    'metadata.paidNarrativeAlertedAt':null,
    $or:[{'lock.until':null},{'lock.until':{$lte:now}}]};
}

// Uses the existing delivery deadline and ten-minute cron. Monitoring does not
// grant access, spend a retry, call a provider, issue a refund or mark success.
export async function monitorPaidNarratives(env, options={}) {
  await (options.connectDb || connectDb)(env);
  const now=new Date(), filter=stalledNarrativeFilter(now);
  const rows=await withMongoRetry(env,()=>ServiceExecutionTransaction.find(filter).sort({timeoutAt:1}).limit(3)
    .select('executionKey featureKey timeoutAt metadata.paidNarrative.tasks metadata.paidNarrative.parts metadata.paidNarrative.attempts').lean());
  const notify=options.notify || (async message=>{
    const {notifyOperators}=await import('./feedback-notify.js');
    return notifyOperators(env,message);
  });
  let alerted=0;
  for(const row of rows){
    const state=row.metadata.paidNarrative;
    const saved=Object.keys(state.parts || {}).length, total=state.tasks?.length || 0;
    const outcome=await notify({subject:'[유료 결과] 상담 전달 지연 확인',text:[
      `상품: ${row.featureKey}`,`실행: ${row.executionKey}`,`저장: ${saved}/${total}`,
      '기존 결제 증빙과 환불 여부를 확인한 뒤 해당 상품의 저장된 결과 복구 경로를 사용하세요.',
      '완료 항목과 시도 기록을 보존하세요. 추가 결제나 전체 재생성을 요청하지 마세요.',
    ].join('\n')});
    if(!outcome?.results?.some(result=>result.ok===true&&!result.skipped))continue;
    const result=await withMongoRetry(env,()=>ServiceExecutionTransaction.updateOne({...filter,_id:row._id,timeoutAt:row.timeoutAt},
      {$set:{'metadata.paidNarrativeAlertedAt':now}}));
    alerted+=result.modifiedCount===1?1:0;
  }
  return {scanned:rows.length,alerted};
}
