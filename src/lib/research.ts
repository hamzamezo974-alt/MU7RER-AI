import { diffWords } from "diff";
import { readStorage, writeStorage } from "./workspace-storage";

export type Evidence = {
  id: string; title: string; author: string; edition: string; volume: string;
  filePage: string; printedPage: string; category: string; quote: string; comment: string;
  sourceId: string; pageId: string; at: number;
  library?: { libraryId: string; name: string; digest: string; bookId: string; pageId: string };
};
export type EvidenceDraft = Omit<Evidence, "id" | "at">;
export type ComparisonChange = { id: string; before: string; after: string; decision: "pending" | "accepted" | "rejected" | "deferred" };
export type Comparison = { id: string; docId: string; sourceId: string; pageId: string; witness: string; location: string; base: string; variant: string; changes: ComparisonChange[]; at: number };
const EVIDENCE = "mu7rer:research-evidence";
const COMPARISONS = "mu7rer:comparisons";
function read<T>(key: string): T[] {
  const raw = readStorage(key);
  if (!raw) return [];
  const result: unknown = JSON.parse(raw);
  if (!Array.isArray(result)) throw new Error("تعذّر قراءة السجل المحفوظ؛ لم يُستبدل المحتوى");
  return result as T[];
}
export const listEvidence = () => read<Evidence>(EVIDENCE);
export const listComparisons = () => read<Comparison>(COMPARISONS);
export function saveEvidence(draft: EvidenceDraft, id?: string) {
  if (!draft.title.trim()) throw new Error("أدخل عنوان المرجع");
  const entry = { ...draft, id: id ?? crypto.randomUUID(), at: Date.now() };
  const all = listEvidence();
  writeStorage(EVIDENCE, JSON.stringify([...all.filter(item => item.id !== entry.id), entry]));
  return entry;
}
export function removeEvidence(id: string) {
  writeStorage(EVIDENCE, JSON.stringify(listEvidence().filter(item => item.id !== id)));
}
const normalize = (text: string, loose: boolean) => loose ? text.normalize("NFKC").replace(/[\u064B-\u065F\u0670\u0640]/g, "") : text;
export function searchEvidence(entries: Evidence[], query: string, category = "", mode: "contains" | "exact" = "contains", loose = false) {
  const needle = normalize(query.trim(), loose);
  return entries.filter(entry => {
    if (category && entry.category !== category) return false;
    if (!entry.quote.trim()) return false;
    const fields = [entry.title, entry.author, entry.quote, entry.comment].map(value => normalize(value, loose));
    return !needle || fields.some(value => mode === "exact" ? value === needle : value.includes(needle));
  });
}
export function evidenceCitation(entry: Evidence) {
  return [entry.title, entry.author, entry.edition, entry.volume ? `ج ${entry.volume}` : "", entry.printedPage ? `ص ${entry.printedPage}` : "", entry.filePage ? `صفحة الملف ${entry.filePage}` : ""].filter(Boolean).join("، ");
}
export function formatEvidence(entries: Evidence[], mode: "citation" | "quote" | "both", opening = "", connector = "؛ ") {
  if (!entries.length || entries.some(item => !item.quote.trim())) throw new Error("اختر شواهد منسوخة للمراجعة");
  const text = entries.map(entry => mode === "citation" ? evidenceCitation(entry) : mode === "quote" ? entry.quote : `«${entry.quote}» (${evidenceCitation(entry)})`).join(connector);
  return opening ? `${opening} ${text}` : text;
}
export function compareTexts(base: string, variant: string): ComparisonChange[] {
  const parts = diffWords(base, variant);
  const changes: ComparisonChange[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part || (!part.added && !part.removed)) continue;
    let before = part.removed ? part.value : "";
    let after = part.added ? part.value : "";
    const next = parts[i + 1];
    if (part.removed && next?.added) { after = next.value; i++; }
    changes.push({ id: crypto.randomUUID(), before, after, decision: "pending" });
  }
  return changes;
}
export function saveComparison(input: Omit<Comparison, "id" | "at" | "changes">) {
  if (!input.witness.trim() || !input.location.trim() || !input.base.trim() || !input.variant.trim()) throw new Error("حدّد النسخة والموضع ونصي المقابلة");
  const entry: Comparison = { ...input, id: crypto.randomUUID(), at: Date.now(), changes: compareTexts(input.base, input.variant) };
  writeStorage(COMPARISONS, JSON.stringify([...listComparisons(), entry]));
  return entry;
}
export function decideComparison(id: string, changeId: string, decision: ComparisonChange["decision"]) {
  const all = listComparisons().map(item => item.id === id ? { ...item, changes: item.changes.map(change => change.id === changeId ? { ...change, decision } : change) } : item);
  writeStorage(COMPARISONS, JSON.stringify(all));
}