import re

file_path = r"c:\Users\Neo\Desktop\Code Destiny Main\emoi_omikuji_v2.html"

with open(file_path, "r", encoding="utf-8") as f:
    html = f.read()

# 1. Add Kakao SDK
kakao_script = """<script src="https://developers.kakao.com/sdk/js/kakao.min.js"></script>
<script>
  document.addEventListener("DOMContentLoaded", function() {
    if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
      Kakao.init('c95c7a1e6d68c1f91fae2649547b0cf1');
    }
  });
</script>
</head>"""
html = html.replace("</head>", kakao_script)

# 2. Add Kakao button
kakao_btn = """      <!-- ACTIONS -->
      <div class="action-row">
        <button class="btn-share" onclick="shareKakao()" style="background:#FEE500;color:#191919;border-color:#FEE500;margin-bottom:8px;">💬 카카오톡 공유하기</button>
        <button class="btn-share" onclick="shareCard()">📸 인스타 스토리용 캡션 복사</button>"""
html = html.replace("""      <!-- ACTIONS -->
      <div class="action-row">
        <button class="btn-share" onclick="shareCard()">📸 인스타 스토리용 캡션 복사</button>""", kakao_btn)

# 3. Replace generate()
generate_code = """async function generate(){
  if(!st.mood||!st.need){document.getElementById('form-err').style.display='block';return;}
  st.energy=parseInt(document.getElementById('energy-slider').value);
  st.text=document.getElementById('user-text').value.trim();
  st.rerollCount=0;

  setScreen('s-loading');
  const msgs=["이모이가 오늘의 마음 신호를 읽는 중","에너지 패턴 분석 중","오늘의 운세 직조 중","감성 카드 생성 중"];
  let mi=0;
  const iv=setInterval(()=>{
    document.getElementById('loading-txt').textContent=msgs[mi%msgs.length]+'...';
    mi++;
    const pf=document.getElementById('prog-fill');
    const cur=parseInt(pf.style.width)||0;
    pf.style.width=Math.min(cur+22,90)+'%';
  },500);

  // 로컬 계산만 수행 (AI API 제거)
  await new Promise(r=>setTimeout(r,1800)); // 로딩 효과
  clearInterval(iv);
  document.getElementById('prog-fill').style.width='100%';
  
  const localResult=computeResult(0);
  st.currentResult=localResult;
  await new Promise(r=>setTimeout(r,300));
  showResult(localResult);
  setScreen('s-result');
}"""
html = re.sub(r'async function generate\(\)\{.*?(?=function reroll\(\))', generate_code + '\n\n', html, flags=re.DOTALL)

# 4. Replace shareCard() and add shareKakao()
share_code = """function shareCard() {
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
}

function shareKakao() {
  const r=st.currentResult;
  if(!r) return;
  const k = r.kaomoji || r.computedKaomoji;
  if(typeof Kakao === 'undefined' || !Kakao.isInitialized()){
    alert('카카오톡 공유 기능을 불러오지 못했습니다.');
    return;
  }
  Kakao.Share.sendDefault({
    objectType: 'text',
    text: `[이모이 오미쿠지 - ${r.category}]\\n\\n${k}\\n\\n${r.title}\\n"${r.short}"\\n\\n오늘의 미션: ${r.mission}\\n행운 액션: ${r.luckyAction || '-'}`,
    link: {
      mobileWebUrl: 'https://codedestiny.co.kr/emoi_omikuji_v2.html',
      webUrl: 'https://codedestiny.co.kr/emoi_omikuji_v2.html',
    },
    buttonTitle: '내 감성 오미쿠지 뽑기'
  });
}
"""
html = re.sub(r'function shareCard\(\).*?(?=document\.getElementById\(\'energy-slider\'\))', share_code + '\n', html, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(html)
print("Updated local logic and Kakao share.")
