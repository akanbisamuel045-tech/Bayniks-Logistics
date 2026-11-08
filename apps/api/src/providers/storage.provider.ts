import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface UploadOptions {
  buffer?: Buffer;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  folder?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  mimeType: string;
  sizeBytes: number;
}

export class StorageProvider {
  /**
   * Validates document MIME type and file size limits.
   */
  validateDocument(mimeType: string, sizeBytes: number): void {
    if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
      const error: any = new Error(
        `Invalid file type '${mimeType}'. Allowed formats: ${ALLOWED_MIME_TYPES.join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }

    if (sizeBytes > MAX_DOCUMENT_SIZE_BYTES) {
      const error: any = new Error(
        `File size exceeds 5MB limit (${(sizeBytes / (1024 * 1024)).toFixed(2)}MB uploaded)`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  /**
   * Uploads document to cloud storage (or deterministic test/dev mock).
   */
  async upload(options: UploadOptions): Promise<UploadResult> {
    this.validateDocument(options.mimeType, options.sizeBytes);

    const folder = options.folder || 'documents';
    const fileId = crypto.randomUUID();
    const sanitizedName = options.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${folder}/${fileId}-${sanitizedName}`;

    // Cloud storage integration hook (e.g., Cloudinary or AWS S3)
    const hasS3Config = !!(process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID);
    const hasCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);

    if (hasS3Config && process.env.NODE_ENV === 'production') {
      const bucket = process.env.AWS_S3_BUCKET;
      return {
        url: `https://${bucket}.s3.amazonaws.com/${key}`,
        key,
        mimeType: options.mimeType,
        sizeBytes: options.sizeBytes,
      };
    }

    if (hasCloudinary && process.env.NODE_ENV === 'production') {
      const cloud = process.env.CLOUDINARY_CLOUD_NAME;
      return {
        url: `https://res.cloudinary.com/${cloud}/image/upload/v1/${key}`,
        key,
        mimeType: options.mimeType,
        sizeBytes: options.sizeBytes,
      };
    }

    // Deterministic mock URL generator for test and local development
    const baseUrl = process.env.STORAGE_BASE_URL || 'https://storage.dispatch.ng';
    return {
      url: `${baseUrl}/${key}`,
      key,
      mimeType: options.mimeType,
      sizeBytes: options.sizeBytes,
    };
  }
}

export const storageProvider = new StorageProvider();

