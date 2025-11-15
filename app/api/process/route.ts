import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { generateCaption } from "@/lib/gemini";
import { generateCaptionOpenAI } from "@/lib/providers";
import { ErrorHandler, ErrorCode } from "@/lib/errors";
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit";

// Input validation limits
const MAX_PREFIX_LENGTH = 50;
const MAX_KEYWORD_LENGTH = 100;
const MAX_GUIDANCE_LENGTH = 1000;
const MAX_HINTS_LENGTH = 500;

export async function POST(request: NextRequest) {
  // Apply strict rate limiting for AI processing (expensive operation)
  const rateLimitResult = await rateLimit(request, RateLimitPresets.STRICT);
  if (rateLimitResult) return rateLimitResult;

  try {
    const formData = await request.formData();

    const provider = (formData.get("provider") as string) || "gemini";
    const modelName = formData.get("modelName") as string || "gemini-1.5-flash-latest";
    const prefix = formData.get("prefix") as string;
    const keyword = formData.get("keyword") as string;
    const checkpoint = formData.get("checkpoint") as string;
    const captionGuidance = formData.get("captionGuidance") as string || "";
    const negativeHints = formData.get("negativeHints") as string || "";
    const captionLength = formData.get("captionLength") as string;
    const strictFocus = formData.get("strictFocus") === "true";

    // Validate input lengths
    if (prefix && prefix.length > MAX_PREFIX_LENGTH) {
      const error = ErrorHandler.createError(
        ErrorCode.INVALID_INPUT,
        "Prefix is too long",
        `Maximum ${MAX_PREFIX_LENGTH} characters allowed, got ${prefix.length}`,
        `Please shorten your prefix to ${MAX_PREFIX_LENGTH} characters or less.`,
        400
      );
      return NextResponse.json(ErrorHandler.formatErrorForResponse(error), { status: 400 });
    }

    if (keyword && keyword.length > MAX_KEYWORD_LENGTH) {
      const error = ErrorHandler.createError(
        ErrorCode.INVALID_INPUT,
        "Keyword is too long",
        `Maximum ${MAX_KEYWORD_LENGTH} characters allowed, got ${keyword.length}`,
        `Please shorten your keyword to ${MAX_KEYWORD_LENGTH} characters or less.`,
        400
      );
      return NextResponse.json(ErrorHandler.formatErrorForResponse(error), { status: 400 });
    }

    if (captionGuidance && captionGuidance.length > MAX_GUIDANCE_LENGTH) {
      const error = ErrorHandler.createError(
        ErrorCode.INVALID_INPUT,
        "Caption guidance is too long",
        `Maximum ${MAX_GUIDANCE_LENGTH} characters allowed, got ${captionGuidance.length}`,
        `Please shorten your caption guidance to ${MAX_GUIDANCE_LENGTH} characters or less.`,
        400
      );
      return NextResponse.json(ErrorHandler.formatErrorForResponse(error), { status: 400 });
    }

    if (negativeHints && negativeHints.length > MAX_HINTS_LENGTH) {
      const error = ErrorHandler.createError(
        ErrorCode.INVALID_INPUT,
        "Negative hints are too long",
        `Maximum ${MAX_HINTS_LENGTH} characters allowed, got ${negativeHints.length}`,
        `Please shorten your negative hints to ${MAX_HINTS_LENGTH} characters or less.`,
        400
      );
      return NextResponse.json(ErrorHandler.formatErrorForResponse(error), { status: 400 });
    }

    // Validate required fields
    if (!prefix || prefix.trim() === "") {
      const error = ErrorHandler.createError(
        ErrorCode.INVALID_INPUT,
        "Prefix is required",
        "Prefix field is empty or missing",
        "Please provide a prefix for the output filenames.",
        400
      );
      return NextResponse.json(ErrorHandler.formatErrorForResponse(error), { status: 400 });
    }

    if (!keyword || keyword.trim() === "") {
      const error = ErrorHandler.createError(
        ErrorCode.INVALID_INPUT,
        "Keyword is required",
        "Keyword field is empty or missing",
        "Please provide a keyword that describes the main subject.",
        400
      );
      return NextResponse.json(ErrorHandler.formatErrorForResponse(error), { status: 400 });
    }

    const uploadedImages = store.getUploadedImages();

    if (uploadedImages.size === 0) {
      const error = ErrorHandler.createError(
        ErrorCode.INVALID_INPUT,
        "No images uploaded",
        "The image store is empty",
        "Please upload images first before processing.",
        400
      );
      return NextResponse.json(ErrorHandler.formatErrorForResponse(error), { status: 400 });
    }

    // Clear previous logs before starting new run
    store.clearLogs();

    store.addLog("========================================");
    store.addLog("Starting new run...");
    store.addLog(`Provider: ${provider}`);
    store.addLog(`Model: ${modelName}`);
    store.addLog(`Target Base Model: ${checkpoint}`);
    store.addLog(`Found ${uploadedImages.size} images. Processing...`);

    const processedResults = [];
    let idx = 1;
    let successCount = 0;
    let errorCount = 0;

    for (const [filename, imageBuffer] of uploadedImages.entries()) {
      // Add delay to avoid rate limiting (2 seconds between requests)
      if (idx > 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      store.addLog(`Processing ${idx}/${uploadedImages.size}...`);

      try {
        let caption: string;

        if (provider === "gemini") {
          caption = await generateCaption(imageBuffer, {
            keyword,
            captionGuidance,
            checkpoint,
            negativeHints,
            captionLength,
            strictFocus,
          }, modelName);
        } else {
          caption = await generateCaptionOpenAI(imageBuffer, {
            keyword,
            captionGuidance,
            checkpoint,
            negativeHints,
            captionLength,
            strictFocus,
          }, provider, modelName);
        }

        const newFilename = `${prefix}_${idx.toString().padStart(5, "0")}.jpg`;
        processedResults.push({
          filename: newFilename,
          caption,
          imageData: imageBuffer,
        });

        // Check if caption indicates an error
        if (caption.includes("unavailable") || caption.includes("filtered") || caption.includes("rate limit")) {
          store.addLog(`⚠️ ${newFilename} -> ${caption}`);
          errorCount++;
        } else {
          store.addLog(`✓ ${newFilename} -> ${caption}`);
          successCount++;
        }
      } catch (error) {
        // Even if caption generation fails completely, still add the image
        const newFilename = `${prefix}_${idx.toString().padStart(5, "0")}.jpg`;
        const fallbackCaption = `${keyword}, processing failed`;

        processedResults.push({
          filename: newFilename,
          caption: fallbackCaption,
          imageData: imageBuffer,
        });

        store.addLog(`❌ ${newFilename} -> ${fallbackCaption}`);
        errorCount++;
      }

      idx++;
    }

    await store.setProcessedResults(processedResults);
    store.addLog("========================================");
    store.addLog(`✅ Processed: ${successCount} images`);
    if (errorCount > 0) {
      store.addLog(`⚠️ Warnings/Errors: ${errorCount} images`);
    }
    store.addLog("Click 'Download ZIP' to get your processed files.");

    return NextResponse.json({
      status: "done",
      count: processedResults.length,
    });
  } catch (error) {
    // Use centralized error handler for better error messages
    const appError = ErrorHandler.fromException(error, "Image processing");
    console.error(ErrorHandler.formatErrorForLog(appError, "POST /api/process"));

    // Log error for user visibility
    store.addLog(`❌ Processing failed: ${appError.message}`);
    if (appError.suggestion) {
      store.addLog(`💡 Suggestion: ${appError.suggestion}`);
    }

    return NextResponse.json(
      ErrorHandler.formatErrorForResponse(appError),
      { status: appError.statusCode }
    );
  }
}
