## 📄 專案說明書 (Project Overview)

**專案名稱提案：** `Where Was I?` (WWI) / `Intent-Lens`
**產品定位：** 一款 macOS 專屬的輕量化懸浮小工具，專門解決開發者在多個 AI Coding Agents (如 Cursor, Windsurf, v0, Bolt) 之間切換時產生的**語境斷層（Context Switching Gap）**。

**核心價值：**
* **視覺化工作記憶：** 隨時顯示「我現在在哪、在做什麼」。
* **意圖自動總結 (Intent Synthesis)：** 不只是顯示最後一句對話，而是結合 User Prompt 與 Agent Response，自動精煉成一句當下的「開發意圖」。
* **多代理追蹤：** 橫跨不同 IDE 與瀏覽器分頁，統一管理所有正在運行的 AI 任務。

---

## ⚡ 複製用提示詞 (Copy & Paste Prompts)

你可以將下面這段提示詞直接丟給 AI，啟動深度腦暴：

### 選項一：功能開發與技術實作腦暴 (Technical Brainstorm)
> 我正在構思一個 macOS 專屬的開發工具，名字叫 **"Where Was I?"**。
>
> **【核心功能】**
> 它是一個置頂的懸浮小窗口，能顯示目前多個 Coding Agent（例如 Cursor, Windsurf, v0 網頁版）的狀態。最核心的功能是顯示 **"Intent"**——這是一句結合了「Agent 最近的上下文」與「使用者最近幾個 Prompt」所自動總結出來的「我現在到底在幹嘛」的一句話。
>
> **【請針對以下幾點與我腦暴】**
> 1. **資料抓取 (Data Ingestion)：** 在 macOS 上，除了 Accessibility API 或 OCR，還有什麼優雅的方式能即時監控不同 App 內的 AI 對話內容？
> 2. **Intent 演算法：** 如何設計一個輕量級的 Prompt 模板，讓背景 LLM 能在不消耗太多 Token 的情況下，精準產出「正在重構 Auth 模組的登入邏輯」這種高品質意圖？
> 3. **UI/UX 交互：** 作為一個懸浮窗，如何設計才能既不遮擋代碼，又能讓開發者在切換 Agent 時「一眼定心」？
> 4. **擴展性：** 除了顯示文字，這個小工具還能提供什麼「一鍵回到現場」的功能？

---

### 選項二：產品命名與品牌調性 (Naming & Branding)
> 我正在開發一個協助開發者對抗 Context Switching 的 Mac App。它會總結你在各個 AI Agent 上的進度。
>
> 目前想到的名字方向是 **"What was I doing"** 或 **"Where was I"**。請幫我從以下三個維度發想更多名字：
> 1. **極簡極客風：** 像是 `Reflow`, `Thread` 之類的。
> 2. **口語對話風：** 像是 `WaitWhat`, `PickUp` 之類的。
> 3. **專業工具風：** 像是 `ContextLens`, `AgentFlow` 之類的。
> 並請針對每個名字給出一個簡單的 Slogan。

---

### 選項三：商業模式與 MVP 路徑 (Strategy)
> 我想針對「多 AI Agent 協作」的開發者族群推出一個小工具，解決切換視窗後的思緒混亂。
> 請幫我分析：
> 1. **痛點深度：** 這個工具對哪些類型的開發者（前端、全端、架構師）吸引力最大？
> 2. **MVP 功能：** 如果我要在兩週內做出一個最小可行性產品，我該捨棄哪些功能，保留哪些核心？
> 3. **未來想像：** 這個工具未來有沒有可能變成「跨 Agent 的剪貼簿」或「進度同步器」？

