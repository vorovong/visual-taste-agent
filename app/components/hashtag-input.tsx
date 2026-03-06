"use client";

import { useState, useEffect, useRef } from "react";

interface HashtagInputProps {
  referenceId: number;
  currentTags: { id: number; name: string }[];
  onTagsChange: () => void;
}

export function HashtagInput({
  referenceId,
  currentTags,
  onTagsChange,
}: HashtagInputProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<
    { id: number; name: string; usageCount: number }[]
  >([]);
  const [allTags, setAllTags] = useState<
    { id: number; name: string; usageCount: number }[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/hashtags")
      .then((r) => r.json())
      .then(setAllTags);
  }, []);

  useEffect(() => {
    const filtered = allTags.filter(
      (t) => !currentTags.some((ct) => ct.id === t.id)
    );
    if (!input.trim()) {
      setSuggestions(filtered.slice(0, 8));
    } else {
      setSuggestions(
        filtered
          .filter((t) => t.name.includes(input.toLowerCase()))
          .slice(0, 8)
      );
    }
    setSelectedIndex(-1);
  }, [input, allTags, currentTags]);

  const addTag = async (name: string) => {
    await fetch(`/api/references/${referenceId}/hashtags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setInput("");
    const res = await fetch("/api/hashtags");
    setAllTags(await res.json());
    onTagsChange();
  };

  const removeTag = async (hashtagId: number) => {
    await fetch(`/api/references/${referenceId}/hashtags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hashtagId }),
    });
    const res = await fetch("/api/hashtags");
    setAllTags(await res.json());
    onTagsChange();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addTag(suggestions[selectedIndex].name);
      } else if (input.trim()) {
        addTag(input.trim());
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Current tags */}
      {currentTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {currentTags.map((tag) => (
            <span
              key={tag.id}
              className="group inline-flex items-center gap-1 rounded-lg bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 px-2.5 py-1 text-sm text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-300 dark:hover:border-neutral-600"
            >
              #{tag.name}
              <button
                onClick={() => removeTag(tag.id)}
                className="ml-0.5 rounded-full p-0.5 text-neutral-400 dark:text-neutral-600 transition-colors hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <div className="flex items-center rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 transition-colors focus-within:border-neutral-400 dark:focus-within:border-neutral-600 focus-within:bg-white dark:focus-within:bg-neutral-800/50">
          <svg
            className="ml-3 h-4 w-4 text-neutral-400 dark:text-neutral-600 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="태그 추가..."
            className="w-full bg-transparent py-2.5 pl-2 pr-3 text-sm text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-600 outline-none"
          />
        </div>

        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1.5 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-1 shadow-2xl shadow-black/10 dark:shadow-black/40">
            {suggestions.map((tag, index) => (
              <button
                key={tag.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(tag.name);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  index === selectedIndex
                    ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                }`}
              >
                <span>#{tag.name}</span>
                <span className="text-neutral-400 dark:text-neutral-600 text-xs tabular-nums">
                  {tag.usageCount}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
