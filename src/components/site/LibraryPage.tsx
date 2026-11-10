import React, { useState, useEffect } from "react";
import { SAMPLE_SHOWCASE_BOOKS, ShowcaseBook, CriticalBlock, EditorJumpContext } from "@/lib/islamic-library-engine";
import { mountLibraryFolder, MountedLibrary } from "@/lib/library-connector";

export function LibraryPage() {
  const [books] = useState<ShowcaseBook[]>(SAMPLE_SHOWCASE_BOOKS);
  const [activeBook, setActiveBook] = useState<ShowcaseBook>(SAMPLE_SHOWCASE_BOOKS[0]);
  const [activeBlock, setActiveBlock] = useState<CriticalBlock>(SAMPLE_SHOWCASE_BOOKS[0].blocks[0]);
  const [activeWitnessIdx, setActiveWitnessIdx] = useState(0);
  const [activeEditionIdx, setActiveEditionIdx] = useState(0);
  const [activeServiceTab, setActiveServiceTab] = useState<"takhrij"|"isnad"|"unified"|"commentaries"|"gharib"|"topics">("takhrij");
  const [takhrijLevel, setTakhrijLevel] = useState<"summary"|"medium"|"detailed">("detailed");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all"|"matn"|"service">("all");
  const [mountedLib, setMountedLib] = useState<MountedLibrary | null>(null);

  useEffect(() => {
    if (activeBook.blocks.length > 0) {
      setActiveBlock(activeBook.blocks[0]);
      setActiveWitnessIdx(0);
      setActiveEditionIdx(0);
    }
  }, [activeBook]);

  const handleJumpToEditor = (block: CriticalBlock) => {
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
      if (!localStorage.getItem("mu7rer_local_auth_session")) {
        localStorage.setItem("mu7rer_local_auth_session", JSON.stringify({
          access_token: "local-token",
          user: { id: "local-investigator", email: "investigator@mu7rer.local", name: "\u0627\u0644\u0628\u0627\u062d\u062b \u0627\u0644\u0645\u062d\u0642\u0642" }
        }));
      }
    } catch (_) {}
    window.location.href = "/workspace?book=" + encodeURIComponent(activeBook.id) + "&block=" + encodeURIComponent(block.id) + "&page=" + block.page;
  };

  const currentWitness = activeBlock?.witnesses[activeWitnessIdx] || activeBlock?.witnesses[0];
  const currentEdition = activeBlock?.editions[activeEditionIdx] || activeBlock?.editions[0];

  return (
    <div className="heritage-portal min-h-screen p-3 md:p-5" dir="rtl" style={{ backgroundColor: "#f3eedf", color: "#1e1a14" }}>
      <div className="max-w-[1620px] mx-auto" style={{ border: "3px double #8c734b", backgroundColor: "#fbf8f1", boxShadow: "0 6px 24px rgba(40,30,15,0.12)" }}>
        
        {/* Top Royal Heritage Header */}
        <div style={{ background: "linear-gradient(90deg, #163828 0%, #204d38 50%, #163828 100%)", color: "#f9f5eb", borderBottom: "3px solid #b68d40", padding: "14px 20px" }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div style={{ width: "48px", height: "48px", border: "2px solid #d4af37", backgroundColor: "#112b1f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", color: "#e6c665", fontWeight: "bold" }}>۞</div>
              <div>
                <div style={{ color: "#e0c068", fontSize: "12px", fontWeight: 700 }}>
                  {"\u062e\u0632\u0627\u0646\u0629 \u0645\u064f\u062d\u064e\u0631\u0650\u0651\u0631 \u0644\u0644\u062a\u0631\u0627\u062b \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064a \u0627\u0644\u0645\u062d\u0642\u0642 • \u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0639\u0644\u0645\u064a \u0648\u0627\u0644\u0645\u0642\u0627\u0628\u0644\u0629"}
                </div>
                <h1 style={{ fontSize: "21px", fontWeight: 800, color: "#ffffff", margin: "2px 0" }}>
                  {"\u0627\u0644\u062c\u0627\u0645\u0639 \u0627\u0644\u0645\u062d\u0642\u0642 \u0644\u0644\u0645\u062a\u0648\u0646 \u0648\u0627\u0644\u0643\u062a\u0628 \u0627\u0644\u062e\u062f\u0645\u064a\u0629 \u0648\u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u0645\u062e\u0637\u0648\u0637\u0627\u062a \u0648\u0627\u0644\u0637\u0628\u0639\u0627\u062a"}
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={async () => { const r = await mountLibraryFolder(); if (r) setMountedLib(r); }} style={{ backgroundColor: "#2b5b44", color: "#fdf8ec", border: "1px solid #d4af37", padding: "8px 14px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                {mountedLib ? "\u2713 \u0627\u0644\u062e\u0632\u0627\u0646\u0629: " + mountedLib.name : "\u0631\u0628\u0637 \u062e\u0632\u0627\u0646\u0629 \u0645\u062d\u0644\u064a\u0629 (.db / .bok)"}
              </button>
              <button type="button" onClick={() => activeBlock && handleJumpToEditor(activeBlock)} style={{ backgroundColor: "#b68d40", color: "#16120b", border: "1px solid #f3e0b5", padding: "8px 16px", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
                {"\u2712\ufe0f \u0641\u062a\u062d \u0627\u0644\u0645\u0648\u0636\u0639 \u0627\u0644\u062d\u0627\u0644\u064a \u0641\u064a \u0627\u0644\u0645\u062d\u0631\u0631"}
              </button>
            </div>
          </div>
        </div>

        {/* Subbar Filters & Book Selector */}
        <div style={{ backgroundColor: "#e8dfc8", borderBottom: "2px solid #a89267", padding: "10px 16px" }}>
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "\u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0635\u0646\u0641\u0627\u062a" },
                { id: "matn", label: "\u0643\u062a\u0628 \u0627\u0644\u0645\u062a\u0648\u0646 \u0627\u0644\u0645\u0633\u0646\u062f\u0629" },
                { id: "service", label: "\u0627\u0644\u0643\u062a\u0628 \u0627\u0644\u062e\u062f\u0645\u064a\u0629 \u0648\u0627\u0644\u0634\u0631\u0648\u062d" }
              ].map((t) => (
                <button key={t.id} type="button" onClick={() => setFilterType(t.id as any)} style={{ backgroundColor: filterType === t.id ? "#1b4332" : "#fbf8f1", color: filterType === t.id ? "#ffffff" : "#2c2416", border: "1px solid #8c734b", padding: "5px 12px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                  {t.label}
                </button>
              ))}
              <select value={activeBook.id} onChange={(e) => { const f = books.find((b) => b.id === e.target.value); if (f) setActiveBook(f); }} style={{ backgroundColor: "#fffdf8", border: "1px solid #8c734b", padding: "5px 10px", fontSize: "13px", fontWeight: 700, color: "#1b4332" }}>
                {books.map((b) => (<option key={b.id} value={b.id}>{b.title} — {b.author}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={"\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0645\u062a\u0648\u0646\u060c \u0627\u0644\u0631\u0648\u0627\u0629\u060c \u0634\u062c\u0631\u0629 \u0627\u0644\u0645\u0648\u0636\u0648\u0639\u0627\u062a..."} style={{ backgroundColor: "#fffdf8", border: "1px solid #8c734b", padding: "6px 12px", fontSize: "13px", minWidth: "260px", color: "#1e1a14" }} />
            </div>
          </div>
        </div>

        {/* Framed 3-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12" style={{ borderBottom: "2px solid #8c734b" }}>
          
          {/* Right Column: Manuscripts */}
          <div className="lg:col-span-3" style={{ backgroundColor: "#f5efe0", borderLeft: "2px solid #9e875b" }}>
            <div style={{ background: "linear-gradient(180deg, #4a3718 0%, #36270f 100%)", color: "#f9f3e3", borderBottom: "2px solid #b68d40", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "14px" }}>
              <span>{"\ud83d\udcdc \u0627\u0644\u0646\u0633\u062e \u0627\u0644\u0645\u062e\u0637\u0648\u0637\u0629 \u0627\u0644\u0645\u0639\u062a\u0645\u062f\u0629"}</span>
              <span style={{ backgroundColor: "#b68d40", color: "#1a1409", padding: "2px 8px", fontSize: "11px" }}>{activeBlock?.witnesses.length || 0}</span>
            </div>
            <div className="p-3.5 space-y-3">
              <div className="grid grid-cols-1 gap-1.5">
                {activeBlock?.witnesses.map((w, idx) => (
                  <button key={w.id} type="button" onClick={() => setActiveWitnessIdx(idx)} style={{ textAlign: "right", padding: "7px 10px", fontSize: "12px", fontWeight: 700, border: idx === activeWitnessIdx ? "2px solid #1b4332" : "1px solid #b8a477", backgroundColor: idx === activeWitnessIdx ? "#1b4332" : "#fbf8f1", color: idx === activeWitnessIdx ? "#ffffff" : "#2b2317", cursor: "pointer" }}>
                    {"\u0631\u0645\u0632 \u0627\u0644\u0646\u0633\u062e\u0629: "}{w.siglum}
                  </button>
                ))}
              </div>
              {currentWitness && (
                <>
                  <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fbf8f1", border: "1px solid #b8a477", fontSize: "12px" }}>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid #d8cbb0" }}><td style={{ padding: "6px 8px", fontWeight: 800, backgroundColor: "#ebe2cc", width: "34%" }}>{"\u0627\u0644\u0646\u0633\u062e\u0629"}</td><td style={{ padding: "6px 8px" }}>{currentWitness.title}</td></tr>
                      <tr style={{ borderBottom: "1px solid #d8cbb0" }}><td style={{ padding: "6px 8px", fontWeight: 800, backgroundColor: "#ebe2cc" }}>{"\u0627\u0644\u0644\u0648\u062d\u0629"}</td><td style={{ padding: "6px 8px", color: "#1b4332", fontWeight: 700 }}>{currentWitness.folio}</td></tr>
                      <tr><td style={{ padding: "6px 8px", fontWeight: 800, backgroundColor: "#ebe2cc" }}>{"\u0627\u0644\u062a\u0627\u0631\u064a\u062e"}</td><td style={{ padding: "6px 8px" }}>{currentWitness.dateHijri}</td></tr>
                    </tbody>
                  </table>
                  <div style={{ backgroundColor: "#eadcc3", border: "2px solid #8c6d3b", padding: "12px" }}>
                    <div style={{ borderBottom: "1px solid #a68b5b", paddingBottom: "4px", marginBottom: "8px", fontSize: "11px", fontWeight: 800, color: "#4a3512" }}>
                      {"\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0633\u0637\u0631 \u0627\u0644\u0645\u0642\u0627\u0628\u0644 \u0641\u064a \u0627\u0644\u0645\u062e\u0637\u0648\u0637:"}
                    </div>
                    <p className="heritage-matn" style={{ fontSize: "1.1rem", lineHeight: "2.0", backgroundColor: "#f4ead5", padding: "10px", border: "1px dashed #8c6d3b" }}>{currentWitness.linePreview}</p>
                    <div style={{ marginTop: "8px", fontSize: "11px", color: "#4a3b22", fontWeight: 600 }}>{currentWitness.notes}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Center Column: Critical Matn & Relational Services */}
          <div className="lg:col-span-6" style={{ backgroundColor: "#fffdf8" }}>
            <div style={{ background: "linear-gradient(180deg, #1b4332 0%, #122e22 100%)", color: "#ffffff", borderBottom: "2px solid #b68d40", padding: "10px 16px", display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "14px" }}>
              <span>{"\ud83d\udcd6 \u0627\u0644\u0645\u062a\u0646 \u0627\u0644\u0645\u062d\u0642\u0642 \u0627\u0644\u0645\u062e\u062f\u0648\u0645 — "}{activeBook.title}</span>
              <span style={{ fontSize: "11px", color: "#e6c665" }}>{"\u0627\u0646\u0642\u0631 \u0639\u0644\u0649 \u0623\u064a \u0645\u0648\u0636\u0639 \u0644\u0644\u062a\u062d\u0631\u064a\u0631"}</span>
            </div>
            <div className="p-5 space-y-5">
              {activeBook.blocks.map((block) => {
                const isSelected = block.id === activeBlock?.id;
                return (
                  <div key={block.id} onClick={() => setActiveBlock(block)} style={{ border: isSelected ? "2px solid #1b4332" : "1px solid #c5b38a", backgroundColor: isSelected ? "#fcf8ee" : "#ffffff", cursor: "pointer" }}>
                    <div style={{ backgroundColor: isSelected ? "#e3d8be" : "#efe8d5", borderBottom: "1px solid #c5b38a", padding: "7px 14px", display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 800 }}>
                      <span>{block.chapter}</span>
                      <span style={{ color: "#1b4332" }}>{"[\u062c "}{block.volume}{" / \u0635 "}{block.page}{" • #"}{block.seq}{"]"}</span>
                    </div>
                    <div style={{ padding: "16px 20px" }}>
                      <p className="heritage-matn select-text" style={{ textAlign: "justify" }}>{block.matnText}</p>
                      {block.apparatusFootnotes.length > 0 && (
                        <div style={{ marginTop: "14px", borderTop: "2px solid #b8a477", backgroundColor: "#f8f3e6", padding: "10px 14px" }}>
                          <div style={{ fontSize: "12px", fontWeight: 800, color: "#5c4318", marginBottom: "4px" }}>{"\u062d\u0627\u0634\u064a\u0629 \u0627\u0644\u062a\u062d\u0642\u064a\u0642 \u0648\u0641\u0631\u0648\u0642 \u0627\u0644\u0646\u0633\u062e:"}</div>
                          {block.apparatusFootnotes.map((fn, i) => (<p key={i} style={{ fontSize: "13px", lineHeight: "1.8", color: "#33291a" }}>{fn}</p>))}
                        </div>
                      )}
                    </div>
                    <div style={{ backgroundColor: "#f2ead7", borderTop: "1px solid #c5b38a", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#52432b" }}>{"\u0645\u0639\u0627\u064a\u0646\u0629 \u0645\u062a\u0632\u0627\u0645\u0646\u0629 \u0645\u0639 \u0627\u0644\u0645\u062e\u0637\u0648\u0637 \u0648\u0627\u0644\u0637\u0628\u0639\u0627\u062a"}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleJumpToEditor(block); }} style={{ backgroundColor: "#1b4332", color: "#ffffff", border: "1px solid #0f291e", padding: "5px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                        {"\u2712\ufe0f \u062d\u0631\u0631 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0636\u0639 \u0641\u064a \u0627\u0644\u0645\u062d\u0631\u0631"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Relational Services Box */}
              {activeBlock && (
                <div style={{ border: "2px solid #8c734b", backgroundColor: "#fbf8f1" }}>
                  <div style={{ backgroundColor: "#2c3e35", color: "#f9f5eb", borderBottom: "2px solid #b68d40", padding: "8px 14px", fontSize: "13px", fontWeight: 800 }}>
                    {"\u062e\u0632\u0627\u0646\u0629 \u0627\u0644\u062e\u062f\u0645\u0627\u062a \u0627\u0644\u0639\u0644\u0645\u064a\u0629 \u0648\u0627\u0644\u0634\u0628\u0643\u0629 \u0627\u0644\u0639\u0644\u0627\u0626\u0642\u064a\u0629"}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", backgroundColor: "#e6dec8", borderBottom: "2px solid #8c734b" }}>
                    {[
                      { id: "takhrij", label: "\u0627\u0644\u062a\u062e\u0631\u064a\u062c (3 \u0645\u0633\u062a\u0648\u064a\u0627\u062a)" },
                      { id: "isnad", label: "\u0627\u0644\u0625\u0633\u0646\u0627\u062f \u0648\u0627\u0644\u0631\u0648\u0627\u0629" },
                      { id: "unified", label: "\u0627\u0644\u0645\u062a\u0646 \u0627\u0644\u0645\u062c\u0645\u0639" },
                      { id: "commentaries", label: "\u0627\u0644\u0634\u0631\u0648\u062d" },
                      { id: "gharib", label: "\u063a\u0631\u064a\u0628 \u0627\u0644\u0645\u062a\u0646" },
                      { id: "topics", label: "\u0627\u0644\u0631\u0628\u0637 \u0627\u0644\u0645\u0648\u0636\u0648\u0639\u064a" }
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
                              {lvl === "summary" ? "\u0625\u062c\u0645\u0627\u0644\u064a" : lvl === "medium" ? "\u0645\u062a\u0648\u0633\u0637" : "\u062a\u0641\u0635\u064a\u0644\u064a"}
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

          {/* Left Column: Previous Print Editions */}
          <div className="lg:col-span-3" style={{ backgroundColor: "#f5efe0", borderRight: "2px solid #9e875b" }}>
            <div style={{ background: "linear-gradient(180deg, #4a3718 0%, #36270f 100%)", color: "#f9f3e3", borderBottom: "2px solid #b68d40", padding: "10px 14px", display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "14px" }}>
              <span>{"\ud83d\udda8\ufe0f \u0645\u0648\u0627\u0632\u0646 \u0627\u0644\u0637\u0628\u0639\u0627\u062a \u0627\u0644\u0633\u0627\u0644\u0641\u0629"}</span>
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
                    <div style={{ fontSize: "11px", fontWeight: 800, color: "#5c4318", marginBottom: "6px" }}>{"\u0646\u0635 \u0627\u0644\u0645\u0648\u0636\u0639 \u0641\u064a \u0627\u0644\u0637\u0628\u0639\u0629 \u0627\u0644\u0633\u0627\u0644\u0641\u0629:"}</div>
                    <p className="heritage-matn" style={{ fontSize: "1.08rem", lineHeight: "1.95" }}>{currentEdition.textVariant}</p>
                  </div>
                  <div style={{ backgroundColor: "#e6f0eb", border: "2px solid #1b4332", padding: "10px 12px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: "#1b4332", marginBottom: "5px" }}>{"\u2728 \u0645\u0627 \u0642\u062f\u0645\u062a\u0647 \u0627\u0644\u0637\u0628\u0639\u0629 \u0627\u0644\u062c\u062f\u064a\u062f\u0629:"}</div>
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
