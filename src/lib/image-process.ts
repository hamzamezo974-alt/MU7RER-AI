// معالجة صور المخطوطات داخل المتصفح: تحسين القراءة، تحويل ثنائي، حدة، وتعديل الميل.
import { adaptiveThreshold, flattenBackground } from "./image-enhance";

export type ProcessSettings = {
  brightness: number; // 100 = بدون تغيير
  contrast: number; // 100 = بدون تغيير
  gamma: number; // 100 = بدون تغيير
  sharpen: number; // 0..100
  grayscale: boolean;
  binarize: boolean;
  threshold: number; // 0 = تلقائي (Otsu)، أو 1..255
  denoise: boolean;
  invert: boolean;
  flatten: boolean;
  adaptive: boolean;
  upscale: number;
};

export const DEFAULT_PROCESS: ProcessSettings = {
  brightness: 100,
  contrast: 100,
  gamma: 100,
  sharpen: 0,
  grayscale: false,
  binarize: false,
  threshold: 0,
  denoise: false,
  invert: false,
  flatten: false,
  adaptive: false,
  upscale: 1,
};

export const PROCESS_PRESETS: Array<{ name: string; hint: string; value: ProcessSettings }> = [
  { name: "الأصل", hint: "بلا معالجة", value: { ...DEFAULT_PROCESS } },
  { name: "تحسين متقدم", hint: "تسطيح الورق وإزالة الضوضاء وإبراز الحبر", value: { ...DEFAULT_PROCESS, flatten: true, denoise: true, sharpen: 30 } },
  {
    name: "مخطوط باهت",
    hint: "إبراز الحبر الخافت",
    value: { ...DEFAULT_PROCESS, grayscale: true, contrast: 160, gamma: 80, sharpen: 35 },
  },
  {
    name: "أبيض وأسود",
    hint: "تحويل ثنائي بعتبة تلقائية",
    value: { ...DEFAULT_PROCESS, grayscale: true, contrast: 130, binarize: true, denoise: true },
  },
  {
    name: "ورق داكن",
    hint: "تفتيح الورق المصفرّ",
    value: { ...DEFAULT_PROCESS, grayscale: true, brightness: 125, contrast: 150, gamma: 120 },
  },
  {
    name: "تصوير سالب",
    hint: "عكس الألوان لصور الميكروفيلم",
    value: { ...DEFAULT_PROCESS, grayscale: true, invert: true, contrast: 130 },
  },
];

export const isDefaultProcess = (settings: ProcessSettings) =>
  (Object.keys(DEFAULT_PROCESS) as Array<keyof ProcessSettings>).every(
    (key) => settings[key] === DEFAULT_PROCESS[key],
  );

const clamp255 = (value: number) => (value < 0 ? 0 : value > 255 ? 255 : value);

function otsuThreshold(gray: Uint8ClampedArray): number {
  const histogram = new Array<number>(256).fill(0);
  for (let i = 0; i < gray.length; i += 1) histogram[gray[i]!] = (histogram[gray[i]!] ?? 0) + 1;
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t += 1) sum += t * histogram[t]!;
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let bestVariance = -1;
  for (let t = 0; t < 256; t += 1) {
    wB += histogram[t]!;
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * histogram[t]!;
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > bestVariance) {
      bestVariance = variance;
      best = t;
    }
  }
  return best;
}

/** يطبّق سلسلة المعالجة على ImageData في مكانها. */
export function applyProcess(image: ImageData, settings: ProcessSettings): ImageData {
  const { data, width, height } = image;
  if (settings.flatten) flattenBackground(data, width, height);
  const gammaExp = 100 / Math.max(10, settings.gamma);
  const contrastFactor = (259 * (settings.contrast + 255 - 100)) / (255 * (359 - settings.contrast));
  const brightnessDelta = ((settings.brightness - 100) / 100) * 255 * 0.5;
  const needsGray = settings.grayscale || settings.binarize || settings.denoise;

  const gammaLut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i += 1) {
    gammaLut[i] = clamp255(Math.round(255 * Math.pow(i / 255, gammaExp)));
  }

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]!;
    let g = data[i + 1]!;
    let b = data[i + 2]!;
    if (needsGray) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = gray;
    }
    r = clamp255(contrastFactor * (r - 128) + 128 + brightnessDelta);
    g = clamp255(contrastFactor * (g - 128) + 128 + brightnessDelta);
    b = clamp255(contrastFactor * (b - 128) + 128 + brightnessDelta);
    r = gammaLut[Math.round(r)]!;
    g = gammaLut[Math.round(g)]!;
    b = gammaLut[Math.round(b)]!;
    if (settings.invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  if (settings.sharpen > 0) {
    const amount = settings.sharpen / 100;
    const source = new Uint8ClampedArray(data);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel += 1) {
          const c = index + channel;
          const neighbours =
            source[c - 4]! + source[c + 4]! + source[c - width * 4]! + source[c + width * 4]!;
          const value = source[c]! + amount * (4 * source[c]! - neighbours);
          data[c] = clamp255(value);
        }
      }
    }
  }

  if (settings.denoise) {
    const source = new Uint8ClampedArray(data);
    const window = new Array<number>(9);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = (y * width + x) * 4;
        let k = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            window[k] = source[index + (dy * width + dx) * 4]!;
            k += 1;
          }
        }
        window.sort((a, b) => a - b);
        const median = window[4]!;
        data[index] = median;
        data[index + 1] = median;
        data[index + 2] = median;
      }
    }
  }

  if (settings.adaptive) adaptiveThreshold(data, width, height);
  else if (settings.binarize) {
    const gray = new Uint8ClampedArray(data.length / 4);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 1) gray[j] = data[i]!;
    const threshold = settings.threshold > 0 ? settings.threshold : otsuThreshold(gray);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
      const value = gray[j]! >= threshold ? 255 : 0;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }
  }

  return image;
}

async function toBitmap(source: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") return createImageBitmap(source);
  const url = URL.createObjectURL(source);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

export type ProcessOutput = { blob: Blob; width: number; height: number };

/** يعالج صورة كاملة ويعيدها كـ Blob (JPEG أو PNG للثنائي). */
export async function processImageBlob(
  source: Blob,
  settings: ProcessSettings,
  maxWidth = 2400,
): Promise<ProcessOutput> {
  const bitmap = await toBitmap(source);
  const naturalWidth = "width" in bitmap ? bitmap.width : 0;
  const naturalHeight = "height" in bitmap ? bitmap.height : 0;
  const factor = Math.max(1, Math.min(2, settings.upscale ?? 1));
  const scale = Math.min(factor, (maxWidth * factor) / naturalWidth);
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("تعذّر تجهيز الصورة");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
  if ("close" in bitmap) bitmap.close();

  if (!isDefaultProcess(settings)) {
    const imageData = context.getImageData(0, 0, width, height);
    applyProcess(imageData, settings);
    context.putImageData(imageData, 0, 0);
  }

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (result) => resolve(result ?? new Blob()),
      settings.binarize || settings.adaptive ? "image/png" : "image/jpeg",
      0.9,
    );
  });
  return { blob, width, height };
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
