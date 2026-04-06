/**
 * 운세 인사이트 허브 + 유명인 아카이브 → 접이식 배너 카드 UI로 교체
 * · 배너(이미지+오버레이)는 항상 노출
 * · 클릭 시 내부 기능 영역 펼침/접힘 (max-height 트랜지션)
 * · index.html, public/index.html 동시 반영
 */
import { readFileSync, writeFileSync } from 'fs';

const START = '    <!-- ═══ 운세 인사이트 허브 ═══ -->';
const END   = '    <!-- ═══ 운세 인사이트 허브 끝 ═══ -->';

const NEW_SECTION = `    <!-- ═══ 운세 인사이트 허브 ═══ -->
    <!-- 접이식 배너 카드: 인사이트 허브 + 유명인 아카이브 -->
    <style>
.cd-banner-btn{cursor:pointer;-webkit-tap-highlight-color:transparent;display:block;width:100%;outline:none;user-select:none;-webkit-user-select:none;}
.cd-banner-btn:focus-visible{outline:2px solid rgba(167,139,250,0.8);outline-offset:2px;border-radius:20px;}
.cd-section-body{max-height:0;overflow:hidden;transition:max-height 0.44s cubic-bezier(0.4,0,0.2,1);}
.cd-section-body.is-open{max-height:5000px;}
.cd-chevron{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:rgba(0,0,0,0.44);border:1px solid rgba(255,255,255,0.18);color:rgba(255,255,255,0.9);font-size:0.85rem;transition:transform 0.32s ease;flex-shrink:0;}
.cd-banner-btn[aria-expanded="true"] .cd-chevron{transform:rotate(180deg);}
.cd-tap-badge{position:absolute;top:12px;right:12px;padding:4px 11px;border-radius:999px;background:rgba(0,0,0,0.52);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.14);color:rgba(255,255,255,0.82);font-size:0.66rem;font-weight:600;letter-spacing:0.06em;pointer-events:none;}
.cd-banner-btn[aria-expanded="true"] .cd-tap-badge{display:none;}
.cd-insight-tile{display:flex;align-items:center;gap:9px;text-decoration:none;padding:10px 13px;border-radius:13px;}
.cd-insight-tile:active{opacity:0.8;}
    </style>
    <div style="margin:30px auto 12px;max-width:860px;display:flex;flex-direction:column;gap:14px;padding:0 12px;">

      <!-- ━━━ 카드①: 운세 인사이트 허브 ━━━ -->
      <div style="border-radius:20px;overflow:hidden;border:1px solid rgba(212,175,55,0.34);background:linear-gradient(145deg,rgba(10,13,46,0.98),rgba(15,10,35,0.98));box-shadow:0 14px 44px rgba(0,0,0,0.42),0 0 28px rgba(201,168,76,0.11);"
        itemscope itemtype="https://schema.org/WebPage">
        <!-- 배너 (항상 보임 — 클릭으로 내용 열기) -->
        <div class="cd-banner-btn" role="button" tabindex="0"
          id="cd-insights-toggle"
          aria-expanded="false"
          aria-controls="cd-insights-body"
          aria-label="운세 인사이트 허브 열기"
          onclick="(function(b){var d=document.getElementById('cd-insights-body');var o=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!o));d.classList.toggle('is-open',!o);b.setAttribute('aria-label',o?'운세 인사이트 허브 열기':'운세 인사이트 허브 닫기');})(this)"
          onkeydown="if(event.key==='Enter'||event.key===' '){this.click();event.preventDefault();}">
          <div style="position:relative;height:200px;overflow:hidden;">
            <img src="/fuctionassets/info.webp"
              alt="운세 인사이트 허브 — 동서양 운명학 아카이브"
              loading="lazy" decoding="async"
              style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 30%;">
            <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,13,46,0.08) 0%,rgba(10,13,46,0.48) 52%,rgba(10,13,46,0.96) 100%);"></div>
            <div class="cd-tap-badge">탭하여 열기</div>
            <div style="position:absolute;bottom:0;left:0;right:0;padding:12px 16px 14px;display:flex;align-items:flex-end;justify-content:space-between;" itemprop="description">
              <div>
                <h2 style="margin:0 0 4px;font-size:1.06rem;font-weight:900;color:#fef3c7;letter-spacing:0.02em;text-shadow:0 2px 12px rgba(0,0,0,0.9);">🔮 우주 신비 도서관</h2>
                <p style="margin:0;font-size:0.74rem;color:rgba(220,210,255,0.88);text-shadow:0 1px 6px rgba(0,0,0,0.8);">사주·타로·숙요점·베다점·점성술·자미두수 핵심 원리 아카이브</p>
              </div>
              <span class="cd-chevron" aria-hidden="true">▾</span>
            </div>
          </div>
        </div>
        <!-- 접이식 본문: 토픽 타일 -->
        <div class="cd-section-body" id="cd-insights-body" role="region" aria-labelledby="cd-insights-toggle">
          <div style="padding:6px 14px 16px;">
            <p style="margin:0 0 11px;font-size:0.8rem;line-height:1.65;color:rgba(210,200,240,0.82);" itemprop="description">동서양 운명학의 구조와 패턴을 이해하는 고밀도 아카이브입니다. 주제를 선택해 깊이 탐구하세요.</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <a href="/insights?topic=saju" class="cd-insight-tile" style="border:1px solid rgba(255,107,157,0.32);background:rgba(255,107,157,0.12);color:#ffd1e1;">
                <span style="font-size:1.15rem;line-height:1;flex-shrink:0;">🌸</span>
                <div><div style="font-size:0.8rem;font-weight:800;">사주명리학</div><div style="font-size:0.65rem;color:rgba(255,180,200,0.65);margin-top:1px;">사주팔자·60갑자</div></div>
              </a>
              <a href="/insights?topic=tarot" class="cd-insight-tile" style="border:1px solid rgba(155,93,229,0.34);background:rgba(155,93,229,0.14);color:#e9dcff;">
                <span style="font-size:1.15rem;line-height:1;flex-shrink:0;">📖</span>
                <div><div style="font-size:0.8rem;font-weight:800;">타로</div><div style="font-size:0.65rem;color:rgba(180,160,220,0.65);margin-top:1px;">대·소 아르카나</div></div>
              </a>
              <a href="/insights?topic=sukuyo" class="cd-insight-tile" style="border:1px solid rgba(78,205,196,0.34);background:rgba(78,205,196,0.12);color:#d7fff8;">
                <span style="font-size:1.15rem;line-height:1;flex-shrink:0;">🌙</span>
                <div><div style="font-size:0.8rem;font-weight:800;">숙요점</div><div style="font-size:0.65rem;color:rgba(100,220,210,0.65);margin-top:1px;">달·27수 별자리</div></div>
              </a>
              <a href="/insights?topic=vedic" class="cd-insight-tile" style="border:1px solid rgba(240,208,128,0.34);background:rgba(240,208,128,0.12);color:#fff3c6;">
                <span style="font-size:1.15rem;line-height:1;flex-shrink:0;">🔥</span>
                <div><div style="font-size:0.8rem;font-weight:800;">베다점성술</div><div style="font-size:0.65rem;color:rgba(220,190,90,0.65);margin-top:1px;">나바그라하·라시</div></div>
              </a>
              <a href="/insights?topic=astrology" class="cd-insight-tile" style="border:1px solid rgba(102,217,255,0.34);background:rgba(102,217,255,0.12);color:#daf5ff;">
                <span style="font-size:1.15rem;line-height:1;flex-shrink:0;">⭐</span>
                <div><div style="font-size:0.8rem;font-weight:800;">서양 점성술</div><div style="font-size:0.65rem;color:rgba(80,190,220,0.65);margin-top:1px;">12궁·행성·어스펙트</div></div>
              </a>
              <a href="/insights?topic=ziwei" class="cd-insight-tile" style="border:1px solid rgba(183,148,244,0.34);background:rgba(183,148,244,0.12);color:#efe4ff;">
                <span style="font-size:1.15rem;line-height:1;flex-shrink:0;">✨</span>
                <div><div style="font-size:0.8rem;font-weight:800;">자미두수</div><div style="font-size:0.65rem;color:rgba(160,120,220,0.65);margin-top:1px;">명궁·12궁위</div></div>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- ━━━ 카드②: 유명인 사주 분석 아카이브 ━━━ -->
      <div style="border-radius:20px;overflow:hidden;border:1px solid rgba(183,148,244,0.32);background:linear-gradient(145deg,rgba(10,13,46,0.98),rgba(20,8,50,0.98));box-shadow:0 14px 44px rgba(0,0,0,0.44),0 0 28px rgba(124,58,237,0.10);"
        itemscope itemtype="https://schema.org/Collection">
        <!-- 배너 (항상 보임 — 클릭으로 내용 열기) -->
        <div class="cd-banner-btn" role="button" tabindex="0"
          id="cd-famous-toggle"
          aria-expanded="false"
          aria-controls="cd-famous-body"
          aria-label="유명인 사주 분석 아카이브 열기"
          onclick="(function(b){var d=document.getElementById('cd-famous-body');var o=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!o));d.classList.toggle('is-open',!o);b.setAttribute('aria-label',o?'유명인 사주 분석 아카이브 열기':'유명인 사주 분석 아카이브 닫기');})(this)"
          onkeydown="if(event.key==='Enter'||event.key===' '){this.click();event.preventDefault();}">
          <div style="position:relative;height:180px;overflow:hidden;">
            <img src="/fuctionassets/famous.webp"
              alt="유명인 사주 분석 아카이브 대표 이미지"
              loading="lazy" decoding="async"
              style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 25%;">
            <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,13,46,0.06) 0%,rgba(10,13,46,0.50) 50%,rgba(10,13,46,0.96) 100%);"></div>
            <div class="cd-tap-badge" style="border-color:rgba(183,148,244,0.25);color:rgba(220,200,255,0.82);">탭하여 열기</div>
            <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 16px 13px;display:flex;align-items:flex-end;justify-content:space-between;">
              <div>
                <h3 itemprop="name" style="margin:0 0 3px;font-size:1.02rem;font-weight:900;color:#f3e8ff;text-shadow:0 2px 10px rgba(0,0,0,0.9);">⭐ 유명인 사주 분석 아카이브</h3>
                <p itemprop="description" style="margin:0;font-size:0.73rem;color:rgba(210,200,240,0.88);text-shadow:0 1px 6px rgba(0,0,0,0.8);">역사 위인·K-스타·세계 유명인 50인+의 사주팔자 명리 심층 분석</p>
              </div>
              <span class="cd-chevron" aria-hidden="true">▾</span>
            </div>
          </div>
        </div>
        <!-- 접이식 본문: 검색·필터·그리드 -->
        <div class="cd-section-body" id="cd-famous-body" role="region" aria-labelledby="cd-famous-toggle">
          <!-- 검색 입력 -->
          <div style="padding:12px 16px 8px;">
            <div style="position:relative;">
              <input id="fsp-search" type="search" placeholder="이름으로 검색… (예: 이순신, 테일러)" aria-label="유명인 검색"
                style="width:100%;box-sizing:border-box;padding:8px 14px 8px 36px;border-radius:10px;border:1px solid rgba(167,139,250,0.3);background:rgba(0,0,0,0.3);color:#f3e8ff;font-size:0.82rem;outline:none;">
              <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:0.9rem;pointer-events:none;opacity:0.5;">🔍</span>
            </div>
            <div id="fsp-search-empty" style="display:none;padding:6px 2px 0;font-size:0.79rem;color:rgba(203,195,227,0.45);">검색 결과가 없습니다</div>
          </div>
          <!-- 카테고리 필터 바 -->
          <div id="fsp-filter-bar" role="group" aria-label="카테고리 필터"
            style="display:flex;gap:6px;padding:0 16px 12px;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;">
            <button class="fsp-filter-btn fsp-filter--active" data-cat="all" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(167,139,250,0.6);background:rgba(124,58,237,0.35);color:#e9d5ff;cursor:pointer;white-space:nowrap;transition:all .18s;">전체</button>
            <button class="fsp-filter-btn" data-cat="kr-historic" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">역사 위인</button>
            <button class="fsp-filter-btn" data-cat="kr-modern" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">K-스타</button>
            <button class="fsp-filter-btn" data-cat="jp" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">🇯🇵 일본</button>
            <button class="fsp-filter-btn" data-cat="cn" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">🇨🇳 중국</button>
            <button class="fsp-filter-btn" data-cat="us" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">🇺🇸 미국</button>
            <button class="fsp-filter-btn" data-cat="music" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">음악</button>
            <button class="fsp-filter-btn" data-cat="acting" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">연기</button>
            <button class="fsp-filter-btn" data-cat="sports" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">스포츠</button>
            <button class="fsp-filter-btn" data-cat="business" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">기업인</button>
            <button class="fsp-filter-btn" data-cat="director" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">감독·창작</button>
            <button class="fsp-filter-btn" data-cat="politics" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">🏛️ 정치인</button>
          </div>
          <!-- 인물 카드 그리드 (JS 동적 렌더링) -->
          <div id="fsp-grid" role="list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;padding:0 16px 10px;">
            <noscript>
              <p>이순신·세종대왕·유관순·안중근·김구·정약용·BTS RM·IU(이지은)·손흥민·뉴진스 하니·류현진·봉준호·유해진·박찬호·김연아·박세리·박정희·김대중·한강·미야자키 하야오·나루히토·오타니 쇼헤이·기타노 다케시·무라카미 하루키·도요토미 히데요시·쿠로사와 아키라·아무로 나미에·이소룡·성룡·마윈·공자·장이머우·마오쩌둥·테일러 스위프트·엘론 머스크·마이클 잭슨·스티브 잡스·마틴 루터 킹·엘비스 프레슬리·빌 게이츠·버락 오바마·스티브 워즈니악·마돈나·마틴 스코세이지·레오나르도 다 빈치·알베르트 아인슈타인·윌리엄 셰익스피어·나폴레옹 등 국내외 유명인 50인+ 사주팔자 명리학 심층 분석</p>
            </noscript>
          </div><!-- /#fsp-grid -->
          <!-- 상세 분석 패널 (카드 클릭 시) -->
          <div id="fsp-detail" style="display:none;margin:0 16px 14px;border-radius:16px;border:1px solid rgba(167,139,250,0.28);background:rgba(0,0,0,0.25);overflow:hidden;">
            <div id="fsp-detail-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(183,148,244,0.15);">
              <span id="fsp-detail-title" style="font-size:0.9rem;font-weight:800;color:#e9d5ff;">인물 상세 분석</span>
              <button id="fsp-detail-close" aria-label="닫기" style="background:none;border:none;color:rgba(203,195,227,0.6);font-size:1.1rem;cursor:pointer;padding:2px 6px;border-radius:6px;line-height:1;">✕</button>
            </div>
            <div id="famousSajuContent" style="padding:16px;"><!-- JS 동적 렌더링 --></div>
          </div>
          <!-- 학술 면책 고지 -->
          <div style="margin:0 16px 16px;padding:8px 12px;border-radius:10px;background:rgba(251,191,36,0.05);border:1px solid rgba(251,191,36,0.18);">
            <p style="margin:0;font-size:0.7rem;line-height:1.65;color:rgba(253,230,138,0.75);text-align:center;">⚠️ <strong style="color:#fbbf24;">학술·교육 목적</strong> — 동양 명리학 이론 소개·교육을 위한 학술적 콘텐츠입니다. 실제 인물에 대한 가치 판단·예측이 아니며, 출생 시간 불명 인물은 정오(12시) 기준 3기둥(년주·월주·일주) 분석입니다.</p>
          </div>
        </div>
      </div>

    </div>
    <!-- ═══ 운세 인사이트 허브 끝 ═══ -->`;

function patch(filePath) {
  let html = readFileSync(filePath, 'utf-8');

  const s = html.indexOf(START);
  let e = html.indexOf(END);
  if (s === -1 || e === -1) {
    console.error(`❌ 마커 미발견: ${filePath}`);
    return false;
  }
  e += END.length;

  html = html.slice(0, s) + NEW_SECTION + html.slice(e);
  writeFileSync(filePath, html, 'utf-8');
  console.log(`✅ 패치 완료: ${filePath}  (${html.length}자)`);
  return true;
}

const baseDir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'); // Windows path fix
patch('index.html');
patch('public/index.html');
