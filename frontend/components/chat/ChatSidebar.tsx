
"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bug,
  Plus,
  MessageSquare,
  Settings,
  PanelLeftClose,
} from "lucide-react";

export default function ChatSidebar() {
  const [chats] = useState([
    { id: "demo-1", title: "Fix authentication bug" },
    { id: "demo-2", title: "Explain middleware" },
    { id: "demo-3", title: "Database connection issue" },
  ]);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 p-3 text-white">
      <div className="mb-6 flex items-center justify-between px-2 py-2">
        <Link href="/" className="flex items-center gap-2">
          <Bug className="h-6 w-6 text-indigo-400" />
          <span className="font-bold">
            BugKill <span className="text-indigo-400">AI</span>
          </span>
        </Link>

        <button
          type="button"
          aria-label="Sidebar"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <Link
        href="/"
        className="mb-6 flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-3 text-sm hover:bg-slate-800"
      >
        <Plus className="h-4 w-4" />
        New chat
      </Link>

      <p className="mb-3 px-2 text-xs font-medium uppercase tracking-wider text-slate-500">
        Recent chats
      </p>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {chats.map((chat) => (
          <Link
            key={chat.id}
            href={`/chat/${chat.id}`}
            className="flex items-center gap-2 truncate rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="truncate">{chat.title}</span>
          </Link>
        ))}
      </nav>

      <button
        type="button"
        className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm text-slate-300 hover:bg-slate-800"
      >
        <Settings className="h-4 w-4" />
        Settings
      </button>
    </aside>
  );
}
