import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";

export type AttachmentStorage = {
  put: (key: string, data: Buffer, mimeType: string) => Promise<void>;
  get: (key: string) => Promise<{ body: AsyncIterable<Uint8Array>; contentType?: string } | null>;
  remove: (key: string) => Promise<void>;
  createSignedUploadUrl?: (key: string) => Promise<{ path: string; token: string; signedUrl: string }>;
  createSignedUrl?: (key: string, expiresInSeconds: number) => Promise<string>;
};

function localPath(key: string) {
  return path.resolve(process.cwd(), env.attachmentStorageDir, key);
}

const localStorage: AttachmentStorage = {
  async put(key, data) { const target = localPath(key); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, data); },
  async get(key) { try { const data = await fs.readFile(localPath(key)); return { body: (async function* () { yield data; })() }; } catch { return null; } },
  async remove(key) { await fs.rm(localPath(key), { force: true }); },
};

function s3Storage(): AttachmentStorage {
  if (!env.s3Bucket || !env.s3AccessKeyId || !env.s3SecretAccessKey) throw new Error("S3 attachment storage is not configured");
  const client = new S3Client({ region: env.s3Region, endpoint: env.s3Endpoint, forcePathStyle: Boolean(env.s3Endpoint), credentials: { accessKeyId: env.s3AccessKeyId, secretAccessKey: env.s3SecretAccessKey } });
  return {
    async put(key, data, mimeType) { await client.send(new PutObjectCommand({ Bucket: env.s3Bucket, Key: key, Body: data, ContentType: mimeType })); },
    async get(key) { const result = await client.send(new GetObjectCommand({ Bucket: env.s3Bucket, Key: key })); return result.Body ? { body: result.Body as AsyncIterable<Uint8Array>, contentType: result.ContentType } : null; },
    async remove(key) { await client.send(new DeleteObjectCommand({ Bucket: env.s3Bucket, Key: key })); },
  };
}

function supabaseStorage(): AttachmentStorage {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) throw new Error("Supabase attachment storage is not configured");
  const client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const bucket = client.storage.from(env.attachmentBucket);
  return {
    async put(key, data, mimeType) {
      const result = await bucket.upload(key, data, { contentType: mimeType, upsert: false });
      if (result.error) throw result.error;
    },
    async get(key) {
      const signed = await bucket.createSignedUrl(key, 300);
      if (signed.error || !signed.data?.signedUrl) return null;
      const response = await fetch(signed.data.signedUrl);
      if (!response.ok) return null;
      const data = Buffer.from(await response.arrayBuffer());
      return { body: (async function* () { yield data; })(), contentType: response.headers.get("content-type") || undefined };
    },
    async remove(key) {
      const result = await bucket.remove([key]);
      if (result.error) throw result.error;
    },
    async createSignedUploadUrl(key) {
      const result = await bucket.createSignedUploadUrl(key);
      if (result.error || !result.data) throw result.error || new Error("Unable to create signed upload URL");
      return { path: result.data.path, token: result.data.token, signedUrl: result.data.signedUrl };
    },
    async createSignedUrl(key, expiresInSeconds) {
      const result = await bucket.createSignedUrl(key, expiresInSeconds);
      if (result.error || !result.data?.signedUrl) throw result.error || new Error("Unable to create signed download URL");
      return result.data.signedUrl;
    },
  };
}

export function attachmentStorage() {
  if (env.attachmentStorageProvider === "supabase") return supabaseStorage();
  return env.attachmentStorageProvider === "s3" ? s3Storage() : localStorage;
}
