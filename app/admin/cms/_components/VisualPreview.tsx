"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ADMIN_CARD, ADMIN_INPUT, adminButton } from "../../_components/ui";
import { matchesCopy, prefersResultCopy, previewPath, replaceVisualField, safePreviewPath, visualFields, type Fields, type VisualField } from "../_lib/visual-fields";
import { safeDetailImage } from "@/lib/cms/detail-copy.mjs";
import { getAdminApiBase, getFlowerAdminToken } from "../../_lib/admin-api";
import { uploadInsightImage } from "../../insights/_lib/imageUpload";

import styles from "../cms-workspace.module.css";

type Choice = VisualField & { owner: string; label?: string };
type PreviewEntry = { key: string; label: string; fields: Fields; base?: Fields };
type Binding = { node: Text | HTMLImageElement; fields: Choice[]; original: string };
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const fieldId = (field: Choice) => JSON.stringify([field.owner, ...field.path]);

export default function VisualPreview({ ns, entryKey, base, value, onChange, entries = [], selectedPath = [], onSelectEntry, onPendingChange, disabled = false }: {
  ns: string; entryKey: string; base: Fields; value: Fields; onChange: (next: Fields) => void;
  onPendingChange?: (pending: boolean) => void;
  entries?: PreviewEntry[]; selectedPath?: string[]; onSelectEntry?: (key: string, path: string[]) => void; disabled?: boolean;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const bindings = useRef<Binding[]>([]);
  const cleanup = useRef<() => void>(() => {});
  const current = useRef(value);
  current.current = value;
  const [path, setPath] = useState(() => previewPath(ns, entryKey));
  const [address, setAddress] = useState(path);
  const [mobile, setMobile] = useState(true);
  const [selecting, setSelecting] = useState(true);
  const [revision, setRevision] = useState(0);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("페이지를 불러오는 중입니다.");
  const [count, setCount] = useState(0);
  const [input, setInput] = useState("");
  const [problem, setProblem] = useState("");
  const [uploading, setUploading] = useState(false);
  const [allCopy, setAllCopy] = useState(prefersResultCopy(ns));
  const [query, setQuery] = useState("");
  const fields = useMemo(() => visualFields(value).map((field) => ({ ...field, owner: entryKey })), [value, entryKey]);
  const entry = useRef(entryKey); entry.current = entryKey;
  const catalog = useRef(entries); catalog.current = entries;
  const chooseEntry = useRef(onSelectEntry); chooseEntry.current = onSelectEntry;
  const locked = useRef(disabled); locked.current = disabled;
  const rescan = useRef<() => void>(() => {});
  const editBox = useRef<HTMLTextAreaElement>(null);
  const filteredFields = useMemo(() => fields.filter((field) => !field.image && matchesCopy(query, field.value, field.path.join(" "))), [fields, query]);
  const active = choices.find((field) => fieldId(field) === selected);
  const pending = Boolean(active && input !== active.value);
  const pendingRef = useRef(pending); pendingRef.current = pending;
  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);
  useEffect(() => () => onPendingChange?.(false), [onPendingChange]);
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);
  const baseFields = useMemo(() => visualFields(base).map((field) => ({ ...field, owner: entryKey })), [base, entryKey]);
  const sourceFields = useRef(baseFields);
  sourceFields.current = baseFields;

  useEffect(() => {
    const desired = previewPath(ns, entryKey);
    setPath(desired); setAddress(desired);
    const field = visualFields(current.current).find((item) => JSON.stringify(item.path) === JSON.stringify(selectedPath));
    const choice = field ? { ...field, owner: entryKey } : null;
    setChoices(choice ? [choice] : []); setSelected(choice ? fieldId(choice) : ""); setInput(choice?.value || "");
    setProblem("");
    if (choice) { setMessage("선택한 문구를 수정한 뒤 ‘초안에 적용’을 누르세요."); requestAnimationFrame(() => editBox.current?.focus({ preventScroll: true })); }
    rescan.current();
  }, [entryKey, ns, selectedPath]);
  useEffect(() => { rescan.current(); }, [value, entries]);

  // Only the administrator's iframe is changed. No runtime DOM patch ships to visitors.
  const attach = useCallback(() => {
    cleanup.current();
    let doc: Document | null;
    try {
      doc = frame.current?.contentDocument || null;
      const url = frame.current?.contentWindow?.location.href;
      if (!doc || !url || !safePreviewPath(url, window.location.origin)) throw new Error("unsupported");
    } catch {
      setMessage("이 페이지는 미리보기에서 열 수 없습니다. 같은 사이트의 공개 페이지 주소를 입력하세요.");
      return;
    }
    const originals = new WeakMap<Node, string>();
    const styles = new Map<HTMLElement, string>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const clearHighlight = () => {
      for (const [element, outline] of styles) element.style.outline = outline;
      styles.clear();
    };
    const choose = (event: Event) => {
      if (!selecting) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (locked.current || pendingRef.current) return;
      const target = event.target as Node;
      const matches = bindings.current.filter((binding) =>
        binding.node === target || binding.node.parentElement === target ||
        (target.nodeType === 1 && target.contains(binding.node)));
      const unique = new Map(matches.flatMap((binding) => binding.fields).map((field) => [fieldId(field), field]));
      clearHighlight();
      const element = target.nodeType === 1 ? target as HTMLElement : target.parentElement;
      if (element && unique.size) {
        styles.set(element, element.style.outline);
        element.style.outline = "3px solid var(--cd-primary, currentColor)";
      }
      const options = [...unique.values()];
      setChoices(options);
      setProblem("");
      setSelected(options.length === 1 ? fieldId(options[0]) : "");
      setInput(options.length === 1 ? options[0].value : "");
      if (options.length === 1) {
        if (options[0].owner !== entry.current) chooseEntry.current?.(options[0].owner, options[0].path);
        requestAnimationFrame(() => editBox.current?.focus({ preventScroll: true }));
      }
      setMessage(options.length ? (options.length > 1 ? "같은 문구가 여러 항목에 있습니다. 수정할 항목을 선택하세요." : "선택한 문구를 아래에서 수정하세요.") :
        "이 문구는 선택한 화면·결과 그룹에 등록되어 있지 않습니다. 다른 그룹을 선택하거나 ‘모든 결과 문장’에서 찾아보세요.");
    };
    const scan = () => {
      if (disposed || !doc?.body) return;
      const currentFields = visualFields(current.current).map((field) => ({ ...field, owner: entry.current }));
      const candidates: Choice[] = [
        ...catalog.current.flatMap((item) => [...visualFields(item.base || {}), ...visualFields(item.fields)].map((field) => ({ ...field, owner: item.key, label: item.label }))),
        ...sourceFields.current, ...currentFields,
      ];
      const effective = new Map(currentFields.map((field) => [fieldId(field), field]));
      const lookup = new Map<string, Map<string, Choice>>();
      for (const field of candidates) {
        const key = `${field.image ? "image:" : "text:"}${normalize(field.value)}`;
        const bucket = lookup.get(key) || new Map<string, Choice>();
        bucket.set(fieldId(field), field);
        lookup.set(key, bucket);
      }
      const next: Binding[] = [];
      const walker = doc.createTreeWalker(doc.body, 4); // SHOW_TEXT
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (node.parentElement?.closest("script,style,noscript,textarea,input,select,[contenteditable]")) continue;
        const original = originals.get(node) ?? node.data;
        let found = lookup.get(`text:${normalize(original)}`);
        const recordPath = node.parentElement?.closest("[data-cms-record]")?.getAttribute("data-cms-record");
        if (ns === "feature-detail" && recordPath && found) {
          const exact = [...found.values()].filter((field) => field.path[0] === "record" && field.path[1] === recordPath);
          if (exact.length === 1) found = new Map(exact.map((field) => [fieldId(field), field]));
        }
        if (found) {
          originals.set(node, original);
          next.push({ node, fields: [...found.values()].map((field) => effective.get(fieldId(field)) || field), original });
        }
      }
      for (const node of Array.from(doc.images)) {
        const original = originals.get(node) ?? node.getAttribute("src") ?? "";
        const found = lookup.get(`image:${normalize(original)}`);
        if (found) {
          originals.set(node, original);
          next.push({ node, fields: [...found.values()].map((field) => effective.get(fieldId(field)) || field), original });
        }
      }
      bindings.current = next;
      setCount(next.length);
      const drafts = new Map(currentFields.map((field) => [fieldId(field), field.value]));
      for (const binding of next) {
        if (binding.fields.length !== 1) continue;
        const draft = drafts.get(fieldId(binding.fields[0]));
        if (!draft) continue;
        if (binding.node.nodeType === 3) {
          if ((binding.node as Text).data !== draft) (binding.node as Text).data = draft;
        } else if (draft !== binding.original && safeDetailImage(draft)) {
          const image = binding.node as HTMLImageElement;
          image.removeAttribute("srcset");
          if (image.getAttribute("src") !== draft) image.setAttribute("src", draft);
        }
      }
    };
    rescan.current = scan;
    scan();
    setMessage(selecting ? "페이지의 문구나 이미지를 클릭하세요. 연결된 항목만 수정할 수 있습니다." : "화면을 이동한 뒤 ‘문구 선택’을 누르세요.");
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(scan, 150);
    });
    observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
    doc.addEventListener("click", choose, true);
    // Native forms never submit from this preview.
    const stopSubmit = (event: Event) => event.preventDefault();
    doc.addEventListener("submit", stopSubmit, true);
    cleanup.current = () => {
      disposed = true;
      rescan.current = () => {};
      clearTimeout(timer);
      observer.disconnect();
      doc?.removeEventListener("click", choose, true);
      doc?.removeEventListener("submit", stopSubmit, true);
      clearHighlight();
    };
  }, [selecting, ns]);

  useEffect(() => {
    if (!allCopy) attach();
    return () => cleanup.current();
  }, [attach, allCopy]);

  const apply = () => {
    if (!active || disabled || active.owner !== entryKey) return;
    if (!input.trim()) { setProblem("빈 문구는 저장할 수 없습니다."); return; }
    if (active.image && !safeDetailImage(input)) { setProblem("사이트 내부 경로나 assets.code-destiny.com의 HTTPS 이미지 주소를 입력하세요."); return; }
    if (ns === "light-novel" && active.path[0] === "beats" &&
        (input.length > 250 || ['"', "\\", "</script"].some((token) => input.includes(token)))) {
      setProblem("대사는 250자 이내로 입력하세요. 인용은 「 」를 사용하고 역슬래시와 HTML 종료 태그는 제외해 주세요.");
      return;
    }
    if (input.length > 20000) { setProblem("문구는 20,000자 이내로 입력하세요."); return; }
    onChange(replaceVisualField(current.current, active.path, input));
    for (const binding of bindings.current) {
      if (binding.fields.length !== 1 || fieldId(binding.fields[0]) !== selected) continue;
      if (binding.node.nodeType === 3) (binding.node as Text).data = input;
      else {
        const image = binding.node as HTMLImageElement;
        image.removeAttribute("srcset");
        image.src = input;
      }
    }
    setChoices((items) => items.map((field) => fieldId(field) === selected ? { ...field, value: input } : field));
    setProblem("");
    setMessage("초안에 적용했습니다. 발행하고 사이트에 반영하면 방문자 화면에 적용됩니다.");
  };

  return <section className={`${ADMIN_CARD} space-y-3 rounded-lg p-3`} aria-label="화면에서 편집">
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="mr-auto font-semibold">화면에서 편집</h3>
      <button type="button" disabled={pending} className={adminButton(allCopy ? "primary" : "neutral")} aria-pressed={allCopy} onClick={() => setAllCopy(!allCopy)}>{allCopy ? "실제 페이지 보기" : "모든 결과 문장"}</button>
      <button type="button" disabled={allCopy} className={adminButton()} onClick={() => setMobile(!mobile)}>{mobile ? "PC 화면 보기" : "모바일 화면 보기"}</button>
      <button type="button" disabled={allCopy || pending} className={adminButton(selecting ? "primary" : "neutral")} aria-pressed={selecting} onClick={() => setSelecting(!selecting)}>{selecting ? "문구 선택 중" : "화면 이동 중"}</button>
    </div>
    {!allCopy ? <form className="flex flex-wrap gap-2" onSubmit={(event) => {
      event.preventDefault();
      const safe = safePreviewPath(address, window.location.origin);
      if (!safe) { setProblem("같은 사이트의 공개 페이지 주소를 입력하세요."); return; }
      setPath(safe); setRevision((n) => n + 1); setChoices([]); setProblem("");
    }}>
      <input disabled={pending} aria-label="미리보기 페이지 주소" className={`${ADMIN_INPUT} min-w-0 flex-1`} value={address} onChange={(event) => setAddress(event.target.value)} />
      <button type="submit" disabled={pending} className={adminButton()}>페이지 열기</button>
    </form> : null}
    <p className="text-sm text-slate-300" role="status">{allCopy && !active ? "수정할 문장을 선택하세요." : message}</p>
    <p className="text-xs text-slate-400">{allCopy ? "" : `현재 화면에서 연결된 위치 ${count}개 · `}편집 가능한 항목 {fields.length}개. 같은 원본을 쓰는 다른 화면에도 변경이 적용됩니다.</p>
    <div className={styles.previewLayout}>
    <div className="min-w-0">
    {allCopy ? <div className="space-y-3">
      <p className="text-sm text-slate-300">현재 결과에 나오지 않은 문장도 모두 표시합니다. 바꿀 문장을 누르세요. 날짜나 결과에 따라 같은 원본을 쓰는 화면에 함께 반영됩니다.</p>
      <input className={ADMIN_INPUT} aria-label="결과 문장 검색" placeholder="수정할 문장 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
      <p className={styles.note} role="status">{filteredFields.length}개 문장 · 선택하면 원문과 나란히 수정할 수 있어요.</p>
      <div className={styles.copyList} aria-label="전체 결과 문장">
        {filteredFields.map((field) => <button
          type="button" key={fieldId(field)} aria-pressed={selected === fieldId(field)}
          className={styles.copyRow} disabled={disabled || pending}
          onClick={() => { setChoices([field]); setSelected(fieldId(field)); setInput(field.value); setProblem(""); setMessage("선택한 문장을 편집 패널에서 수정하세요."); requestAnimationFrame(() => { editBox.current?.focus({ preventScroll: true }); if (window.innerWidth < 1280) editBox.current?.scrollIntoView({ block: "center" }); }); }}>
          <span>{field.path.filter((part) => part !== "record").join(" › ")}</span><p>{field.value}</p>
        </button>)}
        {filteredFields.length === 0 ? <p className="p-3 text-sm text-slate-400">검색한 문장이 없습니다.</p> : null}
      </div>
    </div> : null}
    {!allCopy ? <div className={styles.canvas}>
      <iframe key={revision} ref={frame} src={path} onLoad={attach} title="콘텐츠 실제 화면 미리보기"
        sandbox="allow-scripts allow-same-origin" className={styles.frame}
        style={{ width: mobile ? 390 : "100%", maxWidth: "100%" }} />
    </div> : null}
    </div>
    <aside className={styles.inspector} aria-label="선택한 문구 편집">
    <h4>문구 편집</h4>
    {!active && choices.length === 0 ? <p className={styles.note}>왼쪽 화면의 문구를 누르세요. 결과가 화면에 없으면 ‘모든 결과 문장’에서 선택하세요.</p> : null}
    {choices.length > 1 ? <label className="block text-sm">수정할 항목
      <select disabled={pending} className={ADMIN_INPUT} value={selected} onChange={(event) => {
        setSelected(event.target.value);
        const choice = choices.find((field) => fieldId(field) === event.target.value);
        setInput(choice?.value || "");
        if (choice && choice.owner !== entryKey) onSelectEntry?.(choice.owner, choice.path);
      }}><option value="">항목 선택</option>{choices.map((field) => <option key={fieldId(field)} value={fieldId(field)}>{field.label || field.owner} · {field.path.join(" › ")}</option>)}</select>
    </label> : null}
    {active ? <div className="space-y-3">
      <p className={styles.note}>{active.path.filter((part) => part !== "record").join(" › ")}</p>
      <details><summary className="min-h-11 cursor-pointer py-2 text-sm">기본 문장과 비교</summary><p className={styles.original}>{baseFields.find((field) => fieldId(field) === selected)?.value || "기본 문장 없음"}</p></details>
      <label className="block text-sm">
        {active.image ? "이미지 주소" : "선택한 문구"}
        <textarea ref={editBox} disabled={disabled} className={`${ADMIN_INPUT} mt-2 min-h-28 text-base`} value={input} onChange={(event) => setInput(event.target.value)} />
      </label>
      {active.image ? <>
        <label className="block text-sm">교체할 이미지 파일
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading}
            className="mt-2 block min-h-11 w-full text-sm" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setUploading(true); setProblem("");
              try {
                const uploaded = await uploadInsightImage({ apiBase: getAdminApiBase(), adminToken: getFlowerAdminToken(), file, usage: "body", alt: "" });
                if (!safeDetailImage(uploaded.url)) throw new Error("업로드된 이미지 주소가 허용된 도메인인지 확인해 주세요.");
                setInput(uploaded.url);
              } catch (error) { setProblem(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다."); }
              finally { setUploading(false); }
            }} />
        </label>
        <p className="text-xs text-slate-400">{uploading ? "이미지를 업로드하고 있습니다." : "이미지에 박힌 글자는 여기서 바뀌지 않습니다. 글자 없는 이미지로 교체한 뒤 초안에 적용하세요. 업로드한 파일은 즉시 저장되지만 페이지는 발행 전까지 바뀌지 않습니다."}</p>
      </> : null}
      {pending ? <p role="status" className={styles.note}>입력한 문구가 아직 초안에 적용되지 않았어요. 적용하거나 입력을 되돌린 뒤 저장·발행하세요.</p> : null}
      <button type="button" disabled={disabled || uploading || active.owner !== entryKey} onClick={apply} className={adminButton("primary")}>초안에 적용</button>
      {pending ? <button type="button" className={adminButton()} disabled={disabled} onClick={() => { setInput(active.value); setProblem(""); }}>입력 되돌리기</button> : null}
    </div> : null}
    {problem ? <p role="alert" className="text-sm text-rose-300">{problem}</p> : null}
    </aside>
    </div>
    <p className="text-xs text-slate-400">문구가 선택되지 않으면 아래 항목 편집기를 이용하세요. 이 미리보기는 문장·이미지 확인용이며 결제와 상담 제출용이 아닙니다.</p>
  </section>;
}
