import { NextRequest, NextResponse } from "next/server";
import { ErrorHandler } from "@/lib/errors";
import { TimeoutController } from "@/lib/errors";
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit";

const API_TIMEOUT_MS = 10000; // 10 seconds for model listing

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, RateLimitPresets.RELAXED);
  if (rateLimitResult) return rateLimitResult;

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json({
        error: "Gemini API key is not configured",
        models: [],
      });
    }

    // Fetch models with timeout protection
    const response = await TimeoutController.withAbortSignal(
      async (signal) => {
        return fetch(
          `https://generativelanguage.googleapis.com/v1beta/models`,
          {
            headers: {
              'x-goog-api-key': apiKey,
            },
            signal,
          }
        );
      },
      API_TIMEOUT_MS
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();

    // Filter for models that support generateContent (vision/multimodal models)
    const visionModels = data.models
      ?.filter((model: any) =>
        model.supportedGenerationMethods?.includes("generateContent") &&
        model.name
      )
      .map((model: any) => ({
        name: model.name?.replace("models/", "") || "",
        displayName: model.displayName || model.name?.replace("models/", "") || "",
        description: model.description || "Multimodal AI model",
        inputTokenLimit: model.inputTokenLimit || 0,
        outputTokenLimit: model.outputTokenLimit || 0,
      }))
      .sort((a: any, b: any) => {
        // Sort: flash models first, then pro, then others
        if (a.name.includes("flash") && !b.name.includes("flash")) return -1;
        if (!a.name.includes("flash") && b.name.includes("flash")) return 1;
        if (a.name.includes("pro") && !b.name.includes("pro")) return -1;
        if (!a.name.includes("pro") && b.name.includes("pro")) return 1;
        return a.name.localeCompare(b.name);
      }) || [];

    return NextResponse.json({
      models: visionModels,
      count: visionModels.length,
    });
  } catch (error: any) {
    const appError = ErrorHandler.fromException(error, "Gemini models API");
    console.error(ErrorHandler.formatErrorForLog(appError, "GET /api/models"));

    return NextResponse.json({
      error: appError.message,
      code: appError.code,
      suggestion: appError.suggestion,
      models: [],
    }, { status: appError.statusCode });
  }
}
