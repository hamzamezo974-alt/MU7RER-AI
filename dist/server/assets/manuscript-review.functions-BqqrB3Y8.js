import { i as TSS_SERVER_FUNCTION, r as createServerFn } from "./server-BwtSw16C.js";
import { t as requireSupabaseAuth } from "./auth-middleware-tnz9q6Pe.js";
import { z } from "zod";
// node_modules/@tanstack/start-server-core/dist/esm/createServerRpc.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
// src/lib/manuscript-review.functions.ts?tss-serverfn-split
var reviewManuscript_createServerFn_handler = createServerRpc({
	id: "8ff9d75dcbbb58aff7ac1d0329d47d12216021b8f4d08dd81a5b648c9ed6e2a8",
	name: "reviewManuscript",
	filename: "src/lib/manuscript-review.functions.ts"
}, (opts) => reviewManuscript.__executeServer(opts));
var reviewManuscript = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ text: z.string().trim().min(1).max(1e4) })).handler(reviewManuscript_createServerFn_handler, async ({ data }) => {
	const { reviewSelectedText } = await import("./manuscript-review.server-CJQwcj9Z.js");
	return reviewSelectedText(data.text);
});
export { reviewManuscript_createServerFn_handler };
