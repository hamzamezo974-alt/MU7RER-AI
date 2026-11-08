import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, Check, Download, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listSources } from "@/lib/source-catalog";
import { currentRevision, listAssemblies, listTranscripts } from "@/lib/page-transcripts";
import { getPageBlob } from "@/lib/books";
import { getActiveDocId } from "@/lib/documents";
import { getNotesState, type NoteLane } from "@/lib/notes";
import { decideComparison, formatEvidence, listComparisons, listEvidence, removeEvidence, saveComparison, saveEvidence, searchEvidence, type Evidence, type EvidenceDraft } from "@/lib/research";
import { downloadBlob } from "@/lib/document-export";
import { toast } from "sonner";
import { LibraryBridge } from "./LibraryBridge";

const blank: EvidenceDraft = { title: "", author: "", edition: "", volume: "", filePage: "", printedPage: "", category: "", quote: "", comment: "", sourceId: "", pageId: "" };
const fields: [Exclude<keyof EvidenceDraft, "library">, string][] = [["title", "عنوان المرجع"], ["author", "المؤلف"], ["edition", "الطبعة"], ["volume", "الجزء"], ["filePage", "رقم صفحة الملف"], ["printedPage", "رقم الصفحة المطبوعة"], ["category", "المجال"]];
const selectClass = "h-9 min-w-0 rounded-md border bg-background px-2 text-xs";
const textClass = "min-h-32 w-full resize-y rounded-md border bg-background p-3 font-serif text-base leading-7";
export function ResearchWorkspace({ getText, onInsertNote }: { getText?: () => string; onInsertNote?: (lane: NoteLane, text: string, evidence: Evidence[]) => boolean }) {
  const [entries, setEntries] = useState(listEvidence);
  const [comparisons, setComparisons] = useState(listComparisons);
  const [sources, setSources] = useState(listSources);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [loose, setLoose] = useState(false);
  const [match, setMatch] = useState<"contains" | "exact">("contains");
  const [draft, setDraft] = useState<EvidenceDraft>({ ...blank });
  const [editing, setEditing] = useState<string | undefined>();
  const [form, setForm] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<"citation" | "quote" | "both">("both");
  const [opening, setOpening] = useState("");
  const [connector, setConnector] = useState("؛ ");
  const [laneId, setLaneId] = useState("takhrij");
  const [image, setImage] = useState("");
  const [base, setBase] = useState(() => getText?.() ?? "");
  const [variant, setVariant] = useState("");
  const [witness, setWitness] = useState("");
  const [location, setLocation] = useState("");
  const [compareSource, setCompareSource] = useState("");
  const [comparePage, setComparePage] = useState("");
  const [tab, setTab] = useState("references");
  const refresh = () => { setEntries(listEvidence()); setComparisons(listComparisons()); setSources(listSources()); };
  useEffect(() => { window.addEventListener("workspace-change", refresh); return () => window.removeEventListener("workspace-change", refresh); }, []);
  useEffect(() => { return () => { if (image) URL.revokeObjectURL(image); }; }, [image]);
  const chosen = selected.flatMap(id => { const entry = entries.find(item => item.id === id); return entry ? [entry] : []; });
  const preview = chosen.length ? formatEvidence(chosen, mode, opening, connector) : "";
  const lanes = getNotesState().lanes.filter(lane => lane.scope === "text" && lane.kind === "notes");
  const move = (index: number, delta: number) => {
    const next = [...selected]; const a = next[index]; const b = next[index + delta]; if (!a || !b) return;
    next[index] = b; next[index + delta] = a; setSelected(next);
  };
  const showOriginal = async (entry: Evidence) => {
    if (!entry.sourceId || !entry.pageId) { toast.error("لم تُربط صورة أصل بهذا الشاهد"); return; }
    try { const blob = await getPageBlob(entry.sourceId, entry.pageId); if (!blob) throw new Error("صورة الأصل غير متوفرة"); setImage(URL.createObjectURL(blob)); } catch (error) { toast.error(String(error)); }
  };
  const report = () => {
    const data = { exportedAt: new Date().toISOString(), sources: listSources(), evidence: listEvidence(), assemblies: listAssemblies(), comparisons: listComparisons(), notes: getNotesState() };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" }), "mu7rer-research-report.json");
  };
  return <section dir="rtl" aria-label="المراجع والمقابلة" className="min-w-0 space-y-4">
    <Tabs value={tab} onValueChange={setTab}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"><TabsList className="h-auto flex-wrap"><TabsTrigger value="library">جسر المكتبات</TabsTrigger><TabsTrigger value="references">المراجع والبطاقات</TabsTrigger><TabsTrigger value="comparison">المقابلة</TabsTrigger><TabsTrigger value="report">تقرير التحقيق</TabsTrigger></TabsList></div>
      <TabsContent value="library"><LibraryBridge /></TabsContent>
      <TabsContent value="references" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2"><Search className="size-4" /><Input aria-label="بحث الشواهد" placeholder="بحث الشواهد…" className="min-w-32 flex-1" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="مجال البحث" className={selectClass} value={category} onChange={e => setCategory(e.target.value)}><option value="">كل المجالات</option>{[...new Set(entries.map(item => item.category).filter(Boolean))].map(value => <option key={value}>{value}</option>)}</select><select aria-label="نوع المطابقة" className={selectClass} value={match} onChange={e => setMatch(e.target.value === "exact" ? "exact" : "contains")}><option value="contains">يحتوي</option><option value="exact">مطابقة كاملة</option></select><label className="flex items-center gap-2 text-xs"><Checkbox checked={loose} onCheckedChange={v => setLoose(v === true)} />دون تشكيل</label><Button size="sm" onClick={() => { setEditing(undefined); setDraft({ ...blank }); setForm(true); }}><Plus className="size-4" />بطاقة مرجع</Button></div>
        {form && <form className="space-y-3 border-b pb-4" onSubmit={e => { e.preventDefault(); try { saveEvidence(draft, editing); setForm(false); setDraft({ ...blank }); setEditing(undefined); refresh(); toast.success("حُفظت بطاقة المرجع"); } catch (error) { toast.error(String(error)); } }}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([key, label]) => <label key={key} className="space-y-1 text-xs">{label}<Input aria-label={label} required={key === "title"} value={draft[key]} onChange={e => setDraft(old => ({ ...old, [key]: e.target.value }))} /></label>)}</div>
          <div className="flex flex-wrap gap-2"><select aria-label="أصل الشاهد" className={selectClass} value={draft.sourceId} onChange={e => { const source = sources.find(item => item.id === e.target.value); setDraft(old => ({ ...old, sourceId: e.target.value, pageId: "", title: old.title || source?.title || "" })); }}><option value="">دون مصدر صوري مرتبط</option>{sources.map(source => <option key={source.id} value={source.id}>{source.title}</option>)}</select><select aria-label="صفحة الشاهد" className={selectClass} value={draft.pageId} onChange={e => setDraft(old => ({ ...old, pageId: e.target.value }))}><option value="">اختر الصفحة</option>{sources.find(source => source.id === draft.sourceId)?.pages.map(page => <option key={page.id} value={page.id}>{page.name}</option>)}</select><Button type="button" size="sm" variant="outline" disabled={!draft.pageId} onClick={() => { const revision = currentRevision(listTranscripts().find(item => item.sourceId === draft.sourceId && item.pageId === draft.pageId)); if (!revision) { toast.error("هذه الصفحة غير منسوخة"); return; } setDraft(old => ({ ...old, quote: revision.text })); }}>استدعاء نص الصفحة</Button></div>
          <label className="block space-y-1 text-xs">نص الشاهد<textarea aria-label="نص الشاهد" className={textClass} value={draft.quote} onChange={e => setDraft(old => ({ ...old, quote: e.target.value }))} /></label><label className="block space-y-1 text-xs">التعليق<textarea aria-label="تعليق المرجع" className={textClass} value={draft.comment} onChange={e => setDraft(old => ({ ...old, comment: e.target.value }))} /></label><div className="flex gap-2"><Button type="submit" size="sm"><Check className="size-4" />حفظ البطاقة</Button><Button type="button" size="sm" variant="ghost" onClick={() => setForm(false)}>إلغاء</Button></div>
        </form>}
        <div className="divide-y">{searchEvidence(entries, query, category, match, loose).map(entry => <article key={entry.id} className="space-y-2 py-3"><div className="flex min-w-0 items-center gap-2"><Checkbox aria-label={`اختيار شاهد ${entry.title}`} checked={selected.includes(entry.id)} onCheckedChange={v => setSelected(old => v === true ? [...old, entry.id] : old.filter(id => id !== entry.id))} /><h3 className="min-w-0 flex-1 break-words text-sm font-semibold">{entry.title}</h3><Button size="sm" variant="ghost" onClick={() => { setDraft(entry); setEditing(entry.id); setForm(true); }}>مراجعة البطاقة</Button><Button size="icon" variant="ghost" aria-label={`فتح أصل ${entry.title}`} disabled={!entry.pageId} onClick={() => void showOriginal(entry)}><BookOpen className="size-4" /></Button><Button size="icon" variant="ghost" aria-label={`حذف مرجع ${entry.title}`} onClick={() => { if (window.confirm("حذف بطاقة المرجع؟")) { removeEvidence(entry.id); setSelected(old => old.filter(id => id !== entry.id)); refresh(); } }}><Trash2 className="size-4" /></Button></div><p className="whitespace-pre-wrap font-serif text-base leading-7">{entry.quote}</p><p className="text-xs text-muted-foreground">{entry.edition} {entry.printedPage && `ص ${entry.printedPage}`} {entry.filePage && `· صفحة الملف ${entry.filePage}`}</p></article>)}</div>
        {entries.filter(item => !item.quote.trim()).map(entry => <div className="flex items-center gap-2 border-b py-2 text-xs" key={entry.id}><span className="flex-1">{entry.title} · غير مفهرس</span><Button size="sm" variant="outline" onClick={() => { setDraft(entry); setEditing(entry.id); setForm(true); }}>مراجعة البطاقة</Button></div>)}
        {image && <div className="border-t pt-3"><Button size="sm" variant="ghost" onClick={() => setImage("")}>إغلاق الأصل</Button><img src={image} alt="أصل الشاهد المختار" className="max-h-96 w-full object-contain" /></div>}
        {!!chosen.length && <div className="space-y-3 border-t pt-3"><h3 className="text-sm font-semibold">المختارات · {chosen.length}</h3><ol>{chosen.map((entry, index) => <li key={entry.id} className="flex items-center gap-2 border-b py-1"><span className="flex-1 text-xs">{index + 1} · {entry.title}</span><Button size="icon" variant="ghost" aria-label={`تقديم الشاهد ${index + 1}`} disabled={!index} onClick={() => move(index, -1)}><ArrowUp className="size-4" /></Button><Button size="icon" variant="ghost" aria-label={`تأخير الشاهد ${index + 1}`} disabled={index === chosen.length - 1} onClick={() => move(index, 1)}><ArrowDown className="size-4" /></Button></li>)}</ol><div className="flex flex-wrap gap-2"><select aria-label="صيغة الأدلة" className={selectClass} value={mode} onChange={e => setMode(e.target.value as typeof mode)}><option value="both">الشاهد والعزو</option><option value="citation">العزو فقط</option><option value="quote">الشاهد فقط</option></select><Input aria-label="افتتاح الحاشية" placeholder="افتتاح الحاشية" value={opening} onChange={e => setOpening(e.target.value)} className="w-48" /><Input aria-label="رابط الشواهد" value={connector} onChange={e => setConnector(e.target.value)} className="w-24" /><select aria-label="نوع حاشية الأدلة" className={selectClass} value={laneId} onChange={e => setLaneId(e.target.value)}>{lanes.map(lane => <option key={lane.id} value={lane.id}>{lane.name}</option>)}</select></div><pre className="max-h-64 overflow-auto whitespace-pre-wrap border p-3 font-serif text-base leading-7">{preview}</pre>{onInsertNote && <Button size="sm" onClick={() => { const lane = lanes.find(item => item.id === laneId); if (lane && onInsertNote(lane, preview, chosen)) toast.success("أُدرجت الأدلة في الحاشية"); }}>إقرار وإدراج الحاشية عند الموضع المثبت</Button>}</div>}
      </TabsContent>
      <TabsContent value="comparison" className="space-y-3"><div className="grid gap-2 sm:grid-cols-2"><label className="space-y-1 text-xs">النسخة<Input aria-label="نسخة المقابلة" value={witness} onChange={e => setWitness(e.target.value)} /></label><label className="space-y-1 text-xs">الموضع<Input aria-label="موضع المقابلة" value={location} onChange={e => setLocation(e.target.value)} /></label><select aria-label="مصدر المقابلة" className={selectClass} value={compareSource} onChange={e => { setCompareSource(e.target.value); setComparePage(""); }}><option value="">مرجع خارجي</option>{sources.map(source => <option key={source.id} value={source.id}>{source.title}</option>)}</select><select aria-label="صفحة المقابلة" className={selectClass} value={comparePage} onChange={e => setComparePage(e.target.value)}><option value="">اختر الصفحة</option>{sources.find(source => source.id === compareSource)?.pages.map(page => <option key={page.id} value={page.id}>{page.name}</option>)}</select></div><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs">النص الأساس<textarea aria-label="النص الأساس" className={textClass} value={base} onChange={e => setBase(e.target.value)} /></label><label className="space-y-1 text-xs">نص النسخة<textarea aria-label="نص النسخة" className={textClass} value={variant} onChange={e => setVariant(e.target.value)} /></label></div><Button size="sm" onClick={() => { try { saveComparison({ docId: getActiveDocId() ?? "", sourceId: compareSource, pageId: comparePage, witness, location, base, variant }); refresh(); } catch (error) { toast.error(String(error)); } }}>حفظ المقابلة وعرض الفروق</Button>{comparisons.map(comparison => <article className="space-y-2 border-t pt-3" key={comparison.id}><h3 className="text-sm font-semibold">{comparison.witness} · {comparison.location}</h3>{!comparison.changes.length && <p className="text-xs">لا فروق نصية</p>}{comparison.changes.map(change => <div key={change.id} className="flex flex-wrap items-center gap-2 border-b py-2"><span className="min-w-0 flex-1 whitespace-pre-wrap break-words font-serif">{change.before || "∅"} ← {change.after || "∅"}</span><select aria-label={`قرار فرق ${change.before || change.after}`} className={selectClass} value={change.decision} onChange={e => { decideComparison(comparison.id, change.id, e.target.value as typeof change.decision); refresh(); }}><option value="pending">بانتظار المراجعة</option><option value="accepted">قبول</option><option value="rejected">رفض</option><option value="deferred">تأجيل</option></select></div>)}</article>)}</TabsContent>
      <TabsContent value="report" className="space-y-4"><dl className="grid grid-cols-2 gap-3 text-sm"><dt>المصادر والأصول</dt><dd>{sources.length}</dd><dt>بطاقات المراجع</dt><dd>{entries.length}</dd><dt>التجميعات المحفوظة</dt><dd>{listAssemblies().length}</dd><dt>المقابلات</dt><dd>{comparisons.length}</dd><dt>فروق تنتظر القرار</dt><dd>{comparisons.reduce((sum, item) => sum + item.changes.filter(change => ["pending", "deferred"].includes(change.decision)).length, 0)}</dd></dl><Button size="sm" onClick={report}><Download className="size-4" />تنزيل تقرير المصادر والقرارات</Button></TabsContent>
    </Tabs>
  </section>;
}