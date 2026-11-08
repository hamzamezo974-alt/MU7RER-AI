import { type LocatedProposal } from "./manuscript-review";
import { reviewTextNatively } from "./manuscript-core";

export async function reviewSelectedText(text: string): Promise<{ suggestions: LocatedProposal[]; error: string | null }> {
  try {
    const suggestions = reviewTextNatively(text);
    return { suggestions, error: null };
  } catch {
    return { suggestions: [], error: "تعذّر إتمام المراجعة المحلية؛ بقي النص كما هو." };
  }
}
