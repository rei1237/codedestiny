// 퀀텀 명리 엔진(rpt_quantumCard) 유료 렌더러 정본. 브라우저로 내려가지 않는다.
// js/saju-engine-tarot-sukuyo-quantum.js 에서 그대로 옮겼다. scripts/extract-saju-section-runtime.mjs 가
// 셸 헬퍼(js/saju-engine.js·타로 파일의 간지/운세 헬퍼)와 함께 runtime.generated.mjs 로 묶는다.
// 바뀐 곳은 현재 시각 한 줄뿐이다 — 요청 시각은 report.js 가 ctx.now 로 넘긴다(원본은 Date.now()).
function _quantumNowMs(){ return ctx.now instanceof Date ? ctx.now.getTime() : Date.now(); }
function renderQuantumStrategy(p, natal, bazi){
  var area=document.getElementById('quantumSection');
  var card=document.getElementById('quantumCard');
  if(!area||!card)return;
  window.__cdQuantumRendered=true;

  var pw=G_POWER, jg=G_JONG;
  var qSameChart=typeof G_PILLARS!=='undefined' && G_PILLARS && ['y','m','d','h'].every(function(k){
    var left=p[k]||{}, right=G_PILLARS[k]||{};
    return (left.g||'')===(right.g||'') && (left.j||'')===(right.j||'');
  });
  var qTimeUnknown=window.__cdSajuTimeUnknown===true || window.__cdBirthTimeUnknown===true || p.timeUnknown===true || p.unknownHour===true;
  if(qTimeUnknown)p=Object.assign({},p,{h:{g:'',j:''}});

  /* ── 원국 관계쌍 표시용 테이블: 합화 성립 판정과 구분 ── */
  var GANHE_Q={'甲':{'己':'earth'},'己':{'甲':'earth'},'乙':{'庚':'metal'},'庚':{'乙':'metal'},'丙':{'辛':'water'},'辛':{'丙':'water'},'丁':{'壬':'wood'},'壬':{'丁':'wood'},'戊':{'癸':'fire'},'癸':{'戊':'fire'}};
  var JIHE_Q={'子':{'丑':'earth'},'丑':{'子':'earth'},'寅':{'亥':'wood'},'亥':{'寅':'wood'},'卯':{'戌':'fire'},'戌':{'卯':'fire'},'辰':{'酉':'metal'},'酉':{'辰':'metal'},'巳':{'申':'water'},'申':{'巳':'water'},'午':{'未':'fire'},'未':{'午':'fire'}};
  var EL_CLR={wood:'#4ade80',fire:'#f87171',earth:'#fbbf24',metal:'#cbd5e1',water:'#60a5fa'};

  var origGans=[p.y.g,p.m.g,p.d.g,p.h.g];
  var origZhis=[p.y.j,p.m.j,p.d.j,p.h.j];

  /* ── 오행 유형 판별 (용신/기신/중립) ── */
  function elType(el){
    return getQuantumElType(el, p, jg, pw, G_JOHU);
  }

  /* 현재 대운은 대운표의 공통 배열에서 선택한다. 시각 미상은 기운 시점을 확정하지 않는다. */
  var qLuckRows=!qTimeUnknown && qSameChart && Array.isArray(window.G_DAEWUN)?window.G_DAEWUN:[];
  var dg='', dz='';
  var currentDaeun=qLuckRows.find(function(row){
    return Number.isFinite(Number(row.age)) && typeof CURRENT_AGE==='number' && CURRENT_AGE>=Number(row.age) && CURRENT_AGE<=Number(row.age)+9;
  });
  if(currentDaeun){dg=currentDaeun.g||'';dz=currentDaeun.j||'';}

  /* UTC+9 부품으로 현재 순간을 조회한다. 브라우저 시간대·정오 고정으로 입춘 당일을 밀지 않는다. */
  var qNow=new Date(_quantumNowMs()+9*60*60*1000);
  var qYear=qNow.getUTCFullYear(), qMonth=qNow.getUTCMonth()+1, qDay=qNow.getUTCDate();
  var qHour=qNow.getUTCHours(), qMinute=qNow.getUTCMinutes();
  var sg='', sz='';
  try{
    var baziY=_coreEightChar(qYear,qMonth,qDay,qHour,qMinute);
    sg=baziY.getYearGan(); sz=baziY.getYearZhi();
  }catch(e){}

  // 원국 내부 관계 표시에서도 쓰는 정통 천간충·지지충 짝이다.
  var GAN_CHUNG={'甲':'庚','乙':'辛','丙':'壬','丁':'癸','庚':'甲','辛':'乙','壬':'丙','癸':'丁'};
  var ZHI_CHUNG={'子':'午','丑':'未','寅':'申','卯':'酉','辰':'戌','巳':'亥','午':'子','未':'丑','申':'寅','酉':'卯','戌':'辰','亥':'巳'};
  function sharedRelations(inGan,inZhi){
    if(!qSameChart||typeof _getDwHapResults!=='function')return [];
    return _getDwHapResults(inGan,inZhi);
  }
  var dwResults=(dg||dz)?sharedRelations(dg,dz):[];
  var seResults=(sg||sz)?sharedRelations(sg,sz):[];
  var keyEvents=dwResults.concat(seResults);

  /* ── 합과 합화, 충을 서로 구분해 표시한다. ── */
  function eventCardHTML(r,runLabel){
    var conditions=Array.isArray(r.conditions)?r.conditions:[];
    var note=conditions.length?' '+conditions.join(' · '):'';
    if(r.isChung){
      return '<div class="qm-hap-card hap-neutral"><div class="qm-hap-top">'+
        '<span class="qm-hap-badge qm-hap-plain">'+qEsc(r.type)+'</span>'+
        '<span style="font-size:.7rem;color:#4a7a6a;margin-left:8px">'+qEsc(runLabel)+'</span></div>'+
        '<div class="qm-transform"><span class="qm-from">'+qEsc(r.src)+'</span><span class="qm-arrow">충(沖)</span><span class="qm-to">'+qEsc(r.partner)+'</span></div>'+
        '<div class="qm-hap-desc">원국과 운의 글자가 맞서는 관계입니다. 용신·기신 한 항목만으로 발복이나 손실을 정하지 않고, 각 글자의 세력과 궁위·다른 합충을 함께 살핍니다.'+qEsc(note)+'</div></div>';
    }
    var transformed=r.transformed===true;
    var label=transformed?'합화(合化) 조건 성립':'합(合) · 합화 조건 확인';
    var color=EL_CLR[r.hapEl]||'#94a3b8';
    var target=transformed?(EL_K[r.hapEl]||r.hapEl||''):'합화 미확정';
    var desc=transformed
      ? '현재 판정 기준에서 '+(EL_K[r.hapEl]||r.hapEl)+'로 합화하는 조건을 충족합니다. 그 오행의 유불리는 원국 전체의 균형과 함께 해석합니다.'
      : '두 글자가 합을 이루지만, 다른 오행으로 바뀌었다고 확정하지 않습니다. '+(r.hapEl?'합화 후보는 '+(EL_K[r.hapEl]||r.hapEl)+'이며, ':'')+'월령·통근·투간·쟁합과 충을 함께 살펴야 합니다.';
    return '<div class="qm-hap-card hap-neutral"><div class="qm-hap-top"><span class="qm-hap-badge qm-hap-plain">'+label+'</span>'+
      '<span style="font-size:.7rem;color:#4a7a6a;margin-left:8px">'+qEsc(runLabel+' · '+r.type)+'</span></div>'+
      '<div class="qm-transform"><span class="qm-from">'+qEsc(r.src)+'</span><span style="font-size:.8rem;color:#3a6a5a;padding:0 2px">+ '+qEsc(r.partner)+'</span>'+
      '<span class="qm-arrow">'+(transformed?'⟶':'·')+'</span><span class="qm-to qm-to-neutral" style="color:'+color+'">'+qEsc(target)+'</span></div>'+
      '<div class="qm-hap-desc">'+qEsc(desc+note)+'</div></div>';
  }

  /* 계산 근거와 해석 조건을 함께 안내한다. */
  function buildFacts(){
    var facts=[];
    var dwEl=dz?(JI[dz]&&JI[dz].e):(dg?(GAN[dg]&&GAN[dg].e):null);
    if(dwEl){
      var role={good:'용신권',bad:'기신권',neutral:'중립권'}[elType(dwEl)]||'중립권';
      facts.push('현재 대운의 지지 중심 오행은 <b>'+qEsc(EL_K[dwEl])+'</b>이며 이 명식에서는 '+role+'으로 분류됩니다. 월령과 한난조습, 일간의 세력에 따른 해석이므로 성취나 손실을 뜻하는 확정 판정은 아닙니다.');
    }else{
      facts.push(qTimeUnknown?'태어난 시각을 알 수 없어 대운의 정확한 시작 시점과 현재 구간은 확정하지 않습니다. 확인된 원국 범위에서 성향과 선택의 조건을 살핍니다.':'현재 대운 구간이 확인되지 않았습니다. 대운표의 시작 나이와 출생 정보를 먼저 확인하세요.');
    }
    keyEvents.forEach(function(r){
      var pair='<b>'+qEsc(r.src+'·'+r.partner)+'</b> '+qEsc(r.type);
      if(r.isChung)facts.push(pair+'이 확인됩니다. 서로 다른 방향의 요구를 조율할 대목으로 보되, 해당 궁위와 십성·통근을 함께 검토해야 생활 영역을 좁힐 수 있습니다.');
      else if(r.transformed)facts.push(pair+'은 현재 기준에서 '+qEsc(EL_K[r.hapEl]||r.hapEl)+' 합화 조건이 성립합니다. 바뀐 오행의 역할과 원국의 균형을 함께 비교하세요.');
      else facts.push(pair+'이 있으나 합화는 미확정입니다. 합의 연결과 오행의 변화를 구분하고 월령·통근·투간·쟁합·충의 조건을 확인하세요.');
    });
    if(!keyEvents.length)facts.push(qSameChart?'현재 대운·세운과 원국 사이에 수집된 합·충 관계가 없습니다. 관계가 없다는 사실만으로 길흉을 정하지 않고 오행의 균형과 십성의 역할을 함께 살핍니다.':'원국과 운의 계산 상태가 일치하지 않아 합·충 해석을 보류했습니다. 명식을 다시 계산한 뒤 확인하세요.');
    return facts;
  }

  /* 오행 이미지는 행동을 정리하는 주제다. 질환·투자 결과의 근거로 쓰지 않는다. */
  function buildActions(){
    var actDB={
      wood:['시작하려는 일 하나를 고르고 이번 주에 확인할 작은 목표를 적으세요.','배움이나 새 계획은 필요한 시간·비용·도움부터 정리하세요.'],
      fire:['발표나 대화 전에 전하고 싶은 핵심을 세 문장으로 정리하세요.','활동이 몰린 날에는 휴식 시간을 먼저 일정에 넣으세요.'],
      earth:['진행 중인 일을 목록으로 만들고 마무리할 순서를 정하세요.','반복되는 지출과 맡은 책임을 확인해 감당할 범위를 정하세요.'],
      metal:['계약과 협업은 역할·기한·비용을 문서로 확인하세요.','결정 기준을 적고 필요한 자료가 빠져 있지 않은지 점검하세요.'],
      water:['선택을 서두르기 전에 모르는 정보와 확인할 사람을 정리하세요.','혼자 생각한 뒤 실제 상황을 아는 사람의 의견과 비교하세요.']
    };
    var acts=[], used={};
    var targetEls=keyEvents.filter(function(r){return r.transformed && r.newType==='good';}).map(function(r){return r.hapEl;});
    var dwEl=dz?(JI[dz]&&JI[dz].e):(dg?(GAN[dg]&&GAN[dg].e):null);
    if(dwEl)targetEls.push(dwEl);
    if(!targetEls.length&&pw&&Array.isArray(pw.yongshin))targetEls=pw.yongshin.slice(0,2);
    targetEls.forEach(function(el){if(!el||used[el])return;used[el]=1;(actDB[el]||[]).forEach(function(a){acts.push(a);});});
    if(keyEvents.some(function(r){return r.isChung;}))acts.unshift('일정이나 관계의 조건이 달라졌다면 바뀐 사실을 먼저 확인하고 역할과 기한을 다시 합의하세요.');
    if(!acts.length)acts=['지금 해결할 고민 하나와 확인된 사실을 적어 보세요.','선택지마다 필요한 시간·비용·도움을 비교하고 작은 단계부터 실행하세요.'];
    return acts.slice(0,5);
  }

  var facts=buildFacts();
  var actions=buildActions();
  function qEsc(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function qArr(list){
    return Array.isArray(list)?list.filter(Boolean):[];
  }
  function qUnique(list){
    var out=[], seen={};
    qArr(list).forEach(function(item){
      if(!item||seen[item])return;
      seen[item]=1; out.push(item);
    });
    return out;
  }
  function qElLabel(el){
    return (EL_E[el]||'')+' '+(EL_K[el]||el||'미확인');
  }
  function qTypeLabel(type){
    return {good:'용신권',bad:'기신권',neutral:'중립권'}[type]||'중립권';
  }
  function qTypeClass(type){
    return {good:'qm-chip-good',bad:'qm-chip-bad',neutral:'qm-chip-neutral'}[type]||'qm-chip-neutral';
  }
  function qElementChip(el,type){
    var t=type||elType(el);
    return '<span class="qm-el-chip '+qTypeClass(t)+'">'+qEsc(qElLabel(el))+' · '+qEsc(qTypeLabel(t))+'</span>';
  }
  function qTenGodOf(target){
    if(!target||!p.d.g||typeof getTenGod!=='function')return '';
    try{
      var tg=getTenGod(p.d.g,target);
      return tg&&tg!=='?'?tg:'';
    }catch(_){return '';}
  }
  function qTenGodGroup(tenGod){
    if(!tenGod)return '관찰';
    if(tenGod==='비견'||tenGod==='겁재')return '자아·동료';
    if(tenGod==='식신'||tenGod==='상관')return '표현·창조';
    if(tenGod==='편재'||tenGod==='정재')return '재물·현실';
    if(tenGod==='편관'||tenGod==='정관')return '명예·책임';
    if(tenGod==='편인'||tenGod==='정인')return '학습·보호';
    return '관찰';
  }
  function qTenGodTone(tenGod){
    var map={
      '비견':'자기 의지가 먼저 서고, 같은 결의 사람들과 판을 키우는 기운이 드러납니다.',
      '겁재':'경쟁과 쟁취의 불꽃이 강하게 떠오르니, 돈과 관계의 경계선을 분명히 세워야 합니다.',
      '식신':'타고난 재능이 부드럽게 흘러나와 말, 창작, 돌봄에서 복의 문이 열립니다.',
      '상관':'틀을 깨는 언어와 감각이 강하게 일어나며, 예리함을 품격 있게 다스릴 때 빛납니다.',
      '편재':'움직이는 돈과 넓은 인맥의 별이 떠오르니, 기회는 밖으로 뻗는 손끝에 머무릅니다.',
      '정재':'꾸준히 쌓는 재물과 신뢰의 결이 깊어지며, 안정된 약속이 운을 붙잡습니다.',
      '편관':'압박과 승부의 별이 날카롭게 서 있으니, 위기를 훈련장으로 삼을 때 권위가 생깁니다.',
      '정관':'질서와 명예의 기운이 바르게 자리하니, 책임을 정돈할수록 사회적 문이 열립니다.',
      '편인':'고독한 직관과 비밀스러운 공부의 별이 떠오르며, 남다른 감각이 길을 비춥니다.',
      '정인':'보호와 문서, 배움의 기운이 안정적으로 감싸며, 귀인의 도움과 자격의 문이 열립니다.'
    };
    return map[tenGod]||'십성의 결은 아직 옅게 머물러 있어 오행의 균형을 먼저 살핍니다.';
  }
  function qSourceText(el,type){
    var sources=[];
    if(jg&&jg.isJong){
      if(el===jg.dominant)sources.push('종격 주도 오행');
      if(el===jg.parEl)sources.push('종격 보조 오행');
      if(el===whoControls(jg.dominant))sources.push('종격 역행 기운');
    }
    if(pw){
      if(qArr(pw.yongshin).indexOf(el)>=0)sources.push('억부·조후 통합 용신');
      if(qArr(pw.kijishin).indexOf(el)>=0)sources.push('억부·조후 통합 기신');
      if(qArr(pw.johuYongshin).indexOf(el)>=0)sources.push('조후 보강');
      if(qArr(pw.johuKijishin).indexOf(el)>=0)sources.push('조후 과열/냉각 주의');
    }
    if(!sources.length)sources.push(type==='good'?'보강 가치':'중립 관찰');
    return qUnique(sources).join(' · ');
  }
  var qElements=['wood','fire','earth','metal','water'];
  var qElementCounts={wood:0,fire:0,earth:0,metal:0,water:0};
  origGans.concat(origZhis).forEach(function(ch){
    var el=(GAN[ch]&&GAN[ch].e)||(JI[ch]&&JI[ch].e);
    if(el&&qElementCounts[el]!=null)qElementCounts[el]+=1;
  });

  /* ═══════════════════════════════════════════════════════════════════
     원국 정밀 판별 — 판별 테이블 정본은 js/saju-engine.js 상단의 CD_* 전역.
     여기서는 계산·조립만 하고 테이블을 새로 선언하지 않는다.
     ═══════════════════════════════════════════════════════════════════ */
  var qCoreReady=(typeof CD_JANGGAN!=='undefined' && typeof CD_E12_MAP!=='undefined' && typeof cdJangganLayers==='function');

  /* 지지 십성 — 지장간 정기(본기) 기준.
     기존 qTenGodOf(지지)는 지지 자체 오행·음양을 쓰므로 결과가 갈린다(예: 甲일간+子).
     getTenGod은 타로·시빌라·일운·궁합이 공유하므로 건드리지 않고 여기서만 정본 기준을 쓴다. */
  function qTenGodOfBranch(zhi){
    if(!qCoreReady||!zhi)return '';
    var main=cdMainHiddenStem(zhi);
    return main?qTenGodOf(main):'';
  }

  /* 공망(空亡) — 일주 순중공망 2지지 */
  var qGongmang=(qCoreReady&&typeof cdGongMangBranches==='function')?cdGongMangBranches(p.d.g,p.d.j):[];
  function qIsGongmang(zhi){ return !!zhi && qGongmang.indexOf(zhi)>=0; }

  /* ── STEP 1: 4주 궁위 + 지장간 3층 + 십이운성 + 공망 ── */
  var qPalaceRows=(typeof CD_PALACE!=='undefined'?CD_PALACE:[]).map(function(meta){
    var item=p[meta.key]||{};
    var g=item.g||'', j=item.j||'';
    var layers=qCoreReady?cdJangganLayers(j).map(function(row){
      return {
        gan:row.gan,
        layer:row.layer,
        weight:row.weight,
        element:(GAN[row.gan]&&GAN[row.gan].e)||'',
        tenGod:qTenGodOf(row.gan)||'',
        exposed:origGans.indexOf(row.gan)>=0
      };
    }):[];
    return {
      key:meta.key, label:meta.label, palace:meta.palace, span:meta.span, domain:meta.domain,
      gan:g, zhi:j,
      ganEl:(GAN[g]&&GAN[g].e)||'', zhiEl:(JI[j]&&JI[j].e)||'',
      ganTenGod:qTenGodOf(g)||'',
      zhiTenGod:qTenGodOfBranch(j)||'',
      zhiSurfaceTenGod:qTenGodOf(j)||'',
      twelveStage:(qCoreReady&&typeof cdTwelveStage==='function')?cdTwelveStage(p.d.g,j):'',
      gongmang:qIsGongmang(j),
      layers:layers
    };
  });

  /* ── STEP 2: 원국 내부 관계(합·충·형·파·해·원진·삼합·방합) ── */
  var qPalaceLabelByBranchKey={y:'년지',m:'월지',d:'일지',h:'시지'};
  function qBranchSlots(){
    return ['y','m','d','h'].map(function(k){
      return {key:k,label:qPalaceLabelByBranchKey[k],branch:(p[k]&&p[k].j)||''};
    }).filter(function(row){return !!row.branch;});
  }
  function qNatalRelations(){
    var out={conflict:[],wonjin:[],harmony:[]};
    /* 충·파·해·원진·형 — 빌런 블랙리스트가 쓰는 판별기를 그대로 재사용 */
    var fn=(typeof window!=='undefined'&&window._sajuVillainBuildBranchRelations)
      ||(typeof _sajuVillainBuildBranchRelations==='function'?_sajuVillainBuildBranchRelations:null);
    if(fn){
      try{
        var rel=fn(p)||{};
        out.conflict=qArr(rel.conflictRelations);
        out.wonjin=qArr(rel.wonjinRelations);
      }catch(_){}
    }
    var slots=qBranchSlots();
    var seen={};
    function pushHarmony(type,members,positions,element,note){
      var key=type+':'+members.slice().sort().join('');
      if(seen[key])return;
      seen[key]=1;
      out.harmony.push({type:type,members:members,positions:positions,element:element||'',note:note||''});
    }
    /* 천간합 / 천간충 — 원국 천간 4자 내부 쌍 */
    var ganSlots=['y','m','d','h'].map(function(k){
      return {key:k,label:{y:'년간',m:'월간',d:'일간',h:'시간'}[k],gan:(p[k]&&p[k].g)||''};
    }).filter(function(row){return !!row.gan;});
    for(var a=0;a<ganSlots.length;a++){
      for(var b=a+1;b<ganSlots.length;b++){
        var L=ganSlots[a], R=ganSlots[b];
        var hapEl=(GANHE_Q[L.gan]&&GANHE_Q[L.gan][R.gan])||(GANHE_Q[R.gan]&&GANHE_Q[R.gan][L.gan])||null;
        if(hapEl)pushHarmony('천간합',[L.gan,R.gan],[L.label,R.label],hapEl,'합화 후보 · 성립 조건 별도 확인: '+(EL_K[hapEl]||hapEl));
        if(GAN_CHUNG[L.gan]===R.gan||GAN_CHUNG[R.gan]===L.gan){
          out.conflict.push({type:'천간충',branches:[L.gan,R.gan],positions:[L.label,R.label],
            label:L.label+' '+L.gan+' · '+R.label+' '+R.gan});
        }
      }
    }
    /* 지지 육합 */
    for(var i=0;i<slots.length;i++){
      for(var j2=i+1;j2<slots.length;j2++){
        var s1=slots[i], s2=slots[j2];
        var he=(JIHE_Q[s1.branch]&&JIHE_Q[s1.branch][s2.branch])||(JIHE_Q[s2.branch]&&JIHE_Q[s2.branch][s1.branch])||null;
        if(he)pushHarmony('육합',[s1.branch,s2.branch],[s1.label,s2.label],he,'합화 후보 · 성립 조건 별도 확인: '+(EL_K[he]||he));
      }
    }
    /* 삼합·반합 / 방합 */
    var branchList=slots.map(function(s){return s.branch;});
    function positionsOf(members){
      return slots.filter(function(s){return members.indexOf(s.branch)>=0;}).map(function(s){return s.label;});
    }
    (typeof CD_SAMHAP!=='undefined'?CD_SAMHAP:[]).forEach(function(sh){
      var hit=sh.m.filter(function(m){return branchList.indexOf(m)>=0;});
      if(hit.length>=3)pushHarmony('삼합',hit,positionsOf(hit),sh.el,(EL_K[sh.el]||sh.el)+' 국(局) 완성');
      else if(hit.length===2)pushHarmony('반합',hit,positionsOf(hit),sh.el,(EL_K[sh.el]||sh.el)+' 기운 부분 결집');
    });
    (typeof CD_BANGHAP!=='undefined'?CD_BANGHAP:[]).forEach(function(bh){
      var hit=bh.m.filter(function(m){return branchList.indexOf(m)>=0;});
      if(hit.length>=3)pushHarmony('방합',hit,positionsOf(hit),bh.el,bh.season+' 방국(方局) 완성');
      else if(hit.length===2)pushHarmony('반방합',hit,positionsOf(hit),bh.el,bh.season+' 계절 기운 결집');
    });
    return out;
  }
  var qRelations=qNatalRelations();

  /* ── STEP 3: 오행 세력 정밀화 ── */
  /* 표시 기준은 G_NATAL.counts(월지 가중 포함)로 통일 — 화면 내 숫자 불일치 해소 */
  var qNatalCounts=(natal&&natal.counts)||qElementCounts;
  /* 지장간 층 가중을 반영한 실세력 점수 */
  var qHiddenPower={wood:0,fire:0,earth:0,metal:0,water:0};
  origGans.forEach(function(g){
    var el=GAN[g]&&GAN[g].e;
    if(el&&qHiddenPower[el]!=null)qHiddenPower[el]+=1;
  });
  if(qCoreReady){
    origZhis.forEach(function(z){
      cdJangganLayers(z).forEach(function(row){
        var el=GAN[row.gan]&&GAN[row.gan].e;
        if(el&&qHiddenPower[el]!=null)qHiddenPower[el]+=row.weight;
      });
    });
  }
  var qHiddenPowerTotal=qElements.reduce(function(sum,el){return sum+qHiddenPower[el];},0)||1;

  /* 득령·득지·득세 */
  function qSupportsDay(el){
    if(!el)return false;
    var dayElement=(GAN[p.d.g]&&GAN[p.d.g].e)||'';
    if(!dayElement)return false;
    return el===dayElement||SHENG[el]===dayElement; /* 비겁 또는 인성 */
  }
  var qStrengthChecks=(function(){
    var monthEl=(JI[p.m.j]&&JI[p.m.j].e)||'';
    var dayBranchEl=(JI[p.d.j]&&JI[p.d.j].e)||'';
    var mine=0;
    qElements.forEach(function(el){ if(qSupportsDay(el))mine+=qHiddenPower[el]; });
    var minePct=(mine/qHiddenPowerTotal)*100;
    return [
      {name:'득령(得令)', hit:qSupportsDay(monthEl), basis:'월지 '+(p.m.j||'-')+' '+(EL_K[monthEl]||''),
       desc:qSupportsDay(monthEl)?'계절이 일간을 밀어줍니다.':'계절이 일간을 밀어주지 않습니다.'},
      {name:'득지(得地)', hit:qSupportsDay(dayBranchEl), basis:'일지 '+(p.d.j||'-')+' '+(EL_K[dayBranchEl]||''),
       desc:qSupportsDay(dayBranchEl)?'앉은 자리가 일간의 뿌리가 됩니다.':'앉은 자리가 일간을 돕지 않습니다.'},
      {name:'득세(得勢)', hit:minePct>=50, basis:'비겁·인성 세력 '+minePct.toFixed(0)+'%',
       desc:minePct>=50?'내 편 오행이 판의 과반을 쥐고 있습니다.':'내 편 오행이 과반에 못 미칩니다.'}
    ];
  })();

  /* ── STEP 4: 격국 판별 ── */
  /* 후보 표: worker/lib/saju-gyeokguk.js buildGyeokgukAnalysis (GEOK_BY_TEN_GOD / LAYER_WEIGHT / EXPOSURE_BONUS).
     최종 격국은 natal-core(원국 판정 정본)의 gyeokgukView를 그대로 쓴다. 건록·양인·월겁도 일반격이다. */
  var Q_GEOK_BY_TEN_GOD={정관:'정관격',편관:'편관격',정재:'정재격',편재:'편재격',식신:'식신격',상관:'상관격',정인:'정인격',편인:'편인격'};
  var Q_EXPOSURE_BONUS=2.2;
  var qGyeokguk=(function(){
    if(!qCoreReady)return null;
    var monthBranch=p.m.j||'';
    if(!monthBranch)return null;
    var monthHidden=cdJangganLayers(monthBranch).map(function(row){
      var tenGod=qTenGodOf(row.gan)||'';
      var exposed=origGans.indexOf(row.gan)>=0;
      return {
        gan:row.gan, layer:row.layer, tenGod:tenGod, exposed:exposed,
        geok:Q_GEOK_BY_TEN_GOD[tenGod]||null,
        score:Number((row.weight+(exposed?Q_EXPOSURE_BONUS:0)).toFixed(2))
      };
    });
    var candidates=monthHidden.filter(function(r){return r.geok;})
      .sort(function(a,b){return b.score-a.score;});
    var monthStage=(typeof cdTwelveStage==='function')?cdTwelveStage(p.d.g,monthBranch):'';
    var view=window.SajuNatalCore.gyeokgukView(window.SajuNatalCore.analyzeNatalCore(p));
    var name=view.name, type=view.type, reason=view.reason, confident=view.confident;

    /* 파격 요소 */
    var breaks=[];
    var allTenGods={};
    qPalaceRows.forEach(function(row){
      if(row.ganTenGod)allTenGods[row.ganTenGod]=1;
      row.layers.forEach(function(l){ if(l.tenGod)allTenGods[l.tenGod]=1; });
    });
    if(allTenGods['정관']&&allTenGods['편관']){
      breaks.push({type:'관살혼잡',detail:'정관과 편관이 함께 있어 관성이 혼잡합니다. 진로·조직·규율의 갈등 신호.'});
    }
    var chungTarget=ZHI_CHUNG[monthBranch];
    if(chungTarget&&[p.y.j,p.d.j,p.h.j].indexOf(chungTarget)>=0){
      breaks.push({type:'월지충',detail:'월지 '+monthBranch+'가 '+chungTarget+'와 충하여 격의 뿌리가 흔들립니다.'});
    }
    if(qIsGongmang(monthBranch)){
      breaks.push({type:'월지공망',detail:'월지 '+monthBranch+'가 공망을 맞아 격의 자리가 비어 있습니다.'});
    }
    return {name:name,type:type,reason:reason,confident:confident,monthBranch:monthBranch,
      monthHidden:monthHidden,candidates:candidates.slice(0,3),breaks:breaks,monthStage:monthStage};
  })();

  /* 십성 2계층 집계 — 천간(드러난) vs 지장간(숨은) */
  var qTenGodLayers=(function(){
    var visible={}, hidden={};
    qPalaceRows.forEach(function(row){
      if(row.ganTenGod)visible[row.ganTenGod]=(visible[row.ganTenGod]||0)+1;
      row.layers.forEach(function(l){
        if(l.tenGod)hidden[l.tenGod]=(hidden[l.tenGod]||0)+1;
      });
    });
    function rank(map){
      return Object.keys(map).sort(function(a,b){return map[b]-map[a];}).map(function(k){return {tenGod:k,count:map[k]};});
    }
    return {visible:visible,hidden:hidden,visibleRank:rank(visible),hiddenRank:rank(hidden)};
  })();

  /* ── STEP 5: 대운 타임라인 / 세운 / 월운 / 일운 ── */

  /* 대운 전 구간 — renderDaewun이 채워 둔 window.G_DAEWUN 재사용.
     행 점수는 evalDaewun(메모이즈 내장)을 그대로 쓴다. */
  var qDaewunTimeline=(function(){
    var rows=qLuckRows;
    return rows.map(function(row){
      var ev=null;
      try{ if(typeof evalDaewun==='function')ev=evalDaewun(row.g,row.j); }catch(_){}
      var endAge=Number(row.age)+9;
      return {
        age:row.age, endAge:endAge, gan:row.g, zhi:row.j,
        ganEl:row.gE||((GAN[row.g]&&GAN[row.g].e)||''),
        zhiEl:row.jE||((JI[row.j]&&JI[row.j].e)||''),
        ganRole:elType(row.gE||((GAN[row.g]&&GAN[row.g].e)||'')),
        zhiRole:elType(row.jE||((JI[row.j]&&JI[row.j].e)||'')),
        tenGod:qTenGodOf(row.g)||'',
        branchTenGod:qTenGodOfBranch(row.j)||'',
        stage:(qCoreReady&&typeof cdTwelveStage==='function')?cdTwelveStage(p.d.g,row.j):'',
        score:ev&&typeof ev.score==='number'?ev.score:null,
        label:(ev&&ev.label)||'',
        summary:(ev&&ev.evalSummary)||'',
        emoji:(ev&&ev.emoji)||'',
        current:(typeof CURRENT_AGE==='number'&&CURRENT_AGE>=row.age&&CURRENT_AGE<=endAge)
      };
    });
  })();

  /* 세운 — 올해 기준 앞뒤로 5개년 */
  var qYearlyFlow=(function(){
    var out=[];
    try{
      for(var off=0;off<5;off++){
        var y=qYear+off;
        /* 첫 행만 오늘 날짜(입춘 반영), 이후는 각 연도 중반으로 안전하게 조회 */
        var ec=(off===0)
          ? _coreEightChar(qYear,qMonth,qDay,qHour,qMinute)
          : _coreEightChar(y,6,15,12,0);
        var gz={g:ec.getYearGan(),j:ec.getYearZhi()};
        var res=null;
        try{ res=analyzeFortuneGZ(gz,p,(off===0?'올해 세운':(y+'년 세운'))); }catch(_){}
        out.push({
          year:y,
          labelYear:y, gan:gz.g, zhi:gz.j, isCurrent:(off===0), result:res,
          ganRole:elType((GAN[gz.g]&&GAN[gz.g].e)||''),
          zhiRole:elType((JI[gz.j]&&JI[gz.j].e)||''),
          tenGod:qTenGodOf(gz.g)||'', branchTenGod:qTenGodOfBranch(gz.j)||''
        });
      }
    }catch(_){}
    return out;
  })();

  /* 월운 — 올해 12개월 */
  var qMonthlyFlow=(function(){
    var out=[];
    if(typeof getMonthGanZhi!=='function')return out;
    for(var m=1;m<=12;m++){
      var gz=null;
      try{
        if(m===qMonth){var currentMonth=_coreEightChar(qYear,qMonth,qDay,qHour,qMinute);gz={g:currentMonth.getMonthGan(),j:currentMonth.getMonthZhi()};}
        else gz=getMonthGanZhi(qYear,m);
      }catch(_){}
      if(!gz||!gz.g)continue;
      var res=null;
      try{ res=analyzeFortuneGZ(gz,p,m+'월운'); }catch(_){}
      out.push({
        month:m, gan:gz.g, zhi:gz.j, result:res,
        isCurrent:(m===qMonth),
        ganRole:elType((GAN[gz.g]&&GAN[gz.g].e)||''),
        zhiRole:elType((JI[gz.j]&&JI[gz.j].e)||''),
        tenGod:qTenGodOf(gz.g)||'', branchTenGod:qTenGodOfBranch(gz.j)||''
      });
    }
    return out;
  })();

  /* 일운 — 오늘부터 7일 */
  var qDailyFlow=(function(){
    var out=[];
    if(typeof getGanZhiForDate!=='function')return out;
    var WEEK=['일','월','화','수','목','금','토'];
    // KST의 오늘을 기준으로 이후 날짜 산술은 전부 부품으로
    //    한다. 예전에는 매 칸을 new Date(y, m, d+i, 12, 0, 0) 로 다시 조립해서, 하루가 통째로 없는
    //    존(Pacific/Apia 2011-12-30)에서 그 칸의 일진이 하루 밀렸다.
    var qNowParts=_kasiPartsOf(qYear,qMonth,qDay,12,0,0);
    for(var d=0;d<7;d++){
      var at=_kasiShiftPartsByDays(qNowParts,d);
      var weekdayIdx=new Date(Date.UTC(at.year,at.month-1,at.day)).getUTCDay();
      var gz=null;
      try{ gz=getGanZhiForDate(at.year,at.month,at.day,12); }catch(_){}
      if(!gz||!gz.g)continue;
      var res=null;
      try{ res=analyzeFortuneGZ(gz,p,(d===0?'오늘 일운':at.month+'/'+at.day+' 일운')); }catch(_){}
      out.push({
        // [Cleanup] 옛 `date: dt` 는 소비자가 하나도 안 읽는다(qDailyHtml·dailyFlow 둘 다 month/day 만 쓴다).
        month:at.month, day:at.day, weekday:WEEK[weekdayIdx],
        gan:gz.g, zhi:gz.j, result:res, isToday:(d===0),
        ganRole:elType((GAN[gz.g]&&GAN[gz.g].e)||''),
        zhiRole:elType((JI[gz.j]&&JI[gz.j].e)||''),
        tenGod:qTenGodOf(gz.g)||'', branchTenGod:qTenGodOfBranch(gz.j)||''
      });
    }
    return out;
  })();

  /* ── 명식 구조 섹션 ── */
  var yongList=(jg&&jg.isJong)?[jg.dominant,jg.parEl].filter(Boolean):(pw?pw.yongshin:[]);
  var kiList=(jg&&jg.isJong)?[whoControls(jg.dominant)]:(pw?pw.kijishin:[]);
  var structType=(jg&&jg.isJong)?jg.name+(jg.pct>=90?'(眞)':'(假)'):(pw?(pw.isStrong?'정격 신강':'정격 신약'):'정격');
  var structTagCls=(jg&&jg.isJong)?'qm-tag-jong':(pw&&pw.isStrong?'qm-tag-strong':'qm-tag-weak');

  var dwLabel=(dg||dz)?('현재 대운 · '+(dg||'')+(dz?(' '+dz):'')):(qTimeUnknown?'시각 미상 · 대운 시점 미확정':'대운 구간 미확인');
  var seLabel=(sg||sz)?('현재 세운 · '+(sg||'')+(sz?(' '+sz):'')):'세운 불명';
  var dayEl=(GAN[p.d.g]&&GAN[p.d.g].e)||'';
  var monthEl=(JI[p.m.j]&&JI[p.m.j].e)||'';
  var dayMasterName=(GAN[p.d.g]&&GAN[p.d.g].n)||p.d.g||'';
  var johuLabel=G_JOHU
    ? [G_JOHU.badgeTxt||'',G_JOHU.type==='insufficient'?'':G_JOHU.type||'',G_JOHU.moistType==='insufficient'?'습조 판단 보류':G_JOHU.moistType||''].filter(Boolean).join(' · ')
    : '조후 미확인';
  var powerLabel=pw?(pw.isStrong?'신강':'신약'):'강약 미확인';
  var yongHtml=qUnique(yongList).length?qUnique(yongList).map(function(el){return qElementChip(el,'good');}).join(''):'<span class="qm-el-chip qm-chip-neutral">용신 미확인</span>';
  var kiHtml=qUnique(kiList).length?qUnique(kiList).map(function(el){return qElementChip(el,'bad');}).join(''):'<span class="qm-el-chip qm-chip-neutral">기신 미확인</span>';
  var elementMatrix=qElements.map(function(el){
    var type=elType(el);
    return {element:el,label:qElLabel(el),type:type,typeLabel:qTypeLabel(type),count:qElementCounts[el]||0,source:qSourceText(el,type)};
  });
  var elementMatrixHtml=elementMatrix.map(function(item){
    var width=Math.max(12,Math.min(100,item.count*18));
    return '<div class="qm-element-card qm-element-card--'+qEsc(item.type)+'">'+
      '<div class="qm-element-top"><span class="qm-element-name">'+qEsc(item.label)+'</span><span class="qm-hap-badge '+qTypeClass(item.type)+'">'+qEsc(item.typeLabel)+'</span></div>'+
      '<div class="qm-element-meta">'+qEsc(item.source)+'</div>'+
      '<div class="qm-element-count"><span>원국 출현 '+item.count+'회</span><i><b style="width:'+width+'%"></b></i></div>'+
    '</div>';
  }).join('');
  var pillarMatrix=[
    {key:'y',label:_sajuQuantumText("sq_14916_prop_label")},
    {key:'m',label:_sajuQuantumText("sq_14917_prop_label")},
    {key:'d',label:_sajuQuantumText("sq_14918_prop_label")},
    {key:'h',label:_sajuQuantumText("sq_14919_prop_label")}
  ].map(function(meta){
    var item=p[meta.key]||{};
    var g=item.g||'', j=item.j||'';
    var gEl=(GAN[g]&&GAN[g].e)||'', jEl=(JI[j]&&JI[j].e)||'';
    return {label:meta.label,gan:g,zhi:j,ganEl:gEl,zhiEl:jEl,ganRole:elType(gEl),zhiRole:elType(jEl),ganTenGod:qTenGodOf(g),zhiTenGod:qTenGodOf(j)};
  });
  var pillarMatrixHtml=pillarMatrix.map(function(item){
    return '<div class="qm-pillar-card">'+
      '<div class="qm-pillar-label">'+qEsc(item.label)+'</div>'+
      '<div class="qm-pillar-gz"><span>'+qEsc(item.gan||'-')+'</span><span>'+qEsc(item.zhi||'-')+'</span></div>'+
      '<div class="qm-pillar-roles">'+
        (item.ganEl?qElementChip(item.ganEl,item.ganRole):'<span class="qm-el-chip qm-chip-neutral">천간 없음</span>')+
        (item.zhiEl?qElementChip(item.zhiEl,item.zhiRole):'<span class="qm-el-chip qm-chip-neutral">지지 없음</span>')+
      '</div>'+
      '<div class="qm-oracle-meta" style="margin-top:8px">'+qEsc((item.ganTenGod||'십성 미정')+' · '+(item.zhiTenGod||'지장간 관찰'))+'</div>'+
    '</div>';
  }).join('');
  function qLuckRow(label,gan,zhi,results){
    var gEl=(GAN[gan]&&GAN[gan].e)||'', zEl=(JI[zhi]&&JI[zhi].e)||'';
    var hitCount=qArr(results).length;
    return {label:label,gan:gan,zhi:zhi,ganEl:gEl,zhiEl:zEl,ganRole:elType(gEl),zhiRole:elType(zEl),hitCount:hitCount};
  }
  var luckRows=[qLuckRow('현재 대운',dg,dz,dwResults),qLuckRow('현재 세운',sg,sz,seResults)];
  var luckOverviewHtml=luckRows.map(function(item){
    return '<div class="qm-luck-card">'+
      '<div class="qm-luck-label">'+qEsc(item.label)+'</div>'+
      '<div class="qm-luck-gz">'+qEsc((item.gan||'')+(item.zhi||'')||'미확인')+'</div>'+
      '<div class="qm-luck-chips">'+
        (item.ganEl?qElementChip(item.ganEl,item.ganRole):'')+
        (item.zhiEl?qElementChip(item.zhiEl,item.zhiRole):'')+
      '</div>'+
      '<div class="qm-luck-note">합·충 관계 '+item.hitCount+'개</div>'+
    '</div>';
  }).join('');
  var structureHtml=
    '<div class="qm-summary-grid">'+
      '<div class="qm-oracle-card"><div class="qm-oracle-label">명식 구조</div><div class="qm-oracle-value"><span class="qm-tag '+structTagCls+'">'+qEsc(structType)+'</span></div><div class="qm-oracle-meta">'+qEsc(powerLabel)+' · '+qEsc(johuLabel)+'</div></div>'+
      '<div class="qm-oracle-card"><div class="qm-oracle-label">일간 중심</div><div class="qm-oracle-value">'+qEsc((p.d.g||'-')+' '+dayMasterName)+'</div><div class="qm-oracle-meta">'+qEsc(qElLabel(dayEl))+' 기운을 중심축으로 해석합니다.</div></div>'+
      '<div class="qm-oracle-card"><div class="qm-oracle-label">월령 좌표</div><div class="qm-oracle-value">'+qEsc((p.m.j||'-')+' 월령')+'</div><div class="qm-oracle-meta">'+qEsc(qElLabel(monthEl))+' 계절성이 조후 판단의 바탕입니다.</div></div>'+
    '</div>'+
    '<div class="qm-dual-grid">'+
      '<div class="qm-mini-panel"><div class="qm-mini-title">용신 라인</div><div class="qm-yong-list">'+yongHtml+'</div></div>'+
      '<div class="qm-mini-panel"><div class="qm-mini-title">기신 라인</div><div class="qm-yong-list">'+kiHtml+'</div></div>'+
    '</div>'+
    (qGyeokguk?(
      '<div class="qm-dual-grid" style="margin-top:10px">'+
        '<div class="qm-mini-panel"><div class="qm-mini-title">격국(格局)</div>'+
          '<div class="qm-oracle-value">'+qEsc(qGyeokguk.name)+'</div>'+
          '<div class="qm-yong-list" style="margin-top:6px">'+
            '<span class="qm-el-chip qm-chip-neutral">'+qEsc(qGyeokguk.type)+'</span>'+
            '<span class="qm-el-chip '+(qGyeokguk.confident?'qm-chip-good':'qm-chip-neutral')+'">'+(qGyeokguk.confident?'판정 확정':'확정도 낮음')+'</span>'+
            (qGyeokguk.monthStage?'<span class="qm-el-chip qm-chip-neutral">월령 '+qEsc(qGyeokguk.monthStage)+'</span>':'')+
          '</div>'+
          '<div class="qm-oracle-meta">'+qEsc(qGyeokguk.reason)+'</div>'+
        '</div>'+
        '<div class="qm-mini-panel"><div class="qm-mini-title">파격(破格) 신호</div>'+
          (qGyeokguk.breaks.length
            ? qGyeokguk.breaks.map(function(b){
                return '<div class="qm-action-item"><div class="qm-action-num">!</div><div class="qm-action-text"><b>'+qEsc(b.type)+'</b><br>'+qEsc(b.detail)+'</div></div>';
              }).join('')
            : '<div class="qm-oracle-meta">격을 흔드는 뚜렷한 신호는 잡히지 않습니다. 구조가 비교적 안정적으로 유지됩니다.</div>')+
        '</div>'+
      '</div>'
    ):'');

  /* ── STEP 1 UI: 원국 4주 정밀(궁위·지장간 3층·십이운성·공망) ── */
  function qLayerChip(l){
    var cls=l.exposed?'qm-chip-good':'qm-chip-neutral';
    return '<span class="qm-el-chip '+cls+'" title="'+qEsc(l.layer+' · 가중 '+l.weight)+'">'+
      qEsc(l.layer)+' '+qEsc(l.gan)+(l.tenGod?' · '+qEsc(l.tenGod):'')+(l.exposed?' ↑투출':'')+
    '</span>';
  }
  var qPalaceHtml=qPalaceRows.map(function(row){
    return '<div class="qm-pillar-card'+(row.gongmang?' qm-pillar-card--gongmang':'')+'">'+
      '<div class="qm-pillar-label">'+qEsc(row.label)+' · '+qEsc(row.palace)+'</div>'+
      '<div class="qm-pillar-gz"><span>'+qEsc(row.gan||'-')+'</span><span>'+qEsc(row.zhi||'-')+'</span></div>'+
      '<div class="qm-pillar-roles">'+
        (row.ganEl?qElementChip(row.ganEl,elType(row.ganEl)):'')+
        (row.zhiEl?qElementChip(row.zhiEl,elType(row.zhiEl)):'')+
      '</div>'+
      '<div class="qm-yong-list" style="margin-top:7px">'+
        (row.ganTenGod?'<span class="qm-el-chip qm-chip-neutral">천간 '+qEsc(row.ganTenGod)+'</span>':'')+
        (row.zhiTenGod?'<span class="qm-el-chip qm-chip-neutral">지지 '+qEsc(row.zhiTenGod)+'</span>':'')+
        (row.twelveStage?'<span class="qm-el-chip qm-chip-neutral">십이운성 '+qEsc(row.twelveStage)+'</span>':'')+
        (row.gongmang?'<span class="qm-el-chip qm-chip-bad">공망</span>':'')+
      '</div>'+
      (row.layers.length?'<div class="qm-janggan-stack">'+row.layers.map(qLayerChip).join('')+'</div>':'')+
      '<div class="qm-oracle-meta">'+qEsc(row.span+' · '+row.domain)+'</div>'+
    '</div>';
  }).join('');
  var qGongmangNote=qGongmang.length
    ? '공망 지지는 <b>'+qEsc(qGongmang.join(' · '))+'</b>입니다. 해당 궁의 작용은 비거나 늦게 채워지는 결로 읽습니다.'
    : '공망 산출값이 없습니다.';

  /* ── STEP 2 UI: 원국 내부 구조(합·충·형·파·해·원진) ── */
  function qRelationRow(item,tone){
    var badgeCls=tone==='good'?'qm-hap-good':(tone==='bad'?'qm-hap-danger':'qm-hap-plain');
    var cardCls=tone==='bad'?'qm-hap-card hap-bad':(tone==='good'?'qm-hap-card':'qm-hap-card hap-neutral');
    var members=qArr(item.members||item.branches).join(' · ');
    var positions=qArr(item.positions).join(' · ');
    return '<div class="'+cardCls+'">'+
      '<div class="qm-hap-top">'+
        '<span class="qm-hap-badge '+badgeCls+'">'+qEsc(item.type||'')+'</span>'+
        (positions?'<span style="font-size:.7rem;color:#8fa3b8;margin-left:8px">'+qEsc(positions)+'</span>':'')+
      '</div>'+
      '<div class="qm-transform"><span class="qm-from">'+qEsc(members)+'</span>'+
        (item.element?'<span class="qm-arrow">·</span><span class="qm-to qm-to-neutral">'+qEsc((EL_K[item.element]||item.element)+' 후보')+'</span>':'')+
      '</div>'+
      (item.note||item.label?'<div class="qm-hap-desc">'+qEsc(item.note||item.label)+'</div>':'')+
    '</div>';
  }
  var qRelationHtml=(function(){
    var parts=[];
    if(qRelations.harmony.length){
      parts.push('<div class="qm-mini-title">합(合) — 결집·변화</div>'+
        qRelations.harmony.map(function(r){return qRelationRow(r,'good');}).join(''));
    }
    if(qRelations.conflict.length){
      parts.push('<div class="qm-mini-title" style="margin-top:10px">충·형·파·해 — 조율할 조건</div>'+
        qRelations.conflict.map(function(r){return qRelationRow(r,'bad');}).join(''));
    }
    if(qRelations.wonjin.length){
      parts.push('<div class="qm-mini-title" style="margin-top:10px">원진(怨嗔) — 미묘한 어긋남</div>'+
        qRelations.wonjin.map(function(r){return qRelationRow(r,'neutral');}).join(''));
    }
    if(!parts.length)return '<div class="qm-no-hap">▎ 원국 8자 사이에 뚜렷한 합·충·형·파·해가 잡히지 않습니다. 구조가 비교적 담백하게 서 있습니다.</div>';
    return parts.join('');
  })();

  /* ── STEP 3 UI: 오행 실세력 + 득령·득지·득세 ── */
  var qStrengthHtml=qStrengthChecks.map(function(row){
    return '<div class="qm-action-item">'+
      '<div class="qm-action-num">'+(row.hit?'○':'×')+'</div>'+
      '<div class="qm-action-text"><b>'+qEsc(row.name)+'</b> · '+qEsc(row.basis)+'<br>'+
      '<span style="color:#b6c9d8">'+qEsc(row.desc)+'</span></div>'+
    '</div>';
  }).join('');
  var qHiddenPowerHtml=qElements.map(function(el){
    var pct=(qHiddenPower[el]/qHiddenPowerTotal)*100;
    var type=elType(el);
    return '<div class="qm-element-card qm-element-card--'+qEsc(type)+'">'+
      '<div class="qm-element-top"><span class="qm-element-name">'+qEsc(qElLabel(el))+'</span>'+
        '<span class="qm-hap-badge '+qTypeClass(type)+'">'+qEsc(qTypeLabel(type))+'</span></div>'+
      '<div class="qm-element-meta">표면 '+(qNatalCounts[el]||0)+'자 · 지장간 반영 '+qHiddenPower[el].toFixed(1)+'점</div>'+
      '<div class="qm-element-count"><span>실세력 '+pct.toFixed(1)+'%</span><i><b style="width:'+Math.max(3,Math.min(100,pct)).toFixed(1)+'%"></b></i></div>'+
    '</div>';
  }).join('');

  /* ── STEP 4 UI: 십성 2계층 ── */
  function qTenGodLayerList(rank,emptyText){
    if(!rank.length)return '<div class="qm-oracle-meta">'+qEsc(emptyText)+'</div>';
    return rank.slice(0,6).map(function(r){
      return '<span class="qm-el-chip qm-chip-neutral">'+qEsc(r.tenGod)+' ×'+r.count+'</span>';
    }).join('');
  }

  /* ── STEP 5 UI: 대운·세운·월운·일운 ── */
  function qFlowGrade(res){ return (res&&res.grade)||''; }
  function qFlowIcon(res){ return (res&&res.icon)||''; }
  function qFlowBattery(res){ return (res&&typeof res.batteryPercent==='number')?res.batteryPercent:null; }
  function qFlowAdvice(res,limit){
    var items=qArr(res&&res.adviceItems).slice(0,limit||2);
    if(!items.length)return '';
    return items.map(function(a){
      return '<div class="qm-oracle-meta" style="margin-top:5px"><b>'+qEsc(a.title||'')+'</b> '+qEsc(a.body||'')+'</div>';
    }).join('');
  }
  var qDaewunHtml=qDaewunTimeline.length
    ? '<div class="qm-luck-grid qm-luck-grid--timeline">'+qDaewunTimeline.map(function(row){
        return '<div class="qm-luck-card'+(row.current?' qm-luck-card--current':'')+'">'+
          '<div class="qm-luck-label">'+row.age+'~'+row.endAge+'세'+(row.current?' · 현재':'')+'</div>'+
          '<div class="qm-luck-gz">'+qEsc((row.gan||'')+(row.zhi||''))+'</div>'+
          '<div class="qm-luck-chips">'+
            (row.ganEl?qElementChip(row.ganEl,row.ganRole):'')+
            (row.zhiEl?qElementChip(row.zhiEl,row.zhiRole):'')+
          '</div>'+
          '<div class="qm-luck-note">'+
            (row.score!=null?'평점 '+row.score+'점 · ':'')+qEsc(row.label||'')+
            (row.tenGod?'<br>'+qEsc(row.tenGod+(row.branchTenGod?' · '+row.branchTenGod:'')):'')+
            (row.stage?' · 십이운성 '+qEsc(row.stage):'')+
          '</div>'+
        '</div>';
      }).join('')+'</div>'
    : '<div class="qm-no-hap">'+qEsc(qTimeUnknown?'태어난 시각을 알 수 없어 대운의 시작 시점과 구간을 확정하지 않습니다.':'대운 구간을 확인할 수 없습니다. 출생 정보와 대운표를 다시 확인해 주세요.')+'</div>';

  var qYearlyHtml=qYearlyFlow.length
    ? '<div class="qm-luck-grid qm-luck-grid--timeline">'+qYearlyFlow.map(function(row){
        return '<div class="qm-luck-card'+(row.isCurrent?' qm-luck-card--current':'')+'">'+
          '<div class="qm-luck-label">'+row.labelYear+'년'+(row.isCurrent?' · 올해':'')+'</div>'+
          '<div class="qm-luck-gz">'+qEsc(row.gan+row.zhi)+'</div>'+
          '<div class="qm-luck-chips">'+
            qElementChip((GAN[row.gan]&&GAN[row.gan].e)||'',row.ganRole)+
            qElementChip((JI[row.zhi]&&JI[row.zhi].e)||'',row.zhiRole)+
          '</div>'+
          '<div class="qm-luck-note">'+qEsc(qFlowIcon(row.result)+' '+qFlowGrade(row.result))+
            (row.tenGod?'<br>'+qEsc(row.tenGod+(row.branchTenGod?' · '+row.branchTenGod:'')):'')+'</div>'+
          qFlowAdvice(row.result,1)+
        '</div>';
      }).join('')+'</div>'
    : '<div class="qm-no-hap">▎ 세운 데이터를 불러오지 못했습니다</div>';

  var qMonthlyHtml=qMonthlyFlow.length
    ? '<div class="qm-flow-grid">'+qMonthlyFlow.map(function(row){
        var bp=qFlowBattery(row.result);
        return '<div class="qm-flow-cell'+(row.isCurrent?' qm-flow-cell--current':'')+'">'+
          '<div class="qm-flow-head">'+row.month+'월'+(row.isCurrent?' · 이번 달':'')+'</div>'+
          '<div class="qm-flow-gz">'+qEsc(row.gan+row.zhi)+'</div>'+
          '<div class="qm-flow-grade">'+qEsc(qFlowIcon(row.result)+' '+qFlowGrade(row.result))+'</div>'+
          (bp!=null?'<div class="qm-flow-bar"><b style="width:'+bp+'%"></b></div>':'')+
          '<div class="qm-flow-meta">'+qEsc((row.tenGod||'')+(row.branchTenGod?' · '+row.branchTenGod:''))+'</div>'+
        '</div>';
      }).join('')+'</div>'
    : '<div class="qm-no-hap">▎ 월운 데이터를 불러오지 못했습니다</div>';

  var qDailyHtml=qDailyFlow.length
    ? '<div class="qm-flow-grid">'+qDailyFlow.map(function(row){
        var bp=qFlowBattery(row.result);
        return '<div class="qm-flow-cell'+(row.isToday?' qm-flow-cell--current':'')+'">'+
          '<div class="qm-flow-head">'+row.month+'/'+row.day+' ('+qEsc(row.weekday)+')'+(row.isToday?' · 오늘':'')+'</div>'+
          '<div class="qm-flow-gz">'+qEsc(row.gan+row.zhi)+'</div>'+
          '<div class="qm-flow-grade">'+qEsc(qFlowIcon(row.result)+' '+qFlowGrade(row.result))+'</div>'+
          (bp!=null?'<div class="qm-flow-bar"><b style="width:'+bp+'%"></b></div>':'')+
          '<div class="qm-flow-meta">'+qEsc((row.tenGod||'')+(row.branchTenGod?' · '+row.branchTenGod:''))+'</div>'+
        '</div>';
      }).join('')+'</div>'+
      (qDailyFlow[0]&&qDailyFlow[0].result?'<div class="qm-panel" style="padding-top:8px">'+qFlowAdvice(qDailyFlow[0].result,3)+'</div>':'')
    : '<div class="qm-no-hap">▎ 일운 데이터를 불러오지 못했습니다</div>';

  /* ── 신살(神殺) 계산 ── */
  var _qSS_day = p.d.g + p.d.j;
  var _qSS_jArr = [p.y.j, p.m.j, p.d.j, p.h.j];
  var _qSS_jLbl = ['년지','월지','일지','시지'];
  var _qSS_items = [];
  var _qSS_tao = ['子','午','卯','酉'];
  var _qSS_taoPos = _qSS_jArr.reduce(function(a,b,i){if(b&&_qSS_tao.indexOf(b)>=0)a.push(_qSS_jLbl[i]);return a;},[]);
  if(_qSS_taoPos.length>0) _qSS_items.push('🌸 <b>도화살</b>['+_qSS_taoPos.join(', ')+'] — 이성을 끌어당기는 매력의 별');
  var _qSS_hong = ['甲午','丙寅','丁未','戊辰','庚戌','辛酉','壬子'];
  if(_qSS_hong.indexOf(_qSS_day)>=0) _qSS_items.push('💋 <b>홍염살</b>[일주 '+_qSS_day+'] — 치명적 색기와 강렬한 이성 흡인력. 이 일주는 타고난 섹시한 카리스마를 지님');
  var _qSS_yem = ['寅','申','巳','亥'];
  var _qSS_yemPos = _qSS_jArr.reduce(function(a,b,i){if(b&&_qSS_yem.indexOf(b)>=0)a.push(_qSS_jLbl[i]);return a;},[]);
  if(_qSS_yemPos.length>0) _qSS_items.push('🌪️ <b>역마살</b>['+_qSS_yemPos.join(', ')+'] — 이동·변화·역동성의 별');
  var _qSS_hwa = ['辰','戌','丑','未'];
  var _qSS_hwaPos = _qSS_jArr.reduce(function(a,b,i){if(b&&_qSS_hwa.indexOf(b)>=0)a.push(_qSS_jLbl[i]);return a;},[]);
  if(_qSS_hwaPos.length>0) _qSS_items.push('🔮 <b>화개살</b>['+_qSS_hwaPos.join(', ')+'] — 예술·영성·고독의 별');
  var _qSS_goe = ['庚辰','庚戌','壬辰','壬戌','戊戌'];
  if(_qSS_goe.indexOf(_qSS_day)>=0) _qSS_items.push('⚔️ <b>괴강살</b>[일주 '+_qSS_day+'] — 강인한 리더십과 불굴의 의지');
  var _qSS_gyn = ['甲寅','乙卯','丙午','丁巳','戊辰','戊戌','己丑','己未','庚申','辛酉','壬子','癸亥'];
  if(_qSS_gyn.indexOf(_qSS_day)>=0) _qSS_items.push('🔥 <b>간여지동</b>[일주 '+_qSS_day+'] — 겉과 속이 일치하는 강한 자아');
  var _qSS_yang = {'甲':'卯','丙':'午','戊':'午','庚':'酉','壬':'子'};
  if(p.d.g&&_qSS_yang[p.d.g]&&p.d.j===_qSS_yang[p.d.g]) _qSS_items.push('⚡ <b>양인살</b>[일주 '+_qSS_day+'] — 날카로운 집중력과 극단의 에너지');
  var _qSS_ul = {'甲':['丑','未'],'戊':['丑','未'],'庚':['丑','未'],'乙':['子','申'],'己':['子','申'],'丙':['亥','酉'],'丁':['亥','酉'],'辛':['寅','午'],'壬':['巳','卯'],'癸':['巳','卯']};
  if(p.d.g&&_qSS_ul[p.d.g]){var _qSS_ulSet=_qSS_ul[p.d.g];var _qSS_ulPos=_qSS_jArr.reduce(function(a,b,i){if(b&&_qSS_ulSet.indexOf(b)>=0)a.push(_qSS_jLbl[i]);return a;},[]);if(_qSS_ulPos.length>0)_qSS_items.push('✨ <b>천을귀인</b>['+_qSS_ulPos.join(', ')+'] — 위기에 귀인이 나타나는 길성');}
  var qSinsalHtml = _qSS_items.length>0
    ? _qSS_items.map(function(s){return '<div class="qm-action-item"><div class="qm-action-num">★</div><div class="qm-action-text" style="font-size:.84rem;line-height:1.75">'+s+'</div></div>';}).join('')
    : '<div class="qm-action-item"><div class="qm-action-num">—</div><div class="qm-action-text">주요 신살 해당 없음 — 순수 오행 에너지로 매력이 발현됩니다.</div></div>';
  function qElementNames(list){
    var names=qUnique(list).map(function(el){return qElLabel(el);}).join(' · ');
    return names||'중립';
  }
  function qElementChipList(list,type,fallback){
    var unique=qUnique(list);
    return unique.length?unique.map(function(el){return qElementChip(el,type);}).join(''):'<span class="qm-el-chip qm-chip-neutral">'+qEsc(fallback||'관찰 필요')+'</span>';
  }
  function qSafeHtmlList(list,emptyText,cls){
    var rows=qArr(list).slice(0,4);
    if(!rows.length)rows=[emptyText||'지금은 운의 결이 크게 흔들리지 않습니다. 기본 루틴을 지키며 다음 변화를 기다리면 좋습니다.'];
    return rows.map(function(item,i){
      return '<div class="qm-action-item"><div class="qm-action-num">'+(i+1)+'</div><div class="'+(cls||'qm-action-text')+'">'+item+'</div></div>';
    }).join('');
  }
  var favorableElements=qUnique(elementMatrix.filter(function(item){return item.type==='good';}).map(function(item){return item.element;}));
  var cautionElements=qUnique(elementMatrix.filter(function(item){return item.type==='bad';}).map(function(item){return item.element;}));
  var neutralElements=qUnique(elementMatrix.filter(function(item){return item.type==='neutral';}).map(function(item){return item.element;}));
  var tenGodCounts={};
  pillarMatrix.forEach(function(item){
    [item.ganTenGod,item.zhiTenGod].forEach(function(tg){
      if(!tg)return;
      tenGodCounts[tg]=(tenGodCounts[tg]||0)+1;
    });
  });
  var tenGodRanking=Object.keys(tenGodCounts).sort(function(a,b){return tenGodCounts[b]-tenGodCounts[a];});
  var mainTenGod=tenGodRanking[0]||'미정';
  var mainTenGodCount=tenGodCounts[mainTenGod]||0;
  var tenGodAxisHtml=tenGodRanking.length
    ? tenGodRanking.slice(0,5).map(function(tg){
        return '<div class="qm-action-item"><div class="qm-action-num">'+qEsc(String(tenGodCounts[tg]))+'</div><div class="qm-action-text"><b>'+qEsc(tg)+'</b> · '+qEsc(qTenGodGroup(tg))+'<br><span style="color:#b6c9d8">'+qEsc(qTenGodTone(tg))+'</span></div></div>';
      }).join('')
    : '<div class="qm-action-item"><div class="qm-action-num">—</div><div class="qm-action-text">십성의 결은 옅게 머물러 오행과 조후의 균형이 먼저 떠오릅니다.</div></div>';
  var qHapCount=keyEvents.filter(function(r){return !r.isChung;}).length;
  var qTransformCount=keyEvents.filter(function(r){return r.transformed===true;}).length;
  var qChungCount=keyEvents.filter(function(r){return r.isChung;}).length;
  var qDecision=qChungCount>0?'합충 조건 점검':(qHapCount>0?'합화 조건 점검':'원국 균형 점검');
  var qDecisionTone=qChungCount>0
    ? '충이 있는 궁위의 역할과 현실의 변화 조건을 함께 살펴야 합니다. 충을 용신 파괴나 기신 제거로 단정하지 않습니다.'
    : (qHapCount>0?'합의 성립과 합화를 구분하며, 월령·통근·투간 등 확인된 조건을 기준으로 읽습니다.':'수집된 합충이 없어도 길흉이 정해지는 것은 아닙니다. 오행의 균형과 현실의 상황을 함께 살핍니다.');
  var qProfessionalSummary=structType+'의 그릇 위로 '+qElementNames(favorableElements.concat(qUnique(yongList)))+' 기운이 살아나고, '+qElementNames(cautionElements.concat(qUnique(kiList)))+' 기운은 조용히 눌러야 할 자리로 비칩니다. 주도 십성은 '+mainTenGod+(mainTenGodCount?' '+mainTenGodCount+'회':'')+'로 떠오르며, '+qTenGodTone(mainTenGod)+' '+qDecisionTone;
  var qCounselHtml=
    '<div class="qm-action-item"><div class="qm-action-num">命</div><div class="qm-action-text"><b>격국의 중심</b><br>'+qEsc(structType+' · '+powerLabel+'의 골격 위에 '+johuLabel+'의 온습이 깔립니다. 일간 '+(p.d.g||'-')+' '+dayMasterName+'은 '+qElLabel(dayEl)+'의 결로 서 있고, 월령 '+(p.m.j||'-')+'은 '+qElLabel(monthEl)+'의 계절문을 엽니다.')+'</div></div>'+
    '<div class="qm-action-item"><div class="qm-action-num">神</div><div class="qm-action-text"><b>십성의 초점</b><br>'+qEsc(mainTenGod+'('+qTenGodGroup(mainTenGod)+')이 가장 선명하게 떠오릅니다. '+qTenGodTone(mainTenGod))+'</div></div>'+
    '<div class="qm-action-item"><div class="qm-action-num">運</div><div class="qm-action-text"><b>대운·세운의 문</b><br>'+qEsc(dwLabel+'과 '+seLabel+'이 원국의 용신·기신을 건드리는 자리에서 '+qDecision+'의 결론이 맺힙니다. '+qDecisionTone)+'</div></div>';
  /* 판단축 칩 — 실제로 산출된 것만 켠다(과거에는 6개가 조건 없이 항상 표시됐다) */
  var qAxisChips=(function(){
    var axes=[
      {label:'합·합화 구분', on:qHapCount>0},
      {label:'충 관계', on:qChungCount>0},
      {label:'원국 내부 합충형파해', on:(qRelations.conflict.length+qRelations.harmony.length+qRelations.wonjin.length)>0},
      {label:'억부·조후 통합', on:!!pw},
      {label:'종격 보정', on:!!(jg&&jg.isJong)},
      {label:'격국 판정', on:!!(qGyeokguk&&qGyeokguk.name&&qGyeokguk.name!=='미정')},
      {label:'지장간 실세력', on:qCoreReady},
      {label:'십이운성', on:qCoreReady},
      {label:'공망', on:qGongmang.length>0},
      {label:'십성 축', on:tenGodRanking.length>0},
      {label:'신살 신호', on:_qSS_items.length>0},
      {label:'대운·세운·월운·일운', on:(qDaewunTimeline.length+qYearlyFlow.length+qMonthlyFlow.length+qDailyFlow.length)>0}
    ];
    return axes.map(function(a){
      return '<span class="qm-el-chip '+(a.on?'qm-chip-good':'qm-chip-neutral')+'">'+(a.on?'✓ ':'– ')+qEsc(a.label)+'</span>';
    }).join('');
  })();

  var qEvidenceHtml=
    '<div class="qm-summary-grid">'+
      '<div class="qm-oracle-card"><div class="qm-oracle-label">최종 판정</div><div class="qm-oracle-value">'+qEsc(qDecision)+'</div><div class="qm-oracle-meta">합 '+qHapCount+'건 · 합화 조건 성립 '+qTransformCount+'건 · 충 '+qChungCount+'건</div></div>'+
      '<div class="qm-oracle-card"><div class="qm-oracle-label">유리 오행</div><div class="qm-yong-list">'+qElementChipList(favorableElements.concat(qUnique(yongList)),'good','유리 오행 중립')+'</div></div>'+
      '<div class="qm-oracle-card"><div class="qm-oracle-label">주의 오행</div><div class="qm-yong-list">'+qElementChipList(cautionElements.concat(qUnique(kiList)),'bad','주의 오행 중립')+'</div></div>'+
    '</div>'+
    '<div class="qm-dual-grid">'+
      '<div class="qm-mini-panel"><div class="qm-mini-title">반영된 판단축</div><div class="qm-yong-list">'+
        qAxisChips+
      '</div></div>'+
      '<div class="qm-mini-panel"><div class="qm-mini-title">전문 요약</div><div class="qm-oracle-meta" style="font-size:.82rem;line-height:1.75;color:#d0e8d0">'+qEsc(qProfessionalSummary)+'</div></div>'+
    '</div>';
  var quantumDetails={
    decision:qDecision,
    professionalSummary:qProfessionalSummary,
    mainTenGod:mainTenGod,
    tenGodCounts:tenGodCounts,
    favorableElements:favorableElements,
    cautionElements:cautionElements,
    neutralElements:neutralElements,
    structure:{type:structType,power:powerLabel,johu:johuLabel,dayMaster:p.d.g||'',dayMasterName:dayMasterName,dayElement:dayEl,monthBranch:p.m.j||'',monthElement:monthEl,yongshin:qUnique(yongList),kijishin:qUnique(kiList)},
    elements:elementMatrix,
    pillars:pillarMatrix,
    luck:luckRows,
    sinsalItems:_qSS_items.slice(),
    /* 원국 정밀 판별 */
    palaces:qPalaceRows,
    gongmang:qGongmang.slice(),
    relations:qRelations,
    hiddenPower:qHiddenPower,
    strengthChecks:qStrengthChecks,
    gyeokguk:qGyeokguk,
    tenGodLayers:qTenGodLayers,
    /* 운의 흐름 4단계 */
    daewunTimeline:qDaewunTimeline,
    yearlyFlow:qYearlyFlow.map(function(r){return {year:r.labelYear,gan:r.gan,zhi:r.zhi,grade:(r.result&&r.result.grade)||''};}),
    monthlyFlow:qMonthlyFlow.map(function(r){return {month:r.month,gan:r.gan,zhi:r.zhi,grade:(r.result&&r.result.grade)||''};}),
    dailyFlow:qDailyFlow.map(function(r){return {month:r.month,day:r.day,gan:r.gan,zhi:r.zhi,grade:(r.result&&r.result.grade)||''};})
  };
  window.G_QUANTUM={
    version:'QUANTUM_MYEONGRI_ENGINE_V3',
    decision:qDecision,
    professionalSummary:qProfessionalSummary,
    favorableElements:favorableElements,
    cautionElements:cautionElements,
    keyEvents:keyEvents,
    dwResults:dwResults,
    seResults:seResults,
    facts:facts,
    actions:actions,
    details:quantumDetails
  };
  window.__cdQuantumMyeongriReportV2=window.G_QUANTUM;
  window.__cdQuantumMyeongriReportV3=window.G_QUANTUM;

  var quantumEngineVersion = 'v.3';
  window.__cdQuantumMyeongriEngineVersion = quantumEngineVersion;

  var html=
    '<div class="qm-wrap">'+
      '<div class="qm-header">'+
        '<span class="qm-icon">⚡</span>'+
        '<div class="qm-title-wrap">'+
          '<h3>QUANTUM MYEONGRI Engine '+quantumEngineVersion+'</h3>'+
          '<p>원국 4주·지장간·십이운성·공망부터 합충형파해, 격국, 대운·세운·월운·일운까지 한 자리에서 드러납니다.</p>'+
        '</div>'+
      '</div>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">✧</span><span class="qm-sec-title s2">퀀텀 전문 판정</span></div>'+
        '<div class="qm-panel">'+
          qEvidenceHtml+
        '</div>'+
      '</div>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">✦</span><span class="qm-sec-title s1">명리 상담 핵심</span></div>'+
        '<div class="qm-panel">'+
          qCounselHtml+
        '</div>'+
      '</div>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">✦</span><span class="qm-sec-title s1">명식 구조와 용신 매트릭스</span></div>'+
        '<div class="qm-panel">'+
          structureHtml+
        '</div>'+
      '</div>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">◈</span><span class="qm-sec-title s2">원국 4주 정밀 — 궁위·지장간·십이운성·공망</span></div>'+
        '<div class="qm-panel">'+
          '<div class="qm-pillar-grid">'+qPalaceHtml+'</div>'+
          '<div class="qm-oracle-meta" style="margin-top:10px">'+qGongmangNote+'</div>'+
        '</div>'+
      '</div>'+

      '<details class="qm-section qm-fold">'+
        '<summary class="qm-sec-head"><span class="qm-sec-icon">◈</span><span class="qm-sec-title s4">원국 4주 오행 좌표(요약)</span></summary>'+
        '<div class="qm-panel"><div class="qm-pillar-grid">'+
          pillarMatrixHtml+
        '</div></div>'+
      '</details>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">⚭</span><span class="qm-sec-title s2">원국 내부 구조 — 합·충·형·파·해·원진</span></div>'+
        '<div class="qm-panel">'+
          qRelationHtml+
        '</div>'+
      '</div>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">◇</span><span class="qm-sec-title s4">십성 작동 축 — 드러난 십성과 숨은 십성</span></div>'+
        '<div class="qm-panel">'+
          '<div class="qm-dual-grid">'+
            '<div class="qm-mini-panel"><div class="qm-mini-title">천간에 드러난 십성</div><div class="qm-yong-list">'+
              qTenGodLayerList(qTenGodLayers.visibleRank,'천간에 잡히는 십성이 없습니다.')+'</div></div>'+
            '<div class="qm-mini-panel"><div class="qm-mini-title">지장간에 숨은 십성</div><div class="qm-yong-list">'+
              qTenGodLayerList(qTenGodLayers.hiddenRank,'지장간 십성 산출값이 없습니다.')+'</div></div>'+
          '</div>'+
          '<div style="margin-top:10px">'+tenGodAxisHtml+'</div>'+
        '</div>'+
      '</div>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">◇</span><span class="qm-sec-title s4">오행 균형 진단 — 실세력과 득령·득지·득세</span></div>'+
        '<div class="qm-panel">'+
          '<div class="qm-element-grid">'+qHiddenPowerHtml+'</div>'+
          '<div class="qm-mini-title" style="margin-top:12px">일간의 뿌리 3판정</div>'+
          qStrengthHtml+
        '</div>'+
      '</div>'+

      '<details class="qm-section qm-fold">'+
        '<summary class="qm-sec-head"><span class="qm-sec-icon">◇</span><span class="qm-sec-title s4">오행별 용신/기신 판정(요약)</span></summary>'+
        '<div class="qm-panel"><div class="qm-element-grid">'+
          elementMatrixHtml+
        '</div></div>'+
      '</details>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">☽</span><span class="qm-sec-title s1">대운(10년) 흐름 — 전 구간</span></div>'+
        '<div class="qm-panel">'+
          qDaewunHtml+
        '</div>'+
      '</div>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">☀</span><span class="qm-sec-title s2">세운(1년) 흐름 — 5개년</span></div>'+
        '<div class="qm-panel">'+
          qYearlyHtml+
        '</div>'+
      '</div>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">🌙</span><span class="qm-sec-title s1">월운(1개월) 흐름 — 12개월</span></div>'+
        '<div class="qm-panel">'+
          qMonthlyHtml+
        '</div>'+
      '</div>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">✧</span><span class="qm-sec-title s3">일운(1일) 흐름 — 오늘부터 7일</span></div>'+
        '<div class="qm-panel">'+
          qDailyHtml+
        '</div>'+
      '</div>'+

      '<details class="qm-section qm-fold">'+
        '<summary class="qm-sec-head"><span class="qm-sec-icon">☽</span><span class="qm-sec-title s4">현재 대운·세운 요약</span></summary>'+
        '<div class="qm-panel"><div class="qm-luck-grid">'+
          luckOverviewHtml+
        '</div></div>'+
      '</details>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">⚡</span><span class="qm-sec-title s2">운의 관계 — 합·합화·충(沖) 조건</span></div>'+
        '<div class="qm-panel">'+
          (dg||dz
            ?'<div style="font-size:.7rem;color:#006640;font-weight:800;letter-spacing:.08em;margin-bottom:8px">▌ '+dwLabel+'</div>'+dwResults.map(function(r){return eventCardHTML(r,'대운');}).join('')
            :'')+
          (sg||sz
            ?'<div style="font-size:.7rem;color:#006640;font-weight:800;letter-spacing:.08em;margin:'+(dg||dz?'14px':'0')+' 0 8px">▌ '+seLabel+'</div>'+seResults.map(function(r){return eventCardHTML(r,'세운');}).join('')
            :'')+
          (!dwResults.length&&!seResults.length?'<div class="qm-no-hap">'+qEsc(!qSameChart?'원국 계산 상태를 다시 확인해 주세요.':'현재 확인된 합·충 관계가 없습니다. 합충이 없다는 이유만으로 길흉을 정하지 않습니다.')+'</div>':'')+
        '</div>'+
      '</div>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">🧿</span><span class="qm-sec-title s2">신살(神殺) 기운 분석</span></div>'+
        '<div class="qm-panel">'+
          qSinsalHtml+
        '</div>'+
      '</div>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">◆</span><span class="qm-sec-title s3">핵심 운세 판정</span></div>'+
        '<div class="qm-panel">'+
          qSafeHtmlList(facts,'원국의 중심이 크게 흔들리지 않습니다. 용신 루틴을 유지하며 세운의 작은 변화를 관찰하세요.','qm-fact-text')+
        '</div>'+
      '</div>'+

      '<div class="qm-section">'+
        '<div class="qm-sec-head"><span class="qm-sec-icon">✺</span><span class="qm-sec-title s4">현실적인 행동 조언</span></div>'+
        '<div class="qm-panel">'+
          qSafeHtmlList(actions,'이번 주기는 확장보다 정돈이 먼저입니다. 일정, 계약, 돈의 흐름을 차분히 정리하세요.','qm-action-text')+
        '</div>'+
      '</div>'+

    '</div>';

  area.innerHTML=html;
  card.style.display='block';
}
