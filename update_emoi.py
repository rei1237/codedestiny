import re
import json

file_path = r"c:\Users\Neo\Desktop\Code Destiny Main\emoi_omikuji_v2.html"

with open(file_path, "r", encoding="utf-8") as f:
    html = f.read()

# 1. Update intro text
html = html.replace("대길과 대흉 대신,<br>오늘의 마음에 필요한 한 문장을 뽑아보세요.", "대길과 대흉 대신,<br>오늘의 마음과 궁금한 주제에 필요한 한 문장을 뽑아보세요.")

# 2. Add Form UI for category
category_html = """
    <!-- 0. 카테고리 -->
    <div class="field-group">
      <div class="field-title"><span class="ft-num">0</span>오늘 무엇이 가장 궁금한가요?</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px;">돈, 사랑, 관계, 일, 선택… 오늘 가장 신경 쓰이는 주제를 하나 골라보세요.</div>
      <div class="chip-grid" id="category-grid" style="grid-template-columns:repeat(auto-fit, minmax(70px, 1fr));">
        <div class="chip sel-cat" data-v="전체운" onclick="selCategory(this)">✨ 전체운</div>
        <div class="chip" data-v="재물운" onclick="selCategory(this)">💰 재물운</div>
        <div class="chip" data-v="연애운" onclick="selCategory(this)">💗 연애운</div>
        <div class="chip" data-v="인간관계운" onclick="selCategory(this)">🫧 인간관계운</div>
        <div class="chip" data-v="직장/학업운" onclick="selCategory(this)" style="font-size:10px;">📚 직장/학업운</div>
        <div class="chip" data-v="선택운" onclick="selCategory(this)">🧭 선택운</div>
        <div class="chip" data-v="마음회복운" onclick="selCategory(this)">🌙 마음회복운</div>
        <div class="chip" data-v="행운아이템운" onclick="selCategory(this)" style="font-size:10px;">🍀 행운아이템운</div>
      </div>
    </div>
"""
html = html.replace("<!-- 1. 마음 상태 -->", category_html + "\n    <!-- 1. 마음 상태 -->")

# 3. CSS for kaomoji and category chip
css_to_add = """
.chip.sel-cat{background:#FFFBE6;border-color:#E2C541;color:#856B0E;font-weight:700;}
.kaomoji-box {
  background: linear-gradient(135deg, rgba(247,197,213,.22), rgba(184,232,220,.18));
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  margin-bottom: 12px;
}
.kaomoji-main {
  font-family: var(--font-pixel), monospace;
  font-size: 24px;
  color: var(--navy);
  letter-spacing: 1px;
  line-height: 1.4;
  word-break: keep-all;
  overflow-wrap: break-word;
}
.kaomoji-label {
  margin-top: 6px;
  font-size: 11px;
  color: var(--muted);
}
.cat-badge {
  display: inline-block;
  background: white;
  border: 1.5px solid var(--navy);
  border-radius: 20px;
  padding: 3px 10px;
  font-family: var(--font-round);
  font-size: 11px;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 8px;
}
.point-box {
  background: #FDFDFD;
  border-left: 3px solid var(--navy);
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: 0 8px 8px 0;
  font-size: 12px;
  line-height: 1.6;
}
.point-title {
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 4px;
}
.point-desc {
  color: #3A3050;
}
"""
html = html.replace("</style>", css_to_add + "\n</style>")

# 4. Result UI updates
result_ui_updates = """
              <div class="cat-badge" id="r-cat-badge">✨ 전체운</div>
              <div class="result-label">오늘의 감성 운세</div>
              <div class="result-title" id="r-title">—</div>
              <div class="result-short" id="r-short">—</div>
            </div>
          </div>
          
          <div class="kaomoji-box" id="r-kaomoji-box">
            <div class="kaomoji-main" id="r-kaomoji-main">(´｡• ᵕ •｡`) ♡</div>
            <div class="kaomoji-label" id="r-kaomoji-label">마음 신호</div>
          </div>

          <div class="point-box" id="r-cat-msg-box" style="display:none;">
            <div class="point-title" id="r-cat-msg-title">카테고리 포인트</div>
            <div class="point-desc" id="r-cat-msg">—</div>
          </div>
          <div class="point-box" id="r-curious-box" style="display:none; border-left-color: var(--pink);">
            <div class="point-title">원초적 호기심 포인트</div>
            <div class="point-desc" id="r-curious">—</div>
          </div>
"""
html = html.replace("""<div class="result-label">오늘의 감성 운세</div>
              <div class="result-title" id="r-title">—</div>
              <div class="result-short" id="r-short">—</div>
            </div>
          </div>""", result_ui_updates)

# Add luckyAction to lucky row
lucky_html = """
            <div class="mini-card full">
              <div class="mc-icon">🍀</div>
              <div class="mc-label">행운 액션</div>
              <div class="mc-val" id="r-laction">—</div>
            </div>
"""
html = html.replace("""<div class="mini-card full">
              <div class="mc-icon">✨</div>
              <div class="mc-label">오늘 나에게 허락</div>
              <div class="mc-val" id="r-perm">—</div>
            </div>""", """<div class="mini-card">
              <div class="mc-icon">✨</div>
              <div class="mc-label">오늘 나에게 허락</div>
              <div class="mc-val" id="r-perm">—</div>
            </div>""" + lucky_html)

# 5. JS updates
js_code_to_add = """
const KAOMOJI_POOLS = {
  "전체운": ["(*´꒳`*)", "｡ﾟ(ﾟ´ω`ﾟ)ﾟ｡", "( ˘͈ ᵕ ˘͈♡)", "✧٩(ˊωˋ*)و✧", "(｡•̀ᴗ-)✧"],
  "재물운": ["(｡•̀ᴗ-)✧₩", "₍₍ ◝(・ω・)◟ ⁾⁾", "(*ฅ́˘ฅ̀*)♡", "(ง •̀_•́)ง💰", "ฅ^•ﻌ•^ฅ"],
  "연애운": ["♡(｡- ω -｡)", "(灬º‿º灬)♡", "(〃ω〃)", "(つ≧▽≦)つ♡", "(*ﾉωﾉ)"],
  "인간관계운": ["(｡•́︿•̀｡)", "( ´･ω･)ﾉ(._.`)", "ヽ(・∀・)ﾉ", "(ง'̀-'́)ง", "(｡･ω･｡)ﾉ♡"],
  "직장/학업운": ["(ง •̀_•́)ง", "φ(._.)", "(｀・ω・´)", "٩(｡•́‿•̀｡)۶", "＿φ( °-°)/"],
  "선택운": ["(・・?)", "(。ヘ°)", "ʕ•́ᴥ•̀ʔっ", "(｡•́︿•̀｡)", "(๑•̀ㅂ•́)و✧"],
  "마음회복운": ["( ˘͈ ᵕ ˘͈ )", "(´｡• ᵕ •｡`) ♡", "(っ˘̩╭╮˘̩)っ", "(-‿◦☀)", "(｡･ω･｡)ﾉ♡"],
  "행운아이템운": ["✧*｡٩(ˊᗜˋ*)و✧*｡", "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧", "☆*:.｡.o(≧▽≦)o.｡.:*☆", "(๑˃ᴗ˂)ﻭ", "◝(⁰▿⁰)◜✧"]
};

function selCategory(el) {
  document.querySelectorAll('#category-grid .chip').forEach(c=>c.classList.remove('sel-cat'));
  el.classList.add('sel-cat');
  st.category = el.dataset.v;
}
"""

html = html.replace("const MOOD_MAP", js_code_to_add + "\nconst MOOD_MAP")

# Expand st initialization
html = html.replace('let st={mood:"",energy:50,need:"",text:"",currentResult:null,rerollCount:0};', 'let st={mood:"",energy:50,need:"",category:"전체운",text:"",currentResult:null,rerollCount:0};')
html = html.replace('st={mood:"",energy:50,need:"",text:"",currentResult:null,rerollCount:0};', 'st={mood:"",energy:50,need:"",category:"전체운",text:"",currentResult:null,rerollCount:0};\n  document.querySelectorAll("#category-grid .chip").forEach(c=>c.classList.remove("sel-cat"));\n  const defChip = document.querySelector("#category-grid .chip");\n  if (defChip) defChip.classList.add("sel-cat");')

# Update computeResult
compute_result_code = """
function computeResult(reroll=0){
  const seed=hashStr((st.category||"전체운")+(st.mood||"x")+(st.need||"x")+getToday()+"emoi"+reroll);
  const rng=(n)=>((seed*2654435761+n*1234567)>>>0)/(2**32);

  const moodTone=MOOD_MAP[st.mood]||"t";
  const weights=RESULTS.map((r,i)=>{
    let w=1;
    if(r.categories && r.categories.includes(st.category)) w+=4;
    if(r.cats.includes(st.mood)) w+=2.5;
    if(r.needs.includes(st.need)) w+=2;

    if(st.category === "재물운" && ["정리", "집중", "자신감"].includes(st.need)) w += 1.5;
    if(st.category === "연애운" && ["사랑", "위로", "용기"].includes(st.need)) w += 1.5;
    if(st.category === "인간관계운" && ["정리", "위로", "놓아주기"].includes(st.need)) w += 1.5;
    if(st.category === "직장/학업운" && ["집중", "자신감", "용기"].includes(st.need)) w += 1.5;
    if(st.category === "마음회복운" && ["휴식", "위로", "놓아주기"].includes(st.need)) w += 1.5;

    if(st.energy<30 && ["휴식", "위로", "놓아주기"].includes(st.need)) w+=1.2;
    if(st.energy>70 && ["용기", "자신감", "집중"].includes(st.need)) w+=1.2;

    return w+rng(i)*0.6;
  });
  const total=weights.reduce((a,b)=>a+b,0);
  let pick=rng(seed%100)*total,idx=0;
  for(let i=0;i<weights.length;i++){pick-=weights[i];if(pick<=0){idx=i;break;}}
  
  const pool = KAOMOJI_POOLS[st.category] || KAOMOJI_POOLS["전체운"];
  const k_idx = Math.abs(seed + reroll * 17) % pool.length;
  const kaomoji = pool[k_idx];
  
  return {...RESULTS[idx], computedKaomoji: kaomoji, category: st.category};
}
"""

html = re.sub(r'function computeResult.*?return \{\.\.\.RESULTS\[idx\]\};\s*\}', compute_result_code, html, flags=re.DOTALL)

# Update showResult
show_result_updates = """
  document.getElementById('r-date').textContent=getToday();
  document.getElementById('r-cat-badge').textContent=r.category;
  
  document.getElementById('r-kaomoji-main').textContent=r.kaomoji || r.computedKaomoji;
  document.getElementById('r-kaomoji-label').textContent=r.kaomojiLabel || '오늘의 이모티콘 신호';
  
  if(r.categoryMessage) {
    document.getElementById('r-cat-msg-box').style.display='block';
    document.getElementById('r-cat-msg-title').textContent = r.category + ' 포인트';
    document.getElementById('r-cat-msg').textContent=r.categoryMessage;
  } else {
    document.getElementById('r-cat-msg-box').style.display='none';
  }
  
  if(r.curiosityPoint) {
    document.getElementById('r-curious-box').style.display='block';
    document.getElementById('r-curious').textContent=r.curiosityPoint;
  } else {
    document.getElementById('r-curious-box').style.display='none';
  }
  
  document.getElementById('r-laction').textContent=r.luckyAction || "의식적으로 3번 깊게 심호흡하기";
"""
html = html.replace("document.getElementById('r-date').textContent=getToday();", show_result_updates)

# Update shareCard
share_card_body = """
  const r=st.currentResult;
  if(!r) return;
  const k = r.kaomoji || r.computedKaomoji;
  const tagCat = (r.category || "").replace("/", "");
  let caption=`🤖 이모이 오미쿠지\\n\\n${k}\\n[${r.category}] ${r.title}\\n\\n"${r.short}"\\n`;
  if(r.curiosityPoint) caption += `\\n호기심 포인트: ${r.curiosityPoint}`;
  caption += `\\n오늘의 미션: ${r.mission}`;
  if(r.luckyAction) caption += `\\n행운 액션: ${r.luckyAction}`;
  caption += `\\n오늘의 허락: ${r.perm}\\n\\n#이모이오미쿠지 #CodeDestiny #오늘의운세 #${tagCat}`;
  
  if(navigator.clipboard){
    navigator.clipboard.writeText(caption).then(()=>alert('캡션이 복사됐어요! 인스타에 붙여넣기 하세요 ✦'));
  } else {
    alert(caption);
  }
"""
html = re.sub(r'function shareCard\(\).*?\}', 'function shareCard() {\n' + share_card_body + '\n}', html, flags=re.DOTALL)

# Update generate LLM sys and usr
new_sys = """const sys=`너는 귀여운 픽셀 로봇 "이모이(Emo-i)"다. 사용자의 현재 마음과 선택한 운세 카테고리를 바탕으로 짧고 감성적인 오미쿠지 메시지를 작성한다. 단정적인 예언, 공포 조장, 질병 진단, 상대방 마음 확정, 큰돈을 번다는 식의 과장된 금전 예언은 금지한다. 결과는 따뜻하고 귀엽고, 공유하고 싶은 문장이어야 한다. 반드시 JSON만 출력한다.`;"""
new_usr = """const usr=`아래 운세 타입과 사용자 입력을 바탕으로 이모이 오미쿠지 메시지를 한국어로 작성해줘.
카테고리: ${st.category}
마음 상태: ${st.mood}, 에너지: ${st.energy}%, 필요한 것: ${st.need}${st.text?', 한마디: '+st.text:''}
운세 타입: ${localResult.title}
이모티콘: ${localResult.kaomoji || localResult.computedKaomoji}

기본 내용 참고:
- robot: ${localResult.robot}
- mission: ${localResult.mission}
- avoid: ${localResult.avoid}
- perm: ${localResult.perm}

JSON 형식(기본 내용을 개성있게 다듬어줘, longMessage는 200-300자):
{
  "shortMessage": "",
  "longMessage": "",
  "robotLine": "",
  "categoryMessage": "",
  "curiosityPoint": "",
  "todayMission": "",
  "avoidToday": "",
  "permissionToday": "",
  "luckyAction": "",
  "shareCaption": ""
}`;"""

html = re.sub(r'const sys=`.*?`;', new_sys, html, flags=re.DOTALL)
html = re.sub(r'const usr=`.*?`;', new_usr, html, flags=re.DOTALL)

# Parse response with new fields
parse_resp = """
      localResult.short=p.shortMessage||localResult.short;
      localResult.long=p.longMessage||localResult.long;
      localResult.robot=p.robotLine||localResult.robot;
      localResult.mission=p.todayMission||localResult.mission;
      localResult.avoid=p.avoidToday||localResult.avoid;
      localResult.perm=p.permissionToday||localResult.perm;
      localResult.shareCaption=p.shareCaption||'';
      localResult.categoryMessage=p.categoryMessage||localResult.categoryMessage;
      localResult.curiosityPoint=p.curiosityPoint||localResult.curiosityPoint;
      localResult.luckyAction=p.luckyAction||localResult.luckyAction;
"""
html = re.sub(r'localResult\.short=p\.shortMessage.*?localResult\.shareCaption=p\.shareCaption\|\|.*?;', parse_resp, html, flags=re.DOTALL)

# Insert the new examples into RESULTS array
new_items_json = """
{
  id: "money-soft-guard",
  category: "재물운",
  categories: ["재물운", "전체운", "선택운"],
  title: "돈 새는 구멍을 살짝 막는 운세",
  short: "오늘은 큰 행운보다 작은 지출 관리가 더 빛나요.",
  long: "오늘의 재물운은 큰돈이 갑자기 들어오는 흐름이라기보다, 이미 가진 것을 잘 지키는 쪽에 가까워요. 기분이 허전할수록 결제 버튼이 쉽게 눌릴 수 있으니, 장바구니에 담아두고 한 번만 더 생각해보세요. 작은 소비 하나를 멈추는 것이 오늘의 행운일 수 있어요.",
  robot: "삐빅… 오늘의 지갑 방어 모드가 켜졌어요. 외로움으로 결제하지 않기!",
  mission: "결제 전 장바구니를 한 번 비우기",
  avoid: "기분전환용 충동구매",
  perm: "돈을 아낀 나를 칭찬하기",
  item: "작은 동전지갑",
  color: "밀크 골드",
  cdot: "#F5D090",
  temp: 64,
  batt: 52,
  kind: 82,
  kaomoji: "(｡•̀ᴗ-)✧₩",
  kaomojiLabel: "지갑 방어 모드",
  categoryMessage: "오늘의 재물운은 ‘버는 운’보다 ‘새는 돈을 막는 운’에 가까워요.",
  curiosityPoint: "오늘은 충동구매를 막으면 기분까지 가벼워질 수 있어요.",
  luckyAction: "결제 전 10분만 기다리기",
  cats: ["멍함", "지침", "조용히 괜찮음"],
  needs: ["정리", "집중", "자신감"]
},
{
  id: "love-reply-balance",
  category: "연애운",
  categories: ["연애운", "인간관계운", "전체운"],
  title: "답장 하나에 마음을 맡기지 않는 운세",
  short: "오늘은 상대의 반응보다 내 온도를 먼저 지켜요.",
  long: "연애운은 부드럽지만 조금 예민하게 흔들릴 수 있어요. 답장이 늦거나 말투가 애매해도 그것만으로 모든 걸 판단하지 마세요. 오늘은 상대의 마음을 맞히려 하기보다, 내가 어떤 사랑을 받고 싶은지 조용히 확인하는 것이 더 중요해요.",
  robot: "삐빅… 답장 대기 모드 해제! 당신의 매력은 알림 속도와 무관합니다.",
  mission: "상대 답장을 기다리는 동안 나를 위한 일 하나 하기",
  avoid: "답장 시간으로 애정 확인하기",
  perm: "조금 덜 불안해도 된다고 허락하기",
  item: "분홍 하트 스티커",
  color: "피치 핑크",
  cdot: "#F7C5D5",
  temp: 76,
  batt: 48,
  kind: 91,
  kaomoji: "♡(｡- ω -｡)",
  kaomojiLabel: "심장 과열 방지",
  categoryMessage: "오늘의 연애운은 설렘보다 마음의 균형을 잡는 쪽에 가까워요.",
  curiosityPoint: "상대의 반응보다 나의 자존감을 먼저 챙길수록 매력이 살아나요.",
  luckyAction: "답장 기다리는 동안 좋아하는 음악 한 곡 듣기",
  cats: ["설렘", "외로움", "불안정함"],
  needs: ["사랑", "위로", "용기"]
},
{
  id: "relation-soft-boundary",
  category: "인간관계운",
  categories: ["인간관계운", "마음회복운", "직장/학업운", "전체운"],
  title: "다정하지만 선명한 거리감이 필요한 운세",
  short: "오늘은 모두에게 맞추기보다 내 마음의 간격을 지켜요.",
  long: "인간관계운은 나쁘지 않지만, 작은 말이나 부탁에 쉽게 피로해질 수 있어요. 친절한 사람이 되는 것도 좋지만, 오늘은 나를 지키는 친절이 먼저예요. 무리한 약속이나 애매한 부탁에는 부드럽게 선을 그어도 괜찮습니다.",
  robot: "삐빅… 오늘의 관계 거리 1.5칸 유지! 너무 가까우면 배터리가 닳아요.",
  mission: "무리한 부탁 하나를 정중하게 미루기",
  avoid: "괜찮지 않은데 괜찮다고 말하기",
  perm: "모두에게 좋은 사람이 아니어도 된다고 허락하기",
  item: "투명한 유리컵",
  color: "스카이 민트",
  cdot: "#B8E8DC",
  temp: 61,
  batt: 44,
  kind: 89,
  kaomoji: "( ´･ω･)ﾉ(._.`)",
  kaomojiLabel: "거리감 조율 중",
  categoryMessage: "오늘의 인간관계운은 ‘많이 만나기’보다 ‘적당히 지키기’에 가까워요.",
  curiosityPoint: "나를 덜 소모시키는 관계가 오늘의 행운이에요.",
  luckyAction: "답하기 어려운 메시지는 잠시 보류하기",
  cats: ["예민함", "지침", "불안정함"],
  needs: ["정리", "위로", "놓아주기"]
},
"""
html = html.replace("const RESULTS=[", "const RESULTS=[\n" + new_items_json)

# Save
with open(file_path, "w", encoding="utf-8") as f:
    f.write(html)
print("File updated successfully.")
