import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const modelName = searchParams.get("model") || "gemini-1.5-flash-latest";

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json({
        success: false,
        error: "Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.",
      });
    }

    // Test the API with a simple request
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent("Say 'API is working' in one sentence.");
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      success: true,
      message: `API connection successful with ${modelName}! Response: ${text}`,
    });
  } catch (error: any) {
    console.error("API test error:", error);

    let errorMessage = "Unknown error occurred";

    if (error.message?.includes("API_KEY_INVALID")) {
      errorMessage = "Invalid API key. Please check your GEMINI_API_KEY in the .env file.";
    } else if (error.message?.includes("429")) {
      errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    });
  }
}
