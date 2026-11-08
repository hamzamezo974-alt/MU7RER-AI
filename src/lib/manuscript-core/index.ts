// المنسق المركزي لمحركات «المُحَرِّر» التراثية المدمجة (Native Manuscript Intelligence Core)
// يوفر تشغيل جميع مهام التحقيق، والتشكيل، والتخريج، والمقابلة، وتصدير LaTeX/TEI-XML محلياً وبسرعة فورية.

import { analyzeMorphology, HERITAGE_GLOSSARY, stripDiacritics, vocalizeArabicText } from "./morphology";
import { autoPunctuateHeritageText, cleanOcrTranscript, standardizeOrthography } from "./script-normalizer";
import { collateManuscriptTexts, formatCriticalApparatusBlock } from "./critical-collation";
import { analyzeManuscriptImageData, sauvolaBinarize } from "./layout-segmenter";
import { takhrijAyahNative, takhrijHadithNative, translateAndIndexNamesNative } from "./takhrij-engine";
import type { LocatedProposal, ReviewProposal } from "../manuscript-review";
import { locateProposals } from "../manuscript-review";

export * from "./morphology";
export * from "./script-normalizer";
export * from "./critical-collation";
export * from "./layout-segmenter";
export * from "./takhrij-engine";

export type NativeEngineTask =
  | "transcribe"
  | "collate"
  | "tashkeel"
  | "correct"
  | "ocr-cleanup"
  | "hamza"
  | "punctuate"
  | "summarize"
  | "takhrij-ayah"
  | "takhrij-hadith"
  | "index-names"
  | "analyze-word"
  | "custom";

/** تنفيذ فوري محلي لأي مهمة تحقيق نصية دون الحاجة لخادم خارجي */
export function executeNativeManuscriptTask(body: {
  task?: string;
  text?: string;
  instruction?: string;
  variantText?: string;
  siglum?: string;
}): string {
  const task = (body.task ?? "custom") as NativeEngineTask;
  const text = (body.text ?? "").trim();

  if (!text) return "";

  switch (task) {
    case "tashkeel":
      return vocalizeArabicText(text);

    case "hamza":
      return standardizeOrthography(text).normalizedText;

    case "ocr-cleanup":
      return cleanOcrTranscript(text);

    case "punctuate":
      return autoPunctuateHeritageText(text);

    case "correct": {
      const ortho = standardizeOrthography(text);
      return autoPunctuateHeritageText(ortho.normalizedText);
    }

    case "takhrij-ayah": {
      const res = takhrijAyahNative(text);
      return `${res.formattedText}\n${res.citationNote}`;
    }

    case "takhrij-hadith": {
      const res = takhrijHadithNative(text);
      return `${res.formattedText}\n${res.citationNote}`;
    }

    case "index-names":
      return translateAndIndexNamesNative(text);

    case "collate": {
      const variant = body.variantText ?? body.instruction ?? "";
      if (!variant.trim()) {
        const ortho = standardizeOrthography(text);
        if (!ortho.corrections.length) return "لا فروق.";
        return ortho.corrections
          .map((c) => `في المتن: ${c.from} | القياس المحقق: ${c.to} | النوع: ${c.explanation}`)
          .join("\n");
      }
      const diffs = collateManuscriptTexts(text, variant, body.siglum ?? "ب");
      return formatCriticalApparatusBlock(diffs);
    }

    case "summarize": {
      const sentences = text
        .split(/[.!؟\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 15);
      const selected = sentences.slice(0, 4);
      const words = text.split(/\s+/).filter(Boolean);
      const roots = [...new Set(words.slice(0, 25).map((w) => analyzeMorphology(w).root).filter((r) => r && r !== "-"))].slice(0, 8);
      return [
        "• خلاصة المقطع التحقيقية:",
        ...selected.map((s) => `  - ${s}.`),
        `• البنية اللغوية: (${words.length} كلمة) | أبرز الجذور الدلالية: [${roots.join("، ")}].`,
      ].join("\n");
    }

    case "analyze-word": {
      const words = text.split(/\s+/).filter(Boolean);
      return words
        .slice(0, 10)
        .map((w, idx) => {
          const a = analyzeMorphology(w, idx > 0 ? words[idx - 1] : "");
          return `«${a.token}» ← الجذر: (${a.root}) | الوزن: (${a.pattern}) | القسم: ${a.pos} | الإعراب: ${a.syntacticRole}${a.lexicalNote ? ` | بيان: ${a.lexicalNote}` : ""}`;
        })
        .join("\n");
    }

    case "custom":
    default: {
      const instr = (body.instruction ?? "").trim();
      if (instr.includes("شكل") || instr.includes("ضبط")) return vocalizeArabicText(text);
      if (instr.includes("همز") || instr.includes("إملاء")) return standardizeOrthography(text).normalizedText;
      if (instr.includes("ترقيم") || instr.includes("فقر")) return autoPunctuateHeritageText(text);
      if (instr.includes("آية") || instr.includes("قرآن")) return takhrijAyahNative(text).citationNote;
      if (instr.includes("حديث") || instr.includes("أثر")) return takhrijHadithNative(text).citationNote;
      if (instr.includes("علم") || instr.includes("ترجم") || instr.includes("فهرس")) return translateAndIndexNamesNative(text);
      if (instr.includes("صرف") || instr.includes("إعراب") || instr.includes("جذر")) {
        return executeNativeManuscriptTask({ task: "analyze-word", text });
      }
      // المعالجة القياسية الشاملة
      const cleaned = cleanOcrTranscript(text);
      return autoPunctuateHeritageText(cleaned);
    }
  }
}

/**
 * مراجعة استكشافية للنص المحدد (Native Selection Review)
 * تستخرج اقتراحات التصحيح الإملائي وقراءات الرسم التراثي والتصحيفات المحتملة محلياً.
 */
export function reviewTextNatively(text: string): LocatedProposal[] {
  const proposals: ReviewProposal[] = [];
  const seenCounts = new Map<string, number>();

  const regex = /[\u0621-\u064A\u064B-\u0652]+/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const word = match[0];
    const occ = (seenCounts.get(word) ?? 0) + 1;
    seenCounts.set(word, occ);

    const clean = stripDiacritics(word);
    const ortho = standardizeOrthography(word);

    if (ortho.corrections.length > 0) {
      const corr = ortho.corrections[0]!;
      proposals.push({
        original: word,
        occurrence: occ,
        replacement: corr.to,
        alternatives: [word],
        kind: corr.rule === "archaic_spelling" ? "reading" : "spelling",
        reason: `${corr.explanation} (محرك الضبط الصرفي والقياسي المدمج).`,
      });
    } else if (HERITAGE_GLOSSARY[clean]) {
      const morph = analyzeMorphology(word);
      proposals.push({
        original: word,
        occurrence: occ,
        replacement: morph.vocalized,
        alternatives: [],
        kind: "reading",
        reason: HERITAGE_GLOSSARY[clean]!,
      });
    }

    if (proposals.length >= 12) break;
  }

  return locateProposals(text, proposals);
}

/**
 * محول الأنساق العلمية العالمية: تصدير المتن المحقق مع حواشيه إلى معيار TEI-XML العالمي للمخطوطات
 */
export function exportToTeiXml(title: string, bodyText: string, footnotes: Array<{ label: string; lane: string; text: string }>): string {
  const escapedTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paragraphs = bodyText
    .split(/\n+/)
    .filter((p) => p.trim())
    .map((p) => `        <p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
    .join("\n");

  const apparatus = footnotes
    .map(
      (n) =>
        `        <note n="${n.label}" type="${n.lane}">${n.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</note>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0" xml:lang="ar">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>${escapedTitle}</title>
        <respStmt>
          <resp>تحقيق وضبط عبر بيئة المُحَرِّر التراثية المتكاملة</resp>
          <name>محرك المُحَرِّر الحاسوبي</name>
        </respStmt>
      </titleStmt>
      <publicationStmt>
        <p>نشرة علمية محققة مصدرة وفق معيار TEI-XML العالمي للمخطوطات العربية</p>
      </publicationStmt>
      <sourceDesc>
        <msDesc>
          <msIdentifier>
            <repository>استوديو المُحَرِّر لتحقيق المخطوطات</repository>
          </msIdentifier>
        </msDesc>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <div type="edition" xml:lang="ar">
${paragraphs}
      </div>
      <div type="apparatus">
${apparatus}
      </div>
    </body>
  </text>
</TEI>`;
}

/**
 * محول النشر الأكاديمي المطبعي: تصدير المتن والحواشي المتعددة إلى شيفرة XeLaTeX / Polyglossia
 */
export function exportToCriticalLatex(title: string, bodyText: string, footnotes: Array<{ label: string; lane: string; text: string }>): string {
  const notesBlock = footnotes
    .map((n) => `\noindent\textbf{(${n.label})} [${n.lane}]: ${n.text}\\`)
    .join("\n");

  return `% نشرة علمية محققة مصدرة من منصة المُحَرِّر لتحقيق المخطوطات (XeLaTeX + Reledmac/Polyglossia)
\documentclass[14pt,a4paper]{extarticle}
\usepackage{fontspec}
\usepackage{polyglossia}
\setmainlanguage[numerals=mashriq]{arabic}
\newfontfamily\arabicfont[Script=Arabic,Scale=1.2]{Amiri}
\usepackage[margin=2.5cm]{geometry}
\usepackage{setspace}
\onehalfspacing

\title{\textbf{${title}}}
\author{نشرة محققة — بيئة المُحَرِّر التراثية}
\date{\today}

\begin{document}
\maketitle
\hrule
\vspace{1em}

\section*{المتن المحقق}
${bodyText}

\vspace{2em}
\hrule
\section*{جهاز التحقيق والحواشي النقدية}
${notesBlock || "لا توجد حواشٍ مسجلة."}

\end{document}`;
}
