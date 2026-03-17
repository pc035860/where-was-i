export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) return '<1m';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}
