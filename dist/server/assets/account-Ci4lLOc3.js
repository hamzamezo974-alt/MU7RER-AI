import { t as supabase } from "./client-CkQ1C0KQ.js";
import { i as useAccount, n as Button } from "./router-BzqaA8hu.js";
import { t as Input } from "./input-CMPGM22e.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
// src/routes/account.tsx?tsr-split=component
function Account() {
	const { user } = useAccount();
	const [signup, setSignup] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);
	if (user) return /* @__PURE__ */ jsxs("div", {
		className: "max-w-lg p-6",
		children: [
			/* @__PURE__ */ jsx("h2", {
				className: "mb-4 text-lg font-semibold",
				children: "حسابي"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mb-4 text-sm",
				dir: "ltr",
				children: user.email
			}),
			/* @__PURE__ */ jsx(Button, {
				variant: "outline",
				onClick: () => void supabase.auth.signOut(),
				children: "تسجيل الخروج"
			})
		]
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "max-w-md p-6",
		children: [
			/* @__PURE__ */ jsx("h2", {
				className: "mb-5 text-lg font-semibold",
				children: signup ? "إنشاء حساب" : "تسجيل الدخول"
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "space-y-3",
				onSubmit: async (e) => {
					e.preventDefault();
					setBusy(true);
					setMessage("");
					const result = signup ? await supabase.auth.signUp({
						email,
						password,
						options: { emailRedirectTo: `${window.location.origin}/account` }
					}) : await supabase.auth.signInWithPassword({
						email,
						password
					});
					setMessage(result.error ? "تعذّر الدخول: " + result.error.message : signup && !result.data.session ? "راجع بريدك لتأكيد الحساب." : "تم تسجيل الدخول");
					setBusy(false);
				},
				children: [
					/* @__PURE__ */ jsxs("label", {
						className: "block text-xs",
						children: ["البريد الإلكتروني", /* @__PURE__ */ jsx(Input, {
							className: "mt-1",
							dir: "ltr",
							type: "email",
							required: true,
							value: email,
							onChange: (e) => setEmail(e.target.value)
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "block text-xs",
						children: ["كلمة المرور", /* @__PURE__ */ jsx(Input, {
							className: "mt-1",
							type: "password",
							required: true,
							minLength: 8,
							value: password,
							onChange: (e) => setPassword(e.target.value)
						})]
					}),
					/* @__PURE__ */ jsx(Button, {
						type: "submit",
						disabled: busy,
						className: "w-full",
						children: signup ? "إنشاء الحساب" : "دخول"
					})
				]
			}),
			/* @__PURE__ */ jsx(Button, {
				variant: "outline",
				className: "mt-3 w-full",
				onClick: async () => {
					if ((await supabase.auth.signInWithOAuth({
						provider: "google",
						options: { redirectTo: `${window.location.origin}/account` }
					})).error) setMessage("تعذّر الدخول بحساب Google");
				},
				children: "المتابعة باستخدام Google"
			}),
			/* @__PURE__ */ jsx(Button, {
				variant: "link",
				size: "sm",
				className: "mt-2",
				onClick: () => setSignup(!signup),
				children: signup ? "لديك حساب؟ تسجيل الدخول" : "إنشاء حساب جديد"
			}),
			message && /* @__PURE__ */ jsx("p", {
				role: "status",
				className: "mt-3 text-xs",
				children: message
			})
		]
	});
}
export { Account as component };
