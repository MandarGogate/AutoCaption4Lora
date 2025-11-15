import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import path from "path";
import { ErrorHandler, ErrorCode } from "@/lib/errors";
import { rateLimit, RateLimitPresets } from "@/lib/rate-limit";

// Security limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES = 100; // Maximum 100 files per batch
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, RateLimitPresets.MODERATE);
  if (rateLimitResult) return rateLimitResult;

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      const error = ErrorHandler.createError(
        ErrorCode.INVALID_INPUT,
        "No files uploaded",
        "The upload request contains no files",
        "Please select at least one image file to upload.",
        400
      );
      return NextResponse.json(ErrorHandler.formatErrorForResponse(error), { status: 400 });
    }

    // Validate file count
    if (files.length > MAX_FILES) {
      const error = ErrorHandler.createError(
        ErrorCode.TOO_MANY_FILES,
        "Too many files uploaded",
        `Maximum ${MAX_FILES} files allowed per batch, got ${files.length}`,
        `Please reduce the number of files to ${MAX_FILES} or less and upload in batches.`,
        400
      );
      return NextResponse.json(ErrorHandler.formatErrorForResponse(error), { status: 400 });
    }

    const uploadedImages = new Map<string, Buffer>();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!file.type.startsWith("image/")) {
        continue; // Skip non-image files
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        const error = ErrorHandler.createError(
          ErrorCode.FILE_TOO_LARGE,
          "File is too large",
          `File "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(2)}MB, maximum is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          `Please compress or resize "${file.name}" to be under ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
          400
        );
        return NextResponse.json(ErrorHandler.formatErrorForResponse(error), { status: 400 });
      }

      // Validate file extension
      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        const error = ErrorHandler.createError(
          ErrorCode.UNSUPPORTED_FILE_TYPE,
          "Unsupported file type",
          `File "${file.name}" has extension "${ext}", which is not supported`,
          `Please use only these formats: ${ALLOWED_EXTENSIONS.join(', ')}`,
          400
        );
        return NextResponse.json(ErrorHandler.formatErrorForResponse(error), { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      // Use sanitized original filename, handle duplicates with counter
      const sanitizedName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');

      // Handle duplicate filenames by adding a counter
      let key = sanitizedName;
      let counter = 1;
      while (uploadedImages.has(key)) {
        const ext = path.extname(sanitizedName);
        const nameWithoutExt = path.basename(sanitizedName, ext);
        key = `${nameWithoutExt}_${counter}${ext}`;
        counter++;
      }

      uploadedImages.set(key, buffer);
    }

    if (uploadedImages.size === 0) {
      const error = ErrorHandler.createError(
        ErrorCode.INVALID_INPUT,
        "No valid image files found",
        "All uploaded files were either non-images or in unsupported formats",
        `Please upload valid image files in these formats: ${ALLOWED_EXTENSIONS.join(', ')}`,
        400
      );
      return NextResponse.json(ErrorHandler.formatErrorForResponse(error), { status: 400 });
    }

    await store.setUploadedImages(uploadedImages);
    store.addLog(`Uploaded ${uploadedImages.size} images`);

    return NextResponse.json({
      success: true,
      count: uploadedImages.size,
    });
  } catch (error) {
    // Use centralized error handler for better error messages
    const appError = ErrorHandler.fromException(error, "File upload");
    console.error(ErrorHandler.formatErrorForLog(appError, "POST /api/upload"));

    return NextResponse.json(
      ErrorHandler.formatErrorForResponse(appError),
      { status: appError.statusCode }
    );
  }
}
