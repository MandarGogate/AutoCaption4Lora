// Centralized error handling with detailed error codes and messages

export enum ErrorCode {
  // API Key Errors
  API_KEY_MISSING = "API_KEY_MISSING",
  API_KEY_INVALID = "API_KEY_INVALID",
  API_KEY_PLACEHOLDER = "API_KEY_PLACEHOLDER",

  // Request Errors
  REQUEST_TIMEOUT = "REQUEST_TIMEOUT",
  NETWORK_ERROR = "NETWORK_ERROR",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Content Errors
  CONTENT_FILTERED = "CONTENT_FILTERED",
  INVALID_RESPONSE = "INVALID_RESPONSE",

  // Validation Errors
  INVALID_INPUT = "INVALID_INPUT",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  UNSUPPORTED_FILE_TYPE = "UNSUPPORTED_FILE_TYPE",
  TOO_MANY_FILES = "TOO_MANY_FILES",

  // Provider Errors
  PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE",
  MODEL_NOT_FOUND = "MODEL_NOT_FOUND",

  // Unknown Errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: string;
  suggestion?: string;
  statusCode: number;
}

export class ErrorHandler {
  static createError(
    code: ErrorCode,
    message: string,
    details?: string,
    suggestion?: string,
    statusCode: number = 500
  ): AppError {
    return {
      code,
      message,
      details,
      suggestion,
      statusCode,
    };
  }

  static fromException(error: unknown, context: string = ""): AppError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // API Key errors
    if (lowerMessage.includes("api key") || lowerMessage.includes("api_key")) {
      if (lowerMessage.includes("not set") || lowerMessage.includes("missing")) {
        return this.createError(
          ErrorCode.API_KEY_MISSING,
          "API key is not configured",
          errorMessage,
          "Please set the required API key in your .env file and restart the application.",
          500
        );
      }
      if (lowerMessage.includes("invalid") || lowerMessage.includes("unauthorized") || errorMessage.includes("401")) {
        return this.createError(
          ErrorCode.API_KEY_INVALID,
          "API key is invalid or unauthorized",
          errorMessage,
          "Please verify your API key is correct in the .env file.",
          401
        );
      }
      if (lowerMessage.includes("placeholder")) {
        return this.createError(
          ErrorCode.API_KEY_PLACEHOLDER,
          "API key is set to placeholder value",
          errorMessage,
          "Please update your .env file with your actual API key.",
          500
        );
      }
    }

    // Timeout errors
    if (
      lowerMessage.includes("timeout") ||
      lowerMessage.includes("timed out") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("ECONNABORTED")
    ) {
      return this.createError(
        ErrorCode.REQUEST_TIMEOUT,
        "Request timed out",
        `${context ? context + ": " : ""}The API request took too long to complete.`,
        "This may be due to network issues or high API load. Please try again.",
        504
      );
    }

    // Rate limit errors
    if (lowerMessage.includes("429") || lowerMessage.includes("rate limit")) {
      return this.createError(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        "Rate limit exceeded",
        errorMessage,
        "Please wait a few moments before trying again. Consider upgrading your API plan for higher limits.",
        429
      );
    }

    // Content filtering errors
    if (
      lowerMessage.includes("prohibited_content") ||
      lowerMessage.includes("safety") ||
      lowerMessage.includes("blocked") ||
      lowerMessage.includes("filtered")
    ) {
      return this.createError(
        ErrorCode.CONTENT_FILTERED,
        "Content was filtered by safety settings",
        errorMessage,
        "The image may contain content that violates the AI provider's safety policies. Try a different image.",
        400
      );
    }

    // Network errors
    if (
      lowerMessage.includes("network") ||
      lowerMessage.includes("enotfound") ||
      lowerMessage.includes("econnrefused") ||
      lowerMessage.includes("fetch failed")
    ) {
      return this.createError(
        ErrorCode.NETWORK_ERROR,
        "Network connection error",
        errorMessage,
        "Please check your internet connection and try again. If using a local provider, ensure it's running.",
        503
      );
    }

    // Provider unavailable
    if (lowerMessage.includes("503") || lowerMessage.includes("service unavailable")) {
      return this.createError(
        ErrorCode.PROVIDER_UNAVAILABLE,
        "AI provider is temporarily unavailable",
        errorMessage,
        "The AI service may be experiencing issues. Please try again later.",
        503
      );
    }

    // Model not found
    if (lowerMessage.includes("404") || lowerMessage.includes("model not found")) {
      return this.createError(
        ErrorCode.MODEL_NOT_FOUND,
        "Model not found",
        errorMessage,
        "The selected model may not be available. Please try a different model.",
        404
      );
    }

    // Default unknown error
    return this.createError(
      ErrorCode.UNKNOWN_ERROR,
      "An unexpected error occurred",
      errorMessage,
      context ? `Error in ${context}. Please try again or contact support if the issue persists.` : "Please try again or contact support if the issue persists.",
      500
    );
  }

  static formatErrorForResponse(error: AppError) {
    return {
      error: error.message,
      code: error.code,
      ...(error.details && { details: error.details }),
      ...(error.suggestion && { suggestion: error.suggestion }),
    };
  }

  static formatErrorForLog(error: AppError, context?: string): string {
    const parts = [
      context ? `[${context}]` : "",
      `Error ${error.code}:`,
      error.message,
      error.details ? `(${error.details})` : "",
    ];
    return parts.filter(Boolean).join(" ");
  }
}

// Timeout wrapper utility
export class TimeoutController {
  static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string = "Operation timed out"
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`TIMEOUT: ${errorMessage}`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutHandle!);
      return result;
    } catch (error) {
      clearTimeout(timeoutHandle!);
      throw error;
    }
  }

  static async withAbortSignal<T>(
    fetchFn: (signal: AbortSignal) => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await fetchFn(controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('TIMEOUT: Request aborted due to timeout');
      }
      throw error;
    }
  }
}
