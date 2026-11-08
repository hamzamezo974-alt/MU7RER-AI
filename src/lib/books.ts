import { readStorage, writeStorage, removeStorage, getStorageOwner } from "@/lib/workspace-storage";
import { supabase } from "@/integrations/supabase/client";
// نموذج «الكتاب»: صفحات مخزّنة في IndexedDB مع بيانات وصفية خفيفة في localStorage.

import { idbDelete, idbGet, idbSet } from "@/lib/idb";
import { DEFAULT_PROCESS, type ProcessSettings } from "@/lib/image-process";
import { catalogId, listSources, recordSource, type SourceFile } from "@/lib/source-catalog";
import type { ImportedPage } from "@/lib/import-book";

export type BookPage = { id: string; name: string; pdfFileId?: string; pdfPage?: number };

export type Book = {
  id: string;
  title: string;
  witness: string; // رمز النسخة، مثل: الأصل / ظ / ب
  pages: BookPage[];
  process: ProcessSettings;
  createdAt: number;
};

const id = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const metaKey = (paneKey: string) => `mu7rer:book-meta:${paneKey}`;
const pageKey = (bookId: string, pageId: string) => `page:${bookId}:${pageId}`;
const ownedKey = (key: string) => getStorageOwner() ? `account:${getStorageOwner()}:${key}` : key;

export async function storeOriginalFiles(book: Book, files: File[]): Promise<SourceFile[]> {
  const owner = getStorageOwner();
  const entries = [];
  for (const file of files) {
    const fileId = catalogId();
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))).map(value => value.toString(16).padStart(2, "0")).join("");
    if (owner) {
      const { error } = await supabase.storage.from("books").upload(`${owner}/${book.id}/original-${fileId}`, file);
      if (error) throw error;
    } else await idbSet(ownedKey(`original:${book.id}:${fileId}`), file);
    entries.push({ id: fileId, name: file.name, size: file.size, type: file.type, digest });
  }
  return entries;
}

export async function getOriginalFile(bookId: string, fileId: string): Promise<Blob | undefined> {
  const owner = getStorageOwner();
  if (owner) {
    const { data, error } = await supabase.storage.from("books").download(`${owner}/${bookId}/original-${fileId}`);
    if (error) throw error;
    return data;
  }
  return idbGet<Blob>(ownedKey(`original:${bookId}:${fileId}`));
}

export function loadBookMeta(paneKey: string): Book | null {
  try {
    const raw = readStorage(metaKey(paneKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Book;
    return { ...parsed, process: { ...DEFAULT_PROCESS, ...parsed.process } };
  } catch {
    return null;
  }
}

export function saveBookMeta(paneKey: string, book: Book | null) {
  try {
    if (book) writeStorage(metaKey(paneKey), JSON.stringify(book));
    else removeStorage(metaKey(paneKey));
  } catch {
    throw new Error("تعذّر حفظ اختيار الكتاب؛ تحقق من مساحة التخزين");
  }
}

export function newBook(title: string, witness = "الأصل"): Book {
  return { id: id(), title, witness, pages: [], process: { ...DEFAULT_PROCESS }, createdAt: Date.now() };
}

export async function addPages(
  book: Book,
  pages: ImportedPage[],
  originals: SourceFile[] = [],
): Promise<Book> {
  const added: BookPage[] = [];
  for (const page of pages) {
    const pid = id();
    if (page.pdfPage !== undefined) {
      const original = originals.find(file => file.name === page.originalName);
      if (!original) throw new Error("ملف PDF الأصلي غير محفوظ؛ لم يُستورد الكتاب");
      added.push({ id: pid, name: page.name, pdfFileId: original.id, pdfPage: page.pdfPage });
      continue;
    }
    const owner = getStorageOwner();
    if (owner) {
      const { error } = await supabase.storage.from("books").upload(`${owner}/${book.id}/${pid}`, page.blob);
      if (error) throw error;
    } else await idbSet(ownedKey(pageKey(book.id, pid)), page.blob);
    added.push({ id: pid, name: page.name });
  }
  return { ...book, pages: [...book.pages, ...added] };
}

export async function getPageBlob(bookId: string, pageId: string): Promise<Blob | undefined> {
  const source = listSources().find(item => item.id === bookId);
  const page = source?.pages.find(item => item.id === pageId);
  if (page?.pdfFileId && page.pdfPage !== undefined) {
    const original = await getOriginalFile(bookId, page.pdfFileId);
    if (!original) throw new Error("تعذّر تحميل ملف PDF الأصلي");
    const { renderPdfPage } = await import("@/lib/pdf-page");
    return renderPdfPage(original, page.pdfPage);
  }
  const owner = getStorageOwner();
  const pk = pageKey(bookId, pageId);
  
  if (owner) {
    // حاول التحميل من السحابة أولاً
    const { data, error } = await supabase.storage.from("books").download(`${owner}/${bookId}/${pageId}`);
    if (!error && data) return data;
    
    // إذا لم ينجح، ربما هو كتاب محلي رُحل metadata الخاص به ولكن لم تُرفع صوره بعد
    const local = await idbGet<Blob>(ownedKey(pk));
    if (local) {
      // ترحيل "كسول" (Lazy Migration) للصورة إلى السحابة
      void supabase.storage.from("books").upload(`${owner}/${bookId}/${pageId}`, local)
        .then(({ error: upError }) => {
           if (!upError) void idbDelete(ownedKey(pk));
        });
      return local;
    }
    return undefined;
  }
  
  return idbGet<Blob>(pk);
}

export async function removePage(book: Book, pageId: string): Promise<Book> {
  if (listSources().some(source => source.id === book.id)) return { ...book, pages: book.pages.filter(page => page.id !== pageId) };
  const owner = getStorageOwner();
  if (owner) {
    const { error } = await supabase.storage.from("books").remove([`${owner}/${book.id}/${pageId}`]);
    if (error) throw error;
  }
  // دائماً حاول الحذف من المحلي أيضاً لضمان النظافة بعد الترحيل
  await idbDelete(pageKey(book.id, pageId));
  return { ...book, pages: book.pages.filter((page) => page.id !== pageId) };
}

export async function clearBook(book: Book): Promise<void> {
  if (listSources().some(source => source.id === book.id)) return;
  const owner = getStorageOwner();
  if (owner && book.pages.length) {
    const { error } = await supabase.storage.from("books").remove(book.pages.map(page => `${owner}/${book.id}/${page.id}`));
    if (error) throw error;
  }
  for (const page of book.pages) await idbDelete(pageKey(book.id, page.id));
}

export function adoptPaneBooks() {
  for (const paneKey of ["mu7rer:book-right", "mu7rer:book-left"]) {
    const book = loadBookMeta(paneKey);
    if (book && !listSources().some(source => source.id === book.id)) recordSource(book, "استعادة مصدر سابق");
  }
}

/** ترقيم اللوحات على طريقة المخطوطات: 1أ، 1ب، 2أ … */
export function plateLabel(index: number): string {
  const folio = Math.floor(index / 2) + 1;
  return `${folio}${index % 2 === 0 ? "أ" : "ب"}`;
}
