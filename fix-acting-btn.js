const fs = require('fs');
let t = fs.readFileSync('index.html', 'utf8');
t = t.replace(/<button class="fsp-filter-btn" data-cat="acting" style="([^"]*)"><\/button>/g, '<button class="fsp-filter-btn" data-cat="acting" style="\">¹è¿ì</button>');
fs.writeFileSync('index.html', t);
