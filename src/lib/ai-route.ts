// اختيار مسار الذكاء الاصطناعي: خدمة Lovable أولًا دائمًا، ومفتاح Gemini الخاص احتياطٌ عند نفاد الرصيد أو الحد.
export type AiRoute = "lovable" | "own";

/** حالات خدمة Lovable التي تبرر الانتقال إلى مفتاح المستخدم: نفاد الرصيد (402) أو تجاوز الحد (429). */
export function shouldFallbackToOwnKey(status: number, hasOwnKey: boolean): boolean {
  return hasOwnKey && (status === 402 || status === 429);
}

/** المسار الأول للطلب: المفتاح الخاص فقط عند اختباره صراحة، وإلا Lovable. */
export function firstRoute(hasOwnKey: boolean, forceOwnKey: boolean | undefined): AiRoute {
  return forceOwnKey && hasOwnKey ? "own" : "lovable";
}
