import type { LoadingLocale } from '@/constants/loadingMessages';

const ko = {
  lead: '반복되는 선택을 짚고, 지금 할 한 가지를 정리해요.',
  start: '고민부터 적어보기', results: '상담에서 받는 것',
  points: [
    { title: '핵심 판단', description: '선택한 운세 체계로 지금 고민을 살펴보고, 판단의 근거를 설명해요.' },
    { title: '먼저 할 행동', description: '살릴 강점과 주의할 점, 지금 해볼 행동을 순서대로 정리해요.' },
    { title: '다시 보는 기록', description: '저장된 상담을 다시 읽고, 내 상황을 더해 전략을 수정할 수 있어요.' },
  ],
  scenes: ['편하게 앉아라. 잘 정리된 이야기일 필요는 없다. 지금 가장 마음에 걸리는 고민부터 꺼내봐.', '사주, 자미두수, 베다점, 점성술. 네가 고른 체계의 근거로 지금의 선택을 살펴보겠다.', '핵심 판단부터 짚고, 살릴 강점과 멈출 행동을 정리한다. 오늘 할 한 가지를 가져가면 된다.', '상담은 기록으로 남는다. 다시 읽고 네 상황을 더해 전략을 다듬어라. 휘장 5개가 모이면 저장된 조언을 전략서 한 권으로 묶을 수도 있다.'],
};
type Welcome = typeof ko;
const en: Welcome = {
  lead: 'Understand repeated choices and decide on one action to take now.', start: 'Tell Neo your concern', results: 'What you receive',
  points: [{ title: 'A clear assessment', description: 'Explore your concern through your chosen reading system, with the reasons explained.' }, { title: 'An action to start', description: 'Review strengths, cautions and practical steps in order.' }, { title: 'A saved consultation', description: 'Return to your reading and add real-life context to refine your strategy.' }],
  scenes: ['Take a seat. Your story need not be polished. Start with the concern on your mind.', 'Saju, Ziwei, Vedic or Western astrology: we will use the system you choose to examine your decision.', 'We will start with the assessment, then strengths and actions to pause. Leave with one step you can take today.', 'Your consultation is saved. Read it again and add context to refine your strategy. With 5 Lion Seals, you can collect saved advice into one strategy book.'],
};
const ja: Welcome = { lead: '繰り返す選択を見直し、今できる一つの行動を整理します。', start: '悩みを書いてみる', results: '相談で受け取れるもの', points: [{title:'要点となる判断',description:'選んだ占術で悩みを見つめ、判断の根拠を説明します。'},{title:'まず行う行動',description:'強みと注意点、今できる行動を順番に整理します。'},{title:'読み返せる記録',description:'保存した相談を読み返し、実際の状況を加えて戦略を修正できます。'}], scenes:['気楽に座ってくれ。きれいにまとめなくていい。今気になる悩みから話してみよう。','四柱推命、紫微斗数、ヴェーダ占星術、西洋占星術。選んだ体系の根拠から選択を見ていく。','判断の要点から、強みと一度止めたい行動を整理する。今日できる一つを持ち帰ろう。','相談は記録に残る。読み返して状況を加え、戦略を整えよう。獅子紋章5個で保存した助言を一冊にまとめられる。'] };
const zh: Welcome = { lead:'看清反复的选择，整理现在能做的一件事。', start:'先写下你的困扰', results:'咨询能带来什么', points:[{title:'核心判断',description:'用你选择的运势体系审视困扰，说明判断的依据。'},{title:'先做的行动',description:'依次整理优势、注意事项和可行的行动。'},{title:'可重读的记录',description:'重读保存的咨询，补充实际情况并修正策略。'}],scenes:['轻松坐下。不必把故事整理得很完整，先说现在的困扰。','四柱、紫微斗数、吠陀或西洋占星。我们根据你所选体系的依据来审视选择。','先看核心判断，再整理优势和需要暂停的行动。带走一件今天能做的事。','咨询会保存为记录。重读并补充情况，调整策略。集齐5枚狮徽，就能把保存的建议汇成一册。'] };
const tw: Welcome = { lead:'看清反覆的選擇，整理現在能做的一件事。', start:'先寫下你的困擾', results:'諮詢能帶來什麼', points:[{title:'核心判斷',description:'用你選擇的運勢體系審視困擾，說明判斷的依據。'},{title:'先做的行動',description:'依序整理優勢、注意事項和可行的行動。'},{title:'可重讀的記錄',description:'重讀儲存的諮詢，補充實際情況並修正策略。'}],scenes:['輕鬆坐下。不必把故事整理得很完整，先說現在的困擾。','四柱、紫微斗數、吠陀或西洋占星。我們根據你所選體系的依據來審視選擇。','先看核心判斷，再整理優勢和需要暫停的行動。帶走一件今天能做的事。','諮詢會儲存為記錄。重讀並補充情況，調整策略。集齊5枚獅徽，就能把儲存的建議彙成一冊。'] };
export function getNeoWelcome(locale: LoadingLocale): Welcome { return ({ ko, en, ja, 'zh-CN': zh, 'zh-TW': tw } as Partial<Record<LoadingLocale, Welcome>>)[locale] || en; }
