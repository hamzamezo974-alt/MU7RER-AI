import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { executeNativeManuscriptTask } from "@/lib/manuscript-core";

const BodySchema = z.object({
  task: z.enum([
    "transcribe",
    "collate",
    "tashkeel",
    "correct",
    "ocr-cleanup",
    "hamza",
    "punctuate",
    "summarize",
    "takhrij-ayah",
    "takhrij-hadith",
    "index-names",
    "custom",
  ]),
  text: z.string().max(24000).optional(),
  image: z.string().max(14_000_000).optional(),
  instruction: z.string().max(2000).optional(),
  apiKey: z.string().max(2048).optional(),
  testKey: z.boolean().optional(),
});

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof BodySchema>;
        try {
          body = BodySchema.parse(await request.json());
        } catch {
          return new Response("طلب غير صالح", { status: 400 });
        }

        if (body.text && !body.image && !body.testKey) {
          const result = executeNativeManuscriptTask({
            task: body.task,
            text: body.text,
            instruction: body.instruction,
          });
          if (result.trim()) {
            return new Response(JSON.stringify({ text: result.trim() }), {
              headers: { "Content-Type": "application/json; charset=utf-8" },
            });
          }
        }

        const result = executeNativeManuscriptTask({
          task: body.task,
          text: body.text || body.instruction || "نص المخطوط",
          instruction: body.instruction,
        });
        return new Response(JSON.stringify({ text: result || "تمت المعالجة عبر المحرك المدمج." }), {
          headers: { "Content-Type": "application/json; charset=utf-8" },
        });
      },
    },
  },
});
