// محرك المقابلة النقدية وتوليد جهاز التحقيق (Critical Collation & Apparatus Engine)
// يقابل النسخ الخطية بخوارزمية المحاذاة التسلسلية ويصنف الفروق (تصحيف، تحريف، سقط، زيادة، قلب مكاني).

import { normalizeArabic, stripDiacritics } from "./morphology";
import { isDotlessMatch, toRasmSkeleton } from "./script-normalizer";

export type ApparatusVariantType =
  | "tashif"        // تصحيف: اتحاد الرسم غير المنقوط واختلاف النقط
  | "tahrif"        // تحريف: تقارب الصورة الخطية مع اختلاف الرسم
  | "omission"      // سقط من النسخة الفرعية
  | "addition"      // زيادة في النسخة الفرعية
  | "transposition" // قلب مكاني (تقديم وتأخير)
  | "orthographic"  // خلاف رسم إملائي فقط
  | "substitution"; // إبدال لفظي كامل

export interface CollationVariant {
  id: string;
  baseReading: string;
  witnessReading: string;
  witnessSiglum: string;
  type: ApparatusVariantType;
  typeArabic: string;
  apparatusFootnote: string;
  similarityScore: number;
}

/** حساب مسافة التحرير الدلالية والخطية (Levenshtein Distance) */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      );
    }
  }
  return dp[m]![n]!;
}

/** تصنيف العلاقة بين قراءة الأصل وقراءة النسخة الفرعية وفق منهج تحقيق المخطوطات */
export function classifyPhilologicalDifference(
  baseWord: string,
  witnessWord: string,
  siglum: string
): Omit<CollationVariant, "id"> {
  const cleanBase = stripDiacritics(baseWord.trim());
  const cleanWit = stripDiacritics(witnessWord.trim());

  if (!cleanBase && cleanWit) {
    return {
      baseReading: "",
      witnessReading: witnessWord,
      witnessSiglum: siglum,
      type: "addition",
      typeArabic: "زيادة",
      apparatusFootnote: `في (${siglum}): زيادة «${witnessWord}».`,
      similarityScore: 0,
    };
  }

  if (cleanBase && !cleanWit) {
    return {
      baseReading: baseWord,
      witnessReading: "",
      witnessSiglum: siglum,
      type: "omission",
      typeArabic: "سقط",
      apparatusFootnote: `«${baseWord}»: سقط من (${siglum}).`,
      similarityScore: 0,
    };
  }

  const normBase = normalizeArabic(cleanBase);
  const normWit = normalizeArabic(cleanWit);

  if (normBase === normWit) {
    return {
      baseReading: baseWord,
      witnessReading: witnessWord,
      witnessSiglum: siglum,
      type: "orthographic",
      typeArabic: "اختلاف رسم/ضبط",
      apparatusFootnote: `في (${siglum}) برسم: «${witnessWord}».`,
      similarityScore: 0.95,
    };
  }

  // فحص التصحيف النقطي (اتحاد الهيكل الخطي غير المنقوط)
  if (isDotlessMatch(cleanBase, cleanWit)) {
    return {
      baseReading: baseWord,
      witnessReading: witnessWord,
      witnessSiglum: siglum,
      type: "tashif",
      typeArabic: "تصحيف نقطي",
      apparatusFootnote: `في (${siglum}): «${witnessWord}» وهو تصحيف، والصواب ما أثبتناه لتطابق رسمهما (${toRasmSkeleton(cleanBase)}).`,
      similarityScore: 0.85,
    };
  }

  // فحص التحريف الخطي (تقارب شديد في الرسم والهيكل)
  const rasmBase = toRasmSkeleton(cleanBase);
  const rasmWit = toRasmSkeleton(cleanWit);
  const dist = levenshteinDistance(rasmBase, rasmWit);
  const maxLen = Math.max(rasmBase.length, rasmWit.length, 1);
  const similarity = 1 - dist / maxLen;

  if (similarity >= 0.6) {
    return {
      baseReading: baseWord,
      witnessReading: witnessWord,
      witnessSiglum: siglum,
      type: "tahrif",
      typeArabic: "تحريف خطي",
      apparatusFootnote: `في (${siglum}): «${witnessWord}» (تحريف قريب في الرسم عن «${baseWord}»).`,
      similarityScore: Number(similarity.toFixed(2)),
    };
  }

  return {
    baseReading: baseWord,
    witnessReading: witnessWord,
    witnessSiglum: siglum,
    type: "substitution",
    typeArabic: "خلاف لفظي (إبدال)",
    apparatusFootnote: `في (${siglum}): «${witnessWord}» بدل «${baseWord}».`,
    similarityScore: Number(similarity.toFixed(2)),
  };
}

/** خوارزمية المقابلة الكاملة للنصوص واستخراج حواشي الفروق النقدية */
export function collateManuscriptTexts(
  baseText: string,
  witnessText: string,
  siglum = "ب"
): CollationVariant[] {
  const baseTokens = baseText.trim().split(/\s+/).filter(Boolean);
  const witTokens = witnessText.trim().split(/\s+/).filter(Boolean);

  // محاذاة تسلسلية دايناميكية (Needleman-Wunsch / Wagner-Fischer word-level alignment)
  const m = baseTokens.length;
  const n = witTokens.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const wA = normalizeArabic(baseTokens[i - 1]!);
      const wB = normalizeArabic(witTokens[j - 1]!);
      const cost = wA === wB ? 0 : isDotlessMatch(baseTokens[i - 1]!, witTokens[j - 1]!) ? 0.5 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      );
    }
  }

  // استرجاع المسار الأمثل للمحاذاة
  let i = m;
  let j = n;
  const variants: CollationVariant[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const bWord = baseTokens[i - 1]!;
      const wWord = witTokens[j - 1]!;
      const normA = normalizeArabic(bWord);
      const normB = normalizeArabic(wWord);
      const cost = normA === normB ? 0 : isDotlessMatch(bWord, wWord) ? 0.5 : 1;

      // فحص القلب المكاني (Transposition) بين كلمتين متجاورتين
      if (
        i >= 2 &&
        j >= 2 &&
        normalizeArabic(baseTokens[i - 1]!) === normalizeArabic(witTokens[j - 2]!) &&
        normalizeArabic(baseTokens[i - 2]!) === normalizeArabic(witTokens[j - 1]!) &&
        normA !== normB
      ) {
        const basePair = `${baseTokens[i - 2]} ${baseTokens[i - 1]}`;
        const witPair = `${witTokens[j - 2]} ${witTokens[j - 1]}`;
        variants.unshift({
          id: `col-${i}-${j}`,
          baseReading: basePair,
          witnessReading: witPair,
          witnessSiglum: siglum,
          type: "transposition",
          typeArabic: "قلب مكاني (تقديم وتأخير)",
          apparatusFootnote: `في (${siglum}): «${witPair}» بالتقديم والتأخير.`,
          similarityScore: 0.9,
        });
        i -= 2;
        j -= 2;
        continue;
      }

      if (Math.abs(dp[i]![j]! - (dp[i - 1]![j - 1]! + cost)) < 1e-6) {
        if (bWord !== wWord) {
          const info = classifyPhilologicalDifference(bWord, wWord, siglum);
          variants.unshift({ id: `col-${i}-${j}`, ...info });
        }
        i--;
        j--;
        continue;
      }
    }

    if (i > 0 && (j === 0 || dp[i]![j]! === dp[i - 1]![j]! + 1)) {
      const info = classifyPhilologicalDifference(baseTokens[i - 1]!, "", siglum);
      variants.unshift({ id: `col-${i}-${j}`, ...info });
      i--;
    } else if (j > 0) {
      const info = classifyPhilologicalDifference("", witTokens[j - 1]!, siglum);
      variants.unshift({ id: `col-${i}-${j}`, ...info });
      j--;
    }
  }

  return variants;
}

/** صياغة حاشية فروق النسخ المجمّعة بأسلوب المحققين */
export function formatCriticalApparatusBlock(variants: CollationVariant[]): string {
  if (!variants.length) return "لا فروق بين النسختين في هذا الموضع.";
  return variants
    .map((v, idx) => `(${idx + 1}) [${v.typeArabic}] ${v.apparatusFootnote}`)
    .join("\n");
}
