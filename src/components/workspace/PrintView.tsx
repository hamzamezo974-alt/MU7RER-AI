// عرض الطباعة: النص كما سيخرج في الكتاب، والحواشي المعلَّمة مدمجة أسفله كما في الوورد.
// يجيء النص والحواشي مضبوطة من تجميع السجلات (ترقيم موحّد) إن توفرت، وإلا من الحالة الحالية.

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useNotes } from "@/lib/notes";
import type { PrintMemoLane, PrintNoteRow } from "@/lib/records";

export function PrintView({
  html,
  title,
  printedNotes,
  memoLanes,
}: {
  html: string;
  title: string;
  printedNotes?: PrintNoteRow[];
  memoLanes?: PrintMemoLane[];
}) {
  const state = useNotes();
  const printedLanes = state.lanes.filter((lane) => lane.printed);
  const printedLaneIds = new Set(printedLanes.map((lane) => lane.id));
  const rows: PrintNoteRow[] =
    printedNotes ??
    state.notes
      .filter((note) => note.label && printedLaneIds.has(note.laneId))
      .map((note) => ({ id: note.id, laneId: note.laneId, label: note.label, text: note.text }));
  const memos: PrintMemoLane[] =
    memoLanes ??
    printedLanes
      .filter((lane) => lane.kind === "memo" && lane.memo.trim())
      .map((lane) => ({ id: lane.id, name: lane.name, color: lane.color, memo: lane.memo }));
  const laneOf = (laneId: string) => state.lanes.find((lane) => lane.id === laneId);

  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center gap-2 border-b bg-toolbar px-3 py-1.5 print:hidden">
        <span className="text-xs font-semibold text-primary">عرض الطباعة</span>
        <span className="hidden text-[11px] text-muted-foreground sm:inline">
          سجلات التحقيق متصلة هنا بترقيم حواشٍ موحّد، كما ستخرج في الكتاب
        </span>
        <div className="flex-1" />
        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => window.print()}>
          <Printer className="size-4" /> طباعة
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-8">
        <article className="mx-auto w-full max-w-3xl rounded-md bg-paper p-8 shadow-paper md:p-12">
          {title && <h1 className="mb-6 text-center font-serif text-xl font-bold">{title}</h1>}
          <div className="tiptap" dir="rtl" dangerouslySetInnerHTML={{ __html: html }} />

          {memos.map((lane) => (
            <section key={lane.id} className="mt-6 border-t pt-3">
              <h2 className="font-serif text-sm font-bold" style={{ color: lane.color }}>
                {lane.name}
              </h2>
              <p className="whitespace-pre-wrap font-serif text-sm leading-7">{lane.memo}</p>
            </section>
          ))}

          {rows.length > 0 && (
            <section className="mt-6 border-t pt-3">
              <ol className="space-y-1">
                {rows.map((note) => (
                  <li key={note.id} className="font-serif text-sm leading-7">
                    <span className="font-bold">({note.label}) </span>
                    <span style={{ color: laneOf(note.laneId)?.color }}>{note.text}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </article>
      </div>
    </section>
  );
}
