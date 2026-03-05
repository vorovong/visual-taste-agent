"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
  pendingCount: number;
}

export function Header({ pendingCount }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-neutral-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-sm shadow-emerald-500/20 transition-shadow group-hover:shadow-md group-hover:shadow-emerald-500/30">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-neutral-200 transition-colors group-hover:text-white">
            VTA
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {pendingCount > 0 && (
            <Link
              href="/?verdict=pending"
              className="mr-2 flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400 transition-all hover:bg-amber-500/20 hover:border-amber-500/30"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
              </span>
              {pendingCount} 미평가
            </Link>
          )}
          <Link
            href="/"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              pathname === "/"
                ? "bg-white/[0.08] text-white"
                : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.04]"
            }`}
          >
            갤러리
          </Link>
        </nav>
      </div>
    </header>
  );
}
