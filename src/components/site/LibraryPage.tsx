import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  FolderOpen,
  Layers,
  Library,
  Search,
  Send,
  Sparkles,
  Square,
  TreePine,
} from "lucide-react";
import {
  SAMPLE_SHOWCASE_BOOKS,
  type CriticalBlock,
  type EditorJumpContext,
  type ShowcaseBook,
} from "@/lib/islamic-library-engine";
import {
  mountLibraryFolder,
  readSnippetFromMountedFile,
  type MountedLibrary,
} from "@/lib/library-connector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type LibrarySectionKey =
  | "all"
  | "mutun"
  | "shuruh"
  | "tarajim"
  | "ilal"
  | "manuscripts"
  | "encyclopedias";

interface LibrarySectionItem {
  key: LibrarySectionKey;
  label: string;
  hint: string;
}

const LIBRARY_SECTIONS: LibrarySectionItem[] = [
  { key: "all", label: "الجامع العام", hint: "جميع الأقسام والكتب" },
  { key: "mutun", label: "كتب المتون", hint: "أصول المتون الحديثية والعلمية" },
  { key: "shuruh", label: "الشروح والحواشي", hint: "شروح المتون وتقريراتها" },
  { key: "tarajim", label: "التراجم والرجال", hint: "الجرح والتعديل والطبقات" },
  { key: "ilal", label: "العلل والسؤالات", hint: "علل الحديث وسؤالات الحفاظ" },
  { key: "manuscripts", label: "المخطوطات", hint: "الأصول الخطية والنسخ المعتمدة" },
  { key: "encyclopedias", label: "الموسوعات المساعدة", hint: "قواعد البيانات والمراجع الملحقة" },
];

interface SearchHit {
  id: string;
  kind: "متن محقق" | "تخريج وإسناد" | "خزانة مربوطة";
  title: string;
  snippet: string;
  citationText: string;
  bookId: string;
  bookTitle: string;
  block?: CriticalBlock;
  mountedPath?: string;
}

function classifyBookSection(book: ShowcaseBook): LibrarySectionKey {
  const text = `${book.title} ${book.author} ${book.category || ""}`.toLowerCase();
  if (text.includes("شرح") || text.includes("حاشية") || text.includes("فتح")) return "shuruh";
  if (text.includes("رجال") || text.includes("ترجمة") || text.includes("ثقات") || text.includes("طبقات")) return "tarajim";
  if (text.includes("علل") || text.includes("سؤالات")) return "ilal";
  return "mutun";
}

export function LibraryPage() {
  const navigate = useNavigate();

  const [books] = useState<ShowcaseBook[]>(SAMPLE_SHOWCASE_BOOKS);
  const [activeSection, setActiveSection] = useState<LibrarySectionKey>("all");
  const [expandedSectionBooks, setExpandedSectionBooks] = useState<boolean>(true);
  const [expandedBookTree, setExpandedBookTree] = useState<boolean>(true);

  const [activeBook, setActiveBook] = useState<ShowcaseBook>(SAMPLE_SHOWCASE_BOOKS[0]);
  const [activeBlock, setActiveBlock] = useState<CriticalBlock>(SAMPLE_SHOWCASE_BOOKS[0].blocks[0]);
  const [activeServiceTab, setActiveServiceTab] = useState<
    "takhrij" | "isnad" | "commentaries" | "gharib" | "topics" | "witnesses"
  >("takhrij");
  const [takhrijLevel, setTakhrijLevel] = useState<"summary" | "medium" | "detailed">("medium");

  const [searchMode, setSearchMode] = useState<"keyword" | "ai">("keyword");
  const [searchQuery, setSearchQuery] = useState("");
  const [aiPromptAnswer, setAiPromptAnswer] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [selectedHitIds, setSelectedHitIds] = useState<string[]>([]);

  const [mountedLib, setMountedLib] = useState<MountedLibrary | null>(null);
  const [showMountedPanel, setShowMountedPanel] = useState(false);
  const [filePreview, setFilePreview] = useState<{ path: string; content: string } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mu7rer_mounted_library");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name) {
          setMountedLib({
            name: parsed.name,
            handle: null,
            fileCount: parsed.fileCount || parsed.entries?.length || 0,
            connectedAt: parsed.connectedAt || Date.now(),
            entries: parsed.entries || [],
          });
        }
      }
    } catch {
      // تجاهل أخطاء التخزين المحلي
    }
  }, []);

  const filteredBooks = useMemo(() => {
    if (activeSection === "all" || activeSection === "manuscripts" || activeSection === "encyclopedias") {
      return books;
    }
    const matched = books.filter((b) => classifyBookSection(b) === activeSection);
    return matched.length > 0 ? matched : books;
  }, [books, activeSection]);

  const handleSelectBook = (book: ShowcaseBook) => {
    setActiveBook(book);
    setActiveBlock(book.blocks[0]);
    setExpandedBookTree(true);
  };

  const buildCitationForBlock = (book: ShowcaseBook, block: CriticalBlock) => {
    const ruling = block.isnads?.ruling ? ` (${block.isnads.ruling})` : "";
    const summary = block.takhrij?.summary || block.takhrij?.medium || "";
    return `${book.title}، ${block.chapter} [ج${block.volume}/ص${block.page}]${ruling}${summary ? " — " + summary : ""}`;
  };

  const runSearch = (rawQuery: string, mode: "keyword" | "ai" = searchMode) => {
    const q = rawQuery.trim();
    if (!q) {
      setSearchResults([]);
      setAiPromptAnswer(null);
      return;
    }

    const terms = q
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const hits: SearchHit[] = [];

    for (const book of books) {
      for (const blk of book.blocks) {
        const haystack = [
          book.title,
          book.author,
          blk.chapter,
          blk.matnText,
          blk.takhrij.summary,
          blk.takhrij.medium,
          blk.takhrij.detailed,
          blk.isnads.ruling,
          ...blk.isnads.chain.map((r) => `${r.name} ${r.rank} ${r.tabaqa}`),
        ].join(" ");

        const matched =
          mode === "keyword"
            ? terms.every((term) => haystack.includes(term))
            : terms.some((term) => haystack.includes(term));

        if (matched) {
          hits.push({
            id: `${book.id}:${blk.id}`,
            kind: "متن محقق",
            title: `${book.title} — ${blk.chapter} (ج${blk.volume}/ص${blk.page})`,
            snippet: blk.matnText,
            citationText: buildCitationForBlock(book, blk),
            bookId: book.id,
            bookTitle: book.title,
            block: blk,
          });
        }
      }
    }

    if (mountedLib?.entries?.length) {
      const lower = q.toLowerCase();
      const matchedEntries = mountedLib.entries.filter(
        (e) => e.name.toLowerCase().includes(lower) || e.path.toLowerCase().includes(lower),
      );
      for (const entry of matchedEntries.slice(0, 20)) {
        hits.push({
          id: `mounted:${entry.path}`,
          kind: "خزانة مربوطة",
          title: `${entry.name} (${mountedLib.name})`,
          snippet: `المسار: ${entry.path}`,
          citationText: `${mountedLib.name} — ${entry.path}`,
          bookId: activeBook.id,
          bookTitle: activeBook.title,
          mountedPath: entry.path,
        });
      }
    }

    setSearchResults(hits);

    if (mode === "ai") {
      const topTitles = hits.slice(0, 3).map((h) => `• ${h.title}`).join("\n");
      setAiPromptAnswer(
        hits.length > 0
          ? `تحليل بحثي سريع حول «${q}» (${hits.length} موضع):\n${topTitles}\nيمكنك تأشير المربعات أمام النتائج المطلوبة ثم الضغط على «إرسال إلى المحرر» لصياغتها آلياً في الحاشية.`
          : `لم تظهر مطابقات مباشرة لكلمة «${q}» في الفهرس الحالي. جرّب ربط مجلد أو موسوعة مساعدة من شريط الأدوات أو توسيع المصطلح.`,
      );
    } else {
      setAiPromptAnswer(null);
    }
  };

  const toggleHitSelection = (id: string) => {
    setSelectedHitIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSendSelectionsToEditor = () => {
    const chosenHits = searchResults.filter((h) => selectedHitIds.includes(h.id));
    const fallbackBlock = activeBlock || activeBook.blocks[0];

    const citations =
      chosenHits.length > 0
        ? chosenHits.map((h) => h.citationText)
        : fallbackBlock
          ? [buildCitationForBlock(activeBook, fallbackBlock)]
          : [];

    const jumpContext: EditorJumpContext & {
      selectedCitations?: string[];
      footnoteTargetMode?: "insert_at_cursor_or_new_footnote";
    } = {
      bookId: activeBook.id,
      bookTitle: activeBook.title,
      blockId: fallbackBlock?.id || "",
      seq: fallbackBlock?.seq || 1,
      volume: fallbackBlock?.volume || "1",
      page: fallbackBlock?.page || "1",
      matnText: fallbackBlock?.matnText || "",
      selectedWitnessId: fallbackBlock?.witnesses?.[0]?.id || "",
      selectedEditionId: fallbackBlock?.editions?.[0]?.id || "",
      timestamp: Date.now(),
      selectedCitations: citations,
      footnoteTargetMode: "insert_at_cursor_or_new_footnote",
    };

    try {
      sessionStorage.setItem("mu7rer_editor_jump_context", JSON.stringify(jumpContext));
      localStorage.setItem("mu7rer_editor_jump_context", JSON.stringify(jumpContext));
      localStorage.setItem("mu7rer_pending_footnote_citations", JSON.stringify(citations));
    } catch {
      // تجاهل أخطاء التخزين
    }

    void navigate({ to: "/editor" });
  };

  const handleMountAuxiliary = async () => {
    const mounted = await mountLibraryFolder();
    if (mounted) {
      setMountedLib(mounted);
      setShowMountedPanel(true);
    }
  };

  const handleInspectFile = async (entryPath: string) => {
    const content = await readSnippetFromMountedFile(entryPath, searchQuery);
    setFilePreview({ path: entryPath, content });
  };

  return (
    <div dir="rtl" className="flex h-full min-h-0 flex-col bg-background text-foreground">
      {/* بانر علوي هادئ بكلمات تفاعلية لأقسام المكتبة */}
      <section
        aria-label="أقسام المكتبة"
        className="shrink-0 border-b bg-card px-4 py-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Library className="size-4 text-primary" />
            <span className="text-xs font-bold text-foreground">أقسام المكتبة:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {LIBRARY_SECTIONS.map((sec) => {
              const active = activeSection === sec.key;
              return (
                <button
                  key={sec.key}
                  type="button"
                  title={sec.hint}
                  onClick={() => {
                    setActiveSection(sec.key);
                    setExpandedSectionBooks(true);
                    if (sec.key === "encyclopedias" || sec.key === "manuscripts") {
                      setShowMountedPanel(true);
                    }
                  }}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-secondary",
                  )}
                >
                  {sec.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* شريط أدوات علوي متساوٍ ومتناسق */}
      <header className="shrink-0 border-b bg-toolbar px-4 py-2">
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
          {/* حقل البحث + تبديل كلمات مفتاحية / ذكاء اصطناعي */}
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="flex shrink-0 rounded-md border bg-background p-0.5">
              <button
                type="button"
                onClick={() => {
                  setSearchMode("keyword");
                  if (searchQuery.trim()) runSearch(searchQuery, "keyword");
                }}
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium",
                  searchMode === "keyword"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Search className="size-3" />
                <span>كلمات</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchMode("ai");
                  if (searchQuery.trim()) runSearch(searchQuery, "ai");
                }}
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium",
                  searchMode === "ai"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Sparkles className="size-3" />
                <span>ذكاء اصطناعي</span>
              </button>
            </div>

            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                runSearch(e.target.value, searchMode);
              }}
              placeholder={
                searchMode === "ai"
                  ? "اسأل أو ابحث دلالياً في المتون والرواة والتخريج..."
                  : "ابحث بكلمات مفتاحية في المتون، الرواة، أو المصادر المربوطة..."
              }
              className="h-8 bg-paper text-xs"
            />
          </div>

          {/* زر ربط المكتبات أو المجلدات أو الموسوعات المساعدة */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleMountAuxiliary}
            >
              <FolderOpen className="size-3.5 text-primary" />
              <span>
                {mountedLib
                  ? `مصدر مربوط: ${mountedLib.name} (${mountedLib.fileCount})`
                  : "ربط مكتبة / مجلد / موسوعة"}
              </span>
            </Button>
            {mountedLib && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowMountedPanel((v) => !v)}
              >
                {showMountedPanel ? "إخفاء المصدر" : "عرض الملفات"}
              </Button>
            )}
          </div>

          {/* زر فتح المحرر وإرسال المختارات للحاشية */}
          <div className="flex items-center justify-end">
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold"
              onClick={handleSendSelectionsToEditor}
            >
              <Send className="size-3.5" />
              <span>
                إرسال إلى المحرر ({selectedHitIds.length > 0 ? selectedHitIds.length : 1})
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* منطقة النتائج عند البحث أو استعراض المصدر المساعد */}
      {(searchQuery.trim() !== "" || (showMountedPanel && mountedLib)) && (
        <section className="shrink-0 max-h-60 overflow-y-auto border-b bg-panel px-4 py-2.5">
          {aiPromptAnswer && (
            <div className="mb-2.5 whitespace-pre-line rounded-md border border-primary/30 bg-accent/50 p-2.5 text-xs leading-relaxed text-accent-foreground">
              {aiPromptAnswer}
            </div>
          )}

          {searchQuery.trim() !== "" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                <span>نتائج البحث ({searchResults.length}) — أشّر على العناصر لإدراجها في حاشية المحرر</span>
                {searchResults.length > 0 && (
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() =>
                      setSelectedHitIds(
                        selectedHitIds.length === searchResults.length
                          ? []
                          : searchResults.map((h) => h.id),
                      )
                    }
                  >
                    {selectedHitIds.length === searchResults.length ? "إلغاء الكل" : "تحديد الكل"}
                  </button>
                )}
              </div>

              {searchResults.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">لا توجد نتائج مطابقة للاستعلام الحالي.</p>
              ) : (
                searchResults.map((hit) => {
                  const checked = selectedHitIds.includes(hit.id);
                  return (
                    <div
                      key={hit.id}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-md border p-2 text-xs transition-colors",
                        checked ? "border-primary bg-accent/40" : "border-border bg-card",
                      )}
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <button
                          type="button"
                          aria-label={`تحديد ${hit.title}`}
                          onClick={() => toggleHitSelection(hit.id)}
                          className="mt-0.5 shrink-0 text-primary"
                        >
                          {checked ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                        </button>
                        <div
                          className="min-w-0 cursor-pointer"
                          onClick={() => {
                            const foundBook = books.find((b) => b.id === hit.bookId);
                            if (foundBook) setActiveBook(foundBook);
                            if (hit.block) setActiveBlock(hit.block);
                            if (hit.mountedPath) void handleInspectFile(hit.mountedPath);
                          }}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                              {hit.kind}
                            </span>
                            <span className="font-bold text-foreground">{hit.title}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                            {hit.snippet}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {showMountedPanel && mountedLib && (
            <div className="mt-2 border-t pt-2">
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                <span>ملفات المصدر المربوط: {mountedLib.name}</span>
                <span className="text-[11px] text-muted-foreground">{mountedLib.fileCount} عنصر</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                {mountedLib.entries.slice(0, 24).map((entry) => (
                  <button
                    key={entry.path}
                    type="button"
                    onClick={() => void handleInspectFile(entry.path)}
                    className="truncate rounded border bg-card px-2 py-1 text-right text-[11px] hover:bg-secondary"
                    title={entry.path}
                  >
                    {entry.kind === "directory" ? "📁 " : "📄 "}
                    {entry.name}
                  </button>
                ))}
              </div>
              {filePreview && (
                <div className="mt-2 rounded border bg-paper p-2 text-[11px] leading-relaxed">
                  <div className="mb-1 font-bold text-primary">{filePreview.path}</div>
                  <div className="whitespace-pre-wrap text-foreground">{filePreview.content}</div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* جسم المكتبة الرئيسي: شريط جانبي منسدل متدرج + مساحة عرض المتن والخدمات */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)]">
        {/* الشريط الجانبي: قوائم منسدلة متدرجة (القسم -> الكتب -> شجرة الموضوعات) */}
        <aside className="flex min-h-0 flex-col overflow-y-auto border-b bg-sidebar p-3 lg:border-b-0 lg:border-l">
          {/* مستوى 1: قائمة منسدلة لكتب القسم */}
          <div className="rounded-md border bg-card">
            <button
              type="button"
              onClick={() => setExpandedSectionBooks((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary/60"
            >
              <span className="flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" />
                <span>كتب القسم ({filteredBooks.length})</span>
              </span>
              {expandedSectionBooks ? (
                <ChevronDown className="size-3.5 text-muted-foreground" />
              ) : (
                <ChevronLeft className="size-3.5 text-muted-foreground" />
              )}
            </button>

            {expandedSectionBooks && (
              <div className="space-y-1 border-t p-1.5">
                {filteredBooks.map((book) => {
                  const selected = book.id === activeBook.id;
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => handleSelectBook(book)}
                      className={cn(
                        "w-full rounded px-2.5 py-1.5 text-right transition-colors",
                        selected
                          ? "bg-accent font-semibold text-accent-foreground"
                          : "text-foreground hover:bg-secondary",
                      )}
                    >
                      <div className="truncate text-xs">{book.title}</div>
                      <div className="truncate text-[10px] text-muted-foreground">{book.author}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* مستوى 2: شجرة موضوعات الكتاب المفتوح */}
          <div className="mt-3 rounded-md border bg-card">
            <button
              type="button"
              onClick={() => setExpandedBookTree((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary/60"
            >
              <span className="flex items-center gap-1.5">
                <TreePine className="size-3.5 text-primary" />
                <span>شجرة موضوعات الكتاب</span>
              </span>
              {expandedBookTree ? (
                <ChevronDown className="size-3.5 text-muted-foreground" />
              ) : (
                <ChevronLeft className="size-3.5 text-muted-foreground" />
              )}
            </button>

            {expandedBookTree && (
              <div className="space-y-1 border-t p-1.5">
                {activeBook.blocks.map((blk) => {
                  const isCurrent = blk.id === activeBlock?.id;
                  return (
                    <button
                      key={blk.id}
                      type="button"
                      onClick={() => setActiveBlock(blk)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-right text-xs transition-colors",
                        isCurrent
                          ? "border-r-2 border-primary bg-accent/60 font-semibold text-accent-foreground"
                          : "text-foreground hover:bg-secondary",
                      )}
                    >
                      <span className="truncate">{blk.chapter}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        ص{blk.page}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* المساحة الرئيسية: عرض متن الكتاب والخدمات العلمية للموضع المختار */}
        <main className="flex min-h-0 flex-col overflow-y-auto bg-background p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">{activeBook.title}</h2>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activeBook.author} — {activeBlock?.chapter} (ج {activeBlock?.volume} / ص {activeBlock?.page})
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={handleSendSelectionsToEditor}
            >
              <span>تحرير وإدراج في حاشية المحرر</span>
            </Button>
          </div>

          {/* المتن في المساحة الرئيسية */}
          {activeBlock && (
            <article className="rounded-lg border bg-paper p-5 shadow-paper">
              <p className="library-matn text-justify">{activeBlock.matnText}</p>
            </article>
          )}

          {/* الخدمات العلمية للموضع الحالي */}
          {activeBlock && (
            <section className="mt-4 rounded-lg border bg-card">
              <div className="flex flex-wrap gap-1 border-b bg-panel p-1.5">
                {[
                  { id: "takhrij", label: "التخريج" },
                  { id: "isnad", label: "الإسناد والرواة" },
                  { id: "commentaries", label: "الشروح" },
                  { id: "gharib", label: "غريب المتن" },
                  { id: "topics", label: "الموضوعات" },
                  { id: "witnesses", label: "المخطوطات والطبعات" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveServiceTab(tab.id as typeof activeServiceTab)}
                    className={cn(
                      "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                      activeServiceTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-secondary",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4 text-xs leading-relaxed">
                {activeServiceTab === "takhrij" && (
                  <div>
                    <div className="mb-2.5 flex items-center gap-1.5">
                      {(["summary", "medium", "detailed"] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setTakhrijLevel(lvl)}
                          className={cn(
                            "rounded border px-2 py-0.5 text-[11px]",
                            takhrijLevel === lvl
                              ? "border-primary bg-accent font-semibold text-accent-foreground"
                              : "border-border bg-background text-muted-foreground",
                          )}
                        >
                          {lvl === "summary" ? "إجمالي" : lvl === "medium" ? "متوسط" : "تفصيلي"}
                        </button>
                      ))}
                    </div>
                    <p className="text-foreground">{activeBlock.takhrij[takhrijLevel]}</p>
                  </div>
                )}

                {activeServiceTab === "isnad" && (
                  <div className="space-y-2">
                    <div className="rounded border border-primary/30 bg-accent/40 px-3 py-1.5 font-semibold text-accent-foreground">
                      الحكم الحديثي: {activeBlock.isnads.ruling}
                    </div>
                    {activeBlock.isnads.chain.map((r, i) => (
                      <div key={r.id} className="rounded border bg-background px-3 py-1.5">
                        <span className="font-bold">{i + 1}. {r.name}</span> ({r.deathYear}) — {r.tabaqa} —{" "}
                        <span className="font-semibold text-primary">{r.rank}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeServiceTab === "commentaries" && (
                  <div className="space-y-2">
                    {activeBlock.commentaries.map((c, i) => (
                      <div key={i} className="rounded border bg-background p-2.5">
                        <div className="font-bold text-foreground">{c.book} ({c.author})</div>
                        <p className="mt-1 text-muted-foreground">{c.excerpt}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeServiceTab === "gharib" && (
                  <div className="space-y-1.5">
                    {activeBlock.gharib.map((g, i) => (
                      <div key={i} className="rounded border bg-background px-3 py-1.5">
                        <span className="font-bold text-primary">{g.term}:</span> {g.meaning}
                      </div>
                    ))}
                  </div>
                )}

                {activeServiceTab === "topics" && (
                  <div className="space-y-1.5">
                    {activeBlock.topics.map((t, i) => (
                      <div key={i} className="rounded border bg-background px-3 py-1.5">
                        <span className="font-semibold">{t.path}</span>
                        {t.contraryRef && <span className="text-muted-foreground"> — {t.contraryRef}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {activeServiceTab === "witnesses" && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1.5 rounded border bg-background p-2.5">
                      <div className="font-bold text-foreground">الأصول الخطية</div>
                      {activeBlock.witnesses.map((w) => (
                        <div key={w.id} className="border-t pt-1.5 first:border-t-0 first:pt-0">
                          <div className="font-semibold">رمز ({w.siglum}) — {w.title}</div>
                          <div className="text-[11px] text-muted-foreground">{w.folio} · {w.dateHijri}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5 rounded border bg-background p-2.5">
                      <div className="font-bold text-foreground">الطبعات المعتمدة</div>
                      {activeBlock.editions.map((ed) => (
                        <div key={ed.id} className="border-t pt-1.5 first:border-t-0 first:pt-0">
                          <div className="font-semibold">{ed.name} ({ed.year})</div>
                          <div className="text-[11px] text-muted-foreground">{ed.newEditionAdvantage}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
