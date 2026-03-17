import chalk from 'chalk';
import type { AgentSession, ActivityLevel } from '../scanner/types.ts';
import { AGENT_DISPLAY_NAMES } from '../scanner/types.ts';
import { formatRelativeTime } from '../utils/time.ts';
import { stringWidth, truncateToWidth } from '../utils/string-width.ts';

const STATUS_ICONS: Record<ActivityLevel, string> = {
  active: '🟢',
  recent: '🟡',
  stale: '⚪',
};

function padRight(str: string, len: number): string {
  const diff = len - stringWidth(str);
  return diff > 0 ? str + ' '.repeat(diff) : str;
}

function renderAgentCard(session: AgentSession, innerWidth: number): string[] {
  const icon = STATUS_ICONS[session.activityLevel];
  const agentName = AGENT_DISPLAY_NAMES[session.agentType];
  const time = formatRelativeTime(session.mtime);

  const timeStr = chalk.dim(time);
  const timeLen = stringWidth(timeStr);
  const maxLabelLen = innerWidth - timeLen - 1;

  let label = `${icon} ${agentName} × ${session.projectName}`;
  if (stringWidth(label) > maxLabelLen) {
    const prefixWidth = stringWidth(`${icon} ${agentName} × `);
    const maxProjectWidth = maxLabelLen - prefixWidth;
    const truncatedProject = maxProjectWidth > 2
      ? truncateToWidth(session.projectName, maxProjectWidth)
      : session.projectName.slice(0, 3);
    label = `${icon} ${agentName} × ${truncatedProject}`;
  }

  const gap = innerWidth - stringWidth(label) - timeLen;
  const line1 = gap > 0
    ? `${label}${' '.repeat(gap)}${timeStr}`
    : `${label} ${timeStr}`;

  const intentText = session.intent
    ? `→ ${session.intent}`
    : '→ …';
  const truncatedIntent = truncateToWidth(intentText, innerWidth);
  const line2 = padRight(
    session.intent ? chalk.cyan(truncatedIntent) : chalk.dim(truncatedIntent),
    innerWidth
  );

  return [line1, line2];
}

export function renderStatus(
  sessions: AgentSession[],
  options: { showStale: boolean }
): string {
  const termWidth = process.stdout.columns || 60;
  const boxWidth = Math.min(termWidth - 4, 56);
  const innerWidth = boxWidth - 6;

  const buckets: Record<ActivityLevel, AgentSession[]> = { active: [], recent: [], stale: [] };
  for (const s of sessions) buckets[s.activityLevel].push(s);

  const lines: string[] = [];

  const topBorder = `  ┌─ ${chalk.bold('WWI')} ${'─'.repeat(boxWidth - 8)}┐`;
  const bottomBorder = `  └${'─'.repeat(boxWidth - 2)}┘`;
  const emptyLine = `  │${' '.repeat(boxWidth - 2)}│`;

  const wrapLine = (content: string) => {
    return `  │  ${padRight(content, innerWidth)}  │`;
  };

  lines.push(topBorder);

  const visibleSessions = [...buckets.active, ...buckets.recent];

  if (visibleSessions.length === 0 && (!options.showStale || buckets.stale.length === 0)) {
    lines.push(emptyLine);
    lines.push(wrapLine(chalk.dim('No active agent sessions')));
    lines.push(emptyLine);
  } else {
    for (const session of visibleSessions) {
      lines.push(emptyLine);
      for (const cardLine of renderAgentCard(session, innerWidth)) {
        lines.push(wrapLine(cardLine));
      }
    }

    if (options.showStale && buckets.stale.length > 0) {
      lines.push(emptyLine);
      const dividerText = '── stale ';
      const divider = dividerText + '─'.repeat(innerWidth - dividerText.length);
      lines.push(wrapLine(chalk.dim(divider)));

      for (const session of buckets.stale) {
        lines.push(emptyLine);
        for (const cardLine of renderAgentCard(session, innerWidth)) {
          lines.push(wrapLine(cardLine));
        }
      }
    }

    lines.push(emptyLine);
  }

  lines.push(bottomBorder);

  return lines.join('\n');
}
