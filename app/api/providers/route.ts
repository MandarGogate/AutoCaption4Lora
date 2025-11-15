import { NextRequest, NextResponse } from "next/server";
import { LLM_PROVIDERS } from "@/lib/providers";
import { ErrorHandler, TimeoutController } from "@/lib/errors";
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit";

const API_TIMEOUT_MS = 10000; // 10 seconds for provider info

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, RateLimitPresets.RELAXED);
  if (rateLimitResult) return rateLimitResult;

  try {
    // Build list of available providers
    const availableProviders = [];

    for (const [id, config] of Object.entries(LLM_PROVIDERS)) {
      // Check if API key is available (if required)
      const apiKey = config.requiresApiKey ? process.env[config.envVar] : true;
      const isAvailable = !!apiKey;

      availableProviders.push({
        id: config.id,
        name: config.name,
        requiresApiKey: config.requiresApiKey,
        isAvailable,
        models: config.models,
      });
    }

    // Fetch Gemini models dynamically if available
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey && geminiApiKey !== "your_gemini_api_key_here") {
      try {
        const response = await TimeoutController.withAbortSignal(
          async (signal) => {
            return fetch(
              `https://generativelanguage.googleapis.com/v1beta/models`,
              {
                headers: {
                  'x-goog-api-key': geminiApiKey,
                },
                signal,
              }
            );
          },
          API_TIMEOUT_MS
        );

        if (response.ok) {
          const data = await response.json();
          const visionModels = data.models
            ?.filter((model: any) =>
              model.supportedGenerationMethods?.includes("generateContent")
            )
            .map((model: any) => model.name.replace("models/", ""));

          // Update Gemini provider with fetched models
          const geminiProvider = availableProviders.find(p => p.id === "gemini");
          if (geminiProvider && visionModels?.length > 0) {
            geminiProvider.models = visionModels;
          }
        }
      } catch (error) {
        console.error("Failed to fetch Gemini models:", error);
        // Continue without dynamic models
      }
    }

    return NextResponse.json({ providers: availableProviders });
  } catch (error) {
    const appError = ErrorHandler.fromException(error, "Providers API");
    console.error(ErrorHandler.formatErrorForLog(appError, "GET /api/providers"));

    return NextResponse.json(
      ErrorHandler.formatErrorForResponse(appError),
      { status: appError.statusCode }
    );
  }
}
