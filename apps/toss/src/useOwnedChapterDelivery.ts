import {useEffect,useState} from 'react';
import {api} from './platform';

export function useOwnedChapterDelivery<T extends {status:string;retryable?:boolean}>(path:string){
  const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let live=true;setBusy(true);setError('');
    async function resume(){
      try {
        let next=await api<T>(path);
        for(let i=0;live;i++){
          setData(next);
          if(['completed','generation_failed'].includes(next.status)||next.retryable===false||document.hidden||!navigator.onLine||i>=24)break;
          if(i)await new Promise(r=>setTimeout(r,500));
          if(!live)break;
          next=await api<T>(path,{});
        }
      }catch{if(live)setError('저장 상태를 다시 확인해 주세요. 같은 주문으로 이어서 열 수 있어요.');}
      finally{if(live)setBusy(false);}
    }
    void resume();return()=>{live=false;};
  },[path,retry]);
  return {data,error,busy,retry:()=>setRetry(n=>n+1)};
}
