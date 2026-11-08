import { it } from "node:test";
import { strictEqual, rejects } from "node:assert";
import { transformWorkingText } from "./working-text";
it("applies subsequent operations to the previous working text, not the original", async () => {
  const first = await transformWorkingText(null, "قال زيد", "متن آخر", async text => `${text} مصحح`);
  const next = await transformWorkingText(first, "اختيار جديد", "متن آخر", async text => `${text} مشكول`);
  strictEqual(next, "قال زيد مصحح مشكول");
});
it("keeps the prior draft unchanged on failure and rejects an empty result", async () => {
  const draft = "مسودة محفوظة";
  await rejects(transformWorkingText(draft, "", "", async () => { throw new Error("request failed"); }));
  strictEqual(draft, "مسودة محفوظة");
  await rejects(transformWorkingText(draft, "", "", async () => ""));
});