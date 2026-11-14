import {Accuracy,Clipboard,Device} from '@apps-in-toss/web-framework';
export async function getQuestionLocation(){const result=await Device.getLocation({accuracy:Accuracy.Balanced});return {latitude:result.coords.latitude,longitude:result.coords.longitude};}
export async function copyReadingText(text:string){await Clipboard.setText(text);}
