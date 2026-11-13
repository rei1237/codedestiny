import {useEffect,useRef,useState} from 'react';
import './saju-dashboard.css';
import ImagePrompts,{type ImagePrompt} from './SajuImagePrompts';
import {Button} from './Button';
import {File,Share} from '@apps-in-toss/web-framework';
import {APP_NAME,api,hasTossSession,isToss} from './platform';
import {SERVICE_AVAILABLE} from './release';

const readings=[
  {id:'extreme',art:'극T테스트',title:'극T 테스트'},
  {id:'hormone',art:'테토VS에겐',title:'테토 vs 에겐'},
  {id:'fourCut',art:'사주 네컷',title:'사주네컷 · 운명 필터'},
  {id:'lotto',art:'사주 로또',title:'퀀텀 로또 리포트'},
  {id:'prompts',art:'사주 프롬프트',title:'사주 AI 프롬프트'},
  {id:'dopamine',art:'도파민 중독',title:'도파민·집중력과 공부법'},
] as const;
type Reading=typeof readings[number]['id'];
type Pillar={g:string;j:string};
export type Pillars=Record<'y'|'m'|'d'|'h',Pillar>;

type LottoBirth={civilYear:number;termClock:{year:number;month:number;day:number;hour:number;minute:number}};
export default function SajuDashboard({pillars,lotto}:{pillars:Pillars;lotto:LottoBirth}){
  const [active,setActive]=useState<Reading|null>(null),[notice,setNotice]=useState('');
  const [gender,setGender]=useState(''),[prompts,setPrompts]=useState<ImagePrompt[]>([]);
  const host=useRef<HTMLDivElement>(null),heading=useRef<HTMLHeadingElement>(null),trigger=useRef<Reading|null>(null);
  useEffect(()=>{
    if(!active)return;
    let current=true;
    heading.current?.focus();
    const close=(event:Event)=>{event.preventDefault();event.stopImmediatePropagation();setActive(null);setNotice('');requestAnimationFrame(()=>document.getElementById('dashboard-'+trigger.current)?.focus());};
    window.addEventListener('code-destiny:toss-back',close,true);
    const show=(text:string)=>{if(current)setNotice(text);};
    async function save(node:HTMLElement,name:string){
      try{
        if(!isToss()||!File.saveBase64.isSupported())throw Error('unsupported');
        const {toPng}=await import('html-to-image');
        const png=await toPng(node,{pixelRatio:2});
        await File.saveBase64({data:png.slice(png.indexOf(',')+1),fileName:name+'.png',mimeType:'image/png'});
        show('결과 카드를 저장했어요.');
      }catch{show('이미지를 저장하지 못했어요. 토스 앱에서 다시 시도해 주세요.');}
    }
    async function share(text:string){
      try{
        if(!isToss()||!SERVICE_AVAILABLE)throw Error('unsupported');
        const link=await Share.createLink({path:'intoss://'+APP_NAME+'/saju/basic/play'});
        await Share.sendMessage({message:text+'\n\n'+link});
        show('공유 화면을 닫았어요.');
      }catch{show('공유 화면을 열지 못했어요. 토스 앱에서 다시 시도해 주세요.');}
    }
    import('virtual:saju-dashboard').then(async({prepareDashboard,styles})=>{
      if(!current||!host.current)return;
      const root=host.current;
      const style=document.createElement('style');style.textContent=styles;root.prepend(style);
      const report=prepareDashboard(pillars,document,{save,share});
      if(active==='prompts'){setPrompts(gender?report.prompts(gender):[]);return;}
      if(active!=='lotto'){report[active]();return;}
      if(!gender)return;
      let storageKey:string|null=null;
      try{
        const account=hasTossSession()?(await api<{storageScope:string}>('/session')).storageScope:'guest';
        if(account){
          const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([account,lotto,gender,pillars])));
          storageKey='cd:toss:ritual:'+Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
        }
      }catch{/* Guest calculations remain available when an account's archive cannot be resolved. */}
      if(current)report.lotto({...lotto,gender,storageKey});
    }).catch(()=>show('풀이를 열지 못했어요. 목록에서 다시 선택해 주세요.'));
    return ()=>{current=false;window.removeEventListener('code-destiny:toss-back',close,true);};
  },[active,pillars,gender,lotto]);
  return <section className="saju-dashboard" aria-label="사주로 읽는 나"><h2>사주로 읽는 나</h2>
    {!active?<div className="saju-dashboard-choices">{readings.map(item=><button type="button" key={item.id} id={'dashboard-'+item.id} onClick={()=>{
      trigger.current=item.id;setPrompts([]);setNotice('');setActive(item.id);
    }}><img src={'/fuctionassets/'+item.art+'.webp'} alt="" width={64} height={64}/><span>{item.title}</span><i aria-hidden="true">›</i></button>)}</div>:<>
      <h3 tabIndex={-1} ref={heading}>{readings.find(item=>item.id===active)?.title}</h3>
      {(active==='lotto'||active==='prompts')&&<label>{active==='lotto'?'대운 계산에 사용하는 성별':'그림 프롬프트에 사용하는 성별'}<select value={gender} onChange={e=>setGender(e.target.value)}><option value="">선택해 주세요</option><option value="M">남성</option><option value="F">여성</option></select></label>}
      <div ref={host} key={active+gender}>
        {active==='lotto'&&<div id="lottoCard"><div id="lottoSaved"/><div id="lottoSection"/></div>}
        {active==='extreme'&&<div id="tTestCard" className="t-test-card"><div id="tTestResult"/></div>}
        {active==='hormone'&&<div id="hormone-vibe-section"><div id="hormoneVibeResult"/></div>}
        {active==='fourCut'&&<div id="reportDashboardCard"><div id="sajuFourCutResult"/></div>}
        {active==='dopamine'&&<div id="dopamineCard"><div id="dopamineResult"/></div>}
      </div>
      {active==='prompts'&&prompts.length>0&&<ImagePrompts items={prompts}/>}
      {notice&&<p role="status">{notice}</p>}
      <Button variant="weak" display="block" onClick={()=>{setActive(null);setNotice('');requestAnimationFrame(()=>document.getElementById('dashboard-'+trigger.current)?.focus());}}>다른 사주 풀이 보기</Button>
    </>}
  </section>;
}
