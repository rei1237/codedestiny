import FeatureLandingPage from "../../components/FeatureLandingPage";
import { buildFortuneJsonLd, generatePageMetadata } from "../../../lib/generate-page-metadata";

const DREAM_TAROT_TEXT_TRANSLATIONS = {
  ko: {
    "meta.title": "드림 타로 - 꿈의 잔향을 전문가 상담 문장으로 봉인",
    "meta.description": "꿈속 장면과 깨어난 뒤의 감정이 세 장의 상징 카드에 머물며, AI에게 건넬 상담 문장으로 고요히 봉인됩니다.",
    "service.h1": "드림 타로",
    "service.seoText": "드림 타로는 꿈속 사건, 감정, 반복 상징을 카드의 언어로 모아 지금 마음이 붙잡은 신호와 AI에게 건넬 질문을 봉인합니다.",
    "valueGuide.title": "꿈의 잔향을 전문가 상담 문장으로 봉인하는 6단계",
    "value.1.title": "1. 꿈해몽은 길흉 예언보다 감정 신호 해석입니다",
    "value.2.title": "2. 상징은 사전 뜻보다 개인 맥락이 우선입니다",
    "value.3.title": "3. 반복 꿈은 해결되지 않은 과제를 가리키는 경우가 많습니다",
    "value.4.title": "4. 해석 결과는 다음 48시간 행동으로 연결하세요",
    "value.5.title": "5. 관계 꿈은 상대 판정보다 내 욕구 언어를 읽는 데 쓰세요",
    "value.6.title": "6. 주간 꿈 로그를 만들면 패턴이 보입니다",
  },
  en: {
    "meta.title": "Dream Tarot - Sealing Dream Echoes into AI Consultation Questions",
    "meta.description": "Scenes from your dream and the emotions that remain after waking settle into three symbolic cards, becoming quiet consultation questions to offer to AI.",
    "service.h1": "Dream Tarot",
    "service.seoText": "Dream Tarot gathers events, emotions, and repeated symbols from a dream into card language, sealing the signals your heart is holding and the question to ask AI.",
    "valueGuide.title": "Six Steps to Seal Dream Echoes into AI Consultation Questions",
    "value.1.title": "1. Dream interpretation is emotional signal reading, not fortune prediction",
    "value.2.title": "2. Personal context matters more than dictionary meanings",
    "value.3.title": "3. Repeating dreams often point to unresolved tasks",
    "value.4.title": "4. Turn the reading into action within 48 hours",
    "value.5.title": "5. Use relationship dreams to read your needs, not judge others",
    "value.6.title": "6. A weekly dream log reveals patterns",
  },
};

function dreamTarotText(key: keyof typeof DREAM_TAROT_TEXT_TRANSLATIONS.ko) {
  return DREAM_TAROT_TEXT_TRANSLATIONS.ko[key] || DREAM_TAROT_TEXT_TRANSLATIONS.en[key] || "Translation pending";
}

const META = {
  path: "/dream/tarot",
  title: dreamTarotText("meta.title"),
  description: dreamTarotText("meta.description"),
  keywords: ["꿈해몽", "드림 타로", "드림 프롬프트", "꿈 타로", "꿈 상징", "dream tarot", "무의식"],
  image: "https://code-destiny.com/fuctionassets/heamong.webp",
  featureList: ["꿈 장면 정리", "깨어난 뒤 감정의 잔향", "AI에게 건넬 질문"],
  applicationCategory: "LifestyleApplication",
} as const;

export function generateMetadata() {
  // 2026-08-17 에 부모 `/dream` 이 색인에서 빠지면서 유일한 인바운드 링크가 끊겨 함께 뺐던
  // 라우트다. 2026-08-20 에 `/dream` 이 본문 보강과 함께 색인으로 돌아와 전제가 사라졌으므로
  // noindex 를 걷었다. 사이트맵 등재는 scripts/generate-sitemap.mjs 의 coreRoutes 가 맡는다.
  return generatePageMetadata(META);
}

const JSON_LD = buildFortuneJsonLd(META);

const SERVICE = {
  h1: dreamTarotText("service.h1"),
  description: META.description,
  ogImage: META.image,
  landingPoints: [...META.featureList],
  seoText: dreamTarotText("service.seoText"),
  localized: {
    en: {
      title: "Dream Tarot - Sealing Dream Echoes into AI Consultation Questions",
      h1: "Dream Tarot",
      description:
        "Scenes from your dream and the emotions that remain after waking settle into three symbolic cards, becoming quiet consultation questions to offer to AI.",
      landingPoints: ["Organize dream scenes", "Trace the emotion after waking", "Questions to offer to AI"],
      seoText:
        "Dream Tarot gathers events, emotions, and repeated symbols from a dream into card language, sealing the signals your heart is holding and the question to ask AI.",
      valueGuideTitle: "Six Steps to Seal Dream Echoes into AI Consultation Questions",
      valueSections: [
        {
          title: "1. Dream interpretation is emotional signal reading, not fortune prediction",
          body:
            "Dreams often appear as compressed forms of recent emotion and stress, rather than fixed messages about the future. Recording the feeling inside the dream and the afterglow upon waking makes the symbol clearer. The heart of dream reading is using it as self-observation, not as a tool for amplifying anxiety.",
        },
        {
          title: "2. Personal context matters more than dictionary meanings",
          body:
            "Symbols such as water, stairs, or animals have common meanings, but personal experience can change them completely. Water may mean rest to one person and fear of losing control to another. The most practical approach is to layer your recent life events over shared symbol meanings.",
        },
        {
          title: "3. Repeated dreams often point to unfinished tasks",
          body:
            "When the same kind of dream returns, it may be worth checking whether an unresolved task remains. A delayed relationship conversation, overloaded schedule, or unfinished decision can appear through repetition. The value of dream interpretation lies less in the symbol itself and more in clarifying the real-life task beneath it.",
        },
        {
          title: "4. Connect the reading to one action within the next 48 hours",
          body:
            "Even a beautiful interpretation fades quickly if it does not become action. If a boundary signal is strong, reduce your schedule; if a relationship signal is strong, try one confirming conversation. Translating the dream into one small action within 48 hours makes the reading useful for real decisions.",
        },
        {
          title: "5. Relationship dreams should reveal your needs, not judge the other person",
          body:
            "When a dream involves romance or family, treating it as proof of another person's intention can create misunderstanding. It is healthier to ask what kind of safety, respect, or distance you need. A dream becomes useful when it prepares you to express your needs clearly.",
        },
        {
          title: "6. A weekly dream log reveals patterns",
          body:
            "Writing down the dream content, emotional intensity, and next-day condition can reveal patterns within two or three weeks. You may notice nightmares before specific tasks or repeated symbols after a relationship issue. Dream interpretation becomes clearer as your own inner language accumulates in records.",
        },
      ],
    },
    ja: {
      title: "ドリームタロット - 夢の余韻をAI相談文に封じる",
      h1: "ドリームタロット",
      description:
        "夢の中の場面と目覚めたあとの感情が三枚の象徴カードに宿り、AIへ手渡すための静かな相談文として封じられます。",
      landingPoints: ["夢の場面を整理", "目覚めた後に残る感情の余韻", "AIへ手渡す質問"],
      seoText:
        "ドリームタロットは、夢の出来事、感情、くり返す象徴をカードの言葉に集め、今の心が抱えているサインとAIへ渡す質問をそっと封じます。",
      valueGuideTitle: "夢の余韻をAI相談文へ封じる6つのステップ",
      valueSections: [
        {
          title: "1. 夢占いは吉凶の予言より、感情のサインを読むものです",
          body:
            "夢は未来を断定するメッセージというより、最近の感情やストレスが圧縮されてあらわれることが多いものです。場面そのものより、夢の中で感じたこと、目覚めたあとに残った余韻を先に書き留めると、象徴の輪郭が澄んできます。夢占いは不安を増やすためではなく、自分の心を観察するために使うと健やかです。",
        },
        {
          title: "2. 象徴は辞書の意味より、あなたの文脈が大切です",
          body:
            "水、階段、動物のような象徴には一般的な意味がありますが、個人の経験によって響きは大きく変わります。水が誰かにとっては休息でも、別の人にはコントロールを失う不安を示すことがあります。共通の象徴解釈に、最近の出来事を重ねて読む二段階の見方がいちばん実用的です。",
        },
        {
          title: "3. くり返す夢は、終わっていない課題を指すことがあります",
          body:
            "同じ種類の夢が何度も戻ってくるなら、まだ片づいていない課題が残っていないか見てみる価値があります。先延ばしにした対話、詰まりすぎた予定、決めきれていない選択が、くり返す夢として浮かぶこともあります。夢占いの価値は、象徴そのものより現実の課題を明らかにするところにあります。",
        },
        {
          title: "4. 読み解きは次の48時間の小さな行動へつなげます",
          body:
            "良い解釈も、行動にならなければすぐに薄れていきます。境界線のサインが強いなら予定を減らす、関係のサインが強いなら確認の会話を一度してみる。48時間以内にできる小さな行動へ翻訳すると、夢占いは現実の判断を静かに助けてくれます。",
        },
        {
          title: "5. 関係の夢は相手を判定せず、自分の望みを読むために使います",
          body:
            "恋愛や家族の夢を、相手の本心の証拠として決めつけると誤解が大きくなります。むしろ自分がどんな安心、尊重、距離感を求めているのかに目を向けると、読みはずっと健やかになります。夢は相手を決めつけるためではなく、自分の望みを言葉にする準備として役立ちます。",
        },
        {
          title: "6. 週ごとの夢ログをつくると、模様が見えてきます",
          body:
            "夢の内容、感情の強さ、翌日の体調を短く残していくと、2、3週間ほどでくり返す模様があらわれます。特定の仕事の前に悪夢が増えたり、ある関係のあとに同じ象徴が出たりすることがあります。記録が積み重なるほど、夢占いはあなた自身の心の言葉を澄ませていきます。",
        },
      ],
    },
    "zh-CN": {
      title: "梦境塔罗 - 将梦的余韵封存为AI咨询问题",
      h1: "梦境塔罗",
      description:
        "梦中的场景与醒来后的情绪停留在三张象征卡片中，安静地封存为可以交给AI的咨询问题。",
      landingPoints: ["整理梦中场景", "追踪醒后的情绪余韵", "交给AI的问题"],
      seoText:
        "梦境塔罗把梦中的事件、情绪与重复象征收束成卡片语言，封存此刻内心抓住的信号与想问AI的问题。",
      valueGuideTitle: "将梦的余韵封存为AI咨询问题的6个步骤",
      valueSections: [
        {
          title: "1. 梦境解读不是吉凶预言，而是情绪信号阅读",
          body:
            "梦往往不是断定未来的信息，而是近期情绪与压力被压缩后的形态。比起场景本身，先记录梦中感受和醒来后的余韵，会让象征的层次更清楚。把梦境解读作为自我观察工具，而不是放大焦虑的工具，是最重要的态度。",
        },
        {
          title: "2. 象征的个人语境比词典意义更重要",
          body:
            "水、楼梯、动物等象征有常见解释，但个人经历可能让意义完全改变。水对一个人是休息，对另一个人可能是失控焦虑。因此，在共同象征解释上叠加近期事件，是最实用的两步阅读方式。",
        },
        {
          title: "3. 重复梦常常指向尚未完成的课题",
          body:
            "如果同一类梦反复出现，值得检查是否有未解决的课题还停留着。被推迟的关系对话、过载的日程、尚未完成的决定，都可能以重复梦的形式出现。梦境解读的价值不只在象征解释，而在于照见现实中的课题。",
        },
        {
          title: "4. 把解读连接到未来48小时内的一个行动",
          body:
            "再好的解读，如果没有行动，也会很快消散。如果边界信号强，可以减少安排；如果关系信号强，可以尝试一次确认对话。把梦转化为48小时内可执行的一个小行动，才能让解读真正帮助决策。",
        },
        {
          title: "5. 关系梦应读出你的需求，而不是判定对方",
          body:
            "把恋爱或家庭梦当成对方意图的证据，容易制造误解。更健康的方式，是看见自己需要怎样的安定、尊重或距离感。梦不是规定他人的工具，而是帮助你把需求表达清楚的准备。",
        },
        {
          title: "6. 每周梦境日志会显出模式",
          body:
            "简短记录梦的内容、情绪强度和第二天状态，两三周内就可能看见重复模式。特定工作前噩梦增加，或某段关系事件后同一象征反复出现，都可能形成线索。记录越多，梦境解读越能照亮你内心自己的语言。",
        },
      ],
    },
    "zh-TW": {
      title: "夢境塔羅 - 將夢的餘韻封存為AI諮詢問題",
      h1: "夢境塔羅",
      description:
        "夢中的場景與醒來後的情緒停留在三張象徵卡片中，安靜地封存為可以交給AI的諮詢問題。",
      landingPoints: ["整理夢中場景", "追蹤醒後的情緒餘韻", "交給AI的問題"],
      seoText:
        "夢境塔羅把夢中的事件、情緒與重複象徵收束成卡片語言，封存此刻內心抓住的訊號與想問AI的問題。",
      valueGuideTitle: "將夢的餘韻封存為AI諮詢問題的6個步驟",
      valueSections: [
        {
          title: "1. 夢境解讀不是吉凶預言，而是情緒訊號閱讀",
          body:
            "夢往往不是斷定未來的訊息，而是近期情緒與壓力被壓縮後的形態。比起場景本身，先記錄夢中感受和醒來後的餘韻，會讓象徵的層次更清楚。把夢境解讀作為自我觀察工具，而不是放大焦慮的工具，是最重要的態度。",
        },
        {
          title: "2. 象徵的個人語境比詞典意義更重要",
          body:
            "水、樓梯、動物等象徵有常見解釋，但個人經歷可能讓意義完全改變。水對一個人是休息，對另一個人可能是失控焦慮。因此，在共同象徵解釋上疊加近期事件，是最實用的兩步閱讀方式。",
        },
        {
          title: "3. 重複夢常常指向尚未完成的課題",
          body:
            "如果同一類夢反覆出現，值得檢查是否有未解決的課題還停留著。被推遲的關係對話、過載的日程、尚未完成的決定，都可能以重複夢的形式出現。夢境解讀的價值不只在象徵解釋，而在於照見現實中的課題。",
        },
        {
          title: "4. 把解讀連接到未來48小時內的一個行動",
          body:
            "再好的解讀，如果沒有行動，也會很快消散。如果邊界訊號強，可以減少安排；如果關係訊號強，可以嘗試一次確認對話。把夢轉化為48小時內可執行的一個小行動，才能讓解讀真正幫助決策。",
        },
        {
          title: "5. 關係夢應讀出你的需求，而不是判定對方",
          body:
            "把戀愛或家庭夢當成對方意圖的證據，容易製造誤解。更健康的方式，是看見自己需要怎樣的安定、尊重或距離感。夢不是規定他人的工具，而是幫助你把需求表達清楚的準備。",
        },
        {
          title: "6. 每週夢境日誌會顯出模式",
          body:
            "簡短記錄夢的內容、情緒強度和第二天狀態，兩三週內就可能看見重複模式。特定工作前惡夢增加，或某段關係事件後同一象徵反覆出現，都可能形成線索。記錄越多，夢境解讀越能照亮你內心自己的語言。",
        },
      ],
    },
    vi: {
      title: "Dream Tarot - Niêm phong dư âm giấc mơ thành câu hỏi tư vấn AI",
      h1: "Dream Tarot",
      description:
        "Cảnh trong mơ và cảm xúc sau khi thức dậy lắng vào ba lá biểu tượng, trở thành câu hỏi tư vấn yên tĩnh để gửi cho AI.",
      landingPoints: ["Sắp xếp cảnh trong mơ", "Theo dấu dư âm cảm xúc sau khi thức dậy", "Câu hỏi gửi cho AI"],
      seoText:
        "Dream Tarot gom sự kiện, cảm xúc và biểu tượng lặp lại trong mơ thành ngôn ngữ lá bài, niêm phong tín hiệu trái tim đang giữ và câu hỏi muốn gửi AI.",
      valueGuideTitle: "6 bước niêm phong dư âm giấc mơ thành câu hỏi tư vấn AI",
      valueSections: [
        {
          title: "1. Giải mộng là đọc tín hiệu cảm xúc, không phải dự báo may rủi",
          body:
            "Giấc mơ thường là dạng nén của cảm xúc và căng thẳng gần đây, hơn là thông điệp khẳng định tương lai. Ghi lại cảm giác trong mơ và dư âm sau khi thức dậy sẽ làm biểu tượng rõ hơn. Cốt lõi của giải mộng là tự quan sát, không phải làm nỗi lo lớn lên.",
        },
        {
          title: "2. Bối cảnh cá nhân quan trọng hơn nghĩa trong từ điển",
          body:
            "Nước, cầu thang hay động vật đều có nghĩa biểu tượng chung, nhưng trải nghiệm cá nhân có thể làm chúng đổi nghĩa hoàn toàn. Nước có thể là nghỉ ngơi với người này, nhưng là nỗi sợ mất kiểm soát với người khác. Cách thực tế nhất là đặt sự kiện gần đây của bạn lên trên nghĩa biểu tượng chung.",
        },
        {
          title: "3. Giấc mơ lặp lại thường chỉ đến việc chưa hoàn tất",
          body:
            "Nếu cùng một kiểu mơ quay lại nhiều lần, hãy xem có nhiệm vụ nào chưa được giải quyết không. Một cuộc trò chuyện bị trì hoãn, lịch quá tải hoặc quyết định còn dang dở có thể xuất hiện qua giấc mơ lặp lại. Giá trị của giải mộng nằm ở việc làm rõ bài toán đời thực bên dưới biểu tượng.",
        },
        {
          title: "4. Nối phần đọc với một hành động trong 48 giờ tới",
          body:
            "Một diễn giải đẹp cũng nhanh tan nếu không thành hành động. Nếu tín hiệu ranh giới mạnh, hãy giảm lịch; nếu tín hiệu quan hệ mạnh, hãy thử một cuộc trò chuyện xác nhận. Chuyển giấc mơ thành một hành động nhỏ trong 48 giờ giúp phần đọc có ích cho quyết định thật.",
        },
        {
          title: "5. Mơ về quan hệ nên đọc nhu cầu của bạn, không phán xét người kia",
          body:
            "Khi giấc mơ liên quan đến tình yêu hay gia đình, xem nó như bằng chứng ý định của người khác có thể tạo hiểu lầm. Cách lành mạnh hơn là hỏi mình cần sự an toàn, tôn trọng hay khoảng cách nào. Giấc mơ hữu ích khi chuẩn bị cho bạn diễn đạt nhu cầu rõ ràng.",
        },
        {
          title: "6. Nhật ký mơ hằng tuần sẽ làm mẫu hình hiện ra",
          body:
            "Ghi ngắn nội dung mơ, cường độ cảm xúc và trạng thái ngày hôm sau có thể hé lộ mẫu hình sau hai hoặc ba tuần. Bạn có thể thấy ác mộng trước một loại việc, hoặc biểu tượng lặp lại sau một vấn đề quan hệ. Khi ghi chép tích lũy, ngôn ngữ bên trong của bạn trở nên rõ hơn.",
        },
      ],
    },
    hi: {
      title: "ड्रीम टैरो - स्वप्न की प्रतिध्वनि को AI सलाह प्रश्नों में सील करना",
      h1: "ड्रीम टैरो",
      description:
        "स्वप्न के दृश्य और जागने के बाद बची भावना तीन प्रतीकात्मक कार्डों में ठहरती है और AI को सौंपे जाने वाले शांत सलाह प्रश्न बनती है.",
      landingPoints: ["स्वप्न दृश्यों को व्यवस्थित करें", "जागने के बाद भावना की प्रतिध्वनि", "AI को देने वाले प्रश्न"],
      seoText:
        "ड्रीम टैरो स्वप्न की घटनाओं, भावनाओं और दोहराते प्रतीकों को कार्ड भाषा में समेटकर मन द्वारा पकड़े संकेत और AI से पूछे जाने वाले प्रश्न को सील करता है.",
      valueGuideTitle: "स्वप्न प्रतिध्वनि को AI सलाह प्रश्नों में सील करने के 6 चरण",
      valueSections: [
        {
          title: "1. स्वप्न व्याख्या भविष्यवाणी नहीं, भावनात्मक संकेत पढ़ना है",
          body:
            "स्वप्न अक्सर भविष्य का निश्चित संदेश नहीं, बल्कि हाल की भावना और तनाव का संकुचित रूप होते हैं. दृश्य से पहले स्वप्न में महसूस हुई भावना और जागने के बाद बची छाप लिखें, तो प्रतीक अधिक स्पष्ट होता है. स्वप्न पढ़ना चिंता बढ़ाने के लिए नहीं, आत्म-अवलोकन के लिए सबसे स्वस्थ है.",
        },
        {
          title: "2. प्रतीक में शब्दकोश से अधिक व्यक्तिगत संदर्भ महत्त्वपूर्ण है",
          body:
            "पानी, सीढ़ी या पशु जैसे प्रतीकों के सामान्य अर्थ होते हैं, पर निजी अनुभव उन्हें बदल सकता है. पानी किसी के लिए विश्राम हो सकता है और किसी दूसरे के लिए नियंत्रण खोने की चिंता. साझा अर्थों पर हाल की घटनाएँ रखकर पढ़ना सबसे व्यावहारिक तरीका है.",
        },
        {
          title: "3. दोहराते स्वप्न अक्सर अधूरे काम की ओर इशारा करते हैं",
          body:
            "यदि एक ही प्रकार का स्वप्न लौटता रहे, तो देखें कि क्या कोई अनसुलझा काम बचा है. टली हुई संबंध बातचीत, बहुत भरा हुआ कार्यक्रम या अधूरा निर्णय दोहराते स्वप्न के रूप में आ सकता है. स्वप्न व्याख्या का मूल्य प्रतीक से अधिक उस वास्तविक काम को स्पष्ट करने में है.",
        },
        {
          title: "4. व्याख्या को अगले 48 घंटों की एक क्रिया से जोड़ें",
          body:
            "अच्छी व्याख्या भी क्रिया न बने तो जल्दी मिट जाती है. यदि सीमा का संकेत मजबूत है, तो कार्यक्रम कम करें; यदि संबंध संकेत मजबूत है, तो एक पुष्टिकरण बातचीत करें. 48 घंटों में होने वाली एक छोटी क्रिया में स्वप्न को बदलना निर्णय में मदद करता है.",
        },
        {
          title: "5. संबंध स्वप्न दूसरे को नहीं, आपकी ज़रूरत को पढ़ने के लिए हैं",
          body:
            "प्रेम या परिवार से जुड़े स्वप्न को दूसरे व्यक्ति की नीयत का प्रमाण मानना गलतफहमी बना सकता है. बेहतर है पूछना कि आपको कैसी सुरक्षा, सम्मान या दूरी चाहिए. स्वप्न तब उपयोगी होता है जब वह आपकी ज़रूरत को साफ शब्दों में कहने की तैयारी बनता है.",
        },
        {
          title: "6. साप्ताहिक स्वप्न लॉग पैटर्न दिखाता है",
          body:
            "स्वप्न सामग्री, भावना की तीव्रता और अगले दिन की स्थिति को थोड़ा लिखने से दो या तीन सप्ताह में पैटर्न दिख सकता है. किसी विशेष काम से पहले बुरे सपने या संबंध मुद्दे के बाद वही प्रतीक दोहरना संकेत हो सकता है. रिकॉर्ड बढ़ने पर मन की अपनी भाषा अधिक स्पष्ट होती है.",
        },
      ],
    },
    es: {
      title: "Dream Tarot - Sellar ecos del sueño en preguntas para IA",
      h1: "Dream Tarot",
      description:
        "Las escenas del sueño y la emoción que queda al despertar reposan en tres cartas simbólicas y se sellan como preguntas tranquilas para consultar a la IA.",
      landingPoints: ["Ordenar escenas del sueño", "Rastrear la emoción al despertar", "Preguntas para entregar a la IA"],
      seoText:
        "Dream Tarot reúne sucesos, emociones y símbolos repetidos del sueño en lenguaje de cartas, sellando la señal que sostiene el corazón y la pregunta para la IA.",
      valueGuideTitle: "6 pasos para sellar ecos del sueño en preguntas para IA",
      valueSections: [
        {
          title: "1. Interpretar sueños es leer emoción, no predecir suerte",
          body:
            "Los sueños suelen aparecer como formas comprimidas de emociones y estrés recientes, no como mensajes cerrados sobre el futuro. Registrar lo que sentiste en el sueño y el eco al despertar vuelve más claro el símbolo. La lectura de sueños es más sana como autoobservación que como amplificador de ansiedad.",
        },
        {
          title: "2. El contexto personal pesa más que el diccionario",
          body:
            "Agua, escaleras o animales tienen significados comunes, pero la experiencia personal puede cambiarlos por completo. El agua puede ser descanso para alguien y miedo a perder control para otra persona. Lo más práctico es superponer tus hechos recientes sobre el significado simbólico general.",
        },
        {
          title: "3. Los sueños repetidos suelen señalar tareas inconclusas",
          body:
            "Si vuelve el mismo tipo de sueño, conviene mirar si queda algo sin resolver. Una conversación aplazada, una agenda sobrecargada o una decisión pendiente pueden aparecer como repetición. El valor de interpretar sueños está en aclarar la tarea real que vive bajo el símbolo.",
        },
        {
          title: "4. Conecta la lectura con una acción en las próximas 48 horas",
          body:
            "Una buena interpretación se disuelve si no se vuelve acción. Si aparece una señal fuerte de límite, reduce agenda; si aparece una señal relacional, intenta una conversación de confirmación. Traducir el sueño en una acción pequeña dentro de 48 horas lo vuelve útil para decidir.",
        },
        {
          title: "5. Los sueños de relación revelan tus necesidades, no juzgan al otro",
          body:
            "Tomar un sueño amoroso o familiar como prueba de la intención de otra persona puede crear malentendidos. Es más sano preguntar qué seguridad, respeto o distancia necesitas. El sueño sirve cuando prepara tus palabras para expresar necesidades con claridad.",
        },
        {
          title: "6. Un registro semanal de sueños revela patrones",
          body:
            "Anotar contenido, intensidad emocional y estado del día siguiente puede mostrar patrones en dos o tres semanas. Tal vez notes pesadillas antes de ciertas tareas o símbolos que vuelven tras un asunto relacional. Cuanto más registro hay, más clara se vuelve la lengua interior del sueño.",
        },
      ],
    },
    fr: {
      title: "Dream Tarot - Sceller les échos du rêve en questions pour l'IA",
      h1: "Dream Tarot",
      description:
        "Les scènes du rêve et l'émotion laissée au réveil se déposent dans trois cartes symboliques, puis deviennent des questions calmes à confier à l'IA.",
      landingPoints: ["Organiser les scènes du rêve", "Suivre l'émotion après le réveil", "Questions à confier à l'IA"],
      seoText:
        "Dream Tarot rassemble événements, émotions et symboles répétés du rêve dans le langage des cartes, scellant le signal tenu par le cœur et la question pour l'IA.",
      valueGuideTitle: "6 étapes pour sceller les échos du rêve en questions pour l'IA",
      valueSections: [
        {
          title: "1. Lire un rêve, c'est lire un signal émotionnel, pas prédire",
          body:
            "Les rêves apparaissent souvent comme des formes condensées d'émotions et de stress récents, plutôt que comme des messages définitifs sur l'avenir. Noter le ressenti dans le rêve et l'écho au réveil rend le symbole plus clair. L'interprétation devient saine lorsqu'elle sert l'observation de soi, non l'amplification de l'anxiété.",
        },
        {
          title: "2. Le contexte personnel compte plus que le dictionnaire",
          body:
            "L'eau, les escaliers ou les animaux ont des sens communs, mais l'expérience personnelle peut tout changer. L'eau peut évoquer le repos pour l'un et la peur de perdre le contrôle pour l'autre. La méthode la plus utile consiste à poser vos événements récents sur les significations symboliques partagées.",
        },
        {
          title: "3. Les rêves répétés pointent souvent vers une tâche inachevée",
          body:
            "Si le même type de rêve revient, il vaut la peine de chercher ce qui reste non résolu. Une conversation différée, un agenda trop chargé ou une décision en suspens peuvent revenir sous forme de rêve répétitif. La valeur de l'interprétation est de clarifier la tâche réelle sous le symbole.",
        },
        {
          title: "4. Reliez la lecture à une action dans les 48 prochaines heures",
          body:
            "Même une belle interprétation s'efface si elle ne devient pas action. Si un signal de limite est fort, allégez l'agenda; si un signal relationnel est fort, tentez une conversation de confirmation. Traduire le rêve en une petite action sous 48 heures rend la lecture utile pour décider.",
        },
        {
          title: "5. Les rêves relationnels révèlent vos besoins, pas le jugement de l'autre",
          body:
            "Prendre un rêve amoureux ou familial comme preuve de l'intention d'une autre personne peut créer des malentendus. Il est plus sain de demander quelle sécurité, quel respect ou quelle distance vous recherchez. Le rêve devient utile lorsqu'il prépare l'expression claire de vos besoins.",
        },
        {
          title: "6. Un journal hebdomadaire des rêves révèle les motifs",
          body:
            "Noter le contenu, l'intensité émotionnelle et l'état du lendemain peut révéler des motifs en deux ou trois semaines. Vous pouvez voir des cauchemars avant certaines tâches, ou un symbole répété après un sujet relationnel. Plus les notes s'accumulent, plus la langue intérieure du rêve devient lisible.",
        },
      ],
    },
    de: {
      title: "Dream Tarot - Traum-Echos in KI-Beratungsfragen versiegeln",
      h1: "Dream Tarot",
      description:
        "Traumszenen und die Gefühle nach dem Aufwachen ruhen in drei Symbolkarten und werden zu stillen Beratungsfragen für die KI.",
      landingPoints: ["Traumszenen ordnen", "Gefühlsnachhall nach dem Aufwachen verfolgen", "Fragen an die KI"],
      seoText:
        "Dream Tarot sammelt Ereignisse, Gefühle und wiederkehrende Symbole eines Traums in Kartensprache und versiegelt das Signal des Herzens sowie die Frage an die KI.",
      valueGuideTitle: "6 Schritte, um Traum-Echos in KI-Beratungsfragen zu versiegeln",
      valueSections: [
        {
          title: "1. Traumdeutung liest emotionale Signale, keine Zukunft",
          body:
            "Träume erscheinen oft als verdichtete Form jüngster Gefühle und Belastungen, nicht als feste Botschaften über die Zukunft. Wenn du Gefühl im Traum und Nachklang beim Aufwachen notierst, wird das Symbol klarer. Traumdeutung ist am gesündesten als Selbstbeobachtung, nicht als Verstärker von Angst.",
        },
        {
          title: "2. Persönlicher Kontext zählt mehr als Wörterbuchbedeutung",
          body:
            "Wasser, Treppen oder Tiere haben gemeinsame Bedeutungen, doch persönliche Erfahrung kann sie völlig verändern. Wasser kann für eine Person Ruhe bedeuten und für eine andere Kontrollverlust. Praktisch ist es, aktuelle Ereignisse über allgemeine Symboldeutungen zu legen.",
        },
        {
          title: "3. Wiederkehrende Träume zeigen oft unerledigte Aufgaben",
          body:
            "Wenn dieselbe Traumart zurückkehrt, lohnt sich ein Blick auf ungelöste Aufgaben. Ein verschobenes Gespräch, ein überladener Kalender oder eine offene Entscheidung kann als Wiederholung erscheinen. Der Wert der Deutung liegt darin, die reale Aufgabe unter dem Symbol zu erkennen.",
        },
        {
          title: "4. Verbinde die Deutung mit einer Handlung in 48 Stunden",
          body:
            "Auch eine gute Interpretation verblasst, wenn sie nicht zur Handlung wird. Bei starkem Grenzsignal reduziere Termine; bei starkem Beziehungssignal versuche ein klärendes Gespräch. Eine kleine Handlung innerhalb von 48 Stunden macht den Traum für Entscheidungen nützlich.",
        },
        {
          title: "5. Beziehungsträume lesen deine Bedürfnisse, nicht die andere Person",
          body:
            "Romantische oder familiäre Träume als Beweis für die Absicht anderer zu nehmen, kann Missverständnisse schaffen. Gesünder ist die Frage, welche Sicherheit, welcher Respekt oder welche Distanz du brauchst. Ein Traum hilft, wenn er dich vorbereitet, Bedürfnisse klar auszusprechen.",
        },
        {
          title: "6. Ein wöchentliches Traumlog zeigt Muster",
          body:
            "Kurze Notizen zu Inhalt, emotionaler Stärke und Zustand am nächsten Tag können in zwei oder drei Wochen Muster zeigen. Vielleicht treten Albträume vor bestimmten Aufgaben auf oder Symbole kehren nach Beziehungsthemen zurück. Mit mehr Aufzeichnungen wird die innere Sprache des Traums deutlicher.",
        },
      ],
    },
    nl: {
      title: "Dream Tarot - Droomnagalmen verzegelen als AI-consultvragen",
      h1: "Dream Tarot",
      description:
        "Droomscènes en emoties na het wakker worden landen in drie symbolische kaarten en worden stille consultvragen om aan AI te geven.",
      landingPoints: ["Droomscènes ordenen", "Emotionele nagalm na het ontwaken volgen", "Vragen voor AI"],
      seoText:
        "Dream Tarot verzamelt gebeurtenissen, emoties en terugkerende symbolen uit een droom in kaarttaal en verzegelt het signaal dat je hart vasthoudt met de vraag voor AI.",
      valueGuideTitle: "6 stappen om droomnagalmen als AI-consultvragen te verzegelen",
      valueSections: [
        {
          title: "1. Droomduiding leest emotionele signalen, geen voorspellingen",
          body:
            "Dromen verschijnen vaak als samengeperste vormen van recente emoties en stress, niet als vaste berichten over de toekomst. Door het gevoel in de droom en de nagalm bij het wakker worden te noteren, wordt het symbool duidelijker. Droomduiding is het gezondst als zelfobservatie, niet als versterking van angst.",
        },
        {
          title: "2. Persoonlijke context weegt zwaarder dan woordenboekbetekenis",
          body:
            "Water, trappen of dieren hebben algemene betekenissen, maar persoonlijke ervaring kan alles veranderen. Water kan rust betekenen voor de een en angst voor controleverlies voor de ander. De praktische manier is recente gebeurtenissen over gedeelde symboliek heen te lezen.",
        },
        {
          title: "3. Terugkerende dromen wijzen vaak op onafgemaakte taken",
          body:
            "Als hetzelfde soort droom terugkomt, kijk dan of er iets onopgelost blijft. Een uitgesteld gesprek, overvolle agenda of open beslissing kan in herhaling verschijnen. De waarde van droomduiding ligt minder in het symbool zelf en meer in de echte taak die eronder ligt.",
        },
        {
          title: "4. Verbind de lezing met één actie binnen 48 uur",
          body:
            "Zelfs een mooie interpretatie vervaagt snel zonder actie. Bij een sterk grenssignaal kun je agenda verminderen; bij een sterk relatiesignaal kun je een bevestigend gesprek proberen. Eén kleine actie binnen 48 uur maakt de droom bruikbaar voor echte keuzes.",
        },
        {
          title: "5. Relatiedromen tonen jouw behoeften, niet het oordeel over de ander",
          body:
            "Een liefdes- of familiedroom gebruiken als bewijs van iemands bedoeling kan misverstanden geven. Het is gezonder te vragen welke veiligheid, waardering of afstand jij nodig hebt. De droom helpt wanneer hij je voorbereidt om behoeften helder te verwoorden.",
        },
        {
          title: "6. Een wekelijks droomlog onthult patronen",
          body:
            "Korte notities over inhoud, emotionele intensiteit en de toestand van de volgende dag kunnen binnen twee of drie weken patronen tonen. Je ziet misschien nachtmerries voor bepaalde taken of symbolen na relatiekwesties. Hoe meer je noteert, hoe helderder je innerlijke droomtaal wordt.",
        },
      ],
    },
    ms: {
      title: "Dream Tarot - Memeterai gema mimpi menjadi soalan konsultasi AI",
      h1: "Dream Tarot",
      description:
        "Adegan mimpi dan emosi selepas bangun berlabuh pada tiga kad simbolik, lalu menjadi soalan konsultasi yang tenang untuk diserahkan kepada AI.",
      landingPoints: ["Susun adegan mimpi", "Jejaki gema emosi selepas bangun", "Soalan untuk AI"],
      seoText:
        "Dream Tarot mengumpul peristiwa, emosi dan simbol berulang dalam mimpi ke dalam bahasa kad, memeterai isyarat yang dipegang hati dan soalan untuk AI.",
      valueGuideTitle: "6 langkah memeterai gema mimpi menjadi soalan konsultasi AI",
      valueSections: [
        {
          title: "1. Tafsir mimpi membaca isyarat emosi, bukan ramalan untung rugi",
          body:
            "Mimpi sering hadir sebagai bentuk mampat emosi dan tekanan baru-baru ini, bukan mesej tetap tentang masa depan. Mencatat rasa dalam mimpi dan gema selepas bangun menjadikan simbol lebih jelas. Tafsir mimpi paling sihat apabila digunakan untuk pemerhatian diri, bukan membesarkan kebimbangan.",
        },
        {
          title: "2. Konteks peribadi lebih penting daripada makna kamus",
          body:
            "Air, tangga atau haiwan mempunyai makna umum, tetapi pengalaman peribadi boleh mengubahnya sepenuhnya. Air mungkin rehat bagi seseorang dan takut hilang kawalan bagi orang lain. Cara paling praktikal ialah melapiskan peristiwa terkini anda di atas makna simbol bersama.",
        },
        {
          title: "3. Mimpi berulang sering menunjuk kepada tugas yang belum selesai",
          body:
            "Jika jenis mimpi yang sama kembali, semak sama ada ada perkara yang belum selesai. Perbualan hubungan yang ditangguh, jadual terlalu padat atau keputusan yang belum dibuat boleh muncul sebagai mimpi berulang. Nilai tafsir mimpi ialah menjelaskan tugas hidup sebenar di bawah simbol.",
        },
        {
          title: "4. Sambungkan bacaan kepada satu tindakan dalam 48 jam",
          body:
            "Tafsiran yang baik pun cepat hilang jika tidak menjadi tindakan. Jika isyarat sempadan kuat, kurangkan jadual; jika isyarat hubungan kuat, cuba satu perbualan pengesahan. Menterjemah mimpi kepada satu tindakan kecil dalam 48 jam menjadikannya berguna untuk keputusan nyata.",
        },
        {
          title: "5. Mimpi hubungan membaca keperluan anda, bukan menilai orang lain",
          body:
            "Menganggap mimpi cinta atau keluarga sebagai bukti niat orang lain boleh mencipta salah faham. Lebih sihat untuk bertanya jenis keselamatan, penghormatan atau jarak yang anda perlukan. Mimpi berguna apabila ia menyediakan anda untuk menyatakan keperluan dengan jelas.",
        },
        {
          title: "6. Log mimpi mingguan menunjukkan pola",
          body:
            "Catatan ringkas tentang kandungan mimpi, kekuatan emosi dan keadaan hari berikutnya boleh menunjukkan pola dalam dua atau tiga minggu. Anda mungkin nampak mimpi buruk sebelum tugas tertentu atau simbol berulang selepas isu hubungan. Semakin banyak catatan, semakin jelas bahasa dalaman mimpi anda.",
        },
      ],
    },
  },
  valueGuideTitle: dreamTarotText("valueGuide.title"),
  valueSections: [
    {
      title: dreamTarotText("value.1.title"),
      body:
        "꿈은 미래를 단정하는 메시지라기보다 최근 정서와 스트레스가 압축된 형태로 나타나는 경우가 많습니다. 그래서 장면 자체보다 꿈에서 느낀 감정, 깬 직후 남은 여운을 먼저 기록하면 상징의 결이 선명해집니다. 꿈해몽을 불안 증폭 도구가 아닌 자기관찰 도구로 쓰는 태도가 핵심입니다.",
    },
    {
      title: dreamTarotText("value.2.title"),
      body:
        "물, 계단, 동물 같은 상징은 일반 사전 의미가 있지만 개인 경험에 따라 완전히 달라질 수 있습니다. 예를 들어 물이 누군가에게는 휴식이지만 다른 누군가에게는 통제 불안을 의미할 수 있습니다. 따라서 공통 상징 해석 위에 내 최근 사건을 겹쳐 읽는 2단계 방식이 가장 실용적입니다.",
    },
    {
      title: dreamTarotText("value.3.title"),
      body:
        "같은 유형의 꿈이 반복된다면 단순 우연보다 미해결 과제가 남아 있을 가능성을 점검해 볼 필요가 있습니다. 관계 대화 미루기, 일정 과부하, 미완료된 결정 같은 요소가 반복 꿈으로 나타나기도 합니다. 꿈해몽의 가치는 상징 해석 자체보다 현실 과제를 명료화하는 데 있습니다.",
    },
    {
      title: dreamTarotText("value.4.title"),
      body:
        "좋은 해석도 행동으로 이어지지 않으면 빠르게 휘발됩니다. 꿈에서 경계 신호가 강했다면 일정 감축, 관계 신호가 강했다면 확인 대화 시도처럼 작고 구체적인 행동 1개를 정해보세요. 48시간 내 실행 가능한 단일 행동으로 번역하면 꿈해몽이 실제 의사결정에 도움이 됩니다.",
    },
    {
      title: dreamTarotText("value.5.title"),
      body:
        "연애나 가족 꿈을 상대의 의도로 단정하면 오해가 커질 수 있습니다. 오히려 내가 어떤 안정, 존중, 거리감을 필요로 하는지 파악하는 데 집중하면 해석이 훨씬 건강해집니다. 꿈은 타인을 규정하는 도구가 아니라 내 욕구를 명확히 표현하기 위한 준비 도구로 사용할 때 효용이 큽니다.",
    },
    {
      title: dreamTarotText("value.6.title"),
      body:
        "꿈 내용, 감정 강도, 다음날 컨디션을 짧게 기록하면 2~3주 안에 반복 패턴이 드러납니다. 특정 업무 전날 악몽이 잦거나, 특정 관계 이슈 후 특정 상징이 반복되는 식의 연결점이 보이면 대응 전략을 세울 수 있습니다. 꿈해몽은 기록이 쌓일수록 내 마음의 언어를 더 또렷하게 비추는 느린 도구입니다.",
    },
  ],
};

export default function DreamTarotLandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <FeatureLandingPage service={SERVICE} />
    </>
  );
}
