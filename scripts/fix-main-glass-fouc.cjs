const fs = require("fs");

const files = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en-us/index.html",
  "public/ja-jp/index.html",
  "public/hi-in/index.html",
  "public/es-es/index.html",
  "public/fr-fr/index.html",
  "public/de-de/index.html",
  "public/nl-nl/index.html",
  "public/ms-my/index.html",
  "public/zh-cn/index.html",
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
