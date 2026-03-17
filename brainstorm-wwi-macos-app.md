# WWI (Where Was I?) — 腦力激盪整合報告

> 日期：2026-03-17
> 團隊：product-designer, tech-architect, market-researcher, devils-advocate

---

## 核心洞察

四方觀點整合後，最關鍵的結論：

1. **Intent Synthesis 是唯一真正的差異化**——市場上 10+ 競品都在做監控，沒人做「意圖精煉」
2. **但 Intent 品質是生死線**——品質差等於沒有差異化，品質好才有護城河
3. **MVP 必須先驗證 Intent，再包 GUI**——先做 CLI 驗證，別急著寫 App
4. **賽道擁擠且變化快**——速度是唯一護城河，6 個月後 IDE 可能內建類似功能

---

## 競爭定位

### 市場現況（2026 Q1）

| 競品 | 定位 | 缺什麼 |
|------|------|--------|
| AgentNotch | Mac notch 即時監控 | 只有 token/成本，沒有意圖 |
| VibeBar | Menu bar 狀態燈 | running/idle 狀態，不知道「在做什麼」 |
| claude-view | Claude Code observability | 單一 Agent，dashboard 形式 |
| Conductor (YC) | 多 agent 編排 | 管「怎麼跑」不管「我在哪」 |
| Agentlytics | 跨 IDE 統一分析 | Dashboard 不是 widget，需要另開視窗 |

**WWI 的定位：不是監控工具，是「工作記憶外置裝置」。**

核心差異：所有競品回答「Agent 跑到哪了」，WWI 回答「**我**在做什麼」。

---

## 修正後的執行策略

### Phase 0 — 驗證 Intent（1 週）⚡ 最優先

> Devil's Advocate 最犀利的批判：先有雞還是先有蛋——MVP Intent 品質注定差，但品質差的 MVP 不會有人用。
> **所以先驗證 Intent，不寫 App。**

**交付物：** 一個 CLI 指令 `wwi status`

```
$ wwi status

  Claude Code  🟢 12m
  → 重構 Auth 模組的 JWT refresh token rotation 機制

  Gemini CLI   🟡 3m
  → 修復 Dashboard 頁面的 SSR hydration mismatch
```

**技術方案：**
- 直接基於 agent-tail 的 SessionFinder + LineParser
- Intent 引擎用 Haiku 4.5 API（input ~200 tokens, output ~30 tokens, 每次 ~$0.00005）
- 設 debounce 3s + dedup（相同 context hash 不重複呼叫）
- 每 agent 每分鐘最多 2 次 API call

**驗證方式：**
- 找 5-10 個多 Agent 重度用戶試用
- 觀察指標：Intent 品質評分（1-5）、「這句話有沒有幫你回想起在做什麼」
- 通過門檻：平均 ≥ 3.5 分才進 Phase 1

**不做：** GUI、通知、跳轉、多螢幕、subagent 樹

### Phase 1 — MVP App（2 週）

> 只在 Phase 0 驗證通過後才進入

**形態：** Menu Bar App（macOS 開發者最熟悉的常駐模式）

```
┌─────────────────────────────────────┐
│ Menu Bar                    [◆ 2]  │  ← 活躍 Agent 數量
└─────────────────────────────────────┘
                                 │
                                 ▼
                       ┌──────────────────┐
                       │ 🟢 Claude Code 12m│
                       │ → JWT rotation    │
                       ├──────────────────┤
                       │ 🟡 Gemini CLI  3m │
                       │ → SSR hydration   │
                       └──────────────────┘
```

**功能清單（嚴格砍到骨頭）：**
- ✅ Menu Bar 圖示 + 活躍數量
- ✅ Popover 列表：每個 Agent 一行（名稱 + 狀態 + 時間 + Intent）
- ✅ 點擊 Agent → 激活對應 Terminal app（僅 Terminal.app + iTerm2）
- ✅ 一個全域快捷鍵開關 popover
- ✅ Haiku API Intent Synthesis
- ✅ 深色/淺色模式

**不做：**
- ✗ Floating Panel（Popover 就夠了）
- ✗ Subagent 樹
- ✗ 通知系統
- ✗ 快捷鍵 ⌘+Shift+1~5 跳轉
- ✗ 瀏覽器/IDE Agent 追蹤
- ✗ Intent 歷史
- ✗ 設定畫面（先 hardcode）

### Phase 2 — 核心功能（+3 週）

- Floating Panel 模式（從 Popover 拖出）
- 多 CLI Agent 支援（Codex, Gemini CLI）
- Subagent 顯示
- macOS 通知（Agent 出錯時）
- Accessibility API 讀取 Cursor/Windsurf 視窗標題
- 最近檔案變動列表
- 設定畫面

### Phase 3 — 擴展（+4 週）

- Browser Extension（v0, bolt.new）
- Intent 歷史時間軸
- 「一鍵跳轉」支援更多 Terminal（Warp, Kitty via CLI）
- Raycast 整合
- 本地 LLM fallback（API 不可用時降級）

---

## 技術架構（修正版）

### 批判後的關鍵決策變更

| 原方案 | 問題 | 修正 |
|--------|------|------|
| SwiftUI + Bun 雙 runtime | 兩套依賴、打包、crash handling；RAM 45-70MB | **Tauri 2（單一 runtime）** |
| JSON-RPC over stdin/stdout | 子程序 crash 恢復、buffer 阻塞、App Sandbox 限制 | **同一程序內，Rust core + TS frontend** |
| Level 1 規則引擎 MVP | Intent 品質注定差，無法驗證核心價值 | **直接用 Haiku API（成本極低）** |
| RAM < 40MB 目標 | Bun idle 就 30-50MB，不現實 | **Tauri ~30MB 更可行** |
| App Store 分發 | Sandbox 限制子程序、Accessibility API | **Homebrew 分發** |

### 推薦架構：Tauri 2

```
┌──────────────────────────────────┐
│  WWI.app (Tauri 2)               │
│  ┌────────────┐ ┌─────────────┐  │
│  │ WebView UI │ │ System Tray │  │
│  │ (Solid/    │ │ (Tauri API) │  │
│  │  Svelte)   │ │             │  │
│  └─────┬──────┘ └──────┬──────┘  │
│        └───────┬───────┘         │
│          ┌─────▼──────┐          │
│          │ Rust Core   │          │
│          │ ┌─────────┐ │          │
│          │ │TS Engine│ │          │
│          │ │(agent-  │ │          │
│          │ │ tail)   │ │          │
│          │ └─────────┘ │          │
│          └─────────────┘          │
└──────────────────────────────────┘
```

**為什麼 Tauri 2：**
- 單一 runtime，Rust backend + WebView frontend
- Tauri 2 原生支援 system tray + 多視窗
- agent-tail 的 TS 邏輯可用 Rust 重寫核心部分（JSONL 解析很簡單），或透過 sidecar command 保留
- RAM ~30MB（比 Swift+Bun 的 45-70MB 好）
- 不走 App Store → 免 Sandbox 限制
- Homebrew tap 分發

**替代方案：純 Swift**
- 如果團隊 Swift 經驗強，純 SwiftUI 也行
- 但需要自己用 Swift 重寫 JSONL 解析（工作量 1-2 週）
- 好處：最低 RAM（15-25MB）、最原生的 macOS 體驗

### 資料流

```
Agent Session Files (.jsonl)
       │
       ▼  [FileWatcher: fs.watch + polling 2s]
  Raw Lines
       │
       ▼  [LineParser: per-agent plugin]
  ParsedLine[]
       │
       ▼  [Context Window: 最近 5 條 user+assistant]
  ConversationSlice
       │
       ▼  [Haiku API: debounce 3s, dedup, rate limit 2/min]
  Intent { summary: string, confidence: number }
       │
       ▼  [Tauri Event → WebView]
  UI Render
```

### Agent 資料擷取（分層策略）

| 層級 | Agent | 方式 | 可靠度 | Phase |
|------|-------|------|--------|-------|
| Layer 1 | Claude Code | `~/.claude/projects/**/*.jsonl` | 高（但格式可能變） | 0 |
| Layer 1 | Codex CLI | `~/.codex/sessions/**/*.jsonl` | 高 | 2 |
| Layer 1 | Gemini CLI | `~/.gemini/tmp/*/chats/*.json` | 高 | 2 |
| Layer 2 | Cursor / Windsurf | Accessibility API（視窗標題） | 中（只有標題，沒有對話） | 2 |
| Layer 3 | v0.dev / bolt.new | Chrome Extension + WebSocket | 低（DOM 選擇器會壞） | 3 |

### Log 格式防禦策略

> 這是在沙子上蓋房子。—— Devil's Advocate

緩解方案：
1. **Snapshot tests**：每個 Agent 版本對應 fixture 檔案，CI 自動驗證
2. **Graceful degradation**：解析失敗 → 顯示「無法讀取」而非 crash
3. **版本偵測**：檢查 Agent CLI 版本，已知 breaking change 時顯示警告
4. **社群回報**：開源解析器，讓社群幫忙修

---

## 風險矩陣（批判後修正版）

| 風險 | 嚴重度 | 可能性 | 緩解 |
|------|--------|--------|------|
| Intent 品質不及格 | 致命 | 中 | Phase 0 先驗證，不通過不做 App |
| Log 格式 breaking change | 高 | 高 | Snapshot tests + graceful degradation |
| IDE 內建類似功能 | 致命 | 中高 | 速度搶先 + 跨 Agent 統一是 IDE 做不到的 |
| 免費競品太多 | 高 | 已發生 | 開源核心 + Intent 品質做差異化 |
| 用戶不需要懸浮窗 | 高 | 中 | Phase 0 CLI 先驗證需求存在 |
| TAM 太小付費困難 | 中 | 高 | 先做 OSS，用口碑吸引用戶，延後商業化 |
| AppleScript 跳轉不可靠 | 中 | 高 | MVP 只支援 Terminal.app + iTerm2，明確標示限制 |

---

## 商業策略（修正版）

> 2,600-16,000 付費用戶 × $8-12/mo = 這不是 business，是 side project 零用錢。—— Devil's Advocate

**修正定位：先做開源工具，建立口碑，延後商業化。**

1. **Open-core model**：核心引擎 + CLI + 基本 GUI 全部開源
2. **Premium features**（未來）：Intent 歷史分析、團隊 context 共享、API access
3. **推廣路徑**：GitHub 開源 → Show HN → r/ClaudeAI → Product Hunt
4. **成功指標**：GitHub stars > 1K → 驗證需求 → 再考慮付費

---

## 專案結構（Phase 0 + 1）

```
wwi/
├── idea.md                          # 原始構想
├── brainstorm-wwi-macos-app.md      # 本文件
│
├── cli/                             # Phase 0: CLI 驗證
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── main.ts                  # `wwi status` 入口
│       ├── agents/                  # 從 agent-tail 移植/引用
│       │   ├── types.ts
│       │   └── claude-code/
│       │       ├── finder.ts
│       │       └── parser.ts
│       ├── watcher/
│       │   └── file-watcher.ts
│       └── intent/
│           └── haiku-engine.ts      # Haiku API intent synthesis
│
├── app/                             # Phase 1: Tauri App
│   ├── src-tauri/                   # Rust backend
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── main.rs
│   │       ├── tray.rs              # System tray
│   │       └── watcher.rs           # 呼叫 CLI engine
│   └── src/                         # WebView frontend
│       ├── App.svelte               # 或 SolidJS
│       ├── AgentCard.svelte
│       └── stores/
│           └── agents.ts
│
└── extension/                       # Phase 3: Chrome Extension
    ├── manifest.json
    └── content-scripts/
```

---

## 立即行動項目

```
Week 1 ─── Phase 0: Intent 驗證
  □ 從 agent-tail 移植 Claude Code 的 SessionFinder + LineParser
  □ 實作 Haiku API intent engine（prompt template + debounce + dedup）
  □ 打包成 `wwi status` CLI 指令
  □ 找 5-10 人試用，收集 Intent 品質評分

Week 2-3 ─── Phase 1: MVP App（僅在 Phase 0 通過後）
  □ Tauri 2 專案初始化
  □ System tray + popover 視窗
  □ Agent 列表 UI（名稱 + 狀態 + 時間 + Intent）
  □ 點擊跳轉 Terminal.app / iTerm2
  □ 全域快捷鍵
  □ Homebrew tap 分發
```

---

## 團隊觀點存檔

<details>
<summary>Product Designer — UX/UI 完整提案</summary>

核心設計決策：
- Menu Bar App + Detachable Panel
- 三層資訊架構：Icon → Popover 卡片 → 展開詳情
- 快捷鍵體系：⌘+Shift+W 開關, ⌘+Shift+1~5 跳轉
- 通知策略：出錯彈通知，其餘靜默
- 設計原則：一眼定心、零摩擦跳轉、不打擾
</details>

<details>
<summary>Tech Architect — 技術架構方案</summary>

核心決策：
- 原方案：SwiftUI + Bun Sidecar + JSON-RPC（被批判後修正為 Tauri 2）
- Intent 三級方案：規則引擎 → 本地 LLM → API
- 三層 Agent 擷取：File Watcher → Accessibility API → Browser Extension
- ParsedLine 資料結構定義
- Adaptive polling 策略
</details>

<details>
<summary>Market Researcher — 競品與市場分析</summary>

核心發現：
- 10+ 直接競品，大多免費開源
- Intent Synthesis 是唯一無人觸及的功能
- TAM 約 2,600-16,000 付費用戶
- Context switching 痛點有研究支撐但可能被高估
- 建議 open-core + 快速迭代搶佔定位
</details>

<details>
<summary>Devil's Advocate — 批判報告</summary>

致命問題排名：
1. Intent 品質不及格 → 整個產品無價值
2. Log 格式依賴不穩定 → 在沙子上蓋房子
3. IDE 內建功能取代 → 6 個月內可能發生

關鍵批判：
- 雙 runtime 過度設計 → 修正為單一 runtime
- RAM < 40MB 不現實 → 修正目標
- 開發者不一定需要懸浮窗 → 先用 CLI 驗證
- Intent Synthesis 護城河是紙做的 → 靠品質而非概念
- MVP 仍然太胖 → 砍到骨頭
</details>
