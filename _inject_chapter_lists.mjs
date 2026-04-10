/**
 * 4개 프리미엄 모달 시작 화면에 챕터 목록 HTML 삽입
 * 처리 대상: root/index.html + public/locale/index.html 11개
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 챕터 목록 HTML 블록 (4개 모달)
const CHAPTERS = {
  ziwei: `
          <div class="lb-start__chapters">
            <div class="lb-start__ch-label">📖 13챕터 구성</div>
            <ul class="lb-start__ch-list">
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.1</span><span>🌌 명궁 — 타고난 운명 캐릭터 완전 해독</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.2</span><span>🌟 신궁 — 내면의 본체와 잠재 무기</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.3</span><span>🌙 복덕궁 — 행복 DNA와 심상화 설계도</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.4</span><span>🌍 천이궁 — 퍼스널 브랜딩 전략</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.5</span><span>👑 관록궁 — 천직 방정식과 커리어 도약</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.6</span><span>💰 재백궁 — 재물 그릇과 부의 법칙</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.7</span><span>💑 부처궁 — 인연 구조와 로맨스</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.8</span><span>🤝 교우궁 — 귀인 지도와 네트워크</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.9</span><span>🏠 전택궁 — 공간 심리학과 자산</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.10</span><span>💪 질액궁 — 건강 바이오리듬 설계</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.11</span><span>🌊 대한 — 10년 메가트렌드 파노라마</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.12</span><span>📅 2026 유년 — 분기별 마이크로 전술</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.13</span><span>🌅 총결산 — 거장의 마스터플랜 봉서</span></li>
            </ul>
          </div>`,

  astro: `
          <div class="lb-start__chapters">
            <div class="lb-start__ch-label">📖 12챕터 구성</div>
            <ul class="lb-start__ch-list">
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.1</span><span>🌌 ASC·Sun·Moon — 페르소나와 존재의 핵</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.2</span><span>🌊 Moon & 4하우스 — 무의식의 안전가옥</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.3</span><span>🧠 Mercury — 인지 체계와 정보의 연금술</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.4</span><span>💎 Venus — 욕망의 미학과 가치 자산</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.5</span><span>⚡ Mars — 추진력의 방향과 에너지 관리</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.6</span><span>🌠 Jupiter — 행운의 좌표와 확장의 철학</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.7</span><span>🏛️ Saturn — 업보의 한계와 마스터의 길</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.8</span><span>🌀 외행성 — 세대적 변화와 개인의 혁신</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.9</span><span>🧭 Lunar Nodes — 영혼의 나침반</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.10</span><span>🔮 시냅스트리 — 관계의 심리적 투사</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.11</span><span>⭕ 컴포지트 — 우리라는 독립적 운명</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.12</span><span>✨ 별들의 마스터플랜 — 총결산 &amp; 개운법</span></li>
            </ul>
          </div>`,

  sukuyo: `
          <div class="lb-start__chapters">
            <div class="lb-start__ch-label">📖 13챕터 구성</div>
            <ul class="lb-start__ch-list">
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.1</span><span>🌑 영혼의 원형 — 숙요별이 새긴 운명 코드</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.2</span><span>🌊 감정의 조수간만 — 달의 정서 파동</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.3</span><span>🎭 페르소나와 브랜딩 — 기억되는 방식</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.4</span><span>💰 자산의 중력 — 달빛 부의 전략</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.5</span><span>⚙️ 보이지 않는 톱니바퀴 — 협력 역학</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.6</span><span>📡 관계의 정밀 레이더 — 6대 숙요 역학</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.7</span><span>💥 파괴적 혁신 — 위기를 기회로</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.8</span><span>🌿 조화로운 성장 — 공간과 환경의 법칙</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.9</span><span>❤️ 정서적 유대 — 깊은 연결과 감정 지능</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.10</span><span>🧭 운명적 거리 — 귀인과 에너지 밸런스</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.11</span><span>🌙 달의 주기 — 월령 에너지 사이클</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.12</span><span>⚗️ 관계 연금술 — 독소를 황금으로</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.13</span><span>🗺️ 영혼의 마스터플랜 — 10년 로드맵</span></li>
            </ul>
          </div>`,

  vedic: `
          <div class="lb-start__chapters">
            <div class="lb-start__ch-label">📖 12챕터 구성</div>
            <ul class="lb-start__ch-list">
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.1</span><span>🕉️ 라그나 — 영혼의 목적 &amp; Atmakaraka</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.2</span><span>🌙 나크샤트라 — 무의식의 27가지 빛</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.3</span><span>⏳ 다샤 — 인생의 웅장한 계절 전략</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.4</span><span>💰 부와 번영 — Artha &amp; 다나 요가</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.5</span><span>👑 카르마 천직 — 10하우스 · D10 차트</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.6</span><span>💎 나밤샤 — 영혼의 성숙도 D9</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.7</span><span>🔮 아슈타 쿠타 — 8항목 궁합 분석</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.8</span><span>💞 인연의 깊이 — 7하우스 카르믹 계약</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.9</span><span>🌿 생명력 정화 — 아유르베다 건강 법칙</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.10</span><span>✨ 요가 — 차트의 천부적 재능 조합</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.11</span><span>🙏 우파야 — 카르마 정화 실천 비책</span></li>
              <li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.12</span><span>🌟 마스터플랜 — 북극성 인생 선언문</span></li>
            </ul>
          </div>`
};

// 각 모달별 매칭 패턴과 주입 정보
const MODALS = [
  {
    key: 'ziwei',
    // zbStartBtn 이후의 note → 닫는 div 패턴
    // 챕터 div가 없는 경우만 교체
    oldPattern: /(<button class="lb-start__cta" id="zbStartBtn"[\s\S]*?<p class="lb-start__note">생성까지 약 5~10분 소요 · 완료 후 PDF 저장 가능<\/p>\s*)<\/div>(\s*\n\s*<!-- 로딩 화면)/,
    newTemplate: (m1, m2) => `${m1}${CHAPTERS.ziwei}\n        </div>${m2}`
  },
  {
    key: 'astro',
    oldPattern: /(<button class="lb-start__cta" id="abStartBtn"[\s\S]*?<p class="lb-start__note">생성까지 약 5~10분 소요 · 완료 후 PDF 저장 가능<\/p>\s*)<\/div>(\s*\n\s*<!-- 로딩 화면)/,
    newTemplate: (m1, m2) => `${m1}${CHAPTERS.astro}\n        </div>${m2}`
  },
  {
    key: 'sukuyo',
    oldPattern: /(<button class="lb-start__cta" id="skStartBtn"[\s\S]*?<p class="lb-start__note">생성까지 약 5~10분 소요 · 완료 후 PDF 저장 가능<\/p>\s*)<\/div>(\s*\n\s*<!-- 로딩 화면)/,
    newTemplate: (m1, m2) => `${m1}${CHAPTERS.sukuyo}\n        </div>${m2}`
  },
  {
    key: 'vedic',
    oldPattern: /(<button class="lb-start__cta" id="vdStartBtn"[\s\S]*?<p class="lb-start__note">생성까지 약 5~10분 소요 · 완료 후 PDF 저장 가능<\/p>\s*)<\/div>(\s*\n\s*<!-- 로딩 화면)/,
    newTemplate: (m1, m2) => `${m1}${CHAPTERS.vedic}\n        </div>${m2}`
  }
];

// 처리 대상 파일 목록
const targets = [
  'index.html',  // root
  'public/static/index.html',
  'public/en-us/index.html',
  'public/ja-jp/index.html',
  'public/hi-in/index.html',
  'public/es-es/index.html',
  'public/fr-fr/index.html',
  'public/de-de/index.html',
  'public/nl-nl/index.html',
  'public/ms-my/index.html',
  'public/zh-cn/index.html',
];

let totalChanges = 0;

for (const rel of targets) {
  const filePath = path.join(__dirname, rel);
  if (!fs.existsSync(filePath)) {
    console.warn(`[SKIP] File not found: ${rel}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let fileChanges = 0;

  for (const modal of MODALS) {
    // 이미 챕터 목록이 있으면 스킵
    const alreadyHasChapters = content.includes(`id="${modal.key === 'ziwei' ? 'zb' : modal.key === 'astro' ? 'ab' : modal.key === 'sukuyo' ? 'sk' : 'vd'}StartBtn"`) &&
      content.includes('lb-start__chapters') &&
      // 해당 버튼 이후에 챕터가 있는지 확인
      (() => {
        const btnId = modal.key === 'ziwei' ? 'zbStartBtn' : modal.key === 'astro' ? 'abStartBtn' : modal.key === 'sukuyo' ? 'skStartBtn' : 'vdStartBtn';
        const btnPos = content.indexOf(`id="${btnId}"`);
        const chapPos = content.indexOf('lb-start__chapters', btnPos);
        const loadPos = content.indexOf('<!-- 로딩 화면', btnPos);
        return chapPos !== -1 && chapPos < loadPos;
      })();

    if (alreadyHasChapters) {
      console.log(`[SKIP] ${rel}: ${modal.key} already has chapters`);
      continue;
    }

    const newContent = content.replace(modal.oldPattern, modal.newTemplate);
    if (newContent !== content) {
      content = newContent;
      fileChanges++;
      console.log(`[OK]   ${rel}: inserted ${modal.key} chapters`);
    } else {
      console.warn(`[WARN] ${rel}: pattern not matched for ${modal.key}`);
    }
  }

  if (fileChanges > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalChanges += fileChanges;
  }
}

console.log(`\n✅ 완료: ${totalChanges}개 변경 적용`);
