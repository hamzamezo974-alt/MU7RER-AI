export async function mountFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
    alert('متصفحك لا يدعم الربط المباشر للمجلدات. يرجى استخدام متصفح حديث مثل Google Chrome أو Edge.');
    return null;
  }
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
    return handle;
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error('خطأ في ربط المجلد:', err);
    }
    return null;
  }
}
