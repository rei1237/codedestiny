import {useRef,useState} from 'react';
import {Button} from '@toss/tds-mobile';
import {PhotocardFront} from '../../../app/saju/destiny-bias/components/chemi/PhotocardFace';
import {toPhotocardView} from '../../../app/saju/destiny-bias/components/chemi/ChemiCoreCard';
import type {ChemiReport} from '../../../app/saju/destiny-bias/engine/chemiReportBridge';
import {saveCardPng,shareBiasSummary} from './media';
import {ApiError} from './platform';

export default function BiasExport({report,theme}:{report:ChemiReport;theme:string}){
  const node=useRef<HTMLDivElement>(null);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const summary=`${report.result.chemiTypeNameKo}\n${report.copy.oneLiner}`;
  async function act(kind:'save'|'share'){
    if(busy)return;
    setBusy(true);setMessage('');
    try{
      if(kind==='save'){
        if(!node.current)throw new Error('CARD_NOT_READY');
        const {toPng}=await import('html-to-image');
        await Promise.all(Array.from(node.current.querySelectorAll('img')).map(image=>image.decode()));
        const png=await toPng(node.current,{pixelRatio:3,cacheBust:false,skipFonts:true});
        await saveCardPng(png);
        setMessage('기기 저장 요청을 처리했어요. 저장 위치를 확인해 주세요.');
      }else{
        await shareBiasSummary(summary);
        setMessage('공유 화면을 닫았어요. 실제 전송 여부는 선택한 앱에서 확인해 주세요.');
      }
    }catch(error){
      setMessage(error instanceof ApiError&&error.code==='TOSS_APP_REQUIRED'?'토스 앱 안에서 저장·공유할 수 있어요.':error instanceof ApiError&&error.code==='TOSS_RELEASE_PENDING'?'공개 출시 후 이 기능의 토스 링크를 공유할 수 있어요.':error instanceof ApiError&&error.code==='FILE_SAVE_NOT_SUPPORTED'?'토스 앱을 업데이트한 뒤 다시 저장해 주세요.':'저장·공유를 마치지 못했어요. 잠시 후 다시 시도해 주세요.');
    }finally{setBusy(false);}
  }
  return <details className="bias-export"><summary>카드 저장 · 요약 공유</summary>
    <p>카드에는 생일·명식·입력한 이름이 들어가지 않아요. 아래 미리보기를 확인한 뒤 저장해 주세요.</p>
    <div ref={node} className="bias-export-card"><PhotocardFront view={toPhotocardView(report,{themeKey:theme})} flat/></div>
    <Button display="block" disabled={busy} onClick={()=>void act('save')}>포토카드 이미지 저장하기</Button>
    <h3>공유할 요약</h3><p>{summary}</p><p className="muted">요약 문구와 최애운명 진입 링크를 공유해요. 개인 결과 전체는 공개하지 않아요.</p>
    <Button display="block" disabled={busy} onClick={()=>void act('share')}>이 요약 공유하기</Button>
    {busy&&<p role="status">요청을 처리하고 있어요.</p>}{message&&<p role="status">{message}</p>}
  </details>;
}
