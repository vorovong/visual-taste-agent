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

    const prompt = `Analyze this design image and return ONLY a valid JSON object (no markdown, no backticks) with this exact structure:
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
  "suggestedTags": ["tag1", "tag2", ...]
}

For style array, choose from: modern, minimal, bold, elegant, playful, corporate, editorial, brutalist, retro, futuristic, organic, geometric, dark-theme, light-theme, gradient, flat, skeuomorphic, glassmorphism, neumorphism, colorful, monochrome, serif, sans-serif, handwritten.
For suggestedTags, provide 3-8 descriptive tags relevant to this design.
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
