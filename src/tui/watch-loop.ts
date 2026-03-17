import { scanAllSessions } from '../scanner/session-scanner.ts';
import { IntentEngine } from '../intent/intent-engine.ts';
import { renderStatus } from './renderer.ts';

export interface CommandOptions {
  showStale: boolean;
  intent: boolean;
  debug: boolean;
}

export async function statusCommand(options: CommandOptions): Promise<void> {
  const sessions = await scanAllSessions();

  if (options.intent) {
    const engine = new IntentEngine({ debug: options.debug });
    const visible = sessions.filter((s) => s.activityLevel !== 'stale');
    await Promise.allSettled(
      visible.map(async (session) => {
        const intent = await Promise.race([
          engine.requestIntentSync(session),
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 15000)),
        ]);
        if (intent) session.intent = intent;
      })
    );
    await engine.destroy();
  }

  const output = renderStatus(sessions, { showStale: options.showStale, showAll: true });
  console.log(output);
  process.exit(0);
}

export async function watchCommand(options: CommandOptions): Promise<void> {
  const POLL_INTERVAL_MS = 2000;

  const engine = options.intent ? new IntentEngine({ debug: options.debug }) : null;
  if (engine) await engine.init();
  let lastMtimes = new Map<string, number>();
  let showStale = options.showStale;
  let showAll = false;

  const cleanup = async () => {
    await engine?.destroy();
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdout.write('\x1b[?25h');
    process.exit(0);
  };

  process.on('SIGINT', () => void cleanup());
  process.on('SIGTERM', () => void cleanup());

  const KEY_Q = 0x71;
  const KEY_CTRL_C = 0x03;
  const KEY_S = 0x73;
  const KEY_A = 0x61;

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (key: Buffer) => {
      if (key[0] === KEY_Q || key[0] === KEY_CTRL_C) {
        void cleanup();
        return;
      }
      if (key[0] === KEY_S) {
        showStale = !showStale;
        void render();
      }
      if (key[0] === KEY_A) {
        showAll = !showAll;
        void render();
      }
    });
  }

  process.stdout.write('\x1b[?25l');

  let lastOutput = '';

  const render = async () => {
    try {
      const sessions = await scanAllSessions();
      const newMtimes = new Map<string, number>();
      const activePaths = new Set<string>();

      for (const session of sessions) {
        const key = session.sessionPath;
        newMtimes.set(key, session.mtime.getTime());
        activePaths.add(key);

        const cached = engine?.getIntent(key);
        if (cached) {
          session.intent = cached;
        }

        const oldMtime = lastMtimes.get(key);
        if (engine && session.activityLevel !== 'stale' && (!oldMtime || oldMtime !== session.mtime.getTime())) {
          engine.requestIntent(session, () => void render());
        }
      }

      lastMtimes = newMtimes;
      engine?.pruneStaleEntries(activePaths);

      const output = renderStatus(sessions, { showStale, showAll });

      if (output !== lastOutput) {
        process.stdout.write('\x1b[2J\x1b[H');
        process.stdout.write(output + '\n');
        lastOutput = output;
      }
    } catch {
      // scan error, skip this cycle
    }
  };

  await render();

  setInterval(render, POLL_INTERVAL_MS);
}
