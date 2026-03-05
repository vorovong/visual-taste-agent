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

function StatCard({
  value,
  label,
  accent,
  icon,
}: {
  value: number;
  label: string;
  accent?: string;
  icon: React.ReactNode;
}) {
  const colorClasses: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    default: "text-neutral-200 bg-white/[0.03] border-white/[0.06]",
  };

  const cls = colorClasses[accent || "default"];

  return (
    <div className={`rounded-xl border p-3.5 ${cls}`}>
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="opacity-40">{icon}</div>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-widest opacity-60">
        {label}
      </div>
    </div>
  );
}

export function Dashboard({ stats }: DashboardProps) {
  const [collapsed, setCollapsed] = useState(false);

  const evaluated = stats.liked + stats.disliked;
  const progressPercent =
    stats.total > 0 ? Math.round((evaluated / stats.total) * 100) : 0;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-neutral-900/50">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between p-4 text-left group"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-300">
            대시보드
          </span>
          {stats.pending > 0 && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
              {stats.pending} 대기
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-neutral-600 transition-transform duration-200 ${
            collapsed ? "" : "rotate-180"
          }`}
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
      </button>

      {!collapsed && (
        <div className="border-t border-white/[0.06] p-4 space-y-4 collapse-enter">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              value={stats.total}
              label="총 레퍼런스"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              }
            />
            <StatCard
              value={stats.liked}
              label="좋아요"
              accent="emerald"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              }
            />
            <StatCard
              value={stats.disliked}
              label="싫어요"
              accent="red"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 01-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 011.423.23l3.114 1.04a4.5 4.5 0 001.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 007.5 19.75 2.25 2.25 0 009.75 22a.75.75 0 00.75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 002.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384" />
                </svg>
              }
            />
            <StatCard
              value={stats.pending}
              label="미평가"
              accent="amber"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Progress bar */}
          {stats.total > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">평가 진행률</span>
                <span className="text-neutral-400 tabular-nums">
                  {evaluated}/{stats.total} ({progressPercent}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Pending CTA */}
          {stats.pending > 0 && (
            <Link
              href="/?verdict=pending"
              className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-3 text-sm font-medium text-amber-400 transition-all hover:from-amber-500/20 hover:to-orange-500/20 hover:border-amber-500/30"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              {stats.pending}개 레퍼런스 평가하기
            </Link>
          )}

          {/* Top tags */}
          {stats.topTags.length > 0 && (
            <div>
              <div className="text-[11px] text-neutral-500 mb-2 uppercase tracking-wider">
                자주 사용한 태그
              </div>
              <div className="flex flex-wrap gap-1.5">
                {stats.topTags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/?tag=${tag.name}`}
                    className="rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 text-xs text-neutral-400 transition-all hover:bg-white/[0.08] hover:text-neutral-200 hover:border-white/[0.1]"
                  >
                    #{tag.name}
                    <span className="ml-1.5 text-neutral-600 tabular-nums">
                      {tag.usageCount}
                    </span>
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
