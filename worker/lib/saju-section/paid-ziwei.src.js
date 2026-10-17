// 자미두수 명반 상세(_renderZwPanel) 유료 장 정본. 브라우저로 내려가지 않는다. js/saju-engine.js 의 window._renderZwPanel 에서
// 꼬리(화면 끼우기·이벤트 연결) 앞까지의 본문 계산을 줄 그대로 옮기고, 끝에 유료 장 본문만 모아 돌려준다.
//   ziwei_decade_luck      — 대한(大限) 12단계 타임라인(dahanTimelineHtml) + 1년운 안쪽 10년운(decadeHtml)
//   ziwei_twelve_palaces   — sec2
//   ziwei_love_deep        — sec_love_compat_spread + sec_love + buildZwSpouseDeepHtml(pd)
//   ziwei_symbolic_layer   — sec_olympus_ziwei
//   ziwei_life_yearly_flow — buildZwGrandLifeDeepHtml(pd) + sec_grand + sec_ziwei_flow + buildZwYearlyFlowDeepHtml(pd)
// 바뀐 곳은 현재 시각뿐이다(패널 flowYear, buildZwSpouseDeepHtml 의 nowYear) — 원본의 new Date().getFullYear() 대신 _zwNowYear()(report.js 가 넘긴 요청 시각 ctx.now 의
// 한국 시각 연도. CURRENT_AGE 와 같은 기준이다)를 쓴다. 서버에서는 _cdGateBody 가 빈 문자열을 돌려주므로 1년운 장 안쪽의
// 10년운 칸은 비어 있고, 그 본문은 decadeHtml 로 따로 돌려준다.
function _zwNowYear(){ return new Date((ctx.now instanceof Date ? ctx.now.getTime() : Date.now()) + 9 * 60 * 60 * 1000).getUTCFullYear(); }
// ── 12궁 정밀 해설(ziwei_twelve_palaces) 생성기 — js/saju-engine.js 최상위 선언 원문 ──
var ZW_SIHUA_LABEL={'화록':'화록(祿)▲','화권':'화권(權)▲','화과':'화과(科)▲','화기':'화기(忌)▼'};
var ZW_SIHUA_COLOR={'화록':'#4ade80','화권':'#60a5fa','화과':'#c084fc','화기':'#f87171'};
var ZW_PALACE_ORDER=['명궁','형제궁','부부궁','자녀궁','재백궁','질액궁','천이궁','노복궁','관록궁','전택궁','복덕궁','부모궁'];
var ZW_PALACE_ICON={'명궁':'👤','형제궁':'🤝','부부궁':'💑','자녀궁':'🌱','재백궁':'💰','질액궁':'❤️‍🩹','천이궁':'✈️','노복궁':'🌐','관록궁':'🏆','전택궁':'🏠','복덕궁':'✨','부모궁':'🙏'};
/* 12궁 요약 테이블 HTML 문자열 생성 (팝업·하단 패널 공용) */
function buildZwSummaryTableHtml(palace) {
  if(!palace) return '';
  var ZHI_ORD=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var isCompactView = (typeof window !== 'undefined' && window.matchMedia)
    ? window.matchMedia('(max-width: 980px)').matches
    : false;
  function parseMainStar(rawStr){
    var plain=(rawStr||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    var isBorrowed=/\(차성\)|\b차성\b/.test(plain);
    var sihua=getSihua(plain);
    var name=plain
      .replace(/\(차성\)/g,'')
      .replace(/화록|화권|화과|화기/g,'')
      .replace(/◎|△|▲/g,'')
      .replace(/(^|\s)[O○X](?=\s|$)/g,' ')
      .trim()
      .split(' ')[0];
    return { name:name||'', isBorrowed:isBorrowed, sihua:sihua };
  }
  function getCleanStarName(rawStr){
    return (rawStr||'')
      .replace(/<[^>]*>/g,' ')
      .replace(/\(차성\)/g,'')
      .replace(/화록|화권|화과|화기/g,'')
      .replace(/\s+/g,' ')
      .trim()
      .split(' ')[0];
  }
  function getSihua(rawStr){var m=(rawStr||'').match(/화록|화권|화과|화기/);return m?m[0]:null;}
  function getEffectiveBr(sn,z,isBorrowed){
    return zwComputeStarStrength(sn,z,isBorrowed);
  }
  // 등급은 글자(廟…陷)로 구분한다. 색으로 좋고 나쁨을 나타내지 않는다. 강약 없는 별은 표기 없음.
  function getBrTag(b){
    var label=zwStrengthToSymbol(b);
    if(!label) return '';
    return '<span title="'+zwStrengthShortMeaning(b)+'" style="color:#fde68a;background:rgba(253,230,138,0.12);padding:1px 5px;border-radius:3px;font-size:0.72rem;font-weight:700;margin-left:3px">'+label+'</span>';
  }
  // 궁의 강약은 첫 주성의 등급 그대로 읽는다. 여러 별을 평균하지 않는다(등급은 점수가 아니다).
  function calcStrengthTier(mainMeta,zhi){
    if(!mainMeta || !mainMeta.length) return '';
    return getEffectiveBr(mainMeta[0].name,zhi,mainMeta[0].isBorrowed);
  }
  function genSummary(gungName,mainMeta,zhi,sh,auxStars){
    var gungDef = zwGungDef(gungName) || gungName;
    var goodAux=['천괴','천월','좌보','우필','문창','문곡','녹존','천마'];
    var supportAux=[];
    (auxStars || []).forEach(function(a){
      if (goodAux.indexOf(a) >= 0 && supportAux.indexOf(a) < 0) supportAux.push(a);
    });
    if(!mainMeta.length) {
      return '공궁(空宮)입니다. '+gungDef+' 축은 바깥 조건의 영향을 더 크게 받으니, 기준을 먼저 세우고 속도보다 정렬을 우선하세요.';
    }
    var star=mainMeta[0].name;
    var kw=ZW_STAR_KW[star]||star;
    var tier=calcStrengthTier(mainMeta,zhi);
    var tierText={묘:'성질이 가장 또렷하게 드러나는 자리',왕:'성질이 힘 있게 드러나는 자리',득:'자리를 얻어 무난히 드러나는 자리',리:'힘이 한 단계 덜하게 드러나는 자리',평:'함께 앉은 별·사화의 영향을 크게 받는 중간 자리',불:'자리를 얻지 못해 힘이 약한 자리',함:'성질이 막히거나 비틀려 드러나기 쉬운 자리'}[tier]||'';
    var isDual=(mainMeta.length>1);
    var secondary=isDual ? (ZW_STAR_KW[mainMeta[1].name]||mainMeta[1].name) : '';
    var mainLine = kw + (isDual ? (' · ' + secondary) : '') + '가 중심축이 됩니다.'
      + (tierText ? (' 주성 ' + star + (((star.charCodeAt(star.length - 1) - 0xAC00) % 28) ? '은 ' : '는 ') + tierText + '(' + zwStrengthToSymbol(tier) + ')에 앉아 있습니다.') : '');
    var supportLine = supportAux.length
      ? ('보조성 ' + supportAux.slice(0, 2).join(' · ') + '가 완충막이 되어 흐름을 매끈하게 받쳐 줍니다.')
      : '보조성 직접 후원은 약하지만, 주성의 방향을 분명히 세우면 결과가 흔들리지 않습니다.';
    var contextText;
    if (sh === '화기') contextText = '말·계약·속도에서 오차를 줄이는 쪽이 손실 방지에 유리합니다.';
    else if (sh === '화록') contextText = '회수와 연결이 빠르게 붙는 시기라, 작은 기회도 기록해 두는 편이 좋습니다.';
    else if (sh === '화권') contextText = '주도권과 실행력이 살아나지만, 독주보다 역할 분담이 더 큰 성과를 만듭니다.';
    else if (sh === '화과') contextText = '평판·평가·정돈된 결과물에서 강점이 드러납니다.';
    else if (tier === '묘' || tier === '왕' || tier === '득') contextText = '주성의 성질이 또렷하게 드러나는 자리라, 중요한 일은 주성의 방식대로 직접 풀어 갈 때 결과가 분명합니다.';
    else if (tier === '불' || tier === '함') contextText = '주성의 성질이 그대로 드러나기 어려운 자리라, 함께 앉은 별·사화·맞은편 궁에서 보완 조건을 먼저 확인하는 편이 안전합니다.';
    else if (tier === '평') contextText = '함께 앉은 별과 사화에 따라 드러나는 모습이 크게 달라지니, 같은 궁의 보조성과 맞은편 궁을 함께 보는 편이 정확합니다.';
    else contextText = '현재 흐름을 안정적으로 유지하면서 다음 타이밍을 준비하는 것이 효율적입니다.';
    var contextLine = '이 궁은 ' + gungDef + '의 규칙을 따르므로, ' + contextText;
    return mainLine + ' ' + supportLine + ' ' + contextLine;
  }

  var rows='';
  var cardRows=[];
  for(var pi=0;pi<ZW_PALACE_ORDER.length;pi++){
    var pName=ZW_PALACE_ORDER[pi];
    var zhi=palace.palaces[pName]; if(!zhi) continue;
    var zhiIdx=ZHI_ORD.indexOf(zhi);
    var stObj=palace.stars[zhiIdx]||{main:[],aux:[],bad:[],borrowedMain:[]};
    var mainList = (stObj.main && stObj.main.length) ? stObj.main : (stObj.borrowedMain || []);
    var mainMeta=mainList.map(parseMainStar).filter(function(m){return !!m.name;});
    var mainClean=mainMeta.map(function(m){return m.name;});
    var mainSihua=null;
    for(var k=0;k<mainMeta.length;k++){if(mainMeta[k].sihua){mainSihua=mainMeta[k].sihua;break;}}
    for(var k=0;k<stObj.aux.length;k++){var sh2=getSihua(stObj.aux[k]);if(sh2&&!mainSihua){mainSihua=sh2;break;}}
    var auxClean=stObj.aux.map(getCleanStarName).filter(function(s){return !!s;});
    var badClean=stObj.bad.map(getCleanStarName).filter(function(s){return !!s;});
    var starsDisp='';
    if(mainMeta.length){
      starsDisp=mainMeta.map(function(m){
        var b2=getEffectiveBr(m.name,zhi,m.isBorrowed);
        var text=m.name+getBrTag(b2);
        if(m.isBorrowed) text+='<span style="color:#facc15;font-weight:800;font-size:0.67rem;margin-left:3px">차성</span>';
        var sh3=m.sihua;
        if(sh3) text+='<span style="color:'+ZW_SIHUA_COLOR[sh3]+';font-weight:900;font-size:0.68rem;margin-left:2px">'+ZW_SIHUA_LABEL[sh3]+'</span>';
        return text;
      }).join('<br>');
    } else {
      starsDisp='<span style="color:#64748b;font-style:italic">공궁</span>';
    }
    var auxDisp='';
    if(auxClean.length) auxDisp+='<span style="color:#93c5fd;font-size:0.72rem">'+auxClean.slice(0,3).join(' ')+'</span>';
    if(badClean.length) auxDisp+=(auxDisp?'<br>':'')+'<span style="color:#fca5a5;font-size:0.72rem">'+badClean.slice(0,2).join(' ')+'</span>';
    var summaryText=genSummary(pName,mainMeta,zhi,mainSihua,auxClean);
    var rowBg=pName==='명궁'?'rgba(196,181,253,0.12)':(pi%2===0?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.2)');
    var icon=ZW_PALACE_ICON[pName]||'◆';
    var borderStyle=mainSihua==='화기'?'border-left:3px solid #f87171':(mainSihua?'border-left:3px solid #4ade80':'border-left:3px solid transparent');
    rows+='<tr style="background:'+rowBg+';'+borderStyle+'">';
    rows+='<td style="padding:9px 10px;white-space:nowrap;font-weight:800;color:#d8b4fe;font-size:0.82rem;vertical-align:top">'+icon+' '+zwDisplayPalaceName(pName)+'<br><span style="color:#64748b;font-size:0.67rem;font-weight:400">'+zwGungDef(pName)+'</span></td>';
    rows+='<td style="padding:9px 10px;color:#fde68a;font-size:0.81rem;vertical-align:top;line-height:1.8">'+starsDisp+'</td>';
    rows+='<td style="padding:9px 10px;font-size:0.73rem;color:#94a3b8;vertical-align:top">'+auxDisp+'</td>';
    rows+='<td style="padding:9px 10px;font-size:0.78rem;color:#e2e8f0;line-height:1.6;vertical-align:top">'+summaryText+'</td>';
    rows+='</tr>';

    cardRows.push({
      pName: pName,
      pNameDisplay: zwDisplayPalaceName(pName),
      icon: icon,
      defn: zwGungDef(pName),
      starsDisp: starsDisp,
      auxDisp: auxDisp || '<span style="color:#64748b">없음</span>',
      summaryText: summaryText,
      rowBg: rowBg,
      borderColor: mainSihua==='화기' ? '#f87171' : (mainSihua ? '#4ade80' : 'rgba(255,255,255,0.12)')
    });
  }

  var legendHtml = '<div class="zw-summary-legend" style="padding:8px 12px 6px;font-size:0.71rem;color:#64748b;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;gap:14px;flex-wrap:wrap;word-break:keep-all">'
    +'<span>강약: <b style="color:#fde68a;letter-spacing:.12em">廟 旺 得 利 平 不 陷</b> — 왼쪽일수록 별의 성질이 또렷한 자리 · 길흉 아님 · 글자 없는 별은 강약을 매기지 않음</span>'
    +'<span>차성(借星)은 맞은편 궁에 실제로 앉은 자리의 강약을 그대로 적음</span>'
    +'<span>사화: <b style="color:#4ade80">화록▲</b>=재물·인연 · <b style="color:#60a5fa">화권▲</b>=권위 · <b style="color:#c084fc">화과▲</b>=명성 · <b style="color:#f87171">화기▼</b>=주의</span>'
    +'</div>';
  var focusRows = ['명궁','관록궁','재백궁','부부궁'].map(function(name) {
    return cardRows.filter(function(it) { return it.pName === name; })[0] || null;
  }).filter(Boolean);
  if (!focusRows.length) focusRows = cardRows.slice(0, 4);
  var focusMapHtml = '<div data-cd-marker="ziwei-palace-map-collapsed-v20260614" style="padding:11px 12px 12px;background:linear-gradient(145deg,rgba(15,23,42,0.72),rgba(30,27,75,0.42));border-bottom:1px solid rgba(196,181,253,0.16);">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-bottom:9px;">'
      +'<div><div style="color:#fde68a;font-size:0.78rem;font-weight:900;">12궁 핵심 지도</div><div style="color:#94a3b8;font-size:0.71rem;line-height:1.5;margin-top:2px;">명반에서 먼저 볼 4개 축만 압축했습니다.</div></div>'
      +'<span style="color:#c4b5fd;border:1px solid rgba(196,181,253,0.28);border-radius:999px;padding:3px 8px;font-size:0.68rem;font-weight:900;">전체 상세 접힘</span>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:8px;">'
      +focusRows.map(function(it) {
        var oneLine = String(it.summaryText || '').split('.').slice(0, 1).join('.').trim();
        if (oneLine && oneLine.charAt(oneLine.length - 1) !== '.') oneLine += '.';
        return '<div style="background:rgba(2,6,23,0.38);border:1px solid rgba(255,255,255,0.1);border-left:4px solid '+it.borderColor+';border-radius:10px;padding:9px 10px;min-width:0;">'
          +'<div style="color:#fef3c7;font-size:0.83rem;font-weight:900;line-height:1.35;">'+it.icon+' '+it.pNameDisplay+'</div>'
          +'<div style="color:#64748b;font-size:0.68rem;margin-top:2px;">'+it.defn+'</div>'
          +'<div style="color:#fde68a;font-size:0.76rem;line-height:1.55;margin-top:6px;">'+it.starsDisp+'</div>'
          +'<div style="color:#cbd5e1;font-size:0.72rem;line-height:1.55;margin-top:6px;">'+oneLine+'</div>'
        +'</div>';
      }).join('')
    +'</div>'
  +'</div>';

  if (isCompactView) {
    var cardsHtml = cardRows.map(function(it) {
      return '<div class="zw-summary-card" style="background:'+it.rowBg+';border:1px solid rgba(255,255,255,0.1);border-left:4px solid '+it.borderColor+';border-radius:10px;padding:10px 12px">'
        +'<div class="zw-summary-card__title" style="font-weight:800;color:#d8b4fe;font-size:0.84rem;line-height:1.35">'+it.icon+' '+it.pNameDisplay+'</div>'
        +'<div class="zw-summary-card__defn" style="color:#64748b;font-size:0.69rem;margin-top:2px">'+it.defn+'</div>'
        +'<div class="zw-summary-card__label" style="margin-top:8px;font-size:0.78rem;color:#c084fc">주성</div>'
        +'<div class="zw-summary-card__stars" style="margin-top:2px;color:#fde68a;font-size:0.8rem;line-height:1.75">'+it.starsDisp+'</div>'
        +'<div class="zw-summary-card__label" style="margin-top:8px;font-size:0.78rem;color:#c084fc">보조성</div>'
        +'<div class="zw-summary-card__aux" style="margin-top:2px;font-size:0.74rem;color:#94a3b8;line-height:1.55">'+it.auxDisp+'</div>'
        +'<div class="zw-summary-card__label" style="margin-top:8px;font-size:0.78rem;color:#c084fc">핵심 해석</div>'
        +'<div class="zw-summary-card__summary" style="margin-top:2px;font-size:0.79rem;color:#e2e8f0;line-height:1.6;word-break:keep-all">'+it.summaryText+'</div>'
      +'</div>';
    }).join('');

    return focusMapHtml
      +'<details style="border-top:1px solid rgba(255,255,255,0.06);">'
        +'<summary style="list-style:none;cursor:pointer;padding:12px 13px;color:#c4b5fd;font-size:0.82rem;font-weight:900;">전체 12궁 상세 펼치기</summary>'
        +legendHtml
        +'<div class="zw-summary-cards" style="padding:10px 10px 12px;display:grid;grid-template-columns:1fr;gap:10px">'+cardsHtml+'</div>'
      +'</details>';
  }

  return focusMapHtml
    +'<details style="border-top:1px solid rgba(255,255,255,0.06);">'
      +'<summary style="list-style:none;cursor:pointer;padding:12px 13px;color:#c4b5fd;font-size:0.82rem;font-weight:900;">전체 12궁 상세 펼치기</summary>'
      +legendHtml
      +'<div class="zw-summary-table-wrap" style="overflow-x:auto"><table class="zw-summary-table" style="width:100%;border-collapse:collapse;min-width:540px">'
      +'<thead><tr style="background:rgba(88,28,220,0.3)">'
      +'<th style="padding:8px 10px;text-align:left;color:#c084fc;font-size:0.74rem;white-space:nowrap">궁(宮) · 정의</th>'
      +'<th style="padding:8px 10px;text-align:left;color:#c084fc;font-size:0.74rem">주성(강약)</th>'
      +'<th style="padding:8px 10px;text-align:left;color:#c084fc;font-size:0.74rem;white-space:nowrap">보조성</th>'
      +'<th style="padding:8px 10px;text-align:left;color:#c084fc;font-size:0.74rem">한줄 해석</th>'
      +'</tr></thead>'
      +'<tbody>'+rows+'</tbody>'
      +'</table></div>'
    +'</details>';
}
var ZW_PALACE_DEEP_FRAME = {
  '명궁':   { q: '나는 어떤 사람이고, 인생의 기본 태도는 무엇인가', field: 'self',   label: '기질 발현' },
  '형제궁': { q: '가장 가까운 사람들과 어떻게 협력하는가',          field: 'people', label: '관계 발현' },
  '부부궁': { q: '배우자·파트너와 어떤 약속을 맺는가',              field: 'people', label: '관계 발현' },
  '자녀궁': { q: '무엇을 낳고 기르는가 — 자녀·작품·후배',           field: 'people', label: '생산 발현' },
  '재백궁': { q: '돈을 어떻게 벌고 어떻게 쓰는가',                  field: 'money',  label: '재물 발현' },
  '질액궁': { q: '몸과 컨디션은 어떤 리듬으로 움직이는가',          field: 'self',   label: '컨디션 발현' },
  '천이궁': { q: '바깥 무대에서 나는 어떻게 평가받는가',            field: 'work',   label: '대외 발현' },
  '노복궁': { q: '동료·아랫사람 운은 어떻게 흐르는가',              field: 'people', label: '인맥 발현' },
  '관록궁': { q: '커리어의 성취는 어떤 방식으로 오는가',            field: 'work',   label: '직업 발현' },
  '전택궁': { q: '자산과 생활 기반은 어떻게 쌓이는가',              field: 'money',  label: '자산 발현' },
  '복덕궁': { q: '내 마음은 무엇으로 채워지는가',                   field: 'self',   label: '내면 발현' },
  '부모궁': { q: '윗사람·문서 인연은 어떻게 작동하는가',            field: 'people', label: '후원 발현' }
};
// 강약은 길흉이 아니라 그 별의 성질이 얼마나 또렷하게 드러나는가다. 7등급을 접지 않는다.
var ZW_BR_DEEP_PHRASE = {
  '묘': '이 자리에서 별의 성질이 가장 또렷하고 안정적으로 드러납니다(廟). 장점과 습관이 모두 선명하게 보입니다.',
  '왕': '이 자리에서 별의 성질이 힘 있게 드러납니다(旺). 별이 가진 방식이 그대로 행동으로 이어지기 쉽습니다.',
  '득': '자리를 얻어 별의 성질이 무난히 드러납니다(得). 장점이 안정적으로 발현됩니다.',
  '리': '쓸 만하지만 힘이 한 단계 덜한 자리입니다(利). 방향만 맞추면 충분히 힘을 냅니다.',
  '평': '중간 자리입니다(平). 함께 앉은 별·사화·맞은편 궁에 따라 드러나는 모습이 크게 달라집니다.',
  '불': '자리를 얻지 못해 힘이 약합니다(不). 별의 장점이 저절로 드러나지 않으니 보완 조건을 함께 보세요.',
  '함': '별의 성질이 막히거나 비틀려 드러나기 쉬운 자리입니다(陷). 장점보다 그림자가 먼저 나오기 쉬우니 주의점을 먼저 읽으세요.'
};
var ZW_AUX_STAR_EFFECT = {
  '천괴': '어려울 때 손을 내미는 윗사람·남성 귀인의 도움이 붙습니다',
  '천월': '실질적 도움을 주는 여성 귀인·실무 조력이 붙습니다',
  '좌보': '묵묵히 곁을 지키는 조력자가 힘을 보탭니다',
  '우필': '융통성 있는 지원군이 우회로를 열어줍니다',
  '문창': '문서·시험·글 재능이 빛을 더합니다',
  '문곡': '말과 예술 감각이 매력을 더합니다',
  '녹존': '꾸준히 쌓이는 재록(財祿)이 바닥을 받쳐줍니다',
  '천마': '이동과 변화가 기회로 연결되는 역마의 활력이 붙습니다'
};
var ZW_SIHUA_DEEP_PHRASE = {
  '화록': '재물과 인연의 문이 이 궁에서 열립니다. 여기서 생기는 기회는 사소해 보여도 실익으로 연결될 확률이 높으니, 들어오는 제안을 기록하고 회수 구조(보수·지분·재방문)로 이어 두세요.',
  '화권': '주도권의 깃발이 이 궁에 꽂혔습니다. 이 영역에서는 눈치 보지 말고 먼저 기준을 제시하세요. 다만 권한이 커지는 만큼 견제도 따라오니, 공을 나누는 말 한마디를 세트로 챙기세요.',
  '화과': '이름과 평판이 쌓이는 자리입니다. 이 영역의 결과물은 반드시 기록·문서·공개 형태로 남기세요. 시험·자격·발표처럼 평가받는 일에 유리한 바람이 붑니다.',
  '화기': '얽힘과 정산의 숙제가 걸린 자리입니다. 이 영역에서는 말·계약·돈 문제를 두 번 확인하고, 애매한 약속은 반드시 문장으로 남기세요. 잘 관리하면 오히려 가장 단단해지는 궁이 됩니다.'
};
function zwDeepPalaceBranchIdx(pd, pName) {
  var zhi = pd && pd.palaces ? pd.palaces[pName] : '';
  var idx = ZW_DEEP_ZHI_LIST.indexOf(zhi);
  if (idx >= 0) return idx;
  return pd && pd.palacesByIndex ? pd.palacesByIndex.indexOf(pName) : -1;
}
function zwDeepStarNames(entry) {
  var names = [];
  if (!entry) return names;
  ['stars','auxStars','badStars'].forEach(function(k){
    (entry[k] || []).forEach(function(s){ if (s && s.name) names.push(s.name); });
  });
  return names;
}
/* ── 12궁 정밀 해설 (ziwei_twelve_palaces) ── */
function buildZwTwelvePalaceDeepHtml(pd) {
  try {
    if (!pd || !Array.isArray(pd.palaceStarData) || !pd.palaceStarData.length) return '';
    var cards = '';
    for (var pi = 0; pi < ZW_PALACE_ORDER.length; pi += 1) {
      var pName = ZW_PALACE_ORDER[pi];
      var frame = ZW_PALACE_DEEP_FRAME[pName];
      var entry = zwDeepPalaceEntry(pd, pName);
      if (!frame || !entry) continue;
      var mains = zwDeepMainStars(entry);
      var branchIdx = zwDeepPalaceBranchIdx(pd, pName);
      var body = '';
      body += '<div style="color:#c4b5fd;font-size:0.78rem;margin-bottom:8px;">이 궁이 답하는 질문 — <b style="color:#e9d5ff;">'+zwDeepEsc(frame.q)+'</b></div>';
      body += '<div style="color:#cbd5e1;font-size:0.78rem;line-height:1.7;margin-bottom:10px;">'+zwDeepEsc(zwGungBrief(pName) || '')+'</div>';
      if (mains.length) {
        mains.slice(0, 2).forEach(function(st){
          var prof = zwStarProfile(st.name);
          var brPhrase = ZW_BR_DEEP_PHRASE[st.strength] || '';
          body += '<div style="background:rgba(2,6,23,0.38);border:1px solid rgba(196,181,253,0.18);border-radius:10px;padding:10px 11px;margin-bottom:8px;">'
            +'<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:5px;">'
              +'<b style="color:#fde68a;font-size:0.88rem;">'+zwDeepEsc(st.name)+'</b>'
              +zwDeepBrTag(st.strength)
              +(st.borrowed ? '<span style="color:#facc15;font-size:0.68rem;font-weight:800;">차성(대궁 차용)</span>' : '')
              +'<span style="color:#a5b4fc;font-size:0.72rem;">'+zwDeepEsc(prof.essence)+'</span>'
            +'</div>'
            +'<div style="margin-bottom:4px;"><b style="color:#c4b5fd;">'+zwDeepEsc(frame.label)+':</b> '+zwDeepEsc(prof[frame.field])+'</div>'
            +'<div style="color:#94a3b8;font-size:0.78rem;">'+zwDeepEsc(brPhrase)
            +(st.borrowed ? ' 차성은 맞은편 궁에 실제로 앉은 자리의 강약으로 읽습니다.' : '')+'</div>'
            +(st.strength === '함' || st.strength === '불' || st.strength === '평'
              ? '<div style="color:#fca5a5;font-size:0.78rem;margin-top:4px;"><b>그림자:</b> '+zwDeepEsc(prof.shadow)+'</div>'
              : '')
          +'</div>';
        });
      } else {
        body += '<div style="background:rgba(2,6,23,0.38);border:1px solid rgba(148,163,184,0.2);border-radius:10px;padding:10px 11px;margin-bottom:8px;color:#cbd5e1;">'
          +'이 궁은 <b style="color:#e2e8f0;">공궁(空宮)</b>입니다. 고정된 성향보다 환경과 상대에 따라 유연하게 반응하는 축이라, 기준을 스스로 세우는 것이 가장 중요한 개운법입니다. 판단할 때는 마주 보는 대궁의 별을 빌려(차성) 보수적으로 읽습니다.'
        +'</div>';
      }
      var auxNames = (entry.auxStars || []).map(function(s){ return s.name; }).filter(function(n){ return ZW_AUX_STAR_EFFECT[n]; });
      var badNames = (entry.badStars || []).map(function(s){ return s.name; }).filter(function(n){ return ZW_BAD_STAR_EFFECT[n]; });
      if (auxNames.length) {
        body += '<div style="margin-bottom:6px;"><b style="color:#93c5fd;">받쳐주는 별:</b> '
          + auxNames.slice(0, 3).map(function(n){ return '<b>'+zwDeepEsc(n)+'</b> — '+zwDeepEsc(ZW_AUX_STAR_EFFECT[n]); }).join(' · ')
        +'</div>';
      }
      if (badNames.length) {
        body += '<div style="margin-bottom:6px;"><b style="color:#fca5a5;">긴장을 만드는 별:</b> '
          + badNames.slice(0, 3).map(function(n){ return '<b>'+zwDeepEsc(n)+'</b> — '+zwDeepEsc(ZW_BAD_STAR_EFFECT[n]); }).join(' · ')
        +'</div>';
      }
      var sihuaHits = [];
      ['stars','auxStars'].forEach(function(k){
        (entry[k] || []).forEach(function(s){ if (s && s.sihua && ZW_SIHUA_DEEP_PHRASE[s.sihua]) sihuaHits.push(s); });
      });
      sihuaHits.slice(0, 2).forEach(function(s){
        var col = ZW_SIHUA_COLOR[s.sihua] || '#c4b5fd';
        body += '<div style="background:rgba(2,6,23,0.3);border-left:none;border:1px solid '+col+'33;border-radius:9px;padding:8px 10px;margin-bottom:6px;font-size:0.8rem;">'
          +'<b style="color:'+col+';">'+zwDeepEsc(s.name)+' '+zwDeepEsc(s.sihua)+'</b> — '+zwDeepEsc(ZW_SIHUA_DEEP_PHRASE[s.sihua])
        +'</div>';
      });
      if (branchIdx >= 0 && pd.palacesByIndex) {
        var _tri = zwTriadIndexes(branchIdx);
        var oppIdx = _tri.opposite, triA = _tri.triA, triB = _tri.triB;
        var relNames = [oppIdx, triA, triB].map(function(idx){
          var rp = pd.palacesByIndex[idx] || '';
          var re = zwDeepPalaceEntry(pd, rp);
          var rs = zwDeepMainStars(re);
          return zwDeepEsc(rp) + (rs.length ? '(' + zwDeepEsc(rs.map(function(s){ return s.name; }).slice(0, 2).join('·')) + ')' : '(공궁)');
        });
        var relStarsAll = [oppIdx, triA, triB].reduce(function(acc, idx){
          return acc.concat(zwDeepStarNames(zwDeepPalaceEntry(pd, pd.palacesByIndex[idx] || '')));
        }, zwDeepStarNames(entry));
        var relHasGi = ['stars','auxStars'].some(function(k){
          return [entry].concat([oppIdx, triA, triB].map(function(idx){ return zwDeepPalaceEntry(pd, pd.palacesByIndex[idx] || ''); }))
            .some(function(e){ return e && (e[k] || []).some(function(s){ return s && s.sihua === '화기'; }); });
        });
        var relGoodCnt = relStarsAll.filter(function(n){ return ZW_AUX_STAR_EFFECT[n]; }).length;
        var relSummary = relHasGi
          ? '흐름에 제동 장치가 하나 걸려 있어, 속도 조절이 필요한 구조입니다.'
          : (relGoodCnt >= 2
            ? '받쳐주는 손이 많은 안정 구조입니다. 협력을 끌어들일수록 결과가 커집니다.'
            : '스스로 균형을 만들어야 하는 자율 구조입니다. 기준과 루틴이 곧 귀인입니다.');
        body += '<div style="margin-bottom:6px;color:#cbd5e1;font-size:0.79rem;"><b style="color:#a5b4fc;">삼방사정:</b> 이 궁은 홀로 작동하지 않습니다. 정면의 '+relNames[0]+' 기류가 마주 들어오고, '+relNames[1]+' · '+relNames[2]+' 두 궁이 삼합으로 힘을 보탭니다. 네 궁을 겹쳐 읽으면 — '+zwDeepEsc(relSummary)+'</div>';
      }
      var adviceProf = mains.length ? zwStarProfile(mains[0].name) : null;
      body += '<div style="background:linear-gradient(120deg,rgba(110,231,183,0.1),rgba(2,6,23,0.2));border:1px solid rgba(110,231,183,0.24);border-radius:9px;padding:8px 10px;color:#d1fae5;font-size:0.8rem;">'
        +'<b>실전 조언:</b> '+zwDeepEsc(adviceProf ? adviceProf.advice : '이 궁의 결정은 혼자 정하지 말고, 신뢰하는 한 사람의 의견을 거쳐 확정하세요. 공궁 축은 검증 절차가 곧 힘입니다.')
      +'</div>';
      var chipStars = mains.length
        ? mains.map(function(s){ var g = zwStrengthToSymbol(s.strength); return zwDeepEsc(s.name)+(g ? '('+g+')' : ''); }).join(' · ')
        : '공궁';
      cards += zwDeepCardShell(ZW_PALACE_ICON[pName] || '◆', zwDisplayPalaceName(pName), chipStars, body, pName === '명궁' ? '#fde68a' : '#c4b5fd', pName === '명궁');
    }
    if (!cards) return '';
    return '<div data-cd-marker="ziwei-12palace-deep-v20260711" style="padding:12px 12px 6px;border-top:1px solid rgba(139,92,246,0.25);">'
      + zwDeepSectionHead('12궁 정밀 해설 — 궁별 심층 리딩', '위 요약 지도의 근거를 궁마다 펼쳐 설명합니다. 각 카드는 주성의 본질과 강약(廟·旺·得·利·平·不·陷), 보조성·흉성, 사화, 삼방사정을 겹쳐 읽은 결과입니다.', '#6ee7b7')
      + cards
      + '<div style="color:#64748b;font-size:0.7rem;line-height:1.55;margin:8px 2px 6px;">읽는 순서 팁: 명궁 → 관록궁 → 재백궁 → 부부궁을 먼저 읽고, 나머지 궁은 지금 고민과 닿는 곳부터 여세요. 같은 별도 궁과 밝기에 따라 전혀 다르게 작동합니다.</div>'
    +'</div>';
  } catch (_deepErr) { return ''; }
}

// ── 부부궁 심화 상담(ziwei_love_deep) 생성기 — js/saju-engine.js 최상위 선언 원문 ──
/* ── 부부궁 심화 상담 (ziwei_love_deep) ── */
function buildZwSpouseDeepHtml(pd) {
  try {
    var entry = zwDeepPalaceEntry(pd, '부부궁');
    var mingEntry = zwDeepPalaceEntry(pd, '명궁');
    if (!entry) return '';
    var mains = zwDeepMainStars(entry);
    var mingMains = zwDeepMainStars(mingEntry);
    var badNames = (entry.badStars || []).map(function(s){ return s.name; }).filter(function(n){ return ZW_BAD_STAR_EFFECT[n]; });
    var hasGi = ['stars','auxStars'].some(function(k){ return (entry[k] || []).some(function(s){ return s && s.sihua === '화기'; }); });
    var risk = (hasGi || badNames.length >= 2) ? 'high' : (badNames.length === 1 ? 'mid' : 'low');
    var html = '<div data-cd-marker="ziwei-spouse-deep-v20260711" style="margin-top:12px;">';
    html += zwDeepSectionHead('전문가 심층 상담 — 배우자의 얼굴, 관계의 시간표', '부부궁의 별 배치와 대한 흐름을 근거로, 상담실에서 드리는 수준의 관계 해설을 이어갑니다.', '#f9a8d4');

    var spouseBody = '';
    if (mains.length) {
      mains.slice(0, 2).forEach(function(st){
        var prof = zwStarProfile(st.name);
        spouseBody += '<div style="margin-bottom:8px;">'
          +'<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:4px;"><b style="color:#fecdd3;font-size:0.87rem;">'+zwDeepEsc(st.name)+'</b>'+zwDeepBrTag(st.strength)
          +(st.borrowed ? '<span style="color:#facc15;font-size:0.68rem;font-weight:800;">차성 — 대궁(관록궁)에서 빌려 읽음</span>' : '')+'</div>'
          +'<div style="margin-bottom:3px;"><b style="color:#f9a8d4;">배우자의 결:</b> '+zwDeepEsc(prof.spouse)+'</div>'
          +'<div style="color:#cbd5e1;font-size:0.8rem;"><b style="color:#fbcfe8;">만나는 길:</b> '+zwDeepEsc(prof.spousePath)+'</div>'
        +'</div>';
      });
    } else {
      spouseBody += '<div style="color:#cbd5e1;">부부궁이 공궁이라 배우자상이 하나로 고정되어 있지 않습니다. 이는 나쁜 신호가 아니라, 만나는 시기와 환경에 따라 인연의 얼굴이 크게 달라진다는 뜻입니다. 그래서 "어떤 사람을 고르느냐"보다 "어느 시기에, 어떤 상태의 나로 만나느냐"가 훨씬 중요합니다. 아래 시기 상담을 먼저 읽으세요.</div>';
    }
    html += zwDeepCardShell('💞', '배우자상 정밀 리딩', mains.length ? mains.map(function(s){ return zwDeepEsc(s.name); }).join('·') : '공궁 — 시기 중심 해석', spouseBody, '#f9a8d4', true);

    if (mingMains.length && mains.length) {
      var a = zwStarProfile(mingMains[0].name);
      var b = zwStarProfile(mains[0].name);
      var chemBody = '<div style="margin-bottom:5px;">나(명궁 <b style="color:#fde68a;">'+zwDeepEsc(mingMains[0].name)+'</b>)의 관계 언어는 <b style="color:#fef3c7;">"'+zwDeepEsc(a.loveNeed)+'"</b>이고, 배우자 자리(부부궁 <b style="color:#fecdd3;">'+zwDeepEsc(mains[0].name)+'</b>)의 약속 조건은 <b style="color:#ffe4e6;">"'+zwDeepEsc(b.loveNeed)+'"</b>입니다.</div>'
        +'<div style="margin-bottom:5px;">이 두 언어가 서로 번역되는 동안 관계는 깊어지고, 번역을 멈추는 순간 각자 외로워집니다. 갈등의 불씨는 주로 <b style="color:#fda4af;">"'+zwDeepEsc(b.loveFriction)+'"</b>에서 시작되고, 나의 <b style="color:#fda4af;">"'+zwDeepEsc(a.loveFriction)+'"</b> 반응이 그 불을 키웁니다.</div>'
        +'<div style="color:#d1fae5;background:rgba(110,231,183,0.08);border:1px solid rgba(110,231,183,0.22);border-radius:8px;padding:7px 9px;font-size:0.8rem;"><b>처방:</b> 싸움이 시작되면 누가 옳은지 정하지 말고, 지금 상대가 "'+zwDeepEsc(b.loveNeed)+'"의 결핍을 말하고 있는 건 아닌지 먼저 확인하세요. 결핍을 짚어주는 한 문장이 논쟁 열 마디를 이깁니다.</div>';
      html += zwDeepCardShell('⚗️', '명궁 × 부부궁 케미', zwDeepEsc(mingMains[0].name)+' × '+zwDeepEsc(mains[0].name), chemBody, '#c084fc', false);
    }

    var stageMeet = mains.length
      ? '이 인연은 '+zwDeepEsc(zwStarProfile(mains[0].name).spousePath)+' 시작 단계에서는 서로의 장점만 보이므로, 오히려 상대의 "'+zwDeepEsc(zwStarProfile(mains[0].name).loveFriction)+'" 신호를 한 번쯤 담담하게 관찰해 두세요. 콩깍지 시기의 메모가 훗날의 나침반이 됩니다.'
      : '공궁 배치는 시작이 조용한 편입니다. 첫인상보다 세 번째 만남의 편안함을 기준으로 판단하세요.';
    var stageConflict = risk === 'high'
      ? '이 명반의 갈등기는 짧고 굵게 오는 유형입니다. '+(hasGi ? '부부궁에 화기(忌)가 걸려 있어 말과 정산(돈·집안일·시간) 문제가 얽히기 쉽습니다. ' : '')+(badNames.length ? '특히 '+zwDeepEsc(badNames.join('·'))+'의 긴장이 감정 폭발의 방아쇠가 됩니다. ' : '')+'규칙 하나만 지키세요 — 감정이 올라온 날은 결론을 내리지 않는다. 다음 날 같은 주제를 다시 꺼내면 대화의 절반은 이미 풀려 있습니다.'
      : (risk === 'mid'
        ? '갈등은 대체로 한 가지 패턴('+zwDeepEsc(badNames[0] || '')+' — '+zwDeepEsc(ZW_BAD_STAR_EFFECT[badNames[0]] || '작은 마찰')+')으로 반복됩니다. 패턴을 상대와 공유하는 것 자체가 절반의 해결입니다.'
        : '큰 흉성 압박이 없는 배치라, 갈등기는 극적인 사건보다 "권태와 무심함"으로 옵니다. 문제가 없다는 것이 곧 관리가 필요 없다는 뜻은 아닙니다. 계절마다 한 번, 관계의 안부를 묻는 대화를 일부러 만드세요.');
    var stageSettle = mains.length
      ? '정착기의 핵심은 "'+zwDeepEsc(zwStarProfile(mains[0].name).loveNeed)+'"의 꾸준한 공급입니다. 이벤트보다 생활 속 반복(말투·역할 분담·기념 방식)으로 설계하세요. '+zwDeepEsc(zwStarProfile(mains[0].name).spouse)
      : '정착기에는 두 사람만의 규칙 문서(돈·집안일·부모님·휴식)를 만들면 공궁의 유연함이 그대로 강점이 됩니다.';
    var scenarioBody = '<div style="display:grid;gap:7px;">'
      +'<div style="background:rgba(2,6,23,0.34);border-radius:9px;padding:8px 10px;"><b style="color:#fbcfe8;">1단계 · 만남기</b><br>'+stageMeet+'</div>'
      +'<div style="background:rgba(2,6,23,0.34);border-radius:9px;padding:8px 10px;"><b style="color:#fda4af;">2단계 · 갈등기</b><br>'+stageConflict+'</div>'
      +'<div style="background:rgba(2,6,23,0.34);border-radius:9px;padding:8px 10px;"><b style="color:#f9a8d4;">3단계 · 정착기</b><br>'+stageSettle+'</div>'
    +'</div>';
    html += zwDeepCardShell('🗺️', '연애 → 결혼 전개 시나리오', risk === 'high' ? '집중 관리형' : (risk === 'mid' ? '패턴 관리형' : '온도 유지형'), scenarioBody, '#fda4af', false);

    var daList = Array.isArray(pd.daHanList) ? pd.daHanList : [];
    var birthYear = 0;
    try { birthYear = Number((window._ziweiBirth || {}).year) || 0; } catch (_by) {}
    var nowYear = _zwNowYear();
    var curAge = birthYear > 0 ? (nowYear - birthYear + 1) : 0;
    var timingRows = '';
    daList.forEach(function(dh){
      if (!dh || (dh.palaceName !== '부부궁' && dh.palaceName !== '관록궁')) return;
      var isSpouse = dh.palaceName === '부부궁';
      var isNow = curAge > 0 && curAge >= dh.startAge && curAge <= dh.endAge;
      timingRows += '<div style="display:flex;gap:9px;align-items:flex-start;background:rgba(2,6,23,0.3);border:1px solid '+(isNow ? 'rgba(253,224,71,0.5)' : 'rgba(244,114,182,0.18)')+';border-radius:9px;padding:8px 10px;margin-bottom:6px;">'
        +'<b style="color:'+(isNow ? '#fde047' : '#f9a8d4')+';white-space:nowrap;font-size:0.82rem;">'+dh.startAge+'~'+dh.endAge+'세'+(isNow ? ' · 지금' : '')+'</b>'
        +'<span style="font-size:0.8rem;color:#e2e8f0;">'
        +(isSpouse
          ? '대한이 <b>부부궁</b>을 지나는 10년 — 관계가 인생의 주제로 올라옵니다. 만남·결혼·관계 재정비 등 부부궁의 숙제가 실제 사건으로 나타나기 쉬운 구간이라, 공식화(결혼·동거·재약속)를 진지하게 검토하기 좋은 시기입니다.'
          : '대한이 <b>관록궁</b>(부부궁의 대궁)을 지나는 10년 — 일과 관계가 정면으로 마주 봅니다. 커리어의 변화가 관계의 조건을 바꾸는 시기이니, 큰 결정(이직·개업)은 배우자와의 합의를 먼저 만드세요.')
        +'</span>'
      +'</div>';
    });
    if (timingRows) {
      html += zwDeepCardShell('⏳', '공식화 시기 상담', curAge > 0 ? '현재 ' + curAge + '세 기준' : '대한 기준', '<div>'+timingRows+'<div style="color:#94a3b8;font-size:0.72rem;">대한(10년 운) 기준의 큰 흐름입니다. 특정 연도의 판단은 아래 연간 흐름 장과 겹쳐 읽으세요.</div></div>', '#fbcfe8', false);
    }

    var script1, script2, script3;
    if (badNames.indexOf('경양') >= 0 || badNames.indexOf('타라') >= 0) {
      script1 = '"방금 그 말은 나한테 좀 아프게 닿았어. 공격하려던 게 아니라는 건 알아."';
      script2 = '"우리 이 얘기, 지금 결론 내지 말고 내일 저녁에 다시 하자. 도망가는 게 아니라 잘 매듭짓고 싶어서야."';
      script3 = '"고마웠던 걸 말 안 하고 지나갔네. 지난주에 ○○해준 거, 나 진짜 좋았어."';
    } else if (badNames.indexOf('화성') >= 0 || badNames.indexOf('영성') >= 0) {
      script1 = '"나 지금 화가 올라와서 말이 세질 것 같아. 20분만 걷고 와서 다시 얘기할게."';
      script2 = '"네가 갑자기 그렇게 하면 나는 놀라. 미리 한마디만 해주면 나는 다 맞출 수 있어."';
      script3 = '"오늘은 아무 문제 없이 그냥 좋다. 이런 날이 있다는 걸 말해두고 싶었어."';
    } else if (badNames.indexOf('지공') >= 0 || badNames.indexOf('지겁') >= 0) {
      script1 = '"돈 얘기를 미루면 우리 둘 다 불안해지더라. 이번 주말에 30분만 가계 회의하자."';
      script2 = '"현실이 빠듯해도 네 탓이 아니야. 우리가 구조를 같이 고치면 되는 문제야."';
      script3 = '"막연히 걱정하지 말고, 딱 하나만 정하자 — 이번 달에 우리가 지킬 숫자 하나."';
    } else {
      script1 = '"요즘 우리 사이에 아무 일도 없는데, 그래서 오히려 네 마음이 궁금해."';
      script2 = '"서운한 게 생기면 3일 안에 말하기로 하자. 나도 그렇게 할게."';
      script3 = '"우리가 잘 지내는 이유를 하나씩 말해보자. 나부터 할게 — ○○."';
    }
    var scriptBody = '<div style="color:#cbd5e1;font-size:0.79rem;margin-bottom:7px;">이 명반의 갈등 유형에 맞춰 고른, 실제로 입 밖에 낼 수 있는 문장들입니다. 외우지 말고 당신의 말투로 바꿔 쓰세요.</div>'
      +'<div style="display:grid;gap:6px;">'
      +'<div style="background:rgba(2,6,23,0.34);border-radius:8px;padding:8px 10px;font-size:0.83rem;color:#ffe4e6;">'+zwDeepEsc(script1)+'</div>'
      +'<div style="background:rgba(2,6,23,0.34);border-radius:8px;padding:8px 10px;font-size:0.83rem;color:#ffe4e6;">'+zwDeepEsc(script2)+'</div>'
      +'<div style="background:rgba(2,6,23,0.34);border-radius:8px;padding:8px 10px;font-size:0.83rem;color:#ffe4e6;">'+zwDeepEsc(script3)+'</div>'
      +'</div>';
    html += zwDeepCardShell('💬', '갈등 유형별 대화 스크립트', badNames.length ? zwDeepEsc(badNames.join('·'))+' 대응' : '온도 유지 대화', scriptBody, '#fecdd3', false);

    html += '</div>';
    return html;
  } catch (_spouseErr) { return ''; }
}

// ── 부부궁 심화 상담 생성기가 쓰는 표·보조 함수 — js/saju-engine.js 최상위 선언 원문 ──
var ZW_BAD_STAR_EFFECT = {
  '경양': '날카로운 칼끝 — 서두른 말과 결정이 상처를 냅니다. 한 템포 늦추세요',
  '타라': '바퀴에 걸린 돌 — 일이 늘어지고 반복됩니다. 마감을 두 번 확인하세요',
  '화성': '갑자기 붙는 불 — 돌발 변수와 욱하는 감정을 조심하세요',
  '영성': '속에서 타는 불 — 겉은 조용해도 스트레스가 쌓입니다. 배출구를 만드세요',
  '지공': '허공에 뜬 생각 — 이상은 높지만 현실 회수가 약해집니다. 계획에 숫자를 넣으세요',
  '지겁': '빠져나가는 구멍 — 예상 밖 지출과 손실 경로를 점검하세요'
};
// 등급은 글자로만 구분한다(색으로 좋고 나쁨을 나타내지 않는다). 강약 없는 별은 표기 없음.
function zwDeepBrTag(strength) {
  var glyph = zwStrengthToSymbol(strength);
  if (!glyph) return '';
  return '<span title="'+zwStrengthShortMeaning(strength)+'" style="color:#fde68a;border:1px solid rgba(253,230,138,0.35);border-radius:999px;padding:1px 7px;font-size:0.72rem;font-weight:800;">'+glyph+'</span>';
}

// ── 상징 보조층(ziwei_symbolic_layer) 생성기 — js/saju-engine.js 최상위 선언 원문 ──
/* ── 상징 보조층 확장 (ziwei_symbolic_layer) ── */
function buildZwSymbolicDeepHtml(ctx) {
  try {
    if (!ctx || !ctx.ming) return '';
    var mingProf = zwStarProfile(ctx.ming.star) || null;
    var shenProf = ZW_STAR_CORE_PROFILE[ctx.shen && ctx.shen.star] || null;
    var html = '<div data-cd-marker="ziwei-symbolic-deep-v20260711" style="margin-top:12px;">';
    html += zwDeepSectionHead('인장 서사 — 상징을 생활 언어로 풀기', '위 인장 카드들이 왜 당신의 명반에서 나왔는지, 그리고 일상에서 어떻게 쓰는지 이어서 설명합니다.', '#fde68a');

    var sealRows = [
      { icon: '☀️', title: '본명 인장 · ' + (ctx.ming.god || '-'), accent: '#fde68a',
        origin: '명궁('+(ctx.ming.palaceName || '-')+')의 주성 '+(ctx.ming.star || '공궁')+'에서 길어 올린 상징입니다.',
        meaning: mingProf ? mingProf.essence + ' — ' + mingProf.self : '공궁 명궁은 정해진 얼굴이 없는 대신, 어떤 상징이든 배울 수 있는 그릇을 뜻합니다.',
        use: mingProf ? '중요한 결정을 앞둔 날, 이 인장의 언어로 자문하세요 — "지금 나는 ' + mingProf.essence + '답게 움직이고 있는가?"' : '결정을 앞둔 날에는 기준 문장을 먼저 적고 움직이세요.' },
      { icon: '🏛️', title: '현실축 인장 · ' + ((ctx.shen && ctx.shen.god) || '-'), accent: '#93c5fd',
        origin: '신궁/현실축('+((ctx.shen && ctx.shen.palaceName) || '-')+')의 '+((ctx.shen && ctx.shen.star) || '공궁')+'에서 나온 상징입니다. 본명 인장이 "타고난 나"라면, 이 인장은 "세상이 쓰는 나"입니다.',
        meaning: shenProf ? shenProf.work : '현실 무대에서의 역할은 고정돼 있지 않으니, 지금 맡은 자리의 규칙을 먼저 익히는 것이 유리합니다.',
        use: '일이 풀리지 않을 때는 본명 인장이 아니라 이 인장의 방식으로 접근을 바꿔 보세요. 기질과 역할은 다른 도구입니다.' },
      { icon: '🔥', title: '사화 인장 · ' + ((ctx.sihua && ctx.sihua.name) || '-'), accent: '#c4b5fd',
        origin: (ctx.sihua && ctx.sihua.basis) ? ctx.sihua.basis : '태어난 해의 천간이 명반에 새긴 흐름의 인장입니다.',
        meaning: '사화는 별에 계절을 입힙니다. 같은 재능도 사화의 방향에 따라 돈이 되기도, 숙제가 되기도 합니다.',
        use: '올해 계획을 세울 때 이 인장이 가리키는 영역(위 사화 근거 궁)을 첫 페이지에 두세요.' },
      { icon: '🌑', title: '그림자 인장 · ' + ((ctx.shadow && ctx.shadow.name) || '-'), accent: '#fca5a5',
        origin: (ctx.shadow && ctx.shadow.basis) ? ctx.shadow.basis : '명반에서 가장 어두워지기 쉬운 지점을 표시한 인장입니다.',
        meaning: mingProf ? '그림자는 결함이 아니라 과용된 장점입니다. 당신의 경우 — ' + mingProf.shadow : '그림자는 결함이 아니라 과용된 장점입니다.',
        use: '컨디션이 무너진 날, 이 인장이 켜졌는지 먼저 확인하세요. 그림자를 이름으로 부르는 순간 절반은 힘을 잃습니다.' }
    ];
    sealRows.forEach(function(row){
      html += '<div style="background:rgba(2,6,23,0.36);border:1px solid '+row.accent+'30;border-radius:10px;padding:10px 12px;margin-bottom:8px;">'
        +'<div style="color:'+row.accent+';font-weight:900;font-size:0.86rem;margin-bottom:5px;">'+row.icon+' '+zwDeepEsc(row.title)+'</div>'
        +'<div style="font-size:0.79rem;color:#cbd5e1;line-height:1.72;margin-bottom:3px;"><b style="color:#e2e8f0;">유래:</b> '+zwDeepEsc(row.origin)+'</div>'
        +'<div style="font-size:0.79rem;color:#cbd5e1;line-height:1.72;margin-bottom:3px;"><b style="color:#e2e8f0;">의미:</b> '+zwDeepEsc(row.meaning)+'</div>'
        +'<div style="font-size:0.79rem;color:#d1fae5;line-height:1.72;"><b>활용:</b> '+zwDeepEsc(row.use)+'</div>'
      +'</div>';
    });

    if (mingProf) {
      html += '<div style="background:linear-gradient(120deg,rgba(250,204,21,0.08),rgba(248,113,113,0.08));border:1px solid rgba(250,204,21,0.22);border-radius:10px;padding:10px 12px;margin-bottom:8px;">'
        +'<div style="color:#fde68a;font-weight:900;font-size:0.85rem;margin-bottom:5px;">⚖️ 빛과 그림자의 긴장</div>'
        +'<div style="font-size:0.8rem;color:#e2e8f0;line-height:1.75;">본명 인장('+zwDeepEsc(ctx.ming.god || '-')+')과 그림자 인장('+zwDeepEsc((ctx.shadow && ctx.shadow.name) || '-')+')은 같은 에너지의 앞뒷면입니다. '
        +zwDeepEsc(mingProf.essence)+'의 힘이 지나치게 당겨지면 "'+zwDeepEsc(mingProf.shadow)+'"의 형태로 뒤집힙니다. 그래서 이 명반의 균형추는 단순합니다 — '
        +zwDeepEsc(mingProf.advice)+'</div>'
      +'</div>';
    }

    var domains = Array.isArray(ctx.domains) ? ctx.domains.slice() : [];
    if (domains.length) {
      domains.sort(function(a, b){ return (b.score || 0) - (a.score || 0); });
      var top = domains[0], low = domains[domains.length - 1];
      html += '<div style="background:rgba(2,6,23,0.34);border:1px solid rgba(196,181,253,0.2);border-radius:10px;padding:10px 12px;">'
        +'<div style="color:#c4b5fd;font-weight:900;font-size:0.85rem;margin-bottom:5px;">🧭 생활 적용 가이드</div>'
        +'<div style="font-size:0.8rem;color:#e2e8f0;line-height:1.75;margin-bottom:4px;"><b style="color:#86efac;">순풍 영역 — '+zwDeepEsc(top.label)+'('+(top.score || 0)+'):</b> '+zwDeepEsc(top.good || '')+' 이번 분기의 새로운 시도는 이 영역에 먼저 배정하세요.</div>'
        +'<div style="font-size:0.8rem;color:#e2e8f0;line-height:1.75;"><b style="color:#fca5a5;">역풍 영역 — '+zwDeepEsc(low.label)+'('+(low.score || 0)+'):</b> '+zwDeepEsc(low.care || '')+' 이 영역은 확장보다 점검 주기를 짧게 가져가는 것이 상징의 처방입니다.</div>'
      +'</div>';
    }
    html += '</div>';
    return html;
  } catch (_symErr) { return ''; }
}

function renderZiweiPaidBodies(idx, pName, stars, pd, opts) {
      opts = opts || {};
      var clickOnly = !!opts.clickOnly;
      var targetPanelId = opts.targetId || 'zwDetailPanel';
      var showClose = opts.showClose !== false;
      var showRadar = opts.showRadar !== false;
      var shouldScroll = !!opts.scroll;
        var extractMainMeta = function(sList) {
            if(!sList) return [];
            var hasMain = !!(sList.main && sList.main.length);
            var usingBorrowedSource = !hasMain && !!(sList.borrowedMain && sList.borrowedMain.length);
            var src = hasMain ? sList.main : (sList.borrowedMain || []);
            if(!src || !src.length) return [];
            return src.map(function(m){
              var plain=(m||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
              var isBorrowed=usingBorrowedSource || /\(차성\)|\b차성\b/.test(plain);
              var name=plain
                .replace(/\(차성\)/g,'')
                .replace(/화록|화권|화과|화기/g,'')
                .trim()
                .split(' ')[0];
              return { name:name||'', isBorrowed:isBorrowed };
            }).filter(function(x){ return !!x.name; });
        };
            // Backward-compatible helper: legacy logic below still expects plain main-star names.
            var extractMains = function(sList) {
              return extractMainMeta(sList).map(function(m){ return m.name; });
            };
        var extractAux = function(sList) {
            if(!sList||!sList.aux) return [];
            return sList.aux.map(m=>m.replace(/<[^>]+>/g,'').trim().split(' ')[0]);
        };
        var extractBad = function(sList) {
            if(!sList||!sList.bad) return [];
            return sList.bad.map(m=>m.replace(/<[^>]+>/g,'').trim().split(' ')[0]);
        };
        var fmtStrength = function(starName, zhi, isBorrowed){
          var lv = zwComputeStarStrength(starName, zhi, !!isBorrowed);
          if(!lv) return starName;
          return starName + ' ' + zwStrengthToSymbol(lv);
        };
        var fmtListWithStrength = function(list, zhi, isBorrowed){
          return (list||[]).map(function(n){ return fmtStrength(n, zhi, isBorrowed); }).join(' · ');
        };
        var getPStars = function(name) {
            var i = pd.palacesByIndex.indexOf(name);
            return i < 0 ? null : pd.stars[i];
        };

        var msRef = {
            '자미': {
                psy: '<b>[중심을 세우는 제왕의 별]</b> 자미(紫微)는 뭇별의 한가운데 서는 북극성 같은 별입니다. 이 별이 비추면 존엄과 기준을 세우는 리더 기질이 짙어져, 굳이 나서지 않아도 사람들이 기대 오는 편입니다. 다만 자존심이 조언의 문을 닫으면 완고함이 되니, 중요한 결정 전에 다른 시선 하나를 문장으로 들어 보세요.',
                fin: '<b>[명예가 재물을 부르는 구조]</b> 명예와 권위가 올라갈수록 재물이 따라오는 결입니다. 투기보다 조직 내 지위 상승, 브랜드와 신용이 쌓이는 판에서 부가 커지는 경향이 있습니다. 자산은 보수적으로, 우량하고 확실한 것 위주로 오래 묻어 두는 방식이 잘 맞습니다.',
                rel: '<b>[엄격한 기준과 깊은 책임감]</b> 격식과 품위를 중시해 곁을 쉽게 내주지 않지만, 한 번 들인 사람에게는 강한 보호 본능과 책임감을 발휘합니다. 가까운 사이일수록 통제권을 쥐려는 습관이 억압으로 읽히지 않도록, 결정 전에 상대의 의견을 먼저 묻는 배려가 관계를 오래 지켜 줍니다.',
                well: '<b>[책임감이 만든 긴장 풀기]</b> 완벽을 기하며 눌러 둔 스트레스로 몸과 마음의 리듬이 예민해지기 쉽습니다. 책임을 혼자 쌓아 두면 쉼의 감각이 늦어지니, 명상과 가벼운 산책 같은 이완 루틴을 일정에 고정해 두세요.',
                time: '<b>[품위 있는 무대 확장]</b> 권위 있는 환경에 노출될수록 귀인의 후원과 명망이 자연스럽게 넓어집니다. 잦고 가벼운 이동보다, 명분이 선 굵직한 도약 위주로 움직일 때 무대가 커지는 결입니다.'
            },
            '천기': {
                psy: '<b>[쉼 없이 도는 기획의 톱니]</b> 천기(天機)는 지혜와 변통의 별로, 두뇌 회전이 빠르고 전략과 참모 능력이 탁월합니다. 호기심으로 다방면을 탐구하고 임기응변에 강한 대신, 생각이 꼬리를 물면 신경이 날카로워지고 결단 직전에 오래 망설이기 쉬워요. 판단의 기한을 먼저 정해 두면 이 별의 지혜가 온전히 살아납니다.',
                fin: '<b>[지식과 아이디어를 재물로]</b> 단순 반복보다 기획, 분석, 기술, 자문처럼 두뇌를 쓰는 판에서 대체 불가능한 가치를 만드는 결입니다. 벌이가 좋아도 새 배움과 도구에 바로 재투자하는 성향이 있으니, 결국 기술과 자격 그 자체가 평생의 재물이 됩니다.',
                rel: '<b>[지적 교류를 향한 갈망]</b> 감정적 의존보다 정보와 논리가 오가는 지적인 관계를 선호합니다. 새 자극을 주는 사람과 오래가고 구속은 피하려는 결이니, 가까운 사람에게는 생각의 과정을 말로 나눠 주는 것만으로 신뢰가 깊어집니다.',
                well: '<b>[생각 과열을 식히는 루틴]</b> 생각이 빠르게 이어지는 별이라 머릿속 긴장이 오래 남기 쉽습니다. 수면 리듬을 일정하게 두고, 정보 자극을 줄이는 오프라인 휴식을 의식적으로 넣어 주세요.',
                time: '<b>[이동이 여는 기회]</b> 본질이 동(動)의 별이라, 환경의 변화와 이동 속에서 오히려 직관과 돌파구를 찾습니다. 정체된 자리보다 무대를 바꾸는 시점에 운이 열리는 결이니, 이동 전 목표 한 줄만 적어 두면 낭비가 줄어요.'
            },
            '태양': {
                psy: '<b>[한낮의 해처럼 밝히는 기상]</b> 태양(太陽)은 명성과 발산의 별로, 활력이 넘치고 공명정대하며 무리의 앞에 서는 힘이 있습니다. 솔직하고 뒤끝이 없으며 약자를 돕는 리더십이 강한 대신, 판을 과하게 벌이거나 체면에 얽매여 실속을 놓치기 쉬우니 확장 전에 마무리 기준을 정해 두세요.',
                fin: '<b>[이름값이 여는 재물길]</b> 드러나는 일에서 성과가 커지는 결로, 이름과 평판이 가장 큰 수입원이 됩니다. 번 만큼 시원하게 베풀고 쓰는 손이 크니, 강제 저축 장치나 깐깐한 금전 파트너를 곁에 두면 재물이 오래 남습니다.',
                rel: '<b>[밖의 영웅, 안의 숙제]</b> 퍼주는 따뜻한 에너지로 인맥이 넓고 따르는 사람이 많습니다. 다만 밖에서 에너지를 다 쓰고 정작 가족과 가까운 사람에게 지친 모습을 보이기 쉬우니, 가장 가까운 자리에 에너지 한 조각을 먼저 떼어 두세요.',
                well: '<b>[열기를 다스리는 관리]</b> 에너지를 밖으로 많이 쓰는 별이라 과열과 피로가 함께 오기 쉽습니다. 물을 충분히 마시고 눈과 몸을 쉬게 하는 짧은 휴식을 자주 넣는 편이 좋습니다.',
                time: '<b>[넓은 무대에서의 성과]</b> 활동 반경이 큰 결이라, 낯선 기관과 외부 네트워크, 넓은 무대와의 접점에서 성과가 커집니다. 낮의 밝은 무대에서 움직일수록 이 별의 빛이 잘 삽니다.'
            },
            '무곡': {
                psy: '<b>[단호한 결단의 승부사]</b> 무곡(武曲)은 행동과 재물의 별로, 직설적이고 강직하며 시작한 일을 흔들림 없이 밀고 가는 뚝심이 있습니다. 다만 융통성이 줄고 사무적인 태도가 길어지면 고독감이 커질 수 있으니, 결과와 함께 마음 한마디를 얹는 연습이 승리를 완성합니다.',
                fin: '<b>[단단한 실행이 만드는 현금력]</b> 재물을 모으는 후각과 실천력이 강한 결입니다. 단단한 실행력이 필요한 영역에서 추진력이 살고 실속도 좋습니다. 다만 한탕의 유혹이 붙으면 손실이 커질 수 있으니 자산 관리 기준을 먼저 세워 두세요.',
                rel: '<b>[서툰 표현, 확고한 진심]</b> 애정 표현이 무뚝뚝해 다정함이 잘 전달되지 않는 편입니다. 감정 위로보다 문제 해결로 도우려다 오해를 사기도 하지만, 내 사람으로 여긴 이에게는 더없이 듬직한 버팀목이 됩니다. 가끔은 해결책 대신 공감 한 문장을 먼저 건네 보세요.',
                well: '<b>[단단한 몸을 오래 쓰는 법]</b> 움직임이 단호하고 긴장도가 높아 몸을 무리하게 쓰기 쉽습니다. 호흡을 고르고 스트레칭과 휴식을 꾸준히 확보하면 추진력이 더 오래갑니다.',
                time: '<b>[실익 중심의 확장]</b> 의미 없는 유람보다 실질적 결과를 위해 움직일 때 반경이 넓어지는 결입니다. 치밀한 셈법과 비즈니스 감각으로 밖에 나가 실익을 챙겨 오는 이동이 잘 맞습니다.'
            },
            '천동': {
                psy: '<b>[봄볕 같은 낙천가]</b> 천동(天同)은 복덕의 별로, 순수하고 다정하며 갈등을 눅이는 평화의 기운입니다. 공감력이 뛰어난 대신 편안함에 안주하려는 결이 있어, 목표 하나에 집요함을 더할 때 이 별의 복이 실력으로 바뀝니다.',
                fin: '<b>[편안함을 파는 재물길]</b> 거친 경쟁보다 사람을 돌보고 분위기를 부드럽게 만드는 판에서 재물의 문이 열립니다. 타인에게 편안함을 주는 일에서 안정된 부를 쌓아 가는, 먹을 복이 두터운 결입니다.',
                rel: '<b>[포용의 인복, 끊음의 숙제]</b> 천성적으로 보듬는 성정이라 마찰이 적고 인복이 따릅니다. 다만 끊어야 할 인연에 끌려다니거나 감정적으로 의존하기 쉬우니, 관계에도 경계선 한 줄을 그어 두면 복이 오래갑니다.',
                well: '<b>[편안함과 리듬의 균형]</b> 편안한 환경을 좋아하는 별이라 활동과 휴식의 균형이 관건입니다. 규칙적인 움직임과 가벼운 땀 배출 루틴이 몸의 리듬과 마음의 안정감을 함께 살립니다.',
                time: '<b>[순풍에 돛을 다는 항해]</b> 강제 개척보다 흐름에 자연스럽게 올라타 반경을 점진적으로 넓히는 결입니다. 낯선 환경에서도 적을 만들지 않고 빠르게 안착하는 복이 있습니다.'
            },
            '염정': {
                psy: '<b>[치밀한 감각과 승부수]</b> 염정(廉貞)은 통제와 매력의 별로, 판세를 빠르게 읽고 장악하는 감각이 뛰어납니다. 겉은 화려하고 언변이 좋지만 자존심의 상처와 질투에 예민한 결이 있어, 감정 기복과 통제 욕구를 다스릴 때 재능이 폭발합니다.',
                fin: '<b>[차별화된 감각의 환전]</b> 단조로운 업무보다 개성과 감각이 드러나는 무대에서 재물성이 살아납니다. 남이 흉내 내기 어려운 디테일이 부가가치가 되는 결이지만, 현금 흐름의 변동이 큰 편이니 안전 자산과 관리 체계를 함께 두세요.',
                rel: '<b>[강한 흡인력, 필요한 선긋기]</b> 시선을 끄는 흡인력으로 인기가 따르지만, 그만큼 시기와 구설이 얽히기 쉬운 결입니다. 관계에서는 냉철한 선긋기와 깔끔한 신의를 지키는 것이 매력을 오래 지켜 줍니다.',
                well: '<b>[예민함을 다스리는 리듬]</b> 감각과 긴장이 빠르게 올라오는 별이라 작은 변화에도 마음이 흔들리기 쉽습니다. 자극적인 일정과 감정 소모를 줄이고, 차분한 정리 루틴으로 몸과 마음을 돌보세요.',
                time: '<b>[무대 장악의 이동운]</b> 낯선 변화에 능동적이고 새 무대에서 기죽지 않는 결입니다. 이동의 시기에 사람의 마음을 빠르게 얻어 조직의 핵심으로 떠오르는 장악력이 잘 작동합니다.'
            },
            '천부': {
                psy: '<b>[기반을 지키는 너른 창고]</b> 천부(天府)는 보존의 별로, 마음이 너그럽고 침착하며 검증된 안정성을 중시하는 보스 기질입니다. 다만 쇄신을 너무 늦추면 흐름을 놓칠 수 있으니, 분기마다 작은 변화 하나를 의무처럼 실험해 보세요.',
                fin: '<b>[지키며 불리는 재테크]</b> 공격적 확장보다 들어온 재물을 지키고 복리로 불리는 방어력이 강한 결입니다. 위험한 베팅보다 견고한 자산 위주로 차곡차곡 쌓을 때 알부자의 길이 열립니다.',
                rel: '<b>[든든한 안식처의 기둥]</b> 신용과 무던함으로 주변의 피난처 역할을 하는 결입니다. 다만 내 틀만 고집하면 진취적인 가족과 동료 사이에 대화의 벽이 생길 수 있으니, 열린 포용을 의식적으로 키워 보세요.',
                well: '<b>[안정과 움직임의 균형]</b> 안정된 리듬을 좋아하는 별이라 편안함이 길어지면 활력이 둔해질 수 있습니다. 걷기나 가벼운 등산처럼 꾸준한 움직임을 붙이면 운의 탄력이 살아납니다.',
                time: '<b>[준비된 베이스캠프 확장]</b> 급한 변동을 선호하지 않는 결이라, 정보와 안전을 확인한 뒤 기반이 마련될 때 움직이는 안정형 스텝이 잘 맞습니다. 준비된 이동일수록 결과가 단단해집니다.'
            },
            '태음': {
                psy: '<b>[달빛의 심미안과 결벽]</b> 태음(太陰)은 내면과 심미의 별로, 깊이 사색하며 핵심을 아름답게 꿰뚫는 감각을 타고났습니다. 다만 완벽을 요구하는 결이 피로를 부르고 지적에 상처를 오래 품기 쉬우니, 결정에는 기한을, 마음에는 표현의 출구를 마련해 두세요.',
                fin: '<b>[소리 없이 쌓는 부]</b> 요란한 변동 자산보다 땅과 생활 기반처럼 우직한 자산에서 재물을 불리는 결입니다. 소문 없이 조용히 모으는 알부자의 기운이며, 섬세함이 곧 부가가치가 되는 영역에서 강합니다.',
                rel: '<b>[깊고 프라이빗한 교감]</b> 넓은 사교보다 극소수와의 깊은 교감을 선호하는 결입니다. 지고지순하고 로맨틱하지만, 완벽의 잣대로 상대를 재다 실망하면 마음의 문을 닫아 버리기 쉬우니 기대치를 먼저 말로 맞춰 보세요.',
                well: '<b>[정서의 물결을 낮추는 시간]</b> 감정의 진폭이 컨디션에 그대로 스며드는 별입니다. 따뜻한 차, 햇빛, 조용한 산책처럼 마음의 물결을 낮추는 시간을 꾸준히 두면 회복이 부드러워집니다.',
                time: '<b>[낯선 무대에서 피는 재능]</b> 달의 결이라 익숙한 자리보다 낯선 무대, 조용한 시간대에 심리적 평화와 재능이 함께 피어납니다. 환경을 바꾸는 선택이 오히려 안정을 가져오는 별입니다.'
            },
            '탐랑': {
                psy: '<b>[호기심 많은 유쾌한 탐험가]</b> 탐랑(貪狼)은 욕망과 매력의 별로, 호기심이 폭발적이고 누구와도 금세 섞이는 친화력이 있습니다. 임기응변으로 위기를 잘 넘기는 대신 끝맺음의 인내가 약한 결이니, 시작한 판 하나를 완주하는 훈련이 이 별의 격을 올립니다.',
                fin: '<b>[사람이 모이는 곳의 현금 흐름]</b> 닫힌 사무실보다 사람과 무대가 있는 현장에서 끼를 발휘하며 빠르게 재물을 모으는 결입니다. 다만 즐거움에 쓰는 손도 커서 순식간에 녹을 수 있으니, 재산은 미리 묶어 두는 장치가 필요합니다.',
                rel: '<b>[네트워크의 핵]</b> 모임에서 빼놓을 수 없는 분위기 메이커의 결입니다. 스치는 인연이 많아질수록 방향이 흐려지기 쉬우니, 얕은 인맥을 정리하고 깊은 인연 소수에 정성을 모으는 것이 복을 키웁니다.',
                well: '<b>[흥과 피로 사이의 균형]</b> 사람과 자극을 향해 빠르게 움직이는 별이라 즐거움 뒤에 피로가 쌓이기 쉽습니다. 밤 일정과 무리한 약속을 줄이고 수면으로 몸의 정화 리듬을 되찾아 주세요.',
                time: '<b>[자유로운 기동력]</b> 한곳에 오래 머물기보다 무대를 넘나들며 판을 여는 결입니다. 낯선 무대에서도 며칠 만에 조력자를 얻는 적응력과 사교력이 이동의 시기에 크게 작동합니다.'
            },
            '거문': {
                psy: '<b>[이면을 꿰뚫는 논리의 문]</b> 거문(巨門)은 통찰과 언변의 별로, 현상의 포장 너머 허점과 사실을 짚어내는 분석력이 탁월합니다. 탐구심으로 한 분야의 전문가로 서는 결이지만, 의심과 차가운 말이 구설을 부르기 쉬우니 지적 앞에 인정 한마디를 먼저 얹어 보세요.',
                fin: '<b>[말과 지식으로 쌓는 부]</b> 날카로운 지식과 언어를 정면으로 쓰는 판에서 금전운이 크게 열리는 결입니다. 다만 논쟁과 계약 마찰이 따라붙기 쉬우니, 동업과 금전 보증은 신중에 신중을 더하세요.',
                rel: '<b>[의심의 필터, 그 너머의 의리]</b> 결점을 짚는 습관이 다툼을 부르기 쉽지만, 신뢰의 문을 통과한 사람에게는 의리와 헌신을 다하는 결입니다. 상대의 말에 먼저 맞장구쳐 주는 연습이 인복을 크게 올립니다.',
                well: '<b>[말과 생각을 비우는 시간]</b> 신경이 예리하고 생각이 깊어 말하지 못한 긴장이 피로로 남기 쉽습니다. 하루의 끝에 기록과 명상으로 마음을 비우면 컨디션이 부드럽게 가라앉습니다.',
                time: '<b>[낯선 무대의 대기만성]</b> 익숙한 자리보다 낯설고 이질적인 무대에서 실력을 증명하며 명성을 얻는 결입니다. 고생 끝에 쌓이는 평판이라, 타향의 시간이 길수록 돌아오는 이름값이 커집니다.'
            },
            '천상': {
                psy: '<b>[공정함을 지키는 조율사]</b> 천상(天相)은 조화와 봉사의 별로, 공정함과 단정함을 소중히 여기는 의협심의 소유자입니다. 홀로 돌격하는 대장보다 판을 매끄럽게 만드는 조정자의 자리에서 안정감이 빛나는 결이니, 내 기준 한 줄을 세워 두면 조율이 흔들리지 않습니다.',
                fin: '<b>[신뢰 기반의 튼튼한 재무]</b> 무리한 도박보다 조직과 신뢰의 보장 아래 흔들림 없는 부를 쌓는 결입니다. 체면과 감각을 중시하는 성정이 격 있는 서비스나 품위 있는 영역과 잘 맞고, 먹을 복도 두터운 편입니다.',
                rel: '<b>[넓은 호응, 필요한 거절]</b> 딱한 사정을 지나치지 못하는 선한 성정으로 신뢰와 인기를 얻는 결입니다. 다만 밀려오는 부탁에 제동을 걸지 못하면 크게 데일 수 있으니, 보증과 대리 결정만큼은 단호하게 거절하는 기준을 세워 두세요.',
                well: '<b>[품위보다 여유 먼저]</b> 기대와 체면을 오래 붙들면 긴장이 몸으로 드러나기 쉽습니다. 수분과 수면, 조용한 정리 시간을 챙기며 바깥의 품위보다 안쪽의 여유를 먼저 회복하세요.',
                time: '<b>[명분과 함께하는 안전 이동]</b> 개인의 이익보다 조직과 명분을 이끌고 움직일 때 무대가 넓어지는 결입니다. 깔끔한 신용을 무기로 낯선 자리에서도 귀인과 협력 기반을 쌓습니다.'
            },
            '천량': {
                psy: '<b>[그늘을 내주는 큰 나무]</b> 천량(天梁)은 보호와 원칙의 별로, 나이보다 노련한 포용력으로 주변의 문제를 앞장서 풀어 줍니다. 위기를 비껴가게 하는 음덕의 결이 있지만, 고지식함이 아랫세대와의 벽이 되기 쉬우니 훈수보다 경청을 먼저 두세요.',
                fin: '<b>[사람을 살리며 열리는 재물]</b> 요행과 투기가 섞이면 재물이 머물지 않는 결입니다. 대신 어려움을 풀고 질서를 세우는 활인(活人)의 일에서 평판과 신뢰가 재물로 이어집니다.',
                rel: '<b>[윗사람 인복의 기둥]</b> 믿음직한 태도로 스승과 윗사람의 후원을 끌어내는 인복의 결입니다. 아랫사람에게는 설교를 줄이고 웃는 얼굴로 들어 줄 때, 존경이 저절로 따라옵니다.',
                well: '<b>[따뜻하게 채우는 회복]</b> 위기에서도 회복의 길을 찾는 운이 강한 별입니다. 몸을 몰아붙이기보다 따뜻한 식사와 일정한 휴식으로 기운을 천천히 채우는 습관이 잘 맞습니다.',
                time: '<b>[해결사의 궤도]</b> 유흥보다 문제 해결과 소명을 위해 움직일 때 무대가 열리는 결입니다. 객지의 고생이 평판의 탑이 되어, 나이 들수록 명망이 성대해지는 대기만성형입니다.'
            },
            '칠살': {
                psy: '<b>[한계를 넘는 장수의 검]</b> 칠살(七殺)은 결단과 돌파의 별로, 목표를 정하면 고독을 감수하고 밀고 나가는 독립성이 강합니다. 다만 흑백의 잣대가 지나치면 후반에 고립될 수 있으니, 판단에 여지 한 칸을 남기는 훈련이 필요합니다.',
                fin: '<b>[승부처에서 여는 재물]</b> 편안한 서류 업무보다 남들이 기피하는 어려운 판에 돌진해 성과를 내는 결입니다. 등락이 큰 만큼, 벌어들인 수입은 흔들리지 않는 안전자산에 옮겨 두어야 후환이 없습니다.',
                rel: '<b>[직설과 의리의 양날]</b> 가식과 아부를 싫어해 마찰이 커질 수 있는 결입니다. 매서운 지적이 가까운 이의 마음을 상하게 할 수 있지만, 한 번 마음을 나눈 사람에게는 끝까지 뜨거운 의리를 지킵니다.',
                well: '<b>[속도를 낮추는 안전 리듬]</b> 추진력이 강한 별이라 마음이 앞서면 몸도 급해지기 쉽습니다. 운전과 운동, 도구를 다루는 순간에는 한 박자 늦추고 호흡으로 긴장을 풀어 주세요.',
                time: '<b>[판을 갈아엎는 전환력]</b> 이동과 전환이 서서히 오지 않고 단번에 오는 결입니다. 척박한 무대에 홀로 꽂혀도 깃발을 세우는 개척력이 있으니, 큰 전환 전 최소한의 보급선만 확보해 두세요.'
            },
            '파군': {
                psy: '<b>[낡은 판을 허무는 선봉장]</b> 파군(破軍)은 변혁과 개척의 별로, 굳은 질서를 그대로 두지 않고 새 그림을 처음부터 다시 그리는 창조성이 강합니다. 변화의 속도가 빠른 만큼 충동을 다스리고 벌인 일을 수습하는 기준을 세울 때 큰 인물이 되는 결입니다.',
                fin: '<b>[틈새를 여는 자본 감각]</b> 정해진 봉급의 틀만으로는 이 별의 힘이 다 살지 않습니다. 변동성이 큰 영역에서 기회를 찾는 결이지만 수익과 지출의 낙차도 크니, 씀씀이를 잡아 줄 장치를 반드시 두세요.',
                rel: '<b>[뜨겁게 달아오르는 파동]</b> 관계의 감정이 빠르게 달아오르고 식는 파동이 큰 결입니다. 연애든 협업이든 열정을 크게 쏟는 만큼, 속도를 조절해 줄 차분한 파트너와의 합의 구조가 관계를 지켜 줍니다.',
                well: '<b>[큰 변화를 받치는 회복]</b> 변화의 속도가 빠른 별이라 몸과 마음의 물기가 쉽게 마릅니다. 충분한 수분과 수면, 휴식으로 리듬을 지키면 큰 전환기에도 중심을 잃지 않습니다.',
                time: '<b>[궤도를 바꾸는 도약]</b> 인생 무대가 한 번에 달라지는 큰 전환을 경험하는 결입니다. 익숙한 흐름을 깨고 새 영역으로 도약하는 성향이 강하며, 변화 속에서 오히려 활력을 얻습니다.'
            }
        };

        var emptyDesc = {
            psy: '<b>[비어 있어 오히려 넓은 도화지]</b> 이 궁은 주성이 없는 공궁(空宮)입니다. 빈 것이 아니라 굳은 선입견이 없다는 뜻으로, 맞은편 대궁(對宮)의 별빛을 빌려 쓰며 상황에 맞게 색을 바꾸는 유연함이 큰 결입니다. 대궁의 흐름을 함께 읽을 때 해석이 완성됩니다.',
            fin: '<b>[흐름을 갈아타는 유연한 자산]</b> 하나의 고정 수익 채널에 매이지 않는 결입니다. 트렌드와 자금의 흐름을 읽어 구조를 새로 짜는 변환 능력이 강하니, 갈아탈 때의 기준만 문장으로 정해 두면 됩니다.',
            rel: '<b>[호불호를 녹이는 포용력]</b> 고집스러운 기준이 옅어 상대에 맞춰 조화롭게 녹아드는 결입니다. 껄끄러운 사람과도 판을 부드럽게 만드는 처세가 강점이지만, 내 경계선 한 줄은 미리 정해 두세요.',
            well: '<b>[환경에 민감한 회복 리듬]</b> 몸과 마음의 리듬이 주변 환경에 민감하게 반응하는 결입니다. 탁한 분위기에서는 쉽게 지치니, 맑은 공간과 편안한 사람들 속에서 회복 시간을 확보하는 것이 중요합니다.',
            time: '<b>[제약 없는 무대 적응력]</b> 이동과 전환의 제약이 옅은 열린 결입니다. 어디로 옮겨도 그 문화에 빠르게 적응해 새 색을 내니, 낯선 무대를 두려워할 이유가 없습니다.'
        };

        var theme = 'psy';
        var themeTitle = ' 나의 기질과 마음의 습관';

        if (['부부궁','형제궁','노복궁','자녀궁','부모궁'].includes(pName)) {
            theme = 'rel';
            themeTitle = ' [관계 네트워크] 소셜 및 인연 해석';
        } else if (['관록궁','재백궁','전택궁'].includes(pName)) {
            theme = 'fin';
            themeTitle = ' [진로와 경제] 재무 및 직업 해석';
        } else if (['천이궁'].includes(pName)) {
            theme = 'time';
            themeTitle = ' [인생의 흐름] 대외 무대 및 변화 해석';
        } else if (['질액궁'].includes(pName)) {
            theme = 'well';
            themeTitle = ' [회복 리듬] 컨디션과 생활 균형 해석';
        } else if (['복덕궁'].includes(pName)) {
            theme = 'psy';
            themeTitle = ' [복덕] 내면 안정과 만족도 해석';
        }

  var mainStMeta = extractMainMeta(getPStars(pName));
  var mainSt = mainStMeta.map(function(m){ return m.name; });
        var badSt = extractBad(getPStars(pName));
        var auxSt = extractAux(getPStars(pName));

        var dTitle = zwDisplayPalaceName(pName);
        if (ZHI_LIST[idx] === pd.meng && pName !== '명궁') dTitle = '명궁: ' + dTitle;
        if (ZHI_LIST[idx] === pd.shen) dTitle = dTitle + ' (신궁)';

        var uniqueList = function(list) {
          var seen = Object.create(null);
          var out = [];
          (list || []).forEach(function(v) {
            if (!v) return;
            var key = String(v);
            if (seen[key]) return;
            seen[key] = 1;
            out.push(key);
          });
          return out;
        };
        var mainCleanMetaRaw = extractMainMeta(stars);
        var mainCleanMeta = [];
        var mainSeen = Object.create(null);
        mainCleanMetaRaw.forEach(function(m){
          var key = m.name + '|' + (m.isBorrowed ? '1' : '0');
          if(mainSeen[key]) return;
          mainSeen[key] = 1;
          mainCleanMeta.push(m);
        });
        var mainClean = mainCleanMeta.map(function(m){ return m.name; });
        var auxClean = uniqueList(extractAux(stars));
        var badClean = uniqueList(extractBad(stars));
        var borrowedMain = mainCleanMeta.filter(function(m){ return m.isBorrowed; }).map(function(m){ return m.name; });
        var stHtml = mainCleanMeta.length
          ? '<span style="color:#FFD700;font-weight:900;">' + mainCleanMeta.map(function(m){ return fmtStrength(m.name, ZHI_LIST[idx], m.isBorrowed) + (m.isBorrowed ? ' <span style="color:#facc15;font-size:0.74rem">(차성)</span>' : ''); }).join(' · ') + '</span>'
          : '<span style="color:#888;font-style:italic">공궁(空宮)</span>';
        var auxJoin = auxClean.length ? fmtListWithStrength(auxClean, ZHI_LIST[idx], false) : '없음';
        var badJoin = badClean.length ? fmtListWithStrength(badClean, ZHI_LIST[idx], false) : '없음';
        var palaceBrief = zwGungBrief(pName) || zwGungDef(pName) || '해당 궁의 흐름을 확인하세요.';

        var sec1 = '<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;">' +
          '<h2 style="color: #D8B4FE; font-size: 1.2rem; margin-top: 0;">명반에서 읽은 해석의 근거</h2>' +
          '<ul style="line-height: 1.85; margin: 0; padding-left: 20px; font-size:0.9rem;">' +
            '<li><b>조회 궁위:</b> ' + dTitle + '</li>' +
            '<li><b>궁위 해석 초점:</b> ' + palaceBrief + '</li>' +
            '<li><b>주도 주성:</b> ' + stHtml + '</li>' +
            '<li><b>차성 적용 여부:</b> ' + (borrowedMain.length ? ('적용 ('+borrowedMain.join(' · ')+')') : '미적용 (원성 중심)') + '</li>' +
            '<li><b>길성/흉성 분포:</b> ' + auxJoin + ' / ' + badJoin + '</li>' +
          '</ul>' +
        '</div>';

        // 주성 렌즈 해석: 클릭한 궁의 테마(심리/재물/관계/회복/이동)에 맞춰 주성별 풀문장 해석을 붙인다. 공궁이면 공궁 해석 사용.
        var lensStars = mainSt.slice(0, 2).filter(function(s){ return msRef[s] && msRef[s][theme]; });
        var lensCards = (lensStars.length
          ? lensStars.map(function(s){ return msRef[s][theme]; })
          : [emptyDesc[theme] || emptyDesc.psy])
          .map(function(body){
            return '<div style="background:rgba(30,27,75,0.35);border:1px solid rgba(196,181,253,0.28);border-radius:9px;padding:11px 12px;margin-bottom:9px;line-height:1.78;font-size:0.9rem;color:#e9e3ff;">' + body + '</div>';
          }).join('');
        var secStarLens = '<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;">' +
          '<h2 style="color: #D8B4FE; font-size: 1.2rem; margin-top: 0;">🔭' + themeTitle + '</h2>' +
          lensCards +
          '<div style="font-size:0.74rem;color:#a5b4fc;line-height:1.6;">별 하나로 결론 내리지 않고, 실제 주성·보조성과 함께 연결되는 궁을 살펴보세요. 타고난 성향과 대한·사화로 읽는 시기 변화는 구분해서 이해하는 것이 좋습니다.</div>' +
        '</div>';

        var sec2 = '<div data-cd-marker="ziwei-12-palace-folded-map-v20260614" style="margin-bottom:20px;background:#0f0f1a;border:1px solid rgba(139,92,246,0.35);border-radius:10px;overflow:hidden">'
          + '<div style="padding:10px 14px;background:linear-gradient(135deg,rgba(88,28,220,0.45),rgba(30,12,60,0.7))">'
          + '<span style="color:#c084fc;font-weight:900;font-size:0.95rem">📊 자미두수 12궁 핵심 지도</span>'
          + '<div style="color:#94a3b8;font-size:0.72rem;line-height:1.5;margin-top:3px;">명궁·관록궁·재백궁·부부궁을 먼저 보고, 전체 12궁은 펼쳐 확인합니다.</div>'
          + '</div>'
          + buildZwSummaryTableHtml(pd)
          + buildZwTwelvePalaceDeepHtml(pd)
          + '</div>';

        var curDaHan = (pd.daHan && pd.daHan[idx]) ? pd.daHan[idx] : "알 수 없음";
        var curSihua = [];
        if (pd.sihuaData) {
          for (var shName in pd.sihuaData) {
            var shObj = pd.sihuaData[shName];
            if (shObj && shObj.palaceIdx === idx) curSihua.push({ star: shName, type: shObj.type });
          }
        }
        var hasHwagi = curSihua.some(function(s){ return s.type === '화기'; });
        var hasHwarok = curSihua.some(function(s){ return s.type === '화록'; });
        var hasHwakwon = curSihua.some(function(s){ return s.type === '화권'; });
        var hasHwakwa = curSihua.some(function(s){ return s.type === '화과'; });

        var goodAuxStars = ['천괴','천월','좌보','우필','문창','문곡','녹존','천마'];
        var curGoodAux = auxSt.filter(function(s){ return goodAuxStars.indexOf(s) >= 0; });

        var coreLaw = '';
        if (mainSt.length > 0) {
          var coreMain = mainSt.slice(0, 2).join(' · ');
          var coreKw = ZW_STAR_KW[mainSt[0]] || mainSt[0];
          coreLaw = '<b>주성법:</b> ' + coreMain + ' 중심 대한으로, <b>' + coreKw + '</b> 테마가 사건의 중심축이 됩니다.';
        } else {
          coreLaw = '<b>공궁법:</b> 공궁 대한은 대궁/환경 변수의 영향이 크므로, 고정 천기보다 상황 대응력이 성패를 가릅니다.';
        }

        var sihuaText = curSihua.length
          ? '<b>사화법:</b> ' + curSihua.map(function(s){ return s.star + ' ' + s.type; }).join(' · ')
          : '<b>사화법:</b> 이 궁에는 강한 사화 직접 작용이 약해 기본기와 루틴이 성과를 좌우합니다.';

        var goodPoint = '';
        if (hasHwarok || hasHwakwa || curGoodAux.length > 0) {
          goodPoint = '귀인·명예·성과 회수 흐름이 살아납니다. 문서/평판/추천 네트워크를 활용하면 실익 전환이 빠릅니다.';
        } else if (hasHwakwon || mainSt.length > 0) {
          goodPoint = '주도권을 잡을수록 운이 열립니다. 우선순위를 명확히 두고 한 축을 깊게 밀면 결과가 납니다.';
        } else {
          goodPoint = '변화 적응력 자체가 장점입니다. 유연한 선택과 타이밍 조절이 복을 키웁니다.';
        }

        var cautionPoint = '';
        if (hasHwagi || badSt.length > 0) {
          cautionPoint = '화기/흉성 영향으로 말실수·계약 누락·과속 결정에서 손실이 나기 쉽습니다. 감정적 결단과 무리한 확장은 금물입니다.';
        } else {
          cautionPoint = '큰 흉의 압박은 약하지만, 방심으로 인한 루틴 붕괴가 기회를 놓치게 만듭니다. 꾸준함을 유지하세요.';
        }

        var actionTip = '';
        if (hasHwagi) {
          actionTip = '중요 계약은 2중 검토, 금전은 분할 집행, 인간관계는 "기록+확인" 원칙으로 운 손실을 줄이세요.';
        } else if (hasHwarok || hasHwakwon || hasHwakwa) {
          actionTip = '이번 대한의 키워드(재물·권한·명예)를 한 가지 목표로 수렴해 실행하면 체감 성과가 크게 납니다.';
        } else {
          actionTip = '월 단위 체크포인트를 정해 작은 성취를 누적하면 후반 운세가 안정적으로 상승합니다.';
        }

        // Persona는 클릭 궁이 아닌 명반 전체(12궁) 집계로 고정 산출한다.
        // 별 강약 가중(7등급 그대로). 강약을 매기지 않는 별은 3.0.
        var brightnessWeight = function(level){
          var map = { '묘': 5.0, '왕': 4.6, '득': 4.2, '리': 3.3, '평': 2.4, '불': 1.9, '함': 1.5 };
          return map[zwNormalizeStrength(level)] || 3.0;
        };
        var personaStarScore = Object.create(null);
        var personaAuxPool = [];
        var personaBadPool = [];
        var personaBorrowedPool = [];
        var personaSihuaCnt = { '화록':0, '화권':0, '화과':0, '화기':0 };

        for (var pIdx=0; pIdx<12; pIdx++) {
          var pZhi = ZHI_LIST[pIdx];
          var pNameAll = pd.palacesByIndex[pIdx] || '';
          var pStars = pd.stars[pIdx] || {main:[],aux:[],bad:[],borrowedMain:[]};
          var pMainMeta = extractMainMeta(pStars);

          var pWeight = 1.0;
          if (pNameAll === '명궁') pWeight += 1.8;
          if (pNameAll === '복덕궁') pWeight += 1.0;
          if (pNameAll === '천이궁') pWeight += 0.8;
          if (pNameAll === '관록궁') pWeight += 0.6;
          if (pZhi === pd.meng) pWeight += 1.2;
          if (pZhi === pd.shen) pWeight += 0.8;

          pMainMeta.forEach(function(m){
            var lv = zwComputeStarStrength(m.name, pZhi, !!m.isBorrowed);
            var score = pWeight * brightnessWeight(lv) * (m.isBorrowed ? 0.9 : 1.0);
            personaStarScore[m.name] = (personaStarScore[m.name] || 0) + score;
            if (m.isBorrowed) personaBorrowedPool.push(m.name);
          });

          personaAuxPool = personaAuxPool.concat(extractAux(pStars));
          personaBadPool = personaBadPool.concat(extractBad(pStars));
        }

        if (pd.sihuaData) {
          for (var siName in pd.sihuaData) {
            var siType = pd.sihuaData[siName] && pd.sihuaData[siName].type;
            if (personaSihuaCnt.hasOwnProperty(siType)) personaSihuaCnt[siType] += 1;
          }
        }

        var sortedPersonaStars = Object.keys(personaStarScore).sort(function(a,b){ return personaStarScore[b]-personaStarScore[a]; });
        var leadMain = sortedPersonaStars[0] || '';
        var subMain = sortedPersonaStars[1] || '';
        var leadKeyword = leadMain ? (ZW_STAR_KW[leadMain] || (leadMain + ' 중심 성향')) : '공궁 기반 유연 적응 성향';
        var majorStarsLabel = sortedPersonaStars.length ? sortedPersonaStars.slice(0,3).join(' · ') : '공궁(空宮)';

        var auxUnique = uniqueList(personaAuxPool);
        var badUnique = uniqueList(personaBadPool);
        var borrowedUnique = uniqueList(personaBorrowedPool);
        var auxLabel = auxUnique.length ? auxUnique.join(' · ') : '보조 길성 약함';
        var badLabel = badUnique.length ? badUnique.join(' · ') : '흉성 압력 약함';

        var relationMood = badUnique.length >= 3
          ? '선별적 신뢰와 경계 중심의 관계 운행'
          : (auxUnique.length >= 3 ? '협력과 상호성 중심의 관계 운행' : '상황 적응형 관계 운행');

        var emotionMode = personaSihuaCnt['화권'] > Math.max(personaSihuaCnt['화과'], personaSihuaCnt['화기'])
          ? '결정형(핵심 이슈를 빠르게 정리)'
          : (personaSihuaCnt['화과'] >= Math.max(personaSihuaCnt['화권'], personaSihuaCnt['화기'])
            ? '품질형(정돈된 표현과 체면 수호)'
            : (personaSihuaCnt['화기'] > 0 ? '억제형(감정 누적 후 반응 가능)' : '균형형(맥락에 맞춘 표현)'));

        var stressMode = (personaSihuaCnt['화기'] > 0 || badUnique.length >= 3)
          ? '과부하 시 통제 욕구가 상승하므로, 휴식·속도 조절·의사결정 지연이 필요'
          : '스트레스 상황에서도 회복 탄성이 비교적 안정적이며 루틴 유지에 강점';

        var hiddenTalent = auxUnique.length
          ? ('보조성 '+auxLabel+'의 조합으로, 보이지 않는 조율력·정보정리력·타이밍 포착력이 강하게 작동')
          : '외부 보조성보다 자기 주도 역량을 직접 강화할수록 잠재력이 빠르게 현실화';

        var ziweiElementMap = {
          '자미':'earth','천기':'wood','태양':'fire','무곡':'metal','천동':'water','염정':'fire','천부':'earth','태음':'water',
          '탐랑':'wood','거문':'water','천상':'metal','천량':'earth','칠살':'metal','파군':'water'
        };
        var ziweiAuxElementMap = {
          '문창':'wood','문곡':'water','좌보':'earth','우필':'earth','녹존':'metal','천마':'fire',
          '화성':'fire','영성':'fire','타라':'metal','경양':'metal','지공':'water','지겁':'water'
        };
        var rawElementScores = { wood: 6, fire: 6, earth: 6, metal: 6, water: 6 };
        Object.keys(personaStarScore).forEach(function(starName){
          var el = ziweiElementMap[starName];
          if (!el) return;
          rawElementScores[el] += Math.max(0, personaStarScore[starName] || 0) * 2.4;
        });
        auxUnique.forEach(function(starName){
          var el = ziweiAuxElementMap[starName];
          if (!el) return;
          rawElementScores[el] += 4.5;
        });
        badUnique.forEach(function(starName){
          var el = ziweiAuxElementMap[starName];
          if (!el) return;
          rawElementScores[el] += 2.2;
        });

        var elementOrder = ['earth','wood','fire','metal','water'];
        var elementMeta = {
          earth:{icon:'⛰️',name:'토',label:_sajuEngineText("se_19205_prop_label")},
          wood:{icon:'🌿',name:'목',label:_sajuEngineText("se_19206_prop_label")},
          fire:{icon:'🔥',name:'화',label:_sajuEngineText("se_19207_prop_label")},
          metal:{icon:'⚔️',name:'금',label:_sajuEngineText("se_19208_prop_label")},
          water:{icon:'💧',name:'수',label:_sajuEngineText("se_19209_prop_label")}
        };
        var rawVals = elementOrder.map(function(k){ return rawElementScores[k]; });
        var rawMin = Math.min.apply(null, rawVals);
        var rawMax = Math.max.apply(null, rawVals);
        var personaWuxingData = {};
        elementOrder.forEach(function(k){
          var v = rawElementScores[k];
          var n = (rawMax - rawMin < 0.001)
            ? 62
            : (38 + ((v - rawMin) / (rawMax - rawMin)) * 54);
          personaWuxingData[k] = Math.max(26, Math.min(94, Math.round(n)));
        });

        var wuxingChipHtml = elementOrder.map(function(k){
          var m = elementMeta[k];
          return '<div style="background:rgba(15,23,42,0.55);border:1px solid rgba(196,181,253,0.28);border-radius:8px;padding:5px 8px;font-size:0.78rem;color:#e2e8f0;">'
            + '<span style="font-weight:700;color:#fef3c7;">'+m.icon+' '+m.name+'</span> '
            + '<span style="color:#bae6fd;font-weight:800;">'+personaWuxingData[k]+'</span>'
            + '</div>';
        }).join('');

        var emotionBaseText = '기본적으로는 "'+emotionMode+'" 스타일입니다. 즉, 감정을 아예 숨기기보다 상황을 보고 표현 강도를 조절하는 타입에 가깝습니다.';
        var emotionVarByState = (personaSihuaCnt['화기'] > 0 || badUnique.length >= 3)
          ? '피곤하거나 압박이 큰 날에는 말수가 줄고, 감정을 바로 꺼내기보다 잠시 참았다가 나중에 정리해서 말할 가능성이 큽니다.'
          : '컨디션이 안정적일 때는 감정을 비교적 부드럽고 솔직하게 표현하는 편입니다.';
        var emotionVarByPerson = (auxUnique.length >= 3)
          ? '믿는 사람 앞에서는 표현이 더 따뜻하고 빨라지며, 낯선 사람 앞에서는 한 템포 조심스러워집니다.'
          : '상대가 안전하다고 느껴지면 표현이 늘고, 비판적 분위기에서는 방어적으로 바뀌는 경향이 있습니다.';
        var emotionVarByGoal = (personaSihuaCnt['화권'] > 0)
          ? '일·성과가 걸린 상황에서는 감정보다 결론을 먼저 말하는 실전형 모드가 켜집니다.'
          : (personaSihuaCnt['화과'] > 0
            ? '체면이나 관계의 균형이 중요할 때는 표현을 다듬어 전달하는 신중 모드가 켜집니다.'
            : '급한 목표가 생기면 평소보다 단호해지고, 여유가 있을 때는 공감형으로 돌아오는 패턴이 있습니다.');

        var sec_persona = '<div style="position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(18,16,40,0.96),rgba(28,20,58,0.92) 48%,rgba(14,32,46,0.9));padding:18px;border-radius:12px;margin-bottom:20px;border:1px solid rgba(196,181,253,0.35);box-shadow:inset 0 0 0 1px rgba(250,204,21,0.12),0 10px 24px rgba(0,0,0,0.35);">'
          +'<div style="position:absolute;inset:-45% auto auto -12%;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(250,204,21,0.15),rgba(250,204,21,0));pointer-events:none;"></div>'
          +'<div style="position:absolute;inset:auto -18% -52% auto;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(125,211,252,0.14),rgba(125,211,252,0));pointer-events:none;"></div>'
          +'<div style="position:absolute;inset:8px;border:1px dashed rgba(250,204,21,0.23);border-radius:11px;pointer-events:none;"></div>'
          +'<div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(196,181,253,0.28);padding-bottom:9px;margin-bottom:12px;">'
            +'<h2 style="color:#e9d5ff;font-size:1.13rem;margin:0;font-weight:900;letter-spacing:0.01em;">🧭 [별들이 알려주는 당신의 모습]</h2>'
            +'<span style="font-size:0.68rem;color:#fde68a;border:1px solid rgba(250,204,21,0.45);background:rgba(120,53,15,0.28);padding:2px 7px;border-radius:999px;white-space:nowrap;">Ziwei Persona Matrix</span>'
          +'</div>'
          +'<div style="position:relative;z-index:1;background:linear-gradient(140deg,rgba(30,27,75,0.78),rgba(36,21,73,0.72) 46%,rgba(9,24,46,0.74));border:1px solid rgba(196,181,253,0.34);border-radius:11px;padding:11px;margin-bottom:11px;">'
            +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:7px;">'
              +'<div style="font-size:0.96rem;color:#fef3c7;font-weight:900;letter-spacing:0.01em;">당신의 타고난 오행 기운</div>'
              +'<div style="font-size:0.72rem;color:#c4b5fd;">Zi Wei Dou Shu Element Constellation</div>'
            +'</div>'
            +'<div class="zw-persona-wuxing-grid">'
              +'<div class="zw-persona-wuxing-left" style="background:rgba(12,20,42,0.62);border:1px solid rgba(125,211,252,0.24);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;">'
                +'<div style="font-size:0.84rem;color:#e2e8f0;line-height:1.68;">📚 달빛 서가의 안내자 <b style="color:#fde68a;">별술사</b>가 오행 별자리를 펼쳐 보입니다. 밝게 빛나는 별일수록 현재 명반에서 힘이 강하게 작동하는 축입니다.</div>'
                +'<div style="font-size:1.68rem;line-height:1;">🧙✨</div>'
                +'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;">'+wuxingChipHtml+'</div>'
              +'</div>'
              +'<div class="zw-persona-wuxing-right" style="position:relative;background:radial-gradient(circle at 20% 18%,rgba(255,255,255,0.16),rgba(255,255,255,0) 35%),linear-gradient(180deg,rgba(15,23,42,0.78),rgba(17,24,39,0.78));border:1px solid rgba(196,181,253,0.3);border-radius:10px;padding:8px;min-height:280px;">'
                +'<canvas id="zwWuXingConstellation" width="460" height="320" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas>'
                +'<div style="position:absolute;top:5px;left:50%;transform:translateX(-50%);font-size:0.72rem;color:#fde68a;background:rgba(30,27,75,0.62);border:1px solid rgba(250,204,21,0.28);border-radius:999px;padding:2px 8px;">⛰️ 토 (Earth)</div>'
                +'<div style="position:absolute;top:58px;right:6px;font-size:0.69rem;color:#bbf7d0;background:rgba(6,78,59,0.36);border:1px solid rgba(52,211,153,0.28);border-radius:999px;padding:2px 7px;">🌿 목 (Wood)</div>'
                +'<div style="position:absolute;bottom:18px;right:8px;font-size:0.69rem;color:#fecaca;background:rgba(127,29,29,0.34);border:1px solid rgba(248,113,113,0.28);border-radius:999px;padding:2px 7px;">🔥 화 (Fire)</div>'
                +'<div style="position:absolute;bottom:18px;left:8px;font-size:0.69rem;color:#e2e8f0;background:rgba(51,65,85,0.42);border:1px solid rgba(148,163,184,0.3);border-radius:999px;padding:2px 7px;">⚔️ 금 (Metal)</div>'
                +'<div style="position:absolute;top:58px;left:6px;font-size:0.69rem;color:#bfdbfe;background:rgba(30,64,175,0.32);border:1px solid rgba(96,165,250,0.28);border-radius:999px;padding:2px 7px;">💧 수 (Water)</div>'
              +'</div>'
            +'</div>'
          +'</div>'
          +'<div style="position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px;font-size:0.9rem;line-height:1.75;color:#e2e8f0;">'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">◈ 타고난 성격</b><br>기본 성향은 <b>'+leadKeyword+'</b> 쪽입니다. 쉽게 말해, 중요한 순간에 "먼저 뭐부터 할지"를 비교적 빨리 잡는 편입니다.</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">◈ 숨겨진 성격</b><br>겉은 편해 보여도 속은 꼼꼼한 타입입니다. 숨은 별('+ (borrowedUnique.length ? borrowedUnique.join(' · ') : '핵심 별 중심') +' / '+auxLabel+')이 작동할 때 더 차분하고 신중해집니다.</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">◈ 겉모습 vs 속마음</b><br>겉에서는 '+(mainClean.length ? '또렷하고 단단한 인상' : '부드럽고 편안한 인상')+'을 주기 쉽습니다. 하지만 속으로는 '+(badClean.length ? '실수 가능성을 먼저 점검하는 안전형' : '사람과 결과를 같이 챙기는 균형형')+'에 가깝습니다.</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">◈ 인간관계 스타일</b><br><b>'+relationMood+'</b> 성향이 강합니다. 처음엔 선을 지키고, 신뢰가 쌓이면 오래 가는 관계를 만드는 편입니다.</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">◈ 감정 표현 방식</b><br>'
              +emotionBaseText
              +'<br>• 컨디션/압박: '+emotionVarByState
              +'<br>• 상대와의 거리: '+emotionVarByPerson
              +'<br>• 상황 목표(일/관계): '+emotionVarByGoal
            +'</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#c4b5fd;">◈ 스트레스 받을 때 성격</b><br>'+stressMode+' 요약하면, 무리해서 밀어붙이기보다 리듬 조절할 때 성과가 더 좋습니다.</div>'
            +'<div style="grid-column:1 / -1;background:linear-gradient(120deg,rgba(56,189,248,0.14),rgba(196,181,253,0.12));border:1px solid rgba(125,211,252,0.35);border-radius:10px;padding:10px 11px;"><b style="color:#bae6fd;">✦ 잠재력 요약</b><br>'+hiddenTalent+'. 한 줄 요약: 남들이 놓치는 포인트를 연결해 실제 결과로 만드는 힘이 있습니다.</div>'
          +'</div>'
        +'</div>';

        var careerStarsMeta = extractMainMeta(getPStars('관록궁'));
        var wealthStarsMeta = extractMainMeta(getPStars('재백궁'));
        var careerMainStars = careerStarsMeta.map(function(m){ return m.name; });
        var wealthMainStars = wealthStarsMeta.map(function(m){ return m.name; });
        var careerBorrowed = careerStarsMeta.filter(function(m){ return m.isBorrowed; }).map(function(m){ return m.name; });
        var wealthBorrowed = wealthStarsMeta.filter(function(m){ return m.isBorrowed; }).map(function(m){ return m.name; });
        var careerAux = uniqueList(extractAux(getPStars('관록궁')));
        var wealthAux = uniqueList(extractAux(getPStars('재백궁')));
        var careerBad = uniqueList(extractBad(getPStars('관록궁')));
        var wealthBad = uniqueList(extractBad(getPStars('재백궁')));

        var skillMap = {
          '자미':'조직 리드·총괄 기획', '천기':'기획·분석·문제 해결', '태양':'대외 커뮤니케이션·브랜딩', '무곡':'실행·재무 수호',
          '천동':'서비스·케어·관계 완충', '염정':'협상·천기·마케팅', '천부':'운행·수호·자산 보전', '태음':'디테일·리서치·정밀 수호',
          '탐랑':'세일즈·사업 확장', '거문':'문서·법무·컨설팅', '천상':'조정·품질·거버넌스', '천량':'교육·코칭·감리',
          '칠살':'고난도 프로젝트 돌파', '파군':'혁신·신사업 전환'
        };
        var jobMap = {
          '자미':'경영·천기·공공 리더십', '천기':'IT/데이터·기획·R&D', '태양':'브랜딩·교육·미디어·대외협력', '무곡':'금융·재무·운행·제조 수호',
          '천동':'복지·HR·고객경험·상담', '염정':'마케팅·비즈개발·협상 직무', '천부':'자산수호·회계·행정·컴플라이언스', '태음':'리서치·디자인·콘텐츠·정밀 사무',
          '탐랑':'영업·사업개발·유통·엔터/이벤트', '거문':'법무·컨설팅·에디팅·강의', '천상':'PMO·품질수호·조직운행', '천량':'교육·의료행정·감사·자문',
          '칠살':'프로젝트 오너·위기수호·특수기술', '파군':'스타트업·신사업·전환 혁신'
        };
        var businessStars = ['탐랑','파군','칠살','무곡','염정'];
        var companyStars = ['천부','천상','태음','거문','천량','자미'];

        var careerCore = careerMainStars[0] || (leadMain || '공궁');
        var wealthCore = wealthMainStars[0] || careerCore;
        var careerSkill = skillMap[careerCore] || '종합형 문제 해결';
        var successJobs = careerMainStars.length
          ? uniqueList(careerMainStars.map(function(s){ return jobMap[s] || (s+' 기반 전문직'); })).slice(0,3).join(' / ')
          : '운행·기획·분석 기반의 안정형 직무';

        var businessScore = 50;
        businessScore += careerMainStars.filter(function(s){ return businessStars.indexOf(s)>=0; }).length * 14;
        businessScore += wealthMainStars.filter(function(s){ return businessStars.indexOf(s)>=0; }).length * 10;
        businessScore += (hasHwakwon ? 8 : 0) + (hasHwarok ? 6 : 0);
        businessScore -= (careerBad.length + wealthBad.length) * 4;
        var companyScore = 50;
        companyScore += careerMainStars.filter(function(s){ return companyStars.indexOf(s)>=0; }).length * 12;
        companyScore += wealthMainStars.filter(function(s){ return companyStars.indexOf(s)>=0; }).length * 8;
        companyScore += (hasHwakwa ? 6 : 0);
        companyScore -= (careerBad.length + wealthBad.length) * 3;
        businessScore = Math.max(0, Math.min(100, businessScore));
        companyScore = Math.max(0, Math.min(100, companyScore));
        var bizVsJob = businessScore >= companyScore
          ? ('사업형 우세 ('+businessScore+' : '+companyScore+')')
          : ('직장형 우세 ('+businessScore+' : '+companyScore+')');

        var vocation = careerMainStars.length
          ? ('관록궁 주성 '+careerMainStars.join(' · ')+' 중심으로, '+careerSkill+'을 핵심 역량으로 쓰는 역할에서 적성이 잘 드러납니다.')
          : '관록궁 공궁 구조이므로 고정 직함보다 환경 적응형 포지션에서 역량이 드러나기 쉽습니다.';

        var bestWealth = null;
        var bestWealthEarly = null;
        if (pd.daHanList && pd.daHanList.length) {
          pd.daHanList.forEach(function(dh){
            var score = 0;
            var ds = pd.stars[dh.idx] || {main:[],aux:[],bad:[],borrowedMain:[]};
            var dMainMeta = extractMainMeta(ds);
            var dMain = dMainMeta.map(function(m){ return m.name; });
            var dAux = uniqueList(extractAux(ds));
            var dBad = uniqueList(extractBad(ds));
            var dSihua = [];
            if (pd.sihuaData) {
              for (var sx in pd.sihuaData) {
                if (pd.sihuaData[sx].palaceIdx === dh.idx) dSihua.push(pd.sihuaData[sx]);
              }
            }
            score += (dh.palaceName === '재백궁' ? 26 : 0);
            score += (dh.palaceName === '관록궁' ? 20 : 0);
            score += dSihua.filter(function(s){ return s.type === '화록'; }).length * 12;
            score += dSihua.filter(function(s){ return s.type === '화권'; }).length * 8;
            score += dSihua.filter(function(s){ return s.type === '화과'; }).length * 6;
            score -= dSihua.filter(function(s){ return s.type === '화기'; }).length * 12;
            score += dAux.length * 2;
            score -= dBad.length * 3;
            score += dMain.filter(function(s){ return ['무곡','탐랑','자미','천부','태음'].indexOf(s)>=0; }).length * 5;
            var startAgeNum = parseInt(dh.startAge, 10);
            if (!bestWealth || score > bestWealth.score) {
              bestWealth = { score: score, age: dh.startAge+'~'+dh.endAge, palace: dh.palaceName, startAge: isNaN(startAgeNum) ? 0 : startAgeNum };
            }
            if ((isNaN(startAgeNum) || startAgeNum < 70) && (!bestWealthEarly || score > bestWealthEarly.score)) {
              bestWealthEarly = { score: score, age: dh.startAge+'~'+dh.endAge, palace: dh.palaceName, startAge: isNaN(startAgeNum) ? 0 : startAgeNum };
            }
          });
        }
        var wealthPeakText = '';
        var wealthComfortText = '';
        if (bestWealth) {
          wealthPeakText = bestWealth.age+'세 ('+bestWealth.palace+') 대한이 재물 흐름이 상대적으로 강해지는 구간으로 해석됩니다. 이 시기는 확장보다 수익 회수·자산 고정화 설계를 병행할 때 성과가 안정적으로 커지기 쉽습니다.';
          if (bestWealth.startAge >= 70 && bestWealthEarly) {
            wealthComfortText = '<div style="margin-top:10px;background:rgba(250,204,21,0.10);border:1px solid rgba(250,204,21,0.35);border-radius:9px;padding:9px 10px;">'
              +'<b style="color:#fde68a;">☀️ 선행 수익 구간:</b> 강한 구간이 늦게 잡히더라도 <b>'+bestWealthEarly.age+'세 ('+bestWealthEarly.palace+')</b> 구간에서 미리 수익화 기반을 설계할 수 있습니다.'
              +'<br><span style="color:#e2e8f0;">현금흐름을 위해 1) 고정비 축소 + 월 단위 수익 점검, 2) 본업 기반 부수익(강의/자문/디지털 자산), 3) 고위험 확장보다 회수형 포트폴리오를 우선 적용하세요.</span>'
              +'<br><span style="color:#bbf7d0;">조기 구간에서 작은 성과를 반복하면 후반 강한 구간의 기반이 더 단단해집니다.</span>'
            +'</div>';
          }
        } else {
          wealthPeakText = '대한 데이터가 제한적이므로 재백궁·관록궁 활성 구간을 중심으로 월/년 단위 재무 검증을 권장합니다.';
        }

        var sec_ability = '<div style="position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(16,21,43,0.96),rgba(21,35,64,0.92) 52%,rgba(12,28,40,0.9));padding:18px;border-radius:12px;margin-bottom:20px;border:1px solid rgba(125,211,252,0.28);box-shadow:inset 0 0 0 1px rgba(134,239,172,0.1),0 10px 24px rgba(0,0,0,0.35);">'
          +'<div style="position:absolute;inset:-42% auto auto -10%;width:210px;height:210px;border-radius:50%;background:radial-gradient(circle,rgba(110,231,183,0.13),rgba(110,231,183,0));pointer-events:none;"></div>'
          +'<div style="position:absolute;inset:auto -15% -48% auto;width:270px;height:270px;border-radius:50%;background:radial-gradient(circle,rgba(125,211,252,0.15),rgba(125,211,252,0));pointer-events:none;"></div>'
          +'<div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(125,211,252,0.24);padding-bottom:9px;margin-bottom:12px;">'
            +'<h2 style="color:#bae6fd;font-size:1.13rem;margin:0;font-weight:900;letter-spacing:0.01em;">💼 [관록궁·재백궁으로 보는 일과 돈]</h2>'
            +'<span style="font-size:0.68rem;color:#bbf7d0;border:1px solid rgba(110,231,183,0.45);background:rgba(20,83,45,0.28);padding:2px 7px;border-radius:999px;white-space:nowrap;">12궁 근거</span>'
          +'</div>'
          +'<div style="position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px;font-size:0.9rem;line-height:1.75;color:#e2e8f0;">'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#93c5fd;">◈ 직업 성향이 살아나는 영역</b><br>관록궁 핵심성 '+(careerMainStars.length?careerMainStars.join(' · '):'공궁')+' 기준으로 '+careerSkill+' 역량이 드러나기 쉽습니다. 맞는 역할 후보: '+successJobs+'.</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#93c5fd;">◈ 수익화 방식과 조직 적합도</b><br>재백궁 핵심성 '+(wealthMainStars.length?wealthMainStars.join(' · '):'공궁')+' 기준 수익화 패턴은 '+bizVsJob+'입니다. '+(businessScore>=companyScore?'확장·영업·신사업 시도에서 강점이 비교적 큽니다.':'조직 내 권한 축적·전문성 고도화에서 수익 안정성이 높게 잡힙니다.')+'</div>'
            +'<div style="background:rgba(30,41,59,0.42);border:1px solid rgba(148,163,184,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#93c5fd;">◈ 잘 맞는 역할 가설</b><br>'+vocation+' '+(careerBorrowed.length?('차성 반영('+careerBorrowed.join(' · ')+') 구간에서는 역할 확장형 커리어 전환을 검토할 수 있습니다.'):'')+'</div>'
            +'<div style="grid-column:1 / -1;background:linear-gradient(120deg,rgba(34,211,238,0.14),rgba(74,222,128,0.12));border:1px solid rgba(110,231,183,0.35);border-radius:10px;padding:10px 11px;"><b style="color:#bbf7d0;">✦ 재물 흐름이 강해지는 구간</b><br>'+wealthPeakText+wealthComfortText+'</div>'
          +'</div>'
        +'</div>';

        var strategicAuxStars = ['좌보','우필','천괴','천월','문창','문곡','녹존','천마'];
        var auxPresence = Object.create(null);
        var auxPlacement = Object.create(null);
        strategicAuxStars.forEach(function(st){
          auxPresence[st] = false;
          auxPlacement[st] = [];
        });

        for (var apIdx = 0; apIdx < 12; apIdx++) {
          var apName = pd.palacesByIndex[apIdx] || '';
          var apStars = pd.stars[apIdx] || {main:[],aux:[],bad:[],borrowedMain:[]};
          var apAux = uniqueList(extractAux(apStars));
          strategicAuxStars.forEach(function(st){
            if (apAux.indexOf(st) >= 0) {
              auxPresence[st] = true;
              auxPlacement[st].push(apName || ('궁위'+apIdx));
            }
          });
        }

        var auxFound = strategicAuxStars.filter(function(st){ return !!auxPresence[st]; });
        var auxFoundLabel = auxFound.length ? auxFound.join(' · ') : '직접 포착 약함';
        var auxMissing = strategicAuxStars.filter(function(st){ return !auxPresence[st]; });
        var coopAxisOn = auxPresence['좌보'] && auxPresence['우필'];
        var luckAxisOn = auxPresence['천괴'] && auxPresence['천월'];
        var logicAxisOn = auxPresence['문창'] && auxPresence['문곡'];
        var growthAxisOn = auxPresence['녹존'] && auxPresence['천마'];

        var placeCountByStar = function(st, targets) {
          var list = auxPlacement[st] || [];
          return list.filter(function(n){ return targets.indexOf(n) >= 0; }).length;
        };

        var collabScore = 34;
        collabScore += coopAxisOn ? 30 : ((auxPresence['좌보'] || auxPresence['우필']) ? 14 : 0);
        collabScore += luckAxisOn ? 16 : ((auxPresence['천괴'] || auxPresence['천월']) ? 8 : 0);
        collabScore += placeCountByStar('좌보', ['노복궁','관록궁','명궁']) * 7;
        collabScore += placeCountByStar('우필', ['노복궁','관록궁','천이궁']) * 7;
        collabScore = Math.max(20, Math.min(98, collabScore));

        var insightScore = 34;
        insightScore += logicAxisOn ? 34 : ((auxPresence['문창'] || auxPresence['문곡']) ? 15 : 0);
        insightScore += placeCountByStar('문창', ['명궁','관록궁','재백궁','복덕궁']) * 6;
        insightScore += placeCountByStar('문곡', ['명궁','관록궁','재백궁','천이궁']) * 6;
        insightScore += luckAxisOn ? 7 : 0;
        insightScore = Math.max(20, Math.min(98, insightScore));

        var mobilityScore = 34;
        mobilityScore += growthAxisOn ? 34 : ((auxPresence['녹존'] || auxPresence['천마']) ? 15 : 0);
        mobilityScore += placeCountByStar('녹존', ['재백궁','관록궁','전택궁']) * 7;
        mobilityScore += placeCountByStar('천마', ['천이궁','관록궁','재백궁']) * 7;
        mobilityScore += (auxPresence['천괴'] || auxPresence['천월']) ? 5 : 0;
        mobilityScore = Math.max(20, Math.min(98, mobilityScore));

        var coachTitle = '세상을 설계하는 보이지 않는 손';
        var coachSummary = auxFound.length >= 5
          ? '보조성 8종 중 다수가 활성화되어, 사람·정보·자원을 구조화해 결과를 만드는 설계형 명반입니다.'
          : (auxFound.length >= 3
            ? '핵심 보조성이 선택적으로 활성화되어, 특정 구간에서 레버리지 효율이 급상승하는 집중형 명반입니다.'
            : '보조성 직접 개입은 제한적이지만, 명궁/관록궁 주성 중심의 자기주도 실행으로 우위를 만드는 타입입니다.');

        var coopDetail = coopAxisOn
          ? '좌보·우필이 함께 작동해 도움 요청을 감정이 아닌 구조로 설계합니다. 특히 '+((auxPlacement['좌보']||[]).concat(auxPlacement['우필']||[]).slice(0,3).join(' · ') || '핵심 궁위')+'에서 조율력이 강합니다.'
          : '좌보·우필의 동시 결집은 약하지만, 단독 배치가 있는 궁위에서 협업 핵심 노드를 먼저 세우면 조력 효율이 빠르게 올라갑니다.';
        var luckDetail = luckAxisOn
          ? '천괴·천월이 동시 활성화되어 기회가 우연처럼 보이는 순간도 준비된 필연으로 연결할 가능성이 높습니다.'
          : '천괴·천월 중 단일 축이 작동하므로 기회 포착은 좋지만, 선행 준비 체크리스트를 붙여야 성과 전환이 안정됩니다.';
        var logicDetail = logicAxisOn
          ? '문창·문곡 결합으로 복잡한 정보를 구조화한 뒤 설득 가능한 언어로 변환하는 힘이 강합니다. 기획서/제안서/문서 설계가 경쟁 우위가 됩니다.'
          : '문창·문곡의 한 축이 우세하므로 논리 또는 감성 한쪽으로 쏠리기 쉽습니다. 반대 축 검토 단계를 추가하면 설득력이 크게 상승합니다.';
        var growthDetail = growthAxisOn
          ? '녹존·천마 조합이 자본 회수력과 기동성을 동시에 올려줍니다. 빠르게 움직이되 회수 타이밍을 잃지 않는 성장 엔진이 강점입니다.'
          : '녹존·천마가 분리 작동하므로, 속도(천마)와 회수(녹존) 중 약한 축을 의식적으로 보완해야 성장 안정성이 높아집니다.';

        var dominantTrack = [
          { k: '협업 아키텍처', v: collabScore },
          { k: '논리적 심미안', v: insightScore },
          { k: '고속 성장 엔진', v: mobilityScore }
        ].sort(function(a,b){ return b.v - a.v; })[0];

        var coachingFocus = dominantTrack.k === '협업 아키텍처'
          ? '당장 혼자 해결하려는 업무 1개를 협업형 과제로 전환하세요. 역할·의사결정권·리뷰 주기를 먼저 명시하면 성과가 빨라집니다.'
          : (dominantTrack.k === '논리적 심미안'
            ? '이번 주 핵심 과제를 1페이지 구조도로 정리하세요. 문제정의-가설-실험-회수 지표 4단으로 만들면 설득력이 급상승합니다.'
            : '수익/성과 회수 시점을 먼저 정하고 실행하세요. 시작 기준보다 종료 기준을 선명히 잡을수록 손실이 줄고 누적 성장이 커집니다.');

        var potentialArchetype = dominantTrack.k === '협업 아키텍처'
          ? '사람과 자원을 배치해 큰 판을 움직이는 성좌 설계자'
          : (dominantTrack.k === '논리적 심미안'
            ? '흩어진 신호를 문장과 구조로 바꾸는 별빛 해석가'
            : '기회가 열린 순간 빠르게 궤도에 진입하는 돌파 항해자');
        var potentialMoneyPath = dominantTrack.k === '협업 아키텍처'
          ? '프로젝트 총괄, 운영 설계, 파트너십, 팀 빌딩처럼 여러 사람의 힘을 하나의 결과로 묶을 때 재물화가 빠릅니다.'
          : (dominantTrack.k === '논리적 심미안'
            ? '분석 리포트, 컨설팅, 교육, 콘텐츠, 브랜딩처럼 복잡한 정보를 이해 가능한 언어로 바꾸는 영역에서 값이 붙습니다.'
            : '영업, 런칭, 이동형 비즈니스, 단기 실험, 신시장 개척처럼 속도와 타이밍을 다루는 장면에서 성과가 커집니다.');
        var potentialRelationshipUse = dominantTrack.k === '협업 아키텍처'
          ? '관계에서는 감정의 편을 드는 사람보다, 서로의 역할과 기대치를 정리해 주는 조율자로 빛납니다.'
          : (dominantTrack.k === '논리적 심미안'
            ? '관계에서는 상대의 말 뒤에 숨은 맥락을 읽고, 감정이 길을 잃지 않게 언어를 부여하는 힘이 강합니다.'
            : '관계에서는 정체된 분위기에 새 경험과 행동을 넣어 다시 움직이게 만드는 점화력이 강합니다.');
        var potentialShadow = dominantTrack.k === '협업 아키텍처'
          ? '과도한 책임감으로 모든 사람의 문제를 떠안으면 별빛이 흐려집니다. 역할 경계가 곧 운의 보호막입니다.'
          : (dominantTrack.k === '논리적 심미안'
            ? '생각이 깊어질수록 실행을 늦추는 함정이 생깁니다. 70% 확신에서 작은 실험을 시작해야 별이 움직입니다.'
            : '속도가 강점인 만큼 회수 기준 없이 달리면 손실도 빨라집니다. 시작 전 종료 조건을 먼저 새기세요.');
        var potential90Day = dominantTrack.k === '협업 아키텍처'
          ? '30일은 역할 정리, 60일은 협업 루틴 고정, 90일은 위임 가능한 시스템으로 확장하세요.'
          : (dominantTrack.k === '논리적 심미안'
            ? '30일은 자료 수집, 60일은 구조화, 90일은 공개 가능한 결과물 하나로 완성하세요.'
            : '30일은 시장 탐색, 60일은 빠른 실험, 90일은 성과가 난 채널 하나에 집중하세요.');

        var sec_hidden_power = '<section class="zw-hidden-power">'
          +'<div class="zw-hidden-power__starfield" aria-hidden="true"></div>'
          +'<div class="zw-hidden-power__inner">'
            +'<h2 class="zw-hidden-power__title">✦ 당신의 숨겨진 능력: "'+coachTitle+'"</h2>'
            +'<p class="zw-hidden-power__lead">'+coachSummary+'</p>'
            +'<div class="zw-hidden-power__chips">'
              +'<span class="zw-hidden-power__chip">포착된 보조성: '+auxFoundLabel+'</span>'
              +'<span class="zw-hidden-power__chip">협업 아키텍처 '+collabScore+'점</span>'
              +'<span class="zw-hidden-power__chip">데이터 기반 직관 '+insightScore+'점</span>'
              +'<span class="zw-hidden-power__chip">속도 조절 엔진 '+mobilityScore+'점</span>'
            +'</div>'
            +'<div class="zw-hidden-power__grid">'
              +'<article class="zw-hidden-power__card">'
                +'<h3>1. 🛠️ 시스템적 조율력 (좌보·우필 x 천괴·천월)</h3>'
                +'<p><b>핵심 역량:</b> 당신의 강점은 직접 해결보다 레버리지 구조를 설계하는 데 있습니다.</p>'
                +'<p><b>상세 풀이:</b> '+coopDetail+' '+luckDetail+'</p>'
              +'</article>'
              +'<article class="zw-hidden-power__card">'
                +'<h3>2. 📝 데이터 기반의 직관 (문창·문곡)</h3>'
                +'<p><b>핵심 역량:</b> 무질서한 데이터에서 맥락을 추출해 설득 가능한 형태로 정렬합니다.</p>'
                +'<p><b>상세 풀이:</b> '+logicDetail+'</p>'
              +'</article>'
              +'<article class="zw-hidden-power__card">'
                +'<h3>3. 🐎 타이밍의 지배자 (녹존·천마)</h3>'
                +'<p><b>핵심 역량:</b> 달려야 할 때와 멈춰야 할 때를 분리해 성장 효율을 높입니다.</p>'
                +'<p><b>상세 풀이:</b> '+growthDetail+'</p>'
              +'</article>'
            +'</div>'
            +'<div class="zw-oracle-grid" aria-label="' + _sajuEngineText("se_20144_attr_aria_label") + '">'
              +'<article class="zw-oracle-card zw-oracle-card--gold"><div class="zw-oracle-card__title">재능 원형</div><b>'+potentialArchetype+'</b><br>현재 명반에서 가장 강하게 반복되는 잠재력 축은 '+dominantTrack.k+'입니다.</article>'
              +'<article class="zw-oracle-card"><div class="zw-oracle-card__title">돈이 되는 방식</div>'+potentialMoneyPath+'</article>'
              +'<article class="zw-oracle-card"><div class="zw-oracle-card__title">관계에서 쓰이는 힘</div>'+potentialRelationshipUse+'</article>'
              +'<article class="zw-oracle-card zw-oracle-card--rose"><div class="zw-oracle-card__title">잠재력의 그림자</div>'+potentialShadow+'</article>'
              +'<article class="zw-oracle-card" style="grid-column:1 / -1;"><div class="zw-oracle-card__title">90일 활성화 처방</div>'+potential90Day+'</article>'
            +'</div>'
            +'<div class="zw-hidden-power__guide">'
              +'<h3>💡 활용 가이드 (Success Code)</h3>'
              +'<p><b>Warning:</b> 모든 것을 혼자 처리하면 명반의 장점이 반감됩니다. 연결과 위임이 성과 증폭 장치입니다.</p>'
              +'<p><b>Action:</b> '+coachingFocus+'</p>'
              + (auxMissing.length ? ('<p><b>보완 포인트:</b> 현재 직접 포착이 약한 보조성은 '+auxMissing.join(' · ')+'입니다. 해당 성향을 팀/도구/프로세스로 외부 보강하면 균형이 완성됩니다.</p>') : '')
            +'</div>'
          +'</div>'
        +'</section>';

        var spousePal = getPStars('부부궁') || getPStars('\uBD80\uCC98\uAD81') || {main:[],aux:[],bad:[],borrowedMain:[]};
        var spouseMainMeta = extractMainMeta(spousePal);
        var spouseMain = spouseMainMeta.map(function(m){ return m.name; });
        var spouseAux = uniqueList(extractAux(spousePal));
        var spouseBad = uniqueList(extractBad(spousePal));
        var spouseBorrowed = spouseMainMeta.filter(function(m){ return m.isBorrowed; }).map(function(m){ return m.name; });

        var mengPalForLove = getPStars('명궁') || {main:[],aux:[],bad:[],borrowedMain:[]};
        var bokPalForLove = getPStars('복덕궁') || {main:[],aux:[],bad:[],borrowedMain:[]};
        var movePalForLove = getPStars('천이궁') || {main:[],aux:[],bad:[],borrowedMain:[]};
        var homePalForLove = getPStars('전택궁') || {main:[],aux:[],bad:[],borrowedMain:[]};

        var mengMainLove = extractMainMeta(mengPalForLove).map(function(m){ return m.name; });
        var bokMainLove = extractMainMeta(bokPalForLove).map(function(m){ return m.name; });
        var moveMainLove = extractMainMeta(movePalForLove).map(function(m){ return m.name; });
        var homeMainLove = extractMainMeta(homePalForLove).map(function(m){ return m.name; });

        var romanceStars = ['탐랑','태음','천동','염정','태양'];
        var stableStars = ['천부','천량','천상','자미','무곡'];
        var independentStars = ['칠살','파군','무곡','거문'];
        var socialStars = ['탐랑','태양','천동','천기'];

        var helperGoodStars = ['좌보','우필','문창','문곡','천괴','천월','녹존'];
        var helperRiskStars = ['경양','타라','화성','영성','지공','지겁'];

        var loveHeat = 42;
        loveHeat += spouseMain.filter(function(s){ return romanceStars.indexOf(s) >= 0; }).length * 12;
        loveHeat += spouseAux.filter(function(s){ return helperGoodStars.indexOf(s) >= 0; }).length * 4;
        loveHeat -= spouseBad.filter(function(s){ return helperRiskStars.indexOf(s) >= 0; }).length * 5;
        if (spouseBorrowed.length) loveHeat -= 4;

        var commitment = 45;
        commitment += spouseMain.filter(function(s){ return stableStars.indexOf(s) >= 0; }).length * 11;
        commitment += bokMainLove.filter(function(s){ return stableStars.indexOf(s) >= 0; }).length * 7;
        commitment += (hasHwakwa ? 5 : 0);
        commitment -= spouseBad.length * 4;

        var freedomNeed = 38;
        freedomNeed += spouseMain.filter(function(s){ return independentStars.indexOf(s) >= 0; }).length * 11;
        freedomNeed += moveMainLove.filter(function(s){ return socialStars.indexOf(s) >= 0; }).length * 6;
        freedomNeed += (hasHwakwon ? 4 : 0);

        var flirtRiskScore = 18;
        flirtRiskScore += spouseMain.filter(function(s){ return ['탐랑','파군','칠살','염정'].indexOf(s) >= 0; }).length * 14;
        flirtRiskScore += (hasHwagi ? 10 : 0);
        flirtRiskScore += spouseBad.length * 6;
        flirtRiskScore -= spouseMain.filter(function(s){ return ['천부','천량','자미','무곡'].indexOf(s) >= 0; }).length * 8;
        flirtRiskScore -= spouseAux.filter(function(s){ return ['좌보','우필','문창','문곡'].indexOf(s) >= 0; }).length * 3;

        loveHeat = Math.max(0, Math.min(100, loveHeat));
        commitment = Math.max(0, Math.min(100, commitment));
        freedomNeed = Math.max(0, Math.min(100, freedomNeed));
        flirtRiskScore = Math.max(0, Math.min(100, flirtRiskScore));

        var spouseLabel = spouseMain.length ? spouseMain.join(' · ') : '공궁(차성/대궁 영향형)';
        var spouseAuxLabel = spouseAux.length ? spouseAux.join(' · ') : '보조 길성 약함';
        var spouseBadLabel = spouseBad.length ? spouseBad.join(' · ') : '흉성 압력 약함';

        var loveStyle = '';
        if (loveHeat >= 70 && commitment >= 60) {
          loveStyle = '"불꽃 + 책임" 혼합형입니다. 감정이 붙으면 빠르게 깊어지지만, 관계가 시작되면 오래 지키려는 성향이 강합니다.';
        } else if (freedomNeed >= 70) {
          loveStyle = '"친밀 + 자유" 균형형입니다. 좋아해도 내 리듬을 지키는 편이며, 존중받을 때 애정 표현이 크게 살아납니다.';
        } else if (commitment >= 68) {
          loveStyle = '"신뢰 우선" 안정형입니다. 천천히 가까워지지만 한번 마음을 주면 일관성이 높고 관계 운행이 성실합니다.';
        } else {
          loveStyle = '"상황 적응" 현실형입니다. 상대와 타이밍에 따라 방식이 달라지며, 감정과 조건을 함께 보는 타입에 가깝습니다.';
        }

        var charmPoint = '';
        if (spouseMain.some(function(s){ return ['태양','탐랑','염정'].indexOf(s) >= 0; })) {
          charmPoint = '사람을 편하게 끌어당기는 존재감과 대화 밀도가 매력 포인트입니다. 분위기를 살리는 능력이 강합니다.';
        } else if (spouseMain.some(function(s){ return ['태음','천동','천량'].indexOf(s) >= 0; })) {
          charmPoint = '따뜻함·배려·정서적 안정감이 강한 매력으로 작동합니다. "함께 있으면 편안한 사람"으로 기억되기 쉽습니다.';
        } else {
          charmPoint = '약속을 지키는 태도, 책임감, 생활 리듬의 안정성이 장기 매력으로 작동합니다.';
        }

        var attractedToYou = '';
        if (spouseMain.some(function(s){ return ['자미','천부','무곡'].indexOf(s) >= 0; })) {
          attractedToYou = '성숙하고 자기 일에 책임 있는 사람, 생활 기반을 탄탄히 운행하는 타입이 당신에게 강하게 끌립니다.';
        } else if (spouseMain.some(function(s){ return ['탐랑','태양','천기'].indexOf(s) >= 0; })) {
          attractedToYou = '감각적이고 표현이 적극적인 사람, 함께 성장/도전할 수 있는 에너지형 인연이 붙기 쉽습니다.';
        } else {
          attractedToYou = '안정감과 공감 능력을 함께 가진 사람, 말이 통하고 일상 호흡이 맞는 인연이 강하게 들어옵니다.';
        }

        var youAttractedTo = '';
        if (mengMainLove.some(function(s){ return ['칠살','파군','거문'].indexOf(s) >= 0; })) {
          youAttractedTo = '똑똑하고 자기 주관이 분명한 사람에게 끌립니다. 대화의 깊이와 문제 해결력이 중요한 선택 기준입니다.';
        } else if (mengMainLove.some(function(s){ return ['천동','태음','천량'].indexOf(s) >= 0; })) {
          youAttractedTo = '다정하고 감정선이 섬세한 사람, 관계의 온도를 잘 맞춰주는 사람에게 빠르게 마음이 갑니다.';
        } else {
          youAttractedTo = '약속을 잘 지키고 생활 페이스가 안정적인 사람, 장기적으로 같이 성장할 수 있는 타입을 선호합니다.';
        }

        var idealSpouse = '이상적인 배우자 유형은 <b>'
          + (commitment >= 65 ? '안정성과 책임감이 높은 사람' : '유연성과 소통력이 높은 사람')
          + '</b>입니다. 특히 '
          + (freedomNeed >= 65 ? '서로의 개인 시간을 존중해 주는 구조' : '생활 리듬을 함께 맞춰가는 구조')
          + '에서 결혼 만족도가 높아집니다.';

        var marriageShift = '';
        if (moveMainLove.some(function(s){ return ['탐랑','파군','칠살','천기'].indexOf(s) >= 0; })) {
          marriageShift = '결혼 후 이동·직무 전환·생활권 변화가 함께 오기 쉽습니다. 두 사람의 생활 기준을 먼저 합의하면 갈등 비용이 크게 줄어듭니다.';
        } else if (homeMainLove.some(function(s){ return ['천부','태음','자미'].indexOf(s) >= 0; })) {
          marriageShift = '결혼 후 자산·주거·가정 운행이 안정적으로 재편될 가능성이 큽니다. 집/재무 계획을 공동 영험 지표로 운행하면 시너지가 큽니다.';
        } else {
          marriageShift = '결혼 후 변화는 급격하기보다 점진형입니다. 역할 분담표와 의사결정 규칙을 합의하면 장기 만족도가 상승합니다.';
        }

        var marriageBest = null;
        var marriageCandidates = [];
        var currentAgeForMarriage = Math.max(0, (typeof CURRENT_AGE === 'number' ? CURRENT_AGE - 1 : 0));
        var parseMarriageAge = function(v) {
          var n = parseInt(v, 10);
          return isNaN(n) ? 0 : n;
        };
        if (pd.daHanList && pd.daHanList.length) {
          pd.daHanList.forEach(function(dh){
            var ds2 = pd.stars[dh.idx] || {main:[],aux:[],bad:[],borrowedMain:[]};
            var dMain2 = extractMainMeta(ds2).map(function(m){ return m.name; });
            var dAux2 = uniqueList(extractAux(ds2));
            var dBad2 = uniqueList(extractBad(ds2));
            var dhSihua2 = [];
            if (pd.sihuaData) {
              for (var sx2 in pd.sihuaData) {
                if (pd.sihuaData[sx2].palaceIdx === dh.idx) dhSihua2.push(pd.sihuaData[sx2]);
              }
            }
            var mScore = 0;
            var reasonTags = [];
            if (dh.palaceName === '부부궁' || dh.palaceName === '\uBD80\uCC98\uAD81') {
              mScore += 28;
              reasonTags.push('부부궁 활성');
            }
            if (dh.palaceName === '명궁') {
              mScore += 14;
              reasonTags.push('명궁 자기결정');
            }
            if (dh.palaceName === '복덕궁') {
              mScore += 12;
              reasonTags.push('복덕궁 정서 안정');
            }
            if (dh.palaceName === '전택궁') {
              mScore += 11;
              reasonTags.push('전택궁 생활 기반');
            }
            if (dh.palaceName === '천이궁') {
              mScore += 10;
              reasonTags.push('천이궁 만남 확장');
            }
            var hwarokCnt = dhSihua2.filter(function(s){ return s.type === '화록'; }).length;
            var hwakwonCnt = dhSihua2.filter(function(s){ return s.type === '화권'; }).length;
            var hwakwaCnt = dhSihua2.filter(function(s){ return s.type === '화과'; }).length;
            var hwagiCnt = dhSihua2.filter(function(s){ return s.type === '화기'; }).length;
            mScore += hwarokCnt * 11;
            mScore += hwakwonCnt * 7;
            mScore += hwakwaCnt * 8;
            mScore -= hwagiCnt * 12;
            if (hwarokCnt) reasonTags.push('화록 인연 유입');
            if (hwakwonCnt) reasonTags.push('화권 관계 결정');
            if (hwakwaCnt) reasonTags.push('화과 약속 정돈');
            if (hwagiCnt) reasonTags.push('화기 조율 필요');
            var stableMainCnt = dMain2.filter(function(s){ return ['천동','태음','천상','천량','자미','천부'].indexOf(s) >= 0; }).length;
            var helperCnt = dAux2.filter(function(s){ return helperGoodStars.indexOf(s) >= 0; }).length;
            mScore += stableMainCnt * 5;
            mScore += helperCnt * 2;
            mScore -= dBad2.length * 3;
            if (stableMainCnt) reasonTags.push('안정 주성');
            if (helperCnt) reasonTags.push('보조 길성');
            if (dBad2.length) reasonTags.push('흉성 압박');
            var startAgeNum = parseMarriageAge(dh.startAge);
            var endAgeNum = parseMarriageAge(dh.endAge);
            var marriageCandidate = {
              age: dh.startAge+'~'+dh.endAge,
              startAge: startAgeNum,
              endAge: endAgeNum,
              palace: dh.palaceName,
              score: mScore,
              reasonTags: reasonTags
            };
            marriageCandidates.push(marriageCandidate);
            if (!marriageBest || mScore > marriageBest.score) {
              marriageBest = marriageCandidate;
            }
          });
        }
        marriageCandidates.sort(function(a,b){ return b.score - a.score; });
        var isMarriagePeakLate = !!(marriageBest && marriageBest.startAge && (
          (marriageBest.startAge >= 50 && currentAgeForMarriage < 48) ||
          (currentAgeForMarriage > 0 && marriageBest.startAge > currentAgeForMarriage + 15)
        ));
        var marriageAlt = null;
        if (isMarriagePeakLate && marriageCandidates.length) {
          var altPool = marriageCandidates.filter(function(item) {
            if (!item || !item.startAge) return false;
            if (currentAgeForMarriage && item.endAge < currentAgeForMarriage) return false;
            if (item.startAge >= marriageBest.startAge) return false;
            if (item.score < marriageBest.score - 12) return false;
            if ((item.reasonTags || []).indexOf('화기 조율 필요') >= 0 && item.score < marriageBest.score - 6) return false;
            return item.startAge < 50 || (currentAgeForMarriage && item.startAge <= currentAgeForMarriage + 10);
          });
          if (!altPool.length) {
            altPool = marriageCandidates.filter(function(item) {
              if (!item || !item.startAge) return false;
              if (currentAgeForMarriage && item.endAge < currentAgeForMarriage) return false;
              return item.startAge < marriageBest.startAge;
            });
          }
          altPool.sort(function(a,b){
            var aNear = currentAgeForMarriage ? Math.abs(a.startAge - currentAgeForMarriage) : a.startAge;
            var bNear = currentAgeForMarriage ? Math.abs(b.startAge - currentAgeForMarriage) : b.startAge;
            return (b.score - a.score) || (aNear - bNear);
          });
          marriageAlt = altPool[0] || null;
        }
        var marriageBestReason = marriageBest && marriageBest.reasonTags && marriageBest.reasonTags.length
          ? marriageBest.reasonTags.slice(0,3).join(' · ')
          : '부부궁·명궁 흐름';
        var marriageAltReason = marriageAlt && marriageAlt.reasonTags && marriageAlt.reasonTags.length
          ? marriageAlt.reasonTags.slice(0,3).join(' · ')
          : '관계 준비 흐름';
        var marriageLuckText = '';
        var marriageTimingCounselHtml = '';
        if (marriageBest) {
          marriageLuckText = '명반상 가장 강한 결실 구간은 <b>'+marriageBest.age+'세 ('+zwDisplayPalaceName(marriageBest.palace)+')</b>입니다. 이 시기는 관계의 제도화(동거·혼인·공동 자산 설계)에 유리합니다.';
          if (marriageAlt) {
            marriageLuckText += ' 다만 그 흐름이 늦게 잡히므로, 현실 상담 기준으로는 <b>'+marriageAlt.age+'세 ('+zwDisplayPalaceName(marriageAlt.palace)+')</b> 구간을 먼저 준비해도 좋습니다.';
          }
          marriageTimingCounselHtml = '<div data-cd-marker="ziwei-love-counsel-timing-v20260615-step2" style="margin-top:10px;background:rgba(15,23,42,0.42);border:1px solid rgba(251,113,133,0.24);border-radius:11px;padding:10px 11px;">'
            +'<div style="color:#fecdd3;font-weight:900;margin-bottom:8px;">관계 상담 카드</div>'
            +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr));gap:8px;">'
              +'<div style="background:rgba(88,28,135,0.22);border:1px solid rgba(216,180,254,0.24);border-radius:9px;padding:9px 10px;"><b style="color:#f5d0fe;">현재 준비</b><br><span style="color:#ddd6fe;font-size:0.78rem;">관계 정의, 생활 리듬, 돈과 주거 기준을 먼저 맞춥니다.</span></div>'
              +(marriageAlt ? '<div style="background:rgba(190,24,93,0.22);border:1px solid rgba(251,113,133,0.34);border-radius:9px;padding:9px 10px;"><b style="color:#fecdd3;">현실 추천 구간</b><br>'+marriageAlt.age+'세 · '+zwDisplayPalaceName(marriageAlt.palace)+'<br><span style="color:#ffe4e6;font-size:0.78rem;">근거: '+marriageAltReason+'</span></div>' : '')
              +'<div style="background:rgba(88,28,135,0.26);border:1px solid rgba(216,180,254,0.28);border-radius:9px;padding:9px 10px;"><b style="color:#f5d0fe;">명반상 결실 구간</b><br>'+marriageBest.age+'세 · '+zwDisplayPalaceName(marriageBest.palace)+'<br><span style="color:#ddd6fe;font-size:0.78rem;">근거: '+marriageBestReason+'</span></div>'
              +'<div style="background:rgba(15,23,42,0.48);border:1px solid rgba(251,191,36,0.24);border-radius:9px;padding:9px 10px;"><b style="color:#fde68a;">약속 방식</b><br>'+(marriageAlt ? '대안 구간에는 만남·동거·가족 소개·공동 계획을 열고, 강한 결실 구간에는 제도화를 깊게 검토하세요.' : '이 구간에는 관계 정의와 생활 조건을 구체적인 약속으로 정리하세요.')+'</div>'
            +'</div>'
          +'</div>';
        } else {
          marriageLuckText = '대한 데이터가 제한되어 결혼운 피크는 명확히 특정하기 어렵지만, 부부궁/명궁 활성 시기에 관계 진전이 유리합니다.';
          marriageTimingCounselHtml = '<div data-cd-marker="ziwei-love-counsel-timing-v20260615-step2" style="margin-top:10px;background:rgba(15,23,42,0.48);border:1px solid rgba(216,180,254,0.24);border-radius:10px;padding:10px 11px;"><b style="color:#f5d0fe;">관계 상담 카드</b><br>정확한 결실 구간보다 현재 관계의 준비도, 생활 리듬, 약속 가능성을 먼저 확인하세요.</div>';
        }

        var flirtVerdict = '';
        if (flirtRiskScore >= 66) {
          flirtVerdict = '바람기 자체라기보다 "관계 외 자극에 흔들릴 가능성"이 있는 편입니다. 경계선 수호(연락 빈도·이성 거리 규칙)를 명확히 두면 안정됩니다.';
        } else if (flirtRiskScore >= 42) {
          flirtVerdict = '중립 구간입니다. 평소엔 안정적이지만 스트레스·권태·거리 이슈가 누적되면 감정 이탈 가능성이 생길 수 있습니다.';
        } else {
          flirtVerdict = '낮은 편입니다. 관계가 시작되면 의리와 일관성이 강하고, 신뢰 기반을 스스로 지키려는 성향이 큽니다.';
        }

        var loveWeakness = '';
        if (freedomNeed >= 70 && commitment < 60) {
          loveWeakness = '가까워질수록 답답함을 느껴 갑자기 거리를 둘 수 있습니다. "혼자 회복 시간"을 미리 합의하면 반복 갈등을 줄일 수 있습니다.';
        } else if (spouseBad.length >= 2 || hasHwagi) {
          loveWeakness = '서운함이 쌓이면 직접 말하기보다 참다가 한 번에 터질 수 있습니다. 감정 로그를 짧게 공유하는 습관이 효과적입니다.';
        } else {
          loveWeakness = '문제가 작을 때는 넘기다가 타이밍을 놓치는 경향이 있습니다. 주 1회 관계 체크인(좋았던 점/아쉬운 점)을 권장합니다.';
        }

        var loveNameRaw = (typeof USER_NAME === 'string' && USER_NAME.trim()) ? USER_NAME.trim() : '사용자';
        var loveNameSafe = (typeof iljuEscapeHtml === 'function')
          ? iljuEscapeHtml(loveNameRaw)
          : loveNameRaw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');

        var loveDestinyTitle = '비단길 위에 핀 장미';
        if (spouseMain.some(function(s){ return ['탐랑','태양','염정'].indexOf(s) >= 0; })) {
          loveDestinyTitle = '불꽃 무대 위의 왈츠';
        } else if (spouseMain.some(function(s){ return ['태음','천동','천량'].indexOf(s) >= 0; })) {
          loveDestinyTitle = '새벽 안개 속의 서약';
        } else if (spouseMain.some(function(s){ return ['무곡','자미','천부'].indexOf(s) >= 0; })) {
          loveDestinyTitle = '황금 규칙으로 지키는 심장';
        }

        var loveTypeName = '감정 천기가형';
        if (loveHeat >= 70 && commitment >= 65) loveTypeName = '블레이즈 가디언형';
        else if (freedomNeed >= 70 && loveHeat >= 60) loveTypeName = '자유 궤도 로맨서형';
        else if (commitment >= 70) loveTypeName = '롱런 설계자형';
        else if (loveHeat >= 65) loveTypeName = '심장 직진 플레이어형';

        var oneLineSummary = '';
        if (commitment >= loveHeat && commitment >= freedomNeed) {
          oneLineSummary = '당신의 연애는 설렘보다 신뢰가 먼저 자리를 잡고, 한 번 맺은 관계는 오래 지키는 운명입니다.';
        } else if (loveHeat >= commitment && loveHeat >= freedomNeed) {
          oneLineSummary = '당신의 연애는 심장이 먼저 달리고 현실이 뒤따르는 타입이라, 시작 장면부터 강렬한 파동을 만듭니다.';
        } else {
          oneLineSummary = '당신의 연애는 가까워질수록 자유와 친밀의 균형을 시험받으며, 그 균형을 맞출수록 관계의 급이 올라갑니다.';
        }

        var vibeText = '열정 <b style="color:#fb7185;">'+loveHeat+'</b> / 헌신 <b style="color:#f9a8d4;">'+commitment+'</b> / 자유 <b style="color:#c4b5fd;">'+freedomNeed+'</b>의 결로 움직입니다. '
          + (loveHeat >= 70 ? '감정의 점화 속도가 빠르고 ' : '감정의 점화는 신중하지만 ')
          + (commitment >= 65 ? '붙으면 오래 버티는 힘이 강합니다.' : '상황 적응력이 좋아 관계의 판을 유연하게 바꿉니다.');

        var magnetConflict = '"나에게 끌리는 사람"은 '+attractedToYou+' 반면 "내가 끌리는 사람"은 '+youAttractedTo+' 그래서 연애 초반엔 이상과 현실이 교차하지만, 기준을 말로 합의하는 순간 가장 강한 팀이 됩니다.';

        var redFlagScenario = '';
        var redFlagCounter = '';
        if (freedomNeed >= 70 && commitment < 60) {
          redFlagScenario = '주의 포인트는 <b>가까워진 뒤 갑자기 숨이 막히는 패턴</b>입니다. 설명 없는 거리두기가 반복되면 상대는 버려졌다고 해석하고, 작은 오해가 이별 트리거로 커질 수 있습니다.';
          redFlagCounter = '관계가 답답해지기 전에 "혼자 회복 시간"을 일정으로 먼저 선언하세요. 침묵 대신 예고가 관계를 살립니다.';
        } else if (spouseBad.length >= 2 || hasHwagi) {
          redFlagScenario = '주의 포인트는 <b>참다가 한 번에 터지는 감정 폭발</b>입니다. 서운함이 누적되면 대화가 협상 대신 판결이 되어, 서로의 자존심만 크게 다칩니다.';
          redFlagCounter = '상대의 서운함이 3층까지 쌓이기 전에 먼저 문을 두드리세요. 48시간 안에 감정을 짧게 공유하면 파국을 막을 수 있습니다.';
        } else if (flirtRiskScore >= 66) {
          redFlagScenario = '주의 포인트는 <b>관계 바깥 자극에 대한 순간 흔들림</b>입니다. 권태 구간에서 경계선이 흐려지면 신뢰 복구 비용이 크게 발생합니다.';
          redFlagCounter = '연락 빈도, 이성 거리, 술자리 규칙을 초반에 합의해 두세요. 룰이 사랑을 구속하는 게 아니라 사랑을 보호합니다.';
        } else {
          redFlagScenario = '주의 포인트는 <b>문제가 작을 때 넘기다 타이밍을 놓치는 패턴</b>입니다. 갈등이 작을 때 손대지 않으면 나중엔 같은 대화가 전쟁이 됩니다.';
          redFlagCounter = '주 1회 10분 체크인으로 "좋았던 점 1개 + 아쉬운 점 1개"만 공유하세요. 관계의 균열은 조기 보수가 정답입니다.';
        }

        var spouseProfile = '당신의 리듬을 맞춰줄 동반자는 <b>'
          + (commitment >= 65 ? '책임감이 있고 약속을 실제 행동으로 지키는 사람' : '감정 소통이 빠르고 분위기를 부드럽게 전환하는 사람')
          + '</b>입니다. '
          + (freedomNeed >= 65 ? '서로의 개인 시간을 존중할수록 애정의 밀도가 올라갑니다.' : '일상 루틴을 함께 설계할수록 안정감과 애착이 급상승합니다.');

        var futureGoldText = marriageLuckText+' '+marriageShift;
        var loveTimingShortText = marriageAlt
          ? '명반상 결실은 늦게 강해지므로, 먼저 '+marriageAlt.age+'세 흐름에서 만남·동거·가족 소개 같은 현실 준비를 여는 편이 좋습니다.'
          : (marriageBest ? marriageBest.age+'세 흐름에서 관계 정의와 생활 조건을 구체적인 약속으로 묶는 것이 좋습니다.' : '현재 관계의 준비도와 약속 가능성을 먼저 확인하는 흐름입니다.');
        var futureCounselText = '<div data-cd-marker="ziwei-love-counsel-summary-v20260615-step2" style="background:rgba(2,6,23,0.28);border:1px solid rgba(251,191,36,0.18);border-radius:9px;padding:9px 10px;margin-bottom:8px;">'+futureGoldText+'</div>' + marriageTimingCounselHtml;

        var secretKey = '연애 스타일은 '+loveStyle+'입니다. 이상적인 배우자상은 '+idealSpouse+' 감정 표현은 따뜻하게, 약속은 구체적으로 정리할수록 신뢰가 빠르게 자랍니다.';

        var weeklyMission = '';
        if (flirtRiskScore >= 66) {
          weeklyMission = '경계선 3종(연락·약속·사적 거리)을 문장으로 합의하고 서로 확인 도장을 찍으세요.';
        } else if (freedomNeed >= 70) {
          weeklyMission = '데이트 1회 + 혼자 회복 시간 2회를 미리 캘린더에 잡고 상대에게 먼저 공유하세요.';
        } else if (commitment >= 70) {
          weeklyMission = '"우리의 6개월 계획" 대화를 20분 진행하고, 돈/시간/휴식 규칙을 각 1개씩 정하세요.';
        } else {
          weeklyMission = '7일간 하루 한 줄 감정 로그를 공유하세요. 감정 이름을 붙이는 순간 갈등 강도가 내려갑니다.';
        }

        var healingTitle = '괜찮아, 당신의 속도는 이미 충분히 아름답습니다';
        if (loveHeat >= 70 && commitment >= 65) {
          healingTitle = '뜨거운 마음도 쉬어가야 오래 빛납니다';
        } else if (freedomNeed >= 70) {
          healingTitle = '거리두기는 회피가 아니라 회복의 기술입니다';
        } else if (commitment >= 70) {
          healingTitle = '당신의 성실함은 사랑을 지키는 가장 큰 재능입니다';
        }

        var healingAffirmation = '당신이 관계에서 예민하게 느끼는 감각은 약점이 아니라 사랑의 레이더입니다. 그 감각을 비난하지 말고 방향만 조정하면 됩니다.';
        var healingRoutine = '잠들기 전 3분, "오늘 고마웠던 장면 1개 + 내 감정 1개 + 내일 전할 한 문장"을 메모하세요. 관계의 온도가 천천히 안정됩니다.';
        var healingPartnerTip = '상대를 바꾸려 하기보다, 내 리듬을 먼저 설명하세요. 설명된 마음은 오해보다 신뢰를 빠르게 만듭니다.';

        if (spouseBad.length >= 2 || hasHwagi) {
          healingAffirmation = '감정이 한꺼번에 올라오는 날이 있어도 괜찮습니다. 당신은 망가진 게 아니라, 오래 참아온 마음이 신호를 보내는 중입니다.';
          healingRoutine = '감정 폭발 신호 3가지(말투·표정·몸 반응)를 적고, 신호가 오면 20분 멈춤 후 대화 재개 규칙을 적용하세요.';
        } else if (freedomNeed >= 70) {
          healingPartnerTip = '"지금은 멀어지는 게 아니라 충전 중"이라는 문장을 미리 공유하세요. 정직한 예고가 상대의 불안을 크게 낮춥니다.';
        }

        var loveDestinyMetrics = {
          passion: Math.max(35, Math.min(98, Math.round(loveHeat))),
          communication: Math.max(35, Math.min(98, Math.round(58 + auxUnique.length * 4 - (spouseBad.length * 2) + (personaSihuaCnt['화과'] > 0 ? 6 : 0)))),
          harmony: Math.max(35, Math.min(98, Math.round((commitment * 0.58) + ((100 - flirtRiskScore) * 0.42)))),
          trust: Math.max(35, Math.min(98, Math.round((100 - flirtRiskScore) * 0.72 + commitment * 0.28))),
          destiny: Math.max(35, Math.min(98, Math.round((loveHeat * 0.32) + (commitment * 0.38) + ((100 - flirtRiskScore) * 0.3)))),
          promise: Math.max(35, Math.min(98, Math.round(commitment)))
        };

        var loveDestinyPointList = [
          { key: 'passion', icon: '❤️‍🔥', name: '열정', hint: '심장을 점화하는 끌림' },
          { key: 'communication', icon: '🌙💬', name: '소통', hint: '말이 별빛처럼 통하는 결' },
          { key: 'harmony', icon: '⚖️', name: '조화', hint: '감정과 현실의 균형' },
          { key: 'trust', icon: '🔒⭐', name: '신뢰', hint: '관계를 지키는 안전핵' },
          { key: 'destiny', icon: '♾️', name: '인연', hint: '시간을 넘어 이어진 매듭' },
          { key: 'promise', icon: '👑', name: '약속', hint: '오래 가는 책임의 힘' }
        ];

        var loveDestinyMetricHtml = loveDestinyPointList.map(function(item){
          var val = loveDestinyMetrics[item.key] || 0;
          return '<div class="zw-love-metric-item"><span>'+item.icon+' <b>'+item.name+'</b></span><span style="color:#fde68a;font-weight:900;">'+val+'%</span></div>';
        }).join('');
        var loveTimingRibbon = '<div class="zw-timing-ribbon" aria-label="' + _sajuEngineText("se_20539_attr_aria_label") + '">'
          +'<span class="zw-timing-chip">인연 유입: '+(loveHeat >= 68 ? '강한 끌림이 먼저 열린다' : '천천히 신뢰를 쌓을 때 열린다')+'</span>'
          +'<span class="zw-timing-chip">정착 운: '+(commitment >= 68 ? '약속과 생활 설계에 강함' : '관계 규칙을 먼저 맞춰야 안정')+'</span>'
          +'<span class="zw-timing-chip">주의 운: '+(flirtRiskScore >= 66 ? '외부 자극·경계선 관리' : '작은 서운함의 조기 공유')+'</span>'
        +'</div>';
        var loveDeepOracle = '<div class="zw-oracle-grid" aria-label="' + _sajuEngineText("se_20544_attr_aria_label") + '">'
          +'<article class="zw-oracle-card zw-oracle-card--rose"><div class="zw-oracle-card__title">인연이 들어오는 문</div>'+magnetConflict+'</article>'
          +'<article class="zw-oracle-card"><div class="zw-oracle-card__title">장기 관계의 핵심</div>'+spouseProfile+'</article>'
          +'<article class="zw-oracle-card zw-oracle-card--gold"><div class="zw-oracle-card__title">공식화 방향</div>'+loveTimingShortText+'</article>'
          +'<article class="zw-oracle-card"><div class="zw-oracle-card__title">관계 회복법</div>'+healingPartnerTip+'</article>'
        +'</div>';

        var sec_love_compat_spread = '<div class="zw-love-compat-spread report-card report-section love-card star-effect">'
          + '<div class="zw-cosmic-stars"></div>'
          + '<div class="zw-love-compat-title love-title">💘 [부부궁 관계 흐름]</div>'
          + '<div class="zw-love-compat-sub">숫자 결론을 먼저 보고, 흐름 그림은 보조로 확인합니다.</div>'
          + '<div class="zw-love-metric-grid">'+loveDestinyMetricHtml+'</div>'
          + loveTimingRibbon
          + '<div class="zw-love-compat-canvas-wrap">'
            + '<canvas id="zwLoveDestinyStarCanvas" class="zw-love-compat-canvas" width="920" height="380"></canvas>'
          + '</div>'
        + '</div>';

        var sec_love = '<div class="zw-cosmic-card zw-love-card report-card report-section love-card star-effect">'
          +'<div class="zw-cosmic-stars"></div>'
          +'<div style="position:absolute;inset:-45% auto auto -12%;width:230px;height:230px;border-radius:50%;background:radial-gradient(circle,rgba(251,113,133,0.18),rgba(251,113,133,0));pointer-events:none;"></div>'
          +'<div style="position:absolute;inset:auto -18% -56% auto;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,rgba(244,114,182,0.15),rgba(244,114,182,0));pointer-events:none;"></div>'
          +'<div class="zw-cosmic-heading" style="border-bottom-color:rgba(251,113,133,0.36);">'
            +'<h2 class="section-title love-title" style="font-size:1.08rem;margin:0;font-weight:900;letter-spacing:0.01em;">💘 [부부궁이 보여주는 관계 성향]</h2>'
            +'<span class="zw-cosmic-chip" style="color:#fecdd3;border-color:rgba(251,113,133,0.55);background:rgba(127,29,29,0.3);">부부궁 근거</span>'
          +'</div>'
          +'<div class="card-content love-text" style="position:relative;z-index:1;background:linear-gradient(120deg,rgba(251,113,133,0.16),rgba(244,114,182,0.12));border:1px solid rgba(251,113,133,0.38);border-radius:11px;padding:12px 12px;margin-bottom:10px;">'
            +'<div style="font-size:1.03rem;font-weight:900;color:#ffe4e6;line-height:1.45;">💌 '+loveNameSafe+'의 관계 핵심 흐름: "'+loveDestinyTitle+'"</div>'
            +'<div style="margin-top:6px;color:#ffe4e6;font-size:0.87rem;line-height:1.72;"><b>요약:</b> '+oneLineSummary+'</div>'
          +'</div>'
          + loveDeepOracle
          +'<div style="position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:9px;font-size:0.89rem;line-height:1.76;color:#f3e8ff;">'
            +'<div style="background:rgba(53,25,62,0.48);border:1px solid rgba(244,114,182,0.3);border-radius:10px;padding:10px 11px;">'
              +'<div style="color:#fecdd3;font-weight:900;margin-bottom:6px;">1. 관계 방식</div>'
              +'<div style="margin-bottom:4px;"><b>관계 방식:</b> '+loveTypeName+'</div>'
              +'<div style="margin-bottom:4px;"><b>정서 반응:</b> '+vibeText+'</div>'
              +'<div style="font-size:0.79rem;color:#fbcfe8;">핵심 별: '+spouseLabel+' / 보조·흉성: '+spouseAuxLabel+' / '+spouseBadLabel+'</div>'
            +'</div>'
            +'<div style="background:rgba(53,25,62,0.48);border:1px solid rgba(244,114,182,0.3);border-radius:10px;padding:10px 11px;">'
              +'<div style="color:#fecdd3;font-weight:900;margin-bottom:6px;">2. 끌림과 반복 패턴</div>'
              +'<div style="margin-bottom:4px;"><b>끌림의 방식:</b> 관계가 시작될 때 '+charmPoint+'</div>'
              +'<div><b>반복되는 관계 패턴:</b> '+magnetConflict+'</div>'
            +'</div>'
            +'<div style="background:linear-gradient(120deg,rgba(127,29,29,0.32),rgba(127,29,29,0.18));border:1px solid rgba(251,113,133,0.42);border-radius:10px;padding:10px 11px;">'
              +'<div style="color:#fda4af;font-weight:900;margin-bottom:6px;">3. 조율 포인트</div>'
              +'<div style="margin-bottom:4px;"><b>주의 포인트:</b> '+redFlagScenario+'</div>'
              +'<div><b>방지 대책:</b> '+redFlagCounter+'</div>'
            +'</div>'
            +'<div style="background:rgba(53,25,62,0.48);border:1px solid rgba(244,114,182,0.3);border-radius:10px;padding:10px 11px;">'
              +'<div style="color:#fecdd3;font-weight:900;margin-bottom:6px;">4. 결혼·공식화 상담</div>'
              +'<div style="margin-bottom:4px;"><b>끌리는 상대 조건:</b> '+spouseProfile+'</div>'
              +'<div><b>상담 결론:</b> '+futureCounselText+'</div>'
            +'</div>'
            +'<div style="grid-column:1 / -1;background:linear-gradient(120deg,rgba(244,114,182,0.18),rgba(167,139,250,0.14));border:1px solid rgba(244,114,182,0.38);border-radius:10px;padding:10px 11px;">'
              +'<div style="color:#fce7f3;font-weight:900;margin-bottom:6px;">5. 관계를 안정시키는 실천 문장</div>'
              +'<div style="margin-bottom:4px;"><b>핵심 기준:</b> '+secretKey+'</div>'
              +'<div><b>관계 미션:</b> '+weeklyMission+'</div>'
            +'</div>'
            +'<div style="grid-column:1 / -1;background:linear-gradient(120deg,rgba(186,230,253,0.14),rgba(224,231,255,0.15));border:1px solid rgba(125,211,252,0.36);border-radius:10px;padding:11px 12px;">'
              +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">'
                +'<div style="color:#e0f2fe;font-weight:900;">6. 마음 회복 코칭</div>'
                +'<span style="font-size:0.68rem;color:#e0f2fe;border:1px solid rgba(125,211,252,0.55);background:rgba(3,105,161,0.25);padding:2px 7px;border-radius:999px;white-space:nowrap;">관계 회복</span>'
              +'</div>'
              +'<div style="margin-bottom:4px;color:#e2e8f0;"><b>'+healingTitle+'</b></div>'
              +'<div style="margin-bottom:4px;color:#e2e8f0;">'+healingAffirmation+'</div>'
              +'<div style="margin-bottom:4px;color:#e2e8f0;"><b>심리 코칭:</b> '+healingPartnerTip+'</div>'
              +'<div style="color:#e2e8f0;"><b>회복 루틴:</b> '+healingRoutine+'</div>'
            +'</div>'
          +'</div>'
        +'</div>';

        var compatCityOptions = '<option value="">도시 선택</option>';
        if (typeof BIRTH_PLACE_GROUPS !== 'undefined' && BIRTH_PLACE_GROUPS.length) {
          BIRTH_PLACE_GROUPS.forEach(function(group){
            (group.places || []).forEach(function(p){
              var selected = '';
              if (window._ziweiInputMeta && window._ziweiInputMeta.placeLabel && window._ziweiInputMeta.placeLabel === p.label) selected = ' selected';
              compatCityOptions += '<option value="'+p.tz+'" data-long="'+p.lon+'" data-lat="'+p.lat+'" data-tz="'+p.tzOff+'" data-base-tz="'+p.tzOff+'"'+selected+'>'+p.label+'</option>';
            });
          });
        }

        var sec_compat = '<div id="zwCompatibility" class="zw-compat-card fr-compat-form">'
          +'<div data-saju-static-offer="compat-ziwei-compatibility"></div>'
          +'<div class="zw-cosmic-heading">'
            +'<h2>자미두수 궁합 리포트</h2>'
            +'<span class="zw-cosmic-chip">' + (ZW_COMPAT_COST * 100).toLocaleString('ko-KR') + '원</span>'
          +'</div>'
          +'<div class="fr-compat-form-body">'
            +'<div style="margin-bottom:8px;">상대의 태어난 순간을 넣으면 두 명반을 나란히 놓고 읽습니다. 기본 명반 해석과는 별도로 계산되며, <b>궁합 보기</b>를 누른 뒤 ' + (ZW_COMPAT_COST * 100).toLocaleString('ko-KR') + '원 결제 안내가 나옵니다.</div>'
            +'<div class="zw-cosmic-input-grid">'
              +'<label class="zw-cosmic-field"><span>상대 생년월일</span><input id="zwCompatBirthDate" type="text" inputmode="numeric" maxlength="8" pattern="[0-9]{8}" placeholder="YYYYMMDD" data-cd-birthdate-digits class="zw-cosmic-control"></label>'
              +'<label class="zw-cosmic-field"><span>상대 태어난 시간</span><input id="zwCompatBirthTime" type="time" value="12:00" class="zw-cosmic-control"></label>'
              +'<label class="zw-cosmic-field"><span>상대 성별</span><select id="zwCompatGender" class="zw-cosmic-control"><option value="F">여성</option><option value="M">남성</option><option value="OTHER">기타</option></select></label>'
              +'<label class="zw-cosmic-field"><span>상대 태어난 도시</span><select id="zwCompatBirthCity" class="zw-cosmic-control">'+compatCityOptions+'</select></label>'
              +'<button type="button" onclick="window._runZwCompatibility()" class="zw-cosmic-btn">궁합 보기</button>'
            +'</div>'
            +'<div id="zwCompatTimeCorrectionInfo" class="fr-report-note">도시 선택 시 진태양시 보정(경도·DST)을 자동 반영합니다.</div>'
          +'</div>'
          +'<div id="zwCompatResult" class="fr-compat-output" aria-live="polite">'
            +'아직 상대 정보가 입력되지 않았습니다. 입력 후 <b>궁합 보기</b> 버튼을 눌러 주세요.<br>'
            +'<span>카테고리: 연애 · 결혼 · 친구 · 직장 · 사업 관계 확장</span>'
          +'</div>'
        +'</div>';

        var sec3 = '<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;">' +
          '<h2 style="color: #D8B4FE; font-size: 1.2rem; margin-top: 0;">이 궁과 이어지는 시기의 흐름</h2>' +
          '<div style="line-height: 1.7; margin: 0; font-size: 0.92rem; color:#e2e8f0;">' +
            '<div style="margin-bottom:8px;"><b>해당 궁의 대운 나이:</b> ' + curDaHan + '세 (' + pName + ' 운기)</div>' +
            '<div style="margin-bottom:8px;">' + coreLaw + '</div>' +
            '<div style="margin-bottom:10px;">' + sihuaText + '</div>' +
            '<div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.35);padding:9px 10px;border-radius:8px;margin-bottom:8px;">✅ <b>좋은 점:</b> ' + goodPoint + '</div>' +
            '<div style="background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.35);padding:9px 10px;border-radius:8px;margin-bottom:8px;">⚠️ <b>주의할 점:</b> ' + cautionPoint + '</div>' +
            '<div style="background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.35);padding:9px 10px;border-radius:8px;">🧭 <b>운세 조언:</b> ' + actionTip + '</div>' +
          '</div>' +
        '</div>';

        // ── 생애 총론 ──
        var STAR_DAHAN_KW = {
          '자미':'북극성처럼 중심을 잡는 자미(紫微)의 기상, 명예를 향해 나아가는 구조',
          '천기':'쉼 없이 도는 천기(天機)의 톱니, 두뇌와 기획으로 진화하는 구조',
          '태양':'한낮의 해 같은 태양(太陽)의 빛, 대중과 함께 성장하는 구조',
          '무곡':'숫자 위에 선 무곡(武曲)의 결단, 실행력으로 재물을 구축하는 구조',
          '천동':'봄볕 같은 천동(天同)의 여유, 안정 속에 행복을 쌓는 구조',
          '염정':'불꽃 같은 염정(廉貞)의 감각, 화려한 무대를 주도하는 구조',
          '천부':'곳간을 지키는 천부(天府)의 안정, 자산을 지키며 성장하는 구조',
          '태음':'달빛 같은 태음(太陰)의 심미안, 소리 없이 부를 쌓는 구조',
          '탐랑':'사람을 끌어당기는 탐랑(貪狼)의 매력, 기회를 창출하는 구조',
          '거문':'이면을 꿰뚫는 거문(巨門)의 통찰, 지식 자본을 쌓는 구조',
          '천상':'다리를 놓는 천상(天相)의 조화, 공정으로 조직을 이끄는 구조',
          '천량':'큰 나무 같은 천량(天梁)의 포용, 어려움을 풀어 귀인 복덕을 쌓는 구조',
          '칠살':'승부처를 가르는 칠살(七殺)의 검, 독립과 돌파로 경계를 부수는 구조',
          '파군':'낡은 판을 허무는 파군(破軍)의 파도, 전혀 새로운 판을 여는 구조'
        };
        var mengStars = extractMains(getPStars('명궁'));
        var mengStarMain = mengStars[0] || '';
        var dirText = (pd.direction === 1) ? '순행(順行)' : '역행(逆行)';
        var juVal = pd.ju || 4;
        var lifeSentence = STAR_DAHAN_KW[mengStarMain] || '고유의 운명 패턴이 온화하게 전개되는 구조';
        var sihuaColors = {'화록':'#4ade80','화권':'#60a5fa','화과':'#c084fc','화기':'#f87171'};
        var sihuaSummary = [];
        if (pd.sihuaData) {
          for (var shStar in pd.sihuaData) {
            var shInfo = pd.sihuaData[shStar];
            var sc = sihuaColors[shInfo.type] || '#fff';
            sihuaSummary.push('<span style="color:'+sc+';font-weight:700;">'+shInfo.type+'</span> '+shStar+' ('+shInfo.palaceName+')');
          }
        }
        var sihuaTypeCnt = { '화록':0, '화권':0, '화과':0, '화기':0 };
        if (pd.sihuaData) {
          for (var shStar2 in pd.sihuaData) {
            var t = pd.sihuaData[shStar2] && pd.sihuaData[shStar2].type;
            if (sihuaTypeCnt.hasOwnProperty(t)) sihuaTypeCnt[t] += 1;
          }
        }
        var dominantSihuaType = '중립';
        var sihuaMax = 0;
        for (var siT in sihuaTypeCnt) {
          if (sihuaTypeCnt[siT] > sihuaMax) {
            sihuaMax = sihuaTypeCnt[siT];
            dominantSihuaType = siT;
          }
        }
        var destinyAxis = dominantSihuaType === '화록'
          ? '확장·회수 축(기회 포착형)'
          : (dominantSihuaType === '화권'
            ? '권한·주도 축(결정 실행형)'
            : (dominantSihuaType === '화과'
              ? '평판·정제 축(품질 수호형)'
              : (dominantSihuaType === '화기'
                ? '화기(化忌) 수렴 축(보수 운행형)'
                : '균형·적응 축(상황 대응형)')));
        var destinyOps = dominantSihuaType === '화기'
          ? '핵심 의사결정은 지연 승인, 계약·자금은 다중 검증, 인간관계는 기록 중심으로 운행할수록 손실 방어력이 높아집니다.'
          : (dominantSihuaType === '화록' || dominantSihuaType === '화권' || dominantSihuaType === '화과'
            ? '강점 축 하나를 명확히 선정해 90일 단위 실행 계획으로 누적하면, 운세 파동이 실질 성과로 전환되는 속도가 빨라집니다.'
            : '변동성은 크지 않으므로 루틴·기본기·반복의 질을 높이는 운행이 장기 복리 효과를 만듭니다.');
        var ZW_FLOW_MARKER = 'ziwei-year-monthly-decade-v20260605';
        var ZW_FLOW_SIHUA_BY_GAN = {
          '甲': { '염정': '화록', '파군': '화권', '무곡': '화과', '태양': '화기' },
          '乙': { '천기': '화록', '천량': '화권', '자미': '화과', '태음': '화기' },
          '丙': { '천동': '화록', '천기': '화권', '문창': '화과', '염정': '화기' },
          '丁': { '태음': '화록', '천동': '화권', '천기': '화과', '거문': '화기' },
          '戊': { '탐랑': '화록', '태음': '화권', '우필': '화과', '천기': '화기' },
          '己': { '무곡': '화록', '탐랑': '화권', '천량': '화과', '문곡': '화기' },
          '庚': { '태양': '화록', '무곡': '화권', '태음': '화과', '천동': '화기' },
          '辛': { '거문': '화록', '태양': '화권', '문곡': '화과', '문창': '화기' },
          '壬': { '천량': '화록', '자미': '화권', '좌보': '화과', '무곡': '화기' },
          '癸': { '파군': '화록', '거문': '화권', '태음': '화과', '탐랑': '화기' }
        };
        var ZW_FLOW_PALACE_THEME = {
          '명궁': { focus:'자기 선언과 방향 재정립', money:'성과보다 존재감을 먼저 세우는 달입니다.', relation:'관계에서는 주도권보다 진정성을 앞세우세요.' },
          '형제궁': { focus:'협력자와 동료 운의 재배치', money:'함께 쓰는 자원과 공동 프로젝트를 점검하세요.', relation:'가까운 사람의 말에서 길흉의 실마리가 옵니다.' },
          '부부궁': { focus:'파트너십과 계약 관계의 조율', money:'계약 조건과 역할 분담이 금전 흐름을 좌우합니다.', relation:'관계의 약속을 다시 선명하게 만드는 달입니다.' },
          '자녀궁': { focus:'창작, 표현, 결과물의 탄생', money:'작은 아이디어를 상품화하거나 공개하기 좋습니다.', relation:'즐거움과 애정 표현이 관계를 부드럽게 풉니다.' },
          '재백궁': { focus:'수입, 지출, 자산 운용', money:'돈의 들어옴과 나감을 숫자로 고정해야 복이 남습니다.', relation:'금전 감정이 관계 감정으로 번지지 않게 선을 세우세요.' },
          '질액궁': { focus:'건강, 회복, 내면의 정돈', money:'무리한 확장보다 손실 방어와 유지비 절감이 유리합니다.', relation:'예민한 반응을 쉬어 가며 말하면 갈등이 줄어듭니다.' },
          '천이궁': { focus:'이동, 이직, 외부 기회', money:'밖에서 들어오는 제안과 새 채널을 선별하세요.', relation:'낯선 사람과의 접점에서 새 기류가 열립니다.' },
          '노복궁': { focus:'조직, 고객, 인맥의 신뢰', money:'사람을 통해 일이 붙으니 평판 관리가 곧 재물 관리입니다.', relation:'내 편과 거리 둘 사람을 차분히 구분하세요.' },
          '관록궁': { focus:'커리어, 직책, 사회적 성취', money:'일의 성과가 수입의 문을 두드립니다.', relation:'공적인 태도가 사적인 신뢰까지 끌어올립니다.' },
          '전택궁': { focus:'집, 기반, 고정 자산', money:'부동산, 저축, 장기 자산의 구조를 정돈하세요.', relation:'가족과 생활권의 안정이 마음의 운을 보강합니다.' },
          '복덕궁': { focus:'마음의 복, 휴식, 장기 만족', money:'욕심을 줄이면 오래 남는 선택이 보입니다.', relation:'부드러운 말과 휴식이 관계의 복을 되살립니다.' },
          '부모궁': { focus:'윗사람, 문서, 승인 운', money:'문서와 승인 절차를 바르게 밟으면 기회가 커집니다.', relation:'조언을 받아들이되 최종 결정권은 직접 쥐세요.' }
        };
        var ZW_FLOW_OLYMPUS_BY_STAR = {
          '자미': { god:'제우스', seal:'왕관과 번개', tone:'권위와 결단이 하늘의 중심축을 세웁니다.', oracle:'명분을 먼저 세우면 사람과 자원이 뒤따릅니다.' },
          '천부': { god:'헤라', seal:'공작의 왕관', tone:'질서와 품격이 기반을 지키는 힘으로 작동합니다.', oracle:'관계와 자산은 격을 갖출 때 오래 남습니다.' },
          '태양': { god:'아폴론', seal:'황금 리라', tone:'명예와 공개성이 강하게 빛납니다.', oracle:'숨지 말고 밝은 무대에서 이름을 드러내세요.' },
          '태음': { god:'아르테미스', seal:'달빛 활', tone:'감각, 보호, 축적의 힘이 은밀하게 자랍니다.', oracle:'서두르지 않는 축적이 가장 큰 무기가 됩니다.' },
          '무곡': { god:'헤파이스토스', seal:'대장간의 망치', tone:'현실 감각과 재물 운용력이 단단합니다.', oracle:'숫자, 계약, 자산 구조를 직접 쥐어야 복이 남습니다.' },
          '천기': { god:'헤르메스', seal:'날개 지팡이', tone:'정보, 이동, 전략의 별이 빠르게 길을 바꿉니다.', oracle:'한 가지 길만 고집하지 말고 신호가 오는 통로를 넓히세요.' },
          '천동': { god:'헤스티아', seal:'성화의 화로', tone:'안식, 회복, 생활의 복이 조용히 불을 지킵니다.', oracle:'일상의 온기를 회복할 때 큰 운도 오래 머뭅니다.' },
          '염정': { god:'아프로디테와 아레스', seal:'장미 위의 붉은 검', tone:'매혹과 정치적 승부수가 동시에 시험대를 만듭니다.', oracle:'끌림은 힘이지만 명분 없는 욕망은 스스로를 소모합니다.' },
          '천량': { god:'아테나', seal:'올빼미 방패', tone:'보호, 원칙, 조언자의 별이 중심을 잡습니다.', oracle:'원칙을 지킬수록 늦게 오는 복이 크게 돌아옵니다.' },
          '칠살': { god:'아레스', seal:'전장의 투구', tone:'돌파와 결단의 검이 흐름을 가릅니다.', oracle:'두려움보다 기준을 앞세우면 전장이 길이 됩니다.' },
          '파군': { god:'포세이돈', seal:'삼지창', tone:'해체와 재건의 파도가 오래된 판을 흔듭니다.', oracle:'무너지는 것에 매달리지 말고 새 판을 설계하세요.' },
          '탐랑': { god:'아프로디테', seal:'장미와 잔', tone:'매혹, 욕망, 예술적 확장이 사람을 끌어옵니다.', oracle:'매력은 자산이지만 경계가 없으면 복이 흩어집니다.' },
          '거문': { god:'헤르메스의 검은 서판', seal:'가면과 비밀 문서', tone:'말, 의심, 숨은 진실이 운의 문을 엽니다.', oracle:'가면 뒤의 진심을 읽으면 어둠 속 정보가 힘이 됩니다.' },
          '천상': { god:'아테나', seal:'올리브 가지', tone:'중재와 균형의 지혜가 관계를 안정시킵니다.', oracle:'중심을 지키는 사람이 결국 판을 지배합니다.' }
        };
        var ZW_FLOW_OLYMPUS_BY_PALACE = {
          '명궁':'제우스', '형제궁':'헤르메스', '부부궁':'헤라', '자녀궁':'아폴론',
          '재백궁':'헤파이스토스', '질액궁':'아스클레피오스', '천이궁':'포세이돈', '노복궁':'아테나',
          '관록궁':'제우스', '전택궁':'데메테르', '복덕궁':'아르테미스', '부모궁':'헤라'
        };
        var ZW_FLOW_OLYMPUS_GOD_META = {
          '제우스': { icon:'⚡', realm:'천궁', virtue:'명분·권위·중심축' },
          '헤라': { icon:'🦚', realm:'왕좌', virtue:'품격·계약·기반 수호' },
          '아폴론': { icon:'☀️', realm:'태양 상징', virtue:'명예·예술·공개성' },
          '아르테미스': { icon:'🌙', realm:'달의 숲', virtue:'감각·보호·축적' },
          '헤파이스토스': { icon:'🔨', realm:'대장간', virtue:'기술·재물·실행력' },
          '헤르메스': { icon:'🪽', realm:'전령의 길', virtue:'정보·이동·전략' },
          '헤스티아': { icon:'🔥', realm:'성화의 방', virtue:'안식·생활복·회복' },
          '아프로디테': { icon:'🌹', realm:'장미 정원', virtue:'매력·예술·관계 확장' },
          '아프로디테와 아레스': { icon:'🌹', realm:'붉은 장미 전장', virtue:'욕망·협상·승부' },
          '아레스': { icon:'🛡️', realm:'전장', virtue:'돌파·결단·위기 대응' },
          '아테나': { icon:'🦉', realm:'지혜의 성채', virtue:'원칙·중재·보호' },
          '포세이돈': { icon:'🔱', realm:'심해', virtue:'해체·이동·재건' },
          '데메테르': { icon:'🌾', realm:'풍요의 밭', virtue:'축적·양육·생활 기반' },
          '아스클레피오스': { icon:'⚕️', realm:'회복 상징', virtue:'회복·점검·컨디션 신호' },
          '헤르메스의 검은 서판': { icon:'📜', realm:'비밀 서고', virtue:'말·의심·숨은 진실' }
        };
        var ZW_FLOW_DOMAIN_META = {
          money:{ label:_sajuEngineText("se_20191_prop_label"), good:'수익 회수와 자산 고정화가 열립니다.', care:'지출, 보증, 과욕성 투자를 조심하세요.' },
          career:{ label:_sajuEngineText("se_20192_prop_label"), good:'역할 확대와 공개 성과에 유리합니다.', care:'권한 충돌과 일정 과부하를 조율하세요.' },
          love:{ label:_sajuEngineText("se_20193_prop_label"), good:'마음을 드러내면 관계의 온도가 살아납니다.', care:'오해를 방치하면 감정 빚이 커집니다.' },
          health:{ label:_sajuEngineText("se_20194_prop_label"), good:'회복 루틴을 만들면 기력이 안정됩니다.', care:'수면, 긴장, 피로 신호를 부드럽게 살피세요.' },
          move:{ label:_sajuEngineText("se_20195_prop_label"), good:'이직, 이사, 외부 제안의 문이 열립니다.', care:'서류와 동선의 착오를 두 번 확인하세요.' }
        };
        function zwFlowEsc(value) {
          return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
            return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch] || ch;
          });
        }
        function zwFlowGanji(year) {
          try {
            if (typeof KasiEngine !== 'undefined' && KasiEngine && typeof KasiEngine.getGanjiFromParts === 'function') {
              // 🔴 월은 1-based 다 — 옛 `new Date(y, 1, 4, ...)` 의 월 인덱스 1 은 **2월**이다.
              // 🔴 프로브는 그 해 **세차 구간 한가운데**여야 한다. 세차는 입춘이 가르는데 입춘은
              //    2월 3~5일 사이를 오가므로 2/4 정오는 그 경계 위에 얹혀 있었다 — 1960~2030 중
              //    40해에서 입춘이 2/4 정오보다 늦어, 그 해 유년 세차가 통째로 **한 해 뒤로** 밀렸다
              //    (실측 2026-08-28 `npm run measure:ganji-null-transition` 축 D). 6/15 정오는 대운
              //    세운·연운이 이미 쓰는 축이고 같은 측정에서 어긋난 해가 0 이다.
              //    verify:shell-korean-calendar 검사 ⑯ 이 고정 프로브 전건을 전 해에 대해 못박는다.
              var gj = KasiEngine.getGanjiFromParts(_kasiPartsOf(Number(year), 6, 15, 12, 0, 0));
              if (gj && gj.secha) return String(gj.secha || '').slice(0, 2);
            }
          } catch (_flowGanjiErr) {}
          var gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
          var zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
          var offset = Number(year) - 1984;
          return gan[((offset % 10) + 10) % 10] + zhi[((offset % 12) + 12) % 12];
        }
        function zwFlowPalaceName(idx) {
          return String((pd.palacesByIndex && pd.palacesByIndex[idx]) || ('제' + (idx + 1) + '궁')).trim();
        }
        function zwFlowYearSihua(idx, yearGan) {
          var map = ZW_FLOW_SIHUA_BY_GAN[yearGan] || {};
          var stars = (pd.stars && pd.stars[idx]) || {main:[],aux:[],bad:[]};
          var names = uniqueList(extractMains(stars).concat(extractAux(stars)));
          return names.map(function(name) {
            return map[name] ? { star:name, type:map[name] } : null;
          }).filter(Boolean);
        }
        function zwFlowPalaceSignal(idx, yearGan) {
          var stars = (pd.stars && pd.stars[idx]) || {main:[],aux:[],bad:[]};
          var main = uniqueList(extractMains(stars));
          var aux = uniqueList(extractAux(stars));
          var bad = uniqueList(extractBad(stars));
          var sihua = zwFlowYearSihua(idx, yearGan);
          var counts = { '화록':0, '화권':0, '화과':0, '화기':0 };
          sihua.forEach(function(s) { if (counts.hasOwnProperty(s.type)) counts[s.type] += 1; });
          var score = 50 + main.length * 7 + aux.length * 3 + counts['화록'] * 13 + counts['화권'] * 8 + counts['화과'] * 7 - counts['화기'] * 15 - bad.length * 6;
          score = Math.max(12, Math.min(98, Math.round(score)));
          var grade = score >= 78 ? '개문(開門)' : (score >= 62 ? '정진(精進)' : (score >= 46 ? '정돈(整頓)' : '수성(守成)'));
          var palaceName = zwFlowPalaceName(idx);
          var theme = ZW_FLOW_PALACE_THEME[palaceName] || { focus:'운의 흐름 조율', money:'기본 구조를 점검하면 손실을 줄일 수 있습니다.', relation:'말과 약속을 가볍게 다루지 마세요.' };
          return { idx:idx, palaceName:palaceName, main:main, aux:aux, bad:bad, sihua:sihua, counts:counts, score:score, grade:grade, theme:theme };
        }
        function zwFlowSihuaTags(sihua) {
          if (!sihua.length) return '<span style="color:#94a3b8;">사화 직접 작용은 약합니다.</span>';
          return sihua.map(function(s) {
            var col = sihuaColors[s.type] || '#e5e7eb';
            return '<span style="display:inline-flex;margin:2px 4px 2px 0;padding:2px 6px;border-radius:999px;border:1px solid '+col+'66;color:'+col+';background:'+col+'18;font-size:0.68rem;font-weight:800;">'+zwFlowEsc(s.star)+' '+zwFlowEsc(s.type)+'</span>';
          }).join('');
        }
        function zwFlowOlympusMeta(god) {
          return ZW_FLOW_OLYMPUS_GOD_META[god] || { icon:'✦', realm:'별의 회랑', virtue:'상징·선택·운의 방향' };
        }
        function zwFlowSihuaSeal(signal) {
          var counts = (signal && signal.counts) || {};
          var sihua = (signal && signal.sihua) || [];
          var topType = '';
          ['화기','화록','화권','화과'].forEach(function(type) {
            if (!topType && (counts[type] || 0) > 0) topType = type;
          });
          var starText = sihua.length ? sihua.map(function(s){ return s.star + ' ' + s.type; }).join(' · ') : '사화 직접 작용 약함';
          if (topType === '화록') return { name:'화록 축복 인장', god:'데메테르', icon:'🌾', seal:'황금 이삭과 풍요의 잔', tone:'재물, 인연, 기회가 열리는 사화입니다.', oracle:'받는 복을 흩뜨리지 말고 구조 안에 담아야 오래 남습니다.', basis:starText };
          if (topType === '화권') return { name:'화권 명령 인장', god:'제우스', icon:'⚡', seal:'번개 지휘봉', tone:'권한, 책임, 결단이 강하게 요구됩니다.', oracle:'명령할 자격보다 책임질 태도를 먼저 세우세요.', basis:starText };
          if (topType === '화과') return { name:'화과 월계 인장', god:'아폴론', icon:'☀️', seal:'월계관과 황금 리라', tone:'명예, 문서, 보호, 평판이 살아나는 사화입니다.', oracle:'보이는 품격을 정돈하면 보이지 않는 귀인이 움직입니다.', basis:starText };
          if (topType === '화기') return { name:'화기 봉인 인장', god:'헤르메스의 검은 서판', icon:'📜', seal:'검은 월식과 비밀 문서', tone:'오해, 지연, 집착, 말의 그림자를 다루는 시험입니다.', oracle:'숨기거나 밀어붙이지 말고 기록, 확인, 거리두기로 봉인을 풀어야 합니다.', basis:starText };
          return { name:'중립 별빛 인장', god:'헤르메스', icon:'🪽', seal:'은빛 나침반', tone:'사화가 강하게 치우치지 않아 선택의 여지가 넓습니다.', oracle:'작은 신호를 관찰하며 운의 방향을 천천히 조율하세요.', basis:starText };
        }
        function zwFlowShadowSeal(signal) {
          var bad = (signal && signal.bad) || [];
          var counts = (signal && signal.counts) || {};
          var badText = bad.length ? bad.slice(0, 4).join(' · ') : '큰 흉성 압박은 약함';
          if ((counts['화기'] || 0) > 0 && bad.length >= 2) {
            return { name:'심연 봉인', icon:'🌑', seal:'검은 방패와 닫힌 문', tone:'화기와 흉성이 겹쳐 말, 돈, 관계의 오판을 키울 수 있습니다.', oracle:'중요 결정은 기록과 제3자 검토를 거친 뒤 움직이세요.', basis:badText };
          }
          if ((counts['화기'] || 0) > 0) {
            return { name:'월식 봉인', icon:'🌘', seal:'그림자 달과 서약문', tone:'화기의 그림자가 의심, 지연, 감정 빚으로 나타날 수 있습니다.', oracle:'감정 판단을 늦추고 사실 확인을 먼저 하세요.', basis:badText };
          }
          if (bad.length >= 2) {
            return { name:'전장 경계 인장', icon:'🛡️', seal:'붉은 방패와 경계선', tone:'흉성이 강하면 속도보다 방어선이 운을 지킵니다.', oracle:'손실 한도, 관계 경계, 일정 여백을 먼저 정하세요.', basis:badText };
          }
          return { name:'청명 수호 인장', icon:'✨', seal:'맑은 별과 보호 원', tone:'큰 그림자 압박은 약하나 기준을 느슨하게 만들면 복이 새어 나갑니다.', oracle:'잘될수록 원칙을 유지하면 별빛이 오래 갑니다.', basis:badText };
        }
        function zwFlowSealCard(title, seal, accent, basisLabel) {
          return '<article style="background:linear-gradient(145deg,rgba(15,23,42,0.68),rgba(30,27,75,0.5));border:1px solid '+accent+'66;border-radius:12px;padding:12px;min-width:0;">'
            +'<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:7px;">'
              +'<div><div style="color:'+accent+';font-size:0.72rem;font-weight:900;letter-spacing:0.02em;">'+zwFlowEsc(title)+'</div><div style="color:#fef3c7;font-size:0.98rem;font-weight:900;margin-top:3px;">'+zwFlowEsc(seal.name || seal.god)+'</div></div>'
              +'<div style="font-size:1.55rem;line-height:1;">'+zwFlowEsc(seal.icon || '✦')+'</div>'
            +'</div>'
            +'<div style="color:#c4b5fd;font-size:0.78rem;line-height:1.55;"><b>'+zwFlowEsc(seal.god || '별의 상징')+'</b> · '+zwFlowEsc(seal.seal || '별의 인장')+'</div>'
            +'<div style="color:#dbeafe;font-size:0.76rem;line-height:1.65;margin-top:7px;">'+zwFlowEsc(seal.tone || '')+'</div>'
            +'<div style="color:#e2e8f0;font-size:0.76rem;line-height:1.65;margin-top:6px;">'+zwFlowEsc(seal.oracle || '')+'</div>'
            +'<div style="color:#94a3b8;font-size:0.68rem;line-height:1.5;margin-top:7px;border-top:1px solid rgba(148,163,184,0.16);padding-top:6px;"><b style="color:#cbd5e1;">'+zwFlowEsc(basisLabel || '근거')+':</b> '+zwFlowEsc(seal.basis || '명반 신호 종합')+'</div>'
          +'</article>';
        }
        function zwFlowSealKey(seal) {
          if (!seal) return '';
          return [seal.name || seal.god || '', seal.seal || '', seal.oracle || ''].join('|').replace(/\s+/g, ' ').trim();
        }
        function zwFlowSealSummaryChip(title, seal, accent, basisLabel) {
          return '<div style="border:1px solid '+accent+'55;background:'+accent+'12;border-radius:9px;padding:8px 9px;min-width:0;">'
            +'<div style="color:'+accent+';font-size:0.68rem;font-weight:900;margin-bottom:3px;">'+zwFlowEsc(title)+'</div>'
            +'<div style="color:#fef3c7;font-size:0.78rem;font-weight:900;line-height:1.45;">'+zwFlowEsc(seal.name || seal.god || '별의 인장')+'</div>'
            +'<div style="color:#cbd5e1;font-size:0.69rem;line-height:1.45;margin-top:3px;">'+zwFlowEsc(basisLabel || '근거')+' · '+zwFlowEsc(seal.basis || '명반 신호 종합')+'</div>'
          +'</div>';
        }
        function zwFlowOlympus(signal) {
          var primary = signal && signal.main && signal.main[0] ? signal.main[0] : '';
          var byStar = primary && ZW_FLOW_OLYMPUS_BY_STAR[primary] ? ZW_FLOW_OLYMPUS_BY_STAR[primary] : null;
          var byPalaceGod = signal && ZW_FLOW_OLYMPUS_BY_PALACE[signal.palaceName] ? ZW_FLOW_OLYMPUS_BY_PALACE[signal.palaceName] : '헤르메스';
          var base = byStar || { god:byPalaceGod, seal:'별의 인장', tone:'궁위의 상징이 신화의 언어로 드러납니다.', oracle:'지금 강하게 울리는 궁위를 현실의 선택으로 옮기세요.' };
          var meta = zwFlowOlympusMeta(base.god);
          var sihuaSeal = zwFlowSihuaSeal(signal);
          var shadowSeal = zwFlowShadowSeal(signal);
          return {
            god:base.god,
            seal:base.seal,
            tone:base.tone,
            oracle:base.oracle,
            icon:meta.icon,
            realm:meta.realm,
            virtue:meta.virtue,
            primaryStar:primary || '공궁',
            palaceGod:byPalaceGod,
            sihuaSeal:sihuaSeal,
            shadowSeal:shadowSeal,
            basis:(signal ? signal.palaceName : '궁위') + ' · 주성 ' + (primary || '공궁') + ' · ' + sihuaSeal.basis
          };
        }
        function zwFlowDomainScore(signal, domain) {
          var score = signal ? Number(signal.score || 50) : 50;
          var counts = (signal && signal.counts) || {};
          var badLen = signal && signal.bad ? signal.bad.length : 0;
          if (domain === 'money' && signal && /재백궁|전택궁|관록궁/.test(signal.palaceName)) score += 10;
          if (domain === 'career' && signal && /관록궁|천이궁|명궁/.test(signal.palaceName)) score += 10;
          if (domain === 'love' && signal && /부부궁|자녀궁|복덕궁/.test(signal.palaceName)) score += 10;
          if (domain === 'health' && signal && /질액궁|복덕궁|명궁/.test(signal.palaceName)) score += 8;
          if (domain === 'move' && signal && /천이궁|노복궁|관록궁/.test(signal.palaceName)) score += 9;
          score += (counts['화록'] || 0) * 7 + (counts['화권'] || 0) * 5 + (counts['화과'] || 0) * 4 - (counts['화기'] || 0) * 9 - badLen * 3;
          return Math.max(10, Math.min(99, Math.round(score)));
        }
        function zwFlowDomainHtml(signal) {
          return Object.keys(ZW_FLOW_DOMAIN_META).map(function(key) {
            var meta = ZW_FLOW_DOMAIN_META[key];
            var score = zwFlowDomainScore(signal, key);
            var tone = score >= 75 ? meta.good : (score <= 45 ? meta.care : '작게 열리는 흐름을 꾸준히 관리하세요.');
            var color = score >= 75 ? '#86efac' : (score <= 45 ? '#fca5a5' : '#fcd34d');
            return '<div style="background:rgba(2,6,23,0.36);border:1px solid rgba(148,163,184,0.18);border-radius:8px;padding:7px;">'
              +'<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;"><b style="color:#dbeafe;">'+meta.label+'</b><span style="color:'+color+';font-weight:900;">'+score+'</span></div>'
              +'<div style="font-size:0.7rem;color:#cbd5e1;line-height:1.5;margin-top:3px;">'+zwFlowEsc(tone)+'</div>'
            +'</div>';
          }).join('');
        }
        function zwFlowDeepReading(signal, olympus, label) {
          var mainStar = signal && signal.main && signal.main[0] ? signal.main[0] : '공궁';
          var badText = signal && signal.bad && signal.bad.length ? signal.bad.slice(0, 3).join(' · ') : '큰 흉성 압박은 약함';
          var sihuaText = signal && signal.sihua && signal.sihua.length
            ? signal.sihua.map(function(s){ return s.star + ' ' + s.type; }).join(' · ')
            : '사화 직접 작용 약함';
          return '<details style="margin-top:9px;border-top:1px solid rgba(148,163,184,0.18);padding-top:8px;">'
            +'<summary style="cursor:pointer;color:#fde68a;font-weight:900;font-size:0.78rem;">'+zwFlowEsc(label)+' 세부 운기 펼치기</summary>'
            +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:7px;margin-top:8px;">'+zwFlowDomainHtml(signal)+'</div>'
            +'<div style="font-size:0.76rem;color:#dbeafe;line-height:1.7;margin-top:8px;">'
              +'<b style="color:#c4b5fd;">별의 근거:</b> '+zwFlowEsc(signal.palaceName)+'에서 '+zwFlowEsc(mainStar)+'이 중심이 되고, '+zwFlowEsc(sihuaText)+'이 운의 방향을 정합니다.<br>'
              +'<b style="color:#fca5a5;">주의 신호:</b> '+zwFlowEsc(badText)+'<br>'
              +'<b style="color:#fef3c7;">보조 상징:</b> '+zwFlowEsc(olympus.god)+' · '+zwFlowEsc(olympus.seal)+' — '+zwFlowEsc(olympus.oracle)
            +'</div>'
          +'</details>';
        }
        function zwFlowTopSignals(items, cautious) {
          var sorted = items.slice().sort(function(a, b) {
            return cautious ? (a.signal.score - b.signal.score) : (b.signal.score - a.signal.score);
          });
          return sorted.slice(0, 3);
        }
        function zwFlowRankList(items, cautious) {
          return zwFlowTopSignals(items, cautious).map(function(item) {
            return '<span style="display:inline-flex;margin:2px 4px 2px 0;padding:3px 7px;border-radius:999px;border:1px solid rgba(250,204,21,0.24);background:rgba(250,204,21,0.08);color:#fde68a;font-size:0.72rem;font-weight:800;">'+zwFlowEsc(item.label)+' · '+zwFlowEsc(item.signal.palaceName)+' '+item.signal.score+'</span>';
          }).join('');
        }
        function zwFlowAnnualSummary(items, year, ganji) {
          if (!items.length) return '';
          var best = zwFlowRankList(items, false);
          var caution = zwFlowRankList(items, true);
          var guardian = zwFlowOlympus(items[0].signal);
          return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px;margin:0 0 13px;">'
            +'<div style="background:rgba(250,204,21,0.08);border:1px solid rgba(250,204,21,0.24);border-radius:11px;padding:11px;"><b style="color:#fde68a;">올해의 별지도</b><div style="font-size:0.76rem;color:#e2e8f0;line-height:1.65;margin-top:5px;">'+year+'년 '+zwFlowEsc(ganji)+'의 흐름은 월마다 다른 궁위로 내려앉습니다. 가장 좋은 달은 과감히 열고, 낮은 달은 정리와 보호로 운을 지키세요.</div></div>'
            +'<div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.22);border-radius:11px;padding:11px;"><b style="color:#86efac;">황금기 TOP 3</b><div style="margin-top:5px;">'+best+'</div></div>'
            +'<div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.22);border-radius:11px;padding:11px;"><b style="color:#fca5a5;">경계기 TOP 3</b><div style="margin-top:5px;">'+caution+'</div></div>'
            +'<div style="background:rgba(125,211,252,0.08);border:1px solid rgba(125,211,252,0.22);border-radius:11px;padding:11px;"><b style="color:#bae6fd;">올해의 수호신</b><div style="font-size:0.76rem;color:#e2e8f0;line-height:1.65;margin-top:5px;">'+zwFlowEsc(guardian.god)+' · '+zwFlowEsc(guardian.seal)+'<br>'+zwFlowEsc(guardian.tone)+'</div></div>'
          +'</div>';
        }
        function zwFlowDecadeSummary(items, title) {
          if (!items.length) return '';
          return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px;margin:10px 0 12px;">'
            +'<div style="background:rgba(196,181,253,0.08);border:1px solid rgba(196,181,253,0.22);border-radius:10px;padding:10px;"><b style="color:#c4b5fd;">10년 총론</b><div style="font-size:0.76rem;color:#dbeafe;line-height:1.65;margin-top:5px;">'+zwFlowEsc(title)+'은 한 해 운보다 깊은 바닥 물결입니다. 같은 궁위와 사화가 반복되는 해를 중심으로 인생의 큰 선택을 배치하세요.</div></div>'
            +'<div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.22);border-radius:10px;padding:10px;"><b style="color:#86efac;">10년 황금기</b><div style="margin-top:5px;">'+zwFlowRankList(items, false)+'</div></div>'
            +'<div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.22);border-radius:10px;padding:10px;"><b style="color:#fca5a5;">10년 경계기</b><div style="margin-top:5px;">'+zwFlowRankList(items, true)+'</div></div>'
          +'</div>';
        }
        var flowYear = _zwNowYear();
        var flowGanji = zwFlowGanji(flowYear);
        var flowYearGan = flowGanji.charAt(0) || pd.yearGan || '';
        var flowYearZhi = flowGanji.charAt(1) || '';
        var annualAnchorIdx = (typeof ZHI_LIST !== 'undefined' && ZHI_LIST.indexOf(flowYearZhi) >= 0) ? ZHI_LIST.indexOf(flowYearZhi) : -1;
        if (annualAnchorIdx < 0 && pd.palacesByIndex) annualAnchorIdx = pd.palacesByIndex.indexOf('명궁');
        if (annualAnchorIdx < 0) annualAnchorIdx = 0;
        var monthlyFlowHtml = '';
        var monthlyFlowSignals = [];
        for (var mf = 0; mf < 12; mf += 1) {
          var monthIdx = (annualAnchorIdx + mf) % 12;
          var monthSignal = zwFlowPalaceSignal(monthIdx, flowYearGan);
          monthlyFlowSignals.push({ label:(mf + 1)+'월', signal:monthSignal });
          var primaryStar = monthSignal.main[0] || '공궁';
          var monthOlympus = zwFlowOlympus(monthSignal);
          var monthDeepHtml = zwFlowDeepReading(monthSignal, monthOlympus, (mf + 1)+'월');
          var isCarefulMonth = monthSignal.counts['화기'] > 0 || monthSignal.bad.length >= 2;
          var actionLine = isCarefulMonth
            ? '계약, 지출, 감정 표현은 하루를 더 두고 확인하세요.'
            : (monthSignal.score >= 78 ? '공개, 제안, 확장 행동을 한 가지는 반드시 실행하세요.' : '작은 루틴 하나를 매일 반복하면 운이 안정됩니다.');
          monthlyFlowHtml += '<article style="background:rgba(15,23,42,0.58);border:1px solid rgba(196,181,253,0.22);border-radius:11px;padding:11px 12px;box-shadow:0 8px 20px rgba(0,0,0,0.2);">'
            +'<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:7px;">'
              +'<b style="color:#fde68a;font-size:0.92rem;">'+(mf + 1)+'月 · '+zwFlowEsc(monthSignal.palaceName)+'</b>'
              +'<span style="color:#c4b5fd;font-size:0.72rem;font-weight:800;">'+monthSignal.score+' · '+monthSignal.grade+'</span>'
            +'</div>'
            +'<div style="font-size:0.8rem;color:#e9d5ff;line-height:1.62;margin-bottom:6px;">주성 <b>'+zwFlowEsc(primaryStar)+'</b>이 '+zwFlowEsc(monthSignal.theme.focus)+'을 비춥니다.</div>'
            +'<div style="font-size:0.76rem;color:#cbd5e1;line-height:1.62;">'
              +'<b style="color:#93c5fd;">재물·일:</b> '+zwFlowEsc(monthSignal.theme.money)+'<br>'
              +'<b style="color:#f9a8d4;">관계:</b> '+zwFlowEsc(monthSignal.theme.relation)+'<br>'
              +'<b style="color:#fcd34d;">주의:</b> '+(isCarefulMonth ? '화기와 흉성의 그림자가 있으니 과속을 피하세요.' : '기회는 있으나 흩어지면 복이 얕아집니다.')+'<br>'
              +'<b style="color:#86efac;">실행:</b> '+actionLine
            +'</div>'
            +'<div style="margin-top:7px;">'+zwFlowSihuaTags(monthSignal.sihua)+'</div>'
            +'<div style="margin-top:7px;font-size:0.74rem;color:#fde68a;line-height:1.55;"><b>보조 상징:</b> '+zwFlowEsc(monthOlympus.god)+' · '+zwFlowEsc(monthOlympus.seal)+'</div>'
            +monthDeepHtml
          +'</article>';
        }
        var monthlySummaryHtml = zwFlowAnnualSummary(monthlyFlowSignals, flowYear, flowGanji || String(flowYear));
        var birthYearForFlow = Number((window._ziweiBirth && window._ziweiBirth.year) || 0);
        var currentKoreanAge = birthYearForFlow > 0 ? (flowYear - birthYearForFlow + 1) : 0;
        var currentDahan = null;
        var currentDahanIndex = -1;
        if (pd.daHanList && pd.daHanList.length) {
          currentDahan = pd.daHanList.find(function(dh, dhIdx) {
            var matched = currentKoreanAge > 0 && currentKoreanAge >= Number(dh.startAge) && currentKoreanAge <= Number(dh.endAge);
            if (matched) currentDahanIndex = dhIdx;
            return matched;
          }) || pd.daHanList[0];
          if (currentDahanIndex < 0) currentDahanIndex = 0;
        }
        var nextDahan = (pd.daHanList && currentDahanIndex >= 0) ? pd.daHanList[currentDahanIndex + 1] : null;
        var dahanPreviewLabel = currentDahan
          ? ('현재 '+currentDahan.startAge+'~'+currentDahan.endAge+'세 '+currentDahan.palaceName+' 대한')
          : '현재 대한 정보 확인 중';
        var dahanNextLabel = nextDahan
          ? ('다음 '+nextDahan.startAge+'~'+nextDahan.endAge+'세 '+nextDahan.palaceName+' 대한')
          : '다음 대한은 전체 보기에서 확인';
        var decadeRowsHtml = '';
        var decadeSummaryHtml = '';
        var decadeFlowSignals = [];
        var decadeTitle = '현재 대한 10년운';
        if (currentDahan) {
          decadeTitle = currentDahan.startAge + '~' + currentDahan.endAge + '세 · ' + currentDahan.palaceName + ' 대한';
          for (var age = Number(currentDahan.startAge), rowNo = 0; age <= Number(currentDahan.endAge) && rowNo < 10; age += 1, rowNo += 1) {
            var rowYear = birthYearForFlow > 0 ? (birthYearForFlow + age - 1) : (flowYear + rowNo);
            var rowGanji = zwFlowGanji(rowYear);
            var rowGan = rowGanji.charAt(0) || flowYearGan;
            var rowIdx = (Number(currentDahan.idx) + rowNo * (pd.direction || 1) + 120) % 12;
            var rowSignal = zwFlowPalaceSignal(rowIdx, rowGan);
            decadeFlowSignals.push({ label:rowYear+'년', signal:rowSignal });
            var rowOlympus = zwFlowOlympus(rowSignal);
            var rowDeepHtml = zwFlowDeepReading(rowSignal, rowOlympus, rowYear+'년');
            var rowCareful = rowSignal.counts['화기'] > 0 || rowSignal.bad.length >= 2;
            var rowAdvice = rowCareful
              ? '큰 결정보다 정리, 검토, 방어가 복을 지킵니다.'
              : (rowSignal.score >= 76 ? '명예와 실익이 함께 움직이니 주도적으로 문을 여세요.' : '준비한 일을 작게 공개하며 흐름을 시험하세요.');
            decadeRowsHtml += '<div style="display:grid;grid-template-columns:minmax(64px,86px) minmax(0,1fr);gap:10px;padding:10px 0;border-bottom:1px solid rgba(148,163,184,0.18);">'
              +'<div style="color:#fde68a;font-weight:900;font-size:0.82rem;">'+rowYear+'<br><span style="color:#c4b5fd;font-size:0.72rem;">'+age+'세</span></div>'
              +'<div style="font-size:0.8rem;color:#dbeafe;line-height:1.65;">'
                +'<b style="color:#e9d5ff;">'+zwFlowEsc(rowSignal.palaceName)+'</b> · '+zwFlowEsc(rowGanji)+' · '+zwFlowEsc(rowSignal.grade)+' '+rowSignal.score+'점<br>'
                +'<span style="color:#cbd5e1;">주성 '+zwFlowEsc(rowSignal.main[0] || '공궁')+'이 '+zwFlowEsc(rowSignal.theme.focus)+'을 밀어 올립니다. '+rowAdvice+'</span>'
                +'<div style="margin-top:4px;color:#fde68a;"><b>신화 인장:</b> '+zwFlowEsc(rowOlympus.god)+' · '+zwFlowEsc(rowOlympus.seal)+'</div>'
                +'<div style="margin-top:4px;">'+zwFlowSihuaTags(rowSignal.sihua)+'</div>'
                +rowDeepHtml
              +'</div>'
            +'</div>';
          }
          decadeSummaryHtml = zwFlowDecadeSummary(decadeFlowSignals, decadeTitle);
        } else {
          decadeRowsHtml = '<p style="font-size:0.82rem;color:#cbd5e1;line-height:1.7;margin:0;">대한 데이터가 제한되어 10년운을 산출하지 못했습니다. 출생 시간과 프로필을 다시 확인해 주세요.</p>';
        }
        var sec_ziwei_flow = '<div data-cd-marker="'+ZW_FLOW_MARKER+'" style="background:linear-gradient(145deg,rgba(17,24,39,0.92),rgba(49,22,83,0.68));padding:18px;border-radius:12px;margin-bottom:20px;border:1px solid rgba(216,180,254,0.28);box-shadow:0 12px 28px rgba(0,0,0,0.24);">'
          +'<h2 style="color:#fef3c7;font-size:1.18rem;margin:0 0 8px;border-bottom:1px solid rgba(250,204,21,0.24);padding-bottom:8px;">📅 자미두수 1년운 — '+flowYear+'년 월별 운기</h2>'
          +'<p style="font-size:0.8rem;color:#c4b5fd;line-height:1.65;margin:0 0 12px;">유년 '+zwFlowEsc(flowGanji || String(flowYear))+'의 사화와 12궁 흐름을 월별로 펼친 운세입니다.</p>'
          +monthlySummaryHtml
          +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:9px;margin-bottom:14px;">'+monthlyFlowHtml+'</div>'
          +'<div class="cd-section-gate zw-basic-paid-gate fr-report-gate" id="ziweiDecadeLuckGate" data-cd-marker="ziwei-basic-paid-gate-v20260617-daehan" data-unlock-key="ziwei_decade_luck" data-locked-title="' + _sajuEngineText("se_21090_attr_title") + '" data-locked-desc="현재 대한의 10년 흐름과 연도별 기회·주의 신호를 열람하려면 5,000원 결제가 필요합니다." style="border-radius:12px;margin-top:14px;">'
            +'<div class="cd-section-gate__overlay">'
              +'<div class="cd-section-gate__icon">🔐</div>'
              +'<p class="cd-section-gate__title">자미두수 10년운 — 프리미엄 콘텐츠</p>'
              +'<p class="cd-section-gate__desc">대한(大限)을 기준으로 앞으로의 10년을 연도별로 풀어드립니다.</p>'
              +'<span class="cd-section-gate__badge">5,000원으로 영구 해금</span>'
              +'<button type="button" class="cd-section-gate__btn" data-action="unlockPremiumFeature" data-unlock-key="ziwei_decade_luck" data-content-key="ziwei.decadeLuck" data-service-key="ziwei" data-unlock-cost="50">5,000원으로 10년운 열기</button>'
              +'<div data-zw-paid-gate-message style="min-height:14px;color:#a78bfa;font-size:0.68rem;font-weight:900;"></div>'
            +'</div>'
            +'<div class="cd-section-gate__body">'
              +_cdGateBody('ziwei_decade_luck',
                '<div style="background:rgba(15,23,42,0.62);border:1px solid rgba(125,211,252,0.22);border-radius:11px;padding:13px 14px;">'
                +'<h3 style="margin:0 0 8px;color:#93c5fd;font-size:1rem;">⏳ '+zwFlowEsc(decadeTitle)+'</h3>'
                +'<p style="font-size:0.78rem;color:#cbd5e1;line-height:1.65;margin:0 0 8px;">이 10년은 월운보다 깊게 작동하는 대한의 바닥 기류입니다. 기회는 반복되는 궁에서 열리고, 위험은 같은 사화가 겹칠 때 선명해집니다.</p>'
                +decadeSummaryHtml
                +decadeRowsHtml
              +'</div>')
            +'</div>'
          +'</div>'
        +'</div>';
        var natalOlympusIdx = (typeof ZHI_LIST !== 'undefined' && pd.meng) ? ZHI_LIST.indexOf(pd.meng) : -1;
        if (natalOlympusIdx < 0 && pd.palacesByIndex) natalOlympusIdx = pd.palacesByIndex.indexOf('명궁');
        if (natalOlympusIdx < 0) natalOlympusIdx = 0;
        var natalOlympusSignal = zwFlowPalaceSignal(natalOlympusIdx, pd.yearGan || flowYearGan);
        var natalOlympus = zwFlowOlympus(natalOlympusSignal);
        var natalRealityIdx = (typeof ZHI_LIST !== 'undefined' && pd.shen) ? ZHI_LIST.indexOf(pd.shen) : -1;
        if (natalRealityIdx < 0 && pd.palacesByIndex) natalRealityIdx = pd.palacesByIndex.indexOf('관록궁');
        if (natalRealityIdx < 0) natalRealityIdx = natalOlympusIdx;
        var natalRealitySignal = zwFlowPalaceSignal(natalRealityIdx, pd.yearGan || flowYearGan);
        var natalRealityOlympus = zwFlowOlympus(natalRealitySignal);
        var natalSihuaSeal = natalOlympus.sihuaSeal || zwFlowSihuaSeal(natalOlympusSignal);
        var natalShadowSeal = natalOlympus.shadowSeal || zwFlowShadowSeal(natalOlympusSignal);
        var olympusSealEntries = [
          { title:_sajuEngineText("se_20524_prop_title"), seal:{
            name:natalOlympus.god,
            god:natalOlympus.realm,
            icon:natalOlympus.icon,
            seal:natalOlympus.seal,
            tone:natalOlympus.tone,
            oracle:natalOlympus.oracle,
            basis:natalOlympus.basis
          }, accent:'#fde68a', basisLabel:'명궁 근거' },
          { title:_sajuEngineText("se_20533_prop_title"), seal:{
            name:natalRealityOlympus.god,
            god:natalRealityOlympus.realm,
            icon:natalRealityOlympus.icon,
            seal:natalRealityOlympus.seal,
            tone:natalRealityOlympus.tone,
            oracle:natalRealityOlympus.oracle,
            basis:natalRealityOlympus.basis
          }, accent:'#93c5fd', basisLabel:'신궁/관록 근거' },
          { title:_sajuEngineText("se_20542_prop_title"), seal:natalSihuaSeal, accent:'#c4b5fd', basisLabel:'사화 근거' },
          { title:_sajuEngineText("se_20543_prop_title"), seal:natalShadowSeal, accent:'#fca5a5', basisLabel:'주의 근거' }
        ];
        var olympusSealSeen = {};
        var olympusSealCardsHtml = '';
        var olympusSealMergedHtml = '';
        olympusSealEntries.forEach(function(entry) {
          var key = zwFlowSealKey(entry.seal);
          if (key && olympusSealSeen[key]) {
            olympusSealMergedHtml += zwFlowSealSummaryChip(entry.title, entry.seal, entry.accent, entry.basisLabel);
            return;
          }
          if (key) olympusSealSeen[key] = true;
          olympusSealCardsHtml += zwFlowSealCard(entry.title, entry.seal, entry.accent, entry.basisLabel);
        });
        if (olympusSealMergedHtml) {
          olympusSealCardsHtml += '<article style="background:rgba(2,6,23,0.34);border:1px solid rgba(250,204,21,0.22);border-radius:12px;padding:12px;min-width:0;">'
            +'<div style="color:#fde68a;font-size:0.78rem;font-weight:900;margin-bottom:8px;">반복 인장 요약</div>'
            +'<div style="display:grid;gap:7px;">'+olympusSealMergedHtml+'</div>'
          +'</article>';
        }
        var olympusAxisTitle = natalOlympus.god === natalRealityOlympus.god
          ? natalOlympus.god+' 인장이 본명과 현실축에 함께 작동'
          : natalOlympus.god+' 본명과 '+natalRealityOlympus.god+' 현실축';
        function zwOverviewTile(title, value, desc, accent) {
          return '<div style="background:rgba(15,23,42,0.58);border:1px solid '+accent+'44;border-radius:10px;padding:10px 11px;min-width:0;">'
            +'<div style="color:'+accent+';font-size:0.72rem;font-weight:900;margin-bottom:4px;">'+zwFlowEsc(title)+'</div>'
            +'<div style="color:#f8fafc;font-size:0.93rem;font-weight:900;line-height:1.42;">'+zwFlowEsc(value)+'</div>'
            +'<div style="color:#cbd5e1;font-size:0.74rem;line-height:1.55;margin-top:5px;">'+zwFlowEsc(desc)+'</div>'
          +'</div>';
        }
        function zwReportTimeLabel(t) {
          if (!t) return '-';
          var h = Number(t.hour);
          var m = Number(t.minute);
          if (!isFinite(h) || !isFinite(m)) return '-';
          return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        }
        var ziweiInputMeta = window._ziweiInputMeta || {};
        var ziweiBirthMeta = window._ziweiBirth || {};
        var ziweiInputTimeText = zwReportTimeLabel(ziweiInputMeta.inputDate);
        var ziweiCorrectedTimeText = zwReportTimeLabel(ziweiInputMeta.correctedTime || ziweiBirthMeta);
        var ziweiTimeUnknown = !!(ziweiInputMeta.unknownHour || ziweiInputMeta.timeDefault || ziweiBirthMeta.unknownHour || ziweiBirthMeta.timeDefault);
        var ziweiPlaceText = ziweiInputMeta.placeLabel || '출생지 미지정';
        var ziweiCorrectionText = isFinite(Number(ziweiInputMeta.totalCorrectionMinutes))
          ? (Math.round(Number(ziweiInputMeta.totalCorrectionMinutes) * 10) / 10) + '분'
          : '-';
        var ziweiPrecisionMain = ziweiTimeUnknown
          ? '출생시간 미상 또는 정오 기본값으로 계산된 경우 명궁·신궁·12궁 배치가 달라질 수 있어, 성향 중심으로 보수 해석합니다.'
          : '입력 생시와 도시 기반 진태양시 보정을 반영해 명궁·신궁·12궁 배치를 계산했습니다.';
        var ziweiPrecisionTone = ziweiTimeUnknown
          ? { label:_sajuEngineText("se_20593_prop_label"), color:'#fde68a', border:'rgba(251,191,36,0.46)', bg:'rgba(120,53,15,0.24)' }
          : { label:_sajuEngineText("se_20594_prop_label"), color:'#bbf7d0', border:'rgba(110,231,183,0.38)', bg:'rgba(6,78,59,0.22)' };
        var ziweiPrecisionNotice = '<div data-cd-marker="ziwei-precision-notice-v20260615" style="background:rgba(15,23,42,0.74);border:1px solid '+ziweiPrecisionTone.border+';border-radius:12px;padding:11px 12px;margin-bottom:14px;color:#dbeafe;font-size:0.8rem;line-height:1.65;">'
          +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:5px;">'
            +'<b style="color:'+ziweiPrecisionTone.color+';">해석 정확도</b>'
            +'<span style="display:inline-flex;border:1px solid '+ziweiPrecisionTone.border+';background:'+ziweiPrecisionTone.bg+';color:'+ziweiPrecisionTone.color+';border-radius:999px;padding:4px 8px;font-size:0.7rem;font-weight:900;">'+ziweiPrecisionTone.label+'</span>'
          +'</div>'
          +'<div>'+zwFlowEsc(ziweiPrecisionMain)+'</div>'
          +'<div style="margin-top:5px;color:#cbd5e1;font-size:0.75rem;">입력 '+zwFlowEsc(ziweiInputTimeText)+' · 보정 '+zwFlowEsc(ziweiCorrectedTimeText)+' · 보정값 '+zwFlowEsc(ziweiCorrectionText)+' · '+zwFlowEsc(ziweiPlaceText)+'</div>'
        +'</div>';
        var ziweiOverviewCaution = dominantSihuaType === '화기'
          ? '말, 계약, 감정 판단은 기록과 확인을 거칠수록 운이 안정됩니다.'
          : (badUnique.length >= 3
            ? '강한 흐름을 밀기 전에 휴식과 검토 시간을 먼저 확보하세요.'
            : '직접 손실 신호는 강하지 않으므로, 한 가지 목표를 꾸준히 밀 때 흐름이 안정됩니다.');
        var ziweiOverviewAction = hasHwagi
          ? '결정 속도를 늦추고 중요한 약속을 문장으로 남기는 습관이 필요합니다.'
          : (hasHwarok || hasHwakwon || hasHwakwa
            ? '강점 하나를 공개 결과물로 바꾸는 계획을 세우세요.'
            : '작은 루틴 하나를 고정하면 흐름이 선명해집니다.');
        var ziweiWorkAxisValue = (careerMainStars.length ? careerMainStars.join(' · ') : '공궁 보완') + ' / ' + (wealthMainStars.length ? wealthMainStars.join(' · ') : '공궁 보완');
        var ziweiWorkAxisDesc = '관록궁·재백궁 주성/차성 기준으로 '+careerSkill+' 역할과 수익화 방식을 읽습니다.';
        var ziweiRelationAxisValue = spouseLabel;
        var ziweiRelationAxisDesc = '부부궁·명궁·복덕궁 근거로 '+loveDestinyTitle+' 흐름과 약속 방식을 봅니다.';
        var ziweiPersonaLine = mengStarMain
          ? '명궁(나의 기질)은 '+mengStarMain+'을 중심으로 읽습니다. '+lifeSentence
          : '명궁(나의 기질)은 공궁 보완형입니다. 신궁과 보조성을 함께 보며 성향을 보수적으로 읽습니다.';
        var ziweiWorkLine = '관록궁·재백궁(일·돈)은 '+careerSkill+' 강점과 '+bizVsJob+' 방식을 함께 봅니다.';
        var ziweiRelationLine = '부부궁(관계)은 '+loveDestinyTitle+' 흐름을 중심으로, 약속 방식과 생활 리듬을 함께 맞출수록 안정됩니다.';
        var ziweiPrecisionGuide = ziweiTimeUnknown
          ? '생시가 불확실해 기본 결론은 성향 중심으로 읽습니다.'
          : '보정 생시를 기준으로 기본 결론을 읽습니다.';
        var ziweiPersonaPreview = '핵심: '+(mengStarMain || '공궁 보완형')+' · '+(pd.shen || '-')+' 현실축';
        var ziweiWorkPreview = '핵심: '+careerSkill+' · '+bizVsJob;
        var ziweiRelationPreview = '핵심: '+loveDestinyTitle;
        var ziweiKeySummary = '기질, 일·돈, 관계의 세 축을 먼저 잡고 필요한 보조 장만 이어서 확인합니다.';
        var ziweiSummaryRowsHtml = '<div data-cd-marker="ziwei-first-summary-v20260615-step2" style="position:relative;z-index:1;background:rgba(2,6,23,0.34);border:1px solid rgba(250,204,21,0.2);border-radius:11px;padding:11px 12px;margin-bottom:10px;color:#f8fafc;font-size:0.82rem;line-height:1.65;">'
          +'<b style="display:block;color:#fde68a;margin-bottom:7px;">오늘의 핵심 3가지</b>'
          +'<div style="display:grid;gap:7px;">'
            +'<div><b style="color:#fef3c7;">성향</b> · '+zwFlowEsc(ziweiPersonaLine)+'</div>'
            +'<div><b style="color:#bfdbfe;">일·돈</b> · '+zwFlowEsc(ziweiWorkLine)+'</div>'
            +'<div><b style="color:#fbcfe8;">관계</b> · '+zwFlowEsc(ziweiRelationLine)+'</div>'
          +'</div>'
          +'<div style="margin-top:8px;color:'+(ziweiTimeUnknown?'#fde68a':'#bbf7d0')+';font-size:0.74rem;">'+zwFlowEsc(ziweiPrecisionGuide)+'</div>'
        +'</div>';
        var ziweiNextActionHtml = '<div data-cd-marker="ziwei-next-action-rail-v20260615" style="position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr));gap:8px;margin-top:10px;">'
          +'<div style="background:rgba(2,6,23,0.38);border:1px solid rgba(253,230,138,0.2);border-radius:10px;padding:9px 10px;color:#fef3c7;font-size:0.76rem;line-height:1.55;"><b>1. 나의 축</b><br>명궁(기질)·신궁(현실 무대)을 먼저 봅니다.</div>'
          +'<div style="background:rgba(2,6,23,0.38);border:1px solid rgba(147,197,253,0.2);border-radius:10px;padding:9px 10px;color:#dbeafe;font-size:0.76rem;line-height:1.55;"><b>2. 일과 돈</b><br>관록궁(일)·재백궁(돈)의 방향을 정리합니다.</div>'
          +'<div style="background:rgba(2,6,23,0.38);border:1px solid rgba(249,168,212,0.22);border-radius:10px;padding:9px 10px;color:#ffe4e6;font-size:0.76rem;line-height:1.55;"><b>3. 관계</b><br>부부궁(관계)으로 끌림과 약속 방식을 확인합니다.</div>'
        +'</div>';
        var ziweiTermGuideHtml = '<div data-cd-marker="ziwei-term-guide-v20260615" style="position:relative;z-index:1;margin-top:8px;background:rgba(15,23,42,0.34);border:1px solid rgba(148,163,184,0.18);border-radius:9px;padding:8px 10px;color:#cbd5e1;font-size:0.72rem;line-height:1.55;">'
          +'<b style="color:#e2e8f0;">용어 한 줄</b> · 주성은 중심 별, 차성은 보조 별, 사화는 변화 신호, 공궁 보완은 맞은편 궁과 보조성을 함께 읽는 방식입니다.'
        +'</div>';
        var sec_ziwei_overview = '<section data-cd-marker="ziwei-overview-firstscreen-v20260615" style="position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(8,13,29,0.96),rgba(24,32,54,0.94) 56%,rgba(16,52,58,0.9));border:1px solid rgba(250,204,21,0.24);border-radius:12px;padding:16px;margin-bottom:18px;box-shadow:0 16px 34px rgba(0,0,0,0.28),inset 0 0 0 1px rgba(255,255,255,0.05);">'
          +'<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(250,204,21,0.06),transparent 46%,rgba(110,231,183,0.06));pointer-events:none;"></div>'
          +'<div style="position:relative;z-index:1;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:12px;">'
            +'<div style="min-width:0;">'
              +'<div style="color:#fde68a;font-size:0.72rem;font-weight:900;letter-spacing:0.04em;">기본 명반 · 핵심 4축</div>'
              +'<h2 style="margin:5px 0 0;color:#fef3c7;font-size:1.18rem;line-height:1.38;">자미두수 기본 명반 요약</h2>'
              +'<p style="margin:6px 0 0;color:#dbeafe;font-size:0.78rem;line-height:1.6;">'+zwFlowEsc(ziweiKeySummary)+'</p>'
            +'</div>'
            +'<span style="display:inline-flex;border:1px solid rgba(110,231,183,0.35);background:rgba(6,78,59,0.28);color:#bbf7d0;border-radius:999px;padding:7px 10px;font-size:0.72rem;font-weight:900;">기본 리딩</span>'
          +'</div>'
          +ziweiSummaryRowsHtml
          +'<div style="position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:8px;margin-bottom:10px;">'
            +zwOverviewTile('명궁(나의 기질)', (pd.meng || '-')+' · '+(mengStarMain || '공궁'), lifeSentence, '#fde68a')
            +zwOverviewTile('신궁(현실 무대)', (pd.shen || '-')+' · 현실 작동축', '겉으로 드러나는 선택과 생활 무대의 방향을 보여줍니다.', '#93c5fd')
            +zwOverviewTile('관록·재백(일·돈)', ziweiWorkAxisValue, ziweiWorkAxisDesc, '#6ee7b7')
            +zwOverviewTile('부부궁(관계)', ziweiRelationAxisValue, ziweiRelationAxisDesc, '#f9a8d4')
          +'</div>'
          +'<div style="position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:8px;">'
            +'<div style="background:rgba(2,6,23,0.36);border:1px solid rgba(147,197,253,0.22);border-radius:10px;padding:10px 11px;color:#dbeafe;font-size:0.78rem;line-height:1.6;"><b style="color:#bfdbfe;">가장 강한 분야</b><br>'+zwFlowEsc(careerSkill)+' · '+zwFlowEsc(bizVsJob)+'</div>'
            +'<div style="background:rgba(2,6,23,0.36);border:1px solid rgba(252,165,165,0.22);border-radius:10px;padding:10px 11px;color:#dbeafe;font-size:0.78rem;line-height:1.6;"><b style="color:#fca5a5;">주의 흐름</b><br>'+zwFlowEsc(ziweiOverviewCaution)+'</div>'
            +'<div style="background:rgba(2,6,23,0.36);border:1px solid rgba(250,204,21,0.22);border-radius:10px;padding:10px 11px;color:#dbeafe;font-size:0.78rem;line-height:1.6;"><b style="color:#fde68a;">실행 방향</b><br>'+zwFlowEsc(ziweiOverviewAction)+'</div>'
          +'</div>'
          +ziweiNextActionHtml
          +ziweiTermGuideHtml
        +'</section>';
        var olympusCategoryHtml = Object.keys(ZW_FLOW_DOMAIN_META).map(function(key) {
          var meta = ZW_FLOW_DOMAIN_META[key];
          var score = zwFlowDomainScore(natalOlympusSignal, key);
          var color = score >= 75 ? '#86efac' : (score <= 45 ? '#fca5a5' : '#fcd34d');
          return '<div style="background:rgba(15,23,42,0.56);border:1px solid rgba(216,180,254,0.18);border-radius:10px;padding:10px;">'
            +'<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;"><b style="color:#e9d5ff;">'+meta.label+' 상징</b><span style="color:'+color+';font-weight:900;">'+score+'</span></div>'
            +'<div style="font-size:0.74rem;color:#cbd5e1;line-height:1.6;margin-top:5px;">'+zwFlowEsc(score >= 75 ? meta.good : (score <= 45 ? meta.care : '균형을 맞추면 상징의 흐름이 천천히 열립니다.'))+'</div>'
            +'<div style="font-size:0.66rem;color:#94a3b8;line-height:1.45;margin-top:5px;">근거: '+zwFlowEsc(natalOlympusSignal.palaceName)+' · '+zwFlowEsc(natalOlympus.primaryStar)+' · '+zwFlowEsc(natalSihuaSeal.name)+'</div>'
          +'</div>';
        }).join('');
        var sec_olympus_ziwei = '<section data-cd-marker="ziwei-olympus-guardian-v20260606" data-cd-upgrade="ziwei-olympus-seal-dedupe-v20260614" style="position:relative;overflow:hidden;background:radial-gradient(circle at 12% 16%,rgba(250,204,21,0.14),transparent 34%),radial-gradient(circle at 88% 20%,rgba(125,211,252,0.14),transparent 36%),linear-gradient(145deg,rgba(12,18,38,0.95),rgba(39,20,68,0.88) 52%,rgba(6,35,54,0.9));padding:18px;border-radius:12px;margin-bottom:20px;border:1px solid rgba(250,204,21,0.28);box-shadow:0 14px 34px rgba(0,0,0,0.28),inset 0 0 0 1px rgba(255,255,255,0.06);">'
          +'<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:12px;">'
            +'<div><div style="font-size:0.76rem;color:#fde68a;font-weight:900;letter-spacing:0.02em;">SYMBOL SEAL · 紫微斗數 · 命身四化</div><h2 style="margin:4px 0 0;color:#fef3c7;font-size:1.16rem;">보조 상징 인장 — '+zwFlowEsc(olympusAxisTitle)+'</h2><div style="font-size:0.76rem;color:#cbd5e1;line-height:1.65;margin-top:5px;">명궁·신궁·사화·그림자 신호를 시각화한 선택형 상징 레이어입니다.</div></div>'
            +'<span data-cd-marker="ziwei-olympus-oracle-detached-v20260614" style="display:inline-flex;border:1px solid rgba(250,204,21,0.32);background:rgba(250,204,21,0.10);color:#fde68a;border-radius:999px;padding:8px 12px;font-weight:900;font-size:0.78rem;">보조 상징 레이어</span>'
          +'</div>'
          +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px;margin-bottom:12px;">'+olympusSealCardsHtml+'</div>'
          +'<div style="background:rgba(2,6,23,0.38);border:1px solid rgba(250,204,21,0.16);border-radius:12px;padding:12px;margin-bottom:12px;">'
          +'<div style="color:#fde68a;font-size:0.82rem;font-weight:900;margin-bottom:6px;">상징 변환 기준</div>'
            +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:7px;font-size:0.73rem;line-height:1.55;color:#dbeafe;">'
              +'<div style="background:rgba(15,23,42,0.5);border-radius:8px;padding:8px;"><b style="color:#fef3c7;">명궁</b><br>'+zwFlowEsc(natalOlympusSignal.palaceName)+' · '+zwFlowEsc(natalOlympus.primaryStar)+' · '+zwFlowEsc(natalOlympus.god)+'</div>'
              +'<div style="background:rgba(15,23,42,0.5);border-radius:8px;padding:8px;"><b style="color:#bfdbfe;">신궁/현실축</b><br>'+zwFlowEsc(natalRealitySignal.palaceName)+' · '+zwFlowEsc(natalRealityOlympus.primaryStar)+' · '+zwFlowEsc(natalRealityOlympus.god)+'</div>'
              +'<div style="background:rgba(15,23,42,0.5);border-radius:8px;padding:8px;"><b style="color:#c4b5fd;">사화</b><br>'+zwFlowEsc(natalSihuaSeal.name)+' · '+zwFlowEsc(natalSihuaSeal.basis)+'</div>'
              +'<div style="background:rgba(15,23,42,0.5);border-radius:8px;padding:8px;"><b style="color:#fca5a5;">그림자</b><br>'+zwFlowEsc(natalShadowSeal.name)+' · '+zwFlowEsc(natalShadowSeal.basis)+'</div>'
            +'</div>'
          +'</div>'
          +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:8px;">'+olympusCategoryHtml+'</div>'
        +'</section>';
        try {
          sec_olympus_ziwei += buildZwSymbolicDeepHtml({
            ming: { star: natalOlympus.primaryStar, god: natalOlympus.god, palaceName: natalOlympusSignal.palaceName },
            shen: { star: natalRealityOlympus.primaryStar, god: natalRealityOlympus.god, palaceName: natalRealitySignal.palaceName },
            sihua: natalSihuaSeal,
            shadow: natalShadowSeal,
            domains: Object.keys(ZW_FLOW_DOMAIN_META).map(function(k){ var m = ZW_FLOW_DOMAIN_META[k]; return { label: m.label, score: zwFlowDomainScore(natalOlympusSignal, k), good: m.good, care: m.care }; })
          });
        } catch (_symWireErr) {}
        var sec_grand = '<div style="background:linear-gradient(135deg,rgba(88,28,220,0.15),rgba(20,10,50,0.8));padding:18px;border-radius:10px;margin-bottom:20px;border:1px solid rgba(139,92,246,0.3);">'
          +'<h2 style="color:#F9A8D4;font-size:1.2rem;margin-top:0;border-bottom:1px solid rgba(249,168,212,0.3);padding-bottom:8px;">🌟 생애 총론(生涯 總論)</h2>'
          +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.88rem;margin-bottom:12px;">'
            +'<div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;"><div style="color:#94a3b8;font-size:0.75rem;">⚡ 오행국</div><div style="color:#fbbf24;font-weight:700;">'+(pd.juInfo||'-')+'</div></div>'
            +'<div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;"><div style="color:#94a3b8;font-size:0.75rem;">🔄 대한 진행</div><div style="color:#a78bfa;font-weight:700;">'+dirText+'</div></div>'
            +'<div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;"><div style="color:#94a3b8;font-size:0.75rem;">🎭 명궁(命宮)</div><div style="color:#ffd700;font-weight:700;">'+(pd.meng||'-')+' · '+(mengStarMain||'공궁')+'</div></div>'
            +'<div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;"><div style="color:#94a3b8;font-size:0.75rem;">✨ 신궁(身宮)</div><div style="color:#6ee7b7;font-weight:700;">'+(pd.shen||'-')+'</div></div>'
          +'</div>'
          +'<div style="font-size:0.9rem;line-height:1.78;color:#e2e8f0;display:flex;flex-direction:column;gap:8px;">'
            +'<div><b style="color:#f9a8d4;">명궁 중심 장기 성향:</b> 명궁 주성 '+(mengStarMain||'공궁')+'과 '+(pd.juInfo||'오행국')+'의 결합은 <b>'+lifeSentence+'</b>라는 장기 운행 패턴을 형성합니다.</div>'
            +'<div><b style="color:#f9a8d4;">전개 메커니즘:</b> <span style="color:#fbbf24;">'+juVal+'세</span> 起運 이후 대한이 '+dirText+'으로 작동하며, 초기 단기 선택보다 중장기 누적 천기의 영향력이 크게 작용합니다.</div>'
            +'<div><b style="color:#f9a8d4;">사화(四化) 구조 해석:</b> '+(sihuaSummary.length>0 ? sihuaSummary.join(' &nbsp;·&nbsp; ') : '직접 작동 강도가 약한 중립 배치')+'</div>'
            +'<div><b style="color:#f9a8d4;">운명 축 진단:</b> 현재 명식의 우세 축은 <b>'+destinyAxis+'</b>입니다. 이는 동일한 사건이라도 어떤 방식으로 성과/손실이 분기되는지를 결정하는 핵심 운행 변수입니다.</div>'
            +'<div><b style="color:#f9a8d4;">운용 원칙:</b> '+destinyOps+'</div>'
          +'</div>'
        +'</div>';

        // ── 12대한 타임라인 ──
        var PALACE_DAHAN_THEME = {
          '명궁':{icon:'🎭',kw:'자아 확립·독립 의지의 전성기'},
          '형제궁':{icon:'🤝',kw:'동료·협력자의 조력이 운명을 바꾸는 시기'},
          '부부궁':{icon:'💑',kw:'결혼·동반자·주요 파트너십의 핵심 분기점'},
          '자녀궁':{icon:'🌱',kw:'창의적 성취와 후계·자녀 인연이 집중'},
          '재백궁':{icon:'💰',kw:'수입·투자·자산 변동이 집약되는 국면'},
          '질액궁':{icon:'⚕️',kw:'컨디션과 회복 리듬을 정돈하는 시기'},
          '천이궁':{icon:'✈️',kw:'이직·이사·해외 확장의 큰 이동 개운 구간'},
          '노복궁':{icon:'👥',kw:'부하·조직·핵심 인맥 수호가 성패를 가름'},
          '관록궁':{icon:'💼',kw:'커리어·사업·사회적 명성이 집중 형성'},
          '전택궁':{icon:'🏠',kw:'부동산·고정자산·저축 여력의 확충 구간'},
          '복덕궁':{icon:'🍀',kw:'정신적 풍요·행복감·내면 성장의 시기'},
          '부모궁':{icon:'👪',kw:'부모 덕·윗사람 후원·문서 운이 집중'}
        };
        var ZW_DAHAN_TIMELINE_MARKER = 'ziwei-daehan-timeline-expanded-v20260612';
        var ZW_DAHAN_GANS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
        var ZW_DAHAN_GAN_LABEL = {
          '甲':'갑(甲)', '乙':'을(乙)', '丙':'병(丙)', '丁':'정(丁)', '戊':'무(戊)',
          '己':'기(己)', '庚':'경(庚)', '辛':'신(辛)', '壬':'임(壬)', '癸':'계(癸)'
        };
        var ZW_DAHAN_GRADE_COLOR = { 'A+':'#F4C842', 'A':'#F4C842', 'B+':'#9CA3AF', 'B':'#9CA3AF', 'C+':'#A78BFA', 'C':'#A78BFA', 'D':'#F87171' };
        var ZW_DAHAN_GILSEONG = ['천괴','천월','좌보','우필','문창','문곡','녹존','화록'];
        var ZW_DAHAN_HYUNGSEONG = ['경양','타라','화성','영성','지공','지겁','화기'];
        function zwDahanPalaceStars(idx) {
          return (pd.stars && pd.stars[idx]) || { main:[], aux:[], bad:[] };
        }
        function zwDahanGan(dh) {
          var base = ZW_DAHAN_GANS.indexOf(pd.yearGan);
          if (base < 0) base = 0;
          return ZW_DAHAN_GANS[(base + Number(dh.order || 0)) % 10];
        }
        function zwDahanStarSet(idx) {
          var stars = zwDahanPalaceStars(idx);
          return uniqueList(extractMains(stars).concat(extractAux(stars), extractBad(stars)));
        }
        function zwDahanFindStarPalace(starName) {
          for (var i = 0; i < 12; i += 1) {
            if (zwDahanStarSet(i).indexOf(starName) >= 0) {
              return { idx:i, palaceName:zwFlowPalaceName(i) };
            }
          }
          return { idx:-1, palaceName:'미배치 궁' };
        }
        function zwDahanBuildSihua(gan) {
          var byStar = ZW_FLOW_SIHUA_BY_GAN[gan] || {};
          var byType = { '화록':null, '화권':null, '화과':null, '화기':null };
          Object.keys(byStar).forEach(function(starName) {
            var type = byStar[starName];
            var target = zwDahanFindStarPalace(starName);
            byType[type] = { star:starName, type:type, palaceName:target.palaceName, palaceIdx:target.idx };
          });
          return byType;
        }
        function zwDahanSihuaText(entry) {
          if (!entry) return '해당 별 미배치';
          return entry.star + ' → ' + entry.palaceName;
        }
        function zwDahanSihuaTags(byType) {
          return ['화록','화권','화과','화기'].map(function(type) {
            var entry = byType[type];
            var col = sihuaColors[type] || '#e5e7eb';
            return '<span style="display:inline-flex;margin:2px 5px 2px 0;padding:4px 8px;border-radius:999px;border:1px solid '+col+'66;background:'+col+'18;color:'+col+';font-size:0.72rem;font-weight:900;">'+zwFlowEsc(type)+' → '+zwFlowEsc(entry ? entry.palaceName : '미배치')+'</span>';
          }).join('');
        }
        function zwDahanSambangSajeong(idx, sihuaByType) {
          var scanIdx = uniqueList([idx, (idx + 4) % 12, (idx + 8) % 12, (idx + 6) % 12, (idx + 10) % 12]);
          var names = [];
          scanIdx.forEach(function(pi) { names = names.concat(zwDahanStarSet(pi)); });
          ['화록','화권','화과','화기'].forEach(function(type) {
            var entry = sihuaByType[type];
            if (entry && scanIdx.indexOf(entry.palaceIdx) >= 0) names.push(type);
          });
          var gil = names.filter(function(name) { return ZW_DAHAN_GILSEONG.indexOf(name) >= 0; }).length;
          var hyung = names.filter(function(name) { return ZW_DAHAN_HYUNGSEONG.indexOf(name) >= 0; }).length;
          var luck = gil >= hyung + 3 ? '상 (길성 우세)' : (gil >= hyung + 1 ? '중상 (길성 우세)' : (hyung >= gil + 2 ? '주의 (흉성 압박)' : '중립 (균형권)'));
          var keyActivation = uniqueList(scanIdx.map(function(pi) { return zwFlowPalaceName(pi); })).slice(0, 4).join('·') + ' 활성화';
          return { gil:gil, hyung:hyung, luck:luck, keyActivation:keyActivation };
        }
        function zwDahanGrade(score, hasHwagi, hyung) {
          if (hasHwagi && hyung >= 3) return 'D';
          if (score >= 8) return 'A+';
          if (score >= 5) return 'A';
          if (score >= 2) return 'B+';
          if (score >= 0) return 'B';
          if (score >= -2) return 'C+';
          return 'C';
        }
        function zwDahanBar(grade) {
          var fill = grade === 'A+' || grade === 'A' ? 5 : (grade === 'B+' || grade === 'B' ? 4 : (grade === 'D' ? 2 : 3));
          return '<span style="letter-spacing:1px;color:#facc15;">'+('█████'.slice(0, fill))+'</span><span style="letter-spacing:1px;color:#475569;">'+('█████'.slice(0, 5 - fill))+'</span>';
        }
        function zwDahanListText(list, fallback) {
          return (list && list.length) ? list.slice(0, 5).join('·') : fallback;
        }
        function zwDahanSectionCard(title, body) {
          return '<div style="background:rgba(15,23,42,0.55);border:1px solid rgba(148,163,184,0.18);border-radius:9px;padding:10px 11px;min-width:0;">'
            +'<div style="color:#fde68a;font-size:0.78rem;font-weight:900;margin-bottom:5px;">'+title+'</div>'
            +'<div style="color:#dbeafe;font-size:0.77rem;line-height:1.66;">'+body+'</div>'
          +'</div>';
        }
        function zwDahanBuildSections(ctx) {
          var mainText = zwDahanListText(ctx.main, '공궁');
          var auxText = zwDahanListText(ctx.aux, '보조성 약함');
          var badText = zwDahanListText(ctx.bad, '강한 흉성 압박 약함');
          var hwarok = ctx.sihua['화록'];
          var hwagi = ctx.sihua['화기'];
          var palaceFocus = (ZW_FLOW_PALACE_THEME[ctx.dh.palaceName] || {}).focus || ctx.theme.kw;
          return {
            overview: ctx.dh.startAge+'~'+ctx.dh.endAge+'세 '+ctx.dh.palaceName+' 대한은 '+mainText+' 주성이 '+ctx.theme.kw+' 흐름을 열어 주는 10년입니다. 궁간 '+ZW_DAHAN_GAN_LABEL[ctx.gan]+'의 사화는 화록 '+zwDahanSihuaText(hwarok)+', 화기 '+zwDahanSihuaText(hwagi)+'로 드러나며, '+ctx.sambang.keyActivation+'가 삶의 실제 무대를 강하게 움직입니다. 이 시기는 단순한 길흉보다 무엇을 확장하고 무엇을 보호할지 분명히 정할수록 운의 밀도가 깊어집니다.',
            career_study: '직업·학업에서는 '+palaceFocus+'이 핵심 주제입니다. 주성 '+mainText+'은 역할의 방향을, 보조성 '+auxText+'은 귀인과 협업의 통로를 뜻합니다. 화권·화과가 닿은 궁은 발표, 시험, 직책, 평판 관리에 유리하므로 결과물을 기록으로 남기는 전략이 좋습니다.',
            wealth: '재물 흐름은 화록의 도착 궁인 '+(hwarok ? hwarok.palaceName : '미배치 궁')+'을 중심으로 열립니다. 재백궁·관록궁·전택궁이 함께 자극되면 수입, 성과, 고정자산을 한 묶음으로 관리해야 복이 남습니다. 흉성 '+badText+'가 보이면 큰 지출보다 현금흐름 방어가 먼저입니다.',
            relationship: '관계와 파트너십은 '+ctx.dh.palaceName+'의 성격을 통해 드러납니다. '+ctx.theme.kw+'가 강해지는 동안 약속, 역할, 감정 경계를 선명하게 정해야 합니다. 화기가 '+(hwagi ? hwagi.palaceName : '미배치 궁')+'으로 들어가므로 계약, 동업, 가까운 관계의 오해는 기록과 확인을 거쳐 풀어야 합니다.',
            health: '컨디션은 흉성 '+badText+'와 화기의 위치를 함께 봅니다. 과로, 수면 부족, 감정 누적이 먼저 신호로 오기 쉽고, 질액궁이나 복덕궁이 압박되면 회복 루틴을 앞당겨야 합니다. 일정에 휴식 여백을 고정하면 대한의 부담이 크게 낮아집니다.',
            turning_point: '전환점은 대한 중반과 후반에 강해집니다. '+ctx.keyYears[0].label+'에는 '+ctx.keyYears[0].event+' 흐름이 열리고, '+ctx.keyYears[1].label+'에는 '+ctx.keyYears[1].event+' 흐름이 누적됩니다. 이 두 시점은 확장과 정리를 동시에 판단해야 하는 분기점입니다.',
            strategy: ['핵심 궁 '+ctx.dh.palaceName+'의 주제를 3년 단위 목표로 나누고 결과물을 숫자와 문서로 남기세요.', '화록이 닿은 '+(hwarok ? hwarok.palaceName : '궁')+' 영역은 반복 수익·평판·관계 자산으로 전환하세요.', '삼방사정에서 강한 궁을 우선순위로 두고 약한 궁은 지출·관계·회복 방어선부터 세우세요.'],
            caution: ['화기가 닿은 '+(hwagi ? hwagi.palaceName : '궁')+' 문제를 감정적으로 밀어붙이면 손실이 커질 수 있습니다.', '흉성 '+badText+'가 강한 시기에는 무리한 확장, 불투명한 계약, 충동 지출을 피하세요.', '좋은 흐름이 와도 검증 없는 동업·보증·과속 투자로 복을 흩뜨리지 마세요.']
          };
        }
        var dahanTimelineHtml = '';
        var dahanTimelinePreviewHtml = '';
        var dahanTimelineFullHtml = '';
        if (pd.daHanList && pd.daHanList.length > 0) {
          pd.daHanList.forEach(function(dh, dhIdx) {
            var dhRawStars = pd.stars[dh.idx];
            var dhMain = extractMains(dhRawStars);
            var dhAux = extractAux(dhRawStars);
            var dhBad  = extractBad(dhRawStars);
            var dhTheme = PALACE_DAHAN_THEME[dh.palaceName] || {icon:'🔮',kw:'고유한 운명 흐름의 구간'};
            var dahanGan = zwDahanGan(dh);
            var dahanSihua = zwDahanBuildSihua(dahanGan);
            var sambang = zwDahanSambangSajeong(dh.idx, dahanSihua);
            var hasHwagi = !!(dahanSihua['화기'] && dahanSihua['화기'].palaceIdx >= 0);
            var hasHwaroc = !!(dahanSihua['화록'] && dahanSihua['화록'].palaceIdx >= 0);
            var momentumScore = (dhMain.length * 2) + (dhAux.length) + (hasHwaroc ? 3 : 0) + sambang.gil - (dhBad.length * 2) - (hasHwagi ? 3 : 0) - sambang.hyung;
            var grade = zwDahanGrade(momentumScore, hasHwagi, dhBad.length + sambang.hyung);
            var borderCol = ZW_DAHAN_GRADE_COLOR[grade] || '#A78BFA';
            var bgCol = grade === 'D' ? 'rgba(248,113,113,0.08)' : (grade === 'A+' || grade === 'A' ? 'rgba(244,200,66,0.08)' : 'rgba(255,255,255,0.025)');
            var isCurrentDahan = currentKoreanAge > 0 && currentKoreanAge >= Number(dh.startAge) && currentKoreanAge <= Number(dh.endAge);
            var headline = dhTheme.icon+' '+dh.palaceName+' 대한, '+(dhMain[0] || '공궁')+'이 여는 '+dhTheme.kw;
            var keyYears = [
              { label:_sajuEngineText("se_20856_prop_label"), event:(dahanSihua['화록'] ? dahanSihua['화록'].palaceName+' 화록이 기회와 수입 채널을 여는 시점입니다.' : '초기 기반이 잡히며 방향을 선명하게 정하는 시점입니다.') },
              { label:_sajuEngineText("se_20857_prop_label"), event:(dahanSihua['화기'] ? dahanSihua['화기'].palaceName+' 화기의 누적 과제를 정리해야 하는 시점입니다.' : '성과와 관계 구조를 재정렬해 다음 구간을 준비하는 시점입니다.') }
            ];
            var sections = zwDahanBuildSections({
              dh:dh,
              gan:dahanGan,
              main:dhMain,
              aux:dhAux,
              bad:dhBad,
              theme:dhTheme,
              sihua:dahanSihua,
              sambang:sambang,
              keyYears:keyYears
            });
            var strategyHtml = sections.strategy.map(function(item){ return '<li>'+zwFlowEsc(item)+'</li>'; }).join('');
            var cautionHtml = sections.caution.map(function(item){ return '<li>'+zwFlowEsc(item)+'</li>'; }).join('');
            var dahanItemHtml =
              '<details '+(isCurrentDahan ? 'open ' : '')+'style="padding:0;border-left:4px solid '+borderCol+';background:'+bgCol+';border-radius:0 10px 10px 0;margin-bottom:10px;overflow:hidden;box-shadow:0 10px 22px rgba(0,0,0,0.18);" data-daehan-index="'+(dhIdx + 1)+'" data-current="'+(isCurrentDahan ? 'true' : 'false')+'">'
                +'<summary style="list-style:none;cursor:pointer;padding:13px 14px;">'
                  +'<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">'
                    +'<div style="min-width:0;">'
                      +'<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:6px;">'
                        +'<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:'+borderCol+'22;border:1px solid '+borderCol+'88;color:'+borderCol+';font-size:0.72rem;font-weight:900;">'+grade+'</span>'
                        +'<span style="color:#fbbf24;font-size:0.84rem;font-weight:900;">'+(dhIdx + 1)+'대한 · '+dh.startAge+'~'+dh.endAge+'세</span>'
                        +(isCurrentDahan ? '<span style="color:#86efac;font-size:0.72rem;font-weight:900;">현재 대한</span>' : '')
                      +'</div>'
                      +'<div style="color:#f8fafc;font-size:0.96rem;font-weight:900;line-height:1.45;">📌 '+zwFlowEsc(headline)+'</div>'
                      +'<div style="color:#c4b5fd;font-size:0.76rem;line-height:1.65;margin-top:6px;">🔑 궁간: '+zwFlowEsc(ZW_DAHAN_GAN_LABEL[dahanGan] || dahanGan)+' · 주성: '+zwFlowEsc(zwDahanListText(dhMain, '공궁'))+' · 지지: '+zwFlowEsc(dh.zhi || '-')+'</div>'
                      +'<div style="color:#dbeafe;font-size:0.76rem;line-height:1.65;margin-top:5px;">⭐ 길흉 지수: '+zwDahanBar(grade)+' '+zwFlowEsc(sambang.luck)+' · '+zwFlowEsc(sambang.keyActivation)+'</div>'
                    +'</div>'
                    +'<span style="color:#93c5fd;font-size:0.72rem;font-weight:900;padding-top:3px;">자세히 보기</span>'
                  +'</div>'
                +'</summary>'
                +'<div style="padding:0 14px 14px;">'
                  +'<div style="border-top:1px solid rgba(148,163,184,0.18);padding-top:11px;margin-top:-2px;">'
                    +'<div style="color:#fde68a;font-size:0.8rem;font-weight:900;margin-bottom:6px;">사화 흐름</div>'
                    +'<div style="margin-bottom:9px;">'+zwDahanSihuaTags(dahanSihua)+'</div>'
                    +'<p style="font-size:0.79rem;color:#e2e8f0;line-height:1.72;margin:0 0 10px;">'+zwFlowEsc(sections.overview)+'</p>'
                    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:9px;margin-bottom:10px;">'
                      +zwDahanSectionCard('💼 직업/학업', zwFlowEsc(sections.career_study))
                      +zwDahanSectionCard('💰 재물', zwFlowEsc(sections.wealth))
                      +zwDahanSectionCard('🤝 관계', zwFlowEsc(sections.relationship))
                      +zwDahanSectionCard('❤️ 건강', zwFlowEsc(sections.health))
                      +zwDahanSectionCard('🔀 전환점', zwFlowEsc(sections.turning_point))
                      +zwDahanSectionCard('🎯 핵심 전략', '<ol style="margin:0;padding-left:17px;">'+strategyHtml+'</ol>')
                      +zwDahanSectionCard('⚠️ 주의', '<ol style="margin:0;padding-left:17px;">'+cautionHtml+'</ol>')
                    +'</div>'
                    +'<div style="background:rgba(2,6,23,0.35);border:1px solid rgba(125,211,252,0.18);border-radius:9px;padding:10px 11px;">'
                      +'<div style="color:#93c5fd;font-size:0.78rem;font-weight:900;margin-bottom:5px;">🗓 주목할 시점</div>'
                      +'<div style="font-size:0.76rem;color:#dbeafe;line-height:1.66;">· '+zwFlowEsc(keyYears[0].label)+': '+zwFlowEsc(keyYears[0].event)+'<br>· '+zwFlowEsc(keyYears[1].label)+': '+zwFlowEsc(keyYears[1].event)+'</div>'
                    +'</div>'
                  +'</div>'
                +'</div>'
              +'</details>';
            dahanTimelineFullHtml += dahanItemHtml;
            if (dhIdx === currentDahanIndex || dhIdx === currentDahanIndex + 1) dahanTimelinePreviewHtml += dahanItemHtml;
          });
        }
        if (dahanTimelineFullHtml) {
          dahanTimelineHtml = '<div style="background:rgba(2,6,23,0.34);border:1px solid rgba(110,231,183,0.20);border-radius:10px;padding:10px 11px;margin-bottom:10px;">'
              +'<div style="color:#6ee7b7;font-size:0.82rem;font-weight:900;margin-bottom:5px;">핵심 대한 요약</div>'
              +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:7px;color:#dbeafe;font-size:0.74rem;line-height:1.55;">'
                +'<span>'+zwFlowEsc(dahanPreviewLabel)+'</span>'
                +'<span>'+zwFlowEsc(dahanNextLabel)+'</span>'
              +'</div>'
            +'</div>'
            +dahanTimelinePreviewHtml
            +'<details style="background:rgba(15,23,42,0.48);border:1px solid rgba(148,163,184,0.18);border-radius:10px;padding:0;margin-top:10px;overflow:hidden;">'
              +'<summary style="list-style:none;cursor:pointer;padding:12px 13px;color:#c4b5fd;font-size:0.82rem;font-weight:900;">전체 12단계 타임라인 펼치기</summary>'
              +'<div style="padding:0 11px 11px;">'+dahanTimelineFullHtml+'</div>'
            +'</details>';
        }
        function zwDahanPremiumShellHtml(bodyHtml) {
          return zwBasicPaidGateHtml('ziwei_decade_luck', 50, '대한(大限) 인생 타임라인', '현재 대한과 다음 대한, 전체 12단계 흐름을 엽니다.', bodyHtml, '#a78bfa', 'ziwei.decadeLuck')
            .replace('data-cd-marker="ziwei-basic-paid-gate-v20260615"', 'data-cd-marker="ziwei-basic-paid-gate-v20260615" data-zw-daehan-gate="ziwei-daehan-common-paid-gate-v20260629"');
        }
        var sec_dahan = '<div data-cd-marker="'+ZW_DAHAN_TIMELINE_MARKER+'" style="background:rgba(15,15,30,0.8);padding:18px;border-radius:10px;margin-bottom:20px;border:1px solid rgba(139,92,246,0.25);">'
          +'<h2 style="color:#6EE7B7;font-size:1.2rem;margin-top:0;border-bottom:1px solid rgba(110,231,183,0.3);padding-bottom:8px;">⏳ 대한(大限) 12단계 타임라인</h2>'
          +'<p style="font-size:0.78rem;color:#94a3b8;margin:0 0 12px;line-height:1.65;">현재 대한과 다음 대한을 먼저 보여주고, 전체 12단계는 접어서 확인할 수 있습니다.</p>'
          +zwDahanPremiumShellHtml(dahanTimelineHtml)
        +'</div>';

        // ── 인생의 3대 변곡점 (항상 3개 산출): 대한궁·성계·사화·차성을 함께 계량 ──
        var pivotCandidates = [];
        var zwPivotPalaceWeight = { '명궁':8, '관록궁':8, '재백궁':8, '부부궁':7, '천이궁':7, '전택궁':6, '복덕궁':5, '질액궁':5, '노복궁':5, '자녀궁':4, '부모궁':4, '형제궁':4 };
        var zwPivotPalaceFocus = {
          '명궁':'자기 정체성, 이름값, 삶의 방향을 새로 세우는 자리',
          '부모궁':'윗사람, 제도, 문서, 보호 구조와의 관계가 재편되는 자리',
          '복덕궁':'마음의 그릇, 회복력, 장기 루틴과 내면의 평안이 운을 좌우하는 자리',
          '전택궁':'주거, 부동산, 가족 기반, 장기 자산의 뿌리를 조정하는 자리',
          '관록궁':'직업 권한, 성취, 조직 내 위치와 사회적 책임이 응축되는 자리',
          '노복궁':'팀, 고객, 동료, 협업망과 인맥의 질이 운세를 가르는 자리',
          '천이궁':'이동, 외부 무대, 해외, 시장 확장과 대외 평판이 열리는 자리',
          '질액궁':'컨디션 신호, 소진, 생활 리듬, 회복 대응력이 드러나는 자리',
          '재백궁':'수입 경로, 현금흐름, 투자와 지출의 구조가 바뀌는 자리',
          '자녀궁':'창작물, 후배, 프로젝트 산출물, 다음 세대와의 연결이 살아나는 자리',
          '부부궁':'배우자, 동업자, 계약, 일대일 관계의 약속이 시험받는 자리',
          '형제궁':'형제, 가까운 동료, 경쟁자, 초기 네트워크와 역할 경계가 재정리되는 자리'
        };
        var zwPivotCareerMap = {
          '명궁':'개인 브랜드와 대표 역할을 분명히 세우십시오. 이름을 걸고 나설 일과 뒤에서 도울 일을 구분하면 명예가 오래 갑니다.',
          '부모궁':'문서, 심사, 자격, 윗선 승인 흐름이 성패를 좌우합니다. 근거 자료를 정돈하고 공식 절차를 먼저 통과시키는 편이 유리합니다.',
          '복덕궁':'과로로 밀어붙이기보다 집중 가능한 생활 리듬을 만드는 것이 성취의 열쇠입니다. 오래 가는 루틴이 곧 실력으로 굳어집니다.',
          '전택궁':'고정 기반을 안정시키는 선택이 직업운까지 받쳐줍니다. 사무공간, 거주지, 장비, 장기 계약을 현실적으로 점검하십시오.',
          '관록궁':'직함보다 실제 권한과 책임 범위를 명확히 해야 합니다. 승진, 독립, 직무 전환은 성과 지표와 역할 경계를 함께 확정할 때 길합니다.',
          '노복궁':'혼자 해결하려는 습관을 줄이고 핵심 협력자를 선별하십시오. 팀의 수준을 높이면 본인의 사회적 위치도 함께 상승합니다.',
          '천이궁':'외부 발표, 강의, 영업, 해외·온라인 채널이 살아납니다. 익숙한 울타리 밖에서 이름을 알릴수록 판이 커집니다.',
          '질액궁':'무리한 속도는 성취를 깎습니다. 회복 루틴과 업무 강도를 함께 설계해야 긴 경주에서 밀리지 않습니다.',
          '재백궁':'수익 모델을 한 줄로 설명할 수 있어야 합니다. 돈이 들어오는 경로와 회수 시점을 명확히 잡으면 일이 곧 자산이 됩니다.',
          '자녀궁':'콘텐츠, 상품, 후배 양성, 신규 프로젝트가 성취의 씨앗입니다. 작게 시작해도 완성도와 반복성이 중요합니다.',
          '부부궁':'파트너십, 동업, 고객 계약에서 성취가 열립니다. 단, 역할 분담과 책임 조항을 문서로 남겨야 관계가 운을 돕습니다.',
          '형제궁':'가까운 동료와의 경쟁·협력이 동시에 강해집니다. 초기 네트워크의 기대치를 조율하면 기회가 분산되지 않습니다.'
        };
        var zwPivotWealthMap = {
          '명궁':'평판과 신뢰가 재물의 입구입니다. 자기 이름으로 받는 일은 단가를 낮추지 말고, 과시 지출은 줄이십시오.',
          '부모궁':'지원금, 보조금, 상속성 자원, 제도권 혜택을 점검할 때입니다. 서류 누락과 세무 리스크를 특히 조심해야 합니다.',
          '복덕궁':'재물은 급등보다 안정적 축적에 가깝습니다. 스트레스성 소비를 줄이고 자동 저축·보험·회복 예산을 분리하십시오.',
          '전택궁':'부동산, 보증금, 가족 자산, 장기 거주 비용이 핵심입니다. 큰 계약은 감정가보다 유지비와 현금흐름을 먼저 보십시오.',
          '관록궁':'직업 성과가 곧 수입으로 이어지는 구간입니다. 성과급, 승진, 계약 단가를 협상하되 책임 증가분도 함께 계산하십시오.',
          '노복궁':'인맥을 통한 수입이 열리지만 공동 비용도 늘어납니다. 정산 기준과 수익 배분표가 없으면 좋은 인연도 부담이 됩니다.',
          '천이궁':'외부 시장, 이동, 해외, 플랫폼 수익이 살아납니다. 확장 비용은 단계별로 투입하고 환율·물류·계약 조건을 확인하십시오.',
          '질액궁':'컨디션 관리 비용과 업무 손실 비용을 동시에 줄여야 합니다. 예방성 지출은 아끼지 말고, 고위험 투자는 보류가 좋습니다.',
          '재백궁':'현금흐름이 가장 직접적으로 움직입니다. 수입원 다변화는 길하지만 단기 차입과 무리한 레버리지는 삼가십시오.',
          '자녀궁':'작품, 상품, 교육, 후배·자녀 관련 지출입이 커집니다. 초기 투자는 작게, 반복 판매 구조를 만들 때 재물이 붙습니다.',
          '부부궁':'공동 자금, 배우자·동업자 재정, 계약금이 민감합니다. 함께 버는 돈일수록 권한과 책임을 분리해야 안전합니다.',
          '형제궁':'가까운 사람과 돈거래가 생기기 쉽습니다. 소액이라도 조건을 남기고, 경쟁적 소비를 경계하십시오.'
        };
        var zwPivotPhaseCopy = {
          chance:{ name:'도약', icon:'✦', tone:'chance', typeText:'도약 국면', accent:'#34d399', rgb:'52,211,153' },
          crisis:{ name:'수호', icon:'△', tone:'crisis', typeText:'수호 국면', accent:'#fb7185', rgb:'251,113,133' },
          turn:{ name:'재정렬', icon:'◇', tone:'turn', typeText:'재정렬 국면', accent:'#f59e0b', rgb:'245,158,11' }
        };
        function zwPivotJoin(list, fallback) {
          return list && list.length ? list.join(' · ') : fallback;
        }
        function zwPivotFamily(mainStars) {
          var names = mainStars || [];
          if (names.some(function(n){ return ['칠살','파군','탐랑'].indexOf(n) >= 0; })) return { name:'살파랑 계열', desc:'낡은 구조를 깨고 새 길을 여는 변혁성' };
          if (names.some(function(n){ return ['자미','천부','무곡','염정'].indexOf(n) >= 0; })) return { name:'자부염무 계열', desc:'권한, 조직, 재정, 책임을 다루는 통치성' };
          if (names.some(function(n){ return ['천기','태음','천동','천량'].indexOf(n) >= 0; })) return { name:'기월동량 계열', desc:'지혜, 조정, 보호, 내면 설계를 중시하는 안정성' };
          if (names.some(function(n){ return ['태양','거문','문창','문곡'].indexOf(n) >= 0; })) return { name:'명성·언어 계열', desc:'말, 문서, 발표, 평판으로 판을 움직이는 표현성' };
          return { name:'복합 성계', desc:'주성보다 보조성, 사화, 궁위의 상호작용이 운을 결정하는 구조' };
        }
        function zwPivotAgeStage(age) {
          if (age < 20) return { short:'10대 · 기초 형성', detail:'학업, 보호자, 자아 발견의 흐름이 이후 선택의 밑바탕을 만듭니다.' };
          if (age < 30) return { short:'20대 · 진입과 실험', detail:'첫 사회 진입, 독립, 인연, 방향 선택이 겹치며 운명의 결을 시험합니다.' };
          if (age < 40) return { short:'30대 · 기반 확립', detail:'직업 기반, 파트너십, 자산의 뼈대가 자리 잡아 이후 10년의 무게를 정합니다.' };
          if (age < 50) return { short:'40대 · 전성기와 재조정', detail:'성과와 책임이 동시에 커지며, 오래 끌고 갈 구조와 버릴 구조가 갈립니다.' };
          if (age < 60) return { short:'50대 · 결실과 재배치', detail:'축적한 성취를 안정 자산과 후반 인생의 기반으로 옮기는 시기입니다.' };
          if (age < 70) return { short:'60대 · 수확과 전수', detail:'역할을 나누고 경험을 전수하며, 삶의 의미와 자산을 정돈하는 흐름입니다.' };
          return { short:'70대+ · 완성과 유산', detail:'관계, 지식, 자산, 정신적 유산을 맑게 남기는 일이 중심 과제가 됩니다.' };
        }
        function zwPivotTypeFromSignals(hwagiList, hwarokList, hwakwonList, hwakwaList, badList, auxList) {
          if (hwagiList.length || badList.length >= 2) return 'crisis';
          if (hwarokList.length || hwakwonList.length || hwakwaList.length || auxList.length >= 2) return 'chance';
          return 'turn';
        }
        if (pd.daHanList && pd.daHanList.length) {
          pd.daHanList.forEach(function(dh, dhOrderIdx) {
            var dhStars = pd.stars[dh.idx] || {main:[],aux:[],bad:[],borrowedMain:[]};
            var dhMainMeta = extractMainMeta(dhStars);
            var dhMain = dhMainMeta.map(function(m){ return m.name; });
            var dhBorrowed = dhMainMeta.filter(function(m){ return m.isBorrowed; }).map(function(m){ return m.name; });
            var dhAux = uniqueList(extractAux(dhStars));
            var dhBad = uniqueList(extractBad(dhStars));

            var dhSihua = [];
            if (pd.sihuaData) {
              for (var shS2 in pd.sihuaData) {
                if (pd.sihuaData[shS2].palaceIdx === dh.idx) dhSihua.push({star:shS2, info:pd.sihuaData[shS2]});
              }
            }
            var hwagiList  = dhSihua.filter(function(s){ return s.info.type === '화기'; });
            var hwarokList = dhSihua.filter(function(s){ return s.info.type === '화록'; });
            var hwakwonList = dhSihua.filter(function(s){ return s.info.type === '화권'; });
            var hwakwaList = dhSihua.filter(function(s){ return s.info.type === '화과'; });

            var palaceWeight = zwPivotPalaceWeight[dh.palaceName] || 3;
            var starFamily = zwPivotFamily(dhMain);
            var pivotType = zwPivotTypeFromSignals(hwagiList, hwarokList, hwakwonList, hwakwaList, dhBad, dhAux);
            var phaseMeta = zwPivotPhaseCopy[pivotType] || zwPivotPhaseCopy.turn;
            var mainLabel = zwPivotJoin(dhMain, '공궁(空宮)');
            var borrowedLabel = dhBorrowed.length ? ('차성 보정: '+dhBorrowed.join(' · ')) : '차성 보정: 원성 중심';
            var sihuaLabel = dhSihua.length ? dhSihua.map(function(s){ return s.star+' '+s.info.type; }).join(' · ') : '사화 직접 작용 약함';
            var goodSignalCount = hwarokList.length + hwakwonList.length + hwakwaList.length + Math.min(3, dhAux.length);
            var riskSignalCount = hwagiList.length + dhBad.length;
            var impactScore = 18 + palaceWeight * 2;
            impactScore += hwagiList.length * 12;
            impactScore += hwarokList.length * 10;
            impactScore += hwakwonList.length * 9;
            impactScore += hwakwaList.length * 7;
            impactScore += dhBad.length * 4;
            impactScore += dhAux.length * 2;
            impactScore += dhBorrowed.length * 4;
            impactScore += starFamily.name === '살파랑 계열' ? 8 : 0;
            impactScore += starFamily.name === '자부염무 계열' ? 6 : 0;
            impactScore += starFamily.name === '기월동량 계열' ? 5 : 0;

            var activationPercent = Math.max(38, Math.min(92, Math.round(impactScore)));
            var lifeStageInfo = zwPivotAgeStage(dh.startAge);
            var midAge = Math.round((Number(dh.startAge || 0) + Number(dh.endAge || dh.startAge || 0)) / 2);
            var lifeStageLabel = lifeStageInfo.short+' · '+midAge+'세 전후';
            var palaceFocus = zwPivotPalaceFocus[dh.palaceName] || '삶의 한 축을 새로 조정하는 자리';
            var phaseHeadline = pivotType === 'chance'
              ? '길성이 문을 여는 상승 전환'
              : (pivotType === 'crisis' ? '화기와 흉성을 다스리는 수호 전환' : '방향을 다시 세우는 재정렬 전환');
            var headline = dh.palaceName+' '+phaseMeta.name+' - '+phaseHeadline;
            var subline = starFamily.name+' · '+mainLabel+' · '+sihuaLabel;
            var whyText = lifeStageInfo.detail+' 이 대한은 '+dh.palaceName+'을 중심으로 '+palaceFocus+'입니다. '+starFamily.desc+'이 '+mainLabel+' 성계로 드러나고, '+sihuaLabel+' 신호가 겹치므로 작은 선택도 이후의 직업, 재물, 관계 구조에 길게 남습니다.';
            if (dhBorrowed.length) whyText += ' 특히 '+dhBorrowed.join(' · ')+' 차성이 원궁의 빈 곳을 채워, 겉으로 보이는 사건보다 배후의 조정력과 보정력이 강하게 작동합니다.';
            if (hwagiList.length) whyText += ' '+hwagiList.map(function(s){ return s.star; }).join(' · ')+' 화기는 집착과 손실의 문을 함께 열 수 있으니, 빠른 결론보다 검증된 절차가 운을 지킵니다.';
            if (hwarokList.length || hwakwonList.length || hwakwaList.length) whyText += ' 반대로 '+[hwarokList.length?'화록':'' , hwakwonList.length?'화권':'' , hwakwaList.length?'화과':''].filter(Boolean).join('·')+'은 기회를 현실 성과로 굳히는 힘입니다.';

            var actionItems = [];
            if (pivotType === 'chance') {
              actionItems = [
                (zwPivotPalaceFocus[dh.palaceName] || '핵심 과제')+'에 자원과 시간을 집중하고, 동시에 벌인 일을 줄여 상승 탄력을 한곳에 모으십시오.',
                '화록·화권·화과가 비추는 기회는 문서, 일정, 수익 구조로 즉시 고정하십시오. 말로 끝난 약속은 운의 그릇이 되지 못합니다.',
                '성과가 보일 때 일부는 방어 자산으로 돌려놓으십시오. 확장은 회수 장치가 있을 때 오래 갑니다.'
              ];
            } else if (pivotType === 'crisis') {
              actionItems = [
                '중요 계약, 투자, 이직, 동업 결정은 최소 하루를 재우고 다시 보십시오. 화기와 흉성은 서두름 속에서 틈을 만듭니다.',
                '관계와 돈이 섞이는 일은 역할, 책임, 종료 조건을 글로 남기십시오. 선명한 경계가 이 시기의 부적입니다.',
                '피로와 감정이 올라오는 날에는 큰 결정을 미루십시오. 컨디션이 무너진 판단은 실제보다 손실을 키웁니다.'
              ];
            } else {
              actionItems = [
                '지난 3년간 반복된 선택을 정리하고, 남길 역할과 내려놓을 역할을 구분하십시오.',
                '새 방향은 크게 외치기보다 작은 고정 루틴으로 먼저 시험하십시오. 루틴이 자리 잡으면 운도 따라 안정됩니다.',
                '가까운 사람의 기대보다 자신의 명반이 요구하는 중심축을 우선하십시오. 흔들림을 줄이는 것이 첫 승리입니다.'
              ];
            }

            var warningTitle = hwagiList.length
              ? hwagiList.map(function(s){ return s.star; }).join(' · ')+' 화기 경고'
              : (dhBad.length ? dhBad.slice(0,2).join(' · ')+' 흉성 압력 경고' : '과신과 느슨함 경계');
            var warnings = [];
            if (hwagiList.length) warnings.push('화기가 걸린 주제는 손실보다 집착이 먼저 옵니다. 이미 마음이 급해진 결정은 반드시 제삼자의 확인을 받으십시오.');
            if (dhBad.length) warnings.push(dhBad.slice(0,2).join(' · ')+' 압력으로 지연, 충돌, 비용 증가가 생길 수 있습니다. 무리한 일정과 즉흥 지출을 피하십시오.');
            if (!warnings.length) warnings.push('운이 안정적일수록 기준을 낮추기 쉽습니다. 작은 약속, 작은 지출, 작은 피로를 가볍게 넘기지 마십시오.');
            if (dh.palaceName === '부부궁' || dh.palaceName === '\uBD80\uCC98\uAD81') warnings.push('파트너십과 계약은 반드시 조건을 문서화하십시오. 감정적 신뢰만으로 결정하면 후반에 균열이 생깁니다.');
            if (dh.palaceName === '재백궁') warnings.push('수익이 늘어나는 만큼 새 지출도 따라붙습니다. 들어온 돈의 일부는 바로 방어 자금으로 분리하십시오.');
            if (dh.palaceName === '천이궁') warnings.push('이동, 해외, 외부 확장은 좋으나 낯선 규칙을 가볍게 보면 손실이 생깁니다. 계약과 현지 조건을 확인하십시오.');

            var tags = [];
            dhSihua.forEach(function(s){
              tags.push({ label:s.star+' '+s.info.type+' → '+dh.palaceName, tone:s.info.type === '화기' ? 'risk' : 'good' });
            });
            if (!dhSihua.length) tags.push({ label:_sajuEngineText("se_21291_prop_label"), tone:'muted' });
            if (dhBorrowed.length) tags.push({ label:_sajuEngineText("se_21890_prop_label")+' '+dhBorrowed.slice(0,2).join(' · ')+' 보정', tone:'support' });
            if (dhAux.length) tags.push({ label:_sajuEngineText("se_21891_prop_label")+' '+dhAux.slice(0,2).join(' · ')+' 가세', tone:'support' });
            if (dhBad.length) tags.push({ label:_sajuEngineText("se_21892_prop_label")+' '+dhBad.slice(0,2).join(' · ')+' 압박', tone:'risk' });

            var flowSteps = [
              { key:'전조기', text:dh.palaceName+' 주제가 서서히 의식 위로 떠오름' },
              { key:'개문기', text:mainLabel+' 성계가 실제 사건으로 문을 엶' },
              { key:'충돌기', text:(hwagiList.length ? '화기 압박과 선택 부담이 겹침' : '새 선택과 기존 책임이 맞부딪힘') },
              { key:'결실기', text:(pivotType === 'chance' ? '성과와 평판을 회수' : pivotType === 'crisis' ? '손실을 줄이며 구조를 수습' : '새 기준을 확정') },
              { key:'정리기', text:'다음 10년으로 가져갈 인연과 자산을 선별' }
            ];

            pivotCandidates.push({
              key: String(dh.idx)+'_'+String(dhOrderIdx),
              type: pivotType,
              icon: phaseMeta.icon,
              age: dh.startAge+'~'+dh.endAge,
              period: dh.startAge+'-'+dh.endAge,
              title: dh.startAge+'~'+dh.endAge+'세 대한: '+dh.palaceName+' 변곡점',
              palaceName: dh.palaceName,
              headline: headline,
              subline: subline,
              lifeStageLabel: lifeStageLabel,
              coreStars: mainLabel,
              borrowedLabel: borrowedLabel,
              sihuaLabel: sihuaLabel,
              phaseTheme: phaseMeta.name,
              phaseTypeText: phaseMeta.typeText,
              phaseTone: phaseMeta.tone,
              accent: phaseMeta.accent,
              rgb: phaseMeta.rgb,
              activationPercent: activationPercent,
              tags: tags,
              flowSteps: flowSteps,
              whyText: whyText,
              careerStrategy: zwPivotCareerMap[dh.palaceName] || '핵심 역할을 분명히 하고 책임 범위를 정돈하면 성취가 안정됩니다.',
              wealthFlow: zwPivotWealthMap[dh.palaceName] || '돈의 흐름은 큰 승부보다 구조 정리에 달려 있습니다. 수입과 지출의 길목을 분리하십시오.',
              actionItems: actionItems,
              warningTitle: warningTitle,
              warnings: warnings.slice(0,3),
              quote: pivotType === 'chance'
                ? '지금 들어오는 복은 우연이 아니라 준비된 그릇에 내려앉는 별빛입니다. 넓히되, 회수할 길을 먼저 열어두십시오.'
                : (pivotType === 'crisis'
                  ? '위험은 길을 막는 벽이 아니라 경계를 세우라는 천명의 신호입니다. 서두르지 않으면 손실도 지혜가 됩니다.'
                  : '전환기는 크게 외치는 시간이 아니라 중심축을 다시 박는 시간입니다. 조용히 바로잡은 질서가 다음 운을 부릅니다.'),
              score: impactScore,
              palaceWeight: palaceWeight,
              goodSignalCount: goodSignalCount,
              riskSignalCount: riskSignalCount,
              order: dhOrderIdx,
              lifeStage: lifeStageInfo.short,
              lifeCtx: lifeStageInfo.detail
            });
          });
        }

        var selectedPivots = [];
        if (pivotCandidates.length) {
          var bucketSize = Math.ceil(pivotCandidates.length / 3);
          for (var bi=0; bi<3; bi++) {
            var s = bi * bucketSize;
            var e = Math.min(pivotCandidates.length, s + bucketSize);
            if (s >= e) continue;
            var bucket = pivotCandidates.slice(s, e).sort(function(a,b){
              if (b.score !== a.score) return b.score - a.score;
              if (b.palaceWeight !== a.palaceWeight) return b.palaceWeight - a.palaceWeight;
              if (b.riskSignalCount !== a.riskSignalCount) return b.riskSignalCount - a.riskSignalCount;
              return a.order - b.order;
            });
            if (bucket.length) selectedPivots.push(bucket[0]);
          }
          if (selectedPivots.length < 3) {
            var used = Object.create(null);
            selectedPivots.forEach(function(p){ used[p.key] = 1; });
            pivotCandidates
              .slice()
              .sort(function(a,b){
                if (b.score !== a.score) return b.score - a.score;
                if (b.palaceWeight !== a.palaceWeight) return b.palaceWeight - a.palaceWeight;
                return a.order - b.order;
              })
              .forEach(function(c){
                if (selectedPivots.length >= 3) return;
                if (used[c.key]) return;
                used[c.key] = 1;
                selectedPivots.push(c);
              });
          }
          while (selectedPivots.length < 3 && pivotCandidates.length) {
            selectedPivots.push(pivotCandidates[Math.min(selectedPivots.length, pivotCandidates.length - 1)]);
          }
          selectedPivots.sort(function(a,b){ return a.order - b.order; });
        }

        // 토글 함수: 재정의 허용(accordion 갱신 위해 매번 업데이트)
        window._toggleZwPivotCard = function(btn, bodyId) {
          var card = btn.closest ? btn.closest('.zw-pivot-card') : null;
          if (!card) return;
          var wasOpen = card.classList.contains('is-open');
          // 아코디언: 동일 deck 내 열린 카드 모두 닫기
          var deck = card.closest ? card.closest('.zw-pivot-deck') : null;
          var scope = deck || document;
          var openCards = scope.querySelectorAll('.zw-pivot-card.is-open');
          for (var oi = 0; oi < openCards.length; oi++) {
            openCards[oi].classList.remove('is-open');
            var ob = openCards[oi].querySelector('.zw-pivot-toggle');
            if (ob) ob.setAttribute('aria-expanded', 'false');
          }
          // 현재 카드 토글
          if (!wasOpen) {
            card.classList.add('is-open');
            btn.setAttribute('aria-expanded', 'true');
            setTimeout(function() {
              try { card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch(e) {}
            }, 60);
          }
        };

        function zwPivotTagHtml(tag) {
          var tone = tag && tag.tone ? String(tag.tone) : 'muted';
          if (['good','risk','support','muted','turn'].indexOf(tone) < 0) tone = 'muted';
          return '<span class="zw-pv-star-tag '+tone+'">'+zwFlowEsc(tag && tag.label ? tag.label : '')+'</span>';
        }
        var pivotAxisHtml = '';
        if (selectedPivots.length) {
          pivotAxisHtml = '<div class="zw-pivot-axis" aria-label="' + _sajuEngineText("se_22015_attr_aria_label") + '">'
            +'<div class="zw-pivot-axis-track"><span></span><span></span><span></span></div>'
            +'<div class="zw-pivot-axis-points">';
          selectedPivots.slice(0,3).forEach(function(p, i){
            pivotAxisHtml += '<div class="zw-pivot-axis-point" style="--pivot-accent:'+p.accent+';--pivot-rgb:'+p.rgb+';">'
              +'<span class="zw-pivot-axis-dot"></span>'
              +'<b>'+zwFlowEsc(String(Math.round((Number(p.age.split('~')[0]) + Number(p.age.split('~')[1] || p.age.split('~')[0])) / 2)))+'세</b>'
            +'</div>';
          });
          pivotAxisHtml += '</div></div>';
        }
        var pivotHtml = '';
        var pivotStageLabels = ['초년 전환', '중년 전환', '후년 전환'];
        var pivotStageNums = ['1', '2', '3'];
        selectedPivots.slice(0,3).forEach(function(p, i){
          var isDefaultOpen = (i === 0);
          var bc = p.accent || '#f59e0b';
          var bcRgb = p.rgb || '245,158,11';
          var stageLabel = pivotStageLabels[i] || ('변곡점 '+(i+1));
          var stageNum = pivotStageNums[i] || (i+1)+'';
          var cardId = 'zwPivotCard_'+p.key;
          var scoreWidth = p.activationPercent || Math.min(100, Math.round((p.score / 30) * 100));
          var coreStarTags = p.coreStars !== '공궁(空宮)'
            ? p.coreStars.split(' · ').map(function(s){ return '<span class="zw-pv-star-tag support">★ '+zwFlowEsc(s)+'</span>'; }).join('')
            : '<span class="zw-pv-star-tag muted">공궁(空宮)</span>';
          var sihuaTags = (p.tags || []).map(zwPivotTagHtml).join('');
          var phaseRailHtml = '<div class="zw-pv-phase-rail" aria-label="' + _sajuEngineText("se_22041_attr_aria_label") + '">'
            +(p.flowSteps || []).map(function(step){
              return '<div class="zw-pv-phase-step"><b>'+zwFlowEsc(step.key)+'</b><span>'+zwFlowEsc(step.text)+'</span></div>';
            }).join('')
          +'</div>';
          var actionHtml = (p.actionItems || []).map(function(item, idx){
            return '<li class="zw-pv-strategy-item"><span class="zw-pv-strategy-num">'+(idx+1)+'</span><span>'+zwFlowEsc(item)+'</span></li>';
          }).join('');
          var warningHtml = (p.warnings || []).map(function(item){
            return '<div class="zw-pv-warning-line">○ '+zwFlowEsc(item)+'</div>';
          }).join('');
          pivotHtml += '<div class="zw-pivot-card'+(isDefaultOpen ? ' is-open' : '')+'" style="--pivot-accent:'+bc+';--pivot-rgb:'+bcRgb+';">'
            +'<button type="button" class="zw-pivot-toggle" aria-expanded="'+(isDefaultOpen ? 'true' : 'false')+'" onclick="window._toggleZwPivotCard(this, \''+cardId+'\')">'
              +'<div class="zw-pv-card-head">'
                +'<span class="zw-pv-num-badge">'+stageNum+'</span>'
                +'<div class="zw-pv-heading">'
                  +'<span class="zw-pivot-chip">'+zwFlowEsc(stageLabel)+' · '+zwFlowEsc(p.lifeStageLabel)+'</span>'
                  +'<span class="zw-pivot-palace-label">'+zwFlowEsc(p.headline)+'</span>'
                  +'<span class="zw-pivot-type-tag">'+zwFlowEsc(p.subline)+'</span>'
                +'</div>'
                +'<div class="zw-pv-power">'
                  +'<span>발동강도</span>'
                  +'<div class="zw-pv-score-bar"><div class="zw-pv-score-fill" style="width:'+scoreWidth+'%"></div></div>'
                  +'<b>'+scoreWidth+'%</b>'
                  +'<span class="zw-pivot-chevron" aria-hidden="true">▼</span>'
                +'</div>'
              +'</div>'
              +'<div class="zw-pv-star-tags">'+sihuaTags+'</div>'
            +'</button>'
            +'<div id="'+cardId+'" class="zw-pivot-body">'
              +'<div class="zw-pv-section">'
                +'<div class="zw-pv-section-title">핵심 성계와 보정</div>'
                +'<div class="zw-pv-star-tags">'+coreStarTags+'</div>'
                +'<div class="zw-pv-borrowed">'+zwFlowEsc(p.borrowedLabel)+'</div>'
              +'</div>'
              +'<div class="zw-pv-section">'
                +'<div class="zw-pv-section-title">발동 흐름</div>'
                +phaseRailHtml
              +'</div>'
              +'<div class="zw-pv-section">'
                +'<div class="zw-pv-section-title">왜 이 시기가 변곡점인가</div>'
                +'<div class="zw-pv-why">'+zwFlowEsc(p.whyText)+'</div>'
              +'</div>'
              +'<div class="zw-pv-two-col">'
                +'<div class="zw-pv-mini"><b>직업·성취 전략</b><span>'+zwFlowEsc(p.careerStrategy)+'</span></div>'
                +'<div class="zw-pv-mini"><b>재물 흐름</b><span>'+zwFlowEsc(p.wealthFlow)+'</span></div>'
              +'</div>'
              +'<div class="zw-pv-section">'
                +'<div class="zw-pv-section-title">'+zwFlowEsc(p.phaseTheme)+' 실행 전략 3가지</div>'
                +'<ul class="zw-pv-strategy-list">'+actionHtml+'</ul>'
              +'</div>'
              +'<div class="zw-pv-oneline">“'+zwFlowEsc(p.quote)+'”</div>'
              +'<div class="zw-pv-risk">'
                +'<div class="zw-pv-risk-title">△ '+zwFlowEsc(p.warningTitle)+'</div>'
                +warningHtml
              +'</div>'
            +'</div>'
          +'</div>';
        });

        var sec_pivot = '<div class="zw-pivot-section">'
          +'<h2 class="zw-pivot-title">🔱 인생의 3대 변곡점</h2>'
          +'<p class="zw-pivot-sub">사화(四化), 주성, 보조성, 흉성, 차성 교차 분석으로 도출한 삶의 3대 전환 시점입니다. 각 카드는 발동 원리, 직업·재물 전략, 주의할 결정을 함께 보여줍니다.</p>'
          + pivotAxisHtml
          +'<div class="zw-pivot-deck">'
          + pivotHtml
          +'</div>'
          +'</div>';

        var sec4 = '';

        function zwReadingPanel(title, eyebrow, bodyHtml, open, accent, preview) {
          return '<details '+(open ? 'open ' : '')+'class="zw-reading-panel fr-report-panel">'
            +'<summary><span class="fr-report-panel-heading"><strong>'+zwFlowEsc(title)+'</strong>'
            +'<span class="fr-report-panel-meta">'+zwFlowEsc(eyebrow)+'</span>'
            +(preview ? '<span class="fr-report-panel-preview">'+zwFlowEsc(preview)+'</span>' : '')
            +'</span><span data-zw-panel-state>'+(open ? '접기' : '펼치기')+'</span></summary>'
            +'<div class="fr-report-panel-body">'+bodyHtml+'</div></details>';
        }

        function zwBasicPaidFeatureUnlocked(featureKey) {
          var key = String(featureKey || '').trim();
          if (!key) return false;
          try {
            if (typeof window.isTileKeyUnlocked === 'function' && window.isTileKeyUnlocked(key)) return true;
          } catch (_) {}
          try {
            if (window.unlockedFeatureMap && window.unlockedFeatureMap[key] === true) return true;
          } catch (_) {}
          return false;
        }
        function zwSetBasicPaidGateUnlocked(shell, unlocked) {
          if (!shell) return;
          // 잠긴 동안에는 본문이 만들어진 적이 없다 — 클래스 토글만으로는 빈 화면이 된다.
          if (unlocked) _cdFillGateBodyIfPending(shell, shell.getAttribute('data-unlock-key'));
          shell.classList.toggle('cd-section-gate--unlocked', !!unlocked);
          shell.classList.toggle('cd-section-gate--checking', false);
          shell.classList.toggle('cd-section-gate--error', false);
          shell.style.maxHeight = unlocked ? 'none' : '174px';
          shell.style.minHeight = unlocked ? '0' : '174px';
          var body = shell.querySelector('.cd-section-gate__body');
          if (body) {
            body.setAttribute('aria-hidden', unlocked ? 'false' : 'true');
            try { body.inert = !unlocked; } catch (_) {}
          }
          var msg = shell.querySelector('[data-zw-paid-gate-message]');
          if (msg) msg.textContent = unlocked ? '잠금 해제됨' : '';
        }
        // 잠금 상태의 단일 소유자는 index.html의 unlockedFeatureMap이다.
        // 이 게이트는 수동적 뷰: 초기 렌더 시 현재 상태를 반영하고, 이후에는 해금 이벤트로만
        // 해금 방향 갱신한다. 두 종류가 발행된다 — cd:unlocks-changed(결제 확정/사주 스냅샷 싱크,
        // index.html)와 cd:tile-locks-updated(부팅 직후 타일락 서버 싱크, index-inline-runtime.js).
        // 후자만 오는 경로가 있어서 둘 다 듣지 않으면 해금됐는데 게이트가 잠긴 채 남는다.
        // 재잠금(로그아웃 등)은 index.html의 applyDynamicPaidContentGates가 담당한다.
        function zwBindBasicPaidGates(root) {
          var host = root || document;
          host.querySelectorAll('.zw-basic-paid-gate').forEach(function(shell) {
            if (shell.getAttribute('data-bound') === 'true') return;
            shell.setAttribute('data-bound', 'true');
            var key = String(shell.getAttribute('data-unlock-key') || '').trim();
            zwSetBasicPaidGateUnlocked(shell, zwBasicPaidFeatureUnlocked(key));
          });
          if (!window.__zwBasicPaidGateEventsBound) {
            window.__zwBasicPaidGateEventsBound = true;
            var onUnlocksChanged = function() {
              document.querySelectorAll('.zw-basic-paid-gate').forEach(function(shell) {
                if (shell.classList.contains('cd-section-gate--unlocked')) return;
                var k = String(shell.getAttribute('data-unlock-key') || '').trim();
                if (k && zwBasicPaidFeatureUnlocked(k)) zwSetBasicPaidGateUnlocked(shell, true);
              });
            };
            window.addEventListener('cd:unlocks-changed', onUnlocksChanged);
            window.addEventListener('cd:tile-locks-updated', onUnlocksChanged);
          }
        }
        function zwBasicPaidGateHtml(featureKey, cost, title, desc, bodyHtml, accent, contentKey) {
          var color = accent || '#c4b5fd';
          var key = String(featureKey || '').trim();
          var safeId = 'zwBasicPaidGate_' + key.replace(/[^a-z0-9_]/gi, '_');
          return '<div class="cd-section-gate zw-basic-paid-gate" id="'+safeId+'" data-cd-marker="ziwei-basic-paid-gate-v20260615" data-zw-lock-marker="ziwei-basic-lock-sync-v20260625" data-unlock-key="'+zwFlowEsc(key)+'" style="position:relative;min-height:174px;max-height:174px;border-radius:12px;overflow:hidden;">'
            +'<div class="cd-section-gate__overlay" style="gap:7px;padding:14px 13px;background:linear-gradient(180deg,rgba(10,4,28,0.86),rgba(9,6,28,0.95));">'
              +'<div class="cd-section-gate__icon" style="font-size:1.45rem;">🔒</div>'
              +'<p class="cd-section-gate__title" style="font-size:0.94rem;">'+zwFlowEsc(title)+'</p>'
              +'<p class="cd-section-gate__desc" style="max-width:300px;font-size:0.74rem;-webkit-line-clamp:2;">'+zwFlowEsc(desc)+'</p>'
              +'<span class="cd-section-gate__badge">'+(cost * 100).toLocaleString('ko-KR')+'원 영구 해금</span>'
              +'<button type="button" class="cd-section-gate__btn" data-action="unlockPremiumFeature" data-unlock-key="'+zwFlowEsc(key)+'"'+(contentKey ? ' data-content-key="'+zwFlowEsc(contentKey)+'"' : '')+' data-service-key="ziwei" data-unlock-cost="'+cost+'" style="min-height:36px;padding:9px 14px;font-size:0.78rem;">'+(cost * 100).toLocaleString('ko-KR')+'원으로 열기</button>'
              +'<div data-zw-paid-gate-message style="min-height:14px;color:'+color+';font-size:0.68rem;font-weight:900;"></div>'
            +'</div>'
            +'<div class="cd-section-gate__body" style="max-height:none;">'+_cdGateBody(key, bodyHtml)+'</div>'
          +'</div>';
        }

        return {
          ziwei_decade_luck: {
            html: dahanTimelineHtml,
            decadeHtml: '<div style="background:rgba(15,23,42,0.62);border:1px solid rgba(125,211,252,0.22);border-radius:11px;padding:13px 14px;">'
                +'<h3 style="margin:0 0 8px;color:#93c5fd;font-size:1rem;">⏳ '+zwFlowEsc(decadeTitle)+'</h3>'
                +'<p style="font-size:0.78rem;color:#cbd5e1;line-height:1.65;margin:0 0 8px;">이 10년은 월운보다 깊게 작동하는 대한의 바닥 기류입니다. 기회는 반복되는 궁에서 열리고, 위험은 같은 사화가 겹칠 때 선명해집니다.</p>'
                +decadeSummaryHtml
                +decadeRowsHtml
              +'</div>'
          },
          ziwei_twelve_palaces: sec2,
          ziwei_love_deep: sec_love_compat_spread + sec_love + buildZwSpouseDeepHtml(pd),
          ziwei_symbolic_layer: sec_olympus_ziwei,
          ziwei_life_yearly_flow: buildZwGrandLifeDeepHtml(pd) + sec_grand + sec_ziwei_flow + buildZwYearlyFlowDeepHtml(pd)
        };
}
// 화면(renderZiwei)과 같은 명반·같은 기본 궁(명궁)으로 상세 패널을 계산한다. 출생은 report.js 가 심은 window._ziweiBirth 다.
function renderZiweiPaidSections() {
  var birth = window._ziweiBirth || { year: 0, month: 1, day: 1, hour: 12, minute: 0 };
  var pd = calcZiweiPalaces(birth.year, birth.month, birth.day, birth.hour, birth.minute);
  var defaultIdx = pd.palacesByIndex.indexOf('명궁');
  if (defaultIdx < 0) defaultIdx = 0;
  return renderZiweiPaidBodies(defaultIdx, pd.palacesByIndex[defaultIdx], pd.stars[defaultIdx], pd, { clickOnly: false, targetId: 'zwComprehensiveReport', showClose: true, showRadar: false, scroll: false });
}

// ── 자미두수 궁합(compat-ziwei-compatibility, 회당 결제) 생성기 ──
// js/saju-engine.js 의 window._runZwCompatibilityCore(renderZiwei 안) 계산 본문을 줄 그대로 옮겼다. 바뀐 곳은 DOM 입력뿐이다:
//   - 상대 생년월일·시각·도시는 화면 입력(zwCompatBirthDate·zwCompatBirthTime·zwCompatBirthCity 의 선택 옵션) 대신 input 으로 받는다
//     (cityBaseTz 한 줄 — 원본은 옵션의 data-base-tz 를 읽는다. 화면 옵션은 data-base-tz 와 data-tz 가 같은 값이다).
//   - 결과는 #zwCompatResult 대신 지역 outEl 에 그리고, 보정 안내 칸(#zwCompatTimeCorrectionInfo)·목차 링크·보관·LLM 연결은 화면이 맡는다.
//   - 원본이 그 앞에서 부르는 KASI 날짜 문맥(resolveKasiDateContextSafe)은 양력 입력을 같은 양력 날짜로 돌려주므로 서버는 부르지 않는다.
// 내 명반은 report.js 가 심은 window._ziweiBirth(화면 renderZiwei 와 같은 진태양시 보정 시각)·GENDER 로 계산한다. 상대 명반도
// 원본처럼 같은 전역 GENDER 로 계산된다(상대 성별 입력은 보정 안내 문구에만 쓰인다).
function renderZiweiCompatPaid(input) {
      var outEl = { innerHTML: '' };
      var bDate = input.bDate;
      var bTime = input.bTime;
      var cityTz = input.city.timezone;
      var cityLong = input.city.longitude;
      var cityLat = input.city.latitude;
      var cityLabel = input.city.name;
      var dParts = bDate.split('-');
      var tParts = bTime.split(':');
      var py = parseInt(dParts[0], 10);
      var pm = parseInt(dParts[1], 10);
      var pdm = parseInt(dParts[2], 10);
      var ph = parseInt(tParts[0], 10);
      var pmin = parseInt(tParts[1], 10);
      // Mobile-safe 2-digit formatter for legacy WebViews (avoids String.padStart dependency).
      var z2 = function(v) {
        var n = parseInt(v, 10);
        if (isNaN(n)) n = 0;
        return n < 10 ? ('0' + n) : String(n);
      };

      var correctedHour = ph;
      var correctedMinute = pmin;
      var cityBaseTz = input.city.baseTzOffset;
      var tzResolved = resolveBirthTimezoneOffset(py, pm, pdm, ph, pmin, cityTz, cityBaseTz);
      var cityStdLong = tzResolved.tzOffsetHours * 15;
      var cityLngOffset = Math.round((cityStdLong - cityLong) * 4);
      var correctedTotal = ((ph * 60 + pmin - cityLngOffset) % 1440 + 1440) % 1440;
      correctedHour = Math.floor(correctedTotal / 60);
      correctedMinute = correctedTotal % 60;
      var correctedYear = py;
      var correctedMonth = pm;
      var correctedDay = pdm;
      var lngMsgMinutes = -cityLngOffset;
      var dstMsgMinutes = tzResolved.dstMinutes;
      // 상대 명반도 내 명반(calculate·computeProfileForModal)과 같은 정본 시각(경도·과거 서머타임,
      // lib/ziwei-birth-clock.js)을 쓴다. 예전 식은 날짜를 그대로 두고 시각만 %1440 으로 감아
      // 자정을 넘기는 보정(예: 서울 00:15 → 전날 23:43)이 하루 뒤 子時로 계산됐다. 정본 실패 시 예전 식 유지.
      try {
        var partnerClockMeta = _koreanCalendar().calculateNatalSaju({
          birthDate: py + '-' + z2(pm) + '-' + z2(pdm), calendarType: 'solar',
          birthTime: z2(ph) + ':' + z2(pmin),
          birthPlace: { name: cityLabel, longitude: cityLong, latitude: cityLat, timezone: cityTz }
        }).calculationMeta;
        var partnerClock = partnerClockMeta && partnerClockMeta.corrected;
        if (partnerClock) {
          correctedYear = partnerClock.year;
          correctedMonth = partnerClock.month;
          correctedDay = partnerClock.day;
          correctedHour = partnerClock.hour;
          correctedMinute = partnerClock.minute;
          lngMsgMinutes = Math.round(partnerClockMeta.correction.longitudeCorrectionMinutes);
          dstMsgMinutes = partnerClockMeta.correction.dstMinutes;
        }
      } catch (clockErr) {
        console.warn('[ZiweiCompat] canonical birth clock fallback:', clockErr);
      }
      var shiftedDay = correctedYear !== py || correctedMonth !== pm || correctedDay !== pdm;
      var correctionMsg = '진태양시 보정 적용: '
        + z2(ph) + ':' + z2(pmin)
        + ' → ' + (shiftedDay ? correctedYear + '-' + z2(correctedMonth) + '-' + z2(correctedDay) + ' ' : '')
        + z2(correctedHour) + ':' + z2(correctedMinute)
        + ' (경도 ' + lngMsgMinutes + '분, DST ' + dstMsgMinutes + '분, UTC'
        + (tzResolved.tzOffsetHours >= 0 ? '+' : '') + tzResolved.tzOffsetHours + ')';

      var meBirth = window._ziweiBirth;
      if (!meBirth) {
        outEl.innerHTML = '<div style="color:#fda4af;font-size:0.9rem;">내 명반 정보가 없어 궁합 계산을 진행할 수 없습니다.</div>';
        return;
      }

      var meData = window._currentZiweiData;
      if (!meData) {
        meData = calcZiweiPalaces(meBirth.year, meBirth.month, meBirth.day, meBirth.hour, meBirth.minute);
      }

      var partnerData = null;
      try {
        partnerData = calcZiweiPalaces(correctedYear, correctedMonth, correctedDay, correctedHour, correctedMinute);
      } catch (e) {
        outEl.innerHTML = '<div style="color:#fda4af;font-size:0.9rem;">상대 정보 계산 중 오류가 발생했습니다. 입력값을 확인해 주세요.</div>';
        return;
      }

      var parseMainMeta = function(stars) {
        if (!stars) return [];
        var hasMain = !!(stars.main && stars.main.length);
        var useBorrowed = !hasMain && !!(stars.borrowedMain && stars.borrowedMain.length);
        var src = hasMain ? stars.main : (stars.borrowedMain || []);
        return src.map(function(raw) {
          var plain = (raw || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          var nm = plain
            .replace(/\(차성\)/g, '')
            .replace(/화록|화권|화과|화기/g, '')
            .trim()
            .split(' ')[0];
          return { name: nm || '', borrowed: useBorrowed || /\(차성\)|\b차성\b/.test(plain) };
        }).filter(function(v) { return !!v.name; });
      };

      var getPalSnapshot = function(zwData, palaceName) {
        if (!zwData || !zwData.palacesByIndex || !zwData.stars) {
          return { main: [], aux: [], bad: [], borrowedCount: 0 };
        }
        var idx = zwData.palacesByIndex.indexOf(palaceName);
        if (idx < 0 && palaceName === '\uBD80\uCC98\uAD81') idx = zwData.palacesByIndex.indexOf('부부궁');
        if (idx < 0 && palaceName === '부부궁') idx = zwData.palacesByIndex.indexOf('\uBD80\uCC98\uAD81');
        if (idx < 0) return { main: [], aux: [], bad: [], borrowedCount: 0 };
        var st = zwData.stars[idx] || { main: [], aux: [], bad: [], borrowedMain: [] };
        var mainMeta = parseMainMeta(st);
        var aux = (st.aux || []).map(function(v) {
          return (v || '').replace(/<[^>]*>/g, ' ').replace(/화록|화권|화과|화기/g, '').replace(/\s+/g, ' ').trim().split(' ')[0];
        }).filter(function(v) { return !!v; });
        var bad = (st.bad || []).map(function(v) {
          return (v || '').replace(/<[^>]*>/g, ' ').replace(/화록|화권|화과|화기/g, '').replace(/\s+/g, ' ').trim().split(' ')[0];
        }).filter(function(v) { return !!v; });
        return {
          main: mainMeta.map(function(m) { return m.name; }),
          aux: aux,
          bad: bad,
          borrowedCount: mainMeta.filter(function(m) { return m.borrowed; }).length
        };
      };

      var intersectCount = function(a, b) {
        var s = Object.create(null);
        (a || []).forEach(function(v) { s[v] = (s[v] || 0) + 1; });
        var c = 0;
        (b || []).forEach(function(v) { if (s[v]) c += 1; });
        return c;
      };

      var pairScore = function(meP, youP, cfg) {
        cfg = cfg || {};
        var mMain = intersectCount(meP.main, youP.main);
        var mAux = intersectCount(meP.aux, youP.aux);
        var badMix = (meP.bad.length + youP.bad.length);
        var s = (cfg.base || 50)
          + mMain * (cfg.mainW || 11)
          + mAux * (cfg.auxW || 4)
          - badMix * (cfg.badW || 2)
          - (meP.borrowedCount + youP.borrowedCount) * (cfg.borrowedW || 1.5);
        return Math.max(20, Math.min(96, Math.round(s)));
      };

      var mePal = {
        meng: getPalSnapshot(meData, '명궁'),
        bok: getPalSnapshot(meData, '복덕궁'),
        spouse: getPalSnapshot(meData, '부부궁'),
        illness: getPalSnapshot(meData, '질액궁'),
        move: getPalSnapshot(meData, '천이궁'),
        home: getPalSnapshot(meData, '전택궁'),
        wealth: getPalSnapshot(meData, '재백궁'),
        job: getPalSnapshot(meData, '관록궁')
      };
      var youPal = {
        meng: getPalSnapshot(partnerData, '명궁'),
        bok: getPalSnapshot(partnerData, '복덕궁'),
        spouse: getPalSnapshot(partnerData, '부부궁'),
        illness: getPalSnapshot(partnerData, '질액궁'),
        move: getPalSnapshot(partnerData, '천이궁'),
        home: getPalSnapshot(partnerData, '전택궁'),
        wealth: getPalSnapshot(partnerData, '재백궁'),
        job: getPalSnapshot(partnerData, '관록궁')
      };

      var loveScore = Math.round((
        pairScore(mePal.spouse, youPal.spouse, { base: 52, mainW: 12, auxW: 4.5, badW: 2.2 }) * 0.5 +
        pairScore(mePal.meng, youPal.meng, { base: 50, mainW: 10, auxW: 3.8, badW: 2.0 }) * 0.3 +
        pairScore(mePal.bok, youPal.bok, { base: 48, mainW: 9.5, auxW: 4.2, badW: 1.8 }) * 0.2
      ));
      var marriageScore = Math.round((
        pairScore(mePal.spouse, youPal.spouse, { base: 53, mainW: 11.5, auxW: 4.0, badW: 2.3 }) * 0.45 +
        pairScore(mePal.home, youPal.home, { base: 51, mainW: 10.0, auxW: 4.0, badW: 1.8 }) * 0.35 +
        pairScore(mePal.bok, youPal.bok, { base: 49, mainW: 9.5, auxW: 4.2, badW: 1.7 }) * 0.2
      ));
      var friendScore = Math.round((
        pairScore(mePal.meng, youPal.meng, { base: 50, mainW: 9.5, auxW: 4.5, badW: 1.7 }) * 0.5 +
        pairScore(mePal.bok, youPal.bok, { base: 50, mainW: 9.0, auxW: 5.0, badW: 1.5 }) * 0.5
      ));
      var workScore = Math.round((
        pairScore(mePal.job, youPal.job, { base: 50, mainW: 11.5, auxW: 4.2, badW: 2.2 }) * 0.55 +
        pairScore(mePal.meng, youPal.meng, { base: 49, mainW: 9.0, auxW: 3.5, badW: 2.0 }) * 0.45
      ));
      var businessScore = Math.round((
        pairScore(mePal.wealth, youPal.wealth, { base: 50, mainW: 12.0, auxW: 4.5, badW: 2.3 }) * 0.45 +
        pairScore(mePal.job, youPal.job, { base: 49, mainW: 10.5, auxW: 4.0, badW: 2.0 }) * 0.35 +
        pairScore(mePal.home, youPal.home, { base: 48, mainW: 9.0, auxW: 3.8, badW: 1.8 }) * 0.2
      ));
      var pastAxisMeng = pairScore(mePal.meng, youPal.meng, { base: 49, mainW: 10.0, auxW: 3.9, badW: 1.8 });
      var pastAxisBok = pairScore(mePal.bok, youPal.bok, { base: 52, mainW: 10.5, auxW: 4.4, badW: 1.5 });
      var pastAxisSpouse = pairScore(mePal.spouse, youPal.spouse, { base: 51, mainW: 11.0, auxW: 4.1, badW: 1.8 });
      var pastAxisMove = pairScore(mePal.move, youPal.move, { base: 48, mainW: 9.8, auxW: 3.8, badW: 1.7 });
      var pastAxisIllness = pairScore(mePal.illness, youPal.illness, { base: 47, mainW: 10.0, auxW: 3.6, badW: 1.6 });
      var pastLifeScore = Math.round((
        (pastAxisBok * 3) +
        (pastAxisSpouse * 2) +
        (pastAxisMove * 1.5) +
        (pastAxisIllness * 2)
      ) / 8.5);

      var coreMainMe = mePal.spouse.main[0] || mePal.meng.main[0] || '공궁';
      var coreMainYou = youPal.spouse.main[0] || youPal.meng.main[0] || '공궁';

      var tierText = function(v) {
        if (v >= 86) return '최상급 합';
        if (v >= 74) return '강한 합';
        if (v >= 62) return '안정 합';
        if (v >= 50) return '보통 합';
        return '조율 필요';
      };

      var uniq = function(arr) {
        var m = Object.create(null);
        var out = [];
        (arr || []).forEach(function(v) {
          if (!v || m[v]) return;
          m[v] = 1;
          out.push(v);
        });
        return out;
      };
      var inter = function(a, b) {
        var m = Object.create(null);
        (a || []).forEach(function(v) { m[v] = 1; });
        var out = [];
        (b || []).forEach(function(v) {
          if (m[v]) out.push(v);
        });
        return uniq(out);
      };
      var starsTxt = function(list, emptyTxt) {
        return (list && list.length) ? list.join(' · ') : (emptyTxt || '직접 공통성 약함');
      };
      var coreTxt = function(p) {
        return (p && p.main && p.main.length) ? p.main[0] : '공궁';
      };
      var supportText = function(meP, youP) {
        var s = inter(meP.aux, youP.aux);
        if (s.length) return '공통 길성 ' + s.slice(0, 3).join(' · ') + '이 관계 완충 역할을 합니다.';
        var n = (meP.aux.length + youP.aux.length);
        return n >= 3 ? '직접 공통 길성은 약하지만 각자 보조성이 있어 조율 여지가 큽니다.' : '보조 길성이 약한 편이라 소통 루틴을 의식적으로 설계하는 편이 좋습니다.';
      };
      var riskText = function(meP, youP) {
        var r = meP.bad.length + youP.bad.length;
        if (r >= 5) return '흉성 압력이 높은 편이라 오해 누적·감정 과열 구간을 주기적으로 환기해야 합니다.';
        if (r >= 3) return '흉성 압력이 중간 수준이므로 일정·약속·돈 관련 기준 합의가 필요합니다.';
        return '흉성 압력은 낮은 편으로 운행 규칙만 맞추면 안정적으로 굴러갑니다.';
      };
      var borrowedNote = function(meP, youP) {
        var b = meP.borrowedCount + youP.borrowedCount;
        return b > 0 ? ('차성 개입(' + b + ')이 있어 상황/환경 변수에 따라 체감 궁합이 흔들릴 수 있습니다.') : '원성 중심 구조라 궁합 해석의 일관성이 비교적 높은 편입니다.';
      };

      var loveSharedSpouse = inter(mePal.spouse.main, youPal.spouse.main);
      var loveSharedMeng = inter(mePal.meng.main, youPal.meng.main);
      var marriageSharedHome = inter(mePal.home.main, youPal.home.main);
      var marriageSharedBok = inter(mePal.bok.main, youPal.bok.main);
      var friendSharedMeng = inter(mePal.meng.main, youPal.meng.main);
      var friendSharedBok = inter(mePal.bok.main, youPal.bok.main);
      var workSharedJob = inter(mePal.job.main, youPal.job.main);
      var bizSharedWealth = inter(mePal.wealth.main, youPal.wealth.main);
      var bizSharedJob = inter(mePal.job.main, youPal.job.main);
      var pastSharedBok = inter(mePal.bok.main, youPal.bok.main);
      var pastSharedMeng = inter(mePal.meng.main, youPal.meng.main);

      var loveDesc = '부부궁 핵심성: 나 ' + coreTxt(mePal.spouse) + ' × 상대 ' + coreTxt(youPal.spouse)
        + ' / 공통 주성: ' + starsTxt(loveSharedSpouse)
        + '. 명궁 공통성(' + starsTxt(loveSharedMeng) + ')이 끌림의 속도와 감정 표현 템포를 맞춥니다. '
        + supportText(mePal.spouse, youPal.spouse) + ' ' + riskText(mePal.spouse, youPal.spouse);

      var marriageDesc = '부부궁·전택궁·복덕궁을 합산한 결과입니다. 전택궁 공통 주성: ' + starsTxt(marriageSharedHome)
        + ', 복덕궁 공통 주성: ' + starsTxt(marriageSharedBok)
        + '. 생활 결합에서는 "역할 분담·재무 운행·가정 리듬"의 합이 관건이며, '
        + borrowedNote(mePal.home, youPal.home) + ' ' + riskText(mePal.home, youPal.home);

      var friendDesc = '명궁 공통 주성: ' + starsTxt(friendSharedMeng)
        + ' / 복덕궁 공통 주성: ' + starsTxt(friendSharedBok)
        + '. 대화 코드와 정서 회복 방식의 유사도를 반영했으며, '
        + supportText(mePal.bok, youPal.bok) + ' 친구 관계에서는 감정 소모 시 회복 속도가 핵심입니다.';

      var workDesc = '관록궁 핵심성: 나 ' + coreTxt(mePal.job) + ' × 상대 ' + coreTxt(youPal.job)
        + ' / 공통 주성: ' + starsTxt(workSharedJob)
        + '. 업무 궁합은 "속도 vs 완성도" 배분에서 갈리며, '
        + supportText(mePal.job, youPal.job) + ' ' + riskText(mePal.job, youPal.job);

      var businessDesc = '재백궁 공통 주성: ' + starsTxt(bizSharedWealth)
        + ', 관록궁 공통 주성: ' + starsTxt(bizSharedJob)
        + '. 수익화 모델·권한 배치·거문 파동 통제 구조를 함께 보정한 점수입니다. '
        + '재백궁 핵심성(나 ' + coreTxt(mePal.wealth) + ' / 상대 ' + coreTxt(youPal.wealth) + ') 차이가 클수록 계약서/정산 규칙을 촘촘히 잡는 것이 유리합니다.';

      var starsAll = function(p) {
        return uniq((p.main || []).concat(p.aux || []).concat(p.bad || []));
      };
      var hasAny = function(list, candidates) {
        return (list || []).some(function(v) { return candidates.indexOf(v) >= 0; });
      };
      var pickFirst = function(list, candidates) {
        for (var i = 0; i < list.length; i += 1) {
          if (candidates.indexOf(list[i]) >= 0) return list[i];
        }
        return '';
      };

      var pastMengStars = starsAll(mePal.meng).concat(starsAll(youPal.meng));
      var pastBokStars = starsAll(mePal.bok).concat(starsAll(youPal.bok));
      var pastSpouseStars = starsAll(mePal.spouse).concat(starsAll(youPal.spouse));
      var pastMoveStars = starsAll(mePal.move).concat(starsAll(youPal.move));
      var pastIllnessStars = starsAll(mePal.illness).concat(starsAll(youPal.illness));
      var pastAxisMain = uniq((mePal.meng.main || []).concat(youPal.meng.main || []).concat(mePal.bok.main || []).concat(youPal.bok.main || []).concat(mePal.spouse.main || []).concat(youPal.spouse.main || []).concat(mePal.move.main || []).concat(youPal.move.main || []).concat(mePal.illness.main || []).concat(youPal.illness.main || []));

      var pastTypeList = [];
      var destinyLoverHit = hasAny(pastSpouseStars.concat(pastMengStars), ['자미','천부','태음','탐랑']);
      var karmicDebtHit = hasAny(pastIllnessStars.concat(pastBokStars), ['칠살','화성','영성']);
      var mentorHit = hasAny(pastBokStars, ['천기']) && hasAny(pastMengStars, ['문창','문곡']);
      var rivalHit = (hasAny(pastAxisMain, ['칠살']) && hasAny(pastAxisMain, ['파군'])) || (pastAxisMain.filter(function(v){ return v === '칠살' || v === '파군'; }).length >= 2);
      var guardianHit = hasAny(pastAxisMain, ['천량','천동']);

      if (destinyLoverHit) pastTypeList.push('숙명 연인형');
      if (karmicDebtHit) pastTypeList.push('karmic 빚의 인연');
      if (mentorHit) pastTypeList.push('스승과 제자 인연');
      if (rivalHit) pastTypeList.push('운명의 라이벌');
      if (guardianHit) pastTypeList.push('보호자 인연');
      if (!pastTypeList.length) pastTypeList.push('이번 생 중심 인연');

      var envMap = {
        '탐랑':'궁중/예술계',
        '칠살':'전쟁터/장군의 진영',
        '천기':'학자/전략가의 서고',
        '태음':'귀족 가문/은밀한 내실',
        '파군':'혁명기/격변의 국면',
        '천량':'종교/수행 공동체'
      };
      var eraStar = pickFirst(uniq((mePal.move.main || []).concat(youPal.move.main || []).concat(pastMoveStars)), ['탐랑','칠살','천기','태음','파군','천량']);
      var pastEraPlace = eraStar ? envMap[eraStar] : '이동이 많은 교역 도시/변화의 경계 지대';

      var pastBand = '';
      if (pastLifeScore >= 80) pastBand = '강한 전생 인연';
      else if (pastLifeScore >= 60) pastBand = 'karmic 관계';
      else if (pastLifeScore >= 40) pastBand = '스쳐가는 인연';
      else pastBand = '이번 생 중심 인연';

      var pastTypeTitle = pastTypeList.join(' + ');
      var pastRelation = '';
      if (pastTypeList.indexOf('숙명 연인형') >= 0) {
        pastRelation = '처음 마주한 순간에도 오래전부터 서로를 알아본 듯한 정서적 익숙함이 강하게 흐를 수 있습니다.';
      } else if (pastTypeList.indexOf('karmic 빚의 인연') >= 0) {
        pastRelation = '끌림과 갈등이 동시에 작동하며, 관계를 통해 서로의 미완의 과제를 배워가는 흐름이 나타나기 쉽습니다.';
      } else if (pastTypeList.indexOf('스승과 제자 인연') >= 0) {
        pastRelation = '감정보다 지적 교류가 먼저 연결되며, 서로의 시야를 넓혀주는 동반 성장형 인연으로 읽힙니다.';
      } else if (pastTypeList.indexOf('운명의 라이벌') >= 0) {
        pastRelation = '서로를 자극하며 밀어 올리는 긴장감이 강하고, 경쟁이 곧 성장의 장치로 작동할 가능성이 큽니다.';
      } else if (pastTypeList.indexOf('보호자 인연') >= 0) {
        pastRelation = '연인이라기보다 가족 같은 보호 본능과 안정감이 먼저 작동하는 관계 결이 강합니다.';
      } else {
        pastRelation = '전생의 강한 고리보다는 이번 생의 선택과 합의가 관계의 방향을 더 크게 좌우하는 흐름입니다.';
      }

      var _zwStableSeedFrom = function(str) {
        var s = String(str || '');
        var acc = 17;
        for (var si3 = 0; si3 < s.length; si3 += 1) {
          acc = (acc * 31 + s.charCodeAt(si3)) % 2147483647;
        }
        return acc;
      };
      var _zwPickBySeed = function(list, seed, offset) {
        if (!list || !list.length) return '';
        var idx = Math.abs((seed + (offset || 0)) % list.length);
        return list[idx];
      };

      var pastSeedCore = [
        pastTypeTitle,
        pastEraPlace,
        pastBand,
        String(pastLifeScore),
        String(pastAxisMeng),
        String(pastAxisBok),
        String(pastAxisSpouse),
        String(pastAxisMove),
        coreTxt(mePal.meng),
        coreTxt(youPal.meng),
        coreTxt(mePal.spouse),
        coreTxt(youPal.spouse)
      ].join('|');
      var pastSeed = _zwStableSeedFrom(pastSeedCore);

      var storyOpeners = [
        '먹빛 하늘에 첫 별이 켜질 무렵,',
        '달력이 바뀌기 직전의 정적 속에서,',
        '바람이 문고리를 흔들던 오래된 밤,',
        '등잔불이 가장 낮게 떨리던 새벽,',
        '성운의 경계가 열리던 찰나에,'
      ];
      var storyScenesByType = {
        '숙명 연인형': [
          '두 사람은 의례와 축복이 교차하는 전각에서 서로의 이름을 봉인하듯 불렀고,',
          '두 사람은 음악과 향이 흐르는 궁정의 회랑에서 같은 약속을 다른 언어로 반복했으며,',
          '두 사람은 밤길의 등불 아래서 이별을 미루는 대신 재회를 예언하는 표식을 남겼고,'
        ],
        'karmic 빚의 인연': [
          '두 사람은 전장의 뒤편에서 서로의 생존을 바꿔치기하듯 지켜냈지만 정산되지 못한 감정이 남았고,',
          '두 사람은 빚과 은혜의 장부를 끝내 맞추지 못한 채 같은 도시의 다른 계절로 흩어졌으며,',
          '두 사람은 구원과 상처가 교차하는 선택을 반복하다 마지막 문장을 쓰지 못한 채 멈췄고,'
        ],
        '스승과 제자 인연': [
          '두 사람은 오래된 서고에서 질문과 답을 주고받으며 서로의 시야를 확장했지만,',
          '두 사람은 같은 도표를 다른 손으로 완성해 가며 사유의 결을 닮아갔고,',
          '두 사람은 말보다 침묵의 여백에서 더 많은 지혜를 전수했으나,'
        ],
        '운명의 라이벌': [
          '두 사람은 같은 목표를 다른 방식으로 쟁취하며 서로를 가장 날카롭게 성장시켰고,',
          '두 사람은 승부의 문턱마다 상대의 존재를 자신의 한계치로 삼았으며,',
          '두 사람은 대립의 언어로 소통하면서도 결정적 순간마다 서로의 등을 밀어주었고,'
        ],
        '보호자 인연': [
          '두 사람은 폭우가 쏟아지는 골목마다 한 사람이 길을 만들고 다른 한 사람이 숨을 고르게 했으며,',
          '두 사람은 불안이 밀려오는 날마다 역할을 바꿔가며 서로의 방패가 되었고,',
          '두 사람은 위기 때마다 가장 먼저 서로의 이름을 확인하는 습관을 갖게 되었지만,'
        ],
        '이번 생 중심 인연': [
          '두 사람의 전생 기록은 짧고 옅지만, 희미한 접점들이 이번 생의 우연을 정교하게 밀어 올렸고,',
          '두 사람의 과거 연결은 강하지 않았으나 반복되는 타이밍의 일치가 관계의 가능성을 키웠으며,',
          '두 사람은 긴 서사 대신 작은 공명들을 남겼고 그것들이 현생에서 다시 결을 만들고 있으며,'
        ]
      };
      var storyConflictsByBand = {
        '강한 전생 인연': [
          '강한 끌림이 기준 없는 속도로 번지면 애정이 피로로 바뀔 수 있었습니다.',
          '서로를 잘 안다는 확신이 대화를 생략하게 만들 때 오해가 더 깊어졌습니다.',
          '익숙함이 배려를 대체한 구간에서 관계의 온도가 급격히 흔들렸습니다.'
        ],
        'karmic 관계': [
          '미해결 과제가 반복될수록 같은 갈등이 다른 장면으로 재현되는 패턴이 생겼습니다.',
          '사과보다 해명이 먼저 나올 때 감정의 장부가 계속 누적되었습니다.',
          '정답을 찾으려는 조급함이 서로의 회복 타이밍을 어긋나게 했습니다.'
        ],
        '스쳐가는 인연': [
          '연결의 밀도보다 현실의 속도가 앞설 때 손을 놓치기 쉬웠습니다.',
          '감정은 있었지만 운영 규칙이 없어 일상이 관계를 밀어냈습니다.',
          '좋은 의도는 충분했으나 합의의 언어가 부족해 엇갈림이 누적되었습니다.'
        ],
        '이번 생 중심 인연': [
          '선입견이 커질수록 실제의 장점이 가려지는 문제가 반복되었습니다.',
          '의미를 과장해 해석하면 단순한 문제도 숙명처럼 보일 수 있었습니다.',
          '작은 오해를 즉시 풀지 않으면 관계의 기본값이 쉽게 낮아졌습니다.'
        ]
      };
      var storyEndings = [
        '그래서 이번 생의 열쇠는 "속도"보다 "합의"이며, 약속의 단위를 작게 쪼갤수록 인연의 품질이 높아집니다.',
        '결국 이 인연의 완성도는 감정의 크기보다 운영의 디테일에 의해 결정되며, 반복 가능한 규칙이 곧 사랑의 안전장치가 됩니다.',
        '이번 생에서 두 사람은 운명을 증명하기보다 생활을 설계해야 하며, 그 설계도가 곧 전생의 미완을 완성하는 문서가 됩니다.',
        '따라서 강한 끌림을 오래 가는 신뢰로 바꾸려면, 즉흥적 해석보다 주기적 대화 루틴이 필수입니다.'
      ];

      var leadType = pastTypeList[0] || '이번 생 중심 인연';
      var scenePool = storyScenesByType[leadType] || storyScenesByType['이번 생 중심 인연'];
      var conflictPool = storyConflictsByBand[pastBand] || storyConflictsByBand['스쳐가는 인연'];
      var storyOpening = _zwPickBySeed(storyOpeners, pastSeed, 3);
      var storyScene = _zwPickBySeed(scenePool, pastSeed, 11);
      var storyConflict = _zwPickBySeed(conflictPool, pastSeed, 19);
      var storyEnding = _zwPickBySeed(storyEndings, pastSeed, 27);

      var storyMotifList = [];
      if (hasAny(pastAxisMain, ['태음','천동'])) storyMotifList.push('월광의 정서 교감');
      if (hasAny(pastAxisMain, ['칠살','파군'])) storyMotifList.push('강한 결단과 변혁');
      if (hasAny(pastAxisMain, ['천기','문창','문곡'])) storyMotifList.push('지적 공명과 전략');
      if (hasAny(pastAxisMain, ['천량','천부'])) storyMotifList.push('보호와 책임의 결');
      if (hasAny(pastAxisMain, ['탐랑','태양'])) storyMotifList.push('열정과 표현의 불꽃');
      if (!storyMotifList.length) storyMotifList.push('느린 신뢰의 축적');
      var storyMotifs = uniq(storyMotifList).slice(0, 3).join(' · ');

      var pastStory = storyOpening + ' '
        + '두 사람의 영혼은 ' + pastEraPlace + '의 기록과 공명하며 서로를 재인식했습니다. '
        + storyScene + ' '
        + '그 과정에서 ' + storyConflict + ' '
        + '현재 차트에 남은 전생의 키워드는 [' + storyMotifs + ']이며, '
        + storyEnding;

      var pastMeaning = '';
      if (pastLifeScore >= 80) {
        pastMeaning = '강한 전생 인연 축이 감지됩니다. 이번 생에서는 "강한 끌림"을 "안정적인 합의"로 바꾸는 실천이 관계의 품질을 결정합니다. '
          + '미션: 1) 다툼 후 24시간 내 재대화 규칙 확정 2) 월 1회 관계 운영 점검 3) 돈/시간/연락 기준 3줄 헌법 작성.';
      } else if (pastLifeScore >= 60) {
        pastMeaning = 'karmic 학습 과제가 남아 있을 가능성이 있습니다. 감정 반응을 즉시 확정하지 않고 대화 규칙을 세우면 성장 속도가 빨라집니다. '
          + '미션: 1) 감정 언어(사실/감정/요청) 포맷 통일 2) 오해 누적 전에 10분 체크인 3) 갈등 키워드 기록 후 재발 방지.';
      } else if (pastLifeScore >= 40) {
        pastMeaning = '전생의 연결은 약하지만 의미 없는 만남은 아닙니다. 이번 생의 생활 리듬과 상호 존중이 인연의 깊이를 키우는 핵심 열쇠입니다. '
          + '미션: 1) 주간 데이트/휴식 리듬 고정 2) 기대치 사전 합의 3) 긍정 피드백 1개를 매일 교환.';
      } else {
        pastMeaning = '전생보다 현생 중심의 인연으로 보입니다. 선입견 없이 지금의 선택과 행동으로 관계를 설계할수록 건강한 결과에 가까워집니다. '
          + '미션: 1) 관계 목표를 작게 정의 2) 역할 분담 명확화 3) 문제 발생 시 원인보다 해결 순서를 먼저 합의.';
      }

      var pastMission = '';
      if (pastBand === '강한 전생 인연') {
        pastMission = '서로를 너무 잘 안다는 착각을 경계하고, 합의 없는 직감을 줄이는 것.';
      } else if (pastBand === 'karmic 관계') {
        pastMission = '반복되는 갈등 패턴을 기록해 "이번에는 다르게" 실행하는 것.';
      } else if (pastBand === '스쳐가는 인연') {
        pastMission = '작은 약속의 이행률을 높여 신뢰의 누적치를 만드는 것.';
      } else {
        pastMission = '숙명 해석보다 현실 운영(시간·돈·표현)의 일관성을 먼저 세우는 것.';
      }

      var pastLifeDesc = '전생 인연 유형\n(' + pastTypeTitle + ')\n\n'
        + '전생 키워드\n(' + storyMotifs + ')\n\n'
        + '전생 관계\n(' + pastRelation + ')\n\n'
        + '전생 시대 / 장소\n(' + pastEraPlace + ')\n\n'
        + '전생 이야기\n(' + pastStory + ')\n\n'
        + '전생 인연 점수\n(' + pastLifeScore + ' / 100, ' + pastBand + ')\n\n'
        + '이번 생에서의 의미\n(' + pastMeaning + ')\n\n'
        + '이번 생 미션\n(' + pastMission + ')';

      var tagByScore = function(score, key) {
        if (key === '연애 궁합') return score >= 60 ? '#감정교류활성' : '#속도조율';
        if (key === '결혼 궁합') return score >= 60 ? '#생활헌법합의' : '#가정리듬조율';
        if (key === '직장 궁합') return score >= 60 ? '#역할분담시너지' : '#병목해소';
        if (key === '사업 궁합') return score >= 60 ? '#수익구조정렬' : '#계약서우선';
        if (key === '친구 궁합') return score >= 60 ? '#정서회복빠름' : '#거리존중';
        return score >= 60 ? '#카르마상호보완' : '#인연학습';
      };

      var rawCatRows = [
        { key: '연애 궁합', rawVal: loveScore, w: 0.26 },
        { key: '결혼 궁합', rawVal: marriageScore, w: 0.22 },
        { key: '친구 궁합', rawVal: friendScore, w: 0.12 },
        { key: '직장 궁합', rawVal: workScore, w: 0.18 },
        { key: '사업 궁합', rawVal: businessScore, w: 0.17 }
      ];

      var funDetailByTag = function(tag, key) {
        var tagKey = String(tag || '').replace(/^#/, '');
        var map = {
          '감정교류활성': '오늘의 커플 퀘스트: "한 줄 감정 + 한 줄 칭찬"을 서로 교환하면 애정 게이지가 눈에 띄게 상승합니다. 말투가 부드러워질수록 별빛 버프가 강해집니다.',
          '속도조율': '두 사람의 리듬이 서로 달라 "빨리"보다 "같이"가 정답인 구간입니다. 데이트 템포를 반 박자만 늦추면 오해가 귀여운 해프닝으로 끝납니다.',
          '생활헌법합의': '이 궁합의 핵심은 로맨스보다 운영력입니다. 돈·연락·휴식 규칙 3개만 합의해도 "현실 천생연분" 모드가 켜집니다.',
          '가정리듬조율': '집안일, 수면, 식사처럼 일상 리듬을 맞추면 애정이 자동 충전됩니다. 작은 루틴 하나가 큰 싸움을 미리 막아주는 숨은 치트키입니다.',
          '역할분담시너지': '이 팀은 각자 잘하는 포지션을 맡을 때 폭발합니다. "누가 더 열심히"보다 "누가 더 잘 맞는지"로 나누면 성과와 관계를 동시에 챙깁니다.',
          '병목해소': '답답한 포인트를 숨기지 말고 병목 1개만 콕 집어 해결하세요. 회의 10분, 정리 2줄이면 스트레스 파동이 빠르게 내려갑니다.',
          '수익구조정렬': '돈의 흐름을 같은 그림으로 보는 순간 궁합이 급상승합니다. 수입·지출·저축을 한 화면에 놓고 보면 "왜" 싸우는지가 바로 풀립니다.',
          '계약서우선': '좋은 관계일수록 문서가 다정합니다. 역할·권한·정산 규칙을 미리 적어두면 감정 소모 없이 오래 가는 파트너십이 됩니다.',
          '정서회복빠름': '속상해도 회복 속도가 빠른 조합입니다. 산책 20분 + 간식 1개 같은 가벼운 루틴이 기분을 놀랍게 빠르게 되돌립니다.',
          '거리존중': '가까움의 밀도보다 거리의 품질이 중요한 인연입니다. 각자의 공간을 인정할수록 다시 만났을 때 온도가 더 따뜻해집니다.',
          '카르마상호보완': '서로의 약점을 교정해 주는 학습형 버프가 작동합니다. "고치려는 말"보다 "도와주는 행동"이 훨씬 빠르게 관계를 성장시킵니다.',
          '인연학습': '지금은 완성형보다 튜토리얼 구간입니다. 작은 시행착오를 기록해 두면 다음 만남마다 체감 궁합이 꾸준히 올라갑니다.'
        };
        var fallback = '이 구간의 키워드는 ' + tag + ' 입니다. 가볍게 웃고 빠르게 합의하는 팀일수록 운의 체감 온도가 더 좋아집니다.';
        return map[tagKey] || fallback;
      };

      var safeText = function(v) {
        v = String(v == null ? '' : v);
        if (typeof iljuEscapeHtml === 'function') return iljuEscapeHtml(v);
        return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      };

      var userLabel = safeText((typeof USER_NAME === 'string' && USER_NAME.trim()) ? USER_NAME.trim() : '사용자');
      var partnerLabel = safeText('상대방');

      var starElement = {
        '자미':'토','천기':'목','태양':'화','무곡':'금','천동':'수','염정':'화','천부':'토','태음':'수',
        '탐랑':'목','거문':'수','천상':'금','천량':'토','칠살':'금','파군':'수','공궁':'중립'
      };
      var elemGen = { '목':'화', '화':'토', '토':'금', '금':'수', '수':'목' };
      var elemCtrl = { '목':'토', '토':'수', '수':'화', '화':'금', '금':'목' };

      var coreMe = coreTxt(mePal.meng);
      var coreYou = coreTxt(youPal.meng);
      var eMe = starElement[coreMe] || '중립';
      var eYou = starElement[coreYou] || '중립';

      var layer1Bonus = 0;
      var layer1Text = '';
      var tianjiTianliangPair = (coreMe === '천기' && coreYou === '천량') || (coreMe === '천량' && coreYou === '천기');
      if (tianjiTianliangPair) {
        layer1Bonus += 15;
        layer1Text = '천기(목)와 천량(토)의 만남은 기본적으로 목극토의 긴장 구조지만, 천량의 보호 기운이 천기의 예민함을 수렴하는 순간 강력한 상보 시너지가 열립니다. 성격 시너지 보너스 +15점이 반영됩니다.';
      } else if (eMe === eYou && eMe !== '중립') {
        layer1Bonus += 8;
        layer1Text = '주성 오행이 같은 결을 형성해 감정 리듬이 잘 맞습니다. 충돌보다 공명이 먼저 작동하는 구조입니다.';
      } else if (elemGen[eMe] === eYou || elemGen[eYou] === eMe) {
        layer1Bonus += 10;
        layer1Text = '오행이 상생 구조를 이루어 서로의 성향을 자연스럽게 북돋웁니다. 한쪽의 강점이 다른 한쪽의 추진력을 키워줍니다.';
      } else if (elemCtrl[eMe] === eYou || elemCtrl[eYou] === eMe) {
        layer1Bonus += 4;
        layer1Text = '오행 상극 구조가 일부 있으나, 잘 쓰면 갈등이 아니라 역할 분업으로 전환됩니다. 서로의 다른 결이 완성도를 높여줍니다.';
      } else {
        layer1Bonus += 6;
        layer1Text = '오행의 직접 공명은 약하지만, 성향 차이를 분업으로 설계하면 성장 탄력이 살아납니다.';
      }

      var traitMap = {
        '천기':['유연성','소통력'],'천동':['유연성','정서완충'],'태음':['공감력','소통력'],'거문':['소통력','분석력'],
        '문창':['소통력','지적교감'],'문곡':['소통력','감성교류'],'천량':['보호력','안정성'],'천부':['안정성','책임감'],
        '천상':['균형감','소통력'],'자미':['책임감','리더십'],'태양':['표현력','실행력'],'무곡':['실행력','현실감']
      };
      var mergeTraits = function(stars) {
        var t = Object.create(null);
        (stars || []).forEach(function(s){
          (traitMap[s] || []).forEach(function(k){ t[k] = 1; });
        });
        return Object.keys(t);
      };

      var myIdealTraits = mergeTraits((mePal.spouse.main || []).concat(mePal.spouse.aux || []));
      if (!myIdealTraits.length) myIdealTraits = ['유연성','소통력'];
      var partnerPersonaTraits = mergeTraits((youPal.meng.main || []).concat(youPal.meng.aux || []).concat(youPal.spouse.main || []));
      var matchedTraits = myIdealTraits.filter(function(t){ return partnerPersonaTraits.indexOf(t) >= 0; });
      var layer2Bonus = Math.min(20, matchedTraits.length * 10);
      var layer2Text = matchedTraits.length
        ? ('나의 이상적 배우자 코드('+myIdealTraits.join('·')+')와 상대 명궁 코드가 '+matchedTraits.join('·')+'에서 정합됩니다. 운명적 매칭 가산점 +'+layer2Bonus+'점이 적용됩니다.')
        : '이상 배우자 코드와 상대 명궁 코드의 직접 정합은 약하지만, 역할 분담 설계로 매칭률을 끌어올릴 수 있습니다.';

      var myHwagi = [];
      if (meData && meData.sihuaData) {
        for (var hwStar in meData.sihuaData) {
          if (meData.sihuaData[hwStar] && meData.sihuaData[hwStar].type === '화기') {
            myHwagi.push(hwStar);
          }
        }
      }
      myHwagi = uniq(myHwagi);
      var partnerControlStars = uniq((youPal.meng.main || []).concat(youPal.spouse.main || []).concat(youPal.bok.main || []).concat(youPal.meng.aux || []));
      var hwagiControlMap = {
        '문창':['천량','천부','천상','태음'],
        '문곡':['천량','천동','태음','자미'],
        '탐랑':['천부','천량','무곡'],
        '거문':['천상','천량','자미']
      };
      var layer3Bonus = 0;
      var layer3Text = '';
      var controlMatched = [];
      myHwagi.forEach(function(hs){
        var ctrls = hwagiControlMap[hs] || ['천량','천부','천상'];
        var hit = ctrls.some(function(cs){ return partnerControlStars.indexOf(cs) >= 0; });
        if (hit) controlMatched.push(hs);
      });
      if (controlMatched.length) {
        layer3Bonus = 10;
        layer3Text = '나의 화기('+controlMatched.join('·')+')를 상대 주성이 완충/제어하는 구조가 확인됩니다. 리스크 방어 점수 +10점이 추가됩니다.';
      } else if (myHwagi.length) {
        layer3Bonus = 4;
        layer3Text = '화기 직접 상쇄는 약하지만 상대의 안정 주성이 완충막으로 작동해 급격한 붕괴를 막는 보정이 있습니다.';
      } else {
        layer3Text = '화기 압력이 낮아 리스크 방어가 기본적으로 안정권입니다.';
      }

      var keyPalaces = ['부부궁','명궁','관록궁','재백궁'];
      var periodOverlap = [];
      var mePeriods = (meData && meData.daHanList) ? meData.daHanList : [];
      var youPeriods = (partnerData && partnerData.daHanList) ? partnerData.daHanList : [];
      mePeriods.forEach(function(mp){
        if (keyPalaces.indexOf(mp.palaceName) < 0) return;
        youPeriods.forEach(function(yp){
          if (keyPalaces.indexOf(yp.palaceName) < 0) return;
          var st = Math.max(mp.startAge, yp.startAge);
          var ed = Math.min(mp.endAge, yp.endAge);
          if (st <= ed) {
            periodOverlap.push({ st: st, ed: ed, meP: mp.palaceName, youP: yp.palaceName });
          }
        });
      });
      var layer4Bonus = periodOverlap.length ? 10 : 0;
      var goldenTime = '';
      if (periodOverlap.length) {
        periodOverlap.sort(function(a,b){ return (a.st - b.st) || (a.ed - b.ed); });
        var topOv = periodOverlap[0];
        var has2332 = periodOverlap.some(function(o){ return Math.max(o.st, 23) <= Math.min(o.ed, 32); });
        goldenTime = has2332
          ? '23~32세 핵심 변곡점이 서로 맞물리며 인연의 가속도가 크게 상승합니다. (인연 강도 +10점)'
          : (topOv.st+'~'+topOv.ed+'세 구간에서 '+topOv.meP+'×'+topOv.youP+' 축이 동기화됩니다. (인연 강도 +10점)');
      } else {
        goldenTime = '대운 핵심 구간의 직접 중첩은 약하지만, 준비된 합의가 있으면 후반 동기화 가능성이 높습니다.';
      }

      var baseWeighted = Math.round(
        loveScore * 0.30 + marriageScore * 0.25 + friendScore * 0.14 + workScore * 0.18 + businessScore * 0.13
      );
      var layeredBonus = layer1Bonus + layer2Bonus + layer3Bonus + layer4Bonus;
      var overallScore = Math.max(40, Math.min(95, baseWeighted + layeredBonus));

      var rawAvg = Math.round(rawCatRows.reduce(function(sum, r) { return sum + r.rawVal; }, 0) / rawCatRows.length);
      var syncGap = overallScore - rawAvg;
      var catRows = rawCatRows.map(function(r) {
        // 세부 점수를 종합점수 스케일에 맞추되, 카테고리 간 상대 순위는 유지한다.
        var upliftByGap = syncGap * 0.72;
        var upliftByLayer = layeredBonus * r.w * 0.55;
        var val = Math.round(r.rawVal + upliftByGap + upliftByLayer);
        val = Math.max(30, Math.min(95, val));
        return {
          key: r.key,
          val: val,
          tag: tagByScore(val, r.key),
          detail: ''
        };
      });
      catRows = catRows.map(function(c) {
        c.detail = funDetailByTag(c.tag, c.key);
        return c;
      });

      var relationAlias = overallScore >= 80 ? '완벽한 파트너십' : (overallScore <= 70 ? '성장형 커플' : '고밀도 동반자');

      var scoreBadge = function(v) {
        var bg = v >= 80 ? 'rgba(74,222,128,0.2)' : (v >= 70 ? 'rgba(96,165,250,0.2)' : 'rgba(245,158,11,0.2)');
        var bd = v >= 80 ? 'rgba(74,222,128,0.6)' : (v >= 70 ? 'rgba(96,165,250,0.6)' : 'rgba(245,158,11,0.6)');
        return '<span style="padding:2px 8px;border-radius:999px;border:1px solid '+bd+';background:'+bg+';font-size:0.78rem;color:#fdf2f8;font-weight:800;">'+v+'점</span>';
      };

      var guideHtml = '<div class="zw-compat-score-list">'
        + catRows.map(function(c) {
          return '<div class="zw-compat-score-row">'
            + '<div>'
            + '<b>'+c.key+'</b>'
            + '<span class="zw-compat-score-tag">'+c.tag+'</span>'
            + '<div class="zw-compat-score-desc">'+c.detail+'</div>'
            + '</div>'
            + scoreBadge(c.val)
            + '</div>';
        }).join('')
        + '</div>';

      var karmicLightHit = karmicDebtHit || pastLifeScore >= 60;
      var sealOn = function(active) {
        return active ? ' zw-karmic-seal active' : ' zw-karmic-seal';
      };
      var topSandHeight = Math.max(14, Math.min(54, 56 - Math.round(pastLifeScore * 0.44)));
      var bottomSandHeight = Math.max(14, Math.min(54, 10 + Math.round(pastLifeScore * 0.44)));

      var pastLifeHtml = '<div class="zw-pastlife-archive">'
        + '<div class="zw-pastlife-nebula"></div>'
        + '<div class="zw-pastlife-sparkles"></div>'
        + '<div class="zw-pastlife-layout">'
        + '<div class="zw-pastlife-head">'
        + '<div class="zw-pastlife-title">천상의 기록자 서고 | Chronos Scroll 아카이브</div>'
        + '<div class="zw-pastlife-sub">무한한 성운 서고에서 사서 마도사가 당신에게 전생 기록을 건넵니다. 오래된 양피지에 새겨진 영혼의 교차점을 따라, 두 사람의 기억이 황금빛 잉크로 깨어납니다.</div>'
        + '</div>'
        + '<div class="zw-pastlife-main">'
        + '<div class="zw-chronos-scroll">'
        + '<div class="zw-chronos-map">'
        + '<i style="left:14%;top:24%;"></i><i style="left:31%;top:54%;"></i><i style="left:54%;top:34%;"></i><i style="left:74%;top:62%;"></i><i style="left:86%;top:26%;"></i>'
        + '<b style="left:15%;top:26%;width:50px;transform:rotate(38deg);"></b><b style="left:31%;top:55%;width:58px;transform:rotate(-24deg);"></b><b style="left:54%;top:36%;width:52px;transform:rotate(33deg);"></b><b style="left:74%;top:63%;width:36px;transform:rotate(-58deg);"></b><b style="left:31%;top:55%;width:112px;transform:rotate(-6deg);"></b>'
        + '</div>'
        + '<div class="zw-scroll-block"><b>전생 인연 유형</b>'+pastTypeTitle+'</div>'
        + '<div class="zw-scroll-block"><b>전생 키워드</b>'+storyMotifs+'</div>'
        + '<div class="zw-scroll-block"><b>전생 관계</b>'+pastRelation+'</div>'
        + '<div class="zw-scroll-block"><b>전생 시대 / 장소</b>'+pastEraPlace+'</div>'
        + '<div class="zw-scroll-block"><b>전생 이야기</b>'+pastStory+'</div>'
        + '<div class="zw-scroll-block"><b>이번 생에서의 의미</b>'+pastMeaning+'</div>'
        + '<div class="zw-scroll-block"><b>이번 생 미션</b>'+pastMission+'</div>'
        + '<div class="zw-karmic-seals">'
        + '<div class="'+sealOn(pastTypeList.indexOf('숙명 연인형') >= 0)+'"><b>🔗</b>숙명 연인형<br>은빛 링 봉인</div>'
        + '<div class="'+sealOn(karmicLightHit)+'"><b>✨</b>karmic 빛의 인연<br>맥동하는 별 봉인</div>'
        + '<div class="'+sealOn(pastTypeList.indexOf('보호자 인연') >= 0)+'"><b>🛡️</b>보호자 인연<br>투명한 날개 봉인</div>'
        + '</div>'
        + '</div>'
        + '<div class="zw-hourglass-wrap">'
        + '<div class="zw-hourglass">'
        + '<div class="zw-hourglass-sand-top" style="height:'+topSandHeight+'px;"></div>'
        + '<div class="zw-hourglass-neck"></div>'
        + '<div class="zw-hourglass-sand-bottom" style="height:'+bottomSandHeight+'px;"></div>'
        + '</div>'
        + '<div class="zw-hourglass-score">'+pastLifeScore+' / 100</div>'
        + '<div class="zw-hourglass-note">황금 모래는 두 영혼의<br>karmic 채무와 연결 강도를<br>시간의 비율로 새깁니다.</div>'
        + '</div>'
        + '</div>'
        + '<div class="zw-palace-pillars">'
        + '<div class="zw-palace-pillar"><div class="zw-palace-beam" style="height:'+Math.max(24, Math.min(96, Math.round(pastAxisMeng)))+'px;"></div><div class="zw-palace-name">명궁 축 (Life)</div><div class="zw-palace-score">'+pastAxisMeng+'</div></div>'
        + '<div class="zw-palace-pillar"><div class="zw-palace-beam" style="height:'+Math.max(24, Math.min(96, Math.round(pastAxisBok)))+'px;"></div><div class="zw-palace-name">복덕궁 축 (Fortune)</div><div class="zw-palace-score">'+pastAxisBok+'</div></div>'
        + '<div class="zw-palace-pillar"><div class="zw-palace-beam" style="height:'+Math.max(24, Math.min(96, Math.round(pastAxisSpouse)))+'px;"></div><div class="zw-palace-name">부부궁 축 (Spouse)</div><div class="zw-palace-score">'+pastAxisSpouse+'</div></div>'
        + '<div class="zw-palace-pillar"><div class="zw-palace-beam" style="height:'+Math.max(24, Math.min(96, Math.round(pastAxisMove)))+'px;"></div><div class="zw-palace-name">천이궁 축 (Transition)</div><div class="zw-palace-score">'+pastAxisMove+'</div></div>'
        + '</div>'
        + '<div class="zw-scroll-block" style="margin-bottom:0;color:#ecdcc1;">질액궁 축 '+pastAxisIllness+'점은 배경 파동으로 기록되어, 감정 회복 속도와 카르마 소모 패턴을 보조 해석합니다.</div>'
        + '</div>'
        + '</div>'
        + '</div>';

      var hasTara = (mePal.spouse.bad.concat(youPal.spouse.bad).indexOf('타라') >= 0) || (mePal.meng.bad.concat(youPal.meng.bad).indexOf('타라') >= 0);
      var hasMoonchangHwagi = myHwagi.indexOf('문창') >= 0;
      var warningSignal = hasMoonchangHwagi
        ? '문창 화기 개입 시 말의 뉘앙스가 칼날처럼 전달되어 사소한 오해가 대형 균열로 번질 수 있습니다.'
        : (hasTara
          ? '타라 개입으로 타이밍 어긋남(답장 템포, 약속 실행 시점)이 누적되면 감정 회로가 쉽게 과열됩니다.'
          : '흉성 압력 구간에서는 기대치 미정렬이 갈등의 시작점이 됩니다.');
      var patch1 = hasTara
        ? '타이밍 어긋남이 보이면 10분 콜 대신 3줄 체크인 메시지(현재상태/요청/회복시간)를 고정 룰로 사용하세요.'
        : '갈등 당일 결론을 강요하지 말고 24시간 후 재대화 슬롯을 고정하세요.';
      var patch2 = hasMoonchangHwagi
        ? '문창 화기 구간에는 비난형 표현을 금지하고, 사실 1개 + 감정 1개 + 요청 1개 포맷으로만 대화하세요.'
        : '주 1회 15분 관계 로그(좋았던 점 1개/아쉬운 점 1개/다음 액션 1개)를 합의해 누적 오해를 차단하세요.';

      var bestCategory = catRows.slice().sort(function(a,b){ return b.val - a.val; })[0];
      var weakestCategory = catRows.slice().sort(function(a,b){ return a.val - b.val; })[0];

      var conflictTrigger = hasMoonchangHwagi
        ? '문창 화기 신호로 인해 같은 말도 날카롭게 받아들여질 수 있어, 표현 톤이 갈등을 키우는 촉발점이 될 수 있습니다.'
        : (hasTara
          ? '타라 개입으로 답장 템포·약속 실행 시점이 어긋날 때 신뢰 체감이 급격히 낮아지는 패턴이 나타날 수 있습니다.'
          : '흉성 압력 구간에서는 기대치 미정렬(역할/시간/우선순위)이 반복 충돌의 시작점이 될 수 있습니다.');

      var conflictScenario = weakestCategory.key + ' 점수(' + weakestCategory.val + '점)가 가장 낮아 이 축에서 갈등 체감이 커질 수 있습니다. '
        + '특히 ' + weakestCategory.key + ' 관련 이슈가 발생하면 작은 의견 차이도 누적되기 쉬우므로, 기준(우선순위·시간·표현 방식)을 먼저 합의하는 것이 안전합니다.';

      // Static report: consume the existing chart snapshots and scores; no new request or calculation.
      var starReading = {
        '자미': '관계의 중심을 잡고 책임을 맡으려는 성향입니다. 중요한 결정을 혼자 떠안기보다 상대의 결정권도 분명히 남겨두면 신뢰로 이어집니다.',
        '천기': '가능성을 비교하고 대화로 방향을 찾는 성향입니다. 생각이 자주 바뀌는 때에는 결론보다 검토 중인 이유를 먼저 나누는 편이 좋습니다.',
        '태양': '관심과 애정을 행동으로 드러내려는 성향입니다. 돕는 방식이 상대가 원하는 도움과 같은지 확인하면 과한 책임감을 줄일 수 있습니다.',
        '무곡': '실행과 약속의 이행을 중요하게 보는 성향입니다. 실질적인 배려에 감정을 설명하는 한마디를 더하면 차갑다는 오해를 줄일 수 있습니다.',
        '천동': '편안한 분위기와 정서적 안정을 소중히 여기는 성향입니다. 평화를 위해 불편함을 미루기보다 작은 요구부터 말하는 연습이 도움이 됩니다.',
        '염정': '관계의 기준과 감정의 진정성을 세밀하게 살피는 성향입니다. 확인하고 싶은 마음을 평가나 시험 대신 구체적인 질문으로 전해보세요.',
        '천부': '익숙한 생활과 자원을 안정적으로 지키려는 성향입니다. 변화가 필요한 순간에는 지켜야 할 것과 바꿔도 되는 것을 함께 구분해보세요.',
        '태음': '미묘한 감정과 일상의 배려를 깊이 받아들이는 성향입니다. 상대가 마음을 알아주기를 기다리기보다 원하는 표현을 짧게 알려주면 좋습니다.',
        '탐랑': '새로운 경험과 교류에서 활력을 얻는 성향입니다. 각자의 자유와 함께 보내는 시간의 기준을 정하면 호기심이 관계의 즐거움이 됩니다.',
        '거문': '말의 의미와 문제의 원인을 깊이 따져보는 성향입니다. 분석에 앞서 상대의 감정을 확인하면 설명이 논쟁으로 번지는 일을 줄일 수 있습니다.',
        '천상': '균형과 공정한 역할 분담을 중요하게 보는 성향입니다. 모두를 만족시키려 하기보다 자신의 한계와 요청도 대화에 포함해보세요.',
        '천량': '돌보고 보호하며 원칙을 지키려는 성향입니다. 조언하기 전에 상대가 공감과 해결책 중 무엇을 원하는지 묻는 것이 도움이 됩니다.',
        '칠살': '어려운 상황에서 빠르게 결단하고 독립적으로 움직이려는 성향입니다. 속도를 낼수록 함께 결정할 범위를 먼저 정하면 협력이 쉬워집니다.',
        '파군': '익숙한 방식을 바꾸고 새로운 선택을 시도하려는 성향입니다. 변화의 이유와 감당할 범위를 공유하면 상대도 준비할 시간을 가질 수 있습니다.'
      };
      var paragraph = function(text) { return '<p>'+safeText(text)+'</p>'; };
      var chapter = function(id, title, body) {
        return '<section class="fr-compat-chapter" id="zwCompatChapter-'+id+'"><h3>'+safeText(title)+'</h3>'+body+'</section>';
      };
      var palaceLine = function(label, key, meaning) {
        var format = function(p) { return starsTxt(p.main, '주성 없음') + (p.borrowedCount ? ' (차성 포함)' : ''); };
        return '<tr><th scope="row">'+safeText(label)+'<small>'+safeText(meaning)+'</small></th><td>'+safeText(format(mePal[key]))+'</td><td>'+safeText(format(youPal[key]))+'</td></tr>';
      };
      var coreReading = function(label, p) {
        var text = p.main.map(function(star) { return starReading[star] ? star+' — '+starReading[star] : ''; }).filter(Boolean);
        return '<h4>'+safeText(label)+'</h4>'+paragraph(text.join(' ') || '이 궁에는 직접 읽을 주성이 없습니다. 맞은편 궁과 보조성을 함께 살피며, 주성이 없다는 이유만으로 성향이나 관계를 약하다고 판단하지 않습니다.')
          +(p.borrowedCount ? paragraph('차성이 포함되어 있습니다. 차성은 맞은편 궁에서 참고하는 주성으로, 이 궁에 직접 자리한 별과 구분해서 읽습니다.') : '');
      };
      var category = function(key, body, action, evidence) {
        var row = catRows.find(function(c) { return c.key === key; });
        return '<section class="fr-compat-topic"><h4>'+safeText(key)+' <span>'+row.val+'점</span></h4>'
          +'<p class="fr-report-note">해석 근거 · '+safeText(evidence)+'</p>'+paragraph(body)
          +'<p><strong>함께 해볼 일</strong> '+safeText(action)+'</p></section>';
      };
      var chapters = [
        ['summary', '관계의 큰 흐름'], ['basis', '두 명반의 성향과 근거'],
        ['relationship', '사랑·생활·친구로서의 호흡'], ['work', '일과 협력의 방식'],
        ['repair', '갈등을 줄이는 대화'], ['timing', '시기의 흐름을 읽는 기준'],
        ['practice', '두 사람의 실천 계획'], ['reference', '참고 기록과 상징 이야기']
      ];
      var contents = '<nav class="fr-compat-contents" aria-label="궁합 리포트 목차">'+chapters.map(function(item, i) {
        return '<a href="#zwCompatChapter-'+item[0]+'">'+(i+1)+'. '+item[1]+'</a>';
      }).join('')+'</nav>';
      var overview = paragraph('두 사람은 '+bestCategory.key+'에서 상대적으로 호흡을 맞추기 쉽고, '+weakestCategory.key+'에서는 기대와 역할을 더 세밀하게 나눠볼 필요가 있는 조합입니다. 가장 낮은 항목도 관계의 실패를 뜻하지 않습니다. 서로의 실제 경험과 맞는 부분부터 대화의 출발점으로 삼아보세요.')
        +'<dl class="fr-compat-overview"><div><dt>함께 살릴 강점</dt><dd>'+safeText(bestCategory.key)+'</dd></div><div><dt>먼저 조율할 주제</dt><dd>'+safeText(weakestCategory.key)+'</dd></div><div><dt>종합 참고 지수</dt><dd>'+overallScore+' / 100</dd></div></dl>'
        +paragraph('이 지수는 별의 공통성, 보조성, 주의 요소와 내부 보정 규칙을 요약한 참고값입니다. 성공 확률이나 상대의 마음을 측정한 결과가 아니며, 한 점의 차이보다 근거와 조언을 함께 읽는 것이 중요합니다.');
      var basis = paragraph('명궁은 기본 성향, 부부궁은 친밀한 관계에서 기대하는 방식, 복덕궁은 마음이 쉬는 방식을 살펴보는 자리입니다. 같은 별이 있어도 행동이 같다는 뜻은 아니며, 다른 별의 조합 역시 서로 보완할 여지가 있습니다.')
        +'<div class="fr-compat-table-wrap"><table><caption>주요 궁의 주성 비교</caption><thead><tr><th scope="col">살펴볼 영역</th><th scope="col">'+userLabel+'</th><th scope="col">'+partnerLabel+'</th></tr></thead><tbody>'
        +palaceLine('명궁','meng','기본 성향')+palaceLine('부부궁','spouse','관계의 기대')+palaceLine('복덕궁','bok','정서와 휴식')+palaceLine('전택궁','home','생활 기반')+palaceLine('관록궁','job','일하는 방식')+palaceLine('재백궁','wealth','자원 관리')+'</tbody></table></div>'
        +coreReading('나의 명궁에서 읽는 성향', mePal.meng)+coreReading('상대의 명궁에서 읽는 성향', youPal.meng)
        +paragraph('관계의 기대를 읽는 부부궁 주성은 나 '+starsTxt(mePal.spouse.main, '주성 없음')+', 상대 '+starsTxt(youPal.spouse.main, '주성 없음')+'입니다. 기대하는 배려와 실제 표현 방식이 일치하는지는 대화로 확인해보세요.');
      var relationships = category('연애 궁합', loveDesc, '연락 횟수를 바로 정하기보다, 답이 늦을 때 각자가 어떻게 느끼는지 먼저 나눠보세요. 그 뒤 바쁜 날의 짧은 알림과 다시 연락할 시간을 합의해보세요.', '부부궁 50% · 명궁 30% · 복덕궁 20%')
        +category('결혼 궁합', marriageDesc, '집안일·공동 지출·혼자 쉬는 시간을 각각 적고, 부담이 한쪽으로 쏠리는 항목 하나를 조정해보세요. 생활의 합은 애정의 크기와 별개로 연습할 수 있습니다.', '부부궁 45% · 전택궁 35% · 복덕궁 20%')
        +category('친구 궁합', friendDesc, '자주 만나기와 편안하게 만나기 중 각자가 중요하게 여기는 것을 확인해보세요. 조언이 필요한 날인지, 들어주기만 바라는 날인지 묻는 것도 좋습니다.', '명궁 50% · 복덕궁 50%');
      var work = category('직장 궁합', workDesc, '일을 시작하기 전에 결정 담당자, 완료 기준, 중간 확인 시점을 정해보세요. 방식이 다를 때는 누가 옳은지보다 어디에서 인계할지에 초점을 맞춰보세요.', '관록궁 55% · 명궁 45%')
        +category('사업 궁합', '재백궁의 자원 관리, 관록궁의 실행 방식, 전택궁의 기반을 함께 살폈습니다. 재백궁 주성은 나 '+coreTxt(mePal.wealth)+', 상대 '+coreTxt(youPal.wealth)+'이며, 공통 주성은 '+starsTxt(bizSharedWealth)+'입니다. 별의 유사성은 재무 능력이나 수익을 보장하지 않습니다. 서로 다른 기준을 문서로 맞춰가는 과정이 중요합니다.', '지출 승인 범위, 정산 주기, 역할 변경 절차를 시작 전에 기록해보세요. 궁합 점수로 투자나 계약의 안전성을 판단하지 마세요.', '재백궁 45% · 관록궁 35% · 전택궁 20%');
      var repair = paragraph(conflictTrigger)+paragraph('현재 비교에서 '+weakestCategory.key+'가 상대적으로 낮게 나타났습니다. 이 영역에서 실제 불편이 있었는지 먼저 확인하고, 경험과 맞지 않는 설명은 억지로 적용하지 않아도 됩니다.')
        +'<h4>대화를 다시 시작하는 방법</h4>'+paragraph(patch1)+paragraph(patch2)
        +paragraph(myHwagi.length ? '나의 생년 사화 중 화기는 '+myHwagi.join(' · ')+'에서 확인됩니다. 화기는 집착이나 마찰을 점검하는 단서이며 상대가 이를 해결해준다는 보장은 아닙니다. 불편을 알아차렸을 때 기대·요청·경계를 직접 말하는 것이 중요합니다.' : '확인된 생년 사화 자료에서 나의 화기 주성을 특정하지 못했습니다. 이것만으로 갈등이 없거나 관계가 안전하다고 판단하지 않습니다.');
      var timing = paragraph('대한은 각자의 명반에서 약 10년 단위로 관심 영역을 읽는 틀입니다. 이 계산의 중첩값은 두 사람의 나이 구간을 비교하며, 출생연도가 다르면 같은 나이라도 같은 달력 연도가 아닙니다. 따라서 만남·결혼의 특정 연도를 예측하는 자료로 사용하지 않습니다.')
        +paragraph(periodOverlap.length ? '나이 구간의 비교 예: '+periodOverlap[0].st+'~'+periodOverlap[0].ed+'세에서 나의 '+periodOverlap[0].meP+'와 상대의 '+periodOverlap[0].youP+'가 겹칩니다. 각자가 그 나이에 중요하게 여길 생활 주제를 비교하는 참고 항목입니다.' : '주요 궁의 나이 구간에서 직접 겹치는 항목을 찾지 못했습니다. 서로의 시기가 맞지 않는다는 결론으로 확대하지 않습니다.')
        +paragraph('가까운 시기의 선택은 현재 일정과 현실 조건을 함께 살펴보세요. 이 리포트에는 두 사람의 특정 연도별 세운을 교차 검증한 결과가 포함되어 있지 않습니다.');
      var practice = '<ol class="fr-compat-practice"><li><strong>오늘 · 기대 하나씩 나누기</strong><p>관계에서 지키고 싶은 것과 바꾸고 싶은 것을 하나씩 적어보세요. 상대의 답을 바로 평가하지 않고, 이해한 내용을 되짚어주세요.</p></li><li><strong>이번 주 · 작은 약속 시험하기</strong><p>'+safeText(patch1)+'</p></li><li><strong>다음 대화 · 실제 변화 확인하기</strong><p>약속을 지키기 쉬웠는지, 부담은 없었는지 함께 확인하세요. 잘 맞지 않으면 더 작은 단위로 바꿔보세요.</p></li></ol>'
        +paragraph('두 명반의 차이는 누가 더 좋은 사람인지를 가르는 기준이 아닙니다. 서로를 바꾸려 하기보다 이해할 수 있는 언어와 지킬 수 있는 약속을 찾는 데 이 리포트를 활용해보세요.');
      var reference = '<details class="fr-report-reference"><summary>점수 구성과 입력 기준</summary>'
        +paragraph('분야별 원점수: 연애 '+loveScore+', 결혼 '+marriageScore+', 친구 '+friendScore+', 직장 '+workScore+', 사업 '+businessScore+'. 종합값은 이 순서로 30%·25%·14%·18%·13%를 반영하고 내부 보정값을 더한 뒤 범위를 제한합니다. 표시되는 분야별 지수에도 종합값과의 차이를 맞추는 보정이 들어갑니다.')
        +paragraph('보정 항목: 주성 성향 '+layer1Bonus+', 관계 기대와 성향 비교 '+layer2Bonus+', 사화 관련 보정 '+layer3Bonus+', 나이 구간 중첩 '+layer4Bonus+'. 이 수치는 서비스 내부 규칙이며 전통 자미두수의 공인된 관계 점수가 아닙니다.')
        +paragraph('상대 출생지: '+cityLabel+' · 입력 시각 '+bTime+' · 보정 시각 '+z2(correctedHour)+':'+z2(correctedMinute)+'. '+correctionMsg)
        +paragraph('정확한 출생 시각에 따라 명궁과 별 배치가 달라질 수 있습니다. 정오 12:00이 기본 입력값으로 남아 있다면 실제 시각인지 확인해 주세요. 상대 성별 입력만으로 상대의 대한 방향까지 검증한 결과로 보지는 않습니다.')+'</details>'
        +'<details class="fr-report-reference fr-compat-symbolic"><summary>상징으로 읽는 인연 이야기</summary>'+paragraph('아래는 별의 상징을 바탕으로 구성한 창작 이야기입니다. 실제 전생·장소·관계의 사실을 확인한 기록이 아니며, 인연 점수도 증거가 아닙니다. 앞의 명반 근거와 구분해 가볍게 읽어보세요.')+pastLifeHtml+'</details>';
      outEl.innerHTML = '<article class="fr-compat-report"><header class="fr-compat-report-header"><h2>'+userLabel+'과 '+partnerLabel+'의 자미두수 궁합</h2>'
        +paragraph('두 명반의 근거를 따라 읽는 관계 종합 리포트')+'</header>'+contents
        +chapter('summary', '1. 관계의 큰 흐름', overview)+chapter('basis', '2. 두 명반의 성향과 근거', basis)
        +chapter('relationship', '3. 사랑·생활·친구로서의 호흡', relationships)+chapter('work', '4. 일과 협력의 방식', work)
        +chapter('repair', '5. 갈등을 줄이는 대화', repair)+chapter('timing', '6. 시기의 흐름을 읽는 기준', timing)
        +chapter('practice', '7. 두 사람의 실천 계획', practice)+chapter('reference', '8. 참고 기록과 상징 이야기', reference)+'</article>';

      return {
        html: outEl.innerHTML,
        correctionMsg: correctionMsg,
        correctedTime: z2(correctedHour) + ':' + z2(correctedMinute),
        userLabel: userLabel,
        partnerLabel: partnerLabel,
        archive: {
          myMingPalace: starsTxt(mePal.meng.main, '주성 없음'),
          partnerMingPalace: starsTxt(youPal.meng.main, '주성 없음'),
          mySpousePalace: starsTxt(mePal.spouse.main, '주성 없음'),
          partnerSpousePalace: starsTxt(youPal.spouse.main, '주성 없음'),
          score: overallScore,
          loveScore: loveScore,
          marriageScore: marriageScore,
          friendScore: friendScore,
          workScore: workScore,
          businessScore: businessScore,
          pastLifeScore: pastLifeScore
        },
        llm: {
          overallScore: overallScore,
          categoryScores: catRows.map(function (c) { return { key: c.key, val: c.val }; }),
          mingPalace: {
            me: { main: mePal.meng.main, aux: mePal.meng.aux },
            partner: { main: youPal.meng.main, aux: youPal.meng.aux }
          },
          spousePalace: {
            me: { main: mePal.spouse.main, aux: mePal.spouse.aux },
            partner: { main: youPal.spouse.main, aux: youPal.spouse.aux }
          },
          scores: { love: loveScore, marriage: marriageScore, friend: friendScore, work: workScore, business: businessScore, pastLife: pastLifeScore }
        }
      };
}
