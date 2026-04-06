/**
 * _fix_fortune_special_pages.mjs
 * vedic(베다 점성)/ziwei(자미두수)/sukuyo(숙요) 페이지에 정적 콘텐츠 주입
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FORTUNE_BASE = join(__dirname, 'public', 'fortune');

// ─── 베다 12 라시 데이터 ───
const VEDIC_DATA = {
  mesha:    { kr: '메샤(양자리)', en: 'Mesha (Aries)', planet: '화성(Mangal)', element: '불(Fire/Agni)', traits: '용기, 선구, 활력, 독립심', desc: '베다 점성학 12 라시의 첫 번째 별자리로, 화성의 지배를 받아 용기와 새로운 시작의 에너지를 상징합니다. 드바다샤(12궁) 체계에서 메샤는 인체의 머리를 상징하며 지도력과 결단력이 강합니다.' },
  vrishabha:{ kr: '브리샤바(황소자리)', en: 'Vrishabha (Taurus)', planet: '금성(Shukra)', element: '땅(Earth/Prithvi)', traits: '인내, 안정, 감각미, 충실함', desc: '금성(슈크라)의 지배를 받는 두 번째 라시입니다. 물질적 풍요와 감각적 쾌락을 중시하며, 인체에서는 목과 성대를 상징합니다.' },
  mithuna:  { kr: '미투나(쌍둥이자리)', en: 'Mithuna (Gemini)', planet: '수성(Budha)', element: '공기(Air/Vayu)', traits: '소통, 지식, 재치, 적응력', desc: '수성(부다)의 지배를 받는 세 번째 라시로, 소통과 지식의 상징입니다. 베다 학문에서 미투나는 쌍(雙)으로서 음양의 결합을 의미합니다.' },
  karka:    { kr: '카르카(게자리)', en: 'Karka (Cancer)', planet: '달(Chandra)', element: '물(Water/Jal)', traits: '직관, 공감, 모성, 감수성', desc: '달(찬드라)의 지배를 받는 네 번째 라시입니다. 마음과 감정, 가정을 상징하며, 베다 점성학에서 달은 마음(마나스)의 카라카(대표행성)입니다.' },
  simha:    { kr: '심하(사자자리)', en: 'Simha (Leo)', planet: '태양(Surya)', element: '불(Fire/Agni)', traits: '카리스마, 권위, 창의, 관대함', desc: '태양(수리야)의 지배를 받는 다섯 번째 라시로, 왕권·권위·영혼의 상징입니다. 베다 학문에서 태양은 아트마(영혼)의 카라카입니다.' },
  kanya:    { kr: '칸야(처녀자리)', en: 'Kanya (Virgo)', planet: '수성(Budha)', element: '땅(Earth/Prithvi)', traits: '분석, 봉사, 섬세함, 실용성', desc: '수성(부다)이 다시 지배하는 여섯 번째 라시입니다. 봉사, 치유, 분석적 능력을 상징하며 인체에서 소화기를 나타냅니다.' },
  tula:     { kr: '툴라(천칭자리)', en: 'Tula (Libra)', planet: '금성(Shukra)', element: '공기(Air/Vayu)', traits: '균형, 조화, 외교, 정의', desc: '금성(슈크라)의 두 번째 지배 라시인 툴라는 균형과 공정의 상징입니다. 베다 법칙(다르마)과 정의를 추구하는 에너지가 강합니다.' },
  vrishchika:{ kr: '브리슈치카(전갈자리)', en: 'Vrishchika (Scorpio)', planet: '화성(Mangal)', element: '물(Water/Jal)', traits: '변환, 심층 탐구, 강렬함, 재생', desc: '화성(망갈)의 두 번째 지배 라시입니다. 죽음과 재생, 신비를 상징하며, 인체에서 생식기관과 연결되어 생명 에너지의 근원을 다룹니다.' },
  dhanu:    { kr: '다누(사수자리)', en: 'Dhanu (Sagittarius)', planet: '목성(Guru)', element: '불(Fire/Agni)', traits: '지혜, 철학, 확장, 낙관주의', desc: '목성(구루)의 지배를 받는 아홉 번째 라시입니다. 고등 지식·영적 탐구·먼 여행을 상징하며, 목성은 지식과 지혜의 카라카입니다.' },
  makara:   { kr: '마카라(염소자리)', en: 'Makara (Capricorn)', planet: '토성(Shani)', element: '땅(Earth/Prithvi)', traits: '야망, 인내, 책임, 실용주의', desc: '토성(샤니)의 지배를 받는 열 번째 라시로, 카르마와 책임의 상징입니다. 베다 점성학에서 토성은 정의·원인·결과의 카라카입니다.' },
  kumbha:   { kr: '쿰바(물병자리)', en: 'Kumbha (Aquarius)', planet: '토성(Shani)', element: '공기(Air/Vayu)', traits: '인도주의, 독창성, 미래지향, 지혜', desc: '토성(샤니)의 두 번째 지배 라시입니다. 집단 의식과 미래 비전을 상징하며, 베다 전통에서 쿰바는 항아리(물을 담는 그릇)를 의미합니다.' },
  meena:    { kr: '메에나(물고기자리)', en: 'Meena (Pisces)', planet: '목성(Guru)', element: '물(Water/Jal)', traits: '영성, 직관, 동정심, 초월', desc: '목성(구루)의 두 번째 지배 라시이자 12 라시 중 마지막입니다. 영성·해탈·초자연적 감각을 상징하며, 모크샤(해탈)를 담당하는 라시입니다.' },
};

// ─── 자미두수 12궁 데이터 ───
const ZIWEI_DATA = {
  mingong:  { kr: '명궁(命宮)', desc: '자미두수 12궁의 핵심으로, 개인의 천성·외모·기질·인생 방향성을 나타냅니다. 명궁의 별과 사화(四化)를 통해 삶 전체의 흐름을 파악합니다.' },
  hyeongje: { kr: '형제궁(兄弟宮)', desc: '형제자매·친구·동료 관계와의 인연 및 갈등을 드러냅니다. 비겁(比劫) 에너지가 강한 궁으로, 협력과 경쟁이 공존합니다.' },
  bubu:     { kr: '부부궁(夫婦宮)', desc: '연애·결혼·배우자와의 인연을 나타내는 궁입니다. 연애운과 혼인운을 분석하는 핵심 궁입니다.' },
  janyeo:   { kr: '자녀궁(子女宮)', desc: '자녀와의 인연, 창의력, 카리스마를 나타냅니다. 자녀 유무와 교육 방식, 창조적 에너지를 분석합니다.' },
  jeonaek:  { kr: '전액궁(田宅宮)', desc: '부동산·재산·주거 환경을 담당합니다. 집과 땅에 얽힌 복을 나타내며, 부동산 투자 시기를 파악하는 데 활용됩니다.' },
  noebok:   { kr: '노복궁(奴僕宮)', desc: '부하·직원·아랫사람과의 관계, 서비스업 운을 나타냅니다. 인덕(人德)과 대인 관계 폭을 분석합니다.' },
  chunyi:   { kr: '천이궁(遷移宮)', desc: '이사·해외·여행·외부 환경 변화를 담당합니다. 외출 시 만나는 운과 해외 진출 가능성을 분석합니다.' },
  jilaek:   { kr: '질액궁(疾厄宮)', desc: '건강·질병·신체 컨디션과 사고 위험을 나타냅니다. 만성 질환 경향과 건강 관리 포인트를 파악합니다.' },
  jaeback:  { kr: '재백궁(財帛宮)', desc: '재물·수입·소비 패턴을 담당하는 핵심 재물궁입니다. 투자·사업·직업소득의 흐름을 분석합니다.' },
  gwanllok: { kr: '관록궁(官祿宮)', desc: '직업·사업·명예·사회적 지위를 나타냅니다. 커리어 방향성과 승진 타이밍 분석의 기준이 됩니다.' },
  bokdeok:  { kr: '복덕궁(福德宮)', desc: '정신적 행복·오락·취미·영적 성장을 담당합니다. 삶의 만족도와 행복 에너지의 원천을 분석합니다.' },
  bumo:     { kr: '부모궁(父母宮)', desc: '부모와의 인연·문서운·학업·명예를 나타냅니다. 시험·자격증·계약 등 문서와 관련된 운을 분석합니다.' },
};

// ─── 숙요 27수 데이터 ───
const SUKUYO_DATA = {};
const mansions = [
  ['각수(角宿)', '목(木)', '청룡의 뿔. 시작과 돌파의 에너지. 새로운 일을 시작하기 좋고 협상·계약에 유리한 날입니다.'],
  ['항수(亢宿)', '금(金)', '청룡의 목. 단단함과 재물의 기운. 저축·투자 계획을 세우기 좋고 인내심이 필요한 날입니다.'],
  ['저수(氐宿)', '토(土)', '청룡의 뿌리. 안정과 기반의 에너지. 부동산·계약·서류 작업에 유리한 날입니다.'],
  ['방수(房宿)', '일(日)', '청룡의 몸통. 따뜻한 태양 에너지. 모임·회의·인맥 확장에 좋은 날입니다.'],
  ['심수(心宿)', '월(月)', '청룡의 심장. 직관과 공감의 에너지. 감성적 표현, 예술 활동에 유리한 날입니다.'],
  ['미수(尾宿)', '화(火)', '청룡의 꼬리. 열정과 확장의 에너지. 새로운 프로젝트 시작, 발표에 좋은 날입니다.'],
  ['기수(箕宿)', '수(水)', '청룡의 끝. 유연함과 정보의 에너지. 공부·연구·문서 작업에 유리한 날입니다.'],
  ['두수(斗宿)', '게(蟹)', '현무의 말. 변화와 전환의 에너지. 방향 전환, 여행, 이동에 좋은 날입니다.'],
  ['우수(牛宿)', '소(牛)', '현무의 소. 근면과 성실의 에너지. 꾸준한 작업, 노력이 빛나는 날입니다.'],
  ['여수(女宿)', '박(蝠)', '현무의 여성. 섬세함과 배려의 에너지. 인간관계, 협동, 조화에 좋은 날입니다.'],
  ['허수(虛宿)', '서(鼠)', '현무의 허공. 반성과 내면 탐구의 에너지. 명상·정리·자기 성찰에 유리한 날입니다.'],
  ['위수(危宿)', '제비(燕)', '현무의 위험. 주의가 필요한 날. 중요한 결정은 신중히, 안전에 특히 유의합니다.'],
  ['실수(室宿)', '돼지(豕)', '현무의 집. 인연과 가정의 에너지. 집·가족·새 거주지 관련 일에 좋은 날입니다.'],
  ['벽수(壁宿)', '유(兪)', '현무의 벽. 경계와 보호의 에너지. 방어·보안·준비에 좋은 날입니다.'],
  ['규수(奎宿)', '이리(狼)', '백호의 발. 법률·학문·문서의 에너지. 계약·시험·자격증에 유리한 날입니다.'],
  ['루수(婁宿)', '개(狗)', '백호의 성. 우정과 협력의 에너지. 팀 작업, 동업, 모임에 유리한 날입니다.'],
  ['위수2(胃宿)', '꿩(雉)', '백호의 위. 축적과 저장의 에너지. 음식·저축·비축에 좋은 날입니다.'],
  ['묘수(昴宿)', '닭(鷄)', '백호의 눈. 명확함과 판단의 에너지. 문제 해결, 명확한 의사결정에 좋은 날입니다.'],
  ['필수(畢宿)', '오(烏)', '백호의 그물. 포획과 집중의 에너지. 목표 달성, 집중 작업에 유리한 날입니다.'],
  ['자수(觜宿)', '원숭이(猴)', '백호의 부리. 영리함과 재치의 에너지. 협상·언변·교육에 좋은 날입니다.'],
  ['삼수(參宿)', '원(猿)', '백호의 몸통. 도전과 돌파의 에너지. 경쟁·스포츠·승부에 유리한 날입니다.'],
  ['정수(井宿)', '부엉이(梟)', '주작의 우물. 지식과 깊이의 에너지. 연구·분석·심층 작업에 좋은 날입니다.'],
  ['귀수(鬼宿)', '양(羊)', '주작의 귀신. 정화와 직관의 에너지. 오래된 것을 정리하고 새로운 시작을 준비하기 좋습니다.'],
  ['유수(柳宿)', '노루(獐)', '주작의 버드나무. 유연함과 성장의 에너지. 창의·예술·감성 표현에 좋은 날입니다.'],
  ['성수(星宿)', '말(馬)', '주작의 별. 명예와 빛의 에너지. 발표·인정·공개 활동에 유리한 날입니다.'],
  ['장수(張宿)', '사슴(鹿)', '주작의 날개. 확장과 관계의 에너지. 네트워킹·비즈니스 확대에 좋은 날입니다.'],
  ['익수(翼宿)', '뱀(蛇)', '주작의 날개. 재생과 변환의 에너지. 새로운 방향 전환, 자기 혁신에 좋은 날입니다.'],
];
mansions.forEach(([name, el, desc], i) => {
  SUKUYO_DATA[String(i + 1)] = { kr: name, element: el, desc };
});

const PERIOD_META = {
  today: { kr: '오늘의', desc: '오늘 하루 기운을 분석합니다.' },
  tomorrow: { kr: '내일의', desc: '내일의 기운을 미리 분석합니다.' },
  weekly: { kr: '이번 주', desc: '이번 주 7일 흐름을 분석합니다.' },
  monthly: { kr: '이번 달', desc: '이번 달 대세 흐름을 분석합니다.' },
};

function buildVedicSection(id, period, data) {
  const meta = PERIOD_META[period];
  return `<section class="fe-static-content" style="margin:0 0 18px;padding:16px;background:rgba(255,255,255,.04);border:1px solid rgba(167,139,250,.18);border-radius:14px;">
  <h2 style="font-size:1.1rem;font-weight:800;color:#e9d5ff;margin-bottom:10px;">🌟 ${meta.kr} 베다 점성 ${data.kr} 운세</h2>
  <p style="color:rgba(203,195,227,.75);font-size:.82rem;line-height:1.7;margin-bottom:10px;">${meta.desc} 베다 점성학(Jyotish)의 12 라시 체계로 분석합니다.</p>
  <p><strong>라시(Rashi):</strong> ${data.en}</p>
  <p><strong>지배 행성:</strong> ${data.planet}</p>
  <p><strong>원소:</strong> ${data.element}</p>
  <p><strong>핵심 기질:</strong> ${data.traits}</p>
  <p style="margin-top:8px;font-size:.82rem;color:rgba(203,195,227,.65);">${data.desc}</p>
  <div style="margin-top:12px;border-top:1px solid rgba(167,139,250,.12);padding-top:10px;font-size:.8rem;color:rgba(203,195,227,.55);">
    베다 점성학(Jyotish)은 인도 고대 천문·점성학 체계로, 항성(사이드리얼) 황도를 기준으로 행성 위치를 계산합니다. 서양 점성학의 태양 별자리보다 약 23도 앞선 위치에서 계산하므로 태양 별자리와 다를 수 있습니다.
  </div>
</section>`;
}

function buildZiweiSection(id, period, data) {
  const meta = PERIOD_META[period];
  return `<section class="fe-static-content" style="margin:0 0 18px;padding:16px;background:rgba(255,255,255,.04);border:1px solid rgba(167,139,250,.18);border-radius:14px;">
  <h2 style="font-size:1.1rem;font-weight:800;color:#e9d5ff;margin-bottom:10px;">⭐ ${meta.kr} 자미두수 ${data.kr} 운세</h2>
  <p style="color:rgba(203,195,227,.75);font-size:.82rem;line-height:1.7;margin-bottom:10px;">${meta.desc} 자미두수(紫微斗數) 12궁 체계로 분석합니다.</p>
  <p style="font-size:.82rem;color:rgba(203,195,227,.75);">${data.desc}</p>
  <div style="margin-top:12px;border-top:1px solid rgba(167,139,250,.12);padding-top:10px;font-size:.8rem;color:rgba(203,195,227,.55);">
    자미두수는 중국 송(宋)대에 정립된 천문 명리학으로, 생년월일시를 기반으로 12궁과 수십여 개의 성(星)을 배치해 운명을 분석합니다. 한국·대만·홍콩에서 사주팔자와 함께 주요 운세 분석 도구로 활용됩니다.
  </div>
</section>`;
}

function buildSukuyoSection(id, period, data) {
  const meta = PERIOD_META[period];
  return `<section class="fe-static-content" style="margin:0 0 18px;padding:16px;background:rgba(255,255,255,.04);border:1px solid rgba(167,139,250,.18);border-radius:14px;">
  <h2 style="font-size:1.1rem;font-weight:800;color:#e9d5ff;margin-bottom:10px;">🌙 ${meta.kr} 숙요(宿曜) ${id}번 — ${data.kr} 운세</h2>
  <p style="color:rgba(203,195,227,.75);font-size:.82rem;line-height:1.7;margin-bottom:10px;">${meta.desc} 불교 점성학 숙요(宿曜) 27수 체계로 분석합니다.</p>
  <p><strong>오행 속성:</strong> ${data.element}</p>
  <p style="font-size:.82rem;color:rgba(203,195,227,.75);margin-top:6px;">${data.desc}</p>
  <div style="margin-top:12px;border-top:1px solid rgba(167,139,250,.12);padding-top:10px;font-size:.8rem;color:rgba(203,195,227,.55);">
    숙요(宿曜)는 인도 점성학 나크샤트라(27 Nakshatra)가 중국·일본·한국을 거쳐 정착된 불교 점성술입니다. 달이 하루에 하나의 수(宿)를 지나는 흐름으로 일운(日運)을 분석합니다. 길한 수에는 적극적인 행동을, 흉한 수에는 신중함을 권합니다.
  </div>
</section>`;
}

function processFile(filePath, sectionHtml) {
  let html = readFileSync(filePath, 'utf8');
  if (html.includes('fe-static-content')) return false;
  html = html.replace(
    '<div id="fortuneApp">',
    sectionHtml + '\n  <div id="fortuneApp">'
  );
  writeFileSync(filePath, html, 'utf8');
  return true;
}

let updated = 0;

for (const [period] of Object.entries(PERIOD_META)) {
  // Vedic
  for (const [id, data] of Object.entries(VEDIC_DATA)) {
    const file = join(FORTUNE_BASE, period, 'vedic', `${id}.html`);
    try {
      if (processFile(file, buildVedicSection(id, period, data))) {
        console.log(`✅ [vedic/${period}] ${id}`); updated++;
      }
    } catch(e) { console.warn(`⚠️ ${file}: ${e.message}`); }
  }
  // Ziwei
  for (const [id, data] of Object.entries(ZIWEI_DATA)) {
    const file = join(FORTUNE_BASE, period, 'ziwei', `${id}.html`);
    try {
      if (processFile(file, buildZiweiSection(id, period, data))) {
        console.log(`✅ [ziwei/${period}] ${id}`); updated++;
      }
    } catch(e) { console.warn(`⚠️ ${file}: ${e.message}`); }
  }
  // Sukuyo
  for (const [id, data] of Object.entries(SUKUYO_DATA)) {
    const file = join(FORTUNE_BASE, period, 'sukuyo', `${id}.html`);
    try {
      if (processFile(file, buildSukuyoSection(id, period, data))) {
        console.log(`✅ [sukuyo/${period}] ${id}`); updated++;
      }
    } catch(e) { console.warn(`⚠️ ${file}: ${e.message}`); }
  }
}

console.log(`\n🎉 총 ${updated}개 special fortune 페이지 정적 콘텐츠 주입 완료`);
