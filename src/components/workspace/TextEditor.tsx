import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { generateHTML } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronLeft,
  ChevronRight,
  Combine,
  Download,
  Eraser,
  FileCode2,
  FileText,
  FileType2,
  FolderOpen,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Palette,
  Quote,
  Redo2,
  Split,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DocumentsDialog } from "@/components/workspace/DocumentsDialog";
import {
  ensureActiveDoc,
  formatWhen,
  getDoc,
  htmlToPlainText,
  saveDoc,
  saveRecords,
  setActiveDocId,
  snapshotVersion,
} from "@/lib/documents";
import {
  assemblePrint,
  ensureRecords,
  externalMarkedIds,
  bindPageRecords,
  mergeWithNext,
  splitRecord,
  type DocRecord,
} from "@/lib/records";
import { NoteRef } from "@/components/workspace/note-mark";
import { exportWord } from "@/lib/document-export";
import type { Evidence } from "@/lib/research";
import { TahqiqRail } from "@/components/workspace/TahqiqRail";
import { SelectionReview } from "./SelectionReview";
import {
  addNote,
  getNotesState,
  removeNote,
  renumber,
  selectNotesDocument,
  type NoteLane,
  type NotesState,
} from "@/lib/notes";

const FONTS = [
  { label: "أميري", value: "Amiri, serif" },
  { label: "القاهرة", value: "Cairo, sans-serif" },
  { label: "نسخ تقليدي", value: "'Noto Naskh Arabic', serif" },
  { label: "أحادي", value: "ui-monospace, monospace" },
];

const SIZES = ["14", "16", "18", "20", "24", "28", "34"];

const COLORS = ["#1f2937", "#b91c1c", "#166534", "#1d4ed8", "#a16207", "#7c3aed"];
const HIGHLIGHTS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff"];

export type EditorApi = {
  openDocument: (id: string) => void;
  captureInsertion: () => void;
  insertAtCaptured: (text: string) => boolean;
  insertEvidenceNote: (lane: NoteLane, text: string, evidence: Evidence[]) => boolean;
  insertText: (text: string) => void;
  replaceText: (text: string) => void;
  getSelection: () => string;
  insertNote: (lane: NoteLane, text?: string) => void;
  getHTML: () => string;
  getFullHTML: () => string;
  getPrint: () => ReturnType<typeof assemblePrint> | null;
  setRecordPage: (pane: "right" | "left", pageIndex: number) => void;
  preparePages: (pane: "right" | "left", sourceId: string, pages: { id: string; name: string }[]) => void;
  receiveTranscript: (pane: "right" | "left", sourceId: string, pageId: string, text: string) => void;
  getTitle: () => string;
  focusNote: (noteId: string) => void;
};

function ToolButton({
  active,
  title,
  onClick,
  children,
  disabled,
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={title}
          disabled={disabled}
          onClick={onClick}
          className={cn("size-8", active && "bg-secondary text-secondary-foreground")}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6} className="text-[11px]">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="hidden select-none px-1 text-[10px] font-medium text-muted-foreground/70 xl:inline">
      {children}
    </span>
  );
}

const SYMBOLS = [
  { label: "﴿ ﴾", title: "قوسا الآية", open: "﴿", close: "﴾" },
  { label: "« »", title: "الحديث والنقل", open: "«", close: "»" },
  { label: "[ ]", title: "زيادة المحقّق / طمس", open: "[", close: "]" },
  { label: "( )", title: "قوسان", open: "(", close: ")" },
  { label: "{ }", title: "معقوفان", open: "{", close: "}" },
  { label: "[/]", title: "انتقال لوحة", open: "[/", close: "]" },
  { label: "…", title: "بياض أو خرم في الأصل", open: " … ", close: "" },
];

function Toolbar({ editor }: { editor: Editor }) {
  const [, force] = useState(0);
  useEffect(() => {
    const update = () => force((value) => value + 1);
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  const heading = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : "p";

  const setDirection = (dir: "rtl" | "ltr") => {
    editor.chain().focus().run();
    const { from } = editor.state.selection;
    const node = editor.view.domAtPos(from).node;
    const element = (node.nodeType === 1 ? node : node.parentElement) as HTMLElement | null;
    const block = element?.closest("p,h1,h2,h3,li,blockquote") as HTMLElement | null;
    if (block) {
      block.style.direction = dir;
      block.style.textAlign = dir === "rtl" ? "right" : "left";
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-nowrap items-center gap-0.5 overflow-x-auto border-b bg-toolbar px-2 py-1.5 [scrollbar-width:none] md:flex-wrap md:overflow-x-visible">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="أقواس وعلامات التحقيق"
              className="inline-flex h-7 items-center gap-0.5 rounded px-1.5 font-serif text-[13px] hover:bg-accent"
            >
              ﴿﴾<span className="text-[9px] text-muted-foreground">▾</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {SYMBOLS.map((s) => (
              <DropdownMenuItem
                key={s.title}
                onSelect={() => {
                  const { from, to } = editor.state.selection;
                  const sel = editor.state.doc.textBetween(from, to, " ");
                  editor.chain().focus().insertContentAt({ from, to }, `${s.open}${sel}${s.close}`).run();
                }}
              >
                <span className="w-10 font-serif text-sm">{s.label}</span>
                <span className="text-xs">{s.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolButton title="تراجع (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="size-4" />
        </ToolButton>
        <ToolButton
          title="إعادة (Ctrl+Shift+Z)"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-4" />
        </ToolButton>
        <Separator orientation="vertical" className="mx-1 h-6" />

        <GroupLabel>النمط</GroupLabel>
        <Select
          value={heading}
          onValueChange={(value) => {
            if (value === "p") editor.chain().focus().setParagraph().run();
            else
              editor
                .chain()
                .focus()
                .toggleHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 })
                .run();
          }}
        >
          <SelectTrigger className="h-8 w-28 text-xs" aria-label="نمط الفقرة">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="p">نص عادي</SelectItem>
            <SelectItem value="h1">عنوان 1</SelectItem>
            <SelectItem value="h2">عنوان 2</SelectItem>
            <SelectItem value="h3">عنوان 3</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={editor.getAttributes("textStyle")["fontFamily"] ?? (FONTS[0]?.value ?? "Amiri, serif")}
          onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()}
        >
          <SelectTrigger className="h-8 w-28 text-xs" aria-label="نوع الخط">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONTS.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={
            String(editor.getAttributes("textStyle")["fontSize"] ?? "").replace("px", "") || "18"
          }
          onValueChange={(value) => editor.chain().focus().setFontSize(`${value}px`).run()}
        >
          <SelectTrigger className="h-8 w-[4.5rem] text-xs" aria-label="حجم الخط">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SIZES.map((size) => (
              <SelectItem key={size} value={size}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="mx-1 h-6" />
        <GroupLabel>تنسيق</GroupLabel>
        <ToolButton
          title="عريض (Ctrl+B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolButton>
        <ToolButton
          title="مائل (Ctrl+I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolButton>
        <ToolButton
          title="تحته خط (Ctrl+U)"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-4" />
        </ToolButton>
        <ToolButton
          title="يتوسطه خط"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-4" />
        </ToolButton>

        <Separator orientation="vertical" className="mx-1 h-6" />
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" title="الألوان والتظليل" aria-label="الألوان والتظليل" className="flex h-7 items-center gap-1 rounded px-1.5 text-[11px] hover:bg-secondary">
              <Palette className="size-4" /> ألوان
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" dir="rtl" className="w-56 space-y-2 p-2">
            <p className="text-[11px] font-semibold">لون النص</p>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((color) => (
                <button key={color} type="button" aria-label={`لون النص ${color}`} onClick={() => editor.chain().focus().setColor(color).run()} className="size-6 rounded-full border transition-transform hover:scale-110" style={{ backgroundColor: color }} />
              ))}
              <button type="button" aria-label="إزالة اللون" onClick={() => editor.chain().focus().unsetColor().run()} className="h-6 rounded border px-1 text-[10px]">بلا</button>
            </div>
            <p className="text-[11px] font-semibold">التظليل</p>
            <div className="flex flex-wrap gap-1.5">
              {HIGHLIGHTS.map((color) => (
                <button key={color} type="button" aria-label={`تظليل ${color}`} onClick={() => editor.chain().focus().toggleHighlight({ color }).run()} className="size-6 rounded-sm border transition-transform hover:scale-110" style={{ backgroundColor: color }} />
              ))}
              <button type="button" aria-label="إزالة التظليل" onClick={() => editor.chain().focus().unsetHighlight().run()} className="h-6 rounded border px-1 text-[10px]">بلا</button>
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="mx-1 h-6" />
        <GroupLabel>قوائم</GroupLabel>
        <ToolButton
          title="قائمة نقطية"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolButton>
        <ToolButton
          title="قائمة رقمية"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolButton>
        <ToolButton
          title="اقتباس"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </ToolButton>
        <ToolButton
          title="خط فاصل"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="size-4" />
        </ToolButton>
        <ToolButton
          title="إدراج جدول"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <TableIcon className="size-4" />
        </ToolButton>
        <ToolButton
          title="رابط"
          active={editor.isActive("link")}
          onClick={() => {
            const previous = String(editor.getAttributes("link")["href"] ?? "");
            const url = window.prompt("عنوان الرابط", previous);
            if (url === null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href: url }).run();
          }}
        >
          <Link2 className="size-4" />
        </ToolButton>

        <Separator orientation="vertical" className="mx-1 h-6" />
        <GroupLabel>محاذاة</GroupLabel>
        <ToolButton
          title="محاذاة يمين"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="size-4" />
        </ToolButton>
        <ToolButton
          title="توسيط"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="size-4" />
        </ToolButton>
        <ToolButton
          title="محاذاة يسار"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="size-4" />
        </ToolButton>
        <ToolButton
          title="ضبط"
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify className="size-4" />
        </ToolButton>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs"
          title="اتجاه الفقرة من اليمين لليسار"
          onClick={() => setDirection("rtl")}
        >
          RTL
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs"
          title="اتجاه الفقرة من اليسار لليمين"
          onClick={() => setDirection("ltr")}
        >
          LTR
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />
        <ToolButton
          title="مسح كل التنسيق"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <Eraser className="size-4" />
        </ToolButton>
      </div>
    </TooltipProvider>
  );
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** تحويل بسيط لتنسيق Markdown المضمّن (عريض/مائل/كود) إلى HTML. */
function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\s)\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/**
 * يعيد ترقيم علامات الحواشي حسب ترتيبها في سجل العمل، ويحذف اليتيمة منه.
 * علامات السجلات الأخرى (external) لا تُمسّ؛ حواشيها محفوظة في سجلها.
 */
function syncNotes(editor: Editor, external: string[] = []) {
  if (editor.isDestroyed) return;
  const ordered: string[] = [];
  const positions: Array<{ pos: number; noteId: string; label: string }> = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "noteRef") return;
    const noteId = String(node.attrs["noteId"] ?? "");
    ordered.push(noteId);
    positions.push({ pos, noteId, label: String(node.attrs["label"] ?? "") });
  });
  const labels = renumber(ordered);
  // حذف الحواشي التي أُزيلت علاماتها من هذا السجل فقط
  for (const note of getNotesState().notes) {
    if (!ordered.includes(note.id) && !external.includes(note.id)) removeNote(note.id);
  }
  const stale = positions.filter((item) => (labels.get(item.noteId) ?? "") !== item.label);
  if (!stale.length) return;
  const tr = editor.state.tr;
  for (const item of stale) {
    const node = editor.state.doc.nodeAt(item.pos);
    if (!node) continue;
    tr.setNodeMarkup(item.pos, undefined, {
      ...node.attrs,
      label: labels.get(item.noteId) ?? "",
    });
  }
  tr.setMeta("addToHistory", false);
  editor.view.dispatch(tr);
}

const EXTENSIONS = [
  StarterKit.configure({ link: { openOnClick: false } }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TextStyleKit,
  Highlight.configure({ multicolor: true }),
  Placeholder.configure({
    placeholder:
      "ابدأ الكتابة هنا… استخدم شريط الأدوات بالأعلى، أو اطلب من المساعد أن يكتب لك.",
  }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  NoteRef,
];

export function TextEditor({
  onTextChange,
  onReady,
  onRecordChange,
}: {
  onTextChange?: (text: string) => void;
  onReady?: (api: EditorApi) => void;
  onRecordChange?: (record: DocRecord, index: number) => void;
}) {
  const [stats, setStats] = useState({ words: 0, chars: 0 });
  const [records, setRecords] = useState<DocRecord[]>([]);
  const [activeRecord, setActiveRecord] = useState(0);
  const recordsRef = useRef<DocRecord[]>([]);
  const activeRecordRef = useRef(0);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);

  const docIdRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshot = useRef(0);
  const switching = useRef(false);
  const insertion = useRef<{ docId: string; from: number; valid: boolean } | null>(null);

  const updateStats = useCallback(
    (text: string) => {
      setStats({ words: text.trim() ? text.trim().split(/\s+/).length : 0, chars: text.length });
      onTextChange?.(text);
    },
    [onTextChange],
  );

  /** يحفظ نص السجل الحالي في مصفوفة السجلات، ويجعل نص المستند الكامل متتالية السجلات. */
  const persistRecords = useCallback(
    (current: DocRecord[], activeIndex: number, activeHtml: string) => {
      const next = current.map((record, index) =>
        index === activeIndex ? { ...record, html: activeHtml } : record,
      );
      recordsRef.current = next;
      setRecords(next);
      const id = docIdRef.current;
      if (id) {
        saveRecords(id, next);
        saveDoc(id, { html: next.map((record) => record.html).join("") });
      }
      return next;
    },
    [],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: EXTENSIONS,
    content: "",
    editorProps: { attributes: { class: "tiptap", dir: "rtl", spellcheck: "false" } },
    onUpdate: ({ editor: instance }) => {
      updateStats(instance.getText());
      if (switching.current) return;
      syncNotes(instance, externalMarkedIds(recordsRef.current, activeRecordRef.current));
      const id = docIdRef.current;
      if (!id) return;
      setSaving(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        persistRecords(recordsRef.current, activeRecordRef.current, instance.getHTML());
        const now = Date.now();
        if (now - lastSnapshot.current > 60_000) {
          snapshotVersion(id);
          lastSnapshot.current = now;
        }
        setSaving(false);
        setSavedAt(now);
      }, 700);
    },
  });

  const loadDoc = useCallback(
    (id: string) => {
      const doc = getDoc(id);
      if (!doc || !editor) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (docIdRef.current) {
        persistRecords(recordsRef.current, activeRecordRef.current, editor.getHTML());
      }
      insertion.current = null;
      docIdRef.current = id;
      selectNotesDocument(id);
      setDocId(id);
      setActiveDocId(id);
      setTitle(doc.title);
      const recs = ensureRecords(doc.html, doc.records);
      recordsRef.current = recs;
      setRecords(recs);
      activeRecordRef.current = 0;
      setActiveRecord(0);
      switching.current = true;
      editor.commands.setContent(recs[0]?.html ?? "", { emitUpdate: false });
      switching.current = false;
      updateStats(editor.getText());
      syncNotes(editor, externalMarkedIds(recs, 0));
      setSavedAt(doc.updatedAt);
      lastSnapshot.current = Date.now();
      const first = recs[0];
      if (first) onRecordChange?.(first, 0);
    },
    [editor, updateStats, persistRecords, onRecordChange],
  );

  // تهيئة المستند النشط مرة واحدة بعد جهوزية المحرر.
  useEffect(() => {
    if (!editor || docIdRef.current) return;
    const doc = ensureActiveDoc();
    loadDoc(doc.id);
  }, [editor, loadDoc]);

  useEffect(() => {
    if (!editor) return;
    const mapInsertion = ({ transaction }: { transaction: Editor["state"]["tr"] }) => {
      const anchor = insertion.current;
      if (!anchor || !transaction.docChanged) return;
      const mapped = transaction.mapping.mapResult(anchor.from, 1);
      insertion.current = { ...anchor, from: mapped.pos, valid: anchor.valid && !mapped.deletedAcross };
    };
    editor.on("transaction", mapInsertion);
    return () => { editor.off("transaction", mapInsertion); };
  }, [editor]);

  const selectRecord = useCallback((index: number, supplied?: DocRecord[]) => {
    if (!editor || editor.isDestroyed) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const next = supplied ?? persistRecords(recordsRef.current, activeRecordRef.current, editor.getHTML());
    const record = next[index];
    if (!record) return;
    insertion.current = null;
    recordsRef.current = next; setRecords(next);
    activeRecordRef.current = index; setActiveRecord(index);
    switching.current = true;
    editor.commands.setContent(record.html, { emitUpdate: false });
    switching.current = false;
    syncNotes(editor, externalMarkedIds(next, index));
    updateStats(editor.getText()); setSaving(false);
    if (docIdRef.current) saveRecords(docIdRef.current, next);
    onRecordChange?.(record, index);
  }, [editor, persistRecords, updateStats, onRecordChange]);

  const splitCurrent = () => {
    if (!editor) return;
    const position = editor.state.selection.from;
    if (position <= 1 || position >= editor.state.doc.content.size - 1) {
      toast.error("ضع المؤشر داخل النص عند موضع التقسيم"); return;
    }
    const before = generateHTML({ type: "doc", content: editor.state.doc.cut(0, position).toJSON().content }, EXTENSIONS);
    const after = generateHTML({ type: "doc", content: editor.state.doc.cut(position).toJSON().content }, EXTENSIONS);
    const current = persistRecords(recordsRef.current, activeRecordRef.current, editor.getHTML());
    const next = splitRecord(current, activeRecordRef.current, before, after);
    if (next) selectRecord(activeRecordRef.current, next);
  };

  // واجهة برمجية للمساعد الذكي ومستطيلات الحواشي.
  useEffect(() => {
    if (!editor || !onReady) return;
    onReady({
      openDocument: loadDoc,
      captureInsertion: () => {
        const id = docIdRef.current;
        if (id) insertion.current = { docId: id, from: editor.state.selection.from, valid: true };
      },
      insertAtCaptured: (text: string) => {
        const anchor = insertion.current;
        if (!anchor?.valid || anchor.docId !== docIdRef.current || editor.isDestroyed) {
          toast.error("موضع الإدراج تغيّر؛ ضع المؤشر في المتن ثم افتح المراجعة مجددًا");
          return false;
        }
        const html = text.split(/\n\n/).map(block => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`).join("");
        editor.chain().focus().insertContentAt(anchor.from, html).run();
        insertion.current = null;
        return true;
      },
      insertNote: (lane: NoteLane, text = "") => {
        if (editor.isDestroyed) return;
        const note = addNote(lane.id, "", text);
        editor
          .chain()
          .focus()
          .insertContent({
            type: "noteRef",
            attrs: { noteId: note.id, laneId: lane.id, label: "", color: lane.color },
          })
          .run();
        syncNotes(editor, externalMarkedIds(recordsRef.current, activeRecordRef.current));
      },
      insertEvidenceNote: (lane, text, evidence) => {
        const anchor = insertion.current;
        if (!anchor?.valid || anchor.docId !== docIdRef.current || editor.isDestroyed) {
          toast.error("موضع الحاشية تغيّر؛ ضع المؤشر في المتن ثم افتح البحث مجددًا");
          return false;
        }
        const note = addNote(lane.id, "", text, evidence);
        const inserted = editor.chain().focus().insertContentAt(anchor.from, { type: "noteRef", attrs: { noteId: note.id, laneId: lane.id, label: "", color: lane.color } }).run();
        if (!inserted) { removeNote(note.id); return false; }
        insertion.current = null;
        syncNotes(editor, externalMarkedIds(recordsRef.current, activeRecordRef.current));
        setTimeout(() => document.querySelector<HTMLTextAreaElement>(`[data-note-input="${note.id}"]`)?.focus(), 150);
        return true;
      },
      focusNote: (noteId: string) => {
        let pos: number | null = null;
        editor.state.doc.descendants((node, at) => {
          if (node.type.name === "noteRef" && node.attrs["noteId"] === noteId) pos = at;
        });
        if (pos === null) return;
        editor.chain().focus().setTextSelection(pos + 1).scrollIntoView().run();
      },
      insertText: (text: string) => {
        const value = text.trim();
        if (!value) return;
        const blocks = value.split(/\n{2,}/);
        if (blocks.length === 1 && !value.includes("\n")) {
          // فقرة واحدة: يُدرج داخل الفقرة الحالية مع الحفاظ على تنسيقها.
          editor.chain().focus().insertContent(inlineMarkdown(value)).run();
          return;
        }
        const html = blocks
          .map((block) => `<p>${inlineMarkdown(block).replace(/\n/g, "<br>")}</p>`)
          .join("");
        editor.chain().focus().insertContent(html).run();
      },
      replaceText: (text: string) => {
        const value = text.trim();
        if (!value || editor.isDestroyed) return;
        const { from, to } = editor.state.selection;
        const range = from === to ? { from: 0, to: editor.state.doc.content.size } : { from, to };
        const blocks = value.split(/\n{2,}/);
        const html = blocks.length === 1
          ? inlineMarkdown(value).replace(/\n/g, "<br>")
          : blocks.map((block) => `<p>${inlineMarkdown(block).replace(/\n/g, "<br>")}</p>`).join("");
        editor.chain().focus().insertContentAt(range, html).run();
      },
      getHTML: () => (editor.isDestroyed ? "" : editor.getHTML()),
      getFullHTML: () => persistRecords(recordsRef.current, activeRecordRef.current, editor.getHTML()).map(record => record.html).join(""),
      getPrint: () => assemblePrint(persistRecords(recordsRef.current, activeRecordRef.current, editor.getHTML()), getNotesState()),
      setRecordPage: (pane, pageIndex) => {
        const index = recordsRef.current.findIndex(record => record[pane === "right" ? "rightPage" : "leftPage"] === pageIndex);
        if (index >= 0 && index !== activeRecordRef.current) selectRecord(index);
      },
      preparePages: (pane, sourceId, pages) => {
        const current = persistRecords(recordsRef.current, activeRecordRef.current, editor.getHTML());
        selectRecord(activeRecordRef.current, bindPageRecords(current, pane, sourceId, pages));
      },
      receiveTranscript: (pane, sourceId, pageId, text) => {
        const current = persistRecords(recordsRef.current, activeRecordRef.current, editor.getHTML());
        const key = pane === "right" ? "rightSourceId" : "leftSourceId";
        const pageKey = pane === "right" ? "rightPageId" : "leftPageId";
        const index = current.findIndex(record => record[key] === sourceId && record[pageKey] === pageId);
        if (index < 0) return;
        const existing = current[index];
        if (!existing) return;
        if (htmlToPlainText(existing.html).trim()) { selectRecord(index, current); toast.info("حُفظ النسخ في مراجعة الصفحات؛ لم يُستبدل نص السجل الموجود"); return; }
        current[index] = { ...existing, html: text.split(/\n\n/).map(block => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`).join("") };
        selectRecord(index, current);
        persistRecords(current, index, editor.getHTML());
      },
      getTitle: () => docIdRef.current ? (getDoc(docIdRef.current)?.title ?? "") : "",
      getSelection: () => {
        const { from, to } = editor.state.selection;
        return editor.state.doc.textBetween(from, to, "\n");
      },
    });
  }, [editor, onReady, loadDoc, selectRecord, persistRecords]);

  const exportFile = (kind: "html" | "txt" | "docx") => {
    if (!editor) return;
    const name = (title || "مستند").replace(/[\\/:*?"<>|]/g, "_");
    const assembled = assemblePrint(persistRecords(recordsRef.current, activeRecordRef.current, editor.getHTML()), getNotesState());
    const body = assembled.html;
    const notesState = { ...getNotesState(), notes: assembled.printedNotes.map(note => ({ ...note, anchor: "" })) };
    if (kind === "docx") { void exportWord(title || "مستند", body, notesState).catch(() => toast.error("تعذّر تصدير ملف Word")); return; }
    const printedLaneIds = new Set(
      notesState.lanes.filter((lane) => lane.printed).map((lane) => lane.id),
    );
    // قائمة واحدة مدمجة: كل الحواشي المختارة للطباعة مرتبة حسب تسلسلها في المتن،
    // بترقيم متصل واحد مهما اختلفت أنواعها — كما في الكتب المحققة.
    const printedNotes = notesState.notes.filter(
      (note) => note.label && printedLaneIds.has(note.laneId),
    );
    const laneOf = (laneId: string) =>
      notesState.lanes.find((lane) => lane.id === laneId);
    const notesHtml = printedNotes.length
      ? `<section class="lane"><ol>${printedNotes
          .map(
            (note) =>
              `<li>(${note.label}) <span style="color:${laneOf(note.laneId)?.color ?? "inherit"}">${escapeHtml(note.text)}</span></li>`,
          )
          .join("")}</ol></section>`
      : "";
    const notesText = printedNotes.length
      ? `\n\n${printedNotes.map((note) => `(${note.label}) ${note.text}`).join("\n")}`
      : "";
    const wrapped = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${escapeHtml(
      title,
    )}</title><style>body{font-family:Amiri,serif;line-height:1.9;padding:2rem}sup{font-size:.7em}.lane{border-top:1px solid #ccc;margin-top:1.5rem;padding-top:.5rem;font-size:.9em}</style></head><body>${body}${notesHtml}</body></html>`;
    const map = {
      html: { content: wrapped, type: "text/html;charset=utf-8", ext: "html" },
      txt: {
        content: `${htmlToPlainText(body)}${notesText}`,
        type: "text/plain;charset=utf-8",
        ext: "txt",
      },
    } as const;
    const chosen = map[kind];
    const blob = new Blob([chosen.content], { type: chosen.type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}.${chosen.ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="flex h-full min-w-0 flex-col bg-background">
      <div className="flex min-w-0 items-center gap-2 border-b bg-toolbar px-2 py-1.5">
        <FileText className="hidden size-4 shrink-0 text-primary sm:block" />
        <Input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (docIdRef.current) saveDoc(docIdRef.current, { title: event.target.value });
          }}
          aria-label="عنوان المستند"
          placeholder="عنوان المستند"
          className="h-8 min-w-0 max-w-64 border-transparent bg-transparent text-sm font-semibold shadow-none focus-visible:border-input focus-visible:bg-background"
        />
        <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
          {saving ? (
            <>
              <Loader2 className="size-3 animate-spin" /> يحفظ…
            </>
          ) : savedAt ? (
            <>
              <Check className="size-3 text-primary" /> حُفظ {formatWhen(savedAt)}
            </>
          ) : null}
        </span>
        <div className="flex-1" />
        {editor && <SelectionReview editor={editor} />}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 shrink-0 px-2 text-xs"
          onClick={() => setLibraryOpen(true)}
          title="مكتبة المستندات والنسخ السابقة"
        >
          <FolderOpen className="size-4" />
          <span className="hidden sm:inline">مستنداتي</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="secondary" className="h-8 shrink-0 px-2 text-xs" title="تصدير نسخة">
              <Download className="size-4" /> تصدير
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => exportFile("docx")}>
              <FileType2 className="size-4" /> ملف Word‏ (.docx)
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportFile("html")}>
              <FileCode2 className="size-4" /> صفحة HTML
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportFile("txt")}>
              <FileText className="size-4" /> نص عادي (.txt)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {editor ? (
        <Toolbar editor={editor} />
      ) : (
        <div className="h-12 border-b bg-toolbar" aria-hidden />
      )}

      <div className="flex shrink-0 items-center gap-1 border-b bg-toolbar px-2 py-1" dir="rtl">
        <Button size="icon" variant="ghost" className="size-7" aria-label="السجل السابق" disabled={activeRecord === 0} onClick={() => selectRecord(activeRecord - 1)}><ChevronRight className="size-4" /></Button>
        <span className="min-w-0 flex-1 truncate text-xs">{records[activeRecord]?.label ?? "سجل"} · {activeRecord + 1} / {records.length || 1}</span>
        <Button size="icon" variant="ghost" className="size-7" aria-label="السجل التالي" disabled={activeRecord >= records.length - 1} onClick={() => selectRecord(activeRecord + 1)}><ChevronLeft className="size-4" /></Button>
        <Button size="icon" variant="ghost" className="size-7" title="تقسيم السجل عند المؤشر" aria-label="تقسيم السجل عند المؤشر" onClick={splitCurrent}><Split className="size-4" /></Button>
        <Button size="icon" variant="ghost" className="size-7" title="دمج مع السجل التالي" aria-label="دمج مع السجل التالي" disabled={activeRecord >= records.length - 1} onClick={() => { if (!editor || !window.confirm("دمج هذا السجل مع التالي؟")) return; const next = mergeWithNext(persistRecords(recordsRef.current, activeRecordRef.current, editor.getHTML()), activeRecordRef.current); if (next) selectRecord(activeRecordRef.current, next); }}><Combine className="size-4" /></Button>
      </div>
      <div className="flex min-h-0 flex-1">
        {editor && (
          <TahqiqRail
            getSelection={() => {
              const { from, to } = editor.state.selection;
              return editor.state.doc.textBetween(from, to, "\n") || editor.getText();
            }}
            insertText={(text) => {
              const { from, to } = editor.state.selection;
              const range = from === to ? { from: 0, to: editor.state.doc.content.size } : { from, to };
              const html = text.split(/\n{2,}/).map(block => `<p>${inlineMarkdown(block).replace(/\n/g, "<br>")}</p>`).join("");
              editor.chain().focus().insertContentAt(range, html).run();
            }}
            insertNote={(lane, text) => {
              const note = addNote(lane.id, "", text);
              editor
                .chain()
                .focus()
                .insertContent({
                  type: "noteRef",
                  attrs: { noteId: note.id, laneId: lane.id, label: "", color: lane.color },
                })
                .run();
              syncNotes(editor, externalMarkedIds(recordsRef.current, activeRecordRef.current));
            }}
          />
        )}
        <div className="min-w-0 flex-1 overflow-auto p-2 md:p-3">
          <div className="mx-auto min-h-full w-full max-w-3xl rounded-md bg-paper p-4 shadow-paper md:p-8">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <footer className="flex items-center gap-3 border-t bg-toolbar px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>الكلمات: {stats.words}</span>
        <span>الحروف: {stats.chars}</span>
        <div className="flex-1" />
        <span className="hidden sm:inline">
          الحفظ تلقائي داخل متصفحك — صدّر نسخة للاحتفاظ الدائم
        </span>
      </footer>

      <DocumentsDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        activeId={docId}
        onOpenDoc={(id) => loadDoc(id)}
        onRestoreVersion={(id, html) => {
          if (docIdRef.current === id && editor) {
            snapshotVersion(id);
            const restored = ensureRecords(html);
            recordsRef.current = restored; setRecords(restored); activeRecordRef.current = 0; setActiveRecord(0);
            editor.commands.setContent(html);
            saveRecords(id, ensureRecords(html));
            saveDoc(id, { html });
            updateStats(editor.getText());
            setSavedAt(Date.now());
          } else {
            snapshotVersion(id);
            saveRecords(id, ensureRecords(html));
            saveDoc(id, { html });
            loadDoc(id);
          }
        }}
      />
    </section>
  );
}
