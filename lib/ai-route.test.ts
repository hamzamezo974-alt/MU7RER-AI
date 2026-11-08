import { test } from "node:test";
import { strictEqual } from "node:assert";
import { firstRoute, shouldFallbackToOwnKey } from "./ai-route";

test("Lovable is always the first route, even when a private key is saved", () => {
  strictEqual(firstRoute(true, undefined), "lovable");
  strictEqual(firstRoute(false, undefined), "lovable");
});

test("a private key is used first only when the user is testing it", () => {
  strictEqual(firstRoute(true, true), "own");
});

test("switches to the private key when Lovable credits run out", () => {
  strictEqual(shouldFallbackToOwnKey(402, true), true);
  strictEqual(shouldFallbackToOwnKey(429, true), true);
});

test("does not switch without a key or on unrelated errors", () => {
  strictEqual(shouldFallbackToOwnKey(402, false), false);
  strictEqual(shouldFallbackToOwnKey(500, true), false);
});
