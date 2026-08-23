"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, normalizeLoadingLocale } from "@/constants/loadingMessages";
import GuideCta from "@/app/components/GuideCta";
import { GUIDE_CTA_TARGETS } from "@/app/components/guide-cta-targets";

const GUIDE_COPY = {
  ko: {
    title: "타로 카드 리딩 입문",
    intro:
      "타로는 미래를 고정하는 도구가 아니라, 질문자가 이미 느끼고 있던 감정과 선택의 갈림길을 카드의 상징으로 비추는 오래된 해석 체계입니다. 한 장의 그림 안에는 마음의 결, 관계의 온도, 지금 붙잡아야 할 현실 조언이 함께 숨어 있습니다.",
    cards: [
      ["타로가 살피는 것", "타로는 현재 마음의 결, 관계의 온도, 선택지가 품은 장단점, 지금 조심해야 할 태도와 감정의 방향을 함께 살핍니다. 카드는 답을 강요하지 않고, 질문자가 놓치고 있던 흐름을 상징으로 드러냅니다."],
      ["좋은 질문을 세우는 법", "타로 질문은 맞다·아니다보다 지금 무엇을 살펴야 하는지에 가까울수록 깊어집니다. 예를 들어 “그 사람이 돌아올까요?”보다 “이 관계에서 내가 확인해야 할 마음은 무엇인가요?”처럼 묻는 편이 더 차분한 리딩으로 이어집니다."],
      ["필요한 입력값", "질문 주제, 현재 상황, 선택지, 관계의 맥락이 카드 해석의 중심입니다. 이름이나 생년월일이 쓰이는 리딩도 있지만, 타로에서는 질문자가 놓인 장면과 마음의 방향이 해석을 가장 또렷하게 만듭니다."],
      ["무료와 유료 리딩의 범위", "무료 리딩은 한 가지 주제의 핵심 흐름과 바로 확인할 조언을 전합니다. 유료 리딩은 카드 배열, 위치별 의미, 카드 사이의 긴장과 조화, 상황별 행동 조언을 더 세밀하게 펼칩니다. 길이가 길다고 결정을 대신하는 것은 아니며, 불안을 압박하기 위한 장치도 아닙니다."],
    ],
    flowTitle: "해석 흐름",
    flowItems: [
      "질문을 현재 상황과 선택지 중심으로 차분히 정리합니다.",
      "카드의 상징, 정·역방향, 위치, 주변 카드와의 관계를 함께 읽습니다.",
      "좋고 나쁨을 단정하기보다 지금 드러난 감정, 태도, 가능성을 나누어 봅니다.",
      "리딩 끝에는 오늘 바로 확인할 수 있는 현실적 행동을 짧게 정리합니다.",
    ],
    resultTitle: "결과에서 확인할 수 있는 항목",
    resultItems: [
      "현재 마음의 결",
      "상대나 상황을 바라보는 관점",
      "선택지별 장단점",
      "주의해야 할 감정의 흐름",
      "지금 할 수 있는 작은 행동",
    ],
    sampleTitle: "짧은 예시 리딩",
    sample:
      "컵의 카드가 중심에 있고 검의 카드가 주변에 놓였다면, 마음의 온기는 남아 있지만 생각이 많아 대화의 문이 좁아진 흐름으로 읽을 수 있습니다. 지금은 감정을 증명하려 하기보다, 짧고 분명한 말로 서로의 부담을 낮추는 쪽이 더 부드럽게 열립니다.",
    cautionTitle: "해석 시 주의할 점",
    caution:
      "타로는 엔터테인먼트와 자기 성찰을 위한 참고 자료입니다. 건강, 법률, 투자, 결혼, 이혼, 소송, 진로처럼 삶에 큰 영향을 주는 결정은 카드 결과만으로 정하지 말고, 현실의 정보와 자격 있는 전문가의 조언을 함께 확인해야 합니다.",
    faqItems: [
      ["같은 질문을 여러 번 해도 되나요?", "짧은 시간 안에 같은 질문을 반복하면 카드보다 불안이 더 크게 들릴 수 있습니다. 상황이 바뀌었거나 새로운 정보가 생겼을 때 다시 보는 편이 리딩을 차분하게 받아들이는 데 좋습니다."],
      ["나쁜 카드가 나오면 나쁜 일이 생기나요?", "타로의 어두운 카드는 확정된 불운보다 멈춤, 점검, 관계의 긴장, 감정의 과열을 비추는 경우가 많습니다. 경고가 떠오를수록 현실적인 보호 행동을 함께 살피면 됩니다."],
      ["타로가 결정을 대신해 줄 수 있나요?", "타로는 선택의 분위기와 마음의 방향을 비추는 해석 도구입니다. 법률, 의료, 투자, 결혼, 이혼, 소송, 진로처럼 큰 결정은 타로만으로 정하지 않아야 합니다."],
    ],
    navLabel: "타로 가이드 관련 링크",
    navLinks: [
      ["/tarot", "타로 서비스"],
      ["/tarot/love", "연애 타로"],
      ["/tarot/reunion", "재회 타로"],
      ["/tarot/mindscan", "마음 읽기 타로"],
      ["/disclaimer", "면책 고지"],
      ["/editorial-policy", "콘텐츠 제작 원칙"],
    ],
  },
  en: {
    title: "Introduction to Tarot Card Reading",
    intro:
      "Tarot is not a device that fixes the future. It is a counseling language that reflects feelings and crossroads the seeker may already sense through symbols. Code Destiny turns the atmosphere of the cards into practical guidance, helping you see your own heart with more clarity.",
    cards: [
      ["What tarot looks at", "Tarot explores your current psychology, the temperature of a relationship, the strengths and limits of each option, and the attitudes or emotions that need care now. The cards do not force an answer; they reveal flows you may have missed through symbolic images."],
      ["How to ask a good question", "A tarot question grows deeper when it asks what needs to be noticed now, rather than demanding yes or no. Instead of asking whether someone will return, it is often healthier to ask what your heart needs to understand in this relationship."],
      ["Helpful input", "The topic, current situation, options, and relationship context are the core inputs. Some readings may ask for a name or birth date, but in tarot the context of the question often guides the interpretation more strongly."],
      ["Free and paid scopes", "Free readings offer the core flow of one topic and a short piece of advice. Paid readings unfold the spread, positional meaning, card relationships, and situation-specific action guidance in greater detail. Paid readings are not designed to pressure anxiety."],
    ],
    flowTitle: "Reading flow",
    flowItems: [
      "Shape the question around the current situation and available choices.",
      "Read the card symbols, positions, and relationships with nearby cards together.",
      "Separate emotions, attitudes, and possibilities instead of judging everything as good or bad.",
      "Close with a short practical action the seeker can check right away.",
    ],
    resultTitle: "What you can check in the result",
    resultItems: [
      "The texture of your current heart",
      "Your view of the person or situation",
      "Strengths and limits of each option",
      "Emotional flows that need care",
      "A small action you can take now",
    ],
    sampleTitle: "Short sample reading",
    sample:
      "If cups sit at the center and swords surround them, the feeling may still be connected, while overthinking narrows the door to conversation. Rather than proving emotion, a short and clear message can soften the pressure between both sides.",
    cautionTitle: "What to keep in mind",
    caution:
      "Tarot is a reference for entertainment and self-reflection. Decisions that deeply affect life, such as health, law, investment, marriage, divorce, litigation, or career, should not be made by card results alone. Check real information and qualified professional advice as well.",
    faqItems: [
      ["Can I ask the same question many times?", "Repeating the same question in a short time can increase anxiety. It is calmer to return when the situation changes or new information appears."],
      ["Do difficult cards mean something bad will happen?", "Darker cards often reflect pause, review, tension in a relationship, or emotional overheating rather than fixed misfortune. When a warning appears, look for realistic protective actions."],
      ["Can tarot make decisions for me?", "Tarot reflects the mood of a choice and the direction of the heart. Major decisions involving law, health, investment, marriage, divorce, litigation, or career should not be decided by tarot alone."],
    ],
    navLabel: "Related tarot guide links",
    navLinks: [
      ["/tarot", "Tarot Services"],
      ["/tarot/love", "Love Tarot"],
      ["/tarot/reunion", "Reunion Tarot"],
      ["/tarot/mindscan", "Mind Reading Tarot"],
      ["/disclaimer", "Disclaimer"],
      ["/editorial-policy", "Editorial Policy"],
    ],
  },
  ja: {
    title: "タロットカードリーディング入門",
    intro:
      "タロットは未来を決めつけるものではなく、相談者がすでに感じている気持ちや選択の分かれ道を象徴で映す相談の言葉です。Code Destinyのタロットリーディングは、カードの雰囲気を現実的な助言へと移し、自分の心を少し澄んだ目で見つめられるよう支えます。",
    cards: [
      ["タロットが見つめること", "タロットは今の心理、関係の温度、選択肢の長所と弱点、今気をつけたい態度や感情の流れを見つめます。カードは答えを押しつけず、見落としていた流れを象徴として浮かび上がらせます。"],
      ["よい質問の立て方", "タロットへの質問は、はい・いいえを求めるよりも、今の自分が何を見つめるべきかに近いほど深まります。たとえば「相手は戻りますか」より「この関係で私が確かめるべき気持ちは何ですか」と尋ねるほうが、健やかなリーディングにつながります。"],
      ["あるとよい入力内容", "質問テーマ、現在の状況、選択肢、関係の背景が大切な入力内容です。名前や生年月日を使うリーディングもありますが、タロットでは質問の文脈がカード解釈の方向を整えるうえでより重要です。"],
      ["無料と有料の範囲", "無料リーディングでは、ひとつのテーマの中心的な流れと短い助言をお伝えします。有料リーディングでは、スプレッド、位置ごとの意味、カード同士の関係、状況別の行動助言をより細やかに読み解きます。有料リーディングは不安をあおるためのものではありません。"],
    ],
    flowTitle: "リーディングの流れ",
    flowItems: [
      "質問を現在の状況と選択肢を中心に整えます。",
      "カードの象徴、位置、周囲のカードとの関係を合わせて読みます。",
      "良い・悪いと決めつけず、今浮かぶ感情、態度、可能性を分けて見ます。",
      "最後に、すぐ確認できる現実的な行動を短くまとめます。",
    ],
    resultTitle: "結果で確認できること",
    resultItems: [
      "今の心の質感",
      "相手や状況を見ている視点",
      "選択肢ごとの長所と弱点",
      "気をつけたい感情の流れ",
      "今できる小さな行動",
    ],
    sampleTitle: "短いリーディング例",
    sample:
      "カップのカードが中心にあり、周りにソードのカードが並ぶなら、気持ちはまだつながっているものの、考えすぎによって対話の扉が狭くなっている流れとして読めます。今は感情を証明しようとするより、短くはっきりした言葉で互いの負担を軽くするほうが、やわらかく開いていきます。",
    cautionTitle: "解釈するときの注意",
    caution:
      "タロットは娯楽と自己洞察のための参考です。健康、法律、投資、結婚、離婚、訴訟、進路など人生に大きく関わる決定は、カードの結果だけで決めず、現実の情報と資格ある専門家の助言も必ず確認してください。",
    faqItems: [
      ["同じ質問を何度も占ってもいいですか？", "短い時間で同じ質問を繰り返すと、不安が強くなることがあります。状況が変わったとき、または新しい情報が出たときにもう一度見るほうが、落ち着いて受け取れます。"],
      ["怖いカードが出ると悪いことが起きますか？", "タロットの暗いカードは、決まった不運よりも、停止、点検、関係の緊張、感情の高まりを映すことが多いです。警告が出たときほど、現実的な守りの行動を一緒に見ていきます。"],
      ["タロットに決断を任せてもいいですか？", "タロットは選択の空気と心の向きを映す相談の道具です。法律、医療、投資、結婚、離婚、訴訟、進路のような大きな決定は、タロットだけで決めないでください。"],
    ],
    navLabel: "タロットガイド関連リンク",
    navLinks: [
      ["/tarot", "タロットサービス"],
      ["/tarot/love", "恋愛タロット"],
      ["/tarot/reunion", "復縁タロット"],
      ["/tarot/mindscan", "相手の気持ちタロット"],
      ["/disclaimer", "免責事項"],
      ["/editorial-policy", "コンテンツ制作方針"],
    ],
  },
  "zh-CN": {
    title: "塔罗牌解读入门",
    intro:
      "塔罗并不是用来断定未来的工具，而是一种用象征映照提问者早已感受到的情绪与选择分岔的咨询语言。Code Destiny 的塔罗解读会把牌面的气氛转化为现实可用的建议，帮助你更清楚地看见自己的心。",
    cards: [
      ["塔罗会观察什么", "塔罗会观察当下心理、关系温度、各个选择的优劣，以及现在需要留意的态度和情绪方向。牌不会强迫你接受答案，而是用象征显现你可能忽略的流动。"],
      ["如何提出好的问题", "塔罗问题越接近“现在我该看见什么”，越能深入；比起问“那个人会回来吗”，问“在这段关系里，我需要确认自己的哪份心意”通常更能带来健康的解读。"],
      ["需要提供的信息", "问题主题、当前状况、选择项和关系背景是核心信息。有些解读会使用姓名或出生日期，但在塔罗中，问题的脉络更能引导牌义的方向。"],
      ["免费与付费范围", "免费解读提供一个主题的核心流向和简短建议。付费解读会更细致地展开牌阵、位置含义、牌与牌之间的关系，以及适合当前情况的行动建议。付费解读不是为了制造焦虑。"],
    ],
    flowTitle: "解读流程",
    flowItems: [
      "先围绕当前状况和可选方向整理问题。",
      "结合牌面象征、位置和周围牌的关系一起阅读。",
      "不急着判断好坏，而是区分此刻显现的情绪、态度与可能性。",
      "最后整理一条提问者马上可以确认的现实行动。",
    ],
    resultTitle: "结果中可以确认的内容",
    resultItems: [
      "当下内心的质感",
      "你看待对方或局势的角度",
      "各个选择的优点与限制",
      "需要留意的情绪流向",
      "现在可以做的小行动",
    ],
    sampleTitle: "简短解读示例",
    sample:
      "如果圣杯牌位于中心，而宝剑牌围绕在旁，可以读作情感仍有连接，但过多思考让对话的门变窄。此时与其证明情绪，不如用简短清楚的话减轻彼此负担，关系会更柔和地打开。",
    cautionTitle: "解读时需要留意",
    caution:
      "塔罗是用于娱乐与自我省察的参考。健康、法律、投资、婚姻、离婚、诉讼、职业等会深刻影响人生的决定，不应只根据牌面结果决定，也请结合现实信息和合格专业人士的建议。",
    faqItems: [
      ["同一个问题可以问很多次吗？", "短时间内反复询问同一个问题，可能会让焦虑变大。等状况改变或出现新信息时再看，会更容易平稳接收解读。"],
      ["出现不好的牌就代表坏事会发生吗？", "塔罗中较暗的牌，更多时候映照的是暂停、检查、关系紧张或情绪过热，而不是确定的不幸。越是出现提醒，越要一起看见现实中的保护行动。"],
      ["塔罗可以替我做决定吗？", "塔罗是映照选择氛围与内心方向的咨询工具。法律、医疗、投资、婚姻、离婚、诉讼、职业等重大决定，不应只由塔罗决定。"],
    ],
    navLabel: "塔罗指南相关链接",
    navLinks: [
      ["/tarot", "塔罗服务"],
      ["/tarot/love", "爱情塔罗"],
      ["/tarot/reunion", "复合塔罗"],
      ["/tarot/mindscan", "心意读取塔罗"],
      ["/disclaimer", "免责声明"],
      ["/editorial-policy", "内容制作原则"],
    ],
  },
  "zh-TW": {
    title: "塔羅牌解讀入門",
    intro:
      "塔羅不是用來斷定未來的工具，而是一種用象徵映照提問者早已感受到的情緒與選擇分岔的諮詢語言。Code Destiny 的塔羅解讀會把牌面的氣氛轉化為現實可用的建議，幫助你更清楚地看見自己的心。",
    cards: [
      ["塔羅會觀察什麼", "塔羅會觀察當下心理、關係溫度、各個選擇的優劣，以及現在需要留意的態度和情緒方向。牌不會強迫你接受答案，而是用象徵顯現你可能忽略的流動。"],
      ["如何提出好的問題", "塔羅問題越接近「現在我該看見什麼」，越能深入；比起問「那個人會回來嗎」，問「在這段關係裡，我需要確認自己的哪份心意」通常更能帶來健康的解讀。"],
      ["需要提供的資訊", "問題主題、目前狀況、選項和關係背景是核心資訊。有些解讀會使用姓名或出生日期，但在塔羅中，問題的脈絡更能引導牌義的方向。"],
      ["免費與付費範圍", "免費解讀提供一個主題的核心流向和簡短建議。付費解讀會更細緻地展開牌陣、位置含義、牌與牌之間的關係，以及適合當前情況的行動建議。付費解讀不是為了製造焦慮。"],
    ],
    flowTitle: "解讀流程",
    flowItems: [
      "先圍繞目前狀況和可選方向整理問題。",
      "結合牌面象徵、位置和周圍牌的關係一起閱讀。",
      "不急著判斷好壞，而是區分此刻顯現的情緒、態度與可能性。",
      "最後整理一條提問者馬上可以確認的現實行動。",
    ],
    resultTitle: "結果中可以確認的內容",
    resultItems: [
      "當下內心的質感",
      "你看待對方或局勢的角度",
      "各個選擇的優點與限制",
      "需要留意的情緒流向",
      "現在可以做的小行動",
    ],
    sampleTitle: "簡短解讀示例",
    sample:
      "如果聖杯牌位於中心，而寶劍牌圍繞在旁，可以讀作情感仍有連結，但過多思考讓對話的門變窄。此時與其證明情緒，不如用簡短清楚的話減輕彼此負擔，關係會更柔和地打開。",
    cautionTitle: "解讀時需要留意",
    caution:
      "塔羅是用於娛樂與自我省察的參考。健康、法律、投資、婚姻、離婚、訴訟、職涯等會深刻影響人生的決定，不應只根據牌面結果決定，也請結合現實資訊和合格專業人士的建議。",
    faqItems: [
      ["同一個問題可以問很多次嗎？", "短時間內反覆詢問同一個問題，可能會讓焦慮變大。等狀況改變或出現新資訊時再看，會更容易平穩接收解讀。"],
      ["出現不好的牌就代表壞事會發生嗎？", "塔羅中較暗的牌，更多時候映照的是暫停、檢查、關係緊張或情緒過熱，而不是確定的不幸。越是出現提醒，越要一起看見現實中的保護行動。"],
      ["塔羅可以替我做決定嗎？", "塔羅是映照選擇氛圍與內心方向的諮詢工具。法律、醫療、投資、婚姻、離婚、訴訟、職涯等重大決定，不應只由塔羅決定。"],
    ],
    navLabel: "塔羅指南相關連結",
    navLinks: [
      ["/tarot", "塔羅服務"],
      ["/tarot/love", "愛情塔羅"],
      ["/tarot/reunion", "復合塔羅"],
      ["/tarot/mindscan", "心意讀取塔羅"],
      ["/disclaimer", "免責聲明"],
      ["/editorial-policy", "內容製作原則"],
    ],
  },
  vi: {
    title: "Nhập môn đọc bài tarot",
    intro:
      "Tarot không phải là công cụ đóng đinh tương lai. Đó là ngôn ngữ tư vấn dùng biểu tượng để soi lại cảm xúc và ngã rẽ lựa chọn mà người hỏi có thể đã cảm nhận. Tarot của Code Destiny chuyển bầu khí của lá bài thành lời khuyên thực tế, giúp bạn nhìn trái tim mình rõ hơn.",
    cards: [
      ["Tarot quan sát điều gì", "Tarot nhìn vào tâm lý hiện tại, nhiệt độ của mối quan hệ, điểm mạnh và giới hạn của từng lựa chọn, cùng thái độ hoặc cảm xúc cần chăm sóc lúc này. Lá bài không ép bạn nhận một đáp án; chúng làm hiện lên dòng chảy bạn có thể đã bỏ lỡ."],
      ["Cách đặt câu hỏi tốt", "Câu hỏi tarot sẽ sâu hơn khi gần với điều bạn cần nhìn thấy bây giờ, thay vì chỉ hỏi đúng hay sai. Thay vì hỏi người ấy có quay lại không, hỏi trong mối quan hệ này mình cần xác nhận cảm xúc nào thường dẫn đến một trải bài lành mạnh hơn."],
      ["Thông tin nên có", "Chủ đề câu hỏi, tình huống hiện tại, lựa chọn và bối cảnh quan hệ là thông tin cốt lõi. Một số trải bài có thể cần tên hoặc ngày sinh, nhưng với tarot, bối cảnh của câu hỏi thường quan trọng hơn trong việc định hướng giải nghĩa."],
      ["Phạm vi miễn phí và trả phí", "Bài đọc miễn phí cung cấp dòng chảy chính của một chủ đề và lời khuyên ngắn. Bài đọc trả phí mở rộng trải bài, ý nghĩa vị trí, quan hệ giữa các lá và lời khuyên hành động theo tình huống. Trả phí không phải để gây áp lực lên nỗi lo."],
    ],
    flowTitle: "Dòng chảy giải nghĩa",
    flowItems: [
      "Sắp xếp câu hỏi quanh tình huống hiện tại và các lựa chọn.",
      "Đọc biểu tượng, vị trí và quan hệ với các lá xung quanh cùng nhau.",
      "Tách cảm xúc, thái độ và khả năng đang hiện ra thay vì phán xét tốt xấu.",
      "Kết lại bằng một hành động thực tế mà người hỏi có thể kiểm tra ngay.",
    ],
    resultTitle: "Điều có thể kiểm tra trong kết quả",
    resultItems: [
      "Kết cấu cảm xúc hiện tại",
      "Góc nhìn của bạn về người hoặc tình huống",
      "Điểm mạnh và giới hạn của từng lựa chọn",
      "Dòng cảm xúc cần chú ý",
      "Một hành động nhỏ có thể làm ngay",
    ],
    sampleTitle: "Ví dụ đọc ngắn",
    sample:
      "Nếu các lá Cốc ở trung tâm và các lá Kiếm nằm xung quanh, cảm xúc có thể vẫn còn kết nối nhưng suy nghĩ quá nhiều đang làm cánh cửa đối thoại hẹp lại. Lúc này, thay vì cố chứng minh cảm xúc, một lời ngắn gọn và rõ ràng sẽ giúp giảm gánh nặng cho cả hai bên.",
    cautionTitle: "Điều cần lưu ý khi diễn giải",
    caution:
      "Tarot là nội dung tham khảo cho giải trí và tự suy ngẫm. Những quyết định ảnh hưởng lớn đến đời sống như sức khỏe, pháp lý, đầu tư, hôn nhân, ly hôn, kiện tụng hoặc nghề nghiệp không nên chỉ dựa vào kết quả lá bài. Hãy kiểm tra thông tin thực tế và lời khuyên của chuyên gia đủ năng lực.",
    faqItems: [
      ["Có nên hỏi cùng một câu nhiều lần không?", "Lặp lại cùng một câu hỏi trong thời gian ngắn có thể làm nỗi lo tăng lên. Sẽ bình ổn hơn khi quay lại sau khi tình huống thay đổi hoặc có thông tin mới."],
      ["Lá bài khó có nghĩa là chuyện xấu sẽ xảy ra?", "Những lá tối thường phản ánh sự tạm dừng, kiểm tra, căng thẳng quan hệ hoặc cảm xúc quá nhiệt, hơn là bất hạnh cố định. Khi có cảnh báo, hãy nhìn thêm hành động bảo vệ thực tế."],
      ["Tarot có thể quyết định thay tôi không?", "Tarot phản chiếu bầu khí của lựa chọn và hướng đi của trái tim. Các quyết định lớn về pháp lý, y tế, đầu tư, hôn nhân, ly hôn, kiện tụng hoặc nghề nghiệp không nên chỉ dựa vào tarot."],
    ],
    navLabel: "Liên kết hướng dẫn tarot liên quan",
    navLinks: [
      ["/tarot", "Dịch vụ tarot"],
      ["/tarot/love", "Tarot tình yêu"],
      ["/tarot/reunion", "Tarot tái hợp"],
      ["/tarot/mindscan", "Tarot đọc tâm ý"],
      ["/disclaimer", "Miễn trừ trách nhiệm"],
      ["/editorial-policy", "Nguyên tắc biên tập"],
    ],
  },
  hi: {
    title: "Tarot Card Reading की शुरुआत",
    intro:
      "टैरो भविष्य को पक्का तय करने वाला साधन नहीं है। यह प्रतीकों के ज़रिए उन भावों और चुनावों के मोड़ को दिखाने वाली परामर्श भाषा है जिन्हें पूछने वाला भीतर से पहले ही महसूस कर रहा होता है। Code Destiny का टैरो कार्डों के वातावरण को व्यावहारिक सलाह में बदलता है, ताकि आप अपने मन को थोड़ा और साफ देख सकें।",
    cards: [
      ["टैरो क्या देखता है", "टैरो वर्तमान मनःस्थिति, संबंध का तापमान, हर विकल्प की ताकत और सीमा, और अभी संभालने योग्य रवैये या भावनात्मक दिशा को देखता है। कार्ड उत्तर थोपते नहीं; वे प्रतीकों में वह प्रवाह दिखाते हैं जिसे आप नज़रअंदाज़ कर रहे हों।"],
      ["अच्छा सवाल कैसे पूछें", "टैरो का प्रश्न जितना इस बात के करीब होता है कि अभी मुझे क्या देखना चाहिए, उतना गहरा होता है। यह पूछने के बजाय कि क्या वह व्यक्ति लौटेगा, यह पूछना कि इस संबंध में मुझे अपने कौन से भाव को समझना है अधिक स्वस्थ रीडिंग देता है।"],
      ["ज़रूरी जानकारी", "प्रश्न का विषय, मौजूदा स्थिति, विकल्प और संबंध का संदर्भ मुख्य जानकारी हैं। कुछ रीडिंग में नाम या जन्मतिथि ली जा सकती है, पर टैरो में प्रश्न का संदर्भ व्याख्या की दिशा तय करने में अधिक महत्त्वपूर्ण होता है।"],
      ["मुफ्त और paid दायरा", "मुफ्त रीडिंग एक विषय का मुख्य प्रवाह और छोटी सलाह देती है। Paid रीडिंग spread, position meaning, cards के संबंध और स्थिति के अनुसार action guidance को विस्तार से खोलती है। Paid रीडिंग चिंता पर दबाव डालने के लिए नहीं है।"],
    ],
    flowTitle: "रीडिंग का प्रवाह",
    flowItems: [
      "प्रश्न को वर्तमान स्थिति और विकल्पों के आधार पर व्यवस्थित करें।",
      "कार्ड के प्रतीक, स्थान और पास के कार्डों से संबंध को साथ पढ़ें।",
      "सब कुछ अच्छा या बुरा ठहराने के बजाय भाव, रवैया और संभावना को अलग-अलग देखें।",
      "अंत में एक छोटा व्यावहारिक कदम रखें जिसे तुरंत परखा जा सके।",
    ],
    resultTitle: "नतीजे में क्या देखा जा सकता है",
    resultItems: [
      "वर्तमान मन की बनावट",
      "व्यक्ति या स्थिति को देखने का आपका दृष्टिकोण",
      "हर विकल्प की ताकत और सीमा",
      "ध्यान देने योग्य भावनात्मक प्रवाह",
      "अभी किया जा सकने वाला छोटा कदम",
    ],
    sampleTitle: "छोटी उदाहरण रीडिंग",
    sample:
      "यदि Cups कार्ड केंद्र में हों और Swords आसपास हों, तो भावना अभी भी जुड़ी हो सकती है, पर अधिक सोच बातचीत का दरवाज़ा संकरा कर रही है। अभी भावनाओं को साबित करने से बेहतर है कि छोटे और साफ शब्दों से दोनों तरफ का दबाव हल्का किया जाए।",
    cautionTitle: "व्याख्या में ध्यान रखने योग्य बात",
    caution:
      "टैरो मनोरंजन और आत्मचिंतन के लिए संदर्भ है। स्वास्थ्य, कानून, निवेश, विवाह, तलाक, मुकदमा या करियर जैसे जीवन पर बड़े असर वाले निर्णय केवल कार्ड परिणामों से न लें। वास्तविक जानकारी और योग्य विशेषज्ञ की सलाह भी ज़रूर देखें।",
    faqItems: [
      ["क्या एक ही प्रश्न कई बार पूछ सकते हैं?", "कम समय में वही प्रश्न बार-बार पूछने से चिंता बढ़ सकती है। स्थिति बदलने या नई जानकारी आने पर लौटना अधिक शांत रहता है।"],
      ["कठिन कार्ड आने से बुरा ही होगा?", "गहरे कार्ड अक्सर तय दुर्भाग्य नहीं, बल्कि ठहराव, जाँच, संबंध तनाव या भावनात्मक गर्मी दिखाते हैं। चेतावनी आए तो वास्तविक सुरक्षा कदम भी देखें।"],
      ["क्या टैरो मेरे लिए निर्णय ले सकता है?", "टैरो चुनाव की हवा और मन की दिशा दिखाने वाला परामर्श साधन है। कानून, चिकित्सा, निवेश, विवाह, तलाक, मुकदमे या करियर जैसे बड़े निर्णय केवल टैरो से न लें।"],
    ],
    navLabel: "संबंधित tarot guide links",
    navLinks: [
      ["/tarot", "Tarot Services"],
      ["/tarot/love", "Love Tarot"],
      ["/tarot/reunion", "Reunion Tarot"],
      ["/tarot/mindscan", "Mind Reading Tarot"],
      ["/disclaimer", "Disclaimer"],
      ["/editorial-policy", "Editorial Policy"],
    ],
  },
  es: {
    title: "Introducción a la lectura de cartas del tarot",
    intro:
      "El tarot no fija el futuro. Es un lenguaje de consulta que refleja, mediante símbolos, emociones y cruces de elección que la persona quizá ya sentía. Las lecturas de Code Destiny convierten la atmósfera de las cartas en orientación práctica, para que puedas mirar tu corazón con más claridad.",
    cards: [
      ["Qué observa el tarot", "El tarot observa la psicología actual, la temperatura de una relación, las ventajas y límites de cada opción, y las actitudes o emociones que conviene cuidar ahora. Las cartas no imponen una respuesta; muestran de forma simbólica flujos que quizá pasaban desapercibidos."],
      ["Cómo formular una buena pregunta", "Una pregunta de tarot se vuelve más profunda cuando se acerca a lo que necesitas mirar ahora, en vez de exigir un sí o un no. En lugar de preguntar si esa persona volverá, suele ser más sano preguntar qué emoción necesitas reconocer en esa relación."],
      ["Datos útiles", "El tema, la situación actual, las opciones y el contexto de la relación son los datos centrales. Algunas lecturas pueden pedir nombre o fecha de nacimiento, pero en tarot el contexto de la pregunta orienta con más fuerza la interpretación."],
      ["Alcance gratis y de pago", "Las lecturas gratis ofrecen el flujo central de un tema y un consejo breve. Las lecturas de pago desarrollan la tirada, el significado de cada posición, la relación entre cartas y la orientación de acción con más detalle. No están hechas para presionar la ansiedad."],
    ],
    flowTitle: "Flujo de interpretación",
    flowItems: [
      "Ordena la pregunta alrededor de la situación actual y las opciones disponibles.",
      "Lee juntos los símbolos, posiciones y relaciones con las cartas cercanas.",
      "Distingue emociones, actitudes y posibilidades sin encerrarlo todo en bueno o malo.",
      "Cierra con una acción práctica breve que pueda comprobarse de inmediato.",
    ],
    resultTitle: "Qué puedes revisar en el resultado",
    resultItems: [
      "La textura actual del corazón",
      "Tu forma de mirar a la persona o situación",
      "Ventajas y límites de cada opción",
      "Flujos emocionales que requieren cuidado",
      "Una pequeña acción posible ahora",
    ],
    sampleTitle: "Ejemplo breve de lectura",
    sample:
      "Si las cartas de copas están en el centro y las espadas alrededor, el sentimiento puede seguir conectado, aunque el exceso de pensamientos estrecha la puerta del diálogo. Ahora, más que demostrar emociones, un mensaje breve y claro puede aliviar la carga entre ambas partes.",
    cautionTitle: "Qué tener en cuenta",
    caution:
      "El tarot es una referencia para entretenimiento y autoobservación. Decisiones que afectan profundamente la vida, como salud, leyes, inversión, matrimonio, divorcio, litigios o carrera, no deben tomarse solo por el resultado de las cartas. Consulta también información real y asesoría profesional cualificada.",
    faqItems: [
      ["¿Puedo hacer la misma pregunta muchas veces?", "Repetir una pregunta en poco tiempo puede aumentar la ansiedad. Es más sereno volver cuando la situación cambia o aparece nueva información."],
      ["¿Una carta difícil significa que pasará algo malo?", "Las cartas oscuras suelen reflejar pausa, revisión, tensión relacional o emoción sobrecalentada más que una desgracia fija. Cuando aparece una advertencia, conviene mirar acciones protectoras reales."],
      ["¿El tarot puede decidir por mí?", "El tarot refleja el clima de una elección y la dirección del corazón. Las grandes decisiones legales, médicas, financieras, matrimoniales, judiciales o profesionales no deben depender solo del tarot."],
    ],
    navLabel: "Enlaces relacionados con la guía de tarot",
    navLinks: [
      ["/tarot", "Servicios de tarot"],
      ["/tarot/love", "Tarot del amor"],
      ["/tarot/reunion", "Tarot de reconciliación"],
      ["/tarot/mindscan", "Tarot de lectura emocional"],
      ["/disclaimer", "Aviso legal"],
      ["/editorial-policy", "Política editorial"],
    ],
  },
  fr: {
    title: "Introduction à la lecture des cartes de tarot",
    intro:
      "Le tarot ne fixe pas l'avenir. C'est un langage de consultation qui reflète, par les symboles, les émotions et les carrefours que la personne ressent peut-être déjà. Les lectures de Code Destiny transforment l'atmosphère des cartes en conseils concrets, pour vous aider à regarder votre coeur avec plus de clarté.",
    cards: [
      ["Ce que le tarot observe", "Le tarot observe l'état psychologique actuel, la température d'une relation, les forces et limites de chaque option, ainsi que les attitudes ou émotions à surveiller maintenant. Les cartes n'imposent pas de réponse ; elles révèlent symboliquement des courants peut-être oubliés."],
      ["Comment poser une bonne question", "Une question de tarot devient plus profonde lorsqu'elle demande ce qui doit être regardé maintenant, plutôt qu'un simple oui ou non. Au lieu de demander si une personne reviendra, il est souvent plus sain de demander quel sentiment vous devez comprendre dans cette relation."],
      ["Informations utiles", "Le thème, la situation actuelle, les options et le contexte relationnel sont les informations centrales. Certaines lectures peuvent demander un nom ou une date de naissance, mais en tarot, le contexte de la question guide souvent plus fortement l'interprétation."],
      ["Portée gratuite et payante", "Les lectures gratuites donnent le courant central d'un thème et un conseil bref. Les lectures payantes détaillent le tirage, le sens des positions, les relations entre cartes et les conseils d'action adaptés à la situation. Elles ne sont pas conçues pour nourrir l'anxiété."],
    ],
    flowTitle: "Déroulé de lecture",
    flowItems: [
      "Formulez la question autour de la situation actuelle et des choix possibles.",
      "Lisez ensemble les symboles, positions et liens avec les cartes voisines.",
      "Distinguez émotions, attitudes et possibilités sans tout réduire au bon ou au mauvais.",
      "Terminez par une action concrète et courte que la personne peut vérifier rapidement.",
    ],
    resultTitle: "Ce que le résultat permet de vérifier",
    resultItems: [
      "La texture actuelle du coeur",
      "Votre manière de regarder la personne ou la situation",
      "Les forces et limites de chaque option",
      "Les courants émotionnels à surveiller",
      "Une petite action possible maintenant",
    ],
    sampleTitle: "Court exemple de lecture",
    sample:
      "Si les coupes sont au centre et les épées autour, le lien émotionnel peut encore exister, mais trop de pensées rétrécissent la porte du dialogue. À présent, plutôt que de prouver l'émotion, quelques mots courts et clairs peuvent alléger la pression entre les deux côtés.",
    cautionTitle: "Points d'attention",
    caution:
      "Le tarot est une référence pour le divertissement et l'introspection. Les décisions qui influencent profondément la vie, comme la santé, le droit, l'investissement, le mariage, le divorce, les litiges ou la carrière, ne doivent pas être prises uniquement selon les cartes. Vérifiez aussi les faits et l'avis de professionnels qualifiés.",
    faqItems: [
      ["Puis-je poser plusieurs fois la même question ?", "Répéter la même question en peu de temps peut augmenter l'anxiété. Il est plus calme d'y revenir quand la situation change ou lorsqu'une nouvelle information apparaît."],
      ["Une carte difficile annonce-t-elle un mauvais événement ?", "Les cartes sombres reflètent souvent une pause, un examen, une tension relationnelle ou une émotion trop vive, plutôt qu'un malheur fixé. Lorsqu'un avertissement apparaît, cherchez aussi des actions protectrices concrètes."],
      ["Le tarot peut-il décider à ma place ?", "Le tarot reflète l'atmosphère d'un choix et la direction du coeur. Les grandes décisions juridiques, médicales, financières, conjugales, judiciaires ou professionnelles ne doivent pas dépendre du tarot seul."],
    ],
    navLabel: "Liens liés au guide du tarot",
    navLinks: [
      ["/tarot", "Services de tarot"],
      ["/tarot/love", "Tarot amoureux"],
      ["/tarot/reunion", "Tarot de réconciliation"],
      ["/tarot/mindscan", "Tarot des sentiments"],
      ["/disclaimer", "Avertissement"],
      ["/editorial-policy", "Politique éditoriale"],
    ],
  },
  de: {
    title: "Einführung in das Tarotkarten-Lesen",
    intro:
      "Tarot legt die Zukunft nicht fest. Es ist eine Beratungssprache, die Gefühle und Weggabelungen, die der Fragende vielleicht bereits spürt, durch Symbole spiegelt. Die Tarot-Lesungen von Code Destiny übertragen die Stimmung der Karten in praktische Hinweise, damit du dein Herz klarer betrachten kannst.",
    cards: [
      ["Was Tarot betrachtet", "Tarot betrachtet die aktuelle Psyche, die Temperatur einer Beziehung, Stärken und Grenzen jeder Option sowie Haltungen oder Gefühle, die jetzt Aufmerksamkeit brauchen. Die Karten erzwingen keine Antwort; sie zeigen symbolisch Strömungen, die vielleicht übersehen wurden."],
      ["Wie man eine gute Frage stellt", "Eine Tarotfrage wird tiefer, wenn sie fragt, was jetzt gesehen werden muss, statt nur Ja oder Nein zu verlangen. Statt zu fragen, ob jemand zurückkommt, ist es oft gesünder zu fragen, welches Gefühl du in dieser Beziehung verstehen solltest."],
      ["Hilfreiche Angaben", "Thema, aktuelle Situation, Optionen und Beziehungskontext sind die wichtigsten Angaben. Manche Lesungen fragen nach Name oder Geburtsdatum, doch im Tarot führt der Kontext der Frage die Deutung meist stärker."],
      ["Kostenloser und bezahlter Umfang", "Kostenlose Lesungen geben den Kernfluss eines Themas und einen kurzen Rat. Bezahlte Lesungen entfalten Legung, Positionsbedeutung, Kartenbeziehungen und situationsbezogene Handlungshinweise genauer. Sie sind nicht dafür da, Angst zu verstärken."],
    ],
    flowTitle: "Ablauf der Deutung",
    flowItems: [
      "Forme die Frage um die aktuelle Situation und mögliche Entscheidungen.",
      "Lies Symbole, Positionen und Beziehungen zu nahen Karten zusammen.",
      "Trenne Gefühle, Haltungen und Möglichkeiten, statt alles als gut oder schlecht zu bewerten.",
      "Schließe mit einer kurzen praktischen Handlung, die sofort überprüft werden kann.",
    ],
    resultTitle: "Was im Ergebnis sichtbar wird",
    resultItems: [
      "Die aktuelle Struktur deines Herzens",
      "Dein Blick auf die Person oder Situation",
      "Stärken und Grenzen jeder Option",
      "Emotionale Strömungen, die Aufmerksamkeit brauchen",
      "Eine kleine Handlung, die jetzt möglich ist",
    ],
    sampleTitle: "Kurzes Lesebeispiel",
    sample:
      "Wenn Kelchkarten im Zentrum liegen und Schwerter sie umgeben, kann das Gefühl noch verbunden sein, während zu viel Denken die Tür zum Gespräch verengt. Jetzt kann eine kurze, klare Nachricht den Druck auf beiden Seiten sanfter lösen als der Versuch, Gefühle zu beweisen.",
    cautionTitle: "Worauf zu achten ist",
    caution:
      "Tarot ist eine Referenz für Unterhaltung und Selbstreflexion. Entscheidungen mit großem Einfluss auf das Leben, etwa Gesundheit, Recht, Investment, Ehe, Scheidung, Prozesse oder Karriere, sollten nicht allein nach Kartenergebnissen getroffen werden. Prüfe auch reale Informationen und qualifizierte fachliche Beratung.",
    faqItems: [
      ["Kann ich dieselbe Frage mehrmals stellen?", "Dieselbe Frage in kurzer Zeit zu wiederholen, kann Angst verstärken. Ruhiger ist es, zurückzukehren, wenn sich die Situation verändert oder neue Informationen auftauchen."],
      ["Bedeutet eine schwierige Karte, dass etwas Schlechtes passiert?", "Dunklere Karten spiegeln oft Pause, Überprüfung, Beziehungsspannung oder emotionale Überhitzung statt festes Unglück. Wenn eine Warnung erscheint, achte auch auf realistische Schutzhandlungen."],
      ["Kann Tarot für mich entscheiden?", "Tarot spiegelt die Atmosphäre einer Wahl und die Richtung des Herzens. Große Entscheidungen zu Recht, Medizin, Investment, Ehe, Scheidung, Prozessen oder Karriere sollten nicht allein vom Tarot abhängen."],
    ],
    navLabel: "Verwandte Links zum Tarot-Guide",
    navLinks: [
      ["/tarot", "Tarot-Services"],
      ["/tarot/love", "Liebestarot"],
      ["/tarot/reunion", "Wiedervereinigungs-Tarot"],
      ["/tarot/mindscan", "Gefühlstarot"],
      ["/disclaimer", "Haftungsausschluss"],
      ["/editorial-policy", "Redaktionelle Richtlinie"],
    ],
  },
  nl: {
    title: "Introductie tot tarotkaartlezing",
    intro:
      "Tarot legt de toekomst niet vast. Het is een consultatieve taal die gevoelens en kruispunten die de vrager misschien al voelt via symbolen weerspiegelt. De tarotlezingen van Code Destiny vertalen de sfeer van de kaarten naar praktisch advies, zodat je je hart helderder kunt bekijken.",
    cards: [
      ["Waar tarot naar kijkt", "Tarot kijkt naar de huidige psyche, de temperatuur van een relatie, de sterke en zwakke kanten van opties, en houdingen of emoties die nu aandacht vragen. Kaarten dwingen geen antwoord af; ze tonen symbolisch stromen die je mogelijk hebt gemist."],
      ["Hoe je een goede vraag stelt", "Een tarotvraag wordt dieper wanneer ze vraagt wat nu gezien moet worden, in plaats van alleen ja of nee te eisen. In plaats van te vragen of iemand terugkomt, is het vaak gezonder te vragen welke emotie je in deze relatie moet begrijpen."],
      ["Nuttige input", "Het onderwerp, de huidige situatie, opties en relatiecontext zijn de kern. Sommige lezingen gebruiken een naam of geboortedatum, maar in tarot stuurt de context van de vraag de interpretatie vaak sterker."],
      ["Gratis en betaald bereik", "Gratis lezingen bieden de kernstroom van één thema en kort advies. Betaalde lezingen werken de legging, positiebedeuting, kaartrelaties en acties per situatie uitgebreider uit. Ze zijn niet bedoeld om angst onder druk te zetten."],
    ],
    flowTitle: "Leesverloop",
    flowItems: [
      "Vorm de vraag rond de huidige situatie en beschikbare keuzes.",
      "Lees symbolen, posities en relaties met omliggende kaarten samen.",
      "Scheid emoties, houdingen en mogelijkheden zonder alles goed of slecht te noemen.",
      "Sluit af met een korte praktische actie die meteen kan worden nagegaan.",
    ],
    resultTitle: "Wat je in het resultaat kunt zien",
    resultItems: [
      "De huidige textuur van je hart",
      "Je kijk op de persoon of situatie",
      "Sterke kanten en grenzen van elke optie",
      "Emotionele stromen die aandacht vragen",
      "Een kleine actie die nu mogelijk is",
    ],
    sampleTitle: "Kort voorbeeld van een lezing",
    sample:
      "Als bekers centraal liggen en zwaarden eromheen staan, kan het gevoel nog verbonden zijn, terwijl te veel denken de deur naar gesprek smaller maakt. Nu kan een korte en duidelijke boodschap de druk aan beide kanten verzachten.",
    cautionTitle: "Waar je op moet letten",
    caution:
      "Tarot is een referentie voor entertainment en zelfreflectie. Beslissingen die het leven sterk beïnvloeden, zoals gezondheid, recht, investering, huwelijk, scheiding, rechtszaken of carrière, moeten niet alleen op kaartresultaten steunen. Controleer ook echte informatie en deskundig advies.",
    faqItems: [
      ["Kan ik dezelfde vraag vaak stellen?", "Dezelfde vraag in korte tijd herhalen kan angst vergroten. Het is rustiger om terug te keren wanneer de situatie verandert of nieuwe informatie verschijnt."],
      ["Betekent een moeilijke kaart dat er iets slechts gebeurt?", "Donkere kaarten wijzen vaak op pauze, controle, relatiespanning of emotionele oververhitting, niet op vast ongeluk. Bij een waarschuwing hoort ook een realistische beschermende actie."],
      ["Kan tarot voor mij beslissen?", "Tarot weerspiegelt de sfeer van een keuze en de richting van het hart. Grote beslissingen rond recht, gezondheid, investering, huwelijk, scheiding, procedures of carrière horen niet alleen van tarot af te hangen."],
    ],
    navLabel: "Gerelateerde links voor de tarotgids",
    navLinks: [
      ["/tarot", "Tarotdiensten"],
      ["/tarot/love", "Liefdestarot"],
      ["/tarot/reunion", "Herenigingstarot"],
      ["/tarot/mindscan", "Gevoelstarot"],
      ["/disclaimer", "Disclaimer"],
      ["/editorial-policy", "Redactioneel beleid"],
    ],
  },
  ms: {
    title: "Pengenalan bacaan kad tarot",
    intro:
      "Tarot bukan alat yang menetapkan masa depan. Ia bahasa konsultasi yang memantulkan emosi dan simpang pilihan yang mungkin sudah dirasai melalui simbol. Bacaan tarot Code Destiny menukar suasana kad kepada panduan praktikal, supaya anda dapat melihat hati sendiri dengan lebih jelas.",
    cards: [
      ["Apa yang tarot lihat", "Tarot melihat psikologi semasa, suhu hubungan, kelebihan dan batas setiap pilihan, serta sikap atau emosi yang perlu dijaga sekarang. Kad tidak memaksa jawapan; ia menzahirkan aliran yang mungkin terlepas pandang melalui simbol."],
      ["Cara membina soalan yang baik", "Soalan tarot menjadi lebih mendalam apabila ia bertanya apa yang perlu dilihat sekarang, bukan sekadar ya atau tidak. Daripada bertanya sama ada seseorang akan kembali, lebih sihat bertanya perasaan apa yang perlu anda fahami dalam hubungan ini."],
      ["Input yang membantu", "Topik soalan, situasi semasa, pilihan dan konteks hubungan ialah input utama. Sesetengah bacaan mungkin meminta nama atau tarikh lahir, tetapi dalam tarot, konteks soalan lebih banyak membimbing tafsiran kad."],
      ["Skop percuma dan berbayar", "Bacaan percuma memberi aliran utama satu topik dan nasihat ringkas. Bacaan berbayar menghuraikan susunan kad, makna kedudukan, hubungan antara kad dan panduan tindakan mengikut situasi dengan lebih terperinci. Ia bukan alat untuk menekan kebimbangan."],
    ],
    flowTitle: "Aliran tafsiran",
    flowItems: [
      "Susun soalan berdasarkan situasi semasa dan pilihan yang ada.",
      "Baca simbol, kedudukan dan hubungan dengan kad sekitar secara bersama.",
      "Bezakan emosi, sikap dan kemungkinan tanpa terus menghukum baik atau buruk.",
      "Akhiri dengan tindakan praktikal ringkas yang boleh disemak segera.",
    ],
    resultTitle: "Perkara yang boleh dilihat dalam hasil",
    resultItems: [
      "Tekstur hati semasa",
      "Cara anda melihat orang atau situasi",
      "Kekuatan dan batas setiap pilihan",
      "Aliran emosi yang perlu dijaga",
      "Tindakan kecil yang boleh dibuat sekarang",
    ],
    sampleTitle: "Contoh bacaan ringkas",
    sample:
      "Jika kad cups berada di tengah dan kad swords mengelilinginya, perasaan mungkin masih bersambung tetapi terlalu banyak fikiran mengecilkan pintu perbualan. Kini, mesej yang ringkas dan jelas boleh melembutkan beban kedua-dua pihak.",
    cautionTitle: "Perkara yang perlu diingat",
    caution:
      "Tarot ialah rujukan untuk hiburan dan refleksi diri. Keputusan yang memberi kesan besar kepada hidup seperti kesihatan, undang-undang, pelaburan, perkahwinan, perceraian, litigasi atau kerjaya tidak patut dibuat berdasarkan kad sahaja. Semak juga maklumat sebenar dan nasihat profesional bertauliah.",
    faqItems: [
      ["Bolehkah soalan sama ditanya berkali-kali?", "Mengulang soalan sama dalam masa singkat boleh meningkatkan kebimbangan. Lebih tenang untuk kembali apabila situasi berubah atau maklumat baharu muncul."],
      ["Adakah kad sukar bermaksud perkara buruk akan berlaku?", "Kad gelap sering memantulkan jeda, semakan, ketegangan hubungan atau emosi yang terlalu panas, bukan nasib malang yang tetap. Apabila amaran muncul, lihat juga tindakan perlindungan yang realistik."],
      ["Bolehkah tarot membuat keputusan untuk saya?", "Tarot memantulkan suasana pilihan dan arah hati. Keputusan besar tentang undang-undang, perubatan, pelaburan, perkahwinan, perceraian, litigasi atau kerjaya tidak patut bergantung pada tarot sahaja."],
    ],
    navLabel: "Pautan berkaitan panduan tarot",
    navLinks: [
      ["/tarot", "Servis tarot"],
      ["/tarot/love", "Tarot cinta"],
      ["/tarot/reunion", "Tarot penyatuan semula"],
      ["/tarot/mindscan", "Tarot bacaan hati"],
      ["/disclaimer", "Penafian"],
      ["/editorial-policy", "Dasar editorial"],
    ],
  },
};

function resolveLocaleFromPath(pathname) {
  const firstSegment = (pathname || "").split("/").filter(Boolean)[0];
  return firstSegment ? normalizeLoadingLocale(firstSegment) : "ko";
}

export default function TarotGuideContent() {
  const pathname = usePathname();
  const [locale, setLocale] = useState(() => resolveLocaleFromPath(pathname));

  useEffect(() => {
    const fromPath = resolveLocaleFromPath(pathname);
    setLocale(fromPath === "ko" ? getCurrentLoadingLocale() : fromPath);
  }, [pathname]);

  const copy = GUIDE_COPY[locale] || GUIDE_COPY.ko;

  // 이 페이지는 로케일 12벌이 살아 있는 유일한 가이드다. 한국어 CTA 문구를 번역해 둘 수
  // 없는 나머지 로케일에는, 이미 번역돼 있는 navLinks 를 그대로 승격해 버튼 줄만 그린다
  // — 그래야 새 문구를 12벌 손으로 쓰지 않고도 어느 언어에서도 한국어가 새지 않는다.
  // 지원하지 않는 로케일은 copy 가 ko 로 떨어지므로 locale 이 아니라 copy 로 판정한다.
  const isKoreanCopy = copy === GUIDE_COPY.ko;
  const ctaTarget = isKoreanCopy
    ? GUIDE_CTA_TARGETS["/tarot/guide"]
    : {
        from: "tarot-guide",
        primary: { href: copy.navLinks[0][0], label: copy.navLinks[0][1] },
        secondary: copy.navLinks.slice(1, 4).map(([href, label]) => ({ href, label })),
      };

  return (
    <main className="cd-main-shell cd-guide">
      <header className="cd-main-header">
        <h1 className="cd-main-title">{copy.title}</h1>
        <p className="cd-main-intro">{copy.intro}</p>
      </header>

      <section className="cd-card-grid">
        {copy.cards.map(([title, body]) => (
          <article key={title} className="cd-card">
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="cd-card">
        <h2>{copy.flowTitle}</h2>
        <ul>
          {copy.flowItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{copy.resultTitle}</h2>
        <ul>
          {copy.resultItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{copy.sampleTitle}</h2>
        <p>{copy.sample}</p>
      </section>

      <section className="cd-card">
        <h2>{copy.cautionTitle}</h2>
        <p>{copy.caution}</p>
      </section>

      <section className="cd-card-grid">
        {copy.faqItems.map(([question, answer]) => (
          <article key={question} className="cd-card">
            <h2>{question}</h2>
            <p>{answer}</p>
          </article>
        ))}
      </section>

      <GuideCta target={ctaTarget} variant={isKoreanCopy ? "full" : "compact"} />

      <nav className="cd-chip-wrap" aria-label={copy.navLabel}>
        {copy.navLinks.map(([href, label]) => (
          <Link key={href} href={href} className="cd-chip">
            {label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
