import { test } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { pdfPageReferences } from "./pdf-reference";
test("PDF import indexes every page without embedding rendered page data", () => {
  const pages = pdfPageReferences("كتاب.pdf", 782);
  strictEqual(pages.length, 782);
  deepStrictEqual(pages[781], { name: "كتاب — ص 782", pdfPage: 782, originalName: "كتاب.pdf" });
  strictEqual(pages.some(page => "image" in page || "canvas" in page), false);
});