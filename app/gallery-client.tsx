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
    // 이전 데이터가 없을 때만 로딩 표시 (깜빡임 방지)
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
      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <Dashboard stats={stats} />
        <FilterBar
          currentVerdict={verdict}
          currentSearch={search}
          currentSort={sort}
        />
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-neutral-500 text-sm">로딩 중...</div>
          </div>
        ) : refs.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="text-center text-neutral-500">
              <p className="text-lg">레퍼런스가 없습니다</p>
              <p className="text-sm mt-1">텔레그램 봇으로 URL을 보내주세요</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {refs.map((ref) => (
              <ReferenceCard
                key={ref.id}
                id={ref.id}
                url={ref.url}
                title={ref.title}
                verdict={ref.verdict}
                screenshots={ref.screenshots}
                hashtags={ref.hashtags}
                onVerdictChange={handleVerdictChange}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
