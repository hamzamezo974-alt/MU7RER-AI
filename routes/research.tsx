import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { ResearchWorkspace } from "@/components/workspace/ResearchWorkspace";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/research")({ head: () => pageHead("المراجع والمقابلة", "مراجع المُحَرِّر وشواهد البحث وقرارات المقابلة وتقارير التحقيق."), component: () => <div className="h-full overflow-auto p-4"><ClientOnly><ResearchWorkspace /></ClientOnly></div> });