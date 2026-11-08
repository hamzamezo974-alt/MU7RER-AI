import { z } from "zod";
export const reviewSchema = z.object({ suggestions: z.array(z.object({ original: z.string(), occurrence: z.number(), replacement: z.string(), alternatives: z.array(z.string()), kind: z.enum(["spelling", "reading"]), reason: z.string() }).strict()) }).strict();
export type ReviewProposal = z.infer<typeof reviewSchema>["suggestions"][number];
export type LocatedProposal = ReviewProposal & { start: number; end: number };
export function locateProposals(text: string, proposals: ReviewProposal[]): LocatedProposal[] {
  const located: LocatedProposal[] = [];
  for (const proposal of proposals) {
    if (!proposal.original || !Number.isInteger(proposal.occurrence) || proposal.occurrence < 1 || proposal.occurrence > text.length) continue;
    let start = -1;
    for (let i = 0; i < proposal.occurrence; i++) { start = text.indexOf(proposal.original, start < 0 ? 0 : start + proposal.original.length); if (start < 0) break; }
    if (start < 0) continue;
    const end = start + proposal.original.length;
    if (located.some(item => start < item.end && end > item.start)) continue;
    located.push({ ...proposal, start, end });
  }
  return located.sort((a, b) => a.start - b.start);
}
export function validReplacement(actual: string, expected: string, replacement: string) { return actual === expected && !!replacement.trim() && !replacement.includes("\n"); }