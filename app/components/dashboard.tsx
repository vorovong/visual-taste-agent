"use client";

import { useState } from "react";
import Link from "next/link";

interface DashboardProps {
  stats: {
    total: number;
    liked: number;
    disliked: number;
    pending: number;
    topTags: { id: number; name: string; usageCount: number }[];
  };
}

export function Dashboard({ stats }: DashboardProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="text-sm font-medium">대시보드</span>
        <span className="text-neutral-500 text-xs">
          {collapsed ? "펼치기" : "접기"}
        </span>
      </button>
      {!collapsed && (
        <div className="border-t border-neutral-800 p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-neutral-800 p-3 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                총 레퍼런스
              </div>
            </div>
            <div className="rounded-lg bg-emerald-950/30 p-3 text-center">
              <div className="text-2xl font-bold text-emerald-400">
                {stats.liked}
              </div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                좋아요
              </div>
            </div>
            <div className="rounded-lg bg-red-950/30 p-3 text-center">
              <div className="text-2xl font-bold text-red-400">
                {stats.disliked}
              </div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                싫어요
              </div>
            </div>
            <div className="rounded-lg bg-amber-950/30 p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">
                {stats.pending}
              </div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                미평가
              </div>
            </div>
          </div>

          {/* Pending CTA */}
          {stats.pending > 0 && (
            <Link
              href="/?verdict=pending"
              className="block rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-center text-sm text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              {stats.pending}개 미평가 레퍼런스 평가하기
            </Link>
          )}

          {/* Top tags */}
          {stats.topTags.length > 0 && (
            <div>
              <div className="text-xs text-neutral-500 mb-2">자주 사용한 태그</div>
              <div className="flex flex-wrap gap-1.5">
                {stats.topTags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/?tag=${tag.name}`}
                    className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-700 transition-colors"
                  >
                    #{tag.name}
                    <span className="ml-1 text-neutral-500">{tag.usageCount}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
