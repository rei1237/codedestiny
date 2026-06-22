import FeatureLandingPage from "../../components/FeatureLandingPage";
import { withUniqueRouteMetadata } from "../../../lib/generate-page-metadata";

const SERVICE = {
  h1: "점성술 코즈믹 차트",
  description:
    "서양 점성술의 태양궁, 달궁, 상승궁을 중심으로 성향과 관계 패턴을 읽는 코즈믹 차트 서비스입니다.",
  ogImage: "https://code-destiny.com/fuctionassets/jumsung.webp",
  landingPoints: ["태양궁·달궁·상승궁 해석", "코즈믹 스타일 차트", "관계 패턴 파악"],
  seoText:
    "점성술 코즈믹 차트는 출생 정보를 기반으로 태양, 달, 상승궁을 해석해 성향과 감정 패턴, 표현 방식을 이해하도록 돕습니다.",
  localized: {
    en: {
      title: "Astrology Cosmic Chart - Sun, Moon, and Rising Analysis",
      h1: "Astrology Cosmic Chart",
      description:
        "A cosmic chart service that reads temperament and relationship patterns through the Sun sign, Moon sign, and Rising sign of Western astrology.",
      landingPoints: ["Sun, Moon, and Rising interpretation", "Cosmic-style chart", "Relationship pattern insight"],
      seoText:
        "Astrology Cosmic Chart interprets the Sun, Moon, and Rising sign from birth information to help you understand temperament, emotional patterns, and expression style.",
      valueGuideTitle: "Six Perspectives for Connecting a Cosmic Chart to Real Life",
      valueSections: [
        {
          title: "1. The Sun is purpose, the Moon is recovery, and the Rising is expression",
          body:
            "Astrology becomes shallow when reduced to one sign. The Sun shows long-term direction, the Moon shows emotional response under stress, and the Rising shows how you operate when first meeting the world. Reading these three together explains why strong will can still feel tired in relationships.",
        },
        {
          title: "2. Houses are stages, planets are actors",
          body:
            "The same Venus works differently in the 2nd house and the 10th house. Houses show where energy appears in life, while planets show the tone used in that area. Rather than memorizing planets alone, note where, with whom, and through what the energy is expressed.",
        },
        {
          title: "3. Aspects are adjustment points, not tension punishments",
          body:
            "Many squares or oppositions do not make a chart bad. They can indicate strong growth power. What matters is knowing how your decisions speed up and where relationship conversations twist when uncomfortable aspects arise. Aspects are healthier when treated like tasks that need adjustment.",
        },
        {
          title: "4. Transits are preparation checklists more than event predictions",
          body:
            "Planetary movement is not a switch that fixes an outcome; it signals themes that need attention. During Saturn pressure, responsibility and structure matter first; during Jupiter expansion, opportunities should be widened but exaggerated promises checked. Planning ahead makes the same transit steadier.",
        },
        {
          title: "5. Compatibility is communication translation, not chemistry score",
          body:
            "A common mistake in synastry is treating a low score as the end of a relationship. Often the emotional languages are simply different. Comparing the Moon's need for safety with Mars's pushing speed can reduce conflict when the order of conversation is adjusted.",
        },
        {
          title: "6. Cosmic interpretation is completed through weekly experiments",
          body:
            "Try one week of experiments after reading the chart. Record the time when energy drops, the conversation style that softens relationships, and the work setting that improves focus. Astrology is most valuable as a frame for observing and adjusting your rhythm.",
        },
      ],
    },
    ja: {
      title: "占星術コズミックチャート - 太陽・月・アセンダント分析",
      h1: "占星術コズミックチャート",
      description:
        "西洋占星術の太陽星座、月星座、アセンダントを中心に、性質と関係パターンを読み解くコズミックチャートです。",
      landingPoints: ["太陽星座・月星座・アセンダント解釈", "コズミックスタイルチャート", "関係パターンの把握"],
      seoText:
        "占星術コズミックチャートは、出生情報から太陽、月、アセンダントを読み、性質、感情パターン、表現の仕方を理解する助けになります。",
      valueGuideTitle: "コズミックチャートを現実に結びつける6つの視点",
      valueSections: [
        {
          title: "1. 太陽星座は目的、月星座は回復、アセンダントは表現です",
          body:
            "占星術を一つの星座だけで見ると、説明は浅くなります。太陽星座は長期的に向かう方向、月星座は不安なときの感情反応、アセンダントは初対面で見せる運び方を映します。この三つを一緒に読むと、意志は強いのに関係で疲れやすい理由も見えやすくなります。",
        },
        {
          title: "2. ハウスは出来事の舞台、惑星は行動の役者です",
          body:
            "同じ金星でも、2ハウスと10ハウスでは働き方が変わります。ハウスはどの生活領域にエネルギーが出るかを示し、惑星はその領域をどんな調子で扱うかを知らせます。惑星だけを覚えるより、どこで、誰と、何を通して表れるかを一緒に見ると読みが正確になります。",
        },
        {
          title: "3. アスペクトは緊張の罰ではなく、調整ポイントです",
          body:
            "スクエアやオポジションが多いからといって、悪いチャートとは限りません。むしろ成長の力が強い構造かもしれません。大切なのは、不快なアスペクトが動くとき、自分の決断がどう急ぎ、関係の会話がどこでずれるかを知ることです。",
        },
        {
          title: "4. トランジットは出来事の予言より、準備リストに近いものです",
          body:
            "惑星の移動は結果を固定するスイッチではなく、注意すべきテーマを知らせるサインです。土星の圧が強い時期は責任と構造の整え直しを、木星の拡大期は機会を広げつつ大きすぎる約束を確認します。予定、支出、関係の対話目標を先に決めておくと、同じトランジットも安定して通れます。",
        },
        {
          title: "5. 相性はケミストリー点より、会話を翻訳する力を見ます",
          body:
            "シナストリーでよくある誤りは、点数が低いと関係が終わると読むことです。実際には、感情表現の言葉が違うだけの場合も多いものです。相手の月星座が求める安心と、自分の火星が押す速さを比べ、会話の順番を整えると、衝突はかなり減ります。",
        },
        {
          title: "6. コズミック解釈は週間実験で完成します",
          body:
            "チャートを読んだら、1週間だけ実験してみてください。エネルギーが落ちる時間、関係がやわらぐ話し方、集中しやすい作業環境を記録すると、解釈が自分のデータに変わります。占星術は外の運命を待つ技術ではなく、自分のリズムを観察し整える枠組みとして使うと深く役立ちます。",
        },
      ],
    },
    "zh-CN": {
      title: "占星宇宙星盘 - 太阳、月亮与上升分析",
      h1: "占星宇宙星盘",
      description:
        "以西方占星术的太阳星座、月亮星座与上升星座为中心，阅读性格倾向和关系模式的宇宙星盘服务。",
      landingPoints: ["太阳、月亮、上升解读", "宇宙风格星盘", "关系模式洞察"],
      seoText:
        "占星宇宙星盘根据出生信息解读太阳、月亮与上升星座，帮助理解性格、情绪模式与表达方式。",
      valueGuideTitle: "把宇宙星盘连接到现实的6个视角",
      valueSections: [
        {
          title: "1. 太阳是目标，月亮是恢复，上升是表达",
          body:
            "如果只把占星看成一句星座说明，解释会变浅。太阳显示长期追求方向，月亮显示不安时的情绪反应，上升显示初次与世界接触时的运作方式。三者一起读，才能理解为何意志很强却在关系中容易疲惫。",
        },
        {
          title: "2. 宫位是事件舞台，行星是行动演员",
          body:
            "同样是金星，在第二宫与第十宫的作用方式会不同。宫位说明能量出现在哪个生活领域，行星说明你用什么调性处理这个领域。阅读星盘时，不要只背行星含义，也要写下它在哪里、和谁、通过什么表现。",
        },
        {
          title: "3. 相位不是紧张惩罚，而是调整点",
          body:
            "有很多四分相或对分相，并不代表星盘不好。它可能意味着成长动力很强。重要的是知道不舒服的相位出现时，你的决定如何变急，关系对话在哪里偏离。把相位看作需要调整的工作项会更健康。",
        },
        {
          title: "4. 行运更像准备清单，而不是事件预言",
          body:
            "行星移动不是确定结果的开关，而是提醒你该关注什么主题。土星压力期优先责任和结构整理；木星扩张期可以扩大机会，但要检查过度承诺。提前定好日程、支出计划与关系对话目标，同样的行运也会更稳定。",
        },
        {
          title: "5. 相性看的是沟通翻译能力，而不是化学分数",
          body:
            "合盘中常见的误读，是把低分等同于关系结束。实际上很多时候只是情绪语言不同。比较对方月亮需要的安定方式与自己火星推进的速度，再调整对话顺序，能减少大量冲突。",
        },
        {
          title: "6. 宇宙解读通过每周实验完成",
          body:
            "读完星盘后，请试着实验一周。记录能量下降的时间、让关系柔和的说话方式、最容易专注的工作环境，解读就会变成自己的数据。占星术不是等待外部命运，而是观察和调整自身节奏的框架。",
        },
      ],
    },
    "zh-TW": {
      title: "占星宇宙星盤 - 太陽、月亮與上升分析",
      h1: "占星宇宙星盤",
      description:
        "以西方占星術的太陽星座、月亮星座與上升星座為中心，閱讀性格傾向和關係模式的宇宙星盤服務。",
      landingPoints: ["太陽、月亮、上升解讀", "宇宙風格星盤", "關係模式洞察"],
      seoText:
        "占星宇宙星盤根據出生資訊解讀太陽、月亮與上升星座，幫助理解性格、情緒模式與表達方式。",
      valueGuideTitle: "把宇宙星盤連接到現實的6個視角",
      valueSections: [
        {
          title: "1. 太陽是目標，月亮是恢復，上升是表達",
          body:
            "如果只把占星看成一句星座說明，解釋會變淺。太陽顯示長期追求方向，月亮顯示不安時的情緒反應，上升顯示初次與世界接觸時的運作方式。三者一起讀，才能理解為何意志很強卻在關係中容易疲憊。",
        },
        {
          title: "2. 宮位是事件舞台，行星是行動演員",
          body:
            "同樣是金星，在第二宮與第十宮的作用方式會不同。宮位說明能量出現在哪個生活領域，行星說明你用什麼調性處理這個領域。閱讀星盤時，不要只背行星含義，也要寫下它在哪裡、和誰、透過什麼表現。",
        },
        {
          title: "3. 相位不是緊張懲罰，而是調整點",
          body:
            "有很多四分相或對分相，並不代表星盤不好。它可能意味著成長動力很強。重要的是知道不舒服的相位出現時，你的決定如何變急，關係對話在哪裡偏離。把相位看作需要調整的工作項會更健康。",
        },
        {
          title: "4. 行運更像準備清單，而不是事件預言",
          body:
            "行星移動不是確定結果的開關，而是提醒你該關注什麼主題。土星壓力期優先責任和結構整理；木星擴張期可以擴大機會，但要檢查過度承諾。提前定好日程、支出計畫與關係對話目標，同樣的行運也會更穩定。",
        },
        {
          title: "5. 相性看的是溝通翻譯能力，而不是化學分數",
          body:
            "合盤中常見的誤讀，是把低分等同於關係結束。實際上很多時候只是情緒語言不同。比較對方月亮需要的安定方式與自己火星推進的速度，再調整對話順序，能減少大量衝突。",
        },
        {
          title: "6. 宇宙解讀透過每週實驗完成",
          body:
            "讀完星盤後，請試著實驗一週。記錄能量下降的時間、讓關係柔和的說話方式、最容易專注的工作環境，解讀就會變成自己的資料。占星術不是等待外部命運，而是觀察和調整自身節奏的框架。",
        },
      ],
    },
    vi: {
      title: "Bản đồ chiêm tinh Cosmic - Phân tích Mặt Trời, Mặt Trăng và Cung Mọc",
      h1: "Bản đồ chiêm tinh Cosmic",
      description:
        "Dịch vụ bản đồ cosmic đọc khí chất và mô thức quan hệ qua cung Mặt Trời, cung Mặt Trăng và Cung Mọc trong chiêm tinh phương Tây.",
      landingPoints: ["Luận Mặt Trời, Mặt Trăng và Cung Mọc", "Bản đồ phong cách cosmic", "Nhìn mô thức quan hệ"],
      seoText:
        "Bản đồ chiêm tinh Cosmic dùng thông tin sinh để đọc Mặt Trời, Mặt Trăng và Cung Mọc, giúp hiểu khí chất, mô thức cảm xúc và cách biểu đạt.",
      valueGuideTitle: "6 góc nhìn để nối bản đồ Cosmic với đời sống",
      valueSections: [
        {
          title: "1. Mặt Trời là mục tiêu, Mặt Trăng là hồi phục, Cung Mọc là biểu đạt",
          body:
            "Nếu chỉ đọc một cung hoàng đạo, chiêm tinh sẽ trở nên nông. Mặt Trời cho thấy hướng dài hạn, Mặt Trăng cho thấy phản ứng cảm xúc khi bất an, còn Cung Mọc cho thấy cách bạn vận hành trước người mới. Ba trục này giải thích vì sao ý chí mạnh nhưng quan hệ vẫn dễ mệt.",
        },
        {
          title: "2. Nhà là sân khấu, hành tinh là diễn viên",
          body:
            "Cùng là Venus nhưng ở nhà 2 và nhà 10 sẽ vận hành khác nhau. Nhà cho biết năng lượng xuất hiện ở lĩnh vực nào, hành tinh cho biết bạn xử lý lĩnh vực đó bằng tông nào. Khi đọc bản đồ, hãy ghi nơi, người liên quan và cách năng lượng biểu hiện.",
        },
        {
          title: "3. Góc chiếu là điểm điều chỉnh, không phải hình phạt căng thẳng",
          body:
            "Nhiều góc vuông hoặc đối đỉnh không làm bản đồ xấu. Nó có thể là cấu trúc có lực trưởng thành mạnh. Điều quan trọng là biết khi góc khó xuất hiện, quyết định của bạn gấp gáp ra sao và đối thoại quan hệ lệch ở đâu.",
        },
        {
          title: "4. Transit giống danh sách chuẩn bị hơn dự báo sự kiện",
          body:
            "Chuyển động hành tinh không phải công tắc định kết quả, mà là tín hiệu chủ đề cần chú ý. Khi Saturn gây áp lực, trách nhiệm và cấu trúc cần ưu tiên; khi Jupiter mở rộng, hãy mở cơ hội nhưng kiểm tra lời hứa quá lớn. Chuẩn bị trước làm transit ổn hơn.",
        },
        {
          title: "5. Độ hợp là khả năng phiên dịch giao tiếp, không phải điểm hóa học",
          body:
            "Sai lầm thường gặp trong synastry là nghĩ điểm thấp nghĩa là hết đường. Thực tế nhiều khi chỉ là ngôn ngữ cảm xúc khác nhau. So sánh cách Mặt Trăng đối phương cần an toàn với tốc độ Mars của bạn sẽ giúp sắp lại thứ tự trò chuyện.",
        },
        {
          title: "6. Diễn giải Cosmic hoàn tất bằng thử nghiệm hằng tuần",
          body:
            "Sau khi đọc bản đồ, hãy thử một tuần. Ghi thời điểm năng lượng tụt, cách nói khiến quan hệ mềm lại và môi trường làm việc giúp tập trung. Chiêm tinh có giá trị nhất khi là khung quan sát và chỉnh nhịp của bạn.",
        },
      ],
    },
    hi: {
      title: "ज्योतिष कॉस्मिक चार्ट - सूर्य, चंद्र और लग्न विश्लेषण",
      h1: "ज्योतिष कॉस्मिक चार्ट",
      description:
        "पाश्चात्य ज्योतिष के सूर्य राशि, चंद्र राशि और लग्न के आधार पर स्वभाव और संबंध पैटर्न पढ़ने वाली कॉस्मिक चार्ट सेवा.",
      landingPoints: ["सूर्य, चंद्र और लग्न व्याख्या", "कॉस्मिक शैली चार्ट", "संबंध पैटर्न समझ"],
      seoText:
        "ज्योतिष कॉस्मिक चार्ट जन्म जानकारी से सूर्य, चंद्र और लग्न पढ़कर स्वभाव, भावनात्मक पैटर्न और अभिव्यक्ति शैली समझने में मदद करता है.",
      valueGuideTitle: "कॉस्मिक चार्ट को वास्तविक जीवन से जोड़ने के 6 दृष्टिकोण",
      valueSections: [
        {
          title: "1. सूर्य लक्ष्य है, चंद्र पुनर्स्थापन है, लग्न अभिव्यक्ति है",
          body:
            "ज्योतिष को एक राशि तक सीमित करने से अर्थ उथला हो जाता है. सूर्य दीर्घ दिशा, चंद्र तनाव में भावनात्मक प्रतिक्रिया और लग्न पहली छवि की कार्यशैली दिखाता है. तीनों को साथ पढ़ने से समझ आता है कि मजबूत इच्छा के बावजूद संबंधों में थकान क्यों आती है.",
        },
        {
          title: "2. भाव मंच हैं, ग्रह अभिनेता हैं",
          body:
            "वही शुक्र दूसरे भाव और दसवें भाव में अलग काम करता है. भाव बताते हैं ऊर्जा जीवन के किस क्षेत्र में आती है, ग्रह बताते हैं वह किस टोन से काम करती है. ग्रह अर्थ अकेले याद करने के बजाय कहाँ, किसके साथ और किस माध्यम से अभिव्यक्ति हो रही है, यह लिखें.",
        },
        {
          title: "3. दृष्टियाँ तनाव दंड नहीं, समायोजन बिंदु हैं",
          body:
            "अधिक वर्ग या विरोध होने से चार्ट खराब नहीं होता. यह मजबूत विकास ऊर्जा भी दिखा सकता है. महत्त्वपूर्ण यह जानना है कि कठिन दृष्टि आने पर निर्णय कैसे तेज हो जाते हैं और संबंध संवाद कहाँ मुड़ता है. दृष्टि को सुधार कार्य की तरह देखें.",
        },
        {
          title: "4. ट्रांजिट घटना भविष्यवाणी से अधिक तैयारी सूची है",
          body:
            "ग्रह गति परिणाम तय करने वाला स्विच नहीं, ध्यान देने वाले विषय का संकेत है. शनि दबाव काल में जिम्मेदारी और संरचना, गुरु विस्तार काल में अवसर और अतिशयोक्ति जाँच प्राथमिक हैं. योजना पहले बने तो वही ट्रांजिट अधिक स्थिर गुजरता है.",
        },
        {
          title: "5. संगतता केमिस्ट्री अंक नहीं, संवाद अनुवाद क्षमता है",
          body:
            "सिनैस्ट्री में सामान्य भूल है कि कम अंक संबंध अंत मान लेना. अक्सर भावनात्मक भाषा बस अलग होती है. दूसरे के चंद्र को कैसी सुरक्षा चाहिए और आपका मंगल किस गति से धकेलता है, यह तुलना कर बातचीत क्रम बदलें तो संघर्ष घटता है.",
        },
        {
          title: "6. कॉस्मिक व्याख्या साप्ताहिक प्रयोग से पूर्ण होती है",
          body:
            "चार्ट पढ़ने के बाद एक सप्ताह प्रयोग करें. ऊर्जा कब गिरती है, कौन सा संवाद संबंध नरम करता है और कौन सा कार्य वातावरण ध्यान बढ़ाता है, लिखें. ज्योतिष बाहरी भाग्य प्रतीक्षा नहीं, अपनी लय देखने और सँवारने का ढाँचा है.",
        },
      ],
    },
    es: {
      title: "Carta cósmica de astrología - Sol, Luna y Ascendente",
      h1: "Carta cósmica de astrología",
      description:
        "Servicio de carta cósmica que lee temperamento y patrones relacionales mediante signo solar, lunar y ascendente de la astrología occidental.",
      landingPoints: ["Interpretación de Sol, Luna y Ascendente", "Carta de estilo cósmico", "Comprensión de patrones relacionales"],
      seoText:
        "La carta cósmica interpreta Sol, Luna y Ascendente desde datos de nacimiento para comprender temperamento, patrones emocionales y estilo de expresión.",
      valueGuideTitle: "6 perspectivas para conectar la carta cósmica con la vida real",
      valueSections: [
        {
          title: "1. El Sol es propósito, la Luna recuperación y el Ascendente expresión",
          body:
            "La astrología se vuelve superficial si se reduce a un signo. El Sol muestra dirección a largo plazo, la Luna reacción emocional bajo estrés y el Ascendente la forma de operar al presentarte. Leer los tres explica cansancios reales en vínculos.",
        },
        {
          title: "2. Las casas son escenarios y los planetas actores",
          body:
            "La misma Venus actúa distinto en casa 2 y casa 10. Las casas muestran dónde aparece la energía y los planetas con qué tono se maneja. No memorices planetas aislados; anota dónde, con quién y por medio de qué se expresa.",
        },
        {
          title: "3. Los aspectos son ajustes, no castigos de tensión",
          body:
            "Muchos cuadrados u oposiciones no hacen una mala carta; pueden indicar fuerte motor de crecimiento. Lo importante es observar cómo se acelera tu decisión y dónde se tuerce la conversación cuando aparece incomodidad. El aspecto es una tarea de ajuste.",
        },
        {
          title: "4. Los tránsitos son listas de preparación más que predicción",
          body:
            "El movimiento planetario no fija resultados; señala temas que piden atención. Con Saturno conviene estructura y responsabilidad; con Júpiter, ampliar oportunidades sin promesas exageradas. Preparar agenda, gastos y conversaciones vuelve más estable el tránsito.",
        },
        {
          title: "5. La compatibilidad mide traducción comunicativa, no química",
          body:
            "En sinastría es común creer que un puntaje bajo termina la relación. Muchas veces solo hay lenguajes emocionales distintos. Comparar la seguridad que pide la Luna del otro con la velocidad de tu Marte ayuda a ordenar el diálogo y reducir conflicto.",
        },
        {
          title: "6. La interpretación cósmica se completa con experimentos semanales",
          body:
            "Después de leer la carta, experimenta una semana. Registra cuándo baja tu energía, qué conversación suaviza vínculos y qué entorno mejora el enfoque. La astrología vale más como marco para observar y ajustar tu ritmo.",
        },
      ],
    },
    fr: {
      title: "Carte cosmique d'astrologie - Soleil, Lune et Ascendant",
      h1: "Carte cosmique d'astrologie",
      description:
        "Un service de carte cosmique qui lit tempérament et schémas relationnels à partir du signe solaire, lunaire et ascendant de l'astrologie occidentale.",
      landingPoints: ["Interprétation Soleil, Lune et Ascendant", "Carte au style cosmique", "Lecture des schémas relationnels"],
      seoText:
        "La carte cosmique interprète Soleil, Lune et Ascendant à partir des données de naissance pour comprendre tempérament, émotions et expression.",
      valueGuideTitle: "6 perspectives pour relier la carte cosmique à la vie réelle",
      valueSections: [
        {
          title: "1. Le Soleil est le but, la Lune la récupération, l'Ascendant l'expression",
          body:
            "L'astrologie devient mince lorsqu'elle se réduit à un signe. Le Soleil montre la direction, la Lune la réaction émotionnelle sous stress, et l'Ascendant la manière d'apparaître. Les trois ensemble expliquent des ressentis relationnels concrets.",
        },
        {
          title: "2. Les maisons sont les scènes, les planètes les acteurs",
          body:
            "Une même Vénus fonctionne différemment en maison 2 et en maison 10. Les maisons indiquent où l'énergie se manifeste, les planètes avec quel ton. Notez où, avec qui et par quoi l'énergie s'exprime plutôt que de mémoriser les planètes seules.",
        },
        {
          title: "3. Les aspects sont des points d'ajustement, pas des punitions",
          body:
            "Beaucoup de carrés ou d'oppositions ne rendent pas une carte mauvaise; ils peuvent porter une forte force de croissance. L'essentiel est de voir comment vos décisions s'accélèrent et où le dialogue relationnel se déplace quand l'inconfort apparaît.",
        },
        {
          title: "4. Les transits sont des listes de préparation plus que des prédictions",
          body:
            "Le mouvement planétaire ne fixe pas l'issue; il montre les thèmes à regarder. Sous Saturne, responsabilité et structure priment; sous Jupiter, les occasions s'élargissent mais les promesses doivent être vérifiées. Préparer agenda, dépenses et conversations stabilise le transit.",
        },
        {
          title: "5. La compatibilité regarde la traduction du dialogue, pas un score",
          body:
            "En synastrie, l'erreur courante est de croire qu'un faible score termine la relation. Souvent, les langages émotionnels diffèrent seulement. Comparer le besoin de sécurité de la Lune de l'autre et la vitesse de votre Mars aide à réduire les conflits.",
        },
        {
          title: "6. L'interprétation cosmique s'achève par l'expérience hebdomadaire",
          body:
            "Après la lecture, expérimentez une semaine. Notez quand l'énergie baisse, quelle façon de parler adoucit le lien et quel environnement soutient la concentration. L'astrologie a sa plus grande valeur comme cadre d'observation et d'ajustement du rythme.",
        },
      ],
    },
    de: {
      title: "Astrologie Cosmic Chart - Sonne, Mond und Aszendent",
      h1: "Astrologie Cosmic Chart",
      description:
        "Ein Cosmic-Chart-Service, der Temperament und Beziehungsmuster über Sonnenzeichen, Mondzeichen und Aszendent der westlichen Astrologie liest.",
      landingPoints: ["Sonne-, Mond- und Aszendent-Deutung", "Chart im Cosmic-Stil", "Einblick in Beziehungsmuster"],
      seoText:
        "Der Astrology Cosmic Chart deutet Sonne, Mond und Aszendent aus Geburtsdaten, um Temperament, emotionale Muster und Ausdrucksstil zu verstehen.",
      valueGuideTitle: "6 Perspektiven, um den Cosmic Chart mit dem Leben zu verbinden",
      valueSections: [
        {
          title: "1. Die Sonne ist Ziel, der Mond Erholung, der Aszendent Ausdruck",
          body:
            "Astrologie bleibt flach, wenn sie auf ein Zeichen reduziert wird. Die Sonne zeigt langfristige Richtung, der Mond emotionale Reaktion unter Stress und der Aszendent die Art, wie du der Welt zuerst begegnest. Zusammen erklären sie konkrete Beziehungsmüdigkeit.",
        },
        {
          title: "2. Häuser sind Bühnen, Planeten sind Akteure",
          body:
            "Dieselbe Venus wirkt im 2. Haus anders als im 10. Haus. Häuser zeigen, wo Energie erscheint, Planeten mit welchem Ton sie dort handelt. Notiere nicht nur Planetendeutung, sondern wo, mit wem und wodurch sie sich zeigt.",
        },
        {
          title: "3. Aspekte sind Anpassungspunkte, keine Strafen",
          body:
            "Viele Quadrate oder Oppositionen machen keinen schlechten Chart. Sie können starke Wachstumskraft zeigen. Wichtig ist zu erkennen, wie deine Entscheidungen schneller werden und wo Gespräche kippen, wenn unbequeme Aspekte aktiv werden.",
        },
        {
          title: "4. Transite sind Vorbereitungsliste, keine Ereignisprophezeiung",
          body:
            "Planetenbewegung legt kein Ergebnis fest; sie zeigt Themen, die Aufmerksamkeit brauchen. Bei Saturn zählen Verantwortung und Struktur, bei Jupiter Chancen und Prüfung übergroßer Versprechen. Vorbereitete Termine, Ausgaben und Gespräche stabilisieren denselben Transit.",
        },
        {
          title: "5. Kompatibilität ist Übersetzung, nicht Chemiepunkte",
          body:
            "In Synastrie wird ein niedriger Wert oft fälschlich als Ende gelesen. Häufig sind nur emotionale Sprachen verschieden. Wenn du das Sicherheitsbedürfnis des Mondes der anderen Person mit dem Tempo deines Mars vergleichst, lässt sich Gesprächsreihenfolge anpassen.",
        },
        {
          title: "6. Cosmic-Deutung wird durch Wochenexperimente vollständig",
          body:
            "Experimentiere nach der Chartlesung eine Woche lang. Notiere, wann Energie fällt, welcher Gesprächsstil Beziehungen weicher macht und welche Arbeitsumgebung Fokus bringt. Astrologie ist am wertvollsten als Rahmen für Rhythmusbeobachtung und Anpassung.",
        },
      ],
    },
    nl: {
      title: "Astrologie Cosmic Chart - Zon, Maan en Ascendant",
      h1: "Astrologie Cosmic Chart",
      description:
        "Een cosmic chart-service die temperament en relatiepatronen leest via zonneteken, maanteken en ascendant binnen westerse astrologie.",
      landingPoints: ["Zon-, Maan- en Ascendantduiding", "Cosmic-stijl chart", "Inzicht in relatiepatronen"],
      seoText:
        "Astrology Cosmic Chart duidt Zon, Maan en Ascendant uit geboortegegevens om temperament, emotionele patronen en expressiestijl te begrijpen.",
      valueGuideTitle: "6 perspectieven om een Cosmic Chart met het leven te verbinden",
      valueSections: [
        {
          title: "1. De Zon is doel, de Maan herstel, de Ascendant expressie",
          body:
            "Astrologie blijft oppervlakkig als ze tot één teken wordt beperkt. De Zon toont lange richting, de Maan emotionele reactie onder stress, en de Ascendant hoe je jezelf eerst toont. Samen verklaren ze concrete vermoeidheid in relaties.",
        },
        {
          title: "2. Huizen zijn podia, planeten zijn acteurs",
          body:
            "Dezelfde Venus werkt anders in huis 2 dan in huis 10. Huizen tonen waar energie verschijnt; planeten tonen met welke toon. Schrijf niet alleen planeetbetekenissen op, maar ook waar, met wie en via wat de energie zichtbaar wordt.",
        },
        {
          title: "3. Aspecten zijn afstempunten, geen straf voor spanning",
          body:
            "Veel vierkanten of opposities maken geen slechte chart. Ze kunnen sterke groeikracht tonen. Belangrijk is te weten hoe beslissingen versnellen en waar gesprekken scheef lopen wanneer ongemakkelijke aspecten actief worden.",
        },
        {
          title: "4. Transits zijn voorbereidingslijsten, geen voorspellingen",
          body:
            "Planetaire beweging zet geen uitkomst vast; ze wijst thema's aan. Bij Saturnus tellen verantwoordelijkheid en structuur, bij Jupiter kansen en het toetsen van te grote beloften. Vooraf agenda, uitgaven en gesprekken bepalen maakt een transit stabieler.",
        },
        {
          title: "5. Compatibiliteit is communicatievertaling, geen chemiescore",
          body:
            "In synastrie wordt een lage score vaak verkeerd gelezen als het einde. Vaak zijn emotionele talen gewoon verschillend. Vergelijk de veiligheid die de Maan van de ander nodig heeft met de snelheid van jouw Mars om gesprekken beter te ordenen.",
        },
        {
          title: "6. Cosmic-duiding wordt compleet door weekexperimenten",
          body:
            "Experimenteer na de chartlezing één week. Noteer wanneer energie daalt, welke gesprekstijl relaties verzacht en welke werkomgeving focus geeft. Astrologie is het waardevolst als kader om je ritme te observeren en bij te sturen.",
        },
      ],
    },
    ms: {
      title: "Carta Cosmic astrologi - Analisis Matahari, Bulan dan Ascendant",
      h1: "Carta Cosmic astrologi",
      description:
        "Khidmat carta cosmic yang membaca perangai dan pola hubungan melalui tanda Matahari, tanda Bulan dan Ascendant dalam astrologi Barat.",
      landingPoints: ["Tafsiran Matahari, Bulan dan Ascendant", "Carta gaya cosmic", "Pemahaman pola hubungan"],
      seoText:
        "Astrology Cosmic Chart mentafsir Matahari, Bulan dan Ascendant daripada maklumat kelahiran untuk memahami perangai, pola emosi dan gaya ekspresi.",
      valueGuideTitle: "6 perspektif menghubungkan carta Cosmic dengan realiti",
      valueSections: [
        {
          title: "1. Matahari ialah tujuan, Bulan ialah pemulihan, Ascendant ialah ekspresi",
          body:
            "Astrologi menjadi cetek apabila dikurangkan kepada satu tanda. Matahari menunjukkan arah jangka panjang, Bulan reaksi emosi ketika tertekan, dan Ascendant cara anda muncul kepada dunia. Membaca ketiga-tiganya menjelaskan mengapa kemahuan kuat masih boleh letih dalam hubungan.",
        },
        {
          title: "2. Rumah ialah pentas, planet ialah pelakon",
          body:
            "Venus yang sama bekerja berbeza di rumah ke-2 dan rumah ke-10. Rumah menunjukkan bidang hidup tempat tenaga muncul, planet menunjukkan tona yang digunakan. Jangan hafal planet sahaja; catat di mana, dengan siapa dan melalui apa tenaga itu muncul.",
        },
        {
          title: "3. Aspek ialah titik pelarasan, bukan hukuman ketegangan",
          body:
            "Banyak square atau opposition tidak menjadikan carta buruk. Ia mungkin struktur dengan kuasa pertumbuhan tinggi. Yang penting ialah melihat bagaimana keputusan anda menjadi tergesa-gesa dan di mana perbualan hubungan tersasar apabila aspek tidak selesa muncul.",
        },
        {
          title: "4. Transit lebih dekat kepada senarai persediaan daripada ramalan peristiwa",
          body:
            "Pergerakan planet bukan suis yang menetapkan hasil; ia menunjukkan tema yang perlu diberi perhatian. Ketika tekanan Saturn kuat, tanggungjawab dan struktur perlu utama; ketika Jupiter mengembang, peluang boleh dibuka tetapi janji berlebihan perlu disemak.",
        },
        {
          title: "5. Keserasian melihat terjemahan komunikasi, bukan skor kimia",
          body:
            "Kesilapan biasa dalam synastry ialah menganggap skor rendah sebagai akhir hubungan. Selalunya bahasa emosi sahaja yang berbeza. Bandingkan cara Bulan pasangan memerlukan keselamatan dengan kelajuan Mars anda untuk menyusun semula urutan perbualan.",
        },
        {
          title: "6. Tafsiran cosmic lengkap melalui eksperimen mingguan",
          body:
            "Selepas membaca carta, cuba bereksperimen seminggu. Catat masa tenaga menurun, gaya perbualan yang melembutkan hubungan dan persekitaran kerja yang meningkatkan fokus. Astrologi paling bernilai sebagai rangka untuk memerhati dan melaras ritma diri.",
        },
      ],
    },
  },
  valueGuideTitle: "코즈믹 차트를 현실에 연결하는 6개 관점",
  valueSections: [
    {
      title: "1. 태양궁은 목표, 달궁은 회복, 상승궁은 표현입니다",
      body:
        "점성술을 한 줄 별자리로만 보면 설명이 얕아집니다. 태양궁은 내가 장기적으로 추구하는 방향, 달궁은 불안할 때의 정서 반응, 상승궁은 처음 만나는 사람에게 보이는 운영 방식을 보여줍니다. 이 세 축을 함께 읽어야 왜 의지는 강한데 관계에서 피곤해지는지 같은 실제 체감이 명확해집니다.",
    },
    {
      title: "2. 하우스는 사건의 무대, 행성은 행동의 배우입니다",
      body:
        "같은 금성이라도 2하우스와 10하우스에서 작동 방식이 다릅니다. 하우스는 어떤 삶의 영역에서 에너지가 드러나는지 설명하고, 행성은 그 영역을 어떤 톤으로 다루는지 알려줍니다. 차트를 볼 때 행성 의미만 단독으로 외우기보다 어디에서, 누구와, 무엇을 통해 발현되는지를 함께 적는 습관이 해석 정확도를 높입니다.",
    },
    {
      title: "3. 각은 긴장 신호가 아니라 조정 포인트입니다",
      body:
        "사각이나 대립이 많다고 반드시 나쁜 차트는 아닙니다. 오히려 성장 동력이 강한 구조일 수 있습니다. 중요한 것은 불편한 각이 생길 때 내 의사결정이 어떻게 급해지는지, 관계 대화가 어디에서 틀어지는지 패턴을 아는 것입니다. 각은 운명의 벌점이 아니라 조정이 필요한 작업 항목처럼 보는 것이 건강합니다.",
    },
    {
      title: "4. 트랜짓은 이벤트 예언보다 준비 체크리스트에 가깝습니다",
      body:
        "행성 이동은 결과를 확정하는 스위치가 아니라 집중해야 할 주제를 알려주는 신호입니다. 예를 들어 토성 압박기가 오면 책임과 구조 재정비가 우선이고, 목성 확장기는 기회를 넓히되 과장된 약속을 경계해야 합니다. 일정 관리, 지출 계획, 관계 대화 목표를 미리 정해두면 같은 트랜짓도 훨씬 안정적으로 통과합니다.",
    },
    {
      title: "5. 궁합은 케미 점수보다 소통 번역 능력을 봅니다",
      body:
        "시너스트리에서 자주 보는 실수는 점수가 낮으면 관계가 끝이라는 해석입니다. 실제로는 감정 표현 언어가 다를 뿐인 경우가 많습니다. 상대 달궁이 원하는 안정 방식, 내 화성이 밀어붙이는 속도를 비교해 대화 순서를 조정하면 갈등의 상당 부분이 줄어듭니다. 궁합은 판결보다 번역의 문제라는 관점이 실용적입니다.",
    },
    {
      title: "6. 코즈믹 해석은 주간 실험으로 완성됩니다",
      body:
        "차트 결과를 읽은 뒤 일주일만 실험해 보세요. 에너지가 떨어지는 시간대, 관계가 부드러워지는 대화 방식, 집중이 잘 되는 작업 환경을 기록하면 해석이 내 데이터로 바뀝니다. 점성술은 외부 운명을 기다리는 기술이 아니라 내 리듬을 관찰하고 조정하는 프레임으로 쓸 때 가장 높은 가치를 제공합니다.",
    },
  ],
};

export const metadata = withUniqueRouteMetadata("/astrology/cosmic", {
  title: "점성술 코즈믹 차트 - 태양·달·상승궁 분석",
  description:
    "서양 점성술의 태양궁, 달궁, 상승궁을 중심으로 성향과 관계 패턴을 읽는 코즈믹 차트 서비스.",
});

export default function AstroCosmicLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
