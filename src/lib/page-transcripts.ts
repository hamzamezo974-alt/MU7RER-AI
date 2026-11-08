import { newRecordId } from "./records";
import { readStorage, writeStorage } from "@/lib/workspace-storage";
import { createDoc, getDoc, snapshotVersion, saveDoc, saveRecords } from "@/lib/documents";

export type TextRevision = { id: string; text: string; raw: string; method: "manual" | "ocr"; at: number };
export type PageTranscript = { sourceId: string; pageId: string; revisions: TextRevision[]; approvedId?: string; error?: string };
export type AssemblyInput = { pageId: string; revisionId: string; name: string; text: string };
export type TextAssembly = { id: string; sourceId: string; groupId: string; inputs: AssemblyInput[]; excluded: string[]; decision: string; boundaryDecision: string; docId: string; at: number; signature: string };
const TEXTS = "mu7rer:page-transcripts";
const ASSEMBLIES = "mu7rer:text-assemblies";

function read<T>(key: string): T[] {
  const raw = readStorage(key);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("تعذّر قراءة النصوص المحفوظة؛ لم تُستبدل البيانات");
  return parsed as T[];
}
export const listTranscripts = () => read<PageTranscript>(TEXTS);
export const listAssemblies = () => read<TextAssembly>(ASSEMBLIES);
export const currentRevision = (page?: PageTranscript) => page?.revisions.at(-1);
export const isApproved = (page?: PageTranscript) => Boolean(page?.approvedId && page.approvedId === currentRevision(page)?.id);

export function reviseTranscript(previous: PageTranscript | undefined, sourceId: string, pageId: string, text: string, method: TextRevision["method"], raw = text): PageTranscript {
  return { sourceId, pageId, revisions: [...(previous?.revisions ?? []), { id: crypto.randomUUID(), text, raw, method, at: Date.now() }], ...(previous?.approvedId ? { approvedId: previous.approvedId } : {}) };
}
function putTranscript(page: PageTranscript) {
  const all = listTranscripts();
  writeStorage(TEXTS, JSON.stringify([...all.filter(item => item.sourceId !== page.sourceId || item.pageId !== page.pageId), page]));
  return page;
}
export function saveTranscript(sourceId: string, pageId: string, text: string, method: TextRevision["method"] = "manual", raw?: string) {
  const old = listTranscripts().find(item => item.sourceId === sourceId && item.pageId === pageId);
  return putTranscript(reviseTranscript(old, sourceId, pageId, text, method, raw ?? (method === "manual" ? currentRevision(old)?.raw ?? text : text)));
}
export function approveTranscript(sourceId: string, pageId: string) {
  const page = listTranscripts().find(item => item.sourceId === sourceId && item.pageId === pageId);
  const revision = currentRevision(page);
  if (!page || !revision?.text.trim()) throw new Error("احفظ نص الصفحة قبل اعتماده");
  return putTranscript({ ...page, approvedId: revision.id });
}
export function recordTranscriptError(sourceId: string, pageId: string, error: string) {
  const old = listTranscripts().find(item => item.sourceId === sourceId && item.pageId === pageId);
  putTranscript({ sourceId, pageId, revisions: [], ...old, error });
}
export function prepareAssembly(sourceId: string, groupPages: { id: string; name: string }[], orderedIds: string[], transcripts: PageTranscript[]) {
  if (!orderedIds.length) throw new Error("اختر صفحات للتجميع");
  if (new Set(orderedIds).size !== orderedIds.length) throw new Error("صفحة مكررة في التجميع");
  const inputs = orderedIds.map(pageId => {
    const original = groupPages.find(item => item.id === pageId);
    const page = transcripts.find(item => item.sourceId === sourceId && item.pageId === pageId);
    const revision = currentRevision(page);
    if (!original) throw new Error("صفحة ليست ضمن المجموعة المختارة");
    if (!isApproved(page) || !revision) throw new Error(`الصفحة «${original.name}» غير معتمدة`);
    return { pageId, revisionId: revision.id, name: original.name, text: revision.text };
  });
  return { inputs, excluded: groupPages.filter(page => !orderedIds.includes(page.id)).map(page => page.id), text: inputs.map(input => input.text).join("\n\n") };
}
export function boundaryWarnings(inputs: AssemblyInput[]) {
  const warnings: string[] = [];
  inputs.slice(1).forEach((next, index) => {
    const previous = inputs[index];
    if (!previous) return;
    const tail = previous.text.trim().split(/\s+/).slice(-8);
    const head = next.text.trim().split(/\s+/).slice(0, 8);
    for (let count = Math.min(tail.length, head.length); count >= 3; count--) {
      if (tail.slice(-count).join(" ") === head.slice(0, count).join(" ")) {
        warnings.push(`${previous.name} ← ${next.name}: ${head.slice(0, count).join(" ")}`);
        break;
      }
    }
  });
  return warnings;
}
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export function assembleText(sourceId: string, groupId: string, title: string, groupPages: { id: string; name: string }[], ids: string[], decision: string, boundaryDecision: string, showLabels: boolean) {
  const prepared = prepareAssembly(sourceId, groupPages, ids, listTranscripts());
  if (prepared.excluded.length && !decision.trim()) throw new Error("سجّل سبب التجميع الجزئي واستبعاد الصفحات");
  if (boundaryWarnings(prepared.inputs).length && !boundaryDecision.trim()) throw new Error("راجع تكرار حدود الصفحات وسجّل قرارك");
  const signature = JSON.stringify({ sourceId, groupId, inputs: prepared.inputs, excluded: prepared.excluded, decision, boundaryDecision, showLabels });
  const all = listAssemblies();
  const previous = all.find(item => item.signature === signature && getDoc(item.docId));
  if (previous) return previous;
  const html = prepared.inputs.map(input => `${showLabels ? `<p>[${escape(input.name)}]</p>` : ""}${input.text.split(/\n\n/).map(block => `<p>${escape(block).replace(/\n/g, "<br>")}</p>`).join("")}`).join("");
  const doc = createDoc(`${title} — تجميع ${prepared.excluded.length ? "جزئي" : "معتمد"}`, html);
  saveRecords(doc.id, prepared.inputs.map(input => ({ id: newRecordId(), label: input.name, html: input.text.split(/\n\n/).map(block => `<p>${escape(block).replace(/\n/g, "<br>")}</p>`).join(""), rightSourceId: sourceId, rightPageId: input.pageId, rightPage: groupPages.findIndex(page => page.id === input.pageId) })));
  snapshotVersion(doc.id);
  saveDoc(doc.id, { html });
  const assembly: TextAssembly = { id: crypto.randomUUID(), sourceId, groupId, ...prepared, decision, boundaryDecision, docId: doc.id, at: Date.now(), signature };
  writeStorage(ASSEMBLIES, JSON.stringify([...all, assembly]));
  return assembly;
}