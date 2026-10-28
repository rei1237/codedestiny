import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { parse } from "parse5";
import { getBillingFeaturePricing } from "../worker/lib/billing-feature-registry.js";
import { FEATURE_KEY_PRICE_TABLE, UNLOCK_PRODUCT_BY_FEATURE_KEY, PAID_FEATURE_KEY_ALIASES } from "../worker/lib/paid-feature-registry.js";
const pricing = key => FEATURE_KEY_PRICE_TABLE[key] || UNLOCK_PRODUCT_BY_FEATURE_KEY[key]
  || FEATURE_KEY_PRICE_TABLE[PAID_FEATURE_KEY_ALIASES[key]] || UNLOCK_PRODUCT_BY_FEATURE_KEY[PAID_FEATURE_KEY_ALIASES[key]];
const price = key => {
  const row = pricing(key);
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
  return block.replace(/(price:\s*")([^"]*)(")/, (_, before, copy, after) =>
    before + copy.replace(/\d[\d,]*원(?:~\d[\d,]*원)?/, `${won(start)}${endKey && end !== start ? "~" + won(end) : ""}`) + after);
});
writeFileSync("js/core/service-registry.js", registry);
const featureById = new Map([...registry.matchAll(/\{[^{}]*\bid:\s*"([^"]+)"[^{}]*\}/g)].map(match => [match[1], /\bfeatureKey:\s*"([^"]+)"/.exec(match[0])?.[1]]));
let html = readFileSync("index.html", "utf8");
const edits = [], dictionaryCopies = [];
const doc = parse(html, { sourceCodeLocationInfo: true });
function visit(node, amount = null) {
  const attrs = Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]));
  if (attrs["data-cd-price-key"]) amount = getBillingFeaturePricing({featureKey:attrs["data-cd-price-key"], reason:attrs["data-cd-price-reason"]}).pricing?.amountKRW;
  else if (attrs["data-feature-key"]) amount = price(attrs["data-feature-key"]);
  else if (attrs["data-cd-service-id"]) amount = price(featureById.get(attrs["data-cd-service-id"]));
  const row = pricing(attrs["data-feature-key"]);
  if (attrs["data-cd-price-key"] && /tarot-tile__coin-badge/.test(attrs.class || "")) {
    if (!(amount > 0)) throw new Error(`Unknown discovery price: ${attrs["data-cd-price-key"]}`);
    const loc = node.sourceCodeLocation;
    const seed = loc.attrs["data-price-krw"];
    if (seed) {
      if (Number(attrs["data-price-krw"]) !== amount) edits.push({start:seed.startOffset,end:seed.endOffset,text:`data-price-krw="${amount}"`});
    } else edits.push({start:loc.startTag.endOffset-1,end:loc.startTag.endOffset-1,text:` data-price-krw="${amount}"`});
    if (attrs["data-cd-price-key-to"]) {
      const end = getBillingFeaturePricing({featureKey:attrs["data-cd-price-key-to"], reason:attrs["data-cd-price-reason-to"]}).pricing?.amountKRW;
      if (!(end > 0)) throw new Error(`Unknown discovery range: ${attrs["data-cd-price-key-to"]}`);
      const endSeed = loc.attrs["data-price-krw-to"];
      if (endSeed) {
        if (Number(attrs["data-price-krw-to"]) !== end) edits.push({start:endSeed.startOffset,end:endSeed.endOffset,text:`data-price-krw-to="${end}"`});
      } else edits.push({start:loc.startTag.endOffset-1,end:loc.startTag.endOffset-1,text:` data-price-krw-to="${end}"`});
    }
  }
  if (row && node.sourceCodeLocation?.attrs) {
    for (const [name,value] of [["data-coin-cost",row.cost],["data-tile-lock-cost",row.cost],["data-price-krw",amount]]) {
      const loc = node.sourceCodeLocation.attrs[name];
      if (loc && Number(attrs[name]) !== Number(value)) edits.push({start:loc.startOffset,end:loc.endOffset,text:`${name}="${value}"`});
    }
  }
  if (amount > 0 && /tarot-tile__coin-badge|cd-sig-card__price|cd-quick-card__price|cd-concern__q-price/.test(attrs.class || "") && node.sourceCodeLocation?.startTag) {
    const loc = node.sourceCodeLocation;
    const content = html.slice(loc.startTag.endOffset, loc.endTag.startOffset);
    if (/\d[\d,]*\s*원/.test(content)) {
      const endKey = attrs["data-cd-price-key-to"];
      const end = endKey ? getBillingFeaturePricing({featureKey:endKey, reason:attrs["data-cd-price-reason-to"]}).pricing?.amountKRW : null;
      if (endKey && !(end > 0)) throw new Error(`Unknown discovery range: ${endKey}`);
      const amounts = endKey ? [amount, end] : [amount];
      let index = 0;
      const next = content.replace(/\d{1,3}(?:,\d{3})+|\d{4,}/g, () => amounts[Math.min(index++, amounts.length - 1)].toLocaleString("ko-KR"));
      if (next !== content) {
        edits.push({ start: loc.startTag.endOffset, end: loc.endTag.startOffset, text: next });
        const attrName = attrs["data-key"] ? "data-key" : attrs["data-cd-trans"] ? "data-cd-trans" : null;
        const key = attrs[attrName];
        if (key) {
          if (key === "home.overseasCopy.krwAmount") {
            const varsAttr = loc.attrs["data-cd-vars"];
            if (!varsAttr) throw new Error(`Missing data-cd-vars for parameterized price: ${key}`);
            edits.push({
              start: varsAttr.startOffset,
              end: varsAttr.endOffset,
              text: `data-cd-vars='${JSON.stringify({ amount: (amount / 1000) + ",000" })}'`,
            });
          } else {
            const newKey = /^home\.concernPick\.price\.(?:w|from)\d+$/.test(key)
              ? key.replace(/\d+$/, String(amount))
              : /^home\.tiles\.price\d+(?:Price\d+)*$/.test(key) ? `home.tiles.price${amount}` : `${key}Price${amount}`;
            const a = loc.attrs[attrName];
            edits.push({ start: a.startOffset, end: a.endOffset, text: `${attrName}="${newKey}"` });
            dictionaryCopies.push({ key, newKey, amount, amounts, fallback: next });
          }
        }
      }
    }
  }
  for (const child of node.childNodes || []) visit(child, amount);
}
visit(doc);
for (const edit of edits.sort((a,b) => b.start-a.start)) html = html.slice(0,edit.start)+edit.text+html.slice(edit.end);
const neoPrice = price(featureById.get("neo-operation-room"));
if (!(neoPrice > 0)) throw new Error("Missing Neo display price");
html = html.replace(/^(\s*['"]\/neo-operation-room['"]:\{.*)$/gm, line => line.replace(/\d[\d,]*원/g, won(neoPrice)));
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
    let index = 0;
    const translated = old.replace(/\d{1,3}(?:[,.\s]\d{3})+|\d{4,}/g, () =>
      copy.amounts[Math.min(index++, copy.amounts.length - 1)].toLocaleString("en-US").replaceAll(",", separator));
    parent[copy.newKey.split(".").at(-1)] = file === "ko.json" ? copy.fallback : translated;
    changed = true;
  }
  if (changed) writeFileSync(path, JSON.stringify(data,null,2)+"\n");
}
console.log(`[flower-price-copy] ${edits.length} badge edits; registry derived from payment prices`);
