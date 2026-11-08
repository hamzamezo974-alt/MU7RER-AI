export async function transformWorkingText(draft: string | null, selection: string, documentText: string, transform: (text: string) => Promise<string>) {
  const source = draft ?? (selection.trim() || documentText);
  if (!source.trim()) throw new Error("لا يوجد نص لتطبيق العمليات عليه.");
  const result = await transform(source);
  if (!result.trim()) throw new Error("لم تُرجع العملية نصًا؛ احتُفظ بنص العمل السابق");
  return result;
}