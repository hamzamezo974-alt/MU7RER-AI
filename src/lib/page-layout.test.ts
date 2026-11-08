import { test } from "node:test";
import { deepStrictEqual } from "node:assert";
import { cropPixels, splitBoxes, moveItem } from "./page-layout";
test("split reads right face before left face", () => {
  deepStrictEqual(splitBoxes(60), [{ left: 60, top: 0, right: 100, bottom: 100 }, { left: 0, top: 0, right: 60, bottom: 100 }]);
});
test("a derived page can be cropped repeatedly at its own dimensions", () => {
  const first = cropPixels(1000, 800, { left: 50, top: 0, right: 100, bottom: 100 });
  deepStrictEqual(cropPixels(first.width, first.height, { left: 0, top: 25, right: 100, bottom: 75 }), { x: 0, y: 200, width: 500, height: 400 });
});
test("page reordering preserves every page", () => {
  deepStrictEqual(moveItem(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
});