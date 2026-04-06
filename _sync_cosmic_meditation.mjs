// Update all locale index.html files with cosmic soul meditation tile + metadata
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = 'c:/Users/Neo/Desktop/Code Destiny Main/public';
const LOCALES = ['en-us','ja-jp','de-de','es-es','fr-fr','hi-in','ms-my','nl-nl'];

const OLD_TILE_BLOCK = `            <a class="tarot-tile tarot-tile--meditation" href="/yoga-guru.html" data-action="openYogaGuru" data-coin-cost="30" aria-label="인도 명상 요가 코스 시작하기">
              <div class="tarot-tile__img-wrap" data-img-src="/fuctionassets/india.webp" data-img-alt="Divya Yoga - 인도 감성 맞춤 요가 코스">
                <img class="tarot-tile__img" loading="lazy" decoding="async" width="200" height="150" src="/fuctionassets/india.webp" alt="Divya Yoga - 인도 감성 맞춤 요가 코스">
                <span class="tarot-tile__badge tarot-tile__badge--healing">YOGA GURU</span>
                <span class="tarot-tile__coin-badge">1회 30코인</span>
              </div>
              <div class="tarot-tile__body">
                <span class="tarot-tile__title">&#x1FAB7; Divya Yoga</span>
                <span class="tarot-tile__desc">맞춤 명상 요가 루틴</span>
              </div>
            </a>
          </div>
        </div><!-- /meditation-collection -->`;

const NEW_TILE_BLOCK = `            <a class="tarot-tile tarot-tile--meditation" href="/yoga-guru.html" data-action="openYogaGuru" data-coin-cost="30" aria-label="인도 명상 요가 코스 시작하기">
              <div class="tarot-tile__img-wrap" data-img-src="/fuctionassets/india.webp" data-img-alt="Divya Yoga - 인도 감성 맞춤 요가 코스">
                <img class="tarot-tile__img" loading="lazy" decoding="async" width="200" height="150" src="/fuctionassets/india.webp" alt="Divya Yoga - 인도 감성 맞춤 요가 코스">
                <span class="tarot-tile__badge tarot-tile__badge--healing">YOGA GURU</span>
                <span class="tarot-tile__coin-badge">1회 30코인</span>
              </div>
              <div class="tarot-tile__body">
                <span class="tarot-tile__title">&#x1FAB7; Divya Yoga</span>
                <span class="tarot-tile__desc">맞춤 명상 요가 루틴</span>
              </div>
            </a>

            <!-- [기능 연결부] R=VD 코스믹 소울 명상 → /cosmic-soul-meditation.html -->
            <a class="tarot-tile tarot-tile--meditation" href="/cosmic-soul-meditation.html" data-action="openCosmicSoulMeditation" data-fallback-href="/cosmic-soul-meditation.html" data-coin-cost="200" aria-label="R=VD 코스믹 소울 명상 시작하기">
              <div class="tarot-tile__img-wrap" data-img-src="/fuctionassets/r=vd.webp" data-img-alt="R=VD 코스믹 소울 명상 — 현실 렌더링 프로토콜">
                <img class="tarot-tile__img" loading="lazy" decoding="async" width="200" height="150" src="/fuctionassets/r=vd.webp" alt="R=VD 코스믹 소울 명상 — 현실 렌더링 프로토콜">
                <span class="tarot-tile__badge tarot-tile__badge--healing">R=VD</span>
                <span class="tarot-tile__coin-badge">1회 200코인</span>
              </div>
              <div class="tarot-tile__body">
                <span class="tarot-tile__title">🌌 코스믹 소울 명상</span>
                <span class="tarot-tile__desc">현실 렌더링 30·60분 프로토콜</span>
              </div>
            </a>
          </div>
        </div><!-- /meditation-collection -->`;

const OLD_META = `    openNevilleMeditationPage:{cat:'네빌 명상 · 현실창조',title:'🧘 네빌 명상 실습',tagline:'이 명상을 3일 연속으로 하면 원하는 현실이 바뀌기 시작합니다 — 네빌 고다드의 검증된 기법',feats:['네빌 고다드가 실제 사용한 의식 명상 기법','원하는 것을 이미 가진 것처럼 느끼는 감각 훈련','부정적 신념 패턴을 즉시 해체하는 기법 적용','30분 완전 가이드 세션으로 처음도 쉽게'],cost:'🪙 30코인',ct:'paid',img:'/fuctionassets/meditation.webp'},`;

const NEW_META = `    openCosmicSoulMeditation:{cat:'R=VD · 코스믹 소울 명상',title:'🌌 코스믹 소울 명상',tagline:'세타파 동기화로 무의식 DB에 성공 코드를 배포 — R=VD 공식 기반 30·60분 현실 렌더링 프로토콜',feats:['세타파(4-7Hz) 동기화 → 무의식 커널 직접 편집','5단계 Vibe Coding 로직: Reset→Patch→Render→Anchor→Deploy','30분 효율 동기화 & 60분 심층 자아 해체 버전 선택','부의·명료화·사랑·건강 4가지 맞춤 의도 설정','연속 일수·세션 횟수·코스믹 저널 저장 기능 포함'],cost:'🪙 200코인',ct:'paid',img:'/fuctionassets/r=vd.webp'},
    openNevilleMeditationPage:{cat:'네빌 명상 · 현실창조',title:'🧘 네빌 명상 실습',tagline:'이 명상을 3일 연속으로 하면 원하는 현실이 바뀌기 시작합니다 — 네빌 고다드의 검증된 기법',feats:['네빌 고다드가 실제 사용한 의식 명상 기법','원하는 것을 이미 가진 것처럼 느끼는 감각 훈련','부정적 신념 패턴을 즉시 해체하는 기법 적용','30분 완전 가이드 세션으로 처음도 쉽게'],cost:'🪙 30코인',ct:'paid',img:'/fuctionassets/meditation.webp'},`;

let totalUpdated = 0;
for (const locale of LOCALES) {
  const path = join(ROOT, locale, 'index.html');
  try {
    let content = readFileSync(path, 'utf8');
    let changed = false;
    
    // Update tile block
    if (content.includes(OLD_TILE_BLOCK)) {
      content = content.replace(OLD_TILE_BLOCK, NEW_TILE_BLOCK);
      changed = true;
    } else {
      console.log(`[${locale}] WARN: tile block not found (may already updated or variant)`);
    }
    
    // Update metadata
    if (content.includes(OLD_META)) {
      content = content.replace(OLD_META, NEW_META);
      changed = true;
    } else {
      console.log(`[${locale}] WARN: meta block not found (may already updated or variant)`);
    }
    
    if (changed) {
      writeFileSync(path, content, 'utf8');
      totalUpdated++;
      console.log(`[${locale}] ✓ updated`);
    } else {
      console.log(`[${locale}] skipped (no changes found)`);
    }
  } catch(e) {
    console.error(`[${locale}] ERROR: ${e.message}`);
  }
}
console.log(`\nTotal locales updated: ${totalUpdated}`);
