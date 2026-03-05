"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

interface HeaderProps {
  pendingCount: number;
}

export function Header({ pendingCount }: HeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentVerdict = searchParams.get("verdict") || "";

  const bottomTabs = [
    {
      href: "/",
      verdict: "",
      label: "전체",
      activeColor: "text-emerald-400",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
    },
    {
      href: "/?verdict=like",
      verdict: "like",
      label: "좋아요",
      activeColor: "text-emerald-400",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      ),
    },
    {
      href: "/?verdict=pending",
      verdict: "pending",
      label: "대기",
      activeColor: "text-amber-400",
      badge: pendingCount > 0 ? pendingCount : null,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: "/?verdict=dislike",
      verdict: "dislike",
      label: "패스",
      activeColor: "text-red-400",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 01-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 011.423.23l3.114 1.04a4.5 4.5 0 001.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 007.5 19.75 2.25 2.25 0 009.75 22a.75.75 0 00.75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 002.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Top header */}
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

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
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

          {/* Mobile: pending badge in header */}
          {pendingCount > 0 && (
            <Link
              href="/?verdict=pending"
              className="sm:hidden flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
              </span>
              {pendingCount}
            </Link>
          )}
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-neutral-950/90 backdrop-blur-xl safe-area-bottom">
        <div className="flex items-stretch">
          {bottomTabs.map((tab) => {
            const isActive =
              pathname === "/" && currentVerdict === tab.verdict;
            return (
              <Link
                key={tab.verdict || "all"}
                href={tab.href}
                className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 min-h-[48px] justify-center transition-colors ${
                  isActive ? tab.activeColor : "text-neutral-600"
                }`}
              >
                {tab.icon}
                <span className="text-[10px] font-medium">{tab.label}</span>
                {tab.badge && (
                  <span className="absolute top-1 right-1/4 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-black">
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
