/**
 * 인생의 책 로딩 화면 HTML을 모든 locale index.html에 일괄 패치
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

const OLD_BLOCK = `        <div id="lbLoadingScreen" class="lb-loading-screen" style="display:none;">
          <div class="lb-loading-orb" aria-hidden="true">
            <div class="lb-orb-ring lb-orb-ring--1"></div>
            <div class="lb-orb-ring lb-orb-ring--2"></div>
            <div class="lb-orb-ring lb-orb-ring--3"></div>
            <div class="lb-orb-core">📜</div>
          </div>
          <p class="lb-loading-title">인생의 책을 집필하는 중입니다</p>
          <p id="lbLoadingChapter" class="lb-loading-chapter">사주 원국을 분석하는 중...</p>
          <div class="lb-loading-progress">
            <div id="lbProgressBar" class="lb-progress-bar"></div>
          </div>
          <p id="lbProgressText" class="lb-progress-text">0 / 10 챕터 완성</p>
        </div>`;

const NEW_BLOCK = `        <!-- 생성 중: 로딩 화면 -->
        <div id="lbLoadingScreen" class="lb-loading-screen" style="display:none;">
          <!-- 별 파티클 배경 -->
          <div class="lb-stars" aria-hidden="true">
            <span class="lb-star lb-star--1">✦</span>
            <span class="lb-star lb-star--2">✧</span>
            <span class="lb-star lb-star--3">✦</span>
            <span class="lb-star lb-star--4">✧</span>
            <span class="lb-star lb-star--5">✦</span>
            <span class="lb-star lb-star--6">✧</span>
            <span class="lb-star lb-star--7">✦</span>
            <span class="lb-star lb-star--8">✩</span>
          </div>

          <!-- 빛나는 오브 -->
          <div class="lb-loading-orb" aria-hidden="true">
            <div class="lb-orb-ring lb-orb-ring--1"></div>
            <div class="lb-orb-ring lb-orb-ring--2"></div>
            <div class="lb-orb-ring lb-orb-ring--3"></div>
            <div class="lb-orb-core">📜</div>
          </div>

          <!-- 메인 타이틀 -->
          <p class="lb-loading-title">운명의 기록을 집필하는 중입니다</p>

          <!-- 현재 챕터 번호 + 분석 메시지 -->
          <div class="lb-loading-chapter-box">
            <span class="lb-loading-chapter-num" id="lbLoadingChapterNum">Chapter 1</span>
            <p id="lbLoadingChapter" class="lb-loading-chapter">사주 원국을 분석하는 중...</p>
          </div>

          <!-- 신비로운 운명 멘트 (주기적 교체) -->
          <div class="lb-mystic-wrap">
            <span class="lb-mystic-deco" aria-hidden="true">✦</span>
            <p class="lb-mystic-quote" id="lbMysticQuote">팔자(八字)의 비밀을 해독합니다...</p>
            <span class="lb-mystic-deco" aria-hidden="true">✦</span>
          </div>

          <!-- 챕터 완성 진행 아이콘 그리드 -->
          <div class="lb-ch-grid" id="lbChapterIcons" aria-hidden="true">
            <span class="lb-ch-dot lb-ch-dot--active" data-lbch="1">Ⅰ</span>
            <span class="lb-ch-dot" data-lbch="2">Ⅱ</span>
            <span class="lb-ch-dot" data-lbch="3">Ⅲ</span>
            <span class="lb-ch-dot" data-lbch="4">Ⅳ</span>
            <span class="lb-ch-dot" data-lbch="5">Ⅴ</span>
            <span class="lb-ch-dot" data-lbch="6">Ⅵ</span>
            <span class="lb-ch-dot" data-lbch="7">Ⅶ</span>
            <span class="lb-ch-dot" data-lbch="8">Ⅷ</span>
            <span class="lb-ch-dot" data-lbch="9">Ⅸ</span>
            <span class="lb-ch-dot" data-lbch="10">Ⅹ</span>
            <span class="lb-ch-dot" data-lbch="11">XI</span>
            <span class="lb-ch-dot" data-lbch="12">XII</span>
            <span class="lb-ch-dot" data-lbch="13">XIII</span>
          </div>

          <!-- 프로그레스 바 -->
          <div class="lb-loading-progress">
            <div id="lbProgressBar" class="lb-progress-bar"></div>
          </div>
          <p id="lbProgressText" class="lb-progress-text">0 / 13 챕터 완성</p>
        </div>`;

const targets = [
  'public/index.html',
  'public/static/index.html',
  'public/zh-cn/index.html',
  'public/nl-nl/index.html',
  'public/ms-my/index.html',
  'public/ja-jp/index.html',
  'public/hi-in/index.html',
  'public/fr-fr/index.html',
  'public/es-es/index.html',
  'public/de-de/index.html',
  'public/en-us/index.html',
];

let patched = 0, skipped = 0;
for (const rel of targets) {
  const fp = join(__dir, rel);
  try {
    const content = readFileSync(fp, 'utf8');
    if (!content.includes('lbLoadingScreen')) { skipped++; continue; }
    if (content.includes('lb-ch-grid')) { console.log('[SKIP already patched]', rel); skipped++; continue; }
    const updated = content.replace(OLD_BLOCK, NEW_BLOCK);
    if (updated === content) {
      console.log('[WARN no match]', rel);
      skipped++;
    } else {
      writeFileSync(fp, updated, 'utf8');
      console.log('[OK]', rel);
      patched++;
    }
  } catch (e) {
    console.log('[ERR]', rel, e.message);
  }
}
console.log(`\n완료: ${patched}개 패치, ${skipped}개 스킵`);
