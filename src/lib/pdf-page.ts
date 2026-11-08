/** يُحمَّل PDF عند فتح الوجه، لا أثناء استيراد الكتاب. */
export async function renderPdfPage(blob: Blob, pageNumber: number): Promise<Blob> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(pageNumber);
    const initial = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(2.2, Math.max(1, 1700 / initial.width)) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("تعذّر عرض صفحة PDF");
    await page.render({ canvas, canvasContext: context, viewport, background: "white" }).promise;
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error("تعذّر تجهيز صفحة PDF")), "image/jpeg", 0.9));
  } finally { await task.destroy(); }
}