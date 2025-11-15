import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const uploadedImages = new Map<string, Buffer>();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const key = `image_${i.toString().padStart(5, "0")}_${file.name}`;
        uploadedImages.set(key, buffer);
      }
    }

    store.setUploadedImages(uploadedImages);
    store.addLog(`Uploaded ${uploadedImages.size} images`);

    return NextResponse.json({
      success: true,
      count: uploadedImages.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload images" },
      { status: 500 }
    );
  }
}
