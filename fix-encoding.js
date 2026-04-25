const fs = require('fs');
let t = fs.readFileSync('index.html', 'utf8');
t = t.replace(/<button class="fsp-filter-btn" data-cat="acting"[\s\S]*?<\/button>/g, '<button class="fsp-filter-btn" data-cat="acting" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">¹è¿ì</button>');
fs.writeFileSync('index.html', t);
