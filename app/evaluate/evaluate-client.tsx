"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

interface PendingRef {
  id: number;
  url: string;
  title: string | null;
  sourceDomain: string | null;
  contentType: string | null;
  capturedAt: string;
  screenshots: { viewport: string; path: string }[];
}

interface Hashtag {
  id: number;
  name: string;
  usageCount: number;
}

type Verdict = "like" | "dislike";

interface EvalResult {
  id: number;
  title: string | null;
  verdict: Verdict | null; // null = skipped
  tags: string[];
}

function getScreenshot(ref: PendingRef): string | null {
  const desktop = ref.screenshots.find((s) => s.viewport === "desktop");
  const tablet = ref.screenshots.find((s) => s.viewport === "tablet");
  const mobile = ref.screenshots.find((s) => s.viewport === "mobile");
  const ss = desktop || tablet || mobile || ref.screenshots[0];
  return ss ? `/api/screenshots/${ss.path}` : null;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function EvaluateClient({ initialRefs }: { initialRefs: PendingRef[] }) {
  const [refs] = useState<PendingRef[]>(initialRefs);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<EvalResult[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [topHashtags, setTopHashtags] = useState<Hashtag[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animDirection, setAnimDirection] = useState<"left" | "right" | "down" | null>(null);

  // Touch / drag state
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const THRESHOLD = 80;
  const isComplete = currentIndex >= refs.length;
  const currentRef = !isComplete ? refs[currentIndex] : null;
  const nextRef = currentIndex + 1 < refs.length ? refs[currentIndex + 1] : null;

  // Fetch top hashtags
  useEffect(() => {
    fetch("/api/hashtags")
      .then((r) => r.json())
      .then((tags: Hashtag[]) => {
        setTopHashtags(tags.slice(0, 8));
      })
      .catch(() => {});
  }, []);

  // API call: set verdict
  const setVerdict = useCallback(async (refId: number, verdict: Verdict) => {
    await fetch(`/api/references/${refId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verdict }),
    });
  }, []);

  // API call: add hashtag
  const addHashtag = useCallback(async (refId: number, name: string) => {
    await fetch(`/api/references/${refId}/hashtags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }, []);

  // Advance to next card
  const advance = useCallback(
    (direction: "left" | "right" | "down") => {
      if (isAnimating || isComplete || !currentRef) return;

      setIsAnimating(true);
      setAnimDirection(direction);

      const verdict: Verdict | null =
        direction === "right" ? "like" : direction === "left" ? "dislike" : null;

      // Record result
      const result: EvalResult = {
        id: currentRef.id,
        title: currentRef.title,
        verdict,
        tags: Array.from(selectedTags),
      };
      setResults((prev) => [...prev, result]);

      // Fire API calls
      if (verdict) {
        setVerdict(currentRef.id, verdict);
      }
      // Add selected tags
      selectedTags.forEach((tag) => {
        addHashtag(currentRef.id, tag);
      });

      // After animation
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setSelectedTags(new Set());
        setIsAnimating(false);
        setAnimDirection(null);
        setDragX(0);
        setDragY(0);
      }, 300);
    },
    [isAnimating, isComplete, currentRef, selectedTags, setVerdict, addHashtag]
  );

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    setDragX(dx);
    setDragY(Math.max(0, dy)); // Only allow downward drag
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (Math.abs(dragX) > THRESHOLD && Math.abs(dragX) > dragY) {
      advance(dragX > 0 ? "right" : "left");
    } else if (dragY > THRESHOLD && dragY > Math.abs(dragX)) {
      advance("down");
    } else {
      setDragX(0);
      setDragY(0);
    }
  }, [dragX, dragY, advance]);

  // Toggle tag
  const toggleTag = useCallback((name: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isComplete || isAnimating) return;
      if (e.key === "ArrowLeft") advance("left");
      else if (e.key === "ArrowRight") advance("right");
      else if (e.key === "ArrowDown") advance("down");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isComplete, isAnimating, advance]);

  // Card transform style
  const getCardStyle = () => {
    if (animDirection) {
      const x = animDirection === "right" ? 500 : animDirection === "left" ? -500 : 0;
      const y = animDirection === "down" ? 500 : 0;
      const rotate = animDirection === "right" ? 15 : animDirection === "left" ? -15 : 0;
      return {
        transform: `translateX(${x}px) translateY(${y}px) rotate(${rotate}deg)`,
        opacity: 0,
        transition: "transform 300ms ease-out, opacity 300ms ease-out",
      };
    }
    if (isDragging || dragX !== 0 || dragY !== 0) {
      const rotate = dragX * 0.08;
      return {
        transform: `translateX(${dragX}px) translateY(${dragY}px) rotate(${rotate}deg)`,
        transition: isDragging ? "none" : "transform 200ms ease-out",
      };
    }
    return {
      transform: "translateX(0) translateY(0) rotate(0deg)",
      transition: "transform 200ms ease-out",
    };
  };

  // Swipe overlay opacity
  const getOverlay = () => {
    if (animDirection === "right") return { type: "like" as const, opacity: 1 };
    if (animDirection === "left") return { type: "dislike" as const, opacity: 1 };
    if (animDirection === "down") return { type: "skip" as const, opacity: 1 };

    if (Math.abs(dragX) > Math.abs(dragY) && Math.abs(dragX) > 20) {
      return {
        type: (dragX > 0 ? "like" : "dislike") as "like" | "dislike",
        opacity: Math.min(Math.abs(dragX) / THRESHOLD, 1),
      };
    }
    if (dragY > 20 && dragY > Math.abs(dragX)) {
      return { type: "skip" as const, opacity: Math.min(dragY / THRESHOLD, 1) };
    }
    return null;
  };

  // Summary stats
  const likeCount = results.filter((r) => r.verdict === "like").length;
  const dislikeCount = results.filter((r) => r.verdict === "dislike").length;
  const skipCount = results.filter((r) => r.verdict === null).length;
  const totalEvaluated = results.length;

  // Tag frequency in this session
  const tagFrequency: Record<string, number> = {};
  results.forEach((r) => {
    r.tags.forEach((t) => {
      tagFrequency[t] = (tagFrequency[t] || 0) + 1;
    });
  });
  const topSessionTags = Object.entries(tagFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // ---- Completion screen ----
  if (isComplete) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4 pb-20 sm:pb-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/20">
            <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold text-neutral-100">
              {totalEvaluated > 0 ? `${totalEvaluated}개 평가 완료!` : "평가할 레퍼런스가 없습니다"}
            </h2>
            {totalEvaluated > 0 && (
              <p className="mt-2 text-sm text-neutral-500">모든 미평가 레퍼런스를 처리했습니다</p>
            )}
          </div>

          {totalEvaluated > 0 && (
            <div className="space-y-4">
              {/* Verdict breakdown */}
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-neutral-400">좋아요</span>
                  <span className="font-bold text-emerald-400 tabular-nums">{likeCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-neutral-400">패스</span>
                  <span className="font-bold text-red-400 tabular-nums">{dislikeCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex h-3 w-3 rounded-full bg-neutral-600" />
                  <span className="text-neutral-400">건너뜀</span>
                  <span className="font-bold text-neutral-300 tabular-nums">{skipCount}</span>
                </div>
              </div>

              {/* Like ratio bar */}
              {(likeCount + dislikeCount) > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-neutral-500">좋아요 비율</div>
                  <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${Math.round((likeCount / (likeCount + dislikeCount)) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-neutral-400 tabular-nums">
                    {Math.round((likeCount / (likeCount + dislikeCount)) * 100)}%
                  </div>
                </div>
              )}

              {/* Top session tags */}
              {topSessionTags.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] text-neutral-500 uppercase tracking-wider">자주 사용한 태그</div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {topSessionTags.map(([tag, count]) => (
                      <span
                        key={tag}
                        className="rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 text-xs text-neutral-400"
                      >
                        #{tag}
                        <span className="ml-1 text-neutral-600 tabular-nums">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/[0.08] px-6 py-3 text-sm font-medium text-neutral-200 transition-all hover:bg-white/[0.1] hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            갤러리로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const overlay = getOverlay();
  const screenshotPath = currentRef ? getScreenshot(currentRef) : null;
  const nextScreenshotPath = nextRef ? getScreenshot(nextRef) : null;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Header with progress */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-neutral-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-neutral-500 hover:text-neutral-200 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="text-sm">갤러리</span>
          </Link>
          <div className="text-sm text-neutral-400 tabular-nums">
            <span className="text-neutral-200 font-medium">{totalEvaluated}</span>
            <span className="text-neutral-600"> / </span>
            <span>{refs.length}</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-white/[0.04]">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${refs.length > 0 ? (totalEvaluated / refs.length) * 100 : 0}%` }}
          />
        </div>
      </header>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 sm:py-6">
        <div className="w-full max-w-sm space-y-4">
          {/* Card stack */}
          <div className="relative" style={{ minHeight: "380px" }}>
            {/* Next card (behind) */}
            {nextRef && (
              <div className="absolute inset-0 rounded-2xl border border-white/[0.04] bg-neutral-900/60 overflow-hidden scale-[0.96] translate-y-2 opacity-60">
                {nextScreenshotPath && (
                  <div className="relative w-full" style={{ height: "320px" }}>
                    <Image
                      src={nextScreenshotPath}
                      alt="next"
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 640px) 100vw, 400px"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Current card */}
            {currentRef && (
              <div
                ref={cardRef}
                className="relative rounded-2xl border border-white/[0.06] bg-neutral-900 overflow-hidden shadow-2xl shadow-black/40 cursor-grab active:cursor-grabbing"
                style={getCardStyle()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Screenshot */}
                <div className="relative w-full" style={{ height: "320px" }}>
                  {screenshotPath ? (
                    <Image
                      src={screenshotPath}
                      alt={currentRef.title || "screenshot"}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 640px) 100vw, 400px"
                      priority
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-neutral-800">
                      <svg className="h-12 w-12 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    </div>
                  )}

                  {/* Swipe overlay */}
                  {overlay && overlay.type === "like" && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 backdrop-blur-[2px]"
                      style={{ opacity: overlay.opacity }}
                    >
                      <div className="rounded-2xl border-4 border-emerald-400 px-8 py-3 rotate-[-15deg]">
                        <span className="text-3xl font-black text-emerald-400">LIKE</span>
                      </div>
                    </div>
                  )}
                  {overlay && overlay.type === "dislike" && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-red-500/20 backdrop-blur-[2px]"
                      style={{ opacity: overlay.opacity }}
                    >
                      <div className="rounded-2xl border-4 border-red-400 px-8 py-3 rotate-[15deg]">
                        <span className="text-3xl font-black text-red-400">PASS</span>
                      </div>
                    </div>
                  )}
                  {overlay && overlay.type === "skip" && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-neutral-500/20 backdrop-blur-[2px]"
                      style={{ opacity: overlay.opacity }}
                    >
                      <div className="rounded-2xl border-4 border-neutral-400 px-8 py-3">
                        <span className="text-3xl font-black text-neutral-400">SKIP</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card info */}
                <div className="p-3.5 space-y-1">
                  <div className="text-sm font-medium text-neutral-200 truncate">
                    {currentRef.title || getDomain(currentRef.url)}
                  </div>
                  <div className="text-xs text-neutral-500 truncate">
                    {currentRef.sourceDomain || getDomain(currentRef.url)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tag chips */}
          {topHashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center">
              {topHashtags.map((tag) => {
                const isSelected = selectedTags.has(tag.name);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.name)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                        : "bg-white/[0.04] border border-white/[0.06] text-neutral-400 hover:bg-white/[0.08] hover:text-neutral-200"
                    }`}
                  >
                    {isSelected && (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                    #{tag.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Action buttons (PC) */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => advance("left")}
              disabled={isAnimating}
              className="flex min-h-12 min-w-12 flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-medium text-sm transition-all hover:bg-red-500/20 hover:border-red-500/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 01-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 011.423.23l3.114 1.04a4.5 4.5 0 001.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 007.5 19.75 2.25 2.25 0 009.75 22a.75.75 0 00.75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 002.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384" />
              </svg>
              <span className="hidden sm:inline">PASS</span>
            </button>
            <button
              onClick={() => advance("down")}
              disabled={isAnimating}
              className="flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-neutral-800 text-neutral-400 font-medium text-sm transition-all hover:bg-neutral-700 hover:text-neutral-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed px-4"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z" />
              </svg>
              <span className="hidden sm:inline">SKIP</span>
            </button>
            <button
              onClick={() => advance("right")}
              disabled={isAnimating}
              className="flex min-h-12 min-w-12 flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium text-sm transition-all hover:bg-emerald-500/20 hover:border-emerald-500/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <span className="hidden sm:inline">LIKE</span>
            </button>
          </div>

          {/* Keyboard hint (desktop) */}
          <div className="hidden sm:flex items-center justify-center gap-4 text-[11px] text-neutral-600">
            <span>← PASS</span>
            <span>↓ SKIP</span>
            <span>→ LIKE</span>
          </div>

          {/* Swipe hint (mobile) */}
          <div className="sm:hidden flex items-center justify-center text-[11px] text-neutral-600">
            좌우 스와이프로 평가 · 아래로 건너뛰기
          </div>
        </div>
      </div>

      {/* Bottom spacer for mobile nav */}
      <div className="h-20 sm:hidden" />
    </div>
  );
}
