// Environment variable validation and configuration

interface EnvConfig {
  geminiApiKey?: string;
  openaiApiKey?: string;
  openrouterApiKey?: string;
  togetherApiKey?: string;
  groqApiKey?: string;
  ollamaBaseUrl?: string;
}

class ConfigValidator {
  private config: EnvConfig;
  private warnings: string[] = [];
  private errors: string[] = [];

  constructor() {
    this.config = this.loadConfig();
    this.validate();
  }

  private loadConfig(): EnvConfig {
    return {
      geminiApiKey: process.env.GEMINI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      openrouterApiKey: process.env.OPENROUTER_API_KEY,
      togetherApiKey: process.env.TOGETHER_API_KEY,
      groqApiKey: process.env.GROQ_API_KEY,
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
    };
  }

  private validate(): void {
    // Check if at least one provider is configured
    const hasAnyProvider =
      this.config.geminiApiKey ||
      this.config.openaiApiKey ||
      this.config.openrouterApiKey ||
      this.config.togetherApiKey ||
      this.config.groqApiKey ||
      this.config.ollamaBaseUrl;

    if (!hasAnyProvider) {
      this.errors.push(
        "No AI provider configured! Please set at least one API key in your .env file."
      );
    }

    // Check for placeholder values
    const placeholderKeys = [
      { key: this.config.geminiApiKey, name: 'GEMINI_API_KEY', placeholder: 'your_gemini_api_key_here' },
      { key: this.config.openaiApiKey, name: 'OPENAI_API_KEY', placeholder: 'your_openai_api_key_here' },
      { key: this.config.openrouterApiKey, name: 'OPENROUTER_API_KEY', placeholder: 'your_openrouter_api_key_here' },
      { key: this.config.togetherApiKey, name: 'TOGETHER_API_KEY', placeholder: 'your_together_api_key_here' },
      { key: this.config.groqApiKey, name: 'GROQ_API_KEY', placeholder: 'your_groq_api_key_here' },
    ];

    placeholderKeys.forEach(({ key, name, placeholder }) => {
      if (key === placeholder) {
        this.warnings.push(
          `${name} is set to placeholder value. Please update with your actual API key.`
        );
      }
    });

    // Validate API key formats (basic validation)
    if (this.config.geminiApiKey && !this.config.geminiApiKey.startsWith('AI')) {
      this.warnings.push(
        "GEMINI_API_KEY format looks incorrect. Gemini keys typically start with 'AI'."
      );
    }

    if (this.config.openaiApiKey && !this.config.openaiApiKey.startsWith('sk-')) {
      this.warnings.push(
        "OPENAI_API_KEY format looks incorrect. OpenAI keys typically start with 'sk-'."
      );
    }
  }

  getConfig(): EnvConfig {
    return this.config;
  }

  getWarnings(): string[] {
    return this.warnings;
  }

  getErrors(): string[] {
    return this.errors;
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  printStatus(): void {
    console.log("\n=== AutoCaption4Lora Configuration ===\n");

    // Print configured providers
    const configuredProviders = [];
    if (this.config.geminiApiKey && this.config.geminiApiKey !== 'your_gemini_api_key_here') {
      configuredProviders.push("✓ Google Gemini");
    }
    if (this.config.openaiApiKey && this.config.openaiApiKey !== 'your_openai_api_key_here') {
      configuredProviders.push("✓ OpenAI");
    }
    if (this.config.openrouterApiKey && this.config.openrouterApiKey !== 'your_openrouter_api_key_here') {
      configuredProviders.push("✓ OpenRouter");
    }
    if (this.config.togetherApiKey && this.config.togetherApiKey !== 'your_together_api_key_here') {
      configuredProviders.push("✓ Together AI");
    }
    if (this.config.groqApiKey && this.config.groqApiKey !== 'your_groq_api_key_here') {
      configuredProviders.push("✓ Groq");
    }
    if (this.config.ollamaBaseUrl) {
      configuredProviders.push("✓ Ollama (Local)");
    }

    if (configuredProviders.length > 0) {
      console.log("Configured Providers:");
      configuredProviders.forEach(provider => console.log(`  ${provider}`));
      console.log();
    }

    // Print errors
    if (this.errors.length > 0) {
      console.error("❌ ERRORS:");
      this.errors.forEach(error => console.error(`  ${error}`));
      console.log();
    }

    // Print warnings
    if (this.warnings.length > 0) {
      console.warn("⚠️  WARNINGS:");
      this.warnings.forEach(warning => console.warn(`  ${warning}`));
      console.log();
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log("✅ Configuration looks good!\n");
    }

    console.log("=====================================\n");
  }
}

// Create and export singleton instance
export const configValidator = new ConfigValidator();

// Print status when the module is imported (useful for startup)
if (process.env.NODE_ENV !== 'production') {
  configValidator.printStatus();
}

export default configValidator;
