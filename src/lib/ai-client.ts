import { readStorage, writeStorage, removeStorage } from "@/lib/workspace-storage";
import { executeNativeManuscriptTask } from "@/lib/manuscript-core";

export const GEMINI_KEY = "mu7rer:gemini-key";
export function normalizeGeminiKey(input: string): string {
  return input.trim().replace(/^(?:GOOGLE_API_KEY|GEMINI_API_KEY|API_KEY)\s*=\s*/i, "").replace(/^['"`]|['"`]$/g, "").trim();
}
export function getGeminiKey() { return readStorage(GEMINI_KEY) ?? ""; }
export function saveGeminiKey(value: string) {
  if (value) writeStorage(GEMINI_KEY, value); else removeStorage(GEMINI_KEY);
}
export async function aiRequest(body: Record<string, unknown>): Promise<string> {
  const task = typeof body["task"] === "string" ? body["task"] : "custom";
  const text = typeof body["text"] === "string" ? body["text"] : "";
  const instruction = typeof body["instruction"] === "string" ? body["instruction"] : "";
  const hasImage = Boolean(body["image"]);

  if (!hasImage && text.trim()) {
    const localResult = executeNativeManuscriptTask({ task, text, instruction });
    if (localResult.trim()) return localResult;
  }

  try {
    const apiKey = getGeminiKey();
    const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, ...(apiKey ? { apiKey } : {}) }) });
    const raw = await response.text();
    let resText = raw;
    try { const data = JSON.parse(raw); resText = data.text ?? data.error ?? raw; } catch { /* plain error */ }
    if (response.ok && resText.trim()) return resText;
  } catch {
    /* fallback to native engine */
  }

  if (text.trim()) {
    return executeNativeManuscriptTask({ task, text, instruction });
  }
  throw new Error("لم يصل نص من الخدمة؛ حدد مقطعًا نصيًا لتشغيل المحرك المحلي.");
}
