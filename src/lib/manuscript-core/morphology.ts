// محرك الصرف والاشتقاق والإعراب الخوارزمي المدمج (Native Morphological & Syntactic Engine)
// يعمل بالكامل داخل التطبيق دون أي اتصال خارجي أو نماذج سحابية.

export interface MorphologicalAnalysis {
  token: string;
  clean: string;
  normalized: string;
  prefixes: string[];
  stem: string;
  suffixes: string[];
  root: string;
  pattern: string;
  pos: "فعل" | "اسم" | "حرف" | "علم/مصطلح";
  syntacticRole: string;
  vocalized: string;
  lexicalNote?: string;
}

const PARTICLES: Record<string, { vocalized: string; role: string }> = {
  "من": { vocalized: "مِنْ", role: "حرف جر" },
  "الى": { vocalized: "إِلَى", role: "حرف جر" },
  "إلى": { vocalized: "إِلَى", role: "حرف جر" },
  "عن": { vocalized: "عَنْ", role: "حرف جر" },
  "على": { vocalized: "عَلَى", role: "حرف جر" },
  "في": { vocalized: "فِي", role: "حرف جر" },
  "رب": { vocalized: "رُبَّ", role: "حرف جر شبيه بالزائد" },
  "ان": { vocalized: "إِنَّ", role: "حرف توكيد ونصب" },
  "إن": { vocalized: "إِنَّ", role: "حرف توكيد ونصب" },
  "أن": { vocalized: "أَنْ", role: "حرف مصدري ونصب" },
  "كان": { vocalized: "كَانَ", role: "فعل ماض ناقص يرفع الاسم وينصب الخبر" },
  "كأن": { vocalized: "كَأَنَّ", role: "حرف تشبيه ونصب" },
  "لكن": { vocalized: "لَكِنَّ", role: "حرف استدراك ونصب" },
  "ليت": { vocalized: "لَيْتَ", role: "حرف تمنٍ ونصب" },
  "لعل": { vocalized: "لَعَلَّ", role: "حرف ترجٍ ونصب" },
  "لم": { vocalized: "لَمْ", role: "حرف نفي وجزم وقلب" },
  "لن": { vocalized: "لَنْ", role: "حرف نفي ونصب واستقبال" },
  "لا": { vocalized: "لَا", role: "حرف نفي" },
  "ما": { vocalized: "مَا", role: "حرف نفي / اسم موصول" },
  "قد": { vocalized: "قَدْ", role: "حرف تحقيق وتقريب" },
  "بل": { vocalized: "بَلْ", role: "حرف إضراب وعطف" },
  "ثم": { vocalized: "ثُمَّ", role: "حرف عطف للتراخي" },
  "أو": { vocalized: "أَوْ", role: "حرف عطف للتخيير أو التقسيم" },
  "بلح": { vocalized: "بَلْهَ", role: "اسم فعل أمر بمعنى دع" },
  "قال": { vocalized: "قَالَ", role: "فعل ماضٍ مبني على الفتح" },
  "حدثنا": { vocalized: "حَدَّثَنَا", role: "فعل ماضٍ وفاعل ومفعول به (صيغة أداء)" },
  "أخبرنا": { vocalized: "أَخْبَرَنَا", role: "فعل ماضٍ وفاعل ومفعول به (صيغة أداء)" },
  "اخبرنا": { vocalized: "أَخْبَرَنَا", role: "فعل ماضٍ وفاعل ومفعول به (صيغة أداء)" },
  "سمعت": { vocalized: "سَمِعْتُ", role: "فعل وفاعل (صيغة سماع)" },
  "روى": { vocalized: "رَوَى", role: "فعل ماضٍ مبني على الفتح المقدر" },
  "رحمه": { vocalized: "رَحِمَهُ", role: "فعل دعاء ومفعول به" },
  "رضي": { vocalized: "رَضِيَ", role: "فعل ماضٍ للدعاء" },
  "تعالى": { vocalized: "تَعَالَى", role: "فعل ماضٍ للتعظيم" },
  "صلى": { vocalized: "صَلَّى", role: "فعل ماضٍ للتصلية" },
  "وسلم": { vocalized: "وَسَلَّمَ", role: "حرف عطف وفعل ماضٍ" }
};

export const HERITAGE_GLOSSARY: Record<string, string> = {
  "السموت": "السَّمَوَات (رسم تراثي بحذف الألف الوسطى على عادة النساخ)",
  "الصلوة": "الصَّلَاة (رسم عثماني وتراثي بالواو بدل الألف)",
  "الزكوة": "الزَّكَاة (رسم تراثي بالواو)",
  "الحيوة": "الحَيَاة (رسم تراثي بالواو)",
  "ربوا": "رِبًا (رسم بالواو والألف الفارقة)",
  "هرون": "هَارُون (مقصور الألف في الرسم القديم)",
  "ابرهيم": "إِبْرَاهِيم (محذوف الألف في الرسم العتيق)",
  "اسمعيل": "إِسْمَاعِيل (محذوف الألف في الرسم العتيق)",
  "اسحق": "إِسْحَاق (محذوف الألف في الرسم العتيق)",
  "سليمن": "سُلَيْمَان (محذوف الألف في الرسم العتيق)",
  "عثمن": "عُثْمَان (محذوف الألف في الرسم العتيق)",
  "معويه": "مُعَاوِيَة (محذوف الألف ومبدل التاء هاءً)",
  "ثنا": "حَدَّثَنَا (رمز اصطلاحي عند محدثي المخطوطات)",
  "انا": "أَخْبَرَنَا / أَنْبَأَنَا (رمز اصطلاحي في أسانيد المخطوطات)",
  "نا": "حَدَّثَنَا / أَخْبَرَنَا (مختصر إسنادي)",
  "ح": "تَحْوِيلُ الإِسْنَادِ (رمز الفصل بين إسنادين عند المحدثين)",
  "اه": "انْتَهَى كَلَامُهُ (علامة انتهاء النقل في الحواشي والشروح)",
  "طره": "الطُّرَّة: الحاشية المكتوبة على هامش الرق أو الكاغد",
  "تعقيبه": "التَّعْقِيبَة: الكلمة المكتوبة أسفل اليسار لوصل الورقة بما بعدها",
  "تصحيف": "تَصْحِيف: تغيير في نقط الحروف المتشابهة رسماً (كباء وتاء وثاء)",
  "تحريف": "تَحْرِيف: تغيير في شكل الحرف وصورته الخطية",
  "خرم": "خَرْم: سقط مادي أو تلف في ورق المخطوطة",
  "طمس": "طَمْس: انمحاء الحبر أو تعذر قراءته بسبب الرطوبة أو الأرضة",
  "بياض": "بَيَاض: موضع تركه الناسخ فارغاً لعدم تبيّنه في أصله",
  "بلغ": "بَلَغَ: علامة يضعها الناسخ أو المقابل للدلالة على موضع انتهاء المقابلة"
};

const PREFIX_LIST = [
  "وكال", "وبال", "ولل", "فكال", "فبال", "فلل",
  "وال", "فال", "بال", "كال", "لل", "ال",
  "وس", "فس", "ول", "فل", "وب", "فب",
  "و", "ف", "ب", "ك", "ل", "س"
];

const SUFFIX_LIST = [
  "كموه", "هموه", "تموه", "تنا", "تما", "تن", "تم",
  "كما", "كم", "كن", "هما", "هم", "هن",
  "ان", "ين", "ون", "ات", "وا", "نا", "ني", "ها",
  "يه", "ية", "ه", "ة", "ي", "ك", "ت", "ا"
];

export function stripDiacritics(text: string): string {
  return text.replace(/[ً-ٰٟـ]/g, "");
}

export function normalizeArabic(text: string): string {
  return stripDiacritics(text)
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

function deducePatternAndRoot(stem: string): { root: string; pattern: string; pos: "فعل" | "اسم" } {
  const s = stripDiacritics(stem);
  const len = s.length;

  if (len === 3) {
    return { root: s, pattern: "فَعَلَ / فَعْل", pos: "اسم" };
  }
  if (len === 4) {
    if (s.startsWith("م")) return { root: s.slice(1), pattern: "مَفْعَل", pos: "اسم" };
    if (s.startsWith("ا") || s.startsWith("أ") || s.startsWith("إ")) return { root: s.slice(1), pattern: "أَفْعَلَ", pos: "فعل" };
    if (s[1] === "ا") return { root: s[0]! + s.slice(2), pattern: "فَاعِل", pos: "اسم" };
    if (s[2] === "و" || s[2] === "ي" || s[2] === "ا") return { root: s.slice(0, 2) + s[3]!, pattern: "فَعُول / فَعِيل", pos: "اسم" };
    if (/^[يتنأ]/.test(s)) return { root: s.slice(1), pattern: "يَفْعَلُ", pos: "فعل" };
    return { root: s.slice(0, 3), pattern: "فَعْلَلَ (رباعي)", pos: "اسم" };
  }
  if (len === 5) {
    if (s.startsWith("م") && s[3] === "و") return { root: s[1]! + s[2]! + s[4]!, pattern: "مَفْعُول", pos: "اسم" };
    if (s.startsWith("م") && s.startsWith("مت")) return { root: s.slice(2), pattern: "مُتَفَعِّل", pos: "اسم" };
    if (s.startsWith("م") && s[2] === "ت") return { root: s[1]! + s.slice(3), pattern: "مُفْتَعِل", pos: "اسم" };
    if (s.startsWith("ا") && s[2] === "ت") return { root: s[1]! + s.slice(3), pattern: "افْتَعَلَ", pos: "فعل" };
    if (s.startsWith("ا") && s.startsWith("ان")) return { root: s.slice(2), pattern: "انْفَعَلَ", pos: "فعل" };
    if (s.startsWith("ت") && s[2] === "ا") return { root: s[1]! + s.slice(3), pattern: "تَفَاعَلَ", pos: "فعل" };
    if (s.startsWith("ت")) return { root: s.slice(1, 4), pattern: "تَفَعَّلَ", pos: "فعل" };
  }
  if (len >= 6) {
    if (s.startsWith("است") || s.startsWith("إست")) {
      const r = s.slice(3, 6);
      return { root: r, pattern: "اسْتَفْعَلَ / اسْتِفْعَال", pos: "فعل" };
    }
    if (s.startsWith("مست")) {
      const r = s.slice(3, 6);
      return { root: r, pattern: "مُسْتَفْعِل", pos: "اسم" };
    }
  }

  // Fallback consonant extraction
  const consonants = s.replace(/[اويىأإآ]/g, "");
  const root = consonants.length >= 3 ? consonants.slice(0, 3) : s.slice(0, 3);
  return { root, pattern: "وزن قياسي", pos: "اسم" };
}

export function analyzeMorphology(rawToken: string, prevToken = ""): MorphologicalAnalysis {
  const clean = stripDiacritics(rawToken.replace(/[^ء-ي]/g, ""));
  const normalized = normalizeArabic(clean);

  if (!clean) {
    return {
      token: rawToken,
      clean: "",
      normalized: "",
      prefixes: [],
      stem: "",
      suffixes: [],
      root: "-",
      pattern: "-",
      pos: "حرف",
      syntacticRole: "علامة ترقيم",
      vocalized: rawToken,
    };
  }

  const direct = PARTICLES[clean] ?? PARTICLES[normalized];
  if (direct) {
    return {
      token: rawToken,
      clean,
      normalized,
      prefixes: [],
      stem: clean,
      suffixes: [],
      root: clean,
      pattern: "مبني",
      pos: direct.role.includes("فعل") ? "فعل" : "حرف",
      syntacticRole: direct.role,
      vocalized: direct.vocalized,
      lexicalNote: HERITAGE_GLOSSARY[clean] ?? HERITAGE_GLOSSARY[normalized],
    };
  }

  let stem = clean;
  const prefixes: string[] = [];
  const suffixes: string[] = [];

  for (const pre of PREFIX_LIST) {
    if (stem.length - pre.length >= 3 && stem.startsWith(pre)) {
      prefixes.push(pre);
      stem = stem.slice(pre.length);
      break;
    }
  }

  for (const suf of SUFFIX_LIST) {
    if (stem.length - suf.length >= 3 && stem.endsWith(suf)) {
      suffixes.push(suf);
      stem = stem.slice(0, -suf.length);
      break;
    }
  }

  const { root, pattern, pos } = deducePatternAndRoot(stem);
  const prevClean = stripDiacritics(prevToken.replace(/[^ء-ي]/g, ""));
  const isGenitiveContext =
    ["من", "إلى", "الى", "عن", "على", "في", "رب", "بين", "عند", "بعد", "قبل", "مع", "كل", "بعض", "ابن", "بن"].includes(prevClean) ||
    prefixes.some((p) => p.includes("ب") || p.includes("ل") || p.includes("ك"));
  const isAccusativeContext = ["إن", "ان", "أن", "كان", "كأن", "لعل", "ليت", "لكن", "لن"].includes(prevClean);
  const isJussiveContext = ["لم", "لما"].includes(prevClean);

  let syntacticRole = "مرفوع على الابتداء أو الفاعلية";
  let caseEnding = "ُ";

  if (pos === "فعل") {
    if (isJussiveContext) {
      syntacticRole = "فعل مضارع مجزوم";
      caseEnding = "ْ";
    } else if (isAccusativeContext) {
      syntacticRole = "فعل مضارع منصوب";
      caseEnding = "َ";
    } else if (/^[يتنأ]/.test(stem)) {
      syntacticRole = "فعل مضارع مرفوع";
      caseEnding = "ُ";
    } else {
      syntacticRole = "فعل ماضٍ مبني على الفتح";
      caseEnding = "َ";
    }
  } else {
    if (isGenitiveContext) {
      syntacticRole = "مجرور بحرف الجر أو بالإضافة وعلامة جره الكسرة";
      caseEnding = prefixes.some((p) => p.includes("ال")) || suffixes.length > 0 ? "ِ" : "ٍ";
    } else if (isAccusativeContext) {
      syntacticRole = "منصوب (اسم ناسخ أو مفعول به) وعلامة نصبه الفتحة";
      caseEnding = prefixes.some((p) => p.includes("ال")) || suffixes.length > 0 ? "َ" : "ً";
    } else {
      syntacticRole = "مرفوع وعلامة رفعه الضمة الظاهرة";
      caseEnding = prefixes.some((p) => p.includes("ال")) || suffixes.length > 0 ? "ُ" : "ٌ";
    }
  }

  // Construct vocalized word if not already vocalized
  const hasTashkeel = /[ً-ْ]/.test(rawToken);
  let vocalized = rawToken;
  if (!hasTashkeel && clean.length >= 2) {
    const core = clean;
    if (core.endsWith("ون") || core.endsWith("ين") || core.endsWith("ان") || core.endsWith("وا") || core.endsWith("ها") || core.endsWith("كم") || core.endsWith("هم")) {
      vocalized = rawToken;
    } else {
      vocalized = rawToken.replace(clean, clean + caseEnding);
    }
  }

  const lexicalNote =
    HERITAGE_GLOSSARY[clean] ??
    HERITAGE_GLOSSARY[normalized] ??
    HERITAGE_GLOSSARY[stem] ??
    `الجذر الصرفي: (${root.split("").join(" - ")}) | الوزن: ${pattern} | التحليل: ${syntacticRole}`;

  return {
    token: rawToken,
    clean,
    normalized,
    prefixes,
    stem,
    suffixes,
    root,
    pattern,
    pos,
    syntacticRole,
    vocalized,
    lexicalNote,
  };
}

/** تشكيل النص الكامل آلياً بناءً على السياق النحوي والصرفي المحلي */
export function vocalizeArabicText(text: string): string {
  const lines = text.split("\n");
  return lines
    .map((line) => {
      const tokens = line.split(/(\s+)/);
      let prevWord = "";
      return tokens
        .map((token) => {
          if (/^\s+$/.test(token) || !token) return token;
          const m = token.match(/^([^\u0621-\u064A\u064B-\u0652]*)([\u0621-\u064A\u064B-\u0652]+)([^\u0621-\u064A\u064B-\u0652]*)$/);
          if (!m) return token;
          const [, lead, word, trail] = m;
          const analysis = analyzeMorphology(word!, prevWord);
          prevWord = word!;
          return `${lead}${analysis.vocalized}${trail}`;
        })
        .join("");
    })
    .join("\n");
}
