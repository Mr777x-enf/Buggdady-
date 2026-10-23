import Link from "next/link";
import { Bug } from "lucide-react";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
];

export default function Navbar() {
  return (
    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
      <Link href="/" className="flex items-center gap-2 text-xl font-bold">
        <Bug className="h-7 w-7 text-indigo-400" />
        BugKill <span className="text-indigo-400">AI</span>
      </Link>

      <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="transition hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <Link
        href="/login"
        className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
      >
        Login
      </Link>
    </header>
  );
}