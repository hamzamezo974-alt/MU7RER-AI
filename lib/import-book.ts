// استيراد كتاب كامل: PDF متعدد الصفحات، أرشيف ZIP، مجلد صور، أو صور مفردة.
import { pdfPageReferences } from "./pdf-reference";

export type ImportedPage = { name: string; blob: Blob; pdfPage?: number; originalName?: string };
export type ImportProgress = (done: number, total: number, label: string) => void;

const IMAGE_RE = /\.(png|jpe?g|webp|gif|bmp|tiff?|avif)$/i;

const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });

async function importPdf(file: File, onProgress?: ImportProgress): Promise<ImportedPage[]> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const document_ = await loadingTask.promise;
  const total = document_.numPages;
  const pages: ImportedPage[] = [];
  pages.push(...pdfPageReferences(file.name, total).map(page => ({ ...page, blob: file })));
  onProgress?.(total, total, "فهرسة صفحات PDF دون تحويل");
  await loadingTask.destroy();
  return pages;
}

async function importZip(file: File, onProgress?: ImportProgress): Promise<ImportedPage[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir && IMAGE_RE.test(entry.name))
    .sort((a, b) => naturalCompare(a.name, b.name));
  const pages: ImportedPage[] = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) continue;
    const blob = await entry.async("blob");
    pages.push({ name: entry.name.split("/").pop() ?? entry.name, blob });
    onProgress?.(index + 1, entries.length, "فك أرشيف الصور");
  }
  return pages;
}

/** يستورد قائمة ملفات (صور/PDF/ZIP/مجلد) ويعيدها صفحاتٍ مرتبة. */
export async function importFilesToPages(
  files: File[],
  onProgress?: ImportProgress,
): Promise<ImportedPage[]> {
  const ordered = [...files].sort((a, b) =>
    naturalCompare(
      (a as File & { webkitRelativePath?: string }).webkitRelativePath || a.name,
      (b as File & { webkitRelativePath?: string }).webkitRelativePath || b.name,
    ),
  );

  const pages: ImportedPage[] = [];
  const images: ImportedPage[] = [];

  for (const file of ordered) {
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
      pages.push(...(await importPdf(file, onProgress)));
    } else if (/\.(zip|cbz)$/i.test(file.name)) {
      pages.push(...(await importZip(file, onProgress)));
    } else if (file.type.startsWith("image/") || IMAGE_RE.test(file.name)) {
      images.push({ name: file.name, blob: file });
    }
  }

  if (images.length) {
    onProgress?.(images.length, images.length, "إضافة الصور");
    pages.push(...images);
  }
  return pages;
}
