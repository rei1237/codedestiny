"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./BirthPlaceInput.module.css";
export type ResolvedBirthPlace = { lat: number; lng: number; timezone: string; name: string };
type Props = { id?: string; value: string; onChange: (value: string) => void; onResolved: (value: ResolvedBirthPlace | null) => void;
  disabled?: boolean; required?: boolean; confirmed?: boolean; className?: string; placeholder?: string; label?: string };
/** A location is never inferred from a failed lookup or a browser's current time zone. */
export default function BirthPlaceInput({id,value,onChange,onResolved,disabled,required,confirmed=false,className="",placeholder="예: 대한민국 부산 / 미국 뉴욕",label="태어난 도시와 국가"}:Props) {
  const input=useRef<HTMLInputElement>(null),sequence=useRef(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[resolvedName,setResolvedName]=useState("");
  useEffect(()=>{input.current?.setCustomValidity(value.trim()&&!confirmed ? error||"출생지를 확인해 주세요." : "");},[value,confirmed,error]);
  useEffect(()=>{ sequence.current++; setBusy(false); setError(""); setResolvedName(""); },[value]);
  useEffect(()=>()=>{sequence.current++;},[]);
  async function resolve() {
    const place=value.trim();if(!place||confirmed||disabled)return;
    const current=++sequence.current;setBusy(true);setError("");
    try {
      const response=await fetch("/api/geocode?place="+encodeURIComponent(place),{cache:"no-store",signal:AbortSignal.timeout(10000)});
      const data=await response.json();
      if(!response.ok||data.fallback||!Number.isFinite(data.lat)||!Number.isFinite(data.lng)||!data.timezone)throw new Error("location");
      if(current!==sequence.current)return;
      onResolved({lat:data.lat,lng:data.lng,timezone:data.timezone,name:data.name||place});
      setResolvedName(data.name||place);
    } catch {
      if(current!==sequence.current)return;
      setError("출생지를 찾지 못했어요. 도시와 국가를 함께 입력한 뒤 다시 확인해 주세요.");
      onResolved(null);
    } finally {if(current===sequence.current)setBusy(false);}
  }
  return <span className={styles.place}>
    <span className={styles.row}>
      <input ref={input} id={id} className={className} type="text" value={value} required={required} disabled={disabled} maxLength={120}
        autoComplete="off" enterKeyHint="search" aria-label={label} aria-invalid={Boolean(error)} placeholder={placeholder}
        onChange={event=>{sequence.current++;setBusy(false);setError("");setResolvedName("");onChange(event.target.value);onResolved(null);}}
        onBlur={()=>void resolve()} onKeyDown={event=>{if(event.key==="Enter"&&!confirmed){event.preventDefault();void resolve();}}}/>
      <button type="button" disabled={disabled||busy||!value.trim()||confirmed} onClick={()=>void resolve()}>{busy?"확인 중":confirmed?"확인됨":"출생지 확인"}</button>
    </span>
    <small className={styles.status} role={error?"alert":"status"}>{error||(confirmed?resolvedName||"출생지의 위치와 시간대를 적용했어요.":"도시명으로 위치와 시간대를 자동으로 확인해요.")}</small>
  </span>;
}
