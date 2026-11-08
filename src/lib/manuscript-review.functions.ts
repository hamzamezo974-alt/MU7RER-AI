import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const reviewManuscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ text: z.string().trim().min(1).max(10000) }))
  .handler(async ({ data }) => {
    const { reviewSelectedText } = await import("./manuscript-review.server");
    return reviewSelectedText(data.text);
  });