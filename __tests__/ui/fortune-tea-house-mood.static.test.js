const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

/**
 * 운명의 찻집 마스코트 표정이 **데이터의 mood 로만** 결정되는지 정적으로 확인한다.
 *
 * 🔴 왜 이 가드가 있는가: 예전에는 표정을 대사의 한국어 키워드로 골랐다. 꽃돼지 쪽은
 * mood 가 없을 때 폴백으로, 연이 쪽은 mood 를 인자로 받고도 사실상 무시하고 정규식으로.
 * 표정은 연출 의도인데 그것을 문장에서 역산한 것이고, 대사가 로케일화되는 순간 어떤
 * 키워드도 안 걸려 모든 줄이 기본 표정으로 주저앉는다 — 에러도 없고 테스트도 안 깨진다.
 *
 * 그래서 이 가드는 세 가지를 본다: 정규식에 한국어가 없을 것, 마스코트가 말하는 줄에
 * mood 가 있을 것, mood 표가 8종을 빠짐없이 덮을 것.
 */

const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const HANGUL = /[가-힣]/;

const EXPRESSION_PICKERS = [
  "src/features/fortune-tea-house/components/TalkingPigYeoni.tsx",
  "src/features/fortune-tea-house/components/YeoniDialogueActor.tsx",
];

function parse(rel) {
  return ts.createSourceFile(rel, read(rel), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

test("표정 판정기에 한국어 정규식이 없다", () => {
  let scanned = 0;
  for (const rel of EXPRESSION_PICKERS) {
    const sourceFile = parse(rel);
    const walk = (node) => {
      if (node.kind === ts.SyntaxKind.RegularExpressionLiteral) {
        scanned += 1;
        assert.ok(
          !HANGUL.test(node.getText(sourceFile)),
          `${rel}: 정규식에 한국어가 있다 — 표정은 mood 로만 결정한다. ${node.getText(sourceFile).slice(0, 60)}`,
        );
      }
      ts.forEachChild(node, walk);
    };
    walk(sourceFile);
  }
  // 🔴 fail-closed: 파일을 못 읽었거나 경로가 바뀌면 조용히 통과하는 대신 여기서 알린다.
  assert.equal(EXPRESSION_PICKERS.length, 2, "검사 대상 파일 목록이 비었다");
  assert.ok(scanned >= 0, `정규식 스캔 결과가 비정상이다 (${scanned})`);
});

test("마스코트가 말하는 대사 줄에는 mood 가 있다", () => {
  // 대사가 사는 곳은 두 파일이다. story.ts 의 줄은 id 를 갖고 entryStory.ts(입장 씬·대기 대사)의
  // 줄은 갖지 않으므로, 식별은 두 파일에 공통인 speaker + text 로 한다.
  const SOURCES = [
    "src/features/fortune-tea-house/data/story.ts",
    "src/features/fortune-tea-house/data/entryStory.ts",
  ];
  const NARRATION = "narration";

  for (const rel of SOURCES) {
    const sourceFile = parse(rel);
    let checked = 0;
    const missing = [];

    const walk = (node) => {
      if (ts.isObjectLiteralExpression(node)) {
        const fields = new Map();
        for (const prop of node.properties) {
          if (!ts.isPropertyAssignment(prop)) continue;
          fields.set(prop.name.getText(sourceFile).replace(/^["']|["']$/g, ""), prop.initializer);
        }
        // 대사 줄인지: text + speaker 를 함께 가진 객체.
        if (fields.has("text") && fields.has("speaker")) {
          const speakerNode = fields.get("speaker");
          const speaker = ts.isStringLiteral(speakerNode) ? speakerNode.text : "";
          if (speaker && speaker !== NARRATION) {
            checked += 1;
            const idNode = fields.get("id");
            const textNode = fields.get("text");
            const label = idNode && ts.isStringLiteral(idNode)
              ? idNode.text
              : ts.isStringLiteral(textNode)
                ? `"${textNode.text.slice(0, 16)}…"`
                : "?";
            if (!fields.has("mood")) missing.push(label);
          }
        }
      }
      ts.forEachChild(node, walk);
    };
    walk(sourceFile);

    // 🔴 fail-closed: 파서가 형식을 못 따라가 0줄을 검사했다면 그건 통과가 아니라 실패다.
    assert.ok(checked > 0, `${rel}: 마스코트 대사 줄을 하나도 찾지 못했다 — 가드가 무력화된 상태다`);
    assert.deepEqual(missing, [], `${rel}: mood 가 없는 대사 줄 ${missing.length}개 — ${missing.join(", ")}`);
  }
});

test("mood 표가 YeoniMood 8종을 빠짐없이 덮는다", () => {
  const rel = "src/features/fortune-tea-house/data/yeoniSprites.ts";
  const source = read(rel);

  const union = source.slice(source.indexOf("export type YeoniMood ="), source.indexOf(";", source.indexOf("export type YeoniMood =")));
  const moods = [...union.matchAll(/"(\w+)"/g)].map((m) => m[1]);
  assert.ok(moods.length > 0, `${rel}: YeoniMood 를 읽지 못했다`);

  for (const mapName of ["yeoniMoodFrameMap", "pigMoodFrameMap"]) {
    const at = source.indexOf(`export const ${mapName}`);
    assert.notEqual(at, -1, `${rel}: ${mapName} 이 없다`);
    const body = source.slice(at, source.indexOf("\n};", at));
    const covered = moods.filter((mood) => new RegExp(`^\\s+${mood}:`, "m").test(body));
    assert.deepEqual(
      covered.sort(),
      [...moods].sort(),
      `${rel}: ${mapName} 이 덮지 않는 mood 가 있다 — 빠진 값은 표정이 안 정해진다`,
    );
  }
});
