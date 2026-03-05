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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/hashtags")
      .then((r) => r.json())
      .then(setAllTags);
  }, []);

  useEffect(() => {
    if (!input.trim()) {
      setSuggestions(
        allTags
          .filter((t) => !currentTags.some((ct) => ct.id === t.id))
          .slice(0, 8)
      );
    } else {
      setSuggestions(
        allTags
          .filter(
            (t) =>
              t.name.includes(input.toLowerCase()) &&
              !currentTags.some((ct) => ct.id === t.id)
          )
          .slice(0, 8)
      );
    }
  }, [input, allTags, currentTags]);

  const addTag = async (name: string) => {
    await fetch(`/api/references/${referenceId}/hashtags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setInput("");
    // Refresh all tags
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

  return (
    <div className="space-y-2">
      {/* Current tags */}
      <div className="flex flex-wrap gap-1.5">
        {currentTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300"
          >
            #{tag.name}
            <button
              onClick={() => removeTag(tag.id)}
              className="text-neutral-500 hover:text-red-400 transition-colors"
            >
              x
            </button>
          </span>
        ))}
      </div>

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              e.preventDefault();
              addTag(input.trim());
            }
          }}
          placeholder="태그 추가..."
          className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 outline-none focus:border-neutral-500"
        />

        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-800 p-1 shadow-xl">
            {suggestions.map((tag) => (
              <button
                key={tag.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(tag.name);
                }}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700"
              >
                <span>#{tag.name}</span>
                <span className="text-neutral-500">{tag.usageCount}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
