import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import canonicalPreview from './canonical/vite-preview.mjs';
const require=createRequire(import.meta.url);
const tailwind=require('tailwindcss');
const theme=require('../../tailwind.config.js');
const root=fileURLToPath(new URL('../../',import.meta.url)).replaceAll('\\','/');
// Shared web components use Next's jsx:preserve. This CSR build must transform
// them too, without changing the web application's TypeScript configuration.
export default defineConfig({base:'/',plugins:[canonicalPreview()],oxc:{jsx:{runtime:'automatic'}},resolve:{alias:{'@':fileURLToPath(new URL('../../',import.meta.url))},dedupe:['react','react-dom']},css:{postcss:{plugins:[tailwind({...theme,content:theme.content.map((path:string)=>root+'/'+path.replace(/^\.\//,''))})]}},build:{sourcemap:false,target:'es2022'},server:{host:'127.0.0.1',port:4317}});
