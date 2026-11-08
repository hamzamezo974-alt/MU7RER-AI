import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useServerFn } from "@tanstack/react-start";
import { ScanText, Check, X, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { reviewManuscript } from "@/lib/manuscript-review.functions";
import { validReplacement, type LocatedProposal } from "@/lib/manuscript-review";
import { reviewTextNatively } from "@/lib/manuscript-core";
import { useAccount } from "@/components/site/AccountProvider";

type Suggestion = LocatedProposal & { from: number; to: number; decision: "pending" | "accepted" | "rejected" };
export function SelectionReview({ editor }: { editor: Editor }) {
  const request = useServerFn(reviewManuscript);
  const { user } = useAccount();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [empty, setEmpty] = useState(editor.state.selection.empty);
  const version = useRef(0);
  const applying = useRef(false);
  const valid = useRef(false);
  useEffect(() => {
    const selection = () => setEmpty(editor.state.selection.empty);
    const change = ({ transaction }: { transaction: import("@tiptap/pm/state").Transaction }) => {
      if (!transaction.docChanged) return;
      if (applying.current) {
        setItems(old => old.map(item => ({ ...item, from: transaction.mapping.map(item.from, 1), to: transaction.mapping.map(item.to, -1) })));
      } else { version.current++; valid.current = false; setItems([]); setError("تغيّر النص؛ حدّد المقطع من جديد للمراجعة."); }
    };
    editor.on("selectionUpdate", selection); editor.on("transaction", change);
    return () => { version.current++; editor.off("selectionUpdate", selection); editor.off("transaction", change); };
  }, [editor]);
  const start = async () => {
    const { from, to } = editor.state.selection;
    if (from === to) return;
    let captured = "";
    const positions: (number | null)[] = [];
    let previousEnd = from;
    editor.state.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isText || !node.text) return;
      const left = Math.max(from, pos), right = Math.min(to, pos + node.nodeSize);
      if (left >= right) return;
      if (captured && left > previousEnd) { captured += "\n"; positions.push(null); }
      const part = node.text.slice(left - pos, right - pos);
      captured += part;
      for (let i = left; i < right; i++) positions.push(i);
      previousEnd = right;
    });
    setOpen(true); setText(captured); setItems([]); setError("");
    if (!user) {
      const local = reviewTextNatively(captured);
      const located = local.flatMap(proposal => {
        const begin = positions[proposal.start], end = positions[proposal.end - 1];
        if (begin == null || end == null || end - begin + 1 !== proposal.original.length) return [];
        return [{ ...proposal, from: begin, to: end + 1, decision: "pending" as const }];
      });
      setItems(located);
      if (!located.length) setError("لا اقتراحات موضعية في هذا المقطع.");
      return;
    }
    if (!captured.trim() || captured.length > 10000) { setError("اختر مقطعًا نصيًا غير فارغ لا يتجاوز ١٠٠٠٠ حرف."); return; }
    const run = ++version.current; valid.current = true; setBusy(true);
    try {
      const result = await request({ data: { text: captured } });
      if (run !== version.current || !valid.current || editor.isDestroyed) return;
      if (result.error) { setError(result.error); return; }
      const located = result.suggestions.flatMap(proposal => {
        const begin = positions[proposal.start], end = positions[proposal.end - 1];
        if (begin == null || end == null || end - begin + 1 !== proposal.original.length) return [];
        return [{ ...proposal, from: begin, to: end + 1, decision: "pending" as const }];
      });
      setItems(located);
      if (!located.length) setError("لا اقتراحات موضعية قابلة للتطبيق في هذا المقطع.");
    } catch (e) { if (run === version.current) setError(e instanceof Error ? e.message : "تعذّرت المراجعة."); }
    finally { setBusy(false); }
  };
  const accept = (index: number, replacement: string) => {
    const item = items[index];
    if (!item || !valid.current || editor.isDestroyed || item.decision !== "pending") return;
    const actual = editor.state.doc.textBetween(item.from, item.to, "\n");
    if (!validReplacement(actual, item.original, replacement)) { valid.current = false; setItems([]); setError("تغيّر موضع الاقتراح؛ لم يُعدّل النص."); return; }
    applying.current = true;
    try { editor.view.dispatch(editor.state.tr.insertText(replacement, item.from, item.to)); setItems(old => old.map((p, i) => i === index ? { ...p, decision: "accepted" } : p)); }
    finally { applying.current = false; }
  };
  return <><Button size="icon" variant="ghost" aria-label="مراجعة المقطع المحدد" title="مراجعة المقطع المحدد" disabled={empty || busy} onClick={() => void start()}><ScanText className="size-4" /></Button>
    <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) { valid.current = false; version.current++; } }}><DialogContent dir="rtl" className="max-h-[85dvh] overflow-auto sm:max-w-2xl"><DialogHeader><DialogTitle>مراجعة المقطع المحدد</DialogTitle><DialogDescription>تصحيحات إملائية وقراءات محتملة · بانتظار إقرار المحقق</DialogDescription></DialogHeader>
      <p className="max-h-40 overflow-auto whitespace-pre-wrap border-b pb-3 font-serif leading-8">{text}</p>
      {busy && <p role="status" className="text-sm text-muted-foreground">جارٍ مراجعة المقطع…</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="divide-y">{items.map((item, index) => <article key={`${item.start}:${index}`} className="space-y-2 py-3"><div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">{item.kind === "spelling" ? "تصحيح إملائي" : "قراءة محتملة"} · الحروف {item.start + 1}–{item.end} من المقطع</span><Button size="icon" variant="ghost" aria-label={`تحديد موضع الاقتراح ${index + 1}`} disabled={item.decision !== "pending" || !valid.current} onClick={() => editor.chain().setTextSelection({ from: item.from, to: item.to }).run()}><LocateFixed className="size-4" /></Button></div><p className="break-words font-serif text-lg">«{item.original}» ← «{item.replacement}»</p><p className="text-sm text-muted-foreground">{item.reason}</p>{item.decision === "pending" ? <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => accept(index, item.replacement)}><Check className="size-4" />إقرار</Button>{item.alternatives.map((alternative, i) => <Button key={i} size="sm" variant="outline" onClick={() => accept(index, alternative)}>{alternative}</Button>)}<Button size="sm" variant="ghost" onClick={() => setItems(old => old.map((p, i) => i === index ? { ...p, decision: "rejected" } : p))}><X className="size-4" />رفض</Button></div> : <p className="text-xs text-muted-foreground">{item.decision === "accepted" ? "أُقرّ الاقتراح" : "رُفض الاقتراح"}</p>}</article>)}</div>
    </DialogContent></Dialog></>;
}