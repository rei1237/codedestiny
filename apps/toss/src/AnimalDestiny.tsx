import {useEffect,useRef,useState,type FormEvent} from 'react';
import AnimalResultScreen from '@/app/saju/animal-destiny/components/AnimalResultScreen';
import type {AnimalDestinyData,AnimalDestinyInput,PartnerResult,SajuEngineResult,TwelveStagePillars} from '@/app/saju/animal-destiny/lib/types';
import type {AnimalPaidReading} from '@/app/saju/animal-destiny/lib/paidReading';
import {BirthFields,emptyBirth,type BirthInput} from './BirthFields';
import {Button} from './Button';
import {FloralInputWelcome} from './Brand';
import TossSessionScope from './TossSessionScope';
import {api} from './platform';
import {saveAnimalCard,shareAnimalCard} from './animal-media';

export type AnimalResponse={ok:true;accessSource:'public';stored:false;featureKey:'animal-destiny-unlock';animal:AnimalDestinyData;sajuResult:SajuEngineResult;twelveStages:TwelveStagePillars;timeUnknown:boolean;reading:AnimalPaidReading;partner:PartnerResult|null};
const emptyPartner:PartnerResult={input:null,animalId:null,animalData:null,primaryStage:null,score:null,relationType:null,summary:null,goodPoints:[],clashPoints:[],tips:[],stageEvidence:null,breakdown:null};
const animalInput=(birth:BirthInput,name:string):AnimalDestinyInput=>({name,birthDate:birth.date,birthTime:birth.unknown?'':birth.time,gender:birth.gender==='M'?'male':birth.gender==='F'?'female':'unknown',calendarType:birth.calendar==='solar'?'solar':'lunar',lunarLeap:birth.calendar==='lunar_leap'});
type Props={request?:typeof api;save?:typeof saveAnimalCard;share?:typeof shareAnimalCard};
export default function AnimalDestiny(props:Props){return <TossSessionScope><Reading {...props}/></TossSessionScope>;}
function Reading({request=api,save=saveAnimalCard,share=shareAnimalCard}:Props){
 const [birth,setBirth]=useState(emptyBirth),[name,setName]=useState(''),[result,setResult]=useState<AnimalResponse|null>(null),[busy,setBusy]=useState(false),[exporting,setExporting]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const heading=useRef<HTMLHeadingElement>(null),card=useRef<HTMLDivElement>(null),epoch=useRef(0),pending=useRef(false);
 useEffect(()=>()=>{epoch.current++;},[]);
 useEffect(()=>{if(!result)return;heading.current?.focus();const back=(event:Event)=>{event.preventDefault();epoch.current++;pending.current=false;setBusy(false);setExporting(false);setResult(null);setNotice('');};window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);},[result]);
 async function calculate(partner?:AnimalDestinyInput){
  if(pending.current)return;const revision=++epoch.current;pending.current=true;setBusy(true);setError('');
  try{const next=await request<AnimalResponse>('/animal-destiny/reading',{input:animalInput(birth,name),...(partner?{partner}:{})});if(!next.ok||next.accessSource!=='public'||next.featureKey!=='animal-destiny-unlock'||!next.reading)throw Error('INVALID_READING');if(revision===epoch.current)setResult(next);}
  catch{if(revision===epoch.current)setError('동물 풀이를 준비하지 못했어요. 날짜와 시각, 음력 윤달 여부를 확인하고 다시 시도해 주세요.');}
  finally{if(revision===epoch.current){pending.current=false;setBusy(false);}}
 }
 async function exportCard(kind:'save'|'share'){
  if(exporting||!result||!card.current)return;const revision=epoch.current;setExporting(true);setNotice('');
  try{if(kind==='save')await save(card.current);else await share(result.reading.result.animalName,result.reading.result.summary);if(revision===epoch.current)setNotice(kind==='save'?'카드 저장 요청을 보냈어요.':'공유 화면을 열었어요.');}
  catch{if(revision===epoch.current)setNotice('카드를 전달하지 못했어요. 토스 앱의 지원 여부를 확인하고 다시 시도해 주세요.');}finally{if(revision===epoch.current)setExporting(false);}
 }
 const submit=(event:FormEvent)=>{event.preventDefault();void calculate();};
 return <section className="animal-destiny-reading"><h1 ref={heading} tabIndex={-1}>십이운성 동물점</h1><p>태어난 날의 일간과 지지가 만나는 자리에서 나의 성장 방식과 관계의 결을 살펴봐요.</p>
 {!result?<form className="form floral-form" onSubmit={submit}><FloralInputWelcome/><label>이름 또는 닉네임 · 선택<input maxLength={20} value={name} disabled={busy} onChange={event=>setName(event.target.value)}/></label><BirthFields showCity={false} requireGender={false} title="동물을 찾을 출생정보" value={birth} disabled={busy} onChange={value=>{setBirth(value);setError('');}}/><p className="muted">원본 동물점과 같은 한국 기준으로 계산해요. 시각을 모르면 시주를 비워 두어요.</p><Button type="submit" display="block" loading={busy} disabled={busy}>나의 동물 찾기</Button></form>:<><AnimalResultScreen animal={result.animal} twelveStages={result.twelveStages} sajuResult={result.sajuResult} timeUnknown={result.timeUnknown} partner={result.partner||emptyPartner} shareCardRef={card} onSubmitPartner={calculate} onSaveCard={()=>void exportCard('save')} onShareCard={()=>void exportCard('share')} isExporting={exporting} paid={{status:'ready',reading:result.reading}} onRetryPaid={()=>void calculate()}/><p className="muted">무료 계산은 구매 보관함에 저장되지 않아요. 같은 출생정보로 다시 살펴볼 수 있어요.</p><Button display="block" variant="weak" onClick={()=>{epoch.current++;pending.current=false;setBusy(false);setExporting(false);setResult(null);setNotice('');}}>출생정보 다시 보기</Button></>}
 {busy&&<p role="status">원본 명식과 동물의 이야기를 펼치고 있어요.</p>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}</section>;
}
