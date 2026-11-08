import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setStorageOwner, workspaceSnapshot, storageKey } from "@/lib/workspace-storage";
import { resetNotesCache } from "@/lib/notes";

const AccountContext = createContext<{ user: User | null; ready: boolean; status: string }>({ user: null, ready: false, status: "" });
export const useAccount = () => useContext(AccountContext);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  const identity = useRef<string | null | undefined>(undefined);
  const cloudLoaded = useRef(false);
  useEffect(() => {
    let live = true;
    let generation = 0;
    const activate = async (next: User | null) => {
      if (identity.current === (next?.id ?? null)) return;
      identity.current = next?.id ?? null;
      const run = ++generation;
      setReady(false);
      cloudLoaded.current = false;
      setStorageOwner(next?.id ?? null);
      resetNotesCache();
      if (next) {
        const { data, error } = await supabase.from("workspaces").select("payload").eq("user_id", next.id).maybeSingle();
        if (!live || run !== generation) return;
        if (error) setStatus("تعذّرت المزامنة؛ نسختك المحلية محفوظة");
        else {
          cloudLoaded.current = true;
          const payload = data?.payload as Record<string, string> | undefined;
          for (const [key, value] of Object.entries(payload ?? {})) {
            if (key.startsWith("mu7rer:") && !key.includes("key") && typeof value === "string") localStorage.setItem(storageKey(key), value);
          }
          setStatus("متصل بحسابك");
        }
      } else setStatus("نسخة محلية");
      if (live) { setUser(next); setReady(true); }
    };
    void supabase.auth.getUser().then(({ data }) => activate(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) void activate(session?.user ?? null);
    });
    return () => { live = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!user || !ready) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      if (!cloudLoaded.current) return;
      clearTimeout(timer);
      setStatus("جارٍ الحفظ…");
      timer = setTimeout(async () => {
        const { error } = await supabase.from("workspaces").upsert({ user_id: user.id, payload: workspaceSnapshot(), updated_at: new Date().toISOString() });
        setStatus(error ? "تعذّرت المزامنة؛ نسختك المحلية محفوظة" : "محفوظ في حسابك");
      }, 900);
    };
    window.addEventListener("workspace-change", save);
    return () => { clearTimeout(timer); window.removeEventListener("workspace-change", save); };
  }, [user, ready]);
  return <AccountContext.Provider value={{ user, ready, status }}>{ready ? <div key={user?.id ?? "guest"} className="h-full">{children}</div> : <div dir="rtl" className="grid h-dvh place-items-center bg-background text-sm">المُحَرِّر · جارٍ فتح مساحة العمل…</div>}</AccountContext.Provider>;
}