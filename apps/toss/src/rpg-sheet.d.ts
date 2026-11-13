declare module 'virtual:rpg-sheet' {
 export type Level={totalExp:number;currentLevel:number;currentLevelExp:number;nextLevelExp:number;streakDays?:number};
 export type SimpleQuest={id:string;text:string;icon:string};
 export const questRule:{exp:number;dailyLimit:number};
 export function levelState(total:number):Level;
 export function characterSheet(args:{stem:string;element:string;name:string;document:Document;progress:Level;account:boolean;completed:string[];stored:SimpleQuest[]}):{date:string;html:string;quests:{questId:string;text:string;icon:string}[]};
}
