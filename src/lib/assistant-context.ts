export type AssistantPageImage = { image: string; label: string };
export type AssistantContext = {
  recordLabel?: string | undefined;
  recordText: string;
  selection?: string | undefined;
  footnotes: string[];
  images: AssistantPageImage[];
};

export const ASSISTANT_TEXT_LIMIT = 24000;

/** يصف للمساعد ما وصله فعلًا، فلا يزعم قراءة صفحة أو نص لم يرسل إليه. */
export function describeAssistantContext(context: AssistantContext): string {
  const text = context.recordText.trim();
  const selection = context.selection?.trim() ?? "";
  const notes = context.footnotes.map(note => note.trim()).filter(Boolean);
  return [
    `## ما تراه الآن في المُحَرِّر`,
    `- الصور المرفقة: ${context.images.length ? context.images.map(image => image.label).join("؛ ") : "لا توجد صورة مرفقة في هذا الطلب"}.`,
    `- نص ${context.recordLabel ?? "السجل النشط"} في المحرر: ${text ? `${text.length.toLocaleString("ar-EG")} حرفًا مرفقة` : "فارغ"}.`,
    `- التحديد: ${selection ? "مرفق" : "لا يوجد تحديد"}.`,
    `- حواشي السجل: ${notes.length.toLocaleString("ar-EG")}.`,
    text ? `\n## نص السجل النشط\n"""\n${text.slice(0, ASSISTANT_TEXT_LIMIT)}\n"""` : "",
    selection ? `\n## النص المحدد\n"""\n${selection.slice(0, 8000)}\n"""` : "",
    notes.length ? `\n## حواشي السجل\n${notes.slice(0, 80).map((note, index) => `${index + 1}. ${note.slice(0, 1000)}`).join("\n")}` : "",
  ].filter(Boolean).join("\n");
}