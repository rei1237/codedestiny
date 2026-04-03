// 온라인 명리 전략 리포트 + 심층 리포트 잠금 해제 섹션 제거
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const base = 'c:/Users/Neo/Desktop/Code Destiny Main';

// 로케일 public 파일들 + root public/index.html
const localeFiles = [
  'public/index.html',
  'public/de-de/index.html',
  'public/en-us/index.html',
  'public/es-es/index.html',
  'public/fr-fr/index.html',
  'public/hi-in/index.html',
  'public/ja-jp/index.html',
  'public/ms-my/index.html',
  'public/nl-nl/index.html',
  'public/static/index.html',
  'public/zh-cn/index.html',
];

// 쌈바 프로모션 박스 전체 블록을 regex로 제거
// <!-- 쌈바 프로모션 박스 --> ... </aside> 까지
const promoBoxPattern = /\s*<!-- 쌈바 프로모션 박스 -->\s*<aside class="neo-promo-box"[\s\S]*?<!-- 하단 상담 신청 띠 -->\s*<\/aside>/g;

let totalChanged = 0;
for (const relPath of localeFiles) {
  const filePath = join(base, relPath);
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch (e) {
    console.log(`SKIP (not found): ${relPath}`);
    continue;
  }
  if (!promoBoxPattern.test(content)) {
    promoBoxPattern.lastIndex = 0;
    console.log(`SKIP (no match): ${relPath}`);
    continue;
  }
  promoBoxPattern.lastIndex = 0;
  const updated = content.replace(promoBoxPattern, '');
  writeFileSync(filePath, updated, 'utf8');
  console.log(`OK: ${relPath}`);
  totalChanged++;
}

// root index.html: golden-unlock-area (standalone div)
const rootFile = join(base, 'index.html');
let rootContent = readFileSync(rootFile, 'utf8');
const rootPattern = /\s*<!-- 심층 리포트 잠금 해제 -->\s*<div class="golden-unlock-area"[\s\S]*?<\/div>\s*<\/div>/;
const rootMatch = rootPattern.exec(rootContent);
if (rootMatch) {
  // We need to make sure we only remove up to the correct closing </div> of golden-unlock-area
  // The structure is: <div class="golden-unlock-area">...<div class="golden-unlock-list">...</div></div>
  // Let's use a more precise pattern
  const precisePattern = /[ \t]*<!-- 심층 리포트 잠금 해제 -->\n[ \t]*<div class="golden-unlock-area"[^>]*>[\s\S]*?<\/div>\s*\n[ \t]*<\/div>/;
  const match2 = precisePattern.exec(rootContent);
  if (match2) {
    // Check that this is the right closing div (for golden-unlock-area, not an outer div)
    // The golden-unlock-area block ends with </div> (golden-unlock-list) then </div> (golden-unlock-area)
    // Let's count divs to be safe - use a manual approach
    const start = rootContent.indexOf('      <!-- 심층 리포트 잠금 해제 -->');
    if (start !== -1) {
      const end = rootContent.indexOf('      </div>\n\n    </div>', start);
      if (end !== -1) {
        // Remove from start to end of </div> line
        const removeEnd = end + '      </div>'.length;
        rootContent = rootContent.slice(0, start) + rootContent.slice(removeEnd);
        writeFileSync(rootFile, rootContent, 'utf8');
        console.log(`OK: index.html (golden-unlock-area)`);
        totalChanged++;
      } else {
        console.log('WARN: root index.html - could not find end marker');
      }
    } else {
      console.log('WARN: root index.html - could not find start marker');
    }
  } else {
    // Fallback: simple approach
    const start = rootContent.indexOf('      <!-- 심층 리포트 잠금 해제 -->');
    if (start !== -1) {
      // Find the </div> that closes golden-unlock-area
      // After the comment: <div class="golden-unlock-area">...<div class="golden-unlock-list">...</div>\n      </div>
      const areaOpen = rootContent.indexOf('<div class="golden-unlock-area"', start);
      if (areaOpen !== -1) {
        let depth = 0;
        let i = areaOpen;
        while (i < rootContent.length) {
          if (rootContent[i] === '<') {
            if (rootContent.startsWith('<div', i)) depth++;
            else if (rootContent.startsWith('</div>', i)) {
              depth--;
              if (depth === 0) {
                const closeEnd = i + 6; // </div>
                rootContent = rootContent.slice(0, start) + rootContent.slice(closeEnd);
                writeFileSync(rootFile, rootContent, 'utf8');
                console.log(`OK: index.html (golden-unlock-area fallback)`);
                totalChanged++;
                break;
              }
            }
          }
          i++;
        }
      }
    }
  }
} else {
  console.log('INFO: root index.html - no standalone golden-unlock-area found or already removed');
}

console.log(`\n총 ${totalChanged}개 파일 수정 완료.`);
