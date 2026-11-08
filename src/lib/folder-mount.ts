// نظام الربط المباشر للمجلدات والخزانات دون تسلسل
export async function mountLibraryFolder() {
  if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
    throw new Error('متصفحك لا يدعم الربط المباشر. يرجى استخدام متصفح حديث.');
  }
  
  const handle = await (window as any).showDirectoryPicker({
    mode: 'read',
    startIn: 'documents'
  });

  return handle;
}
