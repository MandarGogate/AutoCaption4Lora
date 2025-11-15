import { GoogleGenerativeAI } from "@google/generative-ai";
import { configValidator } from "./config";
import { ErrorHandler, TimeoutController } from "./errors";

// Configuration constants
const API_TIMEOUT_MS = 30000; // 30 seconds per request

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY environment variable is not set");
  console.error("Please check your .env file and ensure GEMINI_API_KEY is configured.");
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

if (apiKey === "your_gemini_api_key_here") {
  console.error("GEMINI_API_KEY is set to placeholder value");
  console.error("Please update your .env file with your actual Gemini API key.");
  throw new Error("GEMINI_API_KEY is not properly configured");
}

const genAI = new GoogleGenerativeAI(apiKey);

interface CaptionOptions {
  keyword: string;
  captionGuidance: string;
  checkpoint: string;
  negativeHints: string;
  captionLength: string;
  strictFocus: boolean;
}

export async function generateCaption(
  imageBuffer: Buffer,
  options: CaptionOptions,
  modelName: string = "gemini-1.5-flash-latest"
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });

    // Build the prompt based on options
    const promptParts: string[] = [];

    if (options.captionGuidance) {
      promptParts.push(options.captionGuidance);
    } else {
      promptParts.push("Describe this image in detail for training a LoRA model.");
    }

    // Add length guidance
    const lengthMap: Record<string, string> = {
      Short: "Keep the description concise (1-2 sentences).",
      Medium: "Provide a moderate description (2-4 sentences).",
      Long: "Provide a detailed, comprehensive description.",
    };
    promptParts.push(lengthMap[options.captionLength] || lengthMap.Medium);

    // Add negative hints
    if (options.negativeHints) {
      promptParts.push(`Avoid mentioning: ${options.negativeHints}`);
    }

    // Add strict focus instruction
    if (options.strictFocus) {
      promptParts.push("Focus only on the main subject, ignoring background details.");
    }

    const prompt = promptParts.join(" ");

    // Convert buffer to base64
    const imageBase64 = imageBuffer.toString("base64");

    // Wrap the API call with timeout protection
    const result = await TimeoutController.withTimeout(
      model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64,
          },
        },
      ]),
      API_TIMEOUT_MS,
      `Gemini API request for model ${modelName}`
    );

    const response = await result.response;

    // Handle safety/content blocks
    let rawDesc = "";
    try {
      rawDesc = response.text().trim();
    } catch (textError: any) {
      // If text is blocked due to safety filters
      if (textError.message?.includes("PROHIBITED_CONTENT") ||
          textError.message?.includes("SAFETY") ||
          textError.message?.includes("blocked")) {
        console.warn("Content blocked by safety filters, using fallback description");
        rawDesc = "A detailed image suitable for LoRA training";
      } else {
        throw textError;
      }
    }

    // Build final caption with keyword
    const finalCaption = buildCaption(
      options.keyword,
      rawDesc,
      options.checkpoint,
      options.negativeHints
    );

    return finalCaption;
  } catch (error: any) {
    // Use centralized error handler for better error messages
    const appError = ErrorHandler.fromException(error, "Gemini API");
    console.error(ErrorHandler.formatErrorForLog(appError, "generateCaption"));

    // Return user-friendly error caption
    if (appError.code === "CONTENT_FILTERED") {
      return `${options.keyword}, content filtered by safety settings`;
    } else if (appError.code === "RATE_LIMIT_EXCEEDED") {
      return `${options.keyword}, rate limit exceeded, please retry`;
    } else if (appError.code === "REQUEST_TIMEOUT") {
      return `${options.keyword}, request timed out after ${API_TIMEOUT_MS / 1000}s`;
    } else if (appError.code === "NETWORK_ERROR") {
      return `${options.keyword}, network error, check connection`;
    } else if (appError.code === "API_KEY_INVALID") {
      return `${options.keyword}, API key invalid or unauthorized`;
    }

    return `${options.keyword}, image description unavailable`;
  }
}

function buildCaption(
  keyword: string,
  rawDesc: string,
  checkpoint: string,
  negativeHints: string = ""
): string {
  const coreSubject = keyword.trim();

  // Ensure raw_desc is sentence-like
  let desc = rawDesc.trim().replace(/[,;]+$/, "");
  if (desc && !desc.match(/[.!?]$/)) {
    desc += ".";
  }

  // Build negative prompt
  let neg = "";
  if (negativeHints) {
    neg = ` (neg: ${negativeHints})`;
  }

  // Format based on checkpoint
  if (checkpoint === "WAN-2.2") {
    return `${coreSubject}, ${desc}${neg}`.trim();
  } else if (checkpoint === "SDXL") {
    return `${coreSubject}, ${desc}${neg}`.trim();
  } else if (checkpoint === "FLUX") {
    return `${coreSubject}, ${desc}${neg}`.trim();
  } else {
    // Default format
    return `${coreSubject}, ${desc}${neg}`.trim();
  }
}
