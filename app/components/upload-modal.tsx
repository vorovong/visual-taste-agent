"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const CONTENT_TYPES = [
  { value: "website", label: "Website" },
  { value: "presentation", label: "Presentation" },
  { value: "poster", label: "Poster" },
  { value: "report", label: "Report" },
  { value: "mobile-app", label: "Mobile App" },
  { value: "newsletter", label: "Newsletter" },
  { value: "other", label: "Other" },
];

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

type UploadState = "idle" | "uploading" | "success" | "error";

export function UploadModal({ open, onClose }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState("other");
  const [state, setState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultId, setResultId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const reset = useCallback(() => {
    setFile(null);
    setContentType("other");
    setState("idle");
    setErrorMsg("");
    setResultId(null);
    setDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleFile = useCallback((f: File) => {
    if (f.size > 10 * 1024 * 1024) {
      setErrorMsg("10MB 이하의 파일만 업로드할 수 있습니다");
      setState("error");
      return;
    }
    setFile(f);
    setState("idle");
    setErrorMsg("");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setState("uploading");
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("content_type", contentType);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Upload failed");
      }

      setResultId(json.id);
      setState("success");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Upload failed");
      setState("error");
    }
  }, [file, contentType]);

  const handleViewInGallery = useCallback(() => {
    handleClose();
    if (resultId) {
      router.push(`/ref/${resultId}`);
    } else {
      router.refresh();
    }
  }, [handleClose, resultId, router]);

  if (!open) return null;

  const filePreview = file ? (
    <div className="flex items-center gap-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/10">
        {file.type.startsWith("image/") ? (
          <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
          </svg>
        ) : (
          <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{file.name}</p>
        <p className="text-xs text-neutral-500">{(file.size / 1024).toFixed(1)} KB</p>
      </div>
      {state === "idle" && (
        <button
          onClick={() => {
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          className="shrink-0 rounded-lg p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  ) : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-2xl shadow-black/20 dark:shadow-black/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">파일 업로드</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {state === "success" ? (
            <div className="flex flex-col items-center py-6 space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <svg className="h-7 w-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">업로드 완료</p>
                <p className="mt-1 text-xs text-neutral-500">파일이 갤러리에 추가되었습니다</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => reset()}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  추가 업로드
                </button>
                <button
                  onClick={handleViewInGallery}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
                >
                  갤러리에서 보기
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              {!file && (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 transition-colors cursor-pointer ${
                    dragOver
                      ? "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/5"
                      : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800/50 mb-3">
                    <svg className="h-6 w-6 text-neutral-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    드래그 앤 드롭 또는{" "}
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">파일 선택</span>
                  </p>
                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-600">
                    이미지, PDF 등 (최대 10MB)
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleInputChange}
                accept="image/*,.pdf,.sketch,.fig,.xd,.ai,.psd"
              />

              {/* File preview */}
              {filePreview}

              {/* Content type */}
              {file && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    콘텐츠 유형
                  </label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2.5 text-sm text-neutral-800 dark:text-neutral-200 outline-none focus:border-emerald-500/40 transition-colors appearance-none cursor-pointer"
                  >
                    {CONTENT_TYPES.map((ct) => (
                      <option key={ct.value} value={ct.value}>
                        {ct.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Error */}
              {state === "error" && errorMsg && (
                <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3">
                  <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
                </div>
              )}

              {/* Upload button */}
              {file && state !== "uploading" && (
                <button
                  onClick={handleUpload}
                  className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                >
                  업로드
                </button>
              )}

              {/* Uploading spinner */}
              {state === "uploading" && (
                <div className="flex flex-col items-center py-4 space-y-3">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-emerald-500" />
                  <p className="text-xs text-neutral-500">분석 중...</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
