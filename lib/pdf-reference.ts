export function pdfPageReferences(name: string, total: number) {
  if (!Number.isInteger(total) || total < 1) throw new Error("عدد صفحات PDF غير صالح");
  const title = name.replace(/\.pdf$/i, "");
  return Array.from({ length: total }, (_, index) => ({ name: `${title} — ص ${index + 1}`, pdfPage: index + 1, originalName: name }));
}