import { createFileRoute } from "@tanstack/react-router";
import { LibraryPage } from "@/components/site/LibraryPage";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/library")({ head: () => pageHead("الخزانة", "مستنداتك ونسخ الكتب والطبعات المحفوظة في المُحَرِّر."), component: () => <LibraryPage /> });