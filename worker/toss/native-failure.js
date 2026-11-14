const uncertainReasons=new Set(['SERVER_ERROR','LLM_ERROR','RESULT_EMPTY','SAJU_CALCULATION_FAILED','GENERATION_ALREADY_FAILED','LLM_FAILED','GENERATION_FAILED','REPORT_UNDELIVERABLE']);
export const TOSS_UNCERTAIN_DELIVERY_MESSAGE='상담 상태를 확인하지 못했어요. 결제가 완료되었다면 다시 결제하지 말고 구매 복구 또는 고객지원에서 확인해 주세요.';
// Original web billing messages do not establish what happened to a Toss order.
export async function nativeFailureResponse(response){
 if(response.ok||response.status===401||response.status===403)return response;
 let payload;
 try{payload=await response.clone().json();}catch{return response;}
 if(!payload||typeof payload!=='object'||!uncertainReasons.has(payload.reason))return response;
 const headers=new Headers(response.headers);headers.delete('content-length');
 return new Response(JSON.stringify({...payload,message:TOSS_UNCERTAIN_DELIVERY_MESSAGE}),{status:response.status,statusText:response.statusText,headers});
}
