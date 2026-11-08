// محول ومفسر الرسم الإملائي التاريخي ومصفوفة التصحيف والتحريف (Script Normalizer & Rasm Engine)
// يعالج الرسم العثماني، همزات القطع والوصل، والتشابه الخطي لغير المنقوط (Rasm Architype).

import { stripDiacritics } from "./morphology";

export interface OrthographicReport {
  original: string;
  normalizedText: string;
  rasmSkeleton: string;
  corrections: Array<{
    from: string;
    to: string;
    rule: "archaic_spelling" | "hamza" | "ya_alif" | "ta_ha" | "tashif_candidate";
    explanation: string;
  }>;
}

/** تحويل الحروف العربية إلى هيكلها الخطي غير المنقوط (الرسم المجرد / Rasm Skeleton) لكشف التصحيف */
const RASM_MAP: Record<string, string> = {
  "ب": "ٮ", "ت": "ٮ", "ث": "ٮ", "ن": "ں", "ي": "ى", "ئ": "ى",
  "ج": "ح", "ح": "ح", "خ": "ح",
  "د": "د", "ذ": "د",
  "ر": "ر", "ز": "ر",
  "س": "س", "ش": "س",
  "ص": "ص", "ض": "ص",
  "ط": "ط", "ظ": "ط",
  "ع": "ع", "غ": "ع",
  "ف": "ڡ", "ق": "ٯ",
  "ك": "ك", "ل": "ل", "م": "م",
  "ه": "ه", "ة": "ه",
  "و": "و", "ؤ": "و",
  "ا": "ا", "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ى"
};

export function toRasmSkeleton(word: string): string {
  const clean = stripDiacritics(word);
  return clean
    .split("")
    .map((ch) => RASM_MAP[ch] ?? ch)
    .join("");
}

/** فحص ما إذا كانت كلمتان متطابقتين في الرسم غير المنقوط (احتمال تصحيف نقطي مباشر) */
export function isDotlessMatch(wordA: string, wordB: string): boolean {
  const cleanA = stripDiacritics(wordA.trim());
  const cleanB = stripDiacritics(wordB.trim());
  if (!cleanA || !cleanB || cleanA === cleanB) return false;
  return toRasmSkeleton(cleanA) === toRasmSkeleton(cleanB);
}

const ARCHAIC_MAP: Record<string, { modern: string; desc: string }> = {
  "السموت": { modern: "السماوات", desc: "إثبات الألف المحذوفة في الرسم العتيق" },
  "سموت": { modern: "سماوات", desc: "إثبات الألف المحذوفة في الرسم العتيق" },
  "الصلوة": { modern: "الصلاة", desc: "رد الواو التراثية إلى ألف" },
  "صلوة": { modern: "صلاة", desc: "رد الواو التراثية إلى ألف" },
  "الزكوة": { modern: "الزكاة", desc: "رد الواو التراثية إلى ألف" },
  "زكوة": { modern: "زكاة", desc: "رد الواو التراثية إلى ألف" },
  "الحيوة": { modern: "الحياة", desc: "رد الواو التراثية إلى ألف" },
  "حيوة": { modern: "حياة", desc: "رد الواو التراثية إلى ألف" },
  "الربوا": { modern: "الربا", desc: "تقويم رسم الواو والألف الفارقة" },
  "هرون": { modern: "هارون", desc: "إثبات ألف العلم المحذوفة رسماً" },
  "ابرهيم": { modern: "إبراهيم", desc: "إثبات الألف والهمزة القياسية" },
  "اسمعيل": { modern: "إسماعيل", desc: "إثبات الألف والهمزة القياسية" },
  "اسحق": { modern: "إسحاق", desc: "إثبات الألف والهمزة القياسية" },
  "سليمن": { modern: "سليمان", desc: "إثبات الألف الوسطى القياسية" },
  "عثمن": { modern: "عثمان", desc: "إثبات الألف الوسطى القياسية" },
  "رحمن": { modern: "رحمان", desc: "رسم الألف الخنجرية" },
  "ملئكة": { modern: "ملائكة", desc: "رسم الهمزة على نبرة مع الألف" },
  "ملئكه": { modern: "ملائكة", desc: "تقويم الهمزة والتاء المربوطة" },
  "ثلث": { modern: "ثلاث", desc: "إثبات الألف في العدد" },
  "ثلثة": { modern: "ثلاثة", desc: "إثبات الألف في العدد" },
  "ثلثمائة": { modern: "ثلاثمائة", desc: "إثبات الألف في العدد" },
  "لاكن": { modern: "لكن", desc: "حذف الألف المزيدة على عادة بعض النساخ" },
  "هاذا": { modern: "هذا", desc: "حذف ألف التنبيه المثبتة خطأً في النسخ" },
  "هاذه": { modern: "هذه", desc: "حذف ألف التنبيه المثبتة خطأً في النسخ" },
  "ذالك": { modern: "ذلك", desc: "حذف الألف الوسطى على القياس الإملائي" }
};

const HAMZA_WORDS: Record<string, string> = {
  "انشاء": "إنشاء",
  "ايمان": "إيمان",
  "اسلام": "إسلام",
  "احسان": "إحسان",
  "اقبال": "إقبال",
  "اعلام": "إعلام",
  "اخراج": "إخراج",
  "اسناد": "إسناد",
  "اجماع": "إجماع",
  "اكرام": "إكرام",
  "امام": "إمام",
  "انسان": "إنسان",
  "الي": "إلى",
  "الا": "إلا",
  "اما": "أما",
  "اذا": "إذا",
  "اذ": "إذ",
  "احد": "أحد",
  "افضل": "أفضل",
  "اكثر": "أكثر",
  "اقرب": "أقرب",
  "اعلم": "أعلم",
  "اصحاب": "أصحاب",
  "اهل": "أهل",
  "أبن": "ابن",
  "إبن": "ابن",
  "أسم": "اسم",
  "إسم": "اسم",
  "أمرؤ": "امرؤ",
  "أمرأة": "امرأة",
  "شيء": "شيء",
  "شئ": "شيء",
  "دفئ": "دفء",
  "جزاءا": "جزاءً",
  "سماءا": "سماءً",
  "مسأله": "مسألة",
  "مسئله": "مسألة",
  "مائة": "مائة",
  "مئة": "مئة",
  "قائلا": "قائلاً",
  "رحمة": "رحمة"
};

/** معالجة وتوحيد الهمزات والألف المقصورة والتاء المربوطة وفق القياس التحقيقي */
export function standardizeOrthography(text: string): OrthographicReport {
  const corrections: OrthographicReport["corrections"] = [];

  const processed = text.replace(/[\u0621-\u064A\u064B-\u0652]+/g, (word) => {
    const clean = stripDiacritics(word);

    // 1. فحص الرسم التراثي القديم
    if (ARCHAIC_MAP[clean] && clean !== "رحمن") {
      const target = ARCHAIC_MAP[clean]!;
      corrections.push({
        from: word,
        to: target.modern,
        rule: "archaic_spelling",
        explanation: target.desc,
      });
      return target.modern;
    }

    // 2. فحص معجم الهمزات القياسي
    if (HAMZA_WORDS[clean]) {
      const fixed = HAMZA_WORDS[clean]!;
      if (fixed !== clean) {
        corrections.push({
          from: word,
          to: fixed,
          rule: "hamza",
          explanation: "ضبط همزة القطع والوصل والهمزة المتطرفة على القياس الإملائي",
        });
        return fixed;
      }
    }

    // 3. قاعدة همزة القطع في المصدر الرباعي (إفعال)
    if (/^افع[اأ]ل$/.test(clean) && !clean.startsWith("إ")) {
      const fixed = "إ" + word.slice(1);
      corrections.push({
        from: word,
        to: fixed,
        rule: "hamza",
        explanation: "مصدر الفعل الرباعي (إفعال) همزته همزة قطع مكسورة",
      });
      return fixed;
    }

    // 4. قاعدة صيغة أفعل التفضيل أو الجمع
    if (/^افعل$/.test(clean) && !clean.startsWith("أ")) {
      const fixed = "أ" + word.slice(1);
      corrections.push({
        from: word,
        to: fixed,
        rule: "hamza",
        explanation: "وزن (أفعل) همزته همزة قطع مفتوحة",
      });
      return fixed;
    }

    // 5. تصحيح خلط الياء والألف المقصورة في الأواخر المشهورة
    if (["علي", "الي", "حتي", "متي", "لدي", "بلي", "عسي", "موسي", "عيسي", "يحى", "مصطفي", "مستشفي", "فتوي", "تقوي", "دعوي", "معني", "مبني", "مغني"].includes(clean)) {
      const fixed = word.slice(0, -1) + "ى";
      corrections.push({
        from: word,
        to: fixed,
        rule: "ya_alif",
        explanation: "الألف المقصورة المتطرفة ترسم غير منقوطة (ى)",
      });
      return fixed;
    }

    if (["فى", "لأبى", "أبى", "التى", "الذى", "الراضى", "القاضى", "المعانى", "الجوارى"].includes(clean)) {
      const fixed = word.slice(0, -1) + "ي";
      corrections.push({
        from: word,
        to: fixed,
        rule: "ya_alif",
        explanation: "الياء المنقوطة في آخر الحرف أو الاسم المنقوص",
      });
      return fixed;
    }

    return word;
  });

  return {
    original: text,
    normalizedText: processed,
    rasmSkeleton: toRasmSkeleton(text),
    corrections,
  };
}

/** تنقية نص النسخ الضوئي (OCR Cleanup) من الشوائب والتقطيعات العشوائية */
export function cleanOcrTranscript(text: string): string {
  let cleaned = text
    // إزالة التطويل الزائد والرموز الغريبة
    .replace(/ـ+/g, "")
    .replace(/[|~^`@#$%^&*_+=<>]/g, "")
    // دمج الأسطر المقطوعة داخل الفقرة الواحدة (إذا لم تنتهِ بنقطة أو علامة وقف)
    .replace(/([^.،؛:!؟\n])\n(?=\s*[\u0621-\u064A])/g, "$1 ")
    // إزالة تكرار المسافات
    .replace(/[ \t]{2,}/g, " ")
    // إصلاح المسافات قبل علامات الترقيم
    .replace(/\s+([،؛.؟!:»)\]])/g, "$1")
    .replace(/([«(\[])\s+/g, "$1");

  return standardizeOrthography(cleaned).normalizedText.trim();
}

/** الترقيم الآلي وتقسيم الجمل التراثية وإحاطة الآيات والأحاديث */
export function autoPunctuateHeritageText(text: string): string {
  let result = text.trim();

  // إحاطة عبارات التصلية والترضي والرحمة بشرطتين أو تنسيق مناسب
  result = result
    .replace(/\b(قال الله تعالى|قال تعالى|لقوله تعالى)\s*:?\s*"?([^".،؛\n]+)"?/g, "$1: ﴿$2﴾")
    .replace(/\b(قال رسول الله صلى الله عليه وسلم|قال النبي صلى الله عليه وسلم)\s*:?\s*"?([^".\n]+)"?/g, "$1: «$2»")
    .replace(/\b(حدثنا|أخبرنا|أنبأنا|سمعت)\b/g, (m, offset) => (offset > 0 ? `، ${m}` : m))
    .replace(/\b(قال|قلت|قلنا|قيل)\s+(?!الله|رسول|النبي|تعالى)/g, "$1: ")
    .replace(/(\s+)(لأن|وذلك أن|فإن|إذ إن|حيث إن)(\s+)/g, "؛ $2$3")
    .replace(/:\s*:/g, ":")
    .replace(/،\s*،/g, "،");

  if (!/[.؟!﴾»]$/.test(result)) {
    result += ".";
  }

  return result;
}
