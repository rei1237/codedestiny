import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { parse } from "parse5";
import { FEATURE_KEY_PRICE_TABLE, UNLOCK_PRODUCT_BY_FEATURE_KEY, PAID_FEATURE_KEY_ALIASES } from "../worker/lib/paid-feature-registry.js";
const price = key => {
  const row = FEATURE_KEY_PRICE_TABLE[key] || UNLOCK_PRODUCT_BY_FEATURE_KEY[key]
    || FEATURE_KEY_PRICE_TABLE[PAID_FEATURE_KEY_ALIASES[key]] || UNLOCK_PRODUCT_BY_FEATURE_KEY[PAID_FEATURE_KEY_ALIASES[key]];
  return row ? Number(row.amountKRW ?? row.cost * 100) : null;
};
const won = value => value.toLocaleString("ko-KR") + "원";
let registry = readFileSync("js/core/service-registry.js", "utf8");
registry = registry.replace(/\{[^{}]*\bfeatureKey:\s*"[^"]+"[^{}]*\}/g, block => {
  const key = /\bfeatureKey:\s*"([^"]+)"/.exec(block)?.[1];
  const endKey = /featureKeyTo:\s*"([^"]+)"/.exec(block)?.[1];
  const start = price(key), end = price(endKey);
  if (!(start > 0) || !/price:\s*"[^"]*\d/.test(block)) return block;
  if (endKey && !(end > 0)) throw new Error(`Unknown range price: ${endKey}`);
  if (end === start) block = block.replace(/\s*featureKeyTo:\s*"[^"]+",/, "");
  return block.replace(/price:\s*"[^"]*"/, `price: "${won(start)}${endKey && end !== start ? "~" + won(end) : ""}"`);
});
writeFileSync("js/core/service-registry.js", registry);
const featureById = new Map([...registry.matchAll(/\{[^{}]*\bid:\s*"([^"]+)"[^{}]*\}/g)].map(match => [match[1], /\bfeatureKey:\s*"([^"]+)"/.exec(match[0])?.[1]]));
let html = readFileSync("index.html", "utf8");
const edits = [], dictionaryCopies = [];
const doc = parse(html, { sourceCodeLocationInfo: true });
function visit(node, amount = null) {
  const attrs = Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]));
  if (attrs["data-feature-key"]) amount = price(attrs["data-feature-key"]);
  else if (attrs["data-cd-service-id"]) amount = price(featureById.get(attrs["data-cd-service-id"]));
  if (amount > 0 && /tarot-tile__coin-badge|cd-sig-card__price|cd-quick-card__price/.test(attrs.class || "") && node.sourceCodeLocation?.startTag) {
    const loc = node.sourceCodeLocation;
    const content = html.slice(loc.startTag.endOffset, loc.endTag.startOffset);
    if (/\d[\d,]*\s*원/.test(content)) {
      const next = content.replace(/\d[\d,]*\s*원/g, won(amount));
      if (next !== content) {
        edits.push({ start: loc.startTag.endOffset, end: loc.endTag.startOffset, text: next });
        const attrName = attrs["data-key"] ? "data-key" : attrs["data-cd-trans"] ? "data-cd-trans" : null;
        const key = attrs[attrName];
        if (key) {
          const newKey = `${key}Price${amount}`;
          const a = loc.attrs[attrName];
          edits.push({ start: a.startOffset, end: a.endOffset, text: `${attrName}="${newKey}"` });
          dictionaryCopies.push({ key, newKey, amount, fallback: next });
        }
      }
    }
  }
  for (const child of node.childNodes || []) visit(child, amount);
}
visit(doc);
for (const edit of edits.sort((a,b) => b.start-a.start)) html = html.slice(0,edit.start)+edit.text+html.slice(edit.end);
writeFileSync("index.html", html);
for (const file of readdirSync("public/i18n").filter(f => f.endsWith(".json"))) {
  const path = `public/i18n/${file}`, data = JSON.parse(readFileSync(path,"utf8"));
  let changed = false;
  for (const copy of dictionaryCopies) {
    const keys = copy.key.split("."); let parent = data;
    for (const k of keys.slice(0,-1)) parent = parent?.[k];
    const old = parent?.[keys.at(-1)];
    if (typeof old !== "string") throw new Error(`Missing price translation ${file}:${copy.key}`);
    const separator = /\d([,.\s])\d{3}/.exec(old)?.[1] || ",";
    const translated = old.replace(/\d[\d,.\s]*\d/g, (copy.amount / 1000) + separator + "000");
    parent[copy.newKey.split(".").at(-1)] = file === "ko.json" ? copy.fallback : translated;
    changed = true;
  }
  if (changed) writeFileSync(path, JSON.stringify(data,null,2)+"\n");
}
console.log(`[flower-price-copy] ${edits.length} badge edits; registry derived from payment prices`);
