import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, Check, FileText, Loader2, Save, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listSources, catalogOriginalBook, type CatalogSource } from "@/lib/source-catalog";
import { getPageBlob } from "@/lib/books";
import { blobToDataUrl } from "@/lib/image-process";
import { aiRequest } from "@/lib/ai-client";
import { approveTranscript, assembleText, boundaryWarnings, currentRevision, isApproved, listAssemblies, listTranscripts, prepareAssembly, recordTranscriptError, saveTranscript, type PageTranscript } from "@/lib/page-transcripts";
import { toast } from "sonner";

export function PageReview({ initialSourceId, initialPageIds, onOpenDocument, onInsert, onTranscript }: { onTranscript?: (sourceId: string, pageId: string, text: string) => void; initialSourceId?: string | undefined; initialPageIds?: string[] | undefined; onOpenDocument: (id: string) => void; onInsert?: ((text: string) => void) | undefined }) {
  const [sources, setSources] = useState<CatalogSource[]>([]);
  const [sourceId, setSourceId] = useState(initialSourceId ?? "");
  const [groupId, setGroupId] = useState("original");
  const [pageId, setPageId] = useState(initialPageIds?.[0] ?? "");
  const [selected, setSelected] = useState<string[]>(initialPageIds ?? []);
  const [transcripts, setTranscripts] = useState<PageTranscript[]>([]);
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [imageError, setImageError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [decision, setDecision] = useState("");
  const [boundaryDecision, setBoundaryDecision] = useState("");
  const [labels, setLabels] = useState(false);
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState(listAssemblies);
  const stop = useRef(false);
  const refresh = () => { setTranscripts(listTranscripts()); setHistory(listAssemblies()); };
  useEffect(() => {
    try {
      const all = listSources(); setSources(all); refresh();
      const source = all.find(item => item.id === initialSourceId) ?? all[0];
      if (!source) return;
      setSourceId(source.id);
      const latestGroup = initialPageIds?.length ? [...source.groups].reverse().find(item => initialPageIds.every(id => item.book.pages.some(page => page.id === id))) : undefined;
      setGroupId(latestGroup?.id ?? "original");
      setPageId(initialPageIds?.[0] ?? source.originals[0]?.id ?? "");
    } catch (error) { toast.error(String(error)); }
    return () => { stop.current = true; };
  }, []);
  useEffect(() => {
    const update = () => {
      try { setSources(listSources()); } catch (error) { toast.error(String(error)); }
    };
    window.addEventListener("workspace-change", update);
    return () => window.removeEventListener("workspace-change", update);
  }, []);
  const source = sources.find(item => item.id === sourceId);
  const book = source ? groupId === "original" ? catalogOriginalBook(source) : source.groups.find(item => item.id === groupId)?.book : undefined;
  const page = book?.pages.find(item => item.id === pageId);
  const transcript = transcripts.find(item => item.sourceId === sourceId && item.pageId === pageId);
  const revision = currentRevision(transcript);
  const dirty = text !== (revision?.text ?? "");
  useEffect(() => {
    setText(revision?.text ?? "");
  }, [sourceId, pageId, revision?.id]);
  useEffect(() => {
    let live = true;
    let url = "";
    setImage(""); setImageError("");
    if (sourceId && pageId) void getPageBlob(sourceId, pageId).then(blob => {
      if (!live) return;
      if (!blob) { setImageError("صورة الصفحة غير متوفرة"); return; }
      url = URL.createObjectURL(blob); setImage(url);
    }).catch(() => { if (live) setImageError("تعذّر تحميل صورة الصفحة"); });
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [sourceId, pageId]);
  const canLeave = () => !dirty || window.confirm("النص غير محفوظ؛ هل تريد ترك التعديلات؟");
  const save = (approve = false) => {
    if (!sourceId || !pageId) return;
    try {
      if (dirty || !revision) saveTranscript(sourceId, pageId, text);
      if (approve) approveTranscript(sourceId, pageId);
      refresh(); setPreview(false);
      toast.success(approve ? "اعتمدت الصفحة" : "حُفظت مسودة الصفحة");
    } catch (error) { toast.error(String(error)); }
  };
  const transcribe = async () => {
    if (!source || !selected.length || busy || !canLeave()) return;
    setBusy(true); stop.current = false;
    let failures = 0;
    try {
      for (const [index, id] of selected.entries()) {
        if (stop.current) break;
        setProgress(`${index + 1} / ${selected.length}`);
        try {
          const blob = await getPageBlob(source.id, id);
          if (!blob) throw new Error("صورة الصفحة غير متوفرة");
          const result = await aiRequest({ task: "transcribe", image: await blobToDataUrl(blob), instruction: "انسخ النص الموجود في هذه الصفحة وحدها دون استكمال أو تخمين النص المفقود." });
          if (stop.current) break;
          saveTranscript(source.id, id, result, "ocr");
          onTranscript?.(source.id, id, result);
        } catch (error) {
          if (stop.current) break;
          failures++;
          recordTranscriptError(source.id, id, error instanceof Error ? error.message : "تعذّر النسخ");
          break;
        }
        refresh();
      }
      if (!stop.current) toast[failures ? "error" : "success"](failures ? `تعذّر نسخ ${failures} صفحة؛ حُفظت الصفحات الناجحة` : "حُفظت المسودات للمراجعة دون إدراجها في المتن");
    } finally { setBusy(false); setProgress(""); }
  };
  let prepared: ReturnType<typeof prepareAssembly> | undefined;
  let assemblyError = "";
  if (book && selected.length) {
    try { prepared = prepareAssembly(sourceId, book.pages, selected, transcripts); }
    catch (error) { assemblyError = error instanceof Error ? error.message : String(error); }
  }
  const warnings = prepared ? boundaryWarnings(prepared.inputs) : [];
  const move = (index: number, delta: number) => {
    const next = [...selected]; const target = index + delta;
    const current = next[index]; const other = next[target];
    if (!current || !other) return;
    next[index] = other; next[target] = current;
    setSelected(next); setPreview(false);
  };
  const changeGroup = (id: string) => {
    if (!canLeave() || !source) return;
    const nextBook = id === "original" ? catalogOriginalBook(source) : source.groups.find(item => item.id === id)?.book;
    setGroupId(id); setSelected([]); setPageId(nextBook?.pages[0]?.id ?? ""); setPreview(false); setDecision(""); setBoundaryDecision("");
  };
  return <section dir="rtl" aria-label="مراجعة نصوص الصفحات" className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center gap-2 border-b pb-3">
      <h2 className="me-auto text-sm font-semibold">نصوص الصفحات</h2>
      <Select value={sourceId} disabled={busy} onValueChange={id => { if (!canLeave()) return; const next = sources.find(item => item.id === id); setSourceId(id); setGroupId("original"); setPageId(next?.originals[0]?.id ?? ""); setSelected([]); setPreview(false); setDecision(""); setBoundaryDecision(""); }}><SelectTrigger aria-label="مصدر نصوص الصفحات" className="w-48 max-w-full text-xs"><SelectValue placeholder="المصدر" /></SelectTrigger><SelectContent>{sources.map(item => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent></Select>
      <Select value={groupId} disabled={busy} onValueChange={changeGroup}><SelectTrigger aria-label="مجموعة نصوص الصفحات" className="w-48 max-w-full text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="original">الأصل المحفوظ</SelectItem>{source?.groups.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
    </div>
    {!book?.pages.length ? <p className="text-xs text-muted-foreground">لا صفحات محفوظة في هذه المجموعة.</p> : <>
      <div className="grid min-w-0 gap-3 lg:grid-cols-[190px_minmax(0,1fr)]">
        <div className="max-h-96 overflow-auto border-e pe-2 max-lg:max-h-40 max-lg:border-e-0">
          {book.pages.map((item, index) => {
            const draft = transcripts.find(entry => entry.sourceId === sourceId && entry.pageId === item.id);
            const status = draft?.error ? "خطأ في النسخ" : isApproved(draft) ? "معتمدة" : currentRevision(draft) ? draft?.approvedId ? "تحتاج مراجعة" : "مسودة" : "لم تُنسخ";
            return <div key={item.id} className="flex items-center gap-2 border-b py-1">
              <Checkbox aria-label={`اختيار الصفحة ${index + 1}`} disabled={busy} checked={selected.includes(item.id)} onCheckedChange={value => { setSelected(old => value === true ? [...old, item.id] : old.filter(id => id !== item.id)); setPreview(false); }} />
              <Button variant={item.id === pageId ? "secondary" : "ghost"} className="h-auto min-h-10 min-w-0 flex-1 justify-start whitespace-normal px-2 text-start" disabled={busy} onClick={() => { if (canLeave()) setPageId(item.id); }}><span className="min-w-0"><span className="block break-words text-xs">{index + 1} · {item.name}</span><span className="text-[10px] text-muted-foreground">{status}</span></span></Button>
            </div>;
          })}
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2"><span className="me-auto break-words text-xs font-semibold">{page?.name}</span><Button size="sm" variant="outline" disabled={busy || !text.trim()} onClick={() => save()}><Save className="size-3.5" />حفظ المسودة</Button><Button size="sm" disabled={busy || !text.trim()} onClick={() => save(true)}><Check className="size-3.5" />اعتماد الصفحة</Button></div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="flex h-80 min-w-0 items-center justify-center overflow-auto border bg-muted/30 sm:h-96">{image ? <img src={image} alt={`أصل الصفحة ${page?.name ?? ""}`} className="h-full w-full object-contain" /> : <span className="text-xs text-muted-foreground">{imageError || "جارٍ تحميل الصورة…"}</span>}</div>
            <textarea aria-label="نص مراجعة الصفحة" value={text} disabled={busy} onChange={event => { setText(event.target.value); setPreview(false); }} placeholder="نص الصفحة…" className="h-80 min-w-0 w-full resize-none rounded-md border bg-background p-3 font-serif text-base leading-8 outline-none focus:border-ring sm:h-96" />
          </div>
          {transcript?.error && <p role="alert" className="mt-2 break-words text-xs text-destructive">{transcript.error}</p>}
          <details className="mt-3 text-xs"><summary className="cursor-pointer text-muted-foreground">النسخ المحفوظة · {transcript?.revisions.length ?? 0}{dirty ? " · تعديلات غير محفوظة" : ""}</summary>{[...(transcript?.revisions ?? [])].reverse().map(item => <div className="mt-2 border-t pt-2" key={item.id}><div className="flex flex-wrap items-center gap-2"><span className="me-auto">{new Date(item.at).toLocaleString("ar")} · {item.method === "ocr" ? "نسخ آلي" : "مراجعة يدوية"}{item.id === transcript?.approvedId ? " · معتمدة" : ""}</span><Button size="sm" variant="ghost" disabled={busy} onClick={() => { if (canLeave()) setText(item.text); }}>استعادة للمراجعة</Button></div><p className="max-h-24 overflow-auto whitespace-pre-wrap font-serif leading-6">{item.text}</p>{item.method === "ocr" && <details><summary className="cursor-pointer text-muted-foreground">القراءة الآلية الأصلية</summary><p className="whitespace-pre-wrap leading-6">{item.raw}</p></details>}</div>)}</details>
        </div>
      </div>
      <div className="border-t pt-3">
        <div className="flex flex-wrap items-center gap-2"><h3 className="me-auto text-xs font-semibold">المختارات · {selected.length}</h3><Button size="sm" variant="outline" disabled={busy} onClick={() => { setSelected(book.pages.filter(item => isApproved(transcripts.find(entry => entry.sourceId === sourceId && entry.pageId === item.id))).map(item => item.id)); setPreview(false); }}>اختيار المعتمد</Button><Button size="sm" variant="outline" disabled={busy || !selected.length} onClick={() => void transcribe()}>{busy ? <Loader2 className="size-3.5 animate-spin" /> : <ScanText className="size-3.5" />}نسخ المختارات {progress}</Button>{busy && <Button size="sm" variant="ghost" onClick={() => { stop.current = true; }}>إيقاف</Button>}</div>
        <ol className="mt-2 grid gap-x-3 sm:grid-cols-2">{selected.map((id, index) => <li key={id} className="flex min-w-0 items-center gap-1 border-b py-1"><span className="min-w-0 flex-1 break-words text-xs">{index + 1} · {book.pages.find(item => item.id === id)?.name}</span><Button size="icon" variant="ghost" className="size-7" aria-label={`تقديم المختارة ${index + 1}`} disabled={busy || index === 0} onClick={() => move(index, -1)}><ArrowUp className="size-3.5" /></Button><Button size="icon" variant="ghost" className="size-7" aria-label={`تأخير المختارة ${index + 1}`} disabled={busy || index === selected.length - 1} onClick={() => move(index, 1)}><ArrowDown className="size-3.5" /></Button></li>)}</ol>
        {assemblyError && <p className="mt-2 text-xs text-destructive">{assemblyError}</p>}
        <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" disabled={busy || dirty || !prepared} variant="secondary" onClick={() => setPreview(true)}><FileText className="size-3.5" />معاينة التجميع</Button>{onInsert && <Button size="sm" variant="outline" disabled={busy || dirty || !isApproved(transcript) || !revision} onClick={() => { if (revision) onInsert(revision.text); }}>إدراج الصفحة المعتمدة عند المؤشر</Button>}</div>
        {preview && prepared && <div className="mt-3 space-y-3 border-t pt-3">
          <p className="text-xs">{prepared.inputs.length} صفحة معتمدة · {prepared.excluded.length} صفحة مستبعدة</p>
          {prepared.excluded.length > 0 && <><p className="break-words text-xs text-muted-foreground">المستبعدة: {book.pages.filter(item => prepared.excluded.includes(item.id)).map(item => item.name).join("، ")}</p><Input aria-label="سبب التجميع الجزئي" placeholder="سبب استبعاد الصفحات / التجميع الجزئي" value={decision} onChange={event => setDecision(event.target.value)} /></>}
          {warnings.length > 0 && <><p className="text-xs font-semibold text-destructive">تكرار محتمل عند حدود الصفحات</p>{warnings.map(warning => <p key={warning} className="break-words font-serif text-sm">{warning}</p>)}<Input aria-label="قرار حدود الصفحات" placeholder="قرار المراجعة؛ لن يُحذف أي نص تلقائيًا" value={boundaryDecision} onChange={event => setBoundaryDecision(event.target.value)} /></>}
          <label className="flex items-center gap-2 text-xs"><Checkbox checked={labels} onCheckedChange={value => setLabels(value === true)} />إضافة أسماء الصفحات بين النصوص</label>
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap border bg-muted/20 p-3 font-serif text-sm leading-7">{prepared.text}</pre>
          <Button size="sm" disabled={(prepared.excluded.length > 0 && !decision.trim()) || (warnings.length > 0 && !boundaryDecision.trim())} onClick={() => { try { const result = assembleText(sourceId, groupId, source?.title ?? "نص", book.pages, selected, decision, boundaryDecision, labels); refresh(); toast.success("حُفظ التجميع في مستند مستقل"); onOpenDocument(result.docId); } catch (error) { toast.error(String(error)); } }}>حفظ التجميع وفتح المتن</Button>
        </div>}
      </div>
      {history.filter(item => item.sourceId === sourceId).length > 0 && <details className="border-t pt-3 text-xs"><summary className="cursor-pointer font-semibold">التجميعات المحفوظة</summary>{history.filter(item => item.sourceId === sourceId).map(item => <div key={item.id} className="flex flex-wrap items-center gap-2 border-b py-2"><span className="me-auto">{item.inputs.length} صفحة · {item.excluded.length ? "جزئي" : "معتمد"} · {new Date(item.at).toLocaleString("ar")}</span><Button size="sm" variant="outline" onClick={() => onOpenDocument(item.docId)}>فتح المتن</Button><details className="w-full"><summary className="cursor-pointer text-muted-foreground">سجل التجميع</summary><p className="mt-2 break-words">{item.inputs.map(input => input.name).join(" ← ")}</p><p>{item.decision} {item.boundaryDecision}</p></details></div>)}</details>}
    </>}
  </section>;
}