import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { describeAssistantContext } from "@/lib/assistant-context";
import { APP_KNOWLEDGE } from "@/components/workspace/app-knowledge";
import { executeNativeManuscriptTask } from "@/lib/manuscript-core";

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(20000),
      }),
    )
    .min(1)
    .max(40),
  documentText: z.string().max(24000).optional(),
  workingText: z.string().max(24000).optional(),
  image: z.string().max(14_000_000).optional(),
  imageLabel: z.string().max(2048).optional(),
  images: z.array(z.object({ image: z.string().max(14_000_000).regex(/^data:image\/(png|jpeg|webp);base64,/), label: z.string().max(2048) })).max(2).optional(),
  context: z.object({ recordLabel: z.string().max(2048).optional(), recordText: z.string().max(24000), selection: z.string().max(8000).optional(), footnotes: z.array(z.string().max(20000)).max(500), images: z.array(z.object({ label: z.string().max(2048) })).max(2) }).optional(),
  apiKey: z.string().max(2048).optional(),
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof BodySchema>;
        try {
          body = BodySchema.parse(await request.json());
        } catch {
          return new Response("طلب غير صالح", { status: 400 });
        }

        const lastMessage = body.messages[body.messages.length - 1]?.content ?? "";
        const targetText = body.context?.selection || body.workingText || body.documentText || lastMessage;

        const nativeReply = executeNativeManuscriptTask({
          task: "custom",
          text: targetText,
          instruction: lastMessage,
        });

        const formattedReply = nativeReply.trim()
          ? `### استجابة محرك التحقيق المحلي (MU7RER-AI)\n\n${nativeReply}`
          : `أهلاً بك في **MU7RER-AI (المحرر)**. حدّد نصاً في المتن أو اكتب سؤالك التحقيقي (ضبط، تشكيل، تخريج آية أو حديث، تحليل صرفي، أو مقابلة نسخ) ليقوم المحرك بمعالجته فوراً.`;

        return new Response(formattedReply, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
