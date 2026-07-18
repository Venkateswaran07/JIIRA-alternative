import dotenv from "dotenv";

dotenv.config();

const withoutTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: withoutTrailingSlash(process.env.CLIENT_ORIGIN ?? "http://localhost:5173"),
  appUrl: withoutTrailingSlash(process.env.APP_URL ?? process.env.CLIENT_ORIGIN ?? "http://localhost:5173"),
  databaseUrl: process.env.DATABASE_URL,
  supabaseDatabaseUrl: process.env.SUPABASE_DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:4000/api/v1/auth/google/callback",
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: /^(1|true|yes)$/i.test(process.env.SMTP_SECURE ?? ""),
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER,
  smtpFromName: process.env.SMTP_FROM_NAME ?? "I-TRACK",
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://opencode.ai/zen/v1",
  openaiModel: process.env.OPENAI_MODEL,
  openaiChatModel: process.env.OPENAI_CHAT_MODEL ?? process.env.OPENAI_MODEL,
  attachmentStorageProvider: process.env.ATTACHMENT_STORAGE_PROVIDER ?? "local",
  attachmentStorageDir: process.env.ATTACHMENT_STORAGE_DIR ?? "uploads/attachments",
  attachmentPublicBaseUrl: process.env.ATTACHMENT_PUBLIC_BASE_URL,
  supabaseUrl: process.env.SUPABASE_URL?.replace(/\/+$/, ""),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  attachmentBucket: process.env.ATTACHMENT_BUCKET ?? "ticket-attachments",
  outboxWorkerSecret: process.env.OUTBOX_WORKER_SECRET,
  slaEmailEnabled: /^(1|true|yes)$/i.test(process.env.SLA_EMAIL_ENABLED ?? ""),
  s3Endpoint: process.env.S3_ENDPOINT,
  s3Region: process.env.S3_REGION ?? "auto",
  s3Bucket: process.env.S3_BUCKET,
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID,
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
};

export function assertRuntimeConfig() {
  if (env.nodeEnv !== "production") return;
  const missing: string[] = [];
  if (!env.databaseUrl && !env.supabaseDatabaseUrl) missing.push("DATABASE_URL or SUPABASE_DATABASE_URL");
  if (!process.env.JWT_SECRET || env.jwtSecret === "dev-only-change-me" || env.jwtSecret.length < 32) missing.push("JWT_SECRET (at least 32 characters)");
  if (!env.googleClientId) missing.push("GOOGLE_CLIENT_ID");
  if (!env.googleClientSecret) missing.push("GOOGLE_CLIENT_SECRET");
  if (!process.env.GOOGLE_REDIRECT_URI) missing.push("GOOGLE_REDIRECT_URI");
  if (env.attachmentStorageProvider !== "supabase") missing.push("ATTACHMENT_STORAGE_PROVIDER=supabase");
  if (!env.supabaseUrl) missing.push("SUPABASE_URL");
  if (!env.supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!env.attachmentBucket) missing.push("ATTACHMENT_BUCKET");
  if (!env.outboxWorkerSecret || env.outboxWorkerSecret.length < 32) missing.push("OUTBOX_WORKER_SECRET (at least 32 characters)");
  if (missing.length) throw new Error(`Missing required production configuration: ${missing.join(", ")}`);
}
