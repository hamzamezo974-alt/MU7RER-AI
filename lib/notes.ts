import { readStorage, writeStorage } from "@/lib/workspace-storage";
import type { Evidence } from "@/lib/research";
// مستطيلات الحواشي المتعددة: كل «مسرب» (lane) نوع مستقل من الحواشي
// (تخريج، فروق نسخ، شرح غريب، تعليقات…) مع تحكّم في إظهاره عند العرض والتصدير.
// المسارب موزّعة على الشرائح: نص (المحرر)، يمين ويسار (شريحتا الصور) للتوصيف والملاحظات.

import { useSyncExternalStore } from "react";

export type NoteScope = "text" | "right" | "left";
export type LaneKind = "notes" | "memo";

export type NoteLane = {
  id: string;
  name: string;
  color: string;
  /** الشريحة التي يتبعها هذا المستطيل */
  scope: NoteScope;
  /** حواشٍ مرقّمة مرتبطة بالمتن، أو حقل توصيف حر */
  kind: LaneKind;
  /** يظهر داخل الواجهة */
  visible: boolean;
  /** يُطبع ويُصدَّر مع النص النهائي */
  printed: boolean;
  /** مطوي داخل الواجهة */
  collapsed: boolean;
  /** ارتفاع البطاقة بالبكسل */
  height: number;
  /** نص التوصيف لمسارب النوع memo */
  memo: string;
};

export type Note = {
  id: string;
  laneId: string;
  text: string;
  /** الرقم المتسلسل داخل مسربه، يُحسب من ترتيب العلامات في المتن */
  label: string;
  anchor: string;
  evidence?: Evidence[];
};

export type NotesState = { lanes: NoteLane[]; notes: Note[] };

const KEY = "mu7rer:notes";
let activeKey = KEY;
export function selectNotesDocument(id: string) {
  activeKey = `${KEY}:${id}`;
  loaded = false;
  state = { lanes: DEFAULT_LANES.map(lane => ({ ...lane })), notes: [] };
  load();
  listeners.forEach(listener => listener());
}
export function resetNotesCache() { loaded = false; activeKey = KEY; state = SERVER_STATE; }

export const newNoteId = () =>
  `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const lane = (
  id: string,
  name: string,
  color: string,
  scope: NoteScope,
  kind: LaneKind,
  printed: boolean,
): NoteLane => ({
  id,
  name,
  color,
  scope,
  kind,
  visible: true,
  printed,
  collapsed: false,
  height: 120,
  memo: "",
});

export const DEFAULT_LANES: NoteLane[] = [
  lane("takhrij", "التخريج والعزو", "#1d4ed8", "text", "notes", true),
  lane("furuq", "فروق النسخ", "#b91c1c", "text", "notes", true),
  lane("gharib", "شرح الغريب", "#166534", "text", "notes", false),
  lane("taliq", "تعليقات المحقق", "#a16207", "text", "notes", false),
  lane("wasf-right", "وصف المخطوط", "#7c3aed", "right", "memo", false),
  lane("wasf-left", "وصف المطبوعة", "#0f766e", "left", "memo", false),
];

let state: NotesState = { lanes: DEFAULT_LANES, notes: [] };
let loaded = false;
const listeners = new Set<() => void>();

function persist() {
  try {
    writeStorage(activeKey, JSON.stringify(state));
  } catch {
    /* تجاهل امتلاء التخزين */
  }
}

/** ترقية المسارب القديمة (قبل إضافة الشرائح والطي والارتفاع). */
function migrate(lanes: NoteLane[]): NoteLane[] {
  const upgraded = lanes.map((item) => ({
    ...item,
    scope: (item.scope ?? "text") as NoteScope,
    kind: (item.kind ?? "notes") as LaneKind,
    collapsed: item.collapsed ?? false,
    height: item.height ?? 120,
    memo: item.memo ?? "",
  }));
  for (const fallback of DEFAULT_LANES) {
    if (fallback.kind === "memo" && !upgraded.some((item) => item.id === fallback.id)) {
      upgraded.push({ ...fallback });
    }
  }
  return upgraded;
}

function load() {
  if (loaded || typeof localStorage === "undefined") return;
  loaded = true;
  try {
    const raw = readStorage(activeKey);
    if (raw) {
      const parsed = JSON.parse(raw) as NotesState;
      if (Array.isArray(parsed.lanes) && Array.isArray(parsed.notes)) {
        state = { lanes: migrate(parsed.lanes), notes: parsed.notes };
      }
    }
  } catch {
    /* تجاهل */
  }
}

function set(next: NotesState) {
  state = next;
  persist();
  listeners.forEach((listener) => listener());
}

export function getNotesState(): NotesState {
  load();
  return state;
}

const SERVER_STATE: NotesState = { lanes: DEFAULT_LANES, notes: [] };

export function useNotes(): NotesState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getNotesState,
    () => SERVER_STATE,
  );
}

export function addLane(name: string, color: string, scope: NoteScope, kind: LaneKind = "notes") {
  const created = lane(newNoteId(), name, color, scope, kind, kind === "notes");
  set({ ...getNotesState(), lanes: [...getNotesState().lanes, created] });
  return created;
}

export function updateLane(id: string, patch: Partial<NoteLane>) {
  const current = getNotesState();
  set({
    ...current,
    lanes: current.lanes.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  });
}

export function removeLane(id: string) {
  const current = getNotesState();
  set({
    lanes: current.lanes.filter((item) => item.id !== id),
    notes: current.notes.filter((note) => note.laneId !== id),
  });
}

export function addNote(laneId: string, anchor: string, text = "", evidence?: Evidence[]): Note {
  const note: Note = { id: newNoteId(), laneId, text, label: "", anchor, ...(evidence ? { evidence: structuredClone(evidence) } : {}) };
  const current = getNotesState();
  set({ ...current, notes: [...current.notes, note] });
  return note;
}

export function updateNote(id: string, patch: Partial<Note>) {
  const current = getNotesState();
  set({
    ...current,
    notes: current.notes.map((note) => (note.id === id ? { ...note, ...patch } : note)),
  });
}

export function removeNote(id: string) {
  const current = getNotesState();
  set({ ...current, notes: current.notes.filter((note) => note.id !== id) });
}

/**
 * يعيد الترقيم حسب ترتيب ظهور العلامات في المتن (معرّفات مرتبة).
 * التسلسل موحّد واحد على مستوى الصفحة: كل حاشية تأخذ رقمها من موضعها في المتن
 * مهما كان نوع مستطيلها (تخريج، فروق، غريب…)، كما في الكتب المحققة.
 */
export function renumber(orderedIds: string[]) {
  const current = getNotesState();
  const labels = new Map<string, string>();
  let counter = 0;
  for (const id of orderedIds) {
    const note = current.notes.find((item) => item.id === id);
    if (!note) continue;
    counter += 1;
    labels.set(id, String(counter));
  }
  let changed = false;
  const notes = current.notes.map((note) => {
    const label = labels.get(note.id) ?? "";
    if (label !== note.label) changed = true;
    return label === note.label ? note : { ...note, label };
  });
  // ترتيب الحواشي داخل كل مسرب حسب ترتيب المتن
  const rank = new Map(orderedIds.map((id, index) => [id, index]));
  notes.sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9));
  if (changed || notes.some((note, index) => note.id !== current.notes[index]?.id)) {
    set({ ...current, notes });
  }
  return labels;
}

export function notesOfLane(state: NotesState, laneId: string) {
  return state.notes.filter((note) => note.laneId === laneId && note.label);
}

export function lanesOfScope(state: NotesState, scope: NoteScope) {
  return state.lanes.filter((item) => item.scope === scope);
}
