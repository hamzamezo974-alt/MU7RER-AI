// محرك ربط وفهرسة الخزانات والمكتبات (بدون تسلسل أو إرهاق للذاكرة)
export interface MountedLibrary {
  name: string;
  handle: FileSystemDirectoryHandle;
  connectedAt: number;
}

export async function mountLibraryFolder(): Promise<MountedLibrary | null> {
  if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
    alert('متصفحك لا يدعم الربط المباشر. يرجى استخدام متصفح حديث ويدعم معايير الويب المتقدمة.');
    return null;
  }

  try {
    // فتح نافذة اختيار المجلد الجذري بضغطة واحدة ودون استعراض تسلسلي
    const handle = await (window as any).showDirectoryPicker({
      mode: 'read',
      startIn: 'documents'
    });

    const mounted: MountedLibrary = {
      name: handle.name,
      handle,
      connectedAt: Date.now()
    };

    // حفظ مرجع الربط في التخزين المحلي الآمن
    // (سنعتمد على مقبض النظام المباشر في الجلسات القادمة)
    console.log(`تم ربط المكتبة بنجاح: ${handle.name}`);
    return mounted;
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error('تعذر إتمام ربط المجلد:', err);
    }
    return null;
  }
}
