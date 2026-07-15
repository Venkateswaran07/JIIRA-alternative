# I-TRACK MERN

I-TRACK is a split MERN prototype for explainable sprint intelligence. The repo contains a React/Vite client and an Express/MongoDB API with JWT auth, deterministic risk calculations, seeded demo data, and server-side OpenAI-compatible Chat Completions integration.

## Features

- **Sprint Intelligence Dashboard**: Real-time evaluation of delivery risk, tracking blockers, and identifying at-risk sprints using deterministic risk calculations.
- **Automated SLA Tracking**: Tracks Service Level Agreements (SLAs) based on priority. Predicts likely breaches using velocity and provides warnings for SLA risks and critical breaches.
- **Hierarchy Progress**: Links tickets in parent-child relationships (e.g., Epics, Stories, Tasks). Tracks weighted completion progress using story points and auto-completes parent tickets when all children are done.
- **Team Compatibility & Workload**: Evaluates skill gaps by matching required ticket skills against developer skills, and monitors workload capacity to prevent burnout.
- **AI Integration**: Uses OpenAI-compatible endpoints to intelligently generate tickets and answer queries based on workspace context like SLAs and skill constraints.
- **Role-Based Access Control**: Secure JWT-based authentication distinguishing between admin, manager, engineer, and designer roles.

## Stack

- Client: React, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, React Flow, TanStack Query, Zustand, Framer Motion, Sonner.
- Server: Express, TypeScript, MongoDB/Mongoose, JWT, Zod, OpenAI JavaScript client.
- Palette: midnight navy, electric blue, cyan, and rose accents, with the prohibited hue family excluded from UI tokens.

## Setup

```powershell
npm run install:all
Copy-Item server\.env.local.example server\.env
Copy-Item client\.env.local.example client\.env.local
```

Update `server\.env` with a strong `JWT_SECRET`, your `MONGODB_URI`, and optional OpenAI-compatible provider values:

```env
OPENAI_API_KEY=ocz_your_api_key
OPENAI_BASE_URL=https://opencode.ai/zen/v1
OPENAI_MODEL=ask-me-before-selecting-a-model
```

Do not put API keys in the client env file.

## Run

Start MongoDB locally using the provided memory server script, then seed the demo data:

```powershell
# Open a new terminal and leave this running:
node run-mongo.js

# In your main terminal, seed the database:
npm run seed
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
