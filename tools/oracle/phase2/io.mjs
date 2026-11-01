import fs from 'node:fs';
import path from 'node:path';
import { createGunzip, createGzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { OUTPUT } from './corpus.mjs';
export async function* readRows(name) {
  const input = fs.createReadStream(path.join(OUTPUT, name)).pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) if (line) yield JSON.parse(line);
}
export function writer(name) {
  const target = path.join(OUTPUT, name), partial = target + '.partial';
  if (fs.existsSync(target)) throw new Error(`OUTPUT_EXISTS: ${name}`);
  const sink = fs.createWriteStream(partial, { flags: 'wx' }), zip = createGzip(); zip.pipe(sink);
  return { async write(value) { if (!zip.write(JSON.stringify(value) + '\n')) await once(zip, 'drain'); }, async close() { zip.end(); await once(sink, 'finish'); fs.renameSync(partial, target); } };
}
export const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function ziweiDifferences(a, b) {
  if (a?.status !== 'ok' || b?.status !== 'ok') return [];
  const diffs = [];
  for (const key of ['life', 'body', 'bureau']) if (a[key] !== b[key]) diffs.push({ field: key, service: a[key], oracle: b[key] });
  for (const key of ['stars', 'decades', 'hua']) for (const name of new Set([...Object.keys(a[key]), ...Object.keys(b[key])]))
    if (a[key][name] !== b[key][name]) diffs.push({ field: `${key}.${name}`, service: a[key][name] ?? null, oracle: b[key][name] ?? null });
  return diffs;
}
