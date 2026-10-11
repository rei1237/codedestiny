// Pure compatibility projection: no fetch, calculation, storage or generation.
// Only authored display fields are traversed. Arbitrary keys never become UI labels.
export const asRecord = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
export const asList = value => Array.isArray(value) ? value : [];
export const storedText = value => typeof value === 'string' ? value.trim() : '';
const TITLES = {
 resultText:['저장된 본문','Saved reading'], coreReading:['상담 답변','Response'],
 strength:['강점','Strength'], action:['행동 조언','Action'], chapterSummary:['챕터 요약','Chapter summary'], highlights:['핵심 내용','Highlights'], emotionalTemperature:['감정의 온도','Emotion'], hiddenCore:['내면의 흐름','Inner pattern'], contactPossibility:['연락의 흐름','Contact'], relationshipRisk:['관계의 주의점','Relationship risk'], recommendedAttitude:['추천 태도','Attitude'], finalFlow:['마지막 흐름','Closing flow'], oracleMessage:['마지막 메시지','Closing message'],
 narrative:['종합 해설', 'Narrative'],
 opening:['상담의 시작', 'Opening'],
 question_answer:['질문에 대한 답', 'Answer'],
 closing:['마지막 메시지', 'Closing'],
 card_bridges:['토템의 연결', 'Totem connections'],
 line:['함께 읽을 이야기', 'Connection'],
 action_plan:['실천 계획', 'Practice'],
 shadow_gift_synthesis:['그림자와 선물', 'Shadow and gift'],
 course_metadata:['수련 안내', 'Practice'],
 sequence:['수련 순서', 'Sequence'],
 closing_mantra:['마지막 만트라', 'Closing mantra'],
 breathing_guide:['호흡 안내', 'Breathing'],
 benefits_physical:['몸의 흐름', 'Body'],
 benefits_spiritual:['마음의 흐름', 'Mind'],
 caution:['주의할 점', 'Caution'],
 visual_cue_ui:['자세 안내', 'Pose guidance'],
 keyJudgement:['핵심 판단', 'Key judgement'],
 energyFlow:['에너지 흐름', 'Energy flow'],
 risk:['주의할 흐름', 'Risk'],
 timing:['시기', 'Timing'],
 actionTip:['행동 조언', 'Action'],
 meaning:['뜻과 의미', 'Meaning'],
 soundFlow:['소리의 흐름', 'Sound'],
 suri:['수리 해석', 'Numerology'],
 elements:['오행의 흐름', 'Elements'],
 finalPick:['최종 제안', 'Final choice'],
 reason:['이유', 'Reason'],
 intro:['리딩의 시작', 'Introduction'],
 summaryCard:['핵심 요약', 'Summary'],
 masterAdvice:['종합 조언', 'Advice'],
 deliverySections:['상담 내용', 'Reading'],
 innerHeartSummary:['심리 흐름', 'Emotional patterns'],
 coreQuestion:['핵심 질문', 'Core question'],
 bigPicture:['전체 흐름', 'Big picture'],
 emotionalTemperatureText:['감정의 온도', 'Emotional temperature'],
 corePsychology:['핵심 심리', 'Core psychology'],
 contactChance:['연락의 흐름', 'Contact'],
 relationFlow:['관계의 흐름', 'Relationship flow'],
 reApproachChance:['다시 다가갈 흐름', 'Reconnection'],
 recommendedAction:['추천 행동', 'Action'],
 relationshipStage:['관계의 단계', 'Stage'],
 silenceDriver:['침묵의 배경', 'Silence'],
 situationPressure:['상황의 부담', 'Pressure'],
 emotionalNeed:['마음의 필요', 'Emotional need'],
 personality:['기질', 'Personality'],
 habitats:['편안함을 느끼는 자리', 'Comfortable places'],
 plays:['함께할 놀이', 'Play'],
 coach:['함께하는 조언', 'Guidance'],
 care:['돌봄 안내', 'Care'],
 verdict:['관계의 핵심', 'Relationship summary'],
 overview:['전체 흐름', 'Overview'],
 dimensions:['관계의 여러 면', 'Dimensions'],
 places:['함께할 장소', 'Places'],
 markdown:['저장된 해석', 'Saved reading'],
 promptText:['저장된 상담문', 'Saved consultation'],
 lineReadings:['손금별 해석', 'Palm lines'],
 lifeLine:['생명선', 'Life line'],
 headLine:['두뇌선', 'Head line'],
 heartLine:['감정선', 'Heart line'],
 fateLine:['운명선', 'Fate line'],

 result:['결과','Result'], html:['저장된 본문','Saved reading'], animalReadings:['토템별 해석','Totem readings'],  tarotCardReadings:['카드별 해석','Card readings'], closingLine:['마지막 메시지','Closing message'], prashnaResult:['프라슈나 해석','Prashna reading'],
 summary:['한 줄 요약','Summary'], summaryCards:['지금의 흐름','Your current pattern'], headline:['핵심 메시지','Key message'],
 chapters:['상담 내용','Reading'], sections:['상세 해석','Insights'], subsections:['함께 읽을 내용','More insights'], parts:['상담 내용','Reading'],
 messages:['대화 기록','Conversation'], user:['나의 질문','My question'], assistant:['상담 답변','Response'], system:['상담 안내','Guidance'],
 reading:['리딩','Reading'], report:['리포트','Report'], reportText:['저장된 리포트','Saved report'], interpretation:['해석','Interpretation'],
 analysis:['현재의 흐름','Current pattern'], advice:['행동 조언','Advice'], actions:['실천할 일','Actions'], recommendations:['실천 제안','Suggestions'],
 actionPlan:['실천 계획','Action plan'], finalMessage:['마지막 메시지','Closing message'], finalLetter:['마지막 편지','Closing letter'], honeyLetter:['꿀편지','Letter'],
 keyTakeaways:['기억할 점','Takeaways'], keyPoints:['핵심 내용','Key points'], highlightQuotes:['마음에 남길 문장','Quotes'],
 evidence:['해석의 근거','Evidence'], evidencePack:['해석의 근거','Evidence'], factSummary:['해석의 근거','Evidence'], facts:['저장된 근거','Saved facts'],
 integratedResult:['종합 리포트','Integrated report'], synthesis:['종합 해석','Synthesis'], scoreFactors:['판단 근거','Factors'],
 timeline:['시기별 흐름','Timeline'], now:['지금','Now'], near:['가까운 시기','Near future'], turning:['전환점','Turning point'],
 positionReadings:['자리별 해석','Position readings'], cardSynergies:['카드가 함께 전하는 이야기','Card connections'], positionAdvice:['이 자리의 조언','Position advice'],
 consultingHighlights:['상담의 핵심','Highlights'], overall:['전체 흐름','Overview'], overallReading:['전체 흐름','Overview'], overallSummary:['전체 요약','Overview'],
 love:['연애 흐름','Love'], wealth:['재물 흐름','Resources'], money:['재물 흐름','Resources'], career:['일과 진로','Career'], health:['생활과 건강','Wellbeing'],
  relationship:['관계','Relationships'], healthEnergy:['생활 에너지','Energy'],
 strengths:['강점','Strengths'], weaknesses:['주의할 점','Watch points'], cautions:['주의할 점','Watch points'], warning:['주의할 점','Watch points'],
 analysisText:['분석','Analysis'], analysisResult:['해석','Reading'], dreamAnalysis:['꿈의 해석','Dream analysis'], symbols:['꿈의 상징','Symbols'],
 latentMeaning:['마음속 의미','Underlying meaning'], manifestContent:['꿈의 장면','Dream scenes'], freeAssociation:['연상과 연결','Associations'],
 generatedResult:['작명 리포트','Naming report'], generatedPrompt:['저장된 작명 상담문','Saved naming consultation'], namingPrompt:['작명 상담','Naming consultation'],
 content:['해석','Reading'], text:['해석','Reading'], body:['본문','Reading'], answer:['답변','Response'], detail:['상세 해석','Details'], description:['설명','Description'],
 conclusion:['결론','Conclusion'], oneLiner:['한 줄 요약','Summary'], coreMessage:['핵심 메시지','Core message'], insight:['해석','Insight'],
 repeatingPattern:['반복되는 패턴','Repeating pattern'], currentTask:['지금의 과제','Current task'], keywords:['핵심어','Keywords'],
 soul:['본질','Essence'], destiny:['방향','Direction'], shadow:['주의할 패턴','Shadow'], medicine:['실천 조언','Practice'],
 course:['요가 코스','Yoga course'], routine:['수련 순서','Practice sequence'], poses:['자세와 수련','Poses'], steps:['순서','Steps'],
 benefits:['도움이 되는 점','Benefits'], precautions:['유의 사항','Precautions'], instruction:['수련 안내','Instructions'], instructions:['수련 안내','Instructions'],
 compatibility:['관계 해석','Compatibility'], versionHistory:['이전 작전','Previous strategies'], realityCheck:['현실 점검','Reality check'],
 initialBriefing:['상황 브리핑','Briefing'], refinedOrder:['최종 명령서','Final strategy'], operationTitle:['작전명','Strategy'],
 sevenDayGuide:['일주일 실천','Seven-day practice'], actionSecrets:['행동 조언','Action advice'], evidenceNotes:['근거','Evidence'],
 // 숙요 전생 인연 리딩(sukuyo-past-life-reading)이 저장하는 산문 키.
 relationNameReading:['관계의 이름','Relationship name'], distanceReading:['거리의 의미','Distance'], directionReading:['관계의 방향','Direction'],
 relationshipRhythm:['관계의 리듬','Rhythm'], pastLifeStory:['전생 인연 이야기','Past-life story'], unfinishedTask:['남은 과제','Unfinished task'],
 repeatPattern:['반복되는 패턴','Repeating pattern'], emotionalTrigger:['감정의 방아쇠','Emotional trigger'], currentLifeLesson:['이번 생의 배움','Lesson'],
 purposeReading:['목적별 해석','Purpose'], warningSigns:['주의 신호','Warning signs'], healingActions:['회복 행동','Healing actions'],
 conversationScript:['대화 문장','Conversation script'], relationshipAdvice:['관계 조언','Relationship advice'],
 };
export function readingLabel(key, locale='ko') { return TITLES[key]?.[locale === 'ko' ? 0 : 1] || (locale === 'ko' ? '상세 해석' : 'Reading'); }
export function parseSavedText(value) {
 const text = storedText(value);
 if (!text) return value;
 const candidate = text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 if (!/^[{[]/.test(candidate)) return value;
 try { return JSON.parse(candidate); } catch { return value; }
}
const namedTitle = (row, fallback) => {
 const title = storedText(row.title || row.heading || row.label || row.positionLabel || row.headline || row.pairLabel);
 return title || fallback;
};
export function readingSections(value, { locale='ko', omit=[], fields=[], labels={} } = {}) {
 const sections = [];
 const label = key => labels[key] || readingLabel(key,locale);
 const excluded = new Set(omit);
 function walk(input, title, dynamic=false) {
  const parsed = parseSavedText(input);
  if (typeof parsed === 'string') { if(parsed.trim()) sections.push({ title, body: parsed }); return; }
  if (Array.isArray(parsed)) {
   parsed.forEach((entry,index) => {
    const row=asRecord(entry);
    const role=storedText(row.role || row.speaker);
    walk(entry, role ? label(role) : namedTitle(row, title + (parsed.length>1 ? ' '+(index+1) : '')), dynamic);
   }); return;
  }
  const row=asRecord(parsed);
  const heading=namedTitle(row,title);
  const direct = ['body','content','text','answer','reading','interpretation','description','detail'].filter(key => row[key] !== undefined && !excluded.has(key));
  for(const key of direct) walk(row[key],heading);
  for(const [key,entry] of Object.entries(row)) {
   if(excluded.has(key) || direct.includes(key) || ['title','heading','label','role','speaker','headline','pairLabel','positionLabel'].includes(key)) continue;
   if(TITLES[key] || fields.includes(key)) walk(entry, label(key), ['sections','chapters','parts','messages','integratedResult','analysis','report'].includes(key));
   else if(dynamic && (typeof entry==='string' || typeof entry==='object') && !/^(?:id|_id|status|state|version|model|provider|prompt|token|cost|birth|user|owner|payment|meta|created|updated|input|request|execution|generation|raw|debug|trace|score|order|index|count|total|chars|length)/i.test(key)) {
    // Old parts used system-specific keys: retain the saved prose, never print the key.
    walk(entry, heading, false);
   }
  }
  if(typeof row.headline==='string' && !direct.length) walk(row.headline,heading);
 }
 walk(value,readingLabel('reading',locale));
 return sections;
}


// Shared stores wrap the same saved document under result/report/sajuAi.
// Unwrap transport containers only; retain adjacent stored cards and prose.
export function savedReadingModel(value) {
 let parsed=parseSavedText(value);
 if(typeof parsed==='string'||Array.isArray(parsed))return parsed;
 let row={...asRecord(parsed)};
 for(let depth=0;depth<4;depth++) {
  const key=['result','report','sajuAi'].find(key=>Object.keys(asRecord(parseSavedText(row[key]))).length);
  if(!key)break;
  const nested=asRecord(parseSavedText(row[key]));
  delete row[key]; row={...row,...nested};
 }
 return row;
}
