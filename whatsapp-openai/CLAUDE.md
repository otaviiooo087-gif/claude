# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

WhatsApp AI assistant + real-time web dashboard. A Node.js backend connects to WhatsApp via
the unofficial **Baileys** library, answers messages with **Claude** (Anthropic API), and streams
everything to a **React** dashboard over **Socket.io**. The explicit goal is to be *visually
impressive on screen* (built to be recorded for a video), so the dashboard polish matters.

**Language is JavaScript (ESM), not TypeScript.** Backend uses `"type": "module"`; client is JSX.

## Commands

Run from the repo root:

| Command | What it does |
|---|---|
| `npm run install:all` | Install deps in root, `server/`, and `client/` |
| `npm run dev` | Run backend (`:3001`) **and** client (`:5173`) together via `concurrently` |
| `npm run dev:server` / `npm run dev:client` | Run just one side |
| `npm run build` | Build the client to `client/dist` |
| `npm start` | Production: backend serves the built client + API on `:3001` |

There is **no test suite or linter configured** — don't suggest `npm test`/`npm run lint`; they don't exist.

Requires **Node 20+** (Vite 8). Copy `.env.example` → `.env` before running; the app reads the
`.env` at the **repo root** (resolved via `import.meta.url`, not cwd — see `server/src/config.js`).

## Architecture — the big picture

**One pipeline, two sources.** Both real WhatsApp messages and demo messages flow through the
*same* function: `engine.handleInbound()` in `server/src/engine.js`. It persists the inbound
message, emits Socket.io events, asks the AI for a reply (with a deliberate typing delay so the
"digitando…" indicator is visible), persists + emits the reply, and — for real (non-demo)
messages — sends it back through WhatsApp. When changing message behavior, change it here once;
`whatsapp.js` and `demo.js` are only *producers* that call `handleInbound`.

**Wiring lives in `server/src/index.js`** and avoids circular imports: it creates the Socket.io
server, builds the engine with `wa: { sendText, sendPresence }` (from `whatsapp.js`), builds the
demo simulator with `handleInbound`, and starts WhatsApp passing `onInbound`/`onQR`/`onConnectionUpdate`
callbacks. `runtime` holds the live connection/QR/demo state and is re-sent to every newly
connected client via the `bootstrap` event.

**Socket.io is the contract between server and client.** Server → client events:
`bootstrap` (full snapshot), `wa:connection` `{status, me}`, `wa:qr` `{dataUrl}`,
`conversation` (upsert), `message` `{conversationId, message}`, `typing` `{conversationId, on}`,
`stats`, `demo` `{on}`. Client → server: `demo:toggle`. If you add a feature, it almost always
means a new event on both sides: emit in the engine/index, handle it in
`client/src/hooks/useDashboard.js`.

**Client state is centralized** in `useDashboard.js` (a `useReducer` fed by socket events).
Components are presentational and receive `state`/`actions` as props. Conversations and messages
are stored as maps keyed by conversation id; `selectedId` drives the chat panel.

**AI context memory** (`server/src/ai.js`): each reply is generated from the conversation's own
history — inbound messages map to `role: "user"`, outbound to `role: "assistant"` — sliced to
`config.historyLimit` and sent to `messages.create`. This is what gives the bot per-contact memory.

## Conventions & gotchas

- **Model id**: default `claude-sonnet-4-6` (user's choice), overridable via `ANTHROPIC_MODEL`.
  `claude-haiku-4-5` is the documented fast/cheap alternative. The AI call is kept plain (no
  `thinking`/`effort`/`output_config`) on purpose, so it stays valid across both models — Haiku 4.5
  rejects the `effort` parameter. Keep it plain unless you special-case per model.
- **No API key is OK**: `ai.js` falls back to canned replies and logs a warning, so the app (and
  demo mode) runs without `ANTHROPIC_API_KEY`. Don't make the key load-bearing for startup.
- **Express 5**: the SPA fallback uses `app.use((req,res)=>…)`, *not* `app.get('*', …)` —
  path-to-regexp v8 rejects a bare `'*'`. Keep new catch-all routes in that form.
- **Dev networking**: the client talks to the backend through Vite's proxy (`/api`, `/socket.io`
  → `:3001`), so it's same-origin in the browser. Changing ports means updating `client/vite.config.js`.
- **Persistence** is debounced JSON writes in `store.js` (`server/data/store.json`). Stats are
  always recomputed from messages (`stats.js`), never stored.
- **Secrets / session**: `server/auth_info/` (WhatsApp credentials) and `server/data/` are
  git-ignored. Deleting `auth_info/` forces a fresh QR login.
- **Demo vs real**: demo messages carry `isDemo: true` so the engine skips the actual WhatsApp
  send. Groups (`@g.us`) and `status@broadcast` are ignored on the WhatsApp side.
