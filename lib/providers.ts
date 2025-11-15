// LLM Provider configurations and integrations
import { ErrorHandler, TimeoutController } from "./errors";

// Configuration constants
const API_TIMEOUT_MS = 30000; // 30 seconds per request

export interface LLMProvider {
  id: string;
  name: string;
  requiresApiKey: boolean;
  envVar: string;
  baseUrl?: string;
  models: string[];
}

export const LLM_PROVIDERS: Record<string, LLMProvider> = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    requiresApiKey: true,
    envVar: "GEMINI_API_KEY",
    models: [], // Fetched dynamically
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    requiresApiKey: true,
    envVar: "OPENAI_API_KEY",
    baseUrl: "https://api.openai.com/v1",
    models: [
      "gpt-4-vision-preview",
      "gpt-4-turbo",
      "gpt-4o",
      "gpt-4o-mini",
    ],
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    requiresApiKey: true,
    envVar: "OPENROUTER_API_KEY",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      "anthropic/claude-3.5-sonnet",
      "anthropic/claude-3-opus",
      "openai/gpt-4-vision-preview",
      "google/gemini-pro-vision",
      "meta-llama/llama-3.2-90b-vision",
    ],
  },
  together: {
    id: "together",
    name: "Together AI",
    requiresApiKey: true,
    envVar: "TOGETHER_API_KEY",
    baseUrl: "https://api.together.xyz/v1",
    models: [
      "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
      "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo",
    ],
  },
  groq: {
    id: "groq",
    name: "Groq",
    requiresApiKey: true,
    envVar: "GROQ_API_KEY",
    baseUrl: "https://api.groq.com/openai/v1",
    models: [
      "llama-3.2-90b-vision-preview",
      "llama-3.2-11b-vision-preview",
    ],
  },
  ollama: {
    id: "ollama",
    name: "Ollama (Local)",
    requiresApiKey: false,
    envVar: "OLLAMA_BASE_URL",
    baseUrl: "http://localhost:11434/v1",
    models: [
      "llava:latest",
      "llava:13b",
      "llava:34b",
      "bakllava:latest",
    ],
  },
};

interface CaptionOptions {
  keyword: string;
  captionGuidance: string;
  checkpoint: string;
  negativeHints: string;
  captionLength: string;
  strictFocus: boolean;
}

export async function generateCaptionOpenAI(
  imageBuffer: Buffer,
  options: CaptionOptions,
  provider: string,
  modelName: string
): Promise<string> {
  const providerConfig = LLM_PROVIDERS[provider];
  if (!providerConfig) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const apiKey = process.env[providerConfig.envVar];
  if (providerConfig.requiresApiKey && !apiKey) {
    throw new Error(`${providerConfig.envVar} is not set`);
  }

  // Build the prompt
  const promptParts: string[] = [];

  if (options.captionGuidance) {
    promptParts.push(options.captionGuidance);
  } else {
    promptParts.push("Describe this image in detail for training a LoRA model.");
  }

  const lengthMap: Record<string, string> = {
    Short: "Keep the description concise (1-2 sentences).",
    Medium: "Provide a moderate description (2-4 sentences).",
    Long: "Provide a detailed, comprehensive description.",
  };
  promptParts.push(lengthMap[options.captionLength] || lengthMap.Medium);

  if (options.negativeHints) {
    promptParts.push(`Avoid mentioning: ${options.negativeHints}`);
  }

  if (options.strictFocus) {
    promptParts.push("Focus only on the main subject, ignoring background details.");
  }

  const prompt = promptParts.join(" ");

  // Convert buffer to base64
  const imageBase64 = imageBuffer.toString("base64");
  const mimeType = "image/jpeg"; // Assume JPEG, could be detected

  try {
    // Use timeout wrapper with AbortSignal for fetch requests
    const response = await TimeoutController.withAbortSignal(
      async (signal) => {
        return fetch(`${providerConfig.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            ...(provider === "openrouter" && {
              "HTTP-Referer": "https://github.com/MandarGogate/AutoCaption4Lora",
              "X-Title": "AutoCaption4Lora",
            }),
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${imageBase64}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 300,
          }),
          signal,
        });
      },
      API_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rawDesc = data.choices[0]?.message?.content?.trim() || "";

    if (!rawDesc) {
      throw new Error("Empty response from API");
    }

    // Build final caption with keyword
    return buildCaption(
      options.keyword,
      rawDesc,
      options.checkpoint,
      options.negativeHints
    );
  } catch (error: any) {
    // Use centralized error handler for better error messages
    const appError = ErrorHandler.fromException(error, `${providerConfig.name} API`);
    console.error(ErrorHandler.formatErrorForLog(appError, "generateCaptionOpenAI"));

    // Return user-friendly error caption
    if (appError.code === "RATE_LIMIT_EXCEEDED") {
      return `${options.keyword}, rate limit exceeded, please retry`;
    } else if (appError.code === "REQUEST_TIMEOUT") {
      return `${options.keyword}, request timed out after ${API_TIMEOUT_MS / 1000}s`;
    } else if (appError.code === "NETWORK_ERROR") {
      return `${options.keyword}, network error, check connection`;
    } else if (appError.code === "API_KEY_INVALID") {
      return `${options.keyword}, API key invalid or unauthorized`;
    } else if (appError.code === "API_KEY_MISSING") {
      return `${options.keyword}, API key not configured`;
    } else if (appError.code === "CONTENT_FILTERED") {
      return `${options.keyword}, content filtered by safety settings`;
    } else if (appError.code === "PROVIDER_UNAVAILABLE") {
      return `${options.keyword}, provider temporarily unavailable`;
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
  return `${coreSubject}, ${desc}${neg}`.trim();
}
