import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFile } from "fs/promises";

const apiKey = process.env.GEMINI_API_KEY;

interface DesignAnalysis {
  colors: {
    palette: string[];
    mood: string; // "dark", "light", "vibrant", "muted", etc.
  };
  typography: {
    style: string; // "sans-serif", "serif", "mixed", "display"
    weight: string; // "light", "regular", "bold", "heavy"
  };
  layout: {
    type: string; // "centered", "asymmetric", "grid", "full-bleed", etc.
    density: string; // "minimal", "moderate", "dense"
  };
  style: string[]; // ["modern", "minimal", "dark-theme", ...]
  contentType: string; // "website", "presentation", "poster", "report", "mobile-app", etc.
  suggestedTags: string[];
  summary: string; // 2-3 sentence Korean design critique/description
  strengths: string[]; // design strengths in Korean
  characteristics: string[]; // unique design characteristics in Korean
}

/**
 * Analyze an image using Gemini 3 Flash vision model.
 * Returns structured design analysis.
 */
export async function analyzeDesign(imagePath: string): Promise<DesignAnalysis | null> {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set, skipping vision analysis");
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const imageBuffer = await readFile(imagePath);
    const base64Image = imageBuffer.toString("base64");
    const mimeType = imagePath.endsWith(".png")
      ? "image/png"
      : imagePath.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";

    const prompt = `You are an expert design critic analyzing a screenshot. Examine the visual design carefully and return ONLY a valid JSON object (no markdown, no backticks) with this exact structure:
{
  "colors": {
    "palette": ["#hex1", "#hex2", ...],
    "mood": "dark" | "light" | "vibrant" | "muted" | "neutral"
  },
  "typography": {
    "style": "sans-serif" | "serif" | "mixed" | "display" | "monospace",
    "weight": "light" | "regular" | "bold" | "heavy"
  },
  "layout": {
    "type": "centered" | "asymmetric" | "grid" | "full-bleed" | "split" | "card-based" | "single-column",
    "density": "minimal" | "moderate" | "dense"
  },
  "style": ["modern", "minimal", ...],
  "contentType": "website" | "presentation" | "poster" | "report" | "mobile-app" | "newsletter" | "other",
  "suggestedTags": ["tag1", "tag2", ...],
  "summary": "한국어로 2-3문장. 디자인 비전공자도 이해할 수 있도록 이 디자인의 전반적인 인상과 특징을 자연스러운 언어로 설명하는 비평.",
  "strengths": ["한국어로 이 디자인의 장점 1", "장점 2", ...],
  "characteristics": ["한국어로 이 디자인을 독특하게 만드는 특징 1", "특징 2", ...]
}

Field instructions:
- For style array, choose from: modern, minimal, bold, elegant, playful, corporate, editorial, brutalist, retro, futuristic, organic, geometric, dark-theme, light-theme, gradient, flat, skeuomorphic, glassmorphism, neumorphism, colorful, monochrome, serif, sans-serif, handwritten.
- For suggestedTags, provide 3-8 descriptive tags relevant to this design.
- For summary: Write 2-3 sentences IN KOREAN. Describe the overall impression and notable design choices in plain language a non-designer can appreciate. Be specific about visual choices (e.g. color usage, spacing, typography feel).
- For strengths: Write 2-4 items IN KOREAN. Focus on what works well — clarity, visual hierarchy, use of whitespace, color harmony, etc.
- For characteristics: Write 2-4 items IN KOREAN. Describe what makes this design distinctive or memorable — specific techniques, aesthetic decisions, or stylistic signatures.
Respond with ONLY the JSON.`;

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ]);

    const responseText = result.response.text().trim();
    // Strip markdown code blocks if present
    const jsonStr = responseText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(jsonStr) as DesignAnalysis;
  } catch (e) {
    console.error("Gemini analysis failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
