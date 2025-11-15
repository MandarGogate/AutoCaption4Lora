import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { ErrorHandler } from "@/lib/errors";
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, RateLimitPresets.RELAXED);
  if (rateLimitResult) return rateLimitResult;

  try {
    const logs = store.getLogs();
    return new NextResponse(logs, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    const appError = ErrorHandler.fromException(error, "Fetch logs");
    console.error(ErrorHandler.formatErrorForLog(appError, "GET /api/logs"));

    return new NextResponse("Error fetching logs", { status: appError.statusCode });
  }
}

export async function DELETE(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, RateLimitPresets.MODERATE);
  if (rateLimitResult) return rateLimitResult;

  try {
    store.clearLogs();
    return NextResponse.json({ success: true });
  } catch (error) {
    const appError = ErrorHandler.fromException(error, "Clear logs");
    console.error(ErrorHandler.formatErrorForLog(appError, "DELETE /api/logs"));

    return NextResponse.json(
      ErrorHandler.formatErrorForResponse(appError),
      { status: appError.statusCode }
    );
  }
}
