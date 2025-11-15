import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json({
        error: "Gemini API key is not configured",
        models: [],
      });
    }

    // Fetch models directly from REST API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();

    // Filter for models that support generateContent (vision/multimodal models)
    const visionModels = data.models
      ?.filter((model: any) =>
        model.supportedGenerationMethods?.includes("generateContent") &&
        model.name
      )
      .map((model: any) => ({
        name: model.name?.replace("models/", "") || "",
        displayName: model.displayName || model.name?.replace("models/", "") || "",
        description: model.description || "Multimodal AI model",
        inputTokenLimit: model.inputTokenLimit || 0,
        outputTokenLimit: model.outputTokenLimit || 0,
      }))
      .sort((a: any, b: any) => {
        // Sort: flash models first, then pro, then others
        if (a.name.includes("flash") && !b.name.includes("flash")) return -1;
        if (!a.name.includes("flash") && b.name.includes("flash")) return 1;
        if (a.name.includes("pro") && !b.name.includes("pro")) return -1;
        if (!a.name.includes("pro") && b.name.includes("pro")) return 1;
        return a.name.localeCompare(b.name);
      }) || [];

    return NextResponse.json({
      models: visionModels,
      count: visionModels.length,
    });
  } catch (error: any) {
    console.error("Error fetching models:", error);
    return NextResponse.json({
      error: error.message || "Failed to fetch models",
      models: [],
    });
  }
}
