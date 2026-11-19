/**
 * dist/.well-known/apple-app-site-association 을 쓴다(웹 Pages 빌드의 postbuild 단계).
 *
 * - Team ID 가 비어 있으면 아무것도 쓰지 않는다. 지금(2026-11-19)은 Apple Developer 등록 전이라 항상 이 경로다.
 * - 앱 번들(NEXT_PUBLIC_RUNTIME_TARGET=mobile-app)에는 쓰지 않는다. 웹 도메인이 내는 파일이다.
 * - 응답 Content-Type 은 _headers 의 `/.well-known/apple-app-site-association` 규칙이 application/json 으로 정한다.
 *   파일에 확장자가 없어 규칙이 없으면 application/octet-stream 으로 나간다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildAppleAppSiteAssociation } from "../lib/app-links/apple-app-site-association.mjs";

const TAG = "[apple-app-site-association]";

if (String(process.env.NEXT_PUBLIC_RUNTIME_TARGET || "").trim() === "mobile-app") {
  console.log(`${TAG} 앱 번들 빌드라 건너뜀.`);
} else {
  const aasa = buildAppleAppSiteAssociation();
  if (!aasa) {
    console.log(`${TAG} APPLE_TEAM_ID 가 비어 있어 파일을 만들지 않음(lib/app-links/apple-app-site-association.mjs).`);
  } else {
    const target = resolve("dist", ".well-known", "apple-app-site-association");
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(aasa, null, 2)}\n`, "utf8");
    console.log(`${TAG} ${target} 작성(appID ${aasa.applinks.details[0].appIDs[0]}).`);
  }
}
