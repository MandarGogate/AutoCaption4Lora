import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ErrorHandler, TimeoutController } from "@/lib/errors";
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit";

const API_TIMEOUT_MS = 15000; // 15 seconds for API test

// Allowed model names to prevent injection
const ALLOWED_MODEL_PATTERN = /^[a-zA-Z0-9.\-]+$/;

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, RateLimitPresets.STRICT);
  if (rateLimitResult) return rateLimitResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const modelName = searchParams.get("model") || "gemini-1.5-flash-latest";

    // Validate model name to prevent injection
    if (!ALLOWED_MODEL_PATTERN.test(modelName)) {
      const error = ErrorHandler.createError(
        "INVALID_INPUT" as any,
        "Invalid model name",
        `Model name contains invalid characters: ${modelName}`,
        "Please use only alphanumeric characters, dots, and hyphens in model names.",
        400
      );
      return NextResponse.json(ErrorHandler.formatErrorForResponse(error), { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json({
        success: false,
        error: "Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.",
      });
    }

    // Test the API with a simple request and timeout protection
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await TimeoutController.withTimeout(
      model.generateContent("Say 'API is working' in one sentence."),
      API_TIMEOUT_MS,
      `Gemini API test with model ${modelName}`
    );

    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      success: true,
      message: `API connection successful with ${modelName}! Response: ${text}`,
    });
  } catch (error: any) {
    const appError = ErrorHandler.fromException(error, "Gemini API test");
    console.error(ErrorHandler.formatErrorForLog(appError, "GET /api/test"));

    return NextResponse.json({
      success: false,
      error: appError.message,
      code: appError.code,
      suggestion: appError.suggestion,
    }, { status: appError.statusCode });
  }
}
