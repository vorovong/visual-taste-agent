"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "./components/header";
import { Dashboard } from "./components/dashboard";
import { FilterBar } from "./components/filter-bar";
import { ReferenceCard } from "./components/reference-card";

interface Reference {
  id: number;
  url: string;
  title: string | null;
  verdict: string | null;
  sourceType: string;
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
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-neutral-900/80">
      <div className="aspect-[16/10] skeleton" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-4 w-3/4 rounded skeleton" />
        <div className="flex gap-1.5">
          <div className="h-4 w-14 rounded-md skeleton" />
          <div className="h-4 w-10 rounded-md skeleton" />
        </div>
      </div>
    </div>
  );
}

export function GalleryClient({ stats: initialStats }: { stats: Stats }) {
  const searchParams = useSearchParams();
  const verdict = searchParams.get("verdict") || "";
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "newest";
  const tag = searchParams.get("tag") || "";

  const [refs, setRefs] = useState<Reference[]>([]);
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);

  const fetchRefs = useCallback(async () => {
    if (refs.length === 0) setLoading(true);
    const params = new URLSearchParams();
    if (verdict) params.set("verdict", verdict);
    if (search) params.set("search", search);
    if (sort) params.set("sort", sort);
    if (tag) params.set("tag", tag);

    const res = await fetch(`/api/references?${params.toString()}`);
    const data = await res.json();
    setRefs(data);
    setLoading(false);
  }, [verdict, search, sort, tag]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshStats = useCallback(async () => {
    const res = await fetch("/api/stats");
    const data = await res.json();
    setStats(data);
  }, []);

  useEffect(() => {
    fetchRefs();
  }, [fetchRefs]);

  const handleVerdictChange = () => {
    fetchRefs();
    refreshStats();
  };

  return (
    <div className="min-h-screen">
      <Header pendingCount={stats.pending} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <Dashboard stats={stats} />
        <FilterBar
          currentVerdict={verdict}
          currentSearch={search}
          currentSort={sort}
        />
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : refs.length === 0 ? (
          <div className="flex justify-center py-24">
            <div className="text-center space-y-4 max-w-xs">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <svg
                  className="h-7 w-7 text-neutral-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-300">
                  레퍼런스가 없습니다
                </p>
                <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                  텔레그램 봇에서 URL을 보내면<br />여기에 자동으로 수집됩니다
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {refs.map((ref, i) => (
              <div
                key={ref.id}
                className="card-enter"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <ReferenceCard
                  id={ref.id}
                  url={ref.url}
                  title={ref.title}
                  verdict={ref.verdict}
                  screenshots={ref.screenshots}
                  hashtags={ref.hashtags}
                  onVerdictChange={handleVerdictChange}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
