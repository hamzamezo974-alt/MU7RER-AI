// عمود المستطيلات أسفل كل شريحة: بطاقات متراصّة رأسيًا،
// كل بطاقة مستقلة في الطي والتوسعة والتضييق والتظليل والتمرير.

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  addLane,
  lanesOfScope,
  removeLane,
  removeNote,
  updateLane,
  updateNote,
  useNotes,
  type LaneKind,
  type NoteLane,
  type NoteScope,
} from "@/lib/notes";

const PALETTE = ["#1d4ed8", "#b91c1c", "#166534", "#a16207", "#7c3aed", "#0f766e"];

const TITLES: Record<NoteScope, string> = {
  text: "حواشي المتن",
  right: "توصيف المخطوط وملاحظاته",
  left: "توصيف المطبوعة وملاحظاتها",
};

export function NotesColumn({
  scope,
  onAddNote,
  onFocusNote,
  noteIds,
}: {
  scope: NoteScope;
  noteIds?: string[];
  onAddNote?: ((lane: NoteLane) => void) | undefined;
  onFocusNote?: ((noteId: string) => void) | undefined;
}) {
  const state = useNotes();
  const lanes = lanesOfScope(state, scope);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const kind: LaneKind = scope === "text" ? "notes" : "memo";

  return (
    <section className="flex h-full min-h-0 flex-col bg-toolbar/50">
      <header className="flex items-center gap-2 border-b bg-toolbar px-2 py-1">
        <span className="truncate text-[11px] font-semibold text-primary">{TITLES[scope]}</span>
        <div className="flex-1" />
        {adding ? (
          <form
            className="flex items-center gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              const value = name.trim();
              if (value) addLane(value, PALETTE[lanes.length % PALETTE.length]!, scope, kind);
              setName("");
              setAdding(false);
            }}
          >
            <Input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="اسم المستطيل"
              className="h-6 w-32 text-[11px]"
            />
            <Button size="sm" type="submit" className="h-6 px-2 text-[11px]">
              إضافة
            </Button>
            <Button
              size="icon"
              type="button"
              variant="ghost"
              className="size-6"
              onClick={() => setAdding(false)}
              aria-label="إلغاء"
            >
              <X className="size-3" />
            </Button>
          </form>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-3" /> مستطيل جديد
          </Button>
        )}
      </header>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-1.5">
        {lanes.length === 0 && (
          <p className="p-2 text-[11px] text-muted-foreground">
            أضف مستطيلًا لتبدأ التعليق والتوصيف.
          </p>
        )}
        {lanes.map((lane) => (
          <LaneCard
            key={lane.id}
            lane={lane}
            notes={state.notes.filter((note) => note.laneId === lane.id && (!noteIds || noteIds.includes(note.id)))}
            onAddNote={onAddNote}
            onFocusNote={onFocusNote}
          />
        ))}
      </div>
    </section>
  );
}

function LaneCard({
  lane,
  notes,
  onAddNote,
  onFocusNote,
}: {
  lane: NoteLane;
  notes: { id: string; text: string; label: string }[];
  onAddNote?: ((lane: NoteLane) => void) | undefined;
  onFocusNote?: ((noteId: string) => void) | undefined;
}) {
  const dragging = useRef<{ y: number; height: number } | null>(null);

  const startResize = (event: React.PointerEvent) => {
    event.preventDefault();
    dragging.current = { y: event.clientY, height: lane.height };
    const move = (e: PointerEvent) => {
      const current = dragging.current;
      if (!current) return;
      const next = Math.max(64, Math.min(560, current.height + (e.clientY - current.y)));
      updateLane(lane.id, { height: next });
    };
    const up = () => {
      dragging.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <article
      className={cn(
        "overflow-hidden rounded-md border bg-card transition",
        !lane.visible && "opacity-60",
      )}
      style={{ borderInlineStartColor: lane.color, borderInlineStartWidth: 3 }}
    >
      <header className="flex items-center gap-1.5 border-b px-2 py-1">
        <label className="flex cursor-pointer items-center gap-1.5" title="إظهاره عند الطباعة">
          <Checkbox
            checked={lane.printed}
            onCheckedChange={(value) => updateLane(lane.id, { printed: value === true })}
            aria-label={`طباعة ${lane.name}`}
          />
          <span className="truncate text-[11px] font-semibold" style={{ color: lane.color }}>
            {lane.name}
          </span>
        </label>
        {lane.kind === "notes" && (
          <span className="rounded bg-secondary px-1 text-[10px] text-muted-foreground">
            {notes.length}
          </span>
        )}
        <div className="flex-1" />
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          title={lane.collapsed ? "توسيع" : "طي"}
          onClick={() => updateLane(lane.id, { collapsed: !lane.collapsed })}
        >
          {lane.collapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          title={lane.visible ? "إخفاء من الواجهة" : "إظهار"}
          onClick={() => updateLane(lane.id, { visible: !lane.visible })}
        >
          {lane.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </Button>
        {lane.kind === "notes" && onAddNote && (
          <Button
            size="icon"
            variant="ghost"
            className="size-6"
            title="إدراج حاشية عند المؤشر"
            onClick={() => onAddNote(lane)}
          >
            <Plus className="size-3.5" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="size-6 text-destructive"
          title="حذف هذا المستطيل"
          onClick={() => {
            if (window.confirm(`حذف «${lane.name}»؟`)) removeLane(lane.id);
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </header>

      {lane.visible && !lane.collapsed && (
        <>
          <div className="overflow-y-auto p-1.5" style={{ height: lane.height }}>
            {lane.kind === "memo" ? (
              <textarea
                value={lane.memo}
                onChange={(event) => updateLane(lane.id, { memo: event.target.value })}
                dir="rtl"
                placeholder="اكتب هنا وصف النسخة، مقاسها، عدد أوراقها، ناسخها، تاريخها، ملاحظات المقابلة…"
                className="h-full w-full resize-none rounded-md border bg-background px-2 py-1 font-serif text-xs leading-6 outline-none focus:border-ring"
              />
            ) : (
              <div className="space-y-1.5">
                {notes.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    ضع المؤشر في المتن ثم اضغط + لإدراج علامة حاشية مرقّمة.
                  </p>
                )}
                {notes.map((note) => (
                  <div key={note.id} className="flex items-start gap-1.5">
                    <button
                      type="button"
                      onClick={() => onFocusNote?.(note.id)}
                      title="اذهب إلى موضعها في المتن"
                      className="mt-1 min-w-6 rounded px-1 text-[11px] font-bold hover:underline"
                      style={{ color: lane.color }}
                    >
                      ({note.label || "—"})
                    </button>
                    <textarea
                      data-note-input={note.id}
                      value={note.text}
                      onChange={(event) => updateNote(note.id, { text: event.target.value })}
                      dir="rtl"
                      rows={2}
                      placeholder="نص الحاشية…"
                      className="min-h-8 flex-1 resize-y rounded-md border bg-background px-2 py-1 font-serif text-xs leading-6 outline-none focus:border-ring"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 text-muted-foreground"
                      title="حذف الحاشية"
                      onClick={() => removeNote(note.id)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div
            onPointerDown={startResize}
            title="اسحب لتغيير ارتفاع البطاقة"
            className="h-2 cursor-row-resize border-t bg-toolbar/70 hover:bg-accent"
          />
        </>
      )}
    </article>
  );
}
