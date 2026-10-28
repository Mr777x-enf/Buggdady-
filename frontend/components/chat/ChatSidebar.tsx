"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Bug,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  LogOut,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { authRequest, getAuthPayload } from "@/lib/auth-api";

interface ChatSession {
  session_id: string;
  repo_link: string;
  last_message: string | null;
}

interface SidebarUser {
  name: string;
  email: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function repositoryName(repoLink: string) {
  const parts = repoLink.replace(/\/+$/, "").split("/");
  return parts.slice(-2).join("/") || repoLink;
}

export default function ChatSidebar({
  user,
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
}: {
  user: SidebarUser | null;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busySession, setBusySession] = useState("");
  const [logoutError, setLogoutError] = useState("");

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const payload = asRecord(await getAuthPayload("api/chats/sessions"));
      const values = payload?.sessions;

      if (!Array.isArray(values)) {
        throw new Error("The server returned an unexpected chat list.");
      }

      setSessions(
        values.filter((value): value is ChatSession => {
          const session = asRecord(value);
          return (
            typeof session?.session_id === "string" &&
            typeof session.repo_link === "string" &&
            (typeof session.last_message === "string" ||
              session.last_message === null)
          );
        }),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load chat history.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSessions(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSessions, pathname]);

  useEffect(() => {
    const refresh = () => void loadSessions();
    window.addEventListener("bugkill:sessions-updated", refresh);
    return () => window.removeEventListener("bugkill:sessions-updated", refresh);
  }, [loadSessions]);

  async function handleLogout() {
    setLogoutError("");

    try {
      const response = await authRequest("api/users/logout", {
        method: "POST",
        retry: false,
      });

      if (!response.ok) {
        throw new Error("Unable to log out. Please try again.");
      }

      router.replace("/");
      router.refresh();
    } catch (logoutFailure) {
      setLogoutError(
        logoutFailure instanceof Error
          ? logoutFailure.message
          : "Unable to log out. Please try again.",
      );
    }
  }

  async function clearHistory(sessionId: string) {
    if (!window.confirm("Clear the saved messages for this chat?")) return;

    setBusySession(sessionId);
    setError("");

    try {
      const response = await authRequest(
        `api/chats/history/${encodeURIComponent(sessionId)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error("Unable to clear this chat. Please try again.");
      }

      window.dispatchEvent(new Event("bugkill:history-cleared"));
      await loadSessions();
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : "Unable to clear this chat. Please try again.",
      );
    } finally {
      setBusySession("");
    }
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-white/10 bg-[#0e111b] p-3 text-white transition-transform duration-200 md:relative md:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      } ${collapsed ? "md:w-[4.5rem]" : "md:w-72"}`}
    >
      <div
        className={`mb-5 flex items-center ${
          collapsed ? "md:justify-center" : "justify-between"
        }`}
      >
        <Link
          href="/chat"
          onClick={onCloseMobile}
          aria-label="BugKill AI home"
          className="flex min-w-0 items-center gap-2 rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <Bug className="h-6 w-6 shrink-0 text-indigo-400" />
          <span className={collapsed ? "md:hidden" : ""}>
            <span className="font-bold">BugKill</span>{" "}
            <span className="font-bold text-indigo-400">AI</span>
          </span>
        </Link>
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapsed}
          className="hidden rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white md:block"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <Link
        href="/chat"
        onClick={onCloseMobile}
        title="New chat"
        className={`mb-5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-medium transition hover:border-indigo-400/40 hover:bg-indigo-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
          collapsed ? "md:justify-center md:px-0" : ""
        }`}
      >
        <Plus className="h-4 w-4 shrink-0" />
        <span className={collapsed ? "md:hidden" : ""}>New chat</span>
      </Link>

      <div className={`mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500 ${collapsed ? "md:hidden" : ""}`}>
        Recent repositories
      </div>

      <nav aria-label="Chat history" className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-5 text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" />
          </div>
        )}
        {!loading && sessions.length === 0 && !error && (
          <p className={`px-2 py-3 text-xs leading-5 text-slate-500 ${collapsed ? "md:hidden" : ""}`}>
            Your analyzed repositories will appear here.
          </p>
        )}
        {sessions.map((session) => {
          const href = `/chat/${encodeURIComponent(session.session_id)}`;
          const active = pathname === href;

          return (
            <div
              key={session.session_id}
              className={`group flex items-center gap-1 rounded-lg ${
                active ? "bg-white/10" : "hover:bg-white/[0.06]"
              }`}
            >
              <Link
                href={href}
                onClick={onCloseMobile}
                title={repositoryName(session.repo_link)}
                className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  active ? "text-white" : "text-slate-300"
                } ${collapsed ? "md:justify-center md:px-0" : ""}`}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-slate-500" />
                <span className={`truncate ${collapsed ? "md:hidden" : ""}`}>
                  {repositoryName(session.repo_link)}
                </span>
              </Link>
              {!collapsed && (
                <button
                  type="button"
                  aria-label={`Clear chat history for ${repositoryName(session.repo_link)}`}
                  title="Clear saved messages"
                  disabled={busySession === session.session_id}
                  onClick={() => void clearHistory(session.session_id)}
                  className="mr-1 rounded p-2 text-slate-500 opacity-0 transition hover:bg-white/10 hover:text-red-300 focus:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50"
                >
                  {busySession === session.session_id ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </nav>

      {(error || logoutError) && (
        <div
          role="alert"
          className={`mb-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-200 ${collapsed ? "md:hidden" : ""}`}
        >
          {error || logoutError}
          {error && (
            <button
              type="button"
              onClick={() => void loadSessions()}
              className="ml-1 underline"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div
        className={`mt-3 border-t border-white/10 pt-3 ${
          collapsed ? "md:flex md:justify-center" : ""
        }`}
      >
        <div
          className={`flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 ${
            collapsed ? "md:hidden" : ""
          }`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-200">
            {user?.name?.slice(0, 1).toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name || "Account"}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          title="Log out"
          className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
            collapsed ? "md:mt-0 md:w-auto md:justify-center md:px-2" : ""
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className={collapsed ? "md:hidden" : ""}>Log out</span>
        </button>
      </div>
    </aside>
  );
}
