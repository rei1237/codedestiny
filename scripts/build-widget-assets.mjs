#!/usr/bin/env node
// 홈 화면 위젯용 부적 그림을 만든다. 승인된 영냥이 부적 원본(catalog.json 의 sha256 로 확인)을
// 위젯 크기(세로 540px webp)로 줄여 Android drawable 과 웹 미리보기 두 곳에 같은 파일로 둔다.
// 위젯은 이 작은 그림 한 장만 읽으므로 앱 시작이나 위젯 갱신 때 큰 원본을 읽지 않는다.
// 사용: node scripts/build-widget-assets.mjs        (생성물은 커밋한다)
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TALISMANS = ["study", "wealth", "love", "contact", "success"];
const HEIGHT = 540;
const catalog = JSON.parse(await readFile(path.join(root, "public/assets/talismans/catalog.json"), "utf8"));
const drawableDir = path.join(root, "apps/mobile/android/app/src/main/res/drawable-nodpi");
const webDir = path.join(root, "public/assets/talismans/widget");
await mkdir(drawableDir, { recursive: true });
await mkdir(webDir, { recursive: true });

for (const id of TALISMANS) {
  const src = `/assets/talismans/originals/${id}-yeongnyangi-v2.png`;
  const entry = catalog.assets.find(asset => asset.src === src && asset.approval === "approved");
  if (!entry) throw new Error(`승인 목록에 없는 원본: ${src}`);
  const original = await readFile(path.join(root, "public", src));
  const sha = createHash("sha256").update(original).digest("hex");
  if (sha !== entry.sha256) throw new Error(`원본 해시 불일치: ${src}`);
  const webp = await sharp(original).resize({ height: HEIGHT }).webp({ quality: 82, effort: 6 }).toBuffer();
  await writeFile(path.join(drawableDir, `widget_talisman_${id}.webp`), webp);
  await writeFile(path.join(webDir, `${id}.webp`), webp);
  console.log(`${id}: ${(webp.length / 1024).toFixed(1)} KB`);
}
