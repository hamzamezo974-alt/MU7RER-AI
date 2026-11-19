import type { AssistantContext } from "./assistant-context-types";
import { evaluateResearchAndDefense, persistAndRetrieveUnits, runAutomatedTranscriptionAndTahqiq, segmentResearchCorpus } from "./ai-engine-core";
import { analyzeMorphologyAndSyntax, conjugateArabicVerb, tashkeelAndAnalyzeText } from "./arabic-morphology-tashkeel-engine";

export type { AssistantContext };

const ASSISTANT_TEXT_LIMIT = 40000;

export function buildAssistantContextPrompt(context: AssistantContext): string {
  const text = context.recordText.trim();
  const selection = context.selection.trim();
  const notes = context.notes.map((note) => note.trim()).filter(Boolean);
  const sampleForEngine = selection || text.slice(0, 1200);

  const units = segmentResearchCorpus({
    recordLabel: context.recordLabel,
    recordText: text.slice(0, ASSISTANT_TEXT_LIMIT),
    selection: selection.slice(0, 8000),
    footnotes: notes.slice(0, 80),
  });
  const focusedUnits = persistAndRetrieveUnits(selection || text.slice(0, 600) || "تحقيق ومقارنة ومناقشة", units, 5);
  const tahqiqPass = runAutomatedTranscriptionAndTahqiq(sampleForEngine, context.recordLabel || "النص النشط");
  const review = evaluateResearchAndDefense(selection || text.slice(0, 2000), context.recordLabel || "البحث والتحقيق");
  const linguistic = tashkeelAndAnalyzeText(sampleForEngine);
  const morphSample = analyzeMorphologyAndSyntax(sampleForEngine, 8);
  const firstRootLetters = (morphSample.find((m) => m.rootGuess && m.rootGuess !== "-")?.rootGuess || "ف.ع.ل").replace(/\./g, "");
  const conj = conjugateArabicVerb(firstRootLetters);

  const focusSummary = focusedUnits.map((u, i) => `${i + 1}. [${u.kind}] ${u.title}: ${u.text.slice(0, 240)}`).join("\n");
  const defenseSummary = review.defenseQuestions.map((q, i) => `${i + 1}. س: ${q.question} — محاور الرد: ${q.responseStrategy}`).join("\n");
  const morphSummary = morphSample.map((m) => `${m.cleanWord} (${m.pos} | جذر: ${m.rootGuess} | وزن: ${m.patternGuess} | ${m.grammaticalRoleHint})`).join("؛ ");

  return [
    "## ما تراه الآن في المُحَرِّر",
    `- الصور المرفقة: ${context.images.length ? context.images.map((image) => image.label).join("؛ ") : "لا توجد صورة مرفقة في هذا الطلب"}.`,
    `- نص ${context.recordLabel ?? "السجل النشط"} في المحرر: ${text ? `${text.length.toLocaleString("ar-EG")} حرفًا مرفقة` : "فارغ"}.`,
    `- التحديد: ${selection ? "مرفق" : "لا يوجد تحديد"}.`,
    `- حواشي السجل: ${notes.length.toLocaleString("ar-EG")}.`,
    `- مؤشر الثقة الآلية للنسخ والتحقيق: ${tahqiqPass.estimatedAccuracyPercent}% | دقة التشكيل والتحليل: ${linguistic.estimatedAccuracyPercent}%`,
    focusSummary ? `\n## وحدات الانتباه والفهرسة المحلية\n${focusSummary}` : "",
    morphSummary ? `\n## التحليل الصرفي والنحوي والتصريف\n- عينات التحليل: ${morphSummary}\n- نموذج تصريف (${conj.verbRootOrBase}): ماضٍ (${conj.past})، مضارع (${conj.present})، أمر (${conj.imperative})، مجهول (${conj.passive})` : "",
    linguistic.vowelizedText ? `\n## النص المشكّل آلياً\n"""\n${linguistic.vowelizedText.slice(0, 4000)}\n"""` : "",
    tahqiqPass.suggestedFootnotes.length ? `\n## مقترحات التحقيق والعزو الآلي\n${tahqiqPass.suggestedFootnotes.join("\n")}` : "",
    `\n## تقييم منهجي ومناقشة الرسائل\n- نقاط القوة: ${review.strengths.join(" | ")}\n- نقاط الضعف والثغرات: ${review.weaknesses.join(" | ")}\n- مداخل المقارنة: ${review.comparativeAngles.join(" | ")}\n${defenseSummary}`,
    text ? `\n## نص السجل النشط\n"""\n${text.slice(0, ASSISTANT_TEXT_LIMIT)}\n"""` : "",
    selection ? `\n## النص المحدد\n"""\n${selection.slice(0, 8000)}\n"""` : "",
    notes.length ? `\n## حواشي السجل\n${notes.slice(0, 80).map((note, index) => `${index + 1}. ${note.slice(0, 1000)}`).join("\n")}` : "",
  ].filter(Boolean).join("\n");
}
