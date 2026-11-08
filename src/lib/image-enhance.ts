export function flattenBackground(data: Uint8ClampedArray, width: number, height: number, radius = 16) {
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      row += Math.max(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
      integral[(y + 1) * stride + x + 1] = row + (integral[y * stride + x + 1] ?? 0);
    }
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const x1 = Math.max(0, x - radius), x2 = Math.min(width, x + radius + 1);
    const y1 = Math.max(0, y - radius), y2 = Math.min(height, y + radius + 1);
    const sum = (integral[y2 * stride + x2] ?? 0) - (integral[y1 * stride + x2] ?? 0) - (integral[y2 * stride + x1] ?? 0) + (integral[y1 * stride + x1] ?? 0);
    const background = Math.max(1, sum / ((x2 - x1) * (y2 - y1)));
    const i = (y * width + x) * 4;
    for (let c = 0; c < 3; c++) data[i + c] = Math.min(255, (data[i + c] ?? 0) * 245 / background);
  }
}
export function adaptiveThreshold(data: Uint8ClampedArray, width: number, height: number, radius = 12) {
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      sum += 0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0);
      integral[(y + 1) * stride + x + 1] = sum + (integral[y * stride + x + 1] ?? 0);
    }
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const x1 = Math.max(0, x - radius), x2 = Math.min(width, x + radius + 1);
    const y1 = Math.max(0, y - radius), y2 = Math.min(height, y + radius + 1);
    const sum = (integral[y2 * stride + x2] ?? 0) - (integral[y1 * stride + x2] ?? 0) - (integral[y2 * stride + x1] ?? 0) + (integral[y1 * stride + x1] ?? 0);
    const mean = sum / ((x2 - x1) * (y2 - y1));
    const i = (y * width + x) * 4;
    const gray = 0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0);
    const value = gray < mean - 10 ? 0 : 255;
    data[i] = value; data[i + 1] = value; data[i + 2] = value;
  }
}