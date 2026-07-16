# I-TRACK

I-TRACK is a split React/Express prototype for explainable sprint intelligence. PostgreSQL is the target database, with a local Docker instance for schema validation and Supabase for the hosted environment.

## Stack

- Client: React, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, React Flow, TanStack Query, Zustand, Framer Motion, Sonner.
- Server: Express, TypeScript, PostgreSQL/Supabase, JWT, Zod, OpenAI JavaScript client.
- Palette: midnight navy, electric blue, cyan, and rose accents, with the prohibited hue family excluded from UI tokens.

## Setup

```powershell
npm run install:all
Copy-Item server\.env.local.example server\.env
Copy-Item client\.env.local.example client\.env.local
```

Update `server\.env` with a strong `JWT_SECRET`, your Supabase Session Pooler `DATABASE_URL`, and optional OpenAI-compatible provider values:

```env
OPENAI_API_KEY=ocz_your_api_key
OPENAI_BASE_URL=https://opencode.ai/zen/v1
OPENAI_MODEL=ask-me-before-selecting-a-model
```

Do not put API keys in the client env file.

## Run

Start PostgreSQL locally and apply the schema:

```powershell
docker compose -f docker-compose.postgres.yml up -d
cd server
npm run db:local:schema
```

Run the API and client concurrently in a single terminal:

```powershell
npm start
```

Or run them in separate terminals if preferred:

```powershell
npm run dev:server
npm run dev:client
```

Open `http://localhost:5173` and sign in with:

- Email: `maya@itrack.dev`
- Password: `Password123!`

## Test And Verify

```powershell
npm run typecheck
npm run build
```

Useful API checks:

```powershell
Invoke-RestMethod http://localhost:4000/api/health
```

AI ticket generation requires choosing a real provider model first. The backend exposes `GET /api/ai/models` for model inspection and `POST /api/ai/generate-tickets` for validated JSON generation.

For an external LLM or agent integration, follow [LLM_BACKEND_API_GUIDE.md](./LLM_BACKEND_API_GUIDE.md). The complete endpoint catalog remains in [api.md](./api.md).
# I-Track
