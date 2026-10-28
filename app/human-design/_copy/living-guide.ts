/** Original everyday-language commentary, not a diagnostic or a second calculator.
 * Terminology: https://jovianarchive.com/pages/human-design-dictionary
 * https://jovianarchive.com/pages/what-is-human-design
 * Gate/channel facts come from the canonical geometry, never invented keynotes.
 * Shared by React and the generated legacy bundle. No birth data is accepted.
 */
import { CENTER_GATES, centerOfGate } from "../../../lib/human-design/centers.js";
import { CHANNELS } from "../../../lib/human-design/channels.js";
import { CANONICAL_PROFILES } from "../../../lib/human-design/profile.js";
import { TYPE_COPY, AUTHORITY_COPY, CENTER_COPY, DEFINITION_COPY, pick, type Locale } from "./index";

type Words = readonly [string, string, string, string, string];
const locales = ["ko", "en", "ja", "zh-CN", "zh-TW"];
export const say = (words: Words, locale: string) => words[Math.max(0, locales.indexOf(locale))];
export const GUIDE_UI = {
  title: ["나의 사용 설명서", "My operating manual", "わたしの取扱説明書", "我的使用说明书", "我的使用說明書"],
  everyday: ["일상에서는", "In everyday life", "日常では", "日常里", "日常裡"],
  strength: ["잘 쓰면 강점", "A strength to use", "活かせる強み", "可以发挥的优势", "可以發揮的優勢"],
  caution: ["이럴 때 돌아봐요", "A pattern to notice", "振り返るポイント", "值得留意的模式", "值得留意的模式"],
  action: ["오늘의 작은 실험", "A small experiment", "今日の小さな実験", "今天的小实验", "今天的小實驗"],
  question: ["나에게 물어보기", "Ask yourself", "自分への問い", "问问自己", "問問自己"],
  note: ["휴먼 디자인의 상징을 일상에 비춰 보는 해설이에요. 내 경험과 맞는 부분을 골라 읽어 보세요. 건강 상태나 능력의 우열을 판정하지 않아요.", "Reflect on these Human Design symbols alongside your own experience. They do not assess health or rank ability.", "ヒューマンデザインの象徴を自分の経験と照らし合わせる解説です。健康状態や能力の優劣を判断するものではありません。", "把人类图的象征与自己的经验对照阅读，不用于判断健康或能力高低。", "把人類圖的象徵與自己的經驗對照閱讀，不用於判斷健康或能力高低。"],
  profile: ["내가 아는 나 · 경험 속의 나", "The self I know · the self I discover", "自覚する自分・経験の中の自分", "自觉的我 · 经验中的我", "自覺的我 · 經驗中的我"],
  open: ["완전히 열린 센터", "Completely open center", "完全に開いたセンター", "完全开放的中心", "完全開放的中心"],
  undefined: ["미정의 센터", "Undefined center", "未定義のセンター", "未定义的中心", "未定義的中心"],
  defined: ["정의된 센터", "Defined center", "定義されたセンター", "已定义的中心", "已定義的中心"],
  feed: ["피드형", "Feed", "フィード", "动态", "動態"],
  story: ["스토리형", "Story", "ストーリー", "限时动态", "限時動態"],
  save: ["이미지 저장하기", "Save image", "画像を保存", "保存图片", "儲存圖片"],
  share: ["내 설명서 공유하기", "Share my manual", "説明書をシェア", "分享我的说明书", "分享我的說明書"],
  saved: ["이미지를 저장했어요.", "Image saved.", "画像を保存しました。", "图片已保存。", "圖片已儲存。"],
  shared: ["설명서를 공유했어요.", "Manual shared.", "シェアしました。", "已分享说明书。", "已分享說明書。"],
  failed: ["이미지를 준비하지 못했어요. 다시 시도해 주세요.", "Could not prepare the image. Please try again.", "画像を準備できませんでした。もう一度お試しください。", "无法准备图片，请重试。", "無法準備圖片，請重試。"],
  shareQuestion: ["너는 어떤 방식으로 결정해?", "How do you make a decision?", "あなたはどう決める？", "你习惯怎样做决定？", "你習慣怎樣做決定？"],
  privacy: ["별명·타입·프로파일·결정 방식만 담아요. 출생 정보와 전체 차트는 담지 않아요.", "Only your nickname, type, profile and decision style are shared; no birth data or full chart.", "ニックネーム・タイプ・プロファイル・決め方のみ。出生情報と全チャートは含みません。", "仅分享昵称、类型、人生角色和决策方式，不含出生资料与完整图表。", "僅分享暱稱、類型、人生角色和決策方式，不含出生資料與完整圖表。"],
} satisfies Record<string, Words>;

const TYPE: Record<string, {meme: Words; life: Words; caution: Words}> = {
  TYPE_GENERATOR: {
    meme: ["좋아하는 일엔 배터리 추가", "Extra battery for things I love", "好きなことには予備電池", "喜欢的事，自带备用电池", "喜歡的事，自帶備用電池"],
    life: ["재미있는 일을 만나면 손이 먼저 움직이는 쪽으로 읽어요. 일에서는 계속 해보고 싶은 지점을, 관계에서는 의무감 없이 응하고 싶은 제안을 살펴보세요.", "Notice work you want to return to and invitations you welcome without obligation. This type is read through engagement with what shows up.", "仕事ではまた取り組みたい部分を、関係では義務感なく応じたい誘いを観察してみましょう。", "留意工作中想继续投入的部分，以及关系中愿意真心回应的邀请。", "留意工作中想繼續投入的部分，以及關係中願意真心回應的邀請。"],
    caution: ["할 수 있다는 이유만으로 맡다 보면 좋아했던 일도 숙제가 될 수 있어요. 체력이 늘 충분하다는 뜻은 아니에요.", "Saying yes just because you can may turn enjoyment into duty. This is not a promise of unlimited stamina.", "できるからと引き受けすぎると楽しみも義務に。体力が無限という意味ではありません。", "只因做得到就答应，可能把兴趣变成义务。这不代表精力无限。", "只因做得到就答應，可能把興趣變成義務。這不代表精力無限。"]},
  TYPE_MANIFESTING_GENERATOR: {
    meme: ["관심 탭 전환이 빠른 편", "Fast at switching interest tabs", "興味のタブ切替が速い", "兴趣标签切换很快", "興趣分頁切換很快"],
    life: ["반응한 일을 빠르게 시험하며 경로를 조정하는 방식으로 읽어요. 새 업무는 작게 해보고, 관계에서는 바뀐 계획을 한 번 더 설명하면 서로 따라가기 쉬워요.", "Try an appealing task in a small way before adjusting course. Tell others when your plan changes so they can follow your pace.", "気になる仕事は小さく試して調整。予定を変えるときは相手にも伝えてみましょう。", "对感兴趣的任务先小试再调整；计划改变时，也向对方说明。", "對感興趣的任務先小試再調整；計畫改變時，也向對方說明。"],
    caution: ["빨리 넘어가다가 확인 단계를 건너뛰거나 상대를 뒤에 남겨두는 순간을 돌아보세요.", "Notice skipped checks or people left behind when you change direction quickly.", "急いで確認を飛ばしたり、相手を置いていないか振り返って。", "留意转向太快时，是否跳过确认或让对方跟不上。", "留意轉向太快時，是否跳過確認或讓對方跟不上。"]},
  TYPE_PROJECTOR: {
    meme: ["회의보다 판 읽기에 진심", "Reading the room is my meeting", "会議より流れを読む派", "比起开会，更会看局面", "比起開會，更會看局面"],
    life: ["사람과 일의 흐름을 읽고 적절한 지점을 짚는 방식으로 해석해요. 업무에서 관찰한 점을 정리하고, 관계에서는 조언을 듣고 싶은지 먼저 물어보세요.", "Your theme is noticing how people and work fit together. Organize your observations at work and ask whether advice is wanted in a relationship.", "人や仕事の流れを観察するテーマ。気づきを整理し、助言が欲しいか先に聞いてみましょう。", "主题是观察人与工作的配合。整理发现，给建议前先问对方是否需要。", "主題是觀察人與工作的配合。整理發現，給建議前先問對方是否需要。"],
    caution: ["인정받으려고 모든 일을 대신할 필요는 없어요. 초대를 기다린다는 말도 아무것도 하지 말라는 뜻은 아니에요.", "You need not do everyone's work to be recognized. Waiting for an invitation does not mean doing nothing.", "認められるために全部を背負わなくて大丈夫。招待を待つことは何もしないことではありません。", "不必包办一切来换取认可。等待邀请并不是停止行动。", "不必包辦一切來換取認可。等待邀請並不是停止行動。"]},
  TYPE_MANIFESTOR: {
    meme: ["시작 버튼은 내가 누를게", "I'll press the start button", "スタートボタンは押すね", "开始键，我来按", "開始鍵，我來按"],
    life: ["방향을 정해 시작하는 움직임을 살펴보는 타입이에요. 새 일을 열 때나 약속을 바꿀 때, 영향을 받는 사람에게 계획을 먼저 알려 보세요.", "Explore your impulse to start. Before beginning a project or changing a plan, inform the people affected.", "始める力を観察するタイプ。新しい仕事や予定変更は関わる人に先に伝えてみましょう。", "观察自己启动事情的方式。开始项目或改变约定前，先告知受影响的人。", "觀察自己啟動事情的方式。開始專案或改變約定前，先告知受影響的人。"],
    caution: ["설명을 생략하면 상대에게는 갑작스러운 변화로 느껴질 수 있어요. 알리는 것과 허락받는 것은 구분해요.", "Unexplained changes can surprise others. Informing them is different from seeking permission.", "説明のない変化は相手を驚かせるかも。伝えることと許可を求めることは別です。", "省略说明可能让对方措手不及。告知与请求许可是两回事。", "省略說明可能讓對方措手不及。告知與請求許可是兩回事。"]},
  TYPE_REFLECTOR: {
    meme: ["분위기부터 체크하는 사람", "Checking the atmosphere first", "まず空気を確かめる人", "先感受一下氛围", "先感受一下氛圍"],
    life: ["환경과 사람에 따라 달라지는 경험을 관찰하는 방식으로 읽어요. 업무 공간을 바꾸거나 다른 사람과 지낼 때 무엇이 편해지는지 기록해 보세요.", "Observe how places and company change your experience. Keep notes on which work settings and relationships feel comfortable.", "場所や相手で変わる経験を観察。仕事場や人間関係で楽に感じる条件を記録してみましょう。", "观察环境与人如何影响体验，记录哪些工作场所和相处方式让你自在。", "觀察環境與人如何影響體驗，記錄哪些工作場所和相處方式讓你自在。"],
    caution: ["그날의 분위기를 영원한 내 모습으로 정하지 않아요. 다른 타입보다 약하거나 결정 능력이 부족하다는 뜻이 아니에요.", "Today's atmosphere need not define you forever. This type is not weaker or less capable of deciding.", "今日の空気だけで自分を決めないで。弱さや判断力不足を意味しません。", "不要让当天的氛围定义全部的自己，这不代表更弱或缺乏判断力。", "不要讓當天的氛圍定義全部的自己，這不代表更弱或缺乏判斷力。"]},
};

const AUTHORITY: Record<string, Words> = {
  AUTHORITY_EMOTIONAL: ["지금 답장 말고, 마음이 잔잔해진 뒤", "Reply after the emotional wave settles", "気持ちが落ち着いてから返事", "等情绪平稳，再回复", "等情緒平穩，再回覆"],
  AUTHORITY_SACRAL: ["생각 회의 전에, 이 제안이 끌리는지", "Before the mental meeting: does this appeal?", "頭の会議の前に、惹かれる？", "脑内开会前，先问想不想", "腦內開會前，先問想不想"],
  AUTHORITY_SPLENIC: ["첫 느낌을 적고, 현실 정보도 확인", "Note the first impression; check the facts", "最初の感覚をメモ、事実も確認", "记下第一感觉，也核实信息", "記下第一感覺，也核實資訊"],
  AUTHORITY_EGO: ["내가 원하는 것과 약속할 수 있는 것", "What I want, and what I can promise", "望むことと、約束できること", "我想要什么，又能承诺什么", "我想要什麼，又能承諾什麼"],
  AUTHORITY_SELF_PROJECTED: ["말하다 보면 내 방향이 들리는 편", "Hearing my direction as I talk", "話すうちに方向が聞こえる", "说着说着，听见自己的方向", "說著說著，聽見自己的方向"],
  AUTHORITY_MENTAL: ["답을 받기보다 말해보며 정리", "Talk it through, without outsourcing the answer", "答えを任せず、話して整理", "说出来梳理，不把答案交出去", "說出來梳理，不把答案交出去"],
  AUTHORITY_LUNAR: ["중요한 선택은 여러 날의 나와 상의", "Consult several days of yourself", "大きな選択は何日かの自分と相談", "重要决定，和不同日子的自己商量", "重要決定，和不同日子的自己商量"],
};
const AUTHORITY_ACTION: Record<string, Words> = {
  AUTHORITY_EMOTIONAL: ["중요한 제안에는 답할 시간을 정해 두고, 기분이 달라진 뒤에도 같은 선택인지 적어 보세요. 급한 안전 문제까지 미루라는 뜻은 아니에요.", "Agree on a reply time for an important offer, then compare your choice after your mood changes. Do not delay urgent safety decisions.", "大切な提案は返事の時刻を決め、気分が変わっても同じ選択か記録。緊急の安全判断は延期しません。", "重要提议先约定回复时间，情绪变化后再看选择是否一致。紧急安全问题不要拖延。", "重要提議先約定回覆時間，情緒變化後再看選擇是否一致。緊急安全問題不要拖延。"],
  AUTHORITY_SACRAL: ["작은 선택 하나를 예·아니오로 물어보고 처음의 반응을 기록해 보세요. 큰 계약은 조건과 일정까지 확인해요.", "Try a yes/no question for a small choice and note your first response. Review terms and timing for larger commitments.", "小さな選択をはい・いいえで問い、最初の反応を記録。大きな契約は条件も確認します。", "对一个小选择问是或否，记录最初反应；重大承诺仍要确认条件与时间。", "對一個小選擇問是或否，記錄最初反應；重大承諾仍要確認條件與時間。"],
  AUTHORITY_SPLENIC: ["처음 편하거나 어색했던 지점을 짧게 기록해 보세요. 직감은 관찰 자료로 쓰고, 위험이나 건강 판단의 증거로 삼지는 않아요.", "Record what initially felt comfortable or awkward. Treat intuition as an observation, not evidence about danger or health.", "最初に心地よさや違和感を覚えた点を記録。直感を危険や健康の証拠にはしません。", "记录最初舒适或别扭的地方。直觉是观察线索，不是危险或健康判断的证据。", "記錄最初舒適或彆扭的地方。直覺是觀察線索，不是危險或健康判斷的證據。"],
  AUTHORITY_EGO: ["“하고 싶다”와 “이번 주에 감당할 수 있다”를 따로 적고 둘 다 맞는 약속을 골라 보세요.", "Write 'I want this' and 'I can sustain this this week' separately; choose a promise that meets both.", "「したい」と「今週できる」を分けて書き、両方に合う約束を選んでみて。", "分别写下想不想做、这周能否承担，选择两者都合适的承诺。", "分別寫下想不想做、這週能否承擔，選擇兩者都合適的承諾。"],
  AUTHORITY_SELF_PROJECTED: ["믿는 사람에게 선택지를 소리 내어 설명해 보세요. 상대의 답보다 내가 어떤 방향을 편하게 말하는지 들어봐요.", "Describe the options aloud to someone you trust. Listen for the direction you can speak about comfortably, rather than their verdict.", "信頼する人に選択肢を声に出して説明。相手の答えより、自分が自然に語る方向を聞いてみて。", "向信任的人说出选项，听自己谈哪个方向更自在，而非等对方替你决定。", "向信任的人說出選項，聽自己談哪個方向更自在，而非等對方替你決定。"],
  AUTHORITY_MENTAL: ["편한 장소에서 선택지를 말로 풀어 보고, 대화가 끝난 뒤 내가 남기고 싶은 기준 세 가지를 적어요.", "Talk through the options in a comfortable setting, then write three criteria you want to keep after the conversation.", "落ち着く場所で選択肢を話し、会話の後に残したい基準を三つ書きます。", "在舒适的环境里说清选项，谈完后写下自己想保留的三个标准。", "在舒適的環境裡說清選項，談完後寫下自己想保留的三個標準。"],
  AUTHORITY_LUNAR: ["여유 있는 큰 선택은 날짜별 느낌을 기록하며 한 달가량의 변화를 살펴봐요. 일상적인 작은 일이나 긴급한 판단에 같은 대기를 강요하지 않아요.", "For a major non-urgent choice, track impressions over roughly a lunar cycle. Do not impose that wait on small or urgent decisions.", "余裕のある大きな選択は約ひと月の印象を記録。小さな日常や緊急の判断まで待つ必要はありません。", "不紧急的大决定可记录约一个月的感受变化，小事与紧急判断无需同样等待。", "不緊急的大決定可記錄約一個月的感受變化，小事與緊急判斷無需同樣等待。"],
};
const LINES: Record<number, Words> = {
  1: ["근거를 알아야 마음이 놓이는 탐구", "Research that builds a secure foundation", "根拠を知って安心する探究", "先了解依据，才踏实的探索", "先了解依據，才踏實的探索"],
  2: ["혼자 익히다가 불려 나오는 재능", "Private practice and talent others notice", "ひとりで育ち、見つけられる才能", "独处中培养、被人看见的天赋", "獨處中培養、被人看見的天賦"],
  3: ["해보며 수정하는 시행착오", "Learning through trials and adjustments", "試して調整する学び", "在尝试与调整中学习", "在嘗試與調整中學習"],
  4: ["익숙한 관계에서 열리는 기회", "Opportunities through familiar connections", "身近な関係から開く機会", "熟悉关系带来的机会", "熟悉關係帶來的機會"],
  5: ["기대를 받으며 현실 해법을 찾는 역할", "Practical solutions amid others' expectations", "期待を受け、現実的な解決を探す役割", "承接期待、寻找实际解法的角色", "承接期待、尋找實際解法的角色"],
  6: ["경험을 한발 떨어져 돌아보는 시선", "Stepping back to learn from experience", "経験を一歩引いて見つめる視点", "退一步回看经验的视角", "退一步回看經驗的視角"],
};
const PROFILE_BRIDGE: Record<string, Words> = {
  "1/3": ["충분히 알아보고 직접 시험하는 조합이에요. 조사만 계속하기보다 작은 시도를 정하고, 시행착오를 다음 기준으로 남겨 보세요.", "Research meets trial and error. Set a small experiment after studying and let mistakes inform the next attempt.", "調べることと試すことの組合せ。小さな実験を決め、失敗を次の基準に。", "研究与试错结合。了解后安排小尝试，让经验成为下一次的依据。", "研究與試錯結合。了解後安排小嘗試，讓經驗成為下一次的依據。"],
  "1/4": ["탄탄하게 익힌 것을 익숙한 관계에서 나누는 조합이에요. 준비한 내용을 믿는 사람에게 설명하며 필요한 부분을 다듬어 보세요.", "A researched foundation meets familiar connections. Explain what you have learned to someone you trust and refine it together.", "確かな学びと身近なつながり。信頼する人に説明し、必要な部分を整えてみて。", "扎实学习与熟悉关系结合。向信任的人解释所学，再一起调整。", "紮實學習與熟悉關係結合。向信任的人解釋所學，再一起調整。"],
  "2/4": ["혼자 익히는 시간과 사람을 통해 열리는 기회가 함께 있어요. 혼자 쉬는 약속을 지키면서도 반가운 연락 하나에는 응해 보세요.", "Private practice meets opportunities through people. Protect solitude while making room for a welcome connection.", "ひとりの時間と人からの機会。静かな時間を守りつつ、うれしい誘いには余白を。", "独处练习与人际机会并存。保留独处，也为欣然接受的联系留空间。", "獨處練習與人際機會並存。保留獨處，也為欣然接受的聯繫留空間。"],
  "2/5": ["자연스럽게 하는 일에 주변의 큰 기대가 붙는 조합이에요. 잘하는 것과 맡고 싶은 것을 구분해 요청의 범위를 정해 보세요.", "Natural ability meets strong expectations. Separate what you can do from what you want to take on.", "自然な才能に大きな期待が重なる組合せ。できることと引き受けたいことを分けて。", "自然能力可能承接较多期待，区分做得到和愿意承担的事情。", "自然能力可能承接較多期待，區分做得到和願意承擔的事情。"],
  "3/5": ["직접 겪은 경험에서 현실적인 해법을 찾는 조합이에요. 해결사 역할을 맡기 전에 이번에 시험할 것과 책임질 범위를 구분해요.", "Experience becomes practical solutions. Before taking the fixer role, distinguish an experiment from a promise.", "経験から現実的な解決へ。解決役になる前に、試す範囲と責任を分けて。", "从亲身经验寻找实际解法，承担解决者角色前区分试验与承诺。", "從親身經驗尋找實際解法，承擔解決者角色前區分試驗與承諾。"],
  "3/6": ["해보며 배우는 나와 한발 떨어져 돌아보는 나가 함께 있어요. 시도 직후 결론을 내리기보다 경험을 정리할 시간을 남겨요.", "Experimenting meets perspective. Leave time to reflect before making one attempt into a lasting conclusion.", "試す自分と俯瞰する自分。試した直後に結論を固定せず、振り返る時間を。", "尝试与回望并存，别让一次经历立刻成为定论，留出整理时间。", "嘗試與回望並存，別讓一次經歷立刻成為定論，留出整理時間。"],
  "4/6": ["관계를 통한 기회와 경험을 길게 보는 시선이 만나요. 친하다는 이유만으로 결정하지 말고 오래 지키고 싶은 기준도 함께 보세요.", "Connection meets a longer view. Consider enduring values alongside familiarity when an opportunity appears.", "つながりと長い視点。親しさだけで決めず、長く守りたい基準も見て。", "关系机会与长远视角相遇，熟悉之外也看看想长期坚持的标准。", "關係機會與長遠視角相遇，熟悉之外也看看想長期堅持的標準。"],
  "4/1": ["사람과의 연결을 중시하면서 내 기반을 지키려는 조합이에요. 관계를 유지하는 것과 의견을 맞추는 것을 같은 일로 보지 않아도 좋아요.", "Connection meets a firm foundation. Staying connected does not require agreeing on every point.", "つながりと確かな土台。関係を守ることと全てに同意することは別です。", "重视关系也守住自己的基础，维持联系不等于每件事都要同意。", "重視關係也守住自己的基礎，維持聯繫不等於每件事都要同意。"],
  "5/1": ["현실적인 답을 기대받을수록 근거를 확인하고 싶은 조합이에요. 자료가 충분한 부분과 아직 확인 중인 부분을 나눠 설명해요.", "Expectations of practical answers meet research. Separate what is supported from what is still being checked.", "現実的な答えへの期待と探究。根拠のある部分と確認中の部分を分けて伝えます。", "越被期待实际答案，越需要查证。说明哪些有依据、哪些仍在确认。", "越被期待實際答案，越需要查證。說明哪些有依據、哪些仍在確認。"],
  "5/2": ["문제를 해결해 달라는 기대와 혼자 있고 싶은 시간이 함께 있어요. 모든 호출에 응하기보다 내가 선택한 역할을 분명히 해요.", "The call to solve meets the need for solitude. Choose your role instead of answering every request.", "解決への期待とひとりの時間。全ての呼びかけに応じず、自分の役割を選んで。", "解决问题的期待与独处需要并存，不必响应每个请求，选清自己的角色。", "解決問題的期待與獨處需要並存，不必回應每個請求，選清自己的角色。"],
  "6/2": ["경험을 관찰하는 시선과 조용히 익히는 시간이 만나요. 늘 모범을 보여야 한다는 부담 대신 자연스럽게 잘하는 것을 하나 나눠요.", "Perspective meets quiet practice. Share one natural skill without requiring yourself to be an example all the time.", "俯瞰と静かな学び。いつも模範でいようとせず、自然にできることを一つ分けて。", "观察经验与安静练习结合，不必时刻做榜样，分享一项自然擅长的事。", "觀察經驗與安靜練習結合，不必時刻做榜樣，分享一項自然擅長的事。"],
  "6/3": ["큰 흐름을 보고 싶지만 직접 부딪쳐 알아가는 과정도 중요해요. 완성된 모습을 서두르지 말고 이번 경험에서 달라진 기준을 적어요.", "A wider perspective grows through experiments. Record how an experience changes your criteria rather than rushing to be finished.", "大きな視点も実験から育ちます。完成を急がず、経験で変わった基準を記録して。", "长远视角也从尝试中成长，不急着成为完成品，记录经验如何改变标准。", "長遠視角也從嘗試中成長，不急著成為完成品，記錄經驗如何改變標準。"],
};
const CENTER_THEME: Record<string, Words> = {
  HEAD: ["질문은 많은데 오늘 답할 건 하나", "Many questions; one for today", "問いは多くても今日は一つ", "问题很多，今天先答一个", "問題很多，今天先答一個"],
  AJNA: ["내 생각에도 수정 버튼", "My opinions have an edit button", "考えにも編集ボタン", "想法也有修改键", "想法也有修改鍵"],
  THROAT: ["말할 타이밍도 메시지의 일부", "Timing is part of the message", "話すタイミングも言葉の一部", "说话时机也是信息的一部分", "說話時機也是訊息的一部分"],
  G: ["나답다는 느낌의 좌표", "Coordinates for feeling like myself", "自分らしさの座標", "做自己的感觉坐标", "做自己的感覺座標"],
  HEART: ["약속 버튼 누르기 전 용량 확인", "Check capacity before promising", "約束の前に容量確認", "承诺前，先看余量", "承諾前，先看餘量"],
  SOLAR_PLEXUS: ["마음의 날씨는 실시간 업데이트", "Emotional weather updates live", "心の天気は随時更新", "心情天气实时更新", "心情天氣即時更新"],
  SACRAL: ["계속하고 싶은 일 찾기", "Finding what I want to continue", "続けたいことを探す", "找出还想继续的事", "找出還想繼續的事"],
  SPLEEN: ["익숙함과 편안함 구분하기", "Familiar is not always comfortable", "慣れと心地よさを分ける", "分清熟悉与舒适", "分清熟悉與舒適"],
  ROOT: ["급하다는 알림, 전부 긴급은 아님", "Urgent alerts aren't all emergencies", "急ぎの通知も全部が緊急ではない", "催促通知，不全是紧急事项", "催促通知，不全是緊急事項"],
};

const CENTER_ACTION: Record<string, Words> = {
  HEAD: ["떠오른 질문을 모두 해결하려 하지 말고, 오늘 내 선택에 필요한 질문 하나만 남겨 보세요.", "Keep one question relevant to today's choice rather than trying to answer every thought.", "浮かぶ問い全部ではなく、今日の選択に必要な一つを残してみて。", "不必解答所有念头，留下一个与今天选择有关的问题。", "不必解答所有念頭，留下一個與今天選擇有關的問題。"],
  AJNA: ["지금의 판단과 아직 모르는 사실을 두 줄로 나눠 적어요. 생각을 바꾸는 것도 정리의 일부예요.", "Separate your current view from what you do not yet know. Revising a view is part of thinking.", "今の判断とまだ知らない事実を二行に。考え直すことも整理の一部です。", "分两行写下目前判断和未知事实，修改想法也是整理的一部分。", "分兩行寫下目前判斷和未知事實，修改想法也是整理的一部分。"],
  THROAT: ["회의나 대화에서 전하고 싶은 요점을 한 문장으로 적고, 상대가 들을 여유가 있는지 확인해요.", "Write your main point in one sentence and check whether the other person has room to listen.", "伝えたい要点を一文にして、相手に聞く余裕があるか確かめます。", "把重点写成一句话，再确认对方是否有余裕倾听。", "把重點寫成一句話，再確認對方是否有餘裕傾聽。"],
  G: ["나답게 느꼈던 장소와 사람을 하나씩 떠올려요. 역할 이름보다 어떤 환경에서 편했는지 기록해 봐요.", "Recall one place and person around whom you felt yourself. Note the setting rather than fixing an identity label.", "自分らしくいられた場所と人を一つずつ。肩書より心地よかった環境を記録してみて。", "各想一个让你自在的地点和人，记录环境，而不是固定身份标签。", "各想一個讓你自在的地點和人，記錄環境，而不是固定身分標籤。"],
  HEART: ["부탁을 받으면 가능한 범위와 마감부터 말해요. 나를 증명하려고 약속의 크기를 키우지는 않아요.", "State your capacity and deadline when asked for help. A promise need not prove your worth.", "頼まれたらできる範囲と期限を先に伝えます。価値を証明するために約束を大きくしなくて大丈夫。", "收到请求时先说明能承担的范围和期限，不用扩大承诺证明价值。", "收到請求時先說明能承擔的範圍和期限，不用擴大承諾證明價值。"],
  SOLAR_PLEXUS: ["대화 전후의 기분을 각각 적어 보세요. 상대의 감정과 내가 원하는 행동을 분리해 보는 연습이에요.", "Note your mood before and after a conversation. Separate another person's feelings from the action you want to take.", "会話の前後の気分を記録。相手の感情と自分が選びたい行動を分ける練習です。", "记录对话前后的心情，练习把对方的情绪与自己想采取的行动分开。", "記錄對話前後的心情，練習把對方的情緒與自己想採取的行動分開。"],
  SACRAL: ["하던 일을 마친 뒤 더 하고 싶은지, 여기서 멈추고 싶은지 물어요. 멈추는 선택도 활동의 일부로 남겨요.", "After a task, ask whether you want to continue or stop. Stopping belongs in your activity plan too.", "一区切り後、続けたいか止めたいか問いかけます。止めることも活動計画の一部に。", "完成一段任务后问问还想继续还是停下，把停止也放进活动计划。", "完成一段任務後問問還想繼續還是停下，把停止也放進活動計畫。"],
  SPLEEN: ["익숙해서 유지하는 약속과 지금도 편한 약속을 구분해 적어요. 첫 느낌은 참고하되 필요한 사실도 확인해요.", "Distinguish commitments kept from habit from those still comfortable. Note first impressions and check relevant facts.", "慣れで続く約束と今も心地よい約束を分け、最初の感覚と必要な事実を両方見ます。", "区分因习惯维持与现在仍舒适的约定，同时参考最初感受和实际信息。", "區分因習慣維持與現在仍舒適的約定，同時參考最初感受和實際資訊。"],
  ROOT: ["내가 정한 마감과 남이 급하다고 한 일을 나눠요. 가장 급해 보이는 일보다 실제 기한이 가까운 일부터 확인해요.", "Separate your deadlines from other people's urgency. Check actual due dates before reacting to pressure.", "自分の期限と人の急ぎを分け、圧力に反応する前に実際の締切を確かめます。", "把自己的期限与别人的催促分开，先核实真正的截止时间。", "把自己的期限與別人的催促分開，先核實真正的截止時間。"],
};
export type GuideInput = { type: string; authority: string; profile: string; definition: string; definedCenters: string[]; activeGates?: number[]; gates?: number[]; channels: Array<string | {channelId: string}> };
export type GuideSection = { title: string; summary: string; example: string; caution: string; action: string };
export function buildGuide(chart: GuideInput, locale: Locale) {
  const tr = (v: Words) => say(v, locale);
  const type = TYPE[chart.type];
  const authority = AUTHORITY[chart.authority];
  if (!type || !authority) return null;
  const active = chart.activeGates || chart.gates || [];
  const centerName = (id: string) => pick(CENTER_COPY[id as keyof typeof CENTER_COPY]?.name, locale);
  const typeName = pick(TYPE_COPY[chart.type as keyof typeof TYPE_COPY]?.name, locale);
  const action = tr(AUTHORITY_ACTION[chart.authority]);
  const profile = CANONICAL_PROFILES.includes(chart.profile) ? chart.profile : "";
  const profileLines = profile ? profile.split("/").map(Number) : [];
  const centers = Object.entries(CENTER_GATES).map(([id, gates]) => {
    const defined = chart.definedCenters.includes(id);
    const count = (gates as number[]).filter(g => active.includes(g)).length;
    const state = defined ? "defined" : count ? "undefined" : "open";
    const summary = defined
      ? tr(["비교적 일관되게 사용하는 주제로 읽어요. 익숙한 방식이 강점이 되지만 다른 사람도 같은 속도일 거라 기대하지는 않아요.", "A theme read as relatively consistent. Familiarity can help, but others may work at a different pace.", "比較的一貫したテーマ。慣れた方法を活かしつつ、他の人のペースも尊重します。", "被解读为较稳定的主题。熟悉的方法可成为优势，也要尊重他人不同的节奏。", "被解讀為較穩定的主題。熟悉的方法可成為優勢，也要尊重他人不同的節奏。"])
      : state === "open" ? tr(["이 센터에는 활성 게이트가 없어요. 고정된 한 가지 반응보다 환경마다 달라지는 경험을 관찰하는 주제로 읽어요. 비어 있거나 부족하다는 뜻은 아니에요.", "No gates are active here. Observe experiences across settings rather than assuming one fixed response; this is not a deficiency.", "活性ゲートがないセンター。場面ごとに変わる経験を観察するテーマで、不足ではありません。", "此中心没有激活闸门，可观察不同环境下的体验，并不意味着缺陷。", "此中心沒有啟動閘門，可觀察不同環境下的體驗，並不意味著缺陷。"])
      : tr(["활성 게이트는 있지만 센터를 정의하는 채널은 없어요. 익숙한 관심과 주변에서 받은 자극을 구분해 보는 주제예요. 타인의 영향을 곧 내 정체성으로 정하지 않아요.", "There are active gates, but no channel defining this center. Distinguish familiar interests from surrounding influences without turning every influence into an identity.", "活性ゲートはありますがセンターを定義するチャネルはありません。慣れた関心と周囲の影響を分けて観察します。", "有激活闸门，但没有定义此中心的通道。区分熟悉的关注与周围影响。", "有啟動閘門，但沒有定義此中心的通道。區分熟悉的關注與周圍影響。"]);
    return {id, name: centerName(id), state, label: tr(GUIDE_UI[state]), meme: tr(CENTER_THEME[id]), summary, action: tr(CENTER_ACTION[id]),
      role: pick(CENTER_COPY[id as keyof typeof CENTER_COPY]?.role, locale),
      question: tr(["혼자 있을 때와 사람들과 지낼 때, 이 주제를 대하는 방식이 어떻게 달랐나요?", "How did this theme feel alone versus around other people?", "ひとりの時と人といる時、このテーマはどう違いましたか？", "独处和与人相处时，这个主题的体验有何不同？", "獨處和與人相處時，這個主題的體驗有何不同？"])};
  });
  const question = tr(["최근 편하게 응한 일과 억지로 맡은 일은 무엇이 달랐나요?", "What differed between a willing yes and an obligation recently?", "最近、自然に応じたことと無理に引き受けたことはどう違いましたか？", "最近欣然答应和勉强接下的事情，有何不同？", "最近欣然答應和勉強接下的事情，有何不同？"]);
  return {
    ui: Object.fromEntries(Object.entries(GUIDE_UI).map(([k, v]) => [k, tr(v)])),
    nickname: tr(type.meme), typeName, decision: tr(authority), profile, profileBridge: profile ? tr(PROFILE_BRIDGE[profile]) : '',
    type: {title: typeName, summary: pick(TYPE_COPY[chart.type as keyof typeof TYPE_COPY]?.summary, locale), example: tr(type.life), caution: tr(type.caution), action: question},
    authority: {title: pick(AUTHORITY_COPY[chart.authority as keyof typeof AUTHORITY_COPY]?.name, locale), summary: pick(AUTHORITY_COPY[chart.authority as keyof typeof AUTHORITY_COPY]?.summary, locale), example: tr(authority), caution: tr(GUIDE_UI.note), action},
    profileText: profileLines.map((n, i) => `${i === 0 ? tr(["의식적으로 익숙한 역할", "Conscious role", "自覚する役割", "自觉的角色", "自覺的角色"]) : tr(["경험 속에서 발견하는 역할", "Role discovered through experience", "経験で気づく役割", "经验中发现的角色", "經驗中發現的角色"])} ${n} · ${tr(LINES[n])}`),
    profileQuestion: tr(["두 모습 중 일할 때 자주 나오는 쪽과 가까운 관계에서 나오는 쪽을 각각 떠올려 보세요. 어느 하나만 내 모습으로 고정하지 않아도 좋아요.", "Notice which role appears at work and which in close relationships; neither needs to be your only identity.", "仕事と親しい関係で現れる役割を振り返って。どちらか一つに自分を固定しなくて大丈夫。", "观察工作和亲密关系中分别出现的角色，不必只用一面定义自己。", "觀察工作和親密關係中分別出現的角色，不必只用一面定義自己。"]),
    definition: pick(DEFINITION_COPY[chart.definition as keyof typeof DEFINITION_COPY], locale),
    definitionText: tr(["정의는 센터들이 연결된 묶음을 설명해요. 한 묶음인지 여러 묶음인지 관찰하되, 나뉘어 있다고 불완전하거나 누군가가 나를 완성해야 한다는 뜻은 아니에요.", "Definition describes connected groups of centers. Multiple groups do not mean you are incomplete or need another person to complete you.", "定義はセンターのつながりのまとまり。分かれていても不完全さを意味しません。", "定义描述中心连接形成的组群，分开并不代表不完整或需要别人补全。", "定義描述中心連接形成的組群，分開並不代表不完整或需要別人補全。"]),
    themeQuestion: tr(["만족·성공·평온·놀라움 같은 경험은 언제 있었나요? 답답함이나 불편함은 실패 판정이 아니라 상황과 경계를 살펴볼 질문으로 남겨요.", "When did you feel satisfaction, success, peace or surprise? Discomfort is a prompt to examine circumstances and boundaries, not a failure score.", "満足・成功・平穏・驚きはいつ感じましたか？不快感は失敗判定ではなく、状況を振り返る問いに。", "何时感到满足、成功、平和或惊喜？不适可用来反思处境和边界，不是失败评分。", "何時感到滿足、成功、平和或驚喜？不適可用來反思處境和邊界，不是失敗評分。"]),
    centers,
  };
}

/** Explain the actual selected connection; never substitute an invented gate meaning. */
export function connectionGuide(chart: GuideInput, selection: {kind: string; gate?: number; channelId?: string}, locale: Locale) {
  const tr = (v: Words) => say(v, locale);
  const active = chart.activeGates || chart.gates || [];
  const ids = chart.channels.map(c => typeof c === "string" ? c : c.channelId);
  const rows = selection.kind === "gate" ? CHANNELS.filter(c => c.gateA === selection.gate || c.gateB === selection.gate) : CHANNELS.filter(c => c.channelId === selection.channelId);
  const center = selection.gate ? centerOfGate(selection.gate) : null;
  return {intro: center ? pick(CENTER_COPY[center as keyof typeof CENTER_COPY]?.role, locale) : "", lines: rows.map(c => {
    const a = pick(CENTER_COPY[c.centerA as keyof typeof CENTER_COPY]?.role, locale);
    const b = pick(CENTER_COPY[c.centerB as keyof typeof CENTER_COPY]?.role, locale);
    const state = ids.includes(c.channelId)
      ? tr(["양쪽 게이트가 활성화된 연결이에요.", "Both ends are active.", "両端のゲートが活性化しています。", "两端闸门均已激活。", "兩端閘門均已啟動。"])
      : tr(["한쪽의 관심을 완성된 채널의 성향으로 단정하지 않아요.", "An active end alone is not a completed channel.", "片側の活性だけで完成チャネルとは読みません。", "单端激活不等于完整通道。", "單端啟動不等於完整通道。"]);
    return `${c.channelId} · ${a} ↔ ${b}. ${state}`;
  }), action: selection.gate && !active.includes(selection.gate) ? tr(["이 게이트는 현재 차트에서 활성화되어 있지 않아요.", "This gate is not active in this chart.", "このゲートはこのチャートでは未活性です。", "此闸门在当前图表中未激活。", "此閘門在目前圖表中未啟動。"])
    : tr(["최근 대화나 업무에서 연결된 두 주제가 함께 드러난 순간을 떠올려 보세요. 이것은 센터 역할을 연결한 관찰 질문이며, 게이트 고유 의미를 대신하는 예언이 아니에요.", "Recall a conversation or task where these two center themes appeared together. This is a reflection on their roles, not a prediction or a substitute for a gate's own meaning.", "会話や仕事で二つのテーマが一緒に現れた場面を振り返って。センターの役割をつなぐ問いで、予言ではありません。", "回想对话或工作中两个中心主题同时出现的时刻。这是观察提问，不是预言或闸门专属含义。", "回想對話或工作中兩個中心主題同時出現的時刻。這是觀察提問，不是預言或閘門專屬含義。"])};
}
