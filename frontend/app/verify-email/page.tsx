"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { postAuthRequest } from "@/lib/auth-api";

type VerificationState = "checking" | "verified" | "error";

export default function VerifyEmailPage() {
  const [state, setState] = useState<VerificationState>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const token = new URLSearchParams(window.location.search).get("token") || "";

    postAuthRequest(
      "api/users/verify-email",
      { token },
      "This verification link is invalid, expired, or already used.",
      { retry: false },
    )
      .then(() => {
        if (active) setState("verified");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to verify your email. Please try again.",
        );
        setState("error");
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090b14] px-5 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#10131e] p-8 text-center">
        {state === "checking" ? (
          <>
            <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-indigo-300" />
            <p className="mt-4 text-sm text-slate-300">Verifying your email...</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">
              {state === "verified" ? "Email verified" : "Verification failed"}
            </h1>
            <p
              role={state === "error" ? "alert" : "status"}
              className="mt-3 text-sm leading-6 text-slate-300"
            >
              {state === "verified"
                ? "Your email is verified. You can now sign in."
                : message}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-400"
            >
              Go to login
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
