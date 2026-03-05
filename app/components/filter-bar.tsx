"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface FilterBarProps {
  currentVerdict: string;
  currentSearch: string;
  currentSort: string;
}

export function FilterBar({ currentVerdict, currentSearch, currentSort }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
    { value: "", label: "전체" },
    { value: "pending", label: "미평가" },
    { value: "like", label: "좋아요" },
    { value: "dislike", label: "싫어요" },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Verdict filter */}
      <div className="flex gap-1">
        {verdictFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => updateParam("verdict", filter.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              currentVerdict === filter.value
                ? "bg-white text-neutral-900"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <input
          type="text"
          placeholder="검색..."
          defaultValue={currentSearch}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParam("search", (e.target as HTMLInputElement).value);
            }
          }}
          className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 outline-none focus:border-neutral-500 w-40"
        />

        {/* Sort */}
        <select
          value={currentSort}
          onChange={(e) => updateParam("sort", e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200 outline-none focus:border-neutral-500"
        >
          <option value="newest">최신순</option>
          <option value="oldest">오래된순</option>
        </select>
      </div>
    </div>
  );
}
