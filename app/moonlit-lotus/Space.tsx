"use client";
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Flower2,Heart,HandHeart,Moon,Eye,MapPin,Volume2,VolumeX,X,ChevronLeft,ChevronRight,Menu} from 'lucide-react';
import {useLocale} from '@/lib/i18n/useT';
import {MOONLIT_ENTRY_COPY} from './_lib/entry-copy';
import Character,{type Activity} from './_components/Character';
import MusicPlayer from './_components/MusicPlayer';
import ImmersionControl from './_components/ImmersionControl';
import ActivityTransition from './_components/ActivityTransition';
import {rearCharacterId} from './_lib/companion-rear';
import WalkingYeoni from './_components/WalkingYeoni';
import {useSpaceProfile} from './_lib/use-space-profile';
import {usePrivateBow} from './_lib/use-private-bow';
import {useEffects} from './_lib/use-effects';
import {writeRecord} from './_lib/private-store';
import {CYCLE_MS,poseAt} from './model-review/bow-session';
import {kstTodayYmd} from '@/app/diary/_lib/kst-date';
import {pickTrainingAffirmation} from '@/app/diary/_lib/mind-training-pool';
import styles from './space.module.css';
import {photoDrawing} from './_lib/photo-poses';
import SceneViewport from './_components/SceneViewport';
import {SCENES,VIEWS,VIEW_LABELS,parseSceneView,nextSceneView,viewPlacement,sceneUrl,type Scene,type SceneView} from './_lib/scene-views';
import {useSceneView} from './_lib/use-scene-view';

const PhotoStudio=dynamic(()=>import('./_components/PhotoStudio'),{ssr:false});
const CharacterChooser=dynamic(()=>import('./_components/CharacterChooser'));
const PrivateRecords=dynamic(()=>import('./_components/PrivateRecords'));

const PANELS={meditation:'명상',prayer:'나의 기도',bow:'온라인 108배',affirmation:'긍정 확언',music:'명상 음악',fortune:'오늘의 운세',records:'나의 기록',custom:'캐릭터 꾸미기',info:'공간 안내'};
type Panel=keyof typeof PANELS;
const HOTSPOTS:Record<Scene,{label:string;x:number;y:number;panel?:Panel;scene?:Scene;strike?:boolean}[]>={
 courtyard:[{label:'법당 들어가기',x:41,y:46,scene:'hall'},{label:'음악함 열기',x:17,y:57,panel:'music'},{label:'목탁·염불 듣기',x:64,y:51,strike:true},{label:'염주 · 108배',x:73,y:65,panel:'bow'},{label:'연못으로',x:85,y:53,scene:'pond'},{label:'생선 · 오늘의 운세',x:86,y:80,panel:'fortune'}],
 hall:[{label:'불상 앞에서 기도',x:50,y:49,panel:'prayer'},{label:'음악함 열기',x:20,y:63,panel:'music'},{label:'목탁·염불 듣기',x:77,y:62,strike:true},{label:'염주 · 108배',x:84,y:74,panel:'bow'},{label:'기도 수첩',x:23,y:83,panel:'records'}],
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
 const [view,setView]=useState<SceneView>('front'),[showSpots,setShowSpots]=useState(false);
 const [more,setMore]=useState(false);
 const [rearView,setRearView]=useState(true);
 const [journey,setJourney]=useState<{from:Scene;to:Scene;panel:Panel|null}|null>(null);
 const [immersive,setImmersive]=useState(false),[light,setLight]=useState(false),[reduced,setReduced]=useState(false);
 const zenExit=useRef<HTMLButtonElement>(null),zenTrigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(immersive)zenExit.current?.focus();},[immersive]);
 const [sceneError,setSceneError]=useState(false),[characterError,setCharacterError]=useState(false),[retry,setRetry]=useState(0);
 const [day,setDay]=useState(''),[prayer,setPrayer]=useState(''),[affirmation,setAffirmation]=useState(''),[affirmIndex,setAffirmIndex]=useState(-1),[notice,setNotice]=useState(''),[speaking,setSpeaking]=useState(false);
 const [fortune,setFortune]=useState(''),[fortuneError,setFortuneError]=useState(false),[fortuneBusy,setFortuneBusy]=useState(false);
 const panelHeading=useRef<HTMLHeadingElement>(null),lastTrigger=useRef<HTMLElement|null>(null),worldViewport=useRef<HTMLDivElement>(null);
 const currentDay=useRef(''),mounted=useRef(true),saving=useRef(false);
 const [savingText,setSavingText]=useState(false);
 const sceneView=useSceneView(scene,view,next=>{setView(next);setSceneError(false);history.replaceState(null,'',sceneUrl(scene,panel,next,location.search));},light);
 const placement=viewPlacement(scene,view,sceneView.portrait);
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
  const readLocation=()=>{const params=new URLSearchParams(location.search),value=params.get('activity'),place=params.get('scene');setPanel(value&&value in PANELS?value as Panel:null);setView(parseSceneView(params.get('view')));if(place&&place in SCENES)setScene(place as Scene);else setScene(value==='bow'||value==='prayer'?'hall':'courtyard');if(['bow','prayer','meditation','affirmation'].includes(value||''))setActivity(value as Activity);};
  const back=()=>{pauseBow.current();setJourney(null);setImmersive(false);setSpeaking(false);readLocation();};
  readLocation();window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back);
 },[]);
 useEffect(()=>{if(panel)panelHeading.current?.focus({preventScroll:true});},[panel]);
 useEffect(()=>{setSceneError(false);},[scene,view]);
 useEffect(()=>{if(profile.character==='custom'&&(!profile.avatar.species||profile.avatar.species==='profile')&&!profile.loaded&&!profile.loading&&!profile.imageError)void profile.loadImage();},[profile]);
 const navigate=(nextPanel:Panel|null,nextScene=scene,walking=false)=>{
  if(!walking)setJourney(null);
  if(nextPanel)lastTrigger.current=document.activeElement as HTMLElement;setMore(false);setPanel(nextPanel);setScene(nextScene);setNotice('');setSpeaking(false);
  const nextView=nextScene===scene?view:'front';setView(nextView);
  history.pushState(null,'',sceneUrl(nextScene,nextPanel,nextView,location.search));
 };
 const open=(next:Panel)=>{
  if(['meditation','prayer','affirmation'].includes(next))bow.pause();
  const place=['bow','prayer'].includes(next)?'hall':scene;
  if(['bow','prayer','meditation','affirmation'].includes(next))setActivity(next as Activity);
  if(place!==scene&&canWalk()){bow.pause();setPanel(null);setJourney({from:scene,to:place,panel:next});}else navigate(next,place);
 };
 const close=()=>{setSpeaking(false);navigate(null);requestAnimationFrame(()=>lastTrigger.current?.isConnected?lastTrigger.current.focus():zenTrigger.current?.focus());};
 const canWalk=()=>!reduced&&!light&&!characterError&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 const changeScene=(next:Scene)=>{bow.pause();setImmersive(false);setActivity('idle');setMore(false);if(next!==scene&&canWalk()){setPanel(null);setJourney({from:scene,to:next,panel:null});}else navigate(null,next);};
 useEffect(()=>{if(journey&&(reduced||light)){setScene(journey.from);setJourney(null);}},[reduced,light,profile.character,journey]);
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
 const quiet=immersive;
 const noMotion=reduced||light;
 const character=profile.character||'yeoni';
 const rearId=rearCharacterId(character,profile.avatar,profile.image);
 const active=bow.session.status==='running'||bow.session.status==='paused';
 const ended=bow.session.status==='complete'||bow.session.status==='stopped';
 const leaveQuiet=()=>{setImmersive(false);requestAnimationFrame(()=>{if(panel)panelHeading.current?.focus({preventScroll:true});else zenTrigger.current?.focus();});};
 const activateSpot=(spot:(typeof HOTSPOTS)[Scene][number])=>spot.scene?changeScene(spot.scene):spot.panel?open(spot.panel):void effects.strike();
 return <main className={styles.page} lang="ko" data-cd-no-trans data-immersive={quiet} data-panel-open={!!panel||more} data-scene-name={scene}>
  <header className={styles.header}><Link href="/" className={styles.home} aria-label="꿀꿀 운세로 돌아가기"><ArrowLeft size={20}/></Link><div className={styles.placePicker}><h1 lang={introLocale}><Moon size={18} aria-hidden="true"/>{intro.title}</h1><label><span className={styles.srOnly}>장소 선택</span><select aria-label="장소 선택" value={scene} onChange={event=>changeScene(event.target.value as Scene)}>{(Object.entries(SCENES) as [Scene,string][]).map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label></div><button ref={zenTrigger} aria-label="공간 메뉴 열기" aria-expanded={more} aria-controls="moonlit-more" onClick={()=>{setMore(value=>!value);setPanel(null);}}><Menu size={21}/></button></header>
  <div className={styles.experience}>
   <section className={styles.sceneSection} aria-label={SCENES[scene]}>
    <SceneViewport scene={scene} view={view} portrait={sceneView.portrait} quiet={quiet} reduced={noMotion} loading={sceneView.loading} error={sceneError} retry={retry} onError={()=>setSceneError(true)} onRetry={()=>{setSceneError(false);setRetry(v=>v+1);}} onView={next=>{if(!journey)void sceneView.request(next);}} viewportRef={worldViewport}>
      <WalkingYeoni journey={journey} kind={character} look={profile.avatar} image={profile.image} x={placement.x} y={placement.y} onCross={()=>{if(journey){setView('front');setScene(journey.to);}}} onDone={()=>{if(journey)navigate(journey.panel,journey.to);}}>
       {walking=><><ActivityTransition><Character kind={character} activity={activity} elapsed={bow.session.elapsed} reduced={noMotion} look={profile.avatar} image={profile.image} portrait={profile.portrait} rearId={scene==='hall'&&rearView&&['bow','prayer'].includes(activity)?rearId:undefined} walking={walking} holding={!!journey&&!walking} attempt={retry} onFailure={()=>setCharacterError(true)}/></ActivityTransition>{characterError&&<button className={styles.characterRetry} onClick={()=>{setCharacterError(false);setRetry(v=>v+1);}}>동작 다시 불러오기</button>}</>}
      </WalkingYeoni>
      {!quiet&&showSpots&&view==='front'&&!sceneView.portrait&&<div className={styles.hotspots} data-photo-hide>{HOTSPOTS[scene].filter(spot=>!spot.strike).map(spot=><button key={spot.label} style={{left:spot.x+'%',top:spot.y+'%'}} onClick={()=>activateSpot(spot)} aria-label={spot.label}>{spot.scene?<MapPin size={18} aria-hidden="true"/>:<Flower2 size={18} aria-hidden="true"/>}<span>{spot.label}</span></button>)}</div>}
    </SceneViewport>
   </section>
   <nav className={styles.viewControls} aria-label="풍경 시점"><button aria-label="왼편에서 보기" disabled={view===VIEWS[0]||!!journey} onClick={()=>void sceneView.request(nextSceneView(view,-1))}><ChevronLeft size={20}/></button><span aria-live="polite">{sceneView.loading?'풍경 준비 중':VIEW_LABELS[view]}<small>{VIEWS.indexOf(view)+1} / {VIEWS.length}</small></span><button aria-label="오른편에서 보기" disabled={view===VIEWS.at(-1)||!!journey} onClick={()=>void sceneView.request(nextSceneView(view,1))}><ChevronRight size={20}/></button><button disabled={view==='front'||!!journey} onClick={()=>void sceneView.request('front')}>정면</button><button className={styles.soundControl} onClick={()=>void effects.strike()} aria-pressed={effects.playing||effects.loading} aria-label={effects.loading?'목탁·염불 준비 취소':effects.playing?'목탁·염불 멈추기':'목탁·염불 듣기'}>{effects.playing?<Volume2 size={19}/>:<VolumeX size={19}/>}<span>{effects.loading?'취소':effects.playing?'멈춤':'목탁'}</span></button></nav>
   {(sceneView.error||effects.error)&&<p className={styles.sceneMessage} role="status">{sceneView.error||effects.error}</p>}
   <div className={styles.side}>
    {more&&<section id="moonlit-more" className={styles.panel} aria-label="공간 메뉴"><div className={styles.panelHead}><h2>나의 연화당</h2><button aria-label="공간 메뉴 닫기" onClick={()=>{setMore(false);zenTrigger.current?.focus();}}><X size={19}/></button></div><div className={styles.panelBody}><p>오롯이 나 혼자, 마음이 쉬어가는 곳</p><nav className={styles.moreActions} aria-label="더 많은 활동">{(['affirmation','fortune','records','custom','music','info'] as const).map(id=><button key={id} onClick={()=>open(id)}>{PANELS[id]}</button>)}<button onClick={()=>{setMore(false);setImmersive(true);}}><Eye size={18}/>풍경만 보기</button><ImmersionControl/><PhotoStudio poseDrawing={pose=>photoDrawing(character,profile.avatar,profile.image,pose)} disabled={!!journey||sceneView.loading} target={()=>worldViewport.current?.querySelector<HTMLElement>('[data-scene]')||null} onPrepare={()=>bow.pause()}/></nav><p className={styles.small}>풍경을 좌우로 밀거나 시점 버튼으로 둘러보세요.</p><label className={styles.check}><input type="checkbox" checked={showSpots} onChange={event=>setShowSpots(event.target.checked)}/>정면의 소품 위치 보기 · 큰 화면</label><details className={styles.sceneTools}><summary>소품으로 시작하기</summary><div>{HOTSPOTS[scene].filter(spot=>!spot.strike).map(spot=><button key={spot.label} onClick={()=>activateSpot(spot)}>{spot.label}</button>)}</div></details></div></section>}

    <div className={panel==='music'?styles.musicPanel:styles.activityPanel} hidden={!panel}>
    {panel?<section className={styles.panel} data-activity={panel} aria-labelledby="space-panel-title"><div className={styles.panelHead}><h2 id="space-panel-title" ref={panelHeading} tabIndex={-1}>{PANELS[panel]}</h2><button aria-label="활동 패널 닫기" onClick={close}><X size={19}/></button></div>
     {panel==='bow'&&<div className={styles.bowControls}><div className={styles.count}><strong>{bow.session.completed}</strong><span>/ {bow.session.target}배</span></div><div className={styles.row}>{ended?<button onClick={()=>bow.reset(bow.session.target)}>다시 시작하기</button>:bow.session.status==='running'?<button className={styles.primary} onClick={bow.pause}>일시정지</button>:<button className={styles.primary} disabled={!bow.ready||bow.busy} onClick={()=>{setActivity('bow');void bow.start();}}>{bow.session.status==='paused'?'이어서 하기':`${bow.session.target}배 시작하기`}</button>}{active&&<button onClick={bow.stop}>여기까지</button>}</div><progress value={bow.session.completed} max={bow.session.target} aria-label="완료한 큰절 횟수"/></div>}
     <div className={styles.panelBody}>
     {panel==='meditation'&&<><p>지금은 잘하려고 애쓰지 않아도 괜찮아요.<br/>나의 속도로 들이쉬고, 천천히 내쉬어요.</p><div className={styles.breath} data-moving={!noMotion}><Flower2 size={32} strokeWidth={1.3} aria-hidden="true"/><span>편안하게<br/>머물러요</span></div><div className={styles.row}><button className={styles.primary} onClick={()=>open('music')}>명상 음악 고르기</button><button onClick={()=>{setActivity('idle');setNotice('충분히 쉬었어요. 준비되면 다시 시작해요.');}}>명상 마치기</button></div></>}
     {panel==='prayer'&&<><p>누군가에게 보여주지 않아도 되는 나의 기도예요. 불상 앞에서 마음을 모으고, 바라는 일을 적어보세요.</p><label className={styles.field}>오늘의 기도<textarea maxLength={2000} value={prayer} onChange={event=>setPrayer(event.target.value)} placeholder="지금 내 마음에 가장 필요한 것은…"/></label></>}
     {panel==='affirmation'&&<>{speaking?<div className={styles.affirmationReading}><p>{affirmation}</p><button disabled={savingText} onClick={()=>saveText('affirmation')}>소리 내어 읽었어요</button><button onClick={()=>setSpeaking(false)}>문장 고치기</button></div>:<><p>이곳에서는 나의 목소리로, 나에게 다정한 말을 건네요.</p><label className={`${styles.field} ${styles.affirmationField}`}><span><Heart size={17} aria-hidden="true"/>오늘의 확언</span><textarea maxLength={2000} value={affirmation} onChange={event=>setAffirmation(event.target.value)}/></label><div className={styles.row}><button className={styles.primary} onClick={()=>setSpeaking(true)}>소리 내어 읽기</button><button onClick={()=>{const picked=pickTrainingAffirmation('회복력 강화',affirmIndex);setAffirmIndex(picked.index);setAffirmation(picked.text);}}>다른 문장 만나기</button></div></>}<p className={styles.panelNote}>직접 읽고 ‘읽었어요’를 누르면 나의 기록에 남아요. 마이크를 켜거나 녹음하지 않아요.</p></>}
     {panel==='bow'&&<>
      <p className={styles.phase}>{phase}</p><progress className={styles.cycle} value={bow.session.elapsed} max={CYCLE_MS} aria-label="현재 큰절 동작 진행"/>
      <details className={styles.bowOptions}><summary>횟수·속도·참배 설정</summary>
      <fieldset className={styles.targets} disabled={active||bow.busy}><legend>오늘의 마음만큼</legend>{[9,27,108].map(target=><button key={target} aria-pressed={bow.session.target===target} onClick={()=>bow.reset(target)}>{target}배</button>)}</fieldset>
      <div className={styles.row} aria-label="캐릭터 참배 시점"><button aria-pressed={rearView} onClick={()=>setRearView(true)}>불상 바라보기</button><button aria-pressed={!rearView} onClick={()=>setRearView(false)}>앞모습 보기</button></div>
      <button onClick={()=>setImmersive(true)}>참배에 집중하기</button>
      <label className={styles.field}>목탁·염불 음량<input aria-label="목탁·염불 음량" type="range" min="0" max="1" step="0.05" value={effects.volume} onChange={e=>effects.changeVolume(Number(e.target.value))}/></label><p className={styles.small}>태국 사찰의 염불과 목탁을 반복해서 들을 수 있어요. 다시 누르면 멈춰요.</p>
      <label className={styles.field}>동작 속도<select value={bow.session.pendingSpeed} onChange={event=>bow.speed(Number(event.target.value))}><option value={.75}>천천히</option><option value={1}>편안하게</option><option value={1.25}>조금 빠르게</option></select></label>
      {bow.session.pendingSpeed!==bow.session.speed&&<p>다음 절부터 새 속도로 이어져요.</p>}
      <p className={styles.small}>캐릭터와 함께하는 온라인 참배예요. 나의 몸을 측정하거나 횟수를 판정하지 않아요.</p></details>
      <p role="status" className={styles.status}>{bow.session.status==='complete'?'오늘의 참배를 마쳤어요. 마음에 고요한 쉼이 남기를 바라요.':bow.session.status==='paused'?'잠시 쉬는 중이에요.':bow.session.status==='stopped'?'오늘은 여기까지. 나의 기록에 담았어요.':''}</p>
      {bow.notice&&<p role="alert">{bow.notice}</p>}
      <p className={styles.small}>서서 합장으로 돌아온 뒤에만 1회 기록해요. 화면을 떠나면 멈추고, 새로고침하면 마지막 완료 횟수부터 이어가요.</p>
     </>}
     {panel==='fortune'&&<><div className={styles.fortuneLetter}><Flower2 size={26} aria-hidden="true"/><time dateTime={day}>{day}</time>{fortuneBusy?<p role="status">오늘의 흐름을 확인하고 있어요.</p>:fortuneError?<p role="alert">오늘의 흐름을 불러오지 못했어요.<button onClick={loadFortune}>다시 확인</button></p>:<p>{fortune}</p>}</div><Link className={styles.actionLink} href="/today/">오늘의 운세 자세히 보기<ArrowRight size={18} aria-hidden="true"/></Link><p className={styles.panelNote}>돌아오면 마지막 완료 횟수부터 이어갈 수 있어요.</p></>}
     {panel==='records'&&<PrivateRecords scope={profile.scope}/>}
     {panel==='custom'&&<><CharacterChooser profile={profile} reduced={noMotion} onChange={()=>{bow.pause();setJourney(null);setCharacterError(false);setNotice('');}}/>
      <div className={styles.displayOptions}><label className={styles.check}><input type="checkbox" checked={light} onChange={event=>setLight(event.target.checked)}/>가볍게 보기 · 동작 이미지 줄이기</label><p className={styles.small}>화면 표현만 바뀌고 진행 중인 108배와 완료 횟수는 유지돼요.{reduced?' 기기의 모션 감소 설정도 적용 중이에요.':''}</p></div>
     </>}
     {notice&&<p role="status" className={styles.status}>{notice}</p>}
     {panel==='info'&&<><p>다른 사람이 접속해도 이 공간에는 나의 캐릭터만 머물러요. 기도와 기록은 이 브라우저에만 저장돼요. 다른 이용자의 공간과 연결되지 않으며 공개되지 않아요.</p><Link className={styles.actionLink} href="/moonlit-lotus/story/">웹툰 · 연이가 쉬어가는 이야기</Link><p className={styles.small}>목탁 음원: <a href="https://freesound.org/people/jonopodmore/sounds/607215/" target="_blank" rel="noopener noreferrer">Mokugyo · jonopodmore</a> / CC0 · 낮은 음색으로 보정. 염불: <a href="https://freesound.org/people/razajac/sounds/275676/" target="_blank" rel="noopener noreferrer">Thai Chanting · razajac</a> / CC0 · 태국 사찰 현장 녹음. 두 음원을 혼합해 반복 재생합니다.</p><p className={styles.small}>{day} · 달빛 연화당</p><Link href="/moonlit-lotus/model-review/">연이 동작 살펴보기</Link></>}
    </div>{panel==='prayer'&&<div className={`${styles.row} ${styles.panelActions}`}><button className={styles.primary} disabled={savingText} onClick={()=>saveText('prayer')}>기도를 마음에 담기</button><button onClick={()=>{setActivity('prayer');setNotice('두 손을 모으고, 나의 마음에 잠시 귀 기울여요.');}}>조용히 참배하기</button></div>}</section>:null}
    <MusicPlayer scope={profile.scope} open={panel==='music'}/>
    </div>
   </div>
   <nav className={styles.dock} aria-label="주요 활동"><button data-activity="bow" aria-pressed={panel==='bow'} onClick={()=>open('bow')}><HandHeart size={21}/><span>108배</span></button><button data-activity="prayer" aria-pressed={panel==='prayer'} onClick={()=>open('prayer')}><Heart size={21}/><span>기도</span></button><button data-activity="meditation" aria-pressed={panel==='meditation'} onClick={()=>open('meditation')}><Flower2 size={21}/><span>명상</span></button><button aria-expanded={more} aria-controls="moonlit-more" onClick={()=>{setMore(value=>!value);setPanel(null);}}><Menu size={21}/><span>더보기</span></button></nav>
  </div>
  {quiet&&<div className={styles.zenControls}><button ref={zenExit} onClick={leaveQuiet}><Eye size={17}/>메뉴 다시 열기</button>{active&&<><span>{bow.session.completed} / {bow.session.target}배</span><button onClick={bow.session.status==='running'?bow.pause:()=>void bow.start()}>{bow.session.status==='running'?'일시정지':'이어서 하기'}</button></>}</div>}

 </main>;
}
