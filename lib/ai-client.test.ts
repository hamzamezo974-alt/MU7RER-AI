import { test } from "node:test";
import { strictEqual } from "node:assert";
import { normalizeGeminiKey } from "./ai-client";
test("accepts pasted keys without restricting their prefix", () => {
  strictEqual(normalizeGeminiKey(' GEMINI_API_KEY="example-key" '), "example-key");
  strictEqual(normalizeGeminiKey("new-format-key"), "new-format-key");
});