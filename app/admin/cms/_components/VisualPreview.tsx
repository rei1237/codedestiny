"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ADMIN_CARD, ADMIN_INPUT, adminButton } from "../../_components/ui";
import { previewPath, replaceVisualField, safePreviewPath, visualFields, type Fields, type VisualField } from "../_lib/visual-fields";
import { safeDetailImage } from "@/lib/cms/detail-copy.mjs";
import { getAdminApiBase, getFlowerAdminToken } from "../../_lib/admin-api";
import { uploadInsightImage } from "../../insights/_lib/imageUpload";

type Binding = { node: Text | HTMLImageElement; fields: VisualField[]; original: string };
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const fieldId = (field: VisualField) => JSON.stringify(field.path);

export default function VisualPreview({ ns, entryKey, base, value, onChange }: {
  ns: string; entryKey: string; base: Fields; value: Fields; onChange: (next: Fields) => void;
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
  const [choices, setChoices] = useState<VisualField[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("페이지를 불러오는 중입니다.");
  const [count, setCount] = useState(0);
  const [input, setInput] = useState("");
  const [problem, setProblem] = useState("");
  const [uploading, setUploading] = useState(false);
  const fields = useMemo(() => visualFields(value), [value]);
  const active = choices.find((field) => fieldId(field) === selected);
  const baseFields = useMemo(() => visualFields(base), [base]);
  const sourceFields = useRef(baseFields);
  sourceFields.current = baseFields;

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
      setMessage(options.length ? (options.length > 1 ? "같은 문구가 여러 항목에 있습니다. 수정할 항목을 선택하세요." : "선택한 문구를 아래에서 수정하세요.") :
        "이 부분은 현재 선택한 콘텐츠에 연결되어 있지 않습니다. 왼쪽에서 해당 콘텐츠를 선택하세요.");
    };
    const scan = () => {
      if (disposed || !doc?.body) return;
      const candidates = [...sourceFields.current, ...visualFields(current.current)];
      const effective = new Map(visualFields(current.current).map((field) => [fieldId(field), field]));
      const lookup = new Map<string, Map<string, VisualField>>();
      for (const field of candidates) {
        const key = `${field.image ? "image:" : "text:"}${normalize(field.value)}`;
        const bucket = lookup.get(key) || new Map<string, VisualField>();
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
      const drafts = new Map(visualFields(current.current).map((field) => [fieldId(field), field.value]));
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
      clearTimeout(timer);
      observer.disconnect();
      doc?.removeEventListener("click", choose, true);
      doc?.removeEventListener("submit", stopSubmit, true);
      clearHighlight();
    };
  }, [selecting, ns]);

  useEffect(() => {
    attach();
    return () => cleanup.current();
  }, [attach]);

  const apply = () => {
    if (!active) return;
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
      <button type="button" className={adminButton()} onClick={() => setMobile(!mobile)}>{mobile ? "PC 화면 보기" : "모바일 화면 보기"}</button>
      <button type="button" className={adminButton(selecting ? "primary" : "neutral")} aria-pressed={selecting} onClick={() => setSelecting(!selecting)}>{selecting ? "문구 선택 중" : "화면 이동 중"}</button>
    </div>
    <form className="flex flex-wrap gap-2" onSubmit={(event) => {
      event.preventDefault();
      const safe = safePreviewPath(address, window.location.origin);
      if (!safe) { setProblem("같은 사이트의 공개 페이지 주소를 입력하세요."); return; }
      setPath(safe); setRevision((n) => n + 1); setChoices([]); setProblem("");
    }}>
      <input aria-label="미리보기 페이지 주소" className={`${ADMIN_INPUT} min-w-0 flex-1`} value={address} onChange={(event) => setAddress(event.target.value)} />
      <button type="submit" className={adminButton()}>페이지 열기</button>
    </form>
    <p className="text-sm text-slate-300" role="status">{message}</p>
    <p className="text-xs text-slate-400">현재 화면에서 연결된 위치 {count}개 · 편집 가능한 항목 {fields.length}개. 같은 원본을 쓰는 다른 화면에도 변경이 적용됩니다.</p>
    <div className="overflow-x-auto rounded-lg border border-slate-700 bg-white">
      <iframe key={revision} ref={frame} src={path} onLoad={attach} title="콘텐츠 실제 화면 미리보기"
        sandbox="allow-scripts allow-same-origin" className="mx-auto block h-[600px] border-0"
        style={{ width: mobile ? 390 : 1024, maxWidth: mobile ? "100%" : undefined }} />
    </div>
    {choices.length > 1 ? <label className="block text-sm">수정할 항목
      <select className={ADMIN_INPUT} value={selected} onChange={(event) => {
        setSelected(event.target.value);
        setInput(choices.find((field) => fieldId(field) === event.target.value)?.value || "");
      }}><option value="">항목 선택</option>{choices.map((field) => <option key={fieldId(field)} value={fieldId(field)}>{field.path.join(" › ")}</option>)}</select>
    </label> : null}
    {active ? <div className="space-y-2">
      <label className="block text-sm">
        {active.image ? "이미지 주소" : "선택한 문구"}
        <textarea className={`${ADMIN_INPUT} mt-2 min-h-28 text-base`} value={input} onChange={(event) => setInput(event.target.value)} />
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
      <button type="button" onClick={apply} className={adminButton("primary")}>초안에 적용</button>
    </div> : null}
    {problem ? <p role="alert" className="text-sm text-rose-300">{problem}</p> : null}
    <p className="text-xs text-slate-400">문구가 선택되지 않으면 아래 항목 편집기를 이용하세요. 이 미리보기는 문장·이미지 확인용이며 결제와 상담 제출용이 아닙니다.</p>
  </section>;
}
