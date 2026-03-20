import type { AgentSession } from '../src/scanner/types.ts';
import { renderStatus } from '../src/tui/renderer.ts';

const now = Date.now();

const sessions: AgentSession[] = [
  {
    agentType: 'claude',
    sessionPath: '/tmp/a',
    sessionId: 'a1b2c3d',
    fullSessionId: 'a1b2c3d0-0000-0000-0000-000000000000',
    projectName: 'wwi',
    projectPath: '/code/wwi',
    mtime: new Date(now - 30_000),
    activityLevel: 'active',
    intent: '修正 TUI 框線對齊問題。已完成 CJK 寬度計算，準備測試。',
  },
  {
    agentType: 'codex',
    sessionPath: '/tmp/b',
    sessionId: 'e4f5g6h',
    fullSessionId: 'e4f5g6h0-0000-0000-0000-000000000000',
    projectName: 'agent-tail',
    projectPath: '/code/agent-tail',
    mtime: new Date(now - 180_000),
    activityLevel: 'active',
    intent: '重構 JSONL 解析器。正在抽出共用的 parser interface。',
  },
  {
    agentType: 'gemini',
    sessionPath: '/tmp/c',
    sessionId: '7i8j9k0',
    fullSessionId: 'session-7i8j9k00-0000-0000-0000-000000000000',
    projectName: 'my-awesome-project',
    projectPath: '/code/my-awesome-project',
    mtime: new Date(now - 480_000),
    activityLevel: 'recent',
    intent: '建立 REST API 端點。目前完成 GET /users，下一步處理 POST。',
  },
  {
    agentType: 'claude',
    sessionPath: '/tmp/d',
    sessionId: 'x1y2z3a',
    fullSessionId: 'x1y2z3a0-0000-0000-0000-000000000000',
    projectName: 'crimson-island',
    projectPath: '/code/crimson-island',
    mtime: new Date(now - 1_500_000),
    activityLevel: 'recent',
    intent: '實作遊戲存檔系統。正在設計 save slot UI 元件。',
  },
  {
    agentType: 'codex',
    sessionPath: '/tmp/e',
    sessionId: 'b4c5d6e',
    fullSessionId: 'b4c5d6e0-0000-0000-0000-000000000000',
    projectName: 'dotfiles',
    projectPath: '/code/dotfiles',
    mtime: new Date(now - 2_700_000),
    activityLevel: 'recent',
    intent: '更新 zsh 設定檔。新增 alias 和 PATH 調整。',
  },
  {
    agentType: 'gemini',
    sessionPath: '/tmp/f',
    sessionId: 'f7g8h9i',
    fullSessionId: 'session-f7g8h9i0-0000-0000-0000-000000000000',
    projectName: 'blog',
    projectPath: '/code/blog',
    mtime: new Date(now - 5_400_000),
    activityLevel: 'recent',
    intent: '撰寫 Claude Code 使用心得文章。草稿已完成八成。',
  },
  {
    agentType: 'claude',
    sessionPath: '/tmp/g',
    sessionId: 'j0k1l2m',
    fullSessionId: 'j0k1l2m0-0000-0000-0000-000000000000',
    projectName: 'side-project-x',
    projectPath: '/code/side-project-x',
    mtime: new Date(now - 6_000_000),
    activityLevel: 'recent',
    intent: '嘗試新的 state management 方案。正在比較 Zustand 和 Jotai。',
  },
  {
    agentType: 'codex',
    sessionPath: '/tmp/h',
    sessionId: 'n3o4p5q',
    fullSessionId: 'n3o4p5q0-0000-0000-0000-000000000000',
    projectName: 'infra-tools',
    projectPath: '/code/infra-tools',
    mtime: new Date(now - 6_600_000),
    activityLevel: 'recent',
    intent: '設定 Terraform module。目前在處理 VPC networking。',
  },
  {
    agentType: 'claude',
    sessionPath: '/tmp/i',
    sessionId: 'r6s7t8u',
    fullSessionId: 'r6s7t8u0-0000-0000-0000-000000000000',
    projectName: 'old-experiment',
    projectPath: '/code/old-experiment',
    mtime: new Date(now - 18_000_000),
    activityLevel: 'stale',
    intent: '實驗性 WebSocket 伺服器。已擱置。',
  },
  {
    agentType: 'codex',
    sessionPath: '/tmp/j',
    sessionId: 'v9w0x1y',
    fullSessionId: 'v9w0x1y0-0000-0000-0000-000000000000',
    projectName: 'legacy-api',
    projectPath: '/code/legacy-api',
    mtime: new Date(now - 43_200_000),
    activityLevel: 'stale',
    intent: '修復 legacy API 的 auth 問題。等待 review。',
  },
];

const arg = process.argv[2];

if (arg === '--watch') {
  let showAll = false;
  let showStale = false;

  process.stdout.write('\x1b[?25l');
  const cleanup = () => {
    process.stdout.write('\x1b[?25h');
    process.exit(0);
  };
  process.on('SIGINT', cleanup);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (key: Buffer) => {
      if (key[0] === 0x71 || key[0] === 0x03) cleanup();
      if (key[0] === 0x61) {
        showAll = !showAll;
        draw();
      }
      if (key[0] === 0x73) {
        showStale = !showStale;
        draw();
      }
    });
  }

  const draw = () => {
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write(`${renderStatus(sessions, { showStale, showAll })}\n`);
    process.stdout.write(chalk.dim('\n  q: quit  a: toggle all  s: toggle stale\n'));
  };

  const { default: chalk } = await import('chalk');
  draw();
  setInterval(draw, 2000);
} else {
  console.log('=== showAll: false ===');
  console.log(renderStatus(sessions, { showStale: false, showAll: false }));
  console.log('\n=== showAll: true ===');
  console.log(renderStatus(sessions, { showStale: false, showAll: true }));
  console.log('\n=== showAll: true + showStale ===');
  console.log(renderStatus(sessions, { showStale: true, showAll: true }));
}
