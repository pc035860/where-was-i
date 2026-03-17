import { Command } from 'commander';
import type { CommandOptions } from './tui/watch-loop.ts';

const program = new Command();

program.name('wwi').description('Where Was I? — Track your AI coding agents').version('0.1.0');

program
  .command('status')
  .description('Show current agent session status')
  .option('--show-stale', 'Show stale sessions (>2h)', false)
  .option('--no-intent', 'Skip intent synthesis')
  .option('--debug', 'Show debug output', false)
  .option('-p, --provider <name>', 'LLM provider for intent synthesis (gemini or openai)', 'gemini')
  .option('-m, --model <name>', 'Model name to use for intent synthesis')
  .action(async (options: CommandOptions) => {
    const { statusCommand } = await import('./tui/watch-loop.ts');
    await statusCommand(options);
  });

program
  .command('watch')
  .description('Continuously watch agent sessions')
  .option('--show-stale', 'Show stale sessions (>2h)', false)
  .option('--no-intent', 'Skip intent synthesis')
  .option('--debug', 'Show debug output', false)
  .option('-p, --provider <name>', 'LLM provider for intent synthesis (gemini or openai)', 'gemini')
  .option('-m, --model <name>', 'Model name to use for intent synthesis')
  .action(async (options: CommandOptions) => {
    const { watchCommand } = await import('./tui/watch-loop.ts');
    await watchCommand(options);
  });

program.parse();
