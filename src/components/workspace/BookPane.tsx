import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  FileArchive,
  FileImage,
  FileText,
  FolderOpen,
  ImagePlus,
  Loader2,
  Maximize,
  Minus,
  Plus,
  RotateCw,
  ScanText,
  Settings2,
  Trash2,
  Wand2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  type Book,
  type BookPage,
  addPages,
  clearBook,
  getPageBlob,
  loadBookMeta,
  newBook,
  plateLabel,
  removePage,
  saveBookMeta,
  storeOriginalFiles,
  adoptPaneBooks,
} from "@/lib/books";
import { listSources, recordSource, saveSource } from "@/lib/source-catalog";
import { readStorage, writeStorage } from "@/lib/workspace-storage";
import {
  DEFAULT_PROCESS,
  PROCESS_PRESETS,
  type ProcessSettings,
  blobToDataUrl,
  isDefaultProcess,
  processImageBlob,
} from "@/lib/image-process";
import { importFilesToPages } from "@/lib/import-book";
import { SourceKindDialog } from "./SourceKindDialog";
import { useAccount } from "@/components/site/AccountProvider";
import { PageTools } from "./PageTools";
import { mergePages, moveItem } from "@/lib/page-layout";
import { Crop, Undo2, ArrowLeft, ArrowRight, Combine } from "lucide-react";
import { toast } from "sonner";

export type BookPaneApi = {
  getBook: () => Book | null;
  currentPageIndex: number;
  getCurrentPageDataUrl: () => Promise<string | null>;
  getPageDataUrl: (index: number) => Promise<string | null>;
  goToPage: (index: number) => void;
};

type PageView = BookPage & { src?: string; processed?: boolean };

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 12;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function BookPane({
  title,
  paneKey,
  witness,
  onReady,
  onRequestOcr,
}: {
  title: string;
  paneKey: string;
  witness?: string;
  onReady?: (api: BookPaneApi) => void;
  onRequestOcr?: (pageIndex: number, rangeEnd?: number) => void;
}) {
  const [book, setBook] = useState<Book | null>(null);
  const [pages, setPages] = useState<PageView[]>([]);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [settings, setSettings] = useState<ProcessSettings>(DEFAULT_PROCESS);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [cropSource, setCropSource] = useState<string>();
  const [undoBooks, setUndoBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const panState = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const stateRef = useRef({ zoom, offset });
  stateRef.current = { zoom, offset };

  // تحميل الكتاب المحفوظ عند البدء.
  useEffect(() => {
    adoptPaneBooks();
    const meta = loadBookMeta(paneKey);
    if (meta) {
      setBook(meta);
      setPages(meta.pages);
      setSettings(meta.process);
      const selectedIndex = Number(readStorage(`${paneKey}:page-index`) ?? 0);
      setIndex(clamp(selectedIndex, 0, Math.max(0, meta.pages.length - 1)));
      const groups = listSources().find(source => source.id === meta.id)?.groups ?? [];
      const selectedGroup = readStorage(`${paneKey}:group-id`);
      const groupIndex = selectedGroup === "original" ? 0 : groups.findIndex(group => group.id === selectedGroup);
      setUndoBooks(groups.slice(0, groupIndex >= 0 ? groupIndex : Math.max(0, groups.length - 1)).map(group => group.book));
    }
  }, [paneKey]);

  const persistMeta = useCallback(
    (nextBook: Book | null) => {
      saveBookMeta(paneKey, nextBook);
    },
    [paneKey],
  );

  const resetView = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  const ensurePageSrc = useCallback(
    async (pageIndex: number, force = false) => {
      if (!book) return;
       const page = book.pages[pageIndex];
      if (!page) return;
      const blob = await getPageBlob(book.id, page.id);
      if (!blob) return;
      const processed = await processImageBlob(blob, settings);
      const src = await blobToDataUrl(processed.blob);
      setPages((prev) => {
        const next = [...prev];
        next[pageIndex] = { ...page, src, processed: true };
        return next;
      });
    },
    [book, settings],
  );

  // تحديث الصفحة الحالية عند تغيير المعالجة أو الصفحة.
  useEffect(() => {
    if (!book) return;
    ensurePageSrc(index, true);
  }, [book, index, settings, ensurePageSrc]);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const { user } = useAccount();
  const handleImport = useCallback(
    async (files: File[] | FileList | null, kind?: "manuscript" | "print") => {
      if (!files?.length) return;
      if (!user) { toast.error("سجّل الدخول لحفظ المصدر في حسابك"); return; }
      if (!kind) { setPendingFiles(Array.from(files)); return; }
      setBusy(true);
      setProgress({ done: 0, total: files.length, label: "جارٍ الاستيراد…" });
      try {
        const imported = await importFilesToPages(Array.from(files), (done, total, label) =>
          setProgress({ done, total, label }),
        );
        if (!imported.length) return;

        let current = newBook(Array.from(files)[0]?.name.replace(/\.[^.]+$/, "") ?? title, witness ?? "الأصل");
        const filesSaved = await storeOriginalFiles(current, Array.from(files));
        current = await addPages(current, imported, filesSaved);
        current = { ...current, process: settings };
        const source = recordSource(current, "استيراد", [], current.pages.map(page => page.id));
        saveSource({ ...source, kind, files: filesSaved });
        writeStorage(`${paneKey}:group-id`, source.groups.at(-1)?.id ?? "original");
        setBook(current);
        setPages(current.pages);
        persistMeta(current);
        setIndex(0);
        resetView();
        setUndoBooks([]);
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : "تعذّر الاستيراد؛ لم تُحذف المصادر السابقة");
      } finally {
        setBusy(false);
        setProgress(null);
      }
    },
    [user, persistMeta, resetView, settings, title, witness, paneKey],
  );

  const applyToAll = useCallback(async () => {
    if (!book || pages.length === 0) return;
    setBusy(true);
    setProgress({ done: 0, total: pages.length, label: "معالجة الصفحات…" });
    try {
      for (let i = 0; i < pages.length; i += 1) {
        const page = pages[i];
        if (!page) continue;
        const blob = await getPageBlob(book.id, page.id);
        if (blob) {
          const processed = await processImageBlob(blob, settings);
          const src = await blobToDataUrl(processed.blob);
          setPages((prev) => {
            const next = [...prev];
            next[i] = { ...page, src, processed: true };
            return next;
          });
        }
        setProgress({ done: i + 1, total: pages.length, label: "معالجة الصفحات…" });
        // نفسح المجال لتحديث الواجهة.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const updated = { ...book, process: settings };
      recordSource(updated, "معالجة", book.pages.map(page => page.id), book.pages.map(page => page.id), settings);
      setBook(updated);
      persistMeta(updated);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [book, pages, persistMeta, settings]);

  const deleteBook = useCallback(async () => {
    if (!book) return;
    setBook(null);
    setPages([]);
    setIndex(0);
    persistMeta(null);
    setUndoBooks([]);
  }, [book, persistMeta]);

  const removeCurrentPage = useCallback(async () => {
    if (!book) return;
    const page = pages[index];
    if (!page) return;
    const updated = await removePage(book, page.id);
    recordSource(updated, "استبعاد من مجموعة العمل", [page.id]);
    setBook(updated);
    setPages(updated.pages);
    persistMeta(updated);
    if (index >= updated.pages.length) setIndex(Math.max(0, updated.pages.length - 1));
  }, [book, index, pages, persistMeta]);

  const goToPage = useCallback(
    (next: number) => {
      const clamped = clamp(next, 0, Math.max(0, pages.length - 1));
      if (clamped !== index) {
        setIndex(clamped);
        writeStorage(`${paneKey}:page-index`, String(clamped));
        resetView();
      }
    },
    [index, pages.length, resetView],
  );

  const getCurrentPageDataUrl = useCallback(async () => {
    if (!book || !pages[index]) return null;
    const page = pages[index];
    if (!page) return null;
    if (page.src) return page.src;
    const blob = await getPageBlob(book.id, page.id);
    if (!blob) return null;
    return blobToDataUrl(blob);
  }, [book, index, pages]);

  const getPageDataUrl = useCallback(async (pageIndex: number) => {
    if (!book) return null;
    const page = pages[pageIndex];
    if (!page) return null;
    if (page.src) return page.src;
    const blob = await getPageBlob(book.id, page.id);
    if (!blob) return null;
    return blobToDataUrl((await processImageBlob(blob, settings)).blob);
  }, [book, pages, settings]);

  // تزويد الأب بواجهة التحكم بالكتاب.
  useEffect(() => {
    if (!onReady) return;
    onReady({ getBook: () => book, currentPageIndex: index, getCurrentPageDataUrl, getPageDataUrl, goToPage });
  }, [book, index, getCurrentPageDataUrl, getPageDataUrl, goToPage, onReady]);

  // عجلة الفأرة للتكبير حول نقطة المؤشر.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const px = event.clientX - rect.left - rect.width / 2;
      const py = event.clientY - rect.top - rect.height / 2;
      const dy = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      const current = stateRef.current;
      const next = clamp(current.zoom * Math.exp(-dy * 0.0018), MIN_ZOOM, MAX_ZOOM);
      const k = next / current.zoom;
      setOffset({
        x: px - (px - current.offset.x) * k,
        y: py - (py - current.offset.y) * k,
      });
      setZoom(next);
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (factor: number) => setZoom((prev) => clamp(prev * factor, MIN_ZOOM, MAX_ZOOM));

  const active = pages[index];
  const commitPages = (updated: Book, nextIndex = index, kind = "ترتيب", inputs: string[] = [], outputs: string[] = [], parameters?: unknown) => {
    const source = recordSource(updated, kind, inputs, outputs, parameters);
    writeStorage(`${paneKey}:group-id`, source.groups.at(-1)?.id ?? "original");
    if (book) setUndoBooks(history => [...history, book]);
    setBook(updated); setPages(updated.pages); persistMeta(updated); setIndex(nextIndex); resetView();
    writeStorage(`${paneKey}:page-index`, String(nextIndex));
  };
  const replaceWith = async (created: { name: string; blob: Blob }[], count = 1, operation = "قص", parameters?: unknown) => {
    if (!book) return;
    const added = await addPages(book, created);
    const newPages = added.pages.slice(book.pages.length);
    commitPages({ ...added, pages: [...book.pages.slice(0, index), ...newPages, ...book.pages.slice(index + count)] }, index, operation, book.pages.slice(index, index + count).map(page => page.id), newPages.map(page => page.id), parameters);
  };
  const merge = async (vertical: boolean) => {
    if (!book || !active) return;
    const following = pages[index + 1];
    if (!following) return;
    setBusy(true);
    try {
      const first = await getPageBlob(book.id, active.id);
      const second = await getPageBlob(book.id, following.id);
      if (!first || !second) throw new Error("تعذّر تحميل الصفحتين");
      await replaceWith([{ name: `${active.name} + ${following.name}`, blob: await mergePages([first, second], vertical) }], 2, vertical ? "دمج رأسي" : "دمج أفقي", { vertical });
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : "تعذّر الدمج"); }
    finally { setBusy(false); }
  };

  return (
    <section className="flex h-full min-w-0 flex-col bg-panel text-panel-foreground">
      <SourceKindDialog open={pendingFiles.length > 0} onCancel={() => setPendingFiles([])} onChoose={kind => { const files = pendingFiles; setPendingFiles([]); void handleImport(files, kind); }} />
      <header className="flex items-center gap-1 border-b bg-toolbar/60 px-2 py-0.5">
        {!book && <span className="truncate text-[10px] text-muted-foreground">لا كتاب بعد</span>}
        {book && (
          <span className="truncate text-[10px] text-muted-foreground">
            {book.title} · {pages.length} صفحة
          </span>
        )}
        <div className="flex-1" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,.pdf,.zip,.cbz"
          multiple
          className="hidden"
          onChange={(event) => {
            void handleImport(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error خاصية متصفحية لاختيار مجلد كامل غير موجودة في أنواع React.
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={(event) => {
            void handleImport(event.target.files);
            event.target.value = "";
          }}
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" disabled={busy}>
              <ImagePlus className="size-4" />
              <span className="hidden text-xs lg:inline">استيراد</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 space-y-1 p-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-start text-xs hover:bg-secondary"
            >
              <FileImage className="size-4" /> صور / PDF / ZIP
            </button>
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-start text-xs hover:bg-secondary"
            >
              <FolderOpen className="size-4" /> مجلد صور كامل
            </button>
          </PopoverContent>
        </Popover>
      </header>

      <div className="flex flex-wrap items-center gap-0.5 border-b bg-toolbar/60 px-1.5 py-1">
        <Button size="icon" variant="ghost" className="size-7" title="قص وتقسيم الصفحة" disabled={!active?.src || busy} onClick={async () => { if (!book || !active) return; try { const blob = await getPageBlob(book.id, active.id); if (!blob) throw new Error("تعذّر تحميل الصفحة"); setCropSource(await blobToDataUrl(blob)); setToolsOpen(true); } catch (caught) { toast.error(caught instanceof Error ? caught.message : "تعذّر تحميل الصفحة"); } }}><Crop className="size-4" /></Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-7" title="دمج مع الصفحة التالية" disabled={!pages[index + 1] || busy}><Combine className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={() => void merge(false)}>دمج أفقي: الحالية يمينًا</DropdownMenuItem><DropdownMenuItem onSelect={() => void merge(true)}>دمج رأسي: الحالية أعلى</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        <Button size="icon" variant="ghost" className="size-7" title="نقل الصفحة للأمام" disabled={!book || index === 0 || busy} onClick={() => book && commitPages({ ...book, pages: moveItem(book.pages, index, index - 1) }, index - 1)}><ArrowRight className="size-4" /></Button>
        <Button size="icon" variant="ghost" className="size-7" title="نقل الصفحة للخلف" disabled={!book || index >= pages.length - 1 || busy} onClick={() => book && commitPages({ ...book, pages: moveItem(book.pages, index, index + 1) }, index + 1)}><ArrowLeft className="size-4" /></Button>
        <Button size="icon" variant="ghost" className="size-7" title="تراجع عن تعديل الصفحات" disabled={!undoBooks.length || busy} onClick={() => { const previous = undoBooks.at(-1); if (!previous) return; recordSource(previous, "تراجع"); setUndoBooks(history => history.slice(0, -1)); setBook(previous); setPages(previous.pages); persistMeta(previous); setIndex(Math.max(0, Math.min(index, previous.pages.length - 1))); resetView(); }}><Undo2 className="size-4" /></Button>
        <Button size="icon" variant="ghost" className="size-7" title="الصفحة السابقة" onClick={() => goToPage(index - 1)} disabled={index <= 0 || busy}>
          <ChevronRight className="size-4" />
        </Button>
        <span className="w-20 text-center text-[11px] tabular-nums text-muted-foreground">
          {pages.length ? `${plateLabel(index)} / ${pages.length}` : "—"}
        </span>
        <Button size="icon" variant="ghost" className="size-7" title="الصفحة التالية" onClick={() => goToPage(index + 1)} disabled={index >= pages.length - 1 || busy}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" className="size-7" title="تكبير" onClick={() => zoomBy(1.25)}>
          <Plus className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" className="size-7" title="تصغير" onClick={() => zoomBy(1 / 1.25)}>
          <Minus className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" className="size-7" title="ملاءمة" onClick={resetView}>
          <Maximize className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" className="size-7" title="تدوير 90°" onClick={() => setRotation((prev) => (prev + 90) % 360)}>
          <RotateCw className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" className="size-7" title="حذف الصفحة الحالية" onClick={removeCurrentPage} disabled={!active || busy}>
          <Trash2 className="size-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button size="icon" variant="ghost" className="size-7" title="معالجة الصورة">
              <Settings2 className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">توليفة جاهزة</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PROCESS_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setSettings(preset.value)}
                    className={cn(
                      "rounded border px-2 py-1 text-[11px] hover:bg-secondary",
                      JSON.stringify(settings) === JSON.stringify(preset.value) && "border-primary bg-primary/10",
                    )}
                    title={preset.hint}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
            {(
              [
                ["السطوع", "brightness", 20, 200],
                ["التباين", "contrast", 20, 200],
                ["الجاما", "gamma", 20, 200],
                ["الحدة", "sharpen", 0, 100],
                 ["الدقة", "upscale", 1, 2],
              ] as Array<[string, keyof ProcessSettings, number, number]>
            ).map(([label, key, min, max]) => (
              <div key={key} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span>{label}</span>
                  <span className="tabular-nums text-muted-foreground">{String(settings[key])}</span>
                </div>
                <Slider min={min} max={max} step={1} value={[Number(settings[key])]} onValueChange={([value]) => setSettings((prev) => ({ ...prev, [key]: value }))} />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["رمادي", "grayscale"],
                  ["ثنائي", "binarize"],
                  ["إزالة ضجيج", "denoise"],
                  ["عكس", "invert"],
                   ["تسطيح الخلفية", "flatten"],
                   ["عتبة تكيفية", "adaptive"],
                ] as Array<[string, keyof ProcessSettings]>
              ).map(([label, key]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className={cn(
                    "rounded border px-2 py-1 text-[11px]",
                    settings[key] ? "border-primary bg-primary/10" : "hover:bg-secondary",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => setSettings(DEFAULT_PROCESS)}>
                إعادة
              </Button>
              <Button size="sm" className="flex-1" onClick={applyToAll} disabled={busy || !book}>
                <Wand2 className="ms-1 size-3.5" />
                الكل
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="sm" variant="ghost" className="h-7 px-2 text-xs" title="خيارات النسخ الآلي" disabled={busy || !active}><ScanText className="ms-1 size-4" />نسخ ▾</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start"><DropdownMenuItem onSelect={() => onRequestOcr?.(index)}>اللوحة الحالية</DropdownMenuItem><DropdownMenuItem onSelect={() => onRequestOcr?.(index, pages.length - 1)}>من الحالية إلى آخر الكتاب</DropdownMenuItem><DropdownMenuItem onSelect={() => onRequestOcr?.(0, pages.length - 1)}>الكتاب كاملًا</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          title="تنزيل الصفحة المعالجة"
          disabled={!active?.src}
          onClick={() => {
            if (!active?.src) return;
            const link = document.createElement("a");
            link.href = active.src;
            link.download = `${active.name || "page"}.jpg`;
            link.click();
          }}
        >
          <Download className="ms-1 size-4" />
          تنزيل
        </Button>
      </div>

      {progress && (
        <div className="border-b bg-accent px-2 py-1.5">
          <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{progress.label}</span>
            <span>{progress.done}/{progress.total}</span>
          </div>
          <div className="h-1 overflow-hidden rounded bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div
        ref={viewportRef}
        className={cn(
          "relative flex-1 overflow-hidden bg-muted/40",
          dragOver && "ring-2 ring-inset ring-primary",
          active && "cursor-grab active:cursor-grabbing",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void handleImport(event.dataTransfer.files);
        }}
        onPointerDown={(event) => {
          if (!active) return;
          panState.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const pan = panState.current;
          if (!pan) return;
          setOffset({ x: pan.ox + (event.clientX - pan.x), y: pan.oy + (event.clientY - pan.y) });
        }}
        onPointerUp={() => {
          panState.current = null;
        }}
        onPointerCancel={() => {
          panState.current = null;
        }}
      >
        {active ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {active.src ? (
              <img
                src={active.src}
                alt={active.name}
                draggable={false}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                }}
                className="max-h-full max-w-full select-none object-contain shadow-paper"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-xs">جارٍ تحميل الصفحة…</span>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-center text-xs text-muted-foreground"
          >
            <div className="flex gap-2">
              <FileText className="size-7 opacity-60" />
              <FileArchive className="size-7 opacity-60" />
              <FileImage className="size-7 opacity-60" />
            </div>
            اسحب كتابًا كاملاً (PDF / ZIP / مجلد صور) هنا
            <span className="opacity-70">أو اضغط لاختيار الملفات</span>
          </button>
        )}
      </div>

      {pages.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto border-t bg-toolbar/70 p-1.5">
          {pages.map((page, i) => (
            <button
              key={page.id}
              type="button"
              onClick={() => goToPage(i)}
              className={cn(
                "group relative shrink-0 flex-col items-center rounded border-2 transition-colors",
                i === index ? "border-primary" : "border-transparent hover:border-border",
              )}
            >
              {page.src ? (
                <img src={page.src} alt={page.name} className="block size-14 object-cover" />
              ) : (
                <div className="flex size-14 items-center justify-center bg-muted text-[10px] text-muted-foreground">
                  {plateLabel(i)}
                </div>
              )}
              <span className="block w-14 truncate px-0.5 text-[9px] text-muted-foreground">{plateLabel(i)}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={deleteBook}
            title="إغلاق الكتاب؛ يبقى محفوظًا في الخزانة"
            className="flex size-14 shrink-0 flex-col items-center justify-center rounded border border-dashed text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
            <span className="mt-1 text-[9px]">إغلاق</span>
          </button>
        </div>
      )}
      <PageTools source={cropSource} open={toolsOpen} onClose={() => setToolsOpen(false)} onApply={replaceWith} />
    </section>
  );
}
