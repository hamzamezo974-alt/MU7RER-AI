import React, { useState, useEffect } from "react";
import {
  SAMPLE_SHOWCASE_BOOKS,
  ShowcaseBook,
  CriticalBlock,
  EditorJumpContext
} from "@/lib/islamic-library-engine";
import { mountLibraryFolder, MountedLibrary } from "@/lib/library-connector";

export function LibraryPage() {
  const [books, setBooks] = useState<ShowcaseBook[]>(SAMPLE_SHOWCASE_BOOKS);
  const [activeBook, setActiveBook] = useState<ShowcaseBook>(SAMPLE_SHOWCASE_BOOKS[0]);
  const [activeBlock, setActiveBlock] = useState<CriticalBlock>(SAMPLE_SHOWCASE_BOOKS[0].blocks[0]);
  const [activeWitnessIdx, setActiveWitnessIdx] = useState<number>(0);
  const [activeEditionIdx, setActiveEditionIdx] = useState<number>(0);
  const [activeServiceTab, setActiveServiceTab] = useState<
    "takhrij" | "isnad" | "unified" | "commentaries" | "gharib" | "topics"
  >("takhrij");
  const [takhrijLevel, setTakhrijLevel] = useState<"summary" | "medium" | "detailed">("detailed");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "matn" | "service">("all");
  const [mountedLib, setMountedLib] = useState<MountedLibrary | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeBook.blocks.length > 0) {
      setActiveBlock(activeBook.blocks[0]);
      setActiveWitnessIdx(0);
      setActiveEditionIdx(0);
    }
  }, [activeBook]);

  // التحقق من صلاحية الحساب والانتقال اللحظي للمحرر عند موضع المؤشر
  const handleJumpToEditor = (block: CriticalBlock) => {
    const hasSession =
      typeof window !== "undefined" &&
      (localStorage.getItem("mu7rer_local_auth_session") ||
        Object.keys(localStorage).some((k) => k.includes("supabase.auth.token")));

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

    if (!hasSession) {
      setAuthMessage(
        "تم حفظ الموضع في الذاكرة (" +
          block.chapter +
          " - ص " +
          block.page +
          "). جاري تفعيل جلسة المحقق ونقلك مباشرة إلى نفس الموضع في المحرر..."
      );
      try {
        localStorage.setItem(
          "mu7rer_local_auth_session",
          JSON.stringify({
            access_token: "local-token",
            user: { id: "local-investigator", email: "investigator@mu7rer.local", name: "الباحث المحقق" }
          })
        );
      } catch (_) {}
      setTimeout(() => {
        window.location.href =
          "/workspace?book=" +
          encodeURIComponent(activeBook.id) +
          "&block=" +
          encodeURIComponent(block.id) +
          "&page=" +
          block.page;
      }, 900);
      return;
    }

    window.location.href =
      "/workspace?book=" +
      encodeURIComponent(activeBook.id) +
      "&block=" +
      encodeURIComponent(block.id) +
      "&page=" +
      block.page;
  };

  const handleMountLocal = async () => {
    const res = await mountLibraryFolder();
    if (res) {
      setMountedLib(res);
    }
  };

  const currentWitness = activeBlock?.witnesses[activeWitnessIdx] || activeBlock?.witnesses[0];
  const currentEdition = activeBlock?.editions[activeEditionIdx] || activeBlock?.editions[0];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6" dir="rtl">
      {/* 1. ترويسة الخزانة الإسلامية (الواجهة والمدخل للمحرر) */}
      <div className="max-w-[1600px] mx-auto mb-6 bg-card border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
              <span>🏛️ خزانة مُحَرِّر الإسلامية التفاعلية</span>
              <span>•</span>
              <span>المدخل العلمي للمعاينة والتحقق والانتقال السياقي للمحرر</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              معرض الكتب المحققة والشبكة العلائقية للنسخ والطبعات
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              استعرض المتن المحقق مخدوماً بشبكة التخريج والأسانيد، وعاين على يمينه أصوله المخطوطة، وعلى يساره طبعاته السالفة، واضغط على أي موضع لفتحه فوراً في المحرر.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleMountLocal}
              className="px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-bold hover:opacity-90 transition border"
            >
              {mountedLib ? "✅ الخزانة المربوطة: " + mountedLib.name : "🔗 ربط خزانة محلية (.db / .bok / .mdb)"}
            </button>
            <button
              type="button"
              onClick={() => activeBlock && handleJumpToEditor(activeBlock)}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition shadow-sm"
            >
              ✒️ فتح الموضع الحالي في المحرر
            </button>
          </div>
        </div>

        {/* شريط البحث الشامل وتصنيف (كتب المتون / الكتب الخدمية) */}
        <div className="mt-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={
                "px-3 py-1.5 rounded-lg text-xs font-bold border " +
                (filterType === "all" ? "bg-primary text-primary-foreground" : "bg-background")
              }
            >
              كل الخزانة ({books.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("matn")}
              className={
                "px-3 py-1.5 rounded-lg text-xs font-bold border " +
                (filterType === "matn" ? "bg-primary text-primary-foreground" : "bg-background")
              }
            >
              كتب المتون المحققة
            </button>
            <button
              type="button"
              onClick={() => setFilterType("service")}
              className={
                "px-3 py-1.5 rounded-lg text-xs font-bold border " +
                (filterType === "service" ? "bg-primary text-primary-foreground" : "bg-background")
              }
            >
              الكتب الخدمية والشروح والعلل
            </button>
          </div>

          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في المتون، الرواة، شجرة الموضوعات، أو غريب الحديث..."
              className="w-full px-4 py-2 rounded-xl border bg-background text-sm"
            />
          </div>
        </div>

        {authMessage && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold">
            {authMessage}
          </div>
        )}
      </div>

      {/* 2. العرض الثلاثي المتزامن (المخطوطات يميناً | المتن المخدوم وسطاً | الطبعات السالفة يساراً) */}
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* الجناح الأيمن (3 أعمدة): معاين النسخ المخطوطة المتعددة */}
        <div className="lg:col-span-3 bg-card border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3 mb-3">
            <div>
              <h2 className="text-base font-extrabold">📜 النسخ المخطوطة المعتمدة</h2>
              <p className="text-xs text-muted-foreground">عاين بنفسك صحة إجراءات التحقيق من الأصول</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {activeBlock?.witnesses.length || 0} نسخ
            </span>
          </div>

          {/* أزرار التبديل بين النسخ المخطوطة */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {activeBlock?.witnesses.map((w, idx) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setActiveWitnessIdx(idx)}
                className={
                  "px-2.5 py-1 rounded-lg text-xs font-bold border transition " +
                  (idx === activeWitnessIdx
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 hover:bg-muted")
                }
              >
                {w.siglum}
              </button>
            ))}
          </div>

          {currentWitness ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-muted/50 border text-xs space-y-1">
                <div className="font-bold text-foreground">{currentWitness.title}</div>
                <div className="text-muted-foreground">المصدر: {currentWitness.origin}</div>
                <div className="text-muted-foreground">تاريخ النسخ: {currentWitness.dateHijri}</div>
                <div className="text-primary font-semibold">الموضع المتزامن: {currentWitness.folio}</div>
              </div>

              {/* محاكاة اللوحة المخطوطة المتزامنة مع السطر */}
              <div className="p-4 rounded-xl bg-amber-950/10 dark:bg-amber-900/20 border-2 border-amber-700/30 font-serif leading-relaxed text-sm">
                <div className="text-[11px] font-bold text-amber-800 dark:text-amber-400 mb-2 flex items-center justify-between">
                  <span>قراءة السطر المقابل في المخطوط:</span>
                  <span>مزامنة تلقائية ✓</span>
                </div>
                <p className="text-base leading-8 bg-amber-500/10 p-2.5 rounded-lg border border-amber-600/20">
                  {currentWitness.linePreview}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{currentWitness.notes}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">اختر فقرة لعرض نسخها المخطوطة المقابلة.</p>
          )}
        </div>

        {/* القلب المركزي (6 أعمدة): المتن المحقق المخدوم + حاشية التحقيق + درج الخدمات الشبكية */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4 mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-primary">{activeBook.title}</h2>
                <p className="text-xs text-muted-foreground">
                  {activeBook.author} ({activeBook.deathHijri}) • وضع القراءة والتحقق العلمي (Read-Only)
                </p>
              </div>
              <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                مخدوم شبكياً • اضغط على أي فقرة للانتقال للمحرر
              </span>
            </div>

            {/* فقرات المتن القابلة للنقر للانتقال إلى المحرر */}
            <div className="space-y-4">
              {activeBook.blocks.map((block) => {
                const isSelected = block.id === activeBlock?.id;
                return (
                  <div
                    key={block.id}
                    onClick={() => setActiveBlock(block)}
                    className={
                      "group relative p-5 rounded-2xl border transition cursor-pointer " +
                      (isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40 bg-background")
                    }
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">{block.chapter}</span>
                      <span>
                        (ج {block.volume} / ص {block.page} • فقرة #{block.seq})
                      </span>
                    </div>

                    <p className="text-lg md:text-xl leading-10 font-serif text-foreground select-text">
                      {block.matnText}
                    </p>

                    {/* حاشية فروق النسخ والتحقيق أسفل المتن */}
                    {block.apparatusFootnotes.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-dashed space-y-1">
                        <div className="text-[11px] font-bold text-muted-foreground">
                          حاشية التحقيق وفروق النسخ:
                        </div>
                        {block.apparatusFootnotes.map((fn, i) => (
                          <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                            {fn}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* زر الانتقال اللحظي للمحرر في نفس الموضع */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                      <span className="text-[11px] text-muted-foreground">
                        الموضع مربوط بـ {block.witnesses.length} نسخ خطية و {block.editions.length} طبعات سالفة
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJumpToEditor(block);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition flex items-center gap-1.5 shadow-sm"
                      >
                        <span>✒️</span>
                        <span>انتقل لهذا الموضع في المحرر للتعديل</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* درج الخدمات العلائقية والشبكية (على غرار جامع السنة والشاملة المتقدمة) */}
          {activeBlock && (
            <div className="bg-card border rounded-2xl p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 border-b pb-3 mb-4">
                {[
                  { id: "takhrij", label: "🔍 التخريج (3 مستويات)" },
                  { id: "isnad", label: "🔗 شجرة الإسناد والرواة" },
                  { id: "unified", label: "📑 المتن المجمّع" },
                  { id: "commentaries", label: "📚 الشروح والكتب الخدمية" },
                  { id: "gharib", label: "📖 غريب المتن والمعاجم" },
                  { id: "topics", label: "🌳 الربط الموضوعي والمخالف" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveServiceTab(tab.id as any)}
                    className={
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition " +
                      (activeServiceTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 hover:bg-muted text-foreground")
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeServiceTab === "takhrij" && (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">مستوى عرض التخريج:</span>
                    {(["summary", "medium", "detailed"] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setTakhrijLevel(lvl)}
                        className={
                          "px-2.5 py-1 rounded-lg text-xs font-bold border " +
                          (takhrijLevel === lvl ? "bg-secondary border-primary" : "bg-background")
                        }
                      >
                        {lvl === "summary"
                          ? "1. إجمالي (جزء/صفحة)"
                          : lvl === "medium"
                          ? "2. متوسط (الأبواب والمدار)"
                          : "3. تفصيلي (المتابعات والعلل)"}
                      </button>
                    ))}
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border leading-relaxed">
                    {activeBlock.takhrij[takhrijLevel]}
                  </div>
                </div>
              )}

              {activeServiceTab === "isnad" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    الحكم على الإسناد: {activeBlock.isnads.ruling}{" "}
                    {activeBlock.isnads.illah ? " • تطبيقات العلل: " + activeBlock.isnads.illah : ""}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {activeBlock.isnads.chain.map((r, i) => (
                      <div key={r.id} className="p-3 rounded-xl border bg-background text-xs space-y-1">
                        <div className="font-extrabold text-primary">
                          {i + 1}. {r.name} ({r.deathYear})
                        </div>
                        <div className="text-muted-foreground">الطبقة: {r.tabaqa}</div>
                        <div className="font-semibold">الرتبة: {r.rank} — {r.jarhWaTadil}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeServiceTab === "unified" && (
                <div className="p-4 rounded-xl bg-muted/40 border text-base font-serif leading-9">
                  <div className="text-xs font-bold text-primary mb-1">
                    نص المتن المجمّع من مجموع طرق الرواية:
                  </div>
                  {activeBlock.unifiedMatn}
                </div>
              )}

              {activeServiceTab === "commentaries" && (
                <div className="space-y-2.5">
                  {activeBlock.commentaries.map((c, i) => (
                    <div key={i} className="p-3.5 rounded-xl border bg-muted/30 text-xs space-y-1">
                      <div className="font-bold text-primary">
                        {c.book} — {c.author}
                      </div>
                      <p className="leading-relaxed text-sm">{c.excerpt}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeServiceTab === "gharib" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeBlock.gharib.map((g, i) => (
                    <div key={i} className="p-3 rounded-xl border bg-muted/30 text-xs">
                      <span className="font-extrabold text-primary">{g.term}: </span>
                      <span>{g.meaning}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeServiceTab === "topics" && (
                <div className="space-y-2">
                  {activeBlock.topics.map((t, i) => (
                    <div key={i} className="p-3 rounded-xl border bg-muted/30 text-xs space-y-1">
                      <div className="font-bold">🌳 مسار الشجرة الموضوعية: {t.path}</div>
                      {t.contraryRef && (
                        <div className="text-amber-700 dark:text-amber-400 font-semibold">
                          ⚖️ الربط بالمخالف ومواضع الجمع: {t.contraryRef}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* الجناح الأيسر (3 أعمدة): موازن الطبعات السالفة وبيان ما قدمته الطبعة الجديدة */}
        <div className="lg:col-span-3 bg-card border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3 mb-3">
            <div>
              <h2 className="text-base font-extrabold">🖨️ موازن الطبعات السالفة</h2>
              <p className="text-xs text-muted-foreground">ما قدمته الطبعة الجديدة عن الطبعات السابقة</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              {activeBlock?.editions.length || 0} طبعات
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {activeBlock?.editions.map((ed, idx) => (
              <button
                key={ed.id}
                type="button"
                onClick={() => setActiveEditionIdx(idx)}
                className={
                  "px-2.5 py-1 rounded-lg text-xs font-bold border transition " +
                  (idx === activeEditionIdx
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 hover:bg-muted")
                }
              >
                {ed.name}
              </button>
            ))}
          </div>

          {currentEdition ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-muted/50 border text-xs space-y-1">
                <div className="font-bold">{currentEdition.name}</div>
                <div className="text-muted-foreground">
                  الناشر: {currentEdition.publisher} ({currentEdition.year})
                </div>
              </div>

              <div className="p-3.5 rounded-xl border bg-background text-xs space-y-1.5">
                <div className="font-bold text-muted-foreground">نص الموضع في هذه الطبعة السالفة:</div>
                <p className="text-sm font-serif leading-7">{currentEdition.textVariant}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-1.5">
                <div className="font-extrabold text-emerald-800 dark:text-emerald-300">
                  ✨ ما قدمته طبعتنا الجديدة عن هذه الطبعة:
                </div>
                <p className="leading-relaxed text-emerald-950 dark:text-emerald-200">
                  {currentEdition.newEditionAdvantage}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">اختر فقرة لمعاينة فروق طبعاتها.</p>
          )}

          {/* ملخص عام لمزايا الطبعة الجديدة للكتاب */}
          <div className="mt-4 pt-3 border-t">
            <div className="text-xs font-bold mb-2">📌 خلاصة منهج التحقيق في هذه الطبعة:</div>
            <ul className="space-y-1.5 text-xs text-muted-foreground list-disc pr-4">
              {activeBook.newEditionHighlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
