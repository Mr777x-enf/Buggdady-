"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { authRequest, AuthRequestError } from "@/lib/auth-api";
import ChatSidebar from "./ChatSidebar";

interface CurrentUser {
  name: string;
  email: string;
}

type AuthState = "checking" | "authenticated" | "unavailable";

export default function ChatLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let active = true;

    authRequest("api/users/me")
      .then(async (response) => {
        if (!active) return;

        if (response.status === 401) {
          router.replace("/");
          return;
        }

        if (!response.ok) {
          setAuthState("unavailable");
          return;
        }

        const payload: unknown = await response.json().catch(() => null);
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("user" in payload) ||
          typeof payload.user !== "object" ||
          payload.user === null ||
          !("name" in payload.user) ||
          !("email" in payload.user) ||
          typeof payload.user.name !== "string" ||
          typeof payload.user.email !== "string"
        ) {
          setAuthState("unavailable");
          return;
        }

        setUser({
          name: payload.user.name,
          email: payload.user.email,
        });
        setAuthState("authenticated");
      })
      .catch((error: unknown) => {
        if (!active) return;

        if (error instanceof AuthRequestError && error.status === 401) {
          router.replace("/");
          return;
        }

        setAuthState("unavailable");
      });

    return () => {
      active = false;
    };
  }, [attempt, router]);

  if (authState === "checking") {
    return (
      <main
        aria-label="Verifying authentication"
        className="flex min-h-screen items-center justify-center bg-[#090b14] text-slate-400"
      >
        <LoaderCircle className="h-6 w-6 animate-spin" />
      </main>
    );
  }

  if (authState === "unavailable") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090b14] px-5 text-white">
        <section className="max-w-md rounded-2xl border border-white/10 bg-[#10131e] p-7 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-amber-300" />
          <h1 className="mt-4 text-xl font-semibold">
            Couldn&apos;t verify your session
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            We can&apos;t safely load your chats until the authentication
            service responds. Your session has not been cleared.
          </p>
          <button
            type="button"
            onClick={() => {
              setAuthState("checking");
              setAttempt((value) => value + 1);
            }}
            className="mt-5 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-400"
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#090b14] text-white">
      <ChatSidebar
        user={user}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        onCloseMobile={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
        />
      )}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={() => setMobileOpen(true)}
          className="absolute left-3 top-3 z-20 rounded-lg border border-white/10 bg-[#10131e] p-2 text-slate-300 md:hidden"
        >
          <span className="block h-0.5 w-5 bg-current" />
          <span className="mt-1 block h-0.5 w-5 bg-current" />
          <span className="mt-1 block h-0.5 w-5 bg-current" />
        </button>
        <div onClick={() => setMobileOpen(false)} className="flex min-h-0 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
