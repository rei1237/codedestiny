// 나의 매력 클래스(rpt_specialCharmCard) 유료 렌더러 정본. 브라우저로 내려가지 않는다. js/saju-engine.js renderSpecialCharm 의 앞부분(신살 스탯 계산 ~ 카드 HTML)을
// 그대로 옮겼다. 원본은 같은 함수 안에서 이어서 무료 AI 이미지 프롬프트 카드·질문 생성기 카드를 만들고 결과 화면에
// 끼워 넣는다. 그 뒷부분은 브라우저(js/saju-engine.js renderSpecialCharm)에 남고, 여기서는 카드 HTML(html)을 돌려준다.
// 바뀐 곳은 끝의 return html; 한 줄뿐이다. 시각·난수는 쓰지 않는다.
  function renderSpecialCharm(p, natal) {
    // 기초 데이터
    var branches  = [p.y.j, p.m.j, p.d.j, p.h.j];
    var counts    = (natal&&natal.counts)?natal.counts:{wood:0,fire:0,earth:0,metal:0,water:0};
    var dominant  = (natal&&natal.dominant)?natal.dominant:'earth';
    var dayEl     = ((GAN[p.d.g]||{}).e)||'earth';
    var total     = Math.max(1, counts.wood+counts.fire+counts.earth+counts.metal+counts.water);

    // 신살 스탯 계산
    var taoSet  = ['子','午','卯','酉'];
    var taoHit  = branches.filter(function(b){return taoSet.indexOf(b)>=0;}).length;
    var taoPct  = Math.min(100, taoHit*22 + (taoSet.indexOf(p.d.j)>=0 ? 25 : 0));

    var yemSet  = ['寅','申','巳','亥'];
    var yemHit  = branches.filter(function(b){return yemSet.indexOf(b)>=0;}).length;
    var yemNY   = (yemSet.indexOf(p.y.j)>=0?1:0)+(yemSet.indexOf(p.m.j)>=0?1:0);
    var yemPct  = Math.min(100, yemHit*20 + yemNY*15);

    var hwaSet  = ['辰','戌','丑','未'];
    var hwaHit  = branches.filter(function(b){return hwaSet.indexOf(b)>=0;}).length;
    var hwaPct  = Math.min(100, hwaHit*22 + (hwaHit>=2?18:0));

    // 매력 클래스 결정
    var maxStat = Math.max(taoPct, yemPct, hwaPct);
    var charmAxis = 'balance';
    if(taoPct===maxStat && taoPct>=40) charmAxis = 'tao';
    else if(yemPct===maxStat && yemPct>=40) charmAxis = 'yem';
    else if(hwaPct===maxStat && hwaPct>=40) charmAxis = 'hwa';

    var powerInfo = (typeof G_POWER !== 'undefined' && G_POWER) ? G_POWER : null;
    var powerLabel = powerInfo && typeof powerInfo.isStrong === 'boolean' ? (powerInfo.isStrong ? '신강' : '신약') : '';
    var dayStemName = ((GAN[p.d.g]||{}).n) || p.d.g || '';
    var dayStemHint = dayStemName ? ' 바탕에는 ' + dayStemName + ' 일간 특유의 결도 깔려 있습니다.' : '';
    var tenGodCounts = {};
    if(typeof getTenGod === 'function'){
      [p.y.g,p.y.j,p.m.g,p.m.j,p.d.j,p.h.g,p.h.j].forEach(function(c){
        var tg = getTenGod(p.d.g, c);
        if(tg && tg !== '?') tenGodCounts[tg] = (tenGodCounts[tg]||0) + 1;
      });
    }
    var dominantTenGod = Object.keys(tenGodCounts).sort(function(a,b){return tenGodCounts[b]-tenGodCounts[a];})[0] || '';
    var titleMap = {
      tao: {
        fire:'첫인상 킬러',
        water:'다가갈수록 빠져드는 미스터리형',
        wood:'청량한 시선 강탈자',
        metal:'무심한 듯 강렬한 시선 도둑',
        earth:'조용한 중독형 매력가'
      },
      yem: {
        fire:'낯선 곳에서 빛나는 자유로운 매력가',
        water:'떠나는 뒷모습까지 남는 자유형',
        wood:'새로운 장면을 여는 설렘형',
        metal:'경계 없는 시선 도둑',
        earth:'의외의 반전 모험가'
      },
      hwa: {
        fire:'분위기 지배자',
        water:'다가갈수록 빠져드는 미스터리형',
        wood:'고독한 예술가형 아우라',
        metal:'차갑게 빛나는 아트 뮤즈',
        earth:'깊은 방의 온기를 가진 사람'
      },
      balance: {
        fire:'압도적 화려함',
        water:'위험한 신비로움',
        wood:'자연스러운 청량미',
        metal:'차가운 도시의 세련미',
        earth:'중독성 강한 안정감'
      }
    };
    var axisIcon = {tao:'🌹', yem:'🌪️', hwa:'🔮', balance:'💎'};
    var titleName = (titleMap[charmAxis] && titleMap[charmAxis][dominant]) || titleMap.balance[dominant] || '치명적 유혹자';
    var powerHint = powerLabel ? ' ' + powerLabel + ' 흐름이라 매력의 온도 조절 방식도 분명합니다.' : '';
    var tenGodHint = dominantTenGod ? ' 특히 ' + dominantTenGod + ' 결이 섞여 말투와 선택 기준에 개성이 남습니다.' : '';
    var summaryMap = {
      tao: {
        fire:'당신은 일부러 밝히지 않아도 시선이 먼저 반응하는 타입입니다. 표정, 리액션, 존재감 중 하나가 늘 사람의 기억에 선명하게 남습니다.',
        water:'당신은 가까워질수록 감정의 깊이가 드러나는 타입입니다. 조용한 눈빛과 말 사이의 여백이 상대를 오래 머물게 만듭니다.',
        wood:'당신은 꾸민 느낌보다 살아 있는 생기가 먼저 보이는 타입입니다. 자연스러운 웃음과 태도가 예상보다 강한 호감을 만듭니다.',
        metal:'당신은 무심한 듯 보여도 선명한 취향과 거리감으로 시선을 붙잡는 타입입니다. 쉽게 열리지 않는 분위기가 오히려 더 궁금하게 만듭니다.',
        earth:'당신은 자극적이지 않은데 오래 생각나는 타입입니다. 편안함 속에 묘한 중독성이 있어 시간이 지날수록 존재감이 커집니다.'
      },
      yem: {
        fire:'당신은 한곳에 머물 때보다 새로운 장면으로 들어갈 때 더 빛나는 타입입니다. 움직임, 말의 속도, 도전하는 표정이 매력의 스위치입니다.',
        water:'당신은 붙잡히지 않는 듯한 자유로움으로 마음을 흔드는 타입입니다. 다정해도 어딘가 먼 느낌이 있어 상대가 계속 따라가고 싶어집니다.',
        wood:'당신은 같이 있으면 다음 장면이 기대되는 타입입니다. 호기심과 성장 에너지가 사람에게 산뜻한 설렘을 남깁니다.',
        metal:'당신은 단정한데 예측 불가능한 반전이 있는 타입입니다. 정돈된 외피 뒤의 과감함이 낯선 곳에서 더 크게 드러납니다.',
        earth:'당신은 안정적으로 보이다가도 결정적인 순간에 판을 바꾸는 타입입니다. 의외성이 매력의 핵심 반전으로 작동합니다.'
      },
      hwa: {
        fire:'당신은 말보다 분위기로 먼저 공간을 장악하는 타입입니다. 뜨겁게 드러내지 않아도 내면의 장면이 주변 공기를 바꿉니다.',
        water:'당신은 쉽게 설명되지 않는 감정선으로 사람을 끌어당기는 타입입니다. 알수록 더 알고 싶어지는 미스터리가 강합니다.',
        wood:'당신은 섬세한 취향과 혼자만의 세계가 매력으로 번지는 타입입니다. 조용한데도 한 번 꽂히면 오래 남는 아우라가 있습니다.',
        metal:'당신은 차갑게 빛나는 미감과 높은 기준으로 특별해지는 타입입니다. 아무에게나 맞추지 않는 태도가 고급스러운 긴장을 만듭니다.',
        earth:'당신은 깊고 고요한 안정감 안에 독특한 세계를 품은 타입입니다. 오래 볼수록 마음을 기대고 싶게 만드는 힘이 있습니다.'
      },
      balance: {
        fire:'당신은 표현력이 살아날 때 가장 매력적인 타입입니다. 웃음, 말투, 행동의 온도가 주변 분위기를 빠르게 밝힙니다.',
        water:'당신은 조용히 스며들지만 쉽게 잊히지 않는 타입입니다. 감정선과 눈빛의 결이 상대에게 긴 여운을 남깁니다.',
        wood:'당신은 과하게 꾸미지 않아도 산뜻하게 눈에 들어오는 타입입니다. 편안한 생기와 자연스러운 태도가 호감을 만듭니다.',
        metal:'당신은 깔끔한 기준과 세련된 거리감으로 존재감을 만드는 타입입니다. 담백한데 선명해서 쉽게 흐려지지 않습니다.',
        earth:'당신은 가까이 있을수록 안정감이 깊어지는 타입입니다. 반복해서 만나도 피로하지 않은 편안함이 가장 큰 매력입니다.'
      }
    };
    var coreMap = {
      tao: {
        first:'처음 만났을 때는 평범하게 지나간 듯해도, 표정이나 눈빛 하나가 뒤늦게 떠오르는 잔상을 남깁니다.',
        deep:'가까워질수록 단순한 외적 매력보다 말투, 반응, 감정선에서 중독성이 강해집니다.',
        misread:'가볍게 관심을 준 것뿐인데 상대가 특별한 신호로 받아들일 수 있습니다.'
      },
      yem: {
        first:'첫인상부터 정적인 사람이라기보다 어디론가 향하는 사람처럼 보입니다. 그 움직임이 호기심을 자극합니다.',
        deep:'함께 새로운 경험을 할수록 활력과 추진력이 드러나 관계에 신선한 장면을 계속 만듭니다.',
        misread:'자유로운 태도가 무심함이나 거리두기로 오해될 수 있어, 중요한 사람에게는 확신의 말을 남기는 것이 좋습니다.'
      },
      hwa: {
        first:'처음에는 차분하거나 조용해 보여도, 이상하게 한 번 더 쳐다보게 만드는 깊은 분위기가 남습니다.',
        deep:'오래 볼수록 취향, 생각의 깊이, 혼자만의 세계가 드러나 쉽게 대체되지 않는 매력으로 변합니다.',
        misread:'혼자 있는 시간이 필요한 것뿐인데 상대는 마음을 닫았다고 착각하기 쉽습니다.'
      },
      balance: {
        first:'과하게 튀지는 않아도 전체적인 인상이 편안하게 정돈되어 있어 부담 없이 호감을 줍니다.',
        deep:'시간이 지날수록 상황에 맞게 매력을 조절하는 힘이 드러나 안정적인 끌림을 만듭니다.',
        misread:'표현이 담백하면 관심이 약한 것으로 보일 수 있어, 좋아하는 것에는 조금 더 선명하게 반응해도 좋습니다.'
      }
    };
    var cls = {
      icon: axisIcon[charmAxis] || '💎',
      name: titleName,
      sub: ((summaryMap[charmAxis] && summaryMap[charmAxis][dominant]) || summaryMap.balance[dominant] || summaryMap.balance.earth) + powerHint + dayStemHint + tenGodHint
    };
    var coreCopy = coreMap[charmAxis] || coreMap.balance;

    // 오행 마그네티즘
    var magMeta = {
      wood: {icon:'🌿', name:'목(木) — 자연스러운 청량미', pct:Math.round((counts.wood||0)/total*100),
             desc:'순수하고 생동감 넘치는 청춘 에너지. 상대를 편안하게 만드는 배려와 따뜻한 공감력이 핵심 매력입니다.',
             keyword:'청량함, 성장감, 순수함, 자연스러움',
             mood:'밝은 카페, 자연광, 산책, 캠퍼스, 봄 느낌',
             style:'깔끔한 캐주얼, 밝은 색감, 자연스러운 헤어',
             feeling:'편안함, 신뢰, 다정함',
             field:'교육, 상담, 콘텐츠, 커뮤니티, 자기계발 브랜딩'},
      fire: {icon:'🔥', name:'화(火) — 압도적 화려함', pct:Math.round((counts.fire||0)/total*100),
             desc:'화려하고 열정적으로 주변을 태우는 에너지. 리액션과 전달력이 뛰어나 첫인상에서 강한 호감을 남깁니다.',
             keyword:'화려함, 표현력, 인기, 무대성',
             mood:'조명 있는 공간, 파티, 무대, 라이브 방송, 발표 자리',
             style:'포인트 컬러, 선명한 인상, 자신감 있는 스타일링',
             feeling:'설렘, 활기, 기대감',
             field:'영상, 라이브, 강연, 마케팅, 연예/엔터테인먼트형 콘텐츠'},
      earth:{icon:'⛰️', name:'토(土) — 중독성 안정감', pct:Math.round((counts.earth||0)/total*100),
             desc:'묵직하고 믿음직해 기댈 곳을 주는 중독성 안정감. 오래 곁에 있고 싶게 만드는 포근한 신뢰 매력입니다.',
             keyword:'안정감, 포근함, 신뢰, 중독성',
             mood:'따뜻한 실내, 조용한 대화, 편안한 식사 자리',
             style:'부드러운 색감, 단정함, 고급스러운 기본템',
             feeling:'안심, 의지, 오래 보고 싶은 느낌',
             field:'상담, 고객관리, 운영, 멘토링, 장기 관계형 비즈니스'},
      metal:{icon:'🗡️', name:'금(金) — 차가운 세련미', pct:Math.round((counts.metal||0)/total*100),
             desc:'날카롭고 세련되어 함부로 다가가기 힘든 분위기. 기준이 높아 선택받은 기분을 주는 희귀 매력입니다.',
             keyword:'세련미, 절제, 기준, 차가운 매력',
             mood:'도시적 공간, 고급 바, 전시회, 비즈니스 미팅',
             style:'미니멀, 블랙/화이트/실버, 날렵한 실루엣',
             feeling:'긴장감, 존중, 선택받고 싶은 욕구',
             field:'프리미엄 브랜딩, 전문직 이미지, 컨설팅, 디자인, 고급 서비스'},
      water:{icon:'🌊', name:'수(水) — 위험한 신비로움', pct:Math.round((counts.water||0)/total*100),
             desc:'깊이를 알 수 없는 눈빛과 지적 아우라. 상대를 계속 궁금하게 만드는 트랩형 카리스마입니다.',
             keyword:'신비로움, 지성, 깊이, 묘한 중독성',
             mood:'밤, 비 오는 날, 조용한 음악, 어두운 조명, 깊은 대화',
             style:'차분한 색감, 흐르는 소재, 지적인 분위기',
             feeling:'궁금증, 몰입, 감정적 여운',
             field:'글쓰기, 상담, 심리 콘텐츠, 스토리텔링, 브랜딩, 기획'}
    };

    var axisFactPack = {
      tao: {
        habit:'당신은 별생각 없이 던진 말이나 짧은 리액션에도 여운이 남는 타입입니다. 특히 도화 기운이 강하면 친절과 호감의 경계가 흐려 보이기 쉽습니다. 모두에게 같은 온도를 주면 진짜 마음을 줘야 할 사람에게 신호가 흐려집니다.',
        misread:'사람들은 당신의 자연스러운 눈맞춤이나 웃음을 특별한 초대처럼 받아들일 수 있습니다. 관심이 없는 상대에게도 분위기를 열어주면 관계가 애매하게 꼬입니다.',
        damage:'매력을 확인받으려고 반응을 과하게 뿌리는 순간, 원래의 고급스러운 흡입력이 가벼워집니다. 좋아하는 사람과 아닌 사람의 온도를 구분해야 합니다.',
        shine:'꾸미지 않았는데 표정, 향, 말투가 한 장면처럼 남을 때 가장 매력적입니다. 시선이 모이는 자리에서는 많이 설명하기보다 한 박자 느린 여유가 더 강합니다.',
        fix:'오늘부터는 누구에게나 다정한 사람이 아니라, 필요한 사람에게 선명한 사람이 되세요. 호감이 있다면 애매한 리액션보다 짧고 정확한 관심 표현이 좋습니다.'
      },
      yem: {
        habit:'당신은 익숙한 자리에서도 다음 장면을 상상하게 만드는 사람입니다. 가볍게 한 제안이나 이동 욕구가 상대에게는 함께 떠나고 싶은 신호처럼 보일 수 있습니다.',
        misread:'사람들은 당신의 자유로움을 설렘으로 느끼면서도, 동시에 언제든 멀어질 사람처럼 오해할 수 있습니다. 가까운 관계일수록 약속과 방향을 말로 확인해줘야 합니다.',
        damage:'계속 새로움만 찾으면 매력은 생동감이 아니라 산만함으로 바뀝니다. 관계와 일에서 최소한의 반복 루틴을 두어야 신뢰가 쌓입니다.',
        shine:'낯선 장소, 새로운 프로젝트, 외부 활동에서 몸의 리듬이 살아날 때 가장 매력적입니다. 당신은 움직일수록 표정과 말투에 활기가 붙습니다.',
        fix:'오늘부터는 떠날 자유만 보여주지 말고 돌아올 기준도 보여주세요. 중요한 사람에게는 다음 약속을 먼저 잡는 것이 매력의 안정감을 만듭니다.'
      },
      hwa: {
        habit:'당신은 침묵이나 혼자만의 취향으로도 사람을 끌어당기는 타입입니다. 설명하지 않는 부분이 많을수록 상대는 더 깊이 알고 싶어 합니다.',
        misread:'사람들은 당신의 고요함을 신비롭게 느끼지만, 때로는 차갑거나 벽이 높다고 오해합니다. 마음을 닫은 것이 아니라 몰입 중이라는 신호를 작게라도 보여줘야 합니다.',
        damage:'너무 오래 혼자만의 세계에 머물면 깊이는 매력이 아니라 거리감이 됩니다. 중요한 관계에서는 감정의 문을 조금 더 자주 열어야 합니다.',
        shine:'취향, 글, 음악, 생각의 결이 자연스럽게 드러나는 순간 가장 매력적입니다. 조용한데도 오래 기억되는 아우라는 억지로 밝아질 때보다 진심을 보일 때 살아납니다.',
        fix:'오늘부터는 신비로움 뒤에 숨기보다, 좋아하는 것 하나를 분명히 말해보세요. 당신의 세계관은 감춰둘수록이 아니라 적당히 보여줄수록 강해집니다.'
      },
      balance: {
        habit:'당신은 과하게 밀어붙이지 않아도 편안한 호감을 남기는 타입입니다. 작은 배려와 정돈된 태도가 상대에게는 오래 곁에 두고 싶은 신호로 읽힙니다.',
        misread:'사람들은 당신의 담백함을 안정감으로 느끼지만, 때로는 관심이 약하다고 오해할 수 있습니다. 좋아하는 일과 사람 앞에서는 반응을 조금 더 선명하게 보여줘야 합니다.',
        damage:'무난함 뒤에 계속 숨으면 매력의 색이 흐려집니다. 갈등을 피하려고 원하는 것을 말하지 않는 습관이 당신의 존재감을 약하게 만듭니다.',
        shine:'상대가 불안해할 때 차분하게 중심을 잡아주는 순간 가장 매력적입니다. 튀는 장면보다 오래 믿을 수 있는 태도에서 진짜 힘이 나옵니다.',
        fix:'오늘부터는 좋은 사람으로만 남으려 하지 말고, 내 취향과 기준을 한 가지씩 드러내세요. 부드러움 안에 선명함이 생길 때 매력이 깊어집니다.'
      }
    };
    var elementCaution = {
      wood:'목 기운은 너무 맞춰주면 착한 사람 이미지로만 굳어질 수 있습니다. 다정함 속에도 내 방향을 함께 보여주세요.',
      fire:'화 기운은 반응이 크고 빠를수록 오해도 빨리 번집니다. 중요한 신호는 뜨겁게, 사소한 신호는 가볍게 조절하세요.',
      earth:'토 기운은 안정감이 강한 만큼 상대가 당연하게 기대기 쉽습니다. 받아주는 것과 허용하는 것은 다르게 관리해야 합니다.',
      metal:'금 기운은 세련된 거리감이 매력이지만, 온기가 부족하면 차갑게 읽힙니다. 마음에 드는 사람에게는 칭찬을 아끼지 마세요.',
      water:'수 기운은 묘한 여운이 강하지만, 설명이 너무 적으면 상대를 불안하게 만듭니다. 침묵보다 한 문장의 진심이 더 깊게 남습니다.'
    };
    var factCopy = axisFactPack[charmAxis] || axisFactPack.balance;
    var bombs = [
      {label:_sajuEngineText("se_6148_prop_label"), text:factCopy.habit},
      {label:_sajuEngineText("se_6149_prop_label"), text:factCopy.misread + ' ' + (elementCaution[dominant] || elementCaution.earth)},
      {label:_sajuEngineText("se_6150_prop_label"), text:factCopy.damage},
      {label:_sajuEngineText("se_6151_prop_label"), text:factCopy.shine},
      {label:_sajuEngineText("se_6152_prop_label"), text:factCopy.fix}
    ];

    var stylePrescription = {
      wood:'밝은 색감, 자연광에 잘 사는 헤어, 깔끔한 캐주얼이 좋습니다. 너무 꾸민 느낌보다 생기 있고 편안한 인상이 매력을 살립니다.',
      fire:'포인트 컬러, 선명한 립이나 액세서리, 자신감 있는 실루엣이 좋습니다. 단, 전부 강하게 하기보다 한 곳만 주인공으로 세우세요.',
      earth:'부드러운 색감, 고급스러운 기본템, 포근한 소재가 잘 맞습니다. 안정감 속에 은근한 디테일을 넣으면 오래 보고 싶은 분위기가 됩니다.',
      metal:'블랙, 화이트, 실버, 미니멀한 라인이 잘 맞습니다. 차가운 세련미에 작은 온기 포인트를 더하면 접근하기 어려운 느낌이 부드러워집니다.',
      water:'차분한 색감, 흐르는 소재, 지적인 분위기가 잘 맞습니다. 밤빛이나 비 오는 날 어울리는 무드를 활용하면 신비로운 여운이 강해집니다.'
    };
    var snsPrescription = {
      tao:'프로필은 얼굴보다 분위기, 표정, 시선의 결이 보이게 잡는 것이 좋습니다. 짧은 영상이나 스토리형 콘텐츠에서 도화의 잔상이 더 잘 살아납니다.',
      yem:'움직임이 있는 기록, 장소 변화, 새로운 시도 과정을 보여주는 콘텐츠가 좋습니다. 정적인 셀카보다 오늘의 장면과 루트가 보일 때 매력이 커집니다.',
      hwa:'취향, 글, 음악, 생각이 묻어나는 콘텐츠가 좋습니다. 많이 노출하기보다 세계관이 느껴지는 한 장면을 꾸준히 쌓는 방식이 강합니다.',
      balance:'편안한 루틴, 정돈된 취향, 신뢰가 느껴지는 기록이 좋습니다. 과한 연출보다 꾸준히 보고 싶어지는 톤을 만드는 것이 유리합니다.'
    };
    var missionText = {
      tao:'오늘은 아무에게나 매력을 흘리지 말고, 딱 한 사람에게만 선명한 관심을 표현해보세요. 도화의 힘은 넓게 뿌릴 때보다 정확히 꽂힐 때 더 강합니다.',
      yem:'오늘은 익숙한 동선 하나를 바꿔보세요. 새로운 장소와 움직임이 역마의 생기를 깨우고, 당신의 표정에 더 살아 있는 리듬을 만듭니다.',
      hwa:'오늘은 좋아하는 음악, 문장, 이미지 중 하나를 누군가에게 공유해보세요. 화개의 힘은 혼자 품을 때보다 취향을 통해 연결될 때 깊어집니다.',
      balance:'오늘은 작은 배려 하나를 선명하게 표현해보세요. 편안한 매력은 말하지 않아도 느껴지지만, 말해줄 때 더 오래 남습니다.'
    };
    var strategies = [
      {
        label:_sajuEngineText("se_6176_prop_label"),
        text:(charmAxis==='tao'
          ? '첫 만남에서는 이미 절반의 인상이 남습니다. 그래서 더 많이 어필하기보다 상대가 궁금해할 여백을 남기는 것이 좋습니다. 마음에 드는 사람에게만 시선을 오래 두고, 관계가 시작된 뒤에는 꾸준한 관심 표현으로 도화의 지속력을 만들어야 합니다.'
          : charmAxis==='yem'
          ? '새로운 경험을 함께하는 데이트가 가장 잘 맞습니다. 장소, 산책, 짧은 여행처럼 장면이 바뀌면 당신의 매력이 자연스럽게 살아납니다. 다만 자유로움만 보여주면 불안해 보일 수 있으니 다음 약속을 먼저 제안하세요.'
          : charmAxis==='hwa'
          ? '가벼운 설렘보다 깊은 대화와 공통 취향이 관계를 오래 끌고 갑니다. 처음부터 모든 것을 열 필요는 없지만, 마음에 드는 사람에게는 당신의 세계를 조금씩 보여주는 것이 좋습니다. 침묵보다 진심 어린 한 문장이 더 강한 신호가 됩니다.'
          : '상대가 편안하게 다가올 수 있는 안정감이 강점입니다. 다만 너무 담백하면 호감이 약해 보일 수 있으니, 좋아하는 사람에게는 반응을 한 단계 선명하게 표현하세요. 오래 가는 관계에서는 꾸준함이 가장 큰 무기입니다.')
      },
      {
        label:_sajuEngineText("se_6186_prop_label"),
        text:'모두에게 같은 온도를 주기보다 관계의 깊이에 따라 표현을 조절하는 것이 좋습니다. 가까운 사람에게는 더 자주 확인의 말을 주고, 가벼운 관계에는 적당한 거리감을 남기세요. 당신의 매력은 경계가 선명할수록 더 고급스럽게 보입니다.'
      },
      {
        label:_sajuEngineText("se_6190_prop_label"),
        text:(taoPct>=40 || dominant==='fire'
          ? '사람 앞에 서는 일이 강한 브랜드 자산이 됩니다. 발표, 상담, 영업, 영상, 라이브처럼 당신이라는 사람이 신뢰도를 높이는 구조에 잘 맞습니다. 말투와 표정, 화면 구성을 하나의 이미지로 정리하면 성과가 더 좋아집니다.'
          : yemPct>=40
          ? '외부 미팅, 네트워킹, 새로운 프로젝트에서 강점이 커집니다. 한 분야에만 갇히기보다 여러 사람과 장면을 연결하는 역할이 좋습니다. 움직임이 많은 업무일수록 당신의 생동감이 설득력으로 바뀝니다.'
          : hwaPct>=40 || dominant==='water'
          ? '상담, 기획, 브랜딩, 연구, 콘텐츠처럼 깊이와 해석이 필요한 일에서 강합니다. 조용히 쌓은 취향과 관찰력이 전문성으로 보입니다. 표면적인 인기보다 신뢰를 오래 축적하는 방식이 돈과 연결됩니다.'
          : '운영, 고객관리, 멘토링, 교육처럼 오래 신뢰를 쌓는 일에 강합니다. 즉흥적인 화제성보다 안정적인 관계 관리가 성과로 이어집니다. 꾸준함을 시스템으로 만들면 당신의 매력이 실력처럼 보입니다.')
      },
      {
        label:_sajuEngineText("se_6200_prop_label"),
        text:stylePrescription[dominant] || stylePrescription.earth
      },
      {
        label:_sajuEngineText("se_6204_prop_label"),
        text:(snsPrescription[charmAxis] || snsPrescription.balance) + ' 개발자용 설명처럼 기능을 나열하기보다, 당신의 분위기와 취향이 먼저 느껴지게 구성하세요.'
      },
      {
        label:_sajuEngineText("se_6208_prop_label"),
        text:(taoPct>=40 || dominant==='fire' || dominant==='water'
          ? '얼굴, 분위기, 말투, 취향이 곧 브랜드가 될 수 있습니다. 영상 콘텐츠, 상담형 서비스, 강연, 라이브, SNS 브랜딩처럼 사람 자체가 신뢰를 만드는 구조에 잘 맞습니다. 특히 궁금해서 계속 보게 되는 콘텐츠를 만들면 매력이 수익으로 이어집니다.'
          : dominant==='metal'
          ? '기준, 취향, 전문성을 돈으로 바꾸는 구조가 좋습니다. 컨설팅, 디자인, 프리미엄 서비스처럼 선택받는 느낌을 주는 분야에 강합니다. 싸게 많이 팔기보다 명확한 기준과 고급스러운 이미지를 먼저 세우세요.'
          : dominant==='earth'
          ? '안정감과 지속성이 돈이 되는 구조에 잘 맞습니다. 고객관리, 멘토링, 운영, 장기 구독형 서비스처럼 오래 관계를 유지할수록 가치가 커집니다. 한번 믿은 사람이 다시 찾게 만드는 장치가 중요합니다.'
          : '성장감과 신뢰가 돈이 되는 구조에 잘 맞습니다. 교육, 커뮤니티, 자기계발 콘텐츠, 상담형 서비스처럼 사람을 좋은 방향으로 움직이는 분야가 유리합니다. 꾸준한 기록과 후기 축적이 금전운을 키웁니다.')
      },
      {
        label:_sajuEngineText("se_6218_prop_label"),
        text:'당신의 매력은 억압적이고 평가만 많은 환경에서 죽습니다. 자유롭게 표현할 수 있고, 취향과 개성을 보여줄 수 있는 곳에서 훨씬 강하게 살아납니다. 특히 감정과 리듬을 계속 숨겨야 하는 관계나 일터에서는 매력이 아니라 피로감만 쌓일 수 있습니다.'
      },
      {
        label:_sajuEngineText("se_6222_prop_label"),
        text:missionText[charmAxis] || missionText.balance
      }
    ];

    // HTML 조립
    var magRow = '';
    ['wood','fire','earth','metal','water'].forEach(function(e){
      var m = magMeta[e];
      var isActive = (e===dominant || e===dayEl);
      var lvl = m.pct>=33?'🔥 강함':m.pct>=20?'활성':m.pct>=10?'기본':'잠재';
      var magDetails = [
        {label:_sajuEngineText("se_6234_prop_label"), text:m.keyword},
        {label:_sajuEngineText("se_6235_prop_label"), text:m.mood},
        {label:_sajuEngineText("se_6236_prop_label"), text:m.style},
        {label:_sajuEngineText("se_6237_prop_label"), text:m.feeling},
        {label:_sajuEngineText("se_6238_prop_label"), text:m.field}
      ].map(function(item){
        return '<div class="cs-mag-item">'+
          '<div class="cs-mag-head"><span class="cs-mag-name">'+item.label+'</span></div>'+
          '<div class="cs-mag-desc">'+item.text+'</div>'+
        '</div>';
      }).join('');
      magRow += '<div class="cs-mag-item'+(isActive?' cs-active':'')+'">'+
        '<div class="cs-mag-head">'+
          '<span class="cs-mag-name">'+m.icon+' '+m.name+'</span>'+
          '<span class="cs-mag-level">'+lvl+' ('+m.pct+'%)</span>'+
        '</div>'+
        '<div class="cs-mag-desc">'+m.desc+'</div>'+
        '<div class="cs-mag-row" style="margin-top:9px">'+magDetails+'</div>'+
      '</div>';
    });

    function sinsalLevel(pct){
      pct = Number(pct)||0;
      if(pct>=70) return '강하게 발동';
      if(pct>=40) return '선명하게 활성';
      if(pct>=20) return '은근히 작동';
      return '잠재 매력';
    }
    function sinsalDetailRows(details){
      return '<div class="cs-mag-row" style="margin-top:9px">'+details.map(function(item){
        return '<div class="cs-mag-item">'+
          '<div class="cs-mag-head"><span class="cs-mag-name">'+item.label+'</span></div>'+
          '<div class="cs-mag-desc">'+item.text+'</div>'+
        '</div>';
      }).join('')+'</div>';
    }
    var sinsalRows = [
      {
        icon:'🌸',
        name:'도화살(桃花殺)',
        pct:taoPct,
        bar:'cs-bar-taohua',
        keyword:'치명적 존재감 · 시선 집중 · 유혹 · 인기 · 연예인 기질',
        details:[
          {label:_sajuEngineText("se_6278_prop_label"), text:'가만히 있어도 사람의 시선을 끌어당기는 흡입력이 있습니다. 단순히 예쁘다, 잘생겼다의 문제가 아니라 분위기가 남는 사람에 가깝습니다.'},
          {label:_sajuEngineText("se_6279_prop_label"), text:'사진, 영상, 첫 만남, 소개팅, SNS, 발표 자리처럼 시선이 집중되는 환경에서 특히 강하게 작동합니다.'},
          {label:_sajuEngineText("se_6280_prop_label"), text:'감각적이고 분위기를 중요하게 보는 사람, 첫인상에 민감한 사람, 은근한 설렘을 좋아하는 사람에게 강합니다.'},
          {label:_sajuEngineText("se_6281_prop_label"), text:'친절함이 플러팅처럼 보이거나, 가벼운 리액션이 관심 표현으로 과해석될 수 있습니다.'},
          {label:_sajuEngineText("se_6282_prop_label"), text:'프로필 사진, 영상 콘텐츠, 브랜딩, 소개팅, 영업, 상담, 강연, SNS 운영에 활용하면 좋습니다.'}
        ]
      },
      {
        icon:'🌪️',
        name:'역마살(驛馬殺)',
        pct:yemPct,
        bar:'cs-bar-yemma',
        keyword:'역동적 에너지 · 활력 · 개척자 · 글로벌 감각 · 모험',
        details:[
          {label:_sajuEngineText("se_6292_prop_label"), text:'한곳에 고여 있지 않는 생동감이 매력입니다. 새로운 장소, 새로운 사람, 새로운 일을 만날수록 존재감이 살아납니다.'},
          {label:_sajuEngineText("se_6293_prop_label"), text:'여행, 이동, 외부 미팅, 행사, 커뮤니티, 해외 관련 일, 새로운 프로젝트에서 매력이 커집니다.'},
          {label:_sajuEngineText("se_6294_prop_label"), text:'반복되는 일상에 지친 사람, 새로운 자극을 원하는 사람, 활동적인 사람에게 강하게 어필합니다.'},
          {label:_sajuEngineText("se_6295_prop_label"), text:'자유로워 보이는 만큼 안정감이 부족해 보일 수 있습니다. 중요한 사람에게는 머무를 마음을 말로 확인해주는 편이 좋습니다.'},
          {label:_sajuEngineText("se_6296_prop_label"), text:'여행 콘텐츠, 영업, 외부 활동, 글로벌 서비스, 이벤트 운영, 커뮤니티 리더 역할에 좋습니다.'}
        ]
      },
      {
        icon:'🔮',
        name:'화개살(華蓋殺)',
        pct:hwaPct,
        bar:'cs-bar-hwagae',
        keyword:'예술적 고독 · 신비로움 · 철학 · 직관 · 묘한 끌림',
        details:[
          {label:_sajuEngineText("se_6306_prop_label"), text:'쉽게 읽히지 않는 깊이와 고독한 분위기가 매력입니다. 조용한데 이상하게 존재감이 남는 타입입니다.'},
          {label:_sajuEngineText("se_6307_prop_label"), text:'혼자 집중하는 모습, 예술적 취향, 글쓰기, 상담, 철학적 대화, 야간 분위기, 감성적인 공간에서 강해집니다.'},
          {label:_sajuEngineText("se_6308_prop_label"), text:'가벼운 사람보다 깊은 사람을 좋아하는 상대, 취향과 세계관을 중요하게 보는 사람에게 강합니다.'},
          {label:_sajuEngineText("se_6309_prop_label"), text:'신비로움이 지나치면 차갑거나 벽이 있는 사람처럼 보일 수 있습니다.'},
          {label:_sajuEngineText("se_6310_prop_label"), text:'글쓰기, 예술, 상담, 브랜딩, 타로/사주/심리 콘텐츠, 고급스러운 개인 브랜드에 좋습니다.'}
        ]
      }
    ].map(function(s){
      return '<div class="cs-stat-row" style="margin-top:10px">'+
        '<div class="cs-stat-head"><span class="cs-stat-name">'+s.icon+' '+s.name+'</span><span class="cs-stat-pct">'+s.pct+'%</span></div>'+
        '<div class="cs-stat-keyword">'+s.keyword+' · '+sinsalLevel(s.pct)+'</div>'+
        '<div class="cs-bar-bg"><div class="cs-bar-fill '+s.bar+'" style="width:'+s.pct+'%"></div></div>'+
        sinsalDetailRows(s.details)+
      '</div>';
    }).join('');

    var coreRows = [
      {label:_sajuEngineText("se_6323_prop_label"), text:coreCopy.first},
      {label:_sajuEngineText("se_6324_prop_label"), text:coreCopy.deep},
      {label:_sajuEngineText("se_6325_prop_label"), text:coreCopy.misread}
    ].map(function(item){
      return '<div class="cs-mag-item cs-active">'+
        '<div class="cs-mag-head">'+
          '<span class="cs-mag-name">'+item.label+'</span>'+
        '</div>'+
        '<div class="cs-mag-desc">'+item.text+'</div>'+
      '</div>';
    }).join('');
    var situationTone = {
      love: charmAxis==='tao'
        ? '첫 만남에서 이미 절반은 먹고 들어가는 흡입력이 켜집니다.'
        : charmAxis==='yem'
        ? '새로운 사람을 만나는 장면에서 활기와 호기심이 빠르게 살아납니다.'
        : charmAxis==='hwa'
        ? '처음엔 조용해 보여도 대화가 깊어질수록 묘한 여운이 강해집니다.'
        : '부담 없이 호감을 주고, 대화가 이어질수록 편안한 매력이 드러납니다.',
      long: charmAxis==='hwa'
        ? '오래 볼수록 취향과 세계관이 열리며 대체하기 어려운 깊이가 생깁니다.'
        : charmAxis==='tao'
        ? '첫인상 이후에도 말투와 반응의 잔상이 남아 관계의 온도를 유지합니다.'
        : charmAxis==='yem'
        ? '반복되는 관계 안에서도 새로운 제안과 움직임으로 분위기를 환기합니다.'
        : '꾸준히 볼수록 안정감과 익숙한 온기가 매력으로 쌓입니다.',
      business: (dominant==='fire' || taoPct>=40)
        ? '사람 앞에 설 때 강력한 브랜드 자산이 됩니다.'
        : dominant==='metal'
        ? '정돈된 기준과 전문적인 인상이 신뢰를 빠르게 만듭니다.'
        : dominant==='earth'
        ? '차분하고 책임감 있는 태도가 장기 신뢰를 만듭니다.'
        : dominant==='water'
        ? '깊이 있는 설명과 기획력으로 상대를 몰입시킵니다.'
        : '성장감과 다정한 태도로 협업의 공기를 부드럽게 만듭니다.',
      profile: (taoPct>=40 || dominant==='fire')
        ? '얼굴, 분위기, 말투, 취향이 함께 노출될 때 매력이 커집니다.'
        : hwaPct>=40 || dominant==='water'
        ? '세계관과 감정선이 보이는 짧은 글, 영상, 프로필에서 여운이 깊어집니다.'
        : '과장된 연출보다 실제 취향과 생활감이 자연스럽게 보일 때 호감이 커집니다.',
      group: yemPct>=40
        ? '처음 보는 사람들과 섞일수록 이동감과 활력이 살아납니다.'
        : taoPct>=40
        ? '사람이 많은 자리에서 시선이 먼저 반응하는 존재감이 생깁니다.'
        : hwaPct>=40
        ? '소란스러운 자리보다 결이 맞는 소수와 깊게 연결될 때 빛납니다.'
        : '큰 주목보다 편안한 대화 흐름 속에서 매력이 안정적으로 전달됩니다.',
      conflict: powerLabel==='신강'
        ? '압박이 와도 쉽게 무너지지 않는 단단함이 드러납니다.'
        : powerLabel==='신약'
        ? '섬세하게 분위기를 읽고 상처를 줄이는 조율력이 드러납니다.'
        : '감정이 올라오는 순간에도 자기 색을 잃지 않는 태도가 중요합니다.'
    };
    var situationRows = [
      {
        title:_sajuEngineText("se_6378_prop_title"),
        items:[
          {label:_sajuEngineText("se_6380_prop_label"), text:situationTone.love},
          {label:_sajuEngineText("se_6381_prop_label"), text:'처음부터 어딘가 더 알고 싶고, 대화가 끝난 뒤에도 표정과 말투가 한 번 더 떠오르는 사람으로 남습니다.'},
          {label:_sajuEngineText("se_6382_prop_label"), text:'마음에 드는 사람에게만 신호를 선명하게 주고, 리액션보다 질문과 눈맞춤의 밀도를 조절하세요.'},
          {label:_sajuEngineText("se_6383_prop_label"), text:'너무 많은 리액션은 상대가 빠르게 착각하게 만들 수 있으니, 모두에게 같은 온도를 주지 않는 편이 좋습니다.'}
        ]
      },
      {
        title:_sajuEngineText("se_6387_prop_title"),
        items:[
          {label:_sajuEngineText("se_6389_prop_label"), text:situationTone.long},
          {label:_sajuEngineText("se_6390_prop_label"), text:'처음보다 시간이 지나면서 더 편해지고, 문득 생각나는 디테일이 많은 사람으로 느껴집니다.'},
          {label:_sajuEngineText("se_6391_prop_label"), text:'익숙한 관계일수록 작은 취향, 챙김, 솔직한 감정을 조금씩 보여주면 매력이 다시 살아납니다.'},
          {label:_sajuEngineText("se_6392_prop_label"), text:'너무 편해진 태도는 무관심처럼 보일 수 있어, 고마움과 호감은 가볍게라도 표현하는 것이 좋습니다.'}
        ]
      },
      {
        title:_sajuEngineText("se_6396_prop_title"),
        items:[
          {label:_sajuEngineText("se_6398_prop_label"), text:situationTone.business},
          {label:_sajuEngineText("se_6399_prop_label"), text:'설명, 발표, 상담, 영업처럼 사람이 신뢰도를 높이는 자리에서 기억에 남는 인상을 줍니다.'},
          {label:_sajuEngineText("se_6400_prop_label"), text:'결과물만 보여주기보다 당신의 관점, 말투, 문제 해결 방식을 함께 보여주면 설득력이 커집니다.'},
          {label:_sajuEngineText("se_6401_prop_label"), text:'매력이 앞서면 실력보다 이미지로만 평가될 수 있으니, 근거와 약속 이행을 함께 남기세요.'}
        ]
      },
      {
        title:_sajuEngineText("se_6405_prop_title"),
        items:[
          {label:_sajuEngineText("se_6407_prop_label"), text:situationTone.profile},
          {label:_sajuEngineText("se_6408_prop_label"), text:'단순한 셀카보다 취향과 세계관이 보일 때 더 오래 보고 싶은 사람으로 남습니다.'},
          {label:_sajuEngineText("se_6409_prop_label"), text:'프로필 사진, 짧은 영상, 스토리형 콘텐츠에 표정·목소리·공간의 결을 함께 담으세요.'},
          {label:_sajuEngineText("se_6410_prop_label"), text:'과한 연출은 오히려 진짜 매력을 흐릴 수 있으니, 가장 자연스러운 장면을 선명하게 고르는 편이 좋습니다.'}
        ]
      },
      {
        title:_sajuEngineText("se_6414_prop_title"),
        items:[
          {label:_sajuEngineText("se_6416_prop_label"), text:situationTone.group},
          {label:_sajuEngineText("se_6417_prop_label"), text:'처음엔 분위기에 섞여 있어도 어느 순간 대화의 중심이나 기억나는 사람으로 남습니다.'},
          {label:_sajuEngineText("se_6418_prop_label"), text:'모두에게 잘 보이려 하기보다 결이 맞는 사람과 깊이를 만들면 매력의 밀도가 올라갑니다.'},
          {label:_sajuEngineText("se_6419_prop_label"), text:'관심이 분산되면 가볍게 보일 수 있으니, 중요한 연결에는 후속 연락과 약속을 분명히 하세요.'}
        ]
      },
      {
        title:_sajuEngineText("se_6423_prop_title"),
        items:[
          {label:_sajuEngineText("se_6425_prop_label"), text:situationTone.conflict},
          {label:_sajuEngineText("se_6426_prop_label"), text:'감정이 흔들리는 순간의 태도에서 진짜 품격과 신뢰도가 드러나는 사람으로 보입니다.'},
          {label:_sajuEngineText("se_6427_prop_label"), text:'바로 결론을 내기보다 감정 확인 한 문장, 사실 정리, 다음 행동 제안 순서로 말하면 매력이 보호됩니다.'},
          {label:_sajuEngineText("se_6428_prop_label"), text:'침묵은 차가움으로, 과한 설명은 변명으로 보일 수 있으니 짧고 진심 있는 표현을 남기세요.'}
        ]
      }
    ].map(function(section){
      return '<div class="cs-mag-item cs-active">'+
        '<div class="cs-mag-head"><span class="cs-mag-name">'+section.title+'</span></div>'+
        '<div class="cs-mag-row" style="margin-top:9px">'+section.items.map(function(item){
          return '<div class="cs-mag-item">'+
            '<div class="cs-mag-head"><span class="cs-mag-name">'+item.label+'</span></div>'+
            '<div class="cs-mag-desc">'+item.text+'</div>'+
          '</div>';
        }).join('')+'</div>'+
      '</div>';
    }).join('');
    var stageRows = [
      {
        title:_sajuEngineText("se_6444_prop_title"),
        text:(charmAxis==='tao'
          ? '당신의 매력은 처음부터 강하게 꽂히는 타입입니다. 그래서 억지로 어필하기보다, 상대가 궁금해할 여백을 남기는 것이 더 효과적입니다. 마음에 드는 사람에게는 애매한 신호보다 꾸준한 관심 표현을 주는 것이 관계 지속에 좋습니다.'
          : charmAxis==='yem'
          ? '당신의 매력은 같이 있을 때 새로운 장면이 열리는 데 있습니다. 반복되는 대화보다 산책, 전시, 여행, 새로운 장소처럼 움직임이 있는 데이트에서 더 잘 살아납니다. 다만 자유로움이 거리감으로 보이지 않도록, 마음이 있는 상대에게는 다음 약속을 분명히 남기는 것이 좋습니다.'
          : charmAxis==='hwa'
          ? '당신의 매력은 빠른 고백보다 천천히 깊어지는 대화에서 강합니다. 취향, 음악, 책, 감정선처럼 내면을 보여주는 소재가 관계를 특별하게 만듭니다. 너무 오래 숨으면 차갑게 보일 수 있으니, 좋아하는 마음은 작은 문장으로라도 드러내는 편이 좋습니다.'
          : '당신의 매력은 편안하게 가까워지는 데 있습니다. 처음부터 강하게 밀어붙이기보다, 안정적인 대화와 꾸준한 반응이 더 좋은 흐름을 만듭니다. 마음에 드는 사람에게는 작은 배려를 반복해 신뢰를 쌓는 방식이 잘 맞습니다.')
      },
      {
        title:_sajuEngineText("se_6454_prop_title"),
        text:(dominant==='wood'
          ? '사람들과의 관계에서는 자연스럽고 다정한 태도가 가장 큰 장점입니다. 누군가를 성장하게 만들거나 분위기를 부드럽게 푸는 역할에 잘 맞습니다. 다만 모두를 챙기려 하면 에너지가 흩어질 수 있으니, 오래 갈 사람에게 더 깊게 마음을 쓰는 편이 좋습니다.'
          : dominant==='fire'
          ? '사람들과의 관계에서는 분위기를 띄우고 흐름을 살리는 힘이 강합니다. 모임에서 먼저 웃고 반응하는 것만으로도 사람들은 당신을 중심 인물처럼 기억합니다. 다만 에너지가 강할수록 상대가 압도될 수 있으니, 듣는 시간을 의식적으로 남기면 관계가 더 좋아집니다.'
          : dominant==='earth'
          ? '사람들과의 관계에서는 믿고 기대고 싶은 안정감이 강점입니다. 오래 알고 지낼수록 진가가 드러나며, 주변 사람들은 당신을 관계의 기준점처럼 느낄 수 있습니다. 다만 너무 참고 받아주기만 하면 당연한 사람으로 보일 수 있으니, 선을 부드럽게 말하는 연습이 필요합니다.'
          : dominant==='metal'
          ? '사람들과의 관계에서는 선명한 기준과 세련된 거리감이 매력입니다. 아무에게나 쉽게 맞추지 않는 태도 때문에 오히려 존중받는 인상이 생깁니다. 다만 차갑게 보일 수 있으니, 가까운 사람에게는 칭찬과 인정 표현을 조금 더 자주 보여주는 것이 좋습니다.'
          : '사람들과의 관계에서는 깊이 듣고 오래 기억하는 힘이 강점입니다. 상대는 당신과 대화할 때 쉽게 말하지 못한 감정까지 꺼내게 될 수 있습니다. 다만 혼자 생각이 깊어지면 오해가 커질 수 있으니, 중요한 관계에서는 추측보다 확인 질문이 좋습니다.')
      },
      {
        title:_sajuEngineText("se_6466_prop_title"),
        text:(situationTone.business + ' 설명, 발표, 상담, 영업, 운영처럼 사람 자체가 결과의 신뢰도를 높이는 일에 잘 맞습니다. 당신의 말투와 태도, 문제를 바라보는 방식까지 함께 보여주면 단순한 실무자를 넘어 기억되는 사람으로 남습니다.')
      },
      {
        title:_sajuEngineText("se_6470_prop_title"),
        text:(situationTone.profile + ' 단순히 예쁘게 보이는 것보다 어떤 분위기의 사람인지 드러나는 프로필이 더 잘 맞습니다. 짧은 영상, 스토리, 고정된 색감, 반복되는 말투처럼 사람들이 알아볼 수 있는 시그니처를 만들면 매력이 브랜드가 됩니다.')
      },
      {
        title:_sajuEngineText("se_6474_prop_title"),
        text:(hwaPct>=40 || dominant==='water'
          ? '창작에서는 감정적 여운과 세계관을 남기는 콘텐츠에 강합니다. 짧은 글, 상담형 콘텐츠, 타로/사주/심리 해석, 에세이처럼 보는 사람이 자기 이야기를 투영하는 형식이 잘 맞습니다. 설명을 많이 하기보다 한 장면, 한 문장, 한 분위기를 선명하게 남기는 방식이 효과적입니다.'
          : taoPct>=40 || dominant==='fire'
          ? '창작에서는 얼굴, 말투, 리액션, 분위기가 함께 보이는 콘텐츠에 강합니다. 라이브, 숏폼, 발표형 영상, 후기 콘텐츠처럼 사람 자체의 에너지가 전달되는 형식이 잘 맞습니다. 다만 자극만 강하면 빨리 소비될 수 있으니, 반복해서 보고 싶은 코너나 콘셉트를 함께 만들어야 합니다.'
          : yemPct>=40
          ? '창작에서는 이동, 체험, 변화가 있는 콘텐츠에 강합니다. 여행, 장소 추천, 외부 미팅 기록, 새로운 도전기처럼 장면이 바뀔수록 당신의 매력이 살아납니다. 꾸준히 기록하면 단순한 일상이 아니라 따라가고 싶은 여정으로 보일 수 있습니다.'
          : '창작에서는 편안하고 신뢰 가는 정보형 콘텐츠에 강합니다. 루틴, 자기계발, 상담형 글, 관계 조언처럼 오래 저장하고 싶은 주제가 잘 맞습니다. 과한 자극보다 꾸준히 다시 찾게 되는 안정적인 톤을 만드는 것이 좋습니다.')
      },
      {
        title:_sajuEngineText("se_6484_prop_title"),
        text:((taoPct>=40 || dominant==='fire' || dominant==='water')
          ? '얼굴, 분위기, 말투, 취향이 곧 브랜드가 될 수 있습니다. 영상 콘텐츠, 상담형 서비스, 강연, 라이브, SNS 브랜딩처럼 사람 자체가 신뢰를 만드는 구조에 잘 맞습니다. 특히 도화와 수 기운이 함께 살아 있으면 궁금해서 계속 보게 되는 콘텐츠에 강점이 있습니다.'
          : dominant==='metal'
          ? '기준, 취향, 전문성이 돈이 되는 구조에 잘 맞습니다. 프리미엄 컨설팅, 디자인, 큐레이션, 전문직 이미지, 고급 서비스처럼 선택받고 싶은 욕구를 자극하는 분야가 좋습니다. 가격보다 기준을 먼저 보여주면 당신의 세련된 이미지가 신뢰로 바뀝니다.'
          : dominant==='earth'
          ? '안정감과 지속성이 돈이 되는 구조에 잘 맞습니다. 고객관리, 멘토링, 운영 대행, 장기 구독형 서비스처럼 오래 관계를 이어갈수록 가치가 커지는 분야가 좋습니다. 처음부터 크게 터뜨리기보다 재구매와 추천이 쌓이는 모델에서 강합니다.'
          : '성장감과 다정함이 돈이 되는 구조에 잘 맞습니다. 교육, 커뮤니티, 자기계발 콘텐츠, 상담형 서비스처럼 사람을 더 나은 방향으로 움직이는 분야가 좋습니다. 신뢰가 쌓일수록 브랜드가 커지므로, 꾸준한 기록과 후기가 중요한 자산이 됩니다.')
      }
    ].map(function(section){
      return '<div class="cs-mag-item cs-active">'+
        '<div class="cs-mag-head"><span class="cs-mag-name">'+section.title+'</span></div>'+
        '<div class="cs-mag-desc">'+section.text+'</div>'+
      '</div>';
    }).join('');
    function csSectionTitle(icon, title, subtitle){
      return '<div class="cs-section-heading">'+
        '<div class="cs-section-title"><span class="cs-section-icon">'+icon+'</span><span>'+title+'</span></div>'+
        '<div class="cs-section-sub">'+subtitle+'</div>'+
      '</div>';
    }
    var missionPack = {
      tao: {
        title:_sajuEngineText("se_6507_prop_title"),
        subtitle:_sajuEngineText("se_6508_prop_subtitle"),
        tasks:['프로필 사진이나 첫 화면에서 가장 분위기 있는 한 장을 골라보세요.','관심 있는 사람에게만 짧고 분명한 리액션을 남겨보세요.','오늘 받은 시선과 반응 중 기분 좋은 순간을 하나 기록하세요.']
      },
      yem: {
        title:_sajuEngineText("se_6512_prop_title"),
        subtitle:_sajuEngineText("se_6513_prop_subtitle"),
        tasks:['평소와 다른 길, 카페, 자리에서 하루의 리듬을 시작해보세요.','대화 중 하나는 새로운 제안으로 열어보세요.','움직임이 느껴지는 사진이나 짧은 기록을 남겨보세요.']
      },
      hwa: {
        title:_sajuEngineText("se_6517_prop_title"),
        subtitle:_sajuEngineText("se_6518_prop_subtitle"),
        tasks:['좋아하는 음악, 문장, 이미지 중 하나를 골라 오늘의 분위기로 정하세요.','가벼운 답장 대신 진심이 담긴 한 문장을 보내보세요.','혼자 몰입하는 모습을 콘텐츠나 기록으로 남겨보세요.']
      },
      balance: {
        title:_sajuEngineText("se_6522_prop_title"),
        subtitle:_sajuEngineText("se_6523_prop_subtitle"),
        tasks:['오늘 입는 색감이나 향을 하나만 정해 분위기를 통일해보세요.','고마운 사람에게 짧은 인정의 말을 보내보세요.','내가 편안해지는 루틴 하나를 사진이나 메모로 남겨보세요.']
      }
    };
    var mission = missionPack[charmAxis] || missionPack.balance;
    var missionRows = mission.tasks.map(function(task){
      return '<div class="cs-mission-task">'+task+'</div>';
    }).join('');
    var bombRows = bombs.map(function(f){
      return '<div class="cs-factbomb-item"><strong>'+f.label+'</strong><span>'+f.text+'</span></div>';
    }).join('');
    var stratRows = strategies.map(function(s){
      return '<div class="cs-strategy-item"><strong>'+s.label+'</strong><span>'+s.text+'</span></div>';
    }).join('');

    var html =
      '<div id="specialCharmCard" style="margin-top:15px">'+
      '<div class="cscard">'+
        '<div class="cs-class-wrap">'+
          '<span class="cs-class-icon">'+cls.icon+'</span>'+
          '<div class="cs-class-label">나의 매력 클래스</div>'+
          '<div class="cs-class-name">'+cls.name+'</div>'+
          '<div class="cs-class-kicker">MOONLIGHT RPG CHARM CARD</div>'+
          '<div class="cs-class-sub">'+cls.sub+'</div>'+
        '</div>'+
        '<div class="cs-divider"></div>'+
        csSectionTitle('💘','매력 핵심 요약','첫인상, 오래 남는 결, 오해받기 쉬운 이미지를 한 번에 정리합니다.')+
        '<div class="cs-mag-row">'+coreRows+'</div>'+
        '<div class="cs-divider"></div>'+
        csSectionTitle('✨','상황별 매력 발동 리포트','소개팅부터 갈등 상황까지, 언제 어떤 매력이 켜지는지 봅니다.')+
        '<div class="cs-mag-row">'+situationRows+'</div>'+
        '<div class="cs-divider"></div>'+
        '<div class="cs-stat-section">'+
          csSectionTitle('⚡','3대 매력 신살 스탯','도화·역마·화개가 만드는 시선, 이동감, 신비감을 카드로 풉니다.')+
          sinsalRows+
        '</div>'+
        '<div class="cs-divider"></div>'+
        csSectionTitle('🌈','오행 매력 마그네티즘','목·화·토·금·수의 분위기와 스타일 활용처를 확장해서 보여줍니다.')+
        '<div class="cs-mag-row">'+magRow+'</div>'+
        '<div class="cs-divider"></div>'+
        csSectionTitle('🎯','이 매력을 써먹기 좋은 무대','연애, 관계, 일, 브랜딩, 콘텐츠, 수익화 방향을 현실적으로 제안합니다.')+
        '<div class="cs-mag-row">'+stageRows+'</div>'+
        '<div class="cs-divider"></div>'+
        '<div class="cs-factbomb">'+
          '<div class="cs-factbomb-title"><span>💥</span><span>팩폭 카드</span><small>매력이 오해로 바뀌는 지점</small></div>'+
          bombRows+
        '</div>'+
        '<div class="cs-strategy">'+
          '<div class="cs-strategy-title"><span>🚀</span><span>천기 처방전 카드</span><small>오늘부터 써먹는 매력 운용법</small></div>'+
          stratRows+
        '</div>'+
        '<div class="cs-mission">'+
          '<div class="cs-mission-title"><span>🌙</span><span>오늘의 매력 미션 카드</span></div>'+
          '<div class="cs-mission-sub">'+mission.title+' · '+mission.subtitle+'</div>'+
          '<div class="cs-mission-list">'+missionRows+'</div>'+
        '</div>'+
      '</div>'+
      '</div>';
    return html;
  }
