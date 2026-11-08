import { readStorage, writeStorage } from "@/lib/workspace-storage";
import type { Book, BookPage } from "@/lib/books";

export type SourceFile = { id: string; name: string; size: number; type: string; digest: string };
export type SourceOperation = { id: string; kind: string; at: number; inputs: string[]; outputs: string[]; settings?: unknown };
export type SourceGroup = { id: string; name: string; book: Book; at: number };
export type CatalogSource = { id: string; title: string; witness: string; kind: "manuscript" | "print"; files: SourceFile[]; originals: BookPage[]; pages: BookPage[]; groups: SourceGroup[]; operations: SourceOperation[]; createdAt: number };
const KEY = "mu7rer:source-catalog";
export const catalogId = () => crypto.randomUUID();
export function listSources(): CatalogSource[] {
  const raw = readStorage(KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("تعذّر قراءة فهرس الخزانة؛ لم يُستبدل المحتوى");
  return parsed as CatalogSource[];
}
export function extendSource(existing: CatalogSource | undefined, book: Book, kind = "تحديث", inputs: string[] = [], outputs: string[] = [], settings?: unknown): CatalogSource {
  const at = Date.now();
  const pages = new Map((existing?.pages ?? []).map(page => [page.id, page]));
  book.pages.forEach(page => pages.set(page.id, page));
  const operation = { id: catalogId(), kind, at, inputs, outputs, settings };
  return {
    id: book.id, title: book.title, witness: book.witness, kind: existing?.kind ?? "manuscript", files: existing?.files ?? [],
    originals: existing?.originals ?? [...book.pages], pages: [...pages.values()], createdAt: existing?.createdAt ?? book.createdAt,
    groups: [...(existing?.groups ?? []), { id: operation.id, name: `${kind} · ${(existing?.groups.length ?? 0) + 1}`, book: structuredClone(book), at }],
    operations: [...(existing?.operations ?? []), operation],
  };
}
export function saveSource(source: CatalogSource) {
  const all = listSources();
  writeStorage(KEY, JSON.stringify([source, ...all.filter(item => item.id !== source.id)]));
}
export function recordSource(book: Book, kind: string, inputs: string[] = [], outputs: string[] = [], settings?: unknown) {
  const source = extendSource(listSources().find(item => item.id === book.id), book, kind, inputs, outputs, settings);
  saveSource(source);
  return source;
}
export function saveSourceFiles(book: Book, files: SourceFile[]) {
  const current = listSources().find(source => source.id === book.id);
  if (!current) throw new Error("المصدر غير محفوظ في الخزانة");
  saveSource({ ...current, files: [...current.files, ...files] });
}
export function renameGroup(sourceId: string, groupId: string, name: string) {
  const source = listSources().find(item => item.id === sourceId);
  if (!source || !name.trim()) return;
  saveSource({ ...source, groups: source.groups.map(group => group.id === groupId ? { ...group, name: name.trim() } : group) });
}
export function catalogOriginalBook(source: CatalogSource): Book | undefined {
  const base = source.groups[0]?.book;
  return base ? { ...base, pages: source.originals } : undefined;
}
export function setSourceKind(sourceId: string, kind: CatalogSource["kind"]) {
  const source = listSources().find(item => item.id === sourceId);
  if (source) saveSource({ ...source, kind });
}