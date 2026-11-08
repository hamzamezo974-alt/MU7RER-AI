import { test } from "node:test";
import { strictEqual } from "node:assert";
import { flattenBackground, adaptiveThreshold } from "./image-enhance";
test("background flattening preserves darker ink and alpha", () => {
  const pixels = new Uint8ClampedArray([100, 100, 100, 255, 20, 20, 20, 255, 180, 180, 180, 255]);
  flattenBackground(pixels, 3, 1);
  strictEqual(pixels[4], 49); strictEqual(pixels[7], 255);
});
test("adaptive threshold distinguishes ink from its local background", () => {
  const pixels = new Uint8ClampedArray([160, 160, 160, 255, 30, 30, 30, 255, 200, 200, 200, 255]);
  adaptiveThreshold(pixels, 3, 1);
  strictEqual(pixels[0], 255); strictEqual(pixels[4], 0); strictEqual(pixels[8], 255);
});