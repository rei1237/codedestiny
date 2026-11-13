// Included only by the loopback test server. New orders use the original
// manual-email policy. The receipt sink has no external provider.
import {createNeoService} from '../../../../worker/neo-consultation/service.js';
import {neoError,validateNeoInput} from '../../../../lib/neo-consultation/contract.js';
const deny=()=>{throw neoError('NOT_FOUND','이 계정의 상담을 찾지 못했어요.',404);};
export function neoEmailFixture(storage, owner, now=()=>new Date()){
  const key='toss-offline-neo-email:'+owner;
  const all=()=>JSON.parse(storage.getItem(key)||'{"rows":{},"payments":{}}');
  const store=data=>storage.setItem(key,JSON.stringify(data));
  const repository={
    async insert(row){const data=all();if(data.rows[row.id])throw neoError('ORDER_EXISTS','같은 신청을 다시 확인해 주세요.',409);data.rows[row.id]=row;store(data);},
    async get(id){return all().rows[id]||null;},
    async list(user){return Object.values(all().rows).filter(row=>row.userId===user).reverse();},
    async compareAndSwap(id,version,row){const data=all();if(data.rows[id]?.version!==version)return false;data.rows[id]=row;store(data);return true;},
  };
  const payments={
    async prepare(input){const data=all(),id='mock-neo-email-'+input.idempotencyKey;
      data.payments[id]??={id,userId:input.userId,featureKey:input.featureKey,requestId:input.requestId,amountKRW:input.amountKRW,quoteId:input.idempotencyKey,status:'pending'};
      store(data);return data.payments[id];},
    async read(id){return all().payments[id]||deny();},
    async cancelPending(id){const data=all();if(data.payments[id]?.status!=='pending')deny();data.payments[id].status='cancelled';store(data);},
  };
  function original(createId){
    return createNeoService({repository,payments,now:()=>now().toISOString(),id:()=>createId||crypto.randomUUID(),
      operatorEmail:'operator@example.invalid',sendMail:async()=>({state:'sent',providerId:'offline-receipt'})});
  }
  return {
    async handle(request,path){
      if(!path.startsWith('/native/neo-email'))return null;
      const parts=path.slice('/native/neo-email'.length).split('/').filter(Boolean),[id,action]=parts;
      const service=original();
      try{
        const post=request.method==='POST',body=post?await request.json():{};
        if(!id&&!post)return Response.json({orders:await service.list(owner)});
        let order;
        if(id==='create'&&post){
          if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(body.attempt))deny();
          const old=await repository.get(body.attempt);
          if(old){
            const normalized=validateNeoInput(body.input);
            if(Object.entries(normalized).some(([key,value])=>JSON.stringify(old[key])!==JSON.stringify(value)))throw neoError('REQUEST_INPUT_MISMATCH','기존 신청의 입력과 달라요.',409);
          }
          order=old?await service.get(owner,old.id):await original(body.attempt).create(owner,body.input);
        }else if(!post&&!action)order=await service.get(owner,id);
        else if(post&&action==='quote')order=await service.quote(owner,id,body.version);
        else if(post&&action==='prepare')order=await service.prepare(owner,id,body.quoteId);
        else if(post&&action==='mock-pay'){
          const row=await service.get(owner,id),data=all(),payment=data.payments[row.payment?.id];
          if(!payment||payment.requestId!==id||!['paid','pending'].includes(payment.status))deny();
          payment.status='paid';store(data);order=await service.acceptPayment(id);
          if(order.deliveryStatus.receipt==='pending'){await service.deliver(id,id+':receipt');order=await service.get(owner,id);}
        }else if(post&&action==='cancel')order=await service.requestCancellation(owner,id,body.version);
        else if(post&&action==='correction')order=await service.correct(owner,id,body.questionId,body.text,body.version);
        else deny();
        return Response.json({order});
      }catch(e){return Response.json({error:e.code||'NEO_REQUEST_FAILED',message:e.message},{status:e.status||500});}
    },
    // Used only by the controlled test operator. The customer API never
    // exposes this operation or any generated/admin answer.
    async recordMockDispatch(id){
      const service=original(),row=await service.get(owner,id);
      return service.completeManualDelivery({id:'offline-reviewer'},id,row.version,true);
    },
  };
}
