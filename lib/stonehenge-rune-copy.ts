import type { LoadingLocale } from "@/constants/loadingMessages";

export interface StonehengeRuneCopy {
  headerSub: string;
  collectionAlt: string;
  collectionLabel: string;
  collectionTitle: string;
  collectionDesc: string;
  sectionLabelSpread: string;
  spreadName1: string;
  spreadDesc1: string;
  spreadName3: string;
  spreadDesc3: string;
  spreadName5: string;
  spreadDesc5: string;
  spreadName12: string;
  spreadDesc12: string;
  drawButtonPaying: string;
  drawButtonDrawing: string;
  drawButtonReady: string;
  drawButtonPickSpread: string;
  idleHintWithSpread: string;
  idleHintNoSpread: string;
  shakingText: string;
  drawingText: string;
  directionUp: string;
  directionDown: string;
  detailDirectionUp: string;
  detailDirectionDown: string;
  detailDialogAriaLabel: string;
  detailCloseAriaLabel: string;
  axisLabelPrefix: string;
  sectionTitleCore: string;
  sectionTitleRelationship: string;
  sectionTitleWork: string;
  sectionTitleCaution: string;
  actionAdviceHeading: string;
  navPrev: string;
  navNext: string;
  detailUxNote: string;
  narrativeLabel: string;
  aiPromptKicker: string;
  aiPromptHeading: string;
  aiPromptFreeBadge: string;
  aiPromptDesc: string;
  aiPromptResultNote: string;
  aiPromptCopyDone: string;
  aiPromptCopyAction: string;
  aiPromptOpenButton: string;
  cardHintText: string;
  ctaTitle: string;
  ctaDesc: string;
  ctaShareKakao: string;
  ctaGoMain: string;
  resetButton: string;
  paymentGateReason: string;
  paymentFailedAlert: string;
  copyFailedAlert: string;
  shareTitle: string;
  shareText: string;
  shareLinkCopiedAlert: string;
  shareOpenFailedAlert: string;
}

const STONEHENGE_RUNE_COPY_EN: StonehengeRuneCopy = {
  headerSub: "Read the flow of the oracle and clearly receive today's direction",
  collectionAlt: "Stonehenge Rune Oracle",
  collectionLabel: "Oracle & Divination Collection",
  collectionTitle: "Stonehenge Rune Oracle",
  collectionDesc: "Reads your current flow, tendencies, and yearly fortune step by step through ancient rune symbols.",
  sectionLabelSpread: "Choose a spread",
  spreadName1: "1-Rune",
  spreadDesc1: "Today's advice",
  spreadName3: "3-Rune · Norns' Prophecy",
  spreadDesc3: "Past · Present · Future",
  spreadName5: "5-Rune · Deep Reading",
  spreadDesc5: "Includes tendencies + points to watch",
  spreadName12: "12-Rune · Yearly Reading",
  spreadDesc12: "Overall flow for the year",
  drawButtonPaying: "Checking payment...",
  drawButtonDrawing: "Summoning the runes...",
  drawButtonReady: "⬡  Shake the rune bag  ⬡",
  drawButtonPickSpread: "Choose a spread first",
  idleHintWithSpread: "You're ready to shake the rune bag",
  idleHintNoSpread: "Choose a spread and ask your fate a question",
  shakingText: "The ancient runes are awakening...",
  drawingText: "Fate is choosing your runes...",
  directionUp: "↑ Upright",
  directionDown: "↓ Reversed",
  detailDirectionUp: "↑ UPRIGHT",
  detailDirectionDown: "↓ REVERSED",
  detailDialogAriaLabel: "Rune detailed reading",
  detailCloseAriaLabel: "Close detailed reading",
  axisLabelPrefix: "Reading axis: ",
  sectionTitleCore: "Core flow",
  sectionTitleRelationship: "Relationships & emotions",
  sectionTitleWork: "Work & money",
  sectionTitleCaution: "Caution signal",
  actionAdviceHeading: "Practical advice",
  navPrev: "← Previous rune",
  navNext: "Next rune →",
  detailUxNote: "Use the left/right arrow keys if you want to compare cards in sequence.",
  narrativeLabel: "The rune reader's synthesis",
  aiPromptKicker: "AI QUESTION RITUAL",
  aiPromptHeading: "Ask AI to go deeper",
  aiPromptFreeBadge: "Free",
  aiPromptDesc: "We'll turn the flow of your rune spread into a question you can hand straight to an AI — no extra cost.",
  aiPromptResultNote: "Copy this and hand it to an AI to look more deeply into the flow of your current spread.",
  aiPromptCopyDone: "Copied",
  aiPromptCopyAction: "Copy",
  aiPromptOpenButton: "Open the AI question (free)",
  cardHintText: "Tap a rune card to instantly open its detailed reading",
  ctaTitle: "Share it, then head onward",
  ctaDesc: "Share your rune result on KakaoTalk, or head back to the main screen to check other readings.",
  ctaShareKakao: "Share on KakaoTalk",
  ctaGoMain: "Go to main screen",
  resetButton: "↺  Draw again",
  paymentGateReason: "Stonehenge rune reading",
  paymentFailedAlert: "Couldn't complete the payment. Please try again shortly.",
  copyFailedAlert: "Couldn't copy. Please select the text and copy it yourself.",
  shareTitle: "Stonehenge Rune Oracle",
  shareText: "Check today's flow through the whisper of the runes.",
  shareLinkCopiedAlert: "Copied the share link. Paste it into a KakaoTalk chat to share.",
  shareOpenFailedAlert: "Couldn't open sharing. Please try again shortly.",
};

const STONEHENGE_RUNE_COPY: Partial<Record<LoadingLocale, StonehengeRuneCopy>> = {
  ko: {
    headerSub: "신탁의 흐름을 읽고, 오늘의 방향을 선명하게 받아보세요",
    collectionAlt: "스톤헨지 룬 오라클",
    collectionLabel: "신탁 & 점술 컬렉션",
    collectionTitle: "스톤헨지 룬 오라클",
    collectionDesc: "고대 룬의 상징을 통해 현재 흐름, 성향, 연간 운세까지 단계별로 해석합니다.",
    sectionLabelSpread: "배열 선택",
    spreadName1: "1-룬",
    spreadDesc1: "오늘의 조언",
    spreadName3: "3-룬 · 노른의 예언",
    spreadDesc3: "과거 · 현재 · 미래",
    spreadName5: "5-룬 · 심층 해석",
    spreadDesc5: "성향 + 주의 포인트 포함",
    spreadName12: "12-룬 · 연간 대점",
    spreadDesc12: "1년 종합 흐름",
    drawButtonPaying: "결제를 확인하는 중...",
    drawButtonDrawing: "룬을 소환하는 중...",
    drawButtonReady: "⬡  룬 주머니를 흔들어라  ⬡",
    drawButtonPickSpread: "배열을 먼저 선택하세요",
    idleHintWithSpread: "이제 룬 주머니를 흔들 준비가 되었습니다",
    idleHintNoSpread: "배열을 선택하고 운명을 물어보세요",
    shakingText: "고대의 룬들이 깨어납니다...",
    drawingText: "운명이 룬을 선택합니다...",
    directionUp: "↑ 정방향",
    directionDown: "↓ 역방향",
    detailDirectionUp: "↑ UPRIGHT · 정방향",
    detailDirectionDown: "↓ REVERSED · 역방향",
    detailDialogAriaLabel: "룬 상세 해석",
    detailCloseAriaLabel: "상세 해석 닫기",
    axisLabelPrefix: "해석 축: ",
    sectionTitleCore: "핵심 흐름",
    sectionTitleRelationship: "관계 · 감정",
    sectionTitleWork: "일 · 재물",
    sectionTitleCaution: "주의 신호",
    actionAdviceHeading: "실천 조언",
    navPrev: "← 이전 룬",
    navNext: "다음 룬 →",
    detailUxNote: "카드를 연속으로 비교해 보고 싶다면 좌우 화살표 키를 사용하세요.",
    narrativeLabel: "룬 리더의 종합 해석",
    aiPromptKicker: "AI QUESTION RITUAL",
    aiPromptHeading: "AI에게 더 깊이 물어보기",
    aiPromptFreeBadge: "무료",
    aiPromptDesc: "지금 펼쳐진 룬의 흐름을 AI에게 그대로 건넬 수 있는 질문문으로 정리해 드립니다. 추가 비용 없이 이용하세요.",
    aiPromptResultNote: "이 문장을 복사해 AI에게 건네면, 지금 펼쳐진 룬의 흐름을 더 깊이 들여다볼 수 있습니다.",
    aiPromptCopyDone: "복사 완료",
    aiPromptCopyAction: "복사하기",
    aiPromptOpenButton: "AI 질문문 열기 (무료)",
    cardHintText: "룬 카드를 클릭하면 상세 해석이 즉시 팝업으로 열립니다",
    ctaTitle: "함께 나누고 바로 만나기",
    ctaDesc: "룬 결과를 카카오톡으로 공유하거나 메인 화면으로 이동해 다른 점술도 이어서 확인해보세요.",
    ctaShareKakao: "카카오톡 공유하기",
    ctaGoMain: "메인 화면 바로가기",
    resetButton: "↺  다시 뽑기",
    paymentGateReason: "스톤헨지 룬점",
    paymentFailedAlert: "결제를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    copyFailedAlert: "복사할 수 없습니다. 문장을 직접 선택해 복사해 주세요.",
    shareTitle: "스톤헨지 룬 오라클",
    shareText: "룬의 속삭임으로 오늘의 흐름을 확인해보세요.",
    shareLinkCopiedAlert: "공유 링크를 복사했습니다. 카카오톡 대화창에 붙여넣어 공유해 주세요.",
    shareOpenFailedAlert: "공유를 열 수 없었습니다. 잠시 후 다시 시도해 주세요.",
  },
  ja: {
    headerSub: "神託の流れを読み、今日の方向をはっきりと受け取りましょう",
    collectionAlt: "ストーンヘンジ・ルーンオラクル",
    collectionLabel: "神託・占術コレクション",
    collectionTitle: "ストーンヘンジ・ルーンオラクル",
    collectionDesc: "古代ルーンの象徴を通して、今の流れ・傾向・年間運勢まで段階的に解釈します。",
    sectionLabelSpread: "スプレッドを選択",
    spreadName1: "1ルーン",
    spreadDesc1: "今日のアドバイス",
    spreadName3: "3ルーン・ノルンの予言",
    spreadDesc3: "過去・現在・未来",
    spreadName5: "5ルーン・深層リーディング",
    spreadDesc5: "傾向＋注意ポイントを含む",
    spreadName12: "12ルーン・年間大占い",
    spreadDesc12: "1年の総合的な流れ",
    drawButtonPaying: "決済を確認しています...",
    drawButtonDrawing: "ルーンを呼び出しています...",
    drawButtonReady: "⬡  ルーン袋を振る  ⬡",
    drawButtonPickSpread: "先にスプレッドを選んでください",
    idleHintWithSpread: "ルーン袋を振る準備ができました",
    idleHintNoSpread: "スプレッドを選んで運命に問いかけましょう",
    shakingText: "古代のルーンが目覚めています...",
    drawingText: "運命がルーンを選んでいます...",
    directionUp: "↑ 正位置",
    directionDown: "↓ 逆位置",
    detailDirectionUp: "↑ UPRIGHT・正位置",
    detailDirectionDown: "↓ REVERSED・逆位置",
    detailDialogAriaLabel: "ルーン詳細解釈",
    detailCloseAriaLabel: "詳細解釈を閉じる",
    axisLabelPrefix: "解釈の軸：",
    sectionTitleCore: "中心的な流れ",
    sectionTitleRelationship: "対人関係・感情",
    sectionTitleWork: "仕事・お金",
    sectionTitleCaution: "注意すべきサイン",
    actionAdviceHeading: "実践アドバイス",
    navPrev: "← 前のルーン",
    navNext: "次のルーン →",
    detailUxNote: "カードを連続して比較したい場合は左右の矢印キーをお使いください。",
    narrativeLabel: "ルーンリーダーによる総合解釈",
    aiPromptKicker: "AI QUESTION RITUAL",
    aiPromptHeading: "AIにもっと深く尋ねる",
    aiPromptFreeBadge: "無料",
    aiPromptDesc: "今開かれたルーンの流れを、AIにそのまま渡せる質問文に整えます。追加費用なしでご利用いただけます。",
    aiPromptResultNote: "この文章をコピーしてAIに渡すと、今開かれたルーンの流れをより深く見つめることができます。",
    aiPromptCopyDone: "コピー完了",
    aiPromptCopyAction: "コピーする",
    aiPromptOpenButton: "AI質問文を開く（無料）",
    cardHintText: "ルーンカードをタップすると詳細解釈がすぐにポップアップで開きます",
    ctaTitle: "分かち合って、次へ進む",
    ctaDesc: "ルーンの結果をKakaoTalkで共有するか、メイン画面に移動して他の占いも続けて確認してみてください。",
    ctaShareKakao: "KakaoTalkで共有する",
    ctaGoMain: "メイン画面へ",
    resetButton: "↺  もう一度引く",
    paymentGateReason: "ストーンヘンジ・ルーン占い",
    paymentFailedAlert: "決済を完了できませんでした。少し経ってからもう一度お試しください。",
    copyFailedAlert: "コピーできません。文章を直接選択してコピーしてください。",
    shareTitle: "ストーンヘンジ・ルーンオラクル",
    shareText: "ルーンのささやきで今日の流れを確認してみましょう。",
    shareLinkCopiedAlert: "共有リンクをコピーしました。KakaoTalkのトーク画面に貼り付けて共有してください。",
    shareOpenFailedAlert: "共有を開けませんでした。少し経ってからもう一度お試しください。",
  },
  "zh-CN": {
    headerSub: "解读神谕的走势，清晰接收今天的方向",
    collectionAlt: "巨石阵符文神谕",
    collectionLabel: "神谕与占卜合集",
    collectionTitle: "巨石阵符文神谕",
    collectionDesc: "通过古老符文的象征，逐步解读当下走势、性格倾向乃至年度运势。",
    sectionLabelSpread: "选择牌阵",
    spreadName1: "单符文",
    spreadDesc1: "今日建议",
    spreadName3: "三符文 · 诺伦预言",
    spreadDesc3: "过去 · 现在 · 未来",
    spreadName5: "五符文 · 深度解读",
    spreadDesc5: "含性格倾向与注意要点",
    spreadName12: "十二符文 · 年度大占",
    spreadDesc12: "全年综合走势",
    drawButtonPaying: "正在确认支付...",
    drawButtonDrawing: "正在召唤符文...",
    drawButtonReady: "⬡  摇动符文袋  ⬡",
    drawButtonPickSpread: "请先选择牌阵",
    idleHintWithSpread: "现在可以摇动符文袋了",
    idleHintNoSpread: "选择牌阵，向命运提问",
    shakingText: "古老的符文正在苏醒...",
    drawingText: "命运正在为你选择符文...",
    directionUp: "↑ 正位",
    directionDown: "↓ 逆位",
    detailDirectionUp: "↑ UPRIGHT · 正位",
    detailDirectionDown: "↓ REVERSED · 逆位",
    detailDialogAriaLabel: "符文详细解读",
    detailCloseAriaLabel: "关闭详细解读",
    axisLabelPrefix: "解读主轴：",
    sectionTitleCore: "核心走势",
    sectionTitleRelationship: "人际关系与情感",
    sectionTitleWork: "工作与财运",
    sectionTitleCaution: "注意信号",
    actionAdviceHeading: "实践建议",
    navPrev: "← 上一个符文",
    navNext: "下一个符文 →",
    detailUxNote: "如果想连续比较卡牌，请使用左右方向键。",
    narrativeLabel: "符文解读师的综合解读",
    aiPromptKicker: "AI QUESTION RITUAL",
    aiPromptHeading: "向AI深入提问",
    aiPromptFreeBadge: "免费",
    aiPromptDesc: "我们会把当前展开的符文走势整理成可以直接交给AI的提问句，无需额外费用即可使用。",
    aiPromptResultNote: "复制这段文字交给AI，即可更深入地了解当前展开的符文走势。",
    aiPromptCopyDone: "已复制",
    aiPromptCopyAction: "复制",
    aiPromptOpenButton: "打开AI提问句（免费）",
    cardHintText: "点击符文卡牌即可立即弹出详细解读",
    ctaTitle: "分享给朋友，继续探索",
    ctaDesc: "通过KakaoTalk分享你的符文结果，或返回主页面继续查看其他占卜。",
    ctaShareKakao: "通过KakaoTalk分享",
    ctaGoMain: "前往主页面",
    resetButton: "↺  重新抽取",
    paymentGateReason: "巨石阵符文占卜",
    paymentFailedAlert: "未能完成支付。请稍后重试。",
    copyFailedAlert: "无法复制。请直接选中文字后自行复制。",
    shareTitle: "巨石阵符文神谕",
    shareText: "透过符文的低语，确认今天的走势吧。",
    shareLinkCopiedAlert: "已复制分享链接。请粘贴到KakaoTalk对话框中分享。",
    shareOpenFailedAlert: "无法打开分享。请稍后重试。",
  },
  "zh-TW": {
    headerSub: "解讀神諭的走勢，清晰接收今天的方向",
    collectionAlt: "巨石陣符文神諭",
    collectionLabel: "神諭與占卜合集",
    collectionTitle: "巨石陣符文神諭",
    collectionDesc: "透過古老符文的象徵，逐步解讀當下走勢、性格傾向乃至年度運勢。",
    sectionLabelSpread: "選擇牌陣",
    spreadName1: "單符文",
    spreadDesc1: "今日建議",
    spreadName3: "三符文 · 諾恩預言",
    spreadDesc3: "過去 · 現在 · 未來",
    spreadName5: "五符文 · 深度解讀",
    spreadDesc5: "含性格傾向與注意要點",
    spreadName12: "十二符文 · 年度大占",
    spreadDesc12: "全年綜合走勢",
    drawButtonPaying: "正在確認付款...",
    drawButtonDrawing: "正在召喚符文...",
    drawButtonReady: "⬡  搖動符文袋  ⬡",
    drawButtonPickSpread: "請先選擇牌陣",
    idleHintWithSpread: "現在可以搖動符文袋了",
    idleHintNoSpread: "選擇牌陣，向命運提問",
    shakingText: "古老的符文正在甦醒...",
    drawingText: "命運正在為你選擇符文...",
    directionUp: "↑ 正位",
    directionDown: "↓ 逆位",
    detailDirectionUp: "↑ UPRIGHT · 正位",
    detailDirectionDown: "↓ REVERSED · 逆位",
    detailDialogAriaLabel: "符文詳細解讀",
    detailCloseAriaLabel: "關閉詳細解讀",
    axisLabelPrefix: "解讀主軸：",
    sectionTitleCore: "核心走勢",
    sectionTitleRelationship: "人際關係與情感",
    sectionTitleWork: "工作與財運",
    sectionTitleCaution: "注意訊號",
    actionAdviceHeading: "實踐建議",
    navPrev: "← 上一個符文",
    navNext: "下一個符文 →",
    detailUxNote: "如果想連續比較卡牌，請使用左右方向鍵。",
    narrativeLabel: "符文解讀師的綜合解讀",
    aiPromptKicker: "AI QUESTION RITUAL",
    aiPromptHeading: "向AI深入提問",
    aiPromptFreeBadge: "免費",
    aiPromptDesc: "我們會把目前展開的符文走勢整理成可以直接交給AI的提問句，無需額外費用即可使用。",
    aiPromptResultNote: "複製這段文字交給AI，即可更深入地了解目前展開的符文走勢。",
    aiPromptCopyDone: "已複製",
    aiPromptCopyAction: "複製",
    aiPromptOpenButton: "開啟AI提問句（免費）",
    cardHintText: "點擊符文卡牌即可立即彈出詳細解讀",
    ctaTitle: "分享給朋友，繼續探索",
    ctaDesc: "透過KakaoTalk分享你的符文結果，或返回主畫面繼續查看其他占卜。",
    ctaShareKakao: "透過KakaoTalk分享",
    ctaGoMain: "前往主畫面",
    resetButton: "↺  重新抽取",
    paymentGateReason: "巨石陣符文占卜",
    paymentFailedAlert: "未能完成付款。請稍後重試。",
    copyFailedAlert: "無法複製。請直接選取文字後自行複製。",
    shareTitle: "巨石陣符文神諭",
    shareText: "透過符文的低語，確認今天的走勢吧。",
    shareLinkCopiedAlert: "已複製分享連結。請貼到KakaoTalk對話框中分享。",
    shareOpenFailedAlert: "無法開啟分享。請稍後重試。",
  },
};

export function getStonehengeRuneCopy(locale: LoadingLocale): StonehengeRuneCopy {
  return { ...STONEHENGE_RUNE_COPY_EN, ...(STONEHENGE_RUNE_COPY[locale] || {}) };
}
