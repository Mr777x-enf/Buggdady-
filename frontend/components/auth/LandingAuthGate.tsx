"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { authRequest } from "@/lib/auth-api";

type GateState = "checking" | "unauthenticated" | "unavailable";

export default function LandingAuthGate({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<GateState>("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    authRequest("api/users/me")
      .then((response) => {
        if (!active) return;

        if (response.ok) {
          router.replace("/chat");
          return;
        }

        if (response.status === 401) {
          setState("unauthenticated");
          return;
        }

        setState("unavailable");
      })
      .catch(() => {
        if (active) setState("unavailable");
      });

    return () => {
      active = false;
    };
  }, [attempt, router]);

  if (state === "unauthenticated") return children;

  if (state === "unavailable") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090b14] px-5 text-white">
        <section className="max-w-md rounded-2xl border border-white/10 bg-[#10131e] p-7 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-amber-300" />
          <h1 className="mt-4 text-xl font-semibold">
            Couldn&apos;t verify your session
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            The authentication service may be temporarily unavailable. Your
            session has not been cleared.
          </p>
          <button
            type="button"
            onClick={() => {
              setState("checking");
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
    <main
      aria-label="Checking your session"
      className="flex min-h-screen items-center justify-center bg-[#090b14] text-slate-400"
    >
      <LoaderCircle className="h-6 w-6 animate-spin" />
    </main>
  );
}
