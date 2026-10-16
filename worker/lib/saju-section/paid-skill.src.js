// 인생 스킬 트리(rpt_skillTreeCard) 유료 렌더러 정본. 브라우저로 내려가지 않는다. js/saju-engine.js 의 일주 고유능력 DB(ILJU_INNATE_DB)·
// 치비 아바타(_buildHeroSVG)·renderSkillTree(클래스 시트)를 그대로 옮겼다. 시트 스타일(_ensureSkillTreeRpgStyle)과 그 아래
// 퀘스트 칸(js/entertain-engine.js renderSkillTree 오버라이드)은 브라우저에 남는다.
// 바뀐 곳은 현재 시각 한 줄뿐이다 — 원본의 new Date().getFullYear() 대신 _skillNowYear()(report.js 가 넘긴 요청 시각 ctx.now 의
// 한국 시각 연도. CURRENT_AGE 와 같은 기준이다)를 쓴다.
function _skillNowYear(){ return new Date((ctx.now instanceof Date ? ctx.now.getTime() : Date.now()) + 9 * 60 * 60 * 1000).getUTCFullYear(); }
/* ─── 60갑자 일주 고유능력 DB (INNATE ABILITY) ─── */
var ILJU_INNATE_DB = {
  // ═══ 甲 (갑목·거목) 일주 ═══
  "甲子":{i:"🌑",n:"심연의 뿌리",sub:"甲子 · 어둠 속의 거목",d:"한겨울 밤, 얼어붙은 땅 아래서도 묵묵히 뿌리를 내리는 거목. 남들이 포기할 때 홀로 기회를 포착하는 극강의 생존 직감이 발동한다. 위기 상황에서 오히려 냉정해지며 역전의 한 수를 찾아낸다."},
  "甲寅":{i:"🦁",n:"숲의 군왕",sub:"甲寅 · 간여지동의 패왕",d:"천간과 지지 모두 목(木)! 가만히 서 있기만 해도 숲 전체가 고개를 숙이는 압도적 카리스마. 태어난 순간부터 리더의 DNA가 새겨져 있으며, 어떤 조직에 들어가도 결국 꼭대기에 오르게 되는 왕의 기운을 타고났다."},
  "甲辰":{i:"🐉",n:"승천하는 용",sub:"甲辰 · 거목이 용을 만나다",d:"나무가 비 머금은 땅에서 폭발적으로 성장하듯, 원대한 꿈을 현실로 끌어당기는 이상실현력이 극대화된다. 스케일이 남다르며 작은 것에 연연하지 않는 대인배 기질이 발동한다."},
  "甲午":{i:"🔥",n:"타오르는 거목",sub:"甲午 · 홍염의 불나무",d:"나무에 불이 붙으면? 주변 모든 것을 환하게 밝히는 거대한 횃불이 된다! 뜨거운 열정으로 주변인까지 감화시키는 전염성 에너지를 뿜으며, 홍염살 특유의 묘한 색기까지 겸비한다."},
  "甲申":{i:"🪓",n:"도끼를 맞는 나무",sub:"甲申 · 시련 내성 MAX",d:"금(金)이 목(木)을 치는 편관 구조! 역경과 시련이 끊이지 않지만, 맞으면 맞을수록 나이테가 단단해지는 불사신 체질. 남들보다 10배 힘든 인생을 살지만 결국 최후의 승자가 된다."},
  "甲戌":{i:"🐺",n:"고독한 파수꾼",sub:"甲戌 · 황야의 수호자",d:"늦가을 쓸쓸한 들판에 홀로 서 있는 거목처럼 의리와 철학의 최후의 보루. 주변이 무너져도 절대 흔들리지 않는 정신력의 소유자이며, 지킬 것은 목숨 걸고 지키는 수호 본능이 발동한다."},

  // ═══ 乙 (을목·넝쿨/꽃) 일주 ═══
  "乙丑":{i:"🌱",n:"인고의 새싹",sub:"乙丑 · 동토를 뚫는 생명력",d:"꽁꽁 얼어붙은 흙 속에서도 어떻게든 싹을 틔우는 경이로운 생명력! 환경이 아무리 척박해도 끈질기게 살아남으며, 고생 끝에 낙이 오는 대기만성형 운명의 주인공이다."},
  "乙卯":{i:"🌸",n:"만개의 매혹",sub:"乙卯 · 간여지동의 꽃밭",d:"천간·지지 모두 꽃! 존재 자체로 주변을 아름답게 물들이는 마성의 매력 보유자. 사람을 끌어당기는 힘이 비현실적으로 강하며, 미적 감각과 패션 센스가 DNA에 새겨져 있다."},
  "乙巳":{i:"🔱",n:"불꽃 매화",sub:"乙巳 · 부드러운 독침",d:"꽃 같은 외모 뒤에 숨겨진 날카로운 승부근성! 겉으로는 웃으면서 속으로는 치밀하게 계산하는 천기가 기질이 있으며, 결정적 순간에 아무도 예상 못 한 카드를 꺼내든다."},
  "乙未":{i:"🏡",n:"낙원의 정원사",sub:"乙未 · 메마른 땅의 녹화술",d:"아무것도 자라지 않는 메마른 땅에서도 풍요로운 정원을 만들어내는 녹화 능력! 사람이든 조직이든 관계든, 손대는 것마다 싱그럽게 성장시키는 마법의 손을 가졌다."},
  "乙酉":{i:"💎",n:"보석을 감은 넝쿨",sub:"乙酉 · 극한의 탐미주의",d:"가을 보석을 감아 올리는 넝쿨처럼, 아름다움에 대한 집착이 예술의 경지에 이른다. 미적 안목과 완벽주의가 합쳐져 '못생긴 것은 존재해선 안 된다'는 철학이 발동한다."},
  "乙亥":{i:"🌿",n:"의존의 덩쿨",sub:"乙亥 · 기생하여 정복하다",d:"호수 위를 뒤덮는 넝쿨처럼 상대방의 자원과 기운을 자연스럽게 자기 것으로 흡수하는 능력! 약해 보이지만 결국 숙주보다 더 커져서 전체를 장악하는 조용한 지배자이다."},

  // ═══ 丙 (병화·태양) 일주 ═══
  "丙寅":{i:"🌅",n:"동틀녘의 신호탄",sub:"丙寅 · 새벽을 여는 태양",d:"봄기운 위에 태양이 떠오르는 형상! 무엇이든 시작하면 주변까지 덩달아 활기가 차오르는 시동 에너지가 폭발한다. '일단 시작해!'가 좌우명이며, 행동력으로 세상을 바꾸는 개척자 본능이 깨어난다."},
  "丙辰":{i:"☀️",n:"용을 탄 태양",sub:"丙辰 · 우주급 비전",d:"태양이 용의 등에 올라타면? 상상의 스케일 자체가 우주적이 된다! 남들이 '현실적으로…'라 말할 때 혼자 다른 차원의 그림을 그리며, 놀랍게도 그것이 현실이 되어버리는 비전의 소유자."},
  "丙午":{i:"💥",n:"핵폭발 카리스마",sub:"丙午 · 간여지동의 태양신",d:"태양 위에 태양! 가는 곳마다 주인공 보정이 자동 발동하며 존재감이 999를 찍는다. 홍염살까지 겹쳐 이성을 자석처럼 끌어당기는 극강 매력까지 보유. 단, 너무 뜨거워서 본인도 가끔 타버린다."},
  "丙申":{i:"⚒️",n:"용광로",sub:"丙申 · 쇠도 녹이는 불꽃",d:"태양이 금속을 녹여 원하는 형태로 주조하는 능력! 완고한 상대도, 불가능해 보이는 프로젝트도 뜨거운 열정 하나로 녹여서 내 뜻대로 빚어버리는 압도적 추진력이 발동한다."},
  "丙戌":{i:"🌇",n:"석양의 전사",sub:"丙戌 · 장렬한 마무리",d:"지는 해가 하늘 전체를 물들이듯, 끝맺음을 아름답고 강렬하게 장식하는 마무리 달인. 프로젝트든 관계든 시작보다 끝이 더 화려하며, 뒤돌아서는 모습마저 드라마틱하다."},
  "丙子":{i:"🌊",n:"수면 위의 태양",sub:"丙子 · 감성과 이성의 공존",d:"뜨거운 태양과 차가운 겨울 물의 동거! 극단적인 감성과 냉철한 이성이 한 몸에 공존하는 양면의 천재. 예술적 감수성과 논리적 분석력을 동시에 가동시키는 멀티코어 프로세서 두뇌."},

  // ═══ 丁 (정화·촛불/달빛) 일주 ═══
  "丁丑":{i:"🕯️",n:"얼어붙은 심장의 온기",sub:"丁丑 · 냉철함 속 뜨거운 불씨",d:"겉은 차갑고 무덤덤해 보이지만, 내면 깊은 곳에서 꺼지지 않는 뜨거운 불씨가 타오른다. 감정을 드러내지 않는 포커페이스 뒤에 숨은 열정과 집념이 결정적 순간에 폭발한다."},
  "丁卯":{i:"🦋",n:"촛불 위의 나비",sub:"丁卯 · 은은한 매혹술",d:"나비가 촛불에 이끌리듯 사람을 은은하게 끌어당기는 묘한 매혹의 기운이 발산된다. 자극적인 매력이 아닌 잔잔한 끌림으로 상대의 마음을 녹이며, 예술적 감성이 천재급이다."},
  "丁巳":{i:"🔥",n:"영원의 불꽃",sub:"丁巳 · 절대 꺼지지 않는 집념",d:"천간·지지 모두 불! 한번 점화되면 절대 꺼지지 않는 집념의 화신. 목표를 정하면 지옥이 열려도 멈추지 않으며, 그 뜨거운 열정은 주변까지 불타오르게 만든다."},
  "丁未":{i:"🏮",n:"온기의 등불",sub:"丁未 · 치유의 빛",d:"늦여름 밤 길을 밝히는 따뜻한 등불처럼 주변 사람들의 마음을 따뜻하게 감싸는 힐링 오라가 상시 발동한다. 곁에 있으면 이유 없이 편안해지는 치유 능력자."},
  "丁酉":{i:"🦅",n:"돈의 흐름을 보는 매의 눈",sub:"丁酉 · 재물 투시력",d:"촛불이 보석을 비추면 숨겨진 균열까지 보이듯, 돈과 재물의 흐름을 꿰뚫어보는 비범한 투시력이 발동한다! 어디에 투자해야 하는지, 언제 빠져야 하는지 본능적으로 감지하는 재테크 천재."},
  "丁亥":{i:"🌌",n:"안개 속의 길잡이",sub:"丁亥 · 어둠을 밝히는 안내자",d:"초겨울 짙은 안개 속에서 홀로 빛나는 촛불! 모두가 길을 잃고 헤맬 때 유일하게 방향을 제시하는 지혜의 안내자. 카오스 상황에서 발동하는 위기수호 능력이 탁월하다."},

  // ═══ 戊 (무토·큰 산) 일주 ═══
  "戊寅":{i:"🏔️",n:"산림의 군주",sub:"戊寅 · 만물을 거느리는 제왕",d:"큰 산에 울창한 숲이 뒤덮인 형상! 자원을 모으고 사람을 거느리며 영토를 확장하는 타고난 경영 감각이 DNA에 새겨져 있다. 가만히 있어도 사람과 기회가 알아서 모여든다."},
  "戊辰":{i:"🌋",n:"대륙의 주인",sub:"戊辰 · 만물을 품는 포용의 땅",d:"간여지동의 토(土)! 대지 위에 대지, 끝이 보이지 않는 광활한 포용력으로 만물을 품는다. 작은 것에 흔들리지 않는 묵직한 중심 장악력이 상시 발동하며, 주변의 갈등까지 흡수해버린다."},
  "戊午":{i:"🌋",n:"활화산",sub:"戊午 · 폭발 대기 상태",d:"평소엔 조용하고 듬직한 산이지만… 한번 터지면 용암이 세상을 뒤덮는다! 인내의 한계를 넘으면 발동하는 초절정 파괴력. 화가 나면 감당 불가, 하지만 그 에너지가 곧 성공의 원동력."},
  "戊申":{i:"🏰",n:"철벽 요새",sub:"戊申 · 절대 무너지지 않는 방어력",d:"큰 산 위에 금속 갑옷까지 입은 난공불락의 요새! 멘탈이 절대 흔들리지 않으며, 어떤 비난·악재·위기가 와도 표정 하나 변하지 않는 극강의 철벽 멘탈 보유자."},
  "戊戌":{i:"🛡️",n:"대지의 결계",sub:"戊戌 · 수호 본능 발동",d:"간여지동의 토(土)! 내 영역 안에 들어온 것은 반드시 지킨다는 압도적 수호 본능. 가족·조직·국가 단위로 보호막을 펼치며, 결계 안의 것들은 어떤 외부 공격도 튕겨낸다."},
  "戊子":{i:"🔮",n:"지하수맥 탐지기",sub:"戊子 · 보이지 않는 것을 감지",d:"큰 산 아래 흐르는 지하수처럼 눈에 보이지 않는 기회와 위험을 본능적으로 감지하는 제6감이 발동한다. '뭔가 이상한데…'라는 직감이 항상 적중하는 초자연적 센서 탑재."},

  // ═══ 己 (기토·전답/비옥한 땅) 일주 ═══
  "己丑":{i:"❄️",n:"동토의 씨앗",sub:"己丑 · 최강의 인내력",d:"가장 추운 겨울 땅속에 파묻힌 씨앗! 아무도 알아주지 않는 긴 겨울을 견뎌내고 마침내 봄에 가장 아름다운 꽃을 피운다. 대기만성의 끝판왕이며, 인내력 스탯이 우주 최강."},
  "己卯":{i:"🌷",n:"비옥한 화원",sub:"己卯 · 심은 것은 반드시 피운다",d:"비옥한 전답에 봄꽃이 가득! 사람이든 사업이든 관계든, 한번 심은 것은 반드시 꽃피우는 재배 능력이 발동한다. 주변 사람의 잠재력을 끌어올리는 인재 육성 본능도 탑재."},
  "己巳":{i:"🏺",n:"도자기 가마",sub:"己巳 · 흙을 예술로 변환",d:"흙(己)과 불(巳)의 조화! 지극히 평범한 재료를 세상에 하나뿐인 명품으로 변환하는 연금술이 발동한다. 남들이 버린 것에서 가치를 발견하고, 하찮은 것을 귀하게 만드는 천재."},
  "己未":{i:"🤱",n:"어머니의 대지",sub:"己未 · 간여지동의 무한 포용",d:"천간·지지 모두 토(土)! 무한한 인내와 희생으로 주변 모든 것을 받아주는 어머니 대지. 듬직한 버팀목이 돼주며 곁에 있으면 불안 게이지가 0으로 수렴한다."},
  "己酉":{i:"🔍",n:"원석 감별사",sub:"己酉 · 숨겨진 가치를 꿰뚫다",d:"비옥한 땅 속에 묻힌 보석을 귀신같이 찾아내는 감별 능력! 사람의 숨겨진 재능, 사업의 숨은 기회, 물건의 진짜 가치를 단번에 꿰뚫어보는 '가치 투시'가 상시 발동한다."},
  "己亥":{i:"🌿",n:"늪의 치유사",sub:"己亥 · 상처를 감싸안는 포용",d:"따뜻한 흙이 차가운 물을 품듯, 상처받은 영혼을 감싸안고 치유하는 포용의 달인. 곁에 있으면 이유 없이 마음이 편해지며, 사람들이 힘들 때 가장 먼저 찾는 인간 안식처."},

  // ═══ 庚 (경금·큰 바위/거친 철) 일주 ═══
  "庚寅":{i:"⛏️",n:"개척의 도끼",sub:"庚寅 · 미개척지를 여는 파이오니어",d:"단단한 쇠가 울창한 숲을 만나면? 길이 없는 곳에 길을 내는 파이오니어 정신이 발동! 아무도 가지 않은 길에서 기회를 찾으며, 위험을 무릅쓰는 도전정신이 남다르다."},
  "庚辰":{i:"🐲",n:"용의 비늘갑옷",sub:"庚辰 · 괴강살의 무적 방어막",d:"괴강살(魁罡殺)의 폭발적 에너지! 어떤 공격이 들어와도 용의 비늘처럼 전부 튕겨내는 무적의 방어막이 발동한다. 위기 상황에서만 깨어나는 잠든 용의 기운이 체내에 흐르고 있다."},
  "庚午":{i:"⚔️",n:"벼려진 명검",sub:"庚午 · 불에 단련된 검",d:"불(午) 속에서 단련된 금속(庚)은 천하의 명검이 된다! 시련과 고난이 많을수록 더욱 날카로워지는 정신력. 인생이 힘들 때야말로 이 능력이 최대 출력으로 가동된다."},
  "庚申":{i:"⚡",n:"강철 폭풍",sub:"庚申 · 간여지동의 속도전",d:"천간·지지 모두 금(金)! 결정의 순간 0.1초의 망설임도 없는 번개 같은 실행력이 발동한다. '고민은 사치다'가 체화된 인물이며, 속전속결로 전장을 평정하는 전광석화의 전사."},
  "庚戌":{i:"🗿",n:"철의 장막",sub:"庚戌 · 괴강살의 불굴 의지",d:"괴강살의 두 번째 형태! 한번 정한 원칙은 하늘이 두 쪽 나도 절대 양보하지 않는 극강 고집이 발동한다. 신념을 위해선 세상 전체와도 맞서는 불굴의 의지를 지녔다."},
  "庚子":{i:"❄️",n:"냉철한 칼날",sub:"庚子 · 감정 제로의 분석력",d:"차가운 금속이 겨울 물에 씻기면 세상에서 가장 날카로운 칼날이 된다! 감정 개입 0%, 극한의 이성적 판단력이 발동하며, 모든 상황을 데이터로 분석하는 인간 컴퓨터."},

  // ═══ 辛 (신금·보석/귀금속) 일주 ═══
  "辛丑":{i:"💠",n:"원석의 인내",sub:"辛丑 · 세공되기까지의 고통",d:"다이아몬드가 되려면 수만 기압의 압력을 견뎌야 한다! 세상이 자신의 가치를 알아주기까지의 긴 인고의 시간을 견디는 극강 인내심. 고통을 겪을수록 보석의 빛이 밝아진다."},
  "辛卯":{i:"🥀",n:"이슬에 젖은 칼날",sub:"辛卯 · 아름다움 속의 독설",d:"꽃 위에 놓인 칼날처럼 아름다운 외모 속에 숨겨진 날카로운 혀! 예쁜 얼굴로 미소 짓다가 한마디로 상대의 급소를 찌르는 독설 스킬이 발동한다. 단, 본인은 전혀 악의 없음."},
  "辛巳":{i:"🔥",n:"용광로의 금",sub:"辛巳 · 불에 단련될수록 빛나다",d:"보석이 불 속에 들어가면 불순물이 타버리고 순금만 남는다! 시련과 역경이 올수록 본질만 남아 더 순수하고 강하게 빛나는 성장형 능력이 발동한다."},
  "辛未":{i:"🏜️",n:"사막의 다이아몬드",sub:"辛未 · 역경 속에서 빛나다",d:"아무것도 없는 메마른 사막에서 홀로 빛나는 다이아몬드! 환경이 척박할수록, 역경이 거셀수록 오히려 더 찬란하게 빛나는 역설적 빛 방출 능력이 발동한다."},
  "辛酉":{i:"👑",n:"절대 미감",sub:"辛酉 · 간여지동의 심미안",d:"천간·지지 모두 금(金)! 예술적 감각과 심미안이 인간 한계를 넘어선 극한의 미적 천재. '아름답지 않은 것은 존재할 가치가 없다'는 철학이 체내에서 상시 가동된다."},
  "辛亥":{i:"🌊",n:"심해의 진주",sub:"辛亥 · 깊은 곳의 빛나는 지혜",d:"바다 깊은 곳에서 홀로 빛나는 진주처럼, 조용히 내면을 가꿔 놀라운 지혜와 통찰을 축적하는 능력이 발동한다. 말이 적지만 한마디가 천금의 가치를 지닌 침묵의 현자."},

  // ═══ 壬 (임수·바다/대하) 일주 ═══
  "壬寅":{i:"🧭",n:"항해의 나침반",sub:"壬寅 · 미지의 바다를 탐험하다",d:"거대한 바다가 봄나무를 만나 새로운 대륙을 향해 항해를 시작한다! 미지의 영역에 대한 두려움이 제로이며, 모험과 도전에서 쾌감을 느끼는 타고난 탐험가 본능이 발동한다."},
  "壬辰":{i:"🌊",n:"쓰나미",sub:"壬辰 · 괴강살의 파괴적 추진력",d:"괴강살의 바다 버전! 한번 움직이기로 결심하면 해일처럼 모든 것을 휩쓸어버리는 파괴적 추진력이 발동한다. 평소엔 잔잔한 호수지만, 각성하면 세상을 뒤흔드는 대재앙급 에너지."},
  "壬午":{i:"🚂",n:"증기 기관",sub:"壬午 · 물+불의 무한 동력",d:"물(壬)과 불(午)이 만나면 증기가 된다! 상반된 에너지의 폭발적 변환으로 무한 동력을 생성하는 능력이 발동. 남들이 지칠 때도 혼자 달리는 무한 체력과 정신력의 소유자."},
  "壬申":{i:"🌊",n:"청룡폭포",sub:"壬申 · 높은 곳에서 쏟아지는 물",d:"높은 절벽에서 쏟아지는 폭포수처럼 막힘이 없는 실행력! 결정하면 0.5초 안에 행동으로 옮기며, 중간에 방해물이 나타나면 돌아가는 게 아니라 부수고 직진한다."},
  "壬戌":{i:"🏞️",n:"댐의 저력",sub:"壬戌 · 괴강살의 에너지 축적",d:"괴강살의 천기가 버전! 거대한 댐처럼 에너지를 끝없이 축적했다가 최적의 타이밍에 수문을 열어 폭발시키는 천기적 능력. 준비된 한 방이 세상을 바꾸는 결정타가 된다."},
  "壬子":{i:"🐋",n:"심해의 제왕",sub:"壬子 · 간여지동의 무한 심연",d:"천간·지지 모두 수(水)! 깊이를 알 수 없는 압도적 내면 세계를 보유한 심해의 지배자. 속마음을 절대 드러내지 않으며, 그 미스터리함이 오히려 사람을 끌어당기는 블랙홀이 된다."},

  // ═══ 癸 (계수·이슬비/옹달샘) 일주 ═══
  "癸丑":{i:"🧊",n:"얼음 아래 흐르는 물",sub:"癸丑 · 정적 속의 역동",d:"겉은 완전히 얼어붙어 미동도 없지만, 얼음 아래에서는 끊임없이 물이 흐르고 있다! 표정은 무(無)인데 머릿속은 슈퍼컴퓨터가 돌아가는 스텔스 두뇌 가동 능력."},
  "癸卯":{i:"🌧️",n:"봄비의 축복",sub:"癸卯 · 주변을 성장시키는 빗물",d:"따스한 봄비가 꽃밭을 적시듯 주변 사람 모두의 성장을 촉진하는 자양분 공급 능력! 옆에 있으면 왠지 모르게 자기계발 의욕이 솟구치며, 인재를 키우는 천재 멘토."},
  "癸巳":{i:"🌈",n:"무지개 생성기",sub:"癸巳 · 물과 빛의 교차점",d:"물(癸)과 불(巳)이 교차하면 무지개가 탄생한다! 상반된 것들을 조합해 아무도 예상 못 한 환상적인 아이디어를 창출하는 능력이 발동. 발상의 전환이 일상인 창의력 폭주형."},
  "癸未":{i:"🏝️",n:"사막의 오아시스",sub:"癸未 · 극한 환경 적응력",d:"뜨겁고 메마른 사막 한복판에서도 살아남는 극한의 적응 능력! 어떤 열악한 환경에 던져져도 물 한 모금으로 살아남으며, 위기를 안식처로 바꾸는 서바이벌 천재."},
  "癸酉":{i:"🔬",n:"이슬의 렌즈",sub:"癸酉 · 진실을 확대하는 물방울",d:"이슬방울이 렌즈가 되어 보이지 않는 진실까지 확대해 보여주는 통찰력! 대화 한마디, 표정 하나에서 상대방의 진짜 속마음을 읽어내는 인간 거짓말 탐지기 능력이 발동."},
  "癸亥":{i:"♾️",n:"무한의 수원",sub:"癸亥 · 간여지동의 무한 영감",d:"천간·지지 모두 수(水)! 마르지 않는 영원한 영감의 원천을 보유한 창조력의 화신. 아이디어가 끊임없이 샘솟으며, 하나의 생각에서 수천 가지 가능성이 파생되는 무한 사고 체계."}
};

/* 오행별 치비 아바타.
   이전 버전은 96×112 안에 망토·검·방패·흉갑·부츠까지 욱여넣은 갑옷 기사였다. 크기 대비
   디테일이 과해 형태가 뭉개졌고, 4×5px 타원 눈에는 표정이 없었다. 2.2등신(머리가 전체의
   약 45%)·큰 눈·볼터치의 단순한 실루엣으로 다시 그린다.
   viewBox 는 96×112 그대로다 — .sk-hero-wrap/.sk-hero-svg 의 크기 지정과 skHeroBob
   애니메이션이 이 비율에 맞춰져 있다. 그라디언트 id 에 오행을 섞는 것도 유지한다(한 페이지에
   여러 아바타가 있어도 defs 가 서로를 덮어쓰지 않게 하는 장치).
   팔레트는 딥 플럼 바탕 위에서 다시 고른 값이다. 예전 금(#8fa5b5)·토(#a07445)는 플럼 위에서
   탁하게 가라앉아 실루엣이 안 보였다. */
function _buildHeroSVG(elColor){
  var CHARM={
    wood:'<path d="M0 8 V-1" stroke="{deep}" stroke-width="1.8" stroke-linecap="round"/><path d="M0 1 C-4 1 -6 -2 -5.5 -5 C-2 -5.4 0 -3 0 1Z" fill="{main}"/><path d="M0 4 C4 4 6 1 5.5 -2 C2 -2.4 0 0 0 4Z" fill="{glow}"/>',
    /* 불꽃은 좌우대칭으로 그리면 물방울과 구분이 안 된다. 안쪽에 말린 심지를 하나 넣는다. */
    fire:'<path d="M.6 -9 C4 -4.6 6.2 -2 6.2 1.4 C6.2 5.2 3.4 8.4 0 8.4 C-3.4 8.4 -6.4 5.6 -6 1.6 C-5.7 -1.2 -4.2 -3 -3 -5.2 C-2.3 -2.4 -1 -1.4 .2 -2 C1 -4.4 1.2 -6.6 .6 -9Z" fill="url(#{id}Charm)"/><path d="M0 -1 C2 1 2.8 3 2.4 4.8 C2 6.6 .4 7 -.8 6.2 C-2 5.4 -2.2 3.4 -1.4 1.8 C-1 1 -.6 .2 0 -1Z" fill="{glow}" fill-opacity=".9"/>',
    earth:'<path d="M0 -8.5 L8.5 7 H-8.5 Z" fill="url(#{id}Charm)"/><path d="M0 -8.5 L-8.5 7 H-1.4 Z" fill="{main}" fill-opacity=".55"/>',
    metal:'<path d="M0 -7 C4 -7 6.5 -3.5 6.5 1 L7.5 4.5 H-7.5 L-6.5 1 C-6.5 -3.5 -4 -7 0 -7Z" fill="url(#{id}Charm)"/><circle cx="0" cy="6.8" r="2" fill="{deep}"/>',
    water:'<path d="M0 -9 C5 -3 7 .5 7 3.5 C7 7.1 3.9 10 0 10 C-3.9 10 -7 7.1 -7 3.5 C-7 .5 -5 -3 0 -9Z" fill="url(#{id}Charm)"/>',
    'void':'<path d="M0 -8 L2.2 -2.2 L8 0 L2.2 2.2 L0 8 L-2.2 2.2 L-8 0 L-2.2 -2.2Z" fill="url(#{id}Charm)"/>'
  };
  var key=CHARM[elColor]?elColor:'void';
  var palette={
    wood:{main:'#7fd88f',deep:'#2f8f56',glow:'#ddffc0'},
    fire:{main:'#ff9e6b',deep:'#c4462c',glow:'#ffd9a8'},
    earth:{main:'#e8c48a',deep:'#a3703e',glow:'#fff0cd'},
    metal:{main:'#bcd6ea',deep:'#5c7c96',glow:'#f4fbff'},
    water:{main:'#7fc8ff',deep:'#2b60a8',glow:'#d3f1ff'},
    'void':{main:'#f0abfc',deep:'#8b5cf6',glow:'#ffe7a8'}
  }[key];
  var main=palette.main,deep=palette.deep,glow=palette.glow;
  var skin='#ffe3d2',ink='#2a1520';
  var id='skHero'+String(elColor||'void').replace(/[^a-z0-9]/gi,'');
  var charm=CHARM[key]
    .replace(/\{id\}/g,id)
    .replace(/\{main\}/g,main)
    .replace(/\{deep\}/g,deep)
    .replace(/\{glow\}/g,glow);
  return '<div class="sk-hero-wrap">'
    +'<div class="sk-hero-glow" style="background:'+main+'"></div>'
    +'<svg class="sk-hero-svg" viewBox="0 0 96 112" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + _sajuEngineText("se_8233_attr_aria_label") + '">'
    +'<defs>'
    +'<linearGradient id="'+id+'Robe" x1="24" y1="62" x2="72" y2="104"><stop offset="0" stop-color="'+main+'"/><stop offset="1" stop-color="'+deep+'"/></linearGradient>'
    +'<linearGradient id="'+id+'Hood" x1="21" y1="14" x2="75" y2="42"><stop offset="0" stop-color="'+main+'"/><stop offset="1" stop-color="'+deep+'"/></linearGradient>'
    +'<radialGradient id="'+id+'Charm" cx="42%" cy="30%" r="72%"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="'+glow+'"/><stop offset="1" stop-color="'+main+'"/></radialGradient>'
    +'<filter id="'+id+'Glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    +'</defs>'
    +'<ellipse cx="48" cy="107" rx="23" ry="4.2" fill="rgba(0,0,0,.32)"/>'
    /* 발 → 로브 → 소매 → 손 순서. 뒤 요소가 앞 요소를 덮어 실루엣이 정리된다. */
    +'<ellipse cx="40" cy="103.6" rx="6" ry="3.4" fill="'+deep+'"/>'
    +'<ellipse cx="56" cy="103.6" rx="6" ry="3.4" fill="'+deep+'"/>'
    +'<path d="M35 63 H61 C67 63 71 69 72 77 L74 95 C74.6 99 72 101.5 68 101.5 H28 C24 101.5 21.4 99 22 95 L24 77 C25 69 29 63 35 63Z" fill="url(#'+id+'Robe)"/>'
    /* 옷깃은 턱 아래(머리 타원 y=65 바깥)에 둬야 보인다. 더 위에 그리면 머리에 가려 사라진다. */
    +'<path d="M40 66.5 C43.4 71.8 52.6 71.8 56 66.5" fill="none" stroke="'+glow+'" stroke-opacity=".45" stroke-width="2.4" stroke-linecap="round"/>'
    +'<path d="M25 74 C19 77 17 83 19 88" fill="none" stroke="'+main+'" stroke-width="8.5" stroke-linecap="round"/>'
    +'<path d="M71 74 C77 77 79 83 77 88" fill="none" stroke="'+main+'" stroke-width="8.5" stroke-linecap="round"/>'
    /* 소매 끝단 — 이게 없으면 손이 몸통에서 떨어져 나온 점처럼 보인다. */
    +'<path d="M15.4 86.2 H22.6" stroke="'+deep+'" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>'
    +'<path d="M73.4 86.2 H80.6" stroke="'+deep+'" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>'
    +'<circle cx="19" cy="89.5" r="4.2" fill="'+skin+'"/>'
    +'<circle cx="77" cy="89.5" r="4.2" fill="'+skin+'"/>'
    /* 머리는 전체 높이의 45% — 치비 비율의 핵심이다. */
    +'<ellipse cx="48" cy="40" rx="27" ry="25" fill="'+skin+'"/>'
    /* 후드는 얼굴 옆으로 내려오는 자락이 있어야 모자로 읽힌다. 위만 덮으면 수영모가 된다. */
    +'<path d="M48 12 C63.5 12 76 24.4 76 40 L76 48 C76 50.2 74.2 52 72 52 C69.8 52 68 50.2 68 48 L68 39.4 C65.6 34.4 57.6 31 48 31 C38.4 31 30.4 34.4 28 39.4 L28 48 C28 50.2 26.2 52 24 52 C21.8 52 20 50.2 20 48 L20 40 C20 24.4 32.5 12 48 12Z" fill="url(#'+id+'Hood)"/>'
    +'<circle cx="48" cy="23.5" r="3.2" fill="'+glow+'"/>'
    +'<circle cx="48" cy="23.5" r="1.5" fill="'+deep+'"/>'
    +'<path d="M48 12.4 C46.6 7.6 49.6 4.2 53.4 5.2" fill="none" stroke="'+deep+'" stroke-width="2.4" stroke-linecap="round"/>'
    +'<path d="M32.6 34.6 C35.2 32.9 39.2 32.9 42.2 34.2" fill="none" stroke="'+deep+'" stroke-opacity=".7" stroke-width="1.8" stroke-linecap="round"/>'
    +'<path d="M53.8 34.2 C56.8 32.9 60.8 32.9 63.4 34.6" fill="none" stroke="'+deep+'" stroke-opacity=".7" stroke-width="1.8" stroke-linecap="round"/>'
    +'<ellipse cx="38.5" cy="44" rx="5.4" ry="6.4" fill="'+ink+'"/>'
    +'<ellipse cx="57.5" cy="44" rx="5.4" ry="6.4" fill="'+ink+'"/>'
    +'<circle cx="36.6" cy="41.5" r="2.1" fill="#ffffff"/>'
    +'<circle cx="55.6" cy="41.5" r="2.1" fill="#ffffff"/>'
    +'<circle cx="40.3" cy="46.8" r="1.1" fill="#ffffff" fill-opacity=".82"/>'
    +'<circle cx="59.3" cy="46.8" r="1.1" fill="#ffffff" fill-opacity=".82"/>'
    +'<ellipse cx="29.6" cy="50.5" rx="4.6" ry="2.6" fill="'+main+'" fill-opacity=".55"/>'
    +'<ellipse cx="66.4" cy="50.5" rx="4.6" ry="2.6" fill="'+main+'" fill-opacity=".55"/>'
    +'<path d="M45 52.6 C46.6 54.8 49.4 54.8 51 52.6" fill="none" stroke="'+ink+'" stroke-width="1.8" stroke-linecap="round"/>'
    +'<g transform="translate(80,24)" filter="url(#'+id+'Glow)">'+charm+'</g>'
    +'</svg>'
    +'</div>';
}

function renderSkillTree(p, natal){
  var area=document.getElementById('skillTreeSection');
  if(!area)return;
  _ensureSkillTreeRpgStyle();
  var card=document.getElementById('skillTreeCard');
  if(card){
    card.style.display='';
    card.setAttribute('data-skilltree-ui-marker','skilltree-rpg-v20260613');
  }
  area.setAttribute('data-skilltree-ui-marker','skilltree-rpg-v20260613');
  var dg=p.d.g;
  var pw=G_POWER, jg=G_JONG;
  var dayEl=(GAN[dg]&&GAN[dg].e)||'earth';
  var elKo={wood:'목',fire:'화',earth:'토',metal:'금',water:'수'};
  var seasonEl=(p.m&&JI[p.m.j]&&JI[p.m.j].e)||'';
  var seasonName=seasonEl?(elKo[seasonEl]||seasonEl):'미정';
  function _rpgEsc(v){
    return String(v==null?'':v).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]||ch;
    });
  }
  var tsCnt={},tsWeighted={};
  function addTenGodWeight(c,weight){
    var t=getTenGod(dg,c);
    if(t&&t!=='?'&&t!=='일간'){
      tsCnt[t]=(tsCnt[t]||0)+1;
      tsWeighted[t]=(tsWeighted[t]||0)+weight;
    }
  }
  [
    {c:p.y&&p.y.g,w:.7},{c:p.y&&p.y.j,w:.8},
    {c:p.m&&p.m.g,w:1.4},{c:p.m&&p.m.j,w:2},
    {c:p.d&&p.d.j,w:1.1},
    {c:p.h&&p.h.g,w:1},{c:p.h&&p.h.j,w:.9}
  ].forEach(function(slot){
    addTenGodWeight(slot.c,slot.w);
  });
  var grp={
    bija:(tsWeighted['비견']||0)+(tsWeighted['겁재']||0),
    sik:(tsWeighted['식신']||0)+(tsWeighted['상관']||0),
    jae:(tsWeighted['편재']||0)+(tsWeighted['정재']||0),
    gwan:(tsWeighted['편관']||0)+(tsWeighted['정관']||0),
    inp:(tsWeighted['편인']||0)+(tsWeighted['정인']||0)
  };
  var topGrp='bija',topVal=0;
  for(var gk in grp){if(grp[gk]>topVal){topVal=grp[gk];topGrp=gk;}}
  var clsMap={
    '甲':{base:'봄의 개척자',emoji:'🗡️'},
    '乙':{base:'바람의 탐험가',emoji:'🏹'},
    '丙':{base:'태양의 마법사',emoji:'🔥'},
    '丁':{base:'불꽃의 치유사',emoji:'✨'},
    '戊':{base:'대지의 파수꾼',emoji:'🛡️'},
    '己':{base:'땅의 연금술사',emoji:'⚗️'},
    '庚':{base:'강철의 기사',emoji:'⚔️'},
    '辛':{base:'수정의 암살자',emoji:'🔮'},
    '壬':{base:'심해의 현자',emoji:'🌊'},
    '癸':{base:'안개의 신관',emoji:'🌙'}
  };
  var sufMap={bija:'독립 영웅',sik:'창조 마에스트로',jae:'황금 군주',gwan:'규율의 지배자',inp:'위대한 현자'};
  var cls=clsMap[dg]||{base:'신비의 모험가',emoji:'⚡'};
  var coreClass=cls.emoji+' '+cls.base+' / '+sufMap[topGrp];
  var groupName={bija:'자아',sik:'창조',jae:'자원',gwan:'질서',inp:'지혜'}[topGrp]||'운명';
  var rank=topVal>=3.4?'S+':(topVal>=2.2?'S':'A');
  var chapter=Math.min(99,Math.max(1,CURRENT_AGE-1));
  var expPct=(chapter%10)*10;
  var elColor={wood:'#4CAF50',fire:'#FF5722',earth:'#A1887F',metal:'#78909C',water:'#1E88E5'};
  var elIcon={wood:'🌿',fire:'🔥',earth:'⛰️',metal:'⚔️',water:'💧'};
  var elName={wood:'창의력',fire:'카리스마',earth:'안정성',metal:'결단력',water:'직관력'};
  var statBars='';
  ['wood','fire','earth','metal','water'].forEach(function(el){
    var pct=Math.round(natal.ratios[el]||0);
    statBars+='<div class="sk-stat-row">'
      +'<div class="sk-stat-label">'+elIcon[el]+' '+elName[el]+'</div>'
      +'<div class="sk-stat-bar-wrap"><div class="sk-stat-bar-fill" style="--sk-stat:'+pct+'%;--sk-el-color:'+elColor[el]+'"></div></div>'
      +'<div class="sk-stat-val">'+pct+'%</div>'
      +'</div>';
  });
  var orbitHtml='<div class="sk-orbit-map" aria-label="' + _sajuEngineText("se_8358_attr_aria_label") + '">'
    +'<div class="sk-orbit-core">운명의<br>힘</div>'
    +['metal','wood','water','fire','earth'].map(function(el){
      var pct=Math.round(natal.ratios[el]||0);
      return '<div class="sk-orbit-node sk-orbit-node--'+el+'" style="--sk-orbit-color:'+elColor[el]+'"><b>'+elIcon[el]+'</b>'+elName[el]+'<span>'+pct+'%</span></div>';
    }).join('')
    +'</div>';
  var skillDB={
    bija:{m:{i:'⚔️',n:'자아 결집',d:'홀로서기의 전투 기술. 독립 의지와 경쟁 에너지를 극한으로 끌어올린다.',tp:'ACTIVE'},o:{i:'🛡️',n:'자아회복',d:'쓰러져도 다시 일어서는 끈질긴 생명력 패시브.'}},
    sik:{m:{i:'🎨',n:'표현의 연금술',d:'아이디어를 황금으로 변환하는 창조 마법. 말·글·예술이 최강 무기가 된다.',tp:'ACTIVE'},o:{i:'💡',n:'창조적 폭발',d:'식상 에너지가 정점에 달할 때 폭발적 혁신이 터진다.'}},
    jae:{m:{i:'💰',n:'황금의 손',d:'재원을 끌어당기고 기회를 현금화하는 절대 스킬. 타이밍이 생명.',tp:'ACTIVE'},o:{i:'📈',n:'자원 정렬',d:'가진 것을 최대로 쥐어짜는 효율 극대화 패시브.'}},
    gwan:{m:{i:'👑',n:'절대 규율',d:'조직을 통솔하고 질서를 세우는 지배자의 권능. 카리스마 +100.',tp:'ACTIVE'},o:{i:'🌟',n:'지배자의 오라',d:'존재 자체로 신뢰와 권위를 발산하는 상시 발동 패시브.'}},
    inp:{m:{i:'📚',n:'지혜의 결정',d:'깊은 사유와 통찰로 본질을 꿰뚫는 앎의 권능. 경험치 2배 획득.',tp:'ACTIVE'},o:{i:'💫',n:'생명력 회복',d:'인성 기운이 몸과 마음을 끊임없이 재충전하는 회복 스킬.'}}
  };
  var lockedDB={
    bija:{i:'🔒',n:'동료 결집',d:'비겁 약함 → 타인과 협력하는 힘 잠김. 친구·동료 네트워크 구축이 해금 키.'},
    sik:{i:'🔒',n:'표현의 연금술',d:'식상 약함 → 자기표현·창의력 잠김. 말하기·글쓰기·예술 투자로 해금 가능.'},
    jae:{i:'🔒',n:'황금의 손',d:'재성 약함 → 재물 스킬 잠김. 재무 지식·투자 공부로 해금 가능.'},
    gwan:{i:'🔒',n:'사회적 방패',d:'관성 약함 → 조직·규율 스킬 잠김. 책임감·약속 지키기로 해금 가능.'},
    inp:{i:'🔒',n:'지혜의 기록',d:'인성 약함 → 학습·수용 스킬 잠김. 꾸준한 독서와 공부가 해금의 열쇠.'}
  };
  var masterSk=skillDB[topGrp].m;
  var ownedHtml='';
  for(var gok in grp){
    if(gok!==topGrp&&grp[gok]>=1){
      var osk=skillDB[gok].o;
      ownedHtml+='<div class="sk-item sk-owned sk-node sk-node--owned sk-node--'+gok+'"><span class="sk-icon sk-node-icon">'+osk.i+'</span><div><div class="sk-name">'+osk.n+'</div><div class="sk-desc">'+osk.d+'</div></div></div>';
    }
  }
  if(!ownedHtml)ownedHtml='<div class="sk-empty">추가 보유 스킬 없음</div>';
  var lockedHtml='';
  for(var glk in grp){
    if(grp[glk]===0){
      var lsk=lockedDB[glk];
      lockedHtml+='<div class="sk-item sk-locked sk-node sk-node--locked sk-node--'+glk+'"><span class="sk-icon sk-node-icon">🔒</span><div><div class="sk-name">'+lsk.n+' <span class="sk-type-badge">LOCKED</span></div><div class="sk-desc">'+lsk.d+'</div></div></div>';
    }
  }
  if(!lockedHtml)lockedHtml='<div class="sk-empty">잠긴 스킬 없음 🎉</div>';
  var yongshinList=(pw&&pw.yongshin)||[];
  var kijishinList=(pw&&pw.kijishin)||[];
  var yearGanArr=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var yearJiArr=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var nowYear=_skillNowYear();
  var yearStem=yearGanArr[((nowYear-4)%10+10)%10];
  var yearBranch=yearJiArr[((nowYear-4)%12+12)%12];
  var yearGanji=yearStem+yearBranch;
  var annualEl=(GAN[yearStem]&&GAN[yearStem].e)||'fire';
  var annualElName=elKo[annualEl]||annualEl;
  var growthAxisName=yongshinList.length?yongshinList.map(function(e){return elKo[e]||e;}).join('·'):(seasonName||'균형');
  var isSeGood=yongshinList.indexOf(annualEl)>=0||(jg&&jg.isJong&&jg.dominant===annualEl);
  var isSeHard=kijishinList.indexOf(annualEl)>=0;
  var levelUpText=isSeGood
    ?nowYear+'년 <b>'+yearGanji+' 세운</b>은 당신의 성장축인 <b>'+growthAxisName+'</b>과 맞물린다. 이번 해는 <span class="sk-hl">주력 스킬 전개 시즌</span> — <b>'+masterSk.n+'</b>을 현실 행동으로 옮길수록 운의 문이 빠르게 열린다.'
    :(isSeHard
      ?nowYear+'년 <b>'+yearGanji+' 세운</b>의 <b>'+annualElName+' 기운</b>은 사주 구조를 예민하게 흔들 수 있다. 무리한 확장보다 <span class="sk-hl">조절 스킬과 회복 루틴</span>을 먼저 세우면, 막힌 흐름이 차분히 풀린다.'
      :nowYear+'년 <b>'+yearGanji+' 세운</b>은 중립의 문을 여는 해다. <span class="sk-hl">잠긴 스킬 해금</span>과 기본기 축적에 집중하면, 다음 운의 파도가 왔을 때 더 크게 올라설 수 있다.');
  var levelUpTitle='🎯 '+nowYear+' 레벨업 천기 ('+yearGanji+' 세운 기준)';
  var heroSVG=_buildHeroSVG(dayEl);
  // ─── 일주 고유능력 (INNATE ABILITY) 조회 ───
  var iljuKey=p.d.g+p.d.j;
  var innateData=ILJU_INNATE_DB[iljuKey];
  var innateHtml='';
  if(innateData){
    innateHtml='<div class="sk-innate-section">'
      +'<div class="sk-innate-label">일주 고유능력</div>'
      +'<div class="sk-innate-item">'
      +'<span class="sk-innate-icon">'+innateData.i+'</span>'
      +'<div>'
      +'<div class="sk-innate-name">'+innateData.n+' <span class="sk-innate-type">PASSIVE</span></div>'
      +'<div class="sk-innate-sub">'+innateData.sub+'</div>'
      +'<div class="sk-innate-desc">'+innateData.d+'</div>'
      +'</div>'
      +'</div>'
      +'</div>';
  }
  area.innerHTML='<div class="skill-wrap" data-skilltree-ui-marker="skilltree-rpg-v20260613">'
    +'<div class="sk-header sk-rpg-hero">'
    +'<div class="sk-rpg-copy">'
    +'<div class="sk-game-badge">사주 RPG</div>'
    +'<div class="sk-main-title">인생 스킬 트리</div>'
    +'<div class="sk-sub-title">運命 SKILL TREE · 사주 기반 캐릭터 시트</div>'
    +'<div class="sk-rpg-command-row">'
    +'<span class="sk-rpg-chip">RANK '+_rpgEsc(rank)+'</span>'
    +'<span class="sk-rpg-chip">MAIN '+_rpgEsc(groupName)+'</span>'
    +'<span class="sk-rpg-chip">월령 '+_rpgEsc(seasonName)+'</span>'
    +'<span class="sk-rpg-chip">성장축 '+_rpgEsc(growthAxisName)+'</span>'
    +'<span class="sk-rpg-chip">'+(pw&&pw.isStrong?'신강형':'신약형')+'</span>'
    +(jg&&jg.isJong?'<span class="sk-rpg-chip">종격 모드</span>':'')
    +'</div>'
    +'</div>'
    +heroSVG
    +'</div>'
    +'<div class="sk-sheet sk-rpg-sheet">'
    +'<div>'
    +'<div class="sk-class-label">운명 클래스</div>'
    +'<div class="sk-class-name">'+_rpgEsc(coreClass)+'</div>'
    +'<div class="sk-level-wrap">'
    +'<div class="sk-lv-badge">CH. <span>'+_rpgEsc(chapter)+'</span></div>'
    +'<div class="sk-exp-wrap"><div class="sk-exp-bar" style="width:'+expPct+'%"></div></div>'
    +'<div class="sk-exp-label">성장 흐름 '+_rpgEsc(expPct)+' / 100 &nbsp;→&nbsp; CH.'+_rpgEsc(chapter+1)+'</div>'
    +'</div>'
    +'<div class="sk-day-badge">일간: <b>'+_rpgEsc(dg)+'</b> ('+_rpgEsc((GAN[dg]||{}).n||'')+') &nbsp;·&nbsp; 월령 '+_rpgEsc(seasonName)+' &nbsp;·&nbsp; '+(pw&&pw.isStrong?'⬆️ 신강':'⬇️ 신약')+(jg&&jg.isJong?' &nbsp;·&nbsp; 🌀 종격':'')+'</div>'
    +'</div>'
    +'<div>'
    +'<div class="sk-stat-title">오행 스탯</div>'
    +statBars
    +'</div>'
    +'</div>'
    +orbitHtml
    +innateHtml
    +'<div class="sk-tree-wrap" aria-label="' + _sajuEngineText("se_8468_attr_aria_label") + '">'
    +'<div class="sk-tree-section sk-tree-section--master">'
    +'<div class="sk-tree-label">주력 스킬</div>'
    +'<div class="sk-item sk-master sk-node sk-node--master"><span class="sk-icon sk-node-icon">'+masterSk.i+'</span><div><div class="sk-name">'+masterSk.n+' <span class="sk-type-badge">'+(masterSk.tp||'ACTIVE')+'</span></div><div class="sk-desc">'+masterSk.d+'</div></div></div>'
    +'</div>'
    +'<div class="sk-tree-section sk-tree-section--owned">'
    +'<div class="sk-tree-label">보유 스킬</div>'
    +ownedHtml
    +'</div>'
    +'<div class="sk-tree-section sk-tree-section--locked">'
    +'<div class="sk-tree-label">잠긴 스킬</div>'
    +lockedHtml
    +'</div>'
    +'</div>'
    +'<div class="sk-levelup">'
    +'<div class="sk-levelup-title">'+_rpgEsc(levelUpTitle)+'</div>'
    +'<div class="sk-levelup-text">'+levelUpText+'</div>'
    +'</div>'
    +'</div>';
}
