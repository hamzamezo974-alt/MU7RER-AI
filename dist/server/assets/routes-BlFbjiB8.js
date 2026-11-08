import { jsx, jsxs } from "react/jsx-runtime";
import { BookOpen } from "lucide-react";
// src/routes/index.tsx?tsr-split=component
function Sections() {
	return /* @__PURE__ */ jsx("div", {
		className: "h-full overflow-auto px-6 py-12 sm:px-12",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-2xl",
			children: [
				/* @__PURE__ */ jsx(BookOpen, { className: "mb-6 size-10 text-primary" }),
				/* @__PURE__ */ jsx("h2", {
					className: "font-serif text-4xl font-bold text-primary",
					children: "المُحَرِّر"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-3 text-sm text-muted-foreground",
					children: "لتحقيق النصوص والمخطوطات"
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-10 border-t pt-6",
					children: [/* @__PURE__ */ jsx("p", {
						className: "font-serif text-xl leading-10",
						children: "بين الأصل والنص، مساحةٌ للتحقيق."
					}), /* @__PURE__ */ jsx("p", {
						className: "mt-4 text-sm leading-8 text-muted-foreground",
						children: "تجتمع مقابلة المخطوطات وتحرير المتون والحواشي في المُحَرِّر، مع خزانة تحفظ الكتب وسجل يحتفظ بنسخ النص عبر مراحل تحقيقه."
					})]
				})
			]
		})
	});
}
export { Sections as component };
