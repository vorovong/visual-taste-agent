"use client";

import Link from "next/link";

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
  const desktopShot = screenshots.find((s) => s.viewport === "desktop");
  const anyShot = screenshots[0];
  const displayShot = desktopShot || anyShot;

  const verdictBadge = {
    like: { label: "좋아요", className: "bg-emerald-500/20 text-emerald-400" },
    dislike: { label: "싫어요", className: "bg-red-500/20 text-red-400" },
    delete: { label: "삭제", className: "bg-neutral-500/20 text-neutral-400" },
  };

  const badge = verdict ? verdictBadge[verdict as keyof typeof verdictBadge] : null;

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
      <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition-all hover:border-neutral-600 hover:shadow-lg hover:shadow-neutral-900/50">
        {/* Thumbnail */}
        <div className="relative aspect-[16/10] overflow-hidden bg-neutral-800">
          {displayShot ? (
            <img
              src={`/screenshots/${displayShot.path}`}
              alt={title || url}
              className="h-full w-full object-cover object-top transition-transform group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-neutral-600 text-sm">
              No preview
            </div>
          )}
          {/* Quick verdict buttons on hover */}
          {!verdict && (
            <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={(e) => handleQuickVerdict(e, "like")}
                className="flex-1 rounded bg-emerald-600/80 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
              >
                좋아요
              </button>
              <button
                onClick={(e) => handleQuickVerdict(e, "dislike")}
                className="flex-1 rounded bg-red-600/80 py-1.5 text-xs font-medium text-white hover:bg-red-600"
              >
                싫어요
              </button>
            </div>
          )}
        </div>
        {/* Info */}
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-neutral-200 line-clamp-1">
              {title || new URL(url).hostname}
            </h3>
            {badge && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
              >
                {badge.label}
              </span>
            )}
          </div>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {hashtags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400"
                >
                  #{tag.name}
                </span>
              ))}
              {hashtags.length > 3 && (
                <span className="text-[10px] text-neutral-500">
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
