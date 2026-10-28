// Pure compatibility projection: no fetch, calculation, storage or generation.
// Only authored display fields are traversed. Arbitrary keys never become UI labels.
export const asRecord = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
export const asList = value => Array.isArray(value) ? value : [];
export const storedText = value => typeof value === 'string' ? value.trim() : '';
const TITLES = {
 resultText:["저장된 본문","Saved reading","保存された解釈"], coreReading:["상담 답변","Response","相談への回答"],
 strength:["강점","Strength","強み"], action:["행동 조언","Action","行動のヒント"], chapterSummary:["챕터 요약","Chapter summary","この章のまとめ"], highlights:["핵심 내용","Highlights","相談の要点"], emotionalTemperature:["감정의 온도","Emotion","感情の温度"], hiddenCore:["내면의 흐름","Inner pattern","内面の傾向"], contactPossibility:["연락의 흐름","Contact","連絡の流れ"], relationshipRisk:["관계의 주의점","Relationship risk","関係で気をつけたいこと"], recommendedAttitude:["추천 태도","Attitude","おすすめの向き合い方"], finalFlow:["마지막 흐름","Closing flow","これからの流れ"], oracleMessage:["마지막 메시지","Closing message","最後のメッセージ"],
 narrative:["종합 해설","Narrative","総合解説"],
 opening:["상담의 시작","Opening","相談のはじまり"],
 question_answer:["질문에 대한 답","Answer","質問への答え"],
 closing:["마지막 메시지","Closing","最後のメッセージ"],
 card_bridges:["토템의 연결","Totem connections","トーテムのつながり"],
 line:["함께 읽을 이야기","Connection","あわせて読む物語"],
 action_plan:["실천 계획","Practice","実践のヒント"],
 shadow_gift_synthesis:["그림자와 선물","Shadow and gift","影と才能"],
 course_metadata:["수련 안내","Practice","実践のヒント"],
 sequence:["수련 순서","Sequence","実践の順序"],
 closing_mantra:["마지막 만트라","Closing mantra","最後のマントラ"],
 breathing_guide:["호흡 안내","Breathing","呼吸のガイド"],
 benefits_physical:["몸의 흐름","Body","体の流れ"],
 benefits_spiritual:["마음의 흐름","Mind","心の流れ"],
 caution:["주의할 점","Caution","気をつけたいこと"],
 visual_cue_ui:["자세 안내","Pose guidance","姿勢のガイド"],
 keyJudgement:["핵심 판단","Key judgement","判断の要点"],
 energyFlow:["에너지 흐름","Energy flow","エネルギーの流れ"],
 risk:["주의할 흐름","Risk","注意したい流れ"],
 timing:["시기","Timing","時期"],
 actionTip:["행동 조언","Action","行動のヒント"],
 meaning:["뜻과 의미","Meaning","意味"],
 soundFlow:["소리의 흐름","Sound","音の流れ"],
 suri:["수리 해석","Numerology","数理の解釈"],
 elements:["오행의 흐름","Elements","五行の流れ"],
 finalPick:["최종 제안","Final choice","最終提案"],
 reason:["이유","Reason","理由"],
 intro:["리딩의 시작","Introduction","リーディングのはじまり"],
 summaryCard:["핵심 요약","Summary","ひとこと要約"],
 masterAdvice:["종합 조언","Advice","アドバイス"],
 deliverySections:["상담 내용","Reading","解釈"],
 innerHeartSummary:["심리 흐름","Emotional patterns","心の動き"],
 coreQuestion:["핵심 질문","Core question","質問の核心"],
 bigPicture:["전체 흐름","Big picture","全体の流れ"],
 emotionalTemperatureText:["감정의 온도","Emotional temperature","感情の温度"],
 corePsychology:["핵심 심리","Core psychology","心の中心にあるもの"],
 contactChance:["연락의 흐름","Contact","連絡の流れ"],
 relationFlow:["관계의 흐름","Relationship flow","関係の流れ"],
 reApproachChance:["다시 다가갈 흐름","Reconnection","再び近づく流れ"],
 recommendedAction:["추천 행동","Action","行動のヒント"],
 relationshipStage:["관계의 단계","Stage","関係の段階"],
 silenceDriver:["침묵의 배경","Silence","沈黙の背景"],
 situationPressure:["상황의 부담","Pressure","状況からの負担"],
 emotionalNeed:["마음의 필요","Emotional need","心が求めていること"],
 personality:["기질","Personality","気質"],
 habitats:["편안함을 느끼는 자리","Comfortable places","心地よく過ごせる場所"],
 plays:["함께할 놀이","Play","一緒に楽しむ遊び"],
 coach:["함께하는 조언","Guidance","相談のご案内"],
 care:["돌봄 안내","Care","お世話のヒント"],
 verdict:["관계의 핵심","Relationship summary","関係の要点"],
 overview:["전체 흐름","Overview","全体の流れ"],
 dimensions:["관계의 여러 면","Dimensions","関係のさまざまな側面"],
 places:["함께할 장소","Places","一緒に過ごす場所"],
 markdown:["저장된 해석","Saved reading","保存された解釈"],
 promptText:["저장된 상담문","Saved consultation","保存された相談文"],
 lineReadings:["손금별 해석","Palm lines","手相ごとの解釈"],
 lifeLine:["생명선","Life line","生命線"],
 headLine:["두뇌선","Head line","知能線"],
 heartLine:["감정선","Heart line","感情線"],
 fateLine:["운명선","Fate line","運命線"],

 result:["결과","Result","結果"], html:["저장된 본문","Saved reading","保存された解釈"], animalReadings:["토템별 해석","Totem readings","トーテムごとの解釈"],  tarotCardReadings:["카드별 해석","Card readings","カードごとの解釈"], closingLine:["마지막 메시지","Closing message","最後のメッセージ"], prashnaResult:["프라슈나 해석","Prashna reading","プラシュナの解釈"],
 summary:["한 줄 요약","Summary","ひとこと要約"], summaryCards:["지금의 흐름","Your current pattern","今の流れ"], headline:["핵심 메시지","Key message","大切なメッセージ"],
 chapters:["상담 내용","Reading","解釈"], sections:["상세 해석","Insights","詳しい解釈"], subsections:["함께 읽을 내용","More insights","あわせて読む解釈"], parts:["상담 내용","Reading","解釈"],
 messages:["대화 기록","Conversation","会話の記録"], user:["나의 질문","My question","私の質問"], assistant:["상담 답변","Response","相談への回答"], system:["상담 안내","Guidance","相談のご案内"],
 reading:["리딩","Reading","解釈"], report:["리포트","Report","レポート"], reportText:["저장된 리포트","Saved report","保存されたレポート"], interpretation:["해석","Interpretation","解釈"],
 analysis:["현재의 흐름","Current pattern","今の流れ"], advice:["행동 조언","Advice","アドバイス"], actions:["실천할 일","Actions","実践すること"], recommendations:["실천 제안","Suggestions","実践の提案"],
 actionPlan:["실천 계획","Action plan","行動計画"], finalMessage:["마지막 메시지","Closing message","最後のメッセージ"], finalLetter:["마지막 편지","Closing letter","最後の手紙"], honeyLetter:["꿀편지","Letter","手紙"],
 keyTakeaways:["기억할 점","Takeaways","覚えておきたいこと"], keyPoints:["핵심 내용","Key points","要点"], highlightQuotes:["마음에 남길 문장","Quotes","心に留めたい言葉"],
 evidence:["해석의 근거","Evidence","解釈の根拠"], evidencePack:["해석의 근거","Evidence","解釈の根拠"], factSummary:["해석의 근거","Evidence","解釈の根拠"], facts:["저장된 근거","Saved facts","保存された根拠"],
 integratedResult:["종합 리포트","Integrated report","総合レポート"], synthesis:["종합 해석","Synthesis","総合解釈"], scoreFactors:["판단 근거","Factors","判断の根拠"],
 timeline:["시기별 흐름","Timeline","時期ごとの流れ"], now:["지금","Now","今"], near:["가까운 시기","Near future","近い時期"], turning:["전환점","Turning point","転機"],
 positionReadings:["자리별 해석","Position readings","配置ごとの解釈"], cardSynergies:["카드가 함께 전하는 이야기","Card connections","カードが伝えるつながり"], positionAdvice:["이 자리의 조언","Position advice","この配置からのアドバイス"],
 consultingHighlights:["상담의 핵심","Highlights","相談の要点"], overall:["전체 흐름","Overview","全体の流れ"], overallReading:["전체 흐름","Overview","全体の流れ"], overallSummary:["전체 요약","Overview","全体の流れ"],
 love:["연애 흐름","Love","恋愛の流れ"], wealth:["재물 흐름","Resources","お金の流れ"], money:["재물 흐름","Resources","お金の流れ"], career:["일과 진로","Career","仕事と進路"], health:["생활과 건강","Wellbeing","暮らしと健康"],
  relationship:["관계","Relationships","人間関係"], healthEnergy:["생활 에너지","Energy","生活のエネルギー"],
 strengths:["강점","Strengths","強み"], weaknesses:["주의할 점","Watch points","気をつけたいこと"], cautions:["주의할 점","Watch points","気をつけたいこと"], warning:["주의할 점","Watch points","気をつけたいこと"],
 analysisText:["분석","Analysis","分析"], analysisResult:["해석","Reading","解釈"], dreamAnalysis:["꿈의 해석","Dream analysis","夢の解釈"], symbols:["꿈의 상징","Symbols","夢の象徴"],
 latentMeaning:["마음속 의미","Underlying meaning","心の奥にある意味"], manifestContent:["꿈의 장면","Dream scenes","夢の場面"], freeAssociation:["연상과 연결","Associations","連想とつながり"],
 generatedResult:["작명 리포트","Naming report","命名レポート"], generatedPrompt:["저장된 작명 상담문","Saved naming consultation","保存された命名相談"], namingPrompt:["작명 상담","Naming consultation","命名相談"],
 content:["해석","Reading","解釈"], text:["해석","Reading","解釈"], body:["본문","Reading","解釈"], answer:["답변","Response","相談への回答"], detail:["상세 해석","Details","詳しい解釈"], description:["설명","Description","説明"],
 conclusion:["결론","Conclusion","結論"], oneLiner:["한 줄 요약","Summary","ひとこと要約"], coreMessage:["핵심 메시지","Core message","大切なメッセージ"], insight:["해석","Insight","解釈"],
 repeatingPattern:["반복되는 패턴","Repeating pattern","繰り返すパターン"], currentTask:["지금의 과제","Current task","今の課題"], keywords:["핵심어","Keywords","キーワード"],
 soul:["본질","Essence","本質"], destiny:["방향","Direction","方向性"], shadow:["주의할 패턴","Shadow","気をつけたいパターン"], medicine:["실천 조언","Practice","実践のヒント"],
 course:["요가 코스","Yoga course","ヨガコース"], routine:["수련 순서","Practice sequence","練習の順序"], poses:["자세와 수련","Poses","姿勢と練習"], steps:["순서","Steps","手順"],
 benefits:["도움이 되는 점","Benefits","役立つ点"], precautions:["유의 사항","Precautions","注意事項"], instruction:["수련 안내","Instructions","練習のガイド"], instructions:["수련 안내","Instructions","練習のガイド"],
 compatibility:["관계 해석","Compatibility","相性の解釈"], versionHistory:["이전 작전","Previous strategies","以前の戦略"], realityCheck:["현실 점검","Reality check","現状の確認"],
 initialBriefing:["상황 브리핑","Briefing","状況の整理"], refinedOrder:["최종 명령서","Final strategy","最終戦略"], operationTitle:["작전명","Strategy","戦略"],
 sevenDayGuide:["일주일 실천","Seven-day practice","一週間の実践"], actionSecrets:["행동 조언","Action advice","行動のヒント"], evidenceNotes:["근거","Evidence","解釈の根拠"],
 // 숙요 전생 인연 리딩(sukuyo-past-life-reading)이 저장하는 산문 키.
 relationNameReading:["관계의 이름","Relationship name","関係の名前"], distanceReading:["거리의 의미","Distance","距離の意味"], directionReading:["관계의 방향","Direction","方向性"],
 relationshipRhythm:["관계의 리듬","Rhythm","関係のリズム"], pastLifeStory:["전생 인연 이야기","Past-life story","前世の縁の物語"], unfinishedTask:["남은 과제","Unfinished task","残された課題"],
 repeatPattern:["반복되는 패턴","Repeating pattern","繰り返すパターン"], emotionalTrigger:["감정의 방아쇠","Emotional trigger","感情が動くきっかけ"], currentLifeLesson:["이번 생의 배움","Lesson","今を生きる学び"],
 purposeReading:["목적별 해석","Purpose","目的別の解釈"], warningSigns:["주의 신호","Warning signs","注意のサイン"], healingActions:["회복 행동","Healing actions","回復のための行動"],
 conversationScript:["대화 문장","Conversation script","会話の例"], relationshipAdvice:["관계 조언","Relationship advice","関係へのアドバイス"],
 };
export function readingLabel(key, locale='ko') {
 const language = String(locale).toLowerCase().split(/[-_]/)[0];
 const index = language === 'ko' ? 0 : language === 'ja' ? 2 : 1;
 return TITLES[key]?.[index] || ['상세 해석', 'Reading', '詳しい解釈'][index];
}
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
