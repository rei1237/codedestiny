export const miniGameRoutes={
 'destiny-poker':'/mini-games/?play=destiny-poker','fortune-fish':'/mini-games/?play=fortune-fish',omikuji:'/omikuji/',
 'blood-type':'/mini-games/?play=blood-type','destiny-island':'/ziwei/sections?reading=island','secret-house':'/saju/sections?reading=house',
 'hwatu-life':'/mini-games/?play=hwatu-life','saju-fpti':'/saju-fpti/',psychotest:'/psychotest/',
};
export const gameStorageKeys={
 'destiny-poker':['destiny_poker_daily_date','destiny_poker_all4_unlocked','destiny_poker_last_intensity'],
 'fortune-fish':[],'blood-type':['bloodType'],'hwatu-life':['hwatuStats'],
};

export function showsFullGameShelf(mode){return mode==='private-simulation'||mode==='preview-fixtures';}
export const fullGameShelf=showsFullGameShelf(import.meta.env?.MODE);
export const publicMiniGameSlugs=['fortune-fish','blood-type','hwatu-life'];
