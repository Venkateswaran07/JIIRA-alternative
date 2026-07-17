import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  appUrl: process.env.APP_URL ?? process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL,
  supabaseDatabaseUrl: process.env.SUPABASE_DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
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
};
