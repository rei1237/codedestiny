import {build} from "esbuild";
import {readFile,writeFile} from "node:fs/promises";
import assert from "node:assert/strict";
const {outputFiles}=await build({
  stdin:{contents:'export {vedicPositions} from "./worker/lib/verified-natal.js";',resolveDir:process.cwd()},
  bundle:true, platform:"browser", format:"iife", globalName:"CodeDestinyVedicNatal",
  minify:true, legalComments:"inline", write:false,
  banner:{js:"/* Astronomy Engine 2.1.19, MIT. See /licenses/astronomy-engine.txt */"}
});
const file="public/js/vedic-natal.generated.js";
if(process.argv.includes("--check")) assert.equal(await readFile(file,"utf8"),outputFiles[0].text);
else await writeFile(file,outputFiles[0].text);
