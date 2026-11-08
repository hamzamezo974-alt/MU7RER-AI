import { test } from "node:test";
import { strictEqual, deepStrictEqual } from "node:assert";
import { locateProposals, validReplacement, type ReviewProposal } from "./manuscript-review";
const proposal: ReviewProposal = { original: "هاذا", occurrence: 2, replacement: "هذا", alternatives: [], kind: "spelling", reason: "رسم الإملاء" };
test("locates the specified literal occurrence rather than a model offset", () => { const result = locateProposals("هاذا ثم هاذا", [proposal]); strictEqual(result[0]?.start, 8); strictEqual(result[0]?.end, 12); });
test("rejects invented quotes and missing occurrences", () => { deepStrictEqual(locateProposals("هذا", [proposal]), []); deepStrictEqual(locateProposals("هاذا", [{ ...proposal, occurrence: 99 }]), []); });
test("does not accept overlapping correction ranges", () => { strictEqual(locateProposals("هاذا ثم هاذا", [proposal, proposal]).length, 1); });
test("cannot replace changed text or insert empty alternatives", () => { strictEqual(validReplacement("هاذا", "هاذا", "هذا"), true); strictEqual(validReplacement("آخر", "هاذا", "هذا"), false); strictEqual(validReplacement("هاذا", "هاذا", ""), false); });