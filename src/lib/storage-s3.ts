import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

let client: S3Client | null | undefined;

export function isS3Enabled() {
  return process.env.STORAGE_DRIVER === "s3";
}

function prefixedKey(key: string) {
  const prefix = process.env.S3_PREFIX?.replace(/^\/+|\/+$/g, "");
  return prefix ? `${prefix}/${key}` : key;
}

function bucketName() {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is required when STORAGE_DRIVER=s3.");
  return bucket;
}

function getClient(): S3Client {
  if (client) return client;

  const region = process.env.S3_REGION;
  if (!region) throw new Error("S3_REGION is required when STORAGE_DRIVER=s3.");

  client = new S3Client({
    region,
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials:
      process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
  return client;
}

export async function s3PutObject(key: string, buffer: Buffer, contentType?: string) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucketName(),
      Key: prefixedKey(key),
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

export async function s3DeleteObject(key: string) {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucketName(), Key: prefixedKey(key) }),
  );
}

export async function s3GetObject(key: string): Promise<Buffer> {
  const result = await getClient().send(
    new GetObjectCommand({ Bucket: bucketName(), Key: prefixedKey(key) }),
  );
  if (!result.Body) throw new Error("Empty S3 object body.");
  const bytes = await result.Body.transformToByteArray();
  return Buffer.from(bytes);
}
