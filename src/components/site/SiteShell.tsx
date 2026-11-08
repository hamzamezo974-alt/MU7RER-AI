import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, History, Home, Library, PenLine, RotateCcw, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccount } from "./AccountProvider";

const SECTIONS = [
  { to: "/", label: "عن المُحَرِّر", icon: Home },
  { to: "/editor", label: "المحرر", icon: PenLine },
  { to: "/library", label: "الخزانة", icon: Library },
  { to: "/research", label: "المراجع والمقابلة", icon: Search },
  { to: "/history", label: "السجل والنسخ", icon: History },
  { to: "/account", label: "حسابي", icon: UserRound },
] as const;
export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: state => state.location.pathname });
  const current = SECTIONS.find(item => item.to === pathname)?.label ?? "المُحَرِّر";
  const { user, status } = useAccount();
  return (
    <div dir="rtl" className="site-shell grid h-dvh min-w-0 grid-rows-[40px_30px_minmax(0,1fr)_24px] overflow-hidden bg-background">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-b bg-toolbar px-3">
        <div className="flex min-w-0 items-center gap-3"><BookOpen className="size-5 shrink-0 text-primary" /><Link to="/" className="font-serif text-xl font-bold text-primary">المُحَرِّر</Link><span className="h-4 border-l" /><h1 className="truncate text-xs font-semibold">{current}</h1></div>
        <Button asChild variant="ghost" size="sm" className="h-7 max-w-40 px-2"><Link to="/account"><UserRound className="size-3.5" /><span className="truncate text-[11px]">{user ? user.user_metadata?.["full_name"] ?? "حسابي" : "تسجيل الدخول"}</span></Link></Button>
      </header>
      <div className="flex min-w-0 items-center gap-2 border-b bg-panel px-3 text-[10px]"><span>المُحَرِّر</span><span className="text-muted-foreground">/</span><span>{current}</span><div className="flex-1" />{pathname === "/editor" && <Button variant="ghost" size="sm" className="h-6 px-1 text-[10px]" onClick={() => window.dispatchEvent(new Event("reset-workspace-layout"))}><RotateCcw className="size-3" />استعادة العرض الافتراضي</Button>}</div>
      <div className="grid min-h-0 min-w-0 grid-cols-[116px_minmax(0,1fr)] max-sm:grid-cols-[40px_minmax(0,1fr)]">
        <nav aria-label="أقسام المُحَرِّر" className="flex min-h-0 flex-col gap-1 border-l bg-sidebar p-1.5">
          {SECTIONS.map(item => <Button key={item.to} asChild variant={pathname === item.to ? "secondary" : "ghost"} className="h-8 justify-start gap-2 px-2 text-[11px] max-sm:justify-center max-sm:px-0"><Link to={item.to} aria-label={item.label} title={item.label}><item.icon className="size-4 shrink-0" /><span className="max-sm:hidden">{item.label}</span></Link></Button>)}
        </nav>
        <main className="min-h-0 min-w-0 overflow-hidden">{children}</main>
      </div>
      <footer className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t bg-toolbar px-3 text-[9px] text-muted-foreground"><span className="truncate">المُحَرِّر · تحقيق النصوص والمخطوطات</span><span className="truncate">{status}</span></footer>
    </div>
  );
}