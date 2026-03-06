"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface DashboardProps {
  stats: {
    total: number;
    liked: number;
    disliked: number;
    pending: number;
    topTags: { id: number; name: string; usageCount: number }[];
    contentTypes?: Record<string, number>;
    recent?: { id: number; title: string | null; url: string; capturedAt: string }[];
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
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
    red: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
    default: "text-neutral-800 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700/50",
  };

  const cls = colorClasses[accent || "default"];

  return (
    <div className={`rounded-xl border p-5 ${cls}`}>
      <div className="flex items-center justify-between">
        <div className="text-4xl font-bold tabular-nums">{value}</div>
        <div className="opacity-40">{icon}</div>
      </div>
      <div className="mt-2 text-xs font-medium uppercase tracking-widest opacity-60">
        {label}
      </div>
    </div>
  );
}

/* --- Level system --- */
interface LevelInfo {
  level: number;
  label: string;
  min: number;
  max: number | null;
}

const LEVELS: LevelInfo[] = [
  { level: 0, label: "수집 시작", min: 0, max: 4 },
  { level: 1, label: "패턴 탐색", min: 5, max: 19 },
  { level: 2, label: "취향 윤곽", min: 20, max: 49 },
  { level: 3, label: "패턴 안정", min: 50, max: null },
];

function computeLevel(evaluated: number): {
  current: LevelInfo;
  next: LevelInfo | null;
  progressInLevel: number;
  remaining: number;
} {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (evaluated >= l.min) current = l;
  }
  const nextIdx = LEVELS.indexOf(current) + 1;
  const next = nextIdx < LEVELS.length ? LEVELS[nextIdx] : null;

  let progressInLevel = 100;
  let remaining = 0;
  if (next) {
    const range = next.min - current.min;
    const done = evaluated - current.min;
    progressInLevel = Math.min(100, Math.round((done / range) * 100));
    remaining = next.min - evaluated;
  }

  return { current, next, progressInLevel, remaining };
}

/* --- Time ago --- */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}일 전`;
  return `${Math.floor(diffDay / 30)}개월 전`;
}

/* --- Domain extractor --- */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function Dashboard({ stats }: DashboardProps) {
  const [collapsed, setCollapsed] = useState(false);

  const evaluated = stats.liked + stats.disliked;
  const progressPercent =
    stats.total > 0 ? Math.round((evaluated / stats.total) * 100) : 0;

  const levelInfo = useMemo(() => computeLevel(evaluated), [evaluated]);

  const tasteDna = useMemo(() => {
    if (!stats.topTags || stats.topTags.length === 0) return [];
    const maxCount = stats.topTags[0].usageCount;
    return stats.topTags.slice(0, 6).map((tag) => ({
      ...tag,
      percent: maxCount > 0 ? Math.round((tag.usageCount / maxCount) * 100) : 0,
    }));
  }, [stats.topTags]);

  const insight = useMemo(() => {
    if (!stats.topTags || stats.topTags.length === 0) {
      if (stats.total === 0) return "레퍼런스를 수집해보세요. 텔레그램에서 URL을 보내면 시작됩니다.";
      if (stats.pending > 0 && evaluated === 0) return `${stats.pending}개의 레퍼런스가 평가를 기다리고 있습니다. 좋아요/싫어요를 눌러보세요.`;
      return "태그를 더 추가하면 취향 패턴이 나타납니다.";
    }
    const top = stats.topTags[0];
    const totalUsage = stats.topTags.reduce((s, t) => s + t.usageCount, 0);
    const topPercent = totalUsage > 0 ? Math.round((top.usageCount / totalUsage) * 100) : 0;
    if (topPercent >= 40) {
      return `태그 중 ${topPercent}%가 #${top.name} — 이 방향의 취향이 뚜렷합니다.`;
    }
    if (stats.topTags.length >= 3) {
      const top3 = stats.topTags.slice(0, 3).map((t) => `#${t.name}`).join(", ");
      return `자주 보이는 키워드: ${top3}. 패턴이 형성되고 있습니다.`;
    }
    return `#${top.name} 태그가 가장 많이 사용되었습니다.`;
  }, [stats.topTags, stats.total, stats.pending, evaluated]);

  const recentItems = stats.recent?.slice(0, 3) ?? [];

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between p-5 text-left group"
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
            대시보드
          </span>
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Lv.{levelInfo.current.level} {levelInfo.current.label}
          </span>
          {stats.pending > 0 && (
            <span className="rounded-full bg-amber-100 dark:bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              {stats.pending} 대기
            </span>
          )}
        </div>
        <svg
          className={`h-5 w-5 text-neutral-400 dark:text-neutral-600 transition-transform duration-200 ${
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
        <div className="border-t border-neutral-200 dark:border-neutral-800 p-5 space-y-5 collapse-enter">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              value={stats.total}
              label="총 레퍼런스"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              }
            />
            <StatCard
              value={stats.liked}
              label="좋아요"
              accent="emerald"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              }
            />
            <StatCard
              value={stats.disliked}
              label="싫어요"
              accent="red"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 01-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 011.423.23l3.114 1.04a4.5 4.5 0 001.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 007.5 19.75 2.25 2.25 0 009.75 22a.75.75 0 00.75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 002.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384" />
                </svg>
              }
            />
            <StatCard
              value={stats.pending}
              label="미평가"
              accent="amber"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Level progress + Evaluation progress */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Level progress */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    Lv.{levelInfo.current.level}
                  </span>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">{levelInfo.current.label}</span>
                </div>
                {levelInfo.next && (
                  <span className="text-xs text-neutral-400 dark:text-neutral-600 tabular-nums">
                    Lv.{levelInfo.next.level}까지 {levelInfo.remaining}개
                  </span>
                )}
              </div>
              <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${levelInfo.progressInLevel}%` }}
                />
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-500">
                {levelInfo.next
                  ? `평가 ${evaluated}개 / 다음 레벨 ${levelInfo.next.min}개`
                  : `평가 ${evaluated}개 — 최고 레벨 도달`}
              </div>
            </div>

            {/* Evaluation progress */}
            {stats.total > 0 && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">평가 진행률</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-500 tabular-nums">
                    {evaluated}/{stats.total} ({progressPercent}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-500">
                  {stats.pending > 0
                    ? `미평가 ${stats.pending}개 남음`
                    : "모든 레퍼런스 평가 완료"}
                </div>
              </div>
            )}
          </div>

          {/* Pending CTA */}
          {stats.pending > 0 && (
            <Link
              href="/evaluate"
              className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-300 dark:border-amber-500/20 p-4 text-base font-medium text-amber-700 dark:text-amber-400 transition-all hover:from-amber-500/20 hover:to-orange-500/20 hover:border-amber-400 dark:hover:border-amber-500/30"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              {stats.pending}개 레퍼런스 평가하기
            </Link>
          )}

          {/* Taste DNA + Recent */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Taste DNA bar chart */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 p-4">
              <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
                취향 DNA
              </div>
              {tasteDna.length > 0 ? (
                <div className="space-y-2.5">
                  {tasteDna.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/?tag=${tag.name}`}
                      className="group/bar block"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400 w-24 truncate group-hover/bar:text-neutral-900 dark:group-hover/bar:text-neutral-200 transition-colors">
                          #{tag.name}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700/50 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500 group-hover/bar:bg-emerald-400"
                            style={{ width: `${tag.percent}%` }}
                          />
                        </div>
                        <span className="text-xs text-neutral-400 dark:text-neutral-600 tabular-nums w-6 text-right">
                          {tag.usageCount}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-neutral-400 dark:text-neutral-600 py-4 text-center">
                  태그를 추가하면 취향 DNA가 나타납니다
                </div>
              )}
            </div>

            {/* Recent additions */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 p-4">
              <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                최근 추가
              </div>
              {recentItems.length > 0 ? (
                <div className="space-y-2">
                  {recentItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/ref/${item.id}`}
                      className="group/recent flex items-center gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-neutral-100 dark:hover:bg-white/[0.04]"
                    >
                      <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 flex items-center justify-center overflow-hidden">
                        <svg className="h-5 w-5 text-neutral-400 dark:text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-neutral-700 dark:text-neutral-300 truncate group-hover/recent:text-neutral-900 dark:group-hover/recent:text-neutral-100 transition-colors">
                          {item.title || extractDomain(item.url)}
                        </div>
                        <div className="text-xs text-neutral-400 dark:text-neutral-600 truncate">
                          {extractDomain(item.url)} · {timeAgo(item.capturedAt)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-neutral-400 dark:text-neutral-600 py-4 text-center">
                  아직 수집된 레퍼런스가 없습니다
                </div>
              )}
            </div>
          </div>

          {/* Agent insight */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 p-4 flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{insight}</p>
          </div>

          {/* Top tags */}
          {stats.topTags.length > 0 && (
            <div>
              <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-wider">
                자주 사용한 태그
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.topTags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/?tag=${tag.name}`}
                    className="rounded-lg bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 transition-all hover:bg-neutral-200 dark:hover:bg-neutral-700/50 hover:text-neutral-900 dark:hover:text-neutral-200 hover:border-neutral-300 dark:hover:border-neutral-600/50"
                  >
                    #{tag.name}
                    <span className="ml-1.5 text-neutral-400 dark:text-neutral-600 tabular-nums">
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
