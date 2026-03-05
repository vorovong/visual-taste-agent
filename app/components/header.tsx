"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
  pendingCount: number;
}

export function Header({ pendingCount }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          VTA
        </Link>
        <nav className="flex items-center gap-4">
          {pendingCount > 0 && (
            <Link
              href="/?verdict=pending"
              className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/30 transition-colors"
            >
              {pendingCount} 미평가
            </Link>
          )}
          <Link
            href="/"
            className={`text-sm ${
              pathname === "/"
                ? "text-white"
                : "text-neutral-400 hover:text-white"
            } transition-colors`}
          >
            갤러리
          </Link>
        </nav>
      </div>
    </header>
  );
}
