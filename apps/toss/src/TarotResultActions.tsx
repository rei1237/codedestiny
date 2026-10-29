import {useRef,useState} from 'react';
import {Button} from './Button';
import {saveTarotResultCardPng,shareTarotResultSummary} from './media';
import {ApiError} from './platform';

export default function TarotResultActions({title,summary}:{title:string;summary:string}){
  const card=useRef<HTMLDivElement>(null);
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  async function act(kind:'save'|'share'){
    if(busy)return;
    setBusy(true);setNotice('');
    try{
      if(kind==='save'){
        if(!card.current)throw new Error('TAROT_CARD_NOT_READY');
        const {toPng}=await import('html-to-image');
        await saveTarotResultCardPng(await toPng(card.current,{pixelRatio:3,cacheBust:false,skipFonts:true}));
        setNotice('기기 저장 요청을 처리했어요. 저장 위치를 확인해 주세요.');
      }else{
        await shareTarotResultSummary(title,summary);
        setNotice('공유 화면을 닫았어요. 실제 전송 여부는 선택한 앱에서 확인해 주세요.');
      }
    }catch(error){
      setNotice(error instanceof ApiError&&error.code==='TOSS_APP_REQUIRED'?'토스 앱 안에서 저장·공유할 수 있어요.':error instanceof ApiError&&error.code==='TOSS_RELEASE_PENDING'?'공개 출시 후 이 리딩의 진입 링크를 공유할 수 있어요.':error instanceof ApiError&&error.code==='FILE_SAVE_NOT_SUPPORTED'?'토스 앱을 업데이트한 뒤 다시 저장해 주세요.':'저장·공유를 마치지 못했어요. 잠시 후 다시 시도해 주세요.');
    }finally{setBusy(false);}
  }
  return <details className="tarot-result-actions"><summary>리딩 한 장 저장 · 요약 공유</summary>
    <p>질문·주문번호·결과 주소는 넣지 않고, 아래 요약만 미리 본 뒤 저장하거나 공유해요.</p>
    <div ref={card} className="tarot-share-card"><small>CODE DESTINY · TAROT READING</small><h2>{title}</h2><p>{summary}</p></div>
    <Button display="block" disabled={busy} onClick={()=>void act('save')}>리딩 카드 이미지 저장하기</Button>
    <Button variant="weak" display="block" disabled={busy} onClick={()=>void act('share')}>이 요약 공유하기</Button>
    {busy&&<p role="status">요청을 처리하고 있어요.</p>}{notice&&<p role="status">{notice}</p>}
  </details>;
}
