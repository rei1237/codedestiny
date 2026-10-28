// 에너지 원정 리포트(rpt_energyCoordCard) 유료 렌더러 정본. 브라우저로 내려가지 않는다.
// js/saju-engine-tarot-sukuyo-quantum.js 에서 그대로 옮겼다. scripts/extract-saju-section-runtime.mjs 가
// 셸 헬퍼(js/saju-engine.js 의 ENERGY_COORD_DB·오행 표)와 함께 runtime.generated.mjs 로 묶는다.
// 바뀐 곳은 현재 시각 두 줄뿐이다 — 요청 시각은 report.js 가 ctx.now 로 넘긴다(원본은 new Date()·Date.now()).
// 오늘 날짜는 서버 시간대와 무관하게 한국 시각(KST)의 연·월·일로 읽는다(원본은 브라우저 지역 시각).
function _energyNowMs(){ return ctx.now instanceof Date ? ctx.now.getTime() : Date.now(); }
function _energyToday(){ var k=new Date(_energyNowMs()+9*60*60*1000); return new Date(k.getUTCFullYear(),k.getUTCMonth(),k.getUTCDate(),k.getUTCHours(),k.getUTCMinutes()); }
function renderEnergyCoord(natal){
  var area=document.getElementById('energyCoordSection');
  var card=document.getElementById('energyCoordCard');
  if(!area||!card)return;
  natal=natal||{counts:{wood:0,fire:0,earth:0,metal:0,water:0}};

  var pw=G_POWER,jg=G_JONG;
  var counts=natal.counts||{wood:0,fire:0,earth:0,metal:0,water:0};
  var els=['wood','fire','earth','metal','water'];

  var yongshinList = [];
  var kijishinList = [];
  if(jg&&jg.isJong){
    yongshinList = [jg.dominant, jg.parEl].filter(Boolean);
    kijishinList = [KE[jg.dominant], SHENG[jg.dominant]].filter(Boolean);
  } else if(pw) {
    yongshinList = pw.yongshin || [];
    kijishinList = pw.kijishin || [];
  }

  var target = yongshinList[0] || els.slice().sort(function(a,b){return (counts[a]||0)-(counts[b]||0);})[0];
  var db=ENERGY_COORD_DB[target]||ENERGY_COORD_DB.water;
  var badgeClass='ec-badge-'+target;

  var total=0;
  els.forEach(function(e){total+=(counts[e]||0);});
  var lacking=total>0?Math.round((1-(counts[target]||0)/total)*100):80;
  if(lacking>97)lacking=97;
  var targetRatio=total>0?Math.round(((counts[target]||0)/total)*100):0;
  var strongestEl=els.slice().sort(function(a,b){return (counts[b]||0)-(counts[a]||0);})[0];
  var weakestEl=els.slice().sort(function(a,b){return (counts[a]||0)-(counts[b]||0);})[0];

  function elText(el){ return el ? ((EL_E[el]||'')+(EL_K[el]||el)) : '없음'; }
  var yongText = elText(yongshinList[0]);
  var heeText = elText(yongshinList[1]);
  var giText = elText(kijishinList[0]);
  var gooText = elText(kijishinList[1]);

  var avoidDirs = kijishinList.map(function(e){ return ENERGY_COORD_DB[e] ? ENERGY_COORD_DB[e].direction : ''; }).filter(Boolean).join(', ');
  if(!avoidDirs) avoidDirs = '뚜렷한 경고 없음';
  var avoidDirNarrative = avoidDirs==='뚜렷한 경고 없음'
    ? '현재 원국에서는 특정 방위보다 일정 강도와 회복 시간을 조절하는 쪽이 더 중요합니다.'
    : avoidDirs+' 방향성은 장거리 이동에서 에너지상 피로도가 커질 수 있으니, 절대 금지가 아니라 일정·동선·회복 시간을 넉넉히 두는 조절 포인트로 보세요.';
  var analysisBasis = yongshinList.length
    ? '용신과 희신이 먼저 길을 열고, 부족한 오행의 빈자리를 함께 살폈습니다.'
    : '타고난 오행의 빈자리와 오늘의 계절 흐름을 중심으로 읽었습니다.';

  var today = _energyToday();
  function getSeasonNeed(month){
    if(month>=3&&month<=5) return {el:'wood',label:_sajuQuantumText("sq_3024_prop_label"),note:'생장·확장 기운이 강해 목(木) 보강 효율이 높습니다.'};
    if(month>=6&&month<=7) return {el:'fire',label:_sajuQuantumText("sq_3025_prop_label"),note:'활동·발산 기운이 강해 화(火) 조절/보강이 중요합니다.'};
    if(month>=8&&month<=9) return {el:'earth',label:_sajuQuantumText("sq_3026_prop_label"),note:'중심·소화·안정 기운이 핵심이라 토(土) 보정이 효과적입니다.'};
    if(month>=10&&month<=11) return {el:'metal',label:_sajuQuantumText("sq_3027_prop_label"),note:'정리·결단 기운이 올라가 금(金) 보강이 성과로 이어집니다.'};
    return {el:'water',label:_sajuQuantumText("sq_3028_prop_label"),note:'저장·회복 기운이 커져 수(水) 보강 체감이 큽니다.'};
  }
  var seasonNeed = getSeasonNeed(today.getMonth()+1);
  var primaryNeedText = elText(target);
  var seasonNeedText = elText(seasonNeed.el);
  var strongestText = elText(strongestEl);
  var weakestText = elText(weakestEl);
  var seasonConflictsKijishin = kijishinList.indexOf(seasonNeed.el)>=0;
  var seasonModeLabel = seasonConflictsKijishin ? '시기 조절 오행' : '시기 보완 오행';
  var seasonConflictAction = seasonNeed.el==='fire'
    ? '화(火)의 과열을 조절하고 필요한 만큼만 튜닝'
    : seasonNeedText+'의 과밀을 낮추고 필요한 만큼만 튜닝';
  var seasonNeedGuide = seasonConflictsKijishin
    ? seasonNeedText+'가 기신/구신 축과 겹칩니다. 이번 달은 '+seasonConflictAction+'하는 방식이 더 안전합니다.'
    : seasonNeed.note;
  var timingNarrative = seasonConflictsKijishin
    ? '사주 원국의 기본 보완축은 '+primaryNeedText+'입니다. 현재 시기에는 '+seasonNeedText+'가 강하게 올라오지만 기신/구신과 충돌하므로, '+primaryNeedText+'로 중심을 세우고 '+seasonConflictAction+'하세요.'
    : seasonNeed.el===target
    ? '사주 원국의 필요 오행과 현재 시기 오행이 일치합니다. 같은 기운을 집중 보완하면 운의 체감 상승 속도가 빠릅니다.'
    : '사주 원국의 기본 보완축은 '+primaryNeedText+', 현재 시기 미세조정축은 '+seasonNeedText+'입니다. 기본 체력은 '+primaryNeedText+'로 채우고, 월간 컨디션은 '+seasonNeedText+'로 튜닝하는 이중 전략이 유리합니다.';

  var ENERGY_ENV_PLAN = {
    wood:{
      env:'숲·수목원·초록 동선, 통풍이 잘되고 습윤한 동향 공간',
      benefits:['정체된 기운을 뚫어 실행력과 성장 운을 끌어올림','관계 확장·기획력·창의적 발상 회복','간담 계열 피로 누적 완화에 도움'],
      tip:'주 1회 이상 숲길 걷기 + 아침 햇빛 루틴을 붙이면 목(木) 기운이 안정적으로 축적됩니다.'
    },
    fire:{
      env:'남향 채광, 활기 있는 도시/축제/야경, 체온을 올리는 활동 공간',
      benefits:['자신감·표현력·사회적 존재감 강화','의사결정 속도와 추진 동력 상승','침체된 감정 회로를 데워 대인운 활성'],
      tip:'햇빛 노출 시간 확보 + 가벼운 유산소를 병행하면 화(火) 기운이 과열 없이 잘 순환합니다.'
    },
    earth:{
      env:'한옥·황토·온천·산책 중심의 안정 공간, 루틴이 유지되는 생활 환경',
      benefits:['집중력·지속력·재정/생활 안정감 강화','소화·수면 리듬 안정으로 컨디션 복원','흔들리는 판단을 중심축으로 다시 고정'],
      tip:'식사·수면 시각을 고정하고 주말에 흙길/산책 루틴을 넣으면 토(土) 기운이 단단해집니다.'
    },
    metal:{
      env:'정돈된 미니멀 공간, 암석/금속 구조물, 서늘하고 건조한 정리 환경',
      benefits:['결단력·분별력·우선순위 정리 능력 강화','불필요한 관계/업무를 정리해 성과 집중','호흡과 리듬이 정돈되며 멘탈 선명도 상승'],
      tip:'정리정돈 20분 + 체크리스트 기반 실행 습관이 금(金) 기운을 빠르게 끌어올립니다.'
    },
    water:{
      env:'물가·호수·해안·안개 지형, 조용하고 깊은 몰입이 가능한 저자극 환경',
      benefits:['회복력·직관력·내면 통찰 강화','불안/과열을 식혀 판단의 깊이 확보','지식 흡수력과 장기 전략 사고력 상승'],
      tip:'물가 산책 + 저녁 디지털 디톡스를 병행하면 수(水) 기운이 안정적으로 충전됩니다.'
    }
  };

  var seedStr = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate()+'-'+(USER_NAME||'');
  var seed = 0;
  for(var i=0;i<seedStr.length;i++){
    seed += seedStr.charCodeAt(i);
  }
  seed += Math.floor(_energyNowMs()/60000);

  function destinationKey(dest){
    return dest && (dest.id || (dest.element+'|'+dest.countryType+'|'+dest.name));
  }
  function seededNoise(key, s){
    var str=String(key||'')+'|'+s;
    var h=0;
    for(var n=0;n<str.length;n++)h=((h<<5)-h)+str.charCodeAt(n);
    return Math.abs(Math.sin(h))*7;
  }
  function readRecentDestinationIds(){
    try{
      var raw=localStorage.getItem('energyCoordRecentDestinationsV1');
      var parsed=raw?JSON.parse(raw):[];
      return Array.isArray(parsed)?parsed.slice(0,60):[];
    }catch(_e){return [];}
  }
  function rememberRecentDestinations(list){
    try{
      var ids=list.map(destinationKey).filter(Boolean);
      var prev=readRecentDestinationIds();
      var next=ids.concat(prev.filter(function(id){return ids.indexOf(id)<0;})).slice(0,60);
      localStorage.setItem('energyCoordRecentDestinationsV1',JSON.stringify(next));
    }catch(_e){}
  }
  function hashEnergyRouletteKey(raw){
    var str=String(raw||'anonymous');
    var h=2166136261;
    for(var idx=0;idx<str.length;idx++){
      h^=str.charCodeAt(idx);
      h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);
    }
    return (h>>>0).toString(36);
  }
  function getEnergyRouletteStorageKey(){
    var raw='';
    try{
      var manager=window.DestinyProfileManager&&window.DestinyProfileManager.storage;
      var current=manager&&typeof manager.current==='function'?manager.current():null;
      if(current&&current.id)raw='profile|'+current.id;
    }catch(_e){}
    if(!raw){
      try{
        var active=window.__cdActiveBirthProfile||{};
        var b=active.birth||{};
        var activeGender=(typeof GENDER!=='undefined'?GENDER:'')||((typeof window!=='undefined'&&window._gender)||'');
        raw=['birth',b.year||'',b.month||'',b.day||'',b.hour||'',b.minute||'',active.gender||activeGender].join('|');
      }catch(_e2){}
    }
    if(!raw){
      var birthDate=(document.getElementById('birthDate')||{}).value||'';
      var birthHour=(document.getElementById('birthHour')||{}).value||'';
      var birthMinute=(document.getElementById('birthMinute')||{}).value||'';
      var safeGender=(typeof GENDER!=='undefined'?GENDER:'')||((typeof window!=='undefined'&&window._gender)||'');
      raw=['form',birthDate,birthHour,birthMinute,safeGender].join('|');
    }
    return 'code-destiny-energy-roulette-'+hashEnergyRouletteKey(raw);
  }
  var rouletteStorageKey=getEnergyRouletteStorageKey();
  function readRouletteRecentIds(){
    try{
      var raw=localStorage.getItem(rouletteStorageKey);
      var parsed=raw?JSON.parse(raw):[];
      return Array.isArray(parsed)?parsed.slice(0,7):[];
    }catch(_e){return [];}
  }
  function rememberRouletteDestination(dest){
    try{
      var id=destinationKey(dest);
      if(!id)return;
      var prev=readRouletteRecentIds();
      var next=[id].concat(prev.filter(function(rowId){return rowId!==id;})).slice(0,7);
      localStorage.setItem(rouletteStorageKey,JSON.stringify(next));
    }catch(_e){}
  }
  var recentIds=readRecentDestinationIds();
  var supportElements=[];
  function addSupportElement(el){
    if(!el||el===target||kijishinList.indexOf(el)>=0||supportElements.indexOf(el)>=0)return;
    supportElements.push(el);
  }
  addSupportElement(yongshinList[1]);
  addSupportElement(weakestEl);
  if(!seasonConflictsKijishin)addSupportElement(seasonNeed.el);
  els.forEach(function(el){if(supportElements.length<2)addSupportElement(el);});

  var preferredTripStylesByElement={
    wood:['slow_trip','retreat','creative'],
    fire:['romantic','creative','adventure'],
    earth:['slow_trip','retreat','one_night'],
    metal:['creative','day_trip','slow_trip'],
    water:['retreat','slow_trip','romantic']
  };
  var preferredTripStyles=preferredTripStylesByElement[target]||['slow_trip','retreat'];
  function elementDeficiencyBonus(el){
    var ratio=total>0?((counts[el]||0)/total):0;
    var bonus=Math.round((1-ratio)*24);
    if(el===weakestEl)bonus+=16;
    return bonus;
  }
  function allDestinations(countryType){
    var key=countryType==='domestic'?'domestic':'global';
    var rows=[];
    els.forEach(function(el){
      var bucket=(ENERGY_COORD_DB[el]&&ENERGY_COORD_DB[el][key])||[];
      bucket.forEach(function(dest){rows.push(dest);});
    });
    return rows;
  }
  function fallbackDestinations(countryType){
    var key=countryType==='domestic'?'domestic':'global';
    var primary=((ENERGY_COORD_DB[target]||{})[key]||[]);
    var water=((ENERGY_COORD_DB.water||{})[key]||[]);
    return primary.concat(water).filter(function(dest,idx,arr){
      var id=destinationKey(dest);
      return id&&arr.findIndex(function(row){return destinationKey(row)===id;})===idx;
    });
  }
  function scoreDestination(dest, countryType, offset){
    var el=dest.element||target;
    var baseElementMatchScore=el===target?70:(supportElements.indexOf(el)>=0?30:8);
    var yongshinBonus=el===yongshinList[0]?28:0;
    var heeshinBonus=el===yongshinList[1]?18:0;
    var deficiencyBonus=elementDeficiencyBonus(el);
    var seasonalAdjustment=el===seasonNeed.el?(seasonConflictsKijishin?-18:14):0;
    var tripStyleMatchBonus=preferredTripStyles.indexOf(dest.tripStyle)>=0?9:0;
    var gishinPenalty=el===kijishinList[0]?90:0;
    var gushinPenalty=el===kijishinList[1]?60:0;
    var recentlyShownPenalty=recentIds.indexOf(destinationKey(dest))>=0?42:0;
    var score=baseElementMatchScore+yongshinBonus+heeshinBonus+deficiencyBonus+seasonalAdjustment+tripStyleMatchBonus-gishinPenalty-gushinPenalty-recentlyShownPenalty+seededNoise(destinationKey(dest),seed+offset);
    var reason=[];
    if(el===target)reason.push('가장 먼저 채울 회복축');
    else if(supportElements.indexOf(el)>=0)reason.push('중심을 부드럽게 받치는 보조축');
    if(el===yongshinList[0])reason.push('용신의 숨을 살리는 자리');
    if(el===yongshinList[1])reason.push('희신이 뒤에서 받쳐주는 자리');
    if(el===weakestEl)reason.push('비어 있는 기운을 채우는 자리');
    if(el===seasonNeed.el)reason.push(seasonConflictsKijishin?'계절 기운을 과하게 밀지 않고 조율할 자리':'지금 계절과 호흡이 맞는 자리');
    if(gishinPenalty||gushinPenalty)reason.push('강하게 오래 머물기보다 짧고 가볍게 다룰 자리');
    if(recentlyShownPenalty)reason.push('최근에 이미 열린 좌표라 다른 곳을 먼저 보아도 좋은 자리');
    return Object.assign({},dest,{
      score:Math.round(score),
      matchLabel:reason.join(' · ')||'균형을 조용히 받쳐주는 자리',
      scoreParts:{
        baseElementMatchScore:baseElementMatchScore,
        yongshinBonus:yongshinBonus,
        heeshinBonus:heeshinBonus,
        deficiencyBonus:deficiencyBonus,
        seasonalAdjustment:seasonalAdjustment,
        tripStyleMatchBonus:tripStyleMatchBonus,
        gishinPenalty:gishinPenalty,
        gushinPenalty:gushinPenalty,
        recentlyShownPenalty:recentlyShownPenalty
      },
      countryType:countryType
    });
  }
  function pickEnergyDestinations(countryType, offset){
    var rows=allDestinations(countryType);
    if(!rows.length)rows=fallbackDestinations(countryType);
    var scored=rows.map(function(dest){return scoreDestination(dest,countryType,offset);}).sort(function(a,b){return b.score-a.score;});
    var primary=scored.filter(function(dest){return dest.element===target&&dest.score>-20;});
    var support=scored.filter(function(dest){return dest.element!==target&&supportElements.indexOf(dest.element)>=0&&dest.score>-20;});
    var picked=[];
    function push(dest){
      if(!dest)return;
      var id=destinationKey(dest);
      if(!id||picked.some(function(row){return destinationKey(row)===id;}))return;
      picked.push(dest);
    }
    primary.slice(0,2).forEach(push);
    support.slice(0,1).forEach(push);
    primary.slice(2,4).forEach(push);
    support.slice(1,2).forEach(push);
    scored.forEach(function(dest){if(picked.length<6)push(dest);});
    if(picked.length<5){
      fallbackDestinations(countryType).map(function(dest){return scoreDestination(dest,countryType,offset+200);}).forEach(function(dest){if(picked.length<6)push(dest);});
    }
    return picked.slice(0,Math.max(5,Math.min(6,picked.length)));
  }

  var domList = pickEnergyDestinations('domestic', 11);
  var globList = pickEnergyDestinations('global', 101);
  rememberRecentDestinations(domList.concat(globList));
  var envPlan = ENERGY_ENV_PLAN[target] || ENERGY_ENV_PLAN.water;
  var benefitHtml = (envPlan.benefits||[]).map(function(b){
    return '<li style="margin:2px 0;">'+b+'</li>';
  }).join('');
  var focusDomestic = domList.length ? domList.map(function(l){return l.name;}).join(' · ') : '가까운 자연 환경';
  var focusGlobal = globList.length ? globList.map(function(l){return l.name;}).join(' · ') : '해외 자연/도시 에너지 포인트';
  var expeditionPlaybook = {
    wood:['첫 코스는 숲길·정원처럼 초록 밀도가 높은 곳으로 잡기','오전에는 걷고 오후에는 카페/서점에서 아이디어 정리하기','사진은 수직선·나무·새싹처럼 성장감 있는 장면 위주로 남기기'],
    fire:['낮에는 햇빛을 받되 무리한 일정은 피하고 물 휴식 끼워넣기','저녁에는 야경·공연·시장처럼 사람 온기가 있는 곳으로 이동하기','감정이 들뜨면 즉흥 소비보다 짧은 체험 하나만 선택하기'],
    earth:['한 번에 많이 이동하기보다 한 지역을 깊게 머무르기','식사·온천·한옥·흙길 산책처럼 몸이 안정되는 코스 넣기','여행 중 결정은 기록하고 다음날 한 번 더 확인하기'],
    metal:['동선을 짧고 선명하게 짜고 예약/시간표를 먼저 정리하기','미술관·건축·전망대처럼 구조가 또렷한 공간을 우선하기','짐과 사진을 바로 정리해 머릿속까지 가볍게 만들기'],
    water:['물가·호수·해안처럼 시야가 트이는 곳에서 오래 머무르기','일정 사이에 혼자 조용히 걷는 시간을 반드시 넣기','밤에는 과한 자극보다 음악·독서·따뜻한 음료로 회복하기']
  };
  var playbookItems = (expeditionPlaybook[target] || expeditionPlaybook.water).slice();
  if(seasonConflictsKijishin){
    playbookItems.unshift(seasonConflictAction+'을 원정의 안전장치로 먼저 세우기');
  }
  var playbookHtml = playbookItems.slice(0,3).map(function(item){
    return '<li style="margin:2px 0;">'+item+'</li>';
  }).join('');
  var monthlyTravelPlans=[
    {month:1,el:'water',label:_sajuQuantumText("sq_3287_prop_label"),tone:'차가운 물기운이 마음을 낮추고, 긴 호흡의 휴식 좌표가 잘 열립니다.',styles:['retreat','slow_trip'],time:'해 질 무렵, 조용한 물가나 실내 온기 사이를 천천히 오가는 일정',mission:'물가나 창가에서 올해 놓을 짐 하나를 적고 접어두세요.'},
    {month:2,el:'wood',label:_sajuQuantumText("sq_3288_prop_label"),tone:'목(木)의 첫 숨이 올라오며, 산책과 정원 동선에서 다시 시작할 힘이 돋아납니다.',styles:['day_trip','slow_trip','creative'],time:'오전 9~11시, 빛이 부드러운 숲길과 수목원',mission:'여행 노트 첫 장에 새로 키울 계획 한 줄을 남기세요.'},
    {month:3,el:'wood',label:_sajuQuantumText("sq_3289_prop_label"),tone:'초록의 결이 강해져 관계, 공부, 창작의 방향이 또렷하게 자랍니다.',styles:['slow_trip','creative'],time:'오전 산책 뒤 오후 카페나 서점으로 이어지는 동선',mission:'새로 만나고 싶은 사람, 배우고 싶은 주제, 키우고 싶은 습관을 하나씩 적으세요.'},
    {month:4,el:'earth',label:_sajuQuantumText("sq_3290_prop_label"),tone:'흙의 기운이 몸의 리듬을 붙들어 생활과 마음의 중심을 다시 세웁니다.',styles:['one_night','slow_trip'],time:'식사와 산책 시간이 흔들리지 않는 1박 2일 일정',mission:'걷는 속도를 늦추고, 이번 달 반드시 지킬 루틴 하나를 정하세요.'},
    {month:5,el:'fire',label:_sajuQuantumText("sq_3291_prop_label"),tone:'화(火)의 온기가 자신감과 표현력을 데우니, 밝은 전망과 활기 있는 풍경이 운을 깨웁니다.',styles:['romantic','creative','day_trip'],time:'일출 직후 또는 해 질 무렵, 빛의 방향이 선명한 자리',mission:'하고 싶은 말을 한 문장으로 정리하고 마음속으로 또렷하게 읽으세요.'},
    {month:6,el:'fire',label:_sajuQuantumText("sq_3292_prop_label"),tone:'뜨거운 기운이 강해지는 만큼, 빛과 물 휴식을 함께 둔 여행이 가장 맑게 흐릅니다.',styles:['romantic','adventure','day_trip'],time:'낮 일정은 짧게, 저녁 풍경은 선명하게 여는 코스',mission:'즐거운 일정 하나를 고르고, 그 뒤에는 반드시 조용한 회복 시간을 붙이세요.'},
    {month:7,el:'earth',label:_sajuQuantumText("sq_3293_prop_label"),tone:'여름의 열이 흙으로 내려앉으며, 온천·한옥·오래된 골목에서 안정감이 차오릅니다.',styles:['retreat','one_night','slow_trip'],time:'오전 10시~오후 2시, 식사와 산책을 안정적으로 묶는 일정',mission:'휴식 시간을 일정표에 먼저 넣고 나머지 동선을 맞추세요.'},
    {month:8,el:'metal',label:_sajuQuantumText("sq_3294_prop_label"),tone:'금(金)의 선명함이 올라와 미술관, 건축, 전망 좌표에서 판단의 칼날이 맑아집니다.',styles:['creative','day_trip','slow_trip'],time:'오후 2~5시, 감각과 기준이 또렷한 시간',mission:'여행 사진은 9장만 남기고, 이번 달 덜어낼 일 하나를 고르세요.'},
    {month:9,el:'metal',label:_sajuQuantumText("sq_3295_prop_label"),tone:'차분한 정리 기운이 짙어져, 복잡한 마음을 단순한 기준으로 되돌리기 좋습니다.',styles:['creative','retreat','day_trip'],time:'사람이 적은 평일 오후, 조용한 전시와 전망 동선',mission:'나에게 남길 것과 보낼 것을 각각 한 가지씩 적으세요.'},
    {month:10,el:'water',label:_sajuQuantumText("sq_3296_prop_label"),tone:'수(水)의 기운이 차오르며, 강과 바다와 호수에서 마음의 파동이 낮아집니다.',styles:['retreat','slow_trip'],time:'해 질 무렵부터 초저녁, 말수를 줄이고 오래 머무는 일정',mission:'감정 한 줄과 사실 한 줄을 나누어 기록하세요.'},
    {month:11,el:'water',label:_sajuQuantumText("sq_3297_prop_label"),tone:'저장과 통찰의 흐름이 짙어져, 조용한 체류와 물가 산책이 직관을 비춥니다.',styles:['retreat','slow_trip','romantic'],time:'초저녁 물가 산책 뒤 따뜻한 차로 마무리하는 코스',mission:'결론을 서두르지 말고 마음이 가라앉는 시간을 먼저 주세요.'},
    {month:12,el:'earth',label:_sajuQuantumText("sq_3298_prop_label"),tone:'흩어진 기운을 흙으로 다시 모으며, 오래된 장소와 따뜻한 체류가 운의 바닥을 다집니다.',styles:['one_night','retreat','slow_trip'],time:'짧은 이동, 따뜻한 식사, 충분한 수면이 이어지는 일정',mission:'올해 고마웠던 장소나 사람을 하나 떠올리고 조용히 감사의 마음을 남기세요.'}
  ];
  function getMonthlyTravelPlan(month){
    var m=parseInt(month,10);
    if(!isFinite(m)||m<1||m>12)m=today.getMonth()+1;
    return monthlyTravelPlans[m-1]||monthlyTravelPlans[today.getMonth()];
  }
  var currentMonthlyTravelPlan=getMonthlyTravelPlan(today.getMonth()+1);

  function escapeHtml(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function formatDestinationCoord(dest){
    if(dest.coord)return dest.coord;
    if(Number.isFinite(Number(dest.latitude))&&Number.isFinite(Number(dest.longitude))){
      return Math.abs(Number(dest.latitude)).toFixed(4)+'°'+(Number(dest.latitude)>=0?'N':'S')+' '+Math.abs(Number(dest.longitude)).toFixed(4)+'°'+(Number(dest.longitude)>=0?'E':'W');
    }
    return '좌표 미기록';
  }
  var tripStyleLabels={
    day_trip:'당일 회복 산책',
    one_night:'하룻밤 리셋 여행',
    slow_trip:'느린 호흡의 체류',
    retreat:'고요한 회복 리트릿',
    adventure:'움직이며 여는 원정',
    romantic:'감정을 데우는 동행',
    creative:'영감을 깨우는 창작 여행'
  };
  var elementUiPalette={
    wood:{soft:'rgba(16,185,129,.14)',mid:'rgba(5,150,105,.28)',deep:'rgba(6,78,59,.88)',line:'rgba(167,243,208,.36)',text:'#d1fae5',chip:'#a7f3d0'},
    fire:{soft:'rgba(251,113,133,.14)',mid:'rgba(249,115,22,.24)',deep:'rgba(127,29,29,.84)',line:'rgba(254,205,211,.36)',text:'#ffe4e6',chip:'#fecdd3'},
    earth:{soft:'rgba(245,158,11,.14)',mid:'rgba(120,113,108,.24)',deep:'rgba(69,48,28,.84)',line:'rgba(253,230,138,.34)',text:'#fef3c7',chip:'#fde68a'},
    metal:{soft:'rgba(148,163,184,.16)',mid:'rgba(100,116,139,.28)',deep:'rgba(39,39,42,.88)',line:'rgba(226,232,240,.34)',text:'#f8fafc',chip:'#e2e8f0'},
    water:{soft:'rgba(56,189,248,.14)',mid:'rgba(99,102,241,.24)',deep:'rgba(30,41,59,.9)',line:'rgba(186,230,253,.36)',text:'#e0f2fe',chip:'#bae6fd'}
  };
  var uiPalette=elementUiPalette[target]||elementUiPalette.water;
  var rouletteAvoidByElement={
    wood:'목표 없이 코스를 계속 늘리며 체력을 흩뜨리는 행동',
    fire:'들뜬 기분으로 밤 일정을 과열시키거나 즉흥 소비를 키우는 행동',
    earth:'한 자리에서 너무 오래 머물며 몸의 흐름을 무겁게 만드는 행동',
    metal:'계획과 평가에만 매달려 장소의 감각을 놓치는 행동',
    water:'생각을 끝없이 깊게 파고들며 결론 없는 걱정으로 빠지는 행동'
  };
  function rouletteAvoidAction(dest){
    if(dest.avoidFor&&dest.avoidFor.length)return dest.avoidFor[0];
    return rouletteAvoidByElement[dest.element]||'몸이 피곤한데도 일정을 밀어붙이는 행동';
  }
  function scoreRouletteDestination(dest, offset, rouletteRecentIds){
    var countryType=dest.countryType==='global'?'global':'domestic';
    var scored=scoreDestination(dest,countryType,offset);
    var el=scored.element||target;
    var id=destinationKey(scored);
    var isRecent=rouletteRecentIds.indexOf(id)>=0;
    var isKijishin=kijishinList.indexOf(el)>=0;
    var weight=Math.max(4,scored.score+96);
    if(el===yongshinList[0])weight*=1.45;
    if(el===yongshinList[1])weight*=1.28;
    if(el===weakestEl)weight*=1.35;
    if(isKijishin)weight*=seasonNeed.el===el?0.22:0.1;
    if(isRecent)weight*=0.18;
    var reason=scored.matchLabel||'사주 흐름과 지형의 결이 차분히 맞닿는 자리';
    if(isKijishin)reason='오늘은 이 기운을 크게 보강하기보다, 짧게 스치며 과열과 피로를 조율하는 방식이 어울립니다.';
    if(isRecent)reason+=' 이미 가까운 시간에 한 번 열린 좌표라면, 이번에는 일정의 강도를 낮춰 가볍게 받아들이세요.';
    return Object.assign({},scored,{
      rouletteWeight:Math.max(1,Math.round(weight)),
      rouletteReason:reason
    });
  }
  function scoreMonthlyTravelDestination(dest, offset, rouletteRecentIds){
    var scored=scoreRouletteDestination(dest,offset,rouletteRecentIds);
    var plan=currentMonthlyTravelPlan;
    var monthlyWeight=scored.rouletteWeight||1;
    if(scored.element===plan.el)monthlyWeight*=1.52;
    if((plan.styles||[]).indexOf(scored.tripStyle)>=0)monthlyWeight*=1.28;
    if(scored.element===target)monthlyWeight*=1.18;
    if(kijishinList.indexOf(scored.element)>=0)monthlyWeight*=0.42;
    return Object.assign({},scored,{
      monthlyPlan:plan,
      rouletteWeight:Math.max(1,Math.round(monthlyWeight)),
      rouletteReason:plan.month+'월의 '+(EL_E[plan.el]||'')+(EL_K[plan.el]||plan.el)+' 기운과 '+(scored.matchLabel||'장소의 결')+'이 맞물려 이달의 이동 좌표로 떠오릅니다.'
    });
  }
  function getRouletteRows(mode){
    if(mode==='domestic')return allDestinations('domestic');
    if(mode==='global')return allDestinations('global');
    if(mode==='monthly')return allDestinations('domestic').concat(allDestinations('global'));
    return allDestinations('domestic').concat(allDestinations('global'));
  }
  function pickRouletteDestination(mode){
    var rows=getRouletteRows(mode);
    if(!rows.length)rows=domList.concat(globList);
    var rouletteRecentIds=readRouletteRecentIds();
    var scored=rows.map(function(dest,idx){
      var offset=idx+(mode==='global'?700:mode==='monthly'?1500:mode==='mixed'?1200:300);
      return mode==='monthly'
        ? scoreMonthlyTravelDestination(dest,offset,rouletteRecentIds)
        : scoreRouletteDestination(dest,offset,rouletteRecentIds);
    });
    if(!scored.length)return null;
    var hasFresh=scored.some(function(dest){return rouletteRecentIds.indexOf(destinationKey(dest))<0;});
    function weightedPick(){
      var totalWeight=scored.reduce(function(sum,dest){return sum+(dest.rouletteWeight||1);},0);
      var ticket=Math.random()*totalWeight;
      for(var idx=0;idx<scored.length;idx++){
        ticket-=scored[idx].rouletteWeight||1;
        if(ticket<=0)return scored[idx];
      }
      return scored[0];
    }
    for(var attempt=0;attempt<8;attempt++){
      var picked=weightedPick();
      if(!hasFresh||rouletteRecentIds.indexOf(destinationKey(picked))<0)return picked;
    }
    scored=scored.slice().sort(function(a,b){
      var ar=rouletteRecentIds.indexOf(destinationKey(a))>=0?1:0;
      var br=rouletteRecentIds.indexOf(destinationKey(b))>=0?1:0;
      return ar-br||(b.rouletteWeight||0)-(a.rouletteWeight||0);
    });
    return scored[0];
  }
  function rouletteResultField(label,value){
    return '<div style="border:1px solid rgba(148,163,184,.22);border-radius:12px;background:rgba(15,23,42,.46);padding:10px 11px;min-width:0;">'+
      '<div style="font-size:.68rem;font-weight:800;letter-spacing:.08em;color:#bae6fd;text-transform:uppercase;margin-bottom:4px;">'+escapeHtml(label)+'</div>'+
      '<div style="font-size:.82rem;line-height:1.55;color:#f8fafc;">'+escapeHtml(value)+'</div>'+
    '</div>';
  }
  function renderRouletteResult(dest,mode){
    var result=document.getElementById('energyRouletteResult');
    if(!result||!dest)return;
    var countryLabel=dest.countryType==='global'?'해외':'국내';
    var plan=mode==='monthly'?(dest.monthlyPlan||currentMonthlyTravelPlan):null;
    var modeLabel=mode==='domestic'?'국내 좌표':mode==='global'?'해외 좌표':mode==='monthly'?'월별 여행 좌표':'완전 랜덤 원정';
    var monthlyFields=plan
      ? rouletteResultField('이달의 기운',plan.month+'월 · '+plan.label+' · '+(EL_E[plan.el]||'')+(EL_K[plan.el]||plan.el))+
        rouletteResultField('추천 시기',plan.time)+
        rouletteResultField('월별 미션',plan.mission)
      : '';
    result.innerHTML=
      '<div class="energy-roulette-result-head" style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px;">'+
        '<div style="min-width:0;flex:1 1 220px;">'+
          '<div style="font-size:.74rem;font-weight:800;letter-spacing:.1em;color:#c4b5fd;text-transform:uppercase;">'+escapeHtml(modeLabel)+'</div>'+
          '<div style="font-size:1.08rem;font-weight:900;color:#fff;margin-top:3px;line-height:1.35;">'+escapeHtml((dest.emoji||dest.icon||'📍')+' '+dest.name)+'</div>'+
          (plan?'<div style="margin-top:4px;color:#bfdbfe;font-size:.78rem;line-height:1.55;">'+escapeHtml(plan.tone)+'</div>':'')+
        '</div>'+
        '<span style="border:1px solid rgba(251,191,36,.34);background:rgba(251,191,36,.12);color:#fde68a;border-radius:999px;padding:6px 10px;font-size:.74rem;font-weight:800;white-space:nowrap;">'+escapeHtml(countryLabel+' · '+(EL_E[dest.element]||'')+(EL_K[dest.element]||dest.element))+'</span>'+
      '</div>'+
      '<div class="energy-roulette-result-grid grid grid-cols-1 gap-2 sm:grid-cols-2">'+
        rouletteResultField('좌표',formatDestinationCoord(dest))+
        rouletteResultField('추천 이유',dest.rouletteReason||dest.matchLabel||'사주 흐름과 지형 에너지가 안정적으로 맞물립니다.')+
        rouletteResultField('여행 방식',tripStyleLabels[dest.tripStyle]||dest.tripStyle||'느린 회복 여행')+
        rouletteResultField('1일 미션',dest.ritualTip||'도착 후 첫 10분은 말수를 줄이고 장소의 기운을 천천히 받아들이세요.')+
        rouletteResultField('피하면 좋은 행동',rouletteAvoidAction(dest))+
        monthlyFields+
      '</div>'+
      '<button type="button" data-energy-roulette-reroll="'+escapeHtml(mode||'mixed')+'" class="mt-3 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-slate-50 ring-1 ring-white/20" style="appearance:none;margin-top:12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.1);color:#f8fafc;border-radius:999px;padding:8px 12px;font-size:.74rem;font-weight:800;cursor:pointer;">다시 뽑기</button>';
  }
  function ensureEnergyRouletteStyles(){
    try{
      if(!document||!document.createElement||!document.head||document.getElementById('energyRouletteStyles'))return;
      var style=document.createElement('style');
      style.id='energyRouletteStyles';
      style.textContent=[
        '.energy-expedition-root{position:relative;overflow:hidden;border-radius:22px;background:radial-gradient(circle at 12% 4%,rgba(255,255,255,.16),transparent 24%),radial-gradient(circle at 86% 10%,rgba(186,230,253,.16),transparent 22%),linear-gradient(145deg,rgba(8,13,31,.96),rgba(18,27,54,.92) 48%,rgba(8,13,31,.96));border:1px solid rgba(226,232,240,.16);box-shadow:0 24px 70px rgba(2,6,23,.36),inset 0 1px 0 rgba(255,255,255,.12)}',
        '.energy-expedition-hero{position:relative;display:grid;gap:12px;padding:18px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:linear-gradient(135deg,rgba(255,255,255,.13),rgba(255,255,255,.055));backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);margin-bottom:14px}',
        '.energy-expedition-root *{letter-spacing:0!important;word-break:keep-all}',
        '.energy-expedition-root p,.energy-expedition-root div,.energy-expedition-root li{overflow-wrap:anywhere}',
        '.energy-dashboard-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:8px}',
        '.energy-section-card{border-radius:16px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}',
        '.energy-section-card b{font-weight:900}',
        '.ec-loc-grid{display:grid!important;grid-template-columns:1fr!important;gap:10px!important}',
        '.ec-loc-item{border-radius:16px!important;border:1px solid rgba(226,232,240,.22)!important;box-shadow:0 12px 28px rgba(15,23,42,.08)!important;overflow:hidden;color:#1e293b!important}',
        '.ec-loc-item:hover{transform:translateY(-2px)!important}',
        '.ec-loc-name{font-size:1rem!important;color:#0f172a!important;line-height:1.35!important}',
        '.ec-loc-desc{font-size:.86rem!important;color:#334155!important;line-height:1.78!important}',
        '.ec-loc-coord{color:#64748b!important}',
        '.energy-mission-row{display:flex;align-items:flex-start;gap:9px;border:1px solid rgba(148,163,184,.22);border-radius:12px;background:rgba(255,255,255,.82);padding:10px 11px;color:#1e293b}',
        '.energy-mission-check{flex:0 0 auto;width:18px;height:18px;border-radius:6px;border:1px solid rgba(14,165,233,.36);background:linear-gradient(135deg,rgba(186,230,253,.68),rgba(255,255,255,.82));box-shadow:inset 0 1px 0 rgba(255,255,255,.8)}',
        '.energy-roulette-layout{display:grid;grid-template-columns:minmax(132px,178px) minmax(0,1fr);gap:14px;align-items:center}',
        '.energy-roulette-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
        '.energy-roulette-btn{appearance:none;border-radius:12px;padding:10px 12px;min-height:42px;font-size:.78rem;font-weight:900;line-height:1.25;cursor:pointer;text-align:center;transition:transform .18s ease,filter .18s ease,opacity .18s ease}',
        '.energy-roulette-btn:hover{transform:translateY(-1px);filter:brightness(1.06)}',
        '.energy-roulette-wheel{transition:transform .72s cubic-bezier(.16,1,.3,1),filter .2s ease;will-change:transform}',
        '.energy-roulette-wheel.is-spinning{filter:drop-shadow(0 0 18px rgba(186,230,253,.42))}',
        '.energy-roulette-deck.is-shuffling .energy-roulette-chip:nth-child(1){transform:translate3d(7px,-5px,0) rotate(-3deg)}',
        '.energy-roulette-deck.is-shuffling .energy-roulette-chip:nth-child(2){transform:translate3d(-6px,6px,0) rotate(2deg)}',
        '.energy-roulette-deck.is-shuffling .energy-roulette-chip:nth-child(3){transform:translate3d(5px,5px,0) rotate(4deg)}',
        '.energy-roulette-result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
        '#energyRouletteResult{min-height:96px}',
        '@media(min-width:720px){.ec-loc-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}',
        '@media(min-width:1080px){.ec-loc-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}',
        '@media(max-width:560px){.energy-expedition-hero{padding:15px}.energy-roulette-layout{grid-template-columns:1fr}.energy-roulette-wheel-wrap{margin:0 auto}.energy-roulette-actions,.energy-roulette-result-grid{grid-template-columns:1fr}.energy-roulette-btn{width:100%}}',
        '@media(prefers-reduced-motion:reduce){.energy-roulette-wheel,.energy-roulette-chip{transition:none!important}}'
      ].join('\n');
      document.head.appendChild(style);
    }catch(_e){}
  }
  function energyRouletteHtml(){
    var chipRows=domList.slice(0,3).concat(globList.slice(0,3));
    var chipHtml=chipRows.map(function(dest){
      return '<span class="energy-roulette-chip inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-slate-100" style="display:inline-flex;align-items:center;gap:4px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(255,255,255,.10);padding:5px 9px;font-size:.72rem;color:#f8fafc;transition:transform .28s ease;">'+escapeHtml((dest.emoji||dest.icon||'✦')+' '+dest.name)+'</span>';
    }).join('');
    return '<div id="energyRouletteCard" class="energy-roulette-card relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950/80 p-4 text-slate-50 shadow-2xl backdrop-blur-xl" style="position:relative;overflow:hidden;border:1px solid rgba(226,232,240,.18);border-radius:18px;background:radial-gradient(circle at 18% 8%,rgba(216,180,254,.24),transparent 26%),radial-gradient(circle at 88% 18%,rgba(125,211,252,.18),transparent 24%),linear-gradient(145deg,rgba(8,13,31,.94),rgba(30,41,79,.82));box-shadow:0 20px 54px rgba(2,6,23,.42),inset 0 1px 0 rgba(255,255,255,.14);padding:16px;margin:16px 0;color:#f8fafc;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);">'+
      '<div style="position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,rgba(255,255,255,.12),transparent 32%),radial-gradient(circle at 50% 0%,rgba(254,249,195,.12),transparent 36%);"></div>'+
      '<div style="position:relative;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px;flex-wrap:wrap;">'+
        '<div style="min-width:0;flex:1 1 240px;">'+
          '<h4 style="margin:0;font-size:1.02rem;font-weight:900;letter-spacing:0;color:#fff;">🎡 오늘의 에너지 룰렛</h4>'+
          '<p style="margin:5px 0 0;font-size:.82rem;line-height:1.55;color:#dbeafe;">당신의 사주가 오늘 끌어당기는 회복 좌표</p>'+
        '</div>'+
        '<span style="border:1px solid rgba(196,181,253,.32);background:rgba(109,40,217,.18);color:#ede9fe;border-radius:999px;padding:6px 10px;font-size:.7rem;font-weight:800;white-space:nowrap;">별빛 추첨</span>'+
      '</div>'+
      '<div class="energy-roulette-layout" style="position:relative;">'+
        '<div class="energy-roulette-wheel-wrap" style="position:relative;width:min(164px,48vw);aspect-ratio:1;">'+
          '<div id="energyRouletteWheel" class="energy-roulette-wheel rounded-full" style="position:absolute;inset:0;border-radius:999px;background:conic-gradient(from 12deg,rgba(34,197,94,.92),rgba(34,197,94,.92) 0 20%,rgba(248,113,113,.92) 20% 40%,rgba(250,204,21,.92) 40% 60%,rgba(148,163,184,.94) 60% 80%,rgba(56,189,248,.92) 80% 100%);border:1px solid rgba(255,255,255,.28);box-shadow:inset 0 0 22px rgba(255,255,255,.22),0 12px 34px rgba(15,23,42,.42);">'+
            '<div style="position:absolute;inset:18%;border-radius:999px;background:radial-gradient(circle at 35% 30%,#fff7ed,#c7d2fe 48%,rgba(15,23,42,.94) 70%);box-shadow:0 0 28px rgba(191,219,254,.42);display:flex;align-items:center;justify-content:center;font-size:1.28rem;">✦</div>'+
          '</div>'+
          '<div style="position:absolute;right:-4px;top:50%;transform:translateY(-50%);width:0;height:0;border-top:9px solid transparent;border-bottom:9px solid transparent;border-left:15px solid #fef3c7;filter:drop-shadow(0 0 8px rgba(254,243,199,.5));"></div>'+
        '</div>'+
        '<div style="min-width:0;">'+
          '<div id="energyRouletteDeck" class="energy-roulette-deck flex flex-wrap gap-2" style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:11px;">'+chipHtml+'</div>'+
          '<div class="energy-roulette-actions" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">'+
            '<button type="button" data-energy-roulette-mode="domestic" class="energy-roulette-btn" style="border:1px solid rgba(125,211,252,.32);background:rgba(14,165,233,.16);color:#f0f9ff;">국내 좌표</button>'+
            '<button type="button" data-energy-roulette-mode="global" class="energy-roulette-btn" style="border:1px solid rgba(196,181,253,.34);background:rgba(124,58,237,.17);color:#f5f3ff;">해외 좌표</button>'+
            '<button type="button" data-energy-roulette-mode="monthly" class="energy-roulette-btn" style="border:1px solid rgba(52,211,153,.34);background:rgba(16,185,129,.17);color:#ecfdf5;">월별 여행지</button>'+
            '<button type="button" data-energy-roulette-mode="mixed" class="energy-roulette-btn" style="border:1px solid rgba(253,230,138,.34);background:rgba(245,158,11,.16);color:#fffbeb;">랜덤 원정</button>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div id="energyRouletteResult" style="position:relative;margin-top:14px;border:1px dashed rgba(186,230,253,.34);border-radius:14px;background:rgba(15,23,42,.38);padding:13px;font-size:.82rem;color:#dbeafe;line-height:1.62;">별빛 원판이 멈추면 오늘의 회복 좌표가 열립니다.</div>'+
    '</div>';
  }
  function setupEnergyRoulette(){
    ensureEnergyRouletteStyles();
    var roulette=document.getElementById('energyRouletteCard');
    if(!roulette||!roulette.querySelectorAll)return;
    var wheel=document.getElementById('energyRouletteWheel');
    var deck=document.getElementById('energyRouletteDeck');
    var result=document.getElementById('energyRouletteResult');
    var buttons=roulette.querySelectorAll('[data-energy-roulette-mode]');
    var spinCount=0;
    function bindRerollButton(){
      if(!result||!result.querySelector)return;
      var reroll=result.querySelector('[data-energy-roulette-reroll]');
      if(!reroll)return;
      reroll.addEventListener('click',function(){
        spinRoulette(reroll.getAttribute('data-energy-roulette-reroll')||'mixed');
      });
    }
    function spinRoulette(mode){
      var picked=pickRouletteDestination(mode);
      if(!picked)return;
      spinCount+=1;
      var rotate=720+(spinCount*137)+Math.round(seededNoise(destinationKey(picked),seed+spinCount)*48);
      if(wheel){
        wheel.classList.add('is-spinning');
        wheel.style.transform='rotate('+rotate+'deg)';
      }
      if(deck)deck.classList.add('is-shuffling');
      Array.prototype.forEach.call(buttons,function(row){row.disabled=true;row.style.opacity='.72';});
      setTimeout(function(){
        renderRouletteResult(picked,mode);
        rememberRouletteDestination(picked);
        bindRerollButton();
        if(wheel)wheel.classList.remove('is-spinning');
        if(deck)deck.classList.remove('is-shuffling');
        Array.prototype.forEach.call(buttons,function(row){row.disabled=false;row.style.opacity='1';});
      },520);
    }
    Array.prototype.forEach.call(buttons,function(btn){
      btn.addEventListener('click',function(){
        spinRoulette(btn.getAttribute('data-energy-roulette-mode')||'mixed');
      });
    });
  }

  var energyTravelStory={
    wood:{
      needed:'숲과 정원처럼 살아 있는 초록의 리듬이 필요합니다.',
      why:'목(木)은 시작, 성장, 관계 확장, 창작의 첫 호흡을 맡습니다. 이 기운이 약하면 마음은 알고 있어도 몸이 앞으로 나가지 못하고, 계획은 많지만 실행의 줄기가 가늘어집니다.',
      deficient:'컨디션으로는 아침 무기력, 결정 지연, 감정의 답답함, 아이디어 고갈, 관계 회피처럼 나타나기 쉽습니다.',
      travel:'나무가 많은 곳을 걷는 여행은 몸의 호흡을 위로 열고, 닫혀 있던 의지와 상상력을 자연스럽게 다시 자라게 합니다.',
      fill:'초록 밀도가 높은 숲길이나 수목원에서 천천히 걷고, 새로 키울 계획을 한 문장으로 정리하세요.',
      yong:'용신이 목(木)일 때는 새 프로젝트, 공부, 관계 확장과 연결되는 장소를 고르면 운의 체감이 빠릅니다.',
      hee:'희신이 목(木)일 때는 메인 일정 사이에 정원 산책을 넣어 마음의 방향을 부드럽게 보조하세요.',
      mission:['숲길이나 정원에서 30분 이상 걷기','새로 시작할 일 한 가지를 여행 노트에 적기','초록 풍경을 보며 들숨 5초, 날숨 7초 호흡하기']
    },
    fire:{
      needed:'빛, 온기, 일출과 야경처럼 마음을 깨우는 발산 에너지가 필요합니다.',
      why:'화(火)는 표현력, 자신감, 사회적 존재감, 결단의 열을 담당합니다. 이 기운이 약하면 마음이 식고, 말과 행동이 늦어지며, 사람 앞에서 자신을 드러내는 힘이 줄어듭니다.',
      deficient:'컨디션으로는 냉한 무기력, 의욕 저하, 발표 부담, 낮은 존재감, 기분의 침체처럼 나타나기 쉽습니다.',
      travel:'빛이 좋은 장소와 활기 있는 야간 풍경은 꺼진 불씨를 다시 데우고, 표현의 용기를 안전하게 끌어올립니다.',
      fill:'일출이나 전망대처럼 빛이 열리는 장소를 고르되, 과열되지 않도록 물 휴식과 조용한 회복 시간을 함께 두세요.',
      yong:'용신이 화(火)일 때는 무대, 전망, 축제성 있는 풍경이 자신감과 실행력을 살립니다.',
      hee:'희신이 화(火)일 때는 짧은 야경 산책이나 따뜻한 카페 시간을 보조 처방으로 쓰면 좋습니다.',
      mission:['아침 햇빛을 15분 이상 받기','일몰 전 휴대폰을 잠시 끄고 하늘 보기','오늘 표현하고 싶은 마음 한 문장을 소리 내지 않고 정리하기']
    },
    earth:{
      needed:'흙길, 고궁, 유적, 사찰처럼 몸과 마음을 중심에 붙드는 안정 에너지가 필요합니다.',
      why:'토(土)는 루틴, 현실감, 소화력, 생활의 중심축을 맡습니다. 이 기운이 약하면 마음이 떠 있고, 결정은 흔들리며, 몸의 리듬이 쉽게 무너집니다.',
      deficient:'컨디션으로는 소화 부담, 수면 불규칙, 걱정 반복, 일정 지연, 현실감 저하처럼 나타나기 쉽습니다.',
      travel:'오래된 장소와 흙의 지형을 밟는 여행은 흩어진 생각을 몸으로 끌어내리고, 현재의 생활 감각을 회복시킵니다.',
      fill:'이동지를 줄이고 한 지역에 오래 머무르며 식사, 산책, 휴식 시간을 일정하게 고정하세요.',
      yong:'용신이 토(土)일 때는 역사 지구나 고원처럼 안정된 장소가 재정비와 현실 판단을 돕습니다.',
      hee:'희신이 토(土)일 때는 여행 중 식사와 수면 시간을 고정해 전체 운의 중심을 잡으세요.',
      mission:['흙길이나 오래된 골목을 20분 이상 걷기','오늘의 식사 시간을 흔들지 않기','불안한 생각을 현실 행동 1개로 바꿔 적기']
    },
    metal:{
      needed:'미술관, 건축, 도시 전망, 설산처럼 선명한 구조와 정리의 에너지가 필요합니다.',
      why:'금(金)은 판단, 절제, 정리, 기준, 감각의 밀도를 담당합니다. 이 기운이 약하면 경계가 흐려지고, 우선순위가 무너지고, 결정의 칼날이 무뎌집니다.',
      deficient:'컨디션으로는 산만함, 물건과 생각의 과적, 관계 정리 지연, 기준 혼란, 호흡의 답답함처럼 나타나기 쉽습니다.',
      travel:'정돈된 도시와 예술 공간은 감각을 날카롭게 닦아주고, 불필요한 것을 덜어내는 결단을 부드럽게 돕습니다.',
      fill:'일정과 짐을 가볍게 하고, 미술관이나 건축 공간에서 내가 지킬 기준 한 가지를 선명하게 정하세요.',
      yong:'용신이 금(金)일 때는 미술관, 전망대, 현대 건축처럼 구조가 분명한 장소가 판단력을 살립니다.',
      hee:'희신이 금(金)일 때는 여행 중 사진과 메모를 정리하며 생각의 잡음을 줄이는 방식이 좋습니다.',
      mission:['가방에서 필요 없는 물건 하나 덜어내기','미술관이나 건축물 앞에서 내 기준 한 문장 쓰기','사진은 9장만 남기고 바로 정리하기']
    },
    water:{
      needed:'바다, 호수, 강, 섬, 안개처럼 마음을 낮추고 깊게 만드는 회복 에너지가 필요합니다.',
      why:'수(水)는 휴식, 직관, 장기 판단, 감정의 깊은 순환을 맡습니다. 이 기운이 약하면 생각은 뜨겁게 돌지만 결론은 얕아지고, 마음의 파동이 쉽게 흔들립니다.',
      deficient:'컨디션으로는 불면, 불안, 과열된 사고, 감정 기복, 몰입력 저하, 깊은 휴식의 어려움처럼 나타나기 쉽습니다.',
      travel:'물가 여행은 과열된 머리를 낮추고 감정의 파동을 안정시켜, 오래 보고 깊게 결정하는 힘을 회복시킵니다.',
      fill:'물가에 오래 머무르고 일정을 비워두세요. 답을 빨리 내리기보다 마음의 온도가 내려가는 시간을 확보하는 것이 핵심입니다.',
      yong:'용신이 수(水)일 때는 바다와 호수처럼 깊고 낮은 장소가 직관과 회복력을 가장 잘 살립니다.',
      hee:'희신이 수(水)일 때는 저녁 물가 산책이나 디지털 디톡스를 보조축으로 쓰면 좋습니다.',
      mission:['물가 산책 30분 하기','잠들기 전 화면을 30분 먼저 끄기','여행 노트에 오늘의 감정과 사실을 한 줄씩 나누어 쓰기']
    }
  };
  var targetStory=energyTravelStory[target]||energyTravelStory.water;
  function softCard(title,body,tone){
    var bg=tone==='dark'
      ? 'radial-gradient(circle at 12% 0%,'+uiPalette.soft+',transparent 34%),linear-gradient(135deg,rgba(15,23,42,.88),rgba(30,41,59,.78))'
      : 'radial-gradient(circle at 90% 0%,'+uiPalette.soft+',transparent 34%),linear-gradient(135deg,rgba(255,255,255,.94),rgba(241,245,249,.9))';
    var color=tone==='dark'?'#e2e8f0':'#1e293b';
    var border=tone==='dark'?'rgba(125,211,252,.26)':'rgba(148,163,184,.34)';
    return '<div class="energy-section-card rounded-2xl border bg-white/80 p-4 shadow-sm backdrop-blur-xl" style="border:1px solid '+border+';border-radius:16px;background:'+bg+';padding:14px;margin:12px 0;color:'+color+';line-height:1.72;font-size:.88rem;box-shadow:0 10px 28px rgba(15,23,42,.08);">'+
      '<div style="font-size:.78rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:'+(tone==='dark'?'#bae6fd':'#475569')+';margin-bottom:8px;">'+title+'</div>'+
      body+
    '</div>';
  }
  function summaryChip(label,value){
    return '<div class="rounded-xl border border-slate-200/60 bg-white/85 p-3 shadow-sm" style="border:1px solid rgba(148,163,184,.28);border-radius:12px;background:rgba(255,255,255,.88);padding:10px 11px;min-width:0;">'+
      '<div style="font-size:.68rem;font-weight:900;letter-spacing:.08em;color:#64748b;text-transform:uppercase;margin-bottom:4px;">'+label+'</div>'+
      '<div style="font-size:.84rem;font-weight:800;color:#0f172a;line-height:1.45;">'+value+'</div>'+
    '</div>';
  }
  var todayCorePrescription=seasonConflictsKijishin
    ? primaryNeedText+'로 중심을 세우고, '+seasonNeedText+'는 보강보다 과열 조절과 미세 튜닝으로 다루세요.'
    : primaryNeedText+'를 중심축으로 채우고, '+seasonNeedText+'를 오늘의 컨디션 미세 조정에 부드럽게 더하세요.';
  function energySummaryHtml(){
    return softCard('오행 에너지 대시보드',
      '<div class="energy-dashboard-grid grid grid-cols-2 gap-2 md:grid-cols-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:8px;">'+
        summaryChip('보충 필요 오행',primaryNeedText)+
        summaryChip('결핍도',lacking+'%')+
        summaryChip('용신 / 희신',yongText+' · '+heeText)+
        summaryChip('기신 / 구신',giText+' · '+gooText)+
        summaryChip('현재 계절 보완축',seasonModeLabel+' · '+seasonNeedText)+
        summaryChip('추천 방위',db.dirEmoji+' '+db.direction)+
      '</div>'+
      '<div style="margin-top:12px;border-left:3px solid rgba(14,165,233,.55);padding-left:10px;color:#0f172a;font-weight:800;">오늘의 핵심 처방: '+todayCorePrescription+'</div>',
      'light');
  }
  function neededTravelEnergyHtml(){
    return softCard('나에게 필요한 여행 에너지',
      '<div style="display:grid;gap:10px;">'+
        '<div><b style="color:#bfdbfe;">왜 이 오행이 필요한가요?</b><br>'+targetStory.why+'</div>'+
        '<div><b style="color:#bfdbfe;">부족할 때 나타나는 컨디션</b><br>'+targetStory.deficient+'</div>'+
        '<div><b style="color:#bfdbfe;">여행으로 보완하면 좋은 이유</b><br>'+targetStory.travel+'</div>'+
      '</div>',
      'dark');
  }
  var stayTimeByElement={
    wood:'오전 9~11시, 빛이 부드럽고 숲의 호흡이 살아나는 시간',
    fire:'일출 직후 또는 해 질 무렵, 빛의 방향이 선명한 시간',
    earth:'오전 10시~오후 2시, 식사와 산책 리듬을 안정시키기 좋은 시간',
    metal:'오후 2~5시, 감각과 판단이 또렷해지는 시간',
    water:'해 질 무렵부터 초저녁, 마음의 파동이 낮아지는 시간'
  };
  var destinationActionByElement={
    wood:'걷는 동안 새로 키울 계획을 한 문장으로 적어보세요.',
    fire:'빛이 좋은 지점에서 오늘 표현하고 싶은 마음을 조용히 정리하세요.',
    earth:'식사 시간을 지키고, 걷는 속도를 평소보다 한 단계 낮추세요.',
    metal:'사진과 메모를 바로 정리하며 지금 필요한 기준 하나를 고르세요.',
    water:'물가를 바라보며 감정과 사실을 분리해서 한 줄씩 적어보세요.'
  };
  var difficultyByTripStyle={
    day_trip:'낮음 · 짧은 일정으로도 체감이 빠릅니다.',
    one_night:'보통 · 하룻밤 머물 때 회복감이 깊어집니다.',
    slow_trip:'보통 · 일정 밀도를 낮출수록 효과가 좋습니다.',
    retreat:'낮음~보통 · 조용한 체류에 적합합니다.',
    adventure:'높음 · 이동과 체력 배분을 넉넉히 잡으세요.',
    romantic:'보통 · 동행의 속도와 감정 온도를 맞추면 좋습니다.',
    creative:'보통 · 기록 도구를 챙기면 영감 회수가 좋습니다.'
  };
  var travelerTypeByElement={
    wood:'새 출발, 관계 회복, 창작 루틴을 다시 열고 싶은 여행자',
    fire:'자신감, 표현력, 활기를 되살리고 싶은 여행자',
    earth:'생활 리듬, 안정감, 현실 판단을 회복하고 싶은 여행자',
    metal:'정리, 결단, 감각의 선명도를 되찾고 싶은 여행자',
    water:'휴식, 직관, 감정 안정, 깊은 몰입이 필요한 여행자'
  };
  function destinationLongText(loc,scope){
    var el=loc.element||target;
    var desc=loc.description||loc.desc||'';
    var reason=(loc.matchLabel||'균형을 조용히 받쳐주는 자리')+'입니다.';
    var stay=tripStyleLabels[loc.tripStyle]||'느린 회복 여행';
    var time=stayTimeByElement[el]||stayTimeByElement[target];
    var action=loc.ritualTip||destinationActionByElement[el]||destinationActionByElement[target];
    if(scope==='global'){
      return desc+' '+reason+' 난이도는 '+(difficultyByTripStyle[loc.tripStyle]||'보통 · 일정과 체력을 여유 있게 잡으면 좋습니다.')+' 머무는 방식은 '+stay+'이 잘 맞고, '+(travelerTypeByElement[el]||travelerTypeByElement[target])+'에게 특히 깊게 닿습니다.';
    }
    return desc+' '+reason+' 머무는 방식은 '+stay+'이 어울리고, '+time+'에 찾으면 장소의 결이 더 부드럽게 열립니다. 함께 하면 좋은 행동은 '+action;
  }
  function locMetaRow(label,value){
    return '<div style="border:1px solid rgba(148,163,184,.18);border-radius:10px;background:rgba(248,250,252,.72);padding:8px 9px;">'+
      '<span style="display:block;font-size:.68rem;font-weight:900;letter-spacing:.06em;color:#64748b;text-transform:uppercase;margin-bottom:3px;">'+label+'</span>'+
      '<span style="font-size:.78rem;line-height:1.5;color:#334155;">'+value+'</span>'+
    '</div>';
  }
  function prescriptionHtml(){
    var weakStory=energyTravelStory[weakestEl]||targetStory;
    var yongStory=energyTravelStory[yongshinList[0]]||targetStory;
    var heeStory=energyTravelStory[yongshinList[1]]||targetStory;
    return softCard('오행별 여행 처방',
      '<div style="display:grid;gap:9px;">'+
        '<div><b style="color:#fef3c7;">부족 오행을 채우는 여행법</b><br>'+weakestText+' 축은 '+weakStory.fill+'</div>'+
        '<div><b style="color:#fef3c7;">용신을 살리는 여행법</b><br>'+yongStory.yong+'</div>'+
        '<div><b style="color:#fef3c7;">희신을 보조로 쓰는 여행법</b><br>'+heeStory.hee+'</div>'+
        '<div><b style="color:#fef3c7;">기신/구신을 피하는 여행법</b><br>'+avoidDirNarrative+'</div>'+
      '</div>',
      'dark');
  }
  function bestByStyle(styles, pool){
    var rows=(pool&&pool.length?pool:domList.concat(globList)).filter(function(dest){
      return styles.indexOf(dest.tripStyle)>=0&&kijishinList.indexOf(dest.element)<0;
    });
    if(!rows.length)rows=domList.concat(globList);
    rows=rows.slice().sort(function(a,b){return (b.score||0)-(a.score||0);});
    return rows[0]||domList[0]||globList[0]||{};
  }
  function typeCard(label,styles,pool,tip){
    var pick=bestByStyle(styles,pool);
    return locMetaRow(label,(pick.name||'가까운 회복 좌표')+' · '+(tripStyleLabels[pick.tripStyle]||'회복 여행')+' · '+tip);
  }
  function travelTypeHtml(){
    return softCard('여행 타입별 추천',
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;">'+
        typeCard('당일치기',['day_trip'],domList,'가볍게 다녀와도 기운 전환이 선명합니다.')+
        typeCard('1박 2일',['one_night','slow_trip'],domList,'하룻밤 자고 오면 몸의 리듬이 더 잘 바뀝니다.')+
        typeCard('혼자 가기 좋은 여행',['retreat','slow_trip'],domList.concat(globList),'말수를 줄이고 내면의 속도를 회복하세요.')+
        typeCard('연인과 가기 좋은 여행',['romantic'],domList.concat(globList),'감정의 온도를 부드럽게 맞추는 동행에 좋습니다.')+
        typeCard('창작/공부/리셋용 여행',['creative','day_trip'],domList.concat(globList),'기록과 정리를 곁들이면 영감 회수가 좋아집니다.')+
        typeCard('번아웃 회복용 여행',['retreat','slow_trip'],domList.concat(globList),'일정을 비우고 회복 시간을 길게 잡으세요.')+
      '</div>',
      'light');
  }
  function missionHtml(){
    var missions=(targetStory.mission||[]).slice(0,3);
    while(missions.length<3)missions.push('여행 노트에 오늘의 감정과 몸 상태를 한 줄씩 기록하기');
    return softCard('에너지 충전 미션',
      '<div style="display:grid;gap:8px;">'+missions.map(function(item){
        return '<div class="energy-mission-row">'+
          '<span class="energy-mission-check" aria-hidden="true"></span>'+
          '<span style="font-size:.86rem;line-height:1.55;">'+item+'</span>'+
        '</div>';
      }).join('')+'</div>',
      'light');
  }
  var gijishinAvoidPattern={
    wood:'목(木)이 기신/구신으로 강하게 작동할 때는 계속 더 걷고, 더 만나고, 더 시작하려는 흐름이 몸을 먼저 지치게 합니다. 숲과 정원은 짧게 숨을 고르는 정도로 쓰고, 새 약속을 늘리기보다 이미 품은 계획 하나만 정리하세요.',
    fire:'화(火)가 부담이 되는 사람에게 과한 야간 일정, 빽빽한 인증샷 코스, 소음 많은 축제형 여행은 기운을 밝히기보다 태워버릴 수 있습니다. 대신 해가 낮게 기우는 시간대의 산책, 조용한 전망대, 짧고 선명한 일정이 더 잘 맞습니다.',
    earth:'토(土)가 무겁게 작동하면 오래 앉아 먹고 머무르는 일정이 안정이 아니라 정체감으로 느껴질 수 있습니다. 유적과 고궁은 한두 곳만 깊게 보고, 식사 뒤에는 짧은 흙길 산책으로 몸의 흐름을 다시 열어주세요.',
    metal:'금(金)이 날카롭게 피로를 만들 때는 완벽한 동선, 비교가 많은 쇼핑, 사진 결과물에 집착하는 도시 여행이 마음을 더 조일 수 있습니다. 미술관이나 건축 공간은 오래 평가하기보다 한 장면만 고르고, 나머지는 가볍게 지나가도 충분합니다.',
    water:'수(水)가 과해지기 쉬운 흐름에서는 고립된 섬, 밤늦은 감정 대화, 결론 없는 물가 사색이 마음을 너무 깊은 곳으로 데려갈 수 있습니다. 물가를 찾더라도 낮 시간에 걷고, 생각은 노트 한 페이지 안에서만 마무리하세요.'
  };
  function avoidPatternHtml(){
    var patterns=kijishinList.map(function(el){return gijishinAvoidPattern[el];}).filter(Boolean);
    if(!patterns.length)patterns=['오늘은 특정 오행보다 과밀 일정, 수면 부족, 이동 욕심을 줄이는 것이 가장 안전합니다.'];
    return softCard('피해야 할 여행 패턴',
      '<div>'+patterns.map(function(item){return '<p style="margin:0 0 8px;">'+item+'</p>';}).join('')+
      '<p style="margin:0;color:#fecaca;">피해야 할 방향과 장소는 절대 금지가 아니라, 에너지상 피로도가 커질 수 있는 조건으로 이해하고 회복 시간을 충분히 붙이면 됩니다.</p></div>',
      'dark');
  }
  function finalConclusionHtml(){
    return softCard('한 줄 결론',
      '<div style="font-size:.94rem;font-weight:800;color:#0f172a;">오늘의 여행은 멀리 떠나는 것보다 '+primaryNeedText+'의 결을 몸에 다시 익히는 작은 회복 의식입니다. 당신에게 맞는 속도로 움직이면, 운은 조용히 다시 숨을 고릅니다.</div>',
      'light');
  }

  function locCard(loc,tagClass,tagLabel,scope){
    var coord=loc.coord||((loc.latitude&&loc.longitude)?(Math.abs(loc.latitude).toFixed(4)+'°'+(loc.latitude>=0?'N':'S')+' '+Math.abs(loc.longitude).toFixed(4)+'°'+(loc.longitude>=0?'E':'W')):'좌표 미기록');
    var desc=destinationLongText(loc,scope);
    var keywords=(loc.energyKeywords||[]).slice(0,3).join(' · ');
    var terrains=(loc.terrainTags||[]).slice(0,3).join(' · ');
    var ritual=loc.ritualTip||'도착 후 첫 10분은 말수를 줄이고 장소의 기운을 천천히 받아들이세요.';
    var score=typeof loc.score==='number'?loc.score:'-';
    var matchLabel=loc.matchLabel||'균형을 조용히 받쳐주는 자리';
    var el=loc.element||target;
    var locPalette=elementUiPalette[el]||uiPalette;
    var meta=scope==='global'
      ? locMetaRow('여행 난이도',difficultyByTripStyle[loc.tripStyle]||'보통 · 일정과 체력을 여유 있게 잡으면 좋습니다.')+
        locMetaRow('추천 체류 방식',tripStyleLabels[loc.tripStyle]||'느린 회복 여행')+
        locMetaRow('어울리는 여행자 유형',travelerTypeByElement[el]||travelerTypeByElement[target])
      : locMetaRow('추천 체류 방식',tripStyleLabels[loc.tripStyle]||'느린 회복 여행')+
        locMetaRow('추천 시간대',stayTimeByElement[el]||stayTimeByElement[target])+
        locMetaRow('함께 하면 좋은 행동',ritual);
    return '<div class="ec-loc-item rounded-2xl border bg-white/90 p-4 shadow-sm" style="background:radial-gradient(circle at 100% 0%,'+locPalette.soft+',transparent 36%),linear-gradient(145deg,rgba(255,255,255,.96),rgba(248,250,252,.9));border-color:'+locPalette.line+';">'+
      '<div class="ec-loc-top">'+
        '<span class="ec-loc-icon">'+(loc.icon||loc.emoji||'📍')+'</span>'+
        '<div>'+
          '<div class="ec-loc-name">'+loc.name+'</div>'+
          '<div class="ec-loc-coord">📐 '+coord+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="ec-loc-desc">'+desc+'</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:7px;margin-top:9px;">'+meta+'</div>'+
      '<div style="margin-top:8px;font-size:.78rem;color:#475569;line-height:1.55;">'+
        '<div>✦ 에너지 결 · '+matchLabel+'</div>'+
        (terrains?'<div>🗺️ '+terrains+'</div>':'')+
        (keywords?'<div>✨ '+keywords+'</div>':'')+
        '<div style="margin-top:4px;color:#0f766e;">🔮 '+ritual+'</div>'+
      '</div>'+
      '<span class="ec-loc-tag '+tagClass+'">'+tagLabel+' · '+(EL_E[loc.element]||'')+(EL_K[loc.element]||'')+'</span>'+
    '</div>';
  }

  var html=
    '<div class="ec-card energy-expedition-root rounded-3xl border border-white/15 bg-slate-950/90 p-4 text-slate-50 shadow-2xl">'+
      '<div class="energy-expedition-hero">'+
        '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;position:relative;">'+
          '<div style="min-width:0;flex:1 1 240px;">'+
            '<div style="font-size:.72rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:'+uiPalette.chip+';margin-bottom:6px;">달빛 원정대 · 별빛 지도</div>'+
            '<h3 style="margin:0;font-size:clamp(1.18rem,4vw,1.72rem);line-height:1.22;color:#fff;font-weight:950;letter-spacing:0;">에너지 원정 리포트</h3>'+
            '<p style="margin:7px 0 0;font-size:.9rem;line-height:1.65;color:#dbeafe;">부족한 오행 기운을 지형학적으로 충전하는 최적 좌표</p>'+
          '</div>'+
          '<div style="border:1px solid '+uiPalette.line+';background:linear-gradient(135deg,'+uiPalette.soft+',rgba(255,255,255,.08));color:'+uiPalette.text+';border-radius:16px;padding:10px 12px;min-width:142px;box-shadow:inset 0 1px 0 rgba(255,255,255,.14);">'+
            '<div style="font-size:.68rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;opacity:.82;">핵심 보완 오행</div>'+
            '<div style="font-size:1rem;font-weight:950;margin-top:3px;">'+(EL_E[target]||'')+' '+(EL_K[target]||'')+'</div>'+
            '<div style="font-size:.75rem;margin-top:2px;color:#e2e8f0;">결핍도 '+lacking+'%</div>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="ec-element-badge '+badgeClass+'" style="background:linear-gradient(135deg,'+uiPalette.mid+','+uiPalette.deep+');border:1px solid '+uiPalette.line+';color:'+uiPalette.text+';">'+
        (EL_E[target]||'')+' 보충 필요: '+(EL_K[target]||'')+' &nbsp;|&nbsp; 결핍도 '+lacking+'%'+
      '</div>'+
      energySummaryHtml()+
      '<div style="background:rgba(248,250,252,0.94);border:1px solid rgba(148,163,184,0.36);border-radius:10px;padding:13px;margin-bottom:16px;font-size:0.9rem;color:#1f2937;line-height:1.68;">'+
        '<div>🌟 <b>나를 돕는 기운:</b> 용신('+yongText+') · 희신('+heeText+')</div>'+
        '<div>🚧 <b>나를 힘들게 하는 기운:</b> 기신('+giText+') · 구신('+gooText+')</div>'+
        '<div style="margin-top:6px;color:#b91c1c;">⚠️ <b>피로도가 커질 수 있는 방향성:</b> '+avoidDirNarrative+'</div>'+
      '</div>'+
      '<div style="background:linear-gradient(135deg,rgba(14,26,48,0.88),rgba(15,23,42,0.8));border:1px solid rgba(125,211,252,0.42);border-radius:10px;padding:14px;margin-bottom:14px;font-size:0.9rem;color:#e2e8f0;line-height:1.72;text-shadow:0 1px 0 rgba(0,0,0,0.35);">'+
        '<div>🧾 <b>읽어낸 흐름:</b> '+analysisBasis+'</div>'+
        '<div>📊 <b>타고난 기운의 지형:</b> 강한 축은 '+strongestText+', 약한 축은 '+weakestText+'입니다. '+primaryNeedText+'는 지금 몸과 마음에서 약 '+targetRatio+'% 정도만 드러나 있어 더 섬세한 보살핌이 필요합니다.</div>'+
        '<div>🪫 <b>회복 우선도:</b> '+lacking+' / 100</div>'+
        '<div>🧬 <b>현재 사주 핵심 보완 오행:</b> '+primaryNeedText+'</div>'+
        '<div>🧭 <b>여행 리듬:</b> 중심 기운을 70%로 두고, 보조 기운 30%를 곁들입니다. 함께 살필 축은 '+(supportElements.map(elText).join(' · ')||'무리 없는 수(水) 회복축')+'입니다.</div>'+
        '<div>✦ <b>좌표를 고를 때 본 것:</b> 나를 살리는 기운은 앞쪽에 두고, 지치기 쉬운 기운과 최근에 자주 만난 장소는 조금 뒤로 물렸습니다.</div>'+
        '<div>⏳ <b>'+seasonModeLabel+' ('+seasonNeed.label+'):</b> '+seasonNeedText+'</div>'+
        '<div style="margin-top:5px;color:#bfdbfe;">• '+seasonNeedGuide+'</div>'+
        '<div style="margin-top:7px;color:#f8fafc;font-weight:500;">'+timingNarrative+'</div>'+
      '</div>'+
      neededTravelEnergyHtml()+
      '<div style="background:linear-gradient(135deg,rgba(2,44,34,0.9),rgba(6,78,59,0.82));border:1px solid rgba(52,211,153,0.5);border-radius:10px;padding:14px;margin-bottom:16px;font-size:0.9rem;color:#dcfce7;line-height:1.72;text-shadow:0 1px 0 rgba(0,0,0,0.28);">'+
        '<div>🌍 <b>국가/장소 보완 루트:</b> 국내 '+focusDomestic+' · 해외 '+focusGlobal+'</div>'+
        '<div style="margin-top:5px;">🏡 <b>환경 처방:</b> '+envPlan.env+'</div>'+
        '<div style="margin-top:6px;">⚡ <b>'+primaryNeedText+' 보충 시 기대되는 장점</b></div>'+
        '<ul style="margin:6px 0 0 18px;padding:0;">'+benefitHtml+'</ul>'+
        '<div style="margin-top:7px;color:#bbf7d0;">'+envPlan.tip+'</div>'+
        '<div style="margin-top:10px;">🧭 <b>오늘의 원정 운영법</b></div>'+
        '<ul style="margin:6px 0 0 18px;padding:0;">'+playbookHtml+'</ul>'+
      '</div>'+
      '<div class="ec-direction">'+
        '<span class="ec-dir-label">🚩 타겟 에너지 방위 &nbsp;</span>'+
        '<span class="ec-dir-value">'+db.dirEmoji+' '+db.direction+'</span>'+
        '<span style="font-size:.78rem;color:#cbd5e1">— '+db.theme+'</span>'+
      '</div>'+
      '<div class="ec-section-title">📍 국내 에너지 좌표</div>'+
      '<div class="ec-loc-grid grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">'+
        domList.map(function(l){return locCard(l,'ec-tag-domestic','국내','domestic');}).join('')+
      '</div>'+
      '<div class="ec-section-title">🌍 해외 에너지 좌표</div>'+
      '<div class="ec-loc-grid grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">'+
        globList.map(function(l){return locCard(l,'ec-tag-global','해외','global');}).join('')+
      '</div>'+
      energyRouletteHtml()+
      prescriptionHtml()+
      travelTypeHtml()+
      missionHtml()+
      avoidPatternHtml()+
      finalConclusionHtml()+
    '</div>';

  area.innerHTML=html;
  card.style.display='block';
  setupEnergyRoulette();
}
