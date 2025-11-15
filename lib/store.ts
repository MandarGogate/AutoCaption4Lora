// Filesystem-based store for uploaded images and processed results
import fs from "fs";
import path from "path";

interface ProcessedResult {
  filename: string;
  caption: string;
  imageData: Buffer;
}

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const PROCESSED_DIR = path.join(process.cwd(), "processed");
const LOGS_FILE = path.join(process.cwd(), "logs.txt");

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(PROCESSED_DIR)) {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}

// Helper function to validate paths and prevent directory traversal
function validatePath(baseDir: string, filename: string): string {
  const safePath = path.join(baseDir, path.basename(filename));
  const resolvedPath = path.resolve(safePath);
  const resolvedBaseDir = path.resolve(baseDir);

  if (!resolvedPath.startsWith(resolvedBaseDir)) {
    throw new Error("Invalid file path: directory traversal detected");
  }

  return safePath;
}

class Store {
  private lockPromise: Promise<void> | null = null;

  // Atomic lock mechanism to prevent race conditions
  private async acquireLock(): Promise<() => void> {
    // Wait for any existing lock to be released
    while (this.lockPromise !== null) {
      await this.lockPromise;
    }

    // Create a new lock promise
    let releaseLock: () => void;
    this.lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    // Return the release function
    return () => {
      this.lockPromise = null;
      releaseLock!();
    };
  }
  async setUploadedImages(images: Map<string, Buffer>): Promise<void> {
    const release = await this.acquireLock();
    try {
      // Clear old uploads
      const files = fs.readdirSync(UPLOAD_DIR);
      files.forEach((file) => {
        const safePath = validatePath(UPLOAD_DIR, file);
        fs.unlinkSync(safePath);
      });

      // Save new uploads
      for (const [filename, buffer] of images.entries()) {
        const safePath = validatePath(UPLOAD_DIR, filename);
        fs.writeFileSync(safePath, buffer);
      }
    } finally {
      release();
    }
  }

  getUploadedImages(): Map<string, Buffer> {
    const images = new Map<string, Buffer>();
    const files = fs.readdirSync(UPLOAD_DIR);

    for (const filename of files) {
      const safePath = validatePath(UPLOAD_DIR, filename);
      const buffer = fs.readFileSync(safePath);
      images.set(filename, buffer);
    }

    return images;
  }

  async setProcessedResults(results: ProcessedResult[]): Promise<void> {
    const release = await this.acquireLock();
    try {
      // Clear old processed files
      const files = fs.readdirSync(PROCESSED_DIR);
      files.forEach((file) => {
        const safePath = validatePath(PROCESSED_DIR, file);
        fs.unlinkSync(safePath);
      });

      // Save new processed results
      for (const result of results) {
        const imagePathSafe = validatePath(PROCESSED_DIR, result.filename);
        const txtFilename = result.filename.replace(/\.[^.]+$/, ".txt");
        const txtPathSafe = validatePath(PROCESSED_DIR, txtFilename);

        fs.writeFileSync(imagePathSafe, result.imageData);
        fs.writeFileSync(txtPathSafe, result.caption);
      }
    } finally {
      release();
    }
  }

  getProcessedResults(): ProcessedResult[] {
    const results: ProcessedResult[] = [];
    const files = fs.readdirSync(PROCESSED_DIR);
    const imageFiles = files.filter((f) => f.match(/\.(jpg|jpeg|png|webp)$/i));

    for (const imageFile of imageFiles) {
      const txtFile = imageFile.replace(/\.[^.]+$/, ".txt");
      const imagePathSafe = validatePath(PROCESSED_DIR, imageFile);
      const txtPathSafe = validatePath(PROCESSED_DIR, txtFile);

      const imageData = fs.readFileSync(imagePathSafe);
      const caption = fs.existsSync(txtPathSafe)
        ? fs.readFileSync(txtPathSafe, "utf-8")
        : "";

      results.push({
        filename: imageFile,
        caption,
        imageData,
      });
    }

    return results;
  }

  addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();

    // Sanitize message to prevent log injection
    // Remove control characters, newlines, and carriage returns
    const sanitizedMessage = message
      .replace(/[\r\n\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim()
      .substring(0, 1000); // Limit length to prevent log bloat

    const logLine = `[${timestamp}] ${sanitizedMessage}\n`;

    if (!fs.existsSync(LOGS_FILE)) {
      fs.writeFileSync(LOGS_FILE, logLine);
    } else {
      fs.appendFileSync(LOGS_FILE, logLine);
    }
  }

  getLogs(): string {
    if (!fs.existsSync(LOGS_FILE)) {
      return "";
    }
    return fs.readFileSync(LOGS_FILE, "utf-8");
  }

  clearLogs() {
    if (fs.existsSync(LOGS_FILE)) {
      fs.unlinkSync(LOGS_FILE);
    }
  }

  // Cleanup old files (useful for preventing disk space issues)
  async cleanupOldFiles(maxAgeDays: number = 7): Promise<void> {
    const release = await this.acquireLock();
    try {
      const now = Date.now();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

      // Clean upload directory
      const uploadFiles = fs.readdirSync(UPLOAD_DIR);
      uploadFiles.forEach((file) => {
        const safePath = validatePath(UPLOAD_DIR, file);
        const stats = fs.statSync(safePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(safePath);
        }
      });

      // Clean processed directory
      const processedFiles = fs.readdirSync(PROCESSED_DIR);
      processedFiles.forEach((file) => {
        const safePath = validatePath(PROCESSED_DIR, file);
        const stats = fs.statSync(safePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(safePath);
        }
      });

      // Clean old logs if they exist and are old
      if (fs.existsSync(LOGS_FILE)) {
        const stats = fs.statSync(LOGS_FILE);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(LOGS_FILE);
        }
      }
    } finally {
      release();
    }
  }

  // Clear all files immediately (for manual cleanup)
  async clearAll(): Promise<void> {
    const release = await this.acquireLock();
    try {
      // Clear uploads
      const uploadFiles = fs.readdirSync(UPLOAD_DIR);
      uploadFiles.forEach((file) => {
        const safePath = validatePath(UPLOAD_DIR, file);
        fs.unlinkSync(safePath);
      });

      // Clear processed
      const processedFiles = fs.readdirSync(PROCESSED_DIR);
      processedFiles.forEach((file) => {
        const safePath = validatePath(PROCESSED_DIR, file);
        fs.unlinkSync(safePath);
      });

      // Clear logs
      if (fs.existsSync(LOGS_FILE)) {
        fs.unlinkSync(LOGS_FILE);
      }
    } finally {
      release();
    }
  }
}

export const store = new Store();
export type { ProcessedResult };
