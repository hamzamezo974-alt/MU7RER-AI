import { createFileRoute } from "@tanstack/react-router";
import { LibraryPage } from "@/components/site/LibraryPage";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/history")({ head: () => pageHead("السجل والنسخ السابقة", "راجع مستنداتك واستعد نسخة محفوظة سابقة في المُحَرِّر."), component: () => <LibraryPage history /> });