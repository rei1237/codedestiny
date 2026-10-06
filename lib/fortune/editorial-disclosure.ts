import type { FortuneLocale } from "./localization";

// 계산된 관측값과 편집된 상징 해석을 구분한다. 검수·예측력 인증을 뜻하지 않는다.
export const FORTUNE_EDITORIAL_DISCLOSURE: Record<FortuneLocale, string> = {
  "ko": "일진·월건·달의 위치는 날짜를 기준으로 계산합니다. 점수는 그 값에 서비스의 상징 해석 규칙을 적용한 참고 지표이며, 사건의 발생 확률이나 건강 상태를 측정하지 않습니다. 생활 조언은 미리 작성한 문구 중 날짜와 별자리·띠에 따라 선택하므로 다른 날짜나 다른 사람의 페이지와 같을 수 있습니다. 개인 상담이나 매일 새로 취재한 원고가 아니며, 의료·법률·투자 판단을 대신하지 않습니다.",
  "en": "Calendar pillars and lunar positions are calculated for the reference date. Scores apply this service’s symbolic rules; they are not probabilities or measurements of health. Everyday advice is selected from a prewritten collection by date and sign, so passages may recur across dates and signs. This is not an individual consultation or a newly researched daily article, and it does not replace medical, legal or investment advice.",
  "ja": "日柱・月柱・月の位置は基準日から計算します。スコアは当サービスの象徴的な解釈規則による参考値で、出来事の確率や健康状態の測定ではありません。生活の助言は事前に用意した文章から日付と星座・生肖に応じて選ぶため、別の日や別の人と同じ文章になる場合があります。個別相談や毎日の取材記事ではなく、医療・法律・投資の判断に代わるものではありません。",
  "zh-CN": "日柱、月柱和月亮位置按基准日期计算。评分是本服务象征解读规则下的参考值，不是事件概率或健康测量。生活建议按日期与星座、生肖从预先编写的文案中选取，因此不同日期或不同人的页面可能出现相同段落。这不是个别咨询或每日重新采写的文章，也不能替代医疗、法律或投资判断。",
  "zh-TW": "日柱、月柱和月亮位置依基準日期計算。評分是本服務象徵解讀規則下的參考值，不是事件機率或健康測量。生活建議依日期與星座、生肖從預先編寫的文案中選取，因此不同日期或不同人的頁面可能出現相同段落。這不是個別諮詢或每日重新採寫的文章，也不能取代醫療、法律或投資判斷。"
};
