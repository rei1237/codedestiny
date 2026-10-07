import {defineConfig} from 'vite';
export default defineConfig({base:'/',css:{postcss:{plugins:[]}},build:{sourcemap:false,target:'es2022'},server:{host:'127.0.0.1',port:4317}});
