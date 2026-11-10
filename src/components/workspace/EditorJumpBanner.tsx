import React, { useEffect, useState } from "react";
import { EditorJumpContext, SAMPLE_SHOWCASE_BOOKS, CriticalBlock } from "@/lib/islamic-library-engine";

export function EditorJumpBanner() {
  const [ctx, setCtx] = useState<EditorJumpContext | null>(null);
  const [blockData, setBlockData] = useState<CriticalBlock | null>(null);
  const [editableText, setEditableText] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    try {
      const raw =
        sessionStorage.getItem("mu7rer_editor_jump_context") ||
        localStorage.getItem("mu7rer_editor_jump_context");
      if (raw) {
        const parsed: EditorJumpContext = JSON.parse(raw);
        setCtx(parsed);
        setEditableText(parsed.matnText || "");
        const book = SAMPLE_SHOWCASE_BOOKS.find((b) => b.id === parsed.bookId);
        const blk = book?.blocks.find((b) => b.id === parsed.blockId) || null;
        setBlockData(blk);
      }
    } catch (_) {}
  }, []);

  if (!ctx) return null;

  const handleSaveEdit = () => {
    try {
      const updated = { ...ctx, matnText: editableText, timestamp: Date.now() };
      localStorage.setItem("mu7rer_editor_jump_context", JSON.stringify(updated));
      setCtx(updated);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } catch (_) {}
  };

  const handleClose = () => {
    sessionStorage.removeItem("mu7rer_editor_jump_context");
    setCtx(null);
  };

  return (
    <div className="mb-4 rounded-2xl border-2 border-primary/40 bg-card p-4 shadow-md" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
            ✒️ وضع التحرير المباشر من الخزانة
          </span>
          <span className="text-sm font-extrabold">{ctx.bookTitle}</span>
          <span className="text-xs text-muted-foreground">
            (ج {ctx.volume} / ص {ctx.page} • فقرة #{ctx.seq})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/library"
            className="px-3 py-1 rounded-lg border text-xs font-bold hover:bg-muted transition"
          >
            🏛️ العودة لمعاينة الخزانة
          </a>
          <button
            type="button"
            onClick={handleClose}
            className="px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:bg-muted"
          >
            إغلاق اللوحة ✕
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* يمين: المخطوط المرافق للموضع */}
        <div className="lg:col-span-3 p-3 rounded-xl bg-amber-500/10 border border-amber-600/25 text-xs space-y-1.5">
          <div className="font-extrabold text-amber-800 dark:text-amber-300">
            📜 قراءة النسخة الخطية المرافقة:
          </div>
          <p className="font-serif text-sm leading-7">
            {blockData?.witnesses[0]?.linePreview || "النسخة اليونينية والصغانية متزامنة مع السطر."}
          </p>
        </div>

        {/* وسط: محرر المتن المباشر */}
        <div className="lg:col-span-6 space-y-2">
          <label className="block text-xs font-bold text-primary">
            تحرير المتن المحقق في هذا الموضع (قابل للتعديل الفوري):
          </label>
          <textarea
            value={editableText}
            onChange={(e) => setEditableText(e.target.value)}
            rows={4}
            className="w-full rounded-xl border bg-background p-3 font-serif text-base leading-8 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {savedNotice ? "✅ تم حفظ التعديل وتحديث الموضع بنجاح!" : "أي تعديل هنا يُحفظ في سجل تحقيق الموضع."}
            </span>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition"
            >
              💾 اعتماد وحفظ التعديل في المحرر
            </button>
          </div>
        </div>

        {/* يسار: الطبعة السالفة المقابلة */}
        <div className="lg:col-span-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-600/25 text-xs space-y-1.5">
          <div className="font-extrabold text-emerald-800 dark:text-emerald-300">
            🖨️ الطبعة السالفة المقابلة:
          </div>
          <p className="font-serif text-sm leading-7">
            {blockData?.editions[0]?.textVariant || "طبعة بولاق والطبعة السلفية للمقارنة."}
          </p>
        </div>
      </div>
    </div>
  );
}
