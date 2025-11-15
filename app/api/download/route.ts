import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { ErrorHandler } from "@/lib/errors";
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit";
import archiver from "archiver";
import { Readable } from "stream";

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, RateLimitPresets.MODERATE);
  if (rateLimitResult) return rateLimitResult;

  try {
    const processedResults = store.getProcessedResults();

    if (processedResults.length === 0) {
      const error = ErrorHandler.createError(
        "INVALID_INPUT" as any,
        "No processed images available",
        "The processed results store is empty",
        "Please process images first before attempting to download.",
        400
      );
      return NextResponse.json(ErrorHandler.formatErrorForResponse(error), { status: 400 });
    }

    // Create a ZIP archive with streaming to avoid memory exhaustion
    const archive = archiver("zip", {
      zlib: { level: 6 }, // Reduced compression for faster streaming
    });

    // Convert archiver stream to web ReadableStream for Next.js
    const stream = new ReadableStream({
      start(controller) {
        archive.on("data", (chunk: Buffer) => {
          controller.enqueue(chunk);
        });

        archive.on("end", () => {
          controller.close();
        });

        archive.on("error", (err) => {
          console.error("Archive error:", err);
          controller.error(err);
        });

        // Add processed images and captions to the archive
        for (const result of processedResults) {
          // Add image file
          archive.append(result.imageData, { name: result.filename });

          // Add caption file
          const captionFilename = result.filename.replace(/\.[^.]+$/, ".txt");
          archive.append(result.caption, { name: captionFilename });
        }

        // Finalize the archive (must be after adding files)
        archive.finalize();
      },
    });

    // Return streaming response to avoid loading entire ZIP in memory
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=lora_dataset.zip",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const appError = ErrorHandler.fromException(error, "ZIP download");
    console.error(ErrorHandler.formatErrorForLog(appError, "GET /api/download"));

    return NextResponse.json(
      ErrorHandler.formatErrorForResponse(appError),
      { status: appError.statusCode }
    );
  }
}
