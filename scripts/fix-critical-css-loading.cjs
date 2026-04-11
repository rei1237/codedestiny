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

const replacements = [
  {
    from:
      '    <link rel="preload" as="style" href="/styles/fortune-ui.css?v=20260329-date-mobilefix1" onload="this.onload=null;this.rel=\'stylesheet\'">\n' +
      '    <noscript><link rel="stylesheet" href="/styles/fortune-ui.css?v=20260329-date-mobilefix1"></noscript>',
    to: '    <link rel="stylesheet" href="/styles/fortune-ui.css?v=20260411-foucfix2">',
  },
  {
    from:
      '    <link rel="preload" as="style" href="/styles/mobile-ux.css?v=20260329-datefix3" onload="this.onload=null;this.rel=\'stylesheet\'">\n' +
      '    <noscript><link rel="stylesheet" href="/styles/mobile-ux.css?v=20260329-datefix3"></noscript>',
    to: '    <link rel="stylesheet" href="/styles/mobile-ux.css?v=20260411-foucfix2">',
  },
  {
    from:
      '  <link rel="preload" as="style" href="/styles/life-book.css?v=20260411-zfix1" onload="this.onload=null;this.rel=\'stylesheet\'">\n' +
      '  <noscript><link rel="stylesheet" href="/styles/life-book.css?v=20260411-zfix1"></noscript>',
    to: '  <link rel="stylesheet" href="/styles/life-book.css?v=20260411-foucfix2">',
  },
];

let updatedFiles = 0;
for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  let changed = false;
  for (const r of replacements) {
    if (src.includes(r.from)) {
      src = src.replace(r.from, r.to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, src, "utf8");
    updatedFiles += 1;
  }
}

console.log(`updatedFiles=${updatedFiles}`);
