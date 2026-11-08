import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function SourceKindDialog({ open, onChoose, onCancel }: { open: boolean; onChoose: (kind: "manuscript" | "print") => void; onCancel: () => void }) {
  return <Dialog open={open} onOpenChange={value => { if (!value) onCancel(); }}><DialogContent dir="rtl" className="max-w-sm" aria-describedby={undefined}><DialogTitle>هل المصدر مخطوط أم مطبوع؟</DialogTitle><div className="flex gap-3"><Button className="flex-1" onClick={() => onChoose("manuscript")}>مخطوط</Button><Button className="flex-1" variant="secondary" onClick={() => onChoose("print")}>مطبوع</Button></div></DialogContent></Dialog>;
}