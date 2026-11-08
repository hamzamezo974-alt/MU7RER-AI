import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/components/site/AccountProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/account")({ head: () => pageHead("حسابي", "تسجيل الدخول إلى المحرر MU7RER-AI وحفظ مساحة العمل الخاصة بحسابك."), component: Account });
function Account() {
  const { user } = useAccount();
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  if (user) return <div className="max-w-lg p-6"><h2 className="mb-4 text-lg font-semibold">حسابي</h2><p className="mb-4 text-sm" dir="ltr">{user.email}</p><Button variant="outline" onClick={() => void supabase.auth.signOut()}>تسجيل الخروج</Button></div>;
  return <div className="max-w-md p-6"><h2 className="mb-5 text-lg font-semibold">{signup ? "إنشاء حساب" : "تسجيل الدخول"}</h2><form className="space-y-3" onSubmit={async e => { e.preventDefault(); setBusy(true); setMessage(""); const result = signup ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/account` } }) : await supabase.auth.signInWithPassword({ email, password }); setMessage(result.error ? "تعذّر الدخول: " + result.error.message : signup && !result.data.session ? "راجع بريدك لتأكيد الحساب." : "تم تسجيل الدخول"); setBusy(false); }}><label className="block text-xs">البريد الإلكتروني<Input className="mt-1" dir="ltr" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label className="block text-xs">كلمة المرور<Input className="mt-1" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></label><Button type="submit" disabled={busy} className="w-full">{signup ? "إنشاء الحساب" : "دخول"}</Button></form><Button variant="outline" className="mt-3 w-full" onClick={async () => { const result = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/account` } }); if (result.error) setMessage("تعذّر الدخول بحساب Google"); }}>المتابعة باستخدام Google</Button><Button variant="link" size="sm" className="mt-2" onClick={() => setSignup(!signup)}>{signup ? "لديك حساب؟ تسجيل الدخول" : "إنشاء حساب جديد"}</Button>{message && <p role="status" className="mt-3 text-xs">{message}</p>}</div>;
}
