import crypto from "node:crypto";
import { env } from "../config/env.js";

export const hashSha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

export const randomBase64UrlToken = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("base64url");

function secretKey() {
  return crypto.createHash("sha256").update(env.jwtSecret).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(value: string) {
  const [ivText, tagText, encryptedText] = value.split(".");
  if (!ivText || !tagText || !encryptedText) throw new Error("Invalid encrypted secret");
  const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8");
}
