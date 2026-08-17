/**
 * 매일 운세 생성 (프롬프트 v3) →
 * - fortune/data/daily-YYYY-MM-DD.json
 * - public/fortune/data/daily-YYYY-MM-DD.json
 * 날짜: FORTUNE_DATE 또는 --date=, 기본 KST 오늘
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { parseFortuneDate, kstIsoNow } from './lib/fortune-date.mjs';
import { moonSkyForDate } from './lib/moon-sky.mjs';

const require = createRequire(import.meta.url);
const { Solar, LunarYear } = require('lunar-javascript');

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
const solar = Solar.fromYmd(y, m, d);
const lunar = solar.getLunar();
const lunarStr = `음력 ${lunar.getYear()}년 ${lunar.getMonth() < 0 ? '윤' : ''}${Math.abs(lunar.getMonth())}월 ${lunar.getDay()}일`;
const ilchin = lunar.getDayInGanZhi();
const yearGanji = LunarYear.fromYear(lunar.getYear()).getGanZhi() + '年';
const nextYearGanji = LunarYear.fromYear(lunar.getYear() + 1).getGanZhi() + '年';
const wolgeon = lunar.getMonthInGanZhiExact() + '月';
const this_month = `${y}-${String(m).padStart(2, '0')}`;
const this_year = y;
const next_year = y + 1;
const WEEK_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEK_KR = ['일', '월', '화', '수', '목', '금', '토'];
const varaEn = WEEK_EN[solar.getWeek()];
const weekdayKr = WEEK_KR[solar.getWeek()];
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

function box(kr, en, jp, cn, fr, nl, vi, ms) {
  return { kr, en, jp, cn, fr, nl, vi, ms };
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
const TONE_POOLS = {
  love: [
    box('직진보다는 온도 조절이 필요해요. 유머 한 스푼이 긴장을 풀어 줍니다.', 'Tune the temperature—humor dissolves tension better than rushing.', '直進より温度調整。ユーモアが緊張をほぐします。', '直进不如调温，一勺幽默化解紧张。', 'Réglez la température—l’humour dissout la tension.', 'Temperatuur tunen—humor lost spanning op.', 'Điều chỉnh nhiệt—tiếng cười xả căng.', 'Laras suhu—jenaka cair ketegangan.'),
    box('하고 싶은 말을 먼저 적어 보세요. 문장이 정리되면 목소리도 부드러워집니다.', 'Write it down first—once the sentence settles, your voice softens too.', '言いたいことを先に書くと、声もやわらぎます。', '先把想说的写下来，语气自然会软下来。', 'Écrivez d’abord—la phrase posée adoucit la voix.', 'Schrijf het eerst op—de zin kalmeert je stem.', 'Viết ra trước—câu chữ gọn thì giọng cũng dịu.', 'Tulis dahulu—ayat yang kemas melembutkan suara.'),
    box('오늘은 답장 속도보다 답장의 온도가 관계를 좌우해요.', 'Today the warmth of your reply matters more than its speed.', '今日は返信の速さより温度が効きます。', '今天回复的温度比速度更重要。', 'Aujourd’hui, la chaleur de la réponse prime sur la vitesse.', 'Vandaag telt de warmte van je antwoord, niet de snelheid.', 'Hôm nay hơi ấm của lời đáp hơn tốc độ.', 'Hari ini kehangatan balasan mengatasi kelajuan.'),
    box('서운함은 쌓아 두지 말고 가장 작은 조각부터 꺼내 보세요.', 'Don’t stack up the hurt—start with the smallest piece.', '不満はためず、小さな一片から。', '别把委屈攒着，从最小的一块说起。', 'N’empilez pas la peine—commencez par le plus petit morceau.', 'Stapel het niet op—begin bij het kleinste stukje.', 'Đừng dồn nén—bắt đầu từ mảnh nhỏ nhất.', 'Jangan timbun rasa—mula dari kepingan terkecil.'),
    box('상대의 말끝을 끊지 않는 것만으로 오늘의 대화는 절반쯤 성공입니다.', 'Just not cutting them off gets today’s conversation halfway home.', '相手の語尾を切らないだけで会話は半分成功。', '不打断对方，今天的对话就成功了一半。', 'Ne pas couper la parole—la conversation est à moitié gagnée.', 'Niet onderbreken—het gesprek is half geslaagd.', 'Chỉ cần không cắt lời—cuộc trò chuyện đã thành nửa.', 'Cukup tidak memotong kata—perbualan separuh berjaya.'),
    box('약속을 하나 줄이고 그 시간을 한 사람에게 온전히 쓰면 마음이 남습니다.', 'Cancel one plan and give that hour wholly to one person—it lingers.', '予定を一つ減らし、その時間を一人に。心が残ります。', '减掉一个约会，把时间完整给一个人，心意会留下。', 'Annulez un rendez-vous et donnez l’heure à une seule personne.', 'Schrap één afspraak en geef dat uur aan één mens.', 'Bớt một hẹn, dành trọn giờ đó cho một người.', 'Kurangkan satu janji, beri jam itu pada satu orang.'),
    box('익숙한 사이일수록 고맙다는 말이 늦어져요. 오늘 한 번 앞당겨 보세요.', 'The closer the bond, the later thanks arrive—move it up today.', '近い関係ほど感謝が遅れます。今日は先に。', '越熟悉越容易迟到的，是那句谢谢。今天提前说。', 'Plus le lien est proche, plus le merci tarde—devancez-le.', 'Hoe hechter, hoe later het dankjewel—zeg het nu.', 'Càng thân, lời cảm ơn càng muộn—hôm nay nói sớm.', 'Makin rapat, makin lewat ucapan terima kasih—awalkan hari ini.'),
    box('기대를 말로 옮기면 오해가 줄어요. 짐작 대신 문장을 쓰세요.', 'Say the expectation out loud—sentences beat guesswork.', '期待は言葉に。推測より一文を。', '把期待说出口，用句子代替猜测。', 'Dites l’attente—une phrase vaut mieux qu’une supposition.', 'Spreek de verwachting uit—een zin verslaat gissen.', 'Nói ra kỳ vọng—câu chữ hơn phỏng đoán.', 'Luahkan jangkaan—ayat lebih baik daripada tekaan.'),
  ],
  money: [
    box('작은 예산이 큰 안심을 줘요. 충동 결제 전에 숫자를 한 번 더 적어 보세요.', 'Small budgets bring big calm—write numbers once before impulse buys.', '小さな予算が安心を。衝動買いの前に数字を。', '小预算大安心，冲动前再写一遍数字。', 'Petit budget, grand calme—notez les chiffres avant achat impulsif.', 'Klein budget, groot rust—schrijf cijfers vóór impuls.', 'Ngân sách nhỏ, an tâm lớn—ghi số trước khi mua.', 'Bajet kecil, tenang besar—tulis angka sebelum impuls.'),
    box('버는 쪽보다 새는 쪽을 먼저 보세요. 구독 목록 한 번이면 충분합니다.', 'Look at the leaks before the earnings—one pass over subscriptions is enough.', '稼ぐ前に漏れを。サブスク一覧を一度。', '先看漏口再看收入，翻一遍订阅就够。', 'Regardez les fuites avant les gains—une passe sur les abonnements.', 'Kijk eerst naar lekken—één blik op abonnementen volstaat.', 'Xem chỗ rò trước khoản thu—rà một lượt gói đăng ký.', 'Lihat kebocoran dahulu—satu semakan langganan memadai.'),
    box('큰 결정은 하루만 묵혀 두면 값이 달라 보입니다.', 'Let a big decision sit one night—the price looks different by morning.', '大きな決断は一晩置くと値段が変わって見えます。', '大决定放一晚，价格看起来就不同了。', 'Laissez la grande décision dormir une nuit—le prix change.', 'Laat een groot besluit één nacht rusten—de prijs oogt anders.', 'Để quyết định lớn qua một đêm—giá trông khác đi.', 'Biarkan keputusan besar semalam—harganya nampak lain.'),
    box('할인보다 필요를 먼저 확인하세요. 필요 없는 절약이 가장 비쌉니다.', 'Check the need before the discount—unneeded savings cost the most.', '割引より必要性を先に。要らない節約が一番高い。', '先看需要再看折扣，不必要的节省最贵。', 'Vérifiez le besoin avant la remise—l’économie inutile coûte cher.', 'Check de behoefte vóór de korting—onnodig besparen is duur.', 'Xét nhu cầu trước khuyến mãi—tiết kiệm thừa là đắt nhất.', 'Semak keperluan sebelum diskaun—jimat tak perlu paling mahal.'),
    box('통장을 목적별로 나누면 쓰는 손이 저절로 느려집니다.', 'Split accounts by purpose and your spending hand slows on its own.', '口座を目的別に分けると手が自然に止まります。', '把账户按用途分开，花钱的手自然会慢。', 'Séparez les comptes par objectif—la main ralentit d’elle-même.', 'Split rekeningen per doel—je hand vertraagt vanzelf.', 'Chia tài khoản theo mục đích—tay tiêu tự chậm lại.', 'Asingkan akaun ikut tujuan—tangan belanja perlahan sendiri.'),
    box('오늘 들어온 정보는 반쯤만 믿고, 숫자는 직접 확인하세요.', 'Trust today’s tip halfway—verify the numbers yourself.', '今日の情報は半分だけ信じ、数字は自分で確認を。', '今天的消息信一半，数字自己核对。', 'Croyez l’info à moitié—vérifiez les chiffres vous-même.', 'Geloof de tip half—controleer de cijfers zelf.', 'Tin tin tức một nửa—tự kiểm tra con số.', 'Percaya maklumat separuh—semak angka sendiri.'),
    box('빌려주고 빌리는 이야기는 문서로 남기면 관계가 삽니다.', 'Put lending in writing—the paperwork is what saves the friendship.', '貸し借りは書面に。関係が守られます。', '借贷落在纸上，关系才留得住。', 'Mettez les prêts par écrit—c’est ce qui sauve l’amitié.', 'Zet leningen op papier—dat redt de vriendschap.', 'Ghi rõ chuyện vay mượn—giấy tờ giữ tình bạn.', 'Catat hal pinjaman—dokumen menyelamatkan hubungan.'),
    box('작게 시작한 적립이 이번 달의 체감을 바꿉니다.', 'A small automatic set-aside changes how this month feels.', '小さな積立が今月の体感を変えます。', '小额定存会改变这个月的体感。', 'Une petite mise de côté change le ressenti du mois.', 'Een klein automatisch potje verandert de maand.', 'Khoản để dành nhỏ đổi cảm nhận cả tháng.', 'Simpanan kecil mengubah rasa bulan ini.'),
  ],
  health: [
    box('햇볕과 가벼운 산책이 기분을 환기시켜요. 수분도 잊지 마세요.', 'Sunlight and a light walk refresh you—hydrate too.', '日光と軽い散歩でリフレッシュ。水分も。', '阳光与散步提神，也别忘了水分。', 'Lumière et marche légère—hydratez-vous aussi.', 'Licht en wandeling—drink ook water.', 'Ánh nắng và đi bộ—nhớ uống nước.', 'Cahaya dan jalan ringan—minum air.'),
    box('어깨와 턱에 힘이 들어가 있진 않나요. 한 번 내려놓고 숨을 길게 쉬세요.', 'Check your shoulders and jaw—let them drop and lengthen the breath.', '肩と顎に力が入っていませんか。緩めて長く呼吸を。', '看看肩膀和下巴是不是绷着，放下来，慢慢呼吸。', 'Épaules et mâchoire crispées ? Relâchez et respirez long.', 'Schouders en kaak gespannen? Laat los, adem lang.', 'Vai và hàm có đang gồng? Thả lỏng, thở dài ra.', 'Bahu dan rahang tegang? Lepaskan, tarik nafas panjang.'),
    box('카페인을 한 잔 줄이면 오늘 밤 잠의 질이 달라집니다.', 'One cup less of caffeine changes tonight’s sleep.', 'カフェインを一杯減らすと今夜の眠りが変わります。', '少喝一杯咖啡，今晚的睡眠就不一样。', 'Une tasse de moins—le sommeil de ce soir change.', 'Eén kop minder cafeïne verandert je nacht.', 'Bớt một ly cà phê—giấc đêm nay khác hẳn.', 'Kurang satu cawan kafein—tidur malam ini berbeza.'),
    box('앉은 시간이 길어질수록 허리보다 눈이 먼저 지칩니다. 20분마다 멀리 보세요.', 'Sitting tires the eyes before the back—look far away every twenty minutes.', '座り続けると腰より目が先に疲れます。20分ごとに遠くを。', '久坐先累的是眼睛，每20分钟望远一次。', 'Assis, les yeux fatiguent avant le dos—regardez loin toutes les 20 min.', 'Zitten vermoeit ogen eerder dan rug—kijk elke 20 min ver.', 'Ngồi lâu mỏi mắt trước lưng—cứ 20 phút nhìn xa.', 'Duduk lama melelahkan mata dahulu—pandang jauh tiap 20 minit.'),
    box('끼니를 거르지 않는 것이 오늘의 가장 확실한 컨디션 관리예요.', 'Not skipping meals is today’s surest way to hold your condition.', '食事を抜かないことが今日一番確実な体調管理。', '不漏掉一餐，就是今天最稳的状态管理。', 'Ne sautez pas de repas—c’est la gestion la plus sûre.', 'Geen maaltijd overslaan is vandaag de zekerste zorg.', 'Không bỏ bữa là cách giữ sức chắc nhất hôm nay.', 'Jangan lewatkan makan—cara paling pasti hari ini.'),
    box('몸이 보내는 작은 신호를 미루지 마세요. 오늘의 10분이 다음 주를 아낍니다.', 'Don’t postpone the small signals—ten minutes today saves next week.', '体の小さなサインを後回しにしないで。今日の10分が来週を救う。', '别推迟身体的小信号，今天10分钟省下下周。', 'Ne remettez pas les petits signaux—10 minutes aujourd’hui.', 'Stel kleine signalen niet uit—10 minuten nu spaart je week.', 'Đừng hoãn tín hiệu nhỏ—10 phút nay đỡ tuần sau.', 'Jangan tangguh isyarat kecil—10 minit kini jimat minggu depan.'),
    box('스트레칭은 길이보다 빈도예요. 짧게 자주 펴 주세요.', 'Stretching is about frequency, not length—short and often.', 'ストレッチは長さより頻度。短く何度も。', '拉伸看频率不看时长，短而频繁。', 'L’étirement, c’est la fréquence—court et souvent.', 'Rekken gaat om frequentie—kort en vaak.', 'Giãn cơ cần tần suất—ngắn và thường xuyên.', 'Regangan perlu kekerapan—pendek dan kerap.'),
    box('잠들기 한 시간 전 화면을 내려놓으면 회복 속도가 붙습니다.', 'Put the screen down an hour before bed and recovery speeds up.', '就寝1時間前に画面を置くと回復が早まります。', '睡前一小时放下屏幕，恢复会更快。', 'Posez l’écran une heure avant—la récupération accélère.', 'Leg het scherm een uur voor bed weg—herstel versnelt.', 'Bỏ màn hình một giờ trước ngủ—hồi phục nhanh hơn.', 'Letak skrin sejam sebelum tidur—pemulihan laju.'),
  ],
  work: [
    box('리더십은 속도가 아니라 명료함에서 나와요. 요약 한 줄이 팀을 구합니다.', 'Leadership comes from clarity, not speed—one summary line saves the team.', 'リーダーシップは明瞭さから。一行の要約がチームを救う。', '领导力来自清晰而非速度，一句摘要救团队。', 'Le leadership vient de la clarté—une ligne résume et sauve.', 'Leiderschap is helderheid—één regel redt het team.', 'Lãnh đạo đến từ rõ ràng—một dòng tóm tắt cứu nhóm.', 'Kepimpinan dari kejelasan—satu baris ringkasan selamatkan pasukan.'),
    box('새 일을 벌이기보다 걸려 있는 일을 닫는 쪽이 오늘은 점수를 받습니다.', 'Closing what’s open scores higher today than starting something new.', '新規より、止まっている案件を閉じる方が評価されます。', '今天关掉悬着的事，比开新坑更得分。', 'Fermer ce qui traîne rapporte plus qu’ouvrir du neuf.', 'Afsluiten wat openstaat scoort vandaag hoger.', 'Đóng việc còn treo được điểm hơn mở việc mới.', 'Tutup kerja tergantung lebih bernilai hari ini.'),
    box('회의 전에 결론을 한 문장으로 정해 두면 시간이 절반으로 줄어요.', 'Decide the conclusion in one sentence before the meeting—it halves the time.', '会議前に結論を一文で決めると時間が半分に。', '开会前把结论写成一句话，时间省一半。', 'Fixez la conclusion en une phrase avant la réunion.', 'Bepaal de conclusie in één zin vóór de meeting.', 'Chốt kết luận một câu trước họp—thời gian giảm nửa.', 'Tetapkan kesimpulan satu ayat sebelum mesyuarat.'),
    box('도움을 청하는 것이 가장 빠른 지름길인 날입니다. 혼자 붙들지 마세요.', 'Asking for help is today’s shortcut—don’t hold it alone.', '助けを求めるのが今日の近道。一人で抱えないで。', '今天开口求助就是捷径，别一个人扛。', 'Demander de l’aide est le raccourci du jour.', 'Om hulp vragen is vandaag de kortste weg.', 'Nhờ giúp là lối tắt hôm nay—đừng ôm một mình.', 'Minta bantuan ialah jalan pintas hari ini.'),
    box('기록을 남기세요. 오늘의 메모가 다음 달의 근거가 됩니다.', 'Write it down—today’s note becomes next month’s evidence.', '記録を残して。今日のメモが来月の根拠に。', '留下记录，今天的备注是下个月的依据。', 'Notez—la note d’aujourd’hui sera la preuve du mois prochain.', 'Leg vast—de notitie van nu is later je bewijs.', 'Ghi lại—ghi chú nay là căn cứ tháng sau.', 'Catat—nota hari ini jadi bukti bulan depan.'),
    box('완벽한 초안보다 빠른 초안이 낫습니다. 고칠 사람이 함께 있으니까요.', 'A fast draft beats a perfect one—you have people to fix it with.', '完璧な初稿より速い初稿。直す仲間がいます。', '快的初稿胜过完美的初稿，有人陪你改。', 'Un brouillon rapide vaut mieux qu’un parfait—on corrige à plusieurs.', 'Een snelle versie wint van een perfecte—samen verbeter je.', 'Bản nháp nhanh hơn bản hoàn hảo—có người cùng sửa.', 'Draf pantas kalahkan draf sempurna—ada yang membaiki bersama.'),
    box('우선순위를 세 개로 줄이면 나머지가 저절로 정리됩니다.', 'Cut priorities to three and the rest sorts itself out.', '優先順位を三つに絞れば残りは片づきます。', '把优先级砍到三个，其余自会归位。', 'Réduisez à trois priorités—le reste se range.', 'Beperk tot drie prioriteiten—de rest schikt zich.', 'Rút ưu tiên còn ba—phần còn lại tự xếp.', 'Kecilkan keutamaan kepada tiga—selebihnya tersusun.'),
    box('이견은 사람이 아니라 안(案)을 향하게 하세요. 그러면 논의가 앞으로 갑니다.', 'Aim disagreement at the proposal, not the person—then it moves forward.', '反論は人でなく案へ。議論が前に進みます。', '把异议对准方案而非人，讨论才会前进。', 'Visez la proposition, pas la personne—le débat avance.', 'Richt bezwaar op het voorstel, niet de persoon.', 'Nhắm bất đồng vào phương án, không vào người.', 'Tujukan bantahan pada cadangan, bukan orang.'),
  ],
  advice: [
    box('꿀꿀 연이: 오늘의 별은 \'용기 있는 부드러움\'이에요. 한 걸음 물러서면 더 잘 보입니다.', 'Yeoni: today’s star is “gentle courage”—step back to see farther.', 'エニ：今日の星は「優しい勇気」。一歩下がると見える。', '花猪恩伊：今日的星是“温柔的勇敢”，退一步看得更远。', 'Yeoni : l’étoile du jour est « courage doux »—reculez pour mieux voir.', 'Yeoni: ster is “zachte moed”—stap terug om verder te zien.', 'Yeoni: ngôi sao là “dũng cảm dịu”—lùi một bước để thấy xa hơn.', 'Yeoni: bintang hari ini “keberanian lembut”—undur satu langkah nampak jauh.'),
    box('꿀꿀 연이: 오늘은 잘하려는 마음보다 끝내려는 마음이 당신을 지켜 줘요.', 'Yeoni: today, wanting to finish protects you more than wanting to excel.', 'エニ：今日は上手くやるより、終わらせる気持ちが守ってくれます。', '花猪恩伊：今天，想做完比想做好更能护住你。', 'Yeoni : aujourd’hui, finir protège plus que briller.', 'Yeoni: vandaag beschermt afmaken je meer dan uitblinken.', 'Yeoni: hôm nay, muốn hoàn tất che chở bạn hơn muốn giỏi.', 'Yeoni: hari ini, mahu selesai lebih melindungi daripada mahu hebat.'),
    box('꿀꿀 연이: 비교는 잠시 접어 두세요. 어제의 나만 이기면 충분한 날입니다.', 'Yeoni: fold comparison away—beating yesterday’s self is enough today.', 'エニ：比較は少し置いて。昨日の自分に勝てば十分。', '花猪恩伊：把比较先收起来，赢过昨天的自己就够了。', 'Yeoni : rangez la comparaison—dépasser hier suffit.', 'Yeoni: leg vergelijken weg—gisteren verslaan is genoeg.', 'Yeoni: gác so sánh lại—thắng chính mình hôm qua là đủ.', 'Yeoni: simpan perbandingan—kalahkan diri semalam sudah cukup.'),
    box('꿀꿀 연이: 마음이 급할수록 가장 쉬운 일부터 하나 끝내 보세요. 길이 열립니다.', 'Yeoni: when you feel rushed, finish the easiest thing first—the path opens.', 'エニ：焦る時ほど一番簡単な一つを終わらせて。道が開きます。', '花猪恩伊：越急越先做完最简单的一件，路就开了。', 'Yeoni : pressé ? finissez le plus facile—la voie s’ouvre.', 'Yeoni: gehaast? maak eerst het makkelijkste af—de weg opent.', 'Yeoni: càng vội càng nên xong việc dễ nhất—đường sẽ mở.', 'Yeoni: makin tergesa, siapkan yang termudah—jalan terbuka.'),
    box('꿀꿀 연이: 거절도 다정할 수 있어요. 오늘은 그 연습을 해 보는 날입니다.', 'Yeoni: a no can be kind—today is for practising that.', 'エニ：断ることも優しくできます。今日はその練習を。', '花猪恩伊：拒绝也可以温柔，今天练习一次。', 'Yeoni : un refus peut être doux—entraînez-vous aujourd’hui.', 'Yeoni: nee zeggen kan lief—oefen het vandaag.', 'Yeoni: lời từ chối cũng có thể dịu—hôm nay hãy tập.', 'Yeoni: penolakan boleh lembut—hari ini masa berlatih.'),
    box('꿀꿀 연이: 하루가 뜻대로 안 풀려도, 잘 자고 일어나는 것까지가 오늘의 성공이에요.', 'Yeoni: even if the day resists, sleeping well counts as today’s success.', 'エニ：思い通りでなくても、よく眠れたら今日は成功です。', '花猪恩伊：就算不顺，好好睡一觉也算今天的成功。', 'Yeoni : même contrarié, bien dormir compte comme réussite.', 'Yeoni: ook als het tegenzit—goed slapen telt als succes.', 'Yeoni: dù ngày không thuận, ngủ ngon đã là thành công.', 'Yeoni: walau hari tak menjadi, tidur lena pun kejayaan.'),
    box('꿀꿀 연이: 고마운 사람에게 한 줄만 보내 보세요. 하루의 온도가 올라갑니다.', 'Yeoni: send one line to someone you’re grateful for—the day warms up.', 'エニ：感謝したい人に一行だけ。一日の温度が上がります。', '花猪恩伊：给想谢的人发一行字，这一天就暖了。', 'Yeoni : une ligne à qui vous êtes reconnaissant—le jour se réchauffe.', 'Yeoni: stuur één regel naar wie je dankbaar bent.', 'Yeoni: gửi một dòng tới người bạn biết ơn—ngày ấm lên.', 'Yeoni: hantar satu baris kepada yang anda syukuri.'),
    box('꿀꿀 연이: 완벽하지 않아도 시작한 사람이 결국 도착합니다. 오늘 첫 줄을 쓰세요.', 'Yeoni: the one who starts imperfectly still arrives—write the first line today.', 'エニ：完璧でなくても、始めた人が着きます。今日、最初の一行を。', '花猪恩伊：不完美但开始的人终会抵达，今天写下第一行。', 'Yeoni : celui qui commence, même imparfait, arrive—écrivez la première ligne.', 'Yeoni: wie onvolmaakt begint, komt aan—schrijf de eerste regel.', 'Yeoni: người bắt đầu dù chưa hoàn hảo vẫn tới—viết dòng đầu.', 'Yeoni: yang mula walau tak sempurna tetap sampai—tulis baris pertama.'),
  ],
};

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
  const namesKr = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리'];
  const namesEn = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const o = {};
  signs.forEach((id, i) => {
    o[id] = {
      keyword: hashPick(`${dateStr}|z:${id}|keyword`, KEYWORD_POOL),
      score: { overall: 6 + (i % 4), love: 5 + (i % 5), money: 5 + (i % 5), health: 6 + (i % 4), work: 5 + (i % 5) },
      lucky: { ...hashPick(`${dateStr}|z:${id}|color`, COLOR_POOL), number: 1 + (i % 9) },
      planet_message: box(
        namesKr[i] + ' 에너지는 오늘 호흡을 길게 가져갈수록 선택이 선명해져요. 속도보다 방향을 먼저 잡아 보세요.',
        namesEn[i] + ' energy clarifies choices when you lengthen your breath—choose direction before speed.',
        namesEn[i] + 'のエネルギーは呼吸を長くすると選択が澄みます。速度より方向。',
        namesEn[i] + ' 能量在放慢呼吸时更清晰，先方向后速度。',
        'Énergie ' + namesEn[i] + ' : la direction avant la vitesse.',
        namesEn[i] + '-energie: richting vóór snelheid.',
        'Năng lượng ' + namesEn[i] + ': hướng trước, tốc độ sau.',
        'Tenaga ' + namesEn[i] + ': arah dahulu, laju kemudian.'
      ),
      sections: {
        overall: box(
          namesKr[i] + '는 오늘 우주의 스포트라이트가 자기표현 쪽으로 기울어요. 짧게 말하고 길게 듣는 하루가 이깁니다.',
          'For ' + namesEn[i] + ', spotlight tilts toward self-expression—short words and long listening win today.',
          namesEn[i] + 'には自己表現へスポットライト。短く話し、長く聴く一日が勝ち。',
          namesEn[i] + '今日聚光灯倾向自我表达，少说多听更占优。',
          'Pour ' + namesEn[i] + ', projecteurs vers l’expression—parler court, écouter longtemps.',
          'Voor ' + namesEn[i] + ': spotlight naar expressie—kort spreken, lang luisteren.',
          'Với ' + namesEn[i] + ', ánh đèn về thể hiện—nói ngắn, nghe dài thắng.',
          'Untuk ' + namesEn[i] + ', sorot ke ekspresi—bercakap pendek, mendengar panjang menang.'
        ),
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

for (const outFile of outFiles) {
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Wrote', outFile);
}
