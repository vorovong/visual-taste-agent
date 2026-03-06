"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "./components/header";
import { Dashboard } from "./components/dashboard";
import { FilterBar } from "./components/filter-bar";
import { ReferenceCard } from "./components/reference-card";
import { SearchModal } from "./components/search-modal";
import { UploadModal } from "./components/upload-modal";

interface Reference {
  id: number;
  url: string;
  title: string | null;
  verdict: string | null;
  sourceType: string;
  sourceDomain: string | null;
  contentType: string | null;
  iframeAllowed: boolean | null;
  capturedAt: string;
  evaluatedAt: string | null;
  screenshots: { viewport: string; path: string }[];
  hashtags: { id: number; name: string }[];
}

interface Stats {
  total: number;
  liked: number;
  disliked: number;
  pending: number;
  topTags: { id: number; name: string; usageCount: number }[];
  contentTypes?: Record<string, number>;
  topDomains?: { domain: string; count: number }[];
  recent?: { id: number; title: string | null; url: string; capturedAt: string }[];
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80">
      <div className="aspect-[16/10] skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-1/3 rounded skeleton" />
        <div className="h-4 w-3/4 rounded skeleton" />
        <div className="flex gap-1.5">
          <div className="h-5 w-16 rounded-md skeleton" />
          <div className="h-5 w-12 rounded-md skeleton" />
        </div>
      </div>
    </div>
  );
}

function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-20 sm:bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 text-neutral-500 dark:text-neutral-400 shadow-xl shadow-black/10 dark:shadow-black/30 backdrop-blur-sm transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-700 hover:-translate-y-0.5"
      aria-label="맨 위로"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
      </svg>
    </button>
  );
}

const PAGE_SIZE = 20;

export function GalleryClient({ stats: initialStats }: { stats: Stats }) {
  const searchParams = useSearchParams();
  const verdict = searchParams.get("verdict") || "";
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "newest";
  const tag = searchParams.get("tag") || "";
  const contentType = searchParams.get("content_type") || "";

  const [refs, setRefs] = useState<Reference[]>([]);
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchRefs = useCallback(async (cursor?: number) => {
    if (!cursor) setLoading(true);
    else setLoadingMore(true);

    const params = new URLSearchParams();
    if (verdict) params.set("verdict", verdict);
    if (search) params.set("search", search);
    if (sort) params.set("sort", sort);
    if (tag) params.set("tag", tag);
    if (contentType) params.set("content_type", contentType);
    params.set("limit", String(PAGE_SIZE));
    if (cursor) params.set("cursor", String(cursor));

    const res = await fetch(`/api/references?${params.toString()}`);
    const json = await res.json();

    const items = Array.isArray(json) ? json : json.data || [];
    const nc = Array.isArray(json) ? null : json.nextCursor || null;

    if (cursor) {
      setRefs((prev) => [...prev, ...items]);
    } else {
      setRefs(items);
    }
    setNextCursor(nc);
    setLoading(false);
    setLoadingMore(false);
  }, [verdict, search, sort, tag, contentType]);

  const refreshStats = useCallback(async () => {
    const res = await fetch("/api/stats");
    const data = await res.json();
    setStats(data);
  }, []);

  useEffect(() => {
    fetchRefs();
  }, [fetchRefs]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loaderRef.current || !nextCursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) {
          fetchRefs(nextCursor);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, fetchRefs]);

  const handleVerdictChange = () => {
    fetchRefs();
    refreshStats();
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header pendingCount={stats.pending} onUploadClick={() => setUploadOpen(true)} />
      <SearchModal />
      <UploadModal open={uploadOpen} onClose={() => { setUploadOpen(false); fetchRefs(); refreshStats(); }} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <Dashboard stats={stats} />
        <FilterBar
          currentVerdict={verdict}
          currentSearch={search}
          currentSort={sort}
          currentContentType={contentType}
          stats={stats}
        />

        {!loading && refs.length > 0 && (
          <div className="text-xs text-neutral-500 dark:text-neutral-500 tabular-nums">
            {refs.length}개의 레퍼런스
            {nextCursor && " (더 있음)"}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : refs.length === 0 ? (
          <div className="flex justify-center py-24">
            <div className="text-center space-y-4 max-w-xs">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50">
                <svg className="h-7 w-7 text-neutral-400 dark:text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
              </div>
              <div>
                <p className="text-base font-medium text-neutral-700 dark:text-neutral-300">레퍼런스가 없습니다</p>
                <p className="mt-1 text-sm text-neutral-500 leading-relaxed">
                  텔레그램 봇에서 URL이나 파일을 보내면<br />여기에 자동으로 수집됩니다
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {refs.map((ref, i) => (
                <div key={ref.id} className="card-enter" style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}>
                  <ReferenceCard
                    id={ref.id}
                    url={ref.url}
                    title={ref.title}
                    verdict={ref.verdict}
                    sourceDomain={ref.sourceDomain}
                    contentType={ref.contentType}
                    screenshots={ref.screenshots}
                    hashtags={ref.hashtags}
                    onVerdictChange={handleVerdictChange}
                  />
                </div>
              ))}
            </div>
            <div ref={loaderRef} className="h-1">
              {loadingMore && (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-emerald-500" />
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <ScrollToTop />
    </div>
  );
}
