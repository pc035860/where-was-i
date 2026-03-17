import chalk from 'chalk';
import type { AgentSession, AgentType, ActivityLevel } from '../scanner/types.ts';
import { AGENT_DISPLAY_NAMES } from '../scanner/types.ts';
import { formatRelativeTime } from '../utils/time.ts';
import { stringWidth, truncateToWidth, wrapToLines } from '../utils/string-width.ts';

const STATUS_ICONS: Record<ActivityLevel, string> = {
  active: chalk.green('●'),
  recent: chalk.yellow('●'),
  stale: chalk.gray('●'),
};

const AGENT_COLORS: Record<AgentType, (s: string) => string> = {
  claude: chalk.redBright,
  codex: chalk.cyanBright,
  gemini: chalk.magentaBright,
};

const AGENT_NAME_WIDTH = Math.max(
  ...Object.values(AGENT_DISPLAY_NAMES).map((n) => n.length)
);

function padRight(str: string, len: number): string {
  const diff = len - stringWidth(str);
  return diff > 0 ? str + ' '.repeat(diff) : str;
}

function renderAgentCard(session: AgentSession, innerWidth: number): string[] {
  const icon = STATUS_ICONS[session.activityLevel];
  const agentName = AGENT_DISPLAY_NAMES[session.agentType];
  const colorFn = AGENT_COLORS[session.agentType];
  const time = formatRelativeTime(session.mtime);

  const timeStr = chalk.dim(time);
  const timeLen = stringWidth(timeStr);
  const paddedAgent = padRight(colorFn(agentName), AGENT_NAME_WIDTH);
  const prefixWidth = 2 + AGENT_NAME_WIDTH + 2;
  const maxProjectWidth = innerWidth - prefixWidth - timeLen - 1 - 2;

  let project = session.projectName;
  if (stringWidth(project) > maxProjectWidth) {
    project = maxProjectWidth > 2
      ? truncateToWidth(project, maxProjectWidth)
      : project.slice(0, 3);
  }

  const styledProject = chalk.white.bgHex('#2a2a2a')(` ${project} `);
  const label = `${icon} ${paddedAgent}  ${styledProject}`;
  const gap = innerWidth - stringWidth(label) - timeLen;
  const line1 = gap > 0
    ? `${label}${' '.repeat(gap)}${timeStr}`
    : `${label} ${timeStr}`;

  const intentText = session.intent
    ? `→ ${session.intent}`
    : '→ …';
  const colorFn2 = session.intent ? chalk.white : chalk.dim;
  const intentLines = wrapToLines(intentText, innerWidth, 2).map(
    (line) => padRight(colorFn2(line), innerWidth)
  );

  return [line1, ...intentLines];
}

export interface RenderOptions {
  showStale: boolean;
  showAll?: boolean;
}

export function renderStatus(
  sessions: AgentSession[],
  options: RenderOptions
): string {
  const termWidth = process.stdout.columns || 60;
  const termRows = process.stdout.rows || 24;
  const boxWidth = termWidth - 4;
  const innerWidth = boxWidth - 6;

  const buckets: Record<ActivityLevel, AgentSession[]> = { active: [], recent: [], stale: [] };
  for (const s of sessions) buckets[s.activityLevel].push(s);

  const b = chalk.hex('#888888');
  const topBorder = `  ${b('┌─')} ${chalk.bold('Where Was I')} ${b('─'.repeat(boxWidth - 16) + '┐')}`;
  const bottomBorder = `  ${b('└' + '─'.repeat(boxWidth - 2) + '┘')}`;
  const emptyLine = `  ${b('│')}${' '.repeat(boxWidth - 2)}${b('│')}`;

  const wrapLine = (content: string) => {
    return `  ${b('│')}  ${padRight(content, innerWidth)}  ${b('│')}`;
  };

  const visibleSessions = [...buckets.active, ...buckets.recent];

  if (visibleSessions.length === 0 && (!options.showStale || buckets.stale.length === 0)) {
    return [topBorder, emptyLine, wrapLine(chalk.dim('No active agent sessions')), emptyLine, bottomBorder].join('\n');
  }

  const cards = visibleSessions.map((session) => ({
    session,
    lines: renderAgentCard(session, innerWidth),
  }));

  const staleCards = options.showStale
    ? buckets.stale.map((session) => ({ session, lines: renderAgentCard(session, innerWidth) }))
    : [];

  const overhead = 3;
  const overflowLineHeight = 2;
  const staleDividerHeight = options.showStale && staleCards.length > 0 ? 2 : 0;
  const availableRows = termRows - overhead - staleDividerHeight;

  let mainCards = cards;
  let overflowCount = 0;

  if (!options.showAll) {
    let usedRows = 0;
    let fitCount = 0;

    for (const card of cards) {
      const cardHeight = 1 + card.lines.length;
      if (usedRows + cardHeight + overflowLineHeight > availableRows && fitCount < cards.length) {
        break;
      }
      usedRows += cardHeight;
      fitCount++;
    }

    if (fitCount < cards.length) {
      mainCards = cards.slice(0, fitCount);
      overflowCount = cards.length - fitCount;
    }
  }

  const lines: string[] = [];
  lines.push(topBorder);

  for (const card of mainCards) {
    lines.push(emptyLine);
    for (const cardLine of card.lines) {
      lines.push(wrapLine(cardLine));
    }
  }

  if (overflowCount > 0) {
    lines.push(emptyLine);
    lines.push(wrapLine(chalk.dim(`+${overflowCount} more sessions (a to expand)`)));
  }

  if (options.showStale && staleCards.length > 0) {
    lines.push(emptyLine);
    const dividerText = '── stale ';
    const divider = dividerText + '─'.repeat(innerWidth - dividerText.length);
    lines.push(wrapLine(chalk.dim(divider)));

    for (const card of staleCards) {
      lines.push(emptyLine);
      for (const cardLine of card.lines) {
        lines.push(wrapLine(cardLine));
      }
    }
  }

  lines.push(emptyLine);
  lines.push(bottomBorder);

  return lines.join('\n');
}
