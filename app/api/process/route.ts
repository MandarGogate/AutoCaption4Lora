import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { generateCaption } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const geminiModel = formData.get("geminiModel") as string || "gemini-1.5-flash-latest";
    const trainingGoal = formData.get("trainingGoal") as string;
    const prefix = formData.get("prefix") as string;
    const keyword = formData.get("keyword") as string;
    const checkpoint = formData.get("checkpoint") as string;
    const captionGuidance = formData.get("captionGuidance") as string || "";
    const guidanceStrength = parseFloat(formData.get("guidanceStrength") as string);
    const negativeHints = formData.get("negativeHints") as string || "";
    const captionLength = formData.get("captionLength") as string;
    const negativePreset = formData.get("negativePreset") as string;
    const strictFocus = formData.get("strictFocus") === "true";

    const uploadedImages = store.getUploadedImages();

    if (uploadedImages.size === 0) {
      return NextResponse.json({ error: "No images uploaded" }, { status: 400 });
    }

    // Clear previous logs before starting new run
    store.clearLogs();

    store.addLog("========================================");
    store.addLog("Starting new run...");
    store.addLog(`Gemini Model: ${geminiModel}`);
    store.addLog(`Use case: ${trainingGoal}`);
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
        const caption = await generateCaption(imageBuffer, {
          keyword,
          captionGuidance,
          checkpoint,
          guidanceStrength,
          negativeHints,
          captionLength,
          strictFocus,
        }, geminiModel);

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

    store.setProcessedResults(processedResults);
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
    console.error("Processing error:", error);
    store.addLog(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    return NextResponse.json(
      { error: "Failed to process images" },
      { status: 500 }
    );
  }
}
