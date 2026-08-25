import type { LoadingLocale } from "@/constants/loadingMessages";

type NonKoLocale = Exclude<LoadingLocale, "ko">;

export type NeoResultCopyKey =
  | "heroTitle"
  | "heroSubtitleGenerating"
  | "heroSubtitleReady"
  | "missingAttemptIdError"
  | "loginRequiredError"
  | "notFoundError"
  | "pollTimeoutError"
  | "refineMissingAnswerError"
  | "refineGenericError"
  | "refinePendingError"
  | "refineGenericErrorRetry"
  | "previewUnlockNotice"
  | "missingSessionKeyError"
  | "unlockGenericHint"
  | "unlockErrorGeneric"
  | "pdfLockedHint"
  | "pdfSaveError"
  | "selectedMethodFallback"
  | "generatingTitle"
  | "generatingBodyDefault"
  | "failedTitle"
  | "failedDefaultMessage"
  | "retryLink"
  | "methodCoverAltSuffix"
  | "topicFallback"
  | "summaryMethodLabel"
  | "summaryTopicLabel"
  | "summaryTopicFallback"
  | "summaryIssuedLabel"
  | "summaryRefinedNote"
  | "summaryInitialNote"
  | "actionBarAria"
  | "actionBarRefinedDone"
  | "actionBarInitialDone"
  | "benefitBusy"
  | "benefitDone"
  | "benefitCta"
  | "pdfBusy"
  | "pdfReady"
  | "pdfLocked"
  | "letterSpan"
  | "letterUnlockedTitle"
  | "letterLockedTitle"
  | "letterUnlockDone"
  | "letterOpenedTitle"
  | "bluntCalloutAlt"
  | "badgeVaultAwarded"
  | "badgeVaultTitle"
  | "badgeVaultCountSuffix"
  | "badgeVaultUnlockedMsg"
  | "badgeVaultReadyMsg"
  | "realityFormTitle"
  | "tabFrontline"
  | "tabUrgentOrders"
  | "tabJudgement"
  | "tabInnate"
  | "tabTopic"
  | "tabTiming"
  | "tabEvidence"
  | "tabMission"
  | "tabCompatScores"
  | "tabCompatMutual"
  | "tabCompatPalace"
  | "tabCompatConflict"
  | "tabCompatStrategy"
  | "tabBadge"
  | "firstJudgementTitle"
  | "answerThenRefineCta"
  | "docBriefingTocAria"
  | "tabReview"
  | "tabVerdict"
  | "verdictBasisTitle"
  | "tabAdjust"
  | "tabClosing"
  | "docRefinedTocAria"
  | "ctaDeckAria"
  | "ctaOtherMethod"
  | "ctaTeaHouse"
  | "ctaReopen"
  | "neoVerdictLabel"
  | "defaultOperationTitle"
  | "defaultOpening"
  | "unnamedBadgeFallback";

type NeoResultCopyTable = Record<NeoResultCopyKey, string>;

const NEO_RESULT_COPY_KO: NeoResultCopyTable = {
  heroTitle: "네오의 작전 명령서",
  heroSubtitleGenerating: "운명의 작전 지도가 아직 움직이고 있다.",
  heroSubtitleReady: "1차 브리핑과 2차 수정 명령서를 분리해서 보관한다.",
  missingAttemptIdError: "작전 명령서 식별값이 없다.",
  loginRequiredError: "로그인이 필요하다.",
  notFoundError: "작전 명령서를 찾지 못했다.",
  pollTimeoutError: "작전 브리핑 생성이 평소보다 오래 걸리고 있다. 이용권은 그대로 유지되니, 잠시 후 새로고침해라.",
  refineMissingAnswerError: "체크 답변을 고르거나 현재 상황을 조금 더 적어라.",
  refineGenericError: "수정 작전 명령서 작성에 실패했다.",
  refinePendingError: "수정 작전 명령서를 아직 작성 중이다. 잠시 후 새로고침해라.",
  refineGenericErrorRetry: "수정 작전 명령서 작성에 실패했다. 답변은 남아 있으니 다시 시도해라.",
  previewUnlockNotice: "미리보기에서는 사자 휘장이 실제로 움직이지 않는다.",
  missingSessionKeyError: "이 작전 명령서를 다시 확인한 뒤 휘장을 사용해라.",
  unlockGenericHint: "사자 휘장 5개가 모이면 PDF와 네오의 편지가 열린다.",
  unlockErrorGeneric: "휘장을 사용하는 중 문제가 생겼다. 잠시 후 다시 시도해라.",
  pdfLockedHint: "사자 휘장 5개를 사용하면 PDF 저장이 열린다.",
  pdfSaveError: "PDF로 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  selectedMethodFallback: "선택한 술수",
  generatingTitle: "작전 브리핑 생성 중",
  generatingBodyDefault: "계산과 LLM 작성이 끝나면 이 명령서에 결과가 찍힌다.",
  failedTitle: "작전 명령서 열람 실패",
  failedDefaultMessage: "생성에 실패했다. 입력과 권한을 확인한 뒤 다시 시도해라.",
  retryLink: "작전 다시 짜기",
  methodCoverAltSuffix: "표지",
  topicFallback: "작전 주제 미기록",
  summaryMethodLabel: "술수",
  summaryTopicLabel: "작전 주제",
  summaryTopicFallback: "미기록",
  summaryIssuedLabel: "발급일",
  summaryRefinedNote: "현실 점검까지 반영한 최종 작전이다.",
  summaryInitialNote: "1차 브리핑 기준으로 저장된 작전이다.",
  actionBarAria: "작전 명령서 보관과 특전",
  actionBarRefinedDone: "2차 수정 명령서까지 정리 완료",
  actionBarInitialDone: "1차 작전 브리핑 정리 완료",
  benefitBusy: "휘장 사용 중",
  benefitDone: "특전 해금 완료",
  benefitCta: "사자 휘장 5개 사용",
  pdfBusy: "PDF 저장 중",
  pdfReady: "PDF 저장",
  pdfLocked: "PDF 잠금",
  letterSpan: "네오가 남긴 편지",
  letterUnlockedTitle: "네오의 편지가 열렸다",
  letterLockedTitle: "사자 휘장 다섯 개가 문을 연다",
  letterUnlockDone: "편지 해금 완료",
  letterOpenedTitle: "사자 휘장 다섯 개로 열린 진심",
  bluntCalloutAlt: "팩폭 한마디를 건네는 네오",
  badgeVaultAwarded: "새 휘장 수여",
  badgeVaultTitle: "사자 휘장 보관함",
  badgeVaultCountSuffix: "개 보유",
  badgeVaultUnlockedMsg: "PDF와 네오의 편지가 열린 작전이다.",
  badgeVaultReadyMsg: "휘장 다섯 개가 모였다. 이제 특전을 열 수 있다.",
  realityFormTitle: "네오에게 다시 반박하기",
  tabFrontline: "전선 진단",
  tabUrgentOrders: "긴급 작전",
  tabJudgement: "네오의 판단",
  tabInnate: "타고난 성향",
  tabTopic: "주제 분석",
  tabTiming: "시기와 전략",
  tabEvidence: "어긋난 자리와 근거",
  tabMission: "금지와 7일 작전",
  tabCompatScores: "궁합 계기판",
  tabCompatMutual: "서로를 보는 눈",
  tabCompatPalace: "궁 교차 판독",
  tabCompatConflict: "갈등 패턴",
  tabCompatStrategy: "관계 작전",
  tabBadge: "사자 휘장",
  firstJudgementTitle: "네오의 첫 판단",
  answerThenRefineCta: "답하고 수정 작전 명령서 받기",
  docBriefingTocAria: "1차 작전 브리핑 목차",
  tabReview: "전황 재판단",
  tabVerdict: "판정",
  verdictBasisTitle: "판정 근거",
  tabAdjust: "전선 조정",
  tabClosing: "금지와 휘장",
  docRefinedTocAria: "2차 수정 작전 명령서 목차",
  ctaDeckAria: "작전 명령서 다음 행동",
  ctaOtherMethod: "다른 술수로 다시 분석하기",
  ctaTeaHouse: "연이의 운명 찻집으로 가기",
  ctaReopen: "작전 명령서 다시 열기",
  neoVerdictLabel: "네오의 판정",
  defaultOperationTitle: "이번 작전",
  defaultOpening: "오늘 네가 들고 온 질문은 가볍지 않았다.",
  unnamedBadgeFallback: "무명 휘장",
};

const NEO_RESULT_COPY_EN: NeoResultCopyTable = {
  heroTitle: "NEO's Operation Order",
  heroSubtitleGenerating: "The operation map of your fate is still moving.",
  heroSubtitleReady: "The 1st briefing and 2nd revised order are kept separately.",
  missingAttemptIdError: "There's no operation order identifier.",
  loginRequiredError: "You need to log in.",
  notFoundError: "Couldn't find the operation order.",
  pollTimeoutError: "The operation briefing is taking longer than usual to generate. Your pass stays intact — refresh shortly.",
  refineMissingAnswerError: "Pick a reality-check answer, or write a bit more about your situation.",
  refineGenericError: "Writing the revised operation order failed.",
  refinePendingError: "The revised operation order is still being written. Refresh shortly.",
  refineGenericErrorRetry: "Writing the revised operation order failed. Your answers are saved — try again.",
  previewUnlockNotice: "In preview mode, the Lion Seal doesn't actually move.",
  missingSessionKeyError: "Check this operation order again before using a seal.",
  unlockGenericHint: "Collect 5 Lion Seals to unlock the PDF and NEO's letter.",
  unlockErrorGeneric: "Something went wrong using the seal. Try again shortly.",
  pdfLockedHint: "Use 5 Lion Seals to unlock PDF saving.",
  pdfSaveError: "Couldn't save the PDF. Please try again shortly.",
  selectedMethodFallback: "Selected method",
  generatingTitle: "Generating operation briefing",
  generatingBodyDefault: "Once the calculation and LLM writing finish, the result appears in this order.",
  failedTitle: "Couldn't open the operation order",
  failedDefaultMessage: "Generation failed. Check your input and access, then try again.",
  retryLink: "Set up a new operation",
  methodCoverAltSuffix: "cover",
  topicFallback: "No operation topic recorded",
  summaryMethodLabel: "Method",
  summaryTopicLabel: "Operation topic",
  summaryTopicFallback: "Not recorded",
  summaryIssuedLabel: "Issued on",
  summaryRefinedNote: "This is the final operation, reflecting your reality check.",
  summaryInitialNote: "This is saved based on the 1st briefing.",
  actionBarAria: "Operation order saving and rewards",
  actionBarRefinedDone: "2nd revised order finalized",
  actionBarInitialDone: "1st operation briefing finalized",
  benefitBusy: "Using seals",
  benefitDone: "Reward unlocked",
  benefitCta: "Use 5 Lion Seals",
  pdfBusy: "Saving PDF",
  pdfReady: "Save PDF",
  pdfLocked: "PDF locked",
  letterSpan: "A letter from NEO",
  letterUnlockedTitle: "NEO's letter has opened",
  letterLockedTitle: "5 Lion Seals open the door",
  letterUnlockDone: "Letter unlocked",
  letterOpenedTitle: "Sincerity unlocked with 5 Lion Seals",
  bluntCalloutAlt: "NEO delivering a blunt fact-punch",
  badgeVaultAwarded: "New Lion Seal awarded",
  badgeVaultTitle: "Lion Seal Vault",
  badgeVaultCountSuffix: " held",
  badgeVaultUnlockedMsg: "This operation has the PDF and NEO's letter unlocked.",
  badgeVaultReadyMsg: "Five seals are collected. You can unlock the reward now.",
  realityFormTitle: "Push back on NEO again",
  tabFrontline: "Frontline diagnosis",
  tabUrgentOrders: "Urgent orders",
  tabJudgement: "NEO's judgement",
  tabInnate: "Innate nature",
  tabTopic: "Topic analysis",
  tabTiming: "Timing and strategy",
  tabEvidence: "Where it's off and the evidence",
  tabMission: "Forbidden actions and 7-day mission",
  tabCompatScores: "Compatibility gauges",
  tabCompatMutual: "How you read each other",
  tabCompatPalace: "Palace cross-reading",
  tabCompatConflict: "Conflict pattern",
  tabCompatStrategy: "Relationship strategy",
  tabBadge: "Lion Seal",
  firstJudgementTitle: "NEO's first judgement",
  answerThenRefineCta: "Answer and get the revised operation order",
  docBriefingTocAria: "1st operation briefing table of contents",
  tabReview: "Re-judging the situation",
  tabVerdict: "Verdict",
  verdictBasisTitle: "Basis for the verdict",
  tabAdjust: "Front line adjustment",
  tabClosing: "Forbidden actions and seal",
  docRefinedTocAria: "2nd revised operation order table of contents",
  ctaDeckAria: "Next steps for the operation order",
  ctaOtherMethod: "Analyze again with a different method",
  ctaTeaHouse: "Go to Yeon-i's Destiny Tea House",
  ctaReopen: "Reopen the operation order",
  neoVerdictLabel: "NEO's verdict",
  defaultOperationTitle: "this operation",
  defaultOpening: "The question you brought today wasn't a light one.",
  unnamedBadgeFallback: "Unnamed Seal",
};

const NEO_RESULT_COPY_JA: NeoResultCopyTable = {
  heroTitle: "ネオの作戦命令書",
  heroSubtitleGenerating: "運命の作戦地図はまだ動いている。",
  heroSubtitleReady: "第1次ブリーフィングと第2次修正命令書を分けて保管する。",
  missingAttemptIdError: "作戦命令書の識別値がない。",
  loginRequiredError: "ログインが必要だ。",
  notFoundError: "作戦命令書が見つからなかった。",
  pollTimeoutError: "作戦ブリーフィングの生成にいつもより時間がかかっている。利用券はそのまま維持されるので、しばらくして更新しろ。",
  refineMissingAnswerError: "チェック回答を選ぶか、今の状況をもう少し書け。",
  refineGenericError: "修正作戦命令書の作成に失敗した。",
  refinePendingError: "修正作戦命令書はまだ作成中だ。しばらくして更新しろ。",
  refineGenericErrorRetry: "修正作戦命令書の作成に失敗した。回答は残っているのでもう一度試せ。",
  previewUnlockNotice: "プレビューでは獅子紋章は実際には動かない。",
  missingSessionKeyError: "この作戦命令書をもう一度確認してから紋章を使え。",
  unlockGenericHint: "獅子紋章5個が集まるとPDFとネオの手紙が開く。",
  unlockErrorGeneric: "紋章を使う途中で問題が発生した。しばらくしてから再試行しろ。",
  pdfLockedHint: "獅子紋章5個を使うとPDF保存が開く。",
  pdfSaveError: "PDFとして保存できなかった。しばらくしてからもう一度お試しください。",
  selectedMethodFallback: "選択した術数",
  generatingTitle: "作戦ブリーフィング生成中",
  generatingBodyDefault: "計算とLLM作成が終わると、この命令書に結果が刻まれる。",
  failedTitle: "作戦命令書の閲覧に失敗した",
  failedDefaultMessage: "生成に失敗した。入力と権限を確認してからもう一度試せ。",
  retryLink: "作戦を立て直す",
  methodCoverAltSuffix: "表紙",
  topicFallback: "作戦テーマ未記録",
  summaryMethodLabel: "術数",
  summaryTopicLabel: "作戦テーマ",
  summaryTopicFallback: "未記録",
  summaryIssuedLabel: "発行日",
  summaryRefinedNote: "現実点検まで反映した最終作戦だ。",
  summaryInitialNote: "第1次ブリーフィング基準で保存された作戦だ。",
  actionBarAria: "作戦命令書の保管と特典",
  actionBarRefinedDone: "第2次修正命令書まで整理完了",
  actionBarInitialDone: "第1次作戦ブリーフィング整理完了",
  benefitBusy: "紋章使用中",
  benefitDone: "特典解禁完了",
  benefitCta: "獅子紋章5個を使用",
  pdfBusy: "PDF保存中",
  pdfReady: "PDF保存",
  pdfLocked: "PDFロック",
  letterSpan: "ネオが残した手紙",
  letterUnlockedTitle: "ネオの手紙が開いた",
  letterLockedTitle: "獅子紋章5個が扉を開く",
  letterUnlockDone: "手紙解禁完了",
  letterOpenedTitle: "獅子紋章5個で開いた本音",
  bluntCalloutAlt: "ファクトパンチの一言を告げるネオ",
  badgeVaultAwarded: "新しい紋章授与",
  badgeVaultTitle: "獅子紋章保管庫",
  badgeVaultCountSuffix: "個保有",
  badgeVaultUnlockedMsg: "PDFとネオの手紙が開いた作戦だ。",
  badgeVaultReadyMsg: "紋章5個が集まった。これで特典を開ける。",
  realityFormTitle: "ネオにもう一度反論する",
  tabFrontline: "前線診断",
  tabUrgentOrders: "緊急作戦",
  tabJudgement: "ネオの判断",
  tabInnate: "生まれ持った性向",
  tabTopic: "テーマ分析",
  tabTiming: "時期と戦略",
  tabEvidence: "ずれている場所と根拠",
  tabMission: "禁止事項と7日間作戦",
  tabCompatScores: "相性の計器盤",
  tabCompatMutual: "お互いをどう見ているか",
  tabCompatPalace: "宮の交差判読",
  tabCompatConflict: "衝突パターン",
  tabCompatStrategy: "関係の作戦",
  tabBadge: "獅子紋章",
  firstJudgementTitle: "ネオの第一判断",
  answerThenRefineCta: "回答して修正作戦命令書を受け取る",
  docBriefingTocAria: "第1次作戦ブリーフィング目次",
  tabReview: "戦況再判断",
  tabVerdict: "判定",
  verdictBasisTitle: "判定根拠",
  tabAdjust: "前線調整",
  tabClosing: "禁止事項と紋章",
  docRefinedTocAria: "第2次修正作戦命令書目次",
  ctaDeckAria: "作戦命令書の次の行動",
  ctaOtherMethod: "別の術数でもう一度分析する",
  ctaTeaHouse: "ヨニの運命ティーハウスへ行く",
  ctaReopen: "作戦命令書をもう一度開く",
  neoVerdictLabel: "ネオの判定",
  defaultOperationTitle: "今回の作戦",
  defaultOpening: "今日お前が持ってきた質問は軽くなかった。",
  unnamedBadgeFallback: "無名紋章",
};

const NEO_RESULT_COPY_ZH_CN: NeoResultCopyTable = {
  heroTitle: "尼奥的作战命令书",
  heroSubtitleGenerating: "命运作战地图仍在展开中。",
  heroSubtitleReady: "第1次简报和第2次修正命令书分开保管。",
  missingAttemptIdError: "缺少作战命令书识别值。",
  loginRequiredError: "需要登录。",
  notFoundError: "未能找到作战命令书。",
  pollTimeoutError: "作战简报生成耗时比平时更长。通行券会照常保留，请稍后刷新。",
  refineMissingAnswerError: "请选择检验答案，或再写一些现在的情况。",
  refineGenericError: "修正作战命令书撰写失败。",
  refinePendingError: "修正作战命令书仍在撰写中，请稍后刷新。",
  refineGenericErrorRetry: "修正作战命令书撰写失败。你的回答仍会保留，请重试。",
  previewUnlockNotice: "预览模式下狮徽不会真的变动。",
  missingSessionKeyError: "请重新确认这份作战命令书后再使用徽章。",
  unlockGenericHint: "集齐5枚狮徽即可解锁PDF与尼奥的信。",
  unlockErrorGeneric: "使用徽章时出现问题，请稍后重试。",
  pdfLockedHint: "使用5枚狮徽即可解锁PDF保存。",
  pdfSaveError: "未能保存为PDF，请稍后重试。",
  selectedMethodFallback: "已选术数",
  generatingTitle: "作战简报生成中",
  generatingBodyDefault: "计算与LLM撰写完成后，结果就会显示在这份命令书中。",
  failedTitle: "作战命令书查看失败",
  failedDefaultMessage: "生成失败，请确认输入与权限后重试。",
  retryLink: "重新制定作战",
  methodCoverAltSuffix: "封面",
  topicFallback: "未记录作战主题",
  summaryMethodLabel: "术数",
  summaryTopicLabel: "作战主题",
  summaryTopicFallback: "未记录",
  summaryIssuedLabel: "签发日",
  summaryRefinedNote: "这是反映现实检验后的最终作战。",
  summaryInitialNote: "这是以第1次简报为基准保存的作战。",
  actionBarAria: "作战命令书保存与特典",
  actionBarRefinedDone: "已整理至第2次修正命令书",
  actionBarInitialDone: "第1次作战简报整理完成",
  benefitBusy: "徽章使用中",
  benefitDone: "特典解锁完成",
  benefitCta: "使用5枚狮徽",
  pdfBusy: "PDF保存中",
  pdfReady: "保存PDF",
  pdfLocked: "PDF已锁定",
  letterSpan: "尼奥留下的信",
  letterUnlockedTitle: "尼奥的信已开启",
  letterLockedTitle: "5枚狮徽开启这扇门",
  letterUnlockDone: "信件解锁完成",
  letterOpenedTitle: "以5枚狮徽解锁的真心话",
  bluntCalloutAlt: "尼奥送上犀利真言",
  badgeVaultAwarded: "获得新徽章",
  badgeVaultTitle: "狮徽保管库",
  badgeVaultCountSuffix: "枚持有",
  badgeVaultUnlockedMsg: "这是已解锁PDF与尼奥的信的作战。",
  badgeVaultReadyMsg: "已集齐5枚徽章，现在可以解锁特典。",
  realityFormTitle: "再次反驳尼奥",
  tabFrontline: "前线诊断",
  tabUrgentOrders: "紧急作战",
  tabJudgement: "尼奥的判断",
  tabInnate: "天生性情",
  tabTopic: "主题分析",
  tabTiming: "时机与策略",
  tabEvidence: "偏离之处与依据",
  tabMission: "禁令与7日作战",
  tabCompatScores: "合盘仪表盘",
  tabCompatMutual: "彼此如何看待对方",
  tabCompatPalace: "宫位交叉解读",
  tabCompatConflict: "冲突模式",
  tabCompatStrategy: "关系作战",
  tabBadge: "狮徽",
  firstJudgementTitle: "尼奥的初步判断",
  answerThenRefineCta: "回答后领取修正作战命令书",
  docBriefingTocAria: "第1次作战简报目录",
  tabReview: "战况重新判断",
  tabVerdict: "判定",
  verdictBasisTitle: "判定依据",
  tabAdjust: "前线调整",
  tabClosing: "禁令与徽章",
  docRefinedTocAria: "第2次修正作战命令书目录",
  ctaDeckAria: "作战命令书的下一步",
  ctaOtherMethod: "用其他术数重新分析",
  ctaTeaHouse: "前往燕儿的命运茶馆",
  ctaReopen: "重新打开作战命令书",
  neoVerdictLabel: "尼奥的判定",
  defaultOperationTitle: "这次作战",
  defaultOpening: "你今天带来的问题并不轻。",
  unnamedBadgeFallback: "无名徽章",
};

const NEO_RESULT_COPY_ZH_TW: NeoResultCopyTable = {
  heroTitle: "尼歐的作戰命令書",
  heroSubtitleGenerating: "命運作戰地圖仍在展開中。",
  heroSubtitleReady: "第1次簡報和第2次修正命令書分開保管。",
  missingAttemptIdError: "缺少作戰命令書識別值。",
  loginRequiredError: "需要登入。",
  notFoundError: "未能找到作戰命令書。",
  pollTimeoutError: "作戰簡報產生耗時比平時更長。通行券會照常保留，請稍後重新整理。",
  refineMissingAnswerError: "請選擇檢驗答案，或再寫一些現在的狀況。",
  refineGenericError: "修正作戰命令書撰寫失敗。",
  refinePendingError: "修正作戰命令書仍在撰寫中，請稍後重新整理。",
  refineGenericErrorRetry: "修正作戰命令書撰寫失敗。你的回答仍會保留，請重試。",
  previewUnlockNotice: "預覽模式下獅徽不會真的變動。",
  missingSessionKeyError: "請重新確認這份作戰命令書後再使用徽章。",
  unlockGenericHint: "集齊5枚獅徽即可解鎖PDF與尼歐的信。",
  unlockErrorGeneric: "使用徽章時出現問題，請稍後重試。",
  pdfLockedHint: "使用5枚獅徽即可解鎖PDF保存。",
  pdfSaveError: "未能保存為PDF，請稍後重試。",
  selectedMethodFallback: "已選術數",
  generatingTitle: "作戰簡報生成中",
  generatingBodyDefault: "計算與LLM撰寫完成後，結果就會顯示在這份命令書中。",
  failedTitle: "作戰命令書查看失敗",
  failedDefaultMessage: "生成失敗，請確認輸入與權限後重試。",
  retryLink: "重新制定作戰",
  methodCoverAltSuffix: "封面",
  topicFallback: "未記錄作戰主題",
  summaryMethodLabel: "術數",
  summaryTopicLabel: "作戰主題",
  summaryTopicFallback: "未記錄",
  summaryIssuedLabel: "簽發日",
  summaryRefinedNote: "這是反映現實檢驗後的最終作戰。",
  summaryInitialNote: "這是以第1次簡報為基準保存的作戰。",
  actionBarAria: "作戰命令書保存與特典",
  actionBarRefinedDone: "已整理至第2次修正命令書",
  actionBarInitialDone: "第1次作戰簡報整理完成",
  benefitBusy: "徽章使用中",
  benefitDone: "特典解鎖完成",
  benefitCta: "使用5枚獅徽",
  pdfBusy: "PDF保存中",
  pdfReady: "保存PDF",
  pdfLocked: "PDF已鎖定",
  letterSpan: "尼歐留下的信",
  letterUnlockedTitle: "尼歐的信已開啟",
  letterLockedTitle: "5枚獅徽開啟這扇門",
  letterUnlockDone: "信件解鎖完成",
  letterOpenedTitle: "以5枚獅徽解鎖的真心話",
  bluntCalloutAlt: "尼歐送上犀利真言",
  badgeVaultAwarded: "獲得新徽章",
  badgeVaultTitle: "獅徽保管庫",
  badgeVaultCountSuffix: "枚持有",
  badgeVaultUnlockedMsg: "這是已解鎖PDF與尼歐的信的作戰。",
  badgeVaultReadyMsg: "已集齊5枚徽章，現在可以解鎖特典。",
  realityFormTitle: "再次反駁尼歐",
  tabFrontline: "前線診斷",
  tabUrgentOrders: "緊急作戰",
  tabJudgement: "尼歐的判斷",
  tabInnate: "天生性情",
  tabTopic: "主題分析",
  tabTiming: "時機與策略",
  tabEvidence: "偏離之處與依據",
  tabMission: "禁令與7日作戰",
  tabCompatScores: "合盤儀表板",
  tabCompatMutual: "彼此如何看待對方",
  tabCompatPalace: "宮位交叉解讀",
  tabCompatConflict: "衝突模式",
  tabCompatStrategy: "關係作戰",
  tabBadge: "獅徽",
  firstJudgementTitle: "尼歐的初步判斷",
  answerThenRefineCta: "回答後領取修正作戰命令書",
  docBriefingTocAria: "第1次作戰簡報目錄",
  tabReview: "戰況重新判斷",
  tabVerdict: "判定",
  verdictBasisTitle: "判定依據",
  tabAdjust: "前線調整",
  tabClosing: "禁令與徽章",
  docRefinedTocAria: "第2次修正作戰命令書目錄",
  ctaDeckAria: "作戰命令書的下一步",
  ctaOtherMethod: "用其他術數重新分析",
  ctaTeaHouse: "前往燕兒的命運茶館",
  ctaReopen: "重新開啟作戰命令書",
  neoVerdictLabel: "尼歐的判定",
  defaultOperationTitle: "這次作戰",
  defaultOpening: "你今天帶來的問題並不輕。",
  unnamedBadgeFallback: "無名徽章",
};

const NEO_RESULT_COPY_BY_LOCALE: Partial<Record<NonKoLocale, NeoResultCopyTable>> = {
  en: NEO_RESULT_COPY_EN,
  ja: NEO_RESULT_COPY_JA,
  "zh-CN": NEO_RESULT_COPY_ZH_CN,
  "zh-TW": NEO_RESULT_COPY_ZH_TW,
};

export function getNeoResultCopy(locale: LoadingLocale): NeoResultCopyTable {
  if (locale === "ko") return NEO_RESULT_COPY_KO;
  return NEO_RESULT_COPY_BY_LOCALE[locale as NonKoLocale] || NEO_RESULT_COPY_EN;
}

export function getNeoResultGeneratingBody(methodName: string, locale: LoadingLocale): string {
  if (locale === "ko") return `네오가 ${methodName}의 지도를 펼쳐 작전을 짜는 중이다. 계산과 LLM 작성이 끝나면 이 명령서에 결과가 찍힌다.`;
  if (locale === "ja") return `ネオが${methodName}の地図を広げて作戦を練っている最中だ。計算とLLM作成が終わると、この命令書に結果が刻まれる。`;
  if (locale === "zh-CN") return `尼奥正在展开${methodName}的地图制定作战。计算与LLM撰写完成后，结果就会显示在这份命令书中。`;
  if (locale === "zh-TW") return `尼歐正在展開${methodName}的地圖制定作戰。計算與LLM撰寫完成後，結果就會顯示在這份命令書中。`;
  return `NEO is unrolling the ${methodName} map to plan the operation. Once the calculation and LLM writing finish, the result appears in this order.`;
}

export function getNeoResultVerdictWithStatus(status: string, locale: LoadingLocale): string {
  if (locale === "ko") return `판정 · ${status}`;
  if (locale === "ja") return `判定・${status}`;
  if (locale === "zh-CN" || locale === "zh-TW") return `判定 · ${status}`;
  return `Verdict · ${status}`;
}

export function getNeoResultAdjustWithTiming(timing: string, locale: LoadingLocale): string {
  if (locale === "ko") return `전선 조정 · ${timing}`;
  if (locale === "ja") return `前線調整・${timing}`;
  if (locale === "zh-CN" || locale === "zh-TW") return `前线调整 · ${timing}`;
  return `Front line adjustment · ${timing}`;
}

export function getNeoResultTocPageFallback(index: number, locale: LoadingLocale): string {
  if (locale === "ko") return `${index}장`;
  if (locale === "ja") return `第${index}章`;
  if (locale === "zh-CN" || locale === "zh-TW") return `第${index}章`;
  return `Page ${index}`;
}

export function getNeoResultBadgeVaultRemainingMsg(remaining: number, locale: LoadingLocale): string {
  if (locale === "ko") return `${remaining}개가 더 모이면 PDF와 네오의 편지가 열린다.`;
  if (locale === "ja") return `あと${remaining}個集まるとPDFとネオの手紙が開く。`;
  if (locale === "zh-CN") return `再集${remaining}枚，PDF与尼奥的信就会开启。`;
  if (locale === "zh-TW") return `再集${remaining}枚，PDF與尼歐的信就會開啟。`;
  return `Collect ${remaining} more to unlock the PDF and NEO's letter.`;
}

export function getNeoResultBadgeVaultAriaLabel(progress: number, cost: number, locale: LoadingLocale): string {
  if (locale === "ko") return `사자 휘장 ${progress} / ${cost}`;
  if (locale === "ja") return `獅子紋章 ${progress} / ${cost}`;
  if (locale === "zh-CN" || locale === "zh-TW") return `狮徽 ${progress} / ${cost}`;
  return `Lion Seals ${progress} / ${cost}`;
}

export type NeoSincereLetterInput = {
  title: string;
  methodName: string;
  opening: string;
  frontline: string;
  stuckPointTitle: string;
  stuckPointDescription: string;
  strategy: string;
  closing: string;
};

export function buildNeoSincereLetterParagraphs(input: NeoSincereLetterInput, locale: LoadingLocale): string[] {
  const { title, methodName, opening, frontline, stuckPointTitle, stuckPointDescription, strategy, closing } = input;
  if (locale === "ja") {
    return [
      `お前へ。${title}を整理し終えて、俺は少しだけ作戦テーブルの灯りを落とした。${methodName}の地図に残った線は思ったより静かだったが、その静けさの中に、お前が長く堪えてきた心がはっきりと残っていた。${opening}`,
      frontline
        ? `お前の運命の前線でまず明らかになったのはこれだ。${frontline} この言葉はお前を追い詰めるための判定ではなく、お前がもう自分を曖昧な人間だと誤解しないための目印として立てたものだ。お前は崩れたのではなく、長すぎるほど同じやり方で耐え続け、方向を一時的に見失っただけに近い。`
        : `お前の運命の前線でまず明らかになったのは、お前が思っているより弱くないという事実だ。ただ心が疲れるたびに自分を後回しにする癖があり、その癖が運の流れを少しずつ曇らせていた。`,
      stuckPointDescription
        ? `特に心に留めるべき地点は${stuckPointTitle || "揺れていた場所"}だ。${stuckPointDescription} だから俺は、お前に大げさな覚悟より先に小さな基準を渡したい。人の反応を待つ前に自分の基準を先に読み、不安が大きくなるほど今日できる一つを小さく閉じろ。`
        : `特に心に留めるべき地点は、選択の直前の沈黙だ。お前は答えを知らないふりをしていたが、実際は答えを選んだ後に変わる景色を先に恐れていた。だから俺は、お前に大げさな覚悟より先に小さな基準を渡したい。`,
      strategy
        ? `お前が本来動くべきやり方は、すでに内側にある。${strategy} この流れを信じろ。運は遠くから突然落ちてくるものではなく、お前が毎日選ぶ方向に静かに肉付けされていく。今日一つを片づければ明日は少し揺れが減り、明日揺れが減れば次の選択はもっと澄んだものになる。`
        : `お前が本来動くべきやり方は、すでに内側にある。基準を立て、感情が落ち着いてから行動を閉じ、他人の表情より先に自分の中の秩序を確認することだ。運は遠くから突然落ちてくるものではなく、お前が毎日選ぶ方向に静かに肉付けされていく。`,
      `俺はお前の味方を無条件にするためにここにいるわけじゃない。だがお前が自分を安易に貶める瞬間には、かなり断固としてお前の前に立ちはだかる。お前はずっと先延ばしにしていい人間ではなく、もう自分の人生の指揮権を取り戻すべき人間だ。怖くてもいい。怖さがあるということは、まだ大切に守りたいものが残っているということだから。`,
      `${closing || "だから今日は曖昧にするな。お前が知っている一つから実行しろ。"} 獅子紋章5個を差し出した分、この手紙はお前がまた同じ夜に戻ったとき、そっと開いて読めるように残しておく。ネオ。`,
    ];
  }
  if (locale === "zh-CN") {
    return [
      `致你。整理完${title}之后，我把作战桌上的灯光调暗了一会儿。${methodName}地图上留下的线，比想象中安静，但那份安静里，清楚地留着你长久以来一直在忍耐的心情。${opening}`,
      frontline
        ? `在你命运的前线上，最先显现出来的是这个。${frontline} 这句话不是要逼你的判定，而是为了让你不再误以为自己是个模糊不清的人而立下的标记。你不是垮掉了，只是太长时间用同样的方式硬撑，暂时迷失了方向而已。`
        : `在你命运的前线上，最先显现出来的事实是——你并没有想象中那么脆弱。只是每当心累的时候，你都有把自己往后放的习惯，那个习惯让运势一点点变得混浊。`,
      stuckPointDescription
        ? `尤其该记在心里的一点是${stuckPointTitle || "曾动摇的地方"}。${stuckPointDescription} 所以比起宏大的决心，我更想先给你一个小小的准则。在等待别人反应之前，先读懂自己的准则；不安越大，今天就把能做的一件小事先收尾。`
        : `尤其该记在心里的一点，是做出选择前那一刻的沉默。你装作不知道答案，但其实你只是先害怕了选定答案之后会改变的风景。所以比起宏大的决心，我更想先给你一个小小的准则。`,
      strategy
        ? `你本来该走的路，其实早就在你心里了。${strategy} 相信这股流向吧。运气不是从远处突然掉下来的东西，而是在你每天做出的选择方向上，静静地长出血肉。今天理清一件事，明天就会少一点动摇；明天少动摇，下一次选择就会更清晰。`
        : `你本来该走的路，其实早就在你心里了——立好准则，等情绪平静后再收尾行动，先确认自己内心的秩序，而不是别人的脸色。运气不是从远处突然掉下来的东西，而是在你每天做出的选择方向上，静静地长出血肉。`,
      `我不是无条件站在你这边才在这里的。但当你随意贬低自己的那一刻，我会相当坚决地挡在你面前。你不是可以一直拖延下去的人，而是该重新夺回自己人生指挥权的人了。有恐惧也没关系，有恐惧就说明你心里还留着想珍惜守护的东西。`,
      `${closing || "所以今天不要含糊。从你已经知道的那一件事开始去做。"} 既然交出了五枚狮徽，这封信就留给你——在你再度回到同一个夜晚时，静静打开来看。尼奥。`,
    ];
  }
  if (locale === "zh-TW") {
    return [
      `致你。整理完${title}之後，我把作戰桌上的燈光調暗了一會兒。${methodName}地圖上留下的線，比想像中安靜，但那份安靜裡，清楚地留著你長久以來一直在忍耐的心情。${opening}`,
      frontline
        ? `在你命運的前線上，最先顯現出來的是這個。${frontline} 這句話不是要逼你的判定，而是為了讓你不再誤以為自己是個模糊不清的人而立下的標記。你不是垮掉了，只是太長時間用同樣的方式硬撐，暫時迷失了方向而已。`
        : `在你命運的前線上，最先顯現出來的事實是——你並沒有想像中那麼脆弱。只是每當心累的時候，你都有把自己往後放的習慣，那個習慣讓運勢一點點變得混濁。`,
      stuckPointDescription
        ? `尤其該記在心裡的一點是${stuckPointTitle || "曾動搖的地方"}。${stuckPointDescription} 所以比起宏大的決心，我更想先給你一個小小的準則。在等待別人反應之前，先讀懂自己的準則；不安越大，今天就把能做的一件小事先收尾。`
        : `尤其該記在心裡的一點，是做出選擇前那一刻的沉默。你裝作不知道答案，但其實你只是先害怕了選定答案之後會改變的風景。所以比起宏大的決心，我更想先給你一個小小的準則。`,
      strategy
        ? `你本來該走的路，其實早就在你心裡了。${strategy} 相信這股流向吧。運氣不是從遠處突然掉下來的東西，而是在你每天做出的選擇方向上，靜靜地長出血肉。今天理清一件事，明天就會少一點動搖；明天少動搖，下一次選擇就會更清晰。`
        : `你本來該走的路，其實早就在你心裡了——立好準則，等情緒平靜後再收尾行動，先確認自己內心的秩序，而不是別人的臉色。運氣不是從遠處突然掉下來的東西，而是在你每天做出的選擇方向上，靜靜地長出血肉。`,
      `我不是無條件站在你這邊才在這裡的。但當你隨意貶低自己的那一刻，我會相當堅決地擋在你面前。你不是可以一直拖延下去的人，而是該重新奪回自己人生指揮權的人了。有恐懼也沒關係，有恐懼就說明你心裡還留著想珍惜守護的東西。`,
      `${closing || "所以今天不要含糊。從你已經知道的那一件事開始去做。"} 既然交出了五枚獅徽，這封信就留給你——在你再度回到同一個夜晚時，靜靜打開來看。尼歐。`,
    ];
  }
  if (locale !== "ko") {
    return [
      `To you. After putting ${title} in order, I dimmed the lights over the operation table for a moment. The lines left on ${methodName}'s map were quieter than I expected, but within that quiet, the feelings you've long endured were clearly still there. ${opening}`,
      frontline
        ? `The first thing that showed up on your fault line of fate is this. ${frontline} This isn't a verdict meant to push you down — it's a marker so you stop mistaking yourself for someone unclear. You haven't collapsed; you've just held on the same way for too long and lost your direction for a moment.`
        : `The first thing that showed up on your fault line of fate is that you're not as weak as you think. But every time you got tired, you had a habit of putting yourself last, and that habit slowly clouded the flow of your fortune.`,
      stuckPointDescription
        ? `The one point especially worth keeping in mind is ${stuckPointTitle || "where you've been shaking"}. ${stuckPointDescription} So instead of a grand resolution, I want to hand you a small standard first. Read your own standard before waiting for someone else's reaction, and the bigger the anxiety gets, close out one small thing you can do today.`
        : `The one point especially worth keeping in mind is the silence right before a choice. You pretended not to know the answer, but really you were afraid of the view that would change once you picked one. So instead of a grand resolution, I want to hand you a small standard first.`,
      strategy
        ? `The way you were always meant to move is already inside you. ${strategy} Trust this flow. Luck doesn't fall suddenly from far away — it quietly builds on the direction you choose every day. Settle one thing today, and tomorrow you'll shake a little less; shake less tomorrow, and the next choice will be clearer.`
        : `The way you were always meant to move is already inside you — set a standard, close out action after your emotions settle, and check your own order before anyone else's expression. Luck doesn't fall suddenly from far away — it quietly builds on the direction you choose every day.`,
      `I'm not here to take your side unconditionally. But the moment you cheapen yourself, I'll stand in your way, quite firmly. You're not someone who gets to keep putting things off — you're someone who needs to take back command of your own life now. It's fine to be afraid. Being afraid means there's still something left that you want to protect.`,
      `${closing || "So don't blur things today. Act on the one thing you already know."} For the five Lion Seals you gave up, I leave this letter for you to quietly open the next time you find yourself back in the same night. — NEO.`,
    ];
  }
  return [
    `너에게. ${title}을 정리하고 나서, 나는 잠깐 작전 테이블의 불을 낮췄다. ${methodName}의 지도 위에 남은 선은 생각보다 조용했지만, 그 조용함 안에는 네가 오래 참아 온 마음이 또렷하게 남아 있었다. ${opening}`,
    frontline
      ? `네 운명의 전선에서 가장 먼저 드러난 것은 이것이다. ${frontline} 이 말은 너를 몰아붙이려는 판정이 아니라, 네가 더는 스스로를 흐린 사람으로 오해하지 않도록 세워 둔 표식이다. 너는 무너진 것이 아니라, 너무 오래 같은 방식으로 버티느라 방향을 잠시 잃은 쪽에 가깝다.`
      : `네 운명의 전선에서 가장 먼저 드러난 것은, 네가 생각보다 약하지 않다는 사실이다. 다만 마음이 지칠 때마다 스스로를 뒤로 미루는 버릇이 있었고, 그 버릇이 운의 흐름을 조금씩 흐리게 만들었다.`,
    stuckPointDescription
      ? `특히 마음에 남겨야 할 지점은 ${stuckPointTitle || "흔들리던 자리"}다. ${stuckPointDescription} 그래서 나는 네게 거창한 각오보다 작은 기준을 먼저 주고 싶다. 사람의 반응을 기다리기 전에 네 기준을 먼저 읽고, 불안이 커질수록 오늘 할 수 있는 한 가지를 작게 닫아라.`
      : `특히 마음에 남겨야 할 지점은 선택 직전의 침묵이다. 너는 답을 모르는 척했지만, 사실은 답을 고른 뒤 달라질 풍경을 먼저 두려워했다. 그래서 나는 네게 거창한 각오보다 작은 기준을 먼저 주고 싶다.`,
    strategy
      ? `네가 본래 움직여야 하는 방식은 이미 안쪽에 있다. ${strategy} 이 흐름을 믿어라. 운은 멀리서 갑자기 떨어지는 상이 아니라, 네가 매일 선택하는 방향에 조용히 살을 붙인다. 오늘 하나를 정리하면 내일은 조금 덜 흔들리고, 내일 덜 흔들리면 다음 선택은 더 깨끗해진다.`
      : `네가 본래 움직여야 하는 방식은 이미 안쪽에 있다. 기준을 세우고, 감정이 가라앉은 뒤 행동을 닫고, 남의 표정이 아니라 네 안의 질서를 먼저 확인하는 것이다. 운은 멀리서 갑자기 떨어지는 상이 아니라, 네가 매일 선택하는 방향에 조용히 살을 붙인다.`,
    `나는 네 편을 무조건 들어주려고 여기에 있는 것이 아니다. 하지만 네가 너 자신을 함부로 낮추는 순간에는, 꽤 단호하게 네 앞을 막을 것이다. 너는 계속 미뤄도 되는 사람이 아니라, 이제는 자기 삶의 작전권을 되찾아야 하는 사람이다. 겁이 있어도 괜찮다. 겁이 있다는 건 아직 소중히 지키고 싶은 것이 남아 있다는 뜻이니까.`,
    `${closing || "그러니 오늘은 흐리지 마라. 네가 알고 있는 한 가지부터 실행해라."} 사자 휘장 다섯 개를 내어준 만큼, 이 편지는 네가 다시 같은 밤으로 돌아갈 때 조용히 펼쳐 보라고 남긴다. 네오.`,
  ];
}

export function getNeoResultLetterLockBody(progress: number, cost: number, locale: LoadingLocale): string {
  if (locale === "ko") return `지금은 ${progress}/${cost}개가 봉인에 닿았다. 다섯 개를 사용하면 PDF 명령서와 네오의 편지가 함께 열린다.`;
  if (locale === "ja") return `今は${progress}/${cost}個が封印に届いている。5個使うとPDF命令書とネオの手紙が一緒に開く。`;
  if (locale === "zh-CN") return `目前已集${progress}/${cost}枚，触及封印。使用5枚即可同时开启PDF命令书与尼奥的信。`;
  if (locale === "zh-TW") return `目前已集${progress}/${cost}枚，觸及封印。使用5枚即可同時開啟PDF命令書與尼歐的信。`;
  return `You've reached ${progress}/${cost} toward the seal. Use five to unlock the PDF order and NEO's letter together.`;
}
