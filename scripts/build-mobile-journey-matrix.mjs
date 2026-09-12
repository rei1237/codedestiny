import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
// 재생성 가능한 산출물이라 루트가 아니라 `reports/`(gitignore 대상)에 쓴다.
const output = path.join(root, "reports", "MOBILE_JOURNEY_MATRIX.md");

const serviceSections = read("app/_lib/serviceSections.js");
const registry = read("MOBILE_FEATURE_REGISTRY.md");

const routes = [...new Set([...serviceSections.matchAll(/href:\s*"([^"#?]+)(?:[?#][^"]*)?"/g)]
  .map((match) => match[1].replace(/\/+$/, "") || "/")
  .filter((route) => route.startsWith("/")))]
  .sort((a, b) => a.localeCompare(b, "ko"));

const registryRows = registry
  .split(/\r?\n/)
  .filter((line) => line.startsWith("|") && !line.includes("---") && !line.includes("기능명 |"))
  .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
  .filter((cells) => cells.length >= 3);

const lines = [
  "# 모바일 사용자 여정 매트릭스",
  "",
  "`npm run mobile:journey-matrix`로 생성합니다. ✅ 표시는 자동 또는 실제 기기 검증 증빙이 있는 항목만 허용하며, 이 문서는 기능 제공 여부나 결제 정책의 정본이 아닙니다.",
  "",
  `- 서비스 진입 라우트: ${routes.length}`,
  `- 기능 레지스트리 행: ${registryRows.length}`,
  "- 자동 기준선: 정적 홈 진입·하단 탭바·Safe Area·lazy opener 검증",
  "",
  "## 서비스 진입 라우트",
  "",
  "| Route | Back | Touch | Scroll | Loading/Error | Form/Result | Mobile evidence |",
  "|---|---|---|---|---|---|---|",
  ...routes.map((route) => `| \`${route}\` | 미검증 | 미검증 | 미검증 | 미검증 | 미검증 | 인벤토리 추출 |`),
  "",
  "## 기능 레지스트리",
  "",
  "| 기능 | 진입 위치 | 표면 | 여정 상태 |",
  "|---|---|---|---|",
  ...registryRows.map(([name, entry, surface]) => `| ${name} | ${entry} | ${surface} | 미검증 |`),
  "",
  "## 완료 기록 규칙",
  "",
  "- Browser back, 앱 내부 back, modal 닫기, 재진입을 같은 흐름에서 확인한다.",
  "- 결제·로그인·AI 생성은 mock만 사용하고, 실제 과금·운영 DB·실 LLM 호출은 기록하지 않는다.",
  "- iOS Safari, Android Chrome, 설치형 PWA의 실제 기기 확인은 명령 결과와 분리해 날짜·기기·브라우저를 남긴다.",
];

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${lines.join("\n")}\n`, "utf8");
console.log(`Mobile journey matrix written: ${path.relative(root, output)}`);
console.log(`- Service routes: ${routes.length}`);
console.log(`- Registry rows: ${registryRows.length}`);
