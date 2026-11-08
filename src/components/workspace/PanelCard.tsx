// إطار موحّد لكل لوح رئيسي: مستطيل محدّد بترويسة مضغوطة وأدوات في حافتها.

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function PanelCard({
  icon: Icon,
  title,
  hint,
  actions,
  children,
  className,
  accent,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <section
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border bg-card",
        className,
      )}
      style={accent ? { borderTopColor: accent, borderTopWidth: 2 } : undefined}
    >
      <header className="flex h-8 shrink-0 items-center gap-1.5 border-b bg-toolbar px-2">
        <Icon className="size-3.5 shrink-0 text-primary" />
        <span className="truncate text-[11px] font-semibold">{title}</span>
        {hint && (
          <span className="hidden truncate text-[10px] text-muted-foreground lg:inline">
            · {hint}
          </span>
        )}
        <div className="flex-1" />
        <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </section>
  );
}
