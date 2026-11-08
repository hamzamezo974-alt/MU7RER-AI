import { describe, it } from "node:test";
import { deepStrictEqual, strictEqual, throws } from "node:assert";
import { reviseTranscript, isApproved, prepareAssembly, boundaryWarnings, saveTranscript, approveTranscript, assembleText, listAssemblies, listTranscripts } from "./page-transcripts";
import { setStorageOwner } from "./workspace-storage";
const first = reviseTranscript(undefined, "s", "p1", "النص الأول", "manual");
const second = reviseTranscript(undefined, "s", "p2", "النص الثاني", "ocr");
const approved = [first, second].map(page => {
  const revision = page.revisions[0];
  if (!revision) throw new Error("missing test revision");
  return { ...page, approvedId: revision.id };
});
const pages = [{ id: "p1", name: "1" }, { id: "p2", name: "2" }, { id: "p3", name: "3" }];
describe("reviewed page assembly", () => {
  it("retains prior approved revision and requires approval after a change", () => {
    const revised = reviseTranscript(approved[0], "s", "p1", "تصحيح", "manual");
    strictEqual(revised.revisions[0]?.text, "النص الأول");
    strictEqual(isApproved(revised), false);
    strictEqual(revised.approvedId, approved[0]?.approvedId);
  });
  it("assembles selected nonconsecutive pages in explicit order without rewriting", () => {
    const result = prepareAssembly("s", pages, ["p2", "p1"], approved);
    strictEqual(result.text, "النص الثاني\n\nالنص الأول");
    deepStrictEqual(result.excluded, ["p3"]);
  });
  it("rejects duplicate pages", () => { throws(() => prepareAssembly("s", pages, ["p1", "p1"], approved), /مكررة/); });
  it("rejects unapproved pages", () => { throws(() => prepareAssembly("s", pages, ["p1"], [first]), /غير معتمدة/); });
  it("does not borrow approval from another source", () => { throws(() => prepareAssembly("other", pages, ["p1"], approved), /غير معتمدة/); });
  it("flags matching boundaries without removing repeated text", () => {
    const inputs = [{ pageId: "a", revisionId: "1", name: "أ", text: "بداية قال رسول الله" }, { pageId: "b", revisionId: "2", name: "ب", text: "قال رسول الله نهاية" }];
    strictEqual(boundaryWarnings(inputs).length, 1);
    strictEqual(inputs[1]?.text, "قال رسول الله نهاية");
  });
  it("reuses identical assembly without duplicating a document and isolates accounts", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const data = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) } });
    try {
      setStorageOwner("researcher-a");
      saveTranscript("s", "p1", "نص الباحث المعتمد");
      approveTranscript("s", "p1");
      const one = assembleText("s", "original", "مصدر", pages, ["p1"], "جزئي", "", false);
      const two = assembleText("s", "original", "مصدر", pages, ["p1"], "جزئي", "", false);
      strictEqual(one.docId, two.docId);
      strictEqual(listAssemblies().length, 1);
      setStorageOwner("researcher-b");
      deepStrictEqual(listTranscripts(), []);
      deepStrictEqual(listAssemblies(), []);
    } finally {
      setStorageOwner(null);
      if (original) Object.defineProperty(globalThis, "localStorage", original);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });
});