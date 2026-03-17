# CLAUDE.md — WWI (Where Was I?)

## Overview

macOS CLI tool that scans AI coding agent sessions and displays their status with intent synthesis. Phase 0 validation — proving "Intent Synthesis" is valuable before building a GUI app.

## Commands

```bash
bun run src/main.ts status             # One-shot snapshot
bun run src/main.ts status --show-stale # Include stale sessions (>2h)
bun run src/main.ts status --no-intent # Skip intent synthesis
bun run src/main.ts status --debug     # Show debug output (API timing, adapter selection)
bun run src/main.ts watch              # Persistent TUI (main use case)
bun run typecheck                      # TypeScript check (skipLibCheck due to @google/genai gaxios issue)
```

### Watch Mode Keys

- `q` / `Ctrl-C` — quit
- `s` — toggle stale sessions
- `a` — toggle expand all (adaptive height truncates by default)

## Tech Stack

- **Runtime**: Bun (not Node)
- **Language**: TypeScript (strict, ESNext, bundler moduleResolution)
- **Dependencies**: commander, chalk, @google/genai, openai
- **Intent Model**: Multi-adapter — Gemini (`gemini-2.5-flash-lite`) or OpenAI (`gpt-4.1-mini`), auto-detected by env var

## Architecture

```
src/
├── scanner/      # Session discovery across Claude Code / Codex / Gemini CLI
├── intent/       # LLM adapter pattern (Gemini/OpenAI) + intent synthesis + context extraction
├── tui/          # Renderer (box-drawing) + watch loop (ANSI clear+redraw)
└── utils/        # Time formatting, CJK-aware string width
```

## Key Conventions

- **No comments in code** unless explicitly asked
- **Bun APIs preferred**: `Bun.file().slice()` for partial reads, `Bun.hash()` for hashing, `Bun.stripANSI()` for ANSI stripping
- **Session file formats are unstable** — agent-tail (~/code/agent-tail) is the reference for Claude/Codex/Gemini JSONL/JSON parsing patterns
- **Gemini sessions are full JSON** (not JSONL) — must read entire file, never truncate with readTail
- **JSONL sessions** (Claude, Codex) — use `readTail()` with `Bun.file().slice()` for efficiency
- **All sessions display independently** — no per-group merging; each session gets a 7-char `sessionId` shown in TUI
- **Session ID length** governed by `SESSION_ID_LENGTH` in `types.ts` — scanner and renderer both reference this single constant

## Gotchas

- `@google/genai` has a gaxios type conflict with Bun — `skipLibCheck: true` in tsconfig
- Claude session scanner must check `~/.claude/projects` exists before globbing (not all machines have it)
- `Bun.stripANSI` is capitalized as `Bun.stripANSI()` (not `stripAnsi`)
- Intent engine auto-detects adapter: `GEMINI_API_KEY`/`GOOGLE_API_KEY` → Gemini, `OPENAI_API_KEY` → OpenAI (priority: Gemini first); falls back to last user message without any key. Set `WWI_PROVIDER=openai` or `WWI_PROVIDER=gemini` to override auto-detection
- `IntentEngine` constructor takes options object: `new IntentEngine({ adapter?, debug? })`
- `IntentEngine.destroy()` is async — must be awaited before `process.exit()` to flush disk cache
- Intent cache persists to `/tmp/wwi-intent-cache.json` with debounced writes (5s coalesce)
- Codex `session_meta` first line can be 15KB+ (contains full system prompt) — `Bun.file().slice()` buffer must be ≥32KB to parse it
- Codex UUIDs are v7 (timestamp prefix) — session ID must be extracted from the **last** UUID segment to avoid collisions between nearby sessions

## Reference Project

`~/code/agent-tail` — CLI tool that monitors AI agent session logs. WWI references its glob patterns and JSONL format knowledge but does not depend on it directly.
