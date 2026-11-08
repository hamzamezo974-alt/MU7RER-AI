import { readStorage, writeStorage } from "@/lib/workspace-storage";
import type { DocRecord } from "@/lib/records";
// مكتبة المستندات: حفظ تلقائي + نسخ سابقة (إصدارات) داخل متصفح المستخدم.
// المستند قد يُقسَّم إلى «سجلات تحقيق» (سجل لكل وجه من المخطوط) فيحمل مصفوفة سجلات.

export type DocVersion = { id: string; html: string; createdAt: number };

export type Mu7rerDoc = {
  id: string;
  title: string;
  html: string;
  updatedAt: number;
  createdAt: number;
  versions: DocVersion[];
  /** سجلات التحقيق إن قُسِّم المستند؛ غيابها يعني مستندًا موحّدًا قديمًا */
  records?: DocRecord[];
};

const DOCS_KEY = "mu7rer:docs";
const ACTIVE_KEY = "mu7rer:active-doc";
const LEGACY_KEY = "mu7rer:document";
export const MAX_VERSIONS = 25;

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function read(): Mu7rerDoc[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = readStorage(DOCS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Mu7rerDoc[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(docs: Mu7rerDoc[]) {
  try {
    writeStorage(DOCS_KEY, JSON.stringify(docs));
  } catch {
    /* قد تمتلئ مساحة التخزين */
  }
}

export function listDocs(): Mu7rerDoc[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getDoc(id: string): Mu7rerDoc | undefined {
  return read().find((doc) => doc.id === id);
}

export function createDoc(title = "مستند جديد", html = ""): Mu7rerDoc {
  const now = Date.now();
  const doc: Mu7rerDoc = { id: newId(), title, html, updatedAt: now, createdAt: now, versions: [] };
  write([doc, ...read()]);
  setActiveDocId(doc.id);
  return doc;
}

export function saveDoc(id: string, patch: Partial<Pick<Mu7rerDoc, "title" | "html">>): void {
  const docs = read();
  const index = docs.findIndex((doc) => doc.id === id);
  if (index === -1) return;
  const existing = docs[index];
  if (!existing) return;
  docs[index] = { ...existing, ...patch, updatedAt: Date.now() };
  write(docs);
}

/** يحفظ سجلات التحقيق للمستند (كل سجل وجه من المخطوط بنصه ومراجع صفحاته). */
export function saveRecords(id: string, records: DocRecord[]): void {
  const docs = read();
  const index = docs.findIndex((doc) => doc.id === id);
  if (index === -1) return;
  const existing = docs[index];
  if (!existing) return;
  docs[index] = { ...existing, records, updatedAt: Date.now() };
  write(docs);
}

export function snapshotVersion(id: string): void {
  const docs = read();
  const index = docs.findIndex((doc) => doc.id === id);
  if (index === -1) return;
  const doc = docs[index];
  if (!doc) return;
  const last = doc.versions[0];
  if (last && last.html === doc.html) return;
  const versions = [{ id: newId(), html: doc.html, createdAt: Date.now() }, ...doc.versions].slice(
    0,
    MAX_VERSIONS,
  );
  docs[index] = { ...doc, versions };
  write(docs);
}

export function deleteDoc(id: string): void {
  write(read().filter((doc) => doc.id !== id));
}

export function duplicateDoc(id: string): Mu7rerDoc | undefined {
  const source = getDoc(id);
  if (!source) return undefined;
  const copy = createDoc(`${source.title} — نسخة`, source.html);
  if (source.records?.length) saveRecords(copy.id, source.records);
  return copy;
}

export function getActiveDocId(): string | null {
  try {
    return readStorage(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveDocId(id: string) {
  try {
    writeStorage(ACTIVE_KEY, id);
  } catch {
    /* تجاهل */
  }
}

/** يهيّئ المكتبة عند أول تشغيل ويرحّل المستند القديم إن وُجد. */
export function ensureActiveDoc(): Mu7rerDoc {
  const docs = read();
  const activeId = getActiveDocId();
  const active = docs.find((doc) => doc.id === activeId);
  if (active) return active;
  if (docs[0]) {
    setActiveDocId(docs[0].id);
    return docs[0];
  }
  let legacy = "";
  try {
    legacy = readStorage(LEGACY_KEY) ?? "";
  } catch {
    /* تجاهل */
  }
  return createDoc("مستندي الأول", legacy);
}

export function formatWhen(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `اليوم ${time}` : `${date.toLocaleDateString("ar-EG")} ${time}`;
}

export function htmlToPlainText(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ");
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return holder.textContent ?? "";
}
