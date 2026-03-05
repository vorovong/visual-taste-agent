export type Verdict = "like" | "dislike" | "delete";
export type SourceType = "url" | "image" | "file";
export type Viewport = "mobile" | "tablet" | "desktop";
export type DesignSystemStatus = "draft" | "stable" | "archived";

export interface ColorPalette {
  background?: string[];
  text?: string[];
  primary?: string;
  secondary?: string;
  accent?: string[];
}

export interface FontInfo {
  family: string;
  size?: string;
  weight?: string;
}

export interface LayoutInfo {
  type?: string; // grid, flex, etc.
  columns?: number;
  gap?: string;
  padding?: string;
}

export interface FrameworkMeta {
  framework?: string;
  libraries?: string[];
}

export interface CaptureResult {
  success: boolean;
  files: string[];
  title?: string;
  iframeAllowed?: boolean;
  metadata?: {
    colors: ColorPalette;
    fonts: FontInfo[];
    layout: LayoutInfo;
    meta: FrameworkMeta;
  };
  error?: string;
}
