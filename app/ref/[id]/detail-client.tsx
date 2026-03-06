"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HashtagInput } from "../../components/hashtag-input";

interface NavRef {
  id: number;
  title: string | null;
}

interface RelatedRef {
  id: number;
  url: string;
  title: string | null;
  verdict: string | null;
  sourceDomain: string | null;
  screenshotPath: string | null;
  sharedTags: number;
}

interface DetailClientProps {
  reference: {
    id: number;
    url: string;
    title: string | null;
    verdict: string | null;
    sourceType: string;
    iframeAllowed: boolean | null;
    capturedAt: string;
    evaluatedAt: string | null;
  };
  screenshots: { id: number; viewport: string; path: string }[];
  hashtags: { id: number; name: string; category: string | null }[];
  metadata: {
    colors: {
      background?: string[];
      text?: string[];
      primary?: string;
      accent?: string[];
    } | null;
    fonts: { family: string; size?: string; weight?: string }[] | null;
    layout: {
      type?: string;
      columns?: number;
      gap?: string;
      padding?: string;
    } | null;
    meta: { framework?: string; libraries?: string[]; gemini?: Record<string, unknown> } | null;
  } | null;
  prevRef?: NavRef | null;
  nextRef?: NavRef | null;
  relatedRefs?: RelatedRef[];
}

export function DetailClient({
  reference,
  screenshots,
  hashtags: initialHashtags,
  metadata,
  prevRef,
  nextRef,
  relatedRefs = [],
}: DetailClientProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentViewport, setCurrentViewport] = useState<string>("desktop");
  const [verdict, setVerdict] = useState(reference.verdict);
  const [showIframe, setShowIframe] = useState(
    reference.iframeAllowed && reference.sourceType === "url"
  );
  const [hashtags, setHashtags] = useState(initialHashtags);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const viewports = ["desktop", "tablet", "mobile"] as const;
  const currentShot = screenshots.find((s) => s.viewport === currentViewport);

  const handleVerdict = async (v: string) => {
    const newVerdict = verdict === v ? null : v;
    await fetch(`/api/references/${reference.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verdict: newVerdict }),
    });
    setVerdict(newVerdict);
  };

  const refreshHashtags = useCallback(async () => {
    const res = await fetch(`/api/references/${reference.id}`);
    const data = await res.json();
    setHashtags(data.hashtags);
  }, [reference.id]);

  const copyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 1500);
  };

  const verdictButtons = [
    {
      value: "like",
      label: "LIKE",
      activeClass: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      ),
    },
    {
      value: "dislike",
      label: "PASS",
      activeClass: "bg-red-500 text-white shadow-lg shadow-red-500/20",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    {
      value: "delete",
      label: "DEL",
      activeClass: "bg-neutral-600 text-white",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-neutral-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 shrink-0 rounded-lg px-2 py-1 text-neutral-500 transition-colors hover:bg-white/[0.04] hover:text-neutral-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              <span className="hidden sm:inline text-sm">갤러리</span>
            </Link>
            <div className="h-4 w-px bg-white/[0.06] hidden sm:block" />
            <span className="min-w-0 truncate text-sm font-medium text-neutral-200">
              {reference.title || (() => { try { return new URL(reference.url).hostname; } catch { return reference.url; } })()}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Prev/Next navigation */}
            <div className="flex items-center gap-1">
              {prevRef ? (
                <Link
                  href={`/ref/${prevRef.id}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-neutral-400 transition-all hover:bg-white/[0.06] hover:text-neutral-200"
                  title={prevRef.title || "이전"}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </Link>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.04] text-neutral-700">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </div>
              )}
              {nextRef ? (
                <Link
                  href={`/ref/${nextRef.id}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-neutral-400 transition-all hover:bg-white/[0.06] hover:text-neutral-200"
                  title={nextRef.title || "다음"}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.04] text-neutral-700">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              )}
            </div>
            <a
              href={reference.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-neutral-400 transition-all hover:bg-white/[0.06] hover:text-neutral-200 hover:border-white/[0.12]"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              <span className="hidden sm:inline">새 탭에서 열기</span>
              <span className="sm:hidden">열기</span>
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Preview */}
          <div className="flex-1 space-y-4">
            {/* Viewport tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-white/[0.02] border border-white/[0.06] p-1 w-fit">
              {viewports.map((vp) => {
                const hasShot = screenshots.some((s) => s.viewport === vp);
                const vpIcons: Record<string, React.ReactNode> = {
                  desktop: (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                    </svg>
                  ),
                  tablet: (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25v-15a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  ),
                  mobile: (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  ),
                };

                return (
                  <button
                    key={vp}
                    onClick={() => {
                      setCurrentViewport(vp);
                      setShowIframe(false);
                    }}
                    disabled={!hasShot}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      currentViewport === vp && !showIframe
                        ? "bg-white/[0.1] text-white shadow-sm"
                        : hasShot
                        ? "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04]"
                        : "text-neutral-700 cursor-not-allowed"
                    }`}
                  >
                    {vpIcons[vp]}
                    <span className="hidden sm:inline">
                      {vp.charAt(0).toUpperCase() + vp.slice(1)}
                    </span>
                  </button>
                );
              })}
              {reference.iframeAllowed && reference.sourceType === "url" && (
                <>
                  <div className="h-4 w-px bg-white/[0.06]" />
                  <button
                    onClick={() => setShowIframe(!showIframe)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      showIframe
                        ? "bg-blue-500/20 text-blue-400"
                        : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04]"
                    }`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                    <span className="hidden sm:inline">라이브</span>
                  </button>
                </>
              )}
            </div>

            {/* Preview area */}
            <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-neutral-900/30">
              {showIframe ? (
                <iframe
                  src={reference.url}
                  className="h-[600px] w-full border-0"
                  title={reference.title || "Preview"}
                />
              ) : currentShot ? (
                <img
                  src={`/screenshots/${currentShot.path}`}
                  alt={`${currentViewport} view`}
                  className="w-full"
                />
              ) : (
                <div className="flex h-[400px] flex-col items-center justify-center gap-3 text-neutral-600">
                  <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                  <span className="text-sm">프리뷰를 사용할 수 없습니다</span>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: Bottom sheet toggle button */}
          <button
            className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-emerald-900/30 transition-transform active:scale-95"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            평가 & 태그
          </button>

          {/* Mobile bottom sheet backdrop */}
          {sidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar / Bottom sheet */}
          <div className={`
            w-full space-y-4 lg:w-80 shrink-0
            max-lg:fixed max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:z-50
            max-lg:max-h-[80vh] max-lg:overflow-y-auto max-lg:rounded-t-2xl
            max-lg:bg-neutral-950 max-lg:border-t max-lg:border-white/[0.08]
            max-lg:p-4 max-lg:safe-area-bottom
            max-lg:transition-transform max-lg:duration-300
            ${sidebarOpen ? "max-lg:translate-y-0" : "max-lg:translate-y-full max-lg:pointer-events-none lg:pointer-events-auto lg:translate-y-0"}
          `}>
            {/* Bottom sheet handle (mobile only) */}
            <div className="lg:hidden flex justify-center pb-2">
              <button
                onClick={() => setSidebarOpen(false)}
                className="h-1 w-10 rounded-full bg-white/[0.15]"
              />
            </div>

            {/* Verdict */}
            <div className="rounded-xl border border-white/[0.06] bg-neutral-900/50 p-4 space-y-3">
              <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-widest">
                평가
              </div>
              <div className="grid grid-cols-3 gap-2">
                {verdictButtons.map((btn) => (
                  <button
                    key={btn.value}
                    onClick={() => handleVerdict(btn.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl py-3 sm:py-3 min-h-[48px] text-xs font-semibold transition-all ${
                      verdict === btn.value
                        ? btn.activeClass
                        : "bg-white/[0.03] border border-white/[0.06] text-neutral-500 hover:bg-white/[0.06] hover:text-neutral-300"
                    }`}
                  >
                    {btn.icon}
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hashtags */}
            <div className="rounded-xl border border-white/[0.06] bg-neutral-900/50 p-4 space-y-3">
              <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-widest">
                태그
              </div>
              <HashtagInput
                referenceId={reference.id}
                currentTags={hashtags}
                onTagsChange={refreshHashtags}
              />
            </div>

            {/* Design Metadata */}
            {metadata && (
              <div className="rounded-xl border border-white/[0.06] bg-neutral-900/50 p-4 space-y-4">
                <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-widest">
                  디자인 메타데이터
                </div>

                {/* Colors */}
                {metadata.colors && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-neutral-400">Colors</div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ...(metadata.colors.background || []),
                        ...(metadata.colors.text || []),
                        ...(metadata.colors.accent || []),
                        metadata.colors.primary,
                      ]
                        .filter(Boolean)
                        .filter((c, i, a) => a.indexOf(c) === i)
                        .slice(0, 10)
                        .map((color, i) => (
                          <button
                            key={i}
                            onClick={() => copyColor(color as string)}
                            className="group relative h-8 w-8 rounded-lg border border-white/[0.08] transition-all hover:scale-110 hover:border-white/[0.2] hover:shadow-lg"
                            style={{ backgroundColor: color as string }}
                            title={`${color} - 클릭하여 복사`}
                          >
                            {copiedColor === color && (
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] text-white whitespace-nowrap">
                                복사됨
                              </div>
                            )}
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:block rounded bg-neutral-800 px-1.5 py-0.5 text-[9px] text-neutral-300 whitespace-nowrap z-10 font-[family-name:var(--font-mono)]">
                              {color}
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Fonts */}
                {metadata.fonts && metadata.fonts.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-neutral-400">Fonts</div>
                    <div className="space-y-1.5">
                      {metadata.fonts.slice(0, 4).map((font, i) => (
                        <div
                          key={i}
                          className="flex items-baseline gap-2 text-xs"
                        >
                          <span className="font-medium text-neutral-300">
                            {font.family}
                          </span>
                          {(font.size || font.weight) && (
                            <span className="text-neutral-600 font-[family-name:var(--font-mono)] text-[10px]">
                              {font.size}
                              {font.size && font.weight && " / "}
                              {font.weight && `w${font.weight}`}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Layout */}
                {metadata.layout && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-neutral-400">Layout</div>
                    <div className="text-xs text-neutral-300 font-[family-name:var(--font-mono)]">
                      {metadata.layout.type}
                      {metadata.layout.columns &&
                        ` (${metadata.layout.columns}cols)`}
                    </div>
                  </div>
                )}

                {/* Framework */}
                {metadata.meta &&
                  (metadata.meta.framework ||
                    (metadata.meta.libraries && metadata.meta.libraries.length > 0)) && (
                    <div className="space-y-2">
                      <div className="text-[11px] text-neutral-400">Stack</div>
                      <div className="flex flex-wrap gap-1.5">
                        {metadata.meta.framework && (
                          <span className="rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                            {metadata.meta.framework}
                          </span>
                        )}
                        {metadata.meta.libraries?.map((lib, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[10px] text-neutral-500"
                          >
                            {lib}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Meta info */}
            <div className="rounded-xl border border-white/[0.06] bg-neutral-900/50 p-4 space-y-3">
              <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-widest">
                정보
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">ID</span>
                  <span className="text-neutral-300 font-[family-name:var(--font-mono)]">
                    {reference.id}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">수집</span>
                  <span className="text-neutral-300">
                    {new Date(reference.capturedAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                {reference.evaluatedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">평가</span>
                    <span className="text-neutral-300">
                      {new Date(reference.evaluatedAt).toLocaleDateString(
                        "ko-KR"
                      )}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">iframe</span>
                  <span
                    className={
                      reference.iframeAllowed
                        ? "text-emerald-400"
                        : "text-neutral-600"
                    }
                  >
                    {reference.iframeAllowed ? "가능" : "불가"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related References */}
        {relatedRefs.length > 0 && (
          <div className="mt-8 space-y-4">
            <h2 className="text-sm font-medium text-neutral-400">관련 레퍼런스</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {relatedRefs.map((r) => (
                <Link
                  key={r.id}
                  href={`/ref/${r.id}`}
                  className="group overflow-hidden rounded-xl border border-white/[0.06] bg-neutral-900/50 transition-all hover:border-white/[0.12] hover:bg-neutral-900/80"
                >
                  <div className="aspect-[16/10] bg-neutral-800 overflow-hidden">
                    {r.screenshotPath ? (
                      <img
                        src={`/screenshots/${r.screenshotPath}`}
                        alt={r.title || ""}
                        className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-700">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 space-y-1">
                    <p className="truncate text-xs font-medium text-neutral-300 group-hover:text-white">
                      {r.title || r.sourceDomain || (() => { try { return new URL(r.url).hostname; } catch { return r.url; } })()}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {r.verdict === "like" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                      {r.verdict === "dislike" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      )}
                      {r.sharedTags > 0 && (
                        <span className="text-[10px] text-neutral-600">
                          태그 {r.sharedTags}개 공유
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
