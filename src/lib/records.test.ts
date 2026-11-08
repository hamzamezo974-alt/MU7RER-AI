import { describe, it } from "node:test";
import assert from "node:assert/strict";
const expect = (actual: unknown) => ({
  toBe: (value: unknown) => assert.equal(actual, value),
  toEqual: (value: unknown) => assert.deepEqual(actual, value),
  toHaveLength: (value: number) => assert.equal((actual as unknown[]).length, value),
  toBeTruthy: () => assert.ok(actual),
  toBeNull: () => assert.equal(actual, null),
  toContain: (value: string) => assert.ok(String(actual).includes(value)),
});

import {
  assemblePrint,
  bindPageRecords,
  ensureRecords,
  externalMarkedIds,
  markedNoteIds,
  mergeWithNext,
  splitRecord,
  type DocRecord,
} from "./records";
import type { NotesState } from "./notes";

const rec = (html: string, extra: Partial<DocRecord> = {}): DocRecord => ({
  id: Math.random().toString(36).slice(2),
  label: "سجل",
  html,
  ...extra,
});

describe("سجلات التحقيق (سجل لكل وجه)", () => {
  it("المستند القديم بلا سجلات يصير سجلًا واحدًا بنصه الكامل", () => {
    const records = ensureRecords("<p>نص الوجه الأول</p>");
    expect(records).toHaveLength(1);
    expect(records[0]?.html).toBe("<p>نص الوجه الأول</p>");
    expect(records[0]?.id).toBeTruthy();
  });

  it("تقسيم السجل يحفظ النص قبل المؤشر وبعده وينقل مراجع الوجه للجزأين", () => {
    const records = [rec("<p>أ</p><p>ب</p>", { rightPage: 3, leftPage: 9 }), rec("<p>ج</p>")];
    const next = splitRecord(records, 0, "<p>أ</p>", "<p>ب</p>");
    expect(next).toHaveLength(3);
    expect(next?.[0]?.html).toBe("<p>أ</p>");
    expect(next?.[1]?.html).toBe("<p>ب</p>");
    expect(next?.[1]?.rightPage).toBe(3);
    expect(next?.[1]?.leftPage).toBe(9);
    expect(next?.[2]?.html).toBe("<p>ج</p>");
  });

  it("دمج السجل مع التالي يصل النصين ويقدِّم مراجع الأول", () => {
    const records = [
      rec("<p>أ</p>", { rightPage: 1 }),
      rec("<p>ب</p>", { rightPage: 2, leftPage: 5 }),
    ];
    const merged = mergeWithNext(records, 0);
    expect(merged).toHaveLength(1);
    expect(merged?.[0]?.html).toBe("<p>أ</p><p>ب</p>");
    expect(merged?.[0]?.rightPage).toBe(1);
    expect(merged?.[0]?.leftPage).toBe(5);
    expect(mergeWithNext(records, 1)).toBeNull();
  });

  it("يستخرج علامات الحواشي من نص السجل ويستثني سجلات أخرى عند المزامنة", () => {
    const html = '<p>كلام<sup data-note-id="n1"></sup></p>';
    expect(markedNoteIds(html)).toEqual(["n1"]);
    const records = [rec(html), rec('<sup data-note-id="n2"></sup>')];
    expect(externalMarkedIds(records, 0)).toEqual(["n2"]);
    expect(externalMarkedIds(records, 1)).toEqual(["n1"]);
  });

  it("الطباعة تسيّل السجلات متصلة بترقيم حواشٍ موحّد عبر السجلات", () => {
    const notes: NotesState = {
      lanes: [
        { id: "takhrij", name: "التخريج", color: "#000", scope: "text", kind: "notes", visible: true, printed: true, collapsed: false, height: 120, memo: "" },
        { id: "wasf", name: "وصف", color: "#000", scope: "right", kind: "memo", visible: true, printed: true, collapsed: false, height: 120, memo: "وصف الوجه" },
      ],
      notes: [
        { id: "n2", laneId: "takhrij", text: "حاشية السجل الثاني", label: "1", anchor: "" },
        { id: "n1", laneId: "takhrij", text: "حاشية السجل الأول", label: "1", anchor: "" },
      ],
    };
    const records = [
      rec('<p>أ<sup data-note-id="n1">(1)</sup></p>'),
      rec('<p>ب<sup data-note-id="n2">(1)</sup></p>'),
    ];
    const print = assemblePrint(records, notes);
    expect(print.html).toContain("أ");
    expect(print.html).toContain("ب");
    expect(print.printedNotes).toHaveLength(2);
    expect(print.printedNotes[0]?.id).toBe("n1");
    expect(print.printedNotes[0]?.label).toBe("1");
    expect(print.printedNotes[1]?.id).toBe("n2");
    expect(print.printedNotes[1]?.label).toBe("2");
    expect(print.memoLanes).toHaveLength(1);
    expect(print.memoLanes[0]?.memo).toBe("وصف الوجه");
  });
});

it("each face creates one record and repeated binding creates no duplicate", () => {
  const pages = [{ id: "a", name: "وجه أ" }, { id: "b", name: "وجه ب" }, { id: "c", name: "وجه ج" }];
  const records = bindPageRecords(ensureRecords(""), "left", "print", pages);
  assert.equal(records.length, 3);
  assert.deepEqual(records.map(record => record.leftPageId), ["a", "b", "c"]);
  assert.equal(bindPageRecords(records, "left", "print", pages).length, 3);
});
it("splitting retains immutable source links and merging preserves them", () => {
  const records = bindPageRecords(ensureRecords(""), "right", "manuscript", [{ id: "face", name: "وجه" }]);
  const divided = splitRecord(records, 0, "أ", "ب");
  assert.ok(divided);
  assert.equal(divided[1]?.rightPageId, "face");
  assert.equal(mergeWithNext(divided, 0)?.[0]?.rightSourceId, "manuscript");
});
