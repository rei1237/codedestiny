"use client";
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,type CSSProperties} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Flower2,Heart,Music2,Settings2,UserRound,Volume2,VolumeX,X} from 'lucide-react';
import {useLocale} from '@/lib/i18n/useT';
import {MOONLIT_ENTRY_COPY} from './_lib/entry-copy';
import Character,{type Activity} from './_components/Character';
import MusicPlayer from './_components/MusicPlayer';
import PrivateRecords from './_components/PrivateRecords';
import {useSpaceProfile} from './_lib/use-space-profile';
import {usePrivateBow} from './_lib/use-private-bow';
import {useEffects} from './_lib/use-effects';
import {writeRecord} from './_lib/private-store';
import {CYCLE_MS,poseAt} from './model-review/bow-session';
import {kstTodayYmd} from '@/app/diary/_lib/kst-date';
import {pickTrainingAffirmation} from '@/app/diary/_lib/mind-training-pool';
import styles from './space.module.css';

const ART='/assets/moonlit-lotus/space-v1';
const SCENES={courtyard:'달빛 마당',hall:'연화당 법당',pond:'연꽃 연못'};
type Scene=keyof typeof SCENES;
const PANELS={meditation:'명상',prayer:'나의 기도',bow:'온라인 108배',affirmation:'긍정 확언',music:'명상 음악',fortune:'오늘의 운세',records:'나의 기록',custom:'캐릭터 꾸미기'};
type Panel=keyof typeof PANELS;
const HOTSPOTS:Record<Scene,{label:string;x:number;y:number;panel?:Panel;scene?:Scene;strike?:boolean}[]>={
 courtyard:[{label:'법당 들어가기',x:41,y:46,scene:'hall'},{label:'음악함 열기',x:17,y:57,panel:'music'},{label:'목탁 두드리기',x:64,y:51,strike:true},{label:'염주 · 108배',x:73,y:65,panel:'bow'},{label:'연못으로',x:85,y:53,scene:'pond'},{label:'생선 · 오늘의 운세',x:86,y:80,panel:'fortune'}],
 hall:[{label:'불상 앞에서 기도',x:50,y:49,panel:'prayer'},{label:'음악함 열기',x:20,y:63,panel:'music'},{label:'목탁 두드리기',x:77,y:62,strike:true},{label:'염주 · 108배',x:84,y:74,panel:'bow'},{label:'기도 수첩',x:23,y:83,panel:'records'}],
 pond:[{label:'법당으로',x:28,y:27,scene:'hall'},{label:'음악함 열기',x:14,y:51,panel:'music'},{label:'운세책 펼치기',x:22,y:67,panel:'fortune'},{label:'연꽃 앞에서 명상',x:72,y:56,panel:'meditation'}],
};
export default function Space(){
 const profile=useSpaceProfile();
 return <PrivateSpace key={profile.scope} profile={profile}/>;
}
function PrivateSpace({profile}:{profile:ReturnType<typeof useSpaceProfile>}){
 const introLocale=useLocale()==='ja'?'ja':'ko',intro=MOONLIT_ENTRY_COPY[introLocale];
 const bow=usePrivateBow(profile.scope),effects=useEffects();
 const [scene,setScene]=useState<Scene>('courtyard'),[panel,setPanel]=useState<Panel|null>(null),[activity,setActivity]=useState<Activity>('greeting');
 const [immersive,setImmersive]=useState(false),[light,setLight]=useState(false),[reduced,setReduced]=useState(false);
 const [sceneError,setSceneError]=useState(false),[characterError,setCharacterError]=useState(false),[retry,setRetry]=useState(0);
 const [day,setDay]=useState(''),[prayer,setPrayer]=useState(''),[affirmation,setAffirmation]=useState(''),[affirmIndex,setAffirmIndex]=useState(-1),[notice,setNotice]=useState(''),[speaking,setSpeaking]=useState(false);
 const [fortune,setFortune]=useState(''),[fortuneError,setFortuneError]=useState(false),[fortuneBusy,setFortuneBusy]=useState(false);
 const panelHeading=useRef<HTMLHeadingElement>(null),lastTrigger=useRef<HTMLElement|null>(null),worldViewport=useRef<HTMLDivElement>(null);
 const currentDay=useRef(''),mounted=useRef(true),saving=useRef(false);
 const [savingText,setSavingText]=useState(false);
 const pauseBow=useRef(bow.pause);pauseBow.current=bow.pause;
 const loadFortune=useCallback(async()=>{
  setFortuneBusy(true);setFortuneError(false);
  try{
   const [{readDiaryTodaySnapshot},{dayGroupOf},{buildDiaryDayDetail}]=await Promise.all([import('@/app/diary/_lib/today-snapshot'),import('@/lib/diary/fortune-adapter'),import('@/app/diary/_lib/day-copy')]);
   if(!mounted.current)return;
   const snapshot=readDiaryTodaySnapshot(kstTodayYmd()),detail=buildDiaryDayDetail(snapshot.fortune,dayGroupOf(snapshot.chart,snapshot.ymd));
   setFortune(detail?detail.read+' '+detail.suggest:'오늘의 운세는 저장된 생년월일 프로필을 기준으로 확인할 수 있어요.');
  }catch{if(mounted.current)setFortuneError(true);}
  finally{if(mounted.current)setFortuneBusy(false);}
 },[]);
 useEffect(()=>{
  mounted.current=true;
  const updateDay=()=>{const next=kstTodayYmd();if(currentDay.current!==next){currentDay.current=next;setDay(next);setAffirmation(pickTrainingAffirmation('회복력 강화',-1).text);}};
  updateDay();const timer=setInterval(updateDay,1000);document.addEventListener('visibilitychange',updateDay);
  const media=matchMedia('(prefers-reduced-motion: reduce)'),sync=()=>setReduced(media.matches);sync();media.addEventListener('change',sync);
  return()=>{mounted.current=false;clearInterval(timer);document.removeEventListener('visibilitychange',updateDay);media.removeEventListener('change',sync);};
 },[]);
 useEffect(()=>{if(panel==='fortune')void loadFortune();},[panel,day,loadFortune]);
 useEffect(()=>{
  const readLocation=()=>{const params=new URLSearchParams(location.search),value=params.get('activity'),place=params.get('scene');setPanel(value&&value in PANELS?value as Panel:null);if(place&&place in SCENES)setScene(place as Scene);else if(value==='bow'||value==='prayer')setScene('hall');if(['bow','prayer','meditation','affirmation'].includes(value||''))setActivity(value as Activity);};
  const back=()=>{pauseBow.current();setImmersive(false);setSpeaking(false);readLocation();};
  readLocation();window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back);
 },[]);
 useEffect(()=>{if(panel)panelHeading.current?.focus({preventScroll:true});},[panel]);
 useEffect(()=>{
  const viewport=worldViewport.current;
  const center=()=>{if(viewport)viewport.scrollLeft=(viewport.scrollWidth-viewport.clientWidth)/2;};
  center();
  const observer=new ResizeObserver(center);if(viewport)observer.observe(viewport);
  setSceneError(false);
  return()=>observer.disconnect();
 },[scene]);
 useEffect(()=>{if(profile.character==='custom'&&!profile.loaded&&!profile.loading&&!profile.imageError)void profile.loadImage();},[profile]);
 const navigate=(nextPanel:Panel|null,nextScene=scene)=>{
  if(nextPanel)lastTrigger.current=document.activeElement as HTMLElement;setPanel(nextPanel);setScene(nextScene);setNotice('');setSpeaking(false);
  const params=new URLSearchParams();const lang=new URLSearchParams(location.search).get('lang');if(lang)params.set('lang',lang);params.set('scene',nextScene);if(nextPanel)params.set('activity',nextPanel);
  history.pushState(null,'','?'+params.toString());
 };
 const open=(next:Panel)=>{
  if(['meditation','prayer','affirmation'].includes(next))bow.pause();
  const place=['bow','prayer'].includes(next)?'hall':scene;
  if(['bow','prayer','meditation','affirmation'].includes(next))setActivity(next as Activity);
  navigate(next,place);
 };
 const close=()=>{navigate(null);lastTrigger.current?.focus();};
 const changeScene=(next:Scene)=>{bow.pause();setImmersive(false);setActivity('idle');navigate(null,next);};
 const saveText=async(kind:'prayer'|'affirmation')=>{
  if(saving.current)return;
  const text=(kind==='prayer'?prayer:affirmation).trim();if(!text){setNotice('마음에 담을 문장을 먼저 적어 주세요.');return;}
  saving.current=true;setSavingText(true);
  try{
   const now=Date.now(),ok=await writeRecord({id:profile.scope+'|'+crypto.randomUUID(),scope:profile.scope,kind,text,day:kstTodayYmd(),createdAt:now,updatedAt:now});
   if(!mounted.current)return;
   setNotice(ok?'나의 기록에 조용히 담았어요.':'기록을 저장하지 못했어요. 다시 시도해 주세요.');setSpeaking(false);
  }catch{if(mounted.current)setNotice('이 브라우저에 저장하지 못했어요. 글을 복사해 두고 다시 시도해 주세요.');}
  finally{saving.current=false;if(mounted.current)setSavingText(false);}
 };
 const phase=poseAt(bow.session.elapsed).phase;
 const quiet=immersive&&panel==='bow';
 const noMotion=reduced||light;
 const character=profile.character||'yeoni';
 const active=bow.session.status==='running'||bow.session.status==='paused';
 const ended=bow.session.status==='complete'||bow.session.status==='stopped';
 const characterPosition:CSSProperties={left:scene==='hall'?'50%':'46%',top:scene==='hall'?'86%':'82%'};
 const activateSpot=(spot:(typeof HOTSPOTS)[Scene][number])=>spot.scene?changeScene(spot.scene):spot.panel?open(spot.panel):void effects.strike();
 return <main className={styles.page} lang="ko" data-cd-no-trans data-immersive={quiet}>
  <header className={styles.header}><Link href="/" className={styles.home}><ArrowLeft size={17}/>꿀꿀 운세</Link><div lang={introLocale}><h1>{intro.title}</h1><p>{intro.description}</p></div><button onClick={()=>open('custom')} aria-label="캐릭터와 화면 설정"><Settings2 size={20}/><span>꾸미기</span></button></header>
  <p className={styles.privateNote}><Heart size={15} aria-hidden="true"/>다른 사람이 접속해도, 이 공간에는 나의 캐릭터만 머물러요.</p>
  <nav className={styles.sceneNav} aria-label="장면 이동">{(Object.entries(SCENES) as [Scene,string][]).map(([id,title])=><button key={id} aria-pressed={scene===id} onClick={()=>changeScene(id)}>{title}</button>)}</nav>
  <div className={styles.experience}>
   <section className={styles.sceneSection} aria-label={SCENES[scene]}>
    <div className={styles.worldViewport} ref={worldViewport} tabIndex={0} aria-label="사찰 풍경. 작은 화면에서는 좌우로 살펴볼 수 있어요.">
     <div className={styles.world} data-scene={scene}>
      {!sceneError?<picture><source media="(max-width:700px)" srcSet={ART+'/'+scene+'-768.webp'}/>{/* eslint-disable-next-line @next/next/no-img-element */}<img className={styles.scenery} key={scene+retry} src={ART+'/'+scene+'-1536.webp'} width={1536} height={1024} alt={SCENES[scene]+'의 달빛과 연꽃, 꽃돼지 불상과 조용한 참배 자리'} onError={()=>setSceneError(true)} fetchPriority="high"/></picture>:<div className={styles.artFallback}><Flower2 size={48}/><p>풍경을 불러오지 못했어요.<br/>아래 버튼으로 명상과 108배를 계속 이용할 수 있어요.</p><button onClick={()=>{setSceneError(false);setRetry(v=>v+1);}}>풍경 다시 불러오기</button></div>}
      <div className={styles.character} style={characterPosition}>
       {!characterError&&(!light||character==='custom')?<Character key={retry} kind={character} activity={activity} elapsed={bow.session.elapsed} reduced={noMotion} look={profile.avatar} image={profile.image} portrait={profile.portrait} onFailure={()=>setCharacterError(true)}/>:<div className={styles.still}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={character==='cat'?ART+'/cat-still.webp':'/assets/moonlit-lotus/yeoni/2d-v2/still.webp'} width={384} height={384} alt="동작을 줄인 정지 캐릭터"/>{characterError&&<button onClick={()=>{setCharacterError(false);setRetry(v=>v+1);}}>동작 다시 불러오기</button>}</div>}
      </div>
      {!quiet&&<div className={styles.hotspots}>{HOTSPOTS[scene].map(spot=><button key={spot.label} style={{left:spot.x+'%',top:spot.y+'%'}} onClick={()=>activateSpot(spot)} aria-label={spot.label}>{spot.label}</button>)}</div>}
     </div>
    </div>
    <div className={styles.sceneCaption}><span>{activity==='bow'?phase:activity==='prayer'?'말하지 못했던 마음도, 여기에 놓아두어요.':activity==='meditation'?'잠시 눈을 감고, 편안한 호흡으로.':'서두르지 않아도 괜찮아요.'}</span><button aria-pressed={effects.enabled} onClick={effects.toggle}>{effects.enabled?<Volume2 size={17}/>:<VolumeX size={17}/>}효과음 {effects.enabled?'켜짐':'꺼짐'}</button></div>
    {!quiet&&<details className={styles.sceneTools} key={scene}><summary><Flower2 size={18} aria-hidden="true"/>소품으로 시작하기</summary><div>{HOTSPOTS[scene].map(spot=><button key={spot.label} onClick={()=>activateSpot(spot)}>{spot.label}</button>)}</div></details>}
    {speaking&&<div className={styles.affirmationOverlay}><p>{affirmation}</p><button disabled={savingText} onClick={()=>saveText('affirmation')}>소리 내어 읽었어요</button><button onClick={()=>setSpeaking(false)}>닫기</button></div>}
    {effects.error&&<p role="status">{effects.error}</p>}
   </section>
   <div className={styles.side}>
    {!profile.character&&<section className={styles.welcome}><h2>누구와 쉬어갈까요?</h2><p>성별을 입력하지 않아도 괜찮아요. 마음이 가는 친구를 골라 주세요.</p><div className={styles.row}><button onClick={()=>profile.save('yeoni')}>연이와 함께</button><button onClick={()=>profile.save('cat')}>영냥이와 함께</button></div></section>}
    {!quiet&&<nav className={styles.activities} aria-label="나만의 명상 활동">{(Object.entries(PANELS) as [Panel,string][]).filter(([id])=>id!=='custom').map(([id,label])=><button key={id} aria-pressed={panel===id} onClick={()=>open(id)}>{id==='music'?<Music2 size={17}/>:id==='records'||id==='fortune'?<BookOpen size={17}/>:<Flower2 size={17}/>}<span>{label}</span></button>)}</nav>}
    <div className={panel==='music'?styles.musicPanel:undefined}>
    {panel?<section className={styles.panel} data-activity={panel} aria-labelledby="space-panel-title"><div className={styles.panelHead}><h2 id="space-panel-title" ref={panelHeading} tabIndex={-1}>{PANELS[panel]}</h2><button aria-label="활동 패널 닫기" onClick={close}><X size={19}/></button></div>
     {panel==='meditation'&&<><p>지금은 잘하려고 애쓰지 않아도 괜찮아요.<br/>나의 속도로 들이쉬고, 천천히 내쉬어요.</p><div className={styles.breath} data-moving={!noMotion}><Flower2 size={32} strokeWidth={1.3} aria-hidden="true"/><span>편안하게<br/>머물러요</span></div><div className={styles.row}><button className={styles.primary} onClick={()=>open('music')}>명상 음악 고르기</button><button onClick={()=>{setActivity('idle');setNotice('충분히 쉬었어요. 준비되면 다시 시작해요.');}}>명상 마치기</button></div></>}
     {panel==='prayer'&&<><p>누군가에게 보여주지 않아도 되는 나의 기도예요. 불상 앞에서 마음을 모으고, 바라는 일을 적어보세요.</p><label className={styles.field}>오늘의 기도<textarea maxLength={2000} value={prayer} onChange={event=>setPrayer(event.target.value)} placeholder="지금 내 마음에 가장 필요한 것은…"/></label><div className={styles.row}><button className={styles.primary} disabled={savingText} onClick={()=>saveText('prayer')}>기도를 마음에 담기</button><button onClick={()=>{setActivity('prayer');setNotice('두 손을 모으고, 나의 마음에 잠시 귀 기울여요.');}}>조용히 참배하기</button></div></>}
     {panel==='affirmation'&&<><p>이곳에서는 나의 목소리로, 나에게 다정한 말을 건네요.</p><label className={`${styles.field} ${styles.affirmationField}`}><span><Heart size={17} aria-hidden="true"/>오늘의 확언</span><textarea maxLength={2000} value={affirmation} onChange={event=>setAffirmation(event.target.value)}/></label><div className={styles.row}><button className={styles.primary} onClick={()=>setSpeaking(true)}>소리 내어 읽기</button><button onClick={()=>{const picked=pickTrainingAffirmation('회복력 강화',affirmIndex);setAffirmIndex(picked.index);setAffirmation(picked.text);}}>다른 문장 만나기</button></div><p className={styles.panelNote}>직접 읽고 ‘읽었어요’를 누르면 나의 기록에 남아요. 마이크를 켜거나 녹음하지 않아요.</p></>}
     {panel==='bow'&&<><p>캐릭터와 함께하는 온라인 108배예요.<br/>나의 몸을 측정하거나 횟수를 판정하지 않아요.</p>
      <fieldset className={styles.targets} disabled={active||bow.busy}><legend>오늘의 마음만큼</legend>{[9,27,108].map(target=><button key={target} aria-pressed={bow.session.target===target} onClick={()=>bow.reset(target)}>{target}배</button>)}</fieldset>
      <div className={styles.count}><strong>{bow.session.completed}</strong><span>/ {bow.session.target}배</span></div><progress value={bow.session.completed} max={bow.session.target} aria-label="완료한 큰절 횟수"/>
      <p className={styles.phase}>{phase}</p><progress className={styles.cycle} value={bow.session.elapsed} max={CYCLE_MS} aria-label="현재 큰절 동작 진행"/>
      <div className={styles.row}>{ended?<button onClick={()=>bow.reset(bow.session.target)}>새 마음으로 시작하기</button>:bow.session.status==='running'?<button className={styles.primary} onClick={bow.pause}>일시정지</button>:<button className={styles.primary} disabled={!bow.ready||bow.busy} onClick={()=>{setActivity('bow');void bow.start();}}> {bow.session.status==='paused'?'이어서 하기':'연화당에서 시작하기'}</button>}{active&&<button onClick={bow.stop}>오늘은 여기까지</button>}</div>
      <div className={styles.row}><button aria-pressed={immersive} onClick={()=>setImmersive(value=>!value)}>{immersive?'주변 조작 펼치기':'참배에 집중하기'}</button><button onClick={()=>void effects.strike()} disabled={!effects.enabled}>목탁 두드리기</button></div>
      <label className={styles.field}>동작 속도<select value={bow.session.pendingSpeed} onChange={event=>bow.speed(Number(event.target.value))}><option value={.75}>천천히</option><option value={1}>편안하게</option><option value={1.25}>조금 빠르게</option></select></label>
      {bow.session.pendingSpeed!==bow.session.speed&&<p>다음 절부터 새 속도로 이어져요.</p>}
      <p role="status" className={styles.status}>{bow.session.status==='complete'?'오늘의 참배를 마쳤어요. 마음에 고요한 쉼이 남기를 바라요.':bow.session.status==='paused'?'잠시 쉬는 중이에요.':bow.session.status==='stopped'?'오늘은 여기까지. 나의 기록에 담았어요.':''}</p>
      {bow.notice&&<p role="alert">{bow.notice}</p>}
      <p className={styles.small}>서서 합장으로 돌아온 뒤에만 1회 기록해요. 화면을 떠나면 멈추고, 새로고침하면 마지막 완료 횟수부터 이어가요.</p>
     </>}
     {panel==='fortune'&&<><div className={styles.fortuneLetter}><Flower2 size={26} aria-hidden="true"/><time dateTime={day}>{day}</time>{fortuneBusy?<p role="status">오늘의 흐름을 확인하고 있어요.</p>:fortuneError?<p role="alert">오늘의 흐름을 불러오지 못했어요.<button onClick={loadFortune}>다시 확인</button></p>:<p>{fortune}</p>}</div><Link className={styles.actionLink} href="/today/">오늘의 운세 자세히 보기<ArrowRight size={18} aria-hidden="true"/></Link><p className={styles.panelNote}>돌아오면 마지막 완료 횟수부터 이어갈 수 있어요.</p></>}
     {panel==='records'&&<PrivateRecords scope={profile.scope}/>}
     {panel==='custom'&&<><p>이곳에서 보이는 나의 모습이에요. 기존 프로필과 친구의 성장 기록은 그대로 유지해요.</p><div className={styles.characterChoices} aria-label="머무를 캐릭터">{(['yeoni','cat','custom'] as const).map((id,index)=><button key={id} aria-pressed={character===id} onClick={()=>profile.save(id)}>{id==='custom'?<UserRound size={42} strokeWidth={1.3} aria-hidden="true"/>:/* eslint-disable-next-line @next/next/no-img-element */<img src={id==='cat'?ART+'/cat-still.webp':'/assets/moonlit-lotus/yeoni/2d-v2/still.webp'} width={72} height={72} alt=""/>}<span>{['꽃돼지 연이','영냥이','나만의 아바타'][index]}</span></button>)}</div>
      <figure className={styles.avatarPreview}><div><Character kind={character} activity="idle" elapsed={0} reduced look={profile.avatar} image={profile.image} portrait={profile.portrait} onFailure={()=>setCharacterError(true)}/></div><figcaption>{character==='custom'?profile.avatar.name||'나의 친구':character==='cat'?'영냥이':'꽃돼지 연이'}와 함께 쉬어가요</figcaption></figure>
      {character==='custom'&&<><button onClick={profile.loadImage} disabled={profile.loading}>{profile.loading?'프로필 이미지 확인 중':'현재 프로필 친구 이미지 가져오기'}</button>{profile.imageError&&<p role="alert">{profile.imageError} <Link href="/ggulggul/?action=dpOpenList&petEntry=my">프로필 친구 확인하기</Link></p>}
      <p className={styles.small}>저장된 친구 이미지에서 얼굴을 맞추고, 둥근 몸과 색상을 꾸며요. 이미지를 AI로 새로 생성하거나 업로드하지 않아요.</p>
      <label className={styles.field}>아바타 이름<input maxLength={20} value={profile.avatar.name} onChange={e=>profile.setAvatar({...profile.avatar,name:e.target.value})}/></label>
      <label className={styles.field}>옷 색상<input type="color" value={profile.avatar.color} onChange={e=>profile.setAvatar({...profile.avatar,color:e.target.value})}/></label>
      {(['zoom','x','y'] as const).map((key,index)=><label className={styles.field} key={key}>{['얼굴 크기','가로 위치','세로 위치'][index]}<input type="range" min={key==='zoom'?.8:0} max={key==='zoom'?1.8:100} step={key==='zoom'?.05:1} value={profile.avatar[key]} onChange={e=>profile.setAvatar({...profile.avatar,[key]:Number(e.target.value)})}/></label>)}
      <button className={styles.primary} onClick={()=>{profile.save('custom');setNotice('나만의 모습을 저장했어요.');}}>이 모습으로 머무르기</button></>}
      <div className={styles.displayOptions}><label className={styles.check}><input type="checkbox" checked={light} onChange={event=>setLight(event.target.checked)}/>가볍게 보기 · 동작 이미지 줄이기</label><p className={styles.small}>화면 표현만 바뀌고 진행 중인 108배와 완료 횟수는 유지돼요.{reduced?' 기기의 모션 감소 설정도 적용 중이에요.':''}</p></div>
     </>}
     {notice&&<p role="status" className={styles.status}>{notice}</p>}
    </section>:<div className={styles.invitation}><h2>오늘의 마음을 놓아두세요</h2><p>마당을 둘러보거나 법당에 들어가요.<br/>기도도, 참배도, 잠깐의 쉼도<br/>오롯이 나를 위한 시간이에요.</p><button className={styles.primary} onClick={()=>changeScene('hall')}>법당 안으로</button><button onClick={()=>open('meditation')}>조용히 명상하기</button></div>}
    <MusicPlayer scope={profile.scope} open={panel==='music'}/>
    </div>
   </div>
  </div>
  <footer className={styles.footer}><p>나의 기도와 기록은 이 브라우저에만 저장돼요. 다른 이용자의 공간과 연결되지 않으며, 공개 목록이나 실시간 방문자 표시가 없어요.</p><p>{day} · 달빛 연화당</p><Link href="/moonlit-lotus/model-review/">연이 동작 살펴보기</Link></footer>
 </main>;
}
