import { t as executeNativeManuscriptTask } from "./manuscript-core-niwsB8Um.js";
import { t as supabase } from "./client-CkQ1C0KQ.js";
import { _ as readStorage, g as getStorageOwner, n as Button, r as cn, v as removeStorage, y as writeStorage } from "./router-BzqaA8hu.js";
import { t as Input } from "./input-CMPGM22e.js";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronUp, FileText, Loader2, Save, ScanText, X } from "lucide-react";
import { toast } from "sonner";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SelectPrimitive from "@radix-ui/react-select";
// src/lib/ai-client.ts
var GEMINI_KEY = "mu7rer:gemini-key";
function normalizeGeminiKey(input) {
	return input.trim().replace(/^(?:GOOGLE_API_KEY|GEMINI_API_KEY|API_KEY)\s*=\s*/i, "").replace(/^['"`]|['"`]$/g, "").trim();
}
function getGeminiKey() {
	return readStorage("mu7rer:gemini-key") ?? "";
}
function saveGeminiKey(value) {
	if (value) writeStorage(GEMINI_KEY, value);
	else removeStorage(GEMINI_KEY);
}
async function aiRequest(body) {
	const task = typeof body["task"] === "string" ? body["task"] : "custom";
	const text = typeof body["text"] === "string" ? body["text"] : "";
	const instruction = typeof body["instruction"] === "string" ? body["instruction"] : "";
	if (!Boolean(body["image"]) && text.trim()) {
		const localResult = executeNativeManuscriptTask({
			task,
			text,
			instruction
		});
		if (localResult.trim()) return localResult;
	}
	try {
		const apiKey = getGeminiKey();
		const response = await fetch("/api/ai", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				...body,
				...apiKey ? { apiKey } : {}
			})
		});
		const raw = await response.text();
		let resText = raw;
		try {
			const data = JSON.parse(raw);
			resText = data.text ?? data.error ?? raw;
		} catch {}
		if (response.ok && resText.trim()) return resText;
	} catch {}
	if (text.trim()) return executeNativeManuscriptTask({
		task,
		text,
		instruction
	});
	throw new Error("لم يصل نص من الخدمة؛ حدد مقطعًا نصيًا لتشغيل المحرك المحلي.");
}
// src/components/ui/checkbox.tsx
var Checkbox = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(CheckboxPrimitive.Root, {
	ref,
	className: cn("grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", className),
	...props,
	children: /* @__PURE__ */ jsx(CheckboxPrimitive.Indicator, {
		className: cn("grid place-content-center text-current"),
		children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" })
	})
}));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
// src/lib/idb.ts
var DB_NAME = "mu7rer";
var DB_VERSION = 1;
var STORE = "assets";
function openDb() {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === "undefined") return reject(/* @__PURE__ */ new Error("IndexedDB not available"));
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}
async function withStore(mode, run) {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, mode);
		const request = run(tx.objectStore(STORE));
		let result;
		request.onsuccess = () => {
			result = request.result;
		};
		request.onerror = () => reject(request.error);
		tx.oncomplete = () => {
			db.close();
			resolve(result);
		};
		tx.onabort = () => {
			db.close();
			reject(tx.error ?? /* @__PURE__ */ new Error("تعذّر حفظ الملف"));
		};
	});
}
async function idbGet(key) {
	try {
		return await withStore("readonly", (store) => store.get(key));
	} catch {
		return;
	}
}
async function idbSet(key, value) {
	await withStore("readwrite", (store) => store.put(value, key));
}
async function idbDelete(key) {
	try {
		await withStore("readwrite", (store) => store.delete(key));
	} catch {}
}
// src/lib/image-enhance.ts
function flattenBackground(data, width, height, radius = 16) {
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
function adaptiveThreshold(data, width, height, radius = 12) {
	const stride = width + 1;
	const integral = new Float64Array(stride * (height + 1));
	for (let y = 0; y < height; y++) {
		let sum = 0;
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			sum += .299 * (data[i] ?? 0) + .587 * (data[i + 1] ?? 0) + .114 * (data[i + 2] ?? 0);
			integral[(y + 1) * stride + x + 1] = sum + (integral[y * stride + x + 1] ?? 0);
		}
	}
	for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
		const x1 = Math.max(0, x - radius), x2 = Math.min(width, x + radius + 1);
		const y1 = Math.max(0, y - radius), y2 = Math.min(height, y + radius + 1);
		const mean = ((integral[y2 * stride + x2] ?? 0) - (integral[y1 * stride + x2] ?? 0) - (integral[y2 * stride + x1] ?? 0) + (integral[y1 * stride + x1] ?? 0)) / ((x2 - x1) * (y2 - y1));
		const i = (y * width + x) * 4;
		const value = .299 * (data[i] ?? 0) + .587 * (data[i + 1] ?? 0) + .114 * (data[i + 2] ?? 0) < mean - 10 ? 0 : 255;
		data[i] = value;
		data[i + 1] = value;
		data[i + 2] = value;
	}
}
// src/lib/image-process.ts
var DEFAULT_PROCESS = {
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
	upscale: 1
};
var PROCESS_PRESETS = [
	{
		name: "الأصل",
		hint: "بلا معالجة",
		value: { ...DEFAULT_PROCESS }
	},
	{
		name: "تحسين متقدم",
		hint: "تسطيح الورق وإزالة الضوضاء وإبراز الحبر",
		value: {
			...DEFAULT_PROCESS,
			flatten: true,
			denoise: true,
			sharpen: 30
		}
	},
	{
		name: "مخطوط باهت",
		hint: "إبراز الحبر الخافت",
		value: {
			...DEFAULT_PROCESS,
			grayscale: true,
			contrast: 160,
			gamma: 80,
			sharpen: 35
		}
	},
	{
		name: "أبيض وأسود",
		hint: "تحويل ثنائي بعتبة تلقائية",
		value: {
			...DEFAULT_PROCESS,
			grayscale: true,
			contrast: 130,
			binarize: true,
			denoise: true
		}
	},
	{
		name: "ورق داكن",
		hint: "تفتيح الورق المصفرّ",
		value: {
			...DEFAULT_PROCESS,
			grayscale: true,
			brightness: 125,
			contrast: 150,
			gamma: 120
		}
	},
	{
		name: "تصوير سالب",
		hint: "عكس الألوان لصور الميكروفيلم",
		value: {
			...DEFAULT_PROCESS,
			grayscale: true,
			invert: true,
			contrast: 130
		}
	}
];
var isDefaultProcess = (settings) => Object.keys(DEFAULT_PROCESS).every((key) => settings[key] === DEFAULT_PROCESS[key]);
var clamp255 = (value) => value < 0 ? 0 : value > 255 ? 255 : value;
function otsuThreshold(gray) {
	const histogram = new Array(256).fill(0);
	for (let i = 0; i < gray.length; i += 1) histogram[gray[i]] = (histogram[gray[i]] ?? 0) + 1;
	const total = gray.length;
	let sum = 0;
	for (let t = 0; t < 256; t += 1) sum += t * histogram[t];
	let sumB = 0;
	let wB = 0;
	let best = 0;
	let bestVariance = -1;
	for (let t = 0; t < 256; t += 1) {
		wB += histogram[t];
		if (wB === 0) continue;
		const wF = total - wB;
		if (wF === 0) break;
		sumB += t * histogram[t];
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
function applyProcess(image, settings) {
	const { data, width, height } = image;
	if (settings.flatten) flattenBackground(data, width, height);
	const gammaExp = 100 / Math.max(10, settings.gamma);
	const contrastFactor = 259 * (settings.contrast + 255 - 100) / (255 * (359 - settings.contrast));
	const brightnessDelta = (settings.brightness - 100) / 100 * 255 * .5;
	const needsGray = settings.grayscale || settings.binarize || settings.denoise;
	const gammaLut = /* @__PURE__ */ new Uint8ClampedArray(256);
	for (let i = 0; i < 256; i += 1) gammaLut[i] = clamp255(Math.round(255 * Math.pow(i / 255, gammaExp)));
	for (let i = 0; i < data.length; i += 4) {
		let r = data[i];
		let g = data[i + 1];
		let b = data[i + 2];
		if (needsGray) r = g = b = .299 * r + .587 * g + .114 * b;
		r = clamp255(contrastFactor * (r - 128) + 128 + brightnessDelta);
		g = clamp255(contrastFactor * (g - 128) + 128 + brightnessDelta);
		b = clamp255(contrastFactor * (b - 128) + 128 + brightnessDelta);
		r = gammaLut[Math.round(r)];
		g = gammaLut[Math.round(g)];
		b = gammaLut[Math.round(b)];
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
		for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
			const index = (y * width + x) * 4;
			for (let channel = 0; channel < 3; channel += 1) {
				const c = index + channel;
				const neighbours = source[c - 4] + source[c + 4] + source[c - width * 4] + source[c + width * 4];
				data[c] = clamp255(source[c] + amount * (4 * source[c] - neighbours));
			}
		}
	}
	if (settings.denoise) {
		const source = new Uint8ClampedArray(data);
		const window = new Array(9);
		for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
			const index = (y * width + x) * 4;
			let k = 0;
			for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
				window[k] = source[index + (dy * width + dx) * 4];
				k += 1;
			}
			window.sort((a, b) => a - b);
			const median = window[4];
			data[index] = median;
			data[index + 1] = median;
			data[index + 2] = median;
		}
	}
	if (settings.adaptive) adaptiveThreshold(data, width, height);
	else if (settings.binarize) {
		const gray = new Uint8ClampedArray(data.length / 4);
		for (let i = 0, j = 0; i < data.length; i += 4, j += 1) gray[j] = data[i];
		const threshold = settings.threshold > 0 ? settings.threshold : otsuThreshold(gray);
		for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
			const value = gray[j] >= threshold ? 255 : 0;
			data[i] = value;
			data[i + 1] = value;
			data[i + 2] = value;
		}
	}
	return image;
}
async function toBitmap(source) {
	if (typeof createImageBitmap === "function") return createImageBitmap(source);
	const url = URL.createObjectURL(source);
	try {
		return await new Promise((resolve, reject) => {
			const image = new Image();
			image.onload = () => resolve(image);
			image.onerror = reject;
			image.src = url;
		});
	} finally {
		setTimeout(() => URL.revokeObjectURL(url), 5e3);
	}
}
/** يعالج صورة كاملة ويعيدها كـ Blob (JPEG أو PNG للثنائي). */
async function processImageBlob(source, settings, maxWidth = 2400) {
	const bitmap = await toBitmap(source);
	const naturalWidth = "width" in bitmap ? bitmap.width : 0;
	const naturalHeight = "height" in bitmap ? bitmap.height : 0;
	const factor = Math.max(1, Math.min(2, settings.upscale ?? 1));
	const scale = Math.min(factor, maxWidth * factor / naturalWidth);
	const width = Math.max(1, Math.round(naturalWidth * scale));
	const height = Math.max(1, Math.round(naturalHeight * scale));
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) throw new Error("تعذّر تجهيز الصورة");
	context.imageSmoothingEnabled = true;
	context.imageSmoothingQuality = "high";
	context.drawImage(bitmap, 0, 0, width, height);
	if ("close" in bitmap) bitmap.close();
	if (!isDefaultProcess(settings)) {
		const imageData = context.getImageData(0, 0, width, height);
		applyProcess(imageData, settings);
		context.putImageData(imageData, 0, 0);
	}
	return {
		blob: await new Promise((resolve) => {
			canvas.toBlob((result) => resolve(result ?? new Blob()), settings.binarize || settings.adaptive ? "image/png" : "image/jpeg", .9);
		}),
		width,
		height
	};
}
async function blobToDataUrl(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}
// src/lib/source-catalog.ts
var KEY = "mu7rer:source-catalog";
var catalogId = () => crypto.randomUUID();
function listSources() {
	const raw = readStorage(KEY);
	if (!raw) return [];
	const parsed = JSON.parse(raw);
	if (!Array.isArray(parsed)) throw new Error("تعذّر قراءة فهرس الخزانة؛ لم يُستبدل المحتوى");
	return parsed;
}
function extendSource(existing, book, kind = "تحديث", inputs = [], outputs = [], settings) {
	const at = Date.now();
	const pages = new Map((existing?.pages ?? []).map((page) => [page.id, page]));
	book.pages.forEach((page) => pages.set(page.id, page));
	const operation = {
		id: catalogId(),
		kind,
		at,
		inputs,
		outputs,
		settings
	};
	return {
		id: book.id,
		title: book.title,
		witness: book.witness,
		kind: existing?.kind ?? "manuscript",
		files: existing?.files ?? [],
		originals: existing?.originals ?? [...book.pages],
		pages: [...pages.values()],
		createdAt: existing?.createdAt ?? book.createdAt,
		groups: [...existing?.groups ?? [], {
			id: operation.id,
			name: `${kind} · ${(existing?.groups.length ?? 0) + 1}`,
			book: structuredClone(book),
			at
		}],
		operations: [...existing?.operations ?? [], operation]
	};
}
function saveSource(source) {
	const all = listSources();
	writeStorage(KEY, JSON.stringify([source, ...all.filter((item) => item.id !== source.id)]));
}
function recordSource(book, kind, inputs = [], outputs = [], settings) {
	const source = extendSource(listSources().find((item) => item.id === book.id), book, kind, inputs, outputs, settings);
	saveSource(source);
	return source;
}
function renameGroup(sourceId, groupId, name) {
	const source = listSources().find((item) => item.id === sourceId);
	if (!source || !name.trim()) return;
	saveSource({
		...source,
		groups: source.groups.map((group) => group.id === groupId ? {
			...group,
			name: name.trim()
		} : group)
	});
}
function catalogOriginalBook(source) {
	const base = source.groups[0]?.book;
	return base ? {
		...base,
		pages: source.originals
	} : void 0;
}
function setSourceKind(sourceId, kind) {
	const source = listSources().find((item) => item.id === sourceId);
	if (source) saveSource({
		...source,
		kind
	});
}
// src/lib/books.ts
var id = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
var metaKey = (paneKey) => `mu7rer:book-meta:${paneKey}`;
var pageKey = (bookId, pageId) => `page:${bookId}:${pageId}`;
var ownedKey = (key) => getStorageOwner() ? `account:${getStorageOwner()}:${key}` : key;
async function storeOriginalFiles(book, files) {
	const owner = getStorageOwner();
	const entries = [];
	for (const file of files) {
		const fileId = catalogId();
		const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))).map((value) => value.toString(16).padStart(2, "0")).join("");
		if (owner) {
			const { error } = await supabase.storage.from("books").upload(`${owner}/${book.id}/original-${fileId}`, file);
			if (error) throw error;
		} else await idbSet(ownedKey(`original:${book.id}:${fileId}`), file);
		entries.push({
			id: fileId,
			name: file.name,
			size: file.size,
			type: file.type,
			digest
		});
	}
	return entries;
}
async function getOriginalFile(bookId, fileId) {
	const owner = getStorageOwner();
	if (owner) {
		const { data, error } = await supabase.storage.from("books").download(`${owner}/${bookId}/original-${fileId}`);
		if (error) throw error;
		return data;
	}
	return idbGet(ownedKey(`original:${bookId}:${fileId}`));
}
function loadBookMeta(paneKey) {
	try {
		const raw = readStorage(metaKey(paneKey));
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return {
			...parsed,
			process: {
				...DEFAULT_PROCESS,
				...parsed.process
			}
		};
	} catch {
		return null;
	}
}
function saveBookMeta(paneKey, book) {
	try {
		if (book) writeStorage(metaKey(paneKey), JSON.stringify(book));
		else removeStorage(metaKey(paneKey));
	} catch {
		throw new Error("تعذّر حفظ اختيار الكتاب؛ تحقق من مساحة التخزين");
	}
}
function newBook(title, witness = "الأصل") {
	return {
		id: id(),
		title,
		witness,
		pages: [],
		process: { ...DEFAULT_PROCESS },
		createdAt: Date.now()
	};
}
async function addPages(book, pages, originals = []) {
	const added = [];
	for (const page of pages) {
		const pid = id();
		if (page.pdfPage !== void 0) {
			const original = originals.find((file) => file.name === page.originalName);
			if (!original) throw new Error("ملف PDF الأصلي غير محفوظ؛ لم يُستورد الكتاب");
			added.push({
				id: pid,
				name: page.name,
				pdfFileId: original.id,
				pdfPage: page.pdfPage
			});
			continue;
		}
		const owner = getStorageOwner();
		if (owner) {
			const { error } = await supabase.storage.from("books").upload(`${owner}/${book.id}/${pid}`, page.blob);
			if (error) throw error;
		} else await idbSet(ownedKey(pageKey(book.id, pid)), page.blob);
		added.push({
			id: pid,
			name: page.name
		});
	}
	return {
		...book,
		pages: [...book.pages, ...added]
	};
}
async function getPageBlob(bookId, pageId) {
	const page = listSources().find((item) => item.id === bookId)?.pages.find((item) => item.id === pageId);
	if (page?.pdfFileId && page.pdfPage !== void 0) {
		const original = await getOriginalFile(bookId, page.pdfFileId);
		if (!original) throw new Error("تعذّر تحميل ملف PDF الأصلي");
		const { renderPdfPage } = await import("./pdf-page-CQ2rmz2B.js");
		return renderPdfPage(original, page.pdfPage);
	}
	const owner = getStorageOwner();
	const pk = pageKey(bookId, pageId);
	if (owner) {
		const { data, error } = await supabase.storage.from("books").download(`${owner}/${bookId}/${pageId}`);
		if (!error && data) return data;
		const local = await idbGet(ownedKey(pk));
		if (local) {
			supabase.storage.from("books").upload(`${owner}/${bookId}/${pageId}`, local).then(({ error: upError }) => {
				if (!upError) idbDelete(ownedKey(pk));
			});
			return local;
		}
		return;
	}
	return idbGet(pk);
}
async function removePage(book, pageId) {
	if (listSources().some((source) => source.id === book.id)) return {
		...book,
		pages: book.pages.filter((page) => page.id !== pageId)
	};
	const owner = getStorageOwner();
	if (owner) {
		const { error } = await supabase.storage.from("books").remove([`${owner}/${book.id}/${pageId}`]);
		if (error) throw error;
	}
	await idbDelete(pageKey(book.id, pageId));
	return {
		...book,
		pages: book.pages.filter((page) => page.id !== pageId)
	};
}
function adoptPaneBooks() {
	for (const paneKey of ["mu7rer:book-right", "mu7rer:book-left"]) {
		const book = loadBookMeta(paneKey);
		if (book && !listSources().some((source) => source.id === book.id)) recordSource(book, "استعادة مصدر سابق");
	}
}
/** ترقيم اللوحات على طريقة المخطوطات: 1أ، 1ب، 2أ … */
function plateLabel(index) {
	return `${Math.floor(index / 2) + 1}${index % 2 === 0 ? "أ" : "ب"}`;
}
// src/lib/pdf-reference.ts
function pdfPageReferences(name, total) {
	if (!Number.isInteger(total) || total < 1) throw new Error("عدد صفحات PDF غير صالح");
	const title = name.replace(/\.pdf$/i, "");
	return Array.from({ length: total }, (_, index) => ({
		name: `${title} — ص ${index + 1}`,
		pdfPage: index + 1,
		originalName: name
	}));
}
// src/lib/import-book.ts
var IMAGE_RE = /\.(png|jpe?g|webp|gif|bmp|tiff?|avif)$/i;
var naturalCompare = (a, b) => a.localeCompare(b, "en", {
	numeric: true,
	sensitivity: "base"
});
async function importPdf(file, onProgress) {
	const pdfjs = await import("pdfjs-dist");
	const workerUrl = (await import("./pdf.worker.min-Bkh8PfwT.js")).default;
	pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
	const buffer = await file.arrayBuffer();
	const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
	const total = (await loadingTask.promise).numPages;
	const pages = [];
	pages.push(...pdfPageReferences(file.name, total).map((page) => ({
		...page,
		blob: file
	})));
	onProgress?.(total, total, "فهرسة صفحات PDF دون تحويل");
	await loadingTask.destroy();
	return pages;
}
async function importZip(file, onProgress) {
	const zip = await (await import("jszip")).default.loadAsync(file);
	const entries = Object.values(zip.files).filter((entry) => !entry.dir && IMAGE_RE.test(entry.name)).sort((a, b) => naturalCompare(a.name, b.name));
	const pages = [];
	for (let index = 0; index < entries.length; index += 1) {
		const entry = entries[index];
		if (!entry) continue;
		const blob = await entry.async("blob");
		pages.push({
			name: entry.name.split("/").pop() ?? entry.name,
			blob
		});
		onProgress?.(index + 1, entries.length, "فك أرشيف الصور");
	}
	return pages;
}
/** يستورد قائمة ملفات (صور/PDF/ZIP/مجلد) ويعيدها صفحاتٍ مرتبة. */
async function importFilesToPages(files, onProgress) {
	const ordered = [...files].sort((a, b) => naturalCompare(a.webkitRelativePath || a.name, b.webkitRelativePath || b.name));
	const pages = [];
	const images = [];
	for (const file of ordered) if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) pages.push(...await importPdf(file, onProgress));
	else if (/\.(zip|cbz)$/i.test(file.name)) pages.push(...await importZip(file, onProgress));
	else if (file.type.startsWith("image/") || IMAGE_RE.test(file.name)) images.push({
		name: file.name,
		blob: file
	});
	if (images.length) {
		onProgress?.(images.length, images.length, "إضافة الصور");
		pages.push(...images);
	}
	return pages;
}
// src/components/ui/dialog.tsx
var Dialog = DialogPrimitive.Root;
var DialogPortal = DialogPrimitive.Portal;
var DialogOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(DialogPrimitive.Overlay, {
	ref,
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props
}));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
var DialogContent = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(DialogPortal, { children: [/* @__PURE__ */ jsx(DialogOverlay, {}), /* @__PURE__ */ jsxs(DialogPrimitive.Content, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props,
	children: [children, /* @__PURE__ */ jsxs(DialogPrimitive.Close, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
		children: [/* @__PURE__ */ jsx(X, { className: "h-4 w-4" }), /* @__PURE__ */ jsx("span", {
			className: "sr-only",
			children: "Close"
		})]
	})]
})] }));
DialogContent.displayName = DialogPrimitive.Content.displayName;
var DialogHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", {
	className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className),
	...props
});
DialogHeader.displayName = "DialogHeader";
var DialogFooter = ({ className, ...props }) => /* @__PURE__ */ jsx("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
DialogFooter.displayName = "DialogFooter";
var DialogTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(DialogPrimitive.Title, {
	ref,
	className: cn("text-lg font-semibold leading-none tracking-tight", className),
	...props
}));
DialogTitle.displayName = DialogPrimitive.Title.displayName;
var DialogDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(DialogPrimitive.Description, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
// src/components/workspace/SourceKindDialog.tsx
function SourceKindDialog({ open, onChoose, onCancel }) {
	return /* @__PURE__ */ jsx(Dialog, {
		open,
		onOpenChange: (value) => {
			if (!value) onCancel();
		},
		children: /* @__PURE__ */ jsxs(DialogContent, {
			dir: "rtl",
			className: "max-w-sm",
			"aria-describedby": void 0,
			children: [/* @__PURE__ */ jsx(DialogTitle, { children: "هل المصدر مخطوط أم مطبوع؟" }), /* @__PURE__ */ jsxs("div", {
				className: "flex gap-3",
				children: [/* @__PURE__ */ jsx(Button, {
					className: "flex-1",
					onClick: () => onChoose("manuscript"),
					children: "مخطوط"
				}), /* @__PURE__ */ jsx(Button, {
					className: "flex-1",
					variant: "secondary",
					onClick: () => onChoose("print"),
					children: "مطبوع"
				})]
			})]
		})
	});
}
// src/lib/records.ts
var newRecordId = () => `r${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
var recordLabel = (index) => `سجل ${Number(index + 1).toLocaleString("ar-EG")}`;
/** يضمن وجود سجل واحد على الأقل؛ المستند القديم بلا سجلات يصير سجلًا واحدًا بنصه الكامل. */
function ensureRecords(html, records) {
	const clean = (records ?? []).filter((record) => record && record.id && typeof record.html === "string");
	if (clean.length) return clean;
	return [{
		id: newRecordId(),
		label: recordLabel(0),
		html
	}];
}
/** يقسّم السجل عند المؤشر: قبل المؤشر يبقى في السجل، وبعده سجل جديد يحمل مراجع الوجه نفسه. */
function splitRecord(records, index, htmlBefore, htmlAfter) {
	const current = records[index];
	if (!current) return null;
	const next = {
		...current,
		id: newRecordId(),
		label: recordLabel(index + 1),
		html: htmlAfter,
		...current.rightPage !== void 0 ? { rightPage: current.rightPage } : {},
		...current.leftPage !== void 0 ? { leftPage: current.leftPage } : {}
	};
	const copy = [...records];
	copy[index] = {
		...current,
		html: htmlBefore
	};
	copy.splice(index + 1, 0, next);
	return copy;
}
/** يدمج السجل مع الذي يليه: النصان متتاليان ومراجع الوجه للأولى مقدَّمة. */
function mergeWithNext(records, index) {
	const current = records[index];
	const next = records[index + 1];
	if (!current || !next) return null;
	const merged = {
		...next,
		...current,
		id: current.id,
		label: current.label,
		html: `${current.html}${next.html}`,
		...current.rightPage !== void 0 || next.rightPage !== void 0 ? { rightPage: current.rightPage ?? next.rightPage } : {},
		...current.leftPage !== void 0 || next.leftPage !== void 0 ? { leftPage: current.leftPage ?? next.leftPage } : {}
	};
	const copy = [...records];
	copy.splice(index, 2, merged);
	return copy;
}
/** معرّفات علامات الحواشي الواردة في نص HTML لأي سجل (يعمل بلا متصفح). */
function markedNoteIds(html) {
	const ids = [];
	for (const match of html.matchAll(/data-note-id="([^"]+)"/g)) ids.push(match[1] ?? "");
	return ids;
}
/** معرّفات الحواشي المعلَّمة في سجلات غير السجل النشط، لئلا يُحذف نصها عند مزامنة سجل واحد. */
function externalMarkedIds(records, activeIndex) {
	const ids = /* @__PURE__ */ new Set();
	records.forEach((record, index) => {
		if (index === activeIndex) return;
		for (const id of markedNoteIds(record.html)) ids.add(id);
	});
	return [...ids];
}
/**
* يسيّل السجلات متصلة للطباعة والتصدير مع ترقيم حواشٍ موحّد واحد على مستوى
* الكتاب: العلامات تُرقَّم بترتيب ظهورها عبر كل السجلات مهما كان ما ظهر في
* كل سجل منفردًا، كما في الكتب المحققة.
*/
function assemblePrint(records, notes) {
	const printedLaneIds = new Set(notes.lanes.filter((lane) => lane.printed).map((lane) => lane.id));
	const order = [];
	const labelOf = /* @__PURE__ */ new Map();
	const parts = [];
	for (const record of records) {
		let html = record.html;
		if (typeof document === "undefined") {
			for (const id of markedNoteIds(html)) {
				if (!order.includes(id)) order.push(id);
				labelOf.set(id, String(order.indexOf(id) + 1));
			}
			html = html.replace(/(<[^>]+data-note-id="([^"]+)"[^>]*>)[\s\S]*?(<\/[^>]+>)/g, (_match, start, id, end) => `${start}${labelOf.get(id) ?? ""}${end}`);
		} else {
			const holder = document.createElement("div");
			holder.innerHTML = record.html;
			holder.querySelectorAll("[data-note-id]").forEach((mark) => {
				const id = mark.getAttribute("data-note-id") ?? "";
				if (!order.includes(id)) order.push(id);
				const label = String(order.indexOf(id) + 1);
				labelOf.set(id, label);
				mark.textContent = label;
			});
			html = holder.innerHTML;
		}
		parts.push(html);
	}
	const printedNotes = notes.notes.filter((note) => printedLaneIds.has(note.laneId) && order.includes(note.id)).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)).map((note) => ({
		id: note.id,
		laneId: note.laneId,
		label: labelOf.get(note.id) ?? note.label,
		text: note.text
	}));
	const memoLanes = notes.lanes.filter((lane) => lane.kind === "memo" && lane.printed && lane.memo.trim()).map((lane) => ({
		id: lane.id,
		name: lane.name,
		color: lane.color,
		memo: lane.memo
	}));
	return {
		html: parts.join(""),
		printedNotes,
		memoLanes
	};
}
/** Bind immutable faces without duplicating previously transcribed pages. */
function bindPageRecords(records, pane, sourceId, pages) {
	const sourceKey = pane === "right" ? "rightSourceId" : "leftSourceId";
	const pageKey = pane === "right" ? "rightPageId" : "leftPageId";
	const indexKey = pane === "right" ? "rightPage" : "leftPage";
	const next = records.map((record) => ({ ...record }));
	pages.forEach((page, index) => {
		if (next.some((record) => record[sourceKey] === sourceId && record[pageKey] === page.id)) return;
		const empty = next.length === 1 && !next[0]?.rightPageId && !next[0]?.leftPageId && !next[0]?.html.replace(/<[^>]*>/g, "").trim();
		const record = {
			...empty ? next[0] : void 0,
			id: empty ? next[0]?.id ?? newRecordId() : newRecordId(),
			label: page.name || recordLabel(index),
			html: empty ? next[0]?.html ?? "" : "",
			[sourceKey]: sourceId,
			[pageKey]: page.id,
			[indexKey]: index
		};
		if (empty) next[0] = record;
		else next.push(record);
	});
	return next;
}
// src/components/ui/select.tsx
var Select = SelectPrimitive.Root;
var SelectValue = SelectPrimitive.Value;
var SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SelectPrimitive.Trigger, {
	ref,
	className: cn("flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", className),
	...props,
	children: [children, /* @__PURE__ */ jsx(SelectPrimitive.Icon, {
		asChild: true,
		children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 opacity-50" })
	})]
}));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;
var SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.ScrollUpButton, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ jsx(ChevronUp, { className: "h-4 w-4" })
}));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;
var SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.ScrollDownButton, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4" })
}));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;
var SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Portal, { children: /* @__PURE__ */ jsxs(SelectPrimitive.Content, {
	ref,
	className: cn("relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)", position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className),
	position,
	...props,
	children: [
		/* @__PURE__ */ jsx(SelectScrollUpButton, {}),
		/* @__PURE__ */ jsx(SelectPrimitive.Viewport, {
			className: cn("p-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"),
			children
		}),
		/* @__PURE__ */ jsx(SelectScrollDownButton, {})
	]
}) }));
SelectContent.displayName = SelectPrimitive.Content.displayName;
var SelectLabel = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Label, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", className),
	...props
}));
SelectLabel.displayName = SelectPrimitive.Label.displayName;
var SelectItem = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SelectPrimitive.Item, {
	ref,
	className: cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ jsx("span", {
		className: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ jsx(SelectPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) })
	}), /* @__PURE__ */ jsx(SelectPrimitive.ItemText, { children })]
}));
SelectItem.displayName = SelectPrimitive.Item.displayName;
var SelectSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Separator, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
// src/lib/documents.ts
var DOCS_KEY = "mu7rer:docs";
var ACTIVE_KEY = "mu7rer:active-doc";
var LEGACY_KEY = "mu7rer:document";
var newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
function read$1() {
	if (typeof localStorage === "undefined") return [];
	try {
		const raw = readStorage(DOCS_KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
function write(docs) {
	try {
		writeStorage(DOCS_KEY, JSON.stringify(docs));
	} catch {}
}
function listDocs() {
	return read$1().sort((a, b) => b.updatedAt - a.updatedAt);
}
function getDoc(id) {
	return read$1().find((doc) => doc.id === id);
}
function createDoc(title = "مستند جديد", html = "") {
	const now = Date.now();
	const doc = {
		id: newId(),
		title,
		html,
		updatedAt: now,
		createdAt: now,
		versions: []
	};
	write([doc, ...read$1()]);
	setActiveDocId(doc.id);
	return doc;
}
function saveDoc(id, patch) {
	const docs = read$1();
	const index = docs.findIndex((doc) => doc.id === id);
	if (index === -1) return;
	const existing = docs[index];
	if (!existing) return;
	docs[index] = {
		...existing,
		...patch,
		updatedAt: Date.now()
	};
	write(docs);
}
/** يحفظ سجلات التحقيق للمستند (كل سجل وجه من المخطوط بنصه ومراجع صفحاته). */
function saveRecords(id, records) {
	const docs = read$1();
	const index = docs.findIndex((doc) => doc.id === id);
	if (index === -1) return;
	const existing = docs[index];
	if (!existing) return;
	docs[index] = {
		...existing,
		records,
		updatedAt: Date.now()
	};
	write(docs);
}
function snapshotVersion(id) {
	const docs = read$1();
	const index = docs.findIndex((doc) => doc.id === id);
	if (index === -1) return;
	const doc = docs[index];
	if (!doc) return;
	const last = doc.versions[0];
	if (last && last.html === doc.html) return;
	const versions = [{
		id: newId(),
		html: doc.html,
		createdAt: Date.now()
	}, ...doc.versions].slice(0, 25);
	docs[index] = {
		...doc,
		versions
	};
	write(docs);
}
function deleteDoc(id) {
	write(read$1().filter((doc) => doc.id !== id));
}
function duplicateDoc(id) {
	const source = getDoc(id);
	if (!source) return void 0;
	const copy = createDoc(`${source.title} — نسخة`, source.html);
	if (source.records?.length) saveRecords(copy.id, source.records);
	return copy;
}
function getActiveDocId() {
	try {
		return readStorage(ACTIVE_KEY);
	} catch {
		return null;
	}
}
function setActiveDocId(id) {
	try {
		writeStorage(ACTIVE_KEY, id);
	} catch {}
}
/** يهيّئ المكتبة عند أول تشغيل ويرحّل المستند القديم إن وُجد. */
function ensureActiveDoc() {
	const docs = read$1();
	const activeId = getActiveDocId();
	const active = docs.find((doc) => doc.id === activeId);
	if (active) return active;
	if (docs[0]) {
		setActiveDocId(docs[0].id);
		return docs[0];
	}
	let legacy = "";
	try {
		legacy = readStorage(LEGACY_KEY) ?? "";
	} catch {}
	return createDoc("مستندي الأول", legacy);
}
function formatWhen(timestamp) {
	const date = new Date(timestamp);
	const today = /* @__PURE__ */ new Date();
	const sameDay = date.toDateString() === today.toDateString();
	const time = date.toLocaleTimeString("ar-EG", {
		hour: "2-digit",
		minute: "2-digit"
	});
	return sameDay ? `اليوم ${time}` : `${date.toLocaleDateString("ar-EG")} ${time}`;
}
function htmlToPlainText(html) {
	if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ");
	const holder = document.createElement("div");
	holder.innerHTML = html;
	return holder.textContent ?? "";
}
// src/lib/page-transcripts.ts
var TEXTS = "mu7rer:page-transcripts";
var ASSEMBLIES = "mu7rer:text-assemblies";
function read(key) {
	const raw = readStorage(key);
	if (!raw) return [];
	const parsed = JSON.parse(raw);
	if (!Array.isArray(parsed)) throw new Error("تعذّر قراءة النصوص المحفوظة؛ لم تُستبدل البيانات");
	return parsed;
}
var listTranscripts = () => read(TEXTS);
var listAssemblies = () => read(ASSEMBLIES);
var currentRevision = (page) => page?.revisions.at(-1);
var isApproved = (page) => Boolean(page?.approvedId && page.approvedId === currentRevision(page)?.id);
function reviseTranscript(previous, sourceId, pageId, text, method, raw = text) {
	return {
		sourceId,
		pageId,
		revisions: [...previous?.revisions ?? [], {
			id: crypto.randomUUID(),
			text,
			raw,
			method,
			at: Date.now()
		}],
		...previous?.approvedId ? { approvedId: previous.approvedId } : {}
	};
}
function putTranscript(page) {
	const all = listTranscripts();
	writeStorage(TEXTS, JSON.stringify([...all.filter((item) => item.sourceId !== page.sourceId || item.pageId !== page.pageId), page]));
	return page;
}
function saveTranscript(sourceId, pageId, text, method = "manual", raw) {
	const old = listTranscripts().find((item) => item.sourceId === sourceId && item.pageId === pageId);
	return putTranscript(reviseTranscript(old, sourceId, pageId, text, method, raw ?? (method === "manual" ? currentRevision(old)?.raw ?? text : text)));
}
function approveTranscript(sourceId, pageId) {
	const page = listTranscripts().find((item) => item.sourceId === sourceId && item.pageId === pageId);
	const revision = currentRevision(page);
	if (!page || !revision?.text.trim()) throw new Error("احفظ نص الصفحة قبل اعتماده");
	return putTranscript({
		...page,
		approvedId: revision.id
	});
}
function recordTranscriptError(sourceId, pageId, error) {
	putTranscript({
		sourceId,
		pageId,
		revisions: [],
		...listTranscripts().find((item) => item.sourceId === sourceId && item.pageId === pageId),
		error
	});
}
function prepareAssembly(sourceId, groupPages, orderedIds, transcripts) {
	if (!orderedIds.length) throw new Error("اختر صفحات للتجميع");
	if (new Set(orderedIds).size !== orderedIds.length) throw new Error("صفحة مكررة في التجميع");
	const inputs = orderedIds.map((pageId) => {
		const original = groupPages.find((item) => item.id === pageId);
		const page = transcripts.find((item) => item.sourceId === sourceId && item.pageId === pageId);
		const revision = currentRevision(page);
		if (!original) throw new Error("صفحة ليست ضمن المجموعة المختارة");
		if (!isApproved(page) || !revision) throw new Error(`الصفحة «${original.name}» غير معتمدة`);
		return {
			pageId,
			revisionId: revision.id,
			name: original.name,
			text: revision.text
		};
	});
	return {
		inputs,
		excluded: groupPages.filter((page) => !orderedIds.includes(page.id)).map((page) => page.id),
		text: inputs.map((input) => input.text).join("\n\n")
	};
}
function boundaryWarnings(inputs) {
	const warnings = [];
	inputs.slice(1).forEach((next, index) => {
		const previous = inputs[index];
		if (!previous) return;
		const tail = previous.text.trim().split(/\s+/).slice(-8);
		const head = next.text.trim().split(/\s+/).slice(0, 8);
		for (let count = Math.min(tail.length, head.length); count >= 3; count--) if (tail.slice(-count).join(" ") === head.slice(0, count).join(" ")) {
			warnings.push(`${previous.name} ← ${next.name}: ${head.slice(0, count).join(" ")}`);
			break;
		}
	});
	return warnings;
}
var escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function assembleText(sourceId, groupId, title, groupPages, ids, decision, boundaryDecision, showLabels) {
	const prepared = prepareAssembly(sourceId, groupPages, ids, listTranscripts());
	if (prepared.excluded.length && !decision.trim()) throw new Error("سجّل سبب التجميع الجزئي واستبعاد الصفحات");
	if (boundaryWarnings(prepared.inputs).length && !boundaryDecision.trim()) throw new Error("راجع تكرار حدود الصفحات وسجّل قرارك");
	const signature = JSON.stringify({
		sourceId,
		groupId,
		inputs: prepared.inputs,
		excluded: prepared.excluded,
		decision,
		boundaryDecision,
		showLabels
	});
	const all = listAssemblies();
	const previous = all.find((item) => item.signature === signature && getDoc(item.docId));
	if (previous) return previous;
	const html = prepared.inputs.map((input) => `${showLabels ? `<p>[${escape(input.name)}]</p>` : ""}${input.text.split(/\n\n/).map((block) => `<p>${escape(block).replace(/\n/g, "<br>")}</p>`).join("")}`).join("");
	const doc = createDoc(`${title} — تجميع ${prepared.excluded.length ? "جزئي" : "معتمد"}`, html);
	saveRecords(doc.id, prepared.inputs.map((input) => ({
		id: newRecordId(),
		label: input.name,
		html: input.text.split(/\n\n/).map((block) => `<p>${escape(block).replace(/\n/g, "<br>")}</p>`).join(""),
		rightSourceId: sourceId,
		rightPageId: input.pageId,
		rightPage: groupPages.findIndex((page) => page.id === input.pageId)
	})));
	snapshotVersion(doc.id);
	saveDoc(doc.id, { html });
	const assembly = {
		id: crypto.randomUUID(),
		sourceId,
		groupId,
		...prepared,
		decision,
		boundaryDecision,
		docId: doc.id,
		at: Date.now(),
		signature
	};
	writeStorage(ASSEMBLIES, JSON.stringify([...all, assembly]));
	return assembly;
}
// src/components/workspace/PageReview.tsx
function PageReview({ initialSourceId, initialPageIds, onOpenDocument, onInsert, onTranscript }) {
	const [sources, setSources] = useState([]);
	const [sourceId, setSourceId] = useState(initialSourceId ?? "");
	const [groupId, setGroupId] = useState("original");
	const [pageId, setPageId] = useState(initialPageIds?.[0] ?? "");
	const [selected, setSelected] = useState(initialPageIds ?? []);
	const [transcripts, setTranscripts] = useState([]);
	const [text, setText] = useState("");
	const [image, setImage] = useState("");
	const [imageError, setImageError] = useState("");
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState("");
	const [decision, setDecision] = useState("");
	const [boundaryDecision, setBoundaryDecision] = useState("");
	const [labels, setLabels] = useState(false);
	const [preview, setPreview] = useState(false);
	const [history, setHistory] = useState(listAssemblies);
	const stop = useRef(false);
	const refresh = () => {
		setTranscripts(listTranscripts());
		setHistory(listAssemblies());
	};
	useEffect(() => {
		try {
			const all = listSources();
			setSources(all);
			refresh();
			const source = all.find((item) => item.id === initialSourceId) ?? all[0];
			if (!source) return;
			setSourceId(source.id);
			const latestGroup = initialPageIds?.length ? [...source.groups].reverse().find((item) => initialPageIds.every((id) => item.book.pages.some((page) => page.id === id))) : void 0;
			setGroupId(latestGroup?.id ?? "original");
			setPageId(initialPageIds?.[0] ?? source.originals[0]?.id ?? "");
		} catch (error) {
			toast.error(String(error));
		}
		return () => {
			stop.current = true;
		};
	}, []);
	useEffect(() => {
		const update = () => {
			try {
				setSources(listSources());
			} catch (error) {
				toast.error(String(error));
			}
		};
		window.addEventListener("workspace-change", update);
		return () => window.removeEventListener("workspace-change", update);
	}, []);
	const source = sources.find((item) => item.id === sourceId);
	const book = source ? groupId === "original" ? catalogOriginalBook(source) : source.groups.find((item) => item.id === groupId)?.book : void 0;
	const page = book?.pages.find((item) => item.id === pageId);
	const transcript = transcripts.find((item) => item.sourceId === sourceId && item.pageId === pageId);
	const revision = currentRevision(transcript);
	const dirty = text !== (revision?.text ?? "");
	useEffect(() => {
		setText(revision?.text ?? "");
	}, [
		sourceId,
		pageId,
		revision?.id
	]);
	useEffect(() => {
		let live = true;
		let url = "";
		setImage("");
		setImageError("");
		if (sourceId && pageId) getPageBlob(sourceId, pageId).then((blob) => {
			if (!live) return;
			if (!blob) {
				setImageError("صورة الصفحة غير متوفرة");
				return;
			}
			url = URL.createObjectURL(blob);
			setImage(url);
		}).catch(() => {
			if (live) setImageError("تعذّر تحميل صورة الصفحة");
		});
		return () => {
			live = false;
			if (url) URL.revokeObjectURL(url);
		};
	}, [sourceId, pageId]);
	const canLeave = () => !dirty || window.confirm("النص غير محفوظ؛ هل تريد ترك التعديلات؟");
	const save = (approve = false) => {
		if (!sourceId || !pageId) return;
		try {
			if (dirty || !revision) saveTranscript(sourceId, pageId, text);
			if (approve) approveTranscript(sourceId, pageId);
			refresh();
			setPreview(false);
			toast.success(approve ? "اعتمدت الصفحة" : "حُفظت مسودة الصفحة");
		} catch (error) {
			toast.error(String(error));
		}
	};
	const transcribe = async () => {
		if (!source || !selected.length || busy || !canLeave()) return;
		setBusy(true);
		stop.current = false;
		let failures = 0;
		try {
			for (const [index, id] of selected.entries()) {
				if (stop.current) break;
				setProgress(`${index + 1} / ${selected.length}`);
				try {
					const blob = await getPageBlob(source.id, id);
					if (!blob) throw new Error("صورة الصفحة غير متوفرة");
					const result = await aiRequest({
						task: "transcribe",
						image: await blobToDataUrl(blob),
						instruction: "انسخ النص الموجود في هذه الصفحة وحدها دون استكمال أو تخمين النص المفقود."
					});
					if (stop.current) break;
					saveTranscript(source.id, id, result, "ocr");
					onTranscript?.(source.id, id, result);
				} catch (error) {
					if (stop.current) break;
					failures++;
					recordTranscriptError(source.id, id, error instanceof Error ? error.message : "تعذّر النسخ");
					break;
				}
				refresh();
			}
			if (!stop.current) toast[failures ? "error" : "success"](failures ? `تعذّر نسخ ${failures} صفحة؛ حُفظت الصفحات الناجحة` : "حُفظت المسودات للمراجعة دون إدراجها في المتن");
		} finally {
			setBusy(false);
			setProgress("");
		}
	};
	let prepared;
	let assemblyError = "";
	if (book && selected.length) try {
		prepared = prepareAssembly(sourceId, book.pages, selected, transcripts);
	} catch (error) {
		assemblyError = error instanceof Error ? error.message : String(error);
	}
	const warnings = prepared ? boundaryWarnings(prepared.inputs) : [];
	const move = (index, delta) => {
		const next = [...selected];
		const target = index + delta;
		const current = next[index];
		const other = next[target];
		if (!current || !other) return;
		next[index] = other;
		next[target] = current;
		setSelected(next);
		setPreview(false);
	};
	const changeGroup = (id) => {
		if (!canLeave() || !source) return;
		const nextBook = id === "original" ? catalogOriginalBook(source) : source.groups.find((item) => item.id === id)?.book;
		setGroupId(id);
		setSelected([]);
		setPageId(nextBook?.pages[0]?.id ?? "");
		setPreview(false);
		setDecision("");
		setBoundaryDecision("");
	};
	return /* @__PURE__ */ jsxs("section", {
		dir: "rtl",
		"aria-label": "مراجعة نصوص الصفحات",
		className: "min-w-0 space-y-4",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex flex-wrap items-center gap-2 border-b pb-3",
			children: [
				/* @__PURE__ */ jsx("h2", {
					className: "me-auto text-sm font-semibold",
					children: "نصوص الصفحات"
				}),
				/* @__PURE__ */ jsxs(Select, {
					value: sourceId,
					disabled: busy,
					onValueChange: (id) => {
						if (!canLeave()) return;
						const next = sources.find((item) => item.id === id);
						setSourceId(id);
						setGroupId("original");
						setPageId(next?.originals[0]?.id ?? "");
						setSelected([]);
						setPreview(false);
						setDecision("");
						setBoundaryDecision("");
					},
					children: [/* @__PURE__ */ jsx(SelectTrigger, {
						"aria-label": "مصدر نصوص الصفحات",
						className: "w-48 max-w-full text-xs",
						children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "المصدر" })
					}), /* @__PURE__ */ jsx(SelectContent, { children: sources.map((item) => /* @__PURE__ */ jsx(SelectItem, {
						value: item.id,
						children: item.title
					}, item.id)) })]
				}),
				/* @__PURE__ */ jsxs(Select, {
					value: groupId,
					disabled: busy,
					onValueChange: changeGroup,
					children: [/* @__PURE__ */ jsx(SelectTrigger, {
						"aria-label": "مجموعة نصوص الصفحات",
						className: "w-48 max-w-full text-xs",
						children: /* @__PURE__ */ jsx(SelectValue, {})
					}), /* @__PURE__ */ jsxs(SelectContent, { children: [/* @__PURE__ */ jsx(SelectItem, {
						value: "original",
						children: "الأصل المحفوظ"
					}), source?.groups.map((item) => /* @__PURE__ */ jsx(SelectItem, {
						value: item.id,
						children: item.name
					}, item.id))] })]
				})
			]
		}), !book?.pages.length ? /* @__PURE__ */ jsx("p", {
			className: "text-xs text-muted-foreground",
			children: "لا صفحات محفوظة في هذه المجموعة."
		}) : /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsxs("div", {
				className: "grid min-w-0 gap-3 lg:grid-cols-[190px_minmax(0,1fr)]",
				children: [/* @__PURE__ */ jsx("div", {
					className: "max-h-96 overflow-auto border-e pe-2 max-lg:max-h-40 max-lg:border-e-0",
					children: book.pages.map((item, index) => {
						const draft = transcripts.find((entry) => entry.sourceId === sourceId && entry.pageId === item.id);
						const status = draft?.error ? "خطأ في النسخ" : isApproved(draft) ? "معتمدة" : currentRevision(draft) ? draft?.approvedId ? "تحتاج مراجعة" : "مسودة" : "لم تُنسخ";
						return /* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2 border-b py-1",
							children: [/* @__PURE__ */ jsx(Checkbox, {
								"aria-label": `اختيار الصفحة ${index + 1}`,
								disabled: busy,
								checked: selected.includes(item.id),
								onCheckedChange: (value) => {
									setSelected((old) => value === true ? [...old, item.id] : old.filter((id) => id !== item.id));
									setPreview(false);
								}
							}), /* @__PURE__ */ jsx(Button, {
								variant: item.id === pageId ? "secondary" : "ghost",
								className: "h-auto min-h-10 min-w-0 flex-1 justify-start whitespace-normal px-2 text-start",
								disabled: busy,
								onClick: () => {
									if (canLeave()) setPageId(item.id);
								},
								children: /* @__PURE__ */ jsxs("span", {
									className: "min-w-0",
									children: [/* @__PURE__ */ jsxs("span", {
										className: "block break-words text-xs",
										children: [
											index + 1,
											" · ",
											item.name
										]
									}), /* @__PURE__ */ jsx("span", {
										className: "text-[10px] text-muted-foreground",
										children: status
									})]
								})
							})]
						}, item.id);
					})
				}), /* @__PURE__ */ jsxs("div", {
					className: "min-w-0",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "mb-2 flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "me-auto break-words text-xs font-semibold",
									children: page?.name
								}),
								/* @__PURE__ */ jsxs(Button, {
									size: "sm",
									variant: "outline",
									disabled: busy || !text.trim(),
									onClick: () => save(),
									children: [/* @__PURE__ */ jsx(Save, { className: "size-3.5" }), "حفظ المسودة"]
								}),
								/* @__PURE__ */ jsxs(Button, {
									size: "sm",
									disabled: busy || !text.trim(),
									onClick: () => save(true),
									children: [/* @__PURE__ */ jsx(Check, { className: "size-3.5" }), "اعتماد الصفحة"]
								})
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "grid min-w-0 gap-3 sm:grid-cols-2",
							children: [/* @__PURE__ */ jsx("div", {
								className: "flex h-80 min-w-0 items-center justify-center overflow-auto border bg-muted/30 sm:h-96",
								children: image ? /* @__PURE__ */ jsx("img", {
									src: image,
									alt: `أصل الصفحة ${page?.name ?? ""}`,
									className: "h-full w-full object-contain"
								}) : /* @__PURE__ */ jsx("span", {
									className: "text-xs text-muted-foreground",
									children: imageError || "جارٍ تحميل الصورة…"
								})
							}), /* @__PURE__ */ jsx("textarea", {
								"aria-label": "نص مراجعة الصفحة",
								value: text,
								disabled: busy,
								onChange: (event) => {
									setText(event.target.value);
									setPreview(false);
								},
								placeholder: "نص الصفحة…",
								className: "h-80 min-w-0 w-full resize-none rounded-md border bg-background p-3 font-serif text-base leading-8 outline-none focus:border-ring sm:h-96"
							})]
						}),
						transcript?.error && /* @__PURE__ */ jsx("p", {
							role: "alert",
							className: "mt-2 break-words text-xs text-destructive",
							children: transcript.error
						}),
						/* @__PURE__ */ jsxs("details", {
							className: "mt-3 text-xs",
							children: [/* @__PURE__ */ jsxs("summary", {
								className: "cursor-pointer text-muted-foreground",
								children: [
									"النسخ المحفوظة · ",
									transcript?.revisions.length ?? 0,
									dirty ? " · تعديلات غير محفوظة" : ""
								]
							}), [...transcript?.revisions ?? []].reverse().map((item) => /* @__PURE__ */ jsxs("div", {
								className: "mt-2 border-t pt-2",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex flex-wrap items-center gap-2",
										children: [/* @__PURE__ */ jsxs("span", {
											className: "me-auto",
											children: [
												new Date(item.at).toLocaleString("ar"),
												" · ",
												item.method === "ocr" ? "نسخ آلي" : "مراجعة يدوية",
												item.id === transcript?.approvedId ? " · معتمدة" : ""
											]
										}), /* @__PURE__ */ jsx(Button, {
											size: "sm",
											variant: "ghost",
											disabled: busy,
											onClick: () => {
												if (canLeave()) setText(item.text);
											},
											children: "استعادة للمراجعة"
										})]
									}),
									/* @__PURE__ */ jsx("p", {
										className: "max-h-24 overflow-auto whitespace-pre-wrap font-serif leading-6",
										children: item.text
									}),
									item.method === "ocr" && /* @__PURE__ */ jsxs("details", { children: [/* @__PURE__ */ jsx("summary", {
										className: "cursor-pointer text-muted-foreground",
										children: "القراءة الآلية الأصلية"
									}), /* @__PURE__ */ jsx("p", {
										className: "whitespace-pre-wrap leading-6",
										children: item.raw
									})] })
								]
							}, item.id))]
						})
					]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "border-t pt-3",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [
							/* @__PURE__ */ jsxs("h3", {
								className: "me-auto text-xs font-semibold",
								children: ["المختارات · ", selected.length]
							}),
							/* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "outline",
								disabled: busy,
								onClick: () => {
									setSelected(book.pages.filter((item) => isApproved(transcripts.find((entry) => entry.sourceId === sourceId && entry.pageId === item.id))).map((item) => item.id));
									setPreview(false);
								},
								children: "اختيار المعتمد"
							}),
							/* @__PURE__ */ jsxs(Button, {
								size: "sm",
								variant: "outline",
								disabled: busy || !selected.length,
								onClick: () => void transcribe(),
								children: [
									busy ? /* @__PURE__ */ jsx(Loader2, { className: "size-3.5 animate-spin" }) : /* @__PURE__ */ jsx(ScanText, { className: "size-3.5" }),
									"نسخ المختارات ",
									progress
								]
							}),
							busy && /* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "ghost",
								onClick: () => {
									stop.current = true;
								},
								children: "إيقاف"
							})
						]
					}),
					/* @__PURE__ */ jsx("ol", {
						className: "mt-2 grid gap-x-3 sm:grid-cols-2",
						children: selected.map((id, index) => /* @__PURE__ */ jsxs("li", {
							className: "flex min-w-0 items-center gap-1 border-b py-1",
							children: [
								/* @__PURE__ */ jsxs("span", {
									className: "min-w-0 flex-1 break-words text-xs",
									children: [
										index + 1,
										" · ",
										book.pages.find((item) => item.id === id)?.name
									]
								}),
								/* @__PURE__ */ jsx(Button, {
									size: "icon",
									variant: "ghost",
									className: "size-7",
									"aria-label": `تقديم المختارة ${index + 1}`,
									disabled: busy || index === 0,
									onClick: () => move(index, -1),
									children: /* @__PURE__ */ jsx(ArrowUp, { className: "size-3.5" })
								}),
								/* @__PURE__ */ jsx(Button, {
									size: "icon",
									variant: "ghost",
									className: "size-7",
									"aria-label": `تأخير المختارة ${index + 1}`,
									disabled: busy || index === selected.length - 1,
									onClick: () => move(index, 1),
									children: /* @__PURE__ */ jsx(ArrowDown, { className: "size-3.5" })
								})
							]
						}, id))
					}),
					assemblyError && /* @__PURE__ */ jsx("p", {
						className: "mt-2 text-xs text-destructive",
						children: assemblyError
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-3 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ jsxs(Button, {
							size: "sm",
							disabled: busy || dirty || !prepared,
							variant: "secondary",
							onClick: () => setPreview(true),
							children: [/* @__PURE__ */ jsx(FileText, { className: "size-3.5" }), "معاينة التجميع"]
						}), onInsert && /* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "outline",
							disabled: busy || dirty || !isApproved(transcript) || !revision,
							onClick: () => {
								if (revision) onInsert(revision.text);
							},
							children: "إدراج الصفحة المعتمدة عند المؤشر"
						})]
					}),
					preview && prepared && /* @__PURE__ */ jsxs("div", {
						className: "mt-3 space-y-3 border-t pt-3",
						children: [
							/* @__PURE__ */ jsxs("p", {
								className: "text-xs",
								children: [
									prepared.inputs.length,
									" صفحة معتمدة · ",
									prepared.excluded.length,
									" صفحة مستبعدة"
								]
							}),
							prepared.excluded.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("p", {
								className: "break-words text-xs text-muted-foreground",
								children: ["المستبعدة: ", book.pages.filter((item) => prepared.excluded.includes(item.id)).map((item) => item.name).join("، ")]
							}), /* @__PURE__ */ jsx(Input, {
								"aria-label": "سبب التجميع الجزئي",
								placeholder: "سبب استبعاد الصفحات / التجميع الجزئي",
								value: decision,
								onChange: (event) => setDecision(event.target.value)
							})] }),
							warnings.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
								/* @__PURE__ */ jsx("p", {
									className: "text-xs font-semibold text-destructive",
									children: "تكرار محتمل عند حدود الصفحات"
								}),
								warnings.map((warning) => /* @__PURE__ */ jsx("p", {
									className: "break-words font-serif text-sm",
									children: warning
								}, warning)),
								/* @__PURE__ */ jsx(Input, {
									"aria-label": "قرار حدود الصفحات",
									placeholder: "قرار المراجعة؛ لن يُحذف أي نص تلقائيًا",
									value: boundaryDecision,
									onChange: (event) => setBoundaryDecision(event.target.value)
								})
							] }),
							/* @__PURE__ */ jsxs("label", {
								className: "flex items-center gap-2 text-xs",
								children: [/* @__PURE__ */ jsx(Checkbox, {
									checked: labels,
									onCheckedChange: (value) => setLabels(value === true)
								}), "إضافة أسماء الصفحات بين النصوص"]
							}),
							/* @__PURE__ */ jsx("pre", {
								className: "max-h-60 overflow-auto whitespace-pre-wrap border bg-muted/20 p-3 font-serif text-sm leading-7",
								children: prepared.text
							}),
							/* @__PURE__ */ jsx(Button, {
								size: "sm",
								disabled: prepared.excluded.length > 0 && !decision.trim() || warnings.length > 0 && !boundaryDecision.trim(),
								onClick: () => {
									try {
										const result = assembleText(sourceId, groupId, source?.title ?? "نص", book.pages, selected, decision, boundaryDecision, labels);
										refresh();
										toast.success("حُفظ التجميع في مستند مستقل");
										onOpenDocument(result.docId);
									} catch (error) {
										toast.error(String(error));
									}
								},
								children: "حفظ التجميع وفتح المتن"
							})
						]
					})
				]
			}),
			history.filter((item) => item.sourceId === sourceId).length > 0 && /* @__PURE__ */ jsxs("details", {
				className: "border-t pt-3 text-xs",
				children: [/* @__PURE__ */ jsx("summary", {
					className: "cursor-pointer font-semibold",
					children: "التجميعات المحفوظة"
				}), history.filter((item) => item.sourceId === sourceId).map((item) => /* @__PURE__ */ jsxs("div", {
					className: "flex flex-wrap items-center gap-2 border-b py-2",
					children: [
						/* @__PURE__ */ jsxs("span", {
							className: "me-auto",
							children: [
								item.inputs.length,
								" صفحة · ",
								item.excluded.length ? "جزئي" : "معتمد",
								" · ",
								new Date(item.at).toLocaleString("ar")
							]
						}),
						/* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "outline",
							onClick: () => onOpenDocument(item.docId),
							children: "فتح المتن"
						}),
						/* @__PURE__ */ jsxs("details", {
							className: "w-full",
							children: [
								/* @__PURE__ */ jsx("summary", {
									className: "cursor-pointer text-muted-foreground",
									children: "سجل التجميع"
								}),
								/* @__PURE__ */ jsx("p", {
									className: "mt-2 break-words",
									children: item.inputs.map((input) => input.name).join(" ← ")
								}),
								/* @__PURE__ */ jsxs("p", { children: [
									item.decision,
									" ",
									item.boundaryDecision
								] })
							]
						})
					]
				}, item.id))]
			})
		] })]
	});
}
export { DEFAULT_PROCESS as $, SourceKindDialog as A, getPageBlob as B, assemblePrint as C, markedNoteIds as D, externalMarkedIds as E, DialogTitle as F, saveBookMeta as G, newBook as H, importFilesToPages as I, listSources as J, storeOriginalFiles as K, addPages as L, DialogContent as M, DialogDescription as N, mergeWithNext as O, DialogHeader as P, setSourceKind as Q, adoptPaneBooks as R, SelectValue as S, ensureRecords as T, plateLabel as U, loadBookMeta as V, removePage as W, renameGroup as X, recordSource as Y, saveSource as Z, snapshotVersion as _, createDoc as a, idbSet as at, SelectItem as b, ensureActiveDoc as c, getGeminiKey as ct, getDoc as d, PROCESS_PRESETS as et, htmlToPlainText as f, setActiveDocId as g, saveRecords as h, listTranscripts as i, idbGet as it, Dialog as j, splitRecord as k, formatWhen as l, normalizeGeminiKey as lt, saveDoc as m, currentRevision as n, processImageBlob as nt, deleteDoc as o, Checkbox as ot, listDocs as p, catalogOriginalBook as q, listAssemblies as r, idbDelete as rt, duplicateDoc as s, aiRequest as st, PageReview as t, blobToDataUrl as tt, getActiveDocId as u, saveGeminiKey as ut, Select as v, bindPageRecords as w, SelectTrigger as x, SelectContent as y, getOriginalFile as z };
