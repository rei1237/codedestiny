import { useState, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════
const GEMSTONES = [
  { id:"tigers-eye",       name:"호안석",        color:"#C8960C", glow:"#DAA520", theme:"금전·사업·결단"   },
  { id:"rose-quartz",      name:"로즈 쿼츠",     color:"#E8789A", glow:"#FF69B4", theme:"연애·치유·자존감"  },
  { id:"amethyst",         name:"애머지스트",    color:"#9B6FD4", glow:"#B57BEE", theme:"통찰·영성·직관"   },
  { id:"citrine",          name:"시트린",        color:"#E8B830", glow:"#FFD700", theme:"풍요·활력·변화"   },
  { id:"lapis",            name:"라피스 라줄리", color:"#2856B0", glow:"#4169E1", theme:"지혜·진실·명예"   },
  { id:"black-tourmaline", name:"블랙 토르말린", color:"#5A6070", glow:"#708090", theme:"보호·정화·방어"   },
  { id:"green-fluorite",   name:"그린 플로라이트",color:"#2E9E5E",glow:"#3CB371", theme:"집중·정리·평온"   },
];

const TOPICS = [
  { id:"wealth",   name:"재물 · 사업",  shortName:"재물",   color:"#C8960C", glow:"#DAA520",
    desc:"금전의 흐름과 사업의 기회를 읽어드려요", icon:"◆",
    spread:{ type:"cross5", name:"크로스 스프레드",
      positions:["현재 재물운","기회·가능성","방해 요소","조언의 방향","최종 결과"] },
    suggestedGems:["tigers-eye","citrine"],
    hint:"재물운, 금전 흐름, 사업 기회에 집중하여 조언해줘." },
  { id:"love",     name:"연애 · 감정",  shortName:"연애",   color:"#E8789A", glow:"#FF69B4",
    desc:"사랑의 에너지와 감정의 방향을 읽어드려요", icon:"♡",
    spread:{ type:"triangle3", name:"트라이앵글 스프레드",
      positions:["현재 감정 상태","상대방의 에너지","앞으로의 흐름"] },
    suggestedGems:["rose-quartz","amethyst"],
    hint:"연애운, 감정 상태, 상대방의 마음에 집중하여 조언해줘." },
  { id:"reunion",  name:"재회 · 인연",  shortName:"재회",   color:"#9B6FD4", glow:"#B57BEE",
    desc:"인연의 실과 재회 가능성을 읽어드려요", icon:"∞",
    spread:{ type:"row3", name:"3장 스프레드",
      positions:["나의 마음 상태","상대방의 에너지","재회 가능성"] },
    suggestedGems:["amethyst","rose-quartz"],
    hint:"재회 가능성, 인연의 연결, 상대방의 감정에 집중하여 조언해줘." },
  { id:"move",     name:"이동수 · 변화", shortName:"이동수", color:"#2856B0", glow:"#4169E1",
    desc:"이사·여행·환경 변화의 흐름을 읽어드려요", icon:"➤",
    spread:{ type:"row3", name:"여정 스프레드",
      positions:["현재 위치·상황","여정의 에너지","새로운 목적지"] },
    suggestedGems:["lapis","citrine"],
    hint:"이동수, 이사운, 여행, 환경 변화에 집중하여 조언해줘." },
  { id:"career",   name:"직업 · 진로",  shortName:"진로",   color:"#2E9E5E", glow:"#3CB371",
    desc:"직업운과 진로의 방향성을 읽어드려요", icon:"✦",
    spread:{ type:"square4", name:"4장 스프레드",
      positions:["현재 직업 상황","도전 과제","숨겨진 영향력","나아갈 방향"] },
    suggestedGems:["green-fluorite","lapis"],
    hint:"직업운, 진로 방향, 커리어 성장에 집중하여 조언해줘." },
  { id:"health",   name:"건강 · 에너지", shortName:"건강",  color:"#E8B830", glow:"#FFD700",
    desc:"몸과 마음의 에너지 상태를 읽어드려요", icon:"✿",
    spread:{ type:"row3", name:"힐링 스프레드",
      positions:["몸의 상태","마음의 상태","치유의 방향"] },
    suggestedGems:["green-fluorite","citrine"],
    hint:"건강 상태, 신체 에너지, 정신 건강, 치유 방향에 집중하여 조언해줘." },
  { id:"relation", name:"대인관계",     shortName:"관계",   color:"#5A6070", glow:"#708090",
    desc:"주변 인간관계의 에너지를 읽어드려요", icon:"⊙",
    spread:{ type:"square4", name:"관계 스프레드",
      positions:["나의 에너지","상대의 에너지","관계의 흐름","앞으로의 조언"] },
    suggestedGems:["black-tourmaline","rose-quartz"],
    hint:"인간관계, 주변 사람들과의 에너지, 관계의 방향성에 집중하여 조언해줘." },
];

const SPREAD_CARD_COUNT = { row3:3, triangle3:3, cross5:5, square4:4 };

const TAROT_CARDS = [
  "The Fool","The Magician","The High Priestess","The Empress","The Emperor",
  "The Hierophant","The Lovers","The Chariot","Strength","The Hermit",
  "Wheel of Fortune","Justice","The Hanged Man","Death","Temperance",
  "The Devil","The Tower","The Star","The Moon","The Sun",
  "Judgement","The World","Ace of Wands","Two of Wands","Three of Wands",
  "Five of Wands","Seven of Wands","Nine of Wands","King of Wands",
  "Ace of Cups","Three of Cups","Five of Cups","Seven of Cups","Nine of Cups",
  "Page of Cups","Knight of Cups","Queen of Cups","King of Cups",
  "Ace of Swords","Three of Swords","Five of Swords","Seven of Swords",
  "Nine of Swords","Page of Swords","Queen of Swords","King of Swords",
  "Ace of Pentacles","Three of Pentacles","Five of Pentacles","Seven of Pentacles",
  "Nine of Pentacles","Page of Pentacles","Queen of Pentacles","King of Pentacles",
];

const CARD_KR = {
  "The Fool":"광대","The Magician":"마법사","The High Priestess":"여사제",
  "The Empress":"여황제","The Emperor":"황제","The Hierophant":"교황",
  "The Lovers":"연인","The Chariot":"전차","Strength":"힘",
  "The Hermit":"은자","Wheel of Fortune":"운명의 수레바퀴","Justice":"정의",
  "The Hanged Man":"매달린 남자","Death":"죽음","Temperance":"절제",
  "The Devil":"악마","The Tower":"탑","The Star":"별",
  "The Moon":"달","The Sun":"태양","Judgement":"심판","The World":"세계",
  "Ace of Wands":"완드 에이스","Two of Wands":"완드 2","Three of Wands":"완드 3",
  "Five of Wands":"완드 5","Seven of Wands":"완드 7","Nine of Wands":"완드 9",
  "King of Wands":"완드 킹","Ace of Cups":"컵 에이스","Three of Cups":"컵 3",
  "Five of Cups":"컵 5","Seven of Cups":"컵 7","Nine of Cups":"컵 9",
  "Page of Cups":"컵 시종","Knight of Cups":"컵 기사","Queen of Cups":"컵 여왕",
  "King of Cups":"컵 킹","Ace of Swords":"소드 에이스","Three of Swords":"소드 3",
  "Five of Swords":"소드 5","Seven of Swords":"소드 7","Nine of Swords":"소드 9",
  "Page of Swords":"소드 시종","Queen of Swords":"소드 여왕","King of Swords":"소드 킹",
  "Ace of Pentacles":"펜타클 에이스","Three of Pentacles":"펜타클 3",
  "Five of Pentacles":"펜타클 5","Seven of Pentacles":"펜타클 7",
  "Nine of Pentacles":"펜타클 9","Page of Pentacles":"펜타클 시종",
  "Queen of Pentacles":"펜타클 여왕","King of Pentacles":"펜타클 킹",
};

const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;

function isAdminSessionClient(){
  if (typeof window === "undefined") return false;
  try {
    if (window.__cdAdminBypass) return true;
  } catch {}
  try {
    const userRaw = localStorage.getItem("fortune_auth_user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (String(user?.role || "").toLowerCase() === "admin") return true;
    }
  } catch {}
  try {
    const userRaw = localStorage.getItem("cd_user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (String(user?.role || "").toLowerCase() === "admin") return true;
    }
  } catch {}
  try {
    const roleMatch = document.cookie.match(/(?:^|;\s*)cd_role=([^;]+)/);
    if (roleMatch && decodeURIComponent(roleMatch[1]).toLowerCase() === "admin") return true;
  } catch {}
  try {
    const tok = String(sessionStorage.getItem("flower_admin_token") || "");
    if (FLOWER_ADMIN_TOKEN_RE.test(tok)) return true;
  } catch {}
  try {
    const tok = String(localStorage.getItem("flower_admin_token") || "");
    if (FLOWER_ADMIN_TOKEN_RE.test(tok)) return true;
  } catch {}
  return false;
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL CSS
// ═══════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400&family=Noto+Sans+KR:wght@300;400&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
@keyframes f0{0%,100%{transform:translateY(0)rotate(0)}40%{transform:translateY(-13px)rotate(1.5deg)}70%{transform:translateY(-6px)rotate(-1deg)}}
@keyframes f1{0%,100%{transform:translateY(0)rotate(0)}35%{transform:translateY(-10px)rotate(-2deg)}65%{transform:translateY(-16px)rotate(1deg)}}
@keyframes f2{0%,100%{transform:translateY(0)rotate(0)}50%{transform:translateY(-18px)rotate(2deg)}}
@keyframes f3{0%,100%{transform:translateY(0)rotate(0)}45%{transform:translateY(-12px)rotate(-1deg)}}
@keyframes f4{0%,100%{transform:translateY(0)rotate(0)}30%{transform:translateY(-15px)rotate(1deg)}}
@keyframes f5{0%,100%{transform:translateY(0)rotate(0)}55%{transform:translateY(-10px)rotate(1.5deg)}}
@keyframes f6{0%,100%{transform:translateY(0)rotate(0)}40%{transform:translateY(-14px)rotate(-1.5deg)}}
@keyframes flameDance{0%,100%{transform:rotate(-4deg)scaleY(1)scaleX(1)}25%{transform:rotate(3deg)scaleY(1.08)scaleX(0.95)}50%{transform:rotate(-2deg)scaleY(0.94)scaleX(1.05)}75%{transform:rotate(4deg)scaleY(1.06)scaleX(0.97)}}
@keyframes candleGlow{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:.88;transform:scale(1.07)}}
@keyframes glowPulse{0%,100%{opacity:.5}50%{opacity:1}}
@keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes rippleOut{0%{transform:scale(.3);opacity:.9}100%{transform:scale(5);opacity:0}}
@keyframes particleUp{0%{opacity:1;transform:translate(0,0)scale(1)}100%{opacity:0;transform:translate(var(--tx),var(--ty))scale(0)}}
@keyframes eyeFlash{0%,88%,100%{opacity:0;transform:scale(.5)}92%,96%{opacity:1;transform:scale(1)}}
@keyframes cursorPulse{0%,100%{opacity:1}50%{opacity:0}}
@keyframes spinSlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes activeSlot{0%,100%{box-shadow:0 0 0 1.5px var(--c)}50%{box-shadow:0 0 14px 2px var(--c)}}
.fu{animation:fadeUp .85s cubic-bezier(.16,1,.3,1) forwards}
.gp{animation:glowPulse 2.2s ease-in-out infinite}
`;

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════
const floatAnims = ["f0","f1","f2","f3","f4","f5","f6"];
const floatDurs  = [4.2,3.8,5.1,4.6,3.5,4.9,4.0];
const floatDels  = [0,0.6,1.1,0.35,0.9,1.5,0.45];

function lighten(hex, a=55){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.min(255,r+a)},${Math.min(255,g+a)},${Math.min(255,b+a)})`;
}
function gemById(id){ return GEMSTONES.find(g=>g.id===id); }

// ═══════════════════════════════════════════════════════════════
// GEM SHAPE
// ═══════════════════════════════════════════════════════════════
function GemShape({ gem, size=80, hovered=false, energized=false, pct=0 }){
  const lit = hovered||energized||pct>0;
  const gs = lit
    ? `drop-shadow(0 0 ${size*.14}px ${gem.glow}) drop-shadow(0 0 ${size*.32}px ${gem.glow}88) drop-shadow(0 0 ${size*.55}px ${gem.glow}44)`
    : `drop-shadow(0 0 ${size*.07}px ${gem.glow}60)`;
  const sc = hovered ? 1.1 : 1+pct*0.007;
  const ty = hovered ? -10 : 0;
  return (
    <div style={{width:size,height:size,position:"relative",
      filter:gs,
      transform:`translateY(${ty}px) scale(${sc})`,
      transition:"filter .5s ease,transform .4s cubic-bezier(.34,1.56,.64,1)",
      flexShrink:0,
    }}>
      <div className="gp" style={{position:"absolute",inset:`-${size*.28}px`,borderRadius:"50%",
        background:`radial-gradient(circle,${gem.glow}${lit?"40":"1a"} 0%,transparent 70%)`,zIndex:0}}/>
      <div style={{position:"relative",zIndex:1,width:"100%",height:"100%",
        background:`radial-gradient(circle at 32% 28%,${lighten(gem.color,70)},${gem.color} 55%,${lighten(gem.color,-25)})`,
        clipPath:"polygon(50% 0%,95% 25%,95% 75%,50% 100%,5% 75%,5% 25%)",
      }}>
        <div style={{position:"absolute",top:"12%",left:"18%",width:"30%",height:"22%",
          background:"rgba(255,255,255,.44)",clipPath:"polygon(50% 0%,100% 100%,0% 100%)",transform:"rotate(10deg)"}}/>
        <div style={{position:"absolute",top:"35%",right:"20%",width:"15%",height:"11%",
          background:"rgba(255,255,255,.22)",borderRadius:"50%",filter:"blur(2px)"}}/>
      </div>
      {gem.id==="tigers-eye" && pct>=100 && (
        <div style={{position:"absolute",inset:0,zIndex:3,display:"flex",alignItems:"center",justifyContent:"center",
          animation:"eyeFlash 2.5s ease-in-out infinite"}}>
          <div style={{width:size*.38,height:size*.2,
            background:"radial-gradient(ellipse at center,#FFF700 0%,#DAA520 50%,#7B3F00 100%)",
            borderRadius:"50%",border:`1px solid #B8860B`,
            boxShadow:`0 0 ${size*.2}px #FFD700,0 0 ${size*.4}px #DAA52088`}}/>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CANDLE
// ═══════════════════════════════════════════════════════════════
function Candle(){
  return (
    <div style={{position:"fixed",bottom:28,right:28,zIndex:200,pointerEvents:"none"}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{position:"absolute",top:-28,left:-34,width:84,height:84,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(255,140,0,.16) 0%,transparent 70%)",animation:"candleGlow 1.8s ease-in-out infinite"}}/>
        <div style={{width:9,height:18,background:"radial-gradient(ellipse at 50% 90%,#FF4500,#FF8C00 50%,#FFD700 85%,transparent)",
          borderRadius:"50% 50% 30% 30%",animation:"flameDance .7s ease-in-out infinite",
          boxShadow:"0 0 8px #FF8C00,0 0 18px #FF450080",transformOrigin:"50% 100%"}}/>
        <div style={{width:2,height:4,background:"#2a1a0a",marginTop:-2}}/>
        <div style={{width:14,height:36,background:"linear-gradient(180deg,#FAF0DC,#F5DEB3 60%,#EDD090)",
          borderRadius:"2px 2px 1px 1px",boxShadow:"inset -2px 0 4px rgba(0,0,0,.15)"}}/>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAR FIELD
// ═══════════════════════════════════════════════════════════════
function StarField(){
  const stars = useRef(Array.from({length:55},()=>({
    x:Math.random()*100,y:Math.random()*100,
    size:Math.random()*1.4+0.4,opacity:Math.random()*.35+.08,
    dur:Math.random()*4+3,delay:Math.random()*6,
  }))).current;
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
      {stars.map((s,i)=>(
        <div key={i} style={{position:"absolute",left:`${s.x}%`,top:`${s.y}%`,
          width:s.size,height:s.size,borderRadius:"50%",background:"#D4C5A9",opacity:s.opacity,
          animation:`glowPulse ${s.dur}s ${s.delay}s ease-in-out infinite`}}/>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHASE 1 — TOPIC SELECTION
// ═══════════════════════════════════════════════════════════════
const CRYSTAL_COST = 50;

function TopicPhase({ onSelect }){
  const [hov, setHov] = useState(null);
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 20px"}}>
      <div className="fu" style={{textAlign:"center",marginBottom:40}}>
        {/* stonetaro 이미지 */}
        <div style={{position:"relative",width:160,height:160,margin:"0 auto 24px",borderRadius:20,overflow:"hidden",
          boxShadow:"0 0 40px rgba(184,134,11,.25),0 0 80px rgba(184,134,11,.1)",
          border:"1px solid rgba(184,134,11,.35)"}}>
          <img
            src="/fuctionassets/stonetaro.webp"
            alt="크리스탈 소울 타로"
            style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
          />
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(3,3,5,.8) 0%,transparent 55%)"}}/>
          <div style={{position:"absolute",inset:0,borderRadius:20,
            border:"1px solid rgba(184,134,11,.4)",animation:"glowPulse 2.8s ease-in-out infinite"}}/>
        </div>
        <p style={{fontFamily:"Noto Sans KR,sans-serif",color:"#7A6A50",fontSize:11,letterSpacing:".44em",marginBottom:18}}>✦ CRYSTAL SOUL TAROT ✦</p>
        <h1 style={{fontFamily:"Noto Serif KR,serif",color:"#D4C5A9",fontSize:"clamp(20px,4vw,34px)",fontWeight:300,lineHeight:1.6,marginBottom:14}}>
          오늘 어떤 이야기를<br/>풀어드릴까요
        </h1>
        <p style={{fontFamily:"Noto Sans KR,sans-serif",color:"#6A5E4A",fontSize:11,marginBottom:18}}>
          리딩 결과 열람 시 <span style={{color:"#C8960C",fontWeight:400}}>{CRYSTAL_COST}코인</span>이 차감됩니다
        </p>
        <div style={{width:80,height:1,margin:"0 auto",background:"linear-gradient(90deg,transparent,#B8860B,transparent)"}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:16,maxWidth:680,width:"100%"}}>
        {TOPICS.map((t,i)=>(
          <div key={t.id} className="fu" style={{animationDelay:`${i*.06}s`,
            padding:"22px 14px 18px",borderRadius:14,cursor:"pointer",
            border:`1px solid ${hov===t.id?t.color+"55":"rgba(255,255,255,.04)"}`,
            background:hov===t.id?`${t.color}0e`:"transparent",
            transition:"all .3s ease",display:"flex",flexDirection:"column",alignItems:"center",gap:10,
          }}
          onMouseEnter={()=>setHov(t.id)} onMouseLeave={()=>setHov(null)} onClick={()=>onSelect(t)}>
            <div style={{width:42,height:42,borderRadius:10,
              border:`1px solid ${hov===t.id?t.color+"80":"rgba(255,255,255,.06)"}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              background:hov===t.id?`${t.color}18`:"rgba(255,255,255,.02)",
              fontSize:18,color:hov===t.id?t.color:"#6A5E4A",
              transition:"all .3s",
            }}>{t.icon}</div>
            <p style={{fontFamily:"Noto Serif KR,serif",color:hov===t.id?"#E8D9C0":"#BBA98A",fontSize:14,fontWeight:300,transition:"color .3s"}}>{t.name}</p>
            <p style={{fontFamily:"Noto Sans KR,sans-serif",color:"#5A5040",fontSize:10,textAlign:"center",lineHeight:1.5}}>{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2 — GEMSTONE SELECTION
// ═══════════════════════════════════════════════════════════════
function GemPhase({ topic, onSelect }){
  const [hov, setHov] = useState(null);
  const [ripple, setRipple] = useState(null);
  const handle = (gem) => { setRipple(gem.id); setTimeout(()=>onSelect(gem),650); };
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 20px"}}>
      <div className="fu" style={{textAlign:"center",marginBottom:16}}>
        <p style={{fontFamily:"Noto Sans KR,sans-serif",color:topic.color,fontSize:11,letterSpacing:".4em",marginBottom:14}}>
          {topic.icon} {topic.name}
        </p>
        <h2 style={{fontFamily:"Noto Serif KR,serif",color:"#D4C5A9",fontSize:"clamp(18px,3.5vw,28px)",fontWeight:300,lineHeight:1.6,marginBottom:10}}>
          리딩을 도와줄 원석을 선택하세요
        </h2>
        <p style={{fontFamily:"Noto Sans KR,sans-serif",color:"#6A5E4A",fontSize:12,marginBottom:28}}>
          ✦ 추천&nbsp;
          {topic.suggestedGems.map(id=>gemById(id)?.name).join(", ")}
        </p>
        <div style={{width:60,height:1,margin:"0 auto",background:`linear-gradient(90deg,transparent,${topic.color},transparent)`}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:18,maxWidth:680,width:"100%",marginTop:40}}>
        {GEMSTONES.map((gem,i)=>{
          const isSugg = topic.suggestedGems.includes(gem.id);
          return (
            <div key={gem.id} className="fu" style={{animationDelay:`${i*.06}s`,
              display:"flex",flexDirection:"column",alignItems:"center",
              padding:"20px 10px 16px",borderRadius:14,cursor:"pointer",position:"relative",overflow:"hidden",
              border:`1px solid ${hov===gem.id?gem.color+"55":isSugg?"rgba(255,255,255,.08)":"rgba(255,255,255,.03)"}`,
              background:hov===gem.id?`${gem.color}0d`:isSugg?"rgba(255,255,255,.015)":"transparent",
              transition:"all .3s",
            }}
            onMouseEnter={()=>setHov(gem.id)} onMouseLeave={()=>setHov(null)} onClick={()=>handle(gem)}>
              {isSugg && (
                <div style={{position:"absolute",top:8,right:10,fontFamily:"Noto Sans KR,sans-serif",
                  color:gem.color,fontSize:9,letterSpacing:".15em"}}>추천</div>
              )}
              <div style={{animation:`${floatAnims[i]} ${floatDurs[i]}s ${floatDels[i]}s ease-in-out infinite`}}>
                <GemShape gem={gem} size={62} hovered={hov===gem.id}/>
              </div>
              <p style={{fontFamily:"Noto Serif KR,serif",color:hov===gem.id?"#E8D9C0":"#BBA88A",fontSize:13,fontWeight:300,marginTop:14,marginBottom:4}}>{gem.name}</p>
              <p style={{fontFamily:"Noto Sans KR,sans-serif",color:"#5A5040",fontSize:10,textAlign:"center",lineHeight:1.5}}>{gem.theme}</p>
              {ripple===gem.id && (
                <div style={{position:"absolute",top:"50%",left:"50%",width:60,height:60,marginLeft:-30,marginTop:-30,
                  borderRadius:"50%",background:`radial-gradient(circle,${gem.glow}55 0%,transparent 70%)`,
                  animation:"rippleOut .65s ease forwards",pointerEvents:"none"}}/>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHASE 3 — ENERGY SYNC
// ═══════════════════════════════════════════════════════════════
function EnergyPhase({ gem, onComplete }){
  const [energy, setEnergy] = useState(0);
  const [done, setDone] = useState(false);
  const [particles, setParticles] = useState([]);
  const dragging = useRef(false);
  const lastPos = useRef(null);
  const containerRef = useRef(null);
  const pid = useRef(0);

  const addP = useCallback((cx,cy)=>{
    const id=++pid.current;
    const tx=(Math.random()-.5)*80, ty=-(Math.random()*60+18);
    setParticles(p=>[...p.slice(-24),{id,cx,cy,tx,ty}]);
    setTimeout(()=>setParticles(p=>p.filter(x=>x.id!==id)),900);
  },[]);

  const move = useCallback((cx,cy)=>{
    if(!dragging.current) return;
    const rect=containerRef.current?.getBoundingClientRect(); if(!rect) return;
    const dx=lastPos.current?Math.abs(cx-lastPos.current.x):0;
    const dy=lastPos.current?Math.abs(cy-lastPos.current.y):0;
    lastPos.current={x:cx,y:cy};
    addP(cx-rect.left,cy-rect.top);
    setEnergy(prev=>{
      const n=Math.min(prev+(dx+dy)*.72,100);
      if(n>=100&&!done){setDone(true);setTimeout(()=>onComplete(),1200);}
      return n;
    });
  },[done,addP,onComplete]);

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 20px"}}>
      <div className="fu" style={{textAlign:"center",marginBottom:44}}>
        <p style={{fontFamily:"Noto Sans KR,sans-serif",color:"#7A6A50",fontSize:11,letterSpacing:".4em",marginBottom:14}}>에너지 동기화</p>
        <p style={{fontFamily:"Noto Serif KR,serif",color:"#BBA98A",fontSize:"clamp(15px,2.5vw,18px)",fontWeight:300,lineHeight:1.8}}>
          <span style={{color:gem.color}}>{gem.name}</span>을 문질러<br/>당신의 에너지를 전달해주세요
        </p>
      </div>
      <div ref={containerRef} style={{position:"relative",width:230,height:230,display:"flex",alignItems:"center",justifyContent:"center",
        cursor:done?"default":"grab",marginBottom:44,userSelect:"none"}}
        onMouseDown={()=>{dragging.current=true;}} onMouseUp={()=>{dragging.current=false;lastPos.current=null;}}
        onMouseLeave={()=>{dragging.current=false;lastPos.current=null;}}
        onMouseMove={e=>move(e.clientX,e.clientY)}
        onTouchStart={()=>{dragging.current=true;}} onTouchEnd={()=>{dragging.current=false;lastPos.current=null;}}
        onTouchMove={e=>{const t=e.touches[0];move(t.clientX,t.clientY);}}>
        {[80,120,168].map((r,i)=>(
          <div key={i} style={{position:"absolute",width:r,height:r,borderRadius:"50%",
            border:`1px solid ${gem.color}${["30","20","12"][i]}`,
            animation:`f${i} ${4+i}s ${i*.4}s ease-in-out infinite`}}/>
        ))}
        <div style={{position:"relative",zIndex:2}}>
          <GemShape gem={gem} size={128} pct={energy} energized={energy>20}/>
        </div>
        {particles.map(p=>(
          <div key={p.id} style={{position:"absolute",left:p.cx,top:p.cy,width:7,height:7,
            borderRadius:"50%",background:gem.color,boxShadow:`0 0 8px ${gem.glow}`,
            animation:"particleUp .9s ease forwards","--tx":`${p.tx}px`,"--ty":`${p.ty}px`,
            pointerEvents:"none",zIndex:3,marginLeft:-3.5,marginTop:-3.5}}/>
        ))}
        {done&&[1,2,3].map(i=>(
          <div key={i} style={{position:"absolute",inset:`-${i*14}px`,borderRadius:"50%",
            background:`radial-gradient(circle,${gem.glow}${28-i*8} 0%,transparent 70%)`,
            animation:`rippleOut ${.35+i*.2}s ${i*.14}s ease forwards`,pointerEvents:"none"}}/>
        ))}
      </div>
      <div style={{width:250,height:2,background:"rgba(255,255,255,.07)",borderRadius:2,overflow:"hidden",marginBottom:10}}>
        <div style={{height:"100%",width:`${energy}%`,background:`linear-gradient(90deg,${gem.color}80,${gem.color})`,
          borderRadius:2,transition:"width .08s",boxShadow:`0 0 10px ${gem.glow}`}}/>
      </div>
      <p style={{fontFamily:"Noto Sans KR,sans-serif",color:done?gem.color:"#5A5040",fontSize:12,letterSpacing:".2em"}}>
        {done?"✦ 동기화 완료":energy<1?"원석 위에서 드래그해 에너지를 전달하세요":`${Math.floor(energy)}%`}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CARD SLOT — used in all spreads
// ═══════════════════════════════════════════════════════════════
function CardSlot({ idx, cardName, posLabel, assignedGemId, isActive, isRevealed, mainGem }){
  const ag = assignedGemId ? gemById(assignedGemId) : null;
  const borderC = isRevealed && ag ? ag.color+"80"
                : isActive ? mainGem.color+"99"
                : ag ? ag.color+"44"
                : "rgba(255,255,255,.05)";
  const shadow = isRevealed && ag ? `0 0 16px ${ag.glow}99,0 0 32px ${ag.glow}55`
               : isActive ? `0 0 22px ${mainGem.glow}55`
               : ag ? `0 0 12px ${ag.glow}55`
               : "0 3px 10px rgba(0,0,0,.7)";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,position:"relative",paddingTop:28}}>
      {ag && !isRevealed && (
        <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",zIndex:5,
          animation:"f0 3s ease-in-out infinite"}}>
          <GemShape gem={ag} size={22} energized/>
        </div>
      )}
      <div style={{perspective:"700px"}}>
        <div style={{position:"relative",width:56,height:94,
          transformStyle:"preserve-3d",
          transform:isRevealed?"rotateY(180deg)":"rotateY(0deg)",
          transition:"transform .75s cubic-bezier(.4,0,.2,1)"}}>
          {/* BACK */}
          <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",borderRadius:6,
            background:"linear-gradient(148deg,#140e18 0%,#1e1228 50%,#140e18 100%)",
            border:`1px solid ${borderC}`,boxShadow:shadow,
            display:"flex",alignItems:"center",justifyContent:"center",transition:"all .4s"}}>
            {isActive&&!ag&&(
              <div style={{position:"absolute",inset:-1,borderRadius:6,
                border:`1px solid ${mainGem.color}`,animation:"glowPulse 1.2s ease-in-out infinite",
                pointerEvents:"none","--c":mainGem.color}}/>
            )}
            <svg width="48" height="88" viewBox="0 0 48 88">
              <rect x="2" y="2" width="44" height="84" rx="3" fill="none" stroke="#B8860B" strokeWidth=".6" opacity=".7"/>
              <rect x="6" y="6" width="36" height="76" rx="2" fill="none" stroke="#B8860B" strokeWidth=".3" opacity=".45"/>
              <circle cx="24" cy="44" r="10" fill="none" stroke="#B8860B" strokeWidth=".4" opacity=".6"/>
              <line x1="24" y1="6" x2="24" y2="82" stroke="#B8860B" strokeWidth=".3" opacity=".3"/>
              <line x1="6" y1="44" x2="42" y2="44" stroke="#B8860B" strokeWidth=".3" opacity=".3"/>
              <polygon points="24,37 27.5,43 24,49 20.5,43" fill="none" stroke="#B8860B" strokeWidth=".4" opacity=".6"/>
            </svg>
          </div>
          {/* FRONT */}
          <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",transform:"rotateY(180deg)",
            borderRadius:6,background:"linear-gradient(148deg,#141828,#1a2240 50%,#0f1830)",
            border:`1px solid ${ag?ag.color+"80":mainGem.color+"55"}`,
            boxShadow:ag?`0 0 18px ${ag.glow}99,0 0 36px ${ag.glow}55`:`0 0 14px ${mainGem.glow}66`,
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"5px 4px",gap:5}}>
            {ag&&<GemShape gem={ag} size={16} energized/>}
            <p style={{fontFamily:"Noto Serif KR,serif",color:"#C8B890",fontSize:"7.5px",fontWeight:400,lineHeight:1.4,textAlign:"center"}}>
              {CARD_KR[cardName]||cardName}
            </p>
          </div>
        </div>
      </div>
      <p style={{fontFamily:"Noto Sans KR,sans-serif",color:isActive?mainGem.color:"#5A5040",
        fontSize:10,textAlign:"center",maxWidth:76,lineHeight:1.45,transition:"color .3s"}}>{posLabel}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SPREAD LAYOUTS
// ═══════════════════════════════════════════════════════════════
function Row3Layout({ cards, assignments, activePos, revealed, mainGem, positions }){
  return (
    <div style={{display:"flex",gap:"clamp(14px,3vw,24px)",justifyContent:"center",alignItems:"flex-start",flexWrap:"wrap"}}>
      {cards.map((_,i)=>(
        <CardSlot key={i} idx={i} cardName={cards[i]} posLabel={positions[i]}
          assignedGemId={assignments[i]||null} isActive={activePos===i}
          isRevealed={revealed.has(i)} mainGem={mainGem}/>
      ))}
    </div>
  );
}

function Triangle3Layout({ cards, assignments, activePos, revealed, mainGem, positions }){
  // Triangle: card[1] top-left, card[2] top-right, card[0] bottom-center
  const order=[1,2,0];
  const style=[
    {gridColumn:"1",gridRow:"2"},
    {gridColumn:"3",gridRow:"2"},
    {gridColumn:"2",gridRow:"3"},
  ];
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,88px)",gridTemplateRows:"20px repeat(2,auto)",gap:"8px 8px",justifyContent:"center"}}>
      {/* SVG lines */}
      <div style={{gridColumn:"1/4",gridRow:"1/4",position:"relative",pointerEvents:"none",zIndex:0}}>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",overflow:"visible"}} viewBox="0 0 264 240">
          <line x1="44" y1="150" x2="220" y2="150" stroke="#3A3020" strokeWidth="0.5" strokeDasharray="4,4"/>
          <line x1="44" y1="150" x2="132" y2="60" stroke="#3A3020" strokeWidth="0.5" strokeDasharray="4,4"/>
          <line x1="220" y1="150" x2="132" y2="60" stroke="#3A3020" strokeWidth="0.5" strokeDasharray="4,4"/>
        </svg>
      </div>
      {order.map(i=>(
        <div key={i} style={{...style[i],position:"relative",zIndex:1}}>
          <CardSlot idx={i} cardName={cards[i]} posLabel={positions[i]}
            assignedGemId={assignments[i]||null} isActive={activePos===i}
            isRevealed={revealed.has(i)} mainGem={mainGem}/>
        </div>
      ))}
    </div>
  );
}

function Cross5Layout({ cards, assignments, activePos, revealed, mainGem, positions }){
  // Cross: [1]top, [2]left, [0]center, [3]right, [4]bottom
  const layout=[
    {gridColumn:"2",gridRow:"2"}, // 0 center
    {gridColumn:"2",gridRow:"1"}, // 1 top
    {gridColumn:"1",gridRow:"2"}, // 2 left
    {gridColumn:"3",gridRow:"2"}, // 3 right
    {gridColumn:"2",gridRow:"3"}, // 4 bottom
  ];
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,88px)",gridTemplateRows:"repeat(3,auto)",gap:"8px",justifyContent:"center"}}>
      {cards.map((_,i)=>(
        <div key={i} style={{...layout[i]}}>
          <CardSlot idx={i} cardName={cards[i]} posLabel={positions[i]}
            assignedGemId={assignments[i]||null} isActive={activePos===i}
            isRevealed={revealed.has(i)} mainGem={mainGem}/>
        </div>
      ))}
    </div>
  );
}

function Square4Layout({ cards, assignments, activePos, revealed, mainGem, positions }){
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,88px)",gap:"12px 20px",justifyContent:"center"}}>
      {cards.map((_,i)=>(
        <CardSlot key={i} idx={i} cardName={cards[i]} posLabel={positions[i]}
          assignedGemId={assignments[i]||null} isActive={activePos===i}
          isRevealed={revealed.has(i)} mainGem={mainGem}/>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GEM PICKER (for assigning to cards)
// ═══════════════════════════════════════════════════════════════
function GemPicker({ onSelect, mainGem, posLabel }){
  const [hov, setHov] = useState(null);
  return (
    <div className="fu" style={{textAlign:"center",marginTop:36}}>
      <p style={{fontFamily:"Noto Serif KR,serif",color:"#BBA98A",fontSize:13,fontWeight:300,marginBottom:6,lineHeight:1.7}}>
        <span style={{color:mainGem.color}}>"{posLabel}"</span> 카드 위에<br/>올릴 원석을 선택해주세요
      </p>
      <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap",marginTop:20}}>
        {GEMSTONES.map(gem=>(
          <div key={gem.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:"pointer"}}
            onMouseEnter={()=>setHov(gem.id)} onMouseLeave={()=>setHov(null)} onClick={()=>onSelect(gem.id)}>
            <GemShape gem={gem} size={44} hovered={hov===gem.id}/>
            <p style={{fontFamily:"Noto Sans KR,sans-serif",color:hov===gem.id?gem.color:"#5A5040",
              fontSize:10,transition:"color .25s"}}>{gem.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4 — SPREAD + GEM ASSIGNMENT + REVEAL
// ═══════════════════════════════════════════════════════════════
function SpreadPhase({ topic, gem, spreadCards, onComplete }){
  const count = SPREAD_CARD_COUNT[topic.spread.type];
  const positions = topic.spread.positions;
  const [cards] = useState(()=>[...spreadCards].sort(()=>Math.random()-.5).slice(0,count));
  const [assignments, setAssignments] = useState({});
  const [activePos, setActivePos] = useState(0);
  const [sub, setSub] = useState("assign"); // assign | ready | reveal
  const [revealed, setRevealed] = useState(new Set());

  const assignGem = (gemId) => {
    const na={...assignments,[activePos]:gemId};
    setAssignments(na);
    const next=activePos+1;
    if(next<count) setActivePos(next);
    else setSub("ready");
  };

  const doReveal = () => {
    setSub("reveal");
    cards.forEach((_,i)=>setTimeout(()=>setRevealed(prev=>new Set([...prev,i])),i*720+150));
    setTimeout(()=>onComplete(cards,assignments),count*720+900);
  };

  const spreadProps = { cards, assignments, activePos, revealed, mainGem:gem, positions };

  const LayoutComp = {
    row3: Row3Layout,
    triangle3: Triangle3Layout,
    cross5: Cross5Layout,
    square4: Square4Layout,
  }[topic.spread.type];

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"flex-start",padding:"52px 20px 60px"}}>
      <div className="fu" style={{textAlign:"center",marginBottom:36}}>
        <p style={{fontFamily:"Noto Sans KR,sans-serif",color:topic.color,fontSize:11,letterSpacing:".4em",marginBottom:10}}>
          {topic.icon} {topic.name} · {topic.spread.name}
        </p>
        {sub==="assign"&&(
          <>
            <h2 style={{fontFamily:"Noto Serif KR,serif",color:"#D4C5A9",fontSize:"clamp(17px,3vw,24px)",fontWeight:300,marginBottom:10}}>
              카드 위에 원석을 올려주세요
            </h2>
            <p style={{fontFamily:"Noto Sans KR,sans-serif",color:"#6A5E4A",fontSize:12}}>
              {activePos+1}/{count} — 가장 끌리는 원석을 골라주세요
            </p>
          </>
        )}
        {sub==="ready"&&(
          <>
            <h2 style={{fontFamily:"Noto Serif KR,serif",color:"#D4C5A9",fontSize:"clamp(17px,3vw,24px)",fontWeight:300,marginBottom:10}}>
              모든 원석이 자리를 찾았어요
            </h2>
            <p style={{fontFamily:"Noto Sans KR,sans-serif",color:"#6A5E4A",fontSize:12}}>
              카드를 열어드릴 준비가 됐어요
            </p>
          </>
        )}
        {sub==="reveal"&&(
          <h2 style={{fontFamily:"Noto Serif KR,serif",color:"#D4C5A9",fontSize:"clamp(17px,3vw,24px)",fontWeight:300}}>
            카드를 열어드립니다
          </h2>
        )}
      </div>

      {/* Spread */}
      <div style={{marginBottom:sub==="assign"?8:28}}>
        <LayoutComp {...spreadProps}/>
      </div>

      {/* Gem picker */}
      {sub==="assign"&&(
        <GemPicker onSelect={assignGem} mainGem={gem} posLabel={positions[activePos]}/>
      )}

      {/* Reveal button */}
      {sub==="ready"&&(
        <button className="fu" onClick={doReveal} style={{
          fontFamily:"Noto Serif KR,serif",color:gem.color,
          fontSize:14,fontWeight:300,letterSpacing:".18em",
          background:`${gem.color}10`,
          border:`1px solid ${gem.color}60`,
          borderRadius:28,padding:"12px 36px",
          cursor:"pointer",marginTop:28,
          boxShadow:`0 0 24px ${gem.glow}20`,
          transition:"all .3s",
        }}
        onMouseEnter={e=>{e.currentTarget.style.background=`${gem.color}1e`;e.currentTarget.style.boxShadow=`0 0 32px ${gem.glow}40`;}}
        onMouseLeave={e=>{e.currentTarget.style.background=`${gem.color}10`;e.currentTarget.style.boxShadow=`0 0 24px ${gem.glow}20`;}}>
          ✦ 카드를 열어드립니다
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5 — AI READING
// ═══════════════════════════════════════════════════════════════
function ReadingPhase({ topic, gem, cards, assignments, spreadCards, onReset }){
  const [reading, setReading] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [paid, setPaid] = useState(false);
  const [paidTxId, setPaidTxId] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const called = useRef(false);

  const autoRefundCrystal = useCallback(async()=>{
    const txId = String(paidTxId || "").trim();
    if (!txId) return false;
    const token = localStorage.getItem("fortune_auth_token")||localStorage.getItem("cdToken")||"";
    if (!token) return false;
    const adminToken=(()=>{
      try{
        const raw=String(sessionStorage.getItem("flower_admin_token")||localStorage.getItem("flower_admin_token")||"");
        return FLOWER_ADMIN_TOKEN_RE.test(raw)?raw:"";
      }catch{return "";}
    })();
    const adminTier=(()=>{
      try{return String(localStorage.getItem("flower_admin_test_tier")||"").toLowerCase();}catch{return "";}
    })();

    try{
      const headers={"Content-Type":"application/json","Authorization":"Bearer " + token};
      if(adminToken) headers["x-admin-token"]=adminToken;
      if(adminToken && (adminTier==="standard"||adminTier==="premium"||adminTier==="vvip")) {
        headers["x-admin-subscription-tier"]=adminTier;
      }
      const rr=await fetch("/api/fortune/pig-coin/refund",{
        method:"POST",
        headers,
        body:JSON.stringify({
          cost:CRYSTAL_COST,
          reason:"크리스탈 소울 타로 API 실패 자동 환불",
          featureKey:"tarot-crystal-soul-reading",
          sourceTransactionId:txId,
          requestId:`refund:tarot-crystal-soul:${txId}`,
        }),
      });
      const rd=await rr.json().catch(()=>({}));
      if(!rr.ok && !rd?.alreadyRefunded) return false;
      if(rd?.user && typeof rd.user.points === "number"){
        try{
          const u=JSON.parse(localStorage.getItem("fortune_auth_user")||"null")||{};
          u.points = Number(rd.user.points);
          localStorage.setItem("fortune_auth_user", JSON.stringify(u));
        }catch{}
      }
      setPaidTxId("");
      setPaid(false);
      return true;
    }catch{
      return false;
    }
  },[paidTxId]);

  const playReadingTypewriter = useCallback((rawText)=>{
    const text = String(rawText || "").trim();
    if (!text) {
      setLoading(false);
      return;
    }
    let i = 0;
    const iv = setInterval(()=>{
      setReading(text.slice(0, i));
      i += 4;
      if (i > text.length + 4) {
        setReading(text);
        setLoading(false);
        clearInterval(iv);
      }
    }, 28);
  }, []);

  const buildLocalCrystalReading = useCallback(()=>{
    const cardLines = cards.map((card, idx)=>{
      const gemId = assignments[idx];
      const assignedGem = GEMSTONES.find((g)=>g.id === gemId);
      const pos = topic?.spread?.positions?.[idx] || `${idx + 1}번째 포지션`;
      const cardKr = CARD_KR[card] || card;
      const gemName = assignedGem ? assignedGem.name : gem.name;
      return `${idx + 1}. ${pos}: ${cardKr} (${card}) · ${gemName}의 기운`;
    }).join("\n");

    if (!cardLines) return "";

    return [
      `${topic.name} 크리스탈 소울 리딩`,
      "",
      `핵심 원석: ${gem.name} (${gem.theme})`,
      "",
      "카드 배치 해석",
      cardLines,
      "",
      "통합 조언",
      gem.name + "의 에너지는 지금 너무 빠른 결정보다는 흐름을 정돈하고 우선순위를 분명히 하라는 메시지를 전합니다.",
      "오늘은 마음이 끌리는 한 가지 실행을 정해 작게 시작하고, 그 결과를 기록해 내일의 선택 근거로 삼아보세요.",
    ].join("\n");
  }, [topic, gem, cards, assignments]);

  const doFetch = useCallback(async()=>{
    setLoading(true);setError(false);setReading("");
    const positions = topic.spread.positions;
    const gemstonesMap = Object.fromEntries(GEMSTONES.map(g=>[g.id,{name:g.name,theme:g.theme}]));

    try{
      const res=await fetch("/api/tarot/crystal-soul",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          topic:{id:topic.id,name:topic.name,hint:topic.hint,spread:topic.spread},
          gem:{id:gem.id,name:gem.name,theme:gem.theme},
          cards,
          assignments,
          positions,
          gemstonesMap,
        }),
      });
      const data=await res.json().catch(()=>({}));
      var text = String(data?.reading || "").trim();
      if(!text){
        text = buildLocalCrystalReading();
      }
      if(!text){
        await autoRefundCrystal();
        setError(true);setLoading(false);return;
      }
      playReadingTypewriter(text);
    }catch{
      const localText = buildLocalCrystalReading();
      if (localText) {
        playReadingTypewriter(localText);
        return;
      }
      await autoRefundCrystal();
      setError(true);setLoading(false);
    }
  },[topic,gem,cards,assignments,autoRefundCrystal,buildLocalCrystalReading,playReadingTypewriter]);

  const handlePay = useCallback(async()=>{
    setPayError("");setPaying(true);
    const adminMode = isAdminSessionClient();
    if (adminMode) {
      setPaid(true);
      doFetch();
      setPaying(false);
      return;
    }

    const token=localStorage.getItem("fortune_auth_token")||localStorage.getItem("cdToken")||"";
    const adminToken=(()=>{
      try{
        const raw=String(sessionStorage.getItem("flower_admin_token")||localStorage.getItem("flower_admin_token")||"");
        return FLOWER_ADMIN_TOKEN_RE.test(raw)?raw:"";
      }catch{return "";}
    })();
    const adminTier=(()=>{
      try{return String(localStorage.getItem("flower_admin_test_tier")||"").toLowerCase();}catch{return "";}
    })();
    if(!token){
      setPayError("로그인이 필요합니다.");
      setPaying(false);
      setTimeout(()=>{
        window.location.href="/login?next=%2Ftarot%2Fcrystal-soul";
      },700);
      return;
    }
    try{
      const headers={"Content-Type":"application/json","Authorization":"Bearer " + token};
      if(adminToken) headers["x-admin-token"]=adminToken;
      if(adminToken && (adminTier==="standard"||adminTier==="premium"||adminTier==="vvip")) {
        headers["x-admin-subscription-tier"]=adminTier;
      }
      const r=await fetch("/api/fortune/pig-coin/consume",{
        method:"POST",
        headers,
        body:JSON.stringify({cost:CRYSTAL_COST,reason:"크리스탈 소울 타로 리딩",featureKey:"tarot-crystal-soul-reading"}),
      });
      const d=await r.json().catch(()=>({}));
      if(r.status===402){
        setPayError("코인이 부족합니다. " + CRYSTAL_COST + "코인이 필요합니다.");
        setPaying(false);return;
      }
      if(!r.ok){
        setPayError(String(d?.message||"코인 차감에 실패했습니다."));
        setPaying(false);return;
      }
      setPaidTxId(String(d?.transactionId||""));
      setPaid(true);
      doFetch();
    }catch{
      setPayError("결제 처리 중 오류가 발생했습니다.");
    }finally{
      setPaying(false);
    }
  },[doFetch]);

  const handleRetry = useCallback(()=>{
    if(paid){ called.current=false; doFetch(); }
  },[paid,doFetch]);

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",padding:"60px 20px 80px"}}>
      <div className="fu" style={{textAlign:"center",marginBottom:36}}>
        <p style={{fontFamily:"Noto Sans KR,sans-serif",color:topic.color,fontSize:11,letterSpacing:".45em",marginBottom:10}}>
          {topic.icon} {topic.name}
        </p>
        <h2 style={{fontFamily:"Noto Serif KR,serif",color:"#D4C5A9",fontSize:22,fontWeight:300,marginBottom:12}}>타로 리딩</h2>
        <div style={{width:60,height:1,margin:"0 auto",background:`linear-gradient(90deg,transparent,${gem.color},transparent)`}}/>
      </div>

      {/* Cards summary row */}
      <div className="fu" style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:36,animationDelay:".1s"}}>
        {cards.map((c,i)=>{
          const ag=assignments[i]?gemById(assignments[i]):null;
          return(
            <div key={i} style={{background:"rgba(255,255,255,.025)",
              border:`1px solid ${ag?ag.color+"44":gem.color+"33"}`,borderRadius:12,
              padding:"12px 16px",textAlign:"center",minWidth:100,
              boxShadow:`0 0 20px ${ag?ag.glow:gem.glow}15`}}>
              {ag&&<div style={{display:"flex",justifyContent:"center",marginBottom:6}}><GemShape gem={ag} size={18} energized/></div>}
              <p style={{fontFamily:"Noto Sans KR,sans-serif",color:ag?ag.color:gem.color,fontSize:9,letterSpacing:".18em",marginBottom:5}}>{topic.spread.positions[i]}</p>
              <p style={{fontFamily:"Noto Serif KR,serif",color:"#C8B890",fontSize:11,fontWeight:300,lineHeight:1.4}}>{CARD_KR[c]||c}</p>
            </div>
          );
        })}
      </div>

      {/* Payment gate */}
      {!paid && (
        <div className="fu" style={{maxWidth:420,width:"100%",
          background:"rgba(0,0,0,.52)",backdropFilter:"blur(14px)",
          border:`1px solid ${gem.color}30`,borderRadius:18,
          padding:"clamp(22px,4vw,38px)",
          boxShadow:`0 0 50px ${gem.glow}12,inset 0 1px 0 rgba(255,255,255,.04)`,
          marginBottom:36,textAlign:"center",animationDelay:".2s"}}>
          {/* stonetaro 이미지 */}
          <div style={{width:110,height:110,margin:"0 auto 20px",borderRadius:16,overflow:"hidden",
            border:`1px solid ${gem.color}44`,boxShadow:`0 0 24px ${gem.glow}30`}}>
            <img src="/fuctionassets/stonetaro.webp" alt="크리스탈 소울 타로"
              style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:14}}><GemShape gem={gem} size={44} energized/></div>
          <p style={{fontFamily:"Noto Serif KR,serif",color:"#D4C5A9",fontSize:16,fontWeight:300,marginBottom:8,lineHeight:1.7}}>
            {gem.name}의 기운으로<br/>리딩을 시작합니다
          </p>
          <p style={{fontFamily:"Noto Sans KR,sans-serif",color:"#6A5E4A",fontSize:12,marginBottom:24,lineHeight:1.7}}>
            리딩 결과 열람 시 <span style={{color:gem.color,fontWeight:500}}>{CRYSTAL_COST}코인</span>이 차감됩니다
          </p>
          {payError&&(
            <p style={{fontFamily:"Noto Sans KR,sans-serif",color:"#E07070",fontSize:12,marginBottom:14}}>{payError}</p>
          )}
          <button
            onClick={handlePay}
            disabled={paying}
            style={{
              fontFamily:"Noto Serif KR,serif",
              color:paying?"#6A5E4A":gem.color,
              fontSize:14,fontWeight:300,letterSpacing:".18em",
              background:paying?`rgba(255,255,255,.04)`:`${gem.color}12`,
              border:`1px solid ${paying?"rgba(255,255,255,.08)":gem.color+"60"}`,
              borderRadius:28,padding:"13px 38px",
              cursor:paying?"not-allowed":"pointer",
              boxShadow:paying?"none":`0 0 24px ${gem.glow}22`,
              transition:"all .3s",
            }}>
            {paying ? "처리 중..." : `✦ 리딩 열람하기 (${CRYSTAL_COST}코인)`}
          </button>
        </div>
      )}

      {/* Reading box */}
      {paid && (
        <div className="fu" style={{maxWidth:660,width:"100%",
          background:"rgba(0,0,0,.52)",backdropFilter:"blur(14px)",
          border:`1px solid ${gem.color}28`,borderRadius:18,
          padding:"clamp(22px,4vw,38px)",
          boxShadow:`0 0 50px ${gem.glow}12,inset 0 1px 0 rgba(255,255,255,.04)`,
          marginBottom:36,animationDelay:".2s"}}>
          {loading&&!reading&&!error&&(
            <div style={{textAlign:"center",padding:"32px 0"}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:18}}><GemShape gem={gem} size={50} energized/></div>
              <p style={{fontFamily:"Noto Serif KR,serif",color:"#8B7A6A",fontSize:14,fontWeight:300,animation:"glowPulse 1.6s ease-in-out infinite"}}>
                원석의 기운을 읽는 중...
              </p>
            </div>
          )}
          {error&&(
            <div style={{textAlign:"center",padding:"28px 0"}}>
              <p style={{fontFamily:"Noto Serif KR,serif",color:"#A08060",fontSize:14,marginBottom:16}}>연결에 오류가 생겼어요.</p>
              <button onClick={handleRetry} style={{
                fontFamily:"Noto Sans KR,sans-serif",color:gem.color,fontSize:13,
                background:"transparent",border:`1px solid ${gem.color}50`,borderRadius:20,padding:"8px 24px",cursor:"pointer"}}>
                다시 시도
              </button>
            </div>
          )}
          {reading&&(
            <p style={{fontFamily:"Noto Serif KR,serif",color:"#C8BAA0",fontSize:"clamp(13px,2.2vw,15px)",
              fontWeight:300,lineHeight:2.05,whiteSpace:"pre-wrap"}}>
              {reading}
              {loading&&<span style={{color:gem.color,animation:"cursorPulse .7s ease-in-out infinite"}}>▊</span>}
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
        <button onClick={onReset} style={{
          fontFamily:"Noto Sans KR,sans-serif",color:"#7A6A50",fontSize:13,
          background:"transparent",border:"1px solid rgba(255,255,255,.08)",
          borderRadius:24,padding:"10px 30px",cursor:"pointer",letterSpacing:".18em",transition:"all .3s"}}
          onMouseEnter={e=>{e.target.style.color="#C8B890";e.target.style.borderColor="rgba(255,255,255,.18)";}}
          onMouseLeave={e=>{e.target.style.color="#7A6A50";e.target.style.borderColor="rgba(255,255,255,.08)";}}>
          ✦ 처음으로
        </button>
        {paid && !loading && (
          <button onClick={()=>{doFetch();}} style={{
            fontFamily:"Noto Sans KR,sans-serif",color:gem.color,fontSize:13,
            background:"transparent",border:`1px solid ${gem.color}44`,
            borderRadius:24,padding:"10px 30px",cursor:"pointer",letterSpacing:".18em",transition:"all .3s"}}
            onMouseEnter={e=>{e.target.style.background=`${gem.color}12`;}}
            onMouseLeave={e=>{e.target.style.background="transparent";}}>
            ↻ 다시 리딩
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
export default function CrystalSoulTarot() {
  const [phase, setPhase]     = useState(1); // 1=topic 2=gem 3=energy 4=spread 5=reading
  const [topic, setTopic]     = useState(null);
  const [gem, setGem]         = useState(null);
  const [readingData, setReadingData] = useState(null); // {cards, assignments}

  const [spreadCards] = useState(()=>[...TAROT_CARDS].sort(()=>Math.random()-.5));

  const reset = () => { setPhase(1); setTopic(null); setGem(null); setReadingData(null); };

  return (
    <div style={{minHeight:"100vh",
      background:"radial-gradient(ellipse 130% 80% at 50% -5%,#110e20 0%,#080713 42%,#030305 100%)",
      position:"relative",overflowX:"hidden"}}>
      <style>{CSS}</style>
      <StarField/>
      {/* Noise texture */}
      <div style={{position:"fixed",inset:0,
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)'/%3E%3C/svg%3E")`,
        opacity:.035,pointerEvents:"none",zIndex:1}}/>
      <div style={{position:"relative",zIndex:2}}>
        {phase===1 && <TopicPhase onSelect={t=>{setTopic(t);setPhase(2);}}/>}
        {phase===2 && <GemPhase topic={topic} onSelect={g=>{setGem(g);setPhase(3);}}/>}
        {phase===3 && <EnergyPhase gem={gem} onComplete={()=>setPhase(4)}/>}
        {phase===4 && (
          <SpreadPhase topic={topic} gem={gem} spreadCards={spreadCards}
            onComplete={(cards,assignments)=>{setReadingData({cards,assignments});setPhase(5);}}/>
        )}
        {phase===5 && readingData && (
          <ReadingPhase topic={topic} gem={gem}
            cards={readingData.cards} assignments={readingData.assignments}
            spreadCards={spreadCards} onReset={reset}/>
        )}
      </div>
      <Candle/>
    </div>
  );
}
