(function(root){
  'use strict';
  async function run(initial, options){
    let body=initial, failures=0;
    for(let wave=0;wave<20&&options.active();wave++){
      if(!options.visible())return false;
      let reply;
      try{reply=body?await options.post(body):await options.get();}
      catch(error){if(!options.active())return false;if(++failures>3)throw error;await options.wait(3000);continue;}
      if(!options.active())return false;
      const data=reply.payload||{};
      if([200,201].includes(reply.status)&&data.ok&&data.saved!==false){options.show(data);return true;}
      if(reply.status===202&&data.resumeBody){body=data.resumeBody;options.persist(body,data.resultId);options.show(data);if(data.retryable===false)throw new Error('생성 한도에 도달했어요. 저장된 내용을 보존했으며 추가 확인이 필요합니다.');failures=0;await options.wait(1000);continue;}
      if(reply.status===404&&!body)return false;
      if([429,503].includes(reply.status)&&data.retryable!==false&&++failures<=3){await options.wait(4000);continue;}
      throw new Error(data.message||(reply.status===403?'취소·환불된 결과는 이어서 생성할 수 없어요.':'결과를 보존했어요. 같은 요청을 다시 확인해 주세요.'));
    }
    return false;
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={run};else root.CDPaidNarrativeReader={run};
}(typeof window!=='undefined'?window:globalThis));
