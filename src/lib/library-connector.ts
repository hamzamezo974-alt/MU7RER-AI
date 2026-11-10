export interface MountedLibrary {
  name: string;
  handle: FileSystemDirectoryHandle;
  fileCount: number;
  connectedAt: number;
  entries: { name: string; path: string; kind: string }[];
}

export async function mountLibraryFolder(): Promise<MountedLibrary | null> {
  if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
    alert("متصفحك لا يدعم الربط الجذري للمجلدات. يرجى استخدام متصفح حديث مثل Chrome أو Edge.");
    return null;
  }
  try {
    // يفتح نافذة اختيار المجلد الجذري (Select Folder) بضغطة واحدة دون فتح متسلسل
    const handle = await (window as any).showDirectoryPicker({ mode: "read" });
    const entries: { name: string; path: string; kind: string }[] = [];
    
    // مسح صامت وسريع للمستوى الأول والثاني فقط دون تحميل الملفات في الذاكرة
    async function scanLight(dirHandle: any, prefix = "", depth = 0) {
      if (depth > 2 || entries.length >= 500) return;
      for await (const [name, entry] of dirHandle.entries()) {
        const relPath = prefix ? prefix + "/" + name : name;
        if (entry.kind === "file") {
          if (/\.(db|sqlite|sqlite3|mdb|bok|pdf|json|txt)$/i.test(name)) {
            entries.push({ name, path: relPath, kind: "file" });
          }
        } else if (entry.kind === "directory" && depth < 2) {
          entries.push({ name, path: relPath, kind: "directory" });
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
        entries: mounted.entries.slice(0, 100)
      }));
      window.dispatchEvent(new CustomEvent("library-mounted", { detail: mounted }));
    } catch (_) {}
    return mounted;
  } catch (err: any) {
    if (err?.name !== "AbortError") console.error("خطأ في ربط المجلد:", err);
    return null;
  }
}
