import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
// Shared web components use Next's jsx:preserve. This CSR build must transform
// them too, without changing the web application's TypeScript configuration.
export default defineConfig({base:'/',oxc:{jsx:{runtime:'automatic'}},resolve:{alias:{'@':fileURLToPath(new URL('../../',import.meta.url))},dedupe:['react','react-dom']},css:{postcss:{plugins:[]}},build:{sourcemap:false,target:'es2022'},server:{host:'127.0.0.1',port:4317}});
