/**
 * 다마고치 운명의 알 타일을 동물 & 관상 컬렉션 그리드에 추가
 * - 사주 가디언 아트 버튼 블록(</button> 다음 빈 줄) 바로 앞에 삽입
 * - UNSETAMA2.webp 이미지 사용
 * - public/index.html, 루트 index.html, 모든 로케일 index.html 일괄 처리
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TILE_HTML = `
                <!-- 다마고치 운명의 알 -->
                <button class="tarot-tile tarot-tile--destiny-egg" type="button"
                        data-action="openDestinyEggPage"
                        data-fallback-href="/destiny-egg"
                        aria-label="다마고치 운명의 알 시작">
                  <div class="tarot-tile__img-wrap" data-img-src="/fuctionassets/UNSETAMA2.webp" data-img-alt="다마고치 운명의 알 — 나만의 사주 캐릭터 키우기">
                    <div class="tarot-tile__img-placeholder" aria-hidden="true"><span class="tile-ph-gem">🥚</span></div>
                    <span class="tarot-tile__badge tarot-tile__badge--new">NEW</span>
                    <span class="tarot-tile__coin-badge tarot-tile__coin-badge--free">무료</span>
                  </div>
                  <div class="tarot-tile__body">
                    <span class="tarot-tile__title">🥚 운명의 알</span>
                    <span class="tarot-tile__desc">나만의 운세 다마고치</span>
                  </div>
                </button>
`;

// 삽입 앵커: 사주 가디언 아트 버튼 블록 끝 + 바로 뒤 빈 줄
const ANCHOR = `              </div><!-- /feat-collection__grid -->
            </div><!-- /feat-collection--animal -->`;

const ANCHOR_WITH_TILE = TILE_HTML + `              </div><!-- /feat-collection__grid -->
            </div><!-- /feat-collection--animal -->`;

// preview 데이터 삽입 (public/index.html, 루트 index.html 전용)
const PREVIEW_ANCHOR = `    openSajuAnimalPage:{cat:'사주 · 수호 동물 아트'`;
const PREVIEW_NEW_ENTRY = `    openDestinyEggPage:{cat:'다마고치 · 운명의 알',title:'🥚 운명의 알',tagline:'내 사주에서 나온 수호 동물이 알에서 깨어납니다 — 매일 돌봐주면 특별한 운세 메시지를 전해드려요',feats:['사주 기반 나만의 고유 수호 캐릭터 생성','매일 체크인하면 행운 메시지 & 아이템','5가지 테마(벚꽃/마카롱/딸기/우주/검은별)','완전 무료 지금 바로 알 부화 가능'],cost:'✨ 무료',ct:'free',img:'/fuctionassets/UNSETAMA2.webp'},
    openSajuAnimalPage:{cat:'사주 · 수호 동물 아트'`;

function patchFile(filePath, includePreview) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    console.log(`  SKIP (read error): ${filePath}`);
    return false;
  }

  if (content.includes('tarot-tile--destiny-egg')) {
    console.log(`  ALREADY PATCHED: ${filePath}`);
    return false;
  }

  if (!content.includes(ANCHOR)) {
    console.log(`  ANCHOR NOT FOUND: ${filePath}`);
    return false;
  }

  let updated = content.replace(ANCHOR, ANCHOR_WITH_TILE);

  if (includePreview && updated.includes(PREVIEW_ANCHOR) && !updated.includes('openDestinyEggPage')) {
    updated = updated.replace(PREVIEW_ANCHOR, PREVIEW_NEW_ENTRY);
  }

  writeFileSync(filePath, updated, 'utf8');
  console.log(`  PATCHED: ${filePath}`);
  return true;
}

// 대상 파일 목록
const targets = [
  join(__dirname, 'index.html'),
  join(__dirname, 'public', 'index.html'),
];

// public 하위 로케일 폴더들
const publicDir = join(__dirname, 'public');
try {
  const entries = readdirSync(publicDir);
  for (const entry of entries) {
    const candidate = join(publicDir, entry, 'index.html');
    try {
      statSync(candidate);
      targets.push(candidate);
    } catch { /* ignore */ }
  }
} catch { /* ignore */ }

let patchedCount = 0;
for (const t of targets) {
  const hasPreview = t.endsWith('public\\index.html') || t.endsWith('public/index.html') || t === join(__dirname, 'index.html');
  if (patchFile(t, hasPreview)) patchedCount++;
}

console.log(`\n완료: ${patchedCount}개 파일 패치됨`);
