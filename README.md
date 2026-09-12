# Vibework

Vibework is a Next.js workspace for turning application ideas into project specifications, creating learning roadmaps, and working with text-to-speech voices.

## Screenshots

Screenshots are optional until the files are added. Contributors can place them in `public/images/` using these paths:

![Vibework overview](public/images/overview.png)
![The Grill](public/images/grill.png)
![Project workspace](public/images/project-workspace.png)
![Learning roadmap](public/images/learn.png)
![Voice Studio](public/images/voice.png)

## Modules

### The Grill

The Grill is available at `/engine`. It guides an architecture interview through five phases:

1. Vision and target users
2. Core features and MVP scope
3. Main user flow
4. UI/UX and design direction
5. Technical constraints and the operating or business model

The workflow saves a local project. Its workspace can contain an interactive application tree, a PRD, an ADR, `AGENTS.md`, a database schema and API contract, atomic prompts, and a Markdown specification export. Interview sessions and project artifacts are stored in SQLite.

### Learning roadmap

Learning roadmaps are available at `/learn`. Enter a topic, familiarity level, learning goals, and an optional focus area to generate a staged roadmap. Each roadmap includes prerequisite-based nodes, micro-lesson content, progress status, and quizzes. Saved roadmaps can be reopened or deleted.

### Voice Studio

Voice Studio is available at `/voice`. It combines browser device voices and provider voices in one interface. Provider voices can be created by:

- enrolling an authorized voice sample for cloning;
- designing an original voice with voice attributes and additional instructions.

Text can be played with a device voice or synthesized as audio through Alibaba Model Studio Qwen TTS. Generated audio can be replayed and downloaded. Provider requests are made by server-side route handlers, while device voices remain available without provider credentials.

## Prerequisites

- Node.js and npm.
- `ffmpeg` and `ffprobe` on the server when enrolling a voice sample.
- A reachable OpenAI-compatible AI gateway for AI-powered features.
- Alibaba Model Studio and Alibaba OSS credentials for provider voice cloning or design.

## Installation and configuration

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the credentials you need. Do not commit `.env.local` or secret values.

   ```bash
   cp .env.example .env.local
   ```

   In PowerShell, use `Copy-Item .env.example .env.local` instead.

   The available variables are:

   ```dotenv
   # OpenAI-compatible text gateway
   OPENAI_BASE_URL=http://localhost:20128/v1
   AI_API_KEY=
   AI_MODEL_NAME=alims-intl/qwen3.5-flash(high)
   CHAT_MODEL_NAME=alims-intl/qwen3.5-flash(none)
   WORKFLOW_MODEL_NAME=alims-intl/qwen3.5-flash(none)
   # Generic AI calls are clamped by the shared generation helper to 10–45 seconds.
   # Schema generation uses a separate bounded 70-second policy (max 2560 tokens).
   AI_GENERATION_TIMEOUT_MS=180000

   # Alibaba Model Studio voice provider
   DASHSCOPE_API_KEY=
   DASHSCOPE_WORKSPACE_ID=
   DASHSCOPE_REGION=ap-southeast-1

   # Temporary voice-enrollment uploads
   ALIYUN_OSS_REGION=oss-ap-southeast-1
   ALIYUN_OSS_BUCKET=
   ALIYUN_OSS_ACCESS_KEY_ID=
   ALIYUN_OSS_ACCESS_KEY_SECRET=
   ```

3. Apply the local SQLite schema before using features that persist data:

   ```bash
   npm run db:push
   ```

## Development

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Validation

The validation scripts defined in `package.json` are:

```bash
npm run lint
npm run typecheck
npm test
```

## Production

Build and start the production server:

```bash
npm run build
npm start
```

The `start` script runs Next.js on port `20130`.

## Technical notes

- The application uses Next.js App Router, React, TypeScript, route handlers, Drizzle ORM, and SQLite through `better-sqlite3`.
- The local database is stored as `vibework.db` in the project root. Use `npm run db:push` to synchronize its schema.
- Chat, roadmap, and project-specification generation call `${OPENAI_BASE_URL}/chat/completions`. AI generation requires a reachable OpenAI-compatible gateway and a model supported by that gateway.
- Voice Studio uses Alibaba Model Studio for provider voice operations and OSS for temporary enrollment uploads. Incomplete provider configuration disables provider cloning and design, but does not remove browser device voices.
