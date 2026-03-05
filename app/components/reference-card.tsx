"use client";

import Link from "next/link";
import { useState } from "react";

interface ReferenceCardProps {
  id: number;
  url: string;
  title: string | null;
  verdict: string | null;
  screenshots: { viewport: string; path: string }[];
  hashtags: { id: number; name: string }[];
  onVerdictChange?: (id: number, verdict: string) => void;
}

export function ReferenceCard({
  id,
  url,
  title,
  verdict,
  screenshots,
  hashtags,
  onVerdictChange,
}: ReferenceCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const desktopShot = screenshots.find((s) => s.viewport === "desktop");
  const anyShot = screenshots[0];
  const displayShot = desktopShot || anyShot;

  const verdictConfig = {
    like: {
      label: "LIKE",
      bg: "bg-emerald-500",
      glow: "shadow-emerald-500/30",
    },
    dislike: {
      label: "PASS",
      bg: "bg-red-500",
      glow: "shadow-red-500/30",
    },
    delete: {
      label: "DEL",
      bg: "bg-neutral-600",
      glow: "",
    },
  };

  const badge = verdict
    ? verdictConfig[verdict as keyof typeof verdictConfig]
    : null;

  const handleQuickVerdict = async (e: React.MouseEvent, v: string) => {
    e.preventDefault();
    e.stopPropagation();
    await fetch(`/api/references/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verdict: v }),
    });
    onVerdictChange?.(id, v);
  };

  return (
    <Link href={`/ref/${id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-neutral-900/80 transition-all duration-300 hover:border-white/[0.12] hover:shadow-2xl hover:shadow-black/40 hover:-translate-y-1">
        {/* Thumbnail */}
        <div className="relative aspect-[16/10] overflow-hidden bg-neutral-800/50">
          {/* Skeleton pulse */}
          {displayShot && !imgLoaded && (
            <div className="absolute inset-0 animate-pulse bg-neutral-800" />
          )}
          {displayShot ? (
            <img
              src={`/screenshots/${displayShot.path}`}
              alt={title || url}
              className={`h-full w-full object-cover object-top transition-all duration-500 group-hover:scale-105 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImgLoaded(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg
                className="h-8 w-8 text-neutral-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                />
              </svg>
            </div>
          )}

          {/* Verdict badge - top right */}
          {badge && (
            <div className="absolute top-2.5 right-2.5">
              <span
                className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-lg ${badge.bg} ${badge.glow}`}
              >
                {badge.label}
              </span>
            </div>
          )}

          {/* Quick verdict overlay on hover (未評価 only) */}
          {!verdict && (
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="flex w-full gap-2 p-3">
                <button
                  onClick={(e) => handleQuickVerdict(e, "like")}
                  className="flex-1 rounded-lg bg-emerald-500/90 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-emerald-500"
                >
                  LIKE
                </button>
                <button
                  onClick={(e) => handleQuickVerdict(e, "dislike")}
                  className="flex-1 rounded-lg bg-white/10 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  PASS
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3.5 space-y-2">
          <h3 className="text-[13px] font-medium text-neutral-200 leading-tight line-clamp-1">
            {title || new URL(url).hostname}
          </h3>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {hashtags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-neutral-500 transition-colors group-hover:text-neutral-400"
                >
                  #{tag.name}
                </span>
              ))}
              {hashtags.length > 3 && (
                <span className="text-[10px] text-neutral-600">
                  +{hashtags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
