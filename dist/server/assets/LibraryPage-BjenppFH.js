import { i as useAccount, n as Button, y as writeStorage } from "./router-BzqaA8hu.js";
import { t as Input } from "./input-CMPGM22e.js";
import { A as SourceKindDialog, G as saveBookMeta, H as newBook, I as importFilesToPages, J as listSources, K as storeOriginalFiles, L as addPages, Q as setSourceKind, R as adoptPaneBooks, S as SelectValue, V as loadBookMeta, X as renameGroup, Y as recordSource, Z as saveSource, _ as snapshotVersion, a as createDoc, b as SelectItem, g as setActiveDocId, l as formatWhen, m as saveDoc, p as listDocs, q as catalogOriginalBook, s as duplicateDoc, t as PageReview, v as Select, x as SelectTrigger, y as SelectContent, z as getOriginalFile } from "./PageReview-DkbXMeOJ.js";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { BookOpen, Copy, Download, FileText, FolderOpen, History, Loader2, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
// src/components/site/SourceLibrary.tsx
function SourceLibrary() {
	const [sources, setSources] = useState([]);
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState("");
	const [groupId, setGroupId] = useState("original");
	const [page, setPage] = useState("0");
	const [pane, setPane] = useState("right");
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState("");
	const [groupName, setGroupName] = useState("");
	const [pendingFiles, setPendingFiles] = useState([]);
	const { user } = useAccount();
	const input = useRef(null);
	const navigate = useNavigate();
	const refresh = () => {
		try {
			adoptPaneBooks();
			setSources(listSources());
		} catch (caught) {
			toast.error(String(caught));
		}
	};
	useEffect(refresh, []);
	const source = sources.find((item) => item.id === selected);
	const group = source?.groups.find((item) => item.id === groupId);
	const book = source ? groupId === "original" ? catalogOriginalBook(source) : group?.book : void 0;
	const selectSource = (item) => {
		setSelected(item.id);
		setGroupId("original");
		setPage("0");
		setPane(item.kind === "print" ? "left" : "right");
	};
	const importFiles = async (files, kind) => {
		if (!files.length) return;
		setBusy(true);
		setProgress("جارٍ حفظ المصدر…");
		try {
			const pages = await importFilesToPages(files, (done, total, label) => setProgress(`${label} · ${done}/${total}`));
			if (!pages.length) throw new Error("لا صفحات قابلة للاستيراد");
			const initial = newBook(files[0]?.name.replace(/\.[^.]+$/, "") ?? "مصدر");
			const filesSaved = await storeOriginalFiles(initial, files);
			const imported = await addPages(initial, pages, filesSaved);
			const classified = {
				...recordSource(imported, "استيراد", [], imported.pages.map((item) => item.id)),
				kind,
				files: filesSaved
			};
			saveSource(classified);
			refresh();
			selectSource(classified);
			toast.success(`حُفظ المصدر · ${pages.length} صفحة`);
		} catch (caught) {
			toast.error(caught instanceof Error ? caught.message : "تعذّر حفظ المصدر");
			refresh();
		} finally {
			setBusy(false);
			setProgress("");
		}
	};
	const openBook = (chosen) => {
		const key = `mu7rer:book-${pane}`;
		saveBookMeta(key, chosen);
		writeStorage(`${key}:page-index`, page);
		writeStorage(`${key}:group-id`, groupId);
		navigate({ to: "/editor" });
	};
	const download = async (fileId, name) => {
		if (!source) return;
		try {
			const blob = await getOriginalFile(source.id, fileId);
			if (!blob) throw new Error("تعذّر استدعاء الملف الأصلي");
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = name;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1e3);
		} catch (caught) {
			toast.error(caught instanceof Error ? caught.message : "تعذّر التنزيل");
		}
	};
	return /* @__PURE__ */ jsxs("section", {
		className: "mb-6 border-b pb-5",
		children: [
			/* @__PURE__ */ jsx(SourceKindDialog, {
				open: pendingFiles.length > 0,
				onCancel: () => setPendingFiles([]),
				onChoose: (kind) => {
					const files = pendingFiles;
					setPendingFiles([]);
					importFiles(files, kind);
				}
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "mb-4 flex flex-wrap items-center gap-3",
				children: [
					/* @__PURE__ */ jsx(BookOpen, { className: "size-5 text-primary" }),
					/* @__PURE__ */ jsx("h2", {
						className: "text-sm font-semibold",
						children: "خزانة المصادر"
					}),
					/* @__PURE__ */ jsxs("span", {
						className: "text-xs text-muted-foreground",
						children: [sources.length, " مصدر"]
					}),
					/* @__PURE__ */ jsx("div", { className: "flex-1" }),
					/* @__PURE__ */ jsx(Input, {
						"aria-label": "بحث في المصادر",
						placeholder: "عنوان المصدر أو رمز النسخة",
						className: "h-8 max-w-64 text-xs",
						value: query,
						onChange: (event) => setQuery(event.target.value)
					}),
					/* @__PURE__ */ jsxs(Button, {
						size: "sm",
						disabled: busy,
						onClick: () => {
							if (!user) {
								toast.error("سجّل الدخول أولًا لحفظ كتبك في حسابك");
								navigate({ to: "/account" });
								return;
							}
							input.current?.click();
						},
						children: [busy ? /* @__PURE__ */ jsx(Loader2, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsx(FolderOpen, { className: "size-4" }), "استيراد مصدر"]
					}),
					/* @__PURE__ */ jsx("input", {
						ref: input,
						className: "hidden",
						type: "file",
						multiple: true,
						accept: "image/*,.pdf,.zip,.cbz",
						"aria-label": "ملفات المصدر",
						onChange: (event) => {
							if (user) setPendingFiles(Array.from(event.target.files ?? []));
							event.target.value = "";
						}
					})
				]
			}),
			progress && /* @__PURE__ */ jsx("p", {
				role: "status",
				className: "mb-3 text-xs text-primary",
				children: progress
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid min-w-0 gap-5 lg:grid-cols-[minmax(180px,260px)_minmax(0,1fr)]",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "space-y-1",
					children: [sources.filter((item) => `${item.title} ${item.witness}`.includes(query)).map((item) => /* @__PURE__ */ jsxs(Button, {
						variant: selected === item.id ? "secondary" : "ghost",
						className: "h-auto min-h-14 w-full justify-start whitespace-normal text-start",
						onClick: () => selectSource(item),
						children: [/* @__PURE__ */ jsx(BookOpen, { className: "size-4 shrink-0" }), /* @__PURE__ */ jsxs("span", {
							className: "min-w-0",
							children: [/* @__PURE__ */ jsx("span", {
								className: "block break-words text-xs font-semibold",
								children: item.title
							}), /* @__PURE__ */ jsxs("span", {
								className: "text-[10px] text-muted-foreground",
								children: [
									item.witness,
									" · ",
									item.originals.length,
									" أصل · ",
									item.groups.length,
									" مجموعة"
								]
							})]
						})]
					}, item.id)), !sources.length && /* @__PURE__ */ jsx("p", {
						className: "py-5 text-xs text-muted-foreground",
						children: "لا مصادر محفوظة بعد."
					})]
				}), source && book ? /* @__PURE__ */ jsxs("div", {
					className: "min-w-0 border-s ps-5 max-sm:border-s-0 max-sm:ps-0",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "mb-4 flex flex-wrap items-center gap-3",
							children: [/* @__PURE__ */ jsx("h3", {
								className: "break-words font-serif text-xl",
								children: source.title
							}), /* @__PURE__ */ jsxs(Select, {
								value: source.kind,
								onValueChange: (value) => {
									setSourceKind(source.id, value === "print" ? "print" : "manuscript");
									refresh();
								},
								children: [/* @__PURE__ */ jsx(SelectTrigger, {
									className: "h-8 w-28",
									"aria-label": "نوع المصدر",
									children: /* @__PURE__ */ jsx(SelectValue, {})
								}), /* @__PURE__ */ jsxs(SelectContent, { children: [/* @__PURE__ */ jsx(SelectItem, {
									value: "manuscript",
									children: "مخطوط"
								}), /* @__PURE__ */ jsx(SelectItem, {
									value: "print",
									children: "مطبوع"
								})] })]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
							children: [
								/* @__PURE__ */ jsxs("label", {
									className: "space-y-1 text-xs",
									children: ["المجموعة", /* @__PURE__ */ jsxs(Select, {
										value: groupId,
										onValueChange: (value) => {
											setGroupId(value);
											setPage("0");
											setGroupName(source.groups.find((item) => item.id === value)?.name ?? "");
										},
										children: [/* @__PURE__ */ jsx(SelectTrigger, {
											"aria-label": "مجموعة المصدر",
											className: "w-full",
											children: /* @__PURE__ */ jsx(SelectValue, {})
										}), /* @__PURE__ */ jsxs(SelectContent, { children: [/* @__PURE__ */ jsx(SelectItem, {
											value: "original",
											children: "الأصل المحفوظ"
										}), source.groups.map((item) => /* @__PURE__ */ jsxs(SelectItem, {
											value: item.id,
											children: [
												item.name,
												" · ",
												item.book.pages.length,
												" صفحة"
											]
										}, item.id))] })]
									})]
								}),
								/* @__PURE__ */ jsxs("label", {
									className: "space-y-1 text-xs",
									children: ["الصفحة", /* @__PURE__ */ jsxs(Select, {
										value: page,
										onValueChange: setPage,
										children: [/* @__PURE__ */ jsx(SelectTrigger, {
											"aria-label": "صفحة الاستدعاء",
											className: "w-full",
											children: /* @__PURE__ */ jsx(SelectValue, {})
										}), /* @__PURE__ */ jsx(SelectContent, { children: book.pages.map((item, index) => /* @__PURE__ */ jsxs(SelectItem, {
											value: String(index),
											children: [
												index + 1,
												" · ",
												item.name
											]
										}, item.id)) })]
									})]
								}),
								/* @__PURE__ */ jsxs("label", {
									className: "space-y-1 text-xs",
									children: ["لوح العرض", /* @__PURE__ */ jsxs(Select, {
										value: pane,
										onValueChange: setPane,
										children: [/* @__PURE__ */ jsx(SelectTrigger, {
											"aria-label": "لوح الاستدعاء",
											className: "w-full",
											children: /* @__PURE__ */ jsx(SelectValue, {})
										}), /* @__PURE__ */ jsxs(SelectContent, { children: [/* @__PURE__ */ jsx(SelectItem, {
											value: "right",
											children: "اليمين"
										}), /* @__PURE__ */ jsx(SelectItem, {
											value: "left",
											children: "اليسار"
										})] })]
									})]
								}),
								/* @__PURE__ */ jsxs(Button, {
									className: "self-end",
									disabled: !book.pages.length,
									onClick: () => openBook(book),
									children: [/* @__PURE__ */ jsx(BookOpen, { className: "size-4" }), "استدعاء"]
								})
							]
						}),
						group && /* @__PURE__ */ jsxs("form", {
							className: "mt-3 flex gap-2",
							onSubmit: (event) => {
								event.preventDefault();
								renameGroup(source.id, group.id, groupName);
								refresh();
							},
							children: [/* @__PURE__ */ jsx(Input, {
								"aria-label": "اسم مجموعة العمل",
								value: groupName,
								onChange: (event) => setGroupName(event.target.value),
								className: "h-8 max-w-72 text-xs"
							}), /* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "outline",
								type: "submit",
								children: "حفظ الاسم"
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "mt-5 border-t pt-3",
							children: [
								/* @__PURE__ */ jsx("h4", {
									className: "mb-2 text-xs font-semibold",
									children: "ملفات الاستيراد الأصلية"
								}),
								source.files.map((file) => /* @__PURE__ */ jsxs("div", {
									className: "flex min-w-0 items-center gap-2 py-1",
									children: [
										/* @__PURE__ */ jsx("span", {
											className: "min-w-0 flex-1 truncate text-xs",
											children: file.name
										}),
										/* @__PURE__ */ jsxs("span", {
											className: "text-[10px] text-muted-foreground",
											children: [Math.round(file.size / 1024), " KB"]
										}),
										/* @__PURE__ */ jsx(Button, {
											size: "icon",
											variant: "ghost",
											title: `تنزيل الأصل ${file.name}`,
											onClick: () => void download(file.id, file.name),
											children: /* @__PURE__ */ jsx(Download, { className: "size-4" })
										})
									]
								}, file.id)),
								!source.files.length && /* @__PURE__ */ jsx("p", {
									className: "text-xs text-muted-foreground",
									children: "مصدر سابق: الصور محفوظة؛ ملف الاستيراد الأصلي غير متوفر."
								})
							]
						}),
						/* @__PURE__ */ jsxs("details", {
							className: "mt-4 border-t pt-3",
							children: [/* @__PURE__ */ jsxs("summary", {
								className: "cursor-pointer text-xs font-semibold",
								children: [
									/* @__PURE__ */ jsx(History, { className: "me-2 inline size-4" }),
									"سجل العمليات · ",
									source.operations.length
								]
							}), /* @__PURE__ */ jsx("ol", {
								className: "mt-2 max-h-48 overflow-auto",
								children: source.operations.map((operation) => /* @__PURE__ */ jsxs("li", {
									className: "border-b py-2 text-xs",
									children: [
										/* @__PURE__ */ jsx("span", {
											className: "font-semibold",
											children: operation.kind
										}),
										/* @__PURE__ */ jsx("span", {
											className: "ms-3 text-muted-foreground",
											children: new Date(operation.at).toLocaleString("ar")
										}),
										/* @__PURE__ */ jsxs("p", {
											className: "mt-1 break-all text-[10px] text-muted-foreground",
											children: [
												operation.inputs.length,
												" مدخل ← ",
												operation.outputs.length,
												" ناتج"
											]
										})
									]
								}, operation.id))
							})]
						})
					]
				}) : /* @__PURE__ */ jsx("div", {
					className: "py-5 text-xs text-muted-foreground",
					children: "اختر مصدرًا من الخزانة."
				})]
			})
		]
	});
}
// src/components/site/LibraryPage.tsx
function LibraryPage({ history = false }) {
	const [docs, setDocs] = useState([]);
	const [books, setBooks] = useState([]);
	const [query, setQuery] = useState("");
	const navigate = useNavigate();
	useEffect(() => {
		setDocs(listDocs());
		setBooks([loadBookMeta("mu7rer:book-right"), loadBookMeta("mu7rer:book-left")].filter((book) => Boolean(book)));
	}, []);
	const open = (id) => {
		setActiveDocId(id);
		navigate({ to: "/editor" });
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "h-full overflow-auto p-4",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b pb-3",
				children: [/* @__PURE__ */ jsx(Input, {
					"aria-label": "بحث في المستندات",
					placeholder: "ابحث بعنوان المستند…",
					value: query,
					onChange: (e) => setQuery(e.target.value),
					className: "h-8 max-w-sm text-xs"
				}), !history && /* @__PURE__ */ jsxs(Button, {
					size: "sm",
					onClick: () => open(createDoc().id),
					children: [/* @__PURE__ */ jsx(Plus, { className: "size-3.5" }), "مستند جديد"]
				})]
			}),
			!history && /* @__PURE__ */ jsx(SourceLibrary, {}),
			!history && /* @__PURE__ */ jsx("div", {
				className: "mb-6 border-b pb-5",
				children: /* @__PURE__ */ jsx(PageReview, { onOpenDocument: open })
			}),
			/* @__PURE__ */ jsx("h2", {
				className: "mb-3 text-xs font-semibold",
				children: history ? "سجل المستندات والنسخ المحفوظة" : "المستندات"
			}),
			/* @__PURE__ */ jsx("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: docs.filter((doc) => doc.title.includes(query)).map((doc) => /* @__PURE__ */ jsxs("article", {
					className: "min-w-0 rounded-md border bg-card p-3",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex min-w-0 items-center gap-2",
							children: [/* @__PURE__ */ jsx(FileText, { className: "size-4 shrink-0 text-primary" }), /* @__PURE__ */ jsx("h3", {
								className: "truncate text-xs font-semibold",
								children: doc.title
							})]
						}),
						/* @__PURE__ */ jsx("p", {
							className: "my-2 text-[10px] text-muted-foreground",
							children: formatWhen(doc.updatedAt)
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex gap-1",
							children: [/* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "secondary",
								className: "h-7",
								onClick: () => open(doc.id),
								children: "فتح"
							}), !history && /* @__PURE__ */ jsx(Button, {
								size: "icon",
								variant: "ghost",
								className: "size-7",
								"aria-label": "نسخ المستند",
								onClick: () => {
									duplicateDoc(doc.id);
									setDocs(listDocs());
								},
								children: /* @__PURE__ */ jsx(Copy, { className: "size-3.5" })
							})]
						}),
						history && /* @__PURE__ */ jsx("div", {
							className: "mt-3 border-t pt-2",
							children: doc.versions.length === 0 ? /* @__PURE__ */ jsx("p", {
								className: "text-[10px] text-muted-foreground",
								children: "لا نسخ سابقة محفوظة"
							}) : doc.versions.map((version) => /* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b py-1",
								children: [/* @__PURE__ */ jsx("span", {
									className: "truncate text-[10px]",
									children: formatWhen(version.createdAt)
								}), /* @__PURE__ */ jsxs(Button, {
									variant: "ghost",
									size: "sm",
									className: "h-6 px-1 text-[10px]",
									onClick: () => {
										if (!window.confirm("استعادة هذه النسخة؟ ستُحفظ النسخة الحالية قبل الاستعادة.")) return;
										snapshotVersion(doc.id);
										saveDoc(doc.id, { html: version.html });
										setDocs(listDocs());
										toast.success("استُعيدت النسخة");
									},
									children: [/* @__PURE__ */ jsx(RotateCcw, { className: "size-3" }), "استعادة"]
								})]
							}, version.id))
						})
					]
				}, doc.id))
			}),
			docs.length === 0 && /* @__PURE__ */ jsx("p", {
				className: "mt-5 text-xs text-muted-foreground",
				children: "لا مستندات محفوظة بعد."
			})
		]
	});
}
export { LibraryPage as t };
