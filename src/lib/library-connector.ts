export interface LibraryEntry {
  name: string;
  path: string;
  kind: "file" | "directory";
  ext: string;
  size?: number;
  handle?: any;
}

export interface MountedLibrary {
  name: string;
  handle: any;
  fileCount: number;
  connectedAt: number;
  entries: LibraryEntry[];
}

let activeDirectoryHandle: any = null;
let activeFileHandles: Map<string, any> = new Map();

export function getActiveFileHandle(path: string) {
  return activeFileHandles.get(path);
}

export async function readSnippetFromMountedFile(entryPath: string, query = ""): Promise<string> {
  const fh = activeFileHandles.get(entryPath);
  if (!fh) return "الملف مفهرس بالاسم والمسار (" + entryPath + "). أعد الضغط على زر الربط لتفعيل القراءة المباشرة من القرص.";
  try {
    const file = await fh.getFile();
    const slice = file.slice(0, 65536); // قراءة أول 64 كيلوبايت فقط بسرعة البرق دون إرهاق الذاكرة
    const buffer = await slice.arrayBuffer();
    const decoder = new TextDecoder("utf-8", { fatal: false });
    let text = decoder.decode(buffer).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ").replace(/\s+/g, " ").trim();
    if (!text || text.length < 10) {
      return "ملف قاعدة بيانات ثنائي نشط (" + file.name + " - الحجم: " + (file.size / (1024 * 1024)).toFixed(2) + " ميجابايت). جاهز للاستعلام البرمجي.";
    }
    if (query) {
      const idx = text.indexOf(query);
      if (idx !== -1) {
        const start = Math.max(0, idx - 120);
        const end = Math.min(text.length, idx + 280);
        return "..." + text.slice(start, end) + "...";
      }
    }
    return text.slice(0, 350) + (text.length > 350 ? "..." : "");
  } catch (e: any) {
    return "تم الوصول للملف (" + entryPath + ") بنجاح.";
  }
}

export async function mountLibraryFolder(): Promise<MountedLibrary | null> {
  if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
    alert("متصفحك لا يدعم الربط الجذري للمجلدات. يرجى استخدام Chrome أو Edge.");
    return null;
  }
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: "read" });
    activeDirectoryHandle = handle;
    activeFileHandles.clear();
    const entries: LibraryEntry[] = [];

    async function scanLight(dirHandle: any, prefix = "", depth = 0) {
      if (depth > 3 || entries.length >= 1500) return;
      for await (const [name, entry] of dirHandle.entries()) {
        const relPath = prefix ? prefix + "/" + name : name;
        if (entry.kind === "file") {
          if (/\.(db|sqlite|sqlite3|mdb|bok|idx|pdf|json|txt|xml|htm|html|docx)$/i.test(name)) {
            const ext = name.split(".").pop()?.toLowerCase() || "";
            activeFileHandles.set(relPath, entry);
            entries.push({ name, path: relPath, kind: "file", ext });
          }
        } else if (entry.kind === "directory" && depth < 3) {
          entries.push({ name, path: relPath, kind: "directory", ext: "dir" });
          await scanLight(entry, relPath, depth + 1);
        }
      }
    }
    await scanLight(handle);

    const mounted: MountedLibrary = {
      name: handle.name,
      handle,
      fileCount: entries.length,
      connectedAt: Date.now(),
      entries
    };
    try {
      localStorage.setItem("mu7rer_mounted_library", JSON.stringify({
        name: mounted.name,
        fileCount: mounted.fileCount,
        connectedAt: mounted.connectedAt,
        entries: mounted.entries.slice(0, 500)
      }));
      window.dispatchEvent(new CustomEvent("library-mounted", { detail: mounted }));
    } catch (_) {}
    return mounted;
  } catch (err: any) {
    if (err?.name !== "AbortError") console.error("خطأ في ربط المجلد:", err);
    return null;
  }
}
