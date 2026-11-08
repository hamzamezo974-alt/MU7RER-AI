import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { FileText, Plus, Copy, RotateCcw, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDoc, listDocs, setActiveDocId, snapshotVersion, saveDoc, duplicateDoc, formatWhen, type Mu7rerDoc } from "@/lib/documents";
import { loadBookMeta, type Book } from "@/lib/books";
import { toast } from "sonner";
import { SourceLibrary } from "./SourceLibrary";
import { PageReview } from "@/components/workspace/PageReview";
export function LibraryPage({ history = false }: { history?: boolean }) {
  const [docs, setDocs] = useState<Mu7rerDoc[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  useEffect(() => { setDocs(listDocs()); setBooks([loadBookMeta("mu7rer:book-right"), loadBookMeta("mu7rer:book-left")].filter((book): book is Book => Boolean(book))); }, []);
  const open = (id: string) => { setActiveDocId(id); void navigate({ to: "/editor" }); };
  return <div className="h-full overflow-auto p-4"><div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b pb-3"><Input aria-label="بحث في المستندات" placeholder="ابحث بعنوان المستند…" value={query} onChange={e => setQuery(e.target.value)} className="h-8 max-w-sm text-xs" />{!history && <Button size="sm" onClick={() => open(createDoc().id)}><Plus className="size-3.5" />مستند جديد</Button>}</div>
    {!history && <SourceLibrary />}
    {!history && <div className="mb-6 border-b pb-5"><PageReview onOpenDocument={open} /></div>}
    <h2 className="mb-3 text-xs font-semibold">{history ? "سجل المستندات والنسخ المحفوظة" : "المستندات"}</h2><div className="grid gap-3 sm:grid-cols-2">{docs.filter(doc => doc.title.includes(query)).map(doc => <article key={doc.id} className="min-w-0 rounded-md border bg-card p-3"><div className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-primary" /><h3 className="truncate text-xs font-semibold">{doc.title}</h3></div><p className="my-2 text-[10px] text-muted-foreground">{formatWhen(doc.updatedAt)}</p><div className="flex gap-1"><Button size="sm" variant="secondary" className="h-7" onClick={() => open(doc.id)}>فتح</Button>{!history && <Button size="icon" variant="ghost" className="size-7" aria-label="نسخ المستند" onClick={() => { duplicateDoc(doc.id); setDocs(listDocs()); }}><Copy className="size-3.5" /></Button>}</div>{history && <div className="mt-3 border-t pt-2">{doc.versions.length === 0 ? <p className="text-[10px] text-muted-foreground">لا نسخ سابقة محفوظة</p> : doc.versions.map(version => <div key={version.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b py-1"><span className="truncate text-[10px]">{formatWhen(version.createdAt)}</span><Button variant="ghost" size="sm" className="h-6 px-1 text-[10px]" onClick={() => { if (!window.confirm("استعادة هذه النسخة؟ ستُحفظ النسخة الحالية قبل الاستعادة.")) return; snapshotVersion(doc.id); saveDoc(doc.id, { html: version.html }); setDocs(listDocs()); toast.success("استُعيدت النسخة"); }}><RotateCcw className="size-3" />استعادة</Button></div>)}</div>}</article>)}</div>{docs.length === 0 && <p className="mt-5 text-xs text-muted-foreground">لا مستندات محفوظة بعد.</p>}</div>;
}