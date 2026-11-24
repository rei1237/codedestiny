// Question memo on the result screen (2026-11-23). Authored in ko, en, ja, zh-CN and zh-TW; other locales use English.
// leaveOk is shown only while a paid reading is being written: the completion mail and My readings keep the result.
type Copy={expand:string;collapse:string;leaveOk:string};
const copies:Record<string,Copy>={
 ko:{expand:'질문 전체 보기',collapse:'접기',leaveOk:'화면을 나가도 괜찮아요. 완성되면 가입하신 메일로 알려 드리고, 보관함에도 저장돼요.'},
 en:{expand:'Show full question',collapse:'Show less',leaveOk:'You can leave this page. We will email your account address when it is ready, and it will be saved in My readings.'},
 ja:{expand:'質問をすべて表示',collapse:'閉じる',leaveOk:'この画面を離れても大丈夫です。完成したらご登録のメールでお知らせし、鑑定履歴にも保存されます。'},
 'zh-CN':{expand:'查看完整问题',collapse:'收起',leaveOk:'离开此页面也没关系。完成后会发邮件到你注册的邮箱通知你，结果也会保存在记录中。'},
 'zh-TW':{expand:'查看完整問題',collapse:'收合',leaveOk:'離開此頁面也沒關係。完成後會寄信到你註冊的信箱通知你，結果也會儲存在紀錄中。'},
};
export const questionMemoCopy=(locale?:string):Copy=>copies[locale||'ko']||copies.en;
