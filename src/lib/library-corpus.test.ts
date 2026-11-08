import { test } from "node:test";
import { strictEqual, deepStrictEqual, throws } from "node:assert";
import { parseCorpus, retrieve, savePassage, listLibraries, importCorpus, type LibraryRecord } from "./library-corpus";
import { listEvidence } from "./research";
import { setStorageOwner } from "./workspace-storage";
const raw = { version: 1, name: "مكتبة الاختبار", books: [{ id: "b", title: "مرجع الاختبار", pages: [{ id: "p", text: "قَالَ الراوي إنما الأعمال بالنيات", volume: "2", printedPage: "12", filePage: "7" }, { id: "p2", text: "الأعمال الصالحة ترتبط بالنيات" }] }] };
const corpus = parseCorpus(JSON.stringify(raw));
const record: LibraryRecord = { id: "l", name: corpus.name, filename: "test.json", digest: "sha-test", books: 1, pages: 2, at: 1 };
test("retrieves real library text ignoring diacritics without rewriting quotation", () => { const p = retrieve([{ record, corpus }], "قال")[0]; strictEqual(p?.text, "قَالَ الراوي إنما الأعمال بالنيات"); strictEqual(p?.printedPage, "12"); strictEqual(p?.filePage, "7"); });
test("requires every query term and supports connected phrase mode", () => { strictEqual(retrieve([{ record, corpus }], "الأعمال بالنيات").length, 2); strictEqual(retrieve([{ record, corpus }], "الأعمال بالنيات", "", true).length, 1); strictEqual(retrieve([{ record, corpus }], "الأعمال مجهول").length, 0); });
test("never searches missing corpus or another selected library", () => { deepStrictEqual(retrieve([{ record, corpus: undefined }], "قال"), []); deepStrictEqual(retrieve([{ record, corpus }], "قال", "other"), []); });
test("rejects duplicate original page identifiers", () => { throws(() => parseCorpus(JSON.stringify({ ...raw, books: [{ ...raw.books[0], pages: [raw.books[0]?.pages[0], raw.books[0]?.pages[0]] }] }))); });
test("requires an authenticated storage owner before importing a corpus", async () => { setStorageOwner(null); await importCorpus(new File([JSON.stringify(raw)], "test.json")).then(() => { throw new Error("Unauthenticated import succeeded"); }, error => strictEqual(error.message, "سجّل الدخول قبل ربط مكتبتك")); });
test("saved library evidence preserves source digest and account isolation", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage"); const data = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) } });
  try { setStorageOwner("a"); const p = retrieve([{ record, corpus }], "قال")[0]; if (!p) throw new Error("No passage"); savePassage(p); strictEqual(listEvidence()[0]?.library?.digest, "sha-test"); strictEqual(listEvidence()[0]?.library?.pageId, "p"); setStorageOwner("b"); deepStrictEqual(listEvidence(), []); deepStrictEqual(listLibraries(), []); setStorageOwner("a"); strictEqual(listEvidence()[0]?.quote, p.text); }
  finally { setStorageOwner(null); if (original) Object.defineProperty(globalThis, "localStorage", original); else Reflect.deleteProperty(globalThis, "localStorage"); }
});