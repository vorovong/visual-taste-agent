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
    { value: "pending", label: "미평가", dot: "bg-amber-500", count: stats?.pending },
    { value: "like", label: "좋아요", dot: "bg-emerald-500", count: stats?.liked },
    { value: "dislike", label: "싫어요", dot: "bg-red-500", count: stats?.disliked },
  ];

  const activeContentTypes = CONTENT_TYPES.filter((ct) => {
    if (ct.value === "") return true;
    return !stats?.contentTypes || (stats.contentTypes[ct.value] ?? 0) > 0;
  });

  return (
    <div className="space-y-3">
      {/* Row 1: Verdict + Search + Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Verdict filter */}
        <div className="flex gap-1 rounded-xl bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-800 p-1 overflow-x-auto">
          {verdictFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => updateParam("verdict", filter.value)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap ${
                currentVerdict === filter.value
                  ? "bg-white dark:bg-neutral-700/50 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/30"
              }`}
            >
              {filter.dot && (
                <span className={`h-1.5 w-1.5 rounded-full ${filter.dot}`} />
              )}
              {filter.label}
              {filter.count !== undefined && filter.count > 0 && (
                <span className="text-xs text-neutral-400 dark:text-neutral-600 tabular-nums">
                  {filter.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div
            className={`relative flex items-center rounded-lg border bg-white dark:bg-neutral-800/30 transition-all ${
              searchFocused
                ? "border-neutral-400 dark:border-neutral-600 bg-white dark:bg-neutral-800/50"
                : "border-neutral-200 dark:border-neutral-800"
            }`}
          >
            <svg
              className="absolute left-2.5 h-4 w-4 text-neutral-400 dark:text-neutral-600"
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
              className="w-36 bg-transparent py-2 pl-9 pr-3 text-sm text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-600 outline-none sm:w-48"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={currentSort}
              onChange={(e) => updateParam("sort", e.target.value)}
              className="appearance-none rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/30 py-2 pl-3 pr-8 text-sm text-neutral-600 dark:text-neutral-400 outline-none transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:text-neutral-800 dark:hover:text-neutral-300 focus:border-neutral-400 dark:focus:border-neutral-600"
            >
              <option value="newest">최신순</option>
              <option value="oldest">오래된순</option>
            </select>
            <svg
              className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-600 pointer-events-none"
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

      {/* Row 2: Content type filter */}
      {stats?.contentTypes && Object.keys(stats.contentTypes).length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {activeContentTypes.map((ct) => {
            const count = ct.value ? stats.contentTypes?.[ct.value] || 0 : stats.total;
            return (
              <button
                key={ct.value}
                onClick={() => updateParam("content_type", ct.value)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                  currentContentType === ct.value
                    ? "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20"
                    : "text-neutral-500 border border-neutral-200 dark:border-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700"
                }`}
              >
                {ct.label}
                {count > 0 && (
                  <span className="text-[10px] tabular-nums opacity-60">
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
