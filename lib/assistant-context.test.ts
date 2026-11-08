import { test } from "node:test";
import { match, doesNotMatch } from "node:assert";
import { describeAssistantContext } from "./assistant-context";

test("names both visible pages and the active record notes", () => {
  const result = describeAssistantContext({ recordLabel: "سجل ٣", recordText: "متن", footnotes: ["حاشية"], images: [{ image: "data:a", label: "المخطوط · ٣" }, { image: "data:b", label: "المطبوعة · ٤" }] });
  match(result, /المخطوط · ٣؛ المطبوعة · ٤/);
  match(result, /سجل ٣/);
  match(result, /1\. حاشية/);
});

test("does not claim an image when none was attached", () => {
  doesNotMatch(describeAssistantContext({ recordText: "", footnotes: [], images: [] }), /المخطوط ·/);
});