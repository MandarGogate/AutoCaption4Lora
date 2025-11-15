import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import archiver from "archiver";
import { Readable } from "stream";

export async function GET() {
  try {
    const processedResults = store.getProcessedResults();

    if (processedResults.length === 0) {
      return NextResponse.json(
        { error: "No processed images available" },
        { status: 400 }
      );
    }

    // Create a ZIP archive
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    // Create a promise that resolves when archive is done
    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];

      archive.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      archive.on("error", (err) => {
        reject(err);
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
    });

    // Return the ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=lora_dataset.zip",
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to create download" },
      { status: 500 }
    );
  }
}
