# WWI（Where Was I?）

> [English version](./README.md)

一個 CLI 工具，用來掃描 AI 程式碼代理（coding agent）的工作階段，並透過 LLM 自動產生意圖摘要。當你同時使用多個 AI 代理在不同專案之間切換時，WWI 能快速告訴你每個代理正在做什麼。

## 功能簡介

WWI 會掃描三種 AI 程式碼代理的工作階段檔案：

- **Claude Code** — 讀取 `~/.claude/projects/`
- **Codex** — 讀取 `~/.codex/sessions/`
- **Gemini CLI** — 讀取 `~/.gemini/tmp/`

針對每個活躍的工作階段，WWI 會顯示：
- 哪個代理正在執行、屬於哪個專案
- 工作階段的活躍程度（🟢 活躍 < 20 分鐘、🟡 近期 < 2 小時、⚪ 閒置 > 2 小時）
- 由 LLM 產生的一行意圖摘要（這個代理正在做什麼）

## 前置需求

- [Bun](https://bun.sh/) >= 1.0.0
- 至少一組 LLM 提供者的 API 金鑰：
  - **Gemini**（預設）：設定 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`
  - **OpenAI**：設定 `OPENAI_API_KEY`

## 安裝

```bash
git clone <repo-url>
cd where-was-i
bun install
```

若要將 `wwi` 註冊為全域指令：

```bash
bun link
```

完成後，可以在任何位置直接執行：

```bash
wwi status
wwi watch
```

## 使用方式

### 一次性狀態快照

```bash
bun run src/main.ts status
```

掃描所有代理工作階段、透過 LLM 合成意圖，然後在終端機印出快照。

### Watch 模式（主要使用方式）

```bash
bun run src/main.ts watch
```

持續更新的終端機介面，每 2 秒重新整理。鍵盤快捷鍵：

| 按鍵 | 功能 |
|---|---|
| `q` / `Ctrl-C` | 離開 |
| `s` | 切換顯示閒置工作階段 |
| `a` | 切換全部展開（覆蓋自適應高度） |

### CLI 選項

| 選項 | 說明 | 預設值 |
|---|---|---|
| `--show-stale` | 顯示閒置的工作階段（超過 2 小時） | `false` |
| `--no-intent` | 跳過 LLM 意圖合成 | 啟用意圖 |
| `--debug` | 顯示除錯資訊（API 計時、adapter 選擇） | `false` |
| `-p, --provider <name>` | LLM 提供者：`gemini` 或 `openai` | `gemini` |
| `-m, --model <name>` | 覆寫模型名稱 | Gemini: `gemini-3.1-flash-lite-preview`、OpenAI: `gpt-4.1-mini` |

### 範例

```bash
# 使用 OpenAI 替代 Gemini
bun run src/main.ts status -p openai

# Watch 模式搭配指定模型
bun run src/main.ts watch -m gemini-2.5-flash

# 快速查看狀態，不呼叫 LLM
bun run src/main.ts status --no-intent

# 顯示所有工作階段，包含閒置的
bun run src/main.ts status --show-stale
```

## 專案結構

```
src/
├── main.ts              # CLI 進入點（commander）
├── scanner/             # 工作階段掃描
│   ├── session-scanner.ts  # 掃描 Claude/Codex/Gemini 的工作階段檔案
│   ├── project-name.ts     # 從工作階段資料中萃取專案名稱
│   └── types.ts            # AgentSession 型別、活躍度門檻
├── intent/              # LLM 意圖合成
│   ├── intent-engine.ts    # 防抖請求、快取、速率限制
│   ├── adapter.ts          # LLM adapter 介面 + 工廠函數
│   ├── gemini-adapter.ts   # Gemini 提供者
│   ├── openai-adapter.ts   # OpenAI 提供者
│   ├── context-extractor.ts # 讀取工作階段檔案，萃取對話上下文
│   └── prompt-template.ts  # 建構 LLM prompt，含 XML 跳脫處理
├── tui/                 # 終端機介面
│   ├── renderer.ts         # 方框繪製排版、CJK 寬度處理
│   └── watch-loop.ts       # Watch 迴圈 + 一次性狀態指令
└── utils/               # 共用工具
    ├── time.ts             # 相對時間格式化
    └── string-width.ts     # CJK 字元寬度計算 + 自動換行

tests/                   # Bun 測試（結構對應 src/）
```

## 開發

```bash
bun test          # 執行測試
bun run typecheck # TypeScript 型別檢查
bun run lint      # Biome 程式碼檢查
bun run lint:fix  # 自動修正檢查問題
```

## 運作原理

1. **掃描** — scanner 透過 glob 搜尋各代理已知目錄中的工作階段檔案，過濾掉超過 24 小時的工作階段，並從工作階段資料中萃取專案名稱。

2. **萃取上下文** — 針對每個活躍的工作階段，context extractor 讀取工作階段檔案的尾端（Claude/Codex 使用 JSONL 格式，Gemini 使用完整 JSON），提取出近期的使用者訊息、助理訊息和工具呼叫。

3. **合成意圖** — 將萃取的上下文送入 LLM prompt，請求產生一行摘要來描述代理目前的工作內容。結果會快取到磁碟（`/tmp/wwi-intent-cache.json`），並使用防抖機制避免過多的 API 呼叫。

4. **渲染** — TUI 繪製帶邊框的方框，每張代理卡片以顏色區分，顯示專案名稱、工作階段 ID、活躍狀態和意圖摘要。

## 授權

MIT
