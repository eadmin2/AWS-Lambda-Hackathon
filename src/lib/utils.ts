import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Helper function to merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date helper
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Format file size helper
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Function to validate file type
export function isValidFileType(file: File): boolean {
  const acceptedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
  ];
  return acceptedTypes.includes(file.type);
}

// Function to validate file size (max 10MB)
export function isValidFileSize(file: File): boolean {
  const maxSize = 10 * 1024 * 1024; // 10MB
  return file.size <= maxSize;
}

// Generate a random string (for naming files)
export function generateRandomString(length = 8): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

// Get file type from file name
export function getFileType(
  fileName: string,
): "image" | "pdf" | "text" | "other" {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) return "other";
  if (["jpg", "jpeg", "png", "gif", "tiff", "tif", "bmp", "webp"].includes(ext))
    return "image";
  if (ext === "pdf") return "pdf";
  if (ext === "txt") return "text";
  return "other";
}
