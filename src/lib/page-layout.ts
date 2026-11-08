export type CropBox = { left: number; top: number; right: number; bottom: number };
export const FULL_CROP: CropBox = { left: 0, top: 0, right: 100, bottom: 100 };
export function cropPixels(width: number, height: number, box: CropBox) {
  const x = Math.round(width * box.left / 100);
  const y = Math.round(height * box.top / 100);
  return { x, y, width: Math.max(1, Math.round(width * box.right / 100) - x), height: Math.max(1, Math.round(height * box.bottom / 100) - y) };
}
export function splitBoxes(at: number): CropBox[] {
  const edge = Math.min(99, Math.max(1, at));
  return [{ ...FULL_CROP, left: edge }, { ...FULL_CROP, right: edge }];
}
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) return items;
  next.splice(to, 0, item);
  return next;
}
export async function cropPage(source: Blob, box: CropBox): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  try {
    const area = cropPixels(bitmap.width, bitmap.height, box);
    const canvas = document.createElement("canvas");
    canvas.width = area.width; canvas.height = area.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("تعذّر تجهيز الصورة");
    context.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
    return await encode(canvas);
  } finally { bitmap.close(); }
}
export async function mergePages(sources: Blob[], vertical: boolean): Promise<Blob> {
  const images: ImageBitmap[] = [];
  try {
    for (const source of sources) images.push(await createImageBitmap(source));
    const canvas = document.createElement("canvas");
    canvas.width = vertical ? Math.max(...images.map(image => image.width)) : images.reduce((sum, image) => sum + image.width, 0);
    canvas.height = vertical ? images.reduce((sum, image) => sum + image.height, 0) : Math.max(...images.map(image => image.height));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("تعذّر تجهيز الصورة");
    let position = vertical ? 0 : canvas.width;
    for (const image of images) {
      if (!vertical) position -= image.width;
      context.drawImage(image, vertical ? 0 : position, vertical ? position : 0);
      if (vertical) position += image.height;
    }
    return await encode(canvas);
  } finally { images.forEach(image => image.close()); }
}
function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("تعذّر حفظ الصورة")), "image/png"));
}