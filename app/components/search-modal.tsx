"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: number;
  title: string | null;
  url: string;
  sourceDomain: string | null;
  contentType: string | null;
  verdict: string | null;
  screenshot: string | null;
}

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/references/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const navigate = useCallback(
    (id: number) => {
      setOpen(false);
      router.push(`/ref/${id}`);
    },
    [router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      navigate(results[selectedIndex].id);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-neutral-900 shadow-2xl shadow-black/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center border-b border-white/[0.06] px-4">
          <svg
            className="h-4 w-4 text-neutral-500 shrink-0"
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
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="제목, URL, 태그, 도메인 검색..."
            className="flex-1 bg-transparent px-3 py-4 text-sm text-neutral-200 placeholder-neutral-600 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-neutral-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="max-h-[50vh] overflow-y-auto p-2">
            {results.map((item, i) => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  i === selectedIndex
                    ? "bg-white/[0.08]"
                    : "hover:bg-white/[0.04]"
                }`}
              >
                {/* Thumbnail */}
                {item.screenshot ? (
                  <img
                    src={`/screenshots/${item.screenshot}`}
                    alt=""
                    className="h-10 w-16 shrink-0 rounded-md object-cover object-top bg-neutral-800"
                  />
                ) : (
                  <div className="h-10 w-16 shrink-0 rounded-md bg-neutral-800 flex items-center justify-center">
                    <svg className="h-4 w-4 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-neutral-200 truncate">
                    {item.title || item.sourceDomain || (() => { try { return new URL(item.url).hostname; } catch { return item.url; } })()}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.sourceDomain && (
                      <span className="text-[10px] text-neutral-500 truncate">
                        {item.sourceDomain}
                      </span>
                    )}
                    {item.contentType && item.contentType !== "website" && (
                      <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-neutral-500">
                        {item.contentType}
                      </span>
                    )}
                  </div>
                </div>
                {item.verdict && (
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      item.verdict === "like"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : item.verdict === "dislike"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-neutral-700 text-neutral-400"
                    }`}
                  >
                    {item.verdict === "like" ? "LIKE" : item.verdict === "dislike" ? "PASS" : "DEL"}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : query && !loading ? (
          <div className="px-4 py-8 text-center text-sm text-neutral-600">
            검색 결과가 없습니다
          </div>
        ) : !query ? (
          <div className="px-4 py-6 text-center text-xs text-neutral-600">
            제목, URL, 태그, 도메인으로 검색
          </div>
        ) : null}

        {loading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden">
            <div className="h-full w-1/3 bg-emerald-500 animate-pulse rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
