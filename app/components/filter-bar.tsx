"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface FilterBarProps {
  currentVerdict: string;
  currentSearch: string;
  currentSort: string;
  currentContentType: string;
  stats?: {
    total: number;
    liked: number;
    disliked: number;
    pending: number;
    contentTypes?: Record<string, number>;
  };
}

const CONTENT_TYPES = [
  { value: "", label: "전체" },
  { value: "website", label: "웹사이트" },
  { value: "presentation", label: "프레젠테이션" },
  { value: "poster", label: "포스터" },
  { value: "report", label: "보고서" },
  { value: "mobile-app", label: "모바일앱" },
  { value: "newsletter", label: "뉴스레터" },
  { value: "other", label: "기타" },
];

export function FilterBar({
  currentVerdict,
  currentSearch,
  currentSort,
  currentContentType,
  stats,
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchFocused, setSearchFocused] = useState(false);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/?${params.toString()}`);
  };

  const verdictFilters = [
    { value: "", label: "전체", count: stats?.total },
    { value: "pending", label: "미평가", dot: "bg-amber-400", count: stats?.pending },
    { value: "like", label: "좋아요", dot: "bg-emerald-400", count: stats?.liked },
    { value: "dislike", label: "싫어요", dot: "bg-red-400", count: stats?.disliked },
  ];

  // Filter content types that have items
  const activeContentTypes = CONTENT_TYPES.filter((ct) => {
    if (ct.value === "") return true;
    return !stats?.contentTypes || (stats.contentTypes[ct.value] ?? 0) > 0;
  });

  return (
    <div className="space-y-3">
      {/* Row 1: Verdict + Search + Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Verdict filter */}
        <div className="flex gap-1 rounded-xl bg-white/[0.02] border border-white/[0.06] p-1 overflow-x-auto">
          {verdictFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => updateParam("verdict", filter.value)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                currentVerdict === filter.value
                  ? "bg-white/[0.1] text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04]"
              }`}
            >
              {filter.dot && (
                <span className={`h-1.5 w-1.5 rounded-full ${filter.dot}`} />
              )}
              {filter.label}
              {filter.count !== undefined && filter.count > 0 && (
                <span className="text-[10px] text-neutral-600 tabular-nums">
                  {filter.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div
            className={`relative flex items-center rounded-lg border bg-white/[0.02] transition-all ${
              searchFocused
                ? "border-white/[0.15] bg-white/[0.04]"
                : "border-white/[0.06]"
            }`}
          >
            <svg
              className="absolute left-2.5 h-3.5 w-3.5 text-neutral-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="text"
              placeholder="검색..."
              defaultValue={currentSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateParam("search", (e.target as HTMLInputElement).value);
                }
              }}
              className="w-36 bg-transparent py-1.5 pl-8 pr-3 text-xs text-neutral-200 placeholder-neutral-600 outline-none sm:w-44"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={currentSort}
              onChange={(e) => updateParam("sort", e.target.value)}
              className="appearance-none rounded-lg border border-white/[0.06] bg-white/[0.02] py-1.5 pl-3 pr-8 text-xs text-neutral-400 outline-none transition-colors hover:border-white/[0.1] hover:text-neutral-300 focus:border-white/[0.15]"
            >
              <option value="newest">최신순</option>
              <option value="oldest">오래된순</option>
            </select>
            <svg
              className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-600 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m19 9-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Row 2: Content type filter (only show if there are non-website items) */}
      {stats?.contentTypes && Object.keys(stats.contentTypes).length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {activeContentTypes.map((ct) => {
            const count = ct.value ? stats.contentTypes?.[ct.value] || 0 : stats.total;
            return (
              <button
                key={ct.value}
                onClick={() => updateParam("content_type", ct.value)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all whitespace-nowrap ${
                  currentContentType === ct.value
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                    : "text-neutral-500 border border-white/[0.06] hover:text-neutral-300 hover:border-white/[0.1]"
                }`}
              >
                {ct.label}
                {count > 0 && (
                  <span className="text-[9px] tabular-nums opacity-60">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
