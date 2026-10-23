
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  GitBranch,
  SearchCode,
  Wrench,
} from "lucide-react";

const benefits = [
  { icon: SearchCode, label: "Code-aware analysis" },
  { icon: Wrench, label: "Suggested fixes" },
  { icon: GitBranch, label: "GitHub integration" },
];

const steps = [
  "Connect your GitHub repository.",
  "Fetch and index the source code.",
  "Describe the bug you want to investigate.",
  "Find relevant code and review the suggested fix.",
];

export default function Hero() {
  return (
    <>
      <section className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-8 px-6 py-8 lg:grid-cols-2 lg:gap-12 lg:px-10">
        <div className="relative order-1 mx-auto w-full max-w-xl lg:order-2 lg:max-w-none">
          <div className="absolute inset-10 rounded-full bg-indigo-600/20 blur-3xl" />
          <Image
            src="/bugkill-hero.png"
            alt="Developer workspace for AI-assisted code analysis"
            width={1536}
            height={1024}
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="relative h-auto w-full rounded-2xl object-contain drop-shadow-2xl"
          />
        </div>

        <div className="relative z-10 order-2 lg:order-1">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1.5 text-xs font-medium text-indigo-300">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            AI-assisted debugging for developers
          </div>

          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Find the code behind the bug.
            <span className="mt-2 block bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              Fix issues with confidence.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
            Analyze a GitHub repository, describe a coding issue, and
            find relevant files and code snippets with AI-assisted analysis.
          </p>

         
        
<div className="mt-8 flex flex-wrap items-center gap-3">
  <Link
    href="/signup"
    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-indigo-400 bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400"
  >
    Get started
    <ArrowRight className="h-4 w-4" />
  </Link>

  <Link
    href="/login"
    className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/20 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
  >
    Login
  </Link>

  <Link
    href="#how-it-works"
    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
  >
    How it works
    <ArrowRight className="h-4 w-4" />
  </Link>
</div>



            

          <div id="features" className="mt-8 flex flex-wrap gap-x-5 gap-y-4">
            {benefits.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 text-sm text-slate-300"
              >
                <Icon className="h-4 w-4 text-indigo-400" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-20 border-t border-white/10 bg-[#0c0f19] px-6 py-16 sm:py-20 lg:px-10"
      >
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            From repository to root cause.
          </h2>

          <ol className="mt-8 space-y-5">
            {steps.map((step, index) => (
              <li key={step} className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-400/30 bg-indigo-400/10 text-sm font-semibold text-indigo-300">
                  {index + 1}
                </span>
                <p className="pt-1 leading-6 text-slate-300">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
