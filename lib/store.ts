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

class Store {
  setUploadedImages(images: Map<string, Buffer>) {
    // Clear old uploads
    const files = fs.readdirSync(UPLOAD_DIR);
    files.forEach((file) => {
      fs.unlinkSync(path.join(UPLOAD_DIR, file));
    });

    // Save new uploads
    for (const [filename, buffer] of images.entries()) {
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
    }
  }

  getUploadedImages(): Map<string, Buffer> {
    const images = new Map<string, Buffer>();
    const files = fs.readdirSync(UPLOAD_DIR);

    for (const filename of files) {
      const buffer = fs.readFileSync(path.join(UPLOAD_DIR, filename));
      images.set(filename, buffer);
    }

    return images;
  }

  setProcessedResults(results: ProcessedResult[]) {
    // Clear old processed files
    const files = fs.readdirSync(PROCESSED_DIR);
    files.forEach((file) => {
      fs.unlinkSync(path.join(PROCESSED_DIR, file));
    });

    // Save new processed results
    for (const result of results) {
      fs.writeFileSync(
        path.join(PROCESSED_DIR, result.filename),
        result.imageData
      );
      fs.writeFileSync(
        path.join(PROCESSED_DIR, result.filename.replace(/\.[^.]+$/, ".txt")),
        result.caption
      );
    }
  }

  getProcessedResults(): ProcessedResult[] {
    const results: ProcessedResult[] = [];
    const files = fs.readdirSync(PROCESSED_DIR);
    const imageFiles = files.filter((f) => f.match(/\.(jpg|jpeg|png|webp)$/i));

    for (const imageFile of imageFiles) {
      const txtFile = imageFile.replace(/\.[^.]+$/, ".txt");
      const imageData = fs.readFileSync(path.join(PROCESSED_DIR, imageFile));
      const caption = fs.existsSync(path.join(PROCESSED_DIR, txtFile))
        ? fs.readFileSync(path.join(PROCESSED_DIR, txtFile), "utf-8")
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
    const logLine = `[${timestamp}] ${message}\n`;

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
}

export const store = new Store();
export type { ProcessedResult };
