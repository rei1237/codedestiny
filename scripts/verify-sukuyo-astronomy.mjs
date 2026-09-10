#!/usr/bin/env node
/**
 * 숙요 공통 천문 코어 검증.
 * 로컬 ephemeris 파일만 제공하는 HTTP 서버를 잠시 열어 실제 Swiss WASM을 실행한다.
 * 외부 API·LLM·DB·결제는 사용하지 않는다.
 */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateSukuyoForMoment } from "../worker/lib/sukuyo-astronomy.js";
import { handleSukuyoRoutes } from "../worker/routes/sukuyo.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const epheRoot = path.join(root, "public", "js", "vendor", "sweph-wasm", "ephe");
const server = http.createServer(async (request, response) => {
  const fileName = path.basename(new URL(request.url, "http://127.0.0.1").pathname);
  try {
    const data = await fs.readFile(path.join(epheRoot, fileName));
    response.writeHead(200, { "content-type": "application/octet-stream" });
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end("not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const requestUrl = `http://127.0.0.1:${port}/api/sukuyo`;
try {
  const moments = Array.from({ length: 24 }, (_, hour) => ({
    year: 1991, month: 9, day: 2, hour, minute: 0, timezoneOffset: 9, birthTimeKnown: true,
  }));
  const rows = [];
  for (const moment of moments) {
    const result = await calculateSukuyoForMoment({}, moment, { requestUrl });
    rows.push({
      kst: `${moment.year}-${String(moment.month).padStart(2, "0")}-${String(moment.day).padStart(2, "0")} ${String(moment.hour).padStart(2, "0")}:00`,
      utc: result.utcIso,
      jd: result.julianDate,
      moonLongitude: result.moonEclipticLongitude,
      mansion: `${result.nameKo}(${result.nameHan})`,
      mansionIndex: result.mansionIdx,
    });
  }
  for (const row of rows) console.log(JSON.stringify(row));
  const transition = rows.find((row, index) => index > 0 && row.mansionIndex !== rows[index - 1].mansionIndex);
  if (!transition || rows[0].mansion !== "삼(參)" || transition.mansion !== "정(井)") {
    throw new Error("1991-09-02 KST의 일반 황경 경계 전환 검증에 실패했습니다.");
  }
  console.log(`PASS transition=${transition.kst} ${rows[indexOf(rows, transition) - 1]?.mansion} -> ${transition.mansion}`);

  const routeResponse = await handleSukuyoRoutes(new Request(`${requestUrl}/astronomy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      birthDate: "1991-09-02",
      birthTime: "18:00",
      calendarType: "solar",
      timezone: "Asia/Seoul",
      birthPlace: "서울",
      latitude: 37.5665,
      longitude: 126.978,
    }),
  }), {});
  const routePayload = await routeResponse.json();
  if (!routePayload.ok || routePayload.astronomy?.utcIso !== "1991-09-02T09:00:00.000Z" || routePayload.astronomy?.nameHan !== "井") {
    throw new Error("/api/sukuyo/astronomy 공개 경로가 공통 코어 결과를 반환하지 않았다.");
  }
  console.log("PASS public route=/api/sukuyo/astronomy shares UTC/JD/Moon longitude core");
} finally {
  server.close();
}

function indexOf(rows, target) {
  return rows.indexOf(target);
}
