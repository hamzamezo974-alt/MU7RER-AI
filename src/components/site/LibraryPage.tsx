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
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-3">خزانة الموسوعات والمكتبة</h1>
        <p className="text-muted-foreground mb-6">
          اربط مجلد المكتبة الشاملة أو الخزانة المحلية بضغطة واحدة وبدون أي استعراض متسلسل للتحقيق الفوري.
        </p>

        <div className="flex items-center gap-4">
          <button
            onClick={handleMount}
            disabled={loading}
            className="px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'جاري الربط...' : 'ربط مجلد المكتبة أو الخزانة'}
          </button>

          {library && (
            <span className="text-sm text-green-600 font-medium">
              تم ربط المجلد بنجاح: {library.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
