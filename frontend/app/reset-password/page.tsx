"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Bug,
  Eye,
  EyeOff,
  ArrowRight,
  LockKeyhole,
  AlertCircle,
} from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("Your reset link is missing a token. Request a new link.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(
      "Password reset is not available yet because the backend does not expose a reset endpoint.",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090b14] px-4 py-12 text-white">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
            <Bug size={23} />
          </span>
          <span className="text-2xl font-bold tracking-tight">
            BugKill<span className="text-violet-400"> AI</span>
          </span>
        </Link>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl sm:p-8">
          <>
              <div className="mb-7 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                  <LockKeyhole size={25} />
                </div>

                <h1 className="text-2xl font-bold">
                  Reset your password
                </h1>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Choose a new password for your BugKill AI account.
                </p>
              </div>

              {!token && (
                <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                  This link is missing its reset token. Request a new
                  password-reset email to continue.
                  <Link
                    href="/forgot-password"
                    className="mt-2 block font-semibold underline"
                  >
                    Request a new link
                  </Link>
                </div>
              )}

              {token && (
                <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                  The backend does not currently expose a password-reset endpoint, so this link cannot be verified or used yet.
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mb-5 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
                >
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-gray-200"
                  >
                    New password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                    />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError("");
                      }}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      disabled={!token}
                      className="w-full rounded-xl border border-white/10 bg-[#0c0e19] py-3 pl-11 pr-12 text-sm outline-none transition placeholder:text-gray-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-medium text-gray-200"
                  >
                    Confirm new password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                    />

                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) =>
                        {
                          setConfirmPassword(event.target.value);
                          setError("");
                        }
                      }
                      placeholder="Enter your new password again"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      disabled={!token}
                      className="w-full rounded-xl border border-white/10 bg-[#0c0e19] py-3 pl-11 pr-12 text-sm outline-none transition placeholder:text-gray-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirmation password"
                          : "Show confirmation password"
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!token}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset password <ArrowRight size={18} />
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-400">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-violet-400 hover:text-violet-300"
                >
                  Sign in
                </Link>
              </p>
          </>
        </section>

        <p className="mt-6 text-center text-xs text-gray-600">
          Your password reset link must be valid and not expired.
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#090b14] text-gray-400">
          Loading reset form...
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
