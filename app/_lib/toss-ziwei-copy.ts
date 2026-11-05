// The original Ziwei report currently requests Korean output. The Japanese
// entry explicitly states that boundary rather than promising translated text.
export const tossZiweiJapanese = {
  title: '紫微斗数の専門相談',
  subtitle: '命宮と十二宮の星の流れから、今いちばん気になる問いを読み解きます。',
  eyebrow: '紫微斗数 · 専門相談',
  resultLanguage: '相談結果は韓国語で生成されます。',
  form: '相談に必要な情報', name: '名前またはニックネーム', gender: '性別', select: '選択', female: '女性', male: '男性', private: '非公開', birthDate: '生年月日', birthTime: '出生時刻', calendar: '暦', solar: '太陽暦', lunar: '太陰暦', unknown: '出生時刻が不明', leap: '閏月', topic: '相談テーマ', question: '相談したいこと', placeholder: '今いちばん気になることを入力してください。',
  submit: '専門相談を始める', busy: '命盤を読み解いています', open: '相談を開く', saved: '保存した相談を読む', again: 'もう一度相談する', records: '鑑定履歴を確認する',
  emptyTitle: '命盤を開く準備ができています', emptyText: '相談が始まると、ここに十二宮の命盤と主星が表示されます。',
  invalid: '生年月日、性別、出生時刻を確認してください。',
  cards: [
    {title:'命宮の気質',description:'命宮と主な星が示す反応や選択の傾向を見ます。'},
    {title:'十二宮のつながり',description:'仕事、お金、関係など、問いに関わる領域を整理します。'},
    {title:'星の転換点',description:'現在の流れの中で進む時と整える時を考えます。'},
  ],
  topics: ['命盤全体','生まれ持った傾向','人生の方向','仕事・事業','学業・試験','金運','不動産・住まい','恋愛・結婚','人間関係','親・家族','子ども・出産','健康・心','移動・移住','訴訟・紛争','今の悩み'],
  palaces: ['命宮','父母宮','福徳宮','田宅宮','兄弟宮','官禄宮','夫妻宮','奴僕宮','子女宮','遷移宮','財帛宮','疾厄宮'],
} as const;
