import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/")({ head: () => pageHead("أقسام المُحَرِّر", "محرر التحقيق وخزانة الكتب وسجل النسخ في مساحة عمل واحدة."), component: Sections });
function Sections() {
  return <div className="h-full overflow-auto px-6 py-12 sm:px-12"><div className="max-w-2xl"><BookOpen className="mb-6 size-10 text-primary" /><h2 className="font-serif text-4xl font-bold text-primary">المُحَرِّر</h2><p className="mt-3 text-sm text-muted-foreground">لتحقيق النصوص والمخطوطات</p><div className="mt-10 border-t pt-6"><p className="font-serif text-xl leading-10">بين الأصل والنص، مساحةٌ للتحقيق.</p><p className="mt-4 text-sm leading-8 text-muted-foreground">تجتمع مقابلة المخطوطات وتحرير المتون والحواشي في المُحَرِّر، مع خزانة تحفظ الكتب وسجل يحتفظ بنسخ النص عبر مراحل تحقيقه.</p></div></div></div>;
}