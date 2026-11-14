import {useEffect,useRef,useState,type FormEvent} from 'react';
import {BirthFields,emptyBirth,type BirthInput} from './BirthFields';
import {Button} from './Button';
import {api} from './platform';
import TossSessionScope from './TossSessionScope';
import OriginalBody from './AstroReadingBody';
type Props={loggedIn:boolean;onLogin:()=>void;onError:(error:unknown)=>void;request?:typeof api;exampleBirth?:BirthInput};
type Report={ok:boolean;source:string;stored:false;html:string;css:string;data:{title:string;aiFollowupPrompt:string;logicVersion:string}};
const purposes={love:'연애',reunion:'재회',marriage:'결혼',crush:'짝사랑',friend:'친구',family:'가족',business:'동업·비즈니스',work:'직장·상사·동료',general:'전체 분석'};
function bindPrompt(host:HTMLElement){
 const output=host.querySelector<HTMLTextAreaElement>('[data-sy-past-life-ai-output]'),status=host.querySelector<HTMLElement>('[data-sy-past-life-ai-status]');
 for(const button of host.querySelectorAll<HTMLButtonElement>('[data-sy-past-life-ai-copy],[data-sy-past-life-ai-open]')){
  if(button.hasAttribute('data-sy-past-life-ai-open'))button.textContent=button.textContent+'용 질문 복사';
  button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(output?.value||'');if(status)status.textContent='질문을 복사했어요. 원하는 AI 앱에 붙여 넣어 이어서 물어보세요.';}catch{if(status)status.textContent='위 질문을 길게 눌러 직접 복사해 주세요.';}});
 }
}
function Reading({loggedIn,onLogin,onError,request=api,exampleBirth}:Props){
 const [profiles,setProfiles]=useState<{profileId:string;name:string}[]>([]),[profileId,setProfileId]=useState(''),[birth,setBirth]=useState(emptyBirth),[partner,setPartner]=useState(emptyBirth),[name,setName]=useState(''),[partnerName,setPartnerName]=useState(''),[purpose,setPurpose]=useState('general'),[result,setResult]=useState<Report|null>(null),[busy,setBusy]=useState(false),[issue,setIssue]=useState('');
 const epoch=useRef(0),pending=useRef(false);
 useEffect(()=>{if(!loggedIn)return;let active=true;request<{profiles:{profileId:string;name:string}[]}>('/canonical/profile').then(value=>{if(active)setProfiles(value.profiles);}).catch(error=>{if(active)onError(error);});return()=>{active=false;epoch.current++;};},[loggedIn,request,onError]);
 useEffect(()=>{const back=(event:Event)=>{if(result){event.preventDefault();setResult(null);}};window.addEventListener('code-destiny:toss-back',back);return()=>window.removeEventListener('code-destiny:toss-back',back);},[result]);
 async function submit(event:FormEvent){event.preventDefault();if(pending.current)return;pending.current=true;setBusy(true);setIssue('');const version=++epoch.current;
  const person=(value:BirthInput)=>({date:value.date,time:value.unknown?'':value.time,calendar:value.calendar,gender:value.gender});
  const mine=person(birth),other=person(partner);
  try{const response=await request<Report>('/sukuyo/past-life',{profileId,...(!profileId?{userName:name,userBirthDate:mine.date,userBirthTime:mine.time,userCalendarType:mine.calendar,userGender:mine.gender}:{}),partnerName,partnerBirthDate:other.date,partnerBirthTime:other.time,partnerCalendarType:other.calendar,partnerGender:other.gender,purpose});
   if(!response.ok||response.source!=='public'||!response.html||!response.data?.aiFollowupPrompt)throw Error('READING_UNAVAILABLE');if(version===epoch.current)setResult(response);
  }catch(error){if(version===epoch.current){setIssue((error as {code?:string})?.code==='SUKUYO_PAST_EXAMPLE_REQUIRED'?'비공개 모의 상담에서는 모의 예시 입력하기로 확인해 주세요.':'리딩을 열지 못했어요. 내 프로필과 상대의 출생정보를 확인해 주세요.');if((error as {status?:number})?.status===401)onError(error);}}
  finally{if(version===epoch.current){pending.current=false;setBusy(false);}}
 }
 if(!loggedIn)return <section><h1>숙요 전생 인연 리딩</h1><p>로그인 후 두 사람 사이에 반복되는 감정과 관계의 흐름을 살펴봐요.</p><Button display="block" onClick={onLogin}>토스 로그인하고 인연 살펴보기</Button></section>;
 if(result)return <section><h1>{result.data.title}</h1><OriginalBody html={result.html} css={result.css} title="숙요 전생 인연 리딩" bind={bindPrompt}/><p>새 리딩은 구매 보관함에 저장되지 않아요. 같은 출생정보와 관계 목적으로 다시 살펴볼 수 있어요.</p><Button display="block" variant="weak" onClick={()=>setResult(null)}>출생정보 다시 보기</Button></section>;
 return <section><h1>숙요 전생 인연 리딩</h1><p>두 사람의 숙요 관계를 바탕으로 익숙한 끌림과 반복되는 감정 패턴을 읽어요. 전생을 사실로 단정하지 않아요.</p><form className="form" onSubmit={submit}>
 {exampleBirth&&<><p>비공개 모의 상담에서는 검증된 예시 출생정보로 원본 풀이를 확인할 수 있어요.</p><Button type="button" variant="weak" onClick={()=>{setProfileId('');setBirth({...exampleBirth});setPartner({...exampleBirth,date:'1991-04-05',time:'12:30',gender:'M'});setName('나');setPartnerName('상대');}}>모의 예시 입력하기</Button></>}
 <label>나의 출생정보<select disabled={busy} value={profileId} onChange={e=>setProfileId(e.target.value)}><option value="">직접 입력하기</option>{profiles.map(profile=><option key={profile.profileId} value={profile.profileId}>{profile.name}</option>)}</select></label>
 {!profileId&&<><label>나의 이름<input maxLength={40} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label><BirthFields showCity={false} requireGender={false} title="나의 출생정보" value={birth} onChange={setBirth} disabled={busy}/></>}
 <label>상대의 이름<input maxLength={40} value={partnerName} disabled={busy} onChange={e=>setPartnerName(e.target.value)}/></label><BirthFields showCity={false} requireGender={false} title="상대의 출생정보" value={partner} onChange={setPartner} disabled={busy}/>
 <label>관계 목적<select value={purpose} disabled={busy} onChange={e=>setPurpose(e.target.value)}>{Object.entries(purposes).map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></label><Button display="block" type="submit" loading={busy} disabled={busy}>전생 인연 리딩 펼치기</Button></form>{issue&&<p role="alert">{issue}</p>}</section>;
}
export default function SukuyoPastLife(props:Props){return <TossSessionScope><Reading {...props}/></TossSessionScope>;}
