import type { LoadingLocale } from "@/constants/loadingMessages";

type NonKoLocale = Exclude<LoadingLocale, "ko">;

export type NeoFormCopyKey =
  | "operationMap.title"
  | "operationMap.fallbackStatus"
  | "operationMap.stage.0"
  | "operationMap.stage.1"
  | "operationMap.stage.2"
  | "operationMap.stage.3"
  | "operationMap.stage.4"
  | "operationMap.stage.5"
  | "operationMap.stageCompleteLine"
  | "operationMap.completeLabel"
  | "operationMap.refiningStage"
  | "operationMap.checkingStage"
  | "operationMap.paymentStage"
  | "operationMap.completingStage"
  | "sealPerk.ariaLabel"
  | "sealPerk.title"
  | "sealPerk.desc"
  | "sealPerk.lockLabel"
  | "sealPerk.letterTitle"
  | "sealPerk.letterDesc"
  | "sealPerk.pdfTitle"
  | "sealPerk.pdfDesc"
  | "sealPerk.imageAlt"
  | "commandConversation.ariaLabel"
  | "commandFlow.stepMethod"
  | "commandFlow.stepTopic"
  | "commandFlow.stepBirth"
  | "commandFlow.stepIntensity"
  | "commandFlow.stepQuestion"
  | "commandFlow.stepLaunch"
  | "commandFlow.hintChooseMethod"
  | "commandFlow.hintChooseTopic"
  | "commandFlow.hintBirth"
  | "commandFlow.hintIntensity"
  | "commandFlow.hintReady"
  | "commandFlow.hintLaunchReady"
  | "topicSelect.title"
  | "birthInfo.title"
  | "birthInfo.sectionCopy"
  | "birthInfo.modeGroupAria"
  | "birthInfo.useSaved"
  | "birthInfo.manual"
  | "birthInfo.hintSaved"
  | "birthInfo.hintManual"
  | "birthInfo.name"
  | "birthInfo.namePlaceholder"
  | "birthInfo.gender"
  | "birthInfo.genderSelect"
  | "birthInfo.genderFemale"
  | "birthInfo.genderMale"
  | "birthInfo.genderUnknown"
  | "birthInfo.birthDate"
  | "birthInfo.birthTime"
  | "birthInfo.calendar"
  | "birthInfo.calendarSolar"
  | "birthInfo.calendarLunar"
  | "birthInfo.city"
  | "birthInfo.timezone"
  | "birthInfo.birthTimeUnknown"
  | "intensitySelect.title"
  | "intensitySelect.roarWarningTitle"
  | "intensitySelect.roarWarningBody"
  | "questionInput.title"
  | "questionInput.label"
  | "questionInput.placeholder"
  | "questionInput.methodUnselected"
  | "questionInput.topicUnselected"
  | "questionInput.intensityUnselected"
  | "validationPanel.title"
  | "errorPanel.title"
  | "statusPanel.completed"
  | "statusPanel.inProgress"
  | "launchConfirm.title"
  | "launchConfirm.ctaPayment"
  | "launchConfirm.ctaGenerating"
  | "launchConfirm.ctaAnalyzing"
  | "launchConfirm.ctaStart"
  | "launchConfirm.hint"
  | "readyPanel.title"
  | "readyPanel.preflightMeta"
  | "briefing.eyebrow"
  | "briefing.fallbackTitle"
  | "briefing.savedNotice"
  | "briefing.revealAria"
  | "briefing.revealButton"
  | "briefing.frontlineLabel"
  | "briefing.repeatedChoiceFallback"
  | "briefing.innateNatureFallback"
  | "briefing.innateStrengthFallback"
  | "briefing.topicStyleFallback"
  | "briefing.topicAreasLabel"
  | "briefing.topicTimingFallback"
  | "briefing.originalStrategyFallback"
  | "briefing.misalignedFlowFallback"
  | "briefing.compatScoresLabel"
  | "briefing.compatScoreOverall"
  | "briefing.compatScoreResonance"
  | "briefing.compatScoreFriction"
  | "briefing.compatScoreGrowth"
  | "briefing.compatScoreAttraction"
  | "briefing.compatScoreStability"
  | "briefing.compatScoreCommunication"
  | "briefing.compatScoreEndurance"
  | "briefing.compatScoreNote"
  | "briefing.compatScoreAshtakutaNote"
  | "briefing.compatStatusLabel"
  | "briefing.compatPartnerTimeUnknownNote"
  | "briefing.compatStatus.crush"
  | "briefing.compatStatus.dating"
  | "briefing.compatStatus.longterm"
  | "briefing.compatStatus.breakup"
  | "briefing.compatStatus.reconciling"
  | "briefing.compatStatus.engaged"
  | "briefing.compatStatus.married"
  | "briefing.compatTowardPartnerFallback"
  | "briefing.compatTowardMeFallback"
  | "briefing.compatCoreKeywordLabel"
  | "briefing.compatPalaceCrossLabel"
  | "briefing.compatConflictFallback"
  | "briefing.compatConflictTriggerLabel"
  | "briefing.compatConflictEscalationLabel"
  | "briefing.compatConflictDialogueLabel"
  | "briefing.compatConflictResolutionLabel"
  | "briefing.compatStrategyFallback"
  | "briefing.compatStrategySituationLabel"
  | "briefing.compatStrategyDoLabel"
  | "briefing.compatStrategyAvoidLabel"
  | "partner.title"
  | "partner.sectionCopy"
  | "partner.modeGroupAria"
  | "partner.modeSolo"
  | "partner.modeCompat"
  | "partner.hintSolo"
  | "partner.hintCompat"
  | "partner.statusLabel"
  | "partner.statusHint"
  | "partner.statusGroupAria"
  | "partner.name"
  | "partner.namePlaceholder"
  | "partner.launchBadge"
  | "briefing.forbiddenActionFallback"
  | "briefing.actionOrdersLabel"
  | "briefing.sevenDayLabel"
  | "briefing.realityQuestionsLabel"
  | "realityPanel.eyebrow"
  | "realityPanel.title"
  | "realityPanel.subtitle"
  | "realityPanel.operationNameLabel"
  | "realityPanel.questionsLabel"
  | "realityPanel.freeformLabel"
  | "realityPanel.freeformPlaceholder"
  | "realityPanel.errorTitle"
  | "realityPanel.submitBusy"
  | "realityPanel.submitIdle"
  | "refinedOrder.eyebrow"
  | "refinedOrder.fallbackTitle"
  | "refinedOrder.badgePrefix"
  | "refinedOrder.alternativesLabel"
  | "refinedOrder.peopleLabel"
  | "refinedOrder.whereToFindPrefix"
  | "refinedOrder.thirtyDayLabel"
  | "refinedOrder.thisWeekLabel"
  | "refinedOrder.closingLabel";

export type NeoFormCopyTable = Record<NeoFormCopyKey, string>;

const NEO_FORM_COPY_KO: NeoFormCopyTable = {
  "operationMap.title": "운명의 작전 지도",
  "operationMap.fallbackStatus": "네오가 작전 브리핑을 정리하고 있다.",
  "operationMap.stage.0": "네오가 운명의 작전 지도를 펼치는 중...",
  "operationMap.stage.1": "사자 휘장이 네 운명의 전선을 감지하는 중...",
  "operationMap.stage.2": "반복되는 선택을 추적하는 중...",
  "operationMap.stage.3": "듣기 좋은 말과 필요한 말을 분리하는 중...",
  "operationMap.stage.4": "네가 피하고 있던 핵심을 찾는 중...",
  "operationMap.stage.5": "작전 브리핑을 작성하는 중...",
  "operationMap.stageCompleteLine": "됐다. 작전 브리핑에 도장을 찍었다.",
  "operationMap.completeLabel": "완료",
  "operationMap.refiningStage": "현실 답변을 반영해 수정 작전 명령서를 쓰는 중...",
  "operationMap.checkingStage": "사자 휘장 권한을 확인하는 중...",
  "operationMap.paymentStage": "이용권과 결제 신호를 대조하는 중...",
  "operationMap.completingStage": "작전 브리핑 도장을 찍는 중...",
  "sealPerk.ariaLabel": "사자 휘장 특전 안내",
  "sealPerk.title": "사자 휘장 5개를 모으면 잠긴 특전이 열린다",
  "sealPerk.desc": "작전을 완수할수록 사자 휘장이 쌓인다. 다섯 개가 모이면 아래 특전이 결과 화면에서 해금된다.",
  "sealPerk.lockLabel": "잠금",
  "sealPerk.letterTitle": "네오의 비밀 편지",
  "sealPerk.letterDesc": "결과에 담기지 않은 추가 해석과 당부가 열린다",
  "sealPerk.pdfTitle": "작전 명령서 PDF 다운로드",
  "sealPerk.pdfDesc": "전체 브리핑을 PDF로 저장해 언제든 다시 열람한다",
  "sealPerk.imageAlt": "황금빛 사자 휘장",
  "commandConversation.ariaLabel": "네오 작전 안내",
  "commandFlow.stepMethod": "분석 방식",
  "commandFlow.stepTopic": "상담 전선",
  "commandFlow.stepBirth": "좌표 확인",
  "commandFlow.stepIntensity": "팩폭 강도",
  "commandFlow.stepQuestion": "질문 입력",
  "commandFlow.stepLaunch": "작전 개시",
  "commandFlow.hintChooseMethod": "먼저 어떤 지도로 전선을 볼지 고르면 다음 단계가 열린다.",
  "commandFlow.hintChooseTopic": "지금 가장 흔들리는 전선을 하나로 좁혀라.",
  "commandFlow.hintBirth": "출생 좌표를 확인해야 같은 벽에 부딪히는 흐름을 가를 수 있다.",
  "commandFlow.hintIntensity": "팩폭 강도는 네가 오늘 받아낼 수 있는 직면의 깊이다.",
  "commandFlow.hintReady": "작전 브리핑이 도착했다. 현실 점검까지 이어갈 수 있다.",
  "commandFlow.hintLaunchReady": "사자 휘장으로 작전을 시작할 준비가 끝났다.",
  "topicSelect.title": "상담 주제 선택",
  "birthInfo.title": "작전 대상 정보 확인",
  "birthInfo.sectionCopy": "시작할 지도를 펼치려면 기본 좌표가 필요하다. 대충 넣으면 대충 차려낸다.",
  "birthInfo.modeGroupAria": "출생정보 입력 방식",
  "birthInfo.useSaved": "현재 프로필 사용",
  "birthInfo.manual": "직접 입력",
  "birthInfo.hintSaved": "현재 프로필에서 불러온 좌표다. 다르면 직접 입력으로 바꿔라.",
  "birthInfo.hintManual": "출생지와 시간대는 기본 기준값이 들어와 있으니 네 좌표에 맞는지 확인해라.",
  "birthInfo.name": "이름",
  "birthInfo.namePlaceholder": "이름 또는 별명",
  "birthInfo.gender": "성별",
  "birthInfo.genderSelect": "선택",
  "birthInfo.genderFemale": "여성",
  "birthInfo.genderMale": "남성",
  "birthInfo.genderUnknown": "선택하지 않음",
  "birthInfo.birthDate": "생년월일",
  "birthInfo.birthTime": "출생시간",
  "birthInfo.calendar": "달력",
  "birthInfo.calendarSolar": "양력",
  "birthInfo.calendarLunar": "음력",
  "birthInfo.city": "출생지",
  "birthInfo.timezone": "시간대",
  "birthInfo.birthTimeUnknown": "출생시간 모름",
  "intensitySelect.title": "팩폭 강도 선택",
  "intensitySelect.roarWarningTitle": "사자 포효맛 주의",
  "intensitySelect.roarWarningBody": "이 강도는 위로보다 직면을 앞세운다. 마음이 예민한 날이라면 기본맛으로 낮춰도 작전은 흐려지지 않는다.",
  "questionInput.title": "질문 입력",
  "questionInput.label": "지금 네 선택을 흔드는 질문",
  "questionInput.placeholder": "지금 네가 가장 답을 알고 싶은 문제를 적어라.\n길게 써도 된다. 변명도 포함해라.\n내가 알아서 걸러낸다.",
  "questionInput.methodUnselected": "분석 방식 미선택",
  "questionInput.topicUnselected": "주제 미선택",
  "questionInput.intensityUnselected": "강도 미선택",
  "validationPanel.title": "작전 정보가 부족하다",
  "errorPanel.title": "작전 개시 실패",
  "statusPanel.completed": "작전 브리핑 도착",
  "statusPanel.inProgress": "작전 진행 중",
  "launchConfirm.title": "사자 휘장 확인",
  "launchConfirm.ctaPayment": "결제 확인 중",
  "launchConfirm.ctaGenerating": "전문가 상담 생성 중",
  "launchConfirm.ctaAnalyzing": "작전 지도 분석 중",
  "launchConfirm.ctaStart": "사자 휘장으로 작전 개시",
  "launchConfirm.hint": "사자 휘장이 내려오면 네 질문은 작전 명령서로 정리된다.",
  "readyPanel.title": "작전 브리핑 완료",
  "readyPanel.preflightMeta": "같은 입력은 같은 작전 요청으로 이어진다.",
  "briefing.eyebrow": "1차 작전 브리핑",
  "briefing.fallbackTitle": "무명 작전",
  "briefing.savedNotice": "결과 보관 완료",
  "briefing.revealAria": "브리핑 전체 펼치기",
  "briefing.revealButton": "전부 펼치기",
  "briefing.frontlineLabel": "현재 운명의 전선",
  "briefing.repeatedChoiceFallback": "반복되는 선택",
  "briefing.innateNatureFallback": "타고난 성향의 핵",
  "briefing.innateStrengthFallback": "타고난 강점과 약점",
  "briefing.topicStyleFallback": "이 주제에서 너의 방식",
  "briefing.topicAreasLabel": "주제 영역별 심층",
  "briefing.topicTimingFallback": "이 주제의 시기 흐름",
  "briefing.originalStrategyFallback": "본래 너는 이렇게 움직여야 한다",
  "briefing.misalignedFlowFallback": "지금 흐름이 어긋난 자리",
  "briefing.compatScoresLabel": "궁합 계기판",
  "briefing.compatScoreOverall": "종합",
  "briefing.compatScoreResonance": "공명",
  "briefing.compatScoreFriction": "갈등 위험",
  "briefing.compatScoreGrowth": "성장",
  "briefing.compatScoreAttraction": "끌림",
  "briefing.compatScoreStability": "안정",
  "briefing.compatScoreCommunication": "소통",
  "briefing.compatScoreEndurance": "지구력",
  "briefing.compatScoreNote": "각 축은 높을수록 좋다. 방향이 반대인 축(갈등 위험)은 라벨에 그렇게 적혀 있다.",
  "briefing.compatScoreAshtakutaNote": "인도 전통 아쉬타쿠타 36점 만점을 백분율로 환산한 값이다. 항목별 점수는 아래 근거에 있다.",
  "briefing.compatStatusLabel": "관계 상태",
  "briefing.compatPartnerTimeUnknownNote": "상대의 출생시간이 미상이라, 시간에 기대는 판독은 폭을 넓게 잡았다.",
  "briefing.compatStatus.crush": "썸",
  "briefing.compatStatus.dating": "연애 중",
  "briefing.compatStatus.longterm": "장기 연애",
  "briefing.compatStatus.breakup": "이별",
  "briefing.compatStatus.reconciling": "재회 시도",
  "briefing.compatStatus.engaged": "결혼 예정",
  "briefing.compatStatus.married": "부부",
  "briefing.compatTowardPartnerFallback": "내가 상대에게 느끼는 것",
  "briefing.compatTowardMeFallback": "상대가 나에게 느낄 수 있는 것",
  "briefing.compatCoreKeywordLabel": "이 관계의 핵심 키워드",
  "briefing.compatPalaceCrossLabel": "궁 교차 판독",
  "briefing.compatConflictFallback": "이 관계에서 가장 위험한 패턴",
  "briefing.compatConflictTriggerLabel": "불이 붙는 지점",
  "briefing.compatConflictEscalationLabel": "번져 가는 경로",
  "briefing.compatConflictDialogueLabel": "실제로 오가는 말",
  "briefing.compatConflictResolutionLabel": "푸는 순서",
  "briefing.compatStrategyFallback": "지금 상태에서의 작전",
  "briefing.compatStrategySituationLabel": "지금 상태 판독",
  "briefing.compatStrategyDoLabel": "할 것",
  "briefing.compatStrategyAvoidLabel": "하지 말 것",
  "partner.title": "상대 정보",
  "partner.sectionCopy": "연애·재회 상담에서만 열린다. 상대의 명반을 함께 놓으면 네오가 관계 구조를 근거로 답한다.",
  "partner.modeGroupAria": "상담 인원 선택",
  "partner.modeSolo": "혼자 본다",
  "partner.modeCompat": "둘이 함께 본다",
  "partner.hintSolo": "네 명반만 놓고 본다.",
  "partner.hintCompat": "상대의 명반을 교차해 챕터 4개가 궁합 판독으로 바뀐다. 가격은 그대로다.",
  "partner.statusLabel": "관계 상태",
  "partner.statusHint": "지금 어느 단계인지에 따라 작전 챕터의 무게중심이 바뀐다.",
  "partner.statusGroupAria": "관계 상태 선택",
  "partner.name": "상대 이름",
  "partner.namePlaceholder": "표기용. 비워도 된다",
  "partner.launchBadge": "궁합 모드",
  "briefing.forbiddenActionFallback": "오늘 금지 행동",
  "briefing.actionOrdersLabel": "바로 해야 할 작전",
  "briefing.sevenDayLabel": "7일 작전",
  "briefing.realityQuestionsLabel": "현실 점검 질문",
  "realityPanel.eyebrow": "현실 점검",
  "realityPanel.title": "너, 진짜 그렇게 살고 있냐?",
  "realityPanel.subtitle": "네오의 1차 판단에 네 현실을 대입해라. 인정해도 되고, 반박해도 된다.",
  "realityPanel.operationNameLabel": "1차 작전명",
  "realityPanel.questionsLabel": "네오의 현실 점검 질문",
  "realityPanel.freeformLabel": "네오에게 더 말할 현실",
  "realityPanel.freeformPlaceholder": "네오에게 반박하거나, 현재 상황을 더 자세히 적어주세요.\n변명도 괜찮습니다. 네오가 알아서 걸러냅니다.",
  "realityPanel.errorTitle": "수정 작전 명령서 실패",
  "realityPanel.submitBusy": "수정 작전 작성 중",
  "realityPanel.submitIdle": "수정 작전 명령서 받기",
  "refinedOrder.eyebrow": "2차 수정 작전 명령서",
  "refinedOrder.fallbackTitle": "수정 작전",
  "refinedOrder.badgePrefix": "오늘의 사자 휘장",
  "refinedOrder.alternativesLabel": "구체적 실행 대안",
  "refinedOrder.peopleLabel": "만나야 할 사람",
  "refinedOrder.whereToFindPrefix": "만날 곳",
  "refinedOrder.thirtyDayLabel": "30일 전략",
  "refinedOrder.thisWeekLabel": "이번 주 첫 걸음",
  "refinedOrder.closingLabel": "NEO · 마무리 한마디",
};

const NEO_FORM_COPY_EN: NeoFormCopyTable = {
  "operationMap.title": "Operation Map of Fate",
  "operationMap.fallbackStatus": "NEO is putting together your operation briefing.",
  "operationMap.stage.0": "NEO is unrolling the operation map of your fate...",
  "operationMap.stage.1": "The lion seal is detecting your fault line...",
  "operationMap.stage.2": "Tracking the choice you keep repeating...",
  "operationMap.stage.3": "Separating what sounds nice from what you need to hear...",
  "operationMap.stage.4": "Finding the core issue you've been avoiding...",
  "operationMap.stage.5": "Writing the operation briefing...",
  "operationMap.stageCompleteLine": "Done. The operation briefing is sealed.",
  "operationMap.completeLabel": "Complete",
  "operationMap.refiningStage": "Writing the revised operation order from your reality check answers...",
  "operationMap.checkingStage": "Verifying your Lion Seal access...",
  "operationMap.paymentStage": "Cross-checking your pass and payment signal...",
  "operationMap.completingStage": "Sealing the operation briefing...",
  "sealPerk.ariaLabel": "Lion Seal reward info",
  "sealPerk.title": "Collect 5 Lion Seals to unlock a locked reward",
  "sealPerk.desc": "Every completed operation earns you a Lion Seal. Collect five and the reward below unlocks on your result screen.",
  "sealPerk.lockLabel": "Locked",
  "sealPerk.letterTitle": "NEO's secret letter",
  "sealPerk.letterDesc": "Unlocks extra interpretation and advice not included in your result",
  "sealPerk.pdfTitle": "Operation order PDF download",
  "sealPerk.pdfDesc": "Save the full briefing as a PDF to revisit anytime",
  "sealPerk.imageAlt": "Golden Lion Seal",
  "commandConversation.ariaLabel": "NEO operation guide",
  "commandFlow.stepMethod": "Method",
  "commandFlow.stepTopic": "Topic",
  "commandFlow.stepBirth": "Coordinates",
  "commandFlow.stepIntensity": "Intensity",
  "commandFlow.stepQuestion": "Question",
  "commandFlow.stepLaunch": "Launch",
  "commandFlow.hintChooseMethod": "Pick which map to read the front line from first — the next step unlocks after that.",
  "commandFlow.hintChooseTopic": "Narrow it down to the one front line shaking you the most right now.",
  "commandFlow.hintBirth": "Confirm your birth coordinates so we can split the flow that keeps hitting the same wall.",
  "commandFlow.hintIntensity": "The fact-punch intensity is how much confrontation you can take today.",
  "commandFlow.hintReady": "The operation briefing has arrived. You can move on to the reality check.",
  "commandFlow.hintLaunchReady": "You're ready to launch the operation with the Lion Seal.",
  "topicSelect.title": "Choose your consultation topic",
  "birthInfo.title": "Confirm the operation target's info",
  "birthInfo.sectionCopy": "The map can't unroll without your baseline coordinates. Sloppy input gets a sloppy read.",
  "birthInfo.modeGroupAria": "Birth info input method",
  "birthInfo.useSaved": "Use current profile",
  "birthInfo.manual": "Enter manually",
  "birthInfo.hintSaved": "These coordinates were pulled from your current profile. If they're wrong, switch to manual entry.",
  "birthInfo.hintManual": "Birthplace and timezone default to a standard value — check that it actually matches your coordinates.",
  "birthInfo.name": "Name",
  "birthInfo.namePlaceholder": "Name or nickname",
  "birthInfo.gender": "Gender",
  "birthInfo.genderSelect": "Select",
  "birthInfo.genderFemale": "Female",
  "birthInfo.genderMale": "Male",
  "birthInfo.genderUnknown": "Prefer not to say",
  "birthInfo.birthDate": "Date of birth",
  "birthInfo.birthTime": "Time of birth",
  "birthInfo.calendar": "Calendar",
  "birthInfo.calendarSolar": "Solar",
  "birthInfo.calendarLunar": "Lunar",
  "birthInfo.city": "Birthplace",
  "birthInfo.timezone": "Timezone",
  "birthInfo.birthTimeUnknown": "Birth time unknown",
  "intensitySelect.title": "Choose your fact-punch intensity",
  "intensitySelect.roarWarningTitle": "Lion's Roar warning",
  "intensitySelect.roarWarningBody": "This intensity leads with confrontation over comfort. If today's a fragile day, dropping to Mild won't blur the operation.",
  "questionInput.title": "Enter your question",
  "questionInput.label": "The question that's shaking your choice right now",
  "questionInput.placeholder": "Write the thing you most want an answer to right now.\nWrite as much as you need — excuses included.\nI'll sort it out myself.",
  "questionInput.methodUnselected": "Method not selected",
  "questionInput.topicUnselected": "Topic not selected",
  "questionInput.intensityUnselected": "Intensity not selected",
  "validationPanel.title": "Your operation info is incomplete",
  "errorPanel.title": "Operation launch failed",
  "statusPanel.completed": "Operation briefing has arrived",
  "statusPanel.inProgress": "Operation in progress",
  "launchConfirm.title": "Confirm Lion Seal",
  "launchConfirm.ctaPayment": "Confirming payment",
  "launchConfirm.ctaGenerating": "Generating expert consultation",
  "launchConfirm.ctaAnalyzing": "Analyzing the operation map",
  "launchConfirm.ctaStart": "Launch operation with Lion Seal",
  "launchConfirm.hint": "Once the Lion Seal comes down, your question becomes an operation order.",
  "readyPanel.title": "Operation briefing complete",
  "readyPanel.preflightMeta": "The same input leads to the same operation request.",
  "briefing.eyebrow": "1st Operation Briefing",
  "briefing.fallbackTitle": "Unnamed Operation",
  "briefing.savedNotice": "Result saved",
  "briefing.revealAria": "Expand the full briefing",
  "briefing.revealButton": "Expand all",
  "briefing.frontlineLabel": "Your fault line right now",
  "briefing.repeatedChoiceFallback": "The choice you keep repeating",
  "briefing.innateNatureFallback": "The core of your innate nature",
  "briefing.innateStrengthFallback": "Your innate strengths and weaknesses",
  "briefing.topicStyleFallback": "Your approach to this topic",
  "briefing.topicAreasLabel": "Deep dive by topic area",
  "briefing.topicTimingFallback": "The timing flow of this topic",
  "briefing.originalStrategyFallback": "How you were meant to move",
  "briefing.misalignedFlowFallback": "Where your current flow is off",
  "briefing.compatScoresLabel": "Compatibility gauges",
  "briefing.compatScoreOverall": "Overall",
  "briefing.compatScoreResonance": "Resonance",
  "briefing.compatScoreFriction": "Conflict risk",
  "briefing.compatScoreGrowth": "Growth",
  "briefing.compatScoreAttraction": "Attraction",
  "briefing.compatScoreStability": "Stability",
  "briefing.compatScoreCommunication": "Communication",
  "briefing.compatScoreEndurance": "Endurance",
  "briefing.compatScoreNote": "Higher is better on every gauge. Any gauge that runs the other way (Conflict risk) says so in its label.",
  "briefing.compatScoreAshtakutaNote": "The traditional Indian Ashtakuta score out of 36, shown as a percentage. The per-item scores are in the evidence below.",
  "briefing.compatStatusLabel": "Relationship status",
  "briefing.compatPartnerTimeUnknownNote": "Your partner's birth time is unknown, so time-dependent readings are kept deliberately wide.",
  "briefing.compatStatus.crush": "Crushing",
  "briefing.compatStatus.dating": "Dating",
  "briefing.compatStatus.longterm": "Long-term",
  "briefing.compatStatus.breakup": "Broken up",
  "briefing.compatStatus.reconciling": "Trying to reconcile",
  "briefing.compatStatus.engaged": "Engaged",
  "briefing.compatStatus.married": "Married",
  "briefing.compatTowardPartnerFallback": "What you feel toward them",
  "briefing.compatTowardMeFallback": "What they may feel toward you",
  "briefing.compatCoreKeywordLabel": "The keyword for this relationship",
  "briefing.compatPalaceCrossLabel": "Palace cross-reading",
  "briefing.compatConflictFallback": "The riskiest pattern in this relationship",
  "briefing.compatConflictTriggerLabel": "Where it ignites",
  "briefing.compatConflictEscalationLabel": "How it spreads",
  "briefing.compatConflictDialogueLabel": "What actually gets said",
  "briefing.compatConflictResolutionLabel": "The order to unwind it",
  "briefing.compatStrategyFallback": "The operation for where you are now",
  "briefing.compatStrategySituationLabel": "Reading of where you stand",
  "briefing.compatStrategyDoLabel": "Do this",
  "briefing.compatStrategyAvoidLabel": "Avoid this",
  "partner.title": "Your partner",
  "partner.sectionCopy": "Love and reunion consultations only. Put their chart next to yours and NEO answers from the structure of the relationship.",
  "partner.modeGroupAria": "Choose who this reading is for",
  "partner.modeSolo": "Just me",
  "partner.modeCompat": "The two of us",
  "partner.hintSolo": "Reading your chart alone.",
  "partner.hintCompat": "Crossing their chart swaps four chapters for a compatibility reading. The price does not change.",
  "partner.statusLabel": "Relationship status",
  "partner.statusHint": "Which stage you are in shifts where the strategy chapter puts its weight.",
  "partner.statusGroupAria": "Choose the relationship status",
  "partner.name": "Partner's name",
  "partner.namePlaceholder": "For display only - you can leave it blank",
  "partner.launchBadge": "Compatibility mode",
  "briefing.forbiddenActionFallback": "Forbidden action for today",
  "briefing.actionOrdersLabel": "Orders to act on now",
  "briefing.sevenDayLabel": "7-Day Operation",
  "briefing.realityQuestionsLabel": "Reality check questions",
  "realityPanel.eyebrow": "Reality Check",
  "realityPanel.title": "Are you really living like that?",
  "realityPanel.subtitle": "Test NEO's first verdict against your reality. You can agree, or push back.",
  "realityPanel.operationNameLabel": "1st operation name",
  "realityPanel.questionsLabel": "NEO's reality check questions",
  "realityPanel.freeformLabel": "Anything else to tell NEO",
  "realityPanel.freeformPlaceholder": "Push back on NEO, or explain your situation in more detail.\nExcuses are fine too — NEO will sort it out.",
  "realityPanel.errorTitle": "Revised operation order failed",
  "realityPanel.submitBusy": "Writing the revised operation order",
  "realityPanel.submitIdle": "Get the revised operation order",
  "refinedOrder.eyebrow": "2nd Revised Operation Order",
  "refinedOrder.fallbackTitle": "Revised Operation",
  "refinedOrder.badgePrefix": "Today's Lion Seal",
  "refinedOrder.alternativesLabel": "Concrete alternative actions",
  "refinedOrder.peopleLabel": "People you should meet",
  "refinedOrder.whereToFindPrefix": "Where to find",
  "refinedOrder.thirtyDayLabel": "30-Day Strategy",
  "refinedOrder.thisWeekLabel": "This week's first step",
  "refinedOrder.closingLabel": "NEO · Closing word",
};

const NEO_FORM_COPY_JA: NeoFormCopyTable = {
  "operationMap.title": "運命の作戦地図",
  "operationMap.fallbackStatus": "ネオが作戦ブリーフィングをまとめている。",
  "operationMap.stage.0": "ネオが運命の作戦地図を広げている最中...",
  "operationMap.stage.1": "獅子の紋章がお前の運命の前線を感知中...",
  "operationMap.stage.2": "繰り返される選択を追跡中...",
  "operationMap.stage.3": "耳障りの良い言葉と必要な言葉を分けている最中...",
  "operationMap.stage.4": "お前が避けてきた核心を探している最中...",
  "operationMap.stage.5": "作戦ブリーフィングを作成中...",
  "operationMap.stageCompleteLine": "終わった。作戦ブリーフィングに印を押した。",
  "operationMap.completeLabel": "完了",
  "operationMap.refiningStage": "現実の回答を反映し、修正作戦命令書を書いている最中...",
  "operationMap.checkingStage": "獅子紋章の権限を確認中...",
  "operationMap.paymentStage": "利用券と決済信号を照合中...",
  "operationMap.completingStage": "作戦ブリーフィングに印を押している最中...",
  "sealPerk.ariaLabel": "獅子紋章特典の案内",
  "sealPerk.title": "獅子紋章を5個集めるとロック特典が解放される",
  "sealPerk.desc": "作戦を完了するたび獅子紋章が積み重なる。5個集まると下記の特典が結果画面で解放される。",
  "sealPerk.lockLabel": "ロック",
  "sealPerk.letterTitle": "ネオの秘密の手紙",
  "sealPerk.letterDesc": "結果に含まれない追加の解釈と忠告が解放される",
  "sealPerk.pdfTitle": "作戦命令書PDFダウンロード",
  "sealPerk.pdfDesc": "ブリーフィング全体をPDFで保存し、いつでも読み返せる",
  "sealPerk.imageAlt": "黄金の獅子紋章",
  "commandConversation.ariaLabel": "ネオの作戦案内",
  "commandFlow.stepMethod": "分析方式",
  "commandFlow.stepTopic": "相談前線",
  "commandFlow.stepBirth": "座標確認",
  "commandFlow.stepIntensity": "ファクトパンチ強度",
  "commandFlow.stepQuestion": "質問入力",
  "commandFlow.stepLaunch": "作戦開始",
  "commandFlow.hintChooseMethod": "まずどの地図で前線を見るか選べば、次の段階が開く。",
  "commandFlow.hintChooseTopic": "今いちばん揺れている前線を一つに絞れ。",
  "commandFlow.hintBirth": "出生座標を確認しないと、同じ壁にぶつかる流れを断ち切れない。",
  "commandFlow.hintIntensity": "ファクトパンチの強度は、今日お前が受け止められる直面の深さだ。",
  "commandFlow.hintReady": "作戦ブリーフィングが到着した。現実点検まで進める。",
  "commandFlow.hintLaunchReady": "獅子紋章で作戦を開始する準備が整った。",
  "topicSelect.title": "相談テーマを選択",
  "birthInfo.title": "作戦対象の情報を確認",
  "birthInfo.sectionCopy": "地図を広げるには基本座標が必要だ。適当に入れれば適当な結果が返る。",
  "birthInfo.modeGroupAria": "出生情報の入力方式",
  "birthInfo.useSaved": "現在のプロフィールを使用",
  "birthInfo.manual": "直接入力",
  "birthInfo.hintSaved": "現在のプロフィールから読み込んだ座標だ。違っていたら直接入力に切り替えろ。",
  "birthInfo.hintManual": "出生地とタイムゾーンには基準値が入っている。お前の座標に合っているか確認しろ。",
  "birthInfo.name": "名前",
  "birthInfo.namePlaceholder": "名前またはニックネーム",
  "birthInfo.gender": "性別",
  "birthInfo.genderSelect": "選択",
  "birthInfo.genderFemale": "女性",
  "birthInfo.genderMale": "男性",
  "birthInfo.genderUnknown": "選択しない",
  "birthInfo.birthDate": "生年月日",
  "birthInfo.birthTime": "出生時間",
  "birthInfo.calendar": "暦",
  "birthInfo.calendarSolar": "新暦",
  "birthInfo.calendarLunar": "旧暦",
  "birthInfo.city": "出生地",
  "birthInfo.timezone": "タイムゾーン",
  "birthInfo.birthTimeUnknown": "出生時間不明",
  "intensitySelect.title": "ファクトパンチの強度を選択",
  "intensitySelect.roarWarningTitle": "獅子咆哮味の注意",
  "intensitySelect.roarWarningBody": "この強度は慰めより直面を優先する。心が繊細な日はマイルド味に下げても作戦はぶれない。",
  "questionInput.title": "質問を入力",
  "questionInput.label": "今お前の選択を揺らしている質問",
  "questionInput.placeholder": "今いちばん答えを知りたい問題を書け。\n長く書いてもいい。言い訳も含めろ。\n俺が勝手にふるいにかける。",
  "questionInput.methodUnselected": "分析方式未選択",
  "questionInput.topicUnselected": "テーマ未選択",
  "questionInput.intensityUnselected": "強度未選択",
  "validationPanel.title": "作戦情報が足りない",
  "errorPanel.title": "作戦開始に失敗した",
  "statusPanel.completed": "作戦ブリーフィング到着",
  "statusPanel.inProgress": "作戦進行中",
  "launchConfirm.title": "獅子紋章確認",
  "launchConfirm.ctaPayment": "決済確認中",
  "launchConfirm.ctaGenerating": "専門相談生成中",
  "launchConfirm.ctaAnalyzing": "作戦地図分析中",
  "launchConfirm.ctaStart": "獅子紋章で作戦開始",
  "launchConfirm.hint": "獅子紋章が下りれば、お前の質問は作戦命令書に整理される。",
  "readyPanel.title": "作戦ブリーフィング完了",
  "readyPanel.preflightMeta": "同じ入力は同じ作戦リクエストにつながる。",
  "briefing.eyebrow": "第1次作戦ブリーフィング",
  "briefing.fallbackTitle": "無名作戦",
  "briefing.savedNotice": "結果を保管済み",
  "briefing.revealAria": "ブリーフィングを全て展開",
  "briefing.revealButton": "全て展開",
  "briefing.frontlineLabel": "今の運命の前線",
  "briefing.repeatedChoiceFallback": "繰り返している選択",
  "briefing.innateNatureFallback": "生まれ持った性向の核",
  "briefing.innateStrengthFallback": "生まれ持った強みと弱み",
  "briefing.topicStyleFallback": "このテーマでのお前のやり方",
  "briefing.topicAreasLabel": "テーマ領域別の深掘り",
  "briefing.topicTimingFallback": "このテーマの時期の流れ",
  "briefing.originalStrategyFallback": "本来お前はこう動くべきだ",
  "briefing.misalignedFlowFallback": "今の流れがずれている場所",
  "briefing.compatScoresLabel": "相性の計器盤",
  "briefing.compatScoreOverall": "総合",
  "briefing.compatScoreResonance": "共鳴",
  "briefing.compatScoreFriction": "衝突リスク",
  "briefing.compatScoreGrowth": "成長",
  "briefing.compatScoreAttraction": "惹かれ",
  "briefing.compatScoreStability": "安定",
  "briefing.compatScoreCommunication": "対話",
  "briefing.compatScoreEndurance": "持久力",
  "briefing.compatScoreNote": "各軸は高いほど良い。方向が逆の軸（衝突リスク）はラベルにそう書いてある。",
  "briefing.compatScoreAshtakutaNote": "インド伝統のアシュタクータ36点満点を百分率に換算した値だ。項目別の点数は下の根拠にある。",
  "briefing.compatStatusLabel": "関係の状態",
  "briefing.compatPartnerTimeUnknownNote": "相手の出生時間が不明のため、時間に依存する判読は幅を広く取っている。",
  "briefing.compatStatus.crush": "片思い",
  "briefing.compatStatus.dating": "交際中",
  "briefing.compatStatus.longterm": "長期交際",
  "briefing.compatStatus.breakup": "別れた",
  "briefing.compatStatus.reconciling": "復縁を試み中",
  "briefing.compatStatus.engaged": "結婚予定",
  "briefing.compatStatus.married": "夫婦",
  "briefing.compatTowardPartnerFallback": "私が相手に感じるもの",
  "briefing.compatTowardMeFallback": "相手が私に感じうるもの",
  "briefing.compatCoreKeywordLabel": "この関係の核心キーワード",
  "briefing.compatPalaceCrossLabel": "宮の交差判読",
  "briefing.compatConflictFallback": "この関係で最も危険なパターン",
  "briefing.compatConflictTriggerLabel": "火がつく地点",
  "briefing.compatConflictEscalationLabel": "燃え広がる経路",
  "briefing.compatConflictDialogueLabel": "実際に交わされる言葉",
  "briefing.compatConflictResolutionLabel": "解く順序",
  "briefing.compatStrategyFallback": "今の状態での作戦",
  "briefing.compatStrategySituationLabel": "今の状態の判読",
  "briefing.compatStrategyDoLabel": "やること",
  "briefing.compatStrategyAvoidLabel": "やらないこと",
  "partner.title": "相手の情報",
  "partner.sectionCopy": "恋愛・復縁の相談でのみ開く。相手の命盤を並べれば、ネオが関係の構造を根拠に答える。",
  "partner.modeGroupAria": "鑑定の人数を選択",
  "partner.modeSolo": "一人で見る",
  "partner.modeCompat": "二人で見る",
  "partner.hintSolo": "あなたの命盤だけを見る。",
  "partner.hintCompat": "相手の命盤と交差させ、4章が相性判読に変わる。価格は変わらない。",
  "partner.statusLabel": "関係の状態",
  "partner.statusHint": "今どの段階かで、作戦章の重心が変わる。",
  "partner.statusGroupAria": "関係の状態を選択",
  "partner.name": "相手の名前",
  "partner.namePlaceholder": "表示用。空欄でもよい",
  "partner.launchBadge": "相性モード",
  "briefing.forbiddenActionFallback": "今日の禁止行動",
  "briefing.actionOrdersLabel": "今すぐやるべき作戦",
  "briefing.sevenDayLabel": "7日間作戦",
  "briefing.realityQuestionsLabel": "現実点検の質問",
  "realityPanel.eyebrow": "現実点検",
  "realityPanel.title": "お前、本当にそう生きてるのか？",
  "realityPanel.subtitle": "ネオの一次判断にお前の現実を当てはめろ。認めてもいいし、反論してもいい。",
  "realityPanel.operationNameLabel": "第1次作戦名",
  "realityPanel.questionsLabel": "ネオの現実点検質問",
  "realityPanel.freeformLabel": "ネオにもっと伝えたい現実",
  "realityPanel.freeformPlaceholder": "ネオに反論するか、今の状況をもっと詳しく書け。\n言い訳でも構わない。ネオが勝手にふるいにかける。",
  "realityPanel.errorTitle": "修正作戦命令書の作成に失敗した",
  "realityPanel.submitBusy": "修正作戦作成中",
  "realityPanel.submitIdle": "修正作戦命令書を受け取る",
  "refinedOrder.eyebrow": "第2次修正作戦命令書",
  "refinedOrder.fallbackTitle": "修正作戦",
  "refinedOrder.badgePrefix": "本日の獅子紋章",
  "refinedOrder.alternativesLabel": "具体的な実行代案",
  "refinedOrder.peopleLabel": "会うべき人",
  "refinedOrder.whereToFindPrefix": "見つけられる場所",
  "refinedOrder.thirtyDayLabel": "30日戦略",
  "refinedOrder.thisWeekLabel": "今週の第一歩",
  "refinedOrder.closingLabel": "NEO・締めの一言",
};

const NEO_FORM_COPY_ZH_CN: NeoFormCopyTable = {
  "operationMap.title": "命运作战地图",
  "operationMap.fallbackStatus": "尼奥正在整理作战简报。",
  "operationMap.stage.0": "尼奥正在展开命运作战地图...",
  "operationMap.stage.1": "狮徽正在探测你命运的前线...",
  "operationMap.stage.2": "正在追踪你反复做出的选择...",
  "operationMap.stage.3": "正在把好听的话和该听的话分开...",
  "operationMap.stage.4": "正在找出你一直回避的核心...",
  "operationMap.stage.5": "正在撰写作战简报...",
  "operationMap.stageCompleteLine": "好了。作战简报已盖章完成。",
  "operationMap.completeLabel": "完成",
  "operationMap.refiningStage": "正在根据现实检验答案撰写修正作战命令书...",
  "operationMap.checkingStage": "正在确认狮徽权限...",
  "operationMap.paymentStage": "正在核对通行券与付款信号...",
  "operationMap.completingStage": "正在为作战简报盖章...",
  "sealPerk.ariaLabel": "狮徽特典说明",
  "sealPerk.title": "集齐5枚狮徽即可解锁隐藏特典",
  "sealPerk.desc": "每完成一次作战就能获得一枚狮徽。集齐5枚，下方特典就会在结果页解锁。",
  "sealPerk.lockLabel": "锁定",
  "sealPerk.letterTitle": "尼奥的秘密信件",
  "sealPerk.letterDesc": "解锁结果中未包含的额外解读与叮嘱",
  "sealPerk.pdfTitle": "作战命令书PDF下载",
  "sealPerk.pdfDesc": "将完整简报保存为PDF，随时可以重新查看",
  "sealPerk.imageAlt": "金色狮徽",
  "commandConversation.ariaLabel": "尼奥作战指引",
  "commandFlow.stepMethod": "分析方式",
  "commandFlow.stepTopic": "咨询前线",
  "commandFlow.stepBirth": "确认坐标",
  "commandFlow.stepIntensity": "犀利程度",
  "commandFlow.stepQuestion": "输入问题",
  "commandFlow.stepLaunch": "启动作战",
  "commandFlow.hintChooseMethod": "先选择用哪张地图来看前线，下一步才会打开。",
  "commandFlow.hintChooseTopic": "把当下最动摇的前线收窄成一个。",
  "commandFlow.hintBirth": "需要确认出生坐标，才能拆解一直撞上同一堵墙的流向。",
  "commandFlow.hintIntensity": "犀利程度决定你今天能承受多深的直面。",
  "commandFlow.hintReady": "作战简报已送达，可以继续进入现实检验。",
  "commandFlow.hintLaunchReady": "已准备好用狮徽启动作战。",
  "topicSelect.title": "选择咨询主题",
  "birthInfo.title": "确认作战对象的信息",
  "birthInfo.sectionCopy": "要展开地图，需要基本坐标。随便填只会得到随便的结果。",
  "birthInfo.modeGroupAria": "出生信息输入方式",
  "birthInfo.useSaved": "使用当前资料",
  "birthInfo.manual": "手动输入",
  "birthInfo.hintSaved": "这是从当前资料读取的坐标。如果不对，请切换为手动输入。",
  "birthInfo.hintManual": "出生地与时区已填入默认值，请确认是否符合你的坐标。",
  "birthInfo.name": "姓名",
  "birthInfo.namePlaceholder": "姓名或昵称",
  "birthInfo.gender": "性别",
  "birthInfo.genderSelect": "选择",
  "birthInfo.genderFemale": "女性",
  "birthInfo.genderMale": "男性",
  "birthInfo.genderUnknown": "不选择",
  "birthInfo.birthDate": "出生日期",
  "birthInfo.birthTime": "出生时间",
  "birthInfo.calendar": "历法",
  "birthInfo.calendarSolar": "阳历",
  "birthInfo.calendarLunar": "阴历",
  "birthInfo.city": "出生地",
  "birthInfo.timezone": "时区",
  "birthInfo.birthTimeUnknown": "出生时间不详",
  "intensitySelect.title": "选择犀利程度",
  "intensitySelect.roarWarningTitle": "狮吼味提醒",
  "intensitySelect.roarWarningBody": "此强度以直面问题为先，而非安慰。若今天情绪敏感，调低到温和味也不会影响作战。",
  "questionInput.title": "输入问题",
  "questionInput.label": "此刻动摇你选择的问题",
  "questionInput.placeholder": "写下你现在最想知道答案的问题。\n可以写长一些，借口也写进去。\n我会自行筛选。",
  "questionInput.methodUnselected": "未选择分析方式",
  "questionInput.topicUnselected": "未选择主题",
  "questionInput.intensityUnselected": "未选择强度",
  "validationPanel.title": "作战信息不完整",
  "errorPanel.title": "作战启动失败",
  "statusPanel.completed": "作战简报已送达",
  "statusPanel.inProgress": "作战进行中",
  "launchConfirm.title": "确认狮徽",
  "launchConfirm.ctaPayment": "确认支付中",
  "launchConfirm.ctaGenerating": "专家咨询生成中",
  "launchConfirm.ctaAnalyzing": "作战地图分析中",
  "launchConfirm.ctaStart": "以狮徽开启作战",
  "launchConfirm.hint": "狮徽降下后，你的问题将整理成作战命令书。",
  "readyPanel.title": "作战简报完成",
  "readyPanel.preflightMeta": "相同的输入会指向同一份作战请求。",
  "briefing.eyebrow": "第1次作战简报",
  "briefing.fallbackTitle": "无名作战",
  "briefing.savedNotice": "结果已保存",
  "briefing.revealAria": "展开完整简报",
  "briefing.revealButton": "全部展开",
  "briefing.frontlineLabel": "你现在的命运前线",
  "briefing.repeatedChoiceFallback": "你反复做出的选择",
  "briefing.innateNatureFallback": "你天生性情的核心",
  "briefing.innateStrengthFallback": "你天生的优势与弱点",
  "briefing.topicStyleFallback": "你在此主题上的方式",
  "briefing.topicAreasLabel": "分主题领域深度解析",
  "briefing.topicTimingFallback": "此主题的时机流向",
  "briefing.originalStrategyFallback": "你本该这样行动",
  "briefing.misalignedFlowFallback": "当前偏离轨道的地方",
  "briefing.compatScoresLabel": "合盘仪表盘",
  "briefing.compatScoreOverall": "综合",
  "briefing.compatScoreResonance": "共鸣",
  "briefing.compatScoreFriction": "冲突风险",
  "briefing.compatScoreGrowth": "成长",
  "briefing.compatScoreAttraction": "吸引",
  "briefing.compatScoreStability": "稳定",
  "briefing.compatScoreCommunication": "沟通",
  "briefing.compatScoreEndurance": "耐力",
  "briefing.compatScoreNote": "每个指标都是越高越好。方向相反的指标（冲突风险）已在标签上注明。",
  "briefing.compatScoreAshtakutaNote": "这是印度传统八字合婚（Ashtakuta）满分36分换算成的百分比。各项分数见下方依据。",
  "briefing.compatStatusLabel": "关系状态",
  "briefing.compatPartnerTimeUnknownNote": "对方的出生时间不详，因此依赖时辰的解读刻意放宽了范围。",
  "briefing.compatStatus.crush": "暧昧期",
  "briefing.compatStatus.dating": "恋爱中",
  "briefing.compatStatus.longterm": "长期恋爱",
  "briefing.compatStatus.breakup": "已分手",
  "briefing.compatStatus.reconciling": "尝试复合",
  "briefing.compatStatus.engaged": "准备结婚",
  "briefing.compatStatus.married": "已婚",
  "briefing.compatTowardPartnerFallback": "我对对方的感受",
  "briefing.compatTowardMeFallback": "对方可能对我的感受",
  "briefing.compatCoreKeywordLabel": "这段关系的核心关键词",
  "briefing.compatPalaceCrossLabel": "宫位交叉解读",
  "briefing.compatConflictFallback": "这段关系中最危险的模式",
  "briefing.compatConflictTriggerLabel": "引爆点",
  "briefing.compatConflictEscalationLabel": "蔓延路径",
  "briefing.compatConflictDialogueLabel": "实际会说出口的话",
  "briefing.compatConflictResolutionLabel": "化解顺序",
  "briefing.compatStrategyFallback": "当前状态下的作战",
  "briefing.compatStrategySituationLabel": "当前状态解读",
  "briefing.compatStrategyDoLabel": "要做的",
  "briefing.compatStrategyAvoidLabel": "不要做的",
  "partner.title": "对方信息",
  "partner.sectionCopy": "仅恋爱・复合咨询开放。把对方的命盘并排放上，尼奥就能依据关系结构作答。",
  "partner.modeGroupAria": "选择本次咨询的人数",
  "partner.modeSolo": "只看我自己",
  "partner.modeCompat": "两个人一起看",
  "partner.hintSolo": "只看你的命盘。",
  "partner.hintCompat": "与对方命盘交叉后，四个章节会换成合盘解读。价格不变。",
  "partner.statusLabel": "关系状态",
  "partner.statusHint": "处于哪个阶段，会改变作战章节的重心。",
  "partner.statusGroupAria": "选择关系状态",
  "partner.name": "对方姓名",
  "partner.namePlaceholder": "仅用于显示，可以留空",
  "partner.launchBadge": "合盘模式",
  "briefing.forbiddenActionFallback": "今日禁止行动",
  "briefing.actionOrdersLabel": "现在就该执行的作战",
  "briefing.sevenDayLabel": "7日作战",
  "briefing.realityQuestionsLabel": "现实检验问题",
  "realityPanel.eyebrow": "现实检验",
  "realityPanel.title": "你，真的是这样过日子的吗？",
  "realityPanel.subtitle": "把你的现实代入尼奥的初步判断。可以认同，也可以反驳。",
  "realityPanel.operationNameLabel": "第1次作战名称",
  "realityPanel.questionsLabel": "尼奥的现实检验问题",
  "realityPanel.freeformLabel": "还想告诉尼奥的现实",
  "realityPanel.freeformPlaceholder": "可以反驳尼奥，或更详细地说明现在的情况。\n借口也没关系，尼奥会自行筛选。",
  "realityPanel.errorTitle": "修正作战命令书生成失败",
  "realityPanel.submitBusy": "修正作战撰写中",
  "realityPanel.submitIdle": "领取修正作战命令书",
  "refinedOrder.eyebrow": "第2次修正作战命令书",
  "refinedOrder.fallbackTitle": "修正作战",
  "refinedOrder.badgePrefix": "今日狮徽",
  "refinedOrder.alternativesLabel": "具体执行方案",
  "refinedOrder.peopleLabel": "该去见的人",
  "refinedOrder.whereToFindPrefix": "可以找到的地方",
  "refinedOrder.thirtyDayLabel": "30日战略",
  "refinedOrder.thisWeekLabel": "本周第一步",
  "refinedOrder.closingLabel": "NEO · 结语",
};

const NEO_FORM_COPY_ZH_TW: NeoFormCopyTable = {
  "operationMap.title": "命運作戰地圖",
  "operationMap.fallbackStatus": "尼歐正在整理作戰簡報。",
  "operationMap.stage.0": "尼歐正在展開命運作戰地圖...",
  "operationMap.stage.1": "獅徽正在偵測你命運的前線...",
  "operationMap.stage.2": "正在追蹤你反覆做出的選擇...",
  "operationMap.stage.3": "正在把好聽的話和該聽的話分開...",
  "operationMap.stage.4": "正在找出你一直迴避的核心...",
  "operationMap.stage.5": "正在撰寫作戰簡報...",
  "operationMap.stageCompleteLine": "好了。作戰簡報已蓋章完成。",
  "operationMap.completeLabel": "完成",
  "operationMap.refiningStage": "正在根據現實檢驗答案撰寫修正作戰命令書...",
  "operationMap.checkingStage": "正在確認獅徽權限...",
  "operationMap.paymentStage": "正在核對通行券與付款信號...",
  "operationMap.completingStage": "正在為作戰簡報蓋章...",
  "sealPerk.ariaLabel": "獅徽特典說明",
  "sealPerk.title": "集齊5枚獅徽即可解鎖隱藏特典",
  "sealPerk.desc": "每完成一次作戰就能獲得一枚獅徽。集齊5枚，下方特典就會在結果頁解鎖。",
  "sealPerk.lockLabel": "鎖定",
  "sealPerk.letterTitle": "尼歐的秘密信件",
  "sealPerk.letterDesc": "解鎖結果中未包含的額外解讀與叮嚀",
  "sealPerk.pdfTitle": "作戰命令書PDF下載",
  "sealPerk.pdfDesc": "將完整簡報保存為PDF，隨時可以重新查看",
  "sealPerk.imageAlt": "金色獅徽",
  "commandConversation.ariaLabel": "尼歐作戰指引",
  "commandFlow.stepMethod": "分析方式",
  "commandFlow.stepTopic": "諮詢前線",
  "commandFlow.stepBirth": "確認座標",
  "commandFlow.stepIntensity": "犀利程度",
  "commandFlow.stepQuestion": "輸入問題",
  "commandFlow.stepLaunch": "啟動作戰",
  "commandFlow.hintChooseMethod": "先選擇用哪張地圖來看前線，下一步才會打開。",
  "commandFlow.hintChooseTopic": "把當下最動搖的前線收窄成一個。",
  "commandFlow.hintBirth": "需要確認出生座標，才能拆解一直撞上同一道牆的流向。",
  "commandFlow.hintIntensity": "犀利程度決定你今天能承受多深的直面。",
  "commandFlow.hintReady": "作戰簡報已送達，可以繼續進入現實檢驗。",
  "commandFlow.hintLaunchReady": "已準備好用獅徽啟動作戰。",
  "topicSelect.title": "選擇諮詢主題",
  "birthInfo.title": "確認作戰對象的資訊",
  "birthInfo.sectionCopy": "要展開地圖，需要基本座標。隨便填只會得到隨便的結果。",
  "birthInfo.modeGroupAria": "出生資訊輸入方式",
  "birthInfo.useSaved": "使用目前資料",
  "birthInfo.manual": "手動輸入",
  "birthInfo.hintSaved": "這是從目前資料讀取的座標。如果不對，請切換為手動輸入。",
  "birthInfo.hintManual": "出生地與時區已填入預設值，請確認是否符合你的座標。",
  "birthInfo.name": "姓名",
  "birthInfo.namePlaceholder": "姓名或暱稱",
  "birthInfo.gender": "性別",
  "birthInfo.genderSelect": "選擇",
  "birthInfo.genderFemale": "女性",
  "birthInfo.genderMale": "男性",
  "birthInfo.genderUnknown": "不選擇",
  "birthInfo.birthDate": "出生日期",
  "birthInfo.birthTime": "出生時間",
  "birthInfo.calendar": "曆法",
  "birthInfo.calendarSolar": "陽曆",
  "birthInfo.calendarLunar": "陰曆",
  "birthInfo.city": "出生地",
  "birthInfo.timezone": "時區",
  "birthInfo.birthTimeUnknown": "出生時間不詳",
  "intensitySelect.title": "選擇犀利程度",
  "intensitySelect.roarWarningTitle": "獅吼味提醒",
  "intensitySelect.roarWarningBody": "此強度以直面問題為先，而非安慰。若今天情緒敏感，調低到溫和味也不會影響作戰。",
  "questionInput.title": "輸入問題",
  "questionInput.label": "此刻動搖你選擇的問題",
  "questionInput.placeholder": "寫下你現在最想知道答案的問題。\n可以寫長一些，藉口也寫進去。\n我會自行篩選。",
  "questionInput.methodUnselected": "未選擇分析方式",
  "questionInput.topicUnselected": "未選擇主題",
  "questionInput.intensityUnselected": "未選擇強度",
  "validationPanel.title": "作戰資訊不完整",
  "errorPanel.title": "作戰啟動失敗",
  "statusPanel.completed": "作戰簡報已送達",
  "statusPanel.inProgress": "作戰進行中",
  "launchConfirm.title": "確認獅徽",
  "launchConfirm.ctaPayment": "確認付款中",
  "launchConfirm.ctaGenerating": "專家諮詢生成中",
  "launchConfirm.ctaAnalyzing": "作戰地圖分析中",
  "launchConfirm.ctaStart": "以獅徽開啟作戰",
  "launchConfirm.hint": "獅徽降下後，你的問題將整理成作戰命令書。",
  "readyPanel.title": "作戰簡報完成",
  "readyPanel.preflightMeta": "相同的輸入會指向同一份作戰請求。",
  "briefing.eyebrow": "第1次作戰簡報",
  "briefing.fallbackTitle": "無名作戰",
  "briefing.savedNotice": "結果已保存",
  "briefing.revealAria": "展開完整簡報",
  "briefing.revealButton": "全部展開",
  "briefing.frontlineLabel": "你現在的命運前線",
  "briefing.repeatedChoiceFallback": "你反覆做出的選擇",
  "briefing.innateNatureFallback": "你天生性情的核心",
  "briefing.innateStrengthFallback": "你天生的優勢與弱點",
  "briefing.topicStyleFallback": "你在此主題上的方式",
  "briefing.topicAreasLabel": "分主題領域深度解析",
  "briefing.topicTimingFallback": "此主題的時機流向",
  "briefing.originalStrategyFallback": "你本該這樣行動",
  "briefing.misalignedFlowFallback": "當前偏離軌道的地方",
  "briefing.compatScoresLabel": "合盤儀表板",
  "briefing.compatScoreOverall": "綜合",
  "briefing.compatScoreResonance": "共鳴",
  "briefing.compatScoreFriction": "衝突風險",
  "briefing.compatScoreGrowth": "成長",
  "briefing.compatScoreAttraction": "吸引",
  "briefing.compatScoreStability": "穩定",
  "briefing.compatScoreCommunication": "溝通",
  "briefing.compatScoreEndurance": "耐力",
  "briefing.compatScoreNote": "每個指標都是越高越好。方向相反的指標（衝突風險）已在標籤上註明。",
  "briefing.compatScoreAshtakutaNote": "這是印度傳統八字合婚（Ashtakuta）滿分36分換算成的百分比。各項分數見下方依據。",
  "briefing.compatStatusLabel": "關係狀態",
  "briefing.compatPartnerTimeUnknownNote": "對方的出生時間不詳，因此依賴時辰的解讀刻意放寬了範圍。",
  "briefing.compatStatus.crush": "曖昧期",
  "briefing.compatStatus.dating": "戀愛中",
  "briefing.compatStatus.longterm": "長期戀愛",
  "briefing.compatStatus.breakup": "已分手",
  "briefing.compatStatus.reconciling": "嘗試復合",
  "briefing.compatStatus.engaged": "準備結婚",
  "briefing.compatStatus.married": "已婚",
  "briefing.compatTowardPartnerFallback": "我對對方的感受",
  "briefing.compatTowardMeFallback": "對方可能對我的感受",
  "briefing.compatCoreKeywordLabel": "這段關係的核心關鍵詞",
  "briefing.compatPalaceCrossLabel": "宮位交叉解讀",
  "briefing.compatConflictFallback": "這段關係中最危險的模式",
  "briefing.compatConflictTriggerLabel": "引爆點",
  "briefing.compatConflictEscalationLabel": "蔓延路徑",
  "briefing.compatConflictDialogueLabel": "實際會說出口的話",
  "briefing.compatConflictResolutionLabel": "化解順序",
  "briefing.compatStrategyFallback": "當前狀態下的作戰",
  "briefing.compatStrategySituationLabel": "當前狀態解讀",
  "briefing.compatStrategyDoLabel": "要做的",
  "briefing.compatStrategyAvoidLabel": "不要做的",
  "partner.title": "對方資訊",
  "partner.sectionCopy": "僅戀愛・復合諮詢開放。把對方的命盤並排放上，尼奧就能依據關係結構作答。",
  "partner.modeGroupAria": "選擇本次諮詢的人數",
  "partner.modeSolo": "只看我自己",
  "partner.modeCompat": "兩個人一起看",
  "partner.hintSolo": "只看你的命盤。",
  "partner.hintCompat": "與對方命盤交叉後，四個章節會換成合盤解讀。價格不變。",
  "partner.statusLabel": "關係狀態",
  "partner.statusHint": "處於哪個階段，會改變作戰章節的重心。",
  "partner.statusGroupAria": "選擇關係狀態",
  "partner.name": "對方姓名",
  "partner.namePlaceholder": "僅用於顯示，可以留空",
  "partner.launchBadge": "合盤模式",
  "briefing.forbiddenActionFallback": "今日禁止行動",
  "briefing.actionOrdersLabel": "現在就該執行的作戰",
  "briefing.sevenDayLabel": "7日作戰",
  "briefing.realityQuestionsLabel": "現實檢驗問題",
  "realityPanel.eyebrow": "現實檢驗",
  "realityPanel.title": "你，真的是這樣過日子的嗎？",
  "realityPanel.subtitle": "把你的現實代入尼歐的初步判斷。可以認同，也可以反駁。",
  "realityPanel.operationNameLabel": "第1次作戰名稱",
  "realityPanel.questionsLabel": "尼歐的現實檢驗問題",
  "realityPanel.freeformLabel": "還想告訴尼歐的現實",
  "realityPanel.freeformPlaceholder": "可以反駁尼歐，或更詳細地說明現在的狀況。\n藉口也沒關係，尼歐會自行篩選。",
  "realityPanel.errorTitle": "修正作戰命令書產生失敗",
  "realityPanel.submitBusy": "修正作戰撰寫中",
  "realityPanel.submitIdle": "領取修正作戰命令書",
  "refinedOrder.eyebrow": "第2次修正作戰命令書",
  "refinedOrder.fallbackTitle": "修正作戰",
  "refinedOrder.badgePrefix": "今日獅徽",
  "refinedOrder.alternativesLabel": "具體執行方案",
  "refinedOrder.peopleLabel": "該去見的人",
  "refinedOrder.whereToFindPrefix": "可以找到的地方",
  "refinedOrder.thirtyDayLabel": "30日戰略",
  "refinedOrder.thisWeekLabel": "本週第一步",
  "refinedOrder.closingLabel": "NEO · 結語",
};

const NEO_FORM_COPY_BY_LOCALE: Partial<Record<NonKoLocale, NeoFormCopyTable>> = {
  en: NEO_FORM_COPY_EN,
  ja: NEO_FORM_COPY_JA,
  "zh-CN": NEO_FORM_COPY_ZH_CN,
  "zh-TW": NEO_FORM_COPY_ZH_TW,
};

export function getNeoFormCopy(locale: LoadingLocale): NeoFormCopyTable {
  if (locale === "ko") return NEO_FORM_COPY_KO;
  return NEO_FORM_COPY_BY_LOCALE[locale as NonKoLocale] || NEO_FORM_COPY_EN;
}
/**
 * 관계 상태 라벨. 서버는 식별자(crush/dating/...)만 돌려주므로 표기는 이 표가 책임진다.
 * 🔴 상태 목록의 정본은 worker/lib/neo-operation-room-compat.js 의 NEO_RELATIONSHIP_STATUSES 다 —
 *    여기에만 새 상태를 더하면 서버가 그 값을 버려 라벨만 남는다.
 */
const NEO_COMPAT_STATUS_COPY_KEYS = {
  crush: "briefing.compatStatus.crush",
  dating: "briefing.compatStatus.dating",
  longterm: "briefing.compatStatus.longterm",
  breakup: "briefing.compatStatus.breakup",
  reconciling: "briefing.compatStatus.reconciling",
  engaged: "briefing.compatStatus.engaged",
  married: "briefing.compatStatus.married",
} as const satisfies Record<string, NeoFormCopyKey>;

export type NeoCompatRelationshipStatus = keyof typeof NEO_COMPAT_STATUS_COPY_KEYS;

export const NEO_COMPAT_RELATIONSHIP_STATUSES = Object.keys(
  NEO_COMPAT_STATUS_COPY_KEYS,
) as NeoCompatRelationshipStatus[];

/** 모르는 값이면 빈 문자열 — 화면이 관계 상태 줄을 통째로 뺀다. */
export function getNeoCompatStatusLabel(status: string, locale: LoadingLocale): string {
  const key = NEO_COMPAT_STATUS_COPY_KEYS[status as NeoCompatRelationshipStatus];
  return key ? getNeoFormCopy(locale)[key] : "";
}

export function getNeoOperationMapStages(locale: LoadingLocale): string[] {
  const copy = getNeoFormCopy(locale);
  return [
    copy["operationMap.stage.0"],
    copy["operationMap.stage.1"],
    copy["operationMap.stage.2"],
    copy["operationMap.stage.3"],
    copy["operationMap.stage.4"],
    copy["operationMap.stage.5"],
  ];
}

export function getNeoOperationStageLabel(currentStep: number, totalSteps: number, locale: LoadingLocale): string {
  if (locale === "ko") return `단계 ${currentStep} / ${totalSteps}`;
  if (locale === "ja") return `ステージ ${currentStep} / ${totalSteps}`;
  if (locale === "zh-CN" || locale === "zh-TW") return `阶段 ${currentStep} / ${totalSteps}`;
  return `Step ${currentStep} / ${totalSteps}`;
}

export function getNeoQuestionHint(shortfall: number, locale: LoadingLocale): string {
  if (locale === "ko") return `작전 개시는 질문을 ${shortfall}자 더 적으면 열린다.`;
  if (locale === "ja") return `作戦開始には、質問をあと${shortfall}文字書く必要がある。`;
  if (locale === "zh-CN") return `再多写${shortfall}个字，才能启动作战。`;
  if (locale === "zh-TW") return `再多寫${shortfall}個字，才能啟動作戰。`;
  return `Write ${shortfall} more character${shortfall === 1 ? "" : "s"} to launch the operation.`;
}

export function getNeoCommandStepQuestionHint(shortfall: number, locale: LoadingLocale): string {
  if (locale === "ko") return `질문을 ${shortfall}자 더 적으면 작전 개시가 열린다.`;
  if (locale === "ja") return `質問をあと${shortfall}文字書けば作戦開始が開く。`;
  if (locale === "zh-CN") return `问题再多写${shortfall}个字，就能启动作战。`;
  if (locale === "zh-TW") return `問題再多寫${shortfall}個字，就能啟動作戰。`;
  return `Write ${shortfall} more character${shortfall === 1 ? "" : "s"} to unlock the launch.`;
}

export function getNeoReadyPanelSummary(topicLabel: string, methodLabel: string, intensityLabel: string, locale: LoadingLocale): string {
  if (locale === "ko") {
    return `${topicLabel} 전선은 ${methodLabel}로 판을 읽고, ${intensityLabel}으로 핵심을 찌른다. 현실 점검 답변을 받으면 2차 수정 작전 명령서로 이어갈 수 있다.`;
  }
  if (locale === "ja") {
    return `${topicLabel}の前線は${methodLabel}で盤面を読み、${intensityLabel}で核心を突く。現実点検の回答を受け取れば、第2次修正作戦命令書に進める。`;
  }
  if (locale === "zh-CN") {
    return `${topicLabel}这条前线由${methodLabel}来解读局势，以${intensityLabel}的力度直击核心。收到现实检验的回答后，可以继续生成第2次修正作战命令书。`;
  }
  if (locale === "zh-TW") {
    return `${topicLabel}這條前線由${methodLabel}來解讀局勢，以${intensityLabel}的力度直擊核心。收到現實檢驗的回答後，可以繼續產生第2次修正作戰命令書。`;
  }
  return `On the ${topicLabel} front, ${methodLabel} reads the board and ${intensityLabel} drives the point home. Once you answer the reality check, this can move on to a 2nd revised operation order.`;
}

const NEO_TOPIC_LABEL_KO: Record<string, string> = {
  "연애 / 재회": "연애 / 재회",
  "직업 / 이직": "직업 / 이직",
  "돈 / 재물": "돈 / 재물",
  "인간관계": "인간관계",
  "멘탈 / 자기관리": "멘탈 / 자기관리",
  "인생 방향": "인생 방향",
  "지금 선택": "지금 선택",
  "내가 반복하는 실수": "내가 반복하는 실수",
};

const NEO_TOPIC_LABEL_EN: Record<string, string> = {
  "연애 / 재회": "Love / Reunion",
  "직업 / 이직": "Career / Job change",
  "돈 / 재물": "Money / Wealth",
  "인간관계": "Relationships",
  "멘탈 / 자기관리": "Mental health / Self-care",
  "인생 방향": "Life direction",
  "지금 선택": "The choice in front of you",
  "내가 반복하는 실수": "The mistake I keep repeating",
};

const NEO_TOPIC_LABEL_JA: Record<string, string> = {
  "연애 / 재회": "恋愛 / 復縁",
  "직업 / 이직": "仕事 / 転職",
  "돈 / 재물": "お金 / 財産",
  "인간관계": "人間関係",
  "멘탈 / 자기관리": "メンタル / 自己管理",
  "인생 방향": "人生の方向性",
  "지금 선택": "今の選択",
  "내가 반복하는 실수": "自分が繰り返す失敗",
};

const NEO_TOPIC_LABEL_ZH_CN: Record<string, string> = {
  "연애 / 재회": "恋爱 / 复合",
  "직업 / 이직": "职业 / 跳槽",
  "돈 / 재물": "金钱 / 财富",
  "인간관계": "人际关系",
  "멘탈 / 자기관리": "心理 / 自我管理",
  "인생 방향": "人生方向",
  "지금 선택": "当下的选择",
  "내가 반복하는 실수": "我反复犯的错误",
};

const NEO_TOPIC_LABEL_ZH_TW: Record<string, string> = {
  "연애 / 재회": "戀愛 / 復合",
  "직업 / 이직": "職業 / 跳槽",
  "돈 / 재물": "金錢 / 財富",
  "인간관계": "人際關係",
  "멘탈 / 자기관리": "心理 / 自我管理",
  "인생 방향": "人生方向",
  "지금 선택": "當下的選擇",
  "내가 반복하는 실수": "我反覆犯的錯誤",
};

const NEO_TOPIC_LABEL_BY_LOCALE: Partial<Record<NonKoLocale, Record<string, string>>> = {
  en: NEO_TOPIC_LABEL_EN,
  ja: NEO_TOPIC_LABEL_JA,
  "zh-CN": NEO_TOPIC_LABEL_ZH_CN,
  "zh-TW": NEO_TOPIC_LABEL_ZH_TW,
};

export function getNeoTopicLabel(topicKey: string, locale: LoadingLocale): string {
  if (locale === "ko") return NEO_TOPIC_LABEL_KO[topicKey] || topicKey;
  const table = NEO_TOPIC_LABEL_BY_LOCALE[locale as NonKoLocale] || NEO_TOPIC_LABEL_EN;
  return table[topicKey] || NEO_TOPIC_LABEL_EN[topicKey] || topicKey;
}

const NEO_TOPIC_BADGE_NAME_KO: Record<string, string> = {
  "연애 / 재회": "재회 봉인 휘장",
  "직업 / 이직": "진로 개척 휘장",
  "돈 / 재물": "재물 서광 휘장",
  "인간관계": "관계 경계 휘장",
  "멘탈 / 자기관리": "멘탈 훈장",
  "인생 방향": "왕관 서약 휘장",
  "지금 선택": "결단 나침반 휘장",
  "내가 반복하는 실수": "숙명 성좌 휘장",
};
const NEO_TOPIC_BADGE_NAME_DEFAULT_KO = "무명 휘장";

const NEO_TOPIC_BADGE_NAME_EN: Record<string, string> = {
  "연애 / 재회": "Reunion Seal",
  "직업 / 이직": "Career Pioneer Seal",
  "돈 / 재물": "Wealth Dawn Seal",
  "인간관계": "Relationship Boundary Seal",
  "멘탈 / 자기관리": "Mental Fortitude Medal",
  "인생 방향": "Crown Oath Seal",
  "지금 선택": "Decision Compass Seal",
  "내가 반복하는 실수": "Fated Constellation Seal",
};

const NEO_TOPIC_BADGE_NAME_JA: Record<string, string> = {
  "연애 / 재회": "復縁封印の紋章",
  "직업 / 이직": "進路開拓の紋章",
  "돈 / 재물": "財運瑞光の紋章",
  "인간관계": "関係境界の紋章",
  "멘탈 / 자기관리": "メンタル勲章",
  "인생 방향": "王冠誓約の紋章",
  "지금 선택": "決断羅針盤の紋章",
  "내가 반복하는 실수": "宿命星座の紋章",
};

const NEO_TOPIC_BADGE_NAME_ZH_CN: Record<string, string> = {
  "연애 / 재회": "复合封印徽章",
  "직업 / 이직": "职涯开拓徽章",
  "돈 / 재물": "财运曙光徽章",
  "인간관계": "关系边界徽章",
  "멘탈 / 자기관리": "心理勋章",
  "인생 방향": "王冠誓约徽章",
  "지금 선택": "决断罗盘徽章",
  "내가 반복하는 실수": "宿命星座徽章",
};

const NEO_TOPIC_BADGE_NAME_ZH_TW: Record<string, string> = {
  "연애 / 재회": "復合封印徽章",
  "직업 / 이직": "職涯開拓徽章",
  "돈 / 재물": "財運曙光徽章",
  "인간관계": "關係邊界徽章",
  "멘탈 / 자기관리": "心理勳章",
  "인생 방향": "王冠誓約徽章",
  "지금 선택": "決斷羅盤徽章",
  "내가 반복하는 실수": "宿命星座徽章",
};

const NEO_TOPIC_BADGE_NAME_BY_LOCALE: Partial<Record<NonKoLocale, Record<string, string>>> = {
  en: NEO_TOPIC_BADGE_NAME_EN,
  ja: NEO_TOPIC_BADGE_NAME_JA,
  "zh-CN": NEO_TOPIC_BADGE_NAME_ZH_CN,
  "zh-TW": NEO_TOPIC_BADGE_NAME_ZH_TW,
};

const NEO_TOPIC_BADGE_NAME_DEFAULT_EN = "Unnamed Seal";

export function getNeoTopicBadgeName(topicKey: string, locale: LoadingLocale): string {
  if (locale === "ko") return NEO_TOPIC_BADGE_NAME_KO[topicKey] || NEO_TOPIC_BADGE_NAME_DEFAULT_KO;
  const table = NEO_TOPIC_BADGE_NAME_BY_LOCALE[locale as NonKoLocale] || NEO_TOPIC_BADGE_NAME_EN;
  return table[topicKey] || NEO_TOPIC_BADGE_NAME_EN[topicKey] || NEO_TOPIC_BADGE_NAME_DEFAULT_EN;
}

const NEO_REALITY_CHECK_LABEL_KO: Record<string, string> = {
  "맞다. 요즘 계속 회피하고 있다.": "맞다. 요즘 계속 회피하고 있다.",
  "어느 정도 맞지만 전부는 아니다.": "어느 정도 맞지만 전부는 아니다.",
  "나는 오히려 너무 성급하게 움직이는 편이다.": "나는 오히려 너무 성급하게 움직이는 편이다.",
  "감정적으로 흔들리는 게 가장 크다.": "감정적으로 흔들리는 게 가장 크다.",
  "현실 문제보다 관계 문제가 더 크다.": "현실 문제보다 관계 문제가 더 크다.",
  "지금은 돈/직업/가족 문제가 더 중요하다.": "지금은 돈/직업/가족 문제가 더 중요하다.",
  "네오의 말에 반박하고 싶은 부분이 있다.": "네오의 말에 반박하고 싶은 부분이 있다.",
};

const NEO_REALITY_CHECK_LABEL_EN: Record<string, string> = {
  "맞다. 요즘 계속 회피하고 있다.": "True. I've been avoiding it lately.",
  "어느 정도 맞지만 전부는 아니다.": "Somewhat true, but not entirely.",
  "나는 오히려 너무 성급하게 움직이는 편이다.": "If anything, I tend to move too fast.",
  "감정적으로 흔들리는 게 가장 크다.": "Being emotionally shaken is the biggest factor.",
  "현실 문제보다 관계 문제가 더 크다.": "The relationship issue matters more than the practical one.",
  "지금은 돈/직업/가족 문제가 더 중요하다.": "Right now money/career/family matters more.",
  "네오의 말에 반박하고 싶은 부분이 있다.": "There's a part of NEO's read I want to push back on.",
};

const NEO_REALITY_CHECK_LABEL_JA: Record<string, string> = {
  "맞다. 요즘 계속 회피하고 있다.": "その通り。最近ずっと避けている。",
  "어느 정도 맞지만 전부는 아니다.": "ある程度は当たっているが、全部ではない。",
  "나는 오히려 너무 성급하게 움직이는 편이다.": "むしろ性急に動きすぎるタイプだ。",
  "감정적으로 흔들리는 게 가장 크다.": "感情的に揺れるのが一番大きい。",
  "현실 문제보다 관계 문제가 더 크다.": "現実の問題より人間関係の問題の方が大きい。",
  "지금은 돈/직업/가족 문제가 더 중요하다.": "今はお金/仕事/家族の問題の方が重要だ。",
  "네오의 말에 반박하고 싶은 부분이 있다.": "ネオの言葉に反論したい部分がある。",
};

const NEO_REALITY_CHECK_LABEL_ZH_CN: Record<string, string> = {
  "맞다. 요즘 계속 회피하고 있다.": "没错，最近一直在回避。",
  "어느 정도 맞지만 전부는 아니다.": "有一定道理，但不完全是。",
  "나는 오히려 너무 성급하게 움직이는 편이다.": "我反而属于行动太急躁的类型。",
  "감정적으로 흔들리는 게 가장 크다.": "情绪上的动摇影响最大。",
  "현실 문제보다 관계 문제가 더 크다.": "关系问题比现实问题更大。",
  "지금은 돈/직업/가족 문제가 더 중요하다.": "现在金钱/工作/家庭问题更重要。",
  "네오의 말에 반박하고 싶은 부분이 있다.": "我有想反驳尼奥的地方。",
};

const NEO_REALITY_CHECK_LABEL_ZH_TW: Record<string, string> = {
  "맞다. 요즘 계속 회피하고 있다.": "沒錯，最近一直在迴避。",
  "어느 정도 맞지만 전부는 아니다.": "有一定道理，但不完全是。",
  "나는 오히려 너무 성급하게 움직이는 편이다.": "我反而屬於行動太急躁的類型。",
  "감정적으로 흔들리는 게 가장 크다.": "情緒上的動搖影響最大。",
  "현실 문제보다 관계 문제가 더 크다.": "關係問題比現實問題更大。",
  "지금은 돈/직업/가족 문제가 더 중요하다.": "現在金錢/工作/家庭問題更重要。",
  "네오의 말에 반박하고 싶은 부분이 있다.": "我有想反駁尼歐的地方。",
};

const NEO_REALITY_CHECK_LABEL_BY_LOCALE: Partial<Record<NonKoLocale, Record<string, string>>> = {
  en: NEO_REALITY_CHECK_LABEL_EN,
  ja: NEO_REALITY_CHECK_LABEL_JA,
  "zh-CN": NEO_REALITY_CHECK_LABEL_ZH_CN,
  "zh-TW": NEO_REALITY_CHECK_LABEL_ZH_TW,
};

export function getNeoRealityCheckLabel(value: string, locale: LoadingLocale): string {
  if (locale === "ko") return NEO_REALITY_CHECK_LABEL_KO[value] || value;
  const table = NEO_REALITY_CHECK_LABEL_BY_LOCALE[locale as NonKoLocale] || NEO_REALITY_CHECK_LABEL_EN;
  return table[value] || NEO_REALITY_CHECK_LABEL_EN[value] || value;
}

export type NeoIntensityCopy = { label: string; body: string };

const NEO_INTENSITY_TEXT_KO: Record<string, NeoIntensityCopy> = {
  soft: { label: "순한맛", body: "정곡은 찌르되 숨 고를 틈은 남긴다." },
  standard: { label: "기본맛", body: "회피한 부분까지 정확히 끌어올린다." },
  roar: { label: "사자 포효맛", body: "핑계의 방패를 내려놓게 만든다." },
};

const NEO_INTENSITY_TEXT_EN: Record<string, NeoIntensityCopy> = {
  soft: { label: "Mild", body: "Hits the point, but leaves room to breathe." },
  standard: { label: "Standard", body: "Drags up even the parts you've been avoiding." },
  roar: { label: "Lion's Roar", body: "Forces you to drop the shield of excuses." },
};

const NEO_INTENSITY_TEXT_JA: Record<string, NeoIntensityCopy> = {
  soft: { label: "マイルド味", body: "急所は突くが、息をつく余裕は残す。" },
  standard: { label: "基本味", body: "避けてきた部分まで正確に引き出す。" },
  roar: { label: "獅子咆哮味", body: "言い訳の盾を下ろさせる。" },
};

const NEO_INTENSITY_TEXT_ZH_CN: Record<string, NeoIntensityCopy> = {
  soft: { label: "温和味", body: "直击要害，但留一口喘息的空间。" },
  standard: { label: "基本味", body: "连你回避的部分也精准挖出来。" },
  roar: { label: "狮吼味", body: "让你放下借口的盾牌。" },
};

const NEO_INTENSITY_TEXT_ZH_TW: Record<string, NeoIntensityCopy> = {
  soft: { label: "溫和味", body: "直擊要害，但留一口喘息的空間。" },
  standard: { label: "基本味", body: "連你迴避的部分也精準挖出來。" },
  roar: { label: "獅吼味", body: "讓你放下藉口的盾牌。" },
};

const NEO_INTENSITY_TEXT_BY_LOCALE: Partial<Record<NonKoLocale, Record<string, NeoIntensityCopy>>> = {
  en: NEO_INTENSITY_TEXT_EN,
  ja: NEO_INTENSITY_TEXT_JA,
  "zh-CN": NEO_INTENSITY_TEXT_ZH_CN,
  "zh-TW": NEO_INTENSITY_TEXT_ZH_TW,
};

export function getNeoIntensityText(id: string, locale: LoadingLocale): NeoIntensityCopy {
  if (locale === "ko") return NEO_INTENSITY_TEXT_KO[id] || { label: id, body: "" };
  const table = NEO_INTENSITY_TEXT_BY_LOCALE[locale as NonKoLocale] || NEO_INTENSITY_TEXT_EN;
  return table[id] || NEO_INTENSITY_TEXT_EN[id] || { label: id, body: "" };
}

export type NeoErrorCode =
  | "LOGIN_REQUIRED"
  | "PAYMENT_REQUIRED"
  | "PAYMENT_VERIFY_FAILED"
  | "PAYMENT_CANCELLED"
  | "INVALID_INPUT"
  | "CALCULATION_ERROR"
  | "LLM_ERROR"
  | "GENERATION_PENDING"
  | "TEMPORARY_UNAVAILABLE"
  | "SERVER_ERROR";

const NEO_ERROR_COPY_KO: Record<NeoErrorCode, string> = {
  LOGIN_REQUIRED: "작전을 시작하려면 로그인이 필요하다. 로그인하고 다시 앉아라.",
  PAYMENT_REQUIRED: "작전 브리핑 이용권이 필요하다. 결제창을 먼저 통과해라.",
  PAYMENT_VERIFY_FAILED: "결제나 이용권 확인이 끝나지 않았다. 권한을 확인한 뒤 다시 시도해라.",
  PAYMENT_CANCELLED: "결제가 취소됐다. 필요할 때 다시 작전을 시작해라.",
  INVALID_INPUT: "작전 정보가 부족하다. 입력값을 다시 확인해라.",
  CALCULATION_ERROR: "운명의 계산 지도를 펼치는 중 문제가 생겼다. 출생정보를 다시 확인해라.",
  LLM_ERROR: "작전 브리핑 작성에 실패했다. 이용권이나 결제 권한은 보존되니 다시 시도해라.",
  GENERATION_PENDING: "작전 브리핑을 아직 작성 중이다. 이용권은 그대로 유지되니, 잠시 후 결과 화면에서 확인해라.",
  TEMPORARY_UNAVAILABLE: "지금 접속이 잠시 불안정하다. 이용권은 그대로 보존되니, 잠시 후 다시 시도해라.",
  SERVER_ERROR: "작전실 연결에 문제가 생겼다. 잠시 후 다시 시도해라.",
};

const NEO_ERROR_COPY_EN: Record<NeoErrorCode, string> = {
  LOGIN_REQUIRED: "You need to log in to start the operation. Log in and take your seat again.",
  PAYMENT_REQUIRED: "You need a pass for the operation briefing. Go through the payment screen first.",
  PAYMENT_VERIFY_FAILED: "Payment or pass verification isn't finished. Check your access and try again.",
  PAYMENT_CANCELLED: "Payment was cancelled. Start the operation again whenever you're ready.",
  INVALID_INPUT: "Your operation info is incomplete. Double-check your input.",
  CALCULATION_ERROR: "Something went wrong while unrolling the calculation map of your fate. Check your birth info again.",
  LLM_ERROR: "Writing the operation briefing failed. Your pass or payment access is preserved — try again.",
  GENERATION_PENDING: "The operation briefing is still being written. Your pass stays intact — check the result screen shortly.",
  TEMPORARY_UNAVAILABLE: "The connection is briefly unstable right now. Your pass is preserved — try again shortly.",
  SERVER_ERROR: "Something went wrong connecting to the war room. Try again shortly.",
};

const NEO_ERROR_COPY_JA: Record<NeoErrorCode, string> = {
  LOGIN_REQUIRED: "作戦を始めるにはログインが必要だ。ログインしてもう一度座れ。",
  PAYMENT_REQUIRED: "作戦ブリーフィングの利用券が必要だ。先に決済画面を通過しろ。",
  PAYMENT_VERIFY_FAILED: "決済または利用券の確認が終わっていない。権限を確認してからもう一度試せ。",
  PAYMENT_CANCELLED: "決済がキャンセルされた。必要なときにまた作戦を始めろ。",
  INVALID_INPUT: "作戦情報が足りない。入力内容をもう一度確認しろ。",
  CALCULATION_ERROR: "運命の計算地図を広げる途中で問題が発生した。出生情報をもう一度確認しろ。",
  LLM_ERROR: "作戦ブリーフィングの作成に失敗した。利用券や決済権限は保持されているので、もう一度試せ。",
  GENERATION_PENDING: "作戦ブリーフィングはまだ作成中だ。利用券はそのまま維持されるので、しばらくして結果画面で確認しろ。",
  TEMPORARY_UNAVAILABLE: "今、接続が一時的に不安定だ。利用券はそのまま保持されるので、しばらくしてから再試行しろ。",
  SERVER_ERROR: "作戦室との接続に問題が発生した。しばらくしてから再試行しろ。",
};

const NEO_ERROR_COPY_ZH_CN: Record<NeoErrorCode, string> = {
  LOGIN_REQUIRED: "开始作战需要登录。请登录后重新入座。",
  PAYMENT_REQUIRED: "作战简报需要通行券。请先完成付款界面。",
  PAYMENT_VERIFY_FAILED: "付款或通行券确认尚未完成。请确认权限后重试。",
  PAYMENT_CANCELLED: "付款已取消。需要时可以重新开始作战。",
  INVALID_INPUT: "作战信息不完整。请重新确认输入内容。",
  CALCULATION_ERROR: "展开命运计算地图时出现问题。请重新确认出生信息。",
  LLM_ERROR: "作战简报撰写失败。通行券或付款权限仍会保留，请重试。",
  GENERATION_PENDING: "作战简报仍在撰写中。通行券会照常保留，请稍后在结果页查看。",
  TEMPORARY_UNAVAILABLE: "目前连接暂时不稳定。通行券会照常保留，请稍后重试。",
  SERVER_ERROR: "连接作战室时出现问题。请稍后重试。",
};

const NEO_ERROR_COPY_ZH_TW: Record<NeoErrorCode, string> = {
  LOGIN_REQUIRED: "開始作戰需要登入。請登入後重新入座。",
  PAYMENT_REQUIRED: "作戰簡報需要通行券。請先完成付款畫面。",
  PAYMENT_VERIFY_FAILED: "付款或通行券確認尚未完成。請確認權限後重試。",
  PAYMENT_CANCELLED: "付款已取消。需要時可以重新開始作戰。",
  INVALID_INPUT: "作戰資訊不完整。請重新確認輸入內容。",
  CALCULATION_ERROR: "展開命運計算地圖時出現問題。請重新確認出生資訊。",
  LLM_ERROR: "作戰簡報撰寫失敗。通行券或付款權限仍會保留，請重試。",
  GENERATION_PENDING: "作戰簡報仍在撰寫中。通行券會照常保留，請稍後在結果頁查看。",
  TEMPORARY_UNAVAILABLE: "目前連線暫時不穩定。通行券會照常保留，請稍後重試。",
  SERVER_ERROR: "連線作戰室時出現問題。請稍後重試。",
};

const NEO_ERROR_COPY_BY_LOCALE: Partial<Record<NonKoLocale, Record<NeoErrorCode, string>>> = {
  en: NEO_ERROR_COPY_EN,
  ja: NEO_ERROR_COPY_JA,
  "zh-CN": NEO_ERROR_COPY_ZH_CN,
  "zh-TW": NEO_ERROR_COPY_ZH_TW,
};

export function getNeoErrorCopy(code: string, locale: LoadingLocale): string {
  const key = code as NeoErrorCode;
  if (locale === "ko") return NEO_ERROR_COPY_KO[key] || "";
  const table = NEO_ERROR_COPY_BY_LOCALE[locale as NonKoLocale] || NEO_ERROR_COPY_EN;
  return table[key] || NEO_ERROR_COPY_EN[key] || "";
}

const NEO_FEATURE_TITLE_KO = "네오의 팩폭 작전실";
const NEO_FEATURE_TITLE_BY_LOCALE: Partial<Record<NonKoLocale, string>> = {
  en: "NEO's Fact-Punch War Room",
  ja: "ネオのファクトパンチ作戦室",
  "zh-CN": "尼奥的犀利真言作战室",
  "zh-TW": "尼歐的犀利真言作戰室",
};

export function getNeoFeatureTitle(locale: LoadingLocale): string {
  if (locale === "ko") return NEO_FEATURE_TITLE_KO;
  return NEO_FEATURE_TITLE_BY_LOCALE[locale as NonKoLocale] || NEO_FEATURE_TITLE_BY_LOCALE.en!;
}

export type NeoPaidGateCopy = {
  checkingTitle: string;
  completeTitle: string;
  completeMessage: string;
  checkingAccessMessage: string;
  retryAfterUnstableMessage: string;
  confirmingPassMessage: string;
  refiningMessage: string;
  refinedArrivedMessage: string;
  briefingArrivedMessage: string;
  sealingBriefingMessage: string;
  startingMapMessage: string;
  alreadyGeneratingMessage: string;
  refineMissingBriefingError: string;
  refineMissingAnswerError: string;
  refineGenericError: string;
  failTitleGeneration: string;
  failTitleTransient: string;
  failTitlePaymentVerify: string;
  failTitleEntitlement: string;
};

const NEO_PAID_GATE_COPY_KO: NeoPaidGateCopy = {
  checkingTitle: "이용권 확인",
  completeTitle: "이용권 확인 완료",
  completeMessage: "이용권 확인이 끝났다. 작전 지도를 펼치는 중이다.",
  checkingAccessMessage: "권한과 이용권을 확인하는 중이다.",
  retryAfterUnstableMessage: "연결이 잠시 불안정하다. 이용권을 다시 확인하는 중이다.",
  confirmingPassMessage: "작전실 이용권을 확인하는 중이다.",
  refiningMessage: "현실 점검 답변을 반영해 수정 작전 명령서를 작성하는 중이다.",
  refinedArrivedMessage: "수정 작전 명령서가 도착했다.",
  briefingArrivedMessage: "1차 작전 브리핑이 도착했다. 이제 현실 점검으로 넘어갈 수 있다.",
  sealingBriefingMessage: "작전 브리핑에 사자 도장을 찍는 중이다.",
  startingMapMessage: "운명의 작전 지도를 펼치는 중이다.",
  alreadyGeneratingMessage: "작전 지도가 이미 펼쳐지고 있다. 완성되는 대로 브리핑을 가져온다.",
  refineMissingBriefingError: "먼저 1차 작전 브리핑을 받아라.",
  refineMissingAnswerError: "체크 답변을 고르거나, 네오에게 현재 상황을 조금 더 적어라.",
  refineGenericError: "수정 작전 명령서 작성에 실패했다. 답변은 남아 있으니 다시 시도해라.",
  failTitleGeneration: "작전 브리핑 생성 실패",
  failTitleTransient: "잠시 후 다시 시도",
  failTitlePaymentVerify: "결제 확인 실패",
  failTitleEntitlement: "이용권 확인 실패",
};

const NEO_PAID_GATE_COPY_EN: NeoPaidGateCopy = {
  checkingTitle: "Checking your pass",
  completeTitle: "Pass check complete",
  completeMessage: "Your pass has been confirmed. Unrolling the operation map now.",
  checkingAccessMessage: "Checking your access and pass.",
  retryAfterUnstableMessage: "Connection is briefly unstable — checking your pass again.",
  confirmingPassMessage: "Checking your war room pass.",
  refiningMessage: "Writing the revised operation order using your reality check answers.",
  refinedArrivedMessage: "The revised operation order has arrived.",
  briefingArrivedMessage: "The 1st operation briefing has arrived. You can move on to the reality check now.",
  sealingBriefingMessage: "Sealing the operation briefing with the Lion Seal.",
  startingMapMessage: "Unrolling the operation map of your fate.",
  alreadyGeneratingMessage: "The operation map is already unrolling. The briefing will be fetched once it's ready.",
  refineMissingBriefingError: "Get the 1st operation briefing first.",
  refineMissingAnswerError: "Pick a reality check answer, or tell NEO a bit more about your situation.",
  refineGenericError: "Writing the revised operation order failed. Your answers are saved — try again.",
  failTitleGeneration: "Briefing generation failed",
  failTitleTransient: "Try again shortly",
  failTitlePaymentVerify: "Payment check failed",
  failTitleEntitlement: "Pass check failed",
};

const NEO_PAID_GATE_COPY_JA: NeoPaidGateCopy = {
  checkingTitle: "利用券確認中",
  completeTitle: "利用券確認完了",
  completeMessage: "利用券の確認が終わった。作戦地図を広げている最中だ。",
  checkingAccessMessage: "権限と利用券を確認している最中だ。",
  retryAfterUnstableMessage: "接続が一時的に不安定だ。利用券を再確認している。",
  confirmingPassMessage: "作戦室の利用券を確認している最中だ。",
  refiningMessage: "現実点検の回答を反映し、修正作戦命令書を作成している最中だ。",
  refinedArrivedMessage: "修正作戦命令書が届いた。",
  briefingArrivedMessage: "第1次作戦ブリーフィングが到着した。これで現実点検に進める。",
  sealingBriefingMessage: "作戦ブリーフィングに獅子の印を押している最中だ。",
  startingMapMessage: "運命の作戦地図を広げている最中だ。",
  alreadyGeneratingMessage: "作戦地図はすでに広げられている最中だ。完成次第ブリーフィングを取得する。",
  refineMissingBriefingError: "先に第1次作戦ブリーフィングを受け取れ。",
  refineMissingAnswerError: "チェック回答を選ぶか、ネオに今の状況をもう少し書け。",
  refineGenericError: "修正作戦命令書の作成に失敗した。回答は残っているのでもう一度試せ。",
  failTitleGeneration: "作戦ブリーフィング生成失敗",
  failTitleTransient: "しばらくして再試行",
  failTitlePaymentVerify: "決済確認失敗",
  failTitleEntitlement: "利用券確認失敗",
};

const NEO_PAID_GATE_COPY_ZH_CN: NeoPaidGateCopy = {
  checkingTitle: "确认通行券中",
  completeTitle: "通行券确认完成",
  completeMessage: "通行券确认已完成，正在展开作战地图。",
  checkingAccessMessage: "正在确认权限与通行券。",
  retryAfterUnstableMessage: "连接暂时不稳定，正在重新确认通行券。",
  confirmingPassMessage: "正在确认作战室通行券。",
  refiningMessage: "正在根据现实检验的回答撰写修正作战命令书。",
  refinedArrivedMessage: "修正作战命令书已送达。",
  briefingArrivedMessage: "第1次作战简报已送达，现在可以进入现实检验了。",
  sealingBriefingMessage: "正在为作战简报盖上狮徽印章。",
  startingMapMessage: "正在展开命运作战地图。",
  alreadyGeneratingMessage: "作战地图已在展开中，完成后会自动取得简报。",
  refineMissingBriefingError: "请先领取第1次作战简报。",
  refineMissingAnswerError: "请选择检验答案，或再向尼奥说明一下现在的情况。",
  refineGenericError: "修正作战命令书撰写失败。你的回答仍会保留，请重试。",
  failTitleGeneration: "作战简报生成失败",
  failTitleTransient: "请稍后重试",
  failTitlePaymentVerify: "付款确认失败",
  failTitleEntitlement: "通行券确认失败",
};

const NEO_PAID_GATE_COPY_ZH_TW: NeoPaidGateCopy = {
  checkingTitle: "確認通行券中",
  completeTitle: "通行券確認完成",
  completeMessage: "通行券確認已完成，正在展開作戰地圖。",
  checkingAccessMessage: "正在確認權限與通行券。",
  retryAfterUnstableMessage: "連線暫時不穩定，正在重新確認通行券。",
  confirmingPassMessage: "正在確認作戰室通行券。",
  refiningMessage: "正在根據現實檢驗的回答撰寫修正作戰命令書。",
  refinedArrivedMessage: "修正作戰命令書已送達。",
  briefingArrivedMessage: "第1次作戰簡報已送達，現在可以進入現實檢驗了。",
  sealingBriefingMessage: "正在為作戰簡報蓋上獅徽印章。",
  startingMapMessage: "正在展開命運作戰地圖。",
  alreadyGeneratingMessage: "作戰地圖已在展開中，完成後會自動取得簡報。",
  refineMissingBriefingError: "請先領取第1次作戰簡報。",
  refineMissingAnswerError: "請選擇檢驗答案，或再向尼歐說明一下現在的狀況。",
  refineGenericError: "修正作戰命令書撰寫失敗。你的回答仍會保留，請重試。",
  failTitleGeneration: "作戰簡報產生失敗",
  failTitleTransient: "請稍後重試",
  failTitlePaymentVerify: "付款確認失敗",
  failTitleEntitlement: "通行券確認失敗",
};

const NEO_PAID_GATE_COPY_BY_LOCALE: Partial<Record<NonKoLocale, NeoPaidGateCopy>> = {
  en: NEO_PAID_GATE_COPY_EN,
  ja: NEO_PAID_GATE_COPY_JA,
  "zh-CN": NEO_PAID_GATE_COPY_ZH_CN,
  "zh-TW": NEO_PAID_GATE_COPY_ZH_TW,
};

export function getNeoPaidGateCopy(locale: LoadingLocale): NeoPaidGateCopy {
  if (locale === "ko") return NEO_PAID_GATE_COPY_KO;
  return NEO_PAID_GATE_COPY_BY_LOCALE[locale as NonKoLocale] || NEO_PAID_GATE_COPY_EN;
}
