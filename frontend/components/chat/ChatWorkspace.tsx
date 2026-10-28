"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowUp,
  Check,
  Code2,
  Copy,
  FileCode2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { getAuthPayload, postAuthRequest } from "@/lib/auth-api";
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}
interface ChatRepository {
  id: number | string;
  repo_link: string;
  ingestion_status: string;
}
const suggestedPrompts = [
  "Find the source of a bug in my repository.",
  "Explain how this function works.",
  "Trace a request through my codebase.",
  "Suggest a fix for this error.",
];
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}
function inlineMarkdown(text: string) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[0.9em] text-indigo-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-white/10 bg-[#080a10]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-slate-400">
        <span>{language || "Code"}</span>
        <button
          type="button"
          onClick={() => void copyCode()}
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-6 text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}
function MessageContent({ content }: { content: string }) {
  const blocks = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-3 break-words text-sm leading-7 text-slate-200">
      {blocks.map((block, index) => {
        const codeMatch = block.match(/^```([^\n]*)\n?([\s\S]*?)```$/);
        if (codeMatch) {
          return (
            <CodeBlock
              key={index}
              language={codeMatch[1].trim()}
              code={codeMatch[2].replace(/\n$/, "")}
            />
          );
        }
        const lines = block.split("\n");
        const paragraphs: string[] = [];
        let list: string[] = [];
        const rendered: React.ReactNode[] = [];
        const flushParagraph = () => {
          if (paragraphs.length) {
            rendered.push(
              <p key={`p-${rendered.length}`}>
                {paragraphs.map((line, lineIndex) => (
                  <span key={lineIndex}>
                    {lineIndex > 0 && <br />}
                    {inlineMarkdown(line)}
                  </span>
                ))}
              </p>,
            );
            paragraphs.length = 0;
          }
        };
        const flushList = () => {
          if (list.length) {
            rendered.push(
              <ul
                key={`ul-${rendered.length}`}
                className="list-disc space-y-1 pl-5 marker:text-indigo-400"
              >
                {list.map((line, lineIndex) => (
                  <li key={lineIndex}>{inlineMarkdown(line)}</li>
                ))}
              </ul>,
            );
            list = [];
          }
        };
        lines.forEach((line) => {
          const listItem = line.match(/^\s*[-*]\s+(.+)$/);
          if (listItem) {
            flushParagraph();
            list.push(listItem[1]);
          } else if (line.trim()) {
            flushList();
            paragraphs.push(line);
          } else {
            flushParagraph();
            flushList();
          }
        });
        flushParagraph();
        flushList();
        return <div key={index}>{rendered}</div>;
      })}
    </div>
  );
}
function scrollNearBottom(element: HTMLDivElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight < 160;
}
export default function ChatWorkspace() {
  const params = useParams<{ session_id?: string }>();
  const sessionId = params?.session_id;
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [repository, setRepository] = useState<ChatRepository | null>(null);
  const [historyLoading, setHistoryLoading] = useState(Boolean(sessionId));
  const [historyError, setHistoryError] = useState("");
  const [draft, setDraft] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [retryQuestion, setRetryQuestion] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const requestInFlight = useRef(false);
  const loadHistory = useCallback(async () => {
    if (!sessionId) {
      setMessages([]);
      setRepository(null);
      setHistoryLoading(false);
      setHistoryError("");
      return;
    }
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const payload = asRecord(
        await getAuthPayload(
          `api/chats/history/${encodeURIComponent(sessionId)}`,
        ),
      );
      if (!Array.isArray(payload?.messages)) {
        throw new Error("The server returned an unexpected chat history.");
      }
      const repositoryPayload = asRecord(payload.repository);
      setRepository(
        repositoryPayload &&
          (typeof repositoryPayload.id === "number" ||
            typeof repositoryPayload.id === "string") &&
          typeof repositoryPayload.repo_link === "string" &&
          typeof repositoryPayload.ingestion_status === "string"
          ? {
              id: repositoryPayload.id,
              repo_link: repositoryPayload.repo_link,
              ingestion_status: repositoryPayload.ingestion_status,
            }
          : null,
      );
      setMessages(
        payload.messages.flatMap((value, index) => {
          const message = asRecord(value);
          if (
            !message ||
            typeof message.content !== "string" ||
            (message.role !== "user" && message.role !== "assistant")
          ) {
            return [];
          }
          return [
            {
              id: String(message.id ?? index),
              role: message.role,
              content: message.content,
            },
          ];
        }),
      );
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Unable to load this chat. Please try again.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [sessionId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadHistory(), 0);
    return () => window.clearTimeout(timer);
  }, [loadHistory]);
  useEffect(() => {
    const element = messageListRef.current;
    if (element && shouldAutoScroll.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, sending]);
  useEffect(() => {
    const handleHistoryCleared = () => {
      if (sessionId) void loadHistory();
    };
    window.addEventListener("bugkill:history-cleared", handleHistoryCleared);
    return () =>
      window.removeEventListener("bugkill:history-cleared", handleHistoryCleared);
  }, [loadHistory, sessionId]);
  async function analyzeRepository(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ingesting) return;
    setIngestError("");
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(repoUrl.trim());
    } catch {
      setIngestError("Enter a valid GitHub repository URL.");
      return;
    }
    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.hostname !== "github.com" ||
      parsedUrl.pathname.split("/").filter(Boolean).length < 2
    ) {
      setIngestError("Use a repository URL such as https://github.com/owner/repo.");
      return;
    }
    setIngesting(true);
    try {
      const payload = asRecord(
        await postAuthRequest(
          "api/ingest",
          { repo_url: parsedUrl.href.replace(/\/+$/, "") },
          "Unable to analyze this repository. Please try again.",
        ),
      );
      const repository = asRecord(payload?.repository);
      const sessionIdFromBackend =
        typeof payload?.session_id === "string"
          ? payload.session_id
          : typeof repository?.session_id === "string"
            ? repository.session_id
            : null;

      if (!sessionIdFromBackend) {
        throw new Error("The server did not return a repository session ID.");
      }

      // The backend owns the session. Never generate a second ID here.
      window.dispatchEvent(new Event("bugkill:sessions-updated"));
      router.push(`/chat/${encodeURIComponent(sessionIdFromBackend)}`);
    } catch (error) {
      setIngestError(
        error instanceof Error
          ? error.message
          : "Unable to analyze this repository. Please try again.",
      );
    } finally {
      setIngesting(false);
    }
  }
  async function reindexCurrentSession() {
    if (!sessionId || ingesting) return;
    setIngestError("");
    setIngesting(true);

    try {
      await postAuthRequest(
        "api/ingest",
        { session_id: sessionId },
        "Unable to index this repository. Please try again.",
      );
      window.dispatchEvent(new Event("bugkill:sessions-updated"));
      await loadHistory();
    } catch (error) {
      setIngestError(
        error instanceof Error
          ? error.message
          : "Unable to index this repository. Please try again.",
      );
    } finally {
      setIngesting(false);
    }
  }
  async function sendMessage(question = draft) {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || !sessionId || requestInFlight.current) return;
    requestInFlight.current = true;
    setSendError("");
    setRetryQuestion(trimmedQuestion);
    if (question === draft) {
      setDraft("");
      setMessages((current) => [
        ...current,
        {
          id: `local-${Date.now()}`,
          role: "user",
          content: trimmedQuestion,
        },
      ]);
    }
    setSending(true);
    try {
      const payload = asRecord(
        await postAuthRequest(
          "api/chats",
          { session_id: sessionId, question: trimmedQuestion },
          "BugKill AI could not complete the response. Please try again.",
        ),
      );
      const answer = payload?.answer;
      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("The chat service returned an empty response.");
      }
      shouldAutoScroll.current = true;
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: answer,
        },
      ]);
      window.dispatchEvent(new Event("bugkill:sessions-updated"));
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "BugKill AI could not complete the response. Please try again.",
      );
    } finally {
      requestInFlight.current = false;
      setSending(false);
    }
  }
  function handleComposerKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendMessage();
    }
  }
  const welcome = !sessionId;
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#090b14]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-4 pl-16 md:px-6">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          BugKill AI
        </div>
        <span className="hidden text-xs text-slate-500 sm:block">
          Repository-aware coding assistant
        </span>
      </header>
      <div
        ref={messageListRef}
        onScroll={(event) => {
          shouldAutoScroll.current = scrollNearBottom(event.currentTarget);
        }}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {!welcome &&
          !historyLoading &&
          !historyError &&
          repository &&
          repository.ingestion_status !== "indexed" && (
            <div className="mx-auto mt-5 flex max-w-3xl flex-col gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-amber-200">
                  {repository.ingestion_status === "indexing"
                    ? "Repository indexing is in progress."
                    : "This conversation needs its repository indexed."}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Your saved messages stay in this session while the code is
                  indexed.
                </p>
                {ingestError && (
                  <p role="alert" className="mt-2 text-xs text-red-300">
                    {ingestError}
                  </p>
                )}
              </div>
              {repository.ingestion_status !== "indexing" && (
                <button
                  type="button"
                  onClick={() => void reindexCurrentSession()}
                  disabled={ingesting}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {ingesting && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                  {ingesting ? "Indexing..." : "Index and continue"}
                </button>
              )}
            </div>
          )}
        {welcome ? (
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-5 py-10 sm:px-8">
            <div className="mb-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-400/10">
                <Code2 className="h-7 w-7 text-indigo-300" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
                What are we debugging today?
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                Connect a GitHub repository to understand its code, investigate
                bugs, trace requests, and find relevant files with AI.
              </p>
            </div>
            <form
              onSubmit={analyzeRepository}
              className="rounded-2xl border border-white/10 bg-[#11141e] p-4 shadow-xl sm:p-5"
            >
              <label
                htmlFor="repository-url"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                GitHub repository
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#090b14] px-3">
                  <FileCode2 className="h-4 w-4 shrink-0 text-slate-500" />
                  <input
                    id="repository-url"
                    type="url"
                    value={repoUrl}
                    onChange={(event) => {
                      setRepoUrl(event.target.value);
                      setIngestError("");
                    }}
                    placeholder="https://github.com/owner/repository"
                    disabled={ingesting}
                    required
                    className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600 disabled:opacity-60"
                  />
                </div>
                <button
                  type="submit"
                  disabled={ingesting || !repoUrl.trim()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 text-sm font-semibold transition hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ingesting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {ingesting ? "Analyzing..." : "Analyze repository"}
                </button>
              </div>
              {ingestError && (
                <p role="alert" className="mt-3 text-sm text-red-300">
                  {ingestError}
                </p>
              )}
              {ingesting && (
                <p role="status" className="mt-3 text-xs text-slate-500">
                  Cloning and indexing can take a few minutes. Keep this page open.
                </p>
              )}
            </form>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setDraft(prompt)}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 text-left text-sm text-slate-300 transition hover:border-indigo-400/30 hover:bg-indigo-400/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <Sparkles className="mb-3 h-4 w-4 text-indigo-400" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : historyLoading ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            <span className="ml-3 text-sm">Loading conversation...</span>
          </div>
        ) : historyError ? (
          <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center px-6 text-center">
            <TriangleAlert className="h-8 w-8 text-amber-300" />
            <p role="alert" className="mt-4 text-sm text-slate-300">
              {historyError}
            </p>
            <button
              type="button"
              onClick={() => void loadHistory()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-6 text-center">
            <Code2 className="h-8 w-8 text-indigo-300" />
            <h1 className="mt-4 text-xl font-semibold">Repository connected</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Ask a question about the code, describe a bug, or choose a prompt
              below to begin.
            </p>
            <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setDraft(prompt)}
                  className="rounded-xl border border-white/10 p-3 text-left text-sm text-slate-300 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
            <div className="space-y-8">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex gap-3 sm:gap-4 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`min-w-0 max-w-[90%] sm:max-w-[82%] ${
                      message.role === "user"
                        ? "rounded-2xl rounded-tr-sm bg-[#242938] px-4 py-3"
                        : "flex-1 py-1"
                    }`}
                  >
                    <MessageContent content={message.content} />
                  </div>
                  {message.role === "user" && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-200">
                      You
                    </div>
                  )}
                </article>
              ))}
              {sending && (
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Analyzing your repository...
                  </span>
                </div>
              )}
              {sendError && (
                <div
                  role="alert"
                  className="ml-11 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"
                >
                  <p>{sendError}</p>
                  <button
                    type="button"
                    onClick={() => void sendMessage(retryQuestion)}
                    disabled={sending}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-300/20 px-3 py-1.5 text-xs font-medium hover:bg-red-300/10 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                  </button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>
      <footer className="shrink-0 px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
        {welcome && (
          <div className="mx-auto mb-2 flex max-w-3xl items-center gap-2 text-xs text-slate-500">
            <Plus className="h-3.5 w-3.5" />
            Analyze a GitHub repository to start a chat.
          </div>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
          className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-white/10 bg-[#141823] p-2 shadow-xl focus-within:border-indigo-400/40"
        >
          <textarea
            aria-label="Message BugKill AI"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder={
              welcome
                ? "Connect a repository before sending a question"
                : "Ask anything about this repository..."
            }
            disabled={!sessionId || sending || historyLoading || Boolean(historyError)}
            rows={1}
            className="max-h-40 min-h-11 flex-1 resize-y bg-transparent px-3 py-3 text-sm leading-5 text-white outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={!sessionId || !draft.trim() || sending || historyLoading}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white transition hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
          >
            {sending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-5 w-5" />
            )}
          </button>
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-slate-600">
          Enter to send · Shift+Enter for a new line
        </p>
      </footer>
    </section>
  );
}
