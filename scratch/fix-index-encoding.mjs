import fs from 'node:fs';

const file = 'index.html';
let text = fs.readFileSync(file, 'utf8');

// Replace the corrupted button
const corrupted = /<button class="fsp-filter-btn" data-cat="acting" style="">\uFFFD\uFFFD\uFFFD<\/button>/g;
const fixed = '<button class="fsp-filter-btn" data-cat="acting" style="flex-shrink:0;padding:5px 13px;font-size:0.74rem;font-weight:700;border-radius:999px;border:1px solid rgba(183,148,244,0.25);background:rgba(255,255,255,0.05);color:rgba(203,195,227,0.75);cursor:pointer;white-space:nowrap;transition:all .18s;">배우</button>';

if (corrupted.test(text)) {
    text = text.replace(corrupted, fixed);
    fs.writeFileSync(file, text);
    console.log('Fixed index.html');
} else {
    // Fallback if the regex is too strict
    const alternative = /<button class="fsp-filter-btn" data-cat="acting"[^>]*>\uFFFD+<\/button>/g;
    if (alternative.test(text)) {
        text = text.replace(alternative, fixed);
        fs.writeFileSync(file, text);
        console.log('Fixed index.html (fallback regex)');
    } else {
        console.log('Corrupted button not found in index.html');
    }
}
