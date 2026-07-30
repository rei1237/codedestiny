"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import ImageExtension from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  ariaLabel: string;
}

const TOOLBAR_BUTTON =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-50 disabled:opacity-40 dark:text-slate-300";
const TOOLBAR_BUTTON_ACTIVE = "bg-violet-950 text-violet-200";

export default function RichTextEditor({ value, onChange, ariaLabel }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      // StarterKit v3 는 Link 를 이미 포함한다 — 따로 등록하면 중복 확장 경고가 난다.
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      ImageExtension.configure({ allowBase64: false }),
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        class:
          "min-h-[280px] rounded-b-lg border border-t-0 border-slate-700 bg-[#10121c] px-4 py-4 text-[15px] leading-7 text-slate-100 outline-none [&_a]:text-violet-300 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-slate-600 [&_blockquote]:pl-4 [&_blockquote]:text-slate-300 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_hr]:my-5 [&_hr]:border-slate-700 [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
      },
    },
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    immediatelyRender: false,
  });

  // 다른 항목으로 이동하면 에디터 내용을 갈아끼운다. 사용자가 입력 중인 값은 건드리지 않는다.
  useEffect(() => {
    if (!editor) return;
    const next = value || "<p></p>";
    if (editor.getHTML() !== next) editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return null;

  const button = (
    key: string,
    label: string,
    Icon: typeof Bold,
    action: () => void,
    active = false,
    disabled = false,
  ) => (
    <button
      key={key}
      type="button"
      onClick={action}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`${TOOLBAR_BUTTON} ${active ? TOOLBAR_BUTTON_ACTIVE : ""}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-slate-700 bg-[#161826] px-2 py-1.5">
        {button("h1", "제목 1", Heading1, () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive("heading", { level: 1 }))}
        {button("h2", "제목 2", Heading2, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
        {button("h3", "제목 3", Heading3, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}
        <span className="mx-1 h-5 w-px bg-slate-700" aria-hidden="true" />
        {button("bold", "굵게", Bold, () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
        {button("italic", "기울임", Italic, () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}
        {button("strike", "취소선", Strikethrough, () => editor.chain().focus().toggleStrike().run(), editor.isActive("strike"))}
        {button("code", "인라인 코드", Code, () => editor.chain().focus().toggleCode().run(), editor.isActive("code"))}
        <span className="mx-1 h-5 w-px bg-slate-700" aria-hidden="true" />
        {button("ul", "글머리 목록", List, () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
        {button("ol", "번호 목록", ListOrdered, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
        {button("quote", "인용", Quote, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}
        {button("hr", "구분선", Minus, () => editor.chain().focus().setHorizontalRule().run())}
        <span className="mx-1 h-5 w-px bg-slate-700" aria-hidden="true" />
        {button("link", "링크", LinkIcon, () => {
          const previous = String(editor.getAttributes("link").href || "");
          const href = window.prompt("링크 주소를 입력하세요. 비우면 링크가 해제됩니다.", previous);
          if (href === null) return;
          if (!href.trim()) {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
        }, editor.isActive("link"))}
        {button("image", "이미지", ImageIcon, () => {
          const src = window.prompt("이미지 URL을 입력하세요.");
          if (!src?.trim()) return;
          editor.chain().focus().setImage({ src: src.trim() }).run();
        })}
        <span className="mx-1 h-5 w-px bg-slate-700" aria-hidden="true" />
        {button("undo", "실행 취소", Undo2, () => editor.chain().focus().undo().run(), false, !editor.can().undo())}
        {button("redo", "다시 실행", Redo2, () => editor.chain().focus().redo().run(), false, !editor.can().redo())}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
