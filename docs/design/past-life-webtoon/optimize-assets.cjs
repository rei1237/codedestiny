const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const inputRoot = process.argv[2];
if (!inputRoot) throw new Error('Pass the generated_images session directory.');
const images = {
  harbor: 'exec-f251b442-d78c-4415-9912-0105bc12327b.png',
  choice: 'exec-14e2f8d3-e01e-4370-a007-35f8f52ca002.png',
  memory: 'exec-b3039f80-9378-41a5-9b25-10d859b879ee.png',
};
(async () => {
  const sizes = [];
  for (const [name, file] of Object.entries(images)) {
    for (const width of [480, 800]) {
      const output = path.join(__dirname, 'assets', `${name}-${width}.webp`);
      await sharp(path.join(inputRoot, file)).resize({ width }).webp({ quality: 74, effort: 6 }).toFile(output);
      sizes.push({ file: path.basename(output), bytes: fs.statSync(output).size, width, height: width * 1.5 });
    }
  }
  fs.writeFileSync(path.join(__dirname, 'asset-sizes.json'), JSON.stringify(sizes, null, 2) + '\n');
  console.log(sizes);
})();
