import { z } from "zod";
import { idbGet, idbSet, idbDelete } from "./idb";
import { getStorageOwner, readStorage, writeStorage } from "./workspace-storage";
import { saveEvidence } from "./research";

const pageSchema = z.object({ id: z.string().min(1), text: z.string().min(1), volume: z.string().default(""), printedPage: z.string().default(""), filePage: z.string().default(""), chapter: z.string().default("") });
const bookSchema = z.object({ id: z.string().min(1), title: z.string().min(1), author: z.string().default(""), edition: z.string().default(""), category: z.string().default(""), pages: z.array(pageSchema).min(1) });
export const corpusSchema = z.object({ version: z.literal(1), name: z.string().min(1), books: z.array(bookSchema).min(1) });
export type Corpus = z.infer<typeof corpusSchema>;
export type LibraryRecord = { id: string; name: string; filename: string; digest: string; books: number; pages: number; at: number };
export type Passage = { id: string; libraryId: string; library: string; digest: string; bookId: string; title: string; author: string; edition: string; category: string; pageId: string; text: string; volume: string; printedPage: string; filePage: string; chapter: string; score: number };
const CATALOG = "mu7rer:library-catalog";
const normalize = (text: string) => text.normalize("NFKC").replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").toLowerCase();
export function parseCorpus(raw: string): Corpus {
  const corpus = corpusSchema.parse(JSON.parse(raw));
  const books = new Set<string>();
  for (const book of corpus.books) {
    if (books.has(book.id)) throw new Error("معرّف كتاب مكرر");
    books.add(book.id);
    const pages = new Set<string>();
    for (const page of book.pages) { if (!page.text.trim() || pages.has(page.id)) throw new Error("صفحة فارغة أو معرّف صفحة مكرر"); pages.add(page.id); }
  }
  return corpus;
}
export const listLibraries = (): LibraryRecord[] => JSON.parse(readStorage(CATALOG) ?? "[]");
function blobKey(id: string, owner: string) { return `account:${owner}:library:${id}`; }
export async function importCorpus(file: File) {
  const owner = getStorageOwner();
  if (!owner) throw new Error("سجّل الدخول قبل ربط مكتبتك");
  const raw = await file.text();
  const corpus = file.name.toLowerCase().endsWith(".txt")
    ? parseCorpus(JSON.stringify({ version: 1, name: file.name, books: [{ id: "text", title: file.name.replace(/\.txt$/i, ""), pages: raw.split("\f").map((text, i) => ({ id: String(i + 1), text, filePage: String(i + 1) })).filter(page => page.text.trim()) }] }))
    : parseCorpus(raw);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const digest = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
  if (getStorageOwner() !== owner) throw new Error("تغيّر الحساب؛ أعد الربط");
  const duplicate = listLibraries().find(item => item.digest === digest);
  if (duplicate) { await idbSet(blobKey(duplicate.id, owner), corpus); return duplicate; }
  const record: LibraryRecord = { id: crypto.randomUUID(), name: corpus.name, filename: file.name, digest, books: corpus.books.length, pages: corpus.books.reduce((sum, book) => sum + book.pages.length, 0), at: Date.now() };
  await idbSet(blobKey(record.id, owner), corpus);
  if (getStorageOwner() !== owner) { await idbDelete(blobKey(record.id, owner)); throw new Error("تغيّر الحساب؛ لم تُربط المكتبة"); }
  writeStorage(CATALOG, JSON.stringify([...listLibraries(), record]));
  return record;
}
export async function loadLibraries() {
  const owner = getStorageOwner();
  if (!owner) throw new Error("سجّل الدخول للبحث في مكتبتك");
  const libraries = await Promise.all(listLibraries().map(async record => ({ record, corpus: await idbGet<Corpus>(blobKey(record.id, owner)) })));
  if (getStorageOwner() !== owner) throw new Error("تغيّر الحساب؛ أعد البحث");
  return libraries;
}
export async function removeLibrary(id: string) {
  const owner = getStorageOwner(); if (!owner) throw new Error("سجّل الدخول");
  writeStorage(CATALOG, JSON.stringify(listLibraries().filter(item => item.id !== id)));
  await idbDelete(blobKey(id, owner));
}
export function retrieve(libraries: { record: LibraryRecord; corpus?: Corpus | undefined }[], query: string, libraryId = "", exact = false, limit = 30): Passage[] {
  const needle = normalize(query.trim());
  if (!needle) return [];
  const terms = [...new Set(needle.split(/\s+/).filter(Boolean))];
  const results: Passage[] = [];
  for (const { record, corpus } of libraries) {
    if (!corpus || (libraryId && record.id !== libraryId)) continue;
    for (const book of corpus.books) for (const page of book.pages) {
      const haystack = normalize(page.text);
      const matched = terms.filter(term => haystack.includes(term)).length;
      if (exact ? !haystack.includes(needle) : matched !== terms.length) continue;
      results.push({ ...page, id: `${record.id}:${book.id}:${page.id}`, libraryId: record.id, library: record.name, digest: record.digest, bookId: book.id, title: book.title, author: book.author, edition: book.edition, category: book.category, pageId: page.id, score: matched + (haystack.includes(needle) ? 5 : 0) });
    }
  }
  return results.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
}
export function savePassage(passage: Passage) {
  return saveEvidence({ title: passage.title, author: passage.author, edition: passage.edition, category: passage.category, volume: passage.volume, printedPage: passage.printedPage, filePage: passage.filePage, quote: passage.text, comment: passage.chapter, sourceId: "", pageId: "", library: { libraryId: passage.libraryId, name: passage.library, digest: passage.digest, bookId: passage.bookId, pageId: passage.pageId } });
}
export function retrievalContext(passages: Passage[]) {
  return passages.map((p, i) => `[${i + 1}] ${p.title} | ${p.author} | ${p.edition} | ج ${p.volume || "غير محدد"} | ص ${p.printedPage || "غير محددة"} | صفحة الملف ${p.filePage || "غير محددة"}\n${p.text.slice(0, 2600)}`).join("\n\n");
}