import { z } from "zod";
// src/lib/manuscript-core/morphology.ts
var PARTICLES = {
	"من": {
		vocalized: "مِنْ",
		role: "حرف جر"
	},
	"الى": {
		vocalized: "إِلَى",
		role: "حرف جر"
	},
	"إلى": {
		vocalized: "إِلَى",
		role: "حرف جر"
	},
	"عن": {
		vocalized: "عَنْ",
		role: "حرف جر"
	},
	"على": {
		vocalized: "عَلَى",
		role: "حرف جر"
	},
	"في": {
		vocalized: "فِي",
		role: "حرف جر"
	},
	"رب": {
		vocalized: "رُبَّ",
		role: "حرف جر شبيه بالزائد"
	},
	"ان": {
		vocalized: "إِنَّ",
		role: "حرف توكيد ونصب"
	},
	"إن": {
		vocalized: "إِنَّ",
		role: "حرف توكيد ونصب"
	},
	"أن": {
		vocalized: "أَنْ",
		role: "حرف مصدري ونصب"
	},
	"كان": {
		vocalized: "كَانَ",
		role: "فعل ماض ناقص يرفع الاسم وينصب الخبر"
	},
	"كأن": {
		vocalized: "كَأَنَّ",
		role: "حرف تشبيه ونصب"
	},
	"لكن": {
		vocalized: "لَكِنَّ",
		role: "حرف استدراك ونصب"
	},
	"ليت": {
		vocalized: "لَيْتَ",
		role: "حرف تمنٍ ونصب"
	},
	"لعل": {
		vocalized: "لَعَلَّ",
		role: "حرف ترجٍ ونصب"
	},
	"لم": {
		vocalized: "لَمْ",
		role: "حرف نفي وجزم وقلب"
	},
	"لن": {
		vocalized: "لَنْ",
		role: "حرف نفي ونصب واستقبال"
	},
	"لا": {
		vocalized: "لَا",
		role: "حرف نفي"
	},
	"ما": {
		vocalized: "مَا",
		role: "حرف نفي / اسم موصول"
	},
	"قد": {
		vocalized: "قَدْ",
		role: "حرف تحقيق وتقريب"
	},
	"بل": {
		vocalized: "بَلْ",
		role: "حرف إضراب وعطف"
	},
	"ثم": {
		vocalized: "ثُمَّ",
		role: "حرف عطف للتراخي"
	},
	"أو": {
		vocalized: "أَوْ",
		role: "حرف عطف للتخيير أو التقسيم"
	},
	"بلح": {
		vocalized: "بَلْهَ",
		role: "اسم فعل أمر بمعنى دع"
	},
	"قال": {
		vocalized: "قَالَ",
		role: "فعل ماضٍ مبني على الفتح"
	},
	"حدثنا": {
		vocalized: "حَدَّثَنَا",
		role: "فعل ماضٍ وفاعل ومفعول به (صيغة أداء)"
	},
	"أخبرنا": {
		vocalized: "أَخْبَرَنَا",
		role: "فعل ماضٍ وفاعل ومفعول به (صيغة أداء)"
	},
	"اخبرنا": {
		vocalized: "أَخْبَرَنَا",
		role: "فعل ماضٍ وفاعل ومفعول به (صيغة أداء)"
	},
	"سمعت": {
		vocalized: "سَمِعْتُ",
		role: "فعل وفاعل (صيغة سماع)"
	},
	"روى": {
		vocalized: "رَوَى",
		role: "فعل ماضٍ مبني على الفتح المقدر"
	},
	"رحمه": {
		vocalized: "رَحِمَهُ",
		role: "فعل دعاء ومفعول به"
	},
	"رضي": {
		vocalized: "رَضِيَ",
		role: "فعل ماضٍ للدعاء"
	},
	"تعالى": {
		vocalized: "تَعَالَى",
		role: "فعل ماضٍ للتعظيم"
	},
	"صلى": {
		vocalized: "صَلَّى",
		role: "فعل ماضٍ للتصلية"
	},
	"وسلم": {
		vocalized: "وَسَلَّمَ",
		role: "حرف عطف وفعل ماضٍ"
	}
};
var HERITAGE_GLOSSARY = {
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
var PREFIX_LIST = [
	"وكال",
	"وبال",
	"ولل",
	"فكال",
	"فبال",
	"فلل",
	"وال",
	"فال",
	"بال",
	"كال",
	"لل",
	"ال",
	"وس",
	"فس",
	"ول",
	"فل",
	"وب",
	"فب",
	"و",
	"ف",
	"ب",
	"ك",
	"ل",
	"س"
];
var SUFFIX_LIST = [
	"كموه",
	"هموه",
	"تموه",
	"تنا",
	"تما",
	"تن",
	"تم",
	"كما",
	"كم",
	"كن",
	"هما",
	"هم",
	"هن",
	"ان",
	"ين",
	"ون",
	"ات",
	"وا",
	"نا",
	"ني",
	"ها",
	"يه",
	"ية",
	"ه",
	"ة",
	"ي",
	"ك",
	"ت",
	"ا"
];
function stripDiacritics(text) {
	return text.replace(/[ً-ٰٟـ]/g, "");
}
function normalizeArabic(text) {
	return stripDiacritics(text).replace(/[إأآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي");
}
function deducePatternAndRoot(stem) {
	const s = stripDiacritics(stem);
	const len = s.length;
	if (len === 3) return {
		root: s,
		pattern: "فَعَلَ / فَعْل",
		pos: "اسم"
	};
	if (len === 4) {
		if (s.startsWith("م")) return {
			root: s.slice(1),
			pattern: "مَفْعَل",
			pos: "اسم"
		};
		if (s.startsWith("ا") || s.startsWith("أ") || s.startsWith("إ")) return {
			root: s.slice(1),
			pattern: "أَفْعَلَ",
			pos: "فعل"
		};
		if (s[1] === "ا") return {
			root: s[0] + s.slice(2),
			pattern: "فَاعِل",
			pos: "اسم"
		};
		if (s[2] === "و" || s[2] === "ي" || s[2] === "ا") return {
			root: s.slice(0, 2) + s[3],
			pattern: "فَعُول / فَعِيل",
			pos: "اسم"
		};
		if (/^[يتنأ]/.test(s)) return {
			root: s.slice(1),
			pattern: "يَفْعَلُ",
			pos: "فعل"
		};
		return {
			root: s.slice(0, 3),
			pattern: "فَعْلَلَ (رباعي)",
			pos: "اسم"
		};
	}
	if (len === 5) {
		if (s.startsWith("م") && s[3] === "و") return {
			root: s[1] + s[2] + s[4],
			pattern: "مَفْعُول",
			pos: "اسم"
		};
		if (s.startsWith("م") && s.startsWith("مت")) return {
			root: s.slice(2),
			pattern: "مُتَفَعِّل",
			pos: "اسم"
		};
		if (s.startsWith("م") && s[2] === "ت") return {
			root: s[1] + s.slice(3),
			pattern: "مُفْتَعِل",
			pos: "اسم"
		};
		if (s.startsWith("ا") && s[2] === "ت") return {
			root: s[1] + s.slice(3),
			pattern: "افْتَعَلَ",
			pos: "فعل"
		};
		if (s.startsWith("ا") && s.startsWith("ان")) return {
			root: s.slice(2),
			pattern: "انْفَعَلَ",
			pos: "فعل"
		};
		if (s.startsWith("ت") && s[2] === "ا") return {
			root: s[1] + s.slice(3),
			pattern: "تَفَاعَلَ",
			pos: "فعل"
		};
		if (s.startsWith("ت")) return {
			root: s.slice(1, 4),
			pattern: "تَفَعَّلَ",
			pos: "فعل"
		};
	}
	if (len >= 6) {
		if (s.startsWith("است") || s.startsWith("إست")) return {
			root: s.slice(3, 6),
			pattern: "اسْتَفْعَلَ / اسْتِفْعَال",
			pos: "فعل"
		};
		if (s.startsWith("مست")) return {
			root: s.slice(3, 6),
			pattern: "مُسْتَفْعِل",
			pos: "اسم"
		};
	}
	const consonants = s.replace(/[اويىأإآ]/g, "");
	return {
		root: consonants.length >= 3 ? consonants.slice(0, 3) : s.slice(0, 3),
		pattern: "وزن قياسي",
		pos: "اسم"
	};
}
function analyzeMorphology(rawToken, prevToken = "") {
	const clean = stripDiacritics(rawToken.replace(/[^ء-ي]/g, ""));
	const normalized = normalizeArabic(clean);
	if (!clean) return {
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
		vocalized: rawToken
	};
	const direct = PARTICLES[clean] ?? PARTICLES[normalized];
	if (direct) return {
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
		lexicalNote: HERITAGE_GLOSSARY[clean] ?? HERITAGE_GLOSSARY[normalized]
	};
	let stem = clean;
	const prefixes = [];
	const suffixes = [];
	for (const pre of PREFIX_LIST) if (stem.length - pre.length >= 3 && stem.startsWith(pre)) {
		prefixes.push(pre);
		stem = stem.slice(pre.length);
		break;
	}
	for (const suf of SUFFIX_LIST) if (stem.length - suf.length >= 3 && stem.endsWith(suf)) {
		suffixes.push(suf);
		stem = stem.slice(0, -suf.length);
		break;
	}
	const { root, pattern, pos } = deducePatternAndRoot(stem);
	const prevClean = stripDiacritics(prevToken.replace(/[^ء-ي]/g, ""));
	const isGenitiveContext = [
		"من",
		"إلى",
		"الى",
		"عن",
		"على",
		"في",
		"رب",
		"بين",
		"عند",
		"بعد",
		"قبل",
		"مع",
		"كل",
		"بعض",
		"ابن",
		"بن"
	].includes(prevClean) || prefixes.some((p) => p.includes("ب") || p.includes("ل") || p.includes("ك"));
	const isAccusativeContext = [
		"إن",
		"ان",
		"أن",
		"كان",
		"كأن",
		"لعل",
		"ليت",
		"لكن",
		"لن"
	].includes(prevClean);
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
	} else if (isGenitiveContext) {
		syntacticRole = "مجرور بحرف الجر أو بالإضافة وعلامة جره الكسرة";
		caseEnding = prefixes.some((p) => p.includes("ال")) || suffixes.length > 0 ? "ِ" : "ٍ";
	} else if (isAccusativeContext) {
		syntacticRole = "منصوب (اسم ناسخ أو مفعول به) وعلامة نصبه الفتحة";
		caseEnding = prefixes.some((p) => p.includes("ال")) || suffixes.length > 0 ? "َ" : "ً";
	} else {
		syntacticRole = "مرفوع وعلامة رفعه الضمة الظاهرة";
		caseEnding = prefixes.some((p) => p.includes("ال")) || suffixes.length > 0 ? "ُ" : "ٌ";
	}
	const hasTashkeel = /[ً-ْ]/.test(rawToken);
	let vocalized = rawToken;
	if (!hasTashkeel && clean.length >= 2) {
		const core = clean;
		if (core.endsWith("ون") || core.endsWith("ين") || core.endsWith("ان") || core.endsWith("وا") || core.endsWith("ها") || core.endsWith("كم") || core.endsWith("هم")) vocalized = rawToken;
		else vocalized = rawToken.replace(clean, clean + caseEnding);
	}
	const lexicalNote = HERITAGE_GLOSSARY[clean] ?? HERITAGE_GLOSSARY[normalized] ?? HERITAGE_GLOSSARY[stem] ?? `الجذر الصرفي: (${root.split("").join(" - ")}) | الوزن: ${pattern} | التحليل: ${syntacticRole}`;
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
		lexicalNote
	};
}
/** تشكيل النص الكامل آلياً بناءً على السياق النحوي والصرفي المحلي */
function vocalizeArabicText(text) {
	return text.split("\n").map((line) => {
		const tokens = line.split(/(\s+)/);
		let prevWord = "";
		return tokens.map((token) => {
			if (/^\s+$/.test(token) || !token) return token;
			const m = token.match(/^([^\u0621-\u064A\u064B-\u0652]*)([\u0621-\u064A\u064B-\u0652]+)([^\u0621-\u064A\u064B-\u0652]*)$/);
			if (!m) return token;
			const [, lead, word, trail] = m;
			const analysis = analyzeMorphology(word, prevWord);
			prevWord = word;
			return `${lead}${analysis.vocalized}${trail}`;
		}).join("");
	}).join("\n");
}
// src/lib/manuscript-core/script-normalizer.ts
/** تحويل الحروف العربية إلى هيكلها الخطي غير المنقوط (الرسم المجرد / Rasm Skeleton) لكشف التصحيف */
var RASM_MAP = {
	"ب": "ٮ",
	"ت": "ٮ",
	"ث": "ٮ",
	"ن": "ں",
	"ي": "ى",
	"ئ": "ى",
	"ج": "ح",
	"ح": "ح",
	"خ": "ح",
	"د": "د",
	"ذ": "د",
	"ر": "ر",
	"ز": "ر",
	"س": "س",
	"ش": "س",
	"ص": "ص",
	"ض": "ص",
	"ط": "ط",
	"ظ": "ط",
	"ع": "ع",
	"غ": "ع",
	"ف": "ڡ",
	"ق": "ٯ",
	"ك": "ك",
	"ل": "ل",
	"م": "م",
	"ه": "ه",
	"ة": "ه",
	"و": "و",
	"ؤ": "و",
	"ا": "ا",
	"أ": "ا",
	"إ": "ا",
	"آ": "ا",
	"ٱ": "ا",
	"ى": "ى"
};
function toRasmSkeleton(word) {
	return stripDiacritics(word).split("").map((ch) => RASM_MAP[ch] ?? ch).join("");
}
/** فحص ما إذا كانت كلمتان متطابقتين في الرسم غير المنقوط (احتمال تصحيف نقطي مباشر) */
function isDotlessMatch(wordA, wordB) {
	const cleanA = stripDiacritics(wordA.trim());
	const cleanB = stripDiacritics(wordB.trim());
	if (!cleanA || !cleanB || cleanA === cleanB) return false;
	return toRasmSkeleton(cleanA) === toRasmSkeleton(cleanB);
}
var ARCHAIC_MAP = {
	"السموت": {
		modern: "السماوات",
		desc: "إثبات الألف المحذوفة في الرسم العتيق"
	},
	"سموت": {
		modern: "سماوات",
		desc: "إثبات الألف المحذوفة في الرسم العتيق"
	},
	"الصلوة": {
		modern: "الصلاة",
		desc: "رد الواو التراثية إلى ألف"
	},
	"صلوة": {
		modern: "صلاة",
		desc: "رد الواو التراثية إلى ألف"
	},
	"الزكوة": {
		modern: "الزكاة",
		desc: "رد الواو التراثية إلى ألف"
	},
	"زكوة": {
		modern: "زكاة",
		desc: "رد الواو التراثية إلى ألف"
	},
	"الحيوة": {
		modern: "الحياة",
		desc: "رد الواو التراثية إلى ألف"
	},
	"حيوة": {
		modern: "حياة",
		desc: "رد الواو التراثية إلى ألف"
	},
	"الربوا": {
		modern: "الربا",
		desc: "تقويم رسم الواو والألف الفارقة"
	},
	"هرون": {
		modern: "هارون",
		desc: "إثبات ألف العلم المحذوفة رسماً"
	},
	"ابرهيم": {
		modern: "إبراهيم",
		desc: "إثبات الألف والهمزة القياسية"
	},
	"اسمعيل": {
		modern: "إسماعيل",
		desc: "إثبات الألف والهمزة القياسية"
	},
	"اسحق": {
		modern: "إسحاق",
		desc: "إثبات الألف والهمزة القياسية"
	},
	"سليمن": {
		modern: "سليمان",
		desc: "إثبات الألف الوسطى القياسية"
	},
	"عثمن": {
		modern: "عثمان",
		desc: "إثبات الألف الوسطى القياسية"
	},
	"رحمن": {
		modern: "رحمان",
		desc: "رسم الألف الخنجرية"
	},
	"ملئكة": {
		modern: "ملائكة",
		desc: "رسم الهمزة على نبرة مع الألف"
	},
	"ملئكه": {
		modern: "ملائكة",
		desc: "تقويم الهمزة والتاء المربوطة"
	},
	"ثلث": {
		modern: "ثلاث",
		desc: "إثبات الألف في العدد"
	},
	"ثلثة": {
		modern: "ثلاثة",
		desc: "إثبات الألف في العدد"
	},
	"ثلثمائة": {
		modern: "ثلاثمائة",
		desc: "إثبات الألف في العدد"
	},
	"لاكن": {
		modern: "لكن",
		desc: "حذف الألف المزيدة على عادة بعض النساخ"
	},
	"هاذا": {
		modern: "هذا",
		desc: "حذف ألف التنبيه المثبتة خطأً في النسخ"
	},
	"هاذه": {
		modern: "هذه",
		desc: "حذف ألف التنبيه المثبتة خطأً في النسخ"
	},
	"ذالك": {
		modern: "ذلك",
		desc: "حذف الألف الوسطى على القياس الإملائي"
	}
};
var HAMZA_WORDS = {
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
function standardizeOrthography(text) {
	const corrections = [];
	return {
		original: text,
		normalizedText: text.replace(/[\u0621-\u064A\u064B-\u0652]+/g, (word) => {
			const clean = stripDiacritics(word);
			if (ARCHAIC_MAP[clean] && clean !== "رحمن") {
				const target = ARCHAIC_MAP[clean];
				corrections.push({
					from: word,
					to: target.modern,
					rule: "archaic_spelling",
					explanation: target.desc
				});
				return target.modern;
			}
			if (HAMZA_WORDS[clean]) {
				const fixed = HAMZA_WORDS[clean];
				if (fixed !== clean) {
					corrections.push({
						from: word,
						to: fixed,
						rule: "hamza",
						explanation: "ضبط همزة القطع والوصل والهمزة المتطرفة على القياس الإملائي"
					});
					return fixed;
				}
			}
			if (/^افع[اأ]ل$/.test(clean) && !clean.startsWith("إ")) {
				const fixed = "إ" + word.slice(1);
				corrections.push({
					from: word,
					to: fixed,
					rule: "hamza",
					explanation: "مصدر الفعل الرباعي (إفعال) همزته همزة قطع مكسورة"
				});
				return fixed;
			}
			if (/^افعل$/.test(clean) && !clean.startsWith("أ")) {
				const fixed = "أ" + word.slice(1);
				corrections.push({
					from: word,
					to: fixed,
					rule: "hamza",
					explanation: "وزن (أفعل) همزته همزة قطع مفتوحة"
				});
				return fixed;
			}
			if ([
				"علي",
				"الي",
				"حتي",
				"متي",
				"لدي",
				"بلي",
				"عسي",
				"موسي",
				"عيسي",
				"يحى",
				"مصطفي",
				"مستشفي",
				"فتوي",
				"تقوي",
				"دعوي",
				"معني",
				"مبني",
				"مغني"
			].includes(clean)) {
				const fixed = word.slice(0, -1) + "ى";
				corrections.push({
					from: word,
					to: fixed,
					rule: "ya_alif",
					explanation: "الألف المقصورة المتطرفة ترسم غير منقوطة (ى)"
				});
				return fixed;
			}
			if ([
				"فى",
				"لأبى",
				"أبى",
				"التى",
				"الذى",
				"الراضى",
				"القاضى",
				"المعانى",
				"الجوارى"
			].includes(clean)) {
				const fixed = word.slice(0, -1) + "ي";
				corrections.push({
					from: word,
					to: fixed,
					rule: "ya_alif",
					explanation: "الياء المنقوطة في آخر الحرف أو الاسم المنقوص"
				});
				return fixed;
			}
			return word;
		}),
		rasmSkeleton: toRasmSkeleton(text),
		corrections
	};
}
/** تنقية نص النسخ الضوئي (OCR Cleanup) من الشوائب والتقطيعات العشوائية */
function cleanOcrTranscript(text) {
	return standardizeOrthography(text.replace(/ـ+/g, "").replace(/[|~^`@#$%^&*_+=<>]/g, "").replace(/([^.،؛:!؟\n])\n(?=\s*[\u0621-\u064A])/g, "$1 ").replace(/[ \t]{2,}/g, " ").replace(/\s+([،؛.؟!:»)\]])/g, "$1").replace(/([«(\[])\s+/g, "$1")).normalizedText.trim();
}
/** الترقيم الآلي وتقسيم الجمل التراثية وإحاطة الآيات والأحاديث */
function autoPunctuateHeritageText(text) {
	let result = text.trim();
	result = result.replace(/\b(قال الله تعالى|قال تعالى|لقوله تعالى)\s*:?\s*"?([^".،؛\n]+)"?/g, "$1: ﴿$2﴾").replace(/\b(قال رسول الله صلى الله عليه وسلم|قال النبي صلى الله عليه وسلم)\s*:?\s*"?([^".\n]+)"?/g, "$1: «$2»").replace(/\b(حدثنا|أخبرنا|أنبأنا|سمعت)\b/g, (m, offset) => offset > 0 ? `، ${m}` : m).replace(/\b(قال|قلت|قلنا|قيل)\s+(?!الله|رسول|النبي|تعالى)/g, "$1: ").replace(/(\s+)(لأن|وذلك أن|فإن|إذ إن|حيث إن)(\s+)/g, "؛ $2$3").replace(/:\s*:/g, ":").replace(/،\s*،/g, "،");
	if (!/[.؟!﴾»]$/.test(result)) result += ".";
	return result;
}
// src/lib/manuscript-core/critical-collation.ts
/** حساب مسافة التحرير الدلالية والخطية (Levenshtein Distance) */
function levenshteinDistance(a, b) {
	const m = a.length;
	const n = b.length;
	const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;
	for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
		const cost = a[i - 1] === b[j - 1] ? 0 : 1;
		dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
	}
	return dp[m][n];
}
/** تصنيف العلاقة بين قراءة الأصل وقراءة النسخة الفرعية وفق منهج تحقيق المخطوطات */
function classifyPhilologicalDifference(baseWord, witnessWord, siglum) {
	const cleanBase = stripDiacritics(baseWord.trim());
	const cleanWit = stripDiacritics(witnessWord.trim());
	if (!cleanBase && cleanWit) return {
		baseReading: "",
		witnessReading: witnessWord,
		witnessSiglum: siglum,
		type: "addition",
		typeArabic: "زيادة",
		apparatusFootnote: `في (${siglum}): زيادة «${witnessWord}».`,
		similarityScore: 0
	};
	if (cleanBase && !cleanWit) return {
		baseReading: baseWord,
		witnessReading: "",
		witnessSiglum: siglum,
		type: "omission",
		typeArabic: "سقط",
		apparatusFootnote: `«${baseWord}»: سقط من (${siglum}).`,
		similarityScore: 0
	};
	if (normalizeArabic(cleanBase) === normalizeArabic(cleanWit)) return {
		baseReading: baseWord,
		witnessReading: witnessWord,
		witnessSiglum: siglum,
		type: "orthographic",
		typeArabic: "اختلاف رسم/ضبط",
		apparatusFootnote: `في (${siglum}) برسم: «${witnessWord}».`,
		similarityScore: .95
	};
	if (isDotlessMatch(cleanBase, cleanWit)) return {
		baseReading: baseWord,
		witnessReading: witnessWord,
		witnessSiglum: siglum,
		type: "tashif",
		typeArabic: "تصحيف نقطي",
		apparatusFootnote: `في (${siglum}): «${witnessWord}» وهو تصحيف، والصواب ما أثبتناه لتطابق رسمهما (${toRasmSkeleton(cleanBase)}).`,
		similarityScore: .85
	};
	const rasmBase = toRasmSkeleton(cleanBase);
	const rasmWit = toRasmSkeleton(cleanWit);
	const similarity = 1 - levenshteinDistance(rasmBase, rasmWit) / Math.max(rasmBase.length, rasmWit.length, 1);
	if (similarity >= .6) return {
		baseReading: baseWord,
		witnessReading: witnessWord,
		witnessSiglum: siglum,
		type: "tahrif",
		typeArabic: "تحريف خطي",
		apparatusFootnote: `في (${siglum}): «${witnessWord}» (تحريف قريب في الرسم عن «${baseWord}»).`,
		similarityScore: Number(similarity.toFixed(2))
	};
	return {
		baseReading: baseWord,
		witnessReading: witnessWord,
		witnessSiglum: siglum,
		type: "substitution",
		typeArabic: "خلاف لفظي (إبدال)",
		apparatusFootnote: `في (${siglum}): «${witnessWord}» بدل «${baseWord}».`,
		similarityScore: Number(similarity.toFixed(2))
	};
}
/** خوارزمية المقابلة الكاملة للنصوص واستخراج حواشي الفروق النقدية */
function collateManuscriptTexts(baseText, witnessText, siglum = "ب") {
	const baseTokens = baseText.trim().split(/\s+/).filter(Boolean);
	const witTokens = witnessText.trim().split(/\s+/).filter(Boolean);
	const m = baseTokens.length;
	const n = witTokens.length;
	const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;
	for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
		const cost = normalizeArabic(baseTokens[i - 1]) === normalizeArabic(witTokens[j - 1]) ? 0 : isDotlessMatch(baseTokens[i - 1], witTokens[j - 1]) ? .5 : 1;
		dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
	}
	let i = m;
	let j = n;
	const variants = [];
	while (i > 0 || j > 0) {
		if (i > 0 && j > 0) {
			const bWord = baseTokens[i - 1];
			const wWord = witTokens[j - 1];
			const normA = normalizeArabic(bWord);
			const normB = normalizeArabic(wWord);
			const cost = normA === normB ? 0 : isDotlessMatch(bWord, wWord) ? .5 : 1;
			if (i >= 2 && j >= 2 && normalizeArabic(baseTokens[i - 1]) === normalizeArabic(witTokens[j - 2]) && normalizeArabic(baseTokens[i - 2]) === normalizeArabic(witTokens[j - 1]) && normA !== normB) {
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
					similarityScore: .9
				});
				i -= 2;
				j -= 2;
				continue;
			}
			if (Math.abs(dp[i][j] - (dp[i - 1][j - 1] + cost)) < 1e-6) {
				if (bWord !== wWord) {
					const info = classifyPhilologicalDifference(bWord, wWord, siglum);
					variants.unshift({
						id: `col-${i}-${j}`,
						...info
					});
				}
				i--;
				j--;
				continue;
			}
		}
		if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j] + 1)) {
			const info = classifyPhilologicalDifference(baseTokens[i - 1], "", siglum);
			variants.unshift({
				id: `col-${i}-${j}`,
				...info
			});
			i--;
		} else if (j > 0) {
			const info = classifyPhilologicalDifference("", witTokens[j - 1], siglum);
			variants.unshift({
				id: `col-${i}-${j}`,
				...info
			});
			j--;
		}
	}
	return variants;
}
/** صياغة حاشية فروق النسخ المجمّعة بأسلوب المحققين */
function formatCriticalApparatusBlock(variants) {
	if (!variants.length) return "لا فروق بين النسختين في هذا الموضع.";
	return variants.map((v, idx) => `(${idx + 1}) [${v.typeArabic}] ${v.apparatusFootnote}`).join("\n");
}
// src/lib/manuscript-core/takhrij-engine.ts
var QURAN_CORPUS = [
	{
		keys: ["الحمد لله رب العالمين", "رب العالمين"],
		surah: "الفاتحة",
		ayah: "2",
		uthmani: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ"
	},
	{
		keys: ["اهدنا الصراط المستقيم", "الصراط المستقيم"],
		surah: "الفاتحة",
		ayah: "6",
		uthmani: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ"
	},
	{
		keys: ["ذلك الكتاب لا ريب فيه", "لا ريب فيه هدى للمتقين"],
		surah: "البقرة",
		ayah: "2",
		uthmani: "ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ"
	},
	{
		keys: ["واحل الله البيع وحرم الربا", "احل الله البيع"],
		surah: "البقرة",
		ayah: "275",
		uthmani: "وَأَحَلَّ ٱللَّهُ ٱلْبَيْعَ وَحَرَّمَ ٱلرِّبَوٰا۟"
	},
	{
		keys: ["لا يكلف الله نفسا الا وسعها", "لها ما كسبت وعليها ما اكتسبت"],
		surah: "البقرة",
		ayah: "286",
		uthmani: "لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا"
	},
	{
		keys: ["شهد الله انه لا اله الا هو والملائكه واولو العلم", "واولو العلم قائما بالقسط"],
		surah: "آل عمران",
		ayah: "18",
		uthmani: "شَهِدَ ٱللَّهُ أَنَّهُۥ لَآ إِلَٰهَ إِلَّا هُوَ وَٱلْمَلَٰٓئِكَةُ وَأُو۟لُوا۟ ٱلْعِلْمِ قَآئِمًۢا بِٱلْقِسْطِ"
	},
	{
		keys: ["ان الله يامركم ان تؤدوا الامانات الى اهلها", "واذا حكمتم بين الناس ان تحكموا بالعدل"],
		surah: "النساء",
		ayah: "58",
		uthmani: "إِنَّ ٱللَّهَ يَأْمُرُكُمْ أَن تُؤَدُّوا۟ ٱلْأَمَٰنَٰتِ إِلَىٰٓ أَهْلِهَا وَإِذَا حَكَمْتُم بَيْنَ ٱلنَّاسِ أَن تَحْكُمُوا۟ بِٱلْعَدْلِ"
	},
	{
		keys: ["يا ايها الذين امنوا اطيعوا الله واطيعوا الرسول واولي الامر منكم", "فان تنازعتم في شيء فردوه الى الله والرسول"],
		surah: "النساء",
		ayah: "59",
		uthmani: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوٓا۟ أَطِيعُوا۟ ٱللَّهَ وَأَطِيعُوا۟ ٱلرَّسُولَ وَأُو۟لِى ٱلْأَمْرِ مِنكُمْ"
	},
	{
		keys: ["اليوم اكملت لكم دينكم واتممت عليكم نعمتي", "ورضيت لكم الاسلام دينا"],
		surah: "المائدة",
		ayah: "3",
		uthmani: "ٱلْيَوْمَ أَكْمَلْتُ لَكُمْ دِينَكُمْ وَأَتْمَمْتُ عَلَيْكُمْ نِعْمَتِى وَرَضِيتُ لَكُمُ ٱلْإِسْلَٰمَ دِينًا"
	},
	{
		keys: ["انا نحن نزلنا الذكر وانا له لحافظون", "نزلنا الذكر"],
		surah: "الحجر",
		ayah: "9",
		uthmani: "إِنَّا نَحْنُ نَزَّلْنَا ٱلذِّكْرَ وَإِنَّا لَهُۥ لَحَٰفِظُونَ"
	},
	{
		keys: ["فاسالوا اهل الذكر ان كنتم لا تعلمون", "اهل الذكر"],
		surah: "النحل",
		ayah: "43",
		uthmani: "فَسْـَٔلُوٓا۟ أَهْلَ ٱلذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ"
	},
	{
		keys: ["ادع الى سبيل ربك بالحكمه والموعظه الحسنه", "وجادلهم بالتي هي احسن"],
		surah: "النحل",
		ayah: "125",
		uthmani: "ٱدْعُ إِلَىٰ سَبِيلِ رَبِّكَ بِٱلْحِكْمَةِ وَٱلْمَوْعِظَةِ ٱلْحَسَنَةِ ۖ وَجَٰدِلْهُم بِٱلَّتِى هِىَ أَحْسَنُ"
	},
	{
		keys: ["وما ارسلناك الا رحمه للعالمين", "رحمه للعالمين"],
		surah: "الأنبياء",
		ayah: "107",
		uthmani: "وَمَآ أَرْسَلْنَٰكَ إِلَّا رَحْمَةً لِّلْعَٰلَمِينَ"
	},
	{
		keys: ["انما يخشى الله من عباده العلماء", "من عباده العلماء"],
		surah: "فاطر",
		ayah: "28",
		uthmani: "إِنَّمَا يَخْشَى ٱللَّهَ مِنْ عِبَادِهِ ٱلْعُلَمَٰٓؤُا۟"
	},
	{
		keys: ["ليس كمثله شيء وهو السميع البصير", "ليس كمثله شيء"],
		surah: "الشورى",
		ayah: "11",
		uthmani: "لَيْسَ كَمِثْلِهِۦ شَىْءٌ ۖ وَهُوَ ٱلسَّمِيعُ ٱلْبَصِيرُ"
	},
	{
		keys: ["يا ايها الذين امنوا ان جاءكم فاسق بنبا فتبينوا", "فتبينوا ان تصيبوا قوما بجهاله"],
		surah: "الحجرات",
		ayah: "6",
		uthmani: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوٓا۟ إِن جَآءَكُمْ فَاسِقٌۢ بِنَبَإٍ فَتَبَيَّنُوٓا۟"
	},
	{
		keys: ["وما اتاكم الرسول فخذوه وما نهاكم عنه فانتهوا", "وما اتاكم الرسول"],
		surah: "الحشر",
		ayah: "7",
		uthmani: "وَمَآ ءَاتَىٰكُمُ ٱلرَّسُولُ فَخُذُوهُ وَمَا نَهَىٰكُمْ عَنْهُ فَٱنتَهُوا۟"
	},
	{
		keys: ["اقرا باسم ربك الذي خلق", "علم الانسان ما لم يعلم"],
		surah: "العلق",
		ayah: "1-5",
		uthmani: "ٱقْرَأْ بِٱسْمِ رَبِّكَ ٱلَّذِى خَلَقَ"
	},
	{
		keys: ["قل هو الله احد", "الله الصمد"],
		surah: "الإخلاص",
		ayah: "1-2",
		uthmani: "قُلْ هُوَ ٱللَّهُ أَحَدٌ ۝ ٱللَّهُ ٱلصَّمَدُ"
	}
];
var HADITH_CORPUS = [
	{
		keys: ["انما الاعمال بالنيات", "وانما لكل امرئ ما نوى"],
		matn: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
		source: "أخرجه البخاري في صحيحه (1/ 6، رقم 1)، ومسلم (3/ 1515، رقم 1907) من حديث عمر بن الخطاب رضي الله عنه",
		grade: "متفق عليه"
	},
	{
		keys: ["من احدث في امرنا هذا ما ليس فيه فهو رد", "من عمل عملا ليس عليه امرنا فهو رد"],
		matn: "مَنْ أَحْدَثَ فِي أَمْرِنَا هَذَا مَا لَيْسَ فِيهِ فَهُوَ رَدٌّ",
		source: "أخرجه البخاري (2697)، ومسلم (1718) من حديث عائشة أم المؤمنين رضي الله عنها",
		grade: "متفق عليه"
	},
	{
		keys: ["الحلال بين والحرام بين", "وبينهما مشتبهات لا يعلمهن كثير من الناس"],
		matn: "إِنَّ الْحَلَالَ بَيِّنٌ، وَإِنَّ الْحَرَامَ بَيِّنٌ، وَبَيْنَهُمَا مُشْتَبِهَاتٌ",
		source: "أخرجه البخاري (52)، ومسلم (1599) من حديث النعمان بن بشير رضي الله عنهما",
		grade: "متفق عليه"
	},
	{
		keys: ["الدين النصيحه", "قلنا لمن قال لله ولكتابه ولرسوله"],
		matn: "الدِّينُ النَّصِيحَةُ، قُلْنَا: لِمَنْ؟ قَالَ: لِلَّهِ وَلِكِتَابِهِ وَلِرَسُولِهِ وَلِأَئِمَّةِ الْمُسْلِمِينَ وَعَامَّتِهِمْ",
		source: "أخرجه مسلم في صحيحه (55) من حديث تميم الداري رضي الله عنه",
		grade: "صحيح"
	},
	{
		keys: ["لا ضرر ولا ضرار", "لا ضرر"],
		matn: "لَا ضَرَرَ وَلَا ضِرَارَ",
		source: "أخرجه مالك في الموطأ (2/ 745)، وابن ماجه (2340)، وأحمد (2865) من حديث عبادة بن الصامت وأبي سعيد الخدري",
		grade: "حديث حسن لغيره وقاعدة فقهية كبرى"
	},
	{
		keys: ["البينه على المدعي واليمين على من انكر", "البينه على المدعي"],
		matn: "الْبَيِّنَةُ عَلَى الْمُدَّعِي، وَالْيَمِينُ عَلَى مَنْ أَنْكَرَ",
		source: "أخرجه الترمذي (1341)، والبيهقي في السنن الكبرى (10/ 252)؛ وأصله في الصحيحين",
		grade: "صحيح"
	},
	{
		keys: ["من يرد الله به خيرا يفقهه في الدين", "يفقهه في الدين"],
		matn: "مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ",
		source: "أخرجه البخاري (71)، ومسلم (1037) من حديث معاوية بن أبي سفيان رضي الله عنهما",
		grade: "متفق عليه"
	},
	{
		keys: ["نضر الله امرأ سمع مقالتي فوعاها", "فرب مبلغ اوعى من سامع"],
		matn: "نَضَّرَ اللَّهُ امْرَأً سَمِعَ مَقَالَتِي فَوَعَاهَا وَحَفِظَهَا وَبَلَّغَهَا",
		source: "أخرجه أبو داود (3660)، والترمذي (2658) من حديث زيد بن ثابت رضي الله عنه",
		grade: "صحيح متواتر"
	},
	{
		keys: ["العلماء ورثه الانبياء", "وان الانبياء لم يورثوا دينارا ولا درهما"],
		matn: "وَإِنَّ الْعُلَمَاءَ وَرَثَةُ الْأَنْبِيَاءِ، وَإِنَّ الْأَنْبِيَاءَ لَمْ يُوَرِّثُوا دِينَارًا وَلَا دِرْهَمًا",
		source: "أخرجه أبو داود (3641)، والترمذي (2682) من حديث أبي الدرداء رضي الله عنه",
		grade: "صحيح"
	},
	{
		keys: ["من كذب علي متعمدا فليتبوا مقعده من النار", "من كذب علي متعمدا"],
		matn: "مَنْ كَذَبَ عَلَيَّ مُتَعَمِّدًا فَلْيَتَبَوَّأْ مَقْعَدَهُ مِنَ النَّارِ",
		source: "أخرجه البخاري (110)، ومسلم (3) وهو حديث متواتر",
		grade: "متفق عليه (متواتر)"
	}
];
var SCHOLARS_BIO = [
	{
		keys: ["الشافعي", "محمد بن ادريس"],
		bio: {
			name: "أبو عبد الله محمد بن إدريس الشافعي القرشي المطلبي",
			title: "الإمام المجتهد صاحب المذهب ومؤسس علم أصول الفقه",
			deathYear: "204 هـ",
			school: "المذهب الشافعي",
			summary: "وُلد بغزة سنة 150 هـ، وأخذ عن مالك بن أنس ومحمد بن الحسن، وصنّف «الرسالة» و«الأم»، وتوفي بمصر سنة 204 هـ (ينظر: سير أعلام النبلاء 10/ 5؛ طبقات الشافعية الكبرى 2/ 71)."
		}
	},
	{
		keys: [
			"مالك بن انس",
			"الامام مالك",
			"مالك"
		],
		bio: {
			name: "أبو عبد الله مالك بن أنس بن مالك الأصبحي المدني",
			title: "إمام دار الهجرة وصاحب «الموطأ»",
			deathYear: "179 هـ",
			school: "المذهب المالكي",
			summary: "أحد الأئمة الأربعة المتبوعين، وُلد بالمدينة سنة 93 هـ، وانتهت إليه الفتوى والإمامة في الحديث والفقه، وتوفي بالمدينة سنة 179 هـ (ينظر: ترتيب المدارك 1/ 102؛ سير أعلام النبلاء 8/ 48)."
		}
	},
	{
		keys: [
			"ابي حنيفه",
			"ابو حنيفه",
			"النعمان بن ثابت"
		],
		bio: {
			name: "أبو حنيفة النعمان بن ثابت الكوفي",
			title: "الإمام الأعظم فقيه العراق",
			deathYear: "150 هـ",
			school: "المذهب الحنفي",
			summary: "وُلد بالكوفة سنة 80 هـ، ورأى أنس بن مالك، وتفقه بحماد بن أبي سليمان، وتوفي ببغداد سنة 150 هـ (ينظر: تاريخ بغداد 15/ 444؛ الجواهر المضية 1/ 26)."
		}
	},
	{
		keys: [
			"احمد بن حنبل",
			"الامام احمد",
			"ابن حنبل"
		],
		bio: {
			name: "أبو عبد الله أحمد بن محمد بن حنبل الشيباني البغدادي",
			title: "إمام أهل السنة وصاحب «المسند»",
			deathYear: "241 هـ",
			school: "المذهب الحنبلي",
			summary: "وُلد ببغداد سنة 164 هـ، وطاف البلاد في طلب الحديث، وثبت في المحنة، وتوفي ببغداد سنة 241 هـ (ينظر: طبقات الحنابلة 1/ 4؛ مناقب الإمام أحمد لابن الجوزي)."
		}
	},
	{
		keys: ["البخاري", "محمد بن اسماعيل"],
		bio: {
			name: "أبو عبد الله محمد بن إسماعيل بن إبراهيم الجعفي البخاري",
			title: "أمير المؤمنين في الحديث وصاحب «الجامع الصحيح»",
			deathYear: "256 هـ",
			school: "مدرسة المحدثين",
			summary: "وُلد ببخارى سنة 194 هـ، وصنف «الجامع المسند الصحيح» و«التاريخ الكبير»، وتوفي بخرتنك سنة 256 هـ (ينظر: هدي الساري ص 477؛ سير أعلام النبلاء 12/ 391)."
		}
	},
	{
		keys: ["مسلم بن الحجاج", "الامام مسلم"],
		bio: {
			name: "أبو الحسين مسلم بن الحجاج القشيري النيسابوري",
			title: "الإمام الحافظ صاحب «المسند الصحيح»",
			deathYear: "261 هـ",
			school: "مدرسة المحدثين",
			summary: "وُلد بنيسابور سنة 204 هـ، وتتلمذ للبخاري وأحمد بن حنبل، وتوفي بنيسابور سنة 261 هـ (ينظر: سير أعلام النبلاء 12/ 557)."
		}
	},
	{
		keys: ["سيبويه", "عمرو بن عثمان"],
		bio: {
			name: "أبو بشر عمرو بن عثمان بن قنبر الحارثي بالولاء (سيبويه)",
			title: "إمام النحاة وصاحب «الكتاب»",
			deathYear: "180 هـ",
			school: "مدرسة البصرة النحوية",
			summary: "أخذ النحو عن الخليل بن أحمد الفراهيدي ويونس بن حبيب، وألّف «الكتاب» الذي عُدّ دستور العربية، وتوفي بشيراز نحو سنة 180 هـ (ينظر: إنباه الرواة 2/ 346؛ بغية الوعاة 2/ 229)."
		}
	},
	{
		keys: ["الخليل بن احمد", "الفراهيدي"],
		bio: {
			name: "أبو عبد الرحمن الخليل بن أحمد الفراهيدي الأزدي البصري",
			title: "واضع علم العروض ومؤلف معجم «العين»",
			deathYear: "170 هـ",
			school: "مدرسة البصرة",
			summary: "إمام العربية واللغة والعروض، أستاذ سيبويه، توفي بالبصرة سنة 170 هـ (ينظر: نزهة الألباء ص 45؛ سير أعلام النبلاء 7/ 429)."
		}
	},
	{
		keys: ["ابن تيميه", "تقي الدين احمد بن عبد الحليم"],
		bio: {
			name: "تقي الدين أبو العباس أحمد بن عبد الحليم بن عبد السلام ابن تيمية الحراني",
			title: "شيخ الإسلام والمجتهد المطلق",
			deathYear: "728 هـ",
			school: "المذهب الحنبلي / الأثري",
			summary: "وُلد بحران سنة 661 هـ، وانتقل إلى دمشق، وله التصانيف الحافلة في العقيدة والفقه والأصول، وتوفي بقلعة دمشق سنة 728 هـ (ينظر: الدرر الكامنة 1/ 154؛ الذيل على طبقات الحنابلة 4/ 491)."
		}
	},
	{
		keys: [
			"ابن حجر",
			"العسقلاني",
			"احمد بن علي بن حجر"
		],
		bio: {
			name: "شهاب الدين أبو الفضل أحمد بن علي بن محمد ابن حجر العسقلاني المصري",
			title: "خاتمة الحفاظ وشارح صحيح البخاري في «فتح الباري»",
			deathYear: "852 هـ",
			school: "المذهب الشافعي",
			summary: "وُلد بمصر سنة 773 هـ، وولي قضاء القضاة، وصنف «فتح الباري» و«الإصابة» و«تهذيب التهذيب»، وتوفي بالقاهرة سنة 852 هـ (ينظر: الجواهر والدرر للسخاوي؛ الضوء اللامع 2/ 36)."
		}
	},
	{
		keys: ["النووي", "محيي الدين يحيى بن شرف"],
		bio: {
			name: "محيي الدين أبو زكريا يحيى بن شرف بن مري النووي الدمشقي",
			title: "محرّر المذهب الشافعي وشارح صحيح مسلم",
			deathYear: "676 هـ",
			school: "المذهب الشافعي",
			summary: "وُلد بنوى سنة 631 هـ، وصنف «المجموع» و«روضة الطالبين» و«المنهاج» و«رياض الصالحين»، وتوفي بنوى سنة 676 هـ (ينظر: طبقات الشافعية الكبرى 8/ 395)."
		}
	},
	{
		keys: ["ابن خلدون", "عبد الرحمن بن محمد بن خلدون"],
		bio: {
			name: "ولي الدين أبو زيد عبد الرحمن بن محمد ابن خلدون الإشبيلي الحضرمي",
			title: "مؤسس علم العمران البشري وصاحب «المقدمة»",
			deathYear: "808 هـ",
			school: "المذهب المالكي",
			summary: "وُلد بتونس سنة 732 هـ، وصنف تاريخه الكبير «العبر وديوان المبتدأ والخبر»، وولي قضاء المالكية بمصر، وتوفي بالقاهرة سنة 808 هـ (ينظر: الضوء اللامع 4/ 145)."
		}
	},
	{
		keys: ["السيوطي", "جلال الدين عبد الرحمن بن ابي بكر"],
		bio: {
			name: "جلال الدين أبو الفضل عبد الرحمن بن أبي بكر بن محمد السيوطي",
			title: "الإمام الحافظ المسنِد صاحب التصانيف السائرة",
			deathYear: "911 هـ",
			school: "المذهب الشافعي",
			summary: "وُلد بالقاهرة سنة 849 هـ، وصنف «الإتقان في علوم القرآن» و«الدر المنثور» و«تدريب الراوي» و«المزهر»، وتوفي بالقاهرة سنة 911 هـ (ينظر: الكواكب السائرة 1/ 226)."
		}
	}
];
/** تخريج الآية القرآنية وعزوها لسورتها ورقمها */
function takhrijAyahNative(text) {
	const norm = normalizeArabic(text);
	for (const item of QURAN_CORPUS) if (item.keys.some((k) => norm.includes(normalizeArabic(k)) || normalizeArabic(k).includes(norm))) return {
		formattedText: `﴿${item.uthmani}﴾`,
		citationNote: `تخريج: [سورة ${item.surah}: الآية ${item.ayah}].`
	};
	const clean = text.replace(/^[«"﴿(\[]+|[»"﴾)\]]+$/g, "").trim();
	return {
		formattedText: `﴿${clean}﴾`,
		citationNote: `تخريج: آية كريمة — يُراجع موضعها في المعجم المفهرس لألفاظ القرآن الكريم: «${stripDiacritics(clean).slice(0, 45)}».`
	};
}
/** تخريج الحديث النبوي أو الأثر وعزوه لمصادره ودرجته */
function takhrijHadithNative(text) {
	const norm = normalizeArabic(text);
	for (const item of HADITH_CORPUS) if (item.keys.some((k) => norm.includes(normalizeArabic(k)) || normalizeArabic(k).includes(norm))) return {
		formattedText: `«${item.matn}»`,
		citationNote: `تخريج: ${item.source}. حكمه: (${item.grade}).`
	};
	const clean = text.replace(/^[«"(\[]+|[»")\]]+$/g, "").trim();
	return {
		formattedText: `«${clean}»`,
		citationNote: `تخريج: حديث/أثر («${stripDiacritics(clean).slice(0, 50)}…») — يُستخرج إسناده ومتنه من «تحفة الأشراف» للمزي و«المعجم المفهرس لألفاظ الحديث النبوي».`
	};
}
/** ترجمة العَلَم واستخراج كشاف الأعلام والبلدان والمصادر من النص */
function translateAndIndexNamesNative(text) {
	const norm = normalizeArabic(text);
	for (const entry of SCHOLARS_BIO) if (entry.keys.some((k) => norm.includes(normalizeArabic(k)))) {
		const b = entry.bio;
		return `ترجمة عَلَم: ${b.name} (${b.title}، ت ${b.deathYear}، ${b.school}). ${b.summary}`;
	}
	const foundAyahs = [];
	const foundHadiths = [];
	const foundNames = [];
	const foundPlaces = [];
	const foundBooks = [];
	for (const q of QURAN_CORPUS) if (q.keys.some((k) => norm.includes(normalizeArabic(k)))) foundAyahs.push(`﴿${q.uthmani}﴾ [${q.surah}: ${q.ayah}]`);
	for (const h of HADITH_CORPUS) if (h.keys.some((k) => norm.includes(normalizeArabic(k)))) foundHadiths.push(`«${h.matn}» (${h.grade})`);
	for (const s of SCHOLARS_BIO) if (s.keys.some((k) => norm.includes(normalizeArabic(k)))) foundNames.push(`${s.bio.name} (ت ${s.bio.deathYear})`);
	const regexNames = text.match(/(?:أبو|أبي|أبا|ابن|بن|الإمام|الحافظ|الشيخ)\s+[\u0621-\u064A]+(?:\s+بن\s+[\u0621-\u064A]+)?/g) ?? [];
	for (const n of regexNames) if (!foundNames.some((fn) => fn.includes(n.trim()))) foundNames.push(n.trim());
	for (const p of [
		"مكة",
		"المدينة",
		"بغداد",
		"دمشق",
		"البصرة",
		"الكوفة",
		"مصر",
		"القاهرة",
		"نيسابور",
		"قرطبة",
		"إشبيلية",
		"فاس",
		"القيروان",
		"بخارى",
		"سمرقند",
		"القدس",
		"بيت المقدس",
		"اليمن",
		"الشام",
		"العراق",
		"خراسان",
		"الأندلس",
		"الحجاز"
	]) if (norm.includes(normalizeArabic(p))) foundPlaces.push(p);
	for (const b of [
		"الكتاب",
		"الموطأ",
		"الرسالة",
		"الأم",
		"المسند",
		"الصحيح",
		"الجامع",
		"السنن",
		"فتح الباري",
		"المجموع",
		"المقدمة",
		"الإتقان",
		"العين",
		"لسان العرب",
		"القاموس",
		"تهذيب",
		"الطبقات",
		"التاريخ"
	]) if (text.includes(`«${b}»`) || text.includes(`كتاب ${b}`)) foundBooks.push(b);
	if (text.trim().split(/\s+/).length <= 5 && foundNames.length > 0) return `ترجمة عَلَم: ${foundNames[0]} — عَلَمٌ مذكور في المتن، يُراجع في «سير أعلام النبلاء» للذهبي و«الوافي بالوفيات» للصفدي.`;
	return [
		`فهرس الآيات: ${foundAyahs.length ? foundAyahs.join(" ؛ ") : "لا يوجد"}`,
		`فهرس الأحاديث: ${foundHadiths.length ? foundHadiths.join(" ؛ ") : "لا يوجد"}`,
		`فهرس الأعلام: ${foundNames.length ? [...new Set(foundNames)].join(" ، ") : "لا يوجد"}`,
		`فهرس الأماكن: ${foundPlaces.length ? [...new Set(foundPlaces)].join(" ، ") : "لا يوجد"}`,
		`فهرس المصادر: ${foundBooks.length ? [...new Set(foundBooks)].join(" ، ") : "لا يوجد"}`
	].join("\n");
}
z.object({ suggestions: z.array(z.object({
	original: z.string(),
	occurrence: z.number(),
	replacement: z.string(),
	alternatives: z.array(z.string()),
	kind: z.enum(["spelling", "reading"]),
	reason: z.string()
}).strict()) }).strict();
function locateProposals(text, proposals) {
	const located = [];
	for (const proposal of proposals) {
		if (!proposal.original || !Number.isInteger(proposal.occurrence) || proposal.occurrence < 1 || proposal.occurrence > text.length) continue;
		let start = -1;
		for (let i = 0; i < proposal.occurrence; i++) {
			start = text.indexOf(proposal.original, start < 0 ? 0 : start + proposal.original.length);
			if (start < 0) break;
		}
		if (start < 0) continue;
		const end = start + proposal.original.length;
		if (located.some((item) => start < item.end && end > item.start)) continue;
		located.push({
			...proposal,
			start,
			end
		});
	}
	return located.sort((a, b) => a.start - b.start);
}
function validReplacement(actual, expected, replacement) {
	return actual === expected && !!replacement.trim() && !replacement.includes("\n");
}
// src/lib/manuscript-core/index.ts
/** تنفيذ فوري محلي لأي مهمة تحقيق نصية دون الحاجة لخادم خارجي */
function executeNativeManuscriptTask(body) {
	const task = body.task ?? "custom";
	const text = (body.text ?? "").trim();
	if (!text) return "";
	switch (task) {
		case "tashkeel": return vocalizeArabicText(text);
		case "hamza": return standardizeOrthography(text).normalizedText;
		case "ocr-cleanup": return cleanOcrTranscript(text);
		case "punctuate": return autoPunctuateHeritageText(text);
		case "correct": return autoPunctuateHeritageText(standardizeOrthography(text).normalizedText);
		case "takhrij-ayah": {
			const res = takhrijAyahNative(text);
			return `${res.formattedText}\n${res.citationNote}`;
		}
		case "takhrij-hadith": {
			const res = takhrijHadithNative(text);
			return `${res.formattedText}\n${res.citationNote}`;
		}
		case "index-names": return translateAndIndexNamesNative(text);
		case "collate": {
			const variant = body.variantText ?? body.instruction ?? "";
			if (!variant.trim()) {
				const ortho = standardizeOrthography(text);
				if (!ortho.corrections.length) return "لا فروق.";
				return ortho.corrections.map((c) => `في المتن: ${c.from} | القياس المحقق: ${c.to} | النوع: ${c.explanation}`).join("\n");
			}
			return formatCriticalApparatusBlock(collateManuscriptTexts(text, variant, body.siglum ?? "ب"));
		}
		case "summarize": {
			const selected = text.split(/[.!؟\n]+/).map((s) => s.trim()).filter((s) => s.length > 15).slice(0, 4);
			const words = text.split(/\s+/).filter(Boolean);
			const roots = [...new Set(words.slice(0, 25).map((w) => analyzeMorphology(w).root).filter((r) => r && r !== "-"))].slice(0, 8);
			return [
				"• خلاصة المقطع التحقيقية:",
				...selected.map((s) => `  - ${s}.`),
				`• البنية اللغوية: (${words.length} كلمة) | أبرز الجذور الدلالية: [${roots.join("، ")}].`
			].join("\n");
		}
		case "analyze-word": {
			const words = text.split(/\s+/).filter(Boolean);
			return words.slice(0, 10).map((w, idx) => {
				const a = analyzeMorphology(w, idx > 0 ? words[idx - 1] : "");
				return `«${a.token}» ← الجذر: (${a.root}) | الوزن: (${a.pattern}) | القسم: ${a.pos} | الإعراب: ${a.syntacticRole}${a.lexicalNote ? ` | بيان: ${a.lexicalNote}` : ""}`;
			}).join("\n");
		}
		default: {
			const instr = (body.instruction ?? "").trim();
			if (instr.includes("شكل") || instr.includes("ضبط")) return vocalizeArabicText(text);
			if (instr.includes("همز") || instr.includes("إملاء")) return standardizeOrthography(text).normalizedText;
			if (instr.includes("ترقيم") || instr.includes("فقر")) return autoPunctuateHeritageText(text);
			if (instr.includes("آية") || instr.includes("قرآن")) return takhrijAyahNative(text).citationNote;
			if (instr.includes("حديث") || instr.includes("أثر")) return takhrijHadithNative(text).citationNote;
			if (instr.includes("علم") || instr.includes("ترجم") || instr.includes("فهرس")) return translateAndIndexNamesNative(text);
			if (instr.includes("صرف") || instr.includes("إعراب") || instr.includes("جذر")) return executeNativeManuscriptTask({
				task: "analyze-word",
				text
			});
			return autoPunctuateHeritageText(cleanOcrTranscript(text));
		}
	}
}
/**
* مراجعة استكشافية للنص المحدد (Native Selection Review)
* تستخرج اقتراحات التصحيح الإملائي وقراءات الرسم التراثي والتصحيفات المحتملة محلياً.
*/
function reviewTextNatively(text) {
	const proposals = [];
	const seenCounts = /* @__PURE__ */ new Map();
	const regex = /[\u0621-\u064A\u064B-\u0652]+/g;
	let match;
	while ((match = regex.exec(text)) !== null) {
		const word = match[0];
		const occ = (seenCounts.get(word) ?? 0) + 1;
		seenCounts.set(word, occ);
		const clean = stripDiacritics(word);
		const ortho = standardizeOrthography(word);
		if (ortho.corrections.length > 0) {
			const corr = ortho.corrections[0];
			proposals.push({
				original: word,
				occurrence: occ,
				replacement: corr.to,
				alternatives: [word],
				kind: corr.rule === "archaic_spelling" ? "reading" : "spelling",
				reason: `${corr.explanation} (محرك الضبط الصرفي والقياسي المدمج).`
			});
		} else if (HERITAGE_GLOSSARY[clean]) {
			const morph = analyzeMorphology(word);
			proposals.push({
				original: word,
				occurrence: occ,
				replacement: morph.vocalized,
				alternatives: [],
				kind: "reading",
				reason: HERITAGE_GLOSSARY[clean]
			});
		}
		if (proposals.length >= 12) break;
	}
	return locateProposals(text, proposals);
}
export { reviewTextNatively as n, validReplacement as r, executeNativeManuscriptTask as t };
