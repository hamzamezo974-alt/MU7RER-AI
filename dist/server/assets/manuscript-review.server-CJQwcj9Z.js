import { n as reviewTextNatively } from "./manuscript-core-niwsB8Um.js";
// src/lib/manuscript-review.server.ts
async function reviewSelectedText(text) {
	try {
		return {
			suggestions: reviewTextNatively(text),
			error: null
		};
	} catch {
		return {
			suggestions: [],
			error: "تعذّر إتمام المراجعة المحلية؛ بقي النص كما هو."
		};
	}
}
export { reviewSelectedText };
