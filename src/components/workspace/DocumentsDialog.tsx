import { useEffect, useState } from "react";
import { Clock, Copy, FilePlus2, FileText, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  createDoc,
  deleteDoc,
  duplicateDoc,
  formatWhen,
  htmlToPlainText,
  listDocs,
  type Mu7rerDoc,
} from "@/lib/documents";

export function DocumentsDialog({
  open,
  onOpenChange,
  activeId,
  onOpenDoc,
  onRestoreVersion,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeId: string | null;
  onOpenDoc: (id: string) => void;
  onRestoreVersion: (docId: string, html: string) => void;
}) {
  const [docs, setDocs] = useState<Mu7rerDoc[]>([]);
  const [selected, setSelected] = useState<string | null>(activeId);

  const refresh = () => setDocs(listDocs());

  useEffect(() => {
    if (open) {
      refresh();
      setSelected(activeId);
    }
  }, [open, activeId]);

  const current = docs.find((doc) => doc.id === selected) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-3xl gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-5 py-4 text-right">
          <DialogTitle className="font-serif text-lg">مكتبة المستندات</DialogTitle>
          <DialogDescription className="text-xs">
            كل مستند يُحفظ تلقائيًا أثناء الكتابة، ومعه نسخ سابقة يمكنك الرجوع إليها في أي وقت.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[65vh] grid-cols-1 sm:grid-cols-[1fr_1fr]">
          <div className="min-h-0 overflow-y-auto border-l p-3">
            <Button
              size="sm"
              className="mb-2 w-full"
              onClick={() => {
                const doc = createDoc();
                refresh();
                onOpenDoc(doc.id);
                onOpenChange(false);
              }}
            >
              <FilePlus2 className="size-4" /> مستند جديد
            </Button>

            <ul className="space-y-1">
              {docs.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(doc.id)}
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-right transition-colors",
                      doc.id === selected
                        ? "border-primary bg-secondary"
                        : "border-transparent hover:bg-muted",
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{doc.title || "بدون عنوان"}</span>
                      {doc.id === activeId && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                          مفتوح
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                      {formatWhen(doc.updatedAt)} · {htmlToPlainText(doc.html).slice(0, 60) || "فارغ"}
                    </span>
                  </button>
                </li>
              ))}
              {docs.length === 0 && (
                <li className="p-4 text-center text-xs text-muted-foreground">لا توجد مستندات بعد.</li>
              )}
            </ul>
          </div>

          <div className="min-h-0 overflow-y-auto p-3">
            {current ? (
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onOpenDoc(current.id);
                      onOpenChange(false);
                    }}
                  >
                    فتح المستند
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      duplicateDoc(current.id);
                      refresh();
                    }}
                  >
                    <Copy className="size-4" /> نسخة
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      deleteDoc(current.id);
                      setSelected(null);
                      refresh();
                    }}
                  >
                    <Trash2 className="size-4" /> حذف
                  </Button>
                </div>

                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Clock className="size-3.5" /> النسخ السابقة ({current.versions.length})
                </p>
                <ul className="space-y-1">
                  {current.versions.map((version) => (
                    <li
                      key={version.id}
                      className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5"
                    >
                      <span className="flex-1 truncate text-[11px]">
                        {formatWhen(version.createdAt)} ·{" "}
                        <span className="text-muted-foreground">
                          {htmlToPlainText(version.html).slice(0, 40) || "فارغ"}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px]"
                        onClick={() => {
                          onRestoreVersion(current.id, version.html);
                          onOpenChange(false);
                        }}
                      >
                        <RotateCcw className="size-3.5" /> استرجاع
                      </Button>
                    </li>
                  ))}
                  {current.versions.length === 0 && (
                    <li className="text-[11px] text-muted-foreground">
                      لم تُسجَّل نسخ بعد — تُحفظ نسخة كل دقيقة أثناء التحرير.
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <p className="p-4 text-center text-xs text-muted-foreground">
                اختر مستندًا لعرض تفاصيله ونسخه السابقة.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
