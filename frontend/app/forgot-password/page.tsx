
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bug,
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
} from "lucide-react";
import { postAuthRequest } from "@/lib/auth-api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setSubmitted(false);

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter your email address.");
      return;
    }

    setLoading(true);

    try {
      await postAuthRequest(
        "api/users/forgot-password",
        { email: normalizedEmail },
        "Unable to send reset instructions. Please try again.",
        { retry: false },
      );
      setSubmitted(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send reset instructions. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090b14] px-5 py-12 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-600/15 blur-[120px]" />

      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-10 flex items-center justify-center gap-2 text-xl font-bold tracking-tight"
        >
          <Bug className="h-7 w-7 text-indigo-400" />
          BugKill <span className="text-indigo-400">AI</span>
        </Link>

        <div className="rounded-2xl border border-white/10 bg-[#10131e]/90 p-7 shadow-2xl sm:p-9">
          <>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>

              <div className="mt-8">
                <p className="text-sm font-medium text-indigo-400">
                  Account recovery
                </p>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  Forgot your password?
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Enter your account email and we&apos;ll send you instructions
                  to reset your password.
                </p>
              </div>

              {submitted && (
                <div
                  role="status"
                  className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200"
                >
                  If an account exists for that email, you will receive
                  instructions to reset your password.
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {error && (
                  <p
                    role="alert"
                    className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
                  >
                    {error}
                  </p>
                )}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError("");
                      setSubmitted(false);
                    }}
                    required
                    disabled={loading}
                    className="h-12 w-full rounded-lg border border-white/10 bg-[#090b14] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10131e] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Sending instructions...
                    </>
                  ) : (
                    <>
                      Send reset instructions
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
          </>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Need an account?{" "}
          <Link
            href="/signup"
            className="text-indigo-400 transition hover:text-indigo-300"
          >
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
