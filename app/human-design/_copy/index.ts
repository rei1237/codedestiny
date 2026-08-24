// 휴먼 디자인 표시 문구 — ko / en.
//
// 🔴 이 파일은 **표시 계층 전용**이다. 워커 번들에 들어가지 않는다(계산 엔진은 canonical
//    identifier 만 다루고, 서술 문구는 여기와 AI 해석이 나눠 갖는다).
//
// 🔴 게이트는 **주역 괘명**만 싣는다. 휴먼 디자인 고유의 게이트 키노트·채널 이름은 출처가
//    있어야 하는 서술 자료라 지어내지 않았다. 게이트/채널을 눌렀을 때 보여 주는 것은
//    계산으로 확인된 사실(번호·라인·활성 행성·계층·소속 센터·완성 여부)이고, 해석은
//    같은 결제로 열리는 AI 리딩이 맡는다.

import {
  AUTHORITY_NAME,
  CENTER_NAME,
  CROSS_ANGLE_NAME,
  DEFINITION_NAME,
  NOT_SELF_NAME,
  PLANET_NAME,
  SIGNATURE_NAME,
  STRATEGY_NAME,
  TYPE_NAME,
} from "@/lib/human-design/display-names";

/**
 * 화면 크롬의 표시 언어. 🔴 리포트 **본문** 언어(report/_lib/types.ts 의 ReportLocale)와 다른 축이다 —
 * 본문은 저장된 report.locale 이고(ko 리포트를 en 화면에서 열어도 본문은 ko 여야 한다), 이것은 보는 사람의 언어다.
 */
export type Locale = "ko" | "en" | "ja" | "zh-CN" | "zh-TW";

/** 🔴 다섯 개 전부 필수다. 선택으로 두면 빠진 언어가 조용히 영어로 새고 아무도 모른다. */
type Bilingual = Record<Locale, string>;

/**
 * 앱 전역 로케일(12개) → 이 화면이 저작한 다섯 개.
 * 🔴 나머지 일곱은 영어로 접는다 — 레포 관행이고, ko 로 접으면 비-한국어 사용자가 한국어를 본다.
 */
export function resolveHumanDesignLocale(value: string | null | undefined): Locale {
  const normalized = String(value || "").trim();
  return (["ko", "en", "ja", "zh-CN", "zh-TW"] as Locale[]).includes(normalized as Locale)
    ? (normalized as Locale)
    : "en";
}

export const UI_TEXT = {
  title: { ko: "휴먼 디자인", en: "Human Design", ja: "ヒューマンデザイン", "zh-CN": "人类图", "zh-TW": "人類圖" },
  tagline: { ko: "나를 설계한 에너지 지도", en: "The energy map that designed you", ja: "あなたを設計したエネルギーの地図", "zh-CN": "设计出你的能量地图", "zh-TW": "設計出你的能量地圖" },
  subtitle: {
    ko: "정확한 천문 계산 · 인터랙티브 바디그래프 · 무료",
    en: "Precise ephemeris · Interactive BodyGraph · free", ja: "正確な天文計算 · 触れるボディグラフ · 無料", "zh-CN": "精确星历计算 · 可点按的身体图 · 免费", "zh-TW": "精確星曆計算 · 可點按的身體圖 · 免費",
  },
  formHeading: { ko: "출생 정보", en: "Birth data", ja: "出生情報", "zh-CN": "出生信息", "zh-TW": "出生資訊" },
  birthDate: { ko: "생년월일", en: "Birth date", ja: "生年月日", "zh-CN": "出生日期", "zh-TW": "出生日期" },
  birthTime: { ko: "태어난 시각", en: "Birth time", ja: "生まれた時刻", "zh-CN": "出生时刻", "zh-TW": "出生時刻" },
  timezone: { ko: "출생지 타임존", en: "Birth timezone", ja: "出生地のタイムゾーン", "zh-CN": "出生地时区", "zh-TW": "出生地時區" },
  calendar: { ko: "달력", en: "Calendar", ja: "暦", "zh-CN": "历法", "zh-TW": "曆法" },
  solar: { ko: "양력", en: "Solar", ja: "新暦", "zh-CN": "阳历", "zh-TW": "陽曆" },
  lunar: { ko: "음력", en: "Lunar", ja: "旧暦", "zh-CN": "农历", "zh-TW": "農曆" },
  lunarLeap: { ko: "음력(윤달)", en: "Lunar (leap month)", ja: "旧暦（閏月）", "zh-CN": "农历（闰月）", "zh-TW": "農曆（閏月）" },
  submit: { ko: "내 바디그래프 만들기", en: "Build my BodyGraph", ja: "ボディグラフを作る", "zh-CN": "生成我的身体图", "zh-TW": "生成我的身體圖" },
  submitting: { ko: "계산 중…", en: "Calculating…", ja: "計算中…", "zh-CN": "计算中…", "zh-TW": "計算中…" },
  timezoneHelp: {
    ko: "태어난 지역의 타임존입니다. 서머타임은 출생 날짜 기준으로 자동 반영됩니다.",
    en: "The birthplace timezone. Daylight saving is applied automatically for the birth date.", ja: "生まれた地域のタイムゾーンです。サマータイムは出生日に合わせて自動で反映されます。", "zh-CN": "这是出生地的时区。夏令时会依出生日期自动套用。", "zh-TW": "這是出生地的時區。日光節約時間會依出生日期自動套用。",
  },
  timeHelp: {
    ko: "시각이 1분만 달라도 라인과 프로파일이 바뀔 수 있습니다. 아는 만큼 정확히 입력해 주세요.",
    en: "One minute can change a line and the profile. Enter it as precisely as you know it.", ja: "1分違うだけでラインとプロファイルが変わります。分かる範囲で正確に入れてください。", "zh-CN": "只差一分钟，线与人生角色就可能不同。请尽你所知填得精确些。", "zh-TW": "只差一分鐘，線與人生角色就可能不同。請盡你所知填得精確些。",
  },
  reusedNotice: {
    ko: "같은 출생 정보로 이미 만든 차트를 그대로 열었습니다.",
    en: "Reopened from your saved chart for the same birth data.", ja: "同じ出生情報で作成済みのチャートをそのまま開きました。", "zh-CN": "已直接打开以相同出生信息生成过的图。", "zh-TW": "已直接開啟以相同出生資訊產生過的圖。",
  },
  personality: { ko: "퍼스낼리티(의식)", en: "Personality (conscious)", ja: "パーソナリティ（意識）", "zh-CN": "个性（意识）", "zh-TW": "個性（意識）" },
  design: { ko: "디자인(무의식)", en: "Design (unconscious)", ja: "デザイン（無意識）", "zh-CN": "设计（无意识）", "zh-TW": "設計（無意識）" },
  definedCenters: { ko: "정의된 센터", en: "Defined centers", ja: "定義されたセンター", "zh-CN": "已定义的中心", "zh-TW": "已定義的中心" },
  undefinedCenters: { ko: "정의되지 않은 센터", en: "Undefined centers", ja: "未定義のセンター", "zh-CN": "未定义的中心", "zh-TW": "未定義的中心" },
  activeGates: { ko: "활성 게이트", en: "Active gates", ja: "活性ゲート", "zh-CN": "启动的闸门", "zh-TW": "啟動的閘門" },
  activeChannels: { ko: "활성 채널", en: "Active channels", ja: "活性チャネル", "zh-CN": "启动的通道", "zh-TW": "啟動的通道" },
  defined: { ko: "정의됨", en: "Defined", ja: "定義あり", "zh-CN": "已定义", "zh-TW": "已定義" },
  undefined: { ko: "정의되지 않음", en: "Undefined", ja: "定義なし", "zh-CN": "未定义", "zh-TW": "未定義" },
  complete: { ko: "완성", en: "Complete", ja: "完成", "zh-CN": "完整", "zh-TW": "完整" },
  incomplete: { ko: "미완성", en: "Incomplete", ja: "未完成", "zh-CN": "不完整", "zh-TW": "不完整" },
  tapHint: {
    ko: "센터 · 게이트 · 채널을 눌러 상세를 확인하세요",
    en: "Tap a center, gate, or channel for details", ja: "センター・ゲート・チャネルに触れると詳細が出ます", "zh-CN": "点按中心、闸门或通道即可看到细节", "zh-TW": "點按中心、閘門或通道即可看到細節",
  },
  close: { ko: "닫기", en: "Close", ja: "閉じる", "zh-CN": "关闭", "zh-TW": "關閉" },
  designMoment: { ko: "디자인 시각", en: "Design moment", ja: "デザインの時刻", "zh-CN": "设计时刻", "zh-TW": "設計時刻" },
  birthMoment: { ko: "출생 시각(UTC)", en: "Birth moment (UTC)", ja: "出生の時刻（UTC）", "zh-CN": "出生时刻（UTC）", "zh-TW": "出生時刻（UTC）" },
  solarArcNote: {
    ko: "출생 태양에서 정확히 88° 이전 — 날짜를 빼서 어림한 값이 아닙니다.",
    en: "Exactly 88° of solar arc before birth — not an 88-day approximation.", ja: "出生前のちょうど88°の太陽弧です。88日という概算ではありません。", "zh-CN": "是出生前正好 88° 的太阳弧，不是 88 天的约数。", "zh-TW": "是出生前正好 88° 的太陽弧，不是 88 天的約數。",
  },
  gate: { ko: "게이트", en: "Gate", ja: "ゲート", "zh-CN": "闸门", "zh-TW": "閘門" },
  line: { ko: "라인", en: "Line", ja: "ライン", "zh-CN": "线", "zh-TW": "線" },
  channel: { ko: "채널", en: "Channel", ja: "チャネル", "zh-CN": "通道", "zh-TW": "通道" },
  center: { ko: "센터", en: "Center", ja: "センター", "zh-CN": "中心", "zh-TW": "中心" },
  activatedBy: { ko: "활성시킨 행성", en: "Activated by", ja: "活性化した天体", "zh-CN": "由何启动", "zh-TW": "由何啟動" },
  belongsTo: { ko: "소속 센터", en: "Belongs to", ja: "所属", "zh-CN": "所属", "zh-TW": "所屬" },
  participatesIn: { ko: "참여 채널", en: "Channels", ja: "チャネル", "zh-CN": "通道", "zh-TW": "通道" },
  ichingName: { ko: "주역 괘", en: "I Ching hexagram", ja: "易経の卦", "zh-CN": "易经卦名", "zh-TW": "易經卦名" },
  interpretationPending: {
    ko: "여기 보이는 값은 모두 계산으로 확인된 사실입니다. 개인 해석은 담고 있지 않습니다.",
    en: "Everything here is a computed fact. It does not include personal interpretation.", ja: "ここにあるのは計算で確かめた事実だけです。個別の解釈は含みません。", "zh-CN": "这里呈现的都是计算得出的事实，不含个人化解读。", "zh-TW": "這裡呈現的都是計算得出的事實，不含個人化解讀。",
  },
  interpretationHeading: { ko: "AI 개인 해석", en: "AI reading", ja: "AIリーディング", "zh-CN": "AI 解读", "zh-TW": "AI 解讀" },
  interpretationCta: { ko: "내 차트로 해석 받기", en: "Read my chart", ja: "わたしのチャートを読む", "zh-CN": "解读我的图", "zh-TW": "解讀我的圖" },
  interpretationLoading: { ko: "해석을 쓰는 중…", en: "Writing your reading…", ja: "リーディングを書いています…", "zh-CN": "正在撰写解读…", "zh-TW": "正在撰寫解讀…" },
  interpretationRetry: { ko: "해석 다시 시도", en: "Retry reading", ja: "もう一度読む", "zh-CN": "重新解读", "zh-TW": "重新解讀" },
  interpretationIncluded: {
    ko: "이미 결제한 차트에 포함됩니다. 추가 결제가 없습니다.",
    en: "Included with the chart you already paid for. No extra charge.", ja: "すでにお支払いのチャートに含まれています。追加料金はありません。", "zh-CN": "已包含在你付过费的图中，不另收费。", "zh-TW": "已包含在你付過費的圖中，不另收費。",
  },
  interpretationBasis: {
    ko: "이 해석은 위에서 계산된 값만 근거로 씁니다 — AI 에게 출생 정보는 전달되지 않습니다.",
    en: "This reading is written from the computed values above — your birth data is never sent to the AI.", ja: "このリーディングは上の計算値から書かれます。出生情報がAIに送られることはありません。", "zh-CN": "这份解读依据上方的计算值写成 — 你的出生信息不会送给 AI。", "zh-TW": "這份解讀依據上方的計算值寫成 — 你的出生資訊不會送給 AI。",
  },
  interpretationSummary: { ko: "요약", en: "Summary", ja: "まとめ", "zh-CN": "摘要", "zh-TW": "摘要" },
  interpretationFailed: {
    ko: "해석을 만들지 못했습니다. 차트는 그대로 있으니 다시 시도해 주세요.",
    en: "Could not write the reading. Your chart is safe — please retry.", ja: "リーディングを書けませんでした。チャートは残っていますので、もう一度お試しください。", "zh-CN": "无法写出解读。你的图仍在，请再试一次。", "zh-TW": "無法寫出解讀。你的圖仍在，請再試一次。",
  },

  // ── 몰입형 셸 · 단계별 정보 구조 ──────────────────────────────────────────
  // 🔴 프로파일의 라인 이름(1 조사자 … 6 롤모델)은 여기 넣지 않는다. 이 파일 맨 위 규칙대로
  //    출처가 필요한 서술 자료는 지어내지 않고 AI 리딩이 맡는다. 여기서는 숫자만 크게 보인다.
  exit: { ko: "홈으로", en: "Home", ja: "ホーム", "zh-CN": "首页", "zh-TW": "首頁" },
  restart: { ko: "다른 출생 정보로", en: "New birth data", ja: "別の出生情報", "zh-CN": "换一组出生信息", "zh-TW": "換一組出生資訊" },
  ghostCaption: {
    ko: "아직 비어 있는 설계도입니다. 출생 정보를 넣으면 당신의 26개 활성이 여기에 켜집니다.",
    en: "An empty blueprint. Enter your birth data and your 26 activations light it up.", ja: "まだ空の設計図です。出生情報を入れると26の活性が灯ります。", "zh-CN": "还是空白的设计图。填入出生信息，26 个启动就会亮起来。", "zh-TW": "還是空白的設計圖。填入出生資訊，26 個啟動就會亮起來。",
  },
  sectionNav: { ko: "차트 안에서 이동", en: "Jump inside the chart", ja: "チャートの中を移動", "zh-CN": "在图中跳转", "zh-TW": "在圖中跳轉" },
  sectionMyDesign: { ko: "마이 디자인", en: "My Design", ja: "わたしのデザイン", "zh-CN": "我的设计", "zh-TW": "我的設計" },
  sectionType: { ko: "타입", en: "Type", ja: "タイプ", "zh-CN": "类型", "zh-TW": "類型" },
  sectionStrategy: { ko: "전략", en: "Strategy", ja: "ストラテジー", "zh-CN": "策略", "zh-TW": "策略" },
  sectionAuthority: { ko: "내적 권위", en: "Authority", ja: "オーソリティ", "zh-CN": "内在权威", "zh-TW": "內在權威" },
  sectionProfile: { ko: "프로파일", en: "Profile", ja: "プロファイル", "zh-CN": "人生角色", "zh-TW": "人生角色" },
  sectionCenters: { ko: "센터", en: "Centers", ja: "センター", "zh-CN": "中心", "zh-TW": "中心" },
  sectionChannels: { ko: "채널", en: "Channels", ja: "チャネル", "zh-CN": "通道", "zh-TW": "通道" },
  sectionGates: { ko: "게이트", en: "Gates", ja: "ゲート", "zh-CN": "闸门", "zh-TW": "閘門" },
  sectionPlanets: { ko: "행성 활성", en: "Planetary Activations", ja: "天体の活性", "zh-CN": "行星启动", "zh-TW": "行星啟動" },
  sectionReading: { ko: "더 깊은 해석", en: "Deeper Reading", ja: "さらに深く読む", "zh-CN": "更深入的解读", "zh-TW": "更深入的解讀" },
  signature: { ko: "시그니처", en: "Signature", ja: "シグネチャー", "zh-CN": "签名主题", "zh-TW": "簽名主題" },
  notSelf: { ko: "낫셀프 테마", en: "Not-self theme", ja: "ノットセルフ・テーマ", "zh-CN": "非自己主题", "zh-TW": "非自己主題" },
  definition: { ko: "정의 형태", en: "Definition", ja: "ディフィニション", "zh-CN": "定义", "zh-TW": "定義" },
  incarnationCross: { ko: "인카네이션 크로스", en: "Incarnation Cross", ja: "インカーネーション・クロス", "zh-CN": "轮回交叉", "zh-TW": "輪迴交叉" },
  profileLines: { ko: "의식 라인 / 무의식 라인", en: "Conscious line / Unconscious line", ja: "意識のライン / 無意識のライン", "zh-CN": "意识线 / 无意识线", "zh-TW": "意識線 / 無意識線" },
  showInChart: { ko: "차트에서 보기", en: "Show in chart", ja: "チャートで見る", "zh-CN": "在图中显示", "zh-TW": "在圖中顯示" },
  centersDefinedHint: {
    ko: "정의된 센터는 늘 같은 방식으로 작동하고, 정의되지 않은 센터는 주변을 받아들여 증폭합니다.",
    en: "Defined centers work the same way always; undefined centers take in and amplify what is around you.", ja: "定義されたセンターはいつも同じように働き、未定義のセンターは周りのものを取り込んで増幅します。", "zh-CN": "已定义的中心始终以同样方式运作；未定义的中心会吸收并放大周围的一切。", "zh-TW": "已定義的中心始終以同樣方式運作；未定義的中心會吸收並放大周圍的一切。",
  },
  channelsHint: {
    ko: "채널은 양쪽 게이트가 모두 활성일 때만 완성됩니다. 완성된 채널이 두 센터를 정의합니다.",
    en: "A channel completes only when both gates are active — and a completed channel is what defines two centers.", ja: "チャネルは両端のゲートが揃って初めて完成し、完成したチャネルが2つのセンターを定義します。", "zh-CN": "通道要两端闸门都启动才算完整，而完整的通道正是定义两个中心的原因。", "zh-TW": "通道要兩端閘門都啟動才算完整，而完整的通道正是定義兩個中心的原因。",
  },
  gatesHint: {
    ko: "활성 게이트는 26개 행성 활성이 만든 것입니다. 눌러 어느 행성이 켰는지 확인하세요.",
    en: "Active gates come from your 26 planetary activations. Tap one to see which planet lit it.", ja: "活性ゲートは26の天体活性から生まれます。触れるとどの天体が灯したか分かります。", "zh-CN": "启动的闸门来自你的 26 个行星启动。点一下就能看到是哪颗星点亮的。", "zh-TW": "啟動的閘門來自你的 26 個行星啟動。點一下就能看到是哪顆星點亮的。",
  },
  noneYet: { ko: "없음", en: "None", ja: "なし", "zh-CN": "无", "zh-TW": "無" },
  freeNote: {
    ko: "차트는 무료입니다. 로그인만 하면 몇 번이든 다시 볼 수 있습니다.",
    en: "The chart is free. Sign in and reopen it as often as you like.", ja: "チャートは無料です。ログインすれば何度でも開き直せます。", "zh-CN": "图是免费的。登录后想看几次都可以。", "zh-TW": "圖是免費的。登入後想看幾次都可以。",
  },
  // 🔴 옛 해석은 생성이 은퇴했고 이미 결제한 사람에게만 보인다. 새 구매를 권하는 문구를
  //    여기 넣지 말 것 — 이 자리는 "예전에 산 것을 되살렸다"는 안내다.
  legacyReadingNote: {
    ko: "이전에 구매하신 AI 해석입니다. 지금은 새로 생성하지 않고 저장된 내용을 그대로 보여 드립니다.",
    en: "An AI reading you purchased earlier. It is shown as saved — nothing is generated now.", ja: "以前ご購入いただいたAIリーディングです。保存された内容をそのまま表示しており、今は生成していません。", "zh-CN": "这是你先前购买过的 AI 解读，按保存的内容原样显示，现在不会重新生成。", "zh-TW": "這是你先前購買過的 AI 解讀，按儲存的內容原樣顯示，現在不會重新生成。",
  },
  reportCtaTitle: { ko: "프리미엄 리포트", en: "Premium Report", ja: "プレミアムレポート", "zh-CN": "高级报告", "zh-TW": "進階報告" },
  reportCtaBody: {
    ko: "지금 보고 계신 계산 결과만 근거로 쓰는 18장 분량의 개인 분석 리포트입니다. 웹에서 읽고 PDF 로 내려받을 수 있습니다.",
    en: "An 18-chapter personal analysis written only from the calculation you are looking at. Read it on the web and download it as a PDF.", ja: "いま見ている計算だけを根拠に書く18章の個人分析です。ウェブで読み、PDFでも保存できます。", "zh-CN": "只依据你眼前这份计算写成的 18 章个人分析。可在网页阅读，也能下载 PDF。", "zh-TW": "只依據你眼前這份計算寫成的 18 章個人分析。可在網頁閱讀，也能下載 PDF。",
  },
  // 🔴 아래는 예전에 컴포넌트 안에서 `locale === "ko" ? A : B` 삼항으로 갈리던 문구다.
  //    삼항은 로케일이 둘일 때만 성립한다 — 다섯이 되면 ko 아닌 전부가 영어로 떨어진다.
  pipelineHeading: { ko: "계산 중", en: "Calculating", ja: "計算中", "zh-CN": "计算中", "zh-TW": "計算中" },
  retry: { ko: "다시 시도", en: "Retry", ja: "もう一度", "zh-CN": "重试", "zh-TW": "重試" },
  bothLayers: { ko: "두 계층이 함께", en: "Both layers", ja: "二つの層がそろって", "zh-CN": "两个层同时", "zh-TW": "兩個層同時" },
  chartFailed: { ko: "차트를 만들지 못했습니다. 잠시 후 '다시 시도'를 눌러 주세요.", en: "We couldn't build the chart. Please press Retry in a moment.", ja: "チャートを作成できませんでした。少し置いて「もう一度」を押してください。", "zh-CN": "无法生成图。请稍后再点「重试」。", "zh-TW": "無法產生圖。請稍後再點「重試」。" },
  bodyGraphAria: { ko: "내 바디그래프", en: "My BodyGraph", ja: "わたしのボディグラフ", "zh-CN": "我的身体图", "zh-TW": "我的身體圖" },
  zoomOut: { ko: "축소", en: "Zoom out", ja: "縮小", "zh-CN": "缩小", "zh-TW": "縮小" },
  zoomIn: { ko: "확대", en: "Zoom in", ja: "拡大", "zh-CN": "放大", "zh-TW": "放大" },
  gateNumbersActiveOnly: { ko: "활성 번호만", en: "Active numbers only", ja: "活性の番号だけ", "zh-CN": "只看启动的编号", "zh-TW": "只看啟動的編號" },
  gateNumbersAll: { ko: "모든 번호", en: "All numbers", ja: "すべての番号", "zh-CN": "所有编号", "zh-TW": "所有編號" },
  composition: { ko: "구성", en: "Composition", ja: "構成", "zh-CN": "构成", "zh-TW": "構成" },
  stageBirthData: { ko: "출생 정보", en: "Birth data", ja: "出生情報", "zh-CN": "出生信息", "zh-TW": "出生資訊" },
  stageTimezone: { ko: "타임존 · UTC 변환", en: "Timezone → UTC", ja: "タイムゾーン → UTC", "zh-CN": "时区 → UTC", "zh-TW": "時區 → UTC" },
  stagePersonality: { ko: "퍼스낼리티 13천체", en: "Personality bodies", ja: "パーソナリティの13天体", "zh-CN": "个性的 13 个天体", "zh-TW": "個性的 13 個天體" },
  stageDesignMoment: { ko: "88° 태양호 역탐색", en: "88° solar arc search", ja: "88°太陽弧の逆探索", "zh-CN": "88° 太阳弧逆推", "zh-TW": "88° 太陽弧逆推" },
  stageDesign: { ko: "디자인 13천체", en: "Design bodies", ja: "デザインの13天体", "zh-CN": "设计的 13 个天体", "zh-TW": "設計的 13 個天體" },
  stageGates: { ko: "26 활성 → 64 게이트", en: "26 activations → 64 gates", ja: "26の活性 → 64ゲート", "zh-CN": "26 个启动 → 64 闸门", "zh-TW": "26 個啟動 → 64 閘門" },
  stageChannels: { ko: "36 채널 완성 판정", en: "36 channels", ja: "36チャネルの完成判定", "zh-CN": "36 通道完整判定", "zh-TW": "36 通道完整判定" },
  stageCenters: { ko: "9 센터 정의", en: "9 centers", ja: "9センターの定義", "zh-CN": "9 个中心的定义", "zh-TW": "9 個中心的定義" },
  reportCtaButton: { ko: "리포트 살펴보기", en: "See the report", ja: "レポートを見る", "zh-CN": "查看报告", "zh-TW": "查看報告" },
} satisfies Record<string, Bilingual>;

export const TYPE_COPY = {
  TYPE_GENERATOR: {
    name: TYPE_NAME.TYPE_GENERATOR,
    summary: {
      ko: "천골이 정의된 삶의 에너지형. 스스로 시작하기보다 다가온 것에 반응할 때 힘이 제대로 쓰입니다.",
      en: "A defined Sacral makes you life force energy. Your power lands when you respond to what shows up.", ja: "仙骨が定義されているので、あなたは生命力そのものです。目の前に現れたものに反応するとき力が乗ります。", "zh-CN": "荐骨已定义，你本身就是生命力。当你回应眼前出现的事物时，力量才落地。", "zh-TW": "薦骨已定義，你本身就是生命力。當你回應眼前出現的事物時，力量才落地。",
    },
  },
  TYPE_MANIFESTING_GENERATOR: {
    name: TYPE_NAME.TYPE_MANIFESTING_GENERATOR,
    summary: {
      ko: "천골이 정의되고 모터가 목까지 이어진 형. 반응한 뒤 곧바로 실행으로 넘어가며, 건너뛰고 되돌아오는 방식이 자연스럽습니다.",
      en: "A defined Sacral with a motor connected to the Throat. You respond and then move fast, skipping steps and circling back.", ja: "仙骨が定義され、モーターがスロートにつながっています。反応してから速く動き、手順を飛ばしては戻ります。", "zh-CN": "荐骨已定义，且有动力中心连到喉咙。你先回应再快速行动，会跳过步骤又绕回来。", "zh-TW": "薦骨已定義，且有動力中心連到喉嚨。你先回應再快速行動，會跳過步驟又繞回來。",
    },
  },
  TYPE_PROJECTOR: {
    name: TYPE_NAME.TYPE_PROJECTOR,
    summary: {
      ko: "천골이 정의되지 않은 안내자형. 초대와 인정을 받았을 때 통찰이 제대로 전달됩니다.",
      en: "An undefined Sacral guide. Your insight lands when it is recognized and invited.", ja: "仙骨が未定義のガイドです。あなたの洞察は、認められ招かれたときに届きます。", "zh-CN": "荐骨未定义的引导者。你的洞见要被看见并受邀请时才会落地。", "zh-TW": "薦骨未定義的引導者。你的洞見要被看見並受邀請時才會落地。",
    },
  },
  TYPE_MANIFESTOR: {
    name: TYPE_NAME.TYPE_MANIFESTOR,
    summary: {
      ko: "모터가 목까지 이어진 개시형. 스스로 시작할 수 있고, 움직이기 전에 알리는 것이 저항을 줄입니다.",
      en: "A motor connected to the Throat. You can initiate, and informing before you move reduces resistance.", ja: "モーターがスロートにつながっています。始動できる人で、動く前に伝えると抵抗が減ります。", "zh-CN": "有动力中心连到喉咙。你能主动发起，行动前先告知会减少阻力。", "zh-TW": "有動力中心連到喉嚨。你能主動發起，行動前先告知會減少阻力。",
    },
  },
  TYPE_REFLECTOR: {
    name: TYPE_NAME.TYPE_REFLECTOR,
    summary: {
      ko: "정의된 센터가 하나도 없는 형. 주변을 그대로 비추므로 환경 선택이 곧 삶의 질이며, 큰 결정에는 한 달의 시간이 필요합니다.",
      en: "No defined centers. You mirror your surroundings, so environment is everything — and big decisions need a lunar cycle.", ja: "定義されたセンターがありません。周りを映すので環境がすべてで、大きな決断には月の周期が要ります。", "zh-CN": "没有已定义的中心。你会映照周围，因此环境就是一切 — 重大决定需要一个月亮周期。", "zh-TW": "沒有已定義的中心。你會映照周圍，因此環境就是一切 — 重大決定需要一個月亮週期。",
    },
  },
} as const;

export const STRATEGY_COPY = STRATEGY_NAME;

export const AUTHORITY_COPY = {
  AUTHORITY_EMOTIONAL: {
    name: AUTHORITY_NAME.AUTHORITY_EMOTIONAL,
    summary: {
      ko: "감정에는 파동이 있어 즉답에 진실이 없습니다. 시간을 두고 파동을 지나 보낸 뒤 결정합니다.",
      en: "Emotions move in a wave, so there is no truth in the moment. Decide after the wave has passed.", ja: "感情は波で動くので、その瞬間に真実はありません。波が過ぎてから決めてください。", "zh-CN": "情绪像波浪起伏，当下没有真相。等波过去了再决定。", "zh-TW": "情緒像波浪起伏，當下沒有真相。等波過去了再決定。",
    },
  },
  AUTHORITY_SACRAL: {
    name: AUTHORITY_NAME.AUTHORITY_SACRAL,
    summary: {
      ko: "머리가 아니라 몸이 먼저 답합니다. 그 자리에서 올라오는 끌림과 밀어냄이 판단의 기준입니다.",
      en: "The body answers before the mind. The in-the-moment yes or no is your compass.", ja: "頭より先に体が答えます。その場のイエスかノーが羅針盤です。", "zh-CN": "身体比头脑先回答。当下的是或否就是你的指南针。", "zh-TW": "身體比頭腦先回答。當下的是或否就是你的指南針。",
    },
  },
  AUTHORITY_SPLENIC: {
    name: AUTHORITY_NAME.AUTHORITY_SPLENIC,
    summary: {
      ko: "한 번만 조용히 오는 직감입니다. 반복되지 않으므로 지나가면 다시 오지 않습니다.",
      en: "A quiet instant knowing that speaks once. It does not repeat itself.", ja: "静かに一度だけ告げる直感です。二度は繰り返しません。", "zh-CN": "安静而瞬间的知晓，只说一次，不会重复。", "zh-TW": "安靜而瞬間的知曉，只說一次，不會重複。",
    },
  },
  AUTHORITY_EGO: {
    name: AUTHORITY_NAME.AUTHORITY_EGO,
    summary: {
      ko: "내가 정말 원하는가, 그리고 그것을 감당할 의지가 있는가가 기준입니다.",
      en: "What do I actually want, and do I have the will to back it?", ja: "自分は本当に何を望んでいて、それを支える意志があるか。", "zh-CN": "我真正想要的是什么，我有没有意志去支撑它？", "zh-TW": "我真正想要的是什麼，我有沒有意志去支撐它？",
    },
  },
  AUTHORITY_SELF_PROJECTED: {
    name: AUTHORITY_NAME.AUTHORITY_SELF_PROJECTED,
    summary: {
      ko: "소리 내어 말할 때 방향이 드러납니다. 신뢰하는 사람에게 말하되 조언이 아니라 내 목소리를 듣습니다.",
      en: "Direction shows up when you speak. Talk it out with someone you trust — and listen to your own voice, not their advice.", ja: "話すことで方向が見えます。信頼できる人に話し、相手の助言ではなく自分の声を聞いてください。", "zh-CN": "说出来方向才会浮现。找信任的人聊，然后听自己的声音，而不是对方的建议。", "zh-TW": "說出來方向才會浮現。找信任的人聊，然後聽自己的聲音，而不是對方的建議。",
    },
  },
  AUTHORITY_MENTAL: {
    name: AUTHORITY_NAME.AUTHORITY_MENTAL,
    summary: {
      ko: "내면의 확답이 아니라 어디에서 누구와 있느냐가 판단을 바꿉니다. 여러 환경에서 말해 보며 정합니다.",
      en: "There is no inner authority to consult — where you are and who you are with changes the answer. Talk it through in different environments.", ja: "内側に尋ねる権威がありません。どこで誰といるかで答えが変わるので、環境を変えながら話してみてください。", "zh-CN": "没有可以询问的内在权威 — 你在哪里、和谁在一起会改变答案。换几个环境把它谈开。", "zh-TW": "沒有可以詢問的內在權威 — 你在哪裡、和誰在一起會改變答案。換幾個環境把它談開。",
    },
  },
  AUTHORITY_LUNAR: {
    name: AUTHORITY_NAME.AUTHORITY_LUNAR,
    summary: {
      ko: "약 29일의 달 주기를 한 바퀴 지나며 같은 사안을 여러 환경에서 겪은 뒤 결정합니다.",
      en: "Let a full lunar cycle (about 29 days) pass, meeting the same question in different environments.", ja: "月の一周期（およそ29日）を、同じ問いを違う環境で受け取りながら過ごしてください。", "zh-CN": "让一个完整的月亮周期（约 29 天）过去，在不同环境里反复遇见同一个问题。", "zh-TW": "讓一個完整的月亮週期（約 29 天）過去，在不同環境裡反覆遇見同一個問題。",
    },
  },
} as const;

export const SIGNATURE_COPY = SIGNATURE_NAME;

export const NOT_SELF_COPY = NOT_SELF_NAME;

export const DEFINITION_COPY = DEFINITION_NAME;

export const CROSS_ANGLE_COPY = CROSS_ANGLE_NAME;

export const CENTER_COPY = {
  HEAD: {
    name: CENTER_NAME.HEAD,
    role: { ko: "영감과 의문의 압력", en: "Pressure of inspiration and questions", ja: "ひらめきと問いの圧力", "zh-CN": "灵感与提问的压力", "zh-TW": "靈感與提問的壓力" },
  },
  AJNA: {
    name: CENTER_NAME.AJNA,
    role: { ko: "개념화와 사고의 방식", en: "Conceptualisation and mental processing", ja: "概念化と思考の処理", "zh-CN": "概念化与思维处理", "zh-TW": "概念化與思維處理" },
  },
  THROAT: {
    name: CENTER_NAME.THROAT,
    role: { ko: "표현과 실행이 나가는 문", en: "Where expression and action come out", ja: "表現と行動が出てくる場所", "zh-CN": "表达与行动的出口", "zh-TW": "表達與行動的出口" },
  },
  G: {
    name: CENTER_NAME.G,
    role: { ko: "정체성과 방향, 사랑", en: "Identity, direction, and love", ja: "アイデンティティ・方向・愛", "zh-CN": "身份、方向与爱", "zh-TW": "身分、方向與愛" },
  },
  HEART: {
    name: CENTER_NAME.HEART,
    role: { ko: "의지와 자기 가치", en: "Willpower and self-worth", ja: "意志力と自己価値", "zh-CN": "意志力与自我价值", "zh-TW": "意志力與自我價值" },
  },
  SOLAR_PLEXUS: {
    name: CENTER_NAME.SOLAR_PLEXUS,
    role: { ko: "감정의 파동과 정서적 인식", en: "Emotional wave and awareness", ja: "感情の波と気づき", "zh-CN": "情绪波动与觉察", "zh-TW": "情緒波動與覺察" },
  },
  SACRAL: {
    name: CENTER_NAME.SACRAL,
    role: { ko: "삶의 에너지와 반응", en: "Life force and response", ja: "生命力と反応", "zh-CN": "生命力与回应", "zh-TW": "生命力與回應" },
  },
  SPLEEN: {
    name: CENTER_NAME.SPLEEN,
    role: { ko: "즉각적 직감과 생존 감각", en: "Instant intuition and survival instinct", ja: "瞬間の直感と生存本能", "zh-CN": "瞬间直觉与生存本能", "zh-TW": "瞬間直覺與生存本能" },
  },
  ROOT: {
    name: CENTER_NAME.ROOT,
    role: { ko: "추진과 스트레스의 압력", en: "Adrenal drive and stress pressure", ja: "アドレナリンの駆動とストレスの圧力", "zh-CN": "肾上腺驱力与压力", "zh-TW": "腎上腺驅力與壓力" },
  },
} as const;

export const PLANET_COPY = {
  Sun: { ...PLANET_NAME.Sun, glyph: "☉" },
  Earth: { ...PLANET_NAME.Earth, glyph: "⊕" },
  Moon: { ...PLANET_NAME.Moon, glyph: "☾" },
  NorthNode: { ...PLANET_NAME.NorthNode, glyph: "☊" },
  SouthNode: { ...PLANET_NAME.SouthNode, glyph: "☋" },
  Mercury: { ...PLANET_NAME.Mercury, glyph: "☿" },
  Venus: { ...PLANET_NAME.Venus, glyph: "♀" },
  Mars: { ...PLANET_NAME.Mars, glyph: "♂" },
  Jupiter: { ...PLANET_NAME.Jupiter, glyph: "♃" },
  Saturn: { ...PLANET_NAME.Saturn, glyph: "♄" },
  Uranus: { ...PLANET_NAME.Uranus, glyph: "♅" },
  Neptune: { ...PLANET_NAME.Neptune, glyph: "♆" },
  Pluto: { ...PLANET_NAME.Pluto, glyph: "♇" },
} as const;

/**
 * 64 게이트의 **주역 괘명**(빌헬름 역 기준).
 *
 * 🔴 휴먼 디자인 고유의 게이트 키노트가 아니다. 그쪽은 출처가 있어야 하는 서술 자료라
 *    지어내지 않았다 — 개인 해석은 같은 결제로 열리는 AI 리딩이 맡는다.
 */
export const GATE_ICHING: Readonly<Record<number, Bilingual>> = Object.freeze({
  1: { ko: "건(乾) · 창조", en: "The Creative", ja: "乾（けん）· 創造", "zh-CN": "乾 · 创造", "zh-TW": "乾 · 創造" },
  2: { ko: "곤(坤) · 수용", en: "The Receptive", ja: "坤（こん）· 受容", "zh-CN": "坤 · 受容", "zh-TW": "坤 · 受容" },
  3: { ko: "둔(屯) · 시작의 어려움", en: "Difficulty at the Beginning", ja: "屯（ちゅん）· 始まりの難しさ", "zh-CN": "屯 · 起始的艰难", "zh-TW": "屯 · 起始的艱難" },
  4: { ko: "몽(蒙) · 어리석음", en: "Youthful Folly", ja: "蒙（もう）· 蒙昧", "zh-CN": "蒙 · 蒙昧", "zh-TW": "蒙 · 蒙昧" },
  5: { ko: "수(需) · 기다림", en: "Waiting", ja: "需（じゅ）· 待つこと", "zh-CN": "需 · 等待", "zh-TW": "需 · 等待" },
  6: { ko: "송(訟) · 다툼", en: "Conflict", ja: "訟（しょう）· 争い", "zh-CN": "讼 · 争讼", "zh-TW": "訟 · 爭訟" },
  7: { ko: "사(師) · 군대", en: "The Army", ja: "師（し）· 軍", "zh-CN": "师 · 军旅", "zh-TW": "師 · 軍旅" },
  8: { ko: "비(比) · 결속", en: "Holding Together", ja: "比（ひ）· 親しみ", "zh-CN": "比 · 亲比", "zh-TW": "比 · 親比" },
  9: { ko: "소축(小畜) · 작은 것의 길들임", en: "The Taming Power of the Small", ja: "小畜（しょうちく）· 小さな蓄え", "zh-CN": "小畜 · 小的蓄养", "zh-TW": "小畜 · 小的蓄養" },
  10: { ko: "이(履) · 이행", en: "Treading", ja: "履（り）· 踏み行う", "zh-CN": "履 · 履行", "zh-TW": "履 · 履行" },
  11: { ko: "태(泰) · 평화", en: "Peace", ja: "泰（たい）· 平安", "zh-CN": "泰 · 通泰", "zh-TW": "泰 · 通泰" },
  12: { ko: "비(否) · 막힘", en: "Standstill", ja: "否（ひ）· 塞がり", "zh-CN": "否 · 闭塞", "zh-TW": "否 · 閉塞" },
  13: { ko: "동인(同人) · 함께하는 사람", en: "Fellowship with Men", ja: "同人（どうじん）· 人と同じくする", "zh-CN": "同人 · 与人同心", "zh-TW": "同人 · 與人同心" },
  14: { ko: "대유(大有) · 큰 소유", en: "Possession in Great Measure", ja: "大有（たいゆう）· 大いに有つ", "zh-CN": "大有 · 大有所成", "zh-TW": "大有 · 大有所成" },
  15: { ko: "겸(謙) · 겸손", en: "Modesty", ja: "謙（けん）· 謙虚", "zh-CN": "谦 · 谦逊", "zh-TW": "謙 · 謙遜" },
  16: { ko: "예(豫) · 열정", en: "Enthusiasm", ja: "豫（よ）· 備えと喜び", "zh-CN": "豫 · 豫备与和乐", "zh-TW": "豫 · 豫備與和樂" },
  17: { ko: "수(隨) · 따름", en: "Following", ja: "隨（ずい）· 随うこと", "zh-CN": "随 · 随从", "zh-TW": "隨 · 隨從" },
  18: { ko: "고(蠱) · 바로잡음", en: "Work on What Has Been Spoiled", ja: "蠱（こ）· 腐りを正す", "zh-CN": "蛊 · 整治积弊", "zh-TW": "蠱 · 整治積弊" },
  19: { ko: "임(臨) · 다가감", en: "Approach", ja: "臨（りん）· 臨むこと", "zh-CN": "临 · 临近", "zh-TW": "臨 · 臨近" },
  20: { ko: "관(觀) · 바라봄", en: "Contemplation", ja: "觀（かん）· 観ること", "zh-CN": "观 · 观照", "zh-TW": "觀 · 觀照" },
  21: { ko: "서합(噬嗑) · 깨물어 뚫음", en: "Biting Through", ja: "噬嗑（ぜいごう）· 噛み合わせ", "zh-CN": "噬嗑 · 咬合决断", "zh-TW": "噬嗑 · 咬合決斷" },
  22: { ko: "비(賁) · 꾸밈", en: "Grace", ja: "賁（ひ）· 飾り", "zh-CN": "贲 · 文饰", "zh-TW": "賁 · 文飾" },
  23: { ko: "박(剝) · 갈라짐", en: "Splitting Apart", ja: "剝（はく）· 剥がれ落ちる", "zh-CN": "剥 · 剥落", "zh-TW": "剝 · 剝落" },
  24: { ko: "복(復) · 돌아옴", en: "Return", ja: "復（ふく）· 還ること", "zh-CN": "复 · 回复", "zh-TW": "復 · 回復" },
  25: { ko: "무망(无妄) · 순수", en: "Innocence", ja: "無妄（むぼう）· 偽りのなさ", "zh-CN": "无妄 · 无妄", "zh-TW": "無妄 · 無妄" },
  26: { ko: "대축(大畜) · 큰 것의 길들임", en: "The Taming Power of the Great", ja: "大畜（たいちく）· 大きな蓄え", "zh-CN": "大畜 · 大的蓄养", "zh-TW": "大畜 · 大的蓄養" },
  27: { ko: "이(頤) · 기름", en: "The Corners of the Mouth", ja: "頤（い）· 養うこと", "zh-CN": "颐 · 颐养", "zh-TW": "頤 · 頤養" },
  28: { ko: "대과(大過) · 큰 지나침", en: "Preponderance of the Great", ja: "大過（たいか）· 大きすぎる", "zh-CN": "大过 · 大的过越", "zh-TW": "大過 · 大的過越" },
  29: { ko: "감(坎) · 거듭된 험난", en: "The Abysmal", ja: "坎（かん）· 重なる険しさ", "zh-CN": "坎 · 重险", "zh-TW": "坎 · 重險" },
  30: { ko: "이(離) · 붙음", en: "The Clinging", ja: "離（り）· 付き従う火", "zh-CN": "离 · 附丽", "zh-TW": "離 · 附麗" },
  31: { ko: "함(咸) · 감응", en: "Influence", ja: "咸（かん）· 感応", "zh-CN": "咸 · 感应", "zh-TW": "咸 · 感應" },
  32: { ko: "항(恆) · 지속", en: "Duration", ja: "恆（こう）· 変わらぬこと", "zh-CN": "恒 · 恒久", "zh-TW": "恆 · 恆久" },
  33: { ko: "둔(遯) · 물러남", en: "Retreat", ja: "遯（とん）· 退くこと", "zh-CN": "遁 · 退避", "zh-TW": "遯 · 退避" },
  34: { ko: "대장(大壯) · 큰 힘", en: "The Power of the Great", ja: "大壯（たいそう）· 大いなる力", "zh-CN": "大壮 · 大的强盛", "zh-TW": "大壯 · 大的強盛" },
  35: { ko: "진(晉) · 나아감", en: "Progress", ja: "晉（しん）· 進むこと", "zh-CN": "晋 · 晋升", "zh-TW": "晉 · 晉升" },
  36: { ko: "명이(明夷) · 빛의 가려짐", en: "Darkening of the Light", ja: "明夷（めいい）· 光の傷つき", "zh-CN": "明夷 · 明入地中", "zh-TW": "明夷 · 明入地中" },
  37: { ko: "가인(家人) · 가족", en: "The Family", ja: "家人（かじん）· 家の人", "zh-CN": "家人 · 家人", "zh-TW": "家人 · 家人" },
  38: { ko: "규(睽) · 어긋남", en: "Opposition", ja: "睽（けい）· 背き合い", "zh-CN": "睽 · 乖违", "zh-TW": "睽 · 乖違" },
  39: { ko: "건(蹇) · 막힘", en: "Obstruction", ja: "蹇（けん）· 行き悩み", "zh-CN": "蹇 · 艰难", "zh-TW": "蹇 · 艱難" },
  40: { ko: "해(解) · 풀림", en: "Deliverance", ja: "解（かい）· 解けること", "zh-CN": "解 · 解除", "zh-TW": "解 · 解除" },
  41: { ko: "손(損) · 덜어냄", en: "Decrease", ja: "損（そん）· 減らすこと", "zh-CN": "损 · 减损", "zh-TW": "損 · 減損" },
  42: { ko: "익(益) · 더함", en: "Increase", ja: "益（えき）· 増すこと", "zh-CN": "益 · 增益", "zh-TW": "益 · 增益" },
  43: { ko: "쾌(夬) · 터놓음", en: "Breakthrough", ja: "夬（かい）· 決断", "zh-CN": "夬 · 决断", "zh-TW": "夬 · 決斷" },
  44: { ko: "구(姤) · 만남", en: "Coming to Meet", ja: "姤（こう）· 思わぬ出会い", "zh-CN": "姤 · 邂逅", "zh-TW": "姤 · 邂逅" },
  45: { ko: "췌(萃) · 모임", en: "Gathering Together", ja: "萃（すい）· 集まり", "zh-CN": "萃 · 聚集", "zh-TW": "萃 · 聚集" },
  46: { ko: "승(升) · 올라감", en: "Pushing Upward", ja: "升（しょう）· 昇ること", "zh-CN": "升 · 上升", "zh-TW": "升 · 上升" },
  47: { ko: "곤(困) · 곤궁", en: "Oppression", ja: "困（こん）· 行き詰まり", "zh-CN": "困 · 困顿", "zh-TW": "困 · 困頓" },
  48: { ko: "정(井) · 우물", en: "The Well", ja: "井（せい）· 井戸", "zh-CN": "井 · 水井", "zh-TW": "井 · 水井" },
  49: { ko: "혁(革) · 바꿈", en: "Revolution", ja: "革（かく）· 改めること", "zh-CN": "革 · 变革", "zh-TW": "革 · 變革" },
  50: { ko: "정(鼎) · 솥", en: "The Cauldron", ja: "鼎（てい）· 鼎", "zh-CN": "鼎 · 鼎新", "zh-TW": "鼎 · 鼎新" },
  51: { ko: "진(震) · 진동", en: "The Arousing", ja: "震（しん）· 震わすこと", "zh-CN": "震 · 震动", "zh-TW": "震 · 震動" },
  52: { ko: "간(艮) · 그침", en: "Keeping Still", ja: "艮（ごん）· 止まること", "zh-CN": "艮 · 止息", "zh-TW": "艮 · 止息" },
  53: { ko: "점(漸) · 점진", en: "Development", ja: "漸（ぜん）· 少しずつ進む", "zh-CN": "渐 · 渐进", "zh-TW": "漸 · 漸進" },
  54: { ko: "귀매(歸妹) · 시집가는 누이", en: "The Marrying Maiden", ja: "歸妹（きまい）· 嫁ぐ少女", "zh-CN": "归妹 · 归妹", "zh-TW": "歸妹 · 歸妹" },
  55: { ko: "풍(豐) · 풍성", en: "Abundance", ja: "豐（ほう）· 豊かさ", "zh-CN": "丰 · 丰盛", "zh-TW": "豐 · 豐盛" },
  56: { ko: "여(旅) · 나그네", en: "The Wanderer", ja: "旅（りょ）· 旅人", "zh-CN": "旅 · 行旅", "zh-TW": "旅 · 行旅" },
  57: { ko: "손(巽) · 스며듦", en: "The Gentle", ja: "巽（そん）· 入り込む風", "zh-CN": "巽 · 顺入", "zh-TW": "巽 · 順入" },
  58: { ko: "태(兌) · 기쁨", en: "The Joyous", ja: "兌（だ）· よろこび", "zh-CN": "兑 · 喜悦", "zh-TW": "兌 · 喜悅" },
  59: { ko: "환(渙) · 흩어짐", en: "Dispersion", ja: "渙（かん）· 散らばること", "zh-CN": "涣 · 涣散", "zh-TW": "渙 · 渙散" },
  60: { ko: "절(節) · 절제", en: "Limitation", ja: "節（せつ）· 節度", "zh-CN": "节 · 节制", "zh-TW": "節 · 節制" },
  61: { ko: "중부(中孚) · 내면의 진실", en: "Inner Truth", ja: "中孚（ちゅうふ）· 内なる誠", "zh-CN": "中孚 · 内心的诚信", "zh-TW": "中孚 · 內心的誠信" },
  62: { ko: "소과(小過) · 작은 지나침", en: "Preponderance of the Small", ja: "小過（しょうか）· 小さな行き過ぎ", "zh-CN": "小过 · 小的过越", "zh-TW": "小過 · 小的過越" },
  63: { ko: "기제(既濟) · 이미 이룸", en: "After Completion", ja: "既濟（きせい）· 既に成ったこと", "zh-CN": "既济 · 已然完成", "zh-TW": "既濟 · 已然完成" },
  64: { ko: "미제(未濟) · 아직 이루지 못함", en: "Before Completion", ja: "未濟（びせい）· 未だ成らぬこと", "zh-CN": "未济 · 尚未完成", "zh-TW": "未濟 · 尚未完成" },
});

export function pick(entry: Bilingual | undefined, locale: Locale): string {
  if (!entry) return "";
  // 🔴 폴백은 en 이다(예전에는 ko 였다). 한국어로 접으면 저작이 빠진 언어에서 한국어가 튀어나온다.
  return entry[locale] || entry.en;
}
