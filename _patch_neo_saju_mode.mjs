import { readFileSync, writeFileSync } from 'fs';

const B = String.raw`c:\Users\Neo\Desktop\Code Destiny Main`;
const SAJU    = B + String.raw`\js\saju-engine.js`;
const SAJU_P  = B + String.raw`\public\js\saju-engine.js`;
const SHARE   = B + String.raw`\js\share.js`;
const SHARE_P = B + String.raw`\public\js\share.js`;
const CSS     = B + String.raw`\styles\fortune-ui.css`;
const CSS_P   = B + String.raw`\public\styles\fortune-ui.css`;

// ─── 1. CSS: neo-mode 텍스트 가시성 개선 ─────────────────────────────────────
for (const f of [CSS, CSS_P]) {
  let c = readFileSync(f, 'utf8');
  c = c.replace(
    'body.neo-mode .prem-text{color:#999!important}',
    'body.neo-mode .prem-text{color:#dce8ff!important}'
  );
  // 하위 인라인 색상 kv/subHead 텍스트도 neo 모드에서 밝게
  if (!c.includes('body.neo-mode .prem-text b{color:#FFD700')) {
    c = c.replace(
      'body.neo-mode .prem-text{color:#dce8ff!important}',
      'body.neo-mode .prem-text{color:#dce8ff!important}\nbody.neo-mode .prem-text b{color:#FFD700!important}\nbody.neo-mode .prem-text span{color:#c8d8f8!important}'
    );
  }
  writeFileSync(f, c, 'utf8');
  console.log('[CSS] patched:', f);
}

// ─── 2. share.js: 수습 → 특징 ────────────────────────────────────────────────
for (const f of [SHARE, SHARE_P]) {
  let c = readFileSync(f, 'utf8');
  c = c.replace(
    "'종합 사주 풀이':'팩트 보고서 — 사주로 보는 당신의 수습'",
    "'종합 사주 풀이':'팩트 보고서 — 사주로 보는 당신의 특징'"
  );
  writeFileSync(f, c, 'utf8');
  console.log('[share.js] patched:', f);
}

// ─── 3. saju-engine.js 종합 패치 ─────────────────────────────────────────────
for (const f of [SAJU, SAJU_P]) {
  let c = readFileSync(f, 'utf8');

  // 3-A. sbxToggle 전역 헬퍼 함수 추가 (renderSummary 바로 앞)
  if (!c.includes('function sbxToggle(')) {
    c = c.replace(
      'function renderSummary(p,johu,natal){',
`/* ─── 사주 요약 박스 접기/펼치기 헬퍼 ─── */
function sbxToggle(id,btn){
  var el=document.getElementById(id);
  if(!el||!btn)return;
  var hidden=el.style.display==='none';
  el.style.display=hidden?'':'none';
  btn.textContent=hidden?'접기 ▲':'펼치기 ▼';
}

function renderSummary(p,johu,natal){`
    );
  }

  // 3-B. box() 함수 → 접기 버튼 포함 (카운터 + sbxToggle 활용)
  c = c.replace(
    `  function box(title,body,accent,bg){
    var bc=accent||'#bba371';var bkg=bg||'rgba(255,255,255,.85)';
    return '<div class="prem-box" style="background:'+bkg+';border-left:4px solid '+bc+'">'+
           '<span class="prem-title" style="border-color:'+bc+'">'+title+'</span>'+
           '<div class="prem-text">'+body+'</div></div>';
  }`,
    `  var _bxCtr=0;
  function box(title,body,accent,bg){
    var bc=accent||'#bba371';var bkg=bg||'rgba(255,255,255,.85)';
    var id='sbx'+(++_bxCtr);
    return '<div class="prem-box" style="background:'+bkg+';border-left:4px solid '+bc+'">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:10px">'+
      '<span class="prem-title" style="border-color:'+bc+';margin-bottom:0;flex:1">'+title+'</span>'+
      '<button type="button" onclick="sbxToggle(\''+id+'\',this)" style="flex-shrink:0;background:none;border:1px solid rgba(150,150,150,.4);border-radius:4px;padding:2px 8px;font-size:.7rem;cursor:pointer;color:inherit;opacity:.7;white-space:nowrap;line-height:1.5">접기 ▲</button>'+
      '</div>'+
      '<div id="'+id+'" class="prem-text">'+body+'</div></div>';
  }`
  );

  // 3-C. 성격·기질 박스 확장 (500자+)
  const OLD_CHARBOX = `  html+=box('🦁 ⑥ 성격·기질 심층 분석 (팩트 보고서)',
    subHead('핵심 성향','#c2185b')+
    '<div style="font-size:.85rem;line-height:1.85;margin-top:6px">'+
    (personalityByGan[dg]||deep.nature)+'<br><br>'+
    deep.nature+'</div>'+
    '<br>'+subHead('보완이 필요한 부분','#d32f2f')+
    '<div style="font-size:.84rem;line-height:1.78;color:#b71c1c;margin-top:4px">'+
    (ganWeakPoint[dg]||'균형을 항상 체크하세요')+'</div>',
    '#e91e63','rgba(253,232,241,.7)');`;

  const NEW_CHARBOX = `  var charBoxDetail={
    甲:'갑목(甲木)은 하늘을 향해 뻗는 거대한 나무입니다. 일단 목표가 정해지면 흔들리지 않고 전진하는 강력한 의지가 있습니다. 주변의 방해나 비판에도 굴하지 않는 추진력은 큰 프로젝트를 완수하는 데 최적화된 기질입니다. 하지만 이 강인함이 고집과 독선으로 흐르면 팀워크가 무너지고 갈등이 잦아집니다. 의견 충돌 시 자신이 반드시 옳아야 한다는 강박을 내려놓는 것이 가장 중요한 성장 포인트입니다. 또한 독립심이 지나쳐 도움 요청을 스스로 차단하는 경향이 있는데, 진짜 강한 사람은 협력할 줄 아는 사람임을 기억하세요. 경쟁 상황에서 진가가 나타나며, 안정된 환경에만 있으면 오히려 능력이 둔화됩니다.',
    乙:'을목(乙木)은 환경에 따라 유연하게 흔들리면서도 결코 끊어지지 않는 덩굴 식물입니다. 뛰어난 공감 능력과 적응력으로 어떤 조직에서도 부드럽게 스며들어 핵심 역할을 합니다. 정면 돌파보다 우회 전략을 선호하고, 이는 때로 소극적이거나 우유부단하다는 오해를 사기도 합니다. 결정의 순간에 타인의 눈치를 너무 많이 보면 기회를 놓칩니다. 자신의 판단을 믿는 연습이 필요합니다. 인간관계에서는 상대방을 편하게 만드는 재주가 탁월하며, 그로 인해 감정 에너지를 지나치게 소모하는 경향이 있습니다. 자신만의 경계를 세우는 것이 지속 가능한 삶의 핵심입니다.',
    丙:'병화(丙火)는 뜨거운 태양입니다. 에너지가 넘치고 주변을 환하게 밝히는 존재감으로 어디서든 중심이 됩니다. 솔직하고 직접적인 표현 방식 덕에 인기를 얻지만, 동시에 감정 기복이 크고 충동적 결정을 내리기 쉽습니다. 시작은 화끈하지만 지속력이 부족한 것이 가장 큰 약점입니다. 에너지를 한 곳에 오래 집중하는 훈련이 필요합니다. 쉽게 흥미를 잃고 새로운 자극을 찾아다니는 성향 때문에 결실을 보기 직전에 포기하는 패턴이 반복될 수 있습니다. 태양도 밤이 있어야 쉬듯, 자신을 돌보고 재충전하는 시간이 반드시 필요합니다.',
    丁:'정화(丁火)는 은은하게 타오르는 촛불입니다. 겉으로는 조용하지만 내면에는 뜨거운 열정과 섬세한 감수성이 있습니다. 한 번 신뢰를 쌓은 관계에서는 놀라운 충성심과 배려를 보입니다. 상처를 받으면 오랫동안 잊지 못하고, 갈등을 피하기 위해 감정을 억누르다 일정 수준에서 폭발하는 패턴이 있습니다. 감정을 억누르지 말고 적절히 표현하는 연습이 필요합니다. 타인의 평가에 지나치게 예민해 자기비판이 심해질 수 있으며, 이는 스트레스와 번아웃으로 이어집니다. 자신의 가치를 타인의 평가가 아닌 내면의 기준으로 판단하는 습관이 중요합니다.',
    戊:'무토(戊土)는 드넓은 대산(大山)과 같습니다. 그 어떤 것도 받아들이는 포용력과 흔들리지 않는 안정감이 이 사주의 가장 큰 자산입니다. 약속과 책임을 무엇보다 중시하며, 신뢰할 수 있는 사람으로 알려져 있습니다. 그러나 변화에 저항하는 경향이 강하고, 새로운 환경에 적응하는 속도가 느립니다. 기회의 시간이 왔을 때 망설이다 놓치는 경우가 많습니다. 일단 행동하면 멈추지 않는 끈기가 있으니, 행동을 시작하는 타이밍을 앞당기는 것이 성공의 열쇠입니다. 변화를 두려워하지 말고, 의도적으로 새로운 경험을 정기적으로 시도하세요.',
    己:'기토(己土)는 비옥한 밭입니다. 세밀하고 실용적인 눈으로 주변 사람의 필요를 파악하고 뒤에서 든든하게 지원합니다. 자신의 공로를 드러내지 않아 저평가받는 경우가 많지만, 조직의 실질적인 중심 역할을 합니다. 남을 너무 챙기다 정작 자기 자신을 잃어버리는 것이 가장 큰 위험입니다. 자기 과소평가와 과도한 희생이 패턴화되면 번아웃이 옵니다. 당신이 먼저 행복하고 건강해야 남을 제대로 도울 수 있습니다. 결단력이 부족한 면이 있으니, 중요한 결정의 데드라인을 스스로 설정하는 습관을 들이세요.',
    庚:'경금(庚金)은 날 선 큰 쇠입니다. 직선적이고 결단력이 강하며, 불합리한 상황을 보면 참지 못하고 직접 해결에 나섭니다. 이 솔직함이 신뢰를 쌓는 힘이 되지만, 동시에 인간관계를 어렵게 만드는 요인이 됩니다. 너무 날이 서면 주변 사람이 상처를 받습니다. 감정을 전달하는 방식에 부드러움을 더하는 것이 관계 개선의 핵심입니다. 의리와 책임감이 강해 위기 순간에 진가를 발휘하며, 냉정한 판단력으로 복잡한 문제를 단순화합니다. 다만 완고함이 문제 해결을 방해할 때는 전략적으로 유연성을 발휘하세요.',
    辛:'신금(辛金)은 정제된 보석입니다. 예리하고 미적 감각이 뛰어나며, 완벽주의 성향으로 자신과 타인 모두에게 높은 기준을 적용합니다. 이 섬세함이 창의적 결과물의 품질을 높이지만, 스스로를 끊임없이 옥죄는 스트레스 원인이 됩니다. 70%의 완성도에서도 세상에 내보이는 용기가 필요합니다. 표면적으로는 차가워 보이지만 속으로는 매우 감성적이라, 신뢰하는 사람에게는 깊은 유대감을 형성합니다. 비판에 과민 반응하는 경향이 있으니, 피드백을 성장의 데이터로 받아들이는 연습을 하세요. 자신의 기준을 낮추는 것이 아니라 타인의 다름을 인정하는 것이 성숙의 과정입니다.',
    壬:'임수(壬水)는 거대한 강물입니다. 막히면 돌아가는 유연함과 결코 멈추지 않는 끈질김을 동시에 갖추고 있습니다. 시야가 넓고 전략적 사고가 탁월하며, 여러 분야를 동시에 처리하는 능력이 있습니다. 그러나 이 광활함이 에너지를 분산시켜 깊이가 없어지는 문제를 낳습니다. 한 가지에 집중하는 시간을 의도적으로 만들어야 합니다. 감정을 잘 드러내지 않아 주변에서 속을 알기 어렵다는 말을 듣지만, 내면은 깊고 섬세합니다. 주변의 기대에 너무 맞추다 자신의 방향을 잃지 않도록 주의해야 합니다.',
    癸:'계수(癸水)는 맑은 이슬입니다. 공감 능력이 탁월하고 다른 사람의 감정을 빠르게 포착하여 섬세하게 반응합니다. 일대일 관계에서 깊고 따뜻한 교감을 나누며, 신뢰하는 사람에게는 전폭적인 지지를 합니다. 우유부단함과 지나친 내성이 가장 큰 약점으로, 결정을 미루다 기회를 놓치는 경우가 많습니다. 자신의 직관을 믿고 행동하는 용기가 필요합니다. 작은 물방울처럼 지속적으로 채워나가는 힘이 있으니, 당장의 결과보다 꾸준함이 인생의 가장 큰 무기임을 기억하세요. 감상 과다로 현실 행동이 지연되지 않도록, 생각 다음엔 반드시 한 걸음의 실천을 붙이세요.'
  };

  html+=box('🦁 ⑥ 성격·기질 심층 분석 (팩트 보고서)',
    subHead('핵심 성향','#c2185b')+
    '<div style="font-size:.85rem;line-height:1.85;margin-top:6px">'+
    (personalityByGan[dg]||deep.nature)+'</div>'+
    '<br>'+subHead('심층 기질 분석','#c2185b')+
    '<div style="font-size:.84rem;line-height:1.85;margin-top:4px">'+
    (charBoxDetail[dg]||deep.nature)+'</div>'+
    '<br>'+subHead('보완이 필요한 부분','#d32f2f')+
    '<div style="font-size:.84rem;line-height:1.78;color:#b71c1c;margin-top:4px">'+
    (ganWeakPoint[dg]||'균형을 항상 체크하세요')+
    '<br><br>이 약점은 타고난 한계가 아닙니다. 인식하고 의식적으로 다듬으면 오히려 강점의 다른 면이 됩니다. '+
    '당신의 <b>'+dominant+'</b> 에너지와 함께 위의 보완점을 꾸준히 작업해가면, '+
    '사주가 가진 잠재력의 전부를 끌어낼 수 있습니다.</div>',
    '#e91e63','rgba(253,232,241,.7)');`;

  if (c.includes(OLD_CHARBOX)) {
    c = c.replace(OLD_CHARBOX, NEW_CHARBOX);
    console.log('[saju] 성격·기질 박스 확장됨');
  } else {
    console.warn('[saju] 성격·기질 박스 not found, skipping');
  }

  // 3-D. 사주 총평 박스 내 설명 확장
  const OLD_TOTAL = `    '<br><div style="background:rgba(255,255,255,.6);border-radius:8px;padding:10px;font-size:.85rem;line-height:1.78;color:#333">'+
    '당신은 자연으로 치면 <b>\\''+dayNames[dayMaster]+'\\'>과 같습니다. '+
    '오행 중 <b>'+EL_KO[dayMaster]+'</b> 에너지를 주 기반으로 삼아, 세상을 인식하고 반응합니다. '+
    '이 기운이 지나치게 강하면 집착·고집·과잉으로, 너무 약하면 자신감 부족·우유부단으로 나타납니다. '+
    '적절한 균형이 삶 전체의 여유를 만듭니다.</div>',`;

  // 먼저 정확한 문자열 확인
  const ALT_TOTAL_1 = `'당신은 자연으로 치면 <b>\\''+dayNames[dayMaster]+'\\'</b>과 같습니다. `;
  const ALT_TOTAL_2 = `당신은 자연으로 치면 <b>\\'`;
  const hasTotal1 = c.includes(`'당신은 자연으로 치면 <b>\\'`);
  const hasTotal2 = c.includes("당신은 자연으로 치면 <b>'");
  console.log('[debug] total 1:', hasTotal1, 'total 2:', hasTotal2);

  // 조후 박스 확장
  const OLD_JOHU = `  html+=box('🌡️ ② 조후(調候) 판정 — 계절 에너지 분석',
    '<span class="johu-badge '+johu.badgeCls+'">'+johu.badgeTxt+'</span><br>'+
    johu.advice+'<br><br>'+
    '<span style="color:#888;font-size:.82rem">조후는 사주의 계절적 균형을 뜻합니다. 더운 여름 사주는 차가운 기운(水·金)이, 추운 겨울 사주는 따뜻한 기운(火·木)이 용신(用神)이 됩니다. 대운·세운 판단의 핵심 기준입니다.</span>',
    '#2196F3','rgba(227,242,253,.7)');`;

  const NEW_JOHU = `  html+=box('🌡️ ② 조후(調候) 판정 — 계절 에너지 분석',
    '<span class="johu-badge '+johu.badgeCls+'">'+johu.badgeTxt+'</span><br>'+
    johu.advice+'<br><br>'+
    subHead('조후(調候)란 무엇인가','#1565C0')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    '조후는 사주의 계절적 균형을 분석하는 명리학의 핵심 이론입니다. 생월(태어난 달)이 결정하는 계절에 따라 사주 전체의 차갑고 따뜻함의 균형이 달라집니다. 여름 사주(巳·午·未월 출생)는 이미 화(火) 기운이 과잉이므로 차고 적신 수(水)와 금(金) 기운이 용신이 됩니다. 반대로 겨울 사주(亥·子·丑월 출생)는 수(水)가 강해 화(火)와 목(木)으로 온기를 보강해야 합니다. 조후가 맞는 운이 들어올 때 삶의 전반적인 컨디션이 좋아지고 사업·건강·대인관계가 유연해집니다. 조후가 어긋난 운에는 의욕 저하나 건강 이상으로 나타날 수 있으니, 대운 해석 시 반드시 조후를 먼저 체크해야 합니다.</div>'+
    '<br>'+subHead('실생활 적용법','#1976D2')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    '조후 조절은 거창한 변화가 아니라 일상의 작은 선택에서 시작합니다. 자신의 조후에 맞는 색상, 음식, 방향, 활동을 의식적으로 선택하면 에너지 균형이 잡히고 삶의 흐름이 부드러워집니다. 아래 개운 파트에서 구체적인 조후 맞춤 개운법을 확인하세요.</div>',
    '#2196F3','rgba(227,242,253,.7)');`;

  if (c.includes(OLD_JOHU)) {
    c = c.replace(OLD_JOHU, NEW_JOHU);
    console.log('[saju] 조후 박스 확장됨');
  }

  // 3-E. 진로 적성 박스 확장
  const OLD_CAREER = `    '<br>'+subHead('성공의 핵심 원칙','#1976D2')+
    '<div style="font-size:.84rem;margin-top:4px;line-height:1.75">'+
    '당신의 가장 큰 강점인 <b>'+tsInfo.meaning+'</b>을(를) 살릴 때 다른 누구보다 빛납니다. '+
    lifeStrategyByTs[dominant]+'</div>',
    '#1565C0','rgba(227,242,253,.7)');`;

  const NEW_CAREER = `    '<br>'+subHead('성공의 핵심 원칙','#1976D2')+
    '<div style="font-size:.84rem;margin-top:4px;line-height:1.75">'+
    '당신의 가장 큰 강점인 <b>'+tsInfo.meaning+'</b>을(를) 살릴 때 다른 누구보다 빛납니다. '+
    lifeStrategyByTs[dominant]+'</div>'+
    '<br>'+subHead('진로 선택 시 핵심 체크리스트','#0d47a1')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    '단순히 "돈이 되는가"가 아니라 다음 세 가지를 반드시 확인하세요. 첫째, 이 일을 할 때 시간 가는 줄 모르는가? 의식 없이 열중하는 것이 천직의 신호입니다. 둘째, 이 분야에서 나의 약점이 강점으로 전환되는가? 예를 들어 섬세함이 단점인 환경이 있고, 장점인 환경이 있습니다. 셋째, 5년 후 이 분야의 전문가가 되었을 때 사회적으로 필요한 인재인가? 자신의 재능과 세상의 필요가 교차하는 지점이 가장 이상적인 커리어 방향입니다. <b>'+dominant+'</b> 에너지를 가진 당신은 특히 자율성과 전문성이 보장되는 환경에서 폭발적인 성장을 보입니다.</div>',
    '#1565C0','rgba(227,242,253,.7)');`;

  if (c.includes(OLD_CAREER)) {
    c = c.replace(OLD_CAREER, NEW_CAREER);
    console.log('[saju] 진로 박스 확장됨');
  }

  // 3-F. 연애·결혼 박스 확장
  const OLD_LOVE_END = `    '<br>'+subHead('결혼 후 행복의 열쇠','#880e4f')+
    '<div style="font-size:.84rem;line-height:1.78">서로의 사생활과 성장 공간을 존중해주고, 명절/기념일/일상의 작은 감사 표현을 꾸준히 이어가는 것이 가장 안정적인 관계 유지 방법입니다.</div>',
    '#e91e63','rgba(252,228,236,.7)');`;

  const NEW_LOVE_END = `    '<br>'+subHead('결혼 후 행복의 열쇠','#880e4f')+
    '<div style="font-size:.84rem;line-height:1.78">서로의 사생활과 성장 공간을 존중해주고, 명절/기념일/일상의 작은 감사 표현을 꾸준히 이어가는 것이 가장 안정적인 관계 유지 방법입니다.</div>'+
    '<br>'+subHead('관계에서 반드시 기억할 것','#ad1457')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    '사랑은 감정이 아니라 선택이자 실천입니다. 아무리 좋은 궁합이어도, 두 사람 모두 관계에 지속적으로 투자하지 않으면 무너집니다. '+dominant+' 에너지를 가진 당신은 특유의 관계 방식이 있는데, 상대방이 그 방식을 이해하도록 명확하게 표현하는 것이 갈등 예방의 핵심입니다. 말 안 해도 알아줄 것이라는 기대는 오해를 낳습니다. 갈등이 생겼을 때 피하지 않고 적극적으로 대화하고 해소하는 패턴을 만들어가는 것이 장기적으로 행복한 관계의 기초입니다. 자신의 사랑 언어(칭찬, 스킨십, 봉사, 선물, 시간 공유 중)와 상대방의 사랑 언어가 다를 수 있음을 인식하고 맞춰가세요.</div>',
    '#e91e63','rgba(252,228,236,.7)');`;

  if (c.includes(OLD_LOVE_END)) {
    c = c.replace(OLD_LOVE_END, NEW_LOVE_END);
    console.log('[saju] 연애 박스 확장됨');
  }

  // 3-G. 재물운 박스 확장
  const OLD_MONEY_END = `       dominant==='편재'||dominant==='겁재'?
       ['공격형 — 분산 투자, 빠른 손절 원칙','레버리지는 총 자산의 10% 이내로 제한','연대보증·구두 계약 절대 금지']:
       ['균형형 — 안전자산 60%, 변동자산 40%','분기별 포트폴리오 점검','장기 복리 투자가 가장 효율적']),
    '#FF6F00','rgba(255,243,224,.7)');`;

  const NEW_MONEY_END = `       dominant==='편재'||dominant==='겁재'?
       ['공격형 — 분산 투자, 빠른 손절 원칙','레버리지는 총 자산의 10% 이내로 제한','연대보증·구두 계약 절대 금지']:
       ['균형형 — 안전자산 60%, 변동자산 40%','분기별 포트폴리오 점검','장기 복리 투자가 가장 효율적'])+
    '<br>'+subHead('재물 상승을 위한 사주 기반 행동 원칙','#bf360c')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    '재물운은 운만으로 결정되지 않습니다. 사주의 기운이 재물로 연결되는 구조는 있지만, 그 구조를 실제 돈으로 전환하는 것은 행동입니다. 당신의 <b>'+dominant+'</b> 에너지가 가장 잘 발현될 때 돈도 자연스럽게 따라옵니다. 반대로 에너지가 억눌리거나 잘못된 방향에 쓰일 때 재물이 새어나갑니다. 수입을 늘리는 것만큼 지출의 패턴을 점검하는 것이 중요합니다. 재물운의 단기 흐름은 세운(그 해 운)에 따라 달라지니, 큰 투자 결정은 좋은 운의 해에 집중하세요. 매년 1월에 그 해의 재물운을 확인하고 전략을 수립하는 습관을 들이면 자산이 꾸준히 성장합니다.</div>',
    '#FF6F00','rgba(255,243,224,.7)');`;

  if (c.includes(OLD_MONEY_END)) {
    c = c.replace(OLD_MONEY_END, NEW_MONEY_END);
    console.log('[saju] 재물운 박스 확장됨');
  }

  // 3-H. 귀인·인간관계 박스 확장
  const OLD_GUIIN_END = `    li(['나의 성장을 시기하거나 깎아내리는 사람',
       '돈·감정·시간을 지속적으로 착취하는 관계',
       '자존감을 낮추는 환경은 과감히 거리를 두세요']),
    '#1565C0','rgba(227,242,253,.7)');`;

  const NEW_GUIIN_END = `    li(['나의 성장을 시기하거나 깎아내리는 사람',
       '돈·감정·시간을 지속적으로 착취하는 관계',
       '자존감을 낮추는 환경은 과감히 거리를 두세요'])+
    '<br>'+subHead('귀인을 만나고 지키는 법','#1565C0')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    '귀인은 거창한 곳에서 오지 않습니다. 당신이 진심을 다하는 영역에서, 꾸준히 가치를 쌓을 때 자연스럽게 나타납니다. 먼저 당신 자신이 타인의 귀인이 되어야 귀인을 끌어당길 수 있습니다. <b>'+dominant+'</b> 에너지를 가진 당신의 귀인 유형인 <b>'+(guiinByDom[domE]||'성장을 돕는 멘토')+'</b>와의 만남을 의도적으로 늘리세요. 커뮤니티, 스터디 모임, 업계 행사 등에 꾸준히 참여하면서 자신의 가치를 먼저 나누는 태도가 귀인 인연을 만드는 가장 확실한 방법입니다. 한번 만난 귀인과의 관계는 정기적인 연락과 관심으로 유지해야 합니다.</div>',
    '#1565C0','rgba(227,242,253,.7)');`;

  if (c.includes(OLD_GUIIN_END)) {
    c = c.replace(OLD_GUIIN_END, NEW_GUIIN_END);
    console.log('[saju] 귀인 박스 확장됨');
  }

  // 3-I. 인생 전략 박스 확장
  const OLD_STRATEGY = `    subHead('10년 관점 커리어 전략','#6a1b9a')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    lifeStrategyByTs[dominant]+'</div>',
    '#9C27B0','rgba(243,229,245,.7)');`;

  const NEW_STRATEGY = `    subHead('10년 관점 커리어 전략','#6a1b9a')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    lifeStrategyByTs[dominant]+'</div>'+
    '<br>'+subHead('지금 당장 시작할 3가지 루틴','#7b1fa2')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    '<b>① 주간 리뷰 (매주 일요일 20분)</b>: 이번 주 어떤 결정을 했고, 어떤 결과가 왔는가? <b>'+dominant+'</b> 에너지가 잘 발현된 순간과 낭비된 순간을 기록하세요. 패턴이 보이면 다음 주 행동이 달라집니다.<br><br>'+
    '<b>② 귀인 접점 늘리기 (월 2회)</b>: 당신의 성장 방향과 같은 사람들이 모이는 공간에 정기적으로 참여하세요. 귀인은 찾는 것이 아니라 환경 안에서 자연스럽게 만나는 것입니다.<br><br>'+
    '<b>③ 용신 에너지 흡수 (매일)</b>: 용신 색상의 소품을 몸에 지니거나, 방향에 알람을 맞추거나, 용신 음식을 식단에 포함하는 등 작은 일상의 조율이 에너지 균형을 유지합니다.</div>',
    '#9C27B0','rgba(243,229,245,.7)');`;

  if (c.includes(OLD_STRATEGY)) {
    c = c.replace(OLD_STRATEGY, NEW_STRATEGY);
    console.log('[saju] 인생전략 박스 확장됨');
  }

  // 3-J. generateDetailedAdvice 내 ganAdvice 확장
  const OLD_GANADVICE_HEAD = `  var ganAdvice={
    '甲':'하늘을 향해 자라는 큰 나무처럼, <b>방향만 잃지 않으면 반드시 빛을 봅니다.</b> 꾸준함이 당신의 가장 강력한 무기예요. 고집이 있다는 말은 결국 "의지가 있다"는 뜻이기도 합니다. 그 고집을 올바른 방향에만 쓰세요. 단독 행동이 동업보다 유리한 사주입니다.',`;

  const NEW_GANADVICE_HEAD = `  var ganAdvice={
    '甲':'하늘을 향해 자라는 큰 나무처럼, <b>방향만 잃지 않으면 반드시 빛을 봅니다.</b> 꾸준함이 당신의 가장 강력한 무기예요. 고집이 있다는 말은 결국 "의지가 있다"는 뜻이기도 합니다. 그 고집을 올바른 방향에만 쓰세요. 단독 행동이 동업보다 유리한 사주입니다.<br><br>갑목(甲木)의 가장 큰 함정은 자신의 방식이 유일하게 옳다는 확신이 지나쳐 주변의 소중한 피드백을 차단하는 것입니다. 나무도 바람에 흔들려야 뿌리가 더 깊이 내려갑니다. 타인의 의견에 귀를 여는 것은 약함이 아니라 전략입니다. 경쟁이 있을 때 진가가 드러나므로, 편안한 환경에만 안주하지 말고 의도적으로 자신을 도전적인 상황에 노출시키세요. 중년 이후 본격적인 결실이 시작되므로, 30대의 고생을 두려워하지 마세요. 지금 내려가는 뿌리가 미래의 거목을 만듭니다.',`;

  if (c.includes(OLD_GANADVICE_HEAD)) {
    c = c.replace(OLD_GANADVICE_HEAD, NEW_GANADVICE_HEAD);
    console.log('[saju] ganAdvice 甲 확장됨');
  }

  // tsAdviceFull 확장 (비견)
  const OLD_TS_BIJO = `    '비견':'독립심이 강한 당신, 모든 일을 혼자 하려는 경향이 있어요. <b>진짜 강한 사람은 도움을 요청할 줄도 압니다.</b> 동업이나 파트너십에서는 역할을 명확히 하고 계약서를 갖추는 것이 필수입니다. 내 방식이 늘 최선이 아닐 수 있음을 인정하는 순간, 당신의 세계가 훨씬 넓어집니다.',`;

  const NEW_TS_BIJO = `    '비견':'독립심이 강한 당신, 모든 일을 혼자 하려는 경향이 있어요. <b>진짜 강한 사람은 도움을 요청할 줄도 압니다.</b> 동업이나 파트너십에서는 역할을 명확히 하고 계약서를 갖추는 것이 필수입니다. 내 방식이 늘 최선이 아닐 수 있음을 인정하는 순간, 당신의 세계가 훨씬 넓어집니다.<br><br>비견이 강한 사주는 경쟁에서 강하고 자기만의 브랜드를 구축하는 능력이 탁월합니다. 하지만 경쟁에 너무 집중하면 소비와 지출이 과잉되어 재물이 쌓이지 않는 구조가 될 수 있습니다. 수입의 일정 비율을 자동이체로 강제 저축하는 시스템을 반드시 만드세요. 또한 독립심이 강해 협력이 어렵지만, 당신보다 뛰어난 사람을 파트너로 두는 용기가 성장의 가속 페달입니다. 동반자를 경쟁자로 보지 말고 시너지 파트너로 보는 시각 전환이 필요합니다.',`;

  if (c.includes(OLD_TS_BIJO)) {
    c = c.replace(OLD_TS_BIJO, NEW_TS_BIJO);
    console.log('[saju] tsAdviceFull 비견 확장됨');
  }

  // generateDetailedAdvice 마지막 서명 → NEO_MODE 분기
  c = c.replace(
    `  out+='<div style="text-align:right;margin-top:8px;font-style:italic;color:#81C784;font-size:.8rem">— 연이가 당신의 사주를 읽으며 진심을 담아 🐷💚</div>';
  return out;
}`,
    `  out+='<div style="text-align:right;margin-top:8px;font-style:italic;color:#81C784;font-size:.8rem">— 연이가 당신의 사주를 읽으며 진심을 담아 🐷💚</div>';
  return out;
}

/* ─── generateNeoFactPunch: 쌈바의 현실적 팩폭 (백사자 NEO MODE 전용) ─── */
function generateNeoFactPunch(p,pw,jg,dominant,dayMaster,domE,natal,deep){
  var dg=p.d.g;
  var out='';
  var EL_KO={wood:'목(木)',fire:'화(火)',earth:'토(土)',metal:'금(金)',water:'수(水)'};
  var EL_K={wood:'목',fire:'화',earth:'토',metal:'금',water:'수'};

  // 일간별 팩폭 조언
  var ganPunch={
    '甲':'당신은 방향만 맞으면 아무도 못 막는 사람입니다. 근데 솔직히 말할게요. 지금 방향이 맞긴 합니까? 고집이 강하다는 건 좋습니다. 근데 피드백을 무시하는 고집은 자기 무덤 파는 겁니다. 주변에서 당신에게 같은 말을 두 번 이상 한 적 있으면 그건 반드시 들어야 합니다. 독립심도 좋지만 혼자 다 하려다 번아웃 나는 갑목(甲木)을 많이 봤습니다. 협력을 두려워하지 마세요. 당신보다 잘하는 사람을 파트너로 두는 것이 패배가 아니라 전략입니다. 지금 가장 필요한 것: 주간 목표 점검, 한 명의 진짜 피드백 파트너, 그리고 자신의 완고함을 인식하는 솔직한 일기.',
    '乙':'당신은 어디서든 살아남는 생존력이 있습니다. 하지만 그 생존력이 자기 목소리를 죽이는 방식으로 쓰이고 있지 않나요? 눈치가 빠른 건 장점이지만, 모든 사람을 만족시키려다 정작 자신이 원하는 게 뭔지 잃어버린 을목(乙木)이 많습니다. 결정 앞에서 too much thinking이 제일 큰 문제입니다. 완벽한 선택은 없습니다. 70%의 확신이 있으면 움직이세요. 나머지 30%는 움직이면서 채우는 겁니다. 그리고 당신을 이용하는 사람을 구별하는 눈을 키우세요. 착한 게 죄는 아니지만, 착함을 착취당하는 건 당신 책임입니다.',
    '丙':'에너지 넘치죠. 근데 그 에너지가 얼마나 집중되고 있습니까? 병화(丙火)의 가장 흔한 패턴: 시작은 화끈하게, 중간에 흥미 잃고, 마무리는 흐지부지. 이 패턴을 인식하고 있나요? 지금 당장 하나만 골라서 끝까지 가세요. 동시에 여러 걸 하는 건 다 중간에서 끝내는 것과 같습니다. 결실은 끝까지 간 사람에게 옵니다. 충동적 결정이 많은데, 큰 결정 앞에서 반드시 48시간 쿨다운 규칙을 만드세요. 충동으로 시작한 일이 인생을 얼마나 흔들어놨는지 솔직하게 돌아보세요.',
    '丁':'조용하지만 내면에 뜨거운 것들이 있다는 거 압니다. 근데 그걸 너무 안으로만 담아두고 있지 않나요? 정화(丁火)의 함정: 상처를 말 못 하고 참다가 어느 순간 폭발하거나 관계를 조용히 끊어버립니다. 주변 사람은 왜 갑자기 거리를 두는지 이유를 모릅니다. 말하세요. 불편하면 불편하다고, 상처받으면 상처받았다고. 소통의 부재가 모든 관계 문제의 근원입니다. 자기비판도 너무 심합니다. 당신이 틀렸을 때 자신을 몰아붙이는 내면의 목소리, 이제 그 목소리에게도 경계를 설정해야 합니다.',
    '戊':'든든하고 믿음직합니다. 근데 그 무거움이 때로는 당신 자체를 가두고 있지 않나요? 무토(戊土)의 핵심 문제: 변화가 필요한 줄 알면서도 행동이 늦습니다. "언젠가는", "좀 더 준비되면" — 이 말 입에 달고 삽니까? 완벽한 타이밍은 없습니다. 지금 시작하는 것이 언제나 가장 빠릅니다. 책임감이 강해서 져서는 안 된다는 강박이 있는데, 실패는 정보입니다. 빠른 실패가 느린 성공보다 낫습니다. 자신의 경직됨을 인식하고, 매달 한 가지씩 새로운 것을 시도하는 루틴을 만드세요.',
    '己':'당신은 조직의 진짜 핵심을 조용히 지탱하는 사람입니다. 근데 그 사실을 본인이 가장 모르고 있지 않나요? 기토(己土) 패턴: 남을 너무 챙기다 정작 자신의 경력, 건강, 즐거움을 뒷전으로 밀어놓습니다. 이건 미덕이 아닙니다. 내 컵이 비어있으면 남을 채워줄 수 없습니다. 결단력 부족도 문제입니다. 선택 앞에서 너무 오래 고민하면 기회가 지나갑니다. 자신의 판단을 믿으세요. 당신의 세밀한 눈은 이미 정답을 알고 있습니다. 행동하는 것만 남았습니다.',
    '庚':'직선적이고 솔직합니다. 이건 큰 자산입니다. 근데 경금(庚金)이 가장 많이 듣는 말이 뭔지 압니까? "차갑다", "말이 너무 직접적이다", "배려가 없다". 의도가 없어도 상처를 주고 있을 수 있습니다. 메시지는 보내는 사람이 아닌 받는 사람이 해석합니다. 동일한 내용을 5% 더 부드럽게 전달하는 연습이 인간관계 전체를 바꿉니다. 그리고 완고함 — 이미 결정한 것을 끝까지 밀어붙이는 경향, 이것이 위기 때는 강점이지만 일상에서는 갈등 원인입니다. 언제 유연해야 하는지 판단하는 기준을 세우세요.',
    '辛':'완벽주의자죠. 당신 눈에는 항상 뭔가 부족하게 보입니다. 근데 솔직히 말할게요: 세상은 완벽한 것은 아무것도 없고, 완벽을 기다리다 타이밍을 놓친 신금(辛金)이 너무 많습니다. 지금 당장 70%짜리라도 꺼내세요. 시장에서의 피드백이 당신의 머릿속 완벽함보다 훨씬 정확합니다. 비판에 과민하게 반응하는 것도 문제입니다. 비판은 당신의 존재에 대한 공격이 아니라 작품에 대한 의견입니다. 자신과 자신의 결과물을 분리하는 심리적 거리감을 만드세요.',
    '壬':'시야가 넓고 전략적입니다. 근데 그 넓음이 문제입니다. 임수(壬水)는 동시에 너무 많은 것을 봐서 어느 것도 깊이 파지 못하는 패턴이 반복됩니다. 지금 당신 손에 몇 개의 프로젝트가 있나요? 반 이상은 버리세요. 집중이 자산입니다. 감정을 안 드러내는 것도 장기적으로는 관계를 고립시킵니다. 주변 사람들은 당신의 속을 알 수 없어서 어떻게 다가가야 할지 모릅니다. 가끔은 약점을 보여주세요. 그게 오히려 신뢰를 만듭니다.',
    '癸':'섬세하고 공감 능력이 뛰어납니다. 근데 계수(癸水)의 가장 큰 적은 자기 자신입니다. 생각이 너무 많아서 행동이 늦고, 우유부단한 모습 때문에 기회를 반복적으로 놓칩니다. 완벽한 확신이 올 때까지 기다리는 것은 영원히 시작하지 않겠다는 것과 같습니다. 직관을 믿으세요. 당신의 첫 번째 감이 대부분 맞습니다. 그리고 다른 사람의 감정을 지나치게 흡수해 자신의 에너지를 소진시키는 习관을 점검하세요. 공감은 미덕이지만, 경계 없는 공감은 자기 소모입니다.'
  };

  // 신강/신약 팩폭
  var powerPunch='';
  if(jg&&jg.isJong){
    powerPunch='<b>종격 사주</b> — 이 사주의 핵심은 하나입니다. '+EL_KO[jg.dominant]+' 기운이 압도적인 당신은, 그 기운에 거스르는 선택을 할 때마다 인생이 삐걱거립니다. 취미, 직업, 인간관계 모두 '+EL_KO[jg.dominant]+' 에너지가 흐르는 방향으로 정렬하세요. 반대 에너지는 독입니다. 많은 사람들이 사회적 기대나 주변 압박 때문에 자신의 기운에 반하는 선택을 합니다. 당신에게 그것은 치명적입니다. 자신의 타고난 기운을 따르는 용기가 필요합니다.';
  }else if(pw&&pw.isStrong){
    powerPunch='<b>신강 사주</b> — 에너지가 넘칩니다. 이게 문제입니다. 넘치는 에너지는 통제되지 않으면 고집, 독선, 과잉 경쟁으로 타버립니다. 당신 주변의 사람들이 피로해하고 있지 않나요? 자신의 에너지를 건강하게 발산하는 구조(운동, 봉사, 창작, 리더십 역할)를 반드시 만드세요. 억누르면 더 폭발적으로 터집니다. 에너지를 올바른 방향으로 쏟아붓는 것이 신강 사주의 유일한 성공 공식입니다. 지금 당신의 에너지가 건강하게 흐르고 있는지 솔직하게 답하세요.';
  }else{
    powerPunch='<b>신약 사주</b> — 외부 환경이나 사람의 영향을 쉽게 받습니다. 이것 자체는 약점이 아닙니다. 문제는 당신도 그것을 알면서 경계를 세우지 않는다는 겁니다. 당신이 지쳐있는 관계, 당신을 소모시키는 환경 — 이것들을 정리할 용기가 필요합니다. 거절하는 것이 이기적인 게 아닙니다. 자신을 지키는 것이 먼저입니다. 귀인 한 명이 인생을 바꿔줄 수 있는 구조이니, 당신의 가치를 알아봐주고 진심으로 응원하는 사람과의 인연을 소중히 하세요.';
  }

  // 십성 팩폭 조언
  var tsPunch={
    '비견':'경쟁에서 강하고 독립심이 높습니다. 근데 그 독립심이 고립으로 가고 있지는 않나요? 혼자 다 하려다 결국 혼자 지칩니다. 당신보다 잘하는 사람을 파트너로 두는 것이 약점을 인정하는 게 아니라 전략입니다. 수입 이상 쓰는 습관, 재물 관리 구멍부터 막으세요.',
    '겁재':'승부욕과 카리스마가 탁월합니다. 근데 솔직히 말할게요 — 지금까지 돈이 들어온 만큼 나가지 않았나요? 겁재의 재물 구조는 크게 벌고 크게 씁니다. 이 흐름을 막을 강제 시스템(자동이체, 고정 저축 비율)이 없으면 나이 들어 손에 남는 게 없습니다. 지금 당장 지출 구조를 설계하세요.',
    '식신':'낙천적이고 창의적입니다. 이것이 최고의 자산입니다. 근데 이 좋은 기운이 이용당하고 있지는 않나요? 잘 베풀다가 지치는 패턴, 오래 됐죠? 사람을 볼 줄 아는 눈을 키우는 것이 이제 남은 과제입니다. 체력 관리도 중요합니다. 창의력과 에너지가 당신의 자본인데, 그 자본이 고갈되지 않게 관리하세요.',
    '상관':'아이디어와 언변이 탁월한 대신 적을 만들기 쉽습니다. 이미 알고 있죠? 표현의 날카로움을 10% 줄이면 당신의 영향력이 3배가 됩니다. 자기 규칙을 스스로 만들고 지키는 자기 경영이 전부입니다. 타인의 틀 안에서는 당신이 빛나기 어렵습니다. 자신만의 기준과 영역을 만드세요.',
    '편재':'큰 기회를 잡는 능력이 있습니다. 근데 큰 것만 보다 작은 것을 놓치는 패턴, 지금도 반복되고 있지 않나요? 재물이 들어왔다 나가는 주기가 빠릅니다. 이 주기를 늦추는 것이 자산 축적의 핵심입니다. 신뢰할 수 있는 재무 파트너(회계사, 재무설계사)를 두는 것을 강력히 권합니다.',
    '정재':'성실하고 꼼꼼합니다. 이건 좋습니다. 근데 너무 안정만 추구해서 기회를 계속 패스하고 있지 않나요? 작은 도전들을 지속적으로 해나가는 것이 큰 결실로 이어집니다. 실패가 두렵겠지만, 실패하지 않는 유일한 방법은 아무것도 하지 않는 것입니다. 그건 더 무서운 실패입니다.',
    '편관':'강인하고 리더십이 있습니다. 근데 스트레스를 몸으로 다 받아내고 있지 않나요? 지금 몸 상태를 솔직하게 체크하세요. 편관 사주는 과로와 건강 문제가 가장 큰 리스크입니다. 당신이 무너지면 당신이 이끄는 모든 것이 흔들립니다. 격렬한 운동으로 에너지를 발산하고, 권위 대신 공감으로 사람을 이끄는 법을 배우세요.',
    '정관':'원칙과 명예를 중시합니다. 이것이 당신의 가장 큰 신용 자산입니다. 근데 원칙을 지키다가 기회를 놓치는 경우가 있지 않나요? 규칙보다 사람이 먼저인 상황이 있습니다. 100% 원칙에 2% 유연성을 더하는 것이 당신의 숙제입니다. 남의 시선 때문에 자신의 진짜 욕구를 억누르고 있지는 않은지 점검하세요.',
    '편인':'직관이 탁월하고 아이디어가 넘칩니다. 근데 그 아이디어들이 머릿속에서만 살다 죽어가고 있지 않나요? 생각을 실행으로 연결하는 의지가 가장 필요합니다. 완벽히 준비된 다음 시작하려다 결국 아무것도 시작 못 합니다. 지금 당장 가장 작은 첫 걸음을 내딛으세요. 고독을 즐기는 건 좋지만 고립되면 안 됩니다.',
    '정인':'배우려는 의지가 강하고 귀인 복이 있습니다. 근데 지금 누군가에게 지나치게 의존하고 있지는 않나요? 그 사람이 없어도 자립할 수 있는 기반을 만드는 것이 지금 당신의 가장 중요한 과제입니다. 칭찬에 약하고 인정에 목마르다는 것도 인식하세요 — 그것을 이용하는 사람들이 있습니다. 건강한 경계를 세우는 것이 성장의 시작입니다.'
  };

  // 구성
  out+='<div style="border-radius:10px;padding:14px;margin-bottom:14px;border-left:4px solid #e53935;background:rgba(229,57,53,.08)">';
  out+='<b style="font-size:.9rem;color:#FF6B6B">🦁 일간 '+dg+' — 쌈바가 당신 사주에서 본 것</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.9">'+(ganPunch[dg]||deep.advice)+'</span>';
  out+='</div>';

  out+='<div style="border-radius:10px;padding:14px;margin-bottom:14px;border-left:4px solid #ff9800;background:rgba(255,152,0,.08)">';
  out+='<b style="font-size:.9rem;color:#FFA726">⚡ '+( jg&&jg.isJong ? '종격':'(신강/신약)' )+' 팩폭</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.9">'+powerPunch+'</span>';
  out+='</div>';

  out+='<div style="border-radius:10px;padding:14px;margin-bottom:14px;border-left:4px solid #9c27b0;background:rgba(156,39,176,.08)">';
  out+='<b style="font-size:.9rem;color:#CE93D8">💥 핵심 십성 '+dominant+' — 직격탄</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.9">'+(tsPunch[dominant]||deep.advice)+'</span>';
  out+='</div>';

  if(natal.counts[domE]>=4){
    var elPunch={
      wood:'목(木) 과잉. 지금 고집이 지나치게 세지 않나요? 주변 사람들이 당신에게 같은 말을 두 번 이상 했다면 그건 피드백입니다. 흰색·금속 소품으로 금(金) 기운을 보강하고, 서쪽 방향 공간을 정리하세요. 매운맛 음식(고추, 마늘)을 식단에 추가하면 도움이 됩니다.',
      fire:'화(火) 과잉. 지금 심장이 빠르게 뛰거나 불면이 있지 않나요? 충동적 결정이 최근 잦았다면 경보 신호입니다. 검은색·파란색 소품으로 수(水) 기운을 불러오세요. 충분한 수면과 수영·목욕 등 물 관련 활동이 균형을 잡아줍니다.',
      earth:'토(土) 과잉. 변화를 너무 거부하고 있지 않나요? 고집이 세고 소화 문제가 있다면 신호입니다. 초록색 식물을 키우고 동쪽 방향 공간을 활성화하세요. 신맛 음식(식초, 레몬)이 토 기운을 분산시킵니다.',
      metal:'금(金) 과잉. 요즘 주변에서 "차갑다", "무뚝뚝하다"는 말을 들었나요? 피부 건조나 기침도 체크하세요. 따뜻한 색상(빨강, 주황)을 일상에 더하고 봉사나 표현 활동으로 화(火) 기운을 채우세요.',
      water:'수(水) 과잉. 결정을 계속 미루고 있나요? 두려움이나 불안이 크다면 수 기운 과잉 신호입니다. 노란색·황토색 소품으로 토(土) 기운을 보강하고, 규칙적인 루틴을 만들어 방향성을 잡으세요.'
    };
    out+='<div style="border-radius:10px;padding:12px;margin-bottom:14px;border-left:4px solid #e65100;background:rgba(230,81,0,.08)">';
    out+='<b style="font-size:.88rem;color:#FF8A65">⚠️ '+EL_KO[domE]+' 편중 — 지금 당장 균형 잡으세요</b><br>';
    out+='<span style="font-size:.84rem;line-height:1.9">'+(elPunch[domE]||'')+'</span>';
    out+='</div>';
  }

  out+='<div style="text-align:right;margin-top:8px;font-style:italic;color:#FF6B6B;font-size:.8rem">— 쌈바가 당신의 사주를 보며 팩트로 꽂아드립니다 🦁⚡</div>';
  return out;
}`
  );

  // 3-K. Section 13 NEO_MODE 분기
  const OLD_SEC13 = `  /* ───────────────────────────────
     13. 연이의 현실 조언
  ─────────────────────────────── */
  html+='<div class="prem-box" style="background:linear-gradient(135deg,#E8F5E9,#F1F8E9);border-color:#A5D6A7">'+
    '<span class="prem-title" style="border-color:#4CAF50;color:#2E7D32">🍀 연이의 현실 조언 — '+(USER_NAME||'당신')+'님만을 위한 이야기</span>'+
    '<div class="prem-text">'+generateDetailedAdvice(p,pw,jg,dominant,dayMaster,domE,natal,deep)+'</div></div>';`;

  const NEW_SEC13 = `  /* ───────────────────────────────
     13. 연이의 현실 조언 / 쌈바의 현실적 팩폭 (NEO_MODE 분기)
  ─────────────────────────────── */
  var _isNeoSaju = (typeof NEO_MODE !== 'undefined' && NEO_MODE) || document.body.classList.contains('neo-mode');
  if (_isNeoSaju) {
    html+='<div class="prem-box" style="background:linear-gradient(135deg,rgba(30,5,5,.9),rgba(60,10,10,.85));border-color:#e53935">'+
      '<span class="prem-title" style="border-color:#e53935;color:#FF6B6B">🦁 쌈바의 현실적 팩폭 — '+(USER_NAME||'당신')+'님을 향한 직격탄</span>'+
      '<div class="prem-text">'+generateNeoFactPunch(p,pw,jg,dominant,dayMaster,domE,natal,deep)+'</div></div>';
  } else {
    html+='<div class="prem-box" style="background:linear-gradient(135deg,#E8F5E9,#F1F8E9);border-color:#A5D6A7">'+
      '<span class="prem-title" style="border-color:#4CAF50;color:#2E7D32">🍀 연이의 현실 조언 — '+(USER_NAME||'당신')+'님만을 위한 이야기</span>'+
      '<div class="prem-text">'+generateDetailedAdvice(p,pw,jg,dominant,dayMaster,domE,natal,deep)+'</div></div>';
  }`;

  if (c.includes(OLD_SEC13)) {
    c = c.replace(OLD_SEC13, NEW_SEC13);
    console.log('[saju] Section 13 NEO_MODE 분기 적용됨');
  } else {
    console.warn('[saju] Section 13 not found!');
  }

  writeFileSync(f, c, 'utf8');
  console.log('[saju] 패치 완료:', f);
}

console.log('\n✅ 모든 패치 완료!');
