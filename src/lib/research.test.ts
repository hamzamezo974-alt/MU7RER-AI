import { describe, it } from "node:test";
import { strictEqual, deepStrictEqual, throws } from "node:assert";
import { compareTexts, formatEvidence, searchEvidence, saveEvidence, listEvidence, saveComparison, decideComparison, listComparisons, type Evidence } from "./research";
import { setStorageOwner } from "./workspace-storage";
const entry: Evidence = { id: "e", title: "مرجع الاختبار", author: "", edition: "", volume: "", filePage: "7", printedPage: "12", category: "حديث", quote: "قَالَ الراوي", comment: "", sourceId: "s", pageId: "p", at: 1 };
describe("research evidence and comparison rules", () => {
  it("excludes untranscribed images from text search", () => { deepStrictEqual(searchEvidence([{ ...entry, quote: "" }], ""), []); });
  it("searches actual quotes with optional diacritic normalization", () => { strictEqual(searchEvidence([entry], "قال").length, 0); strictEqual(searchEvidence([entry], "قال", "حديث", "contains", true).length, 1); });
  it("keeps file and printed page numbers separate without fabricating author", () => { strictEqual(formatEvidence([entry], "both"), "«قَالَ الراوي» (مرجع الاختبار، ص 12، صفحة الملف 7)"); });
  it("retains selected witness order", () => { strictEqual(formatEvidence([entry, { ...entry, quote: "شاهد ثان" }], "quote", "", " / "), "قَالَ الراوي / شاهد ثان"); });
  it("rejects untranscribed evidence for insertion", () => { throws(() => formatEvidence([{ ...entry, quote: "" }], "quote")); });
  it("proposes exact differences without accepting or rewriting either text", () => { const result = compareTexts("قال زيد", "قال عمرو"); strictEqual(result.length, 1); strictEqual(result[0]?.before, "زيد"); strictEqual(result[0]?.after, "عمرو"); strictEqual(result[0]?.decision, "pending"); });
  it("persists review decisions and isolates both catalogs by account", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const data = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) } });
    try {
      setStorageOwner("a"); saveEvidence(entry);
      const comparison = saveComparison({ docId: "d", sourceId: "s", pageId: "p", witness: "ب", location: "12", base: "قال زيد", variant: "قال عمرو" });
      const change = comparison.changes[0]; if (!change) throw new Error("Missing change");
      decideComparison(comparison.id, change.id, "deferred"); strictEqual(listComparisons()[0]?.changes[0]?.decision, "deferred");
      setStorageOwner("b"); deepStrictEqual(listEvidence(), []); deepStrictEqual(listComparisons(), []);
      setStorageOwner("a"); strictEqual(listEvidence().length, 1); strictEqual(listComparisons()[0]?.base, "قال زيد");
    } finally { setStorageOwner(null); if (original) Object.defineProperty(globalThis, "localStorage", original); else Reflect.deleteProperty(globalThis, "localStorage"); }
  });
});