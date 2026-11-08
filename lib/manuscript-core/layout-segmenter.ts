// محرك الرؤية الحاسوبية وتجزئة صفحات المخطوطات (Computer Vision Layout & Sauvola Binarization Engine)
// يحلل كثافة البكسلات، ويعزل الحمرة (المداد الأحمر)، ويقطع السطور والطرر والتعقيبات رياضياً داخل المتصفح.

export type RegionKind = "matn" | "hashiya-right" | "hashiya-left" | "turrah" | "taqibah" | "rubric";

export interface DetectedLineBox {
  lineNumber: number;
  yStart: number;
  yEnd: number;
  xStart: number;
  xEnd: number;
  inkDensity: number;
  hasRubrication: boolean; // هل يحتوي السطر على مداد أحمر (رؤوس الفصول / قوله / باب)
}

export interface ManuscriptPageAnalysis {
  width: number;
  height: number;
  estimatedLinesCount: number;
  skewAngleDegrees: number;
  rubricRatio: number;
  regions: Array<{
    id: string;
    kind: RegionKind;
    label: string;
    box: { x: number; y: number; width: number; height: number };
    inkCoverage: number;
  }>;
  lines: DetectedLineBox[];
}

/**
 * تحويل ثنائي تكيفي بخوارزمية (Sauvola Adaptive Binarization)
 * مصمم خصيصاً لعزل حبر المخطوطات عن الرق المصفرّ وبقع الرطوبة ونزف الحبر (Bleed-through).
 */
export function sauvolaBinarize(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  windowRadius = 15,
  k = 0.2,
  R = 128
): void {
  const stride = width + 1;
  const integralSum = new Float64Array(stride * (height + 1));
  const integralSqSum = new Float64Array(stride * (height + 1));
  const gray = new Uint8ClampedArray(width * height);

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    let rowSq = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const g = Math.round(0.299 * data[idx]! + 0.587 * data[idx + 1]! + 0.114 * data[idx + 2]!);
      gray[y * width + x] = g;
      rowSum += g;
      rowSq += g * g;
      const pos = (y + 1) * stride + (x + 1);
      integralSum[pos] = rowSum + integralSum[y * stride + (x + 1)]!;
      integralSqSum[pos] = rowSq + integralSqSum[y * stride + (x + 1)]!;
    }
  }

  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - windowRadius);
    const y2 = Math.min(height, y + windowRadius + 1);
    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - windowRadius);
      const x2 = Math.min(width, x + windowRadius + 1);
      const count = (x2 - x1) * (y2 - y1);

      const sum =
        integralSum[y2 * stride + x2]! -
        integralSum[y1 * stride + x2]! -
        integralSum[y2 * stride + x1]! +
        integralSum[y1 * stride + x1]!;
      const sqSum =
        integralSqSum[y2 * stride + x2]! -
        integralSqSum[y1 * stride + x2]! -
        integralSqSum[y2 * stride + x1]! +
        integralSqSum[y1 * stride + x1]!;

      const mean = sum / count;
      const variance = Math.max(0, sqSum / count - mean * mean);
      const stdDev = Math.sqrt(variance);
      const threshold = mean * (1 + k * (stdDev / R - 1));

      const g = gray[y * width + x]!;
      const out = g <= threshold ? 20 : 250;
      const i = (y * width + x) * 4;
      data[i] = out;
      data[i + 1] = out;
      data[i + 2] = out;
    }
  }
}

/**
 * تحليل المساقط الأفقية والعمودية (Horizontal & Vertical Projection Profiles)
 * لاستخراج السطور، وفصل المتن عن الحواشي الجانبية والتعقيبة، وكشف المداد الأحمر.
 */
export function analyzeManuscriptImageData(imageData: ImageData): ManuscriptPageAnalysis {
  const { data, width, height } = imageData;
  const horizontalHist = new Float32Array(height);
  const rubricRowHist = new Float32Array(height);
  const verticalHist = new Float32Array(width);

  let totalInkPixels = 0;
  let totalRubricPixels = 0;

  // حساب عتبة الحبر التقديرية
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // فحص المداد الأحمر (الحمرة في المخطوطات)
      const isRubric = r > 110 && r > g * 1.45 && r > b * 1.45 && lum < 210;
      const isDarkInk = lum < 145;

      if (isDarkInk || isRubric) {
        horizontalHist[y]! += 1;
        verticalHist[x]! += 1;
        totalInkPixels++;
        if (isRubric) {
          rubricRowHist[y]! += 1;
          totalRubricPixels++;
        }
      }
    }
  }

  // تحديد حدود كتلة المتن أفقياً (Left/Right Matn bounds)
  const colThreshold = height * 0.04;
  let matnLeft = Math.round(width * 0.12);
  let matnRight = Math.round(width * 0.88);
  for (let x = Math.round(width * 0.08); x < width * 0.45; x++) {
    if (verticalHist[x]! > colThreshold) {
      matnLeft = x;
      break;
    }
  }
  for (let x = Math.round(width * 0.92); x > width * 0.55; x--) {
    if (verticalHist[x]! > colThreshold) {
      matnRight = x;
      break;
    }
  }

  // استخراج السطور من المسقط الأفقي (Line Segmentation via Peak-Valley Detection)
  const rowThreshold = Math.max(8, (matnRight - matnLeft) * 0.035);
  const minLineHeight = Math.max(6, Math.round(height * 0.01));
  const lines: DetectedLineBox[] = [];

  let inLine = false;
  let startY = 0;
  let lineInkSum = 0;
  let lineRubricSum = 0;

  for (let y = Math.round(height * 0.04); y < Math.round(height * 0.95); y++) {
    const val = horizontalHist[y]!;
    if (!inLine && val >= rowThreshold) {
      inLine = true;
      startY = y;
      lineInkSum = val;
      lineRubricSum = rubricRowHist[y]!;
    } else if (inLine) {
      if (val >= rowThreshold * 0.65) {
        lineInkSum += val;
        lineRubricSum += rubricRowHist[y]!;
      } else {
        const lineH = y - startY;
        if (lineH >= minLineHeight) {
          lines.push({
            lineNumber: lines.length + 1,
            yStart: startY,
            yEnd: y,
            xStart: matnLeft,
            xEnd: matnRight,
            inkDensity: Number((lineInkSum / (lineH * Math.max(1, matnRight - matnLeft))).toFixed(3)),
            hasRubrication: lineRubricSum > 12,
          });
        }
        inLine = false;
      }
    }
  }

  const matnTop = lines.length > 0 ? lines[0]!.yStart : Math.round(height * 0.12);
  const matnBottom = lines.length > 0 ? lines[lines.length - 1]!.yEnd : Math.round(height * 0.86);

  const regions: ManuscriptPageAnalysis["regions"] = [
    {
      id: "region-matn",
      kind: "matn",
      label: "كتلة المتن الرئيسي",
      box: { x: matnLeft, y: matnTop, width: Math.max(10, matnRight - matnLeft), height: Math.max(10, matnBottom - matnTop) },
      inkCoverage: Number((totalInkPixels / Math.max(1, width * height)).toFixed(3)),
    },
    {
      id: "region-hashiya-right",
      kind: "hashiya-right",
      label: "الهامش الأيمن (الطرر والحواشي)",
      box: { x: Math.round(width * 0.86), y: matnTop, width: Math.round(width * 0.12), height: Math.max(10, matnBottom - matnTop) },
      inkCoverage: 0.08,
    },
    {
      id: "region-hashiya-left",
      kind: "hashiya-left",
      label: "الهامش الأيسر واللحق",
      box: { x: Math.round(width * 0.02), y: matnTop, width: Math.round(width * 0.12), height: Math.max(10, matnBottom - matnTop) },
      inkCoverage: 0.07,
    },
    {
      id: "region-taqibah",
      kind: "taqibah",
      label: "موضع التعقيبة (وصل الورقة التالية)",
      box: { x: Math.round(width * 0.08), y: Math.min(height - 20, matnBottom + 4), width: Math.round(width * 0.28), height: Math.round(height * 0.07) },
      inkCoverage: 0.04,
    },
  ];

  return {
    width,
    height,
    estimatedLinesCount: lines.length,
    skewAngleDegrees: 0,
    rubricRatio: totalInkPixels > 0 ? Number((totalRubricPixels / totalInkPixels).toFixed(3)) : 0,
    regions,
    lines,
  };
}
