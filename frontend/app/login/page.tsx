
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bug,
  Eye,
  EyeOff,
  ArrowRight,
  LockKeyhole,
  LoaderCircle,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { postAuthRequest } from "@/lib/auth-api";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || success) return;

    setError("");
    setSuccess(false);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Enter your email address and password.");
      return;
    }

    setLoading(true);

    try {
      // Backend sets accessToken and refreshToken as HttpOnly cookies.
      // The response JSON contains the message and user, not the tokens.
      await postAuthRequest(
        "api/users/login",
        { email, password },
        "Unable to sign in. Check your details and try again.",
        { retry: false },
      );

      setSuccess(true);
      router.replace("/chat");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to sign in. Please try again.",
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
          <div className="mb-8">
            <p className="text-sm font-medium text-indigo-400">
              Welcome back
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Sign in to your account
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Continue analyzing repositories and tracking down bugs.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            {success && (
              <p role="status" className="text-sm text-emerald-300">
                Login successful. Redirecting...
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
                required
                disabled={loading || success}
                onChange={() => setError("")}
                className="h-12 w-full rounded-lg border border-white/10 bg-[#090b14] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-200"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-indigo-400 transition hover:text-indigo-300"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  disabled={loading || success}
                  onChange={() => setError("")}
                  className="h-12 w-full rounded-lg border border-white/10 bg-[#090b14] px-4 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15"
                />

                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10131e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Login
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6 flex items-center">
            <div className="flex-1 border-t border-white/10" />
            <span className="px-3 text-xs text-slate-500">
              OR CONTINUE WITH
            </span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          <button
            type="button"
            disabled
            title="GitHub authentication is not connected yet"
            className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] text-sm font-medium text-slate-400 opacity-70"
          >
            <FaGithub className="h-5 w-5" />
            Continue with GitHub
            <LockKeyhole className="ml-1 h-3.5 w-3.5" />
          </button>

          <p className="mt-7 text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-indigo-400 transition hover:text-indigo-300"
            >
              Create account
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          <Link href="/" className="transition hover:text-slate-400">
            ← Back to BugKill AI
          </Link>
        </p>
      </div>
    </main>
  );
}