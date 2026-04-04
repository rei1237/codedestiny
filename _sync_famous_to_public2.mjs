import { readFileSync, writeFileSync } from 'fs';

const enc = 'utf8';
const src = String.raw`c:\Users\Neo\Desktop\Code Destiny Main\index.html`;
const dst = String.raw`c:\Users\Neo\Desktop\Code Destiny Main\public\index.html`;

const srcContent = readFileSync(src, enc);
let dstContent = readFileSync(dst, enc);

// ── 1. 유명인 사주 스크립트 블록 동기화 ──
const scriptStartMarker = '<!-- ═══ 유명인 사주 분석 패널 스크립트 ═══ -->';
const scriptEndMarker   = '<!-- ═══ 유명인 사주 분석 패널 스크립트 끝 ═══ -->';

const srcSS = srcContent.indexOf(scriptStartMarker);
const srcSE = srcContent.indexOf(scriptEndMarker);
if (srcSS < 0 || srcSE < 0) { console.error('src 스크립트 마커 없음'); process.exit(1); }
const srcScriptBlock = srcContent.slice(srcSS, srcSE + scriptEndMarker.length);

const dstSS = dstContent.indexOf(scriptStartMarker);
const dstSE = dstContent.indexOf(scriptEndMarker, dstSS + scriptStartMarker.length);
if (dstSS >= 0 && dstSE >= 0) {
  dstContent = dstContent.slice(0, dstSS) + srcScriptBlock + dstContent.slice(dstSE + scriptEndMarker.length);
  console.log(`스크립트 블록 동기화 완료. 길이=${srcScriptBlock.length}`);
} else {
  console.warn('dst 스크립트 마커 없음 — 스크립트 동기화 스킵');
}

// ── 2. fsp-grid 내부 정적 카드 제거 동기화 ──
// src에서 fsp-grid 열기 태그 끝 이후 내용 추출
const srcGridOpen = srcContent.indexOf('id="fsp-grid"');
const srcGridTagEnd = srcContent.indexOf('>', srcGridOpen) + 1;
const srcGridClose = srcContent.indexOf('</div><!-- /#fsp-grid -->', srcGridTagEnd);
const srcGridInner = srcContent.slice(srcGridTagEnd, srcGridClose);

const dstGridOpen  = dstContent.indexOf('id="fsp-grid"');
const dstGridTagEnd = dstContent.indexOf('>', dstGridOpen) + 1;
const dstGridClose  = dstContent.indexOf('</div><!-- /#fsp-grid -->', dstGridTagEnd);

if (dstGridOpen >= 0 && dstGridClose >= 0) {
  dstContent = dstContent.slice(0, dstGridTagEnd) + srcGridInner + dstContent.slice(dstGridClose);
  console.log('fsp-grid 내부 동기화 완료.');
} else {
  console.warn('dst fsp-grid 없음 — 그리드 동기화 스킵');
}

// ── 3. 필터 버튼 바 동기화 ──
const filterBarStart = 'class="fsp-filter-bar"';
const filterBarEndTag = '</div>\n\n        <!-- ⑤';
const srcFBStart = srcContent.indexOf(filterBarStart);
const srcFBEnd = srcContent.indexOf(filterBarEndTag, srcFBStart);
if (srcFBStart >= 0 && srcFBEnd >= 0) {
  const srcFB = srcContent.slice(srcFBStart, srcFBEnd + filterBarEndTag.length);
  const dstFBStart = dstContent.indexOf(filterBarStart);
  const dstFBEnd = dstContent.indexOf(filterBarEndTag, dstFBStart);
  if (dstFBStart >= 0 && dstFBEnd >= 0) {
    dstContent = dstContent.slice(0, dstFBStart) + srcFB + dstContent.slice(dstFBEnd + filterBarEndTag.length);
    console.log('필터 버튼 바 동기화 완료.');
  } else {
    console.warn('dst 필터 버튼 바 없음 — 스킵');
  }
}

writeFileSync(dst, dstContent, enc);
console.log('public/index.html 동기화 완료!');
