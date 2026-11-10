import React, { useEffect, useState } from "react";
import { EditorJumpContext, SAMPLE_SHOWCASE_BOOKS, CriticalBlock } from "@/lib/islamic-library-engine";

export function EditorJumpBanner() {
  const [ctx, setCtx] = useState<EditorJumpContext | null>(null);
  const [blockData, setBlockData] = useState<CriticalBlock | null>(null);
  const [editableText, setEditableText] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("mu7rer_editor_jump_context") || localStorage.getItem("mu7rer_editor_jump_context");
      const parsed: EditorJumpContext = raw ? JSON.parse(raw) : {
        bookId: SAMPLE_SHOWCASE_BOOKS[0].id,
        bookTitle: SAMPLE_SHOWCASE_BOOKS[0].title,
        blockId: SAMPLE_SHOWCASE_BOOKS[0].blocks[0].id,
        seq: 1,
        volume: 1,
        page: 6,
        matnText: SAMPLE_SHOWCASE_BOOKS[0].blocks[0].matnText,
        selectedWitnessId: "ms-yuniniya",
        selectedEditionId: "ed-bulaq",
        timestamp: Date.now()
      };
      setCtx(parsed);
      setEditableText(parsed.matnText || "");
      const book = SAMPLE_SHOWCASE_BOOKS.find((b) => b.id === parsed.bookId) || SAMPLE_SHOWCASE_BOOKS[0];
      const blk = book?.blocks.find((b) => b.id === parsed.blockId) || book?.blocks[0] || null;
      setBlockData(blk);
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

  return (
    <div className="heritage-portal p-3 md:p-4" dir="rtl" style={{ backgroundColor: "#f3eedf", color: "#1e1a14", borderBottom: "3px double #8c734b" }}>
      <div className="max-w-[1620px] mx-auto" style={{ border: "2px solid #8c734b", backgroundColor: "#fbf8f1", boxShadow: "0 4px 16px rgba(40,30,15,0.1)" }}>
        <div style={{ background: "linear-gradient(90deg, #163828 0%, #204d38 50%, #163828 100%)", color: "#f9f5eb", borderBottom: "2px solid #b68d40", padding: "10px 16px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
          <div className="flex items-center gap-2">
            <span style={{ backgroundColor: "#b68d40", color: "#16120b", padding: "3px 10px", fontSize: "12px", fontWeight: 800 }}>
              {"\u2712\ufe0f \u0645\u0646\u0636\u062f\u0629 \u0627\u0644\u062a\u062d\u0642\u064a\u0642 \u0648\u0627\u0644\u062a\u062d\u0631\u064a\u0631 \u0627\u0644\u0645\u0624\u0637\u0631\u0629"}
            </span>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "#fff" }}>{ctx.bookTitle}</span>
            <span style={{ fontSize: "12px", color: "#e6c665" }}>{"[\u062c "}{ctx.volume}{" / \u0635 "}{ctx.page}{" • \u0641\u0642\u0631\u0629 #"}{ctx.seq}{"]"}</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/library" style={{ backgroundColor: "#2b5b44", color: "#fff", border: "1px solid #d4af37", padding: "5px 12px", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>
              {"\ud83c\udfdb\ufe0f \u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0648\u0627\u062c\u0647\u0629 \u0627\u0644\u062e\u0632\u0627\u0646\u0629 (\u0648\u0636\u0639 \u0627\u0644\u0642\u0631\u0627\u0621\u0629)"}
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-3 p-3.5" style={{ backgroundColor: "#f5efe0", borderLeft: "2px solid #9e875b" }}>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#4a3718", borderBottom: "1px solid #b8a477", paddingBottom: "5px", marginBottom: "8px" }}>
              {"\ud83d\udcdc \u0627\u0644\u0623\u0635\u0644 \u0627\u0644\u0645\u062e\u0637\u0648\u0637 \u0627\u0644\u0645\u062d\u0627\u0630\u064a \u0644\u0644\u0645\u0648\u0636\u0639:"}
            </div>
            <p className="heritage-matn" style={{ fontSize: "1.08rem", lineHeight: "1.95", backgroundColor: "#eadcc3", padding: "10px", border: "1px solid #8c6d3b" }}>
              {blockData?.witnesses[0]?.linePreview}
            </p>
          </div>

          <div className="lg:col-span-6 p-4" style={{ backgroundColor: "#fffdf8" }}>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#1b4332", marginBottom: "6px" }}>
              {"\u062a\u062d\u0631\u064a\u0631 \u0648\u0636\u0628\u0637 \u0627\u0644\u0645\u062a\u0646 \u0627\u0644\u0645\u062d\u0642\u0642:"}
            </div>
            <textarea
              value={editableText}
              onChange={(e) => setEditableText(e.target.value)}
              rows={4}
              className="heritage-matn w-full"
              style={{ width: "100%", border: "2px solid #8c734b", backgroundColor: "#fffdfa", padding: "12px", fontSize: "1.22rem", lineHeight: "2.1" }}
            />
            <div className="flex items-center justify-between mt-2.5">
              <span style={{ fontSize: "12px", fontWeight: 700, color: savedNotice ? "#1b4332" : "#5c4318" }}>
                {savedNotice ? "\u2705 \u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644 \u0641\u064a \u0627\u0644\u0645\u0648\u0636\u0639 \u0628\u0646\u062c\u0627\u062d!" : "\u0627\u0644\u0645\u0648\u0636\u0639 \u0645\u0641\u062a\u0648\u062d \u0644\u0644\u062a\u0639\u062f\u064a\u0644 \u0648\u0625\u062b\u0628\u0627\u062a \u0627\u0644\u0641\u0631\u0648\u0642"}
              </span>
              <button type="button" onClick={handleSaveEdit} style={{ backgroundColor: "#1b4332", color: "#fff", border: "1px solid #0f291e", padding: "6px 16px", fontSize: "12px", fontWeight: 800, cursor: "pointer" }}>
                {"\ud83d\udcbe \u062d\u0641\u0638 \u0648\u0627\u0639\u062a\u0645\u0627\u062f \u062a\u062d\u0642\u064a\u0642 \u0627\u0644\u0645\u0648\u0636\u0639"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 p-3.5" style={{ backgroundColor: "#f5efe0", borderRight: "2px solid #9e875b" }}>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#4a3718", borderBottom: "1px solid #b8a477", paddingBottom: "5px", marginBottom: "8px" }}>
              {"\ud83d\udda8\ufe0f \u0627\u0644\u0637\u0628\u0639\u0629 \u0627\u0644\u0633\u0627\u0644\u0641\u0629 \u0627\u0644\u0645\u0642\u0627\u0628\u0644\u0629:"}
            </div>
            <p className="heritage-matn" style={{ fontSize: "1.05rem", lineHeight: "1.95", backgroundColor: "#fffdf8", padding: "10px", border: "1px solid #b8a477" }}>
              {blockData?.editions[0]?.textVariant}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
