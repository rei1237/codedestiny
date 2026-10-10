// Synthetic saved payloads shaped like the existing service responses, never live records.
export const finalBody = '저장된 마지막 문장까지 읽을 수 있습니다.';
const chapter = {title:'마지막 장',body:finalBody};
const pillars = {yearPillar:'갑자',monthPillar:'을축',dayPillar:'병인',hourPillar:'정묘'};
const chart = {activeGates:[],channels:[],activations:[],definedCenters:[],undefinedCenters:['head','ajna','throat','g','heart','spleen','solarPlexus','sacral','root'],layers:{personality:[],design:[]},definitionComponents:[],type:'Reflector',strategy:'Wait a lunar cycle',authority:'Lunar',profile:'1/3',definition:'None',incarnationCross:{gates:{},notation:''},warnings:[]};
const ziweiChart={palaces:['자','축','인','묘','진','사','오','미','신','유','술','해'].map((branch,index)=>({branch,name:['명궁','형제','부부','자녀','재백','질액','천이','노복','관록','전택','복덕','부모'][index],majorStars:[{name:'자미'}]}))};
const cards=[{cardId:'major-0',nameKo:'바보',nameEn:'The Fool',orientation:'upright',positionLabel:'현재'},{cardId:'major-17',nameKo:'별',nameEn:'The Star',orientation:'upright',positionLabel:'다음 선택'}];
const base={sections:[chapter]};
export const additionalSourceFixtures = {
 'new-year':{messages:[{role:'assistant',content:finalBody}],sajuResult:pillars},
 karma:{chapters:[{id:'one',order:1,title:'첫 장',content:'저장된 첫 문장'},{id:'last',order:2,title:'마지막 장',content:finalBody,evidence:[]}],finalLetter:'저장된 편지'},
 ziwei:{ziweiChart,messages:[{role:'assistant',content:finalBody}]},
 'ziwei-deep':{ziweiChart,chapters:[chapter]},
 'love-secret':{sajuResult:pillars,sections:[chapter]},
 'life-book':{sajuResult:pillars,messages:[{role:'assistant',content:finalBody}]},
 'sukuyo-compat':{meta:{person_a:{name:'나',sukuyo:'각숙',sukuyo_hanja:'角',element:'목',yin_yang:'양',guardian:'청룡',keyword:'시작'},person_b:{name:'상대',sukuyo:'항숙',sukuyo_hanja:'亢',element:'금',yin_yang:'음',guardian:'청룡',keyword:'조율'},relation:{type_a_to_b:'안',type_b_to_a:'괴',distance:'근거리',intensity:'보통'},scores:{destiny:15,harmony:15,emotion:15,growth:15,stability:15,total:75}},sections:[chapter]},
 vedic:{vedicChart:{lagna:{name:'Virgo'},moonNakshatra:{name:'Punarvasu'}},messages:[{role:'assistant',content:finalBody}]},
 nakshatra:{decks:{consultation:[{id:'opening',title:'두 별의 흐름',body:'저장된 달의 근거'},{id:'last',...chapter,vedicEvidence:'저장된 베다 근거',sukuyoEvidence:'저장된 숙요 근거'}]},natal:{sukuyoKo:'각숙',sukuyoHan:'角',nakshatraKo:'푸나르바수',pada:2,lordKo:'목성'}},
 compass:{sections:[{key:'last',order:10,...chapter}]},
 'human-design':{basis:{chart},sections:[chapter]},
 'human-design-chart':{calculation:chart,summary:finalBody},
 'human-design-reading':{calculation:chart,sections:[chapter]},
 relationship:{grade:'low',score:34,character:{title:'관계의 약속',caption:'저장된 관계 패턴'},summary:'상대의 마음을 단정하지 않습니다.',scoreFactors:['경계와 간격을 함께 살펴봅니다.'],sections:[chapter],finalMessage:'저장된 마지막 조언'},
 executions:{chapters:[chapter]},
 'paid-results':{chapters:[chapter]},
 'legacy-naming':{generatedResult:finalBody,nameCards:[{name:'서연',hanja:'瑞姸',meaning:'저장된 이름의 의미'}]},
};
export const sharedFeatureFixtures = {
 saju_ai_prompt_generator:{sajuResult:pillars,...base},
 vedic_prashna_prompt:{prashnaResult:{chart:{lagna:{name:'Virgo'}},promptText:finalBody}},
 'premium-naming-prompt':additionalSourceFixtures['legacy-naming'],
 'tarot-year-fortune':{cards,reading:{overall:finalBody}},
 ziwei_ai_prompt_generator:{ziweiChart,...base},
 sukuyo_ai_prompt_generator:{sukuyoResult:{relationType:'안괴'},...base},
 'compat-sukuyo-compatibility':{sukuyoResult:{relation:'안괴',mansion:'나 각숙 · 상대 항숙'},...base},
 'premium-sukuyo-compat-extra':{sukuyoResult:{relation:'안괴'},...base},
 'sukuyo-past-life-reading':{title:'숙요 전생 인연 리딩',summary:'저장된 요약',pastLifeStory:finalBody},
 astrology_ai_prompt_generator:{astrologyChart:{planets:{sun:{sign:'Aries',degree:21.4,house:10}},houseCusps:Array.from({length:12},(_,i)=>i*30),ascendant:{longitude:0}},...base},
 vedic_ai_prompt_generator:{vedicChart:{lagna:{rashi:'Virgo',degree:12,nakshatra:'Hasta',pada:2},grahas:[{name:'Sun',rashi:'Aries',degree:21.4,bhava:8,nakshatra:'Bharani',pada:3},{name:'Moon',rashi:'Cancer',degree:3.2,bhava:11,nakshatra:'Punarvasu',pada:4}],moonNakshatra:{name:'Punarvasu',pada:4,lord:'Jupiter'},bhavas:Array.from({length:12},(_,i)=>({house:i+1,rashi:['Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces','Aries','Taurus','Gemini','Cancer','Leo'][i],grahas:i===7?['Sun']:i===10?['Moon']:[],meaning:'저장된 하우스 근거'})),vimshottariDasha:{currentMahadasha:{lord:'Jupiter',startDate:'2020-01-01',endDate:'2036-01-01'},periods:[{lord:'Rahu',startDate:'2002-01-01',endDate:'2020-01-01',durationYears:18},{lord:'Jupiter',startDate:'2020-01-01',endDate:'2036-01-01',durationYears:16},{lord:'Saturn',startDate:'2036-01-01',endDate:'2055-01-01',durationYears:19}]}},reading:{scores:{dharma:65},sections:{overview:chapter}}},
 'tarot-love-relationship':{cards,reading:{overall:finalBody}},
 'tarot-mindscan':{cards,reading:{intro:'저장된 상황',sections:[{title:'마음의 흐름',content:finalBody}],masterAdvice:'저장된 행동 조언'}},
 'tarot-prompt-maker':{cards,coreQuestion:'저장된 질문',bigPicture:'저장된 흐름',positionReadings:[{positionOrder:1,headline:'현재의 선택',reading:finalBody}],cardSynergies:[{pairLabel:'현재와 선택',insight:'저장된 카드 연결'}],timeline:{now:'저장된 현재 흐름'},actions:['대화의 간격을 두세요.']},
 'dream-psycho-analysis':{record:{markdown:'## 꿈의 마지막 장\n\n'+finalBody}},
 'animal-totem-basic':{cards:[{animalId:'cat',animalName:'고양이',essence:'여유와 관찰'}],narrative:{opening:'저장된 시작',question_answer:finalBody,action_plan:['오늘의 관찰을 기록하세요.'],closing:'저장된 마무리'}},
 geomancy:{cards:{cause:{role:'원인',korean:'길',english:'Via',symbol:'⠿',meaning:'저장된 의미'},flow:{role:'흐름',korean:'기쁨',meaning:'저장된 흐름'},judge:{role:'신탁',korean:'길',meaning:'저장된 신탁'}},answer:finalBody,keyJudgement:'저장된 핵심 판단',energyFlow:'저장된 흐름',risk:'저장된 주의점',timing:'저장된 시기',actionTip:'저장된 행동 조언'},
 'yoga-guru-per-use':{course_metadata:{title:'저장된 수련',duration_min:30,focus_area:'안정된 호흡',deity_theme:'균형',chakra_focus:'중심'},sequence:[{step_number:1,type:'Warmup',sanskrit_name:'Tadasana',english_name:'Mountain pose',duration_seconds:60,instructions:['저장된 안내'],breathing_guide:'천천히 호흡하세요.',benefits_physical:'몸의 흐름',benefits_spiritual:'마음의 흐름',caution:'무리하지 마세요.',visual_cue_ui:'편안하게 서기'}],closing_mantra:finalBody},
 'pet-saju-ai-consultation':{report:{personality:[finalBody],habitats:[{title:'편안한 자리',body:'저장된 자리 해석'}],plays:['저장된 놀이'],coach:'저장된 조언',care:'저장된 돌봄'}},
 'pet-compatibility-ai':{reading:{verdict:finalBody,overview:['저장된 관계 해석'],dimensions:[{title:'관계의 거리',body:'저장된 근거'}],places:[{title:'함께할 자리',body:'저장된 장소'}],cautions:['서로의 간격을 존중하세요.'],routine:'저장된 하루'}},
 'fortune-chat-consultation':{answer:finalBody},
 'palm-reading-general':{report:{oneLiner:'저장된 손금',love:'저장된 연애 흐름',wealth:'저장된 재물 흐름',advice:finalBody},lines:{lifeLine:{summary:'저장된 생명선'},heartLine:{summary:'저장된 감정선'}}},
 'tarot-celestial-harmony':{cards,reading:{chapters:[chapter]}},
 'premium-fpti-report':{chapters:Array.from({length:7},(_,index)=>({order:index+1,title:'성향 '+(index+1),sections:[{title:'행동 패턴',body:index===6?finalBody:'저장된 성향 해석',strength:'저장된 강점',risk:'저장된 주의점',action:'저장된 행동'}],chapterSummary:'저장된 챕터 요약'}))},
};
for (const suffix of ['standard','deep','master']) sharedFeatureFixtures['tarot-prompt-maker-'+suffix]=structuredClone(sharedFeatureFixtures['tarot-prompt-maker']);
sharedFeatureFixtures['animal-totem-deep']={...structuredClone(sharedFeatureFixtures['animal-totem-basic']),narrative:{...sharedFeatureFixtures['animal-totem-basic'].narrative,shadow_gift_synthesis:'저장된 그림자와 선물'}};

