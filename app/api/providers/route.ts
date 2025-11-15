import { NextResponse } from "next/server";
import { LLM_PROVIDERS } from "@/lib/providers";

export async function GET() {
  try {
    // Build list of available providers
    const availableProviders = [];

    for (const [id, config] of Object.entries(LLM_PROVIDERS)) {
      // Check if API key is available (if required)
      const apiKey = config.requiresApiKey ? process.env[config.envVar] : true;
      const isAvailable = !!apiKey;

      availableProviders.push({
        id: config.id,
        name: config.name,
        requiresApiKey: config.requiresApiKey,
        isAvailable,
        models: config.models,
      });
    }

    // Fetch Gemini models dynamically if available
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`
        );

        if (response.ok) {
          const data = await response.json();
          const visionModels = data.models
            ?.filter((model: any) =>
              model.supportedGenerationMethods?.includes("generateContent")
            )
            .map((model: any) => model.name.replace("models/", ""));

          // Update Gemini provider with fetched models
          const geminiProvider = availableProviders.find(p => p.id === "gemini");
          if (geminiProvider && visionModels?.length > 0) {
            geminiProvider.models = visionModels;
          }
        }
      } catch (error) {
        console.error("Failed to fetch Gemini models:", error);
      }
    }

    return NextResponse.json({ providers: availableProviders });
  } catch (error) {
    console.error("Error fetching providers:", error);
    return NextResponse.json(
      { error: "Failed to fetch providers" },
      { status: 500 }
    );
  }
}
