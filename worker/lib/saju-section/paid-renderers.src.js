// 사주 종합·대운 풀이 유료 렌더러 정본. 브라우저로 내려가지 않는다.
// scripts/extract-saju-section-runtime.mjs 가 js/saju-engine.js 공유 헬퍼(TS_DEEP 같은 공유 표 포함)와 함께 runtime.generated.mjs 로 묶는다.
/* ─── 건강 & 개운 DB ─── */
var HEALTH_DATA={
  wood:{weak:'간, 담낭, 신경계, 근육',food:'녹색 채소(브로콜리, 시금치), 신맛 과일(매실, 레몬), 닭고기',advice:'화를 참으면 간이 상합니다. 등산이나 산림욕이 최고의 보약입니다.'},
  fire:{weak:'심장, 혈관, 소장, 시력',food:'붉은색 음식(토마토, 사과, 대추), 쓴맛(다크초콜릿, 커피 적당량)',advice:'급한 성격이 심장에 무리를 줍니다. 명상과 심호흡을 자주 하세요.'},
  earth:{weak:'위장, 비장, 소화기, 허리',food:'노란색 음식(단호박, 고구마, 바나나), 단맛(꿀, 엿)',advice:'생각이 너무 많으면 위가 탈이 납니다. 규칙적인 식사가 생명입니다.'},
  metal:{weak:'폐, 호흡기, 대장, 피부',food:'흰색 음식(배, 도라지, 무, 마늘), 매운맛(생강, 파)',advice:'건조한 환경은 피하세요. 물을 자주 마시고 피부 보습에 신경 쓰세요.'},
  water:{weak:'신장, 방광, 자궁/전립선, 귀',food:'검은색 음식(검은콩, 미역, 김, 흑미), 짠맛(적당한 해산물)',advice:'몸이 차가워지기 쉽습니다. 반신욕이나 족욕으로 체온을 높이세요.'}
};
/* ─── 영냥이(neo) 반말 표 — 서버 렌더러가 neo 일 때만 고른다. 돼지·AI 상담 경로는 원본 표를 그대로 읽는다. ─── */
var HEALTH_ADVICE_NEO={
  wood:'화를 오래 참으면 간에 부담이 갈 수 있어. 등산이나 산림욕처럼 숲에서 몸을 움직이는 시간이 좋은 회복이 돼.',
  fire:'급한 성격이 심장에 무리를 줄 수 있어. 명상이나 심호흡을 자주 해 봐.',
  earth:'생각이 너무 많으면 위가 탈 날 수 있어. 식사 시간을 규칙적으로 지키는 게 제일 중요해.',
  metal:'건조한 환경은 피하는 게 좋아. 물을 자주 마시고 피부 보습도 챙겨 봐.',
  water:'몸이 차가워지기 쉬운 편이야. 반신욕이나 족욕으로 체온을 올려 봐.'
};
// 마지막 한글 음절의 받침에 맞는 조사를 고른다. '으로/로'는 ㄹ 받침도 '로'를 쓴다.
function _sajuJo(word,withBatchim,withoutBatchim){
  var value=String(word||''),code=value.charCodeAt(value.length-1)-0xAC00;
  var batchim=code>=0&&code<=11171?code%28:-1;
  if(batchim<0)return withBatchim+'('+withoutBatchim+')';
  return batchim===0||(batchim===8&&withoutBatchim==='로')?withoutBatchim:withBatchim;
}
var TS_DEEP_NEO={
  '비견':{nature:'누구의 간섭도 받기 싫어하는 <b>자유로운 영혼</b>이야. 겉으론 조용해 보여도 속엔 "내가 최고"라는 자존심이 꽉 차 있어. 남 밑에서 일하기보다 네 이름을 걸고 하는 일이 잘 어울려.',career:'프리랜서, 전문직, 개인 사업, 예체능 분야 — 조직 생활보다 독립적인 업무에서 빛나는 편이야.',love:'<b>친구 같은 편안한 연애</b>를 좋아해. 너를 구속하거나 집착하는 상대랑은 오래 가기 어려울 수 있어. 서로 사생활을 존중해 주는 쿨한 사람이랑 잘 맞아.',advice:'고집이 너무 세지면 주변 사람이 멀어질 수 있어. 가끔은 "내가 틀릴 수도 있겠다"고 생각해 보는 유연함이 성공의 열쇠야. 동업보다는 혼자 움직이는 쪽이 유리해.'},
  '겁재':{nature:'승부욕이 정말 강한 타입이야. <b>"지면 잠이 안 오는"</b> 성격이거든. 겉으론 웃고 있어도 속으론 상대를 이길 수를 짜고 있어. 리더십이 있고 사람을 모으는 재주가 뛰어나.',career:'스포츠 에이전트, 엔터테인먼트, 투기성 사업, 정치, 영업직에서 두각을 나타내기 쉬워.',love:'<b>드라마틱하고 화려한 연애</b>를 꿈꿔. 경쟁자가 있는 상대의 마음을 얻었을 때 큰 희열을 느끼는 편이야.',advice:'도박이나 무리한 투자는 큰 손실로 이어지기 쉬워. 돈은 들어오는데 나가는 구멍도 커. 자동이체 같은 강제 저축 장치를 하나 만들어 봐.'},
  '식신':{nature:'천성이 <b>낙천적이고 베푸는 것</b>을 좋아해. "좋은 게 좋은 거지"라는 마음으로 주변 사람을 편하게 해 줘. 미식가가 많고 손재주도 뛰어난 편이야.',career:'요식업, 교육, 육아 관련, 디자이너, 연구원 — 네가 좋아하는 일을 해야 능력이 크게 살아나.',love:'<b>엄마/아빠처럼 챙겨 주는 연애</b>를 해. 맛있는 거 같이 먹으러 다니는 데이트를 제일 좋아해.',advice:'너무 퍼 주다 보면 이용당할 수도 있으니까 사람을 가려 사귀어 봐. 게을러지기 쉬운 편이라 규칙적인 운동을 하나 붙여 두면 좋아.'},
  '상관':{nature:'머리 회전이 엄청 빠르고 <b>말재주가 뛰어난 천재형</b>이야. 부조리한 걸 보면 못 참고 들이받는 반항아 기질 때문에 "트러블 메이커"가 되기도 해.',career:'언론인, 변호사, 컨설턴트, 유튜버, 마케터, 예능인 — 창의적인 표현이 허용되는 분야에서 크게 살아나.',love:'<b>티키타카가 잘 되는 지적인 사람</b>한테 끌려. 지루하거나 꼰대 같은 사람한텐 금방 지치는 편이야.',advice:'말 한마디로 천 냥 빚을 갚기도 하지만, 말 한마디로 적을 만들기도 해. 화가 났을 땐 3초만 쉬고 말해 봐.'},
  '편재':{nature:'스케일이 크고 <b>공간 지각 능력이 뛰어난 사업가</b>야. 작은 돈에 연연하지 않고 큰 그림을 그려. 유머 감각이 있고 노는 걸 좋아해서 주변에 사람이 끊이지 않아.',career:'무역, 유통, 금융 투자, 해외 관련 사업, 건설업에서 큰 성과를 내기 쉬워.',love:'<b>즐겁고 화끈한 연애</b>를 추구해. 이벤트에 강하고 상대를 즐겁게 해 주는 편이야.',advice:'계획 없는 소비나 유흥은 조심해. 현금보다는 부동산처럼 묶어 두는 자산이 더 잘 맞을 수 있어.'},
  '정재':{nature:'손꼽히게 <b>성실하고 꼼꼼한 사람</b>이야. 돌다리도 두들겨 보고 건너는 신중함이 있어. 1원 하나도 허투루 안 쓰는 경제 관념이 철저해.',career:'회계사, 은행원, 공무원, 경리, 약사 — 안정적인 월급이 나오는 체계적인 조직이 제일 잘 맞아.',love:'<b>신뢰와 안정을 최우선</b>으로 둬. 결혼을 전제로 한 진지한 만남을 좋아하고, 가정적인 배우자감으로 꼽히는 편이야.',advice:'너무 계산적이면 인간미가 없어 보일 수 있어. 가끔은 이유 없이 낭만도 즐겨 봐.'},
  '편관':{nature:'자존심과 명예를 정말 소중하게 여겨. <b>"나를 따르라"</b>는 카리스마가 있고, 힘든 일도 묵묵히 버텨 내는 인내심이 대단해. 의협심도 강한 편이야.',career:'군인, 경찰, 검찰, 경호, 외과의사, 특수 기술직에서 영웅 같은 활약을 하기 쉬워.',love:'<b>너를 존경해 주는 사람</b>을 원해. 한번 마음을 주면 끝까지 책임지는 편이야.',advice:'스트레스를 속으로 삭이다 보면 몸이 탈 날 수 있어. 운동이나 취미로 에너지를 풀어 봐.'},
  '정관':{nature:'법 없이도 살 수 있는 <b>바른 생활 사나이/숙녀</b>야. 규칙과 원칙을 중요하게 여기고, 어디서나 "믿을 수 있는 사람"이라는 말을 들어.',career:'행정 공무원, 교사, 대기업 직원, 공공기관 — 체계가 잡힌 조직에서 진가를 발휘해.',love:'<b>단정하고 예의 바른 사람</b>한테 호감을 느껴. 부모님이 좋아할 신랑/신붓감으로 꼽히는 편이야.',advice:'융통성이 부족해서 "답답하다"는 소리를 들을 수 있어. 남의 시선은 조금 덜 의식해도 괜찮아.'},
  '편인':{nature:'남들이 못 보는 세상을 보는 <b>직관력과 영감</b>이 뛰어나. 눈치가 100단이고 신비로운 매력이 있어. 조금 4차원적이거나 철학적인 생각에 잠길 때가 많아.',career:'역술가, 심리학자, 종교인, 작가, 연구직, IT 개발자 — 남다른 통찰력이 필요한 분야가 잘 맞아.',love:'<b>영혼이 통하는 소울메이트</b>를 찾아. 조건보다는 "느낌(Feel)"이 더 중요해.',advice:'생각만 하다가 기회를 놓칠 수 있어. 머릿속 아이디어를 하나라도 현실로 옮겨 보는 실행력을 길러 봐.'},
  '정인':{nature:'마음이 따뜻하고 <b>사랑받을 자격이 충분한 사람</b>이야. 지적 호기심이 많고 배우는 걸 좋아해. 윗사람 덕을 많이 보고 인복도 좋은 편이야.',career:'교수, 교사, 학자, 상담가, 부동산 임대업 — 배우고 가르치는 환경에서 제일 좋은 성과를 내.',love:'<b>다정하게 보살펴 주는 사람</b>을 좋아해. 정신적인 교감을 중요하게 여기고, 칭찬과 인정에 약한 편이야.',advice:'받는 데만 익숙해지면 의존적으로 바뀔 수 있어. 스스로 결정하는 자립심을 조금씩 키워 봐.'}
};
/* analyzeJohu 의 advice·moistAdvice·improve 를 type·moistType 기준으로 바꿔 끼운다. */
var JOHU_TEXT_NEO={
  advice:{hot:'사주가 많이 뜨거운 편이야. 水·金 기운이 특히 필요해.',warm:'사주가 따뜻한 편이야. 水 기운으로 조절하면 좋아.',neutral:'사주 온도가 시원하게 균형 잡혀 있어. 계절 변화에 맞춰 음양을 조절해 봐.',insufficient:'출생 시각이나 월지 정보가 부족해서 사주 온도(한난)는 단정하지 않을게.',cool:'사주가 서늘한 편이야. 火·木 기운으로 온기를 보충하면 좋아.',cold:'사주가 많이 차가운 편이야. 火·木 기운이 특히 필요해.'},
  moistAdvice:{wet:'사주에 습기가 많은 편이야. 건조한 환경이나 금(金)·불(火) 기운을 적당히 써 주면 균형이 좋아져.',dry:'사주가 건조한 편이야. 물(水)·나무(木) 기운이랑 실제 수분(물·목욕·자연)으로 촉촉함을 채워 주는 게 좋아.',insufficient:'출생 시각이나 월지 정보가 부족해서 습조(濕燥)는 단정하지 않을게.',balanced:'습조(濕燥)는 비교적 균형 잡힌 편이야. 한난만 잘 맞춰 주면 돼.'},
  improve:{heat:'시원하고 차가운 기운이 필요해. 북쪽 방향, 파란색·검은색 컬러, 수영·물가 활동이 잘 맞아.',chill:'따뜻하고 밝은 기운이 필요해. 남쪽 방향, 빨간색·주황색 컬러, 캠핑·BBQ 활동이 잘 맞아.',even:'균형 잡힌 사주야. 여러 오행을 골고루 써 봐.',pending:'출생 시각이 확인되면 사주 온도를 다시 판단할 수 있어.'}
};
function _sajuNeoJohu(johu){
  if(!johu||!johu.type)return johu;
  var t=johu.type, grp=(t==='hot'||t==='warm')?'heat':(t==='cold'||t==='cool')?'chill':t==='insufficient'?'pending':'even';
  return Object.assign({},johu,{
    advice:JOHU_TEXT_NEO.advice[t]||johu.advice,
    moistAdvice:JOHU_TEXT_NEO.moistAdvice[johu.moistType]||johu.moistAdvice,
    improve:JOHU_TEXT_NEO.improve[grp]
  });
}
/* evalDaewun 의 충·합 설명(chungBonusText/chungPenaltyText)은 고정 문장 + 글자 변수라서, 고정 문장 조각만 반말로 바꾼다. */
var CHUNG_TEXT_NEO=[
  ['열이 강한 편관으로 작용해 부담이 커지기 쉽습니다. 서둘러 나서기보다 토(土)의 안정 뒤에서 지키는 편이 유리합니다.','열이 강한 편관으로 작용해서 부담이 커지기 쉬워. 서둘러 나서기보다 토(土)의 안정 뒤에서 지키는 쪽이 유리해.'],
  [' 목(木) 기운까지 함께 들어와 토(土)의 완충이 약해지니 계약·말·지출을 더 신중히 살피세요.',' 목(木) 기운까지 같이 들어와서 토(土)의 완충이 약해지니까 계약·말·지출을 더 신중하게 살펴 봐.'],
  ['금 일간이 꼭 필요로 하는 화(火)가 수(水)와 부딪칩니다. 전통 해석은 이를 불이 쇠를 단련하는 장면으로 읽어, 부담 속에서 실력이 다듬어지는 흐름으로 봅니다.','금 일간한테 꼭 필요한 화(火)가 수(水)랑 부딪쳐. 전통 해석은 이걸 불이 쇠를 단련하는 장면으로 읽어서, 부담 속에서 실력이 다듬어지는 흐름으로 봐.'],
  ['이 충합니다. ','이 충해. '],
  ['기신으로 읽힌 요소를 제어하는 방향이지만, 실제 변화는 통근과 주변 생조에 따라 달라집니다.','기신으로 읽힌 요소를 제어하는 방향이지만, 실제 변화는 통근과 주변 생조에 따라 달라져.'],
  ['과 충이 생깁니다. 기존 역할이나 선택 기준의 조정이 필요할 수 있으며, 다른 생조 관계가 이를 완화하는지 함께 봅니다.','과 충이 생겨. 기존 역할이나 선택 기준을 조정해야 할 수도 있고, 다른 생조 관계가 이걸 완화하는지도 같이 봐.'],
  ['합화 검토 조건이 갖춰진 관계입니다. 다른 글자의 도움과 방해를 함께 확인하며 원국의 균형을 읽습니다.','합화 검토 조건이 갖춰진 관계야. 다른 글자의 도움과 방해를 같이 확인하면서 원국의 균형을 읽어.'],
  ['지지에서 물과 불이 부딪치며 금 일간의 단련이 이어집니다. 혼란이 큰 만큼 버티며 다듬은 결과가 남기 쉬운 흐름으로 읽습니다.','지지에서 물과 불이 부딪치면서 금 일간의 단련이 이어져. 혼란이 큰 만큼 버티며 다듬은 결과가 남기 쉬운 흐름으로 읽어.'],
  ['기신으로 읽힌 작용을 제어할 여지가 있으나, 생활 기반의 조정 부담과 완화 조건도 함께 살펴야 합니다.','기신으로 읽힌 작용을 제어할 여지는 있지만, 생활 기반을 조정하는 부담과 완화 조건도 같이 살펴 봐.'],
  ['과 충이 생겨 기반을 다시 조율하는 과제가 생길 수 있습니다. 합·생조가 완충하는지 살피며 사건을 확정하지 않습니다.','과 충이 생겨서 기반을 다시 조율할 과제가 생길 수도 있어. 합·생조가 완충하는지 살피고, 이것만으로 사건을 단정하진 않아.']
];
function _sajuNeoChungText(text){
  return CHUNG_TEXT_NEO.reduce(function(out,pair){return out.split(pair[0]).join(pair[1]);},String(text||''));
}
var GAEUN_TIPS={
  wood:{color:'흰색/메탈톤',place:'정리정돈, 미니멀 공간',action:'규칙, 루틴, 성문 점검표',food:'매운맛(생강/파) + 흰색 음식(배/무)'},
  fire:{color:'붉은색/주황색',place:'활기찬 공간, 남향',action:'운동, 사교 활동, 도전적인 일',food:'붉은 음식(토마토/사과) + 쓴맛(다크초콜릿/커피)'},
  earth:{color:'노랑/주황',place:'편안한 공간, 햇볕 잘 드는 곳',action:'휴식/여가, 소화에 좋은 활동',food:'노란 음식(바나나/호박) + 단맛(꿀/엿)'},
  metal:{color:'회색/흰색',place:'깔끔한 공간, 서향',action:'정리/청소, 원칙 세우기',food:'매운맛(생강/파) + 흰색 음식(배/무)'},
  water:{color:'블루/네이비',place:'차분한 물가, 서늘한 환경',action:'호흡/명상, 속도 조절',food:'검은 음식(김/미역/흑미) + 짠맛 적당히'}};
function getGaeunTips(strongE){
  var ctrl=whoControls(strongE);
  var drain=SHENG[strongE];
  return{controller:ctrl,drain:drain,ctips:GAEUN_TIPS[ctrl]||GAEUN_TIPS.metal,dtips:GAEUN_TIPS[drain]||GAEUN_TIPS.fire};
}
var SAJU_MONTH_COMMAND_BY_BRANCH = {
  '寅': { branch:'寅', branchKo:'인', monthName:'인월', startTerm:'입춘', endTerm:'경칩', season:'초봄', dominantElement:'목', seasonPower:'목왕지절' },
  '卯': { branch:'卯', branchKo:'묘', monthName:'묘월', startTerm:'경칩', endTerm:'청명', season:'한봄', dominantElement:'목', seasonPower:'목왕지절' },
  '辰': { branch:'辰', branchKo:'진', monthName:'진월', startTerm:'청명', endTerm:'입하', season:'봄의 끝, 환절기', dominantElement:'토', seasonPower:'습토, 목의 여운과 토의 전환' },
  '巳': { branch:'巳', branchKo:'사', monthName:'사월', startTerm:'입하', endTerm:'망종', season:'초여름', dominantElement:'화', seasonPower:'화왕지절' },
  '午': { branch:'午', branchKo:'오', monthName:'오월', startTerm:'망종', endTerm:'소서', season:'한여름', dominantElement:'화', seasonPower:'화왕지절' },
  '未': { branch:'未', branchKo:'미', monthName:'미월', startTerm:'소서', endTerm:'입추', season:'여름의 끝, 환절기', dominantElement:'토', seasonPower:'조토, 화의 여운과 토의 전환' },
  '申': { branch:'申', branchKo:'신', monthName:'신월', startTerm:'입추', endTerm:'백로', season:'초가을', dominantElement:'금', seasonPower:'금왕지절' },
  '酉': { branch:'酉', branchKo:'유', monthName:'유월', startTerm:'백로', endTerm:'한로', season:'한가을', dominantElement:'금', seasonPower:'금왕지절' },
  '戌': { branch:'戌', branchKo:'술', monthName:'술월', startTerm:'한로', endTerm:'입동', season:'가을의 끝, 환절기', dominantElement:'토', seasonPower:'조토, 금의 여운과 토의 전환' },
  '亥': { branch:'亥', branchKo:'해', monthName:'해월', startTerm:'입동', endTerm:'대설', season:'초겨울', dominantElement:'수', seasonPower:'수왕지절' },
  '子': { branch:'子', branchKo:'자', monthName:'자월', startTerm:'대설', endTerm:'소한', season:'한겨울', dominantElement:'수', seasonPower:'수왕지절' },
  '丑': { branch:'丑', branchKo:'축', monthName:'축월', startTerm:'소한', endTerm:'입춘', season:'겨울의 끝, 환절기', dominantElement:'토', seasonPower:'한습토, 수의 여운과 토의 전환' }
};
var SAJU_MONTH_COMMAND_MEANINGS = {
  '寅': { summary:'겨울의 응축이 풀리고 생명력이 처음 솟아나는 시기. 시작, 성장, 기획, 개척의 힘이 강합니다.', personality:'새로운 방향을 열고 싶어 하며, 배우고 확장하려는 욕구가 강합니다.', career:'기획, 교육, 상담, 창업, 성장 산업, 콘텐츠 확장에 유리합니다.', love:'관계에서도 가능성과 성장성을 중요하게 보며, 정체된 관계에는 답답함을 느끼기 쉽습니다.', caution:'초기 추진력은 강하지만 지속 관리가 약해질 수 있으므로 루틴화가 필요합니다.' },
  '卯': { summary:'목의 기운이 가장 왕성한 시기. 성장, 매력, 관계 확장, 감수성이 강합니다.', personality:'부드러움 속에 강한 생존력과 자기 확장 욕구가 있습니다.', career:'브랜딩, 디자인, 교육, 관계 기반 일, 콘텐츠에 강점이 있습니다.', love:'호감과 매력을 자연스럽게 만들지만, 관계의 경계가 흔들릴 수 있습니다.', caution:'타인의 반응에 민감해질 수 있으므로 자기 중심을 지키는 것이 중요합니다.' },
  '辰': { summary:'목의 여운을 품은 습토. 성장한 것을 현실에 뿌리내리게 하는 전환의 기운입니다.', personality:'생각이 깊고, 여러 가능성을 현실적으로 조율하려는 힘이 있습니다.', career:'기획을 현실화하는 일, 중재, 시스템 구축, 자산화에 유리합니다.', love:'감정만으로 움직이기보다 안정성과 현실성을 함께 봅니다.', caution:'생각이 많아지면 결정을 미루기 쉬우므로 실행 기준이 필요합니다.' },
  '巳': { summary:'화의 기운이 본격적으로 드러나는 시기. 표현, 직관, 열정, 명예욕이 살아납니다.', personality:'내면의 생각을 밖으로 드러내고 싶어 하며, 존재감을 만들고자 합니다.', career:'콘텐츠, 말, 표현, 홍보, 교육, 예술, 기술 구현에 강점이 있습니다.', love:'끌림이 빠르게 생기며, 관계에서도 열정과 반응을 중요하게 여깁니다.', caution:'과열과 조급함을 조절하지 않으면 쉽게 소진될 수 있습니다.' },
  '午': { summary:'화의 기운이 절정에 이른 시기. 노출, 명예, 표현력, 강한 생명력을 상징합니다.', personality:'표현력과 존재감이 강하며, 인정받고 싶은 욕구가 뚜렷합니다.', career:'대중 앞에 드러나는 일, 브랜드, 리더십, 강의, 콘텐츠 사업에 유리합니다.', love:'사랑에서도 뜨거운 반응과 확신을 원하며, 애매함을 견디기 어렵습니다.', caution:'감정과 에너지가 과열되기 쉬우므로 휴식과 냉각 루틴이 필요합니다.' },
  '未': { summary:'화의 열기를 품은 조토. 열정 이후의 정리, 축적, 현실화를 의미합니다.', personality:'겉으로는 부드러워도 내면에는 강한 고집과 축적 욕구가 있습니다.', career:'기술, 자산화, 관리, 상담, 교육, 반복 축적형 일에 적합합니다.', love:'관계에서 안정성과 신뢰를 원하지만, 마음을 쉽게 드러내지 않을 수 있습니다.', caution:'묵은 감정이 쌓이면 무기력이나 고집으로 나타날 수 있습니다.' },
  '申': { summary:'금의 기운이 시작되는 시기. 정리, 판단, 기술, 수익화의 힘이 생깁니다.', personality:'분석적이고 현실 감각이 있으며, 결과와 효율을 중요하게 여깁니다.', career:'기술, 분석, 시스템, 금융, 법, 전략, 수익화 구조에 강점이 있습니다.', love:'감정보다 신뢰와 실질적 태도를 중요하게 봅니다.', caution:'지나친 판단과 비판으로 관계가 차가워지지 않도록 해야 합니다.' },
  '酉': { summary:'금의 기운이 가장 맑고 강한 시기. 완성, 절제, 미감, 결단의 힘이 강합니다.', personality:'정리 능력과 미감, 판단력이 뛰어나며, 기준이 분명합니다.', career:'브랜딩, 미용, 디자인, 금융, 데이터, 정밀 기술, 문서 작업에 유리합니다.', love:'관계에서도 품격과 신뢰, 태도의 정확성을 중요하게 봅니다.', caution:'완벽주의와 차가운 표현이 오해를 만들 수 있습니다.' },
  '戌': { summary:'금의 여운을 품은 조토. 정리된 것을 저장하고 다음 계절을 준비하는 기운입니다.', personality:'책임감과 보존 욕구가 강하며, 자기 세계를 쉽게 열지 않습니다.', career:'관리, 부동산, 문서, 연구, 전략, 안정적 기반 구축에 유리합니다.', love:'관계에서 신뢰를 중시하지만, 속마음을 늦게 여는 편일 수 있습니다.', caution:'방어성이 강해지면 고립되기 쉬우므로 유연한 소통이 필요합니다.' },
  '亥': { summary:'수의 기운이 시작되는 시기. 지혜, 감수성, 연구, 내면 탐색의 힘이 강해집니다.', personality:'직관과 상상력이 깊고, 보이지 않는 흐름을 잘 감지합니다.', career:'연구, 상담, 콘텐츠, 심리, 영성, 데이터 탐색, 기획에 강점이 있습니다.', love:'깊은 정서적 연결을 원하지만, 혼자만의 세계도 중요합니다.', caution:'생각이 깊어질수록 현실 실행이 늦어질 수 있습니다.' },
  '子': { summary:'수의 기운이 절정인 시기. 지혜, 정보, 감정, 잠재력, 생존 본능이 강합니다.', personality:'깊이 생각하고 관찰하며, 보이지 않는 정보를 읽는 힘이 있습니다.', career:'분석, 연구, 기획, 상담, 글쓰기, 데이터, 지식 산업에 적합합니다.', love:'감정이 깊지만 쉽게 드러내지 않으며, 안정된 신뢰를 원합니다.', caution:'불안과 과도한 생각이 쌓이지 않도록 몸을 움직이는 루틴이 필요합니다.' },
  '丑': { summary:'수의 여운을 품은 한습토. 오래 버티고 축적하며 새봄을 준비하는 기운입니다.', personality:'인내심과 현실 감각이 강하고, 겉으로 드러나지 않는 내공이 깊습니다.', career:'축적형 사업, 관리, 연구, 부동산, 장기 프로젝트에 유리합니다.', love:'관계에서도 쉽게 움직이지 않지만, 한 번 정하면 오래 책임지려 합니다.', caution:'변화에 늦게 반응할 수 있으므로 적절한 시점의 결단이 필요합니다.' }
};
var SAJU_DAY_MASTER_ELEMENT = { '甲':'목','乙':'목','丙':'화','丁':'화','戊':'토','己':'토','庚':'금','辛':'금','壬':'수','癸':'수' };
var SAJU_ELEMENT_KO_TO_EN = { '목':'wood','화':'fire','토':'earth','금':'metal','수':'water' };
var SAJU_ELEMENT_GENERATES = { '목':'화','화':'토','토':'금','금':'수','수':'목' };
var SAJU_ELEMENT_CONTROLS = { '목':'토','토':'수','수':'화','화':'금','금':'목' };
function _sajuElementEnToKo(elementEn) {
  if (!elementEn) return '';
  if (elementEn === 'wood') return '목';
  if (elementEn === 'fire') return '화';
  if (elementEn === 'earth') return '토';
  if (elementEn === 'metal') return '금';
  if (elementEn === 'water') return '수';
  return '';
}
function _resolveMonthCommandBirthParts() {
  try {
    var b = window._ziweiBirth || window._astroBirth || null;
    if (b && b.year && b.month && b.day) {
      var hh = (b.hour != null) ? Number(b.hour) : 12;
      var mm = (b.minute != null) ? Number(b.minute) : 0;
      return _kasiPartsOf(Number(b.year), Number(b.month), Number(b.day), isNaN(hh) ? 12 : hh, isNaN(mm) ? 0 : mm, 0);
    }
    var dEl = document.getElementById('birthDate');
    if (dEl && dEl.value) {
      var normalizedDate = _cdNormalizeBirthDateInput(dEl.value);
      var p = normalizedDate ? normalizedDate.split('-').map(function(v){ return parseInt(v, 10); }) : [];
      if (p.length >= 3 && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2])) {
        var hEl = document.getElementById('birthHour');
        var mEl = document.getElementById('birthMinute');
        var h = hEl ? parseInt(String(hEl.value || '12'), 10) : 12;
        var m = mEl ? parseInt(String(mEl.value || '0'), 10) : 0;
        return _kasiPartsOf(p[0], p[1], p[2], isNaN(h) ? 12 : h, isNaN(m) ? 0 : m, 0);
      }
    }
  } catch (_e) {}
  return null;
}
function _getElementRelation(dayElementKo, monthElementKo) {
  if (!dayElementKo || !monthElementKo) return 'unknown';
  if (dayElementKo === monthElementKo) return '비겁';
  if (SAJU_ELEMENT_GENERATES[monthElementKo] === dayElementKo) return '인성';
  if (SAJU_ELEMENT_GENERATES[dayElementKo] === monthElementKo) return '식상';
  if (SAJU_ELEMENT_CONTROLS[dayElementKo] === monthElementKo) return '재성';
  if (SAJU_ELEMENT_CONTROLS[monthElementKo] === dayElementKo) return '관성';
  return 'unknown';
}
function _getRelationNarrative(relation) {
  if (relation === '비겁') return '월령 오행이 일간과 같아 계절 자체가 나를 직접 보강합니다. 자존감, 자기 추진력, 독립 에너지가 강해지는 구조입니다.';
  if (relation === '인성') return '월령 오행이 일간을 생해 주는 인성 환경으로, 보호·학습·회복 기반이 탄탄해지기 쉽습니다.';
  if (relation === '식상') return '일간이 월령 오행을 생하는 식상 환경으로, 표현·창작·산출이 강해지지만 체력 소모 관리가 필요합니다.';
  if (relation === '재성') return '일간이 월령 오행을 극하는 재성 환경으로, 성과·자원·돈 관리 압박이 현실 과제로 작동할 수 있습니다.';
  if (relation === '관성') return '월령 오행이 일간을 극하는 관성 환경으로, 책임·규율·평가 압력이 강하게 체감될 수 있습니다.';
  return '일간 데이터 미확인: 일간 정보가 없어 월령과의 십성 관계(비겁/인성/식상/재성/관성)는 보수적으로 생략합니다.';
}
var SAJU_MONTH_COMMAND_MEANINGS_NEO = {
  '寅': { summary:'겨울의 응축이 풀리고 생명력이 처음 솟아나는 시기야. 시작, 성장, 기획, 개척의 힘이 강해.', personality:'새로운 방향을 열고 싶어 하고, 배우고 확장하려는 욕구가 강해.', career:'기획, 교육, 상담, 창업, 성장 산업, 콘텐츠 확장에 유리해.', love:'관계에서도 가능성과 성장성을 중요하게 보고, 정체된 관계에는 답답함을 느끼기 쉬워.', caution:'초기 추진력은 강하지만 지속 관리가 약해질 수 있으니까 루틴으로 만들어 두는 게 좋아.' },
  '卯': { summary:'목의 기운이 가장 왕성한 시기야. 성장, 매력, 관계 확장, 감수성이 강하게 살아나.', personality:'부드러움 속에 강한 생존력과 자기 확장 욕구가 있어.', career:'브랜딩, 디자인, 교육, 관계 기반 일, 콘텐츠에 강점이 있어.', love:'호감과 매력을 자연스럽게 만들지만, 관계의 경계가 흔들릴 수도 있어.', caution:'다른 사람 반응에 민감해질 수 있으니까 네 중심을 지키는 게 중요해.' },
  '辰': { summary:'목의 여운을 품은 습토야. 성장한 것을 현실에 뿌리내리게 하는 전환의 기운이야.', personality:'생각이 깊고, 여러 가능성을 현실적으로 조율하려는 힘이 있어.', career:'기획을 현실화하는 일, 중재, 시스템 구축, 자산화에 유리해.', love:'감정만으로 움직이기보다 안정성과 현실성을 함께 봐.', caution:'생각이 많아지면 결정을 미루기 쉬우니까 실행 기준을 정해 두는 게 좋아.' },
  '巳': { summary:'화의 기운이 본격적으로 드러나는 시기야. 표현, 직관, 열정, 명예욕이 살아나.', personality:'내면의 생각을 밖으로 드러내고 싶어 하고, 존재감을 만들고 싶어 해.', career:'콘텐츠, 말, 표현, 홍보, 교육, 예술, 기술 구현에 강점이 있어.', love:'끌림이 빠르게 생기고, 관계에서도 열정과 반응을 중요하게 여겨.', caution:'과열과 조급함을 조절하지 않으면 쉽게 소진될 수 있어.' },
  '午': { summary:'화의 기운이 절정에 이른 시기야. 노출, 명예, 표현력, 강한 생명력을 상징해.', personality:'표현력과 존재감이 강하고, 인정받고 싶은 욕구가 뚜렷해.', career:'대중 앞에 드러나는 일, 브랜드, 리더십, 강의, 콘텐츠 사업에 유리해.', love:'사랑에서도 뜨거운 반응과 확신을 원하고, 애매함을 견디기 어려워.', caution:'감정과 에너지가 과열되기 쉬우니까 휴식과 냉각 루틴을 챙겨 둬.' },
  '未': { summary:'화의 열기를 품은 조토야. 열정 이후의 정리, 축적, 현실화를 뜻해.', personality:'겉으로는 부드러워도 내면에는 강한 고집과 축적 욕구가 있어.', career:'기술, 자산화, 관리, 상담, 교육, 반복 축적형 일에 잘 맞아.', love:'관계에서 안정성과 신뢰를 원하지만, 마음을 쉽게 드러내지 않을 수도 있어.', caution:'묵은 감정이 쌓이면 무기력이나 고집으로 나타날 수 있어.' },
  '申': { summary:'금의 기운이 시작되는 시기야. 정리, 판단, 기술, 수익화의 힘이 생겨.', personality:'분석적이고 현실 감각이 있고, 결과와 효율을 중요하게 여겨.', career:'기술, 분석, 시스템, 금융, 법, 전략, 수익화 구조에 강점이 있어.', love:'감정보다 신뢰와 실질적 태도를 중요하게 봐.', caution:'지나친 판단과 비판으로 관계가 차가워지지 않게 신경 써 봐.' },
  '酉': { summary:'금의 기운이 가장 맑고 강한 시기야. 완성, 절제, 미감, 결단의 힘이 강해.', personality:'정리 능력과 미감, 판단력이 뛰어나고, 기준이 분명해.', career:'브랜딩, 미용, 디자인, 금융, 데이터, 정밀 기술, 문서 작업에 유리해.', love:'관계에서도 품격과 신뢰, 태도의 정확성을 중요하게 봐.', caution:'완벽주의와 차가운 표현이 오해를 만들 수 있어.' },
  '戌': { summary:'금의 여운을 품은 조토야. 정리된 것을 저장하고 다음 계절을 준비하는 기운이야.', personality:'책임감과 보존 욕구가 강하고, 자기 세계를 쉽게 열지 않아.', career:'관리, 부동산, 문서, 연구, 전략, 안정적 기반 구축에 유리해.', love:'관계에서 신뢰를 중시하지만, 속마음을 늦게 여는 편일 수 있어.', caution:'방어성이 강해지면 고립되기 쉬우니까 유연하게 소통해 봐.' },
  '亥': { summary:'수의 기운이 시작되는 시기야. 지혜, 감수성, 연구, 내면 탐색의 힘이 강해져.', personality:'직관과 상상력이 깊고, 보이지 않는 흐름을 잘 감지해.', career:'연구, 상담, 콘텐츠, 심리, 영성, 데이터 탐색, 기획에 강점이 있어.', love:'깊은 정서적 연결을 원하지만, 혼자만의 세계도 중요해.', caution:'생각이 깊어질수록 현실 실행이 늦어질 수 있어.' },
  '子': { summary:'수의 기운이 절정인 시기야. 지혜, 정보, 감정, 잠재력, 생존 본능이 강해.', personality:'깊이 생각하고 관찰하면서, 보이지 않는 정보를 읽는 힘이 있어.', career:'분석, 연구, 기획, 상담, 글쓰기, 데이터, 지식 산업에 잘 맞아.', love:'감정이 깊지만 쉽게 드러내지 않고, 안정된 신뢰를 원해.', caution:'불안과 과도한 생각이 쌓이지 않게 몸을 움직이는 루틴을 챙겨 둬.' },
  '丑': { summary:'수의 여운을 품은 한습토야. 오래 버티고 축적하며 새봄을 준비하는 기운이야.', personality:'인내심과 현실 감각이 강하고, 겉으로 드러나지 않는 내공이 깊어.', career:'축적형 사업, 관리, 연구, 부동산, 장기 프로젝트에 유리해.', love:'관계에서도 쉽게 움직이지 않지만, 한 번 정하면 오래 책임지려 해.', caution:'변화에 늦게 반응할 수 있으니까 적절한 시점에 결단하는 게 좋아.' }
};
function _getRelationNarrativeNeo(relation) {
  if (relation === '비겁') return '월령 오행이 일간과 같아서 계절 자체가 너를 직접 보강해 줘. 자존감, 자기 추진력, 독립 에너지가 강해지는 구조야.';
  if (relation === '인성') return '월령 오행이 일간을 생해 주는 인성 환경이라, 보호·학습·회복 기반이 탄탄해지기 쉬워.';
  if (relation === '식상') return '일간이 월령 오행을 생하는 식상 환경이라, 표현·창작·산출이 강해지지만 체력 소모는 따로 관리해 줘야 해.';
  if (relation === '재성') return '일간이 월령 오행을 극하는 재성 환경이라, 성과·자원·돈 관리 압박이 현실 과제로 작동할 수 있어.';
  if (relation === '관성') return '월령 오행이 일간을 극하는 관성 환경이라, 책임·규율·평가 압력이 강하게 느껴질 수 있어.';
  return '일간 데이터 미확인: 일간 정보가 없어서 월령과의 십성 관계(비겁/인성/식상/재성/관성)는 보수적으로 생략할게.';
}
var SAJU_MONTH_COMMAND_KB_FALLBACK_NEO = {
  summary: '이 월령의 기본 해석 데이터는 아직 보강 중이야.',
  personality: '계절의 흐름을 타는 기질이 핵심으로 작동해.',
  career: '계절 에너지에 맞는 실행 전략이 중요해.',
  love: '관계에서는 정서 리듬과 타이밍 조율이 핵심이야.',
  caution: '계절 과잉/결핍 반응을 살펴보면서 루틴을 조정해 봐.'
};
function _getRelationStrengthHint(relation, pw) {
  var strongKnown = !!(pw && typeof pw.isStrong === 'boolean');
  var isStrong = strongKnown ? !!pw.isStrong : null;
  if (relation === '비겁') return isStrong === false ? 'strong' : 'veryStrong';
  if (relation === '인성') return isStrong === false ? 'strong' : 'veryStrong';
  if (relation === '식상') return isStrong === true ? 'neutral' : 'weak';
  if (relation === '재성') return isStrong === true ? 'neutral' : 'weak';
  if (relation === '관성') return isStrong === true ? 'weak' : 'veryWeak';
  return 'unknown';
}
function _buildMonthCommandFromEngine(p, natal, pw, neo) {
  var monthBranchByPillar = (p && p.m && p.m.j) ? String(p.m.j) : '';
  var birthParts = _resolveMonthCommandBirthParts();
  var monthBranchBySolarTerm = _calculateMonthBranchBySolarTermFromParts(birthParts);
  var selectedBranch = monthBranchBySolarTerm || monthBranchByPillar;
  var fallbackUsed = false;
  var fallbackNotice = '';

  if (monthBranchByPillar && monthBranchBySolarTerm && monthBranchByPillar !== monthBranchBySolarTerm) {
    fallbackUsed = true;
    fallbackNotice = '정확한 절기 시각 데이터가 확인되지 않아, 계산된 월주 지지를 기준으로 월령을 보완 해석합니다.';
    selectedBranch = monthBranchByPillar;
  } else if (!monthBranchBySolarTerm && monthBranchByPillar) {
    fallbackUsed = true;
    fallbackNotice = '정확한 절기 시각 데이터가 확인되지 않아, 계산된 월주 지지를 기준으로 월령을 보완 해석합니다.';
    selectedBranch = monthBranchByPillar;
  }

  if (!selectedBranch) {
    if (neo) {
      var noDataNeo = '월령 계산에 필요한 월주나 절기 데이터가 확인되지 않아서, 지금은 기본 사주 분석 결과를 중심으로 계절적 기운을 보완해서 읽을게.';
      return {
        monthCommand: null,
        reading: {
          title: _sajuEngineText("se_22303_prop_title"),
          summary: noDataNeo,
          seasonalEnergy: noDataNeo,
          relationToDayMaster: '일간 데이터 미확인',
          strengthAnalysis: '월령 데이터가 확인되지 않아서 신강/신약 보조 판정은 제한돼.',
          elementBalanceImpact: '오행 균형 영향은 기존 오행 분포 분석을 먼저 참고해 줘.',
          careerImpact: '기존 직업·진로 해석을 먼저 적용할게.',
          wealthImpact: '기존 재물운 해석을 먼저 적용할게.',
          loveImpact: '기존 연애·관계 해석을 먼저 적용할게.',
          advice: '월령 데이터가 보강되면 계절에 맞춘 방향을 더 정밀하게 짚어 줄 수 있어.',
          caution: noDataNeo
        },
        fallbackUsed: true,
        fallbackNotice: noDataNeo
      };
    }
    var noDataMsg = '월령 계산에 필요한 월주 또는 절기 데이터가 확인되지 않아, 현재는 기본 사주 분석 결과를 중심으로 계절적 기운을 보완 해석합니다.';
    return {
      monthCommand: null,
      reading: {
        title: _sajuEngineText("se_22303_prop_title"),
        summary: noDataMsg,
        seasonalEnergy: noDataMsg,
        relationToDayMaster: '일간 데이터 미확인',
        strengthAnalysis: '월령 데이터 미확인으로 신강/신약 보조 판정은 제한됩니다.',
        elementBalanceImpact: '오행 균형 영향은 기존 오행 분포 분석을 우선 참고해 주세요.',
        careerImpact: '기존 직업·진로 해석을 우선 적용합니다.',
        wealthImpact: '기존 재물운 해석을 우선 적용합니다.',
        loveImpact: '기존 연애·관계 해석을 우선 적용합니다.',
        advice: '월령 데이터가 보강되면 계절 기반 전략을 더 정밀하게 제시할 수 있습니다.',
        caution: noDataMsg
      },
      fallbackUsed: true,
      fallbackNotice: noDataMsg
    };
  }

  var base = SAJU_MONTH_COMMAND_BY_BRANCH[selectedBranch] || {
    branch: selectedBranch,
    branchKo: selectedBranch,
    monthName: selectedBranch + '월',
    startTerm: '절기 시작',
    endTerm: '다음 절기',
    season: '계절 전환기',
    dominantElement: '토',
    seasonPower: '계절 전환'
  };
  var kb = SAJU_MONTH_COMMAND_MEANINGS[selectedBranch] || {
    summary: '해당 월령의 기본 해석 데이터가 아직 보강 중입니다.',
    personality: '계절의 흐름을 타는 기질이 핵심으로 작동합니다.',
    career: '계절 에너지에 맞는 실행 전략이 중요합니다.',
    love: '관계에서는 정서 리듬과 타이밍 조율이 핵심입니다.',
    caution: '계절 과잉/결핍 반응을 관찰하며 루틴을 조정하세요.'
  };

  var dayStem = (p && p.d && p.d.g) ? String(p.d.g) : '';
  var dayElementKo = SAJU_DAY_MASTER_ELEMENT[dayStem] || _sajuElementEnToKo(p && p.d && p.d.gE);
  var relation = _getElementRelation(dayElementKo, base.dominantElement);
  var relationText = dayStem
    ? ('일간 ' + dayStem + '(' + (dayElementKo || '미상') + ') 기준 관계는 ' + relation + '입니다. ' + _getRelationNarrative(relation))
    : '일간 데이터 미확인: 일간 정보가 없어 월령과의 십성 관계(비겁/인성/식상/재성/관성)는 보수적으로 생략합니다.';
  var hint = dayStem ? _getRelationStrengthHint(relation, pw) : 'unknown';

  var monthElementKey = SAJU_ELEMENT_KO_TO_EN[base.dominantElement] || '';
  var monthElementRatio = (natal && natal.ratios && monthElementKey) ? Number(natal.ratios[monthElementKey] || 0) : 0;
  var elementBalanceImpact = '';
  if (monthElementRatio >= 30) {
    elementBalanceImpact = '월령의 주도 오행(' + base.dominantElement + ')이 원국에서도 높은 비율(' + monthElementRatio.toFixed(0) + '%)을 차지해, 해당 오행 과열 가능성까지 함께 관리해야 합니다.';
  } else if (monthElementRatio <= 14) {
    elementBalanceImpact = '월령의 주도 오행(' + base.dominantElement + ')이 원국 비율(' + monthElementRatio.toFixed(0) + '%) 대비 상대적으로 약해, 계절 환경의 도움을 실전 루틴으로 연결하는 것이 중요합니다.';
  } else {
    elementBalanceImpact = '월령 오행(' + base.dominantElement + ')과 원국 비율(' + monthElementRatio.toFixed(0) + '%)이 비교적 균형적입니다. 과도한 보정보다 지속 가능한 운영이 유리합니다.';
  }

  var powerLabel = (pw && typeof pw.isStrong === 'boolean') ? (pw.isStrong ? '신강' : '신약') : '미확인';
  var strengthAnalysis = '현재 억부 판정은 ' + powerLabel + '입니다. 월령 관계(' + (dayStem ? relation : '미확인') + ')를 함께 보면 ';
  if (hint === 'veryStrong' || hint === 'strong') {
    strengthAnalysis += '계절이 일간 체력을 보조하는 축이 강해, 신강/신약 판단에서 "환경 지원" 근거가 분명합니다.';
  } else if (hint === 'weak' || hint === 'veryWeak') {
    strengthAnalysis += '계절이 일간을 소모/압박할 수 있어, 신강/신약 판단에서 "환경 부담" 근거가 강화됩니다.';
  } else {
    strengthAnalysis += '일간 데이터가 제한되어 신강/신약 보조 판정은 보수적으로 유지합니다.';
  }

  var seasonalEnergy = '당신의 월령은 ' + base.monthName + '입니다. ' + base.startTerm + ' 이후 ' + base.endTerm + ' 전까지의 기운으로, ' + kb.summary;
  var summary = base.monthName + ' 태생 · ' + base.season + ' 흐름 · ' + base.dominantElement + ' 중심 기운';
  var careerImpact = kb.career + ' 현재 흐름(' + (dayStem ? relation : '미확인') + ')에 맞춰 속도를 조절하면 성과 편차를 줄일 수 있습니다.';
  var wealthImpact = (relation === '재성' || relation === '관성')
    ? '재물·성과 압박이 커질 수 있으니 고정비와 현금흐름을 먼저 관리하는 편이 안전합니다. '
    : '월령의 계절 지원을 활용해 수익 구조를 무리 없이 확장하는 방식이 유리합니다. ';
  wealthImpact += '특히 ' + base.dominantElement + ' 오행이 강해지는 시기에는 투자보다 회수 규칙을 먼저 세우세요.';
  var loveImpact = kb.love + ' 관계에서는 대화 주기와 감정 속도를 맞추는 것이 핵심입니다.';
  var advice = kb.personality + ' 월령의 왕기(' + base.dominantElement + ')를 일상 루틴(수면·운동·업무 리듬)에 연결하면 체감 운이 안정됩니다.';
  var caution = kb.caution + (fallbackNotice ? (' ' + fallbackNotice) : '');
  var interpretation = seasonalEnergy + ' ' + kb.personality;
  if (neo) {
    if (fallbackNotice) fallbackNotice = '정확한 절기 시각 데이터가 확인되지 않아서, 계산된 월주 지지를 기준으로 월령을 보완해서 읽었어.';
    kb = SAJU_MONTH_COMMAND_MEANINGS_NEO[selectedBranch] || SAJU_MONTH_COMMAND_KB_FALLBACK_NEO;
    relationText = dayStem
      ? ('일간 ' + dayStem + '(' + (dayElementKo || '미상') + ') 기준으로 월령과의 관계는 ' + relation + ' 쪽이야. ' + _getRelationNarrativeNeo(relation))
      : '일간 데이터 미확인: 일간 정보가 없어서 월령과의 십성 관계(비겁/인성/식상/재성/관성)는 보수적으로 생략할게.';
    if (monthElementRatio >= 30) {
      elementBalanceImpact = '월령의 주도 오행(' + base.dominantElement + ')이 원국에서도 높은 비율(' + monthElementRatio.toFixed(0) + '%)을 차지하고 있어. 이 오행이 과열될 가능성까지 같이 관리해 줘.';
    } else if (monthElementRatio <= 14) {
      elementBalanceImpact = '월령의 주도 오행(' + base.dominantElement + ')이 원국 비율(' + monthElementRatio.toFixed(0) + '%)로 보면 상대적으로 약해. 계절 환경의 도움을 실제 루틴으로 연결하는 게 중요해.';
    } else {
      elementBalanceImpact = '월령 오행(' + base.dominantElement + ')과 원국 비율(' + monthElementRatio.toFixed(0) + '%)이 비교적 균형적이야. 과하게 보정하기보다 오래 이어 갈 수 있는 운영이 유리해.';
    }
    strengthAnalysis = '지금 억부 판정은 ' + powerLabel + ' 쪽이야. 월령 관계(' + (dayStem ? relation : '미확인') + ')를 같이 보면 ';
    if (hint === 'veryStrong' || hint === 'strong') {
      strengthAnalysis += '계절이 일간 체력을 받쳐 주는 축이 강해서, 신강/신약 판단에서 "환경 지원" 근거가 분명해.';
    } else if (hint === 'weak' || hint === 'veryWeak') {
      strengthAnalysis += '계절이 일간을 소모시키거나 압박할 수 있어서, 신강/신약 판단에서 "환경 부담" 근거가 더 강해져.';
    } else {
      strengthAnalysis += '일간 데이터가 제한돼 있어서 신강/신약 보조 판정은 보수적으로 둘게.';
    }
    seasonalEnergy = '네 월령은 ' + base.monthName + ' — ' + base.startTerm + ' 이후 ' + base.endTerm + ' 전까지의 기운으로, ' + kb.summary;
    careerImpact = kb.career + ' 지금 흐름(' + (dayStem ? relation : '미확인') + ')에 맞춰 속도를 조절하면 성과가 들쭉날쭉한 폭을 줄일 수 있어.';
    wealthImpact = (relation === '재성' || relation === '관성')
      ? '재물·성과 압박이 커질 수 있으니까 고정비와 현금 흐름부터 관리하는 편이 안전해. '
      : '월령의 계절 지원을 살려서 수익 구조를 무리 없이 넓히는 방식이 유리해. ';
    wealthImpact += '특히 ' + base.dominantElement + ' 오행이 강해지는 시기에는 투자보다 회수 규칙부터 세워 둬.';
    loveImpact = kb.love + ' 관계에서는 대화 주기와 감정 속도를 맞추는 게 핵심이야.';
    advice = kb.personality + ' 월령의 왕기(' + base.dominantElement + ')를 일상 루틴(수면·운동·업무 리듬)에 연결하면 체감 운이 안정될 수 있어.';
    caution = kb.caution + (fallbackNotice ? (' ' + fallbackNotice) : '');
    interpretation = seasonalEnergy + ' ' + kb.personality;
  }

  return {
    monthCommand: {
      branch: base.branch,
      branchKo: base.branchKo,
      monthName: base.monthName,
      startTerm: base.startTerm,
      endTerm: base.endTerm,
      season: base.season,
      dominantElement: base.dominantElement,
      seasonPower: base.seasonPower,
      dayMasterRelation: dayStem ? relation : undefined,
      dayMasterStrengthHint: hint,
      interpretation: interpretation,
      caution: caution,
      fallbackUsed: !!fallbackUsed,
      dayMasterRelationText: relationText,
      advice: advice
    },
    reading: {
      title: _sajuEngineText("se_22398_prop_title"),
      summary: summary,
      seasonalEnergy: seasonalEnergy,
      relationToDayMaster: relationText,
      strengthAnalysis: strengthAnalysis,
      elementBalanceImpact: elementBalanceImpact,
      careerImpact: careerImpact,
      wealthImpact: wealthImpact,
      loveImpact: loveImpact,
      advice: advice,
      caution: caution
    },
    fallbackUsed: !!fallbackUsed,
    fallbackNotice: fallbackNotice
  };
}
function renderSummary(p,johu,natal){
  var dg=p.d.g,dayMaster=p.d.gE||'earth';
  var health=HEALTH_DATA[dayMaster]||HEALTH_DATA.earth;
  var domE=natal.dominant;
  var tips=getGaeunTips(domE);

  var cnt={};
  [p.y.g,p.y.j,p.m.g,p.m.j,p.d.j,p.h.g,p.h.j].forEach(function(c){
    var t=getTenGod(dg,c);if(t&&t!=='?')cnt[t]=(cnt[t]||0)+1;
  });
  var dominant=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];})[0]||'식신';
  var deep=TS_DEEP[dominant]||TS_DEEP['식신'];
  var tsInfo=TS_DB[dominant]||TS_DB['식신'];
  var dayNames={wood:'성장하는 나무',fire:'타오르는 불꽃',earth:'포용하는 대지',metal:'단단한 바위',water:'흐르는 강물'};
  var ratStr=Object.keys(natal.ratios).map(function(e){return EL_K[e]+' '+natal.ratios[e].toFixed(0)+'%';}).join(' · ');
  var pw=G_POWER,jg=G_JONG;
  /* body.neo-mode는 지연 로드되는 share.js가 붙이므로, 부트 시 동기 적용되는 html.neo-mode도 함께 본다 */
  var _isNeoSaju=(typeof NEO_MODE!=='undefined'&&NEO_MODE)
    ||(document.documentElement&&document.documentElement.classList.contains('neo-mode'))
    ||document.body.classList.contains('neo-mode');
  if(_isNeoSaju){
    deep=TS_DEEP_NEO[dominant]||TS_DEEP_NEO['식신'];
    health=Object.assign({},health,{advice:HEALTH_ADVICE_NEO[dayMaster]||HEALTH_ADVICE_NEO.earth});
    johu=_sajuNeoJohu(johu);
  }
  var monthCommandBundle=_buildMonthCommandFromEngine(p,natal,pw,_isNeoSaju);
  var monthCommand=monthCommandBundle&&monthCommandBundle.monthCommand?monthCommandBundle.monthCommand:null;
  var monthReading=monthCommandBundle&&monthCommandBundle.reading?monthCommandBundle.reading:null;

  /* ─── 섹션 빌더 헬퍼 ─── */
  var _bxCtr=0;
  function depthParagraph(label,text){
    return '<div class="saju-reading-depth"><b class="saju-reading-depth__label">'+label+'</b><p>'+text+'</p></div>';
  }
  function depthList(items){
    return '<ul class="saju-reading-actions">'+items.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul>';
  }
  function summaryDepth(key){
    var monthName=monthCommand&&monthCommand.monthName?monthCommand.monthName:'태어난 달';
    var monthSeason=monthCommand&&monthCommand.season?monthCommand.season:'계절의 흐름';
    var monthElement=monthCommand&&monthCommand.dominantElement?(EL_KO[monthCommand.dominantElement]||EL_KO[SAJU_ELEMENT_KO_TO_EN[monthCommand.dominantElement]]||'계절 오행'):'계절 오행';
    var monthRelation=monthReading&&monthReading.relationToDayMaster?monthReading.relationToDayMaster:'월령과 일간의 관계';
    var seasonAdvice=monthReading&&monthReading.advice?monthReading.advice:'계절의 힘을 생활 리듬에 맞춰 조절해 보세요.';
    var seasonCaution=monthReading&&monthReading.caution?monthReading.caution:'한 가지 기운을 과하게 밀어붙이기보다 회복과 조절의 여지를 남겨두세요.';
    var yong=(pw&&pw.yongshin||[]).map(function(e){return EL_KO[e];}).join('·')||'필요한 오행';
    var kij=(pw&&pw.kijishin||[]).map(function(e){return EL_KO[e];}).join('·')||'과해지기 쉬운 오행';
    /* 심화 단락 공용 파생값 — 전부 폴백을 둬서 undefined 노출을 원천 차단한다.
       (renderSummary 는 runtime-stability 의 wrapCriticalFn 으로 감싸여 있어 참조 예외 1건이
        결과 화면 전체를 폴백으로 날린다.) */
    var powerTxt=(pw&&typeof pw.score==='number')?(Math.round(pw.score)+'점'):'측정값';
    var strongTxt=(pw&&pw.isStrong)?'신강(身强)':'신약(身弱)';
    var tsRank=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];});
    var tsSecond=tsRank[1]||'두 번째 십성';
    var tsList=tsRank.slice(0,3).map(function(t){return t+'('+cnt[t]+')';}).join(' · ')||'십성 분포';
    var elOrder=Object.keys(natal.ratios||{}).sort(function(a,b){return natal.ratios[b]-natal.ratios[a];});
    var elTop=EL_KO[elOrder[0]]||EL_KO[domE]||'중심 오행';
    var elLow=EL_KO[elOrder[elOrder.length-1]]||'비어 있는 오행';
    var johuType=(johu&&johu.type)==='insufficient'?'판단 보류(출생 정보 부족)':(johu&&johu.type)||'균형';
    var johuScoreTxt=(johu&&typeof johu.score==='number')?(Math.round(johu.score)+'점'):'현재 값';
    var johuMoistType=(johu&&johu.moistType)==='insufficient'?'판단 보류(출생 정보 부족)':(johu&&johu.moistType)||'중간';
    // 판단 보류면 '…쪽으로 기울어 있다면' 같은 방향 문장과 부분 데이터 점수를 쓰지 않는다.
    var johuPending=(johu&&johu.type)==='insufficient', johuMoistPending=(johu&&johu.moistType)==='insufficient';
    var johuImprove=(johu&&johu.improve)||'생활 리듬을 계절에 맞춰 조금씩 조정해 보세요.';
    var johuMoistAdvice=(johu&&johu.moistAdvice)||'건조함과 눅눅함 사이에서 몸이 편한 지점을 찾아 보세요.';
    var johuSeasonTxt=(johu&&johu.season)||monthSeason;
    var ctips=(tips&&tips.ctips)||{};
    var dtips=(tips&&tips.dtips)||{};
    var ctrlEl=(tips&&EL_KO[tips.controller])||'조절 오행';
    var drainEl=(tips&&EL_KO[tips.drain])||'분산 오행';
    var dayElKo=EL_KO[dayMaster]||'일간 오행';
    var mrSeasonal=(monthReading&&monthReading.seasonalEnergy)||'태어난 달의 기운이 사주 전체의 출발 조건을 만듭니다.';
    var mrBalance=(monthReading&&monthReading.elementBalanceImpact)||'월령은 오행 균형의 기준점을 정합니다.';
    var mrStrength=(monthReading&&monthReading.strengthAnalysis)||'지금의 강약 흐름을 함께 보세요.';
    var mrSummary=(monthReading&&monthReading.summary)||'월령 해석은 계절의 힘을 기준으로 읽습니다.';
    var mcInterp=(monthCommand&&monthCommand.interpretation)||'월령이 일간에 주는 힘을 기준으로 읽습니다.';
    var mcCaution=(monthCommand&&monthCommand.caution)||seasonCaution;
    var mcRelText=(monthCommand&&monthCommand.dayMasterRelationText)||monthRelation;
    if(_isNeoSaju){
      var commonNeo=depthParagraph('이 해석을 읽는 법',
        '이 장의 결론은 한 문장으로 운명을 못 박는 판정이 아니야. 일간·계절·오행 분포가 함께 만들어 내는 반복 패턴을 읽은 거거든. 같은 기질도 환경이랑 선택에 따라 강점으로 쓰일 수 있고, 과해지면 피로나 갈등의 모습으로 나타날 수도 있어. 그러니까 네 실제 경험이랑 맞춰 보면서 받아들여 봐.');
      var actionNeo=depthList([
        '오늘 내린 선택에서 이 장의 키워드가 드러난 장면 하나 적어 두기',
        '강점은 한 번 더 반복하고, 과해지는 신호엔 한 박자 늦추는 나만의 규칙 만들기',
        '가까운 사람한테 내 패턴을 설명하고 현실적인 피드백 하나 받아 보기',
        '이 장에서 내 경험이랑 어긋나는 문장 하나 골라 왜 다른지 적어 두기',
        '2주 뒤 같은 장을 다시 읽고 달라진 점과 그대로인 점 나눠 보기'
      ]);
      if(key==='chongpyeong'){
        return depthParagraph('기질이 움직이는 방식',
          '일간 '+dg+'의 성향은 혼자 떨어져서 움직이기보다, 태어난 계절이랑 주변 오행의 도움을 받으면서 방향이 정해져. 그래서 '+(ganKeyword[dg]||'고유한 기질')+'은 네가 이미 가진 자원이고, '+(ganWeakPoint[dg]||'균형 조율')+'은 능력이 모자라서 생기는 게 아니라 힘이 한쪽으로 몰릴 때 생기는 그림자로 보는 게 맞아. '+monthName+'의 '+monthSeason+' 흐름과 '+monthElement+' 기운이 이 기질의 속도랑 표현 방식을 조절해 주거든.')+
          depthParagraph('생활에서 확인할 신호',
            '일이 잘 풀릴 때는 '+(ganTalent[dg]||'네 재능')+'이 자연스럽게 반복되고, 지칠 때는 '+(ganWeakPoint[dg]||'과한 기질')+'이 먼저 튀어나올 수 있어. 연애에서도 '+(ganRel[dg]||'진심 있는 관계')+'를 원하지만 네 표현 속도와 상대 속도가 다를 수 있거든. 마음을 증명하려고 애쓰기보다 서로 회복하는 시간을 합의해 두는 쪽이 더 오래 가.')+
          depthParagraph('구조가 말해 주는 근거',
            '여덟 글자를 일간 '+dg+' 기준으로 다시 세 보면 십성은 '+tsList+' 순으로 힘이 실려. 가장 두꺼운 '+dominant+'이 평소 판단 습관을 만들고, '+tsSecond+'은 주력이 막혔을 때 꺼내 쓰는 두 번째 태도로 움직여. 오행으로 보면 '+elTop+'가 앞에 서고 '+elLow+'가 뒤에 남는데, 이 간격이 바로 "쉽게 잘하는 일"과 "자꾸 미루는 일" 사이의 거리야.')+
          depthParagraph('시기에 따라 달라지는 체감',
            '한 해를 크게 보면 '+johuSeasonTxt+'의 기운이 살아날 때 이 기질이 제일 자연스럽게 흘러가. 반대로 기록·마무리·거절처럼 '+elLow+'의 역할이 필요한 구간에서는 같은 능력도 유난히 무겁게 느껴질 수 있어. 그 시기를 재능 부족으로 읽지 말고 배치의 문제로 읽어 봐. 그러면 회복이 훨씬 빨라.')+
          depthParagraph('흔한 오해 바로잡기',
            '총평을 "난 원래 이런 사람"이라는 고정 라벨로 받아들이면 오히려 선택지가 좁아져. 명리에서 말하는 기질은 출발 지점이지 도착 지점이 아니거든. 같은 '+dg+' 일간이라도 어떤 계절·어떤 사람·어떤 역할을 만나느냐에 따라 드러나는 얼굴이 달라져. 이 리포트는 가능성의 지도지, 판결문이 아니야.')+
          depthParagraph('스스로 확인할 질문',
            '최근 한 달 동안 제일 몰입했던 장면이랑 제일 소모적이었던 장면을 하나씩 떠올려 봐. 두 장면에서 '+(ganKeyword[dg]||'핵심 기질')+'이 어떻게 다르게 쓰였는지 비교해 보면, 바꿔야 할 건 성격 자체가 아니라 그 기질이 놓이는 환경이라는 게 보일 거야.')+actionNeo;
      }
      if(key==='johu'){
        return depthParagraph('온도와 습도의 실제 의미',
          '조후는 좋고 나쁨을 가르는 낙인이 아니야. 몸과 감정이 어떤 환경에서 편하게 움직이는지 살피는 기준이거든. '+(johuPending?'':'지금 판정이 '+johuType+' 쪽으로 기울어 있다면 일·관계·수면 리듬도 같은 방향으로 영향을 받을 수 있어. ')+((johu&&johu.advice)||seasonAdvice))+
          depthParagraph('계절에 맞춘 조정',
            seasonCaution+' '+monthRelation+'을 같이 보면서 너무 뜨겁거나 차가운 선택은 줄이고, 네가 회복되는 장소·사람·시간대를 구체적으로 확보해 봐.')+
          depthParagraph('두 개의 축을 나눠 보기',
            (johuPending?'':'조후 점수는 '+johuScoreTxt+'이고, ')+(johuMoistPending?'습·조의 축은 출생 정보가 부족해서 판단을 보류해 둘게. ':'습·조의 축에서는 '+johuMoistType+' 쪽으로 읽혀. ')+'온도 축(춥다·덥다)과 습도 축(마르다·눅눅하다)은 서로 다른 문제라서 해법도 달라. 온도는 활동량이랑 사람과의 접촉으로, 습도는 수면·수분·공간 환기로 조정하는 쪽이 체감이 빨라.')+
          depthParagraph('실제 생활로 옮기기',
            johuImprove+' '+johuMoistAdvice+' 한 번에 다 바꾸려고 하면 몸이 먼저 지쳐. 아침·낮·저녁 중에 컨디션이 제일 많이 무너지는 시간대 하나만 골라서 그 구간에만 조정을 넣어 봐. 2주 뒤에 다음 구간으로 넘어가면 돼.')+
          depthParagraph('흔한 오해 바로잡기',
            '조후가 치우쳤다고 사주가 나쁜 게 아니야. 조후는 "지금 나한테 뭐가 모자라지?"를 알려 주는 계기판이고, 나이·직업·사는 지역의 기후에 따라 체감이 크게 달라져. 같은 사주라도 근무 환경이 바뀌면 조후 고민 자체가 사라지기도 해.')+
          depthParagraph('스스로 확인할 질문',
            '몸이 제일 편했던 계절과 장소를 떠올려 봐. 그때의 온도·습도·빛의 양을 지금 생활에 얼마나 재현할 수 있는지 적어 보면, 조후 조정은 어려운 이론이 아니라 방 하나·습관 하나의 문제로 내려와.')+actionNeo;
      }
      if(key==='eokbu'){
        return depthParagraph('강약을 활용하는 법',
          '지금 구조는 '+(pw&&pw.isStrong?'일간의 힘이 비교적 강한 편':'일간의 힘이 외부 도움과 조율을 필요로 하는 편')+'으로 읽혀. '+(jg&&jg.isJong?'종격 가능성도 같이 검토되는 구조라서, 한 방향의 힘을 덮어놓고 누르기보다 실제 삶에서 오래 갈 수 있는지 확인하는 과정이 중요해.':'일반적인 억부 흐름에서는 강한 쪽을 설기하거나 부족한 쪽을 보완하는 균형 감각이 핵심이야.')+' 용신 후보는 '+yong+', 조심해서 다룰 기운은 '+kij+_sajuJo(kij,'으로','로')+' 정리돼.')+
          depthParagraph('선택의 기준',
            '좋은 선택은 용신이라는 이름을 무작정 따르는 게 아니야. 그 기운을 썼을 때 집중력·회복력·관계의 안정이 실제로 좋아지는지 확인하는 선택이지. 반대로 기신으로 읽힌 기운도 필요한 역할이 있으니까, 없애려 하기보다 양과 속도를 조절하는 식으로 다가가 봐.')+
          depthParagraph('수치가 뜻하는 것',
            '강약 판정의 근거가 되는 점수는 '+powerTxt+'이고 '+strongTxt+' 쪽에 놓여. 이 수치는 절대 등급이 아니라, 일간이 계절·뿌리·도움 글자에서 얼마나 지지를 받는지 합산한 상대값이야. 경계선에 가까울수록 환경 영향이 커서, 같은 사람도 직장·사는 곳·인간관계가 바뀌면 체감하는 힘이 달라져.')+
          depthParagraph('용신과 기신의 쓰임새',
            yong+'은 "더하면 숨통이 트이는 기운"이고 '+kij+'는 "이미 충분하거나 넘치기 쉬운 기운"이야. '+(jg&&jg.isJong?'종격에 가까운 구조에서는 일반 억부 공식이 거꾸로 작동할 수 있어서, 강한 흐름을 억지로 누르는 선택이 오히려 소모로 이어지기도 해.':'일반 억부 구조에서는 넘치는 쪽을 덜어 내고 모자란 쪽을 채우는 단순한 원칙이 대체로 잘 맞아.')+' 어느 쪽이든 최종 기준은 이론이 아니라 실제 컨디션 변화야.')+
          depthParagraph('흔한 오해 바로잡기',
            '용신을 행운의 부적처럼 다루는 해석은 위험해. 용신은 결과를 보장하는 장치가 아니라 힘의 배분을 조절하는 방향 표시고, 기신이라고 불린 기운도 삶의 어떤 국면에서는 꼭 필요해. 예를 들어 통제와 마감을 맡는 기운이 전혀 없으면, 재능이 있어도 결과로 맺히지 않거든.')+
          depthParagraph('스스로 확인할 질문',
            '최근 6개월 중에 성과가 제일 좋았던 시기에 뭘 늘리고 뭘 줄였는지 적어 봐. 그 목록이 '+yong+' 쪽에 가까웠는지 '+kij+' 쪽에 가까웠는지 대조해 보면, 이 장의 판정이 네 경험이랑 맞는지 직접 검증할 수 있어.')+actionNeo;
      }
      if(key==='wollyeong'){
        return depthParagraph('계절이 만든 기본 템포',
          monthName+'은 '+monthSeason+'에 해당하고, 이때 살아나는 '+monthElement+'의 힘이 사주 전체의 기본 템포를 만들어. '+monthRelation+'은 일간의 재능을 바로 키워 주기도 하고, 반대로 쉴 틈 없이 몰아붙이는 압력으로 나타나기도 해. 이 차이를 알면 "왜 난 같은 일을 해도 어떤 때는 빠르고 어떤 때는 느리지?"를 설명하기 쉬워져.')+
          depthParagraph('가까운 흐름의 활용',
            ((monthReading&&monthReading.careerImpact)||'일과 역할에서는 계절의 강점을 반복할 수 있는 방식으로 짜 두는 게 좋아.')+' '+((monthReading&&monthReading.loveImpact)||'관계에서는 표현 속도랑 감정 회복 시간을 서로 맞추는 게 중요해.')+' '+seasonAdvice+' '+seasonCaution)+
          depthParagraph('월령을 가장 무겁게 보는 이유',
            mrSeasonal+' '+mrBalance+' 명리에서 월지를 가장 힘센 자리로 보는 이유가 여기 있어. 태어난 달의 기운이 나머지 일곱 글자가 각자 역할을 얼마나 해낼 수 있는지, 그 전제 조건을 먼저 정해 버리거든.')+
          depthParagraph('일간과 월령이 만나는 지점',
            mcInterp+' '+mcRelText+' 실제 생활에서는 이게 "언제 밀어붙이고 언제 정비할까"의 감각으로 나타나. 계절이 너를 밀어줄 때는 결정의 크기를 키워도 무리가 적고, 계절이 반대로 움직일 때는 같은 결정에 두 배의 힘이 들어.')+
          depthParagraph('흔한 오해 바로잡기',
            '월령이 강하다고 꼭 좋은 것도, 약하다고 불리한 것도 아니야. '+mcCaution+' 강한 월령은 방향을 빨리 정해 주는 대신 다른 선택지를 지우고, 약한 월령은 속도가 느린 대신 여러 가능성을 오래 열어 둬. 둘은 장단점의 배치가 다를 뿐이야.')+
          depthParagraph('스스로 확인할 질문',
            '태어난 달과 같은 계절이 돌아올 때 체감이 어떻게 달라지는지 딱 1년만 기록해 봐. '+mrSummary+' 기록이 쌓이면 이 장의 해석이 너한테 어떤 모양으로 나타나는지가 네 개인 데이터로 남아.')+actionNeo;
      }
      if(key==='ohaeng'){
        return depthParagraph('비율보다 중요한 균형',
          '지금 오행 비율을 보면 '+ratStr+'야. 여기서 핵심은 가장 많은 오행을 좋다·나쁘다로 가르는 게 아니라, 그 기운이 어떤 역할은 충분히 하고 어떤 역할은 비어 있는지 살피는 거야. '+elTop+'가 중심인 흐름은 '+(ctips.action||'조절 행동')+'처럼 구체적인 루틴으로 옮길 때 생활에서 체감하기 쉬워.')+
          depthParagraph('부족함을 채우는 방식',
            '모자라 보이는 오행을 한꺼번에 늘리기보다 일·주거·관계·식습관 중 한 영역부터 작게 보완해 봐. 반대로 넘치는 기운은 억지로 끊기보다 '+(dtips.action||'속도를 낮추는 활동')+'처럼 흩어 주는 행동을 더하는 쪽이 오래 가.')+
          depthParagraph('순환이 끊기는 자리',
            '가장 두꺼운 층은 '+elTop+', 가장 얇은 층은 '+elLow+' 쪽이야. 명리에서 중요한 건 다섯 기운이 똑같이 20%씩 나뉜 상태가 아니라, 서로를 낳고(相生) 눌러 주는(相剋) 순환이 끊기지 않느냐야. 한 곳이 너무 두꺼우면 순환이 거기서 막히고, 한 곳이 비면 고리 자체가 끊어져.')+
          depthParagraph('두꺼운 층과 얇은 층의 역할',
            elTop+'가 앞선 구조에서는 그 기운이 잘하는 일을 자연스럽게 반복하게 돼서 성과도 그쪽에서 먼저 나와. 문제는 '+elLow+'가 맡는 영역 — 대체로 기록·마감·거절·휴식처럼 눈에 잘 안 띄는 일 — 이 자꾸 뒤로 밀린다는 거야. 이 얇은 층을 사람이나 시스템으로 대신 채우는 것도 훌륭한 해법이야.')+
          depthParagraph('흔한 오해 바로잡기',
            '비어 있는 오행을 색이나 물건으로 한 번에 채우려는 시도는 대개 오래 못 가. 오행은 물건의 속성이기 전에 행동의 성질에 가깝거든. '+ctrlEl+'을 쓰는 행동('+(ctips.action||'정리와 원칙 세우기')+')과 '+drainEl+_sajuJo(drainEl,'으로','로')+' 힘을 빼는 행동('+(dtips.action||'활동과 교류')+')처럼 동사로 바꿔야 진짜 변화가 생겨.')+
          depthParagraph('스스로 확인할 질문',
            '이번 주에 미룬 일 세 가지를 적고, 각각이 어떤 오행의 성질을 요구하는지 표시해 봐. 미룬 일이 한 오행에 몰려 있다면, 그게 이 사주에서 가장 얇은 층일 가능성이 커.')+actionNeo;
      }
      if(key==='sipseong'){
        return depthParagraph('에너지 구성의 반복 패턴',
          '가장 두드러진 십성은 '+dominant+'이고, 이건 '+((tsInfo&&tsInfo.meaning)||deep.nature||'삶에서 반복되는 역할과 욕구')+'로 읽을 수 있어. 같은 십성도 일에서는 성과를 만드는 힘이 되고, 관계에서는 기대와 부담의 방식으로 나타날 수 있거든. 그러니까 한 단어짜리 성격 진단으로 줄여 버리진 않을게.')+
          depthParagraph('강점을 오래 쓰는 조건',
            (deep.career||'너한테 맞는 역할을 반복 가능한 구조로 만들 때 역량이 안정돼.')+' '+(deep.love||'관계에서는 마음을 표현하는 방식과 상대가 받는 방식을 같이 확인해 보는 게 좋아.')+' '+(tsMoneyPatternNeo[dominant]||'재물은 수입과 지출 흐름을 기록해서 패턴부터 확인해 봐.'))+
          depthParagraph('주력과 보조를 함께 읽기',
            '십성 분포를 세 보면 '+tsList+' 순으로 놓여. 가장 두드러진 '+dominant+'은 '+((tsInfo&&tsInfo.desc)||'고유한 역할')+'로 요약되고, '+tsSecond+'은 주력이 안 통할 때 꺼내 드는 보조 카드가 돼. 둘을 같이 보면 "평소의 나"랑 "위기의 나"가 왜 그렇게 달라 보이는지 설명이 돼.')+
          depthParagraph('무대에 따라 달라지는 얼굴',
            (deep.advice||'네 에너지를 반복 가능한 구조 위에 얹어 봐.')+' 십성은 재능 목록이 아니라 에너지가 흐르는 방향이야. 같은 '+dominant+'도 네가 고른 무대에서는 추진력이 되지만, 떠밀려 앉은 자리에서는 소모와 예민함으로 나타나.')+
          depthParagraph('흔한 오해 바로잡기',
            '어떤 십성은 좋고 어떤 십성은 나쁘다는 해석은 명리의 본래 쓰임이 아니야. 십성은 일간을 기준으로 한 관계의 이름일 뿐이라서, 관(官)이 부담으로 읽히는 사람한테는 책임이 무겁고, 명예가 중요한 사람한테는 같은 글자가 성취의 통로가 돼. 이름의 어감 말고 네 경험을 기준으로 읽어 봐.')+
          depthParagraph('스스로 확인할 질문',
            '네가 가장 자주 맡는 역할이랑, 남들이 너한테 가장 자주 부탁하는 일을 각각 세 가지씩 적어 봐. 그 목록이 '+dominant+'의 성질과 얼마나 겹치는지 보면 이 장의 해석을 현실에서 검증할 수 있어.')+actionNeo;
      }
      if(key==='seonggyeok'){
        return depthParagraph('내면과 겉모습의 간격',
          (ganChar[dg]||'일간의 상징')+'은 처음 만난 사람한테 보이는 태도와 혼자 있을 때 회복하는 방식이 다를 수 있다는 걸 보여 줘. '+(ganKeyword[dg]||'고유한 강점')+'이 빠르게 드러나는 장면과 '+(ganWeakPoint[dg]||'주의점')+'이 올라오는 장면을 나눠서 관찰해 봐. 그러면 자기비판보다 자기조절에 가까운 해석이 돼.')+
          depthParagraph('관계에서의 사용법',
            (ganRel[dg]||'진심 있는 관계')+'를 원한다면 상대가 알아서 읽어 주길 기다리기보다, 네가 원하는 거리·표현·회복 시간을 말로 알려 주는 게 좋아. 너를 뜯어고치는 것보다 강점이 잘 돌아가는 환경과 과한 반응을 줄이는 경계를 같이 설계하는 쪽이 현실적이야.')+
          depthParagraph('첫인상과 실제 작동 방식',
            (ganChar[dg]||'일간의 상징')+'이 만드는 첫인상과 십성 구조가 만드는 실제 행동은 종종 어긋나. 지금 구조에서는 '+dominant+'이 앞에 나서니까 처음엔 '+((tsInfo&&tsInfo.meaning)||'그 십성의 인상')+'으로 읽히기 쉬워. 여기에 '+strongTxt+'의 힘 배분까지 더해 보면, 밖으로 드러나는 태도와 혼자 있을 때 필요한 회복 방식이 왜 다른지 설명이 돼.')+
          depthParagraph('압박이 걸릴 때의 순서',
            '기질은 스트레스 상황에서 제일 선명해져. 여유가 있을 때는 '+(ganTalent[dg]||'재능')+'이 먼저 나오지만, 압박이 커지면 '+(ganWeakPoint[dg]||'약점')+'이 앞장서. 이 순서를 미리 알고 있으면 "왜 중요한 순간에 평소랑 다른 내가 나오지?"를 성격 문제가 아니라 설계 문제로 다룰 수 있어.')+
          depthParagraph('흔한 오해 바로잡기',
            '성격 해석을 고치라는 지시로 받아들이진 마. 명리는 기질을 바꾸는 기술이 아니라 기질을 어디에 놓을지 정하는 기술이야. 같은 예민함도 감시받는 자리에서는 불안이 되고, 품질을 책임지는 자리에서는 전문성이 돼.')+
          depthParagraph('스스로 확인할 질문',
            '가까운 사람 두 명한테 "내가 어떤 상황에서 제일 나답고, 어떤 상황에서 제일 나답지 않아 보여?"라고 물어 봐. 그 답이랑 이 장의 서술이 겹치는 부분, 그게 실제로 조정해 볼 만한 지점이야.')+actionNeo;
      }
      if(key==='jinro'){
        return depthParagraph('직업 선택의 축',
          ((monthReading&&monthReading.careerImpact)||'계절의 힘과 십성의 역할이 만나는 지점에서 진로 방향이 구체적으로 잡혀.')+' '+(deep.career||'능력을 반복해서 성과로 바꾸는 역할을 골라 봐.')+' 여기에 네 인생 방향까지 같이 놓고 보면, 단순한 직업 목록보다 어떤 식으로 일해야 오래 버틸 수 있는지가 선명해져. 한 줄로 잡으면 이래 — '+(lifeStrategyByTsNeo[dominant]||'전문성과 신뢰를 쌓는 길'))+
          depthParagraph('성공을 지속하는 조건',
            '잘 맞는 일이라도 속도·권한·피드백 구조가 안 맞으면 소진될 수 있어. 처음부터 큰 결정을 하기보다 2~4주짜리 작은 프로젝트로 맞는지 시험해 보고, 결과보다 몰입도와 회복 비용을 기록해서 다음 선택의 근거로 삼아 봐.')+
          depthParagraph('업종이 아니라 동사로 고르기',
            ((tsInfo&&tsInfo.desc)||'주력 십성의 성질')+'을 직업으로 옮길 때 중요한 건 업종 이름이 아니라 하루 대부분을 어떤 동사로 채우느냐야. '+dominant+'이 강한 구조에서 성과가 먼저 나오는 자리는 이래 — '+(deep.career||'그 십성이 잘 쓰이는 역할이야.')+' 그리고 '+tsSecond+'은 팀 안에서 자연스럽게 맡게 되는 두 번째 역할을 설명해 줘.')+
          depthParagraph('확장기와 정비기의 구분',
            mrStrength+' 계절의 힘까지 따져 보면 지금이 확장기인지 정비기인지 가늠할 수 있어. 확장기엔 무대 수를 늘리고, 정비기엔 이미 쌓은 걸 문서·시스템·관계로 굳히는 쪽이 다음 확장의 발판이 돼. 두 국면에 같은 방식을 쓰면 성과보다 피로가 먼저 쌓여.')+
          depthParagraph('흔한 오해 바로잡기',
            '"이 사주에 맞는 직업 목록"을 정답표처럼 받아들이면 오히려 기회를 놓쳐. 같은 구조라도 조직 문화·권한 크기·피드백 주기가 다르면 결과가 정반대로 나오거든. 직업 이름보다 근무 조건을 기준으로 비교하는 쪽이 훨씬 정확해.')+
          depthParagraph('스스로 확인할 질문',
            '지난 1년 중에 시간이 제일 빨리 간 업무랑 제일 느리게 간 업무를 적어 봐. 몰입 차이를 만든 게 일의 종류였는지, 같이 한 사람이었는지, 주어진 권한이었는지 나눠 보면 다음 선택의 기준이 선명해져.')+actionNeo;
      }
      if(key==='yeonae'){
        return depthParagraph('사랑의 속도와 표현',
          (ganRel[dg]||'진심 있는 연애')+'를 바라는 마음은 분명한데, 상대도 같은 방식으로 애정을 표현할 거라고 보긴 어려워. '+((monthReading&&monthReading.loveImpact)||'계절의 온도와 일지의 감정 리듬을 같이 살피면')+' 네가 사랑을 확인하는 방식과 상대가 편안함을 느끼는 방식을 구분할 수 있어.')+
          depthParagraph('오래 가는 관계의 조건',
            '연애와 결혼의 핵심은 끌림의 크기만이 아니라, 다툰 뒤에 다시 이어지는 방법이야. 연락 빈도, 혼자 있는 시간, 돈과 집안일 역할, 서운함을 말하는 타이밍을 미리 합의해 두면 감정이 흔들리는 날에도 관계의 기본 구조를 지킬 수 있어.')+
          depthParagraph('애정 표현의 번역 문제',
            '관계에서 반복되는 패턴은 일지(日支)와 십성 배치에서 읽어. 지금 구조에서는 '+dominant+'의 성질이 애정 표현에도 그대로 나오기 쉬워. '+(deep.love||'마음을 전하는 너만의 방식이 있어.')+' 이 방식이 관계의 리듬을 정해. 상대가 이 방식을 애정으로 번역하지 못하면, 마음의 크기랑 상관없이 오해가 쌓여.')+
          depthParagraph('회복 속도의 차이',
            (johuPending?'조후는':johuType+' 쪽으로 기운 조후는')+' 다툰 뒤 회복에 필요한 시간에도 영향을 줘. 빨리 풀어야 안심하는 사람과 혼자 정리할 시간이 필요한 사람이 만나면, 문제는 사랑의 크기가 아니라 회복 속도의 차이야. 이 차이를 미리 말로 정해 두면 같은 다툼이 되풀이되지 않아.')+
          depthParagraph('흔한 오해 바로잡기',
            '궁합을 두 사람의 점수로 바꾸는 해석은 실제 관계를 설명하지 못해. 명리가 보는 건 두 기운이 만났을 때 어떤 장면이 자주 반복되느냐고, 그 장면은 대화와 합의로 바꿀 수 있어. 안 맞는 조합이라기보다 아직 조율을 안 한 조합인 경우가 훨씬 많아.')+
          depthParagraph('스스로 확인할 질문',
            '최근에 다툰 장면 하나를 골라서 "무엇 때문에"가 아니라 "어떤 순서로" 벌어졌는지 적어 봐. 순서가 매번 비슷하다면 그게 이 사주가 관계에서 반복하는 패턴이고, 그 순서 중 한 칸만 바꿔도 결과가 달라져.')+actionNeo;
      }
      if(key==='sinsal'){
        return depthParagraph('상징을 현실에 번역하기',
          '신살은 사람을 규정하는 낙인이 아니야. 특정 장면에서 반응이 커지는 상징으로 읽는 게 안전해. 매력·이동·집중·직관 같은 힘은 환경을 만나면 재능이 되고, 과해지면 충동·피로·관계의 오해로 나타날 수도 있어. 네 실제 경험이랑 맞는 부분만 골라서 받아들여 봐.')+
          depthParagraph('균형을 지키는 질문',
            '이 에너지가 잘 돌아갈 때 난 뭘 만들고 있는지, 과해질 때 누구와 어떤 갈등을 반복하는지 나눠서 적어 봐. 상징을 무서워하기보다 쓸 수 있는 재능과 조절할 습관으로 갈라 두면, 신살 해석이 현실적인 자기이해로 바뀌어.')+
          depthParagraph('뼈대와 색을 구분하기',
            '신살은 사주의 뼈대가 아니라 뼈대 위에 입혀지는 색이야. 일간 '+dg+'와 '+strongTxt+'의 힘 배분이 기본 구조를 정하고, 신살은 그 구조가 특정 장면에서 얼마나 튀게 드러나는지를 알려 줘. 그래서 같은 신살도 구조가 안정된 사람한테는 재능으로, 힘이 한쪽으로 몰린 사람한테는 과부하로 나타나.')+
          depthParagraph('큰 에너지를 흘려보내는 자리',
            '이동·인기·직관처럼 강하게 읽히는 상징은 대개 에너지 총량이 큰 자리야. 총량이 큰 힘은 쓸 곳이 정해져 있으면 성과가 되고, 쓸 곳이 없으면 안으로 돌아서 충동이나 불안이 돼. '+drainEl+' 쪽으로 힘을 흘려보내는 활동('+(dtips.action||'운동과 교류')+')을 미리 배치해 두는 게 안전해.')+
          depthParagraph('흔한 오해 바로잡기',
            '흉살이라는 이름 때문에 불안해할 필요는 없어. 전통적으로 흉하게 분류된 글자들은 대부분 변화·분리·긴장을 뜻하는데, 이건 요즘의 이직·이사·독립처럼 네가 스스로 고르는 변화와 같은 에너지거든. 통제 못 하는 사건이 아니라 다룰 수 있는 성질로 읽는 게 정확해.')+
          depthParagraph('스스로 확인할 질문',
            '인생에서 방향이 크게 바뀐 시점을 세 번 떠올려 봐. 그 변화가 밖에서 밀려온 건지 네가 스스로 당긴 건지 나눠 보면, 같은 에너지를 앞으로 어느 쪽으로 쓸지 정하기 쉬워져.')+actionNeo;
      }
      if(key==='geongang'){
        return depthParagraph('컨디션의 패턴',
          '건강 해석은 진단이 아니라 생활 리듬을 점검하는 참고 신호야. '+(health.weak||'취약하기 쉬운 컨디션')+_sajuJo(health.weak||'취약하기 쉬운 컨디션','과','와')+' '+(health.stress||'스트레스 신호')+_sajuJo(health.stress||'스트레스 신호','이','가')+' 겹치는 시기에는 의지로 버티기보다 수면·식사·움직임부터 정돈하는 쪽이 안전해.')+
          depthParagraph('회복 루틴의 기준',
            (health.advice||'작고 반복 가능한 회복 루틴')+' '+(health.food||'몸에 맞는 식사')+'를 한꺼번에 바꾸기보다 하나씩 실험해 봐. 증상이 계속되거나 일상에 영향을 준다면 운세 해석보다 의료 전문가의 판단이 먼저야.')+
          depthParagraph('신호가 먼저 오는 자리',
            '일간 '+dg+'('+dayElKo+') 기준으로는 '+(health.weak||'주의할 부위')+_sajuJo(health.weak||'주의할 부위','이','가')+' 먼저 신호를 보내는 편이고, 오행 분포에서 '+elLow+'가 얇다는 건 회복 자원이 모자라기 쉬운 지점을 알려 줘.'+(johuPending?'':' 조후가 '+johuType+' 쪽이라면 계절이 바뀌는 구간에 컨디션 진폭이 특히 커질 수 있어.'))+
          depthParagraph('식사를 다루는 방식',
            (health.food||'몸에 맞는 식사')+'는 치료식이 아니라 기울어진 기운을 되돌리는 생활 재료로 보는 게 맞아. '+(ctips.food||'담백한 식사')+' 같은 방향을 평소 식단에 조금씩 섞고, 극단적으로 제한하기보다 비율만 바꿔 봐. 오래 못 지키는 식단은 효과를 확인할 기회조차 안 주거든.')+
          depthParagraph('꼭 지켜야 할 한계',
            '명리의 건강 해석은 의료 진단이 아니야. 같은 사주라도 수면·운동·스트레스·병력에 따라 실제 몸 상태는 완전히 달라지고, 이 리포트는 검사 결과를 대신할 수 없어. 통증·수면장애·기분의 급격한 변화가 2주 넘게 이어진다면 꼭 의료 전문가한테 진료를 받아 봐.')+
          depthParagraph('스스로 확인할 질문',
            '지난 한 달 중에 컨디션이 제일 나빴던 사흘을 찾아서, 그 전날 뭘 했는지 적어 봐. 원인은 대개 당일이 아니라 전날의 수면·식사·감정 소모에 있거든.')+actionNeo;
      }
      if(key==='jaemul'){
        return depthParagraph('돈이 움직이는 방식',
          (tsMoneyPatternNeo[dominant]||'수입과 지출이 반복되는 패턴부터 봐야 해.')+' '+((monthReading&&monthReading.wealthImpact)||'계절의 압력이 재물 판단 속도에 영향을 줄 수도 있어.')+' 그러니까 큰 기회를 기다리기보다 수입원·고정비·비상 여유를 나눠서 기록해 봐. 그래야 네 재물 흐름을 더 정확하게 볼 수 있어.')+
          depthParagraph('현실적인 수호선',
            (elMoneyAdviceNeo[domE]||'계약이랑 지출 기록은 꼼꼼히 확인해 봐.')+' 운세는 투자 수익이나 손실을 보장하지 않아. 중요한 금융 결정은 감당할 수 있는 범위와 검증된 정보 안에서 판단해 봐.')+
          depthParagraph('재성보다 중요한 감당할 힘',
            '재물은 십성에서 재성(財星) 자리로 읽지만, 실제로 쌓이는지를 정하는 건 재성의 개수가 아니라 그걸 감당할 힘이야. '+strongTxt+' 판정('+powerTxt+')으로 보면 '+((pw&&pw.isStrong)?'기회를 잡는 추진력은 충분한 편이라, 관리와 마감 체계를 붙일 때 수익 폭이 커질 수 있어.':'큰 판을 혼자 감당하기보다 검증된 구조 안에서 반복 가능한 수입부터 쌓는 쪽이 안전해.'))+
          depthParagraph('판단이 급해지는 구간',
            ((monthReading&&monthReading.wealthImpact)||'계절의 압력이 돈에 대한 판단 속도에 영향을 줄 수 있어.')+' 수입원·고정비·비상금을 한 장에 적어 두면 "흐름이 좋은 시기"와 "판단이 급해지는 시기"를 구분할 수 있어. 손실은 대부분 정보가 없어서가 아니라 결정에 쓴 시간이 짧아서 생기거든.')+
          depthParagraph('꼭 지켜야 할 한계',
            '운세는 수익을 보장하지 않아. 명리로 읽을 수 있는 건 돈을 다룰 때 반복되는 습관 — 언제 과감해지고 언제 미루는지 — 이지, 특정 종목이나 시점의 결과가 아니야. 투자·대출·계약은 꼭 감당할 수 있는 범위와 검증된 정보 안에서 결정해 봐.')+
          depthParagraph('스스로 확인할 질문',
            '최근에 후회한 지출과 만족한 지출을 각각 세 건씩 적어 봐. 금액 말고 결정에 걸린 시간을 비교해 보면, 이 사주가 돈 앞에서 어떤 속도일 때 실수하는지가 보여.')+actionNeo;
      }
      if(key==='guiin'){
        return depthParagraph('도움을 주고받는 방식',
          '너한테 귀인으로 읽히는 사람은 이런 쪽이야. '+(guiinByDomNeo[domE]||'성장을 돕는 멘토 타입이야.')+' 이런 사람이 귀인인 건 네가 부족해서가 아니라, 혼자서는 반복하기 어려운 시야와 연결을 채워 주기 때문이야. 도움을 받으면서 네가 먼저 나눌 수 있는 경험과 자원도 정리해 두면, 관계가 한쪽으로만 기대는 흐름으로 가지 않아.')+
          depthParagraph('귀인 인연을 이어 가는 법',
            '좋은 조언을 들었다면 실행 결과를 짧게라도 공유하고, 상대의 시간과 경계를 존중해 봐. 한 번의 강렬한 만남보다 스터디·프로젝트·커뮤니티처럼 같은 방향의 접점이 반복되는 환경이 실제 귀인 관계를 만들 가능성이 높아.')+
          depthParagraph('얇은 층을 채워 주는 사람',
            '귀인은 신비한 구원자가 아니라 네 사주에서 얇은 층을 대신 채워 주는 사람이야. 지금 구조에서 '+elLow+'가 얇다면, 그 성질을 자연스럽게 갖춘 사람이 곁에 있을 때 일이 눈에 띄게 풀려. 반대로 '+elTop+'가 두꺼운 사람끼리만 모이면 속도는 빨라도 같은 실수를 같이 반복하기 쉬워.')+
          depthParagraph('밀도보다 반복',
            '관계의 강렬함보다 접점의 반복이 중요해. 한 번의 인상적인 만남보다 같은 목표를 향해 정기적으로 마주치는 환경 — 스터디·프로젝트·정기 모임 — 에서 귀인 관계가 생겨. '+(ctips.place||'정돈된 공간')+'처럼 네 기운이 안정되는 장소에서 사람을 만나면 대화의 질도 달라져.')+
          depthParagraph('흔한 오해 바로잡기',
            '귀인을 기다리기만 하는 태도는 위험해. 도움은 대개 이미 뭔가를 시작한 사람한테 붙거든. 그리고 너를 돕는 사람이 늘 편한 사람인 것도 아니야 — 쓴소리를 해 주는 사람이 얇은 층을 채워 주는 경우가 오히려 더 많아.')+
          depthParagraph('스스로 확인할 질문',
            '지난 3년 동안 네 방향을 바꾼 조언을 해 준 사람을 떠올려 봐. 그 사람들의 공통점을 한 문장으로 정리해 보면, 앞으로 너를 어떤 자리에 둬야 할지가 정해져.')+actionNeo;
      }
      if(key==='gaeun'){
        return depthParagraph('개운의 핵심',
          '개운은 물건 하나로 운을 바꾸는 주문이 아니야. 넘치는 기운은 흩어 주고, 필요한 기운은 생활에 반복해서 들이는 조정법이거든. '+ctrlEl+'을 활용하는 행동과 '+drainEl+'으로 힘을 나누는 행동을 번갈아 써 보면 무리 없이 균형을 시험해 볼 수 있어.')+
          depthParagraph('작게 시작하는 순서',
            '색·방향·음식·활동을 한꺼번에 다 바꾸기보다 제일 쉽게 반복할 수 있는 한 가지를 2주 동안 해 보고, 수면·집중·관계의 변화를 적어 봐. 효과가 안 느껴지면 다른 요소로 바꿔 가면서 너한테 맞는 루틴만 남기면 돼.')+
          depthParagraph('원리는 단순해',
            '개운의 원리는 단순해. 넘치는 '+elTop+'의 힘을 '+drainEl+' 쪽으로 흘려보내고, 모자란 자리는 '+ctrlEl+'의 성질로 붙잡아 주는 거야. 색('+(ctips.color||'차분한 색')+'), 공간('+(ctips.place||'정돈된 장소')+'), 음식('+(ctips.food||'담백한 식사')+')은 그 성질을 몸이 기억하게 해 주는 보조 장치일 뿐이고, 핵심은 언제나 행동이야.')+
          depthParagraph('분산과 응집을 번갈아',
            '흩어 줘야 할 때는 '+(dtips.action||'활동과 교류')+' 쪽을, 모아야 할 때는 '+(ctips.action||'정리와 원칙 세우기')+' 쪽을 써. 둘을 동시에 하면 서로 상쇄되니까 2주 단위로 하나씩 번갈아 해 보고, 그 사이 수면·집중·기분을 기록해서 어느 쪽이 너한테 맞는지 확인해 봐.')+
          depthParagraph('흔한 오해 바로잡기',
            '부적이나 방향·색만으로 운이 바뀐다는 설명은 명리의 본래 논리와 달라. 오행은 물건의 속성이기 전에 행동의 성질이고, 바뀌는 건 운 자체가 아니라 같은 상황에서 네가 고르는 반응이야. 비싼 물건을 사는 식의 개운은 권하지 않아.')+
          depthParagraph('스스로 확인할 질문',
            '2주 실험이 끝나면 "다시 하고 싶은 것"만 남기고 나머지는 버려 봐. 개운 루틴은 길수록 좋은 게 아니라, 끝까지 반복되는 것만 효과가 있거든.')+actionNeo;
      }
      if(key==='jeollyak'){
        return depthParagraph('장기 전략의 중심',
          '네 장기 방향을 한 줄로 잡으면 이래. '+(lifeStrategyByTsNeo[dominant]||'전문성과 신뢰를 쌓는 길이야.')+' 핵심은 빠른 승부보다 네 에너지를 반복 가능한 성과로 바꾸는 쪽이야. '+monthName+'의 계절 템포와 '+mrStrength+'을 함께 고려하면 지금 넓힐 일과 잠깐 정리할 일을 구분하기 쉬워져.')+
          depthParagraph('다음 90일의 기준',
            '큰 목표는 한 문장으로 두고, 매주 확인할 행동 하나와 매일 반복할 루틴 하나로 쪼개 봐. 결과가 늦더라도 기록이 남으면 다음 선택의 정확도가 올라가. 이 리포트도 정답지가 아니라 그 기록을 시작하는 지도처럼 쓰면 돼.')+
          depthParagraph('전략의 세 가지 뼈대',
            '첫째, 이미 두꺼운 '+elTop+'의 힘은 더 키우기보다 결과물로 바꿔. 둘째, 얇은 '+elLow+'는 혼자 채우려 애쓰기보다 사람·도구·시스템으로 대신해. 셋째, 주력 십성 '+dominant+'이 잘 돌아가는 조건을 문장으로 적어 두고 그 조건에 맞는 자리만 골라. 이 세 가지가 서면 나머지 선택은 저절로 좁혀져.')+
          depthParagraph('지금의 국면 읽기',
            mrSeasonal+' 지금이 확장기라면 무대 수를 늘리고, 정비기라면 이미 벌여 둔 일의 수를 줄여 봐. '+seasonAdvice+' 국면을 잘못 읽으면 같은 노력으로 절반의 결과만 남아.')+
          depthParagraph('흔한 오해 바로잡기',
            '장기 계획을 세울 때 제일 흔한 실수는 목표를 늘리는 거야. 사주 관점에서 보면 사람이 동시에 감당할 수 있는 방향은 많아야 둘이고, 셋 이상이 되면 가장 두꺼운 오행 쪽으로 힘이 몰려서 나머지는 방치돼. 더할 것보다 버릴 것부터 정하는 쪽이 빨라.')+
          depthParagraph('스스로 확인할 질문',
            '1년 뒤 너 스스로한테 보여 주고 싶은 증거 하나를 정해 봐. 숫자든 작품이든 관계든 상관없어. 그 증거 하나가 정해지면 이 리포트의 모든 장이 그걸 이루기 위한 세부 지침으로 다시 읽힐 거야.')+actionNeo;
      }
      return commonNeo+actionNeo;
    }
    var common=depthParagraph('이 해석을 읽는 법',
      '이 장의 결론은 한 가지 문장으로 운명을 고정하는 판정이 아니라, 일간·계절·오행 분포가 함께 만들어내는 반복 패턴을 읽은 것입니다. 같은 기질도 환경과 선택에 따라 강점으로 쓰일 수 있고, 과해지면 피로와 갈등의 모습으로 나타날 수 있으니 자신의 실제 경험과 대조해 받아들여 주세요.');
    var action=depthList([
      '오늘의 선택에서 이 장의 키워드가 드러난 장면을 한 가지 기록하기',
      '강점은 한 번 더 반복하고, 과해지는 신호는 한 박자 늦추는 개인 규칙 만들기',
      '가까운 사람에게 내 패턴을 설명하고 현실적인 피드백 한 가지 받기',
      '이 장의 서술 중 내 경험과 어긋나는 문장을 하나 골라 왜 다른지 적어 두기',
      '2주 뒤 같은 장을 다시 읽고 달라진 점과 그대로인 점을 구분해 보기'
    ]);
    if(key==='chongpyeong'){
      return depthParagraph('기질이 움직이는 방식',
        '일간 '+dg+'의 성향은 혼자 떨어져 작동하기보다 태어난 계절과 주변 오행의 도움을 받으며 방향이 정해집니다. 그래서 '+(ganKeyword[dg]||'고유한 기질')+'은 이미 갖고 있는 자원이고, '+(ganWeakPoint[dg]||'균형 조율')+'은 능력이 부족해서가 아니라 힘이 한쪽으로 몰릴 때 생기는 그림자로 보는 편이 정확합니다. '+monthName+'의 '+monthSeason+' 흐름과 '+monthElement+' 기운이 이 기질의 속도와 표현 방식을 조절합니다.')+
        depthParagraph('생활에서 확인할 신호',
          '일이 잘 풀릴 때는 '+(ganTalent[dg]||'자신의 재능')+'이 자연스럽게 반복되고, 지칠 때는 '+(ganWeakPoint[dg]||'과한 기질')+'이 먼저 드러날 수 있습니다. 연애에서도 '+(ganRel[dg]||'진심 있는 관계')+'를 원하지만 표현 속도와 상대의 속도가 다를 수 있으므로, 마음을 증명하려는 행동보다 서로의 회복 시간을 합의하는 방식이 더 오래 갑니다.')+
        depthParagraph('구조가 말해주는 근거',
          '여덟 글자를 일간 '+dg+' 기준으로 다시 세면 십성은 '+tsList+' 순으로 힘이 실립니다. 가장 두꺼운 '+dominant+'이 평소의 판단 습관을 만들고, '+tsSecond+'은 주력이 막혔을 때 꺼내 쓰는 두 번째 태도로 작동합니다. 오행으로 보면 '+elTop+'가 앞에 서고 '+elLow+'가 뒤에 남는데, 이 간격이 곧 "쉽게 잘하는 일"과 "자꾸 미루는 일" 사이의 거리입니다.')+
        depthParagraph('시기에 따라 달라지는 체감',
          '한 해를 크게 보면 '+johuSeasonTxt+'의 기운이 살아날 때 이 기질이 가장 자연스럽게 흘러갑니다. 반대로 기록·마무리·거절처럼 '+elLow+'의 역할이 필요한 구간에서는 같은 능력도 유난히 무겁게 느껴질 수 있습니다. 그 시기를 재능 부족으로 해석하지 말고 배치의 문제로 읽으면 회복이 훨씬 빠릅니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '총평을 "나는 원래 이런 사람"이라는 고정된 라벨로 받아들이면 오히려 선택지가 좁아집니다. 명리에서 말하는 기질은 출발 지점이지 도착 지점이 아니며, 같은 '+dg+' 일간이라도 어떤 계절·어떤 사람·어떤 역할과 만나느냐에 따라 드러나는 얼굴이 달라집니다. 이 리포트는 가능성의 지도이지 판결문이 아닙니다.')+
        depthParagraph('스스로 확인할 질문',
          '최근 한 달 동안 가장 몰입했던 장면과 가장 소모적이었던 장면을 하나씩 떠올려 보세요. 두 장면에서 '+(ganKeyword[dg]||'핵심 기질')+'이 어떻게 다르게 쓰였는지 비교하면, 바꿔야 할 것은 성격 자체가 아니라 그 기질이 놓이는 환경이라는 점이 드러납니다.')+action;
    }
    if(key==='johu'){
      return depthParagraph('온도와 습도의 실제 의미',
        '조후는 좋고 나쁨을 가르는 낙인이 아니라, 몸과 감정이 어떤 환경에서 편안하게 움직이는지 살피는 기준입니다. '+(johuPending?'':'현재 판정이 '+johuType+' 쪽으로 기울어 있다면 일·관계·수면 리듬도 같은 방향으로 영향을 받을 수 있습니다. ')+((johu&&johu.advice)||seasonAdvice))+
        depthParagraph('계절에 맞춘 조정',
          seasonCaution+' '+monthRelation+'을 함께 보면서 지나치게 뜨겁거나 차가운 선택을 줄이고, 내가 회복되는 장소·사람·시간대를 구체적으로 확보해 보세요.')+
        depthParagraph('두 개의 축을 나누어 본다',
          (johuPending?'':'조후 점수는 '+johuScoreTxt+'이고 ')+(johuMoistPending?'습·조의 축은 출생 정보가 부족해 판단을 보류합니다. ':'습·조의 축에서는 '+johuMoistType+' 쪽으로 읽힙니다. ')+'온도 축(춥다·덥다)과 습도 축(마르다·눅눅하다)은 서로 다른 문제라서 해법도 다릅니다. 온도는 활동량과 사람과의 접촉으로, 습도는 수면·수분·공간의 환기로 조정하는 편이 체감이 빠릅니다.')+
        depthParagraph('실제 생활로 옮기기',
          johuImprove+' '+johuMoistAdvice+' 한 번에 전부 바꾸려 하면 몸이 먼저 지칩니다. 아침·낮·저녁 가운데 컨디션이 가장 많이 무너지는 시간대 하나를 골라 그 구간에만 조정을 넣고, 2주 뒤에 다음 구간으로 넘어가세요.')+
        depthParagraph('흔한 오해 바로잡기',
          '조후가 치우쳤다고 해서 사주가 나쁜 것이 아닙니다. 조후는 "지금의 나에게 무엇이 모자란가"를 알려주는 계기판이며, 나이·직업·사는 지역의 기후에 따라 체감이 크게 달라집니다. 같은 사주라도 근무 환경이 바뀌면 조후의 고민 자체가 사라지기도 합니다.')+
        depthParagraph('스스로 확인할 질문',
          '몸이 가장 편안했던 계절과 장소를 떠올려 보세요. 그때의 온도·습도·빛의 양을 지금 생활에 얼마나 재현할 수 있는지 적어 보면, 조후 조정은 추상적인 이론이 아니라 방 하나·습관 하나의 문제로 내려옵니다.')+action;
    }
    if(key==='eokbu'){
      return depthParagraph('강약을 활용하는 법',
        '현재 구조는 '+(pw&&pw.isStrong?'일간의 힘이 비교적 강한 편':'일간의 힘이 외부 도움과 조율을 필요로 하는 편')+'으로 읽힙니다. '+(jg&&jg.isJong?'종격 가능성이 함께 검토되는 구조이므로 한 방향의 힘을 무조건 억누르기보다 실제 삶에서 지속 가능한지 확인하는 과정이 중요합니다.':'일반적인 억부 흐름에서는 강한 부분을 설기하거나 부족한 부분을 보완하는 균형 감각이 핵심입니다.')+' 용신 후보는 '+yong+', 조심해서 다룰 기운은 '+kij+_sajuJo(kij,'으로','로')+' 정리됩니다.')+
        depthParagraph('선택의 기준',
          '좋은 선택은 용신이라는 이름을 맹목적으로 따르는 것이 아니라, 그 기운을 활용했을 때 집중력·회복력·관계의 안정이 실제로 좋아지는지 확인하는 선택입니다. 반대로 기신으로 읽힌 기운도 필요한 역할이 있으므로 없애기보다 양과 속도를 조절하는 방식으로 접근하세요.')+
        depthParagraph('수치가 뜻하는 것',
          '강약 판정의 근거가 되는 점수는 '+powerTxt+'이며 '+strongTxt+' 쪽에 놓입니다. 이 수치는 절대 등급이 아니라 일간이 계절·뿌리·도움의 글자에서 얼마나 지지를 받는지를 합산한 상대값입니다. 경계선에 가까울수록 환경의 영향이 커지므로, 같은 사람도 직장·거주지·인간관계가 바뀌면 체감하는 힘이 달라집니다.')+
        depthParagraph('용신과 기신의 쓰임새',
          yong+'은 "더하면 숨통이 트이는 기운"이고 '+kij+'는 "이미 충분하거나 넘치기 쉬운 기운"입니다. '+(jg&&jg.isJong?'종격에 가까운 구조에서는 일반 억부 공식이 반대로 작동할 수 있어, 강한 흐름을 억지로 누르는 선택이 오히려 소모로 이어지기도 합니다.':'일반 억부 구조에서는 넘치는 쪽을 덜어내고 부족한 쪽을 채우는 단순한 원칙이 대체로 잘 맞습니다.')+' 어느 쪽이든 최종 기준은 이론이 아니라 실제 컨디션의 변화입니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '용신을 행운의 부적처럼 다루는 해석은 위험합니다. 용신은 결과를 보장하는 장치가 아니라 힘의 배분을 조절하는 방향 표시이며, 기신이라 불린 기운도 삶의 어떤 국면에서는 반드시 필요합니다. 예컨대 통제와 마감을 담당하는 기운이 전혀 없으면 재능이 있어도 결과로 맺히지 않습니다.')+
        depthParagraph('스스로 확인할 질문',
          '최근 6개월 중 성과가 가장 좋았던 시기에 무엇을 늘리고 무엇을 줄였는지 적어 보세요. 그 목록이 '+yong+' 쪽에 가까웠는지 '+kij+' 쪽에 가까웠는지 대조하면, 이 장의 판정이 내 경험과 맞는지 스스로 검증할 수 있습니다.')+action;
    }
    if(key==='wollyeong'){
      return depthParagraph('계절이 만든 기본 템포',
        monthName+'은 '+monthSeason+'에 해당하며, 이때 살아나는 '+monthElement+'의 힘이 사주 전체의 기본 템포를 만듭니다. '+monthRelation+'은 일간의 재능을 바로 강화하거나, 반대로 쉬어 갈 틈 없이 몰아붙이는 압력으로도 나타날 수 있습니다. 이 차이를 알면 "왜 나는 같은 일을 해도 어떤 때는 빠르고 어떤 때는 느린가"를 설명하기 쉬워집니다.')+
        depthParagraph('가까운 흐름의 활용',
          ((monthReading&&monthReading.careerImpact)||'일과 역할에서는 계절의 강점을 반복 가능한 방식으로 구조화하는 것이 좋습니다.')+' '+((monthReading&&monthReading.loveImpact)||'관계에서는 표현의 속도와 감정 회복 시간을 서로 맞추는 것이 중요합니다.')+' '+seasonAdvice+' '+seasonCaution)+
        depthParagraph('월령을 가장 무겁게 보는 이유',
          mrSeasonal+' '+mrBalance+' 명리에서 월지를 가장 힘이 센 자리로 보는 이유가 여기 있습니다. 태어난 달의 기운은 나머지 일곱 글자가 각자의 역할을 얼마나 해낼 수 있는지의 전제 조건을 먼저 정해 버리기 때문입니다.')+
        depthParagraph('일간과 월령이 만나는 지점',
          mcInterp+' '+mcRelText+' 실제 생활에서는 이것이 "언제 밀어붙이고 언제 정비할 것인가"의 감각으로 나타납니다. 계절이 나를 밀어줄 때는 결정의 크기를 키워도 무리가 적고, 계절이 반대로 작동할 때는 같은 결정이 두 배의 힘을 요구합니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '월령이 강하다고 반드시 좋은 것도, 약하다고 불리한 것도 아닙니다. '+mcCaution+' 강한 월령은 방향을 빠르게 정해주는 대신 다른 선택지를 지우고, 약한 월령은 속도가 느린 대신 여러 가능성을 오래 열어 둡니다. 둘은 장단점의 배치가 다를 뿐입니다.')+
        depthParagraph('스스로 확인할 질문',
          '태어난 달과 같은 계절이 돌아올 때 체감이 어떻게 달라지는지 1년만 기록해 보세요. '+mrSummary+' 기록이 쌓이면 이 장의 해석이 나에게 어떤 형태로 나타나는지가 개인적인 데이터로 남습니다.')+action;
    }
    if(key==='ohaeng'){
      return depthParagraph('비율보다 중요한 균형',
        '현재 오행 비율을 보면 '+ratStr+'입니다. 여기서 핵심은 가장 많은 오행을 좋다·나쁘다로 판단하는 것이 아니라, 그 기운이 어떤 역할을 충분히 하고 어떤 역할은 비어 있는지 살피는 것입니다. '+elTop+'가 중심이 된 흐름은 '+(ctips.action||'조절 행동')+'처럼 구체적인 루틴으로 옮길 때 생활에서 체감되기 쉽습니다.')+
        depthParagraph('부족함을 채우는 방식',
          '부족해 보이는 오행을 한꺼번에 늘리기보다 일·주거·관계·식습관 중 한 영역부터 작게 보완하세요. 반대로 과한 기운은 억지로 끊기보다 '+(dtips.action||'속도를 낮추는 활동')+'처럼 분산시키는 행동을 더하는 편이 지속 가능합니다.')+
        depthParagraph('순환이 끊기는 자리',
          '가장 두꺼운 층은 '+elTop+', 가장 얇은 층은 '+elLow+'입니다. 명리에서 중요한 것은 다섯 기운이 똑같이 20%씩 나뉘는 상태가 아니라, 서로를 낳고(相生) 눌러주는(相剋) 순환이 끊기지 않는가입니다. 한 곳이 지나치게 두꺼우면 순환이 그 자리에서 정체되고, 한 곳이 비면 고리 자체가 끊어집니다.')+
        depthParagraph('두꺼운 층과 얇은 층의 역할',
          elTop+'가 앞선 구조에서는 그 기운이 잘하는 일을 자연스럽게 반복하게 되므로 성과도 그 방향에서 먼저 나옵니다. 문제는 '+elLow+'가 담당하는 영역 — 대체로 기록·마감·거절·휴식처럼 눈에 잘 띄지 않는 일 — 이 계속 뒤로 밀린다는 점입니다. 이 얇은 층을 사람이나 시스템으로 대신 채우는 것도 훌륭한 해법입니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '비어 있는 오행을 색이나 물건으로 한 번에 채우려는 시도는 대개 오래가지 않습니다. 오행은 물건의 속성이기 이전에 행동의 성질에 가깝기 때문입니다. '+ctrlEl+'을 쓰는 행동('+(ctips.action||'정리와 원칙 세우기')+')과 '+drainEl+_sajuJo(drainEl,'으로','로')+' 힘을 빼는 행동('+(dtips.action||'활동과 교류')+')처럼 동사로 바꿔야 실제 변화가 생깁니다.')+
        depthParagraph('스스로 확인할 질문',
          '이번 주에 미룬 일 세 가지를 적고 각각이 어떤 오행의 성질을 요구하는지 표시해 보세요. 미룬 일이 한 오행에 몰려 있다면, 그것이 이 사주에서 가장 얇은 층일 가능성이 높습니다.')+action;
    }
    if(key==='sipseong'){
      return depthParagraph('에너지 구성의 반복 패턴',
        '가장 두드러진 십성은 '+dominant+'이며, 이는 '+((tsInfo&&tsInfo.meaning)||deep.nature||'삶에서 반복되는 역할과 욕구')+'로 읽을 수 있습니다. 같은 십성도 직업에서는 성과를 만드는 힘이 되고, 관계에서는 기대와 부담의 방식으로 나타날 수 있으므로 한 단어의 성격 진단으로 축소하지 않습니다.')+
        depthParagraph('강점을 오래 쓰는 조건',
          (deep.career||'자신에게 맞는 역할을 반복 가능한 구조로 만들 때 역량이 안정됩니다.')+' '+(deep.love||'관계에서는 마음을 표현하는 방식과 상대가 받는 방식을 함께 확인하는 것이 좋습니다.')+' '+(tsMoneyPattern[dominant]||'재물에서는 수입과 지출의 흐름을 기록해 패턴을 확인하세요.'))+
        depthParagraph('주력과 보조를 함께 읽기',
          '십성 분포를 세면 '+tsList+' 순입니다. 가장 두드러진 '+dominant+'은 '+((tsInfo&&tsInfo.desc)||'고유한 역할')+'로 요약되고, '+tsSecond+'은 주력이 통하지 않을 때 꺼내 드는 보조 전략이 됩니다. 두 개를 함께 보면 "평소의 나"와 "위기의 나"가 왜 그렇게 달라 보이는지 설명됩니다.')+
        depthParagraph('무대에 따라 달라지는 얼굴',
          (deep.advice||'자신의 에너지를 반복 가능한 구조 위에 얹으세요.')+' 십성은 재능의 목록이 아니라 에너지가 흐르는 방향입니다. 같은 '+dominant+'도 스스로 선택한 무대에서는 추진력이 되지만, 떠밀려 앉은 자리에서는 소모와 예민함으로 나타납니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '어떤 십성이 좋고 나쁘다는 해석은 명리의 본래 용법이 아닙니다. 십성은 일간을 기준으로 한 관계의 이름일 뿐이어서, 관(官)이 부담으로 읽히는 사람에게는 책임이 무겁고 명예가 중요한 사람에게는 같은 글자가 성취의 통로가 됩니다. 이름의 어감이 아니라 내 경험을 기준으로 읽으세요.')+
        depthParagraph('스스로 확인할 질문',
          '내가 가장 자주 맡는 역할과, 남들이 나에게 가장 자주 부탁하는 일을 각각 세 가지씩 적어 보세요. 그 목록이 '+dominant+'의 성질과 얼마나 겹치는지 확인하면 이 장의 해석을 현실에서 검증할 수 있습니다.')+action;
    }
    if(key==='seonggyeok'){
      return depthParagraph('내면과 겉모습의 간격',
        (ganChar[dg]||'일간의 상징')+'은 처음 만난 사람에게 보이는 태도와 혼자 있을 때의 회복 방식이 다를 수 있음을 보여줍니다. '+(ganKeyword[dg]||'고유한 강점')+'이 빠르게 드러나는 장면과 '+(ganWeakPoint[dg]||'주의점')+'이 올라오는 장면을 나누어 관찰하면 자기비판보다 자기조절에 가까운 해석이 됩니다.')+
        depthParagraph('관계에서의 사용법',
          (ganRel[dg]||'진심 있는 관계')+'를 원한다면 상대가 알아서 읽어주기를 기다리기보다 원하는 거리·표현·회복 시간을 말로 알려주는 것이 좋습니다. 나를 바꾸는 것보다, 강점이 잘 작동하는 환경과 과한 반응을 줄이는 경계를 함께 설계하는 편이 현실적입니다.')+
        depthParagraph('첫인상과 실제 작동 방식',
          (ganChar[dg]||'일간의 상징')+'이 만드는 첫인상과 십성 구조가 만드는 실제 행동은 종종 어긋납니다. 지금 구조에서는 '+dominant+'이 앞에 나서므로 처음에는 '+((tsInfo&&tsInfo.meaning)||'그 십성의 인상')+'으로 읽히기 쉽습니다. 여기에 '+strongTxt+'의 힘 배분을 더해 보면, 밖으로 드러나는 태도와 혼자 있을 때 필요한 회복 방식이 왜 다른지가 설명됩니다.')+
        depthParagraph('압박이 걸릴 때의 순서',
          '기질은 스트레스 상황에서 가장 선명해집니다. 여유가 있을 때는 '+(ganTalent[dg]||'재능')+'이 먼저 나오지만, 압박이 커지면 '+(ganWeakPoint[dg]||'약점')+'이 앞장섭니다. 이 순서를 미리 알고 있으면 "왜 중요한 순간에 평소와 다른 내가 나오는가"를 성격의 문제가 아니라 설계의 문제로 다룰 수 있습니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '성격 해석을 고치라는 지시로 받아들이지 마세요. 명리는 기질을 바꾸는 기술이 아니라 기질을 어디에 놓을지 정하는 기술입니다. 같은 예민함이 감시받는 자리에서는 불안이 되고, 품질을 책임지는 자리에서는 전문성이 됩니다.')+
        depthParagraph('스스로 확인할 질문',
          '가까운 사람 두 명에게 "내가 어떤 상황에서 가장 나답고, 어떤 상황에서 가장 나답지 않아 보이는지" 물어 보세요. 그 답과 이 장의 서술이 겹치는 부분이 실제로 조정할 가치가 있는 지점입니다.')+action;
    }
    if(key==='jinro'){
      return depthParagraph('직업 선택의 축',
        ((monthReading&&monthReading.careerImpact)||'계절의 힘과 십성의 역할이 만나는 지점에서 진로 방향이 구체화됩니다.')+' '+(deep.career||'능력을 반복해서 성과로 바꾸는 역할을 선택하세요.')+' '+(lifeStrategyByTs[dominant]||'전문성과 신뢰를 쌓는 전략')+'을 함께 보면 단순 직업 목록보다 어떤 방식으로 일해야 오래 버틸 수 있는지가 선명해집니다.')+
        depthParagraph('성공을 지속하는 조건',
          '잘 맞는 일도 속도·권한·피드백 구조가 맞지 않으면 소진될 수 있습니다. 처음부터 큰 결정을 하기보다 2~4주짜리 작은 프로젝트로 적합도를 시험하고, 결과보다 몰입도와 회복 비용을 기록해 다음 선택의 근거로 삼아 보세요.')+
        depthParagraph('업종이 아니라 동사로 고른다',
          ((tsInfo&&tsInfo.desc)||'주력 십성의 성질')+'을 직업으로 옮길 때 중요한 것은 업종의 이름이 아니라 하루의 대부분을 어떤 동사로 채우는가입니다. '+dominant+'이 강한 구조는 '+(deep.career||'그 십성이 잘 쓰이는 역할')+'에서 성과가 먼저 나오고, '+tsSecond+'은 팀 안에서 자연스럽게 맡게 되는 두 번째 역할을 설명합니다.')+
        depthParagraph('확장기와 정비기의 구분',
          mrStrength+' 계절의 힘까지 고려하면 지금이 확장기인지 정비기인지 가늠할 수 있습니다. 확장기에는 무대의 수를 늘리고, 정비기에는 이미 쌓은 것을 문서·시스템·관계로 굳히는 편이 다음 확장의 발판이 됩니다. 두 국면에 같은 전략을 쓰면 성과보다 피로가 먼저 쌓입니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '"이 사주에 맞는 직업 목록"을 정답표처럼 받아들이면 오히려 기회를 놓칩니다. 같은 구조라도 조직 문화·권한의 크기·피드백 주기가 다르면 결과가 정반대로 나옵니다. 직업명보다 근무 조건을 기준으로 비교하는 편이 훨씬 정확합니다.')+
        depthParagraph('스스로 확인할 질문',
          '지난 1년 중 시간이 가장 빨리 지나간 업무와 가장 느리게 지나간 업무를 적어 보세요. 몰입의 차이를 만든 것이 일의 종류였는지, 함께한 사람이었는지, 주어진 권한이었는지 구분하면 다음 선택의 기준이 선명해집니다.')+action;
    }
    if(key==='yeonae'){
      return depthParagraph('사랑의 속도와 표현',
        (ganRel[dg]||'진심 있는 연애')+'를 바라는 마음은 분명하지만, 상대가 같은 방식으로 애정을 표현한다고 보기는 어렵습니다. '+((monthReading&&monthReading.loveImpact)||'계절의 온도와 일지의 감정 리듬을 함께 살피면')+' 내가 사랑을 확인하는 방식과 상대가 편안함을 느끼는 방식을 구분할 수 있습니다.')+
        depthParagraph('오래 가는 관계의 조건',
          '연애와 결혼의 핵심은 끌림의 크기만이 아니라 갈등 뒤에 다시 연결되는 방법입니다. 연락 빈도, 혼자 있는 시간, 돈과 집안일의 역할, 서운함을 말하는 타이밍을 미리 합의하면 감정이 흔들리는 날에도 관계의 기본 구조를 지킬 수 있습니다.')+
        depthParagraph('애정 표현의 번역 문제',
          '관계에서 반복되는 패턴은 일지(日支)와 십성의 배치에서 읽습니다. 지금 구조에서는 '+dominant+'의 성질이 애정 표현에도 그대로 나타나기 쉬워 '+(deep.love||'마음을 전하는 고유한 방식')+'이 관계의 리듬을 결정합니다. 상대가 이 방식을 애정으로 번역하지 못하면, 마음의 크기와 무관하게 오해가 쌓입니다.')+
        depthParagraph('회복 속도의 차이',
          (johuPending?'조후는':johuType+' 쪽으로 기운 조후는')+' 다툰 뒤 회복에 필요한 시간에도 영향을 줍니다. 빨리 풀어야 안심하는 사람과 혼자 정리할 시간이 필요한 사람이 만나면, 문제는 사랑의 크기가 아니라 회복 속도의 차이입니다. 이 차이를 미리 말로 정해 두면 같은 다툼이 반복되지 않습니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '궁합을 두 사람의 점수로 환산하는 해석은 실제 관계를 설명하지 못합니다. 명리가 보는 것은 두 기운이 만났을 때 어떤 장면이 자주 반복되는가이며, 그 장면은 대화와 합의로 바꿀 수 있습니다. 맞지 않는 조합이라기보다 아직 조율하지 않은 조합인 경우가 훨씬 많습니다.')+
        depthParagraph('스스로 확인할 질문',
          '최근 다툰 장면을 하나 골라 "무엇 때문에"가 아니라 "어떤 순서로" 벌어졌는지 적어 보세요. 순서가 매번 비슷하다면 그것이 이 사주가 관계에서 반복하는 패턴이고, 그 순서의 한 칸만 바꿔도 결과가 달라집니다.')+action;
    }
    if(key==='sinsal'){
      return depthParagraph('상징을 현실에 번역하기',
        '신살은 사람을 규정하는 낙인보다 특정 장면에서 반응이 커지는 상징으로 읽는 편이 안전합니다. 매력·이동·집중·직관 같은 힘은 환경을 만나면 재능이 되고, 과해지면 충동·피로·관계의 오해로 나타날 수 있습니다. 실제 경험과 맞는 부분만 선택적으로 받아들이세요.')+
        depthParagraph('균형을 지키는 질문',
          '이 에너지가 잘 작동할 때 나는 무엇을 만들고 있는가, 과해질 때 누구와 어떤 갈등을 반복하는가를 나누어 기록해 보세요. 상징을 두려워하기보다 사용 가능한 재능과 조절해야 할 습관으로 분리하면 신살 해석이 현실적인 자기이해로 바뀝니다.')+
        depthParagraph('뼈대와 색을 구분한다',
          '신살은 사주의 뼈대가 아니라 뼈대 위에 입혀지는 색입니다. 일간 '+dg+'와 '+strongTxt+'의 힘 배분이 기본 구조를 정하고, 신살은 그 구조가 특정 장면에서 얼마나 튀게 드러나는지를 알려줍니다. 그래서 같은 신살도 구조가 안정된 사람에게는 재능으로, 힘이 한쪽으로 몰린 사람에게는 과부하로 나타납니다.')+
        depthParagraph('큰 에너지를 흘려보내는 자리',
          '이동·인기·직관처럼 강하게 읽히는 상징은 대개 에너지의 총량이 큰 자리입니다. 총량이 큰 힘은 쓸 곳이 정해져 있으면 성과가 되고, 쓸 곳이 없으면 안으로 돌아 충동이나 불안이 됩니다. '+drainEl+' 쪽으로 힘을 흘려보내는 활동('+(dtips.action||'운동과 교류')+')을 미리 배치해 두는 편이 안전합니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '흉살이라는 이름 때문에 불안해질 필요는 없습니다. 전통적으로 흉하게 분류된 글자들은 대부분 변화·분리·긴장을 뜻하는데, 이는 현대의 이직·이사·독립처럼 스스로 선택하는 변화와 같은 에너지입니다. 통제할 수 없는 사건이 아니라 다룰 수 있는 성질로 읽는 편이 정확합니다.')+
        depthParagraph('스스로 확인할 질문',
          '인생에서 방향이 크게 바뀐 시점을 세 번 떠올려 보세요. 그 변화가 외부에서 밀려온 것이었는지 스스로 당긴 것이었는지 구분하면, 같은 에너지를 앞으로 어느 쪽으로 쓸지 정하기 쉬워집니다.')+action;
    }
    if(key==='geongang'){
      return depthParagraph('컨디션의 패턴',
        '건강 해석은 진단이 아니라 생활 리듬을 점검하는 참고 신호입니다. '+(health.weak||'취약하기 쉬운 컨디션')+_sajuJo(health.weak||'취약하기 쉬운 컨디션','과','와')+' '+(health.stress||'스트레스 신호')+_sajuJo(health.stress||'스트레스 신호','이','가')+' 겹치는 시기에는 의지로 버티기보다 수면·식사·움직임을 먼저 정돈하는 방식이 안전합니다.')+
        depthParagraph('회복 루틴의 기준',
          (health.advice||'작고 반복 가능한 회복 루틴')+' '+(health.food||'몸에 맞는 식사')+'를 한꺼번에 바꾸기보다 하나씩 실험하세요. 증상이 지속되거나 일상에 영향을 준다면 운세 해석보다 의료 전문가의 판단을 우선해야 합니다.')+
        depthParagraph('신호가 먼저 오는 자리',
          '일간 '+dg+'('+dayElKo+') 기준으로는 '+(health.weak||'주의할 부위')+_sajuJo(health.weak||'주의할 부위','이','가')+' 먼저 신호를 보내는 편이고, 오행 분포에서 '+elLow+'가 얇다는 점은 회복 자원이 부족해지기 쉬운 지점을 알려줍니다.'+(johuPending?'':' 조후가 '+johuType+' 쪽이라면 계절이 바뀌는 구간에 컨디션의 진폭이 특히 커질 수 있습니다.'))+
        depthParagraph('식사를 다루는 방식',
          (health.food||'몸에 맞는 식사')+'는 치료식이 아니라 기울어진 기운을 되돌리는 생활 재료로 보는 편이 맞습니다. '+(ctips.food||'담백한 식사')+' 같은 방향을 평소 식단에 조금씩 섞고, 극단적인 제한 대신 비율만 바꾸세요. 오래 지키지 못하는 식단은 효과를 확인할 기회조차 주지 않습니다.')+
        depthParagraph('반드시 지켜야 할 한계',
          '명리의 건강 해석은 의료 진단이 아닙니다. 같은 사주라도 수면·운동·스트레스·병력에 따라 실제 몸 상태는 완전히 달라지며, 이 리포트는 검사 결과를 대신할 수 없습니다. 통증·수면장애·기분의 급격한 변화가 2주 이상 이어진다면 반드시 의료 전문가의 진료를 받으세요.')+
        depthParagraph('스스로 확인할 질문',
          '지난 한 달 중 컨디션이 가장 나빴던 사흘을 찾아 그 전날 무엇을 했는지 적어 보세요. 원인은 대개 당일이 아니라 전날의 수면·식사·감정 소모에 있습니다.')+action;
    }
    if(key==='jaemul'){
      return depthParagraph('돈이 움직이는 방식',
        (tsMoneyPattern[dominant]||'수입과 지출의 반복 패턴')+' '+((monthReading&&monthReading.wealthImpact)||'계절의 압력이 재물 판단의 속도에 영향을 줄 수 있습니다.')+' 따라서 큰 기회를 기다리기보다 수입원·고정비·비상 여유를 나누어 기록할 때 자신의 재물 흐름을 더 정확히 확인할 수 있습니다.')+
        depthParagraph('현실적인 수호선',
          (elMoneyAdvice[domE]||'계약과 지출 기록을 꼼꼼히 확인하세요.')+' 운세는 투자 수익이나 손실을 보장하지 않으므로, 중요한 금융 결정은 감당 가능한 범위와 검증된 정보 안에서 판단하세요.')+
        depthParagraph('재성보다 중요한 감당할 힘',
          '재물은 십성에서 재성(財星)의 자리로 읽지만, 실제 축적을 결정하는 것은 재성의 개수가 아니라 그것을 감당할 힘입니다. '+strongTxt+' 판정('+powerTxt+')에서 보면 '+((pw&&pw.isStrong)?'기회를 잡는 추진력은 충분한 편이므로 관리와 마감의 체계를 붙일 때 수익의 폭이 커집니다.':'큰 판을 혼자 감당하기보다 검증된 구조 안에서 반복 가능한 수입을 먼저 쌓는 편이 안전합니다.'))+
        depthParagraph('판단이 급해지는 구간',
          ((monthReading&&monthReading.wealthImpact)||'계절의 압력이 돈에 대한 판단 속도에 영향을 줍니다.')+' 수입원·고정비·비상금을 한 장에 적어 두면 "흐름이 좋은 시기"와 "판단이 급해지는 시기"를 구분할 수 있습니다. 대부분의 손실은 정보가 없어서가 아니라 결정에 쓴 시간이 짧아서 생깁니다.')+
        depthParagraph('반드시 지켜야 할 한계',
          '운세는 수익을 보장하지 않습니다. 명리로 읽을 수 있는 것은 돈을 다룰 때 반복되는 습관 — 언제 과감해지고 언제 미루는가 — 이지 특정 종목이나 시점의 결과가 아닙니다. 투자·대출·계약은 반드시 감당 가능한 범위와 검증된 정보 안에서 결정하세요.')+
        depthParagraph('스스로 확인할 질문',
          '최근 후회한 지출과 만족한 지출을 각각 세 건씩 적어 보세요. 금액이 아니라 결정에 걸린 시간을 비교하면, 이 사주가 돈에서 어떤 속도일 때 실수하는지가 드러납니다.')+action;
    }
    if(key==='guiin'){
      return depthParagraph('도움을 주고받는 방식',
        (guiinByDom[domE]||'성장을 돕는 멘토')+'가 귀인으로 읽히는 이유는 당신이 부족해서가 아니라, 혼자 반복하기 어려운 시야와 연결을 보완해 주기 때문입니다. 도움을 받는 동시에 자신이 먼저 나눌 수 있는 경험과 자원을 정리하면 관계가 일방향 의존으로 흐르지 않습니다.')+
        depthParagraph('귀인 인연을 유지하는 법',
          '좋은 조언을 들었다면 실행 결과를 짧게 공유하고, 상대의 시간과 경계를 존중하세요. 한 번의 강한 만남보다 스터디·프로젝트·커뮤니티처럼 같은 방향의 접점을 반복하는 환경이 실제 귀인 관계를 만들 가능성이 높습니다.')+
        depthParagraph('얇은 층을 채워주는 사람',
          '귀인은 신비한 구원자가 아니라 내 사주에서 얇은 층을 대신 채워주는 사람입니다. 지금 구조에서 '+elLow+'가 얇다면, 그 성질을 자연스럽게 갖춘 사람이 곁에 있을 때 일이 눈에 띄게 풀립니다. 반대로 '+elTop+'가 두꺼운 사람끼리만 모이면 속도는 빨라도 같은 실수를 함께 반복하기 쉽습니다.')+
        depthParagraph('밀도보다 반복',
          '관계의 강렬함보다 접점의 반복이 중요합니다. 한 번의 인상적인 만남보다 같은 목표를 향해 정기적으로 마주치는 환경 — 스터디·프로젝트·정기 모임 — 에서 귀인 관계가 만들어집니다. '+(ctips.place||'정돈된 공간')+'처럼 내 기운이 안정되는 장소에서 사람을 만나면 대화의 질도 달라집니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '귀인을 기다리는 태도는 위험합니다. 도움은 대개 이미 무언가를 시작한 사람에게 붙기 때문입니다. 또한 나를 돕는 사람이 늘 편안한 사람은 아닙니다 — 쓴 말을 해주는 사람이 얇은 층을 채워주는 경우가 오히려 더 많습니다.')+
        depthParagraph('스스로 확인할 질문',
          '지난 3년간 내 방향을 바꾼 조언을 준 사람을 떠올려 보세요. 그 사람들의 공통점을 한 문장으로 정리하면, 앞으로 나를 어떤 자리에 두어야 할지가 정해집니다.')+action;
    }
    if(key==='gaeun'){
      return depthParagraph('개운의 핵심',
        '개운은 특정 물건 하나로 운을 바꾸는 주문이 아니라, 과한 기운은 분산하고 필요한 기운은 반복해서 생활에 들이는 조정법입니다. '+ctrlEl+'을 활용하는 행동과 '+drainEl+'으로 힘을 나누는 행동을 번갈아 적용하면 무리 없이 균형을 시험할 수 있습니다.')+
        depthParagraph('작게 시작하는 순서',
          '색·방향·음식·활동을 모두 바꾸기보다 가장 쉽게 반복할 수 있는 한 가지를 2주간 실천하고, 수면·집중·관계의 변화를 기록하세요. 효과가 체감되지 않으면 다른 요소로 조정하며 자신에게 맞는 루틴만 남기는 것이 좋습니다.')+
        depthParagraph('원리는 단순하다',
          '개운의 원리는 단순합니다. 넘치는 '+elTop+'의 힘을 '+drainEl+' 쪽으로 흘려보내고, 부족한 자리는 '+ctrlEl+'의 성질로 붙잡아 주는 것입니다. 색('+(ctips.color||'차분한 색')+'), 공간('+(ctips.place||'정돈된 장소')+'), 음식('+(ctips.food||'담백한 식사')+')은 그 성질을 몸이 기억하게 만드는 보조 장치일 뿐, 핵심은 언제나 행동입니다.')+
        depthParagraph('분산과 응집을 번갈아',
          '분산이 필요할 때는 '+(dtips.action||'활동과 교류')+' 쪽을, 응집이 필요할 때는 '+(ctips.action||'정리와 원칙 세우기')+' 쪽을 씁니다. 두 가지를 동시에 하면 서로 상쇄되므로 2주 단위로 하나씩 번갈아 적용하고, 그 사이의 수면·집중·기분을 기록해 어느 쪽이 나에게 맞는지 확인하세요.')+
        depthParagraph('흔한 오해 바로잡기',
          '부적이나 방향·색만으로 운이 바뀐다는 설명은 명리의 본래 논리와 다릅니다. 오행은 물건의 속성이기 이전에 행동의 성질이며, 바뀌는 것은 운 자체가 아니라 같은 상황에서 내가 선택하는 반응입니다. 고가의 물건을 구매하는 방식의 개운은 권하지 않습니다.')+
        depthParagraph('스스로 확인할 질문',
          '2주 실험을 마친 뒤 "다시 하고 싶은 것"만 남기고 나머지는 버리세요. 개운 루틴은 길수록 좋은 것이 아니라 끝까지 반복되는 것만 효과가 있습니다.')+action;
    }
    if(key==='jeollyak'){
      return depthParagraph('장기 전략의 중심',
        (lifeStrategyByTs[dominant]||'전문성과 신뢰를 쌓는 전략')+'은 빠른 승부보다 자신의 에너지를 반복 가능한 성과로 바꾸는 방향을 뜻합니다. '+monthName+'의 계절 템포와 '+mrStrength+'을 함께 고려하면 지금 확장할 일과 잠시 정리할 일을 구분하기 쉬워집니다.')+
        depthParagraph('다음 90일의 기준',
          '큰 목표를 한 문장으로 두고, 매주 확인할 행동 하나와 매일 반복할 루틴 하나로 쪼개세요. 결과가 늦더라도 기록이 남으면 다음 선택의 정확도가 올라가며, 이 리포트도 정답지가 아니라 그 기록을 시작하는 지도처럼 사용할 수 있습니다.')+
        depthParagraph('전략의 세 가지 뼈대',
          '첫째, 이미 두꺼운 '+elTop+'의 힘은 더 키우기보다 결과물로 바꿉니다. 둘째, 얇은 '+elLow+'는 혼자 채우려 애쓰기보다 사람·도구·시스템으로 대신합니다. 셋째, 주력 십성 '+dominant+'이 잘 작동하는 조건을 문장으로 적어 두고 그 조건을 만족하는 자리만 고릅니다. 이 세 가지가 서면 나머지 선택은 자동으로 좁혀집니다.')+
        depthParagraph('지금의 국면을 읽는다',
          mrSeasonal+' 지금이 확장기라면 무대의 수를 늘리고, 정비기라면 이미 벌여 둔 것의 수를 줄이세요. '+seasonAdvice+' 국면을 잘못 읽으면 같은 노력으로 절반의 결과만 남습니다.')+
        depthParagraph('흔한 오해 바로잡기',
          '장기 전략을 세울 때 가장 흔한 실수는 목표를 늘리는 것입니다. 사주의 관점에서 보면 사람이 동시에 감당할 수 있는 방향은 많아야 둘이며, 셋 이상이 되면 가장 두꺼운 오행 쪽으로 힘이 몰려 나머지는 방치됩니다. 더할 것보다 버릴 것을 먼저 정하는 편이 빠릅니다.')+
        depthParagraph('스스로 확인할 질문',
          '1년 뒤 스스로에게 보여주고 싶은 증거 한 가지를 정하세요. 숫자든 작품이든 관계든 상관없습니다. 그 증거 하나가 정해지면 이 리포트의 모든 장이 그것을 이루기 위한 세부 지침으로 다시 읽힙니다.')+action;
    }
    return common+action;
  }
  function summaryPersonalDepth(key){
    var source=window.SajuReadingDepth;
    if(!source)return '';
    var facts={p:p,power:pw,johu:johu,jong:jg,unknown:!!window.__cdSajuTimeUnknown};
    var depthPersona=_isNeoSaju?'neo':undefined;
    var sections=[];
    if(key==='wollyeong'){var month=source.monthReading(p.d.g,p.m.j,depthPersona);if(month)sections=month.sections;}
    else if(key==='chongpyeong')sections=source.contextualReading(facts,depthPersona).filter(function(s){return s.key==='gyeok'||s.key==='unknown';});
    else if(key==='johu')sections=source.contextualReading(facts,depthPersona).filter(function(s){return s.key==='climate';});
    else if(key==='eokbu')sections=source.contextualReading(facts,depthPersona).filter(function(s){return s.key==='capacity'||s.key==='structure';});
    return sections.map(function(s){return depthParagraph(s.title,s.text);}).join('');
  }
  function box(key,title,body,accent,bg){
    var bc=accent||'#bba371';
    var id='sbx'+(++_bxCtr);
    var chapterId='sajuSummaryChapter-'+key;
    return '<article id="'+chapterId+'" class="prem-box saju-summary-chapter" data-saju-summary-chapter="'+_bxCtr+'">'+
      '<div class="saju-summary-chapter__head">'+
      '<h4 class="prem-title saju-summary-chapter__title">'+title+'</h4>'+
      '<button class="saju-summary-toggle" type="button" data-bxid="'+id+'" aria-controls="'+id+'" aria-expanded="true" onclick="sbxToggle(this.dataset.bxid,this)">'+
      '접기 ▲</button>'+
      '</div>'+
      '<div id="'+id+'" class="prem-text saju-summary-chapter__body">'+body+summaryDepth(key)+summaryPersonalDepth(key)+'</div></article>';
  }
  function subHead(txt,c){return '<b class="saju-summary-subhead" style="--saju-subhead-color:'+(c||'var(--cd-accent,#b31955)')+'">'+txt+'</b>';}
  function li(items){return '<ul class="saju-summary-list">'+items.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul>';}
  function kv(k,v){return '<div class="saju-summary-kv"><b>'+k+'</b><span>'+v+'</span></div>';}

  /* ─── 데이터 맵 ─── */
  var EL_KO={wood:'목(木)',fire:'화(火)',earth:'토(土)',metal:'금(金)',water:'수(水)'};
  var ganChar={甲:'갑(甲) — 하늘을 향한 큰 나무',乙:'을(乙) — 휘어지는 덩굴',丙:'병(丙) — 뜨거운 태양',丁:'정(丁) — 은은한 촛불',戊:'무(戊) — 드넓은 대산',己:'기(己) — 비옥한 밭',庚:'경(庚) — 날선 큰 쇠',辛:'신(辛) — 정제된 보석',壬:'임(壬) — 거대한 강',癸:'계(癸) — 맑은 이슬'};
  var ganKeyword={甲:'추진력·독립·생명력',乙:'유연성·적응·감성',丙:'에너지·리더십·열정',丁:'섬세함·온기·신뢰',戊:'안정·포용·묵직함',己:'실용·세심·뒷받침',庚:'결단력·정직·직선',辛:'완벽주의·예민·예술',壬:'통찰·전략·유연',癸:'공감·깊이·지속'};
  var ganTalent={甲:'실행력, 대형 프로젝트 리딩, 스포츠·무대·사회운동',乙:'공감 마케팅, 컨설팅, 글쓰기·디자인·상담',丙:'동기부여, 무대 퍼포먼스, 미디어·방송·PR',丁:'심리치료, 교육, 수공예·뷰티·문화기획',戊:'장기 전략, 부동산·건설, 금융안정·자산관리',己:'사무·행정, 세무·회계, 의료보조·요식업·돌봄',庚:'법률·의료, 금융·보안, 기계·정밀 기술',辛:'쥬얼리·패션, 미용·예술, IT·IT보안',壬:'기획·전략, 외교·무역, 철학·심리',癸:'연구·분석, 상담·심리, 작가·시인·기록'};
  var ganWeakPoint={甲:'고집, 독선, 팀워크 부족',乙:'우유부단, 의존성, 소극적',丙:'충동, 에너지 낭비, 지속력 부족',丁:'소심, 자기비판 과도, 폭발 전 참기',戊:'변화 저항, 고집, 행동 느림',己:'자기 과소평가, 희생 과도, 결단력 부족',庚:'냉정함, 인간관계 어려움, 완고함',辛:'예민함, 비판 과민, 완벽주의 스트레스',壬:'산만함, 집중력 분산, 무계획',癸:'내성, 우유부단, 감상 과다'};
  var ganRel={甲:'동등한 파트너십, 친구형 연애',乙:'귀인 의지, 보호받는 연애',丙:'열렬하고 화끈한 연애',丁:'조용하고 진심 있는 연애',戊:'든든하고 책임감 있는 연애',己:'세심하게 챙기는 연애',庚:'정직하고 솔직한 연애',辛:'감각적이고 세련된 연애',壬:'지적이고 자유로운 연애',癸:'섬세하고 감성적인 연애'};

  // 십성별 재물 패턴
  var tsMoneyPattern={
    '비견':'수입은 안정적이나 고집으로 사업 손실 위험. 독립 창업이 직장보다 유리하고, 공동 투자는 피하세요.',
    '겁재':'큰 돈이 들어오나 도박·투기·연대보증으로 무너지기 쉽습니다. 반드시 강제저축 구조를 만드세요.',
    '식신':'노력한 만큼 꼭 돌아오는 성실형 재물. 하고 싶은 일로 먹고사는 구조가 가장 이상적입니다.',
    '상관':'아이디어와 창의력으로 수익을 냅니다. 충동 지출이 재물 손실의 가장 큰 구멍입니다.',
    '편재':'기회형 재물 — 보일 때 과감히 잡아야 합니다. 분산 투자가 맞으며 고정 자산 비중을 높이세요.',
    '정재':'성실하게 모아 지키는 재물. 안정적이지만 리스크를 완전 회피하면 큰 기회를 놓칩니다.',
    '편관':'명예를 통해 재물이 따라옵니다. 리더 역할을 맡을수록 수입이 올라가는 구조입니다.',
    '정관':'공직·대기업·전문직에서 안정적 수입. 부업보다는 본업 집중 전략이 효율적입니다.',
    '편인':'아이디어·특허·콘텐츠로 수익화가 유리합니다. 조급해하지 말고 긴 호흡으로 가세요.',
    '정인':'꾸준한 월급형 재물. 부동산·임대·교육 분야에서 안정적으로 자산을 키울 수 있습니다.'
  };

  // 십성별 재물 패턴 (영냥이 톤)
  var tsMoneyPatternNeo={
    '비견':'수입 자체는 안정적인데, 고집 때문에 사업을 크게 흔들 수도 있는 유형이야. 독립 창업이 직장보다 맞을 수 있고, 공동 투자는 한 발 물러서서 봐.',
    '겁재':'큰 돈이 들어오는 흐름은 있어. 근데 투기·도박·연대보증으로 한꺼번에 샐 수도 있거든. 강제저축 구조부터 만들어 봐, 이건 미루지 않는 게 좋아.',
    '식신':'노력한 만큼 돌아오는 성실형이야. 좋아하는 일로 먹고사는 구조를 만드는 게 너한테 제일 잘 맞는 길이지.',
    '상관':'아이디어로 돈 버는 재주는 있는데, 충동 지출이 문제거든. 재물이 새는 구멍 1순위가 바로 거기야. 사기 전에 하루만 묵혀 봐.',
    '편재':'기회형이야. 보일 때 안 잡으면 그냥 지나갈 수도 있어. 분산 투자하고, 고정 자산 비중을 조금 높여 봐.',
    '정재':'성실하게 모아서 지키는 타입이야. 안정적인 건 좋은데, 위험을 아예 안 지면 큰 기회도 같이 놓칠 수 있어.',
    '편관':'명예를 따라 재물이 오는 구조야. 리더 역할을 맡을수록 수입이 올라갈 수 있으니까, 들어오면 피하지 말고 맡아 봐.',
    '정관':'공직·대기업·전문직에서 안정적인 편이야. 부업 기웃대기보다 본업에 집중하는 게 너한테 더 효율적이지.',
    '편인':'아이디어·특허·콘텐츠 쪽이 유리해. 조급해하지 마, 원래 긴 호흡으로 가는 사주거든.',
    '정인':'꾸준한 월급형이야. 부동산·임대·교육 쪽이면 안정적으로 자산을 키울 수 있어.'
  };

  // 십성별 인간관계 패턴
  var tsRelPattern={
    '비견':'경쟁자이자 동료. 나와 비슷한 사람이 가장 편하지만 독립심 때문에 갈등도 잦습니다.',
    '겁재':'카리스마로 사람을 모으나, 주변 사람에게 에너지를 뺏길 수 있습니다. 선 긋기 연습이 필요합니다.',
    '식신':'퍼주는 것에 익숙해 이용당할 수 있습니다. 베풀되 경계를 세우는 지혜가 필요합니다.',
    '상관':'언변으로 인기를 얻지만 적도 만들기 쉽습니다. 말의 부드러움이 관계의 핵심 열쇠입니다.',
    '편재':'넓게 사귀지만 깊이가 얕을 수 있습니다. 핵심 인맥 3~5명에게 집중 투자하세요.',
    '정재':'진지하고 신뢰 있는 관계를 선호합니다. 처음에는 경계가 강하지만 한번 마음을 열면 깊습니다.',
    '편관':'존경받지 못하면 관계가 깨집니다. 권위보다 공감으로 사람을 이끄는 법을 배우세요.',
    '정관':'원칙과 예의를 중시합니다. 불성실한 사람과는 자연히 멀어지는 경향이 있습니다.',
    '편인':'혼자 있는 것이 편하고 소수 정예 관계를 선호합니다. 먼저 다가가는 노력이 삶을 풍요롭게 합니다.',
    '정인':'귀인 복이 있어 좋은 스승·후원자를 만납니다. 받은 만큼 내려주는 베풂의 순환을 만드세요.'
  };

  // 십성별 인간관계 패턴 (영냥이 톤)
  var tsRelPatternNeo={
    '비견':'경쟁자이면서 동료야. 너랑 비슷한 사람이 제일 편한데, 독립심 때문에 부딪히는 일도 잦을 수 있어. 그것도 네 기질의 한 면이지.',
    '겁재':'카리스마로 사람은 잘 모으는데, 주변한테 에너지를 뺏길 수도 있어. 선 긋는 연습을 조금씩 해 봐.',
    '식신':'퍼주는 게 습관이라 이용당하기 쉬울 수 있어. 베풀되 경계는 세워 봐, 그게 진짜 배려거든.',
    '상관':'말솜씨로 인기는 얻는데 적도 그만큼 생길 수 있어. 말을 부드럽게 하는 게 관계의 핵심 열쇠거든.',
    '편재':'넓게 사귀는데 깊이는 얕을 수 있어. 핵심 인맥 3~5명한테 마음을 더 써 봐.',
    '정재':'진지하고 믿을 수 있는 관계를 좋아해. 처음엔 경계가 세지만 한번 열리면 깊어지지.',
    '편관':'존중받지 못한다고 느끼면 관계가 그냥 끝나 버릴 수 있어. 권위 말고 공감으로 이끄는 법을 익혀 봐.',
    '정관':'원칙·예의를 중요하게 여기는 타입이야. 불성실한 사람은 알아서 멀어지니까 너무 걱정하지 않아도 돼.',
    '편인':'혼자가 편하고 소수정예 관계를 좋아해. 먼저 한 걸음 다가가는 것, 그것만 해도 삶이 훨씬 풍요로워질 거야.',
    '정인':'귀인 복이 있어서 좋은 스승·후원자를 만나기 쉬워. 받은 만큼 내려줘 봐, 그게 복이 도는 순환이야.'
  };

  // 십성별 시간대 최적 에너지
  var tsPeakTime={
    '비견':'이른 아침(5~8시) 혼자만의 루틴 설정, 독립 작업',
    '겁재':'경쟁자가 쉴 때 — 야간(22~1시) 집중 작업',
    '식신':'점심 전후(10~14시) 감각이 살아있는 창작·소통',
    '상관':'오후 늦은 시간(15~20시) 브레인스토밍·발표',
    '편재':'오전(9~12시) 빠른 판단과 네트워킹',
    '정재':'오전 집중 작업 후 오후 마감 체크',
    '편관':'위기·마감 순간에 집중력 극대화',
    '정관':'규칙적인 시간대 반복 루틴',
    '편인':'새벽(3~6시) 영감과 직관이 활성화',
    '정인':'오전 학습, 저녁 복습 루틴이 이상적'
  };

  // 재물운 수호 법칙
  var elMoneyAdvice={
    wood:'동쪽 방향·초록 계열 정리, 나무 화분을 책상 왼쪽에. 도장(인장)에 신경 쓰고 사인·계약서 꼼꼼히.',
    fire:'남쪽 방향, 붉은 소품 하나. 지갑은 붉은색 계열이 유리. 인맥으로 들어오는 기회를 놓치지 마세요.',
    earth:'노란·황금 계열 지갑, 북동쪽 방향 정리. 부동산·실물 자산 비중을 높이세요.',
    metal:'서쪽 방향·흰색·금속 소품. 지갑을 자주 정리하고 동전은 지갑에 보관하지 마세요.',
    water:'북쪽 방향·파란색 계열. 흐르는 물 이미지(분수, 수족관) 인테리어. 저축 자동이체 필수.'
  };

  // 재물운 수호 법칙 (영냥이 톤)
  var elMoneyAdviceNeo={
    wood:'동쪽 방향·초록 계열로 정리하고, 나무 화분은 책상 왼쪽에 둬 봐. 도장 관리랑 사인·계약서는 꼼꼼히 봐, 이건 대충 넘기지 않는 게 좋아.',
    fire:'남쪽 방향에 붉은 소품 하나면 충분해. 지갑도 붉은색 계열이 잘 맞고. 인맥으로 들어오는 기회는 흘려보내지 마.',
    earth:'노랑·황금 계열 지갑을 쓰고, 북동쪽을 정리해 봐. 부동산·실물 자산 비중을 높이는 게 이 사주엔 잘 맞아.',
    metal:'서쪽 방향·흰색·금속 소품을 챙겨 봐. 지갑은 자주 정리하고, 동전은 지갑에 넣어두지 마.',
    water:'북쪽 방향·파란색 계열이 좋고, 흐르는 물 이미지(분수·수족관) 인테리어도 도움이 돼. 저축 자동이체는 꼭 걸어 둬.'
  };

  // 귀인 유형
  var guiinByDom={
    wood:'창의적이고 추진력 있는 선배나 멘토. 나무처럼 성장을 돕는 교육·문화계 인물.',
    fire:'열정적인 리더나 PR 전문가. 당신을 세상에 알려주는 화(火) 에너지의 인물.',
    earth:'든든한 현실 조언을 주는 연장자. 부동산·금融 분야 인맥이 자산을 지켜줍니다.',
    metal:'날카로운 조언과 정확한 피드백을 주는 법률·의료·기술 분야 전문가.',
    water:'깊은 통찰을 나눠주는 학자나 철학자, 상담가. 조용히 당신의 깊은 면을 알아봐 주는 인물.'
  };

  // 귀인 유형 (영냥이 톤)
  var guiinByDomNeo={
    wood:'창의적이고 추진력 있는 선배나 멘토 타입이야. 교육·문화계 사람이 네 성장을 도와줄 수 있어.',
    fire:'열정적인 리더나 PR 전문가 쪽이야. 화(火) 에너지를 가진 사람이 너를 세상에 알려 줄 수 있지.',
    earth:'현실 조언을 똑 부러지게 해 주는 연장자야. 부동산·금융 쪽 인맥이 네 자산을 지켜 줄 수 있고.',
    metal:'날카로운 조언·정확한 피드백을 주는 법률·의료·기술 분야 전문가야. 듣기 불편해도 너한텐 약이 될 수 있어.',
    water:'깊은 통찰을 나눠 주는 학자나 철학자, 상담가 타입이야. 조용히 네 깊은 면을 알아봐 주는 사람이지.'
  };
  // 문장 중간에 끼우는 귀인 명사구. 완결문인 guiinByDomNeo와 역할을 섞지 않는다.
  var guiinNounByDomNeo={
    wood:'창의적이고 추진력 있는 교육·문화계 선배나 멘토',
    fire:'열정적인 리더나 PR 전문가',
    earth:'현실 조언이 분명한 부동산·금융 분야 연장자',
    metal:'정확한 피드백을 주는 법률·의료·기술 분야 전문가',
    water:'깊은 통찰을 나누는 학자·철학자·상담가'
  };

  // 인생 전략 요약
  var lifeStrategyByTs={
    '비견':'1조 전략 — 독립, 전문성, 브랜딩. 나만의 분야에서 최고가 되는 것이 유일한 성공 공식입니다.',
    '겁재':'경쟁 우위 전략 — 남들이 쉴 때 다음 수를 준비하세요. 단, 도박·보증은 절대 금지.',
    '식신':'콘텐츠 복지 전략 — 내가 좋아하는 일로 수익 구조를 만드세요. 음식·교육·돌봄 분야가 유리.',
    '상관':'혁신가 전략 — 기존 틀을 깨는 아이디어로 승부하세요. 단, 표현의 타이밍과 강도를 조절하세요.',
    '편재':'기회 포착 전략 — 정보 수집과 빠른 판단이 핵심. 해외·다양성·네트워크에서 기회가 옵니다.',
    '정재':'복리 전략 — 작은 것을 오래 꾸준히 쌓으세요. 신뢰와 성실함이 당신의 최대 자산입니다.',
    '편관':'리더십 전략 — 위기 때 능력이 빛납니다. 책임있는 역할을 맡을수록 운이 열립니다.',
    '정관':'명예 전략 — 평판과 신뢰가 당신의 운입니다. 원칙을 지키되 결코 융통성을 잃지 마세요.',
    '편인':'통찰 전략 — 남들이 보지 못한 길을 먼저 보고 가세요. 특허·저작권·콘텐츠에 투자하세요.',
    '정인':'수용 전략 — 배움은 당신의 평생 자산입니다. 좋은 스승을 찾아 배우고, 그것을 나눠주세요.'
  };

  // 인생 전략 요약 (영냥이 톤)
  var lifeStrategyByTsNeo={
    '비견':'혼자 서는 길 — 독립, 전문성, 브랜딩이야. 네 분야에서 최고가 되는 것, 그게 너한테 제일 잘 맞는 성공 공식이야.',
    '겁재':'앞서 준비하는 길 — 남들 쉴 때 다음 수를 준비해 봐. 도박·보증은 멀리 두고, 이건 타협하지 않는 게 좋아.',
    '식신':'좋아하는 걸 키우는 길 — 좋아하는 일로 수익 구조를 만들어 봐. 음식·교육·돌봄 쪽이 유리해.',
    '상관':'틀을 깨는 길 — 새로운 아이디어로 승부해 봐. 다만 표현의 타이밍·강도는 조금 조절하고.',
    '편재':'기회를 잡는 길 — 정보 수집·빠른 판단이 핵심이야. 해외·다양성·네트워크에서 기회가 올 수 있어.',
    '정재':'쌓아 가는 길 — 작은 걸 오래 꾸준히 쌓아 봐. 신뢰·성실함이 네 최대 자산인 거, 너도 알잖아.',
    '편관':'이끄는 길 — 위기 때 진가가 나와. 책임 있는 역할을 맡을수록 운이 열릴 수 있어.',
    '정관':'평판의 길 — 평판·신뢰가 곧 네 운이야. 원칙은 지키되 융통성까지 잃진 마.',
    '편인':'멀리 보는 길 — 남들이 못 보는 길을 먼저 보고 가 봐. 특허·저작권·콘텐츠에 투자해 보는 것도 좋아.',
    '정인':'배우고 나누는 길 — 배움이 네 평생 자산이야. 좋은 스승을 찾아 배우고, 받은 만큼 나눠 봐.'
  };

  var html='<div class="saju-summary-report">'+
    '<nav class="saju-summary-nav" aria-label="라이트 사주 풀이 목차">'+
    '<a href="#sajuSummaryChapter-chongpyeong">기질과 계절</a>'+
    '<a href="#sajuSummaryChapter-ohaeng">오행과 십성</a>'+
    '<a href="#sajuSummaryChapter-seonggyeok">성격과 관계</a>'+
    (_isNeoSaju?'<a href="#sajuSummaryChapter-jeollyak">앞으로의 길</a>':'<a href="#sajuSummaryChapter-jeollyak">현실 전략</a>')+
    '<!--saju-ext--><a href="#sajuSummaryChapter-olhae">올해·내년 처방</a><!--/saju-ext-->'+
    '</nav>';

  /* ───────────────────────────────
     1. 사주 총평 & 일간 분석
  ─────────────────────────────── */
  html+=box('chongpyeong','🌿 ① 나의 사주 총평 — 일간(日干) '+dg+' 풀이',
    subHead('일간 근본 기운','#2e7d32')+
    kv('일간','<b>'+dg+' ('+dayMaster+')</b> — '+(ganChar[dg]||dg))+
    kv('핵심 키워드',ganKeyword[dg]||'추진력·독립')+
    kv('천생 재능',ganTalent[dg]||'다방면에서 두각')+
    kv('약점 포인트',ganWeakPoint[dg]||'균형 조율 필요')+
    kv('연애 스타일',ganRel[dg]||'진심 있는 연애')+
    '<br><div style="background:rgba(255,255,255,.6);border-radius:8px;padding:10px;font-size:.85rem;line-height:1.78;color:#333">'+
    (_isNeoSaju
      ?'자연으로 치면 너는 <b>\''+dayNames[dayMaster]+'\'</b> 같은 사람이야. 그렇게 태어난 거고, 그게 네 출발점이지.<br>'+
       '<b>'+EL_KO[dayMaster]+'</b> 에너지가 네 기본값이고, 이걸로 세상을 받아들이고 반응하지. '+
       '이 기운이 너무 세지면 집착·고집·과잉으로 드러나고, 너무 없으면 자신감 부족·우유부단으로 드러날 수 있어. '+
       '결국 균형이 관건인데, 알면서도 잘 안 되는 게 사람이니까 천천히 맞춰 가 봐.'
      :'당신은 자연으로 치면 <b>\''+dayNames[dayMaster]+'\'</b>과 같습니다. '+
       '오행 중 <b>'+EL_KO[dayMaster]+'</b> 에너지를 주 기반으로 삼아, 세상을 인식하고 반응합니다. '+
       '이 기운이 지나치게 강하면 집착·고집·과잉으로, 너무 약하면 자신감 부족·우유부단으로 나타납니다. '+
       '적절한 균형이 삶 전체의 여유를 만듭니다.')+'</div>',
    '#4caf50','rgba(232,245,233,.7)');

  /* ───────────────────────────────
     2. 조후 & 억부 & 종격
  ─────────────────────────────── */
  html+=box('johu','🌡️ ② 조후(調候) 판정 — 계절 에너지 분석',
    '<span class="johu-badge '+johu.badgeCls+'">'+johu.badgeTxt+'</span><br>'+
    johu.advice+'<br><br>'+
    subHead('조후(調候)란 무엇인가','#1565C0')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    (_isNeoSaju?'조후는 사주의 계절적 균형을 보는 명리학의 핵심 이론이야. 태어난 달이 정하는 계절에 따라 사주 전체의 차갑고 따뜻한 균형이 달라지거든. 여름 사주(巳·午·未월 출생)는 이미 화(火) 기운이 넘치니까 차고 적신 수(水)와 금(金) 기운이 용신이 돼. 반대로 겨울 사주(亥·子·丑월 출생)는 수(水)가 강해서 화(火)와 목(木)으로 온기를 보태 줘야 해. 조후가 맞는 운이 들어오면 삶의 전반적인 컨디션이 좋아지고 일·건강·관계가 한결 유연해질 수 있어. 조후가 어긋난 운에는 의욕이 떨어지거나 몸이 먼저 신호를 보낼 수도 있어. 그러니까 대운을 읽을 때는 조후부터 꼭 챙겨 봐.</div>':'조후는 사주의 계절적 균형을 분석하는 명리학의 핵심 이론입니다. 생월(태어난 달)이 결정하는 계절에 따라 사주 전체의 차갑고 따뜻함의 균형이 달라집니다. 여름 사주(巳·午·未월 출생)는 이미 화(火) 기운이 과잉이므로 차고 적신 수(水)와 금(金) 기운이 용신이 됩니다. 반대로 겨울 사주(亥·子·丑월 출생)는 수(水)가 강해 화(火)와 목(木)으로 온기를 보강해야 합니다. 조후가 맞는 운이 들어올 때 삶의 전반적인 컨디션이 좋아지고 사업·건강·대인관계가 유연해집니다. 조후가 어긋난 운에는 의욕 저하나 건강 이상으로 나타날 수 있으니, 대운 해석 시 반드시 조후를 먼저 체크해야 합니다.</div>')+
    '<br>'+subHead('실생활 적용법','#1976D2')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    (_isNeoSaju
      ?'조후 조절은 거창한 게 아니라 일상의 작은 선택 문제야. 네 조후에 맞는 색상·음식·방향·활동을 의식해서 고르면 에너지 균형이 잡히고 흐름이 부드러워지거든. 아래 개운 파트에 구체적인 방법이 있으니까 한번 읽어 봐.'
      :'조후 조절은 거창한 변화가 아니라 일상의 작은 선택에서 시작합니다. 자신의 조후에 맞는 색상, 음식, 방향, 활동을 의식적으로 선택하면 에너지 균형이 잡히고 삶의 흐름이 부드러워집니다. 아래 개운 파트에서 구체적인 조후 맞춤 개운법을 확인하세요.')+'</div>',
    '#2196F3','rgba(227,242,253,.7)');

  html+=box('eokbu','⚖️ ③ 억부(抑扶) & 종격(從格) 심층 분석',
    (jg&&jg.isJong
      ?'<b>'+jg.name+'</b> — '+EL_KO[jg.dominant]+' 기운 '+jg.pct+'% 지배<br>'+
       '<div style="margin-top:6px;font-size:.85rem;line-height:1.78">'+
       (_isNeoSaju
         ?'이 사주는 기운 하나가 전체를 압도하는 <b>종격 사주</b>야. '+
          '억부(신강/신약)를 따지기보다, '+EL_KO[jg.dominant]+' 에너지를 돕는 운이 오면 길(吉), 거스르면 흉(凶)으로 보거든. 단순해서 오히려 편한 사주지.<br><br>'+
          '✓ 종격이란 — 오행 중 하나가 75% 이상을 차지하면, 그 기운에 순응하는 게 답이라는 뜻이야. 억지로 거스르면 너만 힘들어질 수 있어.'
         :'이 사주는 하나의 기운이 사주 전체를 압도하는 <b>종격 사주</b>입니다. '+
          '억부(신강/신약) 원칙을 우선적으로 배제하고, '+EL_KO[jg.dominant]+' 에너지를 돕는 운이 길(吉)하고, 거스르는 운은 흉(凶)합니다.<br><br>'+
          '✓ 종격이란? — 오행 중 한 가지가 75% 이상을 차지할 때, 그 기운에 순응하는 것이 원칙입니다. 역행은 오히려 파국을 부릅니다.')+
       '</div>'
      :pw
        ?'<span class="power-badge '+(pw.isStrong?'pb-strong':'pb-weak')+'" style="font-size:.78rem;padding:3px 10px">'+(pw.isStrong?'🔥 신강':'💧 신약')+'</span>'+
         '<div style="margin-top:8px;font-size:.85rem;line-height:1.78">억부 점수: <b>'+pw.score+'점</b><br><br>'+
         (_isNeoSaju
           ?(pw.isStrong
             ?'<b>신강</b>은 일간이 원국에서 도움을 탄탄하게 받는다는 뜻이야. 에너지가 넘치니까 설기(洩氣)·재(財)·관(官)으로 빠져나가는 운이 올 때 성취가 터질 수 있지.<br>'+
              '✓ 용신: '+pw.yongshin.map(function(e){return EL_KO[e];}).join(', ')+'<br>'+
              '✓ 기신: '+pw.kijishin.map(function(e){return EL_KO[e];}).join(', ')
             :'<b>신약</b>은 일간이 외부 압박에 비해 자체 에너지가 부족하다는 뜻이지, 나쁘다는 게 아니야. 비겁(비견·겁재)이나 인성(편인·정인) 운이 올 때 자존감이랑 귀인이 같이 올 수 있어. 기다리면 너한테도 차례가 와.<br>'+
              '✓ 용신: '+pw.yongshin.map(function(e){return EL_KO[e];}).join(', ')+'<br>'+
              '✓ 기신: '+pw.kijishin.map(function(e){return EL_KO[e];}).join(', '))
           :(pw.isStrong
             ?'<b>신강</b>이란 일간이 원국에서 도움받는 기운이 탄탄한 사주입니다. 에너지가 넘쳐 설기(洩氣)·재(財)·관(官)으로 빠져나가는 운이 올 때 사회적 성취가 폭발합니다.<br>'+
              '✓ 용신: '+pw.yongshin.map(function(e){return EL_KO[e];}).join(', ')+'<br>'+
              '✓ 기신: '+pw.kijishin.map(function(e){return EL_KO[e];}).join(', ')
             :'<b>신약</b>이란 일간이 외부 압박에 비해 자체 에너지가 부족한 사주입니다. 비겁(비견·겁재)이나 인성(편인·정인)이 오는 운에서 자존감과 귀인이 동시에 옵니다.<br>'+
              '✓ 용신: '+pw.yongshin.map(function(e){return EL_KO[e];}).join(', ')+'<br>'+
              '✓ 기신: '+pw.kijishin.map(function(e){return EL_KO[e];}).join(', ')))+
         '</div>'
        :(_isNeoSaju?'억부 계산 중이거나 데이터가 부족해. 조금 있다가 다시 봐 줘.':'억부 계산 중 또는 사주 데이터가 부족합니다.')),
    '#9C27B0','rgba(243,229,245,.7)');

  /* ───────────────────────────────
     2-1. 월령(절기 기준) 해석
  ─────────────────────────────── */
  if(monthCommand&&monthReading){
    html+=box('wollyeong','🌙 월령 해석 — 태어난 계절이 내 사주에 주는 힘',
      subHead('월령 한눈에 보기','#3f51b5')+
      kv('월령',monthCommand.monthName+' ('+monthCommand.branch+')')+
      kv('절기 구간',monthCommand.startTerm+' ~ '+monthCommand.endTerm)+
      kv('계절',monthCommand.season)+
      kv('왕한 오행',monthCommand.dominantElement+' · '+monthCommand.seasonPower)+
      (monthCommand.fallbackUsed?(_isNeoSaju?'<div style="margin-top:4px;font-size:.8rem;color:#6b7280">정확한 절기 시각 데이터가 확인되지 않아서, 계산된 월주 지지를 기준으로 월령을 보완해서 읽었어.</div>':'<div style="margin-top:4px;font-size:.8rem;color:#6b7280">정확한 절기 시각 데이터가 확인되지 않아, 계산된 월주 지지를 기준으로 월령을 보완 해석합니다.</div>'):'')+
      '<br>'+subHead('핵심 해석','#5c6bc0')+
      '<div style="font-size:.84rem;line-height:1.85">'+monthReading.seasonalEnergy+'</div>'+
      '<br>'+subHead('왜 이렇게 느껴지나','#3949ab')+
      '<div style="font-size:.84rem;line-height:1.85">'+monthReading.relationToDayMaster+'</div>'+
      '<br>'+subHead('실전 영향 요약','#3949ab')+
      '<div style="font-size:.84rem;line-height:1.8"><ul style="margin:6px 0 0 18px;padding:0">'+
      '<li><b>신강/신약 보조:</b> '+monthReading.strengthAnalysis+'</li>'+
      '<li><b>오행 밸런스:</b> '+monthReading.elementBalanceImpact+'</li>'+
      '<li><b>직업:</b> '+monthReading.careerImpact+'</li>'+
      '<li><b>재물:</b> '+monthReading.wealthImpact+'</li>'+
      '<li><b>연애/관계:</b> '+monthReading.loveImpact+'</li>'+
      '</ul></div>'+
      '<br>'+subHead('생활 적용 팁','#5c6bc0')+
      '<div style="font-size:.84rem;line-height:1.85">'+monthReading.advice+'</div>'+
      '<div style="margin-top:8px;padding:9px 10px;border-radius:8px;border-left:3px solid #8b5cf6;background:rgba(129,140,248,.12);font-size:.82rem;line-height:1.72;color:#4c1d95"><b>주의:</b> '+monthReading.caution+'</div>',
      '#5c6bc0','rgba(232,236,255,.78)');
  }else if(monthReading){
    html+=box('wollyeong','🌙 월령 해석 — 태어난 계절이 내 사주에 주는 힘',
      '<div style="font-size:.84rem;line-height:1.85">'+monthReading.summary+'</div>'+
      '<br>'+subHead('보완 안내','#5c6bc0')+
      '<div style="font-size:.84rem;line-height:1.85">'+monthReading.caution+'</div>',
      '#5c6bc0','rgba(232,236,255,.78)');
  }

  html+='<div class="saju-summary-illustration"><img src="/images/saju/'+(_isNeoSaju?'yeongnyangi-320.webp':'yeoni-clue-320.webp')+'" width="140" height="140" alt="'+(_isNeoSaju?'영냥이':'')+'" loading="lazy" decoding="async"></div>';

  /* ───────────────────────────────
     3. 오행 분포
  ─────────────────────────────── */
  var ratioBar='<div style="display:grid;gap:4px;margin-top:8px">';
  ['wood','fire','earth','metal','water'].forEach(function(el){
    var pct=Math.round(natal.ratios[el]||0);
    var color={wood:'#4CAF50',fire:'#FF5722',earth:'#FF9800',metal:'#78909C',water:'#2196F3'}[el]||'#999';
    ratioBar+='<div style="display:flex;align-items:center;gap:6px;font-size:.81rem">'+
      '<span style="min-width:28px;text-align:right;color:#666">'+EL_K[el]+'</span>'+
      '<div style="flex:1;height:8px;background:#f0f0f0;border-radius:4px">'+
        '<div style="width:'+Math.min(pct,100)+'%;height:100%;background:'+color+';border-radius:4px;transition:width .5s"></div>'+
      '</div>'+
      '<span style="min-width:30px;font-weight:700;color:'+color+'">'+pct+'%</span>'+
    '</div>';
  });
  ratioBar+='</div>';

  html+=box('ohaeng','🧭 ④ 오행 분포 & 균형 진단',
    (_isNeoSaju
      ?(natal.counts[domE]>=5?'🔴 <b>'+EL_K[domE]+' 기운이 심하게 편중</b>돼 있어. 균형 조절은 미루지 않는 게 좋아.'
        :natal.counts[domE]>=4?'🟠 <b>'+EL_K[domE]+' 기운이 강하게 쏠려</b> 있네. 적극적으로 손봐 주는 게 좋은 수준이야.'
        :natal.counts[domE]>=3?'🟡 <b>'+EL_K[domE]+' 기운이 조금 강하게 자리</b>잡았어. 신경은 써야 하지만, 큰일은 아니야.'
        :'🟢 오행이 고르게 분포돼 있어. 딱히 손댈 데 없는 사주네.')
      :(natal.counts[domE]>=5?'🔴 <b>'+EL_K[domE]+' 기운이 매우 강하게 편중</b>되어 있어요! 반드시 균형 조절이 필요합니다.'
        :natal.counts[domE]>=4?'🟠 <b>'+EL_K[domE]+' 기운이 강하게 쏠려</b> 있습니다. 적극적인 균형 조절을 권합니다.'
        :natal.counts[domE]>=3?'🟡 <b>'+EL_K[domE]+' 기운이 다소 강하게 자리</b>잡고 있습니다. 의식적인 균형이 도움이 됩니다.'
        :'🟢 오행이 비교적 고르게 분포되어 있습니다. 균형잡힌 사주입니다.'))+
    ratioBar+
    '<div style="margin-top:10px;font-size:.84rem;line-height:1.78">'+
    kv('오행 비율',ratStr)+
    kv('개운 핵심',(_isNeoSaju
        ?'강한 <b>'+EL_K[domE]+'</b> 기운이 폭주하지 않게, <b>'+EL_K[tips.controller]+'</b>(극)이랑 <b>'+EL_K[tips.drain]+'</b>(설기)으로 눌러 주면 돼. 어렵지 않아.'
        :'강한 <b>'+EL_K[domE]+'</b> 기운이 폭주하지 않게, '+
          '<b>'+EL_K[tips.controller]+'</b>(극)과 <b>'+EL_K[tips.drain]+'</b>(설기)으로 눌러주세요.'))+
    '</div>',
    '#FF9800','rgba(255,243,224,.7)');

  /* ───────────────────────────────
     4. 십성(十星) 심층 분석
  ─────────────────────────────── */
  var tsFullList=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];});
  var tsRankHtml='<div style="display:grid;gap:6px;margin:8px 0">';
  tsFullList.slice(0,5).forEach(function(t,i){
    var info=TS_DB[t]||{emoji:'⭐',desc:'',meaning:''};
    var pct=Math.round((cnt[t]/(tsFullList.length||1))*100);
    tsRankHtml+='<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,.6)">'+
      '<span style="font-size:1.1rem">'+info.emoji+'</span>'+
      '<span style="font-weight:700;min-width:32px;font-size:.85rem">'+t+'</span>'+
      '<span style="font-size:.8rem;color:#555;flex:1">'+info.meaning+'</span>'+
      '<span style="font-weight:800;color:#7c3aed;font-size:.85rem">'+cnt[t]+'개</span>'+
    '</div>';
  });
  tsRankHtml+='</div>';

  html+=box('sipseong','⭐ ⑤ 십성(十星) 심층 분석 — 내 삶의 에너지 구성',
    subHead('보유 십성 랭킹','#5c35c8')+
    tsRankHtml+
    '<br>'+subHead('주 십성 '+dominant+' — 성향 상세','#7c3aed')+
    '<div style="font-size:.85rem;line-height:1.78;margin-top:4px">'+
    kv('본질',deep.nature)+
    kv('진로 적성',deep.career)+
    kv('연애 스타일',deep.love)+
    kv('주의사항',deep.advice||(_isNeoSaju?'환경을 봐 가면서 유연하게 적응해 봐':'주어진 환경에 유연하게 적응하세요'))+
    kv('재물 패턴',(_isNeoSaju?tsMoneyPatternNeo:tsMoneyPattern)[dominant]||(_isNeoSaju?'성실함, 그게 네 재물의 기반이거든':'성실함이 재물의 기반입니다'))+
    kv('인간관계',(_isNeoSaju?tsRelPatternNeo:tsRelPattern)[dominant]||(_isNeoSaju?'신뢰 기반 관계부터 챙겨 봐':'신뢰 기반 관계를 우선하세요'))+
    kv('에너지 피크',tsPeakTime[dominant]||(_isNeoSaju?'아침 루틴이 하루를 좌우해':'아침 루틴이 하루를 좌우합니다'))+
    kv('인생 전략',(_isNeoSaju?lifeStrategyByTsNeo:lifeStrategyByTs)[dominant]||(_isNeoSaju?'강점에 집중하는 것, 그게 답이야':'강점에 집중하세요'))+
    '</div>',
    '#7c3aed','rgba(237,233,254,.7)');

  /* ───────────────────────────────
     5. 성격·기질 심층 분석
  ─────────────────────────────── */
  var personalityByGan={
    甲:'표면적으로는 느긋해 보이지만, 한 번 결심하면 포기를 모릅니다. 경쟁 상황에서 진가가 드러나며 리더 자리를 자연스럽게 차지합니다. 고집스러울 수 있으나 그것이 오히려 큰 성공의 원동력이 됩니다.',
    乙:'눈치가 빠르고 환경 적응력이 탁월합니다. 부드럽게 스며들어 상대방을 내 편으로 만드는 재주가 있습니다. 갈등을 정면으로 맞서기보다 우회하는 전략을 선호합니다.',
    丙:'에너지가 넘쳐흐르고 주변을 환하게 밝히는 존재감이 있습니다. 말이 많고 솔직하며 감정 표현이 풍부합니다. 지루함을 못 견디고 새로운 자극을 끊임없이 찾습니다.',
    丁:'겉으로는 조용하지만 내면에 뜨거운 열정이 있습니다. 감수성이 풍부하고 배려심이 깊습니다. 한 번 상처받으면 오랫동안 기억하는 편입니다.',
    戊:'흔들리지 않는 내면의 안정감이 있습니다. 묵직하고 신뢰감을 주며 약속과 책임을 중시합니다. 변화에 느리게 반응하지만 일단 행동하면 멈추지 않습니다.',
    己:'세밀하고 실용적인 눈이 있습니다. 남을 뒤에서 지원하고 도우면서 실질적인 결과를 만들어내는 타입입니다. 자신의 공로를 드러내지 않지만 핵심 역할을 합니다.',
    庚:'직선적이고 결단력이 강합니다. 불합리한 것을 보면 참지 못하고 직접 해결하려 합니다. 냉정해 보이지만 의리와 책임감이 강한 사람입니다.',
    辛:'예리하고 미적 감각이 뛰어납니다. 완벽주의 성향으로 자신과 타인에게 높은 기준을 적용합니다. 표면적으로는 차가워 보여도 속으로는 매우 감성적입니다.',
    壬:'시야가 넓고 전략적으로 사고합니다. 감정을 잘 드러내지 않지만 내면은 깊습니다. 한 가지 일보다 여러 프로젝트를 동시에 처리하는 능력이 있습니다.',
    癸:'공감 능력이 뛰어나고 섬세합니다. 다른 사람의 감정을 빠르게 포착하고 적절히 반응합니다. 내향적으로 보이지만 일대일 관계에서는 매우 깊고 따뜻합니다.'
  };

  var personalityByGanNeo={
    甲:'느긋해 보여도, 한 번 결심하면 잘 안 굽히는 너야. 경쟁이 붙으면 그때부터 진짜 실력이 나오고, 리더 자리도 자연스럽게 맡게 되지. 고집스럽다는 소리 들을 수도 있는데, 그게 네 성공 엔진이기도 하니까 인정하고 가 봐.',
    乙:'눈치 하나는 기가 막혀. 부드럽게 스며들어서 사람을 네 편으로 만드는 재주, 그거 재능 맞아. 다만 정면 승부를 피하고 우회만 하는 버릇은, 자신이 없을 때 나오는 걸 수도 있어.',
    丙:'에너지가 넘치고 주변을 다 밝히는 존재감이 있어. 말 많고 솔직한 건 좋은데, 지루한 걸 못 참아서 자극만 쫓아다니는 건 슬슬 짚어 볼 때야.',
    丁:'조용해 보여도 속은 뜨거운 너야. 감수성 풍부하고 배려심 깊은 건 장점인데, 한 번 상처받으면 두고두고 곱씹는 버릇은 조금씩 내려놔 봐.',
    戊:'흔들리지 않는 안정감, 그건 분명한 강점이야. 신뢰감 있고 책임감 있는 것도 인정. 다만 변화에 너무 느리게 반응하면 그게 발목을 잡을 수도 있어.',
    己:'세밀하고 실용적인 눈으로 남을 뒤에서 잘 받쳐 줘. 근데 네 공로를 너무 안 드러내서 저평가받는 건, 그거 손해야.',
    庚:'직선적이고 결단력이 강한 건 맞아. 불합리한 걸 못 참고 바로 해결하려는 것도 좋고. 다만 그 냉정함이 사람한테 상처가 될 수 있다는 걸, 너만 모를 수도 있어.',
    辛:'예리하고 미적 감각이 뛰어난 거 인정. 완벽주의라 너한테도 남한테도 높은 기준을 들이대는데, 겉은 차가워 보여도 속은 여린 거 나는 알아.',
    壬:'시야가 넓고 멀리 내다보며 생각하는 거, 그건 분명 재능이야. 감정을 잘 안 드러내서 속내를 알기 어렵다는 소리 듣지? 그건 계산이라기보다 너를 지키는 방어일 수도 있어.',
    癸:'공감 능력이 좋고 섬세한 너야. 남의 감정을 빨리 캐치하고 반응도 잘하고. 내향적으로 보여도 일대일에서는 꽤 깊고 따뜻하다는 거, 너도 알잖아.'
  };

  var charBoxDetail={
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

  var charBoxDetailNeo={
    甲:'갑목(甲木)은 하늘을 향해 뻗는 거대한 나무야. 목표가 정해지면 흔들림 없이 밀어붙이는 의지, 그건 네 큰 무기지. 근데 그 강인함이 고집·독선으로 새면 팀워크가 무너질 수 있거든. "내가 맞아야 한다"는 강박부터 조금 내려놔 봐. 독립심이 넘쳐서 도움 요청도 스스로 막는 편인데, 진짜 강한 사람은 협력할 줄 아는 사람이야. 경쟁 상황에서 진가가 나오고, 편한 환경에만 있으면 오히려 무뎌지는 타입이니까 가끔은 일부러 도전할 자리에 너를 세워 봐.',
    乙:'을목(乙木)은 흔들려도 끊어지지 않는 덩굴이야. 공감 능력·적응력으로 어디서든 핵심 역할을 하는 건 재능인데, 정면 돌파를 피하고 우회만 하다 보니 소극적·우유부단하다는 소리를 들을 수도 있어. 결정 앞에서는 남 눈치를 조금 덜 봐도 돼. 사람을 편하게 만드는 재주 때문에 감정 에너지를 너무 쓰는 것도 문제고. 네 경계선부터 세우는 게 오래 가는 방법이야.',
    丙:'병화(丙火)는 뜨거운 태양이야. 에너지 넘치고 어디서든 중심이 되는 존재감, 그건 인정해. 근데 감정 기복이 크고 충동적으로 결정하기 쉬운 게 약점일 수 있어. 시작은 화끈한데 지속력이 부족할 수 있거든. 한 곳에 오래 집중하는 연습을 해 봐. 결실 직전에 흥미를 잃고 손 놓는 패턴, 너도 느껴 봤을 수 있어. 태양도 밤엔 쉬어. 너 자신도 좀 챙겨.',
    丁:'정화(丁火)는 은은한 촛불이야. 조용해 보여도 속은 뜨겁고 섬세하지. 신뢰를 쌓은 관계에선 누구보다 충실한데, 상처받으면 오래 못 잊고 감정을 누르다 결국 터지는 패턴이 반복될 수 있어. 그때그때 조금씩 표현해 봐. 남의 평가에 너무 예민해서 자기비판이 심해지면, 그게 번아웃으로 가는 지름길이야. 기준은 네 안에 둬.',
    戊:'무토(戊土)는 드넓은 큰 산이야. 뭐든 받아들이는 포용력, 흔들리지 않는 안정감 — 이게 최대 자산인 건 맞는데, 변화에 너무 느리게 반응해서 기회를 놓칠 수 있어. 일단 움직이면 멈추지 않는 끈기는 있으니까, 시작하는 타이밍만 앞당겨 봐. 겁내지 말고 새로운 걸 정기적으로 하나씩 시도해 봐.',
    己:'기토(己土)는 비옥한 밭이야. 세밀하고 실용적으로 남을 뒤에서 받쳐 주는 건 분명한 능력인데, 네 공로를 안 드러내서 저평가받는 건 손해야. 남을 챙기다 너 자신을 잃어버리는 게 제일 큰 위험이야. 네가 먼저 괜찮아야 남도 제대로 도울 수 있어. 결단이 늦어질 땐 데드라인부터 스스로 정해 봐.',
    庚:'경금(庚金)은 날 선 큰 쇠야. 직선적이고 결단력이 강한 거, 불합리한 걸 못 참고 바로 해결하는 거 다 강점이지. 근데 그 솔직함이 관계를 어렵게 만들 수 있거든. 날이 너무 서면 주변이 다칠 수 있어. 말에 부드러움을 조금 더해 봐. 위기 때 진가를 발휘하는 사람이니까, 완고함이 문제 해결을 막을 땐 한 발 물러서서 유연하게 가 봐.',
    辛:'신금(辛金)은 정제된 보석이야. 예리하고 미적 감각이 뛰어난 건 인정. 완벽주의로 너 스스로를 옥죄는 게 문제인데, 70% 완성도에서도 세상에 내놓는 용기가 필요해. 겉은 차가워도 속은 여린 거 나는 알아. 비판에 너무 아파하지 말고, 피드백은 성장 데이터로 받아 봐.',
    壬:'임수(壬水)는 거대한 강물이야. 막히면 돌아가는 유연함과 끈질김을 둘 다 가진 건 강점인데, 그 넓음 때문에 에너지가 흩어져서 깊이가 덜 생길 수 있어. 한 가지에 집중하는 시간을 일부러 만들어 봐. 속내가 잘 안 보인다는 소리를 듣지만 내면은 깊으니까, 주변 기대에 너무 맞추다 네 방향을 잃지 않게 챙겨.',
    癸:'계수(癸水)는 맑은 이슬이야. 공감 능력이 탁월하고 일대일 관계에서 깊고 따뜻한 거 인정해. 다만 우유부단함, 지나친 내성이 가장 큰 약점일 수 있어. 결정을 미루다 기회를 놓치지 않게, 직관을 믿고 움직이는 용기를 조금 내 봐. 꾸준함이 네 무기인 건 맞으니까, 생각한 다음엔 한 걸음 실천을 꼭 붙여 봐.'
  };

  html+=box('seonggyeok',(_isNeoSaju?'🐱 ⑥ 성격·기질 심층 분석 — 영냥이가 본 너':'🌸 ⑥ 성격·기질 심층 분석 — 나를 이해하는 시간'),
    subHead('핵심 성향','#c2185b')+
    '<div style="font-size:.85rem;line-height:1.85;margin-top:6px">'+
    ((_isNeoSaju?personalityByGanNeo:personalityByGan)[dg]||deep.nature)+'</div>'+
    '<br>'+subHead('심층 기질 분석','#c2185b')+
    '<div style="font-size:.84rem;line-height:1.85;margin-top:4px">'+
    ((_isNeoSaju?charBoxDetailNeo:charBoxDetail)[dg]||deep.nature)+'</div>'+
    '<br>'+subHead('보완이 필요한 부분','#d32f2f')+
    '<div style="font-size:.84rem;line-height:1.78;color:#b71c1c;margin-top:4px">'+
    (ganWeakPoint[dg]||(_isNeoSaju?'균형을 늘 체크해 봐':'균형을 항상 체크하세요'))+
    (_isNeoSaju
      ?'<br><br>타고난 한계가 아니야. 알아차리고 다듬으면 그게 오히려 강점의 다른 면이 돼. '+
       '네 <b>'+dominant+'</b> 에너지를 살려서 위 보완점을 꾸준히 손보면, 사주의 잠재력을 한껏 끌어낼 수 있어. 어렵지 않아.'
      :'<br><br>이 약점은 타고난 한계가 아닙니다. 인식하고 의식적으로 다듬으면 오히려 강점의 다른 면이 됩니다. '+
       '당신의 <b>'+dominant+'</b> 에너지와 함께 위의 보완점을 꾸준히 작업해가면, '+
       '사주가 가진 잠재력의 전부를 끌어낼 수 있습니다.')+'</div>',
    '#e91e63','rgba(253,232,241,.7)');

  /* ───────────────────────────────
     6. 진로 & 적성 상세
  ─────────────────────────────── */
  var careerByEl={
    wood:['교육·강사·교수','출판·작가·저술','환경·조경·산림','의료·한방·재활','문화·예술 기획'],
    fire:['방송·미디어·PR','연예·공연·스포츠','IT·스타트업·플랫폼','요식·서비스·호텔','광고·마케팅·브랜딩'],
    earth:['부동산·건설·인테리어','금융·보험·투자','농업·식품·유통','행정·공무·국제기관','상담·교육 지원'],
    metal:['법률·검찰·경찰·군인','의료·치과·외과','금융·회계·세무','IT보안·정밀기술·항공','귀금속·패션·디자인'],
    water:['연구·분석·데이터','외교·무역·관광','심리·상담·철학','글쓰기·시·문학','음악·영화·순수예술']
  };

  html+=box('jinro','💼 ⑦ 진로 적성 & 성공 천기 — 운명이 알려주는 직업 지도',
    subHead('천성 맞춤 분야 ('+EL_KO[dayMaster]+' 에너지 기반)','#1565C0')+
    li(careerByEl[dayMaster]||[])+
    subHead('십성 '+dominant+' 기반 추천','#0d47a1')+
    '<div style="font-size:.84rem;margin-top:4px;line-height:1.75">'+deep.career+'</div>'+
    '<br>'+subHead('성공의 핵심 원칙','#1976D2')+
    '<div style="font-size:.84rem;margin-top:4px;line-height:1.75">'+
    (_isNeoSaju
      ?'네 가장 큰 강점인 <b>'+tsInfo.meaning+'</b>, 그걸 살릴 때 누구보다 빛나. '+(lifeStrategyByTsNeo[dominant]||lifeStrategyByTs[dominant])
      :'당신의 가장 큰 강점인 <b>'+tsInfo.meaning+'</b>을(를) 살릴 때 다른 누구보다 빛납니다. '+lifeStrategyByTs[dominant])+'</div>'+
    '<br>'+subHead('진로 선택 시 핵심 체크리스트','#0d47a1')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    (_isNeoSaju
      ?'"돈이 되나"만 보지 말고 다음 세 가지를 확인해 봐. 첫째, 이 일을 할 때 시간 가는 줄 모르나? 그게 천직 신호야. 둘째, 여기서 내 약점이 강점으로 뒤집히나? 섬세함도 환경에 따라 단점이 되기도, 장점이 되기도 해. 셋째, 5년 뒤 이 분야 전문가가 됐을 때 세상이 필요로 하는 사람인가? 재능이랑 세상의 필요가 만나는 지점, 그게 진짜 커리어 방향이야. <b>'+dominant+'</b> 에너지를 가진 너는 자율성·전문성이 보장되는 환경에서 쑥 자라는 타입이니까, 그런 자리를 먼저 찾아 봐.'
      :'단순히 "돈이 되는가"가 아니라 다음 세 가지를 반드시 확인하세요. 첫째, 이 일을 할 때 시간 가는 줄 모르는가? 의식 없이 열중하는 것이 천직의 신호입니다. 둘째, 이 분야에서 나의 약점이 강점으로 전환되는가? 예를 들어 섬세함이 단점인 환경이 있고, 장점인 환경이 있습니다. 셋째, 5년 후 이 분야의 전문가가 되었을 때 사회적으로 필요한 인재인가? 자신의 재능과 세상의 필요가 교차하는 지점이 가장 이상적인 커리어 방향입니다. <b>'+dominant+'</b> 에너지를 가진 당신은 특히 자율성과 전문성이 보장되는 환경에서 폭발적인 성장을 보입니다.')+'</div>',
    '#1565C0','rgba(227,242,253,.7)');

  /* ───────────────────────────────
     7. 연애·결혼 심층 분석
  ─────────────────────────────── */
  var loveByEl={
    wood:'성장형 파트너십을 원합니다. 서로 발전하고 응원하는 관계가 가장 이상적입니다. 구속하거나 성장을 막는 상대와는 관계가 오래가기 힘듭니다.',
    fire:'열정적이고 화끈한 연애를 합니다. 첫 눈에 반하는 경우가 많고 감정 기복이 있습니다. 권태기를 방지하기 위해 지속적인 새로운 자극이 필요합니다.',
    earth:'안정과 신뢰를 최우선으로 합니다. 천천히 감정을 쌓아가고, 한 번 정이 들면 쉽게 헤어지지 않습니다. 가정적이고 든든한 파트너가 맞습니다.',
    metal:'원칙과 기준이 분명한 연애를 합니다. 상대방에게 높은 기준을 요구하고, 자신도 그에 맞게 행동합니다. 감정 표현이 서툴러 오해를 살 수 있습니다.',
    water:'감성적이고 깊이 있는 관계를 원합니다. 영혼의 교감을 중시하고 표면적인 것보다 내면의 연결을 봅니다. 이별의 상처가 오래가는 편입니다.'
  };
  var loveByElNeo={
    wood:'너는 함께 크는 관계를 원해. 서로 발전하고 응원해 주는 사이가 제일 잘 맞아. 구속하거나 성장을 막는 상대와는 오래가기 어려울 수 있어.',
    fire:'연애가 뜨겁고 화끈한 편이야. 첫눈에 끌리는 경우가 많고 감정 기복도 있는 편이지. 권태기가 오지 않게 새로운 자극을 꾸준히 만들어 봐.',
    earth:'안정과 신뢰가 1순위야. 감정을 천천히 쌓고, 한번 정이 들면 쉽게 놓지 않거든. 가정적이고 든든한 파트너가 너랑 잘 맞아.',
    metal:'원칙과 기준이 분명한 연애를 해. 상대에게 기대하는 기준이 높고, 너도 그만큼 지키려고 하지. 감정 표현이 서툴러서 오해를 살 수도 있어.',
    water:'감성적이고 깊이 있는 관계를 원해. 겉모습보다 마음이 통하는지를 먼저 보거든. 이별의 상처가 오래가는 편이니까 너 자신도 잘 돌봐 줘.'
  };

  html+=box('yeonae','💘 ⑧ 연애·결혼 심층 풀이',
    subHead('사랑의 패턴','#ad1457')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+deep.love+'<br><br>'+(_isNeoSaju?loveByElNeo:loveByEl)[dayMaster||'earth']+'</div>'+
    '<br>'+subHead('인연의 신호 — 어떤 사람과 맞는가','#c2185b')+
    li(_isNeoSaju
      ?['오행으로 보면 '+(dayMaster==='wood'?'화(火) 에너지의 따뜻한 상대':dayMaster==='fire'?'목(木) 에너지의 추진력 있는 상대':dayMaster==='earth'?'화(火) 에너지의 열정적인 상대':dayMaster==='metal'?'토(土) 에너지의 안정적인 상대':'금(金) 에너지의 단단한 상대')+'랑 잘 어울려.',
        '십성 '+dominant+' 사주라서 '+ganRel[dg||'甲']+' 쪽에 끌리는 편이야.',
        '삶의 방향과 가치관이 맞고, 네 약점까지 이해해 주는 사람 — 그런 파트너가 너한테 귀인 같은 배우자야.']
      :['오행상 '+(dayMaster==='wood'?'화(火) 에너지의 따뜻한 상대':dayMaster==='fire'?'목(木) 에너지의 추진력 있는 상대':dayMaster==='earth'?'화(火) 에너지의 열정적인 상대':dayMaster==='metal'?'토(土) 에너지의 안정적인 상대':'금(金) 에너지의 단단한 상대')+'와 잘 어울립니다.',
      '십성 '+dominant+' 사주에서는 '+ganRel[dg||'甲']+'를 추구합니다.',
      '삶의 방향과 가치관이 맞는 사람, 나의 약점을 이해해주는 파트너가 귀인 배우자입니다.'])+
    '<br>'+subHead('결혼 후 행복의 열쇠','#880e4f')+
    '<div style="font-size:.84rem;line-height:1.78">'+(_isNeoSaju
      ?'서로 사생활·성장 공간을 존중해 주고, 명절/기념일/일상의 작은 감사 표현을 꾸준히 하는 것. 그게 제일 안정적인 관계 유지법이야. 별거 없어.'
      :'서로의 사생활과 성장 공간을 존중해주고, 명절/기념일/일상의 작은 감사 표현을 꾸준히 이어가는 것이 가장 안정적인 관계 유지 방법입니다.')+'</div>'+
    '<br>'+subHead((_isNeoSaju?'관계에서 꼭 기억할 것':'관계에서 반드시 기억할 것'),'#ad1457')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    (_isNeoSaju
      ?'사랑은 감정이 아니라 선택이고 실천이야. 궁합이 좋아도 둘 다 관계에 계속 마음을 쓰지 않으면 흔들릴 수 있거든. <b>'+dominant+'</b> 에너지를 가진 너는 너만의 관계 방식이 있는데, 상대가 알아듣게 분명히 표현하는 게 갈등 예방의 핵심이야. "말 안 해도 알아주겠지"는 오해를 만드는 지름길이고. 갈등이 생기면 피하지 말고 바로 대화로 풀어 보는 습관을 만들어 봐. 사랑 언어(칭찬·스킨십·봉사·선물·시간 공유)도 너랑 상대가 다를 수 있다는 거, 미리 알아 두면 편해.'
      :'사랑은 감정이 아니라 선택이자 실천입니다. 아무리 좋은 궁합이어도, 두 사람 모두 관계에 지속적으로 투자하지 않으면 무너집니다. '+dominant+' 에너지를 가진 당신은 특유의 관계 방식이 있는데, 상대방이 그 방식을 이해하도록 명확하게 표현하는 것이 갈등 예방의 핵심입니다. 말 안 해도 알아줄 것이라는 기대는 오해를 낳습니다. 갈등이 생겼을 때 피하지 않고 적극적으로 대화하고 해소하는 패턴을 만들어가는 것이 장기적으로 행복한 관계의 기초입니다. 자신의 사랑 언어(칭찬, 스킨십, 봉사, 선물, 시간 공유 중)와 상대방의 사랑 언어가 다를 수 있음을 인식하고 맞춰가세요.')+'</div>',
    '#e91e63','rgba(252,228,236,.7)');

  /* ───────────────────────────────
     7-2. 신살(神殺) 분석
  ─────────────────────────────── */
  var _sinsalItems = [];
  var _ssDay = p.d.g + p.d.j;
  var _ssJArr = [p.y.j, p.m.j, p.d.j, p.h.j];
  var _ssJLbl = ['년지','월지','일지','시지'];
  // 도화살: 子午卯酉
  var _ssTao = ['子','午','卯','酉'];
  var _ssTaoPos = _ssJArr.reduce(function(a,b,i){if(b&&_ssTao.indexOf(b)>=0)a.push(_ssJLbl[i]);return a;},[]);
  if (_ssTaoPos.length > 0) _sinsalItems.push({ icon:'🌸', name:'도화살(桃花殺)', pos:_ssTaoPos.join(', '), desc:_isNeoSaju?('대인 매력과 주목도를 높여 주는 별이야. '+(_ssTaoPos.indexOf('일지')>=0?'<b>일지 도화</b>는 네 표현력이 강하게 드러나고, ':'')+(_ssTaoPos.indexOf('월지')>=0?'<b>월지 도화</b>는 사회 활동에서 존재감이 커지고, ':'')+(_ssTaoPos.indexOf('년지')>=0?'<b>년지 도화</b>는 바깥에서 알려지는 폭이 넓어지기 쉬워. ':'')+'주목받을수록 관계와 평판을 지키는 기준도 같이 세워 둬.'):('대인 매력과 주목도를 높이는 별입니다. '+(_ssTaoPos.indexOf('일지')>=0?'<b>일지 도화</b>는 개인 표현력이 강하게 드러나고, ':'')+(_ssTaoPos.indexOf('월지')>=0?'<b>월지 도화</b>는 사회 활동에서 존재감이 커지며, ':'')+(_ssTaoPos.indexOf('년지')>=0?'<b>년지 도화</b>는 대외 인지도 확장으로 나타나기 쉽습니다. ':'')+'주목도가 높아질수록 관계·평판 관리 기준을 함께 세우는 것이 중요합니다.') });
  // 홍염살
  var _ssHong = ['甲午','丙寅','丁未','戊辰','庚戌','辛酉','壬子'];
  if (_ssHong.indexOf(_ssDay) >= 0) _sinsalItems.push({ icon:'💋', name:'홍염살(紅艶殺)', pos:'일주 '+_ssDay, desc:_isNeoSaju?('감정 표현의 강도와 카리스마를 높여 주는 별이야. <b>'+_ssDay+' 일주 홍염살</b>은 사람들 사이에서 눈에 띄는 존재감으로 나타나. 표현이 과열되면 오해가 커질 수도 있으니까 말의 세기와 타이밍을 조절해 봐.'):('감정 표현의 강도와 카리스마를 높이는 별입니다. <b>'+_ssDay+' 일주 홍염살</b>은 대인관계에서 집중도 높은 존재감으로 나타나며, 표현이 과열되면 오해가 커질 수 있으니 말의 강도와 타이밍 조절이 중요합니다.') });
  // 역마살
  var _ssYem = ['寅','申','巳','亥'];
  var _ssYemPos = _ssJArr.reduce(function(a,b,i){if(b&&_ssYem.indexOf(b)>=0)a.push(_ssJLbl[i]);return a;},[]);
  if (_ssYemPos.length > 0) _sinsalItems.push({ icon:'🌪️', name:'역마살(驛馬殺)', pos:_ssYemPos.join(', '), desc:_isNeoSaju?('이동·변화·확장의 별이야. <b>'+_ssYemPos.join(', ')+'에 역마</b>: 움직이고 변화할 때 운이 열리는 편이거든. 연애에서는 자유와 변화를 중요하게 여기고, 이동이 잦은 일이나 해외 활동에서 강점이 살아날 수 있어.'):('이동·변화·확장의 별. <b>'+_ssYemPos.join(', ')+'에 역마</b>: 움직이고 변화할 때 운이 열립니다. 연애에서는 자유와 변화를 중시하며, 이동이 잦은 직업이나 해외 활동에서 강점을 발휘합니다.') });
  // 화개살
  var _ssHwa = ['辰','戌','丑','未'];
  var _ssHwaPos = _ssJArr.reduce(function(a,b,i){if(b&&_ssHwa.indexOf(b)>=0)a.push(_ssJLbl[i]);return a;},[]);
  if (_ssHwaPos.length > 0) _sinsalItems.push({ icon:'🔮', name:'화개살(華蓋殺)', pos:_ssHwaPos.join(', '), desc:_isNeoSaju?('예술·영성·고독의 별이야. <b>'+_ssHwaPos.join(', ')+'에 화개</b>: 예술적 감각과 깊은 내면 세계를 갖고 있어. 종교·철학·예술 쪽에 끌리기 쉽고, 깊이 있는 대화를 중요하게 여기지.'):('예술·영성·고독의 별. <b>'+_ssHwaPos.join(', ')+'에 화개</b>: 예술적 재능과 깊은 내면 세계를 가집니다. 종교·철학·예술 분야에 끌리며, 영적 교감과 깊이 있는 대화를 중시합니다.') });
  // 괴강살
  var _ssGoe = ['庚辰','庚戌','壬辰','壬戌','戊戌'];
  if (_ssGoe.indexOf(_ssDay) >= 0) _sinsalItems.push({ icon:'⚔️', name:'괴강살(魁罡殺)', pos:'일주 '+_ssDay, desc:_isNeoSaju?('강한 리더십과 꺾이지 않는 의지의 별이야. <b>'+_ssDay+' 일주 괴강살</b>: 역경 앞에서도 쉽게 물러서지 않는 강렬한 에너지를 타고났어. 성패가 극단적으로 갈릴 수도 있으니까, 이 힘을 어디에 쓸지 방향부터 정해 봐.'):('강인한 리더십과 불굴의 의지. <b>'+_ssDay+' 일주 괴강살</b>: 어떤 역경도 굴복하지 않는 강렬한 에너지를 타고났습니다. 성패가 극단적으로 갈릴 수 있으므로, 이 에너지를 올바른 방향으로 사용하는 것이 핵심입니다.') });
  // 간여지동
  var _ssGyn = ['甲寅','乙卯','丙午','丁巳','戊辰','戊戌','己丑','己未','庚申','辛酉','壬子','癸亥'];
  if (_ssGyn.indexOf(_ssDay) >= 0) _sinsalItems.push({ icon:'🔥', name:'간여지동(干與支同)', pos:'일주 '+_ssDay, desc:_isNeoSaju?('천간과 지지 오행이 같아서 겉과 속이 일치하는 구조야. <b>'+_ssDay+'</b>: 자아가 단단하고 주체성이 일관돼서 의지가 굳은 편이지. 고집스럽게 보일 수도 있지만, 그게 큰 성취의 원동력이 되기도 해.'):('천간과 지지 오행이 같아 겉과 속이 일치합니다. <b>'+_ssDay+'</b>: 강인한 자아와 일관된 주체성을 가지며 의지가 굳습니다. 고집스럽게 보일 수 있지만 이것이 큰 성취의 원동력이 됩니다.') });
  // 양인살
  var _ssYang = {'甲':'卯','丙':'午','戊':'午','庚':'酉','壬':'子'};
  if (p.d.g && _ssYang[p.d.g] && p.d.j === _ssYang[p.d.g]) _sinsalItems.push({ icon:'⚡', name:'양인살(羊刃殺)', pos:'일주 '+_ssDay, desc:_isNeoSaju?('날카롭고 강렬한 에너지의 별이야. <b>'+_ssDay+' 양인</b>: 집중력과 실행력이 아주 강해서 한번 목표를 정하면 끝까지 밀어붙이는 편이지. 이 힘을 절제하고 방향을 잘 잡아 주는 게 성공의 열쇠가 될 수 있어.'):('날카롭고 강렬한 에너지의 별. <b>'+_ssDay+' 양인</b>: 집중력과 실행력이 극강하며 한 번 목표를 정하면 끝까지 밀어붙입니다. 강한 에너지를 절제와 방향 설정으로 관리하는 것이 성공의 열쇠입니다.') });
  // 천을귀인
  var _ssUl = {'甲':['丑','未'],'戊':['丑','未'],'庚':['丑','未'],'乙':['子','申'],'己':['子','申'],'丙':['亥','酉'],'丁':['亥','酉'],'辛':['寅','午'],'壬':['巳','卯'],'癸':['巳','卯']};
  if (p.d.g && _ssUl[p.d.g]) {
    var _ssUlSet = _ssUl[p.d.g];
    var _ssUlPos = _ssJArr.reduce(function(a,b,i){if(b&&_ssUlSet.indexOf(b)>=0)a.push(_ssJLbl[i]);return a;},[]);
    if (_ssUlPos.length > 0) _sinsalItems.push({ icon:'✨', name:'천을귀인(天乙貴人)', pos:_ssUlPos.join(', '), desc:_isNeoSaju?('위기 때 귀인이 나타나는 길성(吉星)이야. <b>'+_ssUlPos.join(', ')+'에 천을귀인</b>: 가장 어려운 순간에 누군가의 도움을 받는 복이 있어. 사람들과 신뢰를 먼저 쌓아 두면 귀인은 자연스럽게 나타날 수 있어.'):('위기에 귀인이 나타나는 길성(吉星). <b>'+_ssUlPos.join(', ')+'에 천을귀인</b>: 인생의 가장 어려운 순간에 귀인의 도움을 받는 복이 있습니다. 대인관계에서 신뢰를 먼저 쌓으면 귀인이 자연스럽게 나타납니다.') });
  }
  var _sinsalBodyHtml = '';
  if (_sinsalItems.length > 0) {
    _sinsalBodyHtml = _sinsalItems.map(function(s){
      return '<div style="margin:6px 0;padding:10px 12px;background:rgba(255,255,255,.6);border-radius:8px;border-left:3px solid #9c27b0">'+
        '<div style="font-weight:700;font-size:.87rem;color:#6a1b9a;margin-bottom:4px">'+s.icon+' '+s.name+'<span style="font-weight:400;font-size:.79rem;color:#999;margin-left:6px">['+s.pos+']</span></div>'+
        '<div style="font-size:.83rem;line-height:1.75;color:#444">'+s.desc+'</div>'+
      '</div>';
    }).join('');
  } else {
    _sinsalBodyHtml = '<div style="font-size:.84rem;line-height:1.78;color:#666">'+(_isNeoSaju
      ?'주요 신살 해당 없음 — 신살 없이도 순수한 오행 매력으로 승부하는 타입이야. 용신 오행이랑 일간 기질 자체가 이미 네 강점이라는 뜻이지.'
      :'주요 신살 해당 없음 — 신살에 의존하지 않는 순수한 오행 매력의 소유자입니다. 용신 오행과 일간의 기질 자체가 당신의 매력과 강점을 만들어냅니다.')+'</div>';
  }
  html+=box('sinsal','💫 ⑨ 신살(神殺) 분석 — 타고난 특수 에너지',
    subHead('내 사주의 신살 목록','#6a1b9a')+
    _sinsalBodyHtml+
    '<br>'+subHead('신살이란?','#7b1fa2')+
    '<div style="font-size:.84rem;line-height:1.85;margin-top:4px">'+(_isNeoSaju
      ?'신살(神殺)은 사주 지지(地支) 조합에서 나오는 특수 에너지 패턴이야. 길신(吉神)은 능력을 키우고 귀인도 끌어오는데, 살(殺)은 특정 영역에 강렬한 에너지를 주되 과하면 부작용이 따라올 수 있어. 타고난 운명이 정해졌다는 뜻이 아니라, 그 에너지를 어떻게 쓰느냐가 관건이거든. 강점이 될지 약점이 될지는 결국 너한테 달려 있어.'
      :'신살(神殺)은 사주 지지(地支) 조합에서 발생하는 특수한 에너지 패턴입니다. 길신(吉神)은 능력을 강화하고 귀인 인연을 끌어들이며, 살(殺)은 특정 영역에서 강렬한 에너지를 부여하되 과하면 부작용이 따릅니다. 선천적 운명이 아니라 그 에너지를 어떻게 활용하느냐에 따라 강점이 될 수도, 약점이 될 수도 있습니다.')+'</div>',
    '#9C27B0','rgba(243,229,245,.7)');

  html+='<div class="saju-summary-illustration"><img src="/images/saju/'+(_isNeoSaju?'yeongnyangi-320.webp':'yeoni-moonlight-reading.webp')+'" width="140" height="'+(_isNeoSaju?'140':'93')+'" alt="'+(_isNeoSaju?'영냥이':'')+'" loading="lazy" decoding="async"></div>';

  /* ───────────────────────────────
     8. 건강 & 소울 푸드
  ─────────────────────────────── */
  var stressSign={
    wood:'목이 뻣뻣하거나 눈이 쉽게 피로해지고 분노가 잦아지면 간·담낭 에너지 고갈 신호입니다.',
    fire:'가슴이 두근거리거나 더위를 타고 불면이 심해지면 심장·소장 에너지 과부하입니다.',
    earth:'소화가 안 되거나 식욕이 없고 생각이 너무 많아지면 비·위 에너지 과부하입니다.',
    metal:'피부가 건조해지고 기침이 잦아지며 슬픔·우울이 커지면 폐·대장 에너지 부족 신호입니다.',
    water:'허리와 무릎이 약해지고 이명이 생기거나 두려움이 커지면 신장·방광 에너지 고갈입니다.'
  };
  var stressSignNeo={
    wood:'목이 뻣뻣하거나 눈이 쉽게 피로해지고 화가 잦아지면, 간·담낭 에너지가 바닥나고 있다는 신호일 수 있어.',
    fire:'가슴이 두근거리거나 더위를 많이 타고 잠이 잘 안 오면, 심장·소장 에너지가 과부하일 수 있어.',
    earth:'소화가 안 되거나 입맛이 없고 생각이 너무 많아지면, 비·위 에너지가 과부하일 수 있어.',
    metal:'피부가 건조해지고 기침이 잦아지고 슬픔이나 우울이 커지면, 폐·대장 에너지가 부족하다는 신호일 수 있어.',
    water:'허리와 무릎이 약해지고 이명이 생기거나 두려움이 커지면, 신장·방광 에너지가 바닥나고 있을 수 있어.'
  };

  html+=box('geongang','🥗 ⑨ 건강·소울 푸드 & 스트레스 신호 분석',
    subHead('타고난 건강 약점','#2e7d32')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    kv('취약 부위',health.weak)+
    kv('추천 음식',health.food)+
    kv('건강 조언',health.advice)+
    kv('스트레스 신호',(_isNeoSaju?stressSignNeo:stressSign)[dayMaster]||(_isNeoSaju?'체력 저하 신호, 놓치지 마':'체력 저하 신호를 놓치지 마세요'))+
    '</div>'+
    '<br>'+subHead('오행에 맞는 운동 추천','#388e3c')+
    li(dayMaster==='wood'?['산책·등산·스트레칭','요가·필라테스','댄스·리듬 운동']:
       dayMaster==='fire'?['고강도 인터벌 트레이닝','수영·사이클','팀 스포츠']:
       dayMaster==='earth'?['걷기·태극권','헬스·웨이트','명상·호흡']:
       dayMaster==='metal'?['복싱·무술·격투기','달리기·수영','근력 운동']:
       ['수영·아쿠아로빅','명상·요가','스트레칭·폼롤러']),
    '#4caf50','rgba(232,245,233,.7)');

  /* ───────────────────────────────
     9. 재물운 & 투자 전략
  ─────────────────────────────── */
  html+=box('jaemul',(_isNeoSaju?'💰 ⑩ 재물운 — 돈이 들고 나는 네 패턴':'💰 ⑩ 재물운 & 투자 전략 상세'),
    subHead('재물 패턴','#e65100')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    (_isNeoSaju?tsMoneyPatternNeo:tsMoneyPattern)[dominant]+'</div>'+
    '<br>'+subHead('오행 기반 재물 개운법','#f57c00')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    ((_isNeoSaju?elMoneyAdviceNeo:elMoneyAdvice)[domE]||(_isNeoSaju?'재물이 들어오는 방향·색상, 가볍게라도 활용해 봐':'재물이 들어오는 방향과 색상을 활용하세요'))+'</div>'+
    '<br>'+subHead('투자 원칙','#ef6c00')+
    li(dominant==='식신'||dominant==='정재'?
       ['안정형 — 적금·부동산·배당주 우선','월 소득의 20% 이상 자동이체 저축','급등주·고위험 단기투자 지양']:
       dominant==='편재'||dominant==='겁재'?
       ['공격형 — 분산 투자, 빠른 손절 원칙','레버리지는 총 자산의 10% 이내로 제한','연대보증·구두 계약 절대 금지']:
       ['균형형 — 안전자산 60%, 변동자산 40%','분기별 포트폴리오 점검','장기 복리 투자가 가장 효율적'])+
    '<br>'+subHead('재물 상승을 위한 사주 기반 행동 원칙','#bf360c')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    (_isNeoSaju
      ?'재물운은 운만으로 정해지지 않아. 사주 기운이 재물로 이어지는 구조는 있는데, 그걸 실제 돈으로 바꾸는 건 결국 행동이거든. 네 <b>'+dominant+'</b> 에너지가 잘 발현될 때 돈도 따라와. 반대로 억눌리거나 엉뚱한 데 쓰이면 재물이 샐 수 있어. 버는 것만큼 나가는 것도 점검해 봐. 재물운의 단기 흐름은 세운(그 해 운)에 따라 다르니까, 큰 투자는 흐름이 좋은 해에 모아서 해 봐. 매년 1월에 그 해 재물운을 체크하고 계획을 세우는 습관, 그거 하나면 자산이 꾸준히 클 수 있어.'
      :'재물운은 운만으로 결정되지 않습니다. 사주의 기운이 재물로 연결되는 구조는 있지만, 그 구조를 실제 돈으로 전환하는 것은 행동입니다. 당신의 <b>'+dominant+'</b> 에너지가 가장 잘 발현될 때 돈도 자연스럽게 따라옵니다. 반대로 에너지가 억눌리거나 잘못된 방향에 쓰일 때 재물이 새어나갑니다. 수입을 늘리는 것만큼 지출의 패턴을 점검하는 것이 중요합니다. 재물운의 단기 흐름은 세운(그 해 운)에 따라 달라지니, 큰 투자 결정은 좋은 운의 해에 집중하세요. 매년 1월에 그 해의 재물운을 확인하고 전략을 수립하는 습관을 들이면 자산이 꾸준히 성장합니다.')+'</div>',
    '#FF6F00','rgba(255,243,224,.7)');

  /* ───────────────────────────────
     10. 귀인 & 인간관계
  ─────────────────────────────── */
  html+=box('guiin','🤝 ⑪ 귀인(貴人) & 인간관계 지도',
    subHead('귀인의 유형','#1565C0')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    ((_isNeoSaju?guiinByDomNeo:guiinByDom)[domE]||(_isNeoSaju?'네 성장을 돕는 멘토·공동체, 그런 사람들이야':'당신의 성장을 돕는 멘토와 공동체'))+'</div>'+
    '<br>'+subHead('인간관계 패턴','#1976D2')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    (_isNeoSaju?tsRelPatternNeo:tsRelPattern)[dominant]+'</div>'+
    '<br>'+subHead('관계에서 주의할 시그널','#d32f2f')+
    li(_isNeoSaju
       ?['내가 성장하는 걸 시기하고 깎아내리는 사람 — 걸러도 되는 사람이야',
         '돈·감정·시간을 계속 빨아들이는 관계 — 그건 착취에 가까워',
         '자존감이 낮아지는 환경이면 과감히 거리를 둬 봐, 미련 갖지 않아도 돼']
       :['나의 성장을 시기하거나 깎아내리는 사람',
         '돈·감정·시간을 지속적으로 착취하는 관계',
         '자존감을 낮추는 환경은 과감히 거리를 두세요'])+
    '<br>'+subHead('귀인을 만나고 지키는 법','#1565C0')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    (_isNeoSaju
      ?'귀인은 거창한 데서 오지 않아. 네가 진심을 다하는 영역에서 꾸준히 가치를 쌓으면 자연스럽게 나타나. 먼저 네가 누군가의 귀인이 되어야 귀인도 끌어당길 수 있어. <b>'+dominant+'</b> 에너지를 가진 너의 귀인 유형인 <b>'+((guiinNounByDomNeo[domE])||'성장을 돕는 멘토')+'</b>와의 만남, 의도적으로 늘려 봐. 커뮤니티·스터디·업계 행사에 꾸준히 나가면서 네 가치를 먼저 나누는 태도, 그게 제일 좋은 방법이야. 한번 만난 귀인은 정기적으로 안부를 전하면서 이어 가 봐. 안 그러면 그냥 스쳐 지나갈 수도 있거든.'
      :'귀인은 거창한 곳에서 오지 않습니다. 당신이 진심을 다하는 영역에서, 꾸준히 가치를 쌓을 때 자연스럽게 나타납니다. 먼저 당신 자신이 타인의 귀인이 되어야 귀인을 끌어당길 수 있습니다. <b>'+dominant+'</b> 에너지를 가진 당신의 귀인 유형인 <b>'+(guiinByDom[domE]||'성장을 돕는 멘토')+'</b>와의 만남을 의도적으로 늘리세요. 커뮤니티, 스터디 모임, 업계 행사 등에 꾸준히 참여하면서 자신의 가치를 먼저 나누는 태도가 귀인 인연을 만드는 가장 확실한 방법입니다. 한번 만난 귀인과의 관계는 정기적인 연락과 관심으로 유지해야 합니다.')+'</div>',
    '#1565C0','rgba(227,242,253,.7)');

  /* ───────────────────────────────
     11. 개운 테마 & 행동 루틴
  ─────────────────────────────── */
  html+=box('gaeun','🍀 ⑫ 개운 루트 상세 — '+EL_K[domE]+' 에너지 다스리기',
    '<div class="tip-grid">'+
    '<div class="tip-chip"><strong>극(눌러주기): '+EL_K[tips.controller]+'</strong>'+
    '🎨 '+tips.ctips.color+'<br>🏠 '+tips.ctips.place+'<br>🧭 '+tips.ctips.action+'<br>🍽️ '+tips.ctips.food+'</div>'+
    '<div class="tip-chip"><strong>설기(분산): '+EL_K[tips.drain]+'</strong>'+
    '🎨 '+tips.dtips.color+'<br>🏠 '+tips.dtips.place+'<br>🧭 '+tips.dtips.action+'<br>🍽️ '+tips.dtips.food+'</div>'+
    '</div>'+
    '<br>'+subHead('일상 개운 행동 루틴 7가지','#2e7d32')+
    li(_isNeoSaju
      ?['매일 아침 '+domE+'과 반대 색상의 소품('+tips.ctips.color+') 하나 챙겨 봐',
        '정리정돈은 정기적으로 — 물건이 정체되면 운도 같이 정체되기 쉽거든',
        '이름(도장·서명)을 쓰는 계약서랑 중요한 서류는 꼼꼼히 확인해 봐',
        '귀인이 있는 방향('+tips.ctips.place+'), 그 공간을 자주 써 봐',
        '식단에 '+tips.ctips.food+' 더해 봐',
        '주 2회 이상 '+tips.ctips.action+' 활동 해 봐',
        '새로운 배움(책·강의·멘토)에는 꾸준히 투자해 둬']
      :['매일 아침 '+domE+'과 반대 색상의 소품('+tips.ctips.color+') 하나 착용',
       '정기적인 정리정돈 — 물건이 정체되면 운도 정체됩니다',
       '이름(도장·서명)을 쓰는 계약서와 중요 서류 꼼꼼히 확인',
       '귀인이 있는 방향('+tips.ctips.place+') 공간 활성화',
       '식단에 '+tips.ctips.food+' 추가',
       '주 2회 이상 '+tips.ctips.action+' 활동 실천',
       '새로운 배움(책·강의·멘토)에 지속 투자']),
    '#4caf50','rgba(232,245,233,.7)');

  /* ───────────────────────────────
     12. 인생 전략 요약
  ─────────────────────────────── */
  html+=box('jeollyak',(_isNeoSaju?'🚀 ⑬ 앞으로의 길 — 영냥이의 종합 정리':'🚀 ⑬ 인생 전략 로드맵 — 연이의 종합 천기'),
    subHead('지금 당장 실천할 것','#7b1fa2')+
    li(_isNeoSaju
      ?['강점인 <b>'+dominant+'</b> 에너지, 일이랑 관계에 마음껏 써 봐',
        '약점인 <b>'+EL_K[domE]+'</b> 과잉, 의식해서 다스려 봐',
        '용신 에너지 '+((pw&&pw.yongshin)||[]).map(function(e){return EL_KO[e];}).join('·')+' 꾸준히 생활에 들여 봐',
        '귀인('+(guiinNounByDomNeo[domE]||'성장을 돕는 멘토')+')과의 인연, 일부러라도 만들어 가 봐']
      :['강점인 <b>'+dominant+'</b> 에너지를 일과 관계에 최대한 활용하세요',
        '약점인 <b>'+EL_K[domE]+'</b> 과잉을 의식적으로 다스리세요',
        '용신 에너지 '+((pw&&pw.yongshin)||[]).map(function(e){return EL_KO[e];}).join('·')+'를 생활에 꾸준히 흡수하세요',
        '귀인('+guiinByDom[domE]+')과의 인연을 의도적으로 만들어가세요'])+
    subHead((_isNeoSaju?'10년 관점으로 본 커리어 흐름':'10년 관점 커리어 전략'),'#6a1b9a')+
    '<div style="font-size:.84rem;line-height:1.78;margin-top:4px">'+
    (_isNeoSaju?lifeStrategyByTsNeo:lifeStrategyByTs)[dominant]+'</div>'+
    '<br>'+subHead('지금 당장 시작할 3가지 루틴','#7b1fa2')+
    '<div style="font-size:.84rem;line-height:1.85">'+
    (_isNeoSaju
      ?'<b>① 주간 리뷰 (매주 일요일 20분)</b>: 이번 주에 무슨 결정을 했고 결과가 어땠는지 적어 봐. <b>'+dominant+'</b> 에너지가 잘 발현된 순간, 낭비된 순간을 기록하면 패턴이 보이거든. 그럼 다음 주 행동이 달라져.<br><br>'+
       '<b>② 귀인 접점 늘리기 (월 2회)</b>: 네 성장 방향이랑 같은 사람들이 모이는 데 정기적으로 나가 봐. 귀인은 찾아다니는 게 아니라 그런 환경 안에서 자연스럽게 만나는 거야.<br><br>'+
       '<b>③ 용신 에너지 흡수 (매일)</b>: 용신 색상 소품을 지니거나, 방향에 알람을 맞추거나, 용신 음식을 식단에 넣거나 — 이런 작은 조율 하나가 에너지 균형을 지켜 줘. 어렵지 않으니까 오늘 하나만 골라 봐.'
      :'<b>① 주간 리뷰 (매주 일요일 20분)</b>: 이번 주 어떤 결정을 했고, 어떤 결과가 왔는가? <b>'+dominant+'</b> 에너지가 잘 발현된 순간과 낭비된 순간을 기록하세요. 패턴이 보이면 다음 주 행동이 달라집니다.<br><br>'+
       '<b>② 귀인 접점 늘리기 (월 2회)</b>: 당신의 성장 방향과 같은 사람들이 모이는 공간에 정기적으로 참여하세요. 귀인은 찾는 것이 아니라 환경 안에서 자연스럽게 만나는 것입니다.<br><br>'+
       '<b>③ 용신 에너지 흡수 (매일)</b>: 용신 색상의 소품을 몸에 지니거나, 방향에 알람을 맞추거나, 용신 음식을 식단에 포함하는 등 작은 일상의 조율이 에너지 균형을 유지합니다.')+'</div>',
    '#9C27B0','rgba(243,229,245,.7)');

  /* ───────────────────────────────
     12-1. 올해·내년 처방 — 세운은 대운 풀이의 연도별 세운과 같은 경로(_sajuSeunYearReading)로 읽는다
  ─────────────────────────────── */
  (function(){
    if(!BIRTH_YEAR||!CURRENT_AGE)return;
    var thisYear=Number(BIRTH_YEAR)+Number(CURRENT_AGE)-1;
    var body='';
    var prevGaeun=null;
    function godMeaning(god){return god+(TS_DB[god]?'('+TS_DB[god].meaning+')':'');}
    [thisYear,thisYear+1].forEach(function(yr,i){
      var sy;
      try{sy=_sajuSeunYearReading(yr);}catch(e){return;}
      // 영역 문구는 세운 천간 오행과 길흉으로 고른다. 두 해가 같으면 되풀이하지 않는다.
      var sameAreas=sy.gaeun===prevGaeun;
      prevGaeun=sy.gaeun;
      var dwRow=(window.G_DAEWUN||[]).find(function(row){return yr>=row.startYear&&yr<=row.endYear;});
      body+=(body?'<br>':'')+subHead((i?'내년 ':'올해 ')+yr+'년 · '+sy.yg+sy.yz+' 세운 — '+sy.ev.label,i?'#00838f':'#c62828')+
        kv('세운의 십성','천간 '+godMeaning(getTenGod(dg,sy.yg))+' · 지지 '+godMeaning(getTenGod(dg,sy.yz)))+
        (dwRow?kv('함께 흐르는 대운',dwRow.g+dwRow.j+' 대운('+dwRow.startYear+'–'+dwRow.endYear+'년)'):'')+
        (sy.ukbu?kv('억부 판단',sy.ukbu):'')+(sy.johu?kv('조후',sy.johu):'')+
        (sameAreas
          ?kv('영역별 처방',_isNeoSaju?('올해랑 같은 '+EL_K[sy.ygd.e]+' 기운의 흐름이 이어져서 연애·돈·일·관계·건강 습관 처방도 올해랑 같아. 올해 정한 습관, 그대로 이어 가 봐.'):('올해와 같은 '+EL_K[sy.ygd.e]+' 기운의 흐름이 이어져 연애·돈·일·관계·건강 습관 처방은 올해와 같습니다. 올해 정한 습관을 그대로 이어 가세요.'))
          :kv('연애',sy.gaeun.love)+kv('돈',sy.gaeun.wealth)+kv('일',sy.gaeun.career)+kv('관계',sy.gaeun.relationship)+
            kv('건강 습관',sy.gaeun.health)+kv('처방',sy.gaeun.lifestyle));
    });
    if(!body)return;
    html+='<!--saju-ext-->'+box('olhae','🗓️ ⑭ 올해·내년 처방 — '+thisYear+'·'+(thisYear+1)+'년 세운',
      '<div style="font-size:.84rem;line-height:1.78;margin-bottom:8px">'+(_isNeoSaju
        ?'올해랑 내년, 영역별로 뭘 하면 되는지만 골라 봤어. 판정은 대운 풀이의 연도별 세운과 같은 기준이야.'
        :'해마다 바뀌는 세운으로 올해와 내년을 미리 읽어 볼게요. 판정은 대운 풀이의 연도별 세운과 같은 기준이고, 연애·돈·일·관계·건강 습관마다 할 일을 정리했습니다.')+'</div>'+body,
      '#c62828','rgba(255,235,238,.7)')+'<!--/saju-ext-->';
  })();

  /* ───────────────────────────────
     13. 연이의 현실 조언 / 영냥이의 현실 체크 (NEO_MODE 분기)
  ─────────────────────────────── */
  if (_isNeoSaju) {
    html+='<div class="prem-box" style="background:var(--cd-surface-2);border-color:var(--cd-border)">'+
      '<span class="prem-title" style="border-color:var(--cd-accent);color:var(--cd-accent)">🐱 영냥이의 현실 체크 — '+(USER_NAME||'너')+'에게 해 주는 이야기</span>'+
      '<div class="prem-text">'+generateNeoFactPunch(p,pw,jg,dominant,dayMaster,domE,natal,deep)+'</div></div>';
  } else {
    html+='<div class="prem-box" style="background:linear-gradient(135deg,#E8F5E9,#F1F8E9);border-color:#A5D6A7">'+
      '<span class="prem-title" style="border-color:#4CAF50;color:#2E7D32">🍀 연이의 현실 조언 — '+(USER_NAME||'당신')+'님만을 위한 이야기</span>'+
      '<div class="prem-text">'+generateDetailedAdvice(p,pw,jg,dominant,dayMaster,domE,natal,deep)+'</div></div>';
  }

  try {
    window.__lastComprehensiveSajuReading = {
      monthCommandReading: monthReading || null,
      monthCommand: monthCommand || null
    };
  } catch (_eLastReading) {}

  html+='</div>';
  document.getElementById('summaryArea').innerHTML=html;
}
/* ─── generateDetailedAdvice: 사주 맞춤 상세 현실 조언 ─── */
function generateDetailedAdvice(p,pw,jg,dominant,dayMaster,domE,natal,deep){
  var dg=p.d.g;
  var out='';

  var ganAdvice={
    '甲':'하늘을 향해 자라는 큰 나무처럼, <b>방향만 잃지 않으면 반드시 빛을 봅니다.</b> 꾸준함이 당신의 가장 강력한 무기예요. 고집이 있다는 말은 결국 "의지가 있다"는 뜻이기도 합니다. 그 고집을 올바른 방향에만 쓰세요. 단독 행동이 동업보다 유리한 사주입니다.<br><br>갑목(甲木)의 가장 큰 함정은 자신의 방식이 유일하게 옳다는 확신이 지나쳐 주변의 소중한 피드백을 차단하는 것입니다. 나무도 바람에 흔들려야 뿌리가 더 깊이 내려갑니다. 타인의 의견에 귀를 여는 것은 약함이 아니라 전략입니다. 경쟁이 있을 때 진가가 드러나므로, 편안한 환경에만 안주하지 말고 의도적으로 자신을 도전적인 상황에 노출시키세요. 중년 이후 본격적인 결실이 시작되므로, 30대의 고생을 두려워하지 마세요. 지금 내려가는 뿌리가 미래의 거목을 만듭니다.',
    '乙':'칡넝쿨처럼 어떤 환경에서도 살아남는 유연함이 당신 안에 있어요. <b>억지로 직선으로만 나가려 하지 마세요</b> — 돌아가는 길이 때로는 더 빠른 길입니다. 주변과 조화를 이룰 때 당신의 진짜 능력이 꽃을 피웁니다.',
    '丙':'태양처럼 빛나는 당신은 <b>누군가에게 등불이 되어줄 때 가장 빛납니다.</b> 하지만 태양도 밤이 있어야 쉬듯, 자신을 돌보는 시간을 아끼지 마세요. 모든 것을 혼자 짊어지려는 버릇을 내려놓는 연습이 필요합니다.',
    '丁':'은은하게 타오르는 촛불처럼, 당신의 진심은 주변 사람들을 조용히 따뜻하게 합니다. <b>눈에 보이는 성과보다 보이지 않는 신뢰를 쌓는 것</b>이 당신의 진짜 자산입니다. 서두르지 마세요.',
    '戊':'드넓은 대산(大山)처럼 모든 것을 받아들이는 당신은 <b>잘 부서지지 않는 사람</b>입니다. 하지만 그 묵직함이 변화에 늦게 반응하는 걸림돌이 됩니다. 의도적으로 새로운 것을 시도하는 용기를 기르세요.',
    '己':'비옥한 밭이 씨앗을 키우듯, 당신은 <b>주변 사람의 잠재력을 끌어내는 능력</b>이 있습니다. 남을 너무 챙기다 정작 자신을 잃어버리는 것을 조심하세요. 당신 자신이 먼저 행복해야 남도 도울 수 있습니다.',
    '庚':'거친 원석이 갈고 닦여 보석이 되듯, <b>시련이 당신을 더 단단하게 만듭니다.</b> 다만 너무 날이 서면 주변이 상처를 받습니다. 날카로움을 지혜롭게 쓸 줄 아는 사람이 되세요.',
    '辛':'정제된 보석처럼 당신은 <b>세밀함과 완벽함을 추구하는 예술가 기질</b>이 있습니다. 그 완벽주의가 때로는 스스로를 옥죄기도 합니다. 70% 완성도에서도 세상에 내보이는 용기가 필요해요.',
    '壬':'거대한 강물처럼 당신은 <b>막히면 돌아가는 유연함과 끈질김</b>을 동시에 가졌습니다. 이 물의 힘을 한 방향으로 모을수록 무섭게 강해집니다. 에너지를 너무 분산시키지 마세요.',
    '癸':'이슬처럼 맑고 섬세한 당신은 <b>눈에 보이지 않아도 세상에 촉촉함을 더하는 존재</b>입니다. 자신의 작음을 두려워하지 마세요. 가장 작은 물방울이 바위도 뚫습니다. 꾸준함이 당신의 초능력입니다.'
  };
  out+='<div style="background:rgba(255,255,255,.85);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #4CAF50">';
  out+='<b style="font-size:.9rem">🌿 일간 '+dg+' 의 본질</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.85">'+(ganAdvice[dg]||deep.advice)+'</span>';
  out+='</div>';

  if(jg&&jg.isJong){
    var jongElAdvice={
      wood:'초록빛 생명력이 사주 전체를 지배하는 종격입니다. 교육, 생명, 성장, 자연, 문화 — <b>목(木)의 기운이 흐르는 모든 곳에서 당신은 빛납니다.</b> 나무가 자라는 곳, 사람이 성장하는 곳에 있으세요. 당신의 기운을 약하게 만드는 환경은 과감히 멀리하세요. 흰색·금속·강한 규율은 이 사주에서 독이 됩니다.',
      fire:'불꽃이 온 사주를 가득 채운 종격입니다. 무대, 미디어, 리더십, 뜨거운 열정이 요구되는 분야가 당신의 무대입니다. <b>화(火)의 기운을 더 크게 키울수록 인생이 빛납니다.</b> 당신을 주눅 들게 하거나 열정을 꺼버리는 환경은 독입니다. 늘 가슴이 뛰는 일을 하고, 표현하고, 빛나세요.',
      earth:'대지처럼 묵직한 토(土)의 기운이 가득한 종격입니다. 부동산, 안정, 음식, 돌봄, 중재 — <b>토(土)의 질감이 있는 모든 곳에서 당신은 든든한 기둥이 됩니다.</b> 빠른 변화보다 깊고 착실한 방식이 맞습니다.',
      metal:'날카로운 금(金)의 기운이 가득 찬 종격입니다. 법률, 의료, 정밀 기술, 금융, 명예 — <b>금(金)의 원칙과 날카로움이 필요한 곳에서 당신은 타의 추종을 불허합니다.</b> 원칙을 세우고 지키는 전문가의 길을 걸어가세요.',
      water:'물이 흘러넘치는 수(水)의 종격입니다. 지혜, 탐구, 유통, 예술, 철학 — <b>수(水)의 흐름이 닿는 곳에서 당신의 능력은 세상을 바꿉니다.</b> 막히거나 억누르는 환경을 피하고, 언제나 흘러갈 수 있는 유연한 삶을 만드세요.'
    };
    out+='<div style="background:rgba(243,229,245,.7);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #9C27B0">';
    out+='<b style="font-size:.9rem;color:#6A1B9A">🌀 '+jg.name+' 특별 조언</b><br>';
    out+='<span style="font-size:.86rem;line-height:1.85;color:#4A148C">'+(jongElAdvice[jg.dominant]||'종격의 지배 오행을 극한까지 키우는 것이 성공의 열쇠입니다.')+'</span>';
    out+='</div>';
  }else if(pw&&pw.isStrong){
    out+='<div style="background:rgba(255,243,224,.8);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #FF9800">';
    out+='<b style="font-size:.9rem;color:#E65100">🔥 신강(身强) 사주 — 에너지 수호 조언</b><br>';
    out+='<span style="font-size:.86rem;line-height:1.85;color:#BF360C">당신 안에는 넘치는 에너지가 있습니다. 이 에너지는 잘 쓰면 리더십과 추진력이 되지만, 억누르면 고집·독선·과잉 경쟁으로 변질됩니다. <b>핵심은 에너지를 발산하는 구조를 만드는 것입니다.</b> 사람들에게 베풀고, 사회적 역할을 맡고, 규칙과 원칙을 통해 자신을 다스리세요. 때로는 당신보다 강한 사람에게 도전받는 환경이 더 크게 성장시킵니다.</span>';
    out+='</div>';
  }else{
    out+='<div style="background:rgba(227,242,253,.8);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid #2196F3">';
    out+='<b style="font-size:.9rem;color:#1565C0">💧 신약(身弱) 사주 — 자기 보호 조언</b><br>';
    out+='<span style="font-size:.86rem;line-height:1.85;color:#0D47A1">당신은 외부의 영향을 쉽게 받는 섬세한 구조의 사주입니다. 이것은 약점이 아닙니다. 공감 능력이 탁월하고 분위기를 읽는 눈치가 뛰어납니다. <b>하지만 그 때문에 지치기도 쉽습니다.</b> 당신을 진심으로 아끼는 귀인 한 명을 곁에 두는 것이 무엇보다 중요합니다. 혼자 모든 것을 해결하려 하지 말고, 적절한 도움을 요청하는 것이 진짜 용기입니다. 자존감이 낮아지는 관계나 환경에서는 과감히 물러서는 결단이 필요합니다.</span>';
    out+='</div>';
  }

  var tsAdviceFull={
    '비견':'독립심이 강한 당신, 모든 일을 혼자 하려는 경향이 있어요. <b>진짜 강한 사람은 도움을 요청할 줄도 압니다.</b> 동업이나 파트너십에서는 역할을 명확히 하고 계약서를 갖추는 것이 필수입니다. 내 방식이 늘 최선이 아닐 수 있음을 인정하는 순간, 당신의 세계가 훨씬 넓어집니다.<br><br>비견이 강한 사주는 경쟁에서 강하고 자기만의 브랜드를 구축하는 능력이 탁월합니다. 하지만 경쟁에 너무 집중하면 소비와 지출이 과잉되어 재물이 쌓이지 않는 구조가 될 수 있습니다. 수입의 일정 비율을 자동이체로 강제 저축하는 시스템을 반드시 만드세요. 또한 독립심이 강해 협력이 어렵지만, 당신보다 뛰어난 사람을 파트너로 두는 용기가 성장의 가속 페달입니다. 동반자를 경쟁자로 보지 말고 시너지 파트너로 보는 시각 전환이 필요합니다.',
    '겁재':'승부욕과 추진력이 넘치는 당신, 그 에너지를 재물에만 쏟으면 들어온 만큼 빠져나갑니다. <b>돈은 벌기보다 지키는 것이 더 어렵습니다.</b> 고정 지출 구조를 만들고, 충동적 투자나 보증은 철저히 피하세요. 강제 저축과 장기 자산 계획이 재물 운을 지키는 가장 확실한 방법입니다.',
    '식신':'낙천적이고 베풀기 좋아하는 당신, 그 따뜻함이 가장 큰 자산이에요. <b>하지만 이용당하지 않도록 사람을 볼 줄 아는 눈을 키우세요.</b> 규칙적인 생활과 운동이 건강 운을 지킵니다. 하고 싶은 일을 업으로 삼으면 남들보다 몇 배의 성과를 냅니다.',
    '상관':'천재적 언어 감각이 있지만, 말이 칼이 될 수 있습니다. <b>비판하기 전에 한 번만 더 상대방의 입장에서 생각하는 습관을 들이세요.</b> 당신의 혁신적 아이디어를 설득하는 포장지가 부드러워야 세상에 먹힙니다. 자기 규칙을 스스로 만들고 지키는 자기 경영이 성공의 열쇠입니다.',
    '편재':'큰 그림을 그리는 능력이 탁월한 당신, 작은 것을 무시하는 경향을 조심하세요. <b>디테일한 부분이 쌓여 큰 일이 됩니다.</b> 유흥과 과소비를 경계하고, 신뢰할 수 있는 재무 수호자를 두는 것이 좋습니다. 해외나 다양한 문화와 연결될 때 가장 큰 기회가 옵니다.',
    '정재':'성실함과 꼼꼼함이 인생 최고의 무기입니다. <b>단, 너무 안정만을 추구하다 기회를 놓치지 마세요.</b> 작은 도전들을 반복하면서 실패에 익숙해지는 연습이 필요합니다. 건강한 관계 패턴을 만드는 것이 인생 행복의 핵심입니다.',
    '편관':'강인한 의지와 의협심, 그리고 리더십의 주인입니다. <b>스트레스를 속으로 쌓아두면 몸이 먼저 신호를 보냅니다.</b> 반드시 격렬한 신체 활동으로 에너지를 발산하세요. 권위적인 태도 대신 솔선수범하는 리더십으로 사람을 이끄세요.',
    '정관':'원칙과 명예를 중시하는 당신, 그 정직함이 가장 큰 신용 자산입니다. <b>하지만 모든 상황이 원칙대로 돌아가지는 않습니다.</b> 유연성을 배우고, 때로는 규칙보다 사람이 먼저임을 기억하세요. 남의 시선보다 자신의 내면 기준에 충실한 삶을 살 때 진정한 만족을 얻습니다.',
    '편인':'직관력과 영감이 탁월한 당신, 생각이 너무 많아 행동이 늦어지는 것이 가장 큰 문제입니다. <b>"일단 해보자"는 용기가 당신을 한 단계 성장시킵니다.</b> 아이디어를 혼자만 간직하지 말고, 신뢰하는 한 사람에게라도 꺼내 보세요. 고독을 즐기되 적절한 사회적 연결이 정신 건강을 지킵니다.',
    '정인':'사랑받고 배우는 것을 좋아하는 당신, 의존적 성향이 가장 큰 함정입니다. <b>누군가가 없어도 스스로 결정하고 실행하는 자립심 훈련이 평생 과제입니다.</b> 인정과 칭찬에 약하니 그것을 이용하는 사람을 조심하세요. 건강한 경계를 세우는 것이 성장의 첫걸음입니다.'
  };
  out+='<div style="background:rgba(255,255,255,.85);border-radius:10px;padding:14px;margin-bottom:12px;border-left:4px solid var(--cd-accent, #b31955)">';
  out+='<b style="font-size:.9rem;color:var(--cd-accent, #b31955)">⭐ 핵심 십성 '+dominant+' — 맞춤 조언</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.85">'+(tsAdviceFull[dominant]||deep.advice)+'</span>';
  out+='</div>';

  if(natal.counts[domE]>=4){
    var elOverload={
      wood:'<b>목(木) 기운이 강합니다.</b> 고집과 독선이 동시에 나타날 수 있어요. 금(金) 기운으로 다듬고 화(火) 기운으로 발산하세요. 서쪽 방향, 흰색·회색 계열, 매운맛 음식이 도움이 됩니다.',
      fire:'<b>화(火) 기운이 지나칩니다.</b> 감정 기복과 심장·혈압 건강에 주의해야 합니다. 수(水) 기운이 절실합니다. 검은색·파란색 계열, 물가 생활, 충분한 수면이 필수입니다.',
      earth:'<b>토(土) 기운이 강합니다.</b> 고집이 세고 변화를 거부하며 소화기 질환에 주의가 필요합니다. 목(木) 기운으로 흔들어주세요. 초록색 식물, 동쪽 방향, 신맛 음식이 도움입니다.',
      metal:'<b>금(金) 기운이 강합니다.</b> 냉정함이 인간관계를 어렵게 만들 수 있습니다. 화(火) 기운이 필요합니다. 따뜻한 색상, 사람들과의 활동, 베풀고 표현하는 연습이 균형을 잡아줍니다.',
      water:'<b>수(水) 기운이 지나칩니다.</b> 우유부단함과 지나친 내성, 신장·방광 건강에 주의하세요. 토(土) 기운으로 방향을 잡아주세요. 노란색·갈색 계열, 안정적인 루틴 세우기가 중요합니다.'
    };
    out+='<div style="background:rgba(255,245,220,.8);border-radius:10px;padding:12px;margin-bottom:10px;border-left:4px solid #FF9800">';
    out+='<b style="font-size:.88rem;color:#E65100">⚠️ 오행 편중 주의사항</b><br>';
    out+='<span style="font-size:.84rem;line-height:1.82">'+(elOverload[domE]||'')+'</span>';
    out+='</div>';
  }

  out+='<div style="text-align:right;margin-top:8px;font-style:italic;color:#81C784;font-size:.8rem">— 연이가 당신의 사주를 읽으며 진심을 담아 🐷💚</div>';
  return out;
}
/* ─── generateNeoFactPunch: 영냥이의 현실 체크 (NEO MODE 전용 · 영냥이 페르소나) ─── */
function generateNeoFactPunch(p,pw,jg,dominant,dayMaster,domE,natal,deep){
  var dg=p.d.g;
  var out='';
  var EL_KO={wood:'목(木)',fire:'화(火)',earth:'토(土)',metal:'금(金)',water:'수(水)'};
  var EL_K={wood:'목',fire:'화',earth:'토',metal:'금',water:'수'};

  // 일간별 현실 체크 조언
  var ganPunch={
    '甲':'너는 방향만 맞으면 아무도 못 막는 사람이야. 그래서 한 번 짚고 갈게. 지금 그 방향, 맞긴 해? 고집이 강한 건 좋아. 근데 피드백을 흘려듣는 고집은 너를 스스로 몰아붙일 수 있거든. 주변에서 같은 말을 두 번 이상 들었다면 그건 한번 진지하게 들어 봐. 독립심도 좋지만 혼자 다 하려다 지쳐 버리는 갑목(甲木)이 많아. 협력을 겁내지 마. 너보다 잘하는 사람을 파트너로 두는 건 지는 게 아니라 현명한 선택이야. 지금 필요한 건 세 가지야 — 주간 목표 점검, 진짜 피드백을 줄 한 사람, 그리고 네 완고함을 들여다보는 짧은 일기.',
    '乙':'너는 어디서든 살아남는 생존력이 있어. 근데 그 생존력이 네 목소리를 죽이는 쪽으로 쓰이고 있진 않아? 눈치가 빠른 건 장점이지만, 모두를 만족시키려다 정작 네가 원하는 게 뭔지 잃어버리는 을목(乙木)이 많아. 결정 앞에서 생각이 너무 길어지는 게 제일 큰 걸림돌일 수 있어. 완벽한 선택은 없어. 70% 확신이 들면 움직여 봐. 나머지 30%는 움직이면서 채우면 돼. 그리고 너를 이용하려는 사람을 가려내는 눈도 키워 봐. 착한 게 잘못은 아니지만, 그 착함이 소모되게 두지는 마.',
    '丙':'에너지 넘치지. 근데 그 에너지가 얼마나 한 곳에 모이고 있어? 병화(丙火)에게 흔한 패턴은 이래 — 시작은 화끈하게, 중간에 흥미를 잃고, 마무리는 흐지부지. 너도 이 패턴 알아차리고 있어? 지금 딱 하나만 골라서 끝까지 가 봐. 여러 걸 동시에 하면 다 중간에서 멈추기 쉬워. 결실은 끝까지 간 사람한테 오거든. 충동적인 결정이 잦다면, 큰 결정 앞에서는 48시간 쉬어 가는 규칙을 만들어 봐. 충동으로 시작한 일이 삶을 얼마나 흔들었는지 한번 차분히 돌아봐.',
    '丁':'조용하지만 안에 뜨거운 게 있다는 거 알아. 근데 그걸 너무 안으로만 담아 두고 있진 않아? 정화(丁火)가 빠지기 쉬운 함정은 이거야 — 상처를 말 못 하고 참다가 어느 순간 터지거나, 관계를 조용히 끊어 버리는 것. 주변 사람은 네가 왜 갑자기 거리를 두는지 모를 수 있어. 말해 봐. 불편하면 불편하다고, 상처받았으면 상처받았다고. 대화가 끊기는 게 많은 관계 문제의 뿌리거든. 자기비판도 너무 세. 네가 틀렸을 때 너를 몰아붙이는 마음속 목소리, 이제 그 목소리에도 선을 그어 줘.',
    '戊':'든든하고 믿음직해. 근데 그 무게가 가끔은 너 자신을 가두고 있진 않아? 무토(戊土)의 핵심 숙제는 이거야 — 변화가 필요한 걸 알면서도 움직임이 늦다는 것. "언젠가는", "좀 더 준비되면" — 이 말 입에 달고 살지 않아? 완벽한 타이밍은 잘 오지 않아. 지금 시작하는 게 대개 가장 빨라. 책임감이 강해서 지면 안 된다는 부담이 있을 수 있는데, 실패는 정보야. 빨리 실패해 보는 게 느린 성공보다 나을 때가 많아. 네 굳은 부분을 알아차리고, 매달 한 가지씩 새로운 걸 시도하는 루틴을 만들어 봐.',
    '己':'너는 조직의 진짜 핵심을 조용히 받치는 사람이야. 근데 그 사실을 너만 모르고 있진 않아? 기토(己土)의 패턴은 이래 — 남을 너무 챙기다 정작 네 경력, 건강, 즐거움을 뒷전으로 미뤄. 그건 미덕만은 아니야. 네 컵이 비어 있으면 남을 채워 줄 수 없거든. 결단이 늦는 것도 짚어 볼 부분이야. 선택 앞에서 너무 오래 고민하면 기회가 지나가. 네 판단을 믿어 봐. 네 세밀한 눈은 이미 답을 알고 있을 수도 있어. 이제 움직이는 것만 남았어.',
    '庚':'직선적이고 솔직해. 이건 큰 자산이야. 근데 경금(庚金)이 자주 듣는 말이 뭔지 알아? "차갑다", "말이 너무 직접적이다", "배려가 없다". 의도가 없어도 상처를 주고 있을 수 있어. 말은 하는 사람이 아니라 듣는 사람이 해석하거든. 같은 내용을 5%만 더 부드럽게 전하는 연습이 관계 전체를 바꿀 수 있어. 그리고 완고함 — 이미 정한 걸 끝까지 밀어붙이는 경향은 위기 때는 강점이지만 일상에서는 갈등의 씨앗이 될 수 있어. 언제 유연해질지 너만의 기준을 세워 봐.',
    '辛':'완벽주의자지. 네 눈에는 늘 뭔가 부족해 보일 거야. 근데 이건 짚고 갈게. 세상에 완벽한 건 거의 없고, 완벽을 기다리다 타이밍을 놓친 신금(辛金)이 정말 많아. 70%짜리라도 지금 꺼내 봐. 바깥에서 오는 피드백이 네 머릿속 완벽함보다 훨씬 정확할 수 있어. 비판에 너무 아프게 반응하는 것도 짚어 볼 부분이야. 비판은 너라는 사람에 대한 공격이 아니라 결과물에 대한 의견이거든. 너와 네 결과물 사이에 마음의 거리를 조금 만들어 봐.',
    '壬':'시야가 넓고 멀리 내다봐. 근데 그 넓음이 문제가 될 수 있어. 임수(壬水)는 한꺼번에 너무 많은 걸 봐서 어느 것도 깊이 파지 못하는 패턴이 반복되기 쉽거든. 지금 네 손에 일이 몇 개나 있어? 반은 내려놔 봐. 집중이 곧 자산이야. 감정을 안 드러내는 것도 길게 보면 관계를 고립시킬 수 있어. 주변 사람들은 네 속을 몰라서 어떻게 다가가야 할지 헤맬 수 있거든. 가끔은 약한 모습도 보여 줘. 그게 오히려 신뢰를 만들어.',
    '癸':'섬세하고 공감 능력이 뛰어나. 근데 계수(癸水)의 가장 큰 적은 자기 자신일 때가 많아. 생각이 너무 많아서 행동이 늦고, 망설이다 기회를 거듭 놓칠 수 있거든. 완벽한 확신을 기다리는 건 영영 시작하지 않겠다는 말과 비슷해. 직관을 믿어 봐. 네 첫 감이 맞을 때가 많아. 그리고 남의 감정을 너무 흡수해서 네 에너지를 다 써 버리는 습관은 없는지 점검해 봐. 공감은 미덕이지만, 경계 없는 공감은 너를 갉아먹어.'
  };

  // 신강/신약 현실 체크
  var powerPunch='';
  if(jg&&jg.isJong){
    powerPunch='<b>종격 사주</b> — 이 사주의 핵심은 하나야. '+EL_KO[jg.dominant]+' 기운이 압도적인 너는, 그 기운을 거스르는 선택을 할 때마다 삶이 삐걱거릴 수 있어. 취미, 직업, 인간관계 모두 '+EL_KO[jg.dominant]+' 에너지가 흐르는 방향으로 맞춰 봐. 반대 에너지는 너한테 독이 될 수 있어. 많은 사람이 사회적 기대나 주변 압박 때문에 자기 기운과 반대로 선택하거든. 너한테는 그게 특히 무겁게 돌아올 수 있어. 타고난 기운을 따르는 용기, 그게 지금 필요한 거야.';
  }else if(pw&&pw.isStrong){
    powerPunch='<b>신강 사주</b> — 에너지가 넘쳐. 그게 숙제야. 넘치는 에너지가 갈 곳을 못 찾으면 고집, 독선, 과한 경쟁으로 타 버릴 수 있거든. 주변 사람들이 요즘 지쳐 보이진 않아? 에너지를 건강하게 쏟아낼 구조(운동, 봉사, 창작, 리더 역할)를 꼭 만들어 봐. 억누르면 더 크게 터질 수 있어. 에너지를 맞는 방향으로 쏟는 것, 그게 신강 사주가 잘 풀리는 공식이야. 지금 네 에너지가 건강하게 흐르고 있는지 스스로한테 물어봐.';
  }else{
    powerPunch='<b>신약 사주</b> — 외부 환경이나 사람의 영향을 쉽게 받아. 이것 자체는 약점이 아니야. 문제는 너도 그걸 알면서 경계를 잘 안 세운다는 거지. 너를 지치게 하는 관계, 너를 소모시키는 환경 — 이걸 정리할 용기가 필요해. 거절하는 건 이기적인 게 아니야. 너를 지키는 게 먼저야. 귀인 한 명이 삶을 바꿔 줄 수 있는 구조니까, 네 가치를 알아봐 주고 진심으로 응원하는 사람과의 인연을 소중히 해 봐.';
  }

  // 십성 현실 체크 조언
  var tsPunch={
    '비견':'경쟁에 강하고 독립심이 높아. 근데 그 독립심이 고립으로 가고 있진 않아? 혼자 다 하려다 결국 혼자 지칠 수 있어. 너보다 잘하는 사람을 파트너로 두는 건 약점을 인정하는 게 아니라 현명한 선택이야. 수입보다 많이 쓰는 습관이 있다면, 재물 관리의 구멍부터 막아 봐.',
    '겁재':'승부욕과 카리스마가 뛰어나. 근데 한번 돌아봐 — 지금까지 들어온 만큼 나가지 않았어? 겁재의 재물 구조는 크게 벌고 크게 쓰기 쉬워. 이 흐름을 붙잡을 장치(자동이체, 고정 저축 비율)가 없으면 나중에 손에 남는 게 적을 수 있어. 오늘 지출 구조부터 하나 짜 봐.',
    '식신':'낙천적이고 창의적이야. 이게 네 최고의 자산이지. 근데 이 좋은 기운이 이용당하고 있진 않아? 잘 베풀다가 지치는 패턴, 꽤 오래됐을 수도 있어. 사람을 보는 눈을 키우는 게 이제 남은 과제야. 체력 관리도 중요해. 창의력과 에너지가 네 밑천이니까, 그 밑천이 바닥나지 않게 챙겨.',
    '상관':'아이디어와 말솜씨가 뛰어난 대신 적을 만들기 쉬워. 이미 알고 있지? 표현의 날을 10%만 줄여도 네 영향력은 훨씬 커질 수 있어. 너만의 규칙을 만들고 지키는 자기 관리가 핵심이야. 남의 틀 안에서는 네가 빛나기 어려우니까, 너만의 기준과 영역을 만들어 봐.',
    '편재':'큰 기회를 잡는 능력이 있어. 근데 큰 것만 보다 작은 걸 놓치는 패턴, 지금도 반복되고 있진 않아? 재물이 들어왔다 나가는 주기가 빠른 편이야. 이 주기를 늦추는 게 자산을 모으는 핵심이야. 믿을 만한 재무 파트너(회계사, 재무설계사)를 한 명 두는 것도 생각해 봐.',
    '정재':'성실하고 꼼꼼해. 이건 좋아. 근데 너무 안정만 좇다가 기회를 계속 흘려보내고 있진 않아? 작은 도전을 꾸준히 이어 가는 게 큰 결실로 이어져. 실패가 두렵겠지만, 아무것도 안 하면 실패도 없는 대신 아무 일도 안 일어나. 그게 더 아까운 일이야.',
    '편관':'강인하고 리더십이 있어. 근데 스트레스를 몸으로 다 받아 내고 있진 않아? 지금 몸 상태부터 차분히 체크해 봐. 편관 사주는 과로와 건강이 가장 큰 위험 요소일 수 있어. 네가 무너지면 네가 이끄는 것들도 같이 흔들리거든. 운동으로 에너지를 풀어 주고, 권위 대신 공감으로 사람을 이끄는 법을 익혀 봐.',
    '정관':'원칙과 명예를 중요하게 여겨. 이게 네 가장 큰 신용 자산이야. 근데 원칙을 지키다 기회를 놓친 적은 없어? 규칙보다 사람이 먼저인 순간도 있거든. 100% 원칙에 2% 유연성을 더하는 게 네 숙제야. 남의 시선 때문에 진짜 원하는 걸 누르고 있진 않은지도 점검해 봐.',
    '편인':'직관이 뛰어나고 아이디어가 넘쳐. 근데 그 아이디어들이 머릿속에서만 맴돌다 사라지고 있진 않아? 생각을 실행으로 잇는 힘이 지금 가장 필요해. 완벽히 준비된 다음 시작하려다 결국 아무것도 시작 못 할 수 있어. 오늘 가장 작은 첫걸음 하나만 떼 봐. 혼자 있는 시간을 즐기는 건 좋지만, 고립되지는 않게 챙겨.',
    '정인':'배우려는 의지가 강하고 귀인 복이 있어. 근데 지금 누군가한테 너무 기대고 있진 않아? 그 사람이 없어도 설 수 있는 기반을 만드는 게 지금 네 큰 과제야. 칭찬에 약하고 인정에 목마를 수 있다는 것도 알아 둬 — 그걸 이용하려는 사람도 있거든. 건강한 경계를 세우는 게 성장의 시작이야.'
  };

  // 구성
  out+='<div style="border-radius:10px;padding:14px;margin-bottom:14px;border:1px solid var(--cd-border);background:var(--cd-surface)">';
  out+='<b style="font-size:.9rem;color:var(--cd-accent)">🐱 일간 '+dg+' — 영냥이가 네 사주에서 본 것</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.9">'+(ganPunch[dg]||deep.advice)+'</span>';
  out+='</div>';

  out+='<div style="border-radius:10px;padding:14px;margin-bottom:14px;border:1px solid var(--cd-border);background:var(--cd-surface)">';
  out+='<b style="font-size:.9rem;color:var(--cd-accent)">🌙 '+( jg&&jg.isJong ? '종격':'(신강/신약)' )+' 현실 체크</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.9">'+powerPunch+'</span>';
  out+='</div>';

  out+='<div style="border-radius:10px;padding:14px;margin-bottom:14px;border:1px solid var(--cd-border);background:var(--cd-surface)">';
  out+='<b style="font-size:.9rem;color:var(--cd-accent)">🔮 핵심 십성 '+dominant+' — 짚고 갈 것</b><br>';
  out+='<span style="font-size:.86rem;line-height:1.9">'+(tsPunch[dominant]||deep.advice)+'</span>';
  out+='</div>';

  if(natal.counts[domE]>=4){
    var elPunch={
      wood:'목(木) 과잉. 요즘 고집이 너무 세지진 않았어? 주변에서 같은 말을 두 번 이상 들었다면 그건 피드백이야. 흰색·금속 소품으로 금(金) 기운을 보강하고, 서쪽 방향 공간을 정리해 봐. 매운맛 음식(고추, 마늘)을 식단에 더하는 것도 도움이 돼.',
      fire:'화(火) 과잉. 요즘 가슴이 빨리 뛰거나 잠들기 어렵진 않아? 충동적인 결정이 최근 잦았다면 경보 신호일 수 있어. 검은색·파란색 소품으로 수(水) 기운을 불러와 봐. 충분한 수면과 수영·목욕 같은 물 관련 활동이 균형을 잡아 줘.',
      earth:'토(土) 과잉. 변화를 너무 밀어내고 있진 않아? 고집이 세지고 소화가 불편하다면 신호일 수 있어. 초록 식물을 키우고 동쪽 방향 공간을 살려 봐. 신맛 음식(식초, 레몬)이 토 기운을 흩어 줘.',
      metal:'금(金) 과잉. 요즘 주변에서 "차갑다", "무뚝뚝하다"는 말 들었어? 피부 건조나 기침도 체크해 봐. 따뜻한 색(빨강, 주황)을 일상에 더하고, 봉사나 표현 활동으로 화(火) 기운을 채워 봐.',
      water:'수(水) 과잉. 결정을 계속 미루고 있어? 두려움이나 불안이 크다면 수 기운 과잉 신호일 수 있어. 노란색·황토색 소품으로 토(土) 기운을 보강하고, 규칙적인 루틴으로 방향을 잡아 봐.'
    };
    out+='<div style="border-radius:10px;padding:12px;margin-bottom:14px;border:1px solid var(--cd-border);background:var(--cd-surface)">';
    out+='<b style="font-size:.88rem;color:var(--cd-accent)">⚠️ '+EL_KO[domE]+' 편중 — 지금부터 균형 맞춰 봐</b><br>';
    out+='<span style="font-size:.84rem;line-height:1.9">'+(elPunch[domE]||'')+'</span>';
    out+='</div>';
  }

  out+='<div style="text-align:right;margin-top:8px;font-style:italic;color:var(--cd-text-muted);font-size:.8rem">— 수정구슬로 네 사주를 들여다본 영냥이가. 쓴소리 같아도 난 네 편이야 🐱</div>';
  return out;
}
function getDaewunBranchEvidence(zhi,p,unknown){
  var keys=(unknown?['y','m','d']:['y','m','d','h']).filter(function(key){return p[key]&&p[key].j;});
  var labels={y:'년주',m:'월주',d:'일주',h:'시주'},rows=[],seen=new Set();
  function add(type,partners,positions,conditions,hapEl){
    var id=type+partners.join('')+positions.join('');
    if(seen.has(id))return;seen.add(id);
    rows.push({type:type,src:zhi,partner:partners.join('·'),positions:positions,conditions:conditions||[],hapEl:hapEl||null,transformed:false,isChung:false});
  }
  // 원국에서 사용하는 형·파·해 표를 대운-원국 조합에도 그대로 재사용한다.
  keys.forEach(function(key){
    var relations=_sajuVillainBuildBranchRelations({y:{j:zhi},m:{j:p[key].j}}).conflictRelations;
    relations.filter(function(row){return ['형','파','해'].indexOf(row.type)>=0;}).forEach(function(row){add('지지'+row.type,[p[key].j],[labels[key]],['보조 관계이며 다른 생극·합충과 함께 해석']);});
  });
  keys.forEach(function(left,i){keys.slice(i+1).forEach(function(right){
    var relations=_sajuVillainBuildBranchRelations({y:{j:zhi},m:{j:p[left].j},d:{j:p[right].j}}).conflictRelations;
    if(relations.some(function(row){return row.type==='형'&&row.branches.length===3;}))add('지지형',[p[left].j,p[right].j],[labels[left],labels[right]],['삼형의 세 지지 구성','사고·질병·처벌을 확정하지 않음']);
  });});
  var original=keys.map(function(key){return p[key].j;});
  CD_SAMHAP.forEach(function(group){
    var state=sajuSamhapState(group.m,zhi,original);
    if(state==='none')return;
    var related=keys.filter(function(key){return p[key].j!==zhi&&group.m.indexOf(p[key].j)>=0;});
    add(state==='full'?'지지삼합':'지지반합',Array.from(new Set(related.map(function(key){return p[key].j;}))),related.map(function(key){return labels[key];}),['서로 다른 지지의 구성 관계','합화 여부는 별도 조건 확인'],group.el);
  });
  return rows;
}
function buildDaewunReadingGuide(age, gan, zhi, ev) {
  var p=G_PILLARS, api=window.SajuReadingPresentation;
  if(!p||!api)return '';
  var knownKeys=window.__cdSajuTimeUnknown?['y','m','d']:['y','m','d','h'];
  var labels={y:'년주',m:'월주',d:'일주',h:'시주'}, counts={};
  knownKeys.forEach(function(key){['g','j'].forEach(function(part){if(key==='d'&&part==='g')return;var god=getTenGod(p.d.g,p[key][part]);counts[god]=(counts[god]||0)+1;});});
  var relations=_getDwHapResults(gan,zhi).map(function(row){
    var part=row.type.indexOf('간')===0?'g':'j';
    var positions=knownKeys.filter(function(key){return p[key][part]===row.partner;}).map(function(key){return labels[key];});
    return Object.assign({},row,{positions:positions});
  }).filter(function(row){return row.positions.length>0;});
  relations=relations.concat(getDaewunBranchEvidence(zhi,p,!!window.__cdSajuTimeUnknown));
  var cycle=(window.G_DAEWUN||[]).find(function(row){return Number(row.age)===Number(age)&&row.g===gan&&row.j===zhi;});
  return api.cycleMarkup({age:age,startYear:cycle&&cycle.startYear||Number(BIRTH_YEAR)+Number(age)-1,day:p.d.g,month:p.m.j,
    dominant:G_NATAL&&G_NATAL.dominant,power:G_POWER,jong:G_JONG,climate:G_JOHU&&G_JOHU.type,
    depth:window.SajuReadingDepth&&window.SajuReadingDepth.buildDepthFacts({p:p,power:G_POWER,johu:G_JOHU,jong:G_JONG,unknown:!!window.__cdSajuTimeUnknown},document.body.classList.contains('neo-mode')?'neo':undefined),
    stem:{char:gan,element:GAN[gan].e,god:getTenGod(p.d.g,gan),roots:knownKeys.flatMap(function(key){return (CD_JANGGAN[p[key].j]||[]).filter(function(hidden){return GAN[hidden].e===GAN[gan].e;}).map(function(hidden){return {position:labels[key],branch:p[key].j,hiddenStem:hidden};});}),balance:getQuantumElType(GAN[gan].e,p,G_JONG,G_POWER,G_JOHU)},
    branch:{char:zhi,element:JI[zhi].e,god:getTenGod(p.d.g,zhi),hiddenStems:(CD_JANGGAN[zhi]||[]).map(function(hidden,index){return {stem:hidden,god:getTenGod(p.d.g,hidden),layer:index===(CD_JANGGAN[zhi]||[]).length-1?'정기':index===0?'여기':'중기'};}),balance:getQuantumElType(JI[zhi].e,p,G_JONG,G_POWER,G_JOHU)},
    godCounts:counts,relations:relations,unknown:!!window.__cdSajuTimeUnknown,
    next:(window.G_DAEWUN||[]).find(function(row){return Number(row.age)>Number(age);})
  },document.body.classList.contains('neo-mode')?'neo':'pig');
}
// 세운 한 해의 간지·판정·영역 문구. 대운 풀이의 10년 세운과 종합의 올해·내년 처방이 이 한 경로로 읽는다.
function _sajuSeunYearReading(yr){
  var jg=G_JONG,pw=G_POWER,jh=G_JOHU;
  var yBazi=_coreEightChar(yr,6,15,12,0);

  try {
    var _sj = KasiEngine.getGanjiFromParts(_kasiPartsOf(yr, 6, 15, 12, 0, 0));
    if(_sj && _sj.secha) {
        yBazi.getYearGan = function() { return _sj.secha[0]; };
        yBazi.getYearZhi = function() { return _sj.secha[1]; };
    }
  } catch(e) {}

  var yg2=yBazi.getYearGan(),yz2=yBazi.getYearZhi();
  var ygd=GAN[yg2]||{e:'earth',n:'?'},yzd=JI[yz2]||{e:'water',a:'?'};
  var yEv=evalDaewun(yg2,yz2);
  var neo=(typeof NEO_MODE!=='undefined'&&NEO_MODE)
    ||(document.documentElement&&document.documentElement.classList.contains('neo-mode'))
    ||document.body.classList.contains('neo-mode');
  var yGaeun=neo&&NEO_GAEUN_DB[ygd.e]?NEO_GAEUN_DB[ygd.e][yEv.score>=60?'good':'bad']:getDetailedGaeun(ygd.e,yEv.score>=60);
  var johuYText='';
  if(jh){
    if((jh.type==='hot'||jh.type==='warm')&&(ygd.e==='water'||yzd.e==='water'))
      johuYText=(neo?'💧 시원한 水 기운이 뜨거운 사주를 식혀 줘. ✅':'💧 시원한 水 기운이 뜨거운 사주를 식혀줍니다. ✅');
    else if((jh.type==='hot'||jh.type==='warm')&&(ygd.e==='fire'||yzd.e==='fire'))
      johuYText='🔥 火 기운이 더해져 과열 주의. ⚠️';
    else if((jh.type==='cold'||jh.type==='cool')&&(ygd.e==='fire'||yzd.e==='fire'))
      johuYText=(neo?'🔥 따뜻한 火 기운이 차가운 사주를 덥혀 줘. ✅':'🔥 따뜻한 火 기운이 차가운 사주를 덥혀줍니다. ✅');
    else if((jh.type==='cold'||jh.type==='cool')&&(ygd.e==='water'||yzd.e==='water'))
      johuYText='💧 水 기운이 더해져 냉각 주의. ⚠️';
    else johuYText=(neo?'🙂 조후는 보통 수준이야.':'🙂 보통 수준의 조후입니다.');
  }
  var ukbuYText='';
  if(jg&&jg.isJong){
    ukbuYText=ygd.e===jg.dominant||yzd.e===jg.dominant?(neo?'🌀 종격의 흐름을 돕는 해 — 강점이랑 지나친 쏠림을 같이 살펴 봐.':'🌀 종격의 흐름을 돕는 해 — 강점과 과도한 쏠림을 함께 살피세요.'):'🙂 종격 중립의 해';
  }else if(pw){
    var hasY=pw.yongshin.indexOf(ygd.e)>=0||pw.yongshin.indexOf(yzd.e)>=0;
    var hasK=pw.kijishin.indexOf(ygd.e)>=0||pw.kijishin.indexOf(yzd.e)>=0;
    ukbuYText=hasY?'✅ <span class="notranslate">용신운</span> — '+(pw.isStrong?'에너지 활용과 사회적 역할을 살필 때':'도움을 받는 방식과 회복 여건을 살필 때'):
      hasK?'⚠️ <span class="notranslate">기신운</span> — '+(pw.isStrong?'내실 다지는 시기':'소모 주의, 회복 우선'):'🙂 중립운';
  }
  if(yEv.hasChungBonus){
    var ybText = yEv.chungBonusText ? (neo?_sajuNeoChungText(yEv.chungBonusText):yEv.chungBonusText) :(neo?'충과 기신의 작용을 같이 살펴 봐.':'충과 기신의 작용을 함께 살펴보세요.');
    ukbuYText += '<br><span style="color:#E65100;font-size:0.85rem;font-weight:bold;margin-top:4px;display:inline-block;">' + ybText + '</span>';
  }
  if(yEv.hasChungPenalty){
    var ypText = yEv.chungPenaltyText ? (neo?_sajuNeoChungText(yEv.chungPenaltyText):yEv.chungPenaltyText) :(neo?'충이 용신의 작용에 주는 부담을 살펴 봐.':'충이 용신의 작용에 주는 부담을 살펴보세요.');
    ukbuYText += '<br><span style="color:#D32F2F;font-size:0.85rem;font-weight:bold;margin-top:4px;display:inline-block;">' + ypText + '</span>';
  }

  return {yg:yg2,yz:yz2,ygd:ygd,yzd:yzd,ev:yEv,gaeun:yGaeun,johu:johuYText,ukbu:ukbuYText};
}
// #dwDetail 본문(대운 풀이 + 10년 세운). 서버 대운 풀이(worker/lib/saju-section)와 같은 HTML 이다.
function buildDaewunDetailHtml(age,gan,zhi){
  var cycle=(window.G_DAEWUN||[]).find(function(row){return Number(row.age)===Number(age)&&row.g===gan&&row.j===zhi;});
  var startYear=cycle&&cycle.startYear||BIRTH_YEAR+age-1;
  var ev=evalDaewun(gan,zhi);
  var guideHtml=buildDaewunReadingGuide(age,gan,zhi,ev);

  var yearHTML='';
  for(var yr=startYear;yr<=startYear+9;yr++){
    try{
      var sy=_sajuSeunYearReading(yr);
      var yg2=sy.yg,yz2=sy.yz,ygd=sy.ygd,yzd=sy.yzd,yEv=sy.ev,yGaeun=sy.gaeun,johuYText=sy.johu,ukbuYText=sy.ukbu;
      var cycleRelations=_getDwHapResults(yg2,yz2,{d:{g:gan,j:zhi}});
      var cycleContext=document.body.classList.contains('neo-mode')?gan+zhi+' 대운 속 '+yg2+yz2+' 세운이야. '+(cycleRelations.length?cycleRelations.map(function(row){return row.src+'·'+row.partner+' '+(row.type.indexOf('간')===0?'천간':'지지')+(row.isChung?'충':'합');}).join(', ')+' 관계를 원국의 작용과 같이 살펴볼게.':'대운과 직접적인 천간합·충 또는 육합·지지충이 없어서, 각 운의 십성과 원국 관계를 중심으로 읽을게.'):gan+zhi+' 대운 속 '+yg2+yz2+' 세운입니다. '+(cycleRelations.length?cycleRelations.map(function(row){return row.src+'·'+row.partner+' '+(row.type.indexOf('간')===0?'천간':'지지')+(row.isChung?'충':'합');}).join(', ')+' 관계를 원국의 작용과 함께 살핍니다.':'대운과 직접적인 천간합·충 또는 육합·지지충이 없어 각 운의 십성과 원국 관계를 중심으로 읽습니다.');

      yearHTML+='<div class="year-row" onclick="toggleYear(this, event)">'+
        '<div class="year-top">'+
        '<div style="flex:1">'+
        '<div class="year-title">'+yr+'년 · '+yg2+yz2+' <span style="font-size:.78rem;color:#999;font-weight:400">('+ygd.n+' '+yzd.a+')</span></div>'+
        '<span class="luck-badge '+(yEv.score>=80?'lb-best':yEv.score>=60?'lb-good':yEv.score>=40?'lb-ok':'lb-bad')+'">'+yEv.label+'</span></div>'+
        '<span style="color:var(--pink-l);font-size:1rem">▼</span></div>'+
        '<div class="year-sub">'+
        '<div class="yr-section"><div class="yr-label">대운과 세운의 연결</div><div class="yr-content">'+cycleContext+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">⚖️ 억부 판단</div><div class="yr-content">'+ukbuYText+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">🌡️ 조후 분석</div><div class="yr-content">'+johuYText+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">💘 연애운</div><div class="yr-content">'+yGaeun.love+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">💰 재물운</div><div class="yr-content">'+yGaeun.wealth+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">👥 인간관계</div><div class="yr-content">'+yGaeun.relationship+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">💼 커리어운</div><div class="yr-content">'+yGaeun.career+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">🏥 건강 조언</div><div class="yr-content">'+yGaeun.health+'</div></div>'+
        '<div class="yr-section"><div class="yr-label">🌈 개운법</div><div class="yr-content">'+yGaeun.lifestyle+'</div></div>'+
        '</div></div>';
    }catch(e){console.error(yr+'년 오류',e);}
  }
  return guideHtml+
    '<div style="border-top:1px solid #e5c3d2;padding-top:16px;margin-top:4px">'+
    '<h3 style="font-size:1.1rem;margin-bottom:12px">세운 · 해마다 달라지는 흐름</h3>'+
    '<div class="year-list" id="yearList">'+yearHTML+'</div></div>'+
    '<!--saju-ext-->'+_sajuDaewunMapHtml(age,gan,zhi)+_sajuDaewunTransitionHtml(age,gan,zhi)+'<!--/saju-ext-->';
}
// 10년 단위 전체 대운 지도. 대운표(G_DAEWUN)와 대운 판정(evalDaewun)을 다시 읽기만 한다.
function _sajuDaewunMapHtml(age,gan,zhi){
  var rows=window.G_DAEWUN||[], dg=G_PILLARS.d.g;
  if(!rows.length)return '';
  var neo=document.body.classList.contains('neo-mode'), nowYear=Number(BIRTH_YEAR)+Number(CURRENT_AGE)-1;
  var items=rows.map(function(row){
    var rowEv=evalDaewun(row.g,row.j);
    var selected=Number(row.age)===Number(age)&&row.g===gan&&row.j===zhi;
    var current=nowYear>=row.startYear&&nowYear<=row.endYear;
    return '<li style="padding:8px 10px;border-radius:8px;border:1px solid '+(selected?'#c2185b':'#e5c3d2')+';background:'+(selected?'rgba(252,228,236,.75)':'rgba(255,255,255,.6)')+'"'+(selected?' aria-current="true"':'')+'>'+
      '<b>'+row.age+'세 · '+row.startYear+'–'+row.endYear+'년 · '+row.g+row.j+' 대운</b>'+(current?' <span style="font-size:.78rem;color:#c2185b;font-weight:700">지금</span>':'')+
      '<br><span style="font-size:.84rem">천간 '+getTenGod(dg,row.g)+' · 지지 '+getTenGod(dg,row.j)+' · '+rowEv.label+'</span></li>';
  }).join('');
  return '<section class="saju-daewun-map" style="border-top:1px solid #e5c3d2;padding-top:16px;margin-top:16px">'+
    '<h3 style="font-size:1.1rem;margin-bottom:8px">전체 대운 지도 · 10년 단위로 보는 큰 흐름</h3>'+
    '<p style="font-size:.86rem;line-height:1.75;margin-bottom:10px">'+(neo
      ?'지금 펼친 대운이 인생 전체에서 어디쯤인지부터 봐. 판정은 위 대운표와 같은 기준이고, 십성은 그 10년 동안 겉으로 맡는 역할(천간)과 생활의 바탕(지지)이야.'
      :'지금 펼친 대운이 인생의 긴 흐름에서 어디쯤인지 함께 살펴볼게요. 판정은 위 대운표와 같은 기준이고, 십성은 그 10년 동안 겉으로 맡는 역할(천간)과 생활의 바탕(지지)을 뜻합니다.')+'</p>'+
    '<ol style="list-style:none;padding:0;margin:0;display:grid;gap:6px">'+items+'</ol></section>';
}
// 대운이 바뀌는 앞뒤에서 점검할 것. 십성·균형·합충은 대운 풀이가 쓰는 판정(getTenGod·getQuantumElType·_getDwHapResults)을 그대로 읽는다.
function _sajuDaewunTransitionHtml(age,gan,zhi){
  var rows=window.G_DAEWUN||[], p=G_PILLARS, dg=p.d.g;
  var idx=rows.findIndex(function(row){return Number(row.age)===Number(age)&&row.g===gan&&row.j===zhi;});
  if(idx<0)return '';
  var cur=rows[idx], prev=rows[idx-1], next=rows[idx+1];
  var neo=document.body.classList.contains('neo-mode');
  function balance(part,char,el){
    var type=getQuantumElType(el,p,G_JONG,G_POWER,G_JOHU);
    return part+' '+char+'('+EL_K[el]+')의 기운은 '+(type==='good'?'현재 명식의 균형을 돕는 후보':type==='bad'?'현재 명식에서 부담을 늘릴 수 있는 기운':'균형의 유불리가 뚜렷하지 않은 기운');
  }
  function shift(label,from,to,todo){
    return from===to
      ?label+'의 주제('+from+')는 다음 대운에도 이어집니다. 지금 쌓은 방식을 기록으로 정리해 다음 10년의 기반으로 남기세요.'
      :label+'의 주제가 바뀝니다('+from+' → '+to+'). '+todo;
  }
  var items=[];
  function balanceNeo(part,char,el){
    var type=getQuantumElType(el,p,G_JONG,G_POWER,G_JOHU);
    return part+' '+char+'('+EL_K[el]+') 기운은 '+(type==='good'?'지금 명식의 균형을 돕는 후보로 보여':type==='bad'?'지금 명식에서 부담을 늘릴 수 있는 쪽으로 보여':'균형에 유리한지 불리한지가 아직 뚜렷하지 않아');
  }
  function shiftNeo(label,from,to,todo){
    return from===to
      ?label+'의 주제('+from+')는 다음 대운에도 이어져. 지금 쌓은 방식을 기록으로 정리해서 다음 10년의 기반으로 남겨 둬.'
      :label+'의 주제가 바뀌어('+from+' → '+to+'). '+todo;
  }
  if(neo){
    if(prev)items.push(prev.endYear+'→'+cur.startYear+'년, 앞선 '+prev.g+prev.j+' 대운('+getTenGod(dg,prev.g)+'·'+getTenGod(dg,prev.j)+')에서 이번 '+gan+zhi+' 대운('+getTenGod(dg,gan)+'·'+getTenGod(dg,zhi)+')으로 넘어왔어. 지난 10년의 방식 가운데 이번 대운에도 맞는 것과 내려놓을 것을 나눠서 적어 봐.');
    if(next){
      var curEvN=evalDaewun(gan,zhi), nextEvN=evalDaewun(next.g,next.j);
      var linksN=_getDwHapResults(next.g,next.j,{d:{g:gan,j:zhi}});
      items.push(cur.endYear+'→'+next.startYear+'년 무렵 대운이 바뀌어('+gan+zhi+' → '+next.g+next.j+', 판정 '+curEvN.label+' → '+nextEvN.label+'). 전환 직전 해('+cur.endYear+'년)와 첫해('+next.startYear+'년)에 아래 항목을 차례로 점검해 둬.');
      items.push(shiftNeo('겉으로 맡는 역할',getTenGod(dg,gan),getTenGod(dg,next.g),'지금 맡은 일 가운데 '+getTenGod(dg,next.g)+'의 방향과 맞지 않는 걸 하나씩 정리할 목록을 만들어 봐.'));
      items.push(shiftNeo('생활 바탕',getTenGod(dg,zhi),getTenGod(dg,next.j),'돈·관계·생활 습관에서 '+getTenGod(dg,next.j)+'의 주제를 받아들일 자리를 미리 비워 둬.'));
      items.push('다음 대운에서 '+balanceNeo('천간',next.g,GAN[next.g].e)+'. 그리고 '+balanceNeo('지지',next.j,JI[next.j].e)+'. 돕는 기운은 일찍 생활에 들이고, 부담이 되는 기운은 일정과 지출에 여유를 두는 쪽으로 대비해 봐.');
      items.push(linksN.length
        ?'지금 대운과 다음 대운 사이에 '+linksN.map(function(row){return row.src+'·'+row.partner+' '+(row.type.indexOf('간')===0?'천간':'지지')+(row.isChung?'충':'합');}).join(', ')+' 관계가 있어. '+(linksN.some(function(row){return row.isChung;})?'충은 기존 역할과 생활 기반이 바뀔 가능성을 살피는 관계라서, 큰 결정을 한꺼번에 몰지는 마.':'합은 두 시기를 잇는 고리야. 지금 하던 일을 다음 대운으로 넘기는 다리로 써 봐.')
        :'지금 대운과 다음 대운 사이에 직접적인 천간합·충 또는 육합·지지충은 없어. 위의 십성과 균형 변화를 중심으로 준비해 봐.');
    } else {
      items.push('이번 대운이 계산된 대운표의 마지막 구간이야. 다음 대운을 미리 대비하기보다 이번 10년을 마무리하고 정리하는 데 힘을 써 봐.');
    }
    items.push('전환 앞뒤로 이직·이사·큰 계약이 겹치면 한꺼번에 몰지 말고, 순서를 정해서 하나씩 처리해 봐.');
    items.push('지난 대운에서 반복된 장면(일·돈·관계)을 한 줄씩 적어 두고, 새 대운에서 같은 장면이 오면 다르게 할 행동을 미리 정해 둬.');
    items.push('건강 검진과 재무 점검처럼 해마다 하는 정비를 전환 첫해에 한 번 더 꼼꼼히 해 봐.');
  } else {
    if(prev)items.push(prev.endYear+'→'+cur.startYear+'년, 앞선 '+prev.g+prev.j+' 대운('+getTenGod(dg,prev.g)+'·'+getTenGod(dg,prev.j)+')에서 이번 '+gan+zhi+' 대운('+getTenGod(dg,gan)+'·'+getTenGod(dg,zhi)+')으로 넘어왔습니다. 지난 10년의 방식 가운데 이번 대운에도 맞는 것과 내려놓을 것을 나눠 적어 보세요.');
    if(next){
      var curEv=evalDaewun(gan,zhi), nextEv=evalDaewun(next.g,next.j);
      var links=_getDwHapResults(next.g,next.j,{d:{g:gan,j:zhi}});
      items.push(cur.endYear+'→'+next.startYear+'년 무렵 대운이 바뀝니다('+gan+zhi+' → '+next.g+next.j+', 판정 '+curEv.label+' → '+nextEv.label+'). 전환 직전 해('+cur.endYear+'년)와 첫해('+next.startYear+'년)에 아래 항목을 차례로 점검해 두세요.');
      items.push(shift('겉으로 맡는 역할',getTenGod(dg,gan),getTenGod(dg,next.g),'지금 맡은 일 가운데 '+getTenGod(dg,next.g)+'의 방향과 맞지 않는 것을 하나씩 정리할 목록을 만드세요.'));
      items.push(shift('생활 바탕',getTenGod(dg,zhi),getTenGod(dg,next.j),'돈·관계·생활 습관에서 '+getTenGod(dg,next.j)+'의 주제를 받아들일 자리를 미리 비워 두세요.'));
      items.push('다음 대운에서 '+balance('천간',next.g,GAN[next.g].e)+'이고, '+balance('지지',next.j,JI[next.j].e)+'입니다. 돕는 기운은 일찍 생활에 들이고, 부담이 되는 기운은 일정과 지출에 여유를 두는 쪽으로 대비하세요.');
      items.push(links.length
        ?'지금 대운과 다음 대운 사이에 '+links.map(function(row){return row.src+'·'+row.partner+' '+(row.type.indexOf('간')===0?'천간':'지지')+(row.isChung?'충':'합');}).join(', ')+' 관계가 있습니다. '+(links.some(function(row){return row.isChung;})?'충은 기존 역할과 생활 기반이 바뀔 가능성을 살피는 관계이니 큰 결정을 한꺼번에 몰지 마세요.':'합은 두 시기가 이어지는 고리이니 지금 하던 일을 다음 대운으로 넘길 다리로 쓰세요.')
        :'지금 대운과 다음 대운 사이에 직접적인 천간합·충 또는 육합·지지충은 없습니다. 위의 십성과 균형 변화를 중심으로 준비하세요.');
    } else {
      items.push('이번 대운이 계산된 대운표의 마지막 구간입니다. 다음 대운을 미리 대비하기보다 이번 10년의 마무리와 정리에 힘을 두세요.');
    }
    items.push('전환 앞뒤로 이직·이사·큰 계약이 겹치면 한 번에 몰지 말고 순서를 정해 하나씩 처리하세요.');
    items.push('지난 대운에서 반복된 장면(일·돈·관계)을 한 줄씩 적어 두고, 새 대운에서 같은 장면이 오면 다르게 할 행동을 미리 정하세요.');
    items.push('건강 검진과 재무 점검처럼 해마다 하는 정비를 전환 첫해에 한 번 더 꼼꼼히 하세요.');
  }
  return '<section class="saju-daewun-transition" style="border-top:1px solid #e5c3d2;padding-top:16px;margin-top:16px">'+
    '<h3 style="font-size:1.1rem;margin-bottom:8px">전환기 체크리스트 · 대운이 바뀌는 앞뒤에서 챙길 것</h3>'+
    '<p style="font-size:.86rem;line-height:1.75;margin-bottom:10px">'+(neo
      ?'대운이 바뀌는 해는 삶의 배경이 통째로 바뀔 수 있는 때야. 미리 하나씩 체크해 두면 덜 흔들려.'
      :'대운이 바뀌는 무렵에는 삶의 배경이 서서히 달라져요. 아래 항목을 하나씩 확인하며 준비해 보세요.')+'</p>'+
    '<ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px;font-size:.86rem;line-height:1.75">'+
    items.map(function(text){return '<li>☐ '+text+'</li>';}).join('')+'</ul></section>';
}
