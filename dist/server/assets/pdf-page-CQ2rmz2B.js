// src/lib/pdf-page.ts
/** يُحمَّل PDF عند فتح الوجه، لا أثناء استيراد الكتاب. */
async function renderPdfPage(blob, pageNumber) {
	const pdfjs = await import("pdfjs-dist");
	pdfjs.GlobalWorkerOptions.workerSrc = (await import("./pdf.worker.min-Bkh8PfwT.js")).default;
	const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
	try {
		const page = await (await task.promise).getPage(pageNumber);
		const initial = page.getViewport({ scale: 1 });
		const viewport = page.getViewport({ scale: Math.min(2.2, Math.max(1, 1700 / initial.width)) });
		const canvas = document.createElement("canvas");
		canvas.width = Math.ceil(viewport.width);
		canvas.height = Math.ceil(viewport.height);
		const context = canvas.getContext("2d");
		if (!context) throw new Error("تعذّر عرض صفحة PDF");
		await page.render({
			canvas,
			canvasContext: context,
			viewport,
			background: "white"
		}).promise;
		return await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(/* @__PURE__ */ new Error("تعذّر تجهيز صفحة PDF")), "image/jpeg", .9));
	} finally {
		await task.destroy();
	}
}
export { renderPdfPage };
