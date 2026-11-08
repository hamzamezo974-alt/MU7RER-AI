import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, Download, FolderOpen, Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { addPages, adoptPaneBooks, getOriginalFile, newBook, saveBookMeta, storeOriginalFiles, type Book } from "@/lib/books";
import { listSources, catalogOriginalBook, recordSource, saveSource, renameGroup, setSourceKind, type CatalogSource } from "@/lib/source-catalog";
import { importFilesToPages } from "@/lib/import-book";
import { writeStorage } from "@/lib/workspace-storage";
import { useAccount } from "./AccountProvider";
import { SourceKindDialog } from "@/components/workspace/SourceKindDialog";

export function SourceLibrary() {
  const [sources, setSources] = useState<CatalogSource[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [groupId, setGroupId] = useState("original");
  const [page, setPage] = useState("0");
  const [pane, setPane] = useState("right");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [groupName, setGroupName] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const { user } = useAccount();
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const refresh = () => { try { adoptPaneBooks(); setSources(listSources()); } catch (caught) { toast.error(String(caught)); } };
  useEffect(refresh, []);
  const source = sources.find(item => item.id === selected);
  const group = source?.groups.find(item => item.id === groupId);
  const book = source ? groupId === "original" ? catalogOriginalBook(source) : group?.book : undefined;
  const selectSource = (item: CatalogSource) => { setSelected(item.id); setGroupId("original"); setPage("0"); setPane(item.kind === "print" ? "left" : "right"); };
  const importFiles = async (files: File[], kind: CatalogSource["kind"]) => {
    if (!files.length) return;
    setBusy(true); setProgress("جارٍ حفظ المصدر…");
    try {
      const pages = await importFilesToPages(files, (done, total, label) => setProgress(`${label} · ${done}/${total}`));
      if (!pages.length) throw new Error("لا صفحات قابلة للاستيراد");
      const initial = newBook(files[0]?.name.replace(/\.[^.]+$/, "") ?? "مصدر");
      const filesSaved = await storeOriginalFiles(initial, files);
      const imported = await addPages(initial, pages, filesSaved);
      const saved = recordSource(imported, "استيراد", [], imported.pages.map(item => item.id));
      const classified = { ...saved, kind, files: filesSaved };
      saveSource(classified);
      refresh(); selectSource(classified); toast.success(`حُفظ المصدر · ${pages.length} صفحة`);
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : "تعذّر حفظ المصدر"); refresh(); }
    finally { setBusy(false); setProgress(""); }
  };
  const openBook = (chosen: Book) => {
    const key = `mu7rer:book-${pane}`;
    saveBookMeta(key, chosen); writeStorage(`${key}:page-index`, page); writeStorage(`${key}:group-id`, groupId);
    void navigate({ to: "/editor" });
  };
  const download = async (fileId: string, name: string) => {
    if (!source) return;
    try {
      const blob = await getOriginalFile(source.id, fileId);
      if (!blob) throw new Error("تعذّر استدعاء الملف الأصلي");
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : "تعذّر التنزيل"); }
  };
  return <section className="mb-6 border-b pb-5">
    <SourceKindDialog open={pendingFiles.length > 0} onCancel={() => setPendingFiles([])} onChoose={kind => { const files = pendingFiles; setPendingFiles([]); void importFiles(files, kind); }} />
    <div className="mb-4 flex flex-wrap items-center gap-3"><BookOpen className="size-5 text-primary" /><h2 className="text-sm font-semibold">خزانة المصادر</h2><span className="text-xs text-muted-foreground">{sources.length} مصدر</span><div className="flex-1" /><Input aria-label="بحث في المصادر" placeholder="عنوان المصدر أو رمز النسخة" className="h-8 max-w-64 text-xs" value={query} onChange={event => setQuery(event.target.value)} /><Button size="sm" disabled={busy} onClick={() => { if (!user) { toast.error("سجّل الدخول أولًا لحفظ كتبك في حسابك"); void navigate({ to: "/account" }); return; } input.current?.click(); }}>{busy ? <Loader2 className="size-4 animate-spin" /> : <FolderOpen className="size-4" />}استيراد مصدر</Button><input ref={input} className="hidden" type="file" multiple accept="image/*,.pdf,.zip,.cbz" aria-label="ملفات المصدر" onChange={event => { if (user) setPendingFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} /></div>
    {progress && <p role="status" className="mb-3 text-xs text-primary">{progress}</p>}
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(180px,260px)_minmax(0,1fr)]">
      <div className="space-y-1">{sources.filter(item => `${item.title} ${item.witness}`.includes(query)).map(item => <Button key={item.id} variant={selected === item.id ? "secondary" : "ghost"} className="h-auto min-h-14 w-full justify-start whitespace-normal text-start" onClick={() => selectSource(item)}><BookOpen className="size-4 shrink-0" /><span className="min-w-0"><span className="block break-words text-xs font-semibold">{item.title}</span><span className="text-[10px] text-muted-foreground">{item.witness} · {item.originals.length} أصل · {item.groups.length} مجموعة</span></span></Button>)}{!sources.length && <p className="py-5 text-xs text-muted-foreground">لا مصادر محفوظة بعد.</p>}</div>
      {source && book ? <div className="min-w-0 border-s ps-5 max-sm:border-s-0 max-sm:ps-0"><div className="mb-4 flex flex-wrap items-center gap-3"><h3 className="break-words font-serif text-xl">{source.title}</h3><Select value={source.kind} onValueChange={value => { setSourceKind(source.id, value === "print" ? "print" : "manuscript"); refresh(); }}><SelectTrigger className="h-8 w-28" aria-label="نوع المصدر"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manuscript">مخطوط</SelectItem><SelectItem value="print">مطبوع</SelectItem></SelectContent></Select></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="space-y-1 text-xs">المجموعة<Select value={groupId} onValueChange={value => { setGroupId(value); setPage("0"); setGroupName(source.groups.find(item => item.id === value)?.name ?? ""); }}><SelectTrigger aria-label="مجموعة المصدر" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="original">الأصل المحفوظ</SelectItem>{source.groups.map(item => <SelectItem value={item.id} key={item.id}>{item.name} · {item.book.pages.length} صفحة</SelectItem>)}</SelectContent></Select></label><label className="space-y-1 text-xs">الصفحة<Select value={page} onValueChange={setPage}><SelectTrigger aria-label="صفحة الاستدعاء" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{book.pages.map((item, index) => <SelectItem value={String(index)} key={item.id}>{index + 1} · {item.name}</SelectItem>)}</SelectContent></Select></label><label className="space-y-1 text-xs">لوح العرض<Select value={pane} onValueChange={setPane}><SelectTrigger aria-label="لوح الاستدعاء" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="right">اليمين</SelectItem><SelectItem value="left">اليسار</SelectItem></SelectContent></Select></label><Button className="self-end" disabled={!book.pages.length} onClick={() => openBook(book)}><BookOpen className="size-4" />استدعاء</Button></div>
        {group && <form className="mt-3 flex gap-2" onSubmit={event => { event.preventDefault(); renameGroup(source.id, group.id, groupName); refresh(); }}><Input aria-label="اسم مجموعة العمل" value={groupName} onChange={event => setGroupName(event.target.value)} className="h-8 max-w-72 text-xs" /><Button size="sm" variant="outline" type="submit">حفظ الاسم</Button></form>}
        <div className="mt-5 border-t pt-3"><h4 className="mb-2 text-xs font-semibold">ملفات الاستيراد الأصلية</h4>{source.files.map(file => <div key={file.id} className="flex min-w-0 items-center gap-2 py-1"><span className="min-w-0 flex-1 truncate text-xs">{file.name}</span><span className="text-[10px] text-muted-foreground">{Math.round(file.size / 1024)} KB</span><Button size="icon" variant="ghost" title={`تنزيل الأصل ${file.name}`} onClick={() => void download(file.id, file.name)}><Download className="size-4" /></Button></div>)}{!source.files.length && <p className="text-xs text-muted-foreground">مصدر سابق: الصور محفوظة؛ ملف الاستيراد الأصلي غير متوفر.</p>}</div>
        <details className="mt-4 border-t pt-3"><summary className="cursor-pointer text-xs font-semibold"><History className="me-2 inline size-4" />سجل العمليات · {source.operations.length}</summary><ol className="mt-2 max-h-48 overflow-auto">{source.operations.map(operation => <li key={operation.id} className="border-b py-2 text-xs"><span className="font-semibold">{operation.kind}</span><span className="ms-3 text-muted-foreground">{new Date(operation.at).toLocaleString("ar")}</span><p className="mt-1 break-all text-[10px] text-muted-foreground">{operation.inputs.length} مدخل ← {operation.outputs.length} ناتج</p></li>)}</ol></details>
      </div> : <div className="py-5 text-xs text-muted-foreground">اختر مصدرًا من الخزانة.</div>}
    </div>
  </section>;
}