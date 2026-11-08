import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronUp, KeyRound, Loader2, Send, Sparkles, Trash2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { aiRequest, getGeminiKey, normalizeGeminiKey, saveGeminiKey } from "@/lib/ai-client";
import { transformWorkingText } from "@/lib/working-text";
import type { AssistantContext } from "@/lib/assistant-context";

type Message = { role: "user" | "assistant"; content: string };



const SUGGESTIONS = [
  "قابل نص السجل بالمخطوط والمطبوعة",
  "صف ما تراه في الصفحتين المفتوحتين",
  "راجع حواشي هذا السجل",
];

export function AiDock({
  getDocumentText,
  onInsertText,
  onApplyText,
  getSelection,
  getPageImage,
  getContext,
  collapsed,
  onToggle,
}: {
  getDocumentText: () => string;
  onInsertText?: (text: string) => void;
  onApplyText?: (text: string) => void;
  getSelection?: () => string;
  getPageImage?: (pane: "right" | "left") => Promise<{ image: string; label: string } | null>;
  getContext?: () => Promise<AssistantContext>;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userKey, setUserKey] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyStatus, setKeyStatus] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [draft, setDraft] = useState<string | null>(null);
  const [draftSteps, setDraftSteps] = useState<string[]>([]);
  const [withPage, setWithPage] = useState<"none" | "right" | "left" | "both">("both");
  const [seen, setSeen] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = getGeminiKey();
    setUserKey(stored);
    setKeyDraft(stored);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setError(null);
    if (collapsed) onToggle();
    setInput("");
    const history: Message[] = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);

    try {
      const context = await getContext?.();
      const fallback = withPage !== "none" && withPage !== "both" ? await getPageImage?.(withPage) : null;
      const images = context ? context.images.filter(image => withPage === "both" || (withPage === "right" && image.label.startsWith("المخطوط")) || (withPage === "left" && image.label.startsWith("المطبوعة"))) : fallback ? [fallback] : [];
      setSeen(`يرى: ${images.length ? images.map(image => image.label).join("، ") : "النص فقط"} · ${context?.recordLabel ?? "المتن"} · ${context?.footnotes.length ?? 0} حاشية`);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.slice(-20),
          documentText: (context?.recordText ?? getDocumentText()).slice(0, 24000),
          ...(context ? { context: { ...context, recordText: context.recordText.slice(0, 24000), selection: context.selection?.slice(0, 8000), footnotes: context.footnotes.slice(0, 500).map(note => note.slice(0, 20000)), images: images.map(({ label }) => ({ label })) } } : {}),
          ...(draft ? { workingText: draft } : {}),
          ...(images.length ? { images } : {}),
          ...(userKey ? { apiKey: userKey } : {}),
        }),
      });

      if (!response.ok || !response.body) {
        const detail = await response.text().catch(() => "");
        throw new Error(detail || "تعذّر الاتصال بالمساعد.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: acc }]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "خطأ غير متوقع.");
      setMessages(history);
    } finally {
      setBusy(false);
    }
  };

  // نص عمل واحد تتوالى عليه العمليات: كل عملية تُطبَّق على ناتج سابقتها.
  const runOps = async (labels: string[], task = "custom") => {
    if (busy || !labels.length) return;
    setError(null); setBusy(true);
    try {
      const text = await transformWorkingText(draft, getSelection?.() ?? "", getDocumentText().slice(0, 12000), source => aiRequest({ task, text: source, instruction: `نفّذ العمليات التالية مجتمعة على النص نفسه، وأخرج النص النهائي وحده كاملًا: ${labels.join("، ")}` }));
      if (collapsed) onToggle();
      setDraft(text);
      setDraftSteps((steps) => [...steps, ...labels]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "خطأ غير متوقع.");
    } finally { setBusy(false); }
  };
  const quickActions = [
    { label: "تشكيل", task: "tashkeel" },
    { label: "تصحيح", task: "correct" },
    { label: "توحيد الهمزات", task: "hamza" },
    { label: "ترقيم", task: "punctuate" },
    { label: "تنقية النسخ الآلي", task: "ocr-cleanup" },
  ];
  const runAiTask = (task: string) => {
    const label = quickActions.find((item) => item.task === task)?.label ?? task;
    return runOps([label], task === "index-names" ? task : "custom");
  };
  const runSelected = () =>
    runOps(quickActions.filter((item) => selectedTasks.includes(item.task)).map((item) => item.label));

  const draftCard = draft !== null && (
    <div className="space-y-2 rounded-md border border-primary/40 bg-card p-2">
      <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
        <span className="font-semibold text-primary">نص العمل</span>
        {draftSteps.map((step, index) => <span key={index} className="rounded bg-secondary px-1">{step}</span>)}
      </div>
      <textarea value={draft} onChange={(event) => setDraft(event.target.value)} dir="rtl" className="max-h-60 min-h-24 w-full resize-y rounded border bg-background p-2 font-serif text-sm leading-7 outline-none focus:border-ring" />
      <div className="flex gap-1">
        <Button size="sm" className="h-6 text-[10px]" onClick={() => onApplyText?.(draft)}>استبدال في المتن</Button>
        <Button size="sm" variant="secondary" className="h-6 text-[10px]" onClick={() => onInsertText?.(draft)}>إدراج عند المؤشر</Button>
        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setDraft(null); setDraftSteps([]); }}>إلغاء</Button>
      </div>
    </div>
  );

  return (
    <section className="flex h-full min-h-0 flex-col bg-panel">
      <header className="flex shrink-0 flex-nowrap items-center gap-1 border-b bg-toolbar px-1 py-0.5">
        <Sparkles className="size-4 text-primary" />
        <span className="sr-only">المساعد</span>
        <div className={cn("flex items-center gap-0.5 max-lg:hidden", collapsed && "hidden")}>
          {quickActions.slice(0, 4).map((action) => (
            <Button key={action.task} type="button" size="sm" variant={selectedTasks.includes(action.task) ? "secondary" : "ghost"} className="h-6 px-1.5 text-[9px]" aria-pressed={selectedTasks.includes(action.task)} onClick={() => setSelectedTasks((items) => items.includes(action.task) ? items.filter((item) => item !== action.task) : [...items, action.task])}>{action.label}</Button>
          ))}
          <Button size="icon" variant="secondary" className="size-6" disabled={!selectedTasks.length || busy} title="تنفيذ العمليات المحددة على النص" onClick={() => void runSelected()}>{busy ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3" />}</Button>
        </div>
        {getPageImage && !collapsed && (
          <select aria-label="الصفحة التي يراها المساعد" value={withPage} onChange={(event) => setWithPage(event.target.value as "none" | "right" | "left" | "both")} className="h-7 min-w-0 rounded border bg-background px-1 text-[10px]">
            <option value="both">يرى الصفحتين</option>
            <option value="right">يرى المخطوط</option>
            <option value="left">يرى المطبوعة</option>
            <option value="none">النص فقط</option>
          </select>
        )}
        <form className="flex min-w-0 flex-1 items-center gap-1" onSubmit={(event) => { event.preventDefault(); void send(input); }}>
          <Textarea aria-label="اسأل المساعد" rows={1} value={input} onChange={(event) => { setInput(event.target.value); event.target.style.height = "30px"; event.target.style.height = `${Math.min(50, Math.max(30, event.target.scrollHeight))}px`; }} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input); } }} placeholder="اسأل المساعد…" className="h-[30px] max-h-[50px] min-h-[30px] min-w-0 resize-none overflow-y-auto bg-background px-2 py-1 text-xs leading-5" />
          <Button type="submit" size="icon" variant="ghost" className="size-6" disabled={busy || !input.trim()} title="إرسال"><Send className="size-3.5" /></Button>
        </form>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="icon" variant="ghost" className="size-7" title="إعدادات المفتاح">
              <KeyRound className={cn("size-4", userKey && "text-primary")} />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" dir="rtl" className="w-80 max-w-[calc(100vw-2rem)] space-y-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              مفتاح Gemini من Google AI Studio فقط؛ يُقبل دون اشتراط بادئة. يُحفظ لحسابك في هذا المتصفح بعد نجاح الاتصال.
            </p>
            <Input
              type="password"
              dir="ltr"
              placeholder="مفتاح Gemini"
              value={keyDraft}
              onChange={(event) => setKeyDraft(event.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={keyBusy || !keyDraft.trim()}
                onClick={async () => {
                  const value = normalizeGeminiKey(keyDraft);
                  setKeyBusy(true); setKeyStatus("جارٍ التحقق من المفتاح…");
                  try {
                    const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task: "custom", text: "اختبار اتصال", instruction: "أجب بكلمة واحدة: متصل", apiKey: value, testKey: true }) });
                    const detail = await response.text();
                    if (!response.ok) { let message = detail; try { message = JSON.parse(detail).error ?? detail; } catch { /* plain message */ } throw new Error(message); }
                    saveGeminiKey(value); setUserKey(value); setKeyDraft(value);
                    setKeyStatus("تم التحقق؛ مفتاحك مستخدم في المساعد وجميع أدوات النص والنسخ.");
                  } catch (caught) { setKeyStatus(caught instanceof Error ? caught.message : "تعذّر التحقق من المفتاح"); }
                  finally { setKeyBusy(false); }
                }}
              >
                {keyBusy ? <Loader2 className="size-3 animate-spin" /> : <KeyRound className="size-3" />} تحقق واستخدام
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setKeyDraft("");
                  setUserKey("");
                  saveGeminiKey(""); setKeyStatus("تم تفعيل خدمة التطبيق.");
                }}
              >
                خدمة التطبيق
              </Button>
            </div>
            {keyStatus && <p role="status" className="break-words text-xs leading-6">{keyStatus}</p>}
          </PopoverContent>
        </Popover>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          title="مسح المحادثة"
          onClick={() => {
            setMessages([]);
            setDraft(null);
            setDraftSteps([]);
            setError(null);
          }}
        >
          <Trash2 className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" className="size-7" title="طي/إظهار" onClick={onToggle}>
          {collapsed ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </header>
      {collapsed && (error || draft !== null) && (
        <button type="button" onClick={onToggle} className="truncate border-b px-2 py-0.5 text-start text-[10px] text-destructive">
          {error ?? "نص العمل جاهز — افتح المساعد لمراجعته وتطبيقه"}
        </button>
      )}

      {!collapsed && (
        <>
          {seen && <p role="status" className="truncate border-b bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{seen}</p>}
          <div className="flex flex-wrap gap-1 border-b bg-toolbar/50 px-2 py-1.5">
            {quickActions.map((action) => (
              <Button
                key={action.task}
                type="button"
                disabled={busy}
                onClick={() => void runAiTask(action.task)}
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px]"
              >
                {action.label}
              </Button>
            ))}
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {draftCard}
            {messages.length === 0 && draft === null && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  اسألني عن استخدام المحرر وخصائصه وحل مشكلاته، أو استعن بي في تحرير النص.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void send(suggestion)}
                      className="rounded-full border bg-card px-3 py-1 text-[11px] hover:bg-secondary"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "max-w-[85ch] rounded-lg px-3 py-2 text-sm",
                  message.role === "user"
                    ? "ms-auto bg-primary text-primary-foreground"
                    : "me-auto bg-card shadow-panel",
                )}
              >
                {message.role === "assistant" ? (
                  message.content ? (
                    <div className="space-y-2">
                      <div className="ai-prose">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {onInsertText && message.content.trim().length > 0 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                          onClick={() => onInsertText(message.content)}
                        >
                          إدراج في المحرر
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )
                ) : (
                  <span className="whitespace-pre-wrap">{message.content}</span>
                )}
              </div>
            ))}

            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>

          <form
            className="hidden items-end gap-2 border-t bg-toolbar p-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder="اكتب سؤالك… (Enter للإرسال، Shift+Enter لسطر جديد)"
              className="max-h-32 min-h-9 resize-none bg-background text-sm"
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim()} title="إرسال">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
        </>
      )}
    </section>
  );
}
