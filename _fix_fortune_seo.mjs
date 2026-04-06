/**
 * fortune 정적 HTML 파일에 두 가지 SEO 수정 적용:
 * 1. <meta name="robots" content="index, follow"> 추가 (없는 경우)
 * 2. canonical URL에서 .html 확장자 제거 (sitemap URL과 일치)
 * 
 * 대상: public/fortune/**\/*.html (약 302개 파일)
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { readdirSync, statSync } from "fs";

const FORTUNE_DIR = "public/fortune";
const BASE_URL = "https://code-destiny.com";

function* walkHtml(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      yield* walkHtml(fullPath);
    } else if (entry.endsWith(".html")) {
      yield fullPath;
    }
  }
}

let fixed = 0;
let skipped = 0;

for (const filePath of walkHtml(FORTUNE_DIR)) {
  let html = readFileSync(filePath, "utf8");
  let changed = false;

  // 1. canonical URL에서 .html 제거
  // 예: https://code-destiny.com/fortune/today/rat.html → https://code-destiny.com/fortune/today/rat
  const canonicalFixed = html.replace(
    /(<link\s+rel="canonical"\s+href=")(https:\/\/code-destiny\.com\/[^"]+)\.html(")/g,
    (match, pre, url, post) => {
      changed = true;
      return `${pre}${url}${post}`;
    }
  );

  if (changed) html = canonicalFixed;

  // 2. <meta name="robots"> 태그 없으면 <title> 직전에 추가
  if (!/<meta\s+name="robots"/i.test(html)) {
    html = html.replace(
      /(<title>)/,
      '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">\n  $1'
    );
    changed = true;
  }

  if (changed) {
    writeFileSync(filePath, html, "utf8");
    fixed++;
  } else {
    skipped++;
  }
}

console.log(`완료: ${fixed}개 파일 수정, ${skipped}개 파일 변경 없음`);
