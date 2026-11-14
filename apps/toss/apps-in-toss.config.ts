import {defineConfig} from '@apps-in-toss/web-framework/config';
export default defineConfig({appName:'ai-saju-studio',brand:{primaryColor:'#7054B3'},permissions:[{name:'clipboard',access:'write'},{name:'geolocation',access:'access'}],
  navigationBar:{withBackButton:true,withHomeButton:true,withTitle:true,theme:'light'},
  webView:{bounces:false,pullToRefreshEnabled:false,overScrollMode:'never'},webBundleDir:'dist'});
