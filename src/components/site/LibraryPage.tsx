import React, { useState, useEffect } from "react";
import { SAMPLE_SHOWCASE_BOOKS, ShowcaseBook, CriticalBlock, EditorJumpContext } from "@/lib/islamic-library-engine";
import { mountLibraryFolder, MountedLibrary, readSnippetFromMountedFile } from "@/lib/library-connector";

const REAL_EDITOR_ROUTE = "/editor";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  time: string;
}

export function LibraryPage() {
  const [books, setBooks] = useState<ShowcaseBook[]>(SAMPLE_SHOWCASE_BOOKS);
  const [activeBook, setActiveBook] = useState<ShowcaseBook>(SAMPLE_SHOWCASE_BOOKS[0]);
  const [activeBlock, setActiveBlock] = useState<CriticalBlock>(SAMPLE_SHOWCASE_BOOKS[0].blocks[0]);
  const [activeWitnessIdx, setActiveWitnessIdx] = useState(0);
  const [activeEditionIdx, setActiveEditionIdx] = useState(0);
  const [activeServiceTab, setActiveServiceTab] = useState<"takhrij"|"isnad"|"unified"|"commentaries"|"gharib"|"topics">("takhrij");
  const [takhrijLevel, setTakhrijLevel] = useState<"summary"|"medium"|"detailed">("detailed");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ type: string; title: string; snippet: string; path?: string; block?: CriticalBlock }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [mountedLib, setMountedLib] = useState<MountedLibrary | null>(null);
  const [showMountedBrowser, setShowMountedBrowser] = useState(false);
  const [selectedFilePreview, setSelectedFilePreview] = useState<{ path: string; content: string } | null>(null);

  const [inlineEditMode, setInlineEditMode] = useState(false);
  const [editableMatn, setEditableMatn] = useState("");
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "مرحباً بك في مساعد خزانة مُحَرِّر الحيّ. يمكنك سؤالي عن ملفات مكتبتك الشاملة المربوطة، أو البحث في المتون والرواة وفروق النسخ!",
      time: "الآن"
    }
  ]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mu7rer_mounted_library");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) {
          setMountedLib({
            name: parsed.name,
            handle: null,
            fileCount: parsed.fileCount || (parsed.entries ? parsed.entries.length : 0),
            connectedAt: parsed.connectedAt || Date.now(),
            entries: parsed.entries || []
          });
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (activeBlock) {
      setEditableMatn(activeBlock.matnText);
    }
  }, [activeBlock]);

  const executeLiveSearch = async (q: string) => {
    setSearchQuery(q);
    const trimmed = q.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const hits: { type: string; title: string; snippet: string; path?: string; block?: CriticalBlock }[] = [];

    for (const b of books) {
      for (const blk of b.blocks) {
        if (
          blk.matnText.includes(trimmed) ||
          blk.chapter.includes(trimmed) ||
          blk.takhrij.detailed.includes(trimmed) ||
          blk.isnads.chain.some((r) => r.name.includes(trimmed))
        ) {
          hits.push({
            type: "متن محقق",
            title: b.title + " — " + blk.chapter + " (ص " + blk.page + ")",
            snippet: blk.matnText.slice(0, 220) + "...",
            block: blk
          });
        }
      }
    }

    if (mountedLib && mountedLib.entries) {
      const lower = trimmed.toLowerCase();
      const matchedEntries = mountedLib.entries.filter(
        (e) => e.name.toLowerCase().includes(lower) || e.path.toLowerCase().includes(lower)
      );
      for (const entry of matchedEntries.slice(0, 25)) {
        hits.push({
          type: entry.kind === "directory" ? "مجلد في " + mountedLib.name : "ملف شاملة (" + (entry.ext || "db") + ")",
          title: entry.name,
          snippet: "المسار في الخزانة: " + entry.path,
          path: entry.path
        });
      }
    }

    setSearchResults(hits);
    setIsSearching(false);
  };

  const handleInspectMountedFile = async (entryPath: string) => {
    const content = await readSnippetFromMountedFile(entryPath, searchQuery);
    setSelectedFilePreview({ path: entryPath, content });
  };

  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = chatInput.trim();
    if (!q) return;

    const userMsg: ChatMessage = { role: "user", text: q, time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    setTimeout(async () => {
      let reply = "";
      const entries = mountedLib?.entries || [];
      const dbFiles = entries.filter((x) => /\.(db|sqlite|sqlite3|mdb|bok|idx)$/i.test(x.name));
      const pdfFiles = entries.filter((x) => /\.pdf$/i.test(x.name));

      if (q.includes("شامل") || q.includes("مكتبة") || q.includes("خزان") || q.includes("ملف") || q.includes("ربط") || q.includes("كم")) {
        if (mountedLib) {
          const sampleNames = entries.slice(0, 8).map((x) => x.name).join(" ، ");
          reply =
            "✅ الخزانة المربوطة حالياً هي: «" +
            mountedLib.name +
            "»\n• إجمالي العناصر المفهرسة: (" +
            mountedLib.fileCount +
            ") عنصر.\n• قواعد البيانات وملفات الشاملة (.db/.bok/.mdb): (" +
            dbFiles.length +
            ") ملفات.\n• المصورات (.pdf): (" +
            pdfFiles.length +
            ") ملفات.\n• من أبرز محتوياتها: [ " +
            sampleNames +
            " ]. يمكنك الضغط على زر «استعراض ملفات " + mountedLib.name + "» أعلاه لفتح أي ملف منها!";
        } else {
          reply = "لم تقم بربط مجلد الشاملة في هذه الجلسة بعد. اضغط على الزر الأخضر «ربط خزانة محلية» أعلى اليسار واختر مجلد shamela لأقرأ لك كل قواعده فوراً!";
        }
      } else if (q.includes("تخريج") || q.includes("خرج") || q.includes("سند") || q.includes("رواة")) {
        reply =
          "🔍 التحليل الحديثي للموضع الحالي (" +
          activeBlock.chapter +
          "):\n• الحكم: " +
          activeBlock.isnads.ruling +
          "\n• التخريج التفصيلي: " +
          activeBlock.takhrij.detailed +
          "\n• رجال الإسناد: " +
          activeBlock.isnads.chain.map((r) => r.name + " [" + r.rank + "]").join(" ← ");
      } else if (q.includes("نسخ") || q.includes("مخطوط") || q.includes("طبعات") || q.includes("فروق")) {
        reply =
          "📜 مقارنة الأصول الخطية والطبعات في هذا الموضع:\n" +
          activeBlock.apparatusFootnotes.join("\n") +
          "\n• ميزة الطبعة الجديدة: " +
          (activeBlock.editions[0]?.newEditionAdvantage || "");
      } else {
        await executeLiveSearch(q);
        const matchInLib = entries.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()) || e.path.toLowerCase().includes(q.toLowerCase()));
        reply =
          "📚 نتائج البحث والاستقصاء عن «" +
          q +
          "»:\n• في المتن الحالي: " +
          (activeBlock.matnText.includes(q) ? "وردت العبارة في الفقرة #" + activeBlock.seq : "تم تحديث نتائج البحث أعلى الصفحة.") +
          (mountedLib
            ? "\n• في خزانتك المربوطة (" +
              mountedLib.name +
              "): عثرت على (" +
              matchInLib.length +
              ") ملف/مجلد مطابق."
            : "");
      }

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: reply,
          time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
      setChatLoading(false);
    }, 250);
  };

  const handleSaveInlineEdit = () => {
    const updatedBooks = books.map((b) => {
      if (b.id !== activeBook.id) return b;
      return {
        ...b,
        blocks: b.blocks.map((blk) => (blk.id === activeBlock.id ? { ...blk, matnText: editableMatn } : blk))
      };
    });
    setBooks(updatedBooks);
    const newBook = updatedBooks.find((b) => b.id === activeBook.id)!;
    setActiveBook(newBook);
    setActiveBlock(newBook.blocks.find((blk) => blk.id === activeBlock.id)!);
    setInlineEditMode(false);
    setSaveBanner("✅ تم اعتماد وحفظ تحرير الموضع في المتن المحقق بنجاح!");
    setTimeout(() => setSaveBanner(null), 3000);
  };

  const handleJumpToEditor = (block: CriticalBlock) => {
    setActiveBlock(block);
    setEditableMatn(block.matnText);
    setInlineEditMode(true);
    const jumpContext: EditorJumpContext = {
      bookId: activeBook.id,
      bookTitle: activeBook.title,
      blockId: block.id,
      seq: block.seq,
      volume: block.volume,
      page: block.page,
      matnText: block.matnText,
      selectedWitnessId: block.witnesses[activeWitnessIdx]?.id || "",
      selectedEditionId: block.editions[activeEditionIdx]?.id || "",
      timestamp: Date.now()
    };
    try {
      sessionStorage.setItem("mu7rer_editor_jump_context", JSON.stringify(jumpContext));
      localStorage.setItem("mu7rer_editor_jump_context", JSON.stringify(jumpContext));
    } catch (_) {}
  };

  const currentWitness = activeBlock?.witnesses[activeWitnessIdx] || activeBlock?.witnesses[0];
  const currentEdition = activeBlock?.editions[activeEditionIdx] || activeBlock?.editions[0];

  return (
    <div className="heritage-portal min-h-screen p-3 md:p-5" dir="rtl" style={{ backgroundColor: "#f3eedf", color: "#1e1a14" }}>
      <div className="max-w-[1620px] mx-auto" style={{ border: "3px double #8c734b", backgroundColor: "#fbf8f1", boxShadow: "0 6px 24px rgba(40,30,15,0.12)" }}>
        
        <div style={{ background: "linear-gradient(90deg, #163828 0%, #204d38 50%, #163828 100%)", color: "#f9f5eb", borderBottom: "3px solid #b68d40", padding: "14px 20px" }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div style={{ width: "48px", height: "48px", border: "2px solid #d4af37", backgroundColor: "#112b1f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", color: "#e6c665", fontWeight: "bold" }}>۞</div>
              <div>
                <div style={{ color: "#e0c068", fontSize: "12px", fontWeight: 700 }}>
                  خزانة مُحَرِّر للتراث الإسلامي المحقق • البحث الحي والمساعد التحقيقي
                </div>
                <h1 style={{ fontSize: "21px", fontWeight: 800, color: "#ffffff", margin: "2px 0" }}>
                  الجامع المحقق للمتون والكتب الخدمية ومعاينة المخطوطات والطبعات
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={async () => {
                  const r = await mountLibraryFolder();
                  if (r) {
                    setMountedLib(r);
                    setShowMountedBrowser(true);
                  }
                }}
                style={{ backgroundColor: "#2b5b44", color: "#fdf8ec", border: "1px solid #d4af37", padding: "8px 14px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
              >
                {mountedLib
                  ? "✓ الخزانة المربوطة: " + mountedLib.name + " (" + mountedLib.fileCount + " ملف)"
                  : "ربط خزانة محلية (.db / .bok)"}
              </button>
              {mountedLib && (
                <button
                  type="button"
                  onClick={() => setShowMountedBrowser(!showMountedBrowser)}
                  style={{ backgroundColor: "#112b1f", color: "#e6c665", border: "1px solid #d4af37", padding: "8px 12px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                >
                  {showMountedBrowser ? "إخفاء فهرس " + mountedLib.name : "📂 استعراض ملفات " + mountedLib.name}
                </button>
              )}
              <button
                type="button"
                onClick={() => activeBlock && handleJumpToEditor(activeBlock)}
                style={{ backgroundColor: "#b68d40", color: "#16120b", border: "1px solid #f3e0b5", padding: "8px 16px", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}
              >
                ✒️ تحرير الموضع الحالي فوراً
              </button>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: "#e8dfc8", borderBottom: "2px solid #a89267", padding: "12px 16px" }}>
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#1b4332" }}>🔎 الباحث الفوري في الخزانة والشاملة:</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => executeLiveSearch(e.target.value)}
                placeholder={mountedLib ? "ابحث في (" + mountedLib.name + ") أو في المتون والرواة (مثال: النيات، book، db، الحميدي)..." : "اكتب أي كلمة للبحث الفوري في المتون والرواة وملفات الشاملة..."}
                style={{ backgroundColor: "#fffdf8", border: "2px solid #1b4332", padding: "7px 14px", fontSize: "13px", minWidth: "360px", color: "#1e1a14", fontWeight: 600 }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                  style={{ backgroundColor: "#5c4318", color: "#fff", padding: "6px 12px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                >
                  مسح البحث ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span style={{ fontSize: "12px", fontWeight: 800 }}>الكتاب:</span>
              <select
                value={activeBook.id}
                onChange={(e) => { const f = books.find((b) => b.id === e.target.value); if (f) setActiveBook(f); }}
                style={{ backgroundColor: "#fffdf8", border: "1px solid #8c734b", padding: "6px 10px", fontSize: "13px", fontWeight: 700, color: "#1b4332" }}
              >
                {books.map((b) => (<option key={b.id} value={b.id}>{b.title} — {b.author}</option>))}
              </select>
            </div>
          </div>

          {searchQuery.trim() !== "" && (
            <div style={{ marginTop: "10px", backgroundColor: "#fffdf8", border: "2px solid #1b4332", padding: "12px", maxHeight: "260px", overflowY: "auto" }}>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#1b4332", marginBottom: "8px" }}>
                {isSearching ? "جاري البحث..." : "نتائج البحث الفوري (" + searchResults.length + " نتيجة):"}
              </div>
              {searchResults.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#5c4318" }}>لا توجد مطابقات مباشرة. جرب السؤال في المساعد التحقيقي أسفل المتن.</div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((r, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        if (r.block) setActiveBlock(r.block);
                        if (r.path) handleInspectMountedFile(r.path);
                      }}
                      style={{ padding: "8px 12px", border: "1px solid #c5b38a", backgroundColor: "#fbf8f1", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <div>
                        <span style={{ backgroundColor: "#1b4332", color: "#fff", padding: "2px 6px", fontSize: "10px", fontWeight: 700, marginLeft: "8px" }}>{r.type}</span>
                        <strong style={{ fontSize: "13px", color: "#1e1a14" }}>{r.title}</strong>
                        <p style={{ fontSize: "12px", color: "#4a3b22", marginTop: "2px" }}>{r.snippet}</p>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "#1b4332" }}>عرض ←</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showMountedBrowser && mountedLib && (
            <div style={{ marginTop: "10px", backgroundColor: "#fffdf8", border: "2px solid #8c6d3b", padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #c5b38a", paddingBottom: "6px", marginBottom: "8px" }}>
                <strong style={{ fontSize: "13px", color: "#4a3718" }}>
                  📂 فهرس ملفات وقواعد الخزانة المربوطة ({mountedLib.name} — {mountedLib.fileCount} عنصر):
                </strong>
                <span style={{ fontSize: "11px", color: "#1b4332", fontWeight: 700 }}>انقر على أي ملف لفحصه وقراءته</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2" style={{ maxHeight: "180px", overflowY: "auto" }}>
                {mountedLib.entries.slice(0, 80).map((entry, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleInspectMountedFile(entry.path)}
                    style={{ textAlign: "right", padding: "6px 10px", border: "1px solid #d8cbb0", backgroundColor: "#fbf8f1", fontSize: "12px", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={entry.path}
                  >
                    <span style={{ color: "#1b4332", fontWeight: 800 }}>{entry.kind === "directory" ? "📁 " : "📄 "}</span>
                    {entry.path}
                  </button>
                ))}
              </div>
              {selectedFilePreview && (
                <div style={{ marginTop: "8px", padding: "10px", backgroundColor: "#f4ead5", border: "1px solid #8c6d3b", fontSize: "12px" }}>
                  <div style={{ fontWeight: 800, color: "#1b4332", marginBottom: "4px" }}>معاينة الملف: {selectedFilePreview.path}</div>
                  <p style={{ lineHeight: "1.8", fontFamily: "monospace" }}>{selectedFilePreview.content}</p>
                </div>
              )}
            </div>
          )}

          {saveBanner && (
            <div style={{ marginTop: "8px", padding: "8px 12px", backgroundColor: "#e6f0eb", border: "2px solid #1b4332", color: "#123023", fontSize: "13px", fontWeight: 800 }}>
              {saveBanner}
            </div>
          )}
        </div>

        {inlineEditMode && (
          <div style={{ backgroundColor: "#fcf8ee", borderBottom: "3px solid #1b4332", padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#1b4332" }}>
                ✒️ محرر الموضع المباشر ({activeBlock.chapter} — ص {activeBlock.page})
              </div>
              <div className="flex gap-2">
                {REAL_EDITOR_ROUTE !== "/" && (
                  <a href={REAL_EDITOR_ROUTE} style={{ backgroundColor: "#5c4318", color: "#fff", padding: "5px 12px", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>
                    فتح في شاشة المحرر الكاملة
                  </a>
                )}
                <button type="button" onClick={() => setInlineEditMode(false)} style={{ backgroundColor: "#e8dfc8", border: "1px solid #8c734b", padding: "5px 10px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                  إغلاق ✕
                </button>
              </div>
            </div>
            <textarea
              value={editableMatn}
              onChange={(e) => setEditableMatn(e.target.value)}
              rows={4}
              className="heritage-matn w-full"
              style={{ width: "100%", border: "2px solid #1b4332", backgroundColor: "#ffffff", padding: "12px", fontSize: "1.25rem" }}
            />
            <div className="flex justify-end mt-2">
              <button type="button" onClick={handleSaveInlineEdit} style={{ backgroundColor: "#1b4332", color: "#fff", padding: "7px 18px", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
                💾 حفظ التعديل في المتن
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12" style={{ borderBottom: "2px solid #8c734b" }}>
          
          <div className="lg:col-span-3" style={{ backgroundColor: "#f5efe0", borderLeft: "2px solid #9e875b" }}>
            <div style={{ background: "linear-gradient(180deg, #4a3718 0%, #36270f 100%)", color: "#f9f3e3", borderBottom: "2px solid #b68d40", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "14px" }}>
              <span>📜 النسخ المخطوطة المعتمدة</span>
              <span style={{ backgroundColor: "#b68d40", color: "#1a1409", padding: "2px 8px", fontSize: "11px" }}>{activeBlock?.witnesses.length || 0}</span>
            </div>
            <div className="p-3.5 space-y-3">
              <div className="grid grid-cols-1 gap-1.5">
                {activeBlock?.witnesses.map((w, idx) => (
                  <button key={w.id} type="button" onClick={() => setActiveWitnessIdx(idx)} style={{ textAlign: "right", padding: "7px 10px", fontSize: "12px", fontWeight: 700, border: idx === activeWitnessIdx ? "2px solid #1b4332" : "1px solid #b8a477", backgroundColor: idx === activeWitnessIdx ? "#1b4332" : "#fbf8f1", color: idx === activeWitnessIdx ? "#ffffff" : "#2b2317", cursor: "pointer" }}>
                    رمز النسخة: {w.siglum}
                  </button>
                ))}
              </div>
              {currentWitness && (
                <>
                  <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fbf8f1", border: "1px solid #b8a477", fontSize: "12px" }}>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid #d8cbb0" }}><td style={{ padding: "6px 8px", fontWeight: 800, backgroundColor: "#ebe2cc", width: "34%" }}>النسخة</td><td style={{ padding: "6px 8px" }}>{currentWitness.title}</td></tr>
                      <tr style={{ borderBottom: "1px solid #d8cbb0" }}><td style={{ padding: "6px 8px", fontWeight: 800, backgroundColor: "#ebe2cc" }}>اللوحة</td><td style={{ padding: "6px 8px", color: "#1b4332", fontWeight: 700 }}>{currentWitness.folio}</td></tr>
                      <tr><td style={{ padding: "6px 8px", fontWeight: 800, backgroundColor: "#ebe2cc" }}>التاريخ</td><td style={{ padding: "6px 8px" }}>{currentWitness.dateHijri}</td></tr>
                    </tbody>
                  </table>
                  <div style={{ backgroundColor: "#eadcc3", border: "2px solid #8c6d3b", padding: "12px" }}>
                    <div style={{ borderBottom: "1px solid #a68b5b", paddingBottom: "4px", marginBottom: "8px", fontSize: "11px", fontWeight: 800, color: "#4a3512" }}>
                      قراءة السطر المقابل في المخطوط:
                    </div>
                    <p className="heritage-matn" style={{ fontSize: "1.1rem", lineHeight: "2.0", backgroundColor: "#f4ead5", padding: "10px", border: "1px dashed #8c6d3b" }}>{currentWitness.linePreview}</p>
                    <div style={{ marginTop: "8px", fontSize: "11px", color: "#4a3b22", fontWeight: 600 }}>{currentWitness.notes}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-6" style={{ backgroundColor: "#fffdf8" }}>
            <div style={{ background: "linear-gradient(180deg, #1b4332 0%, #122e22 100%)", color: "#ffffff", borderBottom: "2px solid #b68d40", padding: "10px 16px", display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "14px" }}>
              <span>📖 المتن المحقق المخدوم — {activeBook.title}</span>
              <span style={{ fontSize: "11px", color: "#e6c665" }}>انقر على أي موضع للتحرير</span>
            </div>
            <div className="p-5 space-y-5">
              
              <div style={{ border: "2px solid #1b4332", backgroundColor: "#f8f5ec" }}>
                <div style={{ backgroundColor: "#1b4332", color: "#fff", padding: "8px 14px", fontSize: "13px", fontWeight: 800, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>🤖 المحادثة والبحث الحي في الخزانة المربوطة والمتن</span>
                  <span style={{ fontSize: "11px", color: "#e6c665" }}>
                    {mountedLib ? "متصل بـ: " + mountedLib.name : "جاهز للاختبار"}
                  </span>
                </div>
                <div style={{ maxHeight: "190px", overflowY: "auto", padding: "12px" }}>
                  {chatMessages.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        marginBottom: "8px",
                        padding: "8px 12px",
                        backgroundColor: m.role === "user" ? "#e8dfc8" : "#ffffff",
                        border: m.role === "user" ? "1px solid #8c734b" : "1px solid #1b4332",
                        fontSize: "13px",
                        lineHeight: "1.8",
                        whiteSpace: "pre-line"
                      }}
                    >
                      <strong style={{ color: m.role === "user" ? "#5c4318" : "#1b4332" }}>
                        {m.role === "user" ? "الباحث: " : "مساعد الخزانة: "}
                      </strong>
                      <span>{m.text}</span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendChat} style={{ display: "flex", borderTop: "1px solid #c5b38a", backgroundColor: "#fff" }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="اسأل المساعد (مثال: ما ملفات الشاملة المربوطة؟ أو: خرج الحديث، أو: ما فروق النسخ؟)..."
                    style={{ flex: 1, padding: "9px 12px", fontSize: "13px", border: "none", outline: "none", backgroundColor: "#fffdf8" }}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading}
                    style={{ backgroundColor: "#1b4332", color: "#fff", padding: "9px 18px", fontSize: "13px", fontWeight: 800, cursor: "pointer", border: "none" }}
                  >
                    {chatLoading ? "..." : "إرسال ↵"}
                  </button>
                </form>
              </div>

              {activeBook.blocks.map((block) => {
                const isSelected = block.id === activeBlock?.id;
                return (
                  <div key={block.id} onClick={() => setActiveBlock(block)} style={{ border: isSelected ? "2px solid #1b4332" : "1px solid #c5b38a", backgroundColor: isSelected ? "#fcf8ee" : "#ffffff", cursor: "pointer" }}>
                    <div style={{ backgroundColor: isSelected ? "#e3d8be" : "#efe8d5", borderBottom: "1px solid #c5b38a", padding: "7px 14px", display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 800 }}>
                      <span>{block.chapter}</span>
                      <span style={{ color: "#1b4332" }}>[ج {block.volume} / ص {block.page} • #{block.seq}]</span>
                    </div>
                    <div style={{ padding: "16px 20px" }}>
                      <p className="heritage-matn select-text" style={{ textAlign: "justify" }}>{block.matnText}</p>
                      {block.apparatusFootnotes.length > 0 && (
                        <div style={{ marginTop: "14px", borderTop: "2px solid #b8a477", backgroundColor: "#f8f3e6", padding: "10px 14px" }}>
                          <div style={{ fontSize: "12px", fontWeight: 800, color: "#5c4318", marginBottom: "4px" }}>حاشية التحقيق وفروق النسخ:</div>
                          {block.apparatusFootnotes.map((fn, i) => (<p key={i} style={{ fontSize: "13px", lineHeight: "1.8", color: "#33291a" }}>{fn}</p>))}
                        </div>
                      )}
                    </div>
                    <div style={{ backgroundColor: "#f2ead7", borderTop: "1px solid #c5b38a", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#52432b" }}>معاينة متزامنة مع المخطوط والطبعات</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleJumpToEditor(block); }} style={{ backgroundColor: "#1b4332", color: "#ffffff", border: "1px solid #0f291e", padding: "5px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                        ✒️ حرر هذا الموضع الآن
                      </button>
                    </div>
                  </div>
                );
              })}

              {activeBlock && (
                <div style={{ border: "2px solid #8c734b", backgroundColor: "#fbf8f1" }}>
                  <div style={{ backgroundColor: "#2c3e35", color: "#f9f5eb", borderBottom: "2px solid #b68d40", padding: "8px 14px", fontSize: "13px", fontWeight: 800 }}>
                    خزانة الخدمات العلمية والشبكة العلائقية
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", backgroundColor: "#e6dec8", borderBottom: "2px solid #8c734b" }}>
                    {[
                      { id: "takhrij", label: "التخريج (3 مستويات)" },
                      { id: "isnad", label: "الإسناد والرواة" },
                      { id: "unified", label: "المتن المجمع" },
                      { id: "commentaries", label: "الشروح" },
                      { id: "gharib", label: "غريب المتن" },
                      { id: "topics", label: "الربط الموضوعي" }
                    ].map((tab) => (
                      <button key={tab.id} type="button" onClick={() => setActiveServiceTab(tab.id as any)} style={{ padding: "8px 12px", fontSize: "12px", fontWeight: 800, borderLeft: "1px solid #a89267", backgroundColor: activeServiceTab === tab.id ? "#1b4332" : "transparent", color: activeServiceTab === tab.id ? "#ffffff" : "#2c2212", cursor: "pointer" }}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ padding: "14px", backgroundColor: "#fffdf8", fontSize: "13px", lineHeight: "1.9" }}>
                    {activeServiceTab === "takhrij" && (
                      <div>
                        <div className="flex gap-2 mb-3">
                          {(["summary","medium","detailed"] as const).map((lvl) => (
                            <button key={lvl} type="button" onClick={() => setTakhrijLevel(lvl)} style={{ padding: "4px 10px", fontSize: "12px", fontWeight: 700, border: "1px solid #8c734b", backgroundColor: takhrijLevel === lvl ? "#5c4318" : "#f5efe0", color: takhrijLevel === lvl ? "#fff" : "#2c2212" }}>
                              {lvl === "summary" ? "إجمالي" : lvl === "medium" ? "متوسط" : "تفصيلي"}
                            </button>
                          ))}
                        </div>
                        <p>{activeBlock.takhrij[takhrijLevel]}</p>
                      </div>
                    )}
                    {activeServiceTab === "isnad" && (
                      <div className="space-y-2">
                        <div style={{ padding: "6px 10px", backgroundColor: "#e8f0ec", border: "1px solid #1b4332", fontWeight: 800 }}>{activeBlock.isnads.ruling}</div>
                        {activeBlock.isnads.chain.map((r, i) => (
                          <div key={r.id} style={{ padding: "6px 10px", border: "1px solid #dcd0b8", backgroundColor: "#fbf8f1" }}>
                            <strong>{i + 1}. {r.name} ({r.deathYear})</strong> — {r.tabaqa} — <span style={{ color: "#1b4332", fontWeight: 700 }}>{r.rank} ({r.jarhWaTadil})</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {activeServiceTab === "unified" && (<p className="heritage-matn">{activeBlock.unifiedMatn}</p>)}
                    {activeServiceTab === "commentaries" && activeBlock.commentaries.map((c, i) => (<div key={i} style={{ marginBottom: "8px", padding: "8px", border: "1px solid #c5b38a", backgroundColor: "#f8f3e6" }}><strong>{c.book} ({c.author}):</strong> {c.excerpt}</div>))}
                    {activeServiceTab === "gharib" && activeBlock.gharib.map((g, i) => (<div key={i} style={{ marginBottom: "6px" }}><strong>{g.term}:</strong> {g.meaning}</div>))}
                    {activeServiceTab === "topics" && activeBlock.topics.map((t, i) => (<div key={i} style={{ marginBottom: "6px" }}><strong>{t.path}</strong> {t.contraryRef ? " — (" + t.contraryRef + ")" : ""}</div>))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3" style={{ backgroundColor: "#f5efe0", borderRight: "2px solid #9e875b" }}>
            <div style={{ background: "linear-gradient(180deg, #4a3718 0%, #36270f 100%)", color: "#f9f3e3", borderBottom: "2px solid #b68d40", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "14px" }}>
              <span>🖨️ موازن الطبعات السالفة</span>
              <span style={{ backgroundColor: "#b68d40", color: "#1a1409", padding: "2px 8px", fontSize: "11px" }}>{activeBlock?.editions.length || 0}</span>
            </div>
            <div className="p-3.5 space-y-3">
              <div className="grid grid-cols-1 gap-1.5">
                {activeBlock?.editions.map((ed, idx) => (
                  <button key={ed.id} type="button" onClick={() => setActiveEditionIdx(idx)} style={{ textAlign: "right", padding: "7px 10px", fontSize: "12px", fontWeight: 700, border: idx === activeEditionIdx ? "2px solid #1b4332" : "1px solid #b8a477", backgroundColor: idx === activeEditionIdx ? "#1b4332" : "#fbf8f1", color: idx === activeEditionIdx ? "#ffffff" : "#2b2317", cursor: "pointer" }}>
                    {ed.name} ({ed.year})
                  </button>
                ))}
              </div>
              {currentEdition && (
                <>
                  <div style={{ backgroundColor: "#fffdf8", border: "1px solid #b8a477", padding: "10px 12px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 800, color: "#5c4318", marginBottom: "6px" }}>نص الموضع في الطبعة السالفة:</div>
                    <p className="heritage-matn" style={{ fontSize: "1.08rem", lineHeight: "1.95" }}>{currentEdition.textVariant}</p>
                  </div>
                  <div style={{ backgroundColor: "#e6f0eb", border: "2px solid #1b4332", padding: "10px 12px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: "#1b4332", marginBottom: "5px" }}>✨ ما قدمته الطبعة الجديدة:</div>
                    <p style={{ fontSize: "12px", lineHeight: "1.8", color: "#132a1f", fontWeight: 600 }}>{currentEdition.newEditionAdvantage}</p>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
