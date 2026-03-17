# CLAUDE.md — WWI (Where Was I?)

## Overview

macOS CLI tool that scans AI coding agent sessions and displays their status with intent synthesis. Phase 0 validation — proving "Intent Synthesis" is valuable before building a GUI app.

## Commands

```bash
bun run src/main.ts status             # One-shot snapshot
bun run src/main.ts status --show-stale # Include stale sessions (>2h)
bun run src/main.ts status --no-intent # Skip intent synthesis
bun run src/main.ts watch              # Persistent TUI (main use case)
bun run typecheck                      # TypeScript check (skipLibCheck due to @google/genai gaxios issue)
```

## Tech Stack

- **Runtime**: Bun (not Node)
- **Language**: TypeScript (strict, ESNext, bundler moduleResolution)
- **Dependencies**: commander, chalk, @google/genai
- **Intent Model**: gemini-3-flash-preview via Google GenAI SDK

## Architecture

```
src/
├── scanner/      # Session discovery across Claude Code / Codex / Gemini CLI
├── intent/       # Gemini API intent synthesis + context extraction
├── tui/          # Renderer (box-drawing) + watch loop (ANSI clear+redraw)
└── utils/        # Time formatting
```

## Key Conventions

- **No comments in code** unless explicitly asked
- **Bun APIs preferred**: `Bun.file().slice()` for partial reads, `Bun.hash()` for hashing, `Bun.stripANSI()` for ANSI stripping
- **Session file formats are unstable** — agent-tail (~/code/agent-tail) is the reference for Claude/Codex/Gemini JSONL/JSON parsing patterns
- **Gemini sessions are full JSON** (not JSONL) — must read entire file, never truncate with readTail
- **JSONL sessions** (Claude, Codex) — use `readTail()` with `Bun.file().slice()` for efficiency

## Gotchas

- `@google/genai` has a gaxios type conflict with Bun — `skipLibCheck: true` in tsconfig
- Claude session scanner must check `~/.claude/projects` exists before globbing (not all machines have it)
- `Bun.stripANSI` is capitalized as `Bun.stripANSI()` (not `stripAnsi`)
- Intent engine needs `GEMINI_API_KEY` or `GOOGLE_API_KEY` env var; falls back to last user message without it

## Reference Project

`~/code/agent-tail` — CLI tool that monitors AI agent session logs. WWI references its glob patterns and JSONL format knowledge but does not depend on it directly.
