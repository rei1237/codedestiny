import {TONE_POOLS, ZODIAC_OVERALL_POOL, ZODIAC_PLANET_POOL} from "../lib/fortune/daily-prose.mjs";
/**
 * 매일 운세 생성 (프롬프트 v3) →
 * - fortune/data/daily-YYYY-MM-DD.json
 * - public/fortune/data/daily-YYYY-MM-DD.json
 * 날짜: FORTUNE_DATE 또는 --date=, 기본 KST 오늘
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseFortuneDate, kstIsoNow } from './lib/fortune-date.mjs';
import { moonSkyForDate } from './lib/moon-sky.mjs';
import {
  BRANCH_HANJA,
  STEM_HANJA,
  ganji,
  sexagenaryYearIndexes,
  solarToLunar,
} from '../lib/korean-calendar/index.js';

// 🔴 음력·간지는 전부 한국 음양력 코어에서 나온다. lunar-javascript 는 중국 표준시(CST) 기준
// 중국 음력이라 음력일이 3.7% 의 날짜에서 하루 어긋나고, 절기 시각이 60분 일러 월건 경계가 밀린다
// (실측 2026-08-27). 이 파일은 **매일 발행되는 운세 데이터**를 만들므로 그 오차가 그대로 나간다.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const dateStr = parseFortuneDate(process.argv);

const outDirs = [
  path.join(root, 'fortune', 'data'),
  path.join(root, 'public', 'fortune', 'data'),
];
const outFiles = outDirs.map((outDir) => path.join(outDir, `daily-${dateStr}.json`));
for (const outDir of outDirs) fs.mkdirSync(outDir, { recursive: true });

function isValidDailyFile(filePath, expectedDate) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const j = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return !!(j && j.date === expectedDate);
  } catch (e) {
    return false;
  }
}

if (process.env.FORTUNE_IDEMPOTENT === '1') {
  const allValid = outFiles.every((filePath) => isValidDailyFile(filePath, dateStr));
  if (allValid) {
    console.log('[gen-daily] Skip (idempotent, same date):', outFiles.join(', '));
    process.exit(0);
  }
  for (const filePath of outFiles) {
    if (!isValidDailyFile(filePath, dateStr)) {
      console.warn('[gen-daily] Missing/invalid output, will regenerate:', filePath);
    }
  }
}

const [y, m, d] = dateStr.split('-').map(Number);
const coreLunar = solarToLunar(y, m, d);
// 일진·월건은 자정 기준으로 잡는다(기존 Solar.fromYmd 와 같은 시각).
const coreGanji = ganji({ year: y, month: m, day: d, hour: 0, minute: 0 });
if (!coreLunar || !coreGanji) {
  console.error(`[gen-daily] 한국 음양력 코어가 ${dateStr} 를 답하지 못했습니다(지원 1900~2100).`);
  process.exit(1);
}
const pillarOf = (part) => `${STEM_HANJA[part.stemIndex]}${BRANCH_HANJA[part.branchIndex]}`;
const sexagenaryOf = (year) => pillarOf(sexagenaryYearIndexes(year));
const lunarStr = `음력 ${coreLunar.lunarYear}년 ${coreLunar.isLeapMonth ? '윤' : ''}${coreLunar.lunarMonth}월 ${coreLunar.lunarDay}일`;
const ilchin = pillarOf(coreGanji.day);
const yearGanji = sexagenaryOf(coreLunar.lunarYear) + '年';
const nextYearGanji = sexagenaryOf(coreLunar.lunarYear + 1) + '年';
const wolgeon = pillarOf(coreGanji.month) + '月';
const this_month = `${y}-${String(m).padStart(2, '0')}`;
const this_year = y;
const next_year = y + 1;
const WEEK_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEK_KR = ['일', '월', '화', '수', '목', '금', '토'];
const weekdayIndex = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
const varaEn = WEEK_EN[weekdayIndex];
const weekdayKr = WEEK_KR[weekdayIndex];
const generated_at = kstIsoNow();
const { moonSignEn, moonPhaseLabel, newMoonYmd, fullMoonYmd } = moonSkyForDate(y, m, d);

const NAKSHATRA_LIST = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
];
function hashPick(seed, arr) {
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return arr[Math.abs(h) % arr.length];
}
const panchNak = hashPick(dateStr + '|nak', NAKSHATRA_LIST);
const panchTithi = hashPick(dateStr + '|tith', [
  'Shukla Pratipada', 'Shukla Dwitiya', 'Shukla Tritiya', 'Krishna Ashtami', 'Shukla Ekadashi', 'Purnima', 'Amavasya',
]);
const panchYoga = hashPick(dateStr + '|yoga', ['Siddha', 'Vaidhriti', 'Shubha', 'Vriddhi', 'Dhruva']);
const panchKarana = hashPick(dateStr + '|kar', ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara']);

const SEO_THEME_PAIRS = [
  { kr: '연애운', en: 'love luck' },
  { kr: '금전운', en: 'money luck' },
  { kr: '직장운', en: 'career luck' },
  { kr: '건강운', en: 'health luck' },
  { kr: '인간관계운', en: 'relationship luck' },
  { kr: '행운 포인트', en: 'daily luck points' },
];
const selectedSeoTheme = hashPick(dateStr + '|seo-theme', SEO_THEME_PAIRS);
const SEO_THEME_KR = selectedSeoTheme.kr;
const SEO_THEME_EN = selectedSeoTheme.en;
const homeEntryUrl = `https://code-destiny.com/?utm_source=daily_fortune&utm_medium=json&utm_campaign=${dateStr}`;

const L = ['kr', 'en', 'jp', 'cn', 'fr', 'nl', 'vi', 'ms'];

// 공개 JSON은 과거 jp/cn 필드를 호환용으로 남기되, 새 렌더러가 읽는 정본 키는
// ja/zh-CN/zh-TW로 고정한다. 번체는 간체 원문을 그대로 재사용하지 않고 별도 변환
// 표를 거쳐 생성해 간체·번체 혼용을 막는다.
const ZH_TW_REPLACEMENTS = {
  关: '關', 这: '這', 个: '個', 变: '變', 动: '動', 见: '見', 说: '說', 话: '話',
  读: '讀', 识: '識', 书: '書', 记: '記', 计: '計', 体: '體', 现: '現', 进: '進',
  过: '過', 运: '運', 势: '勢', 财: '財', 爱: '愛', 感: '感', 关: '關', 系: '係',
  号: '號', 见: '見', 习: '習', 气: '氣', 阳: '陽', 阴: '陰', 开: '開', 发: '發',
  让: '讓', 为: '為', 无: '無', 义: '義', 乐: '樂', 亲: '親', 乡: '鄉', 后: '後',
  里: '裡', 这: '這', 时: '時', 间: '間', 实: '實', 对: '對', 应: '應', 续: '續',
  备: '備', 处: '處', 产: '產', 质: '質', 线: '線', 结: '結', 果: '果', 轻: '輕',
  进: '進', 还: '還', 头: '頭', 题: '題', 够: '夠', 认: '認', 证: '證', 复: '復',
};
function toTraditional(value) {
  return String(value || '').replace(/[关这变动见说话读识书记计体现进过运势财爱系号习气阳阴开发让为无义乐亲乡后里时间实对应续备处产质线结轻还头题够认证复]/g, (char) => ZH_TW_REPLACEMENTS[char] || char);
}
function box(kr, en, jp, cn, fr, nl, vi, ms) {
  return { kr, en, jp, cn, fr, nl, vi, ms, ja: jp, 'zh-CN': cn, 'zh-TW': toTraditional(cn) };
}

function addDailyLocaleFields(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(addDailyLocaleFields);
  const next = {};
  for (const [key, child] of Object.entries(value)) next[key] = addDailyLocaleFields(child);
  if (typeof next.kr === 'string') {
    next.ja ??= next.jp || next.en;
    next['zh-CN'] ??= next.cn || next.en;
    next['zh-TW'] ??= toTraditional(next['zh-CN']);
  }
  return next;
}

/**
 * 🔴 일일 문안 풀 — 별자리·띠 24개가 **같은 다섯 문장**을 쓰던 문제를 고치기 위한 것이다.
 *
 * 무엇이 문제였나 (2026-08-17 실측): `mkZodiacs()` 는 날짜 인자조차 받지 않았고
 * love·money·health·work·advice 가 하드코딩 리터럴이라 **12개 별자리가 전부 동일**했다.
 * 띠 쪽도 `cloneAnimal(animalCopy.rat, …)` 가 이 다섯을 그대로 복제했다. 기간 4개까지 곱해져
 * 같은 문장이 **48개 URL**(별자리) + 48개(띠)에 나갔고, today 와 tomorrow 는 바이트 동일이었다.
 * AdSense 가 "가치 없는 콘텐츠"로 거절한 페이지가 정확히 이 48개(광고 게재 대상)다.
 *
 * 왜 풀 + 해시인가: sign 마다 문장을 고정으로 박으면 24 × 5 × 8언어를 손으로 관리해야 하고,
 * 그래도 **날짜가 바뀌어도 같은 글**이라 today↔tomorrow 동일 문제가 남는다. `dateStr` 과 sign 을
 * 함께 시드에 넣어 뽑으면 두 축이 동시에 갈라진다.
 *
 * 🔴 풀 크기를 8 미만으로 줄이지 말 것. 24개 sign 이 8개를 나눠 쓰면 한 문장이 걸리는 URL 은
 * 3 sign × 4 기간 = 12개다. `scripts/verify-editor-notes.mjs:184-192` 는 문서빈도가
 * `광고 라우트 197개 × 0.1 = 19.7` 을 넘으면 공통 크롬으로 보고 고유 본문에서 뺀다 —
 * 12 는 그 밑이라 고유로 세어지지만, 풀이 4면 24가 되어 다시 크롬으로 떨어진다.
 */


/** 별자리 12개가 전부 같은 값 하나를 쓰던 두 필드도 함께 갈라 준다. */
const KEYWORD_POOL = [
  box('새 시즌·방향', 'New season', '新シーズン', '新季', 'Nouvelle saison', 'Nieuw seizoen', 'Mùa mới', 'Musim baru'),
  box('정리·여백', 'Clearing', '整理と余白', '整理留白', 'Désencombrer', 'Opruimen', 'Dọn dẹp', 'Kemas ruang'),
  box('연결·대화', 'Connection', 'つながり', '连接对话', 'Connexion', 'Verbinding', 'Kết nối', 'Hubungan'),
  box('회복·휴식', 'Recovery', '回復と休息', '恢复休息', 'Récupération', 'Herstel', 'Hồi phục', 'Pemulihan'),
  box('집중·마무리', 'Finishing', '集中と仕上げ', '专注收尾', 'Finition', 'Afronden', 'Hoàn tất', 'Penyudah'),
  box('용기·첫걸음', 'First step', '勇気の一歩', '勇气起步', 'Premier pas', 'Eerste stap', 'Bước đầu', 'Langkah awal'),
  box('균형·속도', 'Balance', 'バランス', '平衡节奏', 'Équilibre', 'Balans', 'Cân bằng', 'Keseimbangan'),
  box('신뢰·약속', 'Trust', '信頼と約束', '信任承诺', 'Confiance', 'Vertrouwen', 'Tin cậy', 'Kepercayaan'),
];

const COLOR_POOL = [
  { color_kr: '샴페인 골드', color_en: 'champagne gold' },
  { color_kr: '딥 네이비', color_en: 'deep navy' },
  { color_kr: '올리브 그린', color_en: 'olive green' },
  { color_kr: '테라코타', color_en: 'terracotta' },
  { color_kr: '라벤더', color_en: 'lavender' },
  { color_kr: '아이보리', color_en: 'ivory' },
  { color_kr: '슬레이트 그레이', color_en: 'slate gray' },
  { color_kr: '체리 레드', color_en: 'cherry red' },
];

/**
 * 날짜 × sign 으로 문안을 고른다. `signKey` 에는 반드시 그룹 접두사를 붙일 것 —
 * 같은 이름의 별자리·띠가 없더라도, 접두사가 없으면 두 그룹이 같은 칸에 몰릴 수 있다.
 */
/**
 * 🔴 별자리 전용 풀 — overall 과 planet_message 는 2026-08-17 의 풀 전환에서 빠져 있었다.
 * `mkZodiacs()` 가 `namesKr[i] + '는 오늘 …'` 처럼 **한 문장에 이름만 끼워** 12개를 만들었고,
 * 2026-08-24 실측에서 "이름 제거 후 고유 문장 1개" 로 잡혔다. 본문 첫 문단이자 메타 설명의
 * 재료라 색인 중인 별자리 24개(today·tomorrow × 12)가 거의 같은 페이지로 보였다.
 * 풀 크기는 위 TONE_POOLS 와 같은 이유로 8 미만으로 줄이지 말 것.
 */




function pickTone(section, signKey) {
  return hashPick(`${dateStr}|${signKey}|${section}`, TONE_POOLS[section]);
}

function toneSections(signKey) {
  return {
    love: pickTone('love', signKey),
    money: pickTone('money', signKey),
    health: pickTone('health', signKey),
    work: pickTone('work', signKey),
    advice: pickTone('advice', signKey),
  };
}

/** 띠별 고유 톤 (브랜드: 꽃돼지 연이 — 희망으로 마무리) */
const ANIMAL_IDS = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'];

const animalCopy = {
  rat: {
    keyword: box('균형·정돈', 'Balance', 'バランス', '平衡', 'Équilibre', 'Balans', 'Cân bằng', 'Keseimbangan'),
    scores: { overall: 7, love: 7, money: 6, health: 7, work: 7 },
    lucky: { color_kr: '연한 블루', color_en: 'soft blue', number: 3 },
    overall: box(
      '오늘은 흐름을 다시 정돈하기 좋은 날이에요. 작은 약속부터 지키면 신뢰가 쌓이고, 마음이 가벼워집니다.',
      'A good day to tidy your rhythm. Keeping small promises rebuilds trust and lightens your mind.',
      '今日はリズムを整えるのに最適。小さな約束を守ると信頼が積み上がります。',
      '今天适合整理节奏。守住小承诺，信任与心情都会更轻盈。',
      'Bonne journée pour ordonner votre rythme. Tenir de petites promesses restaure la confiance.',
      'Een goede dag om je ritme te ordenen. Kleine beloftes houden herstelt vertrouwen.',
      'Hôm nay hợp để chỉnh nhịp sống. Giữ lời nhỏ sẽ tích lũy niềm tin.',
      'Hari sesuai untuk merapikan irama. Janji kecil yang ditepati menambah kepercayaan.'
    ),
    love: box(
      '대화 한 줄이 온도를 바꿔요. 부드럽게 말하면 마음이 먼저 열립니다.',
      'One gentle sentence can change the temperature—speak softly and the heart opens first.',
      '会話の一行が温度を変えます。柔らかく話せば心が先に開きます。',
      '一句话能改变温度；温柔开口，心会先敞开。',
      'Une phrase douce change la température : parlez avec douceur.',
      'Eén zachte zin verandert de sfeer: spreek zacht.',
      'Một câu nhẹ nhàng đổi không khí: hãy nói dịu dàng.',
      'Satu ayat lembut mengubah suhu: bercakap dengan lembut.'
    ),
    money: box(
      '지출 메모만 남겨도 재정이 선명해져요. 작은 절약이 큰 여유를 만듭니다.',
      'Even a spending note brings clarity—small savings create breathing room.',
      '支出メモだけでも明瞭になります。小さな節約が余裕を作ります。',
      '记下支出就会变清晰，小节省带来大余地。',
      'Même une note de dépenses clarifie—petites économies, grand souffle.',
      'Zelfs een uitgavennotitie helpt—kleine besparingen geven lucht.',
      'Ghi chi tiêu cũng giúp rõ ràng—tiết kiệm nhỏ tạo khoảng thở.',
      'Nota perbelanjaan pun jelas—simpanan kecil memberi ruang.'
    ),
    health: box(
      '목과 어깨를 풀어 주세요. 짧은 스트레칭이 집중을 돌려줍니다.',
      'Loosen neck and shoulders—a short stretch returns your focus.',
      '首と肩をほぐしましょう。短いストレッチが集中を戻します。',
      '放松肩颈，短暂拉伸能带回专注。',
      'Détendez cou et épaules—un petit étirement ramène la concentration.',
      'Ontspan nek en schouders—korte stretch brengt focus terug.',
      'Thả lỏng cổ và vai—giãn ngắn giúp tập trung trở lại.',
      'Longgarkan leher dan bahu—regangan pendek kembalikan fokus.'
    ),
    work: box(
      '우선순위 두 개만 고르세요. 한 번에 하나씩이면 속도가 살아납니다.',
      'Pick only two priorities—one step at a time revives momentum.',
      '優先順位は二つだけ。一つずつで勢いが戻ります。',
      '只选两个优先项，一次一步就能找回节奏。',
      'Choisissez deux priorités—un pas à la fois redonne l’élan.',
      'Kies twee prioriteiten—stap voor stap herstelt momentum.',
      'Chọn hai ưu tiên—từng bước giúp lấy lại nhịp.',
      'Pilih dua keutamaan—satu langkah demi langkah hidupkan momentum.'
    ),
    advice: box(
      '꿀꿀 연이: 오늘은 \'천천히 맞추기\'가 행운이에요. 작은 성취로 하루를 채워 보세요.',
      'Yeoni: “slow alignment” is today’s luck—fill the day with tiny wins.',
      'エニ：今日の幸運は「ゆっくり合わせる」。小さな達成で一日を満たして。',
      '花猪恩伊：今天的幸运是“慢慢对齐”，用小成就填满一天。',
      'Yeoni : l’alignement doux porte chance—remplissez la journée de petites victoires.',
      'Yeoni: langzaam afstemmen is geluk—vul de dag met kleine winsten.',
      'Yeoni: “căn chỉnh chậm” là may—lấp ngày bằng chiến thắng nhỏ.',
      'Yeoni: “penjajaran perlahan” ialah tuah—isi hari dengan kemenangan kecil.'
    ),
    saju_insight: '일간 기운이 정돈될수록 말의 날카로움이 줄고, 협력이 살아납니다. 충·형이 보이면 한 박자 쉬어 가세요.'
  }
};

function cloneAnimal(base, overrides) {
  return { ...base, ...overrides };
}

function mkAnimals() {
  const o = {};
  /** 간결·고유 문장: 나머지 띠는 rat 톤을 바탕으로 변주 */
  const variants = [
    { id: 'rat', extra: animalCopy.rat },
    { id: 'ox', extra: cloneAnimal(animalCopy.rat, {
      keyword: box('끈기·완성', 'Stamina', '忍耐', '耐力', 'Endurance', 'Volharding', 'Bền bỉ', 'Ketabahan'),
      scores: { overall: 8, love: 6, money: 8, health: 7, work: 8 },
      lucky: { color_kr: '코코아', color_en: 'cocoa brown', number: 8 },
      overall: box('묵직하게 밀어붙이기보다 완성도를 올리면 평가가 따라와요.', 'Raise finish quality—recognition follows craft, not rush.', '完成度を上げれば評価がついてきます。', '提高完成度，认可会随之而来。', 'Montez la finition—la reconnaissance suit l’artisanat.', 'Verhoog de afwerking—erkenning volgt vakmanschap.', 'Nâng chất lượng hoàn thiện—đánh giá theo sau.', 'Tingkatkan kemasan—pengiktirafan mengikuti.'),
      saju_insight: '토 기운이 받쳐 줄 때는 루틴이 자산이 됩니다. 무리한 확장보다 기본기를 다지세요.'
    })},
    { id: 'tiger', extra: cloneAnimal(animalCopy.rat, {
      keyword: box('용기·출발', 'Courage', '勇気', '勇气', 'Courage', 'Moed', 'Can đảm', 'Keberanian'),
      scores: { overall: 7, love: 8, money: 6, health: 7, work: 7 },
      lucky: { color_kr: '오렌지', color_en: 'orange', number: 1 },
      overall: box('새로운 시도에 녹색 불이 켜진 날이에요. 단, 안전장치를 함께 챙기면 더 멀리 갑니다.', 'Green light for a fresh try—add safety rails to go farther.', '新しい挑戦に青信号。安全装置を添えれば遠くへ。', '新尝试一路绿灯，加上安全绳能走得更远。', 'Feu vert pour essayer—ajoutez des garde-fous pour aller loin.', 'Groen licht om te proberen—veiligheid helpt verder.', 'Đèn xanh cho thử mới—thêm chốt an toàn để đi xa hơn.', 'Lampu hijau untuk cuba—tambah pagar selamat untuk jauh.'),
      saju_insight: '목(木)의 기세가 강할수록 말 한마디의 온도가 결과를 가릅니다.'
    })},
    { id: 'rabbit', extra: cloneAnimal(animalCopy.rat, {
      keyword: box('공감·회복', 'Empathy', '共感', '共情', 'Empathie', 'Empathie', 'Đồng cảm', 'Empati'),
      scores: { overall: 8, love: 8, money: 6, health: 8, work: 7 },
      lucky: { color_kr: '라벤더', color_en: 'lavender', number: 6 },
      overall: box('감정의 파동이 고와지는 날이에요. 듣는 시간이 관계를 회복시킵니다.', 'Emotional waves soften—listening time heals bonds.', '感情の波が穏やかに。聴く時間が絆を癒します。', '情绪更柔，倾听能修复关系。', 'Les vagues émotionnelles s’apaisent—écouter répare.', 'Emoties kalmeren—luisteren herstelt banden.', 'Sóng cảm xúc dịu lại—lắng nghe chữa lành.', 'Gelombang lembut—mendengar pulihkan ikatan.'),
      saju_insight: '인성(印星)의 기운이 살아날수록 말보다 배려가 운을 부릅니다.'
    })},
    { id: 'dragon', extra: cloneAnimal(animalCopy.rat, {
      keyword: box('비전·확장', 'Vision', 'ビジョン', '愿景', 'Vision', 'Visie', 'Tầm nhìn', 'Wawasan'),
      scores: { overall: 8, love: 7, money: 8, health: 6, work: 8 },
      lucky: { color_kr: '금색', color_en: 'gold', number: 9 },
      overall: box('그림을 크게 그리되 실행은 작게 쪼개세요. 첫 걸음이 길을 엽니다.', 'Dream big, slice steps small—the first stride opens the road.', '大きく描き、実行は小さく。一歩が道を開きます。', '敢想大，做小步，第一步开路。', 'Rêvez grand, découpez petit—le premier pas ouvre la route.', 'Droom groot, knip klein—eerste stap opent de weg.', 'Mơ lớn, bước nhỏ—bước đầu mở đường.', 'Impian besar, langkah kecil—langkah pertama membuka jalan.'),
      saju_insight: '관성(官星)이 밝을수록 책임의 무게를 나누는 협업이 핵심입니다.'
    })},
    { id: 'snake', extra: cloneAnimal(animalCopy.rat, {
      keyword: box('통찰·정리', 'Insight', '洞察', '洞察', 'Perspicacité', 'Inzicht', 'Thấu suốt', 'Wawasan'),
      scores: { overall: 7, love: 7, money: 7, health: 7, work: 8 },
      lucky: { color_kr: '딥그린', color_en: 'deep green', number: 4 },
      overall: box('숨은 변수를 먼저 짚으면 리스크가 줄어요. 메모와 체크리스트가 방패입니다.', 'Name hidden variables first—notes and checklists are shields.', '見えない変数を先に。メモとチェックリストが盾。', '先点名隐藏变量，笔记和清单是盾牌。', 'Nommez d’abord les variables cachées—notes et listes bouclier.', 'Noem verborgen variabelen—notities zijn schild.', 'Gọi tên biến ẩn trước—ghi chú là khiên.', 'Namakan pembolehubah tersembunyi—nota menjadi perisai.'),
      saju_insight: '식신·상관의 균형이 맞을 때 아이디어가 현실로 내려옵니다.'
    })},
    { id: 'horse', extra: cloneAnimal(animalCopy.rat, {
      keyword: box('속도·자유', 'Pace', 'テンポ', '节奏', 'Rythme', 'Tempo', 'Nhịp độ', 'Rentak'),
      scores: { overall: 7, love: 8, money: 6, health: 7, work: 7 },
      lucky: { color_kr: '코랄', color_en: 'coral', number: 5 },
      overall: box('속도를 조금만 늦추면 시야가 넓어져요. 방향 확인이 행운의 열쇠입니다.', 'Slow the pace a notch—widening view is the lucky key.', 'ペースを少し落とすと視野が広がります。', '稍慢一点，视野更宽，方向是钥匙。', 'Ralentissez un peu—élargir la vue est la clé.', 'Vertraag een tik—breed zicht is de sleutel.', 'Chậm một nhịp—mở tầm nhìn là chìa khóa.', 'Perlahan sedikit—luaskan pandangan adalah kunci.'),
      saju_insight: '비견·겁재가 강한 날일수록 경쟁보다 협력 루트를 택하면 손해가 줄어듭니다.'
    })},
    { id: 'goat', extra: cloneAnimal(animalCopy.rat, {
      keyword: box('온기·치유', 'Warmth', 'ぬくもり', '温暖', 'Chaleur', 'Warmte', 'Ấm áp', 'Kehangatan'),
      scores: { overall: 8, love: 8, money: 6, health: 8, work: 7 },
      lucky: { color_kr: '크림', color_en: 'cream', number: 2 },
      overall: box('섬세한 배려가 복으로 돌아오는 날이에요. 나 자신에게도 친절을 허락하세요.', 'Gentle care returns as luck—be kind to yourself too.', '繊細な配慮が福に。自分にも優しく。', '细腻的关怀会回到你身上，也善待自己。', 'La douceur revient en chance—soyez doux avec vous.', 'Zorg keert terug als geluk—wees lief voor jezelf.', 'Chăm sóc trở lại là may—hãy tử tế với chính mình.', 'Penjagaan lembut jadi tuah—baik pada diri sendiri.'),
      saju_insight: '식신이 살아나면 감각과 취향이 수입으로 연결되기도 합니다.'
    })},
    { id: 'monkey', extra: cloneAnimal(animalCopy.rat, {
      keyword: box('재치·연결', 'Wit', '機転', '机智', 'Esprit', 'Vindingrijkheid', 'Linh hoạt', 'Cerdik'),
      scores: { overall: 8, love: 7, money: 8, health: 6, work: 8 },
      lucky: { color_kr: '레몬', color_en: 'lemon yellow', number: 7 },
      overall: box('아이디어가 많을수록 하나만 고르는 연습이 필요해요. 집중이 성과를 만듭니다.', 'Many ideas need one chosen focus—concentration makes results.', 'アイデアが多いほど一つに絞る。集中が成果。', '点子多时更要选一个，专注出成果。', 'Beaucoup d’idées exigent un focus—la concentration crée.', 'Veel ideeën vragen één focus—concentratie maakt resultaat.', 'Ý nhiều cần một trọng tâm—tập trung tạo kết quả.', 'Banyak idea perlu satu fokus—tumpuan hasilkan.'),
      saju_insight: '상관·식신의 조합이 살아날 때 유머가 독이 되지 않도록 경계하세요.'
    })},
    { id: 'rooster', extra: cloneAnimal(animalCopy.rat, {
      keyword: box('정확·완결', 'Precision', '正確', '精准', 'Précision', 'Precisie', 'Chính xác', 'Ketepatan'),
      scores: { overall: 7, love: 6, money: 8, health: 7, work: 8 },
      lucky: { color_kr: '버건디', color_en: 'burgundy', number: 11 },
      overall: box('디테일이 신뢰를 만듭니다. 체크리스트와 마감 시간을 함께 지키세요.', 'Details build trust—keep checklists and deadlines together.', '細部が信頼を作る。締切とチェックを両立。', '细节造就信任，清单与截止同行。', 'Les détails forgent la confiance—listes et délais ensemble.', 'Details bouwen vertrouwen—lijsten en deadlines samen.', 'Chi tiết tạo niềm tin—danh sách và hạn chót cùng nhau.', 'Perincian bina kepercayaan—senarai dan tarikh sama.'),
      saju_insight: '정관·편관의 기운이 정돈될수록 규칙이 보호막이 됩니다.'
    })},
    { id: 'dog', extra: cloneAnimal(animalCopy.rat, {
      keyword: box('의리·안전', 'Loyalty', '義理', '义气', 'Loyauté', 'Loyaliteit', 'Nghĩa khí', 'Setia'),
      scores: { overall: 8, love: 8, money: 6, health: 7, work: 7 },
      lucky: { color_kr: '네이비', color_en: 'navy', number: 10 },
      overall: box('믿음이 쌓이는 하루예요. 약속과 경계를 함께 말하면 오해가 줄어듭니다.', 'Trust grows—state promises and boundaries together to cut misunderstandings.', '信頼が積み上がる日。約束と境界を一緒に。', '信任累积之日，把承诺与边界说清楚。', 'La confiance monte—promesses et limites ensemble.', 'Vertrouwen groeit—afspraken en grenzen samen.', 'Niềm tin tăng—nói lời hứa và ranh giới cùng nhau.', 'Kepercayaan bertumbuh—janji dan sempadan bersama.'),
      saju_insight: '인성이 강할수록 남을 돕되 자신의 에너지도 챙기세요.'
    })},
    { id: 'pig', extra: cloneAnimal(animalCopy.rat, {
      keyword: box('풍요·나눔', 'Abundance', '豊かさ', '丰盈', 'Abondance', 'Overvloed', 'Đủ đầy', 'Kelimpahan'),
      scores: { overall: 8, love: 8, money: 7, health: 8, work: 6 },
      lucky: { color_kr: '피치', color_en: 'peach', number: 12 },
      overall: box('나눔이 복으로 돌아오는 날이에요. 작은 선물과 칭찬이 마음을 부드럽게 합니다.', 'Sharing returns as luck—small gifts and praise soften hearts.', '分かち合いが福に。小さな贈り物と褒め言葉。', '分享即福，小礼物与赞美柔化心。', 'Le partage revient en chance—petits cadeaux et louanges.', 'Delen keert terug als geluk—kleine geschenken.', 'Chia sẻ trở lại là may—quà nhỏ và lời khen.', 'Berkongsi jadi tuah—hadiah kecil dan pujian.'),
      saju_insight: '재성이 맑을수록 욕심을 줄이면 오히려 흐름이 넓어집니다.'
    })},
  ];

  for (const { id, extra } of variants) {
    o[id] = {
      keyword: extra.keyword,
      score: extra.scores,
      lucky: extra.lucky,
      sections: {
        overall: extra.overall,
        // 🔴 love~advice 는 extra 에서 받지 않는다. animalCopy 의 11개 띠가
        // cloneAnimal(animalCopy.rat, …) 로 만들어지는데 그 다섯을 덮어쓰지 않아
        // 12개 띠가 전부 rat 의 문장을 그대로 썼다(기간 4개까지 곱해 48 URL 동일).
        ...toneSections(`a:${id}`),
      },
      saju_insight: extra.saju_insight,
      cta: [
        { label_kr: '운명의 꽃 (사주)', label_en: 'Destiny Flower (Saju)', label_fr: 'Fleur du Destin', label_nl: 'Lotusbloem', label_vi: 'Hoa Vận Mệnh', label_ms: 'Bunga Takdir', url: 'https://code-destiny.com/#flower-saju', icon: '🌸' },
        { label_kr: '천운 타로', label_en: 'Zodiac Tarot', label_fr: 'Tarot du Zodiaque', label_nl: 'Dierenriem-tarot', label_vi: 'Tarot 12 con giáp', label_ms: 'Tarot Zodiak', url: 'https://code-destiny.com/#zodiac-tarot', icon: '✨' }
      ]
    };
  }
  return o;
}

function mkZodiacs() {
  const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  const o = {};
  signs.forEach((id, i) => {
    o[id] = {
      keyword: hashPick(`${dateStr}|z:${id}|keyword`, KEYWORD_POOL),
      score: { overall: 6 + (i % 4), love: 5 + (i % 5), money: 5 + (i % 5), health: 6 + (i % 4), work: 5 + (i % 5) },
      lucky: { ...hashPick(`${dateStr}|z:${id}|color`, COLOR_POOL), number: 1 + (i % 9) },
      planet_message: hashPick(`${dateStr}|z:${id}|planet`, ZODIAC_PLANET_POOL),
      sections: {
        overall: hashPick(`${dateStr}|z:${id}|overall`, ZODIAC_OVERALL_POOL),
        ...toneSections(`z:${id}`)
      },
      cta: [
        { label_kr: '점성술 운명의 꽃', label_en: 'Astrology Destiny Flower', label_fr: 'Fleur du Destin', label_nl: 'Lotusbloem', label_vi: 'Hoa Vận Mệnh', label_ms: 'Bunga Takdir', url: 'https://code-destiny.com/#flower-astro', icon: '🌸' },
        { label_kr: '코즈믹 차트', label_en: 'Cosmic Chart', label_fr: 'Carte Cosmique', label_nl: 'Kosmische Kaart', label_vi: 'Biểu Đồ Vũ Trụ', label_ms: 'Carta Kosmik', url: 'https://code-destiny.com/#cosmic-chart', icon: '✨' }
      ]
    };
  });
  return o;
}

function secTemplate(seed) {
  return {
    overall: box(
      '꽃돼지 연이: 오늘의 궁위(宮位) 에너지는 ' + seed + '에 맞춰 호흡을 길게 가져가면 실수가 줄고 마음이 안정됩니다.',
      'Yeoni: align breath with today’s palace—steady rhythm softens edges and restores calm.',
      'エニ：今日の宮のエネルギーに呼吸を合わせると落ち着きます。',
      '花猪恩伊：与今日宫位能量对齐呼吸，心更稳。',
      'Yeoni : alignez le souffle sur le palais du jour.',
      'Yeoni: stem adem op het paleis van vandaag.',
      'Yeoni: đồng bộ hơi thở với cung hôm nay.',
      'Yeoni: selaraskan nafas dengan istana hari ini.'
    ),
    love: box(
      '관계에서는 말보다 타이밍이 먼저예요. 짧게 확인하고 길게 들어 주세요.',
      'In relationships, timing beats volume—check in briefly, listen longer.',
      '関係ではタイミングが先。短く確認、長く聴く。',
      '关系里时机先于音量：短确认、长倾听。',
      'Dans les liens, le timing passe avant le volume.',
      'In relaties telt timing meer dan volume.',
      'Trong quan hệ, thời điểm quan trọng hơn âm lượng.',
      'Dalam hubungan, masa lebih utama daripada volume.'
    ),
    money: box(
      '흐름을 세 번 점검하면 지출이 줄어듭니다. 작은 예산이 큰 안심을 줍니다.',
      'Review cashflow thrice—small budgets buy big calm.',
      'キャッシュフローを三度確認。小さな予算が安心。',
      '三遍检查现金流，小预算大安心。',
      'Trois vérifications du flux : petit budget, grand calme.',
      'Drie checks van de stroom: klein budget, rust.',
      'Kiểm tra dòng tiền ba lần—ngân sách nhỏ, an tâm lớn.',
      'Periksa aliran tiga kali—bajet kecil, tenang besar.'
    ),
    health: box(
      '목과 눈의 피로를 풀어 주세요. 따뜻한 물 한 잔이 회복의 시작입니다.',
      'Ease neck and eye strain—a warm cup starts recovery.',
      '首と目の疲れをほぐす。温かい一杯が回復の始まり。',
      '放松颈眼疲劳，一杯温水开始恢复。',
      'Détendez cou et yeux—une tasse tiède commence la récupération.',
      'Ontspan nek en ogen—een warme kop start herstel.',
      'Thả lỏng cổ và mắt—một cốc ấm bắt đầu hồi phục.',
      'Longgarkan leher dan mata—secawan hangat mulakan pemulihan.'
    ),
    work: box(
      '역할을 한 문장으로 정리하면 협업이 빨라집니다. 요약이 곧 배려입니다.',
      'One-line role clarity speeds teamwork—summary is care.',
      '役割を一文で。要約が協力を速める。',
      '一句话厘清角色，协作更快。',
      'Une phrase sur le rôle accélère l’équipe.',
      'Eén zin over je rol versnelt teamwork.',
      'Một cây về vai trò giúp nhóm nhanh hơn.',
      'Satu ayat peranan mempercepat kerjasama.'
    ),
    advice: box(
      '꿀꿀 연이: 자미두수는 방향을 보여줄 뿐, 선택은 언제나 당신의 자유예요.',
      'Yeoni: Zi Wei shows directions—your choice stays free.',
      'エニ：紫微は方向を示すだけ。選ぶのはあなた。',
      '花猪恩伊：紫微只指路，选择仍在你手中。',
      'Yeoni : Zi Wei montre la direction—votre choix reste libre.',
      'Yeoni: Zi Wei toont richting—jouw keuze blijft vrij.',
      'Yeoni: Tử Vi chỉ hướng—lựa chọn vẫn là của bạn.',
      'Yeoni: Zi Wei tunjuk arah—pilihan tetap merdeka.'
    )
  };
}

function mkZiwei() {
  const slugs = ['mingong', 'jaeback', 'gwanllok', 'bubu', 'chunyi', 'bokdeok', 'janyeo', 'noebok', 'jilaek', 'jeonaek', 'hyeongje', 'bumo'];
  const o = {};
  slugs.forEach((slug, i) => {
    const s = secTemplate(slug);
    o[slug] = {
      keyword: box('궁위·흐름', 'Palace flow', '宮位', '宫位', 'Palais', 'Paleis', 'Cung', 'Istana'),
      score: { overall: 6 + (i % 4), love: 5 + (i % 5), money: 5 + (i % 5), health: 6 + (i % 4), work: 5 + (i % 5) },
      lucky: { color_kr: '보라', color_en: 'violet', number: 2 + (i % 8) },
      star_tip: box(
        '오늘 이 궁위에는 부드러운 화(化) 기운이 스며듭니다. 급하게 결론 내리지 말고 한 번 더 확인해 보세요.',
        'Soft transforming qi touches this palace today—verify once more before you conclude.',
        '今日は柔らかい化の気が。この宮位では結論を急がない。',
        '今日柔化的能量渗入此宫，结论前先再确认。',
        'Une qi de transformation douce—vérifiez avant de conclure.',
        'Zachte transformerende qi—check vóór je beslist.',
        'Khí hóa mềm—xác nhận lại trước kết luận.',
        'Qi lembut—sahkan sebelum memutuskan.'
      ),
      sections: s,
      cta: [
        { label_kr: '자미두수 차트', label_en: 'Zi Wei Chart', label_fr: 'Carte Zi Wei', label_nl: 'Zi Wei Kaart', label_vi: 'Biểu Đồ Tử Vi', label_ms: 'Carta Zi Wei', url: 'https://code-destiny.com/#ziwei-chart', icon: '🌌' },
        { label_kr: '자미 운명의 꽃', label_en: 'Zi Wei Flower', label_fr: 'Fleur Zi Wei', label_nl: 'Zi Wei Bloem', label_vi: 'Hoa Tử Vi', label_ms: 'Bunga Zi Wei', url: 'https://code-destiny.com/#flower-ziwei', icon: '🌺' }
      ]
    };
  });
  return o;
}

function mkSukuyo() {
  const o = {};
  for (let n = 1; n <= 27; n++) {
    const i = n - 1;
    const s = secTemplate('숙' + n);
    o[String(n)] = {
      keyword: box('달빛·숙', 'Mansion', '宿', '宿', 'Mansion', 'Verblijf', 'Tú', 'Penginapan'),
      score: { overall: 6 + (i % 4), love: 5 + (i % 5), money: 5 + (i % 5), health: 6 + (i % 4), work: 5 + (i % 5) },
      lucky: { color_kr: '은빛', color_en: 'silver', number: 1 + (i % 9) },
      deity_message: box(
        '오늘의 숙은 조용한 용기를 요청해요. 한 걸음만 앞으로 가도 달빛이 길을 비춥니다.',
        'Today’s mansion asks for quiet courage—one step forward and moonlight shows the path.',
        '今日の宿は静かな勇気を。一歩で月光が道を照らす。',
        '今日星宿要安静的勇气，一步月光照路。',
        'Le mansion d’aujourd’hui demande un courage doux.',
        'Het verblijf vraagt zachte moed vandaag.',
        'Tú hôm nay cần can đảm dịu.',
        'Penginapan hari ini minta keberanian lembut.'
      ),
      sections: s,
      cta: [
        { label_kr: '숙요 차트', label_en: 'Sukuyo Chart', label_fr: 'Carte Sukuyo', label_nl: 'Sukuyo Kaart', label_vi: 'Biểu Đồ Sukuyo', label_ms: 'Carta Sukuyo', url: 'https://code-destiny.com/#sukuyo-chart', icon: '💫' },
        { label_kr: '숙요 운명의 꽃', label_en: 'Sukuyo Flower', label_fr: 'Fleur Sukuyo', label_nl: 'Sukuyo Bloem', label_vi: 'Hoa Sukuyo', label_ms: 'Bunga Sukuyo', url: 'https://code-destiny.com/#flower-sukuyo', icon: '🌙' }
      ]
    };
  }
  return o;
}

function mkVedic() {
  const keys = ['mesha', 'vrishabha', 'mithuna', 'karka', 'simha', 'kanya', 'tula', 'vrishchika', 'dhanu', 'makara', 'kumbha', 'meena'];
  const o = {};
  keys.forEach((slug, i) => {
    const s = secTemplate(slug);
    o[slug] = {
      keyword: box('그라하·리듬', 'Graha', 'グラハ', '行星', 'Graha', 'Graha', 'Graha', 'Graha'),
      score: { overall: 6 + (i % 4), love: 5 + (i % 5), money: 5 + (i % 5), health: 6 + (i % 4), work: 5 + (i % 5) },
      lucky: { color_kr: '사프란', color_en: 'saffron', number: 3 + (i % 7) },
      nakshatra_tip: box(
        '오늘의 낙샤트라는 호흡과 식사 리듬을 맞추면 판단이 선명해집니다.',
        'Today’s nakshatra favors clear meals and breath—judgment sharpens.',
        '今日のナクシャトラは食と呼吸のリズムで判断が澄む。',
        '今日星宿配合饮食与呼吸，判断更清晰。',
        'Le nakshatra d’aujourd’hui aime repas et souffle clairs.',
        'Nakshatra vandaag: adem en maaltijd ritme.',
        'Nakshatra hôm nay: nhịp ăn và thở.',
        'Nakshatra hari ini: irama makan dan nafas.'
      ),
      mantra_tip: box(
        '따뜻한 색 한 가지를 소품으로 두면 마음이 가라앉습니다.',
        'Keep one warm color nearby as a token—mind settles.',
        '暖色を一つ。心が静まります。',
        '身边放一件暖色，心更稳。',
        'Une couleur chaude près de vous apaise l’esprit.',
        'Eén warme kleur nabij kalmeert.',
        'Một màu ấm gần bên giúp an tâm.',
        'Satu warna hangat dekat menenangkan.'
      ),
      saju_bridge_kr: '오늘의 오행 리듬은 ' + ['목', '화', '토', '금', '수'][i % 5] + ' 기운과 공명합니다. 과한 욕심만 줄이면 흐름이 넓어집니다.',
      sections: s,
      cta: [
        { label_kr: '베다 차트', label_en: 'Vedic Chart', label_fr: 'Carte Védique', label_nl: 'Vedische Kaart', label_vi: 'Biểu Đồ Vệ Đà', label_ms: 'Carta Vedik', url: 'https://code-destiny.com/#vedic-chart', icon: '🪐' },
        { label_kr: '천운 타로', label_en: 'Zodiac Tarot', label_fr: 'Tarot', label_nl: 'Tarot', label_vi: 'Tarot', label_ms: 'Tarot', url: 'https://code-destiny.com/#zodiac-tarot', icon: '✨' }
      ]
    };
  });
  return o;
}

const payload = {
  date: dateStr,
  generated_at,
  prompt_version: 'v3.0',
  daily_editorial: {
    intro_kr: `${dateStr} (${weekdayKr}) 오늘의 운세 핵심은 "${SEO_THEME_KR}"입니다. 달의 흐름(${moonPhaseLabel})을 따라 작은 루틴을 지키면 복이 크게 자랍니다.`,
    intro_en: `${dateStr} daily fortune focuses on ${SEO_THEME_EN}. With the ${moonPhaseLabel} rhythm, small routines can create meaningful luck.`,
    home_cta_kr: '오늘의 운세 전체 해석과 무료 사주/타로/점성술은 홈페이지에서 확인하세요.',
    home_cta_url: homeEntryUrl,
  },
  daily_seo: {
    title_kr: `${dateStr} 오늘의 운세 | ${SEO_THEME_KR} 총정리`,
    description_kr: `${dateStr} (${weekdayKr}) 오늘의 운세를 사주·점성술·자미두수·숙요·베다 관점으로 통합 분석했습니다. ${SEO_THEME_KR} 포인트와 홈에서 바로 이어지는 무료 분석 링크를 제공합니다.`,
    title_en: `${dateStr} Daily Fortune | ${SEO_THEME_EN} guide`,
    description_en: `${dateStr} daily fortune with integrated Saju, Astrology, Zi Wei, Sukuyo, and Vedic insights. Includes ${SEO_THEME_EN} and direct homepage entry links.`,
    canonical_like: `https://code-destiny.com/fortune/data/daily-${dateStr}.json`,
    keywords_kr: ['오늘의 운세', dateStr, SEO_THEME_KR, '무료 운세', '사주', '점성술', '숙요', '자미두수', '베다점'],
    keywords_en: ['daily fortune', dateStr, SEO_THEME_EN, 'free horoscope', 'saju', 'astrology', 'sukuyo', 'zi wei', 'vedic'],
  },
  ziwei_today: {
    solar_date: dateStr,
    lunar_date: lunarStr,
    ilchin,
    active_palace_today: '명궁',
    sihua_today: '화(化) 기운이 은은하게 흐르니, 약속은 짧게·실행은 확실하게.',
    sihua_this_month: '이달은 인연·재물 궁에서 변화 신호가 교차합니다.',
    sihua_this_year: '올해는 책임과 성장이 동시에 요구되는 흐름입니다.',
    sihua_next_year: '내년은 정리와 재출발의 밸런스가 핵심입니다.',
  },
  sukuyo_meta: {
    solar_date: dateStr,
    today_mansion: {
      name_kr: '방숙(房宿)',
      name_en: 'Room Mansion',
      element: '火',
      energy_kr: '따뜻한 기운이 관계와 집안을 부드럽게 이어 줍니다. 급한 결정은 피하고, 한 박자 쉬어 가세요.',
    },
    this_month_dominant: '실숙(室宿)',
    this_year_dominant: '규숙(奎宿)',
    next_year_dominant: '정숙(井宿)',
  },
  panchanga_today: {
    solar_date: dateStr,
    tithi: panchTithi,
    vara: varaEn,
    nakshatra: panchNak,
    yoga: panchYoga,
    karana: panchKarana,
    summary_kr: '오늘의 판차앙가는 실행력과 인내가 함께 요구됩니다. 작은 의식으로 하루를 시작하면 마음이 정돈됩니다.',
    summary_en: 'Today’s panchanga favors patient action—start with a small ritual to steady the mind.',
    key_graha_now: ['Jupiter in Gemini', 'Saturn in Pisces'],
    this_year_theme_kr: '확장과 책임의 균형',
    next_year_theme_kr: '정리 후 재도약',
  },
  calendar: {
    solar_date: dateStr,
    lunar_date: lunarStr,
    ilchin,
    wolgeon,
    year_ganji: yearGanji,
    next_year_ganji: nextYearGanji,
    current_jeolgi: '절기 전환기 · 기운 정돈',
    this_month,
    this_year,
    next_year,
  },
  sky_today: {
    solar_date: dateStr,
    moon_phase: moonPhaseLabel,
    moon_sign: moonSignEn,
    retrograde: ['none notable'],
    key_transits: [
      'Sun sign season by date',
      'Moon in ' + moonSignEn + '—observe emotional tone',
      'Rhythm over rush—small rituals help',
    ],
    this_month_new_moon: newMoonYmd || '',
    this_month_full_moon: fullMoonYmd || '',
  },
  animals: mkAnimals(),
  zodiacs: mkZodiacs(),
  ziwei: mkZiwei(),
  sukuyo: mkSukuyo(),
  vedic: mkVedic(),
};

// 날짜별 발행물의 상단 SEO/소개도 카드 문구와 같은 정본으로 보관한다. 기존 *_kr/*_en
// 필드는 외부 소비자 호환을 위해 유지하고, 새 화면은 아래 locale map을 우선 사용한다.
payload.daily_editorial.localized = {
  en: { intro: payload.daily_editorial.intro_en, homeCta: 'Read the full daily reading on Code Destiny.' },
  ja: { intro: `${dateStr}の今日の運勢は${({ '연애운': '恋愛運', '금전운': '金運', '직장운': '仕事運', '건강운': '健康運', '인간관계운': '人間関係運', '행운 포인트': '開運ポイント' })[SEO_THEME_KR] || '開運ポイント'}がテーマです。月のリズムに合わせ、小さな習慣を整えましょう。`, homeCta: 'Code Destinyで今日の詳しい運勢を読む' },
  'zh-CN': { intro: `${dateStr}的今日运势以${({ '연애운': '感情运', '금전운': '财运', '직장운': '事业运', '건강운': '健康运', '인간관계운': '人际关系运', '행운 포인트': '幸运要点' })[SEO_THEME_KR] || '幸运要点'}为重点。顺着月亮的节奏守住小习惯，好运会逐渐累积。`, homeCta: '在 Code Destiny 查看完整的今日运势' },
  'zh-TW': { intro: `${dateStr}的今日運勢以${({ '연애운': '感情運', '금전운': '財運', '직장운': '事業運', '건강운': '健康運', '인간관계운': '人際關係運', '행운 포인트': '幸運要點' })[SEO_THEME_KR] || '幸運要點'}為重點。順著月亮的節奏守住小習慣，好運會逐漸累積。`, homeCta: '在 Code Destiny 查看完整的今日運勢' },
};
payload.daily_seo.localized = {
  en: { title: payload.daily_seo.title_en, description: payload.daily_seo.description_en, keywords: payload.daily_seo.keywords_en },
  ja: { title: `${dateStr} 今日の運勢 | 開運ガイド`, description: `${dateStr}の今日の運勢を四柱推命・占星術・紫微斗数・宿曜・ヴェーダの視点から読み解きます。`, keywords: ['今日の運勢', dateStr, '無料占い', '四柱推命', '宿曜'] },
  'zh-CN': { title: `${dateStr} 今日运势 | 幸运指南`, description: `从四柱推命、占星术、紫微斗数、宿曜与吠陀视角解读${dateStr}的今日运势。`, keywords: ['今日运势', dateStr, '免费运势', '四柱推命', '宿曜'] },
  'zh-TW': { title: `${dateStr} 今日運勢 | 幸運指南`, description: `從四柱推命、占星術、紫微斗數、宿曜與吠陀視角解讀${dateStr}的今日運勢。`, keywords: ['今日運勢', dateStr, '免費運勢', '四柱推命', '宿曜'] },
};

const localizedPayload = addDailyLocaleFields(payload);

for (const outFile of outFiles) {
  fs.writeFileSync(outFile, JSON.stringify(localizedPayload, null, 2), 'utf8');
  console.log('Wrote', outFile);
}
