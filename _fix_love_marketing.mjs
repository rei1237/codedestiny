import { readFileSync, writeFileSync } from 'fs';

const FILES = [
  'public/index.html',
  'index.html',
];

// 교체 규칙 목록: [파일 범위, oldText, newText]
const REPLACEMENTS = [
  // ── public/index.html: lovebible-tile desc ──
  {
    files: ['public/index.html'],
    // 실제 파일 내용과 정확히 일치 (span 포함 버전과 span 없는 버전 모두 시도)
    old: [
      `실제 명리학자가 설계한 11개 챕터 · 최소 22,000자 · A4 용지 <span class="js-a4-page-count" data-char-count="22000" data-font-source=".lovebible-tile__desc">12</span>장 이상 분량의 리포트 · 일주 연애 심리 + 궁합 분析 · PDF 다운로드`,
      // 이미 span 없이 교체된 경우
      `일주도화살관성 완 전 해독  연애 패턴 진단  이상형 프로파일링  밀당 전략  연애 타이밍  상대방 궁합 分析  11챕터  최소 22,000자  PDF 저장`,
      // PowerShell이 망쳐놓은 버전
      `일주도화살관성 완전 해독  연애 패턴 진단  이상형 프로파일링  밀당 전략  연애 타이밍  상대방 궁합 분析  11챕터  최소 22,000자  PDF 저장`,
    ],
    new: `일주·도화살·관성 완전 해독 → 연애 패턴 진단 · 이상형 프로파일링 · 밀당 전략 · 연애 타이밍 · 상대방 궁합 분析 · 11챕터 · 최소 22,000자 · PDF 저장`,
    wrapTag: `<p class="lovebible-tile__desc">`,
    closeTag: `</p>`,
  },

  // ── public/index.html: lovebible-tile CTA ──
  {
    files: ['public/index.html'],
    old: [`운명이 설계한 나의 사랑 전략서 열어보기 →`],
    new: `나의 연애 패턴 진단 + 전략서 지금 열기 →`,
  },

  // ── public/index.html: ls-modal subtitle ──
  {
    files: ['public/index.html'],
    old: [`사주 명리학자가 당신만을 위해 쓴 運命의 사랑 전략서`],
    new: `당신의 연애 DNA를 해독하는 11챕터 사주 기반 완전 전략서`,
  },

  // ── public/index.html: ls-marketing headline ──
  {
    files: ['public/index.html'],
    old: [`당신의 사주 속에 이미 <strong>사랑의 설계도</strong>가 새겨져 있습니다`],
    new: `당신이 연애에서 항상 같은 패턴을 반복하는 이유, 사주 <strong>8글자가 이미 알고 있습니다</strong>`,
  },

  // ── public/index.html: ls-marketing sub ──
  {
    files: ['public/index.html'],
    old: [`실제 명리학자가 설계한 연애 전략 시스템이 당신의 일주·관성·재성·도화살을<br>최소 22,000자의 완전한 사랑 비책으로 해독합니다.`],
    new: `반복되는 연애 실패, 잘못된 이상형 선택, 끊어지지 않는 집착 — 그 패턴을 일주·관성·도화살로 근본부터 해독합니다.<br>최소 22,000자 · 11챕터 완전 분析, 상대방 사주 궁합 추가(+100코인) 선택 가능.`,
  },

  // ── index.html (root): lovebible-tile subtitle ──
  {
    files: ['index.html'],
    old: [`運命이 설계한 사랑의 지도`],
    new: `왜 나는 항상 같은 패턴으로 실패할까 — 사주에 답이 있습니다`,
  },

  // ── index.html (root): lovebible-tile desc ──
  {
    files: ['index.html'],
    old: [
      `실제 명리학자가 설계한 11개 챕터 · 최소 22,000자 · A4 용지 <span class="js-a4-page-count" data-char-count="22000" data-font-source=".lovebible-tile__desc">12</span>장 이상 분량의 리포트 · 일주 연애 심리 + 궁합 분析 · PDF 다운로드`,
    ],
    new: `일주·도화살·관성 완전 해독 → 연애 패턴 진단 · 이상형 프로파일링 · 밀당 전략 · 연애 타이밍 · 상대방 궁합 분析 · 11챕터 · 최소 22,000자 · PDF 저장`,
    wrapTag: `<p class="lovebible-tile__desc">`,
    closeTag: `</p>`,
  },

  // ── index.html (root): lovebible-tile CTA ──
  {
    files: ['index.html'],
    old: [`운명이 설계한 나의 사랑 전략서 열어보기 →`],
    new: `나의 연애 패턴 진단 + 전략서 지금 열기 →`,
  },

  // ── index.html (root): ls-modal subtitle ──
  {
    files: ['index.html'],
    old: [`사주 명리학자가 당신만을 위해 쓴 運命의 사랑 전략서`],
    new: `당신의 연애 DNA를 해독하는 11챕터 사주 기반 완전 전략서`,
  },

  // ── index.html (root): ls-partner-toggle-badge ──
  {
    files: ['index.html'],
    old: [`<span class="ls-partner-toggle-badge">궁합 분析 추가</span>`],
    new: `<span class="ls-partner-toggle-badge">궁합 추가 · <b>+100코인</b></span>`,
  },
];

let totalReplaced = 0;

for (const rule of REPLACEMENTS) {
  for (const file of rule.files) {
    let content = readFileSync(file, 'utf8');
    let replaced = false;

    for (const oldText of rule.old) {
      const searchStr = rule.wrapTag ? `${rule.wrapTag}${oldText}${rule.closeTag}` : oldText;
      const replaceStr = rule.wrapTag ? `${rule.wrapTag}${rule.new}${rule.closeTag}` : rule.new;

      if (content.includes(searchStr)) {
        content = content.replace(searchStr, replaceStr);
        console.log(`✅ [${file}] 교체 성공: "${oldText.substring(0, 40)}..."`);
        replaced = true;
        totalReplaced++;
        break;
      }
    }

    if (!replaced) {
      // wrapTag 없이 plain 텍스트 시도
      for (const oldText of rule.old) {
        if (content.includes(oldText)) {
          content = content.replace(oldText, rule.new);
          console.log(`✅ [${file}] 교체 성공 (plain): "${oldText.substring(0, 40)}..."`);
          replaced = true;
          totalReplaced++;
          break;
        }
      }
    }

    if (!replaced) {
      console.warn(`⚠️  [${file}] 매칭 실패: "${rule.old[0].substring(0, 60)}..."`);
    } else {
      writeFileSync(file, content, 'utf8');
    }
  }
}

console.log(`\n완료: 총 ${totalReplaced}건 교체`);
