import type { NotesState } from "./notes";

// سجلات التحقيق: كل سجل يمثل وجهًا واحدًا من المخطوط (أو وحدة نصية يختارها المحقق
// بالتقسيم والدمج)، يُحرَّر منفردًا في وسط الشاشة، ويجاوره ما يقابله من المخطوط
// والمطبوع، وله حواشيه؛ ثم تُسيَّل السجلات متصلة في التصفح والطباعة والتصدير.

export type DocRecord = {
  id: string;
  label: string;
  html: string;
  /** فهرس صفحة المخطوط (اللوح الأيمن) المرتبطة بالسجل */
  rightPage?: number;
  /** فهرس صفحة المطبوع (اللوح الأيسر) المرتبطة بالسجل */
  leftPage?: number;
  rightSourceId?: string;
  rightPageId?: string;
  leftSourceId?: string;
  leftPageId?: string;
};

export const newRecordId = () =>
  `r${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const recordLabel = (index: number) => `سجل ${Number(index + 1).toLocaleString("ar-EG")}`;

/** يضمن وجود سجل واحد على الأقل؛ المستند القديم بلا سجلات يصير سجلًا واحدًا بنصه الكامل. */
export function ensureRecords(html: string, records?: DocRecord[]): DocRecord[] {
  const clean = (records ?? []).filter(
    (record) => record && record.id && typeof record.html === "string",
  );
  if (clean.length) return clean;
  return [{ id: newRecordId(), label: recordLabel(0), html }];
}

/** يقسّم السجل عند المؤشر: قبل المؤشر يبقى في السجل، وبعده سجل جديد يحمل مراجع الوجه نفسه. */
export function splitRecord(
  records: DocRecord[],
  index: number,
  htmlBefore: string,
  htmlAfter: string,
): DocRecord[] | null {
  const current = records[index];
  if (!current) return null;
  const next: DocRecord = {
    ...current,
    id: newRecordId(),
    label: recordLabel(index + 1),
    html: htmlAfter,
    ...(current.rightPage !== undefined ? { rightPage: current.rightPage } : {}),
    ...(current.leftPage !== undefined ? { leftPage: current.leftPage } : {}),
  };
  const copy = [...records];
  copy[index] = { ...current, html: htmlBefore };
  copy.splice(index + 1, 0, next);
  return copy;
}

/** يدمج السجل مع الذي يليه: النصان متتاليان ومراجع الوجه للأولى مقدَّمة. */
export function mergeWithNext(records: DocRecord[], index: number): DocRecord[] | null {
  const current = records[index];
  const next = records[index + 1];
  if (!current || !next) return null;
  const merged: DocRecord = {
    ...next,
    ...current,
    id: current.id,
    label: current.label,
    html: `${current.html}${next.html}`,
    ...(current.rightPage !== undefined || next.rightPage !== undefined
      ? { rightPage: current.rightPage ?? next.rightPage }
      : {}),
    ...(current.leftPage !== undefined || next.leftPage !== undefined
      ? { leftPage: current.leftPage ?? next.leftPage }
      : {}),
  };
  const copy = [...records];
  copy.splice(index, 2, merged);
  return copy;
}

/** معرّفات علامات الحواشي الواردة في نص HTML لأي سجل (يعمل بلا متصفح). */
export function markedNoteIds(html: string): string[] {
  const ids: string[] = [];
  for (const match of html.matchAll(/data-note-id="([^"]+)"/g)) ids.push(match[1] ?? "");
  return ids;
}

/** معرّفات الحواشي المعلَّمة في سجلات غير السجل النشط، لئلا يُحذف نصها عند مزامنة سجل واحد. */
export function externalMarkedIds(records: DocRecord[], activeIndex: number): string[] {
  const ids = new Set<string>();
  records.forEach((record, index) => {
    if (index === activeIndex) return;
    for (const id of markedNoteIds(record.html)) ids.add(id);
  });
  return [...ids];
}

export type PrintNoteRow = { id: string; laneId: string; label: string; text: string };
export type PrintMemoLane = { id: string; name: string; color: string; memo: string };

/**
 * يسيّل السجلات متصلة للطباعة والتصدير مع ترقيم حواشٍ موحّد واحد على مستوى
 * الكتاب: العلامات تُرقَّم بترتيب ظهورها عبر كل السجلات مهما كان ما ظهر في
 * كل سجل منفردًا، كما في الكتب المحققة.
 */
export function assemblePrint(records: DocRecord[], notes: NotesState) {
  const printedLaneIds = new Set(
    notes.lanes.filter((lane) => lane.printed).map((lane) => lane.id),
  );
  const order: string[] = [];
  const labelOf = new Map<string, string>();
  const parts: string[] = [];
  for (const record of records) {
    let html = record.html;
    if (typeof document === "undefined") {
      for (const id of markedNoteIds(html)) { if (!order.includes(id)) order.push(id); labelOf.set(id, String(order.indexOf(id) + 1)); }
      html = html.replace(/(<[^>]+data-note-id="([^"]+)"[^>]*>)[\s\S]*?(<\/[^>]+>)/g, (_match, start, id, end) => `${start}${labelOf.get(id) ?? ""}${end}`);
    } else {
      const holder = document.createElement("div");
      holder.innerHTML = record.html;
      holder.querySelectorAll<HTMLElement>("[data-note-id]").forEach((mark) => {
        const id = mark.getAttribute("data-note-id") ?? "";
        if (!order.includes(id)) order.push(id);
        const label = String(order.indexOf(id) + 1);
        labelOf.set(id, label);
        mark.textContent = label;
      });
      html = holder.innerHTML;
    }
    parts.push(html);
  }
  const printedNotes: PrintNoteRow[] = notes.notes
    .filter((note) => printedLaneIds.has(note.laneId) && order.includes(note.id))
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    .map((note) => ({ id: note.id, laneId: note.laneId, label: labelOf.get(note.id) ?? note.label, text: note.text }));
  const memoLanes: PrintMemoLane[] = notes.lanes
    .filter((lane) => lane.kind === "memo" && lane.printed && lane.memo.trim())
    .map((lane) => ({ id: lane.id, name: lane.name, color: lane.color, memo: lane.memo }));
  return { html: parts.join(""), printedNotes, memoLanes };
}

/** Bind immutable faces without duplicating previously transcribed pages. */
export function bindPageRecords(records: DocRecord[], pane: "right" | "left", sourceId: string, pages: { id: string; name: string }[]): DocRecord[] {
  const sourceKey = pane === "right" ? "rightSourceId" : "leftSourceId";
  const pageKey = pane === "right" ? "rightPageId" : "leftPageId";
  const indexKey = pane === "right" ? "rightPage" : "leftPage";
  const next = records.map(record => ({ ...record }));
  pages.forEach((page, index) => {
    if (next.some(record => record[sourceKey] === sourceId && record[pageKey] === page.id)) return;
    const empty = next.length === 1 && !next[0]?.rightPageId && !next[0]?.leftPageId && !next[0]?.html.replace(/<[^>]*>/g, "").trim();
    const record = { ...(empty ? next[0] : undefined), id: empty ? (next[0]?.id ?? newRecordId()) : newRecordId(), label: page.name || recordLabel(index), html: empty ? (next[0]?.html ?? "") : "", [sourceKey]: sourceId, [pageKey]: page.id, [indexKey]: index };
    if (empty) next[0] = record; else next.push(record);
  });
  return next;
}
