import { describe, it } from "node:test";
import { deepStrictEqual } from "node:assert";
import { extendSource } from "./source-catalog";
import type { Book } from "./books";
const base = { id: "source", title: "أصل", witness: "أ", pages: [{ id: "p1", name: "1" }, { id: "p2", name: "2" }], process: {}, createdAt: 1 } as Book;
describe("source provenance", () => {
  it("retains original pages after splitting and recropping", () => {
    const original = extendSource(undefined, base, "استيراد");
    const split = extendSource(original, { ...base, pages: [{ id: "right", name: "يمين" }, { id: "left", name: "يسار" }, base.pages[1] as Book["pages"][number]] }, "تقسيم", ["p1"], ["right", "left"]);
    const cropped = extendSource(split, { ...base, pages: [{ id: "crop", name: "قص" }, { id: "left", name: "يسار" }, { id: "p2", name: "2" }] }, "قص", ["right"], ["crop"]);
    deepStrictEqual(cropped.originals.map(p => p.id), ["p1", "p2"]);
    deepStrictEqual(cropped.pages.map(p => p.id), ["p1", "p2", "right", "left", "crop"]);
    deepStrictEqual(cropped.operations[2]?.inputs, ["right"]);
    deepStrictEqual(cropped.groups[1]?.book.pages.map(p => p.id), ["right", "left", "p2"]);
  });
  it("preserves ordered merge inputs and historical ordering after serialization", () => {
    const original = extendSource(undefined, base, "استيراد");
    const reordered = extendSource(original, { ...base, pages: [...base.pages].reverse() }, "ترتيب");
    const merged = extendSource(reordered, { ...base, pages: [{ id: "merged", name: "دمج" }] }, "دمج أفقي", ["p2", "p1"], ["merged"]);
    const restored = JSON.parse(JSON.stringify(merged));
    deepStrictEqual(restored.operations[2].inputs, ["p2", "p1"]);
    deepStrictEqual(restored.groups[1].book.pages.map((p: { id: string }) => p.id), ["p2", "p1"]);
    deepStrictEqual(restored.groups[0].book.pages.map((p: { id: string }) => p.id), ["p1", "p2"]);
  });
});