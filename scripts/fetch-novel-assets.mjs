#!/usr/bin/env node
/**
 * fetch-novel-assets.mjs
 * ------------------------------------------------------------------
 * 로컬 개발 환경 전용 에셋 미러.
 *
 * 배경: assets.code-destiny.com(및 music.code-destiny.com)은 Cloudflare
 * 핫링크 보호가 걸려 있어, Referer 가 code-destiny.com 이 아니면 403 을 준다.
 * 그래서 프로덕션(code-destiny.com 오리진)에서는 이미지·BGM 이 정상 로드되지만,
 * 로컬(localhost) 브라우저에서 열면 localhost Referer 때문에 403 → 안 보인다.
 *
 * 이 스크립트는 Node fetch(무 Referer → 200/206 통과)로 노벨 페이지가 쓰는
 * R2 에셋을 public/codedestinyassets/ 로 내려받아, 로컬에서 동일 출처로
 * 서빙되게 한다. codedestiny-novel.html 은 호스트가 code-destiny.com 이 아니면
 * 이 로컬 경로를 사용한다(프로덕션은 그대로 R2 직접 참조).
 *
 * - public/codedestinyassets/ 는 .gitignore 대상(레포 비대화 방지, 로컬 캐시).
 * - 이미 받은 파일은 스킵(재실행 안전).
 *
 * 사용: npm run novel:assets   (또는 node scripts/fetch-novel-assets.mjs)
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "codedestinyassets");
const ASSETS = "https://assets.code-destiny.com";
const MUSIC = "https://music.code-destiny.com";
const enc = (p) => p.split("/").map(encodeURIComponent).join("/");

const items = [];
const push = (remote, rel) => items.push([remote, rel]);

// 연이(사람) 표정 스프라이트 12
[
  "반신상 기본", "반신상 좌측", "반신상 우측",
  "옆모습 왼쪽 이동시 사용", "옆모습 오른쪽 이동시 사용",
  "두려움", "화남", "웃음", "자는 모습", "우는 모습", "삼각김밥", "실망한 모습",
].forEach((n) => push(`${ASSETS}/CodeDestinyNovel/${enc(n + "-Photoroom.png")}`, `CodeDestinyNovel/${n}-Photoroom.png`));

// 배경 (background/) — 비겁 8 + 식상의 섬 12(불규칙 파일명: 낮 식상의 섬/식상의섬2~5, 밤 식상의 섬밤/식상의 섬a/식상의섬b~d, 식상의 섬 위기/식상의 섬 전투)
[
  "운세대 캠퍼스", "운세대 캠퍼스 벤치", "연이의 방", "연이의 방 밤", "타로 문 카드",
  "사주의 강", "비겁의 섬", "비겁의 섬 내부", "검은 손들",
  "식상의 섬", "식상의섬2", "식상의섬3", "식상의섬4", "식상의섬5",
  "식상의 섬밤", "식상의 섬a", "식상의섬b", "식상의섬c", "식상의섬d",
  "식상의 섬 위기", "식상의 섬 전투",
].forEach((n) => push(`${ASSETS}/CodeDestinyNovel/background/${enc(n + ".webp")}`, `CodeDestinyNovel/background/${n}.webp`));

// 식상의 섬 캐릭터 — 모카(동료) 6 + 까마귀 빌런 2 (raw .png)
[
  "모카 기본", "모카 감동", "모카 화남", "모카1", "모카2", "모카3",
  "까마귀 빌런1", "까마귀 빌런2",
].forEach((n) => push(`${ASSETS}/CodeDestinyNovel/${enc(n + ".png")}`, `CodeDestinyNovel/${n}.png`));

// 완결부(EP.15~40) 캐릭터 — 루나 자매·청토끼·백문·서한비·무성 본모습 (webp)
// 🔴 서한비의 파일명은 R2 실물이라 개명 전 「박지은」을 그대로 쓴다. 바꾸면 전 컷 404.
[
  "루나-Photoroom", "루나 언니-Photoroom",
  "루나 언니 회복1-Photoroom", "루나 언니 회복2-Photoroom", "루나 언니 회복3-Photoroom", "루나 언니 회복4-Photoroom", "루나 언니 회복5-Photoroom", "루나 언니 회복6-Photoroom",
  "빌런 청토끼-Photoroom",
  "백문 기본-Photoroom", "백문 도서관-Photoroom", "백문 도서관2-Photoroom", "백문 도서관4-Photoroom", "백문 도서관5-Photoroom", "백문 독서-Photoroom", "백문 마법-Photoroom",
  "박지은 기본", "박지은 무표정", "박지은 말함", "박지은 말함2", "박지은 냉소", "박지은 조롱", "박지은 유혹", "박지은 화남", "박지은 광기",
  "무성1", "무성2", "무성3", "무성4", "무성5", "무성6", "무성7", "무성8", "무성9", "무성10",
  // 결말 확장(EP.39~40) 배경 — 네오 구속 2종·운명의 신 선택(타로 속 연이)
  "갇힌 네오2", "갇힌 네오3", "타로 카드들 속의 연이",
].forEach((n) => push(`${ASSETS}/CodeDestinyNovel/${enc(n + ".webp")}`, `CodeDestinyNovel/${n}.webp`));

// 완결부 배경 — 재성의 섬 4 + 도서관 2 + 자미두수 4 + 숙요 1 + 연출 3 + 비겁 내부 회상 6
[
  "재성의 섬", "재성의 섬 진입", "재성의 섬 진입2", "재성의 섬 노동하는 노예들",
  "신비의 도서관", "신비의 도서관2",
  "자미두수 세계1", "자미두수 세계2", "자미두수 세계3", "자미두수 세계4",
  "숙요점 붉은 실의 세계",
  "문에 빨려들어가는 모습", "빨려 들어가는 연이", "검은 손들 박진감",
  "비겁의섬내부1", "비겁의섬내부2", "비겁의섬내부3", "비겁의섬내부4", "비겁의섬내부5", "비겁의섬내부6",
].forEach((n) => push(`${ASSETS}/CodeDestinyNovel/background/${enc(n + ".webp")}`, `CodeDestinyNovel/background/${n}.webp`));

// BGM (씬별 + 사주의 강 진입 + 완결부)
[
  "연이의 일상", "연이의 방", "연이의 우울감", "연이의 우울감2",
  "연이 위기 상황", "연이 위기 상황2", "연이와 네오", "연이와 네오2",
  "사주의 강 진입", "사주의 강 진입2", "식상의 섬 진입",
  "재성의 섬 진입", "강을 건너는 두 사람",
].forEach((n) => push(`${ASSETS}/CodeDestinyNovel/${enc(n + ".mp3")}`, `CodeDestinyNovel/${n}.mp3`));

// DestinyCafe (꽃돼지·타로카드)
["꽃돼지.webp", "꽃돼지2.webp", "꽃돼지3.webp", "말하는 꽃돼지 연이3.webp", "연이 타로 카드.webp"]
  .forEach((n) => push(`${ASSETS}/DestinyCafe/${enc(n)}`, `DestinyCafe/${n}`));

// DestinyCafe/nobackground (투명 컷 — 마스코트/인스토리 꽃돼지 + 변신 시퀀스 + 타로 카드 + 가짜 연이 시트 + 꽃돼지 표정/포즈 시트)
["꽃돼지-Photoroom.webp", "꽃돼지2-Photoroom.webp", "꽃돼지 연이 변신-Photoroom.webp", "연이 타로 카드-Photoroom.webp", "연이 스프라이트1-Photoroom.webp", "말하는 꽃돼지 연이2-Photoroom.webp", "꽃돼지5-Photoroom.webp"]
  .forEach((n) => push(`${ASSETS}/DestinyCafe/nobackground/${enc(n)}`, `DestinyCafe/nobackground/${n}`));

// DestinyWar (네오=흰 사자 4×4 표정시트·무성·인간 네오 박병하)
["전략실 네오 메인-Photoroom.webp", "전략실 네오-Photoroom.webp", "검은 그림자-Photoroom.webp",
  "네오 스프라이트 배경없음4-Photoroom.webp", "네오 반신상 배경없음-Photoroom.webp"]
  .forEach((n) => push(`${ASSETS}/DestinyWar/${enc(n)}`, `DestinyWar/${n}`));

// 음악(music 호스트): 메인 화면 + 사주의 강 진입 폴백
push(`${MUSIC}/DestinyWar/${enc("Moonlit Strategy Map.mp3")}`, "music/DestinyWar/Moonlit Strategy Map.mp3");
push(`${MUSIC}/Meditation/${enc("Still Lake Mind.mp3")}`, "music/Meditation/Still Lake Mind.mp3");

// DEST1NOVA 공연곡(식상의 섬 노바 스테이지) — 1집 루트 2 + 2집 하위폴더 3
["오행 FLEX.mp3", "운세 soda pop.mp3"]
  .forEach((n) => push(`${MUSIC}/DEST1NOVA/${enc(n)}`, `music/DEST1NOVA/${n}`));
["LUCKY RUSH_Title.mp3", "Fate Rider.mp3", "불꽃의 운명.mp3"]
  .forEach((n) => push(`${MUSIC}/DEST1NOVA/${enc("DEST1NOVA 2집/" + n)}`, `music/DEST1NOVA/DEST1NOVA 2집/${n}`));

// LunaBloom(귀인 NPC 테마) — 플레이어 TRK 의 lunaGuest 가 가리키는 유일한 곳
push(`${MUSIC}/lunabloom/${enc("귀인 NPC Key.mp3")}`, "music/lunabloom/귀인 NPC Key.mp3");

const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

let ok = 0, skip = 0, fail = 0;
console.log(`노벨 에셋 미러 → ${ROOT}\n`);
for (const [url, rel] of items) {
  const dest = join(ROOT, rel);
  if (await exists(dest)) { skip++; continue; }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, buf);
    console.log(`  ✓ ${rel}  (${(buf.length / 1024).toFixed(0)}KB)`);
    ok++;
  } catch (e) {
    console.error(`  ✗ ${rel}  ${e?.message || e}`);
    fail++;
  }
}
console.log(`\n완료 — 신규 ${ok} · 스킵(기존) ${skip} · 실패 ${fail}`);
if (fail) process.exitCode = 1;
