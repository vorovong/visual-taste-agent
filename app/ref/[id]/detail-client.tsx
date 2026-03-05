"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HashtagInput } from "../../components/hashtag-input";

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
    colors: { background?: string[]; text?: string[]; primary?: string; accent?: string[] } | null;
    fonts: { family: string; size?: string; weight?: string }[] | null;
    layout: { type?: string; columns?: number; gap?: string; padding?: string } | null;
    meta: { framework?: string; libraries?: string[] } | null;
  } | null;
}

export function DetailClient({
  reference,
  screenshots,
  hashtags: initialHashtags,
  metadata,
}: DetailClientProps) {
  const router = useRouter();
  const [currentViewport, setCurrentViewport] = useState<string>("desktop");
  const [verdict, setVerdict] = useState(reference.verdict);
  const [showIframe, setShowIframe] = useState(
    reference.iframeAllowed && reference.sourceType === "url"
  );
  const [hashtags, setHashtags] = useState(initialHashtags);

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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="shrink-0 text-neutral-400 hover:text-white transition-colors text-sm"
            >
              &larr;
              <span className="hidden sm:inline"> 갤러리</span>
            </Link>
            <span className="text-neutral-600 hidden sm:inline">/</span>
            <span className="min-w-0 truncate text-sm font-medium">
              {reference.title || new URL(reference.url).hostname}
            </span>
          </div>
          <a
            href={reference.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            <span className="hidden sm:inline">새 탭에서 열기</span>
            <span className="sm:hidden">열기</span>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Preview */}
          <div className="flex-1 space-y-4">
            {/* Viewport tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto sm:gap-2">
              {viewports.map((vp) => {
                const hasShot = screenshots.some((s) => s.viewport === vp);
                return (
                  <button
                    key={vp}
                    onClick={() => {
                      setCurrentViewport(vp);
                      setShowIframe(false);
                    }}
                    disabled={!hasShot}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      currentViewport === vp
                        ? "bg-white text-neutral-900"
                        : hasShot
                        ? "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                        : "bg-neutral-900 text-neutral-700 cursor-not-allowed"
                    }`}
                  >
                    {vp.charAt(0).toUpperCase() + vp.slice(1)}
                  </button>
                );
              })}
              {reference.iframeAllowed && reference.sourceType === "url" && (
                <button
                  onClick={() => setShowIframe(!showIframe)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    showIframe
                      ? "bg-blue-600 text-white"
                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                  }`}
                >
                  라이브
                </button>
              )}
            </div>

            {/* Preview area */}
            <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
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
                <div className="flex h-[400px] items-center justify-center text-neutral-600">
                  No preview available
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full space-y-4 lg:w-80">
            {/* Verdict */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 space-y-3">
              <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                평가
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleVerdict("like")}
                  className={`rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    verdict === "like"
                      ? "bg-emerald-600 text-white"
                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                  }`}
                >
                  좋아요
                </button>
                <button
                  onClick={() => handleVerdict("dislike")}
                  className={`rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    verdict === "dislike"
                      ? "bg-red-600 text-white"
                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                  }`}
                >
                  싫어요
                </button>
                <button
                  onClick={() => handleVerdict("delete")}
                  className={`rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    verdict === "delete"
                      ? "bg-neutral-600 text-white"
                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                  }`}
                >
                  삭제
                </button>
              </div>
            </div>

            {/* Hashtags */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 space-y-3">
              <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
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
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 space-y-4">
                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  디자인 메타데이터
                </div>

                {/* Colors */}
                {metadata.colors && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-neutral-400">Colors</div>
                    <div className="flex flex-wrap gap-1.5">
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
                          <div
                            key={i}
                            className="group relative h-7 w-7 rounded border border-neutral-700"
                            style={{ backgroundColor: color as string }}
                            title={color as string}
                          >
                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-neutral-800 text-[9px] text-neutral-300 px-1 py-0.5 rounded whitespace-nowrap z-10">
                              {color}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Fonts */}
                {metadata.fonts && metadata.fonts.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-neutral-400">Fonts</div>
                    {metadata.fonts.slice(0, 4).map((font, i) => (
                      <div
                        key={i}
                        className="text-xs text-neutral-300"
                      >
                        <span className="font-medium">{font.family}</span>
                        {font.size && (
                          <span className="text-neutral-500 ml-1">
                            {font.size}
                          </span>
                        )}
                        {font.weight && (
                          <span className="text-neutral-500 ml-1">
                            w{font.weight}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Layout */}
                {metadata.layout && (
                  <div className="space-y-1">
                    <div className="text-[11px] text-neutral-400">Layout</div>
                    <div className="text-xs text-neutral-300">
                      {metadata.layout.type}
                      {metadata.layout.columns && ` (${metadata.layout.columns}cols)`}
                    </div>
                  </div>
                )}

                {/* Framework */}
                {metadata.meta &&
                  (metadata.meta.framework || metadata.meta.libraries?.length) && (
                    <div className="space-y-1">
                      <div className="text-[11px] text-neutral-400">Stack</div>
                      <div className="flex flex-wrap gap-1">
                        {metadata.meta.framework && (
                          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">
                            {metadata.meta.framework}
                          </span>
                        )}
                        {metadata.meta.libraries?.map((lib, i) => (
                          <span
                            key={i}
                            className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400"
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
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 space-y-2">
              <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                정보
              </div>
              <div className="space-y-1 text-xs text-neutral-400">
                <div>ID: {reference.id}</div>
                <div>수집: {new Date(reference.capturedAt).toLocaleDateString("ko-KR")}</div>
                {reference.evaluatedAt && (
                  <div>
                    평가: {new Date(reference.evaluatedAt).toLocaleDateString("ko-KR")}
                  </div>
                )}
                <div>
                  iframe: {reference.iframeAllowed ? "가능" : "불가"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
