const fs = require("fs");

const files = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
];

const oldBlock =
  '    <link rel="preload" as="style" href="/styles/main-glass.css?v=20260328-animaluxfix1" onload="this.onload=null;this.rel=\'stylesheet\'">\n' +
  '    <noscript><link rel="stylesheet" href="/styles/main-glass.css?v=20260328-animaluxfix1"></noscript>';

const newLine =
  '    <link rel="stylesheet" href="/styles/main-glass.css?v=20260411-foucfix1">';

let updated = 0;
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  if (!src.includes(oldBlock)) {
    continue;
  }
  const out = src.replace(oldBlock, newLine);
  if (out !== src) {
    fs.writeFileSync(file, out, "utf8");
    updated += 1;
  }
}

console.log(`updated=${updated}`);
