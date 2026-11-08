import { t as __exportAll } from "./rolldown-runtime-D8jQpDG7.js";
import { t as supabase } from "./client-CkQ1C0KQ.js";
import { t as executeNativeManuscriptTask } from "./manuscript-core-niwsB8Um.js";
import * as React from "react";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { HeadContent, Link, Outlet, Scripts, createFileRoute, createRootRouteWithContext, createRouter, lazyRouteComponent, useRouter, useRouterState } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { z } from "zod";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BookOpen, History, Home, Library, PenLine, RotateCcw, Search, UserRound } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Toaster } from "sonner";
// src/lib/workspace-storage.ts
var owner = null;
function setStorageOwner(id) {
	owner = id;
}
function getStorageOwner() {
	return owner;
}
function storageKey(key) {
	return owner ? `account:${owner}:${key}` : key;
}
function readStorage(key) {
	if (typeof localStorage === "undefined") return null;
	return localStorage.getItem(storageKey(key));
}
function writeStorage(key, value) {
	if (typeof localStorage === "undefined") return;
	localStorage.setItem(storageKey(key), value);
	if (typeof window !== "undefined") window.dispatchEvent(new Event("workspace-change"));
}
function removeStorage(key) {
	if (typeof localStorage === "undefined") return;
	localStorage.removeItem(storageKey(key));
	if (typeof window !== "undefined") window.dispatchEvent(new Event("workspace-change"));
}
function workspaceSnapshot() {
	if (typeof localStorage === "undefined") return {};
	const result = {};
	const prefix = owner ? `account:${owner}:` : "";
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (!key || prefix && !key.startsWith(prefix)) continue;
		const name = prefix ? key.slice(prefix.length) : key;
		if (!name.startsWith("mu7rer:") || name.includes("key")) continue;
		result[name] = localStorage.getItem(key) ?? "";
	}
	return result;
}
// src/lib/notes.ts
var KEY = "mu7rer:notes";
var activeKey = KEY;
function selectNotesDocument(id) {
	activeKey = `${KEY}:${id}`;
	loaded = false;
	state = {
		lanes: DEFAULT_LANES.map((lane) => ({ ...lane })),
		notes: []
	};
	load();
	listeners.forEach((listener) => listener());
}
function resetNotesCache() {
	loaded = false;
	activeKey = KEY;
	state = SERVER_STATE;
}
var newNoteId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
var lane = (id, name, color, scope, kind, printed) => ({
	id,
	name,
	color,
	scope,
	kind,
	visible: true,
	printed,
	collapsed: false,
	height: 120,
	memo: ""
});
var DEFAULT_LANES = [
	lane("takhrij", "التخريج والعزو", "#1d4ed8", "text", "notes", true),
	lane("furuq", "فروق النسخ", "#b91c1c", "text", "notes", true),
	lane("gharib", "شرح الغريب", "#166534", "text", "notes", false),
	lane("taliq", "تعليقات المحقق", "#a16207", "text", "notes", false),
	lane("wasf-right", "وصف المخطوط", "#7c3aed", "right", "memo", false),
	lane("wasf-left", "وصف المطبوعة", "#0f766e", "left", "memo", false)
];
var state = {
	lanes: DEFAULT_LANES,
	notes: []
};
var loaded = false;
var listeners = /* @__PURE__ */ new Set();
function persist() {
	try {
		writeStorage(activeKey, JSON.stringify(state));
	} catch {}
}
/** ترقية المسارب القديمة (قبل إضافة الشرائح والطي والارتفاع). */
function migrate(lanes) {
	const upgraded = lanes.map((item) => ({
		...item,
		scope: item.scope ?? "text",
		kind: item.kind ?? "notes",
		collapsed: item.collapsed ?? false,
		height: item.height ?? 120,
		memo: item.memo ?? ""
	}));
	for (const fallback of DEFAULT_LANES) if (fallback.kind === "memo" && !upgraded.some((item) => item.id === fallback.id)) upgraded.push({ ...fallback });
	return upgraded;
}
function load() {
	if (loaded || typeof localStorage === "undefined") return;
	loaded = true;
	try {
		const raw = readStorage(activeKey);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed.lanes) && Array.isArray(parsed.notes)) state = {
				lanes: migrate(parsed.lanes),
				notes: parsed.notes
			};
		}
	} catch {}
}
function set(next) {
	state = next;
	persist();
	listeners.forEach((listener) => listener());
}
function getNotesState() {
	load();
	return state;
}
var SERVER_STATE = {
	lanes: DEFAULT_LANES,
	notes: []
};
function useNotes() {
	return useSyncExternalStore((listener) => {
		listeners.add(listener);
		return () => listeners.delete(listener);
	}, getNotesState, () => SERVER_STATE);
}
function addLane(name, color, scope, kind = "notes") {
	const created = lane(newNoteId(), name, color, scope, kind, kind === "notes");
	set({
		...getNotesState(),
		lanes: [...getNotesState().lanes, created]
	});
	return created;
}
function updateLane(id, patch) {
	const current = getNotesState();
	set({
		...current,
		lanes: current.lanes.map((item) => item.id === id ? {
			...item,
			...patch
		} : item)
	});
}
function removeLane(id) {
	const current = getNotesState();
	set({
		lanes: current.lanes.filter((item) => item.id !== id),
		notes: current.notes.filter((note) => note.laneId !== id)
	});
}
function addNote(laneId, anchor, text = "", evidence) {
	const note = {
		id: newNoteId(),
		laneId,
		text,
		label: "",
		anchor,
		...evidence ? { evidence: structuredClone(evidence) } : {}
	};
	const current = getNotesState();
	set({
		...current,
		notes: [...current.notes, note]
	});
	return note;
}
function updateNote(id, patch) {
	const current = getNotesState();
	set({
		...current,
		notes: current.notes.map((note) => note.id === id ? {
			...note,
			...patch
		} : note)
	});
}
function removeNote(id) {
	const current = getNotesState();
	set({
		...current,
		notes: current.notes.filter((note) => note.id !== id)
	});
}
/**
* يعيد الترقيم حسب ترتيب ظهور العلامات في المتن (معرّفات مرتبة).
* التسلسل موحّد واحد على مستوى الصفحة: كل حاشية تأخذ رقمها من موضعها في المتن
* مهما كان نوع مستطيلها (تخريج، فروق، غريب…)، كما في الكتب المحققة.
*/
function renumber(orderedIds) {
	const current = getNotesState();
	const labels = /* @__PURE__ */ new Map();
	let counter = 0;
	for (const id of orderedIds) {
		if (!current.notes.find((item) => item.id === id)) continue;
		counter += 1;
		labels.set(id, String(counter));
	}
	let changed = false;
	const notes = current.notes.map((note) => {
		const label = labels.get(note.id) ?? "";
		if (label !== note.label) changed = true;
		return label === note.label ? note : {
			...note,
			label
		};
	});
	const rank = new Map(orderedIds.map((id, index) => [id, index]));
	notes.sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9));
	if (changed || notes.some((note, index) => note.id !== current.notes[index]?.id)) set({
		...current,
		notes
	});
	return labels;
}
function lanesOfScope(state, scope) {
	return state.lanes.filter((item) => item.scope === scope);
}
// src/components/site/AccountProvider.tsx
var AccountContext = createContext({
	user: null,
	ready: false,
	status: ""
});
var useAccount = () => useContext(AccountContext);
function AccountProvider({ children }) {
	const [user, setUser] = useState(null);
	const [ready, setReady] = useState(false);
	const [status, setStatus] = useState("");
	const identity = useRef(void 0);
	const cloudLoaded = useRef(false);
	useEffect(() => {
		let live = true;
		let generation = 0;
		const activate = async (next) => {
			if (identity.current === (next?.id ?? null)) return;
			identity.current = next?.id ?? null;
			const run = ++generation;
			setReady(false);
			cloudLoaded.current = false;
			setStorageOwner(next?.id ?? null);
			resetNotesCache();
			if (next) {
				const { data, error } = await supabase.from("workspaces").select("payload").eq("user_id", next.id).maybeSingle();
				if (!live || run !== generation) return;
				if (error) setStatus("تعذّرت المزامنة؛ نسختك المحلية محفوظة");
				else {
					cloudLoaded.current = true;
					const payload = data?.payload;
					for (const [key, value] of Object.entries(payload ?? {})) if (key.startsWith("mu7rer:") && !key.includes("key") && typeof value === "string") localStorage.setItem(storageKey(key), value);
					setStatus("متصل بحسابك");
				}
			} else setStatus("نسخة محلية");
			if (live) {
				setUser(next);
				setReady(true);
			}
		};
		supabase.auth.getUser().then(({ data }) => activate(data.user));
		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			if ([
				"SIGNED_IN",
				"SIGNED_OUT",
				"USER_UPDATED"
			].includes(event)) activate(session?.user ?? null);
		});
		return () => {
			live = false;
			subscription.unsubscribe();
		};
	}, []);
	useEffect(() => {
		if (!user || !ready) return;
		let timer;
		const save = () => {
			if (!cloudLoaded.current) return;
			clearTimeout(timer);
			setStatus("جارٍ الحفظ…");
			timer = setTimeout(async () => {
				const { error } = await supabase.from("workspaces").upsert({
					user_id: user.id,
					payload: workspaceSnapshot(),
					updated_at: (/* @__PURE__ */ new Date()).toISOString()
				});
				setStatus(error ? "تعذّرت المزامنة؛ نسختك المحلية محفوظة" : "محفوظ في حسابك");
			}, 900);
		};
		window.addEventListener("workspace-change", save);
		return () => {
			clearTimeout(timer);
			window.removeEventListener("workspace-change", save);
		};
	}, [user, ready]);
	return /* @__PURE__ */ jsx(AccountContext.Provider, {
		value: {
			user,
			ready,
			status
		},
		children: ready ? /* @__PURE__ */ jsx("div", {
			className: "h-full",
			children
		}, user?.id ?? "guest") : /* @__PURE__ */ jsx("div", {
			dir: "rtl",
			className: "grid h-dvh place-items-center bg-background text-sm",
			children: "المُحَرِّر · جارٍ فتح مساحة العمل…"
		})
	});
}
// src/lib/utils.ts
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
// src/components/ui/button.tsx
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
			destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
			outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
			secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
			ghost: "hover:bg-accent hover:text-accent-foreground",
			link: "text-primary underline-offset-4 hover:underline"
		},
		size: {
			default: "h-9 px-4 py-2",
			sm: "h-8 rounded-md px-3 text-xs",
			lg: "h-10 rounded-md px-8",
			icon: "h-9 w-9"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ jsx(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
// src/components/site/SiteShell.tsx
var SECTIONS = [
	{
		to: "/",
		label: "عن المُحَرِّر",
		icon: Home
	},
	{
		to: "/editor",
		label: "المحرر",
		icon: PenLine
	},
	{
		to: "/library",
		label: "الخزانة",
		icon: Library
	},
	{
		to: "/research",
		label: "المراجع والمقابلة",
		icon: Search
	},
	{
		to: "/history",
		label: "السجل والنسخ",
		icon: History
	},
	{
		to: "/account",
		label: "حسابي",
		icon: UserRound
	}
];
function SiteShell({ children }) {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const current = SECTIONS.find((item) => item.to === pathname)?.label ?? "المُحَرِّر";
	const { user, status } = useAccount();
	return /* @__PURE__ */ jsxs("div", {
		dir: "rtl",
		className: "site-shell grid h-dvh min-w-0 grid-rows-[40px_30px_minmax(0,1fr)_24px] overflow-hidden bg-background",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "grid grid-cols-[minmax(0,1fr)_auto] items-center border-b bg-toolbar px-3",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex min-w-0 items-center gap-3",
					children: [
						/* @__PURE__ */ jsx(BookOpen, { className: "size-5 shrink-0 text-primary" }),
						/* @__PURE__ */ jsx(Link, {
							to: "/",
							className: "font-serif text-xl font-bold text-primary",
							children: "المُحَرِّر"
						}),
						/* @__PURE__ */ jsx("span", { className: "h-4 border-l" }),
						/* @__PURE__ */ jsx("h1", {
							className: "truncate text-xs font-semibold",
							children: current
						})
					]
				}), /* @__PURE__ */ jsx(Button, {
					asChild: true,
					variant: "ghost",
					size: "sm",
					className: "h-7 max-w-40 px-2",
					children: /* @__PURE__ */ jsxs(Link, {
						to: "/account",
						children: [/* @__PURE__ */ jsx(UserRound, { className: "size-3.5" }), /* @__PURE__ */ jsx("span", {
							className: "truncate text-[11px]",
							children: user ? user.user_metadata?.["full_name"] ?? "حسابي" : "تسجيل الدخول"
						})]
					})
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex min-w-0 items-center gap-2 border-b bg-panel px-3 text-[10px]",
				children: [
					/* @__PURE__ */ jsx("span", { children: "المُحَرِّر" }),
					/* @__PURE__ */ jsx("span", {
						className: "text-muted-foreground",
						children: "/"
					}),
					/* @__PURE__ */ jsx("span", { children: current }),
					/* @__PURE__ */ jsx("div", { className: "flex-1" }),
					pathname === "/editor" && /* @__PURE__ */ jsxs(Button, {
						variant: "ghost",
						size: "sm",
						className: "h-6 px-1 text-[10px]",
						onClick: () => window.dispatchEvent(new Event("reset-workspace-layout")),
						children: [/* @__PURE__ */ jsx(RotateCcw, { className: "size-3" }), "استعادة العرض الافتراضي"]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid min-h-0 min-w-0 grid-cols-[116px_minmax(0,1fr)] max-sm:grid-cols-[40px_minmax(0,1fr)]",
				children: [/* @__PURE__ */ jsx("nav", {
					"aria-label": "أقسام المُحَرِّر",
					className: "flex min-h-0 flex-col gap-1 border-l bg-sidebar p-1.5",
					children: SECTIONS.map((item) => /* @__PURE__ */ jsx(Button, {
						asChild: true,
						variant: pathname === item.to ? "secondary" : "ghost",
						className: "h-8 justify-start gap-2 px-2 text-[11px] max-sm:justify-center max-sm:px-0",
						children: /* @__PURE__ */ jsxs(Link, {
							to: item.to,
							"aria-label": item.label,
							title: item.label,
							children: [/* @__PURE__ */ jsx(item.icon, { className: "size-4 shrink-0" }), /* @__PURE__ */ jsx("span", {
								className: "max-sm:hidden",
								children: item.label
							})]
						})
					}, item.to))
				}), /* @__PURE__ */ jsx("main", {
					className: "min-h-0 min-w-0 overflow-hidden",
					children
				})]
			}),
			/* @__PURE__ */ jsxs("footer", {
				className: "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t bg-toolbar px-3 text-[9px] text-muted-foreground",
				children: [/* @__PURE__ */ jsx("span", {
					className: "truncate",
					children: "المُحَرِّر · تحقيق النصوص والمخطوطات"
				}), /* @__PURE__ */ jsx("span", {
					className: "truncate",
					children: status
				})]
			})
		]
	});
}
// src/components/ui/sonner.tsx
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ jsx(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
// src/styles.css?url
var styles_default = "/assets/styles-DDzWtW-2.css";
// src/routes/__root.tsx
function NotFoundComponent() {
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ jsx("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ jsx("div", {
					className: "mt-6",
					children: /* @__PURE__ */ jsx(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	useEffect(() => {}, [error]);
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ jsx("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ jsx("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$8 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "المُحَرِّر" },
			{
				name: "description",
				content: "بيئة تحقيق النصوص والمخطوطات"
			},
			{
				name: "author",
				content: "MU7RER-AI"
			},
			{
				property: "og:title",
				content: "المُحَرِّر"
			},
			{
				property: "og:description",
				content: "بيئة تحقيق النصوص والمخطوطات"
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:site",
				content: "@MU7RER_AI"
			}
		],
		links: [
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ jsxs("html", {
		lang: "ar",
		dir: "rtl",
		children: [/* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }), /* @__PURE__ */ jsxs("body", { children: [children, /* @__PURE__ */ jsx(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$8.useRouteContext();
	return /* @__PURE__ */ jsx(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ jsxs(AccountProvider, { children: [/* @__PURE__ */ jsx(SiteShell, { children: /* @__PURE__ */ jsx(Outlet, {}) }), /* @__PURE__ */ jsx(Toaster$1, {})] })
	});
}
// src/lib/page-head.ts
var pageHead = (title, description) => ({ meta: [
	{ title: `${title} — المُحَرِّر` },
	{
		name: "description",
		content: description
	},
	{
		property: "og:title",
		content: `${title} — المُحَرِّر`
	},
	{
		property: "og:description",
		content: description
	},
	{
		property: "og:type",
		content: "website"
	},
	{
		name: "twitter:card",
		content: "summary_large_image"
	}
] });
// src/routes/index.tsx
var $$splitComponentImporter$5 = () => import("./routes-BlFbjiB8.js");
var Route$7 = createFileRoute("/")({
	head: () => pageHead("أقسام المُحَرِّر", "محرر التحقيق وخزانة الكتب وسجل النسخ في مساحة عمل واحدة."),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
// src/routes/account.tsx
var $$splitComponentImporter$4 = () => import("./account-Ci4lLOc3.js");
var Route$6 = createFileRoute("/account")({
	head: () => pageHead("حسابي", "تسجيل الدخول إلى المحرر MU7RER-AI وحفظ مساحة العمل الخاصة بحسابك."),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
// src/routes/editor.tsx
var $$splitComponentImporter$3 = () => import("./editor--Kqgkl5m.js");
var Route$5 = createFileRoute("/editor")({
	head: () => ({ meta: [
		{ title: "المُحَرِّر — بيئة تحقيق نصوص ومخطوطات بالذكاء الاصطناعي" },
		{
			name: "description",
			content: "بيئة عربية متكاملة لتحقيق المخطوطات والمطبوعات: محرر نصوص قوي، كتب كاملة، معالجة صور، نسخ آلي ذكي، حواشٍ، فهارس، ومساعد منفّذ."
		},
		{
			property: "og:title",
			content: "المُحَرِّر — بيئة تحقيق نصوص ومخطوطات"
		},
		{
			property: "og:description",
			content: "حرّر النص في المنتصف، وقابله بصور المخطوط على الجانبين، واستورد كتابًا كاملًا، واستعن بالمساعد الذكي في التحقيق."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary_large_image"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
// src/routes/history.tsx
var $$splitComponentImporter$2 = () => import("./history-DKrUyRGm.js");
var Route$4 = createFileRoute("/history")({
	head: () => pageHead("السجل والنسخ السابقة", "راجع مستنداتك واستعد نسخة محفوظة سابقة في المُحَرِّر."),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
// src/routes/library.tsx
var $$splitComponentImporter$1 = () => import("./library-CgLhLLCm.js");
var Route$3 = createFileRoute("/library")({
	head: () => pageHead("الخزانة", "مستنداتك ونسخ الكتب والطبعات المحفوظة في المُحَرِّر."),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
// src/routes/research.tsx
var $$splitComponentImporter = () => import("./research-B7kp6C0j.js");
var Route$2 = createFileRoute("/research")({
	head: () => pageHead("المراجع والمقابلة", "مراجع المُحَرِّر وشواهد البحث وقرارات المقابلة وتقارير التحقيق."),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
// src/routes/api/ai.ts
var BodySchema$1 = z.object({
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
		"custom"
	]),
	text: z.string().max(24e3).optional(),
	image: z.string().max(14e6).optional(),
	instruction: z.string().max(2e3).optional(),
	apiKey: z.string().max(2048).optional(),
	testKey: z.boolean().optional()
});
var Route$1 = createFileRoute("/api/ai")({ server: { handlers: { POST: async ({ request }) => {
	let body;
	try {
		body = BodySchema$1.parse(await request.json());
	} catch {
		return new Response("طلب غير صالح", { status: 400 });
	}
	if (body.text && !body.image && !body.testKey) {
		const result = executeNativeManuscriptTask({
			task: body.task,
			text: body.text,
			instruction: body.instruction
		});
		if (result.trim()) return new Response(JSON.stringify({ text: result.trim() }), { headers: { "Content-Type": "application/json; charset=utf-8" } });
	}
	const result = executeNativeManuscriptTask({
		task: body.task,
		text: body.text || body.instruction || "نص المخطوط",
		instruction: body.instruction
	});
	return new Response(JSON.stringify({ text: result || "تمت المعالجة عبر المحرك المدمج." }), { headers: { "Content-Type": "application/json; charset=utf-8" } });
} } } });
// src/routes/api/chat.ts
var BodySchema = z.object({
	messages: z.array(z.object({
		role: z.enum(["user", "assistant"]),
		content: z.string().max(2e4)
	})).min(1).max(40),
	documentText: z.string().max(24e3).optional(),
	workingText: z.string().max(24e3).optional(),
	image: z.string().max(14e6).optional(),
	imageLabel: z.string().max(2048).optional(),
	images: z.array(z.object({
		image: z.string().max(14e6).regex(/^data:image\/(png|jpeg|webp);base64,/),
		label: z.string().max(2048)
	})).max(2).optional(),
	context: z.object({
		recordLabel: z.string().max(2048).optional(),
		recordText: z.string().max(24e3),
		selection: z.string().max(8e3).optional(),
		footnotes: z.array(z.string().max(2e4)).max(500),
		images: z.array(z.object({ label: z.string().max(2048) })).max(2)
	}).optional(),
	apiKey: z.string().max(2048).optional()
});
var Route = createFileRoute("/api/chat")({ server: { handlers: { POST: async ({ request }) => {
	let body;
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
		instruction: lastMessage
	});
	const formattedReply = nativeReply.trim() ? `### استجابة محرك التحقيق المحلي (MU7RER-AI)\n\n${nativeReply}` : `أهلاً بك في **MU7RER-AI (المحرر)**. حدّد نصاً في المتن أو اكتب سؤالك التحقيقي (ضبط، تشكيل، تخريج آية أو حديث، تحليل صرفي، أو مقابلة نسخ) ليقوم المحرك بمعالجته فوراً.`;
	return new Response(formattedReply, { headers: {
		"Content-Type": "text/plain; charset=utf-8",
		"Cache-Control": "no-store"
	} });
} } } });
// src/routeTree.gen.ts
var rootRouteChildren = {
	IndexRoute: Route$7.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$8
	}),
	AccountRoute: Route$6.update({
		id: "/account",
		path: "/account",
		getParentRoute: () => Route$8
	}),
	EditorRoute: Route$5.update({
		id: "/editor",
		path: "/editor",
		getParentRoute: () => Route$8
	}),
	HistoryRoute: Route$4.update({
		id: "/history",
		path: "/history",
		getParentRoute: () => Route$8
	}),
	LibraryRoute: Route$3.update({
		id: "/library",
		path: "/library",
		getParentRoute: () => Route$8
	}),
	ResearchRoute: Route$2.update({
		id: "/research",
		path: "/research",
		getParentRoute: () => Route$8
	}),
	ApiAiRoute: Route$1.update({
		id: "/api/ai",
		path: "/api/ai",
		getParentRoute: () => Route$8
	}),
	ApiChatRoute: Route.update({
		id: "/api/chat",
		path: "/api/chat",
		getParentRoute: () => Route$8
	})
};
var routeTree = Route$8._addFileChildren(rootRouteChildren)._addFileTypes();
// src/router.tsx
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var getRouter = () => {
	const queryClient = new QueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
export { readStorage as _, addLane as a, lanesOfScope as c, renumber as d, selectNotesDocument as f, getStorageOwner as g, getRouter, useNotes as h, useAccount as i, removeLane as l, updateNote as m, Button as n, addNote as o, updateLane as p, cn as r, getNotesState as s, router_exports as t, removeNote as u, removeStorage as v, writeStorage as y };
