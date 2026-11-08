import { useEffect, useState } from "react";
import { Crop, Loader2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cropPage, splitBoxes, FULL_CROP, type CropBox } from "@/lib/page-layout";
export function PageTools({ source, open, onClose, onApply }: { source: string | undefined; open: boolean; onClose: () => void; onApply: (pages: { name: string; blob: Blob }[], count?: number, operation?: string, settings?: unknown) => Promise<void> }) {
  const [box, setBox] = useState<CropBox>(FULL_CROP);
  const [split, setSplit] = useState(50);
  const [mode, setMode] = useState<"crop" | "split">("crop");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setBox(FULL_CROP); setError(""); }, [source, open]);
  const apply = async () => {
    if (!source || busy) return;
    setBusy(true); setError("");
    try {
      const blob = await (await fetch(source)).blob();
      const boxes = mode === "split" ? splitBoxes(split) : [box];
      const pages = [];
      for (const [i, area] of boxes.entries()) pages.push({ name: mode === "split" ? `وجه ${i === 0 ? "أ" : "ب"}` : "قص", blob: await cropPage(blob, area) });
      await onApply(pages, 1, mode === "split" ? "تقسيم" : "قص", { boxes, order: "right-left" }); onClose();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "تعذّر القص"); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={value => !value && !busy && onClose()}><DialogContent dir="rtl" className="max-w-2xl"><DialogTitle>قص وتقسيم الصفحة</DialogTitle>
    <div className="flex gap-2"><Button variant={mode === "crop" ? "secondary" : "ghost"} onClick={() => setMode("crop")}><Crop className="size-4" />قص</Button><Button variant={mode === "split" ? "secondary" : "ghost"} onClick={() => setMode("split")}><Scissors className="size-4" />وجهان</Button></div>
    <div className="flex h-72 justify-center overflow-hidden bg-muted"><div className="relative inline-flex h-full max-w-full">{source && <img src={source} alt="معاينة القص" className="h-full max-w-full object-contain" />}{mode === "split" ? <div className="absolute inset-y-0 w-0.5 bg-primary" style={{ left: `${split}%` }} /> : <div className="pointer-events-none absolute border-2 border-primary bg-primary/10" style={{ left: `${box.left}%`, top: `${box.top}%`, right: `${100 - box.right}%`, bottom: `${100 - box.bottom}%` }} />}</div></div>
    {mode === "split" ? <label className="space-y-2 text-xs">موضع الفاصل · {split}%<Slider aria-label="موضع فاصل الوجهين" min={1} max={99} value={[split]} onValueChange={values => setSplit(values[0] ?? 50)} /></label> : <div className="grid grid-cols-2 gap-4">{([['left', 'اليسار'], ['right', 'اليمين'], ['top', 'الأعلى'], ['bottom', 'الأسفل']] as const).map(([key, label]) => <label key={key} className="space-y-2 text-xs">{label} · {box[key]}%<Slider aria-label={`حد القص ${label}`} min={key === "right" ? box.left + 1 : key === "bottom" ? box.top + 1 : 0} max={key === "left" ? box.right - 1 : key === "top" ? box.bottom - 1 : 100} value={[box[key]]} onValueChange={values => setBox(current => ({ ...current, [key]: values[0] ?? current[key] }))} /></label>)}</div>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={onClose}>إلغاء</Button><Button disabled={busy || !source} onClick={() => void apply()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" />}{mode === "split" ? "تقسيم: اليمين ثم اليسار" : "تطبيق القص"}</Button></div>
  </DialogContent></Dialog>;
}