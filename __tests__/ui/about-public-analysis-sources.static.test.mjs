import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../app/about/page.js", import.meta.url), "utf8");
const publicMirror = readFileSync(
  new URL("../../public/static/policies/about/index.html", import.meta.url),
  "utf8",
);

const publishedSources = [source, publicMirror];

test("about author section links the public Wheesung analysis and source index", () => {
  for (const publishedSource of publishedSources) {
    assert.match(publishedSource, /https:\/\/blog\.naver\.com\/neosaju\/223442610559/);
    assert.match(publishedSource, /https:\/\/blog\.naver\.com\/neosaju\/224032671570/);
    assert.match(publishedSource, /게시일과 당시 표현을 원문에서 직접 확인/);
  }
});

test("about author section does not present the self-curated index as an audited hit rate", () => {
  for (const publishedSource of publishedSources) {
    assert.match(publishedSource, /독립 기관이 산정한 적중률 자료는 아닙니다/);
    assert.match(publishedSource, /개별 사례가 모든 예측의 정확도나 앞으로의 적중을 보장하지는 않습니다/);
  }
});
