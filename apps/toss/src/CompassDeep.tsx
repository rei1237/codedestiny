import {CompassSavedChapters} from '../../../app/destiny-compass/_components/SavedCompassReport';
import {compassReportPayload} from '../../../app/destiny-compass/_lib/report-payload';
import type {CompassInput,DirectionField} from '../../../app/destiny-compass/_engine/types';
import {useOwnedChapterDelivery} from './useOwnedChapterDelivery';
import NativeChapterPurchase from './NativeChapterPurchase';
import {Button} from './Button';
import MansionPdf from './MansionPdf';

const feature='destiny-compass-deep-report',title='운명의 나침반 심층 리포트';
type Chapter={key:string;order:number;title:string;body:string};
type Report={status:string;retryable?:boolean;sections:Chapter[];progress?:{completed:number;total:number}};
export function CompassDelivery({id}:{id:string}){
  const {data,error,busy,retry}=useOwnedChapterDelivery<Report>('/native/compass/results/'+id);
  return <section><h1>{title}</h1><p role="status">{data?.progress?.completed||0} / {data?.progress?.total||10}개 장 저장</p>
    {error&&<p role="alert">{error}</p>}{data?.status==='generation_failed'?<p>구매 기록에서 생성 상태를 확인해 주세요.</p>:data?.status!=='completed'&&<Button disabled={busy} onClick={retry}>같은 주문 이어서 열기</Button>}
    {Boolean(data?.sections?.length)&&<CompassSavedChapters title="리포트 목차" sections={data!.sections}/>}
    {data?.status==='completed'&&<MansionPdf selector="[data-saved-compass-chapter]" options={{fileName:title+'.pdf',backgroundColor:'#12102c',cover:{title}}}/>}
    <a href="/library">꿀꿀운세 구매 기록</a></section>;
}
export function CompassPurchase({input,field,question,owner,onLogin}:{input:CompassInput;field:DirectionField;question:string;owner:string;onLogin:()=>void}){
  return <section><h2>{title}</h2><p>다섯 체계의 근거와 선택의 흐름을 열 장으로 읽어요.</p>
    <NativeChapterPurchase owner={owner} onLogin={onLogin} service="compass" feature={feature} prefix="compass" route="/destiny-compass"
      keyInput={[field.seed,question]} makePayload={id=>compassReportPayload(input,field,question,id)}/></section>;
}
