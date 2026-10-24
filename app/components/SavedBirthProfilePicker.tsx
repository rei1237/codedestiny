"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Moon, RefreshCw } from "lucide-react";
import { selectedBirthProfileSeed, type AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { readDestinyProfileAccountId, type DestinyProfileCard } from "@/app/_lib/profile-card-storage";
import { useSavedBirthProfiles } from "@/app/hooks/useSavedBirthProfiles";
import styles from "./SavedBirthProfilePicker.module.css";
const copy = {
 ko: {title:"저장된 프로필",choose:"프로필 선택하기",manual:"직접 입력하기",hint:"선택한 정보는 이번 운세에만 사용해요.",empty:"저장된 프로필이 없어요. 아래에 직접 입력해 주세요.",guest:"로그인하면 프로필 카드의 저장된 정보를 불러올 수 있어요.",error:"프로필을 불러오지 못했어요. 다시 확인하거나 직접 입력해 주세요.",loading:"프로필 확인 중",refresh:"프로필 목록 새로고침",solar:"양력",lunar:"음력",leap:"윤달",unknown:"시간 모름"},
 en: {title:"Saved profiles",choose:"Choose a profile",manual:"Enter details manually",hint:"This selection is used for this reading only.",empty:"No saved profiles. Enter your details below.",guest:"Sign in to use your saved profile cards.",error:"Profiles could not be loaded. Refresh or enter details below.",loading:"Loading profiles",refresh:"Refresh profiles",solar:"Solar",lunar:"Lunar",leap:"Leap month",unknown:"Time unknown"},
 ja: {title:"保存したプロフィール",choose:"プロフィールを選択",manual:"直接入力する",hint:"選んだ情報は今回の鑑定にのみ使用します。",empty:"保存したプロフィールがありません。下に入力してください。",guest:"ログインすると保存したプロフィールを使えます。",error:"読み込めませんでした。再読み込みするか直接入力してください。",loading:"確認中",refresh:"一覧を更新",solar:"陽暦",lunar:"陰暦",leap:"閏月",unknown:"時刻不明"},
 zh: {title:"已保存的档案",choose:"选择档案",manual:"手动输入",hint:"所选信息仅用于本次解读。",empty:"暂无档案，请在下方输入。",guest:"登录后可使用已保存的档案。",error:"无法加载档案，请重试或手动输入。",loading:"正在加载",refresh:"刷新档案",solar:"公历",lunar:"农历",leap:"闰月",unknown:"时间不详"}
};
type Props = { calendarMode?: "solar" | "lunar" | "lunar-leap"; onSelect: (seed: AiPrefillSeed, profile: DestinyProfileCard) => void; label?: string; disabled?: boolean; className?: string };
export default function SavedBirthProfilePicker({onSelect,label,disabled,className="",calendarMode="lunar-leap"}: Props) {
  const {profiles,loading,error,owner,reload} = useSavedBirthProfiles();
  const [selected,setSelected] = useState("");
  const [locale,setLocale] = useState<keyof typeof copy>("ko");
  const id=useId();
  const selection=useRef(0);
  const [selecting,setSelecting]=useState(false);
  const [selectionMessage,setSelectionMessage]=useState("");
  useEffect(()=>()=>{selection.current++;},[]);
  useEffect(()=>{selection.current++;setSelected("");setSelecting(false);setSelectionMessage("");},[owner]);
  useEffect(()=>{const sync=()=>{const key=document.documentElement.lang.split("-")[0];setLocale(key in copy?key as keyof typeof copy:"en");};sync();window.addEventListener("cd:locale-ready",sync);return()=>window.removeEventListener("cd:locale-ready",sync);},[]);
  const text=copy[locale];
  const active=profiles.find(profile=>String(profile.id||profile.profileId)===selected);
  const seed=active?selectedBirthProfileSeed(active):null;
  return <div className={styles.card+" "+className} data-saved-birth-profile="">
    <div className={styles.heading}><Moon aria-hidden size={19}/><label htmlFor={id}>{label||text.title}</label>
      {owner&&<button type="button" className={styles.refresh} aria-label={text.refresh} title={text.refresh} disabled={disabled||loading||selecting} onClick={()=>void reload()}><RefreshCw aria-hidden size={16}/></button>}
    </div>
    {profiles.length>0&&<select id={id} value={active?selected:""} disabled={disabled||loading} aria-describedby={id+"-hint"} onChange={async event=>{
      const next=profiles.find(profile=>String(profile.id||profile.profileId)===event.target.value);
      if(owner!==readDestinyProfileAccountId())return;
      const request=++selection.current;
      setSelected(event.target.value);setSelectionMessage("");
      if(!next){setSelecting(false);return;}
      setSelecting(true);
      try {
        let nextSeed=selectedBirthProfileSeed(next);
        if(nextSeed.calendarType==="lunar" && (calendarMode==="solar" || (calendarMode==="lunar" && nextSeed.isLeapMonth))) {
          const {lunarToSolar}=await import("@/lib/korean-calendar");
          const [year,month,day]=(nextSeed.birthDate || "").split("-").map(Number);
          const date=lunarToSolar(year,month,day,Boolean(nextSeed.isLeapMonth));
          if(!date)throw new Error("invalid-lunar-date");
          nextSeed={...nextSeed,birthDate:[date.year,String(date.month).padStart(2,"0"),String(date.day).padStart(2,"0")].join("-"),calendarType:"solar",isLeapMonth:false};
          if(request===selection.current)setSelectionMessage(locale==="ko"?"같은 날의 양력 날짜로 입력했어요. 저장된 프로필은 그대로 유지돼요.":"The equivalent solar date is used. Your saved profile is unchanged.");
        }
        if(request!==selection.current || owner!==readDestinyProfileAccountId())return;
        await onSelect(nextSeed,next);
      } catch { if(request===selection.current)setSelectionMessage(locale==="ko"?"생년월일을 확인하지 못했어요. 아래 입력을 확인해 주세요.":"Check the birth date below before continuing."); }
      finally {if(request===selection.current)setSelecting(false);}
    }}><option value="">{selected?text.manual:text.choose}</option>{profiles.map(profile=><option key={profile.id||profile.profileId} value={profile.id||profile.profileId}>{profile.name||text.title}{profile.birthDate?" · "+profile.birthDate:""}</option>)}</select>}
    <p id={id+"-hint"} className={styles.hint} role="status">{loading||selecting?text.loading:selectionMessage?selectionMessage:error?text.error:!owner?text.guest:!profiles.length?text.empty:seed?[seed.birthDate,seed.calendarType==="lunar"?text.lunar:text.solar,seed.isLeapMonth?text.leap:"",seed.birthTimeUnknown?text.unknown:seed.birthTime].filter(Boolean).join(" · "):text.hint}</p>
  </div>;
}
