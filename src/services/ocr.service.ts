// src\services\ocr.service.ts
import { createWorker } from "tesseract.js";
import type { Worker as TesseractWorker } from "tesseract.js";

// keep a single shared worker instance (for speed)
let workerPromise: Promise<TesseractWorker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    // v5/v6: language is passed directly here
    workerPromise = createWorker("eng"); // no loadLanguage / initialize
  }
  return workerPromise;
}

export async function runOcrFromUrl(url: string): Promise<string> {
  const worker = await getWorker();

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image for OCR: ${res.status} ${res.statusText}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  const { data } = await worker.recognize(buffer);
  const rawText = data.text || "";

  const cleaned = rawText
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
}
