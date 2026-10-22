
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bug,
  ArrowRight,
  GitBranch,
  ShieldCheck,
  Sparkles,
  Code2,
} from "lucide-react";

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState("");
  const [loading,setLoading] = useState(false);
  const router = useRouter();

  
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  const url = repoUrl.trim();
  const repoPattern =
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/;

  if (!repoPattern.test(url)) {
    setError("Enter a valid GitHub repository URL.");
    return;
  }

  setError("");
  setLoading(true);

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/ingest`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoUrl: url,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to analyze repository.");
    }

    // Expect your backend to return a sessionId.
    if (!data.sessionId) {
      throw new Error("The server did not return a session ID.");
    }

    router.push(
      `/chat/${data.sessionId}?repo=${encodeURIComponent(url)}`
    );
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Something went wrong. Please try again."
    );
  } finally {
    setLoading(false);
  }
}


  return (
    <main className="min-h-screen bg-[#09090f] text-white">
      {/* Navbar */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center gap-2">
          <div className="rounded-xl bg-indigo-500/15 p-2">
            <Bug className="h-6 w-6 text-indigo-400" />
          </div>

          <span className="text-xl font-bold tracking-tight">
            BugKill <span className="text-indigo-400">AI</span>
          </span>
        </a>

        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
        >
          <GitBranch className="h-4 w-4" />
          GitHub
        </a>
      </nav>

      {/* Hero */}
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-24 pt-20 text-center sm:pt-28">
        <div className="mb-7 flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-4 py-2 text-sm text-indigo-300">
          <Sparkles className="h-4 w-4" />
          AI-powered code analysis
        </div>

        <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          Find bugs.
          <br />
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Understand your code.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
          Connect your GitHub repository, discover potential issues,
          and understand exactly where your code needs attention.
        </p>

        {/* Repository form */}
        <form
          onSubmit={handleSubmit}
          className="mt-10 w-full max-w-2xl rounded-2xl border border-white/10 bg-white/[0.03] p-3 shadow-2xl shadow-indigo-950/20"
        >
          <label
            htmlFor="repoUrl"
            className="mb-3 block px-2 text-left text-sm font-medium text-slate-300"
          >
            Enter your GitHub repository
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4">
              <GitBranch className="h-5 w-5 shrink-0 text-slate-500" />

              <input
                id="repoUrl"
                type="url"
                value={repoUrl}
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                  setError("");
                }}
                placeholder="https://github.com/username/repository"
                className="w-full min-w-0 bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-600"
                required
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-4 font-medium transition hover:bg-indigo-400"
            >
              Analyze repo
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-3 px-2 text-left text-sm text-red-400"
            >
              {error}
            </p>
          )}

          <p className="mt-3 px-2 text-left text-xs text-slate-500">
            Start with a public GitHub repository.
          </p>
        </form>

        {/* Feature cards */}
        <div className="mt-16 grid w-full gap-4 text-left sm:grid-cols-3">
          <Feature
            icon={<Bug className="h-5 w-5" />}
            title="Bug detection"
            description="Identify suspicious code and potential issues."
          />

          <Feature
            icon={<Code2 className="h-5 w-5" />}
            title="Code explanations"
            description="Understand complex functions and logic."
          />

          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Actionable insights"
            description="Get useful suggestions for improving your code."
          />
        </div>

        <p className="mt-12 flex items-center gap-2 text-sm text-slate-500">
          Built for developers who want to ship better code.
        </p>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-indigo-400/30">
      <div className="mb-4 inline-flex rounded-xl bg-indigo-500/10 p-3 text-indigo-400">
        {icon}
      </div>

      <h2 className="font-semibold">{title}</h2>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}
