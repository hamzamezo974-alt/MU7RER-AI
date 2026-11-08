import React, { useState } from 'react';
import { mountLibraryFolder, MountedLibrary } from '@/lib/library-connector';

export function LibraryPage() {
  const [library, setLibrary] = useState<MountedLibrary | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMount = async () => {
    setLoading(true);
    try {
      const mounted = await mountLibraryFolder();
      if (mounted) {
        setLibrary(mounted);
      }
    } catch (err) {
      console.error('خطأ في الربط:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto text-right" dir="rtl">
      <div className="bg-card border rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">خزانة الموسوعات والمكتبة</h1>
            <p className="text-muted-foreground text-base">
              اربط مجلد المكتبة الشاملة أو الخزانة المحلية جذرياً بضغطة زر واحدة وبدون أي استعراض متسلسل.
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
            📚
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <button
            onClick={handleMount}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-3 shadow-md text-base"
          >
            <span>{loading ? 'جاري الربط الجذري...' : 'ربط مجلد المكتبة الشاملة أو الخزانة'}</span>
          </button>

          {library ? (
            <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-bold">تم ربط المجلد بنجاح:</p>
                <p className="text-sm font-mono opacity-90">{library.name}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              لم يتم ربط أي مجلد بعد. اضغط على الزر أعلاه لاختيار مجلد المكتبة مباشرة.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
