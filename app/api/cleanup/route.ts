import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { ErrorHandler } from "@/lib/errors";
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, RateLimitPresets.MODERATE);
  if (rateLimitResult) return rateLimitResult;

  try {
    await store.clearAll();
    return NextResponse.json({
      success: true,
      message: "All files cleared successfully"
    });
  } catch (error) {
    const appError = ErrorHandler.fromException(error, "Cleanup all files");
    console.error(ErrorHandler.formatErrorForLog(appError, "POST /api/cleanup"));

    return NextResponse.json(
      ErrorHandler.formatErrorForResponse(appError),
      { status: appError.statusCode }
    );
  }
}

// GET endpoint to cleanup old files (> 7 days)
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, RateLimitPresets.MODERATE);
  if (rateLimitResult) return rateLimitResult;

  try {
    await store.cleanupOldFiles(7);
    return NextResponse.json({
      success: true,
      message: "Old files cleaned up successfully"
    });
  } catch (error) {
    const appError = ErrorHandler.fromException(error, "Cleanup old files");
    console.error(ErrorHandler.formatErrorForLog(appError, "GET /api/cleanup"));

    return NextResponse.json(
      ErrorHandler.formatErrorForResponse(appError),
      { status: appError.statusCode }
    );
  }
}
