import type { LoadingLocale } from '@/constants/loadingMessages';

export type NeoStrategyChapter = {
  sessionId: string; createdAt: string; method: string; topic: string; question: string; title: string;
  verdict: string; pattern: string; strategy: string; firstAction: string; strengths: string[]; cautions: string[];
  actions: Array<{ timing: string; action: string; reason: string }>;
  hasRefinedActions: boolean; forbidden: string; closing: string; originalUrl: string;
};
export type NeoStrategyBook = { id: string; version: number; createdAt: string; sessionIds: string[]; chapters: NeoStrategyChapter[] };
export type NeoBookListItem = Pick<NeoStrategyBook, 'id' | 'createdAt' | 'sessionIds'>;
const ko = {
  title: '나의 전략서', intro: '지금까지의 조언을 한 권에 담아, 필요할 때 다시 펼쳐보세요.',
  rule: '완료 상담 1~5건을 고르면 사자 휘장 5개로 전략서 한 권을 만들어요. 저장된 핵심 판단과 행동 조언을 모으며 새로운 운세 해석은 추가하지 않아요.',
  balance: '보유 사자 휘장', choose: '담을 상담 고르기', chosen: '선택한 상담', issue: '휘장 5개로 전략서 만들기',
  confirm: '선택한 상담으로 한 권을 만들고 휘장 5개를 사용해요. 같은 상담 조합의 발급본은 추가 차감 없이 다시 열려요.',
  busy: '전략서를 준비하고 있어요', loading: '상담 기록을 불러오고 있어요', books: '발급한 전략서', empty: '아직 완료된 네오 상담이 없어요.',
  noBooks: '발급한 전략서가 여기에 보관돼요.', more: '더 불러오기', retry: '다시 확인하기', open: '전략서 열기', download: 'PDF 저장하기',
  back: '전략실로', login: '로그인하면 내 상담과 휘장을 확인할 수 있어요.', loginCta: '로그인하기',
  error: '기록을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.', notEnough: '사자 휘장 5개가 필요해요. 완료한 상담마다 1개가 쌓여요.',
  unavailable: '선택한 상담의 열람 권한을 확인할 수 없어요. 상담 기록을 다시 확인해 주세요.',
  issueError: '발급 상태를 확인하지 못했어요. 같은 선택으로 다시 시도하면 중복 차감을 막고 발급본을 확인해요.',
  pdfError: 'PDF를 저장하지 못했어요. 전략서는 보관되어 있으니 추가 차감 없이 다시 저장해 주세요.',
  contents: '함께 담은 상담', verdict: '당시의 핵심 판단', pattern: '반복되는 선택', strategy: '선택의 방향', refined: '수정 상담의 전략',
  first: '먼저 할 한 가지', strengths: '살릴 강점', cautions: '주의할 점', actions: '행동 조언 모음', forbidden: '잠시 멈출 행동', closing: '네오의 한마디', original: '상담 원문 다시 보기',
  saved: '발급 시점의 상담 내용을 보관한 전략서예요.', count: '건', badges: '개',
};
type Copy = typeof ko;
const en: Copy = {
  title: 'My strategy books', intro: 'Keep your advice together and return to it when you need it.',
  rule: 'Choose 1–5 completed consultations to create a book with 5 Lion Seals. It collects saved assessments and actions, without generating a new reading.',
  balance: 'Lion Seals', choose: 'Choose consultations', chosen: 'Selected consultations', issue: 'Create a book with 5 seals',
  confirm: 'Use 5 seals for this selection. An existing book with the same consultations opens again without another charge.',
  busy: 'Preparing your book', loading: 'Loading consultations', books: 'Your books', empty: 'No completed Neo consultations yet.', noBooks: 'Your issued books will appear here.',
  more: 'Load more', retry: 'Try again', open: 'Open book', download: 'Save PDF', back: 'Strategy room', login: 'Sign in to see your consultations and seals.', loginCta: 'Sign in',
  error: 'Could not load your records. Please try again.', notEnough: 'You need 5 Lion Seals. Each completed consultation earns one.',
  unavailable: 'Access to a selected consultation could not be verified. Check your records.',
  issueError: 'Could not confirm issuance. Retry with the same selection to recover your book without a duplicate charge.',
  pdfError: 'PDF export failed. Your book is saved; retry without spending more seals.',
  contents: 'Included consultations', verdict: 'Original assessment', pattern: 'Repeated choices', strategy: 'Your direction', refined: 'Revised strategy', first: 'One action to start',
  strengths: 'Strengths', cautions: 'Cautions', actions: 'Collected actions', forbidden: 'Actions to pause', closing: "Neo’s closing words", original: 'Read the original', saved: 'This book preserves the consultations as they were when issued.', count: 'consultations', badges: 'seals',
};
const ja: Copy = { ...en, title: '私の戦略書', intro: 'これまでの助言を一冊にまとめ、必要なときに読み返しましょう。', rule: '完了した相談を1〜5件選び、獅子紋章5個で一冊を作ります。保存済みの判断と行動の助言をまとめ、新しい占いの解釈は加えません。', balance: '保有する獅子紋章', choose: '相談を選ぶ', chosen: '選んだ相談', issue: '紋章5個で戦略書を作る', confirm: '選んだ相談をまとめて紋章5個を使います。同じ相談の組み合わせで発行済みなら追加消費はありません。', busy: '戦略書を準備中', loading: '相談記録を読み込み中', books: '発行した戦略書', empty: '完了したネオの相談はまだありません。', noBooks: '発行した戦略書はここに保存されます。', more: 'さらに読み込む', retry: '再確認', open: '戦略書を開く', download: 'PDFを保存', back: '戦略室へ', login: 'ログインして相談と紋章を確認してください。', loginCta: 'ログイン', error: '記録を読み込めませんでした。もう一度お試しください。', notEnough: '獅子紋章が5個必要です。完了した相談ごとに1個たまります。', unavailable: '選んだ相談の閲覧権限を確認できません。', issueError: '発行状況を確認できません。同じ選択で再試行すると重複消費を防いで確認できます。', pdfError: 'PDFを保存できませんでした。戦略書は保存済みなので追加消費なしで再試行できます。', contents: '収録した相談', verdict: '当時の判断', pattern: '繰り返す選択', strategy: '選択の方向', refined: '修正相談の戦略', first: 'まず行う一つのこと', strengths: '強み', cautions: '注意点', actions: '行動の助言', forbidden: '一度止めたい行動', closing: 'ネオのひと言', original: '相談原文を読む', saved: '発行時点の相談内容を保存した戦略書です。', count: '件', badges: '個' };
const zh: Copy = { ...en, title: '我的策略书', intro: '把以往的建议汇成一册，需要时再翻阅。', rule: '选择1至5次已完成的咨询，使用5枚狮徽制作一册。仅整理已保存的判断与行动建议，不增加新的运势解读。', balance: '持有狮徽', choose: '选择咨询', chosen: '已选咨询', issue: '使用5枚狮徽制作', confirm: '制作所选咨询的策略书将使用5枚狮徽。相同咨询组合的已发行版本不会重复扣除。', busy: '正在准备策略书', loading: '正在读取咨询记录', books: '已发行策略书', empty: '还没有完成的尼奥咨询。', noBooks: '已发行的策略书将保存在这里。', more: '加载更多', retry: '重新确认', open: '打开策略书', download: '保存PDF', back: '返回策略室', login: '登录后可查看咨询和狮徽。', loginCta: '登录', error: '无法读取记录，请重试。', notEnough: '需要5枚狮徽。每次完成咨询可获得1枚。', unavailable: '无法确认所选咨询的阅读权限。', issueError: '无法确认发行状态。请保持相同选择重试，以避免重复扣除。', pdfError: 'PDF保存失败。策略书已保存，可重试且不会再次扣除。', contents: '收录的咨询', verdict: '当时的核心判断', pattern: '重复的选择', strategy: '选择的方向', refined: '修正咨询的策略', first: '先做一件事', strengths: '优势', cautions: '注意事项', actions: '行动建议汇总', forbidden: '先暂停的行动', closing: '尼奥的话', original: '重读咨询原文', saved: '本书保存发行时的咨询内容。', count: '次', badges: '枚' };
const tw: Copy = { ...zh, title: '我的策略書', intro: '把以往的建議匯成一冊，需要時再翻閱。', rule: '選擇1至5次已完成的諮詢，使用5枚獅徽製作一冊。僅整理已儲存的判斷與行動建議，不增加新的運勢解讀。', balance: '持有獅徽', choose: '選擇諮詢', chosen: '已選諮詢', issue: '使用5枚獅徽製作', confirm: '製作所選諮詢的策略書將使用5枚獅徽。相同諮詢組合的已發行版本不會重複扣除。', busy: '正在準備策略書', loading: '正在讀取諮詢記錄', books: '已發行策略書', empty: '還沒有完成的尼奧諮詢。', noBooks: '已發行的策略書將儲存在這裡。', more: '載入更多', retry: '重新確認', open: '開啟策略書', download: '儲存PDF', back: '返回策略室', login: '登入後可查看諮詢和獅徽。', loginCta: '登入', error: '無法讀取記錄，請重試。', notEnough: '需要5枚獅徽。每次完成諮詢可獲得1枚。', unavailable: '無法確認所選諮詢的閱讀權限。', issueError: '無法確認發行狀態。請保持相同選擇重試，以避免重複扣除。', pdfError: 'PDF儲存失敗。策略書已儲存，可重試且不會再次扣除。', contents: '收錄的諮詢', verdict: '當時的核心判斷', pattern: '重複的選擇', strategy: '選擇的方向', refined: '修正諮詢的策略', first: '先做一件事', strengths: '優勢', cautions: '注意事項', actions: '行動建議彙總', forbidden: '先暫停的行動', closing: '尼奧的話', original: '重讀諮詢原文', saved: '本書儲存發行時的諮詢內容。' };
export function getNeoBookCopy(locale: LoadingLocale): Copy { return ({ ko, en, ja, 'zh-CN': zh, 'zh-TW': tw } as Partial<Record<LoadingLocale, Copy>>)[locale] || en; }
