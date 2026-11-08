import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  BookOpenCheck,
  FileText,
  LayoutPanelTop,
  X,
  PenLine,
  Sparkles,
  StickyNote,
  Wrench,
  Search,
} from "lucide-react";

import { AiDock } from "@/components/workspace/AiDock";
import { NotesColumn } from "@/components/workspace/NotesColumn";
import { PrintView } from "@/components/workspace/PrintView";
import { BookPane, type BookPaneApi } from "@/components/workspace/BookPane";
import { markedNoteIds, type DocRecord, type PrintNoteRow, type PrintMemoLane } from "@/lib/records";
import { plateLabel, loadBookMeta, getPageBlob } from "@/lib/books";
import { blobToDataUrl } from "@/lib/image-process";
import { readStorage } from "@/lib/workspace-storage";
import { getNotesState } from "@/lib/notes";
import type { AssistantContext } from "@/lib/assistant-context";
import { PageReview } from "@/components/workspace/PageReview";
import { ResearchWorkspace } from "@/components/workspace/ResearchWorkspace";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TextEditor, type EditorApi } from "@/components/workspace/TextEditor";
import { Button } from "@/components/ui/button";
import { PanelCard } from "@/components/workspace/PanelCard";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "المُحَرِّر — بيئة تحقيق نصوص ومخطوطات بالذكاء الاصطناعي" },
      {
        name: "description",
        content:
          "بيئة عربية متكاملة لتحقيق المخطوطات والمطبوعات: محرر نصوص قوي، كتب كاملة، معالجة صور، نسخ آلي ذكي، حواشٍ، فهارس، ومساعد منفّذ.",
      },
      { property: "og:title", content: "المُحَرِّر — بيئة تحقيق نصوص ومخطوطات" },
      {
        property: "og:description",
        content:
          "حرّر النص في المنتصف، وقابله بصور المخطوط على الجانبين، واستورد كتابًا كاملًا، واستعن بالمساعد الذكي في التحقيق.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workspace,
});

type Mode = "tahqiq" | "print";

function Workspace() {
  const documentText = useRef("");
  const [activeNotes, setActiveNotes] = useState<string[]>([]);
  const activeFace = useRef<DocRecord | null>(null);
  const isMobile = useIsMobile();
  const [showRight, setShowRight] = useState(true);
  const [showLeft, setShowLeft] = useState(true);
  const [aiCollapsed, setAiCollapsed] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [mode, setMode] = useState<Mode>("tahqiq");
  const [drawer, setDrawer] = useState<string | null>(null);
  const [printDoc, setPrintDoc] = useState<{ html: string; title: string; printedNotes?: PrintNoteRow[]; memoLanes?: PrintMemoLane[] }>({ html: "", title: "" });
  const [layoutKey, setLayoutKey] = useState(0);
  const [aiHeight, setAiHeight] = useState(170);
  const [review, setReview] = useState<{ sourceId?: string; pageIds?: string[]; pane?: "right" | "left" } | null>(null);
  const [research, setResearch] = useState(false);
  useEffect(() => {
    const reset = () => { setShowRight(true); setShowLeft(true); setShowNotes(true); setAiCollapsed(true); setLayoutKey(value => value + 1); };
    window.addEventListener("reset-workspace-layout", reset);
    return () => window.removeEventListener("reset-workspace-layout", reset);
  }, []);
  const editorApiRef = useRef<EditorApi | null>(null);
  const rightBookRef = useRef<BookPaneApi | null>(null);
  const leftBookRef = useRef<BookPaneApi | null>(null);

  const getDocumentText = useCallback(() => documentText.current, []);

  const handleInsertText = useCallback((text: string) => {
    editorApiRef.current?.insertText(text);
  }, []);

  const switchMode = useCallback((next: Mode) => {
    if (next === "print") {
      const api = editorApiRef.current;
      setPrintDoc({ ...(api?.getPrint() ?? { html: "" }), title: api?.getTitle() ?? "" });
    }
    setMode(next);
  }, []);

  const handleOcr = useCallback((pane: "right" | "left", pageIndex: number, rangeEnd?: number) => {
    const book = (pane === "right" ? rightBookRef.current : leftBookRef.current)?.getBook();
    if (!book) return;
    editorApiRef.current?.preparePages(pane, book.id, book.pages);
    editorApiRef.current?.setRecordPage(pane, pageIndex);
    editorApiRef.current?.captureInsertion();
    setReview({ pane, sourceId: book.id, pageIds: book.pages.slice(pageIndex, (rangeEnd ?? pageIndex) + 1).map(page => page.id) });
  }, []);

  const rightPane = (
    <BookPane
      title="المخطوط (يمين)"
      paneKey="mu7rer:book-right"
      witness="الأصل"
      onReady={(api: BookPaneApi) => {
        rightBookRef.current = api;
        const face = activeFace.current;
        const book = api.getBook();
        if (face && book && book.id === face.rightSourceId) { const index = book.pages.findIndex(page => page.id === face.rightPageId); if (index >= 0 && index !== api.currentPageIndex) api.goToPage(index); }
      }}
      onRequestOcr={(page: number, end?: number) => void handleOcr("right", page, end)}
    />
  );

  const leftPane = (
    <BookPane
      title="المطبوعة (يسار)"
      paneKey="mu7rer:book-left"
      witness="ظ"
      onReady={(api: BookPaneApi) => {
        leftBookRef.current = api;
        const face = activeFace.current;
        const book = api.getBook();
        if (face && book && book.id === face.leftSourceId) { const index = book.pages.findIndex(page => page.id === face.leftPageId); if (index >= 0 && index !== api.currentPageIndex) api.goToPage(index); }
      }}
      onRequestOcr={(page: number, end?: number) => void handleOcr("left", page, end)}
    />
  );

  const getPageImage = async (pane: "right" | "left") => {
    const api = pane === "right" ? rightBookRef.current : leftBookRef.current;
    if (isMobile) {
      const book = loadBookMeta(`mu7rer:book-${pane}`);
      const index = Number(readStorage(`mu7rer:book-${pane}:page-index`) ?? 0);
      const page = book?.pages[index];
      if (!book || !page) return null;
      const blob = await getPageBlob(book.id, page.id);
      return blob ? { image: await blobToDataUrl(blob), label: `${pane === "right" ? "المخطوط" : "المطبوعة"} · ${book.title} · ${page.name}` } : null;
    }
    const image = await api?.getCurrentPageDataUrl();
    return image ? { image, label: `${pane === "right" ? "المخطوط" : "المطبوعة"} · ${plateLabel(api?.currentPageIndex ?? 0)}` } : null;
  };

  const getAssistantContext = async (): Promise<AssistantContext> => {
    const images = (await Promise.all((["right", "left"] as const).map(getPageImage))).filter((page): page is NonNullable<typeof page> => Boolean(page));
    const ids = new Set(markedNoteIds(editorApiRef.current?.getHTML() ?? ""));
    const state = getNotesState();
    const footnotes = state.notes.filter(note => ids.has(note.id)).map(note => `${state.lanes.find(lane => lane.id === note.laneId)?.name ?? "حاشية"} ${note.label}: ${note.text}`);
    return { recordLabel: activeFace.current?.label, recordText: documentText.current, selection: editorApiRef.current?.getSelection() ?? "", footnotes, images };
  };

  const editorPane = (
    <TextEditor
      onRecordChange={(record) => {
        activeFace.current = record; setActiveNotes(markedNoteIds(record.html));
        for (const pane of ["right", "left"] as const) {
          const api = pane === "right" ? rightBookRef.current : leftBookRef.current;
          const book = api?.getBook();
          const sourceId = pane === "right" ? record.rightSourceId : record.leftSourceId;
          const pageId = pane === "right" ? record.rightPageId : record.leftPageId;
          if (book?.id === sourceId) { const index = book?.pages.findIndex(page => page.id === pageId) ?? -1; if (index >= 0) api?.goToPage(index); }
        }
      }}
      onTextChange={(text) => {
        setActiveNotes(markedNoteIds(editorApiRef.current?.getHTML() ?? ""));
        documentText.current = text;
      }}
      onReady={(api) => {
        editorApiRef.current = api;
      }}
    />
  );

  const notesPanel = (
    <NotesColumn
      scope="text"
      noteIds={activeNotes}
      onAddNote={(lane) => editorApiRef.current?.insertNote(lane)}
      onFocusNote={(noteId) => {
        setDrawer(null);
        editorApiRef.current?.focusNote(noteId);
      }}
    />
  );

  const modeSwitch = (
    <div className="flex shrink-0 items-center gap-0.5 rounded-md border bg-background p-0.5">
      <Button size="icon" variant="ghost" className="size-6" aria-label="بحث المراجع والمقابلة" title="بحث المراجع والمقابلة" onClick={() => { editorApiRef.current?.captureInsertion(); setResearch(true); }}><Search className="size-3.5" /></Button>
      <Button size="icon" variant="ghost" className="size-6" aria-label="مراجعة نصوص الصفحات" title="مراجعة نصوص الصفحات" onClick={() => { editorApiRef.current?.captureInsertion(); setReview({}); }}><BookOpenCheck className="size-3.5" /></Button>
      <Button
        size="sm"
        variant="ghost"
        aria-label="واجهة التحقيق"
        className={cn("h-6 gap-1 px-2 text-[11px]", mode === "tahqiq" && "bg-secondary")}
        onClick={() => switchMode("tahqiq")}
      >
        <Wrench className="size-3.5" />
        <span className="hidden sm:inline">التحقيق</span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-label="عرض الطباعة"
        className={cn("h-6 gap-1 px-2 text-[11px]", mode === "print" && "bg-secondary")}
        onClick={() => switchMode("print")}
      >
        <FileText className="size-3.5" />
        <span className="hidden sm:inline">الطباعة</span>
      </Button>
    </div>
  );

  const reviewDialog = <Dialog open={review !== null} onOpenChange={open => { if (!open && window.confirm("إغلاق مراجعة الصفحات؟ تأكد من حفظ تعديلاتك.")) setReview(null); }}><DialogContent dir="rtl" className="max-h-[90dvh] w-[96vw] max-w-5xl overflow-y-auto p-4" aria-describedby={undefined}><DialogTitle className="text-sm">مراجعة الصفحات وتجميع النص</DialogTitle>{review && <PageReview onTranscript={(sourceId, pageId, text) => { if (review.pane) editorApiRef.current?.receiveTranscript(review.pane, sourceId, pageId, text); }} initialSourceId={review.sourceId} initialPageIds={review.pageIds} onOpenDocument={id => { editorApiRef.current?.openDocument(id); setReview(null); }} onInsert={text => { if (editorApiRef.current?.insertAtCaptured(text)) setReview(null); }} />}</DialogContent></Dialog>;
  const researchDialog = <Dialog open={research} onOpenChange={setResearch}><DialogContent dir="rtl" className="max-h-[90dvh] w-[96vw] max-w-5xl overflow-y-auto p-4" aria-describedby={undefined}><DialogTitle className="text-sm">المراجع والمقابلة</DialogTitle>{research && <ResearchWorkspace getText={getDocumentText} onInsertNote={(lane, text, evidence) => { const inserted = editorApiRef.current?.insertEvidenceNote(lane, text, evidence) ?? false; if (inserted) { setShowNotes(true); setResearch(false); if (isMobile) setDrawer("notes"); } return inserted; }} />}</DialogContent></Dialog>;

  const viewMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[11px]">
          <LayoutPanelTop className="size-3.5" /> العرض
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 text-xs">
        <DropdownMenuLabel className="text-[11px]">الألواح الظاهرة</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={showRight} onCheckedChange={(v) => setShowRight(!!v)}>
          المخطوط (يمين)
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={showLeft} onCheckedChange={(v) => setShowLeft(!!v)}>
          المطبوعة (يسار)
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={showNotes} onCheckedChange={(v) => setShowNotes(!!v)}>
          حواشي المتن
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={!aiCollapsed} onCheckedChange={(v) => setAiCollapsed(!v)}>
          المساعد الذكي
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isMobile) {
    const drawers = [
      { id: "right", label: "المخطوط", icon: BookOpen, side: "right" as const },
      { id: "notes", label: "الحواشي", icon: StickyNote, side: "bottom" as const },
      { id: "ai", label: "المساعد", icon: Sparkles, side: "bottom" as const },
      { id: "left", label: "المطبوعة", icon: BookOpenCheck, side: "left" as const },
    ];
    return (
      <div dir="rtl" className="flex h-full flex-col overflow-hidden bg-background">
        {reviewDialog}
        {researchDialog}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b bg-toolbar px-2 py-1 print:hidden">
          <h1 className="truncate font-serif text-sm font-bold text-primary">المُحَرِّر</h1>
          {modeSwitch}
        </header>
        <div className="min-h-0 flex-1 p-1">
          {mode === "print" ? (
            <PrintView {...printDoc} />
          ) : (
            <div className="flex h-full min-h-0 flex-col"><div className="min-h-0 flex-1"><PanelCard icon={PenLine} title="المتن">{editorPane}</PanelCard></div><AiDock getDocumentText={getDocumentText} onInsertText={handleInsertText} onApplyText={text => editorApiRef.current?.replaceText(text)} getSelection={() => editorApiRef.current?.getSelection() ?? ""} getPageImage={getPageImage} getContext={getAssistantContext} collapsed onToggle={() => setDrawer("ai")} /></div>
          )}
        </div>
        {mode === "tahqiq" && (
          <nav className="grid shrink-0 grid-cols-4 border-t bg-toolbar print:hidden">
            {drawers.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDrawer(item.id)}
                className="flex flex-col items-center gap-0.5 py-1 text-[10px] text-muted-foreground"
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>
        )}
        {drawers.map((item) => (
          <Sheet key={item.id} open={drawer === item.id} onOpenChange={(o) => !o && setDrawer(null)}>
            <SheetContent
              side={item.side}
              className={cn(
                "flex flex-col gap-0 p-0",
                item.side === "bottom" ? "h-[70dvh]" : "w-[88vw] max-w-none sm:max-w-none",
              )}
            >
              <SheetTitle className="border-b px-3 py-2 text-xs">{item.label}</SheetTitle>
              <div className="min-h-0 flex-1 overflow-hidden">
                {item.id === "right" && rightPane}
                {item.id === "left" && leftPane}
                {item.id === "notes" && notesPanel}
                {item.id === "ai" && (
                  <AiDock
                    getDocumentText={getDocumentText}
                    onInsertText={handleInsertText}
                    onApplyText={(text) => editorApiRef.current?.replaceText(text)}
                    getSelection={() => editorApiRef.current?.getSelection() ?? ""}
                    getPageImage={getPageImage}
                    getContext={getAssistantContext}
                    collapsed={false}
                    onToggle={() => setDrawer(null)}
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>
        ))}
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex h-full flex-col overflow-hidden bg-background">
      {reviewDialog}
      {researchDialog}
      <header className="flex h-9 shrink-0 items-center gap-2 border-b bg-toolbar px-2 print:hidden">
        <span className="text-[11px] font-semibold">أدوات مساحة التحقيق</span>
        {modeSwitch}
        <div className="flex-1" />
        {mode === "tahqiq" && viewMenu}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-1 p-1">
        {mode === "print" ? (
          <PrintView {...printDoc} />
        ) : (
          <>
            <div className="min-h-0 flex-1">
              <ResizablePanelGroup key={layoutKey} orientation="horizontal">
                {showRight && (
                  <>
                    <ResizablePanel id="right" defaultSize="22" minSize="14">
                      <ResizablePanelGroup orientation="vertical">
                      <ResizablePanel defaultSize="74" minSize="35">
                      <PanelCard
                        icon={BookOpen}
                        title="المخطوط"
                        actions={<HideBtn onClick={() => setShowRight(false)} />}
                      >
                        {rightPane}
                      </PanelCard>
                      </ResizablePanel>
                      <ResizableHandle className="h-1 shrink-0 cursor-row-resize bg-border hover:bg-primary/50" />
                      <ResizablePanel defaultSize="26" minSize="14"><div className="h-full min-h-0 overflow-hidden border bg-card"><NotesColumn scope="right" /></div></ResizablePanel>
                      </ResizablePanelGroup>
                    </ResizablePanel>
                    <ResizableHandle className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/50" />
                  </>
                )}
                <ResizablePanel id="editor" defaultSize="56" minSize="35">
                  <div className="flex h-full min-h-0 flex-col px-0.5"><div className="min-h-0 flex-1"><ResizablePanelGroup orientation="vertical">
                    <ResizablePanel defaultSize={showNotes ? "80" : "100"} minSize="45">
                      <PanelCard icon={PenLine} title="المتن" hint="المحرر الرئيسي">
                        {editorPane}
                      </PanelCard>
                    </ResizablePanel>
                    {showNotes && (
                      <><ResizableHandle className="h-1 shrink-0 cursor-row-resize bg-border hover:bg-primary/50" /><ResizablePanel defaultSize="20" minSize="10" maxSize="55"><div className="h-full overflow-y-auto border bg-card">{notesPanel}</div></ResizablePanel></>
                    )}
                  </ResizablePanelGroup></div>            <div className="relative shrink-0 overflow-hidden border-t" style={{ height: aiCollapsed ? "auto" : aiHeight, maxHeight: "30%" }}>
              {!aiCollapsed && <div role="separator" aria-label="تغيير ارتفاع المساعد" aria-orientation="horizontal" className="absolute inset-x-0 top-0 z-10 h-1 cursor-row-resize bg-border hover:bg-primary/50" onPointerDown={(event) => {
                const startY = event.clientY; const initial = aiHeight;
                const move = (pointer: PointerEvent) => setAiHeight(Math.min(window.innerHeight * 0.5, Math.max(100, initial + startY - pointer.clientY)));
                const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
                window.addEventListener("pointermove", move); window.addEventListener("pointerup", stop);
              }} /> }
              <AiDock
                getDocumentText={getDocumentText}
                onInsertText={handleInsertText}
                onApplyText={(text: string) => editorApiRef.current?.replaceText(text)}
                getSelection={() => editorApiRef.current?.getSelection() ?? ""}
                getPageImage={getPageImage}
                getContext={getAssistantContext}
                collapsed={aiCollapsed}
                onToggle={() => setAiCollapsed((value) => !value)}
              />
            </div>
                  </div>
                </ResizablePanel>
                {showLeft && (
                  <>
                    <ResizableHandle className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/50" />
                    <ResizablePanel id="left" defaultSize="22" minSize="14">
                      <ResizablePanelGroup orientation="vertical">
                      <ResizablePanel defaultSize="74" minSize="35">
                      <PanelCard
                        icon={BookOpenCheck}
                        title="المطبوعة"
                        actions={<HideBtn onClick={() => setShowLeft(false)} />}
                      >
                        {leftPane}
                      </PanelCard>
                      </ResizablePanel>
                      <ResizableHandle className="h-1 shrink-0 cursor-row-resize bg-border hover:bg-primary/50" />
                      <ResizablePanel defaultSize="26" minSize="14"><div className="h-full min-h-0 overflow-hidden border bg-card"><NotesColumn scope="left" /></div></ResizablePanel>
                      </ResizablePanelGroup>
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </div>

          </>
        )}
      </div>
    </div>
  );
}

function HideBtn({ onClick }: { onClick: () => void }) {
  return (
    <Button size="icon" variant="ghost" className="size-6" aria-label="إخفاء" onClick={onClick}>
      <X className="size-3.5" />
    </Button>
  );
}
