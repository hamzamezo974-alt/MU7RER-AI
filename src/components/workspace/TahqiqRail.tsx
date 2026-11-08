// شريط أدوات التحقيق الرأسي على حافة مساحة العمل.
// مستلهَم من منهج «برمجيات العقيل» في تيسير عمل المحقّق (الأقواس والرموز،
// التخريج، فروق النسخ، ترقيم اللوحات) ومطوَّر بأن تُنفَّذ كل مهمة بالذكاء الاصطناعي
// على النص المظلَّل مباشرة، ثم تُستبدل أو تُدرَج حاشيةً في مستطيلها المناسب.

import { useState } from "react";
import {
  Baseline,
  BookMarked,
  BracketsIcon,
  Loader2,
  Quote,
  ScrollText,
  SpellCheck,
  Users,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { addNote, getNotesState, type NoteLane } from "@/lib/notes";
import { cn } from "@/lib/utils";
import { aiRequest } from "@/lib/ai-client";

export type TahqiqTask =
  | "tashkeel"
  | "correct"
  | "ocr-cleanup"
  | "hamza"
  | "punctuate"
  | "takhrij-ayah"
  | "takhrij-hadith"
  | "index-names";

const WRAPS = [
  { label: "﴿﴾", title: "قوسا الآية", open: "﴿", close: "﴾" },
  { label: "«»", title: "علامتا الحديث والنقل", open: "«", close: "»" },
  { label: "[]", title: "زيادة المحقّق أو موضع طمس", open: "[", close: "]" },
  { label: "()", title: "قوسان", open: "(", close: ")" },
];

/** المهام التي تُعيد نصًّا يحلّ محل التحديد. */
const REPLACERS: { task: TahqiqTask; label: string; hint: string }[] = [
  { task: "tashkeel", label: "ضبط بالشكل", hint: "تشكيل النص المظلَّل ضبطًا صحيحًا" },
  { task: "correct", label: "تصحيح لغوي", hint: "تقويم الإملاء والنحو دون تغيير الأسلوب" },
  { task: "hamza", label: "ضبط الهمزات", hint: "تصحيح رسم الهمزة والألف المقصورة" },
  { task: "punctuate", label: "ترقيم وفقرات", hint: "إضافة علامات الترقيم وتقسيم الفقرات" },
  { task: "ocr-cleanup", label: "تنقية نصّ النسخ الآلي", hint: "إزالة أخطاء القراءة الآلية" },
];

/** المهام التي تُنتج حاشيةً تُضاف إلى مستطيلها. */
const NOTERS: { task: TahqiqTask; label: string; hint: string; lane: string }[] = [
  { task: "takhrij-ayah", label: "تخريج آية", hint: "عزو الآية إلى سورتها ورقمها", lane: "takhrij" },
  {
    task: "takhrij-hadith",
    label: "تخريج حديث",
    hint: "عزو الحديث إلى مصادره ودرجته",
    lane: "takhrij",
  },
  { task: "index-names", label: "ترجمة عَلَم", hint: "ترجمة موجزة للعَلَم المظلَّل", lane: "gharib" },
];

export function TahqiqRail({
  getSelection,
  insertText,
  insertNote,
}: {
  getSelection: () => string;
  insertText: (text: string) => void;
  insertNote: (lane: NoteLane, text: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const ask = async (task: TahqiqTask, text: string) => {
    return (await aiRequest({ task, text })).trim();
  };

  const run = async (task: TahqiqTask, mode: "replace" | "note", laneId?: string) => {
    const selection = getSelection().trim();
    if (!selection) {
      toast.error("ظلّل النص في المتن أولًا ثم اختر الأداة.");
      return;
    }
    setBusy(task);
    try {
      const result = await ask(task, selection);
      if (mode === "replace") {
        insertText(result);
        toast.success("طُبِّق التعديل على النص.");
      } else {
        const lanes = getNotesState().lanes.filter((lane) => lane.scope === "text");
        const lane = lanes.find((item) => item.id === laneId) ?? lanes[0];
        if (!lane) {
          toast.error("أضف مستطيل حواشٍ أولًا.");
          return;
        }
        insertNote(lane, result);
        toast.success(`أُضيفت حاشية في «${lane.name}».`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر تنفيذ الطلب");
    } finally {
      setBusy(null);
    }
  };

  const wrap = (open: string, close: string) => {
    const selection = getSelection();
    insertText(`${open}${selection}${close}`);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside className="flex w-9 shrink-0 flex-col items-center gap-1 overflow-y-auto border-l bg-toolbar/70 py-1.5">
        <RailMenu icon={Wand2} title="تحرير النص المظلَّل بالذكاء الاصطناعي" busy={!!busy}>
          <DropdownMenuLabel className="text-[11px]">يُطبَّق على النص المظلَّل</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {REPLACERS.map((item) => (
            <DropdownMenuItem key={item.task} onSelect={() => void run(item.task, "replace")}>
              <span className="flex flex-col">
                <span className="text-xs font-medium">{item.label}</span>
                <span className="text-[10px] text-muted-foreground">{item.hint}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </RailMenu>

        <RailMenu icon={BookMarked} title="تخريج وعزو يُضاف حاشيةً" busy={!!busy}>
          <DropdownMenuLabel className="text-[11px]">يُضاف حاشيةً مرقّمة</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {NOTERS.map((item) => (
            <DropdownMenuItem key={item.task} onSelect={() => void run(item.task, "note", item.lane)}>
              <span className="flex flex-col">
                <span className="text-xs font-medium">{item.label}</span>
                <span className="text-[10px] text-muted-foreground">{item.hint}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </RailMenu>

        <Divider />

        <RailButton title="نسخ النص المظلَّل" onClick={() => void navigator.clipboard.writeText(getSelection())}>
          <Quote className="size-4" />
        </RailButton>

        {busy && <Loader2 className="mt-1 size-4 animate-spin text-primary" />}
      </aside>
    </TooltipProvider>
  );
}

function Divider() {
  return <span className="my-0.5 h-px w-5 shrink-0 bg-border" aria-hidden />;
}

function RailButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onClick}
          aria-label={title}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{title}</TooltipContent>
    </Tooltip>
  );
}

function RailMenu({
  icon: Icon,
  title,
  busy,
  children,
}: {
  icon: typeof Wand2;
  title: string;
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              disabled={busy}
              className={cn("size-7 shrink-0 text-primary")}
              aria-label={title}
            >
              <Icon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="left">{title}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="left" align="start" className="w-60">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const RAIL_ICONS = { SpellCheck, Users, BracketsIcon };
