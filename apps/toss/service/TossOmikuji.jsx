import {useEffect,useMemo,useRef,useState} from 'react';
import {Clipboard,SetClipboardTextPermissionError,Share} from '@apps-in-toss/web-framework';
import {generateEmojiOmikujiResult,normalizeOmikujiInput} from 'virtual:omikuji-engine';
import './toss-omikuji.css';

const key='toss:omikuji-session:v1';
const storageKey=scope=>scope.startsWith('user:')&&scope.length>5?key+':'+encodeURIComponent(scope):'';
const defaults={category:'오늘의 운세',question:'',emotion:'평온',tone:'따뜻하게',emojiTheme:'벚꽃',reroll:0};
const groups=[
 ['category','무엇이 궁금한가요?',['연애','재물','인간관계','직장/학업','멘탈/감정','오늘의 운세','고민 상담']],
 ['emotion','지금의 마음',['설렘','불안','지침','기대','외로움','분노','혼란','평온']],
 ['tone','듣고 싶은 말투',['귀엽게','따뜻하게','단호하게','신비롭게','웃기게','위로']],
 ['emojiTheme','이모지 테마',['벚꽃','고양이','별빛','하트','돈','불꽃','달','로봇']],
];

function restore(scope){
 try{
  const scopedKey=storageKey(scope);if(!scopedKey)return null;
  const saved=JSON.parse(sessionStorage.getItem(scopedKey)||'null');
  if(saved?.scope!==scope)return null;
  if(!saved.input||typeof saved.input.question!=='string'||saved.input.question.length>220)return null;
  const input=normalizeOmikujiInput(saved.input);
  return {input,screen:saved.screen==='result'&&input.question?'result':'intro'};
 }catch{return null;}
}
function save(scope,input,screen){
 try{const scopedKey=storageKey(scope);if(!scopedKey)return false;sessionStorage.setItem(scopedKey,JSON.stringify({scope,input,screen}));return true;}catch{return false;}
}

export default function TossOmikuji({scope}){
 const live=useRef(false),bridgeBusyRef=useRef(false),bridgeEpoch=useRef(0);
 const [bridgeBusy,setBridgeBusy]=useState(false);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const [saved]=useState(()=>restore(scope));
 const [input,setInput]=useState(saved?.input||defaults),[screen,setScreen]=useState(saved?.screen||'intro');
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[permissionDenied,setPermissionDenied]=useState(false),[result,setResult]=useState(()=>{
  if(saved?.screen!=='result')return null;
  try{return generateEmojiOmikujiResult(saved.input);}catch{return null;}
 });
 const back=()=>{bridgeEpoch.current++;setPermissionDenied(false);setError('');setNotice('');if(screen==='result'){setScreen('form');return true;}if(screen==='form'){setScreen('intro');return true;}return false;};
 useEffect(()=>{const listener=event=>{if(back())event.preventDefault();};window.addEventListener('code-destiny:toss-back',listener);return()=>window.removeEventListener('code-destiny:toss-back',listener);},[screen]);
 const select=(name,value)=>setInput(previous=>({...previous,[name]:value}));
 const draw=reroll=>{bridgeEpoch.current++;
  if(!input.question.trim()){setError('고민이나 질문을 적어 주세요.');return;}
  try{
   const next=normalizeOmikujiInput({...input,reroll});const reading=generateEmojiOmikujiResult(next);
   setInput(next);setResult(reading);setScreen('result');setError('');
   setNotice(save(scope,next,'result')?'':scope==='guest'?'로그인하지 않은 상태에서는 화면을 닫으면 결과가 사라져요.':'이 기기에서 결과를 저장하지 못했어요. 화면을 닫기 전에 확인해 주세요.');
   window.scrollTo(0,0);
  }catch{setError('제비를 뽑지 못했어요. 다시 시도해 주세요.');}
 };
 const issue=error=>{const code=error&&typeof error==='object'&&'code' in error?error.code:'',status=error&&typeof error==='object'&&'status' in error?error.status:0;return {denied:error instanceof SetClipboardTextPermissionError||code==='ACCESS_DENIED'||status===403,login:code==='LOGIN_REQUIRED'||code==='SESSION_EXPIRED'||status===401,unsupported:code==='UNSUPPORTED_APP_VERSION'};};
 const exclusive=async task=>{if(bridgeBusyRef.current)return;bridgeBusyRef.current=true;setBridgeBusy(true);try{await task();}finally{bridgeBusyRef.current=false;if(live.current)setBridgeBusy(false);}};
 const copy=text=>exclusive(async()=>{const current=bridgeEpoch.current;try{await Clipboard.setText(text);if(!live.current||current!==bridgeEpoch.current)return;setPermissionDenied(false);setNotice('복사했어요.');}catch(error){if(!live.current||current!==bridgeEpoch.current)return;const reason=issue(error);setPermissionDenied(reason.denied);setNotice(reason.denied?'클립보드 쓰기 권한을 확인해 주세요.':reason.login?'로그인 상태를 확인한 뒤 다시 시도해 주세요.':reason.unsupported?'토스 앱을 업데이트한 뒤 다시 시도해 주세요.':'복사하지 못했어요. 다시 시도해 주세요.');}});
 const share=()=>exclusive(async()=>{const current=bridgeEpoch.current;try{const link=await Share.createLink({path:'intoss://ai-saju-studio/omikuji/'});if(!live.current||current!==bridgeEpoch.current)return;await Share.sendMessage({message:`이모이 오미쿠지\n${result.title}\n${result.shortMessage}\n오늘의 부적: ${result.charmText}\n${link}`});}catch(error){if(!live.current||current!==bridgeEpoch.current)return;const reason=issue(error);setNotice(reason.denied?'공유 권한을 확인할 수 없어요.':reason.login?'로그인 상태를 확인한 뒤 다시 시도해 주세요.':reason.unsupported?'토스 앱을 업데이트한 뒤 다시 시도해 주세요.':'공유 화면을 열지 못했어요. 다시 시도해 주세요.');}});
 const requestClipboardPermission=()=>exclusive(async()=>{const current=bridgeEpoch.current;try{const status=await Clipboard.setText.openPermissionDialog();if(!live.current||current!==bridgeEpoch.current)return;setPermissionDenied(status!=='allowed');setNotice(status==='allowed'?'권한을 확인했어요. 복사를 다시 눌러 주세요.':'클립보드 쓰기 권한이 없어 복사할 수 없어요.');}catch(error){if(!live.current||current!==bridgeEpoch.current)return;const reason=issue(error);setNotice(reason.denied?'클립보드 쓰기 권한을 확인해 주세요.':reason.login?'로그인 상태를 확인한 뒤 다시 시도해 주세요.':reason.unsupported?'토스 앱을 업데이트한 뒤 다시 시도해 주세요.':'권한을 확인하지 못했어요. 다시 시도해 주세요.');}});
 const detail=useMemo(()=>result?.detailedReading?.replace('🤖 AI 텍스트 이모지 시그널','✨ 이모지 시그널')||'', [result]);
 return <main className="toss-omikuji">
  <header><h1>이모이 오미쿠지</h1></header>
  {screen==='intro'&&<section><h2>마음을 고르고 제비를 뽑아 보세요</h2><p>지금의 질문과 마음을 담아 오늘의 오미쿠지를 만나 보세요.</p><button onClick={()=>setScreen('form')}>마음 고르고 제비 뽑기</button>{result&&<button onClick={()=>setScreen('result')}>이 기기의 결과 다시 보기</button>}</section>}
  {screen==='form'&&<section><h2>지금 마음에 남은 이야기</h2>
   {groups.map(([name,label,values])=><fieldset key={name}><legend>{label}</legend><div>{values.map(value=><button key={value} type="button" aria-pressed={input[name]===value} onClick={()=>select(name,value)}>{value}</button>)}</div></fieldset>)}
   <label>고민 또는 질문<textarea maxLength={220} value={input.question} onChange={event=>select('question',event.target.value)} placeholder="지금 마음에 걸리는 질문을 적어 주세요."/></label>
   <p>{input.question.length} / 220</p><button onClick={()=>draw(0)}>제비통 흔들어 뽑기</button><button onClick={()=>{setInput(defaults);setResult(null);setError('');try{const scopedKey=storageKey(scope);if(scopedKey)sessionStorage.removeItem(scopedKey);}catch{}}}>입력 초기화</button>
  </section>}
  {screen==='result'&&(result?<section><p>{result.grade} · {result.emojiTheme}</p><h2>{result.title}</h2><p>{result.shortMessage}</p><h3>당신이 적은 질문</h3><p>{result.question}</p><div className="omikuji-detail">{detail}</div>
   {result.sectionCards.map(card=><article key={card.title}><h3>{card.icon} {card.title}</h3><p>{card.body}</p></article>)}
   <h3>오늘의 오미쿠지 부적</h3>{result.luckyCharms.map(charm=><figure key={charm.id}><img src={charm.src} alt=""/><figcaption>{charm.glyph} {charm.name}</figcaption></figure>)}
   <button disabled={bridgeBusy} onClick={()=>void copy(result.charmText)}>부적 설명 복사하기</button><button disabled={bridgeBusy} onClick={()=>void copy(detail)}>결과 복사하기</button><button disabled={bridgeBusy} onClick={()=>void share()}>결과 공유하기</button><button onClick={()=>draw(input.reroll+1)}>다시 뽑기</button><button onClick={back}>입력 수정하기</button>
  </section>:<section><p role="alert">저장된 결과를 불러오지 못했어요.</p><button onClick={()=>setScreen('form')}>입력 다시 확인하기</button></section>)}
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{permissionDenied&&<button disabled={bridgeBusy} onClick={()=>void requestClipboardPermission()}>클립보드 권한 확인하기</button>}
 </main>;
}
