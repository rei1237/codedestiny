import FeatureLandingPage from "../../components/FeatureLandingPage";
import { buildFortuneJsonLd } from "../../../lib/generate-page-metadata";
import { withUniqueRouteMetadata } from "../../../lib/generate-page-metadata";

const HWATU_LIFE_TEXT_TRANSLATIONS = {
  ko: {
    title: "화투 인생 패 테스트",
    description: "7문항 선택으로 나를 상징하는 화투 인생 패 아키타입을 찾고 선택 패턴과 생활 리듬을 가볍게 점검하는 무료 테스트입니다.",
    serviceDescription: "돈·사랑·위기 상황에서의 선택 패턴을 통해 나를 상징하는 화투 인생 패 아키타입을 찾아주는 심리테스트입니다.",
    "value.1.title": "1. 이 테스트는 성격 단정보다 선택 습관을 관찰합니다",
    "value.2.title": "2. 돈·사랑·위기 문항을 분리해서 보면 해석이 선명해집니다",
    "value.3.title": "3. 아키타입은 우열이 아니라 장단점의 묶음입니다",
    "value.4.title": "4. 궁합 활용은 상대 평가보다 협업 규칙 설정이 핵심입니다",
    "value.5.title": "5. 결과를 일상 실험으로 연결하면 체감 가치가 올라갑니다",
    "value.6.title": "6. 반복 측정으로 현재 상태 변화를 읽어보세요",
  },
  en: {
    title: "Hwatu Life Card Test",
    description: "A free test that finds the Hwatu life card archetype symbolizing you through 7 choices and lightly checks your choice patterns and life rhythm.",
    serviceDescription: "A psychology-style test that finds the Hwatu life card archetype symbolizing you through choices in money, love, and crisis situations.",
    "value.1.title": "1. This test observes choice habits rather than defining personality",
    "value.2.title": "2. Money, love, and crisis questions become clearer when separated",
    "value.3.title": "3. Archetypes are bundles of strengths and risks, not rankings",
    "value.4.title": "4. Compatibility is best used to set collaboration rules",
    "value.5.title": "5. Connect the result to a small daily experiment",
    "value.6.title": "6. Repeating the test helps you read changes in your current state",
  },
  ja: {
    title: "花札人生札テスト",
    description: "7問の選択から、あなたを象徴する花札の人生札アーキタイプを見つけ、選択パターンと生活リズムを軽く点検する無料テストです。",
    serviceDescription: "お金、恋愛、危機の場面での選び方から、あなたを象徴する花札の人生札アーキタイプを見つける心理テストです。",
    "value.1.title": "1. このテストは性格を決めつけず、選択の癖を観察します",
    "value.2.title": "2. お金、恋愛、危機の質問を分けて見ると読みが澄みます",
    "value.3.title": "3. アーキタイプは優劣ではなく、長所と注意点の束です",
    "value.4.title": "4. 相性は相手の評価より、協働ルールづくりに使います",
    "value.5.title": "5. 結果を日常の小さな実験につなげると価値が増します",
    "value.6.title": "6. くり返し測ると、今の状態の変化が見えてきます",
  },
  "zh-CN": {
    title: "花札人生牌测试",
    description: "通过7道选择题找出象征你的花札人生牌原型，并轻松检查选择模式与生活节奏的免费测试。",
    serviceDescription: "通过金钱、爱情与危机情境中的选择模式，找出象征你的花札人生牌原型的心理测试。",
    "value.1.title": "1. 这个测试观察选择习惯，而不是判定性格",
    "value.2.title": "2. 分开看金钱、爱情与危机问题，解读会更清楚",
    "value.3.title": "3. 原型不是优劣，而是优点与注意点的组合",
    "value.4.title": "4. 相性用法的核心是设定协作规则",
    "value.5.title": "5. 把结果连接到日常实验，体感价值会提高",
    "value.6.title": "6. 重复测量可以读出当前状态变化",
  },
  "zh-TW": {
    title: "花札人生牌測試",
    description: "透過7道選擇題找出象徵你的花札人生牌原型，並輕鬆檢查選擇模式與生活節奏的免費測試。",
    serviceDescription: "透過金錢、愛情與危機情境中的選擇模式，找出象徵你的花札人生牌原型的心理測試。",
    "value.1.title": "1. 這個測試觀察選擇習慣，而不是判定性格",
    "value.2.title": "2. 分開看金錢、愛情與危機問題，解讀會更清楚",
    "value.3.title": "3. 原型不是優劣，而是優點與注意點的組合",
    "value.4.title": "4. 相性用法的核心是設定協作規則",
    "value.5.title": "5. 把結果連接到日常實驗，體感價值會提高",
    "value.6.title": "6. 重複測量可以讀出當前狀態變化",
  },
} as const;

type HwatuLifeTextKey = keyof typeof HWATU_LIFE_TEXT_TRANSLATIONS.ko;

function hwatuLifeText(key: HwatuLifeTextKey): string {
  return HWATU_LIFE_TEXT_TRANSLATIONS.ko[key] || HWATU_LIFE_TEXT_TRANSLATIONS.en[key] || "Translation pending";
}

const JSON_LD = buildFortuneJsonLd({
  path: "/oracle/hwatu-life",
  title: hwatuLifeText("title"),
  description: hwatuLifeText("description"),
  keywords: ["화투 인생 패", "심리테스트", "아키타입 테스트", "hwatu life test"],
  image: "https://code-destiny.com/fuctionassets/tazza.webp",
  featureList: ["7문항 심리테스트", "화투 인생 패 아키타입", "선택 패턴 분석"],
  applicationCategory: "LifestyleApplication",
});

const SERVICE = {
  h1: hwatuLifeText("title"),
  description: hwatuLifeText("serviceDescription"),
  ogImage: "https://code-destiny.com/fuctionassets/tazza.webp",
  landingPoints: ["7문항 심리테스트", "화투 인생 패 아키타입 파악", "조건별 선택 패턴 분석"],
  seoText:
    "7문항 심리테스트로 삼광·고도리·청단·똑광 아키타입을 찾아드립니다.",
  localized: {
    en: {
      title: "Hwatu Life Card Test",
      h1: "Hwatu Life Card Test",
      description:
        "A psychology-style test that finds the Hwatu life card archetype symbolizing you through choices in money, love, and crisis situations.",
      landingPoints: ["7-question psychology test", "Hwatu life card archetypes", "Choice pattern analysis by situation"],
      seoText:
        "Find your Samgwang, Godori, Cheongdan, or Ttokgwang archetype through a 7-question psychology-style test.",
      valueGuideTitle: "Six Ways to Enjoy the Hwatu Psychology Test with Better Accuracy",
      valueSections: [
        {
          title: "1. This test observes choice habits rather than defining personality",
          body:
            "The Hwatu Life Card Test is designed to show decision patterns through metaphor, not to decide who you are. The same person may choose differently under stress and stability, so the result is best read as a snapshot of your current response tendency rather than a fixed personality diagnosis.",
        },
        {
          title: "2. Money, love, and crisis questions become clearer when separated",
          body:
            "More insight appears when each question area is read separately rather than through one total score. If you are careful in money choices but spontaneous in relationship questions, the real tension may come from decision speed rather than values. Separate reading turns the result into a practical life adjustment strategy.",
        },
        {
          title: "3. Archetypes are bundles of strengths and risks, not rankings",
          body:
            "Results such as Samgwang, Godori, Cheongdan, and Ttokgwang do not mean one type is better. A driving type has execution power but may move too fast; a cautious type avoids loss but may miss timing. The useful question is when this strength helps and when it needs adjustment.",
        },
        {
          title: "4. Compatibility is best used to set collaboration rules",
          body:
            "Using psychology-test compatibility like a relationship verdict can quickly increase conflict. It becomes practical when you turn it into role rules, such as who starts a decision and who reviews it. Different archetypes can clash, but with clear operating rules they may create strong complementary synergy.",
        },
        {
          title: "5. Connect the result to a small daily experiment",
          body:
            "Try one week of experimentation after the test. Wait 30 minutes before spending, ask one question before a conflict conversation, or reconfirm important plans the day before instead of on the same day. Even playful content becomes a self-understanding tool when paired with a routine.",
        },
        {
          title: "6. Repeating the test helps you read changes in your current state",
          body:
            "Psychological state is not fixed; it shifts over time. Taking the same test about once a month under similar conditions can show how stress, relationships, and schedules affect your decisions. Instead of judging change as good or bad, use it to trace how your rhythm moves.",
        },
      ],
    },
    ja: {
      title: "花札人生札テスト",
      h1: "花札人生札テスト",
      description:
        "お金、恋愛、危機の場面での選び方から、あなたを象徴する花札の人生札アーキタイプを見つける心理テストです。",
      landingPoints: ["7問の心理テスト", "花札人生札アーキタイプ", "状況別の選択パターン分析"],
      seoText:
        "7問の心理テストで、三光、ゴドリ、青短、トックァンのような花札アーキタイプを見つけます。",
      valueGuideTitle: "花札心理テストを楽しく正確に読む6つのポイント",
      valueSections: [
        {
          title: "1. このテストは性格を決めつけず、選択の癖を観察します",
          body:
            "花札人生札テストは「私はどんな人か」を固定するためではなく、場面ごとの意思決定パターンを比喩として映すものです。同じ人でも、ストレスのある時と安定している時では選び方が変わります。結果は固定された性格診断ではなく、今の反応傾向を映す一枚として受け取ると自然です。",
        },
        {
          title: "2. お金、恋愛、危機の質問を分けて見ると読みが澄みます",
          body:
            "ひとつの総合点より、領域ごとの反応を分けて見るほうが実用的な気づきが生まれます。お金では慎重なのに関係では直感的に動くなら、実際の摩擦は価値観より意思決定の速さにあるかもしれません。分けて読むほど、結果は生活を整えるヒントになります。",
        },
        {
          title: "3. アーキタイプは優劣ではなく、長所と注意点の束です",
          body:
            "三光、ゴドリ、青短、トックァンのような結果は、どれが上という意味ではありません。推進型は行動力が強い一方で急ぎすぎることがあり、慎重型は損失回避に強い一方でタイミングを逃すことがあります。大切なのは、この強みがいつ役立ち、いつ調整を求めるかを見ることです。",
        },
        {
          title: "4. 相性は相手の評価より、協働ルールづくりに使います",
          body:
            "心理テストの相性を関係の判定表のように使うと、すぐに衝突が大きくなることがあります。代わりに、誰が意思決定を始め、誰が確認を担当するかといった役割の約束に変えると実用的です。違うアーキタイプ同士も、運用ルールがあれば補い合う力になります。",
        },
        {
          title: "5. 結果を日常の小さな実験につなげると価値が増します",
          body:
            "テストのあと、1週間だけ試してみてください。買い物の前に30分待つ、衝突の会話の前に質問をひとつ置く、大切な約束は当日ではなく前日に確認する。楽しいコンテンツも小さな実験を添えると、自己理解の道具としてよく働きます。",
        },
        {
          title: "6. くり返し測ると、今の状態の変化が見えてきます",
          body:
            "心理状態は固定値ではなく、周期的に揺れます。同じ条件で月に一度ほど試すと、最近のストレス、人間関係、予定の変化が意思決定にどう影響しているかが見えます。結果の変化を良し悪しで裁くより、自分のリズムを追うために使うのが健やかです。",
        },
      ],
    },
    "zh-CN": {
      title: "花札人生牌测试",
      h1: "花札人生牌测试",
      description:
        "通过金钱、爱情与危机情境中的选择模式，找出象征你的花札人生牌原型的心理测试。",
      landingPoints: ["7题心理测试", "花札人生牌原型", "按情境分析选择模式"],
      seoText:
        "通过7题心理测试，找到你的三光、五鸟、青短或Ttokgwang原型。",
      valueGuideTitle: "有趣又准确地体验花札心理测试的6个要点",
      valueSections: [
        {
          title: "1. 这个测试观察选择习惯，而不是判定性格",
          body:
            "花札人生牌测试不是为了断定「我是怎样的人」，而是用比喻显示你在不同情境中的决策模式。同一个人在压力状态与稳定状态下也会做出不同选择，因此结果更适合作为当前反应倾向的快照，而不是固定性格诊断。",
        },
        {
          title: "2. 分开看金钱、爱情与危机问题，解读会更清楚",
          body:
            "比起一个总分，分领域阅读会带来更实际的洞察。如果金钱问题上保守，关系问题上却很即兴，真实冲突可能来自决策速度，而不是价值观。领域分离解读，是把结果转化为生活调整策略的最简单方式。",
        },
        {
          title: "3. 原型不是优劣，而是优点与注意点的组合",
          body:
            "三光、五鸟、青短、Ttokgwang等结果并不代表谁更好。推进型执行力强，但可能过快；谨慎型擅长避免损失，但可能错过时机。重要的是看见这种强项何时有帮助，何时需要调节。",
        },
        {
          title: "4. 相性用法的核心是设定协作规则",
          body:
            "把心理测试相性当成关系判定表，很容易扩大冲突。把它转化为「谁先开始决策、谁负责复核」之类的角色规则，会更实用。不同原型组合可能冲突，但有运作规则时，也能形成很强的互补。",
        },
        {
          title: "5. 把结果连接到日常实验，体感价值会提高",
          body:
            "测试后只试一周也可以。消费前等待30分钟、冲突对话前先问一个问题、重要约定从当天确认改为前一天再确认。即使是轻松内容，只要加上实验流程，也足以成为自我理解工具。",
        },
        {
          title: "6. 重复测量可以读出当前状态变化",
          body:
            "心理状态不是固定值，而是会周期性变化。每月在相同条件下重测一次，可以看见近期压力、关系与日程变化如何影响决策。不要把结果变化判断为好坏，而是把它用来追踪自己的节奏。",
        },
      ],
    },
    "zh-TW": {
      title: "花札人生牌測試",
      h1: "花札人生牌測試",
      description:
        "透過金錢、愛情與危機情境中的選擇模式，找出象徵你的花札人生牌原型的心理測試。",
      landingPoints: ["7題心理測試", "花札人生牌原型", "按情境分析選擇模式"],
      seoText:
        "透過7題心理測試，找到你的三光、五鳥、青短或Ttokgwang原型。",
      valueGuideTitle: "有趣又準確地體驗花札心理測試的6個要點",
      valueSections: [
        {
          title: "1. 這個測試觀察選擇習慣，而不是判定性格",
          body:
            "花札人生牌測試不是為了斷定「我是怎樣的人」，而是用比喻顯示你在不同情境中的決策模式。同一個人在壓力狀態與穩定狀態下也會做出不同選擇，因此結果更適合作為當前反應傾向的快照，而不是固定性格診斷。",
        },
        {
          title: "2. 分開看金錢、愛情與危機問題，解讀會更清楚",
          body:
            "比起一個總分，分領域閱讀會帶來更實際的洞察。如果金錢問題上保守，關係問題上卻很即興，真實衝突可能來自決策速度，而不是價值觀。領域分離解讀，是把結果轉化為生活調整策略的最簡單方式。",
        },
        {
          title: "3. 原型不是優劣，而是優點與注意點的組合",
          body:
            "三光、五鳥、青短、Ttokgwang等結果並不代表誰更好。推進型執行力強，但可能過快；謹慎型擅長避免損失，但可能錯過時機。重要的是看見這種強項何時有幫助，何時需要調節。",
        },
        {
          title: "4. 相性用法的核心是設定協作規則",
          body:
            "把心理測試相性當成關係判定表，很容易擴大衝突。把它轉化為「誰先開始決策、誰負責複核」之類的角色規則，會更實用。不同原型組合可能衝突，但有運作規則時，也能形成很強的互補。",
        },
        {
          title: "5. 把結果連接到日常實驗，體感價值會提高",
          body:
            "測試後只試一週也可以。消費前等待30分鐘、衝突對話前先問一個問題、重要約定從當天確認改為前一天再確認。即使是輕鬆內容，只要加上實驗流程，也足以成為自我理解工具。",
        },
        {
          title: "6. 重複測量可以讀出當前狀態變化",
          body:
            "心理狀態不是固定值，而是會週期性變化。每月在相同條件下重測一次，可以看見近期壓力、關係與日程變化如何影響決策。不要把結果變化判斷為好壞，而是把它用來追蹤自己的節奏。",
        },
      ],
    },
    vi: {
      title: "Bài kiểm tra lá bài đời Hwatu",
      h1: "Bài kiểm tra lá bài đời Hwatu",
      description:
        "Bài kiểm tra phong cách tâm lý tìm archetype lá bài đời Hwatu tượng trưng cho bạn qua lựa chọn trong tiền bạc, tình yêu và khủng hoảng.",
      landingPoints: ["Bài kiểm tra tâm lý 7 câu", "Archetype lá bài đời Hwatu", "Phân tích lựa chọn theo tình huống"],
      seoText:
        "Tìm archetype Samgwang, Godori, Cheongdan hoặc Ttokgwang của bạn qua bài kiểm tra tâm lý 7 câu.",
      valueGuideTitle: "6 điểm để tận hưởng bài kiểm tra tâm lý Hwatu chính xác hơn",
      valueSections: [
        {
          title: "1. Bài kiểm tra này quan sát thói quen chọn lựa, không đóng khung tính cách",
          body:
            "Hwatu Life Card Test không nhằm kết luận bạn là người thế nào, mà dùng ẩn dụ để phản chiếu mô thức quyết định theo tình huống. Cùng một người có thể chọn khác khi căng thẳng và khi ổn định. Vì vậy kết quả nên được xem như ảnh chụp xu hướng phản ứng hiện tại.",
        },
        {
          title: "2. Tách tiền bạc, tình yêu và khủng hoảng để đọc rõ hơn",
          body:
            "Thay vì một tổng điểm, đọc từng lĩnh vực sẽ tạo insight thực tế hơn. Nếu bạn thận trọng ở câu hỏi tiền bạc nhưng bốc đồng ở câu hỏi quan hệ, căng thẳng thật có thể nằm ở tốc độ quyết định. Tách lĩnh vực là cách dễ nhất để biến kết quả thành chiến lược điều chỉnh đời sống.",
        },
        {
          title: "3. Archetype là bó điểm mạnh và rủi ro, không phải thứ hạng",
          body:
            "Samgwang, Godori, Cheongdan hay Ttokgwang không nói ai tốt hơn. Kiểu thúc đẩy có sức hành động nhưng dễ đi quá nhanh; kiểu thận trọng tránh mất mát tốt nhưng có thể lỡ thời điểm. Hãy hỏi khi nào điểm mạnh này giúp bạn và khi nào cần điều chỉnh.",
        },
        {
          title: "4. Dùng độ hợp để đặt quy tắc hợp tác",
          body:
            "Nếu dùng độ hợp tâm lý như bảng phán xét quan hệ, xung đột có thể tăng nhanh. Nó thực tế hơn khi trở thành quy tắc vai trò, như ai bắt đầu quyết định và ai kiểm tra lại. Archetype khác nhau có thể va chạm, nhưng cũng tạo bổ trợ mạnh khi có quy tắc vận hành.",
        },
        {
          title: "5. Nối kết quả với một thử nghiệm hằng ngày",
          body:
            "Sau bài kiểm tra, hãy thử một tuần. Đợi 30 phút trước khi chi tiêu, hỏi một câu trước cuộc trò chuyện xung đột, hoặc xác nhận việc quan trọng từ hôm trước. Nội dung vui cũng trở thành công cụ tự hiểu khi đi cùng một thói quen thử nghiệm.",
        },
        {
          title: "6. Làm lại định kỳ giúp đọc thay đổi trạng thái hiện tại",
          body:
            "Trạng thái tâm lý không cố định; nó thay đổi theo chu kỳ. Làm lại cùng bài test mỗi tháng trong điều kiện tương tự giúp thấy căng thẳng, quan hệ và lịch trình ảnh hưởng quyết định ra sao. Đừng phán xét thay đổi là tốt hay xấu; hãy dùng nó để theo dấu nhịp của bạn.",
        },
      ],
    },
    hi: {
      title: "ह्वातू लाइफ कार्ड टेस्ट",
      h1: "ह्वातू लाइफ कार्ड टेस्ट",
      description:
        "धन, प्रेम और संकट स्थितियों में चुनावों के माध्यम से आपका प्रतीकात्मक Hwatu जीवन कार्ड archetype खोजने वाला मनोवैज्ञानिक शैली का टेस्ट.",
      landingPoints: ["7 प्रश्नों का मनोवैज्ञानिक टेस्ट", "Hwatu जीवन कार्ड archetype", "स्थिति अनुसार चुनाव पैटर्न"],
      seoText:
        "7 प्रश्नों के मनोवैज्ञानिक टेस्ट से अपना Samgwang, Godori, Cheongdan या Ttokgwang archetype खोजें.",
      valueGuideTitle: "Hwatu मनोवैज्ञानिक टेस्ट को अधिक सटीकता से समझने के 6 तरीके",
      valueSections: [
        {
          title: "1. यह टेस्ट व्यक्तित्व तय नहीं, चुनाव आदतें देखता है",
          body:
            "Hwatu Life Card Test यह तय करने के लिए नहीं है कि आप कौन हैं. यह परिस्थितियों के अनुसार निर्णय पैटर्न को रूपक में दिखाता है. वही व्यक्ति तनाव और स्थिरता में अलग चुन सकता है, इसलिए परिणाम को स्थिर व्यक्तित्व निदान नहीं, वर्तमान प्रतिक्रिया प्रवृत्ति का स्नैपशॉट मानें.",
        },
        {
          title: "2. धन, प्रेम और संकट प्रश्न अलग पढ़ें तो अर्थ साफ होता है",
          body:
            "एक कुल अंक से अधिक अंतर्दृष्टि तब आती है जब क्षेत्रों को अलग पढ़ा जाए. यदि धन में आप सावधान हैं और संबंधों में सहज, तो वास्तविक तनाव मूल्यों से अधिक निर्णय गति से आ सकता है. अलग पढ़ना परिणाम को जीवन समायोजन रणनीति में बदलता है.",
        },
        {
          title: "3. Archetype श्रेष्ठता नहीं, ताकत और जोखिम का समूह है",
          body:
            "Samgwang, Godori, Cheongdan और Ttokgwang जैसे परिणाम यह नहीं बताते कि कौन बेहतर है. आगे बढ़ने वाला प्रकार क्रियाशील होता है पर जल्दी कर सकता है; सावधान प्रकार हानि से बचता है पर समय चूक सकता है. पूछें कि यह ताकत कब मदद करती है और कब संतुलन चाहती है.",
        },
        {
          title: "4. संगतता को सहयोग नियम बनाने में उपयोग करें",
          body:
            "मनोवैज्ञानिक टेस्ट संगतता को संबंध निर्णय पत्र की तरह उपयोग करने से संघर्ष बढ़ सकता है. इसे भूमिका नियम में बदलें, जैसे निर्णय कौन शुरू करेगा और समीक्षा कौन करेगा. भिन्न archetype टकरा सकते हैं, पर स्पष्ट संचालन नियम हों तो वे मजबूत पूरक बनते हैं.",
        },
        {
          title: "5. परिणाम को दैनिक प्रयोग से जोड़ें",
          body:
            "टेस्ट के बाद केवल एक सप्ताह प्रयोग करें. खर्च से पहले 30 मिनट प्रतीक्षा, संघर्ष बातचीत से पहले एक प्रश्न, या महत्वपूर्ण वचन को उसी दिन नहीं बल्कि पिछले दिन पुनः पुष्टि करें. हल्की सामग्री भी प्रयोग रूटीन से आत्म-समझ का साधन बनती है.",
        },
        {
          title: "6. दोहराकर मापने से वर्तमान स्थिति का बदलाव पढ़ा जाता है",
          body:
            "मनोवैज्ञानिक स्थिति स्थिर नहीं, समय के साथ बदलती है. समान स्थितियों में महीने में एक बार वही टेस्ट लेने से दिखता है कि तनाव, संबंध और समय-सारणी निर्णय को कैसे प्रभावित करते हैं. बदलाव को अच्छा-बुरा न मानें; अपने रिद्म को देखने के लिए उपयोग करें.",
        },
      ],
    },
    es: {
      title: "Test de carta de vida Hwatu",
      h1: "Test de carta de vida Hwatu",
      description:
        "Un test de estilo psicológico que encuentra el arquetipo de carta de vida Hwatu que te representa a partir de elecciones sobre dinero, amor y crisis.",
      landingPoints: ["Test psicológico de 7 preguntas", "Arquetipos de carta de vida Hwatu", "Análisis de elecciones por situación"],
      seoText:
        "Encuentra tu arquetipo Samgwang, Godori, Cheongdan o Ttokgwang con un test psicológico de 7 preguntas.",
      valueGuideTitle: "6 formas de disfrutar el test psicológico Hwatu con más precisión",
      valueSections: [
        {
          title: "1. El test observa hábitos de elección, no define personalidad",
          body:
            "El Hwatu Life Card Test no decide quién eres; muestra patrones de decisión mediante metáforas. La misma persona puede elegir distinto bajo estrés o estabilidad. Por eso el resultado funciona mejor como una foto de tu tendencia actual, no como diagnóstico fijo.",
        },
        {
          title: "2. Separar dinero, amor y crisis vuelve la lectura más clara",
          body:
            "Hay más insight al leer cada área por separado que al mirar una sola puntuación. Si eres prudente con dinero pero espontáneo en relaciones, la tensión real puede estar en la velocidad de decisión. Separar áreas convierte el resultado en estrategia de ajuste.",
        },
        {
          title: "3. Los arquetipos no son jerarquías, sino fuerzas y riesgos",
          body:
            "Samgwang, Godori, Cheongdan y Ttokgwang no significan que un tipo sea mejor. Un tipo impulsor ejecuta bien pero puede ir demasiado rápido; uno prudente evita pérdidas pero puede perder el momento. La pregunta útil es cuándo ayuda la fuerza y cuándo necesita ajuste.",
        },
        {
          title: "4. Usa la compatibilidad para crear reglas de colaboración",
          body:
            "Usar la compatibilidad como veredicto de relación aumenta conflictos. Es más práctica si se convierte en reglas de roles: quién inicia la decisión y quién revisa. Arquetipos distintos pueden chocar, pero con reglas claras crean una fuerte complementariedad.",
        },
        {
          title: "5. Conecta el resultado con un pequeño experimento diario",
          body:
            "Prueba una semana después del test. Espera 30 minutos antes de gastar, haz una pregunta antes de conversar en conflicto o reconfirma planes importantes el día anterior. El contenido lúdico también se vuelve autoconocimiento cuando se une a una rutina.",
        },
        {
          title: "6. Repetir la medición muestra cambios de estado",
          body:
            "El estado psicológico no es fijo; cambia por ciclos. Repetir el test una vez al mes en condiciones similares muestra cómo estrés, relaciones y agenda afectan decisiones. No juzgues el cambio como bueno o malo; úsalo para seguir tu ritmo.",
        },
      ],
    },
    fr: {
      title: "Test de carte de vie Hwatu",
      h1: "Test de carte de vie Hwatu",
      description:
        "Un test de style psychologique qui trouve l'archétype de carte de vie Hwatu qui vous symbolise à travers vos choix face à l'argent, l'amour et la crise.",
      landingPoints: ["Test psychologique en 7 questions", "Archétypes de carte de vie Hwatu", "Analyse des choix par situation"],
      seoText:
        "Trouvez votre archétype Samgwang, Godori, Cheongdan ou Ttokgwang grâce à un test psychologique en 7 questions.",
      valueGuideTitle: "6 façons de profiter du test psychologique Hwatu avec justesse",
      valueSections: [
        {
          title: "1. Le test observe les habitudes de choix, pas la personnalité",
          body:
            "Le Hwatu Life Card Test ne décide pas qui vous êtes; il montre vos schémas de décision par métaphore. Une même personne peut choisir autrement sous stress ou en stabilité. Le résultat se lit donc comme une image de votre tendance actuelle, non comme un diagnostic fixe.",
        },
        {
          title: "2. Séparer argent, amour et crise rend la lecture plus claire",
          body:
            "Lire chaque domaine séparément donne plus d'insight qu'un score global. Si vous êtes prudent pour l'argent mais spontané en relation, la vraie tension peut venir de la vitesse de décision. Cette séparation transforme le résultat en stratégie d'ajustement.",
        },
        {
          title: "3. Les archétypes ne sont pas des rangs, mais des forces et risques",
          body:
            "Samgwang, Godori, Cheongdan ou Ttokgwang ne signifient pas qu'un type vaut mieux. Le type moteur agit fort mais peut aller trop vite; le type prudent évite les pertes mais peut manquer le moment. La bonne question est quand cette force aide et quand elle demande réglage.",
        },
        {
          title: "4. Utilisez la compatibilité pour poser des règles de collaboration",
          body:
            "Utiliser la compatibilité comme verdict relationnel peut accroître le conflit. Elle devient pratique lorsqu'elle définit des rôles: qui lance la décision et qui vérifie. Des archétypes différents peuvent se heurter, mais des règles claires créent une complémentarité forte.",
        },
        {
          title: "5. Reliez le résultat à une petite expérience quotidienne",
          body:
            "Essayez une semaine après le test. Attendre 30 minutes avant d'acheter, poser une question avant une discussion tendue, ou reconfirmer les rendez-vous importants la veille. Un contenu ludique devient outil de connaissance de soi lorsqu'il s'accompagne d'une routine.",
        },
        {
          title: "6. Répéter la mesure révèle les changements d'état",
          body:
            "L'état psychologique n'est pas fixe; il bouge par cycles. Refaire le test une fois par mois dans des conditions similaires montre comment stress, relations et agenda influencent les décisions. Ne jugez pas le changement; utilisez-le pour suivre votre rythme.",
        },
      ],
    },
    de: {
      title: "Hwatu-Lebenskarten-Test",
      h1: "Hwatu-Lebenskarten-Test",
      description:
        "Ein psychologisch angelegter Test, der über Entscheidungen zu Geld, Liebe und Krisen den Hwatu-Lebenskarten-Archetyp findet, der dich symbolisiert.",
      landingPoints: ["Psychologischer Test mit 7 Fragen", "Hwatu-Lebenskarten-Archetypen", "Analyse von Wahlmustern nach Situation"],
      seoText:
        "Finde deinen Samgwang-, Godori-, Cheongdan- oder Ttokgwang-Archetyp mit einem psychologischen 7-Fragen-Test.",
      valueGuideTitle: "6 Wege, den Hwatu-Psychologietest genauer zu nutzen",
      valueSections: [
        {
          title: "1. Der Test beobachtet Wahlgewohnheiten, nicht Persönlichkeit",
          body:
            "Der Hwatu Life Card Test legt nicht fest, wer du bist. Er zeigt Entscheidungsmuster in Metaphern. Dieselbe Person kann unter Stress anders wählen als in stabilen Phasen. Lies das Ergebnis daher als Momentaufnahme deiner aktuellen Reaktionstendenz.",
        },
        {
          title: "2. Geld, Liebe und Krise getrennt zu lesen macht klarer",
          body:
            "Mehr Einsicht entsteht, wenn Bereiche getrennt gelesen werden statt über eine Gesamtsumme. Wenn du bei Geld vorsichtig und in Beziehungen spontan bist, liegt Spannung vielleicht eher im Entscheidungstempo als in Werten. Getrenntes Lesen macht das Ergebnis praktisch.",
        },
        {
          title: "3. Archetypen sind keine Rangliste, sondern Stärken und Risiken",
          body:
            "Samgwang, Godori, Cheongdan und Ttokgwang bedeuten nicht, dass ein Typ besser ist. Ein antreibender Typ setzt stark um, kann aber zu schnell werden; ein vorsichtiger Typ meidet Verlust, kann aber Timing verpassen. Entscheidend ist, wann die Stärke hilft und wann sie Ausgleich braucht.",
        },
        {
          title: "4. Nutze Kompatibilität für Zusammenarbeitsregeln",
          body:
            "Kompatibilität als Beziehungsurteil zu nutzen kann Konflikte verstärken. Praktischer wird sie als Rollenregel: Wer startet Entscheidungen und wer prüft? Unterschiedliche Archetypen können kollidieren, aber mit klaren Regeln starke Ergänzung schaffen.",
        },
        {
          title: "5. Verbinde das Ergebnis mit einem kleinen Alltagsexperiment",
          body:
            "Teste eine Woche lang etwas Kleines. Warte 30 Minuten vor Ausgaben, stelle vor einem Konfliktgespräch eine Frage oder bestätige wichtige Pläne am Vortag. Spielerischer Inhalt wird mit Routine zu einem Werkzeug für Selbsterkenntnis.",
        },
        {
          title: "6. Wiederholtes Messen zeigt Veränderungen deines Zustands",
          body:
            "Psychische Zustände sind nicht fix; sie verändern sich zyklisch. Wenn du den Test monatlich unter ähnlichen Bedingungen wiederholst, siehst du, wie Stress, Beziehungen und Termine Entscheidungen beeinflussen. Bewerte Veränderungen nicht, sondern nutze sie, um deinen Rhythmus zu verfolgen.",
        },
      ],
    },
    nl: {
      title: "Hwatu levenskaarttest",
      h1: "Hwatu levenskaarttest",
      description:
        "Een psychologische test die via keuzes rond geld, liefde en crisis het Hwatu levenskaart-archetype vindt dat jou symboliseert.",
      landingPoints: ["Psychologische test met 7 vragen", "Hwatu levenskaart-archetypen", "Keuzepatroonanalyse per situatie"],
      seoText:
        "Vind je Samgwang-, Godori-, Cheongdan- of Ttokgwang-archetype met een psychologische test van 7 vragen.",
      valueGuideTitle: "6 manieren om de Hwatu psychologietest nauwkeuriger te gebruiken",
      valueSections: [
        {
          title: "1. De test observeert keuzegewoonten, geen persoonlijkheid",
          body:
            "De Hwatu Life Card Test bepaalt niet wie je bent; hij toont beslispatronen via metaforen. Dezelfde persoon kan onder stress anders kiezen dan in stabiliteit. Lees het resultaat als momentopname van je huidige reactiepatroon, niet als vast diagnoseprofiel.",
        },
        {
          title: "2. Geld, liefde en crisis apart lezen maakt de interpretatie helder",
          body:
            "Meer inzicht ontstaat wanneer je gebieden apart leest in plaats van één totaalscore. Ben je voorzichtig met geld maar spontaan in relaties, dan zit de echte spanning misschien in besluittempo. Apart lezen maakt van het resultaat een praktische aanpassingsstrategie.",
        },
        {
          title: "3. Archetypen zijn geen ranglijst, maar bundels van kracht en risico",
          body:
            "Samgwang, Godori, Cheongdan en Ttokgwang betekenen niet dat één type beter is. Een voortstuwend type handelt sterk maar kan te snel gaan; een voorzichtig type vermijdt verlies maar kan timing missen. Vraag wanneer de kracht helpt en wanneer bijsturing nodig is.",
        },
        {
          title: "4. Gebruik compatibiliteit om samenwerkingsregels te maken",
          body:
            "Compatibiliteit als relatievonnis gebruiken kan conflicten vergroten. Praktischer wordt het als rolregel: wie start beslissingen en wie controleert? Verschillende archetypen kunnen botsen, maar met duidelijke regels ook sterk aanvullen.",
        },
        {
          title: "5. Verbind het resultaat met een klein dagelijks experiment",
          body:
            "Probeer na de test één week iets kleins. Wacht 30 minuten voor een aankoop, stel één vraag voor een conflictgesprek of bevestig belangrijke afspraken de dag ervoor. Speelse content wordt zelfinzicht wanneer er een routine aan vastzit.",
        },
        {
          title: "6. Herhaald meten toont verandering in je huidige staat",
          body:
            "Je psychologische staat is niet vast; hij beweegt in cycli. Doe dezelfde test maandelijks onder vergelijkbare omstandigheden om te zien hoe stress, relaties en agenda beslissingen beïnvloeden. Beoordeel verandering niet als goed of slecht; volg je ritme.",
        },
      ],
    },
    ms: {
      title: "Ujian kad hidup Hwatu",
      h1: "Ujian kad hidup Hwatu",
      description:
        "Ujian gaya psikologi yang mencari archetype kad hidup Hwatu yang melambangkan anda melalui pilihan dalam wang, cinta dan krisis.",
      landingPoints: ["Ujian psikologi 7 soalan", "Archetype kad hidup Hwatu", "Analisis pola pilihan mengikut situasi"],
      seoText:
        "Cari archetype Samgwang, Godori, Cheongdan atau Ttokgwang anda melalui ujian psikologi 7 soalan.",
      valueGuideTitle: "6 cara menikmati ujian psikologi Hwatu dengan lebih tepat",
      valueSections: [
        {
          title: "1. Ujian ini memerhati tabiat pilihan, bukan menentukan personaliti",
          body:
            "Hwatu Life Card Test bukan untuk memutuskan siapa anda. Ia menunjukkan pola keputusan mengikut situasi melalui metafora. Orang yang sama boleh memilih berbeza ketika tertekan dan ketika stabil, jadi keputusan lebih baik dibaca sebagai gambaran kecenderungan semasa.",
        },
        {
          title: "2. Pisahkan wang, cinta dan krisis untuk tafsiran yang lebih jelas",
          body:
            "Lebih banyak wawasan muncul apabila setiap bidang dibaca berasingan, bukan melalui satu skor keseluruhan. Jika anda berhati-hati dalam wang tetapi spontan dalam hubungan, ketegangan sebenar mungkin datang daripada kelajuan membuat keputusan. Bacaan berasingan menukar hasil kepada strategi hidup.",
        },
        {
          title: "3. Archetype ialah gabungan kekuatan dan risiko, bukan kedudukan",
          body:
            "Samgwang, Godori, Cheongdan dan Ttokgwang tidak bermaksud satu jenis lebih baik. Jenis pendorong kuat bertindak tetapi boleh terlalu laju; jenis berhati-hati mengelak kerugian tetapi boleh terlepas masa. Soalan penting ialah bila kekuatan itu membantu dan bila ia perlu dilaraskan.",
        },
        {
          title: "4. Gunakan keserasian untuk menetapkan peraturan kerjasama",
          body:
            "Menggunakan keserasian psikologi sebagai keputusan hubungan boleh membesarkan konflik. Ia lebih praktikal apabila menjadi peraturan peranan: siapa memulakan keputusan dan siapa menyemak. Archetype berbeza boleh bertembung, tetapi dengan aturan jelas ia boleh saling melengkapi.",
        },
        {
          title: "5. Sambungkan keputusan kepada eksperimen harian kecil",
          body:
            "Cuba selama seminggu selepas ujian. Tunggu 30 minit sebelum berbelanja, tanya satu soalan sebelum perbualan konflik atau sahkan janji penting sehari sebelumnya. Kandungan santai juga menjadi alat pemahaman diri apabila disertai rutin eksperimen.",
        },
        {
          title: "6. Pengukuran berulang membantu membaca perubahan keadaan semasa",
          body:
            "Keadaan psikologi bukan nilai tetap; ia berubah mengikut kitaran. Mengambil ujian yang sama sebulan sekali dalam keadaan serupa menunjukkan bagaimana tekanan, hubungan dan jadual mempengaruhi keputusan. Jangan hukum perubahan sebagai baik atau buruk; gunakan untuk menjejak rentak diri.",
        },
      ],
    },
  },
  valueGuideTitle: "화투 심리테스트를 재미있고 정확하게 즐기는 6포인트",
  valueSections: [
    {
      title: hwatuLifeText("value.1.title"),
      body:
        "화투 인생 패 테스트는 \"나는 어떤 사람인가\"를 단정하기보다 상황별 의사결정 패턴을 비유적으로 보여주는 데 목적이 있습니다. 같은 사람도 스트레스 상황과 안정 상황에서 다른 선택을 하기 때문에, 결과는 고정 성격 진단서가 아니라 지금 시점의 반응 경향을 읽는 스냅샷으로 받아들이는 것이 정확합니다.",
    },
    {
      title: hwatuLifeText("value.2.title"),
      body:
        "하나의 총점보다 문항 영역별 반응을 따로 보면 실질적인 통찰이 나옵니다. 돈 문항에서 보수적이고 관계 문항에서 즉흥적이라면, 실제 갈등은 가치관보다 의사결정 속도 차이에서 생길 가능성이 큽니다. 영역 분리 해석은 결과를 생활 조정 전략으로 바꾸는 가장 쉬운 방법입니다.",
    },
    {
      title: hwatuLifeText("value.3.title"),
      body:
        "삼광, 고도리, 청단, 똑광 같은 결과는 누가 더 낫다는 의미가 아닙니다. 추진형은 실행력이 강하지만 과속 위험이 있고, 신중형은 손실 회피에 강하지만 타이밍을 놓칠 수 있습니다. 결과 해석에서 \"내가 틀렸다\"가 아니라 \"언제 이 강점이 도움이 되고 언제 조절이 필요한가\"를 보는 태도가 중요합니다.",
    },
    {
      title: hwatuLifeText("value.4.title"),
      body:
        "심리테스트 궁합을 관계 판정표처럼 쓰면 금방 갈등이 커집니다. 대신 \"누가 의사결정을 시작하고 누가 검토를 맡을지\" 같은 역할 규칙을 만들면 결과가 실용적으로 바뀝니다. 서로 다른 아키타입 조합은 충돌의 원인이 될 수도 있지만, 운영 규칙이 있으면 오히려 높은 보완 시너지를 만들 수 있습니다.",
    },
    {
      title: hwatuLifeText("value.5.title"),
      body:
        "테스트 후 일주일만 실험해 보세요. 소비 결정 전 30분 대기, 갈등 대화 전 질문 1개 먼저 던지기, 중요한 약속은 당일 확정 대신 전날 재확인 같은 작은 습관을 적용하면 결과가 행동으로 전환됩니다. 재미형 콘텐츠도 실험 루틴을 붙이면 자기이해 도구로 충분히 작동합니다.",
    },
    {
      title: hwatuLifeText("value.6.title"),
      body:
        "심리 상태는 고정값이 아니라 주기적으로 변합니다. 같은 테스트를 월 1회 정도 동일한 조건에서 다시 해보면, 최근 스트레스·관계·일정 변화가 의사결정에 어떤 영향을 주는지 확인할 수 있습니다. 결과 변화 자체를 좋고 나쁨으로 판단하기보다 \"내 리듬이 어떻게 움직이는지\"를 추적하는 용도로 쓰는 것이 가장 건강합니다.",
    },
  ],
};

export const metadata = withUniqueRouteMetadata("/oracle/hwatu-life", {
  title: hwatuLifeText("title"),
  description: hwatuLifeText("description"),
});

export default function HwatuLifeLandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <FeatureLandingPage service={SERVICE} />
    </>
  );
}
