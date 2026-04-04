import { readFileSync, writeFileSync } from 'fs';

const FILES = [
  'c:\\Users\\Neo\\Desktop\\Code Destiny Main\\index.html',
  'c:\\Users\\Neo\\Desktop\\Code Destiny Main\\public\\index.html'
];

const HTML_START = '<!-- ═══ 유명인 사주 분석 패널 ═══ -->';
const HTML_END   = '<!-- ═══ 유명인 사주 분석 패널 끝 ═══ -->';
const SCRIPT_START = '<!-- ═══ 유명인 사주 분석 패널 스크립트 ═══ -->';
const SCRIPT_END   = '<!-- ═══ 유명인 사주 분석 패널 스크립트 끝 ═══ -->';

/* ═══════════════════════════════════════════════════════
   새 HTML 블록
   - famous.webp 180px 배너 (이미지 안에 패널 타이틀 배치)
   - 입력 섹션: "원하는 인물의 사주팔자 분석" (비교 X)
═══════════════════════════════════════════════════════ */
const NEW_HTML = `<!-- ═══ 유명인 사주 분석 패널 ═══ -->
    <!-- 메인 피처 카드 (다른 기능들과 동일한 컨테이너 방식) -->
    <div class="feature-card-wrapper" style="padding:0 12px;margin:20px auto 8px;max-width:860px;">
      <section id="famousSajuPanel" aria-label="유명인 사주 분석 아카이브"
        itemscope itemtype="https://schema.org/Collection"
        style="border-radius:22px;overflow:hidden;background:linear-gradient(145deg,rgba(10,13,46,0.98) 0%,rgba(20,8,50,0.98) 55%,rgba(10,13,46,0.98) 100%);border:1px solid rgba(183,148,244,0.32);box-shadow:0 8px 40px rgba(0,0,0,0.55),0 0 0 1px rgba(183,148,244,0.08) inset;">

        <!-- ① 배너 헤더: famous.webp 이미지 위에 패널 타이틀 배치 -->
        <div style="position:relative;height:180px;overflow:hidden;">
          <img src="/fuctionassets/famous.webp"
            alt="유명인 사주 분석 아카이브 대표 이미지"
            loading="lazy" decoding="async"
            style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 30%;">
          <!-- 이미지 위 그라데이션 오버레이 -->
          <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,13,46,0.22) 0%,rgba(10,13,46,0.6) 55%,rgba(10,13,46,0.92) 100%);"></div>
          <!-- 이미지 안에 표시되는 패널 타이틀 -->
          <div style="position:absolute;bottom:0;left:0;right:0;padding:14px 20px 16px;">
            <h2 itemprop="name" style="margin:0 0 5px;font-size:1.15rem;font-weight:800;color:#f3e8ff;letter-spacing:0.03em;text-shadow:0 2px 12px rgba(0,0,0,0.9);">⭐ 유명인 사주 분석 아카이브</h2>
            <p style="margin:0;font-size:0.79rem;color:rgba(220,210,240,0.95);line-height:1.45;text-shadow:0 1px 6px rgba(0,0,0,0.8);">역사 위인·K-스타·해외 스타 14인의 사주팔자를 명리학 사주 엔진으로 심층 분석합니다</p>
          </div>
        </div>

        <!-- ② 카테고리 필터 바 -->
        <div id="fsp-filter-bar" role="group" aria-label="카테고리 필터"
          style="display:flex;gap:6px;padding:12px 16px;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;border-bottom:1px solid rgba(183,148,244,0.12);background:rgba(0,0,0,0.18);">
          <button class="fsp-filter-btn fsp-filter--active" data-cat="all" style="flex-shrink:0;padding:5px 13px;font-size:0.76rem;font-weight:700;border-radius:999px;border:1px solid rgba(167,139,250,0.6);background:rgba(124,58,237,0.35);color:#e9d5ff;cursor:pointer;white-space:nowrap;transition:all .18s;">전체</button>
          <button class="fsp-filter-btn" data-cat="kr-historic" style="flex-shrink:0;padding:5px 13px;font-size:0.76rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">역사 위인</button>
          <button class="fsp-filter-btn" data-cat="kr-modern" style="flex-shrink:0;padding:5px 13px;font-size:0.76rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">K-스타</button>
          <button class="fsp-filter-btn" data-cat="foreign" style="flex-shrink:0;padding:5px 13px;font-size:0.76rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">해외 스타</button>
          <button class="fsp-filter-btn" data-cat="music" style="flex-shrink:0;padding:5px 13px;font-size:0.76rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">음악</button>
          <button class="fsp-filter-btn" data-cat="acting" style="flex-shrink:0;padding:5px 13px;font-size:0.76rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">연기</button>
          <button class="fsp-filter-btn" data-cat="sports" style="flex-shrink:0;padding:5px 13px;font-size:0.76rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">스포츠</button>
          <button class="fsp-filter-btn" data-cat="business" style="flex-shrink:0;padding:5px 13px;font-size:0.76rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">기업인</button>
        </div>

        <!-- ③ 인물 카드 그리드 (SEO 정적 HTML) -->
        <div id="fsp-grid" role="list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px;padding:14px 14px 8px;">

          <article class="fsp-card" role="listitem" data-idx="0" data-cats="kr-historic" tabindex="0"
            itemscope itemtype="https://schema.org/Person"
            aria-label="이순신 사주 분석"
            style="border-radius:14px;padding:14px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.18);cursor:pointer;transition:all .2s;text-align:center;">
            <div style="font-size:2rem;margin-bottom:6px;">⚓</div>
            <h3 itemprop="name" style="margin:0 0 3px;font-size:0.92rem;font-weight:800;color:#f3e8ff;">이순신</h3>
            <p itemprop="jobTitle" style="margin:0 0 6px;font-size:0.7rem;color:rgba(203,195,227,0.65);line-height:1.3;">조선 수군 통제사</p>
            <div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;">
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(110,231,183,0.15);border:1px solid rgba(110,231,183,0.3);color:#6ee7b7;">목(木)</span>
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#c4b5fd;">편관</span>
            </div>
            <p style="margin:6px 0 0;font-size:0.67rem;color:rgba(203,195,227,0.45);">1545~1598</p>
          </article>

          <article class="fsp-card" role="listitem" data-idx="1" data-cats="kr-historic" tabindex="0"
            itemscope itemtype="https://schema.org/Person"
            aria-label="세종대왕 사주 분석"
            style="border-radius:14px;padding:14px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.18);cursor:pointer;transition:all .2s;text-align:center;">
            <div style="font-size:2rem;margin-bottom:6px;">📜</div>
            <h3 itemprop="name" style="margin:0 0 3px;font-size:0.92rem;font-weight:800;color:#f3e8ff;">세종대왕</h3>
            <p itemprop="jobTitle" style="margin:0 0 6px;font-size:0.7rem;color:rgba(203,195,227,0.65);line-height:1.3;">조선 4대 국왕</p>
            <div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;">
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(249,115,22,0.15);border:1px solid rgba(249,115,22,0.3);color:#fb923c;">화(火)</span>
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#c4b5fd;">편재</span>
            </div>
            <p style="margin:6px 0 0;font-size:0.67rem;color:rgba(203,195,227,0.45);">1397~1450</p>
          </article>

          <article class="fsp-card" role="listitem" data-idx="2" data-cats="kr-historic" tabindex="0"
            itemscope itemtype="https://schema.org/Person"
            aria-label="유관순 사주 분석"
            style="border-radius:14px;padding:14px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.18);cursor:pointer;transition:all .2s;text-align:center;">
            <div style="font-size:2rem;margin-bottom:6px;">🕊️</div>
            <h3 itemprop="name" style="margin:0 0 3px;font-size:0.92rem;font-weight:800;color:#f3e8ff;">유관순</h3>
            <p itemprop="jobTitle" style="margin:0 0 6px;font-size:0.7rem;color:rgba(203,195,227,0.65);line-height:1.3;">독립운동가</p>
            <div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;">
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);color:#93c5fd;">수(水)</span>
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#c4b5fd;">정관</span>
            </div>
            <p style="margin:6px 0 0;font-size:0.67rem;color:rgba(203,195,227,0.45);">1902~1920</p>
          </article>

          <article class="fsp-card" role="listitem" data-idx="3" data-cats="kr-historic" tabindex="0"
            itemscope itemtype="https://schema.org/Person"
            aria-label="안중근 사주 분석"
            style="border-radius:14px;padding:14px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.18);cursor:pointer;transition:all .2s;text-align:center;">
            <div style="font-size:2rem;margin-bottom:6px;">🎯</div>
            <h3 itemprop="name" style="margin:0 0 3px;font-size:0.92rem;font-weight:800;color:#f3e8ff;">안중근</h3>
            <p itemprop="jobTitle" style="margin:0 0 6px;font-size:0.7rem;color:rgba(203,195,227,0.65);line-height:1.3;">독립운동가·의병장</p>
            <div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;">
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(148,163,184,0.15);border:1px solid rgba(148,163,184,0.3);color:#cbd5e1;">금(金)</span>
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#c4b5fd;">편인</span>
            </div>
            <p style="margin:6px 0 0;font-size:0.67rem;color:rgba(203,195,227,0.45);">1879~1910</p>
          </article>

          <article class="fsp-card" role="listitem" data-idx="4" data-cats="kr-historic" tabindex="0"
            itemscope itemtype="https://schema.org/Person"
            aria-label="김구 사주 분석"
            style="border-radius:14px;padding:14px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.18);cursor:pointer;transition:all .2s;text-align:center;">
            <div style="font-size:2rem;margin-bottom:6px;">🇰🇷</div>
            <h3 itemprop="name" style="margin:0 0 3px;font-size:0.92rem;font-weight:800;color:#f3e8ff;">김구</h3>
            <p itemprop="jobTitle" style="margin:0 0 6px;font-size:0.7rem;color:rgba(203,195,227,0.65);line-height:1.3;">독립운동가·임시정부</p>
            <div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;">
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(110,231,183,0.15);border:1px solid rgba(110,231,183,0.3);color:#6ee7b7;">목(木)</span>
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#c4b5fd;">식신</span>
            </div>
            <p style="margin:6px 0 0;font-size:0.67rem;color:rgba(203,195,227,0.45);">1876~1949</p>
          </article>

          <article class="fsp-card" role="listitem" data-idx="5" data-cats="kr-historic" tabindex="0"
            itemscope itemtype="https://schema.org/Person"
            aria-label="정약용 사주 분석"
            style="border-radius:14px;padding:14px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.18);cursor:pointer;transition:all .2s;text-align:center;">
            <div style="font-size:2rem;margin-bottom:6px;">📚</div>
            <h3 itemprop="name" style="margin:0 0 3px;font-size:0.92rem;font-weight:800;color:#f3e8ff;">정약용</h3>
            <p itemprop="jobTitle" style="margin:0 0 6px;font-size:0.7rem;color:rgba(203,195,227,0.65);line-height:1.3;">실학자·철학자</p>
            <div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;">
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);color:#93c5fd;">수(水)</span>
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#c4b5fd;">정인</span>
            </div>
            <p style="margin:6px 0 0;font-size:0.67rem;color:rgba(203,195,227,0.45);">1762~1836</p>
          </article>

          <article class="fsp-card" role="listitem" data-idx="6" data-cats="kr-modern music" tabindex="0"
            itemscope itemtype="https://schema.org/Person"
            aria-label="BTS RM 사주 분석"
            style="border-radius:14px;padding:14px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.18);cursor:pointer;transition:all .2s;text-align:center;">
            <div style="font-size:2rem;margin-bottom:6px;">🎤</div>
            <h3 itemprop="name" style="margin:0 0 3px;font-size:0.92rem;font-weight:800;color:#f3e8ff;">BTS RM</h3>
            <p itemprop="jobTitle" style="margin:0 0 6px;font-size:0.7rem;color:rgba(203,195,227,0.65);line-height:1.3;">래퍼·아티스트</p>
            <div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;">
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);color:#93c5fd;">수(水)</span>
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#c4b5fd;">편인</span>
            </div>
            <p style="margin:6px 0 0;font-size:0.67rem;color:rgba(203,195,227,0.45);">1994년생</p>
          </article>

          <article class="fsp-card" role="listitem" data-idx="7" data-cats="kr-modern music acting" tabindex="0"
            itemscope itemtype="https://schema.org/Person"
            aria-label="IU 이지은 사주 분석"
            style="border-radius:14px;padding:14px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.18);cursor:pointer;transition:all .2s;text-align:center;">
            <div style="font-size:2rem;margin-bottom:6px;">🌙</div>
            <h3 itemprop="name" style="margin:0 0 3px;font-size:0.92rem;font-weight:800;color:#f3e8ff;">IU (이지은)</h3>
            <p itemprop="jobTitle" style="margin:0 0 6px;font-size:0.7rem;color:rgba(203,195,227,0.65);line-height:1.3;">가수·배우</p>
            <div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;">
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);color:#93c5fd;">수(Water)</span>
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#c4b5fd;">정인</span>
            </div>
            <p style="margin:6px 0 0;font-size:0.67rem;color:rgba(203,195,227,0.45);">1993년생</p>
          </article>

          <article class="fsp-card" role="listitem" data-idx="8" data-cats="kr-modern sports" tabindex="0"
            itemscope itemtype="https://schema.org/Person"
            aria-label="손흥민 사주 분석"
            style="border-radius:14px;padding:14px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.18);cursor:pointer;transition:all .2s;text-align:center;">
            <div style="font-size:2rem;margin-bottom:6px;">⚽</div>
            <h3 itemprop="name" style="margin:0 0 3px;font-size:0.92rem;font-weight:800;color:#f3e8ff;">손흥민</h3>
            <p itemprop="jobTitle" style="margin:0 0 6px;font-size:0.7rem;color:rgba(203,195,227,0.65);line-height:1.3;">축구 선수</p>
            <div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;">
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(148,163,184,0.15);border:1px solid rgba(148,163,184,0.3);color:#cbd5e1;">금(金)</span>
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#c4b5fd;">편관</span>
            </div>
            <p style="margin:6px 0 0;font-size:0.67rem;color:rgba(203,195,227,0.45);">1992년생</p>
          </article>

          <article class="fsp-card" role="listitem" data-idx="9" data-cats="foreign music" tabindex="0"
            itemscope itemtype="https://schema.org/Person"
            aria-label="Taylor Swift 사주 분석"
            style="border-radius:14px;padding:14px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.18);cursor:pointer;transition:all .2s;text-align:center;">
            <div style="font-size:2rem;margin-bottom:6px;">🌟</div>
            <h3 itemprop="name" style="margin:0 0 3px;font-size:0.92rem;font-weight:800;color:#f3e8ff;">Taylor Swift</h3>
            <p itemprop="jobTitle" style="margin:0 0 6px;font-size:0.7rem;color:rgba(203,195,227,0.65);line-height:1.3;">싱어송라이터</p>
            <div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;">
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(110,231,183,0.15);border:1px solid rgba(110,231,183,0.3);color:#6ee7b7;">목(木)</span>
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#c4b5fd;">정관</span>
            </div>
            <p style="margin:6px 0 0;font-size:0.67rem;color:rgba(203,195,227,0.45);">1989년생</p>
          </article>

          <article class="fsp-card" role="listitem" data-idx="10" data-cats="foreign business" tabindex="0"
            itemscope itemtype="https://schema.org/Person"
            aria-label="Elon Musk 사주 분석"
            style="border-radius:14px;padding:14px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.18);cursor:pointer;transition:all .2s;text-align:center;">
            <div style="font-size:2rem;margin-bottom:6px;">🚀</div>
            <h3 itemprop="name" style="margin:0 0 3px;font-size:0.92rem;font-weight:800;color:#f3e8ff;">Elon Musk</h3>
            <p itemprop="jobTitle" style="margin:0 0 6px;font-size:0.7rem;color:rgba(203,195,227,0.65);line-height:1.3;">Tesla·SpaceX CEO</p>
            <div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;">
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(110,231,183,0.15);border:1px solid rgba(110,231,183,0.3);color:#6ee7b7;">목(木)</span>
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#c4b5fd;">편관</span>
            </div>
            <p style="margin:6px 0 0;font-size:0.67rem;color:rgba(203,195,227,0.45);">1971년생</p>
          </article>

          <article class="fsp-card" role="listitem" data-idx="11" data-cats="foreign music" tabindex="0"
            itemscope itemtype="https://schema.org/Person"
            aria-label="뉴진스 하니 사주 분석"
            style="border-radius:14px;padding:14px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.18);cursor:pointer;transition:all .2s;text-align:center;">
            <div style="font-size:2rem;margin-bottom:6px;">🌸</div>
            <h3 itemprop="name" style="margin:0 0 3px;font-size:0.92rem;font-weight:800;color:#f3e8ff;">뉴진스 하니</h3>
            <p itemprop="jobTitle" style="margin:0 0 6px;font-size:0.7rem;color:rgba(203,195,227,0.65);line-height:1.3;">아이돌·댄서</p>
            <div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;">
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(110,231,183,0.15);border:1px solid rgba(110,231,183,0.3);color:#6ee7b7;">목(木)</span>
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#c4b5fd;">비견</span>
            </div>
            <p style="margin:6px 0 0;font-size:0.67rem;color:rgba(203,195,227,0.45);">2004년생</p>
          </article>

          <article class="fsp-card" role="listitem" data-idx="12" data-cats="kr-modern music acting" tabindex="0"
            itemscope itemtype="https://schema.org/Person"
            aria-label="박지훈 사주 분석"
            style="border-radius:14px;padding:14px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.18);cursor:pointer;transition:all .2s;text-align:center;">
            <div style="font-size:2rem;margin-bottom:6px;">✨</div>
            <h3 itemprop="name" style="margin:0 0 3px;font-size:0.92rem;font-weight:800;color:#f3e8ff;">박지훈</h3>
            <p itemprop="jobTitle" style="margin:0 0 6px;font-size:0.7rem;color:rgba(203,195,227,0.65);line-height:1.3;">가수·배우</p>
            <div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;">
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(110,231,183,0.15);border:1px solid rgba(110,231,183,0.3);color:#6ee7b7;">목(木)</span>
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#c4b5fd;">편관</span>
            </div>
            <p style="margin:6px 0 0;font-size:0.67rem;color:rgba(203,195,227,0.45);">1994년생</p>
          </article>

          <article class="fsp-card" role="listitem" data-idx="13" data-cats="kr-modern acting" tabindex="0"
            itemscope itemtype="https://schema.org/Person"
            aria-label="유해진 사주 분석"
            style="border-radius:14px;padding:14px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.18);cursor:pointer;transition:all .2s;text-align:center;">
            <div style="font-size:2rem;margin-bottom:6px;">🎭</div>
            <h3 itemprop="name" style="margin:0 0 3px;font-size:0.92rem;font-weight:800;color:#f3e8ff;">유해진</h3>
            <p itemprop="jobTitle" style="margin:0 0 6px;font-size:0.7rem;color:rgba(203,195,227,0.65);line-height:1.3;">배우</p>
            <div style="display:flex;justify-content:center;gap:5px;flex-wrap:wrap;">
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(209,170,100,0.18);border:1px solid rgba(209,170,100,0.35);color:#d4a76a;">토(土)</span>
              <span style="font-size:0.65rem;padding:2px 7px;border-radius:999px;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#c4b5fd;">정인</span>
            </div>
            <p style="margin:6px 0 0;font-size:0.67rem;color:rgba(203,195,227,0.45);">1970년생</p>
          </article>

        </div><!-- /#fsp-grid -->

        <!-- ④ 상세 분석 패널 (카드 클릭 시 표시) -->
        <div id="fsp-detail" style="display:none;margin:0 14px 14px;border-radius:16px;border:1px solid rgba(167,139,250,0.28);background:rgba(0,0,0,0.25);overflow:hidden;">
          <div id="fsp-detail-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(183,148,244,0.15);">
            <span id="fsp-detail-title" style="font-size:0.9rem;font-weight:800;color:#e9d5ff;">인물 상세 분석</span>
            <button id="fsp-detail-close" aria-label="닫기" style="background:none;border:none;color:rgba(203,195,227,0.6);font-size:1.1rem;cursor:pointer;padding:2px 6px;border-radius:6px;line-height:1;">✕</button>
          </div>
          <div id="famousSajuContent" style="padding:16px;">
            <!-- JS 동적 렌더링 -->
          </div>
        </div>

        <!-- ⑤ 생년월일 입력 → 원하는 인물 사주팔자 분석 -->
        <div style="margin:0 14px 14px;padding:16px;border-radius:16px;background:rgba(124,58,237,0.07);border:1px solid rgba(124,58,237,0.22);">
          <div style="font-size:0.84rem;font-weight:800;color:#c4b5fd;margin-bottom:6px;">🔍 원하는 인물의 생년월일로 사주팔자 분석하기</div>
          <p style="margin:0 0 12px;font-size:0.73rem;color:rgba(203,195,227,0.6);line-height:1.55;">유명인·역사 인물 등 누구든 생년월일을 입력하면 사주 엔진으로 사주팔자를 계산해드립니다</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label for="fsp-input-year" style="font-size:0.7rem;color:rgba(203,195,227,0.65);">년 (양력)</label>
              <input id="fsp-input-year" type="number" min="1300" max="2024" placeholder="1990" aria-label="출생년도(양력)"
                style="width:72px;padding:7px 8px;border-radius:9px;border:1px solid rgba(167,139,250,0.35);background:rgba(0,0,0,0.35);color:#f3e8ff;font-size:0.82rem;outline:none;text-align:center;">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label for="fsp-input-month" style="font-size:0.7rem;color:rgba(203,195,227,0.65);">월</label>
              <input id="fsp-input-month" type="number" min="1" max="12" placeholder="1" aria-label="출생월"
                style="width:54px;padding:7px 8px;border-radius:9px;border:1px solid rgba(167,139,250,0.35);background:rgba(0,0,0,0.35);color:#f3e8ff;font-size:0.82rem;outline:none;text-align:center;">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label for="fsp-input-day" style="font-size:0.7rem;color:rgba(203,195,227,0.65);">일</label>
              <input id="fsp-input-day" type="number" min="1" max="31" placeholder="1" aria-label="출생일"
                style="width:54px;padding:7px 8px;border-radius:9px;border:1px solid rgba(167,139,250,0.35);background:rgba(0,0,0,0.35);color:#f3e8ff;font-size:0.82rem;outline:none;text-align:center;">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label for="fsp-input-hour" style="font-size:0.7rem;color:rgba(203,195,227,0.65);">시(0~23)</label>
              <input id="fsp-input-hour" type="number" min="0" max="23" placeholder="12" aria-label="출생 시각"
                style="width:56px;padding:7px 8px;border-radius:9px;border:1px solid rgba(167,139,250,0.35);background:rgba(0,0,0,0.35);color:#f3e8ff;font-size:0.82rem;outline:none;text-align:center;">
            </div>
            <button id="fsp-calc-btn" style="padding:8px 18px;border-radius:9px;border:none;background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#f3e8ff;font-size:0.82rem;font-weight:700;cursor:pointer;white-space:nowrap;transition:opacity .15s;">사주팔자 분석</button>
          </div>
          <div id="fsp-my-result" style="margin-top:12px;display:none;">
            <!-- 사주 분석 결과 JS 렌더링 -->
          </div>
        </div>

        <!-- ⑥ 학술 면책 고지 -->
        <div style="margin:0 14px 16px;padding:10px 14px;border-radius:12px;background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.2);">
          <p style="margin:0;font-size:0.72rem;line-height:1.7;color:rgba(253,230,138,0.8);text-align:center;">
            ⚠️ <strong style="color:#fbbf24;">학술·교육 목적 전용 콘텐츠</strong> — 본 분석은 동양 명리학 이론 소개·교육을 위한 학술적 목적으로만 작성되었습니다.
            실제 인물에 대한 가치 판단·예측·진단이 아니며, 상업적·법적 판단의 근거로 사용될 수 없습니다.
            출생 시간 불명 인물은 정오(12시) 기준 학술 추정치를 사용합니다.
          </p>
        </div>

      </section>
    </div><!-- /.feature-card-wrapper -->
    <!-- ═══ 유명인 사주 분석 패널 끝 ═══ -->`;

/* ═══════════════════════════════════════════════════════
   새 스크립트 블록
   - KasiEngine.getGanji() 기반 정확한 사주 계산
   - Solar.getTime() 시주(時柱) 계산
   - 유명인 카드 클릭 시 동적 계산 (fallback: 저장된 데이터)
   - 입력 섹션: "원하는 인물 사주팔자 분석" (비교 X)
═══════════════════════════════════════════════════════ */
const NEW_SCRIPT = `<!-- ═══ 유명인 사주 분석 패널 스크립트 ═══ -->
<style>
.fsaj-el-bar{height:8px;border-radius:4px;transition:width .6s cubic-bezier(.4,0,.2,1);}
.fsaj-profile-photo-placeholder{width:80px;height:80px;border-radius:50%;border:3px solid rgba(167,139,250,0.6);background:linear-gradient(135deg,rgba(124,58,237,0.35),rgba(78,205,196,0.25));display:flex;align-items:center;justify-content:center;font-size:1.9rem;flex-shrink:0;}
.fsaj-section{margin:12px 0;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(183,148,244,0.16);}
.fsaj-section-title{font-size:0.8rem;font-weight:800;letter-spacing:0.04em;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
.fsaj-pillar-box{background:rgba(10,8,30,0.7);border:1px solid rgba(183,148,244,0.28);border-radius:10px;padding:9px 7px;text-align:center;flex:1;min-width:58px;}
.fsaj-pillar-label{font-size:0.68rem;color:rgba(203,195,227,0.7);margin-bottom:3px;}
.fsaj-pillar-chars{font-size:1.35rem;line-height:1.2;font-weight:700;color:#e9d5ff;letter-spacing:0.05em;}
.fsaj-pillar-elem{font-size:0.65rem;color:rgba(203,195,227,0.65);margin-top:2px;}
.fsaj-fortune-item{display:flex;align-items:flex-start;gap:10px;padding:7px 9px;border-radius:9px;margin-bottom:5px;background:rgba(255,255,255,0.04);}
.fsaj-fortune-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:5px;}
.fsaj-career-tag{display:inline-block;padding:3px 9px;border-radius:999px;font-size:0.73rem;margin:3px 2px;border:1px solid;font-weight:600;}
.fsp-card:hover,.fsp-card:focus{background:rgba(124,58,237,0.12)!important;border-color:rgba(167,139,250,0.45)!important;transform:translateY(-2px);outline:none;}
.fsp-card.fsp-card--active{background:rgba(124,58,237,0.2)!important;border-color:#a78bfa!important;}
.fsp-filter-btn:hover{background:rgba(124,58,237,0.2)!important;color:#e9d5ff!important;}
.fsp-filter--active{background:rgba(124,58,237,0.35)!important;border-color:rgba(167,139,250,0.6)!important;color:#e9d5ff!important;}
#fsp-input-year:focus,#fsp-input-month:focus,#fsp-input-day:focus,#fsp-input-hour:focus{border-color:rgba(167,139,250,0.7)!important;box-shadow:0 0 0 2px rgba(124,58,237,0.18);}
#fsp-calc-btn:hover{opacity:0.85;}
</style>
<script>
(function(){
'use strict';

/* ─── 오행/십성 상수 ─── */
var EL_COLOR={wood:'#4ade80',fire:'#f97316',earth:'#d4a76a',metal:'#94a3b8',water:'#60a5fa'};
var EL_KOR={wood:'목(木)',fire:'화(火)',earth:'토(土)',metal:'금(金)',water:'수(水)'};
var EL_SHORT={wood:'목',fire:'화',earth:'토',metal:'금',water:'수'};
var TS_EMOJI={'비견':'👬','겁재':'🥷','식신':'🍔','상관':'💥','편재':'🎢','정재':'🐖','편관':'⚔️','정관':'👑','편인':'🔮','정인':'📖'};

/* ─── GAN/JI 룩업 테이블 (saju-engine.js와 동일 체계) ─── */
var _G={'甲':{e:'wood',y:'+'},'乙':{e:'wood',y:'-'},'丙':{e:'fire',y:'+'},'丁':{e:'fire',y:'-'},'戊':{e:'earth',y:'+'},'己':{e:'earth',y:'-'},'庚':{e:'metal',y:'+'},'辛':{e:'metal',y:'-'},'壬':{e:'water',y:'+'},'癸':{e:'water',y:'-'}};
var _J={'子':{e:'water',y:'-'},'丑':{e:'earth',y:'-'},'寅':{e:'wood',y:'+'},'卯':{e:'wood',y:'-'},'辰':{e:'earth',y:'+'},'巳':{e:'fire',y:'+'},'午':{e:'fire',y:'-'},'未':{e:'earth',y:'-'},'申':{e:'metal',y:'+'},'酉':{e:'metal',y:'-'},'戌':{e:'earth',y:'+'},'亥':{e:'water',y:'+'}};
var _GL=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
var _JL=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
var _ELS=['wood','fire','earth','metal','water'];

/* ─── 유명인 사주 데이터베이스 (생년월일 기준, 사주팔자는 런타임에 엔진 계산) ─── */
var FAMOUS_DATA=[
  {name:'이순신',lifespan:'1545~1598',job:'조선 수군 통제사·장군',emoji:'⚓',cats:['kr-historic'],
   birth:{year:1545,month:4,day:28,hour:0},
   fallbackPillars:{y:{g:'乙',j:'巳',gE:'wood',jE:'fire'},m:{g:'庚',j:'辰',gE:'metal',jE:'earth'},d:{g:'甲',j:'子',gE:'wood',jE:'water'},h:{g:'甲',j:'子',gE:'wood',jE:'water'}},
   mainStar:'편관',
   fiveAnalysis:'목(木) 기운이 중심이 되어 강한 용기와 결단력을 내재하며, 토(土)와 수(水)의 조화로 실용적 지략까지 겸비했습니다. 금(金)의 편관 기운이 극한의 충성심과 책임감을 부여합니다.',
   tenStarAnalysis:'편관(偏官)이 강하게 자리잡아 불굴의 의지와 목숨을 건 책임감을 상징합니다. 역경을 에너지로 삼아 전장에서 빛을 발하는 전형적인 편관 지도자형입니다.',
   personality:'강직·책임형: 불의 앞에 타협이 없으며 원칙을 끝까지 고수합니다.',
   careerFit:'군사·전략가·지휘관 적성 최고 수준. 목(木) 일간의 성장·개척 에너지와 편관의 규율 에너지가 결합하여 전쟁이라는 극한 환경에서 최고의 성과를 냈습니다.',
   careerTags:['군사 전략가','지도자·통솔','위기관리','국가 청렴 행정'],
   fortuneFlow:[{period:'1545~1570년대',label:'초년기',color:'#60a5fa',desc:'목(木) 기운 강한 초년. 인내와 학습으로 내공을 쌓는 시기.'},
    {period:'1571~1597년',label:'중년 전성기',color:'#a78bfa',desc:'금(金) 대운으로 편관 극대화. 장군 임명·임진왜란 전승.'},
    {period:'1597~1598년',label:'말년',color:'#f87171',desc:'백의종군·노량해전 장렬 순국. 운명과 정면 대결한 시기.'}]},
  {name:'세종대왕',lifespan:'1397~1450',job:'조선 4대 국왕·훈민정음 창제',emoji:'📜',cats:['kr-historic'],
   birth:{year:1397,month:4,day:10,hour:10},
   fallbackPillars:{y:{g:'丁',j:'丑',gE:'fire',jE:'earth'},m:{g:'庚',j:'辰',gE:'metal',jE:'earth'},d:{g:'壬',j:'午',gE:'water',jE:'fire'},h:{g:'甲',j:'午',gE:'wood',jE:'fire'}},
   mainStar:'편재',
   fiveAnalysis:'화(火) 기운이 가장 강하여 빛나는 지성과 창의적 영감을 상징합니다. 토(土)가 화(火)를 받아 지식을 실용화합니다. 임수(壬水) 일간이 화(火)를 제어해 깊은 학문적 탐구심을 키웁니다.',
   tenStarAnalysis:'편재(偏財)가 주성으로 넓은 세계관과 포용적 리더십을 상징합니다.',
   personality:'창조·포용형: 실용 학문을 통해 세상을 변화시키고자 하는 열망이 강합니다.',
   careerFit:'학자·연구자·정책입안자 최적 적성. 한글 창제·과학기기 발명 등 실용적 학문 성과로 증명되었습니다.',
   careerTags:['학자·연구자','정책 기획','언어·문화 창조','과학기술 개발'],
   fortuneFlow:[{period:'1397~1418년',label:'왕자 시절',color:'#60a5fa',desc:'학문 탐구와 독서에 몰두. 조기 왕위 계승.'},
    {period:'1418~1445년',label:'창제·전성기',color:'#a78bfa',desc:'훈민정음 창제·집현전 설치 등 폭발적 창조 성과.'},
    {period:'1446~1450년',label:'완성기',color:'#6ee7b7',desc:'지병을 딛고 국정 정비. 학문 유산 완성.'}]},
  {name:'유관순',lifespan:'1902~1920',job:'독립운동가·3·1운동 상징',emoji:'🕊️',cats:['kr-historic'],
   birth:{year:1902,month:11,day:17,hour:6},
   fallbackPillars:{y:{g:'壬',j:'寅',gE:'water',jE:'wood'},m:{g:'壬',j:'子',gE:'water',jE:'water'},d:{g:'丁',j:'亥',gE:'fire',jE:'water'},h:{g:'甲',j:'寅',gE:'wood',jE:'wood'}},
   mainStar:'정관',
   fiveAnalysis:'수(水) 기운이 압도적으로 강하여 깊은 신념과 흔들리지 않는 의지의 사주입니다. 정(丁)화 일간이 거대한 수(水) 속에서 꺼지지 않는 불꽃으로 신념을 지켜냅니다.',
   tenStarAnalysis:'정관(正官)이 주성으로 정의 앞에서 두려움이 없는 원칙주의적 성향을 나타냅니다.',
   personality:'신념·정의형: 옳고 그름에 대한 판단이 명확하며, 죽음 앞에서도 신념을 굽히지 않습니다.',
   careerFit:'사회운동·교육·언론 분야 최적 적성. 수(Water)의 깊은 지혜와 목(木)의 성장 에너지가 약자를 위한 목소리로 발휘됩니다.',
   careerTags:['사회운동가','교육자','언론·저술가','공공봉사'],
   fortuneFlow:[{period:'1902~1916년',label:'유년·학업기',color:'#60a5fa',desc:'이화학당 입학. 신앙과 교육으로 신념 형성.'},
    {period:'1919년',label:'3·1운동',color:'#a78bfa',desc:'아우내 장터 만세운동 주도. 역사에 각인된 순간.'},
    {period:'1919~1920년',label:'순국',color:'#f87171',desc:'서대문 형무소 투옥·18세 순국.'}]},
  {name:'안중근',lifespan:'1879~1910',job:'독립운동가·의사(義士)',emoji:'🎯',cats:['kr-historic'],
   birth:{year:1879,month:7,day:16,hour:8},
   fallbackPillars:{y:{g:'己',j:'卯',gE:'earth',jE:'wood'},m:{g:'壬',j:'申',gE:'water',jE:'metal'},d:{g:'庚',j:'子',gE:'metal',jE:'water'},h:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   mainStar:'편인',
   fiveAnalysis:'금(金)과 토(土) 기운이 강하여 철의 의지와 강한 원칙을 상징합니다. 경(庚)금 일간은 날카롭고 단호한 결단력을 나타냅니다.',
   tenStarAnalysis:'편인(偏印)이 주성으로 독자적 사상과 직관적 신념을 상징합니다.',
   personality:'결단·독행형: 신념을 위해서라면 목숨도 도구로 쓰는 결단력.',
   careerFit:'군사·법학·철학 분야 최적 적성.',
   careerTags:['군인·지휘관','법률·정의 수호','철학·사상가','독립운동'],
   fortuneFlow:[{period:'1879~1905년',label:'성장·입신기',color:'#60a5fa',desc:'학문과 무술 연마. 의병 활동 시작.'},
    {period:'1905~1909년',label:'의거 준비기',color:'#a78bfa',desc:'국채보상운동·의병 지휘.'},
    {period:'1909~1910년',label:'의거·순국',color:'#f87171',desc:'하얼빈 거사 성공 후 순국.'}]},
  {name:'김구',lifespan:'1876~1949',job:'독립운동가·임시정부 주석',emoji:'🇰🇷',cats:['kr-historic'],
   birth:{year:1876,month:7,day:11,hour:12},
   fallbackPillars:{y:{g:'丙',j:'子',gE:'fire',jE:'water'},m:{g:'丁',j:'未',gE:'fire',jE:'earth'},d:{g:'甲',j:'午',gE:'wood',jE:'fire'},h:{g:'壬',j:'午',gE:'water',jE:'fire'}},
   mainStar:'식신',
   fiveAnalysis:'화(火) 기운이 압도적으로 강하여 뜨거운 열정과 민족에 대한 헌신을 상징합니다.',
   tenStarAnalysis:'식신(食神)이 주성으로 나누고 베푸는 성향, 민족을 위한 헌신 에너지를 상징합니다.',
   personality:'헌신·포용형: 민족과 대의를 위해 개인의 안위를 철저히 희생합니다.',
   careerFit:'정치·외교·민족운동 분야 최적 적성.',
   careerTags:['정치 지도자','외교·협상가','민족 운동가','교육·계몽'],
   fortuneFlow:[{period:'1876~1910년',label:'항일 투쟁기',color:'#60a5fa',desc:'동학·의병 활동. 수감과 탈옥의 투쟁기.'},
    {period:'1919~1945년',label:'임시정부 시기',color:'#a78bfa',desc:'임시정부 주석으로 독립운동 총지휘.'},
    {period:'1945~1949년',label:'광복 후',color:'#6ee7b7',desc:'통일 정부 수립 위해 남북협상 주도.'}]},
  {name:'정약용',lifespan:'1762~1836',job:'조선 실학자·다산(茶山)',emoji:'📚',cats:['kr-historic'],
   birth:{year:1762,month:6,day:16,hour:8},
   fallbackPillars:{y:{g:'壬',j:'午',gE:'water',jE:'fire'},m:{g:'庚',j:'午',gE:'metal',jE:'fire'},d:{g:'壬',j:'申',gE:'water',jE:'metal'},h:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   mainStar:'정인',
   fiveAnalysis:'수(Water)와 화(火)가 균형 있게 공존하는 드문 사주 구조입니다. 임(壬)수 일간이 광대한 지식의 바다를 상징합니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 끝없는 학문적 탐구심과 지식 흡수 능력을 상징합니다.',
   personality:'탐구·혁신형: 세계를 분석하고 더 나은 구조를 설계하는 데 삶의 의미를 찾습니다.',
   careerFit:'학자·연구자·행정개혁가 최고 수준.',
   careerTags:['학자·연구자','행정·제도 개혁','공학·실용과학','저술·교육'],
   fortuneFlow:[{period:'1762~1800년',label:'관직 성장기',color:'#60a5fa',desc:'수원 화성 설계 등 실용 학문 성과기.'},
    {period:'1801~1818년',label:'유배 전반기',color:'#f87171',desc:'신유박해로 강진 유배. 수백 권 저서 집필.'},
    {period:'1818~1836년',label:'해배·완성기',color:'#a78bfa',desc:'목민심서·경세유표 대표작 완성.'}]},
  {name:'BTS RM (김남준)',lifespan:'1994년생',job:'BTS 리더·래퍼·아티스트',emoji:'🎤',cats:['kr-modern','music'],
   birth:{year:1994,month:9,day:12,hour:12},
   fallbackPillars:{y:{g:'甲',j:'戌',gE:'wood',jE:'earth'},m:{g:'壬',j:'申',gE:'water',jE:'metal'},d:{g:'甲',j:'子',gE:'wood',jE:'water'},h:{g:'壬',j:'午',gE:'water',jE:'fire'}},
   mainStar:'편인',
   fiveAnalysis:'수(Water)기운이 주도적으로 흘러 깊은 지성과 철학적 사유 능력을 부여합니다.',
   tenStarAnalysis:'편인(偏印)이 주성으로 독자적 사상과 번뜩이는 직관, 철학에 대한 깊은 탐구심이 특징입니다.',
   personality:'탐구·표현형: 음악을 통해 내면의 철학을 전달합니다.',
   careerFit:'음악·예술·철학·작가 분야 최적 적성.',
   careerTags:['음악·작사','시각예술','철학·자기성찰','브랜드 크리에이티브'],
   fortuneFlow:[{period:'2010~2013년',label:'데뷔 전 수련기',color:'#60a5fa',desc:'작사 실력 집중 연마.'},
    {period:'2013~2020년',label:'BTS 전성기',color:'#a78bfa',desc:'DNA·Dynamite 전 세계 히트.'},
    {period:'2022년~현재',label:'개인 아티스트기',color:'#6ee7b7',desc:'솔로앨범 Indigo 발매.'}]},
  {name:'IU (이지은)',lifespan:'1993년생',job:'가수·배우·프로듀서',emoji:'🌙',cats:['kr-modern','music','acting'],
   birth:{year:1993,month:5,day:16,hour:10},
   fallbackPillars:{y:{g:'癸',j:'酉',gE:'water',jE:'metal'},m:{g:'癸',j:'巳',gE:'water',jE:'fire'},d:{g:'癸',j:'丑',gE:'water',jE:'earth'},h:{g:'辛',j:'巳',gE:'metal',jE:'fire'}},
   mainStar:'정인',
   fiveAnalysis:'계(癸)수가 세 기둥에 자리잡아 극도로 섬세하고 공감 능력이 풍부한 감성형 사주입니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 깊은 공감 능력, 대중에게 사랑받는 인복을 상징합니다.',
   personality:'공감·치유형: 음악으로 청중의 마음을 어루만지는 능력이 탁월합니다.',
   careerFit:'음악·연기·크리에이티브 프로듀싱 최적 적성.',
   careerTags:['싱어송라이터','배우·연기','음악 프로듀서','브랜드 아이콘'],
   fortuneFlow:[{period:'2007~2010년',label:'데뷔 초 고난기',color:'#f87171',desc:'경제적 어려움 속 실력 연마.'},
    {period:'2010~2018년',label:'국민 가수 전성기',color:'#a78bfa',desc:'좋은 날·밤편지 연속 히트.'},
    {period:'2019년~현재',label:'아티스트 진화기',color:'#6ee7b7',desc:'드라마·음악 양면 최고 위상 유지.'}]},
  {name:'손흥민',lifespan:'1992년생',job:'축구선수·토트넘 홋스퍼 주장',emoji:'⚽',cats:['kr-modern','sports'],
   birth:{year:1992,month:7,day:8,hour:6},
   fallbackPillars:{y:{g:'壬',j:'申',gE:'water',jE:'metal'},m:{g:'甲',j:'午',gE:'wood',jE:'fire'},d:{g:'庚',j:'子',gE:'metal',jE:'water'},h:{g:'戊',j:'寅',gE:'earth',jE:'wood'}},
   mainStar:'편관',
   fiveAnalysis:'경(庚)금 일간이 강한 금(金) 기운을 주도하며 날카로운 결단력과 폭발적 순발력을 상징합니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 극한의 경쟁에서 빛나는 투지와 한계 돌파 의지를 상징합니다.',
   personality:'도전·집중형: 역경에서 더 강해지는 타입.',
   careerFit:'스포츠·경쟁 분야 최적 적성.',
   careerTags:['스포츠·운동선수','리더십·주장','글로벌 브랜드','롤모델'],
   fortuneFlow:[{period:'2008~2013년',label:'유럽 입성기',color:'#60a5fa',desc:'독일 함부르크·레버쿠젠 이적.'},
    {period:'2015~2022년',label:'EPL 전성기',color:'#a78bfa',desc:'2022 아시아인 최초 EPL 득점왕.'},
    {period:'2023년~현재',label:'주장·레전드기',color:'#6ee7b7',desc:'토트넘 주장 완전 정착.'}]},
  {name:'Taylor Swift',lifespan:'1989년생',job:'싱어송라이터·미국 팝스타',emoji:'🌟',cats:['foreign','music'],
   birth:{year:1989,month:12,day:13,hour:8},
   fallbackPillars:{y:{g:'己',j:'巳',gE:'earth',jE:'fire'},m:{g:'壬',j:'子',gE:'water',jE:'water'},d:{g:'丁',j:'亥',gE:'fire',jE:'water'},h:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   mainStar:'정관',
   fiveAnalysis:'수(Water) 기운이 강해 풍부한 감성·직관력이 탐구적 글쓰기로 분출됩니다.',
   tenStarAnalysis:'정관(正官)이 주성으로 정도를 걷는 원칙주의 성향입니다.',
   personality:'감성·원칙형: 개인 경험을 음악으로 승화하는 재능.',
   careerFit:'음악·스토리텔링·프로듀싱 최적 적성.',
   careerTags:['싱어송라이터','비즈니스 전략가','브랜드 파워','팬덤 리더십'],
   fortuneFlow:[{period:'2006~2012년',label:'컨트리 팝 스타기',color:'#60a5fa',desc:'Fearless·Speak Now로 그래미 수상.'},
    {period:'2014~2020년',label:'팝 슈퍼스타기',color:'#a78bfa',desc:'1989·reputation 연속 히트.'},
    {period:'2021년~현재',label:'레전드 확정기',color:'#fbbf24',desc:'에라스 투어 역대 최고 수익.'}]},
  {name:'Elon Musk',lifespan:'1971년생',job:'Tesla·SpaceX·X CEO',emoji:'🚀',cats:['foreign','business'],
   birth:{year:1971,month:6,day:28,hour:8},
   fallbackPillars:{y:{g:'辛',j:'亥',gE:'metal',jE:'water'},m:{g:'庚',j:'午',gE:'metal',jE:'fire'},d:{g:'甲',j:'辰',gE:'wood',jE:'earth'},h:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   mainStar:'편관',
   fiveAnalysis:'갑(甲)목 일간에 금(金)과 목(木)이 강하게 대립하는 극도로 역동적 사주입니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 기존 한계를 부수고 불가능에 도전하는 파괴적 혁신 에너지를 상징합니다.',
   personality:'혁신·극단형: "불가능"을 거부하고 물리학적 한계에 직접 도전합니다.',
   careerFit:'기술 혁신·우주·미래산업 최적 적성.',
   careerTags:['기술 혁신가','우주·미래산업','비즈니스 제국','공학·알고리즘'],
   fortuneFlow:[{period:'1995~2002년',label:'창업 초기',color:'#60a5fa',desc:'Zip2·X.com(페이팔 전신) 창업 및 매각.'},
    {period:'2004~2018년',label:'테슬라·스페이스X',color:'#a78bfa',desc:'수차례 파산 위기 극복.'},
    {period:'2019년~현재',label:'세계 지배 확장기',color:'#fbbf24',desc:'테슬라 폭등으로 세계 최부자.'}]},
  {name:'뉴진스 하니 (팜 하니)',lifespan:'2004년생',job:'뉴진스 멤버·글로벌 팝스타',emoji:'🌸',cats:['foreign','music'],
   birth:{year:2004,month:10,day:6,hour:8},
   fallbackPillars:{y:{g:'甲',j:'申',gE:'wood',jE:'metal'},m:{g:'壬',j:'戌',gE:'water',jE:'earth'},d:{g:'甲',j:'寅',gE:'wood',jE:'wood'},h:{g:'甲',j:'辰',gE:'wood',jE:'earth'}},
   mainStar:'비견',
   fiveAnalysis:'갑(甲)목이 세 기둥에 자리잡아 성장·창조·자유 에너지가 압도적입니다.',
   tenStarAnalysis:'비견(比肩)이 주성으로 강렬한 자기 정체성과 독립적 에너지를 상징합니다.',
   personality:'자유·표현형: 경계 없이 자신을 표현하며 다문화 배경을 강점으로 삼습니다.',
   careerFit:'K-팝·글로벌 엔터테인먼트·패션 최적 적성.',
   careerTags:['K-팝 퍼포머','패션·뮤즈','글로벌 모델','크리에이티브 아이콘'],
   fortuneFlow:[{period:'2022년',label:'혜성 같은 등장',color:'#60a5fa',desc:'뉴진스 데뷔와 동시에 Hype Boy 글로벌 히트.'},
    {period:'2023~2024년',label:'글로벌 아이콘기',color:'#a78bfa',desc:'유엔 연설·LVMH 앰배서더.'},
    {period:'2025년~현재',label:'독자 활동 전환기',color:'#fbbf24',desc:'레이블 분쟁 이후 새로운 방향 모색.'}]},
  {name:'박지훈',lifespan:'1994년생',job:'가수·배우·Wanna One 출신',emoji:'✨',cats:['kr-modern','music','acting'],
   birth:{year:1994,month:3,day:4,hour:12},
   fallbackPillars:{y:{g:'甲',j:'戌',gE:'wood',jE:'earth'},m:{g:'甲',j:'寅',gE:'wood',jE:'wood'},d:{g:'庚',j:'午',gE:'metal',jE:'fire'},h:{g:'壬',j:'午',gE:'water',jE:'fire'}},
   mainStar:'편관',
   fiveAnalysis:'목(木) 기운이 두 기둥에 강하게 자리잡아 성장·표현·창의의 에너지가 넘칩니다.',
   tenStarAnalysis:'편관(偏官)이 주성으로 경쟁 상황에서 더 강해지는 에너지입니다.',
   personality:'집중·도전형: 아이돌 출신임에도 연기·음악 양면에서 자신의 색을 강하게 발휘합니다.',
   careerFit:'음악·연기·엔터테인먼트 최적 적성.',
   careerTags:['아이돌·퍼포머','배우·연기','싱어송라이터','브랜드 아이콘'],
   fortuneFlow:[{period:'2015~2017년',label:'데뷔 준비기',color:'#60a5fa',desc:'연습생 시절. 음악·연기 능력 습득.'},
    {period:'2017~2019년',label:'Wanna One 전성기',color:'#a78bfa',desc:'프로듀스101 1위 국민적 아이돌 등극.'},
    {period:'2020년~현재',label:'멀티 아티스트기',color:'#6ee7b7',desc:'솔로 가수 + 배우 병행.'}]},
  {name:'유해진',lifespan:'1970년생',job:'배우·충무로 최고 조연',emoji:'🎭',cats:['kr-modern','acting'],
   birth:{year:1970,month:1,day:22,hour:10},
   fallbackPillars:{y:{g:'己',j:'酉',gE:'earth',jE:'metal'},m:{g:'丁',j:'丑',gE:'fire',jE:'earth'},d:{g:'壬',j:'辰',gE:'water',jE:'earth'},h:{g:'甲',j:'午',gE:'wood',jE:'fire'}},
   mainStar:'정인',
   fiveAnalysis:'토(土) 기운이 세 기둥에 강하게 자리잡아 안정적이고 깊이 있는 인간 관찰력의 사주입니다.',
   tenStarAnalysis:'정인(正印)이 주성으로 깊은 관찰력과 배움 능력이 특징입니다.',
   personality:'관찰·내면형: 화려한 주목보다 깊이 있는 존재감을 발산합니다.',
   careerFit:'연기·연출·크리에이티브 분야 최적 적성.',
   careerTags:['배우·연기 장인','인간 관찰자','희극·비극 양면','충무로 신뢰 배우'],
   fortuneFlow:[{period:'1993~2005년',label:'조연 수련기',color:'#60a5fa',desc:'소소한 조연 역할 반복. 연기 내공을 쌓는 시기.'},
    {period:'2006~2016년',label:'충무로 조연 정상',color:'#a78bfa',desc:'범죄도시·베테랑 등 조연에서 주연급 임팩트.'},
    {period:'2017년~현재',label:'정상급 배우 완성기',color:'#fbbf24',desc:'극한직업 등 흥행 보증 배우로 완성.'}]}
];

/* ─── KasiEngine 기반 사주팔자 계산 ─── */
/* saju-engine.js의 KasiEngine.getGanji() + Solar.getEightChar().getTime() 사용 */
function _computePillarsViaEngine(y, m, d, h, callback) {
  var hourVal = (h === undefined || h === null || isNaN(h)) ? 12 : Math.max(0, Math.min(23, h));

  function doCompute() {
    try {
      var ke = window.KasiEngine;
      if (!ke || typeof ke.getGanji !== 'function') { callback(null, '엔진 로딩 중'); return; }

      var dt = new Date(y, m - 1, d, hourVal, 0, 0);
      var gj = ke.getGanji(dt);
      if (!gj || !gj.secha || !gj.weolgeon || !gj.iljin) { callback(null, '계산 실패'); return; }

      var yg = String(gj.secha)[0]   || '', yz = String(gj.secha)[1]   || '';
      var mg = String(gj.weolgeon)[0] || '', mz = String(gj.weolgeon)[1] || '';
      var dg = String(gj.iljin)[0]   || '', dz = String(gj.iljin)[1]   || '';

      /* 시주(시간) - Solar.fromYmdHms → Lunar → EightChar.getTime() 우선 사용 */
      var hg = '', hz = '';
      try {
        if (window.Solar) {
          var sol = Solar.fromYmdHms(y, m, d, hourVal, 0, 0);
          var lun = sol.getLunar();
          var bz  = lun.getEightChar();
          var hStr = String(bz.getTime() || '');
          if (hStr.length >= 2) { hg = hStr[0]; hz = hStr[1]; }
        }
      } catch (e2) {}

      /* 시주 fallback: 일간 기준 납음 계산 (saju-engine 동일 공식) */
      if (!hg) {
        var dgIdx = _GL.indexOf(dg);
        if (dgIdx >= 0) {
          var hji = Math.floor(((hourVal + 1) % 24) / 2);
          var hgi = (((dgIdx % 5) * 2) + hji + 60) % 10;
          hg = _GL[hgi]; hz = _JL[hji];
        }
      }

      callback({
        y: { g: yg, j: yz, gE: (_G[yg] || {}).e || '', jE: (_J[yz] || {}).e || '' },
        m: { g: mg, j: mz, gE: (_G[mg] || {}).e || '', jE: (_J[mz] || {}).e || '' },
        d: { g: dg, j: dz, gE: (_G[dg] || {}).e || '', jE: (_J[dz] || {}).e || '' },
        h: { g: hg, j: hz, gE: (_G[hg] || {}).e || '', jE: (_J[hz] || {}).e || '' }
      });
    } catch (err) { callback(null, '계산 오류'); }
  }

  if (window.KasiEngine && window.Solar) {
    doCompute();
  } else if (typeof window.__cdEnsureSajuCoreLoaded === 'function') {
    window.__cdEnsureSajuCoreLoaded().then(function() { doCompute(); }).catch(function() { callback(null, '엔진 로딩 실패'); });
  } else if (typeof window.__cdEnsureLunarLibReady === 'function') {
    window.__cdEnsureLunarLibReady().then(function() {
      if (window.KasiEngine) { doCompute(); } else { callback(null, '엔진 없음'); }
    }).catch(function() { callback(null, '라이브러리 로딩 실패'); });
  } else {
    callback(null, '엔진 없음');
  }
}

function _computeElRatios(pillars) {
  var cnt = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  ['y','m','d','h'].forEach(function(k) {
    var p = pillars[k]; if (!p) return;
    if (p.gE) cnt[p.gE] = (cnt[p.gE] || 0) + 1;
    if (p.jE) cnt[p.jE] = (cnt[p.jE] || 0) + 1;
  });
  var total = Object.keys(cnt).reduce(function(s, k) { return s + cnt[k]; }, 0) || 8;
  var ratios = {};
  Object.keys(cnt).forEach(function(el) { ratios[el] = Math.round(cnt[el] / total * 100); });
  return ratios;
}

function _dominantEl(ratios) {
  return Object.keys(ratios).reduce(function(a, b) { return ratios[a] >= ratios[b] ? a : b; }, 'wood');
}

/* ─── 유명인 카드 상세 렌더링 ─── */
function _renderDetail(card, pillars, elRatios, dominant, content) {
  var elOrder = ['wood','fire','earth','metal','water'];
  var elBars = elOrder.map(function(el) {
    var pct = elRatios[el] || 0;
    return '<div style="display:flex;align-items:center;gap:7px;margin-bottom:5px;">'
      + '<span style="min-width:22px;font-size:0.71rem;color:rgba(203,195,227,0.8);">' + EL_SHORT[el] + '</span>'
      + '<div style="flex:1;height:7px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">'
      + '<div class="fsaj-el-bar" style="width:0;background:' + EL_COLOR[el] + ';border-radius:4px;" data-width="' + pct + '"></div>'
      + '</div>'
      + '<span style="min-width:30px;font-size:0.71rem;font-weight:700;color:' + EL_COLOR[el] + ';">' + pct + '%</span>'
      + '</div>';
  }).join('');

  var pillarOrder = ['y','m','d','h'], pillarLabel = ['년주','월주','일주','시주'];
  var pillarHtml = pillarOrder.map(function(p, i) {
    var pil = pillars[p]; if (!pil || !pil.g) return '';
    var isDay = (p === 'd');
    return '<div class="fsaj-pillar-box" style="' + (isDay ? 'border-color:rgba(167,139,250,0.55);background:rgba(124,58,237,0.12);' : '') + '">'
      + '<div class="fsaj-pillar-label">' + pillarLabel[i] + '</div>'
      + '<div class="fsaj-pillar-chars" style="color:' + (isDay ? '#c4b5fd' : '#e9d5ff') + ';">'
      + '<span style="color:' + (EL_COLOR[pil.gE] || '#e9d5ff') + ';">' + pil.g + '</span>'
      + '<span style="color:' + (EL_COLOR[pil.jE] || '#e9d5ff') + ';">' + pil.j + '</span>'
      + '</div>'
      + '<div class="fsaj-pillar-elem">' + (EL_SHORT[pil.gE] || '?') + '/' + (EL_SHORT[pil.jE] || '?') + '</div>'
      + '</div>';
  }).join('');

  var fortuneHtml = (card.fortuneFlow || []).map(function(f) {
    return '<div class="fsaj-fortune-item">'
      + '<div class="fsaj-fortune-dot" style="background:' + f.color + ';"></div>'
      + '<div style="flex:1;">'
      + '<div style="display:flex;align-items:baseline;gap:7px;margin-bottom:2px;">'
      + '<span style="font-size:0.77rem;font-weight:700;color:' + f.color + ';">' + f.label + '</span>'
      + '<span style="font-size:0.68rem;color:rgba(203,195,227,0.55);">' + f.period + '</span>'
      + '</div>'
      + '<p style="margin:0;font-size:0.78rem;line-height:1.62;color:rgba(226,232,240,0.87);">' + f.desc + '</p>'
      + '</div></div>';
  }).join('');

  var tagColors = ['rgba(167,139,250,0.22)','rgba(96,165,250,0.22)','rgba(110,231,183,0.22)','rgba(251,191,36,0.22)'];
  var tagBorders = ['rgba(167,139,250,0.42)','rgba(96,165,250,0.42)','rgba(110,231,183,0.42)','rgba(251,191,36,0.42)'];
  var tagTextColors = ['#c4b5fd','#93c5fd','#6ee7b7','#fde68a'];
  var careerTagHtml = (card.careerTags || []).map(function(t, i) {
    var ci = i % 4;
    return '<span class="fsaj-career-tag" style="background:' + tagColors[ci] + ';border-color:' + tagBorders[ci] + ';color:' + tagTextColors[ci] + ';">' + t + '</span>';
  }).join('');

  var starEmoji = TS_EMOJI[card.mainStar] || '⭐';
  var domColor = EL_COLOR[dominant] || '#a78bfa';

  content.innerHTML = ''
    + '<div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:14px;">'
    + '<div class="fsaj-profile-photo-placeholder"><span>' + card.emoji + '</span></div>'
    + '<div style="flex:1;min-width:0;">'
    + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px;">'
    + '<h3 style="margin:0;font-size:1.08rem;font-weight:800;color:#f3e8ff;">' + card.name + '</h3>'
    + '<span style="font-size:0.7rem;color:rgba(203,195,227,0.6);">' + card.lifespan + '</span>'
    + '</div>'
    + '<p style="margin:0 0 7px;font-size:0.78rem;color:rgba(203,195,227,0.75);">' + card.job + '</p>'
    + '<div style="display:flex;flex-wrap:wrap;gap:5px;">'
    + '<span style="padding:3px 9px;border-radius:999px;font-size:0.68rem;font-weight:700;background:rgba(0,0,0,0.25);border:1px solid ' + domColor + ';color:' + domColor + ';">' + EL_KOR[dominant] + '</span>'
    + '<span style="padding:3px 9px;border-radius:999px;font-size:0.68rem;font-weight:700;background:rgba(124,58,237,0.18);border:1px solid rgba(167,139,250,0.38);color:#c4b5fd;">' + starEmoji + ' ' + card.mainStar + '</span>'
    + '</div></div></div>'
    + '<div class="fsaj-section"><div class="fsaj-section-title" style="color:#c4b5fd;">🔮 사주팔자 원국</div>'
    + '<div style="display:flex;gap:7px;">' + pillarHtml + '</div>'
    + '<p style="margin:8px 0 0;font-size:0.68rem;color:rgba(203,195,227,0.5);text-align:center;">※ KasiEngine으로 계산한 절기·절입 보정 사주 · 출생 시간 불명 인물은 정오(12시) 기준</p>'
    + '</div>'
    + '<div class="fsaj-section"><div class="fsaj-section-title" style="color:#6ee7b7;">🌿 오행 분석</div>' + elBars
    + '<p style="margin:9px 0 0;font-size:0.78rem;line-height:1.68;color:rgba(226,232,240,0.87);">' + card.fiveAnalysis + '</p>'
    + '</div>'
    + '<div class="fsaj-section"><div class="fsaj-section-title" style="color:#fde68a;">' + starEmoji + ' 십성 분석</div>'
    + '<p style="margin:0;font-size:0.78rem;line-height:1.68;color:rgba(226,232,240,0.87);">' + card.tenStarAnalysis + '</p>'
    + '</div>'
    + '<div class="fsaj-section"><div class="fsaj-section-title" style="color:#93c5fd;">💼 성향 & 진로 적성</div>'
    + '<p style="margin:0 0 8px;font-size:0.78rem;line-height:1.68;color:rgba(226,232,240,0.87);"><strong style="color:#bfdbfe;">성향:</strong> ' + card.personality + '</p>'
    + '<p style="margin:0 0 8px;font-size:0.78rem;line-height:1.68;color:rgba(226,232,240,0.87);"><strong style="color:#bfdbfe;">적성:</strong> ' + card.careerFit + '</p>'
    + '<div>' + careerTagHtml + '</div>'
    + '</div>'
    + '<div class="fsaj-section"><div class="fsaj-section-title" style="color:#f9a8d4;">🌊 운의 흐름</div>' + fortuneHtml + '</div>';

  requestAnimationFrame(function() {
    setTimeout(function() {
      content.querySelectorAll('.fsaj-el-bar').forEach(function(b) { b.style.width = (b.getAttribute('data-width') || '0') + '%'; });
    }, 80);
  });
}

function renderFamousCard(idx) {
  var card = FAMOUS_DATA[idx];
  if (!card) return;
  var content = document.getElementById('famousSajuContent');
  if (!content) return;

  /* 로딩 표시 후 비동기 계산 */
  content.innerHTML = '<div style="text-align:center;padding:32px 16px;color:rgba(203,195,227,0.55);font-size:0.85rem;">⏳ 사주팔자 계산 중...</div>';

  _computePillarsViaEngine(card.birth.year, card.birth.month, card.birth.day, card.birth.hour, function(enginePillars, errMsg) {
    /* 엔진 성공 시 엔진 결과 사용, 실패 시 저장된 fallback 사용 */
    var pillars = enginePillars || card.fallbackPillars;
    if (!pillars) {
      content.innerHTML = '<p style="margin:16px;font-size:0.8rem;color:#f87171;">사주 계산 엔진 로딩 중입니다. 잠시 후 다시 클릭해 주세요.</p>';
      return;
    }
    var elRatios = _computeElRatios(pillars);
    var dominant = _dominantEl(elRatios);
    _renderDetail(card, pillars, elRatios, dominant, content);
  });
}

function initFspFilter() {
  var bar = document.getElementById('fsp-filter-bar');
  if (!bar) return;
  bar.addEventListener('click', function(e) {
    var btn = e.target.closest('.fsp-filter-btn');
    if (!btn) return;
    bar.querySelectorAll('.fsp-filter-btn').forEach(function(b) { b.classList.remove('fsp-filter--active'); });
    btn.classList.add('fsp-filter--active');
    var cat = btn.getAttribute('data-cat');
    document.querySelectorAll('.fsp-card').forEach(function(card) {
      if (cat === 'all') {
        card.style.display = '';
      } else {
        var cats = (card.getAttribute('data-cats') || '').split(' ');
        card.style.display = cats.indexOf(cat) >= 0 ? '' : 'none';
      }
    });
  });
}

function initFspGrid() {
  var grid = document.getElementById('fsp-grid');
  if (!grid) return;
  var detail = document.getElementById('fsp-detail');
  var closeBtn = document.getElementById('fsp-detail-close');
  var titleEl = document.getElementById('fsp-detail-title');
  grid.addEventListener('click', function(e) {
    var card = e.target.closest('.fsp-card');
    if (!card) return;
    var idx = parseInt(card.getAttribute('data-idx'));
    if (isNaN(idx)) return;
    grid.querySelectorAll('.fsp-card').forEach(function(c) { c.classList.remove('fsp-card--active'); });
    card.classList.add('fsp-card--active');
    if (detail) detail.style.display = '';
    if (titleEl && FAMOUS_DATA[idx]) titleEl.textContent = FAMOUS_DATA[idx].name + ' 사주팔자 분석';
    renderFamousCard(idx);
    if (detail) setTimeout(function() { detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
  });
  grid.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      var card = e.target.closest('.fsp-card');
      if (card) card.click();
    }
  });
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      if (detail) detail.style.display = 'none';
      grid.querySelectorAll('.fsp-card').forEach(function(c) { c.classList.remove('fsp-card--active'); });
    });
  }
}

/* ─── 원하는 인물의 생년월일로 사주팔자 분석 ─── */
function initFspCalc() {
  var btn = document.getElementById('fsp-calc-btn');
  if (!btn) return;
  btn.addEventListener('click', function() {
    var yVal = document.getElementById('fsp-input-year').value;
    var mVal = document.getElementById('fsp-input-month').value;
    var dVal = document.getElementById('fsp-input-day').value;
    var hVal = document.getElementById('fsp-input-hour').value;

    var y = parseInt(yVal), m = parseInt(mVal), d = parseInt(dVal);
    var h = hVal === '' ? 12 : parseInt(hVal);
    var result = document.getElementById('fsp-my-result');
    if (!result) return;

    if (!y || !m || !d || y < 1300 || y > 2024 || m < 1 || m > 12 || d < 1 || d > 31) {
      result.style.display = '';
      result.innerHTML = '<p style="margin:0;font-size:0.78rem;color:#f87171;">올바른 생년월일(양력)을 입력해 주세요. (년 1300~2024, 월 1~12, 일 1~31)</p>';
      return;
    }

    result.style.display = '';
    result.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(203,195,227,0.55);font-size:0.85rem;">⏳ 사주팔자 계산 중...</div>';

    _computePillarsViaEngine(y, m, d, h, function(pillars, errMsg) {
      if (!pillars) {
        result.innerHTML = '<p style="margin:0;font-size:0.78rem;color:#f87171;">사주 계산 엔진 로딩 중입니다. 잠시 후 다시 시도해 주세요.' + (errMsg ? ' (' + errMsg + ')' : '') + '</p>';
        return;
      }
      var elRatios = _computeElRatios(pillars);
      var dominant = _dominantEl(elRatios);

      var elOrder = ['wood','fire','earth','metal','water'];
      var bars = elOrder.map(function(el) {
        var pct = elRatios[el] || 0;
        return '<div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">'
          + '<span style="min-width:20px;font-size:0.7rem;color:rgba(203,195,227,0.8);">' + EL_SHORT[el] + '</span>'
          + '<div style="flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">'
          + '<div class="fsaj-el-bar" style="width:0;background:' + EL_COLOR[el] + ';border-radius:4px;" data-width="' + pct + '"></div>'
          + '</div>'
          + '<span style="min-width:28px;font-size:0.7rem;font-weight:700;color:' + EL_COLOR[el] + ';">' + pct + '%</span>'
          + '</div>';
      }).join('');

      var pilHtml = ['y','m','d','h'].map(function(k, i) {
        var p = pillars[k];
        if (!p || !p.g) return '';
        return '<div class="fsaj-pillar-box">'
          + '<div class="fsaj-pillar-label">' + ['년주','월주','일주','시주'][i] + '</div>'
          + '<div class="fsaj-pillar-chars">'
          + '<span style="color:' + (EL_COLOR[p.gE] || '#e9d5ff') + ';">' + p.g + '</span>'
          + '<span style="color:' + (EL_COLOR[p.jE] || '#e9d5ff') + ';">' + p.j + '</span>'
          + '</div>'
          + '<div class="fsaj-pillar-elem">' + (EL_SHORT[p.gE] || '?') + '/' + (EL_SHORT[p.jE] || '?') + '</div>'
          + '</div>';
      }).join('');

      result.innerHTML = '<div style="padding:14px;border-radius:12px;background:rgba(0,0,0,0.2);border:1px solid rgba(167,139,250,0.22);">'
        + '<div style="font-size:0.79rem;font-weight:700;color:#c4b5fd;margin-bottom:10px;">📊 사주팔자 분석 결과 <span style="font-size:0.68rem;font-weight:400;color:rgba(203,195,227,0.5);">' + y + '년 ' + m + '월 ' + d + '일 ' + h + '시 (양력)</span></div>'
        + '<div style="display:flex;gap:6px;margin-bottom:10px;">' + pilHtml + '</div>'
        + '<div style="font-size:0.76rem;font-weight:700;color:#6ee7b7;margin-bottom:6px;">오행 분포</div>'
        + bars
        + '<p style="margin:8px 0 0;font-size:0.7rem;color:rgba(203,195,227,0.5);">우세 기운: <strong style="color:' + EL_COLOR[dominant] + ';">' + EL_KOR[dominant] + '</strong> · KasiEngine 절입 보정 적용 · 양력 기준</p>'
        + '</div>';

      requestAnimationFrame(function() {
        setTimeout(function() {
          result.querySelectorAll('.fsaj-el-bar').forEach(function(b) { b.style.width = (b.getAttribute('data-width') || '0') + '%'; });
        }, 80);
      });
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { initFspFilter(); initFspGrid(); initFspCalc(); });
} else {
  initFspFilter(); initFspGrid(); initFspCalc();
}
})();
</script>
<!-- ═══ 유명인 사주 분석 패널 스크립트 끝 ═══ -->`;

/* ─── 파일 교체 함수 ─── */
function replaceBetween(text, startMark, endMark, replacement) {
  const si = text.indexOf(startMark);
  const ei = text.indexOf(endMark);
  if (si === -1 || ei === -1) return null;
  return text.slice(0, si) + replacement + text.slice(ei + endMark.length);
}

for (const filePath of FILES) {
  let src;
  try { src = readFileSync(filePath, 'utf8'); } catch(e) { console.error('Read failed:', filePath); continue; }

  let out = src;
  out = replaceBetween(out, HTML_START, HTML_END, NEW_HTML);
  if (!out) { console.error('HTML replace failed in', filePath); continue; }
  out = replaceBetween(out, SCRIPT_START, SCRIPT_END, NEW_SCRIPT);
  if (!out) { console.error('Script replace failed in', filePath); continue; }

  writeFileSync(filePath, out, 'utf8');
  console.log('Done:', filePath);
}

// Verify
for (const filePath of FILES) {
  try {
    const v = readFileSync(filePath, 'utf8');
    const ok = v.includes('_computePillarsViaEngine') && v.includes('KasiEngine') && v.includes('원하는 인물의 생년월일로') && v.includes('height:180px');
    console.log('Verify', ok ? 'OK' : 'FAIL', filePath.split('\\').pop());
  } catch(e) { console.error('Verify read failed'); }
}
