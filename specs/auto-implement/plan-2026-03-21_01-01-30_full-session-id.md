# Plan: Add fullSessionId to AgentSession

## Overview

Currently, the number-key copy feature in watch mode copies the truncated 7-char `sessionId`. Users need the **full** session identifier. Add a `fullSessionId` field to `AgentSession` that stores the complete identifier extracted from the filename, while keeping `sessionId` for TUI display.

## Full Session ID Definition Per Agent

| Agent | Filename pattern | fullSessionId | Example |
|-------|-----------------|---------------|---------|
| Claude | `{UUID}.jsonl` | Full UUID | `abc12345-1234-1234-1234-123456789abc` |
| Codex | `rollout-{UUID}.jsonl` | Full UUID (stem without `rollout-` prefix) | `01969eaf-1234-7abc-9def-123456789abc` |
| Gemini | `session-{ID}.json` | Full stem without `.json` | `session-1234abcd-5678-efgh-9012-ijkl34567890` |

The short `sessionId` is still derived from the last segment of the identifier to avoid collisions (as per existing convention).

## Implementation Steps

### 1. Add `fullSessionId` to types (`src/scanner/types.ts`)

- Add `fullSessionId: string` to `AgentSession` interface (after `sessionId`)

### 2. Refactor session ID extraction (`src/scanner/session-scanner.ts`)

- Rename `extractSessionId` → `extractFullSessionId` — returns the **complete** identifier:
  - Claude: `filename.replace('.jsonl', '')` → full UUID
  - Codex: `filename.replace('rollout-', '').replace('.jsonl', '')` → full UUID (the `stem`)
  - Gemini: `filename.replace('.json', '')` → full session name (the `stem`)
- Add `fullSessionId: string` to `RawSession` interface, rename `sessionId` → `fullSessionId`
- In each scan function, store `fullSessionId: extractFullSessionId(agentType, file)`
- Add a new exported `deriveShortId(agentType, fullId)` function:
  - Claude: `fullId.slice(0, SESSION_ID_LENGTH)` — first 7 of UUID
  - Codex: `const lastDash = fullId.lastIndexOf('-'); return lastDash >= 0 ? fullId.slice(lastDash + 1, lastDash + 1 + SESSION_ID_LENGTH) : fullId.slice(0, SESSION_ID_LENGTH)` — preserves collision-avoidance with fallback
  - Gemini: same pattern as Codex
- Export both `extractFullSessionId` and `deriveShortId` for direct unit testing
- In `scanAllSessions()` mapping, derive both:
  - `fullSessionId: raw.fullSessionId`
  - `sessionId: deriveShortId(raw.agentType, raw.fullSessionId)`

### 3. Update `buildResumeCommand` (`src/tui/resume-command.ts`)

- Change return from `session.sessionId` → `session.fullSessionId`

### 4. Update all test factories (4 files)

All `makeSession` factories must include `fullSessionId`:
- `tests/tui/resume-command.test.ts`
- `tests/tui/renderer.test.ts`
- `tests/intent/context-extractor.test.ts`
- `tests/intent/intent-engine.test.ts`

### 5. No changes needed in:

- `renderer.ts` — still uses `session.sessionId` for TUI display (7-char)
- `watch-loop.ts` — already calls `buildResumeCommand(session)`, gets updated value automatically
- Intent engine / context extractor — don't use sessionId for logic

## Trade-offs & Decisions

- **Full stem vs last segment**: `fullSessionId` stores the complete stem (full UUID for Claude/Codex, full session name for Gemini). Short `sessionId` derived via `deriveShortId` preserves existing collision-avoidance logic.
- **`statusMessage` length**: With a full UUID (~36 chars), `Copied: {id}` grows to ~44 chars. Acceptable for v1 — narrow terminal handling already exists.
- **`fullSessionId` is required (not optional)**: All scan functions extract from filename which always has the full ID. No edge case where it's missing.

## Tests (TDD — RED phase specifications)

### Test 1: Export and test `extractFullSessionId` (`tests/scanner/session-id.test.ts` — new file)

- **Claude**: `extractFullSessionId('claude', '/path/abc12345-1234-1234-1234-123456789abc.jsonl')` → `'abc12345-1234-1234-1234-123456789abc'`
- **Codex**: `extractFullSessionId('codex', '/path/rollout-01969eaf-1234-7abc-9def-123456789abc.jsonl')` → `'01969eaf-1234-7abc-9def-123456789abc'`
- **Gemini**: `extractFullSessionId('gemini', '/path/session-1234abcd-5678-efgh-9012-ijkl34567890.json')` → `'session-1234abcd-5678-efgh-9012-ijkl34567890'`

### Test 2: Export and test `deriveShortId` (`tests/scanner/session-id.test.ts`)

- **Claude**: `deriveShortId('claude', 'abc12345-1234-1234-1234-123456789abc')` → `'abc1234'`
- **Codex**: `deriveShortId('codex', '01969eaf-1234-7abc-9def-123456789abc')` → `'1234567'` (last segment first 7)
- **Gemini**: `deriveShortId('gemini', 'session-1234abcd-5678-efgh-9012-ijkl34567890')` → `'ijkl345'` (last segment first 7)

### Test 3: Update `resume-command.test.ts`

- Each existing test case adds `fullSessionId` to `makeSession`
- Verify `buildResumeCommand` returns the full ID (not the short one)

### Test 4: Update remaining 3 test factories

- Add `fullSessionId` with consistent defaults so TypeScript compiles

## Critical Files for Implementation

- `src/scanner/types.ts` - AgentSession interface definition
- `src/scanner/session-scanner.ts` - extractSessionId → extractFullSessionId + deriveShortId
- `src/tui/resume-command.ts` - buildResumeCommand returns copied value
- `tests/scanner/session-id.test.ts` - NEW: unit tests for extraction functions
- `tests/tui/resume-command.test.ts` - update existing tests + makeSession factory
- `tests/tui/renderer.test.ts` - add fullSessionId to makeSession (default: `'abc12345-1234-1234-1234-123456789abc'`)
- `tests/intent/context-extractor.test.ts` - add fullSessionId to makeSession (default: `'test1230-0000-0000-0000-000000000000'`)
- `tests/intent/intent-engine.test.ts` - add fullSessionId to makeSession (default: `id + '-0000-0000-0000-000000000000'`)
