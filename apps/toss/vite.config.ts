import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import astralAnimals from './canonical/astral-animals.mjs';
import animalAlmanac from './canonical/animal-almanac.mjs';
import cosmicSessions from './canonical/cosmic-sessions.mjs';
import nevilleCourses from './canonical/neville-courses.mjs';
import musicShelf from './canonical/music-shelf';
import mansionAtlas from './canonical/mansion-atlas';
import novelReader from './canonical/novel-book.mjs';
import famousArchive from './canonical/famous-archive.mjs';
import canonicalPreview from './canonical/vite-preview.mjs';
import serviceCompat,{localBrandFonts} from './service/vite-service.mjs';
const require=createRequire(import.meta.url);
const tailwind=require('tailwindcss');
const theme=require('../../tailwind.config.js');
const root=fileURLToPath(new URL('../../',import.meta.url)).replaceAll('\\','/');
// Shared web components use Next's jsx:preserve. This CSR build must transform
// them too, without changing the web application's TypeScript configuration.
export default defineConfig(({mode})=>({base:'/',plugins:[cosmicCourses(),nevilleCourses(),astralAnimals(),animalAlmanac(),musicShelf(),mansionAtlas(),novelReader(),famousArchive(),mode==='preview-fixtures'?canonicalPreview():serviceCompat()],oxc:{jsx:{runtime:'automatic'}},resolve:{alias:{'@':fileURLToPath(new URL('../../',import.meta.url))},dedupe:['react','react-dom']},css:{postcss:{plugins:[localBrandFonts(),tailwind({...theme,content:theme.content.map((path:string)=>root+'/'+path.replace(/^\.\//,''))})]}},build:{sourcemap:false,target:'es2022'},server:{host:'127.0.0.1',port:4317}}));
