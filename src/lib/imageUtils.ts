import {
  ref,
  uploadBytesResumable,
  type UploadTask,
} from "firebase/storage";

/** Race a promise against a timeout. Rejects with a descriptive message. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms),
    ),
  ]);
}

/**
 * Client-side image compression via Canvas.
 * Uses aggressive settings (600px max, 0.65 quality) to keep compressed output
 * well under 100 KB so uploads complete quickly even on slow mobile connections.
 * Wrapped with a hard 10 s timeout — canvas.toBlob() silently never fires on
 * some mobile WebKit builds for certain image sizes/formats.
 */
export function compressImage(file: File, maxDim = 600, quality = 0.65): Promise<Blob> {
  const inner = new Promise<Blob>((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to compress image"));
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });
  return withTimeout(inner, 10_000, "Image processing");
}

/**
 * Upload a blob to Firebase Storage using the resumable protocol.
 * Uses an activity-based timeout: the upload is only cancelled when no progress
 * has been made for `stallMs` (default 20 s). This prevents killing slow-but-
 * working uploads while still catching genuine stalls.
 * Returns the UploadTask so the caller can cancel it.
 */
export function uploadWithProgress(
  storageRef: ReturnType<typeof ref>,
  data: Blob,
  onProgress: (pct: number) => void,
  onStall: () => void,
  stallMs = 20_000,
): { task: UploadTask; promise: Promise<void> } {
  const task = uploadBytesResumable(storageRef, data, { contentType: "image/jpeg" });
  let stallTimer: ReturnType<typeof setTimeout>;

  const resetStallTimer = () => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      task.cancel();
      onStall();
    }, stallMs);
  };

  const promise = new Promise<void>((resolve, reject) => {
    resetStallTimer();
    task.on(
      "state_changed",
      (snap) => {
        resetStallTimer();
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress(pct);
      },
      (err) => {
        clearTimeout(stallTimer);
        reject(err);
      },
      () => {
        clearTimeout(stallTimer);
        resolve();
      },
    );
  });

  return { task, promise };
}
